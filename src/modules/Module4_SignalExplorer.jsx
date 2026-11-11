/**
 * Module 4: Signal Explorer Workspace
 * Interactive Continuous & Discrete Signal Analysis, Even/Odd Decomposition,
 * Signal Operations (Superposition & Modulation), and Transformations.
 * 
 * Features live simulation playback with horizontal wave motion, SimulationToolbar,
 * fullscreen/exit fullscreen support, grid toggling, and top-of-page hero visualization.
 */

import React, { useRef, useState, useMemo, useCallback, useEffect } from 'react';
import { SimulationToolbar } from '../components/SimulationToolbar';
import {
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Eye,
  EyeOff,
  CheckCircle2,
  Split,
  Info,
  Layers,
  Plus,
  X as MultiplyIcon,
  Minus,
  Sparkles,
  ArrowLeftRight,
  Maximize2,
  MoveRight,
  Sliders,
  Activity,
  Zap,
  Compass,
  Code2,
  GitFork,
  ChevronRight,
  X,
  BookOpen,
  ArrowLeft,
  Play,
  Pause,
} from 'lucide-react';

/* =========================================================================
   1. Domain-Specific Types & Mathematical Models
   ========================================================================= */

const EPSILON = 1e-6;

export function evaluateSignal(config, t, domain, animOffset = 0) {
  const {
    waveform,
    amplitude,
    frequency,
    phase = 0,
    timeShift = 0,
    decayRate = 0.5,
    pulseWidth = 2,
    subType = 'cos',
  } = config;

  // The horizontal propagation offset animates the wave horizontally: x(t - timeShift - animOffset)
  const tau = t - (timeShift + animOffset);

  switch (waveform) {
    case 'sinusoid': {
      const omega = 2 * Math.PI * frequency;
      const angle = omega * tau + phase;
      return subType === 'sin' ? amplitude * Math.sin(angle) : amplitude * Math.cos(angle);
    }

    case 'unit_step': {
      if (domain === 'continuous') {
        if (Math.abs(tau) < 0.005) return amplitude * 0.5;
        return tau > 0 ? amplitude : 0;
      } else {
        const n = Math.round(tau);
        return n >= 0 ? amplitude : 0;
      }
    }

    case 'impulse': {
      if (domain === 'continuous') {
        const width = 0.08;
        if (Math.abs(tau) < width / 2) {
          return amplitude;
        }
        return 0;
      } else {
        const n = Math.round(tau);
        return n === 0 ? amplitude : 0;
      }
    }

    case 'ramp': {
      if (domain === 'continuous') {
        return tau >= 0 ? amplitude * tau : 0;
      } else {
        const n = Math.round(tau);
        return n >= 0 ? amplitude * n : 0;
      }
    }

    case 'exponential': {
      if (domain === 'continuous') {
        if (tau < 0) return 0;
        return amplitude * Math.exp(-decayRate * tau);
      } else {
        const n = Math.round(tau);
        if (n < 0) return 0;
        const alpha = Math.exp(-decayRate);
        return amplitude * Math.pow(alpha, n);
      }
    }

    case 'rectangular': {
      const halfWidth = Math.max(0.1, pulseWidth / 2);
      if (domain === 'continuous') {
        if (Math.abs(Math.abs(tau) - halfWidth) < 0.005) return amplitude * 0.5;
        return Math.abs(tau) <= halfWidth ? amplitude : 0;
      } else {
        const n = Math.round(tau);
        const halfN = Math.floor(pulseWidth / 2);
        return Math.abs(n) <= halfN ? amplitude : 0;
      }
    }

    case 'triangular': {
      const halfWidth = Math.max(0.1, pulseWidth / 2);
      if (domain === 'continuous') {
        if (Math.abs(tau) <= halfWidth) {
          return amplitude * (1 - Math.abs(tau) / halfWidth);
        }
        return 0;
      } else {
        const n = Math.round(tau);
        const halfN = Math.max(1, Math.round(pulseWidth / 2));
        if (Math.abs(n) <= halfN) {
          return amplitude * (1 - Math.abs(n) / halfN);
        }
        return 0;
      }
    }

    case 'sinc': {
      if (Math.abs(tau) < EPSILON) return amplitude;
      const arg = Math.PI * frequency * tau;
      return (amplitude * Math.sin(arg)) / arg;
    }

    default:
      return 0;
  }
}

export function evaluateTransformedSignal(config, transform, t, domain, animOffset = 0) {
  const { amplitudeScale, timeScale, timeShift, timeReversal } = transform;
  const reversalSign = timeReversal ? -1 : 1;
  const internalT = reversalSign * (timeScale * t) - timeShift;
  const rawVal = evaluateSignal(config, internalT, domain, animOffset);
  return amplitudeScale * rawVal;
}

export function evaluateOperation(config1, config2, op, t, domain, animOffset = 0) {
  const y1 = evaluateSignal(config1, t, domain, animOffset);
  const y2 = evaluateSignal(config2, t, domain, animOffset);
  let yCombined = 0;
  switch (op) {
    case 'add':
      yCombined = y1 + y2;
      break;
    case 'multiply':
      yCombined = y1 * y2;
      break;
    case 'subtract':
      yCombined = y1 - y2;
      break;
    default:
      yCombined = y1 + y2;
  }
  return { y1, y2, yCombined };
}

export function generateSignalSamples(
  config,
  domain,
  range = 10,
  stepOrCount = 450,
  transform,
  config2,
  operation,
  animOffset = 0
) {
  const samples = [];
  if (domain === 'continuous') {
    const numPoints = stepOrCount;
    const dt = (2 * range) / (numPoints - 1);

    for (let i = 0; i < numPoints; i++) {
      const t = -range + i * dt;
      const y = evaluateSignal(config, t, domain, animOffset);
      const yNeg = evaluateSignal(config, -t, domain, animOffset);
      const yEven = 0.5 * (y + yNeg);
      const yOdd = 0.5 * (y - yNeg);

      let yTransformed;
      if (transform) {
        yTransformed = evaluateTransformedSignal(config, transform, t, domain, animOffset);
      }

      let y2;
      let yCombined;
      if (config2 && operation) {
        const opRes = evaluateOperation(config, config2, operation, t, domain, animOffset);
        y2 = opRes.y2;
        yCombined = opRes.yCombined;
      }

      samples.push({
        x: Number(t.toFixed(4)),
        y,
        yEven,
        yOdd,
        yTransformed,
        y2,
        yCombined,
      });
    }
  } else {
    const nMin = -Math.floor(range);
    const nMax = Math.floor(range);

    for (let n = nMin; n <= nMax; n++) {
      const y = evaluateSignal(config, n, domain, animOffset);
      const yNeg = evaluateSignal(config, -n, domain, animOffset);
      const yEven = 0.5 * (y + yNeg);
      const yOdd = 0.5 * (y - yNeg);

      let yTransformed;
      if (transform) {
        yTransformed = evaluateTransformedSignal(config, transform, n, domain, animOffset);
      }

      let y2;
      let yCombined;
      if (config2 && operation) {
        const opRes = evaluateOperation(config, config2, operation, n, domain, animOffset);
        y2 = opRes.y2;
        yCombined = opRes.yCombined;
      }

      samples.push({
        x: n,
        y,
        yEven,
        yOdd,
        yTransformed,
        y2,
        yCombined,
      });
    }
  }
  return samples;
}

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b > 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  return a;
}

function toFraction(val, maxDenominator = 128) {
  const tolerance = 1e-4;
  for (let den = 1; den <= maxDenominator; den++) {
    const num = Math.round(val * den);
    if (Math.abs(val - num / den) < tolerance) {
      const d = gcd(num, den);
      return { num: num / d, den: den / d };
    }
  }
  return null;
}

