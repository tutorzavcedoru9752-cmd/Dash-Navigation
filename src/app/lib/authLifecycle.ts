import type { AuthChangeEvent } from '@supabase/supabase-js';

export const shouldUseBlockingAuthLoader = (
  event: AuthChangeEvent,
  previousUserId: string | null,
  nextUserId: string | null,
) => event === 'SIGNED_IN' && previousUserId !== nextUserId;
