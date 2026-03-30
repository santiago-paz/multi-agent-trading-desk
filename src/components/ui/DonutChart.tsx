import React, { useState, useMemo, useCallback } from 'react';
import { FONT } from '@/lib/theme/win98';

interface DonutChartDataItem {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutChartDataItem[];
  size?: number;
  thickness?: number;
  centerText?: string;
  centerSubText?: string;
}

interface SegmentGeometry {
  index: number;
  item: DonutChartDataItem;
  startAngle: number;
  endAngle: number;
  midAngle: number;
  percentage: number;
  pathData: string;
  highlightPath: string;
  shadowPath: string;
}

const EXPLODE_PX = 5;
const BEVEL_INSET = 2.5;

function buildArcPath(
  cx: number, cy: number,
  outerR: number, innerR: number,
  startAngle: number, endAngle: number,
): string {
  const angle = endAngle - startAngle;
  const largeArc = angle > Math.PI ? 1 : 0;

  if (angle >= Math.PI * 2 - 0.001) {
    return [
      `M ${cx} ${cy - outerR}`,
      `A ${outerR} ${outerR} 0 1 1 ${cx} ${cy + outerR}`,
      `A ${outerR} ${outerR} 0 1 1 ${cx} ${cy - outerR}`,
      `M ${cx} ${cy - innerR}`,
      `A ${innerR} ${innerR} 0 1 0 ${cx} ${cy + innerR}`,
      `A ${innerR} ${innerR} 0 1 0 ${cx} ${cy - innerR}`,
    ].join(' ');
  }

  const ox1 = cx + outerR * Math.cos(startAngle);
  const oy1 = cy + outerR * Math.sin(startAngle);
  const ox2 = cx + outerR * Math.cos(endAngle);
  const oy2 = cy + outerR * Math.sin(endAngle);
  const ix1 = cx + innerR * Math.cos(startAngle);
  const iy1 = cy + innerR * Math.sin(startAngle);
  const ix2 = cx + innerR * Math.cos(endAngle);
  const iy2 = cy + innerR * Math.sin(endAngle);

  return [
    `M ${ox1} ${oy1}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${ox2} ${oy2}`,
    `L ${ix2} ${iy2}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1} ${iy1}`,
    'Z',
  ].join(' ');
}

