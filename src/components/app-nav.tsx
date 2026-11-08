"use client";

import { useTranslations } from "next-intl";
import { CalendarClock, ListOrdered } from "lucide-react";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/customers", key: "customers", icon: ListOrdered },
  { href: "/overdue", key: "overdue", icon: CalendarClock },
] as const;

/** Bottom tab bar on phones, vertical list in the desktop sidebar. */
export function AppNav({ variant }: { variant: "bottom" | "side" }) {
  const pathname = usePathname();
  const t = useTranslations("Nav");

  return (
    <nav
      aria-label={t("menu")}
      className={cn(
        variant === "bottom"
          ? "fixed inset-x-0 bottom-0 z-40 grid auto-cols-fr grid-flow-col border-t bg-card pb-[env(safe-area-inset-bottom)] md:hidden print:hidden"
          : "hidden flex-col gap-1 md:flex",
      )}
    >
      {ITEMS.map(({ href, key, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              variant === "bottom"
                ? "flex h-16 flex-col items-center justify-center gap-1 text-xs"
                : "flex h-12 items-center gap-3 rounded-md px-3",
              variant === "bottom" && (active ? "font-bold text-tarp" : "text-muted-foreground"),
              variant === "side" && (active ? "bg-white/15 font-bold text-white" : "text-white/85 hover:bg-white/10"),
            )}
          >
            <Icon className="size-5" aria-hidden />
            <span className="truncate">{t(key)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
