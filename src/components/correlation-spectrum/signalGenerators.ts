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

export interface ChannelEchoConfig {
  enabled: boolean;
  delay: number; // tau_d in seconds (CTS) or integer samples (DTS)
  gain: number;  // alpha in [0, 1]
}

export interface UnifiedSignalConfig {
  type: SignalType;
  sine: SinusoidParams;
  pulse: PulseParams;
  whiteNoise: WhiteNoiseParams;
  coloredNoise: ColoredNoiseParams;
  echo?: ChannelEchoConfig;
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

  const { type, sine, pulse, whiteNoise, coloredNoise, echo } = config;
  const baseSamples = new Array(numPoints).fill(0);

  let category: SignalCategory = 'power';
  let name = '';

  if (type === 'sine') {
    category = 'power';
    name = `Sinusoid (f₀=${sine.frequency}Hz, A=${sine.amplitude}V)`;
    const omega = 2 * Math.PI * sine.frequency;
    const phaseRad = (sine.phase * Math.PI) / 180;
    for (let i = 0; i < numPoints; i++) {
      baseSamples[i] = sine.amplitude * Math.cos(omega * timeVector[i] + phaseRad);
    }
  } else if (type === 'pulse') {
    category = 'energy';
    name = `Rect Pulse (W=${pulse.width}s, t₀=${pulse.position}s)`;
    const halfW = pulse.width / 2;
    for (let i = 0; i < numPoints; i++) {
      const dist = Math.abs(timeVector[i] - pulse.position);
      if (dist < halfW - 1e-6) {
        baseSamples[i] = pulse.amplitude;
      } else if (Math.abs(dist - halfW) <= 1e-6) {
        baseSamples[i] = pulse.amplitude * 0.5;
      } else {
        baseSamples[i] = 0;
      }
    }
  } else if (type === 'square') {
    category = 'power';
    name = `Square Wave (f₀=${sine.frequency}Hz, A=${sine.amplitude}V)`;
    const omega = 2 * Math.PI * Math.max(1e-4, sine.frequency);
    const phaseRad = (sine.phase * Math.PI) / 180;
    for (let i = 0; i < numPoints; i++) {
      const v = Math.cos(omega * timeVector[i] + phaseRad);
      baseSamples[i] = v >= 0 ? sine.amplitude : -sine.amplitude;
    }
  } else if (type === 'white_noise') {
    category = 'power';
    name = `White Gaussian Noise (σ=${whiteNoise.stdDev})`;
    const raw = generateGaussianWhiteNoise(numPoints, whiteNoise.seed);
    for (let i = 0; i < numPoints; i++) {
      baseSamples[i] = whiteNoise.stdDev * raw[i];
    }
  } else if (type === 'colored_noise') {
    category = 'power';
    const Fs = 1 / dt;
    const nyquist = Fs / 2;
    let rawFc = coloredNoise.cutoffFreq;
    let alpha = coloredNoise.filterParam;
    if (rawFc !== undefined && rawFc > 0) {
      rawFc = Math.max(0.1, Math.min(nyquist * 0.95, rawFc));
      alpha = Math.exp((-2 * Math.PI * rawFc) / Fs);
    } else {
      alpha = Math.max(-0.95, Math.min(0.95, alpha));
      rawFc = Number(((-Fs / (2 * Math.PI)) * Math.log(Math.max(1e-4, Math.abs(alpha)))).toFixed(2));
      rawFc = Math.max(0.1, Math.min(nyquist * 0.95, rawFc));
    }
    const fc = rawFc;
    alpha = Math.max(-0.95, Math.min(0.95, alpha));
    name = `Colored Noise (fc=${fc.toFixed(1)}Hz, α=${alpha.toFixed(2)}, σ=${coloredNoise.stdDev})`;

    // Decoupled generation: raw white noise + lowpass filter
    const raw = generateGaussianWhiteNoise(numPoints, coloredNoise.seed);
    const warmupRng = createGaussianRNG(coloredNoise.seed);
    const filtered = filterColoredNoise(raw, fc, Fs, coloredNoise.stdDev, warmupRng);
    for (let i = 0; i < numPoints; i++) {
      baseSamples[i] = filtered[i];
    }
  }

  // Apply Channel Echo: y(t) = x(t) + alpha * x(t - tau_d)
  const echoActive = Boolean(echo?.enabled && echo.gain > 0 && echo.delay > 0);
  const echoDelay = echoActive ? echo!.delay : 0;
  const echoGain = echoActive ? echo!.gain : 0;

