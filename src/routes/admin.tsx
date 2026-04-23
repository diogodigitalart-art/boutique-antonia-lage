import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { getAdminData, updateReservationStatus, type AdminPayload, type AdminUser } from "@/server/admin";
import { Search, Users, Calendar, Mail, Heart, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

const ADMIN_EMAIL = "diogodigitalart@gmail.com";
const STATUS_OPTIONS = ["Confirmada", "Em visita", "Cancelada"] as const;

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin | Boutique Antónia Lage" }] }),
  component: AdminPage,
});

function AdminPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user || (user.email || "").toLowerCase() !== ADMIN_EMAIL) {
      navigate({ to: "/", replace: true });
    }
  }, [user, loading, navigate]);

  if (loading || !user || (user.email || "").toLowerCase() !== ADMIN_EMAIL) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Layout>
      <AdminContent />
    </Layout>
  );
}

function AdminContent() {
  const fetchData = useServerFn(getAdminData);
  const setStatus = useServerFn(updateReservationStatus);
  const [data, setData] = useState<AdminPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = async () => {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) return;
    try {
      const result = await fetchData({ data: { token } });
      setData(result);
      setSelectedId((curr) => curr ?? result.users[0]?.id ?? null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro a carregar dados");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    if (!q) return data.users;
    return data.users.filter(
      (u) =>
        (u.full_name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q),
    );
  }, [data, search]);

  const selected = useMemo(
    () => data?.users.find((u) => u.id === selectedId) ?? null,
    [data, selectedId],
  );

  const handleStatusChange = async (reservationId: string, status: string) => {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) return;
    try {
      await setStatus({ data: { token, reservationId, status } });
      toast.success("Estado atualizado");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro a atualizar");
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
    <div className="mx-auto max-w-7xl px-4 py-10 md:py-16">
      <header className="mb-8">
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Painel</p>
        <h1 className="mt-2 font-display text-3xl italic text-foreground md:text-4xl">Admin</h1>
      </header>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard icon={Users} label="Utilizadores" value={data?.stats.totalUsers ?? 0} />
        <StatCard icon={Calendar} label="Reservas" value={data?.stats.totalReservations ?? 0} />
        <StatCard icon={Mail} label="Mensagens de contacto" value={data?.stats.totalContactMessages ?? 0} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        {/* User list */}
        <aside className="rounded-2xl border border-border bg-card p-4">
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Procurar por nome ou email…"
              className="w-full rounded-full border border-border bg-background py-2.5 pl-9 pr-4 text-sm outline-none focus:border-primary"
            />
          </div>
          <div className="max-h-[60vh] space-y-1 overflow-y-auto pr-1">
            {filtered.length === 0 && (
              <p className="px-3 py-6 text-center text-xs text-muted-foreground">Sem resultados</p>
            )}
            {filtered.map((u) => (
              <button
                key={u.id}
                onClick={() => setSelectedId(u.id)}
                className={`w-full rounded-xl px-3 py-2.5 text-left transition ${
                  selectedId === u.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
              >
                <p className="truncate text-sm font-medium">{u.full_name || "Sem nome"}</p>
                <p
                  className={`truncate text-xs ${
                    selectedId === u.id ? "text-primary-foreground/80" : "text-muted-foreground"
                  }`}
                >
                  {u.email || "—"}
                </p>
              </button>
            ))}
          </div>
        </aside>

        {/* Detail */}
        <section className="rounded-2xl border border-border bg-card p-6">
          {selected ? (
            <UserDetail user={selected} onStatusChange={handleStatusChange} />
          ) : (
            <p className="text-sm text-muted-foreground">Seleciona um utilizador para ver os detalhes.</p>
          )}
        </section>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-muted">
        <Icon className="h-5 w-5 text-foreground" />
      </div>
      <div>
        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
        <p className="mt-0.5 font-display text-2xl text-foreground">{value}</p>
      </div>
    </div>
  );
}

function UserDetail({
  user,
  onStatusChange,
}: {
  user: AdminUser;
  onStatusChange: (id: string, status: string) => void;
}) {
  const fmt = (iso: string) =>
    new Date(iso).toLocaleString("pt-PT", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="font-display text-2xl italic text-foreground">{user.full_name || "Sem nome"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{user.email || "—"}</p>
        <p className="mt-1 text-xs text-muted-foreground">Registado em {fmt(user.created_at)}</p>
      </div>

      {/* Quiz */}
      <Section icon={Sparkles} title="Quiz de estilo">
        {user.quiz ? (
          <div className="space-y-3 rounded-xl bg-muted/40 p-4">
            {user.quiz.profile_description && (
              <p className="text-sm italic text-foreground">{user.quiz.profile_description}</p>
            )}
            <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
              {Object.entries((user.quiz.answers as Record<string, unknown>) || {}).map(([k, v]) => (
                <div key={k}>
                  <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{k}</dt>
                  <dd className="text-foreground">{String(v)}</dd>
                </div>
              ))}
            </dl>
            <p className="text-[11px] text-muted-foreground">Submetido em {fmt(user.quiz.created_at)}</p>
          </div>
        ) : (
          <Empty>Sem quiz preenchido.</Empty>
        )}
      </Section>

      {/* Reservations */}
      <Section icon={Calendar} title={`Reservas (${user.reservations.length})`}>
        {user.reservations.length === 0 ? (
          <Empty>Sem reservas.</Empty>
        ) : (
          <ul className="space-y-3">
            {user.reservations.map((r) => (
              <li key={r.id} className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">
                      {r.item_type === "experiencia" ? "Experiência" : "Produto"}
                    </p>
                    <p className="mt-0.5 font-medium text-foreground">{r.item_name}</p>
                  </div>
                  <select
                    value={r.status}
                    onChange={(e) => onStatusChange(r.id, e.target.value)}
                    className="rounded-full border border-border bg-background px-3 py-1.5 text-xs outline-none focus:border-primary"
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <dl className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2">
                  <Row label="Cliente">{r.customer_name}</Row>
                  <Row label="Email">{r.customer_email}</Row>
                  <Row label="Telefone">{r.customer_phone}</Row>
                  <Row label="Data preferida">{r.preferred_date}</Row>
                </dl>
                {r.message && (
                  <p className="mt-3 rounded-lg bg-muted/40 p-3 text-xs text-foreground">{r.message}</p>
                )}
                <p className="mt-2 text-[11px] text-muted-foreground">Criada em {fmt(r.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Wishlist */}
      <Section icon={Heart} title={`Wishlist (${user.wishlist.length})`}>
        {user.wishlist.length === 0 ? (
          <Empty>Wishlist vazia.</Empty>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {user.wishlist.map((w) => (
              <li
                key={w.id}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-xs text-foreground"
              >
                {w.product_id}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Contact messages */}
      <Section icon={Mail} title={`Mensagens de contacto (${user.contactMessages.length})`}>
        {user.contactMessages.length === 0 ? (
          <Empty>Sem mensagens.</Empty>
        ) : (
          <ul className="space-y-3">
            {user.contactMessages.map((m) => (
              <li key={m.id} className="rounded-xl border border-border p-4">
                <p className="text-sm font-medium text-foreground">{m.subject}</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">{m.message}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">Enviada em {fmt(m.created_at)}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Users;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-foreground">{children}</dd>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl bg-muted/30 p-4 text-center text-xs text-muted-foreground">{children}</p>;
}