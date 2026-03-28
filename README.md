# Windows Money

A Win98-themed AI hedge fund dashboard for trading CEDEARs (Argentine depository receipts for international stocks like AAPL, KO, TSLA) via the [InvertirOnline](https://www.invertironline.com/) broker API.

Built with Next.js 16, React 19, and [98.css](https://jdan.github.io/98.css/) for authentic Windows 98 aesthetics.

![Windows 98 Desktop](https://img.shields.io/badge/theme-Windows%2098-008080)

## Architecture

The system is composed of two repos that work together:

| Repo | Stack | Role |
|------|-------|------|
| **windows-money** (this repo) | Next.js, React 19, 98.css | Win98 desktop UI, broker integration, market data |
| **ai-hedge-fund** | Python, FastAPI, LangGraph | AI analyst agents, portfolio management, backtesting engine |

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

## Tech Stack

- **Framework** — Next.js 16 (App Router)
- **UI** — React 19, 98.css, Tailwind CSS
- **State** — Zustand (persisted stores)
- **Charts** — Recharts
- **AI** — Vercel AI SDK, LangChain
- **Broker API** — InvertirOnline REST API
- **Market Data** — Financial Modeling Prep API
