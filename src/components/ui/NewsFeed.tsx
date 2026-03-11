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
    <div className="flex flex-col flex-1 h-full min-h-0 text-[11px]" style={{ fontFamily: '"Pixelated MS Sans Serif", Tahoma, sans-serif', WebkitFontSmoothing: 'none' }}>
      {/* 98.css tabs (property sheets) - we keep the tabs but remove the outer property sheet box */}
      <menu role="tablist" className="m-0 z-10" style={{ paddingLeft: '2px' }}>
        <li role="tab" aria-selected={activeTab === 'general'}>
          <a href="#general" onClick={(e) => { e.preventDefault(); setActiveTab('general'); }} style={{ textDecoration: 'none' }}>General Market</a>
        </li>
        <li role="tab" aria-selected={activeTab === 'portfolio'}>
          <a href="#portfolio" onClick={(e) => { e.preventDefault(); setActiveTab('portfolio'); }} style={{ textDecoration: 'none' }}>Portfolio News</a>
        </li>
      </menu>

      <div className="m-0 flex-1 flex flex-col gap-2 pt-2" role="tabpanel">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center flex-1">
            {progress ? (
              <div className="w-64 text-center">
                <p className="m-0 mb-2">Processing... {progress.current} / {progress.total}</p>
                <div className="progress-indicator w-full">
                  <div
                    className="progress-indicator-bar"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <p className="m-0">Initializing...</p>
            )}
          </div>
        ) : (
          <>
            {onRefresh && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onRefresh}
                    disabled={isLoading}
                    className="min-w-[60px]"
                  >
                    {isLoading ? '...' : 'Refresh'}
                  </button>
                </div>
                {lastUpdated != null && (
                  <span className="text-[11px]">
                    Updated: {new Date(lastUpdated).toLocaleTimeString()}
                  </span>
                )}
              </div>
            )}

            {activeTab === 'portfolio' && (
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedSymbol('ALL')}
                  style={selectedSymbol === 'ALL' ? { boxShadow: 'inset 1px 1px #0a0a0a, inset -1px -1px #fff, inset 2px 2px #808080, inset -2px -2px #dfdfdf', paddingTop: '3px', paddingLeft: '5px', paddingRight: '3px', paddingBottom: '1px', outline: '1px dotted #000', outlineOffset: '-4px' } : {}}
                >
                   ALL
                </button>
                {symbols.map(symbol => (
                  <button
                    key={symbol}
                    type="button"
                    onClick={() => setSelectedSymbol(symbol)}
                    style={selectedSymbol === symbol ? { boxShadow: 'inset 1px 1px #0a0a0a, inset -1px -1px #fff, inset 2px 2px #808080, inset -2px -2px #dfdfdf', paddingTop: '3px', paddingLeft: '5px', paddingRight: '3px', paddingBottom: '1px', outline: '1px dotted #000', outlineOffset: '-4px' } : {}}
                  >
                    {symbol}
                  </button>
                ))}
              </div>
            )}

            <div className="sunken-panel flex-1 bg-white overflow-y-scroll overflow-x-hidden p-2 win98-scrollbar">
              {activeTab === 'general' ? (
                <div className="flex flex-col gap-2">
                  {generalNews.length > 0 ? (
                    generalNews.map((news, i) => (
                      <NewsCard key={i} news={news} badge="MARKET" />
                    ))
                  ) : (
                    <p className="m-0 text-[#808080] italic">No general market news available.</p>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
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
                    <p className="m-0 text-[#808080] italic">No portfolio news available.</p>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const NewsCard = ({ news, badge }: { news: NewsItem & { symbol?: string }; badge?: string }) => (
  <div className="flex flex-col gap-[2px] pb-[6px] mb-[6px] border-b border-[#dfdfdf] last:border-0 last:pb-0 last:mb-0">
    <div className="flex flex-wrap gap-2 items-center">
      {badge && (
        <span className="font-bold text-black" style={{ backgroundColor: 'transparent' }}>
          {badge}
        </span>
      )}
      <span className="text-black opacity-80">{news.publisher}</span>
      {news.providerPublishTime && (
        <span className="text-black opacity-80">
          {new Date(news.providerPublishTime).toLocaleDateString()}
        </span>
      )}
    </div>
    <a 
      href={news.link} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="text-[#0000ff] hover:text-[#0000ff] underline"
      style={{ textDecorationColor: '#0000ff' }}
    >
      {news.title}
    </a>
    {news.summary && (
      <p className="text-black m-0 leading-[1.2]">{news.summary}</p>
    )}
  </div>
);
