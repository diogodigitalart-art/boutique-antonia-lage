import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Loader2, Plus, Percent, CheckCircle2, XCircle, Trash2, Power } from "lucide-react";
import { toast } from "sonner";

type AppliesTo = "all" | "colecção" | "arquivo" | "specific";

type CodeRow = {
  id: string;
  code: string;
  discount_percent: number;
  applies_to: AppliesTo;
  product_ids: string[] | null;
  use_limit: number | null;
  use_count: number;
  status: string;
  expires_at: string | null;
  created_at: string;
};

export const Route = createFileRoute("/admin_/promocoes")({
  head: () => ({ meta: [{ title: "Promoções | Admin" }] }),
  component: () => (
    <AdminLayout>
      <PromocoesPage />
    </AdminLayout>
  ),
});

const APPLIES_LABEL: Record<AppliesTo, string> = {
  all: "Todos os produtos",
  "colecção": "Colecção",
  arquivo: "Arquivo",
  specific: "Produtos específicos",
};

function computedStatus(r: CodeRow): "activo" | "utilizado" | "expirado" {
  if (r.status === "expirado") return "expirado";
  if (r.expires_at && new Date(r.expires_at).getTime() < Date.now()) return "expirado";
  if (r.use_limit != null && r.use_count >= r.use_limit) return "utilizado";
  if (r.status === "utilizado") return "utilizado";
  return "activo";
}

