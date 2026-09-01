import { createContext, useContext, useState, useRef, useEffect, type CSSProperties } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate, useLocation, useNavigate } from 'react-router';
import { ArrowLeft, CheckCircle2, ChevronDown, ExternalLink, Gem, Grid2X2, KeyRound, Languages, Loader2, Lock, LogOut, Mail, PanelTop, Pencil, Settings, Sparkles, Sun, Moon, Trash2, Upload, UserRound, X } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import Home from './components/Home';
import Categories from './components/Categories';
import WallpaperDialog from './components/WallpaperDialog';
import { supabase } from './lib/supabase';
import { getTurnstileToken } from './lib/turnstile';
import { PREVIEW_CARD_OPACITY, PREVIEW_LANGUAGE_KEY, PREVIEW_OPACITY_KEY, PREVIEW_THEME_KEY, PREVIEW_WALLPAPER_ID, PREVIEW_WALLPAPER_KEY, PreviewContext, type PreviewLoginAction } from './preview';
import { CUSTOM_WALLPAPER_ID, DEFAULT_CARD_OPACITY, DEFAULT_WALLPAPER_ID, WALLPAPERS, clampCardOpacity, getWallpaperById } from './wallpapers';

// ─── Language context ─────────────────────────────────────────────────────────

export type Lang = 'zh' | 'en';

export const LangContext = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
}>({ lang: 'en', setLang: () => {} });

// ─── Theme context ────────────────────────────────────────────────────────────

export const ThemeContext = createContext<{
  isDark: boolean;
  toggleDark: () => void;
}>({ isDark: false, toggleDark: () => {} });

export const AuthContext = createContext<{
  session: Session | null;
  profile: UserProfile | null;
  updateProfile: (patch: ProfilePatch) => Promise<{ error?: string }>;
  uploadProfileAvatar: (file: File) => Promise<{ url?: string; error?: string }>;
}>({
  session: null,
  profile: null,
  updateProfile: async () => ({}),
  uploadProfileAvatar: async () => ({ error: 'Avatar upload unavailable.' }),
});

export type MembershipPlan = 'free' | 'lifetime';

export type MembershipSummary = {
  plan: MembershipPlan;
  categoryCount: number;
  linkCount: number;
  loading: boolean;
};

export const FREE_CATEGORY_LIMIT = 5;
export const FREE_LINK_LIMIT = 30;

export const MembershipContext = createContext<{
  summary: MembershipSummary;
  refreshMembership: () => Promise<void>;
  redeemMembershipCode: (code: string) => Promise<{ ok: boolean; status: string; message: string }>;
  openUpgradeDialog: () => void;
}>({
  summary: { plan: 'free', categoryCount: 0, linkCount: 0, loading: true },
  refreshMembership: async () => {},
  redeemMembershipCode: async () => ({ ok: false, status: 'unavailable', message: '会员服务暂不可用。' }),
  openUpgradeDialog: () => {},
});

export type WallpaperSettings = {
  wallpaperId: string;
  customWallpaperPath: string | null;
  customWallpaperUrl: string | null;
  cardOpacity: number;
  loading: boolean;
};

export type WallpaperSaveInput = {
  wallpaperId: string;
  customWallpaperPath?: string | null;
  customWallpaperUrl?: string | null;
  cardOpacity: number;
};

export const DEFAULT_WALLPAPER_SETTINGS: WallpaperSettings = {
  wallpaperId: DEFAULT_WALLPAPER_ID,
  customWallpaperPath: null,
  customWallpaperUrl: null,
  cardOpacity: DEFAULT_CARD_OPACITY,
  loading: true,
};

export const WallpaperContext = createContext<{
  settings: WallpaperSettings;
  refreshWallpaperSettings: () => Promise<void>;
  saveWallpaperSettings: (input: WallpaperSaveInput) => Promise<{ error?: string }>;
  uploadCustomWallpaper: (file: File) => Promise<{ path?: string; url?: string; error?: string }>;
}>({
  settings: DEFAULT_WALLPAPER_SETTINGS,
  refreshWallpaperSettings: async () => {},
  saveWallpaperSettings: async () => ({ error: 'Wallpaper service unavailable.' }),
  uploadCustomWallpaper: async () => ({ error: 'Wallpaper upload unavailable.' }),
});

type UserProfile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
};

type ProfilePatch = {
  display_name?: string;
  avatar_url?: string | null;
};

const WALLPAPER_CACHE_KEY = 'dash-wallpaper-settings';

const readPreviewWallpaperSettings = (): WallpaperSettings => {
  try {
    return normalizeWallpaperSettings({
      wallpaperId: sessionStorage.getItem(PREVIEW_WALLPAPER_KEY) || PREVIEW_WALLPAPER_ID,
      cardOpacity: Number(sessionStorage.getItem(PREVIEW_OPACITY_KEY) || PREVIEW_CARD_OPACITY),
      loading: false,
    });
  } catch {
    return normalizeWallpaperSettings({ wallpaperId: PREVIEW_WALLPAPER_ID, cardOpacity: PREVIEW_CARD_OPACITY, loading: false });
  }
};

const getCustomWallpaperUrl = (path: string | null | undefined) => {
  if (!path) return null;
  return supabase.storage.from('wallpapers').getPublicUrl(path).data.publicUrl;
};

const normalizeWallpaperSettings = (input: Partial<WallpaperSettings>): WallpaperSettings => {
  const wallpaperId = typeof input.wallpaperId === 'string' ? input.wallpaperId : DEFAULT_WALLPAPER_ID;
  const knownWallpaper = wallpaperId === CUSTOM_WALLPAPER_ID || wallpaperId === DEFAULT_WALLPAPER_ID || Boolean(getWallpaperById(wallpaperId));
  const nextId = knownWallpaper ? wallpaperId : DEFAULT_WALLPAPER_ID;
  const customPath = typeof input.customWallpaperPath === 'string' && input.customWallpaperPath.trim()
    ? input.customWallpaperPath.trim()
    : null;

  return {
    wallpaperId: nextId,
    customWallpaperPath: customPath,
    customWallpaperUrl: typeof input.customWallpaperUrl === 'string' && input.customWallpaperUrl.trim()
      ? input.customWallpaperUrl.trim()
      : getCustomWallpaperUrl(customPath),
    cardOpacity: clampCardOpacity(Number(input.cardOpacity ?? DEFAULT_CARD_OPACITY)),
    loading: Boolean(input.loading),
  };
};

const readCachedWallpaperSettings = (): WallpaperSettings => {
  try {
    const raw = localStorage.getItem(WALLPAPER_CACHE_KEY);
    if (!raw) return DEFAULT_WALLPAPER_SETTINGS;
    return normalizeWallpaperSettings({ ...JSON.parse(raw), loading: true });
  } catch {
    return DEFAULT_WALLPAPER_SETTINGS;
  }
};

const cacheWallpaperSettings = (settings: WallpaperSettings) => {
  try {
    localStorage.setItem(WALLPAPER_CACHE_KEY, JSON.stringify({
      wallpaperId: settings.wallpaperId,
      customWallpaperPath: settings.customWallpaperPath,
      customWallpaperUrl: settings.customWallpaperUrl,
      cardOpacity: settings.cardOpacity,
    }));
  } catch {}
};

const isBuiltInLifetimeWallpaper = (wallpaperId: string) =>
  WALLPAPERS.some((wallpaper) => wallpaper.id === wallpaperId && wallpaper.access === 'lifetime');

const XIANYU_MEMBERSHIP_URL = 'https://m.tb.cn/h.8NvRUGx?tk=RHkETf2uFdQ';

// ─── Nav labels ───────────────────────────────────────────────────────────────

const NAV_LABELS: Record<Lang, { home: string; categories: string; signOut: string }> = {
  en: { home: 'Home', categories: 'Categories', signOut: 'Sign out' },
  zh: { home: '主页', categories: '分类', signOut: '退出' },
};

const ACCOUNT_LABELS = {
  en: {
    account: 'Account',
    displayName: 'Display name',
    avatarUrl: 'Avatar image',
    uploadAvatar: 'Upload avatar',
    editAvatar: 'Change avatar',
    deleteAvatar: 'Remove avatar',
    cropAvatar: 'Crop avatar',
    cropHint: 'Use the sliders to frame the visible square.',
    cropZoom: 'Zoom',
    cropHorizontal: 'Horizontal',
    cropVertical: 'Vertical',
    applyCrop: 'Use cropped avatar',
    uploadingAvatar: 'Uploading avatar...',
    avatarUploadError: 'Could not upload avatar. Please try another image.',
    avatarLocked: 'Custom avatar is a lifetime membership feature.',
    saveProfile: 'Save changes',
    cancel: 'Cancel',
    free: 'Free',
    lifetime: 'Lifetime',
    editAccount: 'Edit account',
    setWallpaper: 'Set wallpaper',
    upgrade: 'Upgrade',
    comingSoon: 'Coming soon',
    categories: 'Categories',
    sites: 'Sites',
    saving: 'Saving...',
    saved: 'Saved',
    signOut: 'Sign out',
    profileError: 'Could not save profile. Please try again.',
    upgradeTitle: 'Lifetime membership',
    upgradePrice: '¥5.99',
    upgradeSubtitle: 'Unlimited categories and sites. Custom avatar and wallpaper are reserved for the next release.',
    buyOnXianyu: 'Buy on Xianyu',
    redeemCode: 'Verify membership code',
    codePlaceholder: 'JF-XXXX-XXXX-XXXX',
    redeeming: 'Verifying...',
    alreadyMember: 'Lifetime member',
    invalidCode: 'Membership code is invalid or already used.',
  },
  zh: {
    account: '账号',
    displayName: '用户名',
    avatarUrl: '头像图片',
    uploadAvatar: '上传头像',
    editAvatar: '修改头像',
    deleteAvatar: '删除头像',
    cropAvatar: '裁剪头像',
    cropHint: '通过滑块调整头像在方形区域里的位置。',
    cropZoom: '缩放',
    cropHorizontal: '左右位置',
    cropVertical: '上下位置',
    applyCrop: '使用裁剪头像',
    uploadingAvatar: '头像上传中...',
    avatarUploadError: '头像上传失败，请换一张图片。',
    avatarLocked: '自定义头像是会员功能，请先升级会员。',
    saveProfile: '保存修改',
    cancel: '取消',
    free: 'Free',
    lifetime: '终身会员',
    editAccount: '编辑账号',
    setWallpaper: '设置壁纸',
    upgrade: '升级会员',
    comingSoon: '即将上线',
    categories: '分类',
    sites: '网站',
    saving: '保存中...',
    saved: '已保存',
    signOut: '退出账号',
    profileError: '资料保存失败，请重试。',
    upgradeTitle: '升级终身会员',
    upgradePrice: '¥5.99',
    upgradeSubtitle: '不限分类、不限网站数量。自定义头像和壁纸会在后续版本开放。',
    buyOnXianyu: '去闲鱼购买',
    redeemCode: '核验会员码',
    codePlaceholder: 'JF-XXXX-XXXX-XXXX',
    redeeming: '核验中...',
    alreadyMember: '终身会员',
    invalidCode: '会员码无效或已使用。',
  },
};

