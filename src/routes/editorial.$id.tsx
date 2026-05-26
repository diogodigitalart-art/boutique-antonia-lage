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

function youtubeEmbed(url: string): { src: string | null; vertical: boolean } {
  if (!url) return { src: null, vertical: false };
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  const vertical = /\/shorts\//.test(url);
  return { src: m ? `https://www.youtube.com/embed/${m[1]}?rel=0&modestbranding=1` : null, vertical };
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
            ← Voltar
          </Link>
        </div>
      </Layout>
    );
  }

  const { src: embed, vertical } = youtubeEmbed(post.video_url);

  return (
    <Layout>
      <article className="mx-auto w-full max-w-6xl px-4 pt-8 md:px-8 md:pt-12">
        <Link to="/editorial" className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground hover:text-foreground">
          ← Looks da Semana
        </Link>

        <header className="mt-6 mb-8 text-center md:mb-12">
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            {new Date(post.publish_date).toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" })}
          </p>
          <h1 className="mt-3 font-display text-4xl italic text-foreground md:text-6xl">{post.title}</h1>
        </header>

        {embed ? (
          vertical ? (
            <div className="mx-auto w-full max-w-[400px] overflow-hidden rounded-2xl bg-muted shadow-lg" style={{ aspectRatio: "9 / 16" }}>
              <iframe
                src={embed}
                title={post.title}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="aspect-video w-full overflow-hidden rounded-2xl bg-muted shadow-lg">
              <iframe
                src={embed}
                title={post.title}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )
        ) : post.video_url ? (
          <a href={post.video_url} target="_blank" rel="noreferrer" className="block text-xs uppercase tracking-wider text-primary hover:underline">
            Ver vídeo →
          </a>
        ) : null}

        {post.quote && (
          <blockquote className="mx-auto my-16 max-w-3xl text-center font-display text-3xl italic leading-snug text-foreground md:text-5xl">
            "{post.quote}"
          </blockquote>
        )}

        {products.length > 0 && (
          <section className="my-16">
            <p className="mb-6 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Peças em destaque</p>
            <div className="mx-auto grid max-w-2xl grid-cols-2 gap-4 md:gap-6">
              {products.slice(0, 4).map((p) => (
                <Link
                  key={p.id}
                  to="/produto/$id"
                  params={{ id: p.id }}
                  className="group block"
                >
                  <div className="aspect-square overflow-hidden rounded-xl bg-muted">
                    {p.images[0] ? (
                      <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                    ) : null}
                  </div>
                  <p className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">{p.brand}</p>
                  <p className="text-sm text-foreground line-clamp-1">{p.name}</p>
                  <p className="text-xs text-muted-foreground">€{p.price.toFixed(2)}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {post.teaser_text && (
          <div className="mx-auto mb-20 mt-12 max-w-3xl rounded-2xl border border-border bg-card/40 p-6 md:p-10">
            <p className="whitespace-pre-line text-center font-display text-lg italic leading-relaxed text-muted-foreground md:text-xl">
              {post.teaser_text}
            </p>
          </div>
        )}
      </article>
    </Layout>
  );
}