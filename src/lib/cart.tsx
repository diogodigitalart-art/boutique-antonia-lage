import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const STORAGE_KEY = "al_cart_v1";

export type CartItem = {
  product_id: string;        // legacy or uuid (display key)
  product_uuid: string | null;
  size: string;
  quantity: number;
};

type CartCtx = {
  items: CartItem[];
  count: number;
  loading: boolean;
  add: (item: CartItem) => Promise<void>;
  setQuantity: (product_id: string, size: string, quantity: number) => Promise<void>;
  remove: (product_id: string, size: string) => Promise<void>;
  clear: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<CartCtx>({
  items: [],
  count: 0,
  loading: true,
  add: async () => {},
  setQuantity: async () => {},
  remove: async () => {},
  clear: async () => {},
  refresh: async () => {},
});

function readLocal(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => x && typeof x.product_id === "string" && typeof x.size === "string");
  } catch {
    return [];
  }
}

function writeLocal(items: CartItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

function clamp(n: number) {
  return Math.max(1, Math.min(3, Math.floor(n)));
}

function mergeItems(a: CartItem[], b: CartItem[]): CartItem[] {
  const map = new Map<string, CartItem>();
  for (const it of [...a, ...b]) {
    const key = `${it.product_id}::${it.size}`;
    const existing = map.get(key);
    if (existing) {
      map.set(key, { ...existing, quantity: clamp(existing.quantity + it.quantity) });
    } else {
      map.set(key, { ...it, quantity: clamp(it.quantity) });
    }
  }
  return Array.from(map.values());
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const syncedFor = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems(readLocal());
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from("cart_items" as never)
      .select("product_id,product_uuid,size,quantity")
      .eq("user_id", user.id)
      .order("added_at", { ascending: true });
    if (!error && data) {
      setItems(
        (data as unknown as Array<CartItem>).map((d) => ({
          product_id: d.product_id,
          product_uuid: d.product_uuid,
          size: d.size,
          quantity: clamp(d.quantity),
        })),
      );
    }
    setLoading(false);
  }, [user]);

  // Load + sync local guest cart into user cart on login.
  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    (async () => {
      if (!user) {
        setItems(readLocal());
        setLoading(false);
        syncedFor.current = null;
        return;
      }
      // user logged in
      if (syncedFor.current !== user.id) {
        syncedFor.current = user.id;
        const local = readLocal();
        const { data } = await supabase
          .from("cart_items" as never)
          .select("product_id,product_uuid,size,quantity")
          .eq("user_id", user.id);
        if (cancelled) return;
        const remote = ((data as unknown as Array<CartItem>) ?? []).map((d) => ({
          product_id: d.product_id,
          product_uuid: d.product_uuid,
          size: d.size,
          quantity: clamp(d.quantity),
        }));
        const merged = mergeItems(remote, local);
        // Upsert merged back to remote (only if local had items needing sync)
        if (local.length > 0) {
          // delete remote rows we will overwrite, then re-insert merged
          await supabase.from("cart_items" as never).delete().eq("user_id", user.id);
          if (merged.length > 0) {
            await supabase
              .from("cart_items" as never)
              .insert(
                merged.map((m) => ({
                  user_id: user.id,
                  product_id: m.product_id,
                  product_uuid: m.product_uuid,
                  size: m.size,
                  quantity: m.quantity,
                })) as never,
              );
          }
          writeLocal([]);
        }
        if (!cancelled) {
          setItems(merged);
          setLoading(false);
        }
        return;
      }
      await refresh();
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, refresh]);

  const add = async (item: CartItem) => {
    const key = `${item.product_id}::${item.size}`;
    const existing = items.find((i) => `${i.product_id}::${i.size}` === key);
    const nextQty = clamp((existing?.quantity ?? 0) + (item.quantity || 1));
    if (!user) {
      const next = existing
        ? items.map((i) =>
            `${i.product_id}::${i.size}` === key ? { ...i, quantity: nextQty } : i,
          )
        : [...items, { ...item, quantity: clamp(item.quantity || 1) }];
      setItems(next);
      writeLocal(next);
      return;
    }
    if (existing) {
      await supabase
        .from("cart_items" as never)
        .update({ quantity: nextQty } as never)
        .eq("user_id", user.id)
        .eq("product_id", item.product_id)
        .eq("size", item.size);
    } else {
      await supabase.from("cart_items" as never).insert({
        user_id: user.id,
        product_id: item.product_id,
        product_uuid: item.product_uuid,
        size: item.size,
        quantity: clamp(item.quantity || 1),
      } as never);
    }
    await refresh();
  };

  const setQuantity = async (product_id: string, size: string, quantity: number) => {
    const q = clamp(quantity);
    if (!user) {
      const next = items.map((i) =>
        i.product_id === product_id && i.size === size ? { ...i, quantity: q } : i,
      );
      setItems(next);
      writeLocal(next);
      return;
    }
    await supabase
      .from("cart_items" as never)
      .update({ quantity: q } as never)
      .eq("user_id", user.id)
      .eq("product_id", product_id)
      .eq("size", size);
    await refresh();
  };

  const remove = async (product_id: string, size: string) => {
    if (!user) {
      const next = items.filter((i) => !(i.product_id === product_id && i.size === size));
      setItems(next);
      writeLocal(next);
      return;
    }
    await supabase
      .from("cart_items" as never)
      .delete()
      .eq("user_id", user.id)
      .eq("product_id", product_id)
      .eq("size", size);
    await refresh();
  };

  const clear = async () => {
    if (!user) {
      setItems([]);
      writeLocal([]);
      return;
    }
    await supabase.from("cart_items" as never).delete().eq("user_id", user.id);
    setItems([]);
  };

  const count = items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <Ctx.Provider value={{ items, count, loading, add, setQuantity, remove, clear, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export const useCart = () => useContext(Ctx);