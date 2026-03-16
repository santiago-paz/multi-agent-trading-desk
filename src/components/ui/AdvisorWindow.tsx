import React, { useState } from 'react';
import {
  FONT, COL_HEADER, COL_HEADER_RIGHT, CELL, CELL_RIGHT,
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

  return (
    <div style={{ ...FONT, padding: '8px', display: 'flex', flexDirection: 'column', gap: '12px', height: '100%', overflowY: 'auto', background: '#c0c0c0' }}>
      
      <fieldset style={{ margin: 0, padding: '8px' }}>
        <legend>Asistente de Inversión IA</legend>
        
        <div className="field-row" style={{ marginBottom: '8px' }}>
          <label htmlFor="strategy-select" style={{ width: '80px' }}>Estrategia:</label>
          <select 
            id="strategy-select"
            value={strategy} 
            onChange={(e) => setStrategy(e.target.value as any)}
            disabled={isLoading || isExecuting}
            style={{ width: '150px' }}
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
        <div style={{ color: COLOR_NEGATIVE, marginTop: '8px' }}>
          <strong>Error: </strong> {error}
        </div>
      )}

      {successMsg && (
        <div style={{ color: COLOR_POSITIVE, marginTop: '8px', fontWeight: 'bold' }}>
          {successMsg}
        </div>
      )}
      
      {result && (
        <fieldset style={{ margin: 0, padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <legend>Sugerencia del Asesor</legend>
          {result.technical_analysis && <p style={{ margin: '0 0 4px', fontSize: '11px' }}><strong>Técnico:</strong> {result.technical_analysis}</p>}
          {result.sentiment_analysis && <p style={{ margin: '0 0 4px', fontSize: '11px' }}><strong>Sentimiento:</strong> {result.sentiment_analysis}</p>}
          <p style={{ margin: '0 0 8px', fontSize: '11px' }}><strong>Portfolio Manager:</strong> {result.analysis}</p>
          
          <div className="sunken-panel" style={{ padding: 0 }}>
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
          
          <button 
             onClick={handleExecute} 
             disabled={isExecuting}
             style={{ marginTop: '12px', fontWeight: 'bold', height: '32px' }}
          >
            {isExecuting ? 'Ejecutando...' : '¡Ejecutar Estrategia!'}
          </button>
        </fieldset>
      )}
    </div>
  );
}
