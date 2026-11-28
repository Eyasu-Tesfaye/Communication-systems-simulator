import { besselJ, SpectralLine } from './besselUtils';

export type RadioProgramType = 'sine' | 'square' | 'voice' | 'dual';
export type RadioVoiceProfile = 'anchor' | 'news' | 'talk' | 'guest';
export type RadioLockStatus = 'LOCKED' | 'OFF-TUNE' | 'ADJACENT OVERLAP' | 'NO SIGNAL';

export interface RadioStation {
  id: string;
  label: string;
  fc: number;
  fm: number;
  Ac: number;
  programType: RadioProgramType;
  voiceProfile: RadioVoiceProfile;
  programLabel: string;
  audioUrl: string;
  color: string;
}

export const RADIO_DOMAIN_MAX = 140;

export const RADIO_STATIONS: RadioStation[] = [
  {
    id: 'ch1',
    label: 'CH 1',
    fc: 20,
    fm: 2.0,
    Ac: 1.5,
    programType: 'voice',
    voiceProfile: 'anchor',
    programLabel: 'Voice · Anchor',
    audioUrl: '/audio/CH1.mp3',
    color: '#2563EB',
  },
  {
    id: 'ch2',
    label: 'CH 2',
    fc: 46,
    fm: 2.5,
    Ac: 1.5,
    programType: 'voice',
    voiceProfile: 'news',
    programLabel: 'Voice · News',
    audioUrl: '/audio/CH2.mp3',
    color: '#C85A32',
  },
  {
    id: 'ch3',
    label: 'CH 3',
    fc: 75,
    fm: 2.3,
    Ac: 1.5,
    programType: 'voice',
    voiceProfile: 'talk',
    programLabel: 'Voice · Talk',
    audioUrl: '/audio/CH3.mp3',
    color: '#059669',
  },
  {
    id: 'ch4',
    label: 'CH 4',
    fc: 112,
    fm: 3.0,
    Ac: 1.5,
    programType: 'voice',
    voiceProfile: 'guest',
    programLabel: 'Voice · Guest',
    audioUrl: '/audio/CH4.mp3',
    color: '#7C3AED',
  },
];

export interface RadioVoiceClip {
  samples: Float32Array;
  sampleRate: number;
  duration: number;
  fileName: string;
}

interface VoiceSynthSpec {
  f0: number;
  pitchSwing: number;
  pitchRate: number;
  f1: number;
  f2: number;
  f3: number;
  syllableRate: number;
  phaseOffset: number;
  pausePhase: number;
}

const VOICE_PROFILE_SPECS: Record<RadioVoiceProfile, VoiceSynthSpec> = {
  anchor: {
    f0: 116,
    pitchSwing: 14,
    pitchRate: 1.25,
    f1: 480,
    f2: 1180,
    f3: 2450,
    syllableRate: 3.0,
    phaseOffset: 0.1,
    pausePhase: 0.2,
  },
  news: {
    f0: 186,
    pitchSwing: 24,
    pitchRate: 1.75,
    f1: 660,
    f2: 1720,
    f3: 2700,
    syllableRate: 3.6,
    phaseOffset: 1.35,
    pausePhase: 1.9,
  },
  talk: {
    f0: 148,
    pitchSwing: 19,
    pitchRate: 1.5,
    f1: 540,
    f2: 1460,
    f3: 2520,
    syllableRate: 2.75,
    phaseOffset: 2.4,
    pausePhase: 3.1,
  },
  guest: {
    f0: 232,
    pitchSwing: 28,
    pitchRate: 2.0,
    f1: 740,
    f2: 2020,
    f3: 2960,
    syllableRate: 4.1,
    phaseOffset: 3.8,
    pausePhase: 4.5,
  },
};

const bundledVoiceCache = new Map<string, RadioVoiceClip>();

