import React from 'react';
import { FONT } from '@/lib/theme/win98';
import { agentAvatar, agentDisplayName, agentInitials } from '@/lib/agent-avatars';

/**
 * Square portrait for a persona agent, framed like a Win98 sunken thumbnail.
 * Agents we have no picture for get an initials tile of the same size, so a
 * list of agents stays aligned whichever ones the user picked.
 */
export function AgentAvatar({ agent, size = 24 }: { agent?: string; size?: number }) {
  const src = agentAvatar(agent);
  const name = agentDisplayName(agent);

  const frame: React.CSSProperties = {
    width: size,
    height: size,
    flexShrink: 0,
    border: '2px solid #dfdfdf',
    borderBottomColor: '#808080',
    borderRightColor: '#808080',
  };

  if (src) {
    return <img src={src} alt={name} title={name} style={{ ...frame, imageRendering: 'pixelated' }} />;
  }

  return (
    <div
      title={name}
      aria-label={name}
      style={{
        ...frame,
        ...FONT,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#c0c0c0',
        color: '#000080',
        fontWeight: 'bold',
        fontSize: Math.max(8, Math.round(size * 0.4)),
        userSelect: 'none',
      }}
    >
      {agentInitials(agent)}
    </div>
  );
}
