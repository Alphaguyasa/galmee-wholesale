/** Payment methods in the order the cash report lists them. `credit` is the unpaid part of sales. */
export const CASH_METHODS = ["cash", "telebirr", "cbe_birr", "bank", "chapa", "other", "credit"] as const;
export type CashMethod = (typeof CASH_METHODS)[number];

export type CashRowDTO = {
  method: CashMethod;
  salesCount: number;
  salesTotal: number;
  salesCollected: number;
  repayments: number;
  repaymentCount: number;
  creditGiven: number;
};

export type DailyCashDTO = {
  day: string;
  rows: CashRowDTO[];
  /** Money that actually came in (paid at the counter + repayments), all methods. */
  totalIn: number;
  /** Cash that should be in the drawer: cash paid at the counter + cash repayments. */
  cashIn: number;
  /** What shops paid back on their debts, all methods. */
  repaid: number;
  repaymentCount: number;
  /** The unpaid part of the day's sales: new debt on the shops' books. */
  creditGiven: number;
  creditSales: number;
  salesCount: number;
  salesTotal: number;
};

const isMethod = (m: string): m is CashMethod => (CASH_METHODS as readonly string[]).includes(m);
const round2 = (n: number) => Math.round(n * 100) / 100;

/** Summarises wh_daily_cash rows; kept pure so it can be tested without a database. */
export function summariseDailyCash(day: string, rows: CashRowDTO[]): DailyCashDTO {
  const sorted = rows
    .filter((r) => isMethod(r.method))
    .sort((a, b) => CASH_METHODS.indexOf(a.method) - CASH_METHODS.indexOf(b.method));
  const sum = (pick: (r: CashRowDTO) => number) => sorted.reduce((t, r) => t + pick(r), 0);
  const cash = sorted.find((r) => r.method === "cash");
  const credit = sorted.find((r) => r.method === "credit");
  return {
    day,
    rows: sorted,
    totalIn: round2(sum((r) => r.salesCollected + r.repayments)),
    cashIn: round2((cash?.salesCollected ?? 0) + (cash?.repayments ?? 0)),
    repaid: round2(sum((r) => r.repayments)),
    repaymentCount: sum((r) => r.repaymentCount),
    creditGiven: round2(sum((r) => r.creditGiven)),
    creditSales: credit?.salesCount ?? 0,
    salesCount: sum((r) => r.salesCount),
    salesTotal: round2(sum((r) => r.salesTotal)),
  };
}

const ISO_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Today's Gregorian date in Addis Ababa (UTC+3) as 'YYYY-MM-DD'. */
export function addisToday(now: Date = new Date()): string {
  return new Date(now.getTime() + 3 * 3_600_000).toISOString().slice(0, 10);
}

/** True for a real calendar date written as 'YYYY-MM-DD' between 2000 and 2100. */
export function isIsoDay(input: string): boolean {
  const m = ISO_DAY.exec(input);
  if (!m || +m[1] < 2000 || +m[1] > 2100) return false;
  const d = new Date(`${input}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === input;
}

/** 'YYYY-MM-DD' moved by `days` (negative goes back). */
export function shiftIsoDay(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}
