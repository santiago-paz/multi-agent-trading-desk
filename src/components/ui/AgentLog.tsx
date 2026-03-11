import React from 'react';
import { AnalystOutput, SentinelOutput, StrategistOutput } from '@/lib/agents/types';

interface AgentLogProps {
  analystResults: AnalystOutput[];
  sentinelResult: SentinelOutput;
  strategyResult: StrategistOutput;
}

export const AgentLog: React.FC<AgentLogProps> = ({ analystResults, sentinelResult, strategyResult }) => {
  return (
    <div className="border-4 border-white p-4 bg-black text-white font-mono h-96 overflow-y-auto mb-6">
      <h2 className="text-xl font-bold mb-4 uppercase tracking-widest border-b-2 border-white pb-2">Agent Monologue</h2>
      
      <div className="space-y-6">
        <div>
          <h3 className="text-green-400 font-bold mb-2">[ANALYST] Technical Analysis</h3>
          {analystResults.map((result) => (
            <div key={result.symbol} className="mb-2 pl-4 border-l-2 border-green-800">
              <p className="font-bold">{result.symbol} - Score: {result.score}</p>
              <p className="text-sm text-gray-400">{result.reasoning}</p>
            </div>
          ))}
        </div>

        <div>
          <h3 className="text-red-400 font-bold mb-2">[SENTINEL] Market Risk</h3>
          <div className="pl-4 border-l-2 border-red-800">
            <p className="font-bold">Risk Score: {sentinelResult.riskScore}</p>
            <p className="text-sm text-gray-400 mb-2">{sentinelResult.reasoning}</p>
            <ul className="list-disc list-inside text-xs text-gray-500">
              {sentinelResult.topHeadlines.map((headline, i) => (
                <li key={i}>{headline}</li>
              ))}
            </ul>
          </div>
        </div>

        <div>
          <h3 className="text-blue-400 font-bold mb-2">[STRATEGIST] Final Decision</h3>
          <div className="pl-4 border-l-2 border-blue-800">
            <p className="font-bold mb-2">{strategyResult.overallStrategy}</p>
            <div className="space-y-2">
              {strategyResult.allocations.map((alloc) => (
                <div key={alloc.symbol} className="flex justify-between text-sm">
                  <span>{alloc.symbol}</span>
                  <span className="font-bold">{(alloc.percentage * 100).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
