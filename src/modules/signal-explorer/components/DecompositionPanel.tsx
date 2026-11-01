import React, { useState } from 'react';
import { DomainType, SignalMetrics, SignalSample } from '../types';
import { SignalCanvas } from './SignalCanvas';
import { CheckCircle2, Split, Info, Layers } from 'lucide-react';

export interface DecompositionPanelProps {
  domain: DomainType;
  samples: SignalSample[];
  metrics: SignalMetrics;
  timeRange: number;
  onZoomChange: (newRange: number) => void;
}

export const DecompositionPanel: React.FC<DecompositionPanelProps> = ({
  domain,
  samples,
  metrics,
  timeRange,
  onZoomChange,
}) => {
  const [layoutMode, setLayoutMode] = useState<'stacked' | 'combined'>('combined');
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
              ? [{ id: 'reconstructed', label: 'x_e + x_o Check', key: 'yReconstructed' as keyof SignalSample, color: '#059669', strokeWidth: 2, strokeDasharray: '2 4' }]
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
