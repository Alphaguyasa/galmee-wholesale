import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("App");
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col gap-6 px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 font-bold" translate="no">
          <Logo />
          {t("name")}
        </div>
        <LanguageSwitcher />
      </div>
      {children}
    </main>
  );
}
