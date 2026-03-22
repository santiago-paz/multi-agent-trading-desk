'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  FONT, COL_HEADER, COL_HEADER_RIGHT, CELL, CELL_RIGHT,
  WINDOW_CONTAINER, SCROLLABLE_BODY, STATUS_BAR_STYLE, HR98,
  COLOR_POSITIVE, COLOR_NEGATIVE, COLOR_SECONDARY, COLOR_DISABLED,
} from '@/lib/theme/win98';
import { getAffordableCedears } from '@/app/trading/actions';

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

export function AiHedgeFundWindow() {
  // Agent list
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);

  // CEDEARs from IOL
  const [tickers, setTickers] = useState<string[]>([]);
  const [cash, setCash] = useState<number | null>(null);
  const [isLoadingCedears, setIsLoadingCedears] = useState(true);

  // Run state
  const [phase, setPhase] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState(0);

  // Results
  const [analystSignals, setAnalystSignals] = useState<Record<string, Record<string, AgentSignal>> | null>(null);
  const [decisions, setDecisions] = useState<Record<string, Decision> | null>(null);

  const logBodyRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll log
  useEffect(() => {
    if (logBodyRef.current) logBodyRef.current.scrollTop = logBodyRef.current.scrollHeight;
  }, [logs]);

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
          setCash(result.cash);
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

  // ── Run analysis ───────────────────────────────────────────────────────────

  async function handleRun() {
    if (selectedAgents.size === 0 || tickers.length === 0) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setPhase('running');
    setLogs([]);
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

    const body = {
      tickers,
      model_name: 'claude-haiku-4-5-20251001',
      model_provider: 'Anthropic',
      initial_cash: cash ?? 100000,
      graph_nodes: graphNodes,
      graph_edges: graphEdges,
    };

    addLog('cash', `Saldo disponible: $${fmtARS(cash ?? 0)} ARS`, 'ok');
    addLog('tickers', `CEDEARs seleccionados: ${tickers.join(', ')}`, 'ok');
    addLog('start', `Iniciando análisis con ${agentKeys.length} agente(s) y ${tickers.length} ticker(s)...`);

    try {
      const response = await fetch(`${API_URL}/hedge-fund/run`, {
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
                setAnalystSignals(completeData.analyst_signals as Record<string, Record<string, AgentSignal>>);
                setDecisions(completeData.decisions as Record<string, Decision>);
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
              setAnalystSignals(completeData.analyst_signals as Record<string, Record<string, AgentSignal>>);
              setDecisions(completeData.decisions as Record<string, Decision>);
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

  return (
    <div style={WINDOW_CONTAINER}>
      <div className="win98-scrollbar" style={SCROLLABLE_BODY}>

        {/* ── CEDEARs info ──────────────────────────────────────────────── */}
        <fieldset style={{ marginBottom: '6px' }}>
          <legend>CEDEARs disponibles (IOL)</legend>
          {isLoadingCedears ? (
            <p style={{ ...FONT, color: COLOR_DISABLED }}>Consultando saldo y panel de CEDEARs...</p>
          ) : tickers.length === 0 ? (
            <p style={{ ...FONT, color: COLOR_NEGATIVE }}>No se encontraron CEDEARs accesibles con el saldo actual.</p>
          ) : (
            <div style={FONT}>
              <p style={{ margin: '0 0 2px' }}>
                <strong>Saldo:</strong> ${fmtARS(cash ?? 0)} ARS
              </p>
              <p style={{ margin: 0 }}>
                <strong>CEDEARs ({tickers.length}):</strong> {tickers.join(', ')}
              </p>
            </div>
          )}
        </fieldset>

        {/* ── Agent selection ─────────────────────────────────────────────── */}
        <fieldset style={{ marginBottom: '6px' }}>
          <legend>Agentes de inversión</legend>

          {isLoadingAgents ? (
            <p style={{ ...FONT, color: COLOR_DISABLED }}>Cargando agentes...</p>
          ) : agents.length === 0 ? (
            <p style={{ ...FONT, color: COLOR_NEGATIVE }}>No se pudo conectar al servidor AI Hedge Fund ({API_URL})</p>
          ) : (
            <>
              <div style={{ marginBottom: '4px', display: 'flex', gap: '4px' }}>
                <button
                  style={FONT}
                  onClick={() => setSelectedAgents(new Set(agents.map(a => a.key)))}
                  disabled={isRunning}
                >
                  Todos
                </button>
                <button
                  style={FONT}
                  onClick={() => setSelectedAgents(new Set())}
                  disabled={isRunning}
                >
                  Ninguno
                </button>
                <span style={{ ...FONT, color: COLOR_SECONDARY, marginLeft: '4px', alignSelf: 'center' }}>
                  {selectedAgents.size} seleccionado{selectedAgents.size !== 1 ? 's' : ''}
                </span>
              </div>

              <div
                className="sunken-panel win98-scrollbar"
                style={{ maxHeight: '120px', overflowY: 'auto', padding: '2px' }}
              >
                {agents.map(agent => (
                  <label
                    key={agent.key}
                    style={{
                      ...FONT,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '1px 4px',
                      cursor: 'default',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedAgents.has(agent.key)}
                      onChange={() => toggleAgent(agent.key)}
                      disabled={isRunning}
                    />
                    <strong>{agent.display_name}</strong>
                    <span style={{ color: COLOR_SECONDARY }}> — {agent.description}</span>
                  </label>
                ))}
              </div>
            </>
          )}

          <hr style={HR98} />

          <button
            className={phase === 'idle' ? 'default' : undefined}
            onClick={handleRun}
            disabled={isRunning || isLoading || selectedAgents.size === 0 || tickers.length === 0}
          >
            {isRunning ? 'Analizando...' : 'Ejecutar análisis'}
          </button>
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
                    ...FONT,
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

        {/* ── Results: Analyst Signals ──────────────────────────────────────── */}
        {signalRows.length > 0 && (
          <fieldset style={{ marginBottom: '6px' }}>
            <legend>Señales de analistas</legend>

            <div className="sunken-panel" style={{ padding: 0 }}>
              <table style={{ ...FONT, width: '100%', borderCollapse: 'collapse', borderSpacing: 0 }}>
                <thead>
                  <tr>
                    <th style={COL_HEADER}>Ticker</th>
                    <th style={COL_HEADER}>Agente</th>
                    <th style={{ ...COL_HEADER, textAlign: 'center' }}>Señal</th>
                    <th style={COL_HEADER_RIGHT}>Confianza</th>
                    <th style={COL_HEADER}>Razonamiento</th>
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
                      <td style={{ ...CELL, fontWeight: 'bold' }}>{row.ticker}</td>
                      <td style={CELL}>{row.agent.replace(/_/g, ' ')}</td>
                      <td style={{ ...CELL, textAlign: 'center', fontWeight: 'bold', color: signalColor(row.signal.signal) }}>
                        {row.signal.signal.toUpperCase()}
                      </td>
                      <td style={CELL_RIGHT}>{row.signal.confidence}%</td>
                      <td style={{ ...CELL, borderRight: 'none', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis' }}
                          title={row.signal.reasoning}>
                        {row.signal.reasoning}
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
          <fieldset>
            <legend>Decisiones del Portfolio Manager</legend>

            <div className="sunken-panel" style={{ padding: 0 }}>
              <table style={{ ...FONT, width: '100%', borderCollapse: 'collapse', borderSpacing: 0 }}>
                <thead>
                  <tr>
                    <th style={COL_HEADER}>Ticker</th>
                    <th style={{ ...COL_HEADER, textAlign: 'center' }}>Acción</th>
                    <th style={COL_HEADER_RIGHT}>Cantidad</th>
                    <th style={COL_HEADER_RIGHT}>Confianza</th>
                    <th style={COL_HEADER}>Razonamiento</th>
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
                      <td style={{ ...CELL, fontWeight: 'bold' }}>{ticker}</td>
                      <td style={{
                        ...CELL,
                        textAlign: 'center',
                        fontWeight: 'bold',
                        color: dec.action === 'buy' ? COLOR_POSITIVE : dec.action === 'sell' ? COLOR_NEGATIVE : COLOR_SECONDARY,
                      }}>
                        {dec.action.toUpperCase()}
                      </td>
                      <td style={CELL_RIGHT}>{dec.quantity}</td>
                      <td style={CELL_RIGHT}>{dec.confidence}%</td>
                      <td style={{ ...CELL, borderRight: 'none', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis' }}
                          title={dec.reasoning}>
                        {dec.reasoning}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </fieldset>
        )}
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
