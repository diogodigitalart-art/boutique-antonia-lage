import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ADMIN_EMAIL = "diogodigitalart@gmail.com";

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

export type AdminProductSize = { size: string; stock: number; reserved: number };

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
  images: string[];
  sizes: AdminProductSize[];
  is_active: boolean;
};

function parsePayload(input: unknown): AdminProductPayload {
  if (!input || typeof input !== "object") throw new Error("Invalid payload");
  const i = input as Record<string, unknown>;
  const sizes = Array.isArray(i.sizes)
    ? (i.sizes as unknown[]).map((x) => {
        const o = x as Record<string, unknown>;
        return {
          size: String(o.size || ""),
          stock: Math.max(0, Number(o.stock) || 0),
          reserved: Math.max(0, Number(o.reserved) || 0),
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
    images,
    sizes,
    is_active: Boolean(i.is_active),
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
    return { rows: rows ?? [] };
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
    const row = {
      name: p.name,
      brand: p.brand,
      description: p.description,
      price: p.price,
      original_price: p.original_price,
      category: p.category,
      reference: p.reference,
      season: p.season,
      images: p.images,
      sizes: p.sizes,
      is_active: p.is_active,
    };
    if (p.id) {
      const { error } = await supabaseAdmin.from("products").update(row).eq("id", p.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: p.id };
    }
    const { data: inserted, error } = await supabaseAdmin
      .from("products")
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
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