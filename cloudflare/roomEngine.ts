import { beginFinalOvertime, finalMatchStartIssue } from '../utils/finalMatchSafety';
import { TournamentState } from '../types';
import { tournamentReducer } from '../context/tournamentReducer';
import { diffState } from '../utils/statePatch';
import { receiveCourtScore } from '../utils/courtResults';
import { readLiveScore } from '../utils/liveScores';
import { ClockSnapshot } from '../utils/tournamentFlow';
import { getPreviousSessionSnapshot } from '../utils/sessionSnapshot';

export interface Principal { role: 'admin' | 'tv' | 'court'; court?: number }
export interface RoomRecord {
  state: TournamentState; revision: number; recent: string[]; receipts: Record<string, { status: string }>;
  clock: ClockSnapshot | null; music: any; ready: number[]; backups: TournamentState[];
}
export interface Message { event: string; args: any[]; exceptSender?: boolean }
const message = (event: string, ...args: any[]): Message => ({ event, args });
export const validActions = new Set(['UPSERT_OFFICIAL', 'SET_OFFICIAL_ACTIVE', 'REASSIGN_OFFICIALS', 'SET_STATE', 'UPDATE_CONFIG', 'UPDATE_SOUND_CONFIG', 'ADD_CATEGORY', 'UPDATE_CATEGORY', 'DELETE_CATEGORY', 'ADD_TEAM', 'UPDATE_TEAM', 'DELETE_TEAM', 'GENERATE_CATEGORY_POOLS_AND_MATCHES', 'RESET_CATEGORY_POOLS', 'UPDATE_MATCH_SCORE', 'UPDATE_FINAL_CONFIG', 'GENERATE_FINAL_PHASE', 'UPDATE_MANUAL_PAIRINGS', 'UPDATE_FINAL_MATCH_SCORE', 'UPDATE_FINAL_MATCH_COURT', 'SET_FINAL_MATCH_READY', 'DELETE_FINAL_PHASE', 'ADD_SPONSOR', 'UPDATE_SPONSOR', 'DELETE_SPONSOR', 'UPDATE_PLAYLIST', 'NEXT_SESSION', 'PREVIOUS_SESSION', 'RESET_SESSIONS', 'FINISH_POOL_STAGE', 'START_FINAL_PHASE', 'START_TOURNAMENT', 'SET_TV_ROUND', 'CLEAR_DATA', 'RESET_TOURNAMENT']);
export class RoomEngine {
  live = new Map<number, any>();
  constructor(public record: RoomRecord) {}
  static create(state: TournamentState) {
    return new RoomEngine({ state: tournamentReducer(state, { type: 'SET_STATE', payload: state }), revision: 1, recent: [], receipts: {}, clock: null, music: null, ready: [], backups: [] });
  }
  initial(): Message[] {
    const r = this.record;
    return [message('state_update', r.state, { revision: r.revision }), message('court_ready_update', { readyCourts: r.ready }), ...(r.clock ? [message('timer_sync', r.clock)] : []), ...(r.music ? [message('music_sync', r.music)] : []), ...Array.from(this.live.values(), score => message('live_score_update', score))];
  }
  expire(now = Date.now()): Message[] {
    const r = this.record, c = r.clock;
    if (c?.endsAt && c.endsAt <= now && ['timer_start', 'timer_tick'].includes(c.type)) {
      r.clock = { ...c, type: 'timer_end', endsAt: undefined, payload: { timeLeft: 0 }, breakEndsAt: c.endsAt + r.state.breakDuration * 1000 };
      this.live.clear(); return [message('timer_sync', r.clock)];
    }
    return [];
  }
  handle(principal: Principal, event: string, data: any, now = Date.now()): { reply: any; messages: Message[]; persist: boolean } {
    const r = this.record, messages: Message[] = [];
    const reject = () => ({ reply: { status: 'rejected', error: 'Cette commande n’est pas autorisée pour cet accès.' }, messages: [], persist: false });
    const isAdmin = principal.role === 'admin';
    const canCourt = (court: unknown) => Number.isInteger(court) && Number(court) >= 1 && Number(court) <= r.state.numberOfCourts && (isAdmin || principal.role === 'court' && principal.court === court);
    const findMatch = () => data?.categoryId ? r.state.finalMatches[data.categoryId]?.find(m => m.id === data.matchId) : r.state.matches.find(m => m.id === data?.matchId);
    const activeMatch = () => { const m = findMatch(); return m && m.court === data.court && m.status !== 'finished' && (data.categoryId ? ('isReady' in m && m.isReady) : m.sessionNumber === r.state.currentSession) ? m : null; };
    const patch = (next: TournamentState) => {
      const patches = diffState(r.state, next);
      if (patches.length) { const baseRevision = r.revision++; r.state = next; messages.push(message('state_patch', { baseRevision, revision: r.revision, patches })); }
    };
    if (event === 'state_request') return { reply: { status: 'received' }, messages: this.initial(), persist: false };
    if (event === 'tournament_action') {
      if (!isAdmin || typeof data?.id !== 'string' || data.id.length > 128 || !validActions.has(data.action?.type)) return reject();
      if (r.recent.includes(data.id)) return { reply: { status: 'received' }, messages: [], persist: false };
      if (data.action.type === 'SET_FINAL_MATCH_READY' && data.action.payload?.isReady) {
        const target = r.state.finalMatches[data.action.payload.categoryId]?.find(m => m.id === data.action.payload.matchId);
        const issue = target ? finalMatchStartIssue(r.state, target) : 'Match introuvable.';
        if (issue) return { reply: { status: 'rejected', error: issue }, messages: [], persist: false };
      }
      const next = tournamentReducer(r.state, data.action);
      const snapshot = getPreviousSessionSnapshot(r.state, next);
      if (snapshot) { r.backups = [...r.backups.slice(-4), snapshot.state]; while (r.backups.length && JSON.stringify(r.backups).length > 2000000) r.backups.shift(); }
      if (next.currentSession !== r.state.currentSession || ['SET_STATE', 'CLEAR_DATA', 'RESET_TOURNAMENT'].includes(data.action.type)) {
        r.ready = []; this.live.clear(); r.clock = null; messages.push(message('courts_reset'), message('timer_sync', { type: 'timer_reset', session: next.currentSession, finals: next.isFinalPhase, matchIds: [], payload: { timeLeft: next.timerDuration } }));
      }
      patch(next); r.recent = [...r.recent.slice(-511), data.id];
    } else if (event === 'court_submit') {
      if (!canCourt(data?.court) || typeof data?.id !== 'string' || data.id.length > 128) return reject();
      if (r.receipts[data.id] && r.receipts[data.id].status !== 'conflict') return { reply: r.receipts[data.id], messages: [], persist: false };
      if (data.automatic && r.clock?.matchIds.includes(data.matchId) && (r.clock.type === 'timer_pause' || r.clock.endsAt && r.clock.endsAt > now)) return { reply: { status: 'clock', clock: r.clock }, messages: [], persist: false };
      const result = receiveCourtScore(r.state, data); patch(result.state);
      if (['received', 'conflict'].includes(result.status)) r.receipts[data.id] = { status: result.status };
      return { reply: { status: result.status }, messages, persist: ['received', 'conflict'].includes(result.status) };
    } else if (event === 'court_resolve') {
      if (!isAdmin) return reject();
      const conflict = r.state.courtConflicts?.find(c => c.id === data?.id); if (!conflict) return reject();
      let next = r.state;
      if (data.useTablet) { const result = receiveCourtScore(next, conflict.submission, true); if (result.status !== 'received') return reject(); next = result.state; }
      patch({ ...next, courtConflicts: (next.courtConflicts || []).filter(c => c.id !== data.id) }); r.receipts[data.id] = { status: 'received' };
    } else if (event === 'court_ready' || event === 'court_ready_cancel') {
      if (!canCourt(data?.court) || !isAdmin && !activeMatch()) return reject();
      r.ready = r.ready.filter(c => c !== data.court); if (event === 'court_ready') r.ready.push(data.court);
      messages.push(message('court_ready_update', { readyCourts: r.ready }));
    } else if (event === 'live_score') {
      const score = readLiveScore(data); if (!score || !canCourt(score.court) || !activeMatch()) return reject();
      this.live.set(score.court, score); return { reply: { status: 'received' }, messages: [message('live_score_update', score)], persist: false };
    } else if (event === 'court_overtime') {
      if (!canCourt(data?.court) || !data.categoryId || !activeMatch()) return reject();
      const next = beginFinalOvertime(r.state, data); if (!next) return reject();
      patch(next);
    } else if (event === 'play_audio') {
      if (!isAdmin) return reject();
      if (['timer_start', 'timer_tick', 'timer_pause', 'timer_end', 'timer_reset', 'prestart_begin'].includes(data?.type)) {
        if (data.session !== r.state.currentSession || typeof data.finals !== 'boolean' || !Array.isArray(data.matchIds)) return reject();
        if (data.type === 'timer_tick') return { reply: { status: 'received' }, messages: r.clock ? [message('timer_sync', r.clock)] : [], persist: false };
        if (data.type === 'timer_end' && r.clock?.type === 'timer_end') return { reply: { status: 'received' }, messages: [message('timer_sync', r.clock)], persist: false };
        const duration = Math.max(0, Math.min(86400, Number(data.payload?.timeLeft ?? r.state.timerDuration)));
        r.clock = { type: data.type, session: r.state.currentSession, finals: r.state.isFinalPhase, matchIds: data.matchIds.filter((id: unknown) => typeof id === 'string'), payload: { timeLeft: duration }, endsAt: data.type === 'prestart_begin' ? now + 5000 : data.type === 'timer_start' ? now + duration * 1000 : undefined, breakEndsAt: data.type === 'timer_end' ? now + r.state.breakDuration * 1000 : undefined };
        messages.push(message('timer_sync', r.clock));
      } else if (typeof data?.type === 'string') messages.push({ ...message('audio_event', data), exceptSender: true });
      else return reject();
    } else if (event === 'music_command') {
      if (!isAdmin || data?.command !== 'snapshot') return reject(); r.music = data; messages.push({ ...message('music_sync', data), exceptSender: true });
    } else return reject();
    return { reply: { status: 'received' }, messages, persist: true };
  }
}

