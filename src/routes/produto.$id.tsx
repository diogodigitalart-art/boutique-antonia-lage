import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Heart, ChevronLeft, Ruler, Link as LinkIcon, Copy, Check } from "lucide-react";
import { Layout } from "@/components/Layout";
import { useProducts } from "@/lib/products";
import type { Product } from "@/lib/data";
import { useWishlist } from "@/lib/wishlist";
import { useI18n } from "@/lib/i18n";
import { displaySize } from "@/lib/utils";
import { ProductCard } from "@/components/ProductCard";
import { ReservationModal } from "@/components/ReservationModal";
import { WaitlistModal } from "@/components/WaitlistModal";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { useCart } from "@/lib/cart";
import { AddedToCartDrawer } from "@/components/AddedToCartDrawer";
import { ImageLightbox } from "@/components/ImageLightbox";
import { SizeGuideModal } from "@/components/SizeGuideModal";
import { WhatsAppLink } from "@/components/WhatsAppButton";
import { RecentlyViewed } from "@/components/RecentlyViewed";
import { pushRecentlyViewed } from "@/lib/recentlyViewed";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { getPublicProductById } from "@/lib/products.functions";

export const Route = createFileRoute("/produto/$id")({
  loader: async ({ params }) => {
    try {
      const res = await getPublicProductById({ data: { id: params.id } });
      return { product: res.row };
    } catch {
      return { product: null };
    }
  },
  head: ({ loaderData, params }) => {
    const p = loaderData?.product as
      | {
          name: string;
          brand: string;
          description: string | null;
          price: number;
          images: string[] | null;
          is_active: boolean;
          is_manually_reserved: boolean | null;
          sizes: Array<{ stock: number; reserved: number }> | null;
          discount_percent: number | null;
          legacy_id: string | null;
          id: string;
        }
      | null
      | undefined;
    if (!p) {
      return { meta: [{ title: "Peça | Boutique Antónia Lage" }] };
    }
    const title = `${p.name} — ${p.brand} | Boutique Antónia Lage`;
    const desc = (p.description || `${p.name} de ${p.brand} disponível na Boutique Antónia Lage.`)
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 158);
    const image = Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : undefined;
    const url = `https://boutique-antonia-lage.lovable.app/produto/${params.id}`;
    const totalAvail = Array.isArray(p.sizes)
      ? p.sizes.reduce(
          (s, x) => s + Math.max(0, Number(x.stock || 0) - Number(x.reserved || 0)),
          0,
        )
      : 0;
    const inStock = p.is_active && !p.is_manually_reserved && totalAvail > 0;
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: desc },
      { property: "og:title", content: title },
      { property: "og:description", content: desc },
      { property: "og:type", content: "product" },
      { property: "og:url", content: url },
    ];
    if (image) {
      meta.push({ property: "og:image", content: image });
      meta.push({ name: "twitter:image", content: image });
    }
    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: p.name,
      description: p.description || undefined,
      image: image ? [image] : undefined,
      brand: { "@type": "Brand", name: p.brand },
      offers: {
        "@type": "Offer",
        url,
        priceCurrency: "EUR",
        price: Number(p.price).toFixed(2),
        availability: inStock
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      },
    };
    return {
      meta,
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify(jsonLd),
        },
      ],
    };
  },
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
  const [waitlistSize, setWaitlistSize] = useState<string | null>(null);
  const [addedOpen, setAddedOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [sizeGuideOpen, setSizeGuideOpen] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [copied, setCopied] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchDeltaX = useRef<number>(0);

  // Refresh products on mount so admin reservation changes are reflected.
  useEffect(() => {
    void refresh();
    setActiveImage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Track recently viewed
  useEffect(() => {
    if (product?.id) pushRecentlyViewed(product.id);
  }, [product?.id]);

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
  const lastPiece =
    !product.fullyReserved &&
    typeof product.availableUnits === "number" &&
    product.availableUnits === 1;
  const galleryImages =
    product.images && product.images.length > 0 ? product.images : [product.image];
  const currentImage = galleryImages[activeImage] ?? galleryImages[0];

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current == null) return;
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  };
  const onTouchEnd = () => {
    const dx = touchDeltaX.current;
    touchStartX.current = null;
    touchDeltaX.current = 0;
    if (Math.abs(dx) < 50 || galleryImages.length <= 1) return;
    setActiveImage((i) =>
      dx < 0
        ? (i + 1) % galleryImages.length
        : (i - 1 + galleryImages.length) % galleryImages.length,
    );
  };

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
  const relatedIds = new Set(related.map((p) => p.id));
  const youMayLike = (() => {
    const pool = products.filter(
      (p) =>
        p.id !== product.id &&
        !relatedIds.has(p.id) &&
        p.category === product.category,
    );
    // shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 4);
  })();
  const hasDetails = !!(product.composition || product.color || product.careInstructions);

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
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
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
            <div className="no-scrollbar -mx-1 mt-3 flex gap-2 overflow-x-auto px-1 py-1">
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
              <div className="flex flex-wrap items-center gap-2">
                {product.sizes.map((s) => {
                  const available = availableSet.has(s);
                  const selected = size === s;
                  return (
                    <button
                      key={s}
                      onClick={() => {
                        if (available) setSize(s);
                        else setWaitlistSize(s);
                      }}
                      title={!available ? "Esgotado — avisar-me" : undefined}
                      className={`inline-flex h-10 min-w-12 items-center justify-center rounded-full border px-4 text-[13px] tracking-wide transition ${
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : available
                            ? "border-border bg-transparent text-foreground hover:border-primary"
                            : "cursor-not-allowed border-border/60 bg-muted/40 text-muted-foreground/50 line-through"
                      }`}
                    >
                      {displaySize(s)}
                    </button>
                  );
                })}
              </div>
            )}
            <button
              type="button"
              onClick={() => setSizeGuideOpen(true)}
              className="mt-3 inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline"
            >
              <Ruler size={14} />
              Guia de tamanhos
            </button>
            {product.fullyReserved && (
              <p className="mt-3 text-xs uppercase tracking-wider text-destructive">
                Esgotado — todas as peças estão reservadas.
              </p>
            )}
            {lastPiece && (
              <p className="mt-4 font-display text-sm italic text-muted-foreground">
                Última peça disponível
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
            <WhatsAppLink
              message={`Olá! Tenho interesse em: ${product.name} (${product.brand}). Podem ajudar-me?`}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full border border-border text-xs uppercase tracking-wider text-foreground transition hover:bg-muted"
            >
              <span style={{ color: "#25D366" }}>●</span> Perguntar no WhatsApp
            </WhatsAppLink>
          </div>

          {/* Reassurance line */}
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Reserva gratuita · Peça guardada 48h · Sem compromisso
          </p>

          {hasDetails && (
            <Accordion type="single" collapsible className="mt-6 border-t border-border">
              <AccordionItem value="details" className="border-b-0">
                <AccordionTrigger className="text-xs uppercase tracking-[0.2em] text-foreground">
                  Detalhes do produto
                </AccordionTrigger>
                <AccordionContent>
                  <dl className="space-y-3 text-sm text-muted-foreground">
                    {product.composition && (
                      <div>
                        <dt className="text-[10px] uppercase tracking-[0.2em] text-foreground">
                          Composição
                        </dt>
                        <dd className="mt-1 whitespace-pre-line">{product.composition}</dd>
                      </div>
                    )}
                    {product.color && (
                      <div>
                        <dt className="text-[10px] uppercase tracking-[0.2em] text-foreground">
                          Cor
                        </dt>
                        <dd className="mt-1">{product.color}</dd>
                      </div>
                    )}
                    {product.careInstructions && (
                      <div>
                        <dt className="text-[10px] uppercase tracking-[0.2em] text-foreground">
                          Cuidados
                        </dt>
                        <dd className="mt-1 whitespace-pre-line">{product.careInstructions}</dd>
                      </div>
                    )}
                  </dl>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

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

          {/* Share */}
          <div className="mt-6">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">
              Partilhar
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => {
                  const text = "Encontrei esta peça na Boutique Antónia Lage: " + product.name + " - " + (typeof window !== "undefined" ? window.location.href : "");
                  window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank", "noopener,noreferrer");
                }}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-[#25D366] px-4 text-xs font-medium text-white transition hover:opacity-90"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.521.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.521-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.79.372-.27.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.134 1.585 5.94L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
                WhatsApp
              </button>
              <button
                onClick={() => {
                  const url = typeof window !== "undefined" ? window.location.href : "";
                  navigator.clipboard.writeText(url).then(() => {
                    setCopied(true);
                    toast.success("Link copiado!");
                    setTimeout(() => setCopied(false), 2000);
                  });
                }}
                className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-xs font-medium text-foreground transition hover:bg-muted"
              >
                {copied ? (
                  <Check size={14} className="text-success" />
                ) : (
                  <Copy size={14} />
                )}
                {copied ? "Link copiado!" : "Copiar link"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <RecentlyViewed excludeId={product.id} />

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

      {youMayLike.length > 0 && (
        <section className="mt-16">
          <div className="mx-auto max-w-7xl px-4 md:px-8">
            <h2 className="mb-5 font-display text-2xl italic text-foreground md:text-3xl">
              Pode também gostar
            </h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4 md:gap-x-6">
              {youMayLike.map((p) => (
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
      <WaitlistModal
        open={!!waitlistSize}
        onClose={() => setWaitlistSize(null)}
        productUuid={product.uuid}
        productName={`${product.brand} — ${product.name}`}
        size={waitlistSize ?? ""}
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
      <SizeGuideModal
        open={sizeGuideOpen}
        onClose={() => setSizeGuideOpen(false)}
        brand={product.brand}
        isOneSize={isOneSize}
      />
    </Layout>
  );
}
