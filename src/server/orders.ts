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
    };
  })
  .handler(async ({ data }) => {
    const { data: u, error: ue } = await supabaseAdmin.auth.getUser(data.token);
    if (ue || !u?.user) throw new Error("Unauthorized");
    const userId = u.user.id;

    // 0) Pre-validate stock for every line and decrement (atomic per-line via FOR UPDATE in RPC)
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

    // 1) Insert order
    const { data: order, error } = await supabaseAdmin
      .from("orders")
      .insert({
        user_id: userId,
        customer_name: data.address.full_name,
        customer_email: data.address.email,
        customer_phone: data.address.phone,
        items: data.items,
        shipping_address: data.address,
        subtotal: data.subtotal,
        shipping_cost: data.shipping_cost,
        total: data.total,
        status: "Pendente",
      })
      .select("id")
      .single();
    if (error || !order) {
      throw new Error(error?.message || "Failed to create order");
    }
    const orderId = order.id as string;

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
        const itemsHtml = data.items
          .map(
            (it) => `<li style="margin:6px 0">
              <strong>${escapeHtml(it.brand ?? "")}</strong> — ${escapeHtml(it.name ?? "")}
              <br/><span style="color:#666;font-size:12px">Tamanho ${escapeHtml(it.size)} · Qtd ${it.quantity} · €${it.line_total.toFixed(2)}</span>
            </li>`,
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
            <ul style="padding-left:18px;margin:0 0 24px">${itemsHtml}</ul>

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