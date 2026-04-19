import { createFileRoute } from "@tanstack/react-router";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const NOTIFY_TO = "diogodigitalart@gmail.com";
const FROM_ADDRESS = "Antónia Lage <onboarding@resend.dev>";

type ReservationPayload = {
  itemName?: string;
  itemType?: string; // "produto" | "experiencia"
  name?: string;
  email?: string;
  phone?: string;
  date?: string;
  message?: string;
};

function escapeHtml(input: string) {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isStr(v: unknown, max = 500): v is string {
  return typeof v === "string" && v.length > 0 && v.length <= max;
}

export const Route = createFileRoute("/api/reservation")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        if (!LOVABLE_API_KEY) {
          return Response.json(
            { error: "LOVABLE_API_KEY is not configured" },
            { status: 500 },
          );
        }
        if (!RESEND_API_KEY) {
          return Response.json(
            { error: "RESEND_API_KEY is not configured" },
            { status: 500 },
          );
        }

        let body: ReservationPayload;
        try {
          body = (await request.json()) as ReservationPayload;
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }

        // Validate
        if (
          !isStr(body.name, 200) ||
          !isStr(body.email, 200) ||
          !isStr(body.phone, 50) ||
          !isStr(body.date, 50) ||
          !isStr(body.itemName, 200)
        ) {
          return Response.json({ error: "Missing or invalid fields" }, { status: 400 });
        }
        if (body.message && (typeof body.message !== "string" || body.message.length > 2000)) {
          return Response.json({ error: "Invalid message" }, { status: 400 });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)) {
          return Response.json({ error: "Invalid email" }, { status: 400 });
        }

        const itemType = body.itemType === "experiencia" ? "Experiência" : "Produto";
        const subject = `Nova reserva — ${body.itemName}`;
        const messageHtml = body.message
          ? `<p><strong>Mensagem:</strong><br/>${escapeHtml(body.message).replace(/\n/g, "<br/>")}</p>`
          : "";

        const html = `
          <div style="font-family: Arial, sans-serif; color: #1a1a1a; max-width: 560px;">
            <h2 style="margin:0 0 16px;">Nova reserva recebida</h2>
            <p style="margin:0 0 16px;color:#555;">Tipo: <strong>${itemType}</strong></p>
            <table style="border-collapse:collapse;width:100%;font-size:14px;">
              <tr><td style="padding:8px 0;color:#666;width:160px;">Item</td><td style="padding:8px 0;"><strong>${escapeHtml(body.itemName)}</strong></td></tr>
              <tr><td style="padding:8px 0;color:#666;">Nome</td><td style="padding:8px 0;">${escapeHtml(body.name)}</td></tr>
              <tr><td style="padding:8px 0;color:#666;">Email</td><td style="padding:8px 0;">${escapeHtml(body.email)}</td></tr>
              <tr><td style="padding:8px 0;color:#666;">Telefone</td><td style="padding:8px 0;">${escapeHtml(body.phone)}</td></tr>
              <tr><td style="padding:8px 0;color:#666;">Data preferida</td><td style="padding:8px 0;">${escapeHtml(body.date)}</td></tr>
            </table>
            ${messageHtml}
          </div>
        `;

        const text = [
          `Nova reserva recebida`,
          `Tipo: ${itemType}`,
          `Item: ${body.itemName}`,
          `Nome: ${body.name}`,
          `Email: ${body.email}`,
          `Telefone: ${body.phone}`,
          `Data preferida: ${body.date}`,
          body.message ? `Mensagem: ${body.message}` : "",
        ]
          .filter(Boolean)
          .join("\n");

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
            reply_to: body.email,
            subject,
            html,
            text,
          }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          console.error("Resend send failed", res.status, data);
          return Response.json(
            { error: "Failed to send email", status: res.status, details: data },
            { status: 502 },
          );
        }

        return Response.json({ ok: true });
      },
    },
  },
});
