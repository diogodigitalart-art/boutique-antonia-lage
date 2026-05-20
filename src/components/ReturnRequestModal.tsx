import { useState } from "react";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type OrderItem = {
  product_id?: string;
  product_uuid?: string | null;
  brand?: string | null;
  name?: string | null;
  size?: string;
  quantity?: number;
  unit_price?: number;
  line_total?: number;
  image?: string | null;
  reference?: string | null;
};

type Order = {
  id: string;
  user_id?: string;
  customer_name?: string;
  customer_email?: string;
  items: OrderItem[];
};

const REASONS = [
  "Tamanho incorrecto",
  "Peça com defeito",
  "Não era o que esperava",
  "Outro motivo",
];
const METHODS = ["Entrega em loja", "Envio por transportador"];

export function ReturnRequestModal({
  order,
  open,
  onClose,
  onSubmitted,
  resolveImage,
}: {
  order: Order | null;
  open: boolean;
  onClose: () => void;
  onSubmitted?: () => void;
  resolveImage?: (it: OrderItem) => string | undefined;
}) {
  const [reason, setReason] = useState(REASONS[0]);
  const [method, setMethod] = useState(METHODS[0]);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  if (!open || !order) return null;

  const submit = async () => {
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) {
      toast.error("Sessão expirada");
      setBusy(false);
      return;
    }
    const { error } = await supabase.from("returns" as never).insert({
      order_id: order.id,
      user_id: u.user.id,
      customer_name: order.customer_name ?? null,
      customer_email: order.customer_email ?? u.user.email,
      items: order.items,
      reason,
      method,
      notes: notes.trim() || null,
    } as never);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Pedido de devolução enviado");
    onSubmitted?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 md:items-center md:p-4">
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-card p-6 shadow-xl md:rounded-3xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          Devolução
        </p>
        <h2 className="mt-1 font-display text-2xl italic">Solicitar devolução</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Encomenda #{order.id.slice(0, 8).toUpperCase()}
        </p>

        <div className="mt-5 rounded-2xl border border-border bg-muted/30 p-3">
          <ul className="space-y-3">
            {order.items.map((it, i) => {
              const img = it.image || resolveImage?.(it);
              return (
                <li key={i} className="flex items-center gap-3">
                  <div className="h-16 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                    {img && <img src={img} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {it.brand}
                    </p>
                    <p className="truncate font-display italic">{it.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Tamanho {it.size} · Qtd {it.quantity ?? 1} · €
                      {Number(it.line_total ?? 0).toFixed(2)}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            Motivo
          </p>
          <div className="space-y-2">
            {REASONS.map((r) => (
              <label key={r} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="reason"
                  checked={reason === r}
                  onChange={() => setReason(r)}
                />
                {r}
              </label>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            Como queres devolver
          </p>
          <div className="space-y-2">
            {METHODS.map((m) => (
              <label key={m} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="method"
                  checked={method === m}
                  onChange={() => setMethod(m)}
                />
                {m}
              </label>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <p className="mb-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            Notas (opcional)
          </p>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border bg-background p-3 text-sm outline-none focus:border-primary"
            placeholder="Detalhes adicionais…"
          />
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-full border border-border px-4 py-2 text-xs uppercase tracking-wider hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            onClick={() => void submit()}
            disabled={busy}
            className="rounded-full bg-primary px-5 py-2 text-xs uppercase tracking-wider text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {busy ? "A enviar…" : "Solicitar devolução"}
          </button>
        </div>
      </div>
    </div>
  );
}