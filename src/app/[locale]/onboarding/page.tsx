import { getTranslations } from "next-intl/server";
import { logout } from "@/actions/auth";
import { createShop } from "@/actions/onboarding";
import { AuthForm } from "@/components/auth-form";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Button } from "@/components/ui/button";
import { getUserId, hasProfile, redirectTo } from "@/server/dal/session";

export default async function OnboardingPage() {
  const userId = await getUserId();
  if (!userId) return redirectTo("/login");
  if (await hasProfile(userId)) return redirectTo("/customers");

  const [t, tAuth] = await Promise.all([getTranslations("Onboarding"), getTranslations("Auth")]);

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col gap-6 px-4 py-6">
      <div className="flex justify-end">
        <LanguageSwitcher />
      </div>
      <section className="grid gap-5">
        <div className="grid gap-2">
          <h1 className="text-[1.375rem] font-bold text-balance">{t("title")}</h1>
          <p className="text-muted-foreground">{t("intro")}</p>
        </div>
        <AuthForm
          namespace="Onboarding"
          action={createShop}
          submitLabel={t("submit")}
          fields={[
            { name: "shopName", label: t("shopName"), autoComplete: "organization" },
            { name: "fullName", label: t("fullName"), autoComplete: "name" },
            { name: "phone", label: t("phone"), type: "tel", autoComplete: "tel", inputMode: "tel" },
          ]}
        />
      </section>
      <form action={logout}>
        <Button variant="ghost" className="w-full">
          {tAuth("logout")}
        </Button>
      </form>
    </main>
  );
}
