import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Check, Phone, TriangleAlert } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { formatBirr } from "@/lib/money";
import { getCustomer } from "@/server/dal/customers";
import { uuidParam } from "@/server/validation";

export default async function CustomerPage({ params }: PageProps<"/[locale]/customers/[id]">) {
  const { locale: rawLocale, id } = await params;
  setRequestLocale(rawLocale);
  const locale = rawLocale as AppLocale;
  if (!uuidParam.safeParse(id).success) notFound();

  const [t, customer] = await Promise.all([getTranslations("Customers"), getCustomer(id)]);
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
    </div>
  );
}
