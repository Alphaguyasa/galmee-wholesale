/**
 * Ethiopian (Ge'ez) calendar helpers.
 *
 * The database always stores Gregorian dates/timestamps. The UI shows
 * Ethiopian dates. Conversion goes through the Julian Day Number (JDN).
 * Day boundaries follow Addis Ababa time (UTC+3, no DST).
 */

export type EthiopianDate = {
  year: number;
  /** 1..13 (13 = Pagume) */
  month: number;
  /** 1..30 (Pagume: 1..5, or 1..6 in a leap year) */
  day: number;
};

export type Locale = "am" | "om" | "en";

/** JDN offset for the Amete Mihret era (Ethiopian year 1). */
const JD_EPOCH_OFFSET = 1723856;

const ADDIS_OFFSET_MS = 3 * 60 * 60 * 1000;

export const ETHIOPIAN_MONTHS: Record<Locale, readonly string[]> = {
  am: [
    "መስከረም",
    "ጥቅምት",
    "ኅዳር",
    "ታኅሣሥ",
    "ጥር",
    "የካቲት",
    "መጋቢት",
    "ሚያዝያ",
    "ግንቦት",
    "ሰኔ",
    "ሐምሌ",
    "ነሐሴ",
    "ጳጉሜ",
  ],
  om: [
    "Fulbaana",
    "Onkoloolessa",
    "Sadaasa",
    "Muddee",
    "Amajjii",
    "Guraandhala",
    "Bitootessa",
    "Ebla",
    "Caamsaa",
    "Waxabajjii",
    "Adoolessa",
    "Hagayya",
    "Qaammee",
  ],
  en: [
    "Meskerem",
    "Tikimt",
    "Hidar",
    "Tahsas",
    "Tir",
    "Yekatit",
    "Megabit",
    "Miyazya",
    "Ginbot",
    "Sene",
    "Hamle",
    "Nehase",
    "Pagume",
  ],
};

/** Ethiopian-calendar year suffix ("E.C." / "ዓ.ም." / "A.L.I."). */
const ERA_SUFFIX: Record<Locale, string> = {
  am: "ዓ.ም.",
  om: "A.L.I.",
  en: "E.C.",
};

function gregorianToJdn(year: number, month: number, day: number): number {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

function jdnToGregorian(jdn: number): { year: number; month: number; day: number } {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return {
    day: e - Math.floor((153 * m + 2) / 5) + 1,
    month: m + 3 - 12 * Math.floor(m / 10),
    year: 100 * b + d - 4800 + Math.floor(m / 10),
  };
}

function ethiopianToJdn({ year, month, day }: EthiopianDate): number {
  return (
    JD_EPOCH_OFFSET +
    365 +
    365 * (year - 1) +
    Math.floor(year / 4) +
    30 * month +
    day -
    31
  );
}

function jdnToEthiopian(jdn: number): EthiopianDate {
  const r = (((jdn - JD_EPOCH_OFFSET) % 1461) + 1461) % 1461;
  const n = (r % 365) + 365 * Math.floor(r / 1460);
  const year =
    4 * Math.floor((jdn - JD_EPOCH_OFFSET) / 1461) +
    Math.floor(r / 365) -
    Math.floor(r / 1460);
  return { year, month: Math.floor(n / 30) + 1, day: (n % 30) + 1 };
}

/** True when the Ethiopian year has a 6-day Pagume. */
export function isEthiopianLeapYear(year: number): boolean {
  return year % 4 === 3;
}

/** Convert a Gregorian calendar date (y, m 1..12, d) to Ethiopian. */
export function gregorianToEthiopian(
  year: number,
  month: number,
  day: number,
): EthiopianDate {
  return jdnToEthiopian(gregorianToJdn(year, month, day));
}

/** Convert an Ethiopian date to a Gregorian calendar date. */
export function ethiopianToGregorian(date: EthiopianDate): {
  year: number;
  month: number;
  day: number;
} {
  const maxDay = date.month === 13 ? (isEthiopianLeapYear(date.year) ? 6 : 5) : 30;
  if (date.month < 1 || date.month > 13 || date.day < 1 || date.day > maxDay) {
    throw new RangeError(`Invalid Ethiopian date ${date.year}-${date.month}-${date.day}`);
  }
  return jdnToGregorian(ethiopianToJdn(date));
}

/** Calendar date of an instant in Addis Ababa time. */
function addisCalendarDate(input: Date | string | number): {
  year: number;
  month: number;
  day: number;
} {
  const d = typeof input === "string" && /^\d{4}-\d{2}-\d{2}$/.test(input)
    ? // A plain DB `date` ("2026-11-06") is already a calendar date.
      new Date(`${input}T00:00:00Z`)
    : new Date(new Date(input).getTime() + ADDIS_OFFSET_MS);
  if (Number.isNaN(d.getTime())) throw new RangeError(`Invalid date: ${String(input)}`);
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** Ethiopian date for a JS Date, ISO timestamp or DB `date` string. */
export function toEthiopian(input: Date | string | number): EthiopianDate {
  const g = addisCalendarDate(input);
  return gregorianToEthiopian(g.year, g.month, g.day);
}

/** e.g. "ጥቅምት 27, 2019 ዓ.ም." / "Tikimt 27, 2019 E.C." */
export function formatEthiopianDate(
  input: Date | string | number,
  locale: Locale = "am",
  options: { era?: boolean } = {},
): string {
  const { year, month, day } = toEthiopian(input);
  const name = ETHIOPIAN_MONTHS[locale][month - 1];
  const base = `${name} ${day}, ${year}`;
  return options.era === false ? base : `${base} ${ERA_SUFFIX[locale]}`;
}

/** Short numeric form "27/2/2019" (day/month/year), common on receipts. */
export function formatEthiopianShort(input: Date | string | number): string {
  const { year, month, day } = toEthiopian(input);
  return `${day}/${month}/${year}`;
}

/** First and last Gregorian day (YYYY-MM-DD) of the Ethiopian month containing `input`. */
export function ethiopianMonthRange(input: Date | string | number = new Date()): {
  start: string;
  end: string;
} {
  const { year, month } = toEthiopian(input);
  const lastDay = month === 13 ? (isEthiopianLeapYear(year) ? 6 : 5) : 30;
  const fmt = (g: { year: number; month: number; day: number }) =>
    `${g.year}-${String(g.month).padStart(2, "0")}-${String(g.day).padStart(2, "0")}`;
  return {
    start: fmt(ethiopianToGregorian({ year, month, day: 1 })),
    end: fmt(ethiopianToGregorian({ year, month, day: lastDay })),
  };
}
