# Demo Showcase Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete a fully self-contained public demo of the Win98 AI hedge-fund dashboard that never contacts a paid/external API.

**Architecture:** Extend the existing `NEXT_PUBLIC_DEMO_MODE` scaffold. Intercept AI traffic at two server files (the `/api/hedge-fund/[...path]` proxy and `/api/oraculo`) and add demo branches to four Company Detail server actions. New generator modules under `src/lib/demo/` produce canned agents, SSE streams, optimizer plans, fundamentals, and oráculo lines. Client components are untouched. On top of interception, hard boundary guards throw at the IOL/FMP/Anthropic network edges so any missed path fails loudly instead of making a real call.

**Tech Stack:** Next.js 16 App Router (Node runtime), React 19, TypeScript, Vitest, Web Streams (`ReadableStream`), 98.css.

## Global Constraints

- **No paid/external API in demo mode, ever.** Paid hosts: `api.invertironline.com` (IOL), `financialmodelingprep.com/stable/*` (FMP), Anthropic SDK, `AI_HEDGE_FUND_API_URL` (Python backend). Free external Wikipedia (`es.wikipedia.org`) gets stubbed too.
- **Demo flag:** `process.env.NEXT_PUBLIC_DEMO_MODE === 'true'`. Read it at **runtime inside functions** (not a module-load constant) in guards and route dispatch, so behavior is env-driven and testable.
- **Single source of truth:** reuse the exported `DEMO_MODE` constant from `@/lib/demo/data` in `actions.ts` and the route dispatch (already imported in `actions.ts`); use an inline `process.env.NEXT_PUBLIC_DEMO_MODE === 'true'` check only inside the low-level guards (`getFMPApiKey`, IOL client) to avoid any import coupling.
- **SSE wire format (run + backtest):** `event: <type>\ndata: <json>\n\n`, parsed by `parseSSEChunk` in `@/lib/sse`.
- **Oráculo wire format:** plain `data: <json>\n\n` deltas `{ text }`, terminated by `data: [DONE]\n\n` (NOT the `event:`/`data:` format).
- **Determinism:** generators are seeded from their input; pacing uses timers for the "live" feel, content is deterministic.
- **No new dependencies.** Node runtime only (`export const runtime = 'nodejs'` already set on both routes).
- **Existing tests + lint stay green:** `npm test` and `npm run lint`.

---

## File Structure

```
src/lib/demo/
  data.ts             (EXISTS — reuse DEMO_MODE, DEMO_PORTFOLIO, DEMO_BASE_PRICES, DEMO_COMPANY_NAMES, DEMO_MEP_RATE)
  seed.ts             (NEW — deterministic hash + pick helpers)
  sse.ts              (NEW — SSE formatter + paced ReadableStream)
  agents.ts           (NEW — DEMO_AGENTS roster + getDemoAgents)
  run-stream.ts       (NEW — buildDemoRunPayload + demoRunStream)
  optimize.ts         (NEW — demoOptimize)
  backtest-stream.ts  (NEW — buildDemoBacktestDays + demoBacktestStream)
  company-detail.ts   (NEW — 4 demo getters)
  oraculo.ts          (NEW — DEMO_ORACULO_LINES, DEMO_WIKI_TOPICS, demoOraculoStream)

Modified:
  src/lib/fmp/market-data.ts                    (guard getFMPApiKey)
  src/lib/iol/client.ts                         (guard fetchWithAuth + requestToken)
  src/app/api/hedge-fund/[...path]/route.ts     (demo dispatch: agents|run|optimize|backtest)
  src/app/api/oraculo/route.ts                  (demo branch)
  src/app/trading/actions.ts                    (demo branch on 4 company-detail actions)
  src/components/ui/ActiveDesktopWidget.tsx     (stub Wikipedia fetch in demo)
```

---

## Task 1: Paid-API boundary guards (defense-in-depth)

**Files:**
- Modify: `src/lib/fmp/market-data.ts` (function `getFMPApiKey`, ~line 50)
- Modify: `src/lib/iol/client.ts` (methods `requestToken` ~line 109, `fetchWithAuth` ~line 136)
- Test: `src/lib/fmp/market-data.guard.test.ts` (create)
- Test: `src/lib/iol/client.guard.test.ts` (create)

**Interfaces:**
- Produces: guards that `throw new Error('<svc> disabled in demo mode (NEXT_PUBLIC_DEMO_MODE)')` when `process.env.NEXT_PUBLIC_DEMO_MODE === 'true'`. No exported API change.

- [ ] **Step 1: Write the failing FMP guard test**

```ts
// src/lib/fmp/market-data.guard.test.ts
import { describe, it, expect, afterEach } from 'vitest';
import { getCompanyProfile } from './market-data';

describe('FMP demo guard', () => {
  afterEach(() => { delete process.env.NEXT_PUBLIC_DEMO_MODE; });

  it('throws before any network call when demo mode is on', async () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
    await expect(getCompanyProfile('AAPL')).rejects.toThrow(/demo mode/i);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/fmp/market-data.guard.test.ts`
Expected: FAIL (no throw; attempts real fetch / missing key).

- [ ] **Step 3: Guard `getFMPApiKey`**

In `src/lib/fmp/market-data.ts`, at the very top of `getFMPApiKey()` body:

```ts
function getFMPApiKey(): string {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    throw new Error('FMP disabled in demo mode (NEXT_PUBLIC_DEMO_MODE)');
  }
  // ...existing body unchanged...
}
```

- [ ] **Step 4: Verify every paid FMP endpoint routes through `getFMPApiKey`**

Run: `grep -n "getFMPApiKey" src/lib/fmp/market-data.ts`
Expected: every exported fetch function (`searchSymbolHits`, `getCompanyProfile`, `getIncomeStatements`, `getHistoricalData`, `getKeyMetrics`, `getCashFlowStatements`, `getBalanceSheetStatements`, `getFinancialScores`, `getDCFValue`, `getTickerNews`, news fetchers, `getCompanyNames`) builds its URL with `getFMPApiKey()`. If any does NOT, add an explicit guard line to that function's top identical to Step 3's throw. Note findings in the commit message.

- [ ] **Step 5: Run FMP guard test to verify it passes**

Run: `npx vitest run src/lib/fmp/market-data.guard.test.ts`
Expected: PASS.

- [ ] **Step 6: Write the failing IOL guard test**

```ts
// src/lib/iol/client.guard.test.ts
import { describe, it, expect, afterEach } from 'vitest';
import { IOLClient } from './client';

describe('IOL demo guard', () => {
  afterEach(() => { delete process.env.NEXT_PUBLIC_DEMO_MODE; });

  it('refuses to make authed calls in demo mode', async () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
    const client = new IOLClient();
    // getEstadoCuenta (or any authed method) must reject before touching the network.
    await expect(client.getEstadoCuenta()).rejects.toThrow(/demo mode/i);
  });
});
```

Note: pick any existing public authed method on `IOLClient` for the assertion; confirm its name via `grep -n "async get\|async place" src/lib/iol/client.ts` and use one that calls `fetchWithAuth`.

- [ ] **Step 7: Run test to verify it fails**

Run: `npx vitest run src/lib/iol/client.guard.test.ts`
Expected: FAIL.

- [ ] **Step 8: Guard the IOL client network methods**

In `src/lib/iol/client.ts`, add the first line inside both `private async requestToken(...)` and `private async fetchWithAuth<T>(...)`:

```ts
if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
  throw new Error('IOL disabled in demo mode (NEXT_PUBLIC_DEMO_MODE)');
}
```

- [ ] **Step 9: Run IOL guard test to verify it passes**

Run: `npx vitest run src/lib/iol/client.guard.test.ts`
Expected: PASS.

- [ ] **Step 10: Full suite still green + commit**

