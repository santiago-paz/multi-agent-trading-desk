import React from 'react';
import { FONT, COLOR_POSITIVE, COLOR_NEGATIVE, COLOR_SECONDARY, COLOR_DISABLED } from '@/lib/theme/win98';
import { Phase, OrderResult } from '../types';
import { RebalancePlan } from '@/lib/trading/rebalance-engine';
import { OrderTable } from '../components/OrderTable';
import { fmtARS, fmtARS2 } from '../utils';

interface PlanTabProps {
  plan: RebalancePlan | null;
  phase: Phase;
  dailyLimit: number;
  orderResults: OrderResult[];
  handleExecuteOrders: () => void;
  setPhase: (phase: Phase) => void;
  hasOrders: boolean;
}

export function PlanTab({
  plan,
  phase,
  dailyLimit,
  orderResults,
  handleExecuteOrders,
  setPhase,
  hasOrders
}: PlanTabProps) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, gap: 8 }}>
      <div className="win98-scrollbar" style={{ flex: 1, padding: 2, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {!plan && phase !== 'executing' && phase !== 'done' ? (
          <div style={{ ...FONT, padding: 16, textAlign: 'center', color: COLOR_SECONDARY }}>
            El plan de trading se generará una vez que se complete el análisis AI.
          </div>
        ) : (
          <>
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
                      {plan.warnings.length > 0
                        ? 'Las recomendaciones del AI no se pueden ejecutar (ver advertencias).'
                        : 'El AI no recomendó operaciones hoy.'}
                    </div>
                  )}
                </div>

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

      {phase === 'planned' && hasOrders && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', flexShrink: 0, paddingTop: 6, borderTop: '1px solid #dfdfdf' }}>
          <button className="default" onClick={() => setPhase('confirming')}>
            Ejecutar Órdenes
          </button>
        </div>
      )}
    </div>
  );
}
