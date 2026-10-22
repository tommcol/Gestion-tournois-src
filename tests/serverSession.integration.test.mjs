import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { io } from 'socket.io-client';

const waitFor = async (check, timeoutMs = 8000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await check();
    if (result) return result;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Timed out while waiting for the local server result');
};

test('le serveur production démarre et archive la session quittée', async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), 'tournament-server-test-'));
  const port = 33000 + Math.floor(Math.random() * 20000);
  const server = spawn(process.execPath, ['--import', 'tsx', 'server.ts'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: String(port),
      TOURNAMENT_APP_DIR: process.cwd(),
      TOURNAMENT_DATA_DIR: dataDir,
      TOURNAMENT_UPLOADS_DIR: path.join(dataDir, 'uploads')
    },
    stdio: 'ignore'
  });
  let socket;

  try {
    await waitFor(async () => {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/health`);
        return response.ok;
      } catch {
        return false;
      }
    });

    const appPage = await fetch(`http://127.0.0.1:${port}/any/app/route`);
    assert.equal(appPage.status, 200);
    assert.match(await appPage.text(), /<html/i);

    // Les deux dossiers du logiciel Windows survivent sur disque et restent lisibles en HTTP.
    const uploaded = [];
    for (const [kind, mime, name] of [['musiques', 'audio/mpeg', 'Essai.mp3'], ['sponsors', 'image/png', 'Logo.png']]) {
      const response = await fetch(`http://127.0.0.1:${port}/api/upload?kind=${kind}`, { method: 'POST', headers: { 'Content-Type': mime, 'x-file-name': name }, body: new Uint8Array([1, 2, 3, 4, 5]) });
      assert.equal(response.status, 200); const file = await response.json(); assert.ok(file.url.startsWith(`/uploads/${kind}/`)); uploaded.push(file);
      const contents = await fetch(`http://127.0.0.1:${port}${file.url}`, { headers: { Range: 'bytes=1-3' } }); assert.equal(contents.status, 206); assert.deepEqual(new Uint8Array(await contents.arrayBuffer()), new Uint8Array([2, 3, 4]));
    }
    const mediaList = await (await fetch(`http://127.0.0.1:${port}/api/media`)).json(); assert.equal(mediaList.length, 2); assert.ok(mediaList.some(file => file.name === 'Essai.mp3'));

    socket = io(`http://127.0.0.1:${port}`, { transports: ['websocket'], timeout: 3000 });
    await once(socket, 'connect');
    socket.emit('update_state', { currentSession: 1, matches: [], finalMatches: {}, marker: 'session-one' });
    await waitFor(async () => {
      try {
        return JSON.parse(await readFile(path.join(dataDir, 'tournament_data.json'), 'utf8')).marker === 'session-one';
      } catch {
        return false;
      }
    });

    socket.emit('update_state', { currentSession: 2, matches: [], finalMatches: {}, marker: 'session-two' });
    const backupName = await waitFor(async () => {
      const files = await readdir(path.join(dataDir, 'backups')).catch(() => []);
      return files.find(name => name.startsWith('tournament_data_session_1_') && name.endsWith('.json'));
    });
    const backup = JSON.parse(await readFile(path.join(dataDir, 'backups', backupName), 'utf8'));
    assert.equal(backup.currentSession, 1);
    assert.equal(backup.marker, 'session-one');
  } finally {
    if (socket) socket.close();
    if (server.exitCode === null) {
      const exited = once(server, 'exit').catch(() => {});
      server.kill();
      await exited;
    }
    await rm(dataDir, { recursive: true, force: true });
  }
});

