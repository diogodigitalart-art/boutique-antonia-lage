import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useProducts } from "@/lib/products";
import { Check, Loader2 } from "lucide-react";

export const Route = createFileRoute("/encomenda-confirmada/$orderId")({
  head: () => ({ meta: [{ title: "Encomenda confirmada | Boutique Antónia Lage" }] }),
  component: ConfirmedPage,
});

type OrderItem = {
  product_id?: string;
  brand?: string | null;
  name?: string | null;
  size?: string;
  quantity?: number;
  unit_price?: number;
  line_total?: number;
};
type ShipAddr = {
  full_name?: string;
  address1?: string;
  address2?: string;
  city?: string;
  postal_code?: string;
  country?: string;
  phone?: string;
};
type Order = {
  id: string;
  created_at: string;
  total: number;
  subtotal: number;
  shipping_cost: number;
  status: string;
  items: OrderItem[];
  shipping_address: ShipAddr;
};

function ConfirmedPage() {
  const { orderId } = Route.useParams();
  const { user, loading: authLoading } = useAuth();
  const { byId } = useProducts();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("orders" as never)
        .select("*")
        .eq("id", orderId)
        .maybeSingle();
      setOrder((data as unknown as Order) ?? null);
      setLoading(false);
    })();
  }, [orderId, user, authLoading]);

  if (loading || authLoading) {
    return (
      <Layout>
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  const short = orderId.slice(0, 8).toUpperCase();
  const addr = order?.shipping_address ?? {};

  return (
    <Layout>
      <div className="mx-auto max-w-3xl px-4 py-12 md:px-8 md:py-20">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 ring-8 ring-primary/5 animate-in zoom-in-50 duration-500">
            <Check className="h-10 w-10 text-primary" strokeWidth={2.5} />
          </div>
          <h1 className="mt-6 font-display text-4xl italic text-foreground md:text-5xl">
            Encomenda confirmada!
          </h1>
          <p className="mt-3 max-w-md text-muted-foreground">
            Obrigada pela tua compra. Entraremos em contacto brevemente.
          </p>
          <p className="mt-6 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Número da encomenda
          </p>
          <p className="mt-1 font-mono text-2xl font-semibold tracking-wider text-foreground">
            #{short}
          </p>
        </div>

        {order && (
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <section className="rounded-2xl border border-border bg-card p-6 md:col-span-2">
              <h2 className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                Peças
              </h2>
              <ul className="mt-4 divide-y divide-border">
                {(order.items ?? []).map((it, i) => {
                  const p = it.product_id ? byId(it.product_id) : null;
                  return (
                    <li key={i} className="flex gap-4 py-4">
                      <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {p?.image && (
                          <img src={p.image} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="flex flex-1 flex-col">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                          {it.brand ?? "—"}
                        </p>
                        <p className="font-display text-base italic">{it.name ?? "Peça"}</p>
                        <p className="text-xs text-muted-foreground">
                          Tamanho {it.size ?? "—"} · Qtd {it.quantity ?? 1}
                        </p>
                      </div>
                      <p className="text-sm font-medium">€{Number(it.line_total ?? 0).toFixed(2)}</p>
                    </li>
                  );
                })}
              </ul>
            </section>

            <aside className="space-y-4">
              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                  Envio
                </h3>
                <p className="mt-3 text-sm font-medium text-foreground">{addr.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  {[addr.address1, addr.address2].filter(Boolean).join(", ")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {[addr.postal_code, addr.city].filter(Boolean).join(" ")}
                </p>
                <p className="text-sm text-muted-foreground">{addr.country}</p>
              </div>
              <div className="rounded-2xl border border-border bg-card p-6">
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <dt>Subtotal</dt>
                    <dd>€{Number(order.subtotal ?? 0).toFixed(2)}</dd>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <dt>Envio</dt>
                    <dd>€{Number(order.shipping_cost ?? 0).toFixed(2)}</dd>
                  </div>
                </dl>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                  <span className="text-sm uppercase tracking-wider text-muted-foreground">
                    Total
                  </span>
                  <span className="font-display text-2xl italic">
                    €{Number(order.total ?? 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </aside>
          </div>
        )}

        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/perfil"
            className="inline-flex h-12 items-center justify-center rounded-full bg-primary px-7 text-sm uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
          >
            Ver as minhas compras
          </Link>
          <Link
            to="/"
            className="inline-flex h-12 items-center justify-center rounded-full border border-border px-7 text-sm uppercase tracking-wider text-foreground hover:bg-muted"
          >
            Continuar a explorar
          </Link>
        </div>
      </div>
    </Layout>
  );
}