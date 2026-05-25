import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Layout } from "@/components/Layout";
import { getEditorialById, type EditorialPost } from "@/server/features";

export const Route = createFileRoute("/editorial/$id")({
  head: () => ({
    meta: [
      { title: "Editorial | Boutique Antónia Lage" },
      { name: "description", content: "Edição semanal da Boutique Antónia Lage." },
    ],
  }),
  component: EditorialDetailPage,
});

type Featured = { id: string; name: string; brand: string; price: number; images: string[] };

function youtubeEmbed(url: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

function EditorialDetailPage() {
  const { id } = Route.useParams();
  const fetchPost = useServerFn(getEditorialById);
  const [post, setPost] = useState<EditorialPost | null>(null);
  const [products, setProducts] = useState<Featured[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPost({ data: { id } })
      .then((r) => {
        setPost(r.post);
        setProducts(r.products);
      })
      .finally(() => setLoading(false));
  }, [fetchPost, id]);

  if (loading) {
    return (
      <Layout>
        <div className="mx-auto max-w-5xl px-4 py-20 text-sm text-muted-foreground">A carregar…</div>
      </Layout>
    );
  }
  if (!post) {
    return (
      <Layout>
        <div className="mx-auto max-w-5xl px-4 py-20">
          <p className="text-sm text-muted-foreground">Edição não encontrada.</p>
          <Link to="/editorial" className="mt-4 inline-block text-xs uppercase tracking-wider text-primary hover:underline">
            ← Voltar ao editorial
          </Link>
        </div>
      </Layout>
    );
  }

  const embed = youtubeEmbed(post.video_url);

  return (
    <Layout>
      <article className="mx-auto max-w-4xl px-4 pt-10 md:px-8 md:pt-16">
        <Link to="/editorial" className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground">
          ← Editorial
        </Link>
        <p className="mt-6 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
          {new Date(post.publish_date).toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" })}
        </p>
        <h1 className="mt-2 font-display text-4xl italic text-foreground md:text-6xl">{post.title}</h1>
        {post.quote && (
          <blockquote className="mt-6 border-l-2 border-primary pl-4 font-display text-xl italic text-muted-foreground">
            "{post.quote}"
          </blockquote>
        )}
        {post.teaser_text && (
          <p className="mt-6 whitespace-pre-line text-base leading-relaxed text-foreground/90">{post.teaser_text}</p>
        )}
        {embed && (
          <div className="mt-10 aspect-video w-full overflow-hidden rounded-2xl bg-muted">
            <iframe src={embed} title="Vídeo" className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
        )}
        {!embed && post.video_url && (
          <a href={post.video_url} target="_blank" rel="noreferrer" className="mt-6 inline-block text-xs uppercase tracking-wider text-primary hover:underline">
            Ver vídeo →
          </a>
        )}

        {products.length > 0 && (
          <section className="mt-16">
            <h2 className="font-display text-2xl italic text-foreground">Peças em destaque</h2>
            <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
              {products.map((p) => (
                <Link
                  key={p.id}
                  to="/produto/$id"
                  params={{ id: p.id }}
                  className="group block"
                >
                  <div className="aspect-[3/4] overflow-hidden rounded-xl bg-muted">
                    {p.images[0] ? (
                      <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover transition group-hover:scale-105" />
                    ) : null}
                  </div>
                  <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">{p.brand}</p>
                  <p className="text-sm text-foreground">{p.name}</p>
                  <p className="text-xs text-muted-foreground">€{p.price.toFixed(2)}</p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
      <div className="h-20" />
    </Layout>
  );
}