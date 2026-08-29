import { createContext, useContext, useState, useRef, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router';
import { ChevronDown, Languages, Loader2, Lock, LogOut, Mail, Moon, Sun, UserRound } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';
import Home from './components/Home';
import Categories from './components/Categories';
import { supabase } from './lib/supabase';

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

type UserProfile = {
  id: string;
  display_name: string;
  avatar_url: string | null;
};

type ProfilePatch = {
  display_name: string;
};

// ─── Nav labels ───────────────────────────────────────────────────────────────

const NAV_LABELS: Record<Lang, { home: string; categories: string; signOut: string }> = {
  en: { home: 'Home', categories: 'Categories', signOut: 'Sign out' },
  zh: { home: '主页', categories: '分类', signOut: '退出' },
};

const ACCOUNT_LABELS = {
  en: {
    account: 'Account',
    displayName: 'Display name',
    saving: 'Saving...',
    saved: 'Saved',
    signOut: 'Sign out',
    profileError: 'Could not save profile. Please try again.',
  },
  zh: {
    account: '账号',
    displayName: '用户名',
    saving: '保存中...',
    saved: '已保存',
    signOut: '退出账号',
    profileError: '资料保存失败，请重试。',
  },
};

const AUTH_LABELS = {
  en: {
    title: 'Dash-Navigation',
    subtitle: '定制和分享你的浏览器导航页',
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
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-100 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-300 dark:hover:bg-zinc-800 dark:hover:text-white dark:focus-visible:ring-zinc-600"
      >
        <Languages className="h-4.5 w-4.5" />
      </button>
      <button
        type="button"
        onClick={toggleDark}
        title={isDark ? (lang === 'en' ? 'Light mode' : '浅色模式') : (lang === 'en' ? 'Dark mode' : '深色模式')}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-100 hover:text-gray-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:border-zinc-700 dark:bg-zinc-900 dark:text-gray-300 dark:hover:bg-zinc-800 dark:hover:text-white dark:focus-visible:ring-zinc-600"
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
  const [accountOpen, setAccountOpen] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [profileStatus, setProfileStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const accountRef = useRef<HTMLDivElement>(null);

  const isActive = (path: string) => location.pathname === path;
  const labels = NAV_LABELS[lang];
  const accountLabels = ACCOUNT_LABELS[lang];
  const email = session?.user.email ?? '';
  const name = profile?.display_name || getFallbackName(session);

  useEffect(() => {
    setDisplayName(name);
  }, [name]);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleProfileBlur = async () => {
    const nextName = displayName.trim() || getFallbackName(session);
    if (nextName === name || profileStatus === 'saving') return;

    setProfileStatus('saving');
    const result = await updateProfile({
      display_name: nextName,
    });
    setProfileStatus(result.error ? 'error' : 'saved');
    if (!result.error) {
      window.setTimeout(() => setProfileStatus('idle'), 1400);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/85 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800 shadow-sm transition-colors duration-200">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-20 py-4 flex justify-between items-center">
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
              className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gray-900 text-white shadow-sm transition hover:scale-[1.03] hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white dark:focus-visible:ring-zinc-600"
            >
              <UserRound className="h-4 w-4" />
            </button>
            {accountOpen && (
              <div className="absolute right-0 top-full mt-3 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-gray-200 bg-white p-4 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gray-900 text-white dark:bg-zinc-100 dark:text-zinc-950">
                    <UserRound className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900 dark:text-gray-100">{name}</p>
                    <p className="truncate text-xs text-gray-500 dark:text-gray-400">{email}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="block">
                    <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{accountLabels.displayName}</span>
                    <input
                      value={displayName}
                      onChange={(event) => setDisplayName(event.target.value)}
                      onBlur={handleProfileBlur}
                      className="mt-1.5 w-full rounded-lg bg-gray-100 px-3 py-2.5 text-sm text-gray-900 outline-none ring-1 ring-transparent transition focus:ring-gray-300 dark:bg-zinc-800 dark:text-gray-100 dark:focus:ring-zinc-600"
                    />
                  </label>
                  {profileStatus === 'saving' && <p className="text-xs text-gray-500 dark:text-gray-400">{accountLabels.saving}</p>}
                  {profileStatus === 'saved' && <p className="text-xs text-green-600 dark:text-green-400">{accountLabels.saved}</p>}
                  {profileStatus === 'error' && (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700 dark:bg-red-950/40 dark:text-red-300">
                      {accountLabels.profileError}
                    </p>
                  )}
                  <div className="flex items-center justify-end gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => supabase.auth.signOut()}
                      className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:text-gray-300 dark:hover:bg-zinc-800 dark:hover:text-gray-100 dark:focus-visible:ring-zinc-600"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      {accountLabels.signOut}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
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
          <div className="mt-0.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gray-900 text-white dark:bg-zinc-100 dark:text-zinc-950">
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
                className="mt-1.5 w-full rounded-lg bg-gray-100 px-3 py-2.5 text-center font-mono text-lg tracking-[0.35em] text-gray-900 outline-none ring-1 ring-transparent transition placeholder:text-sm placeholder:tracking-normal focus:ring-gray-300 dark:bg-zinc-800 dark:text-gray-100 dark:focus:ring-zinc-600"
              />
            </label>
          )}

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
          {message && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950/40 dark:text-green-300">{message}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white dark:focus-visible:ring-zinc-600"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {primaryButtonLabel}
          </button>
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
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

        <div className="mt-5 flex justify-end">
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
          <div className="mt-0.5 flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-gray-900 text-white dark:bg-zinc-100 dark:text-zinc-950">
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
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white dark:focus-visible:ring-zinc-600"
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

    const { data, error } = await supabase
      .from('profiles')
      .update({
        display_name: patch.display_name,
        updated_at: new Date().toISOString(),
      })
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

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (!passwordRecovery) {
        await ensureProfile(data.session);
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
        </AuthContext.Provider>
      </LangContext.Provider>
    </ThemeContext.Provider>
  );
}
