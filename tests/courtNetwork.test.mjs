import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { io } from 'socket.io-client';
import { initialData } from '../data/initialData.ts';

async function until(check, timeout = 6000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { const result = await check(); if (result) return result; await new Promise(r => setTimeout(r, 30)); }
  throw new Error('Délai dépassé');
}
const received = (socket, event, predicate = () => true) => new Promise((resolve, reject) => {
  const timer = setTimeout(() => { socket.off(event, handler); reject(new Error(`Événement absent : ${event}`)); }, 5000);
  const handler = data => { if (predicate(data)) { clearTimeout(timer); socket.off(event, handler); resolve(data); } };
  socket.on(event, handler);
});
const send = (socket, event, data) => new Promise((resolve, reject) => socket.timeout(5000).emit(event, data, (err, result) => err ? reject(err) : resolve(result)));

test('réseau : réception durable, conflit, choix PC, redémarrage et prolongation', async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), 'src-courts-'));
  const port = 34000 + Math.floor(Math.random() * 15000);
  const url = `http://127.0.0.1:${port}`;
  let child; const sockets = [];
  const start = async () => {
    child = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], { cwd: process.cwd(), env: { ...process.env, NODE_ENV: 'production', PORT: String(port), TOURNAMENT_DATA_DIR: dataDir, TOURNAMENT_UPLOADS_DIR: path.join(dataDir, 'uploads') }, stdio: 'ignore' });
    await until(async () => { try { return (await fetch(url + '/health')).ok; } catch { return false; } });
  };
  const stop = async () => { const exit = once(child, 'exit'); child.kill(); await exit; };
  const connect = async role => {
    const socket = io(url, { auth: { role }, transports: ['websocket'], reconnection: false, autoConnect: false });
    sockets.push(socket); const connected = once(socket, 'connect'); socket.connect(); await connected; return socket;
  };
  const disk = async () => { try { return JSON.parse(await readFile(path.join(dataDir, 'tournament_data.json'), 'utf8')); } catch { return null; } };
  try {
    await start();
    let admin = await connect('admin'); const tablet = await connect('court');
    let state = { ...structuredClone(initialData), categories: [], teams: [{ id: 'a', categoryId: 'c', name: 'A', players: [] }, { id: 'b', categoryId: 'c', name: 'B', players: [] }], pools: [{ id: 'p', teams: ['a', 'b'] }], matches: [{ id: 'm', team1Id: 'a', team2Id: 'b', poolId: 'p', round: 'Pool', court: 1, sessionNumber: 1, status: 'pending', score1: null, score2: null }], finalMatches: { c: [{ id: 'f', categoryId: 'c', round: 'final', matchNumber: 1, court: 1, team1Id: 'a', team2Id: 'b', status: 'pending', score1: null, score2: null, isReady: true }] }, currentSession: 1 };
    admin.emit('update_state', state);
    await until(async () => (await disk())?.matches[0]?.id === 'm');
    const official = { id: 'official-windows', firstName: 'Test', lastName: 'Windows', roles: ['Arbitre'], finalsReferee: true, finalsScorer: false, active: true };
    assert.equal((await send(admin, 'tournament_action', { id: 'add-official-windows', action: { type: 'UPSERT_OFFICIAL', payload: official } })).status, 'received');
    assert.equal((await disk()).officials[0].lastName, 'Windows');
    const submission = { id: 'fixed-id', matchId: 'm', court: 1, score1: 12, score2: 8, fouls1: 5, fouls2: 9, team1Name: 'A', team2Name: 'B' };
    admin.emit('play_audio', { type: 'timer_pause', session: 1, finals: false, matchIds: ['m'], payload: { timeLeft: 40 } });
    await until(async () => { try { return JSON.parse(await readFile(path.join(dataDir, 'timer_state.json'), 'utf8')).type === 'timer_pause'; } catch { return false; } });
    assert.equal((await send(tablet, 'court_submit', { ...submission, automatic: true })).status, 'clock');
    assert.equal((await disk()).matches[0].status, 'pending');
    assert.equal((await send(tablet, 'court_submit', submission)).status, 'received');
    state = await disk(); assert.equal(state.matches[0].score1, 12);
    state.matches[0].score1 = 18; admin.emit('update_state', state);
    await until(async () => (await disk())?.matches[0]?.score1 === 18);
    // Un accusé perdu puis un renvoi ne remplace jamais la correction du PC.
    assert.equal((await send(tablet, 'court_submit', submission)).status, 'received');
    assert.equal((await disk()).matches[0].score1, 18);
    const late = { ...submission, id: 'late-id', score1: 14 };
    assert.equal((await send(tablet, 'court_submit', late)).status, 'conflict');
    assert.equal((await disk()).matches[0].score1, 18);
    assert.equal((await disk()).courtConflicts.length, 1);
    await send(admin, 'court_resolve', { id: late.id, useTablet: false });
    assert.equal((await send(tablet, 'court_submit', late)).status, 'received');
    assert.equal((await disk()).matches[0].score1, 18);
    const second = { ...late, id: 'late-tablet', score1: 16 };
    assert.equal((await send(tablet, 'court_submit', second)).status, 'conflict');
    await send(admin, 'court_resolve', { id: second.id, useTablet: true });
    assert.equal((await disk()).matches[0].score1, 16);
    assert.equal((await send(tablet, 'court_submit', { ...submission, id: 'tie', matchId: 'f', categoryId: 'c', score1: 9, score2: 9 })).status, 'tie');
    const overtimeUpdate = received(admin, 'state_update', s => s.finalMatches.c[0].isOvertime);
    assert.equal((await send(tablet, 'court_overtime', { matchId: 'f', categoryId: 'c', court: 1, score1: 9, score2: 9 })).status, 'received');
    await overtimeUpdate;
    assert.equal((await send(tablet, 'court_submit', { ...submission, id: 'ot-one', matchId: 'f', categoryId: 'c', score1: 10, score2: 9 })).status, 'overtime');
    assert.equal((await disk()).finalMatches.c[0].status, 'pending');
    assert.equal((await send(tablet, 'court_submit', { ...submission, id: 'ot-two', matchId: 'f', categoryId: 'c', score1: 11, score2: 10 })).status, 'received');
    state = await disk();
    // Une tablette ne doit plus réécrire le tournoi entier.
    tablet.emit('update_state', { ...state, tournamentName: 'écrasé' });
    await new Promise(r => setTimeout(r, 80));
    assert.notEqual((await disk()).tournamentName, 'écrasé');
    // Horloge rejouée pour une TV ouverte au milieu du match.
    const clock = { type: 'timer_start', session: 1, finals: false, endsAt: Date.now() + 1500, matchIds: ['m'], payload: { timeLeft: 2 } };
    admin.emit('play_audio', clock);
    await until(async () => { try { return JSON.parse(await readFile(path.join(dataDir, 'timer_state.json'), 'utf8')).endsAt === clock.endsAt; } catch { return false; } });
    const tv = io(url, { auth: { role: 'tv' }, autoConnect: false, reconnection: false }); sockets.push(tv);
    const replay = received(tv, 'timer_sync'); tv.connect();
    assert.equal((await replay).endsAt, clock.endsAt);
    const ended = received(tv, 'timer_sync', c => c.type === 'timer_end');
    admin.close(); await ended;
    sockets.forEach(s => s.close()); await stop(); await start();
    const afterRestart = await connect('court');
    assert.equal((await send(afterRestart, 'court_submit', submission)).status, 'received');
    assert.equal((await disk()).matches[0].score1, 16);
    assert.equal((await disk()).officials[0].id, 'official-windows');
  } finally {
    sockets.forEach(s => s.close());
    if (child && child.exitCode === null) await stop();
    await rm(dataDir, { recursive: true, force: true });
  }
});

