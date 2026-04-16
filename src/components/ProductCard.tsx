import { Link } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useWishlist } from "@/lib/wishlist";
import type { Product } from "@/lib/data";
import { useI18n } from "@/lib/i18n";

export function ProductCard({ product, width }: { product: Product; width?: string }) {
  const { has, toggle } = useWishlist();
  const { t } = useI18n();
  const liked = has(product.id);
  const isArchive = product.category === "archive" && product.originalPrice;

  return (
    <div className={`group relative ${width ?? ""}`}>
      <Link
        to="/produto/$id"
        params={{ id: product.id }}
        className="block overflow-hidden rounded-2xl bg-muted"
      >
        <div className="relative aspect-[4/5] overflow-hidden">
          <img
            src={product.image}
            alt={`${product.brand} ${product.name}`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        </div>
      </Link>
      <button
        onClick={(e) => {
          e.preventDefault();
          toggle(product.id);
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
      <Link to="/produto/$id" params={{ id: product.id }} className="mt-3 block">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">{product.brand}</p>
        <h3 className="mt-0.5 font-display text-lg italic leading-tight text-foreground">
          {product.name}
        </h3>
        {isArchive ? (
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-sm text-muted-foreground line-through">
              €{product.originalPrice}
            </span>
            <span className="text-sm font-medium text-primary">€{product.price}</span>
            <span className="ml-auto text-[10px] uppercase tracking-wider text-primary">
              {t("archive_price")}
            </span>
          </div>
        ) : (
          <p className="mt-1 text-sm text-foreground">€{product.price}</p>
        )}
      </Link>
    </div>
  );
}
