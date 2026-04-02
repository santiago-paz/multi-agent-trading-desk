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
  const { wallpaper, backgroundColor, displayMode, customWallpapers, addCustomWallpaper, setWallpaper, setBackgroundColor, setDisplayMode } = useDisplayStore();

  const baseStateRef = React.useRef({ wallpaper, backgroundColor, displayMode });
  const isOkRef = React.useRef(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Local state for preview
  const [localWallpaper, setLocalWallpaper] = useState(wallpaper);
  const [localBgColor, setLocalBgColor] = useState(backgroundColor);
  const [localDisplayMode, setLocalDisplayMode] = useState(displayMode);
  const [isUploading, setIsUploading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const ALL_WALLPAPERS = React.useMemo(() => [...customWallpapers, ...WALLPAPER_OPTIONS], [customWallpapers]);
  const selectedIndex = ALL_WALLPAPERS.findIndex(w => w.url === localWallpaper);

  // Apply immediately to global state when local state changes
  React.useEffect(() => {
    setWallpaper(localWallpaper);
    setBackgroundColor(localBgColor);
    setDisplayMode(localDisplayMode);
    
    // Evaluate if there are actual changes to enable the "Apply" button
    setHasChanges(
      localWallpaper !== baseStateRef.current.wallpaper ||
      localBgColor !== baseStateRef.current.backgroundColor ||
      localDisplayMode !== baseStateRef.current.displayMode
    );
  }, [localWallpaper, localBgColor, localDisplayMode, setWallpaper, setBackgroundColor, setDisplayMode]);

  // Cleanup: revert if we didn't confirm via OK
  React.useEffect(() => {
    return () => {
      if (!isOkRef.current) {
        setWallpaper(baseStateRef.current.wallpaper);
        setBackgroundColor(baseStateRef.current.backgroundColor);
        setDisplayMode(baseStateRef.current.displayMode);
      }
    };
  }, [setWallpaper, setBackgroundColor, setDisplayMode]);

  const applySettings = useCallback(() => {
    baseStateRef.current = {
      wallpaper: localWallpaper,
      backgroundColor: localBgColor,
      displayMode: localDisplayMode,
    };
    setHasChanges(false);
  }, [localWallpaper, localBgColor, localDisplayMode]);

  const handleOk = useCallback(() => {
    isOkRef.current = true;
    onClose();
  }, [onClose]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
    
    const file = event.target.files[0];
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Using dynamic import so it doesn't break client components if server actions are tightly coupled
      const { uploadWallpaperAction } = await import('@/app/actions/upload-wallpaper');
      const result = await uploadWallpaperAction(formData);

      if (result.success && result.url) {
        const newWallpaper = { name: result.name, url: result.url };
        addCustomWallpaper(newWallpaper);
        setLocalWallpaper(result.url); // Automatically select it
      }
    } catch (error) {
      console.error('Failed to upload wallpaper', error);
      alert('Error uploading wallpaper.');
    } finally {
      setIsUploading(false);
      // Reset input so the same file could be uploaded again if needed
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  /* ─── Monitor preview background style ────────────────────────── */
  const previewBg: React.CSSProperties = {
    backgroundColor: localBgColor, // Fixed warning: don't use shorthand 'background'
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
        <div className="window-body win98-scrollbar" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, margin: 0, padding: '12px', overflowY: 'auto', overflowX: 'hidden' }}>
          {/* Monitor preview */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '8px' }}>
            <div style={{
              width: '160px',
              height: '120px',
              backgroundColor: '#c0c0c0', // Fixed warning
              border: '2px solid #808080',
              borderRadius: '8px 8px 0 0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '8px 12px 4px',
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
                width: '36px',
                height: '6px',
                backgroundColor: '#c0c0c0', // Fixed warning
                borderLeft: '1px solid #ffffff',
                borderRight: '1px solid #808080',
                marginTop: '2px',
              }} />
            </div>
          </div>
          {/* Base under the monitor */}
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '-2px', marginBottom: '6px' }}>
            <div style={{
              width: '90px',
              height: '6px',
              backgroundColor: '#c0c0c0', // Fixed warning
              borderTop: '1px solid #ffffff',
              borderLeft: '1px solid #ffffff',
              borderRight: '1px solid #808080',
              borderBottom: '1px solid #808080',
            }} />
          </div>

          {/* Wallpaper groupbox */}
          <fieldset style={{ margin: 0, padding: '8px 8px 12px 8px', display: 'flex', flexDirection: 'column', flex: 1, minHeight: '136px', boxSizing: 'border-box' }}>
            <legend>Wallpaper</legend>
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div style={{ ...FONT, marginBottom: '4px' }}>Select an HTML Document or a picture:</div>

              <div style={{ display: 'flex', flex: 1, gap: '8px', minHeight: 0 }}>
                {/* Wallpaper list */}
                <div style={{
                  flex: 1,
                  minHeight: '80px',
                  overflowY: 'auto',
                  backgroundColor: '#ffffff', // Fixed warning
                  border: '1px solid #808080',
                  boxShadow: 'inset 1px 1px 0 #0a0a0a, inset -1px -1px 0 #dfdfdf',
                }} className="win98-scrollbar">
                  {ALL_WALLPAPERS.map((wp, i) => (
                    <div
                      key={wp.name + '-' + i}
                      onClick={() => setLocalWallpaper(wp.url)}
                      style={{
                        ...FONT,
                        padding: '1px 4px',
                        backgroundColor: i === selectedIndex ? '#000080' : 'transparent', // Fixed warning
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
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleFileUpload}
                  />
                  <button 
                    type="button" 
                    style={{ ...FONT, width: '100%' }}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? 'Wait...' : 'Browse...'}
                  </button>
                  <button type="button" disabled style={{ ...FONT, width: '100%' }}>Pattern...</button>

                  <div style={{ marginTop: 'auto', paddingBottom: '2px' }}>
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
                    backgroundColor: color, // Fixed warning
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
        <button type="button" disabled={!hasChanges} onClick={applySettings} style={{ ...FONT, minWidth: '75px' }}>Apply</button>
      </div>
    </div>
  );
}
