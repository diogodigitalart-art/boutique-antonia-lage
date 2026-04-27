import { useEffect, useMemo, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { sendReservationEmail } from "@/server/reservation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { TIME_SLOTS, SCHEDULE_NOTE, isSunday } from "@/lib/reservations";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  contextLabel?: string;
  itemName: string;
  itemType: "produto" | "experiencia";
  /** When true, show extra Boutique Privada questions and save them to experience_details. */
  collectExperienceDetails?: boolean;
};

export function ReservationModal({
  open,
  onClose,
  title,
  contextLabel,
  itemName,
  itemType,
  collectExperienceDetails = false,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const send = useServerFn(sendReservationEmail);
  const { user, profile, refreshProfile } = useAuth();
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [blocked, setBlocked] = useState<Array<{ blocked_date: string; blocked_time: string | null }>>([]);
  // Optional occasion (Checkpoint 4) — shown on every reservation
  const [occasion, setOccasion] = useState("");
  // Boutique Privada extra fields
  const [brandsRequest, setBrandsRequest] = useState("");
  const [specialOccasion, setSpecialOccasion] = useState("");
  const [ambience, setAmbience] = useState("");
  const [musicPref, setMusicPref] = useState("");
  const [companion, setCompanion] = useState("");

  useEffect(() => {
    if (!open) return;
    setDate("");
    setTime("");
    setOccasion("");
    setBrandsRequest("");
    setSpecialOccasion("");
    setAmbience("");
    setMusicPref("");
    setCompanion("");
    (async () => {
      const { data } = await supabase
        .from("blocked_slots" as never)
        .select("blocked_date, blocked_time")
        .gte("blocked_date", today);
      setBlocked((data as Array<{ blocked_date: string; blocked_time: string | null }>) ?? []);
    })();
  }, [open, today]);

  const dateIsSunday = isSunday(date);
  const dateFullyBlocked = useMemo(
    () => Boolean(date) && blocked.some((b) => b.blocked_date === date && !b.blocked_time),
    [date, blocked],
  );
  const blockedTimesForDate = useMemo(
    () =>
      new Set(
        blocked
          .filter((b) => b.blocked_date === date && b.blocked_time)
          .map((b) => b.blocked_time as string),
      ),
    [date, blocked],
  );

  if (!open) return null;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    const payload = {
      itemName,
      itemType,
      name: String(formData.get("name") ?? "").trim(),
      email: String(formData.get("email") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim(),
      date: String(formData.get("date") ?? "").trim(),
      time: String(formData.get("time") ?? "").trim() || undefined,
      message: String(formData.get("message") ?? "").trim() || undefined,
      occasion: occasion.trim() || undefined,
    };

    if (!payload.date) {
      toast.error("Selecciona uma data.");
      return;
    }
    if (isSunday(payload.date)) {
      toast.error("A boutique está fechada ao Domingo.");
      return;
    }
    if (dateFullyBlocked) {
      toast.error("Essa data não está disponível.");
      return;
    }
    if (!payload.time) {
      toast.error("Selecciona uma hora preferida.");
      return;
    }
    if (blockedTimesForDate.has(payload.time)) {
      toast.error("Essa hora não está disponível.");
      return;
    }

    setSubmitting(true);
    try {
      const experience_details = collectExperienceDetails
        ? {
            brands_request: brandsRequest.trim() || undefined,
            special_occasion: specialOccasion.trim() || undefined,
            ambience: ambience || undefined,
            music_preference: musicPref || undefined,
            companion: companion || undefined,
          }
        : undefined;

      await send({ data: { ...payload, experienceDetails: experience_details } });
      if (user) {
        const { error } = await supabase.from("reservations").insert({
          user_id: user.id,
          item_name: payload.itemName,
          item_type: payload.itemType,
          product_name: payload.itemName,
          customer_name: payload.name,
          customer_email: payload.email,
          customer_phone: payload.phone,
          reservation_date: payload.time
            ? `${payload.date} ${payload.time}`
            : payload.date,
          preferred_date: payload.date,
          message: payload.message ?? null,
          status: "Confirmada",
          experience_details: experience_details ?? {},
          occasion: payload.occasion ?? null,
        });
        if (error) console.error("Failed to save reservation", error);

        // Auto-save phone to profile if not already set
        if (payload.phone && !profile?.phone) {
          const { error: pErr } = await supabase
            .from("profiles")
            .update({ phone: payload.phone })
            .eq("id", user.id);
          if (pErr) console.error("Failed to save phone to profile", pErr);
          else await refreshProfile();
        }
      }
      onClose();
      toast.success("Reserva confirmada! Entraremos em contacto em breve.");
    } catch (err) {
      console.error(err);
      toast.error("Não foi possível enviar a reserva. Tenta novamente.");
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
          {contextLabel && (
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              {contextLabel}
            </p>
          )}
          <h2 className="mt-1 font-display text-3xl italic text-foreground sm:text-4xl">
            {title ?? "Reservar para experimentar"}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            A peça fica guardada 48h. Sem compromisso.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="name" className="text-xs uppercase tracking-wider text-muted-foreground">
              Nome completo
            </label>
            <input
              id="name"
              name="name"
              required
              type="text"
              className="mt-1 h-11 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
            />
          </div>

          <div>
            <label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">
              Email
            </label>
            <input
              id="email"
              name="email"
              required
              type="email"
              className="mt-1 h-11 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
            />
          </div>

          <div>
            <label htmlFor="phone" className="text-xs uppercase tracking-wider text-muted-foreground">
              Telefone
            </label>
            <input
              id="phone"
              name="phone"
              required
              type="tel"
              className="mt-1 h-11 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
            />
          </div>

          <div>
            <label htmlFor="date" className="text-xs uppercase tracking-wider text-muted-foreground">
              Data preferida
            </label>
            <input
              id="date"
              name="date"
              required
              type="date"
              min={today}
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setTime("");
              }}
              className="mt-1 h-11 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
            />
            {dateIsSunday && (
              <p className="mt-1.5 text-xs text-destructive">
                A boutique está fechada ao Domingo. Escolhe outro dia.
              </p>
            )}
            {!dateIsSunday && dateFullyBlocked && (
              <p className="mt-1.5 text-xs text-destructive">
                Esta data não está disponível.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="time" className="text-xs uppercase tracking-wider text-muted-foreground">
              Hora preferida
            </label>
            <select
              id="time"
              name="time"
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
              disabled={!date || dateIsSunday || dateFullyBlocked}
              className="mt-1 h-11 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="" disabled>
                Seleccionar hora
              </option>
              {TIME_SLOTS.map((slot) => {
                const isBlocked = blockedTimesForDate.has(slot);
                return (
                  <option key={slot} value={slot} disabled={isBlocked}>
                    {slot}
                    {isBlocked ? " — indisponível" : ""}
                  </option>
                );
              })}
            </select>
            <p className="mt-1.5 text-[11px] text-muted-foreground">{SCHEDULE_NOTE}</p>
          </div>

          {collectExperienceDetails && (
            <div className="rounded-2xl border border-primary/30 bg-primary-soft/40 p-4 sm:p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">
                Experiência personalizada
              </p>
              <h3 className="mt-1 font-display text-xl italic text-foreground">
                Ajuda-nos a criar a experiência perfeita para ti
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Todos os campos são opcionais.
              </p>

              <div className="mt-4 space-y-4">
                <div>
                  <label htmlFor="brands_request" className="text-xs uppercase tracking-wider text-muted-foreground">
                    Há alguma marca ou peça específica que queiras ver?
                  </label>
                  <input
                    id="brands_request"
                    type="text"
                    value={brandsRequest}
                    onChange={(e) => setBrandsRequest(e.target.value)}
                    placeholder="Ex.: Self-Portrait, vestido midi…"
                    className="mt-1 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary"
                  />
                </div>

                <div>
                  <label htmlFor="special_occasion" className="text-xs uppercase tracking-wider text-muted-foreground">
                    É para uma ocasião especial?
                  </label>
                  <input
                    id="special_occasion"
                    type="text"
                    value={specialOccasion}
                    onChange={(e) => setSpecialOccasion(e.target.value)}
                    placeholder="Aniversário, presente, reunião importante…"
                    className="mt-1 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary"
                  />
                </div>

                <div>
                  <label htmlFor="ambience" className="text-xs uppercase tracking-wider text-muted-foreground">
                    Como preferes o ambiente?
                  </label>
                  <select
                    id="ambience"
                    value={ambience}
                    onChange={(e) => setAmbience(e.target.value)}
                    className="mt-1 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary"
                  >
                    <option value="">Seleccionar</option>
                    <option value="Tranquilo e íntimo">Tranquilo e íntimo</option>
                    <option value="Dinâmico e animado">Dinâmico e animado</option>
                    <option value="Sem preferência">Sem preferência</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="music_pref" className="text-xs uppercase tracking-wider text-muted-foreground">
                    Gostas de música ambiente?
                  </label>
                  <select
                    id="music_pref"
                    value={musicPref}
                    onChange={(e) => setMusicPref(e.target.value)}
                    className="mt-1 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary"
                  >
                    <option value="">Seleccionar</option>
                    <option value="Sim">Sim</option>
                    <option value="Não">Não</option>
                    <option value="Sem preferência">Sem preferência</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="companion" className="text-xs uppercase tracking-wider text-muted-foreground">
                    Vens sozinha ou acompanhada?
                  </label>
                  <select
                    id="companion"
                    value={companion}
                    onChange={(e) => setCompanion(e.target.value)}
                    className="mt-1 h-11 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary"
                  >
                    <option value="">Seleccionar</option>
                    <option value="Sozinha">Sozinha</option>
                    <option value="Com amigas">Com amigas</option>
                    <option value="Com familiar">Com familiar</option>
                    <option value="Com parceiro/a">Com parceiro/a</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="message" className="text-xs uppercase tracking-wider text-muted-foreground">
              Mensagem opcional
            </label>
            <textarea
              id="message"
              name="message"
              rows={3}
              className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
            />
          </div>

          <div>
            <label htmlFor="occasion" className="text-xs uppercase tracking-wider text-muted-foreground">
              É para alguma ocasião especial?
            </label>
            <input
              id="occasion"
              type="text"
              value={occasion}
              onChange={(e) => setOccasion(e.target.value)}
              placeholder="Aniversário, viagem, evento importante…"
              className="mt-1 h-11 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
            />
          </div>

          <div className="flex flex-col items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex h-12 w-full items-center justify-center rounded-full bg-primary text-sm uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              {submitting ? "A enviar..." : "Confirmar reserva"}
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
