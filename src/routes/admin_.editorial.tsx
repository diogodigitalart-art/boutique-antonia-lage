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
} from "@/server/features";
import { Loader2, Plus, Trash2, Pencil, X } from "lucide-react";
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
  const [busy, setBusy] = useState(false);

  const toggleProduct = (id: string) => {
    setProductIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : cur.length < 8 ? [...cur, id] : cur,
    );
  };

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
            <label className="text-xs uppercase tracking-wider text-muted-foreground">
              Peças em destaque ({productIds.length}/8)
            </label>
            <div className="mt-2 max-h-56 overflow-y-auto rounded-md border border-border p-2">
              {products.slice(0, 80).map((p) => (
                <label
                  key={p.id}
                  className="flex items-center gap-2 rounded px-2 py-1 text-xs hover:bg-muted"
                >
                  <input
                    type="checkbox"
                    checked={productIds.includes(p.id)}
                    onChange={() => toggleProduct(p.id)}
                    className="h-3.5 w-3.5 accent-primary"
                  />
                  <span className="text-muted-foreground">{p.brand}</span>
                  <span className="text-foreground">{p.name}</span>
                </label>
              ))}
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