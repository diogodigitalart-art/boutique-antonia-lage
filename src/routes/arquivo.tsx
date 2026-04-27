import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { useProducts } from "@/lib/products";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/arquivo")({
  head: () => ({
    meta: [
      { title: "Arquivo — Peças de coleções anteriores | Antónia Lage" },
      {
        name: "description",
        content:
          "Peças de arquivo de coleções anteriores a preços especiais. Edições limitadas e peças únicas.",
      },
      { property: "og:title", content: "Arquivo — Antónia Lage" },
      {
        property: "og:description",
        content: "Peças únicas de coleções anteriores a preços especiais.",
      },
    ],
  }),
  component: ArquivoPage,
});

function ArquivoPage() {
  const { t } = useI18n();
  const { products } = useProducts();
  const items = products.filter((p) => p.category === "archive");
  return (
    <Layout>
      <section className="mx-auto max-w-7xl px-4 pt-8 md:px-8 md:pt-14">
        <p className="text-xs uppercase tracking-[0.25em] text-primary">{t("archive_price")}</p>
        <h1 className="mt-2 font-display text-4xl italic text-foreground md:text-6xl">
          {t("archive_pieces")}
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Peças de coleções anteriores, cuidadosamente preservadas, a preços especiais.
        </p>
      </section>

      <section className="mx-auto mt-10 max-w-7xl px-4 pb-10 md:px-8">
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>
    </Layout>
  );
}
