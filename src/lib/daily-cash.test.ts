import { describe, expect, it } from "vitest";
import { addisToday, isIsoDay, shiftIsoDay, summariseDailyCash, type CashRowDTO } from "./daily-cash";

const row = (method: CashRowDTO["method"], p: Partial<CashRowDTO> = {}): CashRowDTO => ({
  method,
  salesCount: 0,
  salesTotal: 0,
  salesCollected: 0,
  repayments: 0,
  repaymentCount: 0,
  creditGiven: 0,
  ...p,
});

describe("summariseDailyCash", () => {
  it("adds counter money and repayments, keeps cash for the drawer apart", () => {
    const s = summariseDailyCash("2026-11-16", [
      row("credit", { salesCount: 1, salesTotal: 500, creditGiven: 300 }),
      row("telebirr", { salesCount: 1, salesTotal: 300, salesCollected: 300 }),
      row("cash", { salesCollected: 200.1, repayments: 150.2, repaymentCount: 1 }),
    ]);
    expect(s.rows.map((r) => r.method)).toEqual(["cash", "telebirr", "credit"]);
    expect(s.cashIn).toBe(350.3);
    expect(s.totalIn).toBe(650.3);
    expect(s.repaid).toBe(150.2);
    expect(s.repaymentCount).toBe(1);
    expect(s.creditGiven).toBe(300);
    expect(s.creditSales).toBe(1);
    expect(s.salesCount).toBe(2);
    expect(s.salesTotal).toBe(800);
  });

  it("is all zero on a quiet day", () => {
    const s = summariseDailyCash("2026-11-16", [row("cash"), row("credit")]);
    expect([s.totalIn, s.cashIn, s.creditGiven, s.salesCount]).toEqual([0, 0, 0, 0]);
  });
});

describe("day helpers", () => {
  it("uses the Addis Ababa day, which starts at 21:00 UTC", () => {
    expect(addisToday(new Date("2026-11-16T20:59:00Z"))).toBe("2026-11-16");
    expect(addisToday(new Date("2026-11-16T21:00:00Z"))).toBe("2026-11-17");
  });

  it("checks real dates only", () => {
    expect(isIsoDay("2026-11-16")).toBe(true);
    expect(isIsoDay("2028-02-29")).toBe(true);
    expect(isIsoDay("2026-02-29")).toBe(false);
    expect(isIsoDay("2026-13-01")).toBe(false);
    expect(isIsoDay("16/11/2026")).toBe(false);
    expect(isIsoDay("1999-01-01")).toBe(false);
  });

  it("moves across month and year ends", () => {
    expect(shiftIsoDay("2026-12-31", 1)).toBe("2027-01-01");
    expect(shiftIsoDay("2026-03-01", -1)).toBe("2026-02-28");
  });
});
