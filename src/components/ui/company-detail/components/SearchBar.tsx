'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FONT, COLOR_SECONDARY } from '@/lib/theme/win98';
import { useCompanyDetailT } from '@/lib/i18n';
import { searchTickerSymbols } from '@/app/trading/actions';
import type { SymbolSearchHit } from '@/lib/fmp/types';

interface SearchBarProps {
  onSearch: (symbol: string) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onSearch }) => {
  const t = useCompanyDetailT();
  const [searchValue, setSearchValue] = useState('');
  const [suggestions, setSuggestions] = useState<SymbolSearchHit[]>([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(0);
  const suggestReqId = useRef(0);

  useEffect(() => {
    const q = searchValue.trim();
    if (!q.length) {
      setSuggestions([]);
      setSuggestOpen(false);
      setSuggestLoading(false);
      return;
    }

    const id = ++suggestReqId.current;
    setSuggestLoading(true);
    const timer = setTimeout(async () => {
      setSuggestOpen(true);
      const res = await searchTickerSymbols(q);
      if (id !== suggestReqId.current) return;
      setSuggestLoading(false);
      if (res.success) {
        setSuggestions(res.data);
        setHighlightIndex(0);
      } else {
        setSuggestions([]);
        setSuggestOpen(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [searchValue]);

  const pickSuggestion = (symbol: string) => {
    const trimmed = symbol.trim().toUpperCase();
    if (trimmed) {
      onSearch(trimmed);
      setSearchValue('');
      setSuggestions([]);
      setSuggestOpen(false);
    }
  };

  const handleSearch = () => {
    if (suggestOpen && suggestions.length > 0) {
      const sym = suggestions[highlightIndex]?.symbol ?? suggestions[0].symbol;
      pickSuggestion(sym);
      return;
    }
    const trimmed = searchValue.trim().toUpperCase();
    if (trimmed) {
      onSearch(trimmed);
      setSearchValue('');
      setSuggestions([]);
      setSuggestOpen(false);
    }
  };

  return (
    <div style={{ padding: '4px 8px', display: 'flex', gap: '4px', flexShrink: 0, borderBottom: '1px solid #808080', alignItems: 'flex-start' }}>
      <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
        <input
          type="text"
          autoComplete="off"
          placeholder={t('search.placeholder')}
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault();
              setSuggestOpen(false);
              return;
            }
            if (suggestOpen && suggestions.length > 0) {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlightIndex((i) => Math.min(i + 1, suggestions.length - 1));
                return;
              }
              if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlightIndex((i) => Math.max(i - 1, 0));
                return;
              }
              if (e.key === 'Enter') {
                e.preventDefault();
                const sym = suggestions[highlightIndex]?.symbol ?? suggestions[0].symbol;
                pickSuggestion(sym);
                return;
              }
            }
            if (e.key === 'Enter') handleSearch();
          }}
          onFocus={() => {
            if (searchValue.trim().length > 0 && suggestions.length > 0) setSuggestOpen(true);
          }}
          onBlur={() => setSuggestOpen(false)}
          style={{ ...FONT, width: '100%', boxSizing: 'border-box', paddingTop: '2px', paddingBottom: '2px', paddingLeft: '4px', paddingRight: '4px' }}
        />
        {suggestOpen && searchValue.trim().length > 0 && (
          <div
            className="sunken-panel"
            role="listbox"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: '100%',
              marginTop: 2,
              zIndex: 100,
              maxHeight: 200,
              overflowY: 'auto',
              background: '#ffffff',
              border: '1px solid #000000',
              boxShadow: '2px 2px 0 rgba(0,0,0,0.15)',
            }}
            onMouseDown={(e) => e.preventDefault()}
          >
            {suggestLoading && (
              <div style={{ ...FONT, padding: '4px 6px', color: COLOR_SECONDARY }}>
                {t('search.searching')}
              </div>
            )}
            {!suggestLoading && suggestions.length === 0 && (
              <div style={{ ...FONT, padding: '4px 6px', color: COLOR_SECONDARY }}>
                {t('search.noMatches')}
              </div>
            )}
            {!suggestLoading &&
              suggestions.map((s, i) => {
                const active = i === highlightIndex;
                return (
                  <div
                    key={`${s.symbol}-${s.exchange}-${i}`}
                    role="option"
                    aria-selected={active}
                    onMouseEnter={() => setHighlightIndex(i)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pickSuggestion(s.symbol);
                    }}
                    style={{
                      ...FONT,
                      padding: '3px 6px',
                      cursor: 'default',
                      userSelect: 'none',
                      background: active ? '#000080' : '#ffffff',
                      color: active ? '#ffffff' : '#000000',
                      borderBottom: i < suggestions.length - 1 ? '1px solid #e0e0e0' : undefined,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}
                  >
                    <div style={{ width: 24, height: 24, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', border: '1px solid #dfdfdf' }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://financialmodelingprep.com/image-stock/${s.symbol}.png`}
                        alt=""
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div>
                        <span style={{ fontWeight: 'bold' }}>{s.symbol}</span>
                        {s.exchange ? (
                          <span style={{ marginLeft: 6, opacity: active ? 0.9 : 1, color: active ? '#dcdcdc' : COLOR_SECONDARY }}>
                            {s.exchange}
                          </span>
                        ) : null}
                        {s.currency ? (
                          <span style={{ marginLeft: 6, opacity: active ? 0.9 : 1, color: active ? '#dcdcdc' : COLOR_SECONDARY }}>
                            · {s.currency}
                          </span>
                        ) : null}
                      </div>
                      <div
                        style={{
                          marginTop: 1,
                          fontSize: '11px',
                          color: active ? '#e8e8e8' : '#404040',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {s.name || '\u2014'}
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
      <button type="button" onClick={handleSearch} style={FONT}>{t('search.go')}</button>
    </div>
  );
};
