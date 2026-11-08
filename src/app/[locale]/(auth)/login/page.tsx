import { getTranslations } from "next-intl/server";
import { login } from "@/actions/auth";
import { AuthForm } from "@/components/auth-form";
import { Link } from "@/i18n/navigation";

export default async function LoginPage() {
  const t = await getTranslations("Auth");
  return (
    <section className="grid gap-5">
      <h1 className="text-[1.375rem] font-bold text-balance">{t("loginTitle")}</h1>
      <AuthForm
        namespace="Auth"
        action={login}
        submitLabel={t("login")}
        fields={[
          { name: "email", label: t("email"), type: "email", autoComplete: "email", inputMode: "email" },
          { name: "password", label: t("password"), type: "password", autoComplete: "current-password" },
        ]}
      />
      <p className="text-center text-sm text-muted-foreground">
        {t("noAccount")}{" "}
        <Link href="/signup" className="font-medium text-primary underline underline-offset-4">
          {t("signup")}
        </Link>
      </p>
    </section>
  );
}
