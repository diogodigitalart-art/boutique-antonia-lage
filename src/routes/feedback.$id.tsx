import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Layout } from "@/components/Layout";
import { AuthGuard } from "@/components/AuthGuard";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { submitFeedback } from "@/server/feedback";
import { Star, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/feedback/$id")({
  head: () => ({
    meta: [
      { title: "Como correu a tua visita? | Boutique Antónia Lage" },
      {
        name: "description",
        content: "Conta-nos como foi a tua visita à boutique.",
      },
    ],
  }),
  component: FeedbackPage,
});

function FeedbackPage() {
  return (
    <AuthGuard>
      <FeedbackContent />
    </AuthGuard>
  );
}

type Reservation = {
  id: string;
  item_name: string;
  reservation_date: string;
};

function FeedbackContent() {
  const { id } = useParams({ from: "/feedback/$id" });
  const { user } = useAuth();
  const submit = useServerFn(submitFeedback);

  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [alreadyDone, setAlreadyDone] = useState(false);

  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [pieceMatch, setPieceMatch] = useState<"yes" | "no" | "better" | "">("");
  const [wishText, setWishText] = useState("");
  const [returnIntent, setReturnIntent] = useState<"yes" | "maybe" | "no" | "">("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: r } = await supabase
        .from("reservations")
        .select("id, item_name, reservation_date")
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();
      setReservation(r ?? null);
      const { data: existing } = await supabase
        .from("feedback" as never)
        .select("id")
        .eq("reservation_id", id)
        .maybeSingle();
      if (existing) setAlreadyDone(true);
      setLoading(false);
    })();
  }, [id, user]);

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!reservation) {
    return (
      <Layout>
        <section className="mx-auto max-w-xl px-4 py-16 text-center md:py-24">
          <h1 className="font-display text-3xl italic text-foreground md:text-4xl">
            Reserva não encontrada
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Esta reserva não está associada à tua conta.
          </p>
          <Link
            to="/perfil"
            className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-xs uppercase tracking-wider text-primary-foreground"
          >
            Voltar ao perfil
          </Link>
        </section>
      </Layout>
    );
  }

  if (done || alreadyDone) {
    return (
      <Layout>
        <section className="mx-auto max-w-xl px-4 py-16 text-center md:py-24">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft">
            <Check className="h-6 w-6 text-primary" />
          </div>
          <h1 className="mt-5 font-display text-3xl italic text-foreground md:text-4xl">
            Obrigada pelo teu feedback
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            A tua opinião ajuda-nos a continuar a melhorar a experiência na boutique.
          </p>
          <Link
            to="/"
            className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-xs uppercase tracking-wider text-primary-foreground"
          >
            Voltar à home
          </Link>
        </section>
      </Layout>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating || !pieceMatch || !returnIntent) {
      toast.error("Preenche os campos obrigatórios.");
      return;
    }
    setSubmitting(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Sessão expirada");
      await submit({
        data: {
          token,
          reservationId: id,
          rating,
          pieceMatch,
          wishListText: wishText.trim() || undefined,
          returnIntent,
        },
      });
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao enviar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout>
      <section className="mx-auto max-w-xl px-4 py-12 md:py-16">
        <p className="text-xs uppercase tracking-[0.25em] text-primary">
          A tua experiência
        </p>
        <h1 className="mt-2 font-display text-3xl italic text-foreground md:text-4xl">
          Como foi a tua visita?
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Reserva: <span className="text-foreground">{reservation.item_name}</span>
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-7">
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Como foi a tua experiência?
            </p>
            <div className="mt-3 flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => {
                const filled = (hoverRating || rating) >= n;
                return (
                  <button
                    key={n}
                    type="button"
                    onMouseEnter={() => setHoverRating(n)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(n)}
                    aria-label={`${n} estrelas`}
                    className="rounded-full p-1 transition"
                  >
                    <Star
                      size={32}
                      strokeWidth={1.5}
                      className={
                        filled
                          ? "fill-primary text-primary"
                          : "text-muted-foreground"
                      }
                    />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              A peça ficou como esperavas?
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(
                [
                  ["yes", "Sim"],
                  ["no", "Não"],
                  ["better", "Melhor do que esperava"],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setPieceMatch(v)}
                  className={`rounded-full border px-4 py-2 text-xs uppercase tracking-wider transition ${
                    pieceMatch === v
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-card text-foreground hover:bg-muted"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="wish"
              className="text-xs uppercase tracking-wider text-muted-foreground"
            >
              Há algo que adoravas ver na Boutique que ainda não temos?
            </label>
            <textarea
              id="wish"
              value={wishText}
              onChange={(e) => setWishText(e.target.value)}
              rows={3}
              className="mt-2 w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary"
            />
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Voltarias?
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(
                [
                  ["yes", "Sim"],
                  ["maybe", "Talvez"],
                  ["no", "Não"],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setReturnIntent(v)}
                  className={`rounded-full border px-4 py-2 text-xs uppercase tracking-wider transition ${
                    returnIntent === v
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-card text-foreground hover:bg-muted"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="h-12 w-full rounded-full bg-primary text-sm uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
          >
            {submitting ? "A enviar…" : "Enviar feedback"}
          </button>
        </form>
      </section>
    </Layout>
  );
}
