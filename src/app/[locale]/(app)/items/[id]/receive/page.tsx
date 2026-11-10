import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ReceiveStockForm } from "@/components/receive-stock-form";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { formatQty } from "@/lib/money";
import { getItem } from "@/server/dal/items";
import { uuidParam } from "@/server/validation";

export default async function ReceivePage({ params }: PageProps<"/[locale]/items/[id]/receive">) {
  const { locale: rawLocale, id } = await params;
  setRequestLocale(rawLocale);
  const locale = rawLocale as AppLocale;
  if (!uuidParam.safeParse(id).success) notFound();

  const [t, item] = await Promise.all([getTranslations("Items"), getItem(id, locale)]);
  if (!item) notFound();

  return (
    <section className="grid max-w-md gap-4 p-4 md:p-0">
      <Link href="/items" className="inline-flex min-h-12 items-center text-tarp underline underline-offset-4">
        {t("back")}
      </Link>
      <div className="grid gap-1">
        <h1 className="text-[1.375rem] font-bold break-words">{t("receiveTitle", { name: item.name })}</h1>
        <p className="money">{t("onHand", { qty: formatQty(item.onHand), unit: item.unit })}</p>
      </div>
      <ReceiveStockForm itemId={item.id} unit={item.unit} lastCost={item.cost} />
    </section>
  );
}
