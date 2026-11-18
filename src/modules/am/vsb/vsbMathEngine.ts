/**
 * Vestigial Sideband (VSB) Modulation & Demodulation Mathematical Engine
 *
 * Strictly scoped to class concepts:
 * - Message spectrum M(f) (triangular baseband, bandwidth W)
 * - DSB-SC spectrum (bandwidth 2W), SSB spectrum (bandwidth W), VSB spectrum (bandwidth W + fv)
 * - VSB shaping filter H(f) with straight-line transition across the vestige region [fc - fv, fc + fv]
 * - VSB filter symmetry condition: H(f + fc) + H(f - fc) = 1 for -W <= f <= W
 * - Coherent detection: s_VSB(t) * cos(2 pi fc t) -> LPF (assuming perfect synchronization)
 * - Recovery error (RMSE) under condition satisfied (Yes) vs not satisfied (No)
 */

export type VsbMessageOption = 'one_tone' | 'two_tone' | 'low_freq_rich';

export interface VsbParams {
  W: number; // Baseband message bandwidth W (2.0 to 8.0 Hz, default 4.0 Hz)
  fc: number; // Carrier frequency fc (16.0 to 36.0 Hz, default 24.0 Hz)
  fv: number; // Vestige width fv (0.5 to min(4.0, W), default 1.0 Hz -> 0.25*W)
  carrierAmp: number; // Ac (1.0 to 3.0 V, default 2.0 V)
  messageAmp: number; // Am (0.5 to 2.0 V, default 1.2 V)
  messageOption: VsbMessageOption;
  filterSatisfiesCondition: boolean;
}

export const DEFAULT_VSB_PARAMS: VsbParams = {
  W: 4.0,
  fc: 24.0,
  fv: 1.0,
  carrierAmp: 2.0,
  messageAmp: 1.2,
  messageOption: 'low_freq_rich',
  filterSatisfiesCondition: true,
};

// Fixed coherent simulation grid: T = 2.0 s, N = 1024 -> fs = 512 Hz, df = 0.5 Hz
export const VSB_DURATION = 2.0;
export const VSB_N = 1024;
export const VSB_FS = VSB_N / VSB_DURATION; // 512 Hz
export const VSB_DF = 1 / VSB_DURATION; // 0.5 Hz

export interface Complex {
  re: number;
  im: number;
}

export function fft(input: Complex[]): Complex[] {
  const n = input.length;
  const out: Complex[] = input.map((c) => ({ re: c.re, im: c.im }));

  let j = 0;
  for (let i = 1; i < n; i++) {
    let bit = n >> 1;
    while (j & bit) {
      j ^= bit;
      bit >>= 1;
    }
    j ^= bit;
    if (i < j) {
      const tmp = out[i];
      out[i] = out[j];
      out[j] = tmp;
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1;
    const angle = (-2 * Math.PI) / len;
    const wLenRe = Math.cos(angle);
    const wLenIm = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let wRe = 1;
      let wIm = 0;
      for (let k = 0; k < halfLen; k++) {
        const u = out[i + k];
        const vRe = out[i + k + halfLen].re * wRe - out[i + k + halfLen].im * wIm;
        const vIm = out[i + k + halfLen].re * wIm + out[i + k + halfLen].im * wRe;

        out[i + k] = { re: u.re + vRe, im: u.im + vIm };
        out[i + k + halfLen] = { re: u.re - vRe, im: u.im - vIm };

        const nextWRe = wRe * wLenRe - wIm * wLenIm;
        wIm = wRe * wLenIm + wIm * wLenRe;
        wRe = nextWRe;
      }
    }
  }

  return out;
}

export function ifft(input: Complex[]): Complex[] {
  const n = input.length;
  const conjugated = input.map((c) => ({ re: c.re, im: -c.im }));
  const transformed = fft(conjugated);
  return transformed.map((c) => ({ re: c.re / n, im: -c.im / n }));
}

export function sampleAtTime(arr: number[], t: number): number {
  if (arr.length === 0) return 0;
  const wrappedT = ((t % VSB_DURATION) + VSB_DURATION) % VSB_DURATION;
  const floatIdx = (wrappedT / VSB_DURATION) * arr.length;
  const i0 = Math.floor(floatIdx) % arr.length;
  const i1 = (i0 + 1) % arr.length;
  const frac = floatIdx - Math.floor(floatIdx);
  return arr[i0] * (1 - frac) + arr[i1] * frac;
}

