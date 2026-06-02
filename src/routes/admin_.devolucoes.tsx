import { createFileRoute } from "@tanstack/react-router";
import { Fragment, useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useProducts } from "@/lib/products";
import { displaySize } from "@/lib/utils";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { notifyReturnStatus } from "@/server/returns";
import { RotateCcw, Search, Archive, ArchiveRestore } from "lucide-react";

export const Route = createFileRoute("/admin_/devolucoes")({
  head: () => ({ meta: [{ title: "Devoluções | Admin" }] }),
  component: () => (
    <AdminLayout>
      <AdminReturns />
    </AdminLayout>
  ),
});

const STATUSES = [
  "Aguarda recepção",
  "Peça recebida",
  "Em análise",
  "Aprovada",
  "Rejeitada",
] as const;
type Status = (typeof STATUSES)[number];

const STATUS_COLOR: Record<Status, string> = {
  "Aguarda recepção": "bg-amber-100 text-amber-800 border-amber-200",
  "Peça recebida": "bg-blue-100 text-blue-800 border-blue-200",
  "Em análise": "bg-violet-100 text-violet-800 border-violet-200",
  Aprovada: "bg-emerald-100 text-emerald-800 border-emerald-200",
  Rejeitada: "bg-rose-100 text-rose-800 border-rose-200",
};

type ReturnItem = {
  product_id?: string;
  product_uuid?: string | null;
  brand?: string | null;
  name?: string | null;
  size?: string;
  quantity?: number;
  line_total?: number;
  image?: string | null;
};

type ReturnRow = {
  id: string;
  order_id: string;
  user_id: string;
  customer_name: string | null;
  customer_email: string | null;
  items: ReturnItem[];
  reason: string;
  method: string;
  notes: string | null;
  status: Status;
  stock_restored: boolean;
  archived: boolean;
  created_at: string;
};

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

