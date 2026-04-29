import { Link, useLocation } from "@tanstack/react-router";
import { Home, ShoppingBag, Compass, Heart, User } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function BottomNav() {
  const loc = useLocation();
  const { t } = useI18n();
  const items = [
    { to: "/", icon: Home, label: t("bottom_home") },
    { to: "/coleccao", icon: ShoppingBag, label: t("tab_collection") },
    { to: "/experiencias", icon: Compass, label: t("bottom_explore") },
    { to: "/wishlist", icon: Heart, label: t("bottom_wishlist") },
    { to: "/perfil", icon: User, label: t("bottom_profile") },
  ] as const;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-md md:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 pb-[env(safe-area-inset-bottom)] pt-2">
        {items.map(({ to, icon: Icon, label }) => {
          const active = loc.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex flex-1 flex-col items-center gap-1 py-1.5 text-[10px] tracking-wide ${
                active ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              <Icon
                size={22}
                strokeWidth={1.5}
                className={active ? "fill-primary/10 text-primary" : ""}
              />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
