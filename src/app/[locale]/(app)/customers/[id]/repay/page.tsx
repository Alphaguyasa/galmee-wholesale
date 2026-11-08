import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RepaymentForm } from "@/components/repayment-form";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { formatBirr } from "@/lib/money";
import { getCustomer } from "@/server/dal/customers";
import { uuidParam } from "@/server/validation";

export default async function RepayPage({ params }: PageProps<"/[locale]/customers/[id]/repay">) {
  const { locale: rawLocale, id } = await params;
  setRequestLocale(rawLocale);
  const locale = rawLocale as AppLocale;
  if (!uuidParam.safeParse(id).success) notFound();

  const [t, customer] = await Promise.all([getTranslations("Customers"), getCustomer(id)]);
  if (!customer) notFound();

  return (
    <section className="grid max-w-md gap-4 p-4 md:p-0">
      <Link href={`/customers/${customer.id}`} className="inline-flex min-h-12 items-center text-tarp underline underline-offset-4">
        {t("back")}
      </Link>
      <div className="grid gap-1">
        <h1 className="text-[1.375rem] font-bold break-words">{t("repayTitle", { name: customer.name })}</h1>
        <p className="money text-owed">{t("owesNow", { amount: formatBirr(customer.balance, locale) })}</p>
      </div>
      <RepaymentForm customerId={customer.id} />
    </section>
  );
}