  const evalBaseAtLag = (lagVal: number, zeroPadOutside: boolean): number[] => {
    const shifted = new Array(numPoints).fill(0);
    if (type === 'sine') {
      const omega = 2 * Math.PI * sine.frequency;
      const phaseRad = (sine.phase * Math.PI) / 180;
      for (let i = 0; i < numPoints; i++) {
        const delayedT = timeVector[i] - lagVal;
        if (!zeroPadOutside || (delayedT >= tMin && delayedT <= tMax)) {
          shifted[i] = sine.amplitude * Math.cos(omega * delayedT + phaseRad);
        }
      }
    } else if (type === 'square') {
      const omega = 2 * Math.PI * Math.max(1e-4, sine.frequency);
      const phaseRad = (sine.phase * Math.PI) / 180;
      for (let i = 0; i < numPoints; i++) {
        const delayedT = timeVector[i] - lagVal;
        if (!zeroPadOutside || (delayedT >= tMin && delayedT <= tMax)) {
          const v = Math.cos(omega * delayedT + phaseRad);
          shifted[i] = v >= 0 ? sine.amplitude : -sine.amplitude;
        }
      }
    } else if (type === 'pulse') {
      const halfW = pulse.width / 2;
      for (let i = 0; i < numPoints; i++) {
        const delayedT = timeVector[i] - lagVal;
        if (!zeroPadOutside || (delayedT >= tMin && delayedT <= tMax)) {
          const dist = Math.abs(delayedT - pulse.position);
          if (dist < halfW - 1e-6) {
            shifted[i] = pulse.amplitude;
          } else if (Math.abs(dist - halfW) <= 1e-6) {
            shifted[i] = pulse.amplitude * 0.5;
          }
        }
      }
    } else {
      const k = Math.round(lagVal / dt);
      for (let i = 0; i < numPoints; i++) {
        const srcIdx = i - k;
        if (srcIdx >= 0 && srcIdx < numPoints) {
          shifted[i] = baseSamples[srcIdx];
        }
      }
    }
    return shifted;
  };

  const samples = new Array(numPoints);
  if (echoActive) {
    const delayedForEcho = evalBaseAtLag(echoDelay, type === 'pulse');
    // For noise signals, fill pre-window indices [0..kDelay-1] with stationary pre-history
    if (type === 'white_noise' || type === 'colored_noise') {
      const kDelay = Math.round(echoDelay / dt);
      if (kDelay > 0) {
        const preLen = Math.min(numPoints, kDelay);
        if (type === 'white_noise') {
          const preRaw = generateGaussianWhiteNoise(preLen, whiteNoise.seed + 10007);
          for (let i = 0; i < preLen; i++) {
            delayedForEcho[i] = whiteNoise.stdDev * preRaw[i];
          }
        } else {
          const Fs = 1 / dt;
          const fc =
            coloredNoise.cutoffFreq !== undefined && coloredNoise.cutoffFreq > 0
              ? coloredNoise.cutoffFreq
              : Number(((-Fs / (2 * Math.PI)) * Math.log(Math.max(1e-4, Math.abs(coloredNoise.filterParam)))).toFixed(2));
          const preRaw = generateGaussianWhiteNoise(preLen, coloredNoise.seed + 10007);
          const preWarmup = createGaussianRNG(coloredNoise.seed + 10007);
          const preFiltered = filterColoredNoise(preRaw, fc, Fs, coloredNoise.stdDev, preWarmup);
          for (let i = 0; i < preLen; i++) {
            delayedForEcho[i] = preFiltered[i];
          }
        }
      }
    }
    for (let i = 0; i < numPoints; i++) {
      samples[i] = baseSamples[i] + echoGain * delayedForEcho[i];
    }
    name = `${name} + Echo (τd=${echoDelay.toFixed(2)}s, α=${echoGain.toFixed(2)})`;
  } else {
    for (let i = 0; i < numPoints; i++) {
      samples[i] = baseSamples[i];
    }
  }

  // Calculate actual energy and average power of generated record
  let sumSq = 0;
  for (let i = 0; i < numPoints; i++) {
    sumSq += samples[i] * samples[i];
  }
  const energy = sumSq * dt; // Integral approx: sum(x^2) * dt
  const power = sumSq / numPoints; // Time average: (1/N) * sum(x^2)

