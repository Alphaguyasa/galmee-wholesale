import type { AppLocale } from "@/i18n/routing";

const NUMBER = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Birr for display only: all money math happens in the database. */
export function formatBirr(amount: number, locale: AppLocale): string {
  const text = NUMBER.format(amount);
  return locale === "am" ? `ብር ${text}` : `${text} ETB`;
}

/** Amount without the currency, for narrow columns (receipt lines) where the currency is shown once below. */
export function formatAmount(amount: number): string {
  return NUMBER.format(amount);
}

const QTY = new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 });

/** Stock quantity for display: no trailing zeros, thousands separated. */
export function formatQty(qty: number): string {
  return QTY.format(qty);
}

/** Amount typed by the user ("1,500" or "1500.50"), or null unless it is a positive birr amount with at most 2 decimals. */
export function parseBirrAmount(raw: string): number | null {
  const text = raw.trim().replace(/,/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const n = Number(text);
  return n > 0 && n <= 100_000_000 ? n : null;
}
