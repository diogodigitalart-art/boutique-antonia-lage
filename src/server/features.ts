import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  assertAdmin,
  esc,
  isStr,
  notifyWaitlistRestock,
  scheduleReviewRequest,
  sendEmail,
  SITE_URL,
} from "./features-internals.server";

// Re-export server-only helpers so existing server-side imports keep working.
export { notifyWaitlistRestock, scheduleReviewRequest };

// ============================================================
// WAITLIST
// ============================================================

export const joinWaitlist = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const i = (input || {}) as Record<string, unknown>;
    if (!isStr(i.productId, 64)) throw new Error("Missing productId");
    if (!isStr(i.size, 50)) throw new Error("Missing size");
    if (!isStr(i.email, 320)) throw new Error("Missing email");
    const email = (i.email as string).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Email inválido");
    return {
      productId: i.productId as string,
      size: i.size as string,
      email,
      token: typeof i.token === "string" && i.token.length > 0 ? (i.token as string) : null,
    };
  })
  .handler(async ({ data }) => {
    let userId: string | null = null;
    if (data.token) {
      const { data: u } = await supabaseAdmin.auth.getUser(data.token);
      userId = u?.user?.id ?? null;
    }
    // Avoid duplicate active entries
    const { data: existing } = await supabaseAdmin
      .from("waitlist")
      .select("id")
      .eq("product_id", data.productId)
      .eq("size", data.size)
      .eq("email", data.email)
      .is("notified_at", null)
      .maybeSingle();
    if (existing) return { ok: true, alreadyOn: true };
    const { error } = await supabaseAdmin.from("waitlist").insert({
      product_id: data.productId,
      size: data.size,
      email: data.email,
      user_id: userId,
    });
    if (error) throw new Error(error.message);
    return { ok: true, alreadyOn: false };
  });

export const adminGetWaitlistCounts = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const i = (input || {}) as Record<string, unknown>;
    if (!isStr(i.token)) throw new Error("Missing token");
    return { token: i.token as string };
  })
  .handler(async ({ data }) => {
    await assertAdmin(data.token);
    const { data: rows } = await supabaseAdmin
      .from("waitlist")
      .select("product_id")
      .is("notified_at", null);
    const counts: Record<string, number> = {};
    for (const r of (rows ?? []) as Array<{ product_id: string }>) {
      counts[r.product_id] = (counts[r.product_id] ?? 0) + 1;
    }
    return { counts };
  });

/**
 * Called from product upsert flow. For each size that went from 0 available
 * to >0, notify all pending waitlist entries.
 */
export async function notifyWaitlistRestock(
  productUuid: string,
  prevSizes: Array<{ size: string; stock: number; reserved: number }>,
  newSizes: Array<{ size: string; stock: number; reserved: number }>,
) {
  const restockedSizes: string[] = [];
  for (const ns of newSizes) {
    const newAvail = Math.max(0, Number(ns.stock) - Number(ns.reserved));
    if (newAvail <= 0) continue;
    const prev = prevSizes.find((p) => p.size === ns.size);
    const prevAvail = prev ? Math.max(0, Number(prev.stock) - Number(prev.reserved)) : 0;
    if (prevAvail === 0 && newAvail > 0) restockedSizes.push(ns.size);
  }
  if (restockedSizes.length === 0) return;

  const { data: prod } = await supabaseAdmin
    .from("products")
    .select("id, legacy_id, name, brand, images")
    .eq("id", productUuid)
    .maybeSingle();
  if (!prod) return;

  for (const size of restockedSizes) {
    const { data: entries } = await supabaseAdmin
      .from("waitlist")
      .select("id, email")
      .eq("product_id", productUuid)
      .eq("size", size)
      .is("notified_at", null);
    if (!entries || entries.length === 0) continue;
    const link = `${SITE_URL}/produto/${prod.legacy_id || prod.id}`;
    const html = `
      <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:32px;color:#1a1a1a;background:#fdfbf7;">
        <h1 style="font-style:italic;font-size:26px;color:#1d3557;margin:0 0 16px;">Boa notícia!</h1>
        <p style="font-size:15px;line-height:1.6;">O tamanho <strong>${esc(size)}</strong> de <strong>${esc(prod.name)}</strong> (${esc(prod.brand)}) voltou a estar disponível.</p>
        <p style="margin:24px 0;text-align:center;">
          <a href="${link}" style="display:inline-block;background:#1d3557;color:#fff;text-decoration:none;padding:14px 28px;border-radius:9999px;font-size:14px;letter-spacing:1px;text-transform:uppercase;">Ver peça</a>
        </p>
        <p style="font-size:12px;color:#888;margin-top:24px;">— Boutique Antónia Lage</p>
      </div>`;
    const text = `Boa notícia! O tamanho ${size} de ${prod.name} (${prod.brand}) voltou a estar disponível.\n${link}`;
    for (const e of entries as Array<{ id: string; email: string }>) {
      const ok = await sendEmail(e.email, `O tamanho ${size} está de volta`, html, text);
      if (ok) {
        await supabaseAdmin
          .from("waitlist")
          .update({ notified_at: new Date().toISOString() })
          .eq("id", e.id);
      }
    }
  }
}

