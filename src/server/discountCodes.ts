import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ADMIN_EMAIL = "diogodigitalart@gmail.com";

function isStr(v: unknown, max = 1024): v is string {
  return typeof v === "string" && v.length > 0 && v.length < max;
}

export type DiscountCodeRow = {
  id: string;
  code: string;
  discount_percent: number;
  email: string | null;
  status: string;
  expires_at: string | null;
  created_at: string;
  source: "manual" | "newsletter";
};

async function requireAdmin(token: string) {
  const { data: u, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !u?.user || (u.user.email || "").toLowerCase() !== ADMIN_EMAIL) {
    throw new Error("Forbidden");
  }
}

export const adminListDiscountCodes = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Invalid payload");
    const i = input as Record<string, unknown>;
    if (!isStr(i.token)) throw new Error("Missing token");
    return { token: i.token as string };
  })
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { data: rows, error } = await supabaseAdmin
      .from("discount_codes")
      .select("id, code, discount_percent, email, status, expires_at, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const { data: subscribers, error: subscribersError } = await supabaseAdmin
      .from("newsletter_subscribers")
      .select("id, email, discount_code, created_at")
      .order("created_at", { ascending: false });
    if (subscribersError) throw new Error(subscribersError.message);

    // Compute usage stats from orders.discount_code
    const { data: usedRows } = await supabaseAdmin
      .from("orders")
      .select("discount_code")
      .not("discount_code", "is", null);
    const usedSet = new Set((usedRows ?? []).map((r) => (r.discount_code as string) || "").filter(Boolean));
    const manualRows = ((rows ?? []) as Omit<DiscountCodeRow, "source">[]).map((row) => ({
      ...row,
      source: "manual" as const,
    }));
    const newsletterRows = (subscribers ?? []).map((subscriber) => ({
      id: `newsletter-${subscriber.id}`,
      code: subscriber.discount_code,
      discount_percent: 10,
      email: subscriber.email,
      status: usedSet.has(subscriber.discount_code) ? "utilizado" : "activo",
      expires_at: null,
      created_at: subscriber.created_at,
      source: "newsletter" as const,
    }));
    const mergedRows = [...manualRows, ...newsletterRows].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    return {
      rows: mergedRows,
      usedCodes: Array.from(usedSet),
    };
  });

export const adminCreateDiscountCode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Invalid payload");
    const i = input as Record<string, unknown>;
    if (!isStr(i.token)) throw new Error("Missing token");
    if (!isStr(i.code, 64)) throw new Error("Código inválido");
    const code = (i.code as string).trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,32}$/.test(code)) throw new Error("Código deve ter 3-32 caracteres alfanuméricos");
    const dp = Number(i.discount_percent);
    if (!Number.isFinite(dp) || dp < 1 || dp > 100) throw new Error("Percentagem inválida");
    const expires_at = isStr(i.expires_at, 64) ? (i.expires_at as string) : null;
    return { token: i.token as string, code, discount_percent: Math.floor(dp), expires_at };
  })
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { error } = await supabaseAdmin.from("discount_codes").insert({
      code: data.code,
      discount_percent: data.discount_percent,
      expires_at: data.expires_at,
      status: "activo",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpdateDiscountCodeStatus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Invalid payload");
    const i = input as Record<string, unknown>;
    if (!isStr(i.token)) throw new Error("Missing token");
    if (!isStr(i.id, 64)) throw new Error("Missing id");
    if (!isStr(i.status, 16) || !["activo", "utilizado", "expirado"].includes(i.status as string))
      throw new Error("Estado inválido");
    return { token: i.token as string, id: i.id as string, status: i.status as string };
  })
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { error } = await supabaseAdmin
      .from("discount_codes")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const validateDiscountCode = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Invalid payload");
    const i = input as Record<string, unknown>;
    if (!isStr(i.code, 64)) throw new Error("Código inválido");
    return { code: (i.code as string).trim().toUpperCase() };
  })
  .handler(async ({ data }) => {
    // 1) Check discount_codes table first
    const { data: row, error } = await supabaseAdmin
      .from("discount_codes")
      .select("id, code, discount_percent, status, expires_at")
      .eq("code", data.code)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (row) {
      if (row.status !== "activo") throw new Error("Código já utilizado ou expirado");
      if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
        throw new Error("Código expirado");
      }
      const { data: used } = await supabaseAdmin
        .from("orders")
        .select("id")
        .eq("discount_code", row.code)
        .limit(1);
      if (used && used.length > 0) throw new Error("Código já foi utilizado");
      return { code: row.code, discount_percent: row.discount_percent };
    }
    // 2) Fall back to newsletter_subscribers welcome codes (10%)
    const { data: sub } = await supabaseAdmin
      .from("newsletter_subscribers")
      .select("id, discount_code")
      .eq("discount_code", data.code)
      .maybeSingle();
    if (!sub) throw new Error("Código não encontrado");
    const { data: usedInOrder } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("discount_code", sub.discount_code)
      .limit(1);
    if (usedInOrder && usedInOrder.length > 0) throw new Error("Código já foi utilizado");
    return { code: sub.discount_code, discount_percent: 10 };
  });