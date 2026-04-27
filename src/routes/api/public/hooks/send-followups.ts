import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const FROM_ADDRESS = "Antónia Lage <onboarding@resend.dev>";
const NOTIFY_TO = "diogodigitalart@gmail.com";

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getSiteUrl(request: Request): string {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

/**
 * Public cron endpoint — picks reservations that:
 *   - have status 'Em visita'
 *   - had visit_started_at >= 3 days ago
 *   - haven't received a follow-up email yet
 * Sends a Portuguese follow-up email via the Resend gateway and marks
 * follow_up_sent_at on the row.
 */
export const Route = createFileRoute("/api/public/hooks/send-followups")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
          return new Response(
            JSON.stringify({ error: "Email provider not configured" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        const threshold = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();

        const { data: reservations, error } = await supabaseAdmin
          .from("reservations")
          .select(
            "id, customer_name, customer_email, item_name, visit_started_at, follow_up_sent_at, status",
          )
          .eq("status", "Em visita")
          .is("follow_up_sent_at", null)
          .not("visit_started_at", "is", null)
          .lte("visit_started_at", threshold)
          .limit(50);

        if (error) {
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        const siteUrl = getSiteUrl(request);
        let sent = 0;
        let failed = 0;

        for (const r of reservations ?? []) {
          if (!r.customer_email) continue;
          const firstName = (r.customer_name || "").split(" ")[0] || "";
          const subject = `Como correu a visita${firstName ? `, ${firstName}` : ""}?`;
          const feedbackUrl = `${siteUrl}/feedback/${r.id}`;

          const html = `
            <div style="font-family: Arial, sans-serif; color:#1a1a1a; max-width:560px; line-height:1.6;">
              <h2 style="margin:0 0 16px; font-weight:normal;">
                Olá ${escapeHtml(firstName || r.customer_name || "")},
              </h2>
              <p style="margin:0 0 16px;">
                Foi um prazer receber-te na boutique para
                <strong>${escapeHtml(r.item_name)}</strong>. Esperamos que tenhas saído
                com aquela peça que te faz sentir verdadeiramente tu.
              </p>
              <p style="margin:0 0 16px;">
                Adorávamos saber como correu a tua visita — leva menos de um minuto e
                ajuda-nos imenso a continuar a curar peças e momentos pensados para ti.
              </p>
              <p style="margin:24px 0;">
                <a href="${feedbackUrl}" style="display:inline-block; background:#1a1a1a; color:#fff; text-decoration:none; padding:12px 22px; border-radius:999px; font-size:13px; letter-spacing:0.08em; text-transform:uppercase;">
                  Partilhar feedback
                </a>
              </p>
              <p style="margin:0 0 4px;">Com carinho,</p>
              <p style="margin:0; font-style:italic;">Equipa Boutique Antónia Lage</p>
            </div>
          `;

          const text = [
            `Olá ${firstName || r.customer_name || ""},`,
            ``,
            `Foi um prazer receber-te na boutique para ${r.item_name}.`,
            `Adorávamos saber como correu a tua visita:`,
            feedbackUrl,
            ``,
            `Com carinho,`,
            `Equipa Boutique Antónia Lage`,
          ].join("\n");

          try {
            const res = await fetch(`${GATEWAY_URL}/emails`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "X-Connection-Api-Key": RESEND_API_KEY,
              },
              body: JSON.stringify({
                from: FROM_ADDRESS,
                to: [r.customer_email],
                reply_to: NOTIFY_TO,
                subject,
                html,
                text,
              }),
            });
            if (!res.ok) {
              failed++;
              const body = await res.text().catch(() => "");
              console.error("Follow-up email failed", res.status, body);
              continue;
            }
            await supabaseAdmin
              .from("reservations")
              .update({ follow_up_sent_at: new Date().toISOString() })
              .eq("id", r.id);
            sent++;
          } catch (err) {
            failed++;
            console.error("Follow-up email threw", err);
          }
        }

        return new Response(
          JSON.stringify({
            ok: true,
            considered: reservations?.length ?? 0,
            sent,
            failed,
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
