import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Layout } from "@/components/Layout";
import { useCart } from "@/lib/cart";
import { useProducts } from "@/lib/products";
import { Trash2, Minus, Plus, ShoppingBag, AlertTriangle } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export const Route = createFileRoute("/carrinho")({
  head: () => ({ meta: [{ title: "Carrinho | Boutique Antónia Lage" }] }),
  component: CartPage,
});

function CartPage() {
  const { items, loading, setQuantity, remove } = useCart();
  const { byId } = useProducts();
  const router = useRouter();
  const { t } = useI18n();

  const enriched = items.map((it) => {
    const p = byId(it.product_id);
    const unitPrice = p?.price ?? 0;
    const sizeAv = p?.sizeAvailability?.find((s) => s.size === it.size);
    const available = sizeAv ? sizeAv.available : p ? 0 : it.quantity;
    const outOfStock = !!p && it.quantity > available;
    return { ...it, product: p, unitPrice, lineTotal: unitPrice * it.quantity, available, outOfStock };
  });

  const total = enriched.reduce((s, e) => s + e.lineTotal, 0);
  const hasOutOfStock = enriched.some((e) => e.outOfStock);

  return (
    <Layout>
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
        <header className="mb-8">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{t("cart_eyebrow")}</p>
          <h1 className="mt-1 font-display text-4xl italic text-foreground md:text-5xl">{t("cart_title")}</h1>
        </header>

        {loading ? (
          <p className="text-sm text-muted-foreground">{t("cart_loading")}</p>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <ShoppingBag className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="mt-4 font-display text-xl italic">{t("cart_empty")}</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {t("cart_empty_sub")}
            </p>
            <Link
              to="/"
              className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
            >
              {t("cart_view_collection")}
            </Link>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-3">
            <ul className="md:col-span-2 space-y-4">
              {hasOutOfStock && (
                <li className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-900">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium">
                      {t("cart_out_of_stock")}
                    </p>
                    <p className="mt-1 text-xs text-rose-800/80">
                      {t("cart_out_of_stock_sub")}
                    </p>
                  </div>
                </li>
              )}
              {enriched.map((it) => (
                <li
                  key={`${it.product_id}-${it.size}`}
                  className={`flex gap-4 rounded-2xl border p-4 ${it.outOfStock ? "border-rose-300 bg-rose-50/40" : "border-border bg-card"}`}
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
                        <p className="mt-1 text-xs text-muted-foreground">{t("size")}: {it.size}</p>
                        {it.outOfStock && (
                          <p className="mt-1 text-xs font-medium text-rose-700">
                            {it.available > 0
                              ? t("cart_only_available").replace("{n}", String(it.available))
                              : t("cart_no_stock")}
                          </p>
                        )}
                      </div>
                      {it.outOfStock ? (
                        <button
                          onClick={() => void remove(it.product_id, it.size)}
                          className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-3 py-1.5 text-xs uppercase tracking-wider text-white hover:bg-rose-700"
                        >
                          <Trash2 size={12} /> {t("cart_remove")}
                        </button>
                      ) : (
                        <button
                          onClick={() => void remove(it.product_id, it.size)}
                          aria-label={t("cart_remove")}
                          className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
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
                <h2 className="font-display text-xl italic text-foreground">{t("cart_summary")}</h2>
                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <dt>{t("cart_subtotal")}</dt>
                    <dd>€{total.toFixed(2)}</dd>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <dt>{t("cart_shipping")}</dt>
                    <dd>{t("cart_shipping_calc")}</dd>
                  </div>
                </dl>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                  <span className="text-sm uppercase tracking-wider text-muted-foreground">{t("cart_total")}</span>
                  <span className="font-display text-2xl italic text-foreground">€{total.toFixed(2)}</span>
                </div>
                <button
                  onClick={() => router.navigate({ to: "/checkout" })}
                  disabled={hasOutOfStock}
                  className="mt-6 flex h-12 w-full items-center justify-center rounded-full bg-primary text-sm uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("cart_checkout")}
                </button>
                <Link
                  to="/"
                  className="mt-3 block text-center text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
                >
                  {t("cart_continue")}
                </Link>
              </div>
            </aside>
          </div>
        )}
      </div>
    </Layout>
  );
}