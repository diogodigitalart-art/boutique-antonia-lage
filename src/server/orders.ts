import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const NOTIFY_TO = "diogodigitalart@gmail.com";
const FROM_ADDRESS = "Antónia Lage <onboarding@resend.dev>";

function escapeHtml(input: string) {
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

type OrderItem = {
  product_id: string;
  product_uuid: string | null;
  brand: string | null;
  name: string | null;
  reference?: string | null;
  image?: string | null;
  size: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

type Address = {
  full_name: string;
  email: string;
  phone: string;
  address1: string;
  address2?: string;
  city: string;
  postal_code: string;
  country: string;
};

export const createOrder = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Invalid payload");
    const i = input as Record<string, unknown>;
    if (typeof i.token !== "string") throw new Error("Unauthorized");
    return i as {
      token: string;
      items: OrderItem[];
      address: Address;
      subtotal: number;
      shipping_cost: number;
      total: number;
      discount_code?: string | null;
      discount_amount?: number;
    };
  })
  .handler(async ({ data }) => {
    const { data: u, error: ue } = await supabaseAdmin.auth.getUser(data.token);
    if (ue || !u?.user) throw new Error("Unauthorized");
    const userId = u.user.id;

    // 0a) Recompute prices server-side from DB to prevent client tampering
    type Zone = "PT_CONT" | "PT_ILHAS" | "EU" | "WORLD";
    const ZONE_COST: Record<Zone, number> = { PT_CONT: 5, PT_ILHAS: 12, EU: 15, WORLD: 25 };
    const COUNTRY_TO_ZONE: Record<string, Zone> = {
      PT: "PT_CONT", "PT-AC": "PT_ILHAS", "PT-MA": "PT_ILHAS",
      ES: "EU", FR: "EU", IT: "EU", DE: "EU", NL: "EU", BE: "EU", LU: "EU",
      IE: "EU", AT: "EU", DK: "EU", SE: "EU", FI: "EU", PL: "EU", GB: "EU",
      US: "WORLD", BR: "WORLD", CA: "WORLD", OTHER: "WORLD",
    };
    const FREE_SHIPPING_THRESHOLD = 150;

    const productUuids = Array.from(
      new Set(data.items.map((it) => it.product_uuid).filter((x): x is string => !!x)),
    );
    const { data: dbProducts, error: prodErr } = await supabaseAdmin
      .from("products")
      .select("id, price, discount_percent")
      .in("id", productUuids);
    if (prodErr) throw new Error("Failed to validate product prices");
    const priceById = new Map<string, number>();
    for (const p of dbProducts ?? []) {
      const base = Number(p.price) || 0;
      const pct = p.discount_percent != null ? Number(p.discount_percent) : 0;
      const final = pct > 0 ? Math.round(base * (1 - pct / 100) * 100) / 100 : base;
      priceById.set(p.id as string, final);
    }

    const verifiedItems: OrderItem[] = data.items.map((it) => {
      const unit = it.product_uuid ? priceById.get(it.product_uuid) : undefined;
      if (unit == null) throw new Error("Produto inválido na encomenda");
      const qty = Math.max(1, Math.floor(Number(it.quantity) || 1));
      const line = Math.round(unit * qty * 100) / 100;
      return { ...it, quantity: qty, unit_price: unit, line_total: line };
    });
    const subtotal = Math.round(verifiedItems.reduce((s, it) => s + it.line_total, 0) * 100) / 100;
    const zone: Zone = COUNTRY_TO_ZONE[data.address.country] ?? "PT_CONT";
    let shippingCost = ZONE_COST[zone];
    if (subtotal === 0) shippingCost = 0;
    if (zone === "PT_CONT" && subtotal >= FREE_SHIPPING_THRESHOLD) shippingCost = 0;

    // 0b) Pre-validate stock for every line and decrement (atomic per-line via FOR UPDATE in RPC)
    for (const it of data.items) {
      if (!it.product_uuid || !it.size) continue;
      const { error: stockErr } = await supabaseAdmin.rpc("decrement_product_stock", {
        _product_id: it.product_uuid,
        _size: it.size,
        _qty: Math.max(1, it.quantity || 1),
        _from_reserved: false,
      });
      if (stockErr) {
        throw new Error(
          `Stock insuficiente para ${it.brand ?? ""} ${it.name ?? ""} (tamanho ${it.size})`,
        );
      }
    }

    // Validate discount code (if provided) — compute discount server-side
    let discountCode: string | null = null;
    let discountAmount = 0;
    let usedDiscountRowId: string | null = null;
    let usedDiscountUseCount = 0;
    let usedDiscountUseLimit: number | null = null;
    if (data.discount_code && typeof data.discount_code === "string") {
      const code = data.discount_code.trim().toUpperCase();
      const { data: dc } = await supabaseAdmin
        .from("discount_codes")
        .select("id, code, discount_percent, status, expires_at, use_limit, use_count")
        .eq("code", code)
        .maybeSingle();
      if (
        dc &&
        dc.status === "activo" &&
        (!dc.expires_at || new Date(dc.expires_at).getTime() > Date.now()) &&
        (dc.use_limit == null || (dc.use_count ?? 0) < dc.use_limit)
      ) {
        discountCode = dc.code;
        discountAmount = Math.round(((subtotal * Number(dc.discount_percent || 0)) / 100) * 100) / 100;
        usedDiscountRowId = dc.id as string;
        usedDiscountUseCount = Number(dc.use_count ?? 0);
        usedDiscountUseLimit = dc.use_limit ?? null;
      } else {
        // Fall back to newsletter welcome code (10%)
        const { data: sub } = await supabaseAdmin
          .from("newsletter_subscribers")
          .select("discount_code")
          .eq("discount_code", code)
          .maybeSingle();
        if (sub) {
          discountCode = sub.discount_code;
          discountAmount = Math.round(subtotal * 0.1 * 100) / 100;
        }
      }
    }

    const total = Math.max(0, Math.round((subtotal - discountAmount + shippingCost) * 100) / 100);

    // 1) Insert order
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: userId,
        customer_name: data.address.full_name,
        customer_email: data.address.email,
        customer_phone: data.address.phone,
        items: verifiedItems,
        shipping_address: data.address,
        subtotal,
        shipping_cost: shippingCost,
        total,
        discount_code: discountCode,
        discount_amount: discountAmount,
        status: "Pendente",
      })
      .select("id")
      .single();
    if (error || !order) {
      throw new Error(error?.message || "Failed to create order");
    }
    const orderId = order.id as string;

    // Increment usage on the discount code row; mark utilizado if limit reached
    if (usedDiscountRowId) {
      const newCount = usedDiscountUseCount + 1;
      const reachedLimit = usedDiscountUseLimit != null && newCount >= usedDiscountUseLimit;
      await supabaseAdmin
        .from("discount_codes")
        .update({
          use_count: newCount,
          status: reachedLimit ? "utilizado" : "activo",
        })
        .eq("id", usedDiscountRowId);
    }

    // 2) Remove purchased items from wishlist (silent failure)
    const productIds = Array.from(
      new Set(data.items.map((it) => it.product_id).filter(Boolean)),
    );
    if (productIds.length > 0) {
      try {
        await supabaseAdmin
          .from("wishlists")
          .delete()
          .eq("user_id", userId)
          .in("product_id", productIds);
        await supabaseAdmin
          .from("wishlist_items")
          .delete()
          .eq("user_id", userId)
          .in("product_id", productIds);
      } catch (err) {
        console.error("wishlist cleanup failed", err);
      }
    }

    // 3) Send admin email (silent failure)
    try {
      const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
      const RESEND_API_KEY = process.env.RESEND_API_KEY;
      if (LOVABLE_API_KEY && RESEND_API_KEY) {
        const orderShort = orderId.slice(0, 8).toUpperCase();
        const addr = data.address;
        const itemsRows = data.items
          .map(
            (it) => `<tr>
              <td style="width:72px;padding:8px 12px 8px 0;vertical-align:top">
                ${
                  it.image
                    ? `<img src="${escapeHtml(it.image)}" alt="" width="60" height="80" style="width:60px;height:80px;object-fit:cover;border-radius:4px;border:1px solid #eee;display:block"/>`
                    : `<div style="width:60px;height:80px;background:#f5f5f5;border-radius:4px"></div>`
                }
              </td>
              <td style="padding:8px 0;vertical-align:top;font-size:13px;line-height:1.5">
                <div><strong>${escapeHtml(it.brand ?? "")}</strong> — ${escapeHtml(it.name ?? "")}</div>
                ${it.reference ? `<div style="color:#999;font-family:monospace;font-size:11px;margin-top:2px">Ref: ${escapeHtml(it.reference)}</div>` : ""}
                <div style="color:#666;font-size:12px;margin-top:4px">Tamanho ${escapeHtml(it.size)} · Qtd ${it.quantity} · €${it.line_total.toFixed(2)}</div>
              </td>
            </tr>`,
          )
          .join("");
        const html = `
          <div style="font-family:-apple-system,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
            <h2 style="font-style:italic;font-weight:400;margin:0 0 4px">Nova encomenda #${orderShort}</h2>
            <p style="color:#666;margin:0 0 24px">Boutique Antónia Lage</p>

            <h3 style="margin:0 0 8px;font-size:14px;text-transform:uppercase;letter-spacing:0.1em">Cliente</h3>
            <p style="margin:0 0 4px"><strong>${escapeHtml(addr.full_name)}</strong></p>
            <p style="margin:0 0 4px">${escapeHtml(addr.email)}</p>
            <p style="margin:0 0 24px">${escapeHtml(addr.phone)}</p>

            <h3 style="margin:0 0 8px;font-size:14px;text-transform:uppercase;letter-spacing:0.1em">Peças</h3>
            <table style="width:100%;border-collapse:collapse;margin:0 0 24px">${itemsRows}</table>

            <h3 style="margin:0 0 8px;font-size:14px;text-transform:uppercase;letter-spacing:0.1em">Morada de envio</h3>
            <p style="margin:0 0 4px">${escapeHtml(addr.address1)}${addr.address2 ? `, ${escapeHtml(addr.address2)}` : ""}</p>
            <p style="margin:0 0 4px">${escapeHtml(addr.postal_code)} ${escapeHtml(addr.city)}</p>
            <p style="margin:0 0 24px">${escapeHtml(addr.country)}</p>

            <table style="width:100%;border-top:1px solid #e5e5e5;padding-top:16px;font-size:14px">
              <tr><td style="color:#666">Subtotal</td><td style="text-align:right">€${data.subtotal.toFixed(2)}</td></tr>
              <tr><td style="color:#666">Envio</td><td style="text-align:right">€${data.shipping_cost.toFixed(2)}</td></tr>
              <tr><td style="font-weight:600;padding-top:8px">Total</td><td style="text-align:right;font-weight:600;padding-top:8px">€${data.total.toFixed(2)}</td></tr>
            </table>
          </div>`;
        const res = await fetch(`${GATEWAY_URL}/emails`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "X-Connection-Api-Key": RESEND_API_KEY,
          },
          body: JSON.stringify({
            from: FROM_ADDRESS,
            to: [NOTIFY_TO],
            subject: `Nova encomenda #${orderShort} — €${data.total.toFixed(2)}`,
            html,
          }),
        });
        if (!res.ok) {
          const body = await res.text();
          console.error("admin order email failed", res.status, body);
        }
      }
    } catch (err) {
      console.error("admin email error", err);
    }

    return { orderId };
  });