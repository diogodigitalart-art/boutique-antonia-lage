import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

type WishlistCtx = {
  ids: string[];
  toggle: (id: string) => void;
  has: (id: string) => boolean;
};

const Ctx = createContext<WishlistCtx>({ ids: [], toggle: () => {}, has: () => false });

const GUEST_KEY = "al-wishlist-guest";

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [ids, setIds] = useState<string[]>([]);
  const hydratedForUser = useRef<string | null>(null);

  // Load wishlist whenever auth state changes.
  useEffect(() => {
    if (loading) return;
    if (typeof window === "undefined") return;

    if (!user) {
      // Guest: load from a guest-only localStorage key.
      hydratedForUser.current = "guest";
      try {
        const raw = localStorage.getItem(GUEST_KEY);
        setIds(raw ? JSON.parse(raw) : []);
      } catch {
        setIds([]);
      }
      return;
    }

    // Authenticated: load from Supabase, then merge any guest items.
    const userId = user.id;
    hydratedForUser.current = userId;
    (async () => {
      const { data } = await supabase
        .from("wishlist_items")
        .select("product_id")
        .eq("user_id", userId);
      const remoteIds = (data ?? []).map((r) => r.product_id as string);

      // Merge guest wishlist (if any) into the user's account, then clear it.
      let guestIds: string[] = [];
      try {
        const raw = localStorage.getItem(GUEST_KEY);
        if (raw) guestIds = JSON.parse(raw);
      } catch {}
      const toAdd = guestIds.filter((id) => !remoteIds.includes(id));
      if (toAdd.length > 0) {
        await supabase
          .from("wishlist_items")
          .insert(toAdd.map((product_id) => ({ user_id: userId, product_id })));
        localStorage.removeItem(GUEST_KEY);
      }
      // Also clear any legacy shared key from older versions.
      localStorage.removeItem("al-wishlist");
      setIds(Array.from(new Set([...remoteIds, ...toAdd])));
    })();
  }, [user, loading]);

  const toggle = (id: string) => {
    setIds((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      const adding = !prev.includes(id);
      if (user) {
        const userId = user.id;
        if (adding) {
          void supabase.from("wishlist_items").insert({ user_id: userId, product_id: id });
        } else {
          void supabase
            .from("wishlist_items")
            .delete()
            .eq("user_id", userId)
            .eq("product_id", id);
        }
      } else if (typeof window !== "undefined") {
        localStorage.setItem(GUEST_KEY, JSON.stringify(next));
      }
      return next;
    });
  };

  const has = (id: string) => ids.includes(id);

  return <Ctx.Provider value={{ ids, toggle, has }}>{children}</Ctx.Provider>;
}

export const useWishlist = () => useContext(Ctx);
