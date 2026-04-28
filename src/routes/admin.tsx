import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { getAdminData, type AdminPayload } from "@/server/admin";
import {
  Users,
  Calendar,
  ShoppingBag,
  Euro,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { statusBadgeClasses } from "@/lib/reservations";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Visão Geral | Admin" }] }),
  component: () => (
    <AdminLayout>
      <DashboardContent />
    </AdminLayout>
  ),
});

type FlatReservation = AdminPayload["users"][number]["reservations"][number];

function DashboardContent() {
  const fetchData = useServerFn(getAdminData);
  const [data, setData] = useState<AdminPayload | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) return;
      try {
        const result = await fetchData({ data: { token } });
        setData(result);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro a carregar");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recentReservations = useMemo<FlatReservation[]>(() => {
    if (!data) return [];
    const flat: FlatReservation[] = [];
    for (const u of data.users) for (const r of u.reservations) flat.push(r);
    flat.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return flat.slice(0, 5);
  }, [data]);

  const recentUsers = useMemo(() => {
    if (!data) return [];
    return [...data.users]
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, 5);
  }, [data]);

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
        <h1 className="mt-1 font-display text-3xl italic md:text-4xl">Visão Geral</h1>
      </header>

      {/* Stat cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Clientes" value={data?.stats.totalUsers ?? 0} />
        <StatCard icon={Calendar} label="Reservas" value={data?.stats.totalReservations ?? 0} />
        <StatCard icon={ShoppingBag} label="Encomendas" value={data?.stats.totalOrders ?? 0} />
        <StatCard
          icon={Euro}
          label="Receita (mês)"
          value={`€${(data?.stats.revenueMonth ?? 0).toFixed(0)}`}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent reservations */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Últimas reservas
            </h2>
            <Link
              to="/admin/reservas"
              className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-foreground hover:text-primary"
            >
              Ver todas <ArrowRight size={12} />
            </Link>
          </div>
          {recentReservations.length === 0 ? (
            <p className="rounded-xl bg-muted/30 p-4 text-center text-xs text-muted-foreground">
              Sem reservas.
            </p>
          ) : (
            <ul className="space-y-2">
              {recentReservations.map((r) => (
                <li
                  key={r.id}
                  className="flex items-start justify-between gap-3 rounded-xl border border-border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{r.customer_name}</p>
                    <p className="truncate text-xs text-muted-foreground">{r.item_name}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {r.preferred_date} {r.reservation_date && `· ${r.reservation_date}`}
                    </p>
                  </div>
                  <span className={statusBadgeClasses(r.status)}>{r.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Recent users */}
        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Novos clientes
            </h2>
            <Link
              to="/admin/clientes"
              className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-foreground hover:text-primary"
            >
              Ver todos <ArrowRight size={12} />
            </Link>
          </div>
          {recentUsers.length === 0 ? (
            <p className="rounded-xl bg-muted/30 p-4 text-center text-xs text-muted-foreground">
              Sem clientes.
            </p>
          ) : (
            <ul className="space-y-2">
              {recentUsers.map((u) => (
                <li
                  key={u.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {u.full_name || "Sem nome"}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{u.email || "—"}</p>
                  </div>
                  <p className="shrink-0 text-[11px] text-muted-foreground">
                    {new Date(u.created_at).toLocaleDateString("pt-PT", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
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
  value: number | string;
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