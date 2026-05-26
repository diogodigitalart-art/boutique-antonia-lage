import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Layout } from "@/components/Layout";
import { listPublishedEditorials, type EditorialPost } from "@/server/features";
import { Play } from "lucide-react";

export const Route = createFileRoute("/editorial")({
  head: () => ({
    meta: [
      { title: "Looks da Semana | Boutique Antónia Lage" },
      { name: "description", content: "Histórias, peças e curadoria semanal da Boutique Antónia Lage." },
    ],
  }),
  component: EditorialPage,
});

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
              return (
                <li key={p.id}>
                  <Link
                    to="/editorial/$id"
                    params={{ id: String(p.id) }}
                    className="group flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                  >
                    <div
                      className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden p-6 text-center"
                      style={{ backgroundColor: "#1a2744" }}
                    >
                      {p.cover_image ? (
                        <img
                          src={p.cover_image}
                          alt={p.title}
                          loading="lazy"
                          className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-4">
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 ring-1 ring-white/30 backdrop-blur-sm transition group-hover:scale-110 group-hover:bg-white/20">
                            <Play size={26} className="ml-1 fill-white text-white" strokeWidth={1.5} />
                          </div>
                          <h3 className="font-display text-2xl italic leading-tight text-white md:text-3xl">
                            {p.title}
                          </h3>
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