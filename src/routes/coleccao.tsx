import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ProductCard } from "@/components/ProductCard";
import { SimplePagination } from "@/components/SimplePagination";
import { useProducts } from "@/lib/products";
import { BRANDS } from "@/lib/data";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import type { Product } from "@/lib/data";

const PAGE_SIZE = 20;

const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL"];
const sortSizes = (a: string, b: string) => {
  const ai = SIZE_ORDER.indexOf(a.toUpperCase());
  const bi = SIZE_ORDER.indexOf(b.toUpperCase());
  if (ai !== -1 && bi !== -1) return ai - bi;
  if (ai !== -1) return -1;
  if (bi !== -1) return 1;
  const an = parseFloat(a);
  const bn = parseFloat(b);
  if (!isNaN(an) && !isNaN(bn)) return an - bn;
  return a.localeCompare(b);
};

const COLOR_MAP: Record<string, string> = {
  preto: "#000", black: "#000",
  branco: "#fff", white: "#fff",
  cinza: "#9ca3af", cinzento: "#9ca3af", gray: "#9ca3af", grey: "#9ca3af",
  bege: "#d6c7a8", beige: "#d6c7a8",
  camel: "#c19a6b",
  castanho: "#7b4b2a", brown: "#7b4b2a",
  azul: "#3b5998", blue: "#3b5998",
  cobalto: "#0047ab",
  marinho: "#1e3a5f", navy: "#1e3a5f",
  verde: "#4a7c59", green: "#4a7c59",
  vermelho: "#b91c1c", red: "#b91c1c",
  rosa: "#f9a8d4", pink: "#f9a8d4",
  amarelo: "#facc15", yellow: "#facc15",
  laranja: "#f97316", orange: "#f97316",
  roxo: "#7c3aed", lilás: "#a78bfa", lilas: "#a78bfa", purple: "#7c3aed",
  dourado: "#d4af37", gold: "#d4af37",
  prateado: "#c0c0c0", silver: "#c0c0c0",
  marfim: "#f5ebd6", ivory: "#f5ebd6",
};
const colorSwatch = (name: string) => {
  const k = name.trim().toLowerCase();
  return COLOR_MAP[k] || "#d1d5db";
};

export const Route = createFileRoute("/coleccao")({
  head: () => ({
    meta: [
      { title: "Colecção — Boutique Antónia Lage" },
      {
        name: "description",
        content:
          "Descobre toda a colecção da Boutique Antónia Lage — moda feminina premium curada em Braga.",
      },
      { property: "og:title", content: "Colecção — Antónia Lage" },
      {
        property: "og:description",
        content: "Toda a colecção curada por Antónia Lage.",
      },
    ],
  }),
  component: ColeccaoPage,
});

