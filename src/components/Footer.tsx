import { Link } from "@tanstack/react-router";
import { Instagram, Facebook } from "lucide-react";

export function Footer() {
  const navLinks = [
    { to: "/coleccao", label: "Colecção" },
    { to: "/arquivo", label: "Arquivo" },
    { to: "/experiencias", label: "Experiências" },
    { to: "/editorial", label: "Looks" },
    { to: "/cartao-oferta", label: "Cartão Oferta" },
    { to: "/contactos", label: "Contactos" },
    { to: "/politica-de-privacidade", label: "Política de privacidade" },
    { to: "/termos-e-condicoes", label: "Termos e condições" },
  ];

  return (
    <footer className="bg-background border-t border-border">
      {/* Main row */}
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 py-8 md:flex-row md:px-8">
        {/* Left — brand */}
        <div className="flex flex-col items-center md:items-start">
          <span className="text-xs font-medium tracking-wide text-foreground">
            Boutique Antónia Lage
          </span>
          <span className="text-[11px] text-muted-foreground">
            Braga · Desde 1984
          </span>
        </div>

        {/* Center — nav links */}
        <nav className="grid grid-cols-2 gap-x-6 gap-y-2 md:flex md:flex-row md:items-center md:gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="flex min-h-[44px] items-center justify-center text-[11px] text-muted-foreground transition hover:text-foreground md:min-h-0 md:justify-start"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right — social icons */}
        <div className="flex items-center gap-3">
          <a
            href="https://www.instagram.com/boutiqueantonialage/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Instagram"
            className="text-muted-foreground transition hover:text-foreground"
          >
            <Instagram size={16} strokeWidth={1.5} />
          </a>
          <a
            href="https://www.facebook.com/BoutiqueAntoniaLage/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Facebook"
            className="text-muted-foreground transition hover:text-foreground"
          >
            <Facebook size={16} strokeWidth={1.5} />
          </a>
        </div>
      </div>

      {/* Bottom copyright */}
      <div className="border-t border-border">
        <div className="mx-auto max-w-7xl px-4 py-4 text-center md:px-8">
          <span className="text-[10px] text-muted-foreground">
            © 2026 Boutique Antónia Lage
          </span>
        </div>
      </div>
    </footer>
  );
}
