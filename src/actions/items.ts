"use server";

import { getLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { addItem, getItem, receiveStock, stockOut } from "@/server/dal/items";
import { getSession, redirectTo } from "@/server/dal/session";
import { formToObject, itemSchema, receiveStockSchema, stockOutSchema } from "@/server/validation";
import type { FormState } from "./auth";

export async function addStock(_prev: FormState, formData: FormData): Promise<FormState> {
  // Receiving changes what the shop owns, so only the owner or a manager may do it
  // (the database refuses staff too).
  const session = await getSession();
  if (session.profile.role === "staff") return { error: "errorReceiveRole" };

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

export async function removeStock(_prev: FormState, formData: FormData): Promise<FormState> {
  // Taking goods off the books is the owner's or a manager's call (the database refuses staff too).
  const session = await getSession();
  if (session.profile.role === "staff") return { error: "errorOutRole" };

  const parsed = stockOutSchema.safeParse(formToObject(formData, ["item", "qty", "reason"]));
  if (!parsed.success) return { error: parsed.error.issues[0]?.path[0] === "reason" ? "errorOutReason" : "errorQty" };

  const result = await stockOut(parsed.data);
  if (!result.ok) {
    if (result.reason === "no_stock") return { error: "errorOutTooMany" };
    if (result.reason === "not_allowed") return { error: "errorOutRole" };
    return { error: "errorOutSave" };
  }
  return redirectTo(`/items?removed=${parsed.data.item}`);
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
