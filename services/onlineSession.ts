export interface OnlineSession { room: string; token: string }
export function getOnlineSession(): OnlineSession | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search), hash = new URLSearchParams(window.location.hash.slice(1));
  const room = params.get('room'); if (!room || !/^[a-f0-9-]{36}$/.test(room)) return null;
  const view = params.get('view') || 'admin', court = params.get('court') || '';
  const key = `src-online-access:${room}:${view}:${court}`;
  const supplied = hash.get('access');
  if (supplied && /^[a-f0-9]{64}$/.test(supplied)) { sessionStorage.setItem(key, supplied); return { room, token: supplied }; }
  const saved = sessionStorage.getItem(key); return saved ? { room, token: saved } : null;
}
export function roomPath(session: OnlineSession, suffix: string) { return `/api/online/rooms/${session.room}/${suffix}`; }
export async function onlineRequest(suffix: string, options: RequestInit = {}) {
  const session = getOnlineSession(); if (!session) throw Error('Ouvrez d’abord votre tournoi en ligne.');
  const headers = new Headers(options.headers); headers.set('Authorization', `Bearer ${session.token}`);
  const response = await fetch(roomPath(session, suffix), { ...options, headers });
  if (!response.ok) { const body = await response.json().catch(() => ({})); throw Error(body.error || 'Connexion au tournoi impossible.'); }
  return response;
}
export function onlineLink(room: string, token: string, view = '', court?: number) {
  const url = new URL(window.location.origin); url.searchParams.set('room', room);
  if (view) url.searchParams.set('view', view); if (court) url.searchParams.set('court', String(court));
  url.hash = new URLSearchParams({ access: token }).toString(); return url.toString();
}
export async function deviceLink(view: 'tv' | 'court', court?: number, muted = false) {
  const session = getOnlineSession();
  if (!session) { const url = new URL(window.location.origin); url.searchParams.set('view', view); if (court) url.searchParams.set('court', String(court)); if (muted) url.searchParams.set('mute', 'true'); return url.toString(); }
  const access = await (await onlineRequest('access')).json();
  const url = new URL(onlineLink(session.room, view === 'tv' ? access.tv : access.courts[court!], view, court));
  if (muted) url.searchParams.set('mute', 'true'); return url.toString();
}
export function roomScope() { return getOnlineSession()?.room || 'local'; }
export interface MediaFile { id: string; kind: 'musiques' | 'sponsors'; name: string; mime: string; size: number; url?: string }
export async function uploadMedia(file: File, kind: MediaFile['kind']) {
  const session = getOnlineSession();
  const response = session ? await onlineRequest(`media?kind=${kind}`, { method: 'POST', headers: { 'x-file-name': encodeURIComponent(file.name), 'Content-Type': file.type }, body: file }) : await fetch(`/api/upload?kind=${kind}`, { method: 'POST', headers: { 'x-file-name': encodeURIComponent(file.name), 'Content-Type': file.type }, body: file });
  if (!response.ok) { const data = await response.json().catch(() => ({})); throw Error(data.error || 'Le fichier n’a pas été ajouté. Vérifiez la connexion au logiciel.'); }
  return await response.json() as MediaFile & { url: string };
}
