import createIntlMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { hasLocale } from "next-intl";
import { routing } from "@/i18n/routing";
import { buildCsp } from "@/lib/security-headers";
import { refreshSession } from "@/lib/supabase/proxy";

const handleI18nRouting = createIntlMiddleware(routing);

// Paths (after the locale) a logged-out visitor may open.
const PUBLIC_PATHS = ["", "/login", "/signup"];

/**
 * Sets a per-request CSP nonce, refreshes the session cookie, redirects logged-out
 * users and applies locale routing. Not an authorization layer: the DAL and RLS
 * check access again.
 */
export default async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);
  // next-intl copies these request headers on, and Next reads the nonce from the CSP header.
  request.headers.set("x-nonce", nonce);
  request.headers.set("Content-Security-Policy", csp);

  const { isLoggedIn, refreshed } = await refreshSession(request);

  const [, first, ...rest] = request.nextUrl.pathname.split("/");
  const inner = rest.length ? `/${rest.join("/")}` : "";
  const isLocalized = hasLocale(routing.locales, first);

  let response: NextResponse;
  if (isLocalized && !isLoggedIn && !PUBLIC_PATHS.includes(inner)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${first}/login`;
    url.search = "";
    response = NextResponse.redirect(url);
  } else {
    response = handleI18nRouting(request);
  }

  for (const { name, value, options } of refreshed) response.cookies.set(name, value, options);
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // Skip Next internals, API routes, the service worker, the manifest and static files.
  matcher: ["/((?!api|_next|_vercel|sw\\.js|manifest\\.webmanifest|.*\\..*).*)"],
};
