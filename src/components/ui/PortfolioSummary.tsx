import React, { useState, useMemo } from 'react';
import { PortfolioResponse, EstadoCuenta } from '@/lib/iol/types';
import { usePortfolioSort, SortKey, UsdPriceEntry } from '@/hooks/usePortfolioSort';
import { stripCurrencySuffix } from '@/lib/cedear-map';

import { useMepStore } from '@/lib/store/mep-store';

interface PortfolioSummaryProps {
  portfolio: PortfolioResponse;
  usdPrices?: Record<string, UsdPriceEntry>;
  estadoCuenta?: EstadoCuenta | null;
  isLoading?: boolean;
  onRefresh?: () => void;
  onCompanyDetail?: (symbol: string) => void;
}

import {
  FONT, LABEL, COL_HEADER_BASE, COL_RAISED, COL_SUNKEN, CELL, CELL_RIGHT,
  WINDOW_CONTAINER, SCROLLABLE_BODY, REFRESH_FOOTER, STATUS_BAR_STYLE,
  COLOR_POSITIVE, COLOR_NEGATIVE, COLOR_SECONDARY,
} from '@/lib/theme/win98';
import { usePortfolioT } from '@/lib/i18n';

interface ColumnDef {
  key: SortKey;
  label: string;
  align: 'left' | 'right';
  width?: string;
}

const ASSET_TYPE_KEYS: Record<string, string> = {
  'Todos': 'assetType.all',
  'CEDEARS': 'assetType.cedears',
  'ACCIONES': 'assetType.stocks',
  'TITULOS PUBLICOS': 'assetType.bonds',
  'OPCIONES': 'assetType.options',
  'FONDOS COMUNES DE INVERSION': 'assetType.mutualFunds',
  'OBLIGACIONES NEGOCIABLES': 'assetType.corporateBonds',
};



import { DonutChart } from './DonutChart';

const CHART_COLORS = [
  '#0000FF', // Blue
  '#FF00FF', // Fuchsia
  '#008080', // Teal
  '#00FF00', // Lime
  '#FF0000', // Red
  '#FFFF00', // Yellow
  '#000080', // Navy
  '#800080', // Purple
  '#008000', // Green
  '#800000', // Maroon
  '#808000', // Olive
  '#00FFFF', // Aqua
];

