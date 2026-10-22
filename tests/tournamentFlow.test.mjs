import test from 'node:test';
import assert from 'node:assert/strict';
import { initialData } from '../data/initialData.ts';
import { sessionCanCollapse, currentFinalMatches, tvMoment, tvSettings, tvSessions } from '../utils/tournamentFlow.ts';
import { receiveCourtScore } from '../utils/courtResults.ts';
import { finalPhaseReducer } from '../context/reducers/finalPhaseReducer.ts';
import { poolMatchReducer } from '../context/reducers/poolMatchReducer.ts';
import { sessionReducer } from '../context/reducers/sessionReducer.ts';

const pool = { id: 'm1', team1Id: 'a', team2Id: 'b', poolId: 'cat-pool', round: 'Pool', court: 1, sessionNumber: 1, score1: null, score2: null, status: 'pending', refereeId: null, scorerId: null };
const final = { ...pool, id: 'f1', categoryId: 'cat', round: 'semiFinal', matchNumber: 1, isReady: true };
const fixture = () => ({ ...structuredClone(initialData), teams: [{ id: 'a', name: 'A', categoryId: 'cat', players: [] }, { id: 'b', name: 'B', categoryId: 'cat', players: [] }], pools: [{ id: 'cat-pool', teams: ['a', 'b'] }], categories: [], matches: [{ ...pool }], finalMatches: { cat: [{ ...final }] }, currentSession: 1, isTournamentStarted: true, isFinalPhase: false, isPoolStageFinished: false });
const draft = () => ({ id: 'receipt1', matchId: 'm1', court: 1, score1: 12, score2: 8, fouls1: 4, fouls2: 9, team1Name: 'A', team2Name: 'B' });
const timer = (type, session = 1) => ({ type, session, finals: false, matchIds: ['m1'] });

test('une session papier reste ouverte jusqu’au dernier score, 0–0 compris', () => {
  assert.equal(sessionCanCollapse([pool, { ...pool, id: 'm2', status: 'finished', score1: 0, score2: 0 }]), false);
  assert.equal(sessionCanCollapse([{ ...pool, status: 'finished', score1: 0, score2: 0 }]), true);
  assert.equal(sessionCanCollapse([{ ...pool, status: 'finished', score1: null, score2: null }]), false);
  assert.equal(sessionCanCollapse([]), false);
});

test('la TV suit toute la journée sans afficher une session inexistante', () => {
  const state = fixture(); state.matches.push({ ...pool, id: 'm2', sessionNumber: 2 });
  assert.equal(tvMoment({ ...state, isTournamentStarted: false }, null), 'welcome');
  assert.equal(tvMoment(state, null), 'beforeFirst');
  assert.equal(tvSessions(state, null).next, 1);
  assert.equal(tvSessions(state, timer('timer_start')).next, 2);
  assert.equal(tvSessions(state, timer('timer_pause')).next, 2);
  assert.equal(tvSessions(state, timer('timer_end')).next, 2);
  assert.equal(tvSessions({ ...state, currentSession: 2 }, timer('timer_end', 1)).next, 2);
  const last = { ...state, currentSession: 2 };
  assert.equal(tvMoment(last, timer('timer_start', 2)), 'lastSession');
  assert.equal(tvSettings(last, 'lastSession').showNextMatches, false);
  assert.equal(tvMoment(last, timer('timer_end', 2)), 'poolsOver');
  assert.equal(tvSessions(last, timer('timer_end', 2)).results, 2);
  assert.equal(tvSettings(last, 'poolsOver').showSponsors, false);
});

test('créer les tableaux ne bascule pas la TV ; chaque moment garde ses options', () => {
  const state = fixture();
  assert.notEqual(tvMoment(state, timer('timer_end')), 'finals');
  state.tvMoments = { playing: { ...tvSettings(state, 'playing'), showSponsors: false, showStartSponsor: true } };
  assert.equal(tvSettings(state, 'playing').showSponsors, false);
  assert.equal(tvSettings(state, 'playing').showStartSponsor, true);
  assert.equal(tvSettings({ ...state, tvConfig: { ...state.tvConfig, showSponsors: false } }, 'playing').showStartSponsor, false);
  assert.equal(tvMoment({ ...state, isFinalPhase: true }, null), 'finals');
});

