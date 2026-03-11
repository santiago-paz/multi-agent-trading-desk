import React from 'react';

interface RiskGaugeProps {
  score: number; // -1 to 1
}

export const RiskGauge: React.FC<RiskGaugeProps> = ({ score }) => {
  const percentage = ((score + 1) / 2) * 100;

  return (
    <div className="field-row-stacked">
      <div className="progress-indicator" style={{ width: '100%' }}>
        <div
          className="progress-indicator-bar"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="field-row" style={{ justifyContent: 'space-between', fontSize: '10px' }}>
        <span>High Risk (-1)</span>
        <span>Neutral (0)</span>
        <span>Low Risk (1)</span>
      </div>
      <p className="text-center font-bold m-0 mt-1">{score.toFixed(2)}</p>
    </div>
  );
};

