import { roomScope } from '../services/onlineSession';
import { getStartingBonus } from '../utils/startingBonus';
import { ClockSnapshot } from '../utils/tournamentFlow';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTournamentContext, useOfficialClock } from '../context/TournamentContext';
import { CourtSubmission } from '../types';
import { generateId } from '../utils/id';

interface Draft extends CourtSubmission {
  phase: 'waiting' | 'ready' | 'playing' | 'pending' | 'sent' | 'conflict' | 'ended';
  remaining: number; endsAt?: number; running: boolean; overtime?: boolean;
  overtimeReceived?: boolean; session: number; bonus1: number; bonus2: number;
}

const CourtView: React.FC<{ courtNumber: number }> = ({ courtNumber }) => {
  const { state, socket } = useTournamentContext();
  const clock = useOfficialClock();
  const key = `src-court-draft-v1-${courtNumber}${roomScope() === 'local' ? '' : ':' + roomScope()}`;
  const [draft, setDraft] = useState<Draft | null>(() => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch { return null; } });
  const draftRef = useRef(draft);
  const [connected, setConnected] = useState(!!socket?.connected);
  const [storageError, setStorageError] = useState(false);
  const sending = useRef(false);
  const save = useCallback((next: Draft | null) => {
    draftRef.current = next;
    try { localStorage.setItem(key, JSON.stringify(next)); setStorageError(false); } catch { setStorageError(true); }
    setDraft(next);
  }, [key]);
  const available = state.isFinalPhase
    ? Object.values(state.finalMatches).flat().find(m => m.court === courtNumber && m.isReady && m.status !== 'finished' && m.team1Id && m.team2Id)
    : state.matches.find(m => m.court === courtNumber && m.sessionNumber === state.currentSession && m.status !== 'finished');
  useEffect(() => {
    const current = draftRef.current;
    if (!available || current?.matchId === available.id) return;
    // Un résultat non reçu reste affiché, même si le PC est passé à la suite.
    if (current && current.phase !== 'sent') return;
    const t1 = state.teams.find(t => t.id === available.team1Id);
    const t2 = state.teams.find(t => t.id === available.team2Id);
    const b1 = getStartingBonus(t1), b2 = getStartingBonus(t2);
    save({ id: generateId(), matchId: available.id, court: courtNumber,
      categoryId: 'categoryId' in available ? available.categoryId : undefined,
      team1Name: t1?.name || 'Équipe 1', team2Name: t2?.name || 'Équipe 2', score1: b1, score2: b2,
      fouls1: 0, fouls2: 0, bonus1: b1, bonus2: b2, phase: 'waiting', running: false,
      remaining: state.timerDuration, session: state.currentSession });
  }, [available?.id, state.currentSession, state.teams, state.timerDuration, courtNumber, save, draft?.phase]);

  const submit = useCallback((automatic = false) => {
    const current = draftRef.current;
    if (!current || current.phase === 'sent' || current.phase === 'conflict') return;
    if (current.categoryId && current.score1 === current.score2) { save({ ...current, phase: 'ended', running: false, endsAt: undefined, remaining: 0 }); return; }
    const pending: Draft = { ...current, automatic: current.phase === 'pending' ? current.automatic : automatic, phase: 'pending', running: false, endsAt: undefined, remaining: 0 };
    if (current.phase !== 'pending') save(pending);
    if (!socket?.connected || sending.current) return;
    sending.current = true;
    socket.timeout(5000).emit('court_submit', pending, (err: unknown, response: { status: string; clock?: ClockSnapshot }) => {
      sending.current = false;
      const latest = draftRef.current;
      if (err || !latest || latest.id !== pending.id) return;
      if (response?.status === 'received') save({ ...latest, phase: 'sent' });
      else if (response?.status === 'conflict') save({ ...latest, phase: 'conflict' });
      else if (response?.status === 'tie') save({ ...latest, phase: 'ended' });
      else if (response?.status === 'clock' && response.clock) {
        const c = response.clock;
        save({ ...latest, phase: 'playing', automatic: false, running: ['timer_start', 'timer_tick'].includes(c.type), endsAt: c.endsAt, remaining: c.endsAt ? Math.max(0, Math.ceil((c.endsAt - Date.now()) / 1000)) : c.payload?.timeLeft ?? latest.remaining });
      }
    });
  }, [socket, save]);

  useEffect(() => {
    if (!socket) return;
    const connect = () => { setConnected(true); sending.current = false; const current = draftRef.current; if (current?.phase === 'ready') socket.emit('court_ready', { court: courtNumber, matchId: current.matchId, categoryId: current.categoryId }); };
    const disconnect = () => { setConnected(false); sending.current = false; };
    socket.on('connect', connect); socket.on('disconnect', disconnect);
    return () => { socket.off('connect', connect); socket.off('disconnect', disconnect); };
  }, [socket]);

  // Restaure le chrono officiel sans toucher aux points ni aux fautes.
  useEffect(() => {
    const current = draftRef.current;
    if (!current || !clock?.matchIds?.includes(current.matchId) || ['sent', 'pending', 'conflict'].includes(current.phase)) return;
    if (clock.type === 'timer_end') {
      if (!current.overtime) submit(true);
      return;
    }
    if (['timer_start', 'timer_tick'].includes(clock.type) && !current.overtime) {
      const remaining = clock.endsAt ? Math.max(0, Math.ceil((clock.endsAt - Date.now()) / 1000)) : clock.payload?.timeLeft ?? current.remaining;
      if (!current.running || current.endsAt !== clock.endsAt || current.phase !== 'playing') save({ ...current, phase: 'playing', remaining, running: true, endsAt: clock.endsAt });
    } else if (clock.type === 'timer_pause' || clock.type === 'timer_reset') {
      save({ ...current, running: false, endsAt: undefined, remaining: clock.type === 'timer_reset' ? state.timerDuration : clock.payload?.timeLeft ?? current.remaining });
    }
  }, [clock, draft?.matchId, state.timerDuration, save, submit]);

  useEffect(() => {
    const tick = () => {
      const current = draftRef.current;
      if (!current) return;
      if (current.running && current.endsAt) {
        const remaining = Math.max(0, Math.ceil((current.endsAt - Date.now()) / 1000));
        if (!remaining) submit(true);
        else if (remaining !== current.remaining) { const next = { ...current, remaining }; draftRef.current = next; setDraft(next); }
      }
      if (['pending', 'conflict'].includes(current.phase) && socket?.connected) {
        if (current.phase === 'conflict') save({ ...current, phase: 'pending' });
        submit();
      }
      if (current.overtime && !current.overtimeReceived && socket?.connected) {
        socket.timeout(3000).emit('court_overtime', current, (err: unknown, response: { status: string }) => {
          const latest = draftRef.current;
          if (!err && response?.status === 'received' && latest?.id === current.id) save({ ...latest, overtimeReceived: true });
        });
      }
    };
    tick(); const timer = setInterval(tick, 1000); return () => clearInterval(timer);
  }, [socket, save, submit]);

  useEffect(() => {
    if (!draft || !socket?.connected || !['playing', 'ended'].includes(draft.phase)) return;
    socket.emit('live_score', { ...draft });
  }, [draft?.score1, draft?.score2, draft?.fouls1, draft?.fouls2, draft?.phase, socket, connected]);

  const change = (field: 'score1' | 'score2' | 'fouls1' | 'fouls2', delta: number) => {
    const current = draftRef.current;
    if (!current || !['playing', 'ended'].includes(current.phase) || (current.phase === 'ended' && current.categoryId && !current.overtime)) return;
    const min = field === 'score1' ? current.bonus1 : field === 'score2' ? current.bonus2 : 0;
    save({ ...current, [field]: Math.max(min, Math.min(field.startsWith('fouls') ? 13 : Number.MAX_SAFE_INTEGER, current[field] + delta)) });
  };
  const locked = !!draft && ['pending', 'sent', 'conflict'].includes(draft.phase);
  const time = draft?.remaining ?? state.timerDuration;
  return <div className="min-h-screen bg-gray-100 dark:bg-gray-900 max-w-[500px] mx-auto flex flex-col">
    <header className="bg-blue-700 text-white p-4 flex justify-between items-center"><div><div className="text-xs">Session {draft?.session || state.currentSession}</div><h1 className="text-xl font-bold">Terrain {courtNumber}</h1></div><div className="text-3xl font-mono font-bold">{draft?.overtime ? 'Prolongation' : `${Math.floor(time / 60)}:${String(time % 60).padStart(2, '0')}`}</div></header>
    <div role="status" className={`p-3 text-center text-sm font-bold ${connected ? 'bg-green-100 text-green-900' : 'bg-amber-100 text-amber-900'}`}>{connected ? 'Connecté au PC' : 'Hors connexion — gardez cette page ouverte. Les points et fautes restent sur cette tablette.'}</div>
    {storageError && <p role="alert" className="p-3 bg-red-100 text-red-900">La tablette ne peut pas garder les données. Notez le score et les fautes sur papier avant de fermer cette page.</p>}
    {!draft ? <p className="p-8 text-center">Aucun match prévu sur ce terrain.</p> : <main className="p-4 space-y-4">
      {draft.phase === 'waiting' && <button className="w-full p-5 rounded-xl bg-blue-600 text-white text-xl font-bold" onClick={() => { socket?.emit('court_ready', { court: courtNumber, matchId: draft.matchId, categoryId: draft.categoryId }); save({ ...draft, phase: 'ready' }); }}>Équipes prêtes</button>}
      {draft.phase === 'ready' && <p className="text-center">En attente du lancement par l’organisateur…</p>}
      <div className="grid grid-cols-2 gap-3">{([1, 2] as const).map(n => <div key={n} className="bg-white dark:bg-gray-800 rounded-xl p-3 text-center shadow-sm">
        <h2 className="font-bold break-words">{n === 1 ? draft.team1Name : draft.team2Name}</h2>
        {(n === 1 ? draft.bonus1 : draft.bonus2) > 0 && <p className="text-xs text-orange-600">Bonus initial : +{n === 1 ? draft.bonus1 : draft.bonus2}</p>}
        <p className="text-5xl font-bold my-4">{n === 1 ? draft.score1 : draft.score2}</p>
        {!locked && ['playing', 'ended'].includes(draft.phase) && <div className="flex justify-center gap-4"><button aria-label={`Retirer un point équipe ${n}`} className="p-3 border rounded-lg text-2xl" onClick={() => change(n === 1 ? 'score1' : 'score2', -1)}>−</button><button aria-label={`Ajouter un point équipe ${n}`} className="p-3 border rounded-lg text-2xl" onClick={() => change(n === 1 ? 'score1' : 'score2', 1)}>+</button></div>}
        <p className="mt-4">Fautes : <strong>{n === 1 ? draft.fouls1 : draft.fouls2}</strong></p>
        {!locked && ['playing', 'ended'].includes(draft.phase) && <div className="flex justify-center gap-4 mt-2"><button aria-label={`Retirer une faute équipe ${n}`} className="p-3 border rounded-lg" onClick={() => change(n === 1 ? 'fouls1' : 'fouls2', -1)}>−</button><button aria-label={`Ajouter une faute équipe ${n}`} className="p-3 border rounded-lg" onClick={() => change(n === 1 ? 'fouls1' : 'fouls2', 1)}>+</button></div>}
        {(n === 1 ? draft.fouls1 : draft.fouls2) >= 7 && <p className="text-orange-600 text-xs mt-2">{(n === 1 ? draft.fouls1 : draft.fouls2) >= 10 ? '2 lancers-francs + possession' : '2 lancers-francs'}</p>}
      </div>)}</div>
      {draft.categoryId && draft.score1 === draft.score2 && !locked && ['playing', 'ended'].includes(draft.phase) && <div className="bg-amber-100 text-amber-950 p-4 rounded-xl"><p>Égalité : le score ne peut pas être validé en phase finale.</p><button disabled={draft.remaining > 0} className="font-bold underline mt-2 disabled:opacity-40" onClick={() => save({ ...draft, overtime: true, phase: 'playing', running: false, endsAt: undefined, remaining: 0 })}>Prolongation — prévenir l’organisateur</button></div>}
      {!locked && ['playing', 'ended'].includes(draft.phase) && <button className="w-full p-4 bg-green-600 text-white rounded-xl font-bold disabled:opacity-40" disabled={!!draft.categoryId && draft.score1 === draft.score2} onClick={() => { if (window.confirm(`Confirmer le score ${draft.score1} - ${draft.score2} ?`)) submit(); }}>Envoyer le score</button>}
      {locked && <div className="text-center rounded-xl bg-white dark:bg-gray-800 p-5" role="status"><p className="text-xl font-bold">{draft.phase === 'sent' ? 'Score reçu par le PC ✓' : draft.phase === 'conflict' ? 'Deux scores différents : l’organisateur doit choisir.' : 'Score conservé — en attente de réception par le PC.'}</p><p className="mt-3">{draft.phase === 'sent' ? 'Seul l’organisateur peut le corriger.' : 'Montrez cet écran à l’organisateur si la connexion ne revient pas.'}</p></div>}
    </main>}
  </div>;
};
export default CourtView;
