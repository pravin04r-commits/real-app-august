'use client';

import { create } from 'zustand';
import type { Couple, UniverseSnapshot, User } from '@real/types';

interface RealState {
  me: User | null;
  couple: Couple | null;
  partner: User | null;
  snapshot: UniverseSnapshot | null;
  /** Sparks celebration queue — drives the floating +N animation. */
  sparkPops: Array<{ id: number; amount: number }>;

  setSnapshot: (snapshot: UniverseSnapshot) => void;
  setMe: (me: User | null) => void;
  setCouple: (couple: Couple | null) => void;
  popSparks: (amount: number) => void;
  clearPop: (id: number) => void;
  reset: () => void;
}

let popId = 0;

export const useRealStore = create<RealState>((set) => ({
  me: null,
  couple: null,
  partner: null,
  snapshot: null,
  sparkPops: [],

  setSnapshot: (snapshot) =>
    set({
      snapshot,
      me: snapshot.me,
      couple: snapshot.couple,
      partner: snapshot.partner,
    }),

  setMe: (me) => set({ me }),
  setCouple: (couple) => set({ couple }),

  popSparks: (amount) => {
    popId += 1;
    const id = popId;
    set((state) => ({ sparkPops: [...state.sparkPops, { id, amount }] }));
    // Auto-clear so the queue never grows unbounded.
    setTimeout(() => set((state) => ({ sparkPops: state.sparkPops.filter((p) => p.id !== id) })), 1200);
  },

  clearPop: (id) => set((state) => ({ sparkPops: state.sparkPops.filter((p) => p.id !== id) })),

  reset: () => set({ me: null, couple: null, partner: null, snapshot: null, sparkPops: [] }),
}));
