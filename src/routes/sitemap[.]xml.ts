import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { slugify } from "@/lib/utils";

const BASE_URL = "https://boutique-antonia-lage.lovable.app";

interface SitemapEntry {
  path: string;
  lastmod?: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/coleccao", changefreq: "daily", priority: "0.9" },
          { path: "/experiencias", changefreq: "weekly", priority: "0.8" },
          { path: "/editorial", changefreq: "weekly", priority: "0.7" },
          { path: "/sobre", changefreq: "monthly", priority: "0.5" },
          { path: "/contactos", changefreq: "monthly", priority: "0.5" },
          { path: "/arquivo", changefreq: "weekly", priority: "0.6" },
        ];

        // Active products
        try {
          const { data: products } = await supabaseAdmin
            .from("products")
            .select("id, legacy_id, brand, updated_at, is_active")
            .eq("is_active", true);
          const brandSet = new Set<string>();
          (products ?? []).forEach((p) => {
            const row = p as {
              id: string;
              legacy_id: string | null;
              brand: string | null;
              updated_at: string | null;
            };
            const slug = row.legacy_id || row.id;
            entries.push({
              path: `/produto/${slug}`,
              lastmod: row.updated_at ?? undefined,
              changefreq: "weekly",
              priority: "0.6",
            });
            if (row.brand) brandSet.add(row.brand);
          });
          Array.from(brandSet)
            .sort((a, b) => a.localeCompare(b))
            .forEach((b) => {
              entries.push({
                path: `/coleccao/marca/${slugify(b)}`,
                changefreq: "weekly",
                priority: "0.7",
              });
            });
        } catch (err) {
          console.error("sitemap: products query failed", err);
        }

        // Published editorial posts
        try {
          const { data: posts } = await supabaseAdmin
            .from("editorial_posts")
            .select("id, updated_at, is_published")
            .eq("is_published", true);
          (posts ?? []).forEach((p) => {
            const row = p as { id: string; updated_at: string | null };
            entries.push({
              path: `/editorial/${row.id}`,
              lastmod: row.updated_at ?? undefined,
              changefreq: "monthly",
              priority: "0.6",
            });
          });
        } catch (err) {
          console.error("sitemap: editorial query failed", err);
        }

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});