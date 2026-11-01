/**
 * Signal Generation Engine for Module 07: Correlation & Spectral Analysis
 * Supports real-valued deterministic and stochastic signals for continuous-time
 * approximations (CTS) and discrete-time calculations (DTS).
 */

export type SignalType = 'sine' | 'pulse' | 'square' | 'white_noise' | 'colored_noise';
export type SignalCategory = 'energy' | 'power';

export interface SinusoidParams {
  amplitude: number; // A (V)
  frequency: number; // f_0 (Hz in CTS, cycles/sample in DTS)
  phase: number;     // phi (degrees, converted to radians internally)
}

export interface PulseParams {
  amplitude: number;  // A (V)
  width: number;      // W (seconds in CTS, integer samples in DTS)
  position: number;   // t_0 (seconds in CTS, sample index n_0 in DTS)
}

export interface WhiteNoiseParams {
  stdDev: number;     // sigma (noise amplitude / standard deviation)
  variance?: number;  // sigma^2 (noise variance)
  seed: number;       // realization seed
}

export interface ColoredNoiseParams {
  stdDev: number;      // sigma (output standard deviation)
  variance?: number;   // sigma^2 (noise variance)
  cutoffFreq?: number; // fc in Hz (digital low-pass filter 3-dB cutoff frequency)
  filterParam: number; // alpha: AR(1) pole / lowpass memory coefficient in (-0.95, 0.95)
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
  timeVector: number[];    // t or n values
  samples: number[];       // x[n] or x(t_n)
  dt: number;              // sampling interval (seconds or 1 for DTS)
  duration: number;        // total duration
  energy: number;          // total energy (integral for CTS, sum for DTS)
  power: number;           // average power
  // Function to evaluate the signal shifted by lag tau: y(t - tau) with zero padding outside window
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
 * Box-Muller transform for standard normal random numbers
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
 * Applies a digital single-pole lowpass filter to an input white noise sequence
 * Difference equation: y[n] = alpha * y[n-1] + sqrt(1 - alpha^2) * targetStdDev * w[n]
 * where alpha = exp(-2 * pi * cutoffFreq / sampleRate)
 * preserves stationary variance = targetStdDev^2
 */
export function filterColoredNoise(
  rawWhiteNoise: number[],
  cutoffFreq: number,
  sampleRate: number,
  targetStdDev: number,
  warmupRng?: () => number
): number[] {
  const N = rawWhiteNoise.length;
  const nyquist = sampleRate / 2;
  const clampedFc = Math.max(0.1, Math.min(nyquist * 0.95, cutoffFreq));
  const alpha = Math.exp((-2 * Math.PI * clampedFc) / sampleRate);
  const innovationScale = Math.sqrt(Math.max(0.001, 1 - alpha * alpha));

  const output = new Array(N);
  // Stationary warm-up to reach steady-state variance
  let state = (warmupRng ? warmupRng() : rawWhiteNoise[0]) * targetStdDev;
  for (let w = 0; w < 60; w++) {
    const innov = warmupRng ? warmupRng() : rawWhiteNoise[w % N];
    state = alpha * state + innovationScale * targetStdDev * innov;
  }

  for (let i = 0; i < N; i++) {
    state = alpha * state + innovationScale * targetStdDev * rawWhiteNoise[i];
    output[i] = state;
  }
  return output;
}

/**
 * Generates continuous-time approximation (CTS) signal vector
 * Time window: t in [-T/2, +T/2]
 */
export function generateCtsSignal(
  config: UnifiedSignalConfig,
  tMin: number = -3.0,
  tMax: number = 3.0,
  numPoints: number = 301
): GeneratedSignal {
  const dt = (tMax - tMin) / (numPoints - 1);
  const timeVector: number[] = new Array(numPoints);
  for (let i = 0; i < numPoints; i++) {
    timeVector[i] = Number((tMin + i * dt).toFixed(4));
  }

  const { type, sine, pulse, whiteNoise, coloredNoise } = config;
  const samples = new Array(numPoints).fill(0);

  let category: SignalCategory = 'power';
  let name = '';

  if (type === 'sine') {
    category = 'power';
    name = `Sinusoid (f₀=${sine.frequency}Hz, A=${sine.amplitude}V)`;
    const omega = 2 * Math.PI * sine.frequency;
    const phaseRad = (sine.phase * Math.PI) / 180;
    for (let i = 0; i < numPoints; i++) {
      samples[i] = sine.amplitude * Math.cos(omega * timeVector[i] + phaseRad);
    }
  } else if (type === 'pulse') {
    category = 'energy';
    name = `Rect Pulse (W=${pulse.width}s, t₀=${pulse.position}s)`;
    const halfW = pulse.width / 2;
    for (let i = 0; i < numPoints; i++) {
      const dist = Math.abs(timeVector[i] - pulse.position);
      if (dist < halfW - 1e-6) {
        samples[i] = pulse.amplitude;
      } else if (Math.abs(dist - halfW) <= 1e-6) {
        samples[i] = pulse.amplitude * 0.5;
      } else {
        samples[i] = 0;
      }
    }
  } else if (type === 'square') {
    category = 'power';
    name = `Square Wave (f₀=${sine.frequency}Hz, A=${sine.amplitude}V)`;
    const omega = 2 * Math.PI * Math.max(1e-4, sine.frequency);
    const phaseRad = (sine.phase * Math.PI) / 180;
    for (let i = 0; i < numPoints; i++) {
      const v = Math.cos(omega * timeVector[i] + phaseRad);
      samples[i] = v >= 0 ? sine.amplitude : -sine.amplitude;
    }
  } else if (type === 'white_noise') {
    category = 'power';
    name = `White Gaussian Noise (σ=${whiteNoise.stdDev})`;
    const raw = generateGaussianWhiteNoise(numPoints, whiteNoise.seed);
    for (let i = 0; i < numPoints; i++) {
      samples[i] = whiteNoise.stdDev * raw[i];
    }
  } else if (type === 'colored_noise') {
    category = 'power';
    const Fs = 1 / dt;
    let fc = coloredNoise.cutoffFreq;
    let alpha = coloredNoise.filterParam;
    if (fc !== undefined && fc > 0) {
      alpha = Math.exp((-2 * Math.PI * fc) / Fs);
    } else {
      fc = Number(((-Fs / (2 * Math.PI)) * Math.log(Math.max(1e-4, Math.abs(alpha)))).toFixed(2));
    }
    alpha = Math.max(-0.95, Math.min(0.95, alpha));
    name = `Colored Noise (fc=${fc.toFixed(1)}Hz, α=${alpha.toFixed(2)}, σ=${coloredNoise.stdDev})`;

    // Decoupled generation: raw white noise + lowpass filter
    const raw = generateGaussianWhiteNoise(numPoints, coloredNoise.seed);
    const warmupRng = createGaussianRNG(coloredNoise.seed);
    const filtered = filterColoredNoise(raw, fc, Fs, coloredNoise.stdDev, warmupRng);
    for (let i = 0; i < numPoints; i++) {
      samples[i] = filtered[i];
    }
  }

  // Calculate actual energy and average power of generated record
  let sumSq = 0;
  for (let i = 0; i < numPoints; i++) {
    sumSq += samples[i] * samples[i];
  }
  const energy = sumSq * dt; // Integral approx: sum(x^2) * dt
  const power = sumSq / numPoints; // Time average: (1/N) * sum(x^2)

  // Evaluator function for delayed signal x(t - lag) with zero padding outside [tMin, tMax]
  const evalShifted = (lag: number): number[] => {
    const shifted = new Array(numPoints).fill(0);
    // For each point t_i in timeVector, we need the value of the signal at t_i - lag.
    if (type === 'sine') {
      const omega = 2 * Math.PI * sine.frequency;
      const phaseRad = (sine.phase * Math.PI) / 180;
      for (let i = 0; i < numPoints; i++) {
        const delayedT = timeVector[i] - lag;
        if (delayedT >= tMin && delayedT <= tMax) {
          shifted[i] = sine.amplitude * Math.cos(omega * delayedT + phaseRad);
        } else {
          shifted[i] = 0; // zero-padded outside finite observation interval
        }
      }
    } else if (type === 'square') {
      const omega = 2 * Math.PI * Math.max(1e-4, sine.frequency);
      const phaseRad = (sine.phase * Math.PI) / 180;
      for (let i = 0; i < numPoints; i++) {
        const delayedT = timeVector[i] - lag;
        if (delayedT >= tMin && delayedT <= tMax) {
          const v = Math.cos(omega * delayedT + phaseRad);
          shifted[i] = v >= 0 ? sine.amplitude : -sine.amplitude;
        } else {
          shifted[i] = 0;
        }
      }
    } else if (type === 'pulse') {
      const halfW = pulse.width / 2;
      for (let i = 0; i < numPoints; i++) {
        const delayedT = timeVector[i] - lag;
        if (delayedT >= tMin && delayedT <= tMax) {
          if (Math.abs(delayedT - pulse.position) <= halfW) {
            shifted[i] = pulse.amplitude;
          } else {
            shifted[i] = 0;
          }
        } else {
          shifted[i] = 0;
        }
      }
    } else {
      // Noise: shift array by k = round(lag / dt) samples
      const k = Math.round(lag / dt);
      for (let i = 0; i < numPoints; i++) {
        const srcIdx = i - k;
        if (srcIdx >= 0 && srcIdx < numPoints) {
          shifted[i] = samples[srcIdx];
        } else {
          shifted[i] = 0;
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
    dt,
    duration: tMax - tMin,
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
  numSamples: number = 41, // e.g. -20 to +20
  centered: boolean = true
): GeneratedSignal {
  const timeVector: number[] = new Array(numSamples);
  const offset = centered ? -Math.floor(numSamples / 2) : 0;
  for (let i = 0; i < numSamples; i++) {
    timeVector[i] = offset + i;
  }

  const { type, sine, pulse, whiteNoise, coloredNoise } = config;
  const samples = new Array(numSamples).fill(0);

  let category: SignalCategory = 'power';
  let name = '';

  if (type === 'sine') {
    category = 'power';
    name = `Discrete Sinusoid (ω₀=${(2 * Math.PI * (sine.frequency / 10)).toFixed(2)} rad)`;
    // Normalized discrete frequency
    const omega = 2 * Math.PI * (sine.frequency / 10);
    const phaseRad = (sine.phase * Math.PI) / 180;
    for (let i = 0; i < numSamples; i++) {
      samples[i] = sine.amplitude * Math.cos(omega * timeVector[i] + phaseRad);
    }
  } else if (type === 'square') {
    category = 'power';
    name = `Discrete Square Wave (f₀=${sine.frequency})`;
    const omega = 2 * Math.PI * (Math.max(1e-4, sine.frequency) / 10);
    const phaseRad = (sine.phase * Math.PI) / 180;
    for (let i = 0; i < numSamples; i++) {
      const v = Math.cos(omega * timeVector[i] + phaseRad);
      samples[i] = v >= 0 ? sine.amplitude : -sine.amplitude;
    }
  } else if (type === 'pulse') {
    category = 'energy';
    name = `Discrete Pulse (W=${Math.round(pulse.width * 5)} samples)`;
    const halfW = Math.round((pulse.width * 5) / 2);
    const pos = Math.round(pulse.position * 5);
    for (let i = 0; i < numSamples; i++) {
      const n = timeVector[i];
      if (Math.abs(n - pos) <= halfW) {
        samples[i] = pulse.amplitude;
      } else {
        samples[i] = 0;
      }
    }
  } else if (type === 'white_noise') {
    category = 'power';
    name = `Discrete White Noise (σ=${whiteNoise.stdDev})`;
    const raw = generateGaussianWhiteNoise(numSamples, whiteNoise.seed);
    for (let i = 0; i < numSamples; i++) {
      samples[i] = whiteNoise.stdDev * raw[i];
    }
  } else if (type === 'colored_noise') {
    category = 'power';
    const Fs = 1; // normalized sample rate in DTS
    let fc = coloredNoise.cutoffFreq;
    let alpha = coloredNoise.filterParam;
    if (fc !== undefined && fc > 0) {
      alpha = Math.exp((-2 * Math.PI * fc) / 20); // 20 samples baseline rate
    } else {
      fc = Number(((-20 / (2 * Math.PI)) * Math.log(Math.max(1e-4, Math.abs(alpha)))).toFixed(2));
    }
    alpha = Math.max(-0.95, Math.min(0.95, alpha));
    name = `Discrete AR(1) Noise (fc=${fc.toFixed(1)}, α=${alpha.toFixed(2)})`;
    const raw = generateGaussianWhiteNoise(numSamples, coloredNoise.seed);
    const warmupRng = createGaussianRNG(coloredNoise.seed);
    const filtered = filterColoredNoise(raw, fc, 20, coloredNoise.stdDev, warmupRng);
    for (let i = 0; i < numSamples; i++) {
      samples[i] = filtered[i];
    }
  }

  let sumSq = 0;
  for (let i = 0; i < numSamples; i++) {
    sumSq += samples[i] * samples[i];
  }
  const energy = sumSq; // DTS energy: sum(x[n]^2)
  const power = sumSq / numSamples; // DTS average power: (1/N) * sum(x[n]^2)

  const evalShifted = (lag: number): number[] => {
    const k = Math.round(lag);
    const shifted = new Array(numSamples).fill(0);
    for (let i = 0; i < numSamples; i++) {
      const srcIdx = i - k;
      if (srcIdx >= 0 && srcIdx < numSamples) {
        shifted[i] = samples[srcIdx];
      } else {
        shifted[i] = 0;
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
    dt: 1,
    duration: numSamples,
    energy,
    power,
    evalShifted,
  };
}
