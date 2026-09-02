import type { Lang, MembershipPlan } from './App';

export const DEFAULT_WALLPAPER_ID = 'none';
export const CUSTOM_WALLPAPER_ID = 'custom';
export const DEFAULT_CARD_OPACITY = 0.68;
export const MIN_CARD_OPACITY = 0.25;
export const MAX_CARD_OPACITY = 0.9;

export type WallpaperAccess = MembershipPlan;

export type WallpaperOption = {
  id: string;
  access: WallpaperAccess;
  src: string;
  previewSrc?: string;
  appearance?: {
    darkOverlay?: 'default' | 'subtle' | 'none';
    lightWeatherForeground?: 'default' | 'light';
    lightCategoryForeground?: 'default' | 'light';
    lightHomeCategoryForeground?: 'default' | 'light';
    lightSideNav?: 'default' | 'light' | 'dark';
    lightMutedForeground?: 'default' | 'dark';
    lightSurface?: 'default' | 'dark';
    lightNav?: 'default' | 'dark';
  };
  bannerGradient?: {
    light: string;
    dark: string;
  };
  name: Record<Lang, string>;
  description: Record<Lang, string>;
};

export const WALLPAPERS: WallpaperOption[] = [
  {
    id: 'free-rose-clouds',
    access: 'free',
    src: '/wallpapers/free-rose-clouds.jpg',
    appearance: {
      darkOverlay: 'none',
      lightWeatherForeground: 'light',
      lightCategoryForeground: 'light',
      lightHomeCategoryForeground: 'light',
      lightSideNav: 'light',
    },
    name: { en: 'Rose Clouds', zh: '玫瑰星云' },
    description: { en: 'Pink clouds under a starry sky', zh: '星空下的粉色云层' },
  },
  {
    id: 'free-ocean',
    access: 'free',
    src: '/wallpapers/free-ocean.jpg',
    appearance: {
      darkOverlay: 'none',
      lightWeatherForeground: 'light',
      lightSideNav: 'dark',
      lightCategoryForeground: 'light',
      lightHomeCategoryForeground: 'default',
      lightMutedForeground: 'dark',
    },
    bannerGradient: {
      light: 'linear-gradient(90deg, rgba(0, 119, 145, 0.78), rgba(18, 55, 78, 0.88))',
      dark: 'linear-gradient(90deg, rgba(5, 31, 44, 0.86), rgba(11, 54, 68, 0.82))',
    },
    name: { en: 'Ocean Drift', zh: '海浪' },
    description: { en: 'Blue water texture', zh: '蓝色海面纹理' },
  },
  {
    id: 'free-forest',
    access: 'free',
    src: '/wallpapers/free-forest.jpg',
    appearance: {
      lightCategoryForeground: 'default',
      lightHomeCategoryForeground: 'light',
    },
    bannerGradient: {
      light: 'linear-gradient(90deg, rgba(58, 84, 73, 0.78), rgba(150, 167, 151, 0.82))',
      dark: 'linear-gradient(90deg, rgba(22, 43, 35, 0.88), rgba(59, 77, 64, 0.82))',
    },
    name: { en: 'Mist Forest', zh: '雾林' },
    description: { en: 'Green forest mist', zh: '绿色森林薄雾' },
  },
  {
    id: 'free-alpine',
    access: 'free',
    src: '/wallpapers/free-alpine.jpg',
    appearance: {
      lightSideNav: 'dark',
      lightMutedForeground: 'dark',
      lightHomeCategoryForeground: 'light',
    },
    bannerGradient: {
      light: 'linear-gradient(90deg, rgba(188, 118, 101, 0.74), rgba(74, 100, 129, 0.82))',
      dark: 'linear-gradient(90deg, rgba(75, 42, 54, 0.84), rgba(37, 55, 82, 0.86))',
    },
    name: { en: 'Alpine Light', zh: '雪山晨光' },
    description: { en: 'Warm mountain sky', zh: '暖色雪山天空' },
  },
  {
    id: 'member-summit',
    access: 'lifetime',
    src: '/wallpapers/member-summit.jpg',
    appearance: {
      darkOverlay: 'none',
      lightCategoryForeground: 'light',
      lightHomeCategoryForeground: 'light',
      lightSideNav: 'light',
      lightNav: 'default',
    },
    bannerGradient: {
      light: 'linear-gradient(90deg, rgba(42, 48, 56, 0.84), rgba(126, 132, 138, 0.76))',
      dark: 'linear-gradient(90deg, rgba(17, 24, 39, 0.78), rgba(64, 64, 70, 0.72))',
    },
    name: { en: 'Monochrome Summit', zh: '极夜雪峰' },
    description: { en: 'Lifetime wallpaper', zh: '终身会员壁纸' },
  },
  {
    id: 'member-green-apples',
    access: 'lifetime',
    src: '/wallpapers/member-green-apples.jpg',
    appearance: {
      lightSideNav: 'dark',
      lightMutedForeground: 'dark',
    },
    name: { en: 'Green Apple Light', zh: '青苹果日光' },
    description: { en: 'Fresh green apples in water', zh: '水光中的青苹果' },
  },
  {
    id: 'member-motion-garden',
    access: 'lifetime',
    src: '/wallpapers/member-motion-garden.jpg',
    appearance: {
      lightSideNav: 'dark',
      lightMutedForeground: 'dark',
    },
    name: { en: 'Motion Garden', zh: '流光花园' },
    description: { en: 'Sunlight rippling across turquoise water', zh: '碧蓝水面上的流动光影' },
  },
  {
    id: 'member-cosmos-field',
    access: 'lifetime',
    src: '/wallpapers/member-cosmos-field.jpg',
    appearance: {
      lightSideNav: 'dark',
      lightMutedForeground: 'dark',
    },
    name: { en: 'Cosmos Field', zh: '晴空花田' },
    description: { en: 'Soft pink cosmos flowers', zh: '晴空下的粉色波斯菊' },
  },
];

export const getWallpaperById = (wallpaperId: string | null | undefined) =>
  WALLPAPERS.find((wallpaper) => wallpaper.id === wallpaperId) ?? null;

export const clampCardOpacity = (value: number) => {
  if (!Number.isFinite(value)) return DEFAULT_CARD_OPACITY;
  return Math.min(MAX_CARD_OPACITY, Math.max(MIN_CARD_OPACITY, value));
};
