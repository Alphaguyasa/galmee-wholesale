import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PromiseForm } from "@/components/promise-form";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { addisToday, shiftIsoDay } from "@/lib/daily-cash";
import { formatBirr } from "@/lib/money";
import { MAX_PROMISE_DAYS } from "@/lib/promise";
import { getCustomer } from "@/server/dal/customers";
import { uuidParam } from "@/server/validation";

export default async function PromisePage({ params }: PageProps<"/[locale]/customers/[id]/promise">) {
  const { locale: rawLocale, id } = await params;
  setRequestLocale(rawLocale);
  const locale = rawLocale as AppLocale;
  if (!uuidParam.safeParse(id).success) notFound();

  const [t, tc, customer] = await Promise.all([getTranslations("Promises"), getTranslations("Customers"), getCustomer(id)]);
  if (!customer) notFound();
  const today = addisToday();

  return (
    <section className="grid max-w-md gap-4 p-4 md:p-0">
      <Link href={`/customers/${customer.id}`} className="inline-flex min-h-12 items-center text-tarp underline underline-offset-4">
        {tc("back")}
      </Link>
      <div className="grid gap-1">
        <h1 className="text-[1.375rem] font-bold break-words">{t("title", { name: customer.name })}</h1>
        <p className="money text-owed">{tc("owesNow", { amount: formatBirr(customer.balance, locale) })}</p>
      </div>
      {customer.balance > 0 ? (
        <PromiseForm customerId={customer.id} today={today} maxDay={shiftIsoDay(today, MAX_PROMISE_DAYS)} />
      ) : (
        <p>{t("errorNothingOwed")}</p>
      )}
    </section>
  );
}
