import React from 'react';
import { AnalystOutput, SentinelOutput, StrategistOutput } from '@/lib/agents/types';

interface AgentLogProps {
  analystResults: AnalystOutput[];
  sentinelResult: SentinelOutput;
  strategyResult: StrategistOutput;
}

const sectionHeaderStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 'bold',
  letterSpacing: '0.05em',
  textTransform: 'uppercase' as const,
  color: '#000080',
  backgroundColor: '#d4d0c8',
  padding: '2px 6px',
  marginBottom: '8px',
  borderTop: '1px solid #ffffff',
  borderLeft: '1px solid #ffffff',
  borderRight: '1px solid #808080',
  borderBottom: '1px solid #808080',
};

const sectionStyle: React.CSSProperties = {
  marginBottom: '12px',
  padding: '8px',
  border: '2px inset #808080',
  backgroundColor: '#d4d0c8',
};

const symbolStyle: React.CSSProperties = {
  fontSize: '12px',
  fontWeight: 'bold',
  marginBottom: '2px',
};

const scoreChipStyle: React.CSSProperties = {
  display: 'inline-block',
  fontSize: '10px',
  fontWeight: 'bold',
  padding: '1px 5px',
  backgroundColor: '#000080',
  color: '#ffffff',
  marginLeft: '6px',
  verticalAlign: 'middle',
};

const reasoningStyle: React.CSSProperties = {
  fontSize: '11px',
  lineHeight: '1.4',
  color: '#222222',
  margin: '0 0 8px 0',
};

const labelStyle: React.CSSProperties = {
  fontSize: '10px',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.05em',
  color: '#444',
  marginBottom: '2px',
};

const valueStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 'bold',
  color: '#000',
  marginBottom: '6px',
};

const dividerStyle: React.CSSProperties = {
  borderTop: '1px solid #808080',
  borderBottom: '1px solid #ffffff',
  margin: '8px 0',
};

const allocationRowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '3px 0',
  fontSize: '12px',
  borderBottom: '1px dotted #b0a8a0',
};

export const AgentLog: React.FC<AgentLogProps> = ({ analystResults, sentinelResult, strategyResult }) => {
  return (
    <div style={{ overflow: 'auto', flex: 1, minHeight: 0, padding: '6px' }}>

      {/* ANALYST */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>📊 Analyst — Technical Analysis</div>
        {analystResults.map((result, idx) => (
          <div key={result.symbol} style={{ marginBottom: idx < analystResults.length - 1 ? '10px' : '0' }}>
            <div style={symbolStyle}>
              {result.symbol}
              <span style={scoreChipStyle}>Score: {result.score}</span>
            </div>
            <p style={reasoningStyle}>{result.reasoning}</p>
          </div>
        ))}
      </div>

      {/* SENTINEL */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>🛡️ Sentinel — Market Risk</div>
        <div style={labelStyle}>Risk Score</div>
        <div style={valueStyle}>{sentinelResult.riskScore}</div>
        <p style={reasoningStyle}>{sentinelResult.reasoning}</p>
        {sentinelResult.topHeadlines && sentinelResult.topHeadlines.length > 0 && (
          <>
            <div style={dividerStyle} />
            <div style={{ ...labelStyle, marginBottom: '6px' }}>Top Headlines</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {sentinelResult.topHeadlines.map((headline, i) => (
                <li key={i} style={{ fontSize: '11px', marginBottom: '4px', paddingLeft: '8px', borderLeft: '2px solid #000080' }}>
                  <a href={headline.link} target="_blank" rel="noopener noreferrer" style={{ color: '#000080', textDecoration: 'underline' }}>
                    {headline.title}
                  </a>
                  <span style={{ fontSize: '10px', color: '#555', marginLeft: '4px' }}>[{headline.publisher}]</span>
                </li>
              ))}
            </ul>
          </>
        )}
        {(!sentinelResult.topHeadlines || sentinelResult.topHeadlines.length === 0) && (
          <p style={{ ...reasoningStyle, fontStyle: 'italic', color: '#666' }}>No specific headlines identified.</p>
        )}
      </div>

      {/* STRATEGIST */}
      <div style={sectionStyle}>
        <div style={sectionHeaderStyle}>🎯 Strategist — Final Decision</div>
        <p style={{ ...reasoningStyle, fontWeight: 'bold', color: '#000' }}>{strategyResult.overallStrategy}</p>
        <div style={dividerStyle} />
        <div style={{ ...labelStyle, marginBottom: '6px' }}>Allocations</div>
        <div>
          {strategyResult.allocations.map((alloc) => (
            <div key={alloc.symbol} style={allocationRowStyle}>
              <span style={{ fontWeight: 'bold', fontSize: '12px' }}>{alloc.symbol}</span>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#000080' }}>
                {(alloc.percentage * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
