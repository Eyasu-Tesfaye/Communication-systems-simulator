import React from 'react';
import { DomainType, SignalMetrics } from '../types';
import { Activity, Zap, Compass, Code2 } from 'lucide-react';

export interface MetricsCardsProps {
  metrics: SignalMetrics;
  domain: DomainType;
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({ metrics, domain }) => {
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
