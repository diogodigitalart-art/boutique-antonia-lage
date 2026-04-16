import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { useI18n } from "@/lib/i18n";
import { useWishlist } from "@/lib/wishlist";
import { PRODUCTS } from "@/lib/data";
import { Sparkles, ShoppingBag, Calendar, Heart } from "lucide-react";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "O meu perfil | Boutique Antónia Lage" },
      { name: "description", content: "Perfil de estilo, histórico e reservas activas." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { t, lang, setLang } = useI18n();
  const { ids } = useWishlist();
  const [profile, setProfile] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("al-style-profile");
      if (raw) setProfile(JSON.parse(raw));
    } catch {}
  }, []);

  const wishItems = PRODUCTS.filter((p) => ids.includes(p.id)).slice(0, 3);

  return (
    <Layout>
      {/* Hero */}
      <section className="azulejo-on-blue">
        <div className="bg-primary/30 px-4 py-12 md:px-8 md:py-20">
          <div className="mx-auto max-w-7xl text-primary-foreground">
            <p className="text-xs uppercase tracking-[0.3em] text-primary-foreground/80">
              Cliente desde 2023
            </p>
            <h1 className="mt-3 font-display text-5xl italic md:text-6xl">Maria Silva</h1>
            <p className="mt-2 text-primary-foreground/85">maria.silva@email.pt · Braga</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        {/* Style profile */}
        <div className="rounded-3xl border border-border bg-card p-6 md:p-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-soft px-3 py-1 text-xs text-primary">
                <Sparkles size={13} /> {t("your_profile")}
              </div>
              <h2 className="mt-3 font-display text-3xl italic text-foreground">
                {profile ? "Editorial Romântico" : "Ainda sem perfil"}
              </h2>
            </div>
            <Link
              to="/quiz"
              className="shrink-0 rounded-full border border-border px-4 py-2 text-xs uppercase tracking-wider hover:bg-muted"
            >
              {profile ? "Refazer quiz" : "Fazer quiz"}
            </Link>
          </div>

          {profile && (
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              {Object.entries(profile).map(([k, v]) => (
                <div
                  key={k}
                  className="flex items-center justify-between rounded-2xl bg-background px-5 py-3"
                >
                  <span className="text-xs uppercase tracking-wider text-muted-foreground">
                    {k}
                  </span>
                  <span className="font-display text-lg italic text-primary">{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sections grid */}
        <div className="mt-8 grid gap-6 md:grid-cols-3">
          <Section icon={Calendar} title={t("reservations")}>
            <ReservationItem
              brand="Self-Portrait"
              name="Blusa renda marfim"
              expires="expira em 41h"
            />
          </Section>
          <Section icon={ShoppingBag} title={t("purchase_history")}>
            <HistoryItem date="12 Mar 2024" brand="BA&SH" total="€540" />
            <HistoryItem date="08 Jan 2024" brand="Rixo" total="€380" />
          </Section>
          <Section icon={Heart} title={t("tab_wishlist")}>
            {wishItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("empty_wishlist")}</p>
            ) : (
              wishItems.map((p) => (
                <Link
                  key={p.id}
                  to="/produto/$id"
                  params={{ id: p.id }}
                  className="flex items-center gap-3 rounded-xl p-2 hover:bg-muted"
                >
                  <img
                    src={p.image}
                    alt=""
                    className="h-12 w-12 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs uppercase text-muted-foreground">{p.brand}</p>
                    <p className="truncate font-display text-sm italic text-foreground">
                      {p.name}
                    </p>
                  </div>
                  <span className="text-sm">€{p.price}</span>
                </Link>
              ))
            )}
          </Section>
        </div>

        {/* Language toggle */}
        <div className="mt-10 rounded-3xl border border-border bg-card p-6">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">Idioma / Language</p>
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
      </section>
    </Layout>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Calendar;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-border bg-card p-6">
      <div className="mb-4 flex items-center gap-2 text-sm uppercase tracking-wider text-muted-foreground">
        <Icon size={15} strokeWidth={1.5} className="text-primary" />
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function ReservationItem({
  brand,
  name,
  expires,
}: {
  brand: string;
  name: string;
  expires: string;
}) {
  return (
    <div className="rounded-2xl bg-primary-soft p-4">
      <p className="text-xs uppercase tracking-wider text-primary">{brand}</p>
      <p className="mt-1 font-display text-lg italic text-foreground">{name}</p>
      <p className="mt-2 text-xs text-muted-foreground">{expires}</p>
    </div>
  );
}

function HistoryItem({ date, brand, total }: { date: string; brand: string; total: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border pb-3 last:border-0 last:pb-0">
      <div>
        <p className="text-xs text-muted-foreground">{date}</p>
        <p className="font-display text-base italic text-foreground">{brand}</p>
      </div>
      <span className="text-sm">{total}</span>
    </div>
  );
}
