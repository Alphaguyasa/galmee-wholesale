import { describe, expect, it } from "vitest";
import { promiseSchema } from "./validation";

const customer = "6f1c2f3e-8a4b-4c1d-9e2f-0a1b2c3d4e5f";

describe("promiseSchema", () => {
  it("reads an empty amount as 'everything owed'", () => {
    const r = promiseSchema.parse({ customer, promisedOn: "2026-11-25", amount: "", note: "  " });
    expect(r).toEqual({ customer, promisedOn: "2026-11-25", amount: null, note: null });
  });

  it("accepts an amount written with thousands commas", () => {
    expect(promiseSchema.parse({ customer, promisedOn: "2026-11-25", amount: "1,500", note: "" }).amount).toBe(1500);
  });

  it("refuses zero, words and a bad date", () => {
    expect(promiseSchema.safeParse({ customer, promisedOn: "2026-11-25", amount: "0", note: "" }).success).toBe(false);
    expect(promiseSchema.safeParse({ customer, promisedOn: "2026-11-25", amount: "abc", note: "" }).success).toBe(false);
    expect(promiseSchema.safeParse({ customer, promisedOn: "25/11/2026", amount: "", note: "" }).success).toBe(false);
  });
});
