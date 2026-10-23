import { overtimeResultValid } from './finalMatchSafety';
import { CourtSubmission, TournamentState } from '../types';
import { validScore } from './tournamentFlow';
import { finalPhaseReducer } from '../context/reducers/finalPhaseReducer';
import { poolMatchReducer } from '../context/reducers/poolMatchReducer';

export function receiveCourtScore(state: TournamentState, submission: CourtSubmission, force = false) {
  const match = submission.categoryId ? state.finalMatches[submission.categoryId]?.find(m => m.id === submission.matchId) : state.matches.find(m => m.id === submission.matchId);
  if (!match || !match.team1Id || !match.team2Id || match.court !== submission.court || !submission.id || !validScore(submission.score1, submission.score2)) return { state, status: 'rejected' as const };
  if (submission.categoryId && submission.score1 === submission.score2) return { state, status: 'tie' as const };
  if (!force && match.status === 'finished') {
    if (match.score1 === submission.score1 && match.score2 === submission.score2) return { state, status: 'received' as const };
    const conflicts = state.courtConflicts || [];
    return { state: { ...state, courtConflicts: conflicts.some(c => c.id === submission.id) ? conflicts : [...conflicts, { id: submission.id, submission, score1: match.score1!, score2: match.score2! }] }, status: 'conflict' as const };
  }
  if (submission.categoryId && 'isOvertime' in match && match.isOvertime && !overtimeResultValid(match.overtimeStartScore, submission.score1, submission.score2)) return { state, status: 'overtime' as const };
  const next = submission.categoryId
    ? finalPhaseReducer(state, { type: 'UPDATE_FINAL_MATCH_SCORE', payload: { categoryId: submission.categoryId, matchId: submission.matchId, score1: submission.score1, score2: submission.score2 } })
    : poolMatchReducer(state, { type: 'UPDATE_MATCH_SCORE', payload: { matchId: submission.matchId, score1: submission.score1, score2: submission.score2 } });
  return { state: next, status: 'received' as const };
}