function buildBevelPaths(
  cx: number, cy: number,
  outerR: number, innerR: number,
  startAngle: number, endAngle: number,
  inset: number,
): { highlight: string; shadow: string } {
  const angle = endAngle - startAngle;
  if (angle >= Math.PI * 2 - 0.001) {
    return { highlight: '', shadow: '' };
  }

  const midAngle = (startAngle + endAngle) / 2;
  const highlightEnd = Math.min(startAngle + angle * 0.5, endAngle);
  const shadowStart = Math.max(endAngle - angle * 0.5, startAngle);

  const hOuter = outerR - inset;
  const hInner = innerR + inset;

  const highlight = buildArcPath(cx, cy, hOuter, hInner, startAngle, highlightEnd);
  const shadow = buildArcPath(cx, cy, hOuter, hInner, shadowStart, endAngle);

  return { highlight, shadow };
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  size = 150,
  thickness = 30,
  centerText,
  centerSubText,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const padding = EXPLODE_PX + 1;
  const svgSize = size + padding * 2;
  const radius = size / 2;
  const innerRadius = radius - thickness;
  const cx = svgSize / 2;
  const cy = svgSize / 2;

  const total = useMemo(() => data.reduce((sum, item) => sum + item.value, 0), [data]);

  const segments: SegmentGeometry[] = useMemo(() => {
    if (total === 0) return [];
    let currentAngle = -Math.PI / 2;
    return data
      .map((item, index) => {
        if (item.value === 0) return null;
        const angle = (item.value / total) * Math.PI * 2;
        const startAngle = currentAngle;
        const endAngle = currentAngle + angle;
        const midAngle = (startAngle + endAngle) / 2;
        currentAngle = endAngle;

        const pathData = buildArcPath(cx, cy, radius, innerRadius, startAngle, endAngle);
        const { highlight, shadow } = buildBevelPaths(cx, cy, radius, innerRadius, startAngle, endAngle, BEVEL_INSET);

        return {
          index,
          item,
          startAngle,
          endAngle,
          midAngle,
          percentage: (item.value / total) * 100,
          pathData,
          highlightPath: highlight,
          shadowPath: shadow,
        } as SegmentGeometry;
      })
      .filter((s): s is SegmentGeometry => s !== null);
  }, [data, total, cx, cy, radius, innerRadius]);

  const orderedSegments = useMemo(() => {
    if (hoveredIdx === null) return segments;
    return [
      ...segments.filter(s => s.index !== hoveredIdx),
      ...segments.filter(s => s.index === hoveredIdx),
    ];
  }, [segments, hoveredIdx]);

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  const activeItem = hoveredIdx !== null ? data[hoveredIdx] : null;
  const activeSegment = hoveredIdx !== null ? segments.find(s => s.index === hoveredIdx) : null;

  const chartLabel = data.map(d => `${d.label}: ${(d.value / total * 100).toFixed(1)}%`).join(', ');

  return (
    <div style={{ position: 'relative', width: svgSize, height: svgSize }}>
      <svg
        width={svgSize}
        height={svgSize}
        viewBox={`0 0 ${svgSize} ${svgSize}`}
        role="img"
        aria-label={`Distribution chart: ${chartLabel}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => { setHoveredIdx(null); setTooltipPos(null); }}
      >
        {orderedSegments.map((seg) => {
          const isHovered = hoveredIdx === seg.index;
          const dx = isHovered ? Math.cos(seg.midAngle) * EXPLODE_PX : 0;
          const dy = isHovered ? Math.sin(seg.midAngle) * EXPLODE_PX : 0;

          return (
            <g
              key={seg.index}
              transform={`translate(${dx}, ${dy})`}
              style={{ transition: 'transform 100ms ease-out' }}
              onMouseEnter={() => setHoveredIdx(seg.index)}
            >
              <path
                d={seg.pathData}
                fill={seg.item.color}
                stroke="#000000"
                strokeWidth={0.5}
              >
                <title>{`${seg.item.label}: ${seg.percentage.toFixed(1)}%`}</title>
              </path>

              {seg.highlightPath && (
                <path
                  d={seg.highlightPath}
                  fill="rgba(255,255,255,0.25)"
                  stroke="none"
                  pointerEvents="none"
                />
              )}
              {seg.shadowPath && (
                <path
                  d={seg.shadowPath}
                  fill="rgba(0,0,0,0.15)"
                  stroke="none"
                  pointerEvents="none"
                />
              )}

              {isHovered && (
                <path
                  d={seg.pathData}
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth={1.5}
                  pointerEvents="none"
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Center text */}
      <div
        style={{
          position: 'absolute',
          top: padding,
          left: padding,
          width: size,
          height: size,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          ...FONT,
          textAlign: 'center',
        }}
      >
        {activeItem && activeSegment ? (
          <>
            <div style={{
              color: '#000',
              backgroundColor: '#c0c0c0',
              border: '1px solid #808080',
              padding: '0 4px',
            }}>
              {activeItem.label}
            </div>
            <div style={{
              color: '#000',
              marginTop: '1px',
              backgroundColor: '#c0c0c0',
              border: '1px solid #808080',
              padding: '0 4px',
            }}>
              {activeSegment.percentage.toFixed(1)}%
            </div>
          </>
        ) : (
          <>
            {centerText && (
              <div style={{ color: '#000' }}>
                {centerText}
              </div>
            )}
            {centerSubText && (
              <div style={{ color: '#000', marginTop: '1px' }}>
                {centerSubText}
              </div>
            )}
          </>
        )}
      </div>

      {/* Win98-style tooltip */}
      {activeItem && activeSegment && tooltipPos && (
        <div
          style={{
            position: 'absolute',
            left: tooltipPos.x + 12,
            top: tooltipPos.y - 8,
            background: '#ffffe1',
            border: '1px solid #000',
            padding: '2px 4px',
            ...FONT,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            zIndex: 10,
          }}
        >
          {activeItem.label}: {activeSegment.percentage.toFixed(1)}%
        </div>
      )}
    </div>
  );
};
