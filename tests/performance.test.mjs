import test from 'node:test';
import assert from 'node:assert/strict';
import { diffState, applyStatePatch, shareUnchanged } from '../utils/statePatch.ts';
import { createCoalescedSave } from '../utils/coalescedSave.ts';
import { MusicController } from '../services/MusicController.ts';
import { tournamentReducer } from '../context/tournamentReducer.ts';
import { initialData } from '../data/initialData.ts';
import { calculateAllStandings } from '../utils/standingsLogic.ts';
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

export function fixture() {
  const teams = Array.from({ length: 100 }, (_, n) => ({ id: `t${n}`, categoryId: 'c', name: `Équipe ${n}`, players: [] }));
  const pools = Array.from({ length: 25 }, (_, n) => ({ id: `p${n}`, name: `Poule ${n}`, teams: teams.slice(n * 4, n * 4 + 4).map(t => t.id) }));
  const matches = Array.from({ length: 200 }, (_, n) => ({ id: `m${n}`, poolId: `p${n % 25}`, team1Id: `t${(n % 25) * 4}`, team2Id: `t${(n % 25) * 4 + 1}`, court: n % 6 + 1, sessionNumber: Math.floor(n / 6) + 1, round: 'Pool', status: 'pending', score1: null, score2: null }));
  return { ...structuredClone(initialData), teams, pools, matches, standings: calculateAllStandings(pools, matches), sponsors: [{ id: 's', name: 'Sponsor test', logo: 'data:image/png;base64,' + 'A'.repeat(1024 * 1024) }], playlist: [{ name: 'A', url: '/uploads/a.mp3' }, { name: 'B', url: '/uploads/b.mp3' }] };
}

test('500 changements : messages légers et playlist conservée, scores/classements identiques', t => {
  let state = fixture(); let totalFull = 0; let totalPatch = 0; const start = performance.now();
  for (let n = 0; n < 500; n++) {
    const action = n % 3 === 0 ? { type: 'UPDATE_MATCH_SCORE', payload: { matchId: `m${n % 200}`, score1: n % 31, score2: n % 23 } } : { type: n % 2 ? 'NEXT_SESSION' : 'PREVIOUS_SESSION' };
    const next = tournamentReducer(state, action);
    const patches = JSON.parse(JSON.stringify(diffState(state, next)));
    const applied = applyStatePatch(state, patches);
    assert.equal(JSON.stringify(applied), JSON.stringify(next));
    assert.equal(applied.playlist, state.playlist); assert.equal(applied.sponsors, state.sponsors);
    assert.deepEqual(applied.standings, calculateAllStandings(applied.pools, applied.matches));
    totalFull += Buffer.byteLength(JSON.stringify(next)); totalPatch += Buffer.byteLength(JSON.stringify(patches));
    state = applied;
  }
  assert.ok(totalPatch < totalFull / 100);
  t.diagnostic(`500 actions / 100 équipes / 200 matchs : ${Math.round(performance.now() - start)} ms ; données anciennes ${totalFull} octets ; modifications seules ${totalPatch} octets.`);
});

test('rattrapage complet : références inchangées réutilisées et chemins dangereux refusés', () => {
  const state = fixture();
  const refreshed = shareUnchanged(state, JSON.parse(JSON.stringify(state)));
  assert.equal(refreshed, state);
  assert.throws(() => applyStatePatch(state, [{ path: ['__proto__', 'polluted'], value: true }]));
  const next = { ...state, playlist: state.playlist.slice(0, 1), removed: undefined };
  assert.deepEqual(JSON.parse(JSON.stringify(applyStatePatch(state, diffState(state, next)))), JSON.parse(JSON.stringify(next)));
});

test('un score ne recalcule pas le classement des autres poules', () => {
  const state = fixture(); const next = tournamentReducer(state, { type: 'UPDATE_MATCH_SCORE', payload: { matchId: 'm0', score1: 12, score2: 8 } });
  assert.notEqual(next.standings.p0, state.standings.p0);
  for (let n = 1; n < 25; n++) assert.equal(next.standings[`p${n}`], state.standings[`p${n}`]);
});

test('sauvegardes groupées : une écriture pour 100 changements, confirmation après écriture', async () => {
  const values = []; let release;
  const saver = createCoalescedSave(async value => { await new Promise(resolve => { release = resolve; }); values.push(value); }, 20);
  const promises = Array.from({ length: 100 }, (_, n) => saver.save(n));
  let received = false; promises[99].then(() => { received = true; });
  await wait(40); assert.equal(received, false); assert.deepEqual(values, []);
  release(); await Promise.all(promises); assert.deepEqual(values, [99]); assert.equal(received, true);
  const critical = saver.save(101, true); await wait(0); assert.equal(values.length, 1); release(); await critical; assert.deepEqual(values, [99, 101]);
});

