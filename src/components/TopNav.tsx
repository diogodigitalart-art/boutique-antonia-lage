import { Link, useLocation } from "@tanstack/react-router";
import { Search, User, Heart } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useWishlist } from "@/lib/wishlist";
import { Logo } from "./Logo";

export function TopNav() {
  const { lang, setLang, t } = useI18n();
  const { ids } = useWishlist();
  const loc = useLocation();
  const hasWish = ids.length > 0;

  const tabs: { to: "/" | "/experiencias" | "/arquivo"; label: string; match: string; badge?: boolean }[] = [
    { to: "/", label: t("tab_collection"), match: "/" },
    { to: "/experiencias", label: t("tab_experiences"), match: "/experiencias", badge: true },
    { to: "/arquivo", label: t("tab_archive"), match: "/arquivo" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
        <Logo />

        {/* Desktop tabs */}
        <nav className="hidden items-center gap-8 md:flex">
          {tabs.map((tab) => {
            const active = loc.pathname === tab.match;
            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={`relative text-sm tracking-wide transition-colors ${
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
                {tab.badge && (
                  <span className="ml-1.5 rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-medium uppercase text-primary-foreground">
                    {t("badge_new")}
                  </span>
                )}
                {active && (
                  <span className="absolute -bottom-[17px] left-0 right-0 h-px bg-foreground" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setLang(lang === "pt" ? "en" : "pt")}
            className="hidden h-9 items-center rounded-full border border-border px-3 text-xs uppercase tracking-wider text-foreground hover:bg-muted md:flex"
          >
            {lang.toUpperCase()}
          </button>
          <button
            aria-label="Search"
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted"
          >
            <Search size={19} strokeWidth={1.5} />
          </button>
          <Link
            to="/wishlist"
            aria-label="Wishlist"
            className="relative hidden h-10 w-10 items-center justify-center rounded-full hover:bg-muted md:flex"
          >
            <Heart size={19} strokeWidth={1.5} />
            {hasWish && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
            )}
          </Link>
          <Link
            to="/perfil"
            aria-label="Profile"
            className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-muted"
          >
            <User size={19} strokeWidth={1.5} />
          </Link>
          <button
            onClick={() => setLang(lang === "pt" ? "en" : "pt")}
            className="ml-1 flex h-9 items-center rounded-full border border-border px-2.5 text-[11px] uppercase tracking-wider text-foreground hover:bg-muted md:hidden"
          >
            {lang.toUpperCase()}
          </button>
        </div>
      </div>
    </header>
  );
}
