/**
 * Correlation Engine for Module 05: Correlation & Spectral Analysis
 * Implements mathematically rigorous continuous-time (CTS) and discrete-time (DTS)
 * autocorrelation and cross-correlation for energy and power signals.
 */

import {
  GeneratedSignal,
  SignalCategory,
  generateCtsSignal,
  generateDtsSignal,
  UnifiedSignalConfig,
} from './signalGenerators';

export interface CorrelationResult {
  isAutocorrelation: boolean;
  isDiscrete: boolean;
  convention: SignalCategory; // 'energy' or 'power'
  units: string;
  formulaTex: string;
  lags: number[];             // lag axis values (tau in seconds or k in sample indices)
  rValues: number[];          // correlation values R(tau) or r[k]
  normalizedValues: number[]; // rho(tau) in [-1, +1]

  // Real-time evaluation at selected lag (interpolated between grid points if needed)
  currentLag: number;
  currentR: number;
  currentNormalized: number;

  // Key analytical metrics
  zeroLagValue: number;       // R(0) = Energy or Power
  peakValue: number;          // R_max = max |R|
  peakLag: number;            // tau at which peak occurs
  energyX: number;
  energyY: number;
  powerX: number;
  powerY: number;
}

/**
 * Linearly interpolates a uniformly spaced correlation sequence at arbitrary lag.
 */
function interpolateAtLag(
  lags: number[],
  values: number[],
  targetLag: number,
  isDiscrete: boolean
): number {
  const len = lags.length;
  if (len === 0) return 0;

  if (isDiscrete) {
    const k = Math.round(targetLag);
    const half = (len - 1) / 2;
    const idx = half + k;
    if (idx < 0 || idx >= len) return 0;
    return values[idx];
  }

  if (targetLag < lags[0] || targetLag > lags[len - 1]) {
    return 0;
  }

  const dt = len > 1 ? (lags[len - 1] - lags[0]) / (len - 1) : 1;
  if (dt <= 0) return values[0];

  const pos = (targetLag - lags[0]) / dt;
  const i0 = Math.max(0, Math.min(len - 1, Math.floor(pos)));
  const i1 = Math.max(0, Math.min(len - 1, i0 + 1));
  const frac = Math.max(0, Math.min(1, pos - i0));
  return values[i0] * (1 - frac) + values[i1] * frac;
}

/**
 * Computes autocorrelation or cross-correlation between two generated signals
 * following the exact lag convention:
 *   R_xx(tau) = corr(x(t), x(t - tau))
 *   R_xy(tau) = corr(x(t), y(t - tau))
 *   r_xy[k]   = sum x[n] y[n - k]
 *
 * Uses quadrature-weighted samples x_w[n] = sqrt(w[n]) * x[n] so that:
 *   1. R_xx(0) === E_x (energy) or P_x (time-average power) to machine precision.
 *   2. Autocorrelation R_xx is strictly positive semidefinite (PSD >= 0 everywhere).
 *   3. Real autocorrelation satisfies exact even symmetry R_xx(-tau) === R_xx(tau).
 */
