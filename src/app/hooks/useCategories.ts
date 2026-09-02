import { createContext, createElement, useState, useEffect, useCallback, useContext, useRef, type ReactNode } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { getPreviewSupabase, supabase } from '../lib/supabase';
import { getTurnstileToken } from '../lib/turnstile';
import { PREVIEW_CATEGORIES, PreviewContext } from '../preview';
import { deleteNavigationCache, NAVIGATION_CACHE_TTL_MS, readNavigationCache, writeNavigationCache } from '../lib/navigationCache';

export interface LinkItem {
  id: string;
  name: string;
  url: string;
  description: string;
  icon: string;
  faviconUrl?: string;
}

export interface Category {
  id: string;
  title: string;
  description: string;
  items: LinkItem[];
  order?: number;
}

export interface NavShare {
  code: string;
  categoryTitle: string;
  categoryDescription: string;
  links: LinkItem[];
  expiresAt: string;
  sharerName: string;
  sharerAvatarUrl?: string;
}

type NavCategoryRow = {
  id: string;
  title: string;
  description: string | null;
  order_index: number | null;
};

type NavLinkRow = {
  id: string;
  category_id: string;
  name: string;
  url: string;
  description: string | null;
  icon: string | null;
  favicon_url: string | null;
  order_index: number | null;
};

type DefaultCategorySeed = {
  id: string;
  title: string;
  description: string;
  items: Array<Omit<LinkItem, 'id' | 'faviconUrl'> & { id: string }>;
};

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-e5a5bd76`;
const DEFAULT_SEED_VERSION = 3;

const DEFAULT_CATEGORY_SEEDS: DefaultCategorySeed[] = [
  {
    id: 'ai-tools',
    title: 'AI工具',
    description: '常用 AI 助手与内容创作工具。',
    items: [
      { id: 'chat-gpt', name: 'Chat GPT', url: 'https://chatgpt.com', description: 'AI assistant for writing, coding and ideation.', icon: 'robot_2' },
      { id: 'doubao', name: '豆包', url: 'https://www.doubao.com', description: '字节跳动推出的 AI 助手。', icon: 'psychology' },
      { id: 'deepseek', name: 'Deepseek', url: 'https://chat.deepseek.com', description: '深度求索 AI 助手。', icon: 'psychology' },
    ],
  },
  {
    id: 'entertainment',
    title: '娱乐',
    description: '内容社区、问答与视频平台。',
    items: [
      { id: 'xiaohongshu', name: '小红书', url: 'https://www.xiaohongshu.com', description: '生活方式与内容社区。', icon: 'style' },
      { id: 'zhihu', name: '知乎', url: 'https://www.zhihu.com', description: '中文问答与知识社区。', icon: 'quiz' },
      { id: 'bilibili', name: '哔哩哔哩', url: 'https://www.bilibili.com', description: '视频、番剧与创作社区。', icon: 'movie' },
    ],
  },
  {
    id: 'email',
    title: '邮箱',
    description: '常用邮箱入口。',
    items: [
      { id: 'qq-mail', name: 'QQ邮箱', url: 'https://mail.qq.com', description: '腾讯 QQ 邮箱。', icon: 'mail' },
      { id: '163-mail', name: '163邮箱', url: 'https://mail.163.com', description: '网易 163 邮箱。', icon: 'mail' },
      { id: 'gmail', name: 'Gmail', url: 'https://mail.google.com', description: 'Google 邮箱服务。', icon: 'mail' },
    ],
  },
];

const LEGACY_SEED_CATEGORY_IDS = ['ai-tools', 'design', 'productivity'];
const LEGACY_SEED_LINK_IDS = ['chatgpt', 'perplexity', 'claude', 'figma', 'dribbble', 'unsplash', 'notion', 'github', 'google-drive'];
const DEFAULT_SEED_CATEGORY_IDS = ['ai-tools', 'entertainment', 'email'];
const DEFAULT_SEED_LINK_IDS = ['chat-gpt', 'doubao', 'deepseek', 'xiaohongshu', 'zhihu', 'bilibili', 'qq-mail', '163-mail', 'gmail'];

const getCurrentUserId = async () => {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (!sessionData.session) return null;

  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user?.id ?? null;
};

const createId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

const faviconUrlFor = (url: string) => `https://www.google.com/s2/favicons?sz=128&domain_url=${encodeURIComponent(url)}`;

