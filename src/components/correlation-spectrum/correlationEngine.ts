/**
 * Correlation Engine for Module 07: Correlation & Spectral Analysis
 * Implements mathematically rigorous continuous-time (CTS) and discrete-time (DTS)
 * autocorrelation and cross-correlation for energy and power signals.
 */

import { GeneratedSignal, SignalCategory, generateCtsSignal, generateDtsSignal, UnifiedSignalConfig } from './signalGenerators';

export interface CorrelationResult {
  isAutocorrelation: boolean;
  isDiscrete: boolean;
  convention: SignalCategory; // 'energy' or 'power'
  units: string;
  formulaTex: string;
  lags: number[];             // lag axis values (tau in seconds or k in sample indices)
  rValues: number[];          // correlation values R(tau) or r[k]
  normalizedValues: number[]; // rho(tau) in [-1, +1]
  
  // Real-time evaluation at selected lag
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
 * Computes autocorrelation or cross-correlation between two generated signals
 * following the exact lag convention:
 * R_xx(tau) = corr(x(t), x(t - tau))
 * R_xy(tau) = corr(x(t), y(t - tau))
 * r_xy[k]   = sum x[n] y[n - k]
 */
export function computeCorrelation(
  signalX: GeneratedSignal,
  signalY: GeneratedSignal,
  isAutocorrelation: boolean,
  isDiscrete: boolean,
  currentLag: number
): CorrelationResult {
  const x = signalX.samples;
  const y = isAutocorrelation ? signalX.samples : signalY.samples;
  const N = x.length;
  const dt = signalX.dt;

  // Determine signal classification:
  // - If both are energy signals (pulse vs pulse) -> Energy correlation
  // - If either or both are power signals (sine, noise) -> Power correlation (biased time-average)
  const isEnergy = isAutocorrelation
    ? signalX.category === 'energy'
    : signalX.category === 'energy' && signalY.category === 'energy';

  const convention: SignalCategory = isEnergy ? 'energy' : 'power';
  const units = isEnergy
    ? isDiscrete ? 'V²' : 'V²·s'
    : 'V²';

  // Lag range: [-K, +K] where K = N - 1
  // For CTS, tau = k * dt
  const numLags = 2 * N - 1;
  const lags = new Array(numLags);
  const rValues = new Array(numLags);
  const normalizedValues = new Array(numLags);

  // Compute energy and power references for normalization
  const energyX = signalX.energy;
  const energyY = isAutocorrelation ? signalX.energy : signalY.energy;
  const powerX = signalX.power;
  const powerY = isAutocorrelation ? signalX.power : signalY.power;

  const normDenominator = isEnergy
    ? Math.sqrt(Math.max(1e-12, energyX * energyY))
    : Math.sqrt(Math.max(1e-12, powerX * powerY));

  // Compute correlation across all integer shifts k in [-(N-1), +(N-1)]
  let zeroLagIndex = N - 1;
  let maxAbsVal = -1;
  let peakLag = 0;
  let peakVal = 0;

  for (let idx = 0; idx < numLags; idx++) {
    const k = idx - (N - 1); // k ranges from -(N-1) to +(N-1)
    const lagCoord = isDiscrete ? k : Number((k * dt).toFixed(4));
    lags[idx] = lagCoord;

    // Convolution-like sliding inner product: sum x[n] * y[n - k]
    // with zero-padding outside [0, N-1]
    let sum = 0;
    if (k >= 0) {
      for (let n = k; n < N; n++) {
        sum += x[n] * y[n - k];
      }
    } else {
      // k < 0, n - k > n. Bounds: n - k < N => n < N + k
      for (let n = 0; n < N + k; n++) {
        sum += x[n] * y[n - k];
      }
    }

    // Apply convention scaling
    let rVal: number;
    if (isEnergy) {
      // Energy signal:
      // DTS: sum x[n] y[n-k]
      // CTS: dt * sum x(t_n) y(t_n - tau)
      rVal = isDiscrete ? sum : sum * dt;
    } else {
      // Power signal:
      // Biased time-average estimate with fixed denominator N:
      // DTS: (1/N) * sum x[n] y[n-k]
      // CTS: (1/T) * int x(t) y(t - tau) dt = (dt / (N*dt)) * sum = (1/N) * sum
      rVal = sum / N;
    }

    rValues[idx] = rVal;
    normalizedValues[idx] = normDenominator > 0 ? rVal / normDenominator : 0;

    // Track peak
    if (Math.abs(rVal) > maxAbsVal) {
      maxAbsVal = Math.abs(rVal);
      peakVal = rVal;
      peakLag = lagCoord;
    }
  }

  const zeroLagValue = rValues[zeroLagIndex];

  // Evaluate correlation at currently selected lag (interpolate or nearest point)
  // Find closest lag index
  let closestIdx = zeroLagIndex;
  let minDiff = Infinity;
  for (let idx = 0; idx < numLags; idx++) {
    const diff = Math.abs(lags[idx] - currentLag);
    if (diff < minDiff) {
      minDiff = diff;
      closestIdx = idx;
    }
  }
  const currentR = rValues[closestIdx];
  const currentNormalized = normalizedValues[closestIdx];

  // Formula representation
  let formulaTex = '';
  if (isAutocorrelation) {
    if (isDiscrete) {
      formulaTex = isEnergy
        ? 'r_{xx}[k] = \\sum_{n=-\\infty}^{\\infty} x[n] x[n - k]'
        : '\\hat{R}_{xx}[k] = \\frac{1}{N} \\sum_{n=0}^{N-1} x[n] x[n - k]';
    } else {
      formulaTex = isEnergy
        ? 'R_{xx}(\\tau) = \\int_{-\\infty}^{\\infty} x(t) x(t - \\tau) \\, dt'
        : '\\hat{R}_{xx}(\\tau) = \\frac{1}{T} \\int_{0}^{T} x(t) x(t - \\tau) \\, dt';
    }
  } else {
    if (isDiscrete) {
      formulaTex = isEnergy
        ? 'r_{xy}[k] = \\sum_{n=-\\infty}^{\\infty} x[n] y[n - k]'
        : '\\hat{R}_{xy}[k] = \\frac{1}{N} \\sum_{n=0}^{N-1} x[n] y[n - k]';
    } else {
      formulaTex = isEnergy
        ? 'R_{xy}(\\tau) = \\int_{-\\infty}^{\\infty} x(t) y(t - \\tau) \\, dt'
        : '\\hat{R}_{xy}(\\tau) = \\frac{1}{T} \\int_{0}^{T} x(t) y(t - \\tau) \\, dt';
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

/**
 * MATHEMATICAL VALIDATION TEST SUITE
 * Rigorously executes the 6 properties required by Stage 2:
 * 1. Real-valued autocorrelation must be even in lag: R_xx(tau) = R_xx(-tau).
 * 2. Zero-lag autocorrelation equals energy (E_x) or average power (P_x).
 * 3. Sinusoidal autocorrelation shows periodic behavior with period T_0 = 1/f_0.
 * 4. Rectangular pulse energy autocorrelation has a triangular shape.
 * 5. Identical signals have cross-correlation peak at zero lag.
 * 6. Shifted signals show a peak at their relative delay respecting the lag convention.
 */
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
      const posVal = corr.rValues[zeroIdx + k];
      const negVal = corr.rValues[zeroIdx - k];
      const err = Math.abs(posVal - negVal);
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
    // Part A: Energy signal (pulse)
    const pulseSig = generateCtsSignal({ ...baseConfig, type: 'pulse' }, -3, 3, 301);
    const pulseCorr = computeCorrelation(pulseSig, pulseSig, true, false, 0);
    const energyErr = Math.abs(pulseCorr.zeroLagValue - pulseSig.energy);

    // Part B: Power signal (sine)
    const sineSig = generateCtsSignal({ ...baseConfig, type: 'sine' }, -3, 3, 301);
    const sineCorr = computeCorrelation(sineSig, sineSig, true, false, 0);
    const powerErr = Math.abs(sineCorr.zeroLagValue - sineSig.power);

    const maxErr = Math.max(energyErr, powerErr);
    const tol = 1e-12;
    results.push({
      testNumber: 2,
      title: 'Zero-Lag Energy / Power Consistency',
      description: 'Verifies R_xx(0) = E_x for energy signals and R̂_xx(0) = P_x for power signals.',
      passed: maxErr <= tol,
      tolerance: tol,
      measuredError: maxErr,
      details: `Pulse R(0)=${pulseCorr.zeroLagValue.toFixed(4)}, E_x=${pulseSig.energy.toFixed(4)} (err=${energyErr.toExponential(2)}). Sine R̂(0)=${sineCorr.zeroLagValue.toFixed(4)}, P_x=${sineSig.power.toFixed(4)} (err=${powerErr.toExponential(2)}).`,
    });
  }

  // Test 3: Sinusoidal autocorrelation periodic behavior with period T_0 = 1/f_0
  {
    const f0 = 2.0; // T_0 = 0.5 s
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

    // Check peak at tau = T_0 (0.5s)
    const targetIdx = zeroIdx + Math.round(T0 / dt);
    const expectedPeakVal = sineSig.power; // A^2/2 for continuous sine, biased by finite record (1 - T0/T)
    // The autocorrelation of cos(omega*t) on finite window has positive local maxima at integer multiples of T_0
    const localVal = corr.rValues[targetIdx];
    // Find local maximum near targetIdx
    let foundLocalMax = false;
    if (corr.rValues[targetIdx] > corr.rValues[targetIdx - 1] && corr.rValues[targetIdx] > corr.rValues[targetIdx + 1]) {
      foundLocalMax = true;
    } else if (corr.rValues[targetIdx + 1] > corr.rValues[targetIdx] && corr.rValues[targetIdx + 1] > corr.rValues[targetIdx + 2]) {
      foundLocalMax = true;
    } else if (corr.rValues[targetIdx - 1] > corr.rValues[targetIdx] && corr.rValues[targetIdx - 1] > corr.rValues[targetIdx - 2]) {
      foundLocalMax = true;
    }
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
    const N = pulseSig.samples.length;
    const zeroIdx = N - 1;
    const dt = pulseSig.dt;

    // Theoretical triangle: R(tau) = A^2 * (W - |tau|) for |tau| <= W, and 0 for |tau| > W
    let maxTriangleErr = 0;
    for (let idx = 0; idx < corr.lags.length; idx++) {
      const tau = Math.abs(corr.lags[idx]);
      const theoretical = tau <= W ? A * A * (W - tau) : 0;
      const actual = corr.rValues[idx];
      const err = Math.abs(actual - theoretical);
      if (err > maxTriangleErr) maxTriangleErr = err;
    }
    const tol = 0.08; // Small numerical integration discretization error at sharp pulse edges
    results.push({
      testNumber: 4,
      title: 'Rectangular Pulse Triangular Autocorrelation',
      description: 'Verifies that rect pulse of width W produces an exact triangular autocorrelation of base 2W.',
      passed: maxTriangleErr <= tol,
      tolerance: tol,
      measuredError: maxTriangleErr,
      details: `Max deviation from theoretical triangle R(τ)=A²(W-|τ|): ${maxTriangleErr.toFixed(4)} (Base = 2W = 2.0s).`,
    });
  }

  // Test 5: Identical signals have cross-correlation peak at zero lag
  {
    const sig1 = generateCtsSignal({ ...baseConfig, type: 'colored_noise' }, -3, 3, 201);
    const sig2 = generateCtsSignal({ ...baseConfig, type: 'colored_noise' }, -3, 3, 201);
    const corr = computeCorrelation(sig1, sig2, false, false, 0);
    const peakLag = Math.abs(corr.peakLag);
    const tol = 1e-4;
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
    // Let x(t) be a pulse at t = 0
    // Let y(t) be a pulse at t = +0.8s (y is delayed by t_d = 0.8s)
    // Under R_xy(tau) = int x(t) y(t - tau) dt:
    // x(t) peaks at t = 0, y(t - tau) peaks when t - tau = 0.8 => t = 0.8 + tau
    // Alignment occurs when 0.8 + tau = 0 => tau = -0.8s
    // Or if y(t) = pulse at -0.8s, alignment occurs at tau = +0.8s!
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
    const tol = 0.05;
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
