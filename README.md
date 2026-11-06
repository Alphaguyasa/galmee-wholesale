# Galmee Wholesale

Your notebook says people owe you money. This shows exactly who, how much, and since when.

Part of **Galmee**, business systems for Ethiopian businesses, by Alpha. Mobile-first PWA in Amharic, Afaan Oromo and English.

- Frontend: Next.js 16 (App Router, Cache Components) + Tailwind v4 + shadcn/ui, installable PWA
- i18n: next-intl, routes `/am` (default), `/om`, `/en`; Ethiopian calendar in the UI
- Backend: Supabase (shared project `galmee`), Postgres RLS per business
- Payments: Chapa (Telebirr, CBE Birr); SMS: AfroMessage; alerts: Telegram

Built daily by an autonomous Claude Code routine. See `ROADMAP.md` and `DAILY_LOG.md`.

## Develop

```bash
cp .env.example .env.local   # only public values; secrets live in Supabase
npm install
npm run dev                  # http://localhost:3000 -> /am
npm test                     # Vitest (Ethiopian calendar, ...)
npm run lint && npm run build
```

The service worker only registers in production builds (`npm run build && npm start`).

## Layout

- `src/app/[locale]/` pages, `src/app/manifest.ts` PWA manifest, `public/sw.js` offline shell
- `src/i18n/` next-intl routing and request config; `messages/*.json` all visible text
- `src/lib/supabase/` browser/server clients, generated `database.types.ts`
- `src/proxy.ts` locale routing + Supabase session refresh
- `src/lib/ethiopian-calendar.ts` Gregorian <-> Ethiopian helpers
- `supabase/migrations/` this product's `wh_` migrations (core lives in the shared project)
