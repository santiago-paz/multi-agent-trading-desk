# Showcase English (i18n) — Design

**Date:** 2026-08-03
**Status:** Approved (design), pending implementation plan
**Branches:** `feat/i18n-english` (off `main`, Part 1) → PR to `main`; then Part 2 on `demo`.

## Goal

Make the **public demo** render fully in English, while the **real app keeps
Spanish as its default** and looks/behaves identically. Because the string-bearing
components are shared by both, English can't be hard-coded — it must go through the
existing i18n system, with the demo simply defaulting the locale to English.

## Decisions (approved)

1. **Approach:** i18n extraction lands on `main` as a **behavior-neutral refactor**
   (real app stays `es` default, unchanged). The demo defaults the locale to `en`.
   No divergence in shared files, no merge pain.
2. **Switcher:** the demo **forces English and hides the language switcher**
   (Display Properties). The real app keeps the `es` default and the switcher.
3. **Oráculo:** **rewritten in English** for the demo (whimsical fortune-teller,
   scripted lines). The real `/api/oraculo` Anthropic prompt stays Spanish.
4. Landing page (`/`) and layout metadata are in scope (translated). Nothing else
   is deliberately held back except the two items under "Stays Spanish".

## Existing i18n system (reuse)

`src/lib/i18n/`: `LocaleProvider` (`context.tsx`, default `es`, persisted to
`localStorage['locale']`, hydrated post-mount), `useLocale`, and per-area folders
each with `es.ts` + `en.ts` + `index.ts` exposing a `useXxxT()` hook. Current areas:
`auto-trader`, `company-detail`, `market-data`, `portfolio`, `windows`.
`locales.test.ts` enforces es/en key parity per area. A language switcher already
lives in `DisplayPropertiesWindow.tsx`. Desktop chrome (`page.tsx`) already uses
`useWindowsT`.

## Part 1 — i18n extraction → PR to `main` (behavior-neutral)

Extract every hardcoded Spanish **user-facing** string in shared components into the
i18n system, adding `en` alongside `es`. The real app renders identically at
`locale=es`. Targets and their i18n area:

| Component | i18n area | Notes |
|---|---|---|
| `BacktestingWindow.tsx` (zero i18n, ~43+ strings) | **new `backtesting/`** area (es+en+index+`useBacktestingT`) | The bulk of the work |
| `ActiveDesktopWidget.tsx` (Oráculo widget chrome: "Active Desktop", "Otro artículo", "Wikipedia en español", "🔮 Oráculo", loading/error) | `windows/` (extend) | UI chrome only; the oracle *content* is demo data (Part 2) |
| `src/app/page.tsx` (landing: "Enter Dashboard" etc.) | `windows/` (extend) | Client component; wrap with `useWindowsT` |
| `OperationsFeed.tsx` | `portfolio/` (extend) | |
| `PortfolioSummary.tsx`, `AccountData.tsx` (already partly i18n) | `portfolio/` (extend) | Finish the remaining hardcoded strings |
| `AgentDetail.tsx`, analyst detail panels (`analysts/*Detail.tsx`) | `auto-trader/` (extend) | |
| Any remaining hardcoded strings surfaced by the audit | closest existing area | Plan enumerates from a fresh grep |

- Follow the established per-area pattern exactly (typed keys, `t(key, params)` with
  `{placeholder}` interpolation, `useXxxT` hook).
- Extend `locales.test.ts` to include the new `backtesting` area in its parity check.
- **Verification for Part 1:** app at `locale=es` renders identical Spanish (visual
  regression on the affected windows); `locales.test.ts` green; `npm test` +
  `npm run build` green; `tsc` clean. No demo files are touched in Part 1.

## Part 2 — demo goes English → on `demo`

Prereq: `feat/i18n-english` merged into `demo` (so demo has the i18n infrastructure).

1. **Locale gating** (`src/lib/i18n/context.tsx`): when
   `process.env.NEXT_PUBLIC_DEMO_MODE === 'true'`, initialize locale to `en` and do
   **not** hydrate/persist from localStorage (lock to English). Real app path
   unchanged (`es` default + localStorage).
2. **Hide the switcher** (`DisplayPropertiesWindow.tsx`): hide/disable the language
   control when `NEXT_PUBLIC_DEMO_MODE === 'true'`.
3. **Layout metadata** (`src/app/layout.tsx`): English `title`/`description` when
   `NEXT_PUBLIC_DEMO_MODE === 'true'` (build-time env); Spanish otherwise.
4. **Demo-only data → English:**
   - `src/lib/demo/oraculo.ts` — rewrite `ORACULO_TEMPLATES` (English fortune-teller,
     "…(not advice, it's destiny)") and `DEMO_WIKI_TOPICS` titles/extracts in English.
   - `src/lib/demo/company-detail.ts` — English `description` blurb + keep the
     already-per-symbol sector/industry (English already).
   - `src/app/trading/page.tsx` — tray badge → **"DEMO MODE · fictitious data"**
     (tooltip "100% fictitious data · not financial advice").
   - Demo news (`DEMO_NEWS_*`) already English — no change.
- **Verification for Part 2:** live demo renders English end-to-end (browser check on
  the deployed URL after redeploy); no Spanish leaks in the demo; real app (flag off)
  still Spanish.

## Stays Spanish (intentional)
- The real app's default locale (`es`) and its language switcher.
- The real `/api/oraculo` Anthropic system prompt (a real-app feature, never shown in
  the demo — the demo uses the scripted `demoOraculoStream`).

## Order of operations
1. Part 1 on `feat/i18n-english` → open PR to `main` (behavior-neutral, mergeable any time).
2. Merge `feat/i18n-english` into `demo`.
3. Part 2 on `demo` → push → auto-redeploys the English showcase.

## Out of scope (YAGNI)
- Translating the real app's default experience (it stays Spanish).
- Any locale beyond `es`/`en`.
- Reworking the i18n architecture (reused as-is).
- Backend/Python strings (not part of this UI).
