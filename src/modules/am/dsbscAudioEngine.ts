/**
 * DSB-SC Web Audio Engine
 * Real sample-rate Double Sideband Suppressed Carrier modulation,
 * non-coherent envelope failure comparison, coherent product demodulation,
 * 4th-order Butterworth LPF (cascaded BiquadFilterNodes), and live AnalyserNode telemetry.
 */

export type AudioSourceType = 'voice' | 'mic' | 'chord' | 'tone' | 'upload';
export type AudioProbeStage = 'original' | 'dsbsc' | 'envelope' | 'coherent';

export interface DsbScAudioParams {
  sourceType: AudioSourceType;
  probeStage: AudioProbeStage;
  fcAudio: number;       // Audible carrier frequency in Hz (1500 - 5000)
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
   * Generate baseband message sample m(t) at time t for built-in test sources.
   */
  private evaluateBuiltInMessage(sourceType: AudioSourceType, t: number): number {
    if (sourceType === 'tone') {
      // Clear 330 Hz + subtle 660 Hz harmonic so Δf & phase inversion are unmistakable
      const env = Math.min(1, t / 0.04) * Math.min(1, (DEFAULT_DURATION_SEC - t) / 0.04);
      return (0.72 * Math.sin(2 * Math.PI * 330 * t) + 0.22 * Math.sin(2 * Math.PI * 660 * t)) * env;
    }

    if (sourceType === 'chord') {
      // Warm C-major triad with gentle swell so frequency offset detuning stands out
      const swell = 0.65 + 0.35 * Math.sin(2 * Math.PI * 0.5 * t);
      const c4 = Math.sin(2 * Math.PI * 261.63 * t);
      const e4 = 0.75 * Math.sin(2 * Math.PI * 329.63 * t);
      const g4 = 0.65 * Math.sin(2 * Math.PI * 392.0 * t);
      const c5 = 0.35 * Math.sin(2 * Math.PI * 523.25 * t);
      return 0.38 * swell * (c4 + e4 + g4 + c5);
    }

    // 'voice': Speech-like cadence with distinct syllable pauses (great for hearing suppressed carrier silence!)
    const phrasePos = (t * 1.5) % 1.0; // 1.5 syllables/sec
    // Smooth vowel gate with silent pauses between phrases so suppressed-carrier silence is audible
    const gate =
      phrasePos < 0.72
        ? Math.sin((Math.PI * phrasePos) / 0.72) ** 0.7
        : 0;
    const f0 = 155 + 28 * Math.sin(2 * Math.PI * 1.1 * t) + 12 * Math.sin(2 * Math.PI * 5.2 * t);
    const formant1 = Math.sin(2 * Math.PI * f0 * t);
    const formant2 = 0.65 * Math.sin(2 * Math.PI * (2 * f0) * t + 0.4);
    const formant3 = 0.45 * Math.sin(2 * Math.PI * (3 * f0) * t + 0.9);
    const formant4 = 0.25 * Math.sin(2 * Math.PI * (5 * f0) * t + 1.3);
    const formant5 = 0.14 * Math.sin(2 * Math.PI * (7 * f0) * t + 0.2);
    return 0.45 * gate * (formant1 + formant2 + formant3 + formant4 + formant5);
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
    const durationSec = useSampled ? uploaded.durationSec : DEFAULT_DURATION_SEC;
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
      } else {
        m = this.evaluateBuiltInMessage(params.sourceType, t);
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
      out[i] = Math.max(-0.98, Math.min(0.98, sample * 0.65));
    }

    this.activeBuffer = buf;

    // Capture a 512-point preview slice (40ms window at t=0.25s) for paused oscilloscope display
    const previewCount = 512;
    const preview = new Float32Array(previewCount);
    const startSample = Math.min(Math.max(0, Math.floor(sampleRate * 0.25)), Math.max(0, totalSamples - previewCount));
    const windowSamples = Math.min(Math.floor(sampleRate * 0.04), totalSamples - startSample);
    for (let k = 0; k < previewCount; k++) {
      const idx = startSample + Math.floor((k / previewCount) * Math.max(1, windowSamples));
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
