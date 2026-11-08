import { getTranslations } from "next-intl/server";
import { signup } from "@/actions/auth";
import { AuthForm } from "@/components/auth-form";
import { Link } from "@/i18n/navigation";
import { MIN_PASSWORD } from "@/server/validation";

export default async function SignupPage() {
  const t = await getTranslations("Auth");
  return (
    <section className="grid gap-5">
      <h1 className="text-[1.375rem] font-bold text-balance">{t("signupTitle")}</h1>
      <AuthForm
        namespace="Auth"
        action={signup}
        submitLabel={t("signup")}
        fields={[
          { name: "email", label: t("email"), type: "email", autoComplete: "email", inputMode: "email" },
          {
            name: "password",
            label: t("password"),
            type: "password",
            autoComplete: "new-password",
            hint: t("passwordHint", { min: MIN_PASSWORD }),
          },
        ]}
      />
      <p className="text-center text-sm text-muted-foreground">
        {t("haveAccount")}{" "}
        <Link href="/login" className="font-medium text-primary underline underline-offset-4">
          {t("login")}
        </Link>
      </p>
    </section>
  );
}
