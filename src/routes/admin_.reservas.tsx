import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  getAdminData,
  updateReservationStatus,
  type AdminPayload,
} from "@/server/admin";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { STATUS_OPTIONS, statusBadgeClasses } from "@/lib/reservations";

export const Route = createFileRoute("/admin_/reservas")({
  head: () => ({ meta: [{ title: "Reservas | Admin" }] }),
  component: () => (
    <AdminLayout>
      <ReservasContent />
    </AdminLayout>
  ),
});

type FlatReservation = AdminPayload["users"][number]["reservations"][number] & {
  user_name: string | null;
};

function ReservasContent() {
  const fetchData = useServerFn(getAdminData);
  const setStatus = useServerFn(updateReservationStatus);
  const [data, setData] = useState<AdminPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const load = async () => {
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
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reservations = useMemo<FlatReservation[]>(() => {
    if (!data) return [];
    const flat: FlatReservation[] = [];
    for (const u of data.users) {
      for (const r of u.reservations) {
        flat.push({ ...r, user_name: u.full_name });
      }
    }
    flat.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return flat;
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reservations.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        (r.customer_name || "").toLowerCase().includes(q) ||
        (r.item_name || "").toLowerCase().includes(q) ||
        (r.customer_email || "").toLowerCase().includes(q)
      );
    });
  }, [reservations, search, statusFilter]);

  const handleStatusChange = async (id: string, status: string) => {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) return;
    try {
      await setStatus({ data: { token, reservationId: id, status } });
      toast.success("Estado atualizado");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
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
      <header className="mb-6">
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Admin</p>
        <h1 className="mt-1 font-display text-3xl italic md:text-4xl">Reservas</h1>
      </header>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Procurar por cliente, peça ou email…"
            className="w-full rounded-full border border-border bg-background py-2.5 pl-9 pr-4 text-sm outline-none focus:border-primary"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-full border border-border bg-background px-4 py-2.5 text-sm"
        >
          <option value="all">Todos os estados</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr className="text-left text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Peça / Experiência</th>
                <th className="px-4 py-3 font-medium">Data</th>
                <th className="px-4 py-3 font-medium">Hora</th>
                <th className="px-4 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-xs text-muted-foreground">
                    Sem reservas.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{r.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{r.customer_email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-foreground">{r.item_name}</p>
                      <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                        {r.item_type === "experiencia" ? "Experiência" : "Produto"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-foreground">{r.preferred_date || "—"}</td>
                    <td className="px-4 py-3 text-foreground">{r.reservation_date || "—"}</td>
                    <td className="px-4 py-3">
                      <select
                        value={r.status}
                        onChange={(e) => handleStatusChange(r.id, e.target.value)}
                        className={`${statusBadgeClasses(r.status)} cursor-pointer border-0 outline-none focus:ring-2 focus:ring-primary`}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}