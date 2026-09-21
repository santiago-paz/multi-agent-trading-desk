import React from 'react';
import { COL_SUNKEN, FONT } from '@/lib/theme/win98';
import { useAutoTraderT } from '@/lib/i18n';
import { agentDisplayName } from '@/lib/agent-avatars';
import { AgentAvatar } from '../AgentAvatar';

/**
 * Persona card for any agent that returns prose reasoning and has no bespoke
 * card of its own (Charlie Munger, Ben Graham, Cathie Wood, …). Same layout as
 * the named cards; agents without a portrait get the initials tile.
 */
export function PersonaDetail({ agent, reasoning }: { agent?: string; reasoning: string }) {
  const t = useAutoTraderT();

  if (!reasoning || typeof reasoning !== 'string') return null;

  const name = agentDisplayName(agent);

  return (
    <div style={{ marginTop: 6, marginBottom: 8 }}>
      <strong>{name ? t('detail.agent.analysisTitle', { name }) : t('detail.agent.summary')}</strong>
      <div style={{
        display: 'flex',
        gap: '8px',
        marginTop: '6px',
        ...COL_SUNKEN,
        padding: '8px',
        backgroundColor: '#ffffff'
      }}>
        <AgentAvatar agent={agent} size={48} />
        <div style={{ flex: 1, ...FONT, fontSize: '1.05em', color: '#111', display: 'block', paddingTop: '1px' }}>
          <div style={{ wordBreak: 'break-word', lineHeight: '1.4', whiteSpace: 'normal' }}>
            {reasoning.split('\n').filter(line => line.trim() !== '').map((paragraph, idx, arr) => (
              <i key={idx} style={{ display: 'block', marginBottom: idx < arr.length - 1 ? '8px' : '0' }}>
                {idx === 0 ? '"' : ''}{paragraph.trim()}{idx === arr.length - 1 ? '"' : ''}
              </i>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
