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
  created_at: string;
  updated_at: string;
};

export function rowToProduct(row: ProductRow): Product {
  const sizesArr = Array.isArray(row.sizes) ? row.sizes : [];
  const availableSizes = sizesArr
    .filter((s) => Number(s.stock) - Number(s.reserved) > 0)
    .map((s) => s.size);
  const fullyReserved = sizesArr.length > 0 && availableSizes.length === 0;
  return {
    id: row.legacy_id || row.id,
    uuid: row.id,
    brand: row.brand,
    name: row.name,
    price: Number(row.price),
    originalPrice: row.original_price != null ? Number(row.original_price) : undefined,
    image: row.images?.[0] || "",
    images: row.images || [],
    sizes: sizesArr.map((s) => s.size),
    availableSizes,
    fullyReserved,
    reference: row.reference,
    description: row.description,
    category: row.category === "arquivo" ? "archive" : "new",
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