  // Evaluator function for delayed signal y(t - lag) with zero padding outside [tMin, tMax]
  const evalShifted = (lag: number): number[] => {
    if (!echoActive) {
      if (type === 'sine' || type === 'square' || type === 'pulse') {
        return evalBaseAtLag(lag, true);
      }
      const shifted = new Array(numPoints).fill(0);
      const lagSamples = lag / dt;
      for (let i = 0; i < numPoints; i++) {
        const u = i - lagSamples;
        if (u >= 0 && u <= numPoints - 1) {
          const idx0 = Math.floor(u);
          const idx1 = Math.min(numPoints - 1, idx0 + 1);
          const frac = u - idx0;
          shifted[i] = samples[idx0] * (1 - frac) + samples[idx1] * frac;
        }
      }
      return shifted;
    }
    if (type === 'sine' || type === 'square' || type === 'pulse') {
      const shifted = new Array(numPoints).fill(0);
      const primary = evalBaseAtLag(lag, type === 'pulse');
      const echoPart = evalBaseAtLag(lag + echoDelay, type === 'pulse');
      for (let i = 0; i < numPoints; i++) {
        // Zero-pad composite signal y(t - lag) outside [tMin, tMax]
        const delayedT = timeVector[i] - lag;
        if (delayedT >= tMin - 1e-9 && delayedT <= tMax + 1e-9) {
          shifted[i] = primary[i] + echoGain * echoPart[i];
        }
      }
      return shifted;
    }
    // Noise with echo: evaluate composite samples at y(t - lag) with linear interpolation for fractional lags
    const lagSamples = lag / dt;
    const shifted = new Array(numPoints).fill(0);
    for (let i = 0; i < numPoints; i++) {
      const u = i - lagSamples;
      if (u >= 0 && u <= numPoints - 1) {
        const idx0 = Math.floor(u);
        const idx1 = Math.min(numPoints - 1, idx0 + 1);
        const frac = u - idx0;
        shifted[i] = samples[idx0] * (1 - frac) + samples[idx1] * frac;
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

  const { type, sine, pulse, whiteNoise, coloredNoise, echo } = config;
  const baseSamples = new Array(numSamples).fill(0);

  let category: SignalCategory = 'power';
  let name = '';

  if (type === 'sine') {
    category = 'power';
    name = `Discrete Sinusoid (ω₀=${(2 * Math.PI * (sine.frequency / 10)).toFixed(2)} rad)`;
    // Normalized discrete frequency
    const omega = 2 * Math.PI * (sine.frequency / 10);
    const phaseRad = (sine.phase * Math.PI) / 180;
    for (let i = 0; i < numSamples; i++) {
      baseSamples[i] = sine.amplitude * Math.cos(omega * timeVector[i] + phaseRad);
    }
  } else if (type === 'square') {
    category = 'power';
    name = `Discrete Square Wave (f₀=${sine.frequency})`;
    const omega = 2 * Math.PI * (Math.max(1e-4, sine.frequency) / 10);
    const phaseRad = (sine.phase * Math.PI) / 180;
    for (let i = 0; i < numSamples; i++) {
      const v = Math.cos(omega * timeVector[i] + phaseRad);
      baseSamples[i] = v >= 0 ? sine.amplitude : -sine.amplitude;
    }
  } else if (type === 'pulse') {
    category = 'energy';
    const widthSamples = Math.max(1, Math.round(Math.abs(pulse.width) * 5));
    name = `Discrete Pulse (W=${widthSamples} samples)`;
    const pos = Math.round(pulse.position * 5);
    const leftHalf = Math.floor((widthSamples - 1) / 2);
    const rightHalf = Math.ceil((widthSamples - 1) / 2);
    for (let i = 0; i < numSamples; i++) {
      const n = timeVector[i];
      if (n >= pos - leftHalf && n <= pos + rightHalf) {
        baseSamples[i] = pulse.amplitude;
      } else {
        baseSamples[i] = 0;
      }
    }
  } else if (type === 'white_noise') {
    category = 'power';
    name = `Discrete White Noise (σ=${whiteNoise.stdDev})`;
    const raw = generateGaussianWhiteNoise(numSamples, whiteNoise.seed);
    for (let i = 0; i < numSamples; i++) {
      baseSamples[i] = whiteNoise.stdDev * raw[i];
    }
  } else if (type === 'colored_noise') {
    category = 'power';
    const dtsFs = 20;
    const nyquist = dtsFs / 2;
    let fc = coloredNoise.cutoffFreq;
    let alpha = coloredNoise.filterParam;
    if (fc !== undefined && fc > 0) {
      fc = Math.max(0.1, Math.min(nyquist * 0.95, fc));
      alpha = Math.exp((-2 * Math.PI * fc) / dtsFs); // 20 samples baseline rate
    } else {
      alpha = Math.max(-0.95, Math.min(0.95, alpha));
      fc = Number(((-dtsFs / (2 * Math.PI)) * Math.log(Math.max(1e-4, Math.abs(alpha)))).toFixed(2));
      fc = Math.max(0.1, Math.min(nyquist * 0.95, fc));
    }
    alpha = Math.max(-0.95, Math.min(0.95, alpha));
    name = `Discrete AR(1) Noise (fc=${fc.toFixed(1)}, α=${alpha.toFixed(2)})`;
    const raw = generateGaussianWhiteNoise(numSamples, coloredNoise.seed);
    const warmupRng = createGaussianRNG(coloredNoise.seed);
    const filtered = filterColoredNoise(raw, fc, dtsFs, coloredNoise.stdDev, warmupRng);
    for (let i = 0; i < numSamples; i++) {
      baseSamples[i] = filtered[i];
    }
  }

  const echoActive = Boolean(echo?.enabled && echo.gain > 0 && Math.round(echo.delay) > 0);
  const kDelay = echoActive ? Math.round(echo!.delay) : 0;
  const echoGain = echoActive ? echo!.gain : 0;

  const samples = new Array(numSamples);
  if (echoActive) {
    const delayed = new Array(numSamples).fill(0);
    if (type === 'sine') {
      const omega = 2 * Math.PI * (sine.frequency / 10);
      const phaseRad = (sine.phase * Math.PI) / 180;
      for (let i = 0; i < numSamples; i++) {
        delayed[i] = sine.amplitude * Math.cos(omega * (timeVector[i] - kDelay) + phaseRad);
      }
    } else if (type === 'square') {
      const omega = 2 * Math.PI * (Math.max(1e-4, sine.frequency) / 10);
      const phaseRad = (sine.phase * Math.PI) / 180;
      for (let i = 0; i < numSamples; i++) {
        const v = Math.cos(omega * (timeVector[i] - kDelay) + phaseRad);
        delayed[i] = v >= 0 ? sine.amplitude : -sine.amplitude;
      }
    } else if (type === 'pulse') {
      const widthSamples = Math.max(1, Math.round(Math.abs(pulse.width) * 5));
      const pos = Math.round(pulse.position * 5);
      const leftHalf = Math.floor((widthSamples - 1) / 2);
      const rightHalf = Math.ceil((widthSamples - 1) / 2);
      for (let i = 0; i < numSamples; i++) {
        const n = timeVector[i] - kDelay;
        delayed[i] = n >= pos - leftHalf && n <= pos + rightHalf ? pulse.amplitude : 0;
      }
    } else {
      for (let i = 0; i < numSamples; i++) {
        const srcIdx = i - kDelay;
        if (srcIdx >= 0 && srcIdx < numSamples) {
          delayed[i] = baseSamples[srcIdx];
        }
      }
      const preLen = Math.min(numSamples, kDelay);
      if (type === 'white_noise') {
        const preRaw = generateGaussianWhiteNoise(preLen, whiteNoise.seed + 10007);
        for (let i = 0; i < preLen; i++) {
          delayed[i] = whiteNoise.stdDev * preRaw[i];
        }
      } else {
        const fc =
          coloredNoise.cutoffFreq !== undefined && coloredNoise.cutoffFreq > 0
            ? coloredNoise.cutoffFreq
            : Number(((-20 / (2 * Math.PI)) * Math.log(Math.max(1e-4, Math.abs(coloredNoise.filterParam)))).toFixed(2));
        const preRaw = generateGaussianWhiteNoise(preLen, coloredNoise.seed + 10007);
        const preWarmup = createGaussianRNG(coloredNoise.seed + 10007);
        const preFiltered = filterColoredNoise(preRaw, fc, 20, coloredNoise.stdDev, preWarmup);
        for (let i = 0; i < preLen; i++) {
          delayed[i] = preFiltered[i];
        }
      }
    }
    for (let i = 0; i < numSamples; i++) {
      samples[i] = baseSamples[i] + echoGain * delayed[i];
    }
    name = `${name} + Echo (kd=${kDelay}, α=${echoGain.toFixed(2)})`;
  } else {
    for (let i = 0; i < numSamples; i++) {
      samples[i] = baseSamples[i];
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
