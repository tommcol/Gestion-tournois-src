import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyPairings, generateBracket, updateWinnerInFinals } from '../utils/finalPhaseLogic.ts';
import { finalPhaseReducer } from '../context/reducers/finalPhaseReducer.ts';

test('un tableau automatique à 4 équipes contient les demi-finales, la finale et la petite finale', () => {
  const bracket = generateBracket(createEmptyPairings(4, 'cat-a'), 'cat-a');
  assert.equal(bracket.filter(match => match.round === 'semiFinal').length, 2);
  assert.equal(bracket.filter(match => match.round === 'final').length, 1);
  assert.equal(bracket.filter(match => match.round === 'thirdPlace').length, 1);
});

test('un tableau à 8 équipes crée les quarts, les demi-finales, la finale et la petite finale', () => {
  const bracket = generateBracket(createEmptyPairings(8, 'cat-a'), 'cat-a');
  assert.equal(bracket.filter(match => match.round === 'quarterFinal').length, 4);
  assert.equal(bracket.filter(match => match.round === 'semiFinal').length, 2);
  assert.equal(bracket.filter(match => match.round === 'final').length, 1);
  assert.equal(bracket.filter(match => match.round === 'thirdPlace').length, 1);
});

test('les vainqueurs vont en finale et les perdants en petite finale', () => {
  const bracket = generateBracket(createEmptyPairings(4, 'cat-a'), 'cat-a');
  const semis = bracket.filter(match => match.round === 'semiFinal');
  const bracketWithResults = bracket.map(match => {
    if (match.id === semis[0].id) return { ...match, team1Id: 'a', team2Id: 'b', winnerId: 'a', status: 'finished' };
    if (match.id === semis[1].id) return { ...match, team1Id: 'c', team2Id: 'd', winnerId: 'c', status: 'finished' };
    return match;
  });

  const afterFirstSemi = updateWinnerInFinals(bracketWithResults, semis[0].id);
  const afterSecondSemi = updateWinnerInFinals(afterFirstSemi, semis[1].id);
  const final = afterSecondSemi.find(match => match.round === 'final');
  const thirdPlace = afterSecondSemi.find(match => match.round === 'thirdPlace');

  assert.deepEqual([final.team1Id, final.team2Id], ['a', 'c']);
  assert.deepEqual([thirdPlace.team1Id, thirdPlace.team2Id], ['b', 'd']);
});

test('le mode manuel prépare les tours suivants sans toucher aux autres catégories', () => {
  const otherCategoryMatches = [{ id: 'keep-this', categoryId: 'cat-b', round: 'semiFinal' }];
  const initialManualMatches = createEmptyPairings(4, 'cat-a');
  const nextState = finalPhaseReducer(
    { finalMatches: { 'cat-b': otherCategoryMatches } },
    { type: 'UPDATE_MANUAL_PAIRINGS', payload: { categoryId: 'cat-a', matches: initialManualMatches } }
  );

  assert.equal(nextState.finalMatches['cat-a'].filter(match => match.round === 'final').length, 1);
  assert.equal(nextState.finalMatches['cat-a'].filter(match => match.round === 'thirdPlace').length, 1);
  assert.strictEqual(nextState.finalMatches['cat-b'], otherCategoryMatches);
});
