import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Check } from "lucide-react";
import { ReceiptPreview } from "@/components/galmee/receipt-preview";
import { PrintButton } from "@/components/print-button";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { formatEthiopianDate } from "@/lib/ethiopian-calendar";
import { formatAmount, formatBirr, formatQty } from "@/lib/money";
import { getSaleReceipt } from "@/server/dal/sales";
import { getSession } from "@/server/dal/session";
import { uuidParam } from "@/server/validation";

const METHOD_KEYS: Record<string, "methodCash" | "methodTelebirr" | "methodCbe" | "methodBank" | "methodOther"> = {
  cash: "methodCash",
  telebirr: "methodTelebirr",
  cbe_birr: "methodCbe",
  bank: "methodBank",
  other: "methodOther",
};

export default async function SaleReceiptPage({ params, searchParams }: PageProps<"/[locale]/customers/[id]/sales/[saleId]">) {
  const [{ locale: rawLocale, id, saleId }, sp] = await Promise.all([params, searchParams]);
  setRequestLocale(rawLocale);
  const locale = rawLocale as AppLocale;
  if (!uuidParam.safeParse(id).success || !uuidParam.safeParse(saleId).success) notFound();

  const [{ tenant }, t, tc, sale] = await Promise.all([
    getSession(),
    getTranslations("Receipt"),
    getTranslations("Customers"),
    getSaleReceipt(saleId, id, locale),
  ]);
  if (!sale) notFound();

  const onCredit = Math.max(0, sale.total - sale.paid);
  const methodKey = sale.method ? METHOD_KEYS[sale.method] : undefined;
  const method = methodKey ? tc(methodKey) : (sale.method ?? tc("methodOther"));
  const totals = [
    { label: t("total"), amount: formatBirr(sale.total, locale) },
    ...(sale.paid > 0 ? [{ label: t("paid", { method }), amount: formatBirr(sale.paid, locale) }] : []),
    ...(onCredit > 0 ? [{ label: t("onCredit"), amount: formatBirr(onCredit, locale) }] : []),
    ...(sale.balanceAfter !== null ? [{ label: t("owedAfter"), amount: formatBirr(sale.balanceAfter, locale) }] : []),
  ];

  return (
    <div className="grid max-w-md gap-4 px-4 pt-4 md:px-0 md:pt-0 print:p-0">
      <Link
        href={`/customers/${sale.customerId}`}
        className="inline-flex min-h-12 items-center text-tarp underline underline-offset-4 print:hidden"
      >
        {t("backToCustomer", { name: sale.customerName })}
      </Link>
      {sp.new === "1" ? (
        <p role="status" className="flex items-center gap-2 rounded-md border border-paid p-3 text-paid print:hidden">
          <Check className="size-5 shrink-0" aria-hidden />
          {t("saleSaved")}
        </p>
      ) : null}
      <h1 className="sr-only">{t("saleTitle", { ref: sale.ref })}</h1>
      <ReceiptPreview
        className="mx-0 print:border-0 print:p-0"
        tenantName={tenant.name}
        title={t("saleTitle", { ref: sale.ref })}
        dateLabel={formatEthiopianDate(sale.createdAt, locale)}
        lines={[
          { name: t("customer", { name: sale.customerName }), qty: "", amount: "" },
          ...sale.lines.map((l) => ({
            name: `${l.name}, ${formatQty(l.qty)} ${l.unit} × ${formatAmount(l.price)}`,
            qty: "",
            amount: formatAmount(l.qty * l.price),
          })),
        ]}
        totals={totals}
        footer={sale.dueDate ? t("payBackBy", { date: formatEthiopianDate(sale.dueDate, locale) }) : t("footer")}
      />
      <PrintButton label={t("print")} />
    </div>
  );
}
