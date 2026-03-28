'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis, Tooltip, CartesianGrid,
  ComposedChart, Line,
} from 'recharts';
import {
  FONT,
  WINDOW_CONTAINER,
  SCROLLABLE_BODY,
  HR98,
  STATUS_BAR_STYLE,
  COLOR_LINK,
  COLOR_SECONDARY,
  COLOR_POSITIVE,
  COLOR_NEGATIVE,
  BUTTON_PRESSED,
} from '@/lib/theme/win98';
import { CompanyProfile, IncomeStatementRow, KeyMetricsRow, CashFlowRow, BalanceSheetRow, FinancialScores, DCFValue, NewsItem } from '@/lib/market-data';
import { getCompanyAdvancedData, getCompanyNews, AdvancedDetailResult } from '@/app/trading/actions';

export interface CompanyDetailData {
  fmpTicker: string | null;
  profile: CompanyProfile | null;
  isEtf: boolean;
  noUsEquivalent: boolean;
  priceHistory: { date: string; close: number; volume: number }[];
  incomeStatements: IncomeStatementRow[];
}

interface CompanyDetailWindowProps {
  iolSymbol: string;
  isLoading: boolean;
  error: string | null;
  data: CompanyDetailData | null;
  onSearch?: (symbol: string) => void;
}

type Tab = 'info' | 'charts' | 'advanced' | 'news';

const fmtMktCap = (n: number): string => {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${n.toLocaleString('en-US')}`;
};

const fmtCompact = (n: number): string => {
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(0)}M`;
  if (Math.abs(n) >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return n.toFixed(0);
};

const fmtVol = (n: number): string => n.toLocaleString('en-US');

const CHART_FONT = { fontFamily: '"Pixelated MS Sans Serif", Arial, sans-serif', fontSize: 9 };

const StatRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <tr>
    <td style={{ ...FONT, padding: '1px 8px 1px 4px', color: COLOR_SECONDARY, whiteSpace: 'nowrap' }}>{label}</td>
    <td style={{ ...FONT, padding: '1px 4px' }}>{value}</td>
  </tr>
);

// ── Help tooltip ────────────────────────────────────────────────

