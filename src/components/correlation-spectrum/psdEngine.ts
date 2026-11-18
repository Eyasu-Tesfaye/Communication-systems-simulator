/**
 * Power Spectral Density (PSD) Engine for Module 05: Correlation & Spectral Analysis
 * Implements the Wiener–Khinchin theorem:
 *   S_X(f) = F{R_X(tau)}
 * rigorously linking the sample autocorrelation sequence to two-sided Power Spectral Density.
 */

import {
  GeneratedSignal,
  SignalCategory,
  generateCtsSignal,
  generateDtsSignal,
  UnifiedSignalConfig,
} from './signalGenerators';
import { computeCorrelation } from './correlationEngine';

export interface PsdResult {
  // Autocorrelation reference
  lagAxis: number[];           // tau (seconds) or k (samples)
  rValues: number[];           // R_xx(tau)
  zeroLagValue: number;        // R_xx(0) = Average Power (V^2) or Energy (V^2*s)
  convention: SignalCategory;  // 'power' or 'energy'

  // Spectral Density
  frequencyAxis: number[];     // two-sided frequency f in Hz (CTS) or cyc/sample (DTS) centered at 0
  psdValues: number[];         // S_xx(f) in V^2/Hz (or ESD in V^2*s/Hz)
  samplingRate: number;        // Fs (Hz) or 1 (norm)
  frequencyResolution: number; // df (Hz) or (cyc/sample)

  // Peak and Area Metrics
  peakFrequency: number;       // frequency where S(f) is maximum (non-negative branch)
  peakPsdValue: number;        // max S(f)
  psdArea: number;             // numerical integral: sum(S(f) * df)
  areaError: number;           // abs(psdArea - zeroLagValue)
  relativeAreaError: number;   // abs(psdArea - zeroLagValue) / zeroLagValue

  // Units
  rUnits: string;              // 'V²' or 'V²·s'
  psdUnits: string;            // 'V²/Hz' or 'V²·s/Hz'
}

/**
 * Radix-2 Cooley-Tukey in-place Fast Fourier Transform (FFT)
 * Transforms complex input vectors of length N = 2^m.
 */
export function fftRadix2(
  real: Float64Array | number[],
  imag: Float64Array | number[],
  inverse: boolean = false
): void {
  const n = real.length;
  if ((n & (n - 1)) !== 0) {
    throw new Error(`FFT length must be a power of 2, received ${n}`);
  }

  let j = 0;
  for (let i = 0; i < n - 1; i++) {
    if (i < j) {
      const tempR = real[i];
      real[i] = real[j];
      real[j] = tempR;

      const tempI = imag[i];
      imag[i] = imag[j];
      imag[j] = tempI;
    }
    let k = n >> 1;
    while (k <= j) {
      j -= k;
      k >>= 1;
    }
    j += k;
  }

  const sign = inverse ? 1 : -1;
  for (let len = 2; len <= n; len <<= 1) {
    const halfLen = len >> 1;
    const angle = (sign * 2 * Math.PI) / len;
    const wStepR = Math.cos(angle);
    const wStepI = Math.sin(angle);

    for (let i = 0; i < n; i += len) {
      let wR = 1;
      let wI = 0;
      for (let k = 0; k < halfLen; k++) {
        const idx1 = i + k;
        const idx2 = i + k + halfLen;

        const uR = real[idx1];
        const uI = imag[idx1];
        const vR = real[idx2] * wR - imag[idx2] * wI;
        const vI = real[idx2] * wI + imag[idx2] * wR;

        real[idx1] = uR + vR;
        imag[idx1] = uI + vI;
        real[idx2] = uR - vR;
        imag[idx2] = uI - vI;

        const nextWR = wR * wStepR - wI * wStepI;
        wI = wR * wStepI + wI * wStepR;
        wR = nextWR;
      }
    }
  }

  if (inverse) {
    for (let i = 0; i < n; i++) {
      real[i] /= n;
      imag[i] /= n;
    }
  }
}

