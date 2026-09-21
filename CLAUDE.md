# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev            # Start development server (with --inspect)
npm run build          # Production build
npm run start          # Production server
npm run lint           # ESLint
npm run lint:fix       # ESLint with auto-fix
npm test               # Run all vitest unit tests once
npm run test:coverage  # Run tests with v8 coverage
```

Run a single test file or filter:

```bash
npx vitest run src/lib/trading/engine.test.ts
npx vitest run -t "places buy order"
```

Integration tests hit live APIs and are **skipped by default**. Opt in via env flag:

```bash
IOL_INTEGRATION=1 npx vitest run src/lib/iol/client.integration.test.ts
FMP_INTEGRATION=1 npx vitest run src/lib/fmp/market-data.integration.test.ts
```

`vitest.config.ts` loads `.env.local` automatically (no `VITE_` prefix needed) so credentials are picked up without being passed on the CLI.

## Architecture

A **Win98-themed AI hedge fund dashboard** for trading CEDEARs (Argentine depository receipts for international stocks like AAPL, KO, TSLA) via the InvertirOnline (IOL) broker API. Built on Next.js 16 (App Router) + React 19.

### Two-repo system

| Repo | Stack | Role |
|------|-------|------|
| **this repo** | Next.js, React 19, 98.css | Win98 desktop UI, broker integration, market data, trading engines |
| **ai-hedge-fund** (`/Users/santiago/GitHub/ai-hedge-fund`) | Python, FastAPI, LangGraph | AI analyst agents, portfolio management, backtesting |

The Next.js app proxies all `/api/hedge-fund/*` requests to the Python backend through `src/app/api/hedge-fund/[...path]/route.ts` (Node runtime, SSE-friendly streaming, attaches `x-api-key`). The browser never talks to the Python service directly.

### App entrypoints

- **`/`** — Landing page with "Enter Dashboard" button
- **`/trading`** — Win98 desktop environment (large client component, `src/app/trading/page.tsx`)
- **`src/proxy.ts`** — Next.js middleware enforcing optional HTTP Basic Auth on all non-API routes

The trading page is the orchestrator: it owns window visibility, desktop icon state, and top-level data fetching. Heavy server logic lives in `src/app/trading/actions.ts` (server actions), not in the page.

### Desktop windows

All windows share `DraggableResizableWindow.tsx` (drag/resize shell) and are managed by `useWindowManager` (`src/hooks/useWindowManager.ts`), which owns position, z-index, and minimize state. Window IDs are enumerated in `APP_IDS`. Each window component lives in `src/components/ui/`:

- **Portfolio** (`PortfolioWindow.tsx` + `AccountData.tsx`, `PortfolioSummary.tsx`)
- **Market Data** (`MarketDataWindow.tsx` + `Sparkline.tsx`)
- **News** (`NewsFeed.tsx`)
- **Movimientos** (`OperationsFeed.tsx`)
- **Backtesting** (`BacktestingWindow.tsx`)
- **Auto Trader** (`AutoTraderWindow.tsx` + `auto-trader/` subdir)
- **Company Detail** (`CompanyDetailWindow.tsx` + `company-detail/` subdir; supports multiple instances keyed by `companydetail-<symbol>`)
- **Quick Trade** (`QuickTradePanel.tsx` + `OrderReview.tsx`)
- **Display Properties** (`DisplayPropertiesWindow.tsx` — wallpaper / screensaver settings)
- **App Manager** (`AppManagerWindow.tsx` — Win98 task manager equivalent)

Desktop icon positions are persisted to localStorage. Screensavers live in `src/components/screensavers/` and are dispatched by `ScreenSaverRenderer.tsx`.

### Data layer

**IOL broker client** (`src/lib/iol/client.ts`) — see [`docs/iol-api.md`](docs/iol-api.md).
- Token cached to `.iol_token_cache.json` on disk (gitignored), auto-refreshed 60s before expiry, falls back to username/password.

**FMP market data** (`src/lib/fmp/market-data.ts`) — see [`docs/fmp-api.md`](docs/fmp-api.md).
- Historical OHLCV, company profiles, financials (income/cash-flow/balance), key metrics, DCF, news, symbol search.
- Company names cached to `.company-names-cache.json`; FMP profile responses cached to `.fmp-profile-cache.json` (FMP profile endpoint doesn't support batching).
- Throws `FmpRateLimitError` on 429s; server actions have a `FMP_FETCH_CONCURRENCY` cap (8) to avoid saturating undici's socket pool. Treat rate-limit errors as a distinct user-facing condition, not generic failures.

**CEDEAR symbol translation** is critical and lives in two files:
- `src/lib/cedear-map.ts` — IOL ticker ↔ FMP ticker mapping (e.g. `KO` → `KO`, `SPY` → `SPY`), plus ETF detection.
- `src/lib/cedear-ratios.ts` — BYMA conversion ratios (e.g. 10 CEDEAR shares = 1 underlying US share). Quantity/valuation logic must apply ratios; portfolio holdings are decoupled from free-cash calculations.

**MEP rate** (ARS/USD) is fetched separately and polled every 10 minutes via `src/lib/store/mep-store.ts`.

### Trading engines

Pure modules in `src/lib/trading/`:
- `engine.ts` — core order placement / lifecycle
- `quick-trade.ts` — affordability filtering + commission math (`COMMISSION_RATE`, `effectiveCashAfterCommission`, `filterAffordableCedears`)
- `rebalance-engine.ts` — Auto Trader's portfolio rebalancing
- `order-polling.ts` — polls IOL for order status after submission

Backtesting types live in `src/lib/backtesting/types.ts`. The actual backtest execution is delegated to the Python backend.

### State management

- **Zustand** stores in `src/lib/store/`: `news-store`, `mep-store`, `display-store`, `history-store`. News + display state are persisted to localStorage.
- **No Redux, no Context API for app state.** The only React Context is `LocaleProvider` (i18n).
- Per-window data hooks live next to the trading page in `src/app/trading/hooks/`: `usePortfolioData`, `useMarketData`, `useTradingOperations`. Use these instead of fetching directly from window components.

### Internationalization

Spanish (`es`) is the default locale; English (`en`) is supported. The system is in `src/lib/i18n/`:
- `LocaleProvider` (Context) + `useLocale` hook
- One subdir per feature area (`auto-trader/`, `company-detail/`, `market-data/`, `portfolio/`, `windows/`), each with `es.ts`, `en.ts`, and an `index.ts` exposing a `useXxxT()` hook
- Translation keys are typed (e.g. `AutoTraderKey`, `WindowsKey`) — adding a key to one locale requires adding it to the other or TS will fail
- `t(key, params)` supports `{placeholder}` interpolation

### Demo mode

Setting `NEXT_PUBLIC_DEMO_MODE=true` swaps real IOL/FMP data for fixtures from `src/lib/demo/data.ts` (DEMO_PORTFOLIO, DEMO_OPERATIONS, DEMO_NEWS_*, etc.). Used for screenshots and social media without exposing real account data. Server actions check `DEMO_MODE` and short-circuit to demo getters before hitting any external API.

The Auto Trader analysis (`/api/hedge-fund/run`) is paced so an audience can follow it. `src/lib/demo/run-stream.ts` walks every agent through the same step sequence the real backend emits (the labels come from `src/agents/*.py`), then closes with a `Done` event carrying prose reasoning from `src/lib/demo/commentary.ts`. That is what makes the frontend render the persona card. Events are spread across a target duration rather than a fixed per-step delay, so a 1-ticker run stays watchable and a 20-ticker run still finishes. Set `DEMO_RUN_TARGET_MS` to change it (default 60000; per-step delay is clamped to 45-650ms).

The commentary is sample text written in each investor's documented style, not real quotes. It stands in for the LLM output a live run produces.

### Styling & theme

- **98.css** library for the Win98 look-and-feel
- `src/lib/theme/win98.ts` — shared inline style constants (FONT, LABEL, etc.) used across all window components
- `src/lib/win98se-icons.ts` — Win98SE icon URLs from CDN (jsDelivr); only verified real PNGs (no symlinks)
- Tailwind v4 is also configured for utility classes alongside 98.css

### Path aliases

`@/*` → `./src/*` (configured in `tsconfig.json` and mirrored in `vitest.config.ts`).

## Environment variables

```
IOL_USERNAME                 # InvertirOnline broker login
IOL_PASSWORD
IOL_REFRESH_TOKEN
FMP_API_KEY                  # Financial Modeling Prep
AI_HEDGE_FUND_API_URL        # URL of the Python ai-hedge-fund backend (server-side only)
AI_HEDGE_FUND_API_KEY        # Auth header forwarded by the proxy route
ANTHROPIC_API_KEY            # Claude API key for the "Oráculo Bursátil" in ActiveDesktopWidget (uses claude-haiku-4-5 with SSE streaming)
BASIC_AUTH_USER              # Optional HTTP basic auth (enforced by src/proxy.ts)
BASIC_AUTH_PASSWORD
NEXT_PUBLIC_DEMO_MODE        # 'true' to use demo fixtures instead of live data
DEMO_RUN_TARGET_MS           # Demo only: target seconds*1000 for the Auto Trader run stream (default 60000)
IOL_INTEGRATION              # '1' to enable IOL integration tests
FMP_INTEGRATION              # '1' to enable FMP integration tests
```

## Win98 UI guidelines

Two documents together cover everything needed for UI work:

- **[`docs/win98-ui-guidelines.md`](docs/win98-ui-guidelines.md)** — authoritative design rules: typography, layout (DLUs), 3D shading model, controls, windows/dialogs/menus, iconography, tables, and window layout patterns.
- **[`docs/win98-css-implementation.md`](docs/win98-css-implementation.md)** — technical reference: maps every guideline to concrete 98.css HTML classes, JSX markup patterns, and `@/lib/theme/win98` constants. Read this when writing or reviewing component code.
