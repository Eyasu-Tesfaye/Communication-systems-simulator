import React from 'react';
import { DomainType, SignalConfig, WaveformType, WorkspaceMode } from '../types';
import { PRESET_SIGNALS } from '../presets';
import { Activity, Layers, Sparkles, GitFork, Sliders, ChevronRight } from 'lucide-react';

export interface SidebarControlsProps {
  domain: DomainType;
  mode: WorkspaceMode;
  config: SignalConfig;
  timeRange: number;
  onDomainChange: (newDomain: DomainType) => void;
  onModeChange: (newMode: WorkspaceMode) => void;
  onConfigChange: (newConfig: SignalConfig) => void;
  onTimeRangeChange: (newRange: number) => void;
  onSelectPreset: (presetId: string) => void;
}

export const SidebarControls: React.FC<SidebarControlsProps> = ({
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

  const waveforms: { id: WaveformType; label: string; notation: string }[] = [
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

  const updateField = <K extends keyof SignalConfig>(key: K, val: SignalConfig[K]) => {
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
            className={`py-2 px-3 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              domain === 'continuous' ? 'bg-white text-neutral-900 shadow-2xs border border-neutral-200/50' : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-amber-600" />
            <span>Continuous x(t)</span>
          </button>
          <button
            onClick={() => onDomainChange('discrete')}
            className={`py-2 px-3 text-xs font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              domain === 'discrete' ? 'bg-white text-neutral-900 shadow-2xs border border-neutral-200/50' : 'text-neutral-600 hover:text-neutral-900'
            }`}
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
