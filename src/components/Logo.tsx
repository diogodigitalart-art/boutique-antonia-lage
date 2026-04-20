import logoUrl from "@/assets/logo.svg";
import { Link } from "@tanstack/react-router";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link to="/" aria-label="Boutique Antónia Lage" className={className}>
      <img
        src={logoUrl}
        alt="Boutique Antónia Lage"
        className="h-[38px] w-auto md:h-12"
        draggable={false}
      />
    </Link>
  );
}
