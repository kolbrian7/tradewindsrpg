class SynthSounds {
  private static ctx: AudioContext | null = null;

  public static getContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public static unlock() {
    try {
      const ctx = this.getContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      // Play a tiny silent buffer to unlock Web Audio API on iOS and Android Chrome
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    } catch (e) {
      console.warn('Unlock context failed:', e);
    }
  }

  public static play(type: string) {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // Force resume context if suspended when playing
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      if (type === 'click') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.frequency.setValueAtTime(600, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.05);

        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.05);

        osc.start(now);
        osc.stop(now + 0.05);
      } else if (type === 'coin') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(987.77, now); // B5
        osc.frequency.setValueAtTime(1318.51, now + 0.08); // E6

        gain.gain.setValueAtTime(0.035, now);
        gain.gain.setValueAtTime(0.035, now + 0.08);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);

        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'cannon') {
        const bufferSize = ctx.sampleRate * 0.45;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(350, now);
        filter.frequency.linearRampToValueAtTime(15, now + 0.45);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.45);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        noise.start(now);
        noise.stop(now + 0.45);
      } else if (type === 'hit') {
        const bufferSize = ctx.sampleRate * 0.3;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(220, now);
        filter.frequency.linearRampToValueAtTime(70, now + 0.3);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        noise.start(now);
        noise.stop(now + 0.3);
      } else if (type === 'sail') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(70, now);
        osc.frequency.linearRampToValueAtTime(110, now + 0.6);
        osc.frequency.linearRampToValueAtTime(50, now + 1.4);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(250, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.06, now + 0.3);
        gain.gain.linearRampToValueAtTime(0, now + 1.4);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 1.4);
      } else if (type === 'victory') {
        const notes = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5
        notes.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, now + index * 0.12);

          gain.gain.setValueAtTime(0.08, now + index * 0.12);
          gain.gain.linearRampToValueAtTime(0, now + index * 0.12 + 0.4);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + index * 0.12);
          osc.stop(now + index * 0.12 + 0.4);
        });
      } else if (type === 'defeat') {
        const notes = [392.00, 349.23, 311.13, 261.63]; // G4, F4, Eb4, C4
        notes.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, now + index * 0.15);

          gain.gain.setValueAtTime(0.06, now + index * 0.15);
          gain.gain.linearRampToValueAtTime(0, now + index * 0.15 + 0.5);

          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(now + index * 0.15);
          osc.stop(now + index * 0.15 + 0.5);
        });
      }
    } catch (e) {
      console.warn('Synth sound error:', e);
    }
  }
}

/** Background sound for each place: one long loop per scene, faded in and out as you move around.
 *  Files live in /assets/sounds/amb/<scene>.mp3. Only the last few loops stay decoded, to spare phone memory. */
export type AmbienceScene = 'port' | 'market' | 'shipyard' | 'cantina' | 'sea' | 'battle';
const AMBIENCE_LEVEL: Record<AmbienceScene, number> = { port: 0.55, market: 0.5, shipyard: 0.5, cantina: 0.5, sea: 0.55, battle: 0.6 };
const AMBIENCE_FADE = 1.4;      // seconds
const AMBIENCE_KEEP = 3;        // decoded loops kept in memory

class Ambience {
  private master: GainNode | null = null;
  private buffers = new Map<AmbienceScene, Promise<AudioBuffer | null>>();
  private playing: { scene: AmbienceScene; src: AudioBufferSourceNode; gain: GainNode } | null = null;
  private wanted: AmbienceScene | null = null;
  private muted = false;

  private out(): GainNode {
    const ctx = SynthSounds.getContext();
    if (!this.master) {
      this.master = ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(ctx.destination);
    }
    return this.master;
  }

