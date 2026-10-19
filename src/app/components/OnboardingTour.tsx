import { createContext, lazy, Suspense, useContext, useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { AuthContext } from '../App';
import { useCategories } from '../hooks/useCategories';
import { initialOnboardingStep, onboardingStorageKey } from '../lib/onboarding';

export const OnboardingContext = createContext<{ active: boolean; step: number | null }>({ active: false, step: null });

const OnboardingPopover = lazy(() => import('./OnboardingPopover'));

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { session } = useContext(AuthContext);
  const { loading } = useCategories();
  const location = useLocation();
  const navigate = useNavigate();
  const preview = import.meta.env.DEV && new URLSearchParams(location.search).get('onboarding') === 'preview';
  const [step, setStep] = useState<number | null>(null);
  const userId = session?.user.id;
  const createdAt = session?.user.created_at;
  const anonymous = session?.user.is_anonymous;

  useEffect(() => {
    if (preview) { setStep(0); return; }
    let stored: string | null = null;
    try { if (userId) stored = localStorage.getItem(onboardingStorageKey(userId)); } catch {}
    setStep(initialOnboardingStep(userId && createdAt ? { id: userId, created_at: createdAt, is_anonymous: anonymous } : null, stored));
  }, [userId, createdAt, anonymous, preview]);

  useEffect(() => {
    if (step !== null && location.pathname !== '/categories') navigate(`/categories${preview ? '?onboarding=preview' : ''}`, { replace: true });
  }, [step, location.pathname, navigate, preview]);

  const save = (value: string) => {
    try { if (userId && !preview) localStorage.setItem(onboardingStorageKey(userId), value); } catch {}
  };
  const finish = (status: 'done' | 'dismissed') => {
    save(status);
    setStep(null);
    requestAnimationFrame(() => document.querySelector<HTMLElement>('[data-onboarding="account"]')?.focus());
  };
  const goTo = (next: number) => { save(`step:${next}`); setStep(next); };
  const active = step !== null && !loading && location.pathname === '/categories';
  return <OnboardingContext.Provider value={{ active, step }}>
    {children}
    {active && step !== null && <Suspense fallback={null}><OnboardingPopover key={step} step={step} onNext={() => step === 3 ? finish('done') : goTo(step + 1)} onDismiss={() => finish('dismissed')} /></Suspense>}
  </OnboardingContext.Provider>;
}
