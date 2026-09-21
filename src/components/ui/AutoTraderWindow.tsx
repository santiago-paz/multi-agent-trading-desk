'use client';

import React, { useEffect, useState } from 'react';
import { FONT, WINDOW_CONTAINER, STATUS_BAR_STYLE } from '@/lib/theme/win98';
import { useHistoryStore } from '@/lib/store/history-store';
import { usePortfolio } from './auto-trader/hooks/usePortfolio';
import { useAgents } from './auto-trader/hooks/useAgents';
import { useTradingEngine } from './auto-trader/hooks/useTradingEngine';
import { PortfolioTab } from './auto-trader/tabs/PortfolioTab';
import { AgentsTab } from './auto-trader/tabs/AgentsTab';
import { SettingsTab } from './auto-trader/tabs/SettingsTab';
import { AITab } from './auto-trader/tabs/AITab';
import { PlanTab } from './auto-trader/tabs/PlanTab';
import { HistoryTab } from './auto-trader/tabs/HistoryTab';
import { COMMISSION_RATE } from '@/lib/trading/quick-trade';
import { DEFAULT_MODEL, isMarketOpen, type AIModelId } from './auto-trader/market-hours';
import type { AutoTraderTab } from './auto-trader/types';
import { useAutoTraderT } from '@/lib/i18n';

interface AutoTraderWindowProps {
  onCompanyDetail?: (symbol: string) => void;
}

const TABS: AutoTraderTab[] = ['portfolio', 'agents', 'settings', 'analysis', 'plan', 'history'];

/** Re-checks the BYMA session once a minute so the status bar pane stays current. */
function useMarketStatus() {
  const [status, setStatus] = useState(() => isMarketOpen());
  useEffect(() => {
    const id = setInterval(() => setStatus(isMarketOpen()), 60_000);
    return () => clearInterval(id);
  }, []);
  return status;
}

/**
 * Property sheet: a single row of tabs, one page per question (what you have,
 * who decides, the limits, what happened, what to do, what was done), and the
 * sheet-level buttons outside the tab area at the bottom right.
 */
