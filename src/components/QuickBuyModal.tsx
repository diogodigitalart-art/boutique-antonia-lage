import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { toast } from "sonner";
import { useProducts } from "@/lib/products";
import { displaySize } from "@/lib/utils";

export type QuickBuyProduct = {
  id: string;
  uuid?: string;
  brand: string;
  name: string;
  price: number;
  image: string;
  sizes: string[];
  availableSizes?: string[];
};

export function QuickBuyModal({
  open,
  onOpenChange,
  products,
  title,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  products: QuickBuyProduct[];
  title?: string;
}) {
  const { add } = useCart();
  const { byId } = useProducts();
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) setSelected({});
  }, [open]);

  const isLook = products.length > 1;

  async function handleAdd() {
    const missing = products.filter((p) => {
      const avail = (p.availableSizes ?? p.sizes).length > 0;
      return avail && !selected[p.id];
    });
    if (missing.length > 0) {
      toast.error(isLook ? "Selecciona um tamanho para cada peça." : "Selecciona um tamanho.");
      return;
    }
    setBusy(true);
    try {
      for (const p of products) {
        const size = selected[p.id];
        if (!size) continue;
        const live = byId(p.id);
        await add({
          product_id: p.id,
          product_uuid: live?.uuid ?? p.uuid ?? null,
          size,
          quantity: 1,
        });
      }
      toast.success(isLook ? "Look adicionado ao carrinho." : "Adicionado ao carrinho.");
      onOpenChange(false);
    } catch {
      toast.error("Não foi possível adicionar ao carrinho.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl italic">
            {title ?? (isLook ? "Comprar este look" : "Adicionar ao carrinho")}
          </DialogTitle>
          <DialogDescription>
            {isLook ? "Escolhe o tamanho para cada peça." : "Escolhe o tamanho."}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          {products.map((p) => {
            const avail = new Set(p.availableSizes ?? p.sizes);
            return (
              <div key={p.id} className="flex gap-3 border-b border-border pb-4 last:border-0">
                <div className="h-20 w-16 flex-shrink-0 overflow-hidden rounded bg-muted">
                  <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{p.brand}</p>
                  <p className="text-sm text-foreground line-clamp-1">{p.name}</p>
                  <p className="text-xs text-muted-foreground">€{p.price.toFixed(2)}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {p.sizes.map((s) => {
                      const enabled = avail.has(s);
                      const isSel = selected[p.id] === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          disabled={!enabled}
                          onClick={() => setSelected((prev) => ({ ...prev, [p.id]: s }))}
                          className={`min-w-[36px] rounded border px-2 py-1 text-xs transition ${
                            isSel
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-background text-foreground hover:border-primary"
                          } ${!enabled ? "opacity-40 line-through cursor-not-allowed" : ""}`}
                        >
                          {displaySize(s)}
                        </button>
                      );
                    })}
                    {p.sizes.length === 0 && (
                      <span className="text-xs text-muted-foreground">Sem tamanhos disponíveis</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button onClick={handleAdd} disabled={busy}>
            {busy ? "A adicionar…" : isLook ? "Adicionar look" : "Adicionar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}