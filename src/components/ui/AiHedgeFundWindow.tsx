'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  FONT, LABEL, COL_HEADER_BASE, COL_RAISED, CELL, CELL_RIGHT,
  WINDOW_CONTAINER, SCROLLABLE_BODY, REFRESH_FOOTER, STATUS_BAR_STYLE,
  COLOR_POSITIVE, COLOR_NEGATIVE, COLOR_SECONDARY, COLOR_DISABLED,
} from '@/lib/theme/win98';
import { getAffordableCedears } from '@/app/trading/actions';
import { useMepStore } from '@/lib/store/mep-store';

// ─── Types ────────────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_AI_HEDGE_FUND_API_URL || 'http://localhost:8000';

const fmtARS = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Agent {
  key: string;
  display_name: string;
  description: string;
  investing_style: string;
  order: number;
}

interface AgentSignal {
  signal: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  reasoning: string;
}

interface Decision {
  action: string;
  quantity: number;
  confidence: number;
  reasoning: string;
}

type LogStatus = 'running' | 'ok' | 'error';

interface LogEntry {
  id: string;
  text: string;
  status: LogStatus;
}

interface ApiLogEntry {
  id: number;
  timestamp: string;
  direction: 'request' | 'response';
  label: string;
  data: unknown;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function LogIcon({ status }: { status: LogStatus }) {
  if (status === 'running') return <span style={{ color: COLOR_SECONDARY }}>►</span>;
  if (status === 'ok')      return <span style={{ color: COLOR_POSITIVE }}>■</span>;
  return                           <span style={{ color: COLOR_NEGATIVE }}>✕</span>;
}

function signalColor(signal: string): string {
  if (signal === 'bullish') return COLOR_POSITIVE;
  if (signal === 'bearish') return COLOR_NEGATIVE;
  return COLOR_SECONDARY;
}

function stringify(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  return JSON.stringify(value);
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

// ─── Component ────────────────────────────────────────────────────────────────

const COMMISSION_RATE = 0.03; // 3% comisiones IOL

/** Remap FMP-keyed record to IOL symbols (e.g. XRX→XROX). Unmapped keys pass through. */
function remapToIol<T>(record: Record<string, T>, fmpToIol: Record<string, string>): Record<string, T> {
  const result: Record<string, T> = {};
  for (const [key, val] of Object.entries(record)) {
    result[fmpToIol[key] ?? key] = val;
  }
  return result;
}

function adjustDecisionsToARS(
  rawDecisions: Record<string, Decision>,
  arsPrices: Record<string, number>,
  cashAfterCommission: number,
  fmpToIol: Record<string, string>,
): Record<string, Decision> {
  // Remap FMP tickers to IOL symbols so arsPrices lookup works
  const decisions = remapToIol(rawDecisions, fmpToIol);
  const adjusted: Record<string, Decision> = {};
  let remainingCash = cashAfterCommission;

  // Sort: buy signals first (higher confidence first), so best picks get cash priority
  const entries = Object.entries(decisions).sort(([, a], [, b]) => {
    if (a.action === 'buy' && b.action !== 'buy') return -1;
    if (a.action !== 'buy' && b.action === 'buy') return 1;
    return b.confidence - a.confidence;
  });

  for (const [ticker, decision] of entries) {
    if (decision.action === 'short') {
      adjusted[ticker] = { ...decision, action: 'hold', quantity: 0, reasoning: 'Short no soportado en CEDEARs' };
      continue;
    }

    if (decision.action === 'buy') {
      const iolPrice = arsPrices[ticker];
      if (!iolPrice || iolPrice <= 0) {
        adjusted[ticker] = { ...decision, quantity: 0, reasoning: `${decision.reasoning} (sin precio IOL disponible)` };
        continue;
      }
      const maxQty = Math.floor(remainingCash / iolPrice);
      if (maxQty <= 0) {
        adjusted[ticker] = { ...decision, action: 'hold', quantity: 0, reasoning: `${decision.reasoning} (saldo insuficiente: AR$${iolPrice.toFixed(0)}/acción)` };
        continue;
      }
      remainingCash -= maxQty * iolPrice;
      adjusted[ticker] = { ...decision, quantity: maxQty };
      continue;
    }

    // hold or sell — keep as-is with quantity 0 (we have no position)
    adjusted[ticker] = { ...decision, quantity: 0 };
  }

  return adjusted;
}

export function AiHedgeFundWindow() {
  // MEP exchange rate (ARS/USD)
  const mepRate = useMepStore(s => s.mepRate);

  // Agent list
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);

  // CEDEARs from IOL
  const [tickers, setTickers] = useState<string[]>([]);       // IOL base symbols (display)
  const [fmpTickers, setFmpTickers] = useState<string[]>([]); // FMP-mapped tickers (for AI backend)
  const [iolToFmp, setIolToFmp] = useState<Record<string, string>>({}); // IOL→FMP mapping
  const [cash, setCash] = useState<number | null>(null);
  const [arsPrices, setArsPrices] = useState<Record<string, number>>({});
  const [isLoadingCedears, setIsLoadingCedears] = useState(true);

  // Health check
  const [healthChecks, setHealthChecks] = useState<Array<{ name: string; ok: boolean; status: number; error: string | null }> | null>(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);

  // Run state
  const [phase, setPhase] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState(0);

  // Results
  const [analystSignals, setAnalystSignals] = useState<Record<string, Record<string, AgentSignal>> | null>(null);
  const [decisions, setDecisions] = useState<Record<string, Decision> | null>(null);

  // API debug log
  const [apiLog, setApiLog] = useState<ApiLogEntry[]>([]);
  const [showApiLog, setShowApiLog] = useState(false);
  const apiLogCounter = useRef(0);
  const apiLogBodyRef = useRef<HTMLDivElement>(null);

  const logBodyRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logBodyRef.current) logBodyRef.current.scrollTop = logBodyRef.current.scrollHeight;
  }, [logs]);
  useEffect(() => {
    if (apiLogBodyRef.current) apiLogBodyRef.current.scrollTop = apiLogBodyRef.current.scrollHeight;
  }, [apiLog]);

  const addApiLog = useCallback((direction: 'request' | 'response', label: string, data: unknown) => {
    const entry: ApiLogEntry = {
      id: ++apiLogCounter.current,
      timestamp: new Date().toLocaleTimeString('es-AR', { hour12: false, fractionalSecondDigits: 3 }),
      direction,
      label,
      data,
    };
    setApiLog(prev => [...prev, entry]);
    // Also log to browser console for easy copy-paste
    console.log(`[API ${direction.toUpperCase()}] ${label}`, data);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  // Fetch agents + affordable CEDEARs on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/hedge-fund/agents`);
        const data = await res.json();
        const agentList: Agent[] = (data.agents || []).sort((a: Agent, b: Agent) => a.order - b.order);
        setAgents(agentList);
        const defaults = agentList.slice(0, 3).map(a => a.key);
        setSelectedAgents(new Set(defaults));
      } catch (err) {
        console.error('Failed to fetch agents:', err);
      } finally {
        setIsLoadingAgents(false);
      }
    })();

    (async () => {
      try {
        const result = await getAffordableCedears();
        if (result.success) {
          setTickers(result.symbols);
          setFmpTickers(result.fmpTickers);
          setIolToFmp(result.iolToFmp);
          setCash(result.cash);
          setArsPrices(result.arsPrices ?? {});
        }
      } catch (err) {
        console.error('Failed to fetch CEDEARs:', err);
      } finally {
        setIsLoadingCedears(false);
      }
    })();
  }, []);

  // ── Log helpers ────────────────────────────────────────────────────────────

  const addLog = useCallback((id: string, text: string, status: LogStatus = 'running') => {
    setLogs(prev => [...prev, { id, text, status }]);
  }, []);

  const updateLog = useCallback((id: string, text: string, status: LogStatus) => {
    setLogs(prev => prev.map(l => l.id === id ? { ...l, text, status } : l));
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

  // ── Health check ──────────────────────────────────────────────────────────

  async function handleHealthCheck() {
    setIsCheckingHealth(true);
    setHealthChecks(null);
    try {
      const res = await fetch(`${API_URL}/hedge-fund/health`);
      const data = await res.json();
      setHealthChecks(data.checks);
    } catch (err) {
      setHealthChecks([{ name: 'Backend', ok: false, status: 0, error: `No se pudo conectar a ${API_URL}` }]);
    } finally {
      setIsCheckingHealth(false);
    }
  }

  // ── Run analysis ───────────────────────────────────────────────────────────

  async function handleRun() {
    if (selectedAgents.size === 0 || tickers.length === 0) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setPhase('running');
    setLogs([]);
    setApiLog([]);
    apiLogCounter.current = 0;
    setProgress(0);
    setAnalystSignals(null);
    setDecisions(null);

    const agentKeys = Array.from(selectedAgents);

    // Build graph: agent nodes + portfolio_manager. Risk manager is auto-added by backend.
    const graphNodes = [
      ...agentKeys.map(key => ({ id: key, type: 'agent', data: { label: key } })),
      { id: 'portfolio_manager', type: 'agent', data: { label: 'Portfolio Manager' } },
    ];
    const graphEdges = agentKeys.map(key => ({
      id: `${key}-pm`,
      source: key,
      target: 'portfolio_manager',
    }));

    // Send a standard portfolio size so the AI generates proper buy/sell signals.
    // We recalculate quantities locally using ARS prices from IOL afterwards.
    const cashArs = cash ?? 0;
    const cashAfterCommission = cashArs * (1 - COMMISSION_RATE);

    // Send FMP tickers to the backend so it fetches correct market data
    // (e.g. XROX→XRX). Build a reverse map to translate results back to IOL symbols.
    const fmpToIol: Record<string, string> = {};
    for (const [iol, fmp] of Object.entries(iolToFmp)) {
      fmpToIol[fmp] = iol;
    }

    const body = {
      tickers: fmpTickers,
      model_name: 'claude-haiku-4-5-20251001',
      model_provider: 'Anthropic',
      initial_cash: 100000,
      graph_nodes: graphNodes,
      graph_edges: graphEdges,
    };

    addLog('cash', `Saldo disponible: $${fmtARS(cashArs)} ARS (neto comisiones: $${fmtARS(cashAfterCommission)})`, 'ok');
    const mappedNote = Object.entries(iolToFmp)
      .filter(([iol, fmp]) => iol !== fmp)
      .map(([iol, fmp]) => `${iol}→${fmp}`)
      .join(', ');
    addLog('tickers', `CEDEARs: ${tickers.join(', ')}${mappedNote ? ` (mapeados: ${mappedNote})` : ''}`, 'ok');
    addLog('start', `Iniciando análisis con ${agentKeys.length} agente(s) y ${fmpTickers.length} ticker(s)...`);

    addApiLog('request', `POST ${API_URL}/hedge-fund/run`, body);

    try {
      const response = await fetch(`${API_URL}/hedge-fund/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: abortRef.current.signal,
      });

      addApiLog('response', `HTTP ${response.status} ${response.statusText}`, {
        headers: Object.fromEntries(response.headers.entries()),
      });

      if (!response.ok) {
        const errText = await response.text();
        addApiLog('response', 'Error body', errText);
        throw new Error(`HTTP ${response.status}: ${errText}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let progressCount = 0;
      const totalEstimate = agentKeys.length * tickers.length + 5;

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
            addApiLog('response', `SSE event: ${evt.event}`, d);

            if (evt.event === 'start') {
              updateLog('start', 'Análisis iniciado', 'ok');
            } else if (evt.event === 'progress') {
              progressCount++;
              const agent = (d.agent as string) || '';
              const ticker = (d.ticker as string) || '';
              const status = (d.status as string) || '';
              const analysis = (d.analysis as string) || '';
              const logId = `progress-${agent}-${ticker || 'general'}-${progressCount}`;

              if (analysis) {
                addLog(logId, `${agent}${ticker ? ` [${ticker}]` : ''}: ${analysis}`, 'ok');
              } else {
                addLog(logId, `${agent}${ticker ? ` [${ticker}]` : ''}: ${status}`, 'running');
              }

              setProgress(Math.min(95, Math.round((progressCount / totalEstimate) * 100)));
            } else if (evt.event === 'error') {
              const msg = (d.message as string) || 'Error desconocido';
              addLog('error', `Error: ${msg}`, 'error');
              setPhase('error');
            } else if (evt.event === 'complete') {
              const completeData = d.data as Record<string, unknown> | undefined;
              if (completeData) {
                // Remap FMP tickers back to IOL symbols in analyst signals
                const rawSignals = completeData.analyst_signals as Record<string, Record<string, AgentSignal>>;
                const remappedSignals: Record<string, Record<string, AgentSignal>> = {};
                for (const [agent, tickerSignals] of Object.entries(rawSignals)) {
                  remappedSignals[agent] = remapToIol(tickerSignals, fmpToIol);
                }
                setAnalystSignals(remappedSignals);
                // Recalculate quantities using ARS prices from IOL
                const rawDecisions = completeData.decisions as Record<string, Decision>;
                const adjustedDecisions = adjustDecisionsToARS(rawDecisions, arsPrices, cashAfterCommission, fmpToIol);
                setDecisions(adjustedDecisions);
              }
              addLog('complete', 'Análisis completado', 'ok');
              setProgress(100);
              setPhase('done');
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
              const rawSignals = completeData.analyst_signals as Record<string, Record<string, AgentSignal>>;
              const remappedSignals: Record<string, Record<string, AgentSignal>> = {};
              for (const [agent, tickerSignals] of Object.entries(rawSignals)) {
                remappedSignals[agent] = remapToIol(tickerSignals, fmpToIol);
              }
              setAnalystSignals(remappedSignals);
              const rawDecisions = completeData.decisions as Record<string, Decision>;
              const adjustedDecisions = adjustDecisionsToARS(rawDecisions, arsPrices, cashAfterCommission, fmpToIol);
              setDecisions(adjustedDecisions);
            }
            addLog('complete', 'Análisis completado', 'ok');
            setProgress(100);
            setPhase('done');
          }
        }
      }

      if (phase !== 'error') setPhase('done');
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
      addApiLog('response', 'FETCH ERROR', { name: (err as Error).name, message: (err as Error).message, stack: (err as Error).stack });
      addLog('error', `Error: ${(err as Error).message}`, 'error');
      setPhase('error');
    }
  }

  // ── Derived ────────────────────────────────────────────────────────────────

  const isRunning = phase === 'running';
  const isLoading = isLoadingAgents || isLoadingCedears;
  const signalRows: Array<{ ticker: string; agent: string; signal: AgentSignal }> = [];
  if (analystSignals) {
    for (const [agent, agentTickers] of Object.entries(analystSignals)) {
      if (agent.startsWith('risk_management')) continue;
      for (const [ticker, sig] of Object.entries(agentTickers)) {
        if (sig && typeof sig === 'object' && 'signal' in sig) {
          signalRows.push({ ticker, agent, signal: sig });
        }
      }
    }
  }
  signalRows.sort((a, b) => a.ticker.localeCompare(b.ticker) || a.agent.localeCompare(b.agent));

  const currentStep = logs.findLast(l => l.status === 'running')?.text ?? '';
  const statusText = isRunning
    ? currentStep.slice(0, 60)
    : phase === 'done'
      ? `${signalRows.length} señal${signalRows.length !== 1 ? 'es' : ''} recibida${signalRows.length !== 1 ? 's' : ''}`
      : phase === 'error'
        ? 'Error en análisis'
        : isLoading
          ? 'Cargando...'
          : 'Listo';

  // ── Render ─────────────────────────────────────────────────────────────────

  const stickyTh: React.CSSProperties = { position: 'sticky', top: 0, zIndex: 1 };

  return (
    <div style={WINDOW_CONTAINER}>
      <div className="win98-scrollbar" style={SCROLLABLE_BODY}>

        {/* ── CEDEARs info ──────────────────────────────────────────────── */}
        <fieldset style={{ marginBottom: '6px' }}>
          <legend>CEDEARs disponibles (IOL)</legend>
          {isLoadingCedears ? (
            <p style={{ color: COLOR_DISABLED, margin: 0 }}>Consultando saldo y panel de CEDEARs...</p>
          ) : tickers.length === 0 ? (
            <p style={{ color: COLOR_NEGATIVE, margin: 0 }}>No se encontraron CEDEARs accesibles con el saldo actual.</p>
          ) : (
            <>
              <div className="field-row">
                <span style={LABEL}>Saldo:</span>
                <span>${fmtARS(cash ?? 0)} ARS</span>
              </div>
              <div className="field-row">
                <span style={LABEL}>CEDEARs ({tickers.length}):</span>
                <span>{tickers.join(', ')}</span>
              </div>
            </>
          )}
        </fieldset>

        {/* ── Health check ──────────────────────────────────────────────── */}
        <fieldset style={{ marginBottom: '6px' }}>
          <legend>Estado de APIs</legend>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={handleHealthCheck}
              disabled={isCheckingHealth || isRunning}
            >
              {isCheckingHealth ? 'Chequeando...' : 'Chequear estado'}
            </button>
            {healthChecks && (
              <span style={{
                color: healthChecks.every(c => c.ok) ? COLOR_POSITIVE : COLOR_NEGATIVE,
              }}>
                {healthChecks.every(c => c.ok)
                  ? `${healthChecks.length}/${healthChecks.length} OK`
                  : `${healthChecks.filter(c => c.ok).length}/${healthChecks.length} OK`}
              </span>
            )}
          </div>
          {healthChecks && (
            <div
              className="sunken-panel win98-scrollbar"
              style={{ maxHeight: '150px', overflowY: 'auto', padding: '3px 5px', marginTop: '4px' }}
            >
              {healthChecks.map((check, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    gap: '5px',
                    lineHeight: '16px',
                    padding: '1px 0',
                  }}
                  title={check.error || undefined}
                >
                  <span style={{ color: check.ok ? COLOR_POSITIVE : COLOR_NEGATIVE, flexShrink: 0 }}>
                    {check.ok ? '■' : '✕'}
                  </span>
                  <span style={{
                    color: check.ok ? 'inherit' : COLOR_NEGATIVE,
                    wordBreak: 'break-word',
                  }}>
                    {check.name}
                    {check.status > 0 && !check.ok ? ` (HTTP ${check.status})` : ''}
                    {check.error ? ` — ${check.error.slice(0, 80)}` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
        </fieldset>

        {/* ── Agent selection ─────────────────────────────────────────────── */}
        <fieldset style={{ marginBottom: '6px' }}>
          <legend>Agentes de inversión</legend>

          {isLoadingAgents ? (
            <p style={{ color: COLOR_DISABLED, margin: 0 }}>Cargando agentes...</p>
          ) : agents.length === 0 ? (
            <p style={{ color: COLOR_NEGATIVE, margin: 0 }}>No se pudo conectar al servidor AI Hedge Fund ({API_URL})</p>
          ) : (
            <>
              <div style={{ marginBottom: '4px', display: 'flex', gap: '4px', alignItems: 'center' }}>
                <button
                  onClick={() => setSelectedAgents(new Set(agents.map(a => a.key)))}
                  disabled={isRunning}
                >
                  Todos
                </button>
                <button
                  onClick={() => setSelectedAgents(new Set())}
                  disabled={isRunning}
                >
                  Ninguno
                </button>
                <span style={{ color: COLOR_SECONDARY, marginLeft: '4px' }}>
                  {selectedAgents.size} seleccionado{selectedAgents.size !== 1 ? 's' : ''}
                </span>
              </div>

              <div
                className="sunken-panel win98-scrollbar"
                style={{ maxHeight: '130px', overflowY: 'auto', padding: '2px' }}
              >
                {agents.map(agent => {
                  const selected = selectedAgents.has(agent.key);
                  const inputId = `aihf-agent-${agent.key}`;
                  return (
                    <div className="field-row" key={agent.key} style={{ padding: '1px 2px' }}>
                      <input
                        id={inputId}
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleAgent(agent.key)}
                        disabled={isRunning}
                      />
                      <label
                        htmlFor={inputId}
                        title={agent.description}
                        style={{
                          padding: '1px 3px',
                          cursor: 'inherit',
                          ...(selected
                            ? { backgroundColor: '#000080', color: '#ffffff' }
                            : {}),
                        }}
                      >
                        {agent.display_name}
                      </label>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </fieldset>

        {/* ── Progress ─────────────────────────────────────────────────────── */}
        {(isRunning || phase === 'done' || phase === 'error') && (
          <fieldset style={{ marginBottom: '6px' }}>
            <legend>Progreso</legend>

            <div className="progress-indicator segmented" style={{ marginBottom: '6px' }}>
              <span className="progress-indicator-bar" style={{ width: `${progress}%` }} />
            </div>

            <div
              ref={logBodyRef}
              className="sunken-panel win98-scrollbar"
              style={{ maxHeight: '120px', overflowY: 'auto', padding: '3px 5px' }}
            >
              {logs.map(log => (
                <div
                  key={log.id}
                  style={{
                    display: 'flex',
                    gap: '5px',
                    lineHeight: '16px',
                    color: log.status === 'error' ? COLOR_NEGATIVE : log.status === 'running' ? COLOR_SECONDARY : 'inherit',
                  }}
                >
                  <LogIcon status={log.status} />
                  <span style={{ wordBreak: 'break-word' }}>{log.text}</span>
                </div>
              ))}
            </div>
          </fieldset>
        )}

        {/* ── API Debug Log ──────────────────────────────────────────────── */}
        {apiLog.length > 0 && (
          <fieldset style={{ marginBottom: '6px' }}>
            <legend>
              API log ({apiLog.length})
              {' '}
              <button
                style={{ padding: '0 4px' }}
                onClick={() => setShowApiLog(v => !v)}
              >
                {showApiLog ? 'Ocultar' : 'Mostrar'}
              </button>
              {' '}
              <button
                style={{ padding: '0 4px' }}
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(apiLog, null, 2));
                }}
              >
                Copiar JSON
              </button>
            </legend>

            {showApiLog && (
              <div
                ref={apiLogBodyRef}
                className="sunken-panel win98-scrollbar"
                style={{ maxHeight: '300px', overflowY: 'auto', padding: '3px 5px' }}
              >
                {apiLog.map(entry => (
                  <details key={entry.id} style={{ marginBottom: '2px' }}>
                    <summary style={{
                      cursor: 'pointer',
                      color: entry.direction === 'request' ? '#0000aa' : '#006600',
                    }}>
                      [{entry.timestamp}] {entry.direction === 'request' ? '→' : '←'} {entry.label}
                    </summary>
                    <pre style={{
                      background: '#ffffee',
                      border: '1px solid #c0c0c0',
                      padding: '4px',
                      margin: '2px 0 4px 12px',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      maxHeight: '200px',
                      overflow: 'auto',
                    }}>
                      {JSON.stringify(entry.data, null, 2)}
                    </pre>
                  </details>
                ))}
              </div>
            )}
          </fieldset>
        )}

        {/* ── Results: Analyst Signals ──────────────────────────────────────── */}
        {signalRows.length > 0 && (
          <fieldset style={{ marginBottom: '6px' }}>
            <legend>Señales de analistas</legend>

            <div className="sunken-panel win98-scrollbar" style={{ padding: 0, maxHeight: '200px', overflow: 'auto' }}>
              <table style={{ ...FONT, width: '100%', borderCollapse: 'collapse', borderSpacing: 0 }}>
                <thead>
                  <tr>
                    <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left', ...stickyTh }}>Ticker</th>
                    <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left', ...stickyTh }}>Agente</th>
                    <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'center', ...stickyTh }}>Señal</th>
                    <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'right', ...stickyTh }}>Confianza</th>
                    <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left', ...stickyTh }}>Razonamiento</th>
                  </tr>
                </thead>
                <tbody>
                  {signalRows.map((row, i) => (
                    <tr
                      key={`${row.ticker}-${row.agent}`}
                      style={{
                        background: i % 2 === 0 ? '#ffffff' : '#f0f0f0',
                        borderBottom: '1px solid #c0c0c0',
                        cursor: 'default',
                      }}
                    >
                      <td style={CELL}>{row.ticker}</td>
                      <td style={CELL}>{row.agent.replace(/_/g, ' ')}</td>
                      <td style={{ ...CELL, textAlign: 'center', color: signalColor(row.signal.signal) }}>
                        {row.signal.signal.toUpperCase()}
                      </td>
                      <td style={CELL_RIGHT}>{row.signal.confidence}%</td>
                      <td style={{ ...CELL, borderRight: 'none', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis' }}
                          title={stringify(row.signal.reasoning)}>
                        {stringify(row.signal.reasoning)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </fieldset>
        )}

        {/* ── Results: Portfolio Decisions ──────────────────────────────────── */}
        {decisions && (
          <fieldset style={{ marginBottom: '6px' }}>
            <legend>Decisiones del Portfolio Manager</legend>

            <div className="sunken-panel win98-scrollbar" style={{ padding: 0, maxHeight: '200px', overflow: 'auto' }}>
              <table style={{ ...FONT, width: '100%', borderCollapse: 'collapse', borderSpacing: 0 }}>
                <thead>
                  <tr>
                    <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left', ...stickyTh }}>Ticker</th>
                    <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'center', ...stickyTh }}>Acción</th>
                    <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'right', ...stickyTh }}>Cantidad</th>
                    <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'right', ...stickyTh }}>Confianza</th>
                    <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left', ...stickyTh }}>Razonamiento</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(decisions).map(([ticker, dec], i) => (
                    <tr
                      key={ticker}
                      style={{
                        background: i % 2 === 0 ? '#ffffff' : '#f0f0f0',
                        borderBottom: '1px solid #c0c0c0',
                        cursor: 'default',
                      }}
                    >
                      <td style={CELL}>{ticker}</td>
                      <td style={{
                        ...CELL,
                        textAlign: 'center',
                        color: dec.action === 'buy' ? COLOR_POSITIVE : dec.action === 'sell' ? COLOR_NEGATIVE : COLOR_SECONDARY,
                      }}>
                        {dec.action.toUpperCase()}
                      </td>
                      <td style={CELL_RIGHT}>{dec.quantity}</td>
                      <td style={CELL_RIGHT}>{dec.confidence}%</td>
                      <td style={{ ...CELL, borderRight: 'none', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis' }}
                          title={stringify(dec.reasoning)}>
                        {stringify(dec.reasoning)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </fieldset>
        )}
      </div>

      {/* ── Run button footer ────────────────────────────────────────────────── */}
      <div style={REFRESH_FOOTER}>
        <button
          className={phase === 'idle' ? 'default' : undefined}
          onClick={handleRun}
          disabled={isRunning || isLoading || selectedAgents.size === 0 || tickers.length === 0}
        >
          {isRunning ? 'Analizando...' : 'Ejecutar análisis'}
        </button>
      </div>

      {/* ── Status bar ──────────────────────────────────────────────────────── */}
      <div className="status-bar" style={STATUS_BAR_STYLE}>
        <p className="status-bar-field" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {statusText}
        </p>
        <p className="status-bar-field" style={{ flexShrink: 0 }}>
          {cash != null ? `$${fmtARS(cash)} ARS` : `${selectedAgents.size} agentes`}
        </p>
      </div>
    </div>
  );
}