// ============================================================
// EDITORIAL POSTS
// ============================================================

export type EditorialPost = {
  id: string;
  title: string;
  quote: string;
  video_url: string;
  featured_product_ids: string[];
  teaser_text: string;
  publish_date: string;
  is_published: boolean;
  created_at: string;
  updated_at: string;
};

export const listPublishedEditorials = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await supabaseAdmin
    .from("editorial_posts")
    .select("*")
    .eq("is_published", true)
    .order("publish_date", { ascending: false });
  return { posts: (data ?? []) as unknown as EditorialPost[] };
});

export const getLatestEditorial = createServerFn({ method: "GET" }).handler(async () => {
  const { data } = await supabaseAdmin
    .from("editorial_posts")
    .select("*")
    .eq("is_published", true)
    .order("publish_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  return { post: (data ?? null) as EditorialPost | null };
});

export const getEditorialById = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const i = (input || {}) as Record<string, unknown>;
    if (!isStr(i.id, 64)) throw new Error("Missing id");
    return { id: i.id as string };
  })
  .handler(async ({ data }) => {
    const { data: post } = await supabaseAdmin
      .from("editorial_posts")
      .select("*")
      .eq("id", data.id)
      .eq("is_published", true)
      .maybeSingle();
    if (!post) return { post: null, products: [] };
    const ids = ((post as { featured_product_ids: string[] }).featured_product_ids || []).filter(Boolean);
    let products: Array<{ id: string; name: string; brand: string; price: number; images: string[] }> = [];
    if (ids.length) {
      const { data: rows } = await supabaseAdmin
        .from("products")
        .select("id,name,brand,price,images,is_active")
        .in("id", ids);
      products = ((rows ?? []) as Array<{ id: string; name: string; brand: string; price: number; images: string[]; is_active: boolean }>)
        .filter((p) => p.is_active)
        .map((p) => ({ id: p.id, name: p.name, brand: p.brand, price: Number(p.price) || 0, images: p.images || [] }));
    }
    return { post: post as unknown as EditorialPost, products };
  });

export const adminListEditorials = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const i = (input || {}) as Record<string, unknown>;
    if (!isStr(i.token)) throw new Error("Missing token");
    return { token: i.token as string };
  })
  .handler(async ({ data }) => {
    await assertAdmin(data.token);
    const { data: rows } = await supabaseAdmin
      .from("editorial_posts")
      .select("*")
      .order("publish_date", { ascending: false });
    return { posts: (rows ?? []) as unknown as EditorialPost[] };
  });

export const adminUpsertEditorial = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const i = (input || {}) as Record<string, unknown>;
    if (!isStr(i.token)) throw new Error("Missing token");
    const p = (i.post || {}) as Record<string, unknown>;
    return {
      token: i.token as string,
      post: {
        id: typeof p.id === "string" ? p.id : null,
        title: typeof p.title === "string" ? p.title.slice(0, 300) : "",
        quote: typeof p.quote === "string" ? p.quote.slice(0, 2000) : "",
        video_url: typeof p.video_url === "string" ? p.video_url.slice(0, 1000) : "",
        featured_product_ids: Array.isArray(p.featured_product_ids)
          ? (p.featured_product_ids as unknown[])
              .filter((x): x is string => typeof x === "string")
              .slice(0, 8)
          : [],
        teaser_text: typeof p.teaser_text === "string" ? p.teaser_text.slice(0, 1000) : "",
        publish_date:
          typeof p.publish_date === "string" && p.publish_date.length > 0
            ? p.publish_date
            : new Date().toISOString().split("T")[0],
        is_published: Boolean(p.is_published),
      },
    };
  })
  .handler(async ({ data }) => {
    await assertAdmin(data.token);
    if (!data.post.title) throw new Error("Título em falta");
    const row = {
      title: data.post.title,
      quote: data.post.quote,
      video_url: data.post.video_url,
      featured_product_ids: data.post.featured_product_ids,
      teaser_text: data.post.teaser_text,
      publish_date: data.post.publish_date,
      is_published: data.post.is_published,
    };
    if (data.post.id) {
      const { error } = await supabaseAdmin
        .from("editorial_posts")
        .update(row)
        .eq("id", data.post.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.post.id };
    }
    const { data: inserted, error } = await supabaseAdmin
      .from("editorial_posts")
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: inserted.id };
  });

