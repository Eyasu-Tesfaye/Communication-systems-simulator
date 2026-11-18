/**
 * Signal Generation Engine for Module 05: Correlation & Spectral Analysis
 * Supports real-valued deterministic and stochastic signals for continuous-time
 * approximations (CTS) and discrete-time calculations (DTS).
 *
 * Core signal types: Sinusoid, Rectangular Pulse, White Noise, Colored Noise.
 */

export type SignalType = 'sine' | 'pulse' | 'white_noise' | 'colored_noise';
export type SignalCategory = 'energy' | 'power';

export interface SinusoidParams {
  amplitude: number; // A (V)
  frequency: number; // f_0 (Hz in CTS, scaled cycles/sample in DTS)
  phase: number;     // phi (degrees, converted to radians internally)
}

export interface PulseParams {
  amplitude: number; // A (V)
  width: number;     // W (seconds in CTS, scaled samples in DTS)
  position: number;  // t_0 (seconds in CTS, scaled sample index in DTS)
}

export interface WhiteNoiseParams {
  stdDev: number;    // sigma (noise amplitude / standard deviation)
  variance?: number; // sigma^2 (noise variance)
  seed: number;      // realization seed
}

export interface ColoredNoiseParams {
  stdDev: number;      // sigma (output standard deviation)
  variance?: number;   // sigma^2 (noise variance)
  cutoffFreq?: number; // fc in Hz (digital low-pass filter 3-dB cutoff frequency)
  filterParam: number; // alpha: AR(1) pole / memory coefficient in (-0.95, 0.95)
  seed: number;        // realization seed
}

export interface UnifiedSignalConfig {
  type: SignalType;
  sine: SinusoidParams;
  pulse: PulseParams;
  whiteNoise: WhiteNoiseParams;
  coloredNoise: ColoredNoiseParams;
}

export interface GeneratedSignal {
  type: SignalType;
  category: SignalCategory;
  name: string;
  timeVector: number[];    // t or n values (full floating-point precision)
  samples: number[];       // x[n] or x(t_n)
  weights: number[];       // quadrature weights (trapezoidal [0.5, 1, ..., 1, 0.5] for CTS; all 1 for DTS)
  dt: number;              // sampling interval (seconds for CTS, 1 for DTS)
  duration: number;        // total span T = (N-1)*dt for CTS, N for DTS
  energy: number;          // total energy (trapezoidal integral for CTS, sum for DTS)
  power: number;           // time-average power (energy/T for CTS, (1/N)*sum for DTS)
  evalShifted: (lag: number) => number[];
}

/**
 * Deterministic PRNG using Mulberry32 for reproducible noise realizations
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Box-Muller transform for standard normal random numbers N(0, 1)
 */
function createGaussianRNG(seed: number): () => number {
  const rand = mulberry32(seed);
  let hasSpare = false;
  let spare = 0;

  return () => {
    if (hasSpare) {
      hasSpare = false;
      return spare;
    }
    let u = 0;
    let v = 0;
    let s = 0;
    do {
      u = rand() * 2 - 1;
      v = rand() * 2 - 1;
      s = u * u + v * v;
    } while (s >= 1 || s === 0);

    const mul = Math.sqrt((-2 * Math.log(s)) / s);
    spare = v * mul;
    hasSpare = true;
    return u * mul;
  };
}

/**
 * Generates an array of independent zero-mean, unit-variance Gaussian random variables
 */
export function generateGaussianWhiteNoise(numPoints: number, seed: number): number[] {
  const rng = createGaussianRNG(seed);
  const out = new Array(numPoints);
  for (let i = 0; i < numPoints; i++) {
    out[i] = rng();
  }
  return out;
}

/**
 * Core AR(1) filter preserving exact stationary variance targetStdDev^2:
 * y[n] = alpha * y[n-1] + sqrt(1 - alpha^2) * targetStdDev * w[n]
 */
