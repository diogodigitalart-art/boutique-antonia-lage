import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

function generateToken(len = 12) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let out = "";
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  for (let i = 0; i < len; i++) out += chars[buf[i] % chars.length];
  return out;
}

async function requireUser(token: string) {
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data.user) throw new Error("Unauthorized");
  return data.user;
}

export const getMyWishlistShare = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().min(10) }).parse(d))
  .handler(async ({ data }) => {
    const user = await requireUser(data.token);
    const { data: row } = await supabaseAdmin
      .from("wishlist_shares")
      .select("token, is_active")
      .eq("user_id", user.id)
      .maybeSingle();
    if (!row) return { token: null as string | null, is_active: false };
    return { token: row.token as string, is_active: row.is_active as boolean };
  });

export const ensureMyWishlistShare = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ token: z.string().min(10) }).parse(d))
  .handler(async ({ data }) => {
    const user = await requireUser(data.token);
    const { data: existing } = await supabaseAdmin
      .from("wishlist_shares")
      .select("token, is_active")
      .eq("user_id", user.id)
      .maybeSingle();
    if (existing) {
      if (!existing.is_active) {
        await supabaseAdmin
          .from("wishlist_shares")
          .update({ is_active: true })
          .eq("user_id", user.id);
      }
      return { token: existing.token as string, is_active: true };
    }
    // generate unique token with retries
    for (let i = 0; i < 5; i++) {
      const newToken = generateToken(12);
      const { error } = await supabaseAdmin
        .from("wishlist_shares")
        .insert({ user_id: user.id, token: newToken, is_active: true });
      if (!error) return { token: newToken, is_active: true };
      if (error.code !== "23505") throw new Error(error.message);
    }
    throw new Error("Could not generate share token");
  });

export const setMyWishlistShareActive = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ token: z.string().min(10), active: z.boolean() }).parse(d),
  )
  .handler(async ({ data }) => {
    const user = await requireUser(data.token);
    const { error } = await supabaseAdmin
      .from("wishlist_shares")
      .update({ is_active: data.active })
      .eq("user_id", user.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getSharedWishlist = createServerFn({ method: "POST" })
  .inputValidator((d) =>
    z.object({ shareToken: z.string().min(8).max(64) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { data: share } = await supabaseAdmin
      .from("wishlist_shares")
      .select("user_id, is_active")
      .eq("token", data.shareToken)
      .maybeSingle();
    if (!share || !share.is_active) {
      return { ok: false as const };
    }
    const userId = share.user_id as string;
    const [{ data: profile }, { data: wishRows }] = await Promise.all([
      supabaseAdmin.from("profiles").select("full_name").eq("id", userId).maybeSingle(),
      supabaseAdmin.from("wishlists").select("product_id").eq("user_id", userId),
    ]);
    const productIds = (wishRows ?? []).map((r) => r.product_id as string);
    const firstName = (profile?.full_name || "").trim().split(/\s+/)[0] || "alguém";
    return { ok: true as const, firstName, productIds };
  });