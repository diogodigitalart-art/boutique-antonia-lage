import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ADMIN_EMAIL = "diogodigitalart@gmail.com";
const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FROM_ADDRESS = "Boutique Antónia Lage <onboarding@resend.dev>";
export const SITE_URL = "https://boutique-antonia-lage.lovable.app";

export function isStr(v: unknown, max = 4096): v is string {
  return typeof v === "string" && v.length > 0 && v.length < max;
}

export function esc(s: string) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function assertAdmin(token: string) {
  if (!token) throw new Error("Unauthorized");
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user) throw new Error("Unauthorized");
  if ((data.user.email || "").toLowerCase() !== ADMIN_EMAIL) throw new Error("Forbidden");
  return data.user.id;
}

export async function sendEmail(to: string, subject: string, html: string, text: string) {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
    console.warn("Email skipped — keys missing");
    return false;
  }
  const res = await fetch(`${GATEWAY_URL}/emails`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": RESEND_API_KEY,
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to: [to], subject, html, text }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    console.error("Email send failed", res.status, body);
    return false;
  }
  return true;
}

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

export async function scheduleReviewRequest(opts: {
  type: "order" | "reservation";
  orderId?: string | null;
  reservationId?: string | null;
  userId: string | null;
  customerEmail: string;
  customerName?: string | null;
}) {
  if (!opts.customerEmail) return;
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