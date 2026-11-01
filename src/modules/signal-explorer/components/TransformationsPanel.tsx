import React from 'react';
import { DomainType, SignalSample, TransformConfig } from '../types';
import { SignalCanvas } from './SignalCanvas';
import { ArrowLeftRight, Maximize2, MoveRight, Sliders, RotateCcw } from 'lucide-react';

export interface TransformationsPanelProps {
  domain: DomainType;
  samples: SignalSample[];
  transform: TransformConfig;
  timeRange: number;
  onChangeTransform: (newTransform: TransformConfig) => void;
  onZoomChange: (newRange: number) => void;
}

export const TransformationsPanel: React.FC<TransformationsPanelProps> = ({
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

  const transformedExpr = `y(${domVar}) = ${transform.amplitudeScale !== 1 ? `${transform.amplitudeScale}·` : ''}x(${reversalSign}${scaleStr}${domVar}${shiftStr})`;

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
