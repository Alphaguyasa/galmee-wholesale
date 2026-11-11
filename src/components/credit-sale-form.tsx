"use client";

import { useActionState, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Plus, Trash2, TriangleAlert } from "lucide-react";
import { giveOnCredit } from "@/actions/sales";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AppLocale } from "@/i18n/routing";
import { formatEthiopianDate } from "@/lib/ethiopian-calendar";
import { formatBirr, formatQty } from "@/lib/money";

export type SaleItemOption = { id: string; name: string; unit: string; price: number; onHand: number };

type Line = { key: number; item: string; qty: string };

const METHODS = [
  { value: "cash", key: "methodCash" },
  { value: "telebirr", key: "methodTelebirr" },
  { value: "cbe_birr", key: "methodCbe" },
  { value: "bank", key: "methodBank" },
  { value: "other", key: "methodOther" },
] as const;

const MAX_LINES = 30;

function toNumber(value: string): number {
  const n = Number(value.replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function CreditSaleForm({
  customerId,
  clientRef,
  items,
}: {
  customerId: string;
  clientRef: string;
  items: SaleItemOption[];
}) {
  const t = useTranslations("Sales");
  const tc = useTranslations("Customers");
  const locale = useLocale() as AppLocale;
  const [state, formAction, pending] = useActionState(giveOnCredit, undefined);
  const [lines, setLines] = useState<Line[]>([{ key: 0, item: "", qty: "" }]);
  const [paid, setPaid] = useState("");
  const [due, setDue] = useState("");

  const byId = new Map(items.map((i) => [i.id, i]));
  const filled = lines.filter((l) => l.item && toNumber(l.qty) > 0);
  // Display only: the database recomputes the total from its own prices.
  const total = filled.reduce((sum, l) => sum + toNumber(l.qty) * (byId.get(l.item)?.price ?? 0), 0);
  const onCredit = Math.max(0, total - toNumber(paid));

  function update(key: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  return (
    <form action={formAction} className="grid gap-5">
      <input type="hidden" name="customer" value={customerId} />
      <input type="hidden" name="clientRef" value={clientRef} />
      <input
        type="hidden"
        name="lines"
        value={JSON.stringify(filled.map((l) => ({ item: l.item, qty: toNumber(l.qty) })))}
      />

      <fieldset className="grid gap-3">
        <legend className="mb-2 text-lg font-bold">{t("items")}</legend>
        {lines.map((line, index) => {
          const chosen = byId.get(line.item);
          const qty = toNumber(line.qty);
          const short = chosen !== undefined && qty > chosen.onHand;
          return (
            <div key={line.key} className="grid gap-2 rounded-md border border-border p-3">
              <Label htmlFor={`item-${line.key}`}>{t("itemN", { n: index + 1 })}</Label>
              <select
                id={`item-${line.key}`}
                value={line.item}
                onChange={(e) => update(line.key, { item: e.target.value })}
                className="h-12 w-full min-w-0 rounded-md border border-input bg-card px-3 text-base"
              >
                <option value="">{t("chooseItem")}</option>
                {items.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.name} · {formatBirr(i.price, locale)}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
                <div className="grid gap-1">
                  <Label htmlFor={`qty-${line.key}`}>{chosen ? t("qtyUnit", { unit: chosen.unit }) : t("qty")}</Label>
                  <Input
                    id={`qty-${line.key}`}
                    value={line.qty}
                    onChange={(e) => update(line.key, { qty: e.target.value })}
                    inputMode="decimal"
                    autoComplete="off"
                    aria-invalid={short || undefined}
                    aria-describedby={chosen ? `stock-${line.key}` : undefined}
                    className="money"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  className="size-12 p-0"
                  aria-label={t("removeItem", { n: index + 1 })}
                  disabled={lines.length === 1}
                  onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                >
                  <Trash2 className="size-5" aria-hidden />
                </Button>
              </div>
              {chosen ? (
                <p id={`stock-${line.key}`} className={`text-sm ${short ? "text-owed" : "text-muted-foreground"}`}>
                  {t("inStock", { qty: formatQty(chosen.onHand), unit: chosen.unit })}
                  {qty > 0 ? ` · ${formatBirr(qty * chosen.price, locale)}` : null}
                </p>
              ) : null}
            </div>
          );
        })}
        <Button
          type="button"
          variant="outline"
          size="lg"
          disabled={lines.length >= MAX_LINES}
          onClick={() => setLines((prev) => [...prev, { key: (prev.at(-1)?.key ?? 0) + 1, item: "", qty: "" }])}
        >
          <Plus className="size-5" aria-hidden />
          {t("addItem")}
        </Button>
      </fieldset>

      <div className="flex items-baseline justify-between gap-3 border-y py-3">
        <span className="font-bold">{t("total")}</span>
        <span className="money text-xl">{formatBirr(total, locale)}</span>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="paid">{t("paidNow")}</Label>
        <Input
          id="paid"
          name="paid"
          value={paid}
          onChange={(e) => setPaid(e.target.value)}
          inputMode="decimal"
          autoComplete="off"
          aria-describedby="paid-hint"
          className="money"
        />
        <p id="paid-hint" className="text-sm text-muted-foreground">
          {t("paidHint")}
        </p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="method">{tc("method")}</Label>
        <select id="method" name="method" defaultValue="cash" className="h-12 rounded-md border border-input bg-card px-3 text-base">
          {METHODS.map((m) => (
            <option key={m.value} value={m.value}>
              {tc(m.key)}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="due">{t("due")}</Label>
        <Input id="due" name="due" type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-describedby="due-hint" />
        <p id="due-hint" className="text-sm text-muted-foreground">
          {due ? formatEthiopianDate(due, locale) : t("dueHint")}
        </p>
      </div>

      <div className="flex items-baseline justify-between gap-3 rounded-md bg-muted p-3">
        <span className="font-bold">{t("onCredit")}</span>
        <span className={`money text-2xl ${onCredit > 0 ? "text-owed" : ""}`}>{formatBirr(onCredit, locale)}</span>
      </div>

      {state?.error ? (
        <p role="alert" className="flex items-start gap-2 text-destructive">
          <TriangleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
          {t(state.error)}
        </p>
      ) : null}

      {state?.canOverride ? (
        <fieldset className="grid gap-3 rounded-md border border-owed p-3">
          <legend className="px-1 font-bold text-owed">{t("overrideTitle")}</legend>
          <label className="flex min-h-12 items-center gap-3">
            <input type="checkbox" name="override" className="size-6 accent-owed" />
            {t("overrideConfirm")}
          </label>
          <div className="grid gap-2">
            <Label htmlFor="reason">{t("overrideReason")}</Label>
            <Input id="reason" name="reason" maxLength={300} autoComplete="off" />
          </div>
        </fieldset>
      ) : null}

      <Button type="submit" size="lg" disabled={pending || filled.length === 0} aria-busy={pending}>
        {t("submit")}
      </Button>
    </form>
  );
}
