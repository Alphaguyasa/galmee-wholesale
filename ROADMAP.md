# ROADMAP: Galmee Wholesale

## M0: Foundation (shared pattern for all Galmee products)

- [ ] Next.js App Router + TS + Tailwind + shadcn/ui scaffold; `npm run build` passes
- [ ] PWA manifest, icons, offline shell; installs from Android Chrome
- [ ] Supabase client (`@supabase/ssr`) with `.env.example` values; middleware session refresh
- [ ] Auth: sign up, log in, log out; after first signup call `create_tenant` (vertical `wholesale`)
- [ ] next-intl with `am`, `om`, `en`; language switcher; Ethiopic-friendly font (Noto Sans Ethiopic)
- [ ] Ethiopian calendar date display helper + tests
- [ ] App shell: bottom navigation on mobile, sidebar on desktop, tenant name and logo
- [ ] Staff management (owner only): invite staff, set role
- [ ] Generated Supabase TypeScript types committed

## M1: Core screens

- [ ] Customers: list, search by name/phone, detail with balance
- [ ] Items and stock (if this product uses stock): list, add, receive stock
- [ ] Payments and credit: record payment, credit statement
- [ ] Reports: today / this week / this Ethiopian month; export CSV
- [ ] Offline queue for the main money action with sync status indicator

## M2: Galmee Wholesale features

- [ ] Customers sorted by amount owed (from `customer_balances`)
- [ ] Customer statement: every debt and repayment with running balance
- [ ] Quick 'give on credit' sale using `record_sale` with paid < total
- [ ] Repayment entry using `record_repayment`
- [ ] Overdue list with ageing buckets 0-30 / 31-60 / 60+ days
- [ ] Stock in/out and daily cash report
- [ ] Migration: wh_price_lists
- [ ] Migration: wh_price_list_items
- [ ] Migration: wh_customer_groups
- [ ] Block a credit sale above the customer's `credit_limit` unless the owner overrides (log the override)
- [ ] Ageing buckets as a SQL view with security_invoker
- [ ] Retail vs wholesale price per customer group

## M3: Notifications

- [ ] Weekly SMS to each customer with balance due
- [ ] Evening Telegram to owner: total owed, today's collections
- [ ] Edge Function reads `notifications` queue and sends (needs AfroMessage/Telegram keys: ask in NEEDS_APPROVAL.md)

## M4: Demo ready

- [ ] Demo tenant "Galmee Wholesale Demo" with data: 60 items (sugar, oil, flour, soap, etc.), 25 shop customers with realistic debts
- [ ] Demo login documented in NEEDS_APPROVAL.md for Alpha (password set by Alpha, never committed)
- [ ] 5-minute demo path works on a phone in airplane mode for the main action
- [ ] Amharic and Afaan Oromo text reviewed list in NEEDS_APPROVAL.md for Alpha (native speaker)

## M5: Client ready

- [ ] Receipt printing (58/80 mm thermal) and Telegram receipt
- [ ] Data import from Excel/CSV
- [ ] Export all tenant data to Excel
- [ ] Error monitoring hook (Sentry, DSN via env)
- [ ] README: setup, env vars, deploy steps