export const adminDeleteEditorial = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const i = (input || {}) as Record<string, unknown>;
    if (!isStr(i.token)) throw new Error("Missing token");
    if (!isStr(i.id)) throw new Error("Missing id");
    return { token: i.token as string, id: i.id as string };
  })
  .handler(async ({ data }) => {
    await assertAdmin(data.token);
    const { error } = await supabaseAdmin.from("editorial_posts").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// ============================================================
// REVIEW REQUEST QUEUE (24h delay → Google review email)
// ============================================================

export async function scheduleReviewRequest(opts: {
  type: "order" | "reservation";
  orderId?: string | null;
  reservationId?: string | null;
  userId: string | null;
  customerEmail: string;
  customerName?: string | null;
}) {
  if (!opts.customerEmail) return;
  // Avoid duplicates
  const fkCol = opts.type === "order" ? "order_id" : "reservation_id";
  const fkVal = opts.type === "order" ? opts.orderId : opts.reservationId;
  if (!fkVal) return;
  const { data: existing } = await supabaseAdmin
    .from("review_requests")
    .select("id")
    .eq("type", opts.type)
    .eq(fkCol, fkVal)
    .maybeSingle();
  if (existing) return;
  const scheduled = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await supabaseAdmin.from("review_requests").insert({
    type: opts.type,
    order_id: opts.orderId ?? null,
    reservation_id: opts.reservationId ?? null,
    user_id: opts.userId,
    customer_email: opts.customerEmail,
    customer_name: opts.customerName ?? null,
    scheduled_for: scheduled,
  });
}

export const processReviewRequestQueue = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const i = (input || {}) as Record<string, unknown>;
    if (!isStr(i.token)) throw new Error("Missing token");
    return { token: i.token as string };
  })
  .handler(async ({ data }) => {
    await assertAdmin(data.token);
    const { data: setting } = await supabaseAdmin
      .from("settings")
      .select("value")
      .eq("key", "google_review_url")
      .maybeSingle();
    const reviewUrl = (setting?.value ?? "").trim();

    const { data: pending } = await supabaseAdmin
      .from("review_requests")
      .select("*")
      .is("sent_at", null)
      .lte("scheduled_for", new Date().toISOString())
      .limit(50);
    if (!pending || pending.length === 0) return { sent: 0 };

    let sent = 0;
    for (const r of pending as Array<{
      id: string;
      customer_email: string;
      customer_name: string | null;
    }>) {
      const firstName = (r.customer_name || "").split(" ")[0] || "olá";
      const cta = reviewUrl
        ? `<p style="margin:32px 0;text-align:center;">
             <a href="${reviewUrl}" style="display:inline-block;background:#1d3557;color:#fff;text-decoration:none;padding:16px 32px;border-radius:9999px;font-size:14px;letter-spacing:1px;text-transform:uppercase;">Deixar uma review no Google</a>
           </p>`
        : "";
      const html = `
        <div style="font-family:Georgia,serif;max-width:560px;margin:0 auto;padding:32px;color:#1a1a1a;background:#fdfbf7;line-height:1.6;">
          <p style="font-size:16px;margin:0 0 16px;">Olá ${esc(firstName)},</p>
          <p style="font-size:15px;">Foi um prazer recebê-la / entregar-lhe a sua encomenda. Esperamos que a experiência tenha sido especial.</p>
          <p style="font-size:15px;">Se a sua experiência foi positiva, ficávamos muito gratos se pudesse partilhá-la com outras pessoas — uma simples palavra significa muito para um negócio independente como o nosso.</p>
          ${cta}
          <p style="font-size:13px;color:#666;font-style:italic;">Apenas se a sua experiência o merecer — a sua opinião honesta é o que mais valorizamos.</p>
          <p style="margin-top:32px;font-size:13px;color:#888;">Com carinho,<br/>Equipa Boutique Antónia Lage</p>
        </div>`;
      const text = `Olá ${firstName},\n\nFoi um prazer recebê-la / entregar-lhe a sua encomenda. Se a sua experiência foi positiva, ficávamos gratos se pudesse partilhá-la no Google.\n\n${reviewUrl}\n\nApenas se a sua experiência o merecer — a sua opinião honesta é o que mais valorizamos.\n\n— Boutique Antónia Lage`;
      const ok = await sendEmail(
        r.customer_email,
        "Como foi a tua experiência na Boutique Antónia Lage?",
        html,
        text,
      );
      if (ok) {
        await supabaseAdmin
          .from("review_requests")
          .update({ sent_at: new Date().toISOString() })
          .eq("id", r.id);
        sent++;
      }
    }
    return { sent };
  });

/** Public helper called from order status hook (admin) — schedules a review request for an order. */
export const adminScheduleOrderReview = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    const i = (input || {}) as Record<string, unknown>;
    if (!isStr(i.token)) throw new Error("Missing token");
    if (!isStr(i.orderId)) throw new Error("Missing orderId");
    return { token: i.token as string, orderId: i.orderId as string };
  })
  .handler(async ({ data }) => {
    await assertAdmin(data.token);
    const { data: o } = await supabaseAdmin
      .from("orders")
      .select("id, user_id, customer_email, customer_name")
      .eq("id", data.orderId)
      .maybeSingle();
    if (!o) return { ok: false };
    await scheduleReviewRequest({
      type: "order",
      orderId: o.id,
      userId: o.user_id ?? null,
      customerEmail: o.customer_email,
      customerName: o.customer_name,
    });
    return { ok: true };
  });