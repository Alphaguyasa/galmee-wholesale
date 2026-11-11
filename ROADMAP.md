# ROADMAP: Galmee Wholesale

## M0: Foundation (shared pattern for all Galmee products)

- [x] Next.js App Router + TS + Tailwind + shadcn/ui scaffold; `npm run build` passes
- [x] PWA manifest, icons, offline shell; installs from Android Chrome
- [x] Supabase client (`@supabase/ssr`) with `.env.example` values; middleware session refresh
- [x] Auth: sign up, log in, log out; after first signup call `create_tenant` (vertical `wholesale`)
- [x] next-intl with `am`, `om`, `en`; language switcher; Ethiopic-friendly font (Noto Sans Ethiopic)
- [x] Ethiopian calendar date display helper + tests
- [x] App shell: bottom navigation on mobile, sidebar on desktop, tenant name and logo
- [ ] Staff management (owner only): invite staff, set role
- [x] Generated Supabase TypeScript types committed

## M1: Core screens

- [x] Customers: list, search by name/phone, detail with balance
- [x] Items and stock (if this product uses stock): list, add, receive stock
- [x] Payments and credit: record payment, credit statement
- [ ] Reports: today / this week / this Ethiopian month; export CSV
- [ ] Offline queue for the main money action with sync status indicator

## M2: Galmee Wholesale features

- [x] Customers sorted by amount owed (from `customer_balances`)
- [x] Customer statement: every debt and repayment with running balance
- [x] Quick 'give on credit' sale using `record_sale` with paid < total
- [x] Repayment entry using `record_repayment`
- [x] Overdue list with ageing buckets 0-30 / 31-60 / 60+ days
- [ ] Stock in/out and daily cash report
- [ ] Migration: wh_price_lists
- [ ] Migration: wh_price_list_items
- [ ] Migration: wh_customer_groups
- [x] Block a credit sale above the customer's `credit_limit` unless the owner overrides (log the override)
- [x] Ageing buckets as a SQL view with security_invoker
- [ ] Retail vs wholesale price per customer group

## M3: Notifications

- [ ] Weekly SMS to each customer with balance due
- [ ] Evening Telegram to owner: total owed, today's collections
- [ ] Edge Function reads `notifications` queue and sends (needs AfroMessage/Telegram keys: ask in the decision log)

## M4: Demo ready

- [ ] Demo tenant "Galmee Wholesale Demo" with data: 60 items (sugar, oil, flour, soap, etc.), 25 shop customers with realistic debts
- [ ] Demo login documented in the decision log for Alpha (password set by Alpha, never committed)
- [ ] 5-minute demo path works on a phone in airplane mode for the main action
- [ ] Amharic and Afaan Oromo text reviewed list in the decision log for Alpha (native speaker)

## M5: Client ready

- [ ] Receipt printing (58/80 mm thermal) and Telegram receipt
- [ ] Data import from Excel/CSV
- [ ] Export all tenant data to Excel
- [ ] Error monitoring hook (Sentry, DSN via env)
- [ ] README: setup, env vars, deploy steps

## Q: Quality and security baseline (do these inside M0 and M1, not after)

- [x] `docs/DESIGN.md` written per the frontend guidelines (palette, type with Ethiopic support, layout wireframes, reviewed against generic defaults)
- [x] Tailwind theme tokens and `next/font` fonts from DESIGN.md
- [x] `server-only` Data Access Layer in `src/server/dal/`; every Server Action validates with zod and re-checks auth + role
- [x] Security headers and CSP with nonce (the security guidelines section 5)
- [x] Cross-tenant RLS test extended to this product's tables and passing
- [x] Playwright screenshot script for 360 px and 1280 px
- [x] `npm audit` clean, Dependabot active
- [ ] Self-audit (the security guidelines section 9) recorded in the dev log
