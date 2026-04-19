'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  FONT, COL_HEADER, COL_HEADER_RIGHT, CELL, CELL_RIGHT,
  WINDOW_CONTAINER, SCROLLABLE_BODY, STATUS_BAR_STYLE,
  COLOR_POSITIVE, COLOR_NEGATIVE, COLOR_SECONDARY,
  COL_HEADER_BASE, COL_RAISED, COLOR_LINK
} from '@/lib/theme/win98';
import { AgentSelector } from '@/components/ui/AgentSelector';

// ─── Types ────────────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_AI_HEDGE_FUND_API_URL || 'http://localhost:8000';

interface Agent {
  key: string;
  display_name: string;
  description: string;
  investing_style: string;
  order: number;
}

interface BacktestDayResult {
  date: string;
  portfolio_value: number;
  cash: number;
  decisions: Record<string, { action: string; quantity: number; confidence: number; reasoning: string }>;
  executed_trades: Record<string, number>;
  analyst_signals: Record<string, unknown>;
  current_prices: Record<string, number>;
  long_exposure: number;
  short_exposure: number;
  gross_exposure: number;
  net_exposure: number;
  long_short_ratio?: number;
}

interface PerformanceMetrics {
  sharpe_ratio?: number;
  sortino_ratio?: number;
  max_drawdown?: number;
  max_drawdown_date?: string;
  long_short_ratio?: number;
  gross_exposure?: number;
  net_exposure?: number;
}

type LogStatus = 'running' | 'ok' | 'error';

interface LogEntry {
  id: string;
  text: string;
  status: LogStatus;
  agent?: string;
  ticker?: string;
  detail?: string;
}

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function LogIcon({ status }: { status: LogStatus }) {
  if (status === 'running') return <span style={{ color: COLOR_SECONDARY }}>►</span>;
  if (status === 'ok')      return <span style={{ color: COLOR_POSITIVE }}>■</span>;
  return                           <span style={{ color: COLOR_NEGATIVE }}>✕</span>;
}

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

function parseSSEChunk(text: string): Array<{ event: string; data: unknown }> {
  const events: Array<{ event: string; data: unknown }> = [];
  const blocks = text.split('\n\n');
  for (const block of blocks) {
    if (!block.trim()) continue;
    let eventType = '';
    let dataStr = '';
    for (const line of block.split('\n')) {
      if (line.startsWith('event: ')) eventType = line.slice(7).trim();
      else if (line.startsWith('data: ')) dataStr = line.slice(6);
    }
    if (eventType && dataStr) {
      try {
        events.push({ event: eventType, data: JSON.parse(dataStr) });
      } catch { /* skip malformed */ }
    }
  }
  return events;
}

// ─── Equity Curve (pure CSS/HTML, no chart lib) ───────────────────────────────

