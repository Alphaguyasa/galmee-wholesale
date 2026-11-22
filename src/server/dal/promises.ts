import "server-only";
import { toPromiseState, type PromiseState } from "@/lib/promise";
import { createClient } from "@/lib/supabase/server";

export type PromiseDTO = {
  id: string;
  customerId: string;
  name: string;
  phone: string | null;
  promisedOn: string;
  /** Promised amount, or null when the shop promised to clear everything it owed. */
  amount: number | null;
  owedAtPromise: number;
  paidSince: number;
  owedNow: number;
  note: string | null;
  state: PromiseState;
  daysLate: number;
  createdAt: string;
};

const COLUMNS =
  "id, customer_id, name, phone, promised_on, amount, owed_at_promise, paid_since, owed_now, note, state, days_late, created_at";

type Row = {
  id: string | null;
  customer_id: string | null;
  name: string | null;
  phone: string | null;
  promised_on: string | null;
  amount: number | null;
  owed_at_promise: number | null;
  paid_since: number | null;
  owed_now: number | null;
  note: string | null;
  state: string | null;
  days_late: number | null;
  created_at: string | null;
};

function toDTO(rows: Row[] | null): PromiseDTO[] {
  return (rows ?? []).flatMap((r) =>
    r.id && r.customer_id && r.promised_on && r.created_at
      ? [
          {
            id: r.id,
            customerId: r.customer_id,
            name: r.name ?? "",
            phone: r.phone,
            promisedOn: r.promised_on,
            amount: r.amount,
            owedAtPromise: r.owed_at_promise ?? 0,
            paidSince: r.paid_since ?? 0,
            owedNow: r.owed_now ?? 0,
            note: r.note,
            state: toPromiseState(r.state),
            daysLate: r.days_late ?? 0,
            createdAt: r.created_at,
          },
        ]
      : [],
  );
}

/** The newest promises of one shop (the first is the current one when its status is open). RLS limits rows to the caller's business. */
export async function getCustomerPromises(customerId: string, limit = 6): Promise<PromiseDTO[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wh_promise_status")
    .select(COLUMNS)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error("promises_load_failed");
  return toDTO(data);
}

export type LogPromiseError = "errorPromiseDate" | "errorPromiseAmount" | "errorNothingOwed" | "errorSave";

/** Writes a promise through `wh_log_promise`, which replaces the shop's open promise. */
export async function logPromise(input: {
  customer: string;
  promisedOn: string;
  amount: number | null;
  note: string | null;
}): Promise<{ ok: true } | { ok: false; error: LogPromiseError }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("wh_log_promise", {
    p_customer: input.customer,
    p_promised_on: input.promisedOn,
    p_amount: input.amount ?? undefined,
    p_note: input.note ?? undefined,
  });
  if (!error) return { ok: true };
  const message = error.message ?? "";
  if (message.includes("bad_date")) return { ok: false, error: "errorPromiseDate" };
  if (message.includes("bad_amount")) return { ok: false, error: "errorPromiseAmount" };
  if (message.includes("nothing_owed")) return { ok: false, error: "errorNothingOwed" };
  return { ok: false, error: "errorSave" };
}

/** Open promises that need a call today: broken ones (latest date first) then the ones due today. */
export async function getPromisesToChase(limit = 50): Promise<PromiseDTO[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("wh_promise_status")
    .select(COLUMNS)
    .eq("status", "open")
    .in("state", ["broken", "due_today"])
    .order("promised_on", { ascending: true })
    .limit(limit);
  if (error) throw new Error("promises_load_failed");
  const rows = toDTO(data);
  return [...rows.filter((r) => r.state === "broken"), ...rows.filter((r) => r.state === "due_today")];
}
