import React, { useState, useEffect, useCallback } from 'react';
import { FONT, COLOR_LINK, STATUS_BAR_STYLE } from '@/lib/theme/win98';
import { useWindowsT } from '@/lib/i18n';

interface WikiSummary {
  title: string;
  extract: string;
  content_urls?: {
    desktop: {
      page: string;
    };
  };
  thumbnail?: {
    source: string;
  };
}

export function ActiveDesktopWidget() {
  const tw = useWindowsT();
  const [article, setArticle] = useState<WikiSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [oraculoText, setOraculoText] = useState('');
  const [oraculoStreaming, setOraculoStreaming] = useState(false);
  const [oraculoError, setOraculoError] = useState<string | null>(null);

  const fetchRandomArticle = useCallback(async () => {
    setLoading(true);
    setError(false);
    setOraculoText('');
    setOraculoError(null);
    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
      const { DEMO_WIKI_TOPICS } = await import('@/lib/demo/oraculo');
      const pick = DEMO_WIKI_TOPICS[Math.floor(Math.random() * DEMO_WIKI_TOPICS.length)];
      setArticle(pick as typeof article);
      setLoading(false);
      return;
    }
    try {
      const response = await fetch('https://es.wikipedia.org/api/rest_v1/page/random/summary');
      if (!response.ok) throw new Error('Error fetching Wikipedia');
      const data = await response.json();
      setArticle(data);
    } catch (err) {
      console.error('Failed to load Wikipedia article', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const consultOracle = useCallback(async () => {
    if (!article || oraculoStreaming) return;
    setOraculoText('');
    setOraculoError(null);
    setOraculoStreaming(true);
    try {
      const response = await fetch('/api/oraculo', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title: article.title, extract: article.extract }),
      });

      if (!response.ok || !response.body) {
        const errorBody = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
        throw new Error(errorBody.error ?? `HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split('\n\n');
        buffer = chunks.pop() ?? '';
        for (const chunk of chunks) {
          if (!chunk.startsWith('data: ')) continue;
          const data = chunk.slice(6).trim();
          if (data === '[DONE]') return;
          try {
            const parsed = JSON.parse(data) as { text?: string; error?: string };
            if (parsed.error) {
              setOraculoError(parsed.error);
              return;
            }
            if (parsed.text) {
              setOraculoText((prev) => prev + parsed.text);
            }
          } catch {
            // ignorar líneas malformadas
          }
        }
      }
    } catch (err) {
      setOraculoError(err instanceof Error ? err.message : tw('oraculo.unknownError'));
    } finally {
      setOraculoStreaming(false);
    }
  }, [article, oraculoStreaming, tw]);

  useEffect(() => {
    fetchRandomArticle();
  }, [fetchRandomArticle]);

  return (
    <div
      className="window"
      style={{
        ...FONT,
        position: 'absolute',
        right: 20,
        top: 20,
        width: 320,
        height: 480,
        maxHeight: 'calc(100% - 80px)',
        zIndex: 0, // Behind windows
        display: 'flex',
        flexDirection: 'column',
        pointerEvents: 'auto',
        overflow: 'hidden',
      }}
    >
      <div className="title-bar">
        <div className="title-bar-text">{tw('desktop.title')}</div>
      </div>

      <div style={{ flex: 1, minHeight: 0, padding: 8, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        {article === null && loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{tw('desktop.loading')}</div>
        ) : error ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'red', textAlign: 'center' }}>{tw('desktop.error')}</div>
        ) : article ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: '100%' }}>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '11px', fontWeight: 'bold' }}>
              {article.title}
            </h3>
            {article.thumbnail && (
              <div style={{ textAlign: 'center' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={article.thumbnail.source}
                  alt={article.title}
                  style={{ maxWidth: '100%', maxHeight: '150px', border: '1px solid #000', objectFit: 'contain' }}
                />
              </div>
            )}
            <p style={{ margin: '0 0 8px 0', lineHeight: '1.4' }}>{article.extract}</p>
            {article.content_urls && (
              <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                <a
                  href={article.content_urls.desktop.page}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: COLOR_LINK,
                    textDecoration: 'underline',
                    display: 'inline-block',
                  }}
                >
                  {tw('desktop.readMore')}
                </a>
              </div>
            )}

            <div
              style={{
                marginTop: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: 6,
                paddingBottom: 10,
              }}
            >
              {(oraculoText || oraculoError) && (
                <div
                  style={{
                    padding: 8,
                    background: '#f5e9c8',
                    boxShadow:
                      'inset -1px -1px #fff, inset 1px 1px grey, inset -2px -2px #dfdfdf, inset 2px 2px #0a0a0a',
                    fontStyle: 'italic',
                    lineHeight: 1.4,
                    whiteSpace: 'pre-wrap',
                    color: '#3a2a0a',
                  }}
                >
                  {oraculoError ? (
                    <span style={{ color: '#8b0000' }}>
                      {'\u{1F52E} '}{tw('oraculo.muteErrorMessage', { error: oraculoError })}
                    </span>
                  ) : (
                    <>
                      {'\u{1F52E} '}
                      {oraculoText}
                      {oraculoStreaming && <span style={{ marginLeft: 1 }}>▊</span>}
                    </>
                  )}
                </div>
              )}

              <section
                className="field-row"
                style={{ display: 'flex', gap: 4, justifyContent: 'stretch' }}
              >
                <button
                  onClick={consultOracle}
                  disabled={oraculoStreaming || loading}
                  style={{ flex: 1, minWidth: 0, minHeight: 26 }}
                >
                  <span style={{ color: 'initial', textShadow: 'none' }}>{'\u{1F52E}'}</span>
                  {' '}
                  {oraculoStreaming
                    ? tw('oraculo.stateStreaming')
                    : oraculoText || oraculoError
                      ? tw('oraculo.stateAnother')
                      : tw('oraculo.stateInitial')}
                </button>
                <button
                  onClick={fetchRandomArticle}
                  disabled={loading}
                  style={{ flex: 1, minWidth: 0, minHeight: 26 }}
                >
                  {tw('desktop.anotherArticle')}
                </button>
              </section>
            </div>
          </div>
        ) : null}
      </div>

      <div className="status-bar" style={STATUS_BAR_STYLE}>
        <p className="status-bar-field">{tw('desktop.wikiSource')}</p>
      </div>
    </div>
  );
}