const AUTH_LABELS = {
  en: {
    title: 'Dash-Navigation',
    subtitle: 'Customize and share your browser navigation page',
    email: 'Email',
    password: 'Password',
    signIn: 'Sign in',
    signUp: 'Create account',
    verifyCode: 'Verify email',
    verificationCode: 'Verification code',
    verificationCodePlaceholder: '6-digit code',
    resendCode: 'Resend code',
    forgotPassword: 'Forgot password?',
    sendResetLink: 'Send reset email',
    resetPassword: 'Reset password',
    newPassword: 'New password',
    savePassword: 'Save new password',
    backToSignIn: 'Back to sign in',
    switchToSignUp: 'Need an account?',
    switchToSignIn: 'Already have an account?',
    loading: 'Loading your private navigation...',
    success: 'Check your email for the verification code.',
    verified: 'Email verified. You can sign in with your password now.',
    resetSent: 'If this email exists, a password reset message has been sent.',
    passwordUpdated: 'Password updated. Please sign in again.',
  },
  zh: {
    title: 'Dash-Navigation',
    subtitle: '定制和分享你的浏览器导航页',
    email: '邮箱',
    password: '密码',
    signIn: '登录',
    signUp: '创建账号',
    verifyCode: '验证邮箱',
    verificationCode: '验证码',
    verificationCodePlaceholder: '6 位验证码',
    resendCode: '重新发送验证码',
    forgotPassword: '忘记密码？',
    sendResetLink: '发送重置邮件',
    resetPassword: '重置密码',
    newPassword: '新密码',
    savePassword: '保存新密码',
    backToSignIn: '返回登录',
    switchToSignUp: '还没有账号？',
    switchToSignIn: '已有账号？',
    loading: '正在加载你的私人导航...',
    success: '请查收邮箱验证码。',
    verified: '邮箱已验证，现在可以使用邮箱和密码登录。',
    resetSent: '如果该邮箱存在，密码重置邮件已发送。',
    passwordUpdated: '密码已更新，请重新登录。',
  },
};

type AuthMode = 'sign-in' | 'sign-up' | 'verify-sign-up' | 'forgot-password';

function getFallbackName(session: Session | null) {
  return session?.user.email?.split('@')[0] || 'User';
}

const normalizeMembershipCodeInput = (value: string) => value.replace(/[^A-Za-z0-9]/g, '').toUpperCase();

const formatMembershipCodeInput = (value: string) => {
  const normalized = normalizeMembershipCodeInput(value).slice(0, 14);
  if (normalized.startsWith('JF')) {
    const rest = normalized.slice(2);
    const groups = [rest.slice(0, 4), rest.slice(4, 8), rest.slice(8, 12)].filter(Boolean);
    return ['JF', ...groups].join('-');
  }

  return normalized.replace(/(.{4})/g, '$1-').replace(/-$/, '');
};

const isLifetimePlan = (plan: string | null | undefined): plan is 'lifetime' => plan === 'lifetime';

type AvatarCrop = {
  zoom: number;
  x: number;
  y: number;
};

type InfoPageKey = 'privacy' | 'terms' | 'docs' | 'help';

const INFO_PAGES: Record<InfoPageKey, Record<Lang, { title: string; body: string[] }>> = {
  privacy: {
    en: {
      title: 'Privacy Policy',
      body: [
        'Dash keeps your navigation categories, links, profile, avatar and wallpaper settings inside your authenticated account.',
        'We use Supabase services to store account data and provide login, sharing and membership verification. We do not sell personal data.',
      ],
    },
    zh: {
      title: '隐私政策',
      body: [
        'Dash 会把你的导航分类、网址、个人资料、头像和壁纸设置保存到你的登录账号中。',
        '我们使用 Supabase 提供登录、分享和会员核验等服务，不会出售你的个人数据。',
      ],
    },
  },
  terms: {
    en: {
      title: 'Terms of Service',
      body: [
        'Use Dash for lawful personal navigation and collection management. You are responsible for the links and content you save or share.',
        'Lifetime membership unlocks the listed product features for this service account and may be verified with a valid membership code.',
      ],
    },
    zh: {
      title: '服务条款',
      body: [
        '请将 Dash 用于合法的个人导航与收藏管理。你需要对自己保存或分享的链接内容负责。',
        '终身会员用于解锁本服务账号内列明的产品功能，并可通过有效会员码完成核验。',
      ],
    },
  },
  docs: {
    en: {
      title: 'Documentation',
      body: [
        'Create categories on the Categories page, add websites, refresh icons, and use share codes to move selected links between accounts.',
        'Wallpaper, custom avatar and unlimited quotas are managed from the account menu after signing in.',
      ],
    },
    zh: {
      title: '文档',
      body: [
        '你可以在分类页创建分类、添加网站、刷新图标，并用分享码在账号之间导入选中的网址。',
        '壁纸、自定义头像和无限额度都可以在登录后的账号菜单里管理。',
      ],
    },
  },
  help: {
    en: {
      title: 'Help Center',
      body: [
        'If a link icon looks wrong, use Refresh Icons on the Categories page. If a membership code cannot be verified, check the code format and try again.',
        'For purchase questions, open the Lifetime membership card and use the Xianyu purchase link.',
      ],
    },
    zh: {
      title: '帮助中心',
      body: [
        '如果网站图标显示异常，可以在分类页使用“刷新图标”。如果会员码无法核验，请先检查格式再重试。',
        '购买相关问题可以打开终身会员卡片，通过闲鱼购买入口继续处理。',
      ],
    },
  },
};

const DEFAULT_AVATAR_CROP: AvatarCrop = { zoom: 1, x: 0, y: 0 };

const createCroppedAvatarFile = async (sourceUrl: string, sourceFile: File, crop: AvatarCrop) => {
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read image.'));
    img.src = sourceUrl;
  });

  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Could not prepare avatar crop.');

  const baseScale = Math.max(size / image.naturalWidth, size / image.naturalHeight);
  const scale = baseScale * crop.zoom;
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const maxShiftX = Math.max(0, (drawWidth - size) / 2);
  const maxShiftY = Math.max(0, (drawHeight - size) / 2);
  const drawX = (size - drawWidth) / 2 + (crop.x / 100) * maxShiftX;
  const drawY = (size - drawHeight) / 2 + (crop.y / 100) * maxShiftY;

  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);

  const outputType = ['image/jpeg', 'image/png', 'image/webp'].includes(sourceFile.type)
    ? sourceFile.type
    : 'image/jpeg';
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error('Could not create cropped avatar.'));
    }, outputType, 0.92);
  });

  const extension = outputType.split('/')[1] || 'jpg';
  const baseName = sourceFile.name.replace(/\.[^.]+$/, '') || 'avatar';
  return new File([blob], `${baseName}-cropped.${extension}`, { type: outputType });
};

function ModeControls({ showPreviewHome = false }: { showPreviewHome?: boolean }) {
  const { lang, setLang } = useContext(LangContext);
  const { isDark, toggleDark } = useContext(ThemeContext);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
        title={lang === 'en' ? '切换为中文' : 'Switch to English'}
        aria-label={lang === 'en' ? 'Switch to Chinese' : '切换为英文'}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm transition hover:bg-gray-100 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:bg-zinc-900 dark:text-gray-300 dark:hover:bg-zinc-800 dark:hover:text-white dark:focus-visible:ring-zinc-600"
      >
        <Languages className="h-4.5 w-4.5" />
      </button>
      <button
        type="button"
        onClick={toggleDark}
        title={isDark ? (lang === 'en' ? 'Light mode' : '浅色模式') : (lang === 'en' ? 'Dark mode' : '深色模式')}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm transition hover:bg-gray-100 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:bg-zinc-900 dark:text-gray-300 dark:hover:bg-zinc-800 dark:hover:text-white dark:focus-visible:ring-zinc-600"
      >
        {isDark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
      </button>
      {showPreviewHome && (
        <Link
          to="/"
          title={lang === 'zh' ? '返回预览主页' : 'Back to preview'}
          aria-label={lang === 'zh' ? '返回预览主页' : 'Back to preview'}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-gray-600 shadow-sm transition hover:bg-gray-100 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:bg-zinc-900 dark:text-gray-300 dark:hover:bg-zinc-800 dark:hover:text-white dark:focus-visible:ring-zinc-600"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </Link>
      )}
    </div>
  );
}

// ─── NavDropdown (narrow screens) ────────────────────────────────────────────

