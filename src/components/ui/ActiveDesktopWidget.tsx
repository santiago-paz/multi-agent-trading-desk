import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FONT, COLOR_LINK, STATUS_BAR_STYLE } from '@/lib/theme/win98';
import { useWindowsT } from '@/lib/i18n';

const DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

const WIKI_RANDOM_SUMMARY = 'https://es.wikipedia.org/api/rest_v1/page/random/summary';

/**
 * Plenty of random Wikipedia articles carry no thumbnail, so draw a handful at once
 * and keep the first illustrated one instead of showing a panel with a hole in it.
 */
const ARTICLE_DRAWS = 4;

/**
 * The panel keeps one height whatever the article is, so the two buttons always sit
 * under the same pixels and you can click them without looking.
 */
const PANEL_HEIGHT = 480;

/**
 * Win98 recessed bevel. A raised bevel plus a navy caption is the system's grammar for
 * "this window moves"; an Active Desktop item is painted into the wallpaper and never
 * moves, so the panel is carved in instead.
 */
const SUNKEN = 'inset -1px -1px #ffffff, inset 1px 1px #808080, inset -2px -2px #dfdfdf, inset 2px 2px #0a0a0a';

/** Etched groove rule, as used by Win98 group boxes to separate a section of a pane. */
const ETCHED_RULE: React.CSSProperties = {
  flex: 1,
  height: 0,
  borderTop: '1px solid #808080',
  borderBottom: '1px solid #ffffff',
};

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
    width?: number;
    height?: number;
  };
}

export function ActiveDesktopWidget() {
  const tw = useWindowsT();
  const [article, setArticle] = useState<WikiSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [oraculoText, setOraculoText] = useState('');
  const [oraculoStreaming, setOraculoStreaming] = useState(false);
  const [oraculoError, setOraculoError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const fetchRandomArticle = useCallback(async () => {
    setLoading(true);
    setError(false);
    setImageFailed(false);
    setOraculoText('');
    setOraculoError(null);
    if (DEMO) {
      const { DEMO_WIKI_TOPICS } = await import('@/lib/demo/oraculo');
      // Never draw the article already on screen, or the button looks broken.
      setArticle((prev) => {
        const pool = DEMO_WIKI_TOPICS.filter((t) => t.title !== prev?.title);
        return pool[Math.floor(Math.random() * pool.length)] as WikiSummary;
      });
      setLoading(false);
      return;
    }
    try {
      const draws = await Promise.allSettled(
        Array.from({ length: ARTICLE_DRAWS }, async () => {
          const response = await fetch(WIKI_RANDOM_SUMMARY);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return (await response.json()) as WikiSummary;
        })
      );
      // One bad draw is survivable; show an error only when every draw failed.
      const summaries = draws.flatMap((d) => (d.status === 'fulfilled' ? [d.value] : []));
      if (summaries.length === 0) throw new Error('Error fetching Wikipedia');
      setArticle(summaries.find((s) => s.thumbnail?.source) ?? summaries[0]);
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

  // The prophecy arrives below the article, which may be scrolled out of sight.
  useEffect(() => {
    if (!oraculoText && !oraculoError) return;
    const body = bodyRef.current;
    if (body) body.scrollTop = body.scrollHeight;
  }, [oraculoText, oraculoError]);

  return (
    <aside
      aria-label={tw('desktop.title')}
      style={{
        ...FONT,
        position: 'absolute',
        right: 20,
        top: 20,
        width: 320,
        height: PANEL_HEIGHT,
        maxHeight: 'calc(100% - 80px)',
        zIndex: 0, // Behind windows
        display: 'flex',
        flexDirection: 'column',
        background: '#c0c0c0',
        boxShadow: SUNKEN,
        padding: 3,
        cursor: 'default',
        pointerEvents: 'auto',
        overflow: 'hidden',
      }}
    >
      {/* Etched label rather than a title bar: there is nothing here to grab. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 4px 0', userSelect: 'none', flexShrink: 0 }}>
        <span style={{ fontWeight: 'bold' }}>{tw('desktop.title')}</span>
        <span aria-hidden="true" style={ETCHED_RULE} />
      </div>

      <div ref={bodyRef} style={{ flex: 1, minHeight: 0, padding: 8, display: 'flex', flexDirection: 'column', overflow: 'auto' }}>
        {article === null && loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{tw('desktop.loading')}</div>
        ) : error ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'red', textAlign: 'center' }}>{tw('desktop.error')}</div>
        ) : article ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: '100%' }}>
            {article.thumbnail && !imageFailed && (
              <div
                style={{
                  background: '#ffffff',
                  boxShadow: SUNKEN,
                  padding: 4,
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  flex: '1 1 auto',
                  minHeight: 120,
                  maxHeight: 240,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={article.thumbnail.source}
                  alt={article.title}
                  width={article.thumbnail.width}
                  height={article.thumbnail.height}
                  onError={() => setImageFailed(true)}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block' }}
                />
              </div>
            )}
            <h3 style={{ margin: 0, fontSize: '11px', fontWeight: 'bold' }}>
              {article.title}
            </h3>
            <p style={{ margin: 0, lineHeight: '1.4' }}>{article.extract}</p>
            {article.content_urls && (
              <a
                href={article.content_urls.desktop.page}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: COLOR_LINK,
                  textDecoration: 'underline',
                  alignSelf: 'flex-start',
                }}
              >
                {tw('desktop.readMore')}
              </a>
            )}

            {/* The live region has to outlive its content, or the prophecy is never announced.
                `display: contents` keeps it out of the layout while it waits. */}
            <div aria-live="polite" style={{ display: 'contents' }}>
              {(oraculoText || oraculoError) && (
                <div
                  style={{
                    marginTop: 'auto',
                    padding: 8,
                    background: '#f5e9c8',
                    boxShadow: SUNKEN,
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
                      {oraculoStreaming && <span aria-hidden="true" style={{ marginLeft: 1 }}>▊</span>}
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>

      {/* Outside the scrolling body on purpose: a long article or a long prophecy must
          not shift the buttons out from under the pointer. */}
      <section
        className="field-row"
        style={{ display: 'flex', gap: 4, justifyContent: 'stretch', flexShrink: 0, padding: '0 8px 8px' }}
      >
        <button
          onClick={consultOracle}
          disabled={oraculoStreaming || loading || !article}
          style={{ flex: 1, minWidth: 0, minHeight: 26 }}
        >
          <span aria-hidden="true" style={{ color: 'initial', textShadow: 'none' }}>{'\u{1F52E}'}</span>
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

      <div className="status-bar" style={STATUS_BAR_STYLE}>
        <p className="status-bar-field">{tw(DEMO ? 'desktop.wikiSourceDemo' : 'desktop.wikiSource')}</p>
      </div>
    </aside>
  );
}
