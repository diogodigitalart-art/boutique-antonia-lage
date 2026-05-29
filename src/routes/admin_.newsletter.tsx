import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { adminListSubscribers, type NewsletterSubscriberRow } from "@/server/newsletter";
import {
  Mail,
  Search,
  Download,
  Loader2,
  Users,
  CalendarDays,
  CalendarCheck,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin_/newsletter")({
  head: () => ({ meta: [{ title: "Newsletter | Admin" }] }),
  component: () => (
    <AdminLayout>
      <NewsletterPage />
    </AdminLayout>
  ),
});

function NewsletterPage() {
  const fetchSubscribers = useServerFn(adminListSubscribers);
  const [rows, setRows] = useState<NewsletterSubscriberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) return;
      try {
        const result = await fetchSubscribers({ data: { token } });
        setRows(result.rows);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro a carregar");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.email.toLowerCase().includes(q));
  }, [rows, search]);

  const stats = useMemo(() => {
    const total = rows.length;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    weekStart.setHours(0, 0, 0, 0);

    let thisMonth = 0;
    let thisWeek = 0;
    for (const r of rows) {
      const d = new Date(r.created_at);
      if (d >= monthStart) thisMonth++;
      if (d >= weekStart) thisWeek++;
    }
    return { total, thisMonth, thisWeek };
  }, [rows]);

  const exportCsv = () => {
    const headers = ["email", "discount_code", "created_at"];
    const lines = rows.map((r) => {
      const email = `"${r.email.replace(/"/g, '""')}"`;
      const code = `"${(r.discount_code || "").replace(/"/g, '""')}"`;
      const date = r.created_at;
      return `${email},${code},${date}`;
    });
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("CSV exportado com sucesso");
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
      <header className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Admin</p>
        <h1 className="mt-1 font-display text-3xl italic md:text-4xl">Newsletter</h1>
      </header>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Users} label="Total de subscritores" value={stats.total} />
        <StatCard icon={CalendarDays} label="Este mês" value={stats.thisMonth} />
        <StatCard icon={CalendarCheck} label="Esta semana" value={stats.thisWeek} />
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Pesquisar por email…"
            className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
        <button
          onClick={exportCsv}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
        >
          <Download className="h-4 w-4" />
          Exportar CSV
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Data de subscrição</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Código de desconto</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Origem</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-xs text-muted-foreground">
                    {search ? "Nenhum resultado encontrado." : "Sem subscritores."}
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className="border-b border-border transition-colors hover:bg-muted/40">
                    <td className="px-4 py-3 text-foreground">{row.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(row.created_at).toLocaleDateString("pt-PT", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                      {row.discount_code || "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.source || "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border px-4 py-2.5 text-[11px] text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "subscritor" : "subscritores"}
          {search && ` (de ${rows.length} total)`}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
        <p className="mt-0.5 font-display text-2xl text-foreground">{value}</p>
      </div>
    </div>
  );
}
