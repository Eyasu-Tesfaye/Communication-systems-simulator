/**
 * Probability & Statistics Mathematics Engine
 * Rigorous statistical calculations for discrete and continuous distributions,
 * moments, CDF, PMF/PDF, quantiles, and Monte Carlo empirical sampling.
 */

export type DistributionType =
  | 'normal'
  | 'uniform_cont'
  | 'exponential'
  | 'rayleigh'
  | 'binomial'
  | 'poisson'
  | 'geometric'
  | 'uniform_disc';

export type VariableNature = 'discrete' | 'continuous';

export interface DistributionInfo {
  id: DistributionType;
  name: string;
  shortName: string;
  nature: VariableNature;
  symbol: string;
  description: string;
  telecomUse: string;
  support: string;
  formulaPdfKaTeX: string;
  formulaCdfKaTeX: string;
  formulaMeanKaTeX: string;
  formulaVarKaTeX: string;
  defaultParams: Record<string, number>;
  paramBounds: Record<string, { min: number; max: number; step: number; label: string; symbol: string }>;
}

export const DISTRIBUTIONS: Record<DistributionType, DistributionInfo> = {
  normal: {
    id: 'normal',
    name: 'Normal (Gaussian) Distribution',
    shortName: 'Normal (Gaussian)',
    nature: 'continuous',
    symbol: '\\mathcal{N}(\\mu, \\sigma^2)',
    description: 'The fundamental continuous distribution governed by the Central Limit Theorem. Characterizes symmetric random noise and thermal fluctuations.',
    telecomUse: 'Additive White Gaussian Noise (AWGN) in RF channels, thermal electron noise in amplifiers, I/Q demodulation error.',
    support: 'x \\in (-\\infty, \\infty)',
    formulaPdfKaTeX: 'f(x) = \\frac{1}{\\sigma \\sqrt{2\\pi}} \\exp\\left( -\\frac{(x - \\mu)^2}{2\\sigma^2} \\right)',
    formulaCdfKaTeX: 'F(x) = \\frac{1}{2} \\left[ 1 + \\operatorname{erf}\\left( \\frac{x - \\mu}{\\sigma \\sqrt{2}} \\right) \\right] = 1 - Q\\left( \\frac{x - \\mu}{\\sigma} \\right)',
    formulaMeanKaTeX: '\\mathbb{E}[X] = \\mu',
    formulaVarKaTeX: '\\operatorname{Var}(X) = \\sigma^2',
    defaultParams: { mu: 0, sigma: 1 },
    paramBounds: {
      mu: { min: -5, max: 5, step: 0.1, label: 'Mean', symbol: '\\mu' },
      sigma: { min: 0.2, max: 4, step: 0.1, label: 'Std Dev', symbol: '\\sigma' },
    },
  },
  uniform_cont: {
    id: 'uniform_cont',
    name: 'Continuous Uniform Distribution',
    shortName: 'Continuous Uniform',
    nature: 'continuous',
    symbol: '\\mathcal{U}(a, b)',
    description: 'Constant probability density across interval [a, b]. Models maximum uncertainty over a bounded continuous range.',
    telecomUse: 'Analog-to-Digital Converter (ADC) quantization noise error: e[n] ~ U(-Δ/2, Δ/2), random carrier phase shift θ ~ U(-π, π).',
    support: 'x \\in [a, b]',
    formulaPdfKaTeX: 'f(x) = \\begin{cases} \\frac{1}{b - a}, & a \\le x \\le b \\\\[4pt] 0, & \\text{otherwise} \\end{cases}',
    formulaCdfKaTeX: 'F(x) = \\begin{cases} 0, & x < a \\\\[4pt] \\frac{x - a}{b - a}, & a \\le x \\le b \\\\[4pt] 1, & x > b \\end{cases}',
    formulaMeanKaTeX: '\\mathbb{E}[X] = \\frac{a + b}{2}',
    formulaVarKaTeX: '\\operatorname{Var}(X) = \\frac{(b - a)^2}{12}',
    defaultParams: { a: -2, b: 2 },
    paramBounds: {
      a: { min: -5, max: 2, step: 0.5, label: 'Lower Bound', symbol: 'a' },
      b: { min: -1, max: 5, step: 0.5, label: 'Upper Bound', symbol: 'b' },
    },
  },
  exponential: {
    id: 'exponential',
    name: 'Exponential Distribution',
    shortName: 'Exponential',
    nature: 'continuous',
    symbol: '\\operatorname{Exp}(\\lambda)',
    description: 'Models memoryless continuous time intervals between consecutive independent Poisson events occurring at constant rate λ.',
    telecomUse: 'Inter-arrival duration of data packets in router buffers, service hold times in cellular networks, component mean time between failures (MTBF).',
    support: 'x \\in [0, \\infty)',
    formulaPdfKaTeX: 'f(x) = \\lambda e^{-\\lambda x}, \\quad x \\ge 0',
    formulaCdfKaTeX: 'F(x) = 1 - e^{-\\lambda x}, \\quad x \\ge 0',
    formulaMeanKaTeX: '\\mathbb{E}[X] = \\frac{1}{\\lambda}',
    formulaVarKaTeX: '\\operatorname{Var}(X) = \\frac{1}{\\lambda^2}',
    defaultParams: { lambda: 1.0 },
    paramBounds: {
      lambda: { min: 0.1, max: 4.0, step: 0.1, label: 'Rate Parameter', symbol: '\\lambda' },
    },
  },
  rayleigh: {
    id: 'rayleigh',
    name: 'Rayleigh Distribution',
    shortName: 'Rayleigh Fading',
    nature: 'continuous',
    symbol: '\\operatorname{Rayleigh}(\\sigma)',
    description: 'Distribution of the magnitude of a 2D vector whose orthogonal components are zero-mean independent Gaussian random variables with variance σ².',
    telecomUse: 'Multipath envelope fading in Non-Line-of-Sight (NLOS) wireless channels, radar signal speckle, envelope detection of narrowband noise.',
    support: 'x \\in [0, \\infty)',
    formulaPdfKaTeX: 'f(x) = \\frac{x}{\\sigma^2} \\exp\\left( -\\frac{x^2}{2\\sigma^2} \\right), \\quad x \\ge 0',
    formulaCdfKaTeX: 'F(x) = 1 - \\exp\\left( -\\frac{x^2}{2\\sigma^2} \\right), \\quad x \\ge 0',
    formulaMeanKaTeX: '\\mathbb{E}[X] = \\sigma \\sqrt{\\frac{\\pi}{2}} \\approx 1.2533\\sigma',
    formulaVarKaTeX: '\\operatorname{Var}(X) = \\frac{4 - \\pi}{2} \\sigma^2 \\approx 0.4292\\sigma^2',
    defaultParams: { sigma: 1.0 },
    paramBounds: {
      sigma: { min: 0.2, max: 3.0, step: 0.1, label: 'Scale Parameter', symbol: '\\sigma' },
    },
  },
  binomial: {
    id: 'binomial',
    name: 'Binomial Distribution (inc. Bernoulli)',
    shortName: 'Binomial / Bernoulli',
    nature: 'discrete',
    symbol: '\\mathcal{B}(n, p)',
    description: 'Models number of successes in n independent Bernoulli trials with constant success probability p. (Bernoulli is n = 1).',
    telecomUse: 'Bit Error Rate (BER) analysis, block code transmission errors (k errors in n-bit codeword), packet loss in wireless frames.',
    support: 'k \\in \\{0, 1, 2, \\dots, n\\}',
    formulaPdfKaTeX: 'P(X = k) = \\binom{n}{k} p^k (1 - p)^{n - k}',
    formulaCdfKaTeX: 'F(k) = \\sum_{i=0}^{\\lfloor k \\rfloor} \\binom{n}{i} p^i (1 - p)^{n - i}',
    formulaMeanKaTeX: '\\mathbb{E}[X] = n p',
    formulaVarKaTeX: '\\operatorname{Var}(X) = n p (1 - p)',
    defaultParams: { n: 16, p: 0.35 },
    paramBounds: {
      n: { min: 1, max: 40, step: 1, label: 'Number of Trials', symbol: 'n' },
      p: { min: 0.01, max: 0.99, step: 0.02, label: 'Success Probability', symbol: 'p' },
    },
  },
  poisson: {
    id: 'poisson',
    name: 'Poisson Distribution',
    shortName: 'Poisson',
    nature: 'discrete',
    symbol: '\\operatorname{Pois}(\\lambda)',
    description: 'Expresses probability of a given number of events occurring in a fixed interval of time or space if events occur with known average rate λ independently.',
    telecomUse: 'Number of packet arrivals at a network switch per second, telephone call connections in cellular base station, photon arrivals in optical fiber receivers.',
    support: 'k \\in \\{0, 1, 2, 3, \\dots\\}',
    formulaPdfKaTeX: 'P(X = k) = \\frac{\\lambda^k e^{-\\lambda}}{k!}',
    formulaCdfKaTeX: 'F(k) = \\sum_{i=0}^{\\lfloor k \\rfloor} \\frac{\\lambda^i e^{-\\lambda}}{i!} = \\frac{\\Gamma(\\lfloor k \\rfloor + 1, \\lambda)}{\\lfloor k \\rfloor!}',
    formulaMeanKaTeX: '\\mathbb{E}[X] = \\lambda',
    formulaVarKaTeX: '\\operatorname{Var}(X) = \\lambda',
    defaultParams: { lambda: 5.0 },
    paramBounds: {
      lambda: { min: 0.2, max: 20.0, step: 0.2, label: 'Rate Parameter', symbol: '\\lambda' },
    },
  },
  geometric: {
    id: 'geometric',
    name: 'Geometric Distribution',
    shortName: 'Geometric',
    nature: 'discrete',
    symbol: '\\operatorname{Geom}(p)',
    description: 'Probability distribution of number of Bernoulli trials needed to achieve the first success, with constant trial success probability p.',
    telecomUse: 'Automatic Repeat reQuest (ARQ) retransmissions until packet ACK, carrier sensing collision resolution in CSMA/CA WiFi.',
    support: 'k \\in \\{1, 2, 3, \\dots\\}',
    formulaPdfKaTeX: 'P(X = k) = (1 - p)^{k - 1} p, \\quad k \\ge 1',
    formulaCdfKaTeX: 'F(k) = 1 - (1 - p)^{\\lfloor k \\rfloor}, \\quad k \\ge 1',
    formulaMeanKaTeX: '\\mathbb{E}[X] = \\frac{1}{p}',
    formulaVarKaTeX: '\\operatorname{Var}(X) = \\frac{1 - p}{p^2}',
    defaultParams: { p: 0.25 },
    paramBounds: {
      p: { min: 0.05, max: 0.95, step: 0.05, label: 'Success Probability', symbol: 'p' },
    },
  },
  uniform_disc: {
    id: 'uniform_disc',
    name: 'Discrete Uniform Distribution',
    shortName: 'Discrete Uniform',
    nature: 'discrete',
    symbol: '\\mathcal{U}\\{a, b\\}',
    description: 'Equal probability mass assigned to each integer in the finite inclusive set {a, a+1, ..., b}.',
    telecomUse: 'Random frequency hopping channel selection (FHSS), random backoff slot selection in 802.11 WiFi, discrete quantization levels.',
    support: 'k \\in \\{a, a+1, \\dots, b\\}',
    formulaPdfKaTeX: 'P(X = k) = \\frac{1}{b - a + 1}, \\quad k \\in \\{a, \\dots, b\\}',
    formulaCdfKaTeX: 'F(k) = \\frac{\\lfloor k \\rfloor - a + 1}{b - a + 1}, \\quad a \\le k \\le b',
    formulaMeanKaTeX: '\\mathbb{E}[X] = \\frac{a + b}{2}',
    formulaVarKaTeX: '\\operatorname{Var}(X) = \\frac{(b - a + 1)^2 - 1}{12}',
    defaultParams: { a: 1, b: 8 },
    paramBounds: {
      a: { min: -10, max: 5, step: 1, label: 'Min Value', symbol: 'a' },
      b: { min: 2, max: 20, step: 1, label: 'Max Value', symbol: 'b' },
    },
  },
};

