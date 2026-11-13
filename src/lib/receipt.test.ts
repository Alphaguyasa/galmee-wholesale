import { describe, expect, it } from "vitest";
import { receiptRef } from "./receipt";

describe("receiptRef", () => {
  it("takes the first 8 hex digits in upper case", () => {
    expect(receiptRef("3f2a9c1e-77b0-4d2e-9a10-0c5e8f1b2d3a")).toBe("3F2A9C1E");
  });
  it("is stable for the same id", () => {
    const id = "a1b2c3d4-0000-4000-8000-000000000000";
    expect(receiptRef(id)).toBe(receiptRef(id));
  });
});