test('la TV attend tous les scores du tour de chaque catégorie', () => {
  const played = { ...final, status: 'finished', score1: 10, score2: 6 };
  const otherSemi = { ...final, id: 'f2', matchNumber: 2 };
  const championship = { ...final, id: 'f3', round: 'final' };
  const third = { ...final, id: 'f4', round: 'thirdPlace' };
  assert.deepEqual(currentFinalMatches([played, otherSemi, championship, third]).map(m => m.id), ['f1', 'f2']);
  assert.deepEqual(currentFinalMatches([played, { ...otherSemi, status: 'finished', score1: 8, score2: 5 }, championship, third]).map(m => m.id), ['f3', 'f4']);
  assert.equal(currentFinalMatches([{ ...played, score1: 6, score2: 6 }, championship])[0].round, 'semiFinal');
});

test('relancer l’affichage des finales conserve résultats, terrains et session en cours', () => {
  const state = fixture(); state.isFinalPhase = true; state.currentSession = 3;
  state.finalMatches.cat[0] = { ...final, status: 'finished', score1: 15, score2: 9, winnerId: 'a', court: 2, sessionNumber: 3 };
  const next = sessionReducer(state, { type: 'START_FINAL_PHASE' });
  assert.deepEqual(next.finalMatches, state.finalMatches);
  assert.equal(next.currentSession, 3);
});

test('les égalités de finale et scores impossibles ne désignent jamais un vainqueur', () => {
  const state = fixture();
  for (const [score1, score2] of [[5, 5], [-1, 2], [NaN, 2], [1.5, 2]]) {
    assert.strictEqual(finalPhaseReducer(state, { type: 'UPDATE_FINAL_MATCH_SCORE', payload: { categoryId: 'cat', matchId: 'f1', score1, score2 } }), state);
  }
  assert.strictEqual(poolMatchReducer(state, { type: 'UPDATE_MATCH_SCORE', payload: { matchId: 'm1', score1: -1, score2: 2 } }), state);
});

test('un score tablette met à jour le classement et un renvoi identique est sans effet', () => {
  const result = receiveCourtScore(fixture(), draft());
  assert.equal(result.status, 'received');
  assert.equal(result.state.matches[0].status, 'finished');
  assert.equal(result.state.standings['cat-pool'].find(s => s.teamId === 'a').wins, 1);
  assert.strictEqual(receiveCourtScore(result.state, draft()).state, result.state);
});

test('un score tardif différent attend le choix de l’organisateur', () => {
  const state = fixture(); state.matches[0] = { ...pool, status: 'finished', score1: 20, score2: 10 };
  const conflict = receiveCourtScore(state, draft());
  assert.equal(conflict.status, 'conflict');
  assert.equal(conflict.state.matches[0].score1, 20);
  const duplicate = receiveCourtScore(conflict.state, draft());
  assert.equal(duplicate.state.courtConflicts.length, 1);
  const chosen = receiveCourtScore(duplicate.state, draft(), true);
  assert.equal(chosen.state.matches[0].score1, 12);
});

test('la correction des poules ne recrée pas un tableau final déjà organisé', () => {
  const state = fixture();
  const next = poolMatchReducer(state, { type: 'UPDATE_MATCH_SCORE', payload: { matchId: 'm1', score1: 10, score2: 8 } });
  assert.strictEqual(next.finalMatches, state.finalMatches);
});

// Un tableau ajouté pendant les finales reçoit un créneau sans déplacer les résultats existants.
test('les nouveaux matchs sont planifiés sans déplacer un match déjà joué', () => {
  const state = fixture(); state.numberOfCourts = 2;
  state.finalMatches.cat[0] = { ...final, status: 'finished', score1: 15, score2: 9, sessionNumber: 1, court: 1 };
  state.finalMatches.cat.push({ ...final, id: 'new-match', court: undefined, sessionNumber: undefined });
  const next = sessionReducer(state, { type: 'START_FINAL_PHASE' });
  assert.deepEqual(next.finalMatches.cat[0], state.finalMatches.cat[0]);
  assert.equal(next.finalMatches.cat[1].sessionNumber, 1);
  assert.equal(next.finalMatches.cat[1].court, 2);
});
