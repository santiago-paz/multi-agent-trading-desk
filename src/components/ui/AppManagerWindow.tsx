'use client';

import React, { useState } from 'react';
import {
  WINDOW_CONTAINER,
  FONT,
  COLOR_POSITIVE,
  COLOR_DISABLED,
  COLOR_SECONDARY,
  STATUS_BAR_STYLE,
} from '@/lib/theme/win98';
import type { AppId } from '@/hooks/useWindowManager';
import { useWindowsT, type WindowsKey } from '@/lib/i18n';

export type AppStatus = 'closed' | 'open' | 'minimized';

export interface ManagedApp {
  id: AppId;
  label: string;
  iconSrc: string;
  status: AppStatus;
}

interface AppManagerWindowProps {
  apps: ManagedApp[];
  /** App content rendered in the right panel when the matching app is selected. */
  appContents: Partial<Record<AppId, React.ReactNode>>;
  /** Controlled selection (lifted to parent for data-fetch coordination). */
  selectedId: AppId;
  onSelect: (id: AppId) => void;
  /** Open or focus the standalone draggable window for the given app. */
  onPopOut: (id: AppId) => void;
  /** Bulk actions on standalone windows. */
  onShowAll: () => void;
  onMinimizeAll: () => void;
  onCloseAll: () => void;
  onCascade: () => void;
  onTile: () => void;
}

const STATUS_COLOR: Record<AppStatus, string> = {
  open: COLOR_POSITIVE,
  minimized: '#806000',
  closed: COLOR_DISABLED,
};

const STATUS_KEY: Record<AppStatus, WindowsKey> = {
  open: 'appmanager.status.open',
  minimized: 'appmanager.status.minimized',
  closed: 'appmanager.status.closed',
};

const SUNKEN_BORDER: React.CSSProperties = {
  border: '2px solid',
  borderColor: '#808080 #ffffff #ffffff #808080',
};

export const AppManagerWindow: React.FC<AppManagerWindowProps> = ({
  apps,
  appContents,
  selectedId,
  onSelect,
  onPopOut,
  onShowAll,
  onMinimizeAll,
  onCloseAll,
  onCascade,
  onTile,
}) => {
  const tw = useWindowsT();
  const selectedApp = apps.find((a) => a.id === selectedId) ?? apps[0] ?? null;

  const counts = apps.reduce(
    (acc, a) => {
      acc[a.status]++;
      return acc;
    },
    { open: 0, minimized: 0, closed: 0 } as Record<AppStatus, number>,
  );
  const hasAnyOpen = counts.open + counts.minimized > 0;
  const hasAnyClosed = counts.closed > 0;

  return (
    <div style={WINDOW_CONTAINER}>
      {/* Bulk actions toolbar */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          flexWrap: 'wrap',
          alignItems: 'center',
          padding: '4px 6px',
          borderBottom: '1px solid #808080',
          background: '#c0c0c0',
          flexShrink: 0,
          ...FONT,
        }}
      >
        <button type="button" onClick={onShowAll} disabled={!hasAnyClosed}>
          {tw('appmanager.showAll')}
        </button>
        <button type="button" onClick={onMinimizeAll} disabled={counts.open === 0}>
          {tw('appmanager.minimizeAll')}
        </button>
        <button type="button" onClick={onCloseAll} disabled={!hasAnyOpen}>
          {tw('appmanager.closeAll')}
        </button>
        <span
          aria-hidden
          style={{
            width: 2,
            height: 16,
            margin: '0 4px',
            borderLeft: '1px solid #808080',
            borderRight: '1px solid #ffffff',
          }}
        />
        <button type="button" onClick={onCascade} disabled={!hasAnyOpen}>
          {tw('appmanager.cascade')}
        </button>
        <button type="button" onClick={onTile} disabled={!hasAnyOpen}>
          {tw('appmanager.tile')}
        </button>
      </div>

      {/* Sidebar + content */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Sidebar */}
        <div
          style={{
            width: 188,
            flexShrink: 0,
            background: '#ffffff',
            overflowY: 'auto',
            borderRight: '1px solid #808080',
          }}
          role="listbox"
          aria-label={tw('appmanager')}
        >
          {apps.map((app) => (
            <SidebarItem
              key={app.id}
              app={app}
              selected={app.id === selectedApp?.id}
              onSelect={() => onSelect(app.id)}
              onActivate={() => onPopOut(app.id)}
            />
          ))}
        </div>

        {/* Right side: header + app content */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            background: '#c0c0c0',
          }}
        >
          {selectedApp ? (
            <>
              <RightHeader app={selectedApp} onPopOut={() => onPopOut(selectedApp.id)} />
              <div style={{ flex: 1, minHeight: 0, overflow: 'hidden', ...SUNKEN_BORDER, margin: 4 }}>
                {appContents[selectedApp.id] ?? <ContentFallback />}
              </div>
            </>
          ) : (
            <div style={{ ...FONT, padding: 16, color: COLOR_SECONDARY }}>
              {tw('appmanager.emptySelection')}
            </div>
          )}
        </div>
      </div>

      {/* Status bar */}
      <div className="status-bar" style={STATUS_BAR_STYLE}>
        <p className="status-bar-field">{tw('appmanager.summaryOpen', { n: counts.open })}</p>
        <p className="status-bar-field">{tw('appmanager.summaryMinimized', { n: counts.minimized })}</p>
        <p className="status-bar-field">{tw('appmanager.summaryClosed', { n: counts.closed })}</p>
      </div>
    </div>
  );
};

