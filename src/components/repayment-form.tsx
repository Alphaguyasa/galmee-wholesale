"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { CloudOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link, useRouter } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { formatBirr, parseBirrAmount } from "@/lib/money";
import { getOffline } from "@/lib/offline";

const METHODS = [
  { value: "cash", key: "methodCash" },
  { value: "telebirr", key: "methodTelebirr" },
  { value: "cbe_birr", key: "methodCbe" },
  { value: "bank", key: "methodBank" },
  { value: "other", key: "methodOther" },
] as const;

type Method = (typeof METHODS)[number]["value"];

/**
 * Records a repayment straight from the phone. With no network it waits in the
 * phone's queue and is sent later; the same `client_ref` on every try means a
 * retry or a double tap can never record it twice.
 */
export function RepaymentForm({ customerId, balance }: { customerId: string; balance: number }) {
  const t = useTranslations("Customers");
  const locale = useLocale() as AppLocale;
  const router = useRouter();
  const [clientRef] = useState(() => crypto.randomUUID());
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queued, setQueued] = useState<number | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = parseBirrAmount(String(form.get("amount") ?? ""));
    if (amount === null) return setError("errorAmount");
    if (amount > balance) return setError("errorTooMuch");
    const method = String(form.get("method")) as Method;
    const reference = String(form.get("reference") ?? "").trim().slice(0, 80);

    setPending(true);
    setError(null);
    try {
      const result = await getOffline().engine.callOrQueue("record_repayment", {
        p_customer: customerId,
        p_amount: amount,
        p_method: METHODS.some((m) => m.value === method) ? method : "cash",
        p_reference: reference || null,
        p_client_ref: clientRef,
      });
      if (result.status === "ok" && typeof result.data === "string") {
        router.push(`/customers/${customerId}/payments/${result.data}?new=1`);
        return;
      }
      if (result.status === "queued") {
        setQueued(amount);
      } else {
        setError(result.status === "rejected" && result.error.message.includes("bad_amount") ? "errorAmount" : "errorSave");
      }
    } catch {
      setError("errorSave");
    }
    setPending(false);
  }

  if (queued !== null) {
    return (
      <div className="grid gap-4">
        <p role="status" className="flex items-start gap-2 rounded-md border border-warn p-3">
          <CloudOff className="mt-0.5 size-5 shrink-0 text-warn" aria-hidden />
          {t("repaymentQueued", { amount: formatBirr(queued, locale) })}
        </p>
        <Button asChild size="lg" variant="outline">
          <Link href={`/customers/${customerId}`}>{t("back")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
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
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {t(error)}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending} aria-busy={pending}>
        {t("recordRepayment")}
      </Button>
    </form>
  );
}