function applyAr1Filter(
  rawWhiteNoise: number[],
  alpha: number,
  targetStdDev: number,
  warmupRng?: () => number
): number[] {
  const N = rawWhiteNoise.length;
  const clampedAlpha = Math.max(-0.95, Math.min(0.95, alpha));
  const safeStd = Math.max(0, targetStdDev);
  const innovationScale = Math.sqrt(Math.max(0, 1 - clampedAlpha * clampedAlpha));

  const output = new Array(N);
  let state = (warmupRng ? warmupRng() : rawWhiteNoise[0] || 0) * safeStd;
  for (let w = 0; w < 64; w++) {
    const innov = warmupRng ? warmupRng() : rawWhiteNoise[w % Math.max(1, N)] || 0;
    state = clampedAlpha * state + innovationScale * safeStd * innov;
  }

  for (let i = 0; i < N; i++) {
    state = clampedAlpha * state + innovationScale * safeStd * rawWhiteNoise[i];
    output[i] = state;
  }
  return output;
}

/**
 * Applies a digital single-pole lowpass filter to an input white noise sequence
 * Difference equation: y[n] = alpha * y[n-1] + sqrt(1 - alpha^2) * targetStdDev * w[n]
 * where alpha = exp(-2 * pi * cutoffFreq / sampleRate)
 */
export function filterColoredNoise(
  rawWhiteNoise: number[],
  cutoffFreq: number,
  sampleRate: number,
  targetStdDev: number,
  warmupRng?: () => number
): number[] {
  const nyquist = sampleRate / 2;
  const clampedFc = Math.max(0.01, Math.min(nyquist * 0.95, cutoffFreq));
  const alpha = Math.exp((-2 * Math.PI * clampedFc) / sampleRate);
  return applyAr1Filter(rawWhiteNoise, alpha, targetStdDev, warmupRng);
}

/**
 * Generates continuous-time approximation (CTS) signal vector
 * Time window: t in [tMin, tMax] with N = numPoints samples and dt = (tMax - tMin)/(N - 1).
 * Uses trapezoidal quadrature weights [0.5, 1, ..., 1, 0.5] so continuous integrals
 * for energy E_x and time-average power P_x = (1/T) \int x(t)^2 dt match theory without endpoint bias.
 */