/**
 * Generates and caches a distinct, seamlessly looping formant-synthesized voice clip
 * for each built-in station so all 4 channels work out-of-the-box on any machine.
 */
export function getBundledRadioVoiceClip(station: RadioStation): RadioVoiceClip {
  const existing = bundledVoiceCache.get(station.id);
  if (existing) return existing;

  const spec = VOICE_PROFILE_SPECS[station.voiceProfile] ?? VOICE_PROFILE_SPECS.talk;
  const sampleRate = 22050;
  const duration = 4.0;
  const totalSamples = Math.floor(sampleRate * duration);
  const samples = new Float32Array(totalSamples);

  let phase = 0;
  let mean = 0;
  let peak = 0;

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;

    // Syllabic speech cadence envelope + phrase breathing pause
    const syl = 0.5 + 0.5 * Math.sin(2 * Math.PI * spec.syllableRate * t + spec.phaseOffset);
    const syl2 = 0.5 + 0.5 * Math.cos(2 * Math.PI * (spec.syllableRate * 0.52) * t + spec.pausePhase);
    const phraseGate = Math.pow(0.25 + 0.75 * syl2, 1.35);
    const envelope = Math.pow(syl, 1.4) * phraseGate;

    // Intonation F0 contour
    const instF0 =
      spec.f0 +
      spec.pitchSwing * Math.sin(2 * Math.PI * spec.pitchRate * t + spec.phaseOffset) +
      0.35 * spec.pitchSwing * Math.sin(2 * Math.PI * (spec.pitchRate * 2.1) * t);
    phase += (2 * Math.PI * instF0) / sampleRate;

    // Vowel formant sweep across syllables
    const vowelShift = 1 + 0.14 * Math.sin(2 * Math.PI * (spec.syllableRate * 0.5) * t + spec.phaseOffset);
    const f1 = spec.f1 * vowelShift;
    const f2 = spec.f2 * (1 - 0.12 * Math.cos(2 * Math.PI * (spec.syllableRate * 0.35) * t));
    const f3 = spec.f3;

    // Harmonic glottal series weighted by 3 vocal-tract formants
    let voiceVal = 0;
    const maxHarmonic = 16;
    for (let h = 1; h <= maxHarmonic; h++) {
      const fh = h * instF0;
      if (fh > sampleRate * 0.42) break;
      const g1 = Math.exp(-Math.pow((fh - f1) / 140, 2));
      const g2 = 0.65 * Math.exp(-Math.pow((fh - f2) / 210, 2));
      const g3 = 0.32 * Math.exp(-Math.pow((fh - f3) / 300, 2));
      const tilt = 1 / Math.pow(h, 0.72);
      const weight = (0.18 + g1 + g2 + g3) * tilt;
      voiceVal += weight * Math.sin(h * phase);
    }

    // Subtle consonant aspiration burst at syllable onset
    const onset = Math.max(0, Math.sin(2 * Math.PI * spec.syllableRate * t + spec.phaseOffset + 0.55));
    const aspiration =
      onset > 0.88 ? Math.sin(2 * Math.PI * 1950 * t + i * 0.37) * 0.18 * (onset - 0.88) * 8 : 0;

    const val = (voiceVal * 0.42 + aspiration) * (0.12 + 0.88 * envelope);
    samples[i] = val;
    mean += val;
  }

  mean /= totalSamples;
  for (let i = 0; i < totalSamples; i++) {
    samples[i] -= mean;
    const a = Math.abs(samples[i]);
    if (a > peak) peak = a;
  }
  if (peak > 1e-6) {
    for (let i = 0; i < totalSamples; i++) {
      samples[i] /= peak;
    }
  }

  // Smooth loop crossfade (20 ms)
  const fadeLen = Math.min(Math.floor(0.02 * sampleRate), Math.floor(totalSamples / 8));
  for (let i = 0; i < fadeLen; i++) {
    const w = 0.5 * (1 - Math.cos((Math.PI * i) / fadeLen));
    const tailIdx = totalSamples - fadeLen + i;
    const blended = samples[tailIdx] * (1 - w) + samples[i] * w;
    samples[i] = blended;
    samples[tailIdx] = blended;
  }

  const clip: RadioVoiceClip = {
    samples,
    sampleRate,
    duration,
    fileName: station.programLabel,
  };
  bundledVoiceCache.set(station.id, clip);
  return clip;
}

