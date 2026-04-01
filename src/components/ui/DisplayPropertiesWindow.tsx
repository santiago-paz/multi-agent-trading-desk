'use client';

import React, { useState, useCallback } from 'react';
import { FONT, WINDOW_CONTAINER } from '@/lib/theme/win98';
import { useDisplayStore, WALLPAPER_OPTIONS, DisplayMode } from '@/lib/store/display-store';

/* ─── Win98 color palette (same as the Display Properties "Other…" color picker) ── */
const WIN98_COLORS = [
  '#000000', '#800000', '#008000', '#808000', '#000080', '#800080', '#008080', '#c0c0c0',
  '#808080', '#ff0000', '#00ff00', '#ffff00', '#0000ff', '#ff00ff', '#00ffff', '#ffffff',
  '#000040', '#004000', '#004040', '#400000', '#400040', '#404000', '#404040', '#0000c0',
  '#00c000', '#00c0c0', '#c00000', '#c000c0', '#c0c000', '#c08000', '#0040c0', '#4080c0',
  '#008040', '#804000', '#408000', '#408080', '#0080c0', '#0080ff', '#80c0ff', '#c08040',
  '#ff8000', '#c0ff00', '#80ff00', '#00ff80', '#00ffc0', '#80ffff', '#c0ffff', '#ffc0ff',
];

interface DisplayPropertiesWindowProps {
  onClose: () => void;
}

