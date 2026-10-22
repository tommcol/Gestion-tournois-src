import { EventEmitter } from 'node:events';
import { subscribeCourtReadiness } from '../utils/socketSubscriptions.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { createTournamentStore, TournamentStateScope, useTournamentFields, useTournamentSelector } from '../context/TournamentStore.tsx';
import { PoolStandingCard } from '../components/StandingsDisplay.tsx';
import TVStandings from '../components/TVStandings.tsx';
import LiveScoreTicker from '../components/LiveScoreTicker.tsx';
import ScheduleMatchRow from '../components/ScheduleMatchRow.tsx';
import { createLiveScoreStore } from '../utils/liveScores.ts';
import { tournamentReducer } from '../context/tournamentReducer.ts';
import { initialData } from '../data/initialData.ts';
import { calculateAllStandings } from '../utils/standingsLogic.ts';
const h = React.createElement;
function fixture() {
  const teams = Array.from({ length: 10 }, (_, i) => ({ id: `t${i}`, name: `Équipe ${i}`, categoryId: 'c', players: [] }));
  const pools = Array.from({ length: 5 }, (_, i) => ({ id: `c-p${i}`, name: `Poule ${i}`, teams: teams.slice(i * 2, i * 2 + 2).map(t => t.id) }));
  const matches = pools.map((p, i) => ({ id: `m${i}`, poolId: p.id, round: 'Pool', sessionNumber: 1, court: i + 1, team1Id: p.teams[0], team2Id: p.teams[1], status: 'pending', score1: null, score2: null }));
  return { ...structuredClone(initialData), categories: [{ ...initialData.categories[0], id: 'c', name: 'Test' }], teams, pools, matches, standings: calculateAllStandings(pools, matches) };
}
const finalize = (state, matchId) => tournamentReducer(state, { type: 'UPDATE_MATCH_SCORE', payload: { matchId, score1: 12, score2: 8 } });

test('score officiel : seul le classement de la poule touchée se redessine, la saisie reste en place', () => {
  const initial = fixture(), store = createTournamentStore(initial); let rootRenders = 0, headerRenders = 0, musicRenders = 0;
  function Header() { headerRenders++; const { tournamentName } = useTournamentFields('tournamentName'); return h('h1', null, tournamentName); }
  function Music() { musicRenders++; const playlist = useTournamentSelector(s => s.playlist); return h('span', null, `Musiques : ${playlist.length}`); }
  function Scenario() {
    rootRenders++; const [draft, setDraft] = React.useState('17');
    return h(React.Fragment, null, h(Header), h(Music), h('input', { value: draft, onChange: e => setDraft(e.target.value) }),
      ...initial.pools.map((pool, index) => h(PoolStandingCard, { key: pool.id, pool, index, swiss: false, getTeamName: id => id })));
  }
  let view; act(() => { view = TestRenderer.create(h(TournamentStateScope, { store }, h(Scenario))); });
  act(() => { view.root.findByType('input').props.onChange({ target: { value: '23' } }); });
  const before = view.root.findAllByType('table').map(table => table.props), counts = [rootRenders, headerRenders, musicRenders];
  act(() => { store.setState(finalize(store.getState(), 'm0')); });
  const after = view.root.findAllByType('table').map(table => table.props);
  assert.notEqual(after[0], before[0]); for (let n = 1; n < 5; n++) assert.equal(after[n], before[n]);
  assert.equal(view.root.findByType('input').props.value, '23'); assert.deepEqual([rootRenders, headerRenders, musicRenders], counts);
  assert.equal(store.getState().standings['c-p0'][0].played, 1); act(() => view.unmount());
});

test('TV : le classement hors écran attend sa page, les tables inchangées restent intactes', () => {
  const initial = fixture(), store = createTournamentStore(initial); let view;
  act(() => { view = TestRenderer.create(h(TournamentStateScope, { store }, h(TVStandings, { pageIndex: 0 }))); });
  const before = view.root.findAllByType('table').map(table => table.props); assert.equal(before.length, 4);
  act(() => { store.setState(finalize(store.getState(), 'm4')); });
  assert.deepEqual(view.root.findAllByType('table').map(table => table.props), before);
  for (let n = 0; n < 4; n++) assert.equal(view.root.findAllByType('table')[n].props, before[n]);
  act(() => { store.setState(finalize(store.getState(), 'm0')); });
  assert.notEqual(view.root.findAllByType('table')[0].props, before[0]);
  for (let n = 1; n < 4; n++) assert.equal(view.root.findAllByType('table')[n].props, before[n]);
  act(() => { view.update(h(TournamentStateScope, { store }, h(TVStandings, { pageIndex: 1 }))); });
  assert.equal(view.root.findAllByType('table').length, 1); assert.equal(view.root.findByType('tbody').findAllByType('tr')[0].findAllByType('td')[1].children[0], '3');
  assert.equal(view.root.findByType('tbody').findAllByType('tr')[0].findAllByType('td')[2].children[0], '+4'); act(() => view.unmount());
});

