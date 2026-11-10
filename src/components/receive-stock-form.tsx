"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { addStock } from "@/actions/items";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ReceiveStockForm({ itemId, unit, lastCost }: { itemId: string; unit: string; lastCost: number }) {
  const t = useTranslations("Items");
  const [state, formAction, pending] = useActionState(addStock, undefined);

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="item" value={itemId} />
      <div className="grid gap-2">
        <Label htmlFor="qty">{t("qty", { unit })}</Label>
        <Input id="qty" name="qty" inputMode="decimal" autoComplete="off" required className="money h-12 text-base" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="cost">{t("costPerUnit")}</Label>
        <Input
          id="cost"
          name="cost"
          inputMode="decimal"
          autoComplete="off"
          required
          defaultValue={lastCost > 0 ? String(lastCost) : undefined}
          className="money h-12 text-base"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="batch">{t("batch")}</Label>
        <Input id="batch" name="batch" autoComplete="off" maxLength={60} aria-describedby="batch-hint" className="h-12 text-base" />
        <p id="batch-hint" className="text-sm text-muted-foreground">
          {t("batchHint")}
        </p>
      </div>
      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {t(state.error)}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending} aria-busy={pending}>
        {t("receive")}
      </Button>
    </form>
  );
}
