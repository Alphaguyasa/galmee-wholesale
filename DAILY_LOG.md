# DAILY_LOG: Galmee Wholesale

Newest entries first.

## 2026-11-06 (routine run 1)

**Shipped (M0 foundation, 6 of 9 items):**
- Next.js 16.4 App Router + TypeScript + Tailwind v4 + shadcn/ui (new-york tokens, Button, Card), Galmee green theme. Cache Components on.
- next-intl with `/am`, `/om`, `/en` routes (default `am`, `/` redirects to `/am`), language switcher, all strings in `messages/*.json`. Noto Sans + Noto Sans Ethiopic self-hosted (works offline).
- PWA: `manifest.webmanifest`, icons (192/512/maskable/apple), service worker `public/sw.js` (network-first pages, cached build assets, trilingual `offline.html`).
- Supabase `@supabase/ssr` browser/server clients and session refresh in `src/proxy.ts` (Next 16 renamed middleware to proxy), typed with generated `database.types.ts` (core schema only; no `wh_` objects yet).
- Ethiopian calendar helper (`src/lib/ethiopian-calendar.ts`): Gregorian <-> Ethiopian via JDN, Addis Ababa (UTC+3) day boundary, month names am/om/en, Ethiopian month range for reports. 14 Vitest tests (`npm test`), including a 6-year round trip.
- Landing page at 360px checked in Chromium: no horizontal scroll, no console errors, service worker registers.

**No database changes this run** (no migrations applied).

**Next:** Auth (sign up / log in / log out, then `create_tenant` with vertical `wholesale`), then app shell (bottom nav, tenant name), then staff management.

**Blockers:** none. Questions for Alpha in NEEDS_APPROVAL.md (text review, Oromo month names, optional network allowlist).

## 2026-11-06

- Repo created. Shared Supabase project `galmee` live with core schema (tenants, roles, customers, stock, sales, credit, bookings, audit). Next: M0 foundation.
