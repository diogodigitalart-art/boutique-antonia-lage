import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Layout } from "@/components/Layout";
import { listPublishedEditorials, type EditorialPost } from "@/server/features";

export const Route = createFileRoute("/editorial")({
  head: () => ({
    meta: [
      { title: "Editorial | Boutique Antónia Lage" },
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
      <section className="mx-auto max-w-5xl px-4 pt-10 md:px-8 md:pt-16">
        <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">Editorial</p>
        <h1 className="mt-2 font-display text-4xl italic text-foreground md:text-6xl">
          Esta semana na Boutique
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Curadoria semanal de peças, histórias e inspiração.
        </p>
      </section>

      <section className="mx-auto mt-12 max-w-5xl px-4 pb-20 md:px-8">
        {loading ? (
          <p className="text-sm text-muted-foreground">A carregar…</p>
        ) : posts.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ainda sem edições publicadas.</p>
        ) : (
          <ul className="space-y-10">
            {posts.map((p) => (
              <li key={p.id} className="rounded-3xl border border-border bg-card p-6 md:p-10">
                <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                  {new Date(p.publish_date).toLocaleDateString("pt-PT", {
                    day: "2-digit",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
                <h2 className="mt-2 font-display text-3xl italic text-foreground md:text-4xl">
                  {p.title}
                </h2>
                {p.quote && (
                  <blockquote className="mt-4 border-l-2 border-primary pl-4 font-display text-lg italic text-muted-foreground">
                    "{p.quote}"
                  </blockquote>
                )}
                {p.teaser_text && (
                  <p className="mt-4 text-sm text-muted-foreground">{p.teaser_text}</p>
                )}
                <Link
                  to="/editorial/$id"
                  params={{ id: p.id }}
                  className="mt-6 inline-block text-xs uppercase tracking-wider text-primary hover:underline"
                >
                  Ler edição →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </Layout>
  );
}