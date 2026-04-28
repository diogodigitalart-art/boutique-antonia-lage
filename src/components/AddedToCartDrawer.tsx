import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Link } from "@tanstack/react-router";
import { Minus, Plus, Check } from "lucide-react";
import { useCart } from "@/lib/cart";
import { useProducts } from "@/lib/products";

type Props = {
  open: boolean;
  onClose: () => void;
  productId: string | null;
  size: string | null;
};

export function AddedToCartDrawer({ open, onClose, productId, size }: Props) {
  const { items, setQuantity } = useCart();
  const { byId } = useProducts();
  const product = productId ? byId(productId) : undefined;
  const item = productId && size
    ? items.find((i) => i.product_id === productId && i.size === size)
    : undefined;
  const qty = item?.quantity ?? 1;
  const lineTotal = (product?.price ?? 0) * qty;

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
        <SheetHeader className="border-b border-border px-6 py-4">
          <SheetTitle className="flex items-center gap-2 text-sm font-normal uppercase tracking-[0.2em]">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Check size={14} />
            </span>
            Adicionado ao carrinho
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          {product ? (
            <div className="flex gap-4">
              <div className="h-32 w-24 shrink-0 overflow-hidden rounded-lg bg-muted">
                {product.image && (
                  <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
                )}
              </div>
              <div className="flex flex-1 flex-col">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {product.brand}
                </p>
                <p className="font-display text-lg italic text-foreground">{product.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">Tamanho: {size}</p>
                <p className="mt-2 text-base font-medium">€{lineTotal.toFixed(2)}</p>

                <div className="mt-4 inline-flex items-center self-start rounded-full border border-border">
                  <button
                    onClick={() => productId && size && void setQuantity(productId, size, qty - 1)}
                    disabled={qty <= 1}
                    className="flex h-8 w-8 items-center justify-center rounded-l-full hover:bg-muted disabled:opacity-40"
                    aria-label="Diminuir"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center text-sm">{qty}</span>
                  <button
                    onClick={() => productId && size && void setQuantity(productId, size, qty + 1)}
                    disabled={qty >= 3}
                    className="flex h-8 w-8 items-center justify-center rounded-r-full hover:bg-muted disabled:opacity-40"
                    aria-label="Aumentar"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">A carregar…</p>
          )}
        </div>

        <div className="space-y-3 border-t border-border bg-card px-6 py-5">
          <Link
            to="/carrinho"
            onClick={onClose}
            className="flex h-12 w-full items-center justify-center rounded-full bg-primary text-sm uppercase tracking-wider text-primary-foreground hover:bg-primary/90"
          >
            Ver carrinho
          </Link>
          <button
            onClick={onClose}
            className="flex h-12 w-full items-center justify-center rounded-full border border-border text-sm uppercase tracking-wider text-foreground hover:bg-muted"
          >
            Continuar a comprar
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}