import React, { useEffect, useRef } from 'react';
import { FONT, COLOR_NEGATIVE, COLOR_POSITIVE, COLOR_WARNING, COLOR_SECONDARY } from '@/lib/theme/win98';
import type { LogEntry, LogKind } from './types';

const KIND_COLOR: Record<LogKind, string> = {
  info: COLOR_SECONDARY,
  good: COLOR_POSITIVE,
  bad: COLOR_NEGATIVE,
  warn: COLOR_WARNING,
};

interface Props {
  log: LogEntry[];
}

export function PlantLog({ log }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [log.length]);

  const recent = log.slice(-30);

  return (
    <div
      ref={ref}
      style={{
        ...FONT,
        flex: 1,
        minHeight: 48,
        margin: '4px 6px',
        padding: '3px 5px',
        background: '#fff',
        borderTop: '1px solid #808080',
        borderLeft: '1px solid #808080',
        borderRight: '1px solid #fff',
        borderBottom: '1px solid #fff',
        overflowY: 'auto',
        fontSize: 11,
      }}
    >
      {recent.length === 0 ? (
        <div style={{ color: COLOR_SECONDARY }}>—</div>
      ) : (
        recent.map((e) => (
          <div key={e.id} style={{ color: KIND_COLOR[e.kind], lineHeight: 1.25 }}>
            {e.text}
          </div>
        ))
      )}
    </div>
  );
}
