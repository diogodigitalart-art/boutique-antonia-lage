import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { useCart } from "@/lib/cart";
import { useProducts } from "@/lib/products";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, ChevronLeft, Lock } from "lucide-react";

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout | Boutique Antónia Lage" }] }),
  component: CheckoutPage,
});

const STEPS = [
  { id: 1, label: "Resumo" },
  { id: 2, label: "Entrega" },
  { id: 3, label: "Pagamento" },
] as const;

const FREE_SHIPPING_THRESHOLD = 150;
const SHIPPING_COST = 8;

type Address = {
  full_name: string;
  email: string;
  phone: string;
  address1: string;
  address2: string;
  city: string;
  postal_code: string;
  country: string;
};

function CheckoutPage() {
  const router = useRouter();
  const { items, loading, clear } = useCart();
  const { byId } = useProducts();
  const { user, profile, session, loading: authLoading } = useAuth();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [address, setAddress] = useState<Address>({
    full_name: "",
    email: "",
    phone: "",
    address1: "",
    address2: "",
    city: "",
    postal_code: "",
    country: "Portugal",
  });

  // Prefill from profile
  useEffect(() => {
    if (profile) {
      setAddress((a) => ({
        ...a,
        full_name: a.full_name || profile.full_name || "",
        email: a.email || profile.email || "",
        phone: a.phone || profile.phone || "",
      }));
    }
  }, [profile]);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !session) {
      toast.error("Inicia sessão para finalizar a compra.");
      router.navigate({ to: "/login", search: { redirect: "/checkout" } });
    }
  }, [authLoading, session, router]);

  const enriched = useMemo(
    () =>
      items.map((it) => {
        const p = byId(it.product_id);
        const unitPrice = p?.price ?? 0;
        return { ...it, product: p, unitPrice, lineTotal: unitPrice * it.quantity };
      }),
    [items, byId],
  );

  const subtotal = enriched.reduce((s, e) => s + e.lineTotal, 0);
  const shipping = subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0 ? 0 : SHIPPING_COST;
  const total = subtotal + shipping;

  const canSubmitAddress =
    address.full_name.trim().length > 1 &&
    /\S+@\S+\.\S+/.test(address.email) &&
    address.phone.trim().length >= 6 &&
    address.address1.trim().length >= 3 &&
    address.city.trim().length >= 2 &&
    address.postal_code.trim().length >= 3 &&
    address.country.trim().length >= 2;

  const handleConfirmPay = async () => {
    if (!user) return;
    const itemsPayload = enriched.map((e) => ({
      product_id: e.product_id,
      product_uuid: e.product_uuid,
      brand: e.product?.brand ?? null,
      name: e.product?.name ?? null,
      image: e.product?.image ?? null,
      size: e.size,
      quantity: e.quantity,
      unit_price: e.unitPrice,
      line_total: e.lineTotal,
    }));
    const { error } = await supabase.from("orders" as never).insert({
      user_id: user.id,
      customer_name: address.full_name,
      customer_email: address.email,
      customer_phone: address.phone,
      items: itemsPayload,
      shipping_address: address,
      subtotal,
      shipping_cost: shipping,
      total,
      status: "Pendente",
    } as never);
    if (error) {
      toast.error("Não foi possível registar a encomenda.");
      return;
    }
    await clear();
    toast.success("Encomenda registada. Entraremos em contacto.");
    router.navigate({ to: "/perfil" });
  };

  if (loading) {
    return (
      <Layout>
        <div className="px-4 py-20 text-center text-sm text-muted-foreground">A carregar…</div>
      </Layout>
    );
  }

  if (items.length === 0) {
    return (
      <Layout>
        <div className="mx-auto max-w-2xl px-4 py-16 text-center">
          <p className="text-muted-foreground">A tua sacola está vazia.</p>
          <Link
            to="/"
            className="mt-4 inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
          >
            Ver colecção
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-12">
        <Link
          to="/carrinho"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ChevronLeft size={16} /> Voltar ao carrinho
        </Link>

        <header className="mt-4">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Checkout</p>
          <h1 className="mt-1 font-display text-4xl italic text-foreground md:text-5xl">
            Finalizar compra
          </h1>
        </header>

        {/* Stepper */}
        <ol className="mt-8 flex items-center gap-3">
          {STEPS.map((s, i) => {
            const active = step === s.id;
            const done = step > s.id;
            return (
              <li key={s.id} className="flex flex-1 items-center gap-3">
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-medium ${
                    done
                      ? "border-primary bg-primary text-primary-foreground"
                      : active
                        ? "border-primary text-primary"
                        : "border-border text-muted-foreground"
                  }`}
                >
                  {done ? <Check size={14} /> : s.id}
                </div>
                <span
                  className={`text-xs uppercase tracking-wider ${
                    active || done ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </span>
                {i < STEPS.length - 1 && <div className="h-px flex-1 bg-border" />}
              </li>
            );
          })}
        </ol>

        <div className="mt-8 grid gap-8 md:grid-cols-3">
          <div className="md:col-span-2">
            {step === 1 && (
              <section className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-display text-2xl italic">Resumo da encomenda</h2>
                <ul className="mt-4 divide-y divide-border">
                  {enriched.map((it) => (
                    <li key={`${it.product_id}-${it.size}`} className="flex gap-4 py-4">
                      <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                        {it.product?.image && (
                          <img src={it.product.image} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="flex flex-1 flex-col">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                          {it.product?.brand}
                        </p>
                        <p className="font-display text-base italic">{it.product?.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Tamanho {it.size} · Qtd {it.quantity}
                        </p>
                      </div>
                      <p className="text-sm font-medium">€{it.lineTotal.toFixed(2)}</p>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {step === 2 && (
              <section className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-display text-2xl italic">Dados de entrega</h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <Field label="Nome completo" value={address.full_name} onChange={(v) => setAddress({ ...address, full_name: v })} className="sm:col-span-2" />
                  <Field label="Email" type="email" value={address.email} onChange={(v) => setAddress({ ...address, email: v })} />
                  <Field label="Telemóvel" value={address.phone} onChange={(v) => setAddress({ ...address, phone: v })} />
                  <Field label="Morada" value={address.address1} onChange={(v) => setAddress({ ...address, address1: v })} className="sm:col-span-2" />
                  <Field label="Morada (linha 2)" value={address.address2} onChange={(v) => setAddress({ ...address, address2: v })} className="sm:col-span-2" optional />
                  <Field label="Cidade" value={address.city} onChange={(v) => setAddress({ ...address, city: v })} />
                  <Field label="Código postal" value={address.postal_code} onChange={(v) => setAddress({ ...address, postal_code: v })} />
                  <Field label="País" value={address.country} onChange={(v) => setAddress({ ...address, country: v })} className="sm:col-span-2" />
                </div>
              </section>
            )}

            {step === 3 && (
              <section className="rounded-2xl border border-border bg-card p-6">
                <h2 className="font-display text-2xl italic">Pagamento</h2>
                <div className="mt-5 rounded-xl border border-dashed border-border bg-muted/40 p-6 text-center">
                  <Lock className="mx-auto h-6 w-6 text-muted-foreground" />
                  <p className="mt-3 text-sm text-foreground">
                    Pagamento seguro via Stripe — em breve
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Por agora podes confirmar a encomenda como pendente. Entraremos em contacto para concluir o pagamento.
                  </p>
                  <button
                    disabled
                    className="mt-5 inline-flex h-11 cursor-not-allowed items-center justify-center rounded-full bg-primary/40 px-6 text-sm uppercase tracking-wider text-primary-foreground"
                  >
                    Pagar €{total.toFixed(2)}
                  </button>
                </div>
                <button
                  onClick={() => void handleConfirmPay()}
                  className="mt-4 flex h-12 w-full items-center justify-center rounded-full border border-primary text-sm uppercase tracking-wider text-primary hover:bg-primary-soft"
                >
                  Confirmar encomenda (a pagar mais tarde)
                </button>
              </section>
            )}

            {/* Step nav */}
            <div className="mt-6 flex items-center justify-between">
              <button
                onClick={() => setStep((step - 1) as 1 | 2 | 3)}
                disabled={step === 1}
                className="text-sm text-muted-foreground hover:text-foreground disabled:opacity-40"
              >
                ← Anterior
              </button>
              {step < 3 && (
                <button
                  onClick={() => setStep((step + 1) as 1 | 2 | 3)}
                  disabled={step === 2 && !canSubmitAddress}
                  className="inline-flex h-11 items-center rounded-full bg-primary px-6 text-sm uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
                >
                  Continuar
                </button>
              )}
            </div>
          </div>

          <aside className="md:col-span-1">
            <div className="sticky top-24 rounded-2xl border border-border bg-card p-6">
              <h3 className="font-display text-lg italic">Total</h3>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <dt>Subtotal</dt>
                  <dd>€{subtotal.toFixed(2)}</dd>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <dt>Envio</dt>
                  <dd>{shipping === 0 ? "Grátis" : `€${shipping.toFixed(2)}`}</dd>
                </div>
                {shipping > 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    Envio grátis em encomendas acima de €{FREE_SHIPPING_THRESHOLD}.
                  </p>
                )}
              </dl>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <span className="text-sm uppercase tracking-wider text-muted-foreground">Total</span>
                <span className="font-display text-2xl italic">€{total.toFixed(2)}</span>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </Layout>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  className = "",
  optional = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  className?: string;
  optional?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label} {optional && <span className="text-muted-foreground/60">(opcional)</span>}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 rounded-lg border border-border bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
      />
    </label>
  );
}