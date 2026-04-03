import { useState, useEffect, useCallback } from 'react';
import { Agent } from '../types';

const API_URL = process.env.NEXT_PUBLIC_AI_HEDGE_FUND_API_URL || 'http://localhost:8000';

export function useAgents() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
  const [isLoadingAgents, setIsLoadingAgents] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/hedge-fund/agents`);
        const data = await res.json();
        const agentList: Agent[] = (data.agents || []).sort((a: Agent, b: Agent) => a.order - b.order);
        setAgents(agentList);
        setSelectedAgents(new Set(agentList.slice(0, 3).map(a => a.key)));
      } catch (err) {
        console.error('Failed to fetch agents:', err);
      } finally {
        setIsLoadingAgents(false);
      }
    })();
  }, []);

  const toggleAgent = useCallback((key: string) => {
    setSelectedAgents(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  const selectAllAgents = useCallback(() => {
    setSelectedAgents(new Set(agents.map(a => a.key)));
  }, [agents]);

  const selectNoAgents = useCallback(() => {
    setSelectedAgents(new Set());
  }, []);

  return {
    agents,
    selectedAgents,
    isLoadingAgents,
    toggleAgent,
    selectAllAgents,
    selectNoAgents,
    apiUrl: API_URL,
  };
}
