import "server-only";
import { formatEthiopianShort } from "@/lib/ethiopian-calendar";
import { addisDay, addisTime, toCsv, type CsvCell, type ExportKind } from "@/lib/csv";
import { createClient } from "@/lib/supabase/server";
import { getUserId } from "./session";

type Client = Awaited<ReturnType<typeof createClient>>;

const PAGE = 1000;
// A hard stop so one request cannot run forever; far above a town wholesaler's book.
const MAX_ROWS = 200_000;

/** Reads every page of a query (PostgREST returns at most 1000 rows per request). */
async function readAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    if (error || !data) throw new Error("export_load_failed");
    rows.push(...data);
    if (data.length < PAGE) break;
  }
  return rows;
}

export type ExportAccess = "ok" | "logged_out" | "not_allowed";

/**
 * Only the owner or a manager may download the whole book (`book`); any active member may
 * download one shop's statement (`statement`), which they can already see on screen.
 */
export async function checkExportAccess(scope: "book" | "statement" = "book"): Promise<ExportAccess> {
  const userId = await getUserId();
  if (!userId) return "logged_out";
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("role, active").eq("user_id", userId).maybeSingle();
  if (!data?.active) return "not_allowed";
  if (scope === "book" && data.role !== "owner" && data.role !== "manager") return "not_allowed";
  return "ok";
}

function dateCells(iso: string): CsvCell[] {
  return [addisDay(iso), addisTime(iso), formatEthiopianShort(iso)];
}

const DATE_HEADER = ["date", "time", "ethiopian_date"];

async function customersCsv(supabase: Client): Promise<string> {
  const rows = await readAll((from, to) =>
    supabase
      .from("customer_balances")
      .select("customer_id, name, phone, credit_limit, balance, oldest_debt_at")
      .order("name")
      .order("customer_id")
      .range(from, to),
  );
  return toCsv(
    ["name", "phone", "credit_limit", "owes", "owing_since", "owing_since_ethiopian"],
    rows.map((r) => [
      r.name,
      r.phone,
      r.credit_limit,
      r.balance ?? 0,
      r.oldest_debt_at ? addisDay(r.oldest_debt_at) : null,
      r.oldest_debt_at ? formatEthiopianShort(r.oldest_debt_at) : null,
    ]),
  );
}

async function ledgerCsv(supabase: Client): Promise<string> {
  const rows = await readAll((from, to) =>
    supabase
      .from("credit_ledger")
      .select("id, created_at, type, amount, due_date, note, customers(name)")
      .order("created_at")
      .order("id")
      .range(from, to),
  );
  return toCsv(
    [...DATE_HEADER, "customer", "type", "amount", "pay_back_by", "note"],
    rows.map((r) => [...dateCells(r.created_at), r.customers?.name, r.type, r.amount, r.due_date, r.note]),
  );
}

async function paymentsCsv(supabase: Client): Promise<string> {
  const rows = await readAll((from, to) =>
    supabase
      .from("payments")
      .select("id, created_at, amount, method, reference, ref_table, customers(name)")
      .order("created_at")
      .order("id")
      .range(from, to),
  );
  return toCsv(
    [...DATE_HEADER, "customer", "amount", "method", "reference", "kind"],
    rows.map((r) => [
      ...dateCells(r.created_at),
      r.customers?.name,
      r.amount,
      r.method,
      r.reference,
      r.ref_table === "sales" ? "paid_at_sale" : "repayment",
    ]),
  );
}

async function salesCsv(supabase: Client): Promise<string> {
  const rows = await readAll((from, to) =>
    supabase
      .from("sales")
      .select("id, created_at, total, paid, method, customers(name)")
      .order("created_at")
      .order("id")
      .range(from, to),
  );
  return toCsv(
    [...DATE_HEADER, "receipt", "customer", "total", "paid", "on_credit", "method"],
    rows.map((r) => [
      ...dateCells(r.created_at),
      `#${r.id.replace(/-/g, "").slice(0, 8).toUpperCase()}`,
      r.customers?.name,
      r.total,
      r.paid,
      Math.max(Number(r.total) - Number(r.paid), 0),
      r.method,
    ]),
  );
}

async function itemsCsv(supabase: Client): Promise<string> {
  const [items, stock] = await Promise.all([
    readAll((from, to) =>
      supabase
        .from("items")
        .select("id, sku, name_en, name_am, name_om, category, unit, price, cost, reorder_level, active")
        .order("name_en")
        .order("id")
        .range(from, to),
    ),
    readAll((from, to) =>
      supabase.from("item_stock").select("item_id, qty_on_hand, next_expiry").order("item_id").range(from, to),
    ),
  ]);
  const onHand = new Map(stock.map((s) => [s.item_id, s]));
  return toCsv(
    ["sku", "name_en", "name_am", "name_om", "category", "unit", "price", "cost", "on_hand", "next_expiry", "reorder_level", "active"],
    items.map((i) => [
      i.sku,
      i.name_en,
      i.name_am,
      i.name_om,
      i.category,
      i.unit,
      i.price,
      i.cost,
      onHand.get(i.id)?.qty_on_hand ?? 0,
      onHand.get(i.id)?.next_expiry,
      i.reorder_level,
      i.active ? "yes" : "no",
    ]),
  );
}

/** The whole of one part of the business's book as CSV. RLS keeps it to the caller's business. */
export async function buildExport(kind: ExportKind): Promise<string> {
  const supabase = await createClient();
  switch (kind) {
    case "customers":
      return customersCsv(supabase);
    case "ledger":
      return ledgerCsv(supabase);
    case "payments":
      return paymentsCsv(supabase);
    case "sales":
      return salesCsv(supabase);
    case "items":
      return itemsCsv(supabase);
  }
}

/**
 * One shop's full statement (every debt and repayment with the running balance), oldest first.
 * Null when the customer is not in the caller's business (RLS hides it).
 */
export async function buildStatementExport(customerId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: customer, error } = await supabase
    .from("customers")
    .select("id, name, phone")
    .eq("id", customerId)
    .maybeSingle();
  if (error) throw new Error("export_load_failed");
  if (!customer) return null;

  const rows = await readAll((from, to) =>
    supabase
      .from("wh_customer_statement")
      .select("id, type, amount, balance_after, created_at, due_date, note")
      .eq("customer_id", customerId)
      .order("created_at")
      .order("id")
      .range(from, to),
  );
  return toCsv(
    [...DATE_HEADER, "customer", "phone", "type", "amount", "balance_after", "pay_back_by", "note"],
    rows.flatMap((r) =>
      r.created_at
        ? [[...dateCells(r.created_at), customer.name, customer.phone, r.type, r.amount, r.balance_after, r.due_date, r.note]]
        : [],
    ),
  );
}
