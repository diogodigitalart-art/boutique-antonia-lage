import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useProducts, type ProductRow, type ProductSize } from "@/lib/products";
import { BRANDS } from "@/lib/data";
import { Loader2, Plus, Pencil, Trash2, Search, ArrowLeft, Upload, X } from "lucide-react";
import { toast } from "sonner";

const ADMIN_EMAIL = "diogodigitalart@gmail.com";
const SIZE_OPTIONS = ["XS", "S", "M", "L", "XL"] as const;
const CATEGORIES: Array<{ value: string; label: string }> = [
  { value: "colecção", label: "Colecção" },
  { value: "arquivo", label: "Arquivo" },
];

export const Route = createFileRoute("/admin_/produtos")({
  head: () => ({ meta: [{ title: "Gestão de produtos | Admin" }] }),
  component: AdminProductsPage,
});

function AdminProductsPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (loading) return;
    if (!user || (user.email || "").toLowerCase() !== ADMIN_EMAIL) {
      navigate({ to: "/", replace: true });
    }
  }, [user, loading, navigate]);
  if (loading || !user || (user.email || "").toLowerCase() !== ADMIN_EMAIL) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return (
    <Layout>
      <Content />
    </Layout>
  );
}

function Content() {
  const { rows, loading, refresh } = useProducts();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (filterCat !== "all" && r.category !== filterCat) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.brand.toLowerCase().includes(q) ||
        r.reference.toLowerCase().includes(q)
      );
    });
  }, [rows, search, filterCat]);

  const toggleActive = async (r: ProductRow) => {
    const { error } = await supabase
      .from("products" as never)
      .update({ is_active: !r.is_active } as never)
      .eq("id", r.id);
    if (error) toast.error(error.message);
    else {
      toast.success(r.is_active ? "Desactivado" : "Activado");
      refresh();
    }
  };

  const remove = async (r: ProductRow) => {
    if (!confirm(`Remover "${r.name}"?`)) return;
    const { error } = await supabase.from("products" as never).delete().eq("id", r.id);
    if (error) toast.error(error.message);
    else {
      toast.success("Removido");
      refresh();
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:py-16">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <Link to="/admin" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft size={14} /> Admin
          </Link>
          <h1 className="mt-2 font-display text-3xl italic md:text-4xl">Produtos</h1>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm text-primary-foreground hover:bg-primary/90"
        >
          <Plus size={16} /> Adicionar produto
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
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
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3">Preço</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Activo</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const totalStock = r.sizes.reduce((a, s) => a + (s.stock - s.reserved), 0);
                return (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.reference}</td>
                    <td className="px-4 py-3">{r.brand}</td>
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3 capitalize text-muted-foreground">{r.category}</td>
                    <td className="px-4 py-3">€{r.price}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {r.sizes.map((s) => `${s.size}:${s.stock - s.reserved}`).join(" · ") || "—"}
                      <span className="ml-2 text-foreground">({totalStock})</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(r)}
                        className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-wider ${
                          r.is_active
                            ? "bg-primary-soft text-primary"
                            : "bg-muted text-muted-foreground"
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
                <tr><td colSpan={8} className="px-4 py-10 text-center text-xs text-muted-foreground">Sem produtos.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {(editing || creating) && (
        <ProductForm
          row={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { refresh(); setEditing(null); setCreating(false); }}
        />
      )}
    </div>
  );
}

type FormState = {
  brand: string;
  brandOther: string;
  name: string;
  reference: string;
  description: string;
  price: string;
  original_price: string;
  category: string;
  is_active: boolean;
  sizes: Record<string, number>;
  images: string[];
};

function ProductForm({ row, onClose, onSaved }: { row: ProductRow | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!row;
  const initialSizes: Record<string, number> = {};
  SIZE_OPTIONS.forEach((s) => { initialSizes[s] = 0; });
  row?.sizes.forEach((s) => { initialSizes[s.size] = s.stock; });

  const brandList = BRANDS.filter((b) => b !== "Todas");
  const brandIsKnown = !row || brandList.includes(row.brand);

  const [form, setForm] = useState<FormState>({
    brand: brandIsKnown ? (row?.brand ?? brandList[0]) : "Outra",
    brandOther: brandIsKnown ? "" : (row?.brand ?? ""),
    name: row?.name ?? "",
    reference: row?.reference ?? "",
    description: row?.description ?? "",
    price: row ? String(row.price) : "",
    original_price: row?.original_price != null ? String(row.original_price) : "",
    category: row?.category ?? "colecção",
    is_active: row?.is_active ?? true,
    sizes: initialSizes,
    images: row?.images ?? [],
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const upload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const newUrls: string[] = [];
    for (const f of Array.from(files).slice(0, 6 - form.images.length)) {
      const ext = f.name.split(".").pop() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, f, { upsert: false });
      if (error) { toast.error(error.message); continue; }
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      newUrls.push(data.publicUrl);
    }
    setForm((f) => ({ ...f, images: [...f.images, ...newUrls] }));
    setUploading(false);
  };

  const submit = async () => {
    const finalBrand = form.brand === "Outra" ? form.brandOther.trim() : form.brand;
    if (!finalBrand) return toast.error("Indica a marca.");
    if (!form.name.trim()) return toast.error("Indica o nome.");
    if (!form.reference.trim()) return toast.error("Indica a referência.");
    if (!form.price || isNaN(Number(form.price))) return toast.error("Preço inválido.");

    const sizesPayload: ProductSize[] = SIZE_OPTIONS
      .filter((s) => form.sizes[s] > 0)
      .map((s) => {
        const existing = row?.sizes.find((x) => x.size === s);
        return { size: s, stock: form.sizes[s], reserved: existing?.reserved ?? 0 };
      });

    const payload = {
      brand: finalBrand,
      name: form.name.trim(),
      reference: form.reference.trim(),
      description: form.description.trim(),
      price: Number(form.price),
      original_price: form.original_price ? Number(form.original_price) : null,
      category: form.category,
      is_active: form.is_active,
      sizes: sizesPayload,
      images: form.images,
    };

    setSaving(true);
    const { error } = isEdit
      ? await supabase.from("products" as never).update(payload as never).eq("id", row!.id)
      : await supabase.from("products" as never).insert(payload as never);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(isEdit ? "Produto actualizado" : "Produto criado");
    onSaved();
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
              {brandList.map((b) => <option key={b} value={b}>{b}</option>)}
              <option value="Outra">Outra…</option>
            </select>
            {form.brand === "Outra" && (
              <input value={form.brandOther} onChange={(e) => setForm({ ...form, brandOther: e.target.value })} placeholder="Nova marca" className="mt-2 h-11 w-full rounded-md border border-border bg-card px-3 text-sm" />
            )}
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
          <div className="sm:col-span-2">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Descrição</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Stock por tamanho</label>
            <div className="mt-2 grid grid-cols-5 gap-2">
              {SIZE_OPTIONS.map((s) => (
                <div key={s} className="flex flex-col items-center rounded-md border border-border bg-card p-2">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{s}</span>
                  <input type="number" min="0" value={form.sizes[s]} onChange={(e) => setForm({ ...form, sizes: { ...form.sizes, [s]: Math.max(0, Number(e.target.value) || 0) } })} className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-center text-sm" />
                </div>
              ))}
            </div>
          </div>
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
