import React from 'react';
import { COLOR_POSITIVE, COLOR_NEGATIVE, COLOR_SECONDARY } from '@/lib/theme/win98';
import { LogStatus } from '../types';

const DOT: React.CSSProperties = {
  display: 'inline-block',
  width: 6,
  height: 6,
  borderRadius: '50%',
  flexShrink: 0,
  alignSelf: 'center',
};

export function LogIcon({ status }: { status: LogStatus }) {
  if (status === 'running') return <span style={{ ...DOT, background: COLOR_SECONDARY }} />;
  if (status === 'ok')      return <span style={{ ...DOT, background: COLOR_POSITIVE }} />;
  return                           <span style={{ ...DOT, background: COLOR_NEGATIVE }} />;
}
