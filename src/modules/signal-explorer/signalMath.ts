/**
 * Signal Explorer - Mathematical Engine
 * Accurate evaluation, numerical analysis, periodicity, energy/power, and even/odd decomposition.
 */

import {
  DomainType,
  OperationType,
  SignalClassification,
  SignalConfig,
  SignalMetrics,
  SignalSample,
  TransformConfig,
} from './types';

const EPSILON = 1e-6;

export function evaluateSignal(config: SignalConfig, t: number, domain: DomainType): number {
  const { waveform, amplitude, frequency, phase, timeShift, decayRate, pulseWidth, subType = 'cos' } = config;
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

export function evaluateTransformedSignal(
  config: SignalConfig,
  transform: TransformConfig,
  t: number,
  domain: DomainType
): number {
  const { amplitudeScale, timeScale, timeShift, timeReversal } = transform;
  const reversalSign = timeReversal ? -1 : 1;
  const internalT = reversalSign * (timeScale * t) - timeShift;
  const rawVal = evaluateSignal(config, internalT, domain);
  return amplitudeScale * rawVal;
}

export function evaluateOperation(
  config1: SignalConfig,
  config2: SignalConfig,
  op: OperationType,
  t: number,
  domain: DomainType
): { y1: number; y2: number; yCombined: number } {
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
  }

  return { y1, y2, yCombined };
}

export function generateSignalSamples(
  config: SignalConfig,
  domain: DomainType,
  range: number = 10,
  stepOrCount: number = 400,
  transform?: TransformConfig,
  config2?: SignalConfig,
  operation?: OperationType
): SignalSample[] {
  const samples: SignalSample[] = [];

  if (domain === 'continuous') {
    const numPoints = stepOrCount;
    const dt = (2 * range) / (numPoints - 1);

    for (let i = 0; i < numPoints; i++) {
      const t = -range + i * dt;
      const y = evaluateSignal(config, t, domain);
      const yNeg = evaluateSignal(config, -t, domain);
      const yEven = 0.5 * (y + yNeg);
      const yOdd = 0.5 * (y - yNeg);

      let yTransformed: number | undefined;
      if (transform) {
        yTransformed = evaluateTransformedSignal(config, transform, t, domain);
      }

      let y2: number | undefined;
      let yCombined: number | undefined;
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

      let yTransformed: number | undefined;
      if (transform) {
        yTransformed = evaluateTransformedSignal(config, transform, n, domain);
      }

      let y2: number | undefined;
      let yCombined: number | undefined;
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

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b > 0) {
    const temp = b;
    b = a % b;
    a = temp;
  }
  return a;
}

function toFraction(val: number, maxDenominator = 128): { num: number; den: number } | null {
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

export function computeSignalMetrics(
  config: SignalConfig,
  domain: DomainType,
  samples: SignalSample[]
): SignalMetrics {
  const { waveform, amplitude, frequency, timeShift, decayRate, pulseWidth, subType = 'cos', phase } = config;

  let isPeriodic = false;
  let fundamentalPeriod: number | null = null;
  let fundamentalFreq: number | null = null;
  let angularFreq: number | null = null;
  const notes: string[] = [];

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

  let classification: SignalClassification = 'Neither';

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

  let symmetry: 'Purely Even' | 'Purely Odd' | 'Neither (Asymmetric)' = 'Neither (Asymmetric)';
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
