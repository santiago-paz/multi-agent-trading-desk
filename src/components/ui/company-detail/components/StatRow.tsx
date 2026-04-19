'use client';

import React from 'react';
import { FONT, COLOR_SECONDARY } from '@/lib/theme/win98';

export const StatRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <tr>
    <td style={{ ...FONT, padding: '1px 8px 1px 4px', color: COLOR_SECONDARY, whiteSpace: 'nowrap' }}>{label}</td>
    <td style={{ ...FONT, padding: '1px 4px' }}>{value}</td>
  </tr>
);