/* ─── Sidebar item ────────────────────────────────────────────────────────── */

interface SidebarItemProps {
  app: ManagedApp;
  selected: boolean;
  onSelect: () => void;
  onActivate: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({ app, selected, onSelect, onActivate }) => {
  const tw = useWindowsT();
  const [hover, setHover] = useState(false);
  const bg = selected ? '#000080' : hover ? '#e8e8e8' : 'transparent';
  const fg = selected ? '#ffffff' : '#000000';

  return (
    <div
      role="option"
      aria-selected={selected}
      tabIndex={0}
      onClick={onSelect}
      onDoubleClick={onActivate}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onActivate();
        } else if (e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      style={{
        ...FONT,
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 6px',
        cursor: 'default',
        userSelect: 'none',
        background: bg,
        color: fg,
        outline: 'none',
      }}
      title={`${app.label} — ${tw(STATUS_KEY[app.status])}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={app.iconSrc} alt="" width={16} height={16} style={{ flexShrink: 0 }} />
      <StatusPip status={app.status} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {app.label}
      </span>
    </div>
  );
};

const StatusPip: React.FC<{ status: AppStatus }> = ({ status }) => {
  const filled = status !== 'closed';
  const color = STATUS_COLOR[status];
  return (
    <span
      aria-hidden
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        flexShrink: 0,
        background: filled ? color : 'transparent',
        border: `1px solid ${filled ? color : '#808080'}`,
        boxSizing: 'border-box',
      }}
    />
  );
};

/* ─── Right panel header ──────────────────────────────────────────────────── */

const RightHeader: React.FC<{ app: ManagedApp; onPopOut: () => void }> = ({ app, onPopOut }) => {
  const tw = useWindowsT();
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '4px 6px',
        background: '#c0c0c0',
        borderBottom: '1px solid #808080',
        flexShrink: 0,
        ...FONT,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={app.iconSrc} alt="" width={16} height={16} style={{ flexShrink: 0 }} />
      <span style={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {app.label}
      </span>
      <span aria-hidden style={{ color: STATUS_COLOR[app.status], marginLeft: 4 }}>●</span>
      <span style={{ color: STATUS_COLOR[app.status] }}>{tw(STATUS_KEY[app.status])}</span>
      <button type="button" onClick={onPopOut} style={{ marginLeft: 'auto', minWidth: 130 }}>
        {tw('appmanager.action.popOut')}
      </button>
    </div>
  );
};

/* ─── Fallback content for apps without a renderer ───────────────────────── */

const ContentFallback: React.FC = () => {
  const tw = useWindowsT();
  return (
    <div style={{ ...FONT, padding: 16, color: COLOR_SECONDARY, background: '#ffffff', height: '100%' }}>
      {tw('appmanager.emptySelection')}
    </div>
  );
};
