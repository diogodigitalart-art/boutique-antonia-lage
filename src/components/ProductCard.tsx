import { Link, useNavigate } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useWishlist } from "@/lib/wishlist";
import type { Product } from "@/lib/data";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export function ProductCard({ product }: { product: Product; width?: string }) {
  const { has, toggle } = useWishlist();
  const { t } = useI18n();
  const { session } = useAuth();
  const navigate = useNavigate();
  const liked = has(product.id);
  const isArchive = product.category === "archive" && product.originalPrice;
  const hasDiscount = !!product.discountPercent && product.discountPercent > 0;
  const showStrikethrough = hasDiscount || isArchive;
  const lastPiece =
    !product.fullyReserved &&
    typeof product.availableUnits === "number" &&
    product.availableUnits === 1;

  return (
    <div className="group relative flex h-full w-full flex-col">
      <Link
        to="/produto/$id"
        params={{ id: product.id }}
        className="block overflow-hidden rounded-2xl bg-photo-bg ring-[0.5px] ring-black/5"
      >
        <div className="relative aspect-[4/5] w-full overflow-hidden">
          <img
            src={product.image}
            alt={`${product.brand} ${product.name}`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          {product.fullyReserved && (
            <span className="absolute left-3 top-3 rounded-full bg-amber-500/95 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-white shadow-sm">
              Reservado
            </span>
          )}
          {hasDiscount && !product.fullyReserved && (
            <span className="absolute left-3 top-3 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-white shadow-sm">
              −{product.discountPercent}%
            </span>
          )}
          {/* low-stock indicator moved below price for a more subtle treatment */}
        </div>
      </Link>
      <button
        onClick={async (e) => {
          e.preventDefault();
          if (!session) {
            toast.error("Inicia sessão para guardar peças na tua wishlist.");
            navigate({ to: "/login", search: { redirect: `/produto/${product.id}` } });
            return;
          }
          await toggle(product.id);
        }}
        aria-label="Wishlist"
        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-card/90 backdrop-blur transition hover:scale-110"
      >
        <Heart
          size={18}
          className={liked ? "fill-primary text-primary" : "text-foreground"}
          strokeWidth={1.5}
        />
      </button>
      <Link to="/produto/$id" params={{ id: product.id }} className="mt-4 block">
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-light uppercase tracking-[0.18em] text-muted-foreground">
            {product.brand}
          </p>
          {product.season && (
            <span className="rounded-full border border-border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
              {product.season}
            </span>
          )}
        </div>
        <h3 className="mt-1.5 font-display text-lg font-light italic leading-tight text-foreground md:text-xl">
          {product.name}
        </h3>
        {showStrikethrough ? (
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-sm font-light text-muted-foreground line-through">
              €{product.originalPrice}
            </span>
            <span className="text-sm font-light text-primary">€{product.price}</span>
            {isArchive && !hasDiscount && (
              <span className="ml-auto text-[10px] font-light uppercase tracking-[0.15em] text-primary">
                {t("archive_price")}
              </span>
            )}
          </div>
        ) : (
          <p className="mt-1.5 text-sm font-light text-foreground">€{product.price}</p>
        )}
        {lastPiece && (
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-light tracking-wide text-muted-foreground">
            <span className="h-1 w-1 rounded-full bg-muted-foreground/60" />
            Última peça
          </p>
        )}
      </Link>
    </div>
  );
}
