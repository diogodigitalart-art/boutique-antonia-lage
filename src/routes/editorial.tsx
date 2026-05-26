import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Layout } from "@/components/Layout";
import { listPublishedEditorials, type EditorialPost } from "@/server/features";

export const Route = createFileRoute("/editorial")({
  head: () => ({
    meta: [
      { title: "Looks da Semana | Boutique Antónia Lage" },
      { name: "description", content: "Histórias, peças e curadoria semanal da Boutique Antónia Lage." },
    ],
  }),
  component: EditorialPage,
});

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

function EditorialPage() {
  const fetchPosts = useServerFn(listPublishedEditorials);
  const [posts, setPosts] = useState<EditorialPost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPosts()
      .then((r) => setPosts(r.posts))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [fetchPosts]);

  return (
    <Layout>
      <section className="mx-auto max-w-6xl px-4 pt-10 md:px-8 md:pt-16">
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Editorial</p>
        <h1 className="mt-2 font-display text-4xl italic text-foreground md:text-6xl">
          Looks da Semana
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Curadoria semanal de peças, histórias e inspiração.
        </p>
      </section>

      <section className="mx-auto mt-12 max-w-6xl px-4 pb-20 md:px-8">
        {loading ? (
          <p className="text-sm text-muted-foreground">A carregar…</p>
        ) : posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ainda sem edições publicadas.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-8 md:grid-cols-2 md:gap-10">
            {posts.map((p) => {
              const vid = extractYouTubeId(p.video_url);
              const isShort = /\/shorts\//.test(p.video_url);
              // sddefault.jpg is 4:3 with no letterboxing; fallback to hqdefault (also 4:3)
              const thumb = vid
                ? `https://img.youtube.com/vi/${vid}/${isShort ? "hqdefault" : "sddefault"}.jpg`
                : null;
              return (
                <li key={p.id}>
                  <Link
                    to="/editorial/$id"
                    params={{ id: p.id }}
                    className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div className="aspect-[4/3] w-full overflow-hidden bg-muted">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt={p.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                          onError={(e) => {
                            if (vid) (e.currentTarget as HTMLImageElement).src = `https://img.youtube.com/vi/${vid}/hqdefault.jpg`;
                          }}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                          Sem vídeo
                        </div>
                      )}
                    </div>
                    <div className="flex flex-1 flex-col p-6">
                      <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                        {new Date(p.publish_date).toLocaleDateString("pt-PT", {
                          day: "2-digit",
                          month: "long",
                          year: "numeric",
                        })}
                      </p>
                      <h2 className="mt-2 font-display text-2xl italic text-foreground transition-colors group-hover:text-primary md:text-3xl">
                        {p.title}
                      </h2>
                      {p.quote && (
                        <p className="mt-2 text-sm italic text-muted-foreground line-clamp-2">"{p.quote}"</p>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </Layout>
  );
}