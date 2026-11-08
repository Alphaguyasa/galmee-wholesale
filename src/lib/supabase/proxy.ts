import { createServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { hasSupabaseEnv, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";

type CookieToSet = { name: string; value: string; options?: Record<string, unknown> };

/**
 * Validates and refreshes the auth session. Refreshed cookies are written onto the
 * request, so the page sees them, and returned so the caller can set them on the response.
 */
export async function refreshSession(request: NextRequest) {
  const refreshed: CookieToSet[] = [];
  if (!hasSupabaseEnv) return { isLoggedIn: false, refreshed };

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        refreshed.push(...cookiesToSet);
      },
    },
  });

  // Do not put code between createServerClient and getClaims():
  // it validates the JWT and triggers the refresh when needed.
  const { data } = await supabase.auth.getClaims();
  return { isLoggedIn: Boolean(data?.claims), refreshed };
}