export interface RadioStationCapture {
  station: RadioStation;
  beta: number;
  carsonBT: number;
  totalPower: number;
  capturedPower: number;
  captureRatio: number;
  carrierOffset: number;
}

export interface RadioPoint {
  x: number;
  y: number;
}

export interface RadioSimulationResult {
  spectralLines: SpectralLine[];
  stationCaptures: RadioStationCapture[];
  dominantStation: RadioStation;
  interfererStation?: RadioStation;
  captureRatio: number;
  signalStrengthPct: number;
  aciRatio: number;
  aciPct: number;
  status: RadioLockStatus;
  dominantBT: number;
  effectiveSnrDb: number;
  mTargetPoints: RadioPoint[];
  mRecoveredPoints: RadioPoint[];
  spectrumYMax: number;
}

function processDecodedAudioBuffer(decoded: AudioBuffer, fileName: string): RadioVoiceClip {
  const raw = decoded.getChannelData(0);
  const sr = decoded.sampleRate;

  // Trim long leading/trailing near-silence (<0.015) while preserving real short clips
  let startIdx = 0;
  let endIdx = raw.length - 1;
  while (startIdx < endIdx && Math.abs(raw[startIdx]) < 0.015) startIdx++;
  while (endIdx > startIdx && Math.abs(raw[endIdx]) < 0.015) endIdx--;

  const minKeepSamples = Math.floor(0.12 * sr);
  if (endIdx - startIdx + 1 < minKeepSamples) {
    startIdx = 0;
    endIdx = raw.length - 1;
  } else {
    const margin = Math.floor(0.01 * sr);
    startIdx = Math.max(0, startIdx - margin);
    endIdx = Math.min(raw.length - 1, endIdx + margin);
  }

  const maxSamples = Math.min(endIdx - startIdx + 1, Math.floor(20 * sr));
  const samples = new Float32Array(maxSamples);

  let mean = 0;
  for (let i = 0; i < maxSamples; i++) {
    const val = raw[startIdx + i];
    samples[i] = val;
    mean += val;
  }
  mean /= Math.max(1, maxSamples);

  let peak = 0;
  for (let i = 0; i < maxSamples; i++) {
    samples[i] -= mean;
    const abs = Math.abs(samples[i]);
    if (abs > peak) peak = abs;
  }

  if (peak > 1e-6) {
    for (let i = 0; i < maxSamples; i++) {
      samples[i] /= peak;
    }
  }

  // Apply short cosine loop crossfade (15 ms) so wrap-around loops cleanly without clicks
  const fadeLen = Math.min(Math.floor(0.015 * sr), Math.floor(maxSamples / 8));
  if (fadeLen > 4) {
    for (let i = 0; i < fadeLen; i++) {
      const w = 0.5 * (1 - Math.cos((Math.PI * i) / fadeLen));
      const tailIdx = maxSamples - fadeLen + i;
      const blended = samples[tailIdx] * (1 - w) + samples[i] * w;
      samples[i] = blended;
      samples[tailIdx] = blended;
    }
  }

  return {
    samples,
    sampleRate: sr,
    duration: maxSamples / sr,
    fileName,
  };
}

/**
 * Decodes any browser-supported audio/* file into a DC-removed, peak-normalized,
 * seamlessly loop-crossfaded mono buffer.
 */
