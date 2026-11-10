"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { createItem } from "@/actions/items";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const TEXT_FIELDS = [
  { name: "nameEn", key: "nameEn", required: true, lang: "en" },
  { name: "nameAm", key: "nameAm", required: false, lang: "am" },
  { name: "nameOm", key: "nameOm", required: false, lang: "om" },
] as const;

const NUMBER_FIELDS = [
  { name: "price", key: "price", required: true },
  { name: "cost", key: "cost", required: true },
  { name: "reorderLevel", key: "reorderLevel", required: false },
] as const;

export function ItemForm() {
  const t = useTranslations("Items");
  const [state, formAction, pending] = useActionState(createItem, undefined);

  return (
    <form action={formAction} className="grid gap-4">
      {TEXT_FIELDS.map((f) => (
        <div key={f.name} className="grid gap-2">
          <Label htmlFor={f.name}>{t(f.key)}</Label>
          <Input id={f.name} name={f.name} lang={f.lang} required={f.required} maxLength={120} autoComplete="off" className="h-12 text-base" />
        </div>
      ))}
      <div className="grid gap-2">
        <Label htmlFor="unit">{t("unit")}</Label>
        <Input id="unit" name="unit" required maxLength={20} autoComplete="off" aria-describedby="unit-hint" className="h-12 text-base" />
        <p id="unit-hint" className="text-sm text-muted-foreground">
          {t("unitHint")}
        </p>
      </div>
      {NUMBER_FIELDS.map((f) => (
        <div key={f.name} className="grid gap-2">
          <Label htmlFor={f.name}>{t(f.key)}</Label>
          <Input
            id={f.name}
            name={f.name}
            inputMode="decimal"
            required={f.required}
            defaultValue={f.name === "reorderLevel" ? "0" : undefined}
            autoComplete="off"
            className="money h-12 text-base"
          />
        </div>
      ))}
      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {t(state.error)}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending} aria-busy={pending}>
        {t("saveItem")}
      </Button>
    </form>
  );
}
