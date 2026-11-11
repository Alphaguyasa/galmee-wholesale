import { describe, expect, it } from "vitest";
import { creditSaleSchema } from "./validation";

const base = {
  customer: "6f1c2d3e-4b5a-4c6d-8e7f-901234567890",
  clientRef: "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c3d",
  lines: JSON.stringify([{ item: "11111111-2222-4333-8444-555555555555", qty: 2 }]),
  paid: "",
  method: "cash",
  due: "",
  override: "",
  reason: "",
};

describe("creditSaleSchema", () => {
  it("accepts a sale with nothing paid and no override", () => {
    const r = creditSaleSchema.parse(base);
    expect(r.paid).toBe(0);
    expect(r.override).toBe(false);
    expect(r.due).toBeUndefined();
    expect(r.lines).toEqual([{ item: "11111111-2222-4333-8444-555555555555", qty: 2 }]);
  });

  it("reads the override checkbox and trims the reason", () => {
    const r = creditSaleSchema.parse({ ...base, override: "on", reason: "  pays Friday ", paid: "150", due: "2026-11-20" });
    expect(r).toMatchObject({ override: true, reason: "pays Friday", paid: 150, due: "2026-11-20" });
  });

  it("rejects empty, malformed or zero-quantity lines", () => {
    for (const lines of ["[]", "not json", JSON.stringify([{ item: "x", qty: 1 }]), JSON.stringify([{ item: base.customer, qty: 0 }])]) {
      expect(creditSaleSchema.safeParse({ ...base, lines }).success).toBe(false);
    }
  });

  it("rejects a negative payment and an unknown method", () => {
    expect(creditSaleSchema.safeParse({ ...base, paid: "-5" }).success).toBe(false);
    expect(creditSaleSchema.safeParse({ ...base, method: "chapa" }).success).toBe(false);
  });
});
