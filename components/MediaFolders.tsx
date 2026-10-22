import React, { useEffect, useRef, useState } from 'react';
import { useTournamentControls, useTournamentStateReader } from '../context/TournamentContext';
import { getOnlineSession, MediaFile, onlineRequest, roomPath, uploadMedia } from '../services/onlineSession';
import { generateId } from '../utils/id';

const MediaFolders: React.FC = () => {
  const { dispatch } = useTournamentControls(); const read = useTournamentStateReader();
  const [folder, setFolder] = useState<'musiques' | 'sponsors'>('musiques'), [files, setFiles] = useState<MediaFile[]>([]), [busy, setBusy] = useState(false), [message, setMessage] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const refresh = async () => { try { const response = getOnlineSession() ? await onlineRequest('media') : await fetch('/api/media'); if (response.ok && response.headers.get('Content-Type')?.includes('application/json')) setFiles(await response.json()); } catch {} };
  useEffect(() => { void refresh(); }, []);
  const addToTournament = (items: MediaFile[]) => {
    const state = read(); const tracks = [...state.playlist];
    for (const item of items) {
      const session = getOnlineSession(); const url = item.url || (session ? roomPath(session, 'media/' + item.id) : ''); if (!url) continue;
      if (item.kind === 'musiques' && !tracks.some(t => t.url === url)) tracks.push({ name: item.name, url });
      if (item.kind === 'sponsors' && !state.sponsors.some(s => s.logo === url)) dispatch({ type: 'ADD_SPONSOR', payload: { id: generateId(), name: item.name.replace(/\.[^.]+$/, ''), logo: url } });
    }
    if (tracks.length !== state.playlist.length) dispatch({ type: 'UPDATE_PLAYLIST', payload: tracks });
  };
  const upload = async (selected: FileList | null) => {
    if (!selected?.length) return; setBusy(true); setMessage(''); const added: MediaFile[] = []; const errors: string[] = [];
    for (const file of Array.from(selected)) { try { added.push(await uploadMedia(file, folder)); } catch (e) { errors.push(`${file.name} : ${e instanceof Error ? e.message : 'envoi impossible'}`); } }
    addToTournament(added); await refresh(); setMessage(`${added.length} fichier(s) ajouté(s) au dossier et au tournoi.${errors.length ? ' ' + errors.join(' · ') : ''}`); setBusy(false); if (input.current) input.current.value = '';
  };
  return <section className="bg-white dark:bg-gray-800 rounded-xl border p-5 space-y-3" aria-label="Dossiers musiques et sponsors"><h2 className="text-xl font-bold">Mes dossiers — Musiques et Sponsors</h2><p className="text-sm text-gray-500">Les fichiers restent dans ces dossiers si vous les retirez de la playlist ou de l’affichage. Vous pouvez les réutiliser dans ce tournoi.</p><div role="tablist" aria-label="Dossier de fichiers" className="flex gap-2">{(['musiques', 'sponsors'] as const).map(kind => <button key={kind} role="tab" aria-selected={folder === kind} onClick={() => setFolder(kind)} className={`px-4 py-2 rounded border ${folder === kind ? 'bg-blue-600 text-white' : ''}`}>{kind === 'musiques' ? '📁 Musiques' : '📁 Sponsors'}</button>)}</div><label className="block text-sm">Ajouter des fichiers au dossier {folder}<input ref={input} aria-label={`Ajouter au dossier ${folder}`} type="file" multiple disabled={busy} accept={folder === 'musiques' ? 'audio/*' : 'image/png,image/jpeg,image/webp'} onChange={e => void upload(e.target.files)} className="block mt-2" /></label><p className="text-xs text-gray-500">En ligne : musique 50 Mo maximum, image 2 Mo maximum, dossiers 256 Mo au total par tournoi. Les fichiers ne sont pas inclus dans une sauvegarde JSON.</p>{busy && <p role="status">Envoi des fichiers…</p>}{message && <p role="status">{message}</p>}<ul className="space-y-2 max-h-64 overflow-auto">{files.filter(f => f.kind === folder).map(file => <li key={file.id} className="flex items-center gap-3 border rounded p-2"><span className="flex-1 break-all">{file.name} <small>({(file.size / 1048576).toFixed(1)} Mo)</small></span><button className="border rounded px-3 py-1" onClick={() => { addToTournament([file]); setMessage('Fichier ajouté au tournoi s’il n’était pas déjà présent.'); }}>Utiliser</button></li>)}</ul></section>;
};
export default MediaFolders;
