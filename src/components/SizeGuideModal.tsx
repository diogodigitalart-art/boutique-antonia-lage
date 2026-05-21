import { useEffect, useState } from "react";
import { X, Ruler } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type GuideData = { headers: string[]; rows: string[][] };

const GENERIC_GUIDE: GuideData = {
  headers: ["EU", "UK", "US", "IT"],
  rows: [
    ["32", "4", "0", "36"],
    ["34", "6", "2", "38"],
    ["36", "8", "4", "40"],
    ["38", "10", "6", "42"],
    ["40", "12", "8", "44"],
    ["42", "14", "10", "46"],
    ["44", "16", "12", "48"],
    ["46", "18", "14", "50"],
  ],
};

export function SizeGuideModal({
  open,
  onClose,
  brand,
  isOneSize,
}: {
  open: boolean;
  onClose: () => void;
  brand: string;
  isOneSize: boolean;
}) {
  const [guide, setGuide] = useState<GuideData | null>(null);
  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!open || isOneSize) return;
    setLoading(true);
    setNotFound(false);
    supabase
      .from("size_guides" as never)
      .select("guide_data")
      .ilike("brand_name", brand)
      .maybeSingle()
      .then(({ data }) => {
        const row = data as { guide_data: GuideData } | null;
        if (row?.guide_data?.rows?.length) {
          setGuide(row.guide_data);
        } else {
          setGuide(GENERIC_GUIDE);
          setNotFound(true);
        }
        setLoading(false);
      });
  }, [open, brand, isOneSize]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 md:items-center md:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-background p-6 shadow-xl md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Ruler size={18} />
            <h2 className="font-display text-xl italic">Guia de tamanhos</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-muted-foreground hover:bg-muted"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mb-4 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          {brand}
        </p>

        {isOneSize ? (
          <p className="rounded-lg bg-muted p-4 text-sm text-foreground">
            Tamanho único — não requer guia de medidas.
          </p>
        ) : loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">A carregar…</p>
        ) : guide ? (
          <>
            {notFound && (
              <p className="mb-3 text-xs text-muted-foreground">
                Guia genérica de conversão (marca sem tabela específica).
              </p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    {guide.headers.map((h) => (
                      <th
                        key={h}
                        className="border-b border-border px-3 py-2 text-left text-[10px] uppercase tracking-wider text-muted-foreground"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {guide.rows.map((r, i) => (
                    <tr key={i} className="border-b border-border/50">
                      {r.map((c, j) => (
                        <td key={j} className="px-3 py-2 text-foreground">
                          {c}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        <div className="mt-6 border-t border-border pt-4">
          <h3 className="mb-2 text-[10px] uppercase tracking-[0.25em] text-foreground">
            Como medir
          </h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Use uma fita métrica e meça sobre roupa fina, em centímetros.
          </p>
          <ul className="space-y-2 text-sm text-foreground">
            <li>
              <span className="font-medium">Busto:</span>{" "}
              <span className="text-muted-foreground">
                à volta da parte mais cheia do peito.
              </span>
            </li>
            <li>
              <span className="font-medium">Cintura:</span>{" "}
              <span className="text-muted-foreground">
                na parte mais estreita do tronco.
              </span>
            </li>
            <li>
              <span className="font-medium">Anca:</span>{" "}
              <span className="text-muted-foreground">
                à volta da parte mais larga da anca.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}