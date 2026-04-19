'use client';

import React from 'react';
import { FONT, COLOR_SECONDARY, COLOR_LINK } from '@/lib/theme/win98';
import { useCompanyDetailT } from '@/lib/i18n';
import type { NewsItem } from '@/lib/fmp/types';

interface NewsTabProps {
  newsLoading: boolean;
  newsData: NewsItem[] | null;
  fmpTicker: string;
}

export const NewsTab: React.FC<NewsTabProps> = ({ newsLoading, newsData, fmpTicker }) => {
  const t = useCompanyDetailT();

  return (
    <>
      {newsLoading && (
        <p style={{ ...FONT, padding: '8px', color: COLOR_SECONDARY }}>{t('news.loading')}</p>
      )}
      {!newsLoading && newsData && newsData.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '4px' }}>
          {newsData.map((news, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: '8px',
                paddingBottom: '6px',
                borderBottom: i < newsData.length - 1 ? '1px solid #dfdfdf' : undefined,
              }}
            >
              {news.image && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={news.image}
                  alt=""
                  style={{ width: 56, height: 56, objectFit: 'cover', flexShrink: 0, border: '1px solid #808080' }}
                />
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
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
                  <p style={{ ...FONT, margin: 0, lineHeight: '1.3' }}>
                    {news.text.length > 180 ? news.text.slice(0, 180) + '...' : news.text}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {!newsLoading && newsData && newsData.length === 0 && (
        <p style={{ ...FONT, padding: '8px', color: COLOR_SECONDARY }}>{t('news.empty', { symbol: fmpTicker })}</p>
      )}
      {!newsLoading && !newsData && (
        <p style={{ ...FONT, padding: '8px', color: COLOR_SECONDARY }}>{t('news.error')}</p>
      )}
    </>
  );
};