// Error function approximation (Abramowitz & Stegun 7.1.26, max error < 1.5e-7)
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

// Log-gamma function (Lanczos approximation) for factorial combinations
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

export function logComb(n: number, k: number): number {
  if (k < 0 || k > n) return -Infinity;
  if (k === 0 || k === n) return 0;
  return logGamma(n + 1) - logGamma(k + 1) - logGamma(n - k + 1);
}

// Evaluate PDF (for continuous) or PMF (for discrete)
export function evaluatePdfPmf(type: DistributionType, params: Record<string, number>, x: number): number {
  switch (type) {
    case 'normal': {
      const { mu = 0, sigma = 1 } = params;
      const s = Math.max(sigma, 1e-4);
      const exponent = -Math.pow(x - mu, 2) / (2 * s * s);
      return (1 / (s * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
    }
    case 'uniform_cont': {
      const a = Math.min(params.a ?? -1, (params.b ?? 1) - 1e-3);
      const b = Math.max(params.b ?? 1, a + 1e-3);
      return x >= a && x <= b ? 1 / (b - a) : 0;
    }
    case 'exponential': {
      const lambda = Math.max(params.lambda ?? 1, 1e-4);
      return x >= 0 ? lambda * Math.exp(-lambda * x) : 0;
    }
    case 'rayleigh': {
      const sigma = Math.max(params.sigma ?? 1, 1e-4);
      if (x < 0) return 0;
      return (x / (sigma * sigma)) * Math.exp(-Math.pow(x, 2) / (2 * sigma * sigma));
    }
    case 'binomial': {
      const n = Math.round(Math.max(1, params.n ?? 10));
      const p = Math.max(0, Math.min(1, params.p ?? 0.5));
      const k = Math.round(x);
      if (k < 0 || k > n) return 0;
      if (p === 0) return k === 0 ? 1 : 0;
      if (p === 1) return k === n ? 1 : 0;
      const logP = logComb(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p);
      return Math.exp(logP);
    }
    case 'poisson': {
      const lambda = Math.max(params.lambda ?? 3, 1e-4);
      const k = Math.round(x);
      if (k < 0) return 0;
      const logP = k * Math.log(lambda) - lambda - logGamma(k + 1);
      return Math.exp(logP);
    }
    case 'geometric': {
      const p = Math.max(1e-4, Math.min(1, params.p ?? 0.3));
      const k = Math.round(x);
      if (k < 1) return 0;
      return Math.pow(1 - p, k - 1) * p;
    }
    case 'uniform_disc': {
      const a = Math.round(Math.min(params.a ?? 1, (params.b ?? 6) - 1));
      const b = Math.round(Math.max(params.b ?? 6, a + 1));
      const k = Math.round(x);
      return k >= a && k <= b ? 1 / (b - a + 1) : 0;
    }
  }
}

// Evaluate CDF F(x) = P(X <= x)
export function evaluateCdf(type: DistributionType, params: Record<string, number>, x: number): number {
  switch (type) {
    case 'normal': {
      const { mu = 0, sigma = 1 } = params;
      const s = Math.max(sigma, 1e-4);
      return 0.5 * (1 + erf((x - mu) / (s * Math.SQRT2)));
    }
    case 'uniform_cont': {
      const a = Math.min(params.a ?? -1, (params.b ?? 1) - 1e-3);
      const b = Math.max(params.b ?? 1, a + 1e-3);
      if (x < a) return 0;
      if (x > b) return 1;
      return (x - a) / (b - a);
    }
    case 'exponential': {
      const lambda = Math.max(params.lambda ?? 1, 1e-4);
      if (x <= 0) return 0;
      return 1 - Math.exp(-lambda * x);
    }
    case 'rayleigh': {
      const sigma = Math.max(params.sigma ?? 1, 1e-4);
      if (x <= 0) return 0;
      return 1 - Math.exp(-Math.pow(x, 2) / (2 * sigma * sigma));
    }
    case 'binomial': {
      const n = Math.round(Math.max(1, params.n ?? 10));
      const p = Math.max(0, Math.min(1, params.p ?? 0.5));
      const maxK = Math.floor(x);
      if (maxK < 0) return 0;
      if (maxK >= n) return 1;
      let sum = 0;
      for (let k = 0; k <= maxK; k++) {
        sum += evaluatePdfPmf('binomial', { n, p }, k);
      }
      return Math.min(1, sum);
    }
    case 'poisson': {
      const maxK = Math.floor(x);
      if (maxK < 0) return 0;
      let sum = 0;
      for (let k = 0; k <= maxK; k++) {
        sum += evaluatePdfPmf('poisson', params, k);
      }
      return Math.min(1, sum);
    }
    case 'geometric': {
      const p = Math.max(1e-4, Math.min(1, params.p ?? 0.3));
      const maxK = Math.floor(x);
      if (maxK < 1) return 0;
      return 1 - Math.pow(1 - p, maxK);
    }
    case 'uniform_disc': {
      const a = Math.round(Math.min(params.a ?? 1, (params.b ?? 6) - 1));
      const b = Math.round(Math.max(params.b ?? 6, a + 1));
      const maxK = Math.floor(x);
      if (maxK < a) return 0;
      if (maxK >= b) return 1;
      return (maxK - a + 1) / (b - a + 1);
    }
  }
}

// Statistical Moments & Properties
export interface StatisticalMoments {
  mean: number;
  variance: number;
  stdDev: number;
  skewness: number;
  kurtosis: number;
  mode: number | string;
  median: number;
  supportStr: string;
}

export function computeMoments(type: DistributionType, params: Record<string, number>): StatisticalMoments {
  switch (type) {
    case 'normal': {
      const mu = params.mu ?? 0;
      const sigma = params.sigma ?? 1;
      const variance = sigma * sigma;
      return {
        mean: mu,
        variance,
        stdDev: sigma,
        skewness: 0,
        kurtosis: 0, // excess kurtosis
        mode: mu,
        median: mu,
        supportStr: '(-∞, +∞)',
      };
    }
    case 'uniform_cont': {
      const a = Math.min(params.a ?? -1, (params.b ?? 1) - 0.01);
      const b = Math.max(params.b ?? 1, a + 0.01);
      const mean = (a + b) / 2;
      const variance = Math.pow(b - a, 2) / 12;
      return {
        mean,
        variance,
        stdDev: Math.sqrt(variance),
        skewness: 0,
        kurtosis: -1.2,
        mode: 'Any x ∈ [a, b]',
        median: mean,
        supportStr: `[${a.toFixed(1)}, ${b.toFixed(1)}]`,
      };
    }
    case 'exponential': {
      const lambda = Math.max(params.lambda ?? 1, 1e-4);
      const mean = 1 / lambda;
      const variance = 1 / (lambda * lambda);
      return {
        mean,
        variance,
        stdDev: Math.sqrt(variance),
        skewness: 2,
        kurtosis: 6,
        mode: 0,
        median: Math.LN2 / lambda,
        supportStr: '[0, +∞)',
      };
    }
    case 'rayleigh': {
      const sigma = Math.max(params.sigma ?? 1, 1e-4);
      const mean = sigma * Math.sqrt(Math.PI / 2);
      const variance = ((4 - Math.PI) / 2) * sigma * sigma;
      return {
        mean,
        variance,
        stdDev: Math.sqrt(variance),
        skewness: 0.6311,
        kurtosis: 0.2451,
        mode: sigma,
        median: sigma * Math.sqrt(2 * Math.LN2),
        supportStr: '[0, +∞)',
      };
    }
    case 'binomial': {
      const n = Math.round(Math.max(1, params.n ?? 10));
      const p = Math.max(0, Math.min(1, params.p ?? 0.5));
      const mean = n * p;
      const variance = n * p * (1 - p);
      const stdDev = Math.sqrt(variance);
      const skewness = (1 - 2 * p) / (stdDev > 0 ? stdDev : 1);
      const kurtosis = (1 - 6 * p * (1 - p)) / (variance > 0 ? variance : 1);
      const mode = Math.floor((n + 1) * p);
      return {
        mean,
        variance,
        stdDev,
        skewness,
        kurtosis,
        mode,
        median: Math.round(mean),
        supportStr: `{0, 1, ..., ${n}}`,
      };
    }
    case 'poisson': {
      const lambda = Math.max(params.lambda ?? 3, 1e-4);
      const variance = lambda;
      const stdDev = Math.sqrt(variance);
      return {
        mean: lambda,
        variance,
        stdDev,
        skewness: 1 / stdDev,
        kurtosis: 1 / lambda,
        mode: Math.floor(lambda),
        median: Math.floor(lambda + 1 / 3 - 0.02 / lambda),
        supportStr: '{0, 1, 2, ...}',
      };
    }
    case 'geometric': {
      const p = Math.max(1e-4, Math.min(1, params.p ?? 0.3));
      const mean = 1 / p;
      const variance = (1 - p) / (p * p);
      const stdDev = Math.sqrt(variance);
      return {
        mean,
        variance,
        stdDev,
        skewness: (2 - p) / Math.sqrt(1 - p),
        kurtosis: 6 + (p * p) / (1 - p),
        mode: 1,
        median: Math.ceil(-1 / Math.log2(1 - p)),
        supportStr: '{1, 2, 3, ...}',
      };
    }
    case 'uniform_disc': {
      const a = Math.round(Math.min(params.a ?? 1, (params.b ?? 6) - 1));
      const b = Math.round(Math.max(params.b ?? 6, a + 1));
      const count = b - a + 1;
      const mean = (a + b) / 2;
      const variance = (count * count - 1) / 12;
      return {
        mean,
        variance,
        stdDev: Math.sqrt(variance),
        skewness: 0,
        kurtosis: -1.2 * (1 + 2 / (count * count - 1)),
        mode: 'All equal',
        median: mean,
        supportStr: `{${a}, ..., ${b}}`,
      };
    }
  }
}

// Generate real pseudo-random numbers from given distribution (Monte Carlo)
export function sampleDistribution(type: DistributionType, params: Record<string, number>, count: number): number[] {
  const samples: number[] = new Array(count);
  switch (type) {
    case 'normal': {
      const mu = params.mu ?? 0;
      const sigma = params.sigma ?? 1;
      for (let i = 0; i < count; i += 2) {
        // Box-Muller transform
        let u1 = Math.random();
        while (u1 <= 1e-12) u1 = Math.random();
        const u2 = Math.random();
        const r = Math.sqrt(-2.0 * Math.log(u1));
        const theta = 2.0 * Math.PI * u2;
        samples[i] = mu + sigma * r * Math.cos(theta);
        if (i + 1 < count) {
          samples[i + 1] = mu + sigma * r * Math.sin(theta);
        }
      }
      break;
    }
    case 'uniform_cont': {
      const a = Math.min(params.a ?? -1, (params.b ?? 1) - 0.01);
      const b = Math.max(params.b ?? 1, a + 0.01);
      for (let i = 0; i < count; i++) {
        samples[i] = a + Math.random() * (b - a);
      }
      break;
    }
    case 'exponential': {
      const lambda = Math.max(params.lambda ?? 1, 1e-4);
      for (let i = 0; i < count; i++) {
        let u = Math.random();
        while (u <= 1e-12) u = Math.random();
        samples[i] = -Math.log(u) / lambda;
      }
      break;
    }
    case 'rayleigh': {
      const sigma = Math.max(params.sigma ?? 1, 1e-4);
      for (let i = 0; i < count; i++) {
        let u = Math.random();
        while (u <= 1e-12) u = Math.random();
        samples[i] = sigma * Math.sqrt(-2.0 * Math.log(u));
      }
      break;
    }
    case 'binomial': {
      const n = Math.round(Math.max(1, params.n ?? 10));
      const p = Math.max(0, Math.min(1, params.p ?? 0.5));
      for (let i = 0; i < count; i++) {
        let successes = 0;
        for (let j = 0; j < n; j++) {
          if (Math.random() < p) successes++;
        }
        samples[i] = successes;
      }
      break;
    }
    case 'poisson': {
      const lambda = Math.max(params.lambda ?? 3, 1e-4);
      // Knuth's algorithm
      const L = Math.exp(-lambda);
      for (let i = 0; i < count; i++) {
        let k = 0;
        let p = 1.0;
        do {
          k++;
          p *= Math.random();
        } while (p > L);
        samples[i] = k - 1;
      }
      break;
    }
    case 'geometric': {
      const p = Math.max(1e-4, Math.min(1, params.p ?? 0.3));
      for (let i = 0; i < count; i++) {
        let u = Math.random();
        while (u <= 1e-12) u = Math.random();
        samples[i] = Math.ceil(Math.log(u) / Math.log(1 - p));
      }
      break;
    }
    case 'uniform_disc': {
      const a = Math.round(Math.min(params.a ?? 1, (params.b ?? 6) - 1));
      const b = Math.round(Math.max(params.b ?? 6, a + 1));
      const range = b - a + 1;
      for (let i = 0; i < count; i++) {
        samples[i] = a + Math.floor(Math.random() * range);
      }
      break;
    }
  }
  return samples;
}

// Compute empirical sample statistics
export function computeSampleStats(samples: number[]) {
  if (!samples || samples.length === 0) return { sampleMean: 0, sampleVariance: 0, sampleStdDev: 0 };
  const n = samples.length;
  let sum = 0;
  for (let i = 0; i < n; i++) sum += samples[i];
  const sampleMean = sum / n;
  let sumSq = 0;
  for (let i = 0; i < n; i++) sumSq += Math.pow(samples[i] - sampleMean, 2);
  const sampleVariance = n > 1 ? sumSq / (n - 1) : 0;
  return {
    sampleMean,
    sampleVariance,
    sampleStdDev: Math.sqrt(sampleVariance),
  };
}
