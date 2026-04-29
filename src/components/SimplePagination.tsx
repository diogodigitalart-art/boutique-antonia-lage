import { ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
};

export function SimplePagination({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null;
  const prev = () => onChange(Math.max(1, page - 1));
  const next = () => onChange(Math.min(totalPages, page + 1));
  return (
    <div className="mt-12 flex items-center justify-center gap-6 text-sm font-light">
      <button
        onClick={prev}
        disabled={page === 1}
        className="inline-flex items-center gap-1.5 text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft size={16} /> Anterior
      </button>
      <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Página {page} de {totalPages}
      </span>
      <button
        onClick={next}
        disabled={page === totalPages}
        className="inline-flex items-center gap-1.5 text-muted-foreground transition hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
      >
        Seguinte <ChevronRight size={16} />
      </button>
    </div>
  );
}