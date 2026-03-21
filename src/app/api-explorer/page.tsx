'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { FONT } from '@/lib/theme/win98';
import {
  callGetPortfolio,
  callGetQuote,
  callGetPanelQuotes,
  callGetOperations,
  callGetEstadoCuenta,
  callGetDatosPerfil,
  callGetHistoricalSeries,
  callGetMEP,
  type ApiResult,
} from './actions';
import { fetchApiLogs, clearAllApiLogs } from './log-actions';
import type { ApiLogEntry } from '@/lib/api-logger';

/* ─── Endpoint registry ───────────────────────────────────────────────── */

interface ParamDef {
  name: string;
  label: string;
  type: 'string' | 'number' | 'select';
  default?: string;
  options?: string[];
}

interface EndpointDef {
  id: string;
  label: string;
  category: 'Account' | 'Quotes' | 'Trading' | 'Historical';
  apiPath: string;
  params: ParamDef[];
  call: (params: Record<string, string>) => Promise<ApiResult>;
}

const ENDPOINTS: EndpointDef[] = [
  {
    id: 'portfolio',
    label: 'getPortfolio',
    category: 'Account',
    apiPath: '/api/v2/portafolio/argentina',
    params: [],
    call: () => callGetPortfolio(),
  },
  {
    id: 'estado-cuenta',
    label: 'getEstadoCuenta',
    category: 'Account',
    apiPath: '/api/v2/estadocuenta',
    params: [],
    call: () => callGetEstadoCuenta(),
  },
  {
    id: 'perfil',
    label: 'getDatosPerfil',
    category: 'Account',
    apiPath: '/api/v2/datos-perfil',
    params: [],
    call: () => callGetDatosPerfil(),
  },
  {
    id: 'operations',
    label: 'getOperations',
    category: 'Account',
    apiPath: '/api/v2/operaciones',
    params: [
      { name: 'days', label: 'Days', type: 'number', default: '30' },
    ],
    call: (p) => callGetOperations(Number(p.days) || 30),
  },
  {
    id: 'quote',
    label: 'getQuote',
    category: 'Quotes',
    apiPath: '/api/v2/{market}/Titulos/{symbol}/Cotizacion',
    params: [
      { name: 'symbol', label: 'Symbol', type: 'string', default: 'AAPL' },
      { name: 'market', label: 'Market', type: 'string', default: 'bcba' },
    ],
    call: (p) => callGetQuote(p.symbol || 'AAPL', p.market || 'bcba'),
  },
  {
    id: 'panel-quotes',
    label: 'getPanelQuotes',
    category: 'Quotes',
    apiPath: '/api/v2/Cotizaciones/{instrumento}/{pais}/Todos',
    params: [
      { name: 'instrumento', label: 'Instrumento', type: 'select', default: 'cedears', options: ['cedears', 'titulosPublicos', 'letras', 'obligacionesNegociables'] },
      { name: 'pais', label: 'Pais', type: 'string', default: 'argentina' },
    ],
    call: (p) => callGetPanelQuotes(p.instrumento || 'cedears', p.pais || 'argentina'),
  },
  {
    id: 'mep',
    label: 'getMEP',
    category: 'Quotes',
    apiPath: '/api/v2/Cotizaciones/MEP/AL30',
    params: [],
    call: () => callGetMEP(),
  },
  {
    id: 'historical',
    label: 'getHistoricalSeries',
    category: 'Historical',
    apiPath: '/api/v2/{market}/Titulos/{symbol}/Cotizacion/seriehistorica/...',
    params: [
      { name: 'symbol', label: 'Symbol', type: 'string', default: 'AAPL' },
      { name: 'days', label: 'Days', type: 'number', default: '60' },
      { name: 'market', label: 'Market', type: 'string', default: 'BCBA' },
    ],
    call: (p) => callGetHistoricalSeries(p.symbol || 'AAPL', Number(p.days) || 60, p.market || 'BCBA'),
  },
];

const CATEGORIES = ['Account', 'Quotes', 'Historical'] as const;

/* ─── JSON Syntax Highlighter ─────────────────────────────────────────── */