const createShareCode = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
};

const normalizeShareCode = (code: string) => code.trim().toUpperCase().replace(/\s+/g, '');
const LOCAL_PREVIEW_SHARES_KEY = 'dash-preview-local-shares';

const readLocalPreviewShares = (): Record<string, NavShare> => {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(LOCAL_PREVIEW_SHARES_KEY) || '{}') as Record<string, NavShare>;
    return Object.fromEntries(Object.entries(parsed).filter(([, share]) => new Date(share.expiresAt).getTime() > Date.now()));
  } catch {
    return {};
  }
};

const writeLocalPreviewShares = (shares: Record<string, NavShare>) => {
  try { sessionStorage.setItem(LOCAL_PREVIEW_SHARES_KEY, JSON.stringify(shares)); } catch {}
};

const createLocalPreviewShare = (category: Category, links: LinkItem[]) => {
  const shares = readLocalPreviewShares();
  let code = createShareCode();
  while (shares[code]) code = createShareCode();
  const share: NavShare = {
    code,
    categoryTitle: category.title,
    categoryDescription: category.description,
    links,
    expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    sharerName: 'Dash 预览访客',
  };
  shares[code] = share;
  writeLocalPreviewShares(shares);
  return { code, expiresAt: share.expiresAt, sharerName: share.sharerName };
};

const quotaErrorMessage = (message: string) => {
  if (message.includes('QUOTA_CATEGORY_LIMIT')) {
    return '免费用户最多可创建 5 个分类，请升级会员后继续创建。';
  }

  if (message.includes('QUOTA_LINK_LIMIT')) {
    return '免费用户最多可保存 30 个网站，请升级会员后继续添加。';
  }

  return message;
};

const isLegacyDefaultSeed = (categories: NavCategoryRow[], links: NavLinkRow[]) => {
  if (categories.length !== LEGACY_SEED_CATEGORY_IDS.length || links.length !== LEGACY_SEED_LINK_IDS.length) {
    return false;
  }

  const categoryIds = new Set(categories.map((category) => category.id));
  const linkIds = new Set(links.map((link) => link.id));

  return LEGACY_SEED_CATEGORY_IDS.every((id) => categoryIds.has(id))
    && LEGACY_SEED_LINK_IDS.every((id) => linkIds.has(id));
};

const isCurrentDefaultSeed = (categories: NavCategoryRow[], links: NavLinkRow[]) => {
  if (categories.length !== DEFAULT_SEED_CATEGORY_IDS.length || links.length !== DEFAULT_SEED_LINK_IDS.length) {
    return false;
  }

  const categoryIds = new Set(categories.map((category) => category.id));
  const linkIds = new Set(links.map((link) => link.id));

  return DEFAULT_SEED_CATEGORY_IDS.every((id) => categoryIds.has(id))
    && DEFAULT_SEED_LINK_IDS.every((id) => linkIds.has(id));
};

const seedDefaultCategories = async (userId: string) => {
  const now = new Date().toISOString();
  const categoryRows = DEFAULT_CATEGORY_SEEDS.map((category, index) => ({
    owner_id: userId,
    id: category.id,
    title: category.title,
    description: category.description,
    order_index: index,
    updated_at: now,
  }));

  const linkRows = DEFAULT_CATEGORY_SEEDS.flatMap((category) =>
    category.items.map((item, index) => ({
      owner_id: userId,
      id: item.id,
      category_id: category.id,
      name: item.name,
      url: item.url,
      description: item.description,
      icon: item.icon,
      favicon_url: faviconUrlFor(item.url),
      order_index: index,
      updated_at: now,
    }))
  );

  const { error: categoryError } = await supabase.from('nav_categories').upsert(categoryRows, { onConflict: 'owner_id,id' });
  if (categoryError) throw categoryError;

  const { error: linkError } = await supabase.from('nav_links').upsert(linkRows, { onConflict: 'owner_id,id' });
  if (linkError) throw linkError;

  const { error: profileError } = await supabase
    .from('profiles')
    .update({ defaults_seeded: true, default_seed_version: DEFAULT_SEED_VERSION, updated_at: now })
    .eq('id', userId);

  if (profileError) throw profileError;
};