function NavDropdown({ surfaceStyle, hasWallpaper, useDarkSurface }: { surfaceStyle?: CSSProperties; hasWallpaper: boolean; useDarkSurface: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { lang } = useContext(LangContext);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const labels = NAV_LABELS[lang];
  const pages = [
    { path: '/', label: labels.home },
    { path: '/categories', label: labels.categories },
  ];
  const current = pages.find(p => p.path === location.pathname) ?? pages[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} className="relative md:hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-sm font-medium text-gray-900 dark:text-gray-100 border-b-2 border-gray-900 dark:border-zinc-100 pb-1 focus:outline-none"
      >
        {current.label}
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div
          style={hasWallpaper ? surfaceStyle : undefined}
          className={`absolute right-0 top-[calc(100%+14px)] z-50 w-36 overflow-hidden rounded-lg border shadow-lg ${
            hasWallpaper
              ? 'border-white/35 dark:border-white/10'
              : 'border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-800'
          }`}
        >
          {pages.map(page => (
            <button
              key={page.path}
              onClick={() => { navigate(page.path); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                location.pathname === page.path
                  ? hasWallpaper
                    ? (useDarkSurface ? 'bg-white/16 text-white' : 'bg-white/55 text-gray-950')
                    : 'bg-gray-100 dark:bg-zinc-700 text-gray-900 dark:text-gray-100'
                  : hasWallpaper
                    ? (useDarkSurface ? 'text-white/80 hover:bg-white/10 hover:text-white' : 'text-gray-800 hover:bg-white/40')
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-zinc-700'
              }`}
            >
              {page.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── NavBar ───────────────────────────────────────────────────────────────────

function NavBar() {
  const location = useLocation();
  const { lang, setLang } = useContext(LangContext);
  const { isDark, toggleDark } = useContext(ThemeContext);
  const { session, profile, updateProfile, uploadProfileAvatar } = useContext(AuthContext);
  const { summary, openUpgradeDialog } = useContext(MembershipContext);
  const { settings: wallpaperSettings } = useContext(WallpaperContext);
  const { isPreview, requestLogin } = useContext(PreviewContext);
  const navigate = useNavigate();
  const [accountOpen, setAccountOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [wallpaperOpen, setWallpaperOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [avatarInput, setAvatarInput] = useState('');
  const [profileStatus, setProfileStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [profileToast, setProfileToast] = useState<{ status: 'saving' | 'done' | 'error'; msg: string } | null>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const profileToastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isActive = (path: string) => location.pathname === path;
  const labels = NAV_LABELS[lang];
  const accountLabels = ACCOUNT_LABELS[lang];
  const email = isPreview ? (lang === 'zh' ? '预览状态' : 'Preview mode') : (session?.user.email ?? '');
  const name = isPreview ? (lang === 'zh' ? '未登录' : 'Not signed in') : (profile?.display_name || getFallbackName(session));
  const avatarUrl = isPreview ? '' : (profile?.avatar_url || '');
  const isLifetime = summary.plan === 'lifetime';
  const planBadgeLabel = isPreview ? 'PREVIEW' : (isLifetime ? 'LIFETIME' : 'FREE');
  const categoryUsage = isPreview ? '5' : (isLifetime ? '∞' : `${summary.categoryCount}/${FREE_CATEGORY_LIMIT}`);
  const linkUsage = isPreview ? '20' : (isLifetime ? '∞' : `${summary.linkCount}/${FREE_LINK_LIMIT}`);
  const activeWallpaper = getWallpaperById(wallpaperSettings.wallpaperId);
  const activeWallpaperUrl = wallpaperSettings.wallpaperId === CUSTOM_WALLPAPER_ID
    ? wallpaperSettings.customWallpaperUrl
    : activeWallpaper?.src;
  const routeHasWallpaperBackground = location.pathname === '/' || location.pathname === '/categories';
  const hasWallpaper = routeHasWallpaperBackground && Boolean(activeWallpaperUrl && wallpaperSettings.wallpaperId !== DEFAULT_WALLPAPER_ID);
  const surfaceOpacity = clampCardOpacity(wallpaperSettings.cardOpacity);
  const topSurfaceOpacity = Math.min(0.9, surfaceOpacity + 0.15);
  const useDarkNavSurface = hasWallpaper && (isDark || (!isDark && activeWallpaper?.appearance?.lightNav === 'dark'));
  const useDarkAccountSurface = useDarkNavSurface;
  const navPrimaryClass = useDarkNavSurface ? 'text-white' : 'text-gray-900 dark:text-gray-100';
  const navMutedClass = useDarkNavSurface ? 'text-white/70 hover:text-white' : 'text-[#363636] dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100';
  const navActiveClass = useDarkNavSurface
    ? 'text-white border-b-2 border-white pb-1'
    : 'text-gray-900 dark:text-gray-100 border-b-2 border-gray-900 dark:border-zinc-100 pb-1';
  const navSurfaceStyle: CSSProperties | undefined = hasWallpaper
    ? {
        backgroundColor: useDarkNavSurface ? `rgba(24, 24, 27, ${topSurfaceOpacity})` : `rgba(255, 255, 255, ${topSurfaceOpacity})`,
        backdropFilter: accountOpen ? 'none' : 'blur(18px) saturate(1.2)',
        WebkitBackdropFilter: accountOpen ? 'none' : 'blur(18px) saturate(1.2)',
      }
    : accountOpen
      ? { backdropFilter: 'none', WebkitBackdropFilter: 'none' }
      : undefined;
  const accountMenuSurfaceStyle: CSSProperties | undefined = hasWallpaper
    ? {
        backgroundColor: useDarkNavSurface ? `rgba(24, 24, 27, ${topSurfaceOpacity})` : `rgba(255, 255, 255, ${topSurfaceOpacity})`,
        backdropFilter: 'blur(20px) saturate(1.25)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.25)',
      }
    : undefined;
  const accountMenuTextClass = useDarkAccountSurface ? 'text-white' : 'text-gray-950 dark:text-gray-100';
  const accountMenuMutedClass = useDarkAccountSurface ? 'text-white/85' : 'text-gray-800 dark:text-gray-200';
  const accountMenuItemClass = useDarkAccountSurface
    ? 'text-white/85 hover:bg-white/16 focus-visible:ring-white/20'
    : hasWallpaper
      ? 'text-gray-900 hover:bg-white/55 focus-visible:ring-gray-300'
      : 'text-gray-900 hover:bg-gray-100 focus-visible:ring-gray-300 dark:text-zinc-100 dark:hover:bg-zinc-800 dark:focus-visible:ring-zinc-600';
  const accountMenuIconClass = useDarkAccountSurface ? 'text-white/75' : 'text-gray-700 dark:text-zinc-300';
  const accountMenuDividerClass = useDarkAccountSurface ? 'border-white/10' : 'border-gray-100 dark:border-zinc-800';
  const accountSmallButtonClass = useDarkAccountSurface
    ? 'bg-white/8 text-white/70 hover:bg-white/12 hover:text-white focus-visible:ring-white/20'
    : 'bg-gray-100/60 text-gray-600 hover:bg-gray-200/70 hover:text-gray-950 focus-visible:ring-gray-300 dark:bg-zinc-800/60 dark:text-gray-300 dark:hover:bg-zinc-700/70 dark:hover:text-white dark:focus-visible:ring-zinc-600';
  const categoryQuotaTitle = isPreview
    ? (lang === 'zh' ? '预览分类：5 个' : 'Preview categories: 5')
    : isLifetime
    ? (lang === 'zh' ? '分类额度：不限' : 'Category quota: unlimited')
    : (lang === 'zh' ? `分类额度：${summary.categoryCount}/${FREE_CATEGORY_LIMIT}` : `Category quota: ${summary.categoryCount}/${FREE_CATEGORY_LIMIT}`);
  const linkQuotaTitle = isPreview
    ? (lang === 'zh' ? '预览网站：20 个' : 'Preview sites: 20')
    : isLifetime
    ? (lang === 'zh' ? '网站额度：不限' : 'Site quota: unlimited')
    : (lang === 'zh' ? `网站额度：${summary.linkCount}/${FREE_LINK_LIMIT}` : `Site quota: ${summary.linkCount}/${FREE_LINK_LIMIT}`);

  useEffect(() => {
    setDisplayName(name);
    setAvatarInput(avatarUrl);
  }, [avatarUrl, name]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => () => {
    if (profileToastTimer.current) clearTimeout(profileToastTimer.current);
  }, []);

  const showProfileToast = (status: 'saving' | 'done' | 'error', msg: string, autoHide = true) => {
    if (profileToastTimer.current) clearTimeout(profileToastTimer.current);
    setProfileToast({ status, msg });
    if (autoHide) {
      profileToastTimer.current = setTimeout(() => setProfileToast(null), 1500);
    }
  };

  const handleProfileSave = async (nextNameValue: string, nextAvatarValue: string) => {
    const nextName = nextNameValue.trim() || getFallbackName(session);
    const nextAvatar = nextAvatarValue.trim();
    const nextAvatarUrl = isLifetime ? (nextAvatar || null) : (avatarUrl || null);
    const avatarChanged = isLifetime && (nextAvatarUrl || '') !== avatarUrl;

    if ((nextName === name && !avatarChanged) || profileStatus === 'saving') return true;

    setProfileStatus('saving');
    showProfileToast('saving', accountLabels.saving, false);
    const result = await updateProfile({
      display_name: nextName,
      ...(isLifetime ? { avatar_url: nextAvatarUrl } : {}),
    });
    setProfileStatus(result.error ? 'error' : 'saved');
    showProfileToast(result.error ? 'error' : 'done', result.error ? accountLabels.profileError : accountLabels.saved);
    if (!result.error) {
      setDisplayName(nextName);
      setAvatarInput(nextAvatarUrl || '');
      window.setTimeout(() => setProfileStatus('idle'), 1400);
    }
    return !result.error;
  };

  return (
    <>
    <nav
      style={navSurfaceStyle}
      className={`sticky top-0 z-50 border-b transition-colors duration-200 ${accountOpen ? 'shadow-none' : 'shadow-sm'} ${
        hasWallpaper
          ? `${useDarkNavSurface ? 'border-white/10' : 'border-white/45 dark:border-white/10'}`
          : 'border-gray-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/85'
      }`}
    >
      <div className="mx-auto flex h-[50px] max-w-[1200px] items-center justify-between px-6 lg:px-20">
        <div className={`text-lg font-bold tracking-tight sm:text-xl ${navPrimaryClass}`}>Dash</div>
        <div className="flex items-center gap-3">
        <div className="flex items-baseline gap-5">
            <NavDropdown surfaceStyle={navSurfaceStyle} hasWallpaper={hasWallpaper} useDarkSurface={useDarkNavSurface} />
            <Link
              to="/"
              className={`hidden md:block font-medium text-sm ${
                isActive('/')
                  ? navActiveClass
                  : `${navMutedClass} transition-colors`
              }`}
            >
              {labels.home}
            </Link>
            <Link
              to="/categories"
              className={`hidden md:block font-medium text-sm ${
                isActive('/categories')
                  ? navActiveClass
                  : `${navMutedClass} transition-colors`
              }`}
            >
              {labels.categories}
            </Link>
          </div>
          <div ref={accountRef} className="relative pl-2 sm:pl-4">
            <button
              type="button"
              onClick={() => setAccountOpen((open) => !open)}
              title={email || accountLabels.account}
              aria-label={accountLabels.account}
              className={`inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full text-white shadow-sm transition hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 ${avatarUrl ? 'bg-transparent' : 'bg-gray-900 hover:bg-gray-800 dark:bg-blue-950 dark:hover:bg-blue-900'} dark:text-white dark:focus-visible:ring-blue-700`}
            >
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <UserRound className="h-4 w-4" />
              )}
            </button>
            {accountOpen && (
              <>
              <button
                type="button"
                aria-label="Close account menu"
                onClick={() => setAccountOpen(false)}
                className="fixed bottom-0 left-0 right-0 top-[50px] z-40 border-0 bg-transparent"
              />
              <div
                style={accountMenuSurfaceStyle}
                className={`absolute right-0 top-full z-50 mt-[10px] max-h-[calc(100vh-4.5rem)] w-[330px] max-w-[calc(100vw-1.5rem)] max-[480px]:w-[calc(100vw-4rem)] max-[480px]:max-w-none overflow-y-auto rounded-lg border p-3.5 shadow-xl dash-scrollbar ${
                  hasWallpaper
                    ? 'border-white/35 shadow-[0_20px_60px_rgba(15,23,42,0.18)] dark:border-white/10'
                    : 'border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-900'
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setAccountOpen(false);
                    if (isPreview) requestLogin('account');
                    else setEditProfileOpen(true);
                  }}
                  className={`mb-3 flex w-full items-center gap-3 rounded-lg p-1.5 text-left transition focus-visible:outline-none focus-visible:ring-2 ${accountMenuItemClass}`}
                >
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full text-white ${profile?.avatar_url ? 'bg-transparent' : 'bg-gray-900 dark:bg-blue-950'} dark:text-white`}>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <UserRound className="h-4.5 w-4.5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className={`truncate text-base font-semibold leading-5 ${accountMenuTextClass}`}>{name}</p>
                      <span className={`inline-flex h-5 flex-shrink-0 items-center rounded-full px-2.5 text-[10px] font-semibold uppercase tracking-wide ${
                        isLifetime
                          ? 'dash-lifetime-badge border border-gray-950 bg-gray-950 text-white shadow-sm'
                          : 'bg-gray-200 text-gray-600 dark:bg-zinc-700 dark:text-zinc-300'
                      }`}>
                        {planBadgeLabel}
                      </span>
                    </div>
                    <p className={`mt-1 truncate text-xs leading-4 ${accountMenuMutedClass}`}>{email}</p>
                  </div>
                </button>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setAccountOpen(false);
                      setWallpaperOpen(true);
                    }}
                    className={`flex h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 ${accountMenuItemClass}`}
                  >
                    <Settings className={`h-4 w-4 flex-shrink-0 ${accountMenuIconClass}`} />
                    <span>{accountLabels.setWallpaper}</span>
                  </button>
                  {!isPreview && <button
                    type="button"
                    onClick={() => {
                      if (!isLifetime) {
                        setAccountOpen(false);
                        openUpgradeDialog();
                      }
                    }}
                    className={`flex h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 ${accountMenuItemClass}`}
                  >
                    <Gem className={`h-4 w-4 flex-shrink-0 ${accountMenuIconClass}`} />
                    <span>{isLifetime ? accountLabels.alreadyMember : accountLabels.upgrade}</span>
                  </button>}
                  <button
                    type="button"
                    onClick={() => {
                      setAccountOpen(false);
                      if (isPreview) navigate('/login');
                      else void supabase.auth.signOut();
                    }}
                    className={`flex h-10 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 ${accountMenuItemClass}`}
                  >
                    {isPreview ? <Lock className={`h-4 w-4 flex-shrink-0 ${accountMenuIconClass}`} /> : <LogOut className={`h-4 w-4 flex-shrink-0 ${accountMenuIconClass}`} />}
                    <span>{isPreview ? (lang === 'zh' ? '登录或注册' : 'Sign in or register') : accountLabels.signOut}</span>
                  </button>
                </div>
                <div className={`mt-2 flex items-center justify-between border-t pt-2 ${accountMenuDividerClass}`}>
                  <div className={`flex items-center gap-4 pl-3 text-xs font-medium ${accountMenuMutedClass}`}>
                    <div className="flex items-center gap-1.5" title={categoryQuotaTitle}>
                      <Grid2X2 className="h-3.5 w-3.5" />
                      <span>{categoryUsage}</span>
                    </div>
                    <div className="flex items-center gap-1.5" title={linkQuotaTitle}>
                      <PanelTop className="h-3.5 w-3.5" />
                      <span>{linkUsage}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setLang(lang === 'en' ? 'zh' : 'en')}
                      title={lang === 'en' ? '切换为中文' : 'Switch to English'}
                      aria-label={lang === 'en' ? 'Switch to Chinese' : '切换为英文'}
                      className={`flex h-7 w-7 items-center justify-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 ${accountSmallButtonClass}`}
                    >
                      <Languages className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={toggleDark}
                      title={isDark ? (lang === 'en' ? 'Light mode' : '浅色模式') : (lang === 'en' ? 'Dark mode' : '深色模式')}
                      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                      className={`flex h-7 w-7 items-center justify-center rounded-lg transition focus-visible:outline-none focus-visible:ring-2 ${accountSmallButtonClass}`}
                    >
                      {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
    <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium shadow-lg transition-all duration-300 pointer-events-none ${
      profileToast === null ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'
    } ${
      profileToast?.status === 'error'
        ? 'border-red-100 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300'
        : profileToast?.status === 'done'
          ? 'border-gray-200 bg-white text-green-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-green-400'
          : 'border-gray-200 bg-white text-gray-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-gray-400'
    }`}>
      {profileToast?.status === 'saving' ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <CheckCircle2 className="h-4 w-4" />
      )}
      <span>{profileToast?.msg ?? ''}</span>
    </div>
    <EditProfileDialog
      open={editProfileOpen}
      onClose={() => setEditProfileOpen(false)}
      name={displayName}
      email={email}
      avatarUrl={avatarInput}
      isLifetime={isLifetime}
      onSave={handleProfileSave}
      onUploadAvatar={uploadProfileAvatar}
      onUpgrade={() => {
        setEditProfileOpen(false);
        openUpgradeDialog();
      }}
    />
    <WallpaperDialog
      open={wallpaperOpen}
      onClose={() => setWallpaperOpen(false)}
    />
    </>
  );
}

function EditProfileDialog({
  open,
  onClose,
  name,
  email,
  avatarUrl,
  isLifetime,
  onSave,
  onUploadAvatar,
  onUpgrade,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  email: string;
  avatarUrl: string;
  isLifetime: boolean;
  onSave: (name: string, avatarUrl: string) => Promise<boolean>;
  onUploadAvatar: (file: File) => Promise<{ url?: string; error?: string }>;
  onUpgrade: () => void;
}) {
  const { lang } = useContext(LangContext);
  const { isDark } = useContext(ThemeContext);
  const { settings: wallpaperSettings } = useContext(WallpaperContext);
  const t = ACCOUNT_LABELS[lang];
  const [draftName, setDraftName] = useState(name);
  const [draftAvatar, setDraftAvatar] = useState(avatarUrl);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState('');
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [avatarCropSrc, setAvatarCropSrc] = useState<string | null>(null);
  const [avatarCrop, setAvatarCrop] = useState<AvatarCrop>(DEFAULT_AVATAR_CROP);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const activeWallpaper = getWallpaperById(wallpaperSettings.wallpaperId);
  const activeWallpaperUrl = wallpaperSettings.wallpaperId === CUSTOM_WALLPAPER_ID
    ? wallpaperSettings.customWallpaperUrl
    : activeWallpaper?.src;
  const hasWallpaper = Boolean(activeWallpaperUrl && wallpaperSettings.wallpaperId !== DEFAULT_WALLPAPER_ID);
  const useDarkSurface = hasWallpaper && (isDark || (!isDark && activeWallpaper?.appearance?.lightSurface === 'dark'));
  const dialogOpacity = Math.min(0.9, clampCardOpacity(wallpaperSettings.cardOpacity) + 0.15);
  const panelFillClass = hasWallpaper
    ? (useDarkSurface ? 'bg-white/10' : 'bg-white/45')
    : 'bg-gray-100 dark:bg-zinc-800';
  const subtleTextClass = useDarkSurface ? 'text-white/75' : 'text-gray-700 dark:text-gray-300';
  const profileFieldClass = hasWallpaper
    ? `${useDarkSurface ? 'bg-white/10 text-white placeholder:text-white/55 focus:ring-white/30' : 'bg-white/55 text-gray-900 placeholder:text-gray-600 focus:ring-gray-400/70'} border border-white/35 shadow-sm`
    : 'bg-gray-100 text-gray-900 dark:bg-zinc-800 dark:text-gray-100 focus:ring-gray-300 dark:focus:ring-zinc-600';
  const dialogSurfaceStyle: CSSProperties | undefined = hasWallpaper
    ? {
        backgroundColor: useDarkSurface ? `rgba(24, 24, 27, ${dialogOpacity})` : `rgba(255, 255, 255, ${dialogOpacity})`,
        backdropFilter: 'blur(18px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(18px) saturate(1.2)',
      }
    : undefined;

  useEffect(() => {
    if (open) {
      setDraftName(name);
      setDraftAvatar(avatarUrl);
      setSaving(false);
      setUploadingAvatar(false);
      setAvatarError('');
      setSelectedAvatarFile(null);
      setAvatarCrop(DEFAULT_AVATAR_CROP);
      setAvatarCropSrc((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
    }
  }, [avatarUrl, name, open]);

  useEffect(() => () => {
    if (avatarCropSrc) URL.revokeObjectURL(avatarCropSrc);
  }, [avatarCropSrc]);

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    const ok = await onSave(draftName, draftAvatar);
    setSaving(false);
    if (ok) onClose();
  };

  const handleAvatarFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!isLifetime) {
      onUpgrade();
      return;
    }

    setAvatarError('');
    setSelectedAvatarFile(file);
    setAvatarCrop(DEFAULT_AVATAR_CROP);
    setAvatarCropSrc((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
  };

  const handleCroppedAvatarUpload = async () => {
    if (!selectedAvatarFile || !avatarCropSrc || uploadingAvatar) return;

    setUploadingAvatar(true);
    setAvatarError('');
    let result: { url?: string; error?: string };
    try {
      const croppedFile = await createCroppedAvatarFile(avatarCropSrc, selectedAvatarFile, avatarCrop);
      result = await onUploadAvatar(croppedFile);
    } catch {
      result = { error: t.avatarUploadError };
    }
    setUploadingAvatar(false);
    if (result.error || !result.url) {
      setAvatarError(result.error || t.avatarUploadError);
      return;
    }
    setDraftAvatar(result.url);
    setSelectedAvatarFile(null);
    setAvatarCrop(DEFAULT_AVATAR_CROP);
    setAvatarCropSrc((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  };

  const cancelAvatarCrop = () => {
    setSelectedAvatarFile(null);
    setAvatarCrop(DEFAULT_AVATAR_CROP);
    setAvatarCropSrc((current) => {
      if (current) URL.revokeObjectURL(current);
      return null;
    });
  };

  const clearDraftAvatar = () => {
    cancelAvatarCrop();
    setDraftAvatar('');
    setAvatarError('');
  };

  return (
    <div className="dash-scrollbar fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto p-4 py-6 sm:items-center">
      <button
        type="button"
        aria-label="Close profile dialog"
        onClick={onClose}
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
      />
      <section
        style={dialogSurfaceStyle}
        className={`relative max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border p-5 shadow-2xl dash-scrollbar sm:p-6 ${
          hasWallpaper
            ? 'border-white/35 dark:border-white/10'
            : 'border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-900'
        }`}
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="flex items-center gap-3">
            <Pencil className="h-5 w-5 text-gray-900 dark:text-gray-100" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t.editAccount}</h2>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className={`flex items-center gap-3 rounded-lg p-3 ${panelFillClass}`}>
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-900 text-white dark:bg-blue-950">
              {draftAvatar && isLifetime ? (
                <img src={draftAvatar} alt="" className="h-full w-full object-cover" />
              ) : (
                <UserRound className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{draftName || name}</p>
              <p className={`mt-0.5 truncate text-xs ${subtleTextClass}`}>{email}</p>
            </div>
          </div>

          <label className="block">
            <span className={`text-xs font-semibold uppercase tracking-wide ${subtleTextClass}`}>{t.displayName}</span>
            <input
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              className={`${profileFieldClass} mt-1.5 w-full rounded-lg px-3 py-2.5 text-base outline-none ring-1 ring-transparent transition`}
            />
          </label>

          <div className="block">
            <span className={`text-xs font-semibold uppercase tracking-wide ${subtleTextClass}`}>{t.avatarUrl}</span>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarFileChange}
            />
            <div className={`mt-1.5 flex w-full items-center gap-2 rounded-lg p-2 transition ${panelFillClass}`}>
              <div className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 text-left">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-gray-600 shadow-sm dark:bg-zinc-900 dark:text-zinc-300">
                  {draftAvatar && isLifetime ? (
                    <img src={draftAvatar} alt="" className="h-full w-full object-cover" />
                  ) : uploadingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isLifetime ? (
                    <Upload className="h-4 w-4" />
                  ) : (
                    <Lock className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    {uploadingAvatar ? t.uploadingAvatar : t.uploadAvatar}
                  </p>
                  <p className={`mt-0.5 truncate text-xs ${subtleTextClass}`}>
                    {isLifetime ? 'JPG / PNG / WebP' : t.avatarLocked}
                  </p>
                </div>
              </div>
              <div className="flex flex-shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => isLifetime ? avatarInputRef.current?.click() : onUpgrade()}
                  aria-label={t.editAvatar}
                  title={t.editAvatar}
                  className="flex h-9 w-9 items-center justify-center rounded-[12px] text-gray-600 transition hover:bg-gray-200 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-white dark:focus-visible:ring-zinc-600"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={clearDraftAvatar}
                  disabled={!isLifetime || !draftAvatar}
                  aria-label={t.deleteAvatar}
                  title={t.deleteAvatar}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-600 transition hover:bg-gray-200 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 disabled:cursor-not-allowed disabled:opacity-35 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-red-300 dark:focus-visible:ring-zinc-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            {avatarCropSrc && (
              <div className={`mt-3 rounded-lg p-3 ${panelFillClass}`}>
                <div className="mb-3">
                  <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{t.cropAvatar}</p>
                </div>
                <div className="mx-auto aspect-square w-36 overflow-hidden rounded-full bg-gray-200 shadow-inner dark:bg-zinc-700">
                  <img
                    src={avatarCropSrc}
                    alt=""
                    className="h-full w-full object-cover"
                    style={{
                      transform: `scale(${avatarCrop.zoom}) translate(${avatarCrop.x / 6}%, ${avatarCrop.y / 6}%)`,
                      transformOrigin: 'center',
                    }}
                  />
                </div>
                <div className="mt-4 space-y-3">
                  {[
                    { key: 'zoom', label: t.cropZoom, min: 1, max: 3, step: 0.05, value: avatarCrop.zoom },
                    { key: 'x', label: t.cropHorizontal, min: -100, max: 100, step: 1, value: avatarCrop.x },
                    { key: 'y', label: t.cropVertical, min: -100, max: 100, step: 1, value: avatarCrop.y },
                  ].map((control) => (
                    <label key={control.key} className="grid grid-cols-[80px_1fr] items-center gap-3 text-xs font-medium text-gray-500 dark:text-gray-400">
                      <span>{control.label}</span>
                      <input
                        type="range"
                        min={control.min}
                        max={control.max}
                        step={control.step}
                        value={control.value}
                        onChange={(event) => {
                          const value = Number(event.target.value);
                          setAvatarCrop((current) => ({ ...current, [control.key as keyof AvatarCrop]: value }));
                        }}
                        className="h-[7px] w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-gray-900 outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:bg-zinc-700 dark:accent-zinc-100 dark:focus-visible:ring-zinc-600"
                      />
                    </label>
                  ))}
                </div>
                <div className="mt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={cancelAvatarCrop}
                    className="flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:text-gray-300 dark:hover:bg-zinc-700 dark:focus-visible:ring-zinc-600"
                  >
                    <X className="h-4 w-4" />
                    {t.cancel}
                  </button>
                  <button
                    type="button"
                    onClick={handleCroppedAvatarUpload}
                    disabled={uploadingAvatar}
                    className="flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-2 text-sm font-medium text-white transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-950 dark:hover:bg-blue-900 dark:focus-visible:ring-blue-700"
                  >
                    {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {uploadingAvatar ? t.uploadingAvatar : t.applyCrop}
                  </button>
                </div>
              </div>
            )}
            {avatarError && (
              <p className="mt-1.5 text-xs font-medium text-red-600 dark:text-red-300">{avatarError}</p>
            )}
          </div>

          {!isLifetime && (
            <button
              type="button"
              onClick={onUpgrade}
              className="flex w-full items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-left text-xs font-medium text-gray-600 transition hover:bg-gray-200 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 dark:hover:text-zinc-100 dark:focus-visible:ring-zinc-600"
            >
              <Lock className="h-4 w-4 flex-shrink-0" />
              <span>{t.avatarLocked}</span>
            </button>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium text-gray-700 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:text-gray-300 dark:hover:bg-zinc-800 dark:focus-visible:ring-zinc-600"
            >
              <X className="h-4 w-4" />
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={saving || uploadingAvatar || Boolean(avatarCropSrc)}
              className="flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-2 text-sm font-medium text-white transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-950 dark:hover:bg-blue-900 dark:focus-visible:ring-blue-700"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {saving ? t.saving : t.saveProfile}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function AuthScreen({ notice }: { notice?: string }) {
  const { lang } = useContext(LangContext);
  const t = AUTH_LABELS[lang];
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [message, setMessage] = useState(notice ?? '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/login` : 'https://dash-navigation.vercel.app/login';

  useEffect(() => {
    setMessage(notice ?? '');
  }, [notice]);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError('');
    setMessage('');
    if (nextMode !== 'verify-sign-up') {
      setVerificationCode('');
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    setError('');

    try {
    const captchaToken = mode === 'verify-sign-up' ? undefined : await getTurnstileToken(`auth_${mode.replaceAll('-', '_')}`);

    if (mode === 'sign-in') {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password, options: captchaToken ? { captchaToken } : undefined });
      if (authError) setError(authError.message);
    }

    if (mode === 'sign-up') {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
          ...(captchaToken ? { captchaToken } : {}),
        },
      });

      if (authError) {
        setError(authError.message);
      } else {
        setMode('verify-sign-up');
        setMessage(t.success);
      }
    }

    if (mode === 'verify-sign-up') {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: verificationCode.trim(),
        type: 'email',
      });

      if (verifyError) {
        setError(verifyError.message);
      } else {
        setMode('sign-in');
        setPassword('');
        setVerificationCode('');
        setMessage(t.verified);
      }
    }

    if (mode === 'forgot-password') {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
        ...(captchaToken ? { captchaToken } : {}),
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setMessage(t.resetSent);
      }
    }

    } catch (captchaError) {
      setError(captchaError instanceof Error ? captchaError.message : String(captchaError));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (!email || submitting) return;
    setSubmitting(true);
    setError('');
    setMessage('');

    let captchaToken: string | undefined;
    try {
      captchaToken = await getTurnstileToken('auth_resend_signup');
    } catch (captchaError) {
      setError(captchaError instanceof Error ? captchaError.message : String(captchaError));
      setSubmitting(false);
      return;
    }
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: redirectTo,
        ...(captchaToken ? { captchaToken } : {}),
      },
    });

    if (resendError) {
      setError(resendError.message);
    } else {
      setMessage(t.success);
    }

    setSubmitting(false);
  };

  const primaryButtonLabel = {
    'sign-in': t.signIn,
    'sign-up': t.signUp,
    'verify-sign-up': t.verifyCode,
    'forgot-password': t.sendResetLink,
  }[mode];

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-6 py-10 transition-colors duration-200 dark:from-zinc-950 dark:to-zinc-900">
      <section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-8 flex items-start gap-4">
          <div className="mt-0.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gray-900 text-white dark:bg-blue-950 dark:text-white">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h1 className="whitespace-nowrap text-xl font-semibold text-gray-900 dark:text-gray-100 sm:text-2xl">{t.title}</h1>
            <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">{t.subtitle}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{t.email}</span>
            <span className="mt-1.5 flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2.5 ring-1 ring-transparent focus-within:ring-gray-300 dark:bg-zinc-800 dark:focus-within:ring-zinc-600">
              <Mail className="h-4 w-4 text-gray-400" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400 dark:text-gray-100"
                placeholder="you@example.com"
              />
            </span>
          </label>

          {(mode === 'sign-in' || mode === 'sign-up') && (
            <label className="block">
              <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{t.password}</span>
              <input
                type="password"
                required
                minLength={6}
                autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="mt-1.5 w-full rounded-lg bg-gray-100 px-3 py-2.5 text-sm text-gray-900 outline-none ring-1 ring-transparent transition focus:ring-gray-300 dark:bg-zinc-800 dark:text-gray-100 dark:focus:ring-zinc-600"
              />
            </label>
          )}

          {mode === 'verify-sign-up' && (
            <label className="block">
              <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{t.verificationCode}</span>
              <input
                type="text"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                minLength={6}
                maxLength={6}
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder={t.verificationCodePlaceholder}
                className="mt-1.5 w-full rounded-lg bg-gray-100 px-3 py-2.5 text-center text-sm text-gray-900 outline-none ring-1 ring-transparent transition placeholder:text-sm focus:ring-gray-300 dark:bg-zinc-800 dark:text-gray-100 dark:focus:ring-zinc-600"
              />
            </label>
          )}

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
          {message && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950/40 dark:text-green-300">{message}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-medium text-white transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-950 dark:text-white dark:hover:bg-blue-900 dark:focus-visible:ring-blue-700"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {primaryButtonLabel}
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {mode === 'sign-in' && (
              <>
                <button
                  type="button"
                  onClick={() => switchMode('sign-up')}
                  className="text-sm font-medium text-gray-600 underline-offset-4 hover:text-gray-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:text-gray-300 dark:hover:text-gray-100 dark:focus-visible:ring-zinc-600"
                >
                  {t.switchToSignUp}
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('forgot-password')}
                  className="text-sm font-medium text-gray-600 underline-offset-4 hover:text-gray-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:text-gray-300 dark:hover:text-gray-100 dark:focus-visible:ring-zinc-600"
                >
                  {t.forgotPassword}
                </button>
              </>
            )}
            {mode === 'sign-up' && (
              <button
                type="button"
                onClick={() => switchMode('sign-in')}
                className="text-sm font-medium text-gray-600 underline-offset-4 hover:text-gray-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:text-gray-300 dark:hover:text-gray-100 dark:focus-visible:ring-zinc-600"
              >
                {t.switchToSignIn}
              </button>
            )}
            {mode === 'verify-sign-up' && (
              <>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={submitting || !email}
                  className="text-sm font-medium text-gray-600 underline-offset-4 hover:text-gray-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-300 dark:hover:text-gray-100 dark:focus-visible:ring-zinc-600"
                >
                  {t.resendCode}
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('sign-in')}
                  className="text-sm font-medium text-gray-600 underline-offset-4 hover:text-gray-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:text-gray-300 dark:hover:text-gray-100 dark:focus-visible:ring-zinc-600"
                >
                  {t.backToSignIn}
                </button>
              </>
            )}
            {mode === 'forgot-password' && (
              <button
                type="button"
                onClick={() => switchMode('sign-in')}
                className="text-sm font-medium text-gray-600 underline-offset-4 hover:text-gray-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:text-gray-300 dark:hover:text-gray-100 dark:focus-visible:ring-zinc-600"
              >
                {t.backToSignIn}
              </button>
            )}
          </div>
          <ModeControls showPreviewHome />
        </div>
      </section>
    </main>
  );
}

