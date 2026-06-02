import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  adminListEditorials,
  adminUpsertEditorial,
  adminDeleteEditorial,
  type EditorialPost,
} from "@/server-fns/features";
import { adminUploadProductImage } from "@/server-fns/products";
import { Loader2, Plus, Trash2, Pencil, X, Upload, Search } from "lucide-react";
import { toast } from "sonner";
import { useProducts } from "@/lib/products";

export const Route = createFileRoute("/admin_/editorial")({
  head: () => ({ meta: [{ title: "Editorial | Admin" }] }),
  component: () => (
    <AdminLayout>
      <Content />
    </AdminLayout>
  ),
});

async function getToken() {
  const { data } = await supabase.auth.getSession();
  const t = data.session?.access_token;
  if (!t) throw new Error("Sessão expirada");
  return t;
}

function Content() {
  const list = useServerFn(adminListEditorials);
  const del = useServerFn(adminDeleteEditorial);
  const [posts, setPosts] = useState<EditorialPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditorialPost | "new" | null>(null);

  const refresh = useCallback(async () => {
    try {
      const token = await getToken();
      const r = await list({ data: { token } });
      setPosts(r.posts);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setLoading(false);
    }
  }, [list]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const remove = async (id: string) => {
    if (!confirm("Apagar este editorial?")) return;
    const token = await getToken();
    await del({ data: { token, id } });
    await refresh();
    toast.success("Apagado");
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 md:px-8 md:py-10">
      <header className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Admin</p>
          <h1 className="mt-1 font-display text-3xl italic md:text-4xl">Editorial</h1>
        </div>
        <button
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
        >
          <Plus size={14} /> Nova edição
        </button>
      </header>

      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : posts.length === 0 ? (
        <p className="text-sm text-muted-foreground">Sem edições.</p>
      ) : (
        <ul className="space-y-3">
          {posts.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-card p-4"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{p.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  {p.publish_date} · {p.is_published ? "Publicado" : "Rascunho"} ·{" "}
                  {p.featured_product_ids.length} peças
                </p>
              </div>
              <button
                onClick={() => setEditing(p)}
                className="rounded-full border border-border p-2 hover:bg-muted"
              >
                <Pencil size={13} />
              </button>
              <button
                onClick={() => remove(p.id)}
                className="rounded-full border border-border p-2 text-destructive hover:bg-muted"
              >
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <EditorForm
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void refresh();
          }}
        />
      )}
    </div>
  );
}

