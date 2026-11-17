/** One spreadsheet cell: text, a number, or empty. */
export type CsvCell = string | number | null | undefined;

// A text cell starting with one of these could run as a formula when the file is opened in
// Excel or LibreOffice (customer names and notes are typed by people), so it is prefixed with '.
const FORMULA_START = /^[=+\-@\t\r]/;

function cell(value: CsvCell): string {
  if (value === null || value === undefined) return "";
  let text = typeof value === "number" ? (Number.isFinite(value) ? String(value) : "") : value;
  if (typeof value === "string" && FORMULA_START.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * RFC 4180 CSV with CRLF line ends and a UTF-8 byte order mark, so Excel on Windows shows
 * Amharic (Ethiopic) text correctly instead of guessing a legacy code page.
 */
export function toCsv(header: readonly string[], rows: readonly (readonly CsvCell[])[]): string {
  const lines = [header, ...rows].map((r) => r.map(cell).join(","));
  return `﻿${lines.join("\r\n")}\r\n`;
}

/** Gregorian 'YYYY-MM-DD' of a timestamp in Addis Ababa time (UTC+3, no daylight saving). */
export function addisDay(iso: string): string {
  return new Date(Date.parse(iso) + 3 * 3_600_000).toISOString().slice(0, 10);
}

/** Addis Ababa wall-clock 'HH:MM' of a timestamp. */
export function addisTime(iso: string): string {
  return new Date(Date.parse(iso) + 3 * 3_600_000).toISOString().slice(11, 16);
}

export const EXPORT_KINDS = ["customers", "ledger", "payments", "sales", "items"] as const;
export type ExportKind = (typeof EXPORT_KINDS)[number];

export function isExportKind(value: string): value is ExportKind {
  return (EXPORT_KINDS as readonly string[]).includes(value);
}

/** File name like galmee-wholesale-customers-2026-11-17.csv (ASCII only, safe in headers). */
export function exportFileName(kind: ExportKind, day: string): string {
  return `galmee-wholesale-${kind}-${day}.csv`;
}
