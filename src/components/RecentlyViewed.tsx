import { useEffect, useState } from "react";
import { useProducts } from "@/lib/products";
import { ProductCard } from "./ProductCard";
import { getRecentlyViewed } from "@/lib/recentlyViewed";

export function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  const { products, loading } = useProducts();
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setIds(getRecentlyViewed());
  }, [excludeId]);

  if (loading) return null;

  // `products` from context is already filtered to active + in-stock (or manually reserved).
  const visibleById = new Map(products.map((p) => [p.id, p]));
  const items = ids
    .filter((id) => id !== excludeId)
    .map((id) => visibleById.get(id))
    .filter((p): p is NonNullable<typeof p> => !!p);

  if (items.length < 2) return null;

  return (
    <section className="mt-16">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <h2 className="mb-5 font-display text-2xl italic text-foreground md:text-3xl">
          Visto recentemente
        </h2>
        <div className="no-scrollbar -mx-4 flex gap-4 overflow-x-auto px-4 md:mx-0 md:px-0 md:gap-6">
          {items.map((p) => (
            <div key={p.id} className="w-44 shrink-0 md:w-56">
              <ProductCard product={p} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}