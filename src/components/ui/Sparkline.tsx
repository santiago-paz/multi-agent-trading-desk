import React from 'react';

interface SparklineProps {
  data: number[];
  height?: number;
  color?: string;
  strokeWidth?: number;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  height = 80,
  color = '#ccff00',
  strokeWidth = 2,
}) => {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const start = data[0];
  const end = data[data.length - 1];
  
  // Normalize data to 0-100 range for SVG
  const range = max - min || 1;
  const viewWidth = 100;
  const viewHeight = 100;

  // Calculate points
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * viewWidth;
    // Invert y (SVG 0 is top)
    // Add 5% padding top/bottom to avoid cutting off stroke
    const normalizedVal = (val - min) / range;
    const y = viewHeight - (normalizedVal * viewHeight); 
    return `${x},${y}`;
  }).join(' ');

  const fillPath = `${points} ${viewWidth},${viewHeight} 0,${viewHeight}`;

  return (
    <div className="w-full flex flex-col" style={{ height }}>
      {/* Header Labels */}
      <div className="flex justify-between text-[10px] font-mono text-gray-500 mb-1 px-1">
        <span>High: {max.toFixed(2)}</span>
        <span style={{ color }} className="font-bold">Last: {end.toFixed(2)}</span>
      </div>

      <div className="relative flex-1 w-full min-h-0">
        <svg 
          width="100%" 
          height="100%" 
          viewBox={`0 -5 ${viewWidth} ${viewHeight + 10}`} 
          preserveAspectRatio="none"
          className="overflow-visible"
        >
          <defs>
            <linearGradient id={`gradient-${color}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.2" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          
          <polygon
            points={fillPath}
            fill={`url(#gradient-${color})`}
            stroke="none"
          />
          
          <polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            vectorEffect="non-scaling-stroke"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Footer Labels */}
      <div className="flex justify-between text-[10px] font-mono text-gray-500 mt-1 px-1">
        <span>Low: {min.toFixed(2)}</span>
        <span>Start: {start.toFixed(2)}</span>
      </div>
    </div>
  );
};
