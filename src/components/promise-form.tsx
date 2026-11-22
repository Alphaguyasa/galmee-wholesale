"use client";

import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { TriangleAlert } from "lucide-react";
import { addPromise } from "@/actions/promises";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AppLocale } from "@/i18n/routing";
import { formatEthiopianDate } from "@/lib/ethiopian-calendar";
import { quickPromiseDays } from "@/lib/promise";
import { cn } from "@/lib/utils";

export function PromiseForm({ customerId, today, maxDay }: { customerId: string; today: string; maxDay: string }) {
  const t = useTranslations("Promises");
  const locale = useLocale() as AppLocale;
  const [state, formAction, pending] = useActionState(addPromise, undefined);
  const quick = quickPromiseDays(today);
  const [day, setDay] = useState(quick[0].day);

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="customer" value={customerId} />
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">{t("when")}</legend>
        <div className="grid grid-cols-3 gap-2">
          {quick.map((q) => (
            <button
              key={q.days}
              type="button"
              aria-pressed={day === q.day}
              onClick={() => setDay(q.day)}
              className={cn(
                "min-h-12 rounded-md border px-2 text-sm font-semibold",
                day === q.day ? "border-primary bg-primary text-primary-foreground" : "border-input bg-card",
              )}
            >
              {t(`in${q.days}`)}
            </button>
          ))}
        </div>
        <Label htmlFor="promisedOn" className="mt-2">
          {t("otherDay")}
        </Label>
        <Input
          id="promisedOn"
          name="promisedOn"
          type="date"
          required
          min={today}
          max={maxDay}
          value={day}
          onChange={(e) => setDay(e.target.value)}
          aria-describedby="promisedOn-hint"
          className="num h-12 text-base"
        />
        <p id="promisedOn-hint" className="text-sm font-semibold">
          {day ? formatEthiopianDate(day, locale) : null}
        </p>
      </fieldset>
      <div className="grid gap-2">
        <Label htmlFor="amount">{t("amount")}</Label>
        <Input id="amount" name="amount" inputMode="decimal" autoComplete="off" aria-describedby="amount-hint" className="money h-12 text-base" />
        <p id="amount-hint" className="text-sm text-muted-foreground">
          {t("amountHint")}
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="note">{t("note")}</Label>
        <Input id="note" name="note" autoComplete="off" maxLength={200} className="h-12 text-base" />
      </div>
      {state?.error ? (
        <p role="alert" className="flex items-start gap-2 text-destructive">
          <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
          {t(state.error)}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending} aria-busy={pending}>
        {t("save")}
      </Button>
    </form>
  );
}
