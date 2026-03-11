import React from 'react';

interface RiskGaugeProps {
  score: number; // -1 to 1
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ score }) => {
  const percentage = ((score + 1) / 2) * 100;

  return (
    <div className="border-4 border-white p-4 bg-black text-white font-mono mb-6">
      <h2 className="text-xl font-bold mb-4 uppercase tracking-widest border-b-2 border-white pb-2">Risk Gauge</h2>
      
      <div className="relative h-4 bg-gray-800 rounded mb-2">
        <div 
          className="absolute top-0 left-0 h-full bg-red-600 rounded" 
          style={{ width: `${percentage}%` }}
        ></div>
        <div className="absolute top-0 left-1/2 w-1 h-full bg-white transform -translate-x-1/2"></div>
      </div>
      
      <div className="flex justify-between text-xs text-gray-400">
        <span>High Risk (-1)</span>
        <span>Neutral (0)</span>
        <span>Low Risk (1)</span>
      </div>
      
      <p className="text-center mt-2 font-bold text-lg">
        {score.toFixed(2)}
      </p>
    </div>
  );
};
