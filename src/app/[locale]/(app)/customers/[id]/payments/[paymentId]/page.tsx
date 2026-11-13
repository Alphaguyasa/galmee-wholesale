import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Check } from "lucide-react";
import { ReceiptPreview } from "@/components/galmee/receipt-preview";
import { PrintButton } from "@/components/print-button";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { formatEthiopianDate } from "@/lib/ethiopian-calendar";
import { formatBirr } from "@/lib/money";
import { getPaymentReceipt } from "@/server/dal/customers";
import { getSession } from "@/server/dal/session";
import { uuidParam } from "@/server/validation";

const METHOD_KEYS: Record<string, "methodCash" | "methodTelebirr" | "methodCbe" | "methodBank" | "methodOther"> = {
  cash: "methodCash",
  telebirr: "methodTelebirr",
  cbe_birr: "methodCbe",
  bank: "methodBank",
  other: "methodOther",
};

export default async function PaymentReceiptPage({
  params,
  searchParams,
}: PageProps<"/[locale]/customers/[id]/payments/[paymentId]">) {
  const [{ locale: rawLocale, id, paymentId }, sp] = await Promise.all([params, searchParams]);
  setRequestLocale(rawLocale);
  const locale = rawLocale as AppLocale;
  if (!uuidParam.safeParse(id).success || !uuidParam.safeParse(paymentId).success) notFound();

  const [{ tenant }, t, tc, payment] = await Promise.all([
    getSession(),
    getTranslations("Receipt"),
    getTranslations("Customers"),
    getPaymentReceipt(paymentId, id),
  ]);
  if (!payment) notFound();

  const methodKey = METHOD_KEYS[payment.method];
  const method = methodKey ? tc(methodKey) : payment.method;
  const totals = [
    ...(payment.balanceAfter !== null ? [{ label: t("owedAfter"), amount: formatBirr(payment.balanceAfter, locale) }] : []),
    { label: t("paid", { method }), amount: formatBirr(payment.amount, locale) },
  ];

  return (
    <div className="grid max-w-md gap-4 px-4 pt-4 md:px-0 md:pt-0 print:p-0">
      <Link
        href={`/customers/${payment.customerId}`}
        className="inline-flex min-h-12 items-center text-tarp underline underline-offset-4 print:hidden"
      >
        {t("backToCustomer", { name: payment.customerName })}
      </Link>
      {sp.new === "1" ? (
        <p role="status" className="flex items-center gap-2 rounded-md border border-paid p-3 text-paid print:hidden">
          <Check className="size-5 shrink-0" aria-hidden />
          {t("paymentSaved")}
        </p>
      ) : null}
      <h1 className="sr-only">{t("paymentTitle", { ref: payment.ref })}</h1>
      <ReceiptPreview
        className="mx-0 print:border-0 print:p-0"
        tenantName={tenant.name}
        title={t("paymentTitle", { ref: payment.ref })}
        dateLabel={formatEthiopianDate(payment.createdAt, locale)}
        lines={[
          { name: t("customer", { name: payment.customerName }), qty: "", amount: "" },
          ...(payment.reference ? [{ name: t("reference", { ref: payment.reference }), qty: "", amount: "" }] : []),
        ]}
        totals={totals}
        footer={payment.balanceAfter === 0 ? t("settled") : t("footer")}
      />
      <PrintButton label={t("print")} />
    </div>
  );
}
