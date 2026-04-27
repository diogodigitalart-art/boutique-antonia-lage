import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { useI18n } from "@/lib/i18n";
import { useWishlist } from "@/lib/wishlist";
import { PRODUCTS } from "@/lib/data";
import { Sparkles, Calendar, Heart, Shirt, Wallet, ArrowRight, CalendarCheck, LogOut, Pencil, Music, CalendarDays } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { EditProfileModal } from "@/components/EditProfileModal";
import { OnboardingBanner } from "@/components/OnboardingBanner";
import { statusBadgeClasses } from "@/lib/reservations";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "O meu perfil | Boutique Antónia Lage" },
      { name: "description", content: "Perfil de estilo, reservas activas e wishlist." },
    ],
  }),
  component: ProfilePage,
});

type Reservation = {
  itemName: string;
  itemType: "produto" | "experiencia";
  name: string;
  email: string;
  phone: string;
  date: string;
  message?: string;
  createdAt: string;
  status?: string;
};

const QUIZ_META: Record<string, { label: string; icon: typeof Calendar }> = {
  occasion: { label: "Ocasião", icon: Calendar },
  style: { label: "Estilo", icon: Sparkles },
  piece: { label: "Peça favorita", icon: Shirt },
  budget: { label: "Orçamento", icon: Wallet },
  music: { label: "Música", icon: Music },
  week: { label: "Semana típica", icon: CalendarDays },
};

function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  );
}

