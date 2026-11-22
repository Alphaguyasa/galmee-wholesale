"use server";

import { addisToday } from "@/lib/daily-cash";
import { isAllowedPromiseDay } from "@/lib/promise";
import { getCustomer } from "@/server/dal/customers";
import { logPromise } from "@/server/dal/promises";
import { getSession, redirectTo } from "@/server/dal/session";
import { formToObject, promiseSchema } from "@/server/validation";
import type { FormState } from "./auth";

export async function addPromise(_prev: FormState, formData: FormData): Promise<FormState> {
  // Any active member may log a promise; staff collect too.
  await getSession();

  const parsed = promiseSchema.safeParse(formToObject(formData, ["customer", "promisedOn", "amount", "note"]));
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    return { error: field === "amount" ? "errorPromiseAmount" : field === "note" ? "errorSave" : "errorPromiseDate" };
  }
  if (!isAllowedPromiseDay(parsed.data.promisedOn, addisToday())) return { error: "errorPromiseDate" };

  // Reading through RLS proves the customer belongs to this shop.
  const customer = await getCustomer(parsed.data.customer);
  if (!customer) return { error: "errorSave" };
  if (customer.balance <= 0) return { error: "errorNothingOwed" };
  if (parsed.data.amount !== null && parsed.data.amount > customer.balance) return { error: "errorPromiseAmount" };

  const result = await logPromise(parsed.data);
  if (!result.ok) return { error: result.error };
  return redirectTo(`/customers/${customer.id}`);
}
