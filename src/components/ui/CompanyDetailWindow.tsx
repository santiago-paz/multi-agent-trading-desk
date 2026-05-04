'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  FONT,
  WINDOW_CONTAINER,
  COLOR_SECONDARY,
  STATUS_BAR_STYLE,
} from '@/lib/theme/win98';
import { useCompanyDetailT } from '@/lib/i18n';
import type { CompanyProfile, IncomeStatementRow, NewsItem } from '@/lib/fmp/types';
import { getCompanyAdvancedData, getCompanyNews, AdvancedDetailResult, type ActionErrorCode } from '@/app/trading/actions';

import { SearchBar } from './company-detail/components/SearchBar';
import { InfoTab } from './company-detail/tabs/InfoTab';
import { ChartsTab } from './company-detail/tabs/ChartsTab';
import { AdvancedTab } from './company-detail/tabs/AdvancedTab';
import { NewsTab } from './company-detail/tabs/NewsTab';

export interface CompanyDetailData {
  fmpTicker: string | null;
  profile: CompanyProfile | null;
  isEtf: boolean;
  noUsEquivalent: boolean;
  priceHistory: { date: string; close: number; volume: number }[];
  incomeStatements: IncomeStatementRow[];
}

interface CompanyDetailWindowProps {
  iolSymbol: string;
  isLoading: boolean;
  error: string | null;
  errorCode?: ActionErrorCode | null;
  data: CompanyDetailData | null;
  onSearch?: (symbol: string) => void;
}

type Tab = 'info' | 'charts' | 'advanced' | 'news';

