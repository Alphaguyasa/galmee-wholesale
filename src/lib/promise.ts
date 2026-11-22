import { shiftIsoDay } from "./daily-cash";

/** Furthest a promise may be set, in days from today (the database refuses later dates). */
export const MAX_PROMISE_DAYS = 90;

export type PromiseState = "waiting" | "due_today" | "kept" | "broken" | "replaced";

const STATES: readonly PromiseState[] = ["waiting", "due_today", "kept", "broken", "replaced"];

/** The state from the database, or "waiting" if it is something this app does not know. */
export function toPromiseState(value: string | null | undefined): PromiseState {
  return STATES.includes(value as PromiseState) ? (value as PromiseState) : "waiting";
}

/** Quick choices shown as buttons: tomorrow, in 3 days, in a week (Addis days, 'YYYY-MM-DD'). */
export function quickPromiseDays(today: string): { days: 1 | 3 | 7; day: string }[] {
  return ([1, 3, 7] as const).map((days) => ({ days, day: shiftIsoDay(today, days) }));
}

/** True when `day` is between today and today + 90 (both 'YYYY-MM-DD', string order works). */
export function isAllowedPromiseDay(day: string, today: string): boolean {
  return day >= today && day <= shiftIsoDay(today, MAX_PROMISE_DAYS);
}
