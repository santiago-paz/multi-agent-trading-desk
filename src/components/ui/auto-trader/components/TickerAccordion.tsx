import React, { useState, useMemo } from 'react';
import { FONT, COLOR_POSITIVE, COLOR_NEGATIVE, COLOR_SECONDARY, COL_SUNKEN } from '@/lib/theme/win98';
import { LogEntry } from '../types';
import { AgentDetail } from './AgentDetail';
import { LogIcon } from './LogIcon';

/* ── Helpers ──────────────────────────────────────────────────────────────── */

interface TickerGroup {
  ticker: string;
  logs: LogEntry[];
  /** Aggregate status: 'running' if any step is still running, else 'ok' if all ok, else 'error'. */
  status: LogEntry['status'];
  /** The latest step description (the last log's detail or text). */
  latestStep: string;
  /** Unique agent names involved in this ticker's analysis. */
  agents: string[];
  /** Final analysis log (status 'ok' with JSON-like detail), if any. */
  analysisLog: LogEntry | null;
}

function deriveStatus(logs: LogEntry[]): LogEntry['status'] {
  if (logs.some(l => l.status === 'error')) return 'error';
  if (logs.some(l => l.status === 'running')) return 'running';
  return 'ok';
}

function buildGroups(logs: LogEntry[]): { systemLogs: LogEntry[]; groups: TickerGroup[] } {
  const systemLogs: LogEntry[] = [];
  const map = new Map<string, LogEntry[]>();
  const order: string[] = [];

  for (const log of logs) {
    if (!log.ticker) {
      systemLogs.push(log);
      continue;
    }
    if (!map.has(log.ticker)) {
      map.set(log.ticker, []);
      order.push(log.ticker);
    }
    map.get(log.ticker)!.push(log);
  }

  const groups: TickerGroup[] = order.map(ticker => {
    const tickerLogs = map.get(ticker)!;
    const status = deriveStatus(tickerLogs);
    const last = tickerLogs[tickerLogs.length - 1];
    const agents = [...new Set(tickerLogs.map(l => l.agent).filter(Boolean))] as string[];
    // Find the final analysis log — the last 'ok' log with a JSON-like detail
    let analysisLog: LogEntry | null = null;
    for (let i = tickerLogs.length - 1; i >= 0; i--) {
      const l = tickerLogs[i];
      if (l.status === 'ok' && l.detail && l.detail.trim().startsWith('{')) {
        analysisLog = l;
        break;
      }
    }

    return {
      ticker,
      logs: tickerLogs,
      status,
      latestStep: last.detail || last.text,
      agents,
      analysisLog,
    };
  });

  return { systemLogs, groups };
}

/** Friendly step label — strips agent prefix and brackets. */
function friendlyStep(detail: string): string {
  // The detail is usually just the step description like "Fetching financial metrics"
  if (detail.length > 80) return detail.slice(0, 77) + '…';
  return detail;
}

function signalFromAnalysis(log: LogEntry | null): { label: string; color: string } | null {
  if (!log?.detail) return null;
  try {
    const data = JSON.parse(log.detail.trim());
    const info = log.ticker && data[log.ticker] ? data[log.ticker] : (Object.keys(data).length === 1 ? data[Object.keys(data)[0]] : data);
    const signal = (info?.signal || info?.action || '').toLowerCase();
    if (signal === 'bullish' || signal === 'buy') return { label: 'Alcista', color: COLOR_POSITIVE };
    if (signal === 'bearish' || signal === 'sell') return { label: 'Bajista', color: COLOR_NEGATIVE };
    if (signal === 'neutral' || signal === 'hold') return { label: 'Neutral', color: COLOR_SECONDARY };
  } catch { /* ignore */ }
  return null;
}

function groupByAgent(logs: LogEntry[]): { agent: string; logs: LogEntry[] }[] {
  const map = new Map<string, LogEntry[]>();
  const order: string[] = [];
  for (const l of logs) {
    const agent = l.agent || '';
    if (!map.has(agent)) {
      map.set(agent, []);
      order.push(agent);
    }
    map.get(agent)!.push(l);
  }
  return order.map(agent => ({ agent, logs: map.get(agent)! }));
}

/* ── Components ───────────────────────────────────────────────────────────── */

