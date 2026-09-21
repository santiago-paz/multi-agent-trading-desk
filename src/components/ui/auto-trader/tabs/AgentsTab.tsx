import React, { useState } from 'react';
import { FONT, COLOR_SECONDARY, COLOR_NEGATIVE, COLOR_DISABLED } from '@/lib/theme/win98';
import type { Agent } from '../types';
import { PAGE } from '../components/Page';
import { useAutoTraderT } from '@/lib/i18n';

interface AgentsTabProps {
  agents: Agent[];
  selectedAgents: Set<string>;
  toggleAgent: (key: string) => void;
  selectAllAgents: () => void;
  selectNoAgents: () => void;
  isLoadingAgents: boolean;
  apiUrl: string;
  /** True while an analysis runs: the pick is frozen, like a disabled list box. */
  disabled: boolean;
}

/**
 * The Windows Setup idiom: a checklist of components on the left, Select All /
 * Select None stacked at the upper right, a count under the list, and a
 * Description box for the highlighted item. Clicking a name highlights it and
 * shows its description; the box (or a double-click on the name) toggles it.
 */
export function AgentsTab({
  agents,
  selectedAgents,
  toggleAgent,
  selectAllAgents,
  selectNoAgents,
  isLoadingAgents,
  apiUrl,
  disabled,
}: AgentsTabProps) {
  const t = useAutoTraderT();
  const [focusedKey, setFocusedKey] = useState<string | null>(null);
  const [keyboardKey, setKeyboardKey] = useState<string | null>(null);
  const focused = agents.find(a => a.key === focusedKey) ?? null;
  const listEmpty = agents.length === 0;

  return (
    <div style={PAGE}>
      <fieldset style={{ margin: 0, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <legend>{t('agents.title')}</legend>
        <div style={{ ...FONT, marginBottom: 6, flexShrink: 0 }}>{t('agents.intro')}</div>

        <div style={{ display: 'flex', gap: 8, flex: 1, minHeight: 0 }}>
          <div className="sunken-panel win98-scrollbar" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 2, margin: 0 }}>
            {isLoadingAgents ? (
              <div style={{ ...FONT, padding: '2px 4px', color: COLOR_DISABLED }}>{t('agents.pick.loading')}</div>
            ) : listEmpty ? (
              <div style={{ ...FONT, padding: '2px 4px', color: COLOR_NEGATIVE }}>{t('agents.pick.error', { url: apiUrl })}</div>
            ) : agents.map(agent => {
              const checked = selectedAgents.has(agent.key);
              const isFocused = agent.key === focusedKey;
              const inputId = `at-agent-${agent.key}`;
              return (
                <div
                  key={agent.key}
                  onClick={() => setFocusedKey(agent.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '2px 3px',
                    background: isFocused ? '#000080' : 'transparent',
                    color: isFocused ? '#ffffff' : (disabled ? COLOR_DISABLED : 'inherit'),
                    cursor: 'default',
                    userSelect: 'none',
                    // Win98 draws the dotted focus rectangle over the selected item.
                    outline: keyboardKey === agent.key ? '1px dotted #ffffff' : 'none',
                    outlineOffset: -1,
                  }}
                >
                  <input
                    id={inputId}
                    type="checkbox"
                    checked={checked}
                    disabled={disabled}
                    onChange={() => toggleAgent(agent.key)}
                    onFocus={() => { setFocusedKey(agent.key); setKeyboardKey(agent.key); }}
                    onBlur={() => setKeyboardKey(k => (k === agent.key ? null : k))}
                  />
                  {/* Empty label: 98.css draws the box inside the label's 19px left margin, so the
                      name can be a separate click target. Keep that margin, or the box is clipped. */}
                  <label htmlFor={inputId} aria-label={agent.display_name} style={{ height: 13, width: 0, outline: 'none' }} />
                  <span
                    style={FONT}
                    onDoubleClick={() => { if (!disabled) toggleAgent(agent.key); }}
                  >
                    {agent.display_name}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
            <button onClick={selectAllAgents} disabled={disabled || listEmpty}>{t('agents.pick.selectAll')}</button>
            <button onClick={selectNoAgents} disabled={disabled || listEmpty}>{t('agents.pick.selectNone')}</button>
          </div>
        </div>

        <div style={{ ...FONT, marginTop: 6, flexShrink: 0 }}>
          {t('agents.pick.count', { selected: selectedAgents.size, total: agents.length })}
        </div>
      </fieldset>

      <fieldset style={{ margin: 0, flexShrink: 0 }}>
        <legend>{t('agents.description.title')}</legend>
        <div style={{ ...FONT, minHeight: 28, lineHeight: '14px' }}>
          {focused ? (
            <>
              <div>{focused.description}</div>
              <div style={{ color: COLOR_SECONDARY, marginTop: 4 }}>
                {t('agents.description.style', { style: focused.investing_style.replace(/_/g, ' ') })}
              </div>
            </>
          ) : (
            <div style={{ color: COLOR_SECONDARY }}>{t('agents.description.empty')}</div>
          )}
        </div>
      </fieldset>
    </div>
  );
}
