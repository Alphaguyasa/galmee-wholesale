"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { removeStock } from "@/actions/items";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const REASONS = ["damaged", "expired", "own_use", "returned", "count"] as const;

export function StockOutForm({ itemId, unit }: { itemId: string; unit: string }) {
  const t = useTranslations("Items");
  const [state, formAction, pending] = useActionState(removeStock, undefined);

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="item" value={itemId} />
      <div className="grid gap-2">
        <Label htmlFor="qty">{t("outQty", { unit })}</Label>
        <Input id="qty" name="qty" inputMode="decimal" autoComplete="off" required className="money h-12 text-base" />
      </div>
      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium">{t("outReason")}</legend>
        {REASONS.map((r, i) => (
          <label
            key={r}
            className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-input bg-card px-3 has-[:checked]:border-tarp has-[:checked]:bg-accent"
          >
            <input type="radio" name="reason" value={r} required defaultChecked={i === 0} className="size-5 accent-[var(--tarp)]" />
            <span>{t(`reasons.${r}`)}</span>
          </label>
        ))}
      </fieldset>
      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {t(state.error)}
        </p>
      ) : null}
      <Button type="submit" size="lg" variant="destructive" disabled={pending} aria-busy={pending}>
        {t("out")}
      </Button>
    </form>
  );
}
