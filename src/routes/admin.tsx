import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  getAdminData,
  updateReservationStatus,
  addBlockedSlot,
  deleteBlockedSlot,
  type AdminPayload,
  type AdminUser,
} from "@/server/admin";
import {
  Search,
  Users,
  Calendar,
  Mail,
  Heart,
  Sparkles,
  Loader2,
  CalendarOff,
  Trash2,
  Plus,
  Star,
  Package,
  Settings,
} from "lucide-react";
import { toast } from "sonner";
import { TIME_SLOTS, STATUS_OPTIONS, statusBadgeClasses } from "@/lib/reservations";
import { PRODUCTS } from "@/lib/data";

const productLabel = (id: string) => {
  const p = PRODUCTS.find((x) => x.id === id);
  return p ? `${p.brand} — ${p.name}` : id;
};

const ADMIN_EMAIL = "diogodigitalart@gmail.com";

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
  const addSlot = useServerFn(addBlockedSlot);
  const removeSlot = useServerFn(deleteBlockedSlot);
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

  const handleAddSlot = async (date: string, time: string | null, reason: string) => {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) return;
    try {
      await addSlot({ data: { token, date, time, reason } });
      toast.success("Bloqueio adicionado");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro a bloquear");
    }
  };

  const handleRemoveSlot = async (id: string) => {
    const { data: sess } = await supabase.auth.getSession();
    const token = sess.session?.access_token;
    if (!token) return;
    try {
      await removeSlot({ data: { token, id } });
      toast.success("Bloqueio removido");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro a remover");
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
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Painel</p>
          <h1 className="mt-2 font-display text-3xl italic text-foreground md:text-4xl">Admin</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/admin/produtos"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs uppercase tracking-[0.18em] text-foreground transition hover:bg-muted"
          >
            <Package size={14} />
            Gestão de Produtos
          </Link>
          <Link
            to="/admin/configuracoes"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-xs uppercase tracking-[0.18em] text-foreground transition hover:bg-muted"
          >
            <Settings size={14} />
            Configurações
          </Link>
        </div>
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

      {/* Blocked slots management */}
      <BlockedSlotsSection
        slots={data?.blockedSlots ?? []}
        onAdd={handleAddSlot}
        onRemove={handleRemoveSlot}
      />
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
                    className={`${statusBadgeClasses(r.status)} cursor-pointer border-0 outline-none focus:ring-2 focus:ring-primary`}
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
                {(() => {
                  const fb = user.feedback.find((f) => f.reservation_id === r.id);
                  if (!fb) return null;
                  return (
                    <div className="mt-3 rounded-lg border border-primary/30 bg-primary-soft/40 p-3 text-xs">
                      <div className="flex items-center gap-1 text-primary">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={12}
                            className={i < fb.rating ? "fill-primary text-primary" : "text-muted-foreground"}
                          />
                        ))}
                        <span className="ml-2 text-foreground">{fb.rating}/5</span>
                      </div>
                      <p className="mt-1.5 text-foreground">
                        Peça: <strong>{fb.piece_match}</strong> · Voltaria: <strong>{fb.return_intent}</strong>
                      </p>
                      {fb.wish_list_text && (
                        <p className="mt-1 text-foreground">"{fb.wish_list_text}"</p>
                      )}
                    </div>
                  );
                })()}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Feedback summary */}
      <Section icon={Star} title={`Feedback (${user.feedback.length})`}>
        {user.feedback.length === 0 ? (
          <Empty>Sem feedback recebido.</Empty>
        ) : (
          <ul className="space-y-2">
            {user.feedback.map((f) => (
              <li key={f.id} className="rounded-xl border border-border p-3 text-xs">
                <div className="flex items-center gap-1 text-primary">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={12}
                      className={i < f.rating ? "fill-primary text-primary" : "text-muted-foreground"}
                    />
                  ))}
                  <span className="ml-2 text-foreground">{f.rating}/5</span>
                  <span className="ml-auto text-[10px] text-muted-foreground">{fmt(f.created_at)}</span>
                </div>
                <p className="mt-1.5 text-foreground">
                  Peça: <strong>{f.piece_match}</strong> · Voltaria: <strong>{f.return_intent}</strong>
                </p>
                {f.wish_list_text && (
                  <p className="mt-1 italic text-foreground">"{f.wish_list_text}"</p>
                )}
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
                {w.product_label || productLabel(w.product_id)}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Notification preferences */}
      <Section icon={Mail} title="Preferências de contacto">
        <NotificationPreferenceView
          details={user.profile_details}
          phone={user.phone}
          wishlistItems={user.wishlist.map((w) => ({
            id: w.product_id,
            label: w.product_label || productLabel(w.product_id),
          }))}
        />
      </Section>

      {/* Profile details */}
      <Section icon={Sparkles} title="Preferências de estilo">
        <ProfileDetailsView details={user.profile_details} phone={user.phone} />
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

const PROFILE_DETAIL_LABELS: Record<string, string> = {
  city: "Cidade",
  birth_month: "Mês de nascimento",
  birth_year: "Ano de nascimento",
  style_preference: "Estilo preferido",
  favourite_colours: "Cores favoritas",
  occasions: "Ocasiões",
  heard_from: "Como nos conheceu",
};

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function ProfileDetailsView({
  details,
  phone,
}: {
  details: AdminUser["profile_details"];
  phone: string | null;
}) {
  const d = (details && typeof details === "object" && !Array.isArray(details)
    ? (details as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  const entries: Array<[string, string]> = [];
  if (phone) entries.push(["Telefone", phone]);
  for (const [k, label] of Object.entries(PROFILE_DETAIL_LABELS)) {
    const v = d[k];
    if (v == null || v === "") continue;
    if (Array.isArray(v)) {
      if (v.length === 0) continue;
      entries.push([label, v.join(", ")]);
    } else if (k === "birth_month") {
      const idx = Number(v) - 1;
      entries.push([label, MONTH_NAMES[idx] ?? String(v)]);
    } else {
      entries.push([label, String(v)]);
    }
  }
  if (entries.length === 0) {
    return <Empty>Sem preferências preenchidas.</Empty>;
  }
  return (
    <dl className="grid grid-cols-1 gap-3 rounded-xl bg-muted/40 p-4 sm:grid-cols-2">
      {entries.map(([label, value]) => (
        <div key={label}>
          <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
          <dd className="mt-0.5 text-sm text-foreground">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function NotificationPreferenceView({
  details,
  phone,
  wishlistItems,
}: {
  details: AdminUser["profile_details"];
  phone: string | null;
  wishlistItems: Array<{ id: string; label: string }>;
}) {
  const d = (details && typeof details === "object" && !Array.isArray(details)
    ? (details as Record<string, unknown>)
    : {}) as Record<string, unknown>;
  const pref = d.notification_preference as
    | { channel?: "email" | "whatsapp"; whatsapp?: string }
    | undefined;

  if (!pref || !pref.channel) {
    return <Empty>Sem preferência definida.</Empty>;
  }

  const isWhatsapp = pref.channel === "whatsapp";
  const whatsappNumber = pref.whatsapp || phone || "—";
  const topThree = wishlistItems.slice(0, 3);

  return (
    <div className="space-y-3 rounded-xl bg-muted/40 p-4">
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Canal</dt>
          <dd className="mt-0.5 text-sm text-foreground">{isWhatsapp ? "WhatsApp" : "Email"}</dd>
        </div>
        {isWhatsapp && (
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">Telefone</dt>
            <dd className="mt-0.5 text-sm text-foreground">{whatsappNumber}</dd>
          </div>
        )}
      </dl>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Peças a notificar (primeiras 3 da wishlist)
        </p>
        {topThree.length === 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">Wishlist vazia.</p>
        ) : (
          <ul className="mt-1.5 space-y-1">
            {topThree.map((it) => (
              <li key={it.id} className="text-sm text-foreground">
                · {it.label}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function BlockedSlotsSection({
  slots,
  onAdd,
  onRemove,
}: {
  slots: AdminPayload["blockedSlots"];
  onAdd: (date: string, time: string | null, reason: string) => void;
  onRemove: (id: string) => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date) {
      toast.error("Indica uma data.");
      return;
    }
    onAdd(date, time || null, reason);
    setDate("");
    setTime("");
    setReason("");
  };

  const fmtDate = (d: string) =>
    new Date(`${d}T00:00:00`).toLocaleDateString("pt-PT", {
      weekday: "short",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  return (
    <section className="mt-10 rounded-2xl border border-border bg-card p-6">
      <div className="mb-5 flex items-center gap-2">
        <CalendarOff className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Gestão de horários
        </h2>
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Bloqueia datas inteiras ou horas específicas em que a boutique está fechada ou indisponível.
      </p>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-3 rounded-xl bg-muted/30 p-4 md:grid-cols-[160px_160px_1fr_auto]"
      >
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Data</label>
          <input
            type="date"
            min={today}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Hora</label>
          <select
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          >
            <option value="">Dia inteiro</option>
            {TIME_SLOTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Motivo (opcional)
          </label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: Feriado, formação…"
            maxLength={500}
            className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-4 text-xs uppercase tracking-wider text-primary-foreground transition hover:bg-primary/90"
          >
            <Plus size={14} /> Bloquear
          </button>
        </div>
      </form>

      <div className="mt-6">
        {slots.length === 0 ? (
          <Empty>Sem bloqueios activos.</Empty>
        ) : (
          <ul className="space-y-2">
            {slots.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-background px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {fmtDate(s.blocked_date)}
                    {s.blocked_time ? ` · ${s.blocked_time}` : " · Dia inteiro"}
                  </p>
                  {s.reason && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{s.reason}</p>
                  )}
                </div>
                <button
                  onClick={() => onRemove(s.id)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs text-muted-foreground transition hover:border-destructive hover:text-destructive"
                >
                  <Trash2 size={13} /> Remover
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}