'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  FONT, COL_HEADER, COL_HEADER_RIGHT, CELL, CELL_RIGHT,
  WINDOW_CONTAINER, SCROLLABLE_BODY, STATUS_BAR_STYLE,
  COLOR_POSITIVE, COLOR_NEGATIVE, COLOR_SECONDARY, COLOR_DISABLED,
} from '@/lib/theme/win98';
import { getFullPortfolioContext, placeOrder } from '@/app/trading/actions';
import { computeRebalancePlan, RebalancePlan, RebalanceOrder } from '@/lib/trading/rebalance-engine';
import { COMMISSION_RATE } from '@/lib/trading/quick-trade';
import { useMepStore } from '@/lib/store/mep-store';
import { AgentSelector } from '@/components/ui/AgentSelector';

// ─── Types ────────────────────────────────────────────────────────────────────

const API_URL = process.env.NEXT_PUBLIC_AI_HEDGE_FUND_API_URL || 'http://localhost:8000';

const fmtARS = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const fmtARS2 = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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
interface LogEntry { id: string; text: string; status: LogStatus }

interface OrderResult {
  ticker: string;
  side: 'buy' | 'sell';
  quantity: number;
  success: boolean;
  message: string;
}

type Phase = 'idle' | 'loading' | 'analyzing' | 'planned' | 'confirming' | 'executing' | 'done';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function LogIcon({ status }: { status: LogStatus }) {
  if (status === 'running') return <span style={{ color: COLOR_SECONDARY }}>&#9658;</span>;
  if (status === 'ok')      return <span style={{ color: COLOR_POSITIVE }}>&#9632;</span>;
  return                           <span style={{ color: COLOR_NEGATIVE }}>&#10005;</span>;
}

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
      try { events.push({ event: eventType, data: JSON.parse(dataStr) }); } catch { /* skip */ }
    }
  }
  return events;
}

