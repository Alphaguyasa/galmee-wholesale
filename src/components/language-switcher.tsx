"use client";

import { useLocale, useTranslations } from "next-intl";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type AppLocale } from "@/i18n/routing";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({ inverse = false }: { inverse?: boolean }) {
  const t = useTranslations("Language");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="sr-only">{t("label")}</span>
      <select
        className={cn(
          "h-12 min-w-12 rounded-md border px-2 text-sm focus-visible:outline-2",
          inverse
            ? "border-white/40 bg-tarp text-white focus-visible:outline-white"
            : "bg-background focus-visible:outline-ring",
        )}
        value={locale}
        disabled={isPending}
        onChange={(e) => {
          const next = e.target.value as AppLocale;
          startTransition(() => router.replace(pathname, { locale: next }));
        }}
      >
        {routing.locales.map((l) => (
          <option key={l} value={l}>
            {t(l)}
          </option>
        ))}
      </select>
    </label>
  );
}
