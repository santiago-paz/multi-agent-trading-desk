import React, { useState, useEffect, useCallback } from 'react';
import { FONT, COLOR_LINK, STATUS_BAR_STYLE } from '@/lib/theme/win98';
import { PlantitaWidget, getStatusBarText } from './plantita';
import { usePlantitaT } from '@/lib/i18n';
import { usePlantitaStore } from '@/lib/store/plantita-store';

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

type Tab = 'wiki' | 'plant';

export function ActiveDesktopWidget() {
  const [activeTab, setActiveTab] = useState<Tab>('wiki');
  const [article, setArticle] = useState<WikiSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const plantitaT = usePlantitaT();
  const currentPlant = usePlantitaStore((s) => s.current);

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
        overflow: 'hidden',
      }}
    >
      <div className="title-bar">
        <div className="title-bar-text">Active Desktop</div>
      </div>

      <div style={{ padding: '6px 6px 0 6px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <menu role="tablist">
          <li role="tab" aria-selected={activeTab === 'wiki'}>
            <a href="#wiki" onClick={(e) => { e.preventDefault(); setActiveTab('wiki'); }}>Wikipedia</a>
          </li>
          <li role="tab" aria-selected={activeTab === 'plant'}>
            <a href="#plant" onClick={(e) => { e.preventDefault(); setActiveTab('plant'); }}>Plantita</a>
          </li>
        </menu>

        <div
          role="tabpanel"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0,
            marginTop: '-2px',
            background: 'silver',
            boxShadow: 'inset -1px -1px #0a0a0a, inset 1px 1px #dfdfdf, inset -2px -2px grey, inset 2px 2px #fff',
            padding: 8,
            position: 'relative',
            zIndex: 2,
            boxSizing: 'border-box',
            overflow: activeTab === 'wiki' ? 'auto' : 'hidden',
          }}
        >
          {activeTab === 'wiki' && (
            article === null && loading ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Cargando datos...</div>
            ) : error ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'red', textAlign: 'center' }}>Error al conectar con Wikipedia.</div>
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
              </div>
            ) : null
          )}

          {activeTab === 'plant' && <PlantitaWidget />}
        </div>
      </div>

      <div className="status-bar" style={STATUS_BAR_STYLE}>
        <p className="status-bar-field">
          {activeTab === 'wiki' ? 'Wikipedia en español' : getStatusBarText(currentPlant, plantitaT)}
        </p>
      </div>
    </div>
  );
}
