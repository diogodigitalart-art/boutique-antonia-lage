import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type WishlistCtx = {
  ids: string[];
  toggle: (id: string) => void;
  has: (id: string) => boolean;
};

const Ctx = createContext<WishlistCtx>({ ids: [], toggle: () => {}, has: () => false });

export function WishlistProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem("al-wishlist");
    if (raw) {
      try {
        setIds(JSON.parse(raw));
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("al-wishlist", JSON.stringify(ids));
    }
  }, [ids]);

  const toggle = (id: string) =>
    setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const has = (id: string) => ids.includes(id);

  return <Ctx.Provider value={{ ids, toggle, has }}>{children}</Ctx.Provider>;
}

export const useWishlist = () => useContext(Ctx);
