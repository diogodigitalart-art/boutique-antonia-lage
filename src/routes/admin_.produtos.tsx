import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { BRANDS } from "@/lib/data";
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
} from "@/server/products";

const CATEGORIES: Array<{ value: string; label: string }> = [
  { value: "colecção", label: "Colecção" },
  { value: "arquivo", label: "Arquivo" },
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

type ProductSize = { size: string; stock: number; reserved: number };
type ProductRow = {
  id: string;
  name: string;
  brand: string;
  description: string;
  price: number;
  original_price: number | null;
  category: string;
  reference: string;
  season: string | null;
  discount_percent: number | null;
  images: string[];
  sizes: ProductSize[];
  is_active: boolean;
  created_at: string;
  barcode?: string | null;
  cost_price?: number | null;
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

  const [rows, setRows] = useState<ProductRow[]>([]);
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [seasons, setSeasons] = useState<BrandRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [filterBrand, setFilterBrand] = useState<string>("all");
  const [filterSeason, setFilterSeason] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [showBrands, setShowBrands] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [scanning, setScanning] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const token = await getToken();
      const [p, b, sRes] = await Promise.all([
        listFn({ data: { token } }),
        listBrandsFn({ data: { token } }),
        listSeasonsFn({ data: { token } }),
      ]);
      setRows((p.rows as unknown) as ProductRow[]);
      setBrands((b.rows as unknown) as BrandRow[]);
      setSeasons((sRes.rows as unknown) as BrandRow[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao carregar");
    } finally {
      setLoading(false);
    }
  }, [listFn, listBrandsFn, listSeasonsFn]);

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
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.brand.toLowerCase().includes(q) ||
        (r.reference || "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, filterCat, filterBrand, filterSeason, filterStatus]);

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
    if (!confirm(`Remover "${r.name}"?`)) return;
    try {
      const token = await getToken();
      await deleteFn({ data: { token, id: r.id } });
      toast.success("Removido");
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
          options={[{ value: "all", label: "Todas categorias" }, ...CATEGORIES]}
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
                  <th className="px-3 py-2.5">Categoria</th>
                  <th className="px-3 py-2.5 text-right">Preço</th>
                  <th className="px-3 py-2.5 text-right">Stock</th>
                  <th className="px-3 py-2.5">Estado</th>
                  <th className="w-12 px-3 py-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const sizes = Array.isArray(r.sizes) ? r.sizes : [];
                  const totalStock = sizes.reduce(
                    (a, s) => a + Math.max(0, s.stock - s.reserved),
                    0,
                  );
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
                      <td className="px-3 py-2 font-medium text-foreground">{r.name}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                        {r.reference}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">
                        {r.season || "—"}
                      </td>
                      <td className="px-3 py-2 capitalize text-muted-foreground">
                        {r.category}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">€{r.price}</td>
                      <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                        {totalStock}
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
          onDelete={async () => {
            if (!editing) return;
            await remove(editing);
            setEditing(null);
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
  barcode: string;
  description: string;
  price: string;
  cost_price: string;
  original_price: string;
  discount_percent: string;
  category: string;
  season: string;
  is_active: boolean;
  oneSize: boolean;
  sizes: Array<{ size: string; stock: number }>;
  oneSizeStock: number;
  images: string[];
};

function emptyForm(brandOptions: string[]): FormState {
  return {
    brand: brandOptions[0] ?? "",
    name: "",
    reference: "",
    barcode: "",
    description: "",
    price: "",
    cost_price: "",
    original_price: "",
    discount_percent: "",
    category: "colecção",
    season: "",
    is_active: true,
    oneSize: false,
    sizes: [],
    oneSizeStock: 0,
    images: [],
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
  const initialSizesList: Array<{ size: string; stock: number }> = isOneSize
    ? []
    : existingSizes.map((s) => ({ size: s.size, stock: Number(s.stock) || 0 }));
  const oneSizeStock = isOneSize ? existingSizes[0].stock : 0;

  const knownBrand = !row || brandOptions.includes(row.brand);
  const [form, setForm] = useState<FormState>(
    row
      ? {
          brand: knownBrand ? row.brand : row.brand,
          name: row.name,
          reference: row.reference,
          barcode: row.barcode ?? "",
          description: row.description,
          price: String(row.price),
          cost_price: row.cost_price != null ? String(row.cost_price) : "",
          original_price: row.original_price != null ? String(row.original_price) : "",
          discount_percent: row.discount_percent != null ? String(row.discount_percent) : "",
          category: row.category,
          season: row.season ?? "",
          is_active: row.is_active,
          oneSize: isOneSize,
          sizes: initialSizesList,
          oneSizeStock,
          images: row.images ?? [],
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

    let sizesPayload: ProductSize[];
    if (form.oneSize) {
      const liveU = liveSizes.find((x) => x.size === "U");
      sizesPayload = [
        {
          size: "U",
          stock: Math.max(0, form.oneSizeStock || 0),
          reserved: liveU?.reserved ?? 0,
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
            barcode: form.barcode.trim() || null,
            description: form.description.trim(),
            price: Number(form.price),
            cost_price: form.cost_price ? Number(form.cost_price) : null,
            original_price: form.original_price ? Number(form.original_price) : null,
            discount_percent: form.discount_percent ? Number(form.discount_percent) : null,
            category: form.category,
            season: form.season.trim() || null,
            images: form.images,
            sizes: sizesPayload,
            is_active: form.is_active,
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
              <Field label="Categoria">
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
              <Field label="Código de barras">
                <input
                  value={form.barcode}
                  onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                  placeholder="ex: 1234567890123"
                  className="h-10 w-full rounded-md border border-border bg-card px-3 font-mono text-[13px]"
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
              <Field label="Preço original (opcional)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.original_price}
                  onChange={(e) => setForm({ ...form, original_price: e.target.value })}
                  className="h-10 w-full rounded-md border border-border bg-card px-3 text-[13px]"
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
              <Field label="Descrição" className="sm:col-span-2">
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={4}
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
              <label className="inline-flex cursor-pointer items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                />
                Produto activo (visível no site)
              </label>
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
                  : SIZE_OPTIONS.reduce((a, s) => a + (form.sizes[s] || 0), 0);
                return (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Total disponível: <span className="font-medium text-foreground">{total}</span> unidades
                  </p>
                );
              })()}
              {form.oneSize ? (
                <div className="mt-3">
                  <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Stock disponível
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
                </div>
              ) : (
                <>
                  <p className="mt-3 text-[10px] uppercase tracking-wider text-muted-foreground">
                    Stock por tamanho
                  </p>
                  <div className="mt-2 grid grid-cols-5 gap-2">
                    {SIZE_OPTIONS.map((s) => (
                      <div
                        key={s}
                        className="flex flex-col items-center rounded-md border border-border bg-background p-2"
                      >
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {s}
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={form.sizes[s]}
                          onChange={(e) =>
                            setForm({
                              ...form,
                              sizes: {
                                ...form.sizes,
                                [s]: Math.max(0, Number(e.target.value) || 0),
                              },
                            })
                          }
                          className="mt-1 w-full rounded border border-border bg-background px-1 py-1 text-center text-[13px]"
                        />
                      </div>
                    ))}
                  </div>
                </>
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
                        setForm({
                          ...form,
                          images: form.images.filter((_, idx) => idx !== i),
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

type ParsedRow = {
  brand: string;
  name: string;
  reference: string;
  price: number;
  original_price: number | null;
  category: string;
  season: string | null;
  description: string;
  sizes: ProductSize[];
  barcodes: string[];
  _error?: string;
};

// Farfetch-style export: semicolon-separated, one row per SKU (size).
// Multiple sizes of the same product share the same "Brand product ID".
const CSV_TEMPLATE =
  "Brand;Brand product ID;Season;Local Market Price;Stock Available;Size;Category;Partner barcode\n" +
  "Self-Portrait;SP-001;SS26;420;1;XS;Women > Clothing > Dresses;1234567890001\n" +
  "Self-Portrait;SP-001;SS26;420;2;S;Women > Clothing > Dresses;1234567890002\n" +
  "Self-Portrait;SP-001;SS26;420;1;M;Women > Clothing > Dresses;1234567890003\n";

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
  const iSeason = findIdx("season");
  const iPrice = findIdx("local market price", "price");
  const iStock = findIdx("stock available", "stock");
  const iSize = findIdx("size");
  const iCat = findIdx("category");
  const iBarcode = findIdx("partner barcode", "barcode");

  const grouped = new Map<string, ParsedRow>();
  for (let i = 1; i < matrix.length; i++) {
    const r = matrix[i];
    const cell = (j: number) => (j >= 0 ? (r[j] ?? "").trim() : "");
    const brand = cell(iBrand);
    const reference = cell(iRef);
    if (!brand && !reference) continue;
    const priceStr = cell(iPrice).replace(",", ".");
    const stock = Math.max(0, Math.floor(Number(cell(iStock)) || 0));
    const size = cell(iSize).toUpperCase();
    const season = cell(iSeason);
    const catLabel = categoryLabel(cell(iCat));
    const barcode = cell(iBarcode);

    const key = reference || `${brand}::${i}`;
    let row = grouped.get(key);
    if (!row) {
      row = {
        brand,
        name: reference || brand,
        reference,
        price: Number(priceStr) || 0,
        original_price: null,
        category: "colecção",
        season: season || null,
        description: catLabel,
        sizes: [],
        barcodes: [],
      };
      grouped.set(key, row);
    }
    if (size && stock > 0) {
      const existing = row.sizes.find((s) => s.size === size);
      if (existing) existing.stock += stock;
      else row.sizes.push({ size, stock, reserved: 0 });
    }
    if (barcode && !row.barcodes.includes(barcode)) row.barcodes.push(barcode);
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
  onClose,
  onDone,
}: {
  brandOptions: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  const upsertFn = useServerFn(adminUpsertProduct);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, ok: 0, err: 0 });

  const onFile = async (file: File) => {
    setFileName(file.name);
    const text = await file.text();
    const delim = detectDelimiter(text);
    const matrix = parseCsv(text, delim);
    setRows(rowsToProducts(matrix));
    setProgress({ done: 0, ok: 0, err: 0 });
  };

  const valid = rows.filter((r) => !r._error);
  const invalid = rows.length - valid.length;

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
          await upsertFn({
            data: {
              token,
              product: {
                brand: r.brand,
                name: r.name,
                reference: r.reference,
                description: r.description,
                price: r.price,
                original_price: r.original_price,
                discount_percent: null,
                category: r.category,
                season: r.season,
                images: [],
                sizes: r.sizes,
                is_active: true,
                barcode: r.barcodes[0] || null,
              },
            },
          });
          ok++;
        } catch (e) {
          console.error("import row failed", e);
          err++;
        }
        setProgress({ done: i + 1, ok, err });
      }
      toast.success(`Importação concluída: ${ok} criado(s), ${err} erro(s)`);
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
                  {valid.length} válidos
                </span>
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
                        <th className="px-3 py-2">Categoria</th>
                        <th className="px-3 py-2">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="px-3 py-1.5 font-mono">{r.reference}</td>
                          <td className="px-3 py-1.5">{r.brand}</td>
                          <td className="px-3 py-1.5">{r.season || "—"}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">€{r.price}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">
                            {r.sizes.map((s) => `${s.size}:${s.stock}`).join(" ") || "—"}
                          </td>
                          <td className="px-3 py-1.5 text-muted-foreground">{r.description || "—"}</td>
                          <td className="px-3 py-1.5">
                            {r._error ? (
                              <span className="text-red-600">{r._error}</span>
                            ) : (
                              <span className="text-emerald-700">OK</span>
                            )}
                          </td>
                        </tr>
                      ))}
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
                    <span className="w-6 font-medium">{s.size}</span>
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
          `${modeRef.current === "IN" ? "Entrada" : "Saída"} · ${res.brand} ${res.productName} (${res.size}) · stock ${res.totalAvailable}`,
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