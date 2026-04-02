import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type DisplayMode = 'center' | 'tile' | 'stretch';

export interface WallpaperOption {
  name: string;
  /** URL path (relative to public/) or null for "(None)" */
  url: string | null;
}

export const WALLPAPER_OPTIONS: WallpaperOption[] = [
  { name: '(None)', url: null },
  { name: 'Black Thatch', url: '/wallpapers/black_thatch.png' },
  { name: 'Blue Rivets', url: '/wallpapers/blue_rivets.png' },
  { name: 'Bubbles', url: '/wallpapers/bubbles.png' },
  { name: 'Carved Stone', url: '/wallpapers/carved_stone.png' },
  { name: 'Circles', url: '/wallpapers/circles.png' },
  { name: 'Clouds', url: '/wallpapers/clouds.png' },
  { name: 'Houndstooth', url: '/wallpapers/houndstooth.png' },
  { name: 'Metal Links', url: '/wallpapers/metal_links.png' },
  { name: 'Prairie Wind', url: '/wallpapers/prairie_wind.png' },
  { name: 'Rivets', url: '/wallpapers/rivets.png' },
  { name: 'Sandstone', url: '/wallpapers/sandstone.png' },
  { name: 'Santa Fe Stucco', url: '/wallpapers/santa_fe_stucco.png' },
  { name: 'Setup', url: '/wallpapers/setup.png' },
  { name: 'Straw Mat', url: '/wallpapers/straw_mat.png' },
  { name: 'Tiles', url: '/wallpapers/tiles.png' },
  { name: 'TriAzzle', url: '/wallpapers/triazzle.png' },
  { name: 'Waves', url: '/wallpapers/waves.png' },
  { name: 'Schmid Meier HF', url: '/_wallpaper_win98.gif' },
];

interface DisplayState {
  wallpaper: string | null;
  backgroundColor: string;
  displayMode: DisplayMode;
  customWallpapers: WallpaperOption[];
  setWallpaper: (url: string | null) => void;
  setBackgroundColor: (color: string) => void;
  setDisplayMode: (mode: DisplayMode) => void;
  addCustomWallpaper: (wallpaper: WallpaperOption) => void;
}

export const useDisplayStore = create<DisplayState>()(
  persist(
    (set) => ({
      wallpaper: '/_wallpaper_win98.gif',
      backgroundColor: '#008080',
      displayMode: 'stretch',
      customWallpapers: [],
      setWallpaper: (url) => set({ wallpaper: url }),
      setBackgroundColor: (color) => set({ backgroundColor: color }),
      setDisplayMode: (mode) => set({ displayMode: mode }),
      addCustomWallpaper: (wp) => set((state) => ({ 
        customWallpapers: [wp, ...state.customWallpapers] 
      })),
    }),
    {
      name: 'display-settings',
    }
  )
);
