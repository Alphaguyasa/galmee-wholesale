# NEEDS_APPROVAL: Galmee Wholesale

The routine writes questions here; Alpha answers under each one.

## Open

### 1. Amharic and Afaan Oromo text review (2026-11-06)
All visible strings are in `messages/am.json` and `messages/om.json` (first draft by the routine). Please have a native speaker check them, especially:
- App name: "ገልሜ ጅምላ" (am) and "Galmee Jumlaa" (om). Keep, or use "Galmee" untranslated everywhere?
- The tagline and the four home-screen feature lines.
- `public/offline.html` repeats the offline message in all three languages.

**Answer:**

### 2. Ethiopian month names in Afaan Oromo (2026-11-06)
`src/lib/ethiopian-calendar.ts` uses Fulbaana, Onkoloolessa, Sadaasa, Muddee, Amajjii, Guraandhala, Bitootessa, Ebla, Caamsaa, Waxabajjii, Adoolessa, Hagayya, Qaammee for Meskerem…Pagume. Is this the naming your clients expect, or should `om` show the Amharic month names written in Qubee (Meskerem, Tiqimt, …)?

**Answer:**

### 3. Network access for the nightly routine (optional, 2026-11-06)
The routine's sandbox cannot reach `ui.shadcn.com` (shadcn registry) or `fonts.googleapis.com`. Worked around it: shadcn components are written by hand in `src/components/ui/` (same code as the registry), and fonts are self-hosted via `@fontsource-variable/noto-sans(-ethiopic)` (better for offline anyway). If you want the routine to use `npx shadcn add`, allow `ui.shadcn.com` in Claude settings > Capabilities. Not blocking.

**Answer:**

## Answered

_(none yet)_
