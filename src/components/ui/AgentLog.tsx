import React from 'react';
import { AnalystOutput, SentinelOutput, StrategistOutput } from '@/lib/agents/types';
import { FONT, COL_HEADER, COL_HEADER_RIGHT, CELL, CELL_RIGHT, HR98 } from '@/lib/theme/win98';

interface AgentLogProps {
  analystResults: AnalystOutput[];
  sentinelResult: SentinelOutput;
  strategyResult: StrategistOutput;
}

const TREND_LABEL: Record<string, string> = {
  bullish: 'Alcista',
  bearish: 'Bajista',
  neutral: 'Neutral',
};

const TREND_COLOR: Record<string, string> = {
  bullish: '#008000',
  bearish: '#800000',
  neutral: '#000000',
};

export const AgentLog: React.FC<AgentLogProps> = ({
  analystResults,
  sentinelResult,
  strategyResult,
}) => (
  <div
    className="win98-scrollbar"
    style={{
      ...FONT,
      flex: 1,
      minHeight: 0,
      overflowY: 'auto',
      overflowX: 'hidden',
      padding: '6px',
      background: '#c0c0c0',
    }}
  >
    {/* ── Analyst ── */}
    <fieldset style={{ marginBottom: '6px' }}>
      <legend>Analyst — Technical Analysis</legend>
      {analystResults.map((r, idx) => (
        <React.Fragment key={r.symbol}>
          {idx > 0 && <hr style={HR98} />}
          <div style={{ marginBottom: idx < analystResults.length - 1 ? '6px' : 0 }}>
            <div
              style={{
                ...FONT,
                display: 'flex',
                alignItems: 'baseline',
                gap: '8px',
                marginBottom: '2px',
              }}
            >
              <span style={{ fontWeight: 'bold' }}>{r.symbol}</span>
              <span style={{ color: TREND_COLOR[r.trend] ?? '#000' }}>
                {TREND_LABEL[r.trend] ?? r.trend}
              </span>
              <span style={{ color: '#555' }}>Score: {r.score}</span>
            </div>
            <p style={{ ...FONT, margin: 0, lineHeight: '1.3' }}>{r.reasoning}</p>
          </div>
        </React.Fragment>
      ))}
    </fieldset>

    {/* ── Sentinel ── */}
    <fieldset style={{ marginBottom: '6px' }}>
      <legend>Sentinel — Market Risk</legend>
      <div className="field-row" style={{ marginBottom: '4px' }}>
        <label
          style={{
            ...FONT,
            width: '80px',
            flexShrink: 0,
            textAlign: 'right',
            paddingRight: '6px',
          }}
        >
          Risk Score:
        </label>
        <input
          type="text"
          readOnly
          value={`${sentinelResult.riskScore} (${sentinelResult.sentiment})`}
          style={{ ...FONT, flex: 1, cursor: 'default' }}
        />
      </div>
      <p style={{ ...FONT, margin: '0 0 4px 0', lineHeight: '1.3' }}>
        {sentinelResult.reasoning}
      </p>
      {sentinelResult.topHeadlines.length > 0 && (
        <>
          <hr style={HR98} />
          <p style={{ ...FONT, margin: '0 0 3px 0', fontWeight: 'bold' }}>
            Top Headlines
          </p>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {sentinelResult.topHeadlines.map((h, i) => (
              <li key={i} style={{ ...FONT, marginBottom: '3px' }}>
                <a
                  href={h.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#0000ff', textDecoration: 'underline' }}
                >
                  {h.title}
                </a>
                <span style={{ color: '#555', marginLeft: '4px' }}>
                  [{h.publisher}]
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </fieldset>

    {/* ── Strategist ── */}
    <fieldset>
      <legend>Strategist — Final Decision</legend>
      <p style={{ ...FONT, margin: '0 0 4px 0', fontWeight: 'bold', lineHeight: '1.3' }}>
        {strategyResult.overallStrategy}
      </p>
      <hr style={HR98} />
      <p style={{ ...FONT, margin: '0 0 4px 0', fontWeight: 'bold' }}>Allocations</p>
      <div className="sunken-panel" style={{ padding: 0, overflow: 'hidden' }}>
        <table
          style={{
            ...FONT,
            width: '100%',
            borderCollapse: 'collapse',
            tableLayout: 'fixed',
          }}
        >
          <thead>
            <tr>
              <th style={{ ...COL_HEADER, width: '20%' }}>Símbolo</th>
              <th style={{ ...COL_HEADER_RIGHT, width: '18%' }}>%</th>
              <th style={COL_HEADER}>Razonamiento</th>
            </tr>
          </thead>
          <tbody>
            {strategyResult.allocations.map((alloc, idx) => (
              <tr
                key={alloc.symbol}
                style={{
                  background: idx % 2 === 0 ? '#fff' : '#f0f0f0',
                  borderBottom: '1px solid #c0c0c0',
                }}
              >
                <td style={{ ...CELL, fontWeight: 'bold' }}>{alloc.symbol}</td>
                <td
                  style={{
                    ...CELL_RIGHT,
                    fontWeight: 'bold',
                    color: '#000080',
                  }}
                >
                  {(alloc.percentage * 100).toFixed(1)}%
                </td>
                <td
                  style={{
                    ...CELL,
                    whiteSpace: 'normal',
                    lineHeight: '1.3',
                    overflow: 'visible',
                    textOverflow: 'clip',
                  }}
                >
                  {alloc.reasoning}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </fieldset>
  </div>
);
