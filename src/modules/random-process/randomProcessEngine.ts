/**
 * Module 03: Random Processes Engine
 * Rigorous stochastic simulation, ensemble & time-average calculations,
 * running time-average convergence, mean & variance over time,
 * honest finite-sample SSS/WSS diagnostics, ergodicity, and autocorrelation analysis.
 */

export type ProcessType =
  | 'white_noise'
  | 'gaussian_bandlimited'
  | 'random_phase_sinusoid'
  | 'non_stationary';

export interface ProcessMeta {
  id: ProcessType;
  name: string;
  shortName: string;
  isStationary: boolean;
  isWss: boolean;
  isSss: boolean;
  isErgodic: boolean;
  usesAmplitude: boolean;
  usesFrequency: boolean;
  usesDriftRate: boolean;
  theoreticalMean: string;
  theoreticalVar: string;
  theoreticalRxx: string;
  description: string;
  assumptions: string[];
}

export const PROCESS_CATALOG: Record<ProcessType, ProcessMeta> = {
  white_noise: {
    id: 'white_noise',
    name: 'White Gaussian Noise (AWGN)',
    shortName: 'AWGN White Noise',
    isStationary: true,
    isWss: true,
    isSss: true,
    isErgodic: true,
    usesAmplitude: false,
    usesFrequency: false,
    usesDriftRate: false,
    theoreticalMean: '\\mathbb{E}[X(t)] = 0',
    theoreticalVar: '\\operatorname{Var}(X(t)) = \\sigma^2',
    theoreticalRxx: 'R_{XX}(\\tau) = \\sigma^2 \\delta_{\\tau,0}',
    description:
      'Independent, identically distributed (i.i.d.) zero-mean Gaussian samples at every time instant. Strictly stationary, wide-sense stationary, and ergodic with zero temporal memory.',
    assumptions: [
      'Samples X(t_k) are mutually independent Gaussian random variables: X(t_k) ~ N(0, σ²)',
      'Zero ensemble mean at every instant: E[X(t)] = 0',
      'Constant finite variance across time: Var(X(t)) = σ²',
      'Zero correlation for non-zero lag: E[X(t)X(t+τ)] = 0 for τ ≠ 0',
    ],
  },
  gaussian_bandlimited: {
    id: 'gaussian_bandlimited',
    name: 'Bandlimited Gaussian Random Process',
    shortName: 'Bandlimited Gaussian',
    isStationary: true,
    isWss: true,
    isSss: true,
    isErgodic: true,
    usesAmplitude: true,
    usesFrequency: true,
    usesDriftRate: false,
    theoreticalMean: '\\mathbb{E}[X(t)] = 0',
    theoreticalVar: '\\operatorname{Var}(X(t)) = \\frac{A^2}{2} + \\sigma^2',
    theoreticalRxx: 'R_{XX}(\\tau) = \\frac{A^2}{2} \\operatorname{sinc}(2 f_0 \\tau) + \\sigma^2 \\delta_{\\tau,0}',
    description:
      'Lowpass Gaussian process of bandwidth B = f₀ synthesized via Rice quadrature harmonics plus additive noise σ. Strictly stationary, WSS, and ergodic with sinc-shaped memory.',
    assumptions: [
      'Rice quadrature superposition over K = 32 uniform sub-bands in [0, f₀]',
      'Quadrature coefficients a_h, b_h ~ N(0, A²/(2K)) guarantee exact Gaussian marginals',
      'Additive measurement noise n(t) ~ N(0, σ²) independent of the bandlimited signal',
      'Time-invariant statistical law: finite coherence time τ_c ≈ 1/(2f₀)',
    ],
  },
  random_phase_sinusoid: {
    id: 'random_phase_sinusoid',
    name: 'Random-Phase Sinusoidal Process',
    shortName: 'Random-Phase Sinusoid',
    isStationary: true,
    isWss: true,
    isSss: true,
    isErgodic: true,
    usesAmplitude: true,
    usesFrequency: true,
    usesDriftRate: false,
    theoreticalMean: '\\mathbb{E}[X(t)] = \\int_{-\\pi}^{\\pi} \\frac{A}{2\\pi}\\cos(2\\pi f_0 t + \\theta)\\,d\\theta = 0',
    theoreticalVar: '\\operatorname{Var}(X(t)) = \\frac{A^2}{2} + \\sigma^2',
    theoreticalRxx: 'R_{XX}(\\tau) = \\frac{A^2}{2} \\cos(2\\pi f_0 \\tau) + \\sigma^2 \\delta_{\\tau,0}',
    description:
      'Harmonic wave A cos(2π f₀ t + Θ) with uniformly distributed random phase Θ ~ U(-π, π) and additive noise σ. Shift-invariant across realizations, satisfying SSS, WSS, and ergodicity.',
    assumptions: [
      'Initial phase Θ ~ Uniform(-π, π) drawn independently for each realization',
      'Carrier amplitude A and frequency f₀ are deterministic constants across the ensemble',
      'Additive thermal noise n(t) ~ N(0, σ²) is zero-mean and independent of Θ',
      'Modulo-2π phase invariance makes all joint distributions shift-invariant (SSS & WSS)',
    ],
  },
  non_stationary: {
    id: 'non_stationary',
    name: 'Non-Stationary Process (Mean Drift & Expanding Variance)',
    shortName: 'Non-Stationary Process',
    isStationary: false,
    isWss: false,
    isSss: false,
    isErgodic: false,
    usesAmplitude: true,
    usesFrequency: true,
    usesDriftRate: true,
    theoreticalMean: '\\mathbb{E}[X(t)] = d\\left[1.2\\sin(0.6\\pi f_0 t) + 0.18(t - T/2)\\right]',
    theoreticalVar: '\\operatorname{Var}(X(t)) = \\left(0.35 + 1.25\\frac{t}{T}\\right)\\left(\\frac{A^2}{2} + \\sigma^2\\right)',
    theoreticalRxx: 'R_{XX}(t_1, t_2) \\neq R_{XX}(t_1 - t_2)',
    description:
      'Stochastic process with a deterministic time-varying mean drift and a linearly expanding variance envelope. Explicitly violates SSS, WSS, and ergodicity.',
    assumptions: [
      'Time-varying mean drift μ(t) controlled by drift intensity d',
      'Heteroscedastic envelope scaling variance from 0.35× at t=0 to 1.60× at t=T',
      'Autocorrelation R_XX(t₁, t₂) depends on absolute times t₁ and t₂, not just lag τ',
      'Time averages from a single path fail to track the time-varying ensemble statistics',
    ],
  },
};

