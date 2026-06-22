import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ChevronLeft } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { SimplePagination } from "@/components/SimplePagination";
import { ProductCardSkeletonGrid } from "@/components/ProductCardSkeleton";
import { useProducts } from "@/lib/products";
import { slugify } from "@/lib/utils";

const PAGE_SIZE = 20;

export const Route = createFileRoute("/coleccao_/marca/$slug")({
  head: ({ params }) => {
    const display = params.slug
      .split("-")
      .map((w: string) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(" ");
    const title = `${display} em Portugal | Boutique Antónia Lage Braga`;
    const desc = `Descobre toda a colecção ${display} disponível na Boutique Antónia Lage em Braga. Peças seleccionadas com stock disponível.`;
    const url = `https://boutique-antonia-lage.lovable.app/coleccao/marca/${params.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: BrandPage,
});

function BrandPage() {
  const { slug } = Route.useParams();
  const { products, loading } = useProducts();
  const [page, setPage] = useState(1);

  const brandItems = useMemo(
    () => products.filter((p) => p.category === "new" && slugify(p.brand) === slug),
    [products, slug],
  );

  const brandName =
    brandItems[0]?.brand ??
    slug
      .split("-")
      .map((w: string) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(" ");

  const totalPages = Math.max(1, Math.ceil(brandItems.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = brandItems.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <Layout>
      <section className="mx-auto max-w-7xl px-4 pt-8 md:px-8 md:pt-14">
        <Link
          to="/coleccao"
          className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-muted-foreground transition hover:text-foreground"
        >
          <ChevronLeft size={14} /> Colecção
        </Link>
        <p className="mt-4 text-xs uppercase tracking-[0.25em] text-primary">Marca</p>
        <h1 className="mt-2 font-display text-4xl italic text-foreground md:text-6xl">
          {brandName}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          {brandItems.length}{" "}
          {brandItems.length === 1 ? "peça disponível" : "peças disponíveis"}
        </p>
      </section>

      <section className="mx-auto mt-8 max-w-7xl px-4 pb-16 md:px-8">
        {loading && products.length === 0 ? (
          <ProductCardSkeletonGrid count={9} />
        ) : pageItems.length === 0 ? (
          <div className="py-16 text-center">
            <p className="font-display text-2xl italic text-foreground">
              Sem peças disponíveis nesta marca.
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Volta em breve ou explora outras marcas.
            </p>
            <Link
              to="/coleccao"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-xs font-medium uppercase tracking-[0.15em] text-primary-foreground transition hover:bg-primary/90"
            >
              Ver toda a colecção
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
              {pageItems.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            <SimplePagination page={currentPage} totalPages={totalPages} onChange={setPage} />
          </>
        )}
      </section>
    </Layout>
  );
}