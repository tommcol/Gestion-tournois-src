import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';
import { initialData } from '../data/initialData.ts';
import { RoomEngine } from '../cloudflare/roomEngine.ts';
import { applyStatePatch } from '../utils/statePatch.ts';
const fixture = () => ({ ...initialData, tournamentName: 'TEST EN LIGNE — FICTIF', numberOfCourts: 2, enableCourtView: true, currentSession: 1, isFinalPhase: false, categories: [{ ...initialData.categories[0], id: 'c', name: 'Test' }], teams: [{ id: 'a', categoryId: 'c', name: 'Équipe A', players: [] }, { id: 'b', categoryId: 'c', name: 'Équipe B', players: [] }], pools: [{ id: 'c-p', teams: ['a', 'b'], name: 'Poule A' }], matches: [{ id: 'm', poolId: 'c-p', round: 'Pool', team1Id: 'a', team2Id: 'b', court: 1, sessionNumber: 1, status: 'scheduled', score1: null, score2: null }], finalMatches: {}, standings: {}, sponsors: [], playlist: [], courtConflicts: [] });
const admin = { role: 'admin' }, court1 = { role: 'court', court: 1 }, court2 = { role: 'court', court: 2 }, tv = { role: 'tv' };
test('en ligne : chaque terrain et la TV restent dans leur rôle ; prêt et live ne changent pas les classements', () => {
  const room = RoomEngine.create(fixture()), before = JSON.stringify(room.record.state);
  assert.equal(room.handle(tv, 'tournament_action', { id: 'x', action: { type: 'CLEAR_DATA' } }).reply.status, 'rejected');
  assert.equal(room.handle(court2, 'court_ready', { court: 1, matchId: 'm' }).reply.status, 'rejected');
  assert.equal(room.handle(court1, 'court_ready', { court: 1, matchId: 'absent' }).reply.status, 'rejected');
  const ready = room.handle(court1, 'court_ready', { court: 1, matchId: 'm' }); assert.deepEqual(ready.messages[0].args[0].readyCourts, [1]);
  const live = room.handle(court1, 'live_score', { court: 1, matchId: 'm', team1Name: 'A', team2Name: 'B', score1: 9, score2: 7 });
  assert.equal(live.persist, false); assert.equal(live.messages[0].event, 'live_score_update'); assert.equal(JSON.stringify(room.record.state), before);
  const sent = room.handle(court1, 'court_submit', { id: 'score1', court: 1, matchId: 'm', score1: 9, score2: 7 }); assert.equal(sent.reply.status, 'received'); assert.equal(room.record.state.matches[0].status, 'finished');
  assert.equal(room.handle(court2, 'court_submit', { id: 'evil', court: 1, matchId: 'm', score1: 0, score2: 1 }).reply.status, 'rejected');
  const restored = new RoomEngine(JSON.parse(JSON.stringify(room.record))); assert.equal(restored.handle(court1, 'court_submit', { id: 'score1', court: 1, matchId: 'm', score1: 1, score2: 99 }).reply.status, 'received'); assert.equal(restored.record.state.matches[0].score1, 9);
});
test('en ligne : chrono à échéance serveur, pause, doublons et mise à jour partielle', () => {
  const room = RoomEngine.create(fixture()), before = structuredClone(room.record.state);
  const action = { id: 'name', action: { type: 'UPDATE_CONFIG', payload: { tournamentName: 'Nouveau' } } };
  const change = room.handle(admin, 'tournament_action', action); const patch = change.messages.find(m => m.event === 'state_patch').args[0]; assert.equal(applyStatePatch(before, patch.patches).tournamentName, 'Nouveau'); assert.equal(room.handle(admin, 'tournament_action', action).messages.length, 0);
  room.handle(admin, 'play_audio', { type: 'timer_start', session: 1, finals: false, matchIds: ['m'], payload: { timeLeft: 5 } }, 1000);
  assert.equal(room.handle(court1, 'court_submit', { id: 'auto', automatic: true, court: 1, matchId: 'm', score1: 2, score2: 0 }, 2000).reply.status, 'clock');
  assert.equal(room.expire(6001)[0].event, 'timer_sync'); assert.equal(room.record.clock.type, 'timer_end');
  room.handle(admin, 'play_audio', { type: 'timer_tick', session: 1, finals: false, matchIds: ['m'], payload: { timeLeft: 5 } }, 7000); assert.equal(room.record.clock.type, 'timer_end');
});

