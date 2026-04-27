import { useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  userId: string;
  currentDetails: Record<string, unknown> | null;
  onClose: () => void;
  onSaved: () => void;
};

/**
 * Inline content for the wishlist 3rd-item toast (Checkpoint 6).
 * Rendered via sonner's `toast.custom` so we can show two CTAs and an
 * inline form with channel preference + optional WhatsApp number.
 */
export function WishlistNotifyToast({ userId, currentDetails, onClose, onSaved }: Props) {
  const [step, setStep] = useState<"ask" | "form">("ask");
  const [channel, setChannel] = useState<"email" | "whatsapp">("email");
  const [whatsapp, setWhatsapp] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const dismiss = () => onClose();

  const save = async (pref: { channel: "email" | "whatsapp"; whatsapp?: string }) => {
    setSubmitting(true);
    const profile_details = {
      ...(currentDetails ?? {}),
      notification_preference: pref,
    };
    const { error } = await supabase
      .from("profiles")
      .update({ profile_details })
      .eq("id", userId);
    setSubmitting(false);
    if (error) {
      toast.error("Não conseguimos guardar a tua preferência.");
      return;
    }
    onSaved();
    onClose();
    toast.success("Preferência guardada — vamos avisar-te.");
  };

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+72px)] md:justify-end md:px-6 md:pb-6"
      role="dialog"
      aria-live="polite"
    >
      <div className="pointer-events-auto w-full max-w-sm rounded-2xl border border-border bg-background p-4 shadow-2xl">
      <div className="flex items-start justify-between gap-3">
      <p className="text-sm text-foreground">
        Quer ser avisada quando estas peças tiverem desconto ou chegarem
        novidades semelhantes?
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Fechar"
        className="-mr-1 -mt-1 rounded-full p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
      >
        <X size={16} strokeWidth={1.5} />
      </button>
      </div>

      {step === "ask" ? (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={() => setStep("form")}
            className="flex-1 rounded-full bg-primary px-4 py-2 text-xs uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90"
          >
            Sim, quero!
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-xs uppercase tracking-wider text-foreground transition hover:bg-muted"
          >
            Agora não
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Como preferes ser contactada?
          </p>
          <div className="flex gap-2">
            {(["email", "whatsapp"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setChannel(c)}
                className={`flex-1 rounded-full border px-3 py-1.5 text-xs uppercase tracking-wider transition ${
                  channel === c
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background text-foreground hover:bg-muted"
                }`}
              >
                {c === "email" ? "Email" : "WhatsApp"}
              </button>
            ))}
          </div>

          {channel === "whatsapp" && (
            <input
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="Número de WhatsApp"
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary"
            />
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              disabled={
                submitting || (channel === "whatsapp" && whatsapp.trim().length < 6)
              }
              onClick={() =>
                save({
                  channel,
                  whatsapp: channel === "whatsapp" ? whatsapp.trim() : undefined,
                })
              }
              className="flex-1 rounded-full bg-primary px-4 py-2 text-xs uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
            >
              {submitting ? "A guardar…" : "Guardar"}
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-full border border-border px-3 py-2 text-xs uppercase tracking-wider text-foreground transition hover:bg-muted"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
