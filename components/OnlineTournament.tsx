import React, { useEffect, useState } from 'react';
import { useTournamentStateReader, useTournamentFields } from '../context/TournamentContext';
import { getOnlineSession, onlineLink, onlineRequest } from '../services/onlineSession';

const OnlineTournament: React.FC = () => {
  const read = useTournamentStateReader(); const { numberOfCourts, enableCourtView } = useTournamentFields('numberOfCourts', 'enableCourtView');
  const session = getOnlineSession(); const [available, setAvailable] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState('');
  const [access, setAccess] = useState<{ tv: string; courts: Record<number, string> } | null>(null);
  const [join, setJoin] = useState('');
  useEffect(() => { fetch('/api/online/info').then(r => r.ok ? r.json() : null).then(d => setAvailable(!!d?.online)).catch(() => {}); if (session) onlineRequest('access').then(r => r.json()).then(setAccess).catch(e => setError(e.message)); }, []);
  if (!available && !session) return null;
  const create = async () => {
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/online/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(read()) }); const data = await response.json();
      if (!response.ok) throw Error(data.error || 'Le tournoi n’a pas pu être créé.');
      const url = onlineLink(data.room, data.admin); localStorage.setItem('src-online-last-organizer', url); window.location.assign(url);
    } catch (e) { setError(e instanceof Error ? e.message : 'Connexion impossible.'); setBusy(false); }
  };
  const resume = (value: string) => { try { const url = new URL(value); if (url.origin !== window.location.origin || !url.searchParams.get('room') || !new URLSearchParams(url.hash.slice(1)).get('access')) throw Error(); window.location.assign(url.toString()); } catch { setError('Collez le lien complet reçu, avec son code d’accès.'); } };
  const linkRow = (name: string, url: string) => <label key={name} className="block text-sm space-y-1"><span className="font-semibold">{name}</span><div className="flex gap-2"><input aria-label={`Lien ${name}`} readOnly value={url} className="min-w-0 flex-1 border rounded p-2 dark:bg-gray-700" onFocus={e => e.target.select()} /><button type="button" className="px-3 py-2 border rounded" onClick={() => { navigator.clipboard.writeText(url).catch(() => setError('Sélectionnez le lien et copiez-le.')); }}>Copier</button><a className="px-3 py-2 border rounded" href={url} target="_blank" rel="noreferrer">Ouvrir</a></div></label>;
  return <section className="bg-white dark:bg-gray-800 rounded-xl border p-5 space-y-4" aria-label="Tournoi en ligne">
    <h2 className="text-xl font-bold">Tournoi en ligne — PC, tablettes et TV</h2>
    {session ? <><p>Les appareils qui ouvrent les liens ci-dessous rejoignent le même tournoi. Internet est nécessaire sur chaque appareil.</p>{linkRow('Organisateur — à garder privé', onlineLink(session.room, session.token))}{!enableCourtView && <p className="text-amber-600">Pour utiliser les tablettes, activez aussi « Activer les tablettes terrain » dans la configuration ci-dessous.</p>}{access && <>{linkRow('TV', onlineLink(session.room, access.tv, 'tv'))}{Array.from({ length: numberOfCourts }, (_, i) => linkRow(`Tablette terrain ${i + 1}`, onlineLink(session.room, access.courts[i + 1], 'court', i + 1)))}</>}
      <p className="text-sm text-gray-500">Gardez le lien organisateur en favori pour retrouver le tournoi. Les autres liens ne permettent pas de modifier sa configuration.</p><a href={window.location.origin} className="inline-block border rounded px-3 py-2">Revenir à la préparation sur ce navigateur</a></>
      : <><p>Créez un tournoi en ligne à partir de votre préparation actuelle. Vous recevrez un lien privé pour le retrouver et des liens séparés pour les tablettes et la TV.</p><p className="text-sm text-gray-500">Les musiques déjà stockées sur un PC devront être ajoutées au dossier Musiques en ligne. Le logiciel Windows en réseau local reste disponible sans Internet.</p><button disabled={busy} onClick={create} className="bg-blue-600 text-white rounded px-4 py-2 disabled:opacity-50">{busy ? 'Création du tournoi…' : 'Créer mon tournoi en ligne'}</button>{localStorage.getItem('src-online-last-organizer') && <button className="ml-3 border rounded px-3 py-2" onClick={() => resume(localStorage.getItem('src-online-last-organizer')!)}>Retrouver mon dernier tournoi</button>}<div className="flex flex-wrap gap-2"><input aria-label="Lien du tournoi à rejoindre" value={join} onChange={e => setJoin(e.target.value)} placeholder="Coller un lien de tournoi existant" className="flex-1 min-w-48 border rounded p-2 dark:bg-gray-700" /><button className="border rounded px-3 py-2" onClick={() => resume(join)}>Rejoindre</button></div></>}
    {error && <p role="alert" className="text-red-600">{error}</p>}
  </section>;
};
export default OnlineTournament;
