import type { Lang, MembershipPlan } from './App';

export const DEFAULT_WALLPAPER_ID = 'none';
export const CUSTOM_WALLPAPER_ID = 'custom';
export const DEFAULT_CARD_OPACITY = 0.68;
export const MIN_CARD_OPACITY = 0.45;
export const MAX_CARD_OPACITY = 0.9;

export type WallpaperAccess = MembershipPlan;

export type WallpaperOption = {
  id: string;
  access: WallpaperAccess;
  src: string;
  previewSrc?: string;
  name: Record<Lang, string>;
  description: Record<Lang, string>;
};

export const WALLPAPERS: WallpaperOption[] = [
  {
    id: 'free-ocean',
    access: 'free',
    src: '/wallpapers/free-ocean.jpg',
    name: { en: 'Ocean Drift', zh: '海浪' },
    description: { en: 'Blue water texture', zh: '蓝色海面纹理' },
  },
  {
    id: 'free-forest',
    access: 'free',
    src: '/wallpapers/free-forest.jpg',
    name: { en: 'Mist Forest', zh: '雾林' },
    description: { en: 'Green forest mist', zh: '绿色森林薄雾' },
  },
  {
    id: 'free-alpine',
    access: 'free',
    src: '/wallpapers/free-alpine.jpg',
    name: { en: 'Alpine Light', zh: '雪山晨光' },
    description: { en: 'Warm mountain sky', zh: '暖色雪山天空' },
  },
  {
    id: 'member-summit',
    access: 'lifetime',
    src: '/wallpapers/member-summit.jpg',
    name: { en: 'Monochrome Summit', zh: '会员雪峰' },
    description: { en: 'Lifetime wallpaper', zh: '终身会员壁纸' },
  },
];

export const getWallpaperById = (wallpaperId: string | null | undefined) =>
  WALLPAPERS.find((wallpaper) => wallpaper.id === wallpaperId) ?? null;

export const clampCardOpacity = (value: number) => {
  if (!Number.isFinite(value)) return DEFAULT_CARD_OPACITY;
  return Math.min(MAX_CARD_OPACITY, Math.max(MIN_CARD_OPACITY, value));
};
