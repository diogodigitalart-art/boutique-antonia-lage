import { createServerFn } from "@tanstack/react-start";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
const NOTIFY_TO = "diogodigitalart@gmail.com";
const FROM_ADDRESS = "Antónia Lage <onboarding@resend.dev>";

export type ReservationInput = {
  itemName: string;
  itemType: "produto" | "experiencia";
  name: string;
  email: string;
  phone: string;
  date: string;
  time?: string;
  message?: string;
  occasion?: string;
  experienceDetails?: {
    brands_request?: string;
    special_occasion?: string;
    ambience?: string;
    music_preference?: string;
    companion?: string;
  };
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

function validate(input: unknown): ReservationInput {
  if (!input || typeof input !== "object") throw new Error("Invalid payload");
  const i = input as Record<string, unknown>;
  if (
    !isStr(i.itemName, 200) ||
    !isStr(i.name, 200) ||
    !isStr(i.email, 200) ||
    !isStr(i.phone, 50) ||
    !isStr(i.date, 50)
  ) {
    throw new Error("Missing or invalid fields");
  }
  if (i.itemType !== "produto" && i.itemType !== "experiencia") {
    throw new Error("Invalid itemType");
  }
  if (i.message !== undefined && (typeof i.message !== "string" || i.message.length > 2000)) {
    throw new Error("Invalid message");
  }
  if (i.time !== undefined && (typeof i.time !== "string" || i.time.length > 20)) {
    throw new Error("Invalid time");
  }
  if (i.occasion !== undefined && (typeof i.occasion !== "string" || i.occasion.length > 500)) {
    throw new Error("Invalid occasion");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(i.email)) {
    throw new Error("Invalid email");
  }
  let experienceDetails: ReservationInput["experienceDetails"] | undefined;
  if (i.experienceDetails !== undefined) {
    if (typeof i.experienceDetails !== "object" || i.experienceDetails === null) {
      throw new Error("Invalid experienceDetails");
    }
    const ed = i.experienceDetails as Record<string, unknown>;
    const pickStr = (v: unknown, max = 500) =>
      typeof v === "string" && v.length > 0 && v.length <= max ? v : undefined;
    experienceDetails = {
      brands_request: pickStr(ed.brands_request, 500),
      special_occasion: pickStr(ed.special_occasion, 500),
      ambience: pickStr(ed.ambience, 100),
      music_preference: pickStr(ed.music_preference, 100),
      companion: pickStr(ed.companion, 100),
    };
  }
  return {
    itemName: i.itemName,
    itemType: i.itemType,
    name: i.name,
    email: i.email,
    phone: i.phone,
    date: i.date,
    time: typeof i.time === "string" && i.time.length > 0 ? i.time : undefined,
    message: typeof i.message === "string" ? i.message : undefined,
    occasion: typeof i.occasion === "string" && i.occasion.length > 0 ? i.occasion : undefined,
    experienceDetails,
  };
}

export const sendReservationEmail = createServerFn({ method: "POST" })
  .inputValidator(validate)
  .handler(async ({ data }) => {
    const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY is not configured");

    const itemTypeLabel = data.itemType === "experiencia" ? "Experiência" : "Produto";
    const subject = `Nova reserva — ${data.itemName}`;
    const messageHtml = data.message
      ? `<p style="margin:16px 0 0;"><strong>Mensagem:</strong><br/>${escapeHtml(
          data.message,
        ).replace(/\n/g, "<br/>")}</p>`
      : "";
    const timeRow = data.time
      ? `<tr><td style="padding:8px 0;color:#666;">Hora preferida</td><td style="padding:8px 0;">${escapeHtml(data.time)}</td></tr>`
      : "";
    const occasionRow = data.occasion
      ? `<tr><td style="padding:8px 0;color:#666;">Ocasião especial</td><td style="padding:8px 0;">${escapeHtml(data.occasion)}</td></tr>`
      : "";

    const ed = data.experienceDetails;
    const edRows = ed
      ? [
          ed.brands_request
            ? `<tr><td style="padding:8px 0;color:#666;">Marcas/peças desejadas</td><td style="padding:8px 0;">${escapeHtml(ed.brands_request)}</td></tr>`
            : "",
          ed.special_occasion
            ? `<tr><td style="padding:8px 0;color:#666;">Ocasião especial</td><td style="padding:8px 0;">${escapeHtml(ed.special_occasion)}</td></tr>`
            : "",
          ed.ambience
            ? `<tr><td style="padding:8px 0;color:#666;">Ambiente</td><td style="padding:8px 0;">${escapeHtml(ed.ambience)}</td></tr>`
            : "",
          ed.music_preference
            ? `<tr><td style="padding:8px 0;color:#666;">Música ambiente</td><td style="padding:8px 0;">${escapeHtml(ed.music_preference)}</td></tr>`
            : "",
          ed.companion
            ? `<tr><td style="padding:8px 0;color:#666;">Acompanhamento</td><td style="padding:8px 0;">${escapeHtml(ed.companion)}</td></tr>`
            : "",
        ]
          .filter(Boolean)
          .join("")
      : "";

    const html = `
      <div style="font-family: Arial, sans-serif; color: #1a1a1a; max-width: 560px;">
        <h2 style="margin:0 0 16px;">Nova reserva recebida</h2>
        <p style="margin:0 0 16px;color:#555;">Tipo: <strong>${itemTypeLabel}</strong></p>
        <table style="border-collapse:collapse;width:100%;font-size:14px;">
          <tr><td style="padding:8px 0;color:#666;width:160px;">Item</td><td style="padding:8px 0;"><strong>${escapeHtml(data.itemName)}</strong></td></tr>
          <tr><td style="padding:8px 0;color:#666;">Nome</td><td style="padding:8px 0;">${escapeHtml(data.name)}</td></tr>
          <tr><td style="padding:8px 0;color:#666;">Email</td><td style="padding:8px 0;">${escapeHtml(data.email)}</td></tr>
          <tr><td style="padding:8px 0;color:#666;">Telefone</td><td style="padding:8px 0;">${escapeHtml(data.phone)}</td></tr>
          <tr><td style="padding:8px 0;color:#666;">Data preferida</td><td style="padding:8px 0;">${escapeHtml(data.date)}</td></tr>
          ${timeRow}
          ${occasionRow}
          ${edRows}
        </table>
        ${messageHtml}
      </div>
    `;

    const text = [
      `Nova reserva recebida`,
      `Tipo: ${itemTypeLabel}`,
      `Item: ${data.itemName}`,
      `Nome: ${data.name}`,
      `Email: ${data.email}`,
      `Telefone: ${data.phone}`,
      `Data preferida: ${data.date}`,
      data.time ? `Hora preferida: ${data.time}` : "",
      data.occasion ? `Ocasião especial: ${data.occasion}` : "",
      ed?.brands_request ? `Marcas/peças desejadas: ${ed.brands_request}` : "",
      ed?.special_occasion ? `Ocasião especial: ${ed.special_occasion}` : "",
      ed?.ambience ? `Ambiente: ${ed.ambience}` : "",
      ed?.music_preference ? `Música ambiente: ${ed.music_preference}` : "",
      ed?.companion ? `Acompanhamento: ${ed.companion}` : "",
      data.message ? `Mensagem: ${data.message}` : "",
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
        reply_to: data.email,
        subject,
        html,
        text,
      }),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("Resend send failed", res.status, body);
      throw new Error(`Resend API call failed [${res.status}]: ${JSON.stringify(body)}`);
    }

    // Send confirmation email to the customer (best-effort, non-blocking failure)
    try {
      const customerSubject =
        data.itemType === "experiencia"
          ? `Reserva confirmada — ${data.itemName}`
          : `Reserva confirmada — ${data.itemName}`;
      const itemLabel = data.itemType === "experiencia" ? "experiência" : "peça";
      const timeLine = data.time
        ? `<p style="margin:0 0 12px;"><strong>Hora:</strong> ${escapeHtml(data.time)}</p>`
        : "";
      const customerHtml = `
        <div style="font-family: Arial, sans-serif; color:#1a1a1a; max-width:560px; line-height:1.55;">
          <h2 style="margin:0 0 16px; font-weight:normal;">Olá ${escapeHtml(data.name.split(" ")[0] || data.name)},</h2>
          <p style="margin:0 0 16px;">Recebemos a tua reserva para a ${itemLabel} <strong>${escapeHtml(data.itemName)}</strong>. Estamos muito felizes por te receber em breve.</p>
          <div style="margin:20px 0; padding:16px 20px; background:#faf6f1; border-radius:12px;">
            <p style="margin:0 0 12px;"><strong>${escapeHtml(data.itemName)}</strong></p>
            <p style="margin:0 0 12px;"><strong>Data:</strong> ${escapeHtml(data.date)}</p>
            ${timeLine}
          </div>
          <p style="margin:0 0 16px;">A nossa equipa entrará em contacto contigo para confirmar todos os detalhes. Se precisares de alterar alguma coisa, basta responder a este email.</p>
          <p style="margin:24px 0 4px;">Com carinho,</p>
          <p style="margin:0; font-style:italic;">Equipa Boutique Antónia Lage</p>
        </div>
      `;
      const customerText = [
        `Olá ${data.name.split(" ")[0] || data.name},`,
        ``,
        `Recebemos a tua reserva para a ${itemLabel} "${data.itemName}".`,
        `Data: ${data.date}`,
        data.time ? `Hora: ${data.time}` : "",
        ``,
        `A nossa equipa entrará em contacto contigo para confirmar todos os detalhes.`,
        `Se precisares de alterar alguma coisa, basta responder a este email.`,
        ``,
        `Com carinho,`,
        `Equipa Boutique Antónia Lage`,
      ]
        .filter(Boolean)
        .join("\n");

      const customerRes = await fetch(`${GATEWAY_URL}/emails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": RESEND_API_KEY,
        },
        body: JSON.stringify({
          from: FROM_ADDRESS,
          to: [data.email],
          reply_to: NOTIFY_TO,
          subject: customerSubject,
          html: customerHtml,
          text: customerText,
        }),
      });
      if (!customerRes.ok) {
        const errBody = await customerRes.json().catch(() => ({}));
        console.error("Customer confirmation email failed", customerRes.status, errBody);
      }
    } catch (err) {
      console.error("Customer confirmation email threw", err);
    }

    return { ok: true };
  });