export function computeCorrelation(
  signalX: GeneratedSignal,
  signalY: GeneratedSignal,
  isAutocorrelation: boolean,
  isDiscrete: boolean,
  currentLag: number
): CorrelationResult {
  const N = signalX.samples.length;
  const dt = signalX.dt;

  const isEnergy = isAutocorrelation
    ? signalX.category === 'energy'
    : signalX.category === 'energy' && signalY.category === 'energy';

  const convention: SignalCategory = isEnergy ? 'energy' : 'power';
  const units = isEnergy ? (isDiscrete ? 'V²' : 'V²·s') : 'V²';

  // Apply quadrature weights sqrt(w[n]) to match continuous trapezoidal integral for R(0) & PSD
  const xW = new Float64Array(N);
  const yW = new Float64Array(N);
  const rawX = signalX.samples;
  const rawY = isAutocorrelation ? signalX.samples : signalY.samples;
  const wX = signalX.weights;
  const wY = isAutocorrelation ? signalX.weights : signalY.weights;

  for (let i = 0; i < N; i++) {
    const swX = wX && wX[i] !== undefined ? Math.sqrt(wX[i]) : 1;
    const swY = wY && wY[i] !== undefined ? Math.sqrt(wY[i]) : 1;
    xW[i] = rawX[i] * swX;
    yW[i] = rawY[i] * swY;
  }

  const numLags = 2 * N - 1;
  const lags = new Array<number>(numLags);
  const rValues = new Array<number>(numLags);
  const normalizedValues = new Array<number>(numLags);

  const energyX = signalX.energy;
  const energyY = isAutocorrelation ? signalX.energy : signalY.energy;
  const powerX = signalX.power;
  const powerY = isAutocorrelation ? signalX.power : signalY.power;

  // Avoid hardcoded 1e-12 floor that breaks normalization for tiny signals (e.g. A = 1e-6 V)
  const normProd = isEnergy ? energyX * energyY : powerX * powerY;
  const normDenominator = normProd > 0 ? Math.sqrt(normProd) : 0;

  const powerDenom = isDiscrete ? N : Math.max(1, N - 1);

  const zeroLagIndex = N - 1;
  let maxAbsVal = -1;
  let peakLag = 0;
  let peakVal = 0;

  for (let idx = 0; idx < numLags; idx++) {
    const k = idx - (N - 1);
    const lagCoord = isDiscrete ? k : k * dt;
    lags[idx] = lagCoord;

    let sum = 0;
    if (k >= 0) {
      for (let n = k; n < N; n++) {
        sum += xW[n] * yW[n - k];
      }
    } else {
      for (let n = 0; n < N + k; n++) {
        sum += xW[n] * yW[n - k];
      }
    }

    const rVal = isEnergy ? (isDiscrete ? sum : sum * dt) : sum / powerDenom;
    rValues[idx] = rVal;
    normalizedValues[idx] = normDenominator > 0 ? rVal / normDenominator : 0;

    if (Math.abs(rVal) > maxAbsVal) {
      maxAbsVal = Math.abs(rVal);
      peakVal = rVal;
      peakLag = lagCoord;
    }
  }

  const zeroLagValue = rValues[zeroLagIndex];
  const currentR = interpolateAtLag(lags, rValues, currentLag, isDiscrete);
  const currentNormalized = interpolateAtLag(lags, normalizedValues, currentLag, isDiscrete);

  let formulaTex = '';
  if (isAutocorrelation) {
    if (isDiscrete) {
      formulaTex = isEnergy
        ? 'r_{xx}[k] = \\sum_{n=-\\infty}^{\\infty} x[n] x[n - k]'
        : '\\hat{R}_{xx}[k] = \\frac{1}{N} \\sum_{n=0}^{N-1} x[n] x[n - k]';
    } else {
      formulaTex = isEnergy
        ? 'R_{xx}(\\tau) = \\int_{-\\infty}^{\\infty} x(t) x(t - \\tau) \\, dt'
        : '\\hat{R}_{xx}(\\tau) = \\frac{1}{T} \\int_{-T/2}^{T/2} x(t) x(t - \\tau) \\, dt';
    }
  } else {
    if (isDiscrete) {
      formulaTex = isEnergy
        ? 'r_{xy}[k] = \\sum_{n=-\\infty}^{\\infty} x[n] y[n - k]'
        : '\\hat{R}_{xy}[k] = \\frac{1}{N} \\sum_{n=0}^{N-1} x[n] y[n - k]';
    } else {
      formulaTex = isEnergy
        ? 'R_{xy}(\\tau) = \\int_{-\\infty}^{\\infty} x(t) y(t - \\tau) \\, dt'
        : '\\hat{R}_{xy}(\\tau) = \\frac{1}{T} \\int_{-T/2}^{T/2} x(t) y(t - \\tau) \\, dt';
    }
  }

  return {
    isAutocorrelation,
    isDiscrete,
    convention,
    units,
    formulaTex,
    lags,
    rValues,
    normalizedValues,
    currentLag,
    currentR,
    currentNormalized,
    zeroLagValue,
    peakValue: peakVal,
    peakLag,
    energyX,
    energyY,
    powerX,
    powerY,
  };
}

export interface ValidationTestResult {
  testNumber: number;
  title: string;
  description: string;
  passed: boolean;
  tolerance: number;
  measuredError: number;
  details: string;
}

