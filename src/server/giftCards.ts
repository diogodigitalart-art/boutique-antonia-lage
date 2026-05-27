import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ADMIN_EMAIL = "diogodigitalart@gmail.com";

function isStr(v: unknown, max = 4096): v is string {
  return typeof v === "string" && v.length > 0 && v.length < max;
}

function generateGiftCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const buf = new Uint8Array(12);
  crypto.getRandomValues(buf);
  let s = "";
  for (let i = 0; i < 12; i++) s += alphabet[buf[i] % alphabet.length];
  return `GIFT-${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}`;
}

function escapeHtml(input: string) {
  return String(input)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function sendGiftCardEmail(row: {
  code: string;
  amount: number;
  sender_name: string;
  recipient_name: string;
  recipient_email: string;
  message: string | null;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const lovableKey = process.env.LOVABLE_API_KEY;
  if (!apiKey || !lovableKey) return false;
  const html = `
    <div style="font-family: Georgia, serif; max-width: 560px; margin: 0 auto; padding: 40px 32px; background: #fdfbf7; color: #1a1a1a;">
      <p style="font-size: 11px; letter-spacing: 4px; text-transform: uppercase; color: #1d3557; margin: 0 0 12px;">Cartão Oferta</p>
      <h1 style="font-style: italic; font-size: 32px; color: #1d3557; margin: 0 0 24px;">Para ${escapeHtml(row.recipient_name)}</h1>
      <p style="font-size: 15px; line-height: 1.7;">${escapeHtml(row.sender_name)} ofereceu-te um cartão da <strong>Boutique Antónia Lage</strong>.</p>
      ${row.message ? `<blockquote style="margin: 24px 0; padding: 16px 20px; background: #fff; border-left: 3px solid #1d3557; font-style: italic; font-size: 15px; line-height: 1.6;">${escapeHtml(row.message)}</blockquote>` : ""}
      <div style="margin: 32px 0; padding: 28px; text-align: center; background: #fff; border: 1px solid #e5e0d5; border-radius: 12px;">
        <p style="margin: 0 0 8px; font-size: 12px; letter-spacing: 3px; text-transform: uppercase; color: #888;">Valor</p>
        <p style="margin: 0 0 20px; font-size: 36px; font-style: italic; color: #1d3557;">€${row.amount.toFixed(2)}</p>
        <p style="margin: 0 0 8px; font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: #888;">Código</p>
        <p style="margin: 0; font-size: 18px; letter-spacing: 3px; font-weight: bold; color: #1d3557; font-family: monospace;">${escapeHtml(row.code)}</p>
      </div>
      <p style="font-size: 13px; color: #666; line-height: 1.6;">Usa este código na finalização da tua próxima compra em boutique-antonia-lage.lovable.app.</p>
      <p style="margin-top: 40px; font-size: 12px; color: #888;">— Boutique Antónia Lage, Braga</p>
    </div>`;
  try {
    const res = await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": apiKey,
      },
      body: JSON.stringify({
        from: "Boutique Antónia Lage <onboarding@resend.dev>",
        to: [row.recipient_email],
        subject: `${row.sender_name} ofereceu-te um cartão da Boutique Antónia Lage`,
        html,
      }),
    });
    return res.ok;
  } catch (e) {
    console.error("gift card email failed", e);
    return false;
  }
}

