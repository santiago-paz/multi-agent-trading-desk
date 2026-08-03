# Demo Showcase Mode — Design

**Date:** 2026-08-02
**Status:** Approved (design), pending implementation plan
**Branch:** `demo` (new), deployed as a separate public Vercel project

## Goal

Ship a fully self-contained, public **demo** of the Win98 AI hedge-fund dashboard
that can be linked from the author's personal portfolio. Every window works and
feels alive, but **no real account, database, secret, or paid API is ever
contacted**. The demo runs with `NEXT_PUBLIC_DEMO_MODE=true` and **zero** secret
env vars set.

This extends the existing demo-mode scaffold (`src/lib/demo/data.ts`, already
wired into 9 server actions) to cover the remaining AI-heavy and
company-fundamentals surfaces.

## Hard constraint: no paid / external API, ever (the guarantee)

The single most important requirement. Enforced with **defense-in-depth**:

1. **Primary — interception.** In demo mode, every server action / route / hook
   path returns canned data before any client library is called.
2. **Secondary — hard boundary guards.** At each paid-API network boundary, throw
   immediately if `NEXT_PUBLIC_DEMO_MODE === 'true'`. If any interception path is
   ever missed, it fails **loudly in our own testing** instead of silently making
   a real (and, with no key, failing) outbound request.

Paid / external surfaces and their guard:

| Surface | Host | Reached only via | Guard |
|---|---|---|---|
| IOL broker | `api.invertironline.com` | `IOLClient` (server) | throw at top of `fetchWithAuth` + `requestToken` |
| FMP data | `financialmodelingprep.com/stable/*` | `getFMPApiKey()` (server) | throw inside `getFMPApiKey()` |
| Anthropic | Anthropic SDK | `/api/oraculo` route (server) | demo branch returns before `new Anthropic()` |
| AI hedge-fund backend | `AI_HEDGE_FUND_API_URL` | `/api/hedge-fund/[...path]` proxy (server) | demo branch dispatches before `fetch(upstream)` |
| Wikipedia (free) | `es.wikipedia.org` | `ActiveDesktopWidget` (client) | gate behind `NEXT_PUBLIC_DEMO_MODE`, use local topic pool |

Free static assets that remain (acceptable — unauthenticated, not billed, same
class as the existing jsDelivr icon CDN): FMP company-logo / news images, Win98
icon CDN. News-item `link` hrefs are only fetched if a user clicks them.

**Verification checklist** (run before declaring done — see Testing):
`grep` shows no client-side `fetch` to a paid host; every FMP fn routes through
`getFMPApiKey()`; IOL only via `IOLClient`; with the app built and
`NEXT_PUBLIC_DEMO_MODE=true` and all secrets unset, exercise every window and
confirm zero requests leave for a paid host (and no guard throws).

## Current state

Already covered by `DEMO_MODE` in `src/app/trading/actions.ts` (return canned
data, never hit IOL/FMP): `getMarketData`, `getNewsMetadata`,
`getPortfolioSummary`, `getMEPRate`, `getOperations`, `getCedearsForTrading`,
`placeOrder`, `getOrderStatus`, `getFullPortfolioContext`. The MEP polling store
calls `getMEPRate`, so it is already covered.

**Gaps to close:**
- Company Detail actions: `getCompanyDetail`, `getCompanyAdvancedData`,
  `getCompanyNews`, `searchTickerSymbols` (no demo branch → hit FMP).
- Auto Trader `/run` (SSE), `/optimize`, `/agents` (proxy → Python backend).
- Backtesting `/backtest` (SSE) + `/agents`.
- Oráculo Bursátil `/api/oraculo` (Anthropic) + its Wikipedia topic fetch.

## Interception strategy (chosen: server-side choke points)

Client components stay **byte-for-byte identical** — they issue the same fetches;
the demo feeds them canned bytes. The existing SSE-parsing / streaming client
code keeps running against the fakes, so the demo exercises the real UI path.

Two server files intercept all AI traffic; four server actions get demo branches:

```
api/hedge-fund/[...path]/route.ts  → if DEMO_MODE: dispatch by path[0]
                                       (agents | run | optimize | backtest)
api/oraculo/route.ts               → if DEMO_MODE: scripted SSE stream
trading/actions.ts                 → DEMO_MODE branch on the 4 company-detail actions
```

## New modules

All under `src/lib/demo/`. Small, single-purpose, independently testable.

