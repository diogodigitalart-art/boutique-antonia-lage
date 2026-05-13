import { useEffect, useRef, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  images: string[];
  startIndex?: number;
  alt?: string;
};

export function ImageLightbox({ open, onClose, images, startIndex = 0, alt }: Props) {
  const [index, setIndex] = useState(startIndex);
  const [scale, setScale] = useState(1);
  const pinchStartRef = useRef<{ dist: number; scale: number } | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchDeltaRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  useEffect(() => {
    if (open) {
      setIndex(startIndex);
      setScale(1);
    }
  }, [open, startIndex]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, images.length]);

  if (!open) return null;

  const hasMultiple = images.length > 1;
  const prev = () => {
    setScale(1);
    setIndex((i) => (i - 1 + images.length) % images.length);
  };
  const next = () => {
    setScale(1);
    setIndex((i) => (i + 1) % images.length);
  };

  const dist = (touches: React.TouchList) => {
    const [a, b] = [touches[0], touches[1]];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Fechar"
        className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
      >
        <X size={22} />
      </button>

      {hasMultiple && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            aria-label="Anterior"
            className="absolute left-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <ChevronLeft size={24} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            aria-label="Seguinte"
            className="absolute right-4 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <ChevronRight size={24} />
          </button>
        </>
      )}

      <img
        src={images[index]}
        alt={alt ?? ""}
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => {
          if (e.touches.length === 2) {
            pinchStartRef.current = { dist: dist(e.touches), scale };
            touchStartRef.current = null;
          } else if (e.touches.length === 1) {
            touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            touchDeltaRef.current = { x: 0, y: 0 };
          }
        }}
        onTouchMove={(e) => {
          if (e.touches.length === 2 && pinchStartRef.current) {
            e.preventDefault();
            const ratio = dist(e.touches) / pinchStartRef.current.dist;
            const newScale = Math.min(4, Math.max(1, pinchStartRef.current.scale * ratio));
            setScale(newScale);
          } else if (e.touches.length === 1 && touchStartRef.current) {
            touchDeltaRef.current = {
              x: e.touches[0].clientX - touchStartRef.current.x,
              y: e.touches[0].clientY - touchStartRef.current.y,
            };
          }
        }}
        onTouchEnd={(e) => {
          if (e.touches.length < 2) pinchStartRef.current = null;
          if (e.touches.length === 0 && touchStartRef.current && hasMultiple && scale === 1) {
            const { x, y } = touchDeltaRef.current;
            if (Math.abs(x) >= 50 && Math.abs(x) > Math.abs(y)) {
              if (x < 0) next();
              else prev();
            }
          }
          if (e.touches.length === 0) touchStartRef.current = null;
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setScale((s) => (s > 1 ? 1 : 2));
        }}
        style={{ transform: `scale(${scale})`, transition: "transform 0.2s ease-out" }}
        className="max-h-[90vh] max-w-[92vw] select-none object-contain animate-in zoom-in-95 duration-200"
        draggable={false}
      />

      {hasMultiple && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-xs font-light tracking-wider text-white">
          {index + 1} / {images.length}
        </div>
      )}
    </div>
  );
}