/**
 * FM Audio Engine: Web Audio API synthesis & demodulation audio playback
 */

import {
  getBundledRadioVoiceClip,
  RADIO_STATIONS,
  RadioVoiceClip,
  RadioVoiceProfile,
} from './fmRadioEngine';

export interface RadioChannelSpec {
  id: string;
  programType: 'sine' | 'square' | 'voice' | 'dual';
  voiceProfile?: RadioVoiceProfile;
  fm: number;
}

export class FmAudioEngine {
  private audioCtx: AudioContext | null = null;
  private originalSource: AudioBufferSourceNode | null = null;
  private demodSource: AudioBufferSourceNode | null = null;
  private originalBuffer: AudioBuffer | null = null;
  private demodBuffer: AudioBuffer | null = null;

  // Cached Radio Channel Buffers & Live Continuous Mixer Nodes
  private cachedChannelBuffers: Map<string, AudioBuffer> = new Map();
  private cachedChannelClipRefs: Map<string, RadioVoiceClip | null> = new Map();
  private cachedNoiseBuffer: AudioBuffer | null = null;
  private radioChannelNodes: Map<string, { source: AudioBufferSourceNode; gain: GainNode }> = new Map();
  private radioNoiseNode: { source: AudioBufferSourceNode; gain: GainNode } | null = null;
  private radioPlaying: boolean = false;
  private currentStationGains: Record<string, number> = {};
  private currentNoiseGain: number = 0.05;
  private currentChannels: RadioChannelSpec[] = RADIO_STATIONS;

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

  private sampleClipInterpolated(
    clip: { samples: Float32Array; sampleRate: number },
    tSec: number
  ): number {
    const len = clip.samples.length;
    if (len === 0) return 0;
    const pos = ((tSec * clip.sampleRate) % len + len) % len;
    const i0 = Math.floor(pos) % len;
    const i1 = (i0 + 1) % len;
    const frac = pos - Math.floor(pos);
    return clip.samples[i0] * (1 - frac) + clip.samples[i1] * frac;
  }

  private buildStationBuffer(
    ctx: AudioContext,
    channel: RadioChannelSpec,
    overrideClip?: RadioVoiceClip | null
  ): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const stationMatch = RADIO_STATIONS.find((s) => s.id === channel.id);
    const activeClip =
      overrideClip && overrideClip.samples.length > 0
        ? overrideClip
        : stationMatch
        ? getBundledRadioVoiceClip(stationMatch)
        : null;

    let durationSec = 4.0;
    if (activeClip && activeClip.samples.length > 0) {
      const clipDur = activeClip.samples.length / activeClip.sampleRate;
      const repeats = Math.max(1, Math.ceil(1.2 / Math.max(0.1, clipDur)));
      durationSec = Math.min(15.0, clipDur * repeats);
    }

    const totalSamples = Math.max(1, Math.floor(sampleRate * durationSec));
    const buf = ctx.createBuffer(1, totalSamples, sampleRate);
    const data = buf.getChannelData(0);

