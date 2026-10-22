import { liveScoresChannel } from '../services/liveScoresChannel';
import { createTournamentStore, TournamentStateScope, useTournamentSelector } from './TournamentStore';
export { useTournamentSelector, useTournamentFields, useTournamentStateReader, shallowEqual } from './TournamentStore';
import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo, ReactNode } from 'react';
import { io } from 'socket.io-client';
import { AppSocket, OnlineSocket } from '../services/OnlineSocket';
import { getOnlineSession, roomScope } from '../services/onlineSession';
import { TournamentState, TournamentAction } from '../types';
import { initialData } from '../data/initialData';
import { tournamentReducer } from './tournamentReducer';
import { globalReducer } from './reducers/globalReducer';
import { saveTournamentState, loadTournamentState } from '../utils/db';
import { applyStatePatch, shareUnchanged, StatePatch } from '../utils/statePatch';
import { createCoalescedSave } from '../utils/coalescedSave';
import { ClockSnapshot } from '../utils/tournamentFlow';
import { generateId } from '../utils/id';
import { receiveMusicCommand, setMusicSender } from '../services/musicChannel';

const LEGACY_KEY = 'tournament_preview_state' + (roomScope() === 'local' ? '' : ':' + roomScope());
const QUEUE_KEY = 'tournament_pending_actions_v2:' + roomScope();
const SERVER_KEY = 'tournament_local_server_seen:' + roomScope();
interface Pending { id: string; action: TournamentAction }
async function loadLocal(): Promise<TournamentState> {
  try { const saved = await loadTournamentState(); if (saved) return saved; } catch {}
  try { const raw = localStorage.getItem(LEGACY_KEY); if (raw) return JSON.parse(raw); } catch {}
  return initialData;
}
const critical = (action: TournamentAction) => ['UPDATE_MATCH_SCORE', 'UPDATE_FINAL_MATCH_SCORE', 'SET_STATE', 'NEXT_SESSION', 'PREVIOUS_SESSION', 'CLEAR_DATA', 'RESET_TOURNAMENT'].includes(action.type);
const ClockContext = createContext<ClockSnapshot | null>(null);
const TournamentContext = createContext<{
  dispatch: React.Dispatch<TournamentAction>;
  emitAudioEvent: (data: any) => void; emitMusicCommand: (data: any) => void;
  isLoaded: boolean; isPreviewMode: boolean; socket: AppSocket | null;
} | undefined>(undefined);

