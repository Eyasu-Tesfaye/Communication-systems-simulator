/**
 * FM Audio Engine: Web Audio API synthesis & demodulation audio playback
 */

import {
  getBundledRadioVoiceClip,
  loadAllBundledRadioClips,
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

interface RadioChannelNodeChain {
  source: AudioBufferSourceNode | null;
  filter: BiquadFilterNode;
  gain: GainNode;
}

export interface RadioMixParams {
  stationGains: Record<string, number>;
  stationFilterCutoffs?: Record<string, number>;
  noiseGain: number;
  noiseFilterCutoff?: number;
  dominantChannelId?: string;
}

const TARGET_RADIO_RMS = 0.16;

export class FmAudioEngine {
  private audioCtx: AudioContext | null = null;
  private originalSource: AudioBufferSourceNode | null = null;
  private demodSource: AudioBufferSourceNode | null = null;
  private originalBuffer: AudioBuffer | null = null;
  private demodBuffer: AudioBuffer | null = null;

  // Cached Radio Channel Buffers (bundled cached once on load; overrides cached per-channel)
  private bundledMp3Clips: Map<string, RadioVoiceClip> = new Map();
  private cachedBundledChannelBuffers: Map<string, AudioBuffer> = new Map();
  private cachedOverrideChannelBuffers: Map<string, AudioBuffer> = new Map();
  private bundledChannelRms: Map<string, number> = new Map();
  private overrideChannelRms: Map<string, number> = new Map();
  private cachedChannelClipRefs: Map<string, RadioVoiceClip | null> = new Map();
  private cachedNoiseBuffer: AudioBuffer | null = null;
  private noiseBufferRms: number = TARGET_RADIO_RMS;

  // Persistent Live Continuous 4-Channel Mixer Nodes
  private radioChannelNodes: Map<string, RadioChannelNodeChain> = new Map();
  private radioNoiseNode: {
    source: AudioBufferSourceNode;
    filter: BiquadFilterNode;
    gain: GainNode;
  } | null = null;
  private radioCompressor: DynamicsCompressorNode | null = null;
  private radioMasterGain: GainNode | null = null;

  private radioPlaying: boolean = false;
  private radioStartTime: number = 0;
  private currentStationGains: Record<string, number> = {};
  private currentStationCutoffs: Record<string, number> = {};
  private currentNoiseGain: number = 0.05;
  private currentNoiseCutoff: number = 5000;
  private currentDominantChannelId: string | undefined = undefined;
  private currentChannels: RadioChannelSpec[] = RADIO_STATIONS;

  constructor() {
    // Lazy AudioContext initialization on load or user interaction
  }

  private getAudioContext(resumeIfNeeded: boolean = false): AudioContext {
    if (!this.audioCtx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (resumeIfNeeded && this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume().catch(() => {});
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
    const ctx = this.getAudioContext(false);
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
  ): { buffer: AudioBuffer; rms: number } {
    const sampleRate = ctx.sampleRate;
    const stationMatch = RADIO_STATIONS.find((s) => s.id === channel.id);
    const activeClip =
      overrideClip && overrideClip.samples.length > 0
        ? overrideClip
        : this.bundledMp3Clips.get(channel.id) ??
          (stationMatch ? getBundledRadioVoiceClip(stationMatch) : null);

    let durationSec = 4.0;
    if (activeClip && activeClip.samples.length > 0) {
      const clipDur = activeClip.samples.length / activeClip.sampleRate;
      const repeats = Math.max(1, Math.ceil(1.2 / Math.max(0.1, clipDur)));
      durationSec = Math.min(20.0, clipDur * repeats);
    }

    const totalSamples = Math.max(1, Math.floor(sampleRate * durationSec));
    const buf = ctx.createBuffer(1, totalSamples, sampleRate);
    const data = buf.getChannelData(0);

    const fBase = Math.max(120, Math.round(channel.fm * 75));

    let mean = 0;
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
      data[i] = sample;
      mean += sample;
    }

    mean /= totalSamples;
    let sumSq = 0;
    let peak = 0;
    for (let i = 0; i < totalSamples; i++) {
      const v = data[i] - mean;
      data[i] = v;
      sumSq += v * v;
      const a = Math.abs(v);
      if (a > peak) peak = a;
    }

    const rawRms = Math.sqrt(sumSq / totalSamples);
    const scale =
      rawRms > 1e-6 && peak > 1e-6
        ? Math.min(0.92 / peak, TARGET_RADIO_RMS / rawRms)
        : 0.65;

    let finalSumSq = 0;
    for (let i = 0; i < totalSamples; i++) {
      const scaled = Math.max(-0.95, Math.min(0.95, data[i] * scale));
      data[i] = scaled;
      finalSumSq += scaled * scaled;
    }

    const actualRms = Math.max(1e-4, Math.sqrt(finalSumSq / totalSamples));
    return { buffer: buf, rms: actualRms };
  }

  private getActiveChannelBuffer(channelId: string): AudioBuffer | undefined {
    return (
      this.cachedOverrideChannelBuffers.get(channelId) ??
      this.cachedBundledChannelBuffers.get(channelId)
    );
  }

  private getActiveChannelRms(channelId: string): number {
    return (
      this.overrideChannelRms.get(channelId) ??
      this.bundledChannelRms.get(channelId) ??
      TARGET_RADIO_RMS
    );
  }

  /**
   * Decodes/builds and caches all 4 bundled channel buffers (CH 1-CH 4) and static noise buffer once on load.
   * Subsequent calls only update the single channel whose override changed.
   */
  public preloadRadioBuffers(
    channels: RadioChannelSpec[] = RADIO_STATIONS,
    voiceOverrides?: Record<string, RadioVoiceClip | null>
  ): void {
    this.currentChannels = channels;
    try {
      this.ensureRadioBuffersCached(channels, voiceOverrides);
    } catch {
      // Ignore if AudioContext creation is deferred by browser autoplay policy until gesture
    }
  }

  /**
   * Fetches and decodes /audio/CH1.mp3-/audio/CH4.mp3 once on load, caching their
   * AudioBuffers as the default voices for CH 1-CH 4 and seamlessly upgrading any
   * currently playing un-overridden channel.
   */
  public async preloadRadioAssets(
    channels: RadioChannelSpec[] = RADIO_STATIONS
  ): Promise<Record<string, RadioVoiceClip>> {
    this.preloadRadioBuffers(channels);
    const clips = await loadAllBundledRadioClips(this.audioCtx);
    const entries = Object.entries(clips);
    if (entries.length === 0) return clips;

    const newlyLoadedIds = new Set<string>();
    for (const [chId, clip] of entries) {
      if (this.bundledMp3Clips.get(chId) !== clip) {
        this.bundledMp3Clips.set(chId, clip);
        newlyLoadedIds.add(chId);
      }
    }

    if (newlyLoadedIds.size === 0) {
      return clips;
    }

    try {
      const ctx = this.getAudioContext(false);
      for (const ch of channels) {
        if (!newlyLoadedIds.has(ch.id)) continue;
        const { buffer: mp3Buf, rms } = this.buildStationBuffer(ctx, ch, null);
        this.cachedBundledChannelBuffers.set(ch.id, mp3Buf);
        this.bundledChannelRms.set(ch.id, rms);
        if (this.radioPlaying && !this.cachedChannelClipRefs.get(ch.id)) {
          this.replaceChannelSource(ctx, ch.id, mp3Buf, false);
        }
      }
    } catch {
      // If AudioContext cannot be created yet, bundledMp3Clips will be used on first playRadio()
    }

    return clips;
  }

  private ensureRadioBuffersCached(
    channels: RadioChannelSpec[],
    voiceOverrides?: Record<string, RadioVoiceClip | null>
  ): string[] {
    const ctx = this.getAudioContext(false);
    const updatedIds: string[] = [];

    if (!this.cachedNoiseBuffer) {
      const sr = ctx.sampleRate;
      const len = Math.floor(sr * 4.0);
      const nBuf = ctx.createBuffer(1, len, sr);
      const nData = nBuf.getChannelData(0);

      // Generate audio-band AWGN (~4.5 kHz lowpass) so receiver output power matches voice band
      const alpha = Math.exp((-2 * Math.PI * 4500) / sr);
      let lp1 = 0;
      let lp2 = 0;
      let mean = 0;
      for (let i = 0; i < len; i++) {
        const u1 = Math.max(1e-6, Math.random());
        const u2 = Math.random();
        const white = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
        lp1 = (1 - alpha) * white + alpha * lp1;
        lp2 = (1 - alpha) * lp1 + alpha * lp2;
        nData[i] = lp2;
        mean += lp2;
      }

      mean /= len;
      let sumSq = 0;
      for (let i = 0; i < len; i++) {
        const v = nData[i] - mean;
        nData[i] = v;
        sumSq += v * v;
      }
      const rawRms = Math.max(1e-6, Math.sqrt(sumSq / len));
      const scale = TARGET_RADIO_RMS / rawRms;
      let finalSumSq = 0;
      for (let i = 0; i < len; i++) {
        const v = Math.max(-0.95, Math.min(0.95, nData[i] * scale));
        nData[i] = v;
        finalSumSq += v * v;
      }
      this.noiseBufferRms = Math.max(1e-4, Math.sqrt(finalSumSq / len));
      this.cachedNoiseBuffer = nBuf;
    }

    for (const ch of channels) {
      // Build & cache each station's bundled voice AudioBuffer once
      if (!this.cachedBundledChannelBuffers.has(ch.id)) {
        const built = this.buildStationBuffer(ctx, ch, null);
        this.cachedBundledChannelBuffers.set(ch.id, built.buffer);
        this.bundledChannelRms.set(ch.id, built.rms);
      }

      // Only rebuild/swap the single channel whose override clip reference changed
      const nextClipRef = voiceOverrides?.[ch.id] ?? null;
      const prevClipRef = this.cachedChannelClipRefs.get(ch.id) ?? null;
      if (prevClipRef !== nextClipRef) {
        this.cachedChannelClipRefs.set(ch.id, nextClipRef);
        if (nextClipRef && nextClipRef.samples.length > 0) {
          const built = this.buildStationBuffer(ctx, ch, nextClipRef);
          this.cachedOverrideChannelBuffers.set(ch.id, built.buffer);
          this.overrideChannelRms.set(ch.id, built.rms);
        } else {
          this.cachedOverrideChannelBuffers.delete(ch.id);
          this.overrideChannelRms.delete(ch.id);
        }
        if (this.radioChannelNodes.has(ch.id)) {
          updatedIds.push(ch.id);
        }
      }
    }

    return updatedIds;
  }

  private stopAndDisconnectSource(src: AudioBufferSourceNode | null | undefined): void {
    if (!src) return;
    try {
      src.onended = null;
      src.stop();
    } catch {
      // Ignore if source was not started or already stopped
    }
    try {
      src.disconnect();
    } catch {
      // Ignore if already disconnected
    }
  }

  private computeCalibratedGains(
    stationGains: Record<string, number>,
    noiseGain: number,
    dominantChannelId?: string
  ): { stationGains: Record<string, number>; noiseGain: number } {
    let domId = dominantChannelId;
    if (!domId) {
      let bestGain = -1;
      for (const [id, g] of Object.entries(stationGains)) {
        if (g > bestGain) {
          bestGain = g;
          domId = id;
        }
      }
    }

    const domRms = domId ? this.getActiveChannelRms(domId) : TARGET_RADIO_RMS;
    const noiseRms = this.noiseBufferRms || TARGET_RADIO_RMS;
    const refRms = Math.min(domRms, noiseRms);

    const calibratedStationGains: Record<string, number> = {};
    for (const ch of this.currentChannels) {
      const g = stationGains[ch.id] ?? 0;
      const chRms = this.getActiveChannelRms(ch.id);
      calibratedStationGains[ch.id] = Math.max(0, Math.min(1, g * (refRms / Math.max(1e-4, chRms))));
    }

    const calibratedNoiseGain = Math.max(
      0,
      Math.min(1, noiseGain * (refRms / Math.max(1e-4, noiseRms)))
    );

    return {
      stationGains: calibratedStationGains,
      noiseGain: calibratedNoiseGain,
    };
  }

  private replaceChannelSource(
    ctx: AudioContext,
    chId: string,
    newBuffer: AudioBuffer,
    isCustomOverride: boolean
  ): void {
    const chain = this.radioChannelNodes.get(chId);
    if (!chain) return;

    // Always stop and disconnect any active source node on this channel before starting replacement
    this.stopAndDisconnectSource(chain.source);
    chain.source = null;

    const calibrated = this.computeCalibratedGains(
      this.currentStationGains,
      this.currentNoiseGain,
      this.currentDominantChannelId
    );
    const now = ctx.currentTime;
    const targetGain = Math.max(0, Math.min(1, calibrated.stationGains[chId] ?? 0));
    chain.gain.gain.cancelScheduledValues(now);
    chain.gain.gain.setValueAtTime(0, now);
    chain.gain.gain.setTargetAtTime(targetGain, now + 0.004, 0.015);

    const newSrc = ctx.createBufferSource();
    newSrc.buffer = newBuffer;
    newSrc.loop = true;
    newSrc.connect(chain.filter);

    const startOffset =
      !isCustomOverride && newBuffer.duration > 0.02
        ? Math.min(
            newBuffer.duration - 0.01,
            Math.max(0, (now - this.radioStartTime) % newBuffer.duration)
          )
        : 0;
    newSrc.start(now, startOffset);

    chain.source = newSrc;
  }

  /**
   * Adjusts live channel GainNode & BiquadFilterNode parameters smoothly via setTargetAtTime.
   * Completely decoupled from AudioBufferSourceNode creation or playback restarts so tuning
   * sweeps (f_tune, B_rx, Narrow/Nominal/Wide, SNR) never restart or stack sources.
   */
  public updateRadioMix(mixParams: RadioMixParams): void {
    this.currentStationGains = { ...mixParams.stationGains };
    this.currentStationCutoffs = { ...(mixParams.stationFilterCutoffs || {}) };
    this.currentNoiseGain = mixParams.noiseGain;
    this.currentNoiseCutoff = mixParams.noiseFilterCutoff ?? 5000;
    this.currentDominantChannelId = mixParams.dominantChannelId;

    if (!this.radioPlaying || !this.audioCtx) {
      return;
    }

    const calibrated = this.computeCalibratedGains(
      mixParams.stationGains,
      mixParams.noiseGain,
      mixParams.dominantChannelId
    );
    const now = this.audioCtx.currentTime;

    for (const [id, chain] of this.radioChannelNodes.entries()) {
      const targetGain = Math.max(0, Math.min(1, calibrated.stationGains[id] ?? 0));
      chain.gain.gain.setTargetAtTime(targetGain, now, 0.02);

      const targetCutoff = Math.max(400, Math.min(8000, this.currentStationCutoffs[id] ?? 5200));
      chain.filter.frequency.setTargetAtTime(targetCutoff, now, 0.03);
    }

    if (this.radioNoiseNode) {
      const targetNoise = Math.max(0, Math.min(1, calibrated.noiseGain));
      this.radioNoiseNode.gain.gain.setTargetAtTime(targetNoise, now, 0.02);
      const targetNoiseCutoff = Math.max(1200, Math.min(7500, this.currentNoiseCutoff));
      this.radioNoiseNode.filter.frequency.setTargetAtTime(targetNoiseCutoff, now, 0.03);
    }
  }

  /**
   * Updates cached override buffers and replaces ONLY the channel(s) whose custom clip
   * changed (Override CH X Audio or Reset), stopping and disconnecting the active source first.
   */
  public syncRadioChannelOverrides(
    channels: RadioChannelSpec[],
    voiceOverrides: Record<string, RadioVoiceClip | null>
  ): void {
    this.currentChannels = channels;
    const anyOverrideChanged = channels.some(
      (ch) => (this.cachedChannelClipRefs.get(ch.id) ?? null) !== (voiceOverrides?.[ch.id] ?? null)
    );
    if (!anyOverrideChanged) {
      return;
    }

    let updatedIds: string[] = [];
    try {
      updatedIds = this.ensureRadioBuffersCached(channels, voiceOverrides);
    } catch {
      return;
    }

    if (!this.radioPlaying || updatedIds.length === 0) {
      return;
    }

    const ctx = this.getAudioContext(true);
    for (const chId of updatedIds) {
      const buf = this.getActiveChannelBuffer(chId);
      if (buf) {
        this.replaceChannelSource(ctx, chId, buf, Boolean(voiceOverrides?.[chId]));
      }
    }

    const calibrated = this.computeCalibratedGains(
      this.currentStationGains,
      this.currentNoiseGain,
      this.currentDominantChannelId
    );
    const now = ctx.currentTime;
    for (const [id, chain] of this.radioChannelNodes.entries()) {
      chain.gain.gain.setTargetAtTime(
        Math.max(0, Math.min(1, calibrated.stationGains[id] ?? 0)),
        now,
        0.02
      );
    }
    if (this.radioNoiseNode) {
      this.radioNoiseNode.gain.gain.setTargetAtTime(
        Math.max(0, Math.min(1, calibrated.noiseGain)),
        now,
        0.02
      );
    }
  }

  public playOriginal(onEnded?: () => void): void {
    const ctx = this.getAudioContext(true);
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
    const ctx = this.getAudioContext(true);
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
    const ctx = this.getAudioContext(true);
    this.stopRadio();

    const resolvedOverrides: Record<string, RadioVoiceClip | null> = {};
    for (const ch of this.currentChannels) {
      resolvedOverrides[ch.id] =
        voiceOverrides !== undefined
          ? (voiceOverrides[ch.id] ?? null)
          : (this.cachedChannelClipRefs.get(ch.id) ?? null);
    }
    this.ensureRadioBuffersCached(this.currentChannels, resolvedOverrides);

    const now = ctx.currentTime;
    this.radioStartTime = now;

    // Shared safety peak limiter + fade-in master gain (threshold at -6 dB preserves SNR power ratios)
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-6, now);
    compressor.knee.setValueAtTime(10, now);
    compressor.ratio.setValueAtTime(4, now);
    compressor.attack.setValueAtTime(0.005, now);
    compressor.release.setValueAtTime(0.12, now);

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0, now);
    masterGain.gain.linearRampToValueAtTime(0.95, now + 0.02);

    compressor.connect(masterGain);
    masterGain.connect(ctx.destination);
    this.radioCompressor = compressor;
    this.radioMasterGain = masterGain;

    const calibrated = this.computeCalibratedGains(
      this.currentStationGains,
      this.currentNoiseGain,
      this.currentDominantChannelId
    );

    // Start all 4 looping channel sources simultaneously through individual filter & GainNodes
    for (const ch of this.currentChannels) {
      const buf = this.getActiveChannelBuffer(ch.id);
      if (!buf) continue;

      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.Q.setValueAtTime(0.75, now);
      filter.frequency.setValueAtTime(
        Math.max(400, Math.min(8000, this.currentStationCutoffs[ch.id] ?? 5200)),
        now
      );

      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(
        Math.max(0, Math.min(1, calibrated.stationGains[ch.id] ?? 0)),
        now
      );

      src.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(compressor);
      src.start(now);

      this.radioChannelNodes.set(ch.id, {
        source: src,
        filter,
        gain: gainNode,
      });
    }

    if (this.cachedNoiseBuffer) {
      const nSrc = ctx.createBufferSource();
      nSrc.buffer = this.cachedNoiseBuffer;
      nSrc.loop = true;

      const nFilter = ctx.createBiquadFilter();
      nFilter.type = 'lowpass';
      nFilter.Q.setValueAtTime(0.7, now);
      nFilter.frequency.setValueAtTime(
        Math.max(1200, Math.min(7500, this.currentNoiseCutoff)),
        now
      );

      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(Math.max(0, Math.min(1, calibrated.noiseGain)), now);

      nSrc.connect(nFilter);
      nFilter.connect(nGain);
      nGain.connect(compressor);
      nSrc.start(now);

      this.radioNoiseNode = { source: nSrc, filter: nFilter, gain: nGain };
    }

    this.radioPlaying = true;
  }

  public stopRadio(): void {
    this.radioPlaying = false;

    for (const chain of this.radioChannelNodes.values()) {
      this.stopAndDisconnectSource(chain.source);
      chain.source = null;
      try {
        chain.filter.disconnect();
        chain.gain.disconnect();
      } catch {
        // Ignore already disconnected
      }
    }
    this.radioChannelNodes.clear();

    if (this.radioNoiseNode) {
      this.stopAndDisconnectSource(this.radioNoiseNode.source);
      try {
        this.radioNoiseNode.filter.disconnect();
        this.radioNoiseNode.gain.disconnect();
      } catch {
        // Ignore already disconnected
      }
      this.radioNoiseNode = null;
    }

    if (this.radioCompressor) {
      try {
        this.radioCompressor.disconnect();
      } catch {
        // Ignore
      }
      this.radioCompressor = null;
    }

    if (this.radioMasterGain) {
      try {
        this.radioMasterGain.disconnect();
      } catch {
        // Ignore
      }
      this.radioMasterGain = null;
    }
  }

  public stopAll(): void {
    this.stopOriginal();
    this.stopDemodulated();
    this.stopRadio();
  }
}

export const fmAudioEngineInstance = new FmAudioEngine();
