import React, { useState } from 'react';
import { NewsItem } from '@/lib/market-data';

interface NewsFeedProps {
  generalNews: NewsItem[];
  specificNews: Record<string, NewsItem[]>;
  lastUpdated?: Date | string | number | null;
  onRefresh?: () => void;
  isLoading?: boolean;
  progress?: { current: number; total: number } | null;
}

export const NewsFeed: React.FC<NewsFeedProps> = ({
  generalNews,
  specificNews,
  lastUpdated,
  onRefresh,
  isLoading,
  progress,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'portfolio'>('general');
  const [selectedSymbol, setSelectedSymbol] = useState<string | 'ALL'>('ALL');

  const symbols = Object.keys(specificNews);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {isLoading ? (
        <div className="window-body flex flex-col items-center justify-center">
          {progress ? (
            <div className="w-64">
              <p className="text-sm m-0 mb-2">Processing... {progress.current} / {progress.total}</p>
              <div className="progress-indicator w-full">
                <div
                  className="progress-indicator-bar"
                  style={{ width: `${(progress.current / progress.total) * 100}%` }}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm m-0">Initializing...</p>
          )}
        </div>
      ) : (
        <>
          {onRefresh && (
            <div className="field-row mb-2">
              <button
                type="button"
                onClick={onRefresh}
                disabled={isLoading}
              >
                {isLoading ? '...' : 'Refresh'}
              </button>
              {lastUpdated != null && (
                <span className="text-xs self-center">
                  Updated: {new Date(lastUpdated).toLocaleTimeString()}
                </span>
              )}
            </div>
          )}
          <menu role="tablist" className="m-0">
            <li aria-selected={activeTab === 'general'}>
              <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('general'); }}>General Market</a>
            </li>
            <li aria-selected={activeTab === 'portfolio'}>
              <a href="#" onClick={(e) => { e.preventDefault(); setActiveTab('portfolio'); }}>Portfolio News</a>
            </li>
          </menu>
          <div className="overflow-auto flex-1 min-h-0">
            {activeTab === 'general' ? (
              <div className="field-row-stacked">
                {generalNews.length > 0 ? (
                  generalNews.map((news, i) => (
                    <NewsCard key={i} news={news} badge="MARKET" />
                  ))
                ) : (
                  <p className="italic m-0">No general market news available.</p>
                )}
              </div>
            ) : (
              <div className="field-row-stacked">
                <div className="field-row flex-wrap gap-2 mb-2">
                  <button
                    type="button"
                    className={selectedSymbol === 'ALL' ? 'default' : ''}
                    onClick={() => setSelectedSymbol('ALL')}
                  >
                     ALL
                  </button>
                  {symbols.map(symbol => (
                    <button
                      key={symbol}
                      type="button"
                      className={selectedSymbol === symbol ? 'default' : ''}
                      onClick={() => setSelectedSymbol(symbol)}
                    >
                      {symbol}
                    </button>
                  ))}
                </div>
                {symbols.length > 0 ? (
                  symbols
                    .filter(s => selectedSymbol === 'ALL' || s === selectedSymbol)
                    .flatMap(symbol =>
                      specificNews[symbol].map(news => ({ ...news, symbol }))
                    )
                    .map((news, i) => (
                      <NewsCard key={i} news={news} badge={news.symbol} />
                    ))
                ) : (
                  <p className="italic m-0">No portfolio news available.</p>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

const NewsCard = ({ news, badge }: { news: NewsItem & { symbol?: string }; badge?: string }) => (
  <div className="field-row-stacked mb-3 pb-2 border-b border-gray-300 border-solid">
    <div className="field-row flex-wrap gap-1 items-center">
      {badge && (
        <span className="text-xs px-1 bg-gray-200">{badge}</span>
      )}
      <span className="text-xs">{news.publisher}</span>
      {news.providerPublishTime && (
        <span className="text-xs opacity-75">
          {new Date(news.providerPublishTime).toLocaleDateString()}
        </span>
      )}
    </div>
    <a href={news.link} target="_blank" rel="noopener noreferrer" className="font-bold block">
      {news.title}
    </a>
    {news.summary && (
      <p className="text-sm m-0 italic">{news.summary}</p>
    )}
  </div>
);
