'use client';

import React from 'react';
import { FONT, COLOR_SECONDARY, COLOR_NEGATIVE, COLOR_DISABLED } from '@/lib/theme/win98';
import { useAutoTraderT } from '@/lib/i18n';

export interface AgentOption {
  key: string;
  display_name: string;
  description: string;
}

interface AgentSelectorProps {
  agents: AgentOption[];
  selectedAgents: Set<string>;
  onToggle: (key: string) => void;
  onSelectAll: () => void;
  onSelectNone: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  /** Text shown when the agent list cannot be loaded. */
  errorText?: string;
  /** Prefix for checkbox input IDs to avoid collisions. */
  idPrefix?: string;
}

export function AgentSelector({
  agents,
  selectedAgents,
  onToggle,
  onSelectAll,
  onSelectNone,
  isLoading = false,
  disabled = false,
  errorText,
  idPrefix = 'agent',
}: AgentSelectorProps) {
  const t = useAutoTraderT();
  const resolvedError = errorText ?? t('config.agents.error', { url: '' });

  if (isLoading) {
    return (
      <fieldset style={{ marginBottom: '6px' }}>
        <legend>{t('agents.title')}</legend>
        <p style={{ ...FONT, color: COLOR_DISABLED, margin: 0 }}>{t('agents.loading')}</p>
      </fieldset>
    );
  }

  if (agents.length === 0) {
    return (
      <fieldset style={{ marginBottom: '6px' }}>
        <legend>{t('agents.title')}</legend>
        <p style={{ ...FONT, color: COLOR_NEGATIVE, margin: 0 }}>{resolvedError}</p>
      </fieldset>
    );
  }

  return (
    <fieldset style={{ marginBottom: '6px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <legend>{t('agents.title')}</legend>

      <div style={{ marginBottom: '4px', display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
        <button onClick={onSelectAll} disabled={disabled}>{t('agents.selectAll')}</button>
        <button onClick={onSelectNone} disabled={disabled}>{t('agents.selectNone')}</button>
        <span style={{ ...FONT, color: COLOR_SECONDARY, marginLeft: '4px' }}>
          {t('agents.selected', { count: selectedAgents.size, s: selectedAgents.size !== 1 ? 's' : '' })}
        </span>
      </div>

      <div
        className="sunken-panel win98-scrollbar"
        style={{ flex: 1, overflowY: 'auto', padding: '2px', minHeight: 0 }}
      >
        {agents.map(agent => {
          const selected = selectedAgents.has(agent.key);
          const inputId = `${idPrefix}-${agent.key}`;
          return (
            <div className="field-row" key={agent.key} style={{ padding: '1px 2px' }}>
              <input
                id={inputId}
                type="checkbox"
                checked={selected}
                onChange={() => onToggle(agent.key)}
                disabled={disabled}
              />
              <label
                htmlFor={inputId}
                title={agent.description}
                style={{
                  padding: '1px 3px',
                  cursor: 'inherit',
                  ...(selected && !disabled
                    ? { backgroundColor: '#000080', color: '#ffffff' }
                    : {}),
                }}
              >
                {agent.display_name}
              </label>
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}