export function computeSignalMetrics(config, domain, samples) {
  const { waveform, amplitude, frequency, timeShift = 0, subType = 'cos', phase = 0 } = config;
  let isPeriodic = false;
  let fundamentalPeriod = null;
  let fundamentalFreq = null;
  let angularFreq = null;
  const notes = [];

  if (waveform === 'sinusoid') {
    if (domain === 'continuous') {
      if (frequency > 0) {
        isPeriodic = true;
        fundamentalFreq = frequency;
        fundamentalPeriod = Number((1 / frequency).toFixed(4));
        angularFreq = Number((2 * Math.PI * frequency).toFixed(4));
        notes.push(
          `Continuous sinusoid is always periodic with fundamental period T₀ = 1/f = ${fundamentalPeriod} s (ω₀ = 2πf = ${angularFreq} rad/s).`
        );
      } else {
        isPeriodic = false;
        notes.push('Frequency is 0 Hz (DC constant signal).');
      }
    } else {
      const frac = toFraction(frequency);
      if (frac && frac.den > 0 && frequency > 0) {
        isPeriodic = true;
        fundamentalPeriod = frac.den;
        fundamentalFreq = Number((frac.num / frac.den).toFixed(4));
        angularFreq = Number((2 * Math.PI * fundamentalFreq).toFixed(4));
        notes.push(
          `Discrete sinusoid is periodic because normalized frequency f₀ = ${frac.num}/${frac.den} is rational. Fundamental period N = ${frac.den} samples.`
        );
      } else {
        isPeriodic = false;
        notes.push(
          `Discrete sinusoid is aperiodic because f = ${frequency.toFixed(4)} is not an integer ratio m/N.`
        );
      }
    }
  } else {
    isPeriodic = false;
    notes.push(`${waveform.replace('_', ' ')} is an aperiodic (transient or unilateral) signal.`);
  }

  let energy = 0;
  let evenEnergy = 0;
  let oddEnergy = 0;
  let power = 0;

  if (domain === 'continuous') {
    const n = samples.length;
    if (n > 1) {
      for (let i = 0; i < n - 1; i++) {
        const dt = samples[i + 1].x - samples[i].x;
        const yAvgSq = 0.5 * (Math.pow(samples[i].y, 2) + Math.pow(samples[i + 1].y, 2));
        energy += yAvgSq * dt;

        const yEvenAvgSq = 0.5 * (Math.pow(samples[i].yEven ?? 0, 2) + Math.pow(samples[i + 1].yEven ?? 0, 2));
        evenEnergy += yEvenAvgSq * dt;

        const yOddAvgSq = 0.5 * (Math.pow(samples[i].yOdd ?? 0, 2) + Math.pow(samples[i + 1].yOdd ?? 0, 2));
        oddEnergy += yOddAvgSq * dt;
      }
      const totalT = samples[n - 1].x - samples[0].x;
      power = totalT > 0 ? energy / totalT : 0;
    }
  } else {
    for (const s of samples) {
      energy += Math.pow(s.y, 2);
      evenEnergy += Math.pow(s.yEven ?? 0, 2);
      oddEnergy += Math.pow(s.yOdd ?? 0, 2);
    }
    power = samples.length > 0 ? energy / samples.length : 0;
  }

  let classification = 'Neither';
  if (waveform === 'sinusoid') {
    classification = 'Power Signal';
    const theoreticalPower = (amplitude * amplitude) / 2;
    notes.push(`Theoretical average power P = A²/2 = ${theoreticalPower.toFixed(3)} W (Infinite Energy E = ∞).`);
  } else if (waveform === 'unit_step') {
    classification = 'Power Signal';
    const theoreticalPower = (amplitude * amplitude) / 2;
    notes.push(`Unit step carries infinite total energy E = ∞, but finite average power P = A²/2 = ${theoreticalPower.toFixed(3)} W.`);
  } else if (['rectangular', 'triangular', 'impulse', 'exponential'].includes(waveform)) {
    classification = 'Energy Signal';
    notes.push('Finite duration / decaying signal: 0 < E < ∞ and average power P → 0 over infinite horizon.');
  } else if (waveform === 'ramp') {
    classification = 'Neither';
    notes.push('Ramp grows indefinitely: E = ∞ and average power P = ∞ (Neither energy nor power signal).');
  }

  const totalDecompEnergy = evenEnergy + oddEnergy;
  const evenEnergyRatio = totalDecompEnergy > EPSILON ? (evenEnergy / totalDecompEnergy) * 100 : 0;
  const oddEnergyRatio = totalDecompEnergy > EPSILON ? (oddEnergy / totalDecompEnergy) * 100 : 0;

  let symmetry = 'Neither (Asymmetric)';
  if (oddEnergyRatio < 0.5) {
    symmetry = 'Purely Even';
  } else if (evenEnergyRatio < 0.5) {
    symmetry = 'Purely Odd';
  }

  const domVar = domain === 'continuous' ? 't' : 'n';
  const shiftStr = timeShift === 0 ? '' : timeShift > 0 ? ` - ${timeShift}` : ` + ${Math.abs(timeShift)}`;
  const argStr = timeShift === 0 ? domVar : `(${domVar}${shiftStr})`;

  let formula = '';
  switch (waveform) {
    case 'sinusoid': {
      const func = subType;
      const phiStr = phase === 0 ? '' : phase > 0 ? ` + ${(phase / Math.PI).toFixed(2)}π` : ` - ${(Math.abs(phase) / Math.PI).toFixed(2)}π`;
      formula = `x(${domVar}) = ${amplitude}·${func}(2π·${frequency}·${argStr}${phiStr})`;
      break;
    }
    case 'unit_step':
      formula = `x(${domVar}) = ${amplitude}·u${argStr}`;
      break;
    case 'impulse':
      formula = domain === 'continuous' ? `x(t) = ${amplitude}·δ${argStr}` : `x[n] = ${amplitude}·δ${argStr}`;
      break;
    case 'ramp':
      formula = `x(${domVar}) = ${amplitude}·r${argStr}`;
      break;
    case 'exponential':
      formula = domain === 'continuous'
        ? `x(t) = ${amplitude}·e^{-${config.decayRate || 0.5}·${argStr}}·u${argStr}`
        : `x[n] = ${amplitude}·(${Math.exp(-(config.decayRate || 0.5)).toFixed(2)})^${argStr}·u${argStr}`;
      break;
    case 'rectangular':
      formula = `x(${domVar}) = ${amplitude}·rect(${argStr} / ${config.pulseWidth || 2})`;
      break;
    case 'triangular':
      formula = `x(${domVar}) = ${amplitude}·Λ(${argStr} / ${config.pulseWidth || 2})`;
      break;
    case 'sinc':
      formula = `x(${domVar}) = ${amplitude}·sinc(${frequency}·${argStr})`;
      break;
    default:
      formula = `x(${domVar})`;
  }

  const evenFormula = `x_e(${domVar}) = ½ · [ x(${domVar}) + x(-${domVar}) ]`;
  const oddFormula = `x_o(${domVar}) = ½ · [ x(${domVar}) - x(-${domVar}) ]`;

  return {
    isPeriodic,
    fundamentalPeriod,
    fundamentalFreq,
    angularFreq,
    energy: Number(energy.toFixed(3)),
    power: Number(power.toFixed(3)),
    classification,
    symmetry,
    evenEnergy: Number(evenEnergy.toFixed(3)),
    oddEnergy: Number(oddEnergy.toFixed(3)),
    evenEnergyRatio: Number(evenEnergyRatio.toFixed(1)),
    oddEnergyRatio: Number(oddEnergyRatio.toFixed(1)),
    formula,
    evenFormula,
    oddFormula,
    notes,
  };
}

/* =========================================================================
   2. Pedagogical Presets
   ========================================================================= */

export const PRESET_SIGNALS = [
  {
    id: 'cosine_even',
    name: 'Even Prototype: Pure Cosine',
    domain: 'continuous',
    description: 'Symmetric under time reversal x(t) = x(-t). Decomposes into 100% Even component with zero Odd energy.',
    config: {
      id: 'sig_1',
      name: 'Cosine Wave',
      waveform: 'sinusoid',
      subType: 'cos',
      amplitude: 2,
      frequency: 0.5,
      phase: 0,
      timeShift: 0,
      decayRate: 0.5,
      pulseWidth: 2,
      color: '#C85A32',
    },
    defaultMode: 'single',
  },
  {
    id: 'sine_odd',
    name: 'Odd Prototype: Pure Sine',
    domain: 'continuous',
    description: 'Anti-symmetric under reflection x(t) = -x(-t). Decomposes into 100% Odd component with zero Even energy.',
    config: {
      id: 'sig_1',
      name: 'Sine Wave',
      waveform: 'sinusoid',
      subType: 'sin',
      amplitude: 2,
      frequency: 0.5,
      phase: 0,
      timeShift: 0,
      decayRate: 0.5,
      pulseWidth: 2,
      color: '#C85A32',
    },
    defaultMode: 'single',
  },
  {
    id: 'unit_step',
    name: 'Heaviside Unit Step u(t)',
    domain: 'continuous',
    description: 'Fundamental switching signal. Causal, non-zero for t ≥ 0.',
    config: {
      id: 'sig_1',
      name: 'Unit Step',
      waveform: 'unit_step',
      amplitude: 2,
      frequency: 1,
      phase: 0,
      timeShift: 0,
      decayRate: 0.5,
      pulseWidth: 2,
      color: '#C85A32',
    },
    defaultMode: 'single',
  },
  {
    id: 'rect_pulse',
    name: 'Rectangular Gate Pulse rect(t)',
    domain: 'continuous',
    description: 'Classic finite-duration energy signal of width Tw = 4.',
    config: {
      id: 'sig_1',
      name: 'Rectangular Pulse',
      waveform: 'rectangular',
      amplitude: 2,
      frequency: 1,
      phase: 0,
      timeShift: 0,
      decayRate: 0.5,
      pulseWidth: 4,
      color: '#C85A32',
    },
    defaultMode: 'single',
  },
  {
    id: 'tri_pulse',
    name: 'Triangular Bartlett Pulse Λ(t)',
    domain: 'continuous',
    description: 'Linear triangular profile produced by auto-correlation of rectangular pulses.',
    config: {
      id: 'sig_1',
      name: 'Triangular Pulse',
      waveform: 'triangular',
      amplitude: 2,
      frequency: 1,
      phase: 0,
      timeShift: 0,
      decayRate: 0.5,
      pulseWidth: 4,
      color: '#C85A32',
    },
    defaultMode: 'single',
  },
  {
    id: 'causal_exp',
    name: 'Causal Exponential Decay',
    domain: 'continuous',
    description: 'Impulse response of 1st-order RC circuits: x(t) = A·e^(-σt)·u(t).',
    config: {
      id: 'sig_1',
      name: 'Decaying Exponential',
      waveform: 'exponential',
      amplitude: 2.5,
      frequency: 1,
      phase: 0,
      timeShift: 0,
      decayRate: 0.6,
      pulseWidth: 2,
      color: '#C85A32',
    },
    defaultMode: 'single',
  },
  {
    id: 'discrete_periodic',
    name: 'Discrete Stem Periodic (N = 8)',
    domain: 'discrete',
    description: 'Discrete-time sinusoid x[n] = 2·cos(2π·(1/8)·n). Exactly periodic with integer period N = 8 samples.',
    config: {
      id: 'sig_1',
      name: 'Discrete Cosine',
      waveform: 'sinusoid',
      subType: 'cos',
      amplitude: 2,
      frequency: 0.125,
      phase: 0,
      timeShift: 0,
      decayRate: 0.5,
      pulseWidth: 2,
      color: '#C85A32',
    },
    defaultMode: 'single',
  },
  {
    id: 'beat_phenomenon',
    name: 'Beat Phenomenon: x₁(t) + x₂(t)',
    domain: 'continuous',
    description: 'Superposition of two sinusoids with closely spaced frequencies (1.0 Hz and 1.2 Hz).',
    config: {
      id: 'sig_1',
      name: 'Tone 1 (1.0 Hz)',
      waveform: 'sinusoid',
      subType: 'cos',
      amplitude: 1.5,
      frequency: 1.0,
      phase: 0,
      timeShift: 0,
      decayRate: 0.5,
      pulseWidth: 2,
      color: '#C85A32',
    },
    config2: {
      id: 'sig_2',
      name: 'Tone 2 (1.2 Hz)',
      waveform: 'sinusoid',
      subType: 'cos',
      amplitude: 1.5,
      frequency: 1.2,
      phase: 0,
      timeShift: 0,
      decayRate: 0.5,
      pulseWidth: 2,
      color: '#2563EB',
    },
    operation: 'add',
    defaultMode: 'operations',
  },
  {
    id: 'am_modulation',
    name: 'AM Modulation: x₁(t) × x₂(t)',
    domain: 'continuous',
    description: 'Carrier wave (2.5 Hz) amplitude modulated by low-frequency envelope (0.25 Hz).',
    config: {
      id: 'sig_1',
      name: 'Carrier Wave (2.5 Hz)',
      waveform: 'sinusoid',
      subType: 'cos',
      amplitude: 2,
      frequency: 2.5,
      phase: 0,
      timeShift: 0,
      decayRate: 0.5,
      pulseWidth: 2,
      color: '#C85A32',
    },
    config2: {
      id: 'sig_2',
      name: 'Modulating Pulse',
      waveform: 'sinusoid',
      subType: 'cos',
      amplitude: 1,
      frequency: 0.3,
      phase: 0,
      timeShift: 0,
      decayRate: 0.5,
      pulseWidth: 2,
      color: '#059669',
    },
    operation: 'multiply',
    defaultMode: 'operations',
  },
  {
    id: 'time_compression_shift',
    name: 'Transformation: Time Scaling & Reversal',
    domain: 'continuous',
    description: 'Observe x(2t) compression, x(-t) reflection, and x(t - 2) time delay transformations.',
    config: {
      id: 'sig_1',
      name: 'Base Pulse',
      waveform: 'triangular',
      amplitude: 2,
      frequency: 1,
      phase: 0,
      timeShift: 0,
      decayRate: 0.5,
      pulseWidth: 3,
      color: '#C85A32',
    },
    transform: {
      amplitudeScale: 1.5,
      timeScale: 2,
      timeShift: 1.5,
      timeReversal: false,
    },
    defaultMode: 'transformations',
  },
];

