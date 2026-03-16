import React, { useState } from 'react';
import {
  FONT, LABEL, COL_HEADER, COL_HEADER_RIGHT, CELL, CELL_RIGHT,
  WINDOW_CONTAINER, SCROLLABLE_BODY, STATUS_BAR_STYLE,
  COLOR_POSITIVE, COLOR_NEGATIVE,
} from '@/lib/theme/win98';
import { getAdvisorRecommendation, executeOrders } from '@/app/trading/actions';
import { AdvisorOutput } from '@/lib/agents/advisor';

export function AdvisorWindow() {
  const [strategy, setStrategy] = useState<'Conservadora' | 'Media' | 'Arriesgada'>('Media');
  const [isLoading, setIsLoading] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<AdvisorOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setSuccessMsg(null);

    try {
      const res = await getAdvisorRecommendation(strategy);
      if (res.success && res.data) {
        setResult(res.data);
      } else {
        setError(res.error || 'Error al obtener recomendación.');
      }
    } catch (err: any) {
      setError(err.message || 'Error desconocido.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!result || result.recommendations.length === 0) return;

    setIsExecuting(true);
    setError(null);

    try {
      const orders = result.recommendations.map(rec => ({
        simbolo: rec.simbolo,
        cantidad: rec.cantidad,
        precio: undefined,
        plazo: 't0' as const,
        tipo: 'market' as const,
        side: rec.tipo
      }));

      const res = await executeOrders(orders);
      if (res.success) {
        setSuccessMsg('¡Estrategia ejecutada con éxito!');
        setResult(null);
      } else {
        setError(res.error || 'Error al ejecutar las órdenes.');
      }
    } catch (err: any) {
      setError(err.message || 'Error desconocido durante la ejecución.');
    } finally {
      setIsExecuting(false);
    }
  };

  const recCount = result?.recommendations.length ?? 0;

  return (
    <div style={WINDOW_CONTAINER}>
      {/* ── Scrollable body ── */}
      <div className="win98-scrollbar" style={SCROLLABLE_BODY}>

        <fieldset style={{ marginBottom: '6px' }}>
          <legend>Asistente de Inversión IA</legend>

          <div className="field-row" style={{ marginBottom: '6px' }}>
            <label htmlFor="strategy-select" style={LABEL}>Estrategia:</label>
            <select
              id="strategy-select"
              value={strategy}
              onChange={(e) => setStrategy(e.target.value as any)}
              disabled={isLoading || isExecuting}
              style={{ ...FONT }}
            >
              <option value="Conservadora">Conservadora</option>
              <option value="Media">Moderada</option>
              <option value="Arriesgada">Arriesgada</option>
            </select>
          </div>

          <button onClick={handleAnalyze} disabled={isLoading || isExecuting}>
            {isLoading ? 'Analizando mercado...' : 'Analizar Portafolio'}
          </button>
        </fieldset>

        {error && (
          <p style={{ ...FONT, color: COLOR_NEGATIVE, margin: '0 0 6px' }}>
            <strong>Error:</strong> {error}
          </p>
        )}

        {successMsg && (
          <p style={{ ...FONT, color: COLOR_POSITIVE, fontWeight: 'bold', margin: '0 0 6px' }}>
            {successMsg}
          </p>
        )}

        {result && (
          <fieldset>
            <legend>Sugerencia del Asesor</legend>
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
              <strong>Portfolio Manager:</strong> {result.analysis}
            </p>

            <div className="sunken-panel" style={{ padding: 0, marginBottom: '6px' }}>
              <table style={{ ...FONT, width: '100%', borderCollapse: 'collapse', borderSpacing: 0 }}>
                <thead>
                  <tr>
                    <th style={COL_HEADER}>Activo</th>
                    <th style={{ ...COL_HEADER, textAlign: 'center' }}>Acción</th>
                    <th style={COL_HEADER_RIGHT}>Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {result.recommendations.map((rec, i) => (
                    <tr
                      key={i}
                      style={{
                        backgroundColor: i % 2 === 0 ? '#ffffff' : '#f0f0f0',
                        borderBottom: '1px solid #c0c0c0',
                        cursor: 'default',
                      }}
                    >
                      <td style={{ ...CELL, fontWeight: 'bold' }}>{rec.simbolo}</td>
                      <td style={{ ...CELL, textAlign: 'center', color: rec.tipo === 'buy' ? COLOR_POSITIVE : COLOR_NEGATIVE }}>
                        {rec.tipo === 'buy' ? 'COMPRAR' : 'VENDER'}
                      </td>
                      <td style={{ ...CELL_RIGHT, borderRight: 'none' }}>{rec.cantidad}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button onClick={handleExecute} disabled={isExecuting} style={{ fontWeight: 'bold' }}>
              {isExecuting ? 'Ejecutando...' : '¡Ejecutar Estrategia!'}
            </button>
          </fieldset>
        )}
      </div>

      {/* ── Status Bar ── */}
      <div className="status-bar" style={STATUS_BAR_STYLE}>
        <p className="status-bar-field">
          {isLoading ? 'Analizando...' : isExecuting ? 'Ejecutando...' : recCount > 0 ? `${recCount} recomendación${recCount !== 1 ? 'es' : ''}` : 'Listo'}
        </p>
        <p className="status-bar-field">Estrategia: {strategy}</p>
      </div>
    </div>
  );
}
