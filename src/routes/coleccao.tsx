import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { SimplePagination } from "@/components/SimplePagination";
import { useProducts } from "@/lib/products";
import { BRANDS } from "@/lib/data";

const PAGE_SIZE = 20;

export const Route = createFileRoute("/coleccao")({
  head: () => ({
    meta: [
      { title: "Colecção — Boutique Antónia Lage" },
      {
        name: "description",
        content:
          "Descobre toda a colecção da Boutique Antónia Lage — moda feminina premium curada em Braga.",
      },
      { property: "og:title", content: "Colecção — Antónia Lage" },
      {
        property: "og:description",
        content: "Toda a colecção curada por Antónia Lage.",
      },
    ],
  }),
  component: ColeccaoPage,
});

function ColeccaoPage() {
  const { products } = useProducts();
  const [activeBrand, setActiveBrand] = useState("Todas");
  const [page, setPage] = useState(1);

  const items = useMemo(
    () =>
      products
        .filter((p) => p.category === "new")
        .filter((p) => activeBrand === "Todas" || p.brand === activeBrand),
    [products, activeBrand],
  );

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <Layout>
      <section className="mx-auto max-w-7xl px-4 pt-8 md:px-8 md:pt-14">
        <p className="text-xs uppercase tracking-[0.25em] text-primary">Colecção</p>
        <h1 className="mt-2 font-display text-4xl italic text-foreground md:text-6xl">
          Toda a colecção
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Peças cuidadosamente seleccionadas das melhores marcas internacionais.
        </p>
      </section>

      <section className="mx-auto mt-8 max-w-7xl px-4 md:px-8">
        <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
          {BRANDS.map((b) => {
            const active = activeBrand === b;
            return (
              <button
                key={b}
                onClick={() => {
                  setActiveBrand(b);
                  setPage(1);
                }}
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
      </section>

      <section className="mx-auto mt-10 max-w-7xl px-4 pb-16 md:px-8">
        {pageItems.length === 0 ? (
          <p className="py-20 text-center text-sm text-muted-foreground">
            Sem peças nesta selecção.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
            {pageItems.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
        <SimplePagination page={currentPage} totalPages={totalPages} onChange={setPage} />
      </section>
    </Layout>
  );
}