export interface ProcessParams {
  type: ProcessType;
  realizationCount: number; // M (3 to 20)
  sampleCount: number; // N (80 to 300)
  tMax: number; // Duration T in seconds (default 10)
  amplitude: number; // Signal scale A (0.5 to 3.0)
  noiseStd: number; // Noise std dev sigma (0.1 to 1.2)
  frequency: number; // Characteristic frequency f0 in Hz (0.2 to 2.0)
  driftRate: number; // Non-stationary drift intensity d (0.2 to 2.0)
  seed: number;
}

export const DEFAULT_PROCESS_PARAMS: ProcessParams = {
  type: 'random_phase_sinusoid',
  realizationCount: 8,
  sampleCount: 200,
  tMax: 10.0,
  amplitude: 1.6,
  noiseStd: 0.35,
  frequency: 0.6,
  driftRate: 0.9,
  seed: 42,
};

// Seeded pseudorandom number generator (Park-Miller LCG)
export function createRng(seed: number) {
  let s = Math.abs(Math.floor(seed)) % 2147483647;
  if (s <= 0) s = 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

// Box-Muller standard normal generator
export function normalSample(rng: () => number, mu = 0, sigma = 1): number {
  let u1 = rng();
  while (u1 <= 1e-12) u1 = rng();
  const u2 = rng();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return mu + sigma * z0;
}

export interface TrajectoryPoint {
  t: number;
  x: number;
}

export interface EnsembleSimulationData {
  params: ProcessParams;
  timeSteps: number[]; // Length N: [0, ..., tMax]
  dt: number;
  samplingFreq: number;
  trajectories: TrajectoryPoint[][]; // M trajectories, each length N
  ensembleMean: number[]; // Length N: mu_hat(t)
  ensembleVariance: number[]; // Length N: sigma_hat^2(t)
  ensembleStdDev: number[]; // Length N: sigma_hat(t)
  theoreticalMeanCurve: number[]; // Length N: theoretical E[X(t)]
  theoreticalVarianceCurve: number[]; // Length N: theoretical Var(X(t))
  runningTimeAverages: number[][]; // M x N: cumulative time average up to t_k
  timeAverages: number[]; // Length M: full-horizon time-mean for each realization
  timeVariances: number[]; // Length M: full-horizon time-variance for each realization
  grandEnsembleMean: number;
  grandEnsembleVariance: number;
}

// Theoretical instantaneous mean E[X(t)]
export function getTheoreticalMeanAt(params: ProcessParams, t: number): number {
  if (params.type !== 'non_stationary') return 0;
  return (
    params.driftRate *
    (1.2 * Math.sin(2 * Math.PI * (params.frequency * 0.3) * t) + 0.18 * (t - params.tMax / 2))
  );
}

// Theoretical instantaneous variance Var(X(t))
export function getTheoreticalVarianceAt(params: ProcessParams, t: number): number {
  const A = params.amplitude;
  const sig = params.noiseStd;
  switch (params.type) {
    case 'white_noise':
      return sig * sig;
    case 'gaussian_bandlimited':
    case 'random_phase_sinusoid':
      return (A * A) / 2 + sig * sig;
    case 'non_stationary': {
      const envSq = 0.35 + 1.25 * (t / params.tMax);
      return envSq * ((A * A) / 2 + sig * sig);
    }
  }
}

// Generate the complete ensemble simulation
export function generateEnsembleSimulation(params: ProcessParams): EnsembleSimulationData {
  const {
    type,
    realizationCount: M,
    sampleCount: N,
    tMax,
    amplitude: A,
    noiseStd,
    frequency: f0,
    seed,
  } = params;

  const rng = createRng(seed);
  const dt = tMax / (N - 1);
  const samplingFreq = 1 / dt;
  const timeSteps: number[] = new Array(N);
  for (let k = 0; k < N; k++) {
    timeSteps[k] = (k / (N - 1)) * tMax;
  }

  // Rice quadrature parameters for exact bandlimited Gaussian on [0, f0]
  const K_BAND = 32;
  const quadCoeffStd = A / Math.sqrt(2 * K_BAND);

  const phases: number[] = new Array(M);
  const riceCoeffs: Array<Array<{ f: number; a: number; b: number }>> = [];

  for (let i = 0; i < M; i++) {
    phases[i] = (rng() * 2 - 1) * Math.PI;

    const coeffs: Array<{ f: number; a: number; b: number }> = [];
    for (let h = 0; h < K_BAND; h++) {
      const freq = ((h + 0.5) / K_BAND) * f0;
      const a = normalSample(rng, 0, quadCoeffStd);
      const b = normalSample(rng, 0, quadCoeffStd);
      coeffs.push({ f: freq, a, b });
    }
    riceCoeffs.push(coeffs);
  }

  // Generate M trajectories
  const trajectories: TrajectoryPoint[][] = [];

  for (let i = 0; i < M; i++) {
    const points: TrajectoryPoint[] = new Array(N);
    const theta_i = phases[i];
    const coeffs = riceCoeffs[i];

    for (let k = 0; k < N; k++) {
      const t = timeSteps[k];
      let val = 0;

      switch (type) {
        case 'white_noise': {
          val = normalSample(rng, 0, noiseStd);
          break;
        }

        case 'gaussian_bandlimited': {
          let sumHarmonics = 0;
          for (let h = 0; h < K_BAND; h++) {
            const angle = 2 * Math.PI * coeffs[h].f * t;
            sumHarmonics += coeffs[h].a * Math.cos(angle) + coeffs[h].b * Math.sin(angle);
          }
          const whiteComp = normalSample(rng, 0, noiseStd);
          val = sumHarmonics + whiteComp;
          break;
        }

        case 'random_phase_sinusoid': {
          const carrier = A * Math.cos(2 * Math.PI * f0 * t + theta_i);
          const noise = normalSample(rng, 0, noiseStd);
          val = carrier + noise;
          break;
        }

        case 'non_stationary': {
          const meanDrift = getTheoreticalMeanAt(params, t);
          const varEnvelope = Math.sqrt(0.35 + 1.25 * (t / tMax));
          let base = 0;
          for (let h = 0; h < K_BAND; h++) {
            const angle = 2 * Math.PI * coeffs[h].f * t;
            base += coeffs[h].a * Math.cos(angle) + coeffs[h].b * Math.sin(angle);
          }
          base += normalSample(rng, 0, noiseStd);
          val = meanDrift + base * varEnvelope;
          break;
        }
      }

      points[k] = { t, x: val };
    }
    trajectories.push(points);
  }

  // Calculate ensemble mean, variance, and theoretical curves across time
  const ensembleMean: number[] = new Array(N);
  const ensembleVariance: number[] = new Array(N);
  const ensembleStdDev: number[] = new Array(N);
  const theoreticalMeanCurve: number[] = new Array(N);
  const theoreticalVarianceCurve: number[] = new Array(N);

  for (let k = 0; k < N; k++) {
    const t = timeSteps[k];
    theoreticalMeanCurve[k] = getTheoreticalMeanAt(params, t);
    theoreticalVarianceCurve[k] = getTheoreticalVarianceAt(params, t);

    let sum = 0;
    for (let i = 0; i < M; i++) {
      sum += trajectories[i][k].x;
    }
    const mu = sum / M;
    ensembleMean[k] = mu;

    let varSum = 0;
    for (let i = 0; i < M; i++) {
      const dev = trajectories[i][k].x - mu;
      varSum += dev * dev;
    }
    const variance = M > 1 ? varSum / (M - 1) : 0;
    ensembleVariance[k] = variance;
    ensembleStdDev[k] = Math.sqrt(variance);
  }

  // Calculate running time averages, full-horizon time averages, and time variances
  const runningTimeAverages: number[][] = new Array(M);
  const timeAverages: number[] = new Array(M);
  const timeVariances: number[] = new Array(M);

  for (let i = 0; i < M; i++) {
    const runAvg: number[] = new Array(N);
    let sum = 0;
    for (let k = 0; k < N; k++) {
      sum += trajectories[i][k].x;
      runAvg[k] = sum / (k + 1);
    }
    runningTimeAverages[i] = runAvg;
    const tMean = sum / N;
    timeAverages[i] = tMean;

    let varSum = 0;
    for (let k = 0; k < N; k++) {
      const dev = trajectories[i][k].x - tMean;
      varSum += dev * dev;
    }
    timeVariances[i] = N > 1 ? varSum / (N - 1) : 0;
  }

  const grandEnsembleMean = ensembleMean.reduce((a, b) => a + b, 0) / N;
  const grandEnsembleVariance = ensembleVariance.reduce((a, b) => a + b, 0) / N;

  return {
    params,
    timeSteps,
    dt,
    samplingFreq,
    trajectories,
    ensembleMean,
    ensembleVariance,
    ensembleStdDev,
    theoreticalMeanCurve,
    theoreticalVarianceCurve,
    runningTimeAverages,
    timeAverages,
    timeVariances,
    grandEnsembleMean,
    grandEnsembleVariance,
  };
}

// Linearly interpolate array at fractional time index
function interpArray(arr: number[], exactIdx: number): number {
  const lo = Math.floor(exactIdx);
  const hi = Math.min(arr.length - 1, lo + 1);
  const frac = exactIdx - lo;
  return arr[lo] * (1 - frac) + arr[hi] * frac;
}

// Instantaneous interpolated statistics at exact time t
export interface InstantaneousStats {
  simTime: number;
  timeIndex: number;
  selectedRealizationIndex: number;
  selectedAmplitude: number;
  ensembleValues: number[];
  ensembleMean: number;
  ensembleVariance: number;
  ensembleStdDev: number;
  theoreticalMean: number;
  theoreticalVariance: number;
  confidenceLower: number; // mu - 1.96 * sigma
  confidenceUpper: number; // mu + 1.96 * sigma
  runningTimeAvgSelected: number;
  timeAvgSelected: number;
  timeVarSelected: number;
  ergodicityDelta: number; // |timeAvg - grandEnsembleMean|
}

export function getInstantaneousStats(
  sim: EnsembleSimulationData,
  simTime: number,
  selectedRealizationIndex: number
): InstantaneousStats {
  const {
    timeSteps,
    trajectories,
    ensembleMean,
    ensembleVariance,
    ensembleStdDev,
    theoreticalMeanCurve,
    theoreticalVarianceCurve,
    runningTimeAverages,
    timeAverages,
    timeVariances,
    grandEnsembleMean,
  } = sim;
  const N = timeSteps.length;
  const M = trajectories.length;

  const clampedT = Math.max(0, Math.min(sim.params.tMax, simTime));
  const exactIdx = Math.max(0, Math.min(N - 1, (clampedT / sim.params.tMax) * (N - 1)));
  const lo = Math.floor(exactIdx);
  const hi = Math.min(N - 1, lo + 1);
  const frac = exactIdx - lo;
  const timeIndex = Math.round(exactIdx);

  const safeRealizationIdx = Math.max(0, Math.min(M - 1, selectedRealizationIndex));

  const ensembleValues: number[] = new Array(M);
  for (let i = 0; i < M; i++) {
    ensembleValues[i] = trajectories[i][lo].x * (1 - frac) + trajectories[i][hi].x * frac;
  }

  const selectedAmplitude = ensembleValues[safeRealizationIdx];
  const mu = interpArray(ensembleMean, exactIdx);
  const variance = Math.max(0, interpArray(ensembleVariance, exactIdx));
  const sigma = Math.sqrt(variance);
  const theoreticalMean = interpArray(theoreticalMeanCurve, exactIdx);
  const theoreticalVariance = interpArray(theoreticalVarianceCurve, exactIdx);
  const runningTimeAvgSelected = interpArray(runningTimeAverages[safeRealizationIdx], exactIdx);

  const timeAvgSelected = timeAverages[safeRealizationIdx] ?? 0;
  const timeVarSelected = timeVariances[safeRealizationIdx] ?? 0;
  const ergodicityDelta = Math.abs(timeAvgSelected - grandEnsembleMean);

  return {
    simTime: clampedT,
    timeIndex,
    selectedRealizationIndex: safeRealizationIdx,
    selectedAmplitude,
    ensembleValues,
    ensembleMean: mu,
    ensembleVariance: variance,
    ensembleStdDev: sigma,
    theoreticalMean,
    theoreticalVariance,
    confidenceLower: mu - 1.96 * sigma,
    confidenceUpper: mu + 1.96 * sigma,
    runningTimeAvgSelected,
    timeAvgSelected,
    timeVarSelected,
    ergodicityDelta,
  };
}

// Compute Autocorrelation R_XX(tau) for lags tau in [-tauMax, +tauMax]
// Plus early-half vs late-half autocorrelations for honest shift-invariance testing
export interface AutocorrelationResult {
  lags: number[]; // Lag times in seconds
  lagIndices: number[]; // Integer lag indices -maxLag .. +maxLag
  ensembleRxx: number[]; // Ensemble-averaged time autocorrelation R_XX(tau)
  selectedTrajectoryRxx: number[]; // Single-realization autocorrelation
  theoreticalRxx: number[] | null; // Analytical R_XX(tau) for WSS processes, null for non-stationary
  earlyWindowRxx: number[]; // Estimated on [0, T/2]
  lateWindowRxx: number[]; // Estimated on [T/2, T]
  peakValue: number; // R_XX(0)
  totalPower: number;
  correlationTime: number; // Approximate tau_c where |R(tau)| drops to peak / e
}

function estimateWindowAutocorr(
  trajectories: TrajectoryPoint[][],
  startIdx: number,
  endIdx: number,
  maxLag: number
): number[] {
  const M = trajectories.length;
  const len = endIdx - startIdx;
  const lagCount = 2 * maxLag + 1;
  const rxx = new Array(lagCount).fill(0);

  for (let i = 0; i < M; i++) {
    const pts = trajectories[i];
    for (let idx = 0; idx < lagCount; idx++) {
      const m = idx - maxLag;
      const absM = Math.abs(m);
      if (absM >= len) continue;
      let sum = 0;
      const count = len - absM;
      for (let k = startIdx; k < endIdx - absM; k++) {
        sum += pts[k].x * pts[k + absM].x;
      }
      rxx[idx] += (count > 0 ? sum / count : 0) / M;
    }
  }
  return rxx;
}

export function computeAutocorrelation(
  sim: EnsembleSimulationData,
  selectedRealizationIndex: number,
  maxLagFraction: number = 0.35
): AutocorrelationResult {
  const { trajectories, timeSteps, dt, params } = sim;
  const M = trajectories.length;
  const N = timeSteps.length;
  const maxLag = Math.max(4, Math.floor(N * maxLagFraction));

  const lagCount = 2 * maxLag + 1;
  const lags: number[] = new Array(lagCount);
  const lagIndices: number[] = new Array(lagCount);
  const ensembleRxx: number[] = new Array(lagCount).fill(0);
  const selectedTrajectoryRxx: number[] = new Array(lagCount).fill(0);

  for (let idx = 0; idx < lagCount; idx++) {
    const m = idx - maxLag;
    lagIndices[idx] = m;
    lags[idx] = m * dt;
  }

  const safeIdx = Math.max(0, Math.min(M - 1, selectedRealizationIndex));

  // Unbiased sample autocorrelation over full observation window
  for (let i = 0; i < M; i++) {
    const pts = trajectories[i];
    for (let idx = 0; idx < lagCount; idx++) {
      const m = lagIndices[idx];
      const absM = Math.abs(m);
      let sum = 0;
      const count = N - absM;

      for (let k = 0; k < count; k++) {
        sum += pts[k].x * pts[k + absM].x;
      }

      const rVal = count > 0 ? sum / count : 0;
      ensembleRxx[idx] += rVal / M;
      if (i === safeIdx) {
        selectedTrajectoryRxx[idx] = rVal;
      }
    }
  }

  // Split-window autocorrelation on [0, N/2] and [N/2, N] with lags up to min(maxLag, N/4)
  const halfN = Math.floor(N / 2);
  const earlyWindowRxx = estimateWindowAutocorr(trajectories, 0, halfN, maxLag);
  const lateWindowRxx = estimateWindowAutocorr(trajectories, halfN, N, maxLag);

  // Theoretical autocorrelation (only well-defined as a 1D function of tau for WSS processes)
  const A = params.amplitude;
  const f0 = params.frequency;
  const sig = params.noiseStd;

  let theoreticalRxx: number[] | null = null;
  if (params.type !== 'non_stationary') {
    theoreticalRxx = new Array(lagCount).fill(0);
    for (let idx = 0; idx < lagCount; idx++) {
      const tau = lags[idx];
      const isZeroLag = lagIndices[idx] === 0;
      switch (params.type) {
        case 'white_noise': {
          theoreticalRxx[idx] = isZeroLag ? sig * sig : 0;
          break;
        }
        case 'random_phase_sinusoid': {
          const carrier = ((A * A) / 2) * Math.cos(2 * Math.PI * f0 * tau);
          theoreticalRxx[idx] = carrier + (isZeroLag ? sig * sig : 0);
          break;
        }
        case 'gaussian_bandlimited': {
          const sinc =
            Math.abs(tau) < 1e-9
              ? 1
              : Math.sin(2 * Math.PI * f0 * tau) / (2 * Math.PI * f0 * tau);
          theoreticalRxx[idx] = ((A * A) / 2) * sinc + (isZeroLag ? sig * sig : 0);
          break;
        }
      }
    }
  }

  const zeroIdx = maxLag;
  const peakValue = ensembleRxx[zeroIdx];
  const totalPower = peakValue;

  // Correlation time estimation (where |R(tau)| first drops below peak / e)
  let correlationTime = dt;
  const threshold = Math.abs(peakValue) / Math.E;
  for (let idx = zeroIdx + 1; idx < lagCount; idx++) {
    if (Math.abs(ensembleRxx[idx]) <= threshold) {
      correlationTime = lags[idx];
      break;
    }
  }

  return {
    lags,
    lagIndices,
    ensembleRxx,
    selectedTrajectoryRxx,
    theoreticalRxx,
    earlyWindowRxx,
    lateWindowRxx,
    peakValue,
    totalPower,
    correlationTime,
  };
}

// Honest Finite-Sample Stationarity Diagnostic Results
export interface StationarityDiagnostics {
  meanMin: number;
  meanMax: number;
  meanRange: number;
  meanDriftRatio: number; // Normalized |mu_late - mu_early| + std_t(mu) relative to SE
  passesMeanTest: boolean;
  varMin: number;
  varMax: number;
  varRange: number;
  earlyMean: number;
  lateMean: number;
  earlyVar: number;
  lateVar: number;
  varRatio: number; // max(earlyVar, lateVar) / min(earlyVar, lateVar)
  passesVarTest: boolean;
  lagShiftError: number; // Normalized RMS difference between earlyWindowRxx and lateWindowRxx
  passesLagInvariance: boolean;
  empiricalWssStatus: 'Consistent' | 'Violated';
  theoreticalWssStatus: boolean;
  theoreticalSssStatus: boolean;
  finiteDataNotice: string;
}

export function evaluateStationarity(
  sim: EnsembleSimulationData,
  autocorr: AutocorrelationResult
): StationarityDiagnostics {
  const { ensembleMean, ensembleVariance, trajectories, params } = sim;
  const M = trajectories.length;
  const N = ensembleMean.length;
  const meta = PROCESS_CATALOG[params.type];

  const meanMin = Math.min(...ensembleMean);
  const meanMax = Math.max(...ensembleMean);
  const meanRange = meanMax - meanMin;

  const varMin = Math.min(...ensembleVariance);
  const varMax = Math.max(...ensembleVariance);
  const varRange = varMax - varMin;

  const halfN = Math.floor(N / 2);
  const earlyMean = ensembleMean.slice(0, halfN).reduce((a, b) => a + b, 0) / halfN;
  const lateMean = ensembleMean.slice(halfN).reduce((a, b) => a + b, 0) / (N - halfN);

  const earlyVar = ensembleVariance.slice(0, halfN).reduce((a, b) => a + b, 0) / halfN;
  const lateVar = ensembleVariance.slice(halfN).reduce((a, b) => a + b, 0) / (N - halfN);

  const avgVar = Math.max(1e-6, sim.grandEnsembleVariance);
  const avgStd = Math.sqrt(avgVar);

  // Condition 1: Compare temporal std of ensemble mean + half-window shift against expected sampling SE = avgStd / sqrt(M)
  const grandMu = sim.grandEnsembleMean;
  const meanTemporalStd = Math.sqrt(
    ensembleMean.reduce((acc, m) => acc + (m - grandMu) * (m - grandMu), 0) / N
  );
  const expectedMeanSE = avgStd / Math.sqrt(M);
  const halfShift = Math.abs(lateMean - earlyMean);
  const meanDriftRatio = Math.max(meanTemporalStd / Math.max(1e-6, expectedMeanSE), halfShift / Math.max(1e-6, 1.8 * expectedMeanSE));
  // For truly zero-mean stationary processes, half-window mean drift ratio stays well below ~1.6;
  // systematic trend (drift) pushes meanDriftRatio above 1.75.
  const passesMeanTest = meanDriftRatio < 1.75;

  // Condition 2: Compare early vs late half-window variance ratio
  const varRatio = Math.max(earlyVar, lateVar) / Math.max(1e-6, Math.min(earlyVar, lateVar));
  const varThreshold = 1.6 + 1.2 / Math.max(3, M);
  const passesVarTest = varRatio <= varThreshold;

  // Condition 3: Shift-invariance of autocorrelation R_early(tau) vs R_late(tau)
  const center = Math.floor(autocorr.lags.length / 2);
  const compareRadius = Math.min(center, Math.floor(N / 6));
  let diffSqSum = 0;
  let refSqSum = 0;
  for (let offset = -compareRadius; offset <= compareRadius; offset++) {
    const idx = center + offset;
    const eVal = autocorr.earlyWindowRxx[idx];
    const lVal = autocorr.lateWindowRxx[idx];
    diffSqSum += (eVal - lVal) * (eVal - lVal);
    refSqSum += 0.5 * (eVal * eVal + lVal * lVal);
  }
  const lagShiftError = Math.sqrt(diffSqSum / Math.max(1e-9, refSqSum));
  const lagThreshold = Math.min(0.65, 0.28 + 1.2 / Math.sqrt(M));
  const passesLagInvariance = lagShiftError < lagThreshold;

  const empiricalWssStatus =
    passesMeanTest && passesVarTest && passesLagInvariance ? 'Consistent' : 'Violated';

  return {
    meanMin,
    meanMax,
    meanRange,
    meanDriftRatio,
    passesMeanTest,
    varMin,
    varMax,
    varRange,
    earlyMean,
    lateMean,
    earlyVar,
    lateVar,
    varRatio,
    passesVarTest,
    lagShiftError,
    passesLagInvariance,
    empiricalWssStatus,
    theoreticalWssStatus: meta.isWss,
    theoreticalSssStatus: meta.isSss,
    finiteDataNotice:
      'Numerical evaluation on finite sample paths checks empirical consistency with WSS conditions, but cannot mathematically prove SSS or WSS.',
  };
}

// Documented Assumptions & Results Generation
export interface DocumentedReport {
  assumptions: {
    realizationCount: number;
    sampleCount: number;
    tMax: number;
    dt: number;
    samplingFreq: number;
    processType: string;
    description: string;
    statisticalAssumptions: string[];
    estimationMethods: string[];
    approximations: string[];
  };
  results: {
    simTime: number;
    instantaneousEnsembleMean: number;
    grandEnsembleMean: number;
    instantaneousEnsembleVariance: number;
    grandEnsembleVariance: number;
    timeMeanSelected: number;
    timeVarSelected: number;
    ergodicityMeanGap: number;
    ergodicityVarGap: number;
    autocorrZeroLagPower: number;
    estimatedCorrelationTime: number;
    stationarityResult: 'Consistent' | 'Violated';
    theoreticalWss: boolean;
    theoreticalSss: boolean;
    engineeringInterpretation: string;
  };
}

export function generateDocumentedReport(
  sim: EnsembleSimulationData,
  simTime: number,
  selectedRealizationIndex: number,
  autocorr: AutocorrelationResult,
  stationarity: StationarityDiagnostics
): DocumentedReport {
  const meta = PROCESS_CATALOG[sim.params.type];
  const stats = getInstantaneousStats(sim, simTime, selectedRealizationIndex);

  const meanGap = Math.abs(stats.timeAvgSelected - sim.grandEnsembleMean);
  const varGap = Math.abs(stats.timeVarSelected - sim.grandEnsembleVariance);

  let interpretation = '';
  switch (sim.params.type) {
    case 'white_noise':
      interpretation =
        'AWGN exhibits zero temporal correlation beyond lag τ = 0. Both the ensemble mean and single-path time average hover near 0 V, while ensemble variance and time variance converge toward σ², consistent with WSS, SSS, and ergodicity.';
      break;
    case 'gaussian_bandlimited':
      interpretation =
        'The bandlimited Gaussian process shows smooth temporal correlation decaying as sinc(2f₀τ) over correlation time τ_c. Statistical moments remain time-invariant, and longer trajectories drive time averages toward ensemble averages.';
      break;
    case 'random_phase_sinusoid':
      interpretation =
        'Although each individual realization is a deterministic sinusoid plus noise, uniform phase Θ ~ U(-π, π) cancels across the ensemble so E[X(t)] = 0. Autocorrelation oscillates as (A²/2)cos(2πf₀τ) + σ²δ_τ,0, satisfying WSS, SSS, and ergodicity.';
      break;
    case 'non_stationary':
      interpretation =
        'Systemic mean drift and expanding variance break time-shift invariance. Both the mean/variance profiles and early-vs-late autocorrelation windows diverge, demonstrating violation of SSS, WSS, and ergodicity.';
      break;
  }

  return {
    assumptions: {
      realizationCount: sim.params.realizationCount,
      sampleCount: sim.params.sampleCount,
      tMax: sim.params.tMax,
      dt: sim.dt,
      samplingFreq: sim.samplingFreq,
      processType: meta.name,
      description: meta.description,
      statisticalAssumptions: meta.assumptions,
      estimationMethods: [
        'Ensemble mean μ̂(t_k) = (1/M) Σ x_i(t_k) across M independent trajectories',
        'Unbiased ensemble variance σ̂²(t_k) = (1/(M-1)) Σ (x_i(t_k) - μ̂(t_k))²',
        'Time average ⟨x_i⟩_T = (1/N) Σ x_i(t_k) and sample time variance along path i',
        'Unbiased sample autocorrelation R̂_XX(mΔt) averaged across M trajectories',
      ],
      approximations: [
        `Finite ensemble size M = ${sim.params.realizationCount} (estimator standard error scales as σ/√M)`,
        `Finite observation window T = ${sim.params.tMax.toFixed(1)} s with uniform sampling Δt = ${sim.dt.toFixed(4)} s`,
        'Bandlimited Gaussian uses K = 32 Rice quadrature harmonics across [0, f₀]',
        'Gaussian variates generated via Park-Miller LCG and Box-Muller transform',
      ],
    },
    results: {
      simTime: stats.simTime,
      instantaneousEnsembleMean: stats.ensembleMean,
      grandEnsembleMean: sim.grandEnsembleMean,
      instantaneousEnsembleVariance: stats.ensembleVariance,
      grandEnsembleVariance: sim.grandEnsembleVariance,
      timeMeanSelected: stats.timeAvgSelected,
      timeVarSelected: stats.timeVarSelected,
      ergodicityMeanGap: meanGap,
      ergodicityVarGap: varGap,
      autocorrZeroLagPower: autocorr.peakValue,
      estimatedCorrelationTime: autocorr.correlationTime,
      stationarityResult: stationarity.empiricalWssStatus,
      theoreticalWss: meta.isWss,
      theoreticalSss: meta.isSss,
      engineeringInterpretation: interpretation,
    },
  };
}
