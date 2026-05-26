import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getLatestEditorial, type EditorialPost } from "@/server/features";
import { useProducts } from "@/lib/products";
import { ChevronRight } from "lucide-react";

function parseVideo(url: string): { embed: string | null; vertical: boolean } {
  if (!url) return { embed: null, vertical: false };
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v) return { embed: `https://www.youtube.com/embed/${v}?rel=0&modestbranding=1`, vertical: false };
      const shorts = u.pathname.match(/^\/shorts\/([\w-]{11})/);
      if (shorts) return { embed: `https://www.youtube.com/embed/${shorts[1]}?rel=0&modestbranding=1`, vertical: true };
      const emb = u.pathname.match(/^\/embed\/([\w-]{11})/);
      if (emb) return { embed: `https://www.youtube.com/embed/${emb[1]}?rel=0&modestbranding=1`, vertical: false };
    }
    if (u.hostname === "youtu.be") {
      return { embed: `https://www.youtube.com/embed/${u.pathname.replace("/", "")}?rel=0&modestbranding=1`, vertical: false };
    }
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.replace("/", "");
      if (/^\d+$/.test(id)) return { embed: `https://player.vimeo.com/video/${id}`, vertical: false };
    }
  } catch {
    return { embed: null, vertical: false };
  }
  return { embed: url, vertical: false };
}

// Kept for backward compatibility with previous logic
function _legacy(url: string): string | null {
  if (!url) return null;
  return url;
}

export function EditorialSection() {
  const fetchLatest = useServerFn(getLatestEditorial);
  const { byId } = useProducts();
  const [post, setPost] = useState<EditorialPost | null>(null);

  useEffect(() => {
    fetchLatest()
      .then((r) => setPost(r.post))
      .catch(() => {});
  }, [fetchLatest]);

  if (!post) return null;

  const { embed, vertical } = parseVideo(post.video_url);
  const featured = post.featured_product_ids
    .map((id) => byId(id))
    .filter((p): p is NonNullable<ReturnType<typeof byId>> => Boolean(p))
    .slice(0, 4);

  return (
    <section className="mt-24 md:mt-36">
      <div className="bg-secondary/40 py-14 md:py-20">
        <div className="mx-auto max-w-6xl px-4 md:px-8">
          <div className="grid items-center gap-10 md:grid-cols-5 md:gap-12">
            {/* Video — 40% */}
            <div className="md:col-span-2">
              {embed ? (
                vertical ? (
                  <div className="mx-auto w-full max-w-[360px] overflow-hidden rounded-2xl bg-muted shadow-md" style={{ aspectRatio: "9 / 16" }}>
                    <iframe
                      src={embed}
                      title={post.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="h-full w-full"
                    />
                  </div>
                ) : (
                  <div className="aspect-video w-full overflow-hidden rounded-2xl bg-muted shadow-md">
                    <iframe
                      src={embed}
                      title={post.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      className="h-full w-full"
                    />
                  </div>
                )
              ) : null}
            </div>

            {/* Content — 60% */}
            <div className="md:col-span-3">
              <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
                Esta semana na Boutique
              </p>
              <h2 className="mt-2 font-display text-3xl italic text-foreground md:text-4xl">
                <Link to="/editorial/$id" params={{ id: post.id }} className="hover:text-primary transition-colors">
                  {post.title}
                </Link>
              </h2>
              {post.quote && (
                <blockquote className="mt-3 border-l-2 border-primary pl-4 font-display text-base italic text-muted-foreground md:text-lg">
                  "{post.quote}"
                </blockquote>
              )}

              {featured.length > 0 && (
                <div className="mt-6 grid grid-cols-2 gap-3 md:gap-4">
                  {featured.map((p) => (
                    <Link
                      key={p.id}
                      to="/produto/$id"
                      params={{ id: p.id }}
                      className="group block"
                    >
                      <div className="aspect-square overflow-hidden rounded-lg bg-muted">
                        <img
                          src={p.image}
                          alt={p.name}
                          loading="lazy"
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      </div>
                      <p className="mt-2 text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{p.brand}</p>
                      <p className="text-xs text-foreground line-clamp-1">{p.name}</p>
                      <p className="text-xs font-light text-muted-foreground">€{p.price}</p>
                    </Link>
                  ))}
                </div>
              )}

              <Link
                to="/editorial"
                className="mt-6 inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground"
              >
                Arquivo editorial <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}