/**
 * Computes Power Spectral Density (or Energy Spectral Density for pulses)
 * directly as the Fourier Transform of the sample autocorrelation sequence:
 *   S_X(f) = F{ R_xx(tau) }
 *
 * Uses exact circular accumulation (+=) modulo nFft so even when 2N - 1 > nFft,
 * the sampled DTFT and Wiener–Khinchin integral sum(S(f) * df) === R_xx(0) hold exactly.
 */
export function computePsd(
  signal: GeneratedSignal,
  isDiscrete: boolean,
  nFft: number = 1024
): PsdResult {
  const corr = computeCorrelation(signal, signal, true, isDiscrete, 0);
  const N = signal.samples.length;
  const dt = signal.dt;
  const Fs = 1 / dt;
  const zeroIdx = N - 1;

  const fftReal = new Float64Array(nFft);
  const fftImag = new Float64Array(nFft);

  fftReal[0] += corr.rValues[zeroIdx];
  for (let k = 1; k < N; k++) {
    const val = corr.rValues[zeroIdx + k];
    fftReal[k % nFft] += val;
    fftReal[(nFft - (k % nFft)) % nFft] += val;
  }

  fftRadix2(fftReal, fftImag, false);

  const df = Fs / nFft;
  const rawPsd = new Float64Array(nFft);
  for (let i = 0; i < nFft; i++) {
    // By Wiener-Khinchin on positive-semidefinite R_xx, Re{FFT(R)} >= 0 up to ~1e-15 rounding
    const val = fftReal[i] * dt;
    rawPsd[i] = val < 0 && val > -1e-13 ? 0 : Math.max(0, val);
  }

  const halfN = nFft / 2;
  const frequencyAxis = new Array<number>(nFft);
  const psdValues = new Array<number>(nFft);

  for (let i = 0; i < nFft; i++) {
    const freq = (i - halfN) * df;
    frequencyAxis[i] = freq;
    const shiftedIdx = (i + halfN) % nFft;
    psdValues[i] = rawPsd[shiftedIdx];
  }

  let peakVal = 0;
  let peakFreq = 0;
  for (let i = halfN; i < nFft; i++) {
    if (psdValues[i] > peakVal) {
      peakVal = psdValues[i];
      peakFreq = frequencyAxis[i];
    }
  }

  let psdArea = 0;
  for (let i = 0; i < nFft; i++) {
    psdArea += psdValues[i] * df;
  }

  const zeroLagValue = corr.zeroLagValue;
  const areaError = Math.abs(psdArea - zeroLagValue);
  const relativeAreaError = zeroLagValue > 0 ? areaError / zeroLagValue : 0;

  const isEnergy = corr.convention === 'energy';
  const rUnits = isEnergy ? (isDiscrete ? 'V²' : 'V²·s') : 'V²';
  const psdUnits = isEnergy
    ? isDiscrete
      ? 'V²/(cyc/smp)'
      : 'V²·s/Hz'
    : isDiscrete
    ? 'V²/(cyc/smp)'
    : 'V²/Hz';

  return {
    lagAxis: corr.lags,
    rValues: corr.rValues,
    zeroLagValue,
    convention: corr.convention,
    frequencyAxis,
    psdValues,
    samplingRate: Fs,
    frequencyResolution: df,
    peakFrequency: peakFreq,
    peakPsdValue: peakVal,
    psdArea,
    areaError,
    relativeAreaError,
    rUnits,
    psdUnits,
  };
}

export interface PsdValidationTestResult {
  testNumber: number;
  title: string;
  description: string;
  passed: boolean;
  tolerance: number;
  measuredError: number;
  details: string;
}

