import createIntlMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/proxy";

const handleI18nRouting = createIntlMiddleware(routing);

export default async function proxy(request: NextRequest) {
  const response = handleI18nRouting(request);
  return updateSession(request, response);
}

export const config = {
  // Skip Next internals, API routes, the service worker, the manifest and static files.
  matcher: ["/((?!api|_next|_vercel|sw\\.js|manifest\\.webmanifest|.*\\..*).*)"],
};
