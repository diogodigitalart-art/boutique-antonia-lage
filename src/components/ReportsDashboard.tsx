import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Download,
  AlertTriangle,
  ShoppingBag,
  Heart,
  Package,
  Users as UsersIcon,
  Bell,
  Percent,
  Lightbulb,
  Mail,
  Tag,
  Sparkles,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfDay,
  startOfWeek,
  differenceInDays,
  getDaysInMonth,
  getDate,
} from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { EXPERIENCES } from "@/lib/data";
import { vipBadgeClasses, VIP_LABELS } from "@/lib/vip";

type OrderItem = {
  product_id?: string;
  product_uuid?: string | null;
  brand?: string | null;
  name?: string | null;
  size?: string;
  quantity: number;
  unit_price: number;
  line_total: number;
};
type OrderRow = {
  id: string;
  created_at: string;
  total: number;
  status: string;
  user_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  items: OrderItem[];
};
type ReservationRow = {
  id: string;
  created_at: string;
  preferred_date: string;
  item_type: string;
  item_name: string;
  status: string;
  experience_details: Record<string, unknown> | null;
};
type GiftCardRow = {
  id: string;
  created_at: string;
  amount: number;
  status: string;
};
type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  created_at: string;
};
type ProductRow = {
  id: string;
  legacy_id: string | null;
  name: string;
  brand: string;
  reference: string | null;
  barcode: string | null;
  sizes: Array<{ size: string; stock: number; reserved: number }>;
  is_active: boolean;
  price: number;
  cost_price: number | null;
  discount_percent: number | null;
};
type WishlistRow = { product_id: string; user_id: string; created_at: string };
type WaitlistRow = { product_id: string; size: string; notified_at: string | null };
type ReturnRow = { id: string; status: string; created_at: string };
type CartRow = { id: string; user_id: string; added_at: string };
type FeedbackRow = { rating: number; created_at: string };

const ORDER_EXCLUDE = new Set(["Cancelada"]);
const RETURN_PENDING = new Set(["Aguarda recepção", "Em análise", "Pendente"]);
const DEFAULT_COMMISSION_PCT = 15;
const COMMISSION_STORAGE_KEY = "admin.commissionPct";

type RangeKey = "this_week" | "this_month" | "last_month" | "last_3" | "this_year";

