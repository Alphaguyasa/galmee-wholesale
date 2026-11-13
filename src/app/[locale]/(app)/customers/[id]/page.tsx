import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowDownLeft, ArrowUpRight, Check, Phone, Printer, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { formatEthiopianDate } from "@/lib/ethiopian-calendar";
import { formatBirr } from "@/lib/money";
import { getCustomer, getStatement } from "@/server/dal/customers";
import { uuidParam } from "@/server/validation";

export default async function CustomerPage({ params, searchParams }: PageProps<"/[locale]/customers/[id]">) {
  const [{ locale: rawLocale, id }, sp] = await Promise.all([params, searchParams]);
  setRequestLocale(rawLocale);
  const locale = rawLocale as AppLocale;
  if (!uuidParam.safeParse(id).success) notFound();

  const [t, ts, tr, customer, statement] = await Promise.all([
    getTranslations("Customers"),
    getTranslations("Sales"),
    getTranslations("Receipt"),
    getCustomer(id),
    getStatement(id),
  ]);
  if (!customer) notFound();

  const owes = customer.balance > 0;
  const overLimit = owes && customer.creditLimit !== null && customer.balance > customer.creditLimit;

  return (
    <div>
      <div className="px-4 pt-4 md:px-0 md:pt-0">
        <Link href="/customers" className="inline-flex min-h-12 items-center text-tarp underline underline-offset-4">
          {t("back")}
        </Link>
        <h1 className="text-[1.75rem] leading-tight font-bold break-words">{customer.name}</h1>
        {customer.phone ? (
          <a href={`tel:${customer.phone}`} className="mt-1 inline-flex min-h-12 items-center gap-2 text-tarp underline underline-offset-4">
            <Phone className="size-4" aria-hidden />
            <span dir="ltr">{customer.phone}</span>
          </a>
        ) : null}
      </div>

      <dl className="mt-4 divide-y divide-border border-y">
        <div className="grid gap-1 px-4 py-4 md:px-2">
          <dt>{t("balance")}</dt>
          <dd className={`money text-[2.5rem] leading-none break-words ${owes ? "text-owed" : ""}`}>
            {formatBirr(customer.balance, locale)}
          </dd>
          <dd className="flex items-center gap-1.5 text-sm">
            {owes ? (
              customer.daysOwing !== null ? t("sinceDays", { days: customer.daysOwing }) : null
            ) : (
              <>
                <Check className="size-4 text-paid" aria-hidden />
                {t("settled")}
              </>
            )}
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-3 px-4 py-3 md:px-2">
          <dt>{t("creditLimitLabel")}</dt>
          <dd className="money">{customer.creditLimit !== null ? formatBirr(customer.creditLimit, locale) : t("noLimit")}</dd>
        </div>
      </dl>

      {overLimit ? (
        <p role="status" className="mx-4 mt-3 flex items-start gap-2 rounded-md border border-owed p-3 text-owed md:mx-0">
          <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
          {t("overLimit")}
        </p>
      ) : null}

      {sp.saved === "1" ? (
        <p role="status" className="mx-4 mt-3 flex items-center gap-2 rounded-md border border-paid p-3 text-paid md:mx-0">
          <Check className="size-5 shrink-0" aria-hidden />
          {t("repaymentSaved")}
        </p>
      ) : null}

      {sp.sold === "1" ? (
        <p role="status" className="mx-4 mt-3 flex items-center gap-2 rounded-md border border-paid p-3 text-paid md:mx-0">
          <Check className="size-5 shrink-0" aria-hidden />
          {ts("saved")}
        </p>
      ) : null}

      <div className="grid gap-3 px-4 pt-4 md:flex md:px-0">
        <Button asChild size="lg" variant={owes ? "outline" : "default"} className="w-full md:w-auto">
          <Link href={`/customers/${customer.id}/sell`}>{ts("give")}</Link>
        </Button>
        {owes ? (
          <Button asChild size="lg" className="w-full md:w-auto">
            <Link href={`/customers/${customer.id}/repay`}>{t("recordRepayment")}</Link>
          </Button>
        ) : null}
      </div>

      <section className="mt-6">
        <h2 className="px-4 text-lg font-bold md:px-0">{t("statement")}</h2>
        {statement.length === 0 ? (
          <p className="px-4 py-4 md:px-0">{t("statementEmpty")}</p>
        ) : (
          <ul className="mt-2 divide-y divide-border border-y">
            {statement.map((row) => (
              <li key={row.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 px-4 py-3 md:px-2">
                <span className={`flex items-center gap-1.5 font-bold ${row.isDebt ? "text-owed" : "text-paid"}`}>
                  {row.isDebt ? <ArrowUpRight className="size-4 shrink-0" aria-hidden /> : <ArrowDownLeft className="size-4 shrink-0" aria-hidden />}
                  {row.isDebt ? t("debt") : t("repayment")}
                </span>
                <span className="money whitespace-nowrap">{formatBirr(row.amount, locale)}</span>
                <time dateTime={row.at} className="text-sm text-muted-foreground">
                  {formatEthiopianDate(row.at, locale)}
                </time>
                <span className="money text-sm whitespace-nowrap text-muted-foreground">
                  {t("balanceAfter", { amount: formatBirr(row.balanceAfter, locale) })}
                </span>
                {row.note ? <span className="col-span-2 text-sm text-muted-foreground">{row.note}</span> : null}
                {row.receipt ? (
                  <Link
                    href={`/customers/${customer.id}/${row.receipt.kind === "sale" ? "sales" : "payments"}/${row.receipt.id}`}
                    className="col-span-2 inline-flex min-h-12 items-center gap-1.5 justify-self-start text-sm text-tarp underline underline-offset-4"
                  >
                    <Printer className="size-4" aria-hidden />
                    {tr("reprint")}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
