import React from 'react';
import { HR98 } from '@/lib/theme/win98';

/**
 * Root of every Auto Trader tab page. Fills the tab panel and stacks the
 * group boxes 8px apart, the same rhythm the Display Properties sheet uses.
 */
export const PAGE: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  gap: 8,
};

/**
 * Page-local command buttons (Copy Logs, Execute Orders, Clear history) sit
 * bottom-right under an engraved rule. Sheet-level buttons (Analyze, Stop,
 * Reload Portfolio) live outside the tab panel in AutoTraderWindow instead.
 */
export function ActionRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ flexShrink: 0 }}>
      <hr style={{ ...HR98, margin: '0 0 8px' }} />
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        {children}
      </div>
    </div>
  );
}