export const CompanyDetailWindow: React.FC<CompanyDetailWindowProps> = ({
  iolSymbol,
  isLoading,
  error,
  errorCode,
  data,
  onSearch,
}) => {
  const t = useCompanyDetailT();
  const [imgFailed, setImgFailed] = useState(false);
  const [tab, setTab] = useState<Tab>('info');
  const [advData, setAdvData] = useState<AdvancedDetailResult | null>(null);
  const [advLoading, setAdvLoading] = useState(false);
  const advFetchedRef = useRef<string | null>(null);
  const [newsData, setNewsData] = useState<NewsItem[] | null>(null);
  const [newsLoading, setNewsLoading] = useState(false);
  const newsFetchedRef = useRef<string | null>(null);

  // Reset lazy data when company changes
  useEffect(() => {
    if (data?.fmpTicker !== advFetchedRef.current) {
      setAdvData(null);
      advFetchedRef.current = null;
    }
    if (data?.fmpTicker !== newsFetchedRef.current) {
      setNewsData(null);
      newsFetchedRef.current = null;
    }
  }, [data?.fmpTicker]);

  // Lazy-load advanced data when tab is selected
  useEffect(() => {
    if (tab !== 'advanced' || !data?.fmpTicker || data.isEtf) return;
    if (advFetchedRef.current === data.fmpTicker) return;

    let cancelled = false;
    setAdvLoading(true);
    advFetchedRef.current = data.fmpTicker;

    getCompanyAdvancedData(data.fmpTicker).then((result) => {
      if (cancelled) return;
      if (result.success) setAdvData(result.data);
      setAdvLoading(false);
    });

    return () => { cancelled = true; };
  }, [tab, data?.fmpTicker, data?.isEtf]);

  // Lazy-load news when tab is selected
  useEffect(() => {
    if (tab !== 'news' || !data?.fmpTicker) return;
    if (newsFetchedRef.current === data.fmpTicker) return;

    let cancelled = false;
    setNewsLoading(true);
    newsFetchedRef.current = data.fmpTicker;

    getCompanyNews(data.fmpTicker).then((result) => {
      if (cancelled) return;
      if (result.success) setNewsData(result.data);
      setNewsLoading(false);
    });

    return () => { cancelled = true; };
  }, [tab, data?.fmpTicker]);

  if (isLoading) {
    return (
      <div style={WINDOW_CONTAINER}>
        {onSearch && <SearchBar onSearch={onSearch} />}
        <div style={{ padding: '6px' }}>
          <p style={{ ...FONT, margin: 0, padding: '4px' }}>{t('loading', { symbol: iolSymbol })}</p>
        </div>
      </div>
    );
  }

  if (error) {
    const errorText = errorCode ? t(errorCode) : error;
    return (
      <div style={{ ...WINDOW_CONTAINER, padding: '6px' }}>
        <p style={{ ...FONT, margin: 0, padding: '4px', color: '#800000' }}>{errorText}</p>
      </div>
    );
  }

  if (!data) return null;

  if (data.noUsEquivalent) {
    return (
      <div style={{ ...WINDOW_CONTAINER, padding: '6px' }}>
        <div style={{ padding: '12px', textAlign: 'center' }}>
          <p style={{ ...FONT, fontWeight: 'bold', marginBottom: '8px' }}>{iolSymbol}</p>
          <p style={FONT}>{t('noUsEquivalent')}</p>
          <p style={{ ...FONT, color: COLOR_SECONDARY }}>{t('noUsEquivalentSub')}</p>
        </div>
      </div>
    );
  }

  const p = data.profile;
  if (!p) {
    return (
      <div style={{ ...WINDOW_CONTAINER, padding: '6px' }}>
        <p style={{ ...FONT, margin: 0, padding: '4px', color: COLOR_SECONDARY }}>
          {t('noProfile', { symbol: data.fmpTicker ?? iolSymbol })}
        </p>
      </div>
    );
  }

  const hasChartData = data.priceHistory.length > 0 || data.incomeStatements.length > 0;

  return (
    <div style={WINDOW_CONTAINER}>
      {/* Search bar */}
      {onSearch && <SearchBar onSearch={onSearch} />}

      {/* Header */}
      <div style={{ padding: '6px 8px', display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0, borderBottom: '1px solid #808080' }}>
        {p.image && !imgFailed && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={p.image}
            alt=""
            style={{ width: 32, height: 32, objectFit: 'contain', flexShrink: 0 }}
            onError={() => setImgFailed(true)}
          />
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ ...FONT, fontWeight: 'bold', fontSize: '12px' }}>
            {p.companyName}
          </div>
          <div style={{ ...FONT, color: COLOR_SECONDARY, display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span>{data.fmpTicker}</span>
            <span>{p.exchange}</span>
            {data.isEtf && (
              <span style={{
                background: '#000080',
                color: '#fff',
                padding: '0 4px',
                fontSize: '10px',
              }}>
                ETF
              </span>
            )}
          </div>
        </div>
        {p.price > 0 && (
          <div style={{ ...FONT, textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontWeight: 'bold', fontSize: '13px' }}>${p.price.toFixed(2)}</div>
            <div style={{ color: COLOR_SECONDARY, fontSize: '10px' }}>{p.currency}</div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ padding: '6px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <menu role="tablist">
          <li role="tab" aria-selected={tab === 'info'}>
            <a href="#info" onClick={(e) => { e.preventDefault(); setTab('info'); }}>{t('tabs.info')}</a>
          </li>
          {hasChartData && (
            <li role="tab" aria-selected={tab === 'charts'}>
              <a href="#charts" onClick={(e) => { e.preventDefault(); setTab('charts'); }}>{t('tabs.charts')}</a>
            </li>
          )}
          {!data.isEtf && data.fmpTicker && (
            <li role="tab" aria-selected={tab === 'advanced'}>
              <a href="#advanced" onClick={(e) => { e.preventDefault(); setTab('advanced'); }}>{t('tabs.advanced')}</a>
            </li>
          )}
          {data.fmpTicker && (
            <li role="tab" aria-selected={tab === 'news'}>
              <a href="#news" onClick={(e) => { e.preventDefault(); setTab('news'); }}>{t('tabs.news')}</a>
            </li>
          )}
        </menu>

        {/* Tab content */}
        <div className="window" role="tabpanel" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, margin: 0, marginTop: '-1px' }}>
          <div className="window-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', overflowX: 'hidden', minHeight: 0, margin: 0, padding: '6px' }}>
        {tab === 'info' && (
          <InfoTab profile={p} isEtf={data.isEtf} />
        )}

        {tab === 'charts' && (
          <ChartsTab
            priceHistory={data.priceHistory}
            incomeStatements={data.incomeStatements}
            isEtf={data.isEtf}
          />
        )}

        {tab === 'advanced' && (
          <AdvancedTab advLoading={advLoading} advData={advData} />
        )}

        {tab === 'news' && data.fmpTicker && (
          <NewsTab newsLoading={newsLoading} newsData={newsData} fmpTicker={data.fmpTicker} />
        )}
          </div>
        </div>
      </div>

      <div className="status-bar" style={STATUS_BAR_STYLE}>
        <div className="status-bar-field">
          CEDEAR: {iolSymbol} → US: {data.fmpTicker}
        </div>
      </div>
    </div>
  );
};
