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

The trading page is a large client component (`src/app/trading/page.tsx`) that coordinates window visibility, data fetching, and AI analysis. Heavy logic lives in server actions (`src/app/trading/actions.ts`).

### AI Agent Pipeline

Three agents run sequentially via `runAnalysis()` in `actions.ts`:

1. **Analyst** (`src/lib/agents/analyst.ts`) — Technical analysis per symbol (trend, score, reasoning)
2. **Sentinel** (`src/lib/agents/sentinel.ts`) — Risk scoring & news sentiment
3. **Strategist** (`src/lib/agents/strategist.ts`) — Portfolio allocation decisions → passed to trading engine

All agents call `generateText()` from Vercel AI SDK, parse JSON responses, and have error fallbacks. The **Advisor** (`src/lib/agents/advisor.ts`) is separate — triggered on demand for buy/sell recommendations with budget constraints.

The LLM is `meta-llama/llama-3.3-70b-instruct` via Fireworks (configured in `src/lib/llm.ts`).

### Trading Flow

```
runAnalysis() → Analyst → Sentinel → Strategist
                                         ↓
                              trading engine (order generation)
                                         ↓
                              user reviews orders in UI
                                         ↓
                              executeOrders() → IOL API
```

### IOL Client (`src/lib/iol/client.ts`) — see [`docs/iol-api.md`](docs/iol-api.md) for full API reference

Broker API integration with:
- Token caching to `.iol_token_cache.json` on disk
- Auto-refresh 60s before expiry, fallback to username/password
- `SIMULATION_MODE` env var skips actual order placement

### Market Data (`src/lib/market-data.ts`)

- Yahoo Finance (`yahoo-finance2`) for quotes and 7-day historical OHLC
- Puppeteer + `@mozilla/readability` for enriching news articles with full content
- CEDEAR ratios are hardcoded (e.g., 10 AAPL shares = 1 US share)
- MEP rate (ARS/USD) fetched separately, polled every 10 minutes

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
FIREWORKS_API_KEY     # LLM provider
BASIC_AUTH_USER       # Optional HTTP basic auth
BASIC_AUTH_PASSWORD
SIMULATION_MODE       # Set to skip real order execution
```

### Path Aliases

`@/*` maps to `./src/*` (configured in `tsconfig.json`).

## Win98 UI Guidelines

**Read [`docs/win98-ui-guidelines.md`](docs/win98-ui-guidelines.md) before making any UI changes.** That file is the authoritative reference for all Win98/2000 aesthetics: typography, layout (DLUs), 3D shading, controls, windows/dialogs/menus, iconography, tables, and window layout patterns.
