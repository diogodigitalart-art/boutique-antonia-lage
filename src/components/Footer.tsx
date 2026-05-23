import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { Instagram, Facebook, MapPin, Clock } from "lucide-react";

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="mt-32 border-t border-border bg-background py-12 md:mt-40">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="grid gap-10 md:grid-cols-3 md:gap-12">
          <div>
            <p className="font-display text-2xl italic text-foreground">Boutique Antónia Lage</p>
            <p className="mt-3 text-xs font-light uppercase tracking-[0.3em] text-muted-foreground">
              {t("founded")}
            </p>
          </div>
          <div className="space-y-3 text-sm font-light text-muted-foreground">
            <div className="flex items-start gap-2">
              <MapPin size={14} strokeWidth={1.5} className="mt-1 shrink-0" />
              <span>Rua do Souto, Braga · Portugal</span>
            </div>
            <div className="flex items-start gap-2">
              <Clock size={14} strokeWidth={1.5} className="mt-1 shrink-0" />
              <span>
                Seg–Sex 10h–19h
                <br />
                Sáb 10h–13h
              </span>
            </div>
          </div>
          <div className="space-y-4">
            <nav className="flex flex-col gap-2 text-sm font-light text-muted-foreground">
              <Link to="/contactos" className="hover:text-foreground">Contactos</Link>
              <Link to="/politica-de-privacidade" className="hover:text-foreground">Política de privacidade</Link>
              <Link to="/termos-e-condicoes" className="hover:text-foreground">Termos e condições</Link>
            </nav>
            <div className="flex gap-3 pt-2">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-foreground hover:text-foreground"
              >
                <Instagram size={16} strokeWidth={1.5} />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition hover:border-foreground hover:text-foreground"
              >
                <Facebook size={16} strokeWidth={1.5} />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
