import React, { useState, useRef, useEffect } from 'react';
import {
  FONT, LABEL, COL_HEADER, COL_HEADER_RIGHT, CELL, CELL_RIGHT,
  WINDOW_CONTAINER, SCROLLABLE_BODY, STATUS_BAR_STYLE, HR98,
  COLOR_POSITIVE, COLOR_NEGATIVE, COLOR_SECONDARY, COLOR_DISABLED,
} from '@/lib/theme/win98';
import {
  getAdvisorStep_Cash,
  getAdvisorStep_Candidates,
  getAdvisorStep_AssetData,
  getAdvisorStep_Recommend,
  executeOrders,
} from '@/app/trading/actions';
import { AdvisorOutput } from '@/lib/agents/advisor';
import { ComprehensiveAssetData } from '@/lib/market-data';

// ─── Types ────────────────────────────────────────────────────────────────────

type LogStatus = 'running' | 'ok' | 'error';

interface LogEntry {
  id: string;
  text: string;
  status: LogStatus;
}

interface CandidateRow {
  symbol: string;
  type: 'CEDEAR' | 'Bono' | null;
  price: number;
  rsi: number | null;
  newsCount: number;
  status: 'loading' | 'done' | 'error';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtARS = (n: number) => n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function LogIcon({ status }: { status: LogStatus }) {
  if (status === 'running') return <span style={{ color: COLOR_SECONDARY }}>►</span>;
  if (status === 'ok')      return <span style={{ color: COLOR_POSITIVE }}>■</span>;
  return                           <span style={{ color: COLOR_NEGATIVE }}>✕</span>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AdvisorWindow() {
  const [strategy, setStrategy] = useState<'Conservadora' | 'Media' | 'Arriesgada'>('Media');

  // Cash override
  const [cashOverride, setCashOverride] = useState<string>('');
  const [useRealCash, setUseRealCash] = useState(true);

  // Analysis state
  const [phase, setPhase] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [progress, setProgress] = useState(0);
  const [cash, setCash] = useState<number | null>(null);
  const [candidates, setCandidates] = useState<CandidateRow[]>([]);
  const [enrichedAssets, setEnrichedAssets] = useState<ComprehensiveAssetData[]>([]);
  const [result, setResult] = useState<AdvisorOutput | null>(null);

  // Execute state
  const [isExecuting, setIsExecuting] = useState(false);
  const [execMsg, setExecMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const logBodyRef = useRef<HTMLDivElement>(null);

  // Auto-scroll log to bottom
  useEffect(() => {
    if (logBodyRef.current) {
      logBodyRef.current.scrollTop = logBodyRef.current.scrollHeight;
    }
  }, [logs]);

  // ── Log helpers ──────────────────────────────────────────────────────────────

  function addLog(id: string, text: string, status: LogStatus = 'running') {
    setLogs(prev => [...prev, { id, text, status }]);
  }

  function updateLog(id: string, text: string, status: LogStatus) {
    setLogs(prev => prev.map(l => l.id === id ? { ...l, text, status } : l));
  }

  // ── Main analysis flow ───────────────────────────────────────────────────────

  async function handleAnalyze() {
    setPhase('running');
    setLogs([]);
    setProgress(0);
    setCash(null);
    setCandidates([]);
    setEnrichedAssets([]);
    setResult(null);
    setExecMsg(null);

    const enrichedAssets: ComprehensiveAssetData[] = [];

    try {
      // ── Step 1: Cash ─────────────────────────────────────────────────────────
      let availableCash: number;
      const overrideValue = !useRealCash && cashOverride ? parseFloat(cashOverride) : NaN;

      if (!isNaN(overrideValue) && overrideValue > 0) {
        addLog('cash', 'Usando saldo manual de prueba...', 'running');
        availableCash = overrideValue;
        updateLog('cash', `Saldo manual: $${fmtARS(availableCash)} ARS (prueba)`, 'ok');
      } else {
        addLog('cash', 'Consultando saldo disponible...', 'running');
        const cashRes = await getAdvisorStep_Cash();
        if (!cashRes.success) throw new Error(cashRes.error);
        availableCash = cashRes.cash;
        updateLog('cash', `Saldo disponible: $${fmtARS(availableCash)} ARS`, 'ok');
      }
      setCash(availableCash);
      setProgress(10);

      // ── Step 2: Candidates ───────────────────────────────────────────────────
      addLog('cand', 'Cargando panel de instrumentos...', 'running');
      const candRes = await getAdvisorStep_Candidates(availableCash);
      if (!candRes.success) throw new Error(candRes.error);
      const { symbols, totalInstruments, priceMap, typeMap } = candRes;
      updateLog(
        'cand',
        `Panel cargado (${totalInstruments} instrumentos) — ${symbols.length} candidatos seleccionados: ${symbols.join(', ')}`,
        'ok',
      );
      setProgress(20);

      // Seed the candidate table with loading rows
      setCandidates(symbols.map(sym => ({ symbol: sym, type: typeMap?.[sym] ?? null, price: 0, rsi: null, newsCount: 0, status: 'loading' })));

      // ── Step 3: Asset data per symbol (parallel batches of 3) ─────────────────
      const perSymbolStep = 60 / symbols.length;
      const BATCH_SIZE = 3;

      for (let batchStart = 0; batchStart < symbols.length; batchStart += BATCH_SIZE) {
        const batch = symbols.slice(batchStart, batchStart + BATCH_SIZE);

        // Add loading logs for the batch
        for (const sym of batch) {
          addLog(`sym-${sym}`, `Analizando ${sym}...`, 'running');
        }

        // Fetch all symbols in this batch in parallel
        const batchResults = await Promise.all(
          batch.map(sym => getAdvisorStep_AssetData(sym, priceMap?.[sym], typeMap?.[sym]).then(res => ({ sym, res })))
        );

        // Process results
        for (const { sym, res: dataRes } of batchResults) {
          if (dataRes.success && dataRes.data) {
            const d = dataRes.data;
            enrichedAssets.push(d);
            setCandidates(prev => prev.map(c =>
              c.symbol === sym
                ? { ...c, price: d.currentPrice, rsi: d.technicals.rsi14, newsCount: d.recentNews.length, status: 'done' }
                : c,
            ));
            const newsHeadlines = d.recentNews.map(n => n.title).join(' · ');
            updateLog(
              `sym-${sym}`,
              `${sym} — $${d.currentPrice.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ARS | RSI: ${d.technicals.rsi14?.toFixed(1) ?? 'N/A'} | ${d.recentNews.length} noticias${newsHeadlines ? `: ${newsHeadlines.slice(0, 80)}…` : ''}`,
              'ok',
            );
          } else {
            setCandidates(prev => prev.map(c => c.symbol === sym ? { ...c, status: 'error' } : c));
            updateLog(`sym-${sym}`, `${sym} — error al obtener datos`, 'error');
          }
        }

        setProgress(20 + Math.round(Math.min(batchStart + BATCH_SIZE, symbols.length) * perSymbolStep));
      }

      // Save enriched data for the news panel
      setEnrichedAssets([...enrichedAssets]);

      // ── Step 4: Final recommendation ─────────────────────────────────────────
      addLog('rec', 'Generando recomendación final...', 'running');
      const recRes = await getAdvisorStep_Recommend(availableCash, enrichedAssets, strategy);
      if (!recRes.success) throw new Error(recRes.error);
      setResult(recRes.data);
      updateLog('rec', 'Recomendación generada', 'ok');
      setProgress(100);
      setPhase('done');

    } catch (err: any) {
      addLog('err', `Error: ${err.message}`, 'error');
      setPhase('error');
    }
  }

  // ── Execute orders ───────────────────────────────────────────────────────────

  async function handleExecute() {
    if (!result || result.recommendations.length === 0) return;
    setIsExecuting(true);
    setExecMsg(null);

    try {
      const orders = result.recommendations.map(rec => ({
        simbolo: rec.simbolo,
        cantidad: rec.cantidad,
        precio: undefined,
        plazo: 't0' as const,
        tipo: 'market' as const,
        side: rec.tipo,
      }));
      const res = await executeOrders(orders);
      if (res.success) {
        setExecMsg({ text: '¡Estrategia ejecutada con éxito!', ok: true });
        setResult(null);
        setPhase('idle');
      } else {
        setExecMsg({ text: res.error || 'Error al ejecutar las órdenes.', ok: false });
      }
    } catch (err: any) {
      setExecMsg({ text: err.message || 'Error desconocido.', ok: false });
    } finally {
      setIsExecuting(false);
    }
  }

  // ── Derived values ───────────────────────────────────────────────────────────

  const isRunning = phase === 'running';
  const recCount = result?.recommendations.length ?? 0;
  const currentStep = logs.findLast(l => l.status === 'running')?.text ?? '';

  const statusText = isRunning
    ? currentStep.slice(0, 60)
    : isExecuting
      ? 'Ejecutando órdenes...'
      : phase === 'done'
        ? `${recCount} recomendación${recCount !== 1 ? 'es' : ''}`
        : 'Listo';

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={WINDOW_CONTAINER}>
      <div className="win98-scrollbar" style={SCROLLABLE_BODY}>

        {/* ── Controls ─────────────────────────────────────────────────────── */}
        <fieldset style={{ marginBottom: '6px' }}>
          <legend>Asistente de inversión IA</legend>

          <div className="field-row" style={{ marginBottom: '6px' }}>
            <label htmlFor="strategy-select" style={LABEL}>Estrategia:</label>
            <select
              id="strategy-select"
              value={strategy}
              onChange={e => setStrategy(e.target.value as any)}
              disabled={isRunning || isExecuting}
              style={FONT}
            >
              <option value="Conservadora">Conservadora</option>
              <option value="Media">Moderada</option>
              <option value="Arriesgada">Arriesgada</option>
            </select>
          </div>

          <div className="field-row" style={{ marginBottom: '6px', alignItems: 'center' }}>
            <label htmlFor="cash-override" style={LABEL}>Saldo (ARS):</label>
            <input
              id="cash-override"
              type="text"
              placeholder="ej: 1000000"
              value={useRealCash ? '' : cashOverride}
              onChange={e => { setCashOverride(e.target.value); setUseRealCash(false); }}
              disabled={isRunning || isExecuting || useRealCash}
              style={{ ...FONT, width: '110px' }}
            />
            <button
              onClick={() => { setUseRealCash(!useRealCash); if (!useRealCash) setCashOverride(''); }}
              disabled={isRunning || isExecuting}
              style={{ ...FONT, marginLeft: '4px', whiteSpace: 'nowrap' }}
            >
              {useRealCash ? '✓ Saldo real' : 'Usar saldo real'}
            </button>
          </div>

          <button
            className={phase === 'idle' ? 'default' : undefined}
            onClick={handleAnalyze}
            disabled={isRunning || isExecuting}
          >
            {isRunning ? 'Analizando...' : 'Analizar portafolio'}
          </button>
        </fieldset>

        {/* ── Progress panel (visible while running or after) ───────────────── */}
        {(isRunning || phase === 'done' || phase === 'error') && (
          <fieldset style={{ marginBottom: '6px' }}>
            <legend>Progreso del análisis</legend>

            {/* Progress bar */}
            <div className="progress-indicator segmented" style={{ marginBottom: '6px' }}>
              <span className="progress-indicator-bar" style={{ width: `${progress}%` }} />
            </div>

            {/* Log entries */}
            <div
              ref={logBodyRef}
              className="sunken-panel win98-scrollbar"
              style={{ maxHeight: '100px', overflowY: 'auto', padding: '3px 5px' }}
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

            {/* Candidate table (fills in as data arrives) */}
            {candidates.length > 0 && (
              <>
                <hr style={{ ...HR98, marginTop: '6px' }} />
                <div className="sunken-panel" style={{ padding: 0, marginTop: '4px' }}>
                  <table style={{ ...FONT, width: '100%', borderCollapse: 'collapse', borderSpacing: 0 }}>
                    <thead>
                      <tr>
                        <th style={COL_HEADER}>Activo</th>
                        <th style={COL_HEADER}>Tipo</th>
                        <th style={COL_HEADER_RIGHT}>Precio (ARS)</th>
                        <th style={COL_HEADER_RIGHT}>RSI</th>
                        <th style={COL_HEADER_RIGHT}>Noticias</th>
                      </tr>
                    </thead>
                    <tbody>
                      {candidates.map((c, i) => (
                        <tr
                          key={c.symbol}
                          style={{
                            background: i % 2 === 0 ? '#ffffff' : '#f0f0f0',
                            borderBottom: '1px solid #c0c0c0',
                            cursor: 'default',
                          }}
                        >
                          <td style={{ ...CELL, fontWeight: 'bold' }}>{c.symbol}</td>
                          <td style={{ ...CELL, color: c.type === 'CEDEAR' ? COLOR_POSITIVE : c.type === 'Bono' ? COLOR_SECONDARY : COLOR_DISABLED }}>
                            {c.type ?? '…'}
                          </td>
                          <td style={{ ...CELL_RIGHT }}>
                            {c.status === 'loading'
                              ? <span style={{ color: COLOR_DISABLED }}>…</span>
                              : c.status === 'error'
                                ? <span style={{ color: COLOR_NEGATIVE }}>Error</span>
                                : `$${c.price.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            }
                          </td>
                          <td style={{ ...CELL_RIGHT }}>
                            {c.status === 'loading'
                              ? <span style={{ color: COLOR_DISABLED }}>…</span>
                              : c.rsi != null
                                ? <span style={{ color: c.rsi > 70 ? COLOR_NEGATIVE : c.rsi < 30 ? COLOR_POSITIVE : 'inherit' }}>
                                    {c.rsi.toFixed(1)}
                                  </span>
                                : 'N/A'
                            }
                          </td>
                          <td style={{ ...CELL_RIGHT, borderRight: 'none' }}>
                            {c.status === 'loading'
                              ? <span style={{ color: COLOR_DISABLED }}>…</span>
                              : c.newsCount
                            }
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </fieldset>
        )}

        {/* ── News collected per symbol ─────────────────────────────────────── */}
        {enrichedAssets.some(a => a.recentNews.length > 0) && (
          <fieldset style={{ marginBottom: '6px' }}>
            <legend>Noticias recopiladas</legend>
            <ul className="tree-view" style={{ margin: 0 }}>
              {enrichedAssets.filter(a => a.recentNews.length > 0).map(asset => (
                <li key={asset.symbol}>
                  <details>
                    <summary style={FONT}>{asset.symbol} ({asset.recentNews.length})</summary>
                    <ul>
                      {asset.recentNews.map((news, ni) => (
                        <li key={ni}>
                          <details>
                            <summary style={FONT}>{news.title}</summary>
                            <div
                              className="sunken-panel"
                              style={{ ...FONT, padding: '4px 6px', margin: '2px 0 4px', color: COLOR_SECONDARY }}
                            >
                              {news.summary || news.fullContent?.slice(0, 300) || 'Sin contenido disponible.'}
                              {news.publisher && (
                                <span style={{ display: 'block', marginTop: '2px', color: COLOR_DISABLED }}>
                                  — {news.publisher}
                                </span>
                              )}
                            </div>
                          </details>
                        </li>
                      ))}
                    </ul>
                  </details>
                </li>
              ))}
            </ul>
          </fieldset>
        )}

        {/* ── Exec feedback ─────────────────────────────────────────────────── */}
        {execMsg && (
          <p style={{ ...FONT, color: execMsg.ok ? COLOR_POSITIVE : COLOR_NEGATIVE, margin: '0 0 6px', fontWeight: 'bold' }}>
            {execMsg.text}
          </p>
        )}

        {/* ── Recommendation results ────────────────────────────────────────── */}
        {result && (
          <fieldset>
            <legend>Sugerencia del asesor</legend>

            {result.technical_analysis && (
              <p style={{ ...FONT, margin: '0 0 4px' }}>
                <strong>Técnico:</strong> {result.technical_analysis}
              </p>
            )}
            {result.sentiment_analysis && (
              <p style={{ ...FONT, margin: '0 0 4px' }}>
                <strong>Sentimiento:</strong> {result.sentiment_analysis}
              </p>
            )}
            <p style={{ ...FONT, margin: '0 0 6px' }}>
              <strong>Portfolio manager:</strong> {result.analysis}
            </p>

            <div className="sunken-panel" style={{ padding: 0, marginBottom: '6px' }}>
              <table style={{ ...FONT, width: '100%', borderCollapse: 'collapse', borderSpacing: 0 }}>
                <thead>
                  <tr>
                    <th style={COL_HEADER}>Activo</th>
                    <th style={{ ...COL_HEADER, textAlign: 'center' }}>Acción</th>
                    <th style={COL_HEADER_RIGHT}>Cantidad</th>
                    <th style={COL_HEADER_RIGHT}>Precio (ARS)</th>
                    <th style={COL_HEADER_RIGHT}>Costo Total</th>
                  </tr>
                </thead>
                <tbody>
                  {result.recommendations.map((rec, i) => {
                    const price = result.precios?.[rec.simbolo] ?? 0;
                    const cost = rec.cantidad * price;
                    return (
                      <tr
                        key={i}
                        style={{
                          background: i % 2 === 0 ? '#ffffff' : '#f0f0f0',
                          borderBottom: '1px solid #c0c0c0',
                          cursor: 'default',
                        }}
                      >
                        <td style={{ ...CELL, fontWeight: 'bold' }}>{rec.simbolo}</td>
                        <td style={{ ...CELL, textAlign: 'center', color: rec.tipo === 'buy' ? COLOR_POSITIVE : COLOR_NEGATIVE }}>
                          {rec.tipo === 'buy' ? 'COMPRAR' : 'VENDER'}
                        </td>
                        <td style={CELL_RIGHT}>{rec.cantidad}</td>
                        <td style={CELL_RIGHT}>${fmtARS(price)}</td>
                        <td style={{ ...CELL_RIGHT, borderRight: 'none' }}>${fmtARS(cost)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ borderTop: '2px solid #808080' }}>
                    <td colSpan={4} style={{ ...CELL, fontWeight: 'bold', textAlign: 'right' }}>Total:</td>
                    <td style={{ ...CELL_RIGHT, fontWeight: 'bold', borderRight: 'none' }}>
                      ${fmtARS(result.recommendations.reduce((sum, rec) => sum + rec.cantidad * (result.precios?.[rec.simbolo] ?? 0), 0))}
                    </td>
                  </tr>
                  {cash != null && (
                    <tr>
                      <td colSpan={4} style={{ ...CELL, textAlign: 'right', color: COLOR_SECONDARY }}>Saldo restante:</td>
                      <td style={{ ...CELL_RIGHT, color: COLOR_SECONDARY, borderRight: 'none' }}>
                        ${fmtARS(cash - result.recommendations.reduce((sum, rec) => sum + rec.cantidad * (result.precios?.[rec.simbolo] ?? 0), 0))}
                      </td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>

            <button
              className="default"
              onClick={handleExecute}
              disabled={isExecuting}
              style={{ fontWeight: 'bold' }}
            >
              {isExecuting ? 'Ejecutando...' : '¡Ejecutar estrategia!'}
            </button>
          </fieldset>
        )}

      </div>

      {/* ── Status bar ────────────────────────────────────────────────────────── */}
      <div className="status-bar" style={STATUS_BAR_STYLE}>
        <p className="status-bar-field" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {statusText}
        </p>
        <p className="status-bar-field" style={{ flexShrink: 0 }}>
          {cash != null ? `$${cash.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ARS` : strategy}
        </p>
      </div>
    </div>
  );
}
