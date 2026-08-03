'use client';

import { useRouter } from 'next/navigation';
import { FONT, HR98, STATUS_BAR_STYLE, COLOR_SECONDARY, COLOR_LINK } from '@/lib/theme/win98';
import { DESKTOP_APP_ICONS } from '@/lib/win98se-icons';
import type { AppId } from '@/hooks/useWindowManager';
import { useWindowsT, type WindowsKey } from '@/lib/i18n';

const MODULES: { id: AppId; icon: string; labelKey: WindowsKey; descriptionKey: WindowsKey }[] = [
  { id: 'portfolio',   icon: DESKTOP_APP_ICONS.portfolio,   labelKey: 'icon.portfolio',                 descriptionKey: 'landing.module.portfolio.desc' },
  { id: 'marketdata',  icon: DESKTOP_APP_ICONS.marketdata,  labelKey: 'landing.module.marketdata.label', descriptionKey: 'landing.module.marketdata.desc' },
  { id: 'news',        icon: DESKTOP_APP_ICONS.news,        labelKey: 'icon.news',                       descriptionKey: 'landing.module.news.desc' },
  { id: 'movements',   icon: DESKTOP_APP_ICONS.movements,   labelKey: 'icon.movements',                  descriptionKey: 'landing.module.movements.desc' },
  { id: 'autotrader',  icon: DESKTOP_APP_ICONS.agent,       labelKey: 'icon.autotrader',                 descriptionKey: 'landing.module.autotrader.desc' },
  { id: 'backtesting', icon: DESKTOP_APP_ICONS.backtesting, labelKey: 'icon.backtesting',                descriptionKey: 'landing.module.backtesting.desc' },
];

export default function Home() {
  const router = useRouter();
  const tw = useWindowsT();
  const enterDesktopLabel = tw('landing.enterDesktop');

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
          <div className="title-bar-text">{tw('landing.titleBar')}</div>
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
              <div style={FONT}>{tw('landing.version')}</div>
              <div style={{ ...FONT, color: COLOR_SECONDARY, marginTop: 2 }}>
                Copyright © 2026 CEDEARs Fund
              </div>
            </div>
          </div>

          <hr style={HR98} />

          <p style={{ ...FONT, margin: '4px 2px 10px' }}>
            {tw('landing.tagline')}
          </p>

          <fieldset style={{ margin: '0 0 4px', padding: '6px 10px 8px' }}>
            <legend style={FONT}>{tw('landing.modulesLegend')}</legend>
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
                        {tw(m.labelKey)}
                      </span>
                      <span className="module-link-desc" style={{ color: COLOR_SECONDARY }}> — {tw(m.descriptionKey)}</span>
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
              <u>{enterDesktopLabel.charAt(0)}</u>{enterDesktopLabel.slice(1)}
            </button>
          </section>
        </div>

        <div className="status-bar" style={STATUS_BAR_STYLE}>
          <p className="status-bar-field">{tw('landing.statusReady')}</p>
          <p className="status-bar-field">{tw('landing.statusBroker')}</p>
          <p className="status-bar-field">{tw('landing.statusMarket')}</p>
        </div>
      </div>
    </div>
  );
}
