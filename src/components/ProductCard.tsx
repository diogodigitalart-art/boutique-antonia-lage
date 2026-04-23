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

  return (
    <div className="group relative flex h-full w-full flex-col">
      <Link
        to="/produto/$id"
        params={{ id: product.id }}
        className="block overflow-hidden rounded-2xl bg-muted"
      >
        <div className="relative aspect-[4/5] w-full overflow-hidden">
          <img
            src={product.image}
            alt={`${product.brand} ${product.name}`}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
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
        <p className="text-[10px] font-light uppercase tracking-[0.18em] text-muted-foreground">
          {product.brand}
        </p>
        <h3 className="mt-1.5 font-display text-lg font-light italic leading-tight text-foreground md:text-xl">
          {product.name}
        </h3>
        {isArchive ? (
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-sm font-light text-muted-foreground line-through">
              €{product.originalPrice}
            </span>
            <span className="text-sm font-light text-primary">€{product.price}</span>
            <span className="ml-auto text-[10px] font-light uppercase tracking-[0.15em] text-primary">
              {t("archive_price")}
            </span>
          </div>
        ) : (
          <p className="mt-1.5 text-sm font-light text-foreground">€{product.price}</p>
        )}
      </Link>
    </div>
  );
}
