import { createContext, useContext, useState, useRef, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router';
import { CheckCircle2, ChevronDown, Diamond, ExternalLink, Grid2X2, KeyRound, Languages, Loader2, Lock, LogOut, Mail, PanelTop, Pencil, Settings, Sparkles, Sun, Moon, UserRound, X } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import Home from './components/Home';
import Categories from './components/Categories';
import WallpaperDialog from './components/WallpaperDialog';
import { supabase } from './lib/supabase';
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
}>({ session: null, profile: null, updateProfile: async () => ({}) });

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

// ─── Nav labels ───────────────────────────────────────────────────────────────

const NAV_LABELS: Record<Lang, { home: string; categories: string; signOut: string }> = {
  en: { home: 'Home', categories: 'Categories', signOut: 'Sign out' },
  zh: { home: '主页', categories: '分类', signOut: '退出' },
};

const ACCOUNT_LABELS = {
  en: {
    account: 'Account',
    displayName: 'Display name',
    avatarUrl: 'Avatar URL',
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
    avatarUrl: '头像地址',
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

function ModeControls() {
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
    </div>
  );
}

// ─── NavDropdown (narrow screens) ────────────────────────────────────────────

function NavDropdown() {
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
        <div className="absolute right-0 top-full mt-2 w-36 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg shadow-lg overflow-hidden z-50">
          {pages.map(page => (
            <button
              key={page.path}
              onClick={() => { navigate(page.path); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${
                location.pathname === page.path
                  ? 'bg-gray-100 dark:bg-zinc-700 text-gray-900 dark:text-gray-100'
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
  const { lang } = useContext(LangContext);
  const { session, profile, updateProfile } = useContext(AuthContext);
  const { summary, openUpgradeDialog } = useContext(MembershipContext);
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
  const email = session?.user.email ?? '';
  const name = profile?.display_name || getFallbackName(session);
  const avatarUrl = profile?.avatar_url || '';
  const isLifetime = summary.plan === 'lifetime';
  const planLabel = isLifetime ? accountLabels.lifetime : accountLabels.free;
  const categoryUsage = isLifetime ? '∞' : `${summary.categoryCount}/${FREE_CATEGORY_LIMIT}`;
  const linkUsage = isLifetime ? '∞' : `${summary.linkCount}/${FREE_LINK_LIMIT}`;

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
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/85 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800 shadow-sm transition-colors duration-200">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-20 py-3 flex justify-between items-center">
        <div className="text-lg font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-xl">Dash</div>
        <div className="flex items-center gap-4 md:gap-8">
          <div className="flex items-baseline gap-4 md:gap-8">
            <NavDropdown />
            <Link
              to="/"
              className={`hidden md:block font-medium text-sm ${
                isActive('/')
                  ? 'text-gray-900 dark:text-gray-100 border-b-2 border-gray-900 dark:border-zinc-100 pb-1'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors'
              }`}
            >
              {labels.home}
            </Link>
            <Link
              to="/categories"
              className={`hidden md:block font-medium text-sm ${
                isActive('/categories')
                  ? 'text-gray-900 dark:text-gray-100 border-b-2 border-gray-900 dark:border-zinc-100 pb-1'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors'
              }`}
            >
              {labels.categories}
            </Link>
          </div>
          <div ref={accountRef} className="relative pl-2 sm:pl-4 sm:border-l sm:border-gray-200 dark:sm:border-zinc-800">
            <button
              type="button"
              onClick={() => setAccountOpen((open) => !open)}
              title={email || accountLabels.account}
              aria-label={accountLabels.account}
              className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gray-900 text-white shadow-sm transition hover:scale-[1.03] hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:bg-blue-950 dark:text-white dark:hover:bg-blue-900 dark:focus-visible:ring-blue-700"
            >
              <UserRound className="h-4 w-4" />
            </button>
            {accountOpen && (
              <div className="absolute right-0 top-full mt-3 max-h-[calc(100vh-5rem)] w-[min(21rem,calc(100vw-1.5rem))] overflow-y-auto rounded-lg border border-gray-200 bg-white p-4 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-900 text-white dark:bg-blue-950 dark:text-white">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <UserRound className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                      <p className="truncate text-base font-semibold leading-5 text-gray-950 dark:text-gray-100">{name}</p>
                      <span className={`inline-flex h-5 flex-shrink-0 items-center rounded-full px-2 text-xs font-medium ${
                        isLifetime
                          ? 'bg-gray-900 text-white dark:bg-zinc-100 dark:text-zinc-950'
                          : 'bg-gray-200 text-gray-600 dark:bg-zinc-700 dark:text-zinc-300'
                      }`}>
                        {planLabel}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs leading-4 text-gray-500 dark:text-gray-400">{email}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAccountOpen(false);
                      setEditProfileOpen(true);
                    }}
                    className="flex h-10 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus-visible:ring-zinc-600"
                  >
                    <Pencil className="h-4 w-4 flex-shrink-0 text-gray-500 dark:text-zinc-400" />
                    <span>{accountLabels.editAccount}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAccountOpen(false);
                      setWallpaperOpen(true);
                    }}
                    className="flex h-10 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus-visible:ring-zinc-600"
                  >
                    <Settings className="h-4 w-4 flex-shrink-0 text-gray-500 dark:text-zinc-400" />
                    <span>{accountLabels.setWallpaper}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isLifetime) {
                        setAccountOpen(false);
                        openUpgradeDialog();
                      }
                    }}
                    className="flex h-10 w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:text-zinc-200 dark:hover:bg-zinc-800 dark:focus-visible:ring-zinc-600"
                  >
                    <Diamond className="h-4 w-4 flex-shrink-0 text-gray-500 dark:text-zinc-400" />
                    <span>{isLifetime ? accountLabels.alreadyMember : accountLabels.upgrade}</span>
                  </button>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-gray-100 pt-3 dark:border-zinc-800">
                  <div className="flex min-w-0 items-center gap-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                    <div className="flex items-center gap-1.5">
                      <Grid2X2 className="h-3.5 w-3.5" />
                      <span>{categoryUsage}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <PanelTop className="h-3.5 w-3.5" />
                      <span>{linkUsage}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => supabase.auth.signOut()}
                    className="inline-flex h-8 flex-shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:text-gray-400 dark:hover:bg-zinc-800 dark:hover:text-gray-100 dark:focus-visible:ring-zinc-600"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    {accountLabels.signOut}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className={`fixed bottom-6 right-6 z-[70] flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg transition-all duration-300 pointer-events-none ${
        profileToast === null ? 'translate-y-2 opacity-0' : 'translate-y-0 opacity-100'
      } ${
        profileToast?.status === 'error'
          ? 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-200'
          : 'bg-gray-900 text-white dark:bg-blue-950'
      }`}>
        {profileToast?.status === 'saving' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle2 className="h-4 w-4" />
        )}
        <span>{profileToast?.msg ?? ''}</span>
      </div>
    </nav>
    <EditProfileDialog
      open={editProfileOpen}
      onClose={() => setEditProfileOpen(false)}
      name={displayName}
      email={email}
      avatarUrl={avatarInput}
      isLifetime={isLifetime}
      onSave={handleProfileSave}
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
  onUpgrade,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  email: string;
  avatarUrl: string;
  isLifetime: boolean;
  onSave: (name: string, avatarUrl: string) => Promise<boolean>;
  onUpgrade: () => void;
}) {
  const { lang } = useContext(LangContext);
  const t = ACCOUNT_LABELS[lang];
  const [draftName, setDraftName] = useState(name);
  const [draftAvatar, setDraftAvatar] = useState(avatarUrl);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDraftName(name);
      setDraftAvatar(avatarUrl);
      setSaving(false);
    }
  }, [avatarUrl, name, open]);

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    const ok = await onSave(draftName, draftAvatar);
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto p-4 py-6 sm:items-center">
      <button
        type="button"
        aria-label="Close profile dialog"
        onClick={onClose}
        className="absolute inset-0 bg-black/45 backdrop-blur-sm"
      />
      <section className="relative max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900 sm:p-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Pencil className="h-5 w-5 text-gray-900 dark:text-gray-100" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{t.editAccount}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:text-gray-400 dark:hover:bg-zinc-800 dark:hover:text-gray-100 dark:focus-visible:ring-zinc-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-3 rounded-lg bg-gray-100 p-3 dark:bg-zinc-800">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-900 text-white dark:bg-blue-950">
              {draftAvatar && isLifetime ? (
                <img src={draftAvatar} alt="" className="h-full w-full object-cover" />
              ) : (
                <UserRound className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{draftName || name}</p>
              <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">{email}</p>
            </div>
          </div>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t.displayName}</span>
            <input
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              className="mt-1.5 w-full rounded-lg bg-gray-100 px-3 py-2.5 text-base text-gray-900 outline-none ring-1 ring-transparent transition focus:ring-2 focus:ring-gray-300 dark:bg-zinc-800 dark:text-gray-100 dark:focus:ring-zinc-600"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{t.avatarUrl}</span>
            <input
              value={isLifetime ? draftAvatar : ''}
              onChange={(event) => setDraftAvatar(event.target.value)}
              disabled={!isLifetime}
              placeholder="https://..."
              className="mt-1.5 w-full rounded-lg bg-gray-100 px-3 py-2.5 text-base text-gray-900 outline-none ring-1 ring-transparent transition placeholder:text-gray-400 focus:ring-2 focus:ring-gray-300 disabled:cursor-not-allowed disabled:text-gray-400 dark:bg-zinc-800 dark:text-gray-100 dark:focus:ring-zinc-600"
            />
          </label>

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
              disabled={saving}
              className="flex h-10 items-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-950 dark:hover:bg-blue-900 dark:focus-visible:ring-blue-700"
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

  const redirectTo = typeof window !== 'undefined' ? window.location.origin : 'https://dash-navigation.vercel.app';

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

    if (mode === 'sign-in') {
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) setError(authError.message);
    }

    if (mode === 'sign-up') {
      const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
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
      });

      if (resetError) {
        setError(resetError.message);
      } else {
        setMessage(t.resetSent);
      }
    }

    setSubmitting(false);
  };

  const handleResendCode = async () => {
    if (!email || submitting) return;
    setSubmitting(true);
    setError('');
    setMessage('');

    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: redirectTo,
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
          <ModeControls />
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
    <main className="flex min-h-screen items-center justify-center bg-gray-50 text-gray-600 dark:bg-zinc-950 dark:text-gray-300">
      <div className="flex items-center gap-3 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        {AUTH_LABELS[lang].loading}
      </div>
    </main>
  );
}

function UpgradeDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { lang } = useContext(LangContext);
  const { summary, redeemMembershipCode } = useContext(MembershipContext);
  const t = ACCOUNT_LABELS[lang];
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const xianyuUrl = (import.meta.env.VITE_XIANYU_MEMBERSHIP_URL as string | undefined) || '#';
  const isLifetime = summary.plan === 'lifetime';

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
      <section className="relative w-full max-w-md rounded-xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {status === 'success' ? (
              <Sparkles className="h-5 w-5 text-gray-900 dark:text-gray-100" />
            ) : (
              <Diamond className="h-5 w-5 text-gray-900 dark:text-gray-100" />
            )}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{isLifetime ? t.alreadyMember : t.upgradeTitle}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:text-gray-400 dark:hover:bg-zinc-800 dark:hover:text-gray-100 dark:focus-visible:ring-zinc-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="rounded-lg bg-gray-100 p-4 dark:bg-zinc-800">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{t.lifetime}</p>
              <p className="mt-1 text-3xl font-semibold text-gray-950 dark:text-gray-100">{t.upgradePrice}</p>
            </div>
            <div className="text-right text-sm text-gray-600 dark:text-gray-300">
              <p>{lang === 'zh' ? '分类不限' : 'Unlimited categories'}</p>
              <p>{lang === 'zh' ? '网站不限' : 'Unlimited sites'}</p>
            </div>
          </div>
        </div>

        {!isLifetime && (
          <a
            href={xianyuUrl}
            target="_blank"
            rel="noreferrer"
            className={`mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 dark:focus-visible:ring-zinc-600 ${xianyuUrl === '#' ? 'pointer-events-none opacity-60' : ''}`}
          >
            <ExternalLink className="h-4 w-4" />
            {t.buyOnXianyu}
          </a>
        )}

        <form onSubmit={handleRedeem} className="mt-5 space-y-3">
          <label className="block">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{t.redeemCode}</span>
            <span className="mt-2 flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2.5 ring-1 ring-transparent transition focus-within:ring-2 focus-within:ring-gray-300 dark:bg-zinc-800 dark:focus-within:ring-zinc-600">
              <KeyRound className="h-4 w-4 flex-shrink-0 text-gray-400" />
              <input
                value={code}
                onChange={(event) => setCode(formatMembershipCodeInput(event.target.value))}
                placeholder={t.codePlaceholder}
                disabled={status === 'submitting' || isLifetime}
                className="min-w-0 flex-1 bg-transparent font-mono text-sm uppercase tracking-wider text-gray-900 outline-none placeholder:font-sans placeholder:tracking-normal placeholder:text-gray-400 disabled:opacity-60 dark:text-gray-100"
              />
            </span>
          </label>
          {message && (
            <p className={`rounded-lg px-3 py-2 text-sm ${
              status === 'success'
                ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
            }`}>
              {message}
            </p>
          )}
          {!isLifetime && (
            <button
              type="submit"
              disabled={!code.trim() || status === 'submitting'}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-blue-950 dark:hover:bg-blue-900 dark:focus-visible:ring-blue-700"
            >
              {status === 'submitting' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {status === 'submitting' ? t.redeeming : t.redeemCode}
            </button>
          )}
        </form>
      </section>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  const [lang, setLangState] = useState<Lang>(() => {
    try { return (localStorage.getItem('lang') as Lang) || 'en'; } catch { return 'en'; }
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    try { return localStorage.getItem('theme') === 'dark'; } catch { return false; }
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
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [authNotice, setAuthNotice] = useState('');

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem('lang', l); } catch {}
  };

  const toggleDark = () => {
    setIsDark(d => {
      const next = !d;
      try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch {}
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

  const refreshMembership = async () => {
    if (!session) {
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

  const refreshWallpaperSettings = async () => {
    if (!session) {
      setWallpaperSettings((current) => ({ ...current, loading: false }));
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
    if (!session) return { error: 'Not signed in' };

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
    void refreshMembership();
  }, [session?.user.id]);

  useEffect(() => {
    void refreshWallpaperSettings();
  }, [session?.user.id]);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (!passwordRecovery) {
        void ensureProfile(data.session);
      }
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordRecovery(true);
        setSession(nextSession);
        setAuthLoading(false);
        return;
      }

      if (event === 'SIGNED_OUT') {
        setPasswordRecovery(false);
      }

      setSession(nextSession);
      void ensureProfile(nextSession);
      setAuthLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <ThemeContext.Provider value={{ isDark, toggleDark }}>
      <LangContext.Provider value={{ lang, setLang }}>
        <AuthContext.Provider value={{ session, profile, updateProfile }}>
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
              ) : !session ? (
                <AuthScreen notice={authNotice} />
              ) : (
                <BrowserRouter>
                  <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-zinc-950 dark:to-zinc-900 flex flex-col transition-colors duration-200">
                    <NavBar />
                    <Routes>
                      <Route path="/" element={<Home />} />
                      <Route path="/categories" element={<Categories />} />
                    </Routes>
                  </div>
                </BrowserRouter>
              )}
              <UpgradeDialog open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
            </WallpaperContext.Provider>
          </MembershipContext.Provider>
        </AuthContext.Provider>
      </LangContext.Provider>
    </ThemeContext.Provider>
  );
}
