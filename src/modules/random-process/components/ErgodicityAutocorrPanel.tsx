/**
 * Module 03: Topic 5 — Ergodicity and Autocorrelation Analysis
 * Demonstrates equivalence of ensemble and time averages for ergodic processes,
 * and plots the autocorrelation function R_XX(tau) vs time lag tau with adjustable lag inspection.
 */

import React, { useState, useMemo } from 'react';
import {
  RefreshCw,
  GitBranch,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Layers,
  BookOpen,
} from 'lucide-react';
import { MathView } from '../../../components/MathView';
import {
  EnsembleSimulationData,
  AutocorrelationResult,
  PROCESS_CATALOG,
} from '../randomProcessEngine';

interface ErgodicityAutocorrPanelProps {
  simulation: EnsembleSimulationData;
  autocorr: AutocorrelationResult;
  selectedRealizationIndex: number;
  onSelectRealization: (idx: number) => void;
}

export const ErgodicityAutocorrPanel: React.FC<ErgodicityAutocorrPanelProps> = ({
  simulation,
  autocorr,
  selectedRealizationIndex,
  onSelectRealization,
}) => {
  const { trajectories, ensembleMean, ensembleVariance, timeAverages, timeVariances, params, grandEnsembleMean, grandEnsembleVariance } = simulation;
  const M = trajectories.length;
  const meta = PROCESS_CATALOG[params.type];

  // Interactive Lag Cursor for Autocorrelation inspection
  const [selectedLagIdx, setSelectedLagIdx] = useState<number>(Math.floor(autocorr.lags.length / 2));
  const selectedLag = autocorr.lags[selectedLagIdx] ?? 0;
  const selectedRVal = autocorr.ensembleRxx[selectedLagIdx] ?? 0;

  // Autocorrelation Plot Coordinate Mapping
  const { lags, ensembleRxx, selectedTrajectoryRxx, theoreticalRxx, peakValue } = autocorr;
  const numLags = lags.length;
  const tauMax = lags[numLags - 1];

  const PLOT_W = 760;
  const PLOT_H = 240;
  const PAD_L = 60;
  const PAD_R = 30;
  const PAD_T = 25;
  const PAD_B = 40;
  const innerW = PLOT_W - PAD_L - PAD_R;
  const innerH = PLOT_H - PAD_T - PAD_B;

  const yMin = Math.min(-0.5, Math.min(...ensembleRxx) * 1.25);
  const yMax = Math.max(1.0, peakValue * 1.25);

  const mapX = (tau: number) => {
    return PAD_L + ((tau + tauMax) / (2 * tauMax)) * innerW;
  };

  const mapY = (val: number) => {
    const range = yMax - yMin || 1;
    return PAD_T + innerH - ((val - yMin) / range) * innerH;
  };

  const toPathD = (series: number[]) => {
    return lags.reduce((acc, tau, idx) => {
      const x = mapX(tau).toFixed(1);
      const y = mapY(series[idx]).toFixed(1);
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  };

  const ensemblePath = useMemo(() => toPathD(ensembleRxx), [ensembleRxx, lags]);
  const selectedTrajPath = useMemo(() => toPathD(selectedTrajectoryRxx), [selectedTrajectoryRxx, lags]);
  const theoreticalPath = useMemo(() => toPathD(theoreticalRxx), [theoreticalRxx, lags]);

  // Realization Ergodicity Metrics
  const realizationMetrics = useMemo(() => {
    return timeAverages.map((tMean, i) => {
      const tVar = timeVariances[i];
      const meanGap = Math.abs(tMean - grandEnsembleMean);
      const varGap = Math.abs(tVar - grandEnsembleVariance);
      return {
        index: i,
        timeMean: tMean,
        timeVar: tVar,
        meanGap,
        varGap,
        isConsistent: meanGap < 0.55 && meta.isErgodic,
      };
    });
  }, [timeAverages, timeVariances, grandEnsembleMean, grandEnsembleVariance, meta]);

  const zeroLagR = ensembleRxx[Math.floor(numLags / 2)];

  return (
    <div className="space-y-6">
      {/* 1. Ergodicity Analysis Area */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#E6E4DD]">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-[#C85A32]" />
            <h3 className="font-mono font-bold text-sm text-[#1A1917]">
              A. Ergodicity: Time Averages vs. Ensemble Averages
            </h3>
          </div>
          <span
            className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase ${
              meta.isErgodic
                ? 'bg-[#10B981]/10 text-[#059669] border border-[#10B981]/30'
                : 'bg-[#C85A32]/10 text-[#C85A32] border border-[#C85A32]/30'
            }`}
          >
            {meta.isErgodic ? 'Ergodic Process' : 'Non-Ergodic Process'}
          </span>
        </div>

        {/* Global Grand Averages Comparison Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] uppercase text-[#75736E]">Ensemble Mean E[X]</div>
            <div className="text-base font-bold text-[#1A1917] mt-0.5">
              {grandEnsembleMean >= 0 ? '+' : ''}{grandEnsembleMean.toFixed(3)} V
            </div>
            <div className="text-[10px] text-[#75736E] font-sans">Across M={M} realizations</div>
          </div>

          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] uppercase text-[#75736E]">
              Time Mean ⟨X<sup>({selectedRealizationIndex + 1})</sup>⟩
            </div>
            <div className="text-base font-bold text-[#1A1917] mt-0.5">
              {timeAverages[selectedRealizationIndex] >= 0 ? '+' : ''}
              {timeAverages[selectedRealizationIndex]?.toFixed(3)} V
            </div>
            <div className="text-[10px] text-[#75736E] font-sans">Single trajectory average</div>
          </div>

          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] uppercase text-[#75736E]">Ensemble Variance Var(X)</div>
            <div className="text-base font-bold text-[#1A1917] mt-0.5">
              {grandEnsembleVariance.toFixed(3)} V²
            </div>
            <div className="text-[10px] text-[#75736E] font-sans">Ensemble spread</div>
          </div>

          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] uppercase text-[#75736E]">
              Time Variance Var_T(X<sup>({selectedRealizationIndex + 1})</sup>)
            </div>
            <div className="text-base font-bold text-[#1A1917] mt-0.5">
              {timeVariances[selectedRealizationIndex]?.toFixed(3)} V²
            </div>
            <div className="text-[10px] text-[#75736E] font-sans">Single trajectory variance</div>
          </div>
        </div>

        {/* Realization-by-Realization Breakdown Table */}
        <div className="space-y-2">
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#75736E]">
            Realization-by-Realization Comparison ({M} Trajectories)
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {realizationMetrics.map((rm) => {
              const isSelected = rm.index === selectedRealizationIndex;
              return (
                <button
                  key={rm.index}
                  type="button"
                  onClick={() => onSelectRealization(rm.index)}
                  className={`p-3 rounded-lg text-left border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#FAF9F6] border-[#C85A32] ring-1 ring-[#C85A32]/40 shadow-xs'
                      : 'bg-white border-[#E6E4DD] hover:border-[#8A8882]'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                    <span className="font-bold text-[#1A1917]">
                      Realization X<sup>({rm.index + 1})</sup>
                    </span>
                    <span
                      className={`text-[9.5px] font-bold ${
                        rm.isConsistent ? 'text-[#059669]' : 'text-[#C85A32]'
                      }`}
                    >
                      {rm.isConsistent ? 'Consistent' : 'Deviation'}
                    </span>
                  </div>

                  <div className="space-y-0.5 text-[11px] font-mono text-[#585651]">
                    <div className="flex justify-between">
                      <span>Time Mean ⟨x⟩:</span>
                      <strong className="text-[#1A1917]">{rm.timeMean >= 0 ? '+' : ''}{rm.timeMean.toFixed(2)}V</strong>
                    </div>
                    <div className="flex justify-between text-[#C85A32]">
                      <span>Ergodicity Gap |Δ|:</span>
                      <strong className="font-bold">{rm.meanGap.toFixed(2)}V</strong>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Methodological Caution on Ergodicity Proof */}
        <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD] text-xs text-[#585651] leading-relaxed">
          <strong className="text-[#1A1917] block font-mono uppercase mb-0.5">
            Statistical Interpretation Notice
          </strong>
          When individual trajectory averages <MathView math="\langle x_i \rangle_T" /> closely match the ensemble average <MathView math="\mathbb{E}[X]" />, the simulation <em>appears consistent with ergodic behavior</em>. However, numerical similarity alone on finite data does not constitute mathematical proof of ergodicity, which requires <MathView math="T \to \infty" /> and decaying autocovariance.
        </div>
      </div>

      {/* 2. Autocorrelation Analysis Area */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#E6E4DD]">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-[#C85A32]" />
            <h3 className="font-mono font-bold text-sm text-[#1A1917]">
              B. Autocorrelation Analysis: <MathView math="R_{XX}(\tau)" />
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-4 font-mono text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-[#C85A32] rounded-full" />
              <span className="text-[#C85A32] font-semibold">Ensemble Autocorrelation R̂_XX(τ)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-[#585651] rounded-full opacity-60" />
              <span className="text-[#585651]">Single Realization 𝓡(τ)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 border-b-2 border-dashed border-[#1A1917]" />
              <span className="text-[#1A1917] font-semibold">Theoretical Curve</span>
            </div>
          </div>
        </div>

        {/* Interactive Lag Selector */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono p-3 bg-[#FAF9F6] rounded-md border border-[#E6E4DD]">
          <div className="flex items-center gap-2">
            <span className="text-[#75736E]">Select Lag τ:</span>
            <input
              type="range"
              min="0"
              max={numLags - 1}
              step="1"
              value={selectedLagIdx}
              onChange={(e) => setSelectedLagIdx(parseInt(e.target.value, 10))}
              className="w-36 accent-[#C85A32] cursor-pointer"
            />
            <span className="font-bold text-[#1A1917]">
              τ = {selectedLag >= 0 ? '+' : ''}{selectedLag.toFixed(2)} s
            </span>
          </div>

          <div className="flex items-center gap-4">
            <div>
              <span className="text-[#75736E]">R_XX(τ): </span>
              <strong className="text-[#C85A32] font-bold">{selectedRVal.toFixed(3)} V²</strong>
            </div>
            <div>
              <span className="text-[#75736E]">Total Power R_XX(0): </span>
              <strong className="text-[#1A1917] font-bold">{zeroLagR.toFixed(3)} V²</strong>
            </div>
          </div>
        </div>

        {/* Autocorrelation Plot SVG */}
        <div className="relative w-full h-[240px] bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden flex items-center justify-center p-2">
          <svg
            viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full select-none"
          >
            {/* Zero Lines */}
            <line
              x1={PAD_L}
              y1={mapY(0)}
              x2={PLOT_W - PAD_R}
              y2={mapY(0)}
              stroke="#1A1917"
              strokeWidth="1.2"
            />
            <line
              x1={mapX(0)}
              y1={PAD_T}
              x2={mapX(0)}
              y2={PAD_T + innerH}
              stroke="#1A1917"
              strokeWidth="1.2"
              strokeDasharray="4 3"
            />

            {/* Curves */}
            <path
              d={selectedTrajPath}
              fill="none"
              stroke="#585651"
              strokeWidth="1.4"
              opacity="0.55"
              strokeLinecap="round"
            />
            <path
              d={ensemblePath}
              fill="none"
              stroke="#C85A32"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            <path
              d={theoreticalPath}
              fill="none"
              stroke="#1A1917"
              strokeWidth="2.0"
              strokeDasharray="5 3"
              strokeLinecap="round"
            />

            {/* Selected Lag Marker */}
            <line
              x1={mapX(selectedLag)}
              y1={PAD_T}
              x2={mapX(selectedLag)}
              y2={PAD_T + innerH}
              stroke="#C85A32"
              strokeWidth="1.5"
              strokeDasharray="2 2"
            />
            <circle
              cx={mapX(selectedLag)}
              cy={mapY(selectedRVal)}
              r="5.5"
              fill="#C85A32"
              stroke="#FFFFFF"
              strokeWidth="2"
            />

            {/* Zero Lag Peak Marker */}
            <circle
              cx={mapX(0)}
              cy={mapY(zeroLagR)}
              r="5"
              fill="#1A1917"
              stroke="#FFFFFF"
              strokeWidth="2"
            />

            {/* Ticks */}
            {[-tauMax, -tauMax / 2, 0, tauMax / 2, tauMax].map((t) => (
              <text
                key={t}
                x={mapX(t)}
                y={PAD_T + innerH + 18}
                textAnchor="middle"
                className="text-[9px] font-mono fill-[#75736E]"
              >
                {t >= 0 ? `+${t.toFixed(1)}` : t.toFixed(1)}s
              </text>
            ))}

            <text
              x={PLOT_W - PAD_R}
              y={PAD_T + innerH + 32}
              textAnchor="end"
              className="text-[10px] font-mono fill-[#1A1917] font-bold"
            >
              Time Lag τ [s] →
            </text>
            <text
              x={PAD_L - 8}
              y={PAD_T - 10}
              textAnchor="start"
              className="text-[10px] font-mono fill-[#1A1917] font-bold"
            >
              Autocorrelation R_XX(τ) [V²]
            </text>
          </svg>
        </div>

        {/* Physical Interpretation */}
        <p className="text-xs text-[#585651] leading-relaxed">
          <strong>Physical Relationship:</strong> Autocorrelation <MathView math="R_{XX}(\tau)" /> quantifies how rapidly the signal randomizes itself over time. Peak value at <MathView math="\tau = 0" /> equals total average signal power <MathView math="R_{XX}(0) = \mathbb{E}[X^2(t)]" />. For AWGN, correlation drops to zero immediately (zero memory); for periodic carriers, autocorrelation oscillates perpetually with period <MathView math="T_0 = 1/f_0" />.
        </p>
      </div>
    </div>
  );
};
