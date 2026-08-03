# Showcase English — Part 1: i18n Extraction — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract all hardcoded Spanish user-facing strings in shared components into the existing i18n system (es + en), so the app is fully bilingual — as a behavior-neutral refactor that leaves the real app's Spanish default untouched.

**Architecture:** Reuse `src/lib/i18n/` (per-area `es.ts`/`en.ts`/`index.ts` with a `useXxxT()` hook, `t(key, params)` `{placeholder}` interpolation). Add a new `backtesting` area; extend `windows`, `portfolio`, `auto-trader`. Extend `locales.test.ts` parity coverage. This branch (`feat/i18n-english`, off `main`) contains NO demo files — Part 2 (demo → English) is a separate plan on the `demo` branch.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest.

## Global Constraints

- **Behavior-neutral invariant (critical):** at `locale='es'` every migrated string MUST render the **exact same Spanish text as before**. The `es.ts` value for each key = the original Spanish literal, **verbatim** (same characters, accents, punctuation, `{placeholder}` where the original interpolated). The real app must look identical.
- **i18n pattern (follow exactly):** `es.ts` exports `xxxEs = { 'key': '…' } as const`-style object AND `export type XxxKey = keyof typeof xxxEs;`. `en.ts` exports `export const xxxEn: Record<XxxKey, string> = { … }`. `index.ts` mirrors `market-data/index.ts` verbatim (swap names) to build `useXxxT()`. Interpolation uses `{name}` tokens and `t(key, { name })`.
- **Parity test:** every new/extended area must pass `locales.test.ts` — ES and EN have identical key sets, no empty values, matching `{placeholders}`. Add new areas to `testDomain(...)`.
- **Key naming:** dot-namespaced, lowercase, grouped by UI region (e.g. `'run.start'`, `'metrics.sharpe.tooltip'`, `'log.completed'`). Reuse an existing key if the same string already exists in that area.
- **Translation glossary (use for EN consistency):** Portafolio→Portfolio · Cuenta→Account · Movimientos→Transactions · Datos de Mercado→Market Data · Noticias→News · Mercado→Market · Backtesting→Backtesting · Iniciar/Ejecutar→Run · Correr→Run · Cargando…→Loading… · Borrar→Delete (single) / Clear (all) · Guardar→Save · Cerrar→Close · Período→Period · Capital inicial→Initial capital · Día/Días→Day/Days · Exposición Bruta/Neta→Gross/Net Exposure · Efectivo→Cash · Retorno→Return · Caída→Drawdown · Reporte→Report · Pestaña→Tab · Histórico/Historial→History · acciones del subyacente→underlying shares · "(no es consejo…)"→"(not advice…)". Keep financial-metric tooltips faithful and natural.
- **Scope:** only shared components under `src/components/**` and `src/app/**`. Do NOT touch `src/lib/demo/**` (not on this branch), the real `/api/oraculo` Anthropic system prompt (stays Spanish), or backend.
- **Green gates:** `npm test`, `npm run lint`, `npx tsc --noEmit` (note: 6 pre-existing `history-store.test.ts` tsc errors exist on `main` — do not fix here; just don't ADD new ones), and `npm run build` must all pass. Frequent commits (one per task).

## File Structure

```
NEW:
  src/lib/i18n/locales/backtesting/es.ts      (backtestingEs + BacktestingKey)
  src/lib/i18n/locales/backtesting/en.ts      (backtestingEn: Record<BacktestingKey,string>)
  src/lib/i18n/locales/backtesting/index.ts   (useBacktestingT)
MODIFIED:
  src/lib/i18n/index.ts                        (export useBacktestingT + type)
  src/lib/i18n/locales.test.ts                 (add backtesting to testDomain)
  src/lib/i18n/locales/windows/{es,en}.ts      (+ landing + Active Desktop / Oráculo chrome keys)
  src/lib/i18n/locales/portfolio/{es,en}.ts    (+ Operations / Summary / Account keys)
  src/lib/i18n/locales/auto-trader/{es,en}.ts  (+ AgentDetail / analyst-panel keys)
  src/components/ui/BacktestingWindow.tsx
  src/components/ui/ActiveDesktopWidget.tsx
  src/app/page.tsx
  src/components/ui/OperationsFeed.tsx
  src/components/ui/PortfolioSummary.tsx
  src/components/ui/AccountData.tsx
  src/components/ui/auto-trader/components/AgentDetail.tsx
  src/components/ui/auto-trader/components/analysts/*Detail.tsx
```

---

## Task 1: `backtesting` i18n area + migrate BacktestingWindow

**Files:**
- Create: `src/lib/i18n/locales/backtesting/{es.ts,en.ts,index.ts}`
- Modify: `src/lib/i18n/index.ts`, `src/lib/i18n/locales.test.ts`, `src/components/ui/BacktestingWindow.tsx`

**Interfaces:**
- Produces: `useBacktestingT()` returning `t(key: BacktestingKey, params?) => string`; exported from `@/lib/i18n`.

- [ ] **Step 1: Scaffold the area (index.ts mirrors market-data/index.ts)**

```ts
// src/lib/i18n/locales/backtesting/index.ts
import { useLocale } from '../../context';
import { backtestingEs, type BacktestingKey } from './es';
import { backtestingEn } from './en';
import type { Locale } from '../../context';

const translations: Record<Locale, Record<BacktestingKey, string>> = {
  es: backtestingEs,
  en: backtestingEn,
};

export function useBacktestingT() {
  const { locale } = useLocale();
  const dict = translations[locale];
  function t(key: BacktestingKey, params?: Record<string, string | number>): string {
    let text: string = dict[key] ?? key;
    if (params) for (const [k, v] of Object.entries(params)) text = text.replaceAll(`{${k}}`, String(v));
    return text;
  }
  return t;
}

export type { BacktestingKey };
```

- [ ] **Step 2: Author `es.ts` from the component's Spanish, verbatim**

Extract EVERY user-facing Spanish string in `BacktestingWindow.tsx` (labels, buttons, `addLog(...)` messages, `title=` tooltips, status text, placeholders, confirm dialogs) into `backtestingEs`, value = the original Spanish **verbatim**, converting `${x}` interpolations to `{x}` tokens. Representative anchors (author the full set the same way):

```ts
// src/lib/i18n/locales/backtesting/es.ts
export const backtestingEs = {
  'run.button': 'Ejecutar backtest',
  'run.starting': 'Iniciando backtest con {count} agente(s)...',
  'run.processing': 'Procesando día {current}/{total}...',
  'log.completed': 'Backtest completado',
  'log.completedDays': 'Backtest completado — {count} días procesados',
  'log.cancelled': 'Backtest cancelado por el usuario',
  'config.initialCapital': 'Capital inicial: ${amount} USD',
  'config.period': 'Período: {start} → {end}',
  'confirm.clearHistory': '¿Borrar todo el histórico de backtests?',
  'report.loadHint': 'Click para cargar este reporte en la pestaña Resultados',
  'metrics.sharpe.tooltip': 'Retorno ajustado por riesgo: (retorno − tasa libre de riesgo) / desvío estándar. > 1 es bueno, > 2 muy bueno, negativo significa que perdiste contra el cash.',
  'metrics.grossExposure': 'Exposición Bruta',
  'metrics.netExposure': 'Exposición Neta',
  // …author the remaining ~30–40 strings from BacktestingWindow.tsx here…
} as const;

export type BacktestingKey = keyof typeof backtestingEs;
```

- [ ] **Step 3: Author `en.ts` (same keys, natural English per glossary)**

```ts
// src/lib/i18n/locales/backtesting/en.ts
import type { BacktestingKey } from './es';
export const backtestingEn: Record<BacktestingKey, string> = {
  'run.button': 'Run backtest',
  'run.starting': 'Starting backtest with {count} agent(s)...',
  'run.processing': 'Processing day {current}/{total}...',
  'log.completed': 'Backtest complete',
  'log.completedDays': 'Backtest complete — {count} days processed',
  'log.cancelled': 'Backtest cancelled by the user',
  'config.initialCapital': 'Initial capital: ${amount} USD',
  'config.period': 'Period: {start} → {end}',
  'confirm.clearHistory': 'Clear the entire backtest history?',
  'report.loadHint': 'Click to load this report in the Results tab',
  'metrics.sharpe.tooltip': 'Risk-adjusted return: (return − risk-free rate) / standard deviation. > 1 is good, > 2 very good, negative means you lost against cash.',
  'metrics.grossExposure': 'Gross Exposure',
  'metrics.netExposure': 'Net Exposure',
  // …mirror every key from es.ts…
};
```

- [ ] **Step 4: Register in `src/lib/i18n/index.ts`**

```ts
export { useBacktestingT, type BacktestingKey } from './locales/backtesting';
```

- [ ] **Step 5: Add the parity test for `backtesting`**

In `src/lib/i18n/locales.test.ts`, add imports and one line:
```ts
import { backtestingEs } from './locales/backtesting/es';
import { backtestingEn } from './locales/backtesting/en';
// …inside describe('i18n locale completeness', …):
testDomain('backtesting', backtestingEs, backtestingEn);
```

- [ ] **Step 6: Run the parity test (RED→GREEN as you author keys)**

Run: `npx vitest run src/lib/i18n/locales.test.ts`
Expected: PASS (backtesting: identical keys, no empty, placeholders match).

- [ ] **Step 7: Wire `BacktestingWindow.tsx` to `useBacktestingT`**

Add `import { useBacktestingT } from '@/lib/i18n';`, `const tb = useBacktestingT();` in the component, and replace each hardcoded Spanish literal with `tb('key', { …params })`. Example conversions:
```tsx
// before → after
addLog('start', `Iniciando backtest con ${agentKeys.length} agente(s)...`)
  → addLog('start', tb('run.starting', { count: agentKeys.length }))

<button …>Ejecutar backtest</button>
  → <button …>{tb('run.button')}</button>

title="Retorno ajustado por riesgo: …"
  → title={tb('metrics.sharpe.tooltip')}
```
Ensure NO hardcoded Spanish user-facing string remains in the file.

- [ ] **Step 8: Verify behavior-neutral (es unchanged) + typecheck**

Run:
```bash
grep -nE "[áéíóúñ¿¡]" src/components/ui/BacktestingWindow.tsx   # expect: no user-facing Spanish left (comments OK)
npx tsc --noEmit 2>&1 | grep BacktestingWindow || echo "tsc clean for file"
npx vitest run src/lib/i18n/locales.test.ts
```
Expected: no user-facing Spanish literals remain; tsc clean; parity green. Spot-check that `backtestingEs` values are verbatim copies of the original Spanish (this is the es-unchanged guarantee).

- [ ] **Step 9: Commit**

```bash
git add src/lib/i18n/locales/backtesting src/lib/i18n/index.ts src/lib/i18n/locales.test.ts src/components/ui/BacktestingWindow.tsx
git commit -m "i18n(backtesting): extract BacktestingWindow strings to es/en"
```

---

## Task 2: Extend `windows` — landing page + Active Desktop / Oráculo chrome

**Files:**
- Modify: `src/lib/i18n/locales/windows/{es.ts,en.ts}`, `src/app/page.tsx`, `src/components/ui/ActiveDesktopWidget.tsx`

**Interfaces:**
- Consumes: `useWindowsT` (already exported from `@/lib/i18n`).

- [ ] **Step 1: Add keys to `windows/es.ts` (verbatim Spanish) + `windows/en.ts`**

Extract the landing page (`src/app/page.tsx`) and the Active Desktop / Oráculo **widget chrome** strings (NOT the oracle's generated content) from `ActiveDesktopWidget.tsx` — e.g. "Active Desktop", "Otro artículo", "Wikipedia en español", "🔮 Oráculo", loading/error text, and the landing "Enter Dashboard"/tagline. Append to both files; es = verbatim, en = translated. Example:
```ts
// windows/es.ts  (append)
'desktop.activeDesktop': 'Active Desktop',
'desktop.anotherArticle': 'Otro artículo',
'desktop.wikiSource': 'Wikipedia en español',
'oraculo.consult': '🔮 Oráculo',
// windows/en.ts  (append, same keys)
'desktop.activeDesktop': 'Active Desktop',
'desktop.anotherArticle': 'Another article',
'desktop.wikiSource': 'Wikipedia (Spanish)',
'oraculo.consult': '🔮 Oracle',
```
(Enumerate every remaining Spanish string in both files.)

- [ ] **Step 2: Wire `page.tsx` and `ActiveDesktopWidget.tsx` to `useWindowsT`**

Add the hook and replace literals with `tw('key')`. `page.tsx` is a client component; if it isn't already `'use client'`, confirm before adding the hook (the landing "Enter Dashboard" button implies interactivity — verify). If `page.tsx` must stay a server component, pass strings via a small client subcomponent or keep its handful of strings gated another way — report as DONE_WITH_CONCERNS if this forces a structural choice.

- [ ] **Step 3: Verify + parity + commit**

Run: `npx vitest run src/lib/i18n/locales.test.ts` (windows parity green) and `grep -nE "[áéíóúñ¿¡]" src/app/page.tsx src/components/ui/ActiveDesktopWidget.tsx` (no user-facing Spanish left).
```bash
git add src/lib/i18n/locales/windows src/app/page.tsx src/components/ui/ActiveDesktopWidget.tsx
git commit -m "i18n(windows): extract landing page + Active Desktop chrome"
```

---

## Task 3: Extend `portfolio` — Operations / Summary / Account feeds

**Files:**
- Modify: `src/lib/i18n/locales/portfolio/{es.ts,en.ts}`, `src/components/ui/OperationsFeed.tsx`, `src/components/ui/PortfolioSummary.tsx`, `src/components/ui/AccountData.tsx`

**Interfaces:**
- Consumes: `usePortfolioT` (already exported). `PortfolioSummary`/`AccountData` already import it — extend their usage; `OperationsFeed` add it.

- [ ] **Step 1: Add keys to `portfolio/{es,en}.ts`**

Extract remaining Spanish from the three files (Movimientos labels, column headers, status/empty text, account-field labels). es verbatim, en per glossary (Movimientos→Transactions, etc.). Reuse any existing portfolio key that already matches.

- [ ] **Step 2: Wire the three components**

`OperationsFeed`: add `const tp = usePortfolioT();`, replace literals. `PortfolioSummary`/`AccountData`: replace their remaining hardcoded literals with `tp('key')`.

- [ ] **Step 3: Verify + parity + commit**

Run: `npx vitest run src/lib/i18n/locales.test.ts` + `grep -nE "[áéíóúñ¿¡]" src/components/ui/OperationsFeed.tsx src/components/ui/PortfolioSummary.tsx src/components/ui/AccountData.tsx`.
```bash
git add src/lib/i18n/locales/portfolio src/components/ui/OperationsFeed.tsx src/components/ui/PortfolioSummary.tsx src/components/ui/AccountData.tsx
git commit -m "i18n(portfolio): extract Operations/Summary/Account strings"
```

---

## Task 4: Extend `auto-trader` — AgentDetail + analyst panels

**Files:**
- Modify: `src/lib/i18n/locales/auto-trader/{es.ts,en.ts}`, `src/components/ui/auto-trader/components/AgentDetail.tsx`, `src/components/ui/auto-trader/components/analysts/*Detail.tsx`

**Interfaces:**
- Consumes: `useAutoTraderT` (already exported).

- [ ] **Step 1: Enumerate the panels**

Run `grep -rlnE "[áéíóúñ¿¡]" src/components/ui/auto-trader/components` to list the exact files (AgentDetail.tsx, analysts/GrowthDetail.tsx, and any siblings). Migrate each.

- [ ] **Step 2: Add keys + wire**

Add keys to `auto-trader/{es,en}.ts` (es verbatim, en translated), add `const ta = useAutoTraderT();` where missing, replace literals with `ta('key', …)`.

- [ ] **Step 3: Verify + parity + commit**

Run: `npx vitest run src/lib/i18n/locales.test.ts` + grep the touched files for leftover Spanish.
```bash
git add src/lib/i18n/locales/auto-trader src/components/ui/auto-trader/components
git commit -m "i18n(auto-trader): extract agent/analyst detail panel strings"
```

---

## Task 5: Audit sweep + Part 1 verification

**Files:**
- Modify: any straggler component surfaced by the audit + its i18n area.

- [ ] **Step 1: Full audit for remaining hardcoded Spanish (shared UI only)**

Run:
```bash
grep -rnE "[áéíóúñ¿¡]" src/components src/app 2>/dev/null \
 | grep -viE "/locales/|\.test\.|/demo/|oraculo/route" \
 | grep -vE "^\s*//|/\*|\*/"
```
Every remaining hit that is a **user-facing** string must be migrated into the closest i18n area (create keys, wire `t()`). Ignore code comments, non-UI strings, and the real `/api/oraculo` prompt. If a hit is a false positive (comment/identifier), note it.

- [ ] **Step 2: Migrate any stragglers** (same pattern as Tasks 1–4), then re-run Step 1 until only comments/false-positives remain.

- [ ] **Step 3: Behavior-neutral regression check (es unchanged)**

Run the app at the default (es) locale and confirm the migrated windows (Backtesting, landing, Operations, Portfolio/Account, Auto Trader panels, Active Desktop) render the **same Spanish** as before:
```bash
npm run build && npm run start   # open /trading, default locale = es
```
Spot-check each migrated surface visually. (Optional stronger check: temporarily flip default locale to en and confirm English renders too.)

- [ ] **Step 4: Full green gates**

Run: `npm test` (incl. `locales.test.ts`) → 0 fail; `npm run lint` → no NEW errors vs `main`; `npx tsc --noEmit` → no NEW errors vs `main` (the 6 pre-existing `history-store.test.ts` errors may remain); `npm run build` → success.

- [ ] **Step 5: Commit + open PR to main**

```bash
git add -A && git commit -m "i18n: complete hardcoded-string audit sweep"
git push -u origin feat/i18n-english
gh pr create --base main --head feat/i18n-english --title "refactor(i18n): full English coverage for shared components (es default unchanged)" --body "Behavior-neutral i18n extraction; real app still defaults to Spanish. Enables the English showcase (Part 2)."
```

---

## Self-Review

**Spec coverage (Part 1):**
- BacktestingWindow → Task 1 (new `backtesting` area). ✓
- Landing + Active Desktop/Oráculo chrome → Task 2 (`windows`). ✓
- Operations/Summary/Account → Task 3 (`portfolio`). ✓
- AgentDetail/analyst panels → Task 4 (`auto-trader`). ✓
- Stragglers + behavior-neutral verification → Task 5. ✓
- Layout metadata + LocaleProvider gating + demo data + hide-switcher are **Part 2** (separate plan on `demo`) — intentionally excluded here. ✓

**Placeholder scan:** the per-file "author the remaining strings" instruction is bounded by the source file (the strings are the input), with the pattern, real es/en anchors, glossary, and an exhaustiveness grep — not a vague requirement. Scaffold/hook/test code is shown in full.

**Type consistency:** every area uses `XxxKey = keyof typeof xxxEs` and `xxxEn: Record<XxxKey, string>`; `index.ts` is the market-data template with names swapped; `useBacktestingT` exported from `@/lib/i18n` and consumed in Task 1. Parity enforced by `locales.test.ts` for all areas including the new `backtesting`.
