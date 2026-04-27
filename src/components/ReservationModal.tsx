import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { sendReservationEmail } from "@/server/reservation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  contextLabel?: string;
  itemName: string;
  itemType: "produto" | "experiencia";
};

export function ReservationModal({
  open,
  onClose,
  title,
  contextLabel,
  itemName,
  itemType,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const send = useServerFn(sendReservationEmail);
  const { user } = useAuth();
  const today = new Date().toISOString().split("T")[0];
  const isExperience = itemType === "experiencia";
  const TIME_SLOTS = ["10:00", "11:00", "14:00", "15:00", "16:00", "17:00"];

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
      time: isExperience
        ? String(formData.get("time") ?? "").trim() || undefined
        : undefined,
      message: String(formData.get("message") ?? "").trim() || undefined,
    };

    if (isExperience && !payload.time) {
      toast.error("Selecciona uma hora preferida.");
      return;
    }

    setSubmitting(true);
    try {
      await send({ data: payload });
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
        });
        if (error) console.error("Failed to save reservation", error);
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
              className="mt-1 h-11 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
            />
          </div>

          {isExperience && (
            <div>
              <label htmlFor="time" className="text-xs uppercase tracking-wider text-muted-foreground">
                Hora preferida
              </label>
              <select
                id="time"
                name="time"
                required
                defaultValue=""
                className="mt-1 h-11 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary"
              >
                <option value="" disabled>
                  Seleccionar hora
                </option>
                {TIME_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slot}
                  </option>
                ))}
              </select>
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
