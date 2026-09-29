class SoundManager {
  private audioContext: AudioContext | null = null;
  private musicGainNode: GainNode | null = null;
  private masterGainNode: GainNode | null = null;
  private originalMusicVolume: number = 0.5;
  private isDucked: boolean = false;
  private isMuted: boolean = false;
  private bufferCache: Map<string, AudioBuffer> = new Map();
  
  constructor() {
    const urlParams = new URLSearchParams(window.location.search);
    const isMutedInUrl = urlParams.get('mute') === 'true';
    this.isMuted = isMutedInUrl || sessionStorage.getItem('tournament_audio_muted') === 'true';
  }

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      this.audioContext = new AudioContextClass({ sampleRate: 48000 });
    }
    return this.audioContext;
  }

  public async ensureContextState() {
    const ctx = this.getAudioContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
    if (!this.masterGainNode) {
        this.masterGainNode = ctx.createGain();
        this.masterGainNode.gain.value = this.isMuted ? 0 : 1;
        this.masterGainNode.connect(ctx.destination);
    }
    if (!this.musicGainNode) {
        this.musicGainNode = ctx.createGain();
        this.musicGainNode.gain.value = this.originalMusicVolume;
        this.musicGainNode.connect(this.masterGainNode);
    }
    return ctx;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    sessionStorage.setItem('tournament_audio_muted', String(this.isMuted));
    if (this.masterGainNode) {
        this.masterGainNode.gain.setTargetAtTime(this.isMuted ? 0 : 1, this.getAudioContext().currentTime, 0.1);
    }
    return this.isMuted;
  }

  public getMuteState(): boolean { return this.isMuted; }

  private mediaSource: MediaElementAudioSourceNode | null = null;
  
  public async connectMusicElement(audioElement: HTMLAudioElement) {
      const ctx = await this.ensureContextState();
      if (this.mediaSource) return;
      try {
        this.mediaSource = ctx.createMediaElementSource(audioElement);
        if (this.musicGainNode) this.mediaSource.connect(this.musicGainNode);
      } catch (e) {
          console.warn("Audio element already connected or error connecting", e);
      }
  }

  public setMusicVolume(volume: number) {
      this.originalMusicVolume = volume;
      if (this.musicGainNode && !this.isDucked) {
          this.musicGainNode.gain.setTargetAtTime(volume, this.getAudioContext().currentTime, 0.1);
      }
  }

  private duckMusic(targetLevel: number = 0.05) {
      if (this.musicGainNode && this.audioContext) {
          this.isDucked = true;
          const ctx = this.audioContext;
          // Minimum 0.05 pour éviter les bugs de reprise
          const effectiveTarget = Math.max(0.05, Math.min(this.originalMusicVolume, targetLevel));
          this.musicGainNode.gain.cancelScheduledValues(ctx.currentTime);
          this.musicGainNode.gain.linearRampToValueAtTime(effectiveTarget, ctx.currentTime + 0.2);
      }
  }

  private unduckMusic() {
      if (this.musicGainNode && this.audioContext) {
          this.isDucked = false;
          const ctx = this.audioContext;
          this.musicGainNode.gain.cancelScheduledValues(ctx.currentTime);
          this.musicGainNode.gain.linearRampToValueAtTime(this.originalMusicVolume, ctx.currentTime + 0.8);
      }
  }

  private async playAudioFromBase64(base64: string): Promise<number> {
    try {
      const ctx = await this.ensureContextState();
      let audioBuffer = this.bufferCache.get(base64);
      if (!audioBuffer) {
        const response = await fetch(base64);
        const arrayBuffer = await response.arrayBuffer();
        audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        this.bufferCache.set(base64, audioBuffer);
      }
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.masterGainNode || ctx.destination);
      source.start(0);
      return audioBuffer.duration;
    } catch (error) {
      console.error("Error decoding or playing custom audio:", error);
      return 0;
    }
  }

  public async playBeep(frequency: number = 800, duration: number = 0.1, type: OscillatorType = 'sine', ducking: boolean = true) {
    try {
      if(ducking) this.duckMusic(0.05);
      const ctx = await this.ensureContextState();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      oscillator.connect(gainNode);
      gainNode.connect(this.masterGainNode || ctx.destination);
      oscillator.start();
      gainNode.gain.setValueAtTime(0.2, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      oscillator.stop(ctx.currentTime + duration);
      if(ducking) setTimeout(() => this.unduckMusic(), duration * 1000 + 100);
    } catch (e) {
      console.error("Error playing beep", e);
      this.unduckMusic();
    }
  }

  public async playWhistle(customSound?: string): Promise<void> {
    this.duckMusic(0.05);
    if (!customSound) {
        setTimeout(() => this.unduckMusic(), 1000);
        return Promise.resolve();
    }
    const duration = await this.playAudioFromBase64(customSound);
    return new Promise(resolve => {
        setTimeout(() => { this.unduckMusic(); resolve(); }, duration * 1000 + 200);
    });
  }

  public async playAirHorn(customSound?: string) {
    if (!customSound) return;
    this.duckMusic(0.05);
    const duration = await this.playAudioFromBase64(customSound);
    setTimeout(() => this.unduckMusic(), duration * 1000 + 500);
  }

  public async playOneMinute(customSound?: string) {
      if (customSound) {
          this.duckMusic(0.05);
          const duration = await this.playAudioFromBase64(customSound);
          setTimeout(() => this.unduckMusic(), duration * 1000 + 200);
      }
  }
}

export const soundManager = new SoundManager();
