# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start development server
npm run build     # Production build
npm run start     # Production server
npm run lint      # Run ESLint
```

No test runner is configured.

## Architecture

This is a **Win98-themed AI hedge fund dashboard** for trading CEDEARs (Argentine depository receipts for international stocks like AAPL, KO, TSLA) via the InvertirOnline (IOL) broker API.

### App Structure

- **`/`** — Landing page with "Enter Dashboard" button
- **`/trading`** — Main Win98-style desktop environment with draggable windows

The trading page is a large client component (`src/app/trading/page.tsx`) that coordinates window visibility and data fetching. Heavy logic lives in server actions (`src/app/trading/actions.ts`).

### Desktop Windows

Six draggable windows managed by `useWindowManager` hook (`src/hooks/useWindowManager.ts`):

| Window | Component | Description |
|--------|-----------|-------------|
| Portfolio | `PortfolioWindow.tsx` | Portfolio holdings, account data (`AccountData.tsx`), summary (`PortfolioSummary.tsx`) |
| News | `NewsFeed.tsx` | Market intelligence feed with sentiment |
| Market Data | `MarketDataWindow.tsx` | OHLCV charts with sparklines (`Sparkline.tsx`) |
| Movimientos | `OperationsFeed.tsx` | Recent broker operations/movements |
| AI Hedge Fund | `AiHedgeFundWindow.tsx` | External Python backend integration for AI-driven analysis |
| Backtesting | `BacktestingWindow.tsx` | Strategy backtesting engine |

Shared UI primitives: `DraggableResizableWindow.tsx` (drag/resize shell), `DesktopIcon.tsx` (desktop shortcuts), `OrderReview.tsx` (trade confirmation), `RiskGauge.tsx` (risk visualization).

### AI Hedge Fund Backend

The "AI Hedge Fund" window connects to a separate Python backend located at `/Users/santiago/GitHub/ai-hedge-fund`. The frontend calls it via `NEXT_PUBLIC_AI_HEDGE_FUND_API_URL` (defaults to `http://localhost:8000`). Endpoints used: `GET /hedge-fund/agents` and `POST /hedge-fund/run`.

### IOL Client (`src/lib/iol/client.ts`) — see [`docs/iol-api.md`](docs/iol-api.md) for full API reference

Broker API integration with:
- Token caching to `.iol_token_cache.json` on disk
- Auto-refresh 60s before expiry, fallback to username/password
- `SIMULATION_MODE` env var skips actual order placement

### Market Data (`src/lib/market-data.ts`)

- FMP (Financial Modeling Prep) API for historical OHLCV data, company profiles, and news
- Company names cached to `.company-names-cache.json` on disk (FMP profile endpoint doesn't support batch)
- MEP rate (ARS/USD) fetched separately, polled every 10 minutes

### Styling & Theme

- **98.css** library for Win98 look-and-feel
- `src/lib/theme/win98.ts` — shared inline style constants (FONT, LABEL, etc.) used across all window components
- `src/lib/win98se-icons.ts` — Win98SE icon URLs from CDN (jsDelivr), only verified real PNGs (not symlinks)

### State Management

- **Zustand** stores for news (`src/lib/store/news-store.ts`, persisted to localStorage) and MEP rate (`src/lib/store/mep-store.ts`)
- **`useWindowManager`** hook manages Win98 window positions, z-index, and minimize state
- Desktop icon positions saved to localStorage
- No Redux or Context API

### Required Environment Variables

```
IOL_USERNAME          # InvertirOnline broker login
IOL_PASSWORD
IOL_REFRESH_TOKEN
FMP_API_KEY           # Financial Modeling Prep (market data, news, profiles)
BASIC_AUTH_USER       # Optional HTTP basic auth
BASIC_AUTH_PASSWORD
SIMULATION_MODE       # Set to skip real order execution
```

### Path Aliases

`@/*` maps to `./src/*` (configured in `tsconfig.json`).

## Win98 UI Guidelines

Two documents together cover everything needed for UI work:

- **[`docs/win98-ui-guidelines.md`](docs/win98-ui-guidelines.md)** — authoritative design rules: typography, layout (DLUs), 3D shading model, controls, windows/dialogs/menus, iconography, tables, and window layout patterns.
- **[`docs/win98-css-implementation.md`](docs/win98-css-implementation.md)** — technical reference: maps every guideline to concrete 98.css HTML classes, JSX markup patterns, and `@/lib/theme/win98` constants. Read this when writing or reviewing component code.
