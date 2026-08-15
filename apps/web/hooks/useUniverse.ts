'use client';

import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import type { UniverseSnapshot } from '@real/types';
import { useApi } from './useApi';
import { useRealStore } from '@/lib/store';

/** The dashboard payload — one request, everything the Universe screen needs. */
export function useUniverse() {
  const api = useApi();
  const setSnapshot = useRealStore((s) => s.setSnapshot);

  const query = useQuery({
    queryKey: ['universe'],
    queryFn: () => api.get<UniverseSnapshot>('/couple/universe'),
  });

  useEffect(() => {
    if (query.data) setSnapshot(query.data);
  }, [query.data, setSnapshot]);

  return query;
}
