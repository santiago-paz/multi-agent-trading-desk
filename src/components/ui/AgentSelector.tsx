'use client';

import React from 'react';
import { FONT, COLOR_SECONDARY, COLOR_NEGATIVE, COLOR_DISABLED } from '@/lib/theme/win98';

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
  errorText = 'No se pudo conectar al servidor AI Hedge Fund',
  idPrefix = 'agent',
}: AgentSelectorProps) {
  if (isLoading) {
    return (
      <fieldset style={{ marginBottom: '6px' }}>
        <legend>Agentes de inversión</legend>
        <p style={{ ...FONT, color: COLOR_DISABLED, margin: 0 }}>Cargando agentes...</p>
      </fieldset>
    );
  }

  if (agents.length === 0) {
    return (
      <fieldset style={{ marginBottom: '6px' }}>
        <legend>Agentes de inversión</legend>
        <p style={{ ...FONT, color: COLOR_NEGATIVE, margin: 0 }}>{errorText}</p>
      </fieldset>
    );
  }

  return (
    <fieldset style={{ marginBottom: '6px' }}>
      <legend>Agentes de inversión</legend>

      <div style={{ marginBottom: '4px', display: 'flex', gap: '4px', alignItems: 'center' }}>
        <button onClick={onSelectAll} disabled={disabled}>Todos</button>
        <button onClick={onSelectNone} disabled={disabled}>Ninguno</button>
        <span style={{ ...FONT, color: COLOR_SECONDARY, marginLeft: '4px' }}>
          {selectedAgents.size} seleccionado{selectedAgents.size !== 1 ? 's' : ''}
        </span>
      </div>

      <div
        className="sunken-panel win98-scrollbar"
        style={{ maxHeight: '130px', overflowY: 'auto', padding: '2px' }}
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
                  ...(selected
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
