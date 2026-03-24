import React, { useState } from 'react';
import { NewsItem } from '@/lib/market-data';
import {
  FONT, COLOR_LINK, COLOR_SECONDARY, COLOR_DISABLED,
  WINDOW_CONTAINER, REFRESH_FOOTER, STATUS_BAR_STYLE,
} from '@/lib/theme/win98';

interface NewsFeedProps {
  generalNews: NewsItem[];
  specificNews: Record<string, NewsItem[]>;
  lastUpdated?: Date | string | number | null;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export const NewsFeed: React.FC<NewsFeedProps> = ({
  generalNews,
  specificNews,
  lastUpdated,
  onRefresh,
  isLoading,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'portfolio'>('general');
  const [selectedSymbol, setSelectedSymbol] = useState<string | 'ALL'>('ALL');

  const symbols = Object.keys(specificNews);
  const portfolioCount = Object.values(specificNews).flat().length;
  const activeCount = activeTab === 'general' ? generalNews.length : portfolioCount;

  return (
    <div style={{ ...WINDOW_CONTAINER, padding: '6px 6px 0 6px' }}>
      {/* Tab strip */}
      <menu role="tablist">
        <li role="tab" aria-selected={activeTab === 'general'}>
          <a href="#general" onClick={(e) => { e.preventDefault(); setActiveTab('general'); }} style={{ textDecoration: 'none' }}>
            General Market
          </a>
        </li>
        <li role="tab" aria-selected={activeTab === 'portfolio'}>
          <a href="#portfolio" onClick={(e) => { e.preventDefault(); setActiveTab('portfolio'); }} style={{ textDecoration: 'none' }}>
            Portfolio News
          </a>
        </li>
      </menu>

      {/* Tab panel */}
      <div
        role="tabpanel"
        style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '4px 0 0 0', gap: '4px' }}
      >
        {isLoading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
            <p style={{ ...FONT, margin: 0 }}>Loading news...</p>
          </div>
        ) : (
          <>
            {activeTab === 'portfolio' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <label style={{ ...FONT }}>Ticker:</label>
                <select
                  value={selectedSymbol}
                  onChange={(e) => setSelectedSymbol(e.target.value as string | 'ALL')}
                  style={{ ...FONT, flex: 1, maxWidth: 200 }}
                >
                  <option value="ALL">ALL ({symbols.length} tickers)</option>
                  {symbols.map(symbol => (
                    <option key={symbol} value={symbol}>
                      {symbol} ({specificNews[symbol].length})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="sunken-panel win98-scrollbar" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '8px', background: '#ffffff' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activeTab === 'general' ? (
                  generalNews.length > 0 ? (
                    generalNews.map((news, i) => (
                      <NewsCard key={i} news={news} badge="MARKET" />
                    ))
                  ) : (
                    <p style={{ ...FONT, margin: 0, color: COLOR_DISABLED }}>No general market news available.</p>
                  )
                ) : (
                  symbols.length > 0 ? (
                    symbols
                      .filter(s => selectedSymbol === 'ALL' || s === selectedSymbol)
                      .flatMap(symbol => specificNews[symbol].map(news => ({ ...news, symbol })))
                      .map((news, i) => (
                        <NewsCard key={i} news={news} badge={news.symbol} />
                      ))
                  ) : (
                    <p style={{ ...FONT, margin: 0, color: COLOR_DISABLED }}>No portfolio news available.</p>
                  )
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Refresh footer — bottom-right */}
      {onRefresh && (
        <div style={REFRESH_FOOTER}>
          <button type="button" onClick={onRefresh} disabled={isLoading}>
            {isLoading ? '...' : 'Refresh'}
          </button>
        </div>
      )}

      {/* Status bar */}
      <div className="status-bar" style={STATUS_BAR_STYLE}>
        <p className="status-bar-field">
          {activeCount} {activeCount === 1 ? 'article' : 'articles'}
        </p>
        {lastUpdated != null && (
          <p className="status-bar-field">
            Updated: {new Date(lastUpdated).toLocaleTimeString()}
          </p>
        )}
      </div>
    </div>
  );
};

const NewsCard = ({ news, badge }: { news: NewsItem & { symbol?: string }; badge?: string }) => (
  <div
    style={{
      display: 'flex',
      gap: '8px',
      paddingBottom: '6px',
      marginBottom: '6px',
      borderBottom: '1px solid #dfdfdf',
    }}
  >
    { }
    {news.image && (
      <img
        src={news.image}
        alt=""
        style={{ width: 64, height: 64, objectFit: 'cover', flexShrink: 0, border: '1px solid #808080' }}
      />
    )}
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
        {badge && <span style={{ ...FONT, fontWeight: 'bold' }}>{badge}</span>}
        <span style={{ ...FONT, color: COLOR_SECONDARY }}>{news.publisher}</span>
        {news.providerPublishTime && (
          <span style={{ ...FONT, color: COLOR_SECONDARY }}>
            {new Date(news.providerPublishTime).toLocaleDateString()}
          </span>
        )}
      </div>
      <a
        href={news.link}
        target="_blank"
        rel="noopener noreferrer"
        style={{ ...FONT, color: COLOR_LINK, textDecoration: 'underline', cursor: 'pointer' }}
      >
        {news.title}
      </a>
      {news.text && (
        <p style={{ ...FONT, margin: 0, lineHeight: '1.2' }}>
          {news.text.length > 200 ? news.text.slice(0, 200) + '...' : news.text}
        </p>
      )}
    </div>
  </div>
);
