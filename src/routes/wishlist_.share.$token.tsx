import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Layout } from "@/components/Layout";
import { useProducts } from "@/lib/products";
import { useAuth } from "@/lib/auth";
import { getSharedWishlist } from "@/server/wishlistShare";
import { Heart, Loader2, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/wishlist/share/$token")({
  head: () => ({
    meta: [
      { title: "Lista de desejos partilhada | Boutique Antónia Lage" },
      { name: "description", content: "Peças seleccionadas na Boutique Antónia Lage." },
    ],
  }),
  component: SharedWishlistPage,
});

function SharedWishlistPage() {
  const { token } = Route.useParams();
  const fetchShared = useServerFn(getSharedWishlist);
  const { products, loading: productsLoading } = useProducts();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "invalid" }
    | { kind: "ok"; firstName: string; productIds: string[] }
  >({ kind: "loading" });

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchShared({ data: { shareToken: token } });
        if (!res.ok) {
          setState({ kind: "invalid" });
          return;
        }
        setState({ kind: "ok", firstName: res.firstName, productIds: res.productIds });
      } catch {
        setState({ kind: "invalid" });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  if (state.kind === "loading" || productsLoading) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (state.kind === "invalid") {
    return (
      <Layout>
        <section className="mx-auto max-w-2xl px-4 py-24 text-center md:px-8">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary-soft">
            <Heart size={24} strokeWidth={1.5} className="text-primary" />
          </div>
          <h1 className="mt-6 font-display text-3xl italic text-foreground md:text-4xl">
            Esta lista já não está disponível
          </h1>
          <p className="mt-3 text-muted-foreground">
            O link pode ter sido desactivado ou já não é válido.
          </p>
          <Link
            to="/"
            className="mt-8 inline-flex rounded-full bg-primary px-6 py-3 text-sm text-primary-foreground"
          >
            Explorar coleção
          </Link>
        </section>
      </Layout>
    );
  }

  const items = products.filter((p) => state.productIds.includes(p.id));

  const onAdd = (productId: string) => {
    if (!user) {
      navigate({ to: "/login", search: { redirect: `/produto/${productId}` } as never });
      return;
    }
    navigate({ to: "/produto/$id", params: { id: productId } });
  };

  return (
    <Layout>
      <section className="mx-auto max-w-7xl px-4 pt-8 md:px-8 md:pt-14">
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Wishlist partilhada
        </p>
        <h1 className="mt-2 font-display text-4xl italic text-foreground md:text-6xl">
          Lista de desejos de {state.firstName}
        </h1>
        <p className="mt-3 text-muted-foreground">
          Peças seleccionadas na Boutique Antónia Lage
        </p>
      </section>

      <section className="mx-auto mt-10 max-w-7xl px-4 pb-16 md:px-8">
        {items.length === 0 ? (
          <p className="rounded-2xl bg-muted/30 p-8 text-center text-sm text-muted-foreground">
            Esta lista está vazia.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
            {items.map((p) => (
              <div key={p.id} className="group flex h-full w-full flex-col">
                <Link
                  to="/produto/$id"
                  params={{ id: p.id }}
                  className="block overflow-hidden rounded-2xl bg-photo-bg ring-[0.5px] ring-black/5"
                >
                  <div className="relative aspect-[4/5] w-full overflow-hidden">
                    <img
                      src={p.image}
                      alt={p.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>
                </Link>
                <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {p.brand}
                </p>
                <p className="mt-1 truncate font-display text-base italic text-foreground">
                  {p.name}
                </p>
                <p className="mt-0.5 text-sm text-foreground">
                  €{p.price}
                  {p.originalPrice && (
                    <span className="ml-2 text-xs text-muted-foreground line-through">
                      €{p.originalPrice}
                    </span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={() => onAdd(p.id)}
                  className="mt-3 inline-flex items-center justify-center gap-2 rounded-full border border-foreground/15 px-4 py-2 text-[11px] uppercase tracking-[0.2em] text-foreground transition hover:bg-foreground hover:text-background"
                >
                  <ShoppingBag size={13} /> Adicionar ao carrinho
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}