export function AutoTraderWindow({ onCompanyDetail }: AutoTraderWindowProps = {}) {
  const [activeTab, setActiveTab] = useState<AutoTraderTab>('portfolio');
  const [dailyLimit, setDailyLimit] = useState(100000);
  const [modelName, setModelName] = useState<AIModelId>(DEFAULT_MODEL);

  const t = useAutoTraderT();
  const portfolio = usePortfolio();
  const agents = useAgents();
  const historyCount = useHistoryStore(s => s.runs.length);
  const market = useMarketStatus();

  const engine = useTradingEngine({
    cashArs: portfolio.cashArs,
    effectiveMep: portfolio.effectiveMep,
    dailyLimit,
    holdings: portfolio.holdings,
    holdingTickers: portfolio.holdingTickers,
    portfolioPositions: portfolio.portfolioPositions,
    arsPrices: portfolio.arsPrices,
    fmpTickers: portfolio.fmpTickers,
    fmpToIol: portfolio.fmpToIol,
    iolToFmp: portfolio.iolToFmp,
    panelSymbols: portfolio.panelSymbols,
    selectedAgents: agents.selectedAgents,
    modelName,
    companyNames: portfolio.companyNames,
  });

  const isLoading = portfolio.isLoadingPortfolio || agents.isLoadingAgents;
  const isAnalyzing = engine.phase === 'analyzing';
  const hasOrders = !!engine.plan && (engine.plan.sells.length > 0 || engine.plan.buys.length > 0);
  const isBusy = isAnalyzing || engine.phase === 'confirming' || engine.phase === 'executing';
  const canAnalyze = !isLoading && !isBusy && agents.selectedAgents.size > 0 && portfolio.fmpTickers.length > 0;
  // One default button per window: the Plan page owns it while it offers Execute Orders.
  const analyzeIsDefault = !(activeTab === 'plan' && engine.phase === 'planned' && hasOrders);

  const statusText = isAnalyzing
    ? (engine.logs.findLast(l => l.status === 'running')?.text ?? t('status.analyzing')).slice(0, 60)
    : engine.phase === 'planned'
      ? t('status.plan', { sells: engine.plan?.sells.length ?? 0, buys: engine.plan?.buys.length ?? 0 })
      : engine.phase === 'executing'
        ? t('status.executing')
        : engine.phase === 'done'
          ? t('status.done', { count: engine.orderResults.length })
          : isLoading
            ? t('status.loading')
            : t('status.ready');

  const marketReason = t(market.reasonKey as Parameters<typeof t>[0], market.reasonParams);

  const reloadAll = () => {
    portfolio.loadPortfolio();
    if (!agents.isLoadingAgents && agents.agents.length === 0) agents.loadAgents();
  };

  const tabLabel = (tab: AutoTraderTab) =>
    tab === 'history' && historyCount > 0
      ? `${t('tabs.history')} (${historyCount})`
      : t(`tabs.${tab}`);

  return (
    <div style={{ ...WINDOW_CONTAINER, padding: '6px 6px 0 6px', boxSizing: 'border-box' }}>
      <menu role="tablist">
        {TABS.map(tab => (
          <li key={tab} role="tab" aria-selected={activeTab === tab}>
            <a href={`#${tab}`} onClick={(e) => { e.preventDefault(); setActiveTab(tab); }}>{tabLabel(tab)}</a>
          </li>
        ))}
      </menu>

      <div className="window" role="tabpanel" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, marginTop: -1 }}>
        <div className="window-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, margin: 0, padding: 12, overflow: 'hidden' }}>

          {activeTab === 'portfolio' && (
            <PortfolioTab
              cashArs={portfolio.cashArs}
              comprometidoArs={portfolio.comprometidoArs}
              totalPortfolioArs={portfolio.totalPortfolioArs}
              effectiveMep={portfolio.effectiveMep}
              holdingTickers={portfolio.holdingTickers}
              holdings={portfolio.holdings}
              panelSymbols={portfolio.panelSymbols}
              companyNames={portfolio.companyNames}
              arsPrices={portfolio.arsPrices}
              portfolioError={portfolio.portfolioError}
              isLoadingPortfolio={portfolio.isLoadingPortfolio}
              market={market}
              onCompanyDetail={onCompanyDetail}
            />
          )}

          {activeTab === 'agents' && (
            <AgentsTab
              agents={agents.agents}
              selectedAgents={agents.selectedAgents}
              toggleAgent={agents.toggleAgent}
              selectAllAgents={agents.selectAllAgents}
              selectNoAgents={agents.selectNoAgents}
              isLoadingAgents={agents.isLoadingAgents}
              apiUrl={agents.apiUrl}
              disabled={isAnalyzing}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsTab
              dailyLimit={dailyLimit}
              setDailyLimit={setDailyLimit}
              effectiveMep={portfolio.effectiveMep}
              modelName={modelName}
              setModelName={setModelName}
              commissionRate={COMMISSION_RATE}
              disabled={isAnalyzing}
            />
          )}

          {activeTab === 'analysis' && (
            <AITab
              phase={engine.phase}
              logs={engine.logs}
              isAnalyzing={isAnalyzing}
              progress={engine.progress}
              analystSignals={engine.analystSignals}
              candidateDecisions={engine.candidateDecisions}
              arsPrices={portfolio.arsPrices}
              companyNames={portfolio.companyNames}
              onCompanyDetail={onCompanyDetail}
            />
          )}

          {activeTab === 'plan' && (
            <PlanTab
              plan={engine.plan}
              phase={engine.phase}
              dailyLimit={dailyLimit}
              cashArs={portfolio.cashArs}
              companyNames={portfolio.companyNames}
              orderResults={engine.orderResults}
              handleExecuteOrders={engine.handleExecuteOrders}
              setPhase={engine.setPhase}
              hasOrders={hasOrders}
            />
          )}

          {activeTab === 'history' && (
            <HistoryTab
              isAnalyzing={isAnalyzing}
              onRerun={(agentKeys) => {
                agents.setAgentsByKeys(agentKeys);
                setActiveTab('agents');
              }}
            />
          )}

        </div>
      </div>

      {/* Sheet-level buttons: outside the tab area, bottom right, disabled rather than hidden. */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 6, padding: '6px 0', flexShrink: 0 }}>
        <button
          className={analyzeIsDefault ? 'default' : undefined}
          onClick={() => engine.handleAnalyze(setActiveTab)}
          disabled={!canAnalyze}
        >
          {t('actions.analyze')}
        </button>
        <button onClick={engine.abortEngine} disabled={!isAnalyzing}>
          {t('actions.stop')}
        </button>
        <button onClick={reloadAll} disabled={isBusy || isLoading}>
          {t('actions.reload')}
        </button>
      </div>

      <div className="status-bar" style={STATUS_BAR_STYLE}>
        <p className="status-bar-field" style={{ ...FONT, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {statusText}
        </p>
        <p
          className="status-bar-field"
          style={{ ...FONT, flexGrow: 0, whiteSpace: 'nowrap' }}
          title={t('status.marketDetail', { reason: marketReason })}
        >
          {market.open ? t('status.marketOpen') : t('status.marketClosed')}
        </p>
      </div>
    </div>
  );
}
