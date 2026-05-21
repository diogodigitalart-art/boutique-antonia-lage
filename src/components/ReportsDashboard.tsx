import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Download,
  Calendar,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComp } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfDay, startOfDay } from "date-fns";
import { pt } from "date-fns/locale";
import { toast } from "sonner";
import jsPDF from "jspdf";

type OrderItem = {
  product_id?: string;
  product_uuid?: string | null;
  brand?: string | null;
  name?: string | null;
  reference?: string | null;
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
  items: OrderItem[];
};

const EXCLUDE_STATUS = new Set(["Cancelada"]);

type RangeKey = "this_month" | "last_month" | "last_3" | "this_year" | "custom";

function fmtEur(n: number) {
  return `€${(n || 0).toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StatCard({
  label,
  value,
  hint,
  trend,
}: {
  label: string;
  value: string;
  hint?: string;
  trend?: { pct: number; up: boolean } | null;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-2xl text-foreground">{value}</p>
      {trend && (
        <p
          className={cn(
            "mt-1 flex items-center gap-1 text-xs font-medium",
            trend.up ? "text-emerald-600" : "text-rose-600",
          )}
        >
          {trend.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {trend.pct.toFixed(1)}% vs mês anterior
        </p>
      )}
      {hint && !trend && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function ReportsDashboard() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [customersCount, setCustomersCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const [rangeKey, setRangeKey] = useState<RangeKey>("this_month");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();

  const [commissionPct, setCommissionPct] = useState<number>(() => {
    if (typeof window === "undefined") return 15;
    const v = window.localStorage.getItem("admin.commissionPct");
    return v ? Number(v) || 15 : 15;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("admin.commissionPct", String(commissionPct));
    }
  }, [commissionPct]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [{ data: ord, error }, { count }] = await Promise.all([
        supabase
          .from("orders")
          .select("id, created_at, total, status, user_id, items")
          .order("created_at", { ascending: false })
          .limit(2000),
        supabase.from("profiles").select("id", { count: "exact", head: true }),
      ]);
      if (cancelled) return;
      if (error) toast.error("Falha a carregar relatórios");
      setOrders(((ord ?? []) as unknown as OrderRow[]).filter((o) => !EXCLUDE_STATUS.has(o.status)));
      setCustomersCount(count ?? 0);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const range = useMemo(() => {
    const now = new Date();
    switch (rangeKey) {
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
      case "custom":
        return {
          from: customFrom ? startOfDay(customFrom) : startOfMonth(now),
          to: customTo ? endOfDay(customTo) : endOfDay(now),
          label: `${customFrom ? format(customFrom, "dd/MM/yyyy") : "—"} → ${customTo ? format(customTo, "dd/MM/yyyy") : "—"}`,
        };
    }
  }, [rangeKey, customFrom, customTo]);

  const inRange = useMemo(
    () =>
      orders.filter((o) => {
        const d = new Date(o.created_at).getTime();
        return d >= range.from.getTime() && d <= range.to.getTime();
      }),
    [orders, range],
  );

  // Overview metrics
  const totalRevenueAll = useMemo(() => orders.reduce((s, o) => s + Number(o.total || 0), 0), [orders]);

  const now = new Date();
  const thisMonthOrders = useMemo(
    () =>
      orders.filter((o) => {
        const d = new Date(o.created_at);
        return d >= startOfMonth(now) && d <= endOfMonth(now);
      }),
    [orders],
  );
  const lastMonthOrders = useMemo(() => {
    const lm = subMonths(now, 1);
    return orders.filter((o) => {
      const d = new Date(o.created_at);
      return d >= startOfMonth(lm) && d <= endOfMonth(lm);
    });
  }, [orders]);

  const revenueThisMonth = thisMonthOrders.reduce((s, o) => s + Number(o.total || 0), 0);
  const revenueLastMonth = lastMonthOrders.reduce((s, o) => s + Number(o.total || 0), 0);
  const trend = revenueLastMonth > 0
    ? { pct: ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100, up: revenueThisMonth >= revenueLastMonth }
    : revenueThisMonth > 0
      ? { pct: 100, up: true }
      : null;

  const ordersInRange = inRange.length;
  const avgTicket = ordersInRange > 0 ? inRange.reduce((s, o) => s + Number(o.total || 0), 0) / ordersInRange : 0;

  const uniqueBuyers = useMemo(() => new Set(orders.map((o) => o.user_id).filter(Boolean)).size, [orders]);
  const conversion = customersCount > 0 ? (uniqueBuyers / customersCount) * 100 : 0;

  // Revenue chart — last 6 months
  const monthlySeries = useMemo(() => {
    const arr: { month: string; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const m = subMonths(now, i);
      const from = startOfMonth(m).getTime();
      const to = endOfMonth(m).getTime();
      const rev = orders
        .filter((o) => {
          const d = new Date(o.created_at).getTime();
          return d >= from && d <= to;
        })
        .reduce((s, o) => s + Number(o.total || 0), 0);
      arr.push({ month: format(m, "MMM", { locale: pt }), revenue: Math.round(rev * 100) / 100 });
    }
    return arr;
  }, [orders]);

  // Top products (in range)
  const topProducts = useMemo(() => {
    const map = new Map<string, { name: string; brand: string; units: number; revenue: number }>();
    for (const o of inRange) {
      for (const it of o.items ?? []) {
        const key = `${it.brand ?? ""}|${it.name ?? "—"}`;
        const prev = map.get(key) ?? { name: it.name ?? "—", brand: it.brand ?? "—", units: 0, revenue: 0 };
        prev.units += Number(it.quantity || 0);
        prev.revenue += Number(it.line_total || 0);
        map.set(key, prev);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [inRange]);

  // Top brands (this month, per spec)
  const topBrands = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of thisMonthOrders) {
      for (const it of o.items ?? []) {
        const b = it.brand ?? "—";
        map.set(b, (map.get(b) ?? 0) + Number(it.line_total || 0));
      }
    }
    return Array.from(map.entries())
      .map(([brand, revenue]) => ({ brand, revenue: Math.round(revenue * 100) / 100 }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [thisMonthOrders]);

  // Commission (digital channel = all orders this month, per spec)
  const digitalRevenueThisMonth = revenueThisMonth;
  const commissionAmount = (digitalRevenueThisMonth * commissionPct) / 100;

  async function generatePDF() {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const periodLabel = format(now, "MMMM 'de' yyyy", { locale: pt });

    // Header band
    doc.setFillColor(58, 78, 154);
    doc.rect(0, 0, pageW, 90, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(22);
    doc.text("Boutique Antónia Lage", 40, 45);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text("Relatório de comissões — canal digital", 40, 65);

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    doc.text(`Emitido em ${format(now, "dd/MM/yyyy")}`, pageW - 40, 45, { align: "right" });

    // Body
    let y = 140;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Resumo do período", 40, y);
    y += 8;
    doc.setDrawColor(220, 220, 220);
    doc.line(40, y, pageW - 40, y);
    y += 24;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    const rows: [string, string][] = [
      ["Período", periodLabel],
      ["Vendas via webapp", fmtEur(digitalRevenueThisMonth)],
      ["Número de encomendas", String(thisMonthOrders.length)],
      ["Ticket médio", fmtEur(thisMonthOrders.length ? digitalRevenueThisMonth / thisMonthOrders.length : 0)],
      ["Percentagem de comissão", `${commissionPct}%`],
    ];
    for (const [k, v] of rows) {
      doc.setTextColor(110, 110, 110);
      doc.text(k, 40, y);
      doc.setTextColor(20, 20, 20);
      doc.text(v, pageW - 40, y, { align: "right" });
      y += 22;
    }

    y += 20;
    doc.setFillColor(238, 241, 250);
    doc.roundedRect(40, y, pageW - 80, 70, 6, 6, "F");
    doc.setTextColor(58, 78, 154);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Comissão a receber", 60, y + 28);
    doc.setFontSize(22);
    doc.text(fmtEur(commissionAmount), pageW - 60, y + 45, { align: "right" });

    // Footer
    doc.setTextColor(140, 140, 140);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.text(
      "Documento gerado automaticamente pela plataforma da Boutique Antónia Lage.",
      pageW / 2,
      doc.internal.pageSize.getHeight() - 40,
      { align: "center" },
    );

    doc.save(`comissao-${format(now, "yyyy-MM")}.pdf`);
    toast.success("Relatório gerado");
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Admin</p>
          <h1 className="mt-1 font-display text-3xl italic md:text-4xl">Relatórios</h1>
          <p className="mt-1 text-sm text-muted-foreground">Período: {range.label}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={rangeKey} onValueChange={(v) => setRangeKey(v as RangeKey)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="this_month">Este mês</SelectItem>
              <SelectItem value="last_month">Último mês</SelectItem>
              <SelectItem value="last_3">Últimos 3 meses</SelectItem>
              <SelectItem value="this_year">Este ano</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>
          {rangeKey === "custom" && (
            <>
              <DateBtn date={customFrom} onChange={setCustomFrom} placeholder="De" />
              <DateBtn date={customTo} onChange={setCustomTo} placeholder="Até" />
            </>
          )}
        </div>
      </header>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          A carregar dados…
        </div>
      ) : (
        <>
          {/* Stats */}
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <StatCard label="Receita total" value={fmtEur(totalRevenueAll)} hint="Desde sempre" />
            <StatCard
              label="Receita este mês"
              value={fmtEur(revenueThisMonth)}
              trend={trend}
            />
            <StatCard label="Encomendas este mês" value={String(thisMonthOrders.length)} />
            <StatCard label="Ticket médio (período)" value={fmtEur(avgTicket)} />
            <StatCard label="Clientes registados" value={String(customersCount)} />
            <StatCard
              label="Taxa de conversão"
              value={`${conversion.toFixed(1)}%`}
              hint={`${uniqueBuyers} de ${customersCount} registados compraram`}
            />
          </section>

          {/* Revenue chart */}
          <section className="mt-8 rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-xl italic">Receita mensal — últimos 6 meses</h2>
            <div className="mt-4 h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlySeries} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `€${v}`} />
                  <Tooltip
                    formatter={(v: number) => fmtEur(v)}
                    contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                  />
                  <Line type="monotone" dataKey="revenue" stroke="oklch(0.42 0.13 268)" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Top products & top brands */}
          <section className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display text-xl italic">Top 5 produtos</h2>
              <p className="text-xs text-muted-foreground">No período seleccionado</p>
              <div className="mt-4 overflow-x-auto">
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
                    {topProducts.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-muted-foreground">
                          Sem dados
                        </td>
                      </tr>
                    )}
                    {topProducts.map((p, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="py-2 pr-2">{p.name}</td>
                        <td className="py-2 pr-2 text-muted-foreground">{p.brand}</td>
                        <td className="py-2 text-right">{p.units}</td>
                        <td className="py-2 text-right font-medium">{fmtEur(p.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display text-xl italic">Receita por marca</h2>
              <p className="text-xs text-muted-foreground">Mês actual</p>
              <div className="mt-4 h-72 w-full">
                {topBrands.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Sem dados este mês
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topBrands} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.4} />
                      <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `€${v}`} />
                      <YAxis type="category" dataKey="brand" stroke="hsl(var(--muted-foreground))" fontSize={12} width={90} />
                      <Tooltip
                        formatter={(v: number) => fmtEur(v)}
                        contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }}
                      />
                      <Bar dataKey="revenue" fill="oklch(0.42 0.13 268)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </section>

          {/* Commission */}
          <section className="mt-8 rounded-2xl border border-primary/30 bg-[oklch(0.95_0.02_268)] p-6 md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Comissões</p>
                <h2 className="mt-1 font-display text-2xl italic text-foreground">A minha comissão</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Calculado sobre as vendas do canal digital no mês actual ({format(now, "MMMM yyyy", { locale: pt })}).
                </p>
              </div>
              <Button onClick={generatePDF} className="gap-2">
                <Download className="h-4 w-4" />
                Gerar relatório PDF
              </Button>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl bg-card p-4">
                <Label htmlFor="commission-pct" className="text-xs text-muted-foreground">
                  Percentagem de comissão
                </Label>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    id="commission-pct"
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={commissionPct}
                    onChange={(e) => setCommissionPct(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                    className="text-lg"
                  />
                  <span className="text-lg font-medium text-foreground">%</span>
                </div>
              </div>
              <div className="rounded-xl bg-card p-4">
                <p className="text-xs text-muted-foreground">Receita canal digital este mês</p>
                <p className="mt-2 font-display text-2xl text-foreground">{fmtEur(digitalRevenueThisMonth)}</p>
              </div>
              <div className="rounded-xl bg-primary p-4 text-primary-foreground">
                <p className="text-xs uppercase tracking-wider opacity-80">Comissão a receber</p>
                <p className="mt-2 font-display text-3xl">{fmtEur(commissionAmount)}</p>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function DateBtn({
  date,
  onChange,
  placeholder,
}: {
  date: Date | undefined;
  onChange: (d: Date | undefined) => void;
  placeholder: string;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className={cn("min-w-[140px] justify-start text-left font-normal", !date && "text-muted-foreground")}>
          <Calendar className="mr-2 h-4 w-4" />
          {date ? format(date, "dd/MM/yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <CalendarComp mode="single" selected={date} onSelect={onChange} initialFocus className={cn("p-3 pointer-events-auto")} />
      </PopoverContent>
    </Popover>
  );
}