test('100 points live : seul le bandeau TV se redessine, les classements restent à zéro', () => {
  const initial = fixture(), store = createTournamentStore(initial), channel = createLiveScoreStore(); let rootRenders = 0, view;
  function Scenario() { rootRenders++; return h(React.Fragment, null, h(PoolStandingCard, { pool: initial.pools[0], index: 0, swiss: false, getTeamName: id => id }), h(LiveScoreTicker, { channel, showLiveScores: true, poolsOver: false, pauseTimeLeft: null, tournamentName: 'Test' })); }
  act(() => { view = TestRenderer.create(h(TournamentStateScope, { store }, h(Scenario))); });
  const tableProps = view.root.findByType('table').props;
  for (let n = 0; n < 100; n++) act(() => { channel.receive({ court: 1, matchId: 'm0', team1Name: 'A', team2Name: 'B', score1: n, score2: 8, status: 'finished', standings: { wrong: true } }); });
  assert.equal(rootRenders, 1); assert.equal(view.root.findByType('table').props, tableProps); assert.equal(store.getState(), initial);
  assert.equal(initial.matches[0].score1, null); assert.equal(initial.standings['c-p0'][0].played, 0);
  assert.match(JSON.stringify(view.toJSON()), /99/);
  const liveBefore = channel.getSnapshot(); let redraws = 0; const stop = channel.subscribe(() => redraws++);
  act(() => { channel.receive({ ...liveBefore[0] }); channel.receive({ court: 1, score1: -1, score2: 8 }); });
  assert.equal(redraws, 0); assert.equal(channel.getSnapshot(), liveBefore);
  act(() => { store.setState(finalize(store.getState(), 'm0')); }); assert.equal(store.getState().matches[0].score1, 12); assert.equal(store.getState().standings['c-p0'][0].played, 1);
  stop(); act(() => view.unmount());
});

test('calendrier : modifier une ligne ne reconstruit pas la ligne voisine', () => {
  const state = fixture(); let view;
  const props = { team1: state.teams[0], team2: state.teams[1], category: state.categories[0], poolDisplayName: 'A', isPast: false, quickScore: { s1: 3, s2: 1 }, renderOfficial: () => '-', handleQuickScore: () => {}, handleQuickValidate: () => {}, setEditingMatch: () => {} };
  const render = match => h('table', null, h('tbody', null, h(ScheduleMatchRow, { ...props, match }), h(ScheduleMatchRow, { ...props, match: state.matches[1] })));
  act(() => { view = TestRenderer.create(render(state.matches[0])); });
  const otherProps = view.root.findAllByType('tr')[1].props;
  act(() => { view.update(render(finalize(state, 'm0').matches[0])); });
  assert.equal(view.root.findAllByType('tr')[1].props, otherProps); assert.match(JSON.stringify(view.toJSON()), /12 - 8/); act(() => view.unmount());
});

test('les messages live arrivés avant le montage sont conservés ; reset et pause gardent leur affichage', () => {
  const channel = createLiveScoreStore(); channel.receive({ court: 2, team1Name: 'Avant', team2Name: 'Montage', score1: 7, score2: 4 }); let view;
  const props = { channel, showLiveScores: true, poolsOver: false, pauseTimeLeft: null, tournamentName: 'Test' };
  act(() => { view = TestRenderer.create(h(LiveScoreTicker, props)); }); assert.match(JSON.stringify(view.toJSON()), /Avant/);
  act(() => { view.update(h(LiveScoreTicker, { ...props, pauseTimeLeft: 75 })); }); assert.match(JSON.stringify(view.toJSON()), /1:15/);
  act(() => { channel.clear(); view.update(h(LiveScoreTicker, props)); }); assert.doesNotMatch(JSON.stringify(view.toJSON()), /Avant/);
  assert.match(JSON.stringify(view.toJSON()), /Affichage Officiel/); act(() => view.unmount());
});

test('changer d’onglet ne débranche pas les autres écouteurs du réseau', () => {
  const socket = new EventEmitter(); let liveResets = 0; let ready;
  socket.on('courts_reset', () => liveResets++);
  const cleanup = subscribeCourtReadiness(socket, courts => { ready = courts; });
  socket.emit('court_ready_update', { readyCourts: [1, 2] }); assert.deepEqual(ready, [1, 2]);
  socket.emit('courts_reset'); assert.deepEqual(ready, []); assert.equal(liveResets, 1);
  cleanup(); socket.emit('courts_reset'); assert.equal(liveResets, 2);
  assert.equal(socket.listenerCount('court_ready_update'), 0); assert.equal(socket.listenerCount('courts_reset'), 1);
});
