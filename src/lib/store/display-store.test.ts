// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { useDisplayStore, WALLPAPER_OPTIONS, SCREENSAVER_OPTIONS } from './display-store';

describe('useDisplayStore', () => {
  beforeEach(() => {
    localStorage.clear();
    // Reset to initial state
    useDisplayStore.setState({
      wallpaper: '',
      backgroundColor: '#008080',
      displayMode: 'stretch',
      customWallpapers: [],
      screenSaver: '(None)',
      screenSaverWait: 15,
      screenSaverText: 'Schmid Meier HF',
      isPasswordProtected: false,
    });
  });

  it('exposes the catalog of built-in wallpapers including (None)', () => {
    expect(WALLPAPER_OPTIONS[0]).toEqual({ name: '(None)', url: null });
    expect(WALLPAPER_OPTIONS.length).toBeGreaterThan(1);
  });

  it('exposes the screensaver list with (None) first', () => {
    expect(SCREENSAVER_OPTIONS[0]).toBe('(None)');
  });

  it('setWallpaper updates the URL (including null for "None")', () => {
    useDisplayStore.getState().setWallpaper('/wallpapers/clouds.png');
    expect(useDisplayStore.getState().wallpaper).toBe('/wallpapers/clouds.png');
    useDisplayStore.getState().setWallpaper(null);
    expect(useDisplayStore.getState().wallpaper).toBeNull();
  });

  it('setBackgroundColor updates color', () => {
    useDisplayStore.getState().setBackgroundColor('#000000');
    expect(useDisplayStore.getState().backgroundColor).toBe('#000000');
  });

  it('setDisplayMode accepts each of the three modes', () => {
    const { setDisplayMode } = useDisplayStore.getState();
    setDisplayMode('center');
    expect(useDisplayStore.getState().displayMode).toBe('center');
    setDisplayMode('tile');
    expect(useDisplayStore.getState().displayMode).toBe('tile');
    setDisplayMode('stretch');
    expect(useDisplayStore.getState().displayMode).toBe('stretch');
  });

  it('addCustomWallpaper prepends to customWallpapers (newest first)', () => {
    const { addCustomWallpaper } = useDisplayStore.getState();
    addCustomWallpaper({ name: 'first', url: '/a.png' });
    addCustomWallpaper({ name: 'second', url: '/b.png' });
    expect(useDisplayStore.getState().customWallpapers.map(w => w.name)).toEqual(['second', 'first']);
  });

  it('setScreenSaver, setScreenSaverWait, setScreenSaverText update independently', () => {
    const { setScreenSaver, setScreenSaverWait, setScreenSaverText } = useDisplayStore.getState();
    setScreenSaver('3D Pipes');
    setScreenSaverWait(30);
    setScreenSaverText('hello');
    const s = useDisplayStore.getState();
    expect(s.screenSaver).toBe('3D Pipes');
    expect(s.screenSaverWait).toBe(30);
    expect(s.screenSaverText).toBe('hello');
  });

  it('setIsPasswordProtected toggles the flag', () => {
    useDisplayStore.getState().setIsPasswordProtected(true);
    expect(useDisplayStore.getState().isPasswordProtected).toBe(true);
    useDisplayStore.getState().setIsPasswordProtected(false);
    expect(useDisplayStore.getState().isPasswordProtected).toBe(false);
  });
});
