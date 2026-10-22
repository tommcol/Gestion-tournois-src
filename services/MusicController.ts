export interface Track { name: string; url: string }
export interface MusicState { currentIndex: number; currentTime: number; isPlaying: boolean; isShuffle: boolean; volume: number; isLoading: boolean; url: string }
interface Storage { getItem(key: string): string | null; setItem(key: string, value: string): void }
const finite = (value: unknown, fallback = 0) => typeof value === 'number' && Number.isFinite(value) ? value : fallback;

// Un lecteur indépendant des changements de session et des montages de React.
export class MusicController {
  private playlist: Track[] = [];
  private listeners = new Set<() => void>();
  private state: MusicState = { currentIndex: 0, currentTime: 0, isPlaying: false, isShuffle: false, volume: .5, isLoading: false, url: '' };
  private restored: Partial<MusicState> = {};
  private pendingSeek: number | null = null;
  private desiredPlaying = false;
  private lastSave = 0;
  private lastSync = 0;
  private generation = 0;
  private remote: any = null;
  constructor(public readonly audio: HTMLAudioElement, private storage: Storage, private key: string,
    private send: (data: any) => void, private setGain: (volume: number) => void, private follower = false, private now = Date.now) {
    try { this.restored = JSON.parse(storage.getItem(key) || '{}'); } catch {}
    this.state = { ...this.state, volume: Math.max(0, Math.min(1, finite(this.restored.volume, .5))), isShuffle: !!this.restored.isShuffle };
    this.setGain(this.state.volume);
    audio.preload = 'auto';
    audio.addEventListener('loadedmetadata', () => {
      this.seekPending(); this.update({ isLoading: false });
    });
    audio.addEventListener('canplay', () => this.update({ isLoading: false }));
    audio.addEventListener('error', () => { this.desiredPlaying = false; this.update({ isLoading: false, isPlaying: false }); });
    audio.addEventListener('play', () => this.update({ isPlaying: true }));
    audio.addEventListener('pause', () => { this.update({ isPlaying: false }); this.persist(); });
    audio.addEventListener('timeupdate', () => {
      const currentTime = finite(audio.currentTime);
      if (Math.floor(currentTime) !== Math.floor(this.state.currentTime)) this.update({ currentTime });
      if (this.now() - this.lastSave >= 2000) this.persist();
      if (!follower && this.now() - this.lastSync >= 3000) this.publish();
    });
    audio.addEventListener('ended', () => { if (!follower) this.next(); });
  }
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private update(next: Partial<MusicState>) {
    if (Object.entries(next).every(([key, value]) => Object.is(this.state[key as keyof MusicState], value))) return;
    this.state = { ...this.state, ...next }; this.listeners.forEach(listener => listener());
  }
  private seekPending() {
    if (this.pendingSeek === null || !this.audio.readyState) return;
    const target = this.pendingSeek; this.pendingSeek = null;
    try { this.audio.currentTime = Math.max(0, Number.isFinite(this.audio.duration) ? Math.min(target, Math.max(0, this.audio.duration - .01)) : target); } catch { this.pendingSeek = target; }
  }
  setPlaylist(playlist: Track[]) {
    this.playlist = playlist;
    if (!playlist.length) {
      if (this.state.url) { this.audio.pause(); this.audio.removeAttribute('src'); this.audio.load(); }
      this.desiredPlaying = false; this.update({ url: '', currentIndex: 0, currentTime: 0, isPlaying: false, isLoading: false }); this.persist();
      return;
    }
    const url = this.remote?.payload?.url || this.state.url || this.restored.url;
    const retained = playlist.findIndex(track => track.url === url);
    const index = retained >= 0 ? retained : Math.min(this.state.currentIndex, playlist.length - 1);
    const restoring = !this.state.url && retained >= 0 && this.restored.url === playlist[index].url;
    const time = restoring ? finite(this.restored.currentTime) : undefined;
    const playing = restoring ? !!this.restored.isPlaying : this.desiredPlaying;
    this.load(index, time, playing);
    this.restored = {};
    if (this.remote) { const message = this.remote; this.remote = null; this.receive(message); }
  }
  private load(index: number, time?: number, playing = this.desiredPlaying) {
    const track = this.playlist[index]; if (!track) return;
    this.desiredPlaying = playing;
    if (track.url !== this.state.url) {
      ++this.generation;
      this.pendingSeek = time ?? 0;
      this.update({ currentIndex: index, url: track.url, currentTime: time ?? 0, isLoading: true });
      this.audio.src = track.url; this.audio.load();
      this.seekPending();
      if (playing) void this.play(false);
    } else {
      this.update({ currentIndex: index });
      if (time !== undefined && Math.abs(this.audio.currentTime - time) > 2) { this.pendingSeek = time; this.seekPending(); }
    }
  }
  async play(broadcast = true) {
    if (!this.state.url) return;
    this.desiredPlaying = true;
    const generation = this.generation;
    try { await this.audio.play(); if (generation === this.generation) this.update({ isPlaying: true }); }
    catch { if (generation === this.generation) this.update({ isPlaying: false, isLoading: false }); }
    this.persist(); if (broadcast) this.publish();
  }
  pause(broadcast = true) { this.desiredPlaying = false; this.audio.pause(); this.update({ isPlaying: false }); this.persist(); if (broadcast) this.publish(); }
  select(index: number) { this.load(index, 0, true); this.pendingSeek = 0; this.seekPending(); void this.play(); this.persist(); }
  next() {
    const n = this.playlist.length; if (!n) return;
    const step = this.state.isShuffle && n > 1 ? 1 + Math.floor(Math.random() * (n - 1)) : 1;
    this.move((this.state.currentIndex + step) % n);
  }
  previous() { if (this.playlist.length) this.move((this.state.currentIndex - 1 + this.playlist.length) % this.playlist.length); }
  private move(index: number) {
    const playing = this.desiredPlaying; this.load(index, 0, playing);
    this.pendingSeek = 0; this.seekPending();
    if (playing) void this.play(); else this.pause();
  }
  setVolume(volume: number) { volume = Math.max(0, Math.min(1, finite(volume, .5))); this.setGain(volume); this.update({ volume }); this.persist(); this.publish(); }
  toggleShuffle() { this.update({ isShuffle: !this.state.isShuffle }); this.persist(); this.publish(); }
  persist = () => {
    this.lastSave = this.now();
    try { this.storage.setItem(this.key, JSON.stringify({ ...this.state, currentTime: finite(this.audio.currentTime), isPlaying: this.desiredPlaying })); } catch {}
  };
  publish = () => {
    if (this.follower || !this.state.url) return;
    this.lastSync = this.now();
    this.send({ command: 'snapshot', payload: { ...this.state, currentTime: finite(this.audio.currentTime), updatedAt: this.now() } });
  };
  receive(data: any) {
    if (!this.follower || data?.command !== 'snapshot' || !data.payload) return;
    const payload = data.payload;
    const index = this.playlist.findIndex(track => track.url === payload.url);
    if (index < 0) { this.remote = data; return; }
    // Une TV qui rejoint en cours reprend le morceau courant, sans toucher au PC.
    const elapsed = payload.isPlaying ? Math.max(0, Math.min(10, (this.now() - finite(payload.updatedAt, this.now())) / 1000)) : 0;
    this.load(index, Math.max(0, finite(payload.currentTime) + elapsed), !!payload.isPlaying);
    if (payload.isPlaying && this.audio.paused) void this.play(false);
    else if (!payload.isPlaying && !this.audio.paused) this.pause(false);
  }
}