Run: `npm test`
Expected: all pass (integration tests remain skipped).

```bash
git add src/lib/fmp/market-data.ts src/lib/iol/client.ts src/lib/fmp/market-data.guard.test.ts src/lib/iol/client.guard.test.ts
git commit -m "feat(demo): hard-guard IOL/FMP network boundaries under NEXT_PUBLIC_DEMO_MODE"
```

---

## Task 2: Demo primitives — seed + SSE helpers

**Files:**
- Create: `src/lib/demo/seed.ts`
- Create: `src/lib/demo/sse.ts`
- Test: `src/lib/demo/sse.test.ts`

**Interfaces:**
- Produces:
  - `hashString(s: string): number` — non-negative 32-bit hash.
  - `seededPick<T>(arr: readonly T[], seed: number): T`
  - `sseEvent(event: string, data: unknown): string`
  - `pacedStream(items: Array<{ chunk: string; delayMs?: number }>): ReadableStream<Uint8Array>`

- [ ] **Step 1: Write the failing SSE test**

```ts
// src/lib/demo/sse.test.ts
import { describe, it, expect } from 'vitest';
import { sseEvent, pacedStream } from './sse';
import { parseSSEChunk } from '@/lib/sse';

async function readAll(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const dec = new TextDecoder();
  let out = '';
  for (;;) { const { done, value } = await reader.read(); if (done) break; out += dec.decode(value); }
  return out;
}

describe('demo sse helpers', () => {
  it('sseEvent produces a parseable event block', () => {
    const block = sseEvent('progress', { agent: 'x', status: 'done' });
    const [evt] = parseSSEChunk(block);
    expect(evt.event).toBe('progress');
    expect(evt.data).toEqual({ agent: 'x', status: 'done' });
  });

  it('pacedStream emits all chunks in order and round-trips', async () => {
    const items = [
      { chunk: sseEvent('start', {}), delayMs: 0 },
      { chunk: sseEvent('progress', { n: 1 }), delayMs: 0 },
      { chunk: sseEvent('complete', { data: { ok: true } }), delayMs: 0 },
    ];
    const text = await readAll(pacedStream(items));
    const events = parseSSEChunk(text);
    expect(events.map(e => e.event)).toEqual(['start', 'progress', 'complete']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/demo/sse.test.ts`
Expected: FAIL ("Cannot find module './sse'").

- [ ] **Step 3: Implement `seed.ts`**

```ts
// src/lib/demo/seed.ts
/** Deterministic non-negative 32-bit string hash (djb2-ish). */
export function hashString(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return h >>> 0;
}

export function seededPick<T>(arr: readonly T[], seed: number): T {
  return arr[seed % arr.length];
}
```

- [ ] **Step 4: Implement `sse.ts`**

```ts
// src/lib/demo/sse.ts
export function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export interface PacedItem { chunk: string; delayMs?: number }

/** Emits chunks in order with optional per-chunk delay; stops cleanly on cancel. */
export function pacedStream(items: PacedItem[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  let cancelled = false;
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      for (const item of items) {
        if (cancelled) break;
        controller.enqueue(encoder.encode(item.chunk));
        if (item.delayMs && item.delayMs > 0) {
          await new Promise((r) => setTimeout(r, item.delayMs));
        }
      }
      if (!cancelled) controller.close();
    },
    cancel() { cancelled = true; },
  });
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/lib/demo/sse.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/demo/seed.ts src/lib/demo/sse.ts src/lib/demo/sse.test.ts
git commit -m "feat(demo): add seed + paced SSE stream primitives"
```

---

## Task 3: Demo agents roster + proxy demo dispatch

**Files:**
- Create: `src/lib/demo/agents.ts`
- Modify: `src/app/api/hedge-fund/[...path]/route.ts`
- Test: `src/lib/demo/agents.test.ts`

**Interfaces:**
- Consumes: `Agent` from `@/lib/backtesting/types`.
- Produces:
  - `DEMO_AGENTS: Agent[]`
  - `getDemoAgents(): { agents: Agent[] }` (sorted by `order`)
  - Proxy dispatch helper `demoHedgeFundResponse(path: string[], req: Request): Promise<Response> | null` — returns a `Response` for a known demo path, or `null` to fall through (used by later tasks too).

- [ ] **Step 1: Write the failing agents test**

```ts
// src/lib/demo/agents.test.ts
import { describe, it, expect } from 'vitest';
import { DEMO_AGENTS, getDemoAgents } from './agents';

describe('demo agents', () => {
  it('exposes a curated roster', () => {
    expect(DEMO_AGENTS.length).toBeGreaterThanOrEqual(10);
    for (const a of DEMO_AGENTS) {
      expect(a.key).toMatch(/^[a-z_]+$/);
      expect(a.display_name.length).toBeGreaterThan(0);
      expect(typeof a.order).toBe('number');
    }
  });

  it('getDemoAgents returns them sorted by order', () => {
    const { agents } = getDemoAgents();
    const orders = agents.map(a => a.order);
    expect(orders).toEqual([...orders].sort((x, y) => x - y));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/demo/agents.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `agents.ts`**

```ts
// src/lib/demo/agents.ts
import type { Agent } from '@/lib/backtesting/types';

export const DEMO_AGENTS: Agent[] = [
  { key: 'warren_buffett',        display_name: 'Warren Buffett',        description: 'Busca negocios maravillosos a precios razonables; foco en foso económico y management.', investing_style: 'value',        order: 1 },
  { key: 'charlie_munger',        display_name: 'Charlie Munger',        description: 'Calidad sobre precio, modelos mentales y ventajas competitivas durables.',               investing_style: 'value',        order: 2 },
  { key: 'ben_graham',            display_name: 'Ben Graham',            description: 'Margen de seguridad y net-nets; el padre del value investing.',                          investing_style: 'deep_value',   order: 3 },
  { key: 'bill_ackman',           display_name: 'Bill Ackman',           description: 'Activista concentrado en pocas posiciones de alta convicción.',                          investing_style: 'activist',     order: 4 },
  { key: 'cathie_wood',           display_name: 'Cathie Wood',           description: 'Innovación disruptiva y crecimiento exponencial a largo plazo.',                         investing_style: 'growth',       order: 5 },
  { key: 'michael_burry',         display_name: 'Michael Burry',         description: 'Contrarian de deep value; caza asimetrías e ineficiencias del mercado.',                  investing_style: 'contrarian',   order: 6 },
  { key: 'peter_lynch',           display_name: 'Peter Lynch',           description: 'Invertí en lo que conocés; busca ten-baggers con PEG razonable.',                        investing_style: 'growth',       order: 7 },
  { key: 'phil_fisher',           display_name: 'Phil Fisher',           description: 'Scuttlebutt y crecimiento de calidad sostenido en el tiempo.',                           investing_style: 'growth',       order: 8 },
  { key: 'stanley_druckenmiller', display_name: 'Stanley Druckenmiller', description: 'Macro top-down; concentra fuerte cuando la convicción es alta.',                        investing_style: 'macro',        order: 9 },
  { key: 'aswath_damodaran',      display_name: 'Aswath Damodaran',      description: 'Valuación por DCF y narrativas convertidas en números.',                                investing_style: 'valuation',    order: 10 },
  { key: 'technical_analyst',     display_name: 'Technical Analyst',     description: 'Tendencia, momentum y medias móviles sobre la acción del precio.',                       investing_style: 'technical',    order: 11 },
  { key: 'fundamentals_analyst',  display_name: 'Fundamentals Analyst',  description: 'Ratios, márgenes y salud financiera de los estados contables.',                          investing_style: 'fundamental',  order: 12 },
];