/**
 * Evaluates the VSB shaping filter H(f) (even-symmetric: H(-f) = H(f)).
 * When satisfiesCondition is true, H(f) uses a straight-line transition across
 * the vestige region [fc - fv, fc + fv] passing through H(fc) = 0.5,
 * guaranteeing H(f + fc) + H(f - fc) = 1 for all -W <= f <= W.
 * When satisfiesCondition is false, H(f) has a shifted / improper slope that
 * violates H(f + fc) + H(f - fc) = 1 across [-W, W], causing visible distortion.
 */
export function evalVsbFilter(
  freq: number,
  fc: number,
  W: number,
  fv: number,
  satisfiesCondition: boolean
): number {
  const absF = Math.abs(freq);
  const safeFv = Math.max(0.25, Math.min(fv, W));

  if (satisfiesCondition) {
    if (absF <= fc - safeFv) return 0;
    if (absF < fc + safeFv) {
      return 0.5 + (absF - fc) / (2 * safeFv);
    }
    if (absF <= fc + W + 1.0) return 1.0;
    return 0;
  } else {
    // Violates H(f + fc) + H(f - fc) = 1:
    // Shifted cutoff & non-flat gain slope across the sideband
    const start = fc - 0.25 * safeFv;
    const midEnd = fc + safeFv;
    const passEnd = fc + W + 1.0;
    if (absF <= start) return 0;
    if (absF < midEnd) {
      return 0.45 * ((absF - start) / Math.max(1e-6, midEnd - start));
    }
    if (absF <= passEnd) {
      const frac = Math.min(1, (absF - midEnd) / Math.max(1e-6, W - safeFv));
      return 0.45 + 0.72 * frac;
    }
    return 0;
  }
}

export interface ContinuousCurvePoint {
  freq: number;
  val: number;
}

export interface ModulatorCurvePoint {
  freq: number;
  dsbMag: number;
  filterH: number;
  vsbMag: number;
}

export interface ConditionCheckPoint {
  freq: number;
  hPlus: number;
  hMinus: number;
  sum: number;
  target: number;
}

export interface VsbSimulationData {
  params: VsbParams;
  effectiveFv: number;

  // Bandwidth & ratio readouts
  bwMessage: number; // W
  bwDsbSc: number; // 2W
  bwSsb: number; // W
  bwVsb: number; // W + fv
  vsbToWRatio: number; // (W + fv) / W

  // Tab 1: Ideal two-sided triangular spectra on common axis [-maxFreq, +maxFreq]
  spectrumMaxFreq: number;
  messageSpectrumCurve: ContinuousCurvePoint[];
  dsbSpectrumCurve: ContinuousCurvePoint[];
  ssbSpectrumCurve: ContinuousCurvePoint[];
  vsbSpectrumCurve: ContinuousCurvePoint[];

  // Tab 2: Modulator & filter curves + H(f+fc)+H(f-fc) check over [-W, W]
  modulatorCurves: ModulatorCurvePoint[];
  conditionCurve: ConditionCheckPoint[];
  maxConditionError: number;
  isConditionSatisfied: boolean;

  // Tab 3: Coherent Demodulation time-domain waveforms
  timeSteps: number[];
  message: number[];
  dsbSignal: number[];
  vsbSignal: number[];
  productSignal: number[]; // s_VSB(t) * cos(2 pi fc t)
  recoveredMessage: number[]; // LPF output scaled to match m(t)
  rmse: number;
  normalizedRmsePct: number;
  activeToneSummary: string;
}

function evalTriangularM(f: number, W: number): number {
  const absF = Math.abs(f);
  if (absF >= W) return 0;
  return 1 - absF / W;
}

