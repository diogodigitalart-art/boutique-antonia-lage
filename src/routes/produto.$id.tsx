import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, ChevronLeft, Check } from "lucide-react";
import { Layout } from "@/components/Layout";
import { getProduct, PRODUCTS } from "@/lib/data";
import { useWishlist } from "@/lib/wishlist";
import { useI18n } from "@/lib/i18n";
import { ProductCard } from "@/components/ProductCard";

export const Route = createFileRoute("/produto/$id")({
  loader: ({ params }) => {
    const product = getProduct(params.id);
    if (!product) throw notFound();
    return { product };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.product.brand} — ${loaderData.product.name} | Antónia Lage` },
          { name: "description", content: loaderData.product.description },
          {
            property: "og:title",
            content: `${loaderData.product.brand} — ${loaderData.product.name}`,
          },
          { property: "og:description", content: loaderData.product.description },
          { property: "og:image", content: loaderData.product.image },
          { name: "twitter:image", content: loaderData.product.image },
        ]
      : [],
  }),
  component: ProductPage,
  notFoundComponent: () => (
    <Layout>
      <div className="px-4 py-16 text-center">
        <p className="text-muted-foreground">Peça não encontrada.</p>
        <Link to="/" className="mt-4 inline-block text-primary">
          Voltar
        </Link>
      </div>
    </Layout>
  ),
});

function ProductPage() {
  const { product } = Route.useLoaderData();
  const { has, toggle } = useWishlist();
  const { t } = useI18n();
  const [size, setSize] = useState<string | null>(null);
  const [reserved, setReserved] = useState(false);
  const liked = has(product.id);
  const isArchive = product.category === "archive" && product.originalPrice;

  const related = PRODUCTS.filter((p) => p.id !== product.id && p.brand === product.brand).slice(
    0,
    4,
  );

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 pt-4 md:px-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft size={16} /> Voltar
        </Link>
      </div>

      <div className="mx-auto mt-4 grid max-w-7xl gap-8 px-4 md:grid-cols-2 md:px-8 md:py-6">
        <div className="overflow-hidden rounded-3xl bg-muted">
          <img
            src={product.image}
            alt={`${product.brand} ${product.name}`}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="md:py-8">
          <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
            {product.brand}
          </p>
          <h1 className="mt-2 font-display text-4xl italic text-foreground md:text-5xl">
            {product.name}
          </h1>

          <div className="mt-4 flex items-baseline gap-3">
            {isArchive ? (
              <>
                <span className="text-lg text-muted-foreground line-through">
                  €{product.originalPrice}
                </span>
                <span className="text-2xl font-medium text-primary">€{product.price}</span>
                <span className="rounded-full bg-primary-soft px-3 py-1 text-[10px] uppercase tracking-wider text-primary">
                  {t("archive_price")}
                </span>
              </>
            ) : (
              <span className="text-2xl text-foreground">€{product.price}</span>
            )}
          </div>

          {/* Sizes */}
          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm uppercase tracking-wider text-muted-foreground">
                {t("size")}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {product.sizes.map((s) => (
                <button
                  key={s}
                  onClick={() => setSize(s)}
                  className={`flex h-12 w-12 items-center justify-center rounded-full border text-sm transition ${
                    size === s
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-card text-foreground hover:border-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col gap-3">
            <button
              onClick={() => setReserved(true)}
              className="flex h-14 items-center justify-center rounded-full bg-primary text-sm uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90"
            >
              {reserved ? (
                <span className="inline-flex items-center gap-2">
                  <Check size={16} /> {t("reserve_confirm")}
                </span>
              ) : (
                t("reserve")
              )}
            </button>
            <div className="flex gap-3">
              <button className="flex h-14 flex-1 items-center justify-center rounded-full border border-foreground text-sm uppercase tracking-wider text-foreground transition hover:bg-foreground hover:text-background">
                {t("buy")}
              </button>
              <button
                onClick={() => toggle(product.id)}
                aria-label="Wishlist"
                className="flex h-14 w-14 items-center justify-center rounded-full border border-border hover:bg-muted"
              >
                <Heart
                  size={18}
                  strokeWidth={1.5}
                  className={liked ? "fill-primary text-primary" : "text-foreground"}
                />
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="mt-10 border-t border-border pt-6">
            <h2 className="text-sm uppercase tracking-wider text-muted-foreground">
              {t("description")}
            </h2>
            <p className="mt-3 leading-relaxed text-foreground">{product.description}</p>
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-16">
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            <h2 className="mb-5 font-display text-2xl italic text-foreground md:text-3xl">
              Mais de {product.brand}
            </h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4 md:gap-x-6">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </Layout>
  );
}
