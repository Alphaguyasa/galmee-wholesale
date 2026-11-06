import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format an amount in birr, e.g. "12,500.00 ብር" / "Br 12,500.00". */
export function formatBirr(amount: number, locale: "am" | "om" | "en" = "am"): string {
  const n = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return locale === "am" ? `${n} ብር` : `Br ${n}`;
}
