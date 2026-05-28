import { Link } from "@tanstack/react-router";
import { useI18n } from "@/lib/i18n";
import { Instagram, Facebook, Mail, Phone, MapPin, Clock } from "lucide-react";
import logoUrl from "@/assets/logo.svg";

export function Footer() {
  const { t } = useI18n();
  return (
    <footer className="bg-[#1a2744] text-white">
      {/* Main footer content */}
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-8">
        <div className="grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Column 1 — Brand */}
          <div className="space-y-6">
            <Link to="/" aria-label="Boutique Antónia Lage">
              <img
                src={logoUrl}
                alt="Boutique Antónia Lage"
                className="h-10 w-auto brightness-0 invert"
                draggable={false}
              />
            </Link>
            <p className="text-sm leading-relaxed text-white/70">
              Moda feminina premium em Braga desde 1984
            </p>
            <div className="flex items-center gap-3">
              <SocialLink
                href="https://www.instagram.com/boutiqueantonialage/"
                label="Instagram"
                icon={Instagram}
              />
              <SocialLink
                href="https://www.facebook.com/BoutiqueAntoniaLage/"
                label="Facebook"
                icon={Facebook}
              />
            </div>
          </div>

          {/* Column 2 — Navegar */}
          <div>
            <h3 className="mb-5 text-xs uppercase tracking-[0.25em] text-white/40">
              Navegar
            </h3>
            <ul className="space-y-3">
              <FooterLink to="/coleccao">Colecção</FooterLink>
              <FooterLink to="/arquivo">Arquivo</FooterLink>
              <FooterLink to="/experiencias">Experiências</FooterLink>
              <FooterLink to="/editorial">Looks da Semana</FooterLink>
              <FooterLink to="/cartao-oferta">Cartão Oferta</FooterLink>
            </ul>
          </div>

          {/* Column 3 — Informação */}
          <div>
            <h3 className="mb-5 text-xs uppercase tracking-[0.25em] text-white/40">
              Informação
            </h3>
            <ul className="space-y-3">
              <FooterLink to="/sobre">Sobre nós</FooterLink>
              <FooterLink to="/contactos">Contactos</FooterLink>
              <FooterLink to="/politica-de-privacidade">Política de privacidade</FooterLink>
              <FooterLink to="/termos-e-condicoes">Termos e condições</FooterLink>
              <FooterLink to="/devolucoes-info">Devoluções</FooterLink>
            </ul>
          </div>

          {/* Column 4 — Contacto */}
          <div>
            <h3 className="mb-5 text-xs uppercase tracking-[0.25em] text-white/40">
              Contacto
            </h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-sm text-white/70">
                <MapPin size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-white/40" />
                <span>
                  <span className="font-medium text-white">Boutique Antónia Lage</span>
                  <br />
                  R. Dom Afonso Henriques 111
                  <br />
                  4700-030 Braga, Portugal
                </span>
              </li>
              <li className="flex items-center gap-3 text-sm text-white/70">
                <Phone size={16} strokeWidth={1.5} className="shrink-0 text-white/40" />
                <a
                  href="tel:+351932196049"
                  className="transition hover:text-white"
                >
                  +351 932 196 049
                </a>
              </li>
              <li className="flex items-center gap-3 text-sm text-white/70">
                <Mail size={16} strokeWidth={1.5} className="shrink-0 text-white/40" />
                <span>info@antonialage.pt</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-white/70">
                <Clock size={16} strokeWidth={1.5} className="mt-0.5 shrink-0 text-white/40" />
                <span>
                  Seg–Sex: 10h–19h
                  <br />
                  Sáb: 10h–13h
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-white/40 md:flex-row md:px-8">
          <span>
            © 2026 Boutique Antónia Lage. Todos os direitos reservados.
          </span>
          <span>Desenvolvido com ♥ em Braga</span>
        </div>
      </div>
    </footer>
  );
}

function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        to={to}
        className="text-sm text-white/70 transition hover:text-white"
      >
        {children}
      </Link>
    </li>
  );
}

function SocialLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: typeof Instagram;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-[#3b82f6]"
    >
      <Icon size={18} strokeWidth={1.5} />
    </a>
  );
}
