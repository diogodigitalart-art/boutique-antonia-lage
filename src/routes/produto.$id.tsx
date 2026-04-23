import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { Heart, ChevronLeft } from "lucide-react";
import { Layout } from "@/components/Layout";
import { getProduct, PRODUCTS } from "@/lib/data";
import { useWishlist } from "@/lib/wishlist";
import { useI18n } from "@/lib/i18n";
import { ProductCard } from "@/components/ProductCard";
import { ReservationModal } from "@/components/ReservationModal";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

const ALL_SIZES = ["XS", "S", "M", "L", "XL"] as const;

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
  const router = useRouter();
  const { has, toggle } = useWishlist();
  const { t } = useI18n();
  const { session } = useAuth();
  const [size, setSize] = useState<string | null>(null);
  const [reserveOpen, setReserveOpen] = useState(false);
  const liked = has(product.id);
  const isArchive = product.category === "archive" && product.originalPrice;

  const requireAuth = (next: () => void) => {
    if (!session) {
      toast.error("Inicia sessão para continuar com a tua reserva.");
      router.navigate({ to: "/login", search: { redirect: `/produto/${product.id}` } });
      return;
    }
    next();
  };

  const related = PRODUCTS.filter((p) => p.id !== product.id && p.brand === product.brand).slice(
    0,
    4,
  );

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.history.back();
    } else {
      router.navigate({ to: "/" });
    }
  };

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 pt-4 md:px-8">
        <button
          onClick={handleBack}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ChevronLeft size={16} /> Voltar
        </button>
      </div>

      {/* 60/40 grid on desktop, stacked on mobile */}
      <div className="mx-auto mt-4 grid max-w-7xl gap-8 px-4 md:grid-cols-5 md:px-8 md:py-6">
        <div className="overflow-hidden rounded-3xl bg-muted md:col-span-3">
          <img
            src={product.image}
            alt={`${product.brand} ${product.name}`}
            className="h-full w-full object-cover"
          />
        </div>

        <div className="md:col-span-2 md:py-4">
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

          {/* Sizes — always show XS–XL, disable unavailable */}
          <div className="mt-8">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm uppercase tracking-wider text-muted-foreground">
                {t("size")}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {ALL_SIZES.map((s) => {
                const available = product.sizes.includes(s);
                const selected = size === s;
                return (
                  <button
                    key={s}
                    onClick={() => available && setSize(s)}
                    disabled={!available}
                    className={`flex h-11 w-11 items-center justify-center rounded-md border text-sm transition ${
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : available
                          ? "border-border bg-card text-foreground hover:border-primary"
                          : "cursor-not-allowed border-border bg-muted text-muted-foreground/50 line-through"
                    }`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <p className="mt-8 leading-relaxed text-muted-foreground">
            {product.description} Uma peça pensada para durar — tecidos nobres, acabamentos
            cuidados e um caimento que valoriza a silhueta. Ideal para compor um guarda-roupa
            elegante e intemporal.
          </p>

          {/* Actions — stacked full-width, Comprar primary first */}
          <div className="mt-8 flex flex-col gap-3">
            <button
              onClick={() => requireAuth(() => setReserveOpen(true))}
              className="flex h-14 w-full items-center justify-center rounded-full bg-primary text-sm uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90"
            >
              Comprar
            </button>
            <button
              onClick={() => requireAuth(() => setReserveOpen(true))}
              className="flex h-14 w-full items-center justify-center rounded-full border border-primary text-sm uppercase tracking-wider text-primary transition hover:bg-primary-soft"
            >
              Reservar para experimentar
            </button>
          </div>

          {/* Reassurance line */}
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Reserva gratuita · Peça guardada 48h · Sem compromisso
          </p>

          {/* Wishlist as subtle action */}
          <button
            onClick={() => requireAuth(() => {
              void toggle(product.id);
            })}
            aria-label="Wishlist"
            className="mt-6 inline-flex items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground transition hover:text-foreground"
          >
            <Heart
              size={15}
              strokeWidth={1.5}
              className={liked ? "fill-primary text-primary" : ""}
            />
            {liked ? "Na tua wishlist" : "Adicionar à wishlist"}
          </button>
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

      <ReservationModal
        open={reserveOpen}
        onClose={() => setReserveOpen(false)}
        title={`Reservar — ${product.name}`}
        contextLabel={product.brand}
        itemName={`${product.brand} — ${product.name}`}
        itemType="produto"
      />
    </Layout>
  );
}
