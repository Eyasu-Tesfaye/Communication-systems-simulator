/**
 * Random Processes & Statistical Properties Engine
 * Rigorous stochastic simulation, ensemble operations, stationarity tests,
 * ergodicity evaluation, autocorrelation, PSD estimation, and distribution analysis.
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
  theoreticalPsd: string;
  theoreticalPdfName: string;
  description: string;
  telecomRelevance: string;
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
    theoreticalPsd: 'S_{XX}(f) = \\frac{N_0}{2} = \\text{const}',
    theoreticalPdfName: 'Gaussian (Normal) Distribution',
    description:
      'Uncorrelated zero-mean Gaussian random variables at every instant. Demonstrates strict and wide-sense stationarity and complete ergodicity with flat spectral power.',
    telecomRelevance:
      'Standard thermal noise in front-end RF low-noise amplifiers (LNA), ADC quantizers, and AWGN benchmark channels.',
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
    theoreticalPsd: 'S_{XX}(f) = \\begin{cases} \\frac{\\sigma^2}{2B}, & |f - f_c| \\le B \\\\ 0, & \\text{otherwise} \\end{cases}',
    theoreticalPdfName: 'Gaussian (Normal) Distribution',
    description:
      'Continuous-spectrum coloured Gaussian process filtered by a bandpass filter or synthesized by harmonic superposition (Rice method).',
    telecomRelevance:
      'Baseband filtered noise, Rayleigh and Rician channel fading envelopes, and pulse-shaped communication channels.',
  },
  random_phase_sinusoid: {
    id: 'random_phase_sinusoid',
    name: 'Random-Phase Sinusoidal Process',
    shortName: 'Random-Phase Sinusoid',
    isStationary: true,
    isWss: true,
    isSss: false,
    isErgodic: true,
    theoreticalMean: '\\mathbb{E}[X(t)] = \\int_{-\\pi}^{\\pi} \\frac{A}{2\\pi}\\cos(\\omega_0 t + \\theta) d\\theta = 0',
    theoreticalVar: '\\operatorname{Var}(X(t)) = \\frac{A^2}{2}',
    theoreticalRxx: 'R_{XX}(\\tau) = \\frac{A^2}{2} \\cos(2\\pi f_0 \\tau)',
    theoreticalPsd: 'S_{XX}(f) = \\frac{A^2}{4} [\\delta(f - f_0) + \\delta(f + f_0)]',
    theoreticalPdfName: 'Arcsine Distribution f(x) = \\frac{1}{\\pi\\sqrt{A^2 - x^2}}',
    description:
      'Harmonic signal with uniformly distributed random phase Θ ~ U(-π, π). Mean is zero and autocorrelation depends strictly on lag τ, satisfying WSS.',
    telecomRelevance:
      'Unsynchronized carrier oscillators, radar Doppler echoes, and unmodulated local oscillator phase jitter.',
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
    theoreticalPsd: 'S_{XX}(t, f) \\text{ (Time-dependent spectrum)}',
    theoreticalPdfName: 'Time-varying shifted Gaussian',
    description:
      'Process whose statistical distribution explicitly mutates over time: the ensemble mean drifts cyclically and linearly, while the variance envelope expands.',
    telecomRelevance:
      'Transient signal turn-on, battery depletion drift, Doppler frequency acceleration ramps, and non-stationary fading bursts.',
  },
};

export interface ProcessParams {
  type: ProcessType;
  realizationCount: number; // M (3 to 30)
  sampleCount: number; // N (80 to 400)
  tMax: number; // Duration T in seconds (default 10)
  amplitude: number; // Signal scale A (0.5 to 3.0)
  noiseStd: number; // Noise std dev sigma (0.1 to 1.5)
  frequency: number; // Characteristic frequency f0 in Hz (0.2 to 2.5)
  driftRate: number; // Non-stationary drift intensity (0 to 1.5)
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

// Box-Muller standard normal generator using given RNG
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
  pooledSamples: number[]; // All M * N samples
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
  // Realization phase offsets Theta_i ~ U(-pi, pi)
  const phases: number[] = new Array(M);
  // Realization DC offsets
  const dcOffsets: number[] = new Array(M);
  // For bandlimited sum of sinusoids: multi-tone parameters per realization
  const harmonicPacks: Array<Array<{ f: number; a: number; phi: number }>> = [];

  for (let i = 0; i < M; i++) {
    phases[i] = (rng() * 2 - 1) * Math.PI;
    dcOffsets[i] = (rng() - 0.5) * 0.2;

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
  const pooledSamples: number[] = [];

  for (let i = 0; i < M; i++) {
    const points: TrajectoryPoint[] = new Array(N);
    const theta_i = phases[i];
    const harmonics = harmonicPacks[i];

    for (let k = 0; k < N; k++) {
      const t = timeSteps[k];
      let val = 0;

      switch (type) {
        case 'white_noise': {
          // Pure independent AWGN at each sample instant
          val = normalSample(rng, 0, noiseStd);
          break;
        }

        case 'gaussian_bandlimited': {
          // Bandlimited Gaussian process via sum-of-sinusoids + fine perturbation
          let sumHarmonics = 0;
          for (let h = 0; h < harmonics.length; h++) {
            sumHarmonics += harmonics[h].a * Math.cos(2 * Math.PI * harmonics[h].f * t + harmonics[h].phi);
          }
          const whiteComp = normalSample(rng, 0, noiseStd * 0.5);
          val = sumHarmonics + whiteComp;
          break;
        }

        case 'random_phase_sinusoid': {
          // A * cos(2*pi*f0*t + Theta_i) + additive white noise
          const carrier = A * Math.cos(2 * Math.PI * f0 * t + theta_i);
          const noise = normalSample(rng, 0, noiseStd);
          val = carrier + noise;
          break;
        }

        case 'non_stationary': {
          // Explicit time-dependent mean drift mu(t) + time-dependent variance envelope
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
      pooledSamples.push(val);
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
    pooledSamples,
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
  timeAvgRealization1: number;
  ergodicityDelta: number; // |timeAvg - ensembleMean|
  isStationaryConsistent: boolean;
}

export function getInstantaneousStats(
  sim: EnsembleSimulationData,
  simTime: number,
  selectedRealizationIndex: number
): InstantaneousStats {
  const { timeSteps, trajectories, ensembleMean, ensembleVariance, ensembleStdDev, timeAverages } = sim;
  const N = timeSteps.length;
  const M = trajectories.length;

  // Find nearest time index
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

  const timeAvg1 = timeAverages[safeRealizationIdx] ?? 0;
  const ergodicityDelta = Math.abs(timeAvg1 - mu);

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
    timeAvgRealization1: timeAvg1,
    ergodicityDelta,
    isStationaryConsistent,
  };
}

// Compute Autocorrelation R_XX(tau) for lags tau in [-tauMax, +tauMax]
export interface AutocorrelationResult {
  lags: number[]; // Lag times in seconds
  lagIndices: number[]; // Integer lag indices -maxLag .. +maxLag
  ensembleRxx: number[]; // Average of realization autocorrelations
  primaryTrajectoryRxx: number[]; // Single-realization autocorrelation
  theoreticalRxx: number[]; // Exact mathematical curve
  peakValue: number; // R_XX(0)
  totalPower: number;
}

export function computeAutocorrelation(
  sim: EnsembleSimulationData,
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
  const primaryTrajectoryRxx: number[] = new Array(lagCount).fill(0);
  const theoreticalRxx: number[] = new Array(lagCount).fill(0);

  for (let idx = 0; idx < lagCount; idx++) {
    const m = idx - maxLag;
    lagIndices[idx] = m;
    lags[idx] = m * dt;
  }

  // Calculate sample autocorrelation for each realization using unbiased lag estimator
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
      if (i === 0) {
        primaryTrajectoryRxx[idx] = rVal;
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
        // Delta peak at tau = 0
        theoreticalRxx[idx] = Math.abs(tau) < dt * 0.8 ? sig * sig : 0;
        break;
      }
      case 'random_phase_sinusoid': {
        // (A^2 / 2) * cos(2*pi*f0*tau) + sig^2 * delta(tau)
        const carrier = (A * A) / 2 * Math.cos(2 * Math.PI * f0 * tau);
        const noise = Math.abs(tau) < dt * 0.8 ? sig * sig : 0;
        theoreticalRxx[idx] = carrier + noise;
        break;
      }
      case 'gaussian_bandlimited': {
        // Bandlimited sinc envelope * carrier
        const sinc = Math.abs(tau) < 1e-6 ? 1 : Math.sin(2 * Math.PI * f0 * tau) / (2 * Math.PI * f0 * tau);
        theoreticalRxx[idx] = (A * A * 0.5 + sig * sig) * sinc;
        break;
      }
      case 'non_stationary': {
        // In non-stationary regime, autocorrelation depends on t1 and t2, not just tau
        // We provide the empirical ensemble average as reference
        theoreticalRxx[idx] = ensembleRxx[idx];
        break;
      }
    }
  }

  const zeroIdx = maxLag;
  const peakValue = ensembleRxx[zeroIdx];
  const totalPower = peakValue;

  return {
    lags,
    lagIndices,
    ensembleRxx,
    primaryTrajectoryRxx,
    theoreticalRxx,
    peakValue,
    totalPower,
  };
}

// Compute Power Spectral Density (PSD) via Welch/Periodogram FFT
export interface PsdResult {
  frequencies: number[]; // Frequency in Hz [0, fs/2]
  ensemblePsd: number[]; // Power per Hz (Linear)
  ensemblePsdDb: number[]; // Power in dB
  theoreticalPsd: number[];
  peakFrequency: number;
  totalBandwidth: number;
}

export function computePsd(sim: EnsembleSimulationData): PsdResult {
  const { trajectories, dt, samplingFreq, params } = sim;
  const M = trajectories.length;
  const N = trajectories[0].length;

  // Use power of 2 or adequate resolution FFT length
  const nFft = 256;
  const halfFft = nFft / 2;
  const df = samplingFreq / nFft;

  const frequencies: number[] = new Array(halfFft);
  for (let k = 0; k < halfFft; k++) {
    frequencies[k] = k * df;
  }

  const ensemblePsd: number[] = new Array(halfFft).fill(0);

  // Hann window to suppress spectral leakage
  const window: number[] = new Array(N);
  let winSumSq = 0;
  for (let k = 0; k < N; k++) {
    const w = 0.5 * (1 - Math.cos((2 * Math.PI * k) / (N - 1)));
    window[k] = w;
    winSumSq += w * w;
  }

  // Periodogram calculation averaged across M realizations
  for (let i = 0; i < M; i++) {
    const x = trajectories[i].map((p, idx) => p.x * window[idx]);

    // DFT for positive frequencies
    for (let k = 0; k < halfFft; k++) {
      let re = 0;
      let im = 0;
      const omega = (2 * Math.PI * k) / nFft;

      for (let n = 0; n < N; n++) {
        const angle = omega * n;
        re += x[n] * Math.cos(angle);
        im -= x[n] * Math.sin(angle);
      }

      // Periodogram power scaling
      const power = (re * re + im * im) / (samplingFreq * winSumSq);
      ensemblePsd[k] += power / M;
    }
  }

  // dB scale with safety floor
  const ensemblePsdDb: number[] = ensemblePsd.map((p) =>
    10 * Math.log10(Math.max(1e-9, p))
  );

  // Theoretical PSD shape
  const theoreticalPsd: number[] = new Array(halfFft).fill(0);
  const A = params.amplitude;
  const f0 = params.frequency;
  const sig = params.noiseStd;

  for (let k = 0; k < halfFft; k++) {
    const f = frequencies[k];
    switch (params.type) {
      case 'white_noise': {
        theoreticalPsd[k] = (sig * sig) / (samplingFreq / 2);
        break;
      }
      case 'random_phase_sinusoid': {
        // Gaussian spectral peak at f0 + noise floor
        const delta = Math.abs(f - f0);
        const impulseShape = ((A * A) / 4) * Math.exp(-(delta * delta) / (2 * (df * 1.5) * (df * 1.5))) / (df * Math.sqrt(2 * Math.PI));
        const noiseFloor = (sig * sig) / (samplingFreq / 2);
        theoreticalPsd[k] = impulseShape + noiseFloor;
        break;
      }
      case 'gaussian_bandlimited': {
        const bandwidth = f0 * 1.8;
        const inBand = f <= bandwidth ? (A * A * 0.5) / bandwidth : 0;
        theoreticalPsd[k] = inBand + (sig * sig) / (samplingFreq / 2);
        break;
      }
      case 'non_stationary': {
        theoreticalPsd[k] = ensemblePsd[k];
        break;
      }
    }
  }

  // Find peak frequency
  let maxP = -Infinity;
  let peakFreq = 0;
  for (let k = 1; k < halfFft; k++) {
    if (ensemblePsd[k] > maxP) {
      maxP = ensemblePsd[k];
      peakFreq = frequencies[k];
    }
  }

  return {
    frequencies,
    ensemblePsd,
    ensemblePsdDb,
    theoreticalPsd,
    peakFrequency: peakFreq,
    totalBandwidth: samplingFreq / 2,
  };
}

// Compute Empirical Histogram & Distribution Analysis (ProbStat integration)
export interface HistogramBin {
  x0: number;
  x1: number;
  center: number;
  count: number;
  density: number;
}

export interface DistributionAnalysisData {
  sampleCount: number;
  mean: number;
  variance: number;
  stdDev: number;
  skewness: number;
  kurtosis: number;
  min: number;
  max: number;
  median: number;
  iqr: number;
  bins: HistogramBin[];
  kdePoints: Array<{ x: number; y: number }>;
  analyticalPdf: Array<{ x: number; y: number }>;
  empiricalCdf: Array<{ x: number; y: number }>;
  analyticalCdf: Array<{ x: number; y: number }>;
}

export function computeDistributionAnalysis(
  samples: number[],
  processType: ProcessType,
  params: ProcessParams,
  binCount: number = 24
): DistributionAnalysisData {
  const clean = samples.filter((v) => !isNaN(v) && isFinite(v));
  const n = clean.length;
  if (n === 0) {
    return {
      sampleCount: 0,
      mean: 0,
      variance: 0,
      stdDev: 0,
      skewness: 0,
      kurtosis: 0,
      min: 0,
      max: 0,
      median: 0,
      iqr: 0,
      bins: [],
      kdePoints: [],
      analyticalPdf: [],
      empiricalCdf: [],
      analyticalCdf: [],
    };
  }

  const sorted = [...clean].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[n - 1];

  // Moments
  let sum = 0;
  for (let i = 0; i < n; i++) sum += sorted[i];
  const mean = sum / n;

  let sumSq = 0;
  let sumCube = 0;
  let sumFourth = 0;
  for (let i = 0; i < n; i++) {
    const dev = sorted[i] - mean;
    const d2 = dev * dev;
    sumSq += d2;
    sumCube += d2 * dev;
    sumFourth += d2 * d2;
  }

  const variance = n > 1 ? sumSq / (n - 1) : 0;
  const stdDev = Math.sqrt(variance);

  let skewness = 0;
  if (n > 2 && stdDev > 1e-6) {
    const m3 = sumCube / n;
    skewness = m3 / Math.pow(stdDev, 3);
  }

  let kurtosis = 0;
  if (n > 3 && variance > 1e-6) {
    const m4 = sumFourth / n;
    kurtosis = m4 / Math.pow(variance, 2) - 3; // Excess kurtosis
  }

  const median = sorted[Math.floor(n * 0.5)];
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;

  // Bins
  const padding = (max - min) * 0.05 || 0.5;
  const xMin = min - padding;
  const xMax = max + padding;
  const binWidth = (xMax - xMin) / binCount;

  const bins: HistogramBin[] = [];
  for (let b = 0; b < binCount; b++) {
    const x0 = xMin + b * binWidth;
    const x1 = x0 + binWidth;
    bins.push({
      x0,
      x1,
      center: (x0 + x1) / 2,
      count: 0,
      density: 0,
    });
  }

  for (let i = 0; i < n; i++) {
    const val = sorted[i];
    const bIdx = Math.min(binCount - 1, Math.max(0, Math.floor((val - xMin) / binWidth)));
    bins[bIdx].count++;
  }

  for (let b = 0; b < binCount; b++) {
    bins[b].density = bins[b].count / (n * binWidth);
  }

  // Gaussian Kernel Density Estimation (Silverman's rule of thumb bandwidth)
  const bandwidth = Math.max(0.08, 1.06 * stdDev * Math.pow(n, -0.2));
  const numGrid = 100;
  const kdePoints: Array<{ x: number; y: number }> = [];

  for (let g = 0; g <= numGrid; g++) {
    const x = xMin + (g / numGrid) * (xMax - xMin);
    let kdeSum = 0;
    for (let i = 0; i < n; i++) {
      const u = (x - sorted[i]) / bandwidth;
      kdeSum += Math.exp(-0.5 * u * u);
    }
    const y = kdeSum / (n * bandwidth * Math.sqrt(2 * Math.PI));
    kdePoints.push({ x, y });
  }

  // Analytical PDF & CDF
  const analyticalPdf: Array<{ x: number; y: number }> = [];
  const analyticalCdf: Array<{ x: number; y: number }> = [];
  const A = params.amplitude;
  const s = Math.max(0.05, stdDev);

  for (let g = 0; g <= numGrid; g++) {
    const x = xMin + (g / numGrid) * (xMax - xMin);
    let pdfVal = 0;
    let cdfVal = 0;

    if (processType === 'random_phase_sinusoid') {
      // Arcsine distribution f(x) = 1 / (pi * sqrt(A^2 - x^2)) for |x| < A convolved with noise
      if (Math.abs(x) < A * 0.98) {
        pdfVal = 1 / (Math.PI * Math.sqrt(Math.max(1e-4, A * A - x * x)));
      } else {
        pdfVal = 1 / (Math.PI * Math.sqrt(Math.max(1e-4, A * A - (A * 0.98) * (A * 0.98)))) * Math.exp(-Math.pow(Math.abs(x) - A, 2) / (2 * s * s));
      }
      // Analytical CDF of Arcsine distribution
      if (x <= -A) cdfVal = 0;
      else if (x >= A) cdfVal = 1;
      else cdfVal = 0.5 + Math.asin(x / A) / Math.PI;
    } else {
      // Gaussian distribution for AWGN, bandlimited Gaussian, and general processes
      const z = (x - mean) / s;
      pdfVal = (1 / (s * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z);
      // Normal CDF via error function approximation
      cdfVal = 0.5 * (1 + approxErf(z / Math.SQRT2));
    }

    analyticalPdf.push({ x, y: pdfVal });
    analyticalCdf.push({ x, y: Math.max(0, Math.min(1, cdfVal)) });
  }

  // Empirical CDF points
  const empiricalCdf: Array<{ x: number; y: number }> = [];
  const cdfStep = Math.max(1, Math.floor(n / 60));
  for (let i = 0; i < n; i += cdfStep) {
    empiricalCdf.push({ x: sorted[i], y: (i + 1) / n });
  }
  empiricalCdf.push({ x: sorted[n - 1], y: 1.0 });

  return {
    sampleCount: n,
    mean,
    variance,
    stdDev,
    skewness,
    kurtosis,
    min,
    max,
    median,
    iqr,
    bins,
    kdePoints,
    analyticalPdf,
    empiricalCdf,
    analyticalCdf,
  };
}

// Polynomial error function approximation (Abramowitz & Stegun)
function approxErf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  const absX = Math.abs(x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1.0 / (1.0 + p * absX);
  const y = 1.0 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) * Math.exp(-absX * absX);
  return sign * y;
}