const InfoTip: React.FC<{ text: string }> = ({ text }) => {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (show && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left + rect.width / 2 });
    }
  }, [show]);

  return (
    <span
      ref={ref}
      style={{ display: 'inline-block', marginLeft: '4px', cursor: 'help' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span style={{
        ...FONT,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 14,
        height: 14,
        borderRadius: '50%',
        border: '1px solid #808080',
        background: '#ffffcc',
        fontSize: '9px',
        fontWeight: 'bold',
        color: '#000',
        lineHeight: 1,
      }}>
        ?
      </span>
      {show && createPortal(
        <div style={{
          ...FONT,
          position: 'fixed',
          top: pos.top,
          left: pos.left,
          transform: 'translateX(-50%)',
          background: '#ffffcc',
          border: '1px solid #000',
          padding: '3px 6px',
          whiteSpace: 'normal',
          width: 220,
          zIndex: 99999,
          lineHeight: '1.3',
          boxShadow: '2px 2px 0 rgba(0,0,0,0.15)',
          pointerEvents: 'none',
        }}>
          {text}
        </div>,
        document.body,
      )}
    </span>
  );
};

// ── Chart sections ──────────────────────────────────────────────

const PriceChart: React.FC<{ data: { date: string; close: number }[] }> = ({ data }) => {
  if (data.length === 0) return <p style={{ ...FONT, color: COLOR_SECONDARY }}>Sin datos de precio.</p>;
  const isUp = data[data.length - 1].close >= data[0].close;
  const color = isUp ? COLOR_POSITIVE : COLOR_NEGATIVE;
  return (
    <fieldset style={{ margin: '0 0 6px', padding: '4px' }}>
      <legend style={FONT}>Precio (1 año) <InfoTip text="Precio de cierre diario del último año en la bolsa de EE.UU. Verde si subió, rojo si bajó respecto al inicio del período." /></legend>
      <ResponsiveContainer width="100%" height={160}>
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#c0c0c0" />
          <XAxis
            dataKey="date"
            tick={CHART_FONT}
            tickFormatter={(d: string) => d.slice(5)} // MM-DD
            interval="preserveStartEnd"
            minTickGap={40}
          />
          <YAxis
            tick={CHART_FONT}
            domain={['auto', 'auto']}
            tickFormatter={(v: number) => `$${v.toFixed(v >= 100 ? 0 : 2)}`}
            width={52}
          />
          <Tooltip
            contentStyle={{ ...FONT, background: '#ffffcc', border: '1px solid #000', padding: '2px 6px' }}
            formatter={(value) => [`$${Number(value).toFixed(2)}`, 'Precio']}
            labelFormatter={(label) => String(label)}
          />
          <Area type="monotone" dataKey="close" stroke={color} strokeWidth={1.5} fill="url(#priceGrad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </fieldset>
  );
};

const VolumeChart: React.FC<{ data: { date: string; volume: number }[] }> = ({ data }) => {
  if (data.length === 0) return null;
  return (
    <fieldset style={{ margin: '0 0 6px', padding: '4px' }}>
      <legend style={FONT}>Volumen (1 año) <InfoTip text="Cantidad de acciones operadas por día. Un volumen alto indica mayor liquidez e interés del mercado." /></legend>
      <ResponsiveContainer width="100%" height={100}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#c0c0c0" />
          <XAxis
            dataKey="date"
            tick={CHART_FONT}
            tickFormatter={(d: string) => d.slice(5)}
            interval="preserveStartEnd"
            minTickGap={40}
          />
          <YAxis tick={CHART_FONT} tickFormatter={fmtCompact} width={42} />
          <Tooltip
            contentStyle={{ ...FONT, background: '#ffffcc', border: '1px solid #000', padding: '2px 6px' }}
            formatter={(value) => [fmtVol(Number(value)), 'Volumen']}
            labelFormatter={(label) => String(label)}
          />
          <Bar dataKey="volume" fill="#000080" opacity={0.6} />
        </BarChart>
      </ResponsiveContainer>
    </fieldset>
  );
};

const RevenueChart: React.FC<{ data: IncomeStatementRow[] }> = ({ data }) => {
  if (data.length === 0) return <p style={{ ...FONT, color: COLOR_SECONDARY }}>Sin datos financieros disponibles.</p>;
  const chartData = data.map(r => ({
    year: r.date.slice(0, 4),
    revenue: r.revenue,
    netIncome: r.netIncome,
  }));
  return (
    <fieldset style={{ margin: '0 0 6px', padding: '4px' }}>
      <legend style={FONT}>Revenue & Net Income <InfoTip text="Revenue (barras): ingresos totales anuales. Net Income (línea): ganancia neta después de impuestos y gastos. Crecimiento sostenido indica un negocio saludable." /></legend>
      <ResponsiveContainer width="100%" height={160}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#c0c0c0" />
          <XAxis dataKey="year" tick={CHART_FONT} />
          <YAxis tick={CHART_FONT} tickFormatter={(v: number) => `$${fmtCompact(v)}`} width={52} />
          <Tooltip
            contentStyle={{ ...FONT, background: '#ffffcc', border: '1px solid #000', padding: '2px 6px' }}
            formatter={(value, name) => [`$${fmtCompact(Number(value))}`, name === 'revenue' ? 'Revenue' : 'Net Income']}
          />
          <Bar dataKey="revenue" fill="#000080" opacity={0.5} name="revenue" />
          <Line type="monotone" dataKey="netIncome" stroke={COLOR_POSITIVE} strokeWidth={2} dot={{ r: 2 }} name="netIncome" />
        </ComposedChart>
      </ResponsiveContainer>
    </fieldset>
  );
};

const MarginsChart: React.FC<{ data: IncomeStatementRow[] }> = ({ data }) => {
  if (data.length === 0) return null;
  const chartData = data
    .filter(r => r.revenue > 0)
    .map(r => ({
      year: r.date.slice(0, 4),
      grossMargin: ((r.grossProfit / r.revenue) * 100),
      operatingMargin: ((r.operatingIncome / r.revenue) * 100),
      netMargin: ((r.netIncome / r.revenue) * 100),
    }));
  if (chartData.length === 0) return null;
  return (
    <fieldset style={{ margin: '0 0 6px', padding: '4px' }}>
      <legend style={FONT}>Márgenes (%) <InfoTip text="Bruto: % de ingreso que queda después del costo de producción. Operativo: después de gastos operativos. Neto: ganancia final como % del ingreso. Márgenes estables o crecientes indican eficiencia." /></legend>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#c0c0c0" />
          <XAxis dataKey="year" tick={CHART_FONT} />
          <YAxis tick={CHART_FONT} tickFormatter={(v: number) => `${v.toFixed(0)}%`} width={36} />
          <Tooltip
            contentStyle={{ ...FONT, background: '#ffffcc', border: '1px solid #000', padding: '2px 6px' }}
            formatter={(value, name) => {
              const labels: Record<string, string> = { grossMargin: 'Bruto', operatingMargin: 'Operativo', netMargin: 'Neto' };
              return [`${Number(value).toFixed(1)}%`, labels[String(name)] ?? name];
            }}
          />
          <Area type="monotone" dataKey="grossMargin" stroke="#000080" fill="#000080" fillOpacity={0.15} strokeWidth={1.5} dot={false} />
          <Area type="monotone" dataKey="operatingMargin" stroke="#808000" fill="#808000" fillOpacity={0.1} strokeWidth={1.5} dot={false} />
          <Area type="monotone" dataKey="netMargin" stroke={COLOR_POSITIVE} fill={COLOR_POSITIVE} fillOpacity={0.1} strokeWidth={1.5} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
      <div style={{ ...FONT, display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '2px' }}>
        <span><span style={{ color: '#000080' }}>--</span> Bruto</span>
        <span><span style={{ color: '#808000' }}>--</span> Operativo</span>
        <span><span style={{ color: COLOR_POSITIVE }}>--</span> Neto</span>
      </div>
    </fieldset>
  );
};

const EPSChart: React.FC<{ data: IncomeStatementRow[] }> = ({ data }) => {
  if (data.length === 0) return null;
  const chartData = data.map(r => ({
    year: r.date.slice(0, 4),
    eps: r.eps,
  }));
  return (
    <fieldset style={{ margin: '0 0 6px', padding: '4px' }}>
      <legend style={FONT}>EPS <InfoTip text="Earnings Per Share: ganancia neta dividida por la cantidad de acciones. Un EPS creciente sugiere mayor rentabilidad por acción para el inversor." /></legend>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#c0c0c0" />
          <XAxis dataKey="year" tick={CHART_FONT} />
          <YAxis tick={CHART_FONT} tickFormatter={(v: number) => `$${v.toFixed(2)}`} width={42} />
          <Tooltip
            contentStyle={{ ...FONT, background: '#ffffcc', border: '1px solid #000', padding: '2px 6px' }}
            formatter={(value) => [`$${Number(value).toFixed(2)}`, 'EPS']}
          />
          <Bar
            dataKey="eps"
            fill={COLOR_POSITIVE}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            shape={(props: any) => {
              const { x, y, width, height, payload } = props;
              const fill = payload.eps >= 0 ? COLOR_POSITIVE : COLOR_NEGATIVE;
              return <rect x={x} y={y} width={width} height={height} fill={fill} opacity={0.7} />;
            }}
          />
        </BarChart>
      </ResponsiveContainer>
    </fieldset>
  );
};

// ── Advanced tab components ─────────────────────────────────────

const ScoresSummary: React.FC<{ scores: FinancialScores | null; dcf: DCFValue | null }> = ({ scores, dcf }) => {
  if (!scores && !dcf) return <p style={{ ...FONT, color: COLOR_SECONDARY }}>Sin datos de scores disponibles.</p>;

  const zColor = (z: number) => z >= 2.99 ? COLOR_POSITIVE : z >= 1.81 ? '#808000' : COLOR_NEGATIVE;
  const pColor = (p: number) => p >= 7 ? COLOR_POSITIVE : p >= 4 ? '#808000' : COLOR_NEGATIVE;

  return (
    <fieldset style={{ margin: '0 0 6px', padding: '4px' }}>
      <legend style={FONT}>Scores & Valuación <InfoTip text="Altman Z-Score: riesgo de quiebra (>2.99 seguro, 1.81-2.99 zona gris, <1.81 peligro). Piotroski F-Score: calidad del valor (0-9, ≥7 fuerte). DCF: valor intrínseco estimado por flujo de caja descontado." /></legend>
      <table style={{ borderCollapse: 'collapse', width: '100%' }}>
        <tbody>
          {scores && (
            <>
              <StatRow
                label="Altman Z-Score"
                value={<span style={{ fontWeight: 'bold', color: zColor(scores.altmanZScore) }}>{scores.altmanZScore.toFixed(2)}</span>}
              />
              <StatRow
                label="Piotroski F-Score"
                value={<span style={{ fontWeight: 'bold', color: pColor(scores.piotroskiScore) }}>{scores.piotroskiScore.toFixed(0)}/9</span>}
              />
            </>
          )}
          {dcf && dcf.dcf > 0 && dcf.price > 0 && (
            <>
              <StatRow label="DCF (valor justo)" value={`$${dcf.dcf.toFixed(2)}`} />
              <StatRow label="Precio actual" value={`$${dcf.price.toFixed(2)}`} />
              <StatRow
                label="Señal"
                value={
                  <span style={{ fontWeight: 'bold', color: dcf.dcf > dcf.price ? COLOR_POSITIVE : COLOR_NEGATIVE }}>
                    {dcf.dcf > dcf.price ? 'Subvaluada' : 'Sobrevaluada'} ({((dcf.dcf / dcf.price - 1) * 100).toFixed(1)}%)
                  </span>
                }
              />
            </>
          )}
        </tbody>
      </table>
    </fieldset>
  );
};

const ValuationChart: React.FC<{ data: KeyMetricsRow[] }> = ({ data }) => {
  if (data.length === 0) return null;
  const chartData = data.map(r => ({ year: r.date.slice(0, 4), pe: r.peRatio, pb: r.pbRatio }));
  return (
    <fieldset style={{ margin: '0 0 6px', padding: '4px' }}>
      <legend style={FONT}>Valuación (P/E & P/B) <InfoTip text="P/E (barras): precio dividido ganancias — cuántos años de ganancias se pagan. P/B (línea): precio vs valor contable. Valores bajos pueden indicar subvaluación." /></legend>
      <ResponsiveContainer width="100%" height={160}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#c0c0c0" />
          <XAxis dataKey="year" tick={CHART_FONT} />
          <YAxis yAxisId="left" tick={CHART_FONT} tickFormatter={(v: number) => v.toFixed(0)} width={36} />
          <YAxis yAxisId="right" orientation="right" tick={CHART_FONT} tickFormatter={(v: number) => v.toFixed(1)} width={36} />
          <Tooltip
            contentStyle={{ ...FONT, background: '#ffffcc', border: '1px solid #000', padding: '2px 6px' }}
            formatter={(value, name) => [Number(value).toFixed(2), name === 'pe' ? 'P/E' : 'P/B']}
          />
          <Bar yAxisId="left" dataKey="pe" fill="#000080" opacity={0.5} name="pe" />
          <Line yAxisId="right" type="monotone" dataKey="pb" stroke="#808000" strokeWidth={2} dot={{ r: 2 }} name="pb" />
        </ComposedChart>
      </ResponsiveContainer>
      <div style={{ ...FONT, display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '2px' }}>
        <span><span style={{ color: '#000080' }}>■</span> P/E</span>
        <span><span style={{ color: '#808000' }}>--</span> P/B</span>
      </div>
    </fieldset>
  );
};

const ProfitabilityChart: React.FC<{ data: KeyMetricsRow[] }> = ({ data }) => {
  if (data.length === 0) return null;
  const chartData = data.map(r => ({ year: r.date.slice(0, 4), roe: r.roe * 100, roa: r.roa * 100 }));
  return (
    <fieldset style={{ margin: '0 0 6px', padding: '4px' }}>
      <legend style={FONT}>Rentabilidad (ROE & ROA) <InfoTip text="ROE: retorno sobre patrimonio — cuánto genera por cada peso invertido por accionistas. ROA: retorno sobre activos totales. Valores más altos indican mejor eficiencia." /></legend>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#c0c0c0" />
          <XAxis dataKey="year" tick={CHART_FONT} />
          <YAxis tick={CHART_FONT} tickFormatter={(v: number) => `${v.toFixed(0)}%`} width={40} />
          <Tooltip
            contentStyle={{ ...FONT, background: '#ffffcc', border: '1px solid #000', padding: '2px 6px' }}
            formatter={(value, name) => [`${Number(value).toFixed(1)}%`, name === 'roe' ? 'ROE' : 'ROA']}
          />
          <Area type="monotone" dataKey="roe" stroke="#000080" fill="#000080" fillOpacity={0.15} strokeWidth={1.5} dot={false} />
          <Area type="monotone" dataKey="roa" stroke={COLOR_POSITIVE} fill={COLOR_POSITIVE} fillOpacity={0.1} strokeWidth={1.5} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
      <div style={{ ...FONT, display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '2px' }}>
        <span><span style={{ color: '#000080' }}>--</span> ROE</span>
        <span><span style={{ color: COLOR_POSITIVE }}>--</span> ROA</span>
      </div>
    </fieldset>
  );
};

const CashFlowChart: React.FC<{ data: CashFlowRow[] }> = ({ data }) => {
  if (data.length === 0) return null;
  const chartData = data.map(r => ({
    year: r.date.slice(0, 4),
    operatingCF: r.operatingCashFlow,
    freeCF: r.freeCashFlow,
  }));
  return (
    <fieldset style={{ margin: '0 0 6px', padding: '4px' }}>
      <legend style={FONT}>Flujo de Caja <InfoTip text="Operating CF (barras): efectivo generado por operaciones. Free CF (línea): efectivo disponible después de inversiones en capital. FCF positivo y creciente es señal de solidez financiera." /></legend>
      <ResponsiveContainer width="100%" height={160}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#c0c0c0" />
          <XAxis dataKey="year" tick={CHART_FONT} />
          <YAxis tick={CHART_FONT} tickFormatter={(v: number) => `$${fmtCompact(v)}`} width={52} />
          <Tooltip
            contentStyle={{ ...FONT, background: '#ffffcc', border: '1px solid #000', padding: '2px 6px' }}
            formatter={(value, name) => [`$${fmtCompact(Number(value))}`, name === 'operatingCF' ? 'Operating CF' : 'Free CF']}
          />
          <Bar dataKey="operatingCF" fill="#000080" opacity={0.5} name="operatingCF" />
          <Line type="monotone" dataKey="freeCF" stroke={COLOR_POSITIVE} strokeWidth={2} dot={{ r: 2 }} name="freeCF" />
        </ComposedChart>
      </ResponsiveContainer>
      <div style={{ ...FONT, display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '2px' }}>
        <span><span style={{ color: '#000080' }}>■</span> Operating CF</span>
        <span><span style={{ color: COLOR_POSITIVE }}>--</span> Free CF</span>
      </div>
    </fieldset>
  );
};

const BalanceSheetChart: React.FC<{ data: BalanceSheetRow[] }> = ({ data }) => {
  if (data.length === 0) return null;
  const chartData = data.map(r => ({
    year: r.date.slice(0, 4),
    equity: r.totalStockholdersEquity,
    liabilities: r.totalLiabilities,
    netDebt: r.netDebt,
  }));
  return (
    <fieldset style={{ margin: '0 0 6px', padding: '4px' }}>
      <legend style={FONT}>Estructura de Capital <InfoTip text="Equity (verde) + Liabilities (azul) = Total Assets. Net Debt (línea): deuda total menos efectivo. Una proporción creciente de equity indica mayor solidez." /></legend>
      <ResponsiveContainer width="100%" height={160}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#c0c0c0" />
          <XAxis dataKey="year" tick={CHART_FONT} />
          <YAxis yAxisId="left" tick={CHART_FONT} tickFormatter={(v: number) => `$${fmtCompact(v)}`} width={52} />
          <YAxis yAxisId="right" orientation="right" tick={CHART_FONT} tickFormatter={(v: number) => `$${fmtCompact(v)}`} width={52} />
          <Tooltip
            contentStyle={{ ...FONT, background: '#ffffcc', border: '1px solid #000', padding: '2px 6px' }}
            formatter={(value, name) => {
              const labels: Record<string, string> = { equity: 'Patrimonio', liabilities: 'Pasivos', netDebt: 'Deuda Neta' };
              return [`$${fmtCompact(Number(value))}`, labels[String(name)] ?? name];
            }}
          />
          <Bar yAxisId="left" dataKey="equity" stackId="a" fill={COLOR_POSITIVE} opacity={0.5} name="equity" />
          <Bar yAxisId="left" dataKey="liabilities" stackId="a" fill="#000080" opacity={0.4} name="liabilities" />
          <Line yAxisId="right" type="monotone" dataKey="netDebt" stroke={COLOR_NEGATIVE} strokeWidth={2} dot={{ r: 2 }} name="netDebt" />
        </ComposedChart>
      </ResponsiveContainer>
      <div style={{ ...FONT, display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '2px' }}>
        <span><span style={{ color: COLOR_POSITIVE }}>■</span> Patrimonio</span>
        <span><span style={{ color: '#000080' }}>■</span> Pasivos</span>
        <span><span style={{ color: COLOR_NEGATIVE }}>--</span> Deuda Neta</span>
      </div>
    </fieldset>
  );
};

const LeverageChart: React.FC<{ data: KeyMetricsRow[] }> = ({ data }) => {
  if (data.length === 0) return null;
  const chartData = data.map(r => ({
    year: r.date.slice(0, 4),
    debtToEquity: r.debtToEquity,
    currentRatio: r.currentRatio,
  }));
  return (
    <fieldset style={{ margin: '0 0 6px', padding: '4px' }}>
      <legend style={FONT}>Apalancamiento <InfoTip text="Debt/Equity (barras): cuánta deuda por cada peso de patrimonio. Current Ratio (línea): activos corrientes / pasivos corrientes — >1 indica solvencia a corto plazo." /></legend>
      <ResponsiveContainer width="100%" height={140}>
        <ComposedChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#c0c0c0" />
          <XAxis dataKey="year" tick={CHART_FONT} />
          <YAxis yAxisId="left" tick={CHART_FONT} tickFormatter={(v: number) => v.toFixed(1)} width={36} />
          <YAxis yAxisId="right" orientation="right" tick={CHART_FONT} tickFormatter={(v: number) => v.toFixed(1)} width={36} />
          <Tooltip
            contentStyle={{ ...FONT, background: '#ffffcc', border: '1px solid #000', padding: '2px 6px' }}
            formatter={(value, name) => [Number(value).toFixed(2), name === 'debtToEquity' ? 'D/E' : 'Current Ratio']}
          />
          <Bar yAxisId="left" dataKey="debtToEquity" fill="#000080" opacity={0.5} name="debtToEquity" />
          <Line yAxisId="right" type="monotone" dataKey="currentRatio" stroke="#808000" strokeWidth={2} dot={{ r: 2 }} name="currentRatio" />
        </ComposedChart>
      </ResponsiveContainer>
      <div style={{ ...FONT, display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '2px' }}>
        <span><span style={{ color: '#000080' }}>■</span> D/E</span>
        <span><span style={{ color: '#808000' }}>--</span> Current Ratio</span>
      </div>
    </fieldset>
  );
};

// ── Main component ──────────────────────────────────────────────

export const CompanyDetailWindow: React.FC<CompanyDetailWindowProps> = ({
  iolSymbol,
  isLoading,
  error,
  data,
  onSearch,
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const [tab, setTab] = useState<Tab>('info');
  const [searchValue, setSearchValue] = useState('');
  const [advData, setAdvData] = useState<AdvancedDetailResult | null>(null);
  const [advLoading, setAdvLoading] = useState(false);
  const advFetchedRef = useRef<string | null>(null);
  const [newsData, setNewsData] = useState<NewsItem[] | null>(null);
  const [newsLoading, setNewsLoading] = useState(false);
  const newsFetchedRef = useRef<string | null>(null);

  // Reset lazy data when company changes
  useEffect(() => {
    if (data?.fmpTicker !== advFetchedRef.current) {
      setAdvData(null);
      advFetchedRef.current = null;
    }
    if (data?.fmpTicker !== newsFetchedRef.current) {
      setNewsData(null);
      newsFetchedRef.current = null;
    }
  }, [data?.fmpTicker]);

  // Lazy-load advanced data when tab is selected
  useEffect(() => {
    if (tab !== 'advanced' || !data?.fmpTicker || data.isEtf) return;
    if (advFetchedRef.current === data.fmpTicker) return;

    let cancelled = false;
    setAdvLoading(true);
    advFetchedRef.current = data.fmpTicker;

    getCompanyAdvancedData(data.fmpTicker).then((result) => {
      if (cancelled) return;
      if (result.success) setAdvData(result.data);
      setAdvLoading(false);
    });

    return () => { cancelled = true; };
  }, [tab, data?.fmpTicker, data?.isEtf]);

  // Lazy-load news when tab is selected
  useEffect(() => {
    if (tab !== 'news' || !data?.fmpTicker) return;
    if (newsFetchedRef.current === data.fmpTicker) return;

    let cancelled = false;
    setNewsLoading(true);
    newsFetchedRef.current = data.fmpTicker;

    getCompanyNews(data.fmpTicker).then((result) => {
      if (cancelled) return;
      if (result.success) setNewsData(result.data);
      setNewsLoading(false);
    });

    return () => { cancelled = true; };
  }, [tab, data?.fmpTicker]);

  const handleSearch = () => {
    const trimmed = searchValue.trim().toUpperCase();
    if (trimmed && onSearch) {
      onSearch(trimmed);
      setSearchValue('');
    }
  };

  if (isLoading) {
    return (
      <div style={{ ...WINDOW_CONTAINER, padding: '6px' }}>
        <p style={{ ...FONT, margin: 0, padding: '4px' }}>Cargando información de {iolSymbol}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ ...WINDOW_CONTAINER, padding: '6px' }}>
        <p style={{ ...FONT, margin: 0, padding: '4px', color: '#800000' }}>{error}</p>
      </div>
    );
  }

  if (!data) return null;

  if (data.noUsEquivalent) {
    return (
      <div style={{ ...WINDOW_CONTAINER, padding: '6px' }}>
        <div style={{ padding: '12px', textAlign: 'center' }}>
          <p style={{ ...FONT, fontWeight: 'bold', marginBottom: '8px' }}>{iolSymbol}</p>
          <p style={FONT}>Este CEDEAR no tiene equivalente listado en EE.UU.</p>
          <p style={{ ...FONT, color: COLOR_SECONDARY }}>No se puede obtener información desde FMP.</p>
        </div>
      </div>
    );
  }

  const p = data.profile;
  if (!p) {
    return (
      <div style={{ ...WINDOW_CONTAINER, padding: '6px' }}>
        <p style={{ ...FONT, margin: 0, padding: '4px', color: COLOR_SECONDARY }}>
          No se encontró información para {data.fmpTicker ?? iolSymbol}.
        </p>
      </div>
    );
  }

  const hasChartData = data.priceHistory.length > 0 || data.incomeStatements.length > 0;

  return (
    <div style={WINDOW_CONTAINER}>
      {/* Search bar */}
      {onSearch && (
        <div style={{ padding: '4px 8px', display: 'flex', gap: '4px', flexShrink: 0, borderBottom: '1px solid #808080' }}>
          <input
            type="text"
            placeholder="Buscar ticker..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{ ...FONT, flex: 1, paddingTop: '2px', paddingBottom: '2px', paddingLeft: '4px', paddingRight: '4px' }}
          />
          <button type="button" onClick={handleSearch} style={FONT}>Ir</button>
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '6px 8px', display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0, borderBottom: '1px solid #808080' }}>
        {p.image && !imgFailed && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={p.image}
            alt=""
            style={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0 }}
            onError={() => setImgFailed(true)}
          />
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ ...FONT, fontWeight: 'bold', fontSize: '12px' }}>
            {p.companyName}
          </div>
          <div style={{ ...FONT, color: COLOR_SECONDARY, display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span>{data.fmpTicker}</span>
            <span>{p.exchange}</span>
            {data.isEtf && (
              <span style={{
                background: '#000080',
                color: '#fff',
                padding: '0 4px',
                fontSize: '10px',
              }}>
                ETF
              </span>
            )}
          </div>
        </div>
        {p.price > 0 && (
          <div style={{ ...FONT, textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontWeight: 'bold', fontSize: '13px' }}>${p.price.toFixed(2)}</div>
            <div style={{ color: COLOR_SECONDARY, fontSize: '10px' }}>{p.currency}</div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div role="tablist" style={{ display: 'flex', padding: '4px 8px 0', gap: '2px', flexShrink: 0 }}>
        <button
          role="tab"
          type="button"
          onClick={() => setTab('info')}
          style={{
            ...FONT,
            paddingTop: '2px',
            paddingBottom: '2px',
            paddingLeft: '12px',
            paddingRight: '12px',
            border: '1px solid #808080',
            borderBottom: tab === 'info' ? '1px solid #c0c0c0' : undefined,
            background: tab === 'info' ? '#c0c0c0' : '#d4d0c8',
            marginBottom: tab === 'info' ? '-1px' : '0',
            zIndex: tab === 'info' ? 1 : 0,
            position: 'relative',
            ...(tab === 'info' ? BUTTON_PRESSED : {}),
          }}
        >
          Info
        </button>
        {hasChartData && (
          <button
            role="tab"
            type="button"
            onClick={() => setTab('charts')}
            style={{
              ...FONT,
              paddingTop: '2px',
              paddingBottom: '2px',
              paddingLeft: '12px',
              paddingRight: '12px',
              border: '1px solid #808080',
              borderBottom: tab === 'charts' ? '1px solid #c0c0c0' : undefined,
              background: tab === 'charts' ? '#c0c0c0' : '#d4d0c8',
              marginBottom: tab === 'charts' ? '-1px' : '0',
              zIndex: tab === 'charts' ? 1 : 0,
              position: 'relative',
              ...(tab === 'charts' ? BUTTON_PRESSED : {}),
            }}
          >
            Charts
          </button>
        )}
        {!data.isEtf && data.fmpTicker && (
          <button
            role="tab"
            type="button"
            onClick={() => setTab('advanced')}
            style={{
              ...FONT,
              paddingTop: '2px',
              paddingBottom: '2px',
              paddingLeft: '12px',
              paddingRight: '12px',
              border: '1px solid #808080',
              borderBottom: tab === 'advanced' ? '1px solid #c0c0c0' : undefined,
              background: tab === 'advanced' ? '#c0c0c0' : '#d4d0c8',
              marginBottom: tab === 'advanced' ? '-1px' : '0',
              zIndex: tab === 'advanced' ? 1 : 0,
              position: 'relative',
              ...(tab === 'advanced' ? BUTTON_PRESSED : {}),
            }}
          >
            Avanzado
          </button>
        )}
        {data.fmpTicker && (
          <button
            role="tab"
            type="button"
            onClick={() => setTab('news')}
            style={{
              ...FONT,
              paddingTop: '2px',
              paddingBottom: '2px',
              paddingLeft: '12px',
              paddingRight: '12px',
              border: '1px solid #808080',
              borderBottom: tab === 'news' ? '1px solid #c0c0c0' : undefined,
              background: tab === 'news' ? '#c0c0c0' : '#d4d0c8',
              marginBottom: tab === 'news' ? '-1px' : '0',
              zIndex: tab === 'news' ? 1 : 0,
              position: 'relative',
              ...(tab === 'news' ? BUTTON_PRESSED : {}),
            }}
          >
            Noticias
          </button>
        )}
      </div>

      {/* Tab content */}
      <div style={{ ...SCROLLABLE_BODY, borderTop: '1px solid #808080' }}>
        {tab === 'info' && (
          <>
            {/* Stats */}
            <fieldset style={{ margin: '4px 0 2px', padding: '4px 4px 4px 2px' }}>
              <legend style={FONT}>{data.isEtf ? 'Datos del ETF' : 'Datos de la empresa'}</legend>
              <table style={{ borderCollapse: 'collapse' }}>
                <tbody>
                  {!data.isEtf && p.sector && <StatRow label="Sector" value={p.sector} />}
                  {!data.isEtf && p.industry && <StatRow label="Industria" value={p.industry} />}
                  {p.mktCap > 0 && <StatRow label="Market Cap" value={fmtMktCap(p.mktCap)} />}
                  {p.beta !== 0 && <StatRow label="Beta" value={p.beta.toFixed(2)} />}
                  {p.volAvg > 0 && <StatRow label="Vol. promedio" value={fmtVol(p.volAvg)} />}
                  {p.country && <StatRow label="País" value={p.country} />}
                  {p.ipoDate && <StatRow label={data.isEtf ? 'Inception' : 'IPO'} value={p.ipoDate} />}
                  {p.website && (
                    <StatRow
                      label="Web"
                      value={
                        <a
                          href={p.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ ...FONT, color: COLOR_LINK, textDecoration: 'underline' }}
                        >
                          {p.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')}
                        </a>
                      }
                    />
                  )}
                </tbody>
              </table>
            </fieldset>

            <hr style={HR98} />

            {/* Description */}
            <div className="sunken-panel" style={{ padding: '4px 6px', background: '#fff' }}>
              <p style={{ ...FONT, margin: 0, lineHeight: '1.4' }}>
                {p.description || 'Sin descripción disponible.'}
              </p>
            </div>
          </>
        )}

        {tab === 'charts' && (
          <>
            <PriceChart data={data.priceHistory} />
            <VolumeChart data={data.priceHistory} />
            {!data.isEtf && (
              <>
                <RevenueChart data={data.incomeStatements} />
                <MarginsChart data={data.incomeStatements} />
                <EPSChart data={data.incomeStatements} />
              </>
            )}
          </>
        )}

        {tab === 'advanced' && (
          <>
            {advLoading && (
              <p style={{ ...FONT, padding: '8px', color: COLOR_SECONDARY }}>Cargando datos avanzados...</p>
            )}
            {!advLoading && advData && (
              <>
                <ScoresSummary scores={advData.scores} dcf={advData.dcf} />
                <ValuationChart data={advData.keyMetrics} />
                <ProfitabilityChart data={advData.keyMetrics} />
                <CashFlowChart data={advData.cashFlow} />
                <BalanceSheetChart data={advData.balanceSheet} />
                <LeverageChart data={advData.keyMetrics} />
              </>
            )}
            {!advLoading && !advData && (
              <p style={{ ...FONT, padding: '8px', color: COLOR_SECONDARY }}>No se pudieron obtener datos avanzados.</p>
            )}
          </>
        )}

        {tab === 'news' && (
          <>
            {newsLoading && (
              <p style={{ ...FONT, padding: '8px', color: COLOR_SECONDARY }}>Cargando noticias...</p>
            )}
            {!newsLoading && newsData && newsData.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '4px' }}>
                {newsData.map((news, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      gap: '8px',
                      paddingBottom: '6px',
                      borderBottom: i < newsData.length - 1 ? '1px solid #dfdfdf' : undefined,
                    }}
                  >
                    {news.image && (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={news.image}
                        alt=""
                        style={{ width: 56, height: 56, objectFit: 'cover', flexShrink: 0, border: '1px solid #808080' }}
                      />
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                        <span style={{ ...FONT, color: COLOR_SECONDARY }}>{news.publisher}</span>
                        {news.providerPublishTime && (
                          <span style={{ ...FONT, color: COLOR_SECONDARY }}>
                            {new Date(news.providerPublishTime).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <a
                        href={news.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ ...FONT, color: COLOR_LINK, textDecoration: 'underline', cursor: 'pointer' }}
                      >
                        {news.title}
                      </a>
                      {news.text && (
                        <p style={{ ...FONT, margin: 0, lineHeight: '1.3' }}>
                          {news.text.length > 180 ? news.text.slice(0, 180) + '...' : news.text}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {!newsLoading && newsData && newsData.length === 0 && (
              <p style={{ ...FONT, padding: '8px', color: COLOR_SECONDARY }}>No hay noticias disponibles para {data.fmpTicker}.</p>
            )}
            {!newsLoading && !newsData && (
              <p style={{ ...FONT, padding: '8px', color: COLOR_SECONDARY }}>No se pudieron obtener noticias.</p>
            )}
          </>
        )}
      </div>

      <div className="status-bar" style={STATUS_BAR_STYLE}>
        <div className="status-bar-field">
          CEDEAR: {iolSymbol} → US: {data.fmpTicker}
        </div>
      </div>
    </div>
  );
};
