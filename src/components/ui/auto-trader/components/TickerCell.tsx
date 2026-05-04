import React from 'react';
import { COLOR_SECONDARY } from '@/lib/theme/win98';

/**
 * Renders an IOL ticker (e.g. "HMY") with the underlying company name
 * underneath in a muted style. Used across all Auto Trader tables so the
 * user can verify the CEDEAR → ticker mapping at a glance.
 */
export function TickerCell({ ticker, company }: { ticker: string; company?: string }) {
  return (
    <div title={company ? `${ticker} — ${company}` : ticker}>
      <div>{ticker}</div>
      {company && (
        <div style={{ color: COLOR_SECONDARY, fontSize: 10, lineHeight: '12px' }}>
          {company}
        </div>
      )}
    </div>
  );
}
