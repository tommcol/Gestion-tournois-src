import { OnlineSession, roomPath } from './onlineSession';
export interface AppSocket {
  connected: boolean;
  on(event: string, listener: (...args: any[]) => void): any;
  off(event: string, listener: (...args: any[]) => void): any;
  emit(event: string, ...args: any[]): any;
  timeout(ms: number): { emit(event: string, ...args: any[]): any };
  disconnect(): any;
}
// Même petit contrat de messages pour le serveur Windows et le tournoi Cloudflare.
export class OnlineSocket implements AppSocket {
  connected = false;
  private listeners = new Map<string, Set<(...args: any[]) => void>>();
  private ws: WebSocket | null = null;
  private stopped = false;
  private retry?: ReturnType<typeof setTimeout>;
  private pending = new Map<string, { callback: (...args: any[]) => void; timer: ReturnType<typeof setTimeout>; timed: boolean }>();
  private lastReady: any = null;
  private counter = 0;
  private failures = 0;
  constructor(private session: OnlineSession) { queueMicrotask(() => this.connect()); }
  on(event: string, listener: (...args: any[]) => void) { if (!this.listeners.has(event)) this.listeners.set(event, new Set()); this.listeners.get(event)!.add(listener); if (event === 'court_ready_update' && this.lastReady) queueMicrotask(() => { if (this.listeners.get(event)?.has(listener)) listener(this.lastReady); }); return this; }
  off(event: string, listener: (...args: any[]) => void) { this.listeners.get(event)?.delete(listener); return this; }
  private receive(event: string, ...args: any[]) { if (event === 'court_ready_update') this.lastReady = args[0]; if (event === 'courts_reset') this.lastReady = { readyCourts: [] }; this.listeners.get(event)?.forEach(listener => listener(...args)); }
  private connect() {
    if (this.stopped) return;
    const url = new URL(roomPath(this.session, 'socket'), window.location.origin); url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = this.ws = new WebSocket(url, ['tournament-v1', this.session.token]);
    ws.onopen = () => { this.connected = true; this.failures = 0; this.receive('connect'); };
    ws.onmessage = event => { try { const packet = JSON.parse(event.data); if (packet.ack) { const pending = this.pending.get(packet.ack); if (pending) { clearTimeout(pending.timer); this.pending.delete(packet.ack); pending.callback(...(pending.timed ? [null, packet.reply] : [packet.reply])); } } else if (typeof packet.event === 'string' && Array.isArray(packet.args)) this.receive(packet.event, ...packet.args); } catch { this.receive('connect_error', Error('Message du tournoi illisible.')); } };
    ws.onerror = () => this.receive('connect_error', Error('Connexion au tournoi indisponible.'));
    ws.onclose = () => { this.connected = false; this.receive('disconnect'); for (const pending of this.pending.values()) { clearTimeout(pending.timer); if (pending.timed) pending.callback(Error('Connexion interrompue.')); } this.pending.clear(); if (!this.stopped) this.retry = setTimeout(() => this.connect(), Math.min(10000, 500 * 2 ** Math.min(5, this.failures++))); };
  }
  private send(event: string, args: any[], ms?: number) {
    const callback = typeof args[args.length - 1] === 'function' ? args.pop() : undefined;
    if (!this.connected || this.ws?.readyState !== WebSocket.OPEN) { if (callback && ms) callback(Error('Hors connexion.')); return this; }
    const id = callback ? String(++this.counter) : undefined;
    if (callback && id) { const timer = setTimeout(() => { this.pending.delete(id); if (ms) callback(Error('Réponse non reçue.')); }, ms || 8000); this.pending.set(id, { callback, timer, timed: !!ms }); }
    this.ws.send(JSON.stringify({ event, data: args[0], id })); return this;
  }
  emit(event: string, ...args: any[]) { return this.send(event, args); }
  timeout(ms: number) { return { emit: (event: string, ...args: any[]) => this.send(event, args, ms) }; }
  disconnect() { this.stopped = true; clearTimeout(this.retry); this.ws?.close(); for (const p of this.pending.values()) clearTimeout(p.timer); this.pending.clear(); }
}
