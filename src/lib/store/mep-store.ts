import { create } from 'zustand';
import { getMEPRate } from '@/app/trading/actions';

interface MepStore {
  mepRate: number;
  lastUpdated: Date | null;
  isLoading: boolean;
  error: string | null;
  fetchMepRate: () => Promise<void>;
}

export const useMepStore = create<MepStore>((set, get) => ({
  mepRate: 1200, // Default fallback
  lastUpdated: null,
  isLoading: false,
  error: null,
  fetchMepRate: async () => {
    // Prevent overlapping fetches
    if (get().isLoading) return;
    
    set({ isLoading: true, error: null });
    try {
      const result = await getMEPRate();
      if (result.success && result.data) {
        set({ 
          mepRate: result.data, 
          lastUpdated: new Date(),
          isLoading: false 
        });
      } else {
        set({ error: result.error || 'Failed to fetch MEP', isLoading: false });
      }
    } catch (err: unknown) {
      set({ error: err instanceof Error ? err.message : 'Unknown error', isLoading: false });
    }
  },
}));