/* =========================================================================
   3. Signal Canvas Component
   ========================================================================= */

export const SignalCanvas = ({
  title,
  domain,
  samples,
  traces,
  timeRange,
  yMax: customYMax,
  subtitle,
  height = 360,
  showZeroBaseline = true,
  onZoomChange,
  isGridVisible = true,
  playbackState = 'paused',
  animOffset = 0,
}) => {
  const containerRef = useRef(null);
  const [hoveredSample, setHoveredSample] = useState(null);
  const [mousePos, setMousePos] = useState(null);
  const [hiddenTraceIds, setHiddenTraceIds] = useState(new Set());

  const width = 800;
  const pad = { top: 32, right: 36, bottom: 44, left: 54 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;

  const { minY, maxY, yTicks } = useMemo(() => {
    let maxVal = customYMax ?? 1;
    let minVal = customYMax ? -customYMax : -1;

    samples.forEach((s) => {
      traces.forEach((tr) => {
        const val = s[tr.key];
        if (typeof val === 'number' && !isNaN(val)) {
          if (val > maxVal) maxVal = val;
          if (val < minVal) minVal = val;
        }
      });
    });

    const bound = Math.max(Math.abs(maxVal), Math.abs(minVal), 1.2) * 1.15;
    const finalMax = Number(bound.toFixed(2));
    const finalMin = -finalMax;

    const step = finalMax / 2;
    const ticks = [-finalMax, -step, 0, step, finalMax];

    return { minY: finalMin, maxY: finalMax, yTicks: ticks };
  }, [samples, traces, customYMax]);

  const xToPx = useCallback(
    (x) => pad.left + ((x - (-timeRange)) / (2 * timeRange)) * plotWidth,
    [pad.left, timeRange, plotWidth]
  );

  const yToPx = useCallback(
    (y) => pad.top + ((maxY - y) / (maxY - minY)) * plotHeight,
    [pad.top, maxY, minY, plotHeight]
  );

  const xTicks = useMemo(() => {
    const ticks = [];
    const step = domain === 'discrete' ? Math.max(1, Math.round(timeRange / 5)) : Number((timeRange / 5).toFixed(1));
    for (let x = -timeRange; x <= timeRange + 0.001; x += step) {
      ticks.push(Number(x.toFixed(2)));
    }
    return ticks;
  }, [timeRange, domain]);

  const tracePaths = useMemo(() => {
    if (domain !== 'continuous') return [];

    return traces
      .filter((tr) => !hiddenTraceIds.has(tr.id))
      .map((tr) => {
        let d = '';
        samples.forEach((s, i) => {
          const val = s[tr.key];
          if (typeof val === 'number' && !isNaN(val)) {
            const px = xToPx(s.x);
            const py = yToPx(val);
            d += i === 0 ? `M ${px.toFixed(2)} ${py.toFixed(2)}` : ` L ${px.toFixed(2)} ${py.toFixed(2)}`;
          }
        });

        let areaD = '';
        if (tr.id === 'main' && samples.length > 0) {
          const yZeroPx = yToPx(0);
          areaD = `${d} L ${xToPx(samples[samples.length - 1].x)} ${yZeroPx} L ${xToPx(samples[0].x)} ${yZeroPx} Z`;
        }

        return { ...tr, d, areaD };
      });
  }, [domain, traces, hiddenTraceIds, samples, xToPx, yToPx]);

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseSvgX = ((e.clientX - rect.left) / rect.width) * width;
    const mouseSvgY = ((e.clientY - rect.top) / rect.height) * height;

    if (
      mouseSvgX >= pad.left &&
      mouseSvgX <= width - pad.right &&
      mouseSvgY >= pad.top &&
      mouseSvgY <= height - pad.bottom
    ) {
      const dataX = -timeRange + ((mouseSvgX - pad.left) / plotWidth) * (2 * timeRange);
      let closest = samples[0];
      let minDiff = Infinity;

      for (const s of samples) {
        const diff = Math.abs(s.x - dataX);
        if (diff < minDiff) {
          minDiff = diff;
          closest = s;
        }
      }

      setHoveredSample(closest);
      setMousePos({ px: xToPx(closest.x), py: mouseSvgY });
    } else {
      setHoveredSample(null);
      setMousePos(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredSample(null);
    setMousePos(null);
  };

  const toggleTrace = (id) => {
    setHiddenTraceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < traces.length - 1) {
        next.add(id);
      }
      return next;
    });
  };

  const exportCSV = () => {
    const activeTraces = traces.filter((tr) => !hiddenTraceIds.has(tr.id));
    const header = [domain === 'continuous' ? 't' : 'n', ...activeTraces.map((t) => t.label)].join(',');
    const rows = samples.map((s) => {
      const cols = [s.x];
      activeTraces.forEach((t) => {
        cols.push(s[t.key]);
      });
      return cols.join(',');
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [header, ...rows].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportSVG = () => {
    const svgEl = containerRef.current?.querySelector('svg');
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_plot.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const zeroYPx = yToPx(0);

  return (
    <div
      ref={containerRef}
      className="relative bg-white rounded-xl border border-neutral-200/90 shadow-2xs overflow-hidden flex flex-col"
    >
      {/* Canvas Top Bar */}
      <div className="flex flex-wrap items-center justify-between px-4 sm:px-5 py-3 border-b border-neutral-100 bg-[#FAF9F6] gap-2">
        <div className="flex items-baseline gap-2.5">
          <h3 className="text-sm font-semibold text-neutral-900 tracking-tight">{title}</h3>
          {subtitle && <span className="hidden md:inline text-xs text-neutral-500 font-normal">{subtitle}</span>}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Traces legend pills */}
          <div className="flex items-center gap-1.5 mr-1">
            {traces.map((tr) => {
              const isHidden = hiddenTraceIds.has(tr.id);
              return (
                <button
                  key={tr.id}
                  onClick={() => toggleTrace(tr.id)}
                  title={`Toggle ${tr.label}`}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer whitespace-nowrap ${
                    isHidden
                      ? 'bg-neutral-100 text-neutral-400 opacity-60'
                      : 'bg-white text-neutral-700 shadow-2xs border border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <span
                    className="w-2.5 h-0.5 rounded-full"
                    style={{ backgroundColor: tr.color, opacity: isHidden ? 0.4 : 1 }}
                  />
                  <span>{tr.label}</span>
                  {isHidden ? <EyeOff className="w-3 h-3 text-neutral-400" /> : <Eye className="w-3 h-3 text-neutral-400" />}
                </button>
              );
            })}
          </div>

          {/* Zoom Controls */}
          {onZoomChange && (
            <div className="flex items-center gap-0.5 bg-white rounded-lg p-0.5 border border-neutral-200 shadow-2xs">
              <button
                onClick={() => onZoomChange(Math.max(2, timeRange - 2))}
                title="Zoom in"
                className="p-1 rounded-md text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onZoomChange(Math.min(20, timeRange + 2))}
                title="Zoom out"
                className="p-1 rounded-md text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onZoomChange(domain === 'discrete' ? 8 : 6)}
                title="Reset zoom"
                className="p-1 rounded-md text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Export Buttons */}
          <button
            onClick={exportSVG}
            title="Export Vector SVG"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 rounded-lg shadow-2xs hover:bg-neutral-50 transition-colors cursor-pointer"
          >
            <Download className="w-3 h-3" />
            <span>SVG</span>
          </button>
          <button
            onClick={exportCSV}
            title="Export CSV Samples"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 rounded-lg shadow-2xs hover:bg-neutral-50 transition-colors cursor-pointer"
          >
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* SVG Canvas Area */}
      <div className="relative w-full overflow-hidden select-none bg-white" style={{ height }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full block"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#C85A32" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#C85A32" stopOpacity="0.01" />
            </linearGradient>
            <clipPath id="plotClip">
              <rect x={pad.left} y={pad.top} width={plotWidth} height={plotHeight} />
            </clipPath>
          </defs>

          {/* Background area */}
          <rect x={pad.left} y={pad.top} width={plotWidth} height={plotHeight} fill="#FFFFFF" />

          {/* Y-axis Ticks & Grid */}
          {yTicks.map((tickVal, i) => {
            const py = yToPx(tickVal);
            return (
              <g key={`y-grid-${i}`}>
                {isGridVisible && (
                  <line
                    x1={pad.left}
                    y1={py}
                    x2={width - pad.right}
                    y2={py}
                    stroke={tickVal === 0 ? '#94A3B8' : '#F1F5F9'}
                    strokeWidth={tickVal === 0 ? 1.5 : 1}
                    strokeDasharray={tickVal === 0 ? undefined : '3 3'}
                  />
                )}
                {!isGridVisible && tickVal === 0 && (
                  <line
                    x1={pad.left}
                    y1={py}
                    x2={width - pad.right}
                    y2={py}
                    stroke="#94A3B8"
                    strokeWidth={1.5}
                  />
                )}
                <text
                  x={pad.left - 8}
                  y={py + 3.5}
                  textAnchor="end"
                  className="text-[10px] font-mono tabular-nums fill-neutral-400"
                >
                  {tickVal.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* X-axis Ticks & Grid */}
          {xTicks.map((tickVal, i) => {
            const px = xToPx(tickVal);
            if (px < pad.left - 2 || px > width - pad.right + 2) return null;
            return (
              <g key={`x-grid-${i}`}>
                {isGridVisible && (
                  <line
                    x1={px}
                    y1={pad.top}
                    x2={px}
                    y2={height - pad.bottom}
                    stroke={tickVal === 0 ? '#94A3B8' : '#F1F5F9'}
                    strokeWidth={tickVal === 0 ? 1.5 : 1}
                    strokeDasharray={tickVal === 0 ? undefined : '3 3'}
                  />
                )}
                {!isGridVisible && tickVal === 0 && (
                  <line
                    x1={px}
                    y1={pad.top}
                    x2={px}
                    y2={height - pad.bottom}
                    stroke="#94A3B8"
                    strokeWidth={1.5}
                  />
                )}
                <line x1={px} y1={height - pad.bottom} x2={px} y2={height - pad.bottom + 4} stroke="#94A3B8" strokeWidth={1} />
                <text
                  x={px}
                  y={height - pad.bottom + 16}
                  textAnchor="middle"
                  className="text-[10px] font-mono tabular-nums fill-neutral-500"
                >
                  {domain === 'discrete' ? tickVal : tickVal.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Axis Labels */}
          <text
            x={width - pad.right + 12}
            y={zeroYPx + 4}
            textAnchor="start"
            className="text-[11px] font-mono font-semibold fill-neutral-700 italic"
          >
            {domain === 'continuous' ? 't' : 'n'}
          </text>
          <text
            x={pad.left}
            y={pad.top - 12}
            textAnchor="start"
            className="text-[11px] font-mono font-semibold fill-neutral-700 italic"
          >
            {domain === 'continuous' ? 'x(t)' : 'x[n]'}
          </text>

          {/* Clipped Plot Graphics */}
          <g clipPath="url(#plotClip)">
            {domain === 'continuous' && (
              <>
                {tracePaths.map((tr) => (tr.areaD ? <path key={`area-${tr.id}`} d={tr.areaD} fill="url(#areaGradient)" /> : null))}
                {tracePaths.map((tr) => (
                  <path
                    key={`line-${tr.id}`}
                    d={tr.d}
                    fill="none"
                    stroke={tr.color}
                    strokeWidth={tr.strokeWidth || 2}
                    strokeDasharray={tr.strokeDasharray}
                    opacity={tr.opacity ?? 1}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </>
            )}

            {domain === 'discrete' && (
              <g>
                {traces
                  .filter((tr) => !hiddenTraceIds.has(tr.id))
                  .map((tr) => (
                    <g key={`stem-group-${tr.id}`} opacity={tr.opacity ?? 1}>
                      {samples.map((s, idx) => {
                        const val = s[tr.key];
                        if (typeof val !== 'number' || isNaN(val)) return null;
                        const px = xToPx(s.x);
                        const py = yToPx(val);
                        const isHovered = hoveredSample?.x === s.x;

                        return (
                          <g key={`stem-${tr.id}-${idx}`}>
                            <line
                              x1={px}
                              y1={zeroYPx}
                              x2={px}
                              y2={py}
                              stroke={tr.color}
                              strokeWidth={isHovered ? 2.5 : 1.75}
                              strokeDasharray={tr.strokeDasharray}
                              strokeLinecap="round"
                            />
                            <circle
                              cx={px}
                              cy={py}
                              r={isHovered ? 4.5 : 3}
                              fill={tr.color}
                              stroke="#FFFFFF"
                              strokeWidth={1.5}
                            />
                          </g>
                        );
                      })}
                    </g>
                  ))}
              </g>
            )}

            {/* Hover Cursor Crosshair */}
            {hoveredSample && mousePos && (
              <g className="pointer-events-none">
                <line
                  x1={mousePos.px}
                  y1={pad.top}
                  x2={mousePos.px}
                  y2={height - pad.bottom}
                  stroke="#78716C"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                />
                {traces
                  .filter((tr) => !hiddenTraceIds.has(tr.id))
                  .map((tr) => {
                    const val = hoveredSample[tr.key];
                    if (typeof val !== 'number' || isNaN(val)) return null;
                    const py = yToPx(val);
                    return <circle key={`hover-point-${tr.id}`} cx={mousePos.px} cy={py} r={4.5} fill={tr.color} stroke="#FFFFFF" strokeWidth={2} />;
                  })}
              </g>
            )}
          </g>

          {/* Border bounding box */}
          <rect x={pad.left} y={pad.top} width={plotWidth} height={plotHeight} fill="none" stroke="#CBD5E1" strokeWidth={1} />
        </svg>

        {/* Hover Coordinate Card */}
        {hoveredSample && mousePos && (
          <div className="absolute top-3 right-4 z-20 pointer-events-none bg-neutral-900/90 text-white backdrop-blur-xs rounded-lg px-3 py-2 text-xs font-mono shadow-md border border-neutral-700/80 flex flex-col gap-1 tabular-nums">
            <div className="flex items-center justify-between gap-4 border-b border-neutral-700 pb-1 text-[11px] text-neutral-300">
              <span className="font-sans font-medium text-neutral-400">Index</span>
              <span className="font-bold text-amber-300">
                {domain === 'continuous' ? `t = ${hoveredSample.x.toFixed(3)} s` : `n = ${hoveredSample.x}`}
              </span>
            </div>
            {traces
              .filter((tr) => !hiddenTraceIds.has(tr.id))
              .map((tr) => {
                const val = hoveredSample[tr.key];
                if (typeof val !== 'number' || isNaN(val)) return null;
                return (
                  <div key={`tooltip-${tr.id}`} className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5 font-sans text-neutral-300">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tr.color }} />
                      {tr.label}:
                    </span>
                    <span className="font-semibold text-white">{val.toFixed(4)}</span>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* Canvas Bottom Status strip */}
      <div className="px-4 sm:px-5 py-2 border-t border-neutral-100 bg-[#FAF9F6] flex flex-wrap items-center justify-between text-xs text-neutral-500 gap-2">
        <div className="flex items-center gap-3">
          <span>Domain: <strong className="font-semibold text-neutral-700">{domain === 'continuous' ? 'Continuous-Time x(t)' : 'Discrete-Time x[n]'}</strong></span>
          <span>·</span>
          <span>Window: <strong className="font-mono text-neutral-700">[-{timeRange}, +{timeRange}]</strong></span>
          <span>·</span>
          <span>Samples: <strong className="font-mono text-neutral-700">{samples.length}</strong></span>
        </div>
        <div className="text-[11px] text-neutral-400">
          {playbackState === 'playing' ? (
            <span className="text-[#C85A32] font-semibold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#C85A32] animate-pulse" />
              Live Horizontal Traveling Motion Active
            </span>
          ) : (
            'Hover cursor over canvas to inspect exact coordinates'
          )}
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   4. Theory Reference Modal
   ========================================================================= */

export const TheoryModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-neutral-100 bg-neutral-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-700">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">Signals & Systems Foundations</h2>
              <p className="text-xs text-neutral-500">Mathematical formulations and evaluation invariants</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 text-xs text-neutral-700 leading-relaxed">
          <section className="p-4 rounded-xl bg-neutral-50/80 border border-neutral-200/80">
            <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-[#C85A32]" /> 1. Even and Odd Decomposition
            </h3>
            <p className="mb-2">Every signal decomposes into an Even component and an Odd component:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-2 font-mono">
              <div className="p-3 bg-white rounded-lg border border-neutral-200">
                <div className="text-[11px] text-[#C85A32] font-bold mb-1">Even Component x_e(t)</div>
                <div className="text-xs font-semibold">x_e(t) = ½ · [ x(t) + x(-t) ]</div>
              </div>
              <div className="p-3 bg-white rounded-lg border border-neutral-200">
                <div className="text-[11px] text-blue-700 font-bold mb-1">Odd Component x_o(t)</div>
                <div className="text-xs font-semibold">x_o(t) = ½ · [ x(t) - x(-t) ]</div>
              </div>
            </div>
            <p className="text-[11px] text-neutral-600">
              <strong>Orthogonality:</strong> ∫ x_e(t)·x_o(t) dt = 0, so E_total = E_even + E_odd.
            </p>
          </section>

          <section className="p-4 rounded-xl bg-neutral-50/80 border border-neutral-200/80">
            <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-[#C85A32]" /> 2. Signal Energy & Power
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-2 font-mono text-xs">
              <div className="p-3 bg-white rounded-lg border border-neutral-200">
                <div className="text-[11px] text-neutral-500 font-sans font-semibold mb-1">Continuous-Time</div>
                <div>E = ∫ |x(t)|² dt</div>
                <div className="mt-1">P = lim (1/2T) ∫ |x(t)|² dt</div>
              </div>
              <div className="p-3 bg-white rounded-lg border border-neutral-200">
                <div className="text-[11px] text-neutral-500 font-sans font-semibold mb-1">Discrete-Time</div>
                <div>E = ∑ |x[n]|²</div>
                <div className="mt-1">P = lim [1/(2N+1)] ∑ |x[n]|²</div>
              </div>
            </div>
          </section>

          <section className="p-4 rounded-xl bg-neutral-50/80 border border-neutral-200/80">
            <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-[#C85A32]" /> 3. Periodicity Criteria
            </h3>
            <p className="text-xs text-neutral-600">
              Continuous sinusoids are always periodic with T₀ = 1/f₀. Discrete sinusoids x[n] = cos(2π f₀ n) are periodic <em>if and only if</em> f₀ is a rational number m/N.
            </p>
          </section>
        </div>

        <div className="px-6 py-3.5 border-t border-neutral-100 bg-neutral-50 flex items-center justify-end">
          <button onClick={onClose} className="px-4 py-1.5 text-xs font-semibold text-white bg-neutral-900 rounded-lg cursor-pointer">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   5. Main Signal Explorer Workspace / Module 04
   ========================================================================= */

export function SignalExplorerWorkspace({ onNavigateHome, onNavigateModule, isInstructorMode }) {
  // Domain & Mode states
  const [domain, setDomain] = useState('continuous');
  const [mode, setMode] = useState('single'); // 'single' (Decomposition), 'operations', 'transformations'
  const [timeRange, setTimeRange] = useState(6);
  const [isTheoryOpen, setIsTheoryOpen] = useState(false);

  // Live Playback Simulation states
  const [playbackState, setPlaybackState] = useState('paused'); // 'playing' | 'paused' | 'reset'
  const [speed, setSpeed] = useState('1×');
  const [isGridVisible, setIsGridVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [animOffset, setAnimOffset] = useState(0);
  const lastTimestampRef = useRef(null);

  // Sub-view options for decomposition
  const [decompLayout, setDecompLayout] = useState('combined'); // 'combined' | 'stacked'
  const [showSumReconstruction, setShowSumReconstruction] = useState(false);

  // Primary signal configuration
  const [config, setConfig] = useState({
    id: 'sig_1',
    name: 'Primary Signal',
    waveform: 'sinusoid',
    subType: 'cos',
    amplitude: 2,
    frequency: 0.5,
    phase: 0,
    timeShift: 0,
    decayRate: 0.5,
    pulseWidth: 2,
    color: '#C85A32',
  });

  // Secondary operand configuration for operations mode
  const [config2, setConfig2] = useState({
    id: 'sig_2',
    name: 'Secondary Signal',
    waveform: 'sinusoid',
    subType: 'cos',
    amplitude: 1.5,
    frequency: 1.2,
    phase: 0,
    timeShift: 0,
    decayRate: 0.5,
    pulseWidth: 2,
    color: '#2563EB',
  });

  const [operation, setOperation] = useState('add');

  // Transformations configuration
  const [transform, setTransform] = useState({
    amplitudeScale: 1.5,
    timeScale: 1.5,
    timeShift: 1.0,
    timeReversal: false,
  });

  // Live Simulation horizontal wave propagation animation loop
  useEffect(() => {
    let animationFrameId;

    if (playbackState === 'playing') {
      const speedMap = {
        '0.25×': 0.25,
        '0.5×': 0.5,
        '1×': 1.0,
        '2×': 2.0,
        '4×': 4.0,
      };
      const mult = speedMap[speed] ?? 1.0;

      const animate = (timestamp) => {
        if (lastTimestampRef.current != null) {
          const dt = (timestamp - lastTimestampRef.current) / 1000;
          // Smooth propagation speed: 1.8 units/sec * speed multiplier
          setAnimOffset((prev) => {
            const next = prev + dt * 1.8 * mult;
            // For periodic sinusoids, phase cycles continuously.
            // For transient waveforms, wrap around so it loops through the window smoothly
            if (config.waveform !== 'sinusoid' && next > timeRange + 4) {
              return -timeRange - 4;
            }
            return next;
          });
        }
        lastTimestampRef.current = timestamp;
        animationFrameId = requestAnimationFrame(animate);
      };

      lastTimestampRef.current = performance.now();
      animationFrameId = requestAnimationFrame(animate);
    } else {
      lastTimestampRef.current = null;
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [playbackState, speed, config.waveform, timeRange]);

  // Escape key handler to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Compute live samples evaluated at (t - animOffset)
  const samples = useMemo(() => {
    const pointCount = domain === 'continuous' ? 450 : 2 * timeRange + 1;
    return generateSignalSamples(config, domain, timeRange, pointCount, transform, config2, operation, animOffset);
  }, [config, domain, timeRange, transform, config2, operation, animOffset]);

  // Augmented samples for even/odd sum reconstruction check
  const augmentedSamples = useMemo(() => {
    return samples.map((s) => ({
      ...s,
      yReconstructed: (s.yEven ?? 0) + (s.yOdd ?? 0),
    }));
  }, [samples]);

  // Compute metrics
  const metrics = useMemo(() => computeSignalMetrics(config, domain, samples), [config, domain, samples]);

  // Playback handlers
  const handlePlay = () => {
    setPlaybackState('playing');
  };

  const handlePause = () => {
    setPlaybackState('paused');
  };

  const handleResetSimulation = () => {
    setPlaybackState('paused');
    setAnimOffset(0);
  };

  const handleFullReset = () => {
    handleResetSimulation();
    setConfig({
      id: 'sig_1',
      name: 'Primary Signal',
      waveform: 'sinusoid',
      subType: 'cos',
      amplitude: 2,
      frequency: 0.5,
      phase: 0,
      timeShift: 0,
      decayRate: 0.5,
      pulseWidth: 2,
      color: '#C85A32',
    });
    setTransform({ amplitudeScale: 1, timeScale: 1, timeShift: 0, timeReversal: false });
    setTimeRange(6);
  };

  const handleSelectPreset = (presetId) => {
    const preset = PRESET_SIGNALS.find((p) => p.id === presetId);
    if (!preset) return;
    setDomain(preset.domain);
    setConfig(preset.config);
    if (preset.config2) setConfig2(preset.config2);
    if (preset.operation) setOperation(preset.operation);
    if (preset.transform) setTransform(preset.transform);
    if (preset.defaultMode) setMode(preset.defaultMode);
    handleResetSimulation();
  };

  const domVar = domain === 'continuous' ? 't' : 'n';

  const opSymbols = {
    add: { name: 'Addition (Superposition)', symbol: '+' },
    multiply: { name: 'Multiplication (Modulation)', symbol: '×' },
    subtract: { name: 'Subtraction (Differential)', symbol: '−' },
  };

  const reversalSign = transform.timeReversal ? '-' : '';
  const scaleStr = transform.timeScale === 1 ? '' : `${transform.timeScale}`;
  const shiftStr =
    transform.timeShift === 0
      ? ''
      : transform.timeShift > 0
      ? ` - ${transform.timeShift}`
      : ` + ${Math.abs(transform.timeShift)}`;
  const transformedExpr = `y(${domVar}) = ${transform.amplitudeScale !== 1 ? `${transform.amplitudeScale} · ` : ''}x(${scaleStr}${reversalSign}${domVar}${shiftStr})`;

  const waveformsList = [
    { id: 'sinusoid', label: 'Sinusoid', notation: `${config.subType ?? 'cos'}(ω${domVar})` },
    { id: 'unit_step', label: 'Unit Step', notation: `u(${domVar})` },
    { id: 'impulse', label: 'Impulse', notation: `δ(${domVar})` },
    { id: 'ramp', label: 'Ramp', notation: `r(${domVar})` },
    { id: 'exponential', label: 'Exponential', notation: `e^{-σ${domVar}}` },
    { id: 'rectangular', label: 'Rectangular', notation: `rect(${domVar})` },
    { id: 'triangular', label: 'Triangular', notation: `Λ(${domVar})` },
    { id: 'sinc', label: 'Sinc Pulse', notation: `sinc(${domVar})` },
  ];

  return (
    <div className="w-full text-neutral-900 flex flex-col antialiased">
      {/* Top Header */}
      <header className="bg-white rounded-xl border border-neutral-200/90 shadow-2xs px-5 py-3 mb-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 shrink-0">
          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200/80 rounded-lg transition-colors cursor-pointer"
              title="Return to Workspace Hub"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Hub</span>
            </button>
          )}
          <span className="text-xs font-mono font-bold tracking-wider text-[#C85A32] bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/20">
            MODULE 04
          </span>
          <h2 className="text-base font-bold tracking-tight text-neutral-900">
            Signal Explorer
          </h2>
          <span className="hidden sm:inline-block text-xs text-neutral-400 font-mono">/ Signals & Systems</span>
        </div>

        {/* Workspace Mode Tabs */}
        <nav className="flex items-center gap-1.5 p-1 bg-neutral-100 rounded-lg border border-neutral-200/60 text-xs font-medium">
          <button
            onClick={() => setMode('single')}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              mode === 'single' ? 'bg-white text-neutral-900 font-semibold shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-[#C85A32]" />
            <span>Decomposition</span>
          </button>
          <button
            onClick={() => setMode('operations')}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              mode === 'operations' ? 'bg-white text-neutral-900 font-semibold shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#C85A32]" />
            <span>Operations</span>
          </button>
          <button
            onClick={() => setMode('transformations')}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              mode === 'transformations' ? 'bg-white text-neutral-900 font-semibold shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-[#C85A32]" />
            <span>Transformations</span>
          </button>
        </nav>

        {/* Domain Switcher & Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-neutral-100 p-0.5 rounded-lg border border-neutral-200/60">
            <button
              onClick={() => { setDomain('continuous'); handleResetSimulation(); }}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                domain === 'continuous' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Continuous x(t)
            </button>
            <button
              onClick={() => { setDomain('discrete'); handleResetSimulation(); }}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                domain === 'discrete' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              Discrete x[n]
            </button>
          </div>

          <button
            onClick={() => setIsTheoryOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200/80 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#C85A32]" />
            <span>Theory</span>
          </button>
          <button
            onClick={handleFullReset}
            title="Reset All Parameters"
            className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* =========================================================================
         TOP SECTION: HERO LIVE SIMULATION STAGE (Immediate Viewport Presence!)
         Teacher doesn't have to scroll down to view or play the simulation!
         ========================================================================= */}
      <section
        className={`bg-white rounded-xl border border-neutral-200/90 shadow-2xs overflow-hidden transition-all duration-200 ${
          isFullscreen
            ? 'fixed inset-0 z-50 bg-[#FAF9F6] p-4 sm:p-6 overflow-y-auto flex flex-col'
            : 'mb-6'
        }`}
      >
        {/* Fullscreen Mode Top Banner */}
        {isFullscreen && (
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-neutral-200 shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-wider text-[#C85A32] bg-[#FBF4F0] px-2.5 py-0.5 rounded border border-[#C85A32]/20">
                MODULE 04 FULLSCREEN SIMULATION LAB
              </span>
              <span className="text-sm font-bold text-neutral-900">
                Live Signal Propagation & Analysis
              </span>
            </div>
            <button
              onClick={() => setIsFullscreen(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer shadow-sm"
            >
              Exit Fullscreen <kbd className="text-[10px] text-neutral-400 font-mono ml-1">Esc</kbd>
            </button>
          </div>
        )}

        {/* 1. The Live Simulation Control Toolbar (Matches Screenshot: Play, Pause, Reset, Speed, Grid, Fullscreen) */}
        <div className="p-3 sm:p-4 bg-[#FAF9F6] border-b border-neutral-200/80 flex flex-col gap-3">
          <SimulationToolbar
            playbackState={playbackState}
            onPlay={handlePlay}
            onPause={handlePause}
            onReset={handleResetSimulation}
            speed={speed}
            onSpeedChange={(newSpeed) => setSpeed(newSpeed)}
            isGridVisible={isGridVisible}
            onToggleGrid={() => setIsGridVisible(!isGridVisible)}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
            isLiveSimulationReady={true}
            className="w-full shadow-2xs"
          />

          {/* Quick Waveform / Presets Strip on the Simulation Stage */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
            {/* Left: Waveforms Quick Switcher */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-mono uppercase tracking-wider text-neutral-500 font-semibold mr-1">
                Waveform:
              </span>
              {waveformsList.map((wf) => {
                const isSelected = config.waveform === wf.id;
                return (
                  <button
                    key={wf.id}
                    onClick={() => {
                      setConfig((prev) => ({ ...prev, waveform: wf.id }));
                      handleResetSimulation();
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#C85A32] text-white font-semibold shadow-2xs'
                        : 'bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-100 hover:text-neutral-900'
                    }`}
                  >
                    <span>{wf.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Right: Live Motion Status Badge */}
            <div className="flex items-center gap-2">
              {playbackState === 'playing' ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300 shadow-2xs animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-600" />
                  <span>LIVE MOTION ({speed}): t = +{animOffset.toFixed(2)}s</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono text-neutral-500 bg-neutral-100 border border-neutral-200">
                  <Pause className="w-3 h-3 text-neutral-400" />
                  <span>Simulation Paused</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 2. Interactive Primary Simulation Canvas (Top & Center) */}
        <div className="p-3 sm:p-4 bg-white flex-1 flex flex-col">
          {mode === 'single' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-1">
                <div className="text-xs text-neutral-600">
                  <span className="font-semibold text-neutral-900">Decomposition: </span>
                  <code className="bg-neutral-100 px-1.5 py-0.5 rounded font-mono text-[#C85A32]">x({domVar}) = x_e({domVar}) + x_o({domVar})</code>
                  <span className="ml-2 text-neutral-400 hidden sm:inline">· Dynamic traveling motion calculates instantaneous symmetry</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setDecompLayout(decompLayout === 'combined' ? 'stacked' : 'combined')}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-md text-neutral-700 cursor-pointer"
                  >
                    <Split className="w-3.5 h-3.5 text-neutral-500" />
                    <span>{decompLayout === 'combined' ? 'Show 3-Pane Breakdown' : 'Show Overlaid View'}</span>
                  </button>
                  <button
                    onClick={() => setShowSumReconstruction(!showSumReconstruction)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-all cursor-pointer ${
                      showSumReconstruction
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Reconstruction Check</span>
                  </button>
                </div>
              </div>

              {decompLayout === 'combined' ? (
                <SignalCanvas
                  title={`Signal Decomposition Canvas: x(${domVar}) with Even & Odd Components`}
                  subtitle="Live horizontal motion active when played · Toggle trace visibility in legend"
                  domain={domain}
                  samples={augmentedSamples}
                  timeRange={timeRange}
                  onZoomChange={setTimeRange}
                  isGridVisible={isGridVisible}
                  playbackState={playbackState}
                  animOffset={animOffset}
                  height={isFullscreen ? 520 : 380}
                  traces={[
                    { id: 'main', label: `Original x(${domVar})`, key: 'y', color: '#C85A32', strokeWidth: 2.5 },
                    { id: 'even', label: `Even x_e(${domVar})`, key: 'yEven', color: '#D97706', strokeWidth: 2, strokeDasharray: '5 3' },
                    { id: 'odd', label: `Odd x_o(${domVar})`, key: 'yOdd', color: '#2563EB', strokeWidth: 2, strokeDasharray: '3 3' },
                    ...(showSumReconstruction
                      ? [{ id: 'reconstructed', label: 'x_e + x_o Sum', key: 'yReconstructed', color: '#059669', strokeWidth: 2, strokeDasharray: '2 4' }]
                      : []),
                  ]}
                />
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  <SignalCanvas
                    title={`1. Original Signal: x(${domVar})`}
                    domain={domain}
                    samples={samples}
                    timeRange={timeRange}
                    onZoomChange={setTimeRange}
                    isGridVisible={isGridVisible}
                    playbackState={playbackState}
                    animOffset={animOffset}
                    height={200}
                    traces={[{ id: 'main', label: `x(${domVar})`, key: 'y', color: '#C85A32', strokeWidth: 2.2 }]}
                  />
                  <SignalCanvas
                    title={`2. Even Component: x_e(${domVar}) = ½ · [ x(${domVar}) + x(-${domVar}) ]`}
                    domain={domain}
                    samples={samples}
                    timeRange={timeRange}
                    onZoomChange={setTimeRange}
                    isGridVisible={isGridVisible}
                    playbackState={playbackState}
                    animOffset={animOffset}
                    height={200}
                    traces={[{ id: 'even', label: `x_e(${domVar})`, key: 'yEven', color: '#D97706', strokeWidth: 2.2 }]}
                  />
                  <SignalCanvas
                    title={`3. Odd Component: x_o(${domVar}) = ½ · [ x(${domVar}) - x(-${domVar}) ]`}
                    domain={domain}
                    samples={samples}
                    timeRange={timeRange}
                    onZoomChange={setTimeRange}
                    isGridVisible={isGridVisible}
                    playbackState={playbackState}
                    animOffset={animOffset}
                    height={200}
                    traces={[{ id: 'odd', label: `x_o(${domVar})`, key: 'yOdd', color: '#2563EB', strokeWidth: 2.2 }]}
                  />
                </div>
              )}
            </div>
          )}

          {mode === 'operations' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
                <div className="text-xs text-neutral-600">
                  <span className="font-semibold text-neutral-900">Composite Arithmetic: </span>
                  <code className="bg-neutral-100 px-1.5 py-0.5 rounded font-mono text-[#C85A32]">
                    y({domVar}) = x₁({domVar}) {opSymbols[operation].symbol} x₂({domVar})
                  </code>
                </div>

                <div className="flex items-center gap-1.5 p-1 bg-neutral-100 rounded-lg border border-neutral-200/60">
                  <button
                    onClick={() => setOperation('add')}
                    className={`flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      operation === 'add' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5 text-[#C85A32]" />
                    <span>Addition (+)</span>
                  </button>
                  <button
                    onClick={() => setOperation('multiply')}
                    className={`flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      operation === 'multiply' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <MultiplyIcon className="w-3.5 h-3.5 text-blue-600" />
                    <span>Multiplication (×)</span>
                  </button>
                  <button
                    onClick={() => setOperation('subtract')}
                    className={`flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      operation === 'subtract' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
                    }`}
                  >
                    <Minus className="w-3.5 h-3.5 text-rose-600" />
                    <span>Subtraction (−)</span>
                  </button>
                </div>
              </div>

              <SignalCanvas
                title={`Resulting Composite Signal: y(${domVar}) = x₁(${domVar}) ${opSymbols[operation].symbol} x₂(${domVar})`}
                subtitle="Live animated horizontal motion simulates traveling waveforms and beat interference"
                domain={domain}
                samples={samples}
                timeRange={timeRange}
                onZoomChange={setTimeRange}
                isGridVisible={isGridVisible}
                playbackState={playbackState}
                animOffset={animOffset}
                height={isFullscreen ? 520 : 380}
                traces={[
                  { id: 'combined', label: `Result y(${domVar})`, key: 'yCombined', color: '#C85A32', strokeWidth: 2.75 },
                  { id: 'sig1', label: `Operand 1: x₁(${domVar})`, key: 'y', color: '#2563EB', strokeWidth: 1.75, strokeDasharray: '4 3', opacity: 0.85 },
                  { id: 'sig2', label: `Operand 2: x₂(${domVar})`, key: 'y2', color: '#059669', strokeWidth: 1.75, strokeDasharray: '2 2', opacity: 0.85 },
                ]}
              />
            </div>
          )}

          {mode === 'transformations' && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
                <div className="text-xs text-neutral-600">
                  <span className="font-semibold text-neutral-900">Transformed Signal: </span>
                  <code className="bg-neutral-100 px-1.5 py-0.5 rounded font-mono text-[#C85A32]">
                    {transformedExpr}
                  </code>
                </div>
                <button
                  onClick={() => setTransform({ amplitudeScale: 1, timeScale: 1, timeShift: 0, timeReversal: false })}
                  className="flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-neutral-700 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 rounded-lg cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3 text-neutral-500" />
                  <span>Reset Identity</span>
                </button>
              </div>

              <SignalCanvas
                title={`Transformed Waveform: ${transformedExpr}`}
                subtitle="Compare transformed signal against original reference signal (dashed)"
                domain={domain}
                samples={samples}
                timeRange={timeRange}
                onZoomChange={setTimeRange}
                isGridVisible={isGridVisible}
                playbackState={playbackState}
                animOffset={animOffset}
                height={isFullscreen ? 520 : 380}
                traces={[
                  { id: 'transformed', label: `Transformed y(${domVar})`, key: 'yTransformed', color: '#C85A32', strokeWidth: 2.75 },
                  { id: 'original', label: `Original Reference x(${domVar})`, key: 'y', color: '#94A3B8', strokeWidth: 1.75, strokeDasharray: '4 4', opacity: 0.8 },
                ]}
              />
            </div>
          )}
        </div>
      </section>

      {/* =========================================================================
         BOTTOM SECTION: THE OTHER STUFF BELOW THE SIMULATION CANVAS
         All interactive parameters, metrics cards, theory, and diagnostics.
         ========================================================================= */}
      <div className="w-full flex flex-col gap-6">
        {/* Row 1: Direct Parameter Controls */}
        <section className="bg-white rounded-xl border border-neutral-200/90 p-4.5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#C85A32]" />
              <h3 className="text-sm font-bold text-neutral-900">
                {mode === 'single' && 'Primary Signal Parameters'}
                {mode === 'operations' && 'Dual Operands Configuration'}
                {mode === 'transformations' && 'Transformation Variables'}
              </h3>
            </div>
            <span className="text-xs font-mono text-neutral-500 font-semibold">{metrics.formula}</span>
          </div>

          {/* Mode 1 Parameters: Single Signal */}
          {mode === 'single' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* Amplitude */}
              <div className="p-3 bg-neutral-50/70 rounded-lg border border-neutral-200/70">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-neutral-700">Amplitude (A)</span>
                  <span className="font-mono font-bold text-[#C85A32]">{config.amplitude}</span>
                </div>
                <input
                  type="range" min="0" max="5" step="0.1" value={config.amplitude}
                  onChange={(e) => setConfig({ ...config, amplitude: parseFloat(e.target.value) })}
                  className="w-full accent-[#C85A32] cursor-pointer"
                />
              </div>

              {/* Frequency */}
              {['sinusoid', 'sinc'].includes(config.waveform) && (
                <div className="p-3 bg-neutral-50/70 rounded-lg border border-neutral-200/70">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-neutral-700">Frequency (f)</span>
                    <span className="font-mono font-bold text-[#C85A32]">{config.frequency} Hz</span>
                  </div>
                  <input
                    type="range" min="0.05" max="3" step="0.05" value={config.frequency}
                    onChange={(e) => setConfig({ ...config, frequency: parseFloat(e.target.value) })}
                    className="w-full accent-[#C85A32] cursor-pointer"
                  />
                </div>
              )}

              {/* Pulse Width or Decay Rate if applicable */}
              {['rectangular', 'triangular'].includes(config.waveform) && (
                <div className="p-3 bg-neutral-50/70 rounded-lg border border-neutral-200/70">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-neutral-700">Pulse Width (Tw)</span>
                    <span className="font-mono font-bold text-[#C85A32]">{config.pulseWidth || 2}</span>
                  </div>
                  <input
                    type="range" min="0.5" max="6" step="0.5" value={config.pulseWidth || 2}
                    onChange={(e) => setConfig({ ...config, pulseWidth: parseFloat(e.target.value) })}
                    className="w-full accent-[#C85A32] cursor-pointer"
                  />
                </div>
              )}

              {config.waveform === 'exponential' && (
                <div className="p-3 bg-neutral-50/70 rounded-lg border border-neutral-200/70">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-semibold text-neutral-700">Decay Rate (σ)</span>
                    <span className="font-mono font-bold text-[#C85A32]">{config.decayRate || 0.5}</span>
                  </div>
                  <input
                    type="range" min="0.1" max="2" step="0.1" value={config.decayRate || 0.5}
                    onChange={(e) => setConfig({ ...config, decayRate: parseFloat(e.target.value) })}
                    className="w-full accent-[#C85A32] cursor-pointer"
                  />
                </div>
              )}

              {/* Time Shift */}
              <div className="p-3 bg-neutral-50/70 rounded-lg border border-neutral-200/70">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-neutral-700">Time Shift ({domVar}₀)</span>
                  <span className="font-mono font-bold text-[#C85A32]">{config.timeShift} s</span>
                </div>
                <input
                  type="range" min="-5" max="5" step={domain === 'continuous' ? 0.2 : 1} value={config.timeShift}
                  onChange={(e) => setConfig({ ...config, timeShift: parseFloat(e.target.value) })}
                  className="w-full accent-[#C85A32] cursor-pointer"
                />
              </div>

              {/* Time Window */}
              <div className="p-3 bg-neutral-50/70 rounded-lg border border-neutral-200/70">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="font-semibold text-neutral-700">Window Range (±T)</span>
                  <span className="font-mono font-bold text-neutral-800">[-{timeRange}, +{timeRange}]</span>
                </div>
                <input
                  type="range" min="3" max="20" step="1" value={timeRange}
                  onChange={(e) => setTimeRange(parseInt(e.target.value, 10))}
                  className="w-full accent-neutral-800 cursor-pointer"
                />
              </div>
            </div>
          )}

          {/* Mode 2 Parameters: Operations (Dual Signals) */}
          {mode === 'operations' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Operand 1 */}
              <div className="p-3.5 bg-neutral-50/70 rounded-lg border border-neutral-200/70 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-200/60">
                  <span className="font-bold text-blue-700 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    Operand 1: x₁({domVar})
                  </span>
                  <span className="font-mono text-neutral-500 uppercase">{config.waveform}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-neutral-600 block mb-1">Amplitude A₁: {config.amplitude}</label>
                    <input
                      type="range" min="0.2" max="4" step="0.1" value={config.amplitude}
                      onChange={(e) => setConfig({ ...config, amplitude: parseFloat(e.target.value) })}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-neutral-600 block mb-1">Frequency f₁: {config.frequency} Hz</label>
                    <input
                      type="range" min="0.1" max="4" step="0.1" value={config.frequency}
                      onChange={(e) => setConfig({ ...config, frequency: parseFloat(e.target.value) })}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* Operand 2 */}
              <div className="p-3.5 bg-neutral-50/70 rounded-lg border border-neutral-200/70 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-neutral-200/60">
                  <span className="font-bold text-emerald-700 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    Operand 2: x₂({domVar})
                  </span>
                  <span className="font-mono text-neutral-500 uppercase">{config2.waveform}</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-neutral-600 block mb-1">Amplitude A₂: {config2.amplitude}</label>
                    <input
                      type="range" min="0.2" max="4" step="0.1" value={config2.amplitude}
                      onChange={(e) => setConfig2({ ...config2, amplitude: parseFloat(e.target.value) })}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="text-neutral-600 block mb-1">Frequency f₂: {config2.frequency} Hz</label>
                    <input
                      type="range" min="0.1" max="4" step="0.1" value={config2.frequency}
                      onChange={(e) => setConfig2({ ...config2, frequency: parseFloat(e.target.value) })}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mode 3 Parameters: Transformations */}
          {mode === 'transformations' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* Amplitude Scale */}
              <div className="p-3 bg-neutral-50/70 rounded-lg border border-neutral-200/70">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-neutral-700">Amplitude Scale (a)</span>
                  <span className="font-mono font-bold text-[#C85A32]">{transform.amplitudeScale.toFixed(2)}</span>
                </div>
                <input
                  type="range" min="0.1" max="3" step="0.1" value={transform.amplitudeScale}
                  onChange={(e) => setTransform({ ...transform, amplitudeScale: parseFloat(e.target.value) })}
                  className="w-full accent-[#C85A32] cursor-pointer"
                />
              </div>

              {/* Time Scale */}
              <div className="p-3 bg-neutral-50/70 rounded-lg border border-neutral-200/70">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-neutral-700">Time Scaling (b)</span>
                  <span className="font-mono font-bold text-[#C85A32]">{transform.timeScale.toFixed(2)}</span>
                </div>
                <input
                  type="range" min="0.25" max="3" step="0.25" value={transform.timeScale}
                  onChange={(e) => setTransform({ ...transform, timeScale: parseFloat(e.target.value) })}
                  className="w-full accent-[#C85A32] cursor-pointer"
                />
              </div>

              {/* Time Shift */}
              <div className="p-3 bg-neutral-50/70 rounded-lg border border-neutral-200/70">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-neutral-700">Time Shift ({domVar}₀)</span>
                  <span className="font-mono font-bold text-[#C85A32]">{transform.timeShift}</span>
                </div>
                <input
                  type="range" min="-5" max="5" step="0.5" value={transform.timeShift}
                  onChange={(e) => setTransform({ ...transform, timeShift: parseFloat(e.target.value) })}
                  className="w-full accent-[#C85A32] cursor-pointer"
                />
              </div>

              {/* Time Reversal */}
              <div className="p-3 bg-neutral-50/70 rounded-lg border border-neutral-200/70 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-neutral-700">Time Reversal x(-t)</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${transform.timeReversal ? 'bg-amber-100 text-amber-900 font-mono' : 'bg-neutral-200 text-neutral-600'}`}>
                    {transform.timeReversal ? 'ON' : 'OFF'}
                  </span>
                </div>
                <button
                  onClick={() => setTransform({ ...transform, timeReversal: !transform.timeReversal })}
                  className={`w-full py-1.5 px-3 text-xs font-semibold rounded-md border transition-all cursor-pointer ${
                    transform.timeReversal ? 'bg-[#C85A32] text-white border-[#C85A32]' : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                  }`}
                >
                  {transform.timeReversal ? 'Reflection Active' : 'Toggle Inversion'}
                </button>
              </div>
            </div>
          )}

          {/* Textbook Presets Selector Strip */}
          <div className="mt-4 pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#C85A32]" />
              <span className="font-semibold text-neutral-700">Curated Presets:</span>
              <select
                onChange={(e) => handleSelectPreset(e.target.value)}
                defaultValue=""
                className="bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-1.5 text-xs font-medium text-neutral-800 cursor-pointer"
              >
                <option value="" disabled>Select a textbook preset...</option>
                {PRESET_SIGNALS.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="text-[11px] text-neutral-400 font-mono">
              Adjust sliders above to observe real-time dynamic response
            </div>
          </div>
        </section>

        {/* Row 2: Metrics & Diagnostic Cards */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Periodicity */}
          <div className="bg-white rounded-xl border border-neutral-200/90 p-4.5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <Activity className="w-3.5 h-3.5 text-[#C85A32]" /> Periodicity
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${metrics.isPeriodic ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-neutral-100 text-neutral-600 border border-neutral-200'}`}>
                  {metrics.isPeriodic ? 'PERIODIC' : 'APERIODIC'}
                </span>
              </div>

              <div className="mt-2">
                {metrics.isPeriodic ? (
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-baseline justify-between">
                      <span className="text-neutral-600">Period ({domain === 'continuous' ? 'T₀' : 'N'}):</span>
                      <span className="font-mono text-sm font-bold text-neutral-900 tabular-nums">
                        {metrics.fundamentalPeriod} {domain === 'continuous' ? 's' : 'samples'}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-neutral-600">Freq (f₀):</span>
                      <span className="font-mono text-xs font-bold text-neutral-900 tabular-nums">
                        {metrics.fundamentalFreq} {domain === 'continuous' ? 'Hz' : 'cyc/sample'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="py-2 text-xs text-neutral-500">Transient or unilateral response.</div>
                )}
              </div>
            </div>
          </div>

          {/* Energy */}
          <div className="bg-white rounded-xl border border-neutral-200/90 p-4.5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <Zap className="w-3.5 h-3.5 text-[#C85A32]" /> Energy (E)
                </span>
                <span className="font-mono text-xs font-bold text-neutral-700 bg-neutral-100 px-1.5 py-0.5 rounded">
                  {domain === 'continuous' ? '∫|x(t)|²dt' : '∑|x[n]|²'}
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-neutral-900 tabular-nums mt-1">
                {metrics.energy} <span className="text-xs font-normal text-neutral-500">Joules</span>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-neutral-100 flex items-center justify-between text-[11px]">
              <span className="text-neutral-500">Even:</span>
              <span className="font-mono font-bold text-[#C85A32]">{metrics.evenEnergy} J</span>
              <span className="text-neutral-300">·</span>
              <span className="text-neutral-500">Odd:</span>
              <span className="font-mono font-bold text-blue-700">{metrics.oddEnergy} J</span>
            </div>
          </div>

          {/* Power */}
          <div className="bg-white rounded-xl border border-neutral-200/90 p-4.5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <Compass className="w-3.5 h-3.5 text-[#C85A32]" /> Power (P)
                </span>
                <span className="font-mono text-xs font-bold text-neutral-700 bg-neutral-100 px-1.5 py-0.5 rounded">Watts</span>
              </div>
              <div className="text-2xl font-bold font-mono text-neutral-900 tabular-nums mt-1">
                {metrics.power} <span className="text-xs font-normal text-neutral-500">Watts</span>
              </div>
              <div className="mt-1.5 inline-block text-xs font-semibold text-[#C85A32] bg-[#FBF4F0] border border-[#C85A32]/20 px-2 py-0.5 rounded">
                {metrics.classification}
              </div>
            </div>
          </div>

          {/* Symmetry */}
          <div className="bg-white rounded-xl border border-neutral-200/90 p-4.5 shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <Code2 className="w-3.5 h-3.5 text-[#C85A32]" /> Symmetry
                </span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${metrics.symmetry === 'Purely Even' ? 'bg-[#FBF4F0] text-[#C85A32] border border-[#C85A32]/30' : metrics.symmetry === 'Purely Odd' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-neutral-100 text-neutral-700 border border-neutral-200'}`}>
                  {metrics.symmetry}
                </span>
              </div>
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-600">Even:</span>
                  <span className="font-mono font-bold text-[#C85A32]">{metrics.evenEnergyRatio}%</span>
                </div>
                <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden flex">
                  <div className="bg-[#C85A32] h-full" style={{ width: `${metrics.evenEnergyRatio}%` }} />
                  <div className="bg-blue-600 h-full" style={{ width: `${metrics.oddEnergyRatio}%` }} />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-600">Odd:</span>
                  <span className="font-mono font-bold text-blue-700">{metrics.oddEnergyRatio}%</span>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2.5 border-t border-neutral-100 text-[11px] font-mono text-neutral-600 truncate">
              {metrics.formula}
            </div>
          </div>
        </section>

        {/* Row 3: In-Depth Educational Analysis & Orthogonality Theorem */}
        <section className="bg-white rounded-xl border border-neutral-200/90 p-5 shadow-2xs">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-[#C85A32]" />
            <h4 className="text-sm font-bold text-neutral-900">Decomposition Properties & Orthogonality Theorem</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 bg-neutral-50/80 rounded-lg border border-neutral-200/60 flex flex-col justify-between">
              <div>
                <div className="font-semibold text-neutral-800 mb-1 flex items-center justify-between">
                  <span>Even Component x_e({domVar})</span>
                  <span className="font-mono text-[#C85A32] font-bold">{metrics.evenEnergyRatio}% energy</span>
                </div>
                <p className="text-neutral-600 leading-relaxed">
                  Reflective across vertical axis: <code className="font-mono text-neutral-800">x_e({domVar}) = x_e(-{domVar})</code>. Calculated Energy: <span className="font-mono font-semibold">{metrics.evenEnergy}</span> J.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-neutral-200/60 font-mono text-[11px] text-neutral-500">
                Formula: ½·[x({domVar}) + x(-{domVar})]
              </div>
            </div>

            <div className="p-3.5 bg-neutral-50/80 rounded-lg border border-neutral-200/60 flex flex-col justify-between">
              <div>
                <div className="font-semibold text-neutral-800 mb-1 flex items-center justify-between">
                  <span>Odd Component x_o({domVar})</span>
                  <span className="font-mono text-blue-700 font-bold">{metrics.oddEnergyRatio}% energy</span>
                </div>
                <p className="text-neutral-600 leading-relaxed">
                  Point symmetric about origin: <code className="font-mono text-neutral-800">x_o(-{domVar}) = -x_o({domVar})</code>. Calculated Energy: <span className="font-mono font-semibold">{metrics.oddEnergy}</span> J.
                </p>
              </div>
              <div className="mt-3 pt-2 border-t border-neutral-200/60 font-mono text-[11px] text-neutral-500">
                Formula: ½·[x({domVar}) - x(-{domVar})]
              </div>
            </div>

            <div className="p-3.5 bg-[#FBF4F0] rounded-lg border border-[#C85A32]/20 flex flex-col justify-between">
              <div>
                <div className="font-semibold text-neutral-900 mb-1">Orthogonality & Energy Conservation</div>
                <p className="text-neutral-700 leading-relaxed">
                  Because cross-product is odd, <code className="font-mono text-neutral-900 font-bold">∫ x_e({domVar})·x_o({domVar}) d{domVar} = 0</code>.
                </p>
                <div className="mt-2 font-mono font-bold text-[#C85A32] text-[11px] bg-white px-2 py-1 rounded border border-[#C85A32]/20">
                  E_total = E_even + E_odd = {(metrics.evenEnergy + metrics.oddEnergy).toFixed(2)} J
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-[#C85A32]/20 text-[11px] text-neutral-600">
                Symmetry Verdict: <span className="font-semibold text-neutral-900">{metrics.symmetry}</span>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Footer Info */}
      <footer className="mt-8 border-t border-neutral-200/80 bg-white py-3.5 px-5 rounded-xl text-xs text-neutral-500 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-neutral-800">Module 04: Signal Explorer</span>
          <span>·</span>
          <span>Signals and Systems Interactive Workspace</span>
        </div>
        <div className="text-[11px] font-mono text-neutral-400">
          Continuous / Discrete · Decomposition · Operations · Transformations · Live Simulation
        </div>
      </footer>

      {/* Theory Reference Modal */}
      <TheoryModal isOpen={isTheoryOpen} onClose={() => setIsTheoryOpen(false)} />
    </div>
  );
}

export default function Module4_SignalExplorer(props) {
  return <SignalExplorerWorkspace {...props} />;
}
