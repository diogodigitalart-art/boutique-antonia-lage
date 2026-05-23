import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Clock, Users, MapPin, ChevronRight, Sparkles, UserRound } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { RecentlyViewed } from "@/components/RecentlyViewed";
import { BRANDS, EXPERIENCES } from "@/lib/data";
import { useProducts } from "@/lib/products";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Boutique Antónia Lage — Moda feminina premium em Braga" },
      {
        name: "description",
        content:
          "Descobre as novas chegadas de Zadig & Voltaire, Self-Portrait, BA&SH e mais marcas de luxo curadas pela Boutique Antónia Lage.",
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
  const { products } = useProducts();
  const [activeBrand, setActiveBrand] = useState("Todas");
  const newArrivalsAll = products.filter((p) => p.category === "new").filter(
    (p) => activeBrand === "Todas" || p.brand === activeBrand,
  );
  const newArrivals = newArrivalsAll.slice(0, 8);
  const archive = products.filter((p) => p.category === "archive");
  const editorialPicks = products.filter((p) => p.category === "new").slice(0, 2);
  const brandStrip = [
    "Self-Portrait",
    "BA&SH",
    "Rixo",
    "Zadig & Voltaire",
    "Anine Bing",
    "DVF",
    "Momoni",
    "Alberta Ferretti",
  ];

  return (
    <Layout>
      {/* HERO — full-width editorial banner */}
      <section className="relative -mt-px h-[70vh] w-full overflow-hidden md:h-screen">
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #1a2744 0%, #25356b 45%, #3a4e9a 100%)",
          }}
        />
        {/* soft sheen layers */}
        <div className="pointer-events-none absolute -left-1/4 top-1/4 h-[60%] w-[80%] rounded-full bg-white/10 blur-3xl animate-hero-sheen" />
        <div className="pointer-events-none absolute -right-1/4 -bottom-1/4 h-[70%] w-[80%] rounded-full bg-primary/40 blur-3xl animate-hero-sheen-2" />
        <div className="azulejo-on-blue absolute inset-0 opacity-[0.07]" />

        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center text-white">
          <p className="text-[10px] font-light uppercase tracking-[0.4em] text-white/75 md:text-xs">
            Boutique Antónia Lage · Braga · Desde 1984
          </p>
          <h1 className="mt-8 max-w-4xl font-display text-5xl font-light italic leading-[1.05] text-white md:mt-10 md:text-8xl">
            Moda com alma.
            <br />
            Curada com amor.
          </h1>
          <p className="mt-8 max-w-xl text-sm font-light text-white/75 md:text-base">
            Quatro décadas a vestir mulheres com peças escolhidas uma a uma — de Braga para o mundo.
          </p>
          <div className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center md:mt-12">
            <Link
              to="/coleccao"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-8 py-4 text-sm font-light tracking-wide text-[#1a2744] transition hover:bg-white/90"
            >
              Explorar colecção <ChevronRight size={16} />
            </Link>
            <Link
              to="/experiencias"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/60 px-8 py-4 text-sm font-light tracking-wide text-white transition hover:bg-white/10"
            >
              Descobrir experiências
            </Link>
          </div>
        </div>

        {/* bottom fade */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent to-background" />
      </section>

      {/* Brand strip — auto-scrolling marquee */}
      <section className="border-y border-border bg-card py-6">
        <div className="relative overflow-hidden">
          <div className="flex w-max animate-marquee gap-12 whitespace-nowrap px-6">
            {[...brandStrip, ...brandStrip].map((b, i) => (
              <div
                key={`${b}-${i}`}
                className="flex items-center gap-12 text-[11px] font-light uppercase tracking-[0.35em] text-muted-foreground"
              >
                <span>{b}</span>
                <span className="text-muted-foreground/40">·</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Search bar */}
      <section className="px-4 pt-12 md:px-8 md:pt-20">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-4 rounded-full border border-border bg-card px-7 py-5 shadow-sm md:py-6">
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

      {/* Editorial intro — two columns */}
      <section className="mt-24 md:mt-36">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 md:grid-cols-2 md:gap-16 md:px-8">
          <div className="flex flex-col justify-center">
            <p className="text-[10px] font-light uppercase tracking-[0.35em] text-muted-foreground">
              A nossa história
            </p>
            <p className="mt-6 font-display text-4xl font-light italic leading-tight text-foreground md:text-5xl">
              A nossa história começa em 1984, numa pequena boutique no coração de Braga.
            </p>
            <Link
              to="/contactos"
              className="mt-8 inline-flex w-fit items-center gap-1 border-b border-foreground/60 pb-1 text-sm font-light text-foreground transition hover:border-foreground"
            >
              Conhecer a boutique <ChevronRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 md:gap-6">
            {editorialPicks.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* New arrivals — uniform grid */}
      <section className="mt-20 md:mt-28">
        <div className="mx-auto max-w-7xl px-4 md:px-8">
          <div className="mb-10 flex items-end justify-between md:mb-14">
            <div>
              <div className="flex items-center gap-3">
                <p className="text-[10px] font-light uppercase tracking-[0.35em] text-muted-foreground">
                  Nova colecção
                </p>
                <span className="rounded-full border border-primary/40 bg-primary-soft px-2.5 py-0.5 text-[10px] font-light uppercase tracking-[0.18em] text-primary">
                  SS26
                </span>
              </div>
              <h2 className="mt-3 font-display text-4xl font-light italic text-foreground md:text-5xl">
                {t("new_arrivals")}
              </h2>
            </div>
            <Link
              to="/coleccao"
              className="hidden items-center gap-1 text-sm font-light text-muted-foreground hover:text-foreground md:flex"
            >
              Ver toda a colecção <ChevronRight size={16} />
            </Link>
          </div>

          {/* Uniform grid: 2 cols mobile, 4 cols desktop */}
          <div className="grid grid-cols-2 items-stretch gap-x-4 gap-y-12 md:gap-x-8 md:gap-y-16 lg:grid-cols-4">
            {newArrivals.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
          <div className="mt-10 flex justify-center md:hidden">
            <Link
              to="/coleccao"
              className="inline-flex items-center gap-1 text-sm font-light text-muted-foreground hover:text-foreground"
            >
              Ver toda a colecção <ChevronRight size={16} />
            </Link>
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

      {/* Experiences teaser — dark navy band */}
      <section
        className="mt-24 md:mt-36"
        style={{ background: "linear-gradient(135deg, #1a2744 0%, #25356b 100%)" }}
      >
        <div className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-28">
          <div className="mb-12 text-center md:mb-16">
            <p className="text-[10px] font-light uppercase tracking-[0.35em] text-white/60">
              Experiências exclusivas
            </p>
            <h2 className="mt-4 font-display text-4xl font-light italic text-white md:text-5xl">
              Mais do que comprar, viver a boutique
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-2 md:gap-8">
            {EXPERIENCES.slice(0, 2).map((e, idx) => {
              const Icon = idx === 0 ? Sparkles : UserRound;
              return (
                <div
                  key={e.id}
                  className="group flex flex-col rounded-2xl border border-white/10 bg-white/[0.04] p-8 backdrop-blur-sm transition hover:bg-white/[0.07] md:p-10"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/20 text-white">
                    <Icon size={20} strokeWidth={1.3} />
                  </div>
                  <h3 className="mt-6 font-display text-3xl font-light italic text-white">
                    {e.title}
                  </h3>
                  <p className="mt-2 text-xs font-light uppercase tracking-[0.25em] text-white/60">
                    a partir de €{e.price}
                  </p>
                  <p className="mt-4 text-sm font-light leading-relaxed text-white/75">
                    {e.description}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-x-4 gap-y-1.5 text-xs font-light text-white/55">
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
                  <Link
                    to="/experiencias"
                    className="mt-8 inline-flex w-fit items-center justify-center gap-2 rounded-full bg-white px-7 py-3 text-sm font-light text-[#1a2744] transition hover:bg-white/90"
                  >
                    Reservar <ChevronRight size={14} />
                  </Link>
                </div>
              );
            })}
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

      <RecentlyViewed />

    </Layout>
  );
}
