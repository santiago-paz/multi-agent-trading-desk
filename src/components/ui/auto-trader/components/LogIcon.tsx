import React from 'react';
import { COLOR_POSITIVE, COLOR_NEGATIVE, COLOR_SECONDARY, COLOR_WARNING } from '@/lib/theme/win98';
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
  if (status === 'warn')    return <span style={{ ...DOT, background: COLOR_WARNING }} />;
  return                           <span style={{ ...DOT, background: COLOR_NEGATIVE }} />;
}
