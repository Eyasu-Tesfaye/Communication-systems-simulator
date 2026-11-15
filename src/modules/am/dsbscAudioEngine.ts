/**
 * DSB-SC Web Audio Engine
 * Real sample-rate Double Sideband Suppressed Carrier modulation,
 * non-coherent envelope failure comparison, coherent product demodulation,
 * 4th-order Butterworth LPF (cascaded BiquadFilterNodes), and live AnalyserNode telemetry.
 */

export type AudioSourceType = 'melody' | 'voice' | 'chord' | 'tone' | 'mic' | 'upload';
export type AudioProbeStage = 'original' | 'dsbsc' | 'envelope' | 'coherent';

export interface DsbScAudioParams {
  sourceType: AudioSourceType;
  probeStage: AudioProbeStage;
  fcAudio: number;       // Audible carrier frequency in Hz (1600 - 4500)
  thetaDeg: number;      // Receiver LO phase error (-180 to 180 deg)
  freqOffsetHz: number;  // Receiver LO frequency offset Δf (-250 to 250 Hz)
  lpfEnabled: boolean;   // Enable/bypass 4th-order Butterworth LPF
  lpfCutoffHz: number;   // LPF cutoff frequency (300 - 6000 Hz)
  noiseLevel: number;    // Channel AWGN amplitude (0 - 0.35)
  volume: number;        // Master output gain (0 - 1)
}

export interface DecodedAudioInfo {
  samples: Float32Array;
  sampleRate: number;
  durationSec: number;
  name: string;
}

const DEFAULT_DURATION_SEC = 4.0;

/**
 * Decode a File or recorded Blob into a normalized mono Float32Array
 * capped at 8 seconds so real-time DSB-SC DSP remains instant.
 */
export async function decodeAudioBlob(blob: Blob, name: string): Promise<DecodedAudioInfo> {
  const AudioCtxClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const tempCtx = new AudioCtxClass();
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const decoded = await tempCtx.decodeAudioData(arrayBuffer);
    const sampleRate = decoded.sampleRate;
    const maxSamples = Math.min(decoded.length, Math.floor(sampleRate * 8.0));
    const mono = new Float32Array(maxSamples);

    const channels = decoded.numberOfChannels;
    for (let ch = 0; ch < channels; ch++) {
      const chData = decoded.getChannelData(ch);
      for (let i = 0; i < maxSamples; i++) {
        mono[i] += chData[i] / channels;
      }
    }

    // Peak normalize to 0.9
    let peak = 0;
    for (let i = 0; i < maxSamples; i++) {
      const a = Math.abs(mono[i]);
      if (a > peak) peak = a;
    }
    if (peak > 1e-4) {
      const scale = 0.9 / peak;
      for (let i = 0; i < maxSamples; i++) {
        mono[i] *= scale;
      }
    }

    return {
      samples: mono,
      sampleRate,
      durationSec: maxSamples / sampleRate,
      name,
    };
  } finally {
    await tempCtx.close().catch(() => {});
  }
}

export async function decodeUploadedAudioFile(file: File): Promise<DecodedAudioInfo> {
  return decodeAudioBlob(file, file.name);
}

export class DsbScAudioEngine {
  private audioCtx: AudioContext | null = null;
  private sourceNode: AudioBufferSourceNode | null = null;
  private lpfStage1: BiquadFilterNode | null = null;
  private lpfStage2: BiquadFilterNode | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;

  private activeBuffer: AudioBuffer | null = null;
  private previewWaveform: Float32Array = new Float32Array(512);
  private timeDomainScratch: Float32Array<ArrayBuffer> = new Float32Array(new ArrayBuffer(2048 * 4));
  private freqDomainScratch: Uint8Array<ArrayBuffer> = new Uint8Array(new ArrayBuffer(1024));

  private isPlayingState = false;
  private playbackStartCtxTime = 0;
  private playbackOffsetSec = 0;
  private currentDurationSec = DEFAULT_DURATION_SEC;