export function runCorrelationValidationTests(): ValidationTestResult[] {
  const results: ValidationTestResult[] = [];

  const baseConfig: UnifiedSignalConfig = {
    type: 'sine',
    sine: { amplitude: 2.0, frequency: 1.0, phase: 0 },
    pulse: { amplitude: 1.5, width: 1.0, position: 0.0 },
    whiteNoise: { stdDev: 1.0, seed: 42 },
    coloredNoise: { stdDev: 1.0, filterParam: 0.7, seed: 42 },
  };

  // Test 1: Even symmetry of autocorrelation: R_xx(tau) == R_xx(-tau)
  {
    const sig = generateCtsSignal({ ...baseConfig, type: 'colored_noise' }, -3, 3, 201);
    const corr = computeCorrelation(sig, sig, true, false, 0);
    const N = sig.samples.length;
    const zeroIdx = N - 1;
    let maxSymmetryErr = 0;
    for (let k = 1; k < N; k++) {
      const err = Math.abs(corr.rValues[zeroIdx + k] - corr.rValues[zeroIdx - k]);
      if (err > maxSymmetryErr) maxSymmetryErr = err;
    }
    const tol = 1e-12;
    results.push({
      testNumber: 1,
      title: 'Autocorrelation Even Symmetry',
      description: 'Verifies R_xx(τ) = R_xx(-τ) for all positive and negative lags.',
      passed: maxSymmetryErr <= tol,
      tolerance: tol,
      measuredError: maxSymmetryErr,
      details: `Max asymmetry across all lags: ${maxSymmetryErr.toExponential(4)} (Exact even symmetry holds).`,
    });
  }

  // Test 2: Zero-lag value matches Energy or Average Power
  {
    const pulseSig = generateCtsSignal({ ...baseConfig, type: 'pulse' }, -3, 3, 301);
    const pulseCorr = computeCorrelation(pulseSig, pulseSig, true, false, 0);
    const energyErr = Math.abs(pulseCorr.zeroLagValue - pulseSig.energy);

    const sineSig = generateCtsSignal({ ...baseConfig, type: 'sine' }, -3, 3, 301);
    const sineCorr = computeCorrelation(sineSig, sineSig, true, false, 0);
    const powerErr = Math.abs(sineCorr.zeroLagValue - sineSig.power);
    const theoryPowerErr = Math.abs(sineCorr.zeroLagValue - (baseConfig.sine.amplitude ** 2) / 2);

    const maxErr = Math.max(energyErr, powerErr, theoryPowerErr);
    const tol = 1e-12;
    results.push({
      testNumber: 2,
      title: 'Zero-Lag Energy / Power Consistency',
      description: 'Verifies R_xx(0) = E_x for energy signals and R̂_xx(0) = P_x = A²/2 for sinusoids.',
      passed: maxErr <= tol,
      tolerance: tol,
      measuredError: maxErr,
      details: `Pulse R(0)=${pulseCorr.zeroLagValue.toFixed(4)} (E_x=${pulseSig.energy.toFixed(4)}). Sine R̂(0)=${sineCorr.zeroLagValue.toFixed(4)} (A²/2=${((baseConfig.sine.amplitude ** 2) / 2).toFixed(4)}, err=${maxErr.toExponential(2)}).`,
    });
  }

  // Test 3: Sinusoidal autocorrelation periodic behavior with period T_0 = 1/f_0
  {
    const f0 = 2.0;
    const T0 = 1 / f0;
    const sineSig = generateCtsSignal(
      { ...baseConfig, type: 'sine', sine: { amplitude: 1.0, frequency: f0, phase: 0 } },
      -2,
      2,
      401
    );
    const corr = computeCorrelation(sineSig, sineSig, true, false, 0);
    const N = sineSig.samples.length;
    const zeroIdx = N - 1;
    const dt = sineSig.dt;

    const targetIdx = zeroIdx + Math.round(T0 / dt);
    const expectedPeakVal = sineSig.power;
    const localVal = corr.rValues[targetIdx];
    const foundLocalMax =
      corr.rValues[targetIdx] > corr.rValues[targetIdx - 1] &&
      corr.rValues[targetIdx] > corr.rValues[targetIdx + 1];
    const valErr = Math.abs(localVal - expectedPeakVal * (1 - T0 / sineSig.duration));
    const tol = 0.05;
    results.push({
      testNumber: 3,
      title: 'Sinusoid Autocorrelation Periodicity',
      description: 'Verifies periodic harmonic peaks at lag intervals equal to period T_0 = 1/f_0.',
      passed: foundLocalMax && valErr < tol,
      tolerance: tol,
      measuredError: valErr,
      details: `Fundamental f₀=${f0}Hz (T₀=${T0}s). Detected harmonic recurrence at τ=T₀ with local peak=${localVal.toFixed(4)}.`,
    });
  }

  // Test 4: Rectangular pulse energy autocorrelation is triangular
  {
    const W = 1.0;
    const A = 2.0;
    const pulseSig = generateCtsSignal(
      { ...baseConfig, type: 'pulse', pulse: { amplitude: A, width: W, position: 0 } },
      -3,
      3,
      301
    );
    const corr = computeCorrelation(pulseSig, pulseSig, true, false, 0);

    let maxTriangleErr = 0;
    for (let idx = 0; idx < corr.lags.length; idx++) {
      const tau = Math.abs(corr.lags[idx]);
      const theoretical = tau <= W ? A * A * (W - tau) : 0;
      const err = Math.abs(corr.rValues[idx] - theoretical);
      if (err > maxTriangleErr) maxTriangleErr = err;
    }
    const tol = 1e-10;
    results.push({
      testNumber: 4,
      title: 'Rectangular Pulse Triangular Autocorrelation',
      description: 'Verifies that rect pulse of width W produces an exact triangular autocorrelation of base 2W.',
      passed: maxTriangleErr <= tol,
      tolerance: tol,
      measuredError: maxTriangleErr,
      details: `Max deviation from theoretical triangle R(τ)=A²(W-|τ|): ${maxTriangleErr.toExponential(3)} (Base = 2W = 2.0s).`,
    });
  }

  // Test 5: Identical signals have cross-correlation peak at zero lag
  {
    const sig1 = generateCtsSignal({ ...baseConfig, type: 'colored_noise' }, -3, 3, 201);
    const sig2 = generateCtsSignal({ ...baseConfig, type: 'colored_noise' }, -3, 3, 201);
    const corr = computeCorrelation(sig1, sig2, false, false, 0);
    const peakLag = Math.abs(corr.peakLag);
    const tol = 1e-12;
    results.push({
      testNumber: 5,
      title: 'Identical Signals Zero-Lag Peak',
      description: 'Verifies cross-correlation between identical signals reaches its global maximum at τ = 0.',
      passed: peakLag <= tol,
      tolerance: tol,
      measuredError: peakLag,
      details: `Global peak occurred at τ = ${corr.peakLag.toFixed(4)}s (Normalized peak ρ = ${corr.currentNormalized.toFixed(4)}).`,
    });
  }

  // Test 6: Shifted signals show peak at relative delay respecting R_xy(tau) = corr(x(t), y(t - tau))
  {
    const targetDelay = 0.8;
    const pulseX = generateCtsSignal(
      { ...baseConfig, type: 'pulse', pulse: { amplitude: 1.0, width: 0.5, position: 0.0 } },
      -3,
      3,
      301
    );
    const pulseY = generateCtsSignal(
      { ...baseConfig, type: 'pulse', pulse: { amplitude: 1.0, width: 0.5, position: targetDelay } },
      -3,
      3,
      301
    );
    const crossCorr = computeCorrelation(pulseX, pulseY, false, false, -targetDelay);
    const expectedPeakLag = -targetDelay;
    const lagErr = Math.abs(crossCorr.peakLag - expectedPeakLag);
    const tol = 0.025;
    results.push({
      testNumber: 6,
      title: 'Shifted Signals Delay Peak Alignment',
      description: 'Verifies cross-correlation peak identifies relative physical delay according to stated convention R_xy(τ).',
      passed: lagErr <= tol,
      tolerance: tol,
      measuredError: lagErr,
      details: `Signal y delayed by +${targetDelay}s. Detected cross-correlation peak at τ = ${crossCorr.peakLag.toFixed(3)}s (Expected ${expectedPeakLag}s).`,
    });
  }

  return results;
}
