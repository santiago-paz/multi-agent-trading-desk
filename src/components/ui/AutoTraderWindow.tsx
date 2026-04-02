'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  FONT, COL_HEADER_BASE, COL_RAISED, COL_SUNKEN,
  CELL, CELL_RIGHT, WINDOW_CONTAINER, STATUS_BAR_STYLE,
  COLOR_POSITIVE, COLOR_NEGATIVE, COLOR_SECONDARY, COLOR_DISABLED, COLOR_LINK
} from '@/lib/theme/win98';
import { getFullPortfolioContext, placeOrder } from '@/app/trading/actions';
import { computeRebalancePlan, RebalancePlan, RebalanceOrder } from '@/lib/trading/rebalance-engine';
import { COMMISSION_RATE } from '@/lib/trading/quick-trade';
import { useMepStore } from '@/lib/store/mep-store';
import { AgentSelector } from '@/components/ui/AgentSelector';

type PortfolioSortKey = 'ticker' | 'qty' | 'price' | 'priceUsd' | 'valuation';

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
interface LogEntry { id: string; text: string; status: LogStatus; agent?: string; ticker?: string; detail?: string; }

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
      
      // If we parsed successfully and generated human UI, return it.
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
  const [comprometidoArs, setComprometidoArs] = useState(0);
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

  // Tabs
  const [activeTab, setActiveTab] = useState<'config' | 'ai' | 'plan'>('config');

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

  // Portfolio table sort
  const [pSortKey, setPSortKey] = useState<PortfolioSortKey>('ticker');
  const [pSortDir, setPSortDir] = useState<'asc' | 'desc'>('asc');

  const logBodyRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll logs
  useEffect(() => {
    if (autoScrollRef.current && logBodyRef.current) {
      logBodyRef.current.scrollTop = logBodyRef.current.scrollHeight;
    }
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
        setComprometidoArs(result.comprometidoArs);
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

  const addLog = useCallback((id: string, text: string, status: LogStatus = 'running', agent?: string, ticker?: string, detail?: string) => {
    setLogs(prev => [...prev, { id, text, status, agent, ticker, detail }]);
  }, []);

  const updateLog = useCallback((id: string, text: string, status: LogStatus, agent?: string, ticker?: string, detail?: string) => {
    setLogs(prev => prev.map(l => l.id === id ? { ...l, text, status, agent, ticker, detail } : l));
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
    setActiveTab('ai');
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

    // Send a generous budget to the backend so the portfolio manager doesn't
    // prematurely discard buy actions. Include: real cash + daily limit +
    // estimated value of holdings (which could become sell proceeds).
    // The frontend rebalance engine enforces the real budget constraints.
    const holdingsValueArs = portfolioPositions.reduce(
      (sum, p) => sum + (arsPrices[p.ticker] ?? p.trade_price) * p.quantity, 0
    );
    const budgetArs = cashArs + dailyLimit + holdingsValueArs;
    const budgetUsd = effectiveMep && effectiveMep > 0
      ? budgetArs / effectiveMep
      : 100000;

    const body = {
      tickers: fmpTickers,
      model_name: 'claude-haiku-4-5-20251001',
      model_provider: 'Anthropic',
      initial_cash: Math.round(budgetUsd * 100) / 100,
      portfolio_positions: portfolioPositions.length > 0 ? portfolioPositions : undefined,
      graph_nodes: graphNodes,
      graph_edges: graphEdges,
    };

    console.log('='.repeat(80));
    console.log('INICIO LOG FRONTEND');
    console.log('='.repeat(80));
    console.log('\n[FRONTEND][1/5] PREPARING REQUEST');
    console.log('  cashArs:', cashArs);
    console.log('  dailyLimit:', dailyLimit);
    console.log('  holdingsValueArs:', holdingsValueArs);
    console.log('  budgetArs (cash + limit + holdings):', budgetArs);
    console.log('  effectiveMep:', effectiveMep);
    console.log('  budgetUsd (sent as initial_cash):', budgetUsd);
    console.log('  cashUsd (real):', cashUsd);
    console.log('  holdingTickers:', holdingTickers);
    console.log('  panelSymbols (candidates):', panelSymbols);
    console.log('  fmpTickers (sent to backend):', fmpTickers);
    console.log('  agents:', agentKeys);
    console.log('  arsPrices:', JSON.stringify(arsPrices, null, 2));
    console.log('  holdings:', JSON.stringify(holdings));
    console.log('  portfolioPositions:', JSON.stringify(portfolioPositions));
    console.log('  graphNodes:', JSON.stringify(graphNodes));
    console.log('  graphEdges:', JSON.stringify(graphEdges));
    console.log('  full body:', JSON.stringify(body, null, 2));

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

        console.log('\n[FRONTEND][2/5] COMPLETE EVENT RECEIVED FROM BACKEND');
        console.log('  raw decisions:', JSON.stringify(completeData.decisions, null, 2));
        console.log('  current_prices (USD):', JSON.stringify(completeData.current_prices, null, 2));

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

        console.log('\n[FRONTEND][3/5] FMP→IOL REMAPPING');
        console.log('  fmpToIol map:', JSON.stringify(fmpToIol));
        console.log('  iolDecisions (after remap):', JSON.stringify(iolDecisions, null, 2));

        // Separate decisions for tickers NOT in portfolio (candidates)
        const candidates: Record<string, Decision> = {};
        for (const [ticker, dec] of Object.entries(iolDecisions)) {
          if (!holdingTickers.includes(ticker)) {
            candidates[ticker] = dec;
          }
        }
        setCandidateDecisions(candidates);

        console.log('\n[FRONTEND][3b/5] DECISION SPLIT');
        console.log('  holdingTickers:', holdingTickers);
        const portfolioDecs: Record<string, Decision> = {};
        for (const [ticker, dec] of Object.entries(iolDecisions)) {
          if (holdingTickers.includes(ticker)) {
            portfolioDecs[ticker] = dec;
          }
        }
        console.log('  portfolio decisions:', JSON.stringify(portfolioDecs, null, 2));
        console.log('  candidate decisions (not in portfolio):', JSON.stringify(candidates, null, 2));

        // Compute rebalance plan
        console.log('\n[FRONTEND][4/5] COMPUTING REBALANCE PLAN');
        console.log('  inputs:');
        console.log('    cashArs:', cashArs);
        console.log('    dailyLimitArs:', dailyLimit);
        console.log('    holdings:', JSON.stringify(holdings));
        console.log('    arsPrices:', JSON.stringify(arsPrices));
        console.log('    commissionRate:', COMMISSION_RATE);

        const rebalancePlan = computeRebalancePlan({
          decisions: iolDecisions,
          holdings,
          arsPrices,
          cashArs,
          dailyLimitArs: dailyLimit,
          commissionRate: COMMISSION_RATE,
        });
        setPlan(rebalancePlan);

        console.log('\n[FRONTEND][5/5] REBALANCE PLAN OUTPUT');
        console.log('  sells:', rebalancePlan.sells.map(o => `${o.ticker} qty=${o.quantity} vol=$${o.volumeArs.toFixed(0)}`));
        console.log('  buys:', rebalancePlan.buys.map(o => `${o.ticker} qty=${o.quantity} vol=$${o.volumeArs.toFixed(0)}`));
        console.log('  totalSellVolume:', rebalancePlan.totalSellVolume);
        console.log('  totalBuyVolume:', rebalancePlan.totalBuyVolume);
        console.log('  estimatedSellProceeds:', rebalancePlan.estimatedSellProceeds);
        console.log('  newCashUsed:', rebalancePlan.newCashUsed);
        console.log('  remainingLimit:', rebalancePlan.remainingLimit);
        console.log('  warnings:', rebalancePlan.warnings);
        console.log('='.repeat(80));
        console.log('FIN LOG FRONTEND');
        console.log('='.repeat(80));

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
        setActiveTab('plan');
      };

      let streamError: Error | null = null;
      let receivedComplete = false;

      try {
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

                addLog(
                  logId,
                  `${agent}${ticker ? ` [${ticker}]` : ''}: ${analysis || status}`,
                  analysis ? 'ok' : 'running',
                  agent,
                  ticker,
                  analysis || status
                );
                setProgress(Math.min(95, Math.round((progressCount / totalEstimate) * 100)));
              } else if (evt.event === 'error') {
                addLog('error', `Error: ${(d.message as string) || 'Error desconocido'}`, 'error');
                setPhase('idle');
              } else if (evt.event === 'complete') {
                receivedComplete = true;
                processCompleteEvent(d);
              }
            }
          }
        }
      } catch (readErr) {
        // Stream read error — save it but still try to process any buffered data
        streamError = readErr as Error;
        console.warn('[FRONTEND] Stream read error, processing remaining buffer:', streamError.message);
      }

      // Process remaining buffer (works even if the stream was interrupted)
      if (buffer.trim()) {
        for (const evt of parseSSEChunk(buffer + '\n\n')) {
          if (evt.event === 'complete') {
            receivedComplete = true;
            processCompleteEvent(evt.data as Record<string, unknown>);
          } else if (evt.event === 'error') {
            const d = evt.data as Record<string, unknown>;
            addLog('error', `Error: ${(d.message as string) || 'Error desconocido'}`, 'error');
            setPhase('idle');
          }
        }
      }

      // If stream broke but we never got the complete event, show the error
      if (streamError && !receivedComplete) {
        throw streamError;
      }
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
      console.error('[FRONTEND] Analysis error:', err);
      addLog('error', `Error de red: ${(err as Error).message}. El backend puede haber completado — revisá los logs del servidor.`, 'error');
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
          ? (res.data?.numeroOperacion ? `Operación #${res.data.numeroOperacion}` : (res.data?.messages?.map(m => m.description || m.title).join('. ') || 'Orden enviada'))
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
          ? (res.data?.numeroOperacion ? `Operación #${res.data.numeroOperacion}` : (res.data?.messages?.map(m => m.description || m.title).join('. ') || 'Orden enviada'))
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
    <div style={{ ...WINDOW_CONTAINER, padding: '6px 6px 0 6px', boxSizing: 'border-box' }}>
      <menu role="tablist">
        <li role="tab" aria-selected={activeTab === 'config'}>
          <a href="#config" onClick={(e) => { e.preventDefault(); setActiveTab('config'); }}>1. Configuración</a>
        </li>
        <li role="tab" aria-selected={activeTab === 'ai'}>
          <a href="#ai" onClick={(e) => { e.preventDefault(); setActiveTab('ai'); }}>2. Inteligencia AI</a>
        </li>
        <li role="tab" aria-selected={activeTab === 'plan'}>
          <a href="#plan" onClick={(e) => { e.preventDefault(); setActiveTab('plan'); }}>3. Plan de Trading</a>
        </li>
      </menu>

      <div className="window" role="tabpanel" style={{ flex: 1, display: 'flex', flexDirection: 'column', marginBottom: 12, minHeight: 0, marginTop: '-1px' }}>
        <div className="window-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden', minHeight: 0, margin: 0 }}>
          
          {/* TAB 1: CONFIGURACIÓN */}
          {activeTab === 'config' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, gap: 8 }}>
              <div className="win98-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 2, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {/* ── Portfolio Actual ────────────────────────────────────────── */}
                <fieldset style={{ margin: 0, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <legend>Portafolio Actual</legend>
                  <div style={{ ...FONT, padding: '2px 0 6px 0', display: 'flex', gap: 16, flexShrink: 0 }}>
                    <div>
                      <span>Cash disponible: </span>
                      <strong>${fmtARS(cashArs)} ARS</strong>
                      {comprometidoArs > 0 && (
                        <span style={{ color: COLOR_NEGATIVE, marginLeft: 8 }}>
                          (Comprometido: ${fmtARS(comprometidoArs)} ARS)
                        </span>
                      )}
                      <span style={{ color: COLOR_SECONDARY, marginLeft: 8 }}>
                        (~USD ${fmtARS(cashArs / effectiveMep)})
                      </span>
                    </div>
                  </div>
                  <div style={{ ...FONT, padding: '2px 0', borderTop: '1px solid #808080', borderBottom: '1px solid #ffffff', marginTop: 4, paddingTop: 4, display: 'flex', gap: 16, flexShrink: 0 }}>
                    <div>
                      <span>Total portfolio: </span>
                      <strong>${fmtARS(totalPortfolioArs)} ARS</strong>
                      <span style={{ color: COLOR_SECONDARY, marginLeft: 8 }}>
                        (~USD ${fmtARS(totalPortfolioArs / effectiveMep)})
                      </span>
                    </div>
                  </div>
                  {holdingTickers.length > 0 ? (
                    <div className="sunken-panel win98-scrollbar" style={{ margin: 0, flex: 1, overflow: 'auto', minHeight: 0 }}>
                      <table style={{ ...FONT, width: '100%', borderCollapse: 'collapse', borderSpacing: 0 }}>
                        <thead>
                          <tr>
                            {([
                              { key: 'ticker' as PortfolioSortKey, label: 'Ticker', align: 'left' as const },
                              { key: 'qty' as PortfolioSortKey, label: 'Cant', align: 'right' as const },
                              { key: 'price' as PortfolioSortKey, label: 'Precio', align: 'right' as const },
                              { key: 'priceUsd' as PortfolioSortKey, label: 'USD', align: 'right' as const },
                              { key: 'valuation' as PortfolioSortKey, label: 'Valuación', align: 'right' as const },
                            ]).map((col) => {
                              const isActive = pSortKey === col.key;
                              const arrow = isActive ? (pSortDir === 'asc' ? ' ▲' : ' ▼') : '';
                              return (
                                <th
                                  key={col.key}
                                  onClick={() => {
                                    if (pSortKey === col.key) setPSortDir(d => d === 'asc' ? 'desc' : 'asc');
                                    else { setPSortKey(col.key); setPSortDir('asc'); }
                                  }}
                                  style={{
                                    ...COL_HEADER_BASE,
                                    textAlign: col.align,
                                    ...(isActive ? COL_SUNKEN : COL_RAISED),
                                    cursor: 'pointer',
                                    position: 'sticky',
                                    top: 0,
                                    zIndex: 1,
                                  }}
                                >
                                  {col.label}{arrow}
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody>
                          {[...holdingTickers].sort((a, b) => {
                            let va: string | number, vb: string | number;
                            const qtyA = holdings[a] ?? 0, qtyB = holdings[b] ?? 0;
                            const priceA = arsPrices[a] ?? 0, priceB = arsPrices[b] ?? 0;
                            switch (pSortKey) {
                              case 'ticker': va = a; vb = b; break;
                              case 'qty': va = qtyA; vb = qtyB; break;
                              case 'price': va = priceA; vb = priceB; break;
                              case 'priceUsd': va = priceA / effectiveMep; vb = priceB / effectiveMep; break;
                              case 'valuation': va = qtyA * priceA; vb = qtyB * priceB; break;
                            }
                            const cmp = typeof va === 'string' ? va.localeCompare(vb as string) : (va as number) - (vb as number);
                            return pSortDir === 'asc' ? cmp : -cmp;
                          }).map((ticker, idx) => {
                            const qty = holdings[ticker] ?? 0;
                            const price = arsPrices[ticker] ?? 0;
                            const priceUsd = price / effectiveMep;
                            return (
                              <tr key={ticker} style={{
                                backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f0f0f0',
                                cursor: 'default',
                              }}>
                                <td style={CELL}>{ticker}</td>
                                <td style={CELL_RIGHT}>{qty}</td>
                                <td style={CELL_RIGHT}>${fmtARS2(price)}</td>
                                <td style={CELL_RIGHT}>${fmtARS2(priceUsd)}</td>
                                <td style={{ ...CELL_RIGHT, borderRight: 'none' }}>${fmtARS(qty * price)}</td>
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
                </fieldset>

                {/* ── Configuración ──────────────────────────────────────────── */}
                <fieldset style={{ margin: 0, flexShrink: 0 }}>
                  <legend>Configuración</legend>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...FONT }}>
                    <div className="field-row">
                      <label htmlFor="daily-limit">Límite plata nueva:</label>
                      <input
                        id="daily-limit"
                        type="number"
                        value={dailyLimit}
                        onChange={e => setDailyLimit(Math.max(0, Number(e.target.value)))}
                        style={{ width: 120, ...FONT }}
                        disabled={isAnalyzing}
                      />
                    </div>
                    <span>ARS</span>
                    <span style={{ color: COLOR_SECONDARY, marginLeft: 8 }}>
                      (~USD ${fmtARS(dailyLimit / effectiveMep)})
                    </span>
                    <span style={{ color: COLOR_SECONDARY, marginLeft: 16 }}>
                      Comisión: {(COMMISSION_RATE * 100).toFixed(1)}% por operación
                    </span>
                  </div>
                </fieldset>

                {/* ── Agentes AI ─────────────────────────────────────────────── */}
                <div style={{ margin: 0, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
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
                </div>
              </div>

              {/* ── Analyze button ─────────────────────────────────────────── */}
              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', flexShrink: 0, paddingTop: 6, borderTop: '1px solid #dfdfdf' }}>
                {isAnalyzing && (
                  <button onClick={() => abortRef.current?.abort()}>Cancelar</button>
                )}
                <button onClick={loadPortfolio} disabled={isAnalyzing}>
                  Recargar Portfolio
                </button>
                <button
                  className="default"
                  onClick={handleAnalyze}
                  disabled={isLoading || isAnalyzing || selectedAgents.size === 0 || fmpTickers.length === 0}
                >
                  {isAnalyzing ? 'Analizando...' : 'Analizar'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: INTELIGENCIA AI */}
          {activeTab === 'ai' && (
            <div className="win98-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 2, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {phase === 'idle' && logs.length === 0 ? (
                <div style={{ ...FONT, padding: 16, textAlign: 'center', color: COLOR_SECONDARY }}>
                  No hay datos de análisis. Configure los parámetros y presione &quot;Analizar&quot; en la pestaña de Configuración.
                </div>
              ) : (
                <>
                  {/* ── Progress ───────────────────────────────────────────────── */}
                  {logs.length > 0 && (
                    <fieldset style={{ margin: 0, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                      <legend>Progreso {isAnalyzing && `(${progress}%)`}</legend>
                      <div 
                        ref={logBodyRef} 
                        className="sunken-panel win98-scrollbar" 
                        style={{ flex: 1, overflow: 'auto', padding: 4, margin: 0 }}
                        onScroll={(e) => {
                          const target = e.target as HTMLDivElement;
                          // If we are within 10px of the bottom, turn auto-scroll back on
                          const isNearBottom = target.scrollHeight - target.scrollTop - target.clientHeight < 10;
                          autoScrollRef.current = isNearBottom;
                        }}
                      >
                        {logs.map(l => (
                          <div key={l.id} style={{ ...FONT, display: 'flex', gap: 4, lineHeight: '16px' }}>
                            <LogIcon status={l.status} />
                            {l.agent ? (
                              <span style={{ display: 'block', paddingTop: 4 }}>
                                <strong style={{ color: '#000080' }}>{l.agent.replace(/_/g, ' ')}</strong>
                                {l.ticker && <span style={{ color: '#800000', fontWeight: 'bold' }}> [{l.ticker}]</span>}
                                <span>:</span>
                                {renderAgentDetail(l.detail)}
                              </span>
                            ) : (
                              <span>{l.text}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </fieldset>
                  )}

                  {/* ── Analyst Signals ────────────────────────────────────────── */}
                  {analystSignals && (
                    <fieldset style={{ margin: 0, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                      <legend>Señales de Analistas</legend>
                      <div className="sunken-panel win98-scrollbar" style={{ flex: 1, overflow: 'auto', margin: 0 }}>
                        <table style={{ ...FONT, width: '100%', borderCollapse: 'collapse', borderSpacing: 0 }}>
                          <thead>
                            <tr>
                              <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left', position: 'sticky', top: 0, zIndex: 1 }}>Ticker</th>
                              <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left', position: 'sticky', top: 0, zIndex: 1 }}>Agente</th>
                              <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left', position: 'sticky', top: 0, zIndex: 1 }}>Señal</th>
                              <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>Conf.</th>
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
                                <tr key={i} style={{
                                  backgroundColor: i % 2 === 0 ? '#ffffff' : '#f0f0f0',
                                  cursor: 'default',
                                }}>
                                  <td style={CELL}>{ticker}</td>
                                  <td style={CELL}>{agent.replace(/_/g, ' ')}</td>
                                  <td style={{
                                    ...CELL,
                                    color: sig.signal === 'bullish' ? COLOR_POSITIVE
                                      : sig.signal === 'bearish' ? COLOR_NEGATIVE : COLOR_SECONDARY,
                                  }}>
                                    {sig.signal}
                                  </td>
                                  <td style={{ ...CELL_RIGHT, borderRight: 'none' }}>{sig.confidence}%</td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </fieldset>
                  )}

                  {/* ── AI Suggestions for non-portfolio tickers ────────────────── */}
                  {candidateDecisions && Object.keys(candidateDecisions).length > 0 && (
                    <fieldset style={{ margin: 0, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                      <legend>Sugerencias AI (fuera de portfolio)</legend>
                      <div className="sunken-panel win98-scrollbar" style={{ flex: 1, overflow: 'auto', margin: 0 }}>
                        <table style={{ ...FONT, width: '100%', borderCollapse: 'collapse', borderSpacing: 0 }}>
                          <thead>
                            <tr>
                              <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left', position: 'sticky', top: 0, zIndex: 1 }}>Ticker</th>
                              <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left', position: 'sticky', top: 0, zIndex: 1 }}>Acción</th>
                              <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>Conf.</th>
                              <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>Precio</th>
                              <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left', position: 'sticky', top: 0, zIndex: 1 }}>Razón</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(candidateDecisions)
                              .sort(([, a], [, b]) => b.confidence - a.confidence)
                              .map(([ticker, dec], i) => (
                                <tr key={ticker} style={{
                                  backgroundColor: i % 2 === 0 ? '#ffffff' : '#f0f0f0',
                                  cursor: 'default',
                                }}>
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
                                  <td style={{ ...CELL, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', borderRight: 'none' }}
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
                </>
              )}
            </div>
          )}

          {/* TAB 3: PLAN DE TRADING */}
          {activeTab === 'plan' && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, gap: 8 }}>
              <div className="win98-scrollbar" style={{ flex: 1, padding: 2, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {!plan && phase !== 'executing' && phase !== 'done' ? (
                  <div style={{ ...FONT, padding: 16, textAlign: 'center', color: COLOR_SECONDARY }}>
                    El plan de trading se generará una vez que se complete el análisis AI.
                  </div>
                ) : (
                  <>
                    {/* ── Trading Plan ───────────────────────────────────────────── */}
                    {plan && (
                      <fieldset style={{ margin: 0, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <legend>Plan de Trading</legend>
                        <div className="win98-scrollbar" style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingRight: 4, display: 'flex', flexDirection: 'column' }}>
                          {plan.sells.length > 0 && (
                            <>
                              <div style={{ ...FONT, fontWeight: 'bold', color: COLOR_NEGATIVE, margin: '4px 0 2px', flexShrink: 0 }}>
                                VENTAS
                              </div>
                              <OrderTable orders={plan.sells} />
                            </>
                          )}

                          {plan.buys.length > 0 && (
                            <>
                              <div style={{ ...FONT, fontWeight: 'bold', color: COLOR_POSITIVE, margin: '4px 0 2px', marginTop: plan.sells.length > 0 ? 8 : 4, flexShrink: 0 }}>
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
                        </div>

                        {/* Summary */}
                        <div style={{
                          ...FONT, marginTop: 6, padding: '4px 6px',
                          borderTop: '1px solid #808080', borderBottom: '1px solid #ffffff',
                          flexShrink: 0
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
                          <div style={{ marginTop: 4, flexShrink: 0 }}>
                            {plan.warnings.map((w, i) => (
                              <div key={i} style={{ ...FONT, color: '#808000', lineHeight: '16px' }}>
                                ! {w}
                              </div>
                            ))}
                          </div>
                        )}
                      </fieldset>
                    )}

                    {/* ── Confirmation ───────────────────────────────────────────── */}
                    {phase === 'confirming' && plan && (
                      <fieldset style={{ margin: 0, border: '2px solid #000080', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <legend style={{ color: '#000080', fontWeight: 'bold' }}>Confirmar Ejecución</legend>
                        <div style={{ ...FONT, padding: '4px 0', flexShrink: 0 }}>
                          Se ejecutarán las siguientes órdenes a precio de mercado, plazo 24hs:
                        </div>
                        <div className="sunken-panel win98-scrollbar" style={{ padding: 4, margin: '4px 0', flex: 1, overflow: 'auto', minHeight: 0 }}>
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
                        <div style={{ display: 'flex', gap: 6, marginTop: 4, flexShrink: 0 }}>
                          <button onClick={handleExecuteOrders}>Confirmar y enviar</button>
                          <button onClick={() => setPhase('planned')}>Cancelar</button>
                        </div>
                      </fieldset>
                    )}

                    {/* ── Order results ──────────────────────────────────────────── */}
                    {orderResults.length > 0 && (
                      <fieldset style={{ margin: 0, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                        <legend>Resultados</legend>
                        <div className="sunken-panel win98-scrollbar" style={{ padding: 4, margin: 0, flex: 1, overflow: 'auto', minHeight: 0 }}>
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
                  </>
                )}
              </div>

              {/* ── Execute button (fixed at bottom of tab) ────────────────── */}
              {phase === 'planned' && hasOrders && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', flexShrink: 0, paddingTop: 6, borderTop: '1px solid #dfdfdf' }}>
                  <button className="default" onClick={() => setPhase('confirming')}>
                    Ejecutar Órdenes
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
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
    <div className="sunken-panel win98-scrollbar" style={{ flex: 1, overflow: 'auto', margin: 0, minHeight: 0 }}>
      <table style={{ ...FONT, width: '100%', borderCollapse: 'collapse', borderSpacing: 0 }}>
        <thead>
          <tr>
            <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left', position: 'sticky', top: 0, zIndex: 1 }}>Ticker</th>
            <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>Cant</th>
            <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>Precio</th>
            <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>Volumen</th>
            <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'right', position: 'sticky', top: 0, zIndex: 1 }}>Conf.</th>
            <th style={{ ...COL_HEADER_BASE, ...COL_RAISED, textAlign: 'left', position: 'sticky', top: 0, zIndex: 1 }}>Razón</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o, idx) => (
            <tr key={o.ticker} style={{
              backgroundColor: idx % 2 === 0 ? '#ffffff' : '#f0f0f0',
              cursor: 'default',
            }}>
              <td style={CELL}>{o.ticker}</td>
              <td style={CELL_RIGHT}>{o.quantity}</td>
              <td style={CELL_RIGHT}>${fmtARS2(o.priceArs)}</td>
              <td style={CELL_RIGHT}>${fmtARS(o.volumeArs)}</td>
              <td style={CELL_RIGHT}>{o.confidence}%</td>
              <td style={{ ...CELL, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', borderRight: 'none' }}
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
