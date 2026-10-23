import { FinalMatch, TournamentState } from '../types';
import { validScore } from './tournamentFlow';

export function finalMatchStartIssue(state: TournamentState, match: FinalMatch): string | null {
  if (match.status === 'finished') return 'Ce match est déjà terminé.';
  if (!match.team1Id || !match.team2Id || match.team1Id === match.team2Id) return 'Il faut deux équipes différentes pour démarrer ce match.';
  if (!Number.isInteger(match.court) || match.court! < 1 || match.court! > state.numberOfCourts) return 'Choisissez un terrain valide avant de démarrer.';
  const active = Object.values(state.finalMatches).flat().filter(m => m.id !== match.id && m.isReady && m.status !== 'finished');
  if (active.some(m => m.court === match.court)) return `Le terrain ${match.court} a déjà un match actif. Terminez-le ou arrêtez-le avant de démarrer celui-ci.`;
  if (active.some(m => [m.team1Id, m.team2Id].some(id => id === match.team1Id || id === match.team2Id))) return 'Une de ces équipes a déjà un match actif.';
  const playerIds = (m: FinalMatch) => state.teams.filter(t => t.id === m.team1Id || t.id === m.team2Id).flatMap(t => t.players.map(p => p.id));
  const officials = (m: FinalMatch) => [m.refereeId,m.scorerId].filter((id): id is string => !!id && id !== 'Staff');
  const ownOfficials = officials(match), ownPlayers = playerIds(match);
  if (ownOfficials.some(id => ownPlayers.includes(id)) || ownOfficials.length !== new Set(ownOfficials).size) return 'Un officiel ne peut pas jouer ce match ou tenir deux rôles en même temps.';
  if (active.some(m => officials(m).some(id => ownOfficials.includes(id) || ownPlayers.includes(id)) || playerIds(m).some(id => ownOfficials.includes(id)))) return 'Un joueur ou un officiel de ce match est déjà occupé sur un autre terrain.';
  return null;
}

export function overtimeResultValid(startScore: number | undefined, score1: number, score2: number): boolean {
  return Number.isInteger(startScore) && startScore! >= 0 && validScore(score1, score2)
    && score1 >= startScore! && score2 >= startScore! && score1 !== score2
    && Math.max(score1, score2) - startScore! >= 2;
}

// Le score égal au début de la prolongation est conservé côté serveur.
// Un renvoi après reconnexion ne peut pas déplacer ce point de départ.
export function beginFinalOvertime(state: TournamentState, data: { categoryId: string; matchId: string; court: number; score1: number; score2: number }): TournamentState | null {
  const match = state.finalMatches[data.categoryId]?.find(m => m.id === data.matchId);
  if (!match || match.status === 'finished' || !match.isReady || match.court !== data.court) return null;
  if (match.isOvertime && match.overtimeStartScore !== undefined) return state;
  if (!validScore(data.score1, data.score2) || data.score1 !== data.score2) return null;
  return { ...state, finalMatches: { ...state.finalMatches, [data.categoryId]: state.finalMatches[data.categoryId].map(m => m.id === match.id ? { ...m, isOvertime: true, overtimeStartScore: data.score1 } : m) } };
}