function ColeccaoPage() {
  const { products } = useProducts();
  const [activeBrand, setActiveBrand] = useState("Todas");
  const [page, setPage] = useState(1);
  const [mobileOpen, setMobileOpen] = useState(false);

  const baseItems = useMemo(
    () =>
      products
        .filter((p) => p.category === "new")
        .filter((p) => activeBrand === "Todas" || p.brand === activeBrand),
    [products, activeBrand],
  );

  const allSizes = useMemo(() => {
    const s = new Set<string>();
    baseItems.forEach((p) =>
      (p.sizeAvailability || []).forEach((sz) => {
        if (sz.available > 0) s.add(sz.size);
      }),
    );
    return Array.from(s).sort(sortSizes);
  }, [baseItems]);

  const allColors = useMemo(() => {
    const s = new Set<string>();
    baseItems.forEach((p) => {
      if (p.color && p.color.trim()) s.add(p.color.trim());
    });
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [baseItems]);

  const priceBounds = useMemo(() => {
    if (!baseItems.length) return [0, 1000] as [number, number];
    const ps = baseItems.map((p) => Math.round(p.price));
    return [Math.min(...ps), Math.max(...ps)] as [number, number];
  }, [baseItems]);

  const [sizeSel, setSizeSel] = useState<string[]>([]);
  const [colorSel, setColorSel] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number] | null>(null);
  const [onlyNew, setOnlyNew] = useState(false);
  const [onlySale, setOnlySale] = useState(false);

  const effectivePrice: [number, number] = priceRange ?? priceBounds;

  const filtered = useMemo(() => {
    const now = Date.now();
    const THIRTY = 30 * 24 * 60 * 60 * 1000;
    return baseItems.filter((p) => {
      if (sizeSel.length) {
        const has = (p.sizeAvailability || []).some(
          (s) => sizeSel.includes(s.size) && s.available > 0,
        );
        if (!has) return false;
      }
      if (colorSel.length) {
        if (!p.color || !colorSel.includes(p.color.trim())) return false;
      }
      if (p.price < effectivePrice[0] || p.price > effectivePrice[1]) return false;
      if (onlyNew) {
        if (!p.createdAt || now - new Date(p.createdAt).getTime() > THIRTY) return false;
      }
      if (onlySale && !(p.discountPercent && p.discountPercent > 0)) return false;
      return true;
    });
  }, [baseItems, sizeSel, colorSel, effectivePrice, onlyNew, onlySale]);

  const items = filtered;

  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems = items.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const toggleArr = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const clearAll = () => {
    setSizeSel([]);
    setColorSel([]);
    setPriceRange(null);
    setOnlyNew(false);
    setOnlySale(false);
    setPage(1);
  };

  const activePills: { key: string; label: string; remove: () => void }[] = [];
  sizeSel.forEach((s) =>
    activePills.push({
      key: `size-${s}`,
      label: `Tamanho ${s}`,
      remove: () => setSizeSel((prev) => prev.filter((x) => x !== s)),
    }),
  );
  colorSel.forEach((c) =>
    activePills.push({
      key: `color-${c}`,
      label: c,
      remove: () => setColorSel((prev) => prev.filter((x) => x !== c)),
    }),
  );
  if (priceRange) {
    activePills.push({
      key: "price",
      label: `€${priceRange[0]} — €${priceRange[1]}`,
      remove: () => setPriceRange(null),
    });
  }
  if (onlyNew)
    activePills.push({ key: "new", label: "Novidades", remove: () => setOnlyNew(false) });
  if (onlySale)
    activePills.push({ key: "sale", label: "Em promoção", remove: () => setOnlySale(false) });

  const filterPanel = (
    <FiltersPanel
      allSizes={allSizes}
      allColors={allColors}
      priceBounds={priceBounds}
      sizeSel={sizeSel}
      colorSel={colorSel}
      priceRange={effectivePrice}
      onlyNew={onlyNew}
      onlySale={onlySale}
      onSize={(s) => {
        setSizeSel((prev) => toggleArr(prev, s));
        setPage(1);
      }}
      onColor={(c) => {
        setColorSel((prev) => toggleArr(prev, c));
        setPage(1);
      }}
      onPrice={(r) => {
        setPriceRange(r);
        setPage(1);
      }}
      onNew={(v) => {
        setOnlyNew(v);
        setPage(1);
      }}
      onSale={(v) => {
        setOnlySale(v);
        setPage(1);
      }}
    />
  );

  return (
    <Layout>
      <section className="mx-auto max-w-7xl px-4 pt-8 md:px-8 md:pt-14">
        <p className="text-xs uppercase tracking-[0.25em] text-primary">Colecção</p>
        <h1 className="mt-2 font-display text-4xl italic text-foreground md:text-6xl">
          Toda a colecção
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Peças cuidadosamente seleccionadas das melhores marcas internacionais.
        </p>
      </section>

      <section className="mx-auto mt-8 max-w-7xl px-4 md:px-8">
        <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
          {BRANDS.map((b) => {
            const active = activeBrand === b;
            return (
              <button
                key={b}
                onClick={() => {
                  setActiveBrand(b);
                  setPage(1);
                }}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-[10px] font-light uppercase tracking-[0.15em] transition ${
                  active
                    ? "border-primary/40 bg-primary-soft text-primary"
                    : "border-border/60 bg-transparent text-muted-foreground hover:border-foreground/30 hover:text-foreground"
                }`}
              >
                {b}
              </button>
            );
          })}
        </div>

        {/* Active filter pills + mobile filter button */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Drawer open={mobileOpen} onOpenChange={setMobileOpen}>
            <DrawerTrigger asChild>
              <button className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1.5 text-[11px] uppercase tracking-[0.15em] text-foreground hover:border-foreground/30 md:hidden">
                <SlidersHorizontal size={14} strokeWidth={1.5} />
                Filtrar
                {activePills.length > 0 && (
                  <span className="ml-1 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                    {activePills.length}
                  </span>
                )}
              </button>
            </DrawerTrigger>
            <DrawerContent className="max-h-[85vh]">
              <DrawerHeader>
                <DrawerTitle className="font-display text-xl italic">Filtros</DrawerTitle>
              </DrawerHeader>
              <div className="overflow-y-auto px-4 pb-8">{filterPanel}</div>
            </DrawerContent>
          </Drawer>

          {activePills.map((p) => (
            <button
              key={p.key}
              onClick={p.remove}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[11px] text-primary hover:bg-primary-soft/70"
            >
              {p.label}
              <X size={12} strokeWidth={2} />
            </button>
          ))}
          {activePills.length > 0 && (
            <button
              onClick={clearAll}
              className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              Limpar filtros
            </button>
          )}
        </div>

        <p className="mt-3 text-xs font-light text-muted-foreground">
          {items.length} {items.length === 1 ? "peça encontrada" : "peças encontradas"}
        </p>
      </section>

      <section className="mx-auto mt-8 max-w-7xl px-4 pb-16 md:px-8">
        <div className="flex gap-8">
          <aside className="hidden w-60 shrink-0 md:block">
            <div className="sticky top-24">{filterPanel}</div>
          </aside>
          <div className="min-w-0 flex-1">
            {pageItems.length === 0 ? (
              <p className="py-20 text-center text-sm text-muted-foreground">
                Sem peças nesta selecção.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-2 md:gap-x-6 lg:grid-cols-3">
                {pageItems.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            )}
            <SimplePagination page={currentPage} totalPages={totalPages} onChange={setPage} />
          </div>
        </div>
      </section>
    </Layout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-border/40 py-5 first:pt-0 last:border-0">
      <h3 className="mb-3 text-[11px] font-medium uppercase tracking-[0.18em] text-foreground">
        {title}
      </h3>
      {children}
    </div>
  );
}

function FiltersPanel({
  allSizes,
  allColors,
  priceBounds,
  sizeSel,
  colorSel,
  priceRange,
  onlyNew,
  onlySale,
  onSize,
  onColor,
  onPrice,
  onNew,
  onSale,
}: {
  allSizes: string[];
  allColors: string[];
  priceBounds: [number, number];
  sizeSel: string[];
  colorSel: string[];
  priceRange: [number, number];
  onlyNew: boolean;
  onlySale: boolean;
  onSize: (s: string) => void;
  onColor: (c: string) => void;
  onPrice: (r: [number, number] | null) => void;
  onNew: (v: boolean) => void;
  onSale: (v: boolean) => void;
}) {
  return (
    <div>
      {allSizes.length > 0 && (
        <Section title="Tamanho">
          <div className="flex flex-wrap gap-2">
            {allSizes.map((s) => {
              const active = sizeSel.includes(s);
              return (
                <label
                  key={s}
                  className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-[11px] transition ${
                    active
                      ? "border-primary/40 bg-primary-soft text-primary"
                      : "border-border/60 text-muted-foreground hover:border-foreground/30"
                  }`}
                >
                  <Checkbox
                    checked={active}
                    onCheckedChange={() => onSize(s)}
                    className="h-3 w-3"
                  />
                  {s}
                </label>
              );
            })}
          </div>
        </Section>
      )}

      <Section title="Preço">
        <Slider
          min={priceBounds[0]}
          max={priceBounds[1]}
          step={10}
          value={[priceRange[0], priceRange[1]]}
          onValueChange={(v) => onPrice([v[0], v[1]] as [number, number])}
          minStepsBetweenThumbs={1}
        />
        <p className="mt-2 text-[11px] text-muted-foreground">
          €{priceRange[0]} — €{priceRange[1]}
        </p>
      </Section>

      {allColors.length > 0 && (
        <Section title="Cor">
          <div className="flex flex-wrap gap-2">
            {allColors.map((c) => {
              const active = colorSel.includes(c);
              return (
                <button
                  key={c}
                  onClick={() => onColor(c)}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] transition ${
                    active
                      ? "border-primary/40 bg-primary-soft text-primary"
                      : "border-border/60 text-muted-foreground hover:border-foreground/30"
                  }`}
                >
                  <span
                    className="h-3 w-3 rounded-full ring-1 ring-border"
                    style={{ backgroundColor: colorSwatch(c) }}
                  />
                  {c}
                </button>
              );
            })}
          </div>
        </Section>
      )}

      <Section title="Novidades">
        <label className="flex cursor-pointer items-center justify-between text-[12px] text-muted-foreground">
          <span>Últimos 30 dias</span>
          <Switch checked={onlyNew} onCheckedChange={onNew} />
        </label>
      </Section>

      <Section title="Em promoção">
        <label className="flex cursor-pointer items-center justify-between text-[12px] text-muted-foreground">
          <span>Apenas com desconto</span>
          <Switch checked={onlySale} onCheckedChange={onSale} />
        </label>
      </Section>
    </div>
  );
}