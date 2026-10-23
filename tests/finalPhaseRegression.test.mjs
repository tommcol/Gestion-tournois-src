import test from 'node:test';
import assert from 'node:assert/strict';
import { initialData } from '../data/initialData.ts';
import { generateBracket, createEmptyPairings } from '../utils/finalPhaseLogic.ts';
import { finalPhaseReducer } from '../context/reducers/finalPhaseReducer.ts';
import { finalMatchStartIssue, beginFinalOvertime, overtimeResultValid } from '../utils/finalMatchSafety.ts';
import { receiveCourtScore } from '../utils/courtResults.ts';
import { diffState, applyStatePatch } from '../utils/statePatch.ts';
import { RoomEngine } from '../cloudflare/roomEngine.ts';

function fixture(size = 4) {
  const bracket = generateBracket(createEmptyPairings(size, 'c'), 'c');
  let n = 0;
  for (const m of bracket.filter(m => !m.sourceMatch1)) { m.team1Id = `t${n++}`; m.team2Id = `t${n++}`; m.court = 1; }
  return { ...structuredClone(initialData), numberOfCourts: 2, isFinalPhase: true, finalMatches: { c: bracket }, teams: Array.from({ length: size }, (_, i) => ({ id: `t${i}`, categoryId: 'c', name: `Test ${i}`, players: [] })) };
}
const score = (state, match, score1 = 12, score2 = 8) => finalPhaseReducer(state, { type: 'UPDATE_FINAL_MATCH_SCORE', payload: { categoryId: 'c', matchId: match.id, score1, score2 } });
const ready = (state, m, isReady = true) => finalPhaseReducer(state, { type: 'SET_FINAL_MATCH_READY', payload: { categoryId: m.categoryId, matchId: m.id, isReady } });

test('8 équipes : les mises à jour partielles conduisent des quarts aux deux finales, sans modifier les anciennes données', () => {
  let state = fixture(8), replica = structuredClone(state);
  const original = structuredClone(state), firstState = state;
  for (const round of ['quarterFinal', 'semiFinal', 'thirdPlace', 'final']) {
    for (const m of state.finalMatches.c.filter(m => m.round === round)) {
      assert.ok(m.team1Id && m.team2Id);
      const before = structuredClone(state), next = score(state, m);
      assert.deepEqual(state, before);
      replica = applyStatePatch(replica, diffState(state, next));
      assert.deepEqual(replica, next);
      state = next;
    }
  }
  assert.deepEqual(firstState, original);
  assert.equal(state.finalMatches.c.filter(m => m.status === 'finished').length, 8);
  assert.ok(state.finalMatches.c.find(m => m.round === 'thirdPlace').winnerId);
});

test('Cloudflare transmet immédiatement les finalistes et les perdants aux clients PC/tablette/TV', () => {
  const room = RoomEngine.create(fixture()); let replica = structuredClone(room.record.state);
  for (const semi of room.record.state.finalMatches.c.filter(m => m.round === 'semiFinal')) {
    const result = room.handle({ role: 'admin' }, 'tournament_action', { id: semi.id, action: { type: 'UPDATE_FINAL_MATCH_SCORE', payload: { categoryId: 'c', matchId: semi.id, score1: 4, score2: 2 } } });
    for (const m of result.messages.filter(m => m.event === 'state_patch')) replica = applyStatePatch(replica, m.args[0].patches);
    assert.deepEqual(replica, room.record.state);
  }
  for (const round of ['final', 'thirdPlace']) assert.ok(replica.finalMatches.c.find(m => m.round === round).team2Id);
});

