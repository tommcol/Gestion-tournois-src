import { RoomEngine, Principal, Message, RoomRecord } from './roomEngine';
const json = (value: any, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
const token = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), b => b.toString(16).padStart(2, '0')).join('');
const MAX_FILE = 50 * 1024 * 1024, MAX_LIBRARY = 256 * 1024 * 1024;
export class TournamentRoom {
  private engine: RoomEngine | null = null;
  private access: Record<string, Principal> = {};
  private savedState: any = null;
  private savedBackups: any = null;
  private serial: Promise<unknown> = Promise.resolve();
  constructor(private ctx: RoomContext, _env: WorkerEnv) {
    ctx.blockConcurrencyWhile(async () => {
      ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS room_documents (name TEXT NOT NULL, part INTEGER NOT NULL, value TEXT NOT NULL, PRIMARY KEY(name,part))');
      ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS access_keys (token TEXT PRIMARY KEY, role TEXT NOT NULL, court INTEGER)');
      ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS media (id TEXT PRIMARY KEY, kind TEXT NOT NULL, name TEXT NOT NULL, mime TEXT NOT NULL, size INTEGER NOT NULL)');
      ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS media_parts (id TEXT NOT NULL, part INTEGER NOT NULL, value BLOB NOT NULL, PRIMARY KEY(id,part))');
      const read = (name: string) => ctx.storage.sql.exec('SELECT value FROM room_documents WHERE name=? ORDER BY part', name).toArray().map(p => p.value).join('');
      const metadata = read('metadata');
      if (metadata) { const record = { ...JSON.parse(metadata), state: JSON.parse(read('state')), backups: JSON.parse(read('backups')) }; this.engine = new RoomEngine(record); this.savedState = record.state; this.savedBackups = record.backups; }
      for (const row of ctx.storage.sql.exec('SELECT * FROM access_keys')) this.access[row.token] = { role: row.role, ...(row.court ? { court: row.court } : {}) };
    });
  }
  private save() {
    const { state, backups, ...metadata } = this.engine!.record;
    const documents: [string, string][] = [['metadata', JSON.stringify(metadata)]];
    if (state !== this.savedState) {
      const text = JSON.stringify(state);
      if (new TextEncoder().encode(text).length > 12 * 1024 * 1024) throw Error('Le tournoi est trop volumineux. Réduisez la taille des logos.');
      documents.push(['state', text]);
    }
    if (backups !== this.savedBackups) documents.push(['backups', JSON.stringify(backups)]);
    this.ctx.storage.transactionSync(() => {
      for (const [name, text] of documents) {
        this.ctx.storage.sql.exec('DELETE FROM room_documents WHERE name=?', name);
        for (let i = 0; i < text.length; i += 100000) this.ctx.storage.sql.exec('INSERT INTO room_documents VALUES (?,?,?)', name, i / 100000, text.slice(i, i + 100000));
      }
    });
    this.savedState = state; this.savedBackups = backups;
  }