export async function decodeRadioAudioClip(file: File): Promise<RadioVoiceClip> {
  const arrayBuffer = await file.arrayBuffer();
  const AudioCtxClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioCtxClass();

  try {
    const decoded = await audioCtx.decodeAudioData(arrayBuffer);
    return processDecodedAudioBuffer(decoded, file.name);
  } finally {
    void audioCtx.close().catch(() => {});
  }
}

const bundledMp3ClipCache = new Map<string, RadioVoiceClip>();
let bundledMp3LoadPromise: Promise<Record<string, RadioVoiceClip>> | null = null;

/**
 * Fetches and decodes CH 1-CH 4 bundled .mp3 files from /audio/CH1.mp3-/audio/CH4.mp3
 * once on load, falling back gracefully to synthesized formant voices if unavailable.
 */
export function loadAllBundledRadioClips(
  existingCtx?: AudioContext | null
): Promise<Record<string, RadioVoiceClip>> {
  if (bundledMp3LoadPromise) {
    return bundledMp3LoadPromise;
  }

  bundledMp3LoadPromise = (async () => {
    const results: Record<string, RadioVoiceClip> = {};
    if (typeof fetch !== 'function' || typeof window === 'undefined') {
      return results;
    }

    let tempCtx: AudioContext | null = null;
    let ctx = existingCtx ?? null;
    if (!ctx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtxClass) {
        tempCtx = new AudioCtxClass();
        ctx = tempCtx;
      }
    }

    if (!ctx) {
      return results;
    }

    try {
      await Promise.all(
        RADIO_STATIONS.map(async (station) => {
          const cached = bundledMp3ClipCache.get(station.id);
          if (cached) {
            results[station.id] = cached;
            return;
          }
          try {
            const resp = await fetch(station.audioUrl);
            if (!resp.ok) return;
            const buf = await resp.arrayBuffer();
            const decoded = await ctx!.decodeAudioData(buf);
            const clip = processDecodedAudioBuffer(decoded, station.programLabel);
            bundledMp3ClipCache.set(station.id, clip);
            results[station.id] = clip;
          } catch {
            // Fall back to synthesized voice clip when .mp3 cannot be fetched/decoded
          }
        })
      );
    } finally {
      if (tempCtx) {
        void tempCtx.close().catch(() => {});
      }
    }

    return results;
  })();

  return bundledMp3LoadPromise;
}

export function evalPassbandGain(freq: number, center: number, bandwidth: number): number {
  const halfBw = Math.max(0.5, bandwidth / 2);
  const u = Math.abs(freq - center) / halfBw;
  return 1 / Math.sqrt(1 + Math.pow(u, 16));
}

function evalVoiceClipSample(clip: RadioVoiceClip, t: number): number {
  const len = clip.samples.length;
  if (len === 0 || clip.duration <= 0) return 0;
  const tWrapped = ((t % clip.duration) + clip.duration) % clip.duration;
  const exactIdx = (tWrapped / clip.duration) * len;
  const idx0 = Math.floor(exactIdx) % len;
  // Light smoothing window when sample rate is high to keep 640-pt plot crisp & alias-free
  if (clip.sampleRate >= 8000 && len > 64) {
    let sum = 0;
    const halfWin = 7;
    for (let k = -halfWin; k <= halfWin; k++) {
      const idx = (idx0 + k + len) % len;
      sum += clip.samples[idx];
    }
    return Math.max(-1.05, Math.min(1.05, (sum / (halfWin * 2 + 1)) * 1.15));
  }
  const idx1 = (idx0 + 1) % len;
  const frac = exactIdx - Math.floor(exactIdx);
  return clip.samples[idx0] * (1 - frac) + clip.samples[idx1] * frac;
}

