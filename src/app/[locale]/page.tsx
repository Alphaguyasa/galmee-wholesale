import { use } from "react";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { BookOpenText, CalendarClock, ListOrdered, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LanguageSwitcher } from "@/components/language-switcher";
import { TodayEthiopian } from "@/components/today-ethiopian";
import type { AppLocale } from "@/i18n/routing";

export default function HomePage({ params }: PageProps<"/[locale]">) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations();

  const features = [
    { icon: ListOrdered, text: t("Home.features.owed") },
    { icon: BookOpenText, text: t("Home.features.statement") },
    { icon: CalendarClock, text: t("Home.features.overdue") },
    { icon: WifiOff, text: t("Home.features.offline") },
  ];

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 py-6">
      <header className="flex items-center justify-between gap-3">
        <span className="text-lg font-bold text-primary">{t("App.name")}</span>
        <LanguageSwitcher />
      </header>

      <section className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold leading-snug">{t("App.tagline")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("Home.today")}: <TodayEthiopian locale={locale as AppLocale} />
        </p>
      </section>

      <Card>
        <CardContent>
          <ul className="flex flex-col gap-4">
            {features.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-start gap-3">
                <Icon className="mt-0.5 size-5 text-primary" aria-hidden />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="mt-auto flex flex-col gap-3">
        {/* Auth screens land in the next ROADMAP step. */}
        <Button size="lg" disabled>
          {t("Home.getStarted")}
        </Button>
        <Button size="lg" variant="outline" disabled>
          {t("Home.logIn")}
        </Button>
      </div>
    </main>
  );
}
