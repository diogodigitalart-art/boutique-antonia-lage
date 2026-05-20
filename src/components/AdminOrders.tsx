import { Fragment, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, ShoppingBag, Download } from "lucide-react";
import { toast } from "sonner";
import { useProducts } from "@/lib/products";

const STATUSES = [
  "Pendente",
  "Confirmada",
  "Em preparação",
  "Enviada",
  "Entregue",
  "Cancelada",
] as const;

export type Status = (typeof STATUSES)[number];

const PIPELINE: Status[] = ["Pendente", "Confirmada", "Em preparação", "Enviada", "Entregue"];

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
  product_uuid?: string | null;
  brand?: string | null;
  name?: string | null;
  reference?: string | null;
  image?: string | null;
  size: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};

export type Order = {
  id: string;
  customer_name: string;
  customer_email: string;
  subtotal: number;
  shipping_cost: number;
  discount_code: string | null;
  discount_amount: number;
  total: number;
  status: Status;
  created_at: string;
  items: OrderItem[];
  shipping_address: Record<string, string>;
  notes: string | null;
  stock_restored?: boolean;
};

type Mode = "active" | "history" | "cancelled";

const ACTIVE_STATUSES: Status[] = ["Pendente", "Confirmada", "Em preparação"];
const HISTORY_STATUSES: Status[] = ["Enviada", "Entregue"];

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function pipelineIndex(s: Status) {
  const i = PIPELINE.indexOf(s);
  return i < 0 ? 0 : i;
}

/** When an order is delivered, deactivate any products that have run out of stock. */
async function deactivateOutOfStockProducts(items: OrderItem[]) {
  const uuids = Array.from(
    new Set(items.map((i) => i.product_uuid).filter((x): x is string => !!x)),
  );
  if (!uuids.length) return;
  const { data: prods } = await supabase
    .from("products" as never)
    .select("id, sizes, is_active")
    .in("id", uuids);
  if (!prods) return;
  for (const p of prods as Array<{ id: string; sizes: unknown; is_active: boolean }>) {
    const sizes = Array.isArray(p.sizes) ? (p.sizes as Array<{ stock?: number }>) : [];
    const totalStock = sizes.reduce((s, x) => s + (Number(x.stock) || 0), 0);
    if (totalStock <= 0 && p.is_active) {
      await supabase
        .from("products" as never)
        .update({ is_active: false } as never)
        .eq("id", p.id);
    }
  }
}