export function generateCtsSignal(
  config: UnifiedSignalConfig,
  tMin: number = -3.0,
  tMax: number = 3.0,
  numPoints: number = 301
): GeneratedSignal {
  const N = Math.max(2, numPoints);
  const duration = Math.max(1e-6, tMax - tMin);
  const dt = duration / (N - 1);

  const timeVector: number[] = new Array(N);
  const weights: number[] = new Array(N);
  for (let i = 0; i < N; i++) {
    timeVector[i] = tMin + i * dt;
    weights[i] = i === 0 || i === N - 1 ? 0.5 : 1.0;
  }

  const { type, sine, pulse, whiteNoise, coloredNoise } = config;
  const samples = new Array(N).fill(0);

  let category: SignalCategory = 'power';
  let name = '';

  if (type === 'sine') {
    category = 'power';
    const f0 = Math.max(0, sine.frequency);
    const omega = 2 * Math.PI * f0;
    const phaseRad = (sine.phase * Math.PI) / 180;
    name = `Sinusoid (f₀=${f0}Hz, A=${sine.amplitude}V)`;
    for (let i = 0; i < N; i++) {
      samples[i] = sine.amplitude * Math.cos(omega * timeVector[i] + phaseRad);
    }
  } else if (type === 'pulse') {
    category = 'energy';
    const width = Math.max(0, pulse.width);
    const halfW = width / 2;
    name = `Rect Pulse (W=${width}s, t₀=${pulse.position}s)`;
    if (width > 0) {
      const eps = dt * 1e-4;
      for (let i = 0; i < N; i++) {
        const t = timeVector[i];
        // Half-open interval [t0 - W/2, t0 + W/2) ensures exact energy A^2 * W on grid multiples
        if (t >= pulse.position - halfW - eps && t < pulse.position + halfW - eps) {
          samples[i] = pulse.amplitude;
        } else {
          samples[i] = 0;
        }
      }
    }
  } else if (type === 'white_noise') {
    category = 'power';
    const safeStd = Math.max(0, whiteNoise.stdDev);
    name = `White Gaussian Noise (σ=${safeStd.toFixed(2)})`;
    const raw = generateGaussianWhiteNoise(N, whiteNoise.seed);
    for (let i = 0; i < N; i++) {
      samples[i] = safeStd * raw[i];
    }
  } else if (type === 'colored_noise') {
    category = 'power';
    const Fs = 1 / dt;
    const safeStd = Math.max(0, coloredNoise.stdDev);
    const raw = generateGaussianWhiteNoise(N, coloredNoise.seed);
    const warmupRng = createGaussianRNG(coloredNoise.seed);

    let filtered: number[];
    let alpha: number;
    let fc: number;

    if (coloredNoise.cutoffFreq !== undefined && coloredNoise.cutoffFreq > 0) {
      const nyquist = Fs / 2;
      fc = Math.max(0.05, Math.min(nyquist * 0.95, coloredNoise.cutoffFreq));
      alpha = Math.exp((-2 * Math.PI * fc) / Fs);
      filtered = applyAr1Filter(raw, alpha, safeStd, warmupRng);
    } else {
      alpha = Math.max(-0.95, Math.min(0.95, coloredNoise.filterParam));
      fc =
        alpha > 0
          ? Number(((-Fs / (2 * Math.PI)) * Math.log(Math.max(1e-4, alpha))).toFixed(2))
          : Fs / 2;
      filtered = applyAr1Filter(raw, alpha, safeStd, warmupRng);
    }

    name = `Colored Noise (fc=${fc.toFixed(1)}Hz, α=${alpha.toFixed(2)}, σ=${safeStd.toFixed(2)})`;
    for (let i = 0; i < N; i++) {
      samples[i] = filtered[i];
    }
  }

  // Trapezoidal energy and continuous time-average power
  let weightedSumSq = 0;
  for (let i = 0; i < N; i++) {
    weightedSumSq += weights[i] * samples[i] * samples[i];
  }
  const energy = weightedSumSq * dt;
  const power = energy / duration; // equals weightedSumSq / (N - 1)

  // Evaluator for delayed signal x(t - lag) with zero padding outside [tMin, tMax]
  const evalShifted = (lag: number): number[] => {
    const shifted = new Array(N).fill(0);
    const eps = dt * 1e-4;
    if (type === 'sine') {
      const f0 = Math.max(0, sine.frequency);
      const omega = 2 * Math.PI * f0;
      const phaseRad = (sine.phase * Math.PI) / 180;
      for (let i = 0; i < N; i++) {
        const delayedT = timeVector[i] - lag;
        if (delayedT >= tMin - eps && delayedT <= tMax + eps) {
          shifted[i] = sine.amplitude * Math.cos(omega * delayedT + phaseRad);
        }
      }
    } else if (type === 'pulse') {
      const width = Math.max(0, pulse.width);
      const halfW = width / 2;
      if (width > 0) {
        for (let i = 0; i < N; i++) {
          const delayedT = timeVector[i] - lag;
          if (
            delayedT >= tMin - eps &&
            delayedT <= tMax + eps &&
            delayedT >= pulse.position - halfW - eps &&
            delayedT < pulse.position + halfW - eps
          ) {
            shifted[i] = pulse.amplitude;
          }
        }
      }
    } else {
      const k = Math.round(lag / dt);
      for (let i = 0; i < N; i++) {
        const srcIdx = i - k;
        if (srcIdx >= 0 && srcIdx < N) {
          shifted[i] = samples[srcIdx];
        }
      }
    }
    return shifted;
  };

  return {
    type,
    category,
    name,
    timeVector,
    samples,
    weights,
    dt,
    duration,
    energy,
    power,
    evalShifted,
  };
}

/**
 * Generates discrete-time (DTS) signal vector
 * Index window: n in [-M, +M] or [0, N-1]
 */