function AdminReturns() {
  const { byId, rows: productRows } = useProducts();
  const [items, setItems] = useState<ReturnRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"active" | "archived">("active");
  const notify = useServerFn(notifyReturnStatus);

  const refresh = async () => {
    const { data } = await supabase
      .from("returns" as never)
      .select("*")
      .order("created_at", { ascending: false });
    setItems(((data as unknown) as ReturnRow[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const stats = useMemo(() => {
    let pending = 0;
    let approved = 0;
    let rejected = 0;
    for (const r of items) {
      if (r.archived) continue;
      if (["Aguarda recepção", "Peça recebida", "Em análise"].includes(r.status)) pending++;
      else if (r.status === "Aprovada") approved++;
      else if (r.status === "Rejeitada") rejected++;
    }
    return { pending, approved, rejected };
  }, [items]);

  const filtered = useMemo(() => {
    const base = items.filter((r) => (view === "archived" ? r.archived : !r.archived));
    if (!search.trim()) return base;
    const q = search.trim().toLowerCase();
    return base.filter(
      (r) =>
        r.id.toLowerCase().includes(q) ||
        r.order_id.toLowerCase().includes(q) ||
        (r.customer_name ?? "").toLowerCase().includes(q) ||
        (r.customer_email ?? "").toLowerCase().includes(q),
    );
  }, [items, search, view]);

  const archivedCount = items.filter((r) => r.archived).length;
  const activeCount = items.filter((r) => !r.archived).length;

  const toggleArchive = async (r: ReturnRow) => {
    const next = !r.archived;
    const { error } = await supabase
      .from("returns" as never)
      .update({ archived: next } as never)
      .eq("id", r.id);
    if (error) {
      toast.error("Erro a arquivar");
      return;
    }
    toast.success(next ? "Devolução arquivada" : "Devolução restaurada");
    await refresh();
  };

  const updateStatus = async (r: ReturnRow, status: Status) => {
    const prev = r.status;
    const { error } = await supabase
      .from("returns" as never)
      .update({ status } as never)
      .eq("id", r.id);
    if (error) {
      toast.error("Erro a actualizar estado");
      return;
    }
    toast.success(`Estado: ${status}`);
    if ((status === "Aprovada" || status === "Rejeitada") && prev !== status) {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        if (token) await notify({ data: { token, returnId: r.id, status } });
      } catch (e) {
        console.error("notify return failed", e);
      }
    }
    await refresh();
  };

  const restoreStock = async (r: ReturnRow) => {
    if (r.stock_restored) {
      toast.info("Stock já reposto");
      return;
    }
    if (r.status !== "Aprovada") {
      toast.error("Apenas devoluções aprovadas");
      return;
    }
    try {
      for (const it of r.items ?? []) {
        const uuid =
          it.product_uuid ||
          (it.product_id ? productRows.find((p) => p.legacy_id === it.product_id || p.id === it.product_id)?.id : undefined);
        if (!uuid || !it.size) continue;
        const qty = Math.max(1, Number(it.quantity) || 1);
        const { error } = await supabase.rpc(
          "increment_product_stock" as never,
          { _product_id: uuid, _size: it.size, _qty: qty } as never,
        );
        if (error) console.error("increment_product_stock failed", error);
      }
      await supabase
        .from("returns" as never)
        .update({ stock_restored: true } as never)
        .eq("id", r.id);
      toast.success("Stock reposto");
      await refresh();
    } catch (e) {
      console.error(e);
      toast.error("Erro a repor stock");
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
      <header className="mb-6">
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Admin</p>
        <h1 className="mt-1 font-display text-3xl italic md:text-4xl">Devoluções</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pedidos de devolução de clientes
        </p>
      </header>

      <div className="mb-6 grid gap-3 md:grid-cols-3">
        <StatCard label="Pendentes" value={stats.pending} tone="amber" />
        <StatCard label="Aprovadas" value={stats.approved} tone="emerald" />
        <StatCard label="Rejeitadas" value={stats.rejected} tone="rose" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-full border border-border bg-card p-1 text-xs">
          <button
            onClick={() => setView("active")}
            className={`rounded-full px-3 py-1.5 uppercase tracking-wider ${view === "active" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Activas ({activeCount})
          </button>
          <button
            onClick={() => setView("archived")}
            className={`rounded-full px-3 py-1.5 uppercase tracking-wider ${view === "archived" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            Arquivadas ({archivedCount})
          </button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar nº devolução, encomenda, cliente…"
            className="w-72 max-w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">A carregar…</p>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            <RotateCcw className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="mt-4 font-display text-xl italic">Sem devoluções</p>
          <p className="mt-1 text-sm text-muted-foreground">Nada para mostrar.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Devolução</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Encomenda</th>
                <th className="px-4 py-3">Motivo</th>
                <th className="px-4 py-3">Método</th>
                <th className="px-4 py-3">Data</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const open = openId === r.id;
                return (
                  <Fragment key={r.id}>
                    <tr className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        #{shortId(r.id)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium">{r.customer_name ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">{r.customer_email}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        #{shortId(r.order_id)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{r.reason}</td>
                      <td className="px-4 py-3 text-muted-foreground">{r.method}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(r.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={r.status}
                          onChange={(e) => void updateStatus(r, e.target.value as Status)}
                          className={`rounded-full border px-3 py-1 text-xs font-medium ${STATUS_COLOR[r.status] ?? "border-border bg-muted text-foreground"}`}
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => void toggleArchive(r)}
                            className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground"
                            title={r.archived ? "Restaurar" : "Arquivar"}
                          >
                            {r.archived ? (
                              <>
                                <ArchiveRestore className="h-3.5 w-3.5" /> Restaurar
                              </>
                            ) : (
                              <>
                                <Archive className="h-3.5 w-3.5" /> Arquivar
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => setOpenId(open ? null : r.id)}
                            className="text-xs uppercase tracking-wider text-primary hover:underline"
                          >
                            {open ? "Fechar" : "Detalhes"}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {open && (
                      <tr className="border-b border-border bg-muted/20">
                        <td colSpan={8} className="px-4 py-4">
                          <div className="grid gap-6 md:grid-cols-2">
                            <div>
                              <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                                Peças
                              </p>
                              <ul className="space-y-3 text-sm">
                                {r.items?.map((it, i) => {
                                  const lookup = it.product_id ? byId(it.product_id) : undefined;
                                  const img = it.image || lookup?.image;
                                  return (
                                    <li key={i} className="flex gap-3">
                                      {img ? (
                                        <img
                                          src={img}
                                          alt=""
                                          className="h-20 w-16 shrink-0 rounded border border-border object-cover"
                                        />
                                      ) : (
                                        <div className="h-20 w-16 shrink-0 rounded border border-border bg-muted" />
                                      )}
                                      <div>
                                        <p className="font-medium">
                                          {it.brand ? `${it.brand} — ` : ""}
                                          {it.name}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                          Tamanho {displaySize(it.size)} · Qtd {it.quantity ?? 1}
                                        </p>
                                      </div>
                                    </li>
                                  );
                                })}
                              </ul>
                            </div>
                            <div className="space-y-3 text-sm">
                              <div>
                                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                                  Notas
                                </p>
                                <p className="mt-1 whitespace-pre-wrap">
                                  {r.notes || <span className="text-muted-foreground">—</span>}
                                </p>
                              </div>
                              {r.status === "Aprovada" && (
                                <div className="rounded-xl border border-border bg-card p-3">
                                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                                    Stock
                                  </p>
                                  {r.stock_restored ? (
                                    <p className="mt-1 text-emerald-700">Stock reposto ✓</p>
                                  ) : (
                                    <button
                                      onClick={() => void restoreStock(r)}
                                      className="mt-2 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
                                    >
                                      <RotateCcw className="h-3.5 w-3.5" /> Repor stock
                                    </button>
                                  )}
                                </div>
                              )}
                              {r.status === "Rejeitada" && (
                                <p className="text-xs text-muted-foreground">
                                  Devolução rejeitada — stock não será reposto.
                                </p>
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

function StatCard({ label, value, tone }: { label: string; value: number; tone: "amber" | "emerald" | "rose" }) {
  const tones: Record<string, string> = {
    amber: "bg-amber-50 border-amber-200 text-amber-900",
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-900",
    rose: "bg-rose-50 border-rose-200 text-rose-900",
  };
  return (
    <div className={`rounded-2xl border px-5 py-4 ${tones[tone]}`}>
      <p className="text-[10px] uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-1 font-display text-3xl italic">{value}</p>
    </div>
  );
}