/* ─── Component ──────────────────────────────────────────────────────────── */
export const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({
  portfolio,
  usdPrices,
  estadoCuenta,
  isLoading,
  onRefresh,
  onCompanyDetail,
}) => {
  const t = usePortfolioT();
  const { mepRate, fetchMepRate } = useMepStore();
  const {
    sortKey,
    sortDir,
    handleSort,
    sortedActivos,
    totalUSD,
    cashUSD,
    comprometidoUSD,
    totalGananciaUSD,
    totalARS,
    cashARS,
    comprometidoARS,
    totalGananciaARS,
    totalActivosEnCartera,
  } = usePortfolioSort(portfolio, mepRate, estadoCuenta, usdPrices);

  const [displayCurrency, setDisplayCurrency] = useState<'USD' | 'ARS'>('USD');
  const [activeTab, setActiveTab] = useState<string>('Todos');

  const columns: ColumnDef[] = useMemo(() => [
    { key: 'simbolo',         label: t('col.symbol'),      align: 'left',  width: '60px'  },
    { key: 'descripcion',     label: t('col.description'), align: 'left'                 },
    { key: 'cantidad',        label: t('col.qty'),         align: 'right', width: '36px'  },
    { key: 'ultimoPrecio',    label: t('col.lastPrice'),   align: 'right', width: '65px'  },
    { key: 'valorizado',      label: t('col.valued'),      align: 'right', width: '75px'  },
    { key: 'variacionDiaria', label: t('col.dailyVar'),    align: 'right', width: '50px'  },
    { key: 'gananciaDinero',  label: t('col.profit'),      align: 'right', width: '65px'  },
    { key: 'gananciaPorcentaje', label: t('col.yield'),    align: 'right', width: '55px'  },
  ], [t]);

  const formatAssetType = (type: string) => {
    const key = ASSET_TYPE_KEYS[type];
    if (key) return t(key as Parameters<typeof t>[0]);
    return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
  };
  const [hoveredChartLabel, setHoveredChartLabel] = useState<string | null>(null);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);

  const assetTypes = useMemo(() => {
    const types = new Set<string>();
    portfolio.activos.forEach(a => {
      if (a.titulo.tipo) types.add(a.titulo.tipo);
    });
    return ['Todos', ...Array.from(types).sort()];
  }, [portfolio.activos]);

  const filteredActivos = useMemo(() => {
    if (activeTab === 'Todos') return sortedActivos;
    return sortedActivos.filter(a => a.titulo.tipo === activeTab);
  }, [sortedActivos, activeTab]);

  const isUSD = displayCurrency === 'USD';
  const displayTotal = isUSD ? totalUSD : totalARS;
  const displayGanancia = isUSD ? totalGananciaUSD : totalGananciaARS;
  const displayCash = isUSD ? cashUSD : cashARS;
  const displayComprometido = isUSD ? comprometidoUSD : comprometidoARS;
  const currencySymbol = isUSD ? 'U$D' : 'AR$';

  const chartData = useMemo(() => {
    if (displayTotal <= 0) return [];
    
    // Sort by value descending
    const sortedByValue = [...sortedActivos].sort((a, b) => {
      const valA = isUSD ? (usdPrices?.[a.titulo.simbolo]?.price ? usdPrices[a.titulo.simbolo].price * a.cantidad : a.valorizado / mepRate) : a.valorizado;
      const valB = isUSD ? (usdPrices?.[b.titulo.simbolo]?.price ? usdPrices[b.titulo.simbolo].price * b.cantidad : b.valorizado / mepRate) : b.valorizado;
      return valB - valA;
    });

    const data: { label: string; value: number; color: string }[] = [];
    let otherValue = 0;
    
    sortedByValue.forEach((asset, idx) => {
      const val = isUSD ? (usdPrices?.[asset.titulo.simbolo]?.price ? usdPrices[asset.titulo.simbolo].price * asset.cantidad : asset.valorizado / mepRate) : asset.valorizado;
      
      // Group items smaller than 2% into "Otros" if we have many items
      if (val / displayTotal < 0.02 && idx >= 6) {
        otherValue += val;
      } else {
        data.push({
          label: asset.titulo.simbolo,
          value: val,
          color: CHART_COLORS[data.length % CHART_COLORS.length]
        });
      }
    });

    if (otherValue > 0) {
      data.push({
        label: t('valuation.others'),
        value: otherValue,
        color: '#808080' // Gray for others
      });
    }

    return data;
  }, [sortedActivos, displayTotal, isUSD, usdPrices, mepRate, t]);

  return (
    <div style={WINDOW_CONTAINER}>
      {/* ── Scrollable body ── */}
      <div className="win98-scrollbar" style={SCROLLABLE_BODY}>
        <div style={{ display: 'flex', gap: '8px' }}>
          {/* ─── Resumen de Valuación ─── */}
          <fieldset style={{ flex: '0 0 200px', margin: 0 }}>
            <legend>{t('valuation.title')}</legend>
            <div className="field-row" style={{ marginBottom: '6px' }}>
              <label style={LABEL}>{t('valuation.currency')}</label>
              <select
                value={displayCurrency}
                onChange={(e) => setDisplayCurrency(e.target.value as 'USD' | 'ARS')}
                style={{ ...FONT, flex: 1 }}
              >
                <option value="USD">{t('valuation.currencyUSD')}</option>
                <option value="ARS">{t('valuation.currencyARS')}</option>
              </select>
            </div>
            <div className="field-row" style={{ marginBottom: '2px' }}>
              <label style={LABEL}>{t('valuation.total')}</label>
              <input
                type="text"
                readOnly
                value={`${currencySymbol} ${displayTotal.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                style={{ ...FONT, flex: 1, cursor: 'default' }}
              />
            </div>
            <div className="field-row" style={{ marginBottom: '2px' }}>
              <label style={LABEL}>{t('valuation.profit')}</label>
              <input
                type="text"
                readOnly
                value={`${currencySymbol} ${displayGanancia >= 0 ? '+' : ''}${displayGanancia.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                style={{
                  ...FONT,
                  flex: 1,
                  cursor: 'default',
                  color: displayGanancia >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE,
                }}
              />
            </div>
            {displayCash > 0 && (
              <div className="field-row" style={{ marginBottom: '2px' }}>
                <label style={LABEL}>{t('valuation.cash')}</label>
                <input
                  type="text"
                  readOnly
                  value={`${currencySymbol} ${displayCash.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  style={{ ...FONT, flex: 1, cursor: 'default', color: COLOR_SECONDARY }}
                />
              </div>
            )}
            {displayComprometido > 0 && (
              <div className="field-row">
                <label style={LABEL}>{t('valuation.committed')}</label>
                <input
                  type="text"
                  readOnly
                  value={`${currencySymbol} ${displayComprometido.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  style={{ ...FONT, flex: 1, cursor: 'default', color: COLOR_NEGATIVE }}
                />
              </div>
            )}
          </fieldset>

          {/* ─── Gráfico de Distribución ─── */}
          {chartData.length > 0 && (
            <fieldset style={{ flex: 1, margin: 0, display: 'flex', gap: '16px', alignItems: 'center', padding: '12px' }}>
              <legend>{t('valuation.distribution')}</legend>
              <div style={{ flexShrink: 0 }}>
                <DonutChart 
                  data={chartData} 
                  size={130} 
                  thickness={35} 
                  centerText={`${currencySymbol}`}
                  centerSubText={displayTotal >= 1000000 ? `${(displayTotal / 1000000).toFixed(1)}M` : displayTotal >= 1000 ? `${(displayTotal / 1000).toFixed(1)}k` : displayTotal.toFixed(0)}
                  activeLabel={hoveredChartLabel}
                  onHoverChange={setHoveredChartLabel}
                />
              </div>
              
              {/* Leyenda */}
              <div 
                className="sunken-panel win98-scrollbar" 
                style={{ 
                  flex: 1, 
                  height: '130px', 
                  overflowY: 'auto', 
                  backgroundColor: '#fff', 
                  padding: '6px',
                  margin: 0
                }}
              >
                {chartData.map((item) => (
                  <div 
                    key={item.label} 
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      marginBottom: '6px',
                      backgroundColor: hoveredChartLabel === item.label ? '#000080' : 'transparent',
                      color: hoveredChartLabel === item.label ? '#fff' : 'inherit',
                      cursor: 'default'
                    }}
                    onMouseEnter={() => setHoveredChartLabel(item.label)}
                    onMouseLeave={() => setHoveredChartLabel(null)}
                  >
                    <div 
                      style={{ 
                        width: '14px', 
                        height: '14px', 
                        backgroundColor: item.color, 
                        border: '1px solid #000', 
                        boxShadow: 'inset 1px 1px 0px rgba(255,255,255,0.5), inset -1px -1px 0px rgba(0,0,0,0.2)',
                        marginRight: '8px', 
                        flexShrink: 0 
                      }} 
                    />
                    <div style={{ ...FONT, fontSize: '11px', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.label}
                    </div>
                    <div style={{ ...FONT, fontSize: '11px', fontWeight: 'bold', marginLeft: '8px' }}>
                      {(item.value / displayTotal * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </fieldset>
          )}
        </div>

        {/* ─── Holdings ListView ─── */}
        <fieldset style={{ marginTop: '6px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <legend>{t('holdings.title', { count: filteredActivos.length })}</legend>
          
          {assetTypes.length > 2 && (
            <menu role="tablist" style={{ marginBottom: 0 }}>
              {assetTypes.map(type => (
                <li key={type} role="tab" aria-selected={activeTab === type}>
                  <a href={`#${type}`} onClick={(e) => { e.preventDefault(); setActiveTab(type); }}>
                    {formatAssetType(type)}
                  </a>
                </li>
              ))}
            </menu>
          )}

          <div className="window" role="tabpanel" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, marginTop: assetTypes.length > 2 ? '-1px' : 0 }}>
            <div
              className="window-body"
              style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, margin: 0 }}
            >
              <div
                className="sunken-panel win98-scrollbar"
                style={{ flex: 1, overflow: 'auto', padding: 0, minHeight: 0, margin: 0 }}
              >
              <table
              style={{
                ...FONT,
                width: '100%',
                borderCollapse: 'collapse',
                borderSpacing: 0,
              }}
            >
              <thead>
                <tr>
                  {columns.map((col) => {
                    const isActive = sortKey === col.key;
                    const arrow = isActive ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';
                    return (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        style={{
                          ...COL_HEADER_BASE,
                          textAlign: col.align,
                          ...(isActive ? COL_SUNKEN : COL_RAISED),
                          ...(col.width ? { width: col.width } : {}),
                          position: 'sticky',
                          top: 0,
                          zIndex: 1,
                          cursor: 'pointer',
                        }}
                      >
                        {col.label}{arrow}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredActivos.map((asset, idx) => {
                  const sym = asset.titulo.simbolo;
                  const dPrice = usdPrices?.[sym];
                  const priceUSD = dPrice ? dPrice.price : asset.ultimoPrecio / mepRate;
                  const valorizadoUSD = dPrice ? dPrice.price * asset.cantidad : asset.valorizado / mepRate;
                  const variacion = dPrice ? dPrice.pct : asset.variacionDiaria;
                  const gananciaUSD = asset.gananciaDinero / mepRate;
                  
                  const displayPrice = isUSD ? priceUSD : asset.ultimoPrecio;
                  const displayValorizado = isUSD ? valorizadoUSD : asset.valorizado;
                  const displayGananciaDinero = isUSD ? gananciaUSD : asset.gananciaDinero;
                  
                  const isSelected = selectedSymbol === sym;

                  return (
                    <tr
                      key={sym}
                      onClick={() => setSelectedSymbol(sym)}
                      onDoubleClick={() => onCompanyDetail?.(stripCurrencySuffix(sym))}
                      style={{
                        backgroundColor: isSelected ? '#000080' : (idx % 2 === 0 ? '#ffffff' : '#f0f0f0'),
                        color: isSelected ? '#ffffff' : 'inherit',
                        cursor: 'default',
                        userSelect: 'none',
                      }}
                    >
                      <td style={CELL}>
                        {sym}
                      </td>
                      <td
                        style={{
                          ...CELL,
                          maxWidth: '120px',
                        }}
                        title={asset.titulo.descripcion}
                      >
                        {asset.titulo.descripcion}
                      </td>
                      <td style={CELL_RIGHT}>{asset.cantidad}</td>
                      <td style={CELL_RIGHT}>
                        {displayPrice.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td style={CELL_RIGHT}>
                        {displayValorizado.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td
                        style={{
                          ...CELL_RIGHT,
                          color: isSelected ? '#ffffff' : (variacion >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE),
                        }}
                      >
                        {variacion >= 0 ? '+' : ''}{variacion.toFixed(2)}%
                      </td>
                      <td
                        style={{
                          ...CELL_RIGHT,
                          color: isSelected ? '#ffffff' : (displayGananciaDinero >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE),
                        }}
                      >
                        {displayGananciaDinero >= 0 ? '+' : ''}{displayGananciaDinero.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td
                        style={{
                          ...CELL_RIGHT,
                          color: isSelected ? '#ffffff' : (asset.gananciaPorcentaje >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE),
                          borderRight: 'none',
                        }}
                      >
                        {asset.gananciaPorcentaje >= 0 ? '+' : ''}{asset.gananciaPorcentaje.toFixed(2)}%
                      </td>
                    </tr>
                  );
                })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </fieldset>
      </div>

      {/* ── Botón Actualizar ── */}
      {onRefresh && (
        <div style={REFRESH_FOOTER}>
          <button onClick={() => { onRefresh?.(); fetchMepRate(); }} disabled={isLoading}>
            {isLoading ? t('footer.updating') : t('footer.update')}
          </button>
        </div>
      )}

      {/* ── Status Bar ── */}
      <div className="status-bar" style={STATUS_BAR_STYLE}>
        <p className="status-bar-field">
          {t('footer.titlesInPortfolio', { count: totalActivosEnCartera })}
        </p>
        <p className="status-bar-field">
          MEP: ${mepRate.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
        <p className="status-bar-field" style={{
          color: displayGanancia >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE,
        }}>
          F&L: {displayGanancia >= 0 ? '+' : ''}{currencySymbol} {displayGanancia.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </p>
      </div>
    </div>
  );
};