export function getDemoAgents(): { agents: Agent[] } {
  return { agents: [...DEMO_AGENTS].sort((a, b) => a.order - b.order) };
}
```

- [ ] **Step 4: Add the demo dispatch to the proxy route**

In `src/app/api/hedge-fund/[...path]/route.ts`, add near the top of `proxy(...)`, BEFORE the `UPSTREAM_URL/API_KEY` check:

```ts
import { getDemoAgents } from '@/lib/demo/agents';

// ...inside proxy(), after `const { path } = await ctx.params;`:
if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
  const demo = await demoHedgeFundResponse(path, req);
  if (demo) return demo;
}
```

Add this helper in the same file (it grows in Tasks 4–6):

```ts
async function demoHedgeFundResponse(path: string[], req: NextRequest): Promise<Response | null> {
  const endpoint = path[0];
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

  if (endpoint === 'agents') return json(getDemoAgents());
  // 'run' | 'optimize' | 'backtest' added in later tasks.
  return null;
}
```

Move `const { path } = await ctx.params;` above the config check if needed so `path` is in scope. Keep the existing `UPSTREAM_URL/API_KEY` 500 path intact for non-demo mode.

- [ ] **Step 5: Run agents test to verify it passes**

Run: `npx vitest run src/lib/demo/agents.test.ts`
Expected: PASS.

- [ ] **Step 6: Manually verify the proxy in demo mode**

Run:
```bash
NEXT_PUBLIC_DEMO_MODE=true npm run dev
# in another shell:
curl -s http://localhost:3000/api/hedge-fund/agents | head -c 300
```
Expected: JSON `{"agents":[...]}` with no upstream call and no 500.

- [ ] **Step 7: Commit**

```bash
git add src/lib/demo/agents.ts src/lib/demo/agents.test.ts "src/app/api/hedge-fund/[...path]/route.ts"
git commit -m "feat(demo): serve canned agent roster + add proxy demo dispatch"
```

---

## Task 4: Demo Auto Trader `/run` stream

**Files:**
- Create: `src/lib/demo/run-stream.ts`
- Modify: `src/app/api/hedge-fund/[...path]/route.ts` (register `run`)
- Test: `src/lib/demo/run-stream.test.ts`

**Interfaces:**
- Consumes: `hashString`, `seededPick` from `./seed`; `sseEvent`, `pacedStream` from `./sse`; `DEMO_AGENTS` from `./agents`; `DEMO_BASE_PRICES` from `./data` (export it if not already).
- Produces:
  - `interface DemoRunBody { tickers?: string[]; graph_nodes?: Array<{ id: string }>; }`
  - `buildDemoRunPayload(body: DemoRunBody): { analyst_signals: Record<string, Record<string, unknown>>; decisions: Record<string, { action: string; quantity: number; confidence: number; reasoning: string }> }`
  - `demoRunStream(body: DemoRunBody, opts?: { delayMs?: number }): Response`

- [ ] **Step 1: Export `DEMO_BASE_PRICES` from `data.ts`**

In `src/lib/demo/data.ts` change `const DEMO_BASE_PRICES` to `export const DEMO_BASE_PRICES`. (Confirm with `grep -n "DEMO_BASE_PRICES" src/lib/demo/data.ts`.)

- [ ] **Step 2: Write the failing run-stream test**

```ts
// src/lib/demo/run-stream.test.ts
import { describe, it, expect } from 'vitest';
import { buildDemoRunPayload, demoRunStream } from './run-stream';
import { parseSSEChunk } from '@/lib/sse';

const BODY = {
  tickers: ['AAPL', 'KO', 'NVDA'],
  graph_nodes: [
    { id: 'warren_buffett' },
    { id: 'technical_analyst' },
    { id: 'portfolio_manager_ab12cd' },
  ],
};

async function readAll(res: Response): Promise<string> {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let out = '';
  for (;;) { const { done, value } = await reader.read(); if (done) break; out += dec.decode(value); }
  return out;
}

