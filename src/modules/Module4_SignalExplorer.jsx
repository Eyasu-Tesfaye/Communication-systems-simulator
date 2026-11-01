/**
 * Module 4: Signal Explorer Workspace
 * Interactive Continuous & Discrete Signal Analysis, Even/Odd Decomposition,
 * Signal Operations (Superposition & Modulation), and Transformations.
 */

import React, { useRef, useState, useMemo, useCallback } from 'react';
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
} from 'lucide-react';

/* =========================================================================
   1. Domain-Specific Types & Mathematical Models
   ========================================================================= */

const EPSILON = 1e-6;

export function evaluateSignal(config, t, domain) {
  const { waveform, amplitude, frequency, phase = 0, timeShift = 0, decayRate = 0.5, pulseWidth = 2, subType = 'cos' } = config;
  const tau = t - timeShift;

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

    case 'damped_sinusoid': {
      if (tau < 0) return 0;
      const omega = 2 * Math.PI * frequency;
      const angle = omega * tau + phase;
      const osc = subType === 'sin' ? Math.sin(angle) : Math.cos(angle);
      return amplitude * Math.exp(-decayRate * tau) * osc;
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

export function evaluateTransformedSignal(config, transform, t, domain) {
  const { amplitudeScale, timeScale, timeShift, timeReversal } = transform;
  const reversalSign = timeReversal ? -1 : 1;
  const internalT = reversalSign * (timeScale * t) - timeShift;
  const rawVal = evaluateSignal(config, internalT, domain);
  return amplitudeScale * rawVal;
}

export function evaluateOperation(config1, config2, op, t, domain) {
  const y1 = evaluateSignal(config1, t, domain);
  const y2 = evaluateSignal(config2, t, domain);
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

export function generateSignalSamples(config, domain, range = 10, stepOrCount = 400, transform, config2, operation) {
  const samples = [];
  if (domain === 'continuous') {
    const numPoints = stepOrCount;
    const dt = (2 * range) / (numPoints - 1);

    for (let i = 0; i < numPoints; i++) {
      const t = -range + i * dt;
      const y = evaluateSignal(config, t, domain);
      const yNeg = evaluateSignal(config, -t, domain);
      const yEven = 0.5 * (y + yNeg);
      const yOdd = 0.5 * (y - yNeg);

      let yTransformed;
      if (transform) {
        yTransformed = evaluateTransformedSignal(config, transform, t, domain);
      }

      let y2;
      let yCombined;
      if (config2 && operation) {
        const opRes = evaluateOperation(config, config2, operation, t, domain);
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
      const y = evaluateSignal(config, n, domain);
      const yNeg = evaluateSignal(config, -n, domain);
      const yEven = 0.5 * (y + yNeg);
      const yOdd = 0.5 * (y - yNeg);

      let yTransformed;
      if (transform) {
        yTransformed = evaluateTransformedSignal(config, transform, n, domain);
      }

      let y2;
      let yCombined;
      if (config2 && operation) {
        const opRes = evaluateOperation(config, config2, operation, n, domain);
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
  const { waveform, amplitude, frequency, timeShift = 0, decayRate = 0.5, pulseWidth = 2, subType = 'cos', phase = 0 } = config;
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
  } else if (['rectangular', 'triangular', 'impulse', 'exponential', 'damped_sinusoid'].includes(waveform)) {
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
        ? `x(t) = ${amplitude}·e^{-${decayRate}·${argStr}}·u${argStr}`
        : `x[n] = ${amplitude}·(${Math.exp(-decayRate).toFixed(2)})^${argStr}·u${argStr}`;
      break;
    case 'rectangular':
      formula = `x(${domVar}) = ${amplitude}·rect(${argStr} / ${pulseWidth})`;
      break;
    case 'triangular':
      formula = `x(${domVar}) = ${amplitude}·Λ(${argStr} / ${pulseWidth})`;
      break;
    case 'damped_sinusoid':
      formula = `x(${domVar}) = ${amplitude}·e^{-${decayRate}·${argStr}}·${subType}(2π·${frequency}·${argStr})·u${argStr}`;
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
      color: '#C05621',
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
      color: '#C05621',
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
      color: '#C05621',
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
      color: '#C05621',
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
      color: '#C05621',
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
      color: '#C05621',
    },
    defaultMode: 'single',
  },
  {
    id: 'damped_osc',
    name: 'Damped Oscillation (RLC Circuit)',
    domain: 'continuous',
    description: 'Underdamped system response with exponential decay envelope multiplied by harmonic cosine.',
    config: {
      id: 'sig_1',
      name: 'Damped Oscillation',
      waveform: 'damped_sinusoid',
      subType: 'cos',
      amplitude: 2.5,
      frequency: 1.0,
      phase: 0,
      timeShift: 0,
      decayRate: 0.4,
      pulseWidth: 2,
      color: '#C05621',
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
      color: '#C05621',
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
      color: '#C05621',
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
      color: '#C05621',
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
      color: '#C05621',
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
      className="relative bg-white rounded-xl border border-neutral-200/90 shadow-xs overflow-hidden flex flex-col"
    >
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-100 bg-neutral-50/50">
        <div className="flex items-baseline gap-2.5">
          <h3 className="text-sm font-semibold text-neutral-900 tracking-tight">{title}</h3>
          {subtitle && <span className="text-xs text-neutral-500 font-normal">{subtitle}</span>}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-2">
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

          {onZoomChange && (
            <div className="flex items-center gap-0.5 bg-neutral-100 rounded-lg p-0.5 border border-neutral-200/70">
              <button
                onClick={() => onZoomChange(Math.max(2, timeRange - 2))}
                title="Zoom in"
                className="p-1 rounded-md text-neutral-600 hover:text-neutral-900 hover:bg-white transition-colors cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onZoomChange(Math.min(20, timeRange + 2))}
                title="Zoom out"
                className="p-1 rounded-md text-neutral-600 hover:text-neutral-900 hover:bg-white transition-colors cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onZoomChange(domain === 'discrete' ? 8 : 6)}
                title="Reset zoom"
                className="p-1 rounded-md text-neutral-600 hover:text-neutral-900 hover:bg-white transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

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
            title="Export CSV Numerical Samples"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 rounded-lg shadow-2xs hover:bg-neutral-50 transition-colors cursor-pointer"
          >
            <span>CSV</span>
          </button>
        </div>
      </div>

      <div className="relative w-full overflow-hidden select-none" style={{ height }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full block"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#C05621" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#C05621" stopOpacity="0.01" />
            </linearGradient>
            <clipPath id="plotClip">
              <rect x={pad.left} y={pad.top} width={plotWidth} height={plotHeight} />
            </clipPath>
          </defs>

          <rect x={pad.left} y={pad.top} width={plotWidth} height={plotHeight} fill="#FFFFFF" />

          {yTicks.map((tickVal, i) => {
            const py = yToPx(tickVal);
            return (
              <g key={`y-grid-${i}`}>
                <line
                  x1={pad.left}
                  y1={py}
                  x2={width - pad.right}
                  y2={py}
                  stroke={tickVal === 0 ? '#94A3B8' : '#F1F5F9'}
                  strokeWidth={tickVal === 0 ? 1.5 : 1}
                  strokeDasharray={tickVal === 0 ? undefined : '3 3'}
                />
                <text x={pad.left - 8} y={py + 3.5} textAnchor="end" className="text-[10px] font-mono tabular-nums fill-neutral-400">
                  {tickVal.toFixed(1)}
                </text>
              </g>
            );
          })}

          {xTicks.map((tickVal, i) => {
            const px = xToPx(tickVal);
            if (px < pad.left - 2 || px > width - pad.right + 2) return null;
            return (
              <g key={`x-grid-${i}`}>
                <line
                  x1={px}
                  y1={pad.top}
                  x2={px}
                  y2={height - pad.bottom}
                  stroke={tickVal === 0 ? '#94A3B8' : '#F1F5F9'}
                  strokeWidth={tickVal === 0 ? 1.5 : 1}
                  strokeDasharray={tickVal === 0 ? undefined : '3 3'}
                />
                <line x1={px} y1={height - pad.bottom} x2={px} y2={height - pad.bottom + 4} stroke="#94A3B8" strokeWidth={1} />
                <text x={px} y={height - pad.bottom + 16} textAnchor="middle" className="text-[10px] font-mono tabular-nums fill-neutral-500">
                  {domain === 'discrete' ? tickVal : tickVal.toFixed(1)}
                </text>
              </g>
            );
          })}

          <text x={width - pad.right + 12} y={zeroYPx + 4} textAnchor="start" className="text-[11px] font-mono font-semibold fill-neutral-700 italic">
            {domain === 'continuous' ? 't' : 'n'}
          </text>
          <text x={pad.left} y={pad.top - 12} textAnchor="start" className="text-[11px] font-mono font-semibold fill-neutral-700 italic">
            {domain === 'continuous' ? 'x(t)' : 'x[n]'}
          </text>

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

          <rect x={pad.left} y={pad.top} width={plotWidth} height={plotHeight} fill="none" stroke="#CBD5E1" strokeWidth={1} />
        </svg>

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

      <div className="px-5 py-2 border-t border-neutral-100 bg-neutral-50/30 flex items-center justify-between text-xs text-neutral-500">
        <div className="flex items-center gap-3">
          <span>Domain: <strong className="font-semibold text-neutral-700">{domain === 'continuous' ? 'Continuous-Time x(t)' : 'Discrete-Time x[n]'}</strong></span>
          <span>·</span>
          <span>Window: <strong className="font-mono text-neutral-700">[-{timeRange}, +{timeRange}]</strong></span>
          <span>·</span>
          <span>Samples: <strong className="font-mono text-neutral-700">{samples.length}</strong></span>
        </div>
        <div className="text-[11px] text-neutral-400">Hover cursor over canvas to inspect exact coordinates</div>
      </div>
    </div>
  );
};

/* =========================================================================
   4. Decomposition Panel
   ========================================================================= */

export const DecompositionPanel = ({
  domain,
  samples,
  metrics,
  timeRange,
  onZoomChange,
}) => {
  const [layoutMode, setLayoutMode] = useState('combined');
  const [showSumReconstruction, setShowSumReconstruction] = useState(false);
  const domVar = domain === 'continuous' ? 't' : 'n';

  const augmentedSamples = samples.map((s) => ({
    ...s,
    yReconstructed: (s.yEven ?? 0) + (s.yOdd ?? 0),
  }));

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-xl border border-neutral-200/90 p-4.5 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-amber-700 tracking-wide uppercase font-mono">
              Signal Decomposition
            </span>
            <span className="text-neutral-300">·</span>
            <span className="text-xs text-neutral-500 font-medium">Even & Odd Analysis</span>
          </div>
          <h2 className="text-base font-bold text-neutral-900 mt-0.5">
            x({domVar}) = x_e({domVar}) + x_o({domVar})
          </h2>
          <p className="text-xs text-neutral-600 mt-1 max-w-2xl leading-relaxed">
            Every signal can be uniquely separated into an axially symmetric Even component{' '}
            <code className="bg-neutral-100 px-1 py-0.5 rounded text-amber-800">x_e({domVar}) = ½·[x({domVar}) + x(-{domVar})]</code>{' '}
            and an anti-symmetric Odd component{' '}
            <code className="bg-neutral-100 px-1 py-0.5 rounded text-blue-800">x_o({domVar}) = ½·[x({domVar}) - x(-{domVar})]</code>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-neutral-100 p-1 rounded-lg border border-neutral-200/60">
            <button
              onClick={() => setLayoutMode('combined')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                layoutMode === 'combined' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Overlaid View</span>
            </button>
            <button
              onClick={() => setLayoutMode('stacked')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all cursor-pointer ${
                layoutMode === 'stacked' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Split className="w-3.5 h-3.5" />
              <span>3-Pane Breakdown</span>
            </button>
          </div>

          <button
            onClick={() => setShowSumReconstruction(!showSumReconstruction)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all cursor-pointer ${
              showSumReconstruction
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Verify Sum Reconstruction</span>
          </button>
        </div>
      </div>

      {layoutMode === 'combined' ? (
        <SignalCanvas
          title={`Signal Decomposition Canvas: x(${domVar}) with Even & Odd Components`}
          subtitle="Toggle trace visibility in the legend to isolate components"
          domain={domain}
          samples={augmentedSamples}
          timeRange={timeRange}
          onZoomChange={onZoomChange}
          height={380}
          traces={[
            { id: 'main', label: `Original x(${domVar})`, key: 'y', color: '#C05621', strokeWidth: 2.5 },
            { id: 'even', label: `Even x_e(${domVar})`, key: 'yEven', color: '#D97706', strokeWidth: 2, strokeDasharray: '5 3' },
            { id: 'odd', label: `Odd x_o(${domVar})`, key: 'yOdd', color: '#2563EB', strokeWidth: 2, strokeDasharray: '3 3' },
            ...(showSumReconstruction
              ? [{ id: 'reconstructed', label: 'x_e + x_o Check', key: 'yReconstructed', color: '#059669', strokeWidth: 2, strokeDasharray: '2 4' }]
              : []),
          ]}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          <SignalCanvas
            title={`1. Original Signal: x(${domVar})`}
            domain={domain}
            samples={samples}
            timeRange={timeRange}
            onZoomChange={onZoomChange}
            height={220}
            traces={[{ id: 'main', label: `x(${domVar})`, key: 'y', color: '#C05621', strokeWidth: 2.2 }]}
          />
          <SignalCanvas
            title={`2. Even Component: x_e(${domVar}) = ½ · [ x(${domVar}) + x(-${domVar}) ]`}
            domain={domain}
            samples={samples}
            timeRange={timeRange}
            onZoomChange={onZoomChange}
            height={220}
            traces={[{ id: 'even', label: `x_e(${domVar})`, key: 'yEven', color: '#D97706', strokeWidth: 2.2 }]}
          />
          <SignalCanvas
            title={`3. Odd Component: x_o(${domVar}) = ½ · [ x(${domVar}) - x(-${domVar}) ]`}
            domain={domain}
            samples={samples}
            timeRange={timeRange}
            onZoomChange={onZoomChange}
            height={220}
            traces={[{ id: 'odd', label: `x_o(${domVar})`, key: 'yOdd', color: '#2563EB', strokeWidth: 2.2 }]}
          />
        </div>
      )}

      <div className="bg-white rounded-xl border border-neutral-200/90 p-5 shadow-2xs">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-4 h-4 text-amber-600" />
          <h4 className="text-sm font-bold text-neutral-900">Decomposition Properties & Orthogonality Theorem</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3.5 bg-neutral-50/80 rounded-lg border border-neutral-200/60 flex flex-col justify-between">
            <div>
              <div className="font-semibold text-neutral-800 mb-1 flex items-center justify-between">
                <span>Even Component x_e({domVar})</span>
                <span className="font-mono text-amber-700 font-bold">{metrics.evenEnergyRatio}% energy</span>
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

          <div className="p-3.5 bg-amber-50/40 rounded-lg border border-amber-200/60 flex flex-col justify-between">
            <div>
              <div className="font-semibold text-amber-950 mb-1">Orthogonality & Energy Conservation</div>
              <p className="text-amber-900 leading-relaxed">
                Because cross-product is odd, <code className="font-mono text-amber-950 font-bold">∫ x_e({domVar})·x_o({domVar}) d{domVar} = 0</code>.
              </p>
              <div className="mt-2 font-mono font-bold text-amber-900 text-[11px] bg-amber-100/60 px-2 py-1 rounded">
                E_total = E_even + E_odd = {(metrics.evenEnergy + metrics.oddEnergy).toFixed(2)} J
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-amber-200/60 text-[11px] text-amber-800">
              Symmetry Verdict: <span className="font-semibold">{metrics.symmetry}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   5. Operations Panel
   ========================================================================= */

export const OperationsPanel = ({
  domain,
  samples,
  config1,
  config2,
  operation,
  timeRange,
  onChangeConfig1,
  onChangeConfig2,
  onChangeOperation,
  onZoomChange,
}) => {
  const domVar = domain === 'continuous' ? 't' : 'n';
  const opSymbols = {
    add: {
      name: 'Addition (Superposition)',
      symbol: '+',
      desc: 'Linear combination of two signals. Foundation of LTI systems and interference beats.',
    },
    multiply: {
      name: 'Multiplication (Modulation)',
      symbol: '×',
      desc: 'Time-domain multiplication corresponds to frequency convolution. Foundation of AM radio mixing.',
    },
    subtract: {
      name: 'Subtraction (Differential)',
      symbol: '−',
      desc: 'Difference and error signal computation.',
    },
  };

  const applyPreset = (preset) => {
    if (preset === 'beats') {
      onChangeConfig1({ ...config1, name: 'Tone 1', waveform: 'sinusoid', subType: 'cos', amplitude: 1.5, frequency: 1.0, timeShift: 0 });
      onChangeConfig2({ ...config2, name: 'Tone 2', waveform: 'sinusoid', subType: 'cos', amplitude: 1.5, frequency: 1.2, timeShift: 0 });
      onChangeOperation('add');
    } else if (preset === 'am') {
      onChangeConfig1({ ...config1, name: 'Carrier Wave', waveform: 'sinusoid', subType: 'cos', amplitude: 2, frequency: 2.5, timeShift: 0 });
      onChangeConfig2({ ...config2, name: 'Modulation Baseband', waveform: 'sinusoid', subType: 'cos', amplitude: 0.8, frequency: 0.3, timeShift: 0 });
      onChangeOperation('multiply');
    } else if (preset === 'harmonics') {
      onChangeConfig1({ ...config1, name: 'Fundamental (f₀)', waveform: 'sinusoid', subType: 'sin', amplitude: 2.0, frequency: 0.5, timeShift: 0 });
      onChangeConfig2({ ...config2, name: '3rd Harmonic (3f₀)', waveform: 'sinusoid', subType: 'sin', amplitude: 0.67, frequency: 1.5, timeShift: 0 });
      onChangeOperation('add');
    } else if (preset === 'window') {
      onChangeConfig1({ ...config1, name: 'Carrier Sinusoid', waveform: 'sinusoid', subType: 'cos', amplitude: 2, frequency: 1.5, timeShift: 0 });
      onChangeConfig2({ ...config2, name: 'Rect Window', waveform: 'rectangular', amplitude: 1, frequency: 1, pulseWidth: 4, timeShift: 0 });
      onChangeOperation('multiply');
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-xl border border-neutral-200/90 p-4.5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-amber-700 tracking-wide uppercase font-mono">
                Signal Arithmetic
              </span>
              <span className="text-neutral-300">·</span>
              <span className="text-xs text-neutral-500 font-medium">Dual-Signal Workbench</span>
            </div>
            <h2 className="text-base font-bold text-neutral-900 mt-0.5">
              y({domVar}) = x₁({domVar}) {opSymbols[operation].symbol} x₂({domVar})
            </h2>
            <p className="text-xs text-neutral-600 mt-0.5">{opSymbols[operation].desc}</p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-neutral-100 rounded-lg border border-neutral-200/60">
            <button
              onClick={() => onChangeOperation('add')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                operation === 'add' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Plus className="w-3.5 h-3.5 text-amber-600" />
              <span>Addition</span>
            </button>
            <button
              onClick={() => onChangeOperation('multiply')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                operation === 'multiply' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <MultiplyIcon className="w-3.5 h-3.5 text-blue-600" />
              <span>Multiplication</span>
            </button>
            <button
              onClick={() => onChangeOperation('subtract')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                operation === 'subtract' ? 'bg-white text-neutral-900 shadow-2xs' : 'text-neutral-600 hover:text-neutral-900'
              }`}
            >
              <Minus className="w-3.5 h-3.5 text-rose-600" />
              <span>Subtraction</span>
            </button>
          </div>
        </div>

        <div className="mt-3.5 pt-3 border-t border-neutral-100 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-neutral-500 font-medium flex items-center gap-1 mr-1">
            <Sparkles className="w-3 h-3 text-amber-600" /> Quick Presets:
          </span>
          <button onClick={() => applyPreset('beats')} className="px-2.5 py-1 rounded-md bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-700 cursor-pointer">
            Beat Phenomenon (1.0 Hz + 1.2 Hz)
          </button>
          <button onClick={() => applyPreset('am')} className="px-2.5 py-1 rounded-md bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-700 cursor-pointer">
            AM Modulation
          </button>
          <button onClick={() => applyPreset('harmonics')} className="px-2.5 py-1 rounded-md bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-700 cursor-pointer">
            Harmonic Sum (f₀ + 3f₀)
          </button>
          <button onClick={() => applyPreset('window')} className="px-2.5 py-1 rounded-md bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-700 cursor-pointer">
            Windowing (Sine × Gate)
          </button>
        </div>
      </div>

      <SignalCanvas
        title={`Resulting Composite Signal: y(${domVar}) = x₁(${domVar}) ${opSymbols[operation].symbol} x₂(${domVar})`}
        subtitle="Displays individual operands alongside synthesized composite waveform"
        domain={domain}
        samples={samples}
        timeRange={timeRange}
        onZoomChange={onZoomChange}
        height={360}
        traces={[
          { id: 'combined', label: `Result y(${domVar})`, key: 'yCombined', color: '#C05621', strokeWidth: 2.75 },
          { id: 'sig1', label: `Operand 1: x₁(${domVar})`, key: 'y', color: '#2563EB', strokeWidth: 1.75, strokeDasharray: '4 3', opacity: 0.85 },
          { id: 'sig2', label: `Operand 2: x₂(${domVar})`, key: 'y2', color: '#059669', strokeWidth: 1.75, strokeDasharray: '2 2', opacity: 0.85 },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Signal 1 Card */}
        <div className="bg-white rounded-xl border border-neutral-200/90 p-4.5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-3.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              <h3 className="text-sm font-bold text-neutral-900">Operand 1: x₁({domVar})</h3>
            </div>
            <span className="text-xs font-mono text-neutral-500 font-semibold uppercase">{config1.waveform}</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-neutral-600 font-medium mb-1">Waveform</label>
              <select
                value={config1.waveform}
                onChange={(e) => onChangeConfig1({ ...config1, waveform: e.target.value })}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-800"
              >
                <option value="sinusoid">Sinusoid (Harmonic)</option>
                <option value="unit_step">Unit Step u(t)</option>
                <option value="rectangular">Rectangular Pulse</option>
                <option value="triangular">Triangular Pulse</option>
                <option value="exponential">Exponential Decay</option>
                <option value="ramp">Ramp r(t)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between text-neutral-600 mb-1">
                  <span>Amplitude (A₁)</span>
                  <span className="font-mono font-semibold text-neutral-900">{config1.amplitude}</span>
                </div>
                <input
                  type="range" min="0.2" max="4" step="0.1" value={config1.amplitude}
                  onChange={(e) => onChangeConfig1({ ...config1, amplitude: parseFloat(e.target.value) })}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between text-neutral-600 mb-1">
                  <span>Frequency (f₁)</span>
                  <span className="font-mono font-semibold text-neutral-900">{config1.frequency} Hz</span>
                </div>
                <input
                  type="range" min="0.1" max="4" step="0.1" value={config1.frequency}
                  onChange={(e) => onChangeConfig1({ ...config1, frequency: parseFloat(e.target.value) })}
                  className="w-full accent-blue-600 cursor-pointer"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-neutral-600 mb-1">
                <span>Time Shift (t₀₁)</span>
                <span className="font-mono font-semibold text-neutral-900">{config1.timeShift} s</span>
              </div>
              <input
                type="range" min="-4" max="4" step="0.2" value={config1.timeShift}
                onChange={(e) => onChangeConfig1({ ...config1, timeShift: parseFloat(e.target.value) })}
                className="w-full accent-blue-600 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Signal 2 Card */}
        <div className="bg-white rounded-xl border border-neutral-200/90 p-4.5 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100 mb-3.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              <h3 className="text-sm font-bold text-neutral-900">Operand 2: x₂({domVar})</h3>
            </div>
            <span className="text-xs font-mono text-neutral-500 font-semibold uppercase">{config2.waveform}</span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-neutral-600 font-medium mb-1">Waveform</label>
              <select
                value={config2.waveform}
                onChange={(e) => onChangeConfig2({ ...config2, waveform: e.target.value })}
                className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-neutral-800"
              >
                <option value="sinusoid">Sinusoid (Harmonic)</option>
                <option value="unit_step">Unit Step u(t)</option>
                <option value="rectangular">Rectangular Pulse</option>
                <option value="triangular">Triangular Pulse</option>
                <option value="exponential">Exponential Decay</option>
                <option value="ramp">Ramp r(t)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="flex justify-between text-neutral-600 mb-1">
                  <span>Amplitude (A₂)</span>
                  <span className="font-mono font-semibold text-neutral-900">{config2.amplitude}</span>
                </div>
                <input
                  type="range" min="0.2" max="4" step="0.1" value={config2.amplitude}
                  onChange={(e) => onChangeConfig2({ ...config2, amplitude: parseFloat(e.target.value) })}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between text-neutral-600 mb-1">
                  <span>Frequency (f₂)</span>
                  <span className="font-mono font-semibold text-neutral-900">{config2.frequency} Hz</span>
                </div>
                <input
                  type="range" min="0.1" max="4" step="0.1" value={config2.frequency}
                  onChange={(e) => onChangeConfig2({ ...config2, frequency: parseFloat(e.target.value) })}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-neutral-600 mb-1">
                <span>Time Shift (t₀₂)</span>
                <span className="font-mono font-semibold text-neutral-900">{config2.timeShift} s</span>
              </div>
              <input
                type="range" min="-4" max="4" step="0.2" value={config2.timeShift}
                onChange={(e) => onChangeConfig2({ ...config2, timeShift: parseFloat(e.target.value) })}
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   6. Transformations Panel
   ========================================================================= */

export const TransformationsPanel = ({
  domain,
  samples,
  transform,
  timeRange,
  onChangeTransform,
  onZoomChange,
}) => {
  const domVar = domain === 'continuous' ? 't' : 'n';

  const resetTransforms = () => {
    onChangeTransform({
      amplitudeScale: 1,
      timeScale: 1,
      timeShift: 0,
      timeReversal: false,
    });
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

  return (
    <div className="flex flex-col gap-5">
      <div className="bg-white rounded-xl border border-neutral-200/90 p-4.5 shadow-2xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-amber-700 tracking-wide uppercase font-mono">
                Signal Transformations
              </span>
              <span className="text-neutral-300">·</span>
              <span className="text-xs text-neutral-500 font-medium">Independent & Dependent Variable Operations</span>
            </div>
            <h2 className="text-base font-bold text-neutral-900 mt-0.5 font-mono">{transformedExpr}</h2>
            <p className="text-xs text-neutral-600 mt-1 max-w-2xl leading-relaxed">
              Explore Amplitude Scaling, Time Scaling, Time Reversal, and Time Shifting.
            </p>
          </div>

          <button
            onClick={resetTransforms}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-white border border-neutral-200 rounded-lg shadow-2xs hover:bg-neutral-50 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5 text-neutral-500" />
            <span>Reset Identity</span>
          </button>
        </div>
      </div>

      <SignalCanvas
        title={`Transformed Waveform: ${transformedExpr}`}
        subtitle="Compare transformed signal against original reference signal (dashed)"
        domain={domain}
        samples={samples}
        timeRange={timeRange}
        onZoomChange={onZoomChange}
        height={360}
        traces={[
          { id: 'transformed', label: `Transformed y(${domVar})`, key: 'yTransformed', color: '#C05621', strokeWidth: 2.75 },
          { id: 'original', label: `Original Reference x(${domVar})`, key: 'y', color: '#94A3B8', strokeWidth: 1.75, strokeDasharray: '4 4', opacity: 0.8 },
        ]}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Amplitude Scaling */}
        <div className="bg-white rounded-xl border border-neutral-200/90 p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-800 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-600" /> Amplitude Scaling
              </span>
              <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                a = {transform.amplitudeScale.toFixed(2)}
              </span>
            </div>
            <div className="font-mono text-[11px] text-neutral-500 mb-2">y({domVar}) = a · x({domVar})</div>
            <input
              type="range" min="0.1" max="3" step="0.1" value={transform.amplitudeScale}
              onChange={(e) => onChangeTransform({ ...transform, amplitudeScale: parseFloat(e.target.value) })}
              className="w-full accent-amber-600 cursor-pointer"
            />
          </div>
        </div>

        {/* Time Scaling */}
        <div className="bg-white rounded-xl border border-neutral-200/90 p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-800 flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-amber-600" /> Time Scaling
              </span>
              <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                a = {transform.timeScale.toFixed(2)}
              </span>
            </div>
            <div className="font-mono text-[11px] text-neutral-500 mb-2">y({domVar}) = x(a · {domVar})</div>
            <input
              type="range" min="0.25" max="3" step="0.25" value={transform.timeScale}
              onChange={(e) => onChangeTransform({ ...transform, timeScale: parseFloat(e.target.value) })}
              className="w-full accent-amber-600 cursor-pointer"
            />
          </div>
        </div>

        {/* Time Shifting */}
        <div className="bg-white rounded-xl border border-neutral-200/90 p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-800 flex items-center gap-1.5">
                <MoveRight className="w-3.5 h-3.5 text-amber-600" /> Time Shifting
              </span>
              <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                {domVar}₀ = {transform.timeShift > 0 ? `+${transform.timeShift}` : transform.timeShift}
              </span>
            </div>
            <div className="font-mono text-[11px] text-neutral-500 mb-2">y({domVar}) = x({domVar} - {domVar}₀)</div>
            <input
              type="range" min="-5" max="5" step="0.5" value={transform.timeShift}
              onChange={(e) => onChangeTransform({ ...transform, timeShift: parseFloat(e.target.value) })}
              className="w-full accent-amber-600 cursor-pointer"
            />
          </div>
        </div>

        {/* Time Reversal */}
        <div className="bg-white rounded-xl border border-neutral-200/90 p-4 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-neutral-800 flex items-center gap-1.5">
                <ArrowLeftRight className="w-3.5 h-3.5 text-amber-600" /> Time Reversal
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${transform.timeReversal ? 'bg-amber-100 text-amber-900 font-mono' : 'bg-neutral-100 text-neutral-600'}`}>
                {transform.timeReversal ? 'ACTIVE' : 'OFF'}
              </span>
            </div>
            <div className="font-mono text-[11px] text-neutral-500 mb-2">y({domVar}) = x(-{domVar})</div>
            <button
              onClick={() => onChangeTransform({ ...transform, timeReversal: !transform.timeReversal })}
              className={`w-full py-2 px-3 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                transform.timeReversal ? 'bg-amber-600 text-white border-amber-600 shadow-2xs' : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
              }`}
            >
              {transform.timeReversal ? 'Reflection Enabled' : 'Enable Time Inversion'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================================
   7. Metrics Cards Component
   ========================================================================= */

export const MetricsCards = ({ metrics, domain }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Periodicity */}
      <div className="bg-white rounded-xl border border-neutral-200/90 p-4.5 shadow-2xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Activity className="w-3.5 h-3.5 text-amber-600" /> Periodicity
            </span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${metrics.isPeriodic ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-neutral-100 text-neutral-600 border border-neutral-200'}`}>
              {metrics.isPeriodic ? 'PERIODIC' : 'APERIODIC'}
            </span>
          </div>

          <div className="mt-2">
            {metrics.isPeriodic ? (
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-neutral-600">Period ({domain === 'continuous' ? 'T₀' : 'N'}):</span>
                  <span className="font-mono text-sm font-bold text-neutral-900 tabular-nums">
                    {metrics.fundamentalPeriod} {domain === 'continuous' ? 's' : 'samples'}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-neutral-600">Freq (f₀):</span>
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
              <Zap className="w-3.5 h-3.5 text-amber-600" /> Energy (E)
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
          <span className="font-mono font-bold text-amber-700">{metrics.evenEnergy} J</span>
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
              <Compass className="w-3.5 h-3.5 text-amber-600" /> Power (P)
            </span>
            <span className="font-mono text-xs font-bold text-neutral-700 bg-neutral-100 px-1.5 py-0.5 rounded">Watts</span>
          </div>
          <div className="text-2xl font-bold font-mono text-neutral-900 tabular-nums mt-1">
            {metrics.power} <span className="text-xs font-normal text-neutral-500">Watts</span>
          </div>
          <div className="mt-1.5 inline-block text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-200/70 px-2 py-0.5 rounded">
            {metrics.classification}
          </div>
        </div>
      </div>

      {/* Symmetry */}
      <div className="bg-white rounded-xl border border-neutral-200/90 p-4.5 shadow-2xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Code2 className="w-3.5 h-3.5 text-amber-600" /> Symmetry
            </span>
            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${metrics.symmetry === 'Purely Even' ? 'bg-amber-50 text-amber-700 border border-amber-200' : metrics.symmetry === 'Purely Odd' ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-neutral-100 text-neutral-700 border border-neutral-200'}`}>
              {metrics.symmetry}
            </span>
          </div>
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-600">Even:</span>
              <span className="font-mono font-bold text-amber-700">{metrics.evenEnergyRatio}%</span>
            </div>
            <div className="w-full bg-neutral-100 rounded-full h-1.5 overflow-hidden flex">
              <div className="bg-amber-600 h-full" style={{ width: `${metrics.evenEnergyRatio}%` }} />
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
    </div>
  );
};

/* =========================================================================
   8. Sidebar Controls Component
   ========================================================================= */

export const SidebarControls = ({
  domain,
  mode,
  config,
  timeRange,
  onDomainChange,
  onModeChange,
  onConfigChange,
  onTimeRangeChange,
  onSelectPreset,
}) => {
  const domVar = domain === 'continuous' ? 't' : 'n';
  const waveforms = [
    { id: 'sinusoid', label: 'Sinusoid', notation: `${config.subType ?? 'cos'}(ω${domVar})` },
    { id: 'unit_step', label: 'Unit Step', notation: `u(${domVar})` },
    { id: 'impulse', label: 'Impulse', notation: `δ(${domVar})` },
    { id: 'ramp', label: 'Ramp', notation: `r(${domVar})` },
    { id: 'exponential', label: 'Exponential', notation: `e^{-σ${domVar}}` },
    { id: 'rectangular', label: 'Rectangular', notation: `rect(${domVar})` },
    { id: 'triangular', label: 'Triangular', notation: `Λ(${domVar})` },
    { id: 'damped_sinusoid', label: 'Damped Sine', notation: `e^{-σ${domVar}}cos(ω${domVar})` },
    { id: 'sinc', label: 'Sinc Pulse', notation: `sinc(${domVar})` },
  ];

  const updateField = (key, val) => {
    onConfigChange({ ...config, [key]: val });
  };

  return (
    <aside className="w-full lg:w-80 shrink-0 flex flex-col gap-5">
      {/* Domain */}
      <div className="bg-white rounded-xl border border-neutral-200/90 p-4 shadow-2xs">
        <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2 font-mono">
          Domain Mode
        </label>
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-neutral-100 rounded-lg border border-neutral-200/60">
          <button
            onClick={() => onDomainChange('continuous')}
            className={`py-2 px-3 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${ domain === 'continuous' ? 'bg-white text-neutral-900 shadow-2xs border border-neutral-200/50' : 'text-neutral-600 hover:text-neutral-900' }`}
          >
            <Activity className="w-3.5 h-3.5 text-amber-600" />
            <span>Continuous x(t)</span>
          </button>
          <button
            onClick={() => onDomainChange('discrete')}
            className={`py-2 px-3 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${ domain === 'discrete' ? 'bg-white text-neutral-900 shadow-2xs border border-neutral-200/50' : 'text-neutral-600 hover:text-neutral-900' }`}
          >
            <GitFork className="w-3.5 h-3.5 text-blue-600" />
            <span>Discrete x[n]</span>
          </button>
        </div>
      </div>

      {/* Modes */}
      <div className="bg-white rounded-xl border border-neutral-200/90 p-4 shadow-2xs">
        <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2 font-mono">
          Workspace Module
        </label>
        <div className="flex flex-col gap-1.5">
          <button
            onClick={() => onModeChange('single')}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-all cursor-pointer text-left ${
              mode === 'single' ? 'bg-amber-50 text-amber-900 border border-amber-200/80 font-semibold' : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-amber-600" />
              <span>Generator & Even/Odd</span>
            </span>
            <ChevronRight className={`w-3.5 h-3.5 ${mode === 'single' ? 'text-amber-600' : 'text-neutral-400'}`} />
          </button>

          <button
            onClick={() => onModeChange('operations')}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-all cursor-pointer text-left ${
              mode === 'operations' ? 'bg-amber-50 text-amber-900 border border-amber-200/80 font-semibold' : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              <span>Signal Operations (x₁ ± x₂)</span>
            </span>
            <ChevronRight className={`w-3.5 h-3.5 ${mode === 'operations' ? 'text-amber-600' : 'text-neutral-400'}`} />
          </button>

          <button
            onClick={() => onModeChange('transformations')}
            className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium rounded-lg transition-all cursor-pointer text-left ${
              mode === 'transformations' ? 'bg-amber-50 text-amber-900 border border-amber-200/80 font-semibold' : 'bg-neutral-50 hover:bg-neutral-100 text-neutral-700'
            }`}
          >
            <span className="flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-amber-600" />
              <span>Transformations (x(at - t₀))</span>
            </span>
            <ChevronRight className={`w-3.5 h-3.5 ${mode === 'transformations' ? 'text-amber-600' : 'text-neutral-400'}`} />
          </button>
        </div>
      </div>

      {/* Waveforms */}
      <div className="bg-white rounded-xl border border-neutral-200/90 p-4 shadow-2xs">
        <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2.5 font-mono">
          Waveform Architecture
        </label>
        <div className="grid grid-cols-3 gap-1.5">
          {waveforms.map((wf) => {
            const isSelected = config.waveform === wf.id;
            return (
              <button
                key={wf.id}
                onClick={() => updateField('waveform', wf.id)}
                className={`p-2 rounded-lg text-left transition-all border cursor-pointer flex flex-col justify-between min-h-[54px] ${
                  isSelected ? 'bg-neutral-900 text-white border-neutral-900 shadow-2xs' : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                <span className="text-[11px] font-semibold tracking-tight">{wf.label}</span>
                <span className={`font-mono text-[10px] mt-1 truncate ${isSelected ? 'text-amber-300' : 'text-neutral-500'}`}>
                  {wf.notation}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Parameters */}
      <div className="bg-white rounded-xl border border-neutral-200/90 p-4 shadow-2xs space-y-4">
        <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider font-mono">
          Parameters
        </label>

        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-neutral-600 font-medium">Amplitude (A)</span>
            <input
              type="number" step="0.1" value={config.amplitude}
              onChange={(e) => updateField('amplitude', parseFloat(e.target.value) || 0)}
              className="w-16 text-right font-mono text-xs font-semibold px-1.5 py-0.5 bg-neutral-50 border border-neutral-200 rounded"
            />
          </div>
          <input
            type="range" min="0" max="5" step="0.1" value={config.amplitude}
            onChange={(e) => updateField('amplitude', parseFloat(e.target.value))}
            className="w-full accent-amber-600 cursor-pointer"
          />
        </div>

        {['sinusoid', 'damped_sinusoid', 'sinc'].includes(config.waveform) && (
          <div>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-neutral-600 font-medium">Frequency (f)</span>
              <input
                type="number" step="0.05" value={config.frequency}
                onChange={(e) => updateField('frequency', parseFloat(e.target.value) || 0)}
                className="w-16 text-right font-mono text-xs font-semibold px-1.5 py-0.5 bg-neutral-50 border border-neutral-200 rounded"
              />
            </div>
            <input
              type="range" min="0.05" max="3" step="0.05" value={config.frequency}
              onChange={(e) => updateField('frequency', parseFloat(e.target.value))}
              className="w-full accent-amber-600 cursor-pointer"
            />
          </div>
        )}

        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-neutral-600 font-medium">Time Shift ({domVar}₀)</span>
            <input
              type="number" step={domain === 'continuous' ? 0.2 : 1} value={config.timeShift}
              onChange={(e) => updateField('timeShift', parseFloat(e.target.value) || 0)}
              className="w-16 text-right font-mono text-xs font-semibold px-1.5 py-0.5 bg-neutral-50 border border-neutral-200 rounded"
            />
          </div>
          <input
            type="range" min="-5" max="5" step={domain === 'continuous' ? 0.2 : 1} value={config.timeShift}
            onChange={(e) => updateField('timeShift', parseFloat(e.target.value))}
            className="w-full accent-amber-600 cursor-pointer"
          />
        </div>
      </div>

      {/* Presets */}
      <div className="bg-white rounded-xl border border-neutral-200/90 p-4 shadow-2xs">
        <label className="block text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2 font-mono flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Textbook Presets
        </label>
        <select
          onChange={(e) => onSelectPreset(e.target.value)}
          defaultValue=""
          className="w-full bg-neutral-50 border border-neutral-200 rounded-lg px-3 py-2 text-xs font-medium text-neutral-800 cursor-pointer"
        >
          <option value="" disabled>Select a textbook preset...</option>
          {PRESET_SIGNALS.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Time Window */}
      <div className="bg-white rounded-xl border border-neutral-200/90 p-4 shadow-2xs">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-neutral-600 font-medium">Time Window (±T)</span>
          <span className="font-mono text-xs font-bold text-neutral-800">[-{timeRange}, +{timeRange}]</span>
        </div>
        <input
          type="range" min="3" max="20" step="1" value={timeRange}
          onChange={(e) => onTimeRangeChange(parseInt(e.target.value, 10))}
          className="w-full accent-neutral-800 cursor-pointer"
        />
      </div>
    </aside>
  );
};

/* =========================================================================
   9. Theory Reference Modal
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
              <Layers className="w-4 h-4 text-amber-600" /> 1. Even and Odd Decomposition
            </h3>
            <p className="mb-2">Every signal decomposes into an Even component and an Odd component:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-2 font-mono">
              <div className="p-3 bg-white rounded-lg border border-neutral-200">
                <div className="text-[11px] text-amber-700 font-bold mb-1">Even Component x_e(t)</div>
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
              <Zap className="w-4 h-4 text-amber-600" /> 2. Signal Energy & Power
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
              <Activity className="w-4 h-4 text-amber-600" /> 3. Periodicity Criteria
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
   10. Main Signal Explorer Workspace / Module 04
   ========================================================================= */

export function SignalExplorerWorkspace({ onNavigateHome, onNavigateModule, isInstructorMode }) {
  const [domain, setDomain] = useState('continuous');
  const [mode, setMode] = useState('single');
  const [timeRange, setTimeRange] = useState(6);
  const [isTheoryOpen, setIsTheoryOpen] = useState(false);

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
    color: '#C05621',
  });

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
  const [transform, setTransform] = useState({
    amplitudeScale: 1.5,
    timeScale: 1.5,
    timeShift: 1.0,
    timeReversal: false,
  });

  const samples = useMemo(() => {
    const pointCount = domain === 'continuous' ? 450 : 2 * timeRange + 1;
    return generateSignalSamples(config, domain, timeRange, pointCount, transform, config2, operation);
  }, [config, domain, timeRange, transform, config2, operation]);

  const metrics = useMemo(() => computeSignalMetrics(config, domain, samples), [config, domain, samples]);

  const handleReset = () => {
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
      color: '#C05621',
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
  };

  return (
    <div className="w-full text-neutral-900 flex flex-col antialiased">
      {/* Top Header */}
      <header className="bg-white rounded-xl border border-neutral-200/90 shadow-2xs px-5 py-3 mb-6 flex flex-wrap items-center justify-between gap-4">
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

        <nav className="flex items-center gap-2 sm:gap-4 text-xs font-medium text-neutral-600">
          <button
            onClick={() => setMode('single')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap ${mode === 'single' ? 'bg-amber-100/80 text-amber-900 font-semibold' : 'hover:text-neutral-900 hover:bg-neutral-100'}`}
          >
            Decomposition
          </button>
          <button
            onClick={() => setMode('operations')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap ${mode === 'operations' ? 'bg-amber-100/80 text-amber-900 font-semibold' : 'hover:text-neutral-900 hover:bg-neutral-100'}`}
          >
            Operations
          </button>
          <button
            onClick={() => setMode('transformations')}
            className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer whitespace-nowrap ${mode === 'transformations' ? 'bg-amber-100/80 text-amber-900 font-semibold' : 'hover:text-neutral-900 hover:bg-neutral-100'}`}
          >
            Transformations
          </button>
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsTheoryOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200/80 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-700" />
            <span>Theory</span>
          </button>
          <button
            onClick={handleReset}
            title="Reset"
            className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="w-full flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-neutral-200/60">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
              {mode === 'single' && 'Signal Generation & Even/Odd Decomposition'}
              {mode === 'operations' && 'Signal Operations: Superposition & Modulation'}
              {mode === 'transformations' && 'Independent & Dependent Transformations'}
            </h1>
            <span className="text-xs text-amber-800 font-semibold font-mono">· {metrics.formula}</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span>Domain: <strong className="text-neutral-800 font-medium">{domain === 'continuous' ? 'Continuous x(t)' : 'Discrete x[n]'}</strong></span>
            <span>·</span>
            <span>Periodicity: <strong className="text-neutral-800 font-medium">{metrics.isPeriodic ? 'Periodic' : 'Aperiodic'}</strong></span>
            <span>·</span>
            <span>Type: <strong className="text-neutral-800 font-medium">{metrics.classification}</strong></span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row items-start gap-6">
          <SidebarControls
            domain={domain}
            mode={mode}
            config={config}
            timeRange={timeRange}
            onDomainChange={setDomain}
            onModeChange={setMode}
            onConfigChange={setConfig}
            onTimeRangeChange={setTimeRange}
            onSelectPreset={handleSelectPreset}
          />

          <div className="flex-1 w-full min-w-0 flex flex-col gap-6">
            {mode === 'single' && (
              <DecompositionPanel
                domain={domain}
                samples={samples}
                metrics={metrics}
                timeRange={timeRange}
                onZoomChange={setTimeRange}
              />
            )}
            {mode === 'operations' && (
              <OperationsPanel
                domain={domain}
                samples={samples}
                config1={config}
                config2={config2}
                operation={operation}
                timeRange={timeRange}
                onChangeConfig1={setConfig}
                onChangeConfig2={setConfig2}
                onChangeOperation={setOperation}
                onZoomChange={setTimeRange}
              />
            )}
            {mode === 'transformations' && (
              <TransformationsPanel
                domain={domain}
                samples={samples}
                transform={transform}
                timeRange={timeRange}
                onChangeTransform={setTransform}
                onZoomChange={setTimeRange}
              />
            )}
            <MetricsCards metrics={metrics} domain={domain} />
          </div>
        </div>
      </main>

      {/* Footer Info */}
      <footer className="mt-8 border-t border-neutral-200/80 bg-white py-3.5 px-5 rounded-xl text-xs text-neutral-500 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-neutral-800">Module 04: Signal Explorer</span>
          <span>·</span>
          <span>Signals and Systems Interactive Workspace</span>
        </div>
        <div className="text-[11px] font-mono text-neutral-400">
          Continuous / Discrete · Decomposition · Operations · Transformations
        </div>
      </footer>

      <TheoryModal isOpen={isTheoryOpen} onClose={() => setIsTheoryOpen(false)} />
    </div>
  );
}

export default function Module4_SignalExplorer(props) {
  return <SignalExplorerWorkspace {...props} />;
}
