import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { normalizeSize } from "@/lib/utils";

const ADMIN_EMAIL = "diogodigitalart@gmail.com";
const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FROM_ADDRESS = "Antónia Lage <onboarding@resend.dev>";
const SITE_URL = "https://boutique-antonia-lage.lovable.app";

function escapeHtml(input: string) {
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function notifyWishlistDiscount(productUuid: string) {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!LOVABLE_API_KEY || !RESEND_API_KEY) return;

  const { data: prod } = await supabaseAdmin
    .from("products")
    .select("id, legacy_id, name, brand, price, original_price, discount_percent, images")
    .eq("id", productUuid)
    .maybeSingle();
  if (!prod) return;

  const candidateIds = [prod.id, prod.legacy_id].filter(
    (v): v is string => typeof v === "string" && v.length > 0,
  );
  if (candidateIds.length === 0) return;

  const { data: rows } = await supabaseAdmin
    .from("wishlists")
    .select("user_id")
    .in("product_id", candidateIds);
  const userIds = Array.from(new Set((rows ?? []).map((r) => r.user_id as string)));
  if (userIds.length === 0) return;

  const { data: profiles } = await supabaseAdmin
    .from("profiles")
    .select("id, email, full_name")
    .in("id", userIds);
  const recipients = (profiles ?? []).filter(
    (p) => typeof p.email === "string" && p.email.includes("@"),
  );
  if (recipients.length === 0) return;

  const image = Array.isArray(prod.images) && prod.images.length > 0
    ? String(prod.images[0])
    : "";
  const productLink = `${SITE_URL}/produto/${prod.legacy_id || prod.id}`;
  const original = prod.original_price ?? prod.price;
  const subject = "Uma peça que guardaste está em promoção 🎉";

  for (const r of recipients) {
    const html = `
      <div style="font-family:-apple-system,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
        <h2 style="font-style:italic;font-weight:400;margin:0 0 8px">Boas notícias${r.full_name ? `, ${escapeHtml(String(r.full_name).split(" ")[0])}` : ""}!</h2>
        <p style="color:#666;margin:0 0 20px">Uma peça da tua wishlist acabou de descer de preço.</p>
        ${image ? `<a href="${productLink}" style="display:block;margin:0 0 16px"><img src="${escapeHtml(image)}" alt="" style="width:100%;max-width:520px;border-radius:8px;display:block"/></a>` : ""}
        <p style="margin:0;font-size:12px;text-transform:uppercase;letter-spacing:0.15em;color:#999">${escapeHtml(String(prod.brand ?? ""))}</p>
        <h3 style="margin:4px 0 12px;font-style:italic;font-weight:400;font-size:22px">${escapeHtml(String(prod.name ?? ""))}</h3>
        <p style="margin:0 0 20px;font-size:18px">
          <span style="color:#999;text-decoration:line-through;margin-right:8px">€${Number(original).toFixed(0)}</span>
          <span style="color:#b91c1c;font-weight:500">€${Number(prod.price).toFixed(0)}</span>
          ${prod.discount_percent ? `<span style="margin-left:8px;background:#dc2626;color:#fff;font-size:11px;padding:3px 8px;border-radius:999px;letter-spacing:0.05em">−${prod.discount_percent}%</span>` : ""}
        </p>
        <p style="margin:0 0 28px">
          <a href="${productLink}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:14px 28px;border-radius:999px;text-decoration:none;font-size:13px;letter-spacing:0.1em;text-transform:uppercase">Ver peça</a>
        </p>
        <p style="color:#999;font-size:12px;margin:24px 0 0">Boutique Antónia Lage · Stock limitado, não esperes muito.</p>
      </div>`;

    try {
      await fetch(`${GATEWAY_URL}/emails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": RESEND_API_KEY,
        },
        body: JSON.stringify({
          from: FROM_ADDRESS,
          to: [r.email],
          subject,
          html,
        }),
      });
    } catch (err) {
      console.error("wishlist discount email failed", err);
    }
  }
}

async function assertAdmin(token: string): Promise<string> {
  if (!token) throw new Error("Unauthorized");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) throw new Error("Unauthorized");
  if ((data.user.email || "").toLowerCase() !== ADMIN_EMAIL) throw new Error("Forbidden");
  return data.user.id;
}

function s(v: unknown): v is string {
  return typeof v === "string";
}

function normalizeBarcodeServer(raw: unknown): string | null {
  if (raw == null) return null;
  const v = String(raw).trim();
  if (!v) return null;
  if (/e[+-]?\d+/i.test(v)) {
    const n = Number(v.replace(",", "."));
    if (Number.isFinite(n)) return Math.round(n).toLocaleString("fullwide", { useGrouping: false });
  }
  return v;
}

export type AdminProductSize = { size: string; stock: number; reserved: number; barcode?: string | null };

export type AdminProductPayload = {
  id?: string;
  name: string;
  brand: string;
  description: string;
  price: number;
  original_price: number | null;
  category: string;
  reference: string;
  season: string | null;
  discount_percent: number | null;
  images: string[];
  sizes: AdminProductSize[];
  is_active: boolean;
  is_manually_reserved?: boolean;
  barcode?: string | null;
  cost_price?: number | null;
  color?: string | null;
  composition?: string | null;
  care_instructions?: string | null;
  external_id?: string | null;
  subcategory?: string | null;
};

function parsePayload(input: unknown): AdminProductPayload {
  if (!input || typeof input !== "object") throw new Error("Invalid payload");
  const i = input as Record<string, unknown>;
  const sizes = Array.isArray(i.sizes)
    ? (i.sizes as unknown[]).map((x) => {
        const o = x as Record<string, unknown>;
        return {
          size: normalizeSize(String(o.size || "")) || String(o.size || ""),
          stock: Math.max(0, Number(o.stock) || 0),
          reserved: Math.max(0, Number(o.reserved) || 0),
          barcode: normalizeBarcodeServer(o.barcode),
        };
      })
    : [];
  const images = Array.isArray(i.images) ? (i.images as unknown[]).map(String).slice(0, 10) : [];
  return {
    id: s(i.id) ? (i.id as string) : undefined,
    name: String(i.name || "").trim(),
    brand: String(i.brand || "").trim(),
    description: String(i.description || ""),
    price: Number(i.price) || 0,
    original_price: i.original_price == null || i.original_price === "" ? null : Number(i.original_price),
    category: String(i.category || "colecção"),
    reference: String(i.reference || "").trim(),
    season: s(i.season) && (i.season as string).trim() ? (i.season as string).trim() : null,
    discount_percent:
      i.discount_percent == null || i.discount_percent === ""
        ? null
        : Math.max(0, Math.min(100, Math.round(Number(i.discount_percent)))),
    images,
    sizes,
    is_active: Boolean(i.is_active),
    is_manually_reserved: Boolean(i.is_manually_reserved),
    barcode: normalizeBarcodeServer(i.barcode),
    cost_price:
      i.cost_price == null || i.cost_price === "" ? null : Number(i.cost_price),
    color: s(i.color) && (i.color as string).trim() ? (i.color as string).trim() : null,
    composition:
      s(i.composition) && (i.composition as string).trim() ? (i.composition as string).trim() : null,
    care_instructions:
      s(i.care_instructions) && (i.care_instructions as string).trim()
        ? (i.care_instructions as string).trim()
        : null,
    external_id:
      s(i.external_id) && (i.external_id as string).trim()
        ? (i.external_id as string).trim()
        : null,
    subcategory:
      s(i.subcategory) && (i.subcategory as string).trim()
        ? (i.subcategory as string).trim()
        : null,
  };
}

export const adminListProducts = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const i = (input || {}) as Record<string, unknown>;
    if (!s(i.token)) throw new Error("Missing token");
    return { token: i.token as string };
  })
  .handler(async ({ data }) => {
    await assertAdmin(data.token);
    const { data: rows, error } = await supabaseAdmin
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const normalized = (rows ?? []).map((r) => {
      const raw = r as Record<string, unknown>;
      const rawSizes = Array.isArray(raw.sizes) ? raw.sizes : [];
      return {
        ...raw,
        sizes: rawSizes.map((s: unknown) => {
          const o = s as Record<string, unknown>;
          return {
            size: normalizeSize(String(o.size || "")) || String(o.size || ""),
            stock: Math.max(0, Number(o.stock) || 0),
            reserved: Math.max(0, Number(o.reserved) || 0),
            barcode: normalizeBarcodeServer(o.barcode),
          };
        }),
      };
    });
    return { rows: normalized };
  });

export const adminUpsertProduct = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const i = (input || {}) as Record<string, unknown>;
    if (!s(i.token)) throw new Error("Missing token");
    return { token: i.token as string, product: parsePayload(i.product) };
  })
  .handler(async ({ data }) => {
    await assertAdmin(data.token);
    const p = data.product;
    if (!p.name) throw new Error("Nome em falta");
    if (!p.brand) throw new Error("Marca em falta");
    if (!p.reference) throw new Error("Referência em falta");
    if (p.is_active && (!Array.isArray(p.images) || p.images.length === 0)) {
      throw new Error("Este produto não tem fotos e não pode ser activado.");
    }
    const row = {
      name: p.name,
      brand: p.brand,
      description: p.description,
      price: p.price,
      original_price: p.original_price,
      category: p.category,
      subcategory: p.subcategory ?? null,
      reference: p.reference,
      season: p.season,
      discount_percent: p.discount_percent,
      images: p.images,
      sizes: p.sizes,
      is_active: p.is_active,
      is_manually_reserved: !!p.is_manually_reserved,
      barcode: p.barcode ?? null,
      cost_price: p.cost_price ?? null,
      color: p.color ?? null,
      composition: p.composition ?? null,
      care_instructions: p.care_instructions ?? null,
      external_id: p.external_id ?? null,
    };
    if (p.id) {
      // Read previous discount to detect increase
      const { data: prev } = await supabaseAdmin
        .from("products")
        .select("discount_percent, sizes")
        .eq("id", p.id)
        .maybeSingle();
      const prevDiscount = Number(prev?.discount_percent ?? 0) || 0;
      const prevSizes = Array.isArray(prev?.sizes)
        ? (prev!.sizes as Array<{ size: string; stock: number; reserved: number }>)
        : [];
      const { error } = await supabaseAdmin.from("products").update(row).eq("id", p.id);
      if (error) throw new Error(error.message);
      const newDiscount = Number(p.discount_percent ?? 0) || 0;
      if (newDiscount > 0 && newDiscount > prevDiscount) {
        try {
          await notifyWishlistDiscount(p.id);
        } catch (err) {
          console.error("notifyWishlistDiscount failed", err);
        }
      }
      try {
        const { notifyWaitlistRestock } = await import("./features-internals.server");
        await notifyWaitlistRestock(p.id, prevSizes, p.sizes);
      } catch (err) {
        console.error("notifyWaitlistRestock failed", err);
      }
      return { ok: true, id: p.id };
    }
    const { data: inserted, error } = await supabaseAdmin
      .from("products")
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    const newDiscount = Number(p.discount_percent ?? 0) || 0;
    if (newDiscount > 0) {
      try {
        await notifyWishlistDiscount(inserted.id);
      } catch (err) {
        console.error("notifyWishlistDiscount failed", err);
      }
    }
    return { ok: true, id: inserted.id };
  });

export const adminDeleteProduct = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const i = (input || {}) as Record<string, unknown>;
    if (!s(i.token)) throw new Error("Missing token");
    if (!s(i.id)) throw new Error("Missing id");
    return { token: i.token as string, id: i.id as string };
  })
  .handler(async ({ data }) => {
    await assertAdmin(data.token);
    const { error } = await supabaseAdmin.from("products").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminToggleProductActive = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const i = (input || {}) as Record<string, unknown>;
    if (!s(i.token)) throw new Error("Missing token");
    if (!s(i.id)) throw new Error("Missing id");
    return { token: i.token as string, id: i.id as string, is_active: Boolean(i.is_active) };
  })
  .handler(async ({ data }) => {
    await assertAdmin(data.token);
    const { error } = await supabaseAdmin
      .from("products")
      .update({ is_active: data.is_active })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Bulk deactivation for full inventory sync: deactivates all products whose
// reference is non-empty and NOT included in `keepRefs`. Products without a
// reference are never touched. Returns ids that were deactivated.
export const adminBulkDeactivateByRefs = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const i = (input || {}) as Record<string, unknown>;
    if (!s(i.token)) throw new Error("Missing token");
    if (!Array.isArray(i.keepRefs)) throw new Error("keepRefs must be an array");
    const keepRefs = (i.keepRefs as unknown[])
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .map((x) => x.trim());
    return { token: i.token as string, keepRefs };
  })
  .handler(async ({ data }) => {
    await assertAdmin(data.token);
    // Fetch all active products with a non-empty reference
    const { data: rows, error } = await supabaseAdmin
      .from("products")
      .select("id, reference, is_active")
      .not("reference", "is", null)
      .neq("reference", "")
      .eq("is_active", true);
    if (error) throw new Error(error.message);
    const keep = new Set(data.keepRefs);
    const toDeactivate = (rows ?? [])
      .filter((r) => r.reference && !keep.has(r.reference as string))
      .map((r) => r.id as string);
    if (toDeactivate.length === 0) return { deactivated: 0, ids: [] as string[] };
    const { error: upErr } = await supabaseAdmin
      .from("products")
      .update({ is_active: false })
      .in("id", toDeactivate);
    if (upErr) throw new Error(upErr.message);
    return { deactivated: toDeactivate.length, ids: toDeactivate };
  });

export const adminUploadProductImage = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const i = (input || {}) as Record<string, unknown>;
    if (!s(i.token)) throw new Error("Missing token");
    if (!s(i.filename)) throw new Error("Missing filename");
    if (!s(i.contentType)) throw new Error("Missing contentType");
    if (!s(i.dataBase64)) throw new Error("Missing data");
    if ((i.dataBase64 as string).length > 15_000_000) throw new Error("Imagem demasiado grande");
    return {
      token: i.token as string,
      filename: i.filename as string,
      contentType: i.contentType as string,
      dataBase64: i.dataBase64 as string,
    };
  })
  .handler(async ({ data }) => {
    await assertAdmin(data.token);
    const ext = (data.filename.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${crypto.randomUUID()}.${ext || "jpg"}`;
    const buf = Buffer.from(data.dataBase64, "base64");
    const { error } = await supabaseAdmin.storage
      .from("product-images")
      .upload(path, buf, { contentType: data.contentType, upsert: false });
    if (error) throw new Error(error.message);
    const { data: pub } = supabaseAdmin.storage.from("product-images").getPublicUrl(path);
    return { url: pub.publicUrl };
  });

export const adminListBrands = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const i = (input || {}) as Record<string, unknown>;
    if (!s(i.token)) throw new Error("Missing token");
    return { token: i.token as string };
  })
  .handler(async ({ data }) => {
    await assertAdmin(data.token);
    const { data: rows, error } = await supabaseAdmin
      .from("brands")
      .select("id, name")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

export const adminAddBrand = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const i = (input || {}) as Record<string, unknown>;
    if (!s(i.token)) throw new Error("Missing token");
    if (!s(i.name) || !(i.name as string).trim()) throw new Error("Missing name");
    const name = (i.name as string).trim().slice(0, 80);
    return { token: i.token as string, name };
  })
  .handler(async ({ data }) => {
    await assertAdmin(data.token);
    const { error } = await supabaseAdmin.from("brands").insert({ name: data.name });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteBrand = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const i = (input || {}) as Record<string, unknown>;
    if (!s(i.token)) throw new Error("Missing token");
    if (!s(i.id)) throw new Error("Missing id");
    return { token: i.token as string, id: i.id as string };
  })
  .handler(async ({ data }) => {
    await assertAdmin(data.token);
    const { error } = await supabaseAdmin.from("brands").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListSeasons = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const i = (input || {}) as Record<string, unknown>;
    if (!s(i.token)) throw new Error("Missing token");
    return { token: i.token as string };
  })
  .handler(async ({ data }) => {
    await assertAdmin(data.token);
    const { data: rows, error } = await supabaseAdmin
      .from("seasons")
      .select("id, name")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    return { rows: rows ?? [] };
  });

