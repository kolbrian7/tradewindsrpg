class SynthSounds {
  private static ctx: AudioContext | null = null;

  private static getContext(): AudioContext {
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

class AudioManager {
  private static instance: AudioManager;
  private isMuted: boolean = false;
  private bgmAudio: HTMLAudioElement | null = null;
  private currentBgmName: string = '';

  private constructor() {
    const savedMute = localStorage.getItem('tradewinds_audio_muted');
    if (savedMute !== null) {
      this.isMuted = savedMute === 'true';
    }
    this.setupUnlockListeners();
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
