import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FROM_ADDRESS = "Antónia Lage <onboarding@resend.dev>";
const ADMIN_EMAIL = "diogodigitalart@gmail.com";

function escapeHtml(input: string) {
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export const notifyReturnStatus = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Invalid payload");
    const i = input as Record<string, unknown>;
    if (typeof i.token !== "string") throw new Error("Unauthorized");
    if (typeof i.returnId !== "string") throw new Error("Missing returnId");
    if (i.status !== "Aprovada" && i.status !== "Rejeitada") {
      throw new Error("Invalid status for notification");
    }
    return i as { token: string; returnId: string; status: "Aprovada" | "Rejeitada" };
  })
  .handler(async ({ data }) => {
    const { data: u, error: ue } = await supabaseAdmin.auth.getUser(data.token);
    if (ue || !u?.user || (u.user.email || "").toLowerCase() !== ADMIN_EMAIL) {
      throw new Error("Unauthorized");
    }

    const { data: ret } = await supabaseAdmin
      .from("returns" as never)
      .select("id, order_id, customer_name, customer_email, items, reason, method, notes")
      .eq("id", data.returnId)
      .maybeSingle() as { data: {
        id: string; order_id: string; customer_name: string | null;
        customer_email: string | null; items: unknown; reason: string;
        method: string; notes: string | null;
      } | null };
    if (!ret) throw new Error("Devolução não encontrada");
    if (!ret.customer_email) return { ok: true, sent: false };

    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      return { ok: true, sent: false };
    }

    const short = String(ret.id).slice(0, 8).toUpperCase();
    const orderShort = String(ret.order_id).slice(0, 8).toUpperCase();
    const approved = data.status === "Aprovada";
    const subject = approved
      ? `Devolução aprovada · #${short}`
      : `Devolução não aceite · #${short}`;
    const intro = approved
      ? "A tua devolução foi aprovada. Iremos processar o reembolso ou troca em breve."
      : "Após análise, não nos é possível aceitar esta devolução.";
    const items = Array.isArray(ret.items) ? (ret.items as Array<Record<string, unknown>>) : [];
    const itemsHtml = items
      .map(
        (it) => `<li style="margin:0 0 6px">
          <strong>${escapeHtml(String(it.brand ?? ""))}</strong> ${escapeHtml(String(it.name ?? ""))}
          ${it.size ? ` · Tamanho ${escapeHtml(String(it.size))}` : ""}
          ${it.quantity ? ` · Qtd ${String(it.quantity)}` : ""}
        </li>`,
      )
      .join("");

    const html = `
      <div style="font-family:-apple-system,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
        <h2 style="font-style:italic;font-weight:400;margin:0 0 4px">${escapeHtml(subject)}</h2>
        <p style="color:#666;margin:0 0 16px">Boutique Antónia Lage · Encomenda #${orderShort}</p>
        <p style="margin:0 0 12px">Olá ${escapeHtml(ret.customer_name ?? "")},</p>
        <p style="margin:0 0 16px">${intro}</p>
        <h3 style="margin:16px 0 8px;font-size:13px;text-transform:uppercase;letter-spacing:0.1em">Peças</h3>
        <ul style="padding-left:18px;margin:0 0 16px;font-size:14px">${itemsHtml}</ul>
        <p style="color:#666;font-size:12px;margin:24px 0 0">Para qualquer dúvida, responde a este email.</p>
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
        to: [ret.customer_email],
        subject,
        html,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error("return email failed", res.status, body);
      return { ok: true, sent: false };
    }
    return { ok: true, sent: true };
  });