export const TournamentProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [store] = useState(() => createTournamentStore(initialData));
  const stateRef = useRef(store.getState());
  const [clock, setClock] = useState<ClockSnapshot | null>(null);
  const clockRef = useRef<ClockSnapshot | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [connectionIssue, setConnectionIssue] = useState('');
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [socket, setSocket] = useState<AppSocket | null>(null);
  const socketRef = useRef<AppSocket | null>(null);
  const serverReady = useRef(false);
  const hadServer = useRef(false);
  const revision = useRef(0);
  const queue = useRef<Pending[]>([]);
  const inFlight = useRef(new Set<string>());
  const flushQueue = useRef<() => void>(() => {});
  const remoteView = new URLSearchParams(window.location.search).get('view');
  const isRemote = remoteView === 'court' || !!remoteView?.startsWith('tv');
  const saveRef = useRef(createCoalescedSave<TournamentState>(async value => {
    try { await saveTournamentState(value); }
    catch { localStorage.setItem(LEGACY_KEY, JSON.stringify(value)); }
  }, 300));
  const commit = useCallback((next: TournamentState, immediate = false) => {
    if (next === stateRef.current) return;
    stateRef.current = next; store.setState(next);
    if (!isRemote) void saveRef.current.save(next, immediate).catch(error => console.error('Copie locale non enregistrée:', error));
  }, [isRemote, store]);
  const persistQueue = useCallback(() => {
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue.current)); }
    catch (error) { console.error('Commandes en attente non copiées:', error); }
  }, []);
  const dispatch = useCallback((action: TournamentAction) => {
    if (isRemote) return;
    if (getOnlineSession() || hadServer.current || socketRef.current?.connected) {
      queue.current.push({ id: generateId(), action }); persistQueue(); flushQueue.current();
    } else commit(tournamentReducer(stateRef.current, action), critical(action));
  }, [isRemote, commit, persistQueue]);

  useEffect(() => {
    let disposed = false, loaded = false;
    try { hadServer.current = !!getOnlineSession() || localStorage.getItem(SERVER_KEY) === 'true'; queue.current = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch {}
    const fallback = async () => {
      if (loaded || disposed) return;
      const saved = await loadLocal(); if (loaded || disposed) return;
      if (getOnlineSession() && (isRemote || !localStorage.getItem(SERVER_KEY))) {
        setConnectionIssue('Connexion au tournoi impossible pour le moment. Vérifiez Internet et le lien complet fourni par l’organisateur.');
        return;
      }
      loaded = true; commit(globalReducer(stateRef.current, { type: 'SET_STATE', payload: saved }));
      setIsLoaded(true); setIsPreviewMode(true);
    };
    const fallbackTimer = setTimeout(fallback, 1200);
    const online = getOnlineSession();
    const connection: AppSocket = online ? new OnlineSocket(online) : io({ timeout: 3000, reconnectionAttempts: Infinity, auth: { role: isRemote ? remoteView : 'admin', protocol: 2 } });
    socketRef.current = connection; setSocket(connection);
    const sendPending = () => {
      if (!connection.connected || !serverReady.current) return;
      for (const item of queue.current.slice(0, 32)) {
        if (inFlight.current.has(item.id)) continue;
        inFlight.current.add(item.id);
        connection.timeout(8000).emit('tournament_action', item, (error: unknown, reply: { status: string; error?: string }) => {
          inFlight.current.delete(item.id);
          if (disposed || error) return;
          if (reply?.status === 'received' || reply?.status === 'rejected') {
            queue.current = queue.current.filter(p => p.id !== item.id); persistQueue();
            if (reply.status === 'rejected') window.alert(reply.error || 'Le PC n’a pas accepté cette modification.');
            sendPending();
          }
        });
      }
    };
    flushQueue.current = sendPending;
    const retry = setInterval(sendPending, 2000);
    connection.on('connect', () => { liveScoresChannel.clear(); clearTimeout(fallbackTimer); serverReady.current = false; inFlight.current.clear(); window.dispatchEvent(new Event('tournament_music_connected')); });
    connection.on('disconnect', () => { serverReady.current = false; inFlight.current.clear(); setIsPreviewMode(true); });
    connection.on('connect_error', fallback);
    connection.on('server_empty', async () => {
      if (disposed) return;
      if (isRemote) { loaded = true; setIsLoaded(true); setIsPreviewMode(false); return; }
      const saved = await loadLocal();
      if (!disposed) connection.emit('initialize_state', saved);
    });
    connection.on('state_update', (incoming: TournamentState, metadata?: { revision?: number }) => {
      if (disposed) return;
      loaded = true; setConnectionIssue(''); clearTimeout(fallbackTimer); serverReady.current = true; hadServer.current = true;
      try { localStorage.setItem(SERVER_KEY, 'true'); } catch {}
      revision.current = metadata?.revision ?? 0;
      const normalized = globalReducer(stateRef.current, { type: 'SET_STATE', payload: incoming });
      commit(shareUnchanged(stateRef.current, normalized));
      setIsLoaded(true); setIsPreviewMode(false); sendPending();
    });
    connection.on('state_patch', (message: { baseRevision: number; revision: number; patches: StatePatch[] }) => {
      if (message.baseRevision !== revision.current) { connection.emit('state_request'); return; }
      try { commit(applyStatePatch(stateRef.current, message.patches)); revision.current = message.revision; }
      catch { connection.emit('state_request'); }
    });
    const receiveClock = (snapshot: ClockSnapshot) => {
      if (snapshot.type === 'timer_end') liveScoresChannel.clear();
      clockRef.current = snapshot; setClock(snapshot);
      window.dispatchEvent(new CustomEvent('tournament_clock_sync', { detail: snapshot }));
    };
    connection.on('live_score_update', liveScoresChannel.receive);
    connection.on('courts_reset', liveScoresChannel.clear);
    connection.on('timer_sync', receiveClock);
    connection.on('audio_event', data => {
      // Compatibilité avec un ancien serveur : le nouveau n’envoie plus les ticks ici.
      if (['timer_start', 'timer_tick', 'timer_pause', 'timer_end', 'timer_reset', 'prestart_begin'].includes(data.type)) receiveClock(data);
      window.dispatchEvent(new CustomEvent('tournament_audio_event', { detail: data }));
    });
    connection.on('music_sync', receiveMusicCommand);
    setMusicSender(data => connection.emit('music_command', data));
    const flush = () => { void saveRef.current.flush().catch(() => {}); persistQueue(); };
    window.addEventListener('pagehide', flush);
    return () => {
      disposed = true; clearTimeout(fallbackTimer); clearInterval(retry); flush();
      window.removeEventListener('pagehide', flush); connection.disconnect(); setMusicSender(() => {});
    };
  }, [isRemote, remoteView, commit, persistQueue]);

  const emitAudioEvent = useCallback((data: any) => {
    const current = stateRef.current, previous = clockRef.current;
    const timed = ['timer_start', 'timer_tick', 'timer_pause', 'timer_end', 'timer_reset', 'prestart_begin'].includes(data.type);
    const snapshot = timed ? { ...data, session: current.currentSession, finals: current.isFinalPhase,
      matchIds: current.isFinalPhase ? Object.values(current.finalMatches).flat().filter(m => m.isReady && m.status !== 'finished').map(m => m.id) : current.matches.filter(m => m.sessionNumber === current.currentSession).map(m => m.id),
      endsAt: data.type === 'prestart_begin' ? Date.now() + 5000 : data.type === 'timer_start' ? Date.now() + (data.payload?.timeLeft ?? current.timerDuration) * 1000 : data.type === 'timer_tick' ? previous?.endsAt : undefined,
      breakEndsAt: data.type === 'timer_end' ? Date.now() + current.breakDuration * 1000 : undefined,
      payload: data.type === 'timer_pause' ? { timeLeft: previous?.endsAt ? Math.max(0, Math.ceil((previous.endsAt - Date.now()) / 1000)) : previous?.payload?.timeLeft } : data.payload,
    } : data;
    if (timed && (data.type !== 'timer_tick' || !socketRef.current?.connected)) { clockRef.current = snapshot; setClock(snapshot); }
    socketRef.current?.emit('play_audio', snapshot);
  }, []);
  const emitMusicCommand = useCallback((data: any) => { socketRef.current?.emit('music_command', data); }, []);
  const value = useMemo(() => ({ dispatch, emitAudioEvent, emitMusicCommand, isLoaded, isPreviewMode, socket }), [dispatch, emitAudioEvent, emitMusicCommand, isLoaded, isPreviewMode, socket]);
  if (!isLoaded) return <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" /><p className="text-gray-600 dark:text-gray-400">{connectionIssue || 'Chargement des données...'}</p>{connectionIssue && <a href={window.location.origin} className="block mt-4 text-blue-600">Revenir à la configuration</a>}</div></div>;
  return <TournamentContext.Provider value={value}><TournamentStateScope store={store}><ClockContext.Provider value={clock}>{children}</ClockContext.Provider></TournamentStateScope></TournamentContext.Provider>;
};
export const useOfficialClock = () => useContext(ClockContext);
export const useTournamentControls = () => {
  const context = useContext(TournamentContext);
  if (!context) throw new Error('useTournament must be used within a TournamentProvider');
  return context;
};
export const useTournament = () => {
  const controls = useTournamentControls();
  const state = useTournamentSelector(state => state);
  return { ...controls, state };
};
export const useTournamentContext = useTournament;
