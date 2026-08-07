# Multi-Agent Trading Desk

### ▶ Live demo: [multi-agent-trading-desk.vercel.app](https://multi-agent-trading-desk.vercel.app)

Runs in fully-mocked mode with fictitious portfolio data. No broker account or API key required, and no external paid API is ever contacted.

A multi-agent AI trading dashboard for CEDEARs (Argentine depository receipts for international stocks like AAPL, KO, TSLA), wired to the [InvertirOnline](https://www.invertironline.com/) broker API for live portfolio data and order execution. A panel of 12 LLM analyst agents evaluates positions and drives the rebalancing and backtesting engines.

Built with Next.js 16, React 19, and [98.css](https://jdan.github.io/98.css/) for a retro desktop interface — draggable, resizable windows, one per trading module.

![Windows 98 Desktop](https://img.shields.io/badge/theme-Windows%2098-008080)
![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)
![AI SDK](https://img.shields.io/badge/AI%20SDK-v6-000000?logo=vercel&logoColor=white)
![Agents](https://img.shields.io/badge/agents-12%20LLM%20analysts-FF6B00)
![Tests](https://img.shields.io/badge/tests-Vitest-6E9F18?logo=vitest&logoColor=white)
![Demo](https://img.shields.io/badge/demo-no%20API%20key%20needed-2EA043)
![i18n](https://img.shields.io/badge/i18n-ES%20%7C%20EN-8B5CF6)

## Architecture

The system is composed of two repos that work together:

| Repo | Stack | Role |
|------|-------|------|
| **multi-agent-trading-desk** (this repo) | Next.js, React 19, 98.css | Retro desktop UI, broker integration, market data, trading engines |
| **ai-hedge-fund** | Python, FastAPI, LangGraph | AI analyst agents, portfolio management, backtesting engine |

The Python analyst backend builds on the open-source [ai-hedge-fund](https://github.com/virattt/ai-hedge-fund) project. The frontend, broker integration, CEDEAR ratio/symbol translation layer and trading engines in this repo are my own.

The frontend calls the AI backend via `NEXT_PUBLIC_AI_HEDGE_FUND_API_URL` (defaults to `http://localhost:8000`).

## Features

### Desktop Environment
The main trading interface is a full Win98-style desktop with draggable, resizable windows and desktop icons:

- **Portfolio** — Real-time holdings, account balances, and portfolio summary from IOL
- **Market Data** — OHLCV charts with sparklines for CEDEAR prices
- **News Feed** — Market intelligence with sentiment analysis
- **Movimientos** — Recent broker operations and movements
- **Company Detail** — Deep-dive into individual companies with financials, key metrics, and news
- **Quick Trade** — Fast order entry with order review confirmation
- **Auto Trader** — AI-driven automated trading with rebalance engine
- **AI Hedge Fund** — Integration with the Python backend running 12 AI analyst agents
- **Backtesting** — Strategy backtesting engine

### Integrations
- **InvertirOnline (IOL)** — Full broker API integration with token caching and auto-refresh
- **Financial Modeling Prep (FMP)** — Historical market data, company profiles, financials, and news
- **AI Hedge Fund Backend** — FastAPI service with SSE streaming for real-time agent progress

## Getting Started

### Prerequisites
- Node.js 18+
- An [InvertirOnline](https://www.invertironline.com/) broker account
- An [FMP](https://financialmodelingprep.com/) API key

### Environment Variables

```env
IOL_USERNAME=           # InvertirOnline broker login
IOL_PASSWORD=
IOL_REFRESH_TOKEN=
FMP_API_KEY=            # Financial Modeling Prep API key
BASIC_AUTH_USER=        # Optional HTTP basic auth
BASIC_AUTH_PASSWORD=
```

### Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and click "Enter Dashboard".

## Demo deployment (public, no secrets)

The `demo` branch runs the app in fully-mocked mode. Deploy it as a separate
Vercel project:
- Branch: `demo`
- Env: `NEXT_PUBLIC_DEMO_MODE=true` (and NOTHING else — leave IOL/FMP/Anthropic/
  AI_HEDGE_FUND/BASIC_AUTH unset).
- All data is fictitious; no external paid API is ever contacted.

## Tech Stack

- **Framework** — Next.js 16 (App Router)
- **UI** — React 19, 98.css, Tailwind CSS
- **State** — Zustand (persisted stores)
- **Charts** — Recharts
- **AI** — Vercel AI SDK, LangChain
- **Broker API** — InvertirOnline REST API
- **Market Data** — Financial Modeling Prep API