  private principal(request: Request): Principal | undefined { const bearer = request.headers.get('Authorization')?.replace(/^Bearer /, ''); return bearer ? this.access[bearer] : undefined; }
  private send(ws: RoomWebSocket, messages: Message[]) { for (const m of messages) try { ws.send(JSON.stringify({ event: m.event, args: m.args })); } catch {} }
  private broadcast(messages: Message[], sender?: RoomWebSocket) { for (const ws of this.ctx.getWebSockets()) this.send(ws, messages.filter(m => ws !== sender || !m.exceptSender)); }
  private async schedule() { const c = this.engine?.record.clock; if (c?.endsAt && ['timer_start', 'timer_tick'].includes(c.type)) await this.ctx.storage.setAlarm(c.endsAt); }
  async alarm() {
    if (!this.engine) return; const messages = this.engine.expire(); if (messages.length) { this.save(); this.broadcast(messages); } await this.schedule();
  }
  async fetch(request: Request): Promise<Response> {
    const path = new URL(request.url).pathname;
    if (path.endsWith('/create') && request.method === 'POST') {
      if (this.engine) return json({ error: 'Tournoi déjà créé.' }, 409);
      const text = await request.text(); if (new TextEncoder().encode(text).length > 8 * 1024 * 1024) return json({ error: 'Les données dépassent 8 Mo. Réduisez les logos avant de créer le tournoi.' }, 413);
      let state; try { state = JSON.parse(text); } catch { return json({ error: 'Données invalides.' }, 400); }
      if (!Array.isArray(state?.matches) || !Array.isArray(state?.teams) || !state.finalMatches || !Number.isInteger(state.numberOfCourts) || state.numberOfCourts < 1 || state.numberOfCourts > 64) return json({ error: 'Configuration du tournoi invalide (1 à 64 terrains).' }, 400);
      this.engine = RoomEngine.create(state);
      const admin = token(), tv = token(); this.access = { [admin]: { role: 'admin' }, [tv]: { role: 'tv' } };
      const courts: Record<number, string> = {}; for (let n = 1; n <= 64; n++) { const key = token(); courts[n] = key; this.access[key] = { role: 'court', court: n }; }
      this.ctx.storage.transactionSync(() => { this.save(); for (const [key, p] of Object.entries(this.access)) this.ctx.storage.sql.exec('INSERT INTO access_keys VALUES (?,?,?)', key, p.role, p.court ?? null); });
      return json({ admin, tv, courts });
    }
    if (!this.engine) return json({ error: 'Tournoi introuvable. Ouvrez le lien fourni par l’organisateur.' }, 404);
    if (path.includes('/media/') && ['GET', 'HEAD'].includes(request.method)) return this.readMedia(request, path.split('/media/')[1]);
    if (path.endsWith('/socket')) {
      if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return json({ error: 'WebSocket requis.' }, 426);
      const protocols = (request.headers.get('Sec-WebSocket-Protocol') || '').split(',').map(v => v.trim());
      const principal = this.access[protocols[1]]; if (protocols[0] !== 'tournament-v1' || !principal) return json({ error: 'Lien non autorisé.' }, 403);
      const pair = new WebSocketPair(), client = pair[0], server = pair[1];
      this.ctx.acceptWebSocket(server); server.serializeAttachment(principal);
      const expired = this.engine.expire(); if (expired.length) { this.save(); this.broadcast(expired); }
      this.send(server, this.engine.initial()); await this.schedule();
      return new Response(null, { status: 101, webSocket: client, headers: { 'Sec-WebSocket-Protocol': 'tournament-v1' } } as ResponseInit);
    }
    const principal = this.principal(request); if (!principal) return json({ error: 'Lien non autorisé.' }, 403);
    if (path.endsWith('/access') && principal.role === 'admin') {
      const courts: Record<number, string> = {}; let tv = '';
      for (const [key, p] of Object.entries(this.access)) { if (p.role === 'tv') tv = key; if (p.role === 'court') courts[p.court!] = key; }
      return json({ tv, courts });
    }
    if (path.endsWith('/media') && principal.role === 'admin') {
      if (request.method === 'GET') return json(this.ctx.storage.sql.exec('SELECT * FROM media ORDER BY kind,name').toArray());
      if (request.method === 'POST') return this.upload(request);
    }
    if (path.endsWith('/backups') && principal.role === 'admin') return json(this.engine.record.backups);
    return json({ error: 'Accès refusé.' }, 403);
  }
  async webSocketMessage(ws: RoomWebSocket, input: string | ArrayBuffer) {
    this.serial = this.serial.catch(() => {}).then(async () => {
      if (!this.engine || typeof input !== 'string' || input.length > 10 * 1024 * 1024) return ws.close(1009, 'Message trop volumineux');
      let packet: any; try { packet = JSON.parse(input); } catch { return ws.close(1007, 'Message invalide'); }
      const previous = JSON.stringify(this.engine.record);
      try {
        const expired = this.engine.expire(); if (expired.length) { this.save(); this.broadcast(expired); }
        const result = this.engine.handle(ws.deserializeAttachment(), packet.event, packet.data);
        if (result.persist) this.save();
        if (packet.event === 'state_request') this.send(ws, result.messages); else this.broadcast(result.messages, ws);
        await this.schedule();
        if (packet.id) ws.send(JSON.stringify({ ack: packet.id, reply: result.reply }));
      } catch (error) {
        this.engine.record = JSON.parse(previous) as RoomRecord;
        if (packet.id) ws.send(JSON.stringify({ ack: packet.id, reply: { status: 'retry', error: 'Sauvegarde non terminée. La commande sera réessayée.' } }));
      }
    });
    await this.serial;
  }
  webSocketClose(ws: RoomWebSocket, code: number) { try { ws.close(code === 1006 ? 1000 : code); } catch {} }
  webSocketError(ws: RoomWebSocket) { try { ws.close(1011, 'Reconnectez-vous.'); } catch {} }
  private async upload(request: Request) {
    const url = new URL(request.url), kind = url.searchParams.get('kind');
    if (!['musiques', 'sponsors'].includes(kind || '')) return json({ error: 'Dossier invalide.' }, 400);
    const mime = request.headers.get('Content-Type')?.split(';')[0] || '';
    const allowed = kind === 'sponsors' ? ['image/png', 'image/jpeg', 'image/webp'] : ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/flac', 'audio/webm'];
    if (!allowed.includes(mime)) return json({ error: kind === 'sponsors' ? 'Utilisez une image PNG, JPG ou WEBP.' : 'Format audio non pris en charge.' }, 415);
    const limit = kind === 'sponsors' ? 2 * 1024 * 1024 : MAX_FILE;
    const used = Number(this.ctx.storage.sql.exec('SELECT COALESCE(SUM(size),0) AS total FROM media').toArray()[0].total);
    if (used >= MAX_LIBRARY || Number(request.headers.get('Content-Length')) > limit) return json({ error: 'Dossier plein (256 Mo) ou fichier trop volumineux (image 2 Mo, musique 50 Mo).' }, 413);
    let name = 'Fichier'; try { name = decodeURIComponent(request.headers.get('x-file-name') || name).replace(/[\\/\x00-\x1f]/g, '_').slice(0, 200); } catch {}
    const id = token(), reader = request.body?.getReader(); if (!reader) return json({ error: 'Fichier vide.' }, 400);
    let size = 0, part = 0;
    try {
      for (;;) {
        const next = await reader.read(); if (next.done) break;
        size += next.value.byteLength; if (size > limit || used + size > MAX_LIBRARY) throw Error('Fichier trop volumineux ou dossier plein.');
        for (let i = 0; i < next.value.byteLength; i += 65536) this.ctx.storage.sql.exec('INSERT INTO media_parts VALUES (?,?,?)', id, part++, next.value.slice(i, i + 65536));
      }
      if (!size) throw Error('Fichier vide.');
      const currentSize = Number(this.ctx.storage.sql.exec('SELECT COALESCE(SUM(size),0) AS total FROM media').toArray()[0].total);
      if (currentSize + size > MAX_LIBRARY) throw Error('Dossiers pleins (256 Mo).');
      this.ctx.storage.sql.exec('INSERT INTO media VALUES (?,?,?,?,?)', id, kind, name, mime, size);
      return json({ id, kind, name, mime, size, url: new URL(request.url).pathname + '/' + id });
    } catch (error) { await reader.cancel().catch(() => {}); this.ctx.storage.sql.exec('DELETE FROM media_parts WHERE id=?', id); return json({ error: error instanceof Error ? error.message : 'Envoi interrompu.' }, 413); }
  }
  private readMedia(request: Request, id: string) {
    if (!/^[a-f0-9]{64}$/.test(id)) return json({ error: 'Fichier introuvable.' }, 404);
    const item = this.ctx.storage.sql.exec('SELECT * FROM media WHERE id=?', id).toArray()[0]; if (!item) return json({ error: 'Fichier introuvable.' }, 404);
    let start = 0, end = item.size - 1; const range = request.headers.get('Range');
    if (range) { const m = /^bytes=(\d*)-(\d*)$/.exec(range); if (!m || !m[1] && !m[2]) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${item.size}` } });
      start = m[1] ? Number(m[1]) : Math.max(0, item.size - Number(m[2])); end = m[1] && m[2] ? Math.min(end, Number(m[2])) : end;
      if (start > end || start >= item.size) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${item.size}` } }); }
    const headers = new Headers({ 'Content-Type': item.mime, 'Content-Length': String(end - start + 1), 'Accept-Ranges': 'bytes', 'Cache-Control': 'private, max-age=86400', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
    if (range) headers.set('Content-Range', `bytes ${start}-${end}/${item.size}`);
    let offset = 0;
    const sql = this.ctx.storage.sql;
    const body = new ReadableStream({ start(controller) {
      for (const row of sql.exec('SELECT value FROM media_parts WHERE id=? ORDER BY part', id)) { const bytes = new Uint8Array(row.value); const next = offset + bytes.length; if (next > start && offset <= end) controller.enqueue(bytes.slice(Math.max(0, start - offset), Math.min(bytes.length, end - offset + 1))); offset = next; if (offset > end) break; } controller.close();
    } });
    return new Response(request.method === 'HEAD' ? null : body, { status: range ? 206 : 200, headers });
  }
}
export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/online/info') return json({ online: true });
    if (url.pathname.startsWith('/api/online/')) {
      if (request.headers.get('Origin') && request.headers.get('Origin') !== url.origin) return json({ error: 'Origine refusée.' }, 403);
      if (url.pathname === '/api/online/rooms' && request.method === 'POST') {
        const room = crypto.randomUUID(); const target = new URL(request.url); target.pathname = `/api/online/rooms/${room}/create`;
        const response = await env.ROOMS.get(env.ROOMS.idFromName(room)).fetch(new Request(target, request));
        if (!response.ok) return response; return json({ room, ...await response.json() as object });
      }
      const m = /^\/api\/online\/rooms\/([a-f0-9-]{36})\/(.+)$/.exec(url.pathname);
      if (m && m[2] !== 'create') return env.ROOMS.get(env.ROOMS.idFromName(m[1])).fetch(request);
      return json({ error: 'Adresse introuvable.' }, 404);
    }
    if (url.pathname.startsWith('/socket.io') || url.pathname.startsWith('/api/')) return json({ error: 'Ouvrez un tournoi en ligne depuis Configuration.' }, 404);
    return env.ASSETS.fetch(request);
  }
};
