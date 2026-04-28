import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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
} from "@/server/products";

const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL"] as const;
const CATEGORIES: Array<{ value: string; label: string }> = [
  { value: "colecção", label: "Colecção" },
  { value: "arquivo", label: "Arquivo" },
];

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
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [showBrands, setShowBrands] = useState(false);

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
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.brand.toLowerCase().includes(q) ||
        (r.reference || "").toLowerCase().includes(q)
      );
    });
  }, [rows, search, filterCat]);

  const toggleActive = async (r: ProductRow) => {
    try {
      const token = await getToken();
      await toggleFn({ data: { token, id: r.id, is_active: !r.is_active } });
      toast.success(r.is_active ? "Desactivado" : "Activado");
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

  // Merged brand list (hardcoded + custom)
  const allBrandNames = useMemo(() => {
    const set = new Set<string>();
    BRANDS.filter((b) => b !== "Todas").forEach((b) => set.add(b));
    brands.forEach((b) => set.add(b.name));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [brands]);

  const seasonNames = useMemo(() => seasons.map((s) => s.name), [seasons]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 md:px-8 md:py-10">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Admin</p>
          <h1 className="mt-1 font-display text-3xl italic md:text-4xl">Produtos</h1>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground hover:bg-primary/90"
        >
          <Plus size={16} /> Adicionar produto
        </button>
      </div>

      <BrandsSection
        open={showBrands}
        onToggle={() => setShowBrands((v) => !v)}
        customBrands={brands}
        onChanged={refresh}
      />

      <div className="mb-4 mt-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Procurar por marca, nome ou referência…"
            className="w-full rounded-full border border-border bg-card py-2.5 pl-9 pr-4 text-sm outline-none focus:border-primary"
          />
        </div>
        <select
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
          className="rounded-full border border-border bg-card px-4 py-2.5 text-sm"
        >
          <option value="all">Todas as categorias</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-muted/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Ref.</th>
                <th className="px-4 py-3">Marca</th>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Season</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Preço</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Activo</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const sizes = Array.isArray(r.sizes) ? r.sizes : [];
                const totalStock = sizes.reduce((a, s) => a + (s.stock - s.reserved), 0);
                return (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.reference}</td>
                    <td className="px-4 py-3">{r.brand}</td>
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{r.season || "—"}</td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{r.category}</td>
                    <td className="px-4 py-3">€{r.price}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {sizes.map((s) => `${s.size}:${s.stock - s.reserved}`).join(" · ") || "—"}
                      <span className="ml-2 text-foreground">({totalStock})</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(r)}
                        className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-wider ${
                          r.is_active ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground"
                        }`}
                      >
                        {r.is_active ? "Sim" : "Não"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setEditing(r)} className="rounded p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><Pencil size={14} /></button>
                        <button onClick={() => remove(r)} className="rounded p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-10 text-center text-xs text-muted-foreground">Sem produtos.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {(editing || creating) && (
        <ProductForm
          row={editing}
          brandOptions={allBrandNames}
          seasonOptions={seasonNames}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { refresh(); setEditing(null); setCreating(false); }}
        />
      )}
    </div>
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
    <div className="rounded-2xl border border-border bg-card">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
      >
        <span>Marcas ({customBrands.length} personalizadas)</span>
        {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {open && (
        <div className="border-t border-border p-4">
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nova marca…"
              className="flex-1 rounded-full border border-border bg-background px-4 py-2 text-sm"
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
            <button onClick={add} disabled={busy} className="rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              Adicionar
            </button>
          </div>
          {customBrands.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {customBrands.map((b) => (
                <span key={b.id} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs">
                  {b.name}
                  <button onClick={() => remove(b.id)} className="text-muted-foreground hover:text-destructive">
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
  description: string;
  price: string;
  original_price: string;
  discount_percent: string;
  category: string;
  season: string;
  is_active: boolean;
  oneSize: boolean;
  sizes: Record<string, number>;
  oneSizeStock: number;
  images: string[];
};

function ProductForm({
  row,
  brandOptions,
  seasonOptions,
  onClose,
  onSaved,
}: {
  row: ProductRow | null;
  brandOptions: string[];
  seasonOptions: string[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!row;
  const upsertFn = useServerFn(adminUpsertProduct);
  const uploadFn = useServerFn(adminUploadProductImage);

  const initialSizes: Record<string, number> = {};
  SIZE_OPTIONS.forEach((s) => { initialSizes[s] = 0; });
  const existingSizes = Array.isArray(row?.sizes) ? row!.sizes : [];
  existingSizes.forEach((s) => { if (SIZE_OPTIONS.includes(s.size as never)) initialSizes[s.size] = s.stock; });

  const isOneSize = existingSizes.length === 1 && existingSizes[0]?.size === "U";
  const oneSizeStock = isOneSize ? existingSizes[0].stock : 1;

  const knownBrand = !row || brandOptions.includes(row.brand);
  const [form, setForm] = useState<FormState>({
    brand: knownBrand ? (row?.brand ?? brandOptions[0] ?? "") : row!.brand,
    name: row?.name ?? "",
    reference: row?.reference ?? "",
    description: row?.description ?? "",
    price: row ? String(row.price) : "",
    original_price: row?.original_price != null ? String(row.original_price) : "",
    discount_percent: row?.discount_percent != null ? String(row.discount_percent) : "",
    category: row?.category ?? "colecção",
    season: row?.season ?? "",
    is_active: row?.is_active ?? true,
    oneSize: isOneSize,
    sizes: initialSizes,
    oneSizeStock,
    images: row?.images ?? [],
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  // Local copy of reservations for in-modal manual marking — persisted on save
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

  const submit = async () => {
    if (!form.brand.trim()) return toast.error("Indica a marca.");
    if (!form.name.trim()) return toast.error("Indica o nome.");
    if (!form.reference.trim()) return toast.error("Indica a referência.");
    if (!form.price || isNaN(Number(form.price))) return toast.error("Preço inválido.");

    let sizesPayload: ProductSize[];
    if (form.oneSize) {
      const liveU = liveSizes.find((x) => x.size === "U");
      sizesPayload = [{
        size: "U",
        stock: Math.max(1, form.oneSizeStock || 1),
        reserved: liveU?.reserved ?? 0,
      }];
    } else {
      sizesPayload = SIZE_OPTIONS
        .filter((s) => form.sizes[s] > 0)
        .map((s) => {
          const live = liveSizes.find((x) => x.size === s);
          return { size: s, stock: form.sizes[s], reserved: live?.reserved ?? 0 };
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
            description: form.description.trim(),
            price: Number(form.price),
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
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setSaving(false);
    }
  };

  // Local-only: only persisted to Supabase when admin clicks "Guardar"
  const adjust = (size: string, delta: 1 | -1) => {
    setLiveSizes((prev) =>
      prev.map((s) =>
        s.size === size
          ? { ...s, reserved: Math.max(0, Math.min(s.stock, s.reserved + delta)) }
          : s,
      ),
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="relative max-h-[92vh] w-full overflow-y-auto bg-background p-6 shadow-2xl sm:max-w-2xl sm:rounded-3xl sm:p-8">
        <button onClick={onClose} className="absolute right-4 top-4 rounded-full p-2 text-muted-foreground hover:bg-muted"><X size={18} /></button>
        <h2 className="font-display text-2xl italic">{isEdit ? "Editar produto" : "Novo produto"}</h2>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Marca</label>
            <select value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} className="mt-1 h-11 w-full rounded-md border border-border bg-card px-3 text-sm">
              {brandOptions.map((b) => <option key={b} value={b}>{b}</option>)}
              {!brandOptions.includes(form.brand) && form.brand && <option value={form.brand}>{form.brand}</option>}
            </select>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Categoria</label>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="mt-1 h-11 w-full rounded-md border border-border bg-card px-3 text-sm">
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Nome</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 h-11 w-full rounded-md border border-border bg-card px-3 text-sm" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Referência</label>
            <input value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} className="mt-1 h-11 w-full rounded-md border border-border bg-card px-3 text-sm font-mono" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Season</label>
            <select
              value={form.season}
              onChange={(e) => setForm({ ...form, season: e.target.value })}
              className="mt-1 h-11 w-full rounded-md border border-border bg-card px-3 text-sm"
            >
              <option value="">— Sem season —</option>
              {seasonOptions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
              {form.season && !seasonOptions.includes(form.season) && (
                <option value={form.season}>{form.season} (legado)</option>
              )}
            </select>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Gerir seasons em <span className="underline">Configurações</span>.
            </p>
          </div>
          <div className="flex items-end gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              Activo
            </label>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Preço (€)</label>
            <input type="number" min="0" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="mt-1 h-11 w-full rounded-md border border-border bg-card px-3 text-sm" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Preço original (opcional)</label>
            <input type="number" min="0" step="0.01" value={form.original_price} onChange={(e) => setForm({ ...form, original_price: e.target.value })} className="mt-1 h-11 w-full rounded-md border border-border bg-card px-3 text-sm" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Desconto (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={form.discount_percent}
              onChange={(e) => setForm({ ...form, discount_percent: e.target.value })}
              placeholder="ex: 20"
              className="mt-1 h-11 w-full rounded-md border border-border bg-card px-3 text-sm"
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Quando definido, mostra preço com desconto e badge −X%.
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Descrição</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm" />
          </div>

          <div className="sm:col-span-2">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.oneSize}
                onChange={(e) => setForm({ ...form, oneSize: e.target.checked })}
              />
              Tamanho único
            </label>
            {form.oneSize ? (
              <div className="mt-2">
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Stock</label>
                <input
                  type="number"
                  min="1"
                  value={form.oneSizeStock}
                  onChange={(e) => setForm({ ...form, oneSizeStock: Math.max(1, Number(e.target.value) || 1) })}
                  className="mt-1 h-11 w-32 rounded-md border border-border bg-card px-3 text-sm"
                />
              </div>
            ) : (
              <>
                <label className="mt-2 block text-xs uppercase tracking-wider text-muted-foreground">Stock por tamanho</label>
                <div className="mt-2 grid grid-cols-5 gap-2">
                  {SIZE_OPTIONS.map((s) => (
                    <div key={s} className="flex flex-col items-center rounded-md border border-border bg-card p-2">
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{s}</span>
                      <input type="number" min="0" value={form.sizes[s]} onChange={(e) => setForm({ ...form, sizes: { ...form.sizes, [s]: Math.max(0, Number(e.target.value) || 0) } })} className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-center text-sm" />
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          {isEdit && liveSizes.length > 0 && (
            <div className="sm:col-span-2 rounded-md border border-border bg-muted/30 p-4">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Reservas manuais</label>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Marca como reservado para reservas presenciais (cria FOMO no site).
              </p>
              <div className="mt-3 space-y-2">
                {liveSizes.map((s) => {
                  const available = s.stock - s.reserved;
                  return (
                    <div key={s.size} className="flex items-center justify-between rounded border border-border bg-background px-3 py-2 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="w-8 font-medium">{s.size}</span>
                        <span className="text-xs text-muted-foreground">
                          stock {s.stock} · reservado {s.reserved} · livre {available}
                        </span>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => adjust(s.size, -1)}
                          disabled={s.reserved <= 0}
                          className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs hover:bg-muted disabled:opacity-40"
                        >
                          <Minus size={12} /> Libertar
                        </button>
                        <button
                          type="button"
                          onClick={() => adjust(s.size, 1)}
                          disabled={available <= 0}
                          className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
                        >
                          <Plus size={12} /> Marcar reservado
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="sm:col-span-2">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Imagens (até 6)</label>
            <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
              {form.images.map((url, i) => (
                <div key={url} className="relative aspect-square overflow-hidden rounded-md border border-border bg-muted">
                  <img src={url} alt="" className="h-full w-full object-cover" />
                  <button onClick={() => setForm({ ...form, images: form.images.filter((_, idx) => idx !== i) })} className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"><X size={12} /></button>
                </div>
              ))}
              {form.images.length < 6 && (
                <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-border bg-card text-xs text-muted-foreground hover:border-primary">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload size={16} /><span className="mt-1">Carregar</span></>}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onClose} className="rounded-full px-5 py-2.5 text-sm text-muted-foreground hover:text-foreground">Cancelar</button>
          <button onClick={submit} disabled={saving} className="rounded-full bg-primary px-6 py-2.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
            {saving ? "A guardar…" : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