export const adminAddSeason = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const i = (input || {}) as Record<string, unknown>;
    if (!s(i.token)) throw new Error("Missing token");
    if (!s(i.name) || !(i.name as string).trim()) throw new Error("Missing name");
    const name = (i.name as string).trim().slice(0, 40);
    return { token: i.token as string, name };
  })
  .handler(async ({ data }) => {
    await assertAdmin(data.token);
    const { error } = await supabaseAdmin.from("seasons").insert({ name: data.name });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteSeason = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const i = (input || {}) as Record<string, unknown>;
    if (!s(i.token)) throw new Error("Missing token");
    if (!s(i.id)) throw new Error("Missing id");
    return { token: i.token as string, id: i.id as string };
  })
  .handler(async ({ data }) => {
    await assertAdmin(data.token);
    const { error } = await supabaseAdmin.from("seasons").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminAdjustReservation = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const i = (input || {}) as Record<string, unknown>;
    if (!s(i.token)) throw new Error("Missing token");
    if (!s(i.productId)) throw new Error("Missing productId");
    if (!s(i.size)) throw new Error("Missing size");
    const delta = Number(i.delta);
    if (delta !== 1 && delta !== -1) throw new Error("Invalid delta");
    return { token: i.token as string, productId: i.productId as string, size: i.size as string, delta };
  })
  .handler(async ({ data }) => {
    await assertAdmin(data.token);
    const { error } = await supabaseAdmin.rpc("adjust_product_reservation", {
      _product_id: data.productId,
      _size: data.size,
      _delta: data.delta,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminFindProductByBarcode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const i = (input || {}) as Record<string, unknown>;
    if (!s(i.token)) throw new Error("Missing token");
    if (!s(i.barcode) || !(i.barcode as string).trim()) throw new Error("Missing barcode");
    return { token: i.token as string, barcode: (i.barcode as string).trim() };
  })
  .handler(async ({ data }) => {
    await assertAdmin(data.token);
    // 1) Try product-level barcode
    const { data: byProd, error: e1 } = await supabaseAdmin
      .from("products")
      .select("*")
      .eq("barcode", data.barcode)
      .limit(1);
    if (e1) throw new Error(e1.message);
    if (byProd && byProd.length > 0) return { product: byProd[0] };
    // 2) Try size-level barcode using jsonb containment
    const { data: bySize, error: e2 } = await supabaseAdmin
      .from("products")
      .select("*")
      .contains("sizes", [{ barcode: data.barcode }])
      .limit(1);
    if (e2) throw new Error(e2.message);
    return { product: bySize && bySize.length > 0 ? bySize[0] : null };
  });

export const adminAdjustStockByBarcode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const i = (input || {}) as Record<string, unknown>;
    if (!s(i.token)) throw new Error("Missing token");
    if (!s(i.barcode) || !(i.barcode as string).trim()) throw new Error("Missing barcode");
    const delta = Number(i.delta);
    if (delta !== 1 && delta !== -1) throw new Error("Invalid delta");
    return { token: i.token as string, barcode: (i.barcode as string).trim(), delta };
  })
  .handler(async ({ data }) => {
    await assertAdmin(data.token);
    // Look up by product-level barcode first, then size-level barcode.
    const { data: byProd, error: e1 } = await supabaseAdmin
      .from("products")
      .select("id, name, brand, sizes")
      .eq("barcode", data.barcode)
      .limit(1);
    if (e1) throw new Error(e1.message);
    let product = byProd && byProd.length > 0 ? byProd[0] : null;
    let targetSize: string | null = null;
    if (!product) {
      const { data: bySize, error: e1b } = await supabaseAdmin
        .from("products")
        .select("id, name, brand, sizes")
        .contains("sizes", [{ barcode: data.barcode }])
        .limit(1);
      if (e1b) throw new Error(e1b.message);
      product = bySize && bySize.length > 0 ? bySize[0] : null;
      if (product) {
        const arr = Array.isArray(product.sizes) ? (product.sizes as AdminProductSize[]) : [];
        const m = arr.find((s) => (s.barcode ?? "") === data.barcode);
        targetSize = m ? m.size : null;
      }
    }
    if (!product) throw new Error("Produto não encontrado");
    const sizes = Array.isArray(product.sizes) ? (product.sizes as AdminProductSize[]) : [];
    if (sizes.length === 0) throw new Error("Produto sem tamanhos");
    // Pick the size to adjust: size-level barcode wins; otherwise IN→first, OUT→first with stock.
    let idx = 0;
    if (targetSize) {
      idx = sizes.findIndex((s) => s.size === targetSize);
      if (idx < 0) idx = 0;
      if (data.delta < 0) {
        const s = sizes[idx];
        if (Math.max(0, Number(s.stock) - Number(s.reserved)) <= 0) {
          throw new Error("Sem stock disponível");
        }
      }
    } else if (data.delta < 0) {
      const found = sizes.findIndex(
        (s) => Math.max(0, Number(s.stock) - Number(s.reserved)) > 0,
      );
      if (found < 0) throw new Error("Sem stock disponível");
      idx = found;
    }
    const newSizes = sizes.map((s, i) => {
      if (i !== idx) return s;
      const newStock = Math.max(0, Number(s.stock) + data.delta);
      const newReserved = Math.min(Number(s.reserved), newStock);
      return { size: s.size, stock: newStock, reserved: newReserved, barcode: s.barcode ?? null };
    });
    const totalAvailable = newSizes.reduce(
      (a, s) => a + Math.max(0, Number(s.stock) - Number(s.reserved)),
      0,
    );
    const { error: e2 } = await supabaseAdmin
      .from("products")
      .update({ sizes: newSizes })
      .eq("id", product.id);
    if (e2) throw new Error(e2.message);
    return {
      ok: true,
      productId: product.id,
      productName: product.name,
      brand: product.brand,
      size: sizes[idx].size,
      totalAvailable,
    };
  });