function EquityCurve({ results, initialCapital }: { results: BacktestDayResult[]; initialCapital: number }) {
  if (results.length < 2) return null;

  const values = results.map(r => r.portfolio_value);
  const min = Math.min(...values, initialCapital);
  const max = Math.max(...values, initialCapital);
  const range = max - min || 1;

  const W = 100; // viewBox width percentage
  const H = 80;  // viewBox height

  const points = results.map((r, i) => {
    const x = (i / (results.length - 1)) * W;
    const y = H - ((r.portfolio_value - min) / range) * H;
    return `${x},${y}`;
  }).join(' ');

  // Baseline (initial capital)
  const baselineY = H - ((initialCapital - min) / range) * H;

  const finalValue = values[values.length - 1];
  const returnPct = ((finalValue - initialCapital) / initialCapital) * 100;
  const isPositive = returnPct >= 0;

  return (
    <div>
      <div style={{ ...FONT, marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
        <span>
          <strong>Retorno total:</strong>{' '}
          <span style={{ color: isPositive ? COLOR_POSITIVE : COLOR_NEGATIVE, fontWeight: 'bold' }}>
            {isPositive ? '+' : ''}{returnPct.toFixed(2)}%
          </span>
          {' '}(${fmtUSD(initialCapital)} → ${fmtUSD(finalValue)})
        </span>
        <span style={{ color: COLOR_SECONDARY }}>{results.length} días</span>
      </div>
      <div className="sunken-panel" style={{ padding: '4px', background: '#ffffff' }}>
        <svg
          viewBox={`-2 -2 ${W + 4} ${H + 4}`}
          preserveAspectRatio="none"
          style={{ width: '100%', height: '120px', display: 'block' }}
        >
          {/* Baseline */}
          <line
            x1={0} y1={baselineY} x2={W} y2={baselineY}
            stroke="#c0c0c0" strokeWidth="0.3" strokeDasharray="2,2"
          />
          {/* Equity curve */}
          <polyline
            points={points}
            fill="none"
            stroke={isPositive ? COLOR_POSITIVE : COLOR_NEGATIVE}
            strokeWidth="0.8"
          />
        </svg>
        <div style={{ ...FONT, fontSize: '10px', display: 'flex', justifyContent: 'space-between', color: COLOR_SECONDARY }}>
          <span>{results[0].date}</span>
          <span style={{ color: '#c0c0c0' }}>--- ${fmtUSD(initialCapital)} (capital inicial)</span>
          <span>{results[results.length - 1].date}</span>
        </div>
      </div>
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
  const [activeTab, setActiveTab] = useState<'config' | 'run' | 'results'>('config');
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
        const res = await fetch(`${API_URL}/hedge-fund/agents`);
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
      const response = await fetch(`${API_URL}/hedge-fund/backtest`, {
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
                          color: log.status === 'error' ? COLOR_NEGATIVE : log.status === 'running' ? COLOR_SECONDARY : 'inherit',
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
              <div className="win98-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 2, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {dayResults.length < 2 ? (
                  <div style={{ ...FONT, padding: 16, textAlign: 'center', color: COLOR_SECONDARY }}>
                    Los resultados aparecerán aquí cuando el backtest haya procesado al menos 2 días.
                  </div>
                ) : (
                  <>
                    {/* ── Equity Curve ──────────────────────────────────────────────── */}
                    <fieldset style={{ margin: 0, flexShrink: 0 }}>
                      <legend>Curva de Equity</legend>
                      <EquityCurve results={dayResults} initialCapital={initialCapital} />
                    </fieldset>

                    {/* ── Performance Metrics ───────────────────────────────────────── */}
                    {metrics && (
                      <fieldset style={{ margin: 0, flexShrink: 0 }}>
                        <legend>Métricas de Rendimiento</legend>
                        <div className="sunken-panel win98-scrollbar" style={{ padding: 0, overflow: 'auto', maxHeight: '200px' }}>
                          <table style={{ ...FONT, width: '100%', borderCollapse: 'collapse', borderSpacing: 0 }}>
                            <thead>
                              <tr>
                                <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left', position: 'sticky', top: 0, zIndex: 1 }}>Métrica</th>
                                <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>Valor</th>
                              </tr>
                            </thead>
                            <tbody>
                              {metrics.sharpe_ratio != null && (
                                <tr style={{ background: '#ffffff' }}>
                                  <td style={CELL} title="Risk-adjusted return measure. > 1 is good, > 2 is very good">Sharpe Ratio</td>
                                  <td style={{ ...CELL_RIGHT, fontWeight: 'bold', color: metrics.sharpe_ratio >= 1 ? COLOR_POSITIVE : metrics.sharpe_ratio >= 0 ? COLOR_SECONDARY : COLOR_NEGATIVE, borderRight: 'none' }}>
                                    {metrics.sharpe_ratio.toFixed(3)}
                                  </td>
                                </tr>
                              )}
                              {metrics.sortino_ratio != null && (
                                <tr style={{ background: '#f0f0f0' }}>
                                  <td style={CELL} title="Like Sharpe but only penalizes downside volatility">Sortino Ratio</td>
                                  <td style={{ ...CELL_RIGHT, fontWeight: 'bold', color: metrics.sortino_ratio >= 1 ? COLOR_POSITIVE : metrics.sortino_ratio >= 0 ? COLOR_SECONDARY : COLOR_NEGATIVE, borderRight: 'none' }}>
                                    {metrics.sortino_ratio.toFixed(3)}
                                  </td>
                                </tr>
                              )}
                              {metrics.max_drawdown != null && (
                                <tr style={{ background: '#ffffff' }}>
                                  <td style={CELL} title="Largest peak-to-trough decline">Max Drawdown</td>
                                  <td style={{ ...CELL_RIGHT, fontWeight: 'bold', color: COLOR_NEGATIVE, borderRight: 'none' }}>
                                    {fmtPct(metrics.max_drawdown)}
                                    {metrics.max_drawdown_date ? ` (${metrics.max_drawdown_date})` : ''}
                                  </td>
                                </tr>
                              )}
                              {dayResults.length > 0 && (
                                <tr style={{ background: '#f0f0f0' }}>
                                  <td style={CELL}>Retorno Total</td>
                                  <td style={{
                                    ...CELL_RIGHT,
                                    fontWeight: 'bold',
                                    color: dayResults[dayResults.length - 1].portfolio_value >= initialCapital ? COLOR_POSITIVE : COLOR_NEGATIVE,
                                    borderRight: 'none'
                                  }}>
                                    {fmtPct((dayResults[dayResults.length - 1].portfolio_value - initialCapital) / initialCapital)}
                                  </td>
                                </tr>
                              )}
                              {dayResults.length > 0 && (
                                <tr style={{ background: '#ffffff' }}>
                                  <td style={CELL}>Valor Final del Portfolio</td>
                                  <td style={{ ...CELL_RIGHT, borderRight: 'none' }}>${fmtUSD(dayResults[dayResults.length - 1].portfolio_value)}</td>
                                </tr>
                              )}
                              {metrics.gross_exposure != null && (
                                <tr style={{ background: '#f0f0f0' }}>
                                  <td style={CELL}>Exposición Bruta</td>
                                  <td style={{ ...CELL_RIGHT, borderRight: 'none' }}>{fmtPct(metrics.gross_exposure)}</td>
                                </tr>
                              )}
                              {metrics.net_exposure != null && (
                                <tr style={{ background: '#ffffff' }}>
                                  <td style={CELL}>Exposición Neta</td>
                                  <td style={{ ...CELL_RIGHT, borderRight: 'none' }}>{fmtPct(metrics.net_exposure)}</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </fieldset>
                    )}

                    {/* ── Daily Results Table ───────────────────────────────────────── */}
                    {dayResults.length > 0 && (
                      <fieldset style={{ margin: 0, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <legend>Resultados Diarios ({dayResults.length} días)</legend>
                        <div className="sunken-panel win98-scrollbar" style={{ flex: 1, padding: 0, overflow: 'auto', minHeight: 0 }}>
                          <table style={{ ...FONT, width: '100%', borderCollapse: 'collapse', borderSpacing: 0 }}>
                            <thead>
                              <tr>
                                <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left', position: 'sticky', top: 0, zIndex: 1 }}>Fecha</th>
                                <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>Valor Portfolio</th>
                                <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>Cambio</th>
                                <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>Cash</th>
                                <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left', position: 'sticky', top: 0, zIndex: 1 }}>Trades</th>
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
                                      <td style={{ ...CELL, borderRight: 'none' }}>
                                        {trades.length > 0
                                          ? trades.map(([t, q]) => `${t}: ${q > 0 ? '+' : ''}${q}`).join(', ')
                                          : '—'}
                                      </td>
                                    </tr>
                                    {isExpanded && (
                                      <tr>
                                        <td colSpan={5} style={{ padding: 0, background: '#ffffee', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)' }}>
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
