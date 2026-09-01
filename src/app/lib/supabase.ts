import { createClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

const supabaseUrl = `https://${projectId}.supabase.co`;

export const supabase = createClient(supabaseUrl, publicAnonKey);

const previewStorage = {
  getItem: (key: string) => sessionStorage.getItem(key),
  setItem: (key: string, value: string) => sessionStorage.setItem(key, value),
  removeItem: (key: string) => sessionStorage.removeItem(key),
};

let previewClient: ReturnType<typeof createClient> | null = null;

export const getPreviewSupabase = () => {
  if (!previewClient) {
    previewClient = createClient(supabaseUrl, publicAnonKey, {
      auth: {
        storage: previewStorage,
        storageKey: 'dash-preview-auth',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return previewClient;
};

