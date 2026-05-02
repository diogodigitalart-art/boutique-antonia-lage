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
import { Loader2, Search, ChevronLeft, ChevronRight, Calendar, List } from "lucide-react";
import { toast } from "sonner";
import { STATUS_OPTIONS, statusBadgeClasses } from "@/lib/reservations";
import { TIME_SLOTS } from "@/lib/reservations";

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
  const [tab, setTab] = useState<"produto" | "experiencia">("produto");
  const [viewMode, setViewMode] = useState<"table" | "agenda">("table");
  const [weekStart, setWeekStart] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay(); // 0 = Sun
    const diff = day === 0 ? -6 : 1 - day; // Monday-start week
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  });

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
      if ((r.item_type || "produto") !== tab) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        (r.customer_name || "").toLowerCase().includes(q) ||
        (r.item_name || "").toLowerCase().includes(q) ||
        (r.customer_email || "").toLowerCase().includes(q)
      );
    });
  }, [reservations, search, statusFilter, tab]);

  const counts = useMemo(() => {
    let p = 0, e = 0;
    for (const r of reservations) {
      if (r.status === "Cancelada") continue;
      if ((r.item_type || "produto") === "experiencia") e++;
      else p++;
    }
    return { produto: p, experiencia: e };
  }, [reservations]);

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
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Admin</p>
          <h1 className="mt-1 font-display text-3xl italic md:text-4xl">Reservas</h1>
        </div>
        <div className="inline-flex rounded-full border border-border bg-card p-1">
          <button
            onClick={() => setViewMode("table")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs uppercase tracking-wider transition ${
              viewMode === "table" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List size={13} /> Tabela
          </button>
          <button
            onClick={() => setViewMode("agenda")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs uppercase tracking-wider transition ${
              viewMode === "agenda" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Calendar size={13} /> Agenda
          </button>
        </div>
      </header>

      {viewMode === "agenda" ? (
        <AgendaView
          reservations={reservations}
          weekStart={weekStart}
          setWeekStart={setWeekStart}
        />
      ) : (
        <>

      <div className="mb-4 inline-flex rounded-full border border-border bg-card p-1">
        {([
          { key: "produto", label: "Produtos", count: counts.produto },
          { key: "experiencia", label: "Experiências", count: counts.experiencia },
        ] as const).map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              <span
                className={`inline-flex min-w-5 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] ${
                  active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-muted text-foreground"
                }`}
              >
                {t.count}
              </span>
            </button>
          );
        })}
      </div>

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
        </>
      )}
    </div>
  );
}

function AgendaView({
  reservations,
  weekStart,
  setWeekStart,
}: {
  reservations: FlatReservation[];
  weekStart: Date;
  setWeekStart: (d: Date) => void;
}) {
  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [weekStart]);

  const fmtDate = (d: Date) => d.toISOString().split("T")[0];
  const dayLabels = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

  // Index reservations by `${date}|${time}` (ignore Cancelada).
  const byKey = useMemo(() => {
    const map = new Map<string, FlatReservation[]>();
    for (const r of reservations) {
      if (r.status === "Cancelada") continue;
      const date = r.preferred_date;
      // reservation_date is "YYYY-MM-DD HH:MM" — extract HH:MM
      const time =
        r.reservation_date && date && r.reservation_date.startsWith(date + " ")
          ? r.reservation_date.slice(date.length + 1)
          : r.reservation_date || "";
      const key = `${date}|${time}`;
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return map;
  }, [reservations]);

  const shiftWeek = (delta: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + delta * 7);
    setWeekStart(d);
  };

  const today = new Date();
  const todayStr = fmtDate(today);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <button
          onClick={() => shiftWeek(-1)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border hover:bg-muted"
          aria-label="Semana anterior"
        >
          <ChevronLeft size={16} />
        </button>
        <p className="text-sm font-medium text-foreground">
          {days[0].toLocaleDateString("pt-PT", { day: "numeric", month: "short" })} —{" "}
          {days[6].toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" })}
        </p>
        <button
          onClick={() => shiftWeek(1)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border hover:bg-muted"
          aria-label="Semana seguinte"
        >
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[720px] grid-cols-[60px_repeat(7,minmax(0,1fr))]">
          {/* Header row */}
          <div className="border-b border-r border-border bg-muted/30" />
          {days.map((d, i) => {
            const isToday = fmtDate(d) === todayStr;
            return (
              <div
                key={i}
                className={`border-b border-r border-border bg-muted/30 px-2 py-2 text-center last:border-r-0 ${
                  isToday ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <p className="text-[10px] uppercase tracking-wider">{dayLabels[i]}</p>
                <p className={`text-sm font-medium ${isToday ? "text-primary" : "text-foreground"}`}>
                  {d.getDate()}
                </p>
              </div>
            );
          })}

          {/* Time rows */}
          {TIME_SLOTS.map((slot) => (
            <div className="contents" key={slot}>
              <div className="border-b border-r border-border bg-muted/20 px-2 py-2 text-right text-[11px] text-muted-foreground">
                {slot}
              </div>
              {days.map((d, i) => {
                const key = `${fmtDate(d)}|${slot}`;
                const items = byKey.get(key) ?? [];
                return (
                  <div
                    key={i}
                    className="min-h-[52px] border-b border-r border-border p-1 last:border-r-0"
                  >
                    {items.map((r) => (
                      <div
                        key={r.id}
                        title={`${r.customer_name} — ${r.item_name}`}
                        className={`mb-1 truncate rounded px-1.5 py-1 text-[10px] leading-tight ${
                          r.item_type === "experiencia"
                            ? "bg-primary/15 text-primary"
                            : "bg-foreground/10 text-foreground"
                        }`}
                      >
                        <p className="truncate font-medium">{r.customer_name}</p>
                        <p className="truncate opacity-70">{r.item_name}</p>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4 border-t border-border px-4 py-3 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-primary/15" />
          Experiência
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded bg-foreground/10" />
          Produto
        </span>
      </div>
    </div>
  );
}