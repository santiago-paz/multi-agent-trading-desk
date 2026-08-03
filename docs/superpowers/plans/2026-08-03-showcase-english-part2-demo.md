# Showcase English — Part 2: Demo → English — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Make the public demo render fully in English — default+lock the locale to `en`, hide the switcher, and translate the demo-only data — while the real app (flag off) stays Spanish-default.

**Architecture:** On the `demo` branch (which now has the Part 1 i18n infrastructure merged in). All changes gate on `process.env.NEXT_PUBLIC_DEMO_MODE === 'true'`, so the real app is unaffected. Demo-only data files (`src/lib/demo/*`) are translated directly (never shown in the real app).

**Tech Stack:** Next.js 16, React 19, TypeScript.

## Global Constraints

- **Real app unchanged:** every gating check is `process.env.NEXT_PUBLIC_DEMO_MODE === 'true'`; the non-demo path must behave exactly as before (es default, switcher visible, Spanish metadata, `es-AR` dates).
- **Demo fully English:** after this plan, no Spanish should be visible anywhere in the demo (`NEXT_PUBLIC_DEMO_MODE=true`).
- **Determinism** preserved in demo data (seed via `hashString`; no `Date.now()`/`Math.random()` in generated content).
- **Green gates:** `npm test`, `npm run lint` (no new), `npx tsc --noEmit` (no new vs the 6 pre-existing), `npm run build` (with and without the flag).

## File Structure

```
MODIFIED:
  src/lib/i18n/context.tsx                       (default+lock locale to en in demo)
  src/components/ui/DisplayPropertiesWindow.tsx  (hide Language fieldset in demo)
  src/app/trading/page.tsx                       (tray badge → English)
  src/app/layout.tsx                             (English metadata in demo)
  src/lib/demo/oraculo.ts                        (English wiki topics + oracle lines)
  src/lib/demo/company-detail.ts                 (English description + news)
  src/components/ui/BacktestingWindow.tsx        (formatRunDate → locale-aware)
```

---

## Task 1: Locale gating + hide switcher

**Files:** Modify `src/lib/i18n/context.tsx`, `src/components/ui/DisplayPropertiesWindow.tsx`

- [ ] **Step 1: Default + lock locale to `en` in demo (`context.tsx`)**

```ts
const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEMO ? 'en' : 'es');

  useEffect(() => {
    if (DEMO) return; // demo is locked to English — ignore any stored preference
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'es' || stored === 'en') setLocaleState(stored);
  }, []);

  const setLocale = useCallback((l: Locale) => {
    if (DEMO) return; // locked in demo mode
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
  }, []);
  // …unchanged provider return…
}
```

- [ ] **Step 2: Hide the Language fieldset in demo (`DisplayPropertiesWindow.tsx`)**

Find the `<fieldset>` containing `<legend>Language</legend>` (~line 467) and wrap the whole fieldset:
```tsx
{process.env.NEXT_PUBLIC_DEMO_MODE !== 'true' && (
  <fieldset>
    <legend>Language</legend>
    …existing language select…
  </fieldset>
)}
```

- [ ] **Step 3: Verify**

Run: `npm test` (LocaleProvider default path unchanged), `npx tsc --noEmit` (no new). Build both ways to confirm gating:
```bash
npm run build && NEXT_PUBLIC_DEMO_MODE=true npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/i18n/context.tsx src/components/ui/DisplayPropertiesWindow.tsx
git commit -m "feat(demo): default+lock locale to English, hide language switcher"
```

---

## Task 2: Demo-visible strings → English (badge, metadata, demo data)

**Files:** Modify `src/app/trading/page.tsx`, `src/app/layout.tsx`, `src/lib/demo/oraculo.ts`, `src/lib/demo/company-detail.ts`

- [ ] **Step 1: Tray badge → English (`trading/page.tsx`)**

Replace `🔮 MODO DEMO · datos ficticios` with `🔮 DEMO MODE · fictitious data` and the `title` tooltip `Datos 100% ficticios · no es asesoramiento financiero` with `100% fictitious data · not financial advice`. (This badge is already demo-gated, so no extra gating needed.)

- [ ] **Step 2: English metadata in demo (`layout.tsx`)**

Gate the Spanish metadata strings on the flag:
```ts
const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
// description:
DEMO
  ? "AI-powered CEDEAR portfolio & investment management platform with real-time tracking and smart trading."
  : "Plataforma de gestión de portafolio e inversiones en CEDEARs con análisis impulsado por IA, seguimiento en tiempo real y trading inteligente.",
```
Apply the same DEMO-ternary to `keywords` (English list in demo) and the `openGraph.description`. Keep `title: "CEDEARs Fund"` (brand) unchanged.

- [ ] **Step 3: English demo oracle + topics (`oraculo.ts`)**

