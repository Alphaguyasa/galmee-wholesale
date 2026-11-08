import { describe, expect, it } from "vitest";
import am from "../../messages/am.json";
import en from "../../messages/en.json";
import om from "../../messages/om.json";

function keys(value: object, prefix = ""): string[] {
  return Object.entries(value).flatMap(([k, v]) =>
    typeof v === "object" && v !== null ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe("translations", () => {
  it("have the same keys in every language", () => {
    expect(keys(am).sort()).toEqual(keys(en).sort());
    expect(keys(om).sort()).toEqual(keys(en).sort());
  });
});
