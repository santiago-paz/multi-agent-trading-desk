import React from 'react';
import { COLOR_POSITIVE, COLOR_NEGATIVE, COLOR_SECONDARY } from '@/lib/theme/win98';
import { LogStatus } from '../types';

export function LogIcon({ status }: { status: LogStatus }) {
  if (status === 'running') return <span style={{ color: COLOR_SECONDARY }}>&#9658;</span>;
  if (status === 'ok')      return <span style={{ color: COLOR_POSITIVE }}>&#9632;</span>;
  return                           <span style={{ color: COLOR_NEGATIVE }}>&#10005;</span>;
}
