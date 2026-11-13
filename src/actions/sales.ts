"use server";

import { getCustomer } from "@/server/dal/customers";
import { recordCreditSale } from "@/server/dal/sales";
import { getSession, redirectTo } from "@/server/dal/session";
import { creditSaleSchema, formToObject } from "@/server/validation";

export type SaleFormState = { error?: string; canOverride?: boolean } | undefined;

const ERROR_KEYS = {
  over_limit: "errorOverLimit",
  override_not_allowed: "errorOverrideOwner",
  no_stock: "errorNoStock",
  paid_too_much: "errorPaidTooMuch",
  unknown_item: "errorItem",
  failed: "errorSave",
} as const;

export async function giveOnCredit(_prev: SaleFormState, formData: FormData): Promise<SaleFormState> {
  const session = await getSession();
  const parsed = creditSaleSchema.safeParse(
    formToObject(formData, ["customer", "clientRef", "lines", "paid", "method", "due", "override", "reason"]),
  );
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    if (field === "lines") return { error: "errorLines" };
    if (field === "paid") return { error: "errorPaid" };
    if (field === "due") return { error: "errorDue" };
    return { error: "errorSave" };
  }

  // Reading through RLS proves the customer belongs to this shop.
  const customer = await getCustomer(parsed.data.customer);
  if (!customer) return { error: "errorSave" };

  const result = await recordCreditSale(parsed.data);
  if (!result.ok) {
    return {
      error: ERROR_KEYS[result.reason],
      canOverride: result.reason === "over_limit" && session.profile.role === "owner",
    };
  }
  return redirectTo(`/customers/${customer.id}/sales/${result.saleId}?new=1`);
}
