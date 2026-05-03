import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/lib/data";

export type ProductSize = { size: string; stock: number; reserved: number };

export type ProductRow = {
  id: string;
  name: string;
  brand: string;
  description: string;
  price: number;
  original_price: number | null;
  category: string;
  images: string[];
  reference: string;
  legacy_id: string | null;
  sizes: ProductSize[];
  is_active: boolean;
  season: string | null;
  discount_percent: number | null;
  created_at: string;
  updated_at: string;
  color: string | null;
  composition: string | null;
  care_instructions: string | null;
};

export function rowToProduct(row: ProductRow): Product {
  const sizesArr = Array.isArray(row.sizes) ? row.sizes : [];
  const availableSizes = sizesArr
    .filter((s) => Number(s.stock) - Number(s.reserved) > 0)
    .map((s) => s.size);
  const sizeAvailability = sizesArr.map((s) => ({
    size: s.size,
    available: Math.max(0, Number(s.stock) - Number(s.reserved)),
  }));
  const fullyReserved = sizesArr.length > 0 && availableSizes.length === 0;
  const availableUnits = sizesArr.reduce(
    (sum, s) => sum + Math.max(0, Number(s.stock) - Number(s.reserved)),
    0,
  );
  const basePrice = Number(row.price);
  const pct = row.discount_percent != null ? Number(row.discount_percent) : null;
  const hasDiscount = pct != null && pct > 0;
  const finalPrice = hasDiscount
    ? Math.round(basePrice * (1 - (pct as number) / 100) * 100) / 100
    : basePrice;
  const originalForDisplay = hasDiscount
    ? basePrice
    : row.original_price != null
      ? Number(row.original_price)
      : undefined;
  return {
    id: row.legacy_id || row.id,
    uuid: row.id,
    brand: row.brand,
    name: row.name,
    price: finalPrice,
    originalPrice: originalForDisplay,
    image: row.images?.[0] || "",
    images: row.images || [],
    sizes: sizesArr.map((s) => s.size),
    availableSizes,
    fullyReserved,
    availableUnits,
    reference: row.reference,
    description: row.description,
    category: row.category === "arquivo" ? "archive" : "new",
    season: row.season || undefined,
    discountPercent: hasDiscount ? (pct as number) : undefined,
    color: row.color || undefined,
    composition: row.composition || undefined,
    careInstructions: row.care_instructions || undefined,
    createdAt: row.created_at,
    sizeAvailability,
  };
}

type Ctx = {
  products: Product[];
  rows: ProductRow[];
  loading: boolean;
  refresh: () => Promise<void>;
  byId: (id: string) => Product | undefined;
};

const C = createContext<Ctx>({
  products: [],
  rows: [],
  loading: true,
  refresh: async () => {},
  byId: () => undefined,
});

export function ProductsProvider({ children }: { children: ReactNode }) {
  const [rows, setRows] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { data, error } = await supabase
      .from("products" as never)
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) {
      setRows(data as unknown as ProductRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Only show active products to general consumers
  const products = rows.filter((r) => r.is_active).map(rowToProduct);

  const byId = (id: string) => {
    const row = rows.find((r) => r.legacy_id === id || r.id === id);
    return row ? rowToProduct(row) : undefined;
  };

  return (
    <C.Provider value={{ products, rows, loading, refresh, byId }}>{children}</C.Provider>
  );
}

export const useProducts = () => useContext(C);
