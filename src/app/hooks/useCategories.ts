import { useState, useEffect, useCallback } from 'react';
import { projectId, publicAnonKey } from '/utils/supabase/info';
import { supabase } from '../lib/supabase';

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
const DEFAULT_SEED_VERSION = 2;

const DEFAULT_CATEGORY_SEEDS: DefaultCategorySeed[] = [
  {
    id: 'ai-tools',
    title: 'AI Tools',
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

const getCurrentUserId = async () => {
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

const isLegacyDefaultSeed = (categories: NavCategoryRow[], links: NavLinkRow[]) => {
  if (categories.length !== LEGACY_SEED_CATEGORY_IDS.length || links.length !== LEGACY_SEED_LINK_IDS.length) {
    return false;
  }

  const categoryIds = new Set(categories.map((category) => category.id));
  const linkIds = new Set(links.map((link) => link.id));

  return LEGACY_SEED_CATEGORY_IDS.every((id) => categoryIds.has(id))
    && LEGACY_SEED_LINK_IDS.every((id) => linkIds.has(id));
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

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const userId = await getCurrentUserId();
      if (!userId) {
        setCategories([]);
        return;
      }

      const { data: categoryRows, error: categoryError } = await supabase
        .from('nav_categories')
        .select('id, title, description, order_index')
        .order('order_index', { ascending: true })
        .order('title', { ascending: true });

      if (categoryError) throw categoryError;

      const { data: linkRows, error: linkError } = await supabase
        .from('nav_links')
        .select('id, category_id, name, url, description, icon, favicon_url, order_index')
        .order('order_index', { ascending: true })
        .order('name', { ascending: true });

      if (linkError) throw linkError;

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
      } else {
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

        void markDefaultsSeeded(userId);
      }

      const nextCategories = (categoryRows ?? []).map((category) =>
        toCategory(category as NavCategoryRow, (linkRows ?? []) as NavLinkRow[])
      );

      setCategories(nextCategories);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  const addItem = async (categoryId: string, item: Omit<LinkItem, 'id'>) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('Please sign in before adding a site.');

      const category = categories.find((cat) => cat.id === categoryId);
      const nextOrder = category?.items.length ?? 999;

      const { error: insertError } = await supabase.from('nav_links').insert({
        owner_id: userId,
        id: createId(),
        category_id: categoryId,
        name: item.name,
        url: item.url,
        description: item.description,
        icon: item.icon,
        favicon_url: item.faviconUrl || null,
        order_index: nextOrder,
      });

      if (insertError) throw insertError;
      await fetchCategories();
    } catch (err) {
      console.error('Error adding item:', err);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const updateItem = async (categoryId: string, itemId: string, updatedItem: Partial<LinkItem> & { categoryId?: string }) => {
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
      await fetchCategories();
    } catch (err) {
      console.error('Error updating item:', err);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const deleteItem = async (categoryId: string, itemId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('nav_links')
        .delete()
        .eq('category_id', categoryId)
        .eq('id', itemId);

      if (deleteError) throw deleteError;
      await fetchCategories();
    } catch (err) {
      console.error('Error deleting item:', err);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const deleteCategory = async (categoryId: string) => {
    try {
      const { error: deleteError } = await supabase
        .from('nav_categories')
        .delete()
        .eq('id', categoryId);

      if (deleteError) throw deleteError;
      await fetchCategories();
    } catch (err) {
      console.error('Error deleting category:', err);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const createCategory = async (category: Partial<Category> & { id: string; title: string; description: string }) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('Please sign in before saving a category.');

      const categoryData = {
        owner_id: userId,
        id: category.id,
        title: category.title,
        description: category.description,
        order_index: category.order ?? 999,
        updated_at: new Date().toISOString(),
      };

      const { data, error: upsertError } = await supabase
        .from('nav_categories')
        .upsert(categoryData, { onConflict: 'owner_id,id' })
        .select('id, title, description, order_index')
        .single();

      if (upsertError) throw upsertError;
      await fetchCategories();

      return toCategory(data as NavCategoryRow, []);
    } catch (err) {
      console.error('Error saving category:', err);
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  };

  const createShare = async (category: Category, linkIds: string[]) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('Please sign in before sharing links.');

      const links = category.items.filter((item) => linkIds.includes(item.id));
      if (links.length === 0) throw new Error('Select at least one site to share.');

      const expiresAt = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
      const payload = links.map((item) => ({
        id: item.id,
        name: item.name,
        url: item.url,
        description: item.description,
        icon: item.icon,
        faviconUrl: item.faviconUrl ?? '',
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
          return { code: data.code as string, expiresAt: data.expires_at as string };
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

      const { data, error: shareError } = await supabase.rpc('get_nav_share', { share_code: normalizedCode });
      if (shareError) throw shareError;

      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return null;

      return {
        code: row.code,
        categoryTitle: row.category_title,
        categoryDescription: row.category_description ?? '',
        links: (row.links ?? []) as LinkItem[],
        expiresAt: row.expires_at,
      };
    } catch (err) {
      console.error('Error loading share code:', err);
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  };

  const importSharedLinks = async (categoryId: string, links: LinkItem[]) => {
    try {
      const userId = await getCurrentUserId();
      if (!userId) throw new Error('Please sign in before importing links.');
      if (!categoryId || links.length === 0) return false;

      const targetCategory = categories.find((category) => category.id === categoryId);
      const startOrder = targetCategory?.items.length ?? 0;
      const rows = links.map((item, index) => ({
        owner_id: userId,
        id: createId(),
        category_id: categoryId,
        name: item.name,
        url: item.url,
        description: item.description,
        icon: item.icon || 'link',
        favicon_url: item.faviconUrl || null,
        order_index: startOrder + index,
      }));

      const { error: insertError } = await supabase.from('nav_links').insert(rows);
      if (insertError) throw insertError;

      await fetchCategories();
      return true;
    } catch (err) {
      console.error('Error importing shared links:', err);
      setError(err instanceof Error ? err.message : String(err));
      return false;
    }
  };

  const migrateFavicons = async () => {
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

      await fetchCategories();
    } catch (err) {
      console.error('Error migrating favicons:', err);
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

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
    importSharedLinks,
    refreshCategories: fetchCategories,
    migrateFavicons,
  };
}
