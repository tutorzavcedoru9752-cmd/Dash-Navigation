const UI_DRAFT_PREFIX = 'dash-ui-draft:v1:';
const UI_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

export const UI_DRAFT_SCOPES = {
  categoryEditor: 'category-editor',
  wallpaperDialog: 'wallpaper-dialog',
} as const;

type StoredUiDraft = {
  updatedAt: number;
};

const draftKey = (scope: string, userId: string) => `${UI_DRAFT_PREFIX}${scope}:${userId}`;

export const readUiDraft = <T extends StoredUiDraft>(scope: string, userId: string): T | null => {
  try {
    const key = draftKey(scope, userId);
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as T;
    if (!Number.isFinite(parsed.updatedAt) || Date.now() - parsed.updatedAt > UI_DRAFT_TTL_MS) {
      sessionStorage.removeItem(key);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

export const writeUiDraft = <T extends Omit<StoredUiDraft, 'updatedAt'>>(
  scope: string,
  userId: string,
  draft: T,
) => {
  try {
    sessionStorage.setItem(draftKey(scope, userId), JSON.stringify({ ...draft, updatedAt: Date.now() }));
  } catch {}
};

export const removeUiDraft = (scope: string, userId: string) => {
  try { sessionStorage.removeItem(draftKey(scope, userId)); } catch {}
};