  private load(scene: AmbienceScene): Promise<AudioBuffer | null> {
    let b = this.buffers.get(scene);
    if (!b) {
      b = fetch(`/assets/sounds/amb/${scene}.mp3`)
        .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(r.status)))
        .then(data => SynthSounds.getContext().decodeAudioData(data))
        .catch(() => null);
      this.buffers.set(scene, b);
      // forget the oldest loops (never the one playing or wanted)
      for (const key of [...this.buffers.keys()]) {
        if (this.buffers.size <= AMBIENCE_KEEP) break;
        if (key !== scene && key !== this.playing?.scene && key !== this.wanted) this.buffers.delete(key);
      }
    }
    return b;
  }

  public set(scene: AmbienceScene | null) {
    if (scene === this.wanted) return;
    this.wanted = scene;
    let ctx: AudioContext;
    try { ctx = SynthSounds.getContext(); } catch { return; }
    if (this.playing) {
      const { src, gain } = this.playing;
      const now = ctx.currentTime;
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + AMBIENCE_FADE);
      try { src.stop(now + AMBIENCE_FADE + 0.05); } catch { /* already stopped */ }
      this.playing = null;
    }
    if (!scene) return;
    this.load(scene).then(buf => {
      if (!buf || this.wanted !== scene || this.playing) return;
      const now = ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      // MP3 adds a few silent milliseconds at both ends; loop just inside them so there is no gap.
      src.loopStart = 0.06;
      src.loopEnd = buf.duration - 0.06;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(AMBIENCE_LEVEL[scene], now + AMBIENCE_FADE);
      src.connect(gain);
      gain.connect(this.out());
      // start somewhere inside the loop so returning to a place doesn't always replay the same moment
      src.start(now, 0.06 + Math.random() * (buf.duration - 0.2));
      this.playing = { scene, src, gain };
    });
  }

  public setMuted(muted: boolean) {
    this.muted = muted;
    if (!this.master) return;
    const now = SynthSounds.getContext().currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setValueAtTime(this.master.gain.value, now);
    this.master.gain.linearRampToValueAtTime(muted ? 0 : 1, now + 0.3);
  }
}

class AudioManager {
  private static instance: AudioManager;
  private isMuted: boolean = false;
  private bgmAudio: HTMLAudioElement | null = null;
  private currentBgmName: string = '';
  private ambience = new Ambience();

  private constructor() {
    const savedMute = localStorage.getItem('tradewinds_audio_muted');
    if (savedMute !== null) {
      this.isMuted = savedMute === 'true';
    }
    this.ambience.setMuted(this.isMuted);
    this.setupUnlockListeners();
    // Phones keep playing web audio in a background tab; stop when the game is out of sight.
    document.addEventListener('visibilitychange', () => {
      try {
        const ctx = SynthSounds.getContext();
        if (document.hidden) ctx.suspend(); else ctx.resume();
      } catch { /* no audio */ }
    });
  }

  /** Background sound for the place you are in (null for silence). */
  public setAmbience(scene: AmbienceScene | null) {
    this.ambience.set(scene);
  }

  private setupUnlockListeners() {
    const unlock = () => {
      // Unlock synth AudioContext
      SynthSounds.unlock();

      // Trigger playing of BGM if it was blocked
      if (!this.isMuted && this.bgmAudio && this.bgmAudio.paused) {
        this.bgmAudio.play().catch(() => {});
      }

      // Clean up event listener - click is universally supported on iOS/Android as user gesture
      window.removeEventListener('click', unlock);
    };

    window.addEventListener('click', unlock);
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    localStorage.setItem('tradewinds_audio_muted', String(this.isMuted));
    this.ambience.setMuted(this.isMuted);
    
    if (this.isMuted) {
      if (this.bgmAudio) {
        this.bgmAudio.pause();
      }
    } else {
      if (this.bgmAudio) {
        this.bgmAudio.play().catch(() => {});
      }
    }
    return this.isMuted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public playSfx(name: string) {
    if (this.isMuted) return;

    // Default to synthesizing Web Audio API sounds synchronously to comply with mobile autoplay policies.
    // If you explicitly enable useMP3, it will try to play MP3s.
    const useMP3 = false;

    if (useMP3) {
      const sfxPath = `/assets/sounds/${name}.mp3`;
      const audio = new Audio(sfxPath);
      audio.volume = 0.4;
      audio.play().catch(() => {
        SynthSounds.play(name);
      });
    } else {
      SynthSounds.play(name);
    }
  }

  public playBgm(name: string, loop: boolean = true) {
    if (this.currentBgmName === name) return;

    if (this.bgmAudio) {
      this.bgmAudio.pause();
    }

    this.currentBgmName = name;
    
    const bgmPath = `/assets/sounds/${name}.mp3`;
    this.bgmAudio = new Audio(bgmPath);
    this.bgmAudio.volume = 0.25;
    this.bgmAudio.loop = loop;

    if (!this.isMuted) {
      this.bgmAudio.play().catch(err => {
        console.warn('BGM auto-play blocked, waiting for user interaction:', err);
      });
    }
  }

  public stopBgm() {
    if (this.bgmAudio) {
      this.bgmAudio.pause();
      this.bgmAudio = null;
      this.currentBgmName = '';
    }
  }
}

export const audioManager = AudioManager.getInstance();
