import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { createRouteDocument, createMatchDocument, createCalendarDocument, roadmapExportRows, samePaperMatches, PAPER } from '../utils/paperDocuments.ts';
import { getStartingBonus } from '../utils/startingBonus.ts';
import { MatchPaperCard, PaperPages } from '../components/PaperPages.tsx';
import { createTournamentStore, TournamentStateScope, useTournamentSelector, useTournamentStateReader } from '../context/TournamentStore.tsx';
import { initialData } from '../data/initialData.ts';
import { tournamentReducer } from '../context/tournamentReducer.ts';
const h = React.createElement;
function fixture(referee = false, scorer = false, count = 12, sessions = 4) {
  const category = { ...structuredClone(initialData.categories[0]), id: 'c', name: 'Catégorie test', isRefereeMandatory: referee, isScorerMandatory: scorer };
  const teams = Array.from({ length: count }, (_, i) => ({ id: `t${i}`, categoryId: 'c', name: `Équipe ${i}`, womenCount: i % 3, isMix: false, poolId: 'c-p', players: [{ id: `p${i}`, firstName: `Prénom ${i}`, lastName: 'Nom', gender: i % 2 ? 'Femme' : 'Homme', roles: ['Joueur', 'Arbitre', 'Marqueur'] }] }));
  const matches = Array.from({ length: sessions }, (_, session) => Array.from({ length: count / 2 }, (_, court) => ({ id: `m${session}-${court}`, team1Id: `t${court * 2}`, team2Id: `t${court * 2 + 1}`, sessionNumber: session + 1, court: court + 1, round: 'Pool', poolId: 'c-p', refereeId: `p${(court * 2 + 2) % count}`, scorerId: `p${(court * 2 + 3) % count}`, status: 'pending', score1: null, score2: null }))).flat();
  return { ...structuredClone(initialData), categories: [category], teams, pools: [{ id: 'c-p', teams: teams.map(team => team.id) }], matches };
}
const everyCard = paper => paper.pages.flatMap(page => page.cards);

test('feuilles de route : colonnes uniformes selon les quatre configurations de catégorie', () => {
  for (const [referee, scorer] of [[false, false], [true, false], [false, true], [true, true]]) {
    const data = fixture(referee, scorer), paper = createRouteDocument(data, 'c', data.teams.map(team => team.id));
    assert.equal(paper.itemCount, 12); assert.ok(paper.pages.length < 12);
    for (const card of everyCard(paper)) { assert.equal(card.referee, referee); assert.equal(card.scorer, scorer); assert.equal(card.rows.length, 4); }
    const rows = roadmapExportRows(paper), headings = rows.filter(row => row[0] === 'Session');
    assert.equal(headings.length, 12);
    for (const row of headings) assert.deepEqual(row, ['Session', 'Match', 'Terrain', ...(referee ? ['Arbitrage'] : []), ...(scorer ? ['Marque'] : [])]);
  }
});

test('économie de papier : douze petites feuilles sans officiels tiennent sur une feuille A4', () => {
  const data = fixture(), paper = createRouteDocument(data, 'c', data.teams.map(team => team.id));
  assert.equal(paper.pages.length, 1); assert.equal(paper.pages[0].columns, 6); assert.equal(paper.pages[0].cards.length, 12);
});

test('réimpression : seules les équipes cochées de la bonne catégorie sont préparées', () => {
  const data = fixture(); data.teams.push({ ...data.teams[0], id: 'other', categoryId: 'other' });
  const paper = createRouteDocument(data, 'c', ['t2', 't6', 'other', 'deleted']);
  assert.equal(paper.itemCount, 2); assert.deepEqual(everyCard(paper).map(card => card.teamId), ['t2', 't6']);
  assert.equal(createRouteDocument(data, 'c', []).pages.length, 0);
});

test('toutes les missions d’une équipe sont conservées, y compris dans une autre catégorie', () => {
  const data = fixture(true, true), owner = data.teams[0];
  owner.players.push({ ...owner.players[0], id: 'second', firstName: 'Deuxième' });
  data.matches.push({ ...data.matches[0], id: 'mission1', team1Id: 't8', team2Id: 't9', court: 6, poolId: 'other-p', refereeId: 'p0', scorerId: 'second' });
  data.matches.push({ ...data.matches[0], id: 'mission2', team1Id: 't8', team2Id: 't9', court: 7, refereeId: 'second', scorerId: 'p0' });
  const card = everyCard(createRouteDocument(data, 'c', ['t0']))[0];
  assert.match(card.rows[0].referee, /Prénom 0 Nom\nTerrain 6/); assert.match(card.rows[0].referee, /Deuxième Nom\nTerrain 7/);
  assert.match(card.rows[0].scorer, /Deuxième Nom\nTerrain 6/); assert.match(card.rows[0].scorer, /Prénom 0 Nom\nTerrain 7/);
});

test('planning long : suites numérotées, noms complets et aucun bloc plus haut que la page', () => {
  const data = fixture(true, true, 12, 45); data.teams[0].name = 'Une équipe avec un nom exceptionnellement long conservé en entier';
  const paper = createRouteDocument(data, 'c', data.teams.map(team => team.id));
  const cards = everyCard(paper), first = cards.filter(card => card.teamId === 't0');
  assert.ok(first.length > 1); assert.equal(first.flatMap(card => card.rows).length, 45); assert.ok(first.every(card => card.teamName === data.teams[0].name));
  first.forEach((card, index) => { assert.equal(card.part, index + 1); assert.equal(card.parts, first.length); });
  for (const page of paper.pages) {
    let height = 0;
    for (let i = 0; i < page.cards.length; i += page.columns) height += Math.max(...page.cards.slice(i, i + page.columns).map(card => card.height)) + (i ? PAPER.gap : 0);
    assert.ok(height <= PAPER.bodyHeight + .01);
  }
});