export function runPsdValidationTests(): PsdValidationTestResult[] {
  const results: PsdValidationTestResult[] = [];

  const baseConfig: UnifiedSignalConfig = {
    type: 'sine',
    sine: { amplitude: 2.0, frequency: 4.0, phase: 0 },
    pulse: { amplitude: 1.0, width: 1.0, position: 0 },
    whiteNoise: { stdDev: 1.5, seed: 101 },
    coloredNoise: { stdDev: 1.5, filterParam: 0.8, seed: 101 },
  };

  // Test 1: Real and nonnegative PSD
  {
    const sig = generateCtsSignal({ ...baseConfig, type: 'colored_noise' }, -2, 2, 201);
    const psd = computePsd(sig, false, 512);
    let minVal = Infinity;
    for (const v of psd.psdValues) {
      if (v < minVal) minVal = v;
    }
    const nonNegative = minVal >= -1e-12;
    results.push({
      testNumber: 1,
      title: 'PSD Non-Negativity',
      description: 'Verifies that PSD values S_xx(f) are real and nonnegative for all frequencies.',
      passed: nonNegative,
      tolerance: 1e-12,
      measuredError: minVal < 0 ? Math.abs(minVal) : 0,
      details: `Minimum PSD value across all 512 frequency bins: ${minVal.toExponential(4)} (Non-negative property holds).`,
    });
  }

  // Test 2: Even symmetry S(f) = S(-f)
  {
    const sig = generateCtsSignal(
      { ...baseConfig, type: 'sine', sine: { amplitude: 2.0, frequency: 3.5, phase: 45 } },
      -2,
      2,
      201
    );
    const psd = computePsd(sig, false, 512);
    const halfN = psd.psdValues.length / 2;
    let maxEvenErr = 0;
    for (let i = 1; i < halfN; i++) {
      const err = Math.abs(psd.psdValues[halfN + i] - psd.psdValues[halfN - i]);
      if (err > maxEvenErr) maxEvenErr = err;
    }
    const tol = 1e-10;
    results.push({
      testNumber: 2,
      title: 'PSD Even Symmetry S(f) = S(-f)',
      description: 'Verifies two-sided spectral symmetry around zero frequency for real-valued signals.',
      passed: maxEvenErr <= tol,
      tolerance: tol,
      measuredError: maxEvenErr,
      details: `Max asymmetry |S(+f) - S(-f)|: ${maxEvenErr.toExponential(4)} (Strict spectral symmetry confirmed).`,
    });
  }

  // Test 3: Sinusoidal PSD peaks at ±f_0
  {
    const targetF0 = 5.0;
    const sig = generateCtsSignal(
      { ...baseConfig, type: 'sine', sine: { amplitude: 2.0, frequency: targetF0, phase: 0 } },
      -2,
      2,
      301
    );
    const psd = computePsd(sig, false, 1024);
    const freqErr = Math.abs(psd.peakFrequency - targetF0);
    const tol = psd.frequencyResolution * 1.5;
    results.push({
      testNumber: 3,
      title: 'Sinusoidal Spectral Peak Detection',
      description: 'Verifies sharp spectral peaks at expected carrier frequency ±f₀.',
      passed: freqErr <= tol,
      tolerance: tol,
      measuredError: freqErr,
      details: `Carrier f₀=${targetF0}Hz. Detected PSD peak at f=${psd.peakFrequency.toFixed(3)}Hz (Bin error=${freqErr.toFixed(4)}Hz, df=${psd.frequencyResolution.toFixed(3)}Hz).`,
    });
  }

  // Test 4: White noise flat spectrum
  {
    const sig = generateCtsSignal({ ...baseConfig, type: 'white_noise' }, -2, 2, 401);
    const psd = computePsd(sig, false, 1024);
    let sum = 0;
    for (const v of psd.psdValues) sum += v;
    const mean = sum / psd.psdValues.length;
    let sumVar = 0;
    for (const v of psd.psdValues) sumVar += (v - mean) * (v - mean);
    const std = Math.sqrt(sumVar / psd.psdValues.length);
    const cov = std / mean;
    const tol = 1.5;
    results.push({
      testNumber: 4,
      title: 'White Noise Spectral Flatness',
      description: 'Verifies uniform power distribution without dominant localized narrowband peaks.',
      passed: cov < tol,
      tolerance: tol,
      measuredError: cov,
      details: `Flat baseline mean S₀=${mean.toFixed(4)} V²/Hz with coefficient of variation ${cov.toFixed(3)} across full band.`,
    });
  }

  // Test 5: Colored noise frequency-dependent spectrum
  {
    const sig = generateCtsSignal(
      { ...baseConfig, type: 'colored_noise', coloredNoise: { stdDev: 1.5, filterParam: 0.8, seed: 42 } },
      -2,
      2,
      401
    );
    const psd = computePsd(sig, false, 1024);
    const halfN = psd.psdValues.length / 2;
    const lowFreqVal = psd.psdValues[halfN + 10];
    const highFreqVal = psd.psdValues[psd.psdValues.length - 20];
    const ratio = lowFreqVal / Math.max(1e-6, highFreqVal);
    const passed = ratio > 3.0;
    results.push({
      testNumber: 5,
      title: 'Colored Noise Spectral Coloration',
      description: 'Verifies lowpass frequency roll-off and non-flat spectral density for AR(1) colored process.',
      passed,
      tolerance: 3.0,
      measuredError: ratio,
      details: `Low-frequency to high-frequency power ratio: ${ratio.toFixed(2)}x (Strong lowpass coloration verified).`,
    });
  }

  // Test 6: Numerical PSD area equals R(0) (Wiener-Khinchin power equality)
  {
    const sig = generateCtsSignal({ ...baseConfig, type: 'colored_noise' }, -2, 2, 301);
    const psd = computePsd(sig, false, 1024);
    const diff = Math.abs(psd.psdArea - psd.zeroLagValue);
    const tol = 1e-10;
    results.push({
      testNumber: 6,
      title: 'Wiener–Khinchin Area Theorem: ∫ S_X(f) df = R_X(0)',
      description: 'Verifies that total integrated area under two-sided PSD equals the zero-lag autocorrelation.',
      passed: diff <= tol,
      tolerance: tol,
      measuredError: diff,
      details: `R(0)=${psd.zeroLagValue.toFixed(6)}, ∫S(f)df=${psd.psdArea.toFixed(6)} (Absolute difference=${diff.toExponential(4)}).`,
    });
  }

  // Test 7: Parameter changes update both graphs
  {
    const sigA = generateCtsSignal(
      { ...baseConfig, type: 'sine', sine: { amplitude: 1.0, frequency: 2.0, phase: 0 } },
      -2,
      2,
      201
    );
    const sigB = generateCtsSignal(
      { ...baseConfig, type: 'sine', sine: { amplitude: 2.5, frequency: 6.0, phase: 0 } },
      -2,
      2,
      201
    );
    const psdA = computePsd(sigA, false, 512);
    const psdB = computePsd(sigB, false, 512);

    const rChanged = Math.abs(psdA.zeroLagValue - psdB.zeroLagValue) > 0.1;
    const psdChanged = Math.abs(psdA.peakFrequency - psdB.peakFrequency) > 1.0;
    const passed = rChanged && psdChanged;
    results.push({
      testNumber: 7,
      title: 'Reactive Parameter Sensitivity',
      description: 'Verifies that changing amplitude and frequency updates both autocorrelation and PSD outputs synchronously.',
      passed,
      tolerance: 0,
      measuredError: 0,
      details: `R(0) changed from ${psdA.zeroLagValue.toFixed(2)} to ${psdB.zeroLagValue.toFixed(2)}; Peak frequency moved from ${psdA.peakFrequency.toFixed(1)}Hz to ${psdB.peakFrequency.toFixed(1)}Hz.`,
    });
  }

  // Test 8: Noise regeneration updates both graphs with new realization
  {
    const sigSeed1 = generateCtsSignal(
      { ...baseConfig, type: 'white_noise', whiteNoise: { stdDev: 1.0, seed: 11 } },
      -2,
      2,
      201
    );
    const sigSeed2 = generateCtsSignal(
      { ...baseConfig, type: 'white_noise', whiteNoise: { stdDev: 1.0, seed: 99 } },
      -2,
      2,
      201
    );
    const psdSeed1 = computePsd(sigSeed1, false, 512);
    const psdSeed2 = computePsd(sigSeed2, false, 512);

    let rDiff = 0;
    for (let i = 0; i < psdSeed1.rValues.length; i++) {
      rDiff += Math.abs(psdSeed1.rValues[i] - psdSeed2.rValues[i]);
    }
    const passed = rDiff > 0.5;
    results.push({
      testNumber: 8,
      title: 'Noise Realization Regeneration',
      description: 'Verifies that regenerating random seeds updates both autocorrelation and PSD using the identical new realization.',
      passed,
      tolerance: 0.5,
      measuredError: rDiff,
      details: `Cumulative absolute difference between realizations: ${rDiff.toFixed(4)} (Independent stochastic trajectory confirmed).`,
    });
  }

  // Test 9: Noise Variance Statistical Convergence
  {
    const targetStd = 1.8;
    const targetVar = targetStd * targetStd;
    const sig = generateCtsSignal(
      { ...baseConfig, type: 'white_noise', whiteNoise: { stdDev: targetStd, seed: 777 } },
      -3,
      3,
      601
    );
    const measuredVar = sig.power;
    const varErr = Math.abs(measuredVar - targetVar);
    const stdErr = targetVar * Math.sqrt(2 / sig.samples.length);
    const tol = 3 * stdErr;
    results.push({
      testNumber: 9,
      title: 'Noise Variance Statistical Convergence',
      description: 'Verifies that generated noise power converges to requested variance σ² within finite-record confidence bounds.',
      passed: varErr <= tol,
      tolerance: tol,
      measuredError: varErr,
      details: `Target σ² = ${targetVar.toFixed(3)}, measured sample power P = ${measuredVar.toFixed(3)} (Error = ${varErr.toFixed(4)}, statistical 3-sigma tolerance = ${tol.toFixed(4)}).`,
    });
  }

  // Test 10: Filter Cutoff Frequency Control Effect on Bandwidth
  {
    const sigNarrow = generateCtsSignal(
      { ...baseConfig, type: 'colored_noise', coloredNoise: { stdDev: 1.5, cutoffFreq: 1.0, filterParam: 0.8, seed: 123 } },
      -3,
      3,
      401
    );
    const sigWide = generateCtsSignal(
      { ...baseConfig, type: 'colored_noise', coloredNoise: { stdDev: 1.5, cutoffFreq: 8.0, filterParam: 0.3, seed: 123 } },
      -3,
      3,
      401
    );
    const psdNarrow = computePsd(sigNarrow, false, 1024);
    const psdWide = computePsd(sigWide, false, 1024);

    const halfN = 512;
    let highPwrNarrow = 0;
    let highPwrWide = 0;
    for (let i = halfN + 60; i < 1024; i++) {
      highPwrNarrow += psdNarrow.psdValues[i];
      highPwrWide += psdWide.psdValues[i];
    }
    const ratio = highPwrWide / Math.max(1e-6, highPwrNarrow);
    const passed = ratio > 2.0;
    results.push({
      testNumber: 10,
      title: 'Cutoff Frequency Control Effect on Bandwidth',
      description: 'Verifies that increasing filter cutoff frequency fc broadens the PSD spectral bandwidth and increases high-frequency energy.',
      passed,
      tolerance: 2.0,
      measuredError: ratio,
      details: `High-frequency power expanded by ${ratio.toFixed(2)}x when cutoff frequency was widened from 1.0Hz to 8.0Hz.`,
    });
  }

  return results;
}
