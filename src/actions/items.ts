"use server";

import { getLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { getItem, receiveStock } from "@/server/dal/items";
import { getSession, redirectTo } from "@/server/dal/session";
import { formToObject, receiveStockSchema } from "@/server/validation";
import type { FormState } from "./auth";

export async function addStock(_prev: FormState, formData: FormData): Promise<FormState> {
  // Any active member of the shop may receive goods (RLS enforces the tenant).
  await getSession();

  const parsed = receiveStockSchema.safeParse(formToObject(formData, ["item", "qty", "cost", "batch"]));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.path[0] === "cost" ? "errorCost" : "errorQty" };
  }

  // Reading through RLS proves the item belongs to this shop before the batch is written.
  const item = await getItem(parsed.data.item, (await getLocale()) as AppLocale);
  if (!item) return { error: "errorSave" };

  const { ok } = await receiveStock(parsed.data);
  if (!ok) return { error: "errorSave" };
  return redirectTo(`/items?received=${item.id}`);
}
