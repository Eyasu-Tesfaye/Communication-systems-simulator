/**
 * Mathematical Signal Processing & Coherent Demodulation Engine for Module 2.2 (DSB-SC)
 * Optimized with zero-allocation Float64Array buffers for smooth 60fps multi-stage animation.
 */

export type BasebandWaveform = 'cosine' | 'twotone' | 'triangle' | 'square';

export interface DsbScParams {
  waveform: BasebandWaveform;
  fm: number;          // Message frequency (Hz)
  Am: number;          // Message amplitude (V)
  fc: number;          // Carrier frequency (Hz)
  Ac: number;          // Carrier amplitude (V)
  thetaDeg: number;    // Local Oscillator phase error in degrees (-180 to 180)
  freqOffset: number;  // Local Oscillator frequency offset Δf in Hz (-2 to 2)
  lpfCutoff: number;   // Ideal/Butterworth LPF cutoff frequency (Hz)
  lpfEnabled: boolean; // Toggle LPF stage in demodulator
}

export interface SpectralLine {
  freq: number;
  amplitude: number;
  label?: string;
  kind: 'lsb' | 'usb' | 'carrier' | 'baseband' | 'double_freq';
}

export interface DsbScSimulationResult {
  sampleCount: number;
  mValues: Float64Array;
  cValues: Float64Array;
  sValues: Float64Array;
  envPosValues: Float64Array;
  envNegValues: Float64Array;
  cRxValues: Float64Array;
  cRxRefValues: Float64Array;
  vValues: Float64Array;
  mHatValues: Float64Array;
  mTargetValues: Float64Array;
  zeroCrossings: number[]; // Times t where m(t) crosses zero (180° phase flips)
  txSpectrum: SpectralLine[];
  rxPreFilterSpectrum: SpectralLine[];
  bandwidthHz: number;
  totalSidebandPower: number;
  attenuationFactor: number; // cos(theta)
  rmse: number;
}

/**
 * Evaluate baseband modulating signal m(t) at time t.
 */
export function evaluateMessage(waveform: BasebandWaveform, Am: number, fm: number, t: number): number {
  const w = 2 * Math.PI * fm * t;
  switch (waveform) {
    case 'cosine':
      return Am * Math.cos(w);
    case 'twotone':
      return Am * (0.6 * Math.cos(w) + 0.4 * Math.cos(2 * w));
    case 'triangle': {
      const phase = ((fm * t) % 1 + 1) % 1;
      const tri = phase < 0.5 ? 1 - 4 * phase : -1 + 4 * (phase - 0.5);
      return Am * tri;
    }
    case 'square': {
      let sum = 0;
      for (let k = 1; k <= 9; k += 2) {
        sum += (Math.cos(k * w) * (k % 4 === 1 ? 1 : -1)) / k;
      }
      return Am * (4 / Math.PI) * sum;
    }
    default:
      return Am * Math.cos(w);
  }
}

/**
 * Compute harmonic spectral components (f_k, A_k) of the baseband signal m(t).
 */
export function getMessageHarmonics(
  waveform: BasebandWaveform,
  Am: number,
  fm: number
): Array<{ freq: number; amp: number }> {
  switch (waveform) {
    case 'cosine':
      return [{ freq: fm, amp: Am }];
    case 'twotone':
      return [
        { freq: fm, amp: 0.6 * Am },
        { freq: 2 * fm, amp: 0.4 * Am },
      ];
    case 'triangle':
      return [1, 3, 5].map((k) => ({
        freq: k * fm,
        amp: (8 / (Math.PI * Math.PI * k * k)) * Am,
      }));
    case 'square':
      return [1, 3, 5, 7].map((k) => ({
        freq: k * fm,
        amp: (4 / (Math.PI * k)) * Am,
      }));
    default:
      return [{ freq: fm, amp: Am }];
  }
}

/**
 * Evaluate Butterworth 4th-order magnitude response |H(f)| for overlay on Demod Spectrum
 */
export function evaluateLPFMagnitude(freqHz: number, cutoffHz: number): number {
  if (cutoffHz <= 0) return 0;
  const ratio = freqHz / cutoffHz;
  return 1 / (1 + Math.pow(ratio, 4));
}

// Reusable scratch buffers for zero-allocation 60fps simulation
const FS = 480;
const PAD_SEC = 0.35;
const PAD_COUNT = Math.round(PAD_SEC * FS);

