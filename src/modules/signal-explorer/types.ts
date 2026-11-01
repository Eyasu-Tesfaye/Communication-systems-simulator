/**
 * Signal Explorer - Types & Interfaces
 * Domain-specific data models for Signals and Systems analysis.
 */

export type DomainType = 'continuous' | 'discrete';

export type WaveformType =
  | 'sinusoid'
  | 'unit_step'
  | 'impulse'
  | 'ramp'
  | 'exponential'
  | 'rectangular'
  | 'triangular'
  | 'damped_sinusoid'
  | 'sinc';

export type SinusoidSubType = 'cos' | 'sin';

export interface SignalConfig {
  id: string;
  name: string;
  waveform: WaveformType;
  amplitude: number;       // A (gain)
  frequency: number;       // f (Hz or cycles/sample)
  subType?: SinusoidSubType; // 'sin' | 'cos'
  phase: number;           // phi in radians (-pi to +pi)
  timeShift: number;       // t0 or n0 (delay > 0, advance < 0)
  decayRate: number;       // sigma or alpha (for exponential / damped)
  pulseWidth: number;      // Tw or Nw (for rect / triangle pulses)
  color: string;           // Hex color code
}

export interface TransformConfig {
  amplitudeScale: number;  // a in a * x(t)
  timeScale: number;       // a in x(a * t)
  timeShift: number;       // t0 in x(t - t0)
  timeReversal: boolean;   // true for x(-t)
}

export type OperationType = 'add' | 'multiply' | 'subtract';

export interface SignalSample {
  x: number;       // t or n
  y: number;       // primary signal value x(t) or x[n]
  yEven?: number;  // xe(t) = 0.5 * (x(t) + x(-t))
  yOdd?: number;   // xo(t) = 0.5 * (x(t) - x(-t))
  yTransformed?: number;
  y2?: number;     // signal 2 for operations
  yCombined?: number; // operation result x1 op x2
}

export type SignalClassification = 'Energy Signal' | 'Power Signal' | 'Neither';

export interface SignalMetrics {
  isPeriodic: boolean;
  fundamentalPeriod: number | null; // T0 in continuous, N (integer) in discrete
  fundamentalFreq: number | null;   // f0 in Hz
  angularFreq: number | null;       // omega0 in rad/s
  energy: number;                   // E = integral |x(t)|^2 dt or sum |x[n]|^2
  power: number;                    // P = average power
  classification: SignalClassification;
  symmetry: 'Purely Even' | 'Purely Odd' | 'Neither (Asymmetric)';
  evenEnergy: number;
  oddEnergy: number;
  evenEnergyRatio: number;          // 0 to 100%
  oddEnergyRatio: number;           // 0 to 100%
  formula: string;
  evenFormula: string;
  oddFormula: string;
  notes: string[];
}

export type WorkspaceMode = 'single' | 'operations' | 'transformations';

export interface PresetSignal {
  id: string;
  name: string;
  domain: DomainType;
  description: string;
  config: SignalConfig;
  config2?: SignalConfig;
  operation?: OperationType;
  transform?: TransformConfig;
  defaultMode?: WorkspaceMode;
}
