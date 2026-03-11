import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { NewsItem } from '@/lib/market-data';
import { getNewsMetadata, enrichNewsItem } from '@/app/trading/actions';

interface NewsState {
  generalNews: NewsItem[];
  specificNews: Record<string, NewsItem[]>;
  lastUpdated: number | null;
  isLoading: boolean;
  progress: { current: number; total: number } | null;
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
      progress: null,
      error: null,

      fetchNews: async (force = false) => {
        const state = get();
        
        if (!force && state.generalNews.length > 0) {
          return;
        }

        set({ isLoading: true, error: null, progress: null });

        try {
          // 1. Fetch Metadata (Fast)
          const metaResult = await getNewsMetadata();
          
          if (!metaResult.success || !metaResult.data) {
            set({ isLoading: false, error: metaResult.error || 'Failed to fetch news metadata' });
            return;
          }

          // Initialize with raw data
          const { general, specific } = metaResult.data;
          
          // Calculate total items to process
          const totalGeneral = general.length;
          const totalSpecific = Object.values(specific).reduce((acc, list) => acc + list.length, 0);
          const totalItems = totalGeneral + totalSpecific;
          
          let processedCount = 0;
          set({ 
            generalNews: general, 
            specificNews: specific,
            progress: { current: 0, total: totalItems }
          });

          // 2. Process Items Queue
          // Create a queue of tasks
          const tasks: { type: 'general' | 'specific', index: number, symbol?: string, item: NewsItem }[] = [];
          
          general.forEach((item, index) => tasks.push({ type: 'general', index, item }));
          Object.entries(specific).forEach(([symbol, items]) => {
            items.forEach((item, index) => tasks.push({ type: 'specific', symbol, index, item }));
          });

          // Process with concurrency limit of 2
          const CONCURRENCY = 2;
          for (let i = 0; i < tasks.length; i += CONCURRENCY) {
            const batch = tasks.slice(i, i + CONCURRENCY);
            
            await Promise.all(batch.map(async (task) => {
              const result = await enrichNewsItem(task.item);
              
              if (result.success && result.data) {
                // Update store with enriched item
                set((prev) => {
                  const newState = { ...prev };
                  if (task.type === 'general') {
                    const newGeneral = [...prev.generalNews];
                    newGeneral[task.index] = result.data;
                    newState.generalNews = newGeneral;
                  } else if (task.type === 'specific' && task.symbol) {
                    const newSpecific = { ...prev.specificNews };
                    const newList = [...newSpecific[task.symbol]];
                    newList[task.index] = result.data;
                    newSpecific[task.symbol] = newList;
                    newState.specificNews = newSpecific;
                  }
                  return newState;
                });
              }
              
              processedCount++;
              set({ progress: { current: processedCount, total: totalItems } });
            }));
          }

          set({ 
            lastUpdated: Date.now(),
            isLoading: false,
            progress: null
          });

        } catch (error) {
          set({ 
            isLoading: false, 
            error: 'An unexpected error occurred during news processing',
            progress: null
          });
        }
      },
    }),
    {
      name: 'news-storage',
    }
  )
);