function fmtEur(n: number) {
  return `€${(n || 0).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function expPrice(r: ReservationRow): number {
  if (r.experience_details && typeof r.experience_details === "object") {
    const p = (r.experience_details as { price?: number }).price;
    if (typeof p === "number" && p > 0) return p;
  }
  const found = EXPERIENCES.find((e) => e.title === r.item_name);
  return found?.price ?? 0;
}

function StatCard({
  label,
  value,
  hint,
  trend,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  trend?: { pct: number; up: boolean } | { firstMonth: true } | null;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-5",
        accent
          ? "border-primary/40 bg-[oklch(0.96_0.02_268)]"
          : "border-border bg-card",
      )}
    >
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl text-foreground">{value}</p>
      {trend && "firstMonth" in trend && (
        <p className="mt-1 text-xs text-muted-foreground">Primeiro mês com dados</p>
      )}
      {trend && "up" in trend && (
        <p
          className={cn(
            "mt-1 flex items-center gap-1 text-xs font-medium",
            trend.up ? "text-emerald-600" : "text-rose-600",
          )}
        >
          {trend.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(trend.pct).toFixed(1)}% vs mês anterior
        </p>
      )}
      {hint && !trend && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

const PIE_COLORS = ["oklch(0.42 0.13 268)", "oklch(0.68 0.13 50)", "oklch(0.62 0.15 340)"];

export function ReportsDashboard() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [giftCards, setGiftCards] = useState<GiftCardRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [wishlists, setWishlists] = useState<WishlistRow[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistRow[]>([]);
  const [returns, setReturns] = useState<ReturnRow[]>([]);
  const [carts, setCarts] = useState<CartRow[]>([]);
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [rangeKey, setRangeKey] = useState<RangeKey>("this_month");
  const [commissionPct, setCommissionPct] = useState<number>(() => {
    if (typeof window === "undefined") return DEFAULT_COMMISSION_PCT;
    const raw = window.localStorage.getItem(COMMISSION_STORAGE_KEY);
    const n = raw ? Number(raw) : NaN;
    return Number.isFinite(n) && n >= 1 && n <= 30 ? n : DEFAULT_COMMISSION_PCT;
  });
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(COMMISSION_STORAGE_KEY, String(commissionPct));
    }
  }, [commissionPct]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [o, r, g, p, pr, w, wl, ret, c, f] = await Promise.all([
        supabase.from("orders").select("id, created_at, total, status, user_id, customer_name, customer_email, items").limit(5000),
        supabase.from("reservations").select("id, created_at, preferred_date, item_type, item_name, status, experience_details").limit(5000),
        supabase.from("gift_cards").select("id, created_at, amount, status").limit(5000),
        supabase.from("profiles").select("id, full_name, email, created_at").limit(5000),
        supabase.from("products").select("id, legacy_id, name, brand, reference, barcode, sizes, is_active, price, cost_price, discount_percent").limit(5000),
        supabase.from("wishlists").select("product_id, user_id, created_at").limit(5000),
        supabase.from("waitlist").select("product_id, size, notified_at").limit(5000),
        supabase.from("returns").select("id, status, created_at").limit(5000),
        supabase.from("cart_items").select("id, user_id, added_at").limit(5000),
        supabase.from("feedback").select("rating, created_at").limit(5000),
      ]);
      if (cancelled) return;
      if (o.error) toast.error("Falha ao carregar encomendas");
      setOrders(((o.data ?? []) as unknown as OrderRow[]).filter((x) => !ORDER_EXCLUDE.has(x.status)));
      setReservations(((r.data ?? []) as unknown as ReservationRow[]).filter((x) => x.status !== "Cancelada"));
      setGiftCards(((g.data ?? []) as unknown as GiftCardRow[]).filter((x) => x.status !== "cancelled" && x.status !== "failed"));
      setProfiles((p.data ?? []) as unknown as ProfileRow[]);
      setProducts((pr.data ?? []) as unknown as ProductRow[]);
      setWishlists((w.data ?? []) as unknown as WishlistRow[]);
      setWaitlist(((wl.data ?? []) as unknown as WaitlistRow[]).filter((x) => !x.notified_at));
      setReturns((ret.data ?? []) as unknown as ReturnRow[]);
      setCarts((c.data ?? []) as unknown as CartRow[]);
      setFeedback((f.data ?? []) as unknown as FeedbackRow[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const now = new Date();

  const range = useMemo(() => {
    switch (rangeKey) {
      case "this_week":
        return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfDay(now), label: "Esta semana" };
      case "this_month":
        return { from: startOfMonth(now), to: endOfMonth(now), label: format(now, "MMMM yyyy", { locale: pt }) };
      case "last_month": {
        const lm = subMonths(now, 1);
        return { from: startOfMonth(lm), to: endOfMonth(lm), label: format(lm, "MMMM yyyy", { locale: pt }) };
      }
      case "last_3":
        return { from: startOfMonth(subMonths(now, 2)), to: endOfMonth(now), label: "Últimos 3 meses" };
      case "this_year":
        return { from: startOfYear(now), to: endOfDay(now), label: format(now, "yyyy") };
    }
  }, [rangeKey]);

  const inRange = <T extends { created_at: string }>(arr: T[]) =>
    arr.filter((x) => {
      const d = new Date(x.created_at).getTime();
      return d >= range.from.getTime() && d <= range.to.getTime();
    });

  // ===== Financial overview =====
  const totalOrdersAll = orders.reduce((s, o) => s + Number(o.total || 0), 0);
  const totalResvAll = reservations.reduce((s, r) => s + expPrice(r), 0);
  const totalGiftAll = giftCards.reduce((s, g) => s + Number(g.amount || 0), 0);
  const totalRevenueAll = totalOrdersAll + totalResvAll + totalGiftAll;

  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const lastMonthStart = startOfMonth(subMonths(now, 1));
  const lastMonthEnd = endOfMonth(subMonths(now, 1));

  const inMonth = <T extends { created_at: string }>(arr: T[], s: Date, e: Date) =>
    arr.filter((x) => {
      const d = new Date(x.created_at).getTime();
      return d >= s.getTime() && d <= e.getTime();
    });

  const thisMonthOrders = inMonth(orders, monthStart, monthEnd);
  const lastMonthOrders = inMonth(orders, lastMonthStart, lastMonthEnd);
  const thisMonthResv = inMonth(reservations, monthStart, monthEnd);
  const thisMonthGift = inMonth(giftCards, monthStart, monthEnd);
  const lastMonthResv = inMonth(reservations, lastMonthStart, lastMonthEnd);
  const lastMonthGift = inMonth(giftCards, lastMonthStart, lastMonthEnd);

  const revOrdersM = thisMonthOrders.reduce((s, o) => s + Number(o.total || 0), 0);
  const revResvM = thisMonthResv.reduce((s, r) => s + expPrice(r), 0);
  const revGiftM = thisMonthGift.reduce((s, g) => s + Number(g.amount || 0), 0);
  const revThisMonth = revOrdersM + revResvM + revGiftM;
  const revLastMonth =
    lastMonthOrders.reduce((s, o) => s + Number(o.total || 0), 0) +
    lastMonthResv.reduce((s, r) => s + expPrice(r), 0) +
    lastMonthGift.reduce((s, g) => s + Number(g.amount || 0), 0);

  const monthTrend: { pct: number; up: boolean } | { firstMonth: true } | null =
    revLastMonth > 0 && revThisMonth > 0
      ? { pct: ((revThisMonth - revLastMonth) / revLastMonth) * 100, up: revThisMonth >= revLastMonth }
      : revLastMonth === 0 && revThisMonth > 0
        ? { firstMonth: true }
        : null;

  const commission = (revThisMonth * commissionPct) / 100;

  // Donut breakdown
  const donutData = [
    { name: "Encomendas online", value: Math.round(revOrdersM * 100) / 100 },
    { name: "Experiências", value: Math.round(revResvM * 100) / 100 },
    { name: "Cartões Oferta", value: Math.round(revGiftM * 100) / 100 },
  ].filter((d) => d.value > 0);

  // ===== Revenue trend last 6 months + projection =====
  const monthlySeries = useMemo(() => {
    const arr: { month: string; revenue: number; projected?: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const m = subMonths(now, i);
      const s = startOfMonth(m);
      const e = endOfMonth(m);
      const rev =
        inMonth(orders, s, e).reduce((a, o) => a + Number(o.total || 0), 0) +
        inMonth(reservations, s, e).reduce((a, r) => a + expPrice(r), 0) +
        inMonth(giftCards, s, e).reduce((a, g) => a + Number(g.amount || 0), 0);
      const entry: { month: string; revenue: number; projected?: number } = {
        month: format(m, "MMM", { locale: pt }),
        revenue: Math.round(rev * 100) / 100,
      };
      if (i === 0) {
        const daysIn = getDaysInMonth(now);
        const dayOfMonth = getDate(now);
        if (dayOfMonth > 0) {
          entry.projected = Math.round((rev / dayOfMonth) * daysIn * 100) / 100;
        }
      }
      arr.push(entry);
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, reservations, giftCards]);

  // ===== Customer behaviour =====
  const buyerIds = new Set(orders.map((o) => o.user_id).filter(Boolean) as string[]);
  const conversion = profiles.length > 0 ? (buyerIds.size / profiles.length) * 100 : 0;
  const revInRangeOrders = inRange(orders);
  const avgOrderValue = revInRangeOrders.length > 0
    ? revInRangeOrders.reduce((s, o) => s + Number(o.total || 0), 0) / revInRangeOrders.length
    : 0;

  const newCustomersM = inMonth(profiles, monthStart, monthEnd).length;
  const buyersThisMonth = new Set(thisMonthOrders.map((o) => o.user_id).filter(Boolean) as string[]);
  const returningThisMonth = Array.from(buyersThisMonth).filter((uid) => {
    const profile = profiles.find((p) => p.id === uid);
    if (!profile) return false;
    return new Date(profile.created_at) < monthStart;
  }).length;

  const spendByUser = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of orders) {
      if (!o.user_id) continue;
      if (o.status !== "Entregue") continue;
      m.set(o.user_id, (m.get(o.user_id) || 0) + Number(o.total || 0));
    }
    return m;
  }, [orders]);

  const topCustomers = useMemo(() => {
    return Array.from(spendByUser.entries())
      .map(([uid, total]) => {
        const p = profiles.find((x) => x.id === uid);
        const vip: "none" | "silver" | "gold" | "platinum" =
          total >= 3000 ? "platinum" : total >= 1500 ? "gold" : total >= 500 ? "silver" : "none";
        return {
          uid,
          name: p?.full_name || "—",
          email: p?.email || "—",
          total,
          vip,
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [spendByUser, profiles]);

  // ===== Products intelligence =====
  const productByLegacy = useMemo(() => {
    const m = new Map<string, ProductRow>();
    for (const p of products) {
      if (p.legacy_id) m.set(p.legacy_id, p);
      m.set(p.id, p);
    }
    return m;
  }, [products]);

  const topProductsRevenue = useMemo(() => {
    const map = new Map<string, { name: string; brand: string; units: number; revenue: number }>();
    for (const o of thisMonthOrders) {
      for (const it of o.items ?? []) {
        const key = `${it.brand ?? ""}|${it.name ?? "—"}`;
        const prev = map.get(key) ?? { name: it.name ?? "—", brand: it.brand ?? "—", units: 0, revenue: 0 };
        prev.units += Number(it.quantity || 0);
        prev.revenue += Number(it.line_total || 0);
        map.set(key, prev);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [thisMonthOrders]);

  const purchasedProductIds = useMemo(() => {
    const s = new Set<string>();
    for (const o of orders) {
      for (const it of o.items ?? []) {
        if (it.product_id) s.add(it.product_id);
        if (it.product_uuid) s.add(it.product_uuid);
      }
    }
    return s;
  }, [orders]);

  const wishlistOnly = useMemo(() => {
    const counts = new Map<string, number>();
    for (const w of wishlists) {
      if (purchasedProductIds.has(w.product_id)) continue;
      counts.set(w.product_id, (counts.get(w.product_id) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([pid, count]) => {
        const p = productByLegacy.get(pid);
        return {
          pid,
          name: p?.name || "Produto",
          brand: p?.brand || "—",
          count,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [wishlists, purchasedProductIds, productByLegacy]);

  const criticalStock = useMemo(() => {
    return products
      .filter((p) => p.is_active)
      .map((p) => {
        const avail = (p.sizes || []).reduce(
          (s, sz) => s + Math.max(0, Number(sz.stock || 0) - Number(sz.reserved || 0)),
          0,
        );
        return { ...p, avail };
      })
      .filter((p) => p.avail === 0 || p.avail === 1)
      .sort((a, b) => a.avail - b.avail)
      .slice(0, 8);
  }, [products]);

  // ===== Sold units per product (across all non-cancelled orders) =====
  const soldByProduct = useMemo(() => {
    const m = new Map<string, { units: number; revenue: number }>();
    for (const o of orders) {
      for (const it of o.items ?? []) {
        const key = it.product_uuid || it.product_id;
        if (!key) continue;
        const prev = m.get(key) ?? { units: 0, revenue: 0 };
        prev.units += Number(it.quantity || 0);
        prev.revenue += Number(it.line_total || 0);
        m.set(key, prev);
      }
    }
    return m;
  }, [orders]);

  // ===== Margin analysis (only products with cost_price + actual sales) =====
  const marginRows = useMemo(() => {
    const rows: Array<{
      id: string;
      name: string;
      brand: string;
      reference: string;
      salePrice: number;
      costPrice: number;
      marginEur: number;
      marginPct: number;
      units: number;
      profit: number;
    }> = [];
    for (const p of products) {
      if (p.cost_price == null || Number(p.cost_price) <= 0) continue;
      const sold =
        soldByProduct.get(p.id) ||
        (p.legacy_id ? soldByProduct.get(p.legacy_id) : undefined);
      if (!sold || sold.units <= 0) continue;
      const avgSale = sold.revenue / sold.units;
      const cost = Number(p.cost_price);
      const marginEur = avgSale - cost;
      const marginPct = avgSale > 0 ? (marginEur / avgSale) * 100 : 0;
      rows.push({
        id: p.id,
        name: p.name,
        brand: p.brand,
        reference: p.reference || "—",
        salePrice: avgSale,
        costPrice: cost,
        marginEur,
        marginPct,
        units: sold.units,
        profit: marginEur * sold.units,
      });
    }
    return rows.sort((a, b) => a.marginPct - b.marginPct);
  }, [products, soldByProduct]);

  const marginStats = useMemo(() => {
    if (marginRows.length === 0) return null;
    const avg = marginRows.reduce((s, r) => s + r.marginPct, 0) / marginRows.length;
    const best = [...marginRows].sort((a, b) => b.marginPct - a.marginPct)[0];
    const worst = marginRows[0];
    return { avg, best, worst };
  }, [marginRows]);

  // ===== Products sold below cost =====
  const lossProducts = useMemo(() => {
    const map = new Map<string, { name: string; brand: string; lossPerUnit: number; units: number }>();
    for (const o of orders) {
      for (const it of o.items ?? []) {
        const key = it.product_uuid || it.product_id;
        if (!key) continue;
        const p = productByLegacy.get(key);
        if (!p || p.cost_price == null || Number(p.cost_price) <= 0) continue;
        const cost = Number(p.cost_price);
        const unit = Number(it.unit_price || 0);
        if (unit > 0 && unit < cost) {
          const lossPerUnit = cost - unit;
          const prev = map.get(key) ?? { name: p.name, brand: p.brand, lossPerUnit, units: 0 };
          prev.lossPerUnit = Math.max(prev.lossPerUnit, lossPerUnit);
          prev.units += Number(it.quantity || 0);
          map.set(key, prev);
        }
      }
    }
    return Array.from(map.values());
  }, [orders, productByLegacy]);

  // ===== Experiences =====
  const expStats = useMemo(() => {
    const types = ["Boutique Privada", "Personal Styling", "Arranjos e Costura"];
    const byType = types.map((t) => ({
      type: t,
      count: thisMonthResv.filter((r) => r.item_name === t).length,
    }));
    const revenue = thisMonthResv.reduce((s, r) => s + expPrice(r), 0);
    const monthFeedback = inMonth(feedback, monthStart, monthEnd);
    const avgRating = monthFeedback.length > 0
      ? monthFeedback.reduce((s, f) => s + Number(f.rating || 0), 0) / monthFeedback.length
      : 0;
    return { byType, revenue, avgRating, ratingCount: monthFeedback.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thisMonthResv, feedback]);

  // ===== Smart alerts =====
  const abandonedCarts = useMemo(() => {
    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const users = new Set<string>();
    for (const c of carts) {
      if (new Date(c.added_at).getTime() < cutoff) users.add(c.user_id);
    }
    return users.size;
  }, [carts]);

  const outOfStockThisMonth = useMemo(() => {
    return products.filter((p) => {
      const avail = (p.sizes || []).reduce(
        (s, sz) => s + Math.max(0, Number(sz.stock || 0) - Number(sz.reserved || 0)),
        0,
      );
      return p.is_active && avail === 0;
    }).length;
  }, [products]);

  const inactiveVips = useMemo(() => {
    const cutoff = Date.now() - 60 * 24 * 60 * 60 * 1000;
    const lastOrderByUser = new Map<string, number>();
    for (const o of orders) {
      if (!o.user_id) continue;
      const t = new Date(o.created_at).getTime();
      const prev = lastOrderByUser.get(o.user_id) || 0;
      if (t > prev) lastOrderByUser.set(o.user_id, t);
    }
    const list: Array<{ uid: string; name: string; email: string; vip: string; lastDays: number }> = [];
    for (const [uid, total] of spendByUser.entries()) {
      if (total < 1500) continue; // gold+
      const last = lastOrderByUser.get(uid) || 0;
      if (last && last < cutoff) {
        const p = profiles.find((x) => x.id === uid);
        list.push({
          uid,
          name: p?.full_name || "—",
          email: p?.email || "—",
          vip: total >= 3000 ? "Platinum" : "Gold",
          lastDays: differenceInDays(now, new Date(last)),
        });
      }
    }
    return list.sort((a, b) => b.lastDays - a.lastDays);
  }, [orders, spendByUser, profiles, now]);

  const pendingReturns = returns.filter((r) => RETURN_PENDING.has(r.status)).length;

  const waitlistOos = useMemo(() => {
    const oosIds = new Set(
      products
        .filter((p) => {
          const avail = (p.sizes || []).reduce(
            (s, sz) => s + Math.max(0, Number(sz.stock || 0) - Number(sz.reserved || 0)),
            0,
          );
          return avail === 0;
        })
        .map((p) => p.id),
    );
    return waitlist.filter((w) => oosIds.has(w.product_id)).length;
  }, [waitlist, products]);

  // ===== Commission detail =====
  const completedInRange = useMemo(
    () => inRange(orders).filter((o) => o.status === "Entregue"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orders, range],
  );
  const commissionTotal = completedInRange.reduce((s, o) => s + Number(o.total || 0), 0);
  const commissionDue = (commissionTotal * commissionPct) / 100;

  // ===== Intelligent insights =====
  type Insight = {
    id: string;
    icon: React.ReactNode;
    text: string;
    actionLabel?: string;
    actionHref?: string;
    tone: "info" | "success" | "warn";
  };
  const insights: Insight[] = useMemo(() => {
    const out: Insight[] = [];
    for (const w of wishlistOnly) {
      if (w.count >= 3) {
        out.push({
          id: `wl-${w.pid}`,
          icon: <Tag className="h-4 w-4" />,
          text: `Considera aplicar um desconto de 10–15% ao ${w.brand} ${w.name} — está na wishlist de ${w.count} clientes mas nunca foi comprado.`,
          actionLabel: "Gerir promoções",
          actionHref: "/admin/promocoes",
          tone: "info",
        });
      }
    }
    for (const [key, sold] of soldByProduct.entries()) {
      if (sold.units >= 3) {
        const p = productByLegacy.get(key);
        if (!p) continue;
        out.push({
          id: `bs-${key}`,
          icon: <Sparkles className="h-4 w-4" />,
          text: `O ${p.brand} ${p.name} é um bestseller (${sold.units} unidades) — garante stock suficiente.`,
          actionLabel: "Ver produto",
          actionHref: "/admin/produtos",
          tone: "success",
        });
      }
    }
    if (marginStats && marginStats.avg < 30) {
      out.push({
        id: "low-margin",
        icon: <Percent className="h-4 w-4" />,
        text: `A margem média da colecção está em ${marginStats.avg.toFixed(1)}% (abaixo de 30%). Considera rever os preços ou reduzir descontos.`,
        tone: "warn",
      });
    }
    if (inactiveVips.length > 0) {
      out.push({
        id: "vip-inactive",
        icon: <UsersIcon className="h-4 w-4" />,
        text: `${inactiveVips.length} cliente${inactiveVips.length === 1 ? "" : "s"} VIP não compra${inactiveVips.length === 1 ? "" : "m"} há mais de 60 dias. Considera enviar um código de desconto exclusivo.`,
        actionLabel: "Criar código",
        actionHref: "/admin/promocoes",
        tone: "info",
      });
    }
    if (abandonedCarts > 0) {
      out.push({
        id: "carts",
        icon: <Mail className="h-4 w-4" />,
        text: `${abandonedCarts} carrinho${abandonedCarts === 1 ? "" : "s"} abandonado${abandonedCarts === 1 ? "" : "s"} há mais de 7 dias. Um email de lembrete pode recuperar estas vendas.`,
        actionLabel: "Ver clientes",
        actionHref: "/admin/clientes",
        tone: "info",
      });
    }
    return out;
  }, [wishlistOnly, soldByProduct, productByLegacy, marginStats, inactiveVips, abandonedCarts]);

  async function generatePDF() {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();

    doc.setFillColor(58, 78, 154);
    doc.rect(0, 0, pageW, 90, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(22);
    doc.text("Boutique Antónia Lage", 40, 45);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text("Relatório de comissão — canal digital", 40, 65);

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    doc.text(`Emitido em ${format(now, "dd/MM/yyyy")}`, pageW - 40, 45, { align: "right" });

    let y = 120;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(`Período: ${range.label}`, 40, y);
    y += 24;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(110, 110, 110);
    doc.text("Data", 40, y);
    doc.text("Cliente", 110, y);
    doc.text("Valor", pageW - 180, y, { align: "right" });
    doc.text(`Comissão (${commissionPct}%)`, pageW - 40, y, { align: "right" });
    y += 6;
    doc.setDrawColor(220, 220, 220);
    doc.line(40, y, pageW - 40, y);
    y += 14;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 30, 30);
    for (const o of completedInRange) {
      if (y > pageH - 120) {
        doc.addPage();
        y = 60;
      }
      const c = (Number(o.total || 0) * commissionPct) / 100;
      doc.text(format(new Date(o.created_at), "dd/MM/yyyy"), 40, y);
      const name = (o.customer_name || o.customer_email || "—").slice(0, 30);
      doc.text(name, 110, y);
      doc.text(fmtEur(Number(o.total || 0)), pageW - 180, y, { align: "right" });
      doc.text(fmtEur(c), pageW - 40, y, { align: "right" });
      y += 16;
    }

    y += 10;
    doc.setDrawColor(180, 180, 180);
    doc.line(40, y, pageW - 40, y);
    y += 22;

    doc.setFillColor(238, 241, 250);
    doc.roundedRect(40, y, pageW - 80, 90, 6, 6, "F");
    doc.setTextColor(58, 78, 154);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Total vendas no período", 60, y + 24);
    doc.text(fmtEur(commissionTotal), pageW - 60, y + 24, { align: "right" });
    doc.text(`Percentagem de comissão`, 60, y + 44);
    doc.text(`${commissionPct}%`, pageW - 60, y + 44, { align: "right" });
    doc.setFontSize(13);
    doc.text("Comissão a receber", 60, y + 74);
    doc.text(fmtEur(commissionDue), pageW - 60, y + 74, { align: "right" });

    y = pageH - 80;
    doc.setTextColor(80, 80, 80);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text("_______________________________", pageW - 40, y, { align: "right" });
    doc.text("Diogo Faria — Gestor de Canal Digital", pageW - 40, y + 16, { align: "right" });

    doc.save(`comissao-${format(now, "yyyy-MM")}.pdf`);
    toast.success("Relatório gerado");
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          A carregar dados…
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Admin</p>
          <h1 className="mt-1 font-display text-3xl italic md:text-4xl">Relatórios</h1>
          <p className="mt-1 text-sm text-muted-foreground">Período: {range.label}</p>
        </div>
        <Select value={rangeKey} onValueChange={(v) => setRangeKey(v as RangeKey)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="this_week">Esta semana</SelectItem>
            <SelectItem value="this_month">Este mês</SelectItem>
            <SelectItem value="last_month">Último mês</SelectItem>
            <SelectItem value="last_3">Últimos 3 meses</SelectItem>
            <SelectItem value="this_year">Este ano</SelectItem>
          </SelectContent>
        </Select>
      </header>

      {/* 1. Financial overview */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Receita total" value={fmtEur(totalRevenueAll)} hint="Todos os canais" />
        <StatCard label="Receita este mês" value={fmtEur(revThisMonth)} trend={monthTrend} />
        <StatCard label="Receita mês anterior" value={fmtEur(revLastMonth)} />
        <StatCard label={`A minha comissão (${commissionPct}%)`} value={fmtEur(commission)} accent />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-xl italic">Receita por canal — este mês</h2>
          <div className="mt-4 h-72">
            {donutData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Sem dados</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100} paddingAngle={2}>
                    {donutData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmtEur(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* 2. Revenue trend */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-display text-xl italic">Receita — últimos 6 meses</h2>
          <p className="text-xs text-muted-foreground">Linha sólida: real. Tracejada: projecção do mês actual.</p>
          <div className="mt-4 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlySeries}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                <XAxis dataKey="month" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `€${v}`} />
                <Tooltip formatter={(v: number) => fmtEur(v)} />
                <Line type="monotone" dataKey="revenue" stroke="oklch(0.42 0.13 268)" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="projected" stroke="oklch(0.42 0.13 268)" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* 3. Customer behaviour */}
      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <UsersIcon className="h-4 w-4 text-primary" />
          <h2 className="font-display text-xl italic">Comportamento de clientes</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Taxa de conversão" value={`${conversion.toFixed(1)}%`} hint={`${buyerIds.size}/${profiles.length} compraram`} />
          <StatCard label="Ticket médio" value={fmtEur(avgOrderValue)} hint="Período seleccionado" />
          <StatCard label="Novos clientes (mês)" value={String(newCustomersM)} />
          <StatCard label="Clientes recorrentes (mês)" value={String(returningThisMonth)} />
        </div>

        <h3 className="mt-6 mb-2 text-sm font-medium">Top 5 clientes por valor</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                <th className="pb-2 font-normal">Nome</th>
                <th className="pb-2 font-normal">Email</th>
                <th className="pb-2 font-normal">VIP</th>
                <th className="pb-2 text-right font-normal">Total</th>
              </tr>
            </thead>
            <tbody>
              {topCustomers.length === 0 && (
                <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">Sem dados</td></tr>
              )}
              {topCustomers.map((c) => (
                <tr key={c.uid} className="border-t border-border">
                  <td className="py-2">{c.name}</td>
                  <td className="py-2 text-muted-foreground">{c.email}</td>
                  <td className="py-2"><span className={vipBadgeClasses(c.vip)}>{VIP_LABELS[c.vip]}</span></td>
                  <td className="py-2 text-right font-medium">{fmtEur(c.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. Products intelligence */}
      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-primary" />
          <h2 className="font-display text-xl italic">Produtos</h2>
        </div>
        {lossProducts.length > 0 && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-rose-700" />
              <div className="flex-1">
                <p className="text-sm font-medium text-rose-900">
                  Atenção: {lossProducts.length} produto{lossProducts.length === 1 ? "" : "s"} vendido{lossProducts.length === 1 ? "" : "s"} abaixo do preço de custo
                </p>
                <ul className="mt-2 space-y-1 text-xs text-rose-800">
                  {lossProducts.map((p, i) => (
                    <li key={i}>
                      <span className="font-medium">{p.brand} — {p.name}</span>
                      <span className="text-rose-700"> · perda de {fmtEur(p.lossPerUnit)} por unidade ({p.units} un.)</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
        <Tabs defaultValue="bestsellers">
          <TabsList>
            <TabsTrigger value="bestsellers">Mais vendidos</TabsTrigger>
            <TabsTrigger value="wishlist">Wishlist</TabsTrigger>
            <TabsTrigger value="margins">Margens</TabsTrigger>
          </TabsList>

          <TabsContent value="bestsellers" className="mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  <th className="pb-2 font-normal">Produto</th>
                  <th className="pb-2 font-normal">Marca</th>
                  <th className="pb-2 text-right font-normal">Un.</th>
                  <th className="pb-2 text-right font-normal">Receita</th>
                </tr>
              </thead>
              <tbody>
                {topProductsRevenue.length === 0 && (
                  <tr><td colSpan={4} className="py-4 text-center text-muted-foreground">Sem dados</td></tr>
                )}
                {topProductsRevenue.map((p, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="py-2">{p.name}</td>
                    <td className="py-2 text-muted-foreground">{p.brand}</td>
                    <td className="py-2 text-right">{p.units}</td>
                    <td className="py-2 text-right font-medium">{fmtEur(p.revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TabsContent>

          <TabsContent value="wishlist" className="mt-4">
            <p className="mb-2 text-xs text-muted-foreground">Oportunidade para promoção dirigida.</p>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                  <th className="pb-2 font-normal">Produto</th>
                  <th className="pb-2 font-normal">Marca</th>
                  <th className="pb-2 text-right font-normal">Na wishlist</th>
                </tr>
              </thead>
              <tbody>
                {wishlistOnly.length === 0 && (
                  <tr><td colSpan={3} className="py-4 text-center text-muted-foreground">Sem dados</td></tr>
                )}
                {wishlistOnly.map((p) => (
                  <tr key={p.pid} className="border-t border-border">
                    <td className="py-2">{p.name}</td>
                    <td className="py-2 text-muted-foreground">{p.brand}</td>
                    <td className="py-2 text-right font-medium">{p.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TabsContent>

          <TabsContent value="margins" className="mt-4">
            {marginRows.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Sem dados. Preenche o preço de custo nos produtos vendidos para ver a análise de margens.
              </p>
            ) : (
              <>
                {marginStats && (
                  <div className="mb-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-border bg-muted/30 p-4">
                      <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Margem média</p>
                      <p className="mt-1 font-display text-xl">{marginStats.avg.toFixed(1)}%</p>
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                      <p className="text-[10px] uppercase tracking-[0.15em] text-emerald-700">Mais rentável</p>
                      <p className="mt-1 text-sm font-medium text-emerald-900">{marginStats.best.brand} — {marginStats.best.name}</p>
                      <p className="text-xs text-emerald-700">{marginStats.best.marginPct.toFixed(1)}% · {fmtEur(marginStats.best.profit)} lucro</p>
                    </div>
                    <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
                      <p className="text-[10px] uppercase tracking-[0.15em] text-rose-700">Menos rentável</p>
                      <p className="mt-1 text-sm font-medium text-rose-900">{marginStats.worst.brand} — {marginStats.worst.name}</p>
                      <p className="text-xs text-rose-700">{marginStats.worst.marginPct.toFixed(1)}% · {fmtEur(marginStats.worst.profit)} lucro</p>
                    </div>
                  </div>
                )}
                <p className="mb-2 text-xs text-muted-foreground">Ordenado por margem ascendente. Apenas produtos com preço de custo definido e que já foram vendidos.</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                        <th className="pb-2 font-normal">Produto</th>
                        <th className="pb-2 font-normal">Ref.</th>
                        <th className="pb-2 text-right font-normal">P. venda</th>
                        <th className="pb-2 text-right font-normal">P. custo</th>
                        <th className="pb-2 text-right font-normal">Margem €</th>
                        <th className="pb-2 text-right font-normal">Margem %</th>
                        <th className="pb-2 text-right font-normal">Un.</th>
                        <th className="pb-2 text-right font-normal">Lucro</th>
                      </tr>
                    </thead>
                    <tbody>
                      {marginRows.map((r) => {
                        const pctClass =
                          r.marginPct < 20
                            ? "bg-rose-100 text-rose-800"
                            : r.marginPct < 40
                              ? "bg-amber-100 text-amber-800"
                              : "bg-emerald-100 text-emerald-800";
                        return (
                          <tr key={r.id} className="border-t border-border">
                            <td className="py-2">
                              <div className="text-sm">{r.name}</div>
                              <div className="text-xs text-muted-foreground">{r.brand}</div>
                            </td>
                            <td className="py-2 text-xs text-muted-foreground">{r.reference}</td>
                            <td className="py-2 text-right">{fmtEur(r.salePrice)}</td>
                            <td className="py-2 text-right text-muted-foreground">{fmtEur(r.costPrice)}</td>
                            <td className="py-2 text-right">{fmtEur(r.marginEur)}</td>
                            <td className="py-2 text-right">
                              <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", pctClass)}>
                                {r.marginPct.toFixed(1)}%
                              </span>
                            </td>
                            <td className="py-2 text-right">{r.units}</td>
                            <td className="py-2 text-right font-medium">{fmtEur(r.profit)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </section>

      {criticalStock.length > 0 && (
        <section className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <Package className="h-4 w-4 text-orange-600" />
            <h3 className="text-sm font-medium">Stock crítico (esgotado ou última unidade)</h3>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {criticalStock.map((p) => (
              <div key={p.id} className="rounded-xl border-l-4 border-l-orange-500 border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">{p.brand}</p>
                <p className="text-sm font-medium">{p.name}</p>
                {(p.reference || p.barcode) && (
                  <p className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    Ref: {p.reference || p.barcode}
                  </p>
                )}
                <p className="mt-1 text-xs text-orange-700">
                  {p.avail === 0 ? "Esgotado" : "1 unidade disponível"}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 5. Experiences & services */}
      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <h2 className="font-display text-xl italic">Experiências & serviços — este mês</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {expStats.byType.map((b) => (
            <StatCard key={b.type} label={b.type} value={String(b.count)} hint="Reservas" />
          ))}
          <StatCard label="Receita experiências" value={fmtEur(expStats.revenue)} />
          <StatCard
            label="Rating médio"
            value={expStats.ratingCount > 0 ? `${expStats.avgRating.toFixed(1)} ★` : "—"}
            hint={`${expStats.ratingCount} avaliações`}
          />
        </div>
      </section>

      {/* 6. Smart alerts */}
      <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <div className="mb-4 flex items-center gap-2">
          <Bell className="h-4 w-4 text-amber-700" />
          <h2 className="font-display text-xl italic text-amber-900">Requer atenção</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <AlertCard
            icon={<ShoppingBag className="h-4 w-4" />}
            label="Carrinhos abandonados (+7 dias)"
            value={abandonedCarts}
            href="/admin/clientes"
          />
          <AlertCard
            icon={<Package className="h-4 w-4" />}
            label="Produtos esgotados"
            value={outOfStockThisMonth}
            href="/admin/produtos"
          />
          <AlertCard
            icon={<AlertTriangle className="h-4 w-4" />}
            label="Devoluções pendentes"
            value={pendingReturns}
            href="/admin/devolucoes"
          />
          <AlertCard
            icon={<Bell className="h-4 w-4" />}
            label="Lista de espera (esgotados)"
            value={waitlistOos}
            href="/admin/produtos"
          />
          <AlertCard
            icon={<UsersIcon className="h-4 w-4" />}
            label="VIPs inactivos (60+ dias)"
            value={inactiveVips.length}
            href="/admin/clientes"
          />
        </div>
        {inactiveVips.length > 0 && (
          <div className="mt-4 rounded-xl bg-white p-4">
            <p className="mb-2 text-xs font-medium text-amber-900">Clientes VIP a reactivar:</p>
            <ul className="space-y-1 text-sm">
              {inactiveVips.slice(0, 5).map((v) => (
                <li key={v.uid} className="flex items-center justify-between">
                  <span>{v.name} <span className="text-muted-foreground">({v.email})</span></span>
                  <span className="text-xs text-muted-foreground">{v.vip} · há {v.lastDays}d</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* 7. Commission detail */}
      <section className="mt-8 rounded-2xl border border-primary/30 bg-[oklch(0.96_0.02_268)] p-6 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Comissões</p>
            <h2 className="mt-1 font-display text-2xl italic">Detalhe de comissão — {range.label}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Encomendas entregues. {commissionPct}% sobre o valor da venda.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Percentagem de comissão:
              <input
                type="number"
                min={1}
                max={30}
                value={commissionPct}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) setCommissionPct(Math.max(1, Math.min(30, Math.round(v))));
                }}
                className="h-9 w-20 rounded-md border border-input bg-background px-2 text-sm text-foreground"
              />
              <span>%</span>
            </label>
            <Button onClick={generatePDF} className="gap-2">
              <Download className="h-4 w-4" /> Exportar PDF
            </Button>
          </div>
        </div>
        <div className="mt-4 rounded-xl border border-primary/20 bg-white/60 p-4 text-xs text-muted-foreground">
          <p>
            <span className="font-medium text-foreground">Base de cálculo:</span> a comissão é calculada sobre o valor bruto de vendas (preço de venda final pago pelo cliente), não sobre o lucro. Isto garante transparência e simplicidade para ambas as partes.
          </p>
        </div>
        <div className="mt-6 overflow-x-auto rounded-xl bg-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                <th className="px-4 py-3 font-normal">Data</th>
                <th className="px-4 py-3 font-normal">Cliente</th>
                <th className="px-4 py-3 text-right font-normal">Valor</th>
                <th className="px-4 py-3 text-right font-normal">Comissão ({commissionPct}%)</th>
              </tr>
            </thead>
            <tbody>
              {completedInRange.length === 0 && (
                <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">Sem encomendas entregues no período</td></tr>
              )}
              {completedInRange.map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="px-4 py-2">{format(new Date(o.created_at), "dd/MM/yyyy")}</td>
                  <td className="px-4 py-2">{o.customer_name || o.customer_email || "—"}</td>
                  <td className="px-4 py-2 text-right">{fmtEur(Number(o.total || 0))}</td>
                  <td className="px-4 py-2 text-right font-medium">{fmtEur(Number(o.total || 0) * commissionPct / 100)}</td>
                </tr>
              ))}
            </tbody>
            {completedInRange.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-border bg-muted/30">
                  <td colSpan={2} className="px-4 py-3 text-right text-sm font-medium">Totais</td>
                  <td className="px-4 py-3 text-right font-display text-base">{fmtEur(commissionTotal)}</td>
                  <td className="px-4 py-3 text-right font-display text-base text-primary">{fmtEur(commissionDue)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {/* 8. Insights & sugestões */}
      <section className="mt-8 rounded-2xl border border-border bg-card p-6">
        <div className="mb-4 flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-primary" />
          <h2 className="font-display text-xl italic">Insights & Sugestões</h2>
        </div>
        {insights.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Sem sugestões de momento. Tudo a correr bem.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {insights.map((i) => {
              const toneClass =
                i.tone === "success"
                  ? "border-emerald-200 bg-emerald-50"
                  : i.tone === "warn"
                    ? "border-amber-200 bg-amber-50"
                    : "border-border bg-muted/30";
              const iconClass =
                i.tone === "success"
                  ? "bg-emerald-100 text-emerald-700"
                  : i.tone === "warn"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-primary/10 text-primary";
              return (
                <div key={i.id} className={cn("flex gap-3 rounded-xl border p-4", toneClass)}>
                  <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full", iconClass)}>
                    {i.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-foreground">{i.text}</p>
                    {i.actionLabel && i.actionHref && (
                      <Link to={i.actionHref} className="mt-2 inline-block text-xs font-medium text-primary underline-offset-2 hover:underline">
                        {i.actionLabel} →
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

function AlertCard({
  icon,
  label,
  value,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  href?: string;
}) {
  const inner = (
    <div className="flex items-center gap-3 rounded-xl bg-white p-4 transition hover:shadow-sm">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-display text-xl">{value}</p>
      </div>
    </div>
  );
  if (href) return <Link to={href}>{inner}</Link>;
  return inner;
}
