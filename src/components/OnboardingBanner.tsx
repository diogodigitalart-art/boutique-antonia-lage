import { useState, type FormEvent } from "react";
import { Sparkles, X, Check } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const STYLE_OPTIONS = ["Clássico", "Casual", "Romântico", "Minimalista", "Eclético"];
const OCCASION_OPTIONS = [
  "Trabalho",
  "Jantares",
  "Eventos sociais",
  "Viagens",
  "Dia-a-dia",
];

export function OnboardingBanner() {
  const { user, profile, refreshProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [city, setCity] = useState("");
  const [stylePref, setStylePref] = useState("");
  const [occasions, setOccasions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Hide if profile_details already has any field filled, or user dismissed locally
  const details = profile?.profile_details ?? null;
  const hasAny =
    details &&
    Object.values(details).some(
      (v) => (Array.isArray(v) ? v.length > 0 : Boolean(v)),
    );
  if (!user || hasAny || dismissed) return null;

  const toggleOccasion = (v: string) => {
    setOccasions((curr) =>
      curr.includes(v) ? curr.filter((x) => x !== v) : [...curr, v],
    );
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    const profile_details = {
      city: city.trim() || undefined,
      style_preference: stylePref || undefined,
      occasions: occasions.length ? occasions : undefined,
    };
    const { error } = await supabase
      .from("profiles")
      .update({ profile_details })
      .eq("id", user.id);
    setSubmitting(false);
    if (error) {
      console.error(error);
      toast.error("Não foi possível guardar. Tenta novamente.");
      return;
    }
    await refreshProfile();
    toast.success("Obrigada! Perfil personalizado.");
    setOpen(false);
  };

  return (
    <div className="rounded-3xl border border-primary/30 bg-primary-soft p-5 md:p-6">
      <div className="flex items-start gap-4">
        <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-full bg-background sm:flex">
          <Sparkles size={18} strokeWidth={1.5} className="text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl italic text-foreground md:text-2xl">
            Personaliza a tua experiência
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Demora menos de 30 segundos.
          </p>
        </div>
        {!open && (
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dispensar"
            className="shrink-0 rounded-full p-1.5 text-muted-foreground transition hover:bg-background hover:text-foreground"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {!open ? (
        <div className="mt-4 flex justify-start">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-xs uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90"
          >
            Personalizar agora
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="ob-city" className="text-xs uppercase tracking-wider text-muted-foreground">
              Cidade onde vives
            </label>
            <input
              id="ob-city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Ex.: Braga"
              className="mt-1 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary"
            />
          </div>

          <div>
            <label htmlFor="ob-style" className="text-xs uppercase tracking-wider text-muted-foreground">
              O teu estilo preferido
            </label>
            <select
              id="ob-style"
              value={stylePref}
              onChange={(e) => setStylePref(e.target.value)}
              className="mt-1 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary"
            >
              <option value="">Seleccionar</option>
              {STYLE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Para que ocasiões te vestes mais?
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {OCCASION_OPTIONS.map((c) => {
                const active = occasions.includes(c);
                return (
                  <button
                    type="button"
                    key={c}
                    onClick={() => toggleOccasion(c)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition ${
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    {active && <Check size={12} />}
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col-reverse items-stretch gap-2 pt-1 sm:flex-row sm:items-center sm:justify-end">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs uppercase tracking-wider text-muted-foreground transition hover:text-foreground"
            >
              Mais tarde
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-11 rounded-full bg-primary px-6 text-xs uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              {submitting ? "A guardar…" : "Guardar"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
