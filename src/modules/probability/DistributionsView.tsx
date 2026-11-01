import React, { useState, useMemo } from 'react';
import {
  Sliders,
  Calculator,
  RotateCcw,
  BookOpen,
  Info,
  Grid,
  Percent,
} from 'lucide-react';
import { MathView } from '../../components/MathView';
import {
  DistributionType,
  DISTRIBUTIONS,
  evaluateCdf,
  evaluatePdfPmf,
  computeMoments,
} from './probabilityEngine';
import { ProbabilityPlotCanvas } from './ProbabilityPlotCanvas';

interface DistributionsViewProps {
  isGridVisible: boolean;
  onToggleGrid: () => void;
}

export const DistributionsView: React.FC<DistributionsViewProps> = ({
  isGridVisible,
  onToggleGrid,
}) => {
  // Distributions shown in Tab 1: Normal, Binomial, Poisson, Exponential, Uniform
  const [activeDistKey, setActiveDistKey] = useState<
    'normal' | 'binomial' | 'poisson' | 'exponential' | 'uniform_cont'
  >('normal');
  const [plotMode, setPlotMode] = useState<'pmf_pdf' | 'cdf'>('pmf_pdf');

  // Parameters state
  const [params, setParams] = useState<Record<string, Record<string, number>>>({
    normal: { mu: 0, sigma: 1 },
    binomial: { n: 20, p: 0.5 },
    poisson: { lambda: 4.0 },
    exponential: { lambda: 1.0 },
    uniform_cont: { a: -2, b: 2 },
  });

  // Interval query state: P(a <= X <= b)
  const [queryLower, setQueryLower] = useState<number>(-1.0);
  const [queryUpper, setQueryUpper] = useState<number>(1.0);

  const distMeta = DISTRIBUTIONS[activeDistKey];
  const currentDistParams = params[activeDistKey] || distMeta.defaultParams;
  const isDiscrete = distMeta.nature === 'discrete';

  const moments = useMemo(() => {
    return computeMoments(activeDistKey, currentDistParams);
  }, [activeDistKey, currentDistParams]);

  const handleParamChange = (key: string, val: number) => {
    setParams((prev) => ({
      ...prev,
      [activeDistKey]: {
        ...prev[activeDistKey],
        [key]: val,
      },
    }));
  };

  const handleResetParams = () => {
    setParams((prev) => ({
      ...prev,
      [activeDistKey]: { ...distMeta.defaultParams },
    }));
    if (activeDistKey === 'normal') {
      setQueryLower(-1);
      setQueryUpper(1);
    }
  };

  // Compute calculated probability P(a <= X <= b)
  const calculatedProb = useMemo(() => {
    const a = Math.min(queryLower, queryUpper);
    const b = Math.max(queryLower, queryUpper);
    const cdfB = evaluateCdf(activeDistKey, currentDistParams, b);
    const cdfA = evaluateCdf(activeDistKey, currentDistParams, isDiscrete ? a - 1 : a);
    const prob = Math.max(0, Math.min(1, cdfB - cdfA));
    return prob;
  }, [activeDistKey, currentDistParams, queryLower, queryUpper, isDiscrete]);

  const primaryDistOptions: Array<{
    id: 'normal' | 'binomial' | 'poisson' | 'exponential' | 'uniform_cont';
    label: string;
  }> = [
    { id: 'normal', label: 'Normal' },
    { id: 'binomial', label: 'Binomial' },
    { id: 'poisson', label: 'Poisson' },
    { id: 'exponential', label: 'Exponential' },
    { id: 'uniform_cont', label: 'Uniform' },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Distribution Selector Buttons */}
      <div className="flex flex-wrap items-center gap-2 pb-2">
        {primaryDistOptions.map((opt) => {
          const isSelected = activeDistKey === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                setActiveDistKey(opt.id);
                // Adjust default interval query sensibly for the new distribution
                if (opt.id === 'normal') {
                  setQueryLower(-1);
                  setQueryUpper(1);
                } else if (opt.id === 'binomial') {
                  setQueryLower(8);
                  setQueryUpper(12);
                } else if (opt.id === 'poisson') {
                  setQueryLower(2);
                  setQueryUpper(6);
                } else if (opt.id === 'exponential') {
                  setQueryLower(0);
                  setQueryUpper(1.5);
                } else if (opt.id === 'uniform_cont') {
                  setQueryLower(-1);
                  setQueryUpper(1);
                }
              }}
              className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer border ${
                isSelected
                  ? 'bg-[#1A1917] text-white border-[#1A1917] shadow-xs'
                  : 'bg-white text-[#585651] border-[#E6E4DD] hover:bg-[#FAF9F6] hover:text-[#1A1917]'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* 2. Top Summary Stat Cards: Mean, Variance, Std Deviation */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-[#E6E4DD] p-4 shadow-2xs">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#75736E]">
            Mean (μ)
          </div>
          <div className="text-2xl font-mono font-bold text-[#1A1917] mt-1">
            {typeof moments.mean === 'number' ? moments.mean.toFixed(2) : moments.mean}
          </div>
          <div className="text-xs text-[#75736E] mt-0.5">Expected value E[X]</div>
        </div>

        <div className="bg-white rounded-xl border border-[#E6E4DD] p-4 shadow-2xs">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#75736E]">
            Variance (σ²)
          </div>
          <div className="text-2xl font-mono font-bold text-[#1A1917] mt-1">
            {typeof moments.variance === 'number' ? moments.variance.toFixed(2) : moments.variance}
          </div>
          <div className="text-xs text-[#75736E] mt-0.5">Measure of dispersion</div>
        </div>

        <div className="bg-white rounded-xl border border-[#E6E4DD] p-4 shadow-2xs">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#75736E]">
            Std Deviation (σ)
          </div>
          <div className="text-2xl font-mono font-bold text-[#C85A32] mt-1">
            {typeof moments.stdDev === 'number' ? moments.stdDev.toFixed(2) : moments.stdDev}
          </div>
          <div className="text-xs text-[#75736E] mt-0.5">Square root of variance</div>
        </div>
      </div>

      {/* 3. Main Split View: Chart on Left, Parameters & Properties on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 Cols): Chart Panel */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-[#E6E4DD] p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E6E4DD]">
            <div>
              <h3 className="text-sm font-bold text-[#1A1917]">
                {plotMode === 'cdf'
                  ? 'Cumulative Distribution Function (CDF)'
                  : isDiscrete
                  ? 'Probability Mass Function (PMF)'
                  : 'Probability Density Function (PDF)'}
              </h3>
              <p className="text-[11px] text-[#75736E] mt-0.5">
                {isDiscrete
                  ? 'Discrete spike mass probabilities P(X = k)'
                  : 'Continuous probability density curve f(x)'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {/* PDF / CDF Toggle */}
              <div className="inline-flex rounded-md border border-[#E6E4DD] p-0.5 bg-[#FAF9F6]">
                <button
                  type="button"
                  onClick={() => setPlotMode('pmf_pdf')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                    plotMode === 'pmf_pdf'
                      ? 'bg-[#1A1917] text-white shadow-xs'
                      : 'text-[#585651] hover:text-[#1A1917]'
                  }`}
                >
                  {isDiscrete ? 'PMF' : 'PDF'}
                </button>
                <button
                  type="button"
                  onClick={() => setPlotMode('cdf')}
                  className={`px-2.5 py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                    plotMode === 'cdf'
                      ? 'bg-[#1A1917] text-white shadow-xs'
                      : 'text-[#585651] hover:text-[#1A1917]'
                  }`}
                >
                  CDF
                </button>
              </div>

              {/* Grid Toggle */}
              <button
                type="button"
                onClick={onToggleGrid}
                className={`p-1.5 rounded border text-xs transition-colors cursor-pointer ${
                  isGridVisible
                    ? 'bg-[#FBF4F0] border-[#C85A32]/30 text-[#C85A32]'
                    : 'bg-white border-[#E6E4DD] text-[#75736E]'
                }`}
                title="Toggle grid"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Interactive Chart Canvas */}
          <ProbabilityPlotCanvas
            distType={activeDistKey}
            params={currentDistParams}
            plotMode={plotMode}
            shadedRegion={{
              mode: 'between',
              val1: Math.min(queryLower, queryUpper),
              val2: Math.max(queryLower, queryUpper),
            }}
            isGridVisible={isGridVisible}
          />

          {/* Legend and shaded region indicator */}
          <div className="flex flex-wrap items-center justify-between text-xs font-mono text-[#75736E] pt-2 border-t border-[#E6E4DD]">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-[#C85A32] rounded-full inline-block" />
                <span className="text-[#1A1917]">Distribution</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-2 bg-[#C85A32]/25 border border-[#C85A32]/40 rounded-2xs inline-block" />
                <span>P({queryLower.toFixed(1)} ≤ X ≤ {queryUpper.toFixed(1)})</span>
              </span>
            </div>
            <div>
              Support: <span className="text-[#1A1917]">{moments.supportStr}</span>
            </div>
          </div>
        </div>

        {/* Right Column (5 Cols): Parameters, Properties & Probability Calculation */}
        <div className="lg:col-span-5 space-y-5">
          {/* Parameters Controls */}
          <div className="bg-white rounded-xl border border-[#E6E4DD] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E4DD]">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#C85A32]" />
                <h3 className="text-sm font-bold text-[#1A1917]">Parameters</h3>
              </div>
              <button
                type="button"
                onClick={handleResetParams}
                className="inline-flex items-center gap-1 text-[11px] font-mono text-[#75736E] hover:text-[#C85A32] cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            <div className="space-y-4">
              {Object.entries(distMeta.paramBounds).map(([paramKey, bounds]) => {
                const val = currentDistParams[paramKey] ?? distMeta.defaultParams[paramKey];
                return (
                  <div key={paramKey} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-[#1A1917] flex items-center gap-1.5">
                        <span>{bounds.label}</span>
                        <span className="font-mono text-[#75736E]">
                          (<MathView math={bounds.symbol} />)
                        </span>
                      </span>
                      <span className="font-mono font-bold text-[#C85A32] bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/20">
                        {val.toFixed(bounds.step < 1 ? 2 : 0)}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={bounds.min}
                      max={bounds.max}
                      step={bounds.step}
                      value={val}
                      onChange={(e) => handleParamChange(paramKey, parseFloat(e.target.value))}
                      className="w-full accent-[#C85A32] cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-[#8A8882]">
                      <span>{bounds.min}</span>
                      <span>{bounds.max}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Properties & Analytical Formulations */}
          <div className="bg-[#FAF9F6] rounded-xl border border-[#E6E4DD] p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center gap-2 pb-2.5 border-b border-[#E6E4DD]">
              <BookOpen className="w-4 h-4 text-[#585651]" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#585651]">
                Properties
              </h3>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-white rounded border border-[#E6E4DD]">
                <span className="text-[10px] font-mono text-[#8A8882] block">Type</span>
                <span className="font-semibold text-[#1A1917] capitalize">{distMeta.nature}</span>
              </div>
              <div className="p-2.5 bg-white rounded border border-[#E6E4DD]">
                <span className="text-[10px] font-mono text-[#8A8882] block">Notation</span>
                <span className="font-semibold text-[#1A1917] font-mono text-xs">
                  <MathView math={distMeta.symbol} />
                </span>
              </div>
            </div>

            <div className="space-y-2 pt-1 text-xs">
              <div>
                <span className="text-[10px] font-mono text-[#75736E] block mb-1">
                  {isDiscrete ? 'PMF Formula:' : 'PDF Formula:'}
                </span>
                <div className="p-2 bg-white rounded border border-[#E6E4DD] font-mono text-xs overflow-x-auto">
                  <MathView math={distMeta.formulaPdfKaTeX} displayMode={true} />
                </div>
              </div>

              <div>
                <span className="text-[10px] font-mono text-[#75736E] block mb-1">CDF Formula:</span>
                <div className="p-2 bg-white rounded border border-[#E6E4DD] font-mono text-xs overflow-x-auto">
                  <MathView math={distMeta.formulaCdfKaTeX} displayMode={true} />
                </div>
              </div>
            </div>
          </div>

          {/* Probability Calculation Query Box */}
          <div className="bg-white rounded-xl border border-[#E6E4DD] p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center gap-2 pb-2.5 border-b border-[#E6E4DD]">
              <Calculator className="w-4 h-4 text-[#C85A32]" />
              <h3 className="text-sm font-bold text-[#1A1917]">Probability Calculation</h3>
            </div>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-mono text-[#585651] mb-1">
                    Lower Bound (a)
                  </label>
                  <input
                    type="number"
                    step={isDiscrete ? '1' : '0.1'}
                    value={queryLower}
                    onChange={(e) => setQueryLower(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#FAF9F6] border border-[#E6E4DD] rounded-md px-2.5 py-1.5 text-xs font-mono text-[#1A1917] focus:outline-none focus:border-[#C85A32]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-mono text-[#585651] mb-1">
                    Upper Bound (b)
                  </label>
                  <input
                    type="number"
                    step={isDiscrete ? '1' : '0.1'}
                    value={queryUpper}
                    onChange={(e) => setQueryUpper(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#FAF9F6] border border-[#E6E4DD] rounded-md px-2.5 py-1.5 text-xs font-mono text-[#1A1917] focus:outline-none focus:border-[#C85A32]"
                  />
                </div>
              </div>

              {/* Calculated Result Display Card */}
              <div className="p-3.5 bg-[#FBF4F0] rounded-xl border border-[#C85A32]/30 flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-[#75736E] font-medium block">
                    Calculated Probability:
                  </span>
                  <span className="text-xs font-mono font-bold text-[#1A1917]">
                    P({Math.min(queryLower, queryUpper).toFixed(isDiscrete ? 0 : 2)} ≤ X ≤{' '}
                    {Math.max(queryLower, queryUpper).toFixed(isDiscrete ? 0 : 2)})
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xl font-mono font-bold text-[#C85A32]">
                    {calculatedProb.toFixed(4)}
                  </span>
                  <span className="text-[11px] font-mono text-[#75736E] block">
                    ({(calculatedProb * 100).toFixed(2)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
