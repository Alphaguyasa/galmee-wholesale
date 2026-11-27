import { describe, expect, it } from "vitest";
import { layoutText, receiptModel, renderTelegramText } from "@/lib/galmee/receipt";
import { addisGregDay, creditSaleReceiptData, repaymentReceiptData } from "./wholesale-receipt";

const tenant = { name: "Abebe Wholesale", phone: null };

const sale = {
  ref: "3F2A9C1E",
  createdAt: "2026-11-26T22:30:00Z",
  total: 2350,
  paid: 0,
  method: null,
  customerName: "Kebede Shop",
  lines: [
    { name: "Sugar 50 kg", unit: "sack", qty: 2, price: 1000 },
    { name: "Oil 5 L", unit: "jerrycan", qty: 1.5, price: 233.333 },
  ],
  balanceAfter: 4100,
};

const repayment = {
  ref: "A1B2C3D4",
  createdAt: "2026-11-27T06:00:00Z",
  amount: 1500,
  method: "telebirr",
  reference: "TX778",
  customerName: "Kebede Shop",
  balanceAfter: 2600,
};

const totalsOf = (m: ReturnType<typeof receiptModel>) => Object.fromEntries(m.totals.map((t) => [t.label, t.value]));

describe("addisGregDay", () => {
  it("uses the Addis Ababa day, not UTC", () => {
    expect(addisGregDay("2026-11-26T22:30:00Z")).toBe("2026-11-27");
    expect(addisGregDay("2026-11-26T20:59:00Z")).toBe("2026-11-26");
  });
});

describe("creditSaleReceiptData", () => {
  it("prints a sale with nothing paid as credit, with what the shop owes after it", () => {
    const m = receiptModel(creditSaleReceiptData(sale, { tenant, lang: "en", ethDate: "18 Hidar 2019" }));
    const t = totalsOf(m);
    expect(m.title).toBe("Sales receipt");
    expect(t.Total).toBe("2,350.00 ETB");
    expect(t.Paid).toBe("0.00");
    expect(t.Method).toBe("Credit");
    expect(t["Balance owed"]).toBe("4,100.00 ETB");
    expect(m.lines).toHaveLength(2);
    expect(m.meta.find((x) => x.label === "Receipt no.")?.value).toBe("3F2A9C1E");
  });

  it("keeps the paid method when part was paid, and prints no change on a credit sale", () => {
    const d = creditSaleReceiptData({ ...sale, paid: 500, method: "cash" }, { tenant, lang: "am", ethDate: "ኅዳር 18 2019" });
    const m = receiptModel(d);
    expect(m.title).toBe("የሽያጭ ደረሰኝ");
    expect(totalsOf(m)["የክፍያ ዘዴ"]).toBe("ጥሬ ገንዘብ");
    expect(m.totals.some((x) => x.label === "መልስ")).toBe(false);
  });

  it("leaves the balance out when the statement row is missing", () => {
    const m = receiptModel(creditSaleReceiptData({ ...sale, balanceAfter: null }, { tenant, lang: "en", ethDate: "x" }));
    expect(m.totals.some((x) => x.label === "Balance owed")).toBe(false);
  });

  it("puts the pay-back day in the footer and the paper and Telegram text agree", () => {
    const d = creditSaleReceiptData(sale, { tenant, lang: "en", ethDate: "x", footer: "Pay back by 25 Hidar 2019" });
    expect(receiptModel(d).footer[0]).toBe("Pay back by 25 Hidar 2019");
    const text = renderTelegramText(d);
    expect(text).toContain("2,350.00");
    expect(text).toContain("4,100.00");
    for (const line of layoutText(d, 58)) expect(line.length).toBeLessThanOrEqual(32);
  });
});

describe("repaymentReceiptData", () => {
  it("shows the repayment, its method and the balance after it from the statement", () => {
    const d = repaymentReceiptData(repayment, { tenant, lang: "en", ethDate: "18 Hidar 2019", lineLabel: "Paid back" });
    const m = receiptModel(d);
    const t = totalsOf(m);
    expect(m.title).toBe("Credit repayment receipt");
    expect(m.lines[0].name).toBe("Paid back (TX778)");
    expect(t.Total).toBe("1,500.00 ETB");
    expect(t.Method).toBe("Telebirr");
    expect(t["Balance owed"]).toBe("2,600.00 ETB");
  });

  it("prints a zero balance when the shop is fully paid", () => {
    const d = repaymentReceiptData({ ...repayment, reference: null, balanceAfter: 0 }, { tenant, lang: "om", ethDate: "x", lineLabel: "Deebifame" });
    const m = receiptModel(d);
    expect(m.title).toBe("Nagahee kaffaltii liqii");
    expect(m.lines[0].name).toBe("Deebifame");
    expect(totalsOf(m)["Liqii hafe"]).toBe("0.00 ETB");
  });
});
