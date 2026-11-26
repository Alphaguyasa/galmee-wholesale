/**
 * Wholesale's reports for the Galmee report screen: credit sales, repayments and the ageing
 * snapshot. The kit fetches `from(view).select().gte().lt().order().limit()`; here each
 * "view" name is a small runner that does the real query (with the customer's name joined)
 * and hands back flat rows. RLS does the tenant filtering, as everywhere else.
 */

import type { ReportClient, ReportDef, ReportRow } from "@/lib/galmee/report";

export type Range = { from: string; to: string };
type RunnerResult = { data: ReportRow[] | null; error: { message: string } | null };
/** Runs one report query. `range` is null when the kit did not filter by date. */
export type SourceRunner = (range: Range | null, limit: number) => PromiseLike<RunnerResult>;

/** A ReportClient over named runners, so the kit's fetcher (cache, stale copy, row cap) is reused as is. */
export function runnerClient(runners: Record<string, SourceRunner>): ReportClient {
  return {
    from(view: string) {
      const run = runners[view];
      const range: Partial<Range> = {};
      const filter = {
        gte(_c: string, v: string) {
          range.from = v;
          return filter;
        },
        lt(_c: string, v: string) {
          range.to = v;
          return filter;
        },
        order() {
          return filter;
        },
        limit(n: number): PromiseLike<RunnerResult> {
          if (!run) return Promise.resolve({ data: null, error: { message: `unknown_report_source:${view}` } });
          const r = range.from && range.to ? { from: range.from, to: range.to } : null;
          return run(r, n);
        },
      };
      return { select: () => filter };
    },
    rpc(fn: string) {
      return { limit: () => Promise.resolve({ data: null, error: { message: `unknown_report_source:${fn}` } }) };
    },
  };
}

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};
const cents = (n: number) => Math.round(n * 100) / 100;

type Joined = { customers?: { name?: string | null } | null };

/** A sale with its customer's name and the part given on credit. */
export function saleRow(r: { id: string; created_at: string; total: unknown; paid: unknown } & Joined): ReportRow {
  const total = num(r.total);
  const paid = num(r.paid);
  return {
    id: r.id,
    created_at: r.created_at,
    customer: r.customers?.name ?? "",
    total,
    paid,
    credit: cents(Math.max(total - paid, 0)),
  };
}

/** A repayment (a payment not tied to a sale) with the customer's name. */
export function repaymentRow(
  r: { id: string; created_at: string; amount: unknown; method: string; reference?: string | null } & Joined,
  methodLabel: (method: string) => string = (m) => m,
): ReportRow {
  return {
    id: r.id,
    created_at: r.created_at,
    customer: r.customers?.name ?? "",
    amount: num(r.amount),
    method: methodLabel(r.method),
    reference: r.reference ?? "",
  };
}

/** One shop's ageing line, keyed by customer for the table. */
export function ageingRow(r: {
  customer_id: string | null;
  name: string | null;
  phone: string | null;
  total: unknown;
  days_0_30: unknown;
  days_31_60: unknown;
  days_over_60: unknown;
  oldest_days: unknown;
}): ReportRow {
  return {
    id: r.customer_id ?? r.name ?? "",
    name: r.name ?? "",
    phone: r.phone ?? "",
    total: num(r.total),
    days_0_30: num(r.days_0_30),
    days_31_60: num(r.days_31_60),
    days_over_60: num(r.days_over_60),
    oldest_days: num(r.oldest_days),
  };
}

const L = (en: string, am: string, om: string) => ({ en, am, om });
const DATE = { key: "created_at", label: L("Date", "ቀን", "Guyyaa"), eth_date: true } as const;
const CUSTOMER = { key: "customer", label: L("Shop", "ሱቅ", "Suuqii") } as const;

export const SOURCES = { sales: "wh:sales", repayments: "wh:repayments", ageing: "wh:ageing" } as const;

export const WHOLESALE_REPORTS: ReportDef[] = [
  {
    key: "sales",
    title: L("Sales", "ሽያጭ", "Gurgurtaa"),
    source: { view: SOURCES.sales },
    tiles: [
      { key: "total", label: L("Sold", "የተሸጠ", "Kan gurgurame"), agg: "sum", col: "total", money: true },
      { key: "credit", label: L("Given on credit", "በዱቤ የተሰጠ", "Liqaan kenname"), agg: "sum", col: "credit", money: true },
      { key: "paid", label: L("Paid at sale", "በሽያጩ የተከፈለ", "Yeroo gurgurtaa kaffalame"), agg: "sum", col: "paid", money: true },
      { key: "count", label: L("Sales", "ሽያጮች", "Gurgurtaalee"), agg: "count" },
    ],
    columns: [
      DATE,
      CUSTOMER,
      { key: "total", label: L("Total", "ጠቅላላ", "Waliigala"), money: true },
      { key: "paid", label: L("Paid", "የተከፈለ", "Kaffalame"), money: true },
      { key: "credit", label: L("Credit", "ዱቤ", "Liqaa"), money: true },
    ],
  },
  {
    key: "repayments",
    title: L("Repayments", "የተመለሰ ዱቤ", "Liqaa deebi'e"),
    source: { view: SOURCES.repayments },
    tiles: [
      { key: "amount", label: L("Collected", "የተሰበሰበ", "Kan walitti qabame"), agg: "sum", col: "amount", money: true },
      { key: "count", label: L("Repayments", "ክፍያዎች", "Kaffaltii"), agg: "count" },
      { key: "avg", label: L("Average", "አማካይ", "Giddugaleessa"), agg: "avg", col: "amount", money: true },
    ],
    columns: [
      DATE,
      CUSTOMER,
      { key: "amount", label: L("Amount", "መጠን", "Hanga"), money: true },
      { key: "method", label: L("Method", "መንገድ", "Mala") },
      { key: "reference", label: L("Reference", "ማጣቀሻ", "Ragaa") },
    ],
  },
  {
    key: "ageing",
    title: L("Who owes, by age", "ዱቤ በዕድሜ", "Liqaa umuriin"),
    source: { view: SOURCES.ageing },
    tiles: [
      { key: "total", label: L("Owed now", "አሁን ያለ ዱቤ", "Liqaa amma"), agg: "sum", col: "total", money: true },
      { key: "days_over_60", label: L("Over 60 days", "ከ60 ቀን በላይ", "Guyyaa 60 ol"), agg: "sum", col: "days_over_60", money: true },
      { key: "days_31_60", label: L("31-60 days", "31-60 ቀን", "Guyyaa 31-60"), agg: "sum", col: "days_31_60", money: true },
      { key: "count", label: L("Shops owing", "ዱቤ ያለባቸው ሱቆች", "Suuqota liqaa qaban"), agg: "count" },
    ],
    columns: [
      { key: "name", label: L("Shop", "ሱቅ", "Suuqii") },
      { key: "phone", label: L("Phone", "ስልክ", "Bilbila") },
      { key: "total", label: L("Owed", "ዱቤ", "Liqaa"), money: true },
      { key: "days_0_30", label: L("0-30 days", "0-30 ቀን", "Guyyaa 0-30"), money: true },
      { key: "days_31_60", label: L("31-60 days", "31-60 ቀን", "Guyyaa 31-60"), money: true },
      { key: "days_over_60", label: L("Over 60", "ከ60 በላይ", "60 ol"), money: true },
      { key: "oldest_days", label: L("Oldest (days)", "የቆየው (ቀን)", "Kan durii (guyyaa)") },
    ],
  },
];