export const purchaseGiftCard = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Invalid payload");
    const i = input as Record<string, unknown>;
    if (!isStr(i.token)) throw new Error("Inicia sessão para comprar");
    const amount = Number(i.amount);
    if (!Number.isFinite(amount) || amount < 25 || amount > 5000)
      throw new Error("Valor inválido (mínimo €25)");
    if (!isStr(i.sender_name, 200)) throw new Error("Nome do remetente em falta");
    if (!isStr(i.recipient_name, 200)) throw new Error("Nome do destinatário em falta");
    if (!isStr(i.recipient_email, 320)) throw new Error("Email do destinatário em falta");
    const email = (i.recipient_email as string).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Email do destinatário inválido");
    const message =
      typeof i.message === "string" && i.message.length <= 1000 ? (i.message as string) : null;
    const send_date =
      typeof i.send_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(i.send_date)
        ? (i.send_date as string)
        : new Date().toISOString().slice(0, 10);
    return {
      token: i.token as string,
      amount: Math.round(amount * 100) / 100,
      sender_name: (i.sender_name as string).trim(),
      recipient_name: (i.recipient_name as string).trim(),
      recipient_email: email,
      message,
      send_date,
    };
  })
  .handler(async ({ data }) => {
    const { data: u, error: ae } = await supabaseAdmin.auth.getUser(data.token);
    if (ae || !u?.user) throw new Error("Sessão inválida");
    const userId = u.user.id;
    const senderEmail = u.user.email || "";

    // Generate unique code (retry on collision)
    let code = generateGiftCode();
    for (let i = 0; i < 5; i++) {
      const { data: dup } = await supabaseAdmin
        .from("gift_cards")
        .select("id")
        .eq("code", code)
        .maybeSingle();
      if (!dup) break;
      code = generateGiftCode();
    }

    const today = new Date().toISOString().slice(0, 10);
    const sendNow = data.send_date <= today;

    const { data: inserted, error } = await supabaseAdmin
      .from("gift_cards")
      .insert({
        code,
        amount: data.amount,
        sender_name: data.sender_name,
        sender_email: senderEmail,
        sender_user_id: userId,
        recipient_name: data.recipient_name,
        recipient_email: data.recipient_email,
        message: data.message,
        send_date: data.send_date,
        status: "pending",
      })
      .select("id, code, amount, sender_name, recipient_name, recipient_email, message")
      .single();
    if (error || !inserted) throw new Error(error?.message || "Falha ao criar cartão");

    if (sendNow) {
      const ok = await sendGiftCardEmail(inserted);
      if (ok) {
        await supabaseAdmin
          .from("gift_cards")
          .update({ status: "sent", sent_at: new Date().toISOString() })
          .eq("id", inserted.id);
      }
    }

    return { id: inserted.id, code: inserted.code, scheduled: !sendNow };
  });

export const validateGiftCard = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Invalid payload");
    const i = input as Record<string, unknown>;
    if (!isStr(i.code, 64)) throw new Error("Código em falta");
    return { code: (i.code as string).trim().toUpperCase() };
  })
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin
      .from("gift_cards")
      .select("id, code, amount, status, redeemed_at")
      .eq("code", data.code)
      .maybeSingle();
    if (!row) throw new Error("Cartão não encontrado");
    if (row.status === "redeemed" || row.redeemed_at) throw new Error("Cartão já utilizado");
    if (row.status === "expired") throw new Error("Cartão expirado");
    return { code: row.code, amount: Number(row.amount) };
  });

export type AdminGiftCardRow = {
  id: string;
  code: string;
  amount: number;
  sender_name: string;
  sender_email: string;
  recipient_name: string;
  recipient_email: string;
  message: string | null;
  send_date: string;
  sent_at: string | null;
  redeemed_at: string | null;
  status: string;
  created_at: string;
};

async function requireAdmin(token: string) {
  const { data: u, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !u?.user || (u.user.email || "").toLowerCase() !== ADMIN_EMAIL) {
    throw new Error("Forbidden");
  }
}

export const adminListGiftCards = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Invalid payload");
    const i = input as Record<string, unknown>;
    if (!isStr(i.token)) throw new Error("Missing token");
    return { token: i.token as string };
  })
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { data: rows, error } = await supabaseAdmin
      .from("gift_cards")
      .select(
        "id, code, amount, sender_name, sender_email, recipient_name, recipient_email, message, send_date, sent_at, redeemed_at, status, created_at",
      )
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { rows: (rows ?? []) as AdminGiftCardRow[] };
  });

export const adminExpireGiftCard = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Invalid payload");
    const i = input as Record<string, unknown>;
    if (!isStr(i.token)) throw new Error("Missing token");
    if (!isStr(i.id, 64)) throw new Error("Missing id");
    return { token: i.token as string, id: i.id as string };
  })
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { error } = await supabaseAdmin
      .from("gift_cards")
      .update({ status: "expired" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminResendGiftCard = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Invalid payload");
    const i = input as Record<string, unknown>;
    if (!isStr(i.token)) throw new Error("Missing token");
    if (!isStr(i.id, 64)) throw new Error("Missing id");
    return { token: i.token as string, id: i.id as string };
  })
  .handler(async ({ data }) => {
    await requireAdmin(data.token);
    const { data: row, error } = await supabaseAdmin
      .from("gift_cards")
      .select("code, amount, sender_name, recipient_name, recipient_email, message")
      .eq("id", data.id)
      .single();
    if (error || !row) throw new Error("Cartão não encontrado");
    const ok = await sendGiftCardEmail({
      code: row.code,
      amount: Number(row.amount),
      sender_name: row.sender_name,
      recipient_name: row.recipient_name,
      recipient_email: row.recipient_email,
      message: row.message,
    });
    if (!ok) throw new Error("Falha ao enviar email");
    await supabaseAdmin
      .from("gift_cards")
      .update({ status: "sent", sent_at: new Date().toISOString() })
      .eq("id", data.id);
    return { ok: true };
  });