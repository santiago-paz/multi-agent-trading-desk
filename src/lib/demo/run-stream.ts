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
