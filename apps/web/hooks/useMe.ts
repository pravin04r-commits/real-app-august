'use client';

import { useQuery } from '@tanstack/react-query';
import type { User } from '@real/types';
import { useApi } from './useApi';

export function useMe() {
  const api = useApi();
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<User>('/me'),
    staleTime: 60_000,
  });
}
