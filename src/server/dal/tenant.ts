import "server-only";
import type { AppLocale } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

/** Creates the shop's tenant and makes the caller its owner (core RPC `create_tenant`). */
export async function createWholesaleTenant(input: {
  name: string;
  fullName: string;
  phone: string;
  lang: AppLocale;
}): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("create_tenant", {
    p_name: input.name,
    p_vertical: "wholesale",
    p_full_name: input.fullName,
    p_phone: input.phone,
    p_lang: input.lang,
  });
  return { ok: !error };
}
