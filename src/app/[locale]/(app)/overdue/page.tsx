import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarClock, CalendarX, Clock, Phone } from "lucide-react";
import { StatusBadge } from "@/components/galmee/status-badge";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { formatEthiopianDate } from "@/lib/ethiopian-calendar";
import { formatBirr } from "@/lib/money";
import { getAgeingTotals, listAgeing } from "@/server/dal/customers";
import { getPromisesToChase } from "@/server/dal/promises";

export default async function OverduePage({ params }: PageProps<"/[locale]/overdue">) {
  const { locale: rawLocale } = await params;
  setRequestLocale(rawLocale);
  const locale = rawLocale as AppLocale;

  const [t, tp, rows, totals, chase] = await Promise.all([
    getTranslations("Overdue"),
    getTranslations("Promises"),
    listAgeing(),
    getAgeingTotals(),
    getPromisesToChase(),
  ]);

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

      {chase.length > 0 ? (
        <section aria-labelledby="chase-heading" className="mt-3">
          <h2 id="chase-heading" className="px-4 text-lg font-bold md:px-0">
            {tp("chaseHeading", { count: chase.length })}
          </h2>
          <ul className="mt-2 divide-y divide-border border-y">
            {chase.map((p) => (
              <li key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 px-4 py-3 md:px-2">
                <Link href={`/customers/${p.customerId}`} className="truncate font-bold text-tarp underline underline-offset-4">
                  {p.name}
                </Link>
                {p.state === "broken" ? (
                  <StatusBadge tone="urgent" icon={CalendarX}>
                    {tp("state_broken", { days: p.daysLate })}
                  </StatusBadge>
                ) : (
                  <StatusBadge tone="warn" icon={CalendarClock}>
                    {tp("state_due_today")}
                  </StatusBadge>
                )}
                <span className="text-sm text-muted-foreground">
                  <time dateTime={p.promisedOn}>{formatEthiopianDate(p.promisedOn, locale)}</time>
                  {" · "}
                  <span className="money">
                    {p.amount !== null
                      ? tp("promisedAmount", { amount: formatBirr(p.amount, locale) })
                      : tp("promisedAll", { amount: formatBirr(p.owedAtPromise, locale) })}
                  </span>
                </span>
                <span className="money text-sm whitespace-nowrap text-owed">{formatBirr(p.owedNow, locale)}</span>
                {p.phone ? (
                  <a
                    href={`tel:${p.phone}`}
                    className="col-span-2 inline-flex min-h-12 items-center gap-2 justify-self-start text-sm text-tarp underline underline-offset-4"
                  >
                    <Phone className="size-4" aria-hidden />
                    <span dir="ltr">{p.phone}</span>
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <dl className="mt-3 grid grid-cols-3 divide-x divide-border border-y">
        {buckets.map((b) => (
          <div key={b.key} className="grid gap-1 p-3">
            <dt className="text-sm">{b.label}</dt>
            <dd className="money text-sm [overflow-wrap:anywhere]">{formatBirr(b.total, locale)}</dd>
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
                <span className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
                  <span className="truncate font-bold">{r.name}</span>
                  <span className="money whitespace-nowrap text-owed">{formatBirr(r.total, locale)}</span>
                </span>
                <span className="flex items-center gap-1.5 text-sm text-late">
                  <Clock className="size-4 shrink-0" aria-hidden />
                  {t("oldest", { days: r.oldestDays })}
                </span>
                <span className="grid grid-cols-3 gap-2 text-sm text-muted-foreground">
                  <span>
                    <span className="block">{t("bucket0")}</span>
                    <span className="money [overflow-wrap:anywhere]">{formatBirr(r.days0To30, locale)}</span>
                  </span>
                  <span>
                    <span className="block">{t("bucket31")}</span>
                    <span className="money [overflow-wrap:anywhere]">{formatBirr(r.days31To60, locale)}</span>
                  </span>
                  <span>
                    <span className="block">{t("bucket60")}</span>
                    <span className="money [overflow-wrap:anywhere]">{formatBirr(r.daysOver60, locale)}</span>
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
