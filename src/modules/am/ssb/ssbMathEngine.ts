/**
 * Single Sideband (SSB) Modulation & Demodulation Mathematical Engine
 *
 * Implements:
 * - Single-tone and multi-tone/general message signals
 * - Exact DFT-based Discrete Hilbert Transform m_hat(t)
 * - SSB-SC USB & LSB modulation (both single-tone and Hartley phase-shift forms)
 * - Conventional AM & DSB-SC reference signals for comparison
 * - Exact Radix-2 FFT single-sided amplitude spectra (zero spectral leakage on 0.5 Hz grid)
 * - Coherent Product Detection with LO frequency offset & phase error
 * - Zero-phase frequency-domain Butterworth-rolloff Low-Pass Filter
 * - Quantitative reconstruction error (RMSE, Pearson correlation, Peak Error) & Power/BW metrics
 */

export type SidebandMode = 'usb' | 'lsb';
export type MessageShape = 'single_tone' | 'two_tone' | 'bandlimited_pulse';

export interface SsbParams {
  messageShape: MessageShape;
  messageAmp: number; // Am (0.2 to 2.5 V)
  messageFreq: number; // fm (1.0 to 8.0 Hz, step 0.5 Hz)
  carrierAmp: number; // Ac (0.5 to 3.0 V)
  carrierFreq: number; // fc (14.0 to 40.0 Hz, step 1.0 Hz)
  sideband: SidebandMode;
  loFreqOffset: number; // Delta f = f_LO - fc (-4.0 to +4.0 Hz)
  loPhaseDeg: number; // Delta phi (-180 to +180 deg)
  lpfCutoff: number; // f_cut (1.0 to 40.0 Hz)
  amModIndex: number; // Reference AM modulation index mu for comparison (0.2 to 1.0)
  seed: number;
}

export const DEFAULT_SSB_PARAMS: SsbParams = {
  messageShape: 'single_tone',
  messageAmp: 1.5,
  messageFreq: 2.0,
  carrierAmp: 2.0,
  carrierFreq: 18.0,
  sideband: 'usb',
  loFreqOffset: 0.0,
  loPhaseDeg: 0,
  lpfCutoff: 10.0,
  amModIndex: 0.8,
  seed: 1,
};

// Fixed coherent simulation grid: T = 2.0 s, N = 1024 -> fs = 512 Hz, df = 0.5 Hz
export const SSB_DURATION = 2.0;
export const SSB_N = 1024;
export const SSB_FS = SSB_N / SSB_DURATION; // 512 Hz
export const SSB_DF = 1 / SSB_DURATION; // 0.5 Hz

export interface Complex {
  re: number;
  im: number;
}