    const fBase = Math.max(120, Math.round(channel.fm * 75));

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      let sample = 0;
      if (activeClip && activeClip.samples.length > 0) {
        sample = this.sampleClipInterpolated(activeClip, t);
      } else {
        // Synthesized voice fallback if bundled clip unavailable
        const env = 0.5 + 0.5 * Math.sin(2 * Math.PI * 1.6 * t);
        sample =
          (Math.sin(2 * Math.PI * fBase * t) +
            0.55 * Math.sin(2 * Math.PI * fBase * 2 * t + 0.3) +
            0.25 * Math.sin(2 * Math.PI * fBase * 3 * t + 0.6)) *
          env *
          0.6;
      }
      data[i] = Math.max(-0.95, Math.min(0.95, sample * 0.65));
    }

    return buf;
  }

  private ensureRadioBuffersCached(
    channels: RadioChannelSpec[],
    voiceOverrides?: Record<string, RadioVoiceClip | null>
  ): string[] {
    const ctx = this.getAudioContext();
    const updatedIds: string[] = [];

    if (!this.cachedNoiseBuffer) {
      const sr = ctx.sampleRate;
      const len = Math.floor(sr * 4.0);
      const nBuf = ctx.createBuffer(1, len, sr);
      const nData = nBuf.getChannelData(0);
      for (let i = 0; i < len; i++) {
        const u1 = Math.max(1e-6, Math.random());
        const u2 = Math.random();
        nData[i] = Math.max(-0.9, Math.min(0.9, Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) * 0.35));
      }
      this.cachedNoiseBuffer = nBuf;
    }

    for (const ch of channels) {
      const nextClipRef = voiceOverrides?.[ch.id] ?? null;
      const prevClipRef = this.cachedChannelClipRefs.get(ch.id) ?? null;
      if (!this.cachedChannelBuffers.has(ch.id) || prevClipRef !== nextClipRef) {
        this.cachedChannelClipRefs.set(ch.id, nextClipRef);
        this.cachedChannelBuffers.set(ch.id, this.buildStationBuffer(ctx, ch, nextClipRef));
        if (this.radioChannelNodes.has(ch.id)) {
          updatedIds.push(ch.id);
        }
      }
    }

    return updatedIds;
  }

  /**
   * Updates live channel & static noise gains smoothly without re-decoding or restarting
   * playing station audio sources when f_tune, B_rx, beta, or SNR change.
   */
  public updateRadioMix(
    channels: RadioChannelSpec[],
    stationGains: Record<string, number>,
    noiseGain: number,
    voiceOverrides?: Record<string, RadioVoiceClip | null>
  ): void {
    this.currentChannels = channels;
    this.currentStationGains = { ...stationGains };
    this.currentNoiseGain = noiseGain;

    const anyOverrideChanged = channels.some(
      (ch) => (this.cachedChannelClipRefs.get(ch.id) ?? null) !== (voiceOverrides?.[ch.id] ?? null)
    );

    if (!this.radioPlaying && !anyOverrideChanged) {
      return;
    }

    const updatedIds = this.ensureRadioBuffersCached(channels, voiceOverrides);

    if (!this.radioPlaying) return;
    const ctx = this.getAudioContext();
    const now = ctx.currentTime;

    // Only swap a channel node if its custom voice override changed while playing
    for (const chId of updatedIds) {
      const oldNode = this.radioChannelNodes.get(chId);
      if (oldNode) {
        try {
          oldNode.source.stop();
          oldNode.source.disconnect();
          oldNode.gain.disconnect();
        } catch {
          // Ignore
        }
        const buf = this.cachedChannelBuffers.get(chId);
        if (buf) {
          const src = ctx.createBufferSource();
          src.buffer = buf;
          src.loop = true;
          const gainNode = ctx.createGain();
          gainNode.gain.setValueAtTime(Math.max(0, stationGains[chId] ?? 0), now);
          src.connect(gainNode);
          gainNode.connect(ctx.destination);
          src.start(0);
          this.radioChannelNodes.set(chId, { source: src, gain: gainNode });
        }
      }
    }

    for (const [id, node] of this.radioChannelNodes.entries()) {
      const target = Math.max(0, Math.min(1, stationGains[id] ?? 0));
      node.gain.gain.setTargetAtTime(target, now, 0.025);
    }

    if (this.radioNoiseNode) {
      const targetNoise = Math.max(0, Math.min(1, noiseGain));
      this.radioNoiseNode.gain.gain.setTargetAtTime(targetNoise, now, 0.025);
    }
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
        this.originalSource.onended = null;
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
        this.demodSource.onended = null;
        this.demodSource.stop();
        this.demodSource.disconnect();
      } catch {
        // Ignore already stopped
      }
      this.demodSource = null;
    }
  }

  public playRadio(voiceOverrides?: Record<string, RadioVoiceClip | null>): void {
    const ctx = this.getAudioContext();
    this.stopRadio();
    const resolvedOverrides: Record<string, RadioVoiceClip | null> = {};
    for (const ch of this.currentChannels) {
      resolvedOverrides[ch.id] =
        voiceOverrides !== undefined ? (voiceOverrides[ch.id] ?? null) : (this.cachedChannelClipRefs.get(ch.id) ?? null);
    }
    this.ensureRadioBuffersCached(this.currentChannels, resolvedOverrides);

    const now = ctx.currentTime;
    for (const ch of this.currentChannels) {
      const buf = this.cachedChannelBuffers.get(ch.id);
      if (!buf) continue;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(Math.max(0, this.currentStationGains[ch.id] ?? 0), now);
      src.connect(gainNode);
      gainNode.connect(ctx.destination);
      src.start(0);
      this.radioChannelNodes.set(ch.id, { source: src, gain: gainNode });
    }

    if (this.cachedNoiseBuffer) {
      const nSrc = ctx.createBufferSource();
      nSrc.buffer = this.cachedNoiseBuffer;
      nSrc.loop = true;
      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(Math.max(0, this.currentNoiseGain), now);
      nSrc.connect(nGain);
      nGain.connect(ctx.destination);
      nSrc.start(0);
      this.radioNoiseNode = { source: nSrc, gain: nGain };
    }

    this.radioPlaying = true;
  }

  public stopRadio(): void {
    this.radioPlaying = false;
    for (const node of this.radioChannelNodes.values()) {
      try {
        node.source.stop();
        node.source.disconnect();
        node.gain.disconnect();
      } catch {
        // Ignore already stopped
      }
    }
    this.radioChannelNodes.clear();

    if (this.radioNoiseNode) {
      try {
        this.radioNoiseNode.source.stop();
        this.radioNoiseNode.source.disconnect();
        this.radioNoiseNode.gain.disconnect();
      } catch {
        // Ignore already stopped
      }
      this.radioNoiseNode = null;
    }
  }

  public stopAll(): void {
    this.stopOriginal();
    this.stopDemodulated();
    this.stopRadio();
  }
}

export const fmAudioEngineInstance = new FmAudioEngine();