test('bonus : zéro, une et plusieurs joueuses ; anciennes équipes et compte explicite prioritaire', () => {
  const team = fixture().teams[0];
  for (const [womenCount, bonus] of [[0, 0], [1, 1], [2, 2], [5, 2]]) assert.equal(getStartingBonus({ ...team, womenCount }), bonus);
  assert.equal(getStartingBonus({ ...team, womenCount: undefined, players: [{ gender: 'Femme' }, { gender: 'Femme' }] }), 2);
  assert.equal(getStartingBonus({ ...team, womenCount: 0, players: [{ gender: 'Femme' }] }), 0);
  assert.equal(getStartingBonus(undefined), 0);
});

test('cases déjà cochées : vraies croix SVG noires et points de départ visibles', () => {
  const data = fixture(), card = everyCard(createMatchDocument(data, 'session', 1, 6))[1];
  assert.equal(card.bonus1, 2); assert.equal(card.bonus2, 0);
  let view; act(() => { view = TestRenderer.create(h(MatchPaperCard, { card })); });
  assert.equal(view.root.findAllByType('svg').length, 2);
  assert.ok(view.root.findAllByType('path').every(path => path.props.stroke === 'black'));
  assert.equal(view.root.findAllByType('span').filter(node => node.props['aria-label']?.includes('déjà coché')).length, 2);
  assert.match(JSON.stringify(view.toJSON()), /Départ/); act(() => view.unmount());
});

test('feuilles de match : toutes catégories par session/terrain et maximum 4 matchs par page, même pour un ancien appel à 6', () => {
  const data = fixture(); data.categories.push({ ...data.categories[0], id: 'other', name: 'Autre' }); data.teams[0].categoryId = 'other';
  const session = createMatchDocument(data, 'session', 1, 6); assert.equal(session.pages.length, 2); assert.ok(session.pages.every(page => page.cards.length <= 4)); assert.equal(session.itemCount, 6); assert.equal(everyCard(session)[0].category, 'Autre');
  assert.equal(createMatchDocument(data, 'session', 1, 4).pages.length, 2);
  const court = createMatchDocument(data, 'terrain', 2, 6); assert.deepEqual(everyCard(court).map(card => card.session), [1, 2, 3, 4]);
  assert.equal(createMatchDocument(data, 'session', 999, 6).pages.length, 0);
});

test('aperçu : le nombre de pages affichées correspond au document préparé', () => {
  const data = fixture(true, true, 12, 30), paper = createRouteDocument(data, 'c', data.teams.map(team => team.id)); let view;
  act(() => { view = TestRenderer.create(h(PaperPages, { paper })); });
  assert.equal(view.root.findAllByType('article').length, paper.pages.length);
  assert.equal(view.root.findAllByType('section').length, everyCard(paper).length);
  assert.doesNotMatch(JSON.stringify(view.toJSON()), /T\.A|T\.M|T\.Ma/); act(() => view.unmount());
});

test('un score officiel ne réveille pas le planning papier ; une lecture ponctuelle voit le score récent', () => {
  const data = fixture(), store = createTournamentStore(data); let renders = 0, read, view;
  function Subscriber() { renders++; useTournamentSelector(state => state.matches, samePaperMatches); read = useTournamentStateReader(); return null; }
  act(() => { view = TestRenderer.create(h(TournamentStateScope, { store }, h(Subscriber))); });
  act(() => { store.setState(tournamentReducer(store.getState(), { type: 'UPDATE_MATCH_SCORE', payload: { matchId: 'm0-0', score1: 12, score2: 8 } })); });
  assert.equal(renders, 1); assert.equal(read().matches[0].score1, 12);
  const calendar = createCalendarDocument(read(), 'c'); assert.equal(everyCard(calendar)[0].rows[0].score, '12 – 8');
  act(() => { store.setState({ ...store.getState(), matches: store.getState().matches.map((match, index) => index === 0 ? { ...match, court: 5 } : match) }); }); assert.equal(renders, 2); act(() => view.unmount());
});

test('les styles d’impression sont limités à l’aperçu papier et ne masquent pas les autres vues', () => {
  const css = readFileSync(new URL('../components/paperPrint.css', import.meta.url), 'utf8');
  assert.match(css, /body\.tournament-paper-mode > \*/);
  assert.doesNotMatch(css, /(?:^|\n)\s*body > \*/);
  assert.match(css, /@page tournamentPaper/);
  assert.match(css, /page: tournamentPaper/);
});

test('économie de papier : ne pas ajouter les sessions d’une autre catégorie sans mission', () => {
  const data = fixture(true, true);
  data.matches.push({ ...data.matches[0], id: 'other-late', team1Id: 'other1', team2Id: 'other2', poolId: 'other-p', sessionNumber: 40, refereeId: null, scorerId: null });
  let paper = createRouteDocument(data, 'c', ['t0']); assert.equal(everyCard(paper)[0].rows.length, 4);
  data.matches.push({ ...data.matches.at(-1), id: 'mission-late', sessionNumber: 8, refereeId: 'p0' });
  paper = createRouteDocument(data, 'c', ['t0']); assert.equal(everyCard(paper).flatMap(card => card.rows).at(-1).session, 8);
});
