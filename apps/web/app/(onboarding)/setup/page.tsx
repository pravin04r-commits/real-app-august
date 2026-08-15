'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  DISTANCE_TYPES,
  RELATIONSHIP_TYPES,
  type Couple,
  type DistanceType,
  type RelationshipType,
} from '@real/types';
import { shipName as blendNames } from '@real/utils';
import { Alert, Button, Field, Input, Textarea } from '@/components/ui';
import { useApi } from '@/hooks/useApi';
import { useMe } from '@/hooks/useMe';
import { cn } from '@/lib/cn';
import { InviteCard } from '@/components/onboarding/InviteCard';

const AESTHETICS = [
  { color: '#FF2D6B', vibe: 'chaotic-soft', emoji: '🔥', label: 'Hot mess, deeply in love' },
  { color: '#7B2FBE', vibe: 'cosmic', emoji: '🌌', label: 'Cosmic and a bit weird' },
  { color: '#FFD700', vibe: 'golden', emoji: '✨', label: 'Golden hour, always' },
  { color: '#C0153A', vibe: 'classic', emoji: '🍷', label: 'Old money, new drama' },
];

const RELATIONSHIP_COPY: Record<RelationshipType, string> = {
  dating: 'Dating',
  committed: 'Committed',
  engaged: 'Engaged',
  married: 'Married',
};

const DISTANCE_COPY: Record<DistanceType, string> = {
  same_city: 'Same city',
  long_distance: 'Long distance',
};

export default function SetupPage() {
  const router = useRouter();
  const api = useApi();
  const { data: me } = useMe();

  const [shipName, setShipName] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('committed');
  const [distanceType, setDistanceType] = useState<DistanceType>('same_city');
  const [howWeMet, setHowWeMet] = useState('');
  const [aesthetic, setAesthetic] = useState(AESTHETICS[0]!);
  const [created, setCreated] = useState<Couple | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const suggestion =
    me?.display_name && partnerName ? blendNames(me.display_name, partnerName) : '';

  async function create() {
    setError(null);
    setLoading(true);
    try {
      const couple = await api.post<Couple>('/couple', {
        ship_name: shipName.trim() || suggestion || 'Us',
        start_date: startDate,
        relationship_type: relationshipType,
        distance_type: distanceType,
        how_we_met: howWeMet.trim() || undefined,
        aesthetic: { color: aesthetic.color, vibe: aesthetic.vibe, emoji: aesthetic.emoji },
      });
      await api.patch('/me', { onboarding_done: true });
      setCreated(couple);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your space.');
    } finally {
      setLoading(false);
    }
  }

  if (created) {
    return <InviteCard couple={created} onContinue={() => router.push('/universe')} />;
  }

  return (
    <div className="animate-fade-up">
      <p className="label">Almost there</p>
      <h1 className="mt-3 font-display text-3xl font-extrabold">Name your universe</h1>

      <div className="mt-8 space-y-6">
        {error && <Alert tone="error">{error}</Alert>}

        <Field label="Their name" hint="Only used to suggest a ship name.">
          <Input
            value={partnerName}
            onChange={(e) => setPartnerName(e.target.value)}
            placeholder="Your partner's name"
            maxLength={40}
          />
        </Field>

        <Field
          label="Ship name"
          hint={suggestion ? `Suggestion: ${suggestion}` : 'The name for the two of you together.'}
        >
          <Input
            value={shipName}
            onChange={(e) => setShipName(e.target.value)}
            placeholder={suggestion || 'e.g. Pravya'}
            maxLength={40}
          />
        </Field>

        <Field label="When did this start?" hint="Drives your day counter and anniversaries.">
          <Input
            type="date"
            required
            value={startDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </Field>

        <div>
          <span className="label mb-3 block">Status</span>
          <div className="grid grid-cols-2 gap-2">
            {RELATIONSHIP_TYPES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRelationshipType(value)}
                className={cn(
                  'rounded-xl border px-4 py-3 text-sm font-medium transition-all',
                  relationshipType === value
                    ? 'border-hot-pink bg-hot-pink/12 text-blush'
                    : 'border-white/10 bg-slate/40 text-ash hover:text-blush'
                )}
              >
                {RELATIONSHIP_COPY[value]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="label mb-3 block">Distance</span>
          <div className="grid grid-cols-2 gap-2">
            {DISTANCE_TYPES.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setDistanceType(value)}
                className={cn(
                  'rounded-xl border px-4 py-3 text-sm font-medium transition-all',
                  distanceType === value
                    ? 'border-purple bg-purple/15 text-blush'
                    : 'border-white/10 bg-slate/40 text-ash hover:text-blush'
                )}
              >
                {DISTANCE_COPY[value]}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-ash">
            Long distance changes the dares you get. No &ldquo;go for a walk together&rdquo; at 3am your time.
          </p>
        </div>

        <div>
          <span className="label mb-3 block">Your aesthetic</span>
          <div className="grid grid-cols-2 gap-2">
            {AESTHETICS.map((option) => (
              <button
                key={option.vibe}
                type="button"
                onClick={() => setAesthetic(option)}
                className={cn(
                  'rounded-xl border p-4 text-left transition-all',
                  aesthetic.vibe === option.vibe
                    ? 'border-white/40 bg-white/8'
                    : 'border-white/10 bg-slate/40 hover:border-white/25'
                )}
                style={aesthetic.vibe === option.vibe ? { borderColor: option.color } : undefined}
              >
                <span className="text-2xl">{option.emoji}</span>
                <span className="mt-2 block text-xs text-ash">{option.label}</span>
              </button>
            ))}
          </div>
        </div>

        <Field label="How you met" hint="Optional. Shows on your public card if you go public.">
          <Textarea
            value={howWeMet}
            onChange={(e) => setHowWeMet(e.target.value)}
            placeholder="The version you both agree on..."
            maxLength={2000}
          />
        </Field>

        <Button onClick={create} loading={loading} disabled={!startDate} fullWidth size="lg">
          Create our universe 🌌
        </Button>
      </div>
    </div>
  );
}
