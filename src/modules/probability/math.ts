/**
 * ProbStat Studio v2.0 - Core Mathematical & Statistical Engine
 * High-precision numerical methods, special functions, distribution evaluations,
 * sampling generators, and descriptive moment statistics.
 */

// Abramowitz & Stegun error function approximation (max error < 1.5e-7)
export function erf(x: number): number {
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

// Inverse normal CDF (Acklam rational approximation, relative error < 1.15e-9)
export function invNormalCdf(p: number, mu = 0, sigma = 1): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;

  // Coefficients in rational approximations
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q: number, r: number, x: number;

  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    x = (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }

  return mu + sigma * x;
}

// Lanczos approximation for log-gamma ln(Gamma(z))
export function logGamma(z: number): number {
  const p = [
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.138571095836526,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (z < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  }
  z -= 1;
  let x = 0.99999999999980993;
  for (let i = 0; i < p.length; i++) {
    x += p[i] / (z + i + 1);
  }
  const t = z + p.length - 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

// Log combinations ln(n! / (k! * (n-k)!)) to avoid overflow with large n
export function logComb(n: number, k: number): number {
  if (k < 0 || k > n) return -Infinity;
  if (k === 0 || k === n) return 0;
  return logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
}

// ==================== DISTRIBUTION EVALUATIONS ====================

export type CoreDistId = 'bernoulli' | 'binomial' | 'poisson' | 'uniform' | 'exponential' | 'normal';

export interface DistParamConfig {
  id: CoreDistId;
  name: string;
  isDiscrete: boolean;
  latexNotation: string;
  params: Record<string, number>;
}

// Normal Distribution
export function normalPdf(x: number, mu: number, sigma: number): number {
  const s = Math.max(1e-4, sigma);
  const exponent = -Math.pow(x - mu, 2) / (2 * s * s);
  return (1 / (s * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
}

export function normalCdf(x: number, mu: number, sigma: number): number {
  const s = Math.max(1e-4, sigma);
  return 0.5 * (1 + erf((x - mu) / (s * Math.SQRT2)));
}

// Binomial Distribution (includes Bernoulli when n=1)
export function binomialPmf(k: number, n: number, p: number): number {
  const roundedK = Math.round(k);
  if (roundedK < 0 || roundedK > n) return 0;
  if (p === 0) return roundedK === 0 ? 1 : 0;
  if (p === 1) return roundedK === n ? 1 : 0;
  const lp = logComb(n, roundedK) + roundedK * Math.log(p) + (n - roundedK) * Math.log(1 - p);
  return Math.exp(lp);
}

export function binomialCdf(k: number, n: number, p: number): number {
  const floorK = Math.floor(k);
  if (floorK < 0) return 0;
  if (floorK >= n) return 1;
  let sum = 0;
  for (let i = 0; i <= floorK; i++) {
    sum += binomialPmf(i, n, p);
  }
  return Math.min(1, Math.max(0, sum));
}

// Poisson Distribution
export function poissonPmf(k: number, lambda: number): number {
  const roundedK = Math.round(k);
  if (roundedK < 0) return 0;
  const l = Math.max(1e-4, lambda);
  const lp = roundedK * Math.log(l) - l - logGamma(roundedK + 1);
  return Math.exp(lp);
}

export function poissonCdf(k: number, lambda: number): number {
  const floorK = Math.floor(k);
  if (floorK < 0) return 0;
  let sum = 0;
  for (let i = 0; i <= floorK; i++) {
    sum += poissonPmf(i, lambda);
  }
  return Math.min(1, Math.max(0, sum));
}

// Exponential Distribution
export function exponentialPdf(x: number, lambda: number): number {
  if (x < 0) return 0;
  const l = Math.max(1e-4, lambda);
  return l * Math.exp(-l * x);
}

export function exponentialCdf(x: number, lambda: number): number {
  if (x <= 0) return 0;
  const l = Math.max(1e-4, lambda);
  return 1 - Math.exp(-l * x);
}

// Uniform Continuous Distribution
export function uniformContPdf(x: number, a: number, b: number): number {
  if (a >= b) return 0;
  return x >= a && x <= b ? 1 / (b - a) : 0;
}

export function uniformContCdf(x: number, a: number, b: number): number {
  if (a >= b) return 0;
  if (x < a) return 0;
  if (x > b) return 1;
  return (x - a) / (b - a);
}

// Uniform Discrete Distribution
export function uniformDiscPmf(k: number, a: number, b: number): number {
  const low = Math.round(Math.min(a, b));
  const high = Math.round(Math.max(a, b));
  const roundedK = Math.round(k);
  return roundedK >= low && roundedK <= high ? 1 / (high - low + 1) : 0;
}

export function uniformDiscCdf(k: number, a: number, b: number): number {
  const low = Math.round(Math.min(a, b));
  const high = Math.round(Math.max(a, b));
  const floorK = Math.floor(k);
  if (floorK < low) return 0;
  if (floorK >= high) return 1;
  return (floorK - low + 1) / (high - low + 1);
}

// ==================== SAMPLING GENERATORS ====================

export function sampleDistributionSingle(dist: CoreDistId, params: Record<string, number>, isDiscreteUniform = false): number {
  switch (dist) {
    case 'bernoulli': {
      const p = params.p ?? 0.5;
      return Math.random() < p ? 1 : 0;
    }
    case 'binomial': {
      const n = Math.round(params.n ?? 10);
      const p = params.p ?? 0.5;
      let successes = 0;
      for (let i = 0; i < n; i++) {
        if (Math.random() < p) successes++;
      }
      return successes;
    }
    case 'poisson': {
      const lambda = params.lambda ?? 4;
      // Knuth's algorithm
      const L = Math.exp(-lambda);
      let k = 0;
      let p = 1.0;
      do {
        k++;
        p *= Math.random();
      } while (p > L);
      return k - 1;
    }
    case 'uniform': {
      const a = params.a ?? 0;
      const b = params.b ?? 10;
      if (isDiscreteUniform) {
        const low = Math.round(Math.min(a, b));
        const high = Math.round(Math.max(a, b));
        return low + Math.floor(Math.random() * (high - low + 1));
      }
      return a + Math.random() * (b - a);
    }
    case 'exponential': {
      const lambda = params.lambda ?? 1;
      let u = Math.random();
      while (u <= 1e-12) u = Math.random();
      return -Math.log(u) / lambda;
    }
    case 'normal': {
      const mu = params.mu ?? 0;
      const sigma = params.sigma ?? 1;
      // Box-Muller transform
      let u1 = Math.random();
      while (u1 <= 1e-12) u1 = Math.random();
      const u2 = Math.random();
      const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
      return mu + z0 * sigma;
    }
  }
}

// ==================== DESCRIPTIVE STATS & MOMENTS ====================

export interface DescriptiveStatsResult {
  n: number;
  mean: number;
  median: number;
  q1: number;
  q3: number;
  iqr: number;
  min: number;
  max: number;
  range: number;
  sampleVariance: number;
  sampleStdDev: number;
  popVariance: number;
  popStdDev: number;
  standardError: number;
  skewness: number;
  kurtosis: number;
  modes: number[];
  outliers: number[];
  lowerFence: number;
  upperFence: number;
  sumSquares: number;
  rows: Array<{ index: number; x: number; deviation: number; deviationSq: number }>;
}

export function computeDescriptiveStats(
  numbers: number[],
  tukeyMultiplier: number = 1.5
): DescriptiveStatsResult | null {
  if (!numbers || numbers.length === 0) return null;
  const clean = numbers.filter((x) => !isNaN(x) && isFinite(x));
  if (clean.length === 0) return null;

  const n = clean.length;
  const sorted = [...clean].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[n - 1];
  const range = max - min;

  // Mean
  const sum = clean.reduce((acc, v) => acc + v, 0);
  const mean = sum / n;

  // Median (Q2)
  const getPercentile = (arr: number[], q: number) => {
    const pos = (arr.length - 1) * q;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (arr[base + 1] !== undefined) {
      return arr[base] + rest * (arr[base + 1] - arr[base]);
    }
    return arr[base];
  };

  const median = getPercentile(sorted, 0.5);
  const q1 = getPercentile(sorted, 0.25);
  const q3 = getPercentile(sorted, 0.75);
  const iqr = q3 - q1;

  // Tukey fences for outliers with adjustable multiplier
  const lowerFence = q1 - tukeyMultiplier * iqr;
  const upperFence = q3 + tukeyMultiplier * iqr;
  const outliers = sorted.filter((v) => v < lowerFence || v > upperFence);

  // Deviations & Sum of Squares
  let sumSq = 0;
  let sumCube = 0;
  let sumFourth = 0;

  const rows = clean.map((x, idx) => {
    const dev = x - mean;
    const devSq = dev * dev;
    sumSq += devSq;
    sumCube += dev * dev * dev;
    sumFourth += dev * dev * dev * dev;
    return {
      index: idx + 1,
      x,
      deviation: dev,
      deviationSq: devSq,
    };
  });

  const sumSquares = sumSq;
  const sampleVariance = n > 1 ? sumSquares / (n - 1) : 0;
  const sampleStdDev = Math.sqrt(sampleVariance);
  const popVariance = sumSquares / n;
  const popStdDev = Math.sqrt(popVariance);
  const standardError = n > 0 ? sampleStdDev / Math.sqrt(n) : 0;

  // Skewness (Fisher-Pearson coefficient)
  let skewness = 0;
  if (n > 2 && sampleStdDev > 0) {
    const m3 = sumCube / n;
    skewness = (Math.sqrt(n * (n - 1)) / (n - 2)) * (m3 / Math.pow(popStdDev, 3));
  }

  // Excess Kurtosis
  let kurtosis = 0;
  if (n > 3 && sampleVariance > 0) {
    const m4 = sumFourth / n;
    const g2 = m4 / Math.pow(popVariance, 2) - 3;
    kurtosis = ((n - 1) / ((n - 2) * (n - 3))) * ((n + 1) * g2 + 6);
  }

  // Modes
  const freqMap = new Map<number, number>();
  let maxFreq = 0;
  for (const v of clean) {
    const rounded = Math.round(v * 1000) / 1000;
    const count = (freqMap.get(rounded) || 0) + 1;
    freqMap.set(rounded, count);
    if (count > maxFreq) maxFreq = count;
  }
  const modes: number[] = [];
  if (maxFreq > 1) {
    for (const [val, count] of freqMap.entries()) {
      if (count === maxFreq) modes.push(val);
    }
  }

  return {
    n,
    mean,
    median,
    q1,
    q3,
    iqr,
    min,
    max,
    range,
    sampleVariance,
    sampleStdDev,
    popVariance,
    popStdDev,
    standardError,
    skewness,
    kurtosis,
    modes,
    outliers,
    lowerFence,
    upperFence,
    sumSquares,
    rows,
  };
}
