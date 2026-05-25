import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getLatestEditorial, type EditorialPost } from "@/server/features";
import { ProductCard } from "@/components/ProductCard";
import { useProducts } from "@/lib/products";
import { ChevronRight } from "lucide-react";

function toEmbed(url: string): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname === "youtu.be") {
      return `https://www.youtube.com/embed/${u.pathname.replace("/", "")}`;
    }
    if (u.hostname.includes("instagram.com")) {
      const m = u.pathname.match(/^\/(p|reel|tv)\/([^/]+)/);
      if (m) return `https://www.instagram.com/${m[1]}/${m[2]}/embed`;
    }
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.replace("/", "");
      if (/^\d+$/.test(id)) return `https://player.vimeo.com/video/${id}`;
    }
  } catch {
    return null;
  }
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

  const embed = toEmbed(post.video_url);
  const featured = post.featured_product_ids
    .map((id) => byId(id))
    .filter((p): p is NonNullable<ReturnType<typeof byId>> => Boolean(p))
    .slice(0, 4);

  return (
    <section className="mt-24 md:mt-36">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
              Esta semana na Boutique
            </p>
            <h2 className="mt-2 font-display text-4xl italic text-foreground md:text-5xl">
              {post.title}
            </h2>
          </div>
          <Link
            to="/editorial"
            className="hidden items-center gap-1 text-sm font-light text-muted-foreground hover:text-foreground md:flex"
          >
            Arquivo editorial <ChevronRight size={16} />
          </Link>
        </div>

        {post.quote && (
          <blockquote className="mb-8 border-l-2 border-primary pl-6 font-display text-xl italic text-foreground md:text-2xl">
            "{post.quote}"
          </blockquote>
        )}

        {embed && (
          <div className="mb-10 aspect-video w-full overflow-hidden rounded-2xl bg-muted">
            <iframe
              src={embed}
              title={post.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
        )}

        {featured.length > 0 && (
          <div className="grid grid-cols-2 items-stretch gap-x-4 gap-y-12 md:grid-cols-4 md:gap-x-6">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}

        {post.teaser_text && (
          <p className="mt-10 text-center font-display text-lg italic text-muted-foreground md:text-xl">
            {post.teaser_text}
          </p>
        )}
      </div>
    </section>
  );
}