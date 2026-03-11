import React from 'react';
import { AnalystOutput, SentinelOutput, StrategistOutput } from '@/lib/agents/types';

interface AgentLogProps {
  analystResults: AnalystOutput[];
  sentinelResult: SentinelOutput;
  strategyResult: StrategistOutput;
}

export const AgentLog: React.FC<AgentLogProps> = ({ analystResults, sentinelResult, strategyResult }) => {
  return (
    <div className="overflow-auto flex-1 min-h-0">
      <fieldset>
        <legend>[ANALYST] Technical Analysis</legend>
        {analystResults.map((result) => (
          <div key={result.symbol} className="field-row-stacked mb-2">
            <strong>{result.symbol} — Score: {result.score}</strong>
            <p className="text-sm m-0">{result.reasoning}</p>
          </div>
        ))}
      </fieldset>
      <fieldset>
        <legend>[SENTINEL] Market Risk</legend>
        <p className="m-0 mb-1"><strong>Risk Score: {sentinelResult.riskScore}</strong></p>
        <p className="text-sm m-0 mb-2">{sentinelResult.reasoning}</p>
        {sentinelResult.topHeadlines && sentinelResult.topHeadlines.length > 0 ? (
          <ul className="list-none p-0 m-0 text-sm space-y-1">
            {sentinelResult.topHeadlines.map((headline, i) => (
              <li key={i}>
                <a href={headline.link} target="_blank" rel="noopener noreferrer">
                  {headline.title}
                </a>
                <span className="opacity-75"> [{headline.publisher}]</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm italic m-0">No specific headlines identified.</p>
        )}
      </fieldset>
      <fieldset>
        <legend>[STRATEGIST] Final Decision</legend>
        <p className="m-0 mb-2 font-bold">{strategyResult.overallStrategy}</p>
        <div className="field-row-stacked">
          {strategyResult.allocations.map((alloc) => (
            <div key={alloc.symbol} className="field-row" style={{ justifyContent: 'space-between' }}>
              <span>{alloc.symbol}</span>
              <strong>{(alloc.percentage * 100).toFixed(1)}%</strong>
            </div>
          ))}
        </div>
      </fieldset>
    </div>
  );
};
