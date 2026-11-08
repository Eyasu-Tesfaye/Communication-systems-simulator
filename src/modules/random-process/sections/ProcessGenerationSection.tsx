/**
 * Section 1: Random Process Generation
 * Selection of stochastic process models, mathematical foundations,
 * realization count M, sample density N, frequency, variance, and random seed.
 */

import React from 'react';
import { Sliders, RefreshCw, Sparkles, BookOpen, Layers, Info } from 'lucide-react';
import { MathView } from '../../../components/MathView';
import {
  ProcessType,
  ProcessParams,
  PROCESS_CATALOG,
} from '../randomProcessEngine';

interface ProcessGenerationSectionProps {
  params: ProcessParams;
  onChangeParams: (newParams: Partial<ProcessParams>) => void;
  onReseed: () => void;
}

export const ProcessGenerationSection: React.FC<ProcessGenerationSectionProps> = ({
  params,
  onChangeParams,
  onReseed,
}) => {
  const currentMeta = PROCESS_CATALOG[params.type];

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-[#FAF9F6] border border-[#E6E4DD] rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#C85A32] bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/20">
                Section 01
              </span>
              <span className="text-xs text-[#75736E] font-medium">Stochastic Model Synthesis</span>
            </div>
            <h2 className="text-lg font-bold text-[#1A1917]">
              Random Process Generation
            </h2>
            <p className="text-xs sm:text-sm text-[#585651] mt-1 max-w-2xl leading-relaxed">
              Synthesize continuous-time random processes <MathView math="X(t, \xi)" /> from stochastic ensembles. Select between stationary white noise, bandlimited Gaussian processes, random-phase carriers, and non-stationary processes.
            </p>
          </div>

          <button
            type="button"
            onClick={onReseed}
            className="self-start sm:self-center flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-[#FAF9F6] text-[#1A1917] border border-[#E6E4DD] hover:border-[#8A8882] rounded-md text-xs font-mono font-bold shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#C85A32]" />
            <span>Generate New Process</span>
          </button>
        </div>
      </div>

      {/* 2. Process Type Selection Grid */}
      <div>
        <label className="block text-xs font-mono font-bold uppercase tracking-wider text-[#75736E] mb-3">
          Select Stochastic Process Type
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {(Object.keys(PROCESS_CATALOG) as ProcessType[]).map((typeKey) => {
            const meta = PROCESS_CATALOG[typeKey];
            const isSelected = params.type === typeKey;

            return (
              <button
                key={typeKey}
                type="button"
                onClick={() => onChangeParams({ type: typeKey })}
                className={`p-4 rounded-lg text-left border transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-white border-[#C85A32] ring-2 ring-[#C85A32]/20 shadow-xs'
                    : 'bg-white border-[#E6E4DD] hover:border-[#8A8882] hover:bg-[#FAF9F6]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-bold text-sm text-[#1A1917]">{meta.name}</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase ${
                        meta.isWss
                          ? 'bg-[#10B981]/10 text-[#059669] border border-[#10B981]/30'
                          : 'bg-[#C85A32]/10 text-[#C85A32] border border-[#C85A32]/30'
                      }`}
                    >
                      {meta.isWss ? 'Stationary (WSS)' : 'Non-Stationary'}
                    </span>
                  </div>
                  <p className="text-xs text-[#585651] line-clamp-2 leading-relaxed">
                    {meta.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-[#E6E4DD]/70 flex items-center justify-between text-[11px] font-mono text-[#75736E]">
                  <span>PDF: {meta.theoreticalPdfName.split(' ')[0]}</span>
                  <span className="text-[#C85A32] font-semibold">{isSelected ? 'Active Model' : 'Select →'}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Synthesis Parameters & Math Formulation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Interactive Sliders */}
        <div className="lg:col-span-7 bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E6E4DD]">
            <Sliders className="w-4 h-4 text-[#C85A32]" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1917]">
              Ensemble & Signal Synthesis Parameters
            </h3>
          </div>

          <div className="space-y-4 text-xs">
            {/* Realization Count M */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-[#1A1917]">
                  Realization Count <MathView math="M" /> (Ensemble Size)
                </span>
                <span className="font-mono text-[#C85A32] font-bold">
                  {params.realizationCount} trajectories
                </span>
              </div>
              <input
                type="range"
                min="3"
                max="24"
                step="1"
                value={params.realizationCount}
                onChange={(e) =>
                  onChangeParams({ realizationCount: parseInt(e.target.value, 10) })
                }
                className="w-full accent-[#C85A32] cursor-pointer"
              />
              <span className="text-[11px] text-[#75736E]">
                Controls the number of stochastic sample paths generated simultaneously. Higher <MathView math="M" /> improves ensemble mean convergence.
              </span>
            </div>

            {/* Sample Count N */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-[#1A1917]">
                  Time Sample Points <MathView math="N" /> (Resolution)
                </span>
                <span className="font-mono text-[#C85A32] font-bold">
                  {params.sampleCount} samples
                </span>
              </div>
              <input
                type="range"
                min="80"
                max="320"
                step="20"
                value={params.sampleCount}
                onChange={(e) =>
                  onChangeParams({ sampleCount: parseInt(e.target.value, 10) })
                }
                className="w-full accent-[#C85A32] cursor-pointer"
              />
              <span className="text-[11px] text-[#75736E]">
                Sampling density along the temporal axis <MathView math="t \in [0, 10\text{s}]" /> (<MathView math="f_s \approx" /> {(params.sampleCount / params.tMax).toFixed(1)} Hz).
              </span>
            </div>

            {/* Signal Amplitude A */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-[#1A1917]">
                  Carrier / Signal Amplitude <MathView math="A" />
                </span>
                <span className="font-mono text-[#C85A32] font-bold">
                  {params.amplitude.toFixed(2)} V
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="3.0"
                step="0.1"
                value={params.amplitude}
                onChange={(e) =>
                  onChangeParams({ amplitude: parseFloat(e.target.value) })
                }
                className="w-full accent-[#C85A32] cursor-pointer"
              />
            </div>

            {/* Noise Std Dev sigma */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-[#1A1917]">
                  Additive Noise Std Dev <MathView math="\sigma_n" />
                </span>
                <span className="font-mono text-[#C85A32] font-bold">
                  {params.noiseStd.toFixed(2)} V
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.5"
                step="0.05"
                value={params.noiseStd}
                onChange={(e) =>
                  onChangeParams({ noiseStd: parseFloat(e.target.value) })
                }
                className="w-full accent-[#C85A32] cursor-pointer"
              />
            </div>

            {/* Characteristic Frequency f0 */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="font-medium text-[#1A1917]">
                  Fundamental Frequency <MathView math="f_0" />
                </span>
                <span className="font-mono text-[#C85A32] font-bold">
                  {params.frequency.toFixed(2)} Hz
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="2.0"
                step="0.1"
                value={params.frequency}
                onChange={(e) =>
                  onChangeParams({ frequency: parseFloat(e.target.value) })
                }
                className="w-full accent-[#C85A32] cursor-pointer"
              />
            </div>

            {/* Drift Rate (Non-Stationary Only) */}
            {params.type === 'non_stationary' && (
              <div className="p-3 bg-[#FBF4F0] rounded border border-[#C85A32]/30">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-medium text-[#C85A32]">
                    Mean Drift & Variance Expansion Intensity
                  </span>
                  <span className="font-mono text-[#C85A32] font-bold">
                    {params.driftRate.toFixed(2)}×
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="2.0"
                  step="0.1"
                  value={params.driftRate}
                  onChange={(e) =>
                    onChangeParams({ driftRate: parseFloat(e.target.value) })
                  }
                  className="w-full accent-[#C85A32] cursor-pointer"
                />
              </div>
            )}
          </div>
        </div>

        {/* Right 5 Cols: Analytical Model Reference */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-5 shadow-2xs space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[#75736E]">
              <BookOpen className="w-3.5 h-3.5 text-[#585651]" />
              <span>Mathematical Model: {currentMeta.shortName}</span>
            </div>

            <div>
              <div className="text-[11px] font-mono text-[#75736E] mb-1">
                Theoretical Ensemble Mean <MathView math="\mathbb{E}[X(t)]" />:
              </div>
              <div className="p-2.5 bg-white rounded border border-[#E6E4DD] text-xs font-mono">
                <MathView math={currentMeta.theoreticalMean} displayMode={true} />
              </div>
            </div>

            <div>
              <div className="text-[11px] font-mono text-[#75736E] mb-1">
                Theoretical Autocorrelation <MathView math="R_{XX}(\tau)" />:
              </div>
              <div className="p-2.5 bg-white rounded border border-[#E6E4DD] text-xs font-mono">
                <MathView math={currentMeta.theoreticalRxx} displayMode={true} />
              </div>
            </div>

            <div>
              <div className="text-[11px] font-mono text-[#75736E] mb-1">
                Theoretical Power Spectral Density:
              </div>
              <div className="p-2.5 bg-white rounded border border-[#E6E4DD] text-xs font-mono">
                <MathView math={currentMeta.theoreticalPsd} displayMode={true} />
              </div>
            </div>

            <div className="pt-2 border-t border-[#E6E4DD]">
              <div className="text-[11px] font-mono font-semibold text-[#1A1917] mb-1 flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-[#C85A32]" />
                <span>Telecom & Engineering Application</span>
              </div>
              <p className="text-xs text-[#585651] leading-relaxed">
                {currentMeta.telecomRelevance}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
