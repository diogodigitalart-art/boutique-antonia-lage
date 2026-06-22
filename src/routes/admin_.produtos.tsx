import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { BRANDS } from "@/lib/data";
import { displaySize, normalizeSize } from "@/lib/utils";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  Search,
  Upload,
  X,
  ChevronDown,
  ChevronUp,
  Minus,
  ImageOff,
  FileSpreadsheet,
  ScanLine,
  ArrowDownToLine,
  ArrowUpFromLine,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  adminListProducts,
  adminUpsertProduct,
  adminDeleteProduct,
  adminToggleProductActive,
  adminUploadProductImage,
  adminListBrands,
  adminAddBrand,
  adminDeleteBrand,
  adminListSeasons,
  adminAdjustStockByBarcode,
  adminBulkDeactivateByRefs,
} from "@/server-fns/products";
import { adminGetWaitlistCounts } from "@/server-fns/features";

const CATEGORIES: Array<{ value: string; label: string }> = [
  { value: "colecção", label: "Colecção" },
  { value: "arquivo", label: "Arquivo" },
];

// Categoria (subcategory) — distinct from Grupo. Stored in `subcategory` column.
export const SUBCATEGORIES: string[] = [
  "Vestidos",
  "Tops e Blusas",
  "Casacos e Blazers",
  "Calças, Saias e Calções",
  "Malhas",
  "Sweaters e Hoodies",
  "Acessórios",
  "Malas",
  "Sapatos",
  "Bijuteria",
  "Outros",
];

const SIZE_PRESETS: Array<{ label: string; sizes: string[] }> = [
  { label: "XS S M L XL", sizes: ["XS", "S", "M", "L", "XL"] },
  { label: "XXS XS S M L XL XXL", sizes: ["XXS", "XS", "S", "M", "L", "XL", "XXL"] },
  { label: "34 36 38 40 42 44 46", sizes: ["34", "36", "38", "40", "42", "44", "46"] },
  { label: "36 38 40 42 44 46 48 50", sizes: ["36", "38", "40", "42", "44", "46", "48", "50"] },
  { label: "4 6 8 10 12 14 16 18", sizes: ["4", "6", "8", "10", "12", "14", "16", "18"] },
  { label: "00 0 2 4 6 8 10 12 14 16", sizes: ["00", "0", "2", "4", "6", "8", "10", "12", "14", "16"] },
];

// Convert values like "5,05994E+12" or "5.05994E+12" to a plain integer string.
// Returns the original trimmed string when it's already a plain non-scientific value.
export function normalizeBarcode(raw: string | null | undefined): string {
  if (raw == null) return "";
  const s = String(raw).trim();
  if (!s) return "";
  // Detect scientific notation (with comma or dot decimal)
  if (/e[+-]?\d+/i.test(s)) {
    const normalized = s.replace(",", ".");
    const n = Number(normalized);
    if (Number.isFinite(n)) {
      // Use toFixed(0) to avoid scientific notation in the result
      return Math.round(n).toLocaleString("fullwide", { useGrouping: false });
    }
  }
  return s;
}

export const Route = createFileRoute("/admin_/produtos")({
  head: () => ({ meta: [{ title: "Gestão de produtos | Admin" }] }),
  component: () => (
    <AdminLayout>
      <Content />
    </AdminLayout>
  ),
});

type ProductSize = { size: string; stock: number; reserved: number; barcode?: string | null };
type ProductRow = {
  id: string;
  name: string;
  brand: string;
  description: string;
  price: number;
  original_price: number | null;
  category: string;
  reference: string;
  external_id?: string | null;
  season: string | null;
  discount_percent: number | null;
  images: string[];
  sizes: ProductSize[];
  is_active: boolean;
  is_manually_reserved?: boolean;
  created_at: string;
  barcode?: string | null;
  cost_price?: number | null;
  color?: string | null;
  composition?: string | null;
  care_instructions?: string | null;
  subcategory?: string | null;
  catalog_status?: string | null;
};
type BrandRow = { id: string; name: string };

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error("Sessão expirada");
  return token;
}