```
sse.ts             SSE helper: sseEvent(name,data) formatter + pacedStream(events)
                   building a Node ReadableStream that emits with small delays and
                   stops cleanly on cancel (client abort).
agents.ts          DEMO_AGENTS roster (~12 curated) + getDemoAgents() → { agents }.
run-stream.ts      demoRunStream(body): Response(SSE). Parses body.tickers,
                   body.graph_nodes (to recover the portfolio_manager_<suffix>),
                   selected agents. Emits: start → progress per (agent×ticker) with
                   believable analysis text → complete { data:{ analyst_signals,
                   decisions } }. analyst_signals includes a
                   risk_management_agent_<suffix> entry carrying current_price per
                   ticker so the optimizer gets USD prices. Decisions consistent
                   with DEMO_PORTFOLIO (mostly hold; 1–2 buy candidates, 1–2 sells).
optimize.ts        demoOptimize(body): { trades: OptimizePlannedTrade[] } — small
                   deterministic plan from body.decisions within sell_cap/buy_cap;
                   shares_cedear via cedear ratios; is_orphan=false.
backtest-stream.ts demoBacktestStream(body): Response(SSE). Generates a day-by-day
                   equity curve between start_date/end_date (deterministic drift +
                   seeded noise), emitting progress events whose analysis is a
                   JSON-stringified BacktestDayResult and status carries "(n/N)";
                   then final metrics/complete matching BacktestingWindow's parser.
company-detail.ts  getDemoCompanyDetail / getDemoCompanyAdvancedData /
                   getDemoCompanyNews / getDemoSymbolSearch — shapes seeded from
                   src/lib/fmp/__fixtures__/*, with name/price swapped per symbol.
oraculo.ts         DEMO_ORACULO_LINES pool + demoOraculoStream(ticker): scripted
                   rioplatense one-liners streamed as SSE (same wire shape the
                   widget already parses). DEMO_WIKI_TOPICS pool for the widget.
```

### Determinism
Generators are **seeded** from their input (e.g. ticker string / date range), so a
given selection always yields the same run — stable on repeat views, yet different
selections produce visibly different output. Pacing uses real timers for the
"live" feel; content is deterministic.

### Order execution in demo
Clicking **Execute** in Auto Trader shows success rows with fake operation numbers
(via the existing `placeOrder` demo branch) but does **not** mutate holdings; the
portfolio resets on refresh. No stateful fake account (YAGNI).

### Agent roster (`DEMO_AGENTS`)
~12 curated `Agent` objects (`key`, `display_name`, `description`,
`investing_style`, `order`), e.g. warren_buffett, charlie_munger, ben_graham,
bill_ackman, cathie_wood, michael_burry, peter_lynch, phil_fisher,
stanley_druckenmiller, aswath_damodaran, plus technical_analyst,
fundamentals_analyst. Keys are internally consistent with the progress events
`run-stream.ts` emits (we generate both sides).

## Paid-API boundary guards (defense-in-depth)

- `src/lib/fmp/market-data.ts` → `getFMPApiKey()`: throw
  `new Error('FMP disabled in demo mode')` if `NEXT_PUBLIC_DEMO_MODE==='true'`.
  (Verify every paid endpoint routes through it; the image-CDN/logo URLs do not
  and are intentionally left free.)
- `src/lib/iol/client.ts` → guard at the top of `fetchWithAuth` and
  `requestToken` (covers auth + all data calls) with the same throw.
- `src/app/api/oraculo/route.ts` → demo branch returns the scripted stream before
  constructing the Anthropic client.

## Deployment

- New git branch `demo` off `main`. All mocking gated by `NEXT_PUBLIC_DEMO_MODE`,
  so `main` behavior is unchanged; keep `demo` current by merging `main` in.
- Separate Vercel project `hedge-fund-demo` tracking the `demo` branch.
- Env on that project: **only** `NEXT_PUBLIC_DEMO_MODE=true`. Unset
  `IOL_*`, `FMP_API_KEY`, `ANTHROPIC_API_KEY`, `AI_HEDGE_FUND_*`,
  `BASIC_AUTH_*` (leaving basic-auth unset disables `src/proxy.ts` gating, so the
  demo is publicly viewable).

## Testing

Vitest units following the existing `actions.test.ts` `DEMO_MODE`-flip pattern:
- `run-stream`: SSE round-trips through the existing `parseSSEChunk`; a `complete`
  event exists and its `decisions`/`analyst_signals` cover exactly the requested
  tickers; a `risk_management_agent_<suffix>` entry with `current_price` is present.
- `optimize`: returns `{ trades }` within caps; shares_cedear respects ratios.
- `backtest-stream`: N day-result progress events with parseable JSON analysis and
  monotonic "(n/N)" status; metrics at the end.
- `agents`: `getDemoAgents()` returns a sorted, well-formed roster.
- `company-detail`: the four demo getters match the action result shapes.
- Guards: `getFMPApiKey()` / IOL client / oraculo throw or short-circuit under
  `NEXT_PUBLIC_DEMO_MODE=true`.
- Full run of `npm test` + `npm run lint` stays green.
- Manual hermetic check (the Verification checklist above).

## Out of scope (YAGNI)
- Persisting executed demo trades to holdings.
- A real LLM anywhere in the demo.
- Parameterizing the demo beyond what the UI's agent/ticker/date selectors expose.
- Refactoring the streaming client code (it is reused as-is).