function PasswordResetScreen({ onDone }: { onDone: (notice: string) => void }) {
  const { lang } = useContext(LangContext);
  const t = AUTH_LABELS[lang];
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    setError('');

    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
      setSubmitting(false);
      return;
    }

    setMessage(t.passwordUpdated);
    await supabase.auth.signOut();
    onDone(t.passwordUpdated);
    setSubmitting(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-6 py-10 transition-colors duration-200 dark:from-zinc-950 dark:to-zinc-900">
      <section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-8 flex items-start gap-4">
          <div className="mt-0.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gray-900 text-white dark:bg-blue-950 dark:text-white">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h1 className="whitespace-nowrap text-xl font-semibold text-gray-900 dark:text-gray-100 sm:text-2xl">{t.resetPassword}</h1>
            <p className="mt-1 text-sm leading-6 text-gray-500 dark:text-gray-400">{t.subtitle}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{t.newPassword}</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1.5 w-full rounded-lg bg-gray-100 px-3 py-2.5 text-sm text-gray-900 outline-none ring-1 ring-transparent transition focus:ring-gray-300 dark:bg-zinc-800 dark:text-gray-100 dark:focus:ring-zinc-600"
            />
          </label>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
          {message && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950/40 dark:text-green-300">{message}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-medium text-white transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-950 dark:text-white dark:hover:bg-blue-900 dark:focus-visible:ring-blue-700"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {t.savePassword}
          </button>
        </form>

        <div className="mt-5 flex justify-end">
          <ModeControls />
        </div>
      </section>
    </main>
  );
}

