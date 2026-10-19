export const onboardingStorageKey = (userId: string) => `dash-onboarding-v1:${userId}`;

type GuideUser = { id: string; created_at: string; is_anonymous?: boolean };

export function initialOnboardingStep(user: GuideUser | null, stored: string | null, now = Date.now()): number | null {
  if (!user || user.is_anonymous || stored === 'done' || stored === 'dismissed') return null;
  if (stored === 'pending') return 0;
  if (stored?.startsWith('step:')) {
    const step = Number(stored.slice(5));
    if (Number.isInteger(step) && step >= 0 && step < 4) return step;
  }
  const age = now - Date.parse(user.created_at);
  return age >= 0 && age <= 24 * 60 * 60 * 1000 ? 0 : null;
}

export function markOnboardingPending(userId: string) {
  try {
    const key = onboardingStorageKey(userId);
    if (!localStorage.getItem(key)) localStorage.setItem(key, 'pending');
  } catch { /* The guide still works when storage is unavailable. */ }
}
