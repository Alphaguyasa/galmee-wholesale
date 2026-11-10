"use server";

import { getLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { addItem, getItem, receiveStock } from "@/server/dal/items";
import { getSession, redirectTo } from "@/server/dal/session";
import { formToObject, itemSchema, receiveStockSchema } from "@/server/validation";
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

const ITEM_FIELDS = ["nameEn", "nameAm", "nameOm", "unit", "price", "cost", "reorderLevel"] as const;

export async function createItem(_prev: FormState, formData: FormData): Promise<FormState> {
  // Selling prices are the owner's decision: staff can receive goods but not add priced items.
  const session = await getSession();
  if (session.profile.role === "staff") return { error: "errorRole" };

  const parsed = itemSchema.safeParse(formToObject(formData, ITEM_FIELDS));
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    if (field === "unit") return { error: "errorUnit" };
    if (field === "price" || field === "cost" || field === "reorderLevel") return { error: "errorNumber" };
    return { error: "errorItemName" };
  }

  const created = await addItem(parsed.data);
  if (!created) return { error: "errorSave" };
  return redirectTo(`/items/${created.id}/receive`);
}
