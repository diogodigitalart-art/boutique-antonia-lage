import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="mt-32 border-t border-border bg-background py-12 md:mt-40">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 md:px-8">
        <p className="text-center text-xs font-light uppercase tracking-[0.3em] text-muted-foreground">
          {t("founded")}
        </p>
        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <Link to="/contactos" className="hover:text-foreground">
            Contactos
          </Link>
          <span className="opacity-30">·</span>
          <Link to="/politica-de-privacidade" className="hover:text-foreground">
            Política de privacidade
          </Link>
          <span className="opacity-30">·</span>
          <Link to="/termos-e-condicoes" className="hover:text-foreground">
            Termos e condições
          </Link>
        </nav>
      </div>
    </footer>
  );
}
