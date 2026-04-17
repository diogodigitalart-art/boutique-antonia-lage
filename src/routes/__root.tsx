import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";
import { I18nProvider } from "@/lib/i18n";
import { WishlistProvider } from "@/lib/wishlist";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl italic text-primary">404</h1>
        <h2 className="mt-4 font-display text-2xl italic text-foreground">Página não encontrada</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          A peça que procuras já não está disponível.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Voltar à boutique
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Boutique Antónia Lage — Moda feminina premium em Braga desde 1984" },
      {
        name: "description",
        content:
          "Boutique de moda feminina premium em Braga. Zadig & Voltaire, Self-Portrait, BA&SH, Alberta Ferretti e mais. Fundada em 1984.",
      },
      { name: "author", content: "Boutique Antónia Lage" },
      { property: "og:title", content: "Boutique Antónia Lage — Moda feminina premium em Braga desde 1984" },
      {
        property: "og:description",
        content: "Moda feminina premium curada em Braga desde 1984.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Boutique Antónia Lage — Moda feminina premium em Braga desde 1984" },
      { name: "description", content: "A premium fashion boutique web app for high-end women's apparel." },
      { property: "og:description", content: "A premium fashion boutique web app for high-end women's apparel." },
      { name: "twitter:description", content: "A premium fashion boutique web app for high-end women's apparel." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/127a5d87-bc29-4a83-9fe4-5ce697d1dd4d/id-preview-9bd153d2--c4d11a83-3f33-44e1-a66d-25dcc8c8e9a1.lovable.app-1776446065828.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/127a5d87-bc29-4a83-9fe4-5ce697d1dd4d/id-preview-9bd153d2--c4d11a83-3f33-44e1-a66d-25dcc8c8e9a1.lovable.app-1776446065828.png" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <I18nProvider>
      <WishlistProvider>
        <Outlet />
      </WishlistProvider>
    </I18nProvider>
  );
}
