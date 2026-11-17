import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarDays, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { EmptyState } from "@/components/galmee/empty-state";
import { ListRow, ListSheet } from "@/components/galmee/list-row";
import { MoneySummaryCard } from "@/components/galmee/money-summary-card";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { addisToday, isIsoDay, shiftIsoDay } from "@/lib/daily-cash";
import { formatEthiopianDate } from "@/lib/ethiopian-calendar";
import { formatBirr } from "@/lib/money";
import { cn } from "@/lib/utils";
import { getDailyCash } from "@/server/dal/reports";
import { getSession } from "@/server/dal/session";

// Cash and Telebirr are always listed (the owner looks for them); the rest only when used that day.
const ALWAYS_SHOWN = new Set(["cash", "telebirr"]);

export default async function DailyCashPage({ params, searchParams }: PageProps<"/[locale]/cash">) {
  const [{ locale: rawLocale }, sp] = await Promise.all([params, searchParams]);
  setRequestLocale(rawLocale);
  const locale = rawLocale as AppLocale;

  const today = addisToday();
  const day = typeof sp.day === "string" && isIsoDay(sp.day) && sp.day <= today ? sp.day : today;
  const [t, te, report, session] = await Promise.all([
    getTranslations("Cash"),
    getTranslations("Export"),
    getDailyCash(day),
    getSession(),
  ]);
  const canExport = session.profile.role === "owner" || session.profile.role === "manager";

  const isToday = day === today;
  const credit = report.rows.find((r) => r.method === "credit");
  const methodRows = report.rows.filter(
    (r) => r.method !== "credit" && (ALWAYS_SHOWN.has(r.method) || r.salesCount > 0 || r.salesCollected + r.repayments > 0),
  );
  const nothing = report.salesCount === 0 && report.totalIn === 0;
  const dayHref = (d: string) => (d === today ? "/cash" : `/cash?day=${d}`);
  const navLink = cn(buttonVariants({ variant: "outline", size: "lg" }), "shrink-0 px-3");

  return (
    <div className="grid gap-5 px-4 pt-4 pb-6 md:px-0 md:pt-0">
      <div className="grid gap-0.5">
        <h1 className="text-[1.5625rem] leading-tight font-bold">{t("title")}</h1>
        <p className="num text-muted-foreground">
          {isToday ? `${t("today")} · ` : null}
          <time dateTime={day}>{formatEthiopianDate(day, locale)}</time>
        </p>
      </div>

      <nav aria-label={t("dayLabel")} className="flex items-end gap-2 md:max-w-md">
        <Link href={dayHref(shiftIsoDay(day, -1))} className={navLink} aria-label={t("previousDay")}>
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
        <form action={`/${locale}/cash`} className="flex min-w-0 flex-1 gap-2">
          <label htmlFor="cash-day" className="sr-only">
            {t("dayLabel")}
          </label>
          <Input id="cash-day" name="day" type="date" defaultValue={day} max={today} className="num h-12 min-w-0 flex-1" />
          <button type="submit" aria-label={t("show")} className={navLink}>
            <CalendarDays className="size-5" aria-hidden />
          </button>
        </form>
        {isToday ? (
          <span aria-hidden className={cn(navLink, "pointer-events-none opacity-40")}>
            <ChevronRight className="size-5" />
          </span>
        ) : (
          <Link href={dayHref(shiftIsoDay(day, 1))} className={navLink} aria-label={t("nextDay")}>
            <ChevronRight className="size-5" aria-hidden />
          </Link>
        )}
      </nav>

      <MoneySummaryCard
        tone="in"
        label={t("cashIn")}
        figure={formatBirr(report.cashIn, locale)}
        sub={`${t("totalIn", { amount: formatBirr(report.totalIn, locale) })} · ${t("salesCount", { count: report.salesCount })}`}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <MoneySummaryCard
          tone="band"
          size="md"
          label={t("repaid")}
          figure={formatBirr(report.repaid, locale)}
          sub={t("repaidSub", { count: report.repaymentCount })}
        />
        <MoneySummaryCard
          tone={report.creditGiven > 0 ? "owed" : "band"}
          size="md"
          label={t("creditGiven")}
          figure={formatBirr(report.creditGiven, locale)}
          sub={t("creditSub", { count: report.creditSales })}
        />
      </div>

      {nothing ? (
        <EmptyState icon={CalendarDays} message={t("empty")} />
      ) : (
        <section aria-labelledby="by-method" className="grid gap-2">
          <h2 id="by-method" className="font-semibold">
            {t("byMethod")}
          </h2>
          <ListSheet>
            {methodRows.map((row) => (
              <ListRow
                key={row.method}
                title={t(`methods.${row.method}`)}
                className="items-center"
                sub={
                  <span className="num">
                    {t("methodLine", {
                      sales: formatBirr(row.salesCollected, locale),
                      repaid: formatBirr(row.repayments, locale),
                    })}
                  </span>
                }
                right={
                  <span className={cn("num font-bold", row.salesCollected + row.repayments > 0 ? "text-money-in" : "text-muted-foreground")}>
                    {formatBirr(row.salesCollected + row.repayments, locale)}
                  </span>
                }
              />
            ))}
            {credit && credit.salesCount > 0 ? (
              <ListRow
                title={t("methods.credit")}
                className="items-center"
                sub={
                  <>
                    <span className="num">{t("creditSub", { count: credit.salesCount })}</span>
                    <span className="num">{t("creditLine", { total: formatBirr(credit.salesTotal, locale) })}</span>
                  </>
                }
                right={<span className="num font-bold text-owed">{formatBirr(credit.creditGiven, locale)}</span>}
              />
            ) : null}
          </ListSheet>
        </section>
      )}

      {canExport ? (
        <Link href="/export" className="inline-flex min-h-12 items-center gap-2 justify-self-start text-tarp underline underline-offset-4">
          <Download className="size-4" aria-hidden />
          {te("link")}
        </Link>
      ) : null}
    </div>
  );
}
