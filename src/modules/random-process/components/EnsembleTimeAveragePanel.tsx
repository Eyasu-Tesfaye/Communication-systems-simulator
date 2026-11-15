/**
 * Module 03: Area 2 — Ensemble and Time-Average Analysis
 * Distinguishes averaging across realizations at fixed t (vertical slice)
 * from averaging across time along a single realization (horizontal horizon).
 */

import React, { useMemo } from 'react';
import { Clock, Users, TrendingUp } from 'lucide-react';
import { MathView } from '../../../components/MathView';
import {
  EnsembleSimulationData,
  PROCESS_CATALOG,
  getInstantaneousStats,
} from '../randomProcessEngine';
import { REALIZATION_COLORS } from '../RandomProcessVisualizer';

interface EnsembleTimeAveragePanelProps {
  simulation: EnsembleSimulationData;
  simTime: number;
  onSeekTime: (t: number) => void;
  selectedRealizationIndex: number;
  onSelectRealization: (idx: number) => void;
}

export const EnsembleTimeAveragePanel: React.FC<EnsembleTimeAveragePanelProps> = ({
  simulation,
  simTime,
  onSeekTime,
  selectedRealizationIndex,
  onSelectRealization,
}) => {
  const {
    trajectories,
    timeSteps,
    ensembleMean,
    runningTimeAverages,
    timeAverages,
    grandEnsembleMean,
    params,
  } = simulation;

  const M = trajectories.length;
  const T_MAX = params.tMax;
  const meta = PROCESS_CATALOG[params.type];

  const stats = useMemo(
    () => getInstantaneousStats(simulation, simTime, selectedRealizationIndex),
    [simulation, simTime, selectedRealizationIndex]
  );

  const selectedIdx = stats.selectedRealizationIndex;
  const selectedRunningAvg = runningTimeAverages[selectedIdx] || [];
  const selectedColor = REALIZATION_COLORS[selectedIdx % REALIZATION_COLORS.length];

  // 1. Comparison Plot: Ensemble Mean mu_hat(t) vs Running Time Average <x_i>_t
  const COMP_W = 760;
  const COMP_H = 220;
  const PAD_L = 58;
  const PAD_R = 24;
  const PAD_T = 26;
  const PAD_B = 36;
  const compInnerW = COMP_W - PAD_L - PAD_R;
  const compInnerH = COMP_H - PAD_T - PAD_B;

  const { compMin, compMax } = useMemo(() => {
    const vals = [...ensembleMean, ...selectedRunningAvg, 0];
    const minV = Math.min(...vals);
    const maxV = Math.max(...vals);
    const span = Math.max(1.2, maxV - minV);
    return {
      compMin: Math.min(-0.8, minV - span * 0.2),
      compMax: Math.max(0.8, maxV + span * 0.2),
    };
  }, [ensembleMean, selectedRunningAvg]);

  const mapCompX = (t: number) => PAD_L + (t / T_MAX) * compInnerW;
  const mapCompY = (v: number) => {
    const range = compMax - compMin || 1;
    return PAD_T + compInnerH - ((v - compMin) / range) * compInnerH;
  };

  const ensMeanPath = useMemo(() => {
    return timeSteps.reduce((acc, t, idx) => {
      const x = mapCompX(t).toFixed(1);
      const y = mapCompY(ensembleMean[idx]).toFixed(1);
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [timeSteps, ensembleMean, compMin, compMax, T_MAX]);

  const runTimeAvgPath = useMemo(() => {
    return timeSteps.reduce((acc, t, idx) => {
      const x = mapCompX(t).toFixed(1);
      const y = mapCompY(selectedRunningAvg[idx]).toFixed(1);
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [timeSteps, selectedRunningAvg, compMin, compMax, T_MAX]);

  // 2. Cross-Sectional Vertical Slice SVG (Width 760, Height 155)
  const STRIP_W = 760;
  const STRIP_H = 155;
  const STRIP_PAD_X = 56;
  const stripInnerW = STRIP_W - 2 * STRIP_PAD_X;
  const midY = STRIP_H / 2;

  const maxSliceVal = Math.max(3.0, ...stats.ensembleValues.map((v) => Math.abs(v))) * 1.15;
  const mapAmpToX = (v: number) => {
    const clamped = Math.max(-maxSliceVal, Math.min(maxSliceVal, v));
    return STRIP_PAD_X + ((clamped + maxSliceVal) / (2 * maxSliceVal)) * stripInnerW;
  };

  const meanComparisonDiff = Math.abs(stats.timeAvgSelected - stats.ensembleMean);
  const grandDiff = Math.abs(stats.timeAvgSelected - grandEnsembleMean);

  return (
    <div className="space-y-4">
      {/* 1. Formula & Numerical Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* A. Ensemble Average Card */}
        <div className="bg-white rounded-lg border border-[#E6E4DD] p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E6E4DD]">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#C85A32]" />
              <h3 className="font-mono font-bold text-xs sm:text-sm text-[#1A1917]">
                A. Ensemble Average (Across Realizations)
              </h3>
            </div>
            <span className="text-[10px] font-mono uppercase bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/25 text-[#C85A32] font-bold">
              At t = {stats.simTime.toFixed(2)} s
            </span>
          </div>

          <div className="p-2 bg-[#FAF9F6] rounded border border-[#E6E4DD] text-xs">
            <MathView
              math="\hat{\mu}_X(t) = \frac{1}{M} \sum_{i=1}^M x_i(t)"
              displayMode={true}
            />
          </div>

          <div className="p-2.5 bg-white rounded border border-[#E6E4DD] space-y-1 text-xs font-mono">
            <div className="flex justify-between text-[#585651]">
              <span>Ensemble Size (M):</span>
              <strong className="text-[#1A1917]">{M} parallel paths</strong>
            </div>
            <div className="flex justify-between text-[#C85A32]">
              <span>Instantaneous Ensemble Mean μ̂(t):</span>
              <strong className="font-bold tabular-nums">
                {stats.ensembleMean >= 0 ? '+' : ''}
                {stats.ensembleMean.toFixed(3)} V
              </strong>
            </div>
            <div className="flex justify-between text-[#585651]">
              <span>Grand Mean Over [0, T]:</span>
              <strong className="text-[#1A1917] tabular-nums">
                {grandEnsembleMean >= 0 ? '+' : ''}
                {grandEnsembleMean.toFixed(3)} V
              </strong>
            </div>
          </div>

          <p className="text-xs text-[#585651] leading-relaxed">
            <strong>Vertical Averaging:</strong> Freezes time at <MathView math="t" /> and averages across all <MathView math="M" /> realizations simultaneously.
          </p>
        </div>

        {/* B. Time Average Card */}
        <div className="bg-white rounded-lg border border-[#E6E4DD] p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E6E4DD]">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#059669]" />
              <h3 className="font-mono font-bold text-xs sm:text-sm text-[#1A1917]">
                B. Time Average (Along One Realization)
              </h3>
            </div>
            <span className="text-[10px] font-mono uppercase bg-[#10B981]/10 px-2 py-0.5 rounded border border-[#10B981]/30 text-[#059669] font-bold">
              Path X<sup>({selectedIdx + 1})</sup>
            </span>
          </div>

          <div className="p-2 bg-[#FAF9F6] rounded border border-[#E6E4DD] text-xs">
            <MathView
              math="\langle x_i \rangle_T = \frac{1}{T}\int_0^T x_i(t)\,dt \approx \frac{1}{N}\sum_{k=0}^{N-1} x_i(t_k)"
              displayMode={true}
            />
          </div>

          <div className="p-2.5 bg-white rounded border border-[#E6E4DD] space-y-1 text-xs font-mono">
            <div className="flex justify-between text-[#585651]">
              <span>Running Average ⟨x⟩ up to t={stats.simTime.toFixed(2)}s:</span>
              <strong className="text-[#1A1917] tabular-nums">
                {stats.runningTimeAvgSelected >= 0 ? '+' : ''}
                {stats.runningTimeAvgSelected.toFixed(3)} V
              </strong>
            </div>
            <div className="flex justify-between text-[#059669]">
              <span>Full-Horizon Time Mean ⟨x⟩_T:</span>
              <strong className="font-bold tabular-nums">
                {stats.timeAvgSelected >= 0 ? '+' : ''}
                {stats.timeAvgSelected.toFixed(3)} V
              </strong>
            </div>
            <div className="flex justify-between text-[#585651]">
              <span>Gap |⟨x⟩_T − μ̂(t)| / |⟨x⟩_T − μ̄|:</span>
              <strong className="text-[#C85A32] tabular-nums">
                {meanComparisonDiff.toFixed(3)} / {grandDiff.toFixed(3)} V
              </strong>
            </div>
          </div>

          <p className="text-xs text-[#585651] leading-relaxed">
            <strong>Horizontal Averaging:</strong> Follows a single trajectory <MathView math={`X^{(${selectedIdx + 1})}(t)`} /> across <MathView math="N" /> time samples in <MathView math="[0, T]" />.
          </p>
        </div>
      </div>

      {/* 2. Ensemble Mean vs. Running Time-Average Graph */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E6E4DD] text-xs">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#C85A32]" />
            <h3 className="font-mono font-bold text-[#1A1917]">
              Ensemble Mean μ̂(t) vs. Running Time Average ⟨x<sup>({selectedIdx + 1})</sup>⟩<sub>t</sub>
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-0.5 bg-[#1A1917]" />
              <span className="text-[#1A1917] font-semibold">Ensemble Mean μ̂(t)</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3.5 h-0.5 bg-[#059669]" />
              <span className="text-[#059669] font-semibold">Running Time Avg ⟨x⟩_t</span>
            </span>
          </div>
        </div>

        <div className="relative w-full h-[215px] bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden p-1">
          <svg
            viewBox={`0 0 ${COMP_W} ${COMP_H}`}
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full select-none cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const svgX = ((e.clientX - rect.left) / rect.width) * COMP_W;
              const newT = Math.max(0, Math.min(T_MAX, ((svgX - PAD_L) / compInnerW) * T_MAX));
              onSeekTime(parseFloat(newT.toFixed(2)));
            }}
            role="img"
            aria-label="Ensemble mean vs running time average comparison chart"
          >
            {/* Zero baseline */}
            <line
              x1={PAD_L}
              y1={mapCompY(0)}
              x2={COMP_W - PAD_R}
              y2={mapCompY(0)}
              stroke="#DCD8CE"
              strokeWidth="1.2"
              strokeDasharray="3 3"
            />
            {/* Axes */}
            <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + compInnerH} stroke="#1A1917" strokeWidth="1.3" />
            <line x1={PAD_L} y1={PAD_T + compInnerH} x2={COMP_W - PAD_R} y2={PAD_T + compInnerH} stroke="#1A1917" strokeWidth="1.3" />

            {/* Ensemble Mean Curve */}
            <path d={ensMeanPath} fill="none" stroke="#1A1917" strokeWidth="2.2" strokeLinecap="round" />

            {/* Running Time Average Curve */}
            <path d={runTimeAvgPath} fill="none" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" />

            {/* Synchronized Moving Vertical Cursor */}
            <line
              x1={mapCompX(stats.simTime)}
              y1={PAD_T}
              x2={mapCompX(stats.simTime)}
              y2={PAD_T + compInnerH}
              stroke="#C85A32"
              strokeWidth="1.8"
            />
            <circle
              cx={mapCompX(stats.simTime)}
              cy={mapCompY(stats.ensembleMean)}
              r="4.5"
              fill="#1A1917"
              stroke="#FFFFFF"
              strokeWidth="1.8"
            />
            <circle
              cx={mapCompX(stats.simTime)}
              cy={mapCompY(stats.runningTimeAvgSelected)}
              r="4.5"
              fill="#059669"
              stroke="#FFFFFF"
              strokeWidth="1.8"
            />

            {/* Y ticks */}
            {[compMin, 0, compMax].map((v, i) => (
              <text
                key={i}
                x={PAD_L - 8}
                y={mapCompY(v) + 3.5}
                textAnchor="end"
                className="text-[9.5px] font-mono fill-[#75736E]"
              >
                {v >= 0 ? `+${v.toFixed(1)}` : v.toFixed(1)}V
              </text>
            ))}

            {/* X ticks */}
            {[0, 2, 4, 6, 8, 10].map((t) => (
              <text
                key={t}
                x={mapCompX(t)}
                y={PAD_T + compInnerH + 15}
                textAnchor="middle"
                className="text-[9.5px] font-mono fill-[#75736E]"
              >
                {t}s
              </text>
            ))}

            <text x={PAD_L + 4} y={16} className="text-[10px] font-mono font-bold fill-[#1A1917]">
              Average Value [V]
            </text>
            <text x={COMP_W - PAD_R} y={COMP_H - 4} textAnchor="end" className="text-[10px] font-mono font-bold fill-[#1A1917]">
              Time t [s] →
            </text>
          </svg>
        </div>
      </div>

      {/* 3. Vertical Time Slice Strip + Realization Time-Average Selector */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-mono font-bold text-[#1A1917]">
            Ensemble Vertical Slice at t = {stats.simTime.toFixed(2)}s (95% Spread & Mean μ̂)
          </span>
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="text-[#75736E]">Seek t:</span>
            <input
              type="range"
              min="0"
              max={T_MAX}
              step="0.05"
              value={simTime}
              onChange={(e) => onSeekTime(parseFloat(e.target.value))}
              className="w-32 accent-[#C85A32] cursor-pointer"
            />
            <span className="font-bold text-[#1A1917] tabular-nums">{simTime.toFixed(2)}s</span>
          </div>
        </div>

        <div className="relative w-full h-[150px] bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden p-1">
          <svg
            viewBox={`0 0 ${STRIP_W} ${STRIP_H}`}
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full select-none"
          >
            <line x1={STRIP_PAD_X} y1={midY} x2={STRIP_W - STRIP_PAD_X} y2={midY} stroke="#1A1917" strokeWidth="1.5" />
            <line x1={mapAmpToX(0)} y1={midY - 26} x2={mapAmpToX(0)} y2={midY + 26} stroke="#75736E" strokeWidth="1" strokeDasharray="3 3" />
            <text x={mapAmpToX(0)} y={midY + 38} textAnchor="middle" className="text-[9.5px] font-mono fill-[#75736E]">
              0.0 V
            </text>

            {/* 95% Spread Zone */}
            <rect
              x={mapAmpToX(stats.confidenceLower)}
              y={midY - 22}
              width={Math.max(2, mapAmpToX(stats.confidenceUpper) - mapAmpToX(stats.confidenceLower))}
              height="44"
              rx="4"
              fill="#C85A32"
              fillOpacity="0.09"
              stroke="#C85A32"
              strokeWidth="1"
              strokeDasharray="4 3"
            />

            {stats.ensembleValues.map((val, idx) => {
              const xPos = mapAmpToX(val);
              const isSelected = idx === selectedIdx;
              const color = REALIZATION_COLORS[idx % REALIZATION_COLORS.length];
              const yOffset = ((idx % 3) - 1) * 11;

              return (
                <g key={idx}>
                  <line x1={xPos} y1={midY} x2={xPos} y2={midY + yOffset} stroke={color} strokeWidth="1" opacity="0.6" />
                  <circle
                    cx={xPos}
                    cy={midY + yOffset}
                    r={isSelected ? '6' : '3.8'}
                    fill={color}
                    stroke="#FFFFFF"
                    strokeWidth="1.6"
                    className="cursor-pointer"
                    onClick={() => onSelectRealization(idx)}
                  />
                </g>
              );
            })}

            <g transform={`translate(${mapAmpToX(stats.ensembleMean)}, ${midY})`}>
              <line x1="0" y1="-22" x2="0" y2="22" stroke="#1A1917" strokeWidth="2.4" />
              <text x="0" y="-27" textAnchor="middle" className="text-[10px] font-mono font-bold fill-[#1A1917]">
                μ̂ = {stats.ensembleMean >= 0 ? '+' : ''}{stats.ensembleMean.toFixed(2)}V
              </text>
            </g>

            <text x={STRIP_PAD_X} y={midY + 16} textAnchor="start" className="text-[9px] font-mono fill-[#75736E]">
              -{maxSliceVal.toFixed(1)}V
            </text>
            <text x={STRIP_W - STRIP_PAD_X} y={midY + 16} textAnchor="end" className="text-[9px] font-mono fill-[#75736E]">
              +{maxSliceVal.toFixed(1)}V
            </text>
          </svg>
        </div>

        {/* All Realizations Time-Mean Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 pt-1">
          {timeAverages.map((tMean, idx) => {
            const isSelected = idx === selectedIdx;
            const color = REALIZATION_COLORS[idx % REALIZATION_COLORS.length];
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectRealization(idx)}
                className={`p-2 rounded text-left border text-[11px] font-mono transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#FBF4F0] border-[#C85A32]'
                    : 'bg-[#FAF9F6] border-[#E6E4DD] hover:border-[#8A8882]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold" style={{ color: selectedColor && isSelected ? color : color }}>
                    X<sup>({idx + 1})</sup>
                  </span>
                  <span className="text-[10px] text-[#75736E]">⟨x⟩_T</span>
                </div>
                <div className="font-bold text-[#1A1917] tabular-nums mt-0.5">
                  {tMean >= 0 ? '+' : ''}{tMean.toFixed(3)} V
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Structured Explanation */}
      <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div>
          <div className="font-mono font-bold text-[#1A1917] uppercase text-[10px] mb-1">1. What Is Calculated</div>
          <p className="text-[#585651] leading-relaxed">
            Instantaneous ensemble mean <MathView math="\hat{\mu}_X(t)" /> across realizations and running/full-horizon time average <MathView math="\langle x_i \rangle_t" /> along path <MathView math={`i=${selectedIdx + 1}`} />.
          </p>
        </div>
        <div>
          <div className="font-mono font-bold text-[#1A1917] uppercase text-[10px] mb-1">2. Data Used</div>
          <p className="text-[#585651] leading-relaxed">
            Column <MathView math="t_k" /> across all <MathView math={`${M}`} /> trajectories for ensemble mean; row <MathView math={`i=${selectedIdx + 1}`} /> over <MathView math="[0, T]" /> for time average.
          </p>
        </div>
        <div>
          <div className="font-mono font-bold text-[#1A1917] uppercase text-[10px] mb-1">3. What It Represents</div>
          <p className="text-[#585651] leading-relaxed">
            Ensemble averaging captures behavior across parallel experiments; time averaging captures the DC average of one long recording.
          </p>
        </div>
        <div>
          <div className="font-mono font-bold text-[#1A1917] uppercase text-[10px] mb-1">4. Process Insight</div>
          <p className="text-[#585651] leading-relaxed">
            {meta.isErgodic
              ? 'Because this process is stationary & ergodic, the running time average converges toward the ensemble mean as observation time increases.'
              : 'Because this process is non-stationary, the ensemble mean drifts with t and a single time average cannot represent μ_X(t).'}
          </p>
        </div>
      </div>
    </div>
  );
};
