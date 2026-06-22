import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Replace legacy "OS" (One Size) with "U" (Único) for display. */
export function displaySize(size: string | null | undefined): string {
  if (!size) return "—";
  return size.trim().toUpperCase() === "OS" ? "U" : size;
}

/** Normalize a size label before saving: "OS" → "U". */
export function normalizeSize(size: string | null | undefined): string | null {
  if (!size) return null;
  const trimmed = size.trim().toUpperCase();
  return trimmed === "OS" ? "U" : size.trim();
}

/** URL-friendly slug from any string. Lowercase, accents stripped, all
 *  special characters removed, spaces collapsed to hyphens. */
export function slugify(input: string | null | undefined): string {
  if (!input) return "";
  return String(input)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

