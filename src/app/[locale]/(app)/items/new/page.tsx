import { getTranslations, setRequestLocale } from "next-intl/server";
import { ItemForm } from "@/components/item-form";
import { Link } from "@/i18n/navigation";
import { getSession } from "@/server/dal/session";

export default async function NewItemPage({ params }: PageProps<"/[locale]/items/new">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const [t, session] = await Promise.all([getTranslations("Items"), getSession()]);

  return (
    <section className="grid max-w-md gap-4 p-4 md:p-0">
      <Link href="/items" className="inline-flex min-h-12 items-center text-tarp underline underline-offset-4">
        {t("back")}
      </Link>
      <h1 className="text-[1.375rem] font-bold">{t("addTitle")}</h1>
      {session.profile.role === "staff" ? <p role="alert">{t("errorRole")}</p> : <ItemForm />}
    </section>
  );
}