function EditorForm({
  initial,
  onClose,
  onSaved,
}: {
  initial: EditorialPost | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const upsert = useServerFn(adminUpsertEditorial);
  const uploadFn = useServerFn(adminUploadProductImage);
  const { products } = useProducts();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [quote, setQuote] = useState(initial?.quote ?? "");
  const [videoUrl, setVideoUrl] = useState(initial?.video_url ?? "");
  const [teaser, setTeaser] = useState(initial?.teaser_text ?? "");
  const [publishDate, setPublishDate] = useState(
    initial?.publish_date ?? new Date().toISOString().split("T")[0],
  );
  const [isPublished, setIsPublished] = useState(initial?.is_published ?? false);
  const [productIds, setProductIds] = useState<string[]>(initial?.featured_product_ids ?? []);
  const [coverImage, setCoverImage] = useState<string | null>(initial?.cover_image ?? null);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  const toggleProduct = (id: string) => {
    setProductIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : cur.length < 8 ? [...cur, id] : cur,
    );
  };

  const handleCoverUpload = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    try {
      const token = await getToken();
      const base64 = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve((r.result as string).split(",")[1] || "");
        r.onerror = reject;
        r.readAsDataURL(file);
      });
      const res = await uploadFn({
        data: {
          token,
          filename: file.name,
          contentType: file.type || "image/jpeg",
          dataBase64: base64,
        },
      });
      setCoverImage((res as { url: string }).url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro a carregar imagem");
    } finally {
      setUploading(false);
    }
  };

  const selectedProducts = productIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is NonNullable<typeof p> => Boolean(p));

  const q = query.trim().toLowerCase();
  const filtered = q
    ? products.filter(
        (p) =>
          p.brand.toLowerCase().includes(q) || p.name.toLowerCase().includes(q),
      )
    : [
        ...selectedProducts,
        ...products.filter((p) => !productIds.includes(p.id)),
      ];

  const save = async () => {
    if (!title.trim()) {
      toast.error("Indica o título.");
      return;
    }
    setBusy(true);
    try {
      const token = await getToken();
      await upsert({
        data: {
          token,
          post: {
            id: initial?.id ?? undefined,
            title,
            quote,
            video_url: videoUrl,
            featured_product_ids: productIds,
            teaser_text: teaser,
            publish_date: publishDate,
            is_published: isPublished,
            cover_image: coverImage ?? "",
          },
        },
      });
      toast.success("Guardado");
      onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-background p-6"
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-display text-2xl italic">
            {initial ? "Editar edição" : "Nova edição"}
          </h3>
          <button onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Título</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 h-11 w-full rounded-md border border-border bg-card px-3 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">Citação</label>
            <textarea
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              URL do vídeo (YouTube / Vimeo / Instagram)
            </label>
            <input
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="mt-1 h-11 w-full rounded-md border border-border bg-card px-3 text-sm"
              placeholder="https://www.youtube.com/watch?v=…"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Imagem de capa (opcional)
            </label>
            {coverImage ? (
              <div className="relative mt-1 inline-block">
                <img
                  src={coverImage}
                  alt="Capa"
                  className="h-32 w-44 rounded-md border border-border object-cover"
                />
                <button
                  type="button"
                  onClick={() => setCoverImage(null)}
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background shadow"
                  aria-label="Remover"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <label className="mt-1 flex h-32 w-44 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border bg-card text-xs text-muted-foreground hover:bg-muted">
                {uploading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Upload size={16} />
                    <span>Carregar imagem</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleCoverUpload(e.target.files?.[0] ?? null)}
                />
              </label>
            )}
            <p className="mt-1 text-[11px] text-muted-foreground">
              Sem imagem, o cartão mostra um fundo azul com o título.
            </p>
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Teaser (frase final)
            </label>
            <textarea
              value={teaser}
              onChange={(e) => setTeaser(e.target.value)}
              rows={2}
              className="mt-1 w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">
                Data de publicação
              </label>
              <input
                type="date"
                value={publishDate}
                onChange={(e) => setPublishDate(e.target.value)}
                className="mt-1 h-11 w-full rounded-md border border-border bg-card px-3 text-sm"
              />
            </div>
            <label className="flex items-center gap-2 self-end text-sm">
              <input
                type="checkbox"
                checked={isPublished}
                onChange={(e) => setIsPublished(e.target.checked)}
                className="h-4 w-4 accent-primary"
              />
              Publicado
            </label>
          </div>
          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs uppercase tracking-wider text-muted-foreground">
                Peças em destaque
              </label>
              <span className="text-[11px] text-muted-foreground">
                {productIds.length}/8 peças seleccionadas
              </span>
            </div>

            {selectedProducts.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleProduct(p.id)}
                    className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] text-foreground hover:bg-primary/20"
                  >
                    <span className="text-muted-foreground">{p.brand}</span>
                    <span>{p.name}</span>
                    <X size={11} />
                  </button>
                ))}
              </div>
            )}

            <div className="relative mt-3">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Pesquisar produto por marca ou nome…"
                className="h-10 w-full rounded-md border border-border bg-card pl-9 pr-3 text-sm"
              />
            </div>

            <div className="mt-2 max-h-64 overflow-y-auto rounded-md border border-border">
              {filtered.length === 0 ? (
                <p className="px-3 py-4 text-xs text-muted-foreground">
                  Sem resultados.
                </p>
              ) : (
                filtered.slice(0, 60).map((p) => {
                  const selected = productIds.includes(p.id);
                  const disabled = !selected && productIds.length >= 8;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => !disabled && toggleProduct(p.id)}
                      disabled={disabled}
                      className={`flex w-full items-center gap-3 border-b border-border px-3 py-2 text-left text-xs last:border-b-0 transition ${
                        selected
                          ? "bg-primary/10"
                          : disabled
                            ? "cursor-not-allowed opacity-40"
                            : "hover:bg-muted"
                      }`}
                    >
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
                        {p.image ? (
                          <img
                            src={p.image}
                            alt={p.name}
                            className="h-full w-full object-cover"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
                          {p.brand}
                        </p>
                        <p className="truncate text-foreground">{p.name}</p>
                      </div>
                      <span className="shrink-0 text-muted-foreground">
                        €{Number(p.price).toFixed(2)}
                      </span>
                      {selected && (
                        <span className="shrink-0 text-[10px] uppercase tracking-wider text-primary">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-full border border-border px-4 py-2 text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}