export function generateVsbSimulation(params: VsbParams): VsbSimulationData {
  const W = Math.max(2.0, Math.min(8.0, params.W));
  const fc = Math.max(16.0, Math.min(36.0, params.fc));
  const effectiveFv = Math.max(0.5, Math.min(params.fv, W));
  const { carrierAmp: Ac, messageAmp: Am, messageOption, filterSatisfiesCondition } = params;

  const bwMessage = W;
  const bwDsbSc = 2 * W;
  const bwSsb = W;
  const bwVsb = W + effectiveFv;
  const vsbToWRatio = bwVsb / bwMessage;

  // Common symmetric two-sided frequency axis for Tab 1 & Tab 2
  const spectrumMaxFreq = Math.ceil((fc + W + 4) / 4) * 4; // Clean multiple of 4 Hz
  const specPoints = 640;
  const dfSpec = (2 * spectrumMaxFreq) / specPoints;

  const messageSpectrumCurve: ContinuousCurvePoint[] = [];
  const dsbSpectrumCurve: ContinuousCurvePoint[] = [];
  const ssbSpectrumCurve: ContinuousCurvePoint[] = [];
  const vsbSpectrumCurve: ContinuousCurvePoint[] = [];
  const modulatorCurves: ModulatorCurvePoint[] = [];

  for (let i = 0; i <= specPoints; i++) {
    const f = -spectrumMaxFreq + i * dfSpec;
    const mVal = evalTriangularM(f, W);
    const dsbVal = 0.5 * (evalTriangularM(f - fc, W) + evalTriangularM(f + fc, W));
    const ssbVal = Math.abs(f) >= fc ? dsbVal : 0;
    const hVal = evalVsbFilter(f, fc, W, effectiveFv, filterSatisfiesCondition);
    const vsbVal = dsbVal * hVal;

    messageSpectrumCurve.push({ freq: f, val: mVal });
    dsbSpectrumCurve.push({ freq: f, val: dsbVal });
    ssbSpectrumCurve.push({ freq: f, val: ssbVal });
    vsbSpectrumCurve.push({ freq: f, val: vsbVal });

    modulatorCurves.push({
      freq: f,
      dsbMag: dsbVal,
      filterH: hVal,
      vsbMag: vsbVal,
    });
  }

  // Verification curve for H(f + fc) + H(f - fc) over -W <= f <= W
  const condPoints = 200;
  const conditionCurve: ConditionCheckPoint[] = [];
  let maxConditionError = 0;
  for (let i = 0; i <= condPoints; i++) {
    const f = -W + (2 * W * i) / condPoints;
    const hPlus = evalVsbFilter(f + fc, fc, W, effectiveFv, filterSatisfiesCondition);
    const hMinus = evalVsbFilter(f - fc, fc, W, effectiveFv, filterSatisfiesCondition);
    const sum = hPlus + hMinus;
    const err = Math.abs(sum - 1.0);
    if (err > maxConditionError) maxConditionError = err;
    conditionCurve.push({
      freq: f,
      hPlus,
      hMinus,
      sum,
      target: 1.0,
    });
  }
  const isConditionSatisfied = maxConditionError < 1e-3;

  // =========================================================================
  // TAB 3: COHERENT DEMODULATION TIME-DOMAIN SIMULATION (exact 0.5 Hz grid)
  // =========================================================================
  const timeSteps: number[] = new Array(VSB_N);
  const message: number[] = new Array(VSB_N);
  const dsbSignal: number[] = new Array(VSB_N);
  const carrierCos: number[] = new Array(VSB_N);

  // Choose bin-aligned frequencies <= W
  const snapHalf = (val: number) => Math.max(0.5, Math.min(W, Math.round(val * 2) / 2));

  let activeToneSummary = '';
  if (messageOption === 'one_tone') {
    const f1 = snapHalf(Math.max(1.0, 0.5 * W));
    activeToneSummary = `1-Tone Cosine (${f1.toFixed(1)} Hz ≤ W)`;
    for (let k = 0; k < VSB_N; k++) {
      const t = (k / VSB_N) * VSB_DURATION;
      timeSteps[k] = t;
      message[k] = Am * Math.cos(2 * Math.PI * f1 * t);
    }
  } else if (messageOption === 'two_tone') {
    const f1 = snapHalf(1.0);
    const f2 = snapHalf(Math.max(2.0, 0.85 * W));
    activeToneSummary = `2-Tone (${f1.toFixed(1)} Hz + ${f2.toFixed(1)} Hz)`;
    for (let k = 0; k < VSB_N; k++) {
      const t = (k / VSB_N) * VSB_DURATION;
      timeSteps[k] = t;
      message[k] =
        Am * (0.62 * Math.cos(2 * Math.PI * f1 * t) + 0.52 * Math.cos(2 * Math.PI * f2 * t));
    }
  } else {
    // Low-frequency-rich (video-like DC + low-order harmonics)
    const f1 = snapHalf(0.5);
    const f2 = snapHalf(1.0);
    const f3 = snapHalf(Math.min(W, 1.5));
    activeToneSummary = `Low-Freq Rich (DC + ${f1.toFixed(1)}, ${f2.toFixed(1)}, ${f3.toFixed(1)} Hz)`;
    for (let k = 0; k < VSB_N; k++) {
      const t = (k / VSB_N) * VSB_DURATION;
      timeSteps[k] = t;
      message[k] =
        Am *
        (0.45 +
          0.42 * Math.cos(2 * Math.PI * f1 * t) +
          0.26 * Math.cos(2 * Math.PI * f2 * t) +
          0.14 * Math.cos(2 * Math.PI * f3 * t));
    }
  }

  for (let k = 0; k < VSB_N; k++) {
    const t = timeSteps[k];
    const c = Math.cos(2 * Math.PI * fc * t);
    carrierCos[k] = c;
    dsbSignal[k] = Ac * message[k] * c;
  }

  // Apply VSB shaping filter H(f) in frequency domain
  const dsbSpec = fft(dsbSignal.map((x) => ({ re: x, im: 0 })));
  const half = VSB_N >> 1;
  const vsbSpec: Complex[] = dsbSpec.map((bin, idx) => {
    const signedIdx = idx <= half ? idx : idx - VSB_N;
    const f = signedIdx * VSB_DF;
    const h = evalVsbFilter(f, fc, W, effectiveFv, filterSatisfiesCondition);
    return { re: bin.re * h, im: bin.im * h };
  });

  const vsbSignal = ifft(vsbSpec).map((c) => c.re);

  // Coherent detector: product modulator v(t) = s_VSB(t) * cos(2 pi fc t)
  const productSignal: number[] = new Array(VSB_N);
  for (let k = 0; k < VSB_N; k++) {
    productSignal[k] = vsbSignal[k] * carrierCos[k];
  }

  // Ideal LPF passing |f| <= W + 0.5 Hz (cleanly rejecting 2*fc terms)
  // Scale factor 4 / Ac recovers m(t) with unit gain when H(f+fc)+H(f-fc)=1
  const lpfCutoff = W + 0.5;
  const prodSpec = fft(productSignal.map((x) => ({ re: x, im: 0 })));
  const scale = 4 / Math.max(0.1, Ac);
  const lpfSpec: Complex[] = prodSpec.map((bin, idx) => {
    const signedIdx = idx <= half ? idx : idx - VSB_N;
    const absF = Math.abs(signedIdx * VSB_DF);
    if (absF <= lpfCutoff + 1e-6) {
      return { re: bin.re * scale, im: bin.im * scale };
    }
    return { re: 0, im: 0 };
  });

  const recoveredMessage = ifft(lpfSpec).map((c) => c.re);

  // Compute Recovery Error (RMSE)
  let sumSqErr = 0;
  let sumSqOrig = 0;
  for (let k = 0; k < VSB_N; k++) {
    const diff = message[k] - recoveredMessage[k];
    sumSqErr += diff * diff;
    sumSqOrig += message[k] * message[k];
  }
  const rmse = Math.sqrt(sumSqErr / VSB_N);
  const rmsOrig = Math.sqrt(sumSqOrig / VSB_N);
  const normalizedRmsePct = rmsOrig > 1e-6 ? (rmse / rmsOrig) * 100 : 0;

  return {
    params,
    effectiveFv,
    bwMessage,
    bwDsbSc,
    bwSsb,
    bwVsb,
    vsbToWRatio,
    spectrumMaxFreq,
    messageSpectrumCurve,
    dsbSpectrumCurve,
    ssbSpectrumCurve,
    vsbSpectrumCurve,
    modulatorCurves,
    conditionCurve,
    maxConditionError,
    isConditionSatisfied,
    timeSteps,
    message,
    dsbSignal,
    vsbSignal,
    productSignal,
    recoveredMessage,
    rmse,
    normalizedRmsePct,
    activeToneSummary,
  };
}
