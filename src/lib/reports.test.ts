import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReportBody } from "@/components/galmee/report-screen";
import { createReportFetcher, tileValue } from "@/lib/galmee/report";
import { reportCsv } from "@/lib/galmee/report-csv";
import { resolveChoice } from "@/lib/galmee/period-picker";
import { ageingRow, repaymentRow, runnerClient, saleRow, SOURCES, WHOLESALE_REPORTS, type Range } from "./reports";

const def = (key: string) => WHOLESALE_REPORTS.find((d) => d.key === key)!;

describe("wholesale report rows", () => {
  it("splits a sale into paid and credit, with the shop name", () => {
    expect(saleRow({ id: "s1", created_at: "2026-11-25T08:00:00Z", total: "1500.00", paid: "400", customers: { name: "Abebe Shop" } })).toEqual({
      id: "s1",
      created_at: "2026-11-25T08:00:00Z",
      customer: "Abebe Shop",
      total: 1500,
      paid: 400,
      credit: 1100,
    });
    // A walk-in sale paid in full has no shop and no credit; overpaid never gives negative credit.
    expect(saleRow({ id: "s2", created_at: "x", total: 100, paid: 120, customers: null })).toMatchObject({ customer: "", credit: 0 });
  });

  it("keeps a repayment's method and reference", () => {
    expect(repaymentRow({ id: "p1", created_at: "x", amount: "250.50", method: "telebirr", reference: null, customers: { name: "Kedir" } })).toEqual({
      id: "p1",
      created_at: "x",
      customer: "Kedir",
      amount: 250.5,
      method: "telebirr",
      reference: "",
    });
    expect(repaymentRow({ id: "p2", created_at: "x", amount: 1, method: "cash" }, (m) => (m === "cash" ? "ጥሬ ገንዘብ" : m)).method).toBe("ጥሬ ገንዘብ");
  });

  it("keys ageing lines by customer and turns numeric strings into numbers", () => {
    expect(
      ageingRow({ customer_id: "c1", name: "Lemma", phone: "0911", total: "900", days_0_30: "100", days_31_60: "300", days_over_60: "500", oldest_days: 75 }),
    ).toMatchObject({ id: "c1", total: 900, days_over_60: 500, oldest_days: 75 });
  });
});

describe("runner client", () => {
  it("passes the kit's period and row cap to the named runner", async () => {
    const seen: (Range | null)[] = [];
    const client = runnerClient({
      [SOURCES.sales]: (range, limit) => {
        seen.push(range);
        return Promise.resolve({ data: [{ id: "a", limit }], error: null });
      },
    });
    const fetch = createReportFetcher(client);
    const r = await fetch(def("sales"), { from: "2026-11-24T21:00:00.000Z", to: "2026-11-25T21:00:00.000Z" });
    expect(seen).toEqual([{ from: "2026-11-24T21:00:00.000Z", to: "2026-11-25T21:00:00.000Z" }]);
    expect(r.rows).toEqual([{ id: "a", limit: 10_001 }]);
  });

  it("fails an unknown source instead of guessing", async () => {
    const fetch = createReportFetcher(runnerClient({}));
    await expect(fetch(def("sales"), { from: "a", to: "b" })).rejects.toThrow("unknown_report_source:wh:sales");
  });
});

describe("wholesale reports", () => {
  const sales = [
    saleRow({ id: "1", created_at: "2026-11-25T06:00:00Z", total: 1000, paid: 0, customers: { name: "A" } }),
    saleRow({ id: "2", created_at: "2026-11-25T07:00:00Z", total: 600, paid: 600, customers: { name: "B" } }),
    saleRow({ id: "3", created_at: "2026-11-25T08:00:00Z", total: 450.5, paid: 200, customers: { name: "C" } }),
  ];

  it("sales tiles add up to the rows", () => {
    const t = Object.fromEntries(def("sales").tiles.map((x) => [x.key, tileValue(x, sales)]));
    expect(t).toEqual({ total: 2050.5, credit: 1250.5, paid: 800, count: 3 });
  });

  it("ageing report shows the bucket columns", () => {
    const rows = [ageingRow({ customer_id: "c1", name: "Lemma Suq", phone: "0911", total: 900, days_0_30: 100, days_31_60: 300, days_over_60: 500, oldest_days: 75 })];
    const html = renderToStaticMarkup(
      createElement(ReportBody, {
        def: def("ageing"),
        lang: "en",
        period: resolveChoice({ kind: "today" }, "2026-11-26", "en"),
        load: { state: "ready", rows, tooMany: false, stale: false, fetchedAt: 0 },
      }),
    );
    for (const h of ["Shop", "Owed", "0-30 days", "31-60 days", "Over 60", "Oldest (days)"]) expect(html).toContain(h);
    expect(html).toContain("Lemma Suq");
    expect(html).toContain("500.00 ETB");
  });

  it("Amharic CSV keeps the ዱቤ header and opens in Excel", () => {
    const csv = reportCsv(sales, def("sales").columns, "am");
    expect(csv.text.charCodeAt(0)).toBe(0xfeff);
    const [header, first] = csv.text.slice(1).split("\r\n");
    expect(header.split(",")).toEqual(["ቀን", "ቀን (ዓ.ም.)", "ሱቅ", "ጠቅላላ", "የተከፈለ", "ዱቤ"]);
    expect(first.split(",").slice(-4)).toEqual(["A", "1000", "0", "1000"]);
  });

  it("every report has a title, tiles and columns in all three languages", () => {
    for (const d of WHOLESALE_REPORTS) {
      for (const s of [d.title, ...d.tiles.map((t) => t.label), ...d.columns.map((c) => c.label)]) {
        expect(Object.keys(s).sort()).toEqual(["am", "en", "om"]);
        expect(Object.values(s).every((v) => v.trim() !== "")).toBe(true);
      }
    }
  });
});
