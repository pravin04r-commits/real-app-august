'use client';

import { useMemo } from 'react';
import { createApiClient } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';

/** API client bound to the current browser session. */
export function useApi() {
  return useMemo(() => {
    const supabase = createClient();
    return createApiClient(async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return session?.access_token ?? null;
    });
  }, []);
}