export function DisplayPropertiesWindow({ onClose }: DisplayPropertiesWindowProps) {
  const { wallpaper, backgroundColor, displayMode, setWallpaper, setBackgroundColor, setDisplayMode } = useDisplayStore();

  // Local state for preview (applied on OK/Apply)
  const [localWallpaper, setLocalWallpaper] = useState(wallpaper);
  const [localBgColor, setLocalBgColor] = useState(backgroundColor);
  const [localDisplayMode, setLocalDisplayMode] = useState(displayMode);

  const selectedIndex = WALLPAPER_OPTIONS.findIndex(w => w.url === localWallpaper);

  const applySettings = useCallback(() => {
    setWallpaper(localWallpaper);
    setBackgroundColor(localBgColor);
    setDisplayMode(localDisplayMode);
  }, [localWallpaper, localBgColor, localDisplayMode, setWallpaper, setBackgroundColor, setDisplayMode]);

  const handleOk = useCallback(() => {
    applySettings();
    onClose();
  }, [applySettings, onClose]);

  /* ─── Monitor preview background style ────────────────────────── */
  const previewBg: React.CSSProperties = {
    background: localBgColor,
  };
  if (localWallpaper) {
    previewBg.backgroundImage = `url(${localWallpaper})`;
    switch (localDisplayMode) {
      case 'center':
        previewBg.backgroundRepeat = 'no-repeat';
        previewBg.backgroundPosition = 'center';
        previewBg.backgroundSize = 'auto';
        break;
      case 'tile':
        previewBg.backgroundRepeat = 'repeat';
        previewBg.backgroundPosition = '0 0';
        previewBg.backgroundSize = '30%';
        break;
      case 'stretch':
        previewBg.backgroundRepeat = 'no-repeat';
        previewBg.backgroundPosition = 'center';
        previewBg.backgroundSize = 'cover';
        break;
    }
  }

  return (
    <div style={{ ...WINDOW_CONTAINER, padding: '6px 6px 0 6px' }}>
      {/* Tabs */}
      <menu role="tablist">
        <li role="tab" aria-selected={true}><a href="#background">Background</a></li>
        <li role="tab" aria-selected={false}><a href="#screensaver">Screen Saver</a></li>
        <li role="tab" aria-selected={false}><a href="#appearance">Appearance</a></li>
        <li role="tab" aria-selected={false}><a href="#effects">Effects</a></li>
        <li role="tab" aria-selected={false}><a href="#web">Web</a></li>
        <li role="tab" aria-selected={false}><a href="#settings">Settings</a></li>
      </menu>

      {/* Tab panel */}
      <div className="window" role="tabpanel" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, marginTop: '-1px' }}>
        <div className="window-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, margin: 0, padding: '12px' }}>
          {/* Monitor preview */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
            <div style={{
              width: '180px',
              height: '140px',
              background: '#c0c0c0',
              border: '2px solid #808080',
              borderRadius: '8px 8px 0 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '10px 14px 4px',
            }}>
              {/* Screen area */}
              <div style={{
                width: '100%',
                flex: 1,
                border: '2px inset #808080',
                ...previewBg,
              }} />
              {/* Stand */}
              <div style={{
                width: '40px',
                height: '6px',
                background: '#c0c0c0',
                borderLeft: '1px solid #ffffff',
                borderRight: '1px solid #808080',
                marginTop: '2px',
              }} />
            </div>
          </div>
          {/* Base under the monitor */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '-2px', marginBottom: '8px' }}>
            <div style={{
              width: '100px',
              height: '6px',
              background: '#c0c0c0',
              borderTop: '1px solid #ffffff',
              borderLeft: '1px solid #ffffff',
              borderRight: '1px solid #808080',
              borderBottom: '1px solid #808080',
            }} />
          </div>

          {/* Wallpaper groupbox */}
          <fieldset style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, margin: 0 }}>
            <legend>Wallpaper</legend>
            <div style={{ ...FONT, marginBottom: '4px' }}>Select an HTML Document or a picture:</div>

            <div style={{ display: 'flex', flex: 1, gap: '8px', minHeight: 0 }}>
              {/* Wallpaper list */}
              <div style={{
                flex: 1,
                minHeight: '80px',
                maxHeight: '160px',
                overflowY: 'auto',
                background: '#ffffff',
                border: '1px solid #808080',
                boxShadow: 'inset 1px 1px 0 #0a0a0a, inset -1px -1px 0 #dfdfdf',
              }} className="win98-scrollbar">
                {WALLPAPER_OPTIONS.map((wp, i) => (
                  <div
                    key={wp.name}
                    onClick={() => setLocalWallpaper(wp.url)}
                    style={{
                      ...FONT,
                      padding: '1px 4px',
                      background: i === selectedIndex ? '#000080' : 'transparent',
                      color: i === selectedIndex ? '#ffffff' : '#000000',
                      cursor: 'default',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {wp.url && (
                      <span style={{ width: '16px', height: '16px', flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img
                          src={wp.url}
                          alt=""
                          style={{ width: '14px', height: '14px', objectFit: 'cover', imageRendering: 'pixelated' }}
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      </span>
                    )}
                    {wp.name}
                  </div>
                ))}
              </div>

              {/* Right side controls */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '80px', flexShrink: 0 }}>
                <button type="button" style={{ ...FONT, width: '100%' }}>Browse...</button>
                <button type="button" disabled style={{ ...FONT, width: '100%' }}>Pattern...</button>

                <div style={{ marginTop: 'auto' }}>
                  <div style={{ ...FONT, marginBottom: '2px' }}>Display:</div>
                  <select
                    value={localDisplayMode}
                    onChange={(e) => setLocalDisplayMode(e.target.value as DisplayMode)}
                    style={{ ...FONT, width: '100%' }}
                  >
                    <option value="center">Center</option>
                    <option value="tile">Tile</option>
                    <option value="stretch">Stretch</option>
                  </select>
                </div>
              </div>
            </div>
          </fieldset>

          {/* Background color picker */}
          <fieldset style={{ margin: '8px 0 0' }}>
            <legend>Background color</legend>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '2px',
              maxWidth: '290px',
            }}>
              {WIN98_COLORS.map((color) => (
                <div
                  key={color}
                  onClick={() => setLocalBgColor(color)}
                  title={color}
                  style={{
                    width: '16px',
                    height: '16px',
                    background: color,
                    border: localBgColor === color
                      ? '2px solid #000000'
                      : '1px solid #808080',
                    boxSizing: 'border-box',
                    cursor: 'default',
                  }}
                />
              ))}
            </div>
          </fieldset>
        </div>
      </div>

      {/* Footer buttons */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '6px',
        padding: '6px 0',
        flexShrink: 0,
      }}>
        <button type="button" onClick={handleOk} style={{ ...FONT, minWidth: '75px' }}>OK</button>
        <button type="button" onClick={onClose} style={{ ...FONT, minWidth: '75px' }}>Cancel</button>
        <button type="button" onClick={applySettings} style={{ ...FONT, minWidth: '75px' }}>Apply</button>
      </div>
    </div>
  );
}