export function generateDtsSignal(
  config: UnifiedSignalConfig,
  numSamples: number = 41,
  centered: boolean = true
): GeneratedSignal {
  const N = Math.max(1, numSamples);
  const timeVector: number[] = new Array(N);
  const weights: number[] = new Array(N).fill(1.0);
  const offset = centered ? -Math.floor(N / 2) : 0;
  for (let i = 0; i < N; i++) {
    timeVector[i] = offset + i;
  }

  const { type, sine, pulse, whiteNoise, coloredNoise } = config;
  const samples = new Array(N).fill(0);

  let category: SignalCategory = 'power';
  let name = '';

  if (type === 'sine') {
    category = 'power';
    const normFreq = Math.max(0, sine.frequency) / 10;
    const omega = 2 * Math.PI * normFreq;
    const phaseRad = (sine.phase * Math.PI) / 180;
    name = `Discrete Sinusoid (f₀=${normFreq.toFixed(2)} cyc/smp)`;
    for (let i = 0; i < N; i++) {
      samples[i] = sine.amplitude * Math.cos(omega * timeVector[i] + phaseRad);
    }
  } else if (type === 'pulse') {
    category = 'energy';
    const widthSamples = Math.max(0, Math.round(pulse.width * 5));
    const pos = Math.round(pulse.position * 5);
    name = `Discrete Pulse (W=${widthSamples} samples)`;
    if (widthSamples > 0) {
      const start = pos - Math.floor(widthSamples / 2);
      const end = start + widthSamples; // exact widthSamples count
      for (let i = 0; i < N; i++) {
        const n = timeVector[i];
        if (n >= start && n < end) {
          samples[i] = pulse.amplitude;
        }
      }
    }
  } else if (type === 'white_noise') {
    category = 'power';
    const safeStd = Math.max(0, whiteNoise.stdDev);
    name = `Discrete White Noise (σ=${safeStd.toFixed(2)})`;
    const raw = generateGaussianWhiteNoise(N, whiteNoise.seed);
    for (let i = 0; i < N; i++) {
      samples[i] = safeStd * raw[i];
    }
  } else if (type === 'colored_noise') {
    category = 'power';
    const safeStd = Math.max(0, coloredNoise.stdDev);
    const raw = generateGaussianWhiteNoise(N, coloredNoise.seed);
    const warmupRng = createGaussianRNG(coloredNoise.seed);

    let alpha: number;
    let fc: number;
    if (coloredNoise.cutoffFreq !== undefined && coloredNoise.cutoffFreq > 0) {
      fc = Math.max(0.05, Math.min(9.5, coloredNoise.cutoffFreq));
      alpha = Math.exp((-2 * Math.PI * fc) / 20);
    } else {
      alpha = Math.max(-0.95, Math.min(0.95, coloredNoise.filterParam));
      fc =
        alpha > 0
          ? Number(((-20 / (2 * Math.PI)) * Math.log(Math.max(1e-4, alpha))).toFixed(2))
          : 10;
    }

    name = `Discrete AR(1) Noise (α=${alpha.toFixed(2)})`;
    const filtered = applyAr1Filter(raw, alpha, safeStd, warmupRng);
    for (let i = 0; i < N; i++) {
      samples[i] = filtered[i];
    }
  }

  let sumSq = 0;
  for (let i = 0; i < N; i++) {
    sumSq += samples[i] * samples[i];
  }
  const energy = sumSq; // DTS energy: sum(x[n]^2)
  const power = sumSq / N; // DTS average power: (1/N) * sum(x[n]^2)

  const evalShifted = (lag: number): number[] => {
    const k = Math.round(lag);
    const shifted = new Array(N).fill(0);
    for (let i = 0; i < N; i++) {
      const srcIdx = i - k;
      if (srcIdx >= 0 && srcIdx < N) {
        shifted[i] = samples[srcIdx];
      }
    }
    return shifted;
  };

  return {
    type,
    category,
    name,
    timeVector,
    samples,
    weights,
    dt: 1,
    duration: N,
    energy,
    power,
    evalShifted,
  };
}
