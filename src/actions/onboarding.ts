"use server";

import { getLocale } from "next-intl/server";
import { routing, type AppLocale } from "@/i18n/routing";
import { getUserId, hasProfile, redirectTo } from "@/server/dal/session";
import { createWholesaleTenant } from "@/server/dal/tenant";
import { formToObject, onboardingSchema } from "@/server/validation";
import type { FormState } from "./auth";

export async function createShop(_prev: FormState, formData: FormData): Promise<FormState> {
  // Server Actions are public endpoints: re-check auth here, not only on the page.
  const userId = await getUserId();
  if (!userId) return redirectTo("/login");
  if (await hasProfile(userId)) return redirectTo("/customers");

  const parsed = onboardingSchema.safeParse(formToObject(formData, ["shopName", "fullName", "phone"]));
  if (!parsed.success) {
    const phoneIssue = parsed.error.issues.some((i) => i.path[0] === "phone");
    return { error: phoneIssue ? "errorPhone" : "errorRequired" };
  }

  const locale = await getLocale();
  const { ok } = await createWholesaleTenant({
    name: parsed.data.shopName,
    fullName: parsed.data.fullName,
    phone: parsed.data.phone,
    lang: (routing.locales as readonly string[]).includes(locale) ? (locale as AppLocale) : routing.defaultLocale,
  });
  if (!ok) return { error: "error" };
  return redirectTo("/customers");
}
