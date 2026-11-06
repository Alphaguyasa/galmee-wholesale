"use client";

import { useSyncExternalStore } from "react";
import { formatEthiopianDate, type Locale } from "@/lib/ethiopian-calendar";

const subscribe = () => () => {};

/**
 * Today's Ethiopian date, computed on the device so the static page
 * never shows the build date.
 */
export function TodayEthiopian({ locale }: { locale: Locale }) {
  const today = useSyncExternalStore(
    subscribe,
    () => formatEthiopianDate(new Date(), locale),
    () => null,
  );
  return <time suppressHydrationWarning>{today ?? "…"}</time>;
}
