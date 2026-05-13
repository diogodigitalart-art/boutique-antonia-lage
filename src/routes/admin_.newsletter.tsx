import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AdminLayout } from "@/components/AdminLayout";
import { Loader2, Plus, Mail, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import {
  adminListDiscountCodes,
  adminCreateDiscountCode,
  adminUpdateDiscountCodeStatus,
  type DiscountCodeRow,
} from "@/server/discountCodes";

export const Route = createFileRoute("/admin_/newsletter")({
  head: () => ({ meta: [{ title: "Newsletter | Admin" }] }),
  component: () => (
    <AdminLayout>
      <NewsletterPage />
    </AdminLayout>
  ),
});

function NewsletterPage() {
  const list = useServerFn(adminListDiscountCodes);
  const create = useServerFn(adminCreateDiscountCode);
  const updateStatus = useServerFn(adminUpdateDiscountCodeStatus);
  const { session, loading: authLoading } = useAuth();

  const [rows, setRows] = useState<DiscountCodeRow[]>([]);
  const [usedCodes, setUsedCodes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [code, setCode] = useState("");
  const [percent, setPercent] = useState(10);
  const [expires, setExpires] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (token: string) => {
    setLoading(true);
    try {
      const r = await list({ data: { token } });
      setRows(r.rows);
      setUsedCodes(r.usedCodes);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }, [list]);

  useEffect(() => {
    if (authLoading) {
      setLoading(true);
      return;
    }

    const token = session?.access_token;
    if (!token) {
      setRows([]);
      setUsedCodes([]);
      setLoading(false);
      return;
    }

    void load(token);
  }, [authLoading, load, session?.access_token]);

  const stats = useMemo(() => {
    const total = rows.length;
    const used = rows.filter((r) => r.status === "utilizado" || usedCodes.includes(r.code)).length;
    const expired = rows.filter((r) => r.status === "expirado").length;
    const unused = Math.max(0, total - used - expired);
    return { total, used, unused, expired };
  }, [rows, usedCodes]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    const token = session?.access_token;
    if (!token) {
      toast.error("Sessão expirada");
      return;
    }
    setBusy(true);
    try {
      await create({
        data: {
          token,
          code: code.trim(),
          discount_percent: percent,
          expires_at: expires ? new Date(expires).toISOString() : null,
        },
      });
      toast.success("Código criado");
      setCode("");
      setPercent(10);
      setExpires("");
      void load(token);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    } finally {
      setBusy(false);
    }
  };

  const handleStatus = async (id: string, status: string) => {
    const token = session?.access_token;
    if (!token) {
      toast.error("Sessão expirada");
      return;
    }
    try {
      await updateStatus({ data: { token, id, status } });
      toast.success("Estado atualizado");
      void load(token);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro");
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
      <header className="mb-6">
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Admin</p>
        <h1 className="mt-1 font-display text-3xl italic md:text-4xl">Newsletter</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gestão de subscritores e códigos de desconto.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total subscritores" value={stats.total} icon={Mail} />
        <StatCard label="Códigos utilizados" value={stats.used} icon={CheckCircle2} />
        <StatCard label="Códigos por usar" value={stats.unused} icon={Mail} />
        <StatCard label="Expirados" value={stats.expired} icon={XCircle} />
      </div>

      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-xl italic">Criar código manual</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Para campanhas, ofertas especiais ou clientes VIP.
        </p>
        <form onSubmit={handleCreate} className="mt-4 grid gap-3 sm:grid-cols-[1fr_120px_180px_auto]">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="Código (ex.: VERAO25)"
            className="rounded-full border border-border bg-background px-4 py-2 text-sm uppercase"
            required
          />
          <input
            type="number"
            min={1}
            max={100}
            value={percent}
            onChange={(e) => setPercent(Number(e.target.value))}
            placeholder="%"
            className="rounded-full border border-border bg-background px-4 py-2 text-sm"
            required
          />
          <input
            type="date"
            value={expires}
            onChange={(e) => setExpires(e.target.value)}
            placeholder="Expira em"
            className="rounded-full border border-border bg-background px-4 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            <Plus size={14} /> Criar
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card p-6">
        <header className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-xl italic">Subscritores e códigos</h2>
          <span className="text-xs text-muted-foreground">{rows.length} códigos</span>
        </header>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem códigos ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 pr-4">Email</th>
                  <th className="py-2 pr-4">Código</th>
                  <th className="py-2 pr-4">%</th>
                  <th className="py-2 pr-4">Data</th>
                  <th className="py-2 pr-4">Expira</th>
                  <th className="py-2 pr-4">Estado</th>
                  <th className="py-2 pr-4">Ações</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const effectiveStatus = usedCodes.includes(r.code) ? "utilizado" : r.status;
                  return (
                    <tr key={r.id} className="border-b border-border/60">
                      <td className="py-2 pr-4">{r.email ?? <span className="text-muted-foreground">— geral —</span>}</td>
                      <td className="py-2 pr-4 font-mono text-xs">{r.code}</td>
                      <td className="py-2 pr-4">{r.discount_percent}%</td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString("pt-PT")}
                      </td>
                      <td className="py-2 pr-4 text-xs text-muted-foreground">
                        {r.expires_at ? new Date(r.expires_at).toLocaleDateString("pt-PT") : "—"}
                      </td>
                      <td className="py-2 pr-4">
                        <StatusBadge status={effectiveStatus} />
                      </td>
                      <td className="py-2 pr-4">
                        <select
                          value={r.status}
                          onChange={(e) => handleStatus(r.id, e.target.value)}
                          className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                        >
                          <option value="activo">Activo</option>
                          <option value="utilizado">Utilizado</option>
                          <option value="expirado">Expirado</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: React.ComponentType<{ size?: number; className?: string }> }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        <Icon size={14} />
        {label}
      </div>
      <p className="mt-2 font-display text-3xl italic">{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    activo: "bg-emerald-50 text-emerald-700 border-emerald-200",
    utilizado: "bg-muted text-muted-foreground border-border",
    expirado: "bg-red-50 text-red-700 border-red-200",
  };
  const label: Record<string, string> = {
    activo: "Activo",
    utilizado: "Utilizado",
    expirado: "Expirado",
  };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] uppercase tracking-wider ${map[status] ?? map.activo}`}>
      {label[status] ?? status}
    </span>
  );
}