import { getTranslations, setRequestLocale } from "next-intl/server";
import { Clock } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { formatBirr } from "@/lib/money";
import { getAgeingTotals, listAgeing } from "@/server/dal/customers";

export default async function OverduePage({ params }: PageProps<"/[locale]/overdue">) {
  const { locale: rawLocale } = await params;
  setRequestLocale(rawLocale);
  const locale = rawLocale as AppLocale;

  const [t, rows, totals] = await Promise.all([getTranslations("Overdue"), listAgeing(), getAgeingTotals()]);

  const buckets = [
    { key: "d0", label: t("bucket0"), total: totals.days0To30 },
    { key: "d31", label: t("bucket31"), total: totals.days31To60 },
    { key: "d60", label: t("bucket60"), total: totals.daysOver60 },
  ];

  return (
    <div>
      <div className="px-4 pt-4 md:px-0 md:pt-0">
        <h1 className="text-[1.375rem] font-bold">{t("title")}</h1>
      </div>

      <dl className="mt-3 grid grid-cols-3 divide-x divide-border border-y">
        {buckets.map((b) => (
          <div key={b.key} className="grid gap-1 p-3">
            <dt className="text-sm">{b.label}</dt>
            <dd className="money text-sm break-all">{formatBirr(b.total, locale)}</dd>
          </div>
        ))}
      </dl>

      {rows.length === 0 ? (
        <p className="px-4 py-8 md:px-0">{t("empty")}</p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/customers/${r.id}`} className="grid gap-1 px-4 py-3 hover:bg-accent md:px-2">
                <span className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-bold">{r.name}</span>
                  <span className="money text-owed">{formatBirr(r.total, locale)}</span>
                </span>
                <span className="flex items-center gap-1.5 text-sm text-late">
                  <Clock className="size-4 shrink-0" aria-hidden />
                  {t("oldest", { days: r.oldestDays })}
                </span>
                <span className="grid grid-cols-3 gap-2 text-sm text-muted-foreground">
                  <span>
                    <span className="block">{t("bucket0")}</span>
                    <span className="money">{formatBirr(r.days0To30, locale)}</span>
                  </span>
                  <span>
                    <span className="block">{t("bucket31")}</span>
                    <span className="money">{formatBirr(r.days31To60, locale)}</span>
                  </span>
                  <span>
                    <span className="block">{t("bucket60")}</span>
                    <span className="money">{formatBirr(r.daysOver60, locale)}</span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
