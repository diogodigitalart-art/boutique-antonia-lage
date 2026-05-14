import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  getAdminData,
  updateReservationStatus,
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
  Star,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";
import { STATUS_OPTIONS, statusBadgeClasses } from "@/lib/reservations";
import { PRODUCTS } from "@/lib/data";

const productLabel = (id: string) => {
  const p = PRODUCTS.find((x) => x.id === id);
  return p ? `${p.brand} — ${p.name}` : id;
};

export const Route = createFileRoute("/admin_/clientes")({
  head: () => ({ meta: [{ title: "Clientes | Admin" }] }),
  component: () => (
    <AdminLayout>
      <ClientesContent />
    </AdminLayout>
  ),
});

function ClientesContent() {
  const fetchData = useServerFn(getAdminData);
  const setStatus = useServerFn(updateReservationStatus);
  const [data, setData] = useState<AdminPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<
    "recent" | "oldest" | "name_asc" | "name_desc" | "orders" | "inactive"
  >("recent");
  const [filter, setFilter] = useState<"all" | "with_orders" | "only_reservations" | "inactive">("all");

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
    let arr = data.users.slice();
    if (q) {
      arr = arr.filter(
        (u) =>
          (u.full_name || "").toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q),
      );
    }
    arr = arr.filter((u) => {
      const ordersN = u.orders.length;
      const resN = u.reservations.length;
      if (filter === "with_orders") return ordersN > 0;
      if (filter === "only_reservations") return resN > 0 && ordersN === 0;
      if (filter === "inactive") return ordersN === 0 && resN === 0;
      return true;
    });
    const lastActivity = (u: AdminUser) => {
      const dates: number[] = [];
      u.orders.forEach((o) => dates.push(new Date(o.created_at).getTime()));
      u.reservations.forEach((r) => dates.push(new Date(r.created_at).getTime()));
      return dates.length ? Math.max(...dates) : new Date(u.created_at).getTime();
    };
    arr.sort((a, b) => {
      switch (sortBy) {
        case "recent": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "name_asc": return (a.full_name || "").localeCompare(b.full_name || "");
        case "name_desc": return (b.full_name || "").localeCompare(a.full_name || "");
        case "orders": return b.orders.length - a.orders.length;
        case "inactive": return lastActivity(a) - lastActivity(b);
        default: return 0;
      }
    });
    return arr;
  }, [data, search, sortBy, filter]);

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
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
      <header className="mb-6">
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Admin</p>
        <h1 className="mt-1 font-display text-3xl italic md:text-4xl">Clientes</h1>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
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
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="mb-3 w-full rounded-full border border-border bg-background px-3 py-2 text-xs outline-none focus:border-primary"
          >
            <option value="recent">Mais recentes primeiro</option>
            <option value="oldest">Mais antigos primeiro</option>
            <option value="name_asc">Nome A–Z</option>
            <option value="name_desc">Nome Z–A</option>
            <option value="orders">Mais encomendas</option>
            <option value="inactive">Sem actividade recente</option>
          </select>
          <div className="mb-3 flex flex-wrap gap-1.5">
            {([
              ["all", "Todos"],
              ["with_orders", "Com encomendas"],
              ["only_reservations", "Só reservas"],
              ["inactive", "Sem actividade"],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`rounded-full border px-2.5 py-1 text-[11px] uppercase tracking-wider transition ${
                  filter === k
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:bg-muted"
                }`}
              >
                {label}
              </button>
            ))}
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
                <p
                  className={`mt-1 truncate text-[10px] ${
                    selectedId === u.id ? "text-primary-foreground/70" : "text-muted-foreground"
                  }`}
                >
                  Reg. {new Date(u.created_at).toLocaleDateString("pt-PT")} · {u.reservations.length} res · {u.orders.length} enc
                </p>
              </button>
            ))}
          </div>
        </aside>

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
      <div>
        <h2 className="font-display text-2xl italic text-foreground">{user.full_name || "Sem nome"}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{user.email || "—"}</p>
        <p className="mt-1 text-xs text-muted-foreground">Registado em {fmt(user.created_at)}</p>
      </div>

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

      <Section icon={Heart} title={`Wishlist (${user.wishlist.length})`}>
        {user.wishlist.length === 0 ? (
          <Empty>Wishlist vazia.</Empty>
        ) : (
          <ul className="space-y-2">
            {user.wishlist.map((w) => (
              <li
                key={w.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-background p-3"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                  {w.product_image ? (
                    <img src={w.product_image} alt="" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {w.product_label || productLabel(w.product_id)}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Adicionado em {fmt(w.created_at)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <div className="border-t border-border" />

      <Section icon={ShoppingBag} title={`Carrinho actual (${user.cart.length})`}>
        {user.cart.length === 0 ? (
          <Empty>Carrinho vazio.</Empty>
        ) : (
          <ul className="space-y-2">
            {user.cart.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-3 rounded-xl border border-border bg-background p-3"
              >
                <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                  {c.product_image ? (
                    <img
                      src={c.product_image}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {c.product_label}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Tamanho {c.size} · Qtd {c.quantity} · €{c.product_price.toFixed(2)} cada
                  </p>
                </div>
                <p className="shrink-0 text-sm font-medium text-foreground">
                  €{c.line_total.toFixed(2)}
                </p>
              </li>
            ))}
            <li className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-2.5 text-sm">
              <span className="text-muted-foreground">Total carrinho</span>
              <span className="font-medium text-foreground">
                €{user.cart.reduce((s, c) => s + c.line_total, 0).toFixed(2)}
              </span>
            </li>
          </ul>
        )}
      </Section>

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

      <Section icon={Sparkles} title="Preferências de estilo">
        <ProfileDetailsView details={user.profile_details} phone={user.phone} />
      </Section>

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