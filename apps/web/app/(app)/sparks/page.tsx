'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import type { Redemption, Reward } from '@real/types';
import { formatSparks } from '@real/utils';
import { Alert, Badge, Button, Card, EmptyState, Field, Input, Skeleton } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { useLedger, useRedeem, useSparkBalances, useStore } from '@/hooks/useSparks';
import { useRealStore } from '@/lib/store';
import { cn } from '@/lib/cn';

type Tab = 'store' | 'ledger' | 'claimed';

/** Sparks — the market. Earning is the game; spending is the payoff. */
export default function SparksPage() {
  const [tab, setTab] = useState<Tab>('store');
  const balances = useSparkBalances();
  const me = useRealStore((s) => s.me);

  return (
    <div className="space-y-4 pb-6">
      <header className="pt-2 text-center">
        <p className="label">Your balance</p>
        <p className="mt-2 font-display text-5xl font-extrabold text-gold-gradient">
          {formatSparks(me?.spark_balance ?? 0)}
        </p>
        <p className="mt-1 text-sm text-ash">
          {balances.data ? `${formatSparks(balances.data.combined)} together` : 'Sparks'}
        </p>
      </header>

      <nav className="flex gap-1 rounded-full border border-white/10 bg-slate/40 p-1">
        {(['store', 'ledger', 'claimed'] as const).map((value) => (
          <button
            key={value}
            onClick={() => setTab(value)}
            className={cn(
              'flex-1 rounded-full px-3 py-2 text-xs font-semibold capitalize transition-all',
              tab === value ? 'bg-real-gradient text-white shadow-glow' : 'text-ash hover:text-blush'
            )}
          >
            {value}
          </button>
        ))}
      </nav>

      {tab === 'store' && <StoreTab balance={me?.spark_balance ?? 0} />}
      {tab === 'ledger' && <LedgerTab />}
      {tab === 'claimed' && <ClaimedTab />}
    </div>
  );
}

function StoreTab({ balance }: { balance: number }) {
  const store = useStore();
  const redeem = useRedeem();
  const [creating, setCreating] = useState(false);

  if (store.isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {redeem.error && (
        <Alert tone="error">
          {redeem.error instanceof Error ? redeem.error.message : 'Could not redeem that.'}
        </Alert>
      )}
      {redeem.isSuccess && <Alert tone="success">Claimed. Go collect. 💅</Alert>}

      {(store.data ?? []).map((reward) => {
        const affordable = balance >= reward.spark_cost;
        return (
          <Card key={reward.id} className={cn('flex items-center gap-4', !affordable && 'opacity-60')}>
            <span className="text-3xl">{reward.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="font-display text-base font-bold">{reward.name}</p>
              {reward.description && (
                <p className="mt-0.5 text-xs leading-relaxed text-ash">{reward.description}</p>
              )}
              {!reward.is_preset && <Badge tone="purple">Yours</Badge>}
            </div>
            <Button
              size="sm"
              variant={affordable ? 'gold' : 'ghost'}
              disabled={!affordable}
              loading={redeem.isPending && redeem.variables === reward.id}
              onClick={() => redeem.mutate(reward.id)}
            >
              {reward.spark_cost} ✨
            </Button>
          </Card>
        );
      })}

      {creating ? (
        <CustomRewardForm onDone={() => setCreating(false)} />
      ) : (
        <Button variant="ghost" fullWidth onClick={() => setCreating(true)}>
          + Invent your own reward
        </Button>
      )}
    </div>
  );
}

function CustomRewardForm({ onDone }: { onDone: () => void }) {
  const api = useApi();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('🎁');
  const [cost, setCost] = useState(100);

  const create = useMutation({
    mutationFn: () =>
      api.post<Reward>('/sparks/store', { name, emoji, spark_cost: cost }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['sparks', 'store'] });
      onDone();
    },
  });

  return (
    <Card className="space-y-4">
      <p className="label">New reward</p>
      <Field label="What is it?">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. You do the dishes for a week"
          maxLength={60}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Emoji">
          <Input value={emoji} onChange={(e) => setEmoji(e.target.value.slice(0, 4))} maxLength={4} />
        </Field>
        <Field label="Cost">
          <Input
            type="number"
            min={0}
            max={100000}
            value={cost}
            onChange={(e) => setCost(Number(e.target.value))}
          />
        </Field>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => create.mutate()} loading={create.isPending} disabled={name.length < 2} fullWidth>
          Add it
        </Button>
        <Button variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </Card>
  );
}

function LedgerTab() {
  const ledger = useLedger(50);

  if (ledger.isLoading) return <Skeleton className="h-40" />;
  if (!ledger.data || ledger.data.length === 0) {
    return (
      <EmptyState
        emoji="🧾"
        title="Empty ledger"
        body="Check in, complete a dare, log a milestone. The Sparks start moving."
      />
    );
  }

  return (
    <ul className="space-y-2">
      {ledger.data.map((tx) => (
        <li key={tx.id} className="card flex items-center justify-between p-4">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm">{tx.note ?? tx.source.replace(/_/g, ' ')}</p>
            <p className="text-xs text-ash">{new Date(tx.created_at).toLocaleDateString()}</p>
          </div>
          <span
            className={cn(
              'font-mono text-sm font-bold',
              tx.direction === 'earn' ? 'text-gold' : 'text-hot-pink'
            )}
          >
            {tx.direction === 'earn' ? '+' : '−'}
            {tx.amount}
          </span>
        </li>
      ))}
    </ul>
  );
}

function ClaimedTab() {
  const api = useApi();
  const queryClient = useQueryClient();

  const redemptions = useQuery({
    queryKey: ['sparks', 'redemptions'],
    queryFn: () => api.get<Redemption[]>('/sparks/redemptions'),
  });

  const fulfil = useMutation({
    mutationFn: (id: string) => api.patch<Redemption>(`/sparks/redemptions/${id}`, { fulfilled: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sparks', 'redemptions'] }),
  });

  if (redemptions.isLoading) return <Skeleton className="h-40" />;
  if (!redemptions.data || redemptions.data.length === 0) {
    return (
      <EmptyState
        emoji="🎁"
        title="Nothing claimed yet"
        body="Spend some Sparks. That is what they are for — hoarding them helps nobody."
      />
    );
  }

  return (
    <ul className="space-y-2">
      {redemptions.data.map((item) => (
        <li key={item.id} className="card flex items-center gap-3 p-4">
          <span className="text-2xl">{item.reward?.emoji ?? '🎁'}</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{item.reward?.name ?? 'Reward'}</p>
            <p className="text-xs text-ash">{new Date(item.created_at).toLocaleDateString()}</p>
          </div>
          {item.fulfilled ? (
            <Badge tone="gold">Honoured ✓</Badge>
          ) : (
            <Button size="sm" variant="ghost" loading={fulfil.isPending} onClick={() => fulfil.mutate(item.id)}>
              Mark done
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
