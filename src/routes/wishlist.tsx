import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { useProducts } from "@/lib/products";
import { useWishlist } from "@/lib/wishlist";
import { useI18n } from "@/lib/i18n";
import { Heart, Share2, Loader2 } from "lucide-react";
import { AuthGuard } from "@/components/AuthGuard";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { ensureMyWishlistShare } from "@/server/wishlistShare";
import { toast } from "sonner";

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
  return (
    <AuthGuard>
      <WishlistContent />
    </AuthGuard>
  );
}

function WishlistContent() {
  const { ids } = useWishlist();
  const { products } = useProducts();
  const { t } = useI18n();
  const items = products.filter((p) => ids.includes(p.id));
  const ensureShare = useServerFn(ensureMyWishlistShare);
  const [sharing, setSharing] = useState(false);

  const onShare = async () => {
    if (sharing) return;
    setSharing(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) {
        toast.error("Sessão expirada. Inicia sessão novamente.");
        return;
      }
      const res = await ensureShare({ data: { token } });
      const url = `${window.location.origin}/wishlist/share/${res.token}`;
      try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copiado!");
      } catch {
        toast.message("Copia o link", { description: url });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao partilhar.");
    } finally {
      setSharing(false);
    }
  };

  return (
    <Layout>
      <section className="mx-auto max-w-7xl px-4 pt-8 md:px-8 md:pt-14">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-4xl italic text-foreground md:text-6xl">
              {t("tab_wishlist")}
            </h1>
            <p className="mt-3 text-muted-foreground">
              {items.length} {items.length === 1 ? "peça guardada" : "peças guardadas"}
            </p>
          </div>
          {items.length > 0 && (
            <button
              type="button"
              onClick={onShare}
              disabled={sharing}
              className="inline-flex items-center gap-2 rounded-full border border-foreground/15 px-5 py-2.5 text-[11px] uppercase tracking-[0.2em] text-foreground transition hover:bg-foreground hover:text-background disabled:opacity-50"
            >
              {sharing ? <Loader2 size={14} className="animate-spin" /> : <Share2 size={14} />}
              Partilhar wishlist
            </button>
          )}
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-7xl px-4 pb-10 md:px-8">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary-soft">
              <Heart size={28} strokeWidth={1.5} className="text-primary" />
            </div>
            <h2 className="mt-6 font-display text-2xl italic text-foreground md:text-3xl">
              A tua lista de desejos está vazia
            </h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">
              Guarda as peças que te fazem sonhar.
            </p>
            <Link
              to="/coleccao"
              className="mt-8 rounded-full bg-primary px-6 py-3 text-xs font-medium uppercase tracking-[0.15em] text-primary-foreground transition hover:bg-primary/90"
            >
              Explorar colecção
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
