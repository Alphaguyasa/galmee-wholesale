import { getTranslations, setRequestLocale } from "next-intl/server";
import { ReportsView } from "@/components/reports-view";
import { addisDay } from "@/lib/galmee/eth-calendar";
import { getSession } from "@/server/dal/session";

export default async function ReportsPage({ params }: PageProps<"/[locale]/reports">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const [t, session] = await Promise.all([getTranslations("Reports"), getSession()]);
  const canExport = session.profile.role === "owner" || session.profile.role === "manager";

  return (
    <div className="grid gap-4 px-4 pt-4 pb-6 md:px-0 md:pt-0">
      <div className="grid gap-1">
        <h1 className="text-[1.5625rem] leading-tight font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("intro")}</p>
      </div>
      <ReportsView lang={locale} today={addisDay()} canExport={canExport} tenantName={session.tenant.name} />
    </div>
  );
}