test('un seul match actif par terrain, toutes catégories confondues ; les autres terrains restent utilisables', () => {
  let state = fixture(); const [a, b] = state.finalMatches.c;
  state = ready(state, a); assert.equal(state.finalMatches.c[0].isReady, true);
  assert.match(finalMatchStartIssue(state, b), /terrain 1/);
  assert.equal(ready(state, b), state);
  state = { ...state, finalMatches: { ...state.finalMatches, other: [{ ...b, id: 'other', categoryId: 'other' }] } };
  assert.equal(ready(state, state.finalMatches.other[0]), state);
  const moved = finalPhaseReducer(state, { type: 'UPDATE_FINAL_MATCH_COURT', payload: { categoryId: 'c', matchId: a.id, court: 2 } });
  assert.equal(moved, state);
  state = finalPhaseReducer(state, { type: 'UPDATE_FINAL_MATCH_COURT', payload: { categoryId: 'c', matchId: b.id, court: 2 } });
  assert.equal(ready(state, state.finalMatches.c[1]).finalMatches.c[1].isReady, true);
  state = score(state, a);
  assert.equal(ready(state, state.finalMatches.other[0]).finalMatches.other[0].isReady, true);
});

test('une équipe déjà active ne peut pas jouer un deuxième match sur un autre terrain', () => {
  let state = fixture(); const a = state.finalMatches.c[0]; state = ready(state, a);
  const duplicate = { ...state.finalMatches.c[1], court: 2, team1Id: a.team1Id };
  assert.match(finalMatchStartIssue(state, duplicate), /équipe/);
});

test('deux demandes simultanées : le serveur refuse la seconde avec une explication', () => {
  const room = RoomEngine.create(fixture()); const [a, b] = room.record.state.finalMatches.c;
  const start = m => room.handle({ role: 'admin' }, 'tournament_action', { id: m.id, action: { type: 'SET_FINAL_MATCH_READY', payload: { categoryId: 'c', matchId: m.id, isReady: true } } });
  assert.equal(start(a).reply.status, 'received');
  assert.match(start(b).reply.error, /terrain 1/);
  assert.equal(room.record.state.finalMatches.c[1].isReady, false);
});

test('prolongation : deux points pendant la prolongation, même avec seulement un point d’écart', () => {
  let state = fixture(); const m = state.finalMatches.c[0]; state = ready(state, m);
  const start = { categoryId: 'c', matchId: m.id, court: 1, score1: 9, score2: 9 };
  state = beginFinalOvertime(state, start); assert.ok(state);
  assert.equal(beginFinalOvertime(state, { ...start, score1: 10, score2: 10 }), state);
  const submission = { id: 'ot', categoryId: 'c', matchId: m.id, court: 1, score1: 10, score2: 9 };
  assert.equal(receiveCourtScore(state, submission).status, 'overtime');
  const finished = receiveCourtScore(state, { ...submission, score1: 11, score2: 10 });
  assert.equal(finished.status, 'received'); assert.equal(finished.state.finalMatches.c[0].winnerId, m.team1Id);
  assert.equal(overtimeResultValid(9, 10, 11), true);
  assert.equal(overtimeResultValid(9, 8, 11), false);
  assert.equal(overtimeResultValid(undefined, 11, 9), false);
});

test('prolongation Cloudflare durable : un point refusé, deux points acceptés après restauration', () => {
  let state = fixture(); const m = state.finalMatches.c[0]; state = ready(state, m);
  const room = RoomEngine.create(state), principal = { role: 'court', court: 1 };
  const data = { id: 'ot', categoryId: 'c', matchId: m.id, court: 1, score1: 9, score2: 9 };
  assert.equal(room.handle(principal, 'court_overtime', { ...data, score1: 10 }).reply.status, 'rejected');
  assert.equal(room.handle(principal, 'court_overtime', data).reply.status, 'received');
  const restored = new RoomEngine(JSON.parse(JSON.stringify(room.record)));
  assert.equal(restored.handle(principal, 'court_submit', { ...data, score1: 10 }).reply.status, 'overtime');
  assert.equal(restored.handle(principal, 'court_submit', { ...data, score1: 11, score2: 10 }).reply.status, 'received');
});
