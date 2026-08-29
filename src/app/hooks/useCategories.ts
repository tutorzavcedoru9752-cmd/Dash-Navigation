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

const API_BASE = `https://${projectId}.supabase.co/functions/v1/make-server-e5a5bd76`;

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

  const updateItem = async (categoryId: string, itemId: string, updatedItem: Partial<LinkItem>) => {
    try {
      const patch: Record<string, string | null> = {
        updated_at: new Date().toISOString(),
      };

      if (updatedItem.name !== undefined) patch.name = updatedItem.name;
      if (updatedItem.url !== undefined) patch.url = updatedItem.url;
      if (updatedItem.description !== undefined) patch.description = updatedItem.description;
      if (updatedItem.icon !== undefined) patch.icon = updatedItem.icon;
      if (updatedItem.faviconUrl !== undefined) patch.favicon_url = updatedItem.faviconUrl || null;

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
    refreshCategories: fetchCategories,
    migrateFavicons,
  };
}

