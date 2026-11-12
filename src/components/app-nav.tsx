"use client";

import { useLocale, useTranslations } from "next-intl";
import { Boxes, CalendarClock, ListOrdered } from "lucide-react";
import { BottomNav } from "@/components/galmee/bottom-nav";

const ITEMS = [
  { href: "/customers", key: "customers", icon: ListOrdered },
  { href: "/overdue", key: "overdue", icon: CalendarClock },
  { href: "/items", key: "items", icon: Boxes },
] as const;

/**
 * Wholesale's three destinations in the shared Galmee nav. Routes carry the
 * language prefix (/am, /om, /en), so the hrefs include it: the links stay in
 * the chosen language and the active tab matches the full path.
 */
export function AppNav({ variant }: { variant: "bottom" | "side" }) {
  const t = useTranslations("Nav");
  const locale = useLocale();
  return (
    <BottomNav
      variant={variant}
      menuLabel={t("menu")}
      items={ITEMS.map(({ href, key, icon }) => ({ href: `/${locale}${href}`, label: t(key), icon }))}
    />
  );
}
