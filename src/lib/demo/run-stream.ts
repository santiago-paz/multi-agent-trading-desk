import { hashString, seededPick } from './seed';
import { sseEvent, pacedStream, type PacedItem } from './sse';
import { DEMO_AGENTS } from './agents';
import { DEMO_BASE_PRICES } from './data';
import { commentaryFor, eventCountFor, stepsFor } from './commentary';

export interface DemoRunBody {
  tickers?: string[];
  graph_nodes?: Array<{ id: string }>;
}

const SIGNALS = ['bullish', 'bearish', 'neutral'] as const;
const ACTIONS = ['buy', 'sell', 'hold', 'hold', 'hold'] as const; // hold-weighted

/* ── Pacing ───────────────────────────────────────────────────────────────
   A live run takes minutes because every agent calls an LLM. The demo has no
   work to do, so without pacing the whole log lands in one frame and there is
   nothing to show an audience. We spread the events over a target duration
   instead of using a fixed per-step delay, so a 2-ticker run stays watchable
   and a 20-ticker run still finishes. Override with DEMO_RUN_TARGET_MS.      */

const DEFAULT_TARGET_MS = 60_000;
const MIN_STEP_MS = 45;
const MAX_STEP_MS = 650;

function targetDurationMs(): number {
  const raw = Number(process.env.DEMO_RUN_TARGET_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TARGET_MS;
}

export function stepDelayMs(totalEvents: number, targetMs: number): number {
  const perStep = Math.round(targetMs / Math.max(totalEvents, 1));
  return Math.min(MAX_STEP_MS, Math.max(MIN_STEP_MS, perStep));
}

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

function signalFor(agent: string, ticker: string): (typeof SIGNALS)[number] {
  return seededPick(SIGNALS, hashString(`${agent}:${ticker}`));
}

export function buildDemoRunPayload(body: DemoRunBody) {
  const tickers = body.tickers ?? [];
  const agents = selectedAgentKeys(body);

  const analyst_signals: Record<string, Record<string, unknown>> = {};
  for (const agent of agents) {
    const perTicker: Record<string, unknown> = {};
    for (const t of tickers) {
      const seed = hashString(`${agent}:${t}`);
      const signal = signalFor(agent, t);
      perTicker[t] = {
        signal,
        confidence: 55 + (seed % 40),
        reasoning: commentaryFor(agent, t, signal),
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
      reasoning: `Agent consensus on ${t}: ${action}.`,
    };
  }

  return { analyst_signals, decisions };
}

export function demoRunStream(body: DemoRunBody, opts: { delayMs?: number; targetMs?: number } = {}): Response {
  const tickers = body.tickers ?? [];
  const agents = selectedAgentKeys(body);
  const payload = buildDemoRunPayload(body);

  // One event per plain step, two per fetch step, one final Done per agent+ticker.
  const totalEvents = tickers.length * agents.reduce((n, a) => n + eventCountFor(a), 0) + 1;
  const delayMs = opts.delayMs ?? stepDelayMs(totalEvents, opts.targetMs ?? targetDurationMs());

  const items: PacedItem[] = [];
  items.push({ chunk: sseEvent('start', {}), delayMs });

  // Ticker-major so each accordion row fills up and finishes before the next
  // one appears, which is easier to narrate than twelve rows moving at once.
  for (const t of tickers) {
    for (const agent of agents) {
      for (const step of stepsFor(agent)) {
        items.push({ chunk: sseEvent('progress', { agent, ticker: t, status: step.status }), delayMs });
        if (step.fetch) {
          items.push({ chunk: sseEvent('progress', { agent, ticker: t, status: step.status, result: 'ok' }), delayMs });
        }
      }
      // Final event carries the reasoning and no `result`, which is what makes
      // the frontend flag it as the analysis log and render the persona card.
      const sig = (payload.analyst_signals[agent] as Record<string, { reasoning: string }>)[t];
      items.push({
        chunk: sseEvent('progress', { agent, ticker: t, status: 'Done', analysis: sig.reasoning }),
        delayMs,
      });
    }
  }

  items.push({ chunk: sseEvent('complete', { data: payload }), delayMs: 0 });
  return new Response(pacedStream(items), {
    headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache, no-transform' },
  });
}
