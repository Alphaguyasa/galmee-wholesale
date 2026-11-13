import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { AppLocale } from "@/i18n/routing";
import { receiptRef } from "@/lib/receipt";
import type { CreditSaleInput } from "@/server/validation";

export type CreditSaleResult =
  | { ok: true; saleId: string }
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

  const { data, error } = await supabase.rpc("wh_record_credit_sale", {
    p_lines: input.lines.map((l) => ({ item_id: l.item, qty: l.qty, price: prices.get(l.item) })),
    p_customer: input.customer,
    p_paid: input.paid,
    p_method: input.method,
    p_client_ref: input.clientRef,
    p_due: input.due,
    p_override: input.override,
    p_reason: input.reason,
  });
  if (!error && data) return { ok: true, saleId: data };
  if (!error) return { ok: false, reason: "failed" };
  const key = Object.keys(DB_ERRORS).find((k) => error.message.startsWith(k));
  return { ok: false, reason: key ? DB_ERRORS[key] : "failed" };
}

export type SaleReceiptDTO = {
  id: string;
  /** Short printable reference taken from the sale id. */
  ref: string;
  customerId: string;
  customerName: string;
  createdAt: string;
  total: number;
  paid: number;
  method: string | null;
  lines: { name: string; unit: string; qty: number; price: number }[];
  /** Customer balance right after this sale; null when nothing went on credit. */
  balanceAfter: number | null;
  dueDate: string | null;
};

function itemName(item: { name_en: string; name_am: string | null; name_om: string | null }, locale: AppLocale) {
  if (locale === "am") return item.name_am || item.name_en;
  if (locale === "om") return item.name_om || item.name_en;
  return item.name_en;
}

/**
 * One sale with its lines and the balance it left, for the receipt. Every read goes through RLS,
 * so a sale from another shop is simply not found. `customerId` must match the sale.
 */
export async function getSaleReceipt(saleId: string, customerId: string, locale: AppLocale): Promise<SaleReceiptDTO | null> {
  const supabase = await createClient();
  const { data: sale, error } = await supabase
    .from("sales")
    .select("id, customer_id, total, paid, method, created_at, customers(name), sale_lines(item_id, qty, price)")
    .eq("id", saleId)
    .eq("customer_id", customerId)
    .maybeSingle();
  if (error) throw new Error("sale_load_failed");
  if (!sale?.customer_id || !sale.customers) return null;

  const itemIds = [...new Set(sale.sale_lines.map((l) => l.item_id))];
  const { data: items, error: itemsError } = itemIds.length
    ? await supabase.from("items").select("id, name_en, name_am, name_om, unit").in("id", itemIds)
    : { data: [], error: null };
  if (itemsError) throw new Error("sale_load_failed");
  const byId = new Map(items.map((i) => [i.id, i]));

  const { data: debt, error: debtError } = await supabase
    .from("credit_ledger")
    .select("id, due_date")
    .eq("ref_table", "sales")
    .eq("ref_id", sale.id)
    .eq("type", "debt")
    .maybeSingle();
  if (debtError) throw new Error("sale_load_failed");

  let balanceAfter: number | null = null;
  if (debt) {
    const { data: row, error: rowError } = await supabase
      .from("wh_customer_statement")
      .select("balance_after")
      .eq("id", debt.id)
      .maybeSingle();
    if (rowError) throw new Error("sale_load_failed");
    balanceAfter = row?.balance_after ?? null;
  }

  return {
    id: sale.id,
    ref: receiptRef(sale.id),
    customerId: sale.customer_id,
    customerName: sale.customers.name,
    createdAt: sale.created_at,
    total: sale.total,
    paid: sale.paid,
    method: sale.method,
    lines: sale.sale_lines.map((l) => {
      const item = byId.get(l.item_id);
      return { name: item ? itemName(item, locale) : "", unit: item?.unit ?? "", qty: l.qty, price: l.price };
    }),
    balanceAfter,
    dueDate: debt?.due_date ?? null,
  };
}
