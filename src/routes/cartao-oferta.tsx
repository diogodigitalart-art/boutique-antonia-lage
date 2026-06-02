import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Layout } from "@/components/Layout";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { purchaseGiftCard } from "@/server-fns/giftCards";
import { toast } from "sonner";

export const Route = createFileRoute("/cartao-oferta")({
  head: () => ({
    meta: [
      { title: "Cartão Oferta | Boutique Antónia Lage" },
      { name: "description", content: "Ofereça um cartão da Boutique Antónia Lage — o presente perfeito para quem ama moda premium." },
    ],
  }),
  component: GiftCardPage,
});

const PRESET_VALUES = [50, 100, 150, 200];

function GiftCardPage() {
  const { t } = useI18n();
  const router = useRouter();
  const { session } = useAuth();
  const purchase = useServerFn(purchaseGiftCard);
  const [amount, setAmount] = useState<number>(100);
  const [customAmount, setCustomAmount] = useState<string>("");
  const [useCustom, setUseCustom] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [senderName, setSenderName] = useState("");
  const [message, setMessage] = useState("");
  const [sendDate, setSendDate] = useState(new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);

  const finalAmount = useCustom ? Number(customAmount) || 0 : amount;

  const handleSubmit = async () => {
    if (!session) {
      toast.error("Inicia sessão para comprar.");
      router.navigate({ to: "/login", search: { redirect: "/cartao-oferta" } });
      return;
    }
    if (finalAmount < 25) {
      toast.error("Valor mínimo €25.");
      return;
    }
    if (!recipientName || !recipientEmail || !senderName) {
      toast.error("Preenche os campos obrigatórios.");
      return;
    }
    setBusy(true);
    try {
      const { data: s } = await supabase.auth.getSession();
      const token = s.session?.access_token;
      if (!token) throw new Error("Sessão expirada");
      const r = await purchase({
        data: {
          token,
          amount: finalAmount,
          sender_name: senderName,
          recipient_name: recipientName,
          recipient_email: recipientEmail,
          message: message || null,
          send_date: sendDate,
        },
      });
      toast.success(
        r.scheduled
          ? `Cartão criado. Será enviado em ${sendDate}.`
          : "Cartão enviado ao destinatário!",
      );
      setRecipientName("");
      setRecipientEmail("");
      setMessage("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao processar.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-4xl px-4 py-12 md:px-8 md:py-16">
        <header className="text-center">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{t("footer_giftcard")}</p>
          <h1 className="mt-2 font-display text-4xl italic text-foreground md:text-5xl">
            {t("giftcard_title")}
          </h1>
          <p className="mt-3 text-muted-foreground">
            {t("giftcard_subtitle")}
          </p>
        </header>

        <section className="mt-12">
          <h2 className="text-sm uppercase tracking-wider text-muted-foreground">Escolhe o valor</h2>
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-5">
            {PRESET_VALUES.map((v) => (
              <button
                key={v}
                onClick={() => { setUseCustom(false); setAmount(v); }}
                className={`rounded-2xl border p-6 text-center transition ${
                  !useCustom && amount === v
                    ? "border-primary bg-primary-soft"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <span className="font-display text-3xl italic">€{v}</span>
              </button>
            ))}
            <button
              onClick={() => setUseCustom(true)}
              className={`rounded-2xl border p-4 text-center transition ${
                useCustom ? "border-primary bg-primary-soft" : "border-border hover:border-primary/50"
              }`}
            >
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Outro valor</span>
              <input
                type="number"
                min={25}
                value={customAmount}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => { setUseCustom(true); setCustomAmount(e.target.value); }}
                placeholder="€25+"
                className="mt-2 w-full bg-transparent text-center font-display text-2xl italic outline-none"
              />
            </button>
          </div>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-2">
          <Field label="Para (nome do destinatário)" value={recipientName} onChange={setRecipientName} />
          <Field label="Email do destinatário" type="email" value={recipientEmail} onChange={setRecipientEmail} />
          <Field label="De (o teu nome)" value={senderName} onChange={setSenderName} />
          <Field label="Data de envio" type="date" value={sendDate} onChange={setSendDate} />
          <label className="flex flex-col gap-1.5 md:col-span-2">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Mensagem personalizada (opcional)
            </span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={1000}
              rows={4}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
        </section>

        <section className="mt-10 rounded-2xl border border-border bg-card p-8">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Pré-visualização</p>
          <div className="mt-4 rounded-xl border border-border bg-background p-8 text-center">
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Cartão Oferta</p>
            <h3 className="mt-2 font-display text-3xl italic text-primary">
              Para {recipientName || "…"}
            </h3>
            <p className="mt-3 text-sm text-muted-foreground">
              {senderName || "…"} ofereceu-te um cartão da Boutique Antónia Lage
            </p>
            {message && (
              <blockquote className="mx-auto mt-4 max-w-md border-l-2 border-primary pl-4 text-left text-sm italic text-foreground">
                {message}
              </blockquote>
            )}
            <p className="mt-6 font-display text-5xl italic text-primary">€{finalAmount.toFixed(2)}</p>
          </div>
        </section>

        <button
          onClick={() => void handleSubmit()}
          disabled={busy}
          className="mt-8 flex h-12 w-full items-center justify-center rounded-full bg-primary px-6 text-sm uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {busy ? "A processar…" : `Comprar cartão de oferta — €${finalAmount.toFixed(2)}`}
        </button>
        <p className="mt-3 text-center text-xs text-muted-foreground">
          Pagamento via Stripe será adicionado em breve. Por agora a tua compra fica registada.
        </p>
      </div>
    </Layout>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
      />
    </label>
  );
}