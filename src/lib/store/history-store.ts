import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { HistoricalRun } from '@/components/ui/auto-trader/types';

const MAX_RUNS = 50;

interface HistoryState {
  runs: HistoricalRun[];
  addRun: (run: HistoricalRun) => void;
  updateRun: (id: string, patch: Partial<HistoricalRun>) => void;
  deleteRun: (id: string) => void;
  clearAll: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set) => ({
      runs: [],

      addRun: (run) =>
        set((state) => ({
          runs: [run, ...state.runs].slice(0, MAX_RUNS),
        })),

      updateRun: (id, patch) =>
        set((state) => ({
          runs: state.runs.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),

      deleteRun: (id) =>
        set((state) => ({
          runs: state.runs.filter((r) => r.id !== id),
        })),

      clearAll: () => set({ runs: [] }),
    }),
    {
      name: 'autotrader-history',
    },
  ),
);
