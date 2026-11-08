"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { addRepayment } from "@/actions/customers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const METHODS = [
  { value: "cash", key: "methodCash" },
  { value: "telebirr", key: "methodTelebirr" },
  { value: "cbe_birr", key: "methodCbe" },
  { value: "bank", key: "methodBank" },
  { value: "other", key: "methodOther" },
] as const;

export function RepaymentForm({ customerId }: { customerId: string }) {
  const t = useTranslations("Customers");
  const [state, formAction, pending] = useActionState(addRepayment, undefined);

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="customer" value={customerId} />
      <div className="grid gap-2">
        <Label htmlFor="amount">{t("amount")}</Label>
        <Input id="amount" name="amount" inputMode="decimal" autoComplete="off" required className="money h-12 text-base" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="method">{t("method")}</Label>
        <select id="method" name="method" defaultValue="cash" className="h-12 rounded-md border border-input bg-card px-3 text-base">
          {METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {t(m.key)}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="reference">{t("reference")}</Label>
        <Input id="reference" name="reference" autoComplete="off" maxLength={80} aria-describedby="reference-hint" className="h-12 text-base" />
        <p id="reference-hint" className="text-sm text-muted-foreground">
          {t("referenceHint")}
        </p>
      </div>
      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {t(state.error)}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending} aria-busy={pending}>
        {t("recordRepayment")}
      </Button>
    </form>
  );
}