function evalStationMessage(
  station: RadioStation,
  t: number,
  voiceOverrides?: Record<string, RadioVoiceClip | null>,
  bundledClips?: Record<string, RadioVoiceClip | null>
): number {
  const customClip = voiceOverrides?.[station.id];
  if (customClip && customClip.samples.length > 0) {
    return evalVoiceClipSample(customClip, t);
  }
  const bundledClip = bundledClips?.[station.id] ?? bundledMp3ClipCache.get(station.id);
  if (bundledClip && bundledClip.samples.length > 0) {
    return evalVoiceClipSample(bundledClip, t);
  }

  // Distinct, alias-free baseband speech-cadence fallback waveform
  const spec = VOICE_PROFILE_SPECS[station.voiceProfile] ?? VOICE_PROFILE_SPECS.talk;
  const w = 2 * Math.PI * station.fm;
  const sylEnv =
    0.32 +
    0.68 *
      Math.pow(
        0.5 + 0.5 * Math.sin(2 * Math.PI * (spec.syllableRate * 0.55) * t + spec.phaseOffset),
        1.2
      );
  const voiceCarrier =
    0.52 * Math.cos(w * t + spec.phaseOffset) +
    0.31 * Math.cos(2.15 * w * t + spec.pausePhase) +
    0.17 * Math.sin(3.45 * w * t + 0.4);
  return Math.max(-1.05, Math.min(1.05, voiceCarrier * sylEnv * 1.15));
}

