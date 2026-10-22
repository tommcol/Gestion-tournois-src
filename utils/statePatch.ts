// Petites mises à jour immuables : aucune image/playlist inchangée ne repart sur le réseau.
export interface StatePatch { path: string[]; value?: unknown; remove?: boolean }
const forbidden = new Set(['__proto__', 'prototype', 'constructor']);
const object = (value: any) => value !== null && typeof value === 'object';
export function diffState(before: any, after: any, path: string[] = []): StatePatch[] {
  if (Object.is(before, after)) return [];
  if (!object(before) || !object(after) || Array.isArray(before) !== Array.isArray(after)) return [{ path, value: after }];
  if (Array.isArray(after) && before.length !== after.length) return [{ path, value: after }];
  const patches: StatePatch[] = [];
  for (const key of Object.keys(before)) if (!(key in after)) patches.push({ path: [...path, key], remove: true });
  for (const key of Object.keys(after)) {
    if (forbidden.has(key)) throw new Error('Clé de sauvegarde non autorisée');
    patches.push(...diffState(before[key], after[key], [...path, key]));
  }
  return patches;
}
export function applyStatePatch<T>(state: T, patches: StatePatch[]): T {
  let next: any = state;
  for (const patch of patches) {
    if (!Array.isArray(patch.path) || patch.path.some(key => typeof key !== 'string' || forbidden.has(key))) throw new Error('Mise à jour invalide');
    const apply = (current: any, depth: number): any => {
      if (depth === patch.path.length) return patch.value;
      const key = patch.path[depth];
      const copy = Array.isArray(current) ? current.slice() : { ...current };
      if (depth === patch.path.length - 1 && patch.remove) delete copy[key as any];
      else copy[key as any] = apply(current?.[key], depth + 1);
      return copy;
    };
    next = apply(next, 0);
  }
  return next;
}
// Le rattrapage complet garde les références des parties réellement inchangées.
export function shareUnchanged<T>(before: T, after: T): T {
  if (Object.is(before, after)) return before;
  if (!object(before) || !object(after) || Array.isArray(before) !== Array.isArray(after)) return after;
  const keys = Object.keys(after as any);
  let equal = keys.length === Object.keys(before as any).length;
  const result: any = Array.isArray(after) ? [] : {};
  for (const key of keys) { result[key] = shareUnchanged((before as any)[key], (after as any)[key]); equal = equal && Object.is(result[key], (before as any)[key]); }
  return equal ? before : result;
}
