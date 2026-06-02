import { useState, useEffect, type FormEvent } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { joinWaitlist } from "@/server-fns/features";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type Props = {
  open: boolean;
  onClose: () => void;
  productUuid: string | undefined;
  productName: string;
  size: string;
};

export function WaitlistModal({ open, onClose, productUuid, productName, size }: Props) {
  const { user, profile } = useAuth();
  const join = useServerFn(joinWaitlist);
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEmail(profile?.email || user?.email || "");
  }, [open, profile?.email, user?.email]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!productUuid) {
      toast.error("Produto inválido.");
      return;
    }
    if (!email.trim()) {
      toast.error("Indica o teu email.");
      return;
    }
    setSubmitting(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token ?? null;
      const res = await join({
        data: { productId: productUuid, size, email: email.trim(), token },
      });
      if (res.alreadyOn) {
        toast.success("Já estás na lista para este tamanho.");
      } else {
        toast.success("Pronto! Avisamos-te assim que voltar a haver stock.");
      }
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao inscrever.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full bg-background p-6 shadow-2xl sm:max-w-md sm:rounded-3xl sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X size={18} />
        </button>
        <div className="pr-8">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">Esgotado</p>
          <h2 className="mt-1 font-display text-2xl italic text-foreground sm:text-3xl">
            Avisamos-te quando voltar
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {productName} — tamanho <strong className="text-foreground">{size}</strong>.
            Deixa o teu email e enviamos uma notificação assim que esta peça voltar a estar disponível.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="waitlist-email" className="text-xs uppercase tracking-wider text-muted-foreground">
              Email
            </label>
            <input
              id="waitlist-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 h-11 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="flex h-12 w-full items-center justify-center rounded-full bg-primary text-sm uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          >
            {submitting ? "A enviar…" : "Confirmar"}
          </button>
        </form>
      </div>
    </div>
  );
}