function deterministicNoise(idx: number, seed: number): number {
  const s1 = Math.sin((idx + 1) * 12.9898 + 78.233 + seed) * 43758.5453;
  const s2 = Math.sin((idx + 1) * 93.9898 + 67.345 + seed) * 24634.6345;
  const u1 = Math.max(1e-6, s1 - Math.floor(s1));
  const u2 = s2 - Math.floor(s2);
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

export function simulateFmRadio(params: {
  tuneFreq: number;
  passbandWidth: number;
  deltaF: number;
  awgnSnrDb: number;
  voiceOverrides?: Record<string, RadioVoiceClip | null>;
  bundledClips?: Record<string, RadioVoiceClip | null>;
  ch3VoiceClip?: RadioVoiceClip | null;
  timeSpan?: number;
  numPoints?: number;
}): RadioSimulationResult {
  const {
    tuneFreq,
    passbandWidth,
    deltaF,
    awgnSnrDb,
    voiceOverrides,
    bundledClips,
    ch3VoiceClip = null,
    timeSpan = 1.6,
    numPoints = 640,
  } = params;

  const resolvedOverrides: Record<string, RadioVoiceClip | null> = {
    ...(voiceOverrides || {}),
    ...(ch3VoiceClip && !voiceOverrides?.ch3 ? { ch3: ch3VoiceClip } : {}),
  };

  const spectralLines: SpectralLine[] = [];
  const stationCaptures: RadioStationCapture[] = [];
  let maxAmp = 0.75;

  // Compute each station's spectrum and passband power capture
  const perStationRaw: Array<{
    station: RadioStation;
    beta: number;
    carsonBT: number;
    totalPower: number;
    capturedPower: number;
    lines: Array<{ freq: number; amp: number; n: number; isInsideCarson: boolean }>;
  }> = [];

  for (const baseStation of RADIO_STATIONS) {
    const custom = resolvedOverrides[baseStation.id];
    const station: RadioStation = custom
      ? { ...baseStation, programLabel: custom.fileName }
      : baseStation;
    const beta = deltaF / Math.max(0.2, station.fm);
    const carsonBT = 2 * (deltaF + station.fm);
    const nCarsonMax = Math.ceil(beta + 1);
    const maxHarmonics = Math.min(22, Math.max(8, Math.ceil(beta + 4)));

    let totalPower = 0;
    let capturedPower = 0;
    const rawLines: Array<{ freq: number; amp: number; n: number; isInsideCarson: boolean }> = [];

    for (let n = -maxHarmonics; n <= maxHarmonics; n++) {
      const jn = besselJ(n, beta);
      const amp = (station.Ac / 2) * Math.abs(jn);
      const freq = station.fc + n * station.fm;
      if (freq < 0 || freq > RADIO_DOMAIN_MAX) continue;

      const pwr = amp * amp;
      totalPower += pwr;

      const h = evalPassbandGain(freq, tuneFreq, passbandWidth);
      capturedPower += pwr * h * h;

      if (amp > 0.012 || n === 0) {
        if (amp > maxAmp) maxAmp = amp;
        rawLines.push({
          freq: Number(freq.toFixed(2)),
          amp: Number(amp.toFixed(4)),
          n,
          isInsideCarson: Math.abs(n) <= nCarsonMax,
        });
      }
    }

    perStationRaw.push({
      station,
      beta,
      carsonBT,
      totalPower,
      capturedPower,
      lines: rawLines,
    });

    stationCaptures.push({
      station,
      beta,
      carsonBT,
      totalPower,
      capturedPower,
      captureRatio: totalPower > 0 ? capturedPower / totalPower : 0,
      carrierOffset: Math.abs(tuneFreq - station.fc),
    });
  }

  // Dominant station = highest captured power in passband
  const sortedByCapture = [...stationCaptures].sort((a, b) => b.capturedPower - a.capturedPower);
  const dominantCapture = sortedByCapture[0];
  const dominantStation = dominantCapture.station;
  const captureRatio = dominantCapture.captureRatio;

  const adjacentCapturedPower = sortedByCapture
    .slice(1)
    .reduce((acc, item) => acc + item.capturedPower, 0);
  const rawAciRatio =
    dominantCapture.capturedPower > 1e-6
      ? adjacentCapturedPower / dominantCapture.capturedPower
      : adjacentCapturedPower > 1e-6
      ? 1.0
      : 0;

  let status: RadioLockStatus = 'LOCKED';
  if (captureRatio < 0.06) {
    status = 'NO SIGNAL';
  } else if (rawAciRatio >= 0.08) {
    status = 'ADJACENT OVERLAP';
  } else if (captureRatio < 0.6 || dominantCapture.carrierOffset > passbandWidth * 0.38) {
    status = 'OFF-TUNE';
  }

  const aciRatio = status === 'NO SIGNAL' ? 0 : rawAciRatio;

  // Assign clear visual colors to spectral lines based on passband inclusion & overlap
  for (const item of perStationRaw) {
    const isDom = item.station.id === dominantStation.id;
    for (const ln of item.lines) {
      const inPassband = Math.abs(ln.freq - tuneFreq) <= passbandWidth / 2;
      let customColor = '#9CA3AF';
      let opacity = 0.45;
      if (inPassband) {
        if (isDom) {
          customColor = ln.n === 0 ? '#C85A32' : item.station.color;
          opacity = 1.0;
        } else {
          // Adjacent-channel leakage inside receiver passband
          customColor = '#DC2626';
          opacity = 0.95;
        }
      } else if (isDom) {
        customColor = item.station.color;
        opacity = 0.42;
      } else {
        customColor = item.station.color;
        opacity = 0.36;
      }

      spectralLines.push({
        freq: ln.freq,
        amplitude: ln.amp,
        powerRatio: ln.amp * ln.amp,
        harmonicOrder: ln.n,
        offsetOrder: ln.n,
        label: ln.n === 0 ? item.station.label : `${item.station.label}${ln.n > 0 ? '+' : ''}${ln.n}f_m`,
        side: 'positive',
        isInsideCarson: ln.isInsideCarson,
        customColor,
        opacity,
        suppressLabel: true,
      });
    }
  }

  spectralLines.sort((a, b) => a.freq - b.freq);

  // Synthesize Target vs Demodulated Radio Output Waveform
  const mTargetPoints: RadioPoint[] = new Array(numPoints);
  const mRecoveredPoints: RadioPoint[] = new Array(numPoints);

  const signalGain = Math.sqrt(Math.max(0, Math.min(1, captureRatio)));
  const truncationDistortion = Math.max(0, 1 - captureRatio) * Math.min(1, dominantCapture.carsonBT / Math.max(4, passbandWidth));
  const aciWeight = Math.min(0.85, Math.sqrt(aciRatio) * 0.85);
  const interferer = sortedByCapture[1]?.station;
  const interfererBeatHz = interferer
    ? Math.max(2.5, Math.min(18, Math.abs(interferer.fc - dominantStation.fc) * 0.35))
    : 8;

  const snrAmpRatio = Math.pow(10, awgnSnrDb / 20);
  const snrSigGain = snrAmpRatio / Math.sqrt(1 + snrAmpRatio * snrAmpRatio);
  const snrNoiseGain = 1 / Math.sqrt(1 + snrAmpRatio * snrAmpRatio);

  const dt = timeSpan / (numPoints - 1);
  const mTargetValues = new Float32Array(numPoints);
  let rawTargetPowerSum = 0;
  for (let i = 0; i < numPoints; i++) {
    const t = i * dt;
    const val = evalStationMessage(dominantStation, t, resolvedOverrides, bundledClips);
    mTargetValues[i] = val;
    rawTargetPowerSum += val * val;
  }
  const mTargetRms = Math.max(0.08, Math.sqrt(rawTargetPowerSum / Math.max(1, numPoints)));
  const totalNoiseSigma =
    mTargetRms * Math.hypot(snrNoiseGain, (1 - signalGain) * 0.55);

  let sigPowerSum = 0;
  let errPowerSum = 0;

  for (let i = 0; i < numPoints; i++) {
    const t = i * dt;
    const mTarget = mTargetValues[i];
    mTargetPoints[i] = { x: Number(t.toFixed(4)), y: Number(mTarget.toFixed(3)) };

    let recovered = signalGain * snrSigGain * mTarget;

    // Passband truncation creates odd-harmonic compression / clipping when B_T > B_rx
    if (truncationDistortion > 0.05 && signalGain > 0.08) {
      const kClip = 1 + truncationDistortion * 2.2;
      recovered = (Math.tanh(recovered * kClip) / Math.tanh(kClip)) * signalGain * snrSigGain;
    }

    // Adjacent-channel overlap adds audible/visible beat crosstalk
    if (interferer && aciWeight > 0.02) {
      const mAdj = evalStationMessage(interferer, t, resolvedOverrides, bundledClips);
      recovered += aciWeight * (0.55 * mAdj + 0.45 * Math.sin(2 * Math.PI * interfererBeatHz * t));
    }

    // Receiver noise / inter-station static scaled to exact SNR power ratio
    const noise = deterministicNoise(i, Math.round(tuneFreq * 10)) * totalNoiseSigma;
    recovered += noise;

    mRecoveredPoints[i] = { x: Number(t.toFixed(4)), y: Number(recovered.toFixed(3)) };

    const desiredRef = snrSigGain * mTarget;
    sigPowerSum += desiredRef * desiredRef;
    const err = recovered - desiredRef;
    errPowerSum += err * err;
  }

  const effectiveSnrDb =
    errPowerSum > 1e-6 && sigPowerSum > 1e-6
      ? Math.max(-24, Math.min(42, 10 * Math.log10(sigPowerSum / errPowerSum)))
      : 40;

  return {
    spectralLines,
    stationCaptures,
    dominantStation,
    interfererStation: interferer,
    captureRatio,
    signalStrengthPct: Math.round(Math.min(100, captureRatio * 100)),
    aciRatio,
    aciPct: Math.round(Math.min(100, (aciRatio / (1 + aciRatio)) * 100)),
    status,
    dominantBT: dominantCapture.carsonBT,
    effectiveSnrDb: Number(effectiveSnrDb.toFixed(1)),
    mTargetPoints,
    mRecoveredPoints,
    spectrumYMax: Math.max(0.95, maxAmp * 1.42),
  };
}