function Content() {
  const listFn = useServerFn(adminListProducts);
  const deleteFn = useServerFn(adminDeleteProduct);
  const toggleFn = useServerFn(adminToggleProductActive);
  const listBrandsFn = useServerFn(adminListBrands);
  const listSeasonsFn = useServerFn(adminListSeasons);
  const waitlistCountsFn = useServerFn(adminGetWaitlistCounts);

  const [rows, setRows] = useState<ProductRow[]>([]);
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [seasons, setSeasons] = useState<BrandRow[]>([]);
  const [waitlistCounts, setWaitlistCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [filterBrand, setFilterBrand] = useState<string>("all");
  const [filterSeason, setFilterSeason] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [filterSubcategory, setFilterSubcategory] = useState<string>("all");

  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [showBrands, setShowBrands] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [deleteConfirmRow, setDeleteConfirmRow] = useState<ProductRow | null>(null);

  const refresh = useCallback(async () => {
    try {
      const token = await getToken();
      const [p, b, sRes, w] = await Promise.all([
        listFn({ data: { token } }),
        listBrandsFn({ data: { token } }),
        listSeasonsFn({ data: { token } }),
        waitlistCountsFn({ data: { token } }).catch(() => ({ counts: {} as Record<string, number> })),
      ]);
      setRows((p.rows as unknown) as ProductRow[]);
      setBrands((b.rows as unknown) as BrandRow[]);
      setSeasons((sRes.rows as unknown) as BrandRow[]);
      setWaitlistCounts(w.counts || {});
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, [listFn, listBrandsFn, listSeasonsFn, waitlistCountsFn]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterCat !== "all" && r.category !== filterCat) return false;
      if (filterBrand !== "all" && r.brand !== filterBrand) return false;
      if (filterSeason !== "all" && (r.season || "") !== filterSeason) return false;
      if (filterStatus === "active" && !r.is_active) return false;
      if (filterStatus === "inactive" && r.is_active) return false;
      if (filterSubcategory !== "all" && r.subcategory !== filterSubcategory) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.brand.toLowerCase().includes(q) ||
        (r.reference || "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, filterCat, filterBrand, filterSeason, filterStatus, filterSubcategory]);

  const toggleActive = async (r: ProductRow) => {
    try {
      const token = await getToken();
      await toggleFn({ data: { token, id: r.id, is_active: !r.is_active } });
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const remove = async (r: ProductRow) => {
    setDeleteConfirmRow(r);
  };
  const confirmDelete = async () => {
    if (!deleteConfirmRow) return;
    try {
      const token = await getToken();
      await deleteFn({ data: { token, id: deleteConfirmRow.id } });
      toast.success("Removido");
      setDeleteConfirmRow(null);
      setEditing(null);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const bulkSetActive = async (active: boolean) => {
    if (selected.size === 0) return;
    try {
      const token = await getToken();
      await Promise.all(
        Array.from(selected).map((id) => toggleFn({ data: { token, id, is_active: active } })),
      );
      toast.success(active ? "Produtos activados" : "Produtos desactivados");
      setSelected(new Set());
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  const allBrandNames = useMemo(() => {
    const set = new Set<string>();
    BRANDS.filter((b) => b !== "Todas").forEach((b) => set.add(b));
    brands.forEach((b) => set.add(b.name));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [brands]);
  const seasonNames = useMemo(() => seasons.map((s) => s.name), [seasons]);

  const allChecked = filtered.length > 0 && filtered.every((r) => selected.has(r.id));
  const toggleAll = () => {
    if (allChecked) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((r) => r.id)));
    }
  };
  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6 md:py-8">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="font-display text-2xl italic md:text-3xl">Produtos</h1>
          <span className="text-xs text-muted-foreground">{filtered.length} produtos</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScanning(true)}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm text-foreground hover:bg-muted"
          >
            <ScanLine size={16} /> Scan
          </button>
          <button
            onClick={() => setImporting(true)}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm text-foreground hover:bg-muted"
          >
            <FileSpreadsheet size={16} /> Importar produtos
          </button>
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground hover:bg-primary/90"
          >
            <Plus size={16} /> Adicionar produto
          </button>
        </div>
      </div>

      <BrandsSection
        open={showBrands}
        onToggle={() => setShowBrands((v) => !v)}
        customBrands={brands}
        onChanged={refresh}
      />

      {/* Filter bar */}
      <div className="mb-3 mt-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Procurar por marca, nome ou referência…"
            className="h-9 w-full rounded-md border border-border bg-card pl-8 pr-3 text-[13px] outline-none focus:border-primary"
          />
        </div>
        <FilterSelect
          value={filterCat}
          onChange={setFilterCat}
          options={[{ value: "all", label: "Todos grupos" }, ...CATEGORIES]}
        />
        <FilterSelect
          value={filterSubcategory}
          onChange={setFilterSubcategory}
          options={[
            { value: "all", label: "Todas as categorias" },
            ...SUBCATEGORIES.map((s) => ({ value: s, label: s })),
          ]}
        />
        <FilterSelect
          value={filterBrand}
          onChange={setFilterBrand}
          options={[
            { value: "all", label: "Todas marcas" },
            ...allBrandNames.map((b) => ({ value: b, label: b })),
          ]}
        />
        <FilterSelect
          value={filterSeason}
          onChange={setFilterSeason}
          options={[
            { value: "all", label: "Todas seasons" },
            ...seasonNames.map((s) => ({ value: s, label: s })),
          ]}
        />
        <FilterSelect
          value={filterStatus}
          onChange={(v) => setFilterStatus(v as "all" | "active" | "inactive")}
          options={[
            { value: "all", label: "Todos estados" },
            { value: "active", label: "Activo" },
            { value: "inactive", label: "Inactivo" },
          ]}
        />
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="mb-3 flex items-center gap-3 rounded-md border border-primary/30 bg-primary-soft/40 px-3 py-2 text-[13px]">
          <span className="text-foreground">{selected.size} selecionado(s)</span>
          <button
            onClick={() => bulkSetActive(true)}
            className="rounded-md border border-border bg-background px-3 py-1 text-xs hover:bg-muted"
          >
            Activar seleccionados
          </button>
          <button
            onClick={() => bulkSetActive(false)}
            className="rounded-md border border-border bg-background px-3 py-1 text-xs hover:bg-muted"
          >
            Desactivar seleccionados
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground"
          >
            Limpar selecção
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-border bg-card">
          <div className="max-h-[calc(100vh-320px)] overflow-auto">
            <table className="w-full border-collapse text-[13px]">
              <thead className="sticky top-0 z-10 bg-muted/80 backdrop-blur">
                <tr className="border-b border-border text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="w-10 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={toggleAll}
                      className="h-3.5 w-3.5 cursor-pointer"
                    />
                  </th>
                  <th className="w-12 px-2 py-2.5"></th>
                  <th className="px-3 py-2.5">Marca</th>
                  <th className="px-3 py-2.5">Nome</th>
                  <th className="px-3 py-2.5">Ref.</th>
                  <th className="px-3 py-2.5">Season</th>
                  <th className="px-3 py-2.5">Grupo</th>
                  <th className="px-3 py-2.5 text-right">Preço</th>
                  <th className="px-3 py-2.5">Tamanhos / Stock</th>
                  <th className="px-3 py-2.5">Estado</th>
                  <th className="w-12 px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const sizes = Array.isArray(r.sizes) ? r.sizes : [];
                  const sizesSummary =
                    sizes.length > 0
                      ? sizes
                          .map(
                            (s) =>
                              `${displaySize(s.size)}:${Math.max(0, s.stock - s.reserved)}`,
                          )
                          .join(" ")
                      : "—";
                  const cover = r.images?.[0];
                  const isSel = selected.has(r.id);
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setEditing(r)}
                      className={`cursor-pointer border-b border-border/60 transition hover:bg-muted/40 ${
                        isSel ? "bg-primary-soft/30" : ""
                      }`}
                    >
                      <td
                        className="px-3 py-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSel}
                          onChange={() => toggleOne(r.id)}
                          className="h-3.5 w-3.5 cursor-pointer"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <div className="h-9 w-9 overflow-hidden rounded-md bg-muted">
                          {cover ? (
                            <img
                              src={cover}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                              <ImageOff size={14} strokeWidth={1.5} />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-foreground">{r.brand}</td>
                      <td className="px-3 py-2 font-medium text-foreground">
                        <span className="inline-flex items-center gap-2">
                          {r.name}
                          {waitlistCounts[r.id] ? (
                            <span
                              title={`${waitlistCounts[r.id]} pessoa(s) em lista de espera`}
                              className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wider text-amber-800"
                            >
                              ⏳ {waitlistCounts[r.id]}
                            </span>
                          ) : null}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                        <div>{r.reference}</div>
                        {r.external_id && (
                          <div className="text-[10px] text-muted-foreground/70">
                            ID: {r.external_id}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {r.season || "—"}
                      </td>
                      <td className="px-3 py-2 capitalize text-muted-foreground">
                        {r.category}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">€{r.price}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                        {sizesSummary}
                      </td>
                      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleActive(r)}
                          className={`rounded-full px-2.5 py-0.5 text-[10px] uppercase tracking-wider ${
                            r.is_active
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {r.is_active ? "Activo" : "Inactivo"}
                        </button>
                        {r.catalog_status === "out_of_catalog" && (
                          <span
                            title="Não consta no último CSV importado"
                            className="ml-1 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[9px] uppercase tracking-wider text-amber-800"
                          >
                            Fora de catálogo
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setEditing(r)}
                          aria-label="Editar"
                          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Pencil size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={11}
                      className="px-4 py-12 text-center text-xs text-muted-foreground"
                    >
                      Sem produtos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(editing || creating) && (
        <ProductForm
          row={editing}
          brandOptions={allBrandNames}
          seasonOptions={seasonNames}
          onClose={() => {
            setEditing(null);
            setCreating(false);
          }}
          onSaved={(addAnother) => {
            refresh();
            setEditing(null);
            if (addAnother) {
              setCreating(true);
            } else {
              setCreating(false);
            }
          }}
          onDelete={() => {
            if (!editing) return;
            remove(editing);
          }}
        />
      )}

      {importing && (
        <ImportProductsModal
          brandOptions={allBrandNames}
          onClose={() => setImporting(false)}
          onDone={() => {
            setImporting(false);
            refresh();
          }}
        />
      )}

      {scanning && (
        <ScanModal
          onClose={() => {
            setScanning(false);
            refresh();
          }}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteConfirmRow} onOpenChange={(o) => { if (!o) setDeleteConfirmRow(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar produto</AlertDialogTitle>
            <AlertDialogDescription>
              Tens a certeza que queres eliminar este produto? Esta acção não pode ser revertida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteConfirmRow(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-md border border-border bg-card px-3 text-[13px] outline-none focus:border-primary"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function BrandsSection({
  open,
  onToggle,
  customBrands,
  onChanged,
}: {
  open: boolean;
  onToggle: () => void;
  customBrands: BrandRow[];
  onChanged: () => void;
}) {
  const addFn = useServerFn(adminAddBrand);
  const delFn = useServerFn(adminDeleteBrand);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      const token = await getToken();
      await addFn({ data: { token, name: name.trim() } });
      setName("");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      const token = await getToken();
      await delFn({ data: { token, id } });
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    }
  };

  return (
    <div className="rounded-md border border-border bg-card">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-2.5 text-[13px] font-medium"
      >
        <span>Marcas ({customBrands.length} personalizadas)</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div className="border-t border-border p-4">
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nova marca…"
              className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-[13px]"
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
            <button
              onClick={add}
              disabled={busy}
              className="rounded-md bg-primary px-4 py-1.5 text-[13px] text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              Adicionar
            </button>
          </div>
          {customBrands.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {customBrands.map((b) => (
                <span
                  key={b.id}
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs"
                >
                  {b.name}
                  <button
                    onClick={() => remove(b.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            As marcas predefinidas estão sempre disponíveis. Aqui podes adicionar outras.
          </p>
        </div>
      )}
    </div>
  );
}

type FormState = {
  brand: string;
  name: string;
  reference: string;
  external_id: string;
  barcode: string;
  description: string;
  price: string;
  cost_price: string;
  original_price: string;
  discount_percent: string;
  category: string;
  subcategory: string;
  season: string;
  is_active: boolean;
  oneSize: boolean;
  sizes: Array<{ size: string; stock: number; barcode: string }>;
  oneSizeStock: number;
  oneSizeBarcode: string;
  images: string[];
  color: string;
  composition: string;
  care_instructions: string;
  is_manually_reserved: boolean;
};

function emptyForm(brandOptions: string[]): FormState {
  return {
    brand: brandOptions[0] ?? "",
    name: "",
    reference: "",
    external_id: "",
    barcode: "",
    description: "",
    price: "",
    cost_price: "",
    original_price: "",
    discount_percent: "",
    category: "colecção",
    subcategory: "",
    season: "",
    is_active: true,
    oneSize: false,
    sizes: [],
    oneSizeStock: 0,
    oneSizeBarcode: "",
    images: [],
    color: "",
    composition: "",
    care_instructions: "",
    is_manually_reserved: false,
  };
}

function ProductForm({
  row,
  brandOptions,
  seasonOptions,
  onClose,
  onSaved,
  onDelete,
}: {
  row: ProductRow | null;
  brandOptions: string[];
  seasonOptions: string[];
  onClose: () => void;
  onSaved: (addAnother: boolean) => void;
  onDelete: () => void;
}) {
  const isEdit = !!row;
  const upsertFn = useServerFn(adminUpsertProduct);
  const uploadFn = useServerFn(adminUploadProductImage);

  const existingSizes = Array.isArray(row?.sizes) ? row!.sizes : [];
  const isOneSize = existingSizes.length === 1 && existingSizes[0]?.size === "U";
  const initialSizesList: Array<{ size: string; stock: number; barcode: string }> = isOneSize
    ? []
    : existingSizes.map((s) => ({
        size: s.size,
        stock: Number(s.stock) || 0,
        barcode: normalizeBarcode(s.barcode ?? ""),
      }));
  const oneSizeStock = isOneSize ? existingSizes[0].stock : 0;
  const oneSizeBarcode = isOneSize ? normalizeBarcode(existingSizes[0].barcode ?? "") : "";

  const knownBrand = !row || brandOptions.includes(row.brand);
  const [form, setForm] = useState<FormState>(
    row
      ? {
          brand: knownBrand ? row.brand : row.brand,
          name: row.name,
          reference: row.reference,
          external_id: row.external_id ?? "",
          barcode: normalizeBarcode(row.barcode ?? ""),
          description: row.description,
          price: String(row.price),
          cost_price: row.cost_price != null ? String(row.cost_price) : "",
          original_price: row.original_price != null ? String(row.original_price) : "",
          discount_percent: row.discount_percent != null ? String(row.discount_percent) : "",
          category: row.category,
          subcategory: row.subcategory ?? "",
          season: row.season ?? "",
          is_active: row.is_active,
          oneSize: isOneSize,
          sizes: initialSizesList,
          oneSizeStock,
          oneSizeBarcode,
          images: row.images ?? [],
          color: row.color ?? "",
          composition: row.composition ?? "",
          care_instructions: row.care_instructions ?? "",
          is_manually_reserved: !!row.is_manually_reserved,
        }
      : emptyForm(brandOptions),
  );
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [liveSizes, setLiveSizes] = useState<ProductSize[]>(existingSizes);

  const fileToBase64 = (file: File): Promise<{ base64: string; type: string }> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1] || "";
        resolve({ base64, type: file.type || "image/jpeg" });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const token = await getToken();
      const remaining = 6 - form.images.length;
      const newUrls: string[] = [];
      for (const f of Array.from(files).slice(0, remaining)) {
        const { base64, type } = await fileToBase64(f);
        const res = await uploadFn({
          data: { token, filename: f.name, contentType: type, dataBase64: base64 },
        });
        newUrls.push((res as { url: string }).url);
      }
      setForm((f) => ({ ...f, images: [...f.images, ...newUrls] }));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro a carregar imagem");
    } finally {
      setUploading(false);
    }
  };

  const submit = async (addAnother: boolean) => {
    if (!form.brand.trim()) return toast.error("Indica a marca.");
    if (!form.name.trim()) return toast.error("Indica o nome.");
    if (!form.reference.trim()) return toast.error("Indica a referência.");
    if (!form.price || isNaN(Number(form.price))) return toast.error("Preço inválido.");
    if (form.is_active && form.images.length === 0) {
      return toast.error("Este produto não tem fotos e não pode ser activado.");
    }

    let sizesPayload: ProductSize[];
    if (form.oneSize) {
      const liveU = liveSizes.find((x) => x.size === "U");
      sizesPayload = [
        {
          size: "U",
          stock: Math.max(0, form.oneSizeStock || 0),
          reserved: liveU?.reserved ?? 0,
          barcode: form.oneSizeBarcode.trim() || null,
        },
      ];
    } else {
      sizesPayload = form.sizes
        .filter((s) => s.size.trim() !== "")
        .map((s) => {
          const live = liveSizes.find((x) => x.size === s.size);
          return {
            size: s.size.trim(),
            stock: Math.max(0, Number(s.stock) || 0),
            reserved: live?.reserved ?? 0,
            barcode: s.barcode.trim() || null,
          };
        });
    }

    setSaving(true);
    try {
      const token = await getToken();
      await upsertFn({
        data: {
          token,
          product: {
            id: row?.id,
            brand: form.brand.trim(),
            name: form.name.trim(),
            reference: form.reference.trim(),
            external_id: form.external_id.trim() || null,
            barcode: form.barcode.trim() || null,
            description: form.description.trim(),
            price: Number(form.price),
            cost_price: form.cost_price ? Number(form.cost_price) : null,
            original_price: form.original_price ? Number(form.original_price) : null,
            discount_percent: form.discount_percent ? Number(form.discount_percent) : null,
            category: form.category,
            subcategory: form.subcategory.trim() || null,
            season: form.season.trim() || null,
            images: form.images,
            sizes: sizesPayload,
            is_active: form.is_active,
            is_manually_reserved: form.is_manually_reserved,
            color: form.color.trim() || null,
            composition: form.composition.trim() || null,
            care_instructions: form.care_instructions.trim() || null,
          },
        },
      });
      toast.success(isEdit ? "Produto actualizado" : "Produto criado");
      onSaved(addAnother);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setSaving(false);
    }
  };

  const adjust = (size: string, delta: 1 | -1) => {
    setLiveSizes((prev) =>
      prev.map((s) =>
        s.size === size
          ? { ...s, reserved: Math.max(0, Math.min(s.stock, s.reserved + delta)) }
          : s,
      ),
    );
  };

  // Live preview pricing
  const previewPrice = (() => {
    const base = Number(form.price) || 0;
    const pct = form.discount_percent ? Number(form.discount_percent) : 0;
    if (pct > 0) return Math.round(base * (1 - pct / 100) * 100) / 100;
    return base;
  })();
  const previewOriginal = (() => {
    const pct = form.discount_percent ? Number(form.discount_percent) : 0;
    if (pct > 0) return Number(form.price) || 0;
    return form.original_price ? Number(form.original_price) : null;
  })();

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1 bg-foreground/40" />
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-full w-full max-w-[1100px] flex-col bg-background shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              {isEdit ? "Editar" : "Novo"}
            </p>
            <h2 className="font-display text-xl italic">
              {isEdit ? row!.name : "Novo produto"}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {isEdit && (
              <button
                onClick={onDelete}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-[13px] text-destructive hover:bg-destructive/10"
              >
                <Trash2 size={13} /> Eliminar
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-md p-2 text-muted-foreground hover:bg-muted"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body — two columns */}
        <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto p-6 lg:grid-cols-[1fr_380px]">
          {/* Left column */}
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Marca">
                <select
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  className="h-10 w-full rounded-md border border-border bg-card px-3 text-[13px]"
                >
                  {brandOptions.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                  {!brandOptions.includes(form.brand) && form.brand && (
                    <option value={form.brand}>{form.brand}</option>
                  )}
                </select>
              </Field>
              <Field label="Grupo">
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="h-10 w-full rounded-md border border-border bg-card px-3 text-[13px]"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Categoria">
                <select
                  value={form.subcategory}
                  onChange={(e) => setForm({ ...form, subcategory: e.target.value })}
                  className="h-10 w-full rounded-md border border-border bg-card px-3 text-[13px]"
                >
                  <option value="">— Sem categoria —</option>
                  {SUBCATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Nome" className="sm:col-span-2">
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="h-10 w-full rounded-md border border-border bg-card px-3 text-[13px]"
                />
              </Field>
              <Field label="Referência">
                <input
                  value={form.reference}
                  onChange={(e) => setForm({ ...form, reference: e.target.value })}
                  className="h-10 w-full rounded-md border border-border bg-card px-3 font-mono text-[13px]"
                />
              </Field>
              <Field label="ID Externo (Farfetch)">
                <input
                  value={form.external_id}
                  onChange={(e) => setForm({ ...form, external_id: e.target.value })}
                  placeholder="ex: 12345678"
                  className="h-10 w-full rounded-md border border-border bg-card px-3 font-mono text-[13px]"
                />
              </Field>
              <Field label="Desconto (%)">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={form.discount_percent}
                  onChange={(e) => setForm({ ...form, discount_percent: e.target.value })}
                  placeholder="ex: 20"
                  className="h-10 w-full rounded-md border border-border bg-card px-3 text-[13px]"
                />
              </Field>
              <Field label="Season">
                <select
                  value={form.season}
                  onChange={(e) => setForm({ ...form, season: e.target.value })}
                  className="h-10 w-full rounded-md border border-border bg-card px-3 text-[13px]"
                >
                  <option value="">— Sem season —</option>
                  {seasonOptions.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                  {form.season && !seasonOptions.includes(form.season) && (
                    <option value={form.season}>{form.season} (legado)</option>
                  )}
                </select>
              </Field>
              <Field label="Preço (€)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="h-10 w-full rounded-md border border-border bg-card px-3 text-[13px]"
                />
              </Field>
              <Field label="Preço de custo (€)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.cost_price}
                  onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
                  className="h-10 w-full rounded-md border border-border bg-card px-3 text-[13px]"
                />
                {(() => {
                  const p = Number(form.price) || 0;
                  const c = Number(form.cost_price) || 0;
                  if (!p || !c) return null;
                  const margin = ((p - c) / p) * 100;
                  return (
                    <p
                      className={`mt-1 text-[11px] ${
                        margin >= 0 ? "text-muted-foreground" : "text-destructive"
                      }`}
                    >
                      Margem: {margin.toFixed(1)}%
                    </p>
                  );
                })()}
              </Field>
              <Field label="Descrição" className="sm:col-span-2">
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={4}
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-[13px]"
                />
              </Field>
              <Field label="Cor">
                <input
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  placeholder="ex: Azul, Floral"
                  className="h-10 w-full rounded-md border border-border bg-card px-3 text-[13px]"
                />
              </Field>
              <Field label="Instruções de lavagem">
                <input
                  value={form.care_instructions}
                  onChange={(e) => setForm({ ...form, care_instructions: e.target.value })}
                  placeholder="ex: Lavagem à mão"
                  className="h-10 w-full rounded-md border border-border bg-card px-3 text-[13px]"
                />
              </Field>
              <Field label="Composição" className="sm:col-span-2">
                <textarea
                  value={form.composition}
                  onChange={(e) => setForm({ ...form, composition: e.target.value })}
                  rows={2}
                  placeholder="ex: 100% Polyester"
                  className="w-full rounded-md border border-border bg-card px-3 py-2 text-[13px]"
                />
              </Field>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-5">
            {/* Live preview card */}
            <div>
              <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                Pré-visualização
              </p>
              <PreviewCard
                brand={form.brand}
                name={form.name}
                price={previewPrice}
                originalPrice={previewOriginal}
                discountPercent={form.discount_percent ? Number(form.discount_percent) : 0}
                image={form.images[0] || null}
                season={form.season}
              />
            </div>

            <div className="rounded-md border border-border bg-card p-4">
              <label
                className={`inline-flex items-center gap-2 text-[13px] ${
                  form.images.length === 0 && !form.is_active
                    ? "cursor-not-allowed opacity-60"
                    : "cursor-pointer"
                }`}
              >
                <input
                  type="checkbox"
                  checked={form.is_active}
                  disabled={form.images.length === 0 && !form.is_active}
                  onChange={(e) => {
                    if (e.target.checked && form.images.length === 0) {
                      toast.error("Este produto não tem fotos e não pode ser activado.");
                      return;
                    }
                    setForm({ ...form, is_active: e.target.checked });
                  }}
                />
                Produto activo (visível no site)
              </label>
              {form.images.length === 0 && (
                <p className="mt-2 text-[12px] text-amber-700">
                  Este produto não tem fotos e não pode ser activado.
                </p>
              )}
            </div>

            <div className="rounded-md border border-border bg-card p-4">
              <label className="inline-flex cursor-pointer items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={form.is_manually_reserved}
                  onChange={(e) =>
                    setForm({ ...form, is_manually_reserved: e.target.checked })
                  }
                />
                Marcar como “Reservado” (mantém visível mesmo sem stock)
              </label>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Quando o stock chega a 0, o produto fica oculto no site. Activa
                esta opção para o manter visível com o selo “Reservado”.
              </p>
            </div>

            <div className="rounded-md border border-border bg-card p-4">
              <label className="inline-flex cursor-pointer items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={form.oneSize}
                  onChange={(e) => setForm({ ...form, oneSize: e.target.checked })}
                />
                Tamanho único
              </label>
              {(() => {
                const total = form.oneSize
                  ? Math.max(0, form.oneSizeStock || 0)
                  : form.sizes.reduce((a, s) => a + (Number(s.stock) || 0), 0);
                return (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Total disponível: <span className="font-medium text-foreground">{total}</span> unidades
                  </p>
                );
              })()}
              {form.oneSize ? (
                <div className="mt-3">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Stock disponível (U)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.oneSizeStock}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        oneSizeStock: Math.max(0, Number(e.target.value) || 0),
                      })
                    }
                    className="mt-1 h-10 w-32 rounded-md border border-border bg-background px-3 text-[13px]"
                  />
                  <label className="mt-3 block text-[10px] uppercase tracking-wider text-muted-foreground">
                    Código de barras (U)
                  </label>
                  <input
                    type="text"
                    value={form.oneSizeBarcode}
                    onChange={(e) => setForm({ ...form, oneSizeBarcode: e.target.value })}
                    placeholder="Código de barras"
                    className="mt-1 h-10 w-full rounded-md border border-border bg-background px-3 font-mono text-[13px]"
                  />
                </div>
              ) : (
                <FlexibleSizes
                  sizes={form.sizes}
                  onChange={(sizes) => setForm({ ...form, sizes })}
                />
              )}
            </div>

            {isEdit && liveSizes.length > 0 && (
              <InventoryAdjustments liveSizes={liveSizes} onAdjust={adjust} />
            )}

            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Imagens (até 6)
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {form.images.map((url, i) => (
                  <div
                    key={url}
                    className="relative aspect-square overflow-hidden rounded-md border border-border bg-muted"
                  >
                    <img src={url} alt="" className="h-full w-full object-cover" />
                    <button
                      onClick={() =>
                        setForm((prev) => {
                          const nextImages = prev.images.filter((_, idx) => idx !== i);
                          return {
                            ...prev,
                            images: nextImages,
                            is_active: nextImages.length === 0 ? false : prev.is_active,
                          };
                        })
                      }
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ))}
                {form.images.length < 6 && (
                  <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-border bg-card text-[11px] text-muted-foreground hover:border-primary">
                    {uploading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Upload size={14} />
                        <span className="mt-1">Carregar</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => upload(e.target.files)}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-border bg-card px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-full px-5 py-2 text-[13px] text-muted-foreground hover:text-foreground"
          >
            Cancelar
          </button>
          {!isEdit && (
            <button
              onClick={() => submit(true)}
              disabled={saving}
              className="rounded-full border border-border bg-background px-5 py-2 text-[13px] text-foreground hover:bg-muted disabled:opacity-60"
            >
              Guardar e adicionar outro
            </button>
          )}
          <button
            onClick={() => submit(false)}
            disabled={saving}
            className="rounded-full bg-primary px-6 py-2 text-[13px] text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {saving ? "A guardar…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function PreviewCard({
  brand,
  name,
  price,
  originalPrice,
  discountPercent,
  image,
  season,
}: {
  brand: string;
  name: string;
  price: number;
  originalPrice: number | null;
  discountPercent: number;
  image: string | null;
  season: string;
}) {
  const hasDiscount = discountPercent > 0;
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="relative aspect-[4/5] w-full bg-muted">
        {image ? (
          <img src={image} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageOff size={28} strokeWidth={1.5} />
          </div>
        )}
        {hasDiscount && (
          <span className="absolute left-3 top-3 rounded-full bg-red-600 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-white">
            −{discountPercent}%
          </span>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-center gap-2">
          <p className="text-[10px] font-light uppercase tracking-[0.18em] text-muted-foreground">
            {brand || "Marca"}
          </p>
          {season && (
            <span className="rounded-full border border-border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.15em] text-muted-foreground">
              {season}
            </span>
          )}
        </div>
        <h3 className="mt-1.5 font-display text-base font-light italic leading-tight text-foreground">
          {name || "Nome do produto"}
        </h3>
        {originalPrice != null && originalPrice !== price ? (
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-sm font-light text-muted-foreground line-through">
              €{originalPrice}
            </span>
            <span className="text-sm font-light text-primary">€{price}</span>
          </div>
        ) : (
          <p className="mt-1.5 text-sm font-light text-foreground">€{price || 0}</p>
        )}
      </div>
    </div>
  );
}

// ============================================================
// CSV import
// ============================================================

function FlexibleSizes({
  sizes,
  onChange,
}: {
  sizes: Array<{ size: string; stock: number; barcode: string }>;
  onChange: (sizes: Array<{ size: string; stock: number; barcode: string }>) => void;
}) {
  const [draft, setDraft] = useState("");

  const addSize = (label: string) => {
    const v = normalizeSize(label.trim()) || label.trim();
    if (!v) return;
    if (sizes.some((s) => s.size.toLowerCase() === v.toLowerCase())) return;
    onChange([...sizes, { size: v, stock: 0, barcode: "" }]);
  };

  const applyPreset = (preset: string[]) => {
    onChange(preset.map((s) => ({ size: s, stock: 0, barcode: "" })));
  };

  const updateStock = (i: number, value: number) => {
    const next = sizes.slice();
    next[i] = { ...next[i], stock: Math.max(0, Number(value) || 0) };
    onChange(next);
  };

  const updateBarcode = (i: number, value: string) => {
    const next = sizes.slice();
    next[i] = { ...next[i], barcode: value };
    onChange(next);
  };

  const remove = (i: number) => {
    onChange(sizes.filter((_, idx) => idx !== i));
  };

  return (
    <div className="mt-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        Presets
      </p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {SIZE_PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => applyPreset(p.sizes)}
            className="rounded-full border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {p.label}
          </button>
        ))}
      </div>

      <p className="mt-3 text-[10px] uppercase tracking-wider text-muted-foreground">
        Stock por tamanho
      </p>
      <div className="mt-2 flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addSize(draft);
              setDraft("");
            }
          }}
          placeholder="ex: 36, M, U…"
          className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-[13px]"
        />
        <button
          type="button"
          onClick={() => {
            addSize(draft);
            setDraft("");
          }}
          className="inline-flex h-9 items-center gap-1 rounded-md bg-primary px-3 text-[13px] text-primary-foreground hover:bg-primary/90"
        >
          <Plus size={14} /> Adicionar
        </button>
      </div>

      {sizes.length === 0 ? (
        <p className="mt-3 rounded-md border border-dashed border-border bg-muted/20 p-3 text-center text-[11px] text-muted-foreground">
          Sem tamanhos. Adiciona acima ou usa um preset.
        </p>
      ) : (
        <div className="mt-2 space-y-1.5">
          {sizes.map((s, i) => (
            <div
              key={`${s.size}-${i}`}
              className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-background px-2 py-1.5"
            >
              <span className="min-w-[40px] text-center font-medium text-[13px]">
                {displaySize(s.size)}
              </span>
              <input
                type="number"
                min="0"
                value={s.stock}
                onChange={(e) => updateStock(i, Number(e.target.value))}
                className="h-8 w-20 rounded border border-border bg-background px-2 text-center text-[13px]"
              />
              <span className="text-[11px] text-muted-foreground">unidades</span>
              <input
                type="text"
                value={s.barcode}
                onChange={(e) => updateBarcode(i, e.target.value)}
                placeholder="Código de barras"
                className="h-8 flex-1 min-w-[140px] rounded border border-border bg-background px-2 font-mono text-[12px]"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                className="ml-auto rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive"
                aria-label="Remover tamanho"
              >
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// CSV import (continued)
// ============================================================

type ParsedRow = {
  brand: string;
  name: string;
  reference: string;
  external_id: string;
  price: number;
  original_price: number | null;
  category: string;
  season: string | null;
  description: string;
  color: string;
  sizes: Array<{ size: string; stock: number; reserved: number; barcode: string }>;
  _error?: string;
};

// Map uppercase CSV brand → preferred display brand. Lookups are
// case-insensitive; unmapped brands fall through unchanged.
const BRAND_DISPLAY_MAP: Record<string, string> = {
  "SELF-PORTRAIT": "Self-Portrait",
  "BA&SH": "BA&SH",
  "ZADIG&VOLTAIRE": "Zadig&Voltaire",
  "ANINE BING": "Anine Bing",
  "RIXO": "Rixo",
  "DVF": "DVF",
  "MOMONI": "Momoni",
  "ALBERTA FERRETTI": "Alberta Ferretti",
  "PHILOSOPHY DI LORENZO SERAFINI": "Philosophy di Lorenzo Serafini",
  "EDWARD ACHOUR PARIS": "Edward Achour Paris",
  "NEEDLE & THREAD": "Needle & Thread",
  "MOSCHINO JEANS": "Moschino Jeans",
  "ERMANNO FIRENZE": "Ermanno Firenze",
};
function stripAccents(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function normalizeBrandKey(s: string): string {
  return stripAccents((s ?? "").trim()).toUpperCase();
}
function normalizeCsvSize(raw: string): string {
  const s = (raw ?? "").trim().toUpperCase();
  return s === "OS" ? "U" : s;
}
function mapBrandDisplay(brand: string): string {
  const k = normalizeBrandKey(brand);
  // Match BRAND_DISPLAY_MAP entries accent-insensitively too.
  for (const [mk, mv] of Object.entries(BRAND_DISPLAY_MAP)) {
    if (normalizeBrandKey(mk) === k) return mv;
  }
  return brand.trim();
}
function brandKey(brand: string, ref: string): string {
  return `${normalizeBrandKey(brand)}::${ref.trim().toUpperCase()}`;
}

type ExistingProductInfo = {
  id: string;
  brand: string | null;
  name: string | null;
  images: string[] | null;
  description: string | null;
  color: string | null;
  composition: string | null;
  care_instructions: string | null;
  cost_price: number | null;
  discount_percent: number | null;
  sizes: Array<{ size: string; stock: number; reserved?: number; barcode?: string | null }> | null;
  external_id: string | null;
  is_active: boolean | null;
};

function hasVal(v: unknown): boolean {
  if (v == null) return false;
  if (typeof v === "string") return v.trim().length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "number") return Number.isFinite(v) && v > 0;
  return true;
}

/** Compute which manual fields will be preserved for an existing product. */
function preservedFields(existing: ExistingProductInfo | undefined): string[] {
  if (!existing) return [];
  const out: string[] = [];
  if (hasVal(existing.name)) out.push("Nome");
  if (hasVal(existing.description)) out.push("Descrição");
  if (hasVal(existing.color)) out.push("Cor");
  if (hasVal(existing.composition)) out.push("Composição");
  if (hasVal(existing.care_instructions)) out.push("Cuidados");
  if (hasVal(existing.images)) out.push("Imagens");
  if (hasVal(existing.cost_price)) out.push("Custo");
  if (hasVal(existing.discount_percent)) out.push("Desconto");
  return out;
}

/** Build the upsert payload merging CSV row with existing DB row per field rules. */
function mergeForImport(r: ParsedRow, existing: ExistingProductInfo | undefined) {
  const name = existing && hasVal(existing.name) ? existing.name! : r.name;
  const images = existing && hasVal(existing.images) ? existing.images! : [];
  const description =
    existing && hasVal(existing.description) ? existing.description! : r.description;
  const color = existing && hasVal(existing.color) ? existing.color! : r.color || null;
  const composition = existing?.composition ?? null;
  const care = existing?.care_instructions ?? null;
  const cost_price = existing?.cost_price ?? null;
  const discount_percent = existing?.discount_percent ?? null;

  // Merge sizes: keep existing sizes (and their reserved + barcode), update
  // stock from CSV. Preserve existing per-size barcodes; fill from CSV only
  // when empty. Add CSV-only sizes.
  const prevSizes = existing?.sizes ?? [];
  const bySize = new Map<string, { size: string; stock: number; reserved: number; barcode: string | null }>();
  for (const s of prevSizes) {
    const key = String(s.size ?? "").trim().toUpperCase();
    if (!key) continue;
    bySize.set(key, {
      size: String(s.size ?? "").trim(),
      stock: Math.max(0, Number(s.stock) || 0),
      reserved: Math.max(0, Number(s.reserved) || 0),
      barcode: (s.barcode ?? null) || null,
    });
  }
  for (const cs of r.sizes) {
    const k = String(cs.size ?? "").trim().toUpperCase();
    if (!k) continue;
    const prev = bySize.get(k);
    if (prev) {
      prev.stock = Math.max(0, Number(cs.stock) || 0);
      if (!prev.barcode && cs.barcode) prev.barcode = cs.barcode;
    } else {
      bySize.set(k, {
        size: String(cs.size).trim(),
        stock: Math.max(0, Number(cs.stock) || 0),
        reserved: 0,
        barcode: cs.barcode || null,
      });
    }
  }
  const sizes = Array.from(bySize.values());

  return {
    id: existing?.id,
    brand: r.brand,
    name,
    reference: r.reference,
    external_id: r.external_id || existing?.external_id || null,
    description,
    price: r.price,
    original_price: r.original_price,
    discount_percent,
    category: r.category,
    season: r.season,
    images,
    sizes,
    // New products imported via CSV are created as inactive — the admin must
    // manually activate them after reviewing details and adding images.
    // Existing products keep their current active state.
    is_active: existing ? !!existing.is_active : false,
    barcode: null,
    cost_price,
    color,
    composition,
    care_instructions: care,
    // Product is present in the current CSV → clear any prior
    // "Fora de catálogo" tag.
    catalog_status: null,
  };
}

// Farfetch-style export: semicolon-separated, one row per SKU (size).
// Multiple sizes of the same product share the same "Brand product ID".
const CSV_TEMPLATE =
  "Brand;Brand product ID;Product ID;Season;Local Market Price;Stock Available;Size;Category;Partner barcode\n" +
  "Self-Portrait;SP-001;12345678;SS26;420;1;XS;Women > Clothing > Dresses;1234567890001\n" +
  "Self-Portrait;SP-001;12345678;SS26;420;2;S;Women > Clothing > Dresses;1234567890002\n" +
  "Self-Portrait;SP-001;12345678;SS26;420;1;M;Women > Clothing > Dresses;1234567890003\n";

function parseCsv(text: string, delimiter: string = ";"): string[][] {
  const rows: string[][] = [];
  let cur = "";
  let row: string[] = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === delimiter) {
        row.push(cur);
        cur = "";
      } else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        row.push(cur);
        cur = "";
        if (row.some((c) => c.trim() !== "")) rows.push(row);
        row = [];
      } else cur += ch;
    }
  }
  if (cur !== "" || row.length > 0) {
    row.push(cur);
    if (row.some((c) => c.trim() !== "")) rows.push(row);
  }
  return rows;
}

function detectDelimiter(text: string): string {
  const firstLine = text.split(/\r?\n/, 1)[0] || "";
  const sc = (firstLine.match(/;/g) || []).length;
  const cm = (firstLine.match(/,/g) || []).length;
  return sc >= cm ? ";" : ",";
}

function categoryLabel(raw: string): string {
  if (!raw) return "";
  const parts = raw.split(">").map((p) => p.trim()).filter(Boolean);
  if (parts.length <= 1) return parts[0] || "";
  return parts.slice(-2).join(" - ");
}

function rowsToProducts(matrix: string[][]): ParsedRow[] {
  if (matrix.length < 2) return [];
  const header = matrix[0].map((h) => h.trim().toLowerCase());
  const findIdx = (...keys: string[]) => {
    for (const k of keys) {
      const j = header.indexOf(k.toLowerCase());
      if (j >= 0) return j;
    }
    return -1;
  };
  const iBrand = findIdx("brand");
  const iRef = findIdx("brand product id", "reference");
  const iExt = findIdx("product id");
  const iSeason = findIdx("season");
  const iPrice = findIdx("local market price", "price");
  const iStock = findIdx("stock available", "stock");
  const iSize = findIdx("size");
  const iCat = findIdx("category");
  const iBarcode = findIdx("partner barcode", "barcode");
  const iColor = findIdx("brand colour id", "brand color id", "colour", "color");

  const grouped = new Map<string, ParsedRow>();
  for (let i = 1; i < matrix.length; i++) {
    const r = matrix[i];
    const cell = (j: number) => (j >= 0 ? (r[j] ?? "").trim() : "");
    const brandRaw = cell(iBrand);
    const brand = mapBrandDisplay(brandRaw);
    const reference = cell(iRef);
    const external_id = cell(iExt);
    if (!brandRaw && !reference) continue;
    const priceStr = cell(iPrice).replace(",", ".");
    const stock = Math.max(0, Math.floor(Number(cell(iStock)) || 0));
    const size = normalizeCsvSize(cell(iSize));
    const season = cell(iSeason);
    const catLabel = categoryLabel(cell(iCat));
    const barcode = normalizeBarcode(cell(iBarcode));
    const color = cell(iColor);

    const key = reference ? brandKey(brandRaw, reference) : `${brandRaw}::${i}`;
    let row = grouped.get(key);
    if (!row) {
      row = {
        brand,
        name: reference || brand,
        reference,
        external_id,
        price: Number(priceStr) || 0,
        original_price: null,
        category: "colecção",
        season: season || null,
        description: catLabel,
        color,
        sizes: [],
      };
      grouped.set(key, row);
    } else {
      // Refresh fields that should always reflect latest CSV row
      if (!row.color && color) row.color = color;
      if (external_id) row.external_id = external_id;
      if (season) row.season = season;
      if (Number(priceStr)) row.price = Number(priceStr);
    }
    if (size) {
      const existing = row.sizes.find(
        (s) => s.size.trim().toUpperCase() === size,
      );
      if (existing) {
        // Consolidate duplicate-size rows for the same product:
        // sum the stock and merge unique barcodes as a comma-separated list.
        existing.stock += stock;
        if (barcode) {
          const have = (existing.barcode || "")
            .split(",")
            .map((b) => b.trim())
            .filter(Boolean);
          if (!have.some((b) => b.toLowerCase() === barcode.toLowerCase())) {
            have.push(barcode);
          }
          existing.barcode = have.join(",");
        }
      } else {
        row.sizes.push({ size, stock, reserved: 0, barcode: barcode || "" });
      }
    }
  }

  const out: ParsedRow[] = [];
  for (const row of grouped.values()) {
    let _error: string | undefined;
    if (!row.brand) _error = "marca em falta";
    else if (!row.reference) _error = "referência em falta";
    else if (!Number.isFinite(row.price) || row.price <= 0) _error = "preço inválido";
    out.push({ ...row, _error });
  }
  return out;
}

function ImportProductsModal({
  brandOptions,
  onClose,
  onDone,
}: {
  brandOptions: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  const upsertFn = useServerFn(adminUpsertProduct);
  const bulkDeactivateFn = useServerFn(adminBulkDeactivateByRefs);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, ok: 0, err: 0 });
  const [existingByRef, setExistingByRef] = useState<
    Map<string, ExistingProductInfo>
  >(new Map());
  const [syncMode, setSyncMode] = useState(false);
  const [refsInDbWithRef, setRefsInDbWithRef] = useState<number>(0);

  const onFile = async (file: File) => {
    setFileName(file.name);
    const text = await file.text();
    const delim = detectDelimiter(text);
    const matrix = parseCsv(text, delim);
    const parsedRaw = rowsToProducts(matrix);
    // Canonicalize brand names against existing DB brands, case- and
    // accent-insensitively. Use the existing DB brand string verbatim so we
    // never overwrite the canonical display name with a CSV variant.
    const brandByKey = new Map<string, string>();
    for (const b of brandOptions) {
      const k = normalizeBrandKey(b);
      if (k && !brandByKey.has(k)) brandByKey.set(k, b);
    }
    const parsed = parsedRaw.map((r) => {
      const existing = brandByKey.get(normalizeBrandKey(r.brand));
      return existing ? { ...r, brand: existing } : r;
    });
    setRows(parsed);
    setProgress({ done: 0, ok: 0, err: 0 });
    // Fetch existing products by reference to determine create vs update
    const refs = Array.from(
      new Set(parsed.map((r) => r.reference).filter((r) => !!r)),
    );
    if (refs.length > 0) {
      const { data, error } = await supabase
        .from("products" as never)
        .select("id, reference, brand, name, images, description, color, composition, care_instructions, cost_price, discount_percent, sizes, external_id, is_active")
        .in("reference", refs);
      if (!error && data) {
        const map = new Map<string, ExistingProductInfo>();
        for (const row of data as Array<ExistingProductInfo & { reference: string }>) {
          map.set(brandKey(row.brand ?? "", row.reference ?? ""), {
            id: row.id,
            brand: row.brand,
            name: row.name,
            images: row.images,
            description: row.description,
            color: row.color,
            composition: row.composition,
            care_instructions: row.care_instructions,
            cost_price: row.cost_price ?? null,
            discount_percent: row.discount_percent ?? null,
            sizes: row.sizes ?? null,
            external_id: row.external_id ?? null,
            is_active: row.is_active ?? null,
          });
        }
        setExistingByRef(map);
      } else {
        setExistingByRef(new Map());
      }
    } else {
      setExistingByRef(new Map());
    }
    // Count active products with a reference (for sync deactivation preview)
    const csvRefs = new Set(refs);
    const { data: allRefRows } = await supabase
      .from("products" as never)
      .select("reference, is_active")
      .not("reference", "is", null)
      .neq("reference", "")
      .eq("is_active", true);
    if (allRefRows) {
      const willDeactivate = (allRefRows as Array<{ reference: string }>).filter(
        (r) => r.reference && !csvRefs.has(r.reference),
      ).length;
      setRefsInDbWithRef(willDeactivate);
    } else {
      setRefsInDbWithRef(0);
    }
  };

  const valid = rows.filter((r) => !r._error);
  const invalid = rows.length - valid.length;
  const lookupExisting = (r: ParsedRow) =>
    existingByRef.get(brandKey(r.brand, r.reference));
  const updateCount = valid.filter((r) => !!lookupExisting(r)).length;
  const createCount = valid.length - updateCount;
  const deactivateCount = syncMode ? refsInDbWithRef : 0;

  const start = async () => {
    if (valid.length === 0) return;
    setImporting(true);
    let ok = 0;
    let err = 0;
    try {
      const token = await getToken();
      for (let i = 0; i < valid.length; i++) {
        const r = valid[i];
        try {
          const existing = lookupExisting(r);
          const merged = mergeForImport(r, existing);
          await upsertFn({
            data: {
              token,
              product: merged,
            },
          });
          ok++;
        } catch (e) {
          console.error("import row failed", e);
          err++;
        }
        setProgress({ done: i + 1, ok, err });
      }
      let deactivated = 0;
      if (syncMode) {
        try {
          const keepRefs = Array.from(
            new Set(valid.map((r) => r.reference).filter((x) => !!x)),
          );
          const res = await bulkDeactivateFn({ data: { token, keepRefs } });
          deactivated = res.deactivated;
        } catch (e) {
          console.error("bulk deactivate failed", e);
        }
      }
      toast.success(
        `Importação: ${ok} ok (${createCount} novo(s), ${updateCount} actualizado(s))${syncMode ? `, ${deactivated} desactivado(s)` : ""}, ${err} erro(s)`,
      );
      if (ok > 0) onDone();
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "produtos-farfetch-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-background shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">CSV</p>
            <h2 className="font-display text-xl italic">Importar produtos</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-2 text-muted-foreground hover:bg-muted">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-[13px] hover:bg-muted">
              <Upload size={14} /> Escolher CSV
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFile(f);
                }}
              />
            </label>
            <button
              onClick={downloadTemplate}
              className="text-[12px] text-primary underline-offset-2 hover:underline"
            >
              Descarregar template
            </button>
            {fileName && <span className="text-[12px] text-muted-foreground">{fileName}</span>}
          </div>

          <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-[12px] text-amber-900">
            Esta importação actualiza stock, preço, época e ID externo dos produtos existentes (estado activo/inactivo é preservado). Nome, descrição, cor, composição, cuidados, fotos, custo, desconto e códigos de barras existentes são <strong>preservados</strong>. <strong>Novos produtos são criados como inactivos</strong> — o admin tem de os activar manualmente depois de rever e adicionar fotos.
          </div>
          <label className="mb-4 flex items-start gap-3 rounded-md border border-border bg-muted/30 p-3 text-[12px] cursor-pointer">
            <input
              type="checkbox"
              checked={syncMode}
              onChange={(e) => setSyncMode(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-primary"
            />
            <span>
              <span className="font-medium text-foreground">Sincronização completa</span>
              <span className="block text-muted-foreground">
                Produtos com referência ausente do CSV são marcados como inactivos. Produtos sem referência nunca são tocados.
              </span>
            </span>
          </label>

          <div className="mb-4 space-y-2 text-[12px] text-muted-foreground">
            <p>
              Formato Farfetch (separador <code>;</code>). Colunas reconhecidas:{" "}
              <code>Brand, Brand product ID, Season, Local Market Price, Stock Available, Size, Category, Partner barcode</code>.
              Linhas com o mesmo <code>Brand product ID</code> são agrupadas como tamanhos do mesmo produto.
            </p>
            <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-800">
              Nome do produto não incluído no ficheiro — será necessário editar cada produto após importação para adicionar o nome correcto.
            </p>
          </div>

          {rows.length === 0 ? (
            <div className="rounded-md border border-dashed border-border bg-muted/20 p-10 text-center text-[13px] text-muted-foreground">
              Selecciona um ficheiro CSV para pré-visualizar os produtos.
            </div>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2 text-[12px]">
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">
                  {createCount} novo(s)
                </span>
                <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700">
                  {updateCount} actualizado(s)
                </span>
                {syncMode && (
                  <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">
                    {deactivateCount} serão desactivados
                  </span>
                )}
                {invalid > 0 && (
                  <span className="rounded-full bg-red-100 px-3 py-1 text-red-700">
                    {invalid} com erros
                  </span>
                )}
              </div>
              <div className="overflow-hidden rounded-md border border-border">
                <div className="max-h-[40vh] overflow-auto">
                  <table className="w-full text-[12px]">
                    <thead className="sticky top-0 bg-muted/80 backdrop-blur">
                      <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                        <th className="px-3 py-2">Ref.</th>
                        <th className="px-3 py-2">Marca</th>
                        <th className="px-3 py-2">Época</th>
                        <th className="px-3 py-2 text-right">Preço</th>
                        <th className="px-3 py-2">Tamanhos</th>
                        <th className="px-3 py-2">Descrição</th>
                        <th className="px-3 py-2">Campos preservados</th>
                        <th className="px-3 py-2">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => {
                        const ex = existingByRef.get(brandKey(r.brand, r.reference));
                        const preserved = preservedFields(ex);
                        return (
                        <tr key={i} className="border-t border-border">
                          <td className="px-3 py-1.5 font-mono">{r.reference}</td>
                          <td className="px-3 py-1.5">{r.brand}</td>
                          <td className="px-3 py-1.5">{r.season || "—"}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">€{r.price}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">
                            {r.sizes.map((s) => `${displaySize(s.size)}:${s.stock}`).join(" ") || "—"}
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground">{r.description || "—"}</td>
                          <td className="px-3 py-1.5">
                            {ex && preserved.length > 0 ? (
                              <span className="text-emerald-700">{preserved.join(", ")}</span>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-3 py-1.5">
                            {r._error ? (
                              <span className="text-red-600">{r._error}</span>
                            ) : ex ? (
                              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-700">ACTUALIZAR</span>
                            ) : (
                              <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-700">NOVO</span>
                            )}
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              {importing && (
                <p className="mt-3 text-[12px] text-muted-foreground">
                  A importar… {progress.done}/{valid.length} · {progress.ok} ok · {progress.err} erro(s)
                </p>
              )}
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border bg-card px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-full px-5 py-2 text-[13px] text-muted-foreground hover:text-foreground"
          >
            Cancelar
          </button>
          <button
            onClick={start}
            disabled={importing || valid.length === 0}
            className="rounded-full bg-primary px-6 py-2 text-[13px] text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            {importing ? "A importar…" : `Importar ${valid.length} produto(s)`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Inventory adjustments (collapsible)
// ============================================================

function InventoryAdjustments({
  liveSizes,
  onAdjust,
}: {
  liveSizes: ProductSize[];
  onAdjust: (size: string, delta: 1 | -1) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md border border-border bg-card">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-[13px]"
      >
        <span className="font-medium">Ajustes de inventário</span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      {open && (
        <div className="border-t border-border p-4">
          <p className="mb-3 text-[11px] text-muted-foreground">
            Marca como reservado para reservas presenciais.
          </p>
          <div className="space-y-2">
            {liveSizes.map((s) => {
              const available = s.stock - s.reserved;
              return (
                <div
                  key={s.size}
                  className="flex items-center justify-between rounded border border-border bg-background px-3 py-2 text-[13px]"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 font-medium">{displaySize(s.size)}</span>
                    <span className="text-[11px] text-muted-foreground">
                      stock {s.stock} · reservado {s.reserved} · livre {available}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => onAdjust(s.size, -1)}
                      disabled={s.reserved <= 0}
                      className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] hover:bg-muted disabled:opacity-40"
                    >
                      <Minus size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onAdjust(s.size, 1)}
                      disabled={available <= 0}
                      className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[11px] text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
                    >
                      <Plus size={11} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Scan modal — barcode IN/OUT stock adjustments
// ============================================================

type ScanLog = {
  ts: number;
  productName: string;
  brand: string;
  size: string;
  action: "IN" | "OUT";
  totalAvailable: number;
};

function ScanModal({ onClose }: { onClose: () => void }) {
  const adjustFn = useServerFn(adminAdjustStockByBarcode);
  const [mode, setMode] = useState<"IN" | "OUT">("IN");
  const [manual, setManual] = useState("");
  const [busy, setBusy] = useState(false);
  const [logs, setLogs] = useState<ScanLog[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const manualInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<unknown>(null);
  const lastScanRef = useRef<{ code: string; ts: number }>({ code: "", ts: 0 });
  const rafRef = useRef<number | null>(null);
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const submitBarcode = useCallback(
    async (barcode: string) => {
      const code = barcode.trim();
      if (!code) return;
      // Debounce duplicate scans within 2s
      const now = Date.now();
      if (lastScanRef.current.code === code && now - lastScanRef.current.ts < 2000) return;
      lastScanRef.current = { code, ts: now };
      setBusy(true);
      try {
        const token = await getToken();
        const res = (await adjustFn({
          data: { token, barcode: code, delta: modeRef.current === "IN" ? 1 : -1 },
        })) as {
          productName: string;
          brand: string;
          size: string;
          totalAvailable: number;
        };
        const log: ScanLog = {
          ts: now,
          productName: res.productName,
          brand: res.brand,
          size: res.size,
          action: modeRef.current,
          totalAvailable: res.totalAvailable,
        };
        setLogs((prev) => [log, ...prev].slice(0, 10));
        toast.success(
          `${modeRef.current === "IN" ? "Entrada" : "Saída"} · ${res.brand} ${res.productName} (${displaySize(res.size)}) · stock ${res.totalAvailable}`,
        );
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Erro");
      } finally {
        setBusy(false);
      }
    },
    [adjustFn],
  );

  // Camera + BarcodeDetector setup
  useEffect(() => {
    let cancelled = false;
    const Detector = (
      globalThis as unknown as {
        BarcodeDetector?: new (opts?: { formats?: string[] }) => {
          detect: (src: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
        };
      }
    ).BarcodeDetector;
    if (!Detector) {
      setCameraError("O navegador não suporta leitura de códigos de barras. Usa o campo manual.");
      return;
    }
    detectorRef.current = new Detector({
      formats: ["ean_13", "ean_8", "code_128", "code_39", "upc_a", "upc_e", "qr_code"],
    });
    const loop = async () => {
      const detector = detectorRef.current as {
        detect: (src: CanvasImageSource) => Promise<Array<{ rawValue: string }>>;
      } | null;
      if (cancelled || !detector || !videoRef.current) return;
      try {
        if (videoRef.current.readyState >= 2) {
          const codes = await detector.detect(videoRef.current);
          if (codes && codes.length > 0 && codes[0].rawValue) {
            await submitBarcode(codes[0].rawValue);
          }
        }
      } catch {
        /* ignore frame errors */
      }
      rafRef.current = window.setTimeout(loop, 400) as unknown as number;
    };

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t: MediaStreamTrack) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          setCameraOn(true);
          loop();
        }
      } catch {
        setCameraError("Câmara indisponível. Usa o campo manual.");
      }
    })();

    return () => {
      cancelled = true;
      if (rafRef.current) clearTimeout(rafRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t: MediaStreamTrack) => t.stop());
        streamRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = manual.trim();
    if (!code) return;
    submitBarcode(code);
    setManual("");
    // Re-focus so physical scanners (which act as keyboards and send Enter)
    // can chain multiple scans without the user touching the input.
    setTimeout(() => manualInputRef.current?.focus(), 0);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-background shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Inventário
            </p>
            <h2 className="font-display text-xl italic">Scan de códigos de barras</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Mode selector */}
          <div className="mb-4 grid grid-cols-2 gap-3">
            <button
              onClick={() => setMode("IN")}
              className={`flex items-center justify-center gap-2 rounded-xl border px-6 py-5 text-base font-medium transition ${
                mode === "IN"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-border bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              <ArrowDownToLine size={20} /> Entrada (IN)
            </button>
            <button
              onClick={() => setMode("OUT")}
              className={`flex items-center justify-center gap-2 rounded-xl border px-6 py-5 text-base font-medium transition ${
                mode === "OUT"
                  ? "border-red-500 bg-red-50 text-red-700"
                  : "border-border bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              <ArrowUpFromLine size={20} /> Saída (OUT)
            </button>
          </div>

          {/* Camera viewfinder */}
          <div className="relative mb-4 aspect-video overflow-hidden rounded-xl border border-border bg-black">
            <video
              ref={videoRef}
              playsInline
              muted
              className="h-full w-full object-cover"
            />
            {!cameraOn && !cameraError && (
              <div className="absolute inset-0 flex items-center justify-center text-xs text-white/70">
                A iniciar câmara…
              </div>
            )}
            {cameraError && (
              <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-xs text-white/80">
                {cameraError}
              </div>
            )}
            {cameraOn && (
              <div className="pointer-events-none absolute inset-x-8 top-1/2 h-px -translate-y-1/2 bg-red-500/80" />
            )}
          </div>

          {/* Manual fallback */}
          <form onSubmit={onManualSubmit} className="mb-4 flex gap-2">
            <input
              autoFocus
              ref={manualInputRef}
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="Inserir código de barras manualmente…"
              className="h-10 flex-1 rounded-md border border-border bg-card px-3 font-mono text-[13px]"
            />
            <button
              type="submit"
              disabled={busy || !manual.trim()}
              className="rounded-md bg-primary px-4 py-1.5 text-[13px] text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {busy ? "…" : "Aplicar"}
            </button>
          </form>

          {/* Log */}
          <div>
            <p className="mb-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              Histórico (últimos 10)
            </p>
            {logs.length === 0 ? (
              <p className="rounded-md border border-dashed border-border bg-muted/20 p-6 text-center text-[12px] text-muted-foreground">
                Sem leituras ainda.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border bg-card">
                {logs.map((l) => (
                  <li
                    key={l.ts}
                    className="flex items-center justify-between px-3 py-2 text-[12px]"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex h-6 w-12 items-center justify-center rounded-full text-[10px] font-medium ${
                          l.action === "IN"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }`}
                      >
                        {l.action}
                      </span>
                      <div>
                        <p className="font-medium text-foreground">
                          {l.brand} · {l.productName}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          tamanho {l.size} · stock {l.totalAvailable}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {new Date(l.ts).toLocaleTimeString("pt-PT")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-border bg-card px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-full bg-primary px-6 py-2 text-[13px] text-primary-foreground hover:bg-primary/90"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}