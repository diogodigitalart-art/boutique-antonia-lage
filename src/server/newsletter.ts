import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const ADMIN_EMAIL = "diogodigitalart@gmail.com";

function isStr(v: unknown, max = 4096): v is string {
  return typeof v === "string" && v.length > 0 && v.length < max;
}

function generateCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `BV${s}`; // 8 chars total, prefix BV (Bem-vinda)
}

async function sendDiscountEmail(email: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const lovableKey = process.env.LOVABLE_API_KEY;
  if (!apiKey || !lovableKey) return;
  try {
    await fetch("https://connector-gateway.lovable.dev/resend/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": apiKey,
      },
      body: JSON.stringify({
        from: "Boutique Antónia Lage <onboarding@resend.dev>",
        to: [email],
        subject: "Bem-vinda à Boutique Antónia Lage",
        html: `
          <div style="font-family: Georgia, serif; max-width: 520px; margin: 0 auto; padding: 32px; background: #fdfbf7; color: #1a1a1a;">
            <h1 style="font-style: italic; font-size: 28px; color: #1d3557; margin: 0 0 16px;">Bem-vinda à boutique</h1>
            <p style="font-size: 15px; line-height: 1.6;">Obrigada por subscreveres as nossas novidades.</p>
            <p style="font-size: 15px; line-height: 1.6;">Aqui está o teu código de <strong>10% de desconto</strong> na primeira compra:</p>
            <div style="margin: 24px 0; padding: 20px; text-align: center; background: #fff; border: 1px solid #e5e0d5; border-radius: 12px;">
              <span style="font-size: 22px; letter-spacing: 4px; font-weight: bold; color: #1d3557;">${code}</span>
            </div>
            <p style="font-size: 13px; color: #666; line-height: 1.6;">Apresenta este código na finalização da tua primeira encomenda.</p>
            <p style="margin-top: 32px; font-size: 13px; color: #888;">— Boutique Antónia Lage, Braga</p>
          </div>
        `,
      }),
    });
  } catch (e) {
    console.error("newsletter email failed", e);
  }
}

export const subscribeNewsletter = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Invalid payload");
    const i = input as Record<string, unknown>;
    if (!isStr(i.email, 320)) throw new Error("Email inválido");
    const email = (i.email as string).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Email inválido");
    const source = isStr(i.source, 64) ? (i.source as string) : "popup";
    return { email, source };
  })
  .handler(async ({ data }) => {
    const { data: existing } = await supabaseAdmin
      .from("newsletter_subscribers")
      .select("discount_code")
      .eq("email", data.email)
      .maybeSingle();
    if (existing?.discount_code) {
      return { code: existing.discount_code, alreadySubscribed: true };
    }
    const code = generateCode();
    const { error } = await supabaseAdmin.from("newsletter_subscribers").insert({
      email: data.email,
      discount_code: code,
      source: data.source,
    });
    if (error) throw new Error(error.message);
    void sendDiscountEmail(data.email, code);
    return { code, alreadySubscribed: false };
  });

export type NewsletterSubscriberRow = {
  id: string;
  email: string;
  discount_code: string;
  source: string | null;
  created_at: string;
};

export const adminListSubscribers = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Invalid payload");
    const i = input as Record<string, unknown>;
    if (!isStr(i.token)) throw new Error("Missing token");
    return { token: i.token as string };
  })
  .handler(async ({ data }) => {
    const { data: u, error: ae } = await supabaseAdmin.auth.getUser(data.token);
    if (ae || !u?.user || (u.user.email || "").toLowerCase() !== ADMIN_EMAIL) {
      throw new Error("Forbidden");
    }
    const { data: rows, error } = await supabaseAdmin
      .from("newsletter_subscribers")
      .select("id, email, discount_code, source, created_at")
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return { rows: (rows ?? []) as NewsletterSubscriberRow[] };
  });

export const getSetting = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Invalid payload");
    const i = input as Record<string, unknown>;
    if (!isStr(i.key, 64)) throw new Error("Missing key");
    return { key: i.key as string };
  })
  .handler(async ({ data }) => {
    const { data: row } = await supabaseAdmin
      .from("settings")
      .select("value")
      .eq("key", data.key)
      .maybeSingle();
    return { value: row?.value ?? null };
  });

export const adminSetSetting = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => {
    if (!input || typeof input !== "object") throw new Error("Invalid payload");
    const i = input as Record<string, unknown>;
    if (!isStr(i.token)) throw new Error("Missing token");
    if (!isStr(i.key, 64)) throw new Error("Missing key");
    if (typeof i.value !== "string" || i.value.length > 1024) throw new Error("Invalid value");
    return { token: i.token as string, key: i.key as string, value: i.value as string };
  })
  .handler(async ({ data }) => {
    const { data: u, error: ae } = await supabaseAdmin.auth.getUser(data.token);
    if (ae || !u?.user || (u.user.email || "").toLowerCase() !== ADMIN_EMAIL) {
      throw new Error("Forbidden");
    }
    const { error } = await supabaseAdmin
      .from("settings")
      .upsert({ key: data.key, value: data.value, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });