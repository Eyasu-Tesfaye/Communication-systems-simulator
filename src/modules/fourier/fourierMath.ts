/**
 * Fourier Mathematics & Complex Phasor Engine
 * - Complex numbers & head-to-tail epicycles (c_n * e^(j * n * omega_0 * t))
 * - Discrete Fourier Transform (DFT) for 2D closed polygon path reconstruction
 * - True sharp polygon presets (Star, Square, Triangle, Heart, Trefoil, Fourier script)
 * - Continuous Fourier Transform (CTFT) for foundational signals:
 *   Impulse, Unit Step, Cosine, Sine, Ramp, Rectangular Gate
 */

export interface Complex {
  re: number;
  im: number;
}

export interface Phasor {
  freq: number; // Harmonic multiplier n (-N .. +N)
  amp: number; // |c_n| (radius of circle)
  phase: number; // arg(c_n)
  re: number;
  im: number;
}

export interface Point2D {
  x: number;
  y: number;
}

// Complex arithmetic
export function complexAdd(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im };
}

export function complexMultiply(a: Complex, b: Complex): Complex {
  return {
    re: a.re * b.re - a.im * b.im,
    im: a.re * b.im + a.im * b.re,
  };
}

// Compute Discrete Fourier Transform of arbitrary 2D path
export function computeDFT2D(points: Point2D[], maxHarmonics: number = 60): Phasor[] {
  const K = points.length;
  if (K === 0) return [];

  const phasors: Phasor[] = [];
  const limit = Math.min(maxHarmonics, Math.floor((K - 1) / 2));

  // Compute c_n for n from -limit to +limit
  for (let n = -limit; n <= limit; n++) {
    let sumRe = 0;
    let sumIm = 0;

    for (let k = 0; k < K; k++) {
      const phi = (2 * Math.PI * n * k) / K;
      const cosP = Math.cos(phi);
      const sinP = Math.sin(phi);

      sumRe += points[k].x * cosP + points[k].y * sinP;
      sumIm += points[k].y * cosP - points[k].x * sinP;
    }

    const re = sumRe / K;
    const im = sumIm / K;
    const amp = Math.sqrt(re * re + im * im);
    const phase = Math.atan2(im, re);

    phasors.push({ freq: n, amp, phase, re, im });
  }

  return phasors;
}

// Re-sample points along path to uniform spacing
export function resamplePath(points: Point2D[], targetCount: number = 280): Point2D[] {
  if (points.length < 2) return points;

  // Calculate cumulative distances
  const dists: number[] = [0];
  let totalDist = 0;

  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x;
    const dy = points[i].y - points[i - 1].y;
    totalDist += Math.sqrt(dx * dx + dy * dy);
    dists.push(totalDist);
  }

  if (totalDist === 0) return points;

  const resampled: Point2D[] = [];
  const step = totalDist / targetCount;

  let currentOrigIdx = 0;
  for (let i = 0; i < targetCount; i++) {
    const targetDist = i * step;

    while (
      currentOrigIdx < dists.length - 1 &&
      dists[currentOrigIdx + 1] < targetDist
    ) {
      currentOrigIdx++;
    }

    if (currentOrigIdx >= points.length - 1) {
      resampled.push(points[points.length - 1]);
    } else {
      const segStartDist = dists[currentOrigIdx];
      const segEndDist = dists[currentOrigIdx + 1];
      const segLen = segEndDist - segStartDist;
      const frac = segLen > 0 ? (targetDist - segStartDist) / segLen : 0;

      const p0 = points[currentOrigIdx];
      const p1 = points[currentOrigIdx + 1];

      resampled.push({
        x: p0.x + frac * (p1.x - p0.x),
        y: p0.y + frac * (p1.y - p0.y),
      });
    }
  }

  return resampled;
}

// ----------------------------------------------------
// True Sharp Polygon Presets (Infinite Fourier Spectrum)
// ----------------------------------------------------

// 1. Sharp 5-Point Star Polygon (10 vertices with straight edges)
export function generateStarPreset(N: number = 280): Point2D[] {
  const outerR = 140;
  const innerR = 46;
  const numPoints = 5;
  const vertices: Point2D[] = [];

  for (let k = 0; k < numPoints * 2; k++) {
    const r = k % 2 === 0 ? outerR : innerR;
    const theta = (k * Math.PI) / numPoints - Math.PI / 2;
    vertices.push({
      x: r * Math.cos(theta),
      y: r * Math.sin(theta),
    });
  }
  vertices.push(vertices[0]); // close loop
  return resamplePath(vertices, N);
}

// 2. Sharp 2D Square Polygon (4 straight edges, 90-degree corners)
export function generateSquarePreset(N: number = 280): Point2D[] {
  const S = 105;
  const vertices: Point2D[] = [
    { x: -S, y: -S },
    { x: S, y: -S },
    { x: S, y: S },
    { x: -S, y: S },
    { x: -S, y: -S },
  ];
  return resamplePath(vertices, N);
}

// 3. Sharp Equilateral Triangle Polygon (3 sharp vertices)
export function generateTrianglePreset(N: number = 280): Point2D[] {
  const R = 135;
  const vertices: Point2D[] = [
    { x: 0, y: -R },
    { x: R * Math.cos(Math.PI / 6), y: R * Math.sin(Math.PI / 6) },
    { x: -R * Math.cos(Math.PI / 6), y: R * Math.sin(Math.PI / 6) },
    { x: 0, y: -R },
  ];
  return resamplePath(vertices, N);
}

// 4. Sharp Geometric Heart with deep inner V-notch & sharp bottom tip
export function generateHeartPreset(N: number = 280): Point2D[] {
  const vertices: Point2D[] = [
    { x: 0, y: -30 }, // Deep sharp V-notch
    { x: 45, y: -95 },
    { x: 95, y: -90 },
    { x: 125, y: -50 },
    { x: 120, y: 0 },
    { x: 90, y: 45 },
    { x: 0, y: 135 }, // Sharp bottom tip
    { x: -90, y: 45 },
    { x: -120, y: 0 },
    { x: -125, y: -50 },
    { x: -95, y: -90 },
    { x: -45, y: -95 },
    { x: 0, y: -30 }, // Close at notch
  ];
  return resamplePath(vertices, N);
}

// 5. Trefoil Knot / Multi-lobed Polygon
export function generateTrefoilPreset(N: number = 280): Point2D[] {
  const pts: Point2D[] = [];
  for (let i = 0; i < N; i++) {
    const t = (i / N) * 2 * Math.PI;
    // Harmonic superposition with distinct higher frequencies
    const r = 90 * (1 + 0.45 * Math.cos(3 * t) - 0.25 * Math.cos(6 * t) + 0.15 * Math.cos(9 * t));
    const x = r * Math.cos(t);
    const y = r * Math.sin(t);
    pts.push({ x, y });
  }
  return pts;
}

// 6. Fourier Script Glyph 'F' (Multi-segment serif contour)
export function generateFourierGlyphPreset(N: number = 280): Point2D[] {
  const vertices: Point2D[] = [
    { x: -50, y: -120 },
    { x: 60, y: -120 },
    { x: 60, y: -95 },
    { x: -15, y: -95 },
    { x: -15, y: -20 },
    { x: 40, y: -20 },
    { x: 40, y: 5 },
    { x: -15, y: 5 },
    { x: -15, y: 100 },
    { x: 15, y: 100 },
    { x: 15, y: 120 },
    { x: -50, y: 120 },
    { x: -50, y: 100 },
    { x: -35, y: 100 },
    { x: -35, y: -95 },
    { x: -50, y: -95 },
    { x: -50, y: -120 },
  ];
  return resamplePath(vertices, N);
}

// ----------------------------------------------------
// Continuous Fourier Transform (CTFT) Foundational Signals
// ----------------------------------------------------

export type TransformSignalType =
  | 'unit_step'
  | 'ramp'
  | 'impulse'
  | 'cosine'
  | 'sine'
  | 'rect_gate';

export interface CTFTSignalMeta {
  id: TransformSignalType;
  name: string;
  formulaT: string;
  formulaF: string;
  desc: string;
  propertyHighlight: string;
}

export const CTFT_CATALOG: Record<TransformSignalType, CTFTSignalMeta> = {
  unit_step: {
    id: 'unit_step',
    name: 'Unit Step u(t)',
    formulaT: 'x(t) = u(t) = \\begin{cases} 1 & t \\ge 0 \\\\ 0 & t < 0 \\end{cases}',
    formulaF: 'X(f) = \\frac{1}{2} \\delta(f) + \\frac{1}{j 2\\pi f}',
    desc: 'The fundamental switching signal. Its transform contains a DC impulse at f=0 representing its non-zero mean (1/2), plus a 1/(2πf) hyperbolic decay from the step discontinuity.',
    propertyHighlight: 'DC Average & Hyperbolic Decay: Shows that non-zero average creates a Dirac delta at 0 Hz.',
  },
  ramp: {
    id: 'ramp',
    name: 'Ramp Function r(t)',
    formulaT: 'x(t) = t \\cdot u(t) = \\begin{cases} t & t \\ge 0 \\\\ 0 & t < 0 \\end{cases}',
    formulaF: 'X(f) = \\frac{j}{4\\pi} \\delta\'(f) - \\frac{1}{4\\pi^2 f^2}',
    desc: 'Integration of the unit step function. Multiplying by 1/(j 2π f) causes a steep 1/f² high-frequency roll-off.',
    propertyHighlight: 'Integration Property: Each integration in time divides the spectrum by j 2π f, steepening high-frequency roll-off.',
  },
  impulse: {
    id: 'impulse',
    name: 'Dirac Delta Impulse δ(t)',
    formulaT: 'x(t) = \\delta(t) \\quad (\\int_{-\\infty}^{\\infty} \\delta(t) dt = 1)',
    formulaF: 'X(f) = 1 \\quad (\\forall f \\in \\mathbb{R})',
    desc: 'An instantaneous spike of infinite height and unit area at t=0. Its Fourier transform is a perfectly flat line of amplitude 1 across all frequencies.',
    propertyHighlight: 'White Spectrum: An infinitely narrow event in time contains all frequencies simultaneously with equal power.',
  },
  cosine: {
    id: 'cosine',
    name: 'Cosine Wave cos(2π f₀ t)',
    formulaT: 'x(t) = \\cos(2\\pi f_0 t)',
    formulaF: 'X(f) = \\frac{1}{2}\\left[\\delta(f - f_0) + \\delta(f + f_0)\\right]',
    desc: 'Pure sinusoidal oscillation. Concentrates 100% of its energy into two discrete impulse spikes located at ±f_0.',
    propertyHighlight: 'Euler Identity: cos(2πf_0 t) = (e^(j 2π f_0 t) + e^(-j 2π f_0 t))/2 creates symmetric Dirac impulses.',
  },
  sine: {
    id: 'sine',
    name: 'Sine Wave sin(2π f₀ t)',
    formulaT: 'x(t) = \\sin(2\\pi f_0 t)',
    formulaF: 'X(f) = \\frac{1}{2j}\\left[\\delta(f - f_0) - \\delta(f + f_0)\\right]',
    desc: 'Odd sinusoidal oscillation. Produces two spectral spikes at ±f_0 with opposite 90-degree imaginary phase.',
    propertyHighlight: 'Odd Symmetry: Real odd time signal produces pure imaginary odd spectrum with ±90° phase shift.',
  },
  rect_gate: {
    id: 'rect_gate',
    name: 'Rectangular Gate Π(t/τ)',
    formulaT: 'x(t) = \\Pi\\left(\\frac{t}{\\tau}\\right) = \\begin{cases} 1 & |t| \\le \\tau/2 \\\\ 0 & |t| > \\tau/2 \\end{cases}',
    formulaF: 'X(f) = \\tau \\operatorname{sinc}(f \\tau) = \\tau \\frac{\\sin(\\pi f \\tau)}{\\pi f \\tau}',
    desc: 'Classic isolated time window of duration τ. Produces a continuous sinc envelope with periodic nulls at f = ±k/τ.',
    propertyHighlight: 'Time-Frequency Duality: Narrowing the gate in time widens the sinc main lobe in frequency.',
  },
};

export interface TransformSamplePoint {
  t: number;
  y: number;
}

export interface TransformSpectrumPoint {
  f: number;
  mag: number;
  isImpulse?: boolean;
}

// Evaluate time-domain signal points
export function evaluateTransformTimeSignal(
  type: TransformSignalType,
  tauOrF0: number, // width tau for gates/ramp, or frequency f0 for cos/sin
  tRange: number = 3.5,
  numPoints: number = 280
): TransformSamplePoint[] {
  const pts: TransformSamplePoint[] = [];
  const dt = (2 * tRange) / (numPoints - 1);

  for (let i = 0; i < numPoints; i++) {
    const t = -tRange + i * dt;
    let y = 0;

    switch (type) {
      case 'impulse':
        // Display as narrow pulse near t=0 with height 1.4
        y = Math.abs(t) < 0.04 ? 1.4 : 0;
        break;
      case 'unit_step':
        y = t < 0 ? 0.0 : 1.0;
        break;
      case 'cosine': {
        const f0 = Math.max(0.5, tauOrF0);
        y = Math.cos(2 * Math.PI * f0 * t);
        break;
      }
      case 'sine': {
        const f0 = Math.max(0.5, tauOrF0);
        y = Math.sin(2 * Math.PI * f0 * t);
        break;
      }
      case 'ramp': {
        const scale = Math.max(0.5, tauOrF0);
        y = t < 0 ? 0 : Math.min(1.4, t / scale);
        break;
      }
      case 'rect_gate': {
        const width = Math.max(0.2, tauOrF0);
        y = Math.abs(t) <= width / 2 ? 1.0 : 0.0;
        break;
      }
    }

    pts.push({ t, y });
  }

  return pts;
}

// Evaluate continuous Fourier Transform |X(f)|
export function evaluateTransformSpectrum(
  type: TransformSignalType,
  tauOrF0: number,
  fRange: number = 5.5,
  numPoints: number = 300
): TransformSpectrumPoint[] {
  const pts: TransformSpectrumPoint[] = [];
  const df = (2 * fRange) / (numPoints - 1);

  for (let i = 0; i < numPoints; i++) {
    const f = -fRange + i * df;
    let mag = 0;
    let isImpulse = false;

    switch (type) {
      case 'impulse': {
        // Flat constant |X(f)| = 1
        mag = 1.0;
        break;
      }
      case 'unit_step': {
        // |X(f)| = 1 / (2*pi*f), with DC spike at f=0
        if (Math.abs(f) < 0.08) {
          mag = 1.35;
          isImpulse = true;
        } else {
          mag = Math.min(1.3, 1 / (2 * Math.PI * Math.abs(f)));
        }
        break;
      }
      case 'cosine': {
        const f0 = Math.max(0.5, tauOrF0);
        // Dirac impulses at ±f0
        if (Math.abs(Math.abs(f) - f0) < 0.07) {
          mag = 1.35;
          isImpulse = true;
        } else {
          mag = 0;
        }
        break;
      }
      case 'sine': {
        const f0 = Math.max(0.5, tauOrF0);
        // Dirac impulses at ±f0
        if (Math.abs(Math.abs(f) - f0) < 0.07) {
          mag = 1.35;
          isImpulse = true;
        } else {
          mag = 0;
        }
        break;
      }
      case 'ramp': {
        // 1 / (4*pi^2 * f^2)
        if (Math.abs(f) < 0.1) {
          mag = 1.35;
          isImpulse = true;
        } else {
          mag = Math.min(1.3, 1 / (4 * Math.PI * Math.PI * f * f));
        }
        break;
      }
      case 'rect_gate': {
        const width = Math.max(0.2, tauOrF0);
        const arg = Math.PI * f * width;
        const sinc = Math.abs(arg) < 1e-6 ? 1.0 : Math.sin(arg) / arg;
        mag = Math.abs(width * sinc);
        break;
      }
    }

    pts.push({ f, mag, isImpulse });
  }

  return pts;
}

// Compute periodic line stems for Fourier Series comparison
export interface PeriodicHarmonicStem {
  k: number;
  freq: number;
  mag: number;
}

export function evaluatePeriodicComparisonStems(
  type: TransformSignalType,
  tauOrF0: number,
  T0: number,
  maxK: number = 25
): PeriodicHarmonicStem[] {
  const stems: PeriodicHarmonicStem[] = [];
  const f0 = 1 / T0;

  for (let k = -maxK; k <= maxK; k++) {
    const f = k * f0;
    const pts = evaluateTransformSpectrum(type, tauOrF0, Math.abs(f) + 0.1, 3);
    const nearest = pts.reduce((best, p) =>
      Math.abs(p.f - f) < Math.abs(best.f - f) ? p : best
    );

    stems.push({
      k,
      freq: f,
      mag: (1 / T0) * nearest.mag,
    });
  }

  return stems;
}
