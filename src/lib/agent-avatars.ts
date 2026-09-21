/**
 * Pixel-art portraits for the persona agents, served from `public/`.
 *
 * The backend sends agent ids either bare (`warren_buffett`) or suffixed
 * (`warren_buffett_agent`), so every lookup goes through `agentAvatar`.
 * Agents without a portrait fall back to an initials tile (see
 * `agentInitials`), so the UI never has a hole where a face should be.
 */

export const AGENT_AVATARS: Record<string, string> = {
  warren_buffett: '/warren.png',
  stanley_druckenmiller: '/stanley.png',
  rakesh_jhunjhunwala: '/rakesh.png',
  phil_fisher: '/phil.png',
  peter_lynch: '/peter.png',
  mohnish_pabrai: '/mohnish.png',
};

/** Strips the optional `_agent` suffix the backend appends to some node ids. */
export function normalizeAgentKey(agent: string | undefined): string {
  if (!agent) return '';
  return agent.endsWith('_agent') ? agent.slice(0, -'_agent'.length) : agent;
}

/** Portrait path for an agent id, or null when we have no picture for it. */
export function agentAvatar(agent: string | undefined): string | null {
  return AGENT_AVATARS[normalizeAgentKey(agent)] ?? null;
}

/** `warren_buffett` → `Warren Buffett`. */
export function agentDisplayName(agent: string | undefined): string {
  return normalizeAgentKey(agent)
    .split('_')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

/** Up to two letters for the fallback tile: `ben_graham` → `BG`. */
export function agentInitials(agent: string | undefined): string {
  const words = normalizeAgentKey(agent).split('_').filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}
