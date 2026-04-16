import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Clock, Users, MapPin, ChevronRight } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { BRANDS, PRODUCTS, EXPERIENCES } from "@/lib/data";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Boutique Antónia Lage — Moda feminina premium em Braga" },
      {
        name: "description",
        content:
          "Descobre as novas chegadas de Zadig & Voltaire, Self-Portrait, BA&SH e mais marcas de luxo curadas pela Antónia.",
      },
      { property: "og:title", content: "Boutique Antónia Lage — Coleção" },
      {
        property: "og:description",
        content: "Moda feminina premium curada em Braga desde 1984.",
      },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const { t } = useI18n();
  const [activeBrand, setActiveBrand] = useState("Todas");
  const newArrivals = PRODUCTS.filter((p) => p.category === "new").filter(
    (p) => activeBrand === "Todas" || p.brand === activeBrand,
  );
  const archive = PRODUCTS.filter((p) => p.category === "archive");

  return (
    <Layout>
      {/* Mobile-first search bar */}
      <section className="px-4 pt-4 md:px-8 md:pt-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="sr-only">Boutique Antónia Lage — Braga</h1>
          <div className="flex items-center gap-3 rounded-full border border-border bg-card px-5 py-4 shadow-sm md:py-5">
            <Search size={18} className="text-muted-foreground" strokeWidth={1.5} />
            <input
              type="search"
              placeholder={t("search_placeholder")}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground md:text-base"
            />
          </div>
        </div>
      </section>

      {/* Mobile horizontal tabs */}
      <section className="mt-5 md:hidden">
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4">
          {[
            { label: t("tab_collection"), to: "/" as const },
            { label: t("tab_experiences"), to: "/experiencias" as const, badge: true },
            { label: t("tab_archive"), to: "/arquivo" as const },
            { label: t("tab_wishlist"), to: "/wishlist" as const },
          ].map((tab, i) => (
            <Link
              key={tab.label}
              to={tab.to}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition ${
                i === 0
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-foreground"
              }`}
            >
              {tab.label}
              {tab.badge && (
                <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] uppercase text-primary-foreground">
                  {t("badge_new")}
                </span>
              )}
            </Link>
          ))}
        </div>
      </section>

      {/* Brand filter pills */}
      <section className="mt-4 md:mt-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
            {BRANDS.map((b) => {
              const active = activeBrand === b;
              return (
                <button
                  key={b}
                  onClick={() => setActiveBrand(b)}
                  className={`shrink-0 rounded-full border px-4 py-2 text-xs uppercase tracking-wider transition ${
                    active
                      ? "border-primary bg-primary-soft text-primary"
                      : "border-border bg-card text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {b}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* New arrivals */}
      <section className="mt-10">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="mb-5 flex items-end justify-between">
            <h2 className="font-display text-3xl italic text-foreground md:text-4xl">
              {t("new_arrivals")}
            </h2>
            <Link
              to="/arquivo"
              className="hidden items-center gap-1 text-sm text-muted-foreground hover:text-foreground md:flex"
            >
              Ver tudo <ChevronRight size={16} />
            </Link>
          </div>

          {/* Mobile: horizontal scroll. Desktop: grid */}
          <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 md:hidden">
            {newArrivals.map((p) => (
              <div key={p.id} className="w-[68vw] max-w-[280px] shrink-0">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
          <div className="hidden grid-cols-2 gap-x-6 gap-y-10 md:grid lg:grid-cols-4">
            {newArrivals.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* Curated card with azulejo */}
      <section className="mt-12 px-4 md:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="azulejo-on-blue relative overflow-hidden rounded-3xl">
            <div className="bg-primary/40 px-7 py-12 text-primary-foreground md:px-16 md:py-20">
              <p className="text-xs uppercase tracking-[0.25em] text-primary-foreground/80">
                Curadoria pessoal
              </p>
              <h2 className="mt-3 font-display text-4xl italic md:text-5xl">
                {t("curated_title")}
              </h2>
              <p className="mt-3 max-w-md text-sm text-primary-foreground/85 md:text-base">
                {t("curated_subtitle")}
              </p>
              <Link
                to="/quiz"
                className="mt-6 inline-flex items-center gap-2 rounded-full bg-card px-6 py-3 text-sm text-foreground transition hover:bg-card/90"
              >
                {t("curated_cta")} <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Experiences */}
      <section className="mt-14">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <h2 className="mb-5 font-display text-3xl italic text-foreground md:text-4xl">
            {t("exclusive_experiences")}
          </h2>
          <div className="grid gap-5 md:grid-cols-3">
            {EXPERIENCES.map((e) => (
              <Link
                key={e.id}
                to="/experiencias"
                className="group block overflow-hidden rounded-2xl bg-card transition hover:shadow-lg"
              >
                <div className="relative aspect-[5/3] overflow-hidden">
                  <img
                    src={e.image}
                    alt={e.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute right-3 top-3 rounded-full bg-card/95 px-3 py-1 text-xs font-medium text-foreground backdrop-blur">
                    {e.price === 0 ? t("free") : `€${e.price}`}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="font-display text-xl italic text-foreground">{e.title}</h3>
                  <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
                    {e.description}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock size={13} strokeWidth={1.5} /> {e.duration}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Users size={13} strokeWidth={1.5} /> {e.capacity}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={13} strokeWidth={1.5} /> {e.location}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Archive */}
      <section className="mt-14">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="mb-5 flex items-end justify-between">
            <h2 className="font-display text-3xl italic text-foreground md:text-4xl">
              {t("archive_pieces")}
            </h2>
            <Link
              to="/arquivo"
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              Ver tudo <ChevronRight size={16} />
            </Link>
          </div>
          <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 md:hidden">
            {archive.map((p) => (
              <div key={p.id} className="w-[68vw] max-w-[280px] shrink-0">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
          <div className="hidden grid-cols-2 gap-x-6 gap-y-10 md:grid lg:grid-cols-4">
            {archive.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      <footer className="mt-20 border-t border-border py-10 text-center text-xs uppercase tracking-[0.3em] text-muted-foreground">
        {t("founded")}
      </footer>
    </Layout>
  );
}
