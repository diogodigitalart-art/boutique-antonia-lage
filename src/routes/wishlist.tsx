import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { PRODUCTS } from "@/lib/data";
import { useWishlist } from "@/lib/wishlist";
import { useI18n } from "@/lib/i18n";
import { Heart } from "lucide-react";

export const Route = createFileRoute("/wishlist")({
  head: () => ({
    meta: [
      { title: "Wishlist | Boutique Antónia Lage" },
      { name: "description", content: "As tuas peças favoritas guardadas." },
    ],
  }),
  component: WishlistPage,
});

function WishlistPage() {
  const { ids } = useWishlist();
  const { t } = useI18n();
  const items = PRODUCTS.filter((p) => ids.includes(p.id));

  return (
    <Layout>
      <section className="mx-auto max-w-7xl px-4 pt-8 md:px-8 md:pt-14">
        <h1 className="font-display text-4xl italic text-foreground md:text-6xl">
          {t("tab_wishlist")}
        </h1>
        <p className="mt-3 text-muted-foreground">
          {items.length} {items.length === 1 ? "peça guardada" : "peças guardadas"}
        </p>
      </section>

      <section className="mx-auto mt-10 max-w-7xl px-4 pb-10 md:px-8">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft">
              <Heart size={24} strokeWidth={1.5} className="text-primary" />
            </div>
            <p className="mt-4 text-muted-foreground">{t("empty_wishlist")}</p>
            <Link
              to="/"
              className="mt-6 rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground"
            >
              Explorar coleção
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
            {items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}
