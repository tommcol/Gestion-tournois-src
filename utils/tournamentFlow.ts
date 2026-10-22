import { FinalMatch, Match, TournamentState, TVMoment, TVMomentConfig } from '../types';

// Toujours lire l’heure actuelle au rendu : une ancienne valeur React peut afficher 6 au lieu de 5 au départ.
export const remainingSeconds = (endsAt: number, now = Date.now()) => Math.max(0, Math.ceil((endsAt - now) / 1000));

export const validScore = (a: unknown, b: unknown) => Number.isInteger(a) && Number.isInteger(b) && Number(a) >= 0 && Number(b) >= 0;
export const completeMatch = (m: Match | FinalMatch) => m.status === 'finished' && validScore(m.score1, m.score2) && (!('categoryId' in m) || !!m.isForfeit || m.score1 !== m.score2);
export const sessionCanCollapse = (matches: Match[]) => matches.length > 0 && matches.every(completeMatch);
export const FINAL_LEVELS: FinalMatch['round'][][] = [['roundOf32'], ['roundOf16'], ['quarterFinal'], ['semiFinal'], ['thirdPlace', 'final']];
export function currentFinalMatches(matches: FinalMatch[]): FinalMatch[] {
  const levels = FINAL_LEVELS.map(rounds => matches.filter(m => rounds.includes(m.round))).filter(ms => ms.length);
  return levels.find(ms => !ms.every(completeMatch)) || levels[levels.length - 1] || [];
}

export interface ClockSnapshot {
  type: string; payload?: { timeLeft?: number }; session: number; finals: boolean;
  endsAt?: number; breakEndsAt?: number; matchIds: string[];
}
export function tvMoment(state: TournamentState, clock: ClockSnapshot | null): TVMoment {
  if (!state.isTournamentStarted) return 'welcome';
  if (state.isFinalPhase) return 'finals';
  const last = Math.max(1, ...state.matches.map(m => m.sessionNumber || 0));
  const relevant = clock?.session === state.currentSession && !clock.finals;
  if (state.isPoolStageFinished || (relevant && clock.type === 'timer_end' && state.currentSession >= last)) return 'poolsOver';
  if (!relevant || clock.type === 'timer_reset') return state.currentSession === 1 ? 'beforeFirst' : 'break';
  if (clock.type === 'timer_end') return 'break';
  return state.currentSession >= last ? 'lastSession' : 'playing';
}
export function tvSettings(state: TournamentState, moment: TVMoment): TVMomentConfig {
  const defaults = { ...state.tvConfig, showStartSponsor: state.tvConfig.showSponsors };
  if (moment === 'welcome') Object.assign(defaults, { showNextMatches: false, showResults: false, showStandings: false });
  if (moment === 'beforeFirst') Object.assign(defaults, { showResults: false, showStandings: false });
  if (moment === 'lastSession' || moment === 'poolsOver') defaults.showNextMatches = false;
  if (moment === 'poolsOver') Object.assign(defaults, { showSponsors: false, showChronoOnTv: false, showLiveScores: false });
  const result = { ...defaults, ...state.tvMoments?.[moment] };
  // Le bouton général reste prioritaire pour couper les sponsors à tout moment.
  result.showSponsors = !!state.tvConfig.showSponsors && result.showSponsors;
  result.showStartSponsor = !!state.tvConfig.showSponsors && result.showStartSponsor;
  return result;
}
export function tvSessions(state: TournamentState, clock: ClockSnapshot | null) {
  const moment = tvMoment(state, clock);
  const launched = clock?.session === state.currentSession && !clock.finals && ['timer_start', 'timer_tick', 'timer_pause', 'timer_end'].includes(clock.type);
  const next = state.currentSession + (launched ? 1 : 0);
  return { next, results: moment === 'poolsOver' ? Math.max(1, ...state.matches.map(m => m.sessionNumber || 0)) : state.currentSession - 1 };
}
