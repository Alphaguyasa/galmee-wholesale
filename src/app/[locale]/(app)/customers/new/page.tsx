import { getTranslations } from "next-intl/server";
import { createCustomer } from "@/actions/customers";
import { AuthForm } from "@/components/auth-form";

export default async function NewCustomerPage() {
  const t = await getTranslations("Customers");
  return (
    <section className="grid max-w-md gap-5 p-4 md:p-0">
      <h1 className="text-[1.375rem] font-bold">{t("addTitle")}</h1>
      <AuthForm
        namespace="Customers"
        action={createCustomer}
        submitLabel={t("save")}
        fields={[
          { name: "name", label: t("name"), autoComplete: "off" },
          { name: "phone", label: t("phone"), type: "tel", inputMode: "tel", autoComplete: "off", required: false },
          { name: "creditLimit", label: t("creditLimit"), inputMode: "decimal", autoComplete: "off", hint: t("creditLimitHint"), required: false },
        ]}
      />
    </section>
  );
}
