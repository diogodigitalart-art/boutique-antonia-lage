import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Heart, ChevronLeft } from "lucide-react";
import { Layout } from "@/components/Layout";
import { useProducts } from "@/lib/products";
import type { Product } from "@/lib/data";
import { useWishlist } from "@/lib/wishlist";
import { useI18n } from "@/lib/i18n";
import { ProductCard } from "@/components/ProductCard";
import { ReservationModal } from "@/components/ReservationModal";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { useCart } from "@/lib/cart";
import { AddedToCartDrawer } from "@/components/AddedToCartDrawer";
import { ImageLightbox } from "@/components/ImageLightbox";

export const Route = createFileRoute("/produto/$id")({
  head: () => ({
    meta: [{ title: "Peça | Boutique Antónia Lage" }],
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
  const { id } = Route.useParams();
  const { byId, products, loading, refresh } = useProducts();
  const product: Product | undefined = byId(id);
  const router = useRouter();
  const { has, toggle } = useWishlist();
  const { t } = useI18n();
  const { session } = useAuth();
  const { add: addToCart } = useCart();
  const isOneSize =
    !!product && product.sizes.length === 1 && product.sizes[0] === "U";
  const [size, setSize] = useState<string | null>(isOneSize ? "U" : null);
  const [reserveOpen, setReserveOpen] = useState(false);
  const [addedOpen, setAddedOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [activeImage, setActiveImage] = useState(0);

  // Refresh products on mount so admin reservation changes are reflected.
  useEffect(() => {
    void refresh();
    setActiveImage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Auto-select "U" when product loads as one-size.
  useEffect(() => {
    if (isOneSize && size !== "U") setSize("U");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOneSize]);

  if (loading) {
    return (
      <Layout>
        <div className="px-4 py-20 text-center text-sm text-muted-foreground">A carregar…</div>
      </Layout>
    );
  }
  if (!product) {
    return (
      <Layout>
        <div className="px-4 py-16 text-center">
          <p className="text-muted-foreground">Peça não encontrada.</p>
          <Link to="/" className="mt-4 inline-block text-primary">
            Voltar
          </Link>
        </div>
      </Layout>
    );
  }
  const liked = has(product.id);
  const isArchive = product.category === "archive" && product.originalPrice;
  const hasDiscount = !!product.discountPercent && product.discountPercent > 0;
  const showStrikethrough = hasDiscount || isArchive;
  const availableSet = new Set(product.availableSizes ?? product.sizes);
  const galleryImages =
    product.images && product.images.length > 0 ? product.images : [product.image];
  const currentImage = galleryImages[activeImage] ?? galleryImages[0];

  const requireAuth = (next: () => void) => {
    if (!session) {
      toast.error("Inicia sessão para continuar com a tua reserva.");
      router.navigate({ to: "/login", search: { redirect: `/produto/${product.id}` } });
      return;
    }
    next();
  };

  const handleBuy = async () => {
    if (!size) {
      toast.error("Por favor selecciona um tamanho.");
      return;
    }
    await addToCart({
      product_id: product.id,
      product_uuid: product.uuid ?? null,
      size,
      quantity: 1,
    });
    setAddedOpen(true);
  };

  const related = products.filter((p) => p.id !== product.id && p.brand === product.brand).slice(
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

      <div className="mx-auto mt-4 grid max-w-7xl gap-8 px-4 md:grid-cols-5 md:px-8 md:py-6">
        <div className="md:col-span-3">
          <button
            type="button"
            onClick={() => setLightboxOpen(true)}
            className="block w-full overflow-hidden rounded-3xl bg-photo-bg ring-[0.5px] ring-black/5 cursor-zoom-in"
            aria-label="Ampliar fotografia"
          >
            <img
              src={currentImage}
              alt={`${product.brand} ${product.name}`}
              className="h-full w-full object-cover"
            />
          </button>
          {galleryImages.length > 1 && (
            <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
              {galleryImages.map((img, i) => {
                const selected = i === activeImage;
                return (
                  <button
                    key={`${img}-${i}`}
                    type="button"
                    onClick={() => setActiveImage(i)}
                    aria-label={`Imagem ${i + 1}`}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-md bg-photo-bg transition md:h-20 md:w-20 ${
                      selected
                        ? "ring-2 ring-primary"
                        : "ring-1 ring-border hover:ring-foreground/30"
                    }`}
                  >
                    <img
                      src={img}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="md:col-span-2 md:py-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">
              {product.brand}
            </p>
            {product.season && (
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {product.season}
              </span>
            )}
          </div>
          <h1 className="mt-2 font-display text-4xl italic text-foreground md:text-5xl">
            {product.name}
          </h1>

          <div className="mt-4 flex items-baseline gap-3">
            {showStrikethrough ? (
              <>
                <span className="text-lg text-muted-foreground line-through">
                  €{product.originalPrice}
                </span>
                <span className="text-2xl font-medium text-primary">€{product.price}</span>
                {hasDiscount ? (
                  <span className="rounded-full bg-red-600 px-3 py-1 text-[10px] uppercase tracking-wider text-white">
                    −{product.discountPercent}%
                  </span>
                ) : (
                  <span className="rounded-full bg-primary-soft px-3 py-1 text-[10px] uppercase tracking-wider text-primary">
                    {t("archive_price")}
                  </span>
                )}
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
            {isOneSize ? (
              <p className="text-sm text-foreground">Tamanho único</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((s) => {
                  const available = availableSet.has(s);
                  const selected = size === s;
                  return (
                    <button
                      key={s}
                      onClick={() => available && setSize(s)}
                      disabled={!available}
                      className={`flex h-11 min-w-11 items-center justify-center rounded-md border px-3 text-sm transition ${
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
            )}
            {product.fullyReserved && (
              <p className="mt-3 text-xs uppercase tracking-wider text-destructive">
                Esgotado — todas as peças estão reservadas.
              </p>
            )}
          </div>

          {/* Description */}
          {product.description && (
            <p className="mt-8 whitespace-pre-line leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          )}

          {/* Actions — stacked full-width, Comprar primary first */}
          <div className="mt-8 flex flex-col gap-3">
            <button
              onClick={() => void handleBuy()}
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
        productUuid={product.uuid}
        size={size}
      />
      <AddedToCartDrawer
        open={addedOpen}
        onClose={() => setAddedOpen(false)}
        productId={product.id}
        size={size}
      />
      <ImageLightbox
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        images={galleryImages}
        alt={`${product.brand} ${product.name}`}
      />
    </Layout>
  );
}
