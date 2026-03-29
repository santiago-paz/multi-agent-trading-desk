import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { NewsItem } from '@/lib/fmp/types';
import { getNewsMetadata } from '@/app/trading/actions';

interface NewsState {
  generalNews: NewsItem[];
  specificNews: Record<string, NewsItem[]>;
  lastUpdated: number | null;
  isLoading: boolean;
  error: string | null;
  fetchNews: (force?: boolean) => Promise<void>;
}

export const useNewsStore = create<NewsState>()(
  persist(
    (set, get) => ({
      generalNews: [],
      specificNews: {},
      lastUpdated: null,
      isLoading: false,
      error: null,

      fetchNews: async (force = false) => {
        const state = get();

        if (!force && state.generalNews.length > 0) {
          return;
        }

        set({ isLoading: true, error: null });

        try {
          const result = await getNewsMetadata();

          if (!result.success || !result.data) {
            set({ isLoading: false, error: result.error || 'Failed to fetch news' });
            return;
          }

          const { general, specific } = result.data;

          set({
            generalNews: general,
            specificNews: specific,
            lastUpdated: Date.now(),
            isLoading: false,
          });

        } catch {
          set({
            isLoading: false,
            error: 'An unexpected error occurred while fetching news',
          });
        }
      },
    }),
    {
      name: 'news-storage',
    }
  )
);
