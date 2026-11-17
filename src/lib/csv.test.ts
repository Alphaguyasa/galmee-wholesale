import { describe, expect, it } from "vitest";
import { addisDay, addisTime, exportFileName, isExportKind, toCsv } from "./csv";

describe("toCsv", () => {
  it("starts with a BOM and ends every line with CRLF", () => {
    expect(toCsv(["a", "b"], [[1, "x"]])).toBe("﻿a,b\r\n1,x\r\n");
  });

  it("quotes commas, quotes and line breaks", () => {
    const csv = toCsv(["n"], [['Abebe, "Big" shop'], ["line1\nline2"]]);
    expect(csv).toBe('﻿n\r\n"Abebe, ""Big"" shop"\r\n"line1\nline2"\r\n');
  });

  it("keeps Amharic text as it is", () => {
    expect(toCsv(["ስም"], [["ሱቅ ቁጥር 3"]])).toBe("﻿ስም\r\nሱቅ ቁጥር 3\r\n");
  });

  it("writes empty cells for null, undefined and non-finite numbers", () => {
    expect(toCsv(["a", "b", "c"], [[null, undefined, Number.NaN]])).toBe("﻿a,b,c\r\n,,\r\n");
  });

  it("defuses text that a spreadsheet would run as a formula", () => {
    const csv = toCsv(["n"], [["=HYPERLINK(\"x\")"], ["+251911"], ["-5"], ["@SUM(A1)"]]);
    expect(csv).toBe('﻿n\r\n"\'=HYPERLINK(""x"")"\r\n\'+251911\r\n\'-5\r\n\'@SUM(A1)\r\n');
  });

  it("leaves real negative numbers alone", () => {
    expect(toCsv(["n"], [[-5]])).toBe("﻿n\r\n-5\r\n");
  });
});

describe("Addis Ababa day and time", () => {
  it("moves a late-evening UTC time to the next Addis day", () => {
    expect(addisDay("2026-11-16T22:30:00Z")).toBe("2026-11-17");
    expect(addisTime("2026-11-16T22:30:00Z")).toBe("01:30");
  });
  it("keeps a morning UTC time on the same day", () => {
    expect(addisDay("2026-11-17T06:05:00+00:00")).toBe("2026-11-17");
    expect(addisTime("2026-11-17T06:05:00+00:00")).toBe("09:05");
  });
});

describe("export kinds", () => {
  it("accepts only the known kinds", () => {
    expect(isExportKind("customers")).toBe(true);
    expect(isExportKind("profiles")).toBe(false);
    expect(isExportKind("../etc")).toBe(false);
  });
  it("builds an ASCII file name", () => {
    expect(exportFileName("ledger", "2026-11-17")).toBe("galmee-wholesale-ledger-2026-11-17.csv");
  });
});
