import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { StockOutForm } from "@/components/stock-out-form";
import { Link, redirect } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { formatQty } from "@/lib/money";
import { getItem } from "@/server/dal/items";
import { getSession } from "@/server/dal/session";
import { uuidParam } from "@/server/validation";

export default async function StockOutPage({ params }: PageProps<"/[locale]/items/[id]/remove">) {
  const { locale: rawLocale, id } = await params;
  setRequestLocale(rawLocale);
  const locale = rawLocale as AppLocale;
  if (!uuidParam.safeParse(id).success) notFound();

  const [t, item, session] = await Promise.all([getTranslations("Items"), getItem(id, locale), getSession()]);
  if (!item) notFound();
  // Only the owner or a manager takes goods off the books; staff go back to the item list.
  if (session.profile.role === "staff") redirect({ href: "/items", locale });

  return (
    <section className="grid max-w-md gap-4 p-4 md:p-0">
      <Link href="/items" className="inline-flex min-h-12 items-center text-tarp underline underline-offset-4">
        {t("back")}
      </Link>
      <div className="grid gap-1">
        <h1 className="text-[1.375rem] font-bold break-words">{t("outTitle", { name: item.name })}</h1>
        <p className="money">{t("onHand", { qty: formatQty(item.onHand), unit: item.unit })}</p>
        <p className="text-sm text-muted-foreground">{t("outIntro")}</p>
      </div>
      <StockOutForm itemId={item.id} unit={item.unit} />
    </section>
  );
}
