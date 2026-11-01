import React from 'react';
import { DomainType, OperationType, SignalConfig, SignalSample } from '../types';
import { SignalCanvas } from './SignalCanvas';
import { Plus, X as MultiplyIcon, Minus, Sparkles } from 'lucide-react';

export interface OperationsPanelProps {
  domain: DomainType;
  samples: SignalSample[];
  config1: SignalConfig;
  config2: SignalConfig;
  operation: OperationType;
  timeRange: number;
  onChangeConfig1: (newConfig: SignalConfig) => void;
  onChangeConfig2: (newConfig: SignalConfig) => void;
  onChangeOperation: (newOp: OperationType) => void;
  onZoomChange: (newRange: number) => void;
}

export const OperationsPanel: React.FC<OperationsPanelProps> = ({
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

  const opSymbols: Record<OperationType, { name: string; symbol: string; desc: string }> = {
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

  const applyPreset = (preset: 'beats' | 'am' | 'harmonics' | 'window') => {
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
                onChange={(e) => onChangeConfig1({ ...config1, waveform: e.target.value as any })}
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
                onChange={(e) => onChangeConfig2({ ...config2, waveform: e.target.value as any })}
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
