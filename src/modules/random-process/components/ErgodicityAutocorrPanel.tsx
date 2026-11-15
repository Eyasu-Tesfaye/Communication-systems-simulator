/**
 * Module 03: Area 5 — Ergodicity and Autocorrelation Analysis
 * Compares ensemble vs time means and ensemble vs time variances visually and numerically,
 * and plots autocorrelation R_XX(tau) vs lag tau with interactive lag inspection.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { RefreshCw, GitBranch } from 'lucide-react';
import { MathView } from '../../../components/MathView';
import {
  EnsembleSimulationData,
  AutocorrelationResult,
  PROCESS_CATALOG,
} from '../randomProcessEngine';
import { REALIZATION_COLORS } from '../RandomProcessVisualizer';

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
  const {
    trajectories,
    timeAverages,
    timeVariances,
    params,
    grandEnsembleMean,
    grandEnsembleVariance,
  } = simulation;
  const M = trajectories.length;
  const meta = PROCESS_CATALOG[params.type];

  const { lags, ensembleRxx, selectedTrajectoryRxx, theoreticalRxx, peakValue, correlationTime } = autocorr;
  const numLags = lags.length;
  const centerIdx = Math.floor(numLags / 2);

  // Interactive Lag Cursor for Autocorrelation inspection
  const [selectedLagIdx, setSelectedLagIdx] = useState<number>(centerIdx);
  useEffect(() => {
    setSelectedLagIdx((prev) => Math.max(0, Math.min(numLags - 1, prev)));
  }, [numLags]);

  const selectedLag = lags[selectedLagIdx] ?? 0;
  const selectedRVal = ensembleRxx[selectedLagIdx] ?? 0;
  const selectedSingleRVal = selectedTrajectoryRxx[selectedLagIdx] ?? 0;
  const zeroLagR = ensembleRxx[centerIdx] ?? 0;
  const normalizedRho = Math.abs(zeroLagR) > 1e-9 ? selectedRVal / zeroLagR : 0;

  // Autocorrelation Plot Geometry
  const tauMax = lags[numLags - 1] || 1;
  const PLOT_W = 760;
  const PLOT_H = 235;
  const PAD_L = 60;
  const PAD_R = 24;
  const PAD_T = 28;
  const PAD_B = 38;
  const innerW = PLOT_W - PAD_L - PAD_R;
  const innerH = PLOT_H - PAD_T - PAD_B;

  const yMin = useMemo(() => {
    const all = [...ensembleRxx, ...selectedTrajectoryRxx, ...(theoreticalRxx ?? [])];
    return Math.min(-0.5, Math.min(...all) * 1.2);
  }, [ensembleRxx, selectedTrajectoryRxx, theoreticalRxx]);

  const yMax = useMemo(() => {
    const all = [...ensembleRxx, ...selectedTrajectoryRxx, ...(theoreticalRxx ?? [])];
    return Math.max(1.0, Math.max(...all) * 1.2);
  }, [ensembleRxx, selectedTrajectoryRxx, theoreticalRxx]);

  const mapX = (tau: number) => PAD_L + ((tau + tauMax) / (2 * tauMax)) * innerW;
  const mapY = (val: number) => {
    const range = yMax - yMin || 1;
    return PAD_T + innerH - ((val - yMin) / range) * innerH;
  };

  const toPathD = (series: number[]) =>
    lags
      .map((tau, idx) => `${idx === 0 ? 'M' : 'L'} ${mapX(tau).toFixed(1)} ${mapY(series[idx]).toFixed(1)}`)
      .join(' ');

  const ensemblePath = useMemo(() => toPathD(ensembleRxx), [ensembleRxx, lags, yMin, yMax, tauMax]);
  const selectedTrajPath = useMemo(() => toPathD(selectedTrajectoryRxx), [selectedTrajectoryRxx, lags, yMin, yMax, tauMax]);
  const theoreticalPath = useMemo(
    () => (theoreticalRxx ? toPathD(theoreticalRxx) : ''),
    [theoreticalRxx, lags, yMin, yMax, tauMax]
  );

  // Realization Ergodicity Metrics (Mean & Variance)
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
      };
    });
  }, [timeAverages, timeVariances, grandEnsembleMean, grandEnsembleVariance]);

  // Visual bar scale for Ergodicity Comparison chart
  const meanBarMax = useMemo(() => {
    const absVals = [Math.abs(grandEnsembleMean), ...timeAverages.map((v) => Math.abs(v)), 0.5];
    return Math.max(...absVals) * 1.2;
  }, [grandEnsembleMean, timeAverages]);

  const varBarMax = useMemo(() => {
    const vals = [grandEnsembleVariance, ...timeVariances, 0.5];
    return Math.max(...vals) * 1.2;
  }, [grandEnsembleVariance, timeVariances]);

  const handleAutocorrClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const svgX = ((e.clientX - rect.left) / rect.width) * PLOT_W;
    const clampedX = Math.max(PAD_L, Math.min(PLOT_W - PAD_R, svgX));
    const frac = (clampedX - PAD_L) / innerW;
    const idx = Math.round(frac * (numLags - 1));
    setSelectedLagIdx(Math.max(0, Math.min(numLags - 1, idx)));
  };

  return (
    <div className="space-y-4">
      {/* 1. Ergodicity Analysis Area */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-4 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E6E4DD]">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-[#C85A32]" />
            <h3 className="font-mono font-bold text-xs sm:text-sm text-[#1A1917]">
              A. Ergodicity: Ensemble vs. Time Means & Variances
            </h3>
          </div>
          <span
            className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold uppercase border ${
              meta.isErgodic
                ? 'bg-[#10B981]/10 text-[#059669] border-[#10B981]/30'
                : 'bg-[#C85A32]/10 text-[#C85A32] border-[#C85A32]/30'
            }`}
          >
            {meta.isErgodic ? 'Ergodic Model' : 'Non-Ergodic Model'}
          </span>
        </div>

        {/* Summary Metric Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] uppercase text-[#75736E]">Ensemble Mean E[X]</div>
            <div className="text-base font-bold text-[#1A1917] mt-0.5 tabular-nums">
              {grandEnsembleMean >= 0 ? '+' : ''}{grandEnsembleMean.toFixed(3)} V
            </div>
            <div className="text-[10px] text-[#75736E] font-sans">Averaged across M={M} paths</div>
          </div>

          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] uppercase text-[#75736E]">
              Time Mean ⟨X<sup>({selectedRealizationIndex + 1})</sup>⟩_T
            </div>
            <div className="text-base font-bold text-[#059669] mt-0.5 tabular-nums">
              {timeAverages[selectedRealizationIndex] >= 0 ? '+' : ''}
              {timeAverages[selectedRealizationIndex]?.toFixed(3)} V
            </div>
            <div className="text-[10px] text-[#75736E] font-sans">
              Mean gap: {Math.abs((timeAverages[selectedRealizationIndex] ?? 0) - grandEnsembleMean).toFixed(3)} V
            </div>
          </div>

          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] uppercase text-[#75736E]">Ensemble Variance Var(X)</div>
            <div className="text-base font-bold text-[#1A1917] mt-0.5 tabular-nums">
              {grandEnsembleVariance.toFixed(3)} V²
            </div>
            <div className="text-[10px] text-[#75736E] font-sans">Mean ensemble variance</div>
          </div>

          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] uppercase text-[#75736E]">
              Time Variance Var_T(X<sup>({selectedRealizationIndex + 1})</sup>)
            </div>
            <div className="text-base font-bold text-[#C85A32] mt-0.5 tabular-nums">
              {timeVariances[selectedRealizationIndex]?.toFixed(3)} V²
            </div>
            <div className="text-[10px] text-[#75736E] font-sans">
              Var gap: {Math.abs((timeVariances[selectedRealizationIndex] ?? 0) - grandEnsembleVariance).toFixed(3)} V²
            </div>
          </div>
        </div>

        {/* Visual Comparison: Time Mean vs Ensemble Mean AND Time Variance vs Ensemble Variance */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Mean Comparison Bars */}
          <div className="p-3 bg-[#FAF9F6] rounded-md border border-[#E6E4DD] space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="font-bold text-[#1A1917]">Time Mean ⟨x_i⟩_T vs. Grand Mean ({grandEnsembleMean.toFixed(2)}V)</span>
              <span className="text-[#75736E]">Click to select</span>
            </div>
            <div className="space-y-1.5 max-h-[168px] overflow-y-auto pr-1">
              {realizationMetrics.map((rm) => {
                const isSelected = rm.index === selectedRealizationIndex;
                const pct = Math.min(100, (Math.abs(rm.timeMean) / meanBarMax) * 100);
                const color = REALIZATION_COLORS[rm.index % REALIZATION_COLORS.length];
                return (
                  <button
                    key={rm.index}
                    type="button"
                    onClick={() => onSelectRealization(rm.index)}
                    className={`w-full flex items-center gap-2 text-[11px] font-mono p-1 rounded transition-colors cursor-pointer ${
                      isSelected ? 'bg-white border border-[#C85A32]' : 'hover:bg-white/70'
                    }`}
                  >
                    <span className="w-9 text-left font-bold shrink-0" style={{ color }}>
                      X<sup>({rm.index + 1})</sup>
                    </span>
                    <div className="flex-1 h-2.5 bg-[#E6E4DD]/70 rounded overflow-hidden">
                      <div
                        className="h-full rounded transition-all"
                        style={{ width: `${Math.max(3, pct)}%`, backgroundColor: color }}
                      />
                    </div>
                    <span className="w-16 text-right tabular-nums text-[#1A1917] font-semibold">
                      {rm.timeMean >= 0 ? '+' : ''}{rm.timeMean.toFixed(2)}V
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Variance Comparison Bars */}
          <div className="p-3 bg-[#FAF9F6] rounded-md border border-[#E6E4DD] space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="font-bold text-[#1A1917]">Time Variance Var_T(x_i) vs. Ensemble Var ({grandEnsembleVariance.toFixed(2)}V²)</span>
              <span className="text-[#75736E]">Click to select</span>
            </div>
            <div className="space-y-1.5 max-h-[168px] overflow-y-auto pr-1">
              {realizationMetrics.map((rm) => {
                const isSelected = rm.index === selectedRealizationIndex;
                const pct = Math.min(100, (rm.timeVar / varBarMax) * 100);
                const color = REALIZATION_COLORS[rm.index % REALIZATION_COLORS.length];
                return (
                  <button
                    key={rm.index}
                    type="button"
                    onClick={() => onSelectRealization(rm.index)}
                    className={`w-full flex items-center gap-2 text-[11px] font-mono p-1 rounded transition-colors cursor-pointer ${
                      isSelected ? 'bg-white border border-[#C85A32]' : 'hover:bg-white/70'
                    }`}
                  >
                    <span className="w-9 text-left font-bold shrink-0" style={{ color }}>
                      X<sup>({rm.index + 1})</sup>
                    </span>
                    <div className="flex-1 h-2.5 bg-[#E6E4DD]/70 rounded overflow-hidden">
                      <div
                        className="h-full rounded transition-all"
                        style={{ width: `${Math.max(3, pct)}%`, backgroundColor: color }}
                      />
                    </div>
                    <span className="w-16 text-right tabular-nums text-[#1A1917] font-semibold">
                      {rm.timeVar.toFixed(2)}V²
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <p className="text-xs text-[#585651] leading-relaxed">
          <strong>Ergodicity Meaning:</strong> A stationary process is mean-ergodic if <MathView math="\lim_{T\to\infty} \langle x_i \rangle_T = \mathbb{E}[X]" /> for almost every realization, and variance-ergodic if time variances match ensemble variance. Finite observation windows exhibit small sampling gaps that vanish as <MathView math="T \to \infty" /> only for ergodic processes.
        </p>
      </div>

      {/* 2. Autocorrelation Analysis Area */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E6E4DD]">
          <div className="flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-[#C85A32]" />
            <h3 className="font-mono font-bold text-xs sm:text-sm text-[#1A1917]">
              B. Autocorrelation Analysis <MathView math="R_{XX}(\tau) = \mathbb{E}[X(t)X(t+\tau)]" />
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-0.5 bg-[#C85A32]" />
              <span className="text-[#C85A32] font-semibold">Ensemble R̂_XX(τ)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-0.5 bg-[#585651] opacity-60" />
              <span className="text-[#585651]">Path X<sup>({selectedRealizationIndex + 1})</sup></span>
            </span>
            {theoreticalRxx && (
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-0.5 border-b-2 border-dashed border-[#1A1917]" />
                <span className="text-[#1A1917] font-semibold">Theoretical</span>
              </span>
            )}
          </div>
        </div>

        {/* Interactive Lag Slider & Live Readouts */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-mono p-3 bg-[#FAF9F6] rounded-md border border-[#E6E4DD]">
          <div className="flex items-center gap-2.5">
            <span className="text-[#75736E]">Lag τ:</span>
            <input
              type="range"
              min="0"
              max={numLags - 1}
              step="1"
              value={selectedLagIdx}
              onChange={(e) => setSelectedLagIdx(parseInt(e.target.value, 10))}
              className="w-32 sm:w-44 accent-[#C85A32] cursor-pointer"
              aria-label="Autocorrelation lag tau"
            />
            <span className="font-bold text-[#1A1917] tabular-nums w-16">
              {selectedLag >= 0 ? '+' : ''}{selectedLag.toFixed(2)} s
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 tabular-nums">
            <div>
              <span className="text-[#75736E]">R̂_XX(τ): </span>
              <strong className="text-[#C85A32]">{selectedRVal.toFixed(3)} V²</strong>
            </div>
            <div>
              <span className="text-[#75736E]">ρ(τ): </span>
              <strong className="text-[#1A1917]">{normalizedRho.toFixed(3)}</strong>
            </div>
            <div>
              <span className="text-[#75736E]">Power R_XX(0): </span>
              <strong className="text-[#1A1917]">{zeroLagR.toFixed(3)} V²</strong>
            </div>
            <div>
              <span className="text-[#75736E]">τ_c: </span>
              <strong className="text-[#1A1917]">{correlationTime.toFixed(2)} s</strong>
            </div>
          </div>
        </div>

        {/* Autocorrelation Plot SVG */}
        <div className="relative w-full h-[230px] bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden p-1">
          <svg
            viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full select-none cursor-pointer"
            onClick={handleAutocorrClick}
            role="img"
            aria-label="Autocorrelation function R_XX(tau) plot"
          >
            <line x1={PAD_L} y1={mapY(0)} x2={PLOT_W - PAD_R} y2={mapY(0)} stroke="#1A1917" strokeWidth="1.2" />
            <line x1={mapX(0)} y1={PAD_T} x2={mapX(0)} y2={PAD_T + innerH} stroke="#1A1917" strokeWidth="1.2" strokeDasharray="4 3" />

            <path d={selectedTrajPath} fill="none" stroke="#585651" strokeWidth="1.35" opacity="0.5" strokeLinecap="round" />
            <path d={ensemblePath} fill="none" stroke="#C85A32" strokeWidth="2.4" strokeLinecap="round" />
            {theoreticalPath && (
              <path d={theoreticalPath} fill="none" stroke="#1A1917" strokeWidth="1.9" strokeDasharray="5 3" strokeLinecap="round" />
            )}

            {/* Selected Lag Marker */}
            <line
              x1={mapX(selectedLag)}
              y1={PAD_T}
              x2={mapX(selectedLag)}
              y2={PAD_T + innerH}
              stroke="#C85A32"
              strokeWidth="1.6"
              strokeDasharray="2 2"
            />
            <circle cx={mapX(selectedLag)} cy={mapY(selectedRVal)} r="5.5" fill="#C85A32" stroke="#FFFFFF" strokeWidth="2" />
            <circle cx={mapX(0)} cy={mapY(zeroLagR)} r="4.5" fill="#1A1917" stroke="#FFFFFF" strokeWidth="1.8" />

            {[yMin, 0, yMax].map((v, i) => (
              <text key={i} x={PAD_L - 8} y={mapY(v) + 3.5} textAnchor="end" className="text-[9.5px] font-mono fill-[#75736E]">
                {v.toFixed(1)}
              </text>
            ))}

            {[-tauMax, -tauMax / 2, 0, tauMax / 2, tauMax].map((t) => (
              <text key={t} x={mapX(t)} y={PAD_T + innerH + 17} textAnchor="middle" className="text-[9.5px] font-mono fill-[#75736E]">
                {t >= 0 ? `+${t.toFixed(1)}` : t.toFixed(1)}s
              </text>
            ))}

            <text x={PAD_L + 4} y={17} textAnchor="start" className="text-[10px] font-mono font-bold fill-[#1A1917]">
              Autocorrelation R_XX(τ) [V²] · Single-Path R_i(τ) = {selectedSingleRVal.toFixed(2)} V²
            </text>
            <text x={PLOT_W - PAD_R} y={PLOT_H - 4} textAnchor="end" className="text-[10px] font-mono font-bold fill-[#1A1917]">
              Time Lag τ [s] →
            </text>
          </svg>
        </div>

        {/* 4-Part Explanation */}
        <div className="bg-[#FAF9F6] rounded-md border border-[#E6E4DD] p-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div>
            <div className="font-mono font-bold text-[#1A1917] uppercase text-[10px] mb-1">1. What Is Calculated</div>
            <p className="text-[#585651] leading-relaxed">
              Unbiased sample autocorrelation <MathView math="\hat{R}_{XX}(\tau)" /> averaged across realizations and normalized correlation <MathView math="\rho(\tau)" />.
            </p>
          </div>
          <div>
            <div className="font-mono font-bold text-[#1A1917] uppercase text-[10px] mb-1">2. Data Used</div>
            <p className="text-[#585651] leading-relaxed">
              Sample pairs <MathView math="x_i(t_k)x_i(t_k + m\Delta t)" /> across all <MathView math={`M=${M}`} /> paths and path <MathView math={`i=${selectedRealizationIndex + 1}`} />.
            </p>
          </div>
          <div>
            <div className="font-mono font-bold text-[#1A1917] uppercase text-[10px] mb-1">3. What It Represents</div>
            <p className="text-[#585651] leading-relaxed">
              Statistical similarity between samples separated by time lag <MathView math="\tau" />; <MathView math="R_{XX}(0)" /> equals total average signal power.
            </p>
          </div>
          <div>
            <div className="font-mono font-bold text-[#1A1917] uppercase text-[10px] mb-1">4. Process Insight</div>
            <p className="text-[#585651] leading-relaxed">
              {theoreticalRxx
                ? 'Fast decay in τ indicates rapid decorrelation (short memory); periodic lobes indicate persistent harmonic structure.'
                : 'For non-stationary processes, a single 1D R_XX(τ) collapses time-varying correlation and only represents a window-averaged proxy.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
