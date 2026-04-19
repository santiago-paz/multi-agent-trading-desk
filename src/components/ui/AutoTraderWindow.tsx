'use client';

import React, { useState } from 'react';
import { FONT, WINDOW_CONTAINER, STATUS_BAR_STYLE } from '@/lib/theme/win98';
import { usePortfolio } from './auto-trader/hooks/usePortfolio';
import { useAgents } from './auto-trader/hooks/useAgents';
import { useTradingEngine } from './auto-trader/hooks/useTradingEngine';
import { ConfigTab } from './auto-trader/tabs/ConfigTab';
import { AITab } from './auto-trader/tabs/AITab';
import { PlanTab } from './auto-trader/tabs/PlanTab';
import { HistoryTab } from './auto-trader/tabs/HistoryTab';
import { COMMISSION_RATE } from '@/lib/trading/quick-trade';
import { DEFAULT_MODEL, type AIModelId } from './auto-trader/market-hours';
import { useAutoTraderT } from '@/lib/i18n';

export function AutoTraderWindow() {
  const [activeTab, setActiveTab] = useState<'config' | 'ai' | 'plan' | 'history'>('config');
  const [dailyLimit, setDailyLimit] = useState(100000);
  const [modelName, setModelName] = useState<AIModelId>(DEFAULT_MODEL);

  const t = useAutoTraderT();
  const portfolio = usePortfolio();
  const agents = useAgents();

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
    panelSymbols: portfolio.panelSymbols,
    selectedAgents: agents.selectedAgents,
    modelName,
  });

  const isLoading = portfolio.isLoadingPortfolio || agents.isLoadingAgents;
  const isAnalyzing = engine.phase === 'analyzing';
  const hasOrders = engine.plan && (engine.plan.sells.length > 0 || engine.plan.buys.length > 0);

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

  return (
    <div style={{ ...WINDOW_CONTAINER, padding: '6px 6px 0 6px', boxSizing: 'border-box' }}>
      <menu role="tablist">
        <li role="tab" aria-selected={activeTab === 'config'}>
          <a href="#config" onClick={(e) => { e.preventDefault(); setActiveTab('config'); }}>{t('tabs.config')}</a>
        </li>
        <li role="tab" aria-selected={activeTab === 'ai'}>
          <a href="#ai" onClick={(e) => { e.preventDefault(); setActiveTab('ai'); }}>{t('tabs.ai')}</a>
        </li>
        <li role="tab" aria-selected={activeTab === 'plan'}>
          <a href="#plan" onClick={(e) => { e.preventDefault(); setActiveTab('plan'); }}>{t('tabs.plan')}</a>
        </li>
        <li role="tab" aria-selected={activeTab === 'history'}>
          <a href="#history" onClick={(e) => { e.preventDefault(); setActiveTab('history'); }}>{t('tabs.history')}</a>
        </li>
      </menu>

      <div className="window" role="tabpanel" style={{ flex: 1, display: 'flex', flexDirection: 'column', marginBottom: 12, minHeight: 0, marginTop: '-1px' }}>
        <div className="window-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, overflow: 'hidden', minHeight: 0, margin: 0 }}>

          {activeTab === 'config' && (
            <ConfigTab
              cashArs={portfolio.cashArs}
              comprometidoArs={portfolio.comprometidoArs}
              totalPortfolioArs={portfolio.totalPortfolioArs}
              effectiveMep={portfolio.effectiveMep}
              dailyLimit={dailyLimit}
              setDailyLimit={setDailyLimit}
              modelName={modelName}
              setModelName={setModelName}
              holdingTickers={portfolio.holdingTickers}
              holdings={portfolio.holdings}
              arsPrices={portfolio.arsPrices}
              portfolioError={portfolio.portfolioError}
              isLoadingPortfolio={portfolio.isLoadingPortfolio}
              commissionRate={COMMISSION_RATE}
              agents={agents.agents}
              selectedAgents={agents.selectedAgents}
              toggleAgent={agents.toggleAgent}
              selectAllAgents={agents.selectAllAgents}
              selectNoAgents={agents.selectNoAgents}
              isLoadingAgents={agents.isLoadingAgents}
              apiUrl={agents.apiUrl}
              isAnalyzing={isAnalyzing}
              loadPortfolio={portfolio.loadPortfolio}
              handleAnalyze={() => engine.handleAnalyze(setActiveTab)}
              fmpTickers={portfolio.fmpTickers}
              abortEngine={engine.abortEngine}
            />
          )}

          {activeTab === 'ai' && (
            <AITab
              phase={engine.phase}
              logs={engine.logs}
              isAnalyzing={isAnalyzing}
              progress={engine.progress}
              analystSignals={engine.analystSignals}
              candidateDecisions={engine.candidateDecisions}
              arsPrices={portfolio.arsPrices}
            />
          )}

          {activeTab === 'history' && (
            <HistoryTab
              isAnalyzing={isAnalyzing}
              onRerun={(agentKeys) => {
                agents.setAgentsByKeys(agentKeys);
                setActiveTab('config');
              }}
            />
          )}

          {activeTab === 'plan' && (
            <PlanTab
              plan={engine.plan}
              phase={engine.phase}
              dailyLimit={dailyLimit}
              cashArs={portfolio.cashArs}
              orderResults={engine.orderResults}
              handleExecuteOrders={engine.handleExecuteOrders}
              setPhase={engine.setPhase}
              hasOrders={!!hasOrders}
            />
          )}

        </div>
      </div>

      <div className="status-bar" style={STATUS_BAR_STYLE}>
        <div className="status-bar-field" style={FONT}>{statusText}</div>
      </div>
    </div>
  );
}
