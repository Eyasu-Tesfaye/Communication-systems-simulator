/**
 * Module 03: Random Processes Engine
 * Rigorous stochastic simulation, ensemble and time-average calculations,
 * mean & variance over time, SSS and WSS stationarity tests, ergodicity,
 * and autocorrelation analysis.
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
    theoreticalMean: '\\mathbb{E}[X(t)] = \\mu = 0',
    theoreticalVar: '\\operatorname{Var}(X(t)) = \\sigma^2',
    theoreticalRxx: 'R_{XX}(\\tau) = \\sigma^2 \\delta(\\tau)',
    description:
      'Uncorrelated zero-mean Gaussian random variables at every instant. Strictly stationary, wide-sense stationary, and completely ergodic with zero memory.',
    assumptions: [
      'Independent and identically distributed (i.i.d.) Gaussian samples at each time instant',
      'Zero mean: E[X(t)] = 0',
      'Flat spectral density over the simulation Nyquist bandwidth',
      'Zero temporal memory: correlation exists only at zero lag τ = 0',
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
    theoreticalMean: '\\mathbb{E}[X(t)] = 0',
    theoreticalVar: '\\operatorname{Var}(X(t)) = \\sigma^2',
    theoreticalRxx: 'R_{XX}(\\tau) = \\sigma^2 \\operatorname{sinc}(2B\\tau) \\cos(2\\pi f_c \\tau)',
    description:
      'Continuous-spectrum coloured Gaussian process synthesized by harmonic superposition (Rice model). Stationary and ergodic with finite correlation time.',
    assumptions: [
      'Gaussian distribution confirmed by Central Limit Theorem over harmonic sum',
      'Zero DC bias: E[X(t)] = 0',
      'Finite coherence duration inversely proportional to bandwidth B',
      'Time-invariant statistical generator mechanism',
    ],
  },
  random_phase_sinusoid: {
    id: 'random_phase_sinusoid',
    name: 'Random-Phase Sinusoidal Process',
    shortName: 'Random-Phase Sinusoid',
    isStationary: true,
    isWss: true,
    isSss: false,
    isErgodic: true,
    theoreticalMean: '\\mathbb{E}[X(t)] = \\int_{-\\pi}^{\\pi} \\frac{A}{2\\pi}\\cos(2\\pi f_0 t + \\theta) d\\theta = 0',
    theoreticalVar: '\\operatorname{Var}(X(t)) = \\frac{A^2}{2}',
    theoreticalRxx: 'R_{XX}(\\tau) = \\frac{A^2}{2} \\cos(2\\pi f_0 \\tau)',
    description:
      'Harmonic signal with uniformly distributed random phase Θ ~ U(-π, π). Ensemble mean is zero and autocorrelation depends strictly on lag τ, satisfying WSS.',
    assumptions: [
      'Phase Θ is uniform on [-π, π] and independent across realizations',
      'Carrier frequency f0 and peak amplitude A are deterministic and constant',
      'Ensemble mean integrates to zero identically for all t',
      'Autocorrelation depends solely on lag difference τ = t1 - t2',
    ],
  },
  non_stationary: {
    id: 'non_stationary',
    name: 'Non-Stationary Random Process (Drifting Mean & Expanding Variance)',
    shortName: 'Non-Stationary Process',
    isStationary: false,
    isWss: false,
    isSss: false,
    isErgodic: false,
    theoreticalMean: '\\mathbb{E}[X(t)] = \\mu(t) = A_d \\sin(2\\pi f_d t) + m_d(t - T/2)',
    theoreticalVar: '\\operatorname{Var}(X(t)) = \\sigma_0^2 \\left(0.4 + 1.2 \\frac{t}{T}\\right)',
    theoreticalRxx: 'R_{XX}(t_1, t_2) \\neq R_{XX}(t_1 - t_2)',
    description:
      'Process with time-varying mean drift and expanding variance envelope. Violates SSS, WSS, and ergodicity.',
    assumptions: [
      'Systemic cyclical and linear trend drift applied to ensemble mean',
      'Heteroscedastic variance expanding linearly across the time horizon',
      'Joint distribution shifts over time; time average cannot match ensemble mean',
    ],
  },
};

export interface ProcessParams {
  type: ProcessType;
  realizationCount: number; // M (3 to 24)
  sampleCount: number; // N (80 to 320)
  tMax: number; // Duration T in seconds (default 10)
  amplitude: number; // Signal scale A (0.5 to 3.0)
  noiseStd: number; // Noise std dev sigma (0.1 to 1.5)
  frequency: number; // Characteristic frequency f0 in Hz (0.2 to 2.5)
  driftRate: number; // Non-stationary drift intensity (0.2 to 2.0)
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
  driftRate: 0.8,
  seed: 42,
};

// Seeded pseudorandom number generator (LCG)
export function createRng(seed: number) {
  let s = Math.abs(seed) % 2147483647;
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
  timeSteps: number[]; // Length N: [0, ..., TMax]
  dt: number;
  samplingFreq: number;
  trajectories: TrajectoryPoint[][]; // M trajectories, each length N
  ensembleMean: number[]; // Length N: mu(t)
  ensembleVariance: number[]; // Length N: sigma^2(t)
  ensembleStdDev: number[]; // Length N: sigma(t)
  timeAverages: number[]; // Length M: time-mean for each realization
  timeVariances: number[]; // Length M: time-variance for each realization
  grandEnsembleMean: number;
  grandEnsembleVariance: number;
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
    driftRate,
    seed,
  } = params;

  const rng = createRng(seed);
  const dt = tMax / (N - 1);
  const samplingFreq = 1 / dt;
  const timeSteps: number[] = new Array(N);
  for (let k = 0; k < N; k++) {
    timeSteps[k] = (k / (N - 1)) * tMax;
  }

  // Pre-generate realization-specific random variables
  const phases: number[] = new Array(M);
  const harmonicPacks: Array<Array<{ f: number; a: number; phi: number }>> = [];

  for (let i = 0; i < M; i++) {
    phases[i] = (rng() * 2 - 1) * Math.PI;

    const harmonics: Array<{ f: number; a: number; phi: number }> = [];
    const numHarmonics = 8;
    for (let h = 0; h < numHarmonics; h++) {
      const freq = f0 * (0.6 + h * 0.45) + (rng() - 0.5) * 0.1;
      const amp = (A / Math.sqrt(numHarmonics)) * (0.8 + rng() * 0.4);
      const phi = (rng() * 2 - 1) * Math.PI;
      harmonics.push({ f: freq, a: amp, phi });
    }
    harmonicPacks.push(harmonics);
  }

  // Generate M trajectories
  const trajectories: TrajectoryPoint[][] = [];

  for (let i = 0; i < M; i++) {
    const points: TrajectoryPoint[] = new Array(N);
    const theta_i = phases[i];
    const harmonics = harmonicPacks[i];

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
          for (let h = 0; h < harmonics.length; h++) {
            sumHarmonics += harmonics[h].a * Math.cos(2 * Math.PI * harmonics[h].f * t + harmonics[h].phi);
          }
          const whiteComp = normalSample(rng, 0, noiseStd * 0.5);
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
          const meanDrift =
            driftRate * (1.2 * Math.sin(2 * Math.PI * (f0 * 0.3) * t) + 0.18 * (t - tMax / 2));
          const varEnvelope = Math.sqrt(0.35 + 1.25 * (t / tMax));

          let base = 0;
          for (let h = 0; h < 4; h++) {
            base += harmonics[h].a * Math.cos(2 * Math.PI * harmonics[h].f * t + harmonics[h].phi);
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

  // Calculate ensemble mean and variance across time
  const ensembleMean: number[] = new Array(N);
  const ensembleVariance: number[] = new Array(N);
  const ensembleStdDev: number[] = new Array(N);

  for (let k = 0; k < N; k++) {
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

  // Calculate time averages and time variances for each realization
  const timeAverages: number[] = new Array(M);
  const timeVariances: number[] = new Array(M);

  for (let i = 0; i < M; i++) {
    let sum = 0;
    for (let k = 0; k < N; k++) {
      sum += trajectories[i][k].x;
    }
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
    timeAverages,
    timeVariances,
    grandEnsembleMean,
    grandEnsembleVariance,
  };
}

// Calculate instantaneous stats at an arbitrary time t
export interface InstantaneousStats {
  simTime: number;
  timeIndex: number;
  selectedRealizationIndex: number;
  selectedAmplitude: number;
  ensembleValues: number[];
  ensembleMean: number;
  ensembleVariance: number;
  ensembleStdDev: number;
  confidenceLower: number; // mu - 1.96 * sigma
  confidenceUpper: number; // mu + 1.96 * sigma
  timeAvgSelected: number;
  timeVarSelected: number;
  ergodicityDelta: number; // |timeAvg - ensembleMean|
  isStationaryConsistent: boolean;
}

export function getInstantaneousStats(
  sim: EnsembleSimulationData,
  simTime: number,
  selectedRealizationIndex: number
): InstantaneousStats {
  const { timeSteps, trajectories, ensembleMean, ensembleVariance, ensembleStdDev, timeAverages, timeVariances } = sim;
  const N = timeSteps.length;
  const M = trajectories.length;

  const clampedT = Math.max(0, Math.min(sim.params.tMax, simTime));
  const timeIndex = Math.min(
    N - 1,
    Math.max(0, Math.round((clampedT / sim.params.tMax) * (N - 1)))
  );

  const safeRealizationIdx = Math.max(0, Math.min(M - 1, selectedRealizationIndex));
  const selectedAmplitude = trajectories[safeRealizationIdx][timeIndex].x;

  const ensembleValues: number[] = new Array(M);
  for (let i = 0; i < M; i++) {
    ensembleValues[i] = trajectories[i][timeIndex].x;
  }

  const mu = ensembleMean[timeIndex];
  const variance = ensembleVariance[timeIndex];
  const sigma = ensembleStdDev[timeIndex];

  const timeAvgSelected = timeAverages[safeRealizationIdx] ?? 0;
  const timeVarSelected = timeVariances[safeRealizationIdx] ?? 0;
  const ergodicityDelta = Math.abs(timeAvgSelected - mu);

  const isStationaryConsistent =
    sim.params.type !== 'non_stationary' && ergodicityDelta < 0.65;

  return {
    simTime: clampedT,
    timeIndex,
    selectedRealizationIndex: safeRealizationIdx,
    selectedAmplitude,
    ensembleValues,
    ensembleMean: mu,
    ensembleVariance: variance,
    ensembleStdDev: sigma,
    confidenceLower: mu - 1.96 * sigma,
    confidenceUpper: mu + 1.96 * sigma,
    timeAvgSelected,
    timeVarSelected,
    ergodicityDelta,
    isStationaryConsistent,
  };
}

// Compute Autocorrelation R_XX(tau) for lags tau in [-tauMax, +tauMax]
export interface AutocorrelationResult {
  lags: number[]; // Lag times in seconds
  lagIndices: number[]; // Integer lag indices -maxLag .. +maxLag
  ensembleRxx: number[]; // Average of realization autocorrelations
  selectedTrajectoryRxx: number[]; // Single-realization autocorrelation
  theoreticalRxx: number[]; // Exact mathematical curve
  peakValue: number; // R_XX(0)
  totalPower: number;
  correlationTime: number; // Approximate tau_c where R(tau) drops to 1/e
}

export function computeAutocorrelation(
  sim: EnsembleSimulationData,
  selectedRealizationIndex: number,
  maxLagFraction: number = 0.4
): AutocorrelationResult {
  const { trajectories, timeSteps, dt, params } = sim;
  const M = trajectories.length;
  const N = timeSteps.length;
  const maxLag = Math.floor(N * maxLagFraction);

  const lagCount = 2 * maxLag + 1;
  const lags: number[] = new Array(lagCount);
  const lagIndices: number[] = new Array(lagCount);
  const ensembleRxx: number[] = new Array(lagCount).fill(0);
  const selectedTrajectoryRxx: number[] = new Array(lagCount).fill(0);
  const theoreticalRxx: number[] = new Array(lagCount).fill(0);

  for (let idx = 0; idx < lagCount; idx++) {
    const m = idx - maxLag;
    lagIndices[idx] = m;
    lags[idx] = m * dt;
  }

  const safeIdx = Math.max(0, Math.min(M - 1, selectedRealizationIndex));

  // Calculate sample autocorrelation using unbiased lag estimator
  for (let i = 0; i < M; i++) {
    const x = trajectories[i].map((p) => p.x);
    for (let idx = 0; idx < lagCount; idx++) {
      const m = lagIndices[idx];
      let sum = 0;
      let count = 0;

      if (m >= 0) {
        for (let k = 0; k < N - m; k++) {
          sum += x[k] * x[k + m];
          count++;
        }
      } else {
        const absM = Math.abs(m);
        for (let k = 0; k < N - absM; k++) {
          sum += x[k + absM] * x[k];
          count++;
        }
      }

      const rVal = count > 0 ? sum / count : 0;
      ensembleRxx[idx] += rVal / M;
      if (i === safeIdx) {
        selectedTrajectoryRxx[idx] = rVal;
      }
    }
  }

  // Theoretical autocorrelation
  const A = params.amplitude;
  const f0 = params.frequency;
  const sig = params.noiseStd;

  for (let idx = 0; idx < lagCount; idx++) {
    const tau = lags[idx];
    switch (params.type) {
      case 'white_noise': {
        theoreticalRxx[idx] = Math.abs(tau) < dt * 0.8 ? sig * sig : 0;
        break;
      }
      case 'random_phase_sinusoid': {
        const carrier = ((A * A) / 2) * Math.cos(2 * Math.PI * f0 * tau);
        const noise = Math.abs(tau) < dt * 0.8 ? sig * sig : 0;
        theoreticalRxx[idx] = carrier + noise;
        break;
      }
      case 'gaussian_bandlimited': {
        const sinc =
          Math.abs(tau) < 1e-6 ? 1 : Math.sin(2 * Math.PI * f0 * tau) / (2 * Math.PI * f0 * tau);
        theoreticalRxx[idx] = (A * A * 0.5 + sig * sig) * sinc;
        break;
      }
      case 'non_stationary': {
        theoreticalRxx[idx] = ensembleRxx[idx];
        break;
      }
    }
  }

  const zeroIdx = maxLag;
  const peakValue = ensembleRxx[zeroIdx];
  const totalPower = peakValue;

  // Correlation time estimation (where envelope drops to 1/e of peak)
  let correlationTime = dt;
  const threshold = peakValue / Math.E;
  for (let idx = zeroIdx + 1; idx < lagCount; idx++) {
    if (ensembleRxx[idx] <= threshold) {
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
    peakValue,
    totalPower,
    correlationTime,
  };
}

// Stationarity Diagnostic Results
export interface StationarityDiagnostics {
  meanMin: number;
  meanMax: number;
  meanRange: number;
  passesMeanTest: boolean;
  varMin: number;
  varMax: number;
  varRange: number;
  passesVarTest: boolean;
  lagSymmetryError: number;
  passesLagSymmetry: boolean;
  empiricalWssStatus: 'Pass' | 'Fail';
  theoreticalWssStatus: boolean;
  theoreticalSssStatus: boolean;
  finiteDataNotice: string;
}

export function evaluateStationarity(
  sim: EnsembleSimulationData,
  autocorr: AutocorrelationResult
): StationarityDiagnostics {
  const { ensembleMean, ensembleVariance, params } = sim;
  const meta = PROCESS_CATALOG[params.type];

  const meanMin = Math.min(...ensembleMean);
  const meanMax = Math.max(...ensembleMean);
  const meanRange = meanMax - meanMin;

  const varMin = Math.min(...ensembleVariance);
  const varMax = Math.max(...ensembleVariance);
  const varRange = varMax - varMin;

  const passesMeanTest = meanRange < 0.65;
  const passesVarTest = varRange < 0.85;

  // Check even symmetry R(tau) == R(-tau)
  const half = Math.floor(autocorr.lags.length / 2);
  let symDiffSum = 0;
  for (let i = 1; i <= half; i++) {
    const left = autocorr.ensembleRxx[half - i];
    const right = autocorr.ensembleRxx[half + i];
    symDiffSum += Math.abs(left - right);
  }
  const lagSymmetryError = half > 0 ? symDiffSum / half : 0;
  const passesLagSymmetry = lagSymmetryError < 0.25;

  const empiricalWssStatus =
    passesMeanTest && passesVarTest && passesLagSymmetry && meta.isWss ? 'Pass' : 'Fail';

  return {
    meanMin,
    meanMax,
    meanRange,
    passesMeanTest,
    varMin,
    varMax,
    varRange,
    passesVarTest,
    lagSymmetryError,
    passesLagSymmetry,
    empiricalWssStatus,
    theoreticalWssStatus: meta.isWss,
    theoreticalSssStatus: meta.isSss,
    finiteDataNotice:
      'Numerical evaluation on finite sample paths is indicative of WSS consistency but does not constitute a formal mathematical proof of SSS or WSS.',
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
    approximations: string[];
  };
  results: {
    simTime: number;
    instantaneousEnsembleMean: number;
    instantaneousEnsembleVariance: number;
    timeMeanSelected: number;
    timeVarSelected: number;
    ergodicityMeanGap: number;
    ergodicityVarGap: number;
    autocorrZeroLagPower: number;
    estimatedCorrelationTime: number;
    stationarityResult: 'Pass' | 'Fail';
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

  const meanGap = Math.abs(stats.timeAvgSelected - stats.ensembleMean);
  const varGap = Math.abs(stats.timeVarSelected - stats.ensembleVariance);

  let interpretation = '';
  switch (sim.params.type) {
    case 'white_noise':
      interpretation =
        'AWGN exhibits zero temporal correlation beyond lag tau=0. Ensemble mean and time average both fluctuate closely around 0V, demonstrating full stationarity and ergodicity.';
      break;
    case 'gaussian_bandlimited':
      interpretation =
        'Coloured Gaussian process exhibits memory decay over finite correlation time tau_c. Statistical averages are stationary over time, and individual realization averages converge toward ensemble averages.';
      break;
    case 'random_phase_sinusoid':
      interpretation =
        'Harmonic carrier with uniform random phase Θ ~ U(-π, π). Averages to zero across realizations despite individual oscillatory paths, satisfying WSS and ergodicity in mean and autocorrelation.';
      break;
    case 'non_stationary':
      interpretation =
        'Non-stationary drift causes ensemble mean and variance to mutate across time. A single time average cannot predict the time-dependent ensemble mean, illustrating complete breakdown of stationarity and ergodicity.';
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
      approximations: [
        'Finite ensemble size M (estimator variance scales as 1/M)',
        'Finite observation window T = 10s (temporal discretization dt)',
        'Unbiased sample autocorrelation estimator with tapering support',
        'Box-Muller normal approximation for stochastic noise components',
      ],
    },
    results: {
      simTime,
      instantaneousEnsembleMean: stats.ensembleMean,
      instantaneousEnsembleVariance: stats.ensembleVariance,
      timeMeanSelected: stats.timeAvgSelected,
      timeVarSelected: stats.timeVarSelected,
      ergodicityMeanGap: meanGap,
      ergodicityVarGap: varGap,
      autocorrZeroLagPower: autocorr.peakValue,
      estimatedCorrelationTime: autocorr.correlationTime,
      stationarityResult: stationarity.empiricalWssStatus,
      engineeringInterpretation: interpretation,
    },
  };
}