function LoadingScreen() {
  const { lang } = useContext(LangContext);
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-300">
      <div className="flex items-center gap-3 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        {AUTH_LABELS[lang].loading}
      </div>
    </main>
  );
}

function UpgradeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang } = useContext(LangContext);
  const { isDark } = useContext(ThemeContext);
  const { summary, redeemMembershipCode } = useContext(MembershipContext);
  const { settings: wallpaperSettings } = useContext(WallpaperContext);
  const t = ACCOUNT_LABELS[lang];
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const xianyuUrl = XIANYU_MEMBERSHIP_URL;
  const isLifetime = summary.plan === 'lifetime';
  const activeWallpaper = getWallpaperById(wallpaperSettings.wallpaperId);
  const activeWallpaperUrl = wallpaperSettings.wallpaperId === CUSTOM_WALLPAPER_ID
    ? wallpaperSettings.customWallpaperUrl
    : activeWallpaper?.src;
  const hasWallpaper = Boolean(activeWallpaperUrl && wallpaperSettings.wallpaperId !== DEFAULT_WALLPAPER_ID);
  const useDarkSurface = hasWallpaper && (isDark || (!isDark && activeWallpaper?.appearance?.lightSurface === 'dark'));
  const dialogOpacity = Math.min(0.9, clampCardOpacity(wallpaperSettings.cardOpacity) + 0.15);
  const dialogSurfaceStyle: CSSProperties | undefined = hasWallpaper
    ? {
        backgroundColor: useDarkSurface ? `rgba(24, 24, 27, ${dialogOpacity})` : `rgba(255, 255, 255, ${dialogOpacity})`,
        backdropFilter: 'blur(18px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(18px) saturate(1.2)',
      }
    : undefined;
  const primaryTextClass = useDarkSurface ? 'text-white' : 'text-gray-950 dark:text-gray-100';
  const secondaryTextClass = useDarkSurface ? 'text-white/75' : 'text-gray-700 dark:text-gray-300';
  const panelFillClass = hasWallpaper ? (useDarkSurface ? 'bg-white/10' : 'bg-white/45') : 'bg-gray-100 dark:bg-zinc-800';
  const fieldSurfaceClass = `${panelFillClass} ${useDarkSurface ? 'text-white placeholder:text-white/50' : 'text-gray-900 placeholder:text-gray-500 dark:text-gray-100'}`;
  const benefits = lang === 'zh'
    ? ['无限创建网站分类和收藏', '会员专享壁纸与自定义壁纸功能', '会员专享自定义头像', '终身免费会员']
    : ['Unlimited creation of website categories and collections', 'Member exclusive wallpaper and custom wallpaper function', 'Member exclusive custom avatar', 'Lifetime ad free membership'];

  useEffect(() => {
    if (open) {
      setCode('');
      setStatus(isLifetime ? 'success' : 'idle');
      setMessage(isLifetime ? t.alreadyMember : '');
    }
  }, [isLifetime, open, t.alreadyMember]);

  if (!open) return null;

  const handleRedeem = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!code.trim() || status === 'submitting') return;

    setStatus('submitting');
    setMessage('');
    const result = await redeemMembershipCode(code);
    setStatus(result.ok ? 'success' : 'error');
    setMessage(result.message || (result.ok ? t.alreadyMember : t.invalidCode));
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close membership dialog"
        onClick={onClose}
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
      />
      <section
        style={dialogSurfaceStyle}
        className={`relative w-full max-w-md rounded-xl border p-6 shadow-2xl ${
          hasWallpaper
            ? 'border-white/35 dark:border-white/10'
            : 'border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-900'
        }`}
      >
        <div className="mb-5 flex items-center gap-3">
          {status === 'success' ? (
            <Sparkles className={`h-5 w-5 ${primaryTextClass}`} />
          ) : (
            <Gem className={`h-5 w-5 ${primaryTextClass}`} />
          )}
          <h2 className={`text-lg font-semibold ${primaryTextClass}`}>{isLifetime ? t.alreadyMember : t.upgradeTitle}</h2>
        </div>

        <div className={`rounded-lg p-4 ${panelFillClass}`}>
            <div className="flex items-end justify-between gap-x-4 gap-y-2">
            <div className="flex items-center gap-2">
              <p className={`text-3xl font-bold leading-none ${primaryTextClass}`}>{t.upgradePrice}</p>
              <span className="inline-flex h-5 items-center rounded-full border border-gray-950 bg-gray-950 px-2 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
                {t.lifetime}
              </span>
            </div>
            {!isLifetime && (
              <a
                href={xianyuUrl}
                target="_blank"
                rel="noreferrer"
                className="dash-xianyu-link ml-auto inline-flex items-center gap-1.5 text-sm font-medium underline decoration-current underline-offset-2 transition hover:opacity-85 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:focus-visible:ring-zinc-600"
              >
                {t.buyOnXianyu}
                <ExternalLink className="h-3.5 w-3.5 flex-shrink-0 text-gray-900 dark:text-white" />
              </a>
            )}
          </div>
          <ul className={`mt-3 list-disc space-y-0.5 pl-4 text-xs leading-4 ${secondaryTextClass}`}>
            {benefits.map((benefit) => (
              <li key={benefit}>{benefit}</li>
            ))}
          </ul>
        </div>

        <form onSubmit={handleRedeem} className="mt-4 space-y-3">
          <label className="block">
            <span className={`text-sm font-semibold ${useDarkSurface ? 'text-white/85' : 'text-gray-700 dark:text-gray-200'}`}>{t.redeemCode}</span>
            <span className={`mt-2 flex h-11 items-center gap-2 rounded-lg px-3 ring-1 ring-transparent transition focus-within:ring-2 focus-within:ring-gray-300 dark:focus-within:ring-zinc-600 ${fieldSurfaceClass}`}>
              <KeyRound className="h-4 w-4 flex-shrink-0 opacity-45" />
              <input
                value={code}
                onChange={(event) => setCode(formatMembershipCodeInput(event.target.value))}
                placeholder={t.codePlaceholder}
                disabled={status === 'submitting' || isLifetime}
                className="min-w-0 flex-1 bg-transparent font-mono text-sm uppercase tracking-wider outline-none placeholder:font-sans placeholder:tracking-normal disabled:opacity-60"
              />
            </span>
          </label>
          {message && (
            <p className={`rounded-lg px-3 py-2 text-sm ${status === 'success' ? 'dash-success-feedback' : ''} ${
              status === 'success'
                ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
            }`}>
              {message}
            </p>
          )}
          {!isLifetime && (
            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className={`flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 ${
                  useDarkSurface
                    ? 'text-white/75 hover:bg-white/10 focus-visible:ring-white/20'
                    : 'text-gray-700 hover:bg-gray-100 focus-visible:ring-gray-300 dark:text-gray-300 dark:hover:bg-zinc-800 dark:focus-visible:ring-zinc-600'
                }`}
              >
                <X className="h-4 w-4" />
                {t.cancel}
              </button>
              <button
                type="submit"
                disabled={!code.trim() || status === 'submitting'}
                className={`flex h-10 items-center justify-center gap-2 rounded-lg bg-gray-900 px-5 text-sm font-semibold text-white transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 dark:focus-visible:ring-zinc-600 ${status === 'success' ? 'dash-success-button' : ''}`}
              >
                {status === 'submitting' ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                {status === 'submitting' ? t.redeeming : t.redeemCode}
              </button>
            </div>
          )}
        </form>
      </section>
    </div>
  );
}

