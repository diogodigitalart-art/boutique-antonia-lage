import { useEffect, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type Props = {
  open: boolean;
  onClose: () => void;
};

const STYLE_OPTIONS = ["Clássico", "Casual", "Romântico", "Minimalista", "Eclético"];
const COLOUR_OPTIONS = [
  "Neutros",
  "Pretos",
  "Brancos",
  "Azuis",
  "Vermelhos",
  "Verdes",
  "Rosa",
  "Estampados",
];
const OCCASION_OPTIONS = [
  "Trabalho",
  "Jantares",
  "Eventos sociais",
  "Viagens",
  "Dia-a-dia",
];
const HEARD_OPTIONS = ["Instagram", "Recomendação", "Farfetch", "Passei na rua", "Outro"];
const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 80 }, (_, i) => String(CURRENT_YEAR - 18 - i));

export function EditProfileModal({ open, onClose }: Props) {
  const { user, profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [birthYear, setBirthYear] = useState("");
  const [stylePref, setStylePref] = useState("");
  const [colours, setColours] = useState<string[]>([]);
  const [occasions, setOccasions] = useState<string[]>([]);
  const [heardFrom, setHeardFrom] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFullName(profile?.full_name ?? "");
    setPhone(profile?.phone ?? "");
    const d = profile?.profile_details ?? {};
    setCity(d.city ?? "");
    setBirthMonth(d.birth_month ?? "");
    setBirthYear(d.birth_year ?? "");
    setStylePref(d.style_preference ?? "");
    setColours(d.favourite_colours ?? []);
    setOccasions(d.occasions ?? []);
    setHeardFrom(d.heard_from ?? "");
  }, [open, profile]);

  if (!open) return null;

  const togglePill = (
    value: string,
    list: string[],
    setList: (v: string[]) => void,
  ) => {
    setList(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    const profile_details = {
      city: city.trim() || undefined,
      birth_month: birthMonth || undefined,
      birth_year: birthYear || undefined,
      style_preference: stylePref || undefined,
      favourite_colours: colours.length ? colours : undefined,
      occasions: occasions.length ? occasions : undefined,
      heard_from: heardFrom || undefined,
    };
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim(),
        phone: phone.trim() || null,
        profile_details,
      })
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
            Conta-nos um pouco mais sobre ti — quanto melhor te conhecermos, melhor te servimos.
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

          <div>
            <label htmlFor="city" className="text-xs uppercase tracking-wider text-muted-foreground">
              Onde vives?
            </label>
            <input
              id="city"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Cidade"
              className="mt-1 h-11 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Mês e ano de nascimento
            </label>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Para te enviarmos uma surpresa no teu aniversário.
            </p>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <select
                value={birthMonth}
                onChange={(e) => setBirthMonth(e.target.value)}
                className="h-11 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
              >
                <option value="">Mês</option>
                {MONTHS.map((m, i) => (
                  <option key={m} value={String(i + 1)}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                className="h-11 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
              >
                <option value="">Ano</option>
                {YEARS.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="style" className="text-xs uppercase tracking-wider text-muted-foreground">
              O teu estilo preferido
            </label>
            <select
              id="style"
              value={stylePref}
              onChange={(e) => setStylePref(e.target.value)}
              className="mt-1 h-11 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
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
              Cores que adoras vestir
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {COLOUR_OPTIONS.map((c) => {
                const active = colours.includes(c);
                return (
                  <button
                    type="button"
                    key={c}
                    onClick={() => togglePill(c, colours, setColours)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-card text-foreground hover:bg-muted"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
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
                    onClick={() => togglePill(c, occasions, setOccasions)}
                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                      active
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-card text-foreground hover:bg-muted"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="heard" className="text-xs uppercase tracking-wider text-muted-foreground">
              Como nos conheceste?
            </label>
            <select
              id="heard"
              value={heardFrom}
              onChange={(e) => setHeardFrom(e.target.value)}
              className="mt-1 h-11 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
            >
              <option value="">Seleccionar</option>
              {HEARD_OPTIONS.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
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