import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { X } from "lucide-react";
import { subscribeNewsletter } from "@/server/newsletter";
import { toast } from "sonner";

const STORAGE_KEY = "newsletter-popup-state";
const DELAY_MS = 20_000;

export function NewsletterPopup() {
  const subscribe = useServerFn(subscribeNewsletter);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const state = window.localStorage.getItem(STORAGE_KEY);
    if (state === "subscribed" || state === "dismissed") return;
    const t = window.setTimeout(() => setOpen(true), DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  const close = () => {
    setOpen(false);
    if (!code && typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "dismissed");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    try {
      const r = await subscribe({ data: { email, source: "popup" } });
      setCode(r.code);
      window.localStorage.setItem(STORAGE_KEY, "subscribed");
      if (r.alreadySubscribed) {
        toast.success("Já estás subscrita — aqui está o teu código.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao subscrever");
    } finally {
      setBusy(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md rounded-2xl bg-card p-8 shadow-2xl">
        <button
          type="button"
          onClick={close}
          aria-label="Fechar"
          className="absolute right-3 top-3 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X size={18} />
        </button>

        {code ? (
          <div className="text-center">
            <h2 className="font-display text-3xl italic text-primary">Bem-vinda</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              O teu código de 10% de desconto na primeira compra:
            </p>
            <div className="mt-5 rounded-xl border border-border bg-background px-6 py-4">
              <span className="font-mono text-xl tracking-[0.3em] text-primary">{code}</span>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Enviámos também o código para o teu email.
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-6 rounded-full bg-primary px-6 py-2.5 text-sm uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
            >
              Continuar a explorar
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-center font-display text-3xl italic text-primary">
              Novidades da Boutique
            </h2>
            <p className="mt-3 text-center text-sm text-muted-foreground">
              Subscreve e recebe 10% de desconto na tua primeira compra.
            </p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-3">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="O teu email"
                className="w-full rounded-full border border-border bg-background px-5 py-3 text-sm focus:border-primary focus:outline-none"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-full bg-primary py-3 text-sm uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
              >
                {busy ? "A subscrever…" : "Subscrever"}
              </button>
            </form>
            <button
              type="button"
              onClick={close}
              className="mt-4 block w-full text-center text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Não, obrigada
            </button>
          </>
        )}
      </div>
    </div>
  );
}