describe('demo /run', () => {
  it('builds decisions + signals for exactly the requested tickers', () => {
    const p = buildDemoRunPayload(BODY);
    expect(Object.keys(p.decisions).sort()).toEqual(['AAPL', 'KO', 'NVDA']);
    // one signal record per selected agent, plus the risk manager
    expect(p.analyst_signals['warren_buffett']).toBeTruthy();
    expect(p.analyst_signals['risk_management_agent_ab12cd']).toBeTruthy();
    const risk = p.analyst_signals['risk_management_agent_ab12cd'] as Record<string, { current_price: number }>;
    expect(risk['AAPL'].current_price).toBeGreaterThan(0);
  });

  it('streams start -> progress -> complete, round-trippable', async () => {
    const text = await readAll(demoRunStream(BODY, { delayMs: 0 }));
    const events = parseSSEChunk(text);
    const kinds = events.map(e => e.event);
    expect(kinds[0]).toBe('start');
    expect(kinds).toContain('progress');
    expect(kinds[kinds.length - 1]).toBe('complete');
    const complete = events[events.length - 1].data as { data: { decisions: Record<string, unknown> } };
    expect(Object.keys(complete.data.decisions)).toContain('NVDA');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/lib/demo/run-stream.test.ts`
Expected: FAIL.

- [ ] **Step 4: Implement `run-stream.ts`**

```ts
// src/lib/demo/run-stream.ts
import { hashString, seededPick } from './seed';
import { sseEvent, pacedStream, type PacedItem } from './sse';
import { DEMO_AGENTS } from './agents';
import { DEMO_BASE_PRICES } from './data';

export interface DemoRunBody {
  tickers?: string[];
  graph_nodes?: Array<{ id: string }>;
}

const SIGNALS = ['bullish', 'bearish', 'neutral'] as const;
const ACTIONS = ['buy', 'sell', 'hold', 'hold', 'hold'] as const; // hold-weighted

function selectedAgentKeys(body: DemoRunBody): string[] {
  const ids = (body.graph_nodes ?? []).map((n) => n.id);
  const known = new Set(DEMO_AGENTS.map((a) => a.key));
  const picked = ids.filter((id) => known.has(id));
  return picked.length ? picked : ['warren_buffett'];
}

function riskManagerId(body: DemoRunBody): string {
  const pm = (body.graph_nodes ?? []).map((n) => n.id).find((id) => id.startsWith('portfolio_manager_'));
  const suffix = pm ? pm.slice('portfolio_manager_'.length) : 'demo00';
  return `risk_management_agent_${suffix}`;
}

function priceUsd(ticker: string): number {
  const base = DEMO_BASE_PRICES[ticker] ?? 50 + (hashString(ticker) % 400);
  return Math.round(base * 100) / 100;
}

export function buildDemoRunPayload(body: DemoRunBody) {
  const tickers = body.tickers ?? [];
  const agents = selectedAgentKeys(body);

  const analyst_signals: Record<string, Record<string, unknown>> = {};
  for (const agent of agents) {
    const agentName = DEMO_AGENTS.find((a) => a.key === agent)?.display_name ?? agent;
    const perTicker: Record<string, unknown> = {};
    for (const t of tickers) {
      const seed = hashString(`${agent}:${t}`);
      const signal = seededPick(SIGNALS, seed);
      perTicker[t] = {
        signal,
        confidence: 55 + (seed % 40),
        reasoning: `${agentName} ve a ${t} como ${signal} según su estilo.`,
      };
    }
    analyst_signals[agent] = perTicker;
  }

  // Risk manager carries current_price per ticker (frontend forwards these to the optimizer).
  const riskId = riskManagerId(body);
  const riskSignals: Record<string, unknown> = {};
  for (const t of tickers) riskSignals[t] = { current_price: priceUsd(t) };
  analyst_signals[riskId] = riskSignals;

  const decisions: Record<string, { action: string; quantity: number; confidence: number; reasoning: string }> = {};
  for (const t of tickers) {
    const seed = hashString(`decision:${t}`);
    const action = seededPick(ACTIONS, seed);
    decisions[t] = {
      action,
      quantity: action === 'hold' ? 0 : 1 + (seed % 5),
      confidence: 60 + (seed % 35),
      reasoning: `Consenso de agentes sobre ${t}: ${action}.`,
    };
  }

  return { analyst_signals, decisions };
}

export function demoRunStream(body: DemoRunBody, opts: { delayMs?: number } = {}): Response {
  const delayMs = opts.delayMs ?? 18;
  const tickers = body.tickers ?? [];
  const agents = selectedAgentKeys(body);
  const payload = buildDemoRunPayload(body);

  const items: PacedItem[] = [];
  items.push({ chunk: sseEvent('start', {}), delayMs });

  for (const agent of agents) {
    const agentName = DEMO_AGENTS.find((a) => a.key === agent)?.display_name ?? agent;
    for (const t of tickers) {
      const sig = (payload.analyst_signals[agent] as Record<string, { signal: string; confidence: number }>)[t];
      items.push({
        chunk: sseEvent('progress', {
          agent,
          ticker: t,
          status: 'done',
          analysis: `${agentName} · ${t}: ${sig.signal} (confianza ${sig.confidence}%)`,
          result: 'ok',
        }),
        delayMs,
      });
    }
  }

  items.push({ chunk: sseEvent('complete', { data: payload }), delayMs: 0 });
  return new Response(pacedStream(items), {
    headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache, no-transform' },
  });
}
```

- [ ] **Step 5: Register `run` in the proxy dispatch**

In `demoHedgeFundResponse` (route.ts), before `return null;`:

```ts
if (endpoint === 'run') {
  const body = await req.json().catch(() => ({}));
  return demoRunStream(body);
}
```
Add `import { demoRunStream } from '@/lib/demo/run-stream';` at the top.

- [ ] **Step 6: Run run-stream test to verify it passes**

Run: `npx vitest run src/lib/demo/run-stream.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/demo/run-stream.ts src/lib/demo/run-stream.test.ts src/lib/demo/data.ts "src/app/api/hedge-fund/[...path]/route.ts"
git commit -m "feat(demo): scripted Auto Trader /run SSE stream"
```

---

## Task 5: Demo `/optimize` plan

**Files:**
- Create: `src/lib/demo/optimize.ts`
- Modify: `src/app/api/hedge-fund/[...path]/route.ts` (register `optimize`)
- Test: `src/lib/demo/optimize.test.ts`

**Interfaces:**
- Consumes: cedear ratios `cedearsToShares`/`getCedearRatio` from `@/lib/cedear-ratios` (for shares_cedear from shares_underlying).
- Produces:
  - `interface DemoOptimizeBody { decisions?: Record<string, { action: string; quantity: number; confidence: number; reasoning: string }>; current_prices_usd?: Record<string, number>; sell_cap_usd?: number; buy_cap_usd?: number; fx_ars_per_usd?: number; }`
  - `demoOptimize(body: DemoOptimizeBody): { trades: OptimizeTrade[] }` where `OptimizeTrade` matches the wire shape `fetchOptimizedPlan` parses (`ticker, action, shares_underlying, shares_cedear, price_usd, gross_usd, commission_usd, net_usd, price_ars_display, gross_ars_display, confidence, reasoning, agent_signals, is_orphan`).

- [ ] **Step 1: Write the failing optimize test**

```ts
// src/lib/demo/optimize.test.ts
import { describe, it, expect } from 'vitest';
import { demoOptimize } from './optimize';

describe('demo /optimize', () => {
  it('turns buy/sell decisions into trades within caps', () => {
    const { trades } = demoOptimize({
      decisions: {
        AAPL: { action: 'buy', quantity: 3, confidence: 80, reasoning: 'x' },
        KO:   { action: 'sell', quantity: 2, confidence: 70, reasoning: 'y' },
        NVDA: { action: 'hold', quantity: 0, confidence: 50, reasoning: 'z' },
      },
      current_prices_usd: { AAPL: 220, KO: 70, NVDA: 900 },
      sell_cap_usd: 5000,
      buy_cap_usd: 5000,
      fx_ars_per_usd: 1347.5,
    });
    const actions = trades.map(t => t.action).sort();
    expect(actions).toEqual(['buy', 'sell']);           // hold dropped
    for (const t of trades) {
      expect(t.shares_cedear).toBeGreaterThan(0);
      expect(t.price_ars_display).toBeGreaterThan(0);
      expect(t.is_orphan).toBe(false);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/demo/optimize.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `optimize.ts`**

```ts
// src/lib/demo/optimize.ts
import { sharesToCedears } from '@/lib/cedear-ratios';

export interface DemoOptimizeBody {
  decisions?: Record<string, { action: string; quantity: number; confidence: number; reasoning: string }>;
  current_prices_usd?: Record<string, number>;
  sell_cap_usd?: number;
  buy_cap_usd?: number;
  fx_ars_per_usd?: number;
}

interface OptimizeTrade {
  ticker: string;
  action: 'buy' | 'sell';
  shares_underlying: number;
  shares_cedear: number;
  price_usd: number;
  gross_usd: number;
  commission_usd: number;
  net_usd: number;
  price_ars_display: number;
  gross_ars_display: number;
  confidence: number;
  reasoning: string;
  agent_signals: Record<string, Record<string, unknown>>;
  is_orphan: boolean;
}

const COMMISSION = 0.0065;

export function demoOptimize(body: DemoOptimizeBody): { trades: OptimizeTrade[] } {
  const decisions = body.decisions ?? {};
  const prices = body.current_prices_usd ?? {};
  const fx = body.fx_ars_per_usd ?? 1347.5;
  const sellCap = body.sell_cap_usd ?? Infinity;
  const buyCap = body.buy_cap_usd ?? Infinity;

  let spentBuy = 0;
  let spentSell = 0;
  const trades: OptimizeTrade[] = [];

  for (const [ticker, dec] of Object.entries(decisions)) {
    if (dec.action !== 'buy' && dec.action !== 'sell') continue;
    const priceUsd = prices[ticker] ?? 100;
    let sharesUnderlying = Math.max(1, Math.round(dec.quantity || 1));
    let grossUsd = sharesUnderlying * priceUsd;

    // Respect the per-side cap by trimming underlying share count.
    const cap = dec.action === 'buy' ? buyCap - spentBuy : sellCap - spentSell;
    if (grossUsd > cap) {
      sharesUnderlying = Math.max(0, Math.floor(cap / priceUsd));
      grossUsd = sharesUnderlying * priceUsd;
    }
    if (sharesUnderlying <= 0) continue;

    const commissionUsd = Math.round(grossUsd * COMMISSION * 100) / 100;
    const netUsd = dec.action === 'buy' ? grossUsd + commissionUsd : grossUsd - commissionUsd;
    const priceArs = Math.round(priceUsd * fx * 100) / 100;
    const sharesCedear = Math.max(1, Math.round(sharesToCedears(sharesUnderlying, ticker)));

    if (dec.action === 'buy') spentBuy += grossUsd; else spentSell += grossUsd;

    trades.push({
      ticker,
      action: dec.action,
      shares_underlying: sharesUnderlying,
      shares_cedear: sharesCedear,
      price_usd: priceUsd,
      gross_usd: Math.round(grossUsd * 100) / 100,
      commission_usd: commissionUsd,
      net_usd: Math.round(netUsd * 100) / 100,
      price_ars_display: priceArs,
      gross_ars_display: Math.round(sharesCedear * priceArs * 100) / 100,
      confidence: dec.confidence,
      reasoning: dec.reasoning,
      agent_signals: {},
      is_orphan: false,
    });
  }

  return { trades };
}
```

Confirm `sharesToCedears(shares, symbol)` signature via `sed -n '486,510p' src/lib/cedear-ratios.ts`; adjust the call if the parameter order differs.

- [ ] **Step 4: Register `optimize` in the proxy dispatch**

```ts
if (endpoint === 'optimize') {
  const body = await req.json().catch(() => ({}));
  return json(demoOptimize(body));
}
```
Add `import { demoOptimize } from '@/lib/demo/optimize';`.

- [ ] **Step 5: Run optimize test to verify it passes**

Run: `npx vitest run src/lib/demo/optimize.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/demo/optimize.ts src/lib/demo/optimize.test.ts "src/app/api/hedge-fund/[...path]/route.ts"
git commit -m "feat(demo): scripted /optimize rebalance plan"
```

---

## Task 6: Demo Backtesting `/backtest` stream

**Files:**
- Create: `src/lib/demo/backtest-stream.ts`
- Modify: `src/app/api/hedge-fund/[...path]/route.ts` (register `backtest`)
- Test: `src/lib/demo/backtest-stream.test.ts`

**Interfaces:**
- Consumes: `hashString` from `./seed`; `sseEvent`, `pacedStream` from `./sse`; `BacktestDayResult`, `PerformanceMetrics` from `@/lib/backtesting/types`.
- Produces:
  - `interface DemoBacktestBody { tickers?: string[]; initial_capital?: number; start_date?: string; end_date?: string; }`
  - `buildDemoBacktestDays(body: DemoBacktestBody): { days: BacktestDayResult[]; metrics: PerformanceMetrics }`
  - `demoBacktestStream(body: DemoBacktestBody, opts?: { delayMs?: number }): Response`

- [ ] **Step 1: Write the failing backtest test**

```ts
// src/lib/demo/backtest-stream.test.ts
import { describe, it, expect } from 'vitest';
import { buildDemoBacktestDays, demoBacktestStream } from './backtest-stream';
import { parseSSEChunk } from '@/lib/sse';
import type { BacktestDayResult } from '@/lib/backtesting/types';

const BODY = { tickers: ['AAPL', 'KO'], initial_capital: 10000, start_date: '2025-01-01', end_date: '2025-01-10' };

async function readAll(res: Response): Promise<string> {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let out = '';
  for (;;) { const { done, value } = await reader.read(); if (done) break; out += dec.decode(value); }
  return out;
}

describe('demo /backtest', () => {
  it('generates one day result per trading day with monotonic progress', () => {
    const { days, metrics } = buildDemoBacktestDays(BODY);
    expect(days.length).toBeGreaterThan(0);
    expect(days[0].portfolio_value).toBeGreaterThan(0);
    expect(typeof metrics.sharpe_ratio).toBe('number');
  });

  it('streams day-result progress events + a complete with metrics', async () => {
    const text = await readAll(demoBacktestStream(BODY, { delayMs: 0 }));
    const events = parseSSEChunk(text);
    const progress = events.filter(e => e.event === 'progress');
    expect(progress.length).toBeGreaterThan(0);
    // day-result analysis parses back to a BacktestDayResult and status carries (n/N)
    const first = progress[0].data as { agent: string; status: string; analysis: string };
    expect(first.agent).toBe('backtest');
    expect(first.status).toMatch(/\(\d+\/\d+\)/);
    const day = JSON.parse(first.analysis) as BacktestDayResult;
    expect(day.date).toBeTruthy();
    const complete = events.find(e => e.event === 'complete')!.data as { data: { performance_metrics: unknown; total_days: number } };
    expect(complete.data.total_days).toBe(progress.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/demo/backtest-stream.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `backtest-stream.ts`**

```ts
// src/lib/demo/backtest-stream.ts
import { hashString } from './seed';
import { sseEvent, pacedStream, type PacedItem } from './sse';
import type { BacktestDayResult, PerformanceMetrics } from '@/lib/backtesting/types';

export interface DemoBacktestBody {
  tickers?: string[];
  initial_capital?: number;
  start_date?: string;
  end_date?: string;
}

/** Trading days (Mon–Fri) between two ISO dates, capped for a snappy demo. */
function tradingDays(startISO: string, endISO: string): string[] {
  const out: string[] = [];
  const start = new Date(startISO + 'T00:00:00Z');
  const end = new Date(endISO + 'T00:00:00Z');
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return out;
  const d = new Date(start);
  while (d <= end && out.length < 120) {
    const dow = d.getUTCDay();
    if (dow !== 0 && dow !== 6) out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

export function buildDemoBacktestDays(body: DemoBacktestBody): { days: BacktestDayResult[]; metrics: PerformanceMetrics } {
  const tickers = body.tickers ?? ['AAPL'];
  const initial = body.initial_capital ?? 10000;
  const dates = tradingDays(body.start_date ?? '2025-01-01', body.end_date ?? '2025-03-01');

  let value = initial;
  let peak = initial;
  let maxDrawdown = 0;
  let maxDrawdownDate = dates[0] ?? '';
  const days: BacktestDayResult[] = [];

  dates.forEach((date, i) => {
    // Deterministic drift + seeded noise around a mild uptrend.
    const noise = ((hashString(`${date}:${i}`) % 1000) / 1000 - 0.45) * 0.02;
    value = Math.round(value * (1 + 0.0008 + noise) * 100) / 100;
    if (value > peak) peak = value;
    const dd = (peak - value) / peak;
    if (dd > maxDrawdown) { maxDrawdown = dd; maxDrawdownDate = date; }

    const current_prices: Record<string, number> = {};
    for (const t of tickers) current_prices[t] = 50 + (hashString(`${t}:${date}`) % 400);

    days.push({
      date,
      portfolio_value: value,
      cash: Math.round(value * 0.15 * 100) / 100,
      decisions: {},
      executed_trades: {},
      analyst_signals: {},
      current_prices,
      long_exposure: Math.round(value * 0.85 * 100) / 100,
      short_exposure: 0,
      gross_exposure: Math.round(value * 0.85 * 100) / 100,
      net_exposure: Math.round(value * 0.85 * 100) / 100,
    });
  });

  const totalReturn = initial > 0 ? (value - initial) / initial : 0;
  const metrics: PerformanceMetrics = {
    sharpe_ratio: Math.round((1.2 + totalReturn) * 100) / 100,
    sortino_ratio: Math.round((1.6 + totalReturn) * 100) / 100,
    max_drawdown: Math.round(-maxDrawdown * 1000) / 10, // percent, negative
    max_drawdown_date: maxDrawdownDate,
    gross_exposure: days.length ? days[days.length - 1].gross_exposure : 0,
    net_exposure: days.length ? days[days.length - 1].net_exposure : 0,
  };

  return { days, metrics };
}

export function demoBacktestStream(body: DemoBacktestBody, opts: { delayMs?: number } = {}): Response {
  const delayMs = opts.delayMs ?? 20;
  const { days, metrics } = buildDemoBacktestDays(body);

  const items: PacedItem[] = [];
  items.push({ chunk: sseEvent('start', {}), delayMs });
  days.forEach((day, i) => {
    items.push({
      chunk: sseEvent('progress', {
        agent: 'backtest',
        status: `Completed ${day.date} (${i + 1}/${days.length}) - Portfolio: $${day.portfolio_value}`,
        analysis: JSON.stringify(day),
      }),
      delayMs,
    });
  });
  items.push({
    chunk: sseEvent('complete', { data: { performance_metrics: metrics, total_days: days.length } }),
    delayMs: 0,
  });

  return new Response(pacedStream(items), {
    headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache, no-transform' },
  });
}
```

- [ ] **Step 4: Register `backtest` in the proxy dispatch**

```ts
if (endpoint === 'backtest') {
  const body = await req.json().catch(() => ({}));
  return demoBacktestStream(body);
}
```
Add `import { demoBacktestStream } from '@/lib/demo/backtest-stream';`.

- [ ] **Step 5: Run backtest test to verify it passes**

Run: `npx vitest run src/lib/demo/backtest-stream.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/demo/backtest-stream.ts src/lib/demo/backtest-stream.test.ts "src/app/api/hedge-fund/[...path]/route.ts"
git commit -m "feat(demo): scripted Backtesting /backtest SSE stream"
```

---

## Task 7: Demo Company Detail

**Files:**
- Create: `src/lib/demo/company-detail.ts`
- Modify: `src/app/trading/actions.ts` (4 actions: `searchTickerSymbols`, `getCompanyDetail`, `getCompanyAdvancedData`, `getCompanyNews`)
- Test: `src/lib/demo/company-detail.test.ts`

**Interfaces:**
- Consumes: types `CompanyProfile`, `IncomeStatementRow`, `KeyMetricsRow`, `CashFlowRow`, `BalanceSheetRow`, `FinancialScores`, `DCFValue`, `NewsItem`, `SymbolSearchHit` from `@/lib/fmp/types`; `DEMO_COMPANY_NAMES`, `DEMO_BASE_PRICES` from `./data`; `toFmpTicker`, `isEtf` from `@/lib/cedear-map`.
- Produces:
  - `getDemoCompanyDetail(iolBaseSymbol: string): CompanyDetailResult` — shape identical to `actions.ts` `CompanyDetailResult` (`fmpTicker, profile, isEtf, noUsEquivalent, priceHistory, incomeStatements`).
  - `getDemoCompanyAdvancedData(fmpTicker: string): AdvancedDetailResult` (`keyMetrics, cashFlow, balanceSheet, scores, dcf`).
  - `getDemoCompanyNews(fmpTicker: string): NewsItem[]`
  - `getDemoSymbolSearch(query: string): SymbolSearchHit[]`

Verify the exact `CompanyDetailResult` field list at `src/app/trading/actions.ts:536` and `AdvancedDetailResult` at `:603` before implementing.

- [ ] **Step 1: Write the failing company-detail test**

```ts
// src/lib/demo/company-detail.test.ts
import { describe, it, expect } from 'vitest';
import {
  getDemoCompanyDetail, getDemoCompanyAdvancedData, getDemoCompanyNews, getDemoSymbolSearch,
} from './company-detail';

describe('demo company detail', () => {
  it('returns a profile + price history + income statements for a known symbol', () => {
    const d = getDemoCompanyDetail('AAPL');
    expect(d.fmpTicker).toBe('AAPL');
    expect(d.profile?.companyName).toBeTruthy();
    expect(d.priceHistory.length).toBeGreaterThan(0);
    expect(d.incomeStatements.length).toBeGreaterThan(0);
    expect(d.noUsEquivalent).toBe(false);
  });

  it('returns advanced data blocks', () => {
    const a = getDemoCompanyAdvancedData('AAPL');
    expect(a.keyMetrics.length).toBeGreaterThan(0);
    expect(a.cashFlow.length).toBeGreaterThan(0);
    expect(a.balanceSheet.length).toBeGreaterThan(0);
    expect(a.dcf?.dcf).toBeGreaterThan(0);
  });

  it('news + search are non-empty and well-shaped', () => {
    expect(getDemoCompanyNews('AAPL')[0].title).toBeTruthy();
    const hits = getDemoSymbolSearch('app');
    expect(hits.every(h => h.symbol && h.name)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/demo/company-detail.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `company-detail.ts`**

Build objects matching the FMP row types (see `src/lib/fmp/types.ts`), seeded per symbol from `DEMO_BASE_PRICES`/`DEMO_COMPANY_NAMES`. Numbers derived from the recorded `src/lib/fmp/__fixtures__/*.json` are fine to hardcode as a template, then scaled by the symbol's base price so each company differs.

```ts
// src/lib/demo/company-detail.ts
import type {
  CompanyProfile, IncomeStatementRow, KeyMetricsRow, CashFlowRow,
  BalanceSheetRow, FinancialScores, DCFValue, NewsItem, SymbolSearchHit,
} from '@/lib/fmp/types';
import { hashString } from './seed';
import { DEMO_COMPANY_NAMES, DEMO_BASE_PRICES } from './data';
import { toFmpTicker, isEtf } from '@/lib/cedear-map';

interface CompanyDetailResult {
  fmpTicker: string | null;
  profile: CompanyProfile | null;
  isEtf: boolean;
  noUsEquivalent: boolean;
  priceHistory: { date: string; close: number; volume: number }[];
  incomeStatements: IncomeStatementRow[];
}
interface AdvancedDetailResult {
  keyMetrics: KeyMetricsRow[];
  cashFlow: CashFlowRow[];
  balanceSheet: BalanceSheetRow[];
  scores: FinancialScores | null;
  dcf: DCFValue | null;
}

function basePrice(sym: string): number {
  return DEMO_BASE_PRICES[sym] ?? 50 + (hashString(sym) % 400);
}
function name(sym: string): string {
  return DEMO_COMPANY_NAMES[sym] ?? `${sym} Corp.`;
}
function lastNYears(n: number): string[] {
  const y = 2025; // fixed anchor — keep deterministic (no Date.now in generated data)
  return Array.from({ length: n }, (_, i) => `${y - i}-12-31`);
}

function demoProfile(sym: string): CompanyProfile {
  const price = basePrice(sym);
  const cap = Math.round(price * (5e8 + (hashString(sym) % 2e9)));
  return {
    symbol: sym, companyName: name(sym),
    sector: 'Technology', industry: 'Consumer Electronics',
    description: `${name(sym)} es una compañía de demostración usada en el modo demo del dashboard.`,
    mktCap: cap, price, beta: 1 + ((hashString(sym) % 100) / 100),
    volAvg: 20_000_000 + (hashString(sym) % 30_000_000),
    website: 'https://example.com', country: 'US', exchange: 'NASDAQ',
    currency: 'USD', image: `https://images.financialmodelingprep.com/symbol/${sym}.png`,
    ipoDate: '1998-01-01', isEtf: false, isActivelyTrading: true,
  };
}

function demoIncome(sym: string): IncomeStatementRow[] {
  const rev0 = Math.round(basePrice(sym) * 1e9);
  return lastNYears(4).map((date, i) => {
    const rev = Math.round(rev0 * (1 - i * 0.08));
    return { date, revenue: rev, netIncome: Math.round(rev * 0.24), grossProfit: Math.round(rev * 0.44), operatingIncome: Math.round(rev * 0.30), eps: Math.round(basePrice(sym) * 0.03 * 100) / 100 };
  });
}

export function getDemoCompanyDetail(iolBaseSymbol: string): CompanyDetailResult {
  const fmpTicker = toFmpTicker(iolBaseSymbol);
  const etf = isEtf(iolBaseSymbol);
  if (!fmpTicker) {
    return { fmpTicker: null, profile: null, isEtf: etf, noUsEquivalent: true, priceHistory: [], incomeStatements: [] };
  }
  const price = basePrice(fmpTicker);
  const priceHistory = Array.from({ length: 90 }, (_, i) => {
    const seed = hashString(`${fmpTicker}:${i}`);
    const p = Math.round(price * (0.85 + (seed % 300) / 1000) * 100) / 100;
    // deterministic descending dates from a fixed anchor
    const day = String((i % 28) + 1).padStart(2, '0');
    const month = String((i % 12) + 1).padStart(2, '0');
    return { date: `2025-${month}-${day}`, close: p, volume: 10_000_000 + (seed % 40_000_000) };
  });
  return { fmpTicker, profile: demoProfile(fmpTicker), isEtf: etf, noUsEquivalent: false, priceHistory, incomeStatements: demoIncome(fmpTicker) };
}

export function getDemoCompanyAdvancedData(fmpTicker: string): AdvancedDetailResult {
  const price = basePrice(fmpTicker);
  const keyMetrics: KeyMetricsRow[] = lastNYears(4).map((date, i) => ({
    date, peRatio: 22 - i, pbRatio: 8 - i * 0.5, roe: 0.35 - i * 0.02, roa: 0.18 - i * 0.01,
    debtToEquity: 1.2 - i * 0.05, currentRatio: 1.1, dividendYield: 0.005,
    enterpriseValue: Math.round(price * 2.5e9), evToEbitda: 18 - i,
  }));
  const cashFlow: CashFlowRow[] = lastNYears(4).map((date, i) => ({
    date, operatingCashFlow: Math.round(price * 8e8 * (1 - i * 0.06)),
    capitalExpenditure: -Math.round(price * 1e8), freeCashFlow: Math.round(price * 7e8 * (1 - i * 0.06)),
    dividendsPaid: -Math.round(price * 5e7),
  }));
  const balanceSheet: BalanceSheetRow[] = lastNYears(4).map((date, i) => ({
    date, totalAssets: Math.round(price * 3e9 * (1 - i * 0.05)), totalLiabilities: Math.round(price * 2e9),
    totalStockholdersEquity: Math.round(price * 1e9), netDebt: Math.round(price * 3e8),
    totalDebt: Math.round(price * 6e8), cashAndShortTermInvestments: Math.round(price * 3e8),
  }));
  const scores: FinancialScores = { symbol: fmpTicker, altmanZScore: 6.2, piotroskiScore: 7 };
  const dcf: DCFValue = { symbol: fmpTicker, dcf: Math.round(price * 1.1 * 100) / 100, price };
  return { keyMetrics, cashFlow, balanceSheet, scores, dcf };
}

export function getDemoCompanyNews(fmpTicker: string): NewsItem[] {
  const n = name(fmpTicker);
  return [
    { title: `${n} supera expectativas en su último reporte trimestral`, link: '#', publisher: 'Demo Wire', text: `${n} reportó ingresos por encima del consenso.`, relatedTickers: [fmpTicker], image: `https://images.financialmodelingprep.com/symbol/${fmpTicker}.png` },
    { title: `Analistas elevan el precio objetivo de ${fmpTicker}`, link: '#', publisher: 'Demo Markets', text: `Varias casas de bolsa mejoraron su visión sobre ${fmpTicker}.`, relatedTickers: [fmpTicker] },
    { title: `${n} anuncia inversión en inteligencia artificial`, link: '#', publisher: 'Demo Tech', text: `La compañía destinará capital a nuevas capacidades de IA.`, relatedTickers: [fmpTicker] },
  ];
}

export function getDemoSymbolSearch(query: string): SymbolSearchHit[] {
  const q = query.trim().toUpperCase();
  return Object.keys(DEMO_COMPANY_NAMES)
    .filter((sym) => !q || sym.includes(q) || name(sym).toUpperCase().includes(q))
    .slice(0, 15)
    .map((sym) => ({ symbol: sym, name: name(sym), exchange: 'NASDAQ', currency: 'USD', exchangeFullName: 'NASDAQ Global Select' }));
}
```

Note: `providerPublishTime` is optional on `NewsItem`; omit it (avoid `new Date()` in generated data — keep deterministic). Confirm `toFmpTicker`/`isEtf` names via `grep -n "export" src/lib/cedear-map.ts`.

- [ ] **Step 4: Add DEMO_MODE branches to the four actions**

In `src/app/trading/actions.ts`, add the import and a first-line branch to each action:

```ts
import { getDemoCompanyDetail, getDemoCompanyAdvancedData, getDemoCompanyNews, getDemoSymbolSearch } from '@/lib/demo/company-detail';

// searchTickerSymbols:
if (DEMO_MODE) return { success: true, data: getDemoSymbolSearch(query) };
// getCompanyDetail:
if (DEMO_MODE) return { success: true, data: getDemoCompanyDetail(iolBaseSymbol) };
// getCompanyAdvancedData:
if (DEMO_MODE) return { success: true, data: getDemoCompanyAdvancedData(fmpTicker) };
// getCompanyNews:
if (DEMO_MODE) return { success: true, data: getDemoCompanyNews(fmpTicker) };
```

- [ ] **Step 5: Run company-detail test to verify it passes**

Run: `npx vitest run src/lib/demo/company-detail.test.ts`
Expected: PASS.

- [ ] **Step 6: Add a DEMO_MODE action test (mirror existing pattern)**

Append to `src/app/trading/actions.test.ts` a case flipping `ctl.DEMO_MODE = true` and asserting `getCompanyDetail('AAPL')` returns `success: true` with a profile and never invokes the FMP mock. Follow the existing `vi.mock('@/lib/demo/data', ...)` + `ctl` pattern already in that file; extend the mock to also expose the company-detail getters if it mocks the whole `@/lib/demo` surface (check the current mock shape first).

- [ ] **Step 7: Run action test to verify it passes**

Run: `npx vitest run src/app/trading/actions.test.ts`
Expected: PASS.

- [ ] **Step 8: Commit**

```bash
git add src/lib/demo/company-detail.ts src/lib/demo/company-detail.test.ts src/app/trading/actions.ts src/app/trading/actions.test.ts
git commit -m "feat(demo): mock Company Detail (profile, fundamentals, news, search)"
```

---

## Task 8: Demo Oráculo + Wikipedia stub

**Files:**
- Create: `src/lib/demo/oraculo.ts`
- Modify: `src/app/api/oraculo/route.ts`
- Modify: `src/components/ui/ActiveDesktopWidget.tsx`
- Test: `src/lib/demo/oraculo.test.ts`

**Interfaces:**
- Consumes: `hashString`, `seededPick` from `./seed`.
- Produces:
  - `DEMO_WIKI_TOPICS: Array<{ title: string; extract: string }>`
  - `demoOraculoStream(input: { title?: string }): Response` — streams `data: {"text":"..."}\n\n` word-by-word then `data: [DONE]\n\n` (matches the widget's parser).

- [ ] **Step 1: Write the failing oráculo test**

```ts
// src/lib/demo/oraculo.test.ts
import { describe, it, expect } from 'vitest';
import { demoOraculoStream, DEMO_WIKI_TOPICS } from './oraculo';

async function readAll(res: Response): Promise<string> {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let out = '';
  for (;;) { const { done, value } = await reader.read(); if (done) break; out += dec.decode(value); }
  return out;
}

describe('demo oráculo', () => {
  it('has a local topic pool', () => {
    expect(DEMO_WIKI_TOPICS.length).toBeGreaterThan(3);
    expect(DEMO_WIKI_TOPICS[0].title).toBeTruthy();
  });

  it('streams text deltas terminated by [DONE]', async () => {
    const text = await readAll(demoOraculoStream({ title: 'El faro de Alejandría' }));
    expect(text).toContain('data: ');
    expect(text.trim().endsWith('data: [DONE]')).toBe(true);
    // reassemble the deltas
    const parts = text.split('\n\n').filter(Boolean);
    let assembled = '';
    for (const p of parts) {
      if (!p.startsWith('data: ')) continue;
      const payload = p.slice(6);
      if (payload === '[DONE]') continue;
      assembled += (JSON.parse(payload) as { text: string }).text;
    }
    expect(assembled.length).toBeGreaterThan(10);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/demo/oraculo.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement `oraculo.ts`**

```ts
// src/lib/demo/oraculo.ts
import { hashString, seededPick } from './seed';
import { pacedStream, type PacedItem } from './sse';

export const DEMO_WIKI_TOPICS = [
  { title: 'El faro de Alejandría', extract: 'Una de las siete maravillas del mundo antiguo, guía de navegantes perdidos.' },
  { title: 'La máquina de Anticitera', extract: 'Un antiguo mecanismo griego considerado la primera computadora analógica.' },
  { title: 'El experimento de la doble rendija', extract: 'Demostración de la dualidad onda-partícula en la mecánica cuántica.' },
  { title: 'La Ruta de la Seda', extract: 'Red de rutas comerciales que conectó Oriente y Occidente durante siglos.' },
  { title: 'El calamar gigante', extract: 'Criatura abisal esquiva que inspiró leyendas de krakens.' },
  { title: 'La biblioteca de Babel', extract: 'Cuento de Borges sobre una biblioteca infinita que contiene todos los libros posibles.' },
];

const ORACULO_TEMPLATES = [
  (t: string) => `Las mareas del destino susurran que ${t} y las acciones bailan el mismo vals invisible (no es consejo, es destino).`,
  (t: string) => `Donde otros ven ruido, el oráculo ve que ${t} presagia un giro en los mercados (no es consejo, es augurio).`,
  (t: string) => `El humo del incienso dibuja el ticker ${t} sobre las velas japonesas del mañana (no es consejo, es profecía).`,
];

export function demoOraculoStream(input: { title?: string }): Response {
  const title = input.title ?? seededPick(DEMO_WIKI_TOPICS, 0).title;
  const seed = hashString(title);
  // Pick a CEDEAR ticker deterministically for flavor.
  const tickers = ['AAPL', 'KO', 'TSLA', 'NVDA', 'MELI', 'MSFT', 'GOOGL'];
  const ticker = seededPick(tickers, seed);
  const line = seededPick(ORACULO_TEMPLATES, seed)(ticker);

  const words = line.split(' ');
  const items: PacedItem[] = words.map((w, i) => ({
    chunk: `data: ${JSON.stringify({ text: (i === 0 ? '' : ' ') + w })}\n\n`,
    delayMs: 35,
  }));
  items.push({ chunk: `data: [DONE]\n\n`, delayMs: 0 });

  return new Response(pacedStream(items), {
    headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache, no-transform' },
  });
}
```

- [ ] **Step 4: Add the demo branch to the oráculo route**

At the top of `POST` in `src/app/api/oraculo/route.ts`, before the `ANTHROPIC_API_KEY` check:

```ts
import { demoOraculoStream } from '@/lib/demo/oraculo';

if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
  const body = await req.json().catch(() => ({}));
  return demoOraculoStream(body);
}
```

- [ ] **Step 5: Stub the Wikipedia fetch in the widget**

In `src/components/ui/ActiveDesktopWidget.tsx` `fetchRandomArticle`, gate the network call:

```ts
if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
  const { DEMO_WIKI_TOPICS } = await import('@/lib/demo/oraculo');
  const pick = DEMO_WIKI_TOPICS[Math.floor(Math.random() * DEMO_WIKI_TOPICS.length)];
  setArticle(pick as typeof article);
  setLoading(false);
  return;
}
// ...existing fetch('https://es.wikipedia.org/...') path unchanged...
```

Confirm the `article` state shape (`{ title, extract, ... }`) and adapt the cast so it type-checks; only `title`/`extract` are used downstream by `consultOracle`.

- [ ] **Step 6: Run oráculo test to verify it passes**

Run: `npx vitest run src/lib/demo/oraculo.test.ts`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/lib/demo/oraculo.ts src/lib/demo/oraculo.test.ts src/app/api/oraculo/route.ts src/components/ui/ActiveDesktopWidget.tsx
git commit -m "feat(demo): scripted Oráculo stream + local Wikipedia topic stub"
```

---

## Task 9: Hermetic verification + deployment config

**Files:**
- Modify: `README.md` (or `docs/`) — document the demo deploy.
- No new runtime code.

- [ ] **Step 1: Full test + lint**

Run: `npm test && npm run lint`
Expected: all green.

- [ ] **Step 2: Static no-leak audit**

Run:
```bash
grep -rn "fetch(" src/components src/hooks src/lib/store 2>/dev/null | grep -vi "api/\|\.test\."
grep -rn "financialmodelingprep.com/stable\|api.invertironline.com" src --include=*.ts --include=*.tsx 2>/dev/null | grep -v "\.test\."
```
Expected: the only remaining client `fetch` to an external host is guarded by a `NEXT_PUBLIC_DEMO_MODE` check (the Wikipedia stub); all paid-host string references live in `src/lib/fmp/market-data.ts` and `src/lib/iol/client.ts` only, both guarded.

- [ ] **Step 3: Runtime hermetic check**

Run `NEXT_PUBLIC_DEMO_MODE=true npm run build && NEXT_PUBLIC_DEMO_MODE=true npm start` with **all** of `IOL_*`, `FMP_API_KEY`, `ANTHROPIC_API_KEY`, `AI_HEDGE_FUND_*`, `BASIC_AUTH_*` unset. Open `/trading` and exercise every window: Portfolio, Market Data, News, Movimientos, Company Detail (open 2–3 symbols; check fundamentals tab), Quick Trade (place an order), Auto Trader (select agents + run → plan → execute), Backtesting (run), Oráculo widget (consult). Confirm: no window errors, no 500s, and — via the browser Network tab — **zero** requests to `financialmodelingprep.com/stable`, `api.invertironline.com`, `es.wikipedia.org`, or an Anthropic host. (FMP image CDN and the Win98 icon CDN may appear — those are allowed free assets.)

- [ ] **Step 4: Document the deploy**

Add a short "Demo deployment" note to `README.md`:

```markdown
## Demo deployment (public, no secrets)

The `demo` branch runs the app in fully-mocked mode. Deploy it as a separate
Vercel project:
- Branch: `demo`
- Env: `NEXT_PUBLIC_DEMO_MODE=true` (and NOTHING else — leave IOL/FMP/Anthropic/
  AI_HEDGE_FUND/BASIC_AUTH unset).
- All data is fictitious; no external paid API is ever contacted.
```

- [ ] **Step 5: Commit**

```bash
git add README.md
git commit -m "docs(demo): document hermetic demo deployment"
```

- [ ] **Step 6: Push the branch**

```bash
git push -u origin demo
```
Then create the `hedge-fund-demo` Vercel project tracking `demo` with only `NEXT_PUBLIC_DEMO_MODE=true` (manual, via Vercel dashboard or `vercel` CLI).

---

## Self-Review

**Spec coverage:**
- No-paid-API guarantee → Task 1 (guards) + Task 9 (audit). ✓
- Company Detail (4 actions) → Task 7. ✓
- Auto Trader `/run` → Task 4; `/optimize` → Task 5; `/agents` → Task 3. ✓
- Backtesting `/backtest` → Task 6 (agents reused from Task 3). ✓
- Oráculo + Wikipedia → Task 8. ✓
- Agent roster (curated ~12) → Task 3. ✓
- Determinism / seeded generators → Tasks 2/4/6/8. ✓
- Non-persistent order execution → unchanged existing `placeOrder` demo branch (Task 9 exercises it). ✓
- Deployment (branch + separate Vercel project, env only) → Task 9. ✓

**Type consistency:** `Agent` (backtesting/types) shared by agents/run; `BacktestDayResult`/`PerformanceMetrics` shared by backtest builder + stream; optimizer `OptimizeTrade` mirrors the `OptimizePlannedTrade` wire shape `fetchOptimizedPlan` parses; company-detail getters return the exact `CompanyDetailResult`/`AdvancedDetailResult` field lists (verified against `actions.ts:536/603` in Task 7). SSE format identical across run/backtest (`sseEvent` + `parseSSEChunk`); oráculo uses the distinct `data:`/`[DONE]` format the widget parses.

**Placeholders:** none — every step carries runnable code or an exact command. Two "confirm signature" notes (sharesToCedears arg order; cedear-map export names) are explicit verification steps, not deferred work.
