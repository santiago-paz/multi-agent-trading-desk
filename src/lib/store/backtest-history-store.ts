import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { HistoricalBacktestRun } from '@/lib/backtesting/types';

// Each run can be heavy (one entry per simulated day with decisions/prices),
// so cap lower than the auto-trader history to stay within the localStorage quota.
const MAX_RUNS = 20;

interface BacktestHistoryState {
  runs: HistoricalBacktestRun[];
  addRun: (run: HistoricalBacktestRun) => void;
  deleteRun: (id: string) => void;
  clearAll: () => void;
}

export const useBacktestHistoryStore = create<BacktestHistoryState>()(
  persist(
    (set) => ({
      runs: [],

      addRun: (run) =>
        set((state) => ({
          runs: [run, ...state.runs].slice(0, MAX_RUNS),
        })),

      deleteRun: (id) =>
        set((state) => ({
          runs: state.runs.filter((r) => r.id !== id),
        })),

      clearAll: () => set({ runs: [] }),
    }),
    {
      name: 'backtest-history',
    },
  ),
);