export function AdminOrders({ mode }: { mode: Mode }) {
  const { byId, rows: productRows } = useProducts();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<"week" | "month" | "all" | "custom">("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const refresh = async () => {
    const statuses =
      mode === "active" ? ACTIVE_STATUSES : mode === "history" ? HISTORY_STATUSES : ["Cancelada"];
    const { data } = await supabase
      .from("orders" as never)
      .select("*")
      .in("status", statuses)
      .order("created_at", { ascending: false });
    setOrders((data as unknown as Order[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const updateStatus = async (o: Order, status: Status) => {
    const prev = o.status;
    const shouldRestore =
      status === "Cancelada" &&
      prev !== "Cancelada" &&
      (["Pendente", "Confirmada", "Em preparação"] as Status[]).includes(prev) &&
      !o.stock_restored;
    const { error } = await supabase
      .from("orders" as never)
      .update({ status } as never)
      .eq("id", o.id);
    if (error) {
      toast.error("Erro a actualizar estado");
      return;
    }
    if (status === "Entregue") {
      try {
        await deactivateOutOfStockProducts(o.items ?? []);
      } catch (e) {
        console.error("deactivate products failed", e);
      }
    }
    if (shouldRestore) {
      try {
        for (const it of o.items ?? []) {
          if (!it.product_uuid || !it.size) continue;
          const qty = Math.max(1, Number(it.quantity) || 1);
          const { error: rpcErr } = await supabase.rpc(
            "increment_product_stock" as never,
            { _product_id: it.product_uuid, _size: it.size, _qty: qty } as never,
          );
          if (rpcErr) console.error("increment_product_stock failed", rpcErr);
        }
        await supabase
          .from("orders" as never)
          .update({ stock_restored: true } as never)
          .eq("id", o.id);
        toast.success("Stock reposto automaticamente");
      } catch (e) {
        console.error("auto stock restore failed", e);
      }
    }
    toast.success(`Estado actualizado: ${status}`);
    await refresh();
  };

  const filtered = useMemo(() => {
    let list = orders;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.customer_name?.toLowerCase().includes(q) ||
          o.customer_email?.toLowerCase().includes(q),
      );
    }
    if (mode !== "active" && range !== "all") {
      const now = new Date();
      let from: Date | null = null;
      let to: Date | null = null;
      if (range === "week") {
        from = new Date(now);
        from.setDate(now.getDate() - 7);
      } else if (range === "month") {
        from = new Date(now);
        from.setMonth(now.getMonth() - 1);
      } else if (range === "custom") {
        if (customFrom) from = new Date(customFrom);
        if (customTo) {
          to = new Date(customTo);
          to.setHours(23, 59, 59, 999);
        }
      }
      list = list.filter((o) => {
        const d = new Date(o.created_at);
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
    }
    return list;
  }, [orders, search, range, customFrom, customTo, mode]);

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

  const exportCsv = () => {
    const rows = [
      ["Encomenda", "Cliente", "Email", "Data", "Itens", "Total", "Estado"],
      ...filtered.map((o) => [
        shortId(o.id),
        o.customer_name,
        o.customer_email,
        new Date(o.created_at).toISOString(),
        String(o.items?.length ?? 0),
        Number(o.total).toFixed(2),
        o.status,
      ]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `encomendas-${mode}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const title =
    mode === "active" ? "Encomendas" : mode === "history" ? "Histórico" : "Canceladas";
  const subtitle =
    mode === "active"
      ? "Encomendas que precisam da tua atenção"
      : mode === "history"
        ? "Encomendas enviadas e entregues"
        : "Encomendas canceladas";

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Admin</p>
          <h1 className="mt-1 font-display text-3xl italic md:text-4xl">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        {mode === "history" && (
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-muted"
          >
            <Download className="h-3.5 w-3.5" />
            Exportar CSV
          </button>
        )}
      </header>

      {/* Pipeline (only on active) */}
      {mode === "active" && (
        <div className="mb-6 overflow-x-auto">
          <div className="flex min-w-[640px] items-center gap-2">
            {PIPELINE.map((s, i) => (
              <Fragment key={s}>
                <div
                  className={`flex-1 rounded-xl border px-4 py-3 text-center ${STATUS_COLOR[s]}`}
                >
                  <p className="text-[10px] uppercase tracking-wider opacity-70">
                    {i + 1}. {s}
                  </p>
                  <p className="mt-1 font-display text-2xl italic">{counts[s]}</p>
                </div>
                {i < PIPELINE.length - 1 && (
                  <div className="h-px w-4 shrink-0 bg-border md:w-6" />
                )}
              </Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar nº encomenda, nome, email…"
            className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        {mode !== "active" && (
          <>
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as typeof range)}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm"
            >
              <option value="all">Todas as datas</option>
              <option value="week">Última semana</option>
              <option value="month">Último mês</option>
              <option value="custom">Personalizado</option>
            </select>
            {range === "custom" && (
              <>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className="rounded-md border border-border bg-background px-3 py-2 text-sm"
                />
              </>
            )}
          </>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">A carregar…</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <ShoppingBag className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="mt-4 font-display text-xl italic">Sem encomendas</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "active"
              ? "Não há encomendas a precisar de atenção."
              : "Sem resultados para os filtros actuais."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Encomenda</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Itens</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Estado</th>
                {mode === "active" && <th className="px-4 py-3 w-[160px]">Progresso</th>}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((o) => {
                const open = openId === o.id;
                const stepIdx = pipelineIndex(o.status);
                const pct = Math.round(((stepIdx + 1) / PIPELINE.length) * 100);
                const itemsCount = (o.items ?? []).reduce(
                  (s, it) => s + (Number(it.quantity) || 0),
                  0,
                );
                return (
                  <Fragment key={o.id}>
                    <tr className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        #{shortId(o.id)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{o.customer_name}</p>
                        <p className="text-xs text-muted-foreground">{o.customer_email}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(o.created_at)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{itemsCount}</td>
                      <td className="px-4 py-3 font-medium">€{Number(o.total).toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <select
                          value={o.status}
                          onChange={(e) => void updateStatus(o, e.target.value as Status)}
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${STATUS_COLOR[o.status] ?? "border-border bg-muted text-foreground"}`}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      {mode === "active" && (
                        <td className="px-4 py-3">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full bg-primary transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                            Passo {stepIdx + 1}/{PIPELINE.length}
                          </p>
                        </td>
                      )}
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
                        <td colSpan={mode === "active" ? 8 : 7} className="px-4 py-4">
                          <div className="grid gap-6 md:grid-cols-2">
                            <div>
                              <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                                Artigos
                              </p>
                              <ul className="space-y-3 text-sm">
                                {o.items?.map((it, i) => {
                                  const lookup =
                                    byId(it.product_id) ??
                                    (it.product_uuid
                                      ? byId(it.product_uuid)
                                      : undefined);
                                  const rowMatch = it.product_uuid
                                    ? productRows.find((r) => r.id === it.product_uuid)
                                    : productRows.find(
                                        (r) => r.legacy_id === it.product_id,
                                      );
                                  const imageSrc =
                                    it.image ||
                                    lookup?.image ||
                                    lookup?.images?.[0] ||
                                    rowMatch?.images?.[0] ||
                                    null;
                                  return (
                                  <li key={i} className="flex gap-3">
                                    {imageSrc ? (
                                      <img
                                        src={imageSrc}
                                        alt=""
                                        className="h-20 w-16 shrink-0 rounded border border-border object-cover"
                                      />
                                    ) : (
                                      <div className="h-20 w-16 shrink-0 rounded border border-border bg-muted" />
                                    )}
                                    <div className="flex flex-1 flex-col">
                                      <span className="font-medium">
                                        {it.brand ? `${it.brand} — ` : ""}
                                        {it.name ?? it.product_id}
                                      </span>
                                      {it.reference && (
                                        <span className="font-mono text-[11px] text-muted-foreground">
                                          Ref: {it.reference}
                                        </span>
                                      )}
                                      <span className="text-xs text-muted-foreground">
                                        Tamanho {it.size} · ×{it.quantity}
                                      </span>
                                      <span className="mt-auto text-xs text-muted-foreground">
                                        €{Number(it.line_total).toFixed(2)}
                                      </span>
                                    </div>
                                  </li>
                                  );
                                })}
                              </ul>
                            </div>
                            <div>
                              <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                                Envio
                              </p>
                              <p className="text-sm">{o.shipping_address?.full_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {o.shipping_address?.address1}
                                {o.shipping_address?.address2
                                  ? `, ${o.shipping_address.address2}`
                                  : ""}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {o.shipping_address?.postal_code} {o.shipping_address?.city},{" "}
                                {o.shipping_address?.country}
                              </p>
                              <p className="mt-2 text-xs text-muted-foreground">
                                {o.shipping_address?.phone}
                              </p>

                              <p className="mb-2 mt-5 text-[11px] uppercase tracking-wider text-muted-foreground">
                                Total
                              </p>
                              <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Subtotal</span>
                                  <span>€{Number(o.subtotal).toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Envio</span>
                                  <span>€{Number(o.shipping_cost).toFixed(2)}</span>
                                </div>
                                {o.discount_code && (
                                  <div className="flex justify-between text-emerald-700">
                                    <span>Desconto ({o.discount_code})</span>
                                    <span>−€{Number(o.discount_amount).toFixed(2)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between border-t border-border pt-1 font-medium">
                                  <span>Total</span>
                                  <span>€{Number(o.total).toFixed(2)}</span>
                                </div>
                              </div>

                              {mode === "cancelled" && o.notes && (
                                <>
                                  <p className="mb-2 mt-5 text-[11px] uppercase tracking-wider text-muted-foreground">
                                    Motivo de cancelamento
                                  </p>
                                  <p className="text-sm text-muted-foreground">{o.notes}</p>
                                </>
                              )}
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