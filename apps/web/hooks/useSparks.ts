'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Reward, SparkTransaction } from '@real/types';
import { useApi } from './useApi';
import { useRealStore } from '@/lib/store';

interface Balances {
  members: Array<{ id: string; display_name: string | null; spark_balance: number }>;
  combined: number;
}

export function useSparkBalances() {
  const api = useApi();
  return useQuery({ queryKey: ['sparks'], queryFn: () => api.get<Balances>('/sparks') });
}

export function useLedger(limit = 50) {
  const api = useApi();
  return useQuery({
    queryKey: ['sparks', 'ledger', limit],
    queryFn: () => api.get<SparkTransaction[]>(`/sparks/ledger?limit=${limit}`),
  });
}

export function useStore() {
  const api = useApi();
  return useQuery({ queryKey: ['sparks', 'store'], queryFn: () => api.get<Reward[]>('/sparks/store') });
}

export function useRedeem() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (rewardId: string) =>
      api.post<{ balance_after: number; reward: Reward }>('/sparks/redeem', { reward_id: rewardId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sparks'] });
      void queryClient.invalidateQueries({ queryKey: ['universe'] });
    },
  });
}

/** Invalidate everything Spark-related and fire the celebration animation. */
export function useSparkCelebration() {
  const popSparks = useRealStore((s) => s.popSparks);
  const queryClient = useQueryClient();

  return (amount: number) => {
    if (amount > 0) popSparks(amount);
    void queryClient.invalidateQueries({ queryKey: ['sparks'] });
    void queryClient.invalidateQueries({ queryKey: ['universe'] });
  };
}
