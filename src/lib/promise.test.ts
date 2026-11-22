import { describe, expect, it } from "vitest";
import { isAllowedPromiseDay, quickPromiseDays, toPromiseState } from "./promise";

describe("promise helpers", () => {
  it("offers tomorrow, 3 days and a week, across a month end", () => {
    expect(quickPromiseDays("2026-11-29")).toEqual([
      { days: 1, day: "2026-11-30" },
      { days: 3, day: "2026-12-02" },
      { days: 7, day: "2026-12-06" },
    ]);
  });

  it("allows today up to 90 days ahead only", () => {
    expect(isAllowedPromiseDay("2026-11-22", "2026-11-22")).toBe(true);
    expect(isAllowedPromiseDay("2027-02-20", "2026-11-22")).toBe(true);
    expect(isAllowedPromiseDay("2027-02-21", "2026-11-22")).toBe(false);
    expect(isAllowedPromiseDay("2026-11-21", "2026-11-22")).toBe(false);
  });

  it("falls back to waiting for an unknown state", () => {
    expect(toPromiseState("broken")).toBe("broken");
    expect(toPromiseState("something")).toBe("waiting");
    expect(toPromiseState(null)).toBe("waiting");
  });
});
