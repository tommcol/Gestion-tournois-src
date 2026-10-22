// Surface Cloudflare utilisée par le Worker, séparée du serveur Windows.
interface SqlCursor<T = Record<string, any>> extends Iterable<T> { toArray(): T[] }
interface RoomStorage { sql: { exec<T = Record<string, any>>(query: string, ...bindings: any[]): SqlCursor<T> }; transactionSync<T>(fn: () => T): T; setAlarm(time: number): Promise<void> }
interface RoomContext { storage: RoomStorage; blockConcurrencyWhile<T>(fn: () => Promise<T>): Promise<T>; acceptWebSocket(ws: RoomWebSocket): void; getWebSockets(): RoomWebSocket[] }
interface RoomWebSocket extends WebSocket { serializeAttachment(value: any): void; deserializeAttachment(): any; accept(): void }
declare const WebSocketPair: { new(): { 0: RoomWebSocket; 1: RoomWebSocket } };
interface RoomNamespace { idFromName(name: string): any; get(id: any): { fetch(request: Request): Promise<Response> } }
interface WorkerEnv { ROOMS: RoomNamespace; ASSETS: { fetch(request: Request): Promise<Response> } }