test('une écriture échouée ne bloque pas la suivante', async () => {
  let calls = 0;
  const saver = createCoalescedSave(async () => { if (++calls === 1) throw new Error('disque'); });
  await assert.rejects(saver.save(1, true)); await saver.save(2, true); assert.equal(calls, 2);
});

class FakeAudio extends EventTarget {
  src = ''; currentTime = 0; duration = 300; readyState = 0; paused = true; loads = 0; plays = 0; rejectPlay = false;
  load() { this.loads++; this.currentTime = 0; this.readyState = 0; this.paused = true; }
  metadata() { this.readyState = 1; this.dispatchEvent(new Event('loadedmetadata')); }
  async play() { if (this.rejectPlay) throw new Error('clic requis'); this.plays++; this.paused = false; this.dispatchEvent(new Event('play')); }
  pause() { this.paused = true; this.dispatchEvent(new Event('pause')); }
  removeAttribute() { this.src = ''; }
}
const makePlayer = (saved = {}, follower = false) => {
  const audio = new FakeAudio(), values = new Map(Object.entries(saved)), sent = [], gains = [];
  const storage = { getItem: key => values.get(key) || null, setItem: (key, value) => values.set(key, value) };
  const player = new MusicController(audio, storage, 'music', data => sent.push(data), v => gains.push(v), follower, () => 10000);
  return { player, audio, values, sent, gains, storage };
};
const tracks = [{ name: 'A', url: '/a.mp3' }, { name: 'B', url: '/b.mp3' }];

test('musique : 500 mises à jour du tournoi sans recharger ni couper le morceau', async () => {
  const { player, audio } = makePlayer(); player.setPlaylist(tracks); audio.metadata(); await player.play(); audio.currentTime = 94;
  for (let n = 0; n < 500; n++) player.setPlaylist(JSON.parse(JSON.stringify(tracks)));
  assert.equal(audio.loads, 1); assert.equal(audio.currentTime, 94); assert.equal(audio.paused, false);
  player.setPlaylist([...tracks].reverse()); assert.equal(player.getSnapshot().currentIndex, 1); assert.equal(audio.loads, 1);
  player.setPlaylist([tracks[1]]); audio.metadata(); assert.equal(audio.loads, 2); assert.equal(audio.currentTime, 0);
});

test('musique : réouverture au même morceau, position, volume et mode aléatoire', async () => {
  const first = makePlayer(); first.player.setPlaylist(tracks); first.audio.metadata(); first.player.select(1); first.audio.metadata(); await first.player.play();
  first.audio.currentTime = 94; first.player.setVolume(.27); first.player.toggleShuffle(); first.player.persist();
  const second = makePlayer({ music: first.values.get('music') }); second.player.setPlaylist(tracks); second.audio.metadata(); await wait(0);
  assert.equal(second.audio.src, '/b.mp3'); assert.equal(second.audio.currentTime, 94); assert.equal(second.audio.paused, false);
  assert.equal(second.player.getSnapshot().volume, .27); assert.equal(second.player.getSnapshot().isShuffle, true);
  second.player.select(0); second.audio.metadata(); assert.equal(second.audio.currentTime, 0);
});

test('musique : une TV rejoint le morceau courant, sans boucle d’envoi', async () => {
  const { player, audio, sent } = makePlayer({}, true);
  player.receive({ command: 'snapshot', payload: { url: '/b.mp3', currentTime: 83, isPlaying: true, updatedAt: 9000 } });
  player.setPlaylist(tracks); audio.metadata(); await wait(0);
  assert.equal(audio.src, '/b.mp3'); assert.equal(audio.currentTime, 84); assert.equal(audio.paused, false); assert.equal(sent.length, 0);
  player.receive({ command: 'snapshot', payload: { url: '/b.mp3', currentTime: 84, isPlaying: false, updatedAt: 10000 } });
  assert.equal(audio.paused, true); assert.equal(audio.loads, 1); // Directement le morceau courant du PC.
});

test('musique : lecture bloquée par le navigateur puis reprise au clic', async () => {
  const { player, audio } = makePlayer({ music: JSON.stringify({ url: '/a.mp3', currentTime: 45, isPlaying: true }) }); audio.rejectPlay = true;
  player.setPlaylist(tracks); audio.metadata(); await wait(0); assert.equal(player.getSnapshot().isPlaying, false); assert.equal(audio.currentTime, 45);
  audio.rejectPlay = false; await player.play(); assert.equal(player.getSnapshot().isPlaying, true); assert.equal(audio.currentTime, 45); assert.equal(audio.loads, 1);
});
