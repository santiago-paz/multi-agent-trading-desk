'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  ResponsiveContainer,
  ComposedChart, AreaChart, Area, Line,
  XAxis, YAxis, Tooltip, CartesianGrid,
  ReferenceLine,
} from 'recharts';
import {
  FONT, COL_HEADER, COL_HEADER_RIGHT, CELL, CELL_RIGHT,
  WINDOW_CONTAINER, SCROLLABLE_BODY, STATUS_BAR_STYLE,
  COLOR_POSITIVE, COLOR_NEGATIVE, COLOR_SECONDARY, COLOR_WARNING,
  COL_HEADER_BASE, COL_RAISED, COLOR_LINK
} from '@/lib/theme/win98';
import { AgentSelector } from '@/components/ui/AgentSelector';
import { LogIcon } from '@/components/ui/auto-trader/components/LogIcon';
import { Agent, BacktestDayResult, PerformanceMetrics, LogStatus, LogEntry, HistoricalBacktestRun } from '@/lib/backtesting/types';
import { useBacktestHistoryStore } from '@/lib/store/backtest-history-store';
import { parseSSEChunk } from '@/lib/sse';

const CHART_FONT = { fontFamily: '"Pixelated MS Sans Serif", Arial, sans-serif', fontSize: 9 };
const TOOLTIP_STYLE: React.CSSProperties = {
  ...FONT, background: '#ffffcc', border: '1px solid #000', padding: '2px 6px',
};

// ─── HelpHover ────────────────────────────────────────────────────────────────
// Wraps a label with a subtle dotted underline + cursor:help, showing a tooltip
// on hover. No extra icon — meant for table cells where the "?" badge would be
// too noisy.

function HelpHover({ tooltip, children }: { tooltip: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (show && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left + rect.width / 2 });
    }
  }, [show]);

  return (
    <span
      ref={ref}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      style={{ borderBottom: '1px dotted #808080', cursor: 'help' }}
    >
      {children}
      {show && createPortal(
        <div style={{
          ...FONT,
          position: 'fixed',
          top: pos.top,
          left: pos.left,
          transform: 'translateX(-50%)',
          background: '#ffffcc',
          border: '1px solid #000',
          padding: '3px 6px',
          whiteSpace: 'normal',
          width: 240,
          zIndex: 99999,
          lineHeight: '1.3',
          boxShadow: '2px 2px 0 rgba(0,0,0,0.15)',
          pointerEvents: 'none',
        }}>
          {tooltip}
        </div>,
        document.body,
      )}
    </span>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

const API_URL = '/api/hedge-fund';

// ─── Presets ──────────────────────────────────────────────────────────────────

const DATE_PRESETS: { label: string; months: number }[] = [
  { label: '1 mes', months: 1 },
  { label: '3 meses', months: 3 },
  { label: '6 meses', months: 6 },
  { label: '1 año', months: 12 },
];

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function subtractMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() - months);
  return d;
}

const fmtUSD = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtPct = (n: number) => (n * 100).toFixed(2) + '%';

function formatRunDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' })
    + ' ' + d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function renderAgentDetail(detail: string | undefined): React.ReactNode {
  if (!detail) return null;
  
  try {
    const trimmed = detail.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const data = JSON.parse(trimmed);
      let info = null;
      
      const keys = Object.keys(data);
      if (keys.length === 1 && data[keys[0]] && typeof data[keys[0]] === 'object') {
        info = data[keys[0]];
      } else {
        info = data;
      }
      
      const signal = info.signal || info.action;
      const confidence = info.confidence;
      const reasoning = info.reasoning || data.reasoning;
      
      let signalText = signal;
      if (typeof signal === 'string') {
        const s = String(signal).toLowerCase();
        if (s === 'bullish' || s === 'buy') signalText = '🟢 Alcista';
        else if (s === 'bearish' || s === 'sell') signalText = '🔴 Bajista';
        else if (s === 'neutral' || s === 'hold') signalText = '⚪ Neutral';
      }
      
      const rows = [];
      if (signalText) {
        rows.push(<div key="signal"><strong>Señal:</strong> {signalText} {confidence !== undefined ? `(Confianza: ${Math.round(confidence)}%)` : ''}</div>);
      }
      
      if (info.news_titles && Array.isArray(info.news_titles) && info.news_titles.length > 0) {
        rows.push(
          <div key="news" style={{ marginTop: 6 }}>
            <strong>Noticias analizadas:</strong>
            <ul style={{ margin: '4px 0 0 16px', padding: 0, listStyleType: 'none', color: '#333' }}>
              {info.news_titles.map((n: any, idx: number) => {
                const sent = n.sentiment?.toLowerCase() || '';
                const icon = sent === 'positive' ? '🟢' : sent === 'negative' ? '🔴' : '⚪';
                return (
                  <li key={idx} style={{ marginBottom: 4, textIndent: -16, paddingLeft: 16 }}>
                    {icon}{' '}
                    {n.url ? (
                      <a href={n.url} target="_blank" rel="noopener noreferrer" style={{ color: COLOR_LINK, textDecoration: 'underline' }}>
                        {n.title}
                      </a>
                    ) : (
                      n.title
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      } else if (reasoning && typeof reasoning === 'string') {
        rows.push(<div key="reasoning" style={{ marginTop: 4 }}><strong>Resumen:</strong> {reasoning}</div>);
      }
      
      if (rows.length > 0) {
        return <div style={{ margin: '4px 0 0 12px' }}>{rows}</div>;
      }
    }
  } catch (e) {
    // Fall back below if not valid JSON
  }
  
  if (detail.includes('\n')) {
     return <div style={{ margin: '4px 0 0 12px', whiteSpace: 'pre-wrap' }}>{detail}</div>;
  }
  
  return <span style={{ marginLeft: 4 }}>{detail}</span>;
}

// ─── SSE parser ───────────────────────────────────────────────────────────────

// ─── Equity Curve ─────────────────────────────────────────────────────────────

function fmtAxisUSD(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e6) return `$${(v / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(v / 1e3).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

function EquityCurve({ results, initialCapital }: { results: BacktestDayResult[]; initialCapital: number }) {
  if (results.length < 2) return null;

  // Project benchmark return % onto the same dollar scale so both lines share the y-axis.
  const chartData = results.map(r => ({
    date: r.date,
    portfolio: r.portfolio_value,
    benchmark: r.benchmark_return_pct != null
      ? initialCapital * (1 + r.benchmark_return_pct / 100)
      : null,
  }));

  const finalValue = chartData[chartData.length - 1].portfolio;
  const returnPct = ((finalValue - initialCapital) / initialCapital) * 100;
  const isPositive = returnPct >= 0;
  const portfolioColor = isPositive ? COLOR_POSITIVE : COLOR_NEGATIVE;

  const lastBenchmark = [...chartData].reverse().find(d => d.benchmark != null)?.benchmark ?? null;
  const benchmarkPct = lastBenchmark != null
    ? ((lastBenchmark - initialCapital) / initialCapital) * 100
    : null;

  const hasBenchmark = chartData.some(d => d.benchmark != null);

  return (
    <div>
      <div style={{ ...FONT, marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
        <span>
          <strong>Retorno total:</strong>{' '}
          <span style={{ color: portfolioColor, fontWeight: 'bold' }}>
            {isPositive ? '+' : ''}{returnPct.toFixed(2)}%
          </span>
          {' '}(${fmtUSD(initialCapital)} → ${fmtUSD(finalValue)})
          {benchmarkPct != null && (
            <>
              {' '}<span style={{ color: COLOR_SECONDARY }}>·</span>{' '}
              <span style={{ color: COLOR_SECONDARY }}>SPY:</span>{' '}
              <span style={{ color: benchmarkPct >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE }}>
                {benchmarkPct >= 0 ? '+' : ''}{benchmarkPct.toFixed(2)}%
              </span>
            </>
          )}
        </span>
        <span style={{ color: COLOR_SECONDARY }}>{results.length} días</span>
      </div>
      <div className="sunken-panel" style={{ padding: '4px', background: '#ffffff' }}>
        <ResponsiveContainer width="100%" height={180}>
          <ComposedChart data={chartData} margin={{ top: 6, right: 12, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={portfolioColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={portfolioColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#c0c0c0" />
            <XAxis
              dataKey="date"
              tick={CHART_FONT}
              tickFormatter={(d: string) => d.slice(5)}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              tick={CHART_FONT}
              domain={['auto', 'auto']}
              tickFormatter={fmtAxisUSD}
              width={52}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value, name) => {
                const label = name === 'portfolio' ? 'Portfolio' : 'SPY (B&H)';
                return [`$${fmtUSD(Number(value))}`, label];
              }}
              labelFormatter={(label) => String(label)}
            />
            <ReferenceLine
              y={initialCapital}
              stroke="#a0a0a0"
              strokeDasharray="2 2"
              strokeWidth={1}
              ifOverflow="extendDomain"
              label={{
                value: `inicial $${fmtUSD(initialCapital)}`,
                position: 'insideTopRight',
                fill: COLOR_SECONDARY,
                ...CHART_FONT,
              }}
            />
            {hasBenchmark && (
              <Line
                type="monotone"
                dataKey="benchmark"
                stroke="#808080"
                strokeWidth={1}
                strokeDasharray="3 3"
                dot={false}
                name="benchmark"
                connectNulls
                isAnimationActive={false}
              />
            )}
            <Area
              type="monotone"
              dataKey="portfolio"
              stroke={portfolioColor}
              strokeWidth={1.5}
              fill="url(#equityGrad)"
              dot={false}
              name="portfolio"
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Exposure Curve ───────────────────────────────────────────────────────────

function ExposureCurve({ results }: { results: BacktestDayResult[] }) {
  if (results.length < 2) return null;

  // gross_exposure comes from the backend as the absolute dollar value of
  // long+short positions; convert to a fraction of portfolio_value for display.
  const chartData = results.map(r => ({
    date: r.date,
    exposure: r.portfolio_value > 0 ? r.gross_exposure / r.portfolio_value : 0,
  }));

  const values = chartData.map(d => d.exposure);
  const finalValue = values[values.length - 1];
  const max = Math.max(...values, 0);

  return (
    <div>
      <div style={{ ...FONT, marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
        <span>
          <strong>Exposición bruta actual:</strong>{' '}
          <span style={{ fontWeight: 'bold' }}>{fmtPct(finalValue)}</span>
        </span>
        <span style={{ color: COLOR_SECONDARY }}>máx {fmtPct(max)}</span>
      </div>
      <div className="sunken-panel" style={{ padding: '4px', background: '#ffffff' }}>
        <ResponsiveContainer width="100%" height={100}>
          <AreaChart data={chartData} margin={{ top: 6, right: 12, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="exposureGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#000080" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#000080" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#c0c0c0" />
            <XAxis
              dataKey="date"
              tick={CHART_FONT}
              tickFormatter={(d: string) => d.slice(5)}
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              tick={CHART_FONT}
              domain={[0, 'auto']}
              tickFormatter={(v: number) => `${(v * 100).toFixed(0)}%`}
              width={42}
            />
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={(value) => [fmtPct(Number(value)), 'Exposición']}
              labelFormatter={(label) => String(label)}
            />
            <ReferenceLine
              y={1}
              stroke="#a0a0a0"
              strokeDasharray="2 2"
              strokeWidth={1}
              ifOverflow="extendDomain"
              label={{ value: '100%', position: 'insideTopRight', fill: COLOR_SECONDARY, ...CHART_FONT }}
            />
            <Area
              type="monotone"
              dataKey="exposure"
              stroke="#000080"
              strokeWidth={1.5}
              fill="url(#exposureGrad)"
              dot={false}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── Metrics Table ────────────────────────────────────────────────────────────

interface MetricRowProps {
  label: string;
  tooltip: string;
  value: React.ReactNode;
  valueColor?: string;
  zebra: 'a' | 'b';
}

function MetricRow({ label, tooltip, value, valueColor, zebra }: MetricRowProps) {
  return (
    <tr style={{ background: zebra === 'a' ? '#ffffff' : '#f0f0f0' }}>
      <td style={CELL}>
        <HelpHover tooltip={tooltip}>{label}</HelpHover>
      </td>
      <td style={{ ...CELL_RIGHT, fontWeight: valueColor ? 'bold' : 'normal', color: valueColor, borderRight: 'none' }}>
        {value}
      </td>
    </tr>
  );
}

function MetricsTable({
  metrics, dayResults, initialCapital,
}: {
  metrics: PerformanceMetrics;
  dayResults: BacktestDayResult[];
  initialCapital: number;
}) {
  const lastValue = dayResults[dayResults.length - 1]?.portfolio_value ?? 0;
  // Backend returns gross_exposure / net_exposure as absolute USD values
  // (long+short / long-short). Convert to fraction of the final portfolio
  // value so fmtPct produces a sensible %.
  const grossPct = metrics.gross_exposure != null && lastValue > 0
    ? metrics.gross_exposure / lastValue : null;
  const netPct = metrics.net_exposure != null && lastValue > 0
    ? metrics.net_exposure / lastValue : null;
  // Backend returns max_drawdown already in percentage points
  // (e.g. -9.77 means -9.77%). Don't multiply by 100 again.
  const ddText = metrics.max_drawdown != null
    ? `${metrics.max_drawdown.toFixed(2)}%` : null;
  const totalReturn = lastValue > 0
    ? (lastValue - initialCapital) / initialCapital : 0;
  const avgCashPct = dayResults.length > 0
    ? dayResults.reduce((sum, r) => sum + (r.portfolio_value > 0 ? r.cash / r.portfolio_value : 0), 0) / dayResults.length
    : null;

  const ratioColor = (v: number) => v >= 1 ? COLOR_POSITIVE : v >= 0 ? COLOR_SECONDARY : COLOR_NEGATIVE;

  const rows: React.ReactNode[] = [];
  let zebra: 'a' | 'b' = 'a';
  const flip = () => { zebra = zebra === 'a' ? 'b' : 'a'; };

  if (metrics.sharpe_ratio != null) {
    rows.push(
      <MetricRow
        key="sharpe" zebra={zebra}
        label="Sharpe Ratio"
        tooltip="Retorno ajustado por riesgo: (retorno − tasa libre de riesgo) / desvío estándar. > 1 es bueno, > 2 muy bueno, negativo significa que perdiste contra el cash."
        value={metrics.sharpe_ratio.toFixed(3)}
        valueColor={ratioColor(metrics.sharpe_ratio)}
      />
    );
    flip();
  }
  if (metrics.sortino_ratio != null) {
    rows.push(
      <MetricRow
        key="sortino" zebra={zebra}
        label="Sortino Ratio"
        tooltip="Como Sharpe, pero solo penaliza la volatilidad a la baja. Más representativo cuando los retornos no son simétricos."
        value={metrics.sortino_ratio.toFixed(3)}
        valueColor={ratioColor(metrics.sortino_ratio)}
      />
    );
    flip();
  }
  if (ddText) {
    rows.push(
      <MetricRow
        key="dd" zebra={zebra}
        label="Max Drawdown"
        tooltip="Mayor caída desde un pico hasta un valle del valor del portfolio durante el backtest. Cuanto más cercano a 0%, mejor."
        value={<>{ddText}{metrics.max_drawdown_date ? ` (${metrics.max_drawdown_date})` : ''}</>}
        valueColor={COLOR_NEGATIVE}
      />
    );
    flip();
  }
  if (dayResults.length > 0) {
    rows.push(
      <MetricRow
        key="ret" zebra={zebra}
        label="Retorno Total"
        tooltip="Variación porcentual entre el capital inicial y el valor final del portfolio."
        value={fmtPct(totalReturn)}
        valueColor={lastValue >= initialCapital ? COLOR_POSITIVE : COLOR_NEGATIVE}
      />
    );
    flip();
    rows.push(
      <MetricRow
        key="final" zebra={zebra}
        label="Valor Final del Portfolio"
        tooltip="Valor total (cash + posiciones) al cierre del último día del backtest."
        value={`$${fmtUSD(lastValue)}`}
      />
    );
    flip();
  }
  if (grossPct != null) {
    rows.push(
      <MetricRow
        key="gross" zebra={zebra}
        label="Exposición Bruta"
        tooltip="(longs + |shorts|) / valor del portfolio al cierre. Mide cuánto del capital está invertido — 100% = totalmente invertido, > 100% = apalancado."
        value={fmtPct(grossPct)}
      />
    );
    flip();
  }
  if (netPct != null) {
    rows.push(
      <MetricRow
        key="net" zebra={zebra}
        label="Exposición Neta"
        tooltip="(longs − shorts) / valor del portfolio al cierre. Mide la dirección neta: cercano a 100% = sesgo alcista, cercano a 0% = neutral al mercado."
        value={fmtPct(netPct)}
      />
    );
    flip();
  }
  if (avgCashPct != null) {
    rows.push(
      <MetricRow
        key="cash" zebra={zebra}
        label="Cash Promedio"
        tooltip="Porcentaje promedio del portfolio mantenido en efectivo a lo largo del backtest. Alto = estrategia defensiva o pocas oportunidades; bajo = capital constantemente desplegado."
        value={fmtPct(avgCashPct)}
      />
    );
  }

  return (
    <div className="sunken-panel" style={{ padding: 0 }}>
      <table style={{ ...FONT, width: '100%', borderCollapse: 'collapse', borderSpacing: 0 }}>
        <thead>
          <tr>
            <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left' }}>Métrica</th>
            <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'right' }}>Valor</th>
          </tr>
        </thead>
        <tbody>{rows}</tbody>
      </table>
    </div>
  );
}

// ─── Tickers input (simple comma-separated) ──────────────────────────────────

const DEFAULT_TICKERS = ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'TSLA', 'NVDA', 'KO', 'JPM'];

// ─── Component ────────────────────────────────────────────────────────────────

export function BacktestingWindow() {
  // Agent list
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);

  // Config
  const [startDate, setStartDate] = useState(() => formatDate(subtractMonths(new Date(), 3)));
  const [endDate, setEndDate] = useState(() => formatDate(new Date()));
  const [initialCapital, setInitialCapital] = useState(100000);
  const [tickerInput, setTickerInput] = useState(DEFAULT_TICKERS.join(', '));

  // Run state
  const [activeTab, setActiveTab] = useState<'config' | 'run' | 'results' | 'history'>('config');
  const [phase, setPhase] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState(0);
  const [totalDays, setTotalDays] = useState(0);
  const [currentDay, setCurrentDay] = useState(0);

  // Results
  const [dayResults, setDayResults] = useState<BacktestDayResult[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  const logBodyRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const logCounter = useRef(0);

  // History (persisted)
  const historyRuns = useBacktestHistoryStore(s => s.runs);
  const addRunToHistory = useBacktestHistoryStore(s => s.addRun);
  const deleteRunFromHistory = useBacktestHistoryStore(s => s.deleteRun);
  const clearHistory = useBacktestHistoryStore(s => s.clearAll);

  // Auto-scroll logs
  useEffect(() => {
    if (logBodyRef.current) logBodyRef.current.scrollTop = logBodyRef.current.scrollHeight;
  }, [logs]);

  // Cleanup on unmount
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  // Fetch agents on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/agents`);
        const data = await res.json();
        const agentList: Agent[] = (data.agents || []).sort((a: Agent, b: Agent) => a.order - b.order);
        setAgents(agentList);
        setSelectedAgents(new Set());
      } catch (err) {
        console.error('Failed to fetch agents:', err);
      } finally {
        setIsLoadingAgents(false);
      }
    })();
  }, []);

  // ── Persist run to history when backtest completes ─────────────────────────

  const savedRunIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (phase !== 'done' || dayResults.length === 0) return;
    // Use the first day as a stable id so we don't double-save on re-renders.
    const runId = `bt-${dayResults[0].date}-${dayResults[dayResults.length - 1].date}-${dayResults.length}`;
    if (savedRunIdRef.current === runId) return;
    savedRunIdRef.current = runId;
    addRunToHistory({
      id: `bt-${Date.now()}`,
      timestamp: Date.now(),
      config: {
        startDate, endDate, initialCapital,
        tickers: parsedTickers,
        agentKeys: Array.from(selectedAgents),
      },
      dayResults,
      metrics,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, dayResults]);

  // ── Load a historical run into the Results tab ────────────────────────────

  const loadHistoricalRun = useCallback((run: HistoricalBacktestRun) => {
    setStartDate(run.config.startDate);
    setEndDate(run.config.endDate);
    setInitialCapital(run.config.initialCapital);
    setTickerInput(run.config.tickers.join(', '));
    setSelectedAgents(new Set(run.config.agentKeys));
    setDayResults(run.dayResults);
    setMetrics(run.metrics);
    setExpandedDay(null);
    setPhase('done');
    setActiveTab('results');
    // Mark as saved so the effect above doesn't re-add it.
    if (run.dayResults.length > 0) {
      savedRunIdRef.current = `bt-${run.dayResults[0].date}-${run.dayResults[run.dayResults.length - 1].date}-${run.dayResults.length}`;
    }
  }, []);

  // ── Log helpers ────────────────────────────────────────────────────────────

  const addLog = useCallback((id: string, text: string, status: LogStatus = 'running', agent?: string, ticker?: string, detail?: string) => {
    setLogs(prev => [...prev, { id, text, status, agent, ticker, detail }]);
  }, []);

  // ── Toggle agent selection ─────────────────────────────────────────────────

  const toggleAgent = useCallback((key: string) => {
    setSelectedAgents(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // ── Date presets ──────────────────────────────────────────────────────────

  const applyPreset = useCallback((months: number) => {
    const end = new Date();
    setEndDate(formatDate(end));
    setStartDate(formatDate(subtractMonths(end, months)));
  }, []);

  // ── Parse tickers ────────────────────────────────────────────────────────

  const parsedTickers = tickerInput
    .split(/[,;\s]+/)
    .map(t => t.trim().toUpperCase())
    .filter(t => t.length > 0);

  // ── Run backtest ─────────────────────────────────────────────────────────

  async function handleRun() {
    if (selectedAgents.size === 0 || parsedTickers.length === 0) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setPhase('running');
    setActiveTab('run');
    setLogs([]);
    logCounter.current = 0;
    setProgress(0);
    setTotalDays(0);
    setCurrentDay(0);
    setDayResults([]);
    setMetrics(null);
    setExpandedDay(null);

    const agentKeys = Array.from(selectedAgents);

    const graphNodes = [
      ...agentKeys.map(key => ({ id: key, type: 'agent', data: { label: key } })),
      { id: 'portfolio_manager', type: 'agent', data: { label: 'Portfolio Manager' } },
    ];
    const graphEdges = agentKeys.map(key => ({
      id: `${key}-pm`,
      source: key,
      target: 'portfolio_manager',
    }));

    const body = {
      tickers: parsedTickers,
      model_name: 'claude-haiku-4-5-20251001',
      model_provider: 'Anthropic',
      initial_capital: initialCapital,
      start_date: startDate,
      end_date: endDate,
      graph_nodes: graphNodes,
      graph_edges: graphEdges,
    };

    addLog('config', `Capital inicial: $${fmtUSD(initialCapital)} USD`, 'ok');
    addLog('config-tickers', `Tickers: ${parsedTickers.join(', ')}`, 'ok');
    addLog('config-range', `Período: ${startDate} → ${endDate}`, 'ok');
    addLog('start', `Iniciando backtest con ${agentKeys.length} agente(s)...`);

    try {
      const response = await fetch(`${API_URL}/backtest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errText}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const parts = buffer.split('\n\n');
        buffer = parts.pop()!;

        for (const part of parts) {
          const events = parseSSEChunk(part + '\n\n');
          for (const evt of events) {
            const d = evt.data as Record<string, unknown>;

            if (evt.event === 'start') {
              addLog('started', 'Backtest iniciado', 'ok');
            } else if (evt.event === 'progress') {
              const agent = (d.agent as string) || '';
              const status = (d.status as string) || '';
              const analysis = (d.analysis as string) || '';

              if (agent === 'backtest' && analysis) {
                // Day result
                try {
                  const dayResult = JSON.parse(analysis) as BacktestDayResult;
                  setDayResults(prev => [...prev, dayResult]);

                  // Parse progress from status like "Completed 2025-01-15 - Portfolio: $102,345.67"
                  const stepMatch = status.match(/\((\d+)\/(\d+)\)/);
                  if (stepMatch) {
                    const current = parseInt(stepMatch[1]);
                    const total = parseInt(stepMatch[2]);
                    setCurrentDay(current);
                    setTotalDays(total);
                    setProgress(Math.min(95, Math.round((current / total) * 100)));
                  }

                  addLog(`day-${dayResult.date}`, `${dayResult.date}: $${fmtUSD(dayResult.portfolio_value)}`, 'ok', agent, '', `${dayResult.date}: $${fmtUSD(dayResult.portfolio_value)}`);

                  // Surface tiny trades (< 0.5% of portfolio value) as warnings.
                  // Backend should already be suppressing these via MIN_TRADE_PCT,
                  // but if any slip through they're visible here as 'warn'.
                  const minTrade = dayResult.portfolio_value * 0.005;
                  for (const [ticker, qty] of Object.entries(dayResult.executed_trades)) {
                    if (!qty) continue;
                    const price = dayResult.current_prices[ticker] ?? 0;
                    const tradeValue = Math.abs(qty * price);
                    if (tradeValue > 0 && tradeValue < minTrade) {
                      addLog(
                        `tiny-${dayResult.date}-${ticker}`,
                        `${dayResult.date}: ${ticker} trade minúsculo ($${tradeValue.toFixed(0)})`,
                        'warn',
                        agent,
                        ticker,
                        `${qty > 0 ? '+' : ''}${qty} ${ticker} = $${tradeValue.toFixed(0)} (<0.5% portfolio)`,
                      );
                    }
                  }
                } catch {
                  // Not a day result JSON, just a status
                  addLog(`progress-${++logCounter.current}`, `${agent}: ${status}`, 'running', agent, '', status);
                }
              } else if (agent === 'backtest') {
                // Progress status (e.g., "Processing 2025-01-15 (42/250)")
                const stepMatch = status.match(/\((\d+)\/(\d+)\)/);
                if (stepMatch) {
                  const current = parseInt(stepMatch[1]);
                  const total = parseInt(stepMatch[2]);
                  setCurrentDay(current);
                  setTotalDays(total);
                  setProgress(Math.min(95, Math.round((current / total) * 100)));
                }
                addLog(`progress-${++logCounter.current}`, status, 'running', agent, '', status);
              } else {
                // Agent-level progress
                const ticker = (d.ticker as string) || '';
                const statusStr = (d.status as string) || '';
                const detailStr = (d.analysis as string) || statusStr;
                const finalStatus: LogStatus = detailStr !== statusStr || statusStr === 'Done' ? 'ok' : 'running';
                
                addLog(`agent-${++logCounter.current}`, `${agent}${ticker ? ` [${ticker}]` : ''}: ${statusStr}`, finalStatus, agent, ticker, detailStr);
              }
            } else if (evt.event === 'error') {
              const msg = (d.message as string) || 'Error desconocido';
              addLog('error', `Error: ${msg}`, 'error');
              setPhase('error');
            } else if (evt.event === 'complete') {
              const completeData = d.data as Record<string, unknown> | undefined;
              if (completeData) {
                setMetrics(completeData.performance_metrics as PerformanceMetrics);
                if (completeData.total_days) {
                  setTotalDays(completeData.total_days as number);
                }
              }
              addLog('complete', 'Backtest completado', 'ok');
              setProgress(100);
              setPhase('done');
              setActiveTab('results');
            }
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim()) {
        const events = parseSSEChunk(buffer + '\n\n');
        for (const evt of events) {
          if (evt.event === 'complete') {
            const d = evt.data as Record<string, unknown>;
            const completeData = d.data as Record<string, unknown> | undefined;
            if (completeData) {
              setMetrics(completeData.performance_metrics as PerformanceMetrics);
            }
            addLog('complete', 'Backtest completado', 'ok');
            setProgress(100);
            setPhase('done');
            setActiveTab('results');
          }
        }
      }

      if (phase !== 'error') {
        setPhase('done');
        setActiveTab('results');
      }
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
      addLog('error', `Error: ${(err as Error).message}`, 'error');
      setPhase('error');
    }
  }

  // ── Abort ──────────────────────────────────────────────────────────────────

  function handleAbort() {
    abortRef.current?.abort();
    addLog('abort', 'Backtest cancelado por el usuario', 'error');
    setPhase('error');
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const isRunning = phase === 'running';
  const isLoading = isLoadingAgents;

  const statusText = isRunning
    ? (totalDays > 0 ? `Procesando día ${currentDay}/${totalDays}...` : 'Iniciando backtest...')
    : phase === 'done'
      ? `Backtest completado — ${dayResults.length} días procesados`
      : phase === 'error'
        ? 'Error en backtest'
        : isLoading
          ? 'Cargando...'
          : 'Listo';

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ ...WINDOW_CONTAINER, padding: '6px 6px 0 6px', boxSizing: 'border-box' }}>
      <menu role="tablist">
        <li role="tab" aria-selected={activeTab === 'config'}>
          <a href="#config" onClick={(e) => { e.preventDefault(); setActiveTab('config'); }}>1. Configuración</a>
        </li>
        <li role="tab" aria-selected={activeTab === 'run'}>
          <a href="#run" onClick={(e) => { e.preventDefault(); setActiveTab('run'); }}>2. Ejecución</a>
        </li>
        <li role="tab" aria-selected={activeTab === 'results'}>
          <a href="#results" onClick={(e) => { e.preventDefault(); setActiveTab('results'); }}>3. Resultados</a>
        </li>
        <li role="tab" aria-selected={activeTab === 'history'}>
          <a href="#history" onClick={(e) => { e.preventDefault(); setActiveTab('history'); }}>
            4. Histórico{historyRuns.length > 0 ? ` (${historyRuns.length})` : ''}
          </a>
        </li>
      </menu>

      <div className="window" role="tabpanel" style={{ flex: 1, display: 'flex', flexDirection: 'column', marginBottom: 12, minHeight: 0, marginTop: '-1px' }}>
        <div className="window-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden', minHeight: 0, margin: 0 }}>
          
          {/* TAB 1: CONFIGURACIÓN */}
          {activeTab === 'config' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, gap: 8 }}>
              <div className="win98-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 2, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {/* ── Date range ──────────────────────────────────────────────── */}
                <fieldset style={{ margin: 0, flexShrink: 0 }}>
                  <legend>Período de backtest</legend>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <label style={FONT}>
                      Desde:{' '}
                      <input
                        type="date"
                        value={startDate}
                        onChange={e => setStartDate(e.target.value)}
                        disabled={isRunning}
                        style={{ ...FONT, width: '120px' }}
                      />
                    </label>
                    <label style={FONT}>
                      Hasta:{' '}
                      <input
                        type="date"
                        value={endDate}
                        onChange={e => setEndDate(e.target.value)}
                        disabled={isRunning}
                        style={{ ...FONT, width: '120px' }}
                      />
                    </label>
                    <span style={{ ...FONT, color: COLOR_SECONDARY }}>|</span>
                    {DATE_PRESETS.map(p => (
                      <button
                        key={p.months}
                        style={FONT}
                        onClick={() => applyPreset(p.months)}
                        disabled={isRunning}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </fieldset>

                {/* ── Tickers ─────────────────────────────────────────────────── */}
                <fieldset style={{ margin: 0, flexShrink: 0 }}>
                  <legend>Tickers</legend>
                  <div style={FONT}>
                    <input
                      type="text"
                      value={tickerInput}
                      onChange={e => setTickerInput(e.target.value)}
                      disabled={isRunning}
                      style={{ ...FONT, width: '100%', boxSizing: 'border-box' }}
                      placeholder="AAPL, GOOGL, MSFT..."
                    />
                    <p style={{ margin: '2px 0 0', color: COLOR_SECONDARY }}>
                      {parsedTickers.length} ticker{parsedTickers.length !== 1 ? 's' : ''}: {parsedTickers.join(', ')}
                    </p>
                  </div>
                </fieldset>

                {/* ── Capital inicial ─────────────────────────────────────────── */}
                <fieldset style={{ margin: 0, flexShrink: 0 }}>
                  <legend>Capital inicial (USD)</legend>
                  <input
                    type="number"
                    value={initialCapital}
                    onChange={e => setInitialCapital(Math.max(1000, parseInt(e.target.value) || 100000))}
                    disabled={isRunning}
                    style={{ ...FONT, width: '140px' }}
                    min={1000}
                    step={10000}
                  />
                </fieldset>

                {/* ── Agent selection ─────────────────────────────────────────── */}
                <div style={{ margin: 0, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <AgentSelector
                    agents={agents}
                    selectedAgents={selectedAgents}
                    onToggle={toggleAgent}
                    onSelectAll={() => setSelectedAgents(new Set(agents.map(a => a.key)))}
                    onSelectNone={() => setSelectedAgents(new Set())}
                    isLoading={isLoadingAgents}
                    disabled={isRunning}
                    errorText={`No se pudo conectar al servidor AI Hedge Fund (${API_URL})`}
                    idPrefix="bt-agent"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', flexShrink: 0, paddingTop: 6, borderTop: '1px solid #dfdfdf' }}>
                {isRunning && (
                  <button onClick={handleAbort}>
                    Cancelar
                  </button>
                )}
                <button
                  className={phase === 'idle' ? 'default' : undefined}
                  onClick={handleRun}
                  disabled={isRunning || isLoading || selectedAgents.size === 0 || parsedTickers.length === 0}
                >
                  {isRunning ? 'Ejecutando...' : 'Ejecutar backtest'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: EJECUCIÓN */}
          {activeTab === 'run' && (
            <div className="win98-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 2, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {phase === 'idle' && logs.length === 0 ? (
                <div style={{ ...FONT, padding: 16, textAlign: 'center', color: COLOR_SECONDARY }}>
                  No hay datos de ejecución. Configure los parámetros y presione "Ejecutar backtest" en la pestaña de Configuración.
                </div>
              ) : (
                <fieldset style={{ margin: 0, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <legend>Progreso {totalDays > 0 ? `(${currentDay}/${totalDays} días)` : ''}</legend>

                  <div className="progress-indicator segmented" style={{ marginBottom: '6px', flexShrink: 0 }}>
                    <span className="progress-indicator-bar" style={{ width: `${progress}%` }} />
                  </div>

                  <div
                    ref={logBodyRef}
                    className="sunken-panel win98-scrollbar"
                    style={{ flex: 1, overflowY: 'auto', padding: '3px 5px', minHeight: 0 }}
                  >
                    {logs.map(log => (
                      <div
                        key={log.id}
                        style={{
                          ...FONT,
                          display: 'flex',
                          gap: '5px',
                          lineHeight: '16px',
                          color: log.status === 'error' ? COLOR_NEGATIVE : log.status === 'warn' ? COLOR_WARNING : log.status === 'running' ? COLOR_SECONDARY : 'inherit',
                        }}
                      >
                        <LogIcon status={log.status} />
                        {log.agent && log.agent !== 'backtest' ? (
                          <span style={{ wordBreak: 'break-word', display: 'block', paddingTop: 4 }}>
                            <strong style={{ color: '#000080' }}>{log.agent.replace(/_/g, ' ')}</strong>
                            {log.ticker && <span style={{ color: '#800000', fontWeight: 'bold' }}> [{log.ticker}]</span>}
                            <span>:</span>
                            {renderAgentDetail(log.detail)}
                          </span>
                        ) : (
                          <span style={{ wordBreak: 'break-word' }}>{log.text}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </fieldset>
              )}
            </div>
          )}

          {/* TAB 3: RESULTADOS */}
          {activeTab === 'results' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, gap: 8 }}>
              {dayResults.length < 2 ? (
                <div style={{ ...FONT, padding: 16, textAlign: 'center', color: COLOR_SECONDARY }}>
                  Los resultados aparecerán aquí cuando el backtest haya procesado al menos 2 días.
                </div>
              ) : (
                <>
                  {/* ── Upper region: charts + métricas (scrollable, capped height) ── */}
                  <div className="win98-scrollbar" style={{
                    flex: '0 1 auto', maxHeight: '55%', overflowY: 'auto', padding: 2,
                    display: 'flex', flexDirection: 'column', gap: 6,
                  }}>
                    <fieldset style={{ margin: 0, flexShrink: 0 }}>
                      <legend>Curva de Equity</legend>
                      <EquityCurve results={dayResults} initialCapital={initialCapital} />
                    </fieldset>

                    <fieldset style={{ margin: 0, flexShrink: 0 }}>
                      <legend>Exposición</legend>
                      <ExposureCurve results={dayResults} />
                    </fieldset>

                    {metrics && (
                      <fieldset style={{ margin: 0, flexShrink: 0 }}>
                        <legend>Métricas de Rendimiento</legend>
                        <MetricsTable
                          metrics={metrics}
                          dayResults={dayResults}
                          initialCapital={initialCapital}
                        />
                      </fieldset>
                    )}
                  </div>

                  {/* ── Lower region: Resultados Diarios (fills remaining space) ──── */}
                  {dayResults.length > 0 && (
                    <fieldset style={{ margin: 0, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 200 }}>
                      <legend>Resultados Diarios ({dayResults.length} días)</legend>
                      <div className="sunken-panel win98-scrollbar" style={{ flex: 1, padding: 0, overflow: 'auto', minHeight: 0 }}>
                          <table style={{ ...FONT, width: '100%', borderCollapse: 'collapse', borderSpacing: 0 }}>
                            <thead>
                              <tr>
                                <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left', position: 'sticky', top: 0, zIndex: 1 }}>
                                  <HelpHover tooltip="Día calendario simulado. Click en una fila con ► para expandir las decisiones de los agentes ese día.">Fecha</HelpHover>
                                </th>
                                <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>
                                  <HelpHover tooltip="Cash + valor de mercado de las posiciones al cierre del día (en USD).">Valor Portfolio</HelpHover>
                                </th>
                                <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>
                                  <HelpHover tooltip="Variación porcentual del valor del portfolio respecto al día anterior (o respecto al capital inicial el primer día).">Cambio</HelpHover>
                                </th>
                                <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>
                                  <HelpHover tooltip="Efectivo disponible al cierre del día, sin invertir.">Cash</HelpHover>
                                </th>
                                <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>
                                  <HelpHover tooltip="Cash / Valor Portfolio. Indica qué fracción del capital queda sin desplegar ese día.">Cash %</HelpHover>
                                </th>
                                <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left', position: 'sticky', top: 0, zIndex: 1 }}>
                                  <HelpHover tooltip="Operaciones ejecutadas el día. Signo + = compra, − = venta. La cantidad está expresada en acciones del subyacente.">Trades</HelpHover>
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {dayResults.map((day, i) => {
                                const prevValue = i > 0 ? dayResults[i - 1].portfolio_value : initialCapital;
                                const change = ((day.portfolio_value - prevValue) / prevValue) * 100;
                                const trades = Object.entries(day.executed_trades).filter(([, qty]) => qty !== 0);
                                const isExpanded = expandedDay === day.date;

                                return (
                                  <React.Fragment key={day.date}>
                                    <tr
                                      style={{
                                        background: i % 2 === 0 ? '#ffffff' : '#f0f0f0',
                                        cursor: trades.length > 0 ? 'pointer' : 'default',
                                      }}
                                      onClick={() => {
                                        if (trades.length > 0 || Object.keys(day.decisions).length > 0) {
                                          setExpandedDay(isExpanded ? null : day.date);
                                        }
                                      }}
                                    >
                                      <td style={{ ...CELL, fontWeight: 'bold' }}>
                                        {trades.length > 0 || Object.keys(day.decisions).length > 0 ? (isExpanded ? '▼ ' : '► ') : '  '}
                                        {day.date}
                                      </td>
                                      <td style={CELL_RIGHT}>${fmtUSD(day.portfolio_value)}</td>
                                      <td style={{
                                        ...CELL_RIGHT,
                                        color: change >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE,
                                        fontWeight: 'bold',
                                      }}>
                                        {change >= 0 ? '+' : ''}{change.toFixed(2)}%
                                      </td>
                                      <td style={CELL_RIGHT}>${fmtUSD(day.cash)}</td>
                                      <td style={CELL_RIGHT}>
                                        {day.portfolio_value > 0 ? fmtPct(day.cash / day.portfolio_value) : '—'}
                                      </td>
                                      <td style={{ ...CELL, borderRight: 'none' }}>
                                        {trades.length > 0
                                          ? trades.map(([t, q]) => `${t}: ${q > 0 ? '+' : ''}${q}`).join(', ')
                                          : '—'}
                                      </td>
                                    </tr>
                                    {isExpanded && (
                                      <tr>
                                        <td colSpan={6} style={{ padding: 0, background: '#ffffee', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }}>
                                          <div style={{ padding: '4px 12px' }}>
                                            {/* Decisions detail */}
                                            {Object.keys(day.decisions).length > 0 && (
                                              <div style={{ marginBottom: '4px' }}>
                                                <strong style={FONT}>Decisiones:</strong>
                                                <table style={{ ...FONT, width: '100%', borderCollapse: 'collapse', marginTop: '2px' }}>
                                                  <thead>
                                                    <tr>
                                                      <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left', fontSize: '10px' }}>Ticker</th>
                                                      <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'center', fontSize: '10px' }}>Acción</th>
                                                      <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'right', fontSize: '10px' }}>Cantidad</th>
                                                      <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'right', fontSize: '10px' }}>Confianza</th>
                                                      <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left', fontSize: '10px' }}>Razonamiento</th>
                                                    </tr>
                                                  </thead>
                                                  <tbody>
                                                    {Object.entries(day.decisions).map(([ticker, dec]) => {
                                                      const decision = dec as { action: string; quantity: number; confidence: number; reasoning: string };
                                                      return (
                                                        <tr key={ticker}>
                                                          <td style={{ ...CELL, fontSize: '10px' }}>{ticker}</td>
                                                          <td style={{
                                                            ...CELL, fontSize: '10px', textAlign: 'center', fontWeight: 'bold',
                                                            color: decision.action === 'buy' || decision.action === 'long' ? COLOR_POSITIVE
                                                              : decision.action === 'sell' || decision.action === 'short' ? COLOR_NEGATIVE
                                                              : COLOR_SECONDARY,
                                                          }}>
                                                            {decision.action?.toUpperCase()}
                                                          </td>
                                                          <td style={{ ...CELL_RIGHT, fontSize: '10px' }}>{decision.quantity}</td>
                                                          <td style={{ ...CELL_RIGHT, fontSize: '10px' }}>{decision.confidence}%</td>
                                                          <td style={{ ...CELL, fontSize: '10px', borderRight: 'none', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}
                                                              title={typeof decision.reasoning === 'string' ? decision.reasoning : JSON.stringify(decision.reasoning)}>
                                                            {typeof decision.reasoning === 'string' ? decision.reasoning : JSON.stringify(decision.reasoning)}
                                                          </td>
                                                        </tr>
                                                      );
                                                    })}
                                                  </tbody>
                                                </table>
                                              </div>
                                            )}
                                            {/* Prices */}
                                            {Object.keys(day.current_prices).length > 0 && (
                                              <div style={{ ...FONT, fontSize: '10px', color: COLOR_SECONDARY }}>
                                                <strong>Precios:</strong>{' '}
                                                {Object.entries(day.current_prices).map(([t, p]) => `${t}: $${p.toFixed(2)}`).join(' | ')}
                                              </div>
                                            )}
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </fieldset>
                    )}
                </>
              )}
            </div>
          )}

          {/* TAB 4: HISTÓRICO */}
          {activeTab === 'history' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, gap: 8 }}>
              <div className="win98-scrollbar" style={{ flex: 1, padding: 2, overflowY: 'auto', minHeight: 0 }}>
                {historyRuns.length === 0 ? (
                  <div style={{ ...FONT, padding: 16, textAlign: 'center', color: COLOR_SECONDARY }}>
                    Sin reportes guardados. Los backtests completados se guardan automáticamente acá.
                  </div>
                ) : (
                  <div className="sunken-panel" style={{ padding: 0 }}>
                    <table style={{ ...FONT, width: '100%', borderCollapse: 'collapse', borderSpacing: 0 }}>
                      <thead>
                        <tr>
                          <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left' }}>Fecha</th>
                          <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left' }}>Período</th>
                          <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'right' }}>Retorno</th>
                          <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'right' }}>SPY</th>
                          <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'right' }}>Días</th>
                          <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'right' }}>Agentes</th>
                          <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left' }}>Tickers</th>
                          <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'center' }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyRuns.map((run, i) => {
                          const initial = run.config.initialCapital;
                          const last = run.dayResults[run.dayResults.length - 1]?.portfolio_value ?? initial;
                          const ret = initial > 0 ? ((last - initial) / initial) * 100 : 0;
                          const spy = run.dayResults[run.dayResults.length - 1]?.benchmark_return_pct ?? null;
                          return (
                            <tr
                              key={run.id}
                              style={{ background: i % 2 === 0 ? '#ffffff' : '#f0f0f0', cursor: 'pointer' }}
                              onClick={() => loadHistoricalRun(run)}
                              title="Click para cargar este reporte en la pestaña Resultados"
                            >
                              <td style={CELL}>{formatRunDate(run.timestamp)}</td>
                              <td style={CELL}>{run.config.startDate} → {run.config.endDate}</td>
                              <td style={{ ...CELL_RIGHT, color: ret >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE, fontWeight: 'bold' }}>
                                {ret >= 0 ? '+' : ''}{ret.toFixed(2)}%
                              </td>
                              <td style={{ ...CELL_RIGHT, color: spy != null ? (spy >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE) : COLOR_SECONDARY }}>
                                {spy != null ? `${spy >= 0 ? '+' : ''}${spy.toFixed(2)}%` : '—'}
                              </td>
                              <td style={CELL_RIGHT}>{run.dayResults.length}</td>
                              <td style={CELL_RIGHT}>{run.config.agentKeys.length}</td>
                              <td style={CELL} title={run.config.tickers.join(', ')}>
                                {run.config.tickers.slice(0, 4).join(', ')}{run.config.tickers.length > 4 ? '…' : ''}
                              </td>
                              <td style={{ ...CELL, borderRight: 'none', textAlign: 'center' }}>
                                <button
                                  style={FONT}
                                  title="Borrar este reporte"
                                  onClick={(e) => { e.stopPropagation(); deleteRunFromHistory(run.id); }}
                                >
                                  X
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              {historyRuns.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', flexShrink: 0, paddingTop: 6, borderTop: '1px solid #dfdfdf' }}>
                  <button onClick={() => { if (confirm('¿Borrar todo el histórico de backtests?')) clearHistory(); }}>
                    Borrar todo
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── Status bar ──────────────────────────────────────────────────────── */}
      <div className="status-bar" style={STATUS_BAR_STYLE}>
        <p className="status-bar-field" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {statusText}
        </p>
        <p className="status-bar-field" style={{ flexShrink: 0 }}>
          {isRunning && totalDays > 0 ? `${progress}%` : `${selectedAgents.size} agentes`}
        </p>
      </div>
    </div>
  );
}
