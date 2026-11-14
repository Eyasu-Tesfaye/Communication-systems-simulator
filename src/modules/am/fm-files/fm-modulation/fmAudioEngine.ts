/**
 * FM Audio Engine: Web Audio API synthesis & demodulation audio playback
 */

export class FmAudioEngine {
  private audioCtx: AudioContext | null = null;
  private originalSource: AudioBufferSourceNode | null = null;
  private demodSource: AudioBufferSourceNode | null = null;
  private originalBuffer: AudioBuffer | null = null;
  private demodBuffer: AudioBuffer | null = null;

  constructor() {
    // Lazy AudioContext initialization on first user interaction
  }

  private getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Generates both original voice/tone audio buffer and demodulated FM audio buffer
   * reflecting DC offset, discriminator over-modulation, PLL loss of lock, and AWGN SNR threshold.
   */
  public generateAudioBuffers(
    messageType: 'sine' | 'square' | 'voice',
    fmHz: number,
    beta: number,
    noiseLevel: number,
    demodType: 'discriminator' | 'pll',
    dcOffset: number = 0,
    isOvermodulated: boolean = false,
    isLocked: boolean = true,
    awgnSnrDb: number = 30
  ): { originalBuffer: AudioBuffer; demodBuffer: AudioBuffer } {
    const ctx = this.getAudioContext();
    const sampleRate = ctx.sampleRate;
    const durationSec = 3.5;
    const totalSamples = Math.floor(sampleRate * durationSec);

    const origBuf = ctx.createBuffer(1, totalSamples, sampleRate);
    const demodBuf = ctx.createBuffer(1, totalSamples, sampleRate);

    const origData = origBuf.getChannelData(0);
    const demodData = demodBuf.getChannelData(0);

    const fBase = messageType === 'voice' ? 220 : Math.max(100, fmHz * 55);
    const snrLin = Math.pow(10, awgnSnrDb / 10);
    const awgnAmp = Math.sqrt(1 / Math.max(0.05, snrLin));
    const thresholdDb = demodType === 'discriminator' ? 10.5 : 7.0;

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;

      // 1. Original Message Audio Sample
      let rawMsg = 0;
      if (messageType === 'sine') {
        rawMsg = Math.sin(2 * Math.PI * fBase * t);
      } else if (messageType === 'square') {
        rawMsg = Math.sin(2 * Math.PI * fBase * t) >= 0 ? 0.75 : -0.75;
      } else {
        const envelope = 0.5 + 0.5 * Math.sin(2 * Math.PI * 1.5 * t);
        const f1 = Math.sin(2 * Math.PI * 220 * t);
        const f2 = 0.6 * Math.sin(2 * Math.PI * 440 * t + 0.3);
        const f3 = 0.3 * Math.sin(2 * Math.PI * 880 * t + 0.7);
        const f4 = 0.15 * Math.sin(2 * Math.PI * 1760 * t + 1.2);
        rawMsg = (f1 + f2 + f3 + f4) * envelope * 0.65;
      }

      origData[i] = rawMsg * 0.7;

      // 2. Demodulated Audio Sample
      let demodSample = rawMsg;

      // DC offset adds an audible bias / baseline shift
      demodSample += dcOffset * 0.35;

      // Impact of Over-modulation / Loss-of-Lock:
      if (isOvermodulated) {
        if (demodType === 'discriminator') {
          demodSample = demodSample < 0 ? Math.abs(demodSample) * 0.4 : demodSample * 1.35;
        } else {
          const slipFreq = fBase + 550 * Math.sin(2 * Math.PI * 8 * t);
          demodSample = 0.45 * Math.sin(2 * Math.PI * slipFreq * t) + 0.25 * (Math.random() * 2 - 1);
        }
      } else if (!isLocked) {
        demodSample = demodSample * 0.6 + 0.35 * Math.sin(2 * Math.PI * fBase * 1.5 * t);
      }

      // Gaussian AWGN hiss & FM quieting / threshold effect
      const u1 = Math.max(1e-6, Math.random());
      const u2 = Math.random();
      const gauss = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const fmNoiseSuppression = 1 / Math.sqrt(Math.max(0.2, beta * beta + 1));
      const combinedNoise = awgnAmp * 0.65 + noiseLevel * 0.35;
      demodSample += gauss * combinedNoise * fmNoiseSuppression * (demodType === 'pll' ? 0.75 : 1.0);

      // Audible FM Threshold clicks/pops when CNR drops below threshold
      if (awgnSnrDb < thresholdDb) {
        const severity = (thresholdDb - awgnSnrDb) / thresholdDb;
        if (Math.random() < 0.008 + severity * 0.035) {
          demodSample += (Math.random() >= 0.5 ? 1 : -1) * (0.55 + severity * 0.7);
        }
      }

      // Normalize demodulated audio gain to 1.0x when locked to match Original Audio (rawMsg * 0.7)
      if (isLocked && !isOvermodulated) {
        demodData[i] = Math.max(-0.95, Math.min(0.95, demodSample * 0.7));
      } else if (demodType === 'discriminator') {
        const shaped = Math.tanh(demodSample * 0.85) / Math.tanh(0.85);
        demodData[i] = Math.max(-0.95, Math.min(0.95, shaped * 0.7));
      } else {
        demodData[i] = Math.max(-0.95, Math.min(0.95, demodSample * 0.7));
      }
    }

    this.originalBuffer = origBuf;
    this.demodBuffer = demodBuf;

    return { originalBuffer: origBuf, demodBuffer: demodBuf };
  }

  public playOriginal(onEnded?: () => void): void {
    const ctx = this.getAudioContext();
    this.stopOriginal();

    if (!this.originalBuffer) {
      this.generateAudioBuffers('voice', 2.0, 2.0, 0.05, 'discriminator');
    }

    this.originalSource = ctx.createBufferSource();
    this.originalSource.buffer = this.originalBuffer;
    this.originalSource.connect(ctx.destination);

    this.originalSource.onended = () => {
      this.originalSource = null;
      onEnded?.();
    };

    this.originalSource.start(0);
  }

  public stopOriginal(): void {
    if (this.originalSource) {
      try {
        this.originalSource.stop();
        this.originalSource.disconnect();
      } catch {
        // Ignore already stopped
      }
      this.originalSource = null;
    }
  }

  public playDemodulated(onEnded?: () => void): void {
    const ctx = this.getAudioContext();
    this.stopDemodulated();

    if (!this.demodBuffer) {
      this.generateAudioBuffers('voice', 2.0, 2.0, 0.05, 'discriminator');
    }

    this.demodSource = ctx.createBufferSource();
    this.demodSource.buffer = this.demodBuffer;
    this.demodSource.connect(ctx.destination);

    this.demodSource.onended = () => {
      this.demodSource = null;
      onEnded?.();
    };

    this.demodSource.start(0);
  }

  public stopDemodulated(): void {
    if (this.demodSource) {
      try {
        this.demodSource.stop();
        this.demodSource.disconnect();
      } catch {
        // Ignore already stopped
      }
      this.demodSource = null;
    }
  }

  public stopAll(): void {
    this.stopOriginal();
    this.stopDemodulated();
  }
}

export const fmAudioEngineInstance = new FmAudioEngine();