function PromocoesPage() {
  const { session, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<CodeRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [code, setCode] = useState("");
  const [percent, setPercent] = useState(10);
  const [appliesTo, setAppliesTo] = useState<AppliesTo>("all");
  const [productRefs, setProductRefs] = useState("");
  const [useLimit, setUseLimit] = useState<string>("");
  const [expires, setExpires] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("discount_codes")
      .select("id, code, discount_percent, applies_to, product_ids, use_limit, use_count, status, expires_at, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setRows([]);
    } else {
      setRows((data ?? []) as CodeRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!session?.access_token) {
      setRows([]);
      setLoading(false);
      return;
    }
    void load();
  }, [authLoading, session?.access_token, load]);

  const stats = useMemo(() => {
    let active = 0, used = 0, expired = 0;
    for (const r of rows) {
      const s = computedStatus(r);
      if (s === "activo") active++;
      else if (s === "utilizado") used++;
      else expired++;
    }
    return { active, used, expired };
  }, [rows]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const c = code.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,32}$/.test(c)) {
      toast.error("Código deve ter 3-32 caracteres alfanuméricos");
      return;
    }
    if (percent < 1 || percent > 100) {
      toast.error("Percentagem inválida");
      return;
    }
    setBusy(true);
    const productIds = appliesTo === "specific"
      ? productRefs.split(/[,\s]+/).map((s) => s.trim()).filter(Boolean)
      : null;
    const { error } = await supabase.from("discount_codes").insert({
      code: c,
      discount_percent: Math.floor(percent),
      applies_to: appliesTo,
      product_ids: productIds,
      use_limit: useLimit ? Math.max(1, Math.floor(Number(useLimit))) : null,
      expires_at: expires ? new Date(expires).toISOString() : null,
      status: "activo",
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Código criado");
    setCode(""); setPercent(10); setAppliesTo("all"); setProductRefs(""); setUseLimit(""); setExpires("");
    void load();
  };

  const toggleStatus = async (r: CodeRow) => {
    const next = r.status === "activo" ? "expirado" : "activo";
    const { error } = await supabase.from("discount_codes").update({ status: next }).eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    void load();
  };

  const remove = async (r: CodeRow) => {
    if (!confirm(`Eliminar o código ${r.code}?`)) return;
    const { error } = await supabase.from("discount_codes").delete().eq("id", r.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Código eliminado");
    void load();
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
        <h1 className="mt-1 font-display text-3xl italic md:text-4xl">Promoções</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cria e gere códigos promocionais com regras de aplicação, limite de usos e expiração.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Activos" value={stats.active} icon={Percent} />
        <StatCard label="Utilizados" value={stats.used} icon={CheckCircle2} />
        <StatCard label="Expirados" value={stats.expired} icon={XCircle} />
      </div>

      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-xl italic">Criar código</h2>
        <form onSubmit={handleCreate} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-medium">
            Código
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="VERAO25"
              className="h-10 rounded-full border border-border bg-background px-4 text-sm uppercase outline-none focus:border-primary"
              required
            />
          </label>
          <label className="grid gap-1.5 text-xs font-medium">
            Desconto %
            <input
              type="number" min={1} max={100}
              value={percent}
              onChange={(e) => setPercent(Number(e.target.value))}
              className="h-10 rounded-full border border-border bg-background px-4 text-sm outline-none focus:border-primary"
              required
            />
          </label>
          <fieldset className="grid gap-2 text-xs font-medium sm:col-span-2">
            <legend>Aplica-se a</legend>
            <div className="flex flex-wrap gap-3">
              {(Object.keys(APPLIES_LABEL) as AppliesTo[]).map((k) => (
                <label key={k} className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5">
                  <input type="radio" name="applies_to" value={k} checked={appliesTo === k} onChange={() => setAppliesTo(k)} />
                  <span>{APPLIES_LABEL[k]}</span>
                </label>
              ))}
            </div>
            {appliesTo === "specific" && (
              <input
                value={productRefs}
                onChange={(e) => setProductRefs(e.target.value)}
                placeholder="Referências dos produtos, separadas por vírgula"
                className="mt-2 h-10 rounded-full border border-border bg-background px-4 text-sm outline-none focus:border-primary"
              />
            )}
          </fieldset>
          <label className="grid gap-1.5 text-xs font-medium">
            Limite de usos (opcional)
            <input
              type="number" min={1}
              value={useLimit}
              onChange={(e) => setUseLimit(e.target.value)}
              placeholder="Sem limite"
              className="h-10 rounded-full border border-border bg-background px-4 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="grid gap-1.5 text-xs font-medium">
            Data de expiração (opcional)
            <input
              type="date"
              value={expires}
              onChange={(e) => setExpires(e.target.value)}
              className="h-10 rounded-full border border-border bg-background px-4 text-sm outline-none focus:border-primary"
            />
          </label>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              <Plus size={14} /> Criar
            </button>
          </div>
        </form>
      </section>

      <section className="mt-6 rounded-2xl border border-border bg-card p-6">
        <header className="mb-4 flex items-baseline justify-between">
          <h2 className="font-display text-xl italic">Códigos ({rows.length})</h2>
        </header>
        {rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sem códigos.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-2 pr-4">Código</th>
                  <th className="py-2 pr-4">Desconto</th>
                  <th className="py-2 pr-4">Aplica-se a</th>
                  <th className="py-2 pr-4">Usos</th>
                  <th className="py-2 pr-4">Limite</th>
                  <th className="py-2 pr-4">Expira em</th>
                  <th className="py-2 pr-4">Estado</th>
                  <th className="py-2 pr-4">Acções</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const s = computedStatus(r);
                  return (
                    <tr key={r.id} className="border-b border-border/60">
                      <td className="py-2 pr-4 font-mono text-xs">{r.code}</td>
                      <td className="py-2 pr-4">{r.discount_percent}%</td>
                      <td className="py-2 pr-4">
                        {APPLIES_LABEL[r.applies_to] ?? r.applies_to}
                        {r.applies_to === "specific" && r.product_ids && (
                          <p className="text-[10px] text-muted-foreground">{r.product_ids.join(", ")}</p>
                        )}
                      </td>
                      <td className="py-2 pr-4">{r.use_count}</td>
                      <td className="py-2 pr-4">{r.use_limit ?? "∞"}</td>
                      <td className="py-2 pr-4 text-xs">
                        {r.expires_at ? new Date(r.expires_at).toLocaleDateString("pt-PT") : "—"}
                      </td>
                      <td className="py-2 pr-4">
                        <StatusBadge status={s} />
                      </td>
                      <td className="py-2 pr-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleStatus(r)}
                            title={r.status === "activo" ? "Desactivar" : "Reactivar"}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border hover:bg-muted"
                          >
                            <Power size={12} />
                          </button>
                          <button
                            onClick={() => remove(r)}
                            title="Eliminar"
                            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border text-destructive hover:bg-destructive-soft"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
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

function StatusBadge({ status }: { status: "activo" | "utilizado" | "expirado" }) {
  const map = {
    activo: "border-success/30 bg-success-soft text-success",
    utilizado: "bg-muted text-muted-foreground border-border",
    expirado: "border-destructive/30 bg-destructive-soft text-destructive",
  } as const;
  const label = { activo: "Activo", utilizado: "Utilizado", expirado: "Expirado" } as const;
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] uppercase tracking-wider ${map[status]}`}>
      {label[status]}
    </span>
  );
}