Translate `DEMO_WIKI_TOPICS` (English titles/extracts) and `ORACULO_TEMPLATES` (English whimsical fortune-teller). Keep the `(t) => ...${t}...` interpolation and the deterministic structure. Example:
```ts
export const DEMO_WIKI_TOPICS = [
  { title: 'The Lighthouse of Alexandria', extract: 'One of the seven wonders of the ancient world, a guide for lost sailors.' },
  { title: 'The Antikythera Mechanism', extract: 'An ancient Greek device considered the first analog computer.' },
  { title: 'The Double-Slit Experiment', extract: 'A demonstration of wave-particle duality in quantum mechanics.' },
  { title: 'The Silk Road', extract: 'A network of trade routes that connected East and West for centuries.' },
  { title: 'The Giant Squid', extract: 'An elusive deep-sea creature that inspired kraken legends.' },
  { title: 'The Library of Babel', extract: 'Borges’ tale of an infinite library containing every possible book.' },
];

const ORACULO_TEMPLATES = [
  (t: string) => `The tides of fate whisper that ${t} and the markets dance the same invisible waltz (not advice, it's destiny).`,
  (t: string) => `Where others see noise, the oracle sees ${t} foreshadowing a turn in the markets (not advice, it's an omen).`,
  (t: string) => `The incense smoke traces the ticker ${t} over tomorrow's candlesticks (not advice, it's prophecy).`,
];
```

- [ ] **Step 4: English demo company data (`company-detail.ts`)**

Translate the `description` (line ~94) and the `getDemoCompanyNews` items (titles + text, ~lines 160-165) to English. Keep interpolation (`${name(sym)}`, `${sector}`, `${n}`, `${fmpTicker}`). Example description:
```ts
description: `${name(sym)} is a ${sector} sector company with global operations and a well-established track record in its industry.`,
```
Grep the whole file for remaining Spanish (accented + non-accented) and translate every user-facing string. (Sector/industry values are already English from Part-1-era work.)

- [ ] **Step 5: Verify + commit**

Run: `grep -rnE "[áéíóúñ¿¡]" src/lib/demo/oraculo.ts src/lib/demo/company-detail.ts` (+ a non-accented Spanish sweep) → none remain; `npm test`; `npx tsc --noEmit` (no new).
```bash
git add src/app/trading/page.tsx src/app/layout.tsx src/lib/demo/oraculo.ts src/lib/demo/company-detail.ts
git commit -m "feat(demo): translate badge, metadata, oracle and company demo data to English"
```

---

## Task 3: Locale-aware run dates + full verification + deploy

**Files:** Modify `src/components/ui/BacktestingWindow.tsx`

- [ ] **Step 1: Make `formatRunDate` locale-aware**

`formatRunDate` (line ~109) hardcodes `'es-AR'`. Make it take the active locale so English-demo History dates aren't Argentine-format. Add a param and map locale→BCP-47:
```ts
function formatRunDate(ts: number, locale: Locale): string {
  const tag = locale === 'en' ? 'en-US' : 'es-AR';
  const d = new Date(ts);
  return d.toLocaleDateString(tag, { day: '2-digit', month: '2-digit', year: '2-digit' })
    + ' ' + d.toLocaleTimeString(tag, { hour: '2-digit', minute: '2-digit' });
}
```
In the component, get `const { locale } = useLocale();` (import from `@/lib/i18n/context`) and call `formatRunDate(run.timestamp, locale)` at the call site (~line 1326). Confirm `useLocale` is importable there; if `BacktestingWindow` already reads locale indirectly, reuse it. Do not change any other logic.

- [ ] **Step 2: Green gates**

Run: `npm test` (0 fail), `npm run lint` (no new), `npx tsc --noEmit` (no new), `npm run build` and `NEXT_PUBLIC_DEMO_MODE=true npm run build` (both succeed).

- [ ] **Step 3: No-Spanish-in-demo audit**

With demo semantics in mind, sweep for any Spanish that would show in the demo:
```bash
grep -rnE "[áéíóúñ¿¡]" src/components src/app src/lib/demo 2>/dev/null | grep -viE "/locales/es|\.test\.|// |/\*|oraculo/route"
```
Every remaining hit must be either an i18n `es.ts` value (correct — the demo uses `en`), a code comment, or the real `/api/oraculo` prompt (never shown in demo). Confirm no demo-visible Spanish remains.

- [ ] **Step 4: Commit + push (auto-redeploys the demo)**

```bash
git add src/components/ui/BacktestingWindow.tsx
git commit -m "feat(demo): locale-aware backtest run dates"
git push origin demo
```

- [ ] **Step 5: Live verification (controller will drive the browser)**

After the push auto-redeploys, the controller loads https://hedge-fund-demo.vercel.app/trading and confirms the demo is fully English (desktop chrome, Portfolio, Market, Backtesting run, Company Detail, Oráculo, badge) with no Spanish and no language switcher. Report this as the final step; do NOT attempt the browser check yourself in a headless env — note it for the controller.

---

## Self-Review

**Spec coverage (Part 2):** locale default+lock → Task 1; hide switcher → Task 1; tray badge → Task 2; layout metadata → Task 2; demo oracle + wiki topics → Task 2; demo company data → Task 2; locale-aware dates (Part 1 carry-over) → Task 3; verification + deploy → Task 3. ✓
**Placeholder scan:** concrete code/strings shown; the demo-data translations give full English examples with interpolation preserved. ✓
**Type consistency:** `formatRunDate(ts, locale)` uses `Locale` from `@/lib/i18n/context`; gating uses the literal `process.env.NEXT_PUBLIC_DEMO_MODE === 'true'` throughout. ✓
