import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

const STORAGE_KEY = "cookie-consent-v1";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) {
        // Small delay so it doesn't flash during hydration
        const t = setTimeout(() => setVisible(true), 400);
        return () => clearTimeout(t);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  const choose = (value: "all" | "essential") => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Consentimento de cookies"
      className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+72px)] z-50 px-3 md:bottom-4 md:px-6"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-3 rounded-2xl border border-border bg-card/95 p-4 shadow-lg backdrop-blur md:flex-row md:items-center md:gap-6 md:p-5">
        <p className="flex-1 text-sm font-light leading-relaxed text-foreground">
          Usamos cookies para melhorar a tua experiência. Ao continuar, aceitas a nossa{" "}
          <Link
            to="/privacidade"
            className="underline underline-offset-2 hover:text-primary"
          >
            política de privacidade
          </Link>
          .
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => choose("essential")}
            className="rounded-full border border-foreground/20 px-4 py-2 text-xs font-medium uppercase tracking-[0.15em] text-foreground transition hover:bg-foreground/5"
          >
            Apenas essenciais
          </button>
          <button
            type="button"
            onClick={() => choose("all")}
            className="rounded-full bg-primary px-4 py-2 text-xs font-medium uppercase tracking-[0.15em] text-primary-foreground transition hover:bg-primary/90"
          >
            Aceitar
          </button>
        </div>
      </div>
    </div>
  );
}