let scratchTotalCount = 0;
let scratchRawV = new Float64Array(0);
let scratchFwdV = new Float64Array(0);
let scratchBwdV = new Float64Array(0);
let scratchM = new Float64Array(0);
let scratchC = new Float64Array(0);
let scratchS = new Float64Array(0);
let scratchCRx = new Float64Array(0);
let scratchCRxRef = new Float64Array(0);

function ensureScratch(totalCount: number) {
  if (scratchTotalCount >= totalCount) return;
  scratchTotalCount = totalCount;
  scratchRawV = new Float64Array(totalCount);
  scratchFwdV = new Float64Array(totalCount);
  scratchBwdV = new Float64Array(totalCount);
  scratchM = new Float64Array(totalCount);
  scratchC = new Float64Array(totalCount);
  scratchS = new Float64Array(totalCount);
  scratchCRx = new Float64Array(totalCount);
  scratchCRxRef = new Float64Array(totalCount);
}

/**
 * In-place zero-phase 4th-order Butterworth LPF (forward + reverse biquad pass)
 */
function applyZeroPhaseButterworthLPF(
  input: Float64Array,
  fwd: Float64Array,
  bwd: Float64Array,
  n: number,
  fs: number,
  cutoffHz: number
): Float64Array {
  const clampedCutoff = Math.max(0.25, Math.min(cutoffHz, fs * 0.45));
  const K = Math.tan((Math.PI * clampedCutoff) / fs);
  const Q = Math.SQRT1_2;
  const norm = 1 / (1 + K / Q + K * K);

  const b0 = K * K * norm;
  const b1 = 2 * b0;
  const b2 = b0;
  const a1 = 2 * (K * K - 1) * norm;
  const a2 = (1 - K / Q + K * K) * norm;

  // Forward pass
  let x1 = input[0] ?? 0;
  let x2 = x1;
  let y1 = x1;
  let y2 = x1;
  for (let i = 0; i < n; i++) {
    const x0 = input[i];
    const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    fwd[i] = y0;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
  }

  // Backward pass (in-place reverse indexing)
  x1 = fwd[n - 1] ?? 0;
  x2 = x1;
  y1 = x1;
  y2 = x1;
  for (let i = n - 1; i >= 0; i--) {
    const x0 = fwd[i];
    const y0 = b0 * x0 + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    bwd[i] = y0;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
  }

  return bwd;
}

/**
 * Run complete 5-stage DSB-SC modulation & coherent demodulation pipeline.
 */
