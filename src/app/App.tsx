import { createContext, useContext, useState, useRef, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from 'react-router';
import { ChevronDown, Loader2, Lock, LogOut, Mail } from 'lucide-react';
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
}>({ session: null });

// ─── Nav labels ───────────────────────────────────────────────────────────────

const NAV_LABELS: Record<Lang, { home: string; categories: string; signOut: string }> = {
  en: { home: 'Home', categories: 'Categories', signOut: 'Sign out' },
  zh: { home: '主页', categories: '分类', signOut: '退出' },
};

const AUTH_LABELS = {
  en: {
    title: 'Dash',
    subtitle: 'Sign in to keep every navigation collection private to its owner.',
    email: 'Email',
    password: 'Password',
    signIn: 'Sign in',
    signUp: 'Create account',
    switchToSignUp: 'Need an account?',
    switchToSignIn: 'Already have an account?',
    loading: 'Loading your private navigation...',
    success: 'Check your email if confirmation is required, then sign in.',
  },
  zh: {
    title: 'Dash',
    subtitle: '登录后，每个人只能看到和管理自己的网址导航。',
    email: '邮箱',
    password: '密码',
    signIn: '登录',
    signUp: '创建账号',
    switchToSignUp: '还没有账号？',
    switchToSignIn: '已有账号？',
    loading: '正在加载你的私人导航...',
    success: '如果开启了邮箱确认，请先查收邮件，然后再登录。',
  },
};

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
  const { session } = useContext(AuthContext);

  const isActive = (path: string) => location.pathname === path;
  const labels = NAV_LABELS[lang];
  const email = session?.user.email ?? '';

  return (
    <nav className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/85 backdrop-blur-md border-b border-gray-200 dark:border-zinc-800 shadow-sm transition-colors duration-200">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-20 py-4 flex justify-between items-center">
        <div className="text-xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Dash</div>
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
          <div className="hidden sm:flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-zinc-800">
            <span className="max-w-40 truncate text-xs text-gray-500 dark:text-gray-400" title={email}>{email}</span>
            <button
              type="button"
              onClick={() => supabase.auth.signOut()}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:text-gray-300 dark:hover:bg-zinc-800 dark:hover:text-gray-100 dark:focus-visible:ring-zinc-600"
            >
              <LogOut className="h-3.5 w-3.5" />
              {labels.signOut}
            </button>
          </div>
          <button
            type="button"
            onClick={() => supabase.auth.signOut()}
            title={labels.signOut}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 sm:hidden dark:text-gray-300 dark:hover:bg-zinc-800 dark:hover:text-gray-100 dark:focus-visible:ring-zinc-600"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </nav>
  );
}

function AuthScreen() {
  const { lang } = useContext(LangContext);
  const t = AUTH_LABELS[lang];
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');
    setError('');

    const authCall = mode === 'sign-in'
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password });

    const { error: authError } = await authCall;
    if (authError) {
      setError(authError.message);
    } else if (mode === 'sign-up') {
      setMessage(t.success);
    }
    setSubmitting(false);
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-gray-50 to-gray-100 px-6 py-10 transition-colors duration-200 dark:from-zinc-950 dark:to-zinc-900">
      <section className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-900 text-white dark:bg-zinc-100 dark:text-zinc-950">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{t.title}</h1>
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

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">{error}</p>}
          {message && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950/40 dark:text-green-300">{message}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-gray-900 px-4 text-sm font-semibold text-white transition hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-white dark:focus-visible:ring-zinc-600"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'sign-in' ? t.signIn : t.signUp}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
            setError('');
            setMessage('');
          }}
          className="mt-5 text-sm font-medium text-gray-600 underline-offset-4 hover:text-gray-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300 dark:text-gray-300 dark:hover:text-gray-100 dark:focus-visible:ring-zinc-600"
        >
          {mode === 'sign-in' ? t.switchToSignUp : t.switchToSignIn}
        </button>
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
  const [authLoading, setAuthLoading] = useState(true);

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

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setAuthLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  return (
    <ThemeContext.Provider value={{ isDark, toggleDark }}>
      <LangContext.Provider value={{ lang, setLang }}>
        <AuthContext.Provider value={{ session }}>
          {authLoading ? (
            <LoadingScreen />
          ) : !session ? (
            <AuthScreen />
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