/** Remap FMP-keyed record to IOL symbols. */
function remapToIol<T>(record: Record<string, T>, fmpToIol: Record<string, string>): Record<string, T> {
  const result: Record<string, T> = {};
  for (const [key, val] of Object.entries(record)) {
    result[fmpToIol[key] ?? key] = val;
  }
  return result;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AutoTraderWindow() {
  const mepRate = useMepStore(s => s.mepRate);

  // Portfolio context
  const [holdings, setHoldings] = useState<Record<string, number>>({});
  const [holdingTickers, setHoldingTickers] = useState<string[]>([]);
  const [, setAllIolSymbols] = useState<string[]>([]);
  const [panelSymbols, setPanelSymbols] = useState<string[]>([]);
  const [fmpTickers, setFmpTickers] = useState<string[]>([]);
  const [, setIolToFmp] = useState<Record<string, string>>({});
  const [fmpToIol, setFmpToIol] = useState<Record<string, string>>({});
  const [cashArs, setCashArs] = useState(0);
  const [arsPrices, setArsPrices] = useState<Record<string, number>>({});
  const [mepRateLocal, setMepRateLocal] = useState<number | null>(null);
  const [portfolioPositions, setPortfolioPositions] = useState<Array<{ ticker: string; quantity: number; trade_price: number }>>([]);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(true);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);

  // Agents
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);

  // Config
  const [dailyLimit, setDailyLimit] = useState(100000);

  // Analysis
  const [phase, setPhase] = useState<Phase>('idle');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState(0);
  const [analystSignals, setAnalystSignals] = useState<Record<string, Record<string, AgentSignal>> | null>(null);
  const [, setRawDecisions] = useState<Record<string, Decision> | null>(null);

  // Rebalance plan
  const [plan, setPlan] = useState<RebalancePlan | null>(null);
  // AI decisions for tickers NOT in portfolio (candidates)
  const [candidateDecisions, setCandidateDecisions] = useState<Record<string, Decision> | null>(null);

  // Order execution
  const [orderResults, setOrderResults] = useState<OrderResult[]>([]);

  const logBodyRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (logBodyRef.current) logBodyRef.current.scrollTop = logBodyRef.current.scrollHeight;
  }, [logs]);

  // Cleanup on unmount
  useEffect(() => () => { abortRef.current?.abort(); }, []);

  // ── Data loading ──────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/hedge-fund/agents`);
        const data = await res.json();
        const agentList: Agent[] = (data.agents || []).sort((a: Agent, b: Agent) => a.order - b.order);
        setAgents(agentList);
        setSelectedAgents(new Set(agentList.slice(0, 3).map(a => a.key)));
      } catch (err) {
        console.error('Failed to fetch agents:', err);
      } finally {
        setIsLoadingAgents(false);
      }
    })();

    loadPortfolio();
  }, []);

  async function loadPortfolio() {
    setIsLoadingPortfolio(true);
    setPortfolioError(null);
    try {
      const result = await getFullPortfolioContext();
      if (result.success) {
        setHoldings(result.holdings);
        setHoldingTickers(result.holdingTickers);
        setAllIolSymbols(result.allIolSymbols);
        setPanelSymbols(result.panelSymbols);
        setFmpTickers(result.fmpTickers);
        setIolToFmp(result.iolToFmp);
        setFmpToIol(result.fmpToIol);
        setCashArs(result.cashArs);
        setArsPrices(result.arsPrices);
        setMepRateLocal(result.mepRate);
        setPortfolioPositions(result.portfolioPositions);
      } else {
        const errMsg = 'error' in result ? result.error : 'Error desconocido';
        setPortfolioError(errMsg ?? 'Error desconocido al obtener portfolio');
        console.error('[AutoTrader] getFullPortfolioContext returned error:', errMsg);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setPortfolioError(`Error de conexión: ${errMsg}`);
      console.error('[AutoTrader] Failed to load portfolio context:', err);
    } finally {
      setIsLoadingPortfolio(false);
    }
  }

  // ── Log helpers ─────────────────────────────────────────────────────────────

  const addLog = useCallback((id: string, text: string, status: LogStatus = 'running') => {
    setLogs(prev => [...prev, { id, text, status }]);
  }, []);

  const updateLog = useCallback((id: string, text: string, status: LogStatus) => {
    setLogs(prev => prev.map(l => l.id === id ? { ...l, text, status } : l));
  }, []);

  const toggleAgent = useCallback((key: string) => {
    setSelectedAgents(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  // ── Analysis ────────────────────────────────────────────────────────────────

  async function handleAnalyze() {
    if (selectedAgents.size === 0 || fmpTickers.length === 0) return;

    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setPhase('analyzing');
    setLogs([]);
    setProgress(0);
    setAnalystSignals(null);
    setRawDecisions(null);
    setCandidateDecisions(null);
    setPlan(null);
    setOrderResults([]);

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

    const effectiveMep = mepRateLocal ?? mepRate ?? null;
    const cashUsd = effectiveMep && effectiveMep > 0
      ? cashArs / effectiveMep
      : 100000;

    const body = {
      tickers: fmpTickers,
      model_name: 'claude-haiku-4-5-20251001',
      model_provider: 'Anthropic',
      initial_cash: Math.round(cashUsd * 100) / 100,
      portfolio_positions: portfolioPositions.length > 0 ? portfolioPositions : undefined,
      graph_nodes: graphNodes,
      graph_edges: graphEdges,
    };

    addLog('cash', `Saldo disponible: $${fmtARS(cashArs)} ARS (~USD $${cashUsd.toFixed(0)}, MEP: ${effectiveMep?.toFixed(0) ?? '?'})`, 'ok');
    addLog('limit', `Límite plata nueva: $${fmtARS(dailyLimit)} ARS (~USD $${(dailyLimit / (effectiveMep ?? 1)).toFixed(0)})`, 'ok');
    addLog('portfolio-tickers', `Holdings actuales (${holdingTickers.length}): ${holdingTickers.join(', ') || '(sin posiciones)'}`, 'ok');
    addLog('candidate-tickers', `Candidatos a compra (${panelSymbols.length} más líquidos): ${panelSymbols.join(', ') || '(ninguno)'}`, 'ok');
    const fmpMapped = fmpTickers.filter(t => !holdingTickers.includes(t) && !panelSymbols.includes(t));
    if (fmpMapped.length > 0) {
      addLog('fmp-mapped', `Tickers mapeados IOL→FMP: ${fmpMapped.join(', ')}`, 'ok');
    }
    addLog('agents-info', `Agentes: ${agentKeys.map(k => k.replace(/_/g, ' ')).join(', ')}`, 'ok');
    addLog('start', `Enviando ${fmpTickers.length} ticker(s) a ${agentKeys.length} agente(s) para análisis...`);

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
      const totalEstimate = agentKeys.length * fmpTickers.length + 5;

      const processCompleteEvent = (d: Record<string, unknown>) => {
        const completeData = d.data as Record<string, unknown> | undefined;
        if (!completeData) return;

        // Remap FMP → IOL in analyst signals
        const rawSignals = completeData.analyst_signals as Record<string, Record<string, AgentSignal>>;
        const remappedSignals: Record<string, Record<string, AgentSignal>> = {};
        for (const [agent, tickerSignals] of Object.entries(rawSignals)) {
          remappedSignals[agent] = remapToIol(tickerSignals, fmpToIol);
        }
        setAnalystSignals(remappedSignals);

        // Remap decisions FMP → IOL
        const rawDec = completeData.decisions as Record<string, Decision>;
        const iolDecisions = remapToIol(rawDec, fmpToIol);
        setRawDecisions(iolDecisions);

        // Separate decisions for tickers NOT in portfolio (candidates)
        const candidates: Record<string, Decision> = {};
        for (const [ticker, dec] of Object.entries(iolDecisions)) {
          if (!holdingTickers.includes(ticker)) {
            candidates[ticker] = dec;
          }
        }
        setCandidateDecisions(candidates);

        // Compute rebalance plan
        const rebalancePlan = computeRebalancePlan({
          decisions: iolDecisions,
          holdings,
          arsPrices,
          cashArs,
          dailyLimitArs: dailyLimit,
          commissionRate: COMMISSION_RATE,
        });
        setPlan(rebalancePlan);

        const nSells = rebalancePlan.sells.length;
        const nBuys = rebalancePlan.buys.length;
        const nCandidates = Object.keys(candidates).length;
        const nCandBuys = Object.values(candidates).filter(d => d.action === 'buy').length;
        addLog('complete', [
          'Análisis completado.',
          `Plan: ${nSells} venta(s), ${nBuys} compra(s).`,
          nCandidates > 0 ? `${nCandBuys}/${nCandidates} candidatos recomendados para compra.` : '',
        ].filter(Boolean).join(' '), 'ok');
        setProgress(100);
        setPhase('planned');
      };

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
              const logId = `progress-${progressCount}`;

              addLog(logId, `${agent}${ticker ? ` [${ticker}]` : ''}: ${analysis || status}`,
                analysis ? 'ok' : 'running');
              setProgress(Math.min(95, Math.round((progressCount / totalEstimate) * 100)));
            } else if (evt.event === 'error') {
              addLog('error', `Error: ${(d.message as string) || 'Error desconocido'}`, 'error');
              setPhase('idle');
            } else if (evt.event === 'complete') {
              processCompleteEvent(d);
            }
          }
        }
      }

      // Process remaining buffer
      if (buffer.trim()) {
        for (const evt of parseSSEChunk(buffer + '\n\n')) {
          if (evt.event === 'complete') {
            processCompleteEvent(evt.data as Record<string, unknown>);
          }
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
      addLog('error', `Error: ${(err as Error).message}`, 'error');
      setPhase('idle');
    }
  }

  // ── Order execution ─────────────────────────────────────────────────────────

  async function handleExecuteOrders() {
    if (!plan) return;
    setPhase('executing');
    setOrderResults([]);
    const results: OrderResult[] = [];

    // Sells first
    for (const order of plan.sells) {
      const res = await placeOrder({
        simbolo: order.ticker,
        cantidad: order.quantity,
        precio: order.priceArs,
        plazo: 't1',
        tipoOrden: 'precioMercado',
        side: 'sell',
      });
      results.push({
        ticker: order.ticker, side: 'sell', quantity: order.quantity,
        success: res.success && res.data?.ok === true,
        message: res.success
          ? (res.data?.messages?.map(m => m.description || m.title).join('. ') || 'Orden enviada')
          : (res.error || 'Error'),
      });
      setOrderResults([...results]);
    }

    // Then buys
    for (const order of plan.buys) {
      const res = await placeOrder({
        simbolo: order.ticker,
        cantidad: order.quantity,
        precio: order.priceArs,
        plazo: 't1',
        tipoOrden: 'precioMercado',
        side: 'buy',
      });
      results.push({
        ticker: order.ticker, side: 'buy', quantity: order.quantity,
        success: res.success && res.data?.ok === true,
        message: res.success
          ? (res.data?.messages?.map(m => m.description || m.title).join('. ') || 'Orden enviada')
          : (res.error || 'Error'),
      });
      setOrderResults([...results]);
    }

    setPhase('done');
  }

  // ── Derived ─────────────────────────────────────────────────────────────────

  const isLoading = isLoadingAgents || isLoadingPortfolio;
  const isAnalyzing = phase === 'analyzing';
  const totalPortfolioArs = Object.entries(holdings).reduce((sum, [ticker, qty]) => {
    return sum + qty * (arsPrices[ticker] ?? 0);
  }, 0);
  const effectiveMep = mepRateLocal ?? mepRate ?? 1;

  const hasOrders = plan && (plan.sells.length > 0 || plan.buys.length > 0);

  const statusText = isAnalyzing
    ? (logs.findLast(l => l.status === 'running')?.text ?? 'Analizando...').slice(0, 60)
    : phase === 'planned'
      ? `Plan: ${plan?.sells.length ?? 0} venta(s), ${plan?.buys.length ?? 0} compra(s)`
      : phase === 'executing'
        ? 'Ejecutando órdenes...'
        : phase === 'done'
          ? `${orderResults.length} orden(es) ejecutada(s)`
          : isLoading
            ? 'Cargando...'
            : 'Listo';

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={WINDOW_CONTAINER}>
      <div className="win98-scrollbar" style={SCROLLABLE_BODY}>

        {/* ── Portfolio Actual ────────────────────────────────────────── */}
        <fieldset>
          <legend>Portafolio Actual</legend>
          <div style={{ ...FONT, padding: '2px 0' }}>
            <span>Cash disponible: </span>
            <strong>${fmtARS(cashArs)} ARS</strong>
            <span style={{ color: COLOR_SECONDARY, marginLeft: 8 }}>
              (~USD ${fmtARS(cashArs / effectiveMep)})
            </span>
          </div>
          {holdingTickers.length > 0 ? (
            <div className="sunken-panel" style={{ margin: '4px 0', maxHeight: 140, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={COL_HEADER}>Ticker</th>
                    <th style={COL_HEADER_RIGHT}>Cant</th>
                    <th style={COL_HEADER_RIGHT}>Precio</th>
                    <th style={COL_HEADER_RIGHT}>Valuación</th>
                  </tr>
                </thead>
                <tbody>
                  {holdingTickers.map(ticker => {
                    const qty = holdings[ticker] ?? 0;
                    const price = arsPrices[ticker] ?? 0;
                    return (
                      <tr key={ticker}>
                        <td style={CELL}>{ticker}</td>
                        <td style={CELL_RIGHT}>{qty}</td>
                        <td style={CELL_RIGHT}>${fmtARS2(price)}</td>
                        <td style={CELL_RIGHT}>${fmtARS(qty * price)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{ ...FONT, color: portfolioError ? COLOR_NEGATIVE : COLOR_DISABLED, padding: '4px 0' }}>
              {isLoadingPortfolio ? 'Cargando...' : portfolioError ? portfolioError : 'Sin posiciones en CEDEARs'}
            </div>
          )}
          <div style={{ ...FONT, padding: '2px 0', borderTop: '1px solid #808080' }}>
            <span>Total portfolio: </span>
            <strong>${fmtARS(totalPortfolioArs)} ARS</strong>
            <span style={{ color: COLOR_SECONDARY, marginLeft: 8 }}>
              (~USD ${fmtARS(totalPortfolioArs / effectiveMep)})
            </span>
          </div>
        </fieldset>

        {/* ── Configuración ──────────────────────────────────────────── */}
        <fieldset style={{ marginTop: 6 }}>
          <legend>Configuración</legend>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...FONT }}>
            <label htmlFor="daily-limit">Límite plata nueva:</label>
            <input
              id="daily-limit"
              type="number"
              value={dailyLimit}
              onChange={e => setDailyLimit(Math.max(0, Number(e.target.value)))}
              style={{ width: 120, ...FONT }}
              disabled={isAnalyzing}
            />
            <span>ARS</span>
            <span style={{ color: COLOR_SECONDARY, marginLeft: 8 }}>
              (~USD ${fmtARS(dailyLimit / effectiveMep)})
            </span>
          </div>
          <div style={{ ...FONT, color: COLOR_SECONDARY, marginTop: 4 }}>
            Comisión: {(COMMISSION_RATE * 100).toFixed(1)}% por operación
          </div>
        </fieldset>

        {/* ── Agentes AI ─────────────────────────────────────────────── */}
        <AgentSelector
          agents={agents}
          selectedAgents={selectedAgents}
          onToggle={toggleAgent}
          onSelectAll={() => setSelectedAgents(new Set(agents.map(a => a.key)))}
          onSelectNone={() => setSelectedAgents(new Set())}
          isLoading={isLoadingAgents}
          disabled={isAnalyzing}
          errorText={`No se pudo conectar al servidor AI Hedge Fund (${API_URL})`}
          idPrefix="at-agent"
        />

        {/* ── Analyze button ─────────────────────────────────────────── */}
        <div style={{ display: 'flex', gap: 6, margin: '8px 0' }}>
          <button
            onClick={handleAnalyze}
            disabled={isLoading || isAnalyzing || selectedAgents.size === 0 || fmpTickers.length === 0}
          >
            {isAnalyzing ? 'Analizando...' : 'Analizar'}
          </button>
          <button onClick={loadPortfolio} disabled={isAnalyzing}>
            Recargar Portfolio
          </button>
          {isAnalyzing && (
            <button onClick={() => abortRef.current?.abort()}>Cancelar</button>
          )}
        </div>

        {/* ── Progress ───────────────────────────────────────────────── */}
        {logs.length > 0 && (
          <fieldset style={{ marginTop: 2 }}>
            <legend>Progreso {isAnalyzing && `(${progress}%)`}</legend>
            <div ref={logBodyRef} className="sunken-panel" style={{ maxHeight: 120, overflow: 'auto', padding: 4 }}>
              {logs.map(l => (
                <div key={l.id} style={{ ...FONT, display: 'flex', gap: 4, lineHeight: '16px' }}>
                  <LogIcon status={l.status} />
                  <span>{l.text}</span>
                </div>
              ))}
            </div>
          </fieldset>
        )}

        {/* ── Analyst Signals ────────────────────────────────────────── */}
        {analystSignals && (
          <fieldset style={{ marginTop: 6 }}>
            <legend>Señales de Analistas</legend>
            <div className="sunken-panel" style={{ maxHeight: 160, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={COL_HEADER}>Ticker</th>
                    <th style={COL_HEADER}>Agente</th>
                    <th style={COL_HEADER}>Señal</th>
                    <th style={COL_HEADER_RIGHT}>Conf.</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(analystSignals)
                    .filter(([agent]) => !agent.startsWith('risk_management'))
                    .flatMap(([agent, tickers]) =>
                      Object.entries(tickers).map(([ticker, sig]) => ({ agent, ticker, sig }))
                    )
                    .sort((a, b) => a.ticker.localeCompare(b.ticker) || a.agent.localeCompare(b.agent))
                    .map(({ agent, ticker, sig }, i) => (
                      <tr key={i}>
                        <td style={CELL}>{ticker}</td>
                        <td style={CELL}>{agent.replace(/_/g, ' ')}</td>
                        <td style={{
                          ...CELL,
                          color: sig.signal === 'bullish' ? COLOR_POSITIVE
                            : sig.signal === 'bearish' ? COLOR_NEGATIVE : COLOR_SECONDARY,
                        }}>
                          {sig.signal}
                        </td>
                        <td style={CELL_RIGHT}>{sig.confidence}%</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </fieldset>
        )}

        {/* ── AI Suggestions for non-portfolio tickers ────────────────── */}
        {candidateDecisions && Object.keys(candidateDecisions).length > 0 && (
          <fieldset style={{ marginTop: 6 }}>
            <legend>Sugerencias AI (fuera de portfolio)</legend>
            <div className="sunken-panel" style={{ maxHeight: 140, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={COL_HEADER}>Ticker</th>
                    <th style={COL_HEADER}>Acción</th>
                    <th style={COL_HEADER_RIGHT}>Conf.</th>
                    <th style={COL_HEADER_RIGHT}>Precio</th>
                    <th style={COL_HEADER}>Razón</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(candidateDecisions)
                    .sort(([, a], [, b]) => b.confidence - a.confidence)
                    .map(([ticker, dec]) => (
                      <tr key={ticker}>
                        <td style={CELL}>{ticker}</td>
                        <td style={{
                          ...CELL,
                          color: dec.action === 'buy' ? COLOR_POSITIVE
                            : dec.action === 'sell' ? COLOR_NEGATIVE : COLOR_SECONDARY,
                          fontWeight: dec.action !== 'hold' ? 'bold' : 'normal',
                        }}>
                          {dec.action.toUpperCase()}
                        </td>
                        <td style={CELL_RIGHT}>{dec.confidence}%</td>
                        <td style={CELL_RIGHT}>
                          {arsPrices[ticker] ? `$${fmtARS2(arsPrices[ticker])}` : '—'}
                        </td>
                        <td style={{ ...CELL, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}
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

        {/* ── Trading Plan ───────────────────────────────────────────── */}
        {plan && (
          <fieldset style={{ marginTop: 6 }}>
            <legend>Plan de Trading</legend>

            {plan.sells.length > 0 && (
              <>
                <div style={{ ...FONT, fontWeight: 'bold', color: COLOR_NEGATIVE, margin: '4px 0 2px' }}>
                  VENTAS
                </div>
                <OrderTable orders={plan.sells} />
              </>
            )}

            {plan.buys.length > 0 && (
              <>
                <div style={{ ...FONT, fontWeight: 'bold', color: COLOR_POSITIVE, margin: '4px 0 2px' }}>
                  COMPRAS
                </div>
                <OrderTable orders={plan.buys} />
              </>
            )}

            {!hasOrders && (
              <div style={{ ...FONT, color: COLOR_DISABLED, padding: '8px 0' }}>
                El AI no recomienda operaciones hoy.
              </div>
            )}

            {/* Summary */}
            <div style={{
              ...FONT, marginTop: 6, padding: '4px 6px',
              borderTop: '1px solid #808080', borderBottom: '1px solid #ffffff',
            }}>
              <div>
                Ventas: <strong>${fmtARS(plan.totalSellVolume)}</strong>
                {' — '}
                Compras: <strong>${fmtARS(plan.totalBuyVolume)}</strong>
              </div>
              <div style={{ color: COLOR_SECONDARY }}>
                Proceeds de ventas: ${fmtARS(plan.estimatedSellProceeds)} (reciclados en compras)
              </div>
              <div style={{ color: COLOR_SECONDARY }}>
                Plata nueva utilizada: ${fmtARS(plan.newCashUsed)} / ${fmtARS(dailyLimit)} límite
              </div>
              <div style={{ color: COLOR_SECONDARY }}>
                Límite restante: ${fmtARS(plan.remainingLimit)}
              </div>
            </div>

            {/* Warnings */}
            {plan.warnings.length > 0 && (
              <div style={{ marginTop: 4 }}>
                {plan.warnings.map((w, i) => (
                  <div key={i} style={{ ...FONT, color: '#808000', lineHeight: '16px' }}>
                    ! {w}
                  </div>
                ))}
              </div>
            )}
          </fieldset>
        )}

        {/* ── Execute button ─────────────────────────────────────────── */}
        {phase === 'planned' && hasOrders && (
          <div style={{ margin: '8px 0' }}>
            <button onClick={() => setPhase('confirming')}>
              Ejecutar Órdenes
            </button>
          </div>
        )}

        {/* ── Confirmation ───────────────────────────────────────────── */}
        {phase === 'confirming' && plan && (
          <fieldset style={{ marginTop: 6, border: '2px solid #000080' }}>
            <legend style={{ color: '#000080', fontWeight: 'bold' }}>Confirmar Ejecución</legend>
            <div style={{ ...FONT, padding: '4px 0' }}>
              Se ejecutarán las siguientes órdenes a precio de mercado, plazo 24hs:
            </div>
            <div className="sunken-panel" style={{ padding: 4, margin: '4px 0' }}>
              {plan.sells.map(o => (
                <div key={`sell-${o.ticker}`} style={{ ...FONT, color: COLOR_NEGATIVE }}>
                  VENDER {o.ticker} x{o.quantity} @ ${fmtARS2(o.priceArs)}
                </div>
              ))}
              {plan.buys.map(o => (
                <div key={`buy-${o.ticker}`} style={{ ...FONT, color: COLOR_POSITIVE }}>
                  COMPRAR {o.ticker} x{o.quantity} @ ${fmtARS2(o.priceArs)}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
              <button onClick={handleExecuteOrders}>Confirmar y enviar</button>
              <button onClick={() => setPhase('planned')}>Cancelar</button>
            </div>
          </fieldset>
        )}

        {/* ── Order results ──────────────────────────────────────────── */}
        {orderResults.length > 0 && (
          <fieldset style={{ marginTop: 6 }}>
            <legend>Resultados</legend>
            <div className="sunken-panel" style={{ padding: 4 }}>
              {orderResults.map((r, i) => (
                <div key={i} style={{ ...FONT, display: 'flex', gap: 4, lineHeight: '16px' }}>
                  <span style={{ color: r.success ? COLOR_POSITIVE : COLOR_NEGATIVE }}>
                    {r.success ? '\u25A0' : '\u2715'}
                  </span>
                  <span style={{ color: r.side === 'sell' ? COLOR_NEGATIVE : COLOR_POSITIVE }}>
                    {r.side === 'sell' ? 'SELL' : 'BUY'}
                  </span>
                  <span>{r.ticker} x{r.quantity}</span>
                  <span style={{ color: COLOR_SECONDARY }}>— {r.message}</span>
                </div>
              ))}
            </div>
          </fieldset>
        )}

      </div>

      {/* ── Status bar ───────────────────────────────────────────────── */}
      <div className="status-bar" style={STATUS_BAR_STYLE}>
        <div className="status-bar-field" style={FONT}>{statusText}</div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function OrderTable({ orders }: { orders: RebalanceOrder[] }) {
  return (
    <div className="sunken-panel" style={{ overflow: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={COL_HEADER}>Ticker</th>
            <th style={COL_HEADER_RIGHT}>Cant</th>
            <th style={COL_HEADER_RIGHT}>Precio</th>
            <th style={COL_HEADER_RIGHT}>Volumen</th>
            <th style={COL_HEADER_RIGHT}>Conf.</th>
            <th style={COL_HEADER}>Razón</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(o => (
            <tr key={o.ticker}>
              <td style={CELL}>{o.ticker}</td>
              <td style={CELL_RIGHT}>{o.quantity}</td>
              <td style={CELL_RIGHT}>${fmtARS2(o.priceArs)}</td>
              <td style={CELL_RIGHT}>${fmtARS(o.volumeArs)}</td>
              <td style={CELL_RIGHT}>{o.confidence}%</td>
              <td style={{ ...CELL, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}
                  title={o.reasoning}>
                {o.reasoning}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
