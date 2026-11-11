import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CreditSaleInput } from "@/server/validation";

export type CreditSaleResult =
  | { ok: true }
  | { ok: false; reason: "over_limit" | "override_not_allowed" | "no_stock" | "paid_too_much" | "unknown_item" | "failed" };

const DB_ERRORS: Record<string, Exclude<CreditSaleResult, { ok: true }>["reason"]> = {
  credit_limit_exceeded: "over_limit",
  override_not_allowed: "override_not_allowed",
  insufficient_stock: "no_stock",
  paid_exceeds_total: "paid_too_much",
};

/**
 * Records a sale through wh_record_credit_sale. Prices come from the items table (read through RLS),
 * never from the form, so a tampered request cannot change what a customer is charged.
 */
export async function recordCreditSale(input: CreditSaleInput): Promise<CreditSaleResult> {
  const supabase = await createClient();
  const ids = [...new Set(input.lines.map((l) => l.item))];
  const { data: items, error: itemsError } = await supabase.from("items").select("id, price").eq("active", true).in("id", ids);
  if (itemsError) return { ok: false, reason: "failed" };
  const prices = new Map(items.map((i) => [i.id, i.price]));
  if (prices.size !== ids.length) return { ok: false, reason: "unknown_item" };

  const { error } = await supabase.rpc("wh_record_credit_sale", {
    p_lines: input.lines.map((l) => ({ item_id: l.item, qty: l.qty, price: prices.get(l.item) })),
    p_customer: input.customer,
    p_paid: input.paid,
    p_method: input.method,
    p_client_ref: input.clientRef,
    p_due: input.due,
    p_override: input.override,
    p_reason: input.reason,
  });
  if (!error) return { ok: true };
  const key = Object.keys(DB_ERRORS).find((k) => error.message.startsWith(k));
  return { ok: false, reason: key ? DB_ERRORS[key] : "failed" };
}