async function setup(persist) {
  const output = await build({ entryPoints: ['cloudflare/worker.ts'], bundle: true, format: 'esm', platform: 'browser', write: false });
  return new Miniflare(convertV4MiniflareOptions({ name: 'tournament-test', modules: true, script: output.outputFiles[0].text, compatibilityDate: '2026-09-29', durableObjects: { ROOMS: { className: 'TournamentRoom', useSQLite: true } }, resourcePersistencePath: persist, telemetry: { enabled: false } }));
}
function inbox(ws) {
  const messages = [], waiters = []; ws.accept();
  ws.addEventListener('message', e => { const message = JSON.parse(e.data); messages.push(message); for (const wake of waiters.splice(0)) wake(); });
  return { messages, async take(predicate) { const deadline = Date.now() + 5000; for (;;) { const index = messages.findIndex(predicate); if (index >= 0) return messages.splice(index, 1)[0]; if (Date.now() >= deadline) throw Error('Message Cloudflare non reçu'); await Promise.race([new Promise(r => waiters.push(r)), new Promise(r => setTimeout(r, 50))]); } } };
}
test('Cloudflare réel simulé : création, accès privés, deux connexions, fichiers/ranges et restauration après redémarrage', { timeout: 45000 }, async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'tournoi-cloud-test-')); let mf, a, c;
  try {
    mf = await setup(directory);
    const response = await mf.dispatchFetch('https://test.local/api/online/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://test.local' }, body: JSON.stringify(fixture()) }); assert.equal(response.status, 200, await response.clone().text());
    const access = await response.json(), root = `https://test.local/api/online/rooms/${access.room}`;
    assert.equal((await mf.dispatchFetch(root + '/access')).status, 403);
    assert.equal((await mf.dispatchFetch(root + '/access', { headers: { Authorization: `Bearer ${access.courts[1]}` } })).status, 403);
    const connect = async key => { const r = await mf.dispatchFetch(root + '/socket', { headers: { Upgrade: 'websocket', 'Sec-WebSocket-Protocol': 'tournament-v1, ' + key } }); assert.equal(r.status, 101); return r.webSocket; };
    a = await connect(access.admin); const ai = inbox(a); await ai.take(p => p.event === 'state_update');
    c = await connect(access.courts[1]); const ci = inbox(c); await ci.take(p => p.event === 'state_update');
    c.send(JSON.stringify({ event: 'court_ready', data: { court: 1, matchId: 'm' }, id: '1' }));
    const ready = await ai.take(p => p.event === 'court_ready_update' && p.args[0].readyCourts.includes(1)); assert.deepEqual(ready.args[0].readyCourts, [1]); assert.equal((await ci.take(p => p.ack === '1')).reply.status, 'received');
    c.send(JSON.stringify({ event: 'court_submit', data: { id: 'submission', court: 1, matchId: 'm', score1: 12, score2: 8 }, id: '2' })); assert.equal((await ci.take(p => p.ack === '2')).reply.status, 'received');
    const data = new Uint8Array(150000).map((_, i) => i % 251);
    const upload = await mf.dispatchFetch(root + '/media?kind=musiques', { method: 'POST', headers: { Authorization: `Bearer ${access.admin}`, 'Content-Type': 'audio/mpeg', 'x-file-name': 'Test.mp3' }, body: data }); assert.equal(upload.status, 200, await upload.clone().text()); const media = await upload.json();
    const partial = await mf.dispatchFetch('https://test.local' + media.url, { headers: { Range: 'bytes=65000-67000' } }); assert.equal(partial.status, 206); assert.deepEqual(new Uint8Array(await partial.arrayBuffer()), data.slice(65000, 67001));
    const bad = await mf.dispatchFetch(root + '/media?kind=sponsors', { method: 'POST', headers: { Authorization: `Bearer ${access.admin}`, 'Content-Type': 'text/html' }, body: '<script>' }); assert.equal(bad.status, 415);
    a.close(); c.close(); a = c = null; await mf.dispose(); mf = await setup(directory);
    const list = await mf.dispatchFetch(root + '/media', { headers: { Authorization: `Bearer ${access.admin}` } }); assert.equal((await list.json())[0].name, 'Test.mp3');
    a = await connect(access.admin); const restored = inbox(a); const state = await restored.take(p => p.event === 'state_update'); assert.equal(state.args[0].matches[0].score1, 12); assert.deepEqual((await restored.take(p => p.event === 'court_ready_update')).args[0].readyCourts, [1]);
    assert.equal((await mf.dispatchFetch(root + '/access', { headers: { Origin: 'https://evil.local', Authorization: `Bearer ${access.admin}` } })).status, 403);
  } finally { a?.close(); c?.close(); await mf?.dispose(); await rm(directory, { recursive: true, force: true }); }
});
