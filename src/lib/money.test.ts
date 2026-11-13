import { describe, expect, it } from "vitest";
import { formatBirr } from "./money";

describe("formatBirr", () => {
  it("uses ብር in Amharic and ETB otherwise, with two decimals", () => {
    expect(formatBirr(1250, "am")).toBe("ብር 1,250.00");
    expect(formatBirr(1250.5, "en")).toBe("1,250.50 ETB");
    expect(formatBirr(0, "om")).toBe("0.00 ETB");
  });
});

describe("formatQty", () => {
  it("drops trailing zeros and groups thousands", async () => {
    const { formatQty } = await import("./money");
    expect(formatQty(1200)).toBe("1,200");
    expect(formatQty(2.5)).toBe("2.5");
    expect(formatQty(0)).toBe("0");
  });
});

describe("formatAmount", () => {
  it("shows two decimals and no currency", async () => {
    const { formatAmount } = await import("./money");
    expect(formatAmount(3800)).toBe("3,800.00");
  });
});
