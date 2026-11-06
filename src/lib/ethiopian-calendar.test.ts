import { describe, expect, it } from "vitest";
import {
  ethiopianMonthRange,
  ethiopianToGregorian,
  formatEthiopianDate,
  formatEthiopianShort,
  gregorianToEthiopian,
  isEthiopianLeapYear,
  toEthiopian,
} from "./ethiopian-calendar";

describe("gregorianToEthiopian", () => {
  it.each([
    // [gregorian y, m, d, ethiopian y, m, d]
    [2023, 9, 12, 2016, 1, 1], // New Year after Pagume 6 (2015 was leap)
    [2024, 9, 11, 2017, 1, 1],
    [2025, 1, 7, 2017, 4, 29], // Genna
    [2026, 9, 11, 2019, 1, 1],
    [2026, 11, 6, 2019, 2, 27],
    [2023, 9, 11, 2015, 13, 6], // Pagume 6 in a leap year
    [2000, 1, 1, 1992, 4, 22],
  ])("%i-%i-%i -> %i/%i/%i", (gy, gm, gd, ey, em, ed) => {
    expect(gregorianToEthiopian(gy, gm, gd)).toEqual({ year: ey, month: em, day: ed });
  });
});

describe("ethiopianToGregorian", () => {
  it("round-trips every day across several years", () => {
    const start = Date.UTC(2020, 0, 1);
    for (let i = 0; i < 365 * 6; i++) {
      const d = new Date(start + i * 86_400_000);
      const g = { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
      const e = gregorianToEthiopian(g.year, g.month, g.day);
      expect(ethiopianToGregorian(e)).toEqual(g);
    }
  });

  it("rejects invalid dates", () => {
    expect(() => ethiopianToGregorian({ year: 2017, month: 13, day: 6 })).toThrow();
    expect(() => ethiopianToGregorian({ year: 2017, month: 2, day: 31 })).toThrow();
  });
});

describe("isEthiopianLeapYear", () => {
  it("is true for years before a Gregorian leap year", () => {
    expect(isEthiopianLeapYear(2015)).toBe(true);
    expect(isEthiopianLeapYear(2016)).toBe(false);
    expect(isEthiopianLeapYear(2019)).toBe(true);
  });
});

describe("toEthiopian (Addis Ababa day boundary)", () => {
  it("uses UTC+3: 22:00 UTC is already the next day in Addis", () => {
    expect(toEthiopian("2026-11-06T20:59:00Z")).toEqual({ year: 2019, month: 2, day: 27 });
    expect(toEthiopian("2026-11-06T21:00:00Z")).toEqual({ year: 2019, month: 2, day: 28 });
  });

  it("treats a plain DB date as a calendar date", () => {
    expect(toEthiopian("2026-11-06")).toEqual({ year: 2019, month: 2, day: 27 });
  });
});

describe("formatting", () => {
  it("formats in all three languages", () => {
    expect(formatEthiopianDate("2026-11-06", "am")).toBe("ጥቅምት 27, 2019 ዓ.ም.");
    expect(formatEthiopianDate("2026-11-06", "en")).toBe("Tikimt 27, 2019 E.C.");
    expect(formatEthiopianDate("2026-11-06", "om", { era: false })).toBe("Onkoloolessa 27, 2019");
    expect(formatEthiopianShort("2026-11-06")).toBe("27/2/2019");
  });

  it("gives the Gregorian range of an Ethiopian month", () => {
    expect(ethiopianMonthRange("2026-11-06")).toEqual({ start: "2026-10-11", end: "2026-11-09" });
    expect(ethiopianMonthRange("2027-09-08")).toEqual({ start: "2027-09-06", end: "2027-09-11" });
  });
});
