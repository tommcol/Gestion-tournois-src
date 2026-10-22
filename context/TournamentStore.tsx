import React, { createContext, useContext, useRef, useSyncExternalStore, ReactNode } from 'react';
import { TournamentState } from '../types';

// Le tournoi peut changer sans réveiller les écrans qui n'utilisent pas les données modifiées.
export function createTournamentStore(initialState: TournamentState) {
  let state = initialState;
  const listeners = new Set<() => void>();
  return {
    getState: () => state,
    setState(next: TournamentState) {
      if (Object.is(state, next)) return;
      state = next; listeners.forEach(listener => listener());
    },
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  };
}
export type TournamentStore = ReturnType<typeof createTournamentStore>;
const StateContext = createContext<TournamentStore | null>(null);
export function TournamentStateScope({ store, children }: { store: TournamentStore; children: ReactNode }) {
  return <StateContext.Provider value={store}>{children}</StateContext.Provider>;
}
export function shallowEqual<T>(before: T, after: T): boolean {
  if (Object.is(before, after)) return true;
  if (!before || !after || typeof before !== 'object' || typeof after !== 'object') return false;
  const keys = Object.keys(before);
  return keys.length === Object.keys(after).length && keys.every(key => Object.prototype.hasOwnProperty.call(after, key) && Object.is((before as any)[key], (after as any)[key]));
}
export function useTournamentSelector<T>(selector: (state: TournamentState) => T, equal: (a: T, b: T) => boolean = Object.is): T {
  const store = useContext(StateContext);
  if (!store) throw new Error('Le sélecteur doit être utilisé dans TournamentStateScope');
  const cache = useRef<{ state: TournamentState; selector: typeof selector; selected: T }>();
  const snapshot = () => {
    const state = store.getState(), previous = cache.current;
    if (previous?.state === state && previous.selector === selector) return previous.selected;
    const next = selector(state);
    const selected = previous && equal(previous.selected, next) ? previous.selected : next;
    cache.current = { state, selector, selected }; return selected;
  };
  return useSyncExternalStore(store.subscribe, snapshot, snapshot);
}
export function useTournamentFields<K extends keyof TournamentState>(...keys: K[]): Pick<TournamentState, K> {
  return useTournamentSelector(state => {
    const selected = {} as Pick<TournamentState, K>;
    for (const key of keys) selected[key] = state[key];
    return selected;
  }, shallowEqual);
}