export function simulateDsbScPipeline(
  params: DsbScParams,
  timeOffset = 0,
  windowDuration = 1.0,
  reuseBuffers?: DsbScSimulationResult
): DsbScSimulationResult {
  const { waveform, fm, Am, fc, Ac, thetaDeg, freqOffset, lpfCutoff, lpfEnabled } = params;
  const thetaRad = (thetaDeg * Math.PI) / 180;

  const visibleCount = Math.round(windowDuration * FS) + 1;
  const totalCount = visibleCount + 2 * PAD_COUNT;
  ensureScratch(totalCount);

  const dt = 1 / FS;
  const twoPiFc = 2 * Math.PI * fc;
  const twoPiFrx = 2 * Math.PI * (fc + freqOffset);

  for (let i = 0; i < totalCount; i++) {
    const t = timeOffset - PAD_SEC + i * dt;
    const m = evaluateMessage(waveform, Am, fm, t);
    const c = Ac * Math.cos(twoPiFc * t);
    const s = m * c;
    const cRx = Math.cos(twoPiFrx * t + thetaRad);
    const cRxRef = Math.cos(twoPiFc * t);

    scratchM[i] = m;
    scratchC[i] = c;
    scratchS[i] = s;
    scratchCRx[i] = cRx;
    scratchCRxRef[i] = cRxRef;
    scratchRawV[i] = 2 * s * cRx;
  }

  const filteredV = lpfEnabled
    ? applyZeroPhaseButterworthLPF(scratchRawV, scratchFwdV, scratchBwdV, totalCount, FS, lpfCutoff)
    : scratchRawV;

  const canReuse = reuseBuffers && reuseBuffers.sampleCount === visibleCount;
  const mValues = canReuse ? reuseBuffers.mValues : new Float64Array(visibleCount);
  const cValues = canReuse ? reuseBuffers.cValues : new Float64Array(visibleCount);
  const sValues = canReuse ? reuseBuffers.sValues : new Float64Array(visibleCount);
  const envPosValues = canReuse ? reuseBuffers.envPosValues : new Float64Array(visibleCount);
  const envNegValues = canReuse ? reuseBuffers.envNegValues : new Float64Array(visibleCount);
  const cRxValues = canReuse ? reuseBuffers.cRxValues : new Float64Array(visibleCount);
  const cRxRefValues = canReuse ? reuseBuffers.cRxRefValues : new Float64Array(visibleCount);
  const vValues = canReuse ? reuseBuffers.vValues : new Float64Array(visibleCount);
  const mHatValues = canReuse ? reuseBuffers.mHatValues : new Float64Array(visibleCount);
  const mTargetValues = canReuse ? reuseBuffers.mTargetValues : new Float64Array(visibleCount);

  const zeroCrossings: number[] = [];
  let sumSqErr = 0;

  for (let k = 0; k < visibleCount; k++) {
    const idx = PAD_COUNT + k;
    const m = scratchM[idx];
    const mHat = filteredV[idx];
    const mTarget = Ac * m;
    const env = Ac * Math.abs(m);

    mValues[k] = m;
    cValues[k] = scratchC[idx];
    sValues[k] = scratchS[idx];
    envPosValues[k] = env;
    envNegValues[k] = -env;
    cRxValues[k] = scratchCRx[idx];
    cRxRefValues[k] = scratchCRxRef[idx];
    vValues[k] = scratchRawV[idx];
    mHatValues[k] = mHat;
    mTargetValues[k] = mTarget;

    const err = mHat - mTarget;
    sumSqErr += err * err;

    if (k > 0) {
      const prevM = scratchM[idx - 1];
      if ((prevM > 0 && m <= 0) || (prevM < 0 && m >= 0)) {
        const frac = Math.abs(prevM) / (Math.abs(prevM) + Math.abs(m) + 1e-9);
        const tCross = timeOffset - PAD_SEC + (idx - 1 + frac) * dt;
        zeroCrossings.push(tCross);
      }
    }
  }

  // Build exact TX DSB-SC Spectrum |S(f)|
  const harmonics = getMessageHarmonics(waveform, Am, fm);
  const txSpectrum: SpectralLine[] = [
    {
      freq: fc,
      amplitude: 0,
      label: 'fc (Suppressed)',
      kind: 'carrier',
    },
  ];

  for (let idx = 0; idx < harmonics.length; idx++) {
    const h = harmonics[idx];
    const sbAmp = (Ac * h.amp) / 2;
    if (fc - h.freq >= 0) {
      txSpectrum.push({
        freq: fc - h.freq,
        amplitude: sbAmp,
        label: idx === 0 ? 'LSB' : undefined,
        kind: 'lsb',
      });
    }
    txSpectrum.push({
      freq: fc + h.freq,
      amplitude: sbAmp,
      label: idx === 0 ? 'USB' : undefined,
      kind: 'usb',
    });
  }

  // Build RX Pre-LPF Multiplier Spectrum |V(f)|
  const rxPreFilterSpectrum: SpectralLine[] = [];
  for (let idx = 0; idx < harmonics.length; idx++) {
    const h = harmonics[idx];
    const amp = Ac * h.amp;
    const basebandFreq = Math.abs(h.freq + freqOffset);
    rxPreFilterSpectrum.push({
      freq: basebandFreq,
      amplitude: amp,
      label: idx === 0 ? 'Baseband' : undefined,
      kind: 'baseband',
    });
    const doubleCenter = 2 * fc + freqOffset;
    if (doubleCenter - h.freq > 0) {
      rxPreFilterSpectrum.push({
        freq: doubleCenter - h.freq,
        amplitude: amp * 0.5,
        kind: 'double_freq',
      });
    }
    rxPreFilterSpectrum.push({
      freq: doubleCenter + h.freq,
      amplitude: amp * 0.5,
      label: idx === 0 ? '2fc ± fm' : undefined,
      kind: 'double_freq',
    });
  }

  const maxMsgFreq = harmonics[harmonics.length - 1]?.freq ?? fm;
  const bandwidthHz = 2 * maxMsgFreq;

  let totalSidebandPower = 0;
  for (let i = 0; i < harmonics.length; i++) {
    const v = (Ac * harmonics[i].amp) / 2;
    totalSidebandPower += v * v;
  }

  return {
    sampleCount: visibleCount,
    mValues,
    cValues,
    sValues,
    envPosValues,
    envNegValues,
    cRxValues,
    cRxRefValues,
    vValues,
    mHatValues,
    mTargetValues,
    zeroCrossings,
    txSpectrum,
    rxPreFilterSpectrum,
    bandwidthHz,
    totalSidebandPower,
    attenuationFactor: Math.cos(thetaRad),
    rmse: Math.sqrt(sumSqErr / Math.max(1, visibleCount)),
  };
}