function TickerGroupRow({ group }: { group: TickerGroup }) {
  const [open, setOpen] = useState(false);
  const signal = useMemo(() => signalFromAnalysis(group.analysisLog), [group.analysisLog]);

  const isComplete = group.status === 'ok';
  const isError = group.status === 'error';

  return (
    <div style={{ marginBottom: 2 }}>
      {/* Header */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          ...FONT,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '3px 4px',
          cursor: 'pointer',
          background: open ? '#e0e0e0' : 'transparent',
          userSelect: 'none',
        }}
      >
        {/* Expand/collapse triangle — color doubles as status indicator */}
        <span style={{
          fontSize: 9,
          width: 10,
          textAlign: 'center',
          color: isComplete ? COLOR_POSITIVE : isError ? COLOR_NEGATIVE : COLOR_SECONDARY,
          flexShrink: 0,
        }}>
          {open ? '▼' : '▶'}
        </span>

        {/* Ticker badge */}
        <span style={{
          fontWeight: 'bold',
          color: '#000080',
          minWidth: 40,
        }}>
          {group.ticker}
        </span>

        {/* Agent names */}
        <span style={{ color: COLOR_SECONDARY, fontSize: 10, flexShrink: 0 }}>
          ({group.agents.map(a => a.replace(/_/g, ' ')).join(', ')})
        </span>

        {/* Signal badge (when analysis complete) */}
        {signal && (
          <span style={{
            fontSize: 10,
            padding: '0 4px',
            border: '1px solid #808080',
            background: '#f0f0f0',
            color: signal.color,
            fontWeight: 'bold',
            flexShrink: 0,
          }}>
            {signal.label}
          </span>
        )}

        {/* Progress or summary */}
        <span style={{ color: COLOR_SECONDARY, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {isComplete
            ? `${group.logs.length} pasos completados`
            : isError
              ? 'Error en análisis'
              : friendlyStep(group.latestStep)
          }
        </span>

        {/* Step counter */}
        <span style={{ color: COLOR_SECONDARY, flexShrink: 0, fontSize: 10 }}>
          {group.logs.length} {group.logs.length === 1 ? 'paso' : 'pasos'}
        </span>
      </div>

      {/* Expanded content — group by agent to avoid repeating agent name */}
      {open && (
        <div style={{
          ...COL_SUNKEN,
          margin: '0 0 2px 16px',
          padding: 4,
          background: '#ffffff',
        }}>
          {groupByAgent(group.logs).map(({ agent, logs: agentLogs }) => (
            <div key={agent} style={{ marginBottom: 4 }}>
              <div style={{ ...FONT, fontWeight: 'bold', color: '#000080', marginBottom: 2 }}>
                {agent.replace(/_/g, ' ')}:
              </div>
              {agentLogs.map(l => (
                <div key={l.id} style={{ ...FONT, display: 'flex', alignItems: 'center', gap: 4, minHeight: 18, paddingLeft: 8 }}>
                  <LogIcon status={l.status} />
                  <AgentDetail detail={l.detail} ticker={l.ticker} agent={l.agent} status={l.status} />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main export ──────────────────────────────────────────────────────────── */

/**
 * Groups LogEntry items by ticker into collapsible accordion rows.
 * Logs without a ticker are rendered flat (system messages).
 * Designed to be reusable by any agent — just pass the logs array.
 */
export function TickerAccordion({ logs }: { logs: LogEntry[] }) {
  const { groups } = useMemo(() => buildGroups(logs), [logs]);

  /* Interleave: render items in the order they first appeared.
     We track insertion order by walking the original logs array. */
  const elements: React.ReactNode[] = [];
  const renderedTickers = new Set<string>();

  for (const log of logs) {
    if (!log.ticker) {
      // System log — render inline
      elements.push(
        <div key={log.id} style={{ ...FONT, display: 'flex', alignItems: 'center', gap: 4, minHeight: 18 }}>
          <LogIcon status={log.status} />
          <span>{log.text}</span>
        </div>
      );
    } else if (!renderedTickers.has(log.ticker)) {
      // First time we see this ticker — render the accordion group
      renderedTickers.add(log.ticker);
      const group = groups.find(g => g.ticker === log.ticker)!;
      elements.push(<TickerGroupRow key={`group-${log.ticker}`} group={group} />);
    }
    // Subsequent logs for already-rendered tickers are inside the accordion
  }

  return <>{elements}</>;
}
