import type { AdminUser } from "@/server/admin";

export type VipLevel = AdminUser["vip_level"];

export const VIP_LABELS: Record<VipLevel, string> = {
  none: "Sem nível",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

export function vipBadgeClasses(level: VipLevel): string {
  const base =
    "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider";
  switch (level) {
    case "silver":
      return `${base} bg-slate-200 text-slate-700`;
    case "gold":
      return `${base} bg-amber-100 text-amber-800`;
    case "platinum":
      return `${base} bg-indigo-950 text-indigo-50`;
    default:
      return `${base} bg-muted text-muted-foreground`;
  }
}