function InfoPage({ page }: { page: InfoPageKey }) {
  const { lang } = useContext(LangContext);
  const content = INFO_PAGES[page][lang];

  return (
    <main className="flex-grow px-6 py-10 lg:px-20">
      <section className="mx-auto w-full max-w-3xl rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 sm:p-8">
        <h1 className="text-2xl font-semibold text-gray-950 dark:text-gray-100">{content.title}</h1>
        <div className="mt-5 space-y-4 text-sm leading-6 text-gray-600 dark:text-gray-300">
          {content.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>
      </section>
    </main>
  );
}

function PreviewLoginDialog({ action, onClose }: { action: PreviewLoginAction | null; onClose: () => void }) {
  const navigate = useNavigate();
  const { lang } = useContext(LangContext);
  const { isDark } = useContext(ThemeContext);
  const { settings } = useContext(WallpaperContext);
  if (!action) return null;

  const activeWallpaper = getWallpaperById(settings.wallpaperId);
  const activeWallpaperUrl = settings.wallpaperId === CUSTOM_WALLPAPER_ID ? settings.customWallpaperUrl : activeWallpaper?.src;
  const hasWallpaper = Boolean(activeWallpaperUrl && settings.wallpaperId !== DEFAULT_WALLPAPER_ID);
  const useDarkSurface = hasWallpaper && (isDark || (!isDark && activeWallpaper?.appearance?.lightNav === 'dark'));
  const surfaceOpacity = Math.min(0.9, clampCardOpacity(settings.cardOpacity) + 0.15);
  const dialogSurfaceStyle: CSSProperties | undefined = hasWallpaper
    ? {
        backgroundColor: useDarkSurface ? `rgba(24, 24, 27, ${surfaceOpacity})` : `rgba(255, 255, 255, ${surfaceOpacity})`,
        backdropFilter: 'blur(18px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(18px) saturate(1.2)',
      }
    : undefined;
  const titleClass = useDarkSurface ? 'text-white' : 'text-gray-950 dark:text-gray-100';
  const bodyClass = useDarkSurface ? 'text-white/85' : 'text-gray-700 dark:text-gray-300';

  const membership = action === 'membership';
  const copy = lang === 'zh'
    ? {
        title: '登录后保存你的导航',
        body: membership
          ? '此功能需要先登录，并取得对应会员权限。预览状态不会上传图片或保存会员设置。'
          : '你正在使用访客预览。示例分类与修改不会保存到账号，登录后即可创建自己的导航。',
        cancel: '取消', login: '登录或注册', close: '关闭登录提示',
      }
    : {
        title: 'Sign in to save your navigation',
        body: membership
          ? 'Sign in and obtain the required membership access to use this feature. Preview mode never uploads member assets.'
          : 'You are using the guest preview. Example data and edits are not saved; sign in to build your own navigation.',
        cancel: 'Cancel', login: 'Sign in or register', close: 'Close sign-in prompt',
      };

  return (
    <div className="dash-scrollbar fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto p-4 py-6 sm:items-center">
      <button type="button" aria-label={copy.close} onClick={onClose} className="absolute inset-0 bg-black/45 backdrop-blur-sm" />
      <section style={dialogSurfaceStyle} role="dialog" aria-modal="true" aria-labelledby="preview-login-title" className={`relative max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border p-5 shadow-2xl dash-scrollbar sm:p-6 ${hasWallpaper ? 'border-white/35 dark:border-white/10' : 'border-gray-200 bg-white dark:border-zinc-700 dark:bg-zinc-900'}`}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gray-900 text-white dark:bg-blue-950"><Lock className="h-4.5 w-4.5" /></div>
          <div className="min-w-0 flex-1">
            <h2 id="preview-login-title" className={`text-lg font-semibold ${titleClass}`}>{copy.title}</h2>
            <p className={`mt-2 text-sm leading-6 ${bodyClass}`}>{copy.body}</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" onClick={onClose} className={`flex items-center gap-2 rounded-lg px-6 py-2 text-sm font-medium transition-colors ${useDarkSurface ? 'text-white/85 hover:bg-white/10' : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-zinc-700'}`}><X className="h-4 w-4" />{copy.cancel}</button>
          <button type="button" onClick={() => { onClose(); navigate('/login'); }} className="flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-2 text-sm font-medium text-white transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:bg-blue-950 dark:hover:bg-blue-900 dark:focus-visible:ring-blue-700"><Lock className="h-4 w-4" />{copy.login}</button>
        </div>
      </section>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [lang, setLangState] = useState<Lang>(() => {
    try { return (sessionStorage.getItem(PREVIEW_LANGUAGE_KEY) as Lang) || (localStorage.getItem('lang') as Lang) || 'zh'; } catch { return 'zh'; }
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    try { return (sessionStorage.getItem(PREVIEW_THEME_KEY) || localStorage.getItem('theme')) === 'dark'; } catch { return false; }
  });
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [membershipSummary, setMembershipSummary] = useState<MembershipSummary>({
    plan: 'free',
    categoryCount: 0,
    linkCount: 0,
    loading: true,
  });
  const [wallpaperSettings, setWallpaperSettings] = useState<WallpaperSettings>(() => readCachedWallpaperSettings());
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const authInitializedRef = useRef(false);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [authNotice, setAuthNotice] = useState('');
  const [previewLoginAction, setPreviewLoginAction] = useState<PreviewLoginAction | null>(null);
  const isPreview = !session;

  const setLang = (l: Lang) => {
    setLangState(l);
    try { (isPreview ? sessionStorage : localStorage).setItem(isPreview ? PREVIEW_LANGUAGE_KEY : 'lang', l); } catch {}
  };

  const toggleDark = () => {
    setIsDark(d => {
      const next = !d;
      try { (isPreview ? sessionStorage : localStorage).setItem(isPreview ? PREVIEW_THEME_KEY : 'theme', next ? 'dark' : 'light'); } catch {}
      return next;
    });
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const ensureProfile = async (nextSession: Session | null) => {
    if (!nextSession) {
      setProfile(null);
      return;
    }

    const fallbackName = getFallbackName(nextSession);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .eq('id', nextSession.user.id)
      .maybeSingle();

    if (!error && data) {
      setProfile(data as UserProfile);
      return;
    }

    const { data: created, error: createError } = await supabase
      .from('profiles')
      .insert({
        id: nextSession.user.id,
        display_name: fallbackName,
        avatar_url: null,
      })
      .select('id, display_name, avatar_url')
      .single();

    if (!createError && created) {
      setProfile(created as UserProfile);
    } else {
      console.error('Error ensuring profile:', createError ?? error);
      setProfile({ id: nextSession.user.id, display_name: fallbackName, avatar_url: null });
    }
  };

  const updateProfile = async (patch: ProfilePatch) => {
    if (!session) return { error: 'Not signed in' };

    const updates: Record<string, string | null> = {
      updated_at: new Date().toISOString(),
    };

    if (patch.display_name !== undefined) updates.display_name = patch.display_name;
    if (patch.avatar_url !== undefined) updates.avatar_url = patch.avatar_url;

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', session.user.id)
      .select('id, display_name, avatar_url')
      .single();

    if (error) {
      console.error('Error updating profile:', error);
      return { error: error.message };
    }

    setProfile(data as UserProfile);
    return {};
  };

  const uploadProfileAvatar = async (file: File) => {
    if (!session) return { error: 'Not signed in' };
    if (membershipSummary.plan !== 'lifetime') {
      setUpgradeOpen(true);
      return { error: 'Membership required' };
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      return { error: 'Unsupported image type' };
    }
    if (file.size > 5 * 1024 * 1024) {
      return { error: 'Image must be smaller than 5MB' };
    }

    const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${session.user.id}/avatars/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage
      .from('wallpapers')
      .upload(path, file, {
        cacheControl: '31536000',
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('Error uploading avatar:', error);
      return { error: error.message };
    }

    const url = getCustomWallpaperUrl(path);
    return url ? { url } : { error: 'Could not create avatar URL' };
  };

  const refreshMembership = async (targetSession: Session | null = session) => {
    if (!targetSession) {
      setMembershipSummary({ plan: 'free', categoryCount: 0, linkCount: 0, loading: false });
      return;
    }

    setMembershipSummary((current) => ({ ...current, loading: true }));

    const { data, error } = await supabase.rpc('get_membership_summary');
    if (error) {
      console.error('Error loading membership summary:', error);
      setMembershipSummary((current) => ({ ...current, loading: false }));
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    setMembershipSummary({
      plan: isLifetimePlan(row?.plan) ? 'lifetime' : 'free',
      categoryCount: Number(row?.category_count ?? 0),
      linkCount: Number(row?.link_count ?? 0),
      loading: false,
    });
  };

  const redeemMembershipCode = async (code: string) => {
    const normalizedCode = normalizeMembershipCodeInput(code);
    if (!normalizedCode) {
      return { ok: false, status: 'invalid', message: ACCOUNT_LABELS[lang].invalidCode };
    }

    const { data, error } = await supabase.rpc('redeem_membership_code', { input_code: normalizedCode });
    if (error) {
      console.error('Error redeeming membership code:', error);
      return { ok: false, status: 'error', message: ACCOUNT_LABELS[lang].invalidCode };
    }

    const result = data as { ok?: boolean; status?: string; message?: string; plan?: string };
    if (result?.ok) {
      await refreshMembership();
    }

    return {
      ok: Boolean(result?.ok),
      status: result?.status ?? 'unknown',
      message: result?.message ?? (result?.ok ? ACCOUNT_LABELS[lang].alreadyMember : ACCOUNT_LABELS[lang].invalidCode),
    };
  };

  const refreshWallpaperSettings = async (targetSession: Session | null = session) => {
    if (!targetSession) {
      setWallpaperSettings(readPreviewWallpaperSettings());
      return;
    }

    setWallpaperSettings((current) => ({ ...current, loading: true }));

    const { data, error } = await supabase.rpc('get_wallpaper_setting');
    if (error) {
      console.error('Error loading wallpaper settings:', error);
      setWallpaperSettings((current) => ({ ...current, loading: false }));
      return;
    }

    const row = Array.isArray(data) ? data[0] : data;
    const next = normalizeWallpaperSettings({
      wallpaperId: row?.wallpaper_id ?? DEFAULT_WALLPAPER_ID,
      customWallpaperPath: row?.custom_wallpaper_path ?? null,
      cardOpacity: Number(row?.card_opacity ?? DEFAULT_CARD_OPACITY),
      loading: false,
    });
    setWallpaperSettings(next);
    cacheWallpaperSettings(next);
  };

  const saveWallpaperSettings = async (input: WallpaperSaveInput) => {
    if (!session) {
      const wallpaper = getWallpaperById(input.wallpaperId);
      if (input.wallpaperId === CUSTOM_WALLPAPER_ID || wallpaper?.access === 'lifetime') {
        setPreviewLoginAction('membership');
        return { error: 'Membership required' };
      }
      if (input.wallpaperId !== DEFAULT_WALLPAPER_ID && !wallpaper) return { error: 'Invalid wallpaper' };
      const next = normalizeWallpaperSettings({
        wallpaperId: input.wallpaperId,
        cardOpacity: clampCardOpacity(input.cardOpacity),
        loading: false,
      });
      setWallpaperSettings(next);
      try {
        sessionStorage.setItem(PREVIEW_WALLPAPER_KEY, next.wallpaperId);
        sessionStorage.setItem(PREVIEW_OPACITY_KEY, String(next.cardOpacity));
      } catch {}
      return {};
    }

    const wallpaper = getWallpaperById(input.wallpaperId);
    if ((input.wallpaperId === CUSTOM_WALLPAPER_ID || isBuiltInLifetimeWallpaper(input.wallpaperId)) && membershipSummary.plan !== 'lifetime') {
      setUpgradeOpen(true);
      return { error: 'Membership required' };
    }

    if (input.wallpaperId !== DEFAULT_WALLPAPER_ID && input.wallpaperId !== CUSTOM_WALLPAPER_ID && !wallpaper) {
      return { error: 'Invalid wallpaper' };
    }

    const { data, error } = await supabase.rpc('save_wallpaper_setting', {
      p_wallpaper_id: input.wallpaperId,
      p_custom_wallpaper_path: input.wallpaperId === CUSTOM_WALLPAPER_ID ? input.customWallpaperPath ?? null : null,
      p_card_opacity: clampCardOpacity(input.cardOpacity),
    });

    if (error) {
      console.error('Error saving wallpaper settings:', error);
      return { error: error.message };
    }

    const row = Array.isArray(data) ? data[0] : data;
    const next = normalizeWallpaperSettings({
      wallpaperId: row?.wallpaper_id ?? input.wallpaperId,
      customWallpaperPath: row?.custom_wallpaper_path ?? (input.wallpaperId === CUSTOM_WALLPAPER_ID ? input.customWallpaperPath ?? null : null),
      customWallpaperUrl: input.wallpaperId === CUSTOM_WALLPAPER_ID ? input.customWallpaperUrl ?? null : null,
      cardOpacity: Number(row?.card_opacity ?? input.cardOpacity),
      loading: false,
    });
    setWallpaperSettings(next);
    cacheWallpaperSettings(next);
    return {};
  };

  const uploadCustomWallpaper = async (file: File) => {
    if (!session) {
      setPreviewLoginAction('membership');
      return { error: 'Membership required' };
    }
    if (membershipSummary.plan !== 'lifetime') {
      setUpgradeOpen(true);
      return { error: 'Membership required' };
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      return { error: 'Unsupported image type' };
    }
    if (file.size > 5 * 1024 * 1024) {
      return { error: 'Image must be smaller than 5MB' };
    }

    const extension = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${session.user.id}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase.storage
      .from('wallpapers')
      .upload(path, file, {
        cacheControl: '31536000',
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      console.error('Error uploading wallpaper:', error);
      return { error: error.message };
    }

    const url = getCustomWallpaperUrl(path);
    return url ? { path, url } : { error: 'Could not create wallpaper URL' };
  };

  useEffect(() => {
    if (!authInitializedRef.current) return;
    void refreshMembership();
  }, [session?.user.id]);

  useEffect(() => {
    if (!authInitializedRef.current) return;
    void refreshWallpaperSettings();
  }, [session?.user.id]);

  useEffect(() => {
    let active = true;

    const initializeAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (!active) return;
      setSession(data.session);
      if (!data.session) {
        try {
          setLangState((sessionStorage.getItem(PREVIEW_LANGUAGE_KEY) as Lang) || 'zh');
          setIsDark(sessionStorage.getItem(PREVIEW_THEME_KEY) === 'dark');
        } catch {
          setLangState('zh');
          setIsDark(false);
        }
        setWallpaperSettings(readPreviewWallpaperSettings());
        setMembershipSummary({ plan: 'free', categoryCount: 0, linkCount: 0, loading: false });
      }
      if (!passwordRecovery) {
        if (data.session) {
          await Promise.all([
            ensureProfile(data.session),
            refreshMembership(data.session),
            refreshWallpaperSettings(data.session),
          ]);
        } else {
          await ensureProfile(null);
        }
      }
      if (!active) return;
      authInitializedRef.current = true;
      setAuthLoading(false);
    };

    void initializeAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
        setSession(nextSession);
        setAuthLoading(false);
        return;
      }

      if (!authInitializedRef.current && event === 'INITIAL_SESSION') return;

      if (event === 'SIGNED_OUT') {
        setPasswordRecovery(false);
        try {
          sessionStorage.removeItem(PREVIEW_LANGUAGE_KEY);
          sessionStorage.removeItem(PREVIEW_THEME_KEY);
          sessionStorage.removeItem(PREVIEW_WALLPAPER_KEY);
          sessionStorage.removeItem(PREVIEW_OPACITY_KEY);
        } catch {}
        setLangState('zh');
        setIsDark(false);
        setWallpaperSettings(readPreviewWallpaperSettings());
        setMembershipSummary({ plan: 'free', categoryCount: 0, linkCount: 0, loading: false });
        setProfile(null);
        setSession(null);
        setAuthLoading(false);
        return;
      }

      setSession(nextSession);
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        setAuthLoading(true);
        window.setTimeout(() => {
          void Promise.all([
            ensureProfile(nextSession),
            refreshMembership(nextSession),
            refreshWallpaperSettings(nextSession),
          ]).finally(() => {
            if (active) setAuthLoading(false);
          });
        }, 0);
      }
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return (
    <BrowserRouter>
    <ThemeContext.Provider value={{ isDark, toggleDark }}>
      <LangContext.Provider value={{ lang, setLang }}>
        <PreviewContext.Provider value={{ isPreview, requestLogin: (action = 'save') => setPreviewLoginAction(action) }}>
        <AuthContext.Provider value={{ session, profile, updateProfile, uploadProfileAvatar }}>
          <MembershipContext.Provider
            value={{
              summary: membershipSummary,
              refreshMembership,
              redeemMembershipCode,
              openUpgradeDialog: () => setUpgradeOpen(true),
            }}
          >
            <WallpaperContext.Provider
              value={{
                settings: wallpaperSettings,
                refreshWallpaperSettings,
                saveWallpaperSettings,
                uploadCustomWallpaper,
              }}
            >
              {authLoading ? (
                <LoadingScreen />
              ) : passwordRecovery ? (
                <PasswordResetScreen onDone={(notice) => {
                  setPasswordRecovery(false);
                  setAuthNotice(notice);
                }} />
              ) : (
                <Routes>
                  <Route path="/login" element={session ? <Navigate to="/" replace /> : <AuthScreen notice={authNotice} />} />
                  <Route path="*" element={(
                    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-zinc-950 dark:to-zinc-900 flex flex-col transition-colors duration-200">
                      <NavBar />
                      <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/categories" element={<Categories />} />
                        <Route path="/privacy" element={<InfoPage page="privacy" />} />
                        <Route path="/terms" element={<InfoPage page="terms" />} />
                        <Route path="/docs" element={<InfoPage page="docs" />} />
                        <Route path="/help" element={<InfoPage page="help" />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </div>
                  )} />
                </Routes>
              )}
              {!isPreview && <UpgradeDialog open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />}
              <PreviewLoginDialog action={previewLoginAction} onClose={() => setPreviewLoginAction(null)} />
            </WallpaperContext.Provider>
          </MembershipContext.Provider>
        </AuthContext.Provider>
        </PreviewContext.Provider>
      </LangContext.Provider>
    </ThemeContext.Provider>
    </BrowserRouter>
  );
}
