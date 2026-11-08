import "server-only";
import { cache } from "react";
import { getLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export type AppRole = Database["public"]["Enums"]["user_role"];

export type SessionDTO = {
  userId: string;
  profile: { fullName: string; role: AppRole };
  tenant: { name: string; logoUrl: string | null };
};

export async function redirectTo(href: string): Promise<never> {
  const locale = await getLocale();
  redirect({ href, locale });
  throw new Error("unreachable");
}

/** Verified user id (getClaims checks the JWT signature), or null. */
export const getUserId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
});

/** True when this user already belongs to a business. */
export const hasProfile = cache(async (userId: string): Promise<boolean> => {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("user_id").eq("user_id", userId).maybeSingle();
  return Boolean(data);
});

/** User, profile and business for logged-in screens. Redirects when any is missing. */
export const getSession = cache(async (): Promise<SessionDTO> => {
  const userId = await getUserId();
  if (!userId) return redirectTo("/login");

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, active, tenants(name, logo_url)")
    .eq("user_id", userId)
    .maybeSingle();
  if (!profile || !profile.tenants) return redirectTo("/onboarding");
  if (!profile.active) {
    await supabase.auth.signOut();
    return redirectTo("/login");
  }

  return {
    userId,
    profile: { fullName: profile.full_name, role: profile.role },
    tenant: { name: profile.tenants.name, logoUrl: profile.tenants.logo_url },
  };
});
