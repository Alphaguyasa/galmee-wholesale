import "server-only";
import { createClient } from "@/lib/supabase/server";

export type CustomerRowDTO = {
  id: string;
  name: string;
  phone: string | null;
  balance: number;
  daysOwing: number | null;
};

export type CustomerDetailDTO = CustomerRowDTO & { creditLimit: number | null };

export type AgeingRowDTO = {
  id: string;
  name: string;
  phone: string | null;
  days0To30: number;
  days31To60: number;
  daysOver60: number;
  total: number;
  oldestDays: number;
};

const DAY_MS = 86_400_000;

function daysSince(iso: string | null): number | null {
  return iso ? Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / DAY_MS)) : null;
}

/** Customers with the biggest debt first. `query` is already sanitised by the caller. */
export async function listCustomers(query: string): Promise<CustomerRowDTO[]> {
  const supabase = await createClient();
  let request = supabase
    .from("customer_balances")
    .select("customer_id, name, phone, balance, oldest_debt_at")
    .order("balance", { ascending: false })
    .order("name")
    .limit(200);
  if (query) request = request.or(`name.ilike.*${query}*,phone.ilike.*${query}*`);

  const { data, error } = await request;
  if (error) throw new Error("customers_load_failed");
  return data.flatMap((row) =>
    row.customer_id && row.name
      ? [
          {
            id: row.customer_id,
            name: row.name,
            phone: row.phone,
            balance: row.balance ?? 0,
            daysOwing: daysSince(row.oldest_debt_at),
          },
        ]
      : [],
  );
}

export async function getOwedSummary(): Promise<{ totalOwed: number; debtors: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("wh_owed_summary");
  if (error || !data?.[0]) throw new Error("summary_load_failed");
  return { totalOwed: data[0].total_owed, debtors: data[0].debtors };
}

export async function getCustomer(id: string): Promise<CustomerDetailDTO | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customer_balances")
    .select("customer_id, name, phone, balance, oldest_debt_at, credit_limit")
    .eq("customer_id", id)
    .maybeSingle();
  if (error) throw new Error("customer_load_failed");
  if (!data?.customer_id || !data.name) return null;
  return {
    id: data.customer_id,
    name: data.name,
    phone: data.phone,
    balance: data.balance ?? 0,
    daysOwing: daysSince(data.oldest_debt_at),
    creditLimit: data.credit_limit,
  };
}

export async function addCustomer(input: {
  name: string;
  phone: string | null;
  creditLimit: number | null;
}): Promise<{ id: string } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({ name: input.name, phone: input.phone, credit_limit: input.creditLimit })
    .select("id")
    .single();
  return error ? null : { id: data.id };
}

/** Customers with unpaid debt older than 30 days first. */
export async function listAgeing(): Promise<AgeingRowDTO[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wh_customer_ageing")
    .select("customer_id, name, phone, days_0_30, days_31_60, days_over_60, total, oldest_days")
    .order("days_over_60", { ascending: false })
    .order("days_31_60", { ascending: false })
    .order("total", { ascending: false })
    .limit(200);
  if (error) throw new Error("ageing_load_failed");
  return data.flatMap((row) =>
    row.customer_id && row.name
      ? [
          {
            id: row.customer_id,
            name: row.name,
            phone: row.phone,
            days0To30: row.days_0_30 ?? 0,
            days31To60: row.days_31_60 ?? 0,
            daysOver60: row.days_over_60 ?? 0,
            total: row.total ?? 0,
            oldestDays: row.oldest_days ?? 0,
          },
        ]
      : [],
  );
}

export async function getAgeingTotals(): Promise<{ days0To30: number; days31To60: number; daysOver60: number }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("wh_ageing_totals");
  if (error || !data?.[0]) throw new Error("ageing_totals_failed");
  return {
    days0To30: data[0].days_0_30,
    days31To60: data[0].days_31_60,
    daysOver60: data[0].days_over_60,
  };
}
