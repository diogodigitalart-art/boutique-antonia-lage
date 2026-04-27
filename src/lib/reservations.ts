export const TIME_SLOTS = [
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:30",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "18:30",
] as const;

export const SCHEDULE_NOTE =
  "Horário: 10h–13h e 14h30–19h · Fechado ao Domingo";

/** Returns true if the given YYYY-MM-DD date string is a Sunday (locale-safe). */
export function isSunday(dateStr: string): boolean {
  if (!dateStr) return false;
  // Parse as local date (YYYY-MM-DD) to avoid timezone shifts
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return false;
  const dt = new Date(y, m - 1, d);
  return dt.getDay() === 0;
}

export type ReservationStatus = "Confirmada" | "Em visita" | "Cancelada";

export const STATUS_OPTIONS: ReservationStatus[] = [
  "Confirmada",
  "Em visita",
  "Cancelada",
];

/** Tailwind classes for the small status pill. */
export function statusBadgeClasses(status: string): string {
  const base =
    "inline-flex items-center rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.2em]";
  switch (status) {
    case "Em visita":
      return `${base} bg-warning-soft text-warning`;
    case "Cancelada":
      return `${base} bg-destructive-soft text-destructive`;
    case "Confirmada":
    default:
      return `${base} bg-success-soft text-success`;
  }
}