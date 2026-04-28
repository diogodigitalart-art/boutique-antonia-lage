import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { useCart } from "@/lib/cart";
import { useProducts } from "@/lib/products";
import { Trash2, Minus, Plus, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/carrinho")({
  head: () => ({ meta: [{ title: "Carrinho | Boutique Antónia Lage" }] }),
  component: CartPage,
});

function CartPage() {
  const { items, loading, setQuantity, remove } = useCart();
  const { byId } = useProducts();
  const router = useRouter();

  const enriched = items.map((it) => {
    const p = byId(it.product_id);
    const unitPrice = p?.price ?? 0;
    return { ...it, product: p, unitPrice, lineTotal: unitPrice * it.quantity };
  });

  const total = enriched.reduce((s, e) => s + e.lineTotal, 0);

  return (
    <Layout>
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
        <header className="mb-8">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Carrinho</p>
          <h1 className="mt-1 font-display text-4xl italic text-foreground md:text-5xl">A tua sacola</h1>
        </header>

        {loading ? (
          <p className="text-sm text-muted-foreground">A carregar…</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <ShoppingBag className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-4 font-display text-xl italic">A tua sacola está vazia</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Descobre as nossas peças e adiciona algo especial.
            </p>
            <Link
              to="/"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
            >
              Ver colecção
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-3">
            <ul className="md:col-span-2 space-y-4">
              {enriched.map((it) => (
                <li
                  key={`${it.product_id}-${it.size}`}
                  className="flex gap-4 rounded-2xl border border-border bg-card p-4"
                >
                  <div className="h-24 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {it.product?.image && (
                      <img
                        src={it.product.image}
                        alt={it.product?.name ?? ""}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                          {it.product?.brand ?? "—"}
                        </p>
                        <p className="font-display text-lg italic text-foreground">
                          {it.product?.name ?? "Peça"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">Tamanho: {it.size}</p>
                      </div>
                      <button
                        onClick={() => void remove(it.product_id, it.size)}
                        aria-label="Remover"
                        className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="mt-auto flex items-end justify-between pt-3">
                      <div className="inline-flex items-center rounded-full border border-border">
                        <button
                          onClick={() => void setQuantity(it.product_id, it.size, it.quantity - 1)}
                          disabled={it.quantity <= 1}
                          className="flex h-8 w-8 items-center justify-center rounded-l-full hover:bg-muted disabled:opacity-40"
                          aria-label="Diminuir"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="w-8 text-center text-sm">{it.quantity}</span>
                        <button
                          onClick={() => void setQuantity(it.product_id, it.size, it.quantity + 1)}
                          disabled={it.quantity >= 3}
                          className="flex h-8 w-8 items-center justify-center rounded-r-full hover:bg-muted disabled:opacity-40"
                          aria-label="Aumentar"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <p className="text-base font-medium text-foreground">€{it.lineTotal.toFixed(2)}</p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <aside className="md:col-span-1">
              <div className="sticky top-24 rounded-2xl border border-border bg-card p-6">
                <h2 className="font-display text-xl italic text-foreground">Resumo</h2>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <dt>Subtotal</dt>
                    <dd>€{total.toFixed(2)}</dd>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <dt>Envio</dt>
                    <dd>Calculado no checkout</dd>
                  </div>
                </dl>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                  <span className="text-sm uppercase tracking-wider text-muted-foreground">Total</span>
                  <span className="font-display text-2xl italic text-foreground">€{total.toFixed(2)}</span>
                </div>
                <button
                  onClick={() => router.navigate({ to: "/checkout" })}
                  className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-primary text-sm uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
                >
                  Finalizar compra
                </button>
                <Link
                  to="/"
                  className="mt-3 block text-center text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  Continuar a comprar
                </Link>
              </div>
            </aside>
          </div>
        )}
      </div>
    </Layout>
  );
}