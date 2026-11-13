/** Short printable reference for a record id: the first 8 hex digits, upper case. */
export function receiptRef(id: string): string {
  return id.replaceAll("-", "").slice(0, 8).toUpperCase();
}
