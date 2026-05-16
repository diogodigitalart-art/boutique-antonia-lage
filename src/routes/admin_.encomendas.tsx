import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/admin_/encomendas")({
  head: () => ({ meta: [{ title: "Encomendas | Admin" }] }),
  component: () => (
    <AdminLayout>
      <OrdersPage />
    </AdminLayout>
  ),
});

const STATUSES = [
  "Pendente",
  "Confirmada",
  "Em preparação",
  "Enviada",
  "Entregue",
  "Cancelada",
] as const;

type Status = (typeof STATUSES)[number];

const STATUS_COLOR: Record<Status, string> = {
  Pendente: "bg-rose-100 text-rose-800 border-rose-200",
  Confirmada: "bg-blue-100 text-blue-800 border-blue-200",
  "Em preparação": "bg-violet-100 text-violet-800 border-violet-200",
  Enviada: "bg-teal-100 text-teal-800 border-teal-200",
  Entregue: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Cancelada: "bg-slate-100 text-slate-700 border-slate-200",
};

type OrderItem = {
  product_id: string;
  brand?: string | null;
  name?: string | null;
  reference?: string | null;
  image?: string | null;
  size: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

type Order = {
  id: string;
  customer_name: string;
  customer_email: string;
  total: number;
  status: Status;
  created_at: string;
  items: OrderItem[];
  shipping_address: Record<string, string>;
};

function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const refresh = async () => {
    const { data } = await supabase
      .from("orders" as never)
      .select("*")
      .order("created_at", { ascending: false });
    setOrders((data as unknown as Order[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const updateStatus = async (id: string, status: Status) => {
    await supabase.from("orders" as never).update({ status } as never).eq("id", id);
    await refresh();
  };

  const counts: Record<Status, number> = {
    Pendente: 0,
    Confirmada: 0,
    "Em preparação": 0,
    Enviada: 0,
    Entregue: 0,
    Cancelada: 0,
  };
  orders.forEach((o) => {
    if (STATUSES.includes(o.status)) counts[o.status]++;
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
      <header className="mb-6">
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Admin</p>
        <h1 className="mt-1 font-display text-3xl italic md:text-4xl">Encomendas</h1>
      </header>

      {/* Pipeline */}
      <div className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-5">
        {(["Pendente", "Confirmada", "Em preparação", "Enviada", "Entregue"] as Status[]).map((s) => (
          <div key={s} className={`rounded-xl border p-4 ${STATUS_COLOR[s]}`}>
            <p className="text-[10px] uppercase tracking-wider opacity-70">{s}</p>
            <p className="mt-1 font-display text-2xl italic">{counts[s]}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">A carregar…</p>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <ShoppingBag className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="mt-4 font-display text-xl italic">Sem encomendas</p>
          <p className="mt-1 text-sm text-muted-foreground">As novas encomendas aparecem aqui.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Encomenda</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const open = openId === o.id;
                return (
                  <Fragment key={o.id}>
                    <tr className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        #{o.id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{o.customer_name}</p>
                        <p className="text-xs text-muted-foreground">{o.customer_email}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(o.created_at).toLocaleDateString("pt-PT", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 font-medium">€{Number(o.total).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <select
                          value={o.status}
                          onChange={(e) => void updateStatus(o.id, e.target.value as Status)}
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${STATUS_COLOR[o.status] ?? "border-border bg-muted text-foreground"}`}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setOpenId(open ? null : o.id)}
                          className="text-xs uppercase tracking-wider text-primary hover:underline"
                        >
                          {open ? "Fechar" : "Detalhes"}
                        </button>
                      </td>
                    </tr>
                    {open && (
                      <tr className="border-b border-border bg-muted/20">
                        <td colSpan={6} className="px-4 py-4">
                          <div className="grid gap-6 md:grid-cols-2">
                            <div>
                              <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                                Artigos
                              </p>
                              <ul className="space-y-1 text-sm">
                                {o.items?.map((it, i) => (
                                  <li key={i} className="flex justify-between gap-3">
                                    <span className="flex flex-col">
                                      <span>
                                        {it.brand ? `${it.brand} — ` : ""}
                                        {it.name ?? it.product_id}
                                      </span>
                                      {it.reference && (
                                        <span className="font-mono text-[11px] text-muted-foreground">
                                          Ref: {it.reference}
                                        </span>
                                      )}
                                      <span className="text-xs text-muted-foreground">
                                        {it.size} · ×{it.quantity}
                                      </span>
                                    </span>
                                    <span className="text-muted-foreground">
                                      €{Number(it.line_total).toFixed(2)}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                                Envio
                              </p>
                              <p className="text-sm">{o.shipping_address?.full_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {o.shipping_address?.address1}
                                {o.shipping_address?.address2 ? `, ${o.shipping_address.address2}` : ""}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {o.shipping_address?.postal_code} {o.shipping_address?.city}, {o.shipping_address?.country}
                              </p>
                              <p className="mt-2 text-xs text-muted-foreground">
                                {o.shipping_address?.phone}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}