import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getSetting } from "@/server/newsletter";

const DEFAULT_NUMBER = "+351932196049";

function buildLink(rawNumber: string, message: string) {
  const digits = rawNumber.replace(/[^\d]/g, "");
  const text = encodeURIComponent(message);
  return `https://wa.me/${digits}?text=${text}`;
}

export function useWhatsappNumber(): string {
  const fetchSetting = useServerFn(getSetting);
  const [number, setNumber] = useState<string>(DEFAULT_NUMBER);
  useEffect(() => {
    let cancelled = false;
    fetchSetting({ data: { key: "whatsapp_number" } })
      .then((r) => {
        if (!cancelled && r?.value) setNumber(r.value);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [fetchSetting]);
  return number;
}

export function WhatsAppLink({
  message,
  className,
  children,
}: {
  message: string;
  className?: string;
  children: React.ReactNode;
}) {
  const number = useWhatsappNumber();
  return (
    <a
      href={buildLink(number, message)}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
    >
      {children}
    </a>
  );
}

export function WhatsAppFloatingButton() {
  const number = useWhatsappNumber();
  const message = "Olá! Tenho interesse numa peça da Boutique Antónia Lage.";
  return (
    <a
      href={buildLink(number, message)}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contactar no WhatsApp"
      className="fixed right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition hover:scale-105 active:scale-95"
      style={{ backgroundColor: "#25D366", bottom: "calc(env(safe-area-inset-bottom, 0px) + 5.5rem)" }}
    >
      <svg viewBox="0 0 32 32" className="h-7 w-7 text-white" fill="currentColor" aria-hidden="true">
        <path d="M19.11 17.205c-.372 0-1.088 1.39-1.518 1.39a.63.63 0 0 1-.315-.1c-.802-.402-1.504-.817-2.163-1.447-.545-.516-1.146-1.29-1.46-1.963a.426.426 0 0 1-.073-.215c0-.33.99-.945.99-1.49 0-.143-.73-2.09-.832-2.335-.143-.372-.214-.487-.6-.487-.187 0-.36-.043-.53-.043-.302 0-.53.115-.746.315-.688.645-1.032 1.318-1.06 2.264v.114c-.015.99.472 1.977 1.017 2.78 1.23 1.82 2.506 3.41 4.554 4.34.616.287 2.035.688 2.722.688.358 0 2.349-.43 2.622-.97.143-.286.143-.557.143-.83 0-.143-.014-.272-.043-.4-.115-.4-1.96-1.13-2.722-1.61zm-3.085 7.413c-1.815 0-3.587-.5-5.143-1.428l-.358-.214-3.74.97 1-3.654-.236-.378c-1.018-1.62-1.553-3.49-1.553-5.404 0-5.515 4.487-10.002 10.002-10.002 5.515 0 10.002 4.487 10.002 10.002 0 5.515-4.487 10.002-10.002 10.002zm0-21.99C9.41 2.628 4 8.038 4 14.65c0 2.106.553 4.146 1.605 5.943L4 26.628l6.155-1.616c1.74.95 3.7 1.45 5.683 1.45 6.616 0 12.026-5.41 12.026-12.026 0-6.616-5.41-12.024-12.026-12.024z"/>
      </svg>
    </a>
  );
}