function highlightJson(json: string): React.ReactNode[] {
  return json.split('\n').map((line, i) => {
    const colored = line
      .replace(/"([^"]+)":/g, '<span style="color:#000080">"$1"</span>:')
      .replace(/: "(.*?)"/g, ': <span style="color:#008000">"$1"</span>')
      .replace(/: (\d+\.?\d*)/g, ': <span style="color:#800000">$1</span>')
      .replace(/: (null)/g, ': <span style="color:#808080">$1</span>')
      .replace(/: (true|false)/g, ': <span style="color:#000080">$1</span>');
    return <div key={i} dangerouslySetInnerHTML={{ __html: colored }} />;
  });
}

/* ─── Tabs ─────────────────────────────────────────────────────────────── */

type Tab = 'explorer' | 'logs';

/* ─── Page component ──────────────────────────────────────────────────── */

export default function ApiExplorerPage() {
  const [tab, setTab] = useState<Tab>('explorer');

  // Explorer state
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointDef>(ENDPOINTS[0]);
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ApiResult | null>(null);
  const [loading, setLoading] = useState(false);

  // Logs state
  const [logs, setLogs] = useState<ApiLogEntry[]>([]);
  const [selectedLog, setSelectedLog] = useState<ApiLogEntry | null>(null);
  const [logsLoading, setLogsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const selectEndpoint = (ep: EndpointDef) => {
    setSelectedEndpoint(ep);
    const defaults: Record<string, string> = {};
    ep.params.forEach(p => { if (p.default) defaults[p.name] = p.default; });
    setParamValues(defaults);
    setResult(null);
  };

  const execute = async () => {
    setLoading(true);
    try {
      const res = await selectedEndpoint.call(paramValues);
      setResult(res);
    } finally {
      setLoading(false);
    }
  };

  const refreshLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const entries = await fetchApiLogs();
      setLogs(entries);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  // Auto-refresh logs every 3s when on logs tab
  useEffect(() => {
    if (tab !== 'logs' || !autoRefresh) return;
    const interval = setInterval(refreshLogs, 3000);
    return () => clearInterval(interval);
  }, [tab, autoRefresh, refreshLogs]);

  // Load logs when switching to logs tab
  useEffect(() => {
    if (tab === 'logs') refreshLogs();
  }, [tab, refreshLogs]);

  const getParamValue = (name: string, def?: string) => paramValues[name] ?? def ?? '';

  const jsonStr = result ? JSON.stringify(result.data, null, 2) : '';
  const arrayLength = result?.data && Array.isArray(result.data) ? result.data.length : null;

  const selectedLogJson = selectedLog
    ? JSON.stringify({ request: { method: selectedLog.method, endpoint: selectedLog.endpoint, body: selectedLog.requestBody }, response: selectedLog.responseBody, status: selectedLog.status, error: selectedLog.error, durationMs: selectedLog.durationMs }, null, 2)
    : '';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div style={{ height: '100vh', background: '#008080', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div className="window" style={{ width: '100%', maxWidth: 1200, height: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Title bar */}
        <div className="title-bar">
          <div className="title-bar-text">IOL API Explorer & Logs</div>
          <div className="title-bar-controls">
            <Link href="/trading" style={{ textDecoration: 'none' }}>
              <button aria-label="Close" />
            </Link>
          </div>
        </div>

        {/* Tab bar */}
        <menu role="tablist" style={{ ...FONT, margin: 0, padding: '0 2px' }}>
          <li role="tab" aria-selected={tab === 'explorer'} onClick={() => setTab('explorer')} style={{ cursor: 'pointer' }}>
            <a style={FONT}>API Explorer</a>
          </li>
          <li role="tab" aria-selected={tab === 'logs'} onClick={() => setTab('logs')} style={{ cursor: 'pointer' }}>
            <a style={FONT}>API Logs ({logs.length})</a>
          </li>
        </menu>

        {/* ═══ EXPLORER TAB ═══ */}
        {tab === 'explorer' && (
          <div className="window-body" style={{ display: 'flex', flex: 1, overflow: 'hidden', margin: 0, padding: 0 }}>
            {/* LEFT PANE: Endpoint list */}
            <div style={{ width: 220, flexShrink: 0, overflowY: 'auto', borderRight: '1px solid #808080', background: '#c0c0c0', padding: 4 }}>
              {CATEGORIES.map(cat => (
                <fieldset key={cat} style={{ ...FONT, marginBottom: 4, padding: '2px 4px' }}>
                  <legend style={FONT}>{cat}</legend>
                  {ENDPOINTS.filter(ep => ep.category === cat).map(ep => (
                    <button
                      key={ep.id}
                      onClick={() => selectEndpoint(ep)}
                      style={{
                        ...FONT,
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '2px 4px',
                        marginBottom: 1,
                        fontSize: 11,
                        background: selectedEndpoint.id === ep.id ? '#000080' : 'transparent',
                        color: selectedEndpoint.id === ep.id ? '#fff' : '#000',
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      {ep.label}
                    </button>
                  ))}
                </fieldset>
              ))}
            </div>

            {/* RIGHT PANE */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {/* Endpoint info + params */}
              <div style={{ padding: 6, background: '#c0c0c0', borderBottom: '1px solid #808080', flexShrink: 0 }}>
                <div style={{ ...FONT, fontWeight: 'bold', marginBottom: 4 }}>
                  {selectedEndpoint.label}
                </div>
                <div style={{ ...FONT, color: '#808080', fontSize: 10, marginBottom: 6 }}>
                  {selectedEndpoint.apiPath}
                </div>

                {selectedEndpoint.params.length > 0 && (
                  <fieldset style={{ ...FONT, marginBottom: 4, padding: '4px 6px' }}>
                    <legend style={FONT}>Parameters</legend>
                    {selectedEndpoint.params.map(p => (
                      <div key={p.name} className="field-row" style={{ marginBottom: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <label style={{ ...FONT, width: 80, textAlign: 'right', flexShrink: 0 }}>{p.label}:</label>
                        {p.type === 'select' ? (
                          <select
                            value={getParamValue(p.name, p.default)}
                            onChange={e => setParamValues(prev => ({ ...prev, [p.name]: e.target.value }))}
                            style={{ ...FONT, flex: 1 }}
                          >
                            {p.options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        ) : (
                          <input
                            type={p.type === 'number' ? 'number' : 'text'}
                            value={getParamValue(p.name, p.default)}
                            onChange={e => setParamValues(prev => ({ ...prev, [p.name]: e.target.value }))}
                            style={{ ...FONT, flex: 1 }}
                          />
                        )}
                      </div>
                    ))}
                  </fieldset>
                )}

                <button onClick={execute} disabled={loading} style={{ ...FONT, fontSize: 11 }}>
                  {loading ? 'Calling...' : 'Execute'}
                </button>
              </div>

              {/* Status bar */}
              {result && (
                <div className="status-bar" style={{ ...FONT, flexShrink: 0, margin: 0 }}>
                  <p className="status-bar-field" style={FONT}>
                    {result.error ? `Error: ${result.error.slice(0, 60)}` : 'OK'}
                  </p>
                  <p className="status-bar-field" style={FONT}>{result.timing}ms</p>
                  {arrayLength !== null && (
                    <p className="status-bar-field" style={FONT}>{arrayLength} items</p>
                  )}
                  <p className="status-bar-field" style={FONT}>
                    {(new Blob([jsonStr]).size / 1024).toFixed(1)} KB
                  </p>
                </div>
              )}

              {/* JSON viewer */}
              <div style={{ flex: 1, overflow: 'auto', background: '#fff', border: 'inset 2px', position: 'relative' }}>
                {result && (
                  <button
                    onClick={() => copyToClipboard(jsonStr)}
                    style={{ ...FONT, fontSize: 10, position: 'absolute', top: 4, right: 4, zIndex: 1 }}
                  >
                    Copy JSON
                  </button>
                )}
                {result ? (
                  <pre style={{ ...FONT, fontFamily: '"Courier New", monospace', fontSize: 11, margin: 0, padding: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {highlightJson(jsonStr)}
                  </pre>
                ) : (
                  <div style={{ ...FONT, padding: 16, color: '#808080', textAlign: 'center' }}>
                    Select an endpoint and click Execute
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ═══ LOGS TAB ═══ */}
        {tab === 'logs' && (
          <div className="window-body" style={{ display: 'flex', flex: 1, overflow: 'hidden', margin: 0, padding: 0 }}>
            {/* LEFT PANE: Log list */}
            <div style={{ width: 300, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid #808080', background: '#c0c0c0' }}>
              {/* Log controls */}
              <div style={{ display: 'flex', gap: 4, padding: '4px', borderBottom: '1px solid #808080', flexShrink: 0 }}>
                <button onClick={refreshLogs} disabled={logsLoading} style={{ ...FONT, fontSize: 11 }}>
                  {logsLoading ? '...' : 'Refresh'}
                </button>
                <button onClick={async () => { await clearAllApiLogs(); setLogs([]); setSelectedLog(null); }} style={{ ...FONT, fontSize: 11 }}>
                  Clear
                </button>
                <label style={{ ...FONT, fontSize: 11, display: 'flex', alignItems: 'center', gap: 2, marginLeft: 'auto' }}>
                  <input type="checkbox" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />
                  Auto
                </label>
              </div>

              {/* Log entries */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 2 }}>
                {logs.length === 0 ? (
                  <p style={{ ...FONT, padding: 8, color: '#808080' }}>
                    No API calls recorded yet. Use the app to trigger API calls.
                  </p>
                ) : (
                  logs.map(log => (
                    <button
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      style={{
                        ...FONT,
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '3px 4px',
                        marginBottom: 1,
                        fontSize: 11,
                        background: selectedLog?.id === log.id ? '#000080' : 'transparent',
                        color: selectedLog?.id === log.id ? '#fff' : (log.error ? '#800000' : '#000'),
                        border: 'none',
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ color: selectedLog?.id === log.id ? '#fff' : '#808080', fontSize: 10 }}>
                        [{log.source}]
                      </span>{' '}
                      {log.method} {log.endpoint.length > 35 ? '...' + log.endpoint.slice(-35) : log.endpoint}
                      <br />
                      <span style={{ color: selectedLog?.id === log.id ? '#aaa' : '#808080', fontSize: 10 }}>
                        {new Date(log.timestamp).toLocaleTimeString()} | {log.status ?? 'ERR'} | {log.durationMs}ms
                      </span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* RIGHT PANE: Log detail */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {selectedLog && (
                <div className="status-bar" style={{ ...FONT, flexShrink: 0, margin: 0 }}>
                  <p className="status-bar-field" style={FONT}>
                    {selectedLog.source} | {selectedLog.method} {selectedLog.endpoint}
                  </p>
                  <p className="status-bar-field" style={FONT}>
                    {selectedLog.status ?? 'ERR'} | {selectedLog.durationMs}ms
                  </p>
                </div>
              )}

              <div style={{ flex: 1, overflow: 'auto', background: '#fff', border: 'inset 2px', position: 'relative' }}>
                {selectedLog && (
                  <div style={{ position: 'absolute', top: 4, right: 4, zIndex: 1, display: 'flex', gap: 4 }}>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(selectedLog.responseBody, null, 2))}
                      style={{ ...FONT, fontSize: 10 }}
                    >
                      Copy Response
                    </button>
                    <button
                      onClick={() => copyToClipboard(selectedLogJson)}
                      style={{ ...FONT, fontSize: 10 }}
                    >
                      Copy Full
                    </button>
                  </div>
                )}
                {selectedLog ? (
                  <pre style={{ ...FONT, fontFamily: '"Courier New", monospace', fontSize: 11, margin: 0, padding: 6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {highlightJson(selectedLogJson)}
                  </pre>
                ) : (
                  <div style={{ ...FONT, padding: 16, color: '#808080', textAlign: 'center' }}>
                    Select a log entry to view details.
                    {logs.length === 0 && ' Use the trading app to generate API calls, then come back here.'}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
