import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { hasSupabaseEnv, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";

/**
 * Refreshes the Supabase auth session on every request and writes the
 * refreshed cookies onto `response` (the response built by next-intl).
 */
export async function updateSession(request: NextRequest, response: NextResponse) {
  if (!hasSupabaseEnv) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Do not put code between createServerClient and getClaims():
  // it validates the JWT and triggers the refresh when needed.
  await supabase.auth.getClaims();

  return response;
}
