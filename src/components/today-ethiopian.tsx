"use client";

import { useSyncExternalStore } from "react";
import { formatEthiopianDate, type Locale } from "@/lib/ethiopian-calendar";

const subscribe = () => () => {};
/** Today's Gregorian date in Addis Ababa as YYYY-MM-DD (stable string for useSyncExternalStore). */
const getToday = () =>
  new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);

/**
 * Today's Ethiopian date, computed on the device so the static page
 * never shows the build date.
 */
export function TodayEthiopian({ locale }: { locale: Locale }) {
  const today = useSyncExternalStore(subscribe, getToday, () => null);
  return (
    <time dateTime={today ?? undefined} suppressHydrationWarning>
      {today ? formatEthiopianDate(today, locale) : "…"}
    </time>
  );
}
