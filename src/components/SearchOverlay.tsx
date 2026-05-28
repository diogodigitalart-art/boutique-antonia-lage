import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search, X } from "lucide-react";
import { useProducts } from "@/lib/products";
import { useI18n } from "@/lib/i18n";

export function SearchOverlay() {
  const { products } = useProducts();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("open-search", onOpen);
    return () => window.removeEventListener("open-search", onOpen);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const id = setTimeout(() => inputRef.current?.focus(), 50);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(id);
      document.body.style.overflow = "";
    };
  }, [open]);

  const results = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return [];
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.brand.toLowerCase().includes(term),
      )
      .slice(0, 12);
  }, [q, products]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div
        className="mx-auto mt-[10vh] max-w-2xl rounded-2xl bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <Search size={20} className="text-muted-foreground" strokeWidth={1.5} />
          <input
            ref={inputRef}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("search_placeholder")}
            className="flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
          />
          <button
            onClick={() => setOpen(false)}
            aria-label="Fechar"
            className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X size={18} />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {q.trim() && results.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              {t("search_no_results")}
            </p>
          )}
          {results.length > 0 && (
            <ul className="divide-y divide-border">
              {results.map((p) => (
                <li key={p.id}>
                  <Link
                    to="/produto/$id"
                    params={{ id: p.id }}
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-4 px-5 py-3 hover:bg-muted/60"
                  >
                    <div className="h-14 w-12 shrink-0 overflow-hidden rounded bg-muted">
                      {p.image && (
                        <img src={p.image} alt={p.name} className="h-full w-full object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                        {p.brand}
                      </p>
                      <p className="truncate font-display text-base italic text-foreground">
                        {p.name}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-foreground">€{p.price.toFixed(2)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {!q.trim() && (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              {t("search_hint")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function openSearch() {
  window.dispatchEvent(new CustomEvent("open-search"));
}