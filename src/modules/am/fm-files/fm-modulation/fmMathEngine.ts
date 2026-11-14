/**
 * FM Modulation Mathematical Engine
 *
 * Implements:
 * 1. Carrier Signal: c(t) = A_c * cos(2 * pi * f_c * t)
 * 2. Message Signal options:
 *    - Sinusoid: m(t) = A_m * cos(2 * pi * f_m * t)
 *    - Square Wave: m(t) = A_m * sgn(cos(2 * pi * f_m * t))
 *    - Audio (.wav): Decoded audio sample buffer m(t)
 * 3. Instantaneous Frequency: f_i(t) = f_c + k_f * m(t)
 * 4. FM Modulated Wave: s(t) = A_c * cos(2 * pi * f_c * t + 2 * pi * k_f * ∫ m(τ) dτ)
 * 5. Dynamic Time Vector & Sampling:
 *    - Sampling frequency sf >= max(20 * fc, 24 * (fc + deltaF)) to prevent aliasing/microscopic collapse
 *    - Time window t in [0, windowPeriods / fm] (3 to 5 periods of m(t))
 */

export interface FmSimulationParams {
  Ac: number;              // Carrier Amplitude (V)
  fc: number;              // Carrier Frequency (Hz)
  Am: number;              // Message Amplitude (V)
  fm: number;              // Message Frequency (Hz)
  kf: number;              // Frequency Sensitivity (Hz/V)
  messageType: 'sine' | 'square' | 'audio';
  audioBuffer?: Float32Array | null;
  audioSampleRate?: number;
  windowPeriods?: number;  // Number of message periods to display (3 to 5, default 5)
  timeSpan?: number;       // Optional explicit time window override (seconds)
  dcOffset?: number;       // Optional DC offset m_0 (V)
  channelNoise?: number;   // Optional AWGN noise sigma (V)
}

export interface FmPoint {
  x: number;               // Time t (seconds)
  y: number;               // Signal value
}

export interface FmEngineResult {
  // Time domain points
  mPoints: FmPoint[];        // Modulating message m(t)
  cPoints: FmPoint[];        // Unmodulated Carrier c(t)
  sPoints: FmPoint[];        // FM Modulated wave s(t)
  fiPoints: FmPoint[];       // Instantaneous frequency f_i(t)
  envelopeUpper: FmPoint[];  // Constant envelope +Ac
  envelopeLower: FmPoint[];  // Constant envelope -Ac

  // Sampling & Window Telemetry
  timeSpan: number;          // T_window = windowPeriods / fm (seconds)
  windowPeriods: number;     // Periods shown (3 to 5)
  samplingFreq: number;      // s_f >= 20 * f_c (Hz)
  numPoints: number;         // Total computed samples

  // Mathematical telemetry readouts
  deltaF: number;            // Peak frequency deviation Δf = kf * Am (Hz)
  beta: number;              // Modulation index β = Δf / fm
  carsonBandwidth: number;   // BT = 2 * (Δf + fm) (Hz)
  fiMin: number;             // Minimum instantaneous frequency (Hz)
  fiMax: number;             // Maximum instantaneous frequency (Hz)
  envelopeDeviation: number; // Max deviation of envelope from Ac (0.000)
  isNarrowband: boolean;     // True if β < 0.5
}

/**
 * Computes all FM signals and metrics across a clean window of 3-5 message periods
 * with sampling frequency sf >= 20 * fc.
 */
