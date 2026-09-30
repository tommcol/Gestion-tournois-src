import test from 'node:test';
import assert from 'node:assert/strict';
import { getPreviousSessionSnapshot } from '../utils/sessionSnapshot.ts';

test('le changement de session garde l’état précédent sous le numéro de la session terminée', () => {
  const previous = { currentSession: 3, scores: ['résultat papier déjà saisi'] };
  const next = { currentSession: 4, scores: previous.scores };
  const snapshot = getPreviousSessionSnapshot(previous, next);

  assert.equal(snapshot.sessionNumber, 3);
  assert.strictEqual(snapshot.state, previous);
  assert.deepEqual(snapshot.state.scores, ['résultat papier déjà saisi']);
});

test('aucune copie de session n’est créée si la session ne progresse pas', () => {
  assert.equal(getPreviousSessionSnapshot({ currentSession: 3 }, { currentSession: 3 }), null);
  assert.equal(getPreviousSessionSnapshot({ currentSession: 3 }, { currentSession: 2 }), null);
  assert.equal(getPreviousSessionSnapshot(null, { currentSession: 4 }), null);
});
