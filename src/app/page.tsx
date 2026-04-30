'use client';

import { useRouter } from 'next/navigation';
import { FONT, HR98, STATUS_BAR_STYLE, COLOR_SECONDARY, COLOR_LINK } from '@/lib/theme/win98';
import { DESKTOP_APP_ICONS } from '@/lib/win98se-icons';
import type { AppId } from '@/hooks/useWindowManager';

const MODULES: { id: AppId; icon: string; label: string; description: string }[] = [
  { id: 'portfolio',   icon: DESKTOP_APP_ICONS.portfolio,   label: 'Portafolio',       description: 'Tenencias, cuenta y resumen consolidado' },
  { id: 'marketdata',  icon: DESKTOP_APP_ICONS.marketdata,  label: 'Datos de mercado', description: 'OHLCV histórico y sparklines en vivo' },
  { id: 'news',        icon: DESKTOP_APP_ICONS.news,        label: 'Noticias',         description: 'Feed con análisis de sentimiento' },
  { id: 'movements',   icon: DESKTOP_APP_ICONS.movements,   label: 'Movimientos',      description: 'Operaciones recientes del bróker' },
  { id: 'autotrader',  icon: DESKTOP_APP_ICONS.agent,       label: 'Auto Trader',      description: 'Decisiones multi-agente impulsadas por IA' },
  { id: 'backtesting', icon: DESKTOP_APP_ICONS.backtesting, label: 'Backtesting',      description: 'Motor de pruebas de estrategias' },
];

export default function Home() {
  const router = useRouter();

  const openModule = (id: AppId) => router.push(`/trading?open=${id}`);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#008080',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 16px',
      }}
    >
      <div className="window" style={{ width: 460 }}>
        <div className="title-bar">
          <div className="title-bar-text">CEDEAR.AI - Sistema de Gestión Automatizada</div>
          <div className="title-bar-controls">
            <button aria-label="Close" />
          </div>
        </div>

        <div className="window-body" style={{ ...FONT, margin: 8 }}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '4px 2px' }}>
            <img
              src={DESKTOP_APP_ICONS.marketdata}
              alt=""
              width={48}
              height={48}
              style={{ flexShrink: 0, imageRendering: 'pixelated' }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  ...FONT,
                  fontSize: '22px',
                  fontWeight: 700,
                  letterSpacing: '1px',
                  lineHeight: 1,
                  marginBottom: 4,
                }}
              >
                CEDEAR.AI
              </div>
              <div style={FONT}>Versión 1.0 · Build 2026.04</div>
              <div style={{ ...FONT, color: COLOR_SECONDARY, marginTop: 2 }}>
                Copyright © 2026 CEDEARs Fund
              </div>
            </div>
          </div>

          <hr style={HR98} />

          <p style={{ ...FONT, margin: '4px 2px 10px' }}>
            Plataforma automatizada para operar CEDEARs en InvertirOnline, con análisis de mercado
            e inteligencia artificial integrados en un escritorio estilo Windows 98.
          </p>

          <fieldset style={{ margin: '0 0 4px', padding: '6px 10px 8px' }}>
            <legend style={FONT}>Módulos del sistema</legend>
            <ul style={{ ...FONT, listStyle: 'none', margin: 0, padding: 0 }}>
              {MODULES.map((m) => (
                <li key={m.id} style={{ padding: '1px 0' }}>
                  <button
                    type="button"
                    onClick={() => openModule(m.id)}
                    className="module-link"
                    style={{
                      ...FONT,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      width: '100%',
                      padding: '2px 4px',
                      background: 'transparent',
                      border: 'none',
                      boxShadow: 'none',
                      textAlign: 'left',
                      minHeight: 0,
                      minWidth: 0,
                    }}
                  >
                    <img
                      src={m.icon}
                      alt=""
                      width={16}
                      height={16}
                      style={{ flexShrink: 0, imageRendering: 'pixelated' }}
                    />
                    <span>
                      <span
                        className="module-link-label"
                        style={{
                          color: COLOR_LINK,
                          textDecoration: 'underline',
                          fontWeight: 700,
                        }}
                      >
                        {m.label}
                      </span>
                      <span className="module-link-desc" style={{ color: COLOR_SECONDARY }}> — {m.description}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </fieldset>

          <section
            className="field-row"
            style={{ justifyContent: 'flex-end', marginTop: 12, gap: 6 }}
          >
            <button
              className="default"
              type="button"
              style={{ minWidth: 110 }}
              onClick={() => router.push('/trading')}
            >
              <u>I</u>ngresar al Escritorio
            </button>
          </section>
        </div>

        <div className="status-bar" style={STATUS_BAR_STYLE}>
          <p className="status-bar-field">Listo</p>
          <p className="status-bar-field">Bróker: InvertirOnline</p>
          <p className="status-bar-field">Mercado: BCBA</p>
        </div>
      </div>
    </div>
  );
}