export function computeFmSignals(params: FmSimulationParams): FmEngineResult {
  const {
    Ac,
    fc,
    Am,
    fm,
    kf,
    messageType,
    audioBuffer,
    windowPeriods = 5,
    timeSpan: explicitTimeSpan,
    dcOffset = 0,
    channelNoise = 0,
  } = params;

  const safeFm = Math.max(0.1, fm);
  const clampedPeriods = Math.min(5, Math.max(3, windowPeriods));
  const timeSpan = explicitTimeSpan ?? clampedPeriods / safeFm;

  // Peak frequency deviation Δf = kf * Am
  const deltaF = kf * Am;
  const maxInstFreq = fc + deltaF + kf * Math.abs(dcOffset);

  // Sampling frequency: at least 20x carrier frequency (and 24x peak instantaneous frequency)
  const samplingFreq = Math.max(20 * fc, 24 * maxInstFreq, 400);
  const numPoints = Math.min(6000, Math.max(400, Math.ceil(samplingFreq * timeSpan) + 1));

  const dt = timeSpan / (numPoints - 1);
  const effectiveSf = 1 / dt;

  const mPoints: FmPoint[] = new Array(numPoints);
  const cPoints: FmPoint[] = new Array(numPoints);
  const sPoints: FmPoint[] = new Array(numPoints);
  const fiPoints: FmPoint[] = new Array(numPoints);
  const envelopeUpper: FmPoint[] = new Array(numPoints);
  const envelopeLower: FmPoint[] = new Array(numPoints);

  let integralM = 0;
  let prevMTotal = 0;
  let maxEnvelopeObserved = 0;

  for (let i = 0; i < numPoints; i++) {
    const t = i * dt;

    // 1. Modulating Message m(t)
    let mBase = 0;
    let mIntegralVal = 0;

    if (messageType === 'sine') {
      mBase = Am * Math.cos(2 * Math.PI * safeFm * t);
      const mTotal = mBase + dcOffset;
      // Exact analytical integral
      mIntegralVal =
        (Am / (2 * Math.PI * safeFm)) * Math.sin(2 * Math.PI * safeFm * t) + dcOffset * t;

      const cVal = Ac * Math.cos(2 * Math.PI * fc * t);
      const fiVal = fc + kf * mTotal;
      const angle = 2 * Math.PI * fc * t + 2 * Math.PI * kf * mIntegralVal;
      let sVal = Ac * Math.cos(angle);

      maxEnvelopeObserved = Math.max(maxEnvelopeObserved, Math.abs(sVal));
      if (channelNoise > 0) {
        const pseudorand = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
        sVal += (pseudorand - Math.floor(pseudorand) - 0.5) * 2 * channelNoise;
      }

      const tRound = Number(t.toFixed(5));
      mPoints[i] = { x: tRound, y: Number(mTotal.toFixed(4)) };
      cPoints[i] = { x: tRound, y: Number(cVal.toFixed(4)) };
      sPoints[i] = { x: tRound, y: Number(sVal.toFixed(4)) };
      fiPoints[i] = { x: tRound, y: Number(fiVal.toFixed(3)) };
      envelopeUpper[i] = { x: tRound, y: Ac };
      envelopeLower[i] = { x: tRound, y: -Ac };
      continue;
    }

    if (messageType === 'square') {
      mBase = Math.cos(2 * Math.PI * safeFm * t) >= 0 ? Am : -Am;
    } else {
      if (audioBuffer && audioBuffer.length > 0) {
        const sampleIndex = Math.min(
          audioBuffer.length - 1,
          Math.floor((t / timeSpan) * audioBuffer.length)
        );
        mBase = audioBuffer[sampleIndex] * Am;
      } else {
        mBase =
          Am *
          (0.65 * Math.cos(2 * Math.PI * safeFm * t) +
            0.35 * Math.cos(4 * Math.PI * safeFm * t + 0.4) +
            0.15 * Math.cos(6 * Math.PI * safeFm * t - 0.3));
      }
    }

    const mTotal = mBase + dcOffset;
    if (i > 0) {
      integralM += 0.5 * (prevMTotal + mTotal) * dt;
    }
    prevMTotal = mTotal;
    mIntegralVal = integralM;

    const cVal = Ac * Math.cos(2 * Math.PI * fc * t);
    const fiVal = fc + kf * mTotal;
    const angle = 2 * Math.PI * fc * t + 2 * Math.PI * kf * mIntegralVal;
    let sVal = Ac * Math.cos(angle);

    maxEnvelopeObserved = Math.max(maxEnvelopeObserved, Math.abs(sVal));
    if (channelNoise > 0) {
      const pseudorand = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
      sVal += (pseudorand - Math.floor(pseudorand) - 0.5) * 2 * channelNoise;
    }

    const tRound = Number(t.toFixed(5));
    mPoints[i] = { x: tRound, y: Number(mTotal.toFixed(4)) };
    cPoints[i] = { x: tRound, y: Number(cVal.toFixed(4)) };
    sPoints[i] = { x: tRound, y: Number(sVal.toFixed(4)) };
    fiPoints[i] = { x: tRound, y: Number(fiVal.toFixed(3)) };
    envelopeUpper[i] = { x: tRound, y: Ac };
    envelopeLower[i] = { x: tRound, y: -Ac };
  }

  // Modulation index β = Δf / fm
  const beta = deltaF / safeFm;

  // Carson's bandwidth BT = 2 * (Δf + fm)
  const carsonBandwidth = 2 * (deltaF + safeFm);

  const fiMin = fc + kf * dcOffset - deltaF;
  const fiMax = fc + kf * dcOffset + deltaF;
  const envelopeDeviation = Math.abs(Ac - maxEnvelopeObserved);

  return {
    mPoints,
    cPoints,
    sPoints,
    fiPoints,
    envelopeUpper,
    envelopeLower,
    timeSpan,
    windowPeriods: clampedPeriods,
    samplingFreq: Math.round(effectiveSf),
    numPoints,
    deltaF,
    beta,
    carsonBandwidth,
    fiMin,
    fiMax,
    envelopeDeviation,
    isNarrowband: beta < 0.5,
  };
}

/**
 * Decodes an uploaded audio File into a normalized Float32Array
 */
export async function decodeAudioFile(file: File): Promise<{
  buffer: Float32Array;
  sampleRate: number;
  duration: number;
}> {
  const arrayBuffer = await file.arrayBuffer();
  const AudioCtxClass =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const audioCtx = new AudioCtxClass();
  const decodedData = await audioCtx.decodeAudioData(arrayBuffer);

  const channelData = decodedData.getChannelData(0);
  const targetSamples = Math.min(channelData.length, 4000);
  const step = Math.max(1, Math.floor(channelData.length / targetSamples));
  const normalized = new Float32Array(targetSamples);

  let peak = 0;
  for (let i = 0; i < targetSamples; i++) {
    const val = channelData[i * step];
    normalized[i] = val;
    if (Math.abs(val) > peak) peak = Math.abs(val);
  }

  if (peak > 0) {
    for (let i = 0; i < targetSamples; i++) {
      normalized[i] /= peak;
    }
  }

  return {
    buffer: normalized,
    sampleRate: decodedData.sampleRate,
    duration: decodedData.duration,
  };
}
