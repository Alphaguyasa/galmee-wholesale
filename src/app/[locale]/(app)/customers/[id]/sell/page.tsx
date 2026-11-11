import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CreditSaleForm } from "@/components/credit-sale-form";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { formatBirr } from "@/lib/money";
import { getCustomer } from "@/server/dal/customers";
import { listItems } from "@/server/dal/items";
import { uuidParam } from "@/server/validation";

export default async function SellPage({ params }: PageProps<"/[locale]/customers/[id]/sell">) {
  const { locale: rawLocale, id } = await params;
  setRequestLocale(rawLocale);
  const locale = rawLocale as AppLocale;
  if (!uuidParam.safeParse(id).success) notFound();

  const [t, tc, customer, items] = await Promise.all([
    getTranslations("Sales"),
    getTranslations("Customers"),
    getCustomer(id),
    listItems("", locale),
  ]);
  if (!customer) notFound();

  const inStock = items
    .filter((i) => i.onHand > 0)
    .sort((a, b) => a.name.localeCompare(b.name, locale))
    .map(({ id: itemId, name, unit, price, onHand }) => ({ id: itemId, name, unit, price, onHand }));

  return (
    <section className="grid max-w-md gap-4 p-4 md:p-0">
      <Link href={`/customers/${customer.id}`} className="inline-flex min-h-12 items-center text-tarp underline underline-offset-4">
        {tc("back")}
      </Link>
      <div className="grid gap-1">
        <h1 className="text-[1.375rem] font-bold break-words">{t("title", { name: customer.name })}</h1>
        <p className="money">
          {tc("owesNow", { amount: formatBirr(customer.balance, locale) })}
          {customer.creditLimit !== null ? ` · ${tc("creditLimitLabel")} ${formatBirr(customer.creditLimit, locale)}` : null}
        </p>
      </div>
      {inStock.length === 0 ? (
        <p className="rounded-md border p-3">
          {t("noItems")}{" "}
          <Link href="/items" className="text-tarp underline underline-offset-4">
            {t("goToStock")}
          </Link>
        </p>
      ) : (
        <CreditSaleForm customerId={customer.id} clientRef={crypto.randomUUID()} items={inStock} />
      )}
    </section>
  );
}
