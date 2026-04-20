import logoUrl from "@/assets/logo.svg";
import { Link } from "@tanstack/react-router";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" aria-label="Boutique Antónia Lage" className={className}>
      <img
        src={logoUrl}
        alt="Boutique Antónia Lage"
        className="h-7 w-auto md:h-8"
        draggable={false}
      />
    </Link>
  );
}