const markDefaultsSeeded = async (userId: string) => {
  const { error } = await supabase
    .from('profiles')
    .update({ defaults_seeded: true, default_seed_version: DEFAULT_SEED_VERSION, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) {
    console.error('Error marking default categories as seeded:', error);
  }
};

const toCategory = (category: NavCategoryRow, links: NavLinkRow[]): Category => ({
  id: category.id,
  title: category.title,
  description: category.description ?? '',
  order: category.order_index ?? 999,
  items: links
    .filter((link) => link.category_id === category.id)
    .sort((a, b) => (a.order_index ?? 999) - (b.order_index ?? 999))
    .map((link) => ({
      id: link.id,
      name: link.name,
      url: link.url,
      description: link.description ?? '',
      icon: link.icon ?? 'link',
      faviconUrl: link.favicon_url ?? undefined,
    })),
});

export const fetchFaviconData = async (url: string): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE}/fetch-favicon`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${publicAnonKey}`,
      },
      body: JSON.stringify({ url }),
    });

    const result = await response.json();
    if (result.success && result.faviconData) {
      return result.faviconData;
    }
    return '';
  } catch (error) {
    console.error('Error fetching favicon data:', error);
    return '';
  }
};

function useCategoriesState() {
  const { isPreview, requestLogin } = useContext(PreviewContext);
  const [categories, setCategories] = useState<Category[]>(isPreview ? PREVIEW_CATEGORIES : []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const categoriesRef = useRef(categories);
  const currentUserIdRef = useRef<string | null>(null);
  const lastSyncAtRef = useRef(0);

  useEffect(() => {
    categoriesRef.current = categories;
  }, [categories]);

  const replaceCategories = useCallback((nextCategories: Category[], persist = true) => {
    categoriesRef.current = nextCategories;
    setCategories(nextCategories);
    const userId = currentUserIdRef.current;
    if (persist && userId) {
      const updatedAt = Date.now();
      lastSyncAtRef.current = updatedAt;
      void writeNavigationCache({ userId, categories: nextCategories, updatedAt });
    }
  }, []);

  const fetchCategories = useCallback(async (options: { force?: boolean; showLoading?: boolean } = {}) => {
    if (isPreview) {
      const previousUserId = currentUserIdRef.current;
      if (previousUserId) void deleteNavigationCache(previousUserId);
      currentUserIdRef.current = null;
      replaceCategories(PREVIEW_CATEGORIES, false);
      setLoading(false);
      setError(null);
      return;
    }
    try {
      setError(null);

      const userId = await getCurrentUserId();
      if (!userId) {
        replaceCategories([], false);
        setLoading(false);
        return;
      }

      currentUserIdRef.current = userId;
      const cached = await readNavigationCache(userId);
      const hasMemoryData = categoriesRef.current.length > 0;
      if (!hasMemoryData && cached?.categories.length) {
        categoriesRef.current = cached.categories;
        setCategories(cached.categories);
        lastSyncAtRef.current = cached.updatedAt;
        setLoading(false);
      } else if (options.showLoading !== false && !hasMemoryData) {
        setLoading(true);
      }

      if (!options.force && cached && Date.now() - cached.updatedAt < NAVIGATION_CACHE_TTL_MS) {
        setLoading(false);
        return;
      }

      const [categoriesResult, linksResult] = await Promise.all([
        supabase
          .from('nav_categories')
          .select('id, title, description, order_index')
          .order('order_index', { ascending: true })
          .order('title', { ascending: true }),
        supabase
          .from('nav_links')
          .select('id, category_id, name, url, description, icon, favicon_url, order_index')
          .order('order_index', { ascending: true })
          .order('name', { ascending: true }),
      ]);

      if (categoriesResult.error) throw categoriesResult.error;
      if (linksResult.error) throw linksResult.error;

      const categoryRows = categoriesResult.data;
      const linkRows = linksResult.data;

      if ((categoryRows ?? []).length === 0) {
        const { data: profileRow, error: profileError } = await supabase
          .from('profiles')
          .select('defaults_seeded, default_seed_version')
          .eq('id', userId)
          .maybeSingle();

        if (profileError) throw profileError;

        if (!profileRow?.defaults_seeded || (profileRow.default_seed_version ?? 0) < DEFAULT_SEED_VERSION) {
          await seedDefaultCategories(userId);
          await fetchCategories();
          return;
        }

        replaceCategories([]);
      } else {
        const nextCategories = (categoryRows ?? []).map((category) =>
          toCategory(category as NavCategoryRow, (linkRows ?? []) as NavLinkRow[])
        );

        replaceCategories(nextCategories);

        void (async () => {
          const { data: profileRow, error: profileError } = await supabase
            .from('profiles')
            .select('default_seed_version')
            .eq('id', userId)
            .maybeSingle();

          if (profileError) throw profileError;

          if ((profileRow?.default_seed_version ?? 0) < DEFAULT_SEED_VERSION && isLegacyDefaultSeed(categoryRows as NavCategoryRow[], linkRows as NavLinkRow[])) {
            const { error: deleteError } = await supabase
              .from('nav_categories')
              .delete()
              .in('id', LEGACY_SEED_CATEGORY_IDS);

            if (deleteError) throw deleteError;
            await seedDefaultCategories(userId);
            await fetchCategories();
            return;
          }

          if ((profileRow?.default_seed_version ?? 0) < DEFAULT_SEED_VERSION && isCurrentDefaultSeed(categoryRows as NavCategoryRow[], linkRows as NavLinkRow[])) {
            await seedDefaultCategories(userId);
            await fetchCategories();
            return;
          }

          if ((profileRow?.default_seed_version ?? 0) < DEFAULT_SEED_VERSION) {
            await markDefaultsSeeded(userId);
          }
        })().catch((backgroundError) => {
          console.error('Error checking default navigation seed:', backgroundError);
        });
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [isPreview, replaceCategories]);

  const blockPreviewWrite = () => {
    if (!isPreview) return false;
    requestLogin('save');
    return true;
  };

  const addItem = async (categoryId: string, item: Omit<LinkItem, 'id'>) => {
    if (blockPreviewWrite()) return false;
    const previousCategories = categoriesRef.current;
    const linkId = createId();
    replaceCategories(previousCategories.map((category) => category.id === categoryId
      ? { ...category, items: [...category.items, { ...item, id: linkId }] }
      : category));
    try {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('Please sign in before adding a site.');

      const category = previousCategories.find((cat) => cat.id === categoryId);
      const nextOrder = category?.items.length ?? 999;

      const { error: insertError } = await supabase.rpc('create_nav_link', {
        p_link_id: linkId,
        p_category_id: categoryId,
        p_link_name: item.name,
        p_link_url: item.url,
        p_link_description: item.description,
        p_link_icon: item.icon,
        p_link_favicon_url: item.faviconUrl || '',
        p_link_order: nextOrder,
      });

      if (insertError) throw insertError;
      return true;
    } catch (err) {
      replaceCategories(previousCategories);
      console.error('Error adding item:', err);
      setError(quotaErrorMessage(err instanceof Error ? err.message : String(err)));
      return false;
    }
  };

  const updateItem = async (categoryId: string, itemId: string, updatedItem: Partial<LinkItem> & { categoryId?: string }) => {
    if (blockPreviewWrite()) return;
    const previousCategories = categoriesRef.current;
    const sourceItem = previousCategories.find((category) => category.id === categoryId)?.items.find((item) => item.id === itemId);
    if (!sourceItem) return;
    const targetCategoryId = updatedItem.categoryId ?? categoryId;
    const { categoryId: _targetCategoryId, ...itemPatch } = updatedItem;
    const nextItem = { ...sourceItem, ...itemPatch };
    replaceCategories(previousCategories.map((category) => {
      const withoutSource = category.id === categoryId
        ? category.items.filter((item) => item.id !== itemId)
        : category.items;
      return category.id === targetCategoryId
        ? { ...category, items: [...withoutSource, nextItem] }
        : { ...category, items: withoutSource };
    }));
    try {
      const patch: Record<string, string | null> = {
        updated_at: new Date().toISOString(),
      };

      if (updatedItem.name !== undefined) patch.name = updatedItem.name;
      if (updatedItem.url !== undefined) patch.url = updatedItem.url;
      if (updatedItem.description !== undefined) patch.description = updatedItem.description;
      if (updatedItem.icon !== undefined) patch.icon = updatedItem.icon;
      if (updatedItem.faviconUrl !== undefined) patch.favicon_url = updatedItem.faviconUrl || null;
      if (updatedItem.categoryId !== undefined) patch.category_id = updatedItem.categoryId;

      const { error: updateError } = await supabase
        .from('nav_links')
        .update(patch)
        .eq('category_id', categoryId)
        .eq('id', itemId);

      if (updateError) throw updateError;
    } catch (err) {
      replaceCategories(previousCategories);
      console.error('Error updating item:', err);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const deleteItem = async (categoryId: string, itemId: string) => {
    if (blockPreviewWrite()) return;
    const previousCategories = categoriesRef.current;
    replaceCategories(previousCategories.map((category) => category.id === categoryId
      ? { ...category, items: category.items.filter((item) => item.id !== itemId) }
      : category));
    try {
      const { error: deleteError } = await supabase
        .from('nav_links')
        .delete()
        .eq('category_id', categoryId)
        .eq('id', itemId);

      if (deleteError) throw deleteError;
    } catch (err) {
      replaceCategories(previousCategories);
      console.error('Error deleting item:', err);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const deleteCategory = async (categoryId: string) => {
    if (blockPreviewWrite()) return;
    const previousCategories = categoriesRef.current;
    replaceCategories(previousCategories.filter((category) => category.id !== categoryId));
    try {
      const { error: deleteError } = await supabase
        .from('nav_categories')
        .delete()
        .eq('id', categoryId);

      if (deleteError) throw deleteError;
    } catch (err) {
      replaceCategories(previousCategories);
      console.error('Error deleting category:', err);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const createCategory = async (category: Partial<Category> & { id: string; title: string; description: string }) => {
    if (blockPreviewWrite()) return null;
    try {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('Please sign in before saving a category.');

      // The category RPC only returns the category row. Preserve the websites
      // already held by the client instead of replacing them with an empty list.
      const existingCategory = categoriesRef.current.find((item) => item.id === category.id);
      const existingItems = category.items ?? existingCategory?.items ?? [];

      const categoryData = {
        owner_id: userId,
        id: category.id,
        title: category.title,
        description: category.description,
        order_index: category.order ?? 999,
        updated_at: new Date().toISOString(),
      };

      const { data, error: upsertError } = await supabase.rpc('upsert_nav_category', {
        p_category_id: categoryData.id,
        p_category_title: categoryData.title,
        p_category_description: categoryData.description,
        p_category_order: categoryData.order_index,
      });

      if (upsertError) throw upsertError;

      const row = Array.isArray(data) ? data[0] : data;
      const nextCategory = row
        ? { ...toCategory(row as NavCategoryRow, []), items: existingItems }
        : { id: categoryData.id, title: categoryData.title, description: categoryData.description, order: categoryData.order_index, items: existingItems };
      replaceCategories([
        ...categoriesRef.current.filter((item) => item.id !== nextCategory.id),
        nextCategory,
      ].sort((a, b) => a.order - b.order));
      return nextCategory;
    } catch (err) {
      console.error('Error saving category:', err);
      setError(quotaErrorMessage(err instanceof Error ? err.message : String(err)));
      return null;
    }
  };

  const createShare = async (category: Category, linkIds: string[]) => {
    try {
      const links = category.items.filter((item) => linkIds.includes(item.id));
      if (links.length === 0) throw new Error('Select at least one site to share.');

      if (isPreview) {
        if (import.meta.env.DEV) {
          return createLocalPreviewShare(category, links);
        }

        try {
          const previewSupabase = getPreviewSupabase();
          const { data: existing } = await previewSupabase.auth.getSession();
          if (!existing.session) {
            const captchaToken = await getTurnstileToken('preview_share');
            const { error: signInError } = await previewSupabase.auth.signInAnonymously({
              options: captchaToken ? { captchaToken } : undefined,
            });
            if (signInError) throw signInError;
          }

          const { data, error: previewError } = await previewSupabase.rpc('create_preview_share', {
            p_category_title: category.title,
            p_category_description: category.description,
            p_links: links.map((link) => ({
              id: link.id,
              name: link.name,
              url: link.url,
              description: link.description,
              icon: link.icon,
              faviconUrl: link.faviconUrl ?? '',
            })),
          });
          if (previewError) throw previewError;
          const row = Array.isArray(data) ? data[0] : data;
          return { code: row.code as string, expiresAt: row.expires_at as string, sharerName: 'Dash 预览访客' };
        } catch (previewError) {
          throw previewError;
        }
      }

      const userId = await getCurrentUserId();
      if (!userId) throw new Error('Please sign in before sharing links.');

      const { data: profileRow } = await supabase
        .from('profiles')
        .select('display_name, avatar_url')
        .eq('id', userId)
        .maybeSingle();
      const sharerName = (profileRow?.display_name as string | undefined)?.trim() || 'Dash user';
      const sharerAvatarUrl = (profileRow?.avatar_url as string | null | undefined) || '';
      const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      const payload = links.map((item) => ({
        id: item.id,
        name: item.name,
        url: item.url,
        description: item.description,
        icon: item.icon,
        faviconUrl: item.faviconUrl ?? '',
        shareAuthorName: sharerName,
        shareAuthorAvatarUrl: sharerAvatarUrl || null,
      }));

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const code = createShareCode();
        const { data, error: insertError } = await supabase
          .from('nav_shares')
          .insert({
            owner_id: userId,
            code,
            category_title: category.title,
            category_description: category.description,
            links: payload,
            expires_at: expiresAt,
          })
          .select('code, expires_at')
          .single();

        if (!insertError && data) {
          return {
            code: data.code as string,
            expiresAt: data.expires_at as string,
            sharerName,
            sharerAvatarUrl: sharerAvatarUrl || undefined,
          };
        }

        if (insertError?.code !== '23505') {
          throw insertError;
        }
      }

      throw new Error('Could not create a unique share code.');
    } catch (err) {
      console.error('Error creating share code:', err);
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  };

  const getShare = async (code: string): Promise<NavShare | null> => {
    try {
      const normalizedCode = normalizeShareCode(code);
      if (!normalizedCode) throw new Error('Enter a share code.');

      if (isPreview && import.meta.env.DEV) {
        const localShare = readLocalPreviewShares()[normalizedCode];
        if (localShare) return localShare;
      }

      if (isPreview) {
        const previewSupabase = getPreviewSupabase();
        const { data: existing } = await previewSupabase.auth.getSession();
        if (!existing.session) {
          const captchaToken = await getTurnstileToken('preview_share_read');
          const { error: signInError } = await previewSupabase.auth.signInAnonymously({
            options: captchaToken ? { captchaToken } : undefined,
          });
          if (signInError) throw signInError;
        }
      }
      const shareClient = isPreview ? getPreviewSupabase() : supabase;
      const { data, error: shareError } = await shareClient.rpc('get_nav_share', { share_code: normalizedCode });
      if (shareError) throw shareError;

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return null;
      const links = (row.links ?? []) as Array<LinkItem & { shareAuthorName?: string; shareAuthorAvatarUrl?: string | null }>;
      const firstSharedLink = links[0];

      return {
        code: row.code,
        categoryTitle: row.category_title,
        categoryDescription: row.category_description ?? '',
        links,
        expiresAt: row.expires_at,
        sharerName: row.sharer_name || firstSharedLink?.shareAuthorName || 'Dash user',
        sharerAvatarUrl: row.sharer_avatar_url || firstSharedLink?.shareAuthorAvatarUrl || undefined,
      };
    } catch (err) {
      console.error('Error loading share code:', err);
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  };

  const deleteShare = async (code: string) => {
    try {
      if (isPreview) {
        const normalizedCode = normalizeShareCode(code);
        if (!normalizedCode) return false;
        if (import.meta.env.DEV) {
          const shares = readLocalPreviewShares();
          if (shares[normalizedCode]) {
            delete shares[normalizedCode];
            writeLocalPreviewShares(shares);
            return true;
          }
        }
        const previewSupabase = getPreviewSupabase();
        const { error: deleteError } = await previewSupabase.from('nav_shares').delete().eq('code', normalizedCode);
        if (deleteError) throw deleteError;
        return true;
      }
      const userId = await getCurrentUserId();
      const normalizedCode = normalizeShareCode(code);
      if (!userId || !normalizedCode) return false;

      const { error: deleteError } = await supabase
        .from('nav_shares')
        .delete()
        .eq('owner_id', userId)
        .eq('code', normalizedCode);

      if (deleteError) throw deleteError;
      return true;
    } catch (err) {
      console.error('Error deleting share code:', err);
      setError(err instanceof Error ? err.message : String(err));
      return false;
    }
  };

  const importSharedLinks = async (categoryId: string, links: LinkItem[]) => {
    if (blockPreviewWrite()) return false;
    try {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('Please sign in before importing links.');
      if (!categoryId || links.length === 0) return false;

      const targetCategory = categories.find((category) => category.id === categoryId);
      const startOrder = targetCategory?.items.length ?? 0;
      const rows = links.map((item, index) => ({
        id: createId(),
        category_id: categoryId,
        name: item.name,
        url: item.url,
        description: item.description,
        icon: item.icon || 'link',
        favicon_url: item.faviconUrl || null,
        order_index: startOrder + index,
      }));

      const { error: insertError } = await supabase.rpc('create_nav_links_batch', { p_links: rows });
      if (insertError) throw insertError;

      replaceCategories(categoriesRef.current.map((category) => category.id === categoryId
        ? {
            ...category,
            items: [...category.items, ...rows.map((row) => ({
              id: row.id,
              name: row.name,
              url: row.url,
              description: row.description,
              icon: row.icon,
              faviconUrl: row.favicon_url ?? undefined,
            }))],
          }
        : category));
      return true;
    } catch (err) {
      console.error('Error importing shared links:', err);
      setError(quotaErrorMessage(err instanceof Error ? err.message : String(err)));
      return false;
    }
  };

  const migrateFavicons = async () => {
    if (blockPreviewWrite()) return;
    try {
      for (const category of categories) {
        for (const item of category.items) {
          const isExternalUrl = item.faviconUrl && !item.faviconUrl.startsWith('data:');
          if (isExternalUrl) {
            const fetched = await fetchFaviconData(item.url);
            if (fetched) {
              await updateItem(category.id, item.id, { faviconUrl: fetched });
            }
          }
        }
      }

    } catch (err) {
      console.error('Error migrating favicons:', err);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (isPreview) return;
    const refreshWhenStale = () => {
      if (document.visibilityState !== 'visible') return;
      if (Date.now() - lastSyncAtRef.current < NAVIGATION_CACHE_TTL_MS) return;
      void fetchCategories({ force: true, showLoading: false });
    };
    document.addEventListener('visibilitychange', refreshWhenStale);
    window.addEventListener('online', refreshWhenStale);
    return () => {
      document.removeEventListener('visibilitychange', refreshWhenStale);
      window.removeEventListener('online', refreshWhenStale);
    };
  }, [fetchCategories, isPreview]);

  return {
    categories,
    loading,
    error,
    addItem,
    updateItem,
    deleteItem,
    deleteCategory,
    createCategory,
    createShare,
    getShare,
    deleteShare,
    importSharedLinks,
    refreshCategories: () => fetchCategories({ force: true, showLoading: false }),
    migrateFavicons,
  };
}

type NavigationDataContextValue = ReturnType<typeof useCategoriesState>;

const NavigationDataContext = createContext<NavigationDataContextValue | null>(null);

export function NavigationDataProvider({ children }: { children: ReactNode }) {
  const value = useCategoriesState();
  return createElement(NavigationDataContext.Provider, { value }, children);
}

export function useCategories() {
  const value = useContext(NavigationDataContext);
  if (!value) throw new Error('useCategories must be used inside NavigationDataProvider.');
  return value;
}
