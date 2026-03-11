import React, { useState } from 'react';
import { NewsItem } from '@/lib/market-data';

interface NewsFeedProps {
  generalNews: NewsItem[];
  specificNews: Record<string, NewsItem[]>;
}

export const NewsFeed: React.FC<NewsFeedProps> = ({ generalNews, specificNews }) => {
  const [activeTab, setActiveTab] = useState<'general' | 'portfolio'>('general');
  const [selectedSymbol, setSelectedSymbol] = useState<string | 'ALL'>('ALL');

  const symbols = Object.keys(specificNews);

  return (
    <div className="border-4 border-white bg-black text-white font-mono h-full flex flex-col">
      <div className="flex border-b-4 border-white">
        <button
          onClick={() => setActiveTab('general')}
          className={`flex-1 py-2 font-bold uppercase tracking-wider transition-colors
            ${activeTab === 'general' ? 'bg-white text-black' : 'hover:bg-gray-900'}
          `}
        >
          General Market
        </button>
        <button
          onClick={() => setActiveTab('portfolio')}
          className={`flex-1 py-2 font-bold uppercase tracking-wider transition-colors
            ${activeTab === 'portfolio' ? 'bg-white text-black' : 'hover:bg-gray-900'}
          `}
        >
          Portfolio News
        </button>
      </div>

      <div className="p-4 overflow-y-auto flex-1">
        {activeTab === 'general' ? (
          <div className="space-y-4">
            {generalNews.length > 0 ? (
              generalNews.map((news, i) => (
                <NewsCard key={i} news={news} badge="MARKET" />
              ))
            ) : (
              <p className="text-gray-500 italic">No general market news available.</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedSymbol('ALL')}
                className={`px-3 py-1 text-xs font-bold border-2 border-white uppercase
                  ${selectedSymbol === 'ALL' ? 'bg-neon-green text-black border-neon-green' : 'hover:bg-gray-800'}
                `}
              >
                ALL
              </button>
              {symbols.map(symbol => (
                <button
                  key={symbol}
                  onClick={() => setSelectedSymbol(symbol)}
                  className={`px-3 py-1 text-xs font-bold border-2 border-white uppercase
                    ${selectedSymbol === symbol ? 'bg-neon-green text-black border-neon-green' : 'hover:bg-gray-800'}
                  `}
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
              <p className="text-gray-500 italic">No portfolio news available.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const NewsCard = ({ news, badge }: { news: NewsItem & { symbol?: string }, badge?: string }) => (
  <div className="border-l-4 border-gray-700 pl-4 py-1 hover:border-neon-green transition-colors group">
    <div className="flex items-center gap-2 mb-1">
      {badge && (
        <span className="text-[10px] bg-gray-800 text-gray-300 px-1 py-0.5 font-bold">
          {badge}
        </span>
      )}
      <span className="text-xs text-gray-500 uppercase tracking-wide">
        {news.publisher}
      </span>
      {news.providerPublishTime && (
        <span className="text-xs text-gray-600">
          {new Date(news.providerPublishTime).toLocaleDateString()}
        </span>
      )}
    </div>
    <a 
      href={news.link} 
      target="_blank" 
      rel="noopener noreferrer"
      className="font-bold text-sm hover:text-neon-green hover:underline block mb-1 leading-snug"
    >
      {news.title}
    </a>
    
    {news.summary && (
      <p className="text-xs text-gray-400 mt-2 border-l-2 border-gray-800 pl-2 italic">
        {news.summary}
      </p>
    )}
  </div>
);
