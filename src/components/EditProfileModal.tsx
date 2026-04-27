import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function EditProfileModal({ open, onClose }: Props) {
  const { user, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setFullName(profile?.full_name ?? "");
      setPhone(profile?.phone ?? "");
    }
  }, [open, profile]);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim(), phone: phone.trim() || null })
      .eq("id", user.id);
    setSubmitting(false);
    if (error) {
      console.error(error);
      toast.error("Não foi possível guardar. Tenta novamente.");
      return;
    }
    await refreshProfile();
    toast.success("Perfil actualizado");
    onClose();
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
        className="relative flex h-full w-full flex-col overflow-y-auto bg-background p-6 shadow-2xl sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-3xl sm:p-8"
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
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            Conta
          </p>
          <h2 className="mt-1 font-display text-3xl italic text-foreground sm:text-4xl">
            Editar perfil
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Actualiza o teu nome e número de telefone.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="full_name" className="text-xs uppercase tracking-wider text-muted-foreground">
              Nome completo
            </label>
            <input
              id="full_name"
              required
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 h-11 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
            />
          </div>

          <div>
            <label htmlFor="phone" className="text-xs uppercase tracking-wider text-muted-foreground">
              Telefone
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 h-11 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
            />
          </div>

          <div className="flex flex-col items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex h-12 w-full items-center justify-center rounded-full bg-primary text-sm uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              {submitting ? "A guardar..." : "Guardar alterações"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-xs uppercase tracking-wider text-muted-foreground transition hover:text-foreground"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}