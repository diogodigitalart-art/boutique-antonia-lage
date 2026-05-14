import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  ShoppingBag,
  Calendar,
  Tag,
  Users,
  Percent,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Loader2,
} from "lucide-react";
import { useAuth } from "@/lib/auth";

const ADMIN_EMAIL = "diogodigitalart@gmail.com";

const NAV_ITEMS = [
  { to: "/admin", label: "Visão Geral", icon: LayoutDashboard, exact: true },
  { to: "/admin/encomendas", label: "Encomendas", icon: ShoppingBag, exact: false },
  { to: "/admin/reservas", label: "Reservas", icon: Calendar, exact: false },
  { to: "/admin/produtos", label: "Produtos", icon: Tag, exact: false },
  { to: "/admin/clientes", label: "Clientes", icon: Users, exact: false },
  { to: "/admin/promocoes", label: "Promoções", icon: Percent, exact: false },
  { to: "/admin/relatorios", label: "Relatórios", icon: BarChart3, exact: false },
  { to: "/admin/configuracoes", label: "Configurações", icon: Settings, exact: false },
] as const;

export function AdminLayout({ children }: { children: ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user || (user.email || "").toLowerCase() !== ADMIN_EMAIL) {
      navigate({ to: "/", replace: true });
    }
  }, [user, loading, navigate]);

  if (loading || !user || (user.email || "").toLowerCase() !== ADMIN_EMAIL) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/", replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-card px-4 md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-foreground hover:bg-muted"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="text-sm font-medium tracking-wide">Antónia Lage · Admin</div>
        <div className="w-9" />
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-[260px] bg-card shadow-xl">
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <SidebarBrand />
              <button
                onClick={() => setMobileOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                aria-label="Fechar menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <SidebarBody
              email={user.email || ""}
              onSignOut={handleSignOut}
              onNavigate={() => setMobileOpen(false)}
            />
          </aside>
        </div>
      )}

      <div className="md:flex">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 hidden w-[240px] flex-col border-r border-border bg-card md:flex">
          <div className="flex h-16 items-center px-5 border-b border-border">
            <SidebarBrand />
          </div>
          <SidebarBody email={user.email || ""} onSignOut={handleSignOut} />
        </aside>

        <main className="min-h-screen w-full md:ml-[240px]">{children}</main>
      </div>
    </div>
  );
}

function SidebarBrand() {
  return (
    <Link to="/admin" className="block">
      <p className="font-display text-lg italic leading-none text-foreground">Antónia Lage</p>
      <span className="mt-1 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.18em] text-primary">
        Admin
      </span>
    </Link>
  );
}

function SidebarBody({
  email,
  onSignOut,
  onNavigate,
}: {
  email: string;
  onSignOut: () => void;
  onNavigate?: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const isActive = (to: string, exact: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <div className="flex h-[calc(100%-3.5rem)] flex-col md:h-[calc(100vh-4rem)]">
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.to, item.exact);
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <Link
                  to={item.to}
                  onClick={onNavigate}
                  className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "text-foreground hover:bg-muted"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-border p-4">
        <p className="truncate text-[11px] text-muted-foreground" title={email}>
          {email}
        </p>
        <button
          onClick={onSignOut}
          className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium text-foreground transition hover:bg-muted"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair
        </button>
      </div>
    </div>
  );
}