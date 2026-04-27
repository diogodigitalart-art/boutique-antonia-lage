import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { WishlistNotifyToast } from "@/components/WishlistNotifyToast";

type WishlistCtx = {
  ids: string[];
  toggle: (id: string) => Promise<{ ok: boolean; requiresAuth?: boolean }>;
  has: (id: string) => boolean;
};

const Ctx = createContext<WishlistCtx>({
  ids: [],
  toggle: async () => ({ ok: false }),
  has: () => false,
});

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user, profile, loading, refreshProfile } = useAuth();
  const [ids, setIds] = useState<string[]>([]);
  const activeUserId = useRef<string | null>(null);
  const idsRef = useRef<string[]>([]);
  const promptShownForUser = useRef<string | null>(null);

  useEffect(() => {
    idsRef.current = ids;
  }, [ids]);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      activeUserId.current = null;
      idsRef.current = [];
      setIds([]);
      promptShownForUser.current = null;
      return;
    }

    const userId = user.id;
    activeUserId.current = userId;
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from("wishlists" as never)
        .select("product_id")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });

      if (cancelled || activeUserId.current !== userId) return;
      if (error) {
        idsRef.current = [];
        setIds([]);
        return;
      }

      const nextIds = (data ?? []).map((row) => (row as { product_id: string }).product_id);
      idsRef.current = nextIds;
      setIds(nextIds);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  const toggle = async (id: string) => {
    if (!user) return { ok: false, requiresAuth: true };

    const userId = user.id;
    const previousIds = idsRef.current;
    const adding = !previousIds.includes(id);
    const nextIds = adding ? [...previousIds, id] : previousIds.filter((value) => value !== id);

    idsRef.current = nextIds;
    setIds(nextIds);

    if (adding) {
      const { error } = await supabase
        .from("wishlists" as never)
        .insert({ user_id: userId, product_id: id } as never);

      if (error && error.code !== "23505") {
        idsRef.current = previousIds;
        setIds(previousIds);
        toast.error("Não conseguimos guardar a peça na tua wishlist.");
        return { ok: false };
      }

      // Checkpoint 6: when crossing to 3 saved items, prompt for notifications
      const alreadyPrefSet = Boolean(
        profile?.profile_details?.notification_preference,
      );
      if (
        previousIds.length === 2 &&
        nextIds.length === 3 &&
        !alreadyPrefSet &&
        promptShownForUser.current !== userId
      ) {
        promptShownForUser.current = userId;
        const currentDetails = (profile?.profile_details ?? {}) as Record<
          string,
          unknown
        >;
        toast.custom(
          (t) => (
            <WishlistNotifyToast
              toastId={t}
              userId={userId}
              currentDetails={currentDetails}
              onSaved={() => {
                void refreshProfile();
              }}
            />
          ),
          { duration: 30000, position: "bottom-center" },
        );
      }

      return { ok: true };
    }

    const { error } = await supabase
      .from("wishlists" as never)
      .delete()
      .eq("user_id", userId)
      .eq("product_id", id);

    if (error) {
      idsRef.current = previousIds;
      setIds(previousIds);
      toast.error("Não conseguimos atualizar a tua wishlist.");
      return { ok: false };
    }

    return { ok: true };
  };

  const has = (id: string) => ids.includes(id);

  return <Ctx.Provider value={{ ids, toggle, has }}>{children}</Ctx.Provider>;
}

export const useWishlist = () => useContext(Ctx);
