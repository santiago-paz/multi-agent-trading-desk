// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { NewsItem } from '@/lib/fmp/types';

const getNewsMetadata = vi.fn<() => Promise<{
  success: boolean;
  data?: { general: NewsItem[]; specific: Record<string, NewsItem[]> };
  error?: string;
}>>();

vi.mock('@/app/trading/actions', () => ({ getNewsMetadata }));

const { useNewsStore } = await import('./news-store');

function makeNews(title: string): NewsItem {
  return {
    title,
    publishedDate: '2026-05-04',
    text: '',
    url: 'https://example.com',
    image: '',
    site: 'example',
    symbol: 'AAPL',
  } as unknown as NewsItem;
}

describe('useNewsStore', () => {
  beforeEach(() => {
    localStorage.clear();
    getNewsMetadata.mockReset();
    useNewsStore.setState({
      generalNews: [],
      specificNews: {},
      lastUpdated: null,
      isLoading: false,
      error: null,
    });
  });

  it('starts empty', () => {
    const s = useNewsStore.getState();
    expect(s.generalNews).toEqual([]);
    expect(s.specificNews).toEqual({});
    expect(s.lastUpdated).toBeNull();
  });

  it('populates general and specific news on success', async () => {
    getNewsMetadata.mockResolvedValueOnce({
      success: true,
      data: {
        general: [makeNews('headline')],
        specific: { AAPL: [makeNews('aapl item')] },
      },
    });
    await useNewsStore.getState().fetchNews();
    const s = useNewsStore.getState();
    expect(s.generalNews).toHaveLength(1);
    expect(s.specificNews.AAPL).toHaveLength(1);
    expect(s.lastUpdated).toBeTypeOf('number');
    expect(s.isLoading).toBe(false);
  });

  it('skips fetch when news already loaded and force=false', async () => {
    useNewsStore.setState({ generalNews: [makeNews('cached')] });
    await useNewsStore.getState().fetchNews();
    expect(getNewsMetadata).not.toHaveBeenCalled();
  });

  it('refetches when force=true even with cached news', async () => {
    useNewsStore.setState({ generalNews: [makeNews('old')] });
    getNewsMetadata.mockResolvedValueOnce({
      success: true,
      data: { general: [makeNews('fresh')], specific: {} },
    });
    await useNewsStore.getState().fetchNews(true);
    expect(getNewsMetadata).toHaveBeenCalledTimes(1);
    expect(useNewsStore.getState().generalNews[0].title).toBe('fresh');
  });

  it('sets error when action returns success=false', async () => {
    getNewsMetadata.mockResolvedValueOnce({ success: false, error: 'FMP rate limit' });
    await useNewsStore.getState().fetchNews();
    const s = useNewsStore.getState();
    expect(s.error).toBe('FMP rate limit');
    expect(s.isLoading).toBe(false);
  });

  it('sets a generic error when the action throws', async () => {
    getNewsMetadata.mockRejectedValueOnce(new Error('boom'));
    await useNewsStore.getState().fetchNews();
    const s = useNewsStore.getState();
    expect(s.error).toBe('An unexpected error occurred while fetching news');
    expect(s.isLoading).toBe(false);
  });
});
