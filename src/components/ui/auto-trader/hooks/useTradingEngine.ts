import { useState, useRef, useCallback, useEffect } from 'react';
import { LogEntry, LogStatus, Phase, OrderResult, AgentSignal, Decision, HistoricalRun } from '../types';
import { computeRebalancePlan, RebalancePlan } from '@/lib/trading/rebalance-engine';
import { placeOrder, getOrderStatus } from '@/app/trading/actions';
import { parseSSEChunk, remapToIol, fmtARS } from '../utils';
import { COMMISSION_RATE } from '@/lib/trading/quick-trade';
import { waitForOrderSettlement } from '@/lib/trading/order-polling';
import { useHistoryStore } from '@/lib/store/history-store';
import { useAutoTraderT } from '@/lib/i18n';

const API_URL = '/api/hedge-fund';

export function useTradingEngine({
  cashArs,
  effectiveMep,
  dailyLimit,
  holdings,
  holdingTickers,
  portfolioPositions,
  arsPrices,
  fmpTickers,
  fmpToIol,
  panelSymbols,
  selectedAgents,
  modelName,
  companyNames,
}: {
  cashArs: number;
  effectiveMep: number;
  dailyLimit: number;
  holdings: Record<string, number>;
  holdingTickers: string[];
  portfolioPositions: Array<{ ticker: string; quantity: number; trade_price: number }>;
  arsPrices: Record<string, number>;
  fmpTickers: string[];
  fmpToIol: Record<string, string>;
  panelSymbols: string[];
  selectedAgents: Set<string>;
  modelName: string;
  companyNames?: Record<string, string>;
}) {
  const t = useAutoTraderT();
  const [phase, setPhase] = useState<Phase>('idle');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState(0);
  const [analystSignals, setAnalystSignals] = useState<Record<string, Record<string, AgentSignal>> | null>(null);
  const [rawDecisions, setRawDecisions] = useState<Record<string, Decision> | null>(null);
  const [plan, setPlan] = useState<RebalancePlan | null>(null);
  const [candidateDecisions, setCandidateDecisions] = useState<Record<string, Decision> | null>(null);
  const [orderResults, setOrderResults] = useState<OrderResult[]>([]);

  const abortRef = useRef<AbortController | null>(null);
  const currentRunIdRef = useRef<string | null>(null);

  useEffect(() => () => { abortRef.current?.abort(); }, []);

  const addLog = useCallback((id: string, text: string, status: LogStatus = 'running', agent?: string, ticker?: string, detail?: string) => {
    setLogs(prev => [...prev, { id, text, status, agent, ticker, detail }]);
  }, []);

  const updateLog = useCallback((id: string, text: string, status: LogStatus, agent?: string, ticker?: string, detail?: string) => {
    setLogs(prev => prev.map(l => l.id === id ? { ...l, text, status, agent, ticker, detail } : l));
  }, []);

  async function handleAnalyze(setActiveTab: (tab: 'config' | 'ai' | 'plan' | 'history') => void) {
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

    const cashUsd = effectiveMep > 0 ? cashArs / effectiveMep : 100000;
    // initial_cash is the *real* free buying power the backend can plan against.
    // dailyLimit is a frontend-only activity cap (max sell rotation + max new
    // money) enforced later in computeRebalancePlan; folding it in here would
    // make the risk manager double-count it as available liquidity, leading
    // to plans that the rebalance engine then silently trims.
    const budgetUsd = cashUsd;

    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setFullYear(today.getFullYear() - 1);

    const body = {
      tickers: fmpTickers,
      model_name: modelName,
      model_provider: 'Anthropic',
      initial_cash: Math.round(budgetUsd * 100) / 100,
      start_date: oneYearAgo.toISOString().slice(0, 10),
      end_date: today.toISOString().slice(0, 10),
      portfolio_positions: portfolioPositions.length > 0 ? portfolioPositions : undefined,
      graph_nodes: graphNodes,
      graph_edges: graphEdges,
    };

    addLog('cash', t('engine.log.cash', { amount: fmtARS(cashArs), usd: cashUsd.toFixed(0), mep: effectiveMep.toFixed(0) }), 'ok');
    addLog('limit', t('engine.log.limit', { amount: fmtARS(dailyLimit), usd: (dailyLimit / effectiveMep).toFixed(0) }), 'ok');
    addLog('portfolio-tickers', t('engine.log.holdings', { count: holdingTickers.length, list: holdingTickers.join(', ') || t('engine.log.noPositions') }), 'ok');
    addLog('candidate-tickers', t('engine.log.candidates', { count: panelSymbols.length, list: panelSymbols.join(', ') || t('engine.log.none') }), 'ok');
    // Show explicit IOL→FMP pairs only when symbols actually differ
    const mappingPairs = Object.entries(fmpToIol)
      .filter(([fmp, iol]) => fmp !== iol)
      .map(([fmp, iol]) => `${iol}→${fmp}`);
    if (mappingPairs.length > 0) {
      addLog('fmp-mapped', t('engine.log.mapped', { list: mappingPairs.join(', ') }), 'ok');
    }
    addLog('agents-info', t('engine.log.agents', { list: agentKeys.map(k => k.replace(/_/g, ' ')).join(', ') }), 'ok');
    addLog('start', t('engine.log.sending', { tickers: fmpTickers.length, agents: agentKeys.length }));

    try {
      const response = await fetch(`${API_URL}/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: abortRef.current.signal,
      });

      if (!response.ok) {
        // FastAPI rejects unknown CEDEAR tickers with 400 + { detail: "Ticker 'X' is not a CEDEAR..." }.
        // Surface that detail directly so the user sees which ticker the backend rejected.
        const errText = await response.text();
        let message = errText;
        try {
          const parsed = JSON.parse(errText) as { detail?: string };
          if (parsed.detail) message = parsed.detail;
        } catch {
          // not JSON — keep raw text
        }
        throw new Error(`HTTP ${response.status}: ${message}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let progressCount = 0;
      const totalEstimate = agentKeys.length * fmpTickers.length + 5;

      const processCompleteEvent = (d: Record<string, unknown>) => {
        const completeData = d.data as Record<string, unknown> | undefined;
        if (!completeData) return;

        const rawSignals = completeData.analyst_signals as Record<string, Record<string, AgentSignal>>;
        const remappedSignals: Record<string, Record<string, AgentSignal>> = {};
        for (const [agent, tickerSignals] of Object.entries(rawSignals)) {
          remappedSignals[agent] = remapToIol(tickerSignals, fmpToIol);
        }
        setAnalystSignals(remappedSignals);

        const rawDec = completeData.decisions as Record<string, Decision>;
        const iolDecisions = remapToIol(rawDec, fmpToIol);
        setRawDecisions(iolDecisions);

        const candidates: Record<string, Decision> = {};
        for (const [ticker, dec] of Object.entries(iolDecisions)) {
          if (!holdingTickers.includes(ticker)) candidates[ticker] = dec;
        }
        setCandidateDecisions(candidates);

        // The backend now returns decision.quantity already in CEDEAR units
        // (matches what the broker trades). The rebalance engine, holdings
        // map and IOL all speak in CEDEARs, so we pass the decisions through
        // unchanged.
        const rebalancePlan = computeRebalancePlan({
          decisions: iolDecisions,
          holdings,
          arsPrices,
          cashArs,
          dailyLimitArs: dailyLimit,
          commissionRate: COMMISSION_RATE,
        }, t);
        setPlan(rebalancePlan);

        // Save historical run
        const runId = `run-${Date.now()}`;
        currentRunIdRef.current = runId;
        const historicalRun: HistoricalRun = {
          id: runId,
          timestamp: Date.now(),
          agentKeys: agentKeys,
          tickers: fmpTickers,
          analystSignals: remappedSignals,
          decisions: iolDecisions,
          plan: {
            sells: rebalancePlan.sells,
            buys: rebalancePlan.buys,
            totalSellVolume: rebalancePlan.totalSellVolume,
            totalBuyVolume: rebalancePlan.totalBuyVolume,
            estimatedSellProceeds: rebalancePlan.estimatedSellProceeds,
            warnings: rebalancePlan.warnings,
          },
          executed: false,
          orderResults: [],
          snapshot: { cashArs, holdings: { ...holdings }, dailyLimit },
          companyNames: companyNames ? { ...companyNames } : undefined,
        };
        useHistoryStore.getState().addRun(historicalRun);

        const nSells = rebalancePlan.sells.length;
        const nBuys = rebalancePlan.buys.length;
        const nCandidates = Object.keys(candidates).length;
        const nCandBuys = Object.values(candidates).filter(d => d.action === 'buy').length;
        addLog('complete', [
          t('engine.log.completed'),
          t('engine.log.planSummary', { sells: nSells, buys: nBuys }),
          nCandidates > 0 ? t('engine.log.candidateSummary', { buyCount: nCandBuys, totalCount: nCandidates }) : '',
        ].filter(Boolean).join(' '), 'ok');
        // Surface every reason the engine had to drop or trim an order from
        // the LLM's plan. Without this, users only see the final counts and
        // can't tell that e.g. 3 sells were silently skipped for hitting the
        // dailyLimit cap.
        if (rebalancePlan.warnings.length > 0) {
          addLog('warnings-header', t('engine.log.warningsHeader', { count: rebalancePlan.warnings.length }), 'warn');
          rebalancePlan.warnings.forEach((w, i) => addLog(`warning-${i}`, w, 'warn'));
        }
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
                updateLog('start', t('engine.log.started'), 'ok');
              } else if (evt.event === 'progress') {
                progressCount++;
                const agent = (d.agent as string) || '';
                const fmpTicker = (d.ticker as string) || '';
                // Remap FMP → IOL so the user sees the symbol that matches their portfolio
                const ticker = fmpTicker ? (fmpToIol[fmpTicker] ?? fmpTicker) : '';
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
                addLog('error', t('engine.log.error', { message: (d.message as string) || t('engine.log.unknownError') }), 'error');
                setPhase('idle');
              } else if (evt.event === 'complete') {
                receivedComplete = true;
                processCompleteEvent(d);
              }
            }
          }
        }
      } catch (readErr) {
        streamError = readErr as Error;
      }

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

      if (streamError && !receivedComplete) {
        throw streamError;
      }
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') return;
      addLog('error', t('engine.log.networkError', { message: (err as Error).message }), 'error');
      setPhase('idle');
    }
  }

  async function handleExecuteOrders() {
    if (!plan) return;
    setPhase('executing');
    setOrderResults([]);
    const results: OrderResult[] = [];

    const SELL_POLL_TIMEOUT_MS = 60_000;
    const SELL_POLL_INTERVAL_MS = 5_000;

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
          ? (res.data?.numeroOperacion ? t('engine.log.operationNum', { num: res.data.numeroOperacion }) : (res.data?.messages?.map((m: any) => m.description || m.title).join('. ') || t('engine.log.orderSent')))
          : (res.error || 'Error'),
      });
      setOrderResults([...results]);

      // IOL releases sell proceeds to buying power only once the order is filled
      // (intraday settlement). Poll until terminal state before chaining buys —
      // otherwise buys may be rejected for "saldo insuficiente".
      const numeroOperacion = res.success ? res.data?.numeroOperacion : undefined;
      if (typeof numeroOperacion === 'number') {
        const outcome = await waitForOrderSettlement(numeroOperacion, {
          getStatus: getOrderStatus,
          timeoutMs: SELL_POLL_TIMEOUT_MS,
          pollMs: SELL_POLL_INTERVAL_MS,
        });
        const logId = `sell-poll-${numeroOperacion}`;
        if (outcome.kind === 'filled') {
          addLog(logId, t('engine.log.sellFilled', { ticker: order.ticker }), 'ok');
        } else if (outcome.kind === 'partial') {
          addLog(logId, t('engine.log.sellPartial', { ticker: order.ticker }), 'ok');
        } else if (outcome.kind === 'cancelled') {
          addLog(logId, t('engine.log.sellCancelled', { ticker: order.ticker }), 'error');
        } else {
          addLog(logId, t('engine.log.sellTimeout', { ticker: order.ticker, seconds: SELL_POLL_TIMEOUT_MS / 1000 }), 'error');
        }
      }
    }

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
          ? (res.data?.numeroOperacion ? t('engine.log.operationNum', { num: res.data.numeroOperacion }) : (res.data?.messages?.map((m: any) => m.description || m.title).join('. ') || t('engine.log.orderSent')))
          : (res.error || 'Error'),
      });
      setOrderResults([...results]);
    }

    setPhase('done');

    // Update historical run with execution results
    if (currentRunIdRef.current) {
      useHistoryStore.getState().updateRun(currentRunIdRef.current, {
        executed: true,
        orderResults: results,
      });
    }
  }

  function abortEngine() {
    abortRef.current?.abort();
    setPhase('idle');
    addLog('cancel', t('engine.log.cancelled'), 'error');
  }

  return {
    phase,
    setPhase,
    logs,
    progress,
    analystSignals,
    rawDecisions,
    plan,
    candidateDecisions,
    orderResults,
    handleAnalyze,
    handleExecuteOrders,
    abortEngine
  };
}
