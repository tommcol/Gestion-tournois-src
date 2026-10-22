import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { io } from 'socket.io-client';
import { initialData } from '../data/initialData.ts';
import { applyStatePatch } from '../utils/statePatch.ts';
const delay = ms => new Promise(r => setTimeout(r, ms));
async function until(check, timeout = 7000) { const end = Date.now() + timeout; while (Date.now() < end) { const result = await check(); if (result) return result; await delay(20); } throw new Error('Délai dépassé'); }
const send = (socket, event, data) => new Promise((resolve, reject) => socket.timeout(6000).emit(event, data, (err, reply) => err ? reject(err) : resolve(reply)));

test('nouveau réseau : modifications seules, scores concurrents, reconnexion, commandes uniques et chrono sans doublon', async t => {
  const dataDir = await mkdtemp(path.join(tmpdir(), 'src-incremental-'));
  const port = 36000 + Math.floor(Math.random() * 10000), url = `http://127.0.0.1:${port}`;
  let child; const clients = [];
  const start = async () => {
    child = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], { cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'production', PORT: String(port), TOURNAMENT_DATA_DIR: dataDir, TOURNAMENT_UPLOADS_DIR: path.join(dataDir, 'uploads') }, stdio: 'ignore' });
    await until(async () => { try { return (await fetch(url + '/health')).ok; } catch { return false; } });
  };
  const stop = async () => { const exit = once(child, 'exit'); child.kill(); await exit; };
  const connect = async (role = 'admin') => {
    const socket = io(url, { auth: { role, protocol: 2 }, transports: ['websocket'], reconnection: false, autoConnect: false });
    const client = { socket, state: null, revision: 0, full: 0, patches: [], clocks: [], sounds: [], music: [] }; clients.push(client);
    socket.on('state_update', (state, meta) => { client.state = state; client.revision = meta?.revision ?? 0; client.full++; });
    socket.on('state_patch', patch => { assert.equal(patch.baseRevision, client.revision); client.state = applyStatePatch(client.state, patch.patches); client.revision = patch.revision; client.patches.push(patch); });
    socket.on('timer_sync', clock => client.clocks.push(clock)); socket.on('audio_event', sound => client.sounds.push(sound)); socket.on('music_sync', music => client.music.push(music));
    const ready = once(socket, 'connect'); socket.connect(); await ready; return client;
  };
  const disk = async () => JSON.parse(await readFile(path.join(dataDir, 'tournament_data.json'), 'utf8'));
  try {
    await start(); const admin = await connect(); const tablet = await connect('court'); const tv = await connect('tv');
    const state = { ...structuredClone(initialData), currentSession: 1, teams: [{ id: 'a', name: 'A', categoryId: 'c', players: [] }, { id: 'b', name: 'B', categoryId: 'c', players: [] }], pools: [{ id: 'p', teams: ['a', 'b'] }], matches: [{ id: 'm', poolId: 'p', court: 1, sessionNumber: 1, round: 'Pool', team1Id: 'a', team2Id: 'b', status: 'pending', score1: null, score2: null }, { id: 'm2', poolId: 'p', court: 1, sessionNumber: 2, round: 'Pool', team1Id: 'a', team2Id: 'b', status: 'pending', score1: null, score2: null }], sponsors: [{ id: 's', name: 'TEST', logo: 'data:image/png;base64,' + 'A'.repeat(1024 * 1024) }] };
    admin.socket.emit('initialize_state', state); await until(() => tv.state?.matches.length === 2);
    const fullBefore = tv.full, sponsor = tv.state.sponsors, playlist = tv.state.playlist;
    const action = (id, value) => send(admin.socket, 'tournament_action', { id, action: value });
    assert.equal((await action('next-1', { type: 'NEXT_SESSION' })).status, 'received'); await until(() => tv.state.currentSession === 2);
    assert.equal(tv.full, fullBefore); assert.equal(tv.state.sponsors, sponsor); assert.equal(tv.state.playlist, playlist);
    const bytes = Buffer.byteLength(JSON.stringify(tv.patches.at(-1)));
    assert.ok(bytes < 200); t.diagnostic(`Passage de session transmis : ${bytes} octets, sans le logo de 1 Mo.`);
    const results = await Promise.all([
      send(tablet.socket, 'court_submit', { id: 'score-m', matchId: 'm', court: 1, score1: 12, score2: 8, fouls1: 4, fouls2: 3 }),
      action('previous-1', { type: 'PREVIOUS_SESSION' }),
      action('new-team', { type: 'ADD_TEAM', payload: { id: 'added', name: 'Nouvelle équipe', categoryId: 'c', players: [] } }),
      ...Array.from({ length: 20 }, (_, n) => action(`config-${n}`, { type: 'UPDATE_CONFIG', payload: { tournamentName: `Test ${n}` } })),
    ]);
    assert.ok(results.every(result => result.status === 'received'));
    assert.equal((await disk()).matches[0].score1, 12); assert.equal((await disk()).tournamentName, 'Test 19');
    assert.equal((await action('new-team', { type: 'ADD_TEAM', payload: { id: 'added', name: 'doublon', categoryId: 'c', players: [] } })).status, 'received');
    assert.equal((await disk()).teams.filter(team => team.id === 'added').length, 1);
    assert.equal((await send(tablet.socket, 'tournament_action', { id: 'intruder', action: { type: 'CLEAR_DATA' } })).status, 'rejected');
    const fullRequest = tv.full; tv.socket.emit('state_request'); await until(() => tv.full > fullRequest); assert.equal(tv.state.matches[0].score1, 12);
    // Un ancien navigateur ne peut pas remplacer le tournoi lors de son initialisation.
    admin.socket.emit('initialize_state', { ...state, tournamentName: 'Ancienne copie' }); await delay(50); assert.equal((await disk()).tournamentName, 'Test 19');
    const clock = { type: 'timer_start', session: 1, finals: false, matchIds: ['m'], endsAt: Date.now() + 60000, payload: { timeLeft: 60 } };
    admin.socket.emit('play_audio', clock); await until(() => tv.clocks.length > 0);
    const startTicks = tv.clocks.length;
    for (let n = 0; n < 3; n++) { await delay(1000); admin.socket.emit('play_audio', { ...clock, type: 'timer_tick', payload: { timeLeft: 59 - n } }); }
    await until(() => tv.clocks.length === startTicks + 3);
    assert.equal(tv.sounds.filter(event => event.type.startsWith('timer_')).length, 0);
    admin.socket.emit('play_audio', { ...clock, type: 'timer_pause', endsAt: undefined, payload: { timeLeft: 56 } }); await until(() => tv.clocks.at(-1)?.type === 'timer_pause');
    const music = { command: 'snapshot', payload: { url: '/uploads/test.mp3', currentTime: 42, isPlaying: true, updatedAt: Date.now() } }; admin.socket.emit('music_command', music);
    const late = await connect('tv'); await until(() => late.state && late.music.length);
    assert.equal(late.state.matches[0].score1, 12); assert.equal(late.clocks.at(-1).type, 'timer_pause'); assert.equal(late.music[0].payload.currentTime, 42);
    clients.forEach(client => client.socket.close()); await stop(); await start();
    const restored = await connect(); await until(() => restored.state);
    assert.equal((await send(restored.socket, 'tournament_action', { id: 'new-team', action: { type: 'ADD_TEAM', payload: { id: 'added', name: 'doublon', players: [] } } })).status, 'received');
    assert.equal((await disk()).teams.filter(team => team.id === 'added').length, 1);
    assert.equal(restored.state.matches[0].score1, 12); assert.equal(restored.clocks.at(-1).type, 'timer_pause');
  } finally {
    clients.forEach(client => client.socket.close()); if (child?.exitCode === null) await stop(); await rm(dataDir, { recursive: true, force: true });
  }
});
