import React, { useState, useEffect, useCallback } from 'react';
import { FONT, COLOR_LINK, SCROLLABLE_BODY, WINDOW_CONTAINER, STATUS_BAR_STYLE } from '@/lib/theme/win98';

interface WikiSummary {
  title: string;
  extract: string;
  content_urls: {
    desktop: {
      page: string;
    };
  };
  thumbnail?: {
    source: string;
  };
}

export function ActiveDesktopWidget() {
  const [article, setArticle] = useState<WikiSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchRandomArticle = useCallback(async () => {
    setLoading(true);
    setError(false);
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
      }}
    >
      <div className="title-bar">
        <div className="title-bar-text">Active Desktop</div>
      </div>

      <div className="window-body" style={{ ...SCROLLABLE_BODY, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {loading ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Cargando datos...</div>
        ) : error ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'red', textAlign: 'center' }}>Error al conectar con Wikipedia.</div>
        ) : article ? (
          <>
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
                Leer más en Wikipedia
              </a>
            </div>
            
            <section className="field-row" style={{ justifyContent: 'center', marginTop: 'auto' }}>
              <button onClick={fetchRandomArticle} disabled={loading} style={{ width: '100%' }}>
                Otro artículo aleatorio
              </button>
            </section>
          </>
        ) : null}
      </div>

      <div className="status-bar" style={STATUS_BAR_STYLE}>
        <p className="status-bar-field">Wikipedia en español</p>
      </div>
    </div>
  );
}
