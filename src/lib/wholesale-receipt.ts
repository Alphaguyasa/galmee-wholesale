import type { ReceiptData, ReceiptLang } from "@/lib/galmee/receipt";

/** What the receipt needs from a stored credit sale (prices as they were at the sale). */
export type StoredCreditSale = {
  ref: string;
  createdAt: string;
  total: number;
  paid: number;
  method: string | null;
  customerName: string;
  lines: { name: string; unit: string; qty: number; price: number }[];
  /** Balance on the statement right after this sale; null when nothing went on credit. */
  balanceAfter: number | null;
};

/** What the receipt needs from a stored repayment. */
export type StoredRepayment = {
  ref: string;
  createdAt: string;
  amount: number;
  method: string;
  reference: string | null;
  customerName: string;
  /** Balance on the statement right after this repayment (customer_balances ledger). */
  balanceAfter: number | null;
};

type Common = {
  tenant: { name: string; phone?: string | null };
  lang: ReceiptLang;
  /** Already formatted Ethiopian date of the record. */
  ethDate: string;
  footer?: string;
};

/** Gregorian day in Addis Ababa (UTC+3), so it matches the Ethiopian date printed next to it. */
export function addisGregDay(iso: string): string {
  return new Date(new Date(iso).getTime() + 3 * 3600 * 1000).toISOString().slice(0, 10);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Receipt for a sale given (partly) on credit. When nothing was paid the method reads
 * "credit"; the balance the shop owes after the sale is printed under the totals.
 */
export function creditSaleReceiptData(sale: StoredCreditSale, c: Common): ReceiptData {
  return {
    tenant: { name: c.tenant.name, phone: c.tenant.phone ?? undefined },
    no: sale.ref,
    kind: "sale",
    lines: sale.lines.map((l) => ({
      name: l.name,
      qty: l.qty,
      unit: l.unit || undefined,
      price: l.price,
      total: round2(l.qty * l.price),
    })),
    totals: {
      due: sale.total,
      paid: sale.paid,
      method: sale.paid > 0 ? (sale.method ?? "other") : "credit",
      balanceAfter: sale.balanceAfter ?? undefined,
    },
    customer: { name: sale.customerName },
    ethDate: c.ethDate,
    gregDate: addisGregDay(sale.createdAt),
    lang: c.lang,
    footer: c.footer,
  };
}

/**
 * Receipt for a repayment: one line with what was paid back (and the shop's own
 * reference, if any), then what the shop still owes, read from the statement.
 */
export function repaymentReceiptData(payment: StoredRepayment, c: Common & { lineLabel: string }): ReceiptData {
  return {
    tenant: { name: c.tenant.name, phone: c.tenant.phone ?? undefined },
    no: payment.ref,
    kind: "repayment",
    lines: [
      {
        name: payment.reference ? `${c.lineLabel} (${payment.reference})` : c.lineLabel,
        total: payment.amount,
      },
    ],
    totals: {
      due: payment.amount,
      paid: payment.amount,
      method: payment.method,
      balanceAfter: payment.balanceAfter ?? undefined,
    },
    customer: { name: payment.customerName },
    ethDate: c.ethDate,
    gregDate: addisGregDay(payment.createdAt),
    lang: c.lang,
    footer: c.footer,
  };
}
