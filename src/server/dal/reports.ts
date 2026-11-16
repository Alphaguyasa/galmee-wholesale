import "server-only";
import { createClient } from "@/lib/supabase/server";
import { CASH_METHODS, summariseDailyCash, type CashMethod, type DailyCashDTO } from "@/lib/daily-cash";
import { getSession } from "./session";

/** One Addis Ababa day's money by payment method. `day` is a Gregorian 'YYYY-MM-DD'. */
export async function getDailyCash(day: string): Promise<DailyCashDTO> {
  await getSession();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("wh_daily_cash", { p_day: day });
  if (error) throw new Error("daily_cash_failed");
  return summariseDailyCash(
    day,
    data.filter((r) => (CASH_METHODS as readonly string[]).includes(r.method)).map((r) => ({
      method: r.method as CashMethod,
      salesCount: Number(r.sales_count),
      salesTotal: Number(r.sales_total),
      salesCollected: Number(r.sales_collected),
      repayments: Number(r.repayments),
      repaymentCount: Number(r.repayment_count),
      creditGiven: Number(r.credit_given),
    })),
  );
}
