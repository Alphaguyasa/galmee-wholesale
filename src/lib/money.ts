import type { AppLocale } from "@/i18n/routing";

const NUMBER = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Birr for display only: all money math happens in the database. */
export function formatBirr(amount: number, locale: AppLocale): string {
  const text = NUMBER.format(amount);
  return locale === "am" ? `ብር ${text}` : `${text} ETB`;
}

const QTY = new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 });

/** Stock quantity for display: no trailing zeros, thousands separated. */
export function formatQty(qty: number): string {
  return QTY.format(qty);
}
