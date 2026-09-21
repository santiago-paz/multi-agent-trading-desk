import React from 'react';
import { FONT, COLOR_POSITIVE, COLOR_NEGATIVE, COLOR_SECONDARY, COLOR_DISABLED } from '@/lib/theme/win98';
import { Phase, OrderResult } from '../types';
import { RebalancePlan } from '@/lib/trading/rebalance-engine';
import { OrderTable } from '../components/OrderTable';
import { fmtARS, fmtARS2 } from '../utils';
import { useAutoTraderT } from '@/lib/i18n';
import { ActionRow } from '../components/Page';

interface PlanTabProps {
  plan: RebalancePlan | null;
  phase: Phase;
  dailyLimit: number;
  cashArs: number;
  companyNames?: Record<string, string>;
  orderResults: OrderResult[];
  handleExecuteOrders: () => void;
  setPhase: (phase: Phase) => void;
  hasOrders: boolean;
}

export function PlanTab({
  plan,
  phase,
  dailyLimit,
  cashArs,
  companyNames,
  orderResults,
  handleExecuteOrders,
  setPhase,
  hasOrders
}: PlanTabProps) {
  const t = useAutoTraderT();
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, gap: 8 }}>
      <div className="win98-scrollbar" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {!plan && phase !== 'executing' && phase !== 'done' ? (
          <div style={{ ...FONT, padding: 16, textAlign: 'center', color: COLOR_SECONDARY }}>
            {t('plan.empty')}
          </div>
        ) : (
          <>
            {plan && (
              <fieldset style={{ margin: 0 }}>
                <legend>{t('plan.title')}</legend>
                <div>
                  {plan.sells.length > 0 && (
                    <>
                      <div style={{ ...FONT, fontWeight: 'bold', color: COLOR_NEGATIVE, margin: '4px 0 2px', flexShrink: 0 }}>
                        {t('plan.sells')}
                      </div>
                      <OrderTable orders={plan.sells} companyNames={companyNames} />
                      <div style={{
                        ...FONT, padding: '3px 6px', marginTop: 2,
                        background: '#f8f0f0', border: '1px solid #dfdfdf', flexShrink: 0,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{t('plan.grossVolume')}</span>
                          <strong>${fmtARS(plan.totalSellVolume)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: COLOR_SECONDARY }}>
                          <span>{t('plan.netAfterCommissions')}</span>
                          <span>${fmtARS(plan.estimatedSellProceeds)}</span>
                        </div>
                        <div style={{
                          display: 'flex', justifyContent: 'space-between',
                          marginTop: 2, paddingTop: 2,
                          borderTop: '1px solid #c0c0c0',
                          fontWeight: 'bold',
                        }}>
                          <span>{t('plan.balanceAfterSells')}</span>
                          <span>${fmtARS(cashArs + plan.estimatedSellProceeds)}</span>
                        </div>
                      </div>
                    </>
                  )}

                  {plan.buys.length > 0 && (
                    <>
                      <div style={{ ...FONT, fontWeight: 'bold', color: COLOR_POSITIVE, margin: '4px 0 2px', marginTop: plan.sells.length > 0 ? 8 : 4, flexShrink: 0 }}>
                        {t('plan.buys')}
                      </div>
                      <OrderTable orders={plan.buys} companyNames={companyNames} />
                      <div style={{
                        ...FONT, padding: '3px 6px', marginTop: 2,
                        background: '#f0f8f0', border: '1px solid #dfdfdf', flexShrink: 0,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>{t('plan.grossVolume')}</span>
                          <strong>${fmtARS(plan.totalBuyVolume)}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: COLOR_SECONDARY }}>
                          <span>{t('plan.totalCost')}</span>
                          <span>${fmtARS(plan.buys.reduce((s, o) => s + o.estimatedCostArs, 0))}</span>
                        </div>
                      </div>
                    </>
                  )}

                  {!hasOrders && (
                    <div style={{ ...FONT, color: COLOR_DISABLED, padding: '8px 0' }}>
                      {plan.warnings.length > 0
                        ? t('plan.noOrders.warnings')
                        : t('plan.noOrders.none')}
                    </div>
                  )}

                  {hasOrders && (() => {
                    const totalBuyCost = plan.buys.reduce((s, o) => s + o.estimatedCostArs, 0);
                    const finalCash = cashArs + plan.estimatedSellProceeds - totalBuyCost;
                    return (
                      <div style={{
                        ...FONT, marginTop: 6, padding: '4px 6px',
                        borderTop: '1px solid #808080', borderBottom: '1px solid #ffffff',
                        display: 'flex', flexDirection: 'column', gap: 1,
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: COLOR_SECONDARY }}>{t('plan.currentBalance')}</span>
                          <span>${fmtARS(cashArs)}</span>
                        </div>
                        {plan.sells.length > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: COLOR_POSITIVE }}>
                            <span>{t('plan.plusSells')}</span>
                            <span>+${fmtARS(plan.estimatedSellProceeds)}</span>
                          </div>
                        )}
                        {plan.buys.length > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: COLOR_NEGATIVE }}>
                            <span>{t('plan.minusBuys')}</span>
                            <span>−${fmtARS(totalBuyCost)}</span>
                          </div>
                        )}
                        <div style={{
                          display: 'flex', justifyContent: 'space-between',
                          fontWeight: 'bold', marginTop: 2, paddingTop: 2,
                          borderTop: '1px solid #808080',
                        }}>
                          <span>{t('plan.estimatedFinal')}</span>
                          <span>${fmtARS(finalCash)}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: COLOR_SECONDARY, marginTop: 2 }}>
                          <span>{t('plan.remainingLimit')}</span>
                          <span>${fmtARS(plan.remainingLimit)} / ${fmtARS(dailyLimit)}</span>
                        </div>
                      </div>
                    );
                  })()}

                  {plan.warnings.length > 0 && (
                    <div style={{ marginTop: 4 }}>
                      {plan.warnings.map((w, i) => {
                        const parts = w.split(': ');
                        return (
                          <div key={i} style={{ ...FONT, color: '#333', lineHeight: '18px', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                            <span style={{ marginTop: 1 }}>⚠️</span>
                            <span>
                              {parts.length > 1 ? (
                                <>
                                  <strong>{parts[0]}:</strong> {parts.slice(1).join(': ')}
                                </>
                              ) : (
                                w
                              )}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </fieldset>
            )}

            {phase === 'confirming' && plan && (
              <fieldset style={{ margin: '6px 0 0', border: '2px solid #000080' }}>
                <legend style={{ color: '#000080', fontWeight: 'bold' }}>{t('plan.confirm.title')}</legend>
                <div style={{ ...FONT, padding: '4px 0' }}>
                  {t('plan.confirm.description')}
                </div>
                <div className="sunken-panel" style={{ padding: 4, margin: '4px 0' }}>
                  {plan.sells.map(o => (
                    <div key={`sell-${o.ticker}`} style={{ ...FONT, color: COLOR_NEGATIVE }}>
                      {t('plan.confirm.sell')} {o.ticker}
                      {companyNames?.[o.ticker] && (
                        <span style={{ color: COLOR_SECONDARY }}> ({companyNames[o.ticker]})</span>
                      )}
                      {' '}x{o.quantity} @ ${fmtARS2(o.priceArs)}
                    </div>
                  ))}
                  {plan.buys.map(o => (
                    <div key={`buy-${o.ticker}`} style={{ ...FONT, color: COLOR_POSITIVE }}>
                      {t('plan.confirm.buy')} {o.ticker}
                      {companyNames?.[o.ticker] && (
                        <span style={{ color: COLOR_SECONDARY }}> ({companyNames[o.ticker]})</span>
                      )}
                      {' '}x{o.quantity} @ ${fmtARS2(o.priceArs)}
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 4, flexShrink: 0 }}>
                  <button onClick={handleExecuteOrders}>{t('plan.confirm.submit')}</button>
                  <button onClick={() => setPhase('planned')}>{t('plan.confirm.cancel')}</button>
                </div>
              </fieldset>
            )}

            {orderResults.length > 0 && (
              <fieldset style={{ margin: '6px 0 0' }}>
                <legend>{t('plan.results')}</legend>
                <div className="sunken-panel" style={{ padding: 4, margin: 0 }}>
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

      {phase === 'planned' && hasOrders && (
        <ActionRow>
          <button className="default" onClick={() => setPhase('confirming')}>
            {t('plan.execute')}
          </button>
        </ActionRow>
      )}
    </div>
  );
}