  // Microphone Recording State
  private micStream: MediaStream | null = null;
  private micSourceNode: MediaStreamAudioSourceNode | null = null;
  private micAnalyser: AnalyserNode | null = null;
  private micRecorder: MediaRecorder | null = null;
  private micChunks: BlobPart[] = [];
  private micTimeScratch: Float32Array<ArrayBuffer> = new Float32Array(new ArrayBuffer(2048 * 4));
  private micStopResolve: ((info: DecodedAudioInfo) => void) | null = null;
  private micStopReject: ((err: Error) => void) | null = null;
  private micStartTs = 0;

  private ensureContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
    }
    if (this.audioCtx.state === 'suspended') {
      void this.audioCtx.resume();
    }

    if (!this.lpfStage1 || !this.lpfStage2 || !this.masterGain || !this.analyser) {
      // Exact 4th-order Butterworth cascade: Q1 = 0.5412, Q2 = 1.3066
      this.lpfStage1 = this.audioCtx.createBiquadFilter();
      this.lpfStage1.type = 'lowpass';
      this.lpfStage1.Q.value = 0.5412;

      this.lpfStage2 = this.audioCtx.createBiquadFilter();
      this.lpfStage2.type = 'lowpass';
      this.lpfStage2.Q.value = 1.3066;

      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = 0.7;

      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 2048;
      this.analyser.smoothingTimeConstant = 0.75;

      this.lpfStage1.connect(this.lpfStage2);
      this.lpfStage2.connect(this.masterGain);
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);

      this.timeDomainScratch = new Float32Array(new ArrayBuffer(this.analyser.fftSize * 4));
      this.freqDomainScratch = new Uint8Array(new ArrayBuffer(this.analyser.frequencyBinCount));
    }

    return this.audioCtx;
  }

  /**
   * Pre-render an unmistakable, normalized baseband message buffer m(t) for built-in sources
   * so listeners can immediately discern the sound before modulation, during DSB-SC, and after demodulation.
   */
  private buildBuiltInMessageBuffer(
    sourceType: AudioSourceType,
    sampleRate: number
  ): { samples: Float32Array; durationSec: number } {
    const durationSec =
      sourceType === 'melody' || sourceType === 'chord'
        ? 4.8
        : sourceType === 'voice'
        ? 4.4
        : 4.0;
    const totalSamples = Math.max(1024, Math.floor(sampleRate * durationSec));
    const buf = new Float32Array(totalSamples);

    if (sourceType === 'tone') {
      // Crisp pulsed 440 Hz + 880 Hz acoustic chime pings with clear silent gaps
      const pingTimes = [0.1, 1.05, 2.0, 2.95];
      const pingDur = 0.6;
      for (let i = 0; i < totalSamples; i++) {
        const t = i / sampleRate;
        let val = 0;
        for (const start of pingTimes) {
          const dt = t - start;
          if (dt >= 0 && dt < pingDur) {
            const attack = Math.min(1, dt / 0.012);
            const decay = Math.exp(-dt * 4.5);
            const endFade = Math.min(1, (pingDur - dt) / 0.03);
            const env = attack * decay * endFade;
            val +=
              env *
              (0.76 * Math.sin(2 * Math.PI * 440 * dt) +
                0.22 * Math.sin(2 * Math.PI * 880 * dt) +
                0.08 * Math.sin(2 * Math.PI * 1320 * dt));
          }
        }
        buf[i] = val;
      }
    } else if (sourceType === 'chord') {
      // Clear 4-chord acoustic progression (C -> F -> G7 -> C) with gentle arpeggio attack & pauses
      const chords: Array<{ start: number; dur: number; freqs: number[] }> = [
        { start: 0.06, dur: 1.04, freqs: [261.63, 329.63, 392.0, 523.25] },   // C major
        { start: 1.22, dur: 1.04, freqs: [174.61, 261.63, 349.23, 440.0] },   // F major
        { start: 2.38, dur: 1.04, freqs: [196.0, 293.66, 392.0, 493.88] },    // G major
        { start: 3.54, dur: 1.08, freqs: [261.63, 329.63, 392.0, 523.25] },   // C major resolve
      ];
      for (let i = 0; i < totalSamples; i++) {
        const t = i / sampleRate;
        let val = 0;
        for (const ch of chords) {
          const dt = t - ch.start;
          if (dt >= 0 && dt < ch.dur) {
            ch.freqs.forEach((f, noteIdx) => {
              const ndt = dt - noteIdx * 0.045;
              if (ndt > 0) {
                const attack = Math.min(1, ndt / 0.015);
                const decay = Math.exp(-ndt * 1.9);
                const rel = Math.min(1, (ch.dur - dt) / 0.06);
                val +=
                  attack *
                  decay *
                  rel *
                  (0.75 * Math.sin(2 * Math.PI * f * ndt) +
                    0.22 * Math.sin(2 * Math.PI * (2 * f) * ndt));
              }
            });
          }
        }
        buf[i] = val;
      }
    } else if (sourceType === 'voice') {
      // True Rosenberg glottal pulse train + 3 parallel biquad vocal tract formants (F1, F2, F3)
      // Speaks 4 unmistakable vowel syllables: "Ah" -> "Ee" -> "Oh" -> "Oo" with silent pauses
      const syllables = [
        { start: 0.12, dur: 0.72, f0Start: 138, f0End: 162, f1: 730, bw1: 75, f2: 1090, bw2: 95, f3: 1850, bw3: 130 },  // "Ah"
        { start: 1.12, dur: 0.72, f0Start: 158, f0End: 175, f1: 310, bw1: 60, f2: 1880, bw2: 110, f3: 2050, bw3: 140 }, // "Ee"
        { start: 2.12, dur: 0.72, f0Start: 164, f0End: 144, f1: 480, bw1: 70, f2: 840, bw2: 85, f3: 1820, bw3: 130 },   // "Oh"
        { start: 3.12, dur: 0.88, f0Start: 145, f0End: 116, f1: 340, bw1: 65, f2: 880, bw2: 85, f3: 1780, bw3: 130 },   // "Oo"
      ];

      // 3-resonator filter state
      let y1a = 0, y2a = 0, y1b = 0, y2b = 0, y1c = 0, y2c = 0;
      let glottalPhase = 0;
      let prevGlottal = 0;
      let noiseRng = 987651;

      for (let i = 0; i < totalSamples; i++) {
        const t = i / sampleRate;
        let activeSyl: (typeof syllables)[number] | null = null;
        for (const syl of syllables) {
          if (t >= syl.start && t < syl.start + syl.dur) {
            activeSyl = syl;
            break;
          }
        }

        if (!activeSyl) {
          // Exponentially let resonators ring down naturally during silence
          y1a *= 0.992; y2a *= 0.992;
          y1b *= 0.992; y2b *= 0.992;
          y1c *= 0.992; y2c *= 0.992;
          buf[i] = 0.55 * y1a + 0.38 * y1b + 0.18 * y1c;
          continue;
        }

        const dt = t - activeSyl.start;
        const u = dt / activeSyl.dur;
        const f0 =
          activeSyl.f0Start +
          (activeSyl.f0End - activeSyl.f0Start) * u +
          2.2 * Math.sin(2 * Math.PI * 5.2 * dt);

        glottalPhase = (glottalPhase + f0 / sampleRate) % 1;
        // Rosenberg glottal wave (open phase 0..0.62)
        const tp = 0.42;
        const tn = 0.18;
        let glottal = 0;
        if (glottalPhase < tp) {
          glottal = 0.5 * (1 - Math.cos((Math.PI * glottalPhase) / tp));
        } else if (glottalPhase < tp + tn) {
          glottal = Math.cos((Math.PI * (glottalPhase - tp)) / (2 * tn));
        }
        // Derivative of glottal pulse gives natural -6dB/oct radiation slope
        const glottalDeriv = glottal - prevGlottal;
        prevGlottal = glottal;

        // Subtle /h/ breath aspiration at the very start of each syllable
        noiseRng = (noiseRng * 1664525 + 1013904223) >>> 0;
        const white = (noiseRng / 4294967296) * 2 - 1;
        const breathEnv = Math.exp(-dt * 24) * 0.04;
        const voiceEnv = Math.min(1, dt / 0.03) * Math.min(1, (activeSyl.dur - dt) / 0.055);
        const excitation = (glottalDeriv * 2.4 + white * breathEnv) * voiceEnv;

        // Update 3 parallel 2-pole resonators (F1, F2, F3)
        const stepResonator = (x: number, f: number, bw: number, y1: number, y2: number) => {
          const r = Math.exp((-Math.PI * bw) / sampleRate);
          const a1 = -2 * r * Math.cos((2 * Math.PI * f) / sampleRate);
          const a2 = r * r;
          const y0 = (1 - r) * x - a1 * y1 - a2 * y2;
          return [y0, y1] as const;
        };

        const [n1a, n2a] = stepResonator(excitation, activeSyl.f1, activeSyl.bw1, y1a, y2a);
        y1a = n1a; y2a = n2a;
        const [n1b, n2b] = stepResonator(excitation, activeSyl.f2, activeSyl.bw2, y1b, y2b);
        y1b = n1b; y2b = n2b;
        const [n1c, n2c] = stepResonator(excitation, activeSyl.f3, activeSyl.bw3, y1c, y2c);
        y1c = n1c; y2c = n2c;

        buf[i] = 0.65 * y1a + 0.48 * y1b + 0.2 * y1c;
      }
    } else {
      // 'melody' (Default): Unmistakable "Ode to Joy" 15-note acoustic piano/chime phrase
      // Fundamental notes 261-392 Hz + clean harmonics (< 1600 Hz) and short inter-note pauses
      const notes: Array<{ freq: number; start: number; dur: number }> = [
        { freq: 329.63, start: 0.06, dur: 0.25 }, // E4
        { freq: 329.63, start: 0.34, dur: 0.25 }, // E4
        { freq: 349.23, start: 0.62, dur: 0.25 }, // F4
        { freq: 392.00, start: 0.90, dur: 0.25 }, // G4
        { freq: 392.00, start: 1.18, dur: 0.25 }, // G4
        { freq: 349.23, start: 1.46, dur: 0.25 }, // F4
        { freq: 329.63, start: 1.74, dur: 0.25 }, // E4
        { freq: 293.66, start: 2.02, dur: 0.25 }, // D4
        { freq: 261.63, start: 2.30, dur: 0.25 }, // C4
        { freq: 261.63, start: 2.58, dur: 0.25 }, // C4
        { freq: 293.66, start: 2.86, dur: 0.25 }, // D4
        { freq: 329.63, start: 3.14, dur: 0.25 }, // E4
        { freq: 329.63, start: 3.42, dur: 0.38 }, // E4 (dotted)
        { freq: 293.66, start: 3.84, dur: 0.16 }, // D4
        { freq: 293.66, start: 4.04, dur: 0.48 }, // D4 (hold)
      ];

      for (let i = 0; i < totalSamples; i++) {
        const t = i / sampleRate;
        let val = 0;
        for (const n of notes) {
          const dt = t - n.start;
          if (dt >= 0 && dt < n.dur) {
            const attack = Math.min(1, dt / 0.008);
            const decay = Math.exp(-dt * 4.2);
            const release = Math.min(1, (n.dur - dt) / 0.028);
            const env = attack * decay * release;
            const h1 = Math.sin(2 * Math.PI * n.freq * dt);
            const h2 = 0.42 * Math.sin(2 * Math.PI * (2 * n.freq) * dt);
            const h3 = 0.18 * Math.sin(2 * Math.PI * (3 * n.freq) * dt) * Math.exp(-dt * 3.0);
            const h4 = 0.08 * Math.sin(2 * Math.PI * (4 * n.freq) * dt) * Math.exp(-dt * 6.0);
            val += env * (h1 + h2 + h3 + h4);
          }
        }
        buf[i] = val;
      }
    }

    // Peak-normalize built-in message to 0.85 so Before / Modulated / After have balanced loudness
    let peak = 0;
    for (let i = 0; i < totalSamples; i++) {
      const a = Math.abs(buf[i]);
      if (a > peak) peak = a;
    }
    if (peak > 1e-4) {
      const scale = 0.85 / peak;
      for (let i = 0; i < totalSamples; i++) {
        buf[i] *= scale;
      }
    }

    return { samples: buf, durationSec };
  }

  /**
   * Build the AudioBuffer for the chosen probe stage and update live LPF/gain nodes.
   */
  public prepareBuffer(
    params: DsbScAudioParams,
    uploaded: DecodedAudioInfo | null
  ): { durationSec: number; previewSamples: Float32Array } {
    const ctx = this.ensureContext();
    const sampleRate = ctx.sampleRate;

    const useSampled =
      (params.sourceType === 'upload' || params.sourceType === 'mic') &&
      uploaded &&
      uploaded.samples.length > 0;

    let durationSec: number;
    let builtInSamples: Float32Array | null = null;
    if (useSampled && uploaded) {
      durationSec = uploaded.durationSec;
    } else {
      const builtIn = this.buildBuiltInMessageBuffer(params.sourceType, sampleRate);
      builtInSamples = builtIn.samples;
      durationSec = builtIn.durationSec;
    }

    const totalSamples = Math.max(1024, Math.floor(sampleRate * durationSec));
    this.currentDurationSec = durationSec;

    const buf = ctx.createBuffer(1, totalSamples, sampleRate);
    const out = buf.getChannelData(0);

    const thetaRad = (params.thetaDeg * Math.PI) / 180;
    const twoPiFc = 2 * Math.PI * params.fcAudio;
    const twoPiFrx = 2 * Math.PI * (params.fcAudio + params.freqOffsetHz);

    // Deterministic lightweight PRNG for smooth repeatable AWGN noise texture
    let rngState = 133742;
    const nextGauss = () => {
      rngState = (rngState * 1664525 + 1013904223) >>> 0;
      const u1 = Math.max(1e-6, rngState / 4294967296);
      rngState = (rngState * 1664525 + 1013904223) >>> 0;
      const u2 = rngState / 4294967296;
      return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    };

    for (let i = 0; i < totalSamples; i++) {
      const t = i / sampleRate;
      let m = 0;

      if (useSampled && uploaded) {
        const srcPos = (t / uploaded.durationSec) * (uploaded.samples.length - 1);
        const idx0 = Math.floor(srcPos);
        const idx1 = Math.min(uploaded.samples.length - 1, idx0 + 1);
        const frac = srcPos - idx0;
        m = uploaded.samples[idx0] * (1 - frac) + uploaded.samples[idx1] * frac;
      } else if (builtInSamples) {
        m = builtInSamples[i] ?? 0;
      }

      let sample = m;
      if (params.probeStage !== 'original') {
        // 1. DSB-SC Modulation: s(t) = m(t) * cos(2*pi*fc*t)
        const s = m * Math.cos(twoPiFc * t);

        if (params.probeStage === 'dsbsc') {
          const noise = params.noiseLevel > 0 ? nextGauss() * params.noiseLevel * 0.45 : 0;
          sample = s + noise;
        } else if (params.probeStage === 'envelope') {
          // Non-coherent Diode Envelope Detection: full-wave rectify |s(t) + n(t)|
          // Live LPF nodes then extract ~ (2/pi)*|m(t)|, demonstrating severe rectification distortion!
          const noise = params.noiseLevel > 0 ? nextGauss() * params.noiseLevel * 0.45 : 0;
          sample = Math.abs(s + noise) * 1.4;
        } else {
          // Coherent Product Detector: v(t) = 2 * (s(t) + n(t)) * cos(2*pi*(fc + df)*t + theta)
          const noise = params.noiseLevel > 0 ? nextGauss() * params.noiseLevel * 0.45 : 0;
          const rxCarrier = Math.cos(twoPiFrx * t + thetaRad);
          sample = 2 * (s + noise) * rxCarrier;
        }
      }

      // Soft safety clamp so headphones/speakers never hard-clip
      out[i] = Math.max(-0.98, Math.min(0.98, sample * 0.72));
    }

    this.activeBuffer = buf;

    // Capture a 512-point preview slice (40ms window centered on an active signal segment)
    const previewCount = 512;
    const preview = new Float32Array(previewCount);
    const windowSamples = Math.min(Math.floor(sampleRate * 0.04), totalSamples);
    let bestStart = Math.min(Math.max(0, Math.floor(sampleRate * 0.16)), Math.max(0, totalSamples - windowSamples));
    let bestEnergy = -1;
    const scanLimit = Math.max(1, totalSamples - windowSamples);
    const hop = Math.max(1, Math.floor(sampleRate * 0.05));
    for (let s = 0; s < scanLimit; s += hop) {
      let e = 0;
      for (let j = 0; j < windowSamples; j += 16) {
        const v = out[s + j];
        e += v * v;
      }
      if (e > bestEnergy) {
        bestEnergy = e;
        bestStart = s;
      }
    }
    for (let k = 0; k < previewCount; k++) {
      const idx = bestStart + Math.floor((k / previewCount) * Math.max(1, windowSamples));
      preview[k] = out[idx] ?? 0;
    }
    this.previewWaveform = preview;

    this.applyLiveFilterAndGain(params);

    // If already playing, seamlessly swap the buffer preserving the current playhead!
    if (this.isPlayingState) {
      const elapsed = (ctx.currentTime - this.playbackStartCtxTime) % this.currentDurationSec;
      this.startSourceAtOffset(elapsed);
    }

    return { durationSec, previewSamples: preview };
  }

  /**
   * Update LPF cutoff, enable/bypass, and master gain immediately without restarting buffer.
   */
  public applyLiveFilterAndGain(params: DsbScAudioParams): void {
    if (!this.audioCtx || !this.lpfStage1 || !this.lpfStage2 || !this.masterGain) return;
    const now = this.audioCtx.currentTime;

    const shouldFilter =
      (params.probeStage === 'coherent' || params.probeStage === 'envelope') && params.lpfEnabled;
    const cutoff = shouldFilter ? Math.max(250, Math.min(18000, params.lpfCutoffHz)) : 20000;

    this.lpfStage1.frequency.setTargetAtTime(cutoff, now, 0.015);
    this.lpfStage2.frequency.setTargetAtTime(cutoff, now, 0.015);

    const safeGain = Math.max(0, Math.min(1.0, params.volume));
    this.masterGain.gain.setTargetAtTime(safeGain, now, 0.015);
  }

  private startSourceAtOffset(offsetSec: number): void {
    const ctx = this.ensureContext();
    if (!this.activeBuffer || !this.lpfStage1) return;

    this.stopSourceOnly();

    const src = ctx.createBufferSource();
    src.buffer = this.activeBuffer;
    src.loop = true;
    src.connect(this.lpfStage1);

    const safeOffset = ((offsetSec % this.currentDurationSec) + this.currentDurationSec) % this.currentDurationSec;
    src.start(0, safeOffset);

    this.sourceNode = src;
    this.playbackStartCtxTime = ctx.currentTime - safeOffset;
    this.isPlayingState = true;
  }

  private stopSourceOnly(): void {
    if (this.sourceNode) {
      try {
        this.sourceNode.stop();
        this.sourceNode.disconnect();
      } catch {
        // Already stopped
      }
      this.sourceNode = null;
    }
  }

  public play(): void {
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }
    this.startSourceAtOffset(this.playbackOffsetSec);
  }

  public pause(): void {
    if (this.audioCtx && this.isPlayingState) {
      this.playbackOffsetSec = (this.audioCtx.currentTime - this.playbackStartCtxTime) % this.currentDurationSec;
    }
    this.stopSourceOnly();
    this.isPlayingState = false;
  }

  public stop(): void {
    this.stopSourceOnly();
    this.playbackOffsetSec = 0;
    this.isPlayingState = false;
  }

  public getIsPlaying(): boolean {
    return this.isPlayingState;
  }

  public getSampleRate(): number {
    return this.audioCtx?.sampleRate ?? 44100;
  }

  /**
   * Read live AnalyserNode time & frequency buffers (or paused preview waveform).
   */
  public readLiveTelemetry(): {
    isPlaying: boolean;
    timeDomain: Float32Array;
    freqDomain: Uint8Array;
    sampleRate: number;
  } {
    if (this.isPlayingState && this.analyser) {
      this.analyser.getFloatTimeDomainData(this.timeDomainScratch);
      this.analyser.getByteFrequencyData(this.freqDomainScratch);
      return {
        isPlaying: true,
        timeDomain: this.timeDomainScratch,
        freqDomain: this.freqDomainScratch,
        sampleRate: this.getSampleRate(),
      };
    }

    return {
      isPlaying: false,
      timeDomain: this.previewWaveform,
      freqDomain: this.freqDomainScratch,
      sampleRate: this.getSampleRate(),
    };
  }

  public resetPlayhead(): void {
    this.playbackOffsetSec = 0;
  }

  /**
   * Start recording audio from user's microphone.
   */
  public async startMicRecording(): Promise<void> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Microphone access is not supported in this browser.');
    }
    this.cancelMicRecording();
    this.stop();

    const ctx = this.ensureContext();
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    this.micStream = stream;
    this.micSourceNode = ctx.createMediaStreamSource(stream);
    this.micAnalyser = ctx.createAnalyser();
    this.micAnalyser.fftSize = 2048;
    this.micSourceNode.connect(this.micAnalyser);
    this.micTimeScratch = new Float32Array(new ArrayBuffer(this.micAnalyser.fftSize * 4));

    this.micChunks = [];
    this.micStartTs = performance.now();

    const recorder = new MediaRecorder(stream);
    this.micRecorder = recorder;

    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) {
        this.micChunks.push(ev.data);
      }
    };

    recorder.onstop = async () => {
      const resolve = this.micStopResolve;
      const reject = this.micStopReject;
      this.micStopResolve = null;
      this.micStopReject = null;

      const mimeType = recorder.mimeType || 'audio/webm';
      const chunks = this.micChunks;
      this.cleanupMicStream();

      if (!resolve) return;
      try {
        if (chunks.length === 0) {
          throw new Error('No audio data was captured from microphone.');
        }
        const blob = new Blob(chunks, { type: mimeType });
        const info = await decodeAudioBlob(blob, 'My Voice (Mic)');
        this.playbackOffsetSec = 0;
        resolve({
          ...info,
          name: `My Voice (${info.durationSec.toFixed(1)}s)`,
        });
      } catch (err) {
        reject?.(err instanceof Error ? err : new Error('Failed to decode microphone recording.'));
      }
    };

    recorder.start(100);
  }

  public stopMicRecording(): Promise<DecodedAudioInfo> {
    return new Promise((resolve, reject) => {
      if (!this.micRecorder || this.micRecorder.state === 'inactive') {
        this.cleanupMicStream();
        reject(new Error('Microphone is not currently recording.'));
        return;
      }
      this.micStopResolve = resolve;
      this.micStopReject = reject;
      try {
        this.micRecorder.stop();
      } catch (err) {
        this.cleanupMicStream();
        reject(err instanceof Error ? err : new Error('Failed to stop microphone recording.'));
      }
    });
  }

  public cancelMicRecording(): void {
    this.micStopResolve = null;
    this.micStopReject = null;
    if (this.micRecorder && this.micRecorder.state !== 'inactive') {
      try {
        this.micRecorder.stop();
      } catch {
        // Ignore stop errors on cancel
      }
    }
    this.cleanupMicStream();
  }

  private cleanupMicStream(): void {
    if (this.micSourceNode) {
      try {
        this.micSourceNode.disconnect();
      } catch {
        // Ignore
      }
      this.micSourceNode = null;
    }
    this.micAnalyser = null;
    this.micRecorder = null;
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }
  }

  /**
   * Read live microphone waveform + RMS level (0..1) and elapsed seconds while recording.
   */
  public readMicTelemetry(): {
    timeDomain: Float32Array;
    rmsLevel: number;
    elapsedSec: number;
  } {
    const elapsedSec = this.micStartTs > 0 ? (performance.now() - this.micStartTs) / 1000 : 0;
    if (this.micAnalyser) {
      this.micAnalyser.getFloatTimeDomainData(this.micTimeScratch);
      let sumSq = 0;
      for (let i = 0; i < this.micTimeScratch.length; i++) {
        const v = this.micTimeScratch[i];
        sumSq += v * v;
      }
      const rms = Math.min(1, Math.sqrt(sumSq / this.micTimeScratch.length) * 3.5);
      return {
        timeDomain: this.micTimeScratch,
        rmsLevel: rms,
        elapsedSec,
      };
    }
    return {
      timeDomain: this.micTimeScratch,
      rmsLevel: 0,
      elapsedSec,
    };
  }

  public dispose(): void {
    this.cancelMicRecording();
    this.stop();
    if (this.audioCtx) {
      void this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
    this.lpfStage1 = null;
    this.lpfStage2 = null;
    this.masterGain = null;
    this.analyser = null;
  }
}
