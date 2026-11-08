import { describe, expect, it } from "vitest";
import { formatBirr } from "./money";

describe("formatBirr", () => {
  it("uses ብር in Amharic and ETB otherwise, with two decimals", () => {
    expect(formatBirr(1250, "am")).toBe("ብር 1,250.00");
    expect(formatBirr(1250.5, "en")).toBe("1,250.50 ETB");
    expect(formatBirr(0, "om")).toBe("0.00 ETB");
  });
});
