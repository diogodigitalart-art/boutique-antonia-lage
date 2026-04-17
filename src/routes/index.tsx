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
      {/* Prominent centered search bar */}
      <section className="px-4 pt-8 md:px-8 md:pt-16">
        <div className="mx-auto max-w-3xl">
          <h1 className="sr-only">Boutique Antónia Lage — Braga</h1>
          <div className="flex items-center gap-4 rounded-full border border-border bg-card px-7 py-5 shadow-sm md:py-7">
            <Search size={20} className="text-muted-foreground" strokeWidth={1.5} />
            <input
              type="search"
              placeholder={t("search_placeholder")}
              className="flex-1 bg-transparent text-base font-light outline-none placeholder:text-muted-foreground md:text-lg"
            />
          </div>
        </div>
      </section>

      {/* Mobile horizontal tabs */}
      <section className="mt-8 md:hidden">
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
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-light transition ${
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

      {/* Brand filter pills — smaller, more elegant */}
      <section className="mt-10 md:mt-20">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:justify-center md:px-0">
            {BRANDS.map((b) => {
              const active = activeBrand === b;
              return (
                <button
                  key={b}
                  onClick={() => setActiveBrand(b)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-light uppercase tracking-[0.15em] transition ${
                    active
                      ? "border-primary/40 bg-primary-soft text-primary"
                      : "border-border/60 bg-transparent text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                  }`}
                >
                  {b}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* New arrivals — uniform grid */}
      <section className="mt-20 md:mt-28">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="mb-10 flex items-end justify-between md:mb-14">
            <h2 className="font-display text-4xl font-light italic text-foreground md:text-5xl">
              {t("new_arrivals")}
            </h2>
            <Link
              to="/arquivo"
              className="hidden items-center gap-1 text-sm font-light text-muted-foreground hover:text-foreground md:flex"
            >
              Ver tudo <ChevronRight size={16} />
            </Link>
          </div>

          {/* Uniform grid: 2 cols mobile, 4 cols desktop */}
          <div className="grid grid-cols-2 items-stretch gap-x-4 gap-y-12 md:gap-x-8 md:gap-y-16 lg:grid-cols-4">
            {newArrivals.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* Curated card with azulejo — full width, more vertical padding */}
      <section className="mt-24 md:mt-36">
        <div className="azulejo-on-blue relative w-full overflow-hidden">
          <div className="bg-primary/40">
            <div className="mx-auto max-w-4xl px-6 py-24 text-center text-primary-foreground md:px-8 md:py-40">
              <p className="text-xs font-light uppercase tracking-[0.3em] text-primary-foreground/80">
                Curadoria pessoal
              </p>
              <h2 className="mt-6 font-display text-5xl font-light italic md:text-7xl">
                {t("curated_title")}
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-base font-light text-primary-foreground/85 md:text-lg">
                {t("curated_subtitle")}
              </p>
              <Link
                to="/quiz"
                className="mt-10 inline-flex items-center gap-2 rounded-full bg-card px-8 py-4 text-sm font-light text-foreground transition hover:bg-card/90"
              >
                {t("curated_cta")} <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Experiences */}
      <section className="mt-24 md:mt-36">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <h2 className="mb-10 font-display text-4xl font-light italic text-foreground md:mb-14 md:text-5xl">
            {t("exclusive_experiences")}
          </h2>
          <div className="grid gap-6 md:grid-cols-3 md:gap-8">
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
                  <div className="absolute right-3 top-3 rounded-full bg-card/95 px-3 py-1 text-xs font-light text-foreground backdrop-blur">
                    {e.price === 0 ? t("free") : `a partir de €${e.price}`}
                  </div>
                </div>
                <div className="p-6 md:p-7">
                  <h3 className="font-display text-2xl font-light italic text-foreground">
                    {e.title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm font-light text-muted-foreground">
                    {e.description}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-light text-muted-foreground">
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

      {/* Archive — uniform grid */}
      <section className="mt-24 md:mt-36">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="mb-10 flex items-end justify-between md:mb-14">
            <h2 className="font-display text-4xl font-light italic text-foreground md:text-5xl">
              {t("archive_pieces")}
            </h2>
            <Link
              to="/arquivo"
              className="flex items-center gap-1 text-sm font-light text-muted-foreground hover:text-foreground"
            >
              Ver tudo <ChevronRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-2 items-stretch gap-x-4 gap-y-12 md:gap-x-8 md:gap-y-16 lg:grid-cols-4">
            {archive.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      <footer className="mt-32 border-t border-border py-12 text-center text-xs font-light uppercase tracking-[0.3em] text-muted-foreground md:mt-40">
        {t("founded")}
      </footer>
    </Layout>
  );
}