function ProfileContent() {
  const { t, lang, setLang } = useI18n();
  const { ids } = useWishlist();
  const { user, profile, signOut } = useAuth();
  const [styleProfile, setStyleProfile] = useState<Record<string, string> | null>(null);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: sp } = await supabase
        .from("quiz_results" as never)
        .select("answers")
        .eq("user_id", user.id)
        .maybeSingle();
      const quiz = sp as { answers?: Record<string, string> } | null;
      if (quiz?.answers && typeof quiz.answers === "object") {
        setStyleProfile(quiz.answers);
      } else {
        setStyleProfile(null);
      }

      const { data, error } = await supabase
        .from("reservations")
        .select("item_name, item_type, customer_name, customer_email, customer_phone, reservation_date, message, status, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) {
        console.error(error);
        return;
      }
      setReservations(
        (data ?? []).map((r) => ({
          itemName: r.item_name,
          itemType: r.item_type as "produto" | "experiencia",
          name: r.customer_name,
          email: r.customer_email,
          phone: r.customer_phone,
          date: r.reservation_date,
          message: r.message ?? undefined,
          status: r.status ?? "Confirmada",
          createdAt: r.created_at,
        })),
      );
    })();
  }, [user]);

  const wishItems = PRODUCTS.filter((p) => ids.includes(p.id)).slice(0, 4);

  const formatDate = (iso: string) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleDateString(lang === "pt" ? "pt-PT" : "en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  return (
    <Layout>
      {/* Hero */}
      <section className="azulejo-on-blue">
        <div className="bg-primary/30 px-4 py-12 md:px-8 md:py-20">
          <div className="mx-auto flex max-w-7xl items-start justify-between gap-4 text-primary-foreground">
            <div className="min-w-0 flex-1">
              <p className="text-xs uppercase tracking-[0.3em] text-primary-foreground/80">
                A minha conta
              </p>
              <h1 className="mt-3 break-words font-display text-4xl italic leading-tight md:text-6xl">
                {profile?.full_name || "Bem-vinda"}
              </h1>
              <p className="mt-2 break-words text-primary-foreground/85">
                {profile?.email || user?.email}
              </p>
              {profile?.phone && (
                <p className="mt-1 break-words text-sm text-primary-foreground/75">
                  {profile.phone}
                </p>
              )}
              <button
                onClick={() => setEditOpen(true)}
                className="mt-5 inline-flex items-center gap-2 rounded-full border border-primary-foreground/40 bg-primary-foreground/10 px-4 py-2 text-xs uppercase tracking-wider text-primary-foreground backdrop-blur transition hover:bg-primary-foreground/20"
              >
                <Pencil size={13} /> Editar perfil
              </button>
            </div>
            <button
              onClick={async () => {
                await signOut();
                toast.success("Sessão terminada");
              }}
              className="hidden shrink-0 items-center gap-2 rounded-full border border-primary-foreground/40 bg-primary-foreground/10 px-4 py-2 text-xs uppercase tracking-wider text-primary-foreground backdrop-blur transition hover:bg-primary-foreground/20 md:inline-flex"
            >
              <LogOut size={14} /> Terminar sessão
            </button>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl space-y-10 px-4 py-12 md:px-8 md:py-16">
        <OnboardingBanner />
        {/* Perfil de estilo */}
        <div>
          <SectionHeader
            eyebrow={t("your_profile")}
            title="O teu perfil de estilo"
          />
          {styleProfile && Object.keys(styleProfile).length > 0 ? (
            <div className="overflow-hidden rounded-3xl border border-border bg-card">
              <div className="grid gap-px bg-border md:grid-cols-2">
                {Object.entries(styleProfile).map(([k, v]) => {
                  const meta = QUIZ_META[k] ?? { label: k, icon: Sparkles };
                  const Icon = meta.icon;
                  return (
                    <div key={k} className="flex items-center gap-4 bg-card px-6 py-5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft">
                        <Icon size={18} strokeWidth={1.5} className="text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-light uppercase tracking-[0.2em] text-muted-foreground">
                          {meta.label}
                        </p>
                        <p className="mt-1 truncate font-display text-xl italic text-foreground">
                          {v}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between border-t border-border px-6 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Curadoria baseada no teu perfil
                </p>
                <Link
                  to="/quiz"
                  className="text-xs uppercase tracking-wider text-primary underline-offset-4 hover:underline"
                >
                  Refazer quiz
                </Link>
              </div>
            </div>
          ) : (
            <EmptyCard
              icon={Sparkles}
              title="Ainda não conhecemos o teu estilo"
              body="Quatro perguntas bastam para curarmos peças pensadas para ti."
              ctaLabel="Descobrir o meu estilo"
              ctaTo="/quiz"
            />
          )}
        </div>

        {/* Reservas */}
        <div>
          <SectionHeader eyebrow={t("reservations")} title="As minhas reservas" />
          {reservations.length > 0 ? (
            <div className="overflow-hidden rounded-3xl border border-border bg-card">
              {reservations.map((r, i) => (
                <div
                  key={`${r.createdAt}-${i}`}
                  className={`flex flex-col gap-3 px-6 py-5 md:flex-row md:items-center md:justify-between ${
                    i !== reservations.length - 1 ? "border-b border-border" : ""
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft">
                      <CalendarCheck size={18} strokeWidth={1.5} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        {r.itemType === "produto" ? "Prova" : "Experiência"} · {formatDate(r.date)}
                      </p>
                      <p className="mt-1 font-display text-xl italic text-foreground">
                        {r.itemName}
                      </p>
                    </div>
                  </div>
                  <span className={`${statusBadgeClasses(r.status ?? "Confirmada")} self-start md:self-auto`}>
                    {r.status ?? "Confirmada"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyCard
              icon={Calendar}
              title="Ainda não tens reservas"
              body="Reserva uma peça para experimentar ou uma experiência na boutique."
              ctaLabel="Ver colecção"
              ctaTo="/"
            />
          )}
        </div>

        {/* Wishlist */}
        <div>
          <div className="flex items-end justify-between gap-4">
            <SectionHeader eyebrow={t("tab_wishlist")} title="A minha wishlist" noMargin />
            {wishItems.length > 0 && (
              <Link
                to="/wishlist"
                className="inline-flex shrink-0 items-center gap-1 text-xs uppercase tracking-[0.2em] text-primary underline-offset-4 hover:underline"
              >
                Ver toda <ArrowRight size={13} />
              </Link>
            )}
          </div>
          <div className="mt-6">
            {wishItems.length > 0 ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {wishItems.map((p) => (
                  <Link
                    key={p.id}
                    to="/produto/$id"
                    params={{ id: p.id }}
                    className="group block"
                  >
                    <div className="aspect-[4/5] overflow-hidden rounded-2xl bg-muted">
                      <img
                        src={p.image}
                        alt={p.name}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    </div>
                    <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      {p.brand}
                    </p>
                    <p className="mt-1 truncate font-display text-base italic text-foreground">
                      {p.name}
                    </p>
                    <p className="mt-0.5 text-sm text-foreground">€{p.price}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <EmptyCard
                icon={Heart}
                title="Ainda sem favoritos"
                body="Toca no coração das peças que adoras para as guardares aqui."
                ctaLabel="Explorar peças"
                ctaTo="/"
              />
            )}
          </div>
        </div>

        {/* Language toggle */}
        <div className="rounded-3xl border border-border bg-card p-6">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            Idioma / Language
          </p>
          <div className="mt-3 flex gap-2">
            {(["pt", "en"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`rounded-full border px-5 py-2 text-sm uppercase tracking-wider transition ${
                  lang === l
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-foreground"
                }`}
              >
                {l === "pt" ? "Português" : "English"}
              </button>
            ))}
          </div>
        </div>

        {/* Mobile logout */}
        <button
          onClick={async () => {
            await signOut();
            toast.success("Sessão terminada");
          }}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-6 py-3 text-sm uppercase tracking-wider text-foreground transition hover:bg-muted md:hidden"
        >
          <LogOut size={14} /> Terminar sessão
        </button>
      </section>

      <EditProfileModal open={editOpen} onClose={() => setEditOpen(false)} />
    </Layout>
  );
}

function SectionHeader({
  eyebrow,
  title,
  noMargin,
}: {
  eyebrow: string;
  title: string;
  noMargin?: boolean;
}) {
  return (
    <div className={noMargin ? "" : "mb-6"}>
      <p className="text-[10px] uppercase tracking-[0.25em] text-primary">{eyebrow}</p>
      <h2 className="mt-2 font-display text-3xl italic text-foreground md:text-4xl">{title}</h2>
    </div>
  );
}

function EmptyCard({
  icon: Icon,
  title,
  body,
  ctaLabel,
  ctaTo,
}: {
  icon: typeof Calendar;
  title: string;
  body: string;
  ctaLabel: string;
  ctaTo: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-card px-6 py-12 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-soft">
        <Icon size={22} strokeWidth={1.5} className="text-primary" />
      </div>
      <h3 className="mt-5 font-display text-2xl italic text-foreground">{title}</h3>
      <p className="mt-2 max-w-sm text-sm font-light leading-relaxed text-muted-foreground">
        {body}
      </p>
      <Link
        to={ctaTo}
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-xs uppercase tracking-[0.2em] text-primary-foreground transition hover:bg-primary/90"
      >
        {ctaLabel} <ArrowRight size={14} />
      </Link>
    </div>
  );
}