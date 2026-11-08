"use server";

import { addCustomer, getCustomer, recordRepayment } from "@/server/dal/customers";
import { getSession, redirectTo } from "@/server/dal/session";
import { customerSchema, formToObject, repaymentSchema } from "@/server/validation";
import type { FormState } from "./auth";

export async function createCustomer(_prev: FormState, formData: FormData): Promise<FormState> {
  // Any active member of the shop may add a customer (RLS enforces the tenant).
  await getSession();

  const parsed = customerSchema.safeParse(formToObject(formData, ["name", "phone", "creditLimit"]));
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    if (field === "phone") return { error: "errorPhone" };
    if (field === "creditLimit") return { error: "errorLimit" };
    return { error: "errorName" };
  }

  const created = await addCustomer(parsed.data);
  if (!created) return { error: "errorSave" };
  return redirectTo(`/customers/${created.id}`);
}

export async function addRepayment(_prev: FormState, formData: FormData): Promise<FormState> {
  await getSession();

  const parsed = repaymentSchema.safeParse(formToObject(formData, ["customer", "amount", "method", "reference"]));
  if (!parsed.success) return { error: "errorAmount" };

  // Reading through RLS proves the customer belongs to this shop.
  const customer = await getCustomer(parsed.data.customer);
  if (!customer) return { error: "errorSave" };
  if (parsed.data.amount > customer.balance) return { error: "errorTooMuch" };

  const { ok } = await recordRepayment(parsed.data);
  if (!ok) return { error: "errorSave" };
  return redirectTo(`/customers/${customer.id}?saved=1`);
}
