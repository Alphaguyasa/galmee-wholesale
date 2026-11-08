import { getTranslations, setRequestLocale } from "next-intl/server";
import { BookOpenText, CalendarClock, ListOrdered, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { TodayEthiopian } from "@/components/today-ethiopian";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { getUserId, redirectTo } from "@/server/dal/session";

export default async function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  if (await getUserId()) return redirectTo("/customers");
  const t = await getTranslations();

  const features = [
    { icon: ListOrdered, text: t("Home.features.owed") },
    { icon: BookOpenText, text: t("Home.features.statement") },
    { icon: CalendarClock, text: t("Home.features.overdue") },
    { icon: WifiOff, text: t("Home.features.offline") },
  ];

  return (
    <main className="flex min-h-dvh w-full flex-1 flex-col">
      <header className="flex items-center justify-between gap-3 bg-tarp px-4 py-3 text-white">
        <span className="flex items-center gap-2 font-bold" translate="no">
          <Logo inverse />
          {t("App.name")}
        </span>
        <LanguageSwitcher inverse />
      </header>

      <section className="bg-jerrycan px-4 py-8 text-ink">
        <div className="mx-auto max-w-xl">
          <h1 className="text-[1.75rem] leading-tight font-bold text-balance">{t("App.tagline")}</h1>
          <p className="mt-3 text-sm">
            {t("Home.today")}: <TodayEthiopian locale={locale as AppLocale} />
          </p>
        </div>
      </section>

      <div className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-6">
        <ul className="divide-y divide-border">
          {features.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3 py-3">
              <Icon className="mt-0.5 size-5 shrink-0 text-tarp" aria-hidden />
              <span>{text}</span>
            </li>
          ))}
        </ul>

        <div className="mt-auto flex flex-col gap-3">
          <Button size="lg" asChild>
            <Link href="/signup">{t("Home.getStarted")}</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/login">{t("Home.logIn")}</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
