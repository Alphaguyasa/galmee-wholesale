import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Check } from "lucide-react";
import { PrintReceiptButton } from "@/components/galmee/print-receipt-button";
import { Receipt } from "@/components/galmee/receipt";
import { ReceiptWidthToggle, receiptWidthParam } from "@/components/receipt-width-toggle";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { formatEthiopianDate } from "@/lib/ethiopian-calendar";
import { repaymentReceiptData } from "@/lib/wholesale-receipt";
import { getPaymentReceipt } from "@/server/dal/customers";
import { getSession } from "@/server/dal/session";
import { uuidParam } from "@/server/validation";

const RECEIPT_ID = "payment-receipt";

export default async function PaymentReceiptPage({
  params,
  searchParams,
}: PageProps<"/[locale]/customers/[id]/payments/[paymentId]">) {
  const [{ locale: rawLocale, id, paymentId }, sp] = await Promise.all([params, searchParams]);
  setRequestLocale(rawLocale);
  const locale = rawLocale as AppLocale;
  if (!uuidParam.safeParse(id).success || !uuidParam.safeParse(paymentId).success) notFound();
  const width = receiptWidthParam(sp.w);

  const [{ tenant }, t, payment] = await Promise.all([getSession(), getTranslations("Receipt"), getPaymentReceipt(paymentId, id)]);
  if (!payment) notFound();

  const data = repaymentReceiptData(payment, {
    tenant: { name: tenant.name },
    lang: locale,
    ethDate: formatEthiopianDate(payment.createdAt, locale),
    lineLabel: t("repaidLine"),
    footer: payment.balanceAfter === 0 ? t("settled") : undefined,
  });

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
      <ReceiptWidthToggle
        href={`/customers/${payment.customerId}/payments/${payment.id}`}
        width={width}
        label={t("widthLabel")}
        labels={{ 58: t("width58"), 80: t("width80") }}
      />
      <div className="overflow-x-auto print:overflow-visible">
        <Receipt data={data} width={width} id={RECEIPT_ID} className="mx-0" />
      </div>
      <div className="print:hidden">
        <PrintReceiptButton targetId={RECEIPT_ID} label={t("print")} />
      </div>
    </div>
  );
}