// In-place iterative Cooley-Tukey Radix-2 FFT
export function fft(input: Complex[]): Complex[] {
  const n = input.length;
  const out: Complex[] = input.map((c) => ({ re: c.re, im: c.im }));

  // Bit-reversal permutation
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

  // Butterfly stages
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

// Exact Discrete Hilbert Transform via Frequency-Domain -j*sgn(f) multiplier
export function computeHilbertTransform(signal: number[]): number[] {
  const n = signal.length;
  const spectrum = fft(signal.map((x) => ({ re: x, im: 0 })));
  const half = n >> 1;

  // Multiply positive frequencies (1..N/2-1) by -j, negative frequencies (N/2+1..N-1) by +j
  // DC (0) and Nyquist (N/2) multiplied by 0
  spectrum[0] = { re: 0, im: 0 };
  spectrum[half] = { re: 0, im: 0 };

  for (let k = 1; k < half; k++) {
    // (-j) * (re + j*im) = im - j*re
    const pos = spectrum[k];
    spectrum[k] = { re: pos.im, im: -pos.re };

    // (+j) * (re + j*im) = -im + j*re
    const negIdx = n - k;
    const neg = spectrum[negIdx];
    spectrum[negIdx] = { re: -neg.im, im: neg.re };
  }

  const timeDomain = ifft(spectrum);
  return timeDomain.map((c) => c.re);
}

// Single-sided amplitude spectrum [0 .. maxFreqHz]
export interface SpectrumPoint {
  freq: number;
  mag: number;
}

export function computeSingleSidedSpectrum(
  signal: number[],
  maxFreqHz: number = 60
): SpectrumPoint[] {
  const n = signal.length;
  const spec = fft(signal.map((x) => ({ re: x, im: 0 })));
  const maxBin = Math.min(n >> 1, Math.ceil(maxFreqHz / SSB_DF));
  const points: SpectrumPoint[] = new Array(maxBin + 1);

  for (let k = 0; k <= maxBin; k++) {
    const rawMag = Math.hypot(spec[k].re, spec[k].im) / n;
    const amp = k === 0 || k === n >> 1 ? rawMag : 2 * rawMag;
    points[k] = {
      freq: k * SSB_DF,
      mag: amp < 1e-6 ? 0 : amp,
    };
  }
  return points;
}

// Zero-phase 6th-order Butterworth frequency-domain Low-Pass Filter
export function applyLowPassFilter(signal: number[], cutoffHz: number): number[] {
  const n = signal.length;
  const spec = fft(signal.map((x) => ({ re: x, im: 0 })));
  const safeCut = Math.max(0.25, cutoffHz);
  const order = 6;

  for (let k = 0; k < n; k++) {
    const binFreq = k <= n >> 1 ? k * SSB_DF : (k - n) * SSB_DF;
    const ratio = Math.abs(binFreq) / safeCut;
    const gain = 1 / Math.sqrt(1 + Math.pow(ratio, 2 * order));
    spec[k] = {
      re: spec[k].re * gain,
      im: spec[k].im * gain,
    };
  }

  return ifft(spec).map((c) => c.re);
}

export interface ComparisonMetrics {
  amBandwidth: number;
  dsbBandwidth: number;
  ssbBandwidth: number;
  bandwidthSavingsPct: number;
  amEfficiencyPct: number;
  dsbEfficiencyPct: number;
  ssbEfficiencyPct: number;
  amTotalPower: number;
  dsbTotalPower: number;
  ssbTotalPower: number;
  powerSavingsVsAmPct: number;
  powerSavingsVsDsbPct: number;
}

export interface SsbSimulationData {
  params: SsbParams;
  timeSteps: number[]; // Length SSB_N
  dt: number;
  message: number[]; // m(t)
  messageHilbert: number[]; // m_hat(t)
  carrier: number[]; // c(t)
  amSignal: number[]; // s_AM(t) for reference
  dsbScSignal: number[]; // s_DSB-SC(t) for reference
  usbSignal: number[]; // s_USB(t)
  lsbSignal: number[]; // s_LSB(t)
  activeSsbSignal: number[]; // Selected USB or LSB
  localOscillator: number[]; // c_LO(t) = 2 cos(2*pi*f_LO*t + delta_phi)
  productOutput: number[]; // v_prod(t) = s_SSB(t) * c_LO(t) * (2/Ac)
  recoveredMessage: number[]; // LPF output m_hat_rec(t)
  // Frequency spectra (0 .. maxSpectrumFreq Hz)
  maxSpectrumFreq: number;
  messageSpectrum: SpectrumPoint[];
  carrierSpectrum: SpectrumPoint[];
  amSpectrum: SpectrumPoint[];
  dsbSpectrum: SpectrumPoint[];
  usbSpectrum: SpectrumPoint[];
  lsbSpectrum: SpectrumPoint[];
  activeSsbSpectrum: SpectrumPoint[];
  productSpectrum: SpectrumPoint[];
  recoveredSpectrum: SpectrumPoint[];
  // Key spectral frequencies
  messageBandwidth: number; // B (Hz)
  lsbFreqRange: [number, number];
  usbFreqRange: [number, number];
  loFreq: number;
  // Quantitative reconstruction errors
  rmse: number;
  normalizedRmsePct: number;
  correlation: number;
  peakError: number;
  // Bandwidth & Power Comparison
  comparison: ComparisonMetrics;
}

export function generateSsbSimulation(params: SsbParams): SsbSimulationData {
  const {
    messageShape,
    messageAmp: Am,
    messageFreq: fm,
    carrierAmp: Ac,
    carrierFreq: fc,
    sideband,
    loFreqOffset,
    loPhaseDeg,
    lpfCutoff,
    amModIndex,
    seed,
  } = params;

  const dt = SSB_DURATION / SSB_N;
  const timeSteps = new Array<number>(SSB_N);
  const message = new Array<number>(SSB_N);
  const carrier = new Array<number>(SSB_N);

  // Phase perturbation when seed > 1 (Generate Signal produces fresh phase variation in multi-tone/pulse)
  const seedOffset = ((seed - 1) * 0.45) % (2 * Math.PI);

  // Determine message bandwidth B (Hz) aligned to 0.5 Hz DFT grid
  let messageBandwidth = fm;
  const f1Pulse = Math.max(0.5, Math.round(fm) * 0.5);
  const f2Pulse = fm;
  const f3Pulse = Math.max(fm + 0.5, Math.round(2.5 * fm * 2) / 2);

  if (messageShape === 'two_tone') {
    messageBandwidth = 2 * fm;
  } else if (messageShape === 'bandlimited_pulse') {
    messageBandwidth = f3Pulse;
  }

  for (let k = 0; k < SSB_N; k++) {
    const t = k * dt;
    timeSteps[k] = t;

    let mVal = 0;
    if (messageShape === 'single_tone') {
      mVal = Am * Math.cos(2 * Math.PI * fm * t);
    } else if (messageShape === 'two_tone') {
      mVal =
        Am *
        (0.65 * Math.cos(2 * Math.PI * fm * t) +
          0.35 * Math.cos(2 * Math.PI * (2 * fm) * t + seedOffset));
    } else {
      // Smooth multi-harmonic baseband signal aligned to 0.5 Hz DFT bins
      mVal =
        Am *
        (0.5 * Math.cos(2 * Math.PI * f1Pulse * t + seedOffset * 0.5) +
          0.35 * Math.cos(2 * Math.PI * f2Pulse * t) +
          0.25 * Math.sin(2 * Math.PI * f3Pulse * t + seedOffset));
    }

    message[k] = mVal;
    carrier[k] = Ac * Math.cos(2 * Math.PI * fc * t);
  }

  // Exact Hilbert Transform m_hat(t)
  const messageHilbert = computeHilbertTransform(message);

  // Modulated Signals
  const amSignal = new Array<number>(SSB_N);
  const dsbScSignal = new Array<number>(SSB_N);
  const usbSignal = new Array<number>(SSB_N);
  const lsbSignal = new Array<number>(SSB_N);

  const safePeakM = Math.max(1e-6, Math.max(...message.map((v) => Math.abs(v))));

  for (let k = 0; k < SSB_N; k++) {
    const t = timeSteps[k];
    const cosC = Math.cos(2 * Math.PI * fc * t);
    const sinC = Math.sin(2 * Math.PI * fc * t);
    const m = message[k];
    const mHat = messageHilbert[k];

    // Conventional AM: Ac [1 + mu * m_norm(t)] cos(2*pi*fc*t)
    amSignal[k] = Ac * (1 + amModIndex * (m / safePeakM)) * cosC;

    // DSB-SC: Ac * m(t) * cos(2*pi*fc*t)
    dsbScSignal[k] = Ac * m * cosC;

    // SSB-SC (normalized to DSB-SC sideband scale Ac/2 so single-tone gives (Ac*Am/2)cos(2pi(fc ± fm)t))
    if (messageShape === 'single_tone') {
      usbSignal[k] = ((Ac * Am) / 2) * Math.cos(2 * Math.PI * (fc + fm) * t);
      lsbSignal[k] = ((Ac * Am) / 2) * Math.cos(2 * Math.PI * (fc - fm) * t);
    } else {
      usbSignal[k] = (Ac / 2) * (m * cosC - mHat * sinC);
      lsbSignal[k] = (Ac / 2) * (m * cosC + mHat * sinC);
    }
  }

  const activeSsbSignal = sideband === 'usb' ? usbSignal : lsbSignal;

  // Coherent Product Demodulator
  const loFreq = Math.max(1.0, fc + loFreqOffset);
  const loPhaseRad = (loPhaseDeg * Math.PI) / 180;
  const localOscillator = new Array<number>(SSB_N);
  const productOutput = new Array<number>(SSB_N);

  for (let k = 0; k < SSB_N; k++) {
    const t = timeSteps[k];
    const lo = 2 * Math.cos(2 * Math.PI * loFreq * t + loPhaseRad);
    localOscillator[k] = lo;
    // Normalized product detector output (scaled by 2/Ac so unit recovery yields m(t))
    productOutput[k] = (activeSsbSignal[k] * lo * 2) / Math.max(0.1, Ac);
  }

  const recoveredMessage = applyLowPassFilter(productOutput, lpfCutoff);

  // Reconstruction Error Metrics (recovered vs original m(t))
  let sqErrSum = 0;
  let peakError = 0;
  let mMean = 0;
  let rMean = 0;

  for (let k = 0; k < SSB_N; k++) {
    mMean += message[k] / SSB_N;
    rMean += recoveredMessage[k] / SSB_N;
  }

  let covSum = 0;
  let mVarSum = 0;
  let rVarSum = 0;
  let mSqSum = 0;

  for (let k = 0; k < SSB_N; k++) {
    const err = recoveredMessage[k] - message[k];
    sqErrSum += err * err;
    if (Math.abs(err) > peakError) peakError = Math.abs(err);

    const dm = message[k] - mMean;
    const dr = recoveredMessage[k] - rMean;
    covSum += dm * dr;
    mVarSum += dm * dm;
    rVarSum += dr * dr;
    mSqSum += message[k] * message[k];
  }

  const rmse = Math.sqrt(sqErrSum / SSB_N);
  const rmsMessage = Math.sqrt(mSqSum / SSB_N);
  const normalizedRmsePct = rmsMessage > 1e-6 ? (rmse / rmsMessage) * 100 : 0;
  const correlation =
    mVarSum > 1e-9 && rVarSum > 1e-9 ? covSum / Math.sqrt(mVarSum * rVarSum) : 0;

  // Spectra (up to max display frequency covering 2*fc + B if needed, default 64 Hz)
  const maxSpectrumFreq = Math.max(50, Math.min(200, Math.ceil((fc + messageBandwidth + 12) / 5) * 5));
  const messageSpectrum = computeSingleSidedSpectrum(message, maxSpectrumFreq);
  const carrierSpectrum = computeSingleSidedSpectrum(carrier, maxSpectrumFreq);
  const amSpectrum = computeSingleSidedSpectrum(amSignal, maxSpectrumFreq);
  const dsbSpectrum = computeSingleSidedSpectrum(dsbScSignal, maxSpectrumFreq);
  const usbSpectrum = computeSingleSidedSpectrum(usbSignal, maxSpectrumFreq);
  const lsbSpectrum = computeSingleSidedSpectrum(lsbSignal, maxSpectrumFreq);
  const activeSsbSpectrum = sideband === 'usb' ? usbSpectrum : lsbSpectrum;
  const productSpectrum = computeSingleSidedSpectrum(productOutput, Math.max(maxSpectrumFreq, 2 * fc + messageBandwidth + 8));
  const recoveredSpectrum = computeSingleSidedSpectrum(recoveredMessage, maxSpectrumFreq);

  // Bandwidth & Power Efficiency Calculations
  const msgPower = mSqSum / SSB_N;
  const Pc = (Ac * Ac) / 2;
  // AM normalized message power for sinusoidal tone (mu^2 / 2)
  const amPowerRatio = messageShape === 'single_tone' ? (amModIndex * amModIndex) / 2 : (amModIndex * amModIndex) * (msgPower / (safePeakM * safePeakM));
  const amTotalPower = Pc * (1 + amPowerRatio);
  const amSidebandPower = Pc * amPowerRatio;
  const amEfficiencyPct = amTotalPower > 0 ? (amSidebandPower / amTotalPower) * 100 : 0;

  const dsbTotalPower = dsbScSignal.reduce((a, v) => a + v * v, 0) / SSB_N;
  const ssbTotalPower = activeSsbSignal.reduce((a, v) => a + v * v, 0) / SSB_N;

  // For equal sideband-information power at message amplitude Am:
  // DSB-SC transmits BOTH sidebands: P_DSB = Ac^2 * P_m / 2; SSB transmits ONE: P_SSB = Ac^2 * P_m / 4 = 50% of DSB-SC
  const powerSavingsVsAmPct =
    amTotalPower > 0 ? Math.max(0, (1 - ssbTotalPower / amTotalPower) * 100) : 0;
  const powerSavingsVsDsbPct =
    dsbTotalPower > 0 ? Math.max(0, (1 - ssbTotalPower / dsbTotalPower) * 100) : 0;

  const lsbLow = messageShape === 'single_tone' ? Math.max(0, fc - fm) : Math.max(0, fc - messageBandwidth);
  const lsbHigh = messageShape === 'single_tone' ? Math.max(0, fc - fm) : Math.max(0, fc - (messageShape === 'two_tone' ? fm : 0.5));
  const usbLow = messageShape === 'single_tone' ? fc + fm : fc + (messageShape === 'two_tone' ? fm : 0.5);
  const usbHigh = fc + messageBandwidth;

  return {
    params,
    timeSteps,
    dt,
    message,
    messageHilbert,
    carrier,
    amSignal,
    dsbScSignal,
    usbSignal,
    lsbSignal,
    activeSsbSignal,
    localOscillator,
    productOutput,
    recoveredMessage,
    maxSpectrumFreq,
    messageSpectrum,
    carrierSpectrum,
    amSpectrum,
    dsbSpectrum,
    usbSpectrum,
    lsbSpectrum,
    activeSsbSpectrum,
    productSpectrum,
    recoveredSpectrum,
    messageBandwidth,
    lsbFreqRange: [lsbLow, lsbHigh],
    usbFreqRange: [usbLow, usbHigh],
    loFreq,
    rmse,
    normalizedRmsePct,
    correlation,
    peakError,
    comparison: {
      amBandwidth: 2 * messageBandwidth,
      dsbBandwidth: 2 * messageBandwidth,
      ssbBandwidth: messageBandwidth,
      bandwidthSavingsPct: 50,
      amEfficiencyPct,
      dsbEfficiencyPct: 100,
      ssbEfficiencyPct: 100,
      amTotalPower,
      dsbTotalPower,
      ssbTotalPower,
      powerSavingsVsAmPct,
      powerSavingsVsDsbPct,
    },
  };
}

// Interpolate array value at arbitrary time t in [0, SSB_DURATION]
export function sampleAtTime(arr: number[], t: number): number {
  const clamped = Math.max(0, Math.min(SSB_DURATION, t));
  const exactIdx = (clamped / SSB_DURATION) * (arr.length - 1);
  const lo = Math.floor(exactIdx);
  const hi = Math.min(arr.length - 1, lo + 1);
  const frac = exactIdx - lo;
  return arr[lo] * (1 - frac) + arr[hi] * frac;
}
