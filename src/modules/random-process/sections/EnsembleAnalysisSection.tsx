/**
 * Section 4: Ensemble Analysis
 * Vertical time slice t = t0 across all M realizations,
 * cross-sectional distribution, sample spread, confidence intervals,
 * and convergence of ensemble statistics via the Law of Large Numbers.
 */

import React from 'react';
import { Layers, Activity, Users, Info, BookOpen } from 'lucide-react';
import { MathView } from '../../../components/MathView';
import {
  EnsembleSimulationData,
  getInstantaneousStats,
} from '../randomProcessEngine';

interface EnsembleAnalysisSectionProps {
  simulation: EnsembleSimulationData;
  simTime: number;
  onSeekTime: (t: number) => void;
  selectedRealizationIndex: number;
  onSelectRealization: (idx: number) => void;
}

const TRAJECTORY_COLORS = [
  '#C85A32', '#2E6F7E', '#5C5589', '#B45309',
  '#2D6A4F', '#9B4F8C', '#0284C7', '#D97706',
  '#7C3AED', '#059669', '#DC2626', '#475569',
];

export const EnsembleAnalysisSection: React.FC<EnsembleAnalysisSectionProps> = ({
  simulation,
  simTime,
  onSeekTime,
  selectedRealizationIndex,
  onSelectRealization,
}) => {
  const stats = getInstantaneousStats(simulation, simTime, selectedRealizationIndex);
  const M = simulation.trajectories.length;

  // Coordinate mapping for Cross-Sectional Strip Visualizer (Width 760, Height 220)
  const STRIP_W = 760;
  const STRIP_H = 220;
  const PAD_X = 60;
  const innerW = STRIP_W - 2 * PAD_X;
  const midY = STRIP_H / 2;

  // Y-axis bounds based on instantaneous values
  const maxVal = Math.max(3.0, ...stats.ensembleValues.map((v) => Math.abs(v))) * 1.2;
  const mapAmpToX = (v: number) => {
    const clamped = Math.max(-maxVal, Math.min(maxVal, v));
    return PAD_X + ((clamped + maxVal) / (2 * maxVal)) * innerW;
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-[#FAF9F6] border border-[#E6E4DD] rounded-lg p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#C85A32] bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/20">
            Section 04
          </span>
          <span className="text-xs text-[#75736E] font-medium">Vertical Time-Slice Statistics</span>
        </div>
        <h2 className="text-lg font-bold text-[#1A1917]">
          Ensemble Analysis at Time Instant <MathView math={`t = ${simTime.toFixed(2)}\\text{s}`} />
        </h2>
        <p className="text-xs sm:text-sm text-[#585651] mt-1 max-w-3xl leading-relaxed">
          An <strong>ensemble average</strong> freezes time at a chosen instant <MathView math="t = t_0" /> and averages across all experimental realizations <MathView math="\{x_1(t_0), x_2(t_0), \dots, x_M(t_0)\}" />. This contrasts fundamentally with a time average, which tracks a single realization over time.
        </p>
      </div>

      {/* 2. Visual Cross-Section Strip Display */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#C85A32]" />
            <span className="font-mono font-bold text-[#1A1917]">
              Vertical Slice: Distribution of {M} Realizations at t = {simTime.toFixed(2)}s
            </span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="text-[#75736E]">Slide Time Instant:</span>
            <input
              type="range"
              min="0"
              max={simulation.params.tMax}
              step="0.05"
              value={simTime}
              onChange={(e) => onSeekTime(parseFloat(e.target.value))}
              className="w-36 accent-[#C85A32] cursor-pointer"
            />
            <span className="font-bold text-[#1A1917]">{simTime.toFixed(2)}s</span>
          </div>
        </div>

        {/* 1D Strip Visualization SVG */}
        <div className="relative w-full h-[220px] bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden flex items-center justify-center p-2">
          <svg
            viewBox={`0 0 ${STRIP_W} ${STRIP_H}`}
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full select-none"
          >
            {/* Center Axis Line */}
            <line
              x1={PAD_X}
              y1={midY}
              x2={STRIP_W - PAD_X}
              y2={midY}
              stroke="#1A1917"
              strokeWidth="1.8"
            />

            {/* Zero Marker */}
            <line
              x1={mapAmpToX(0)}
              y1={midY - 40}
              x2={mapAmpToX(0)}
              y2={midY + 40}
              stroke="#75736E"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <text
              x={mapAmpToX(0)}
              y={midY + 54}
              textAnchor="middle"
              className="text-[10px] font-mono fill-[#75736E]"
            >
              0.0V (Baseline)
            </text>

            {/* Confidence Interval Shaded Zone [mu - 1.96*sigma, mu + 1.96*sigma] */}
            <rect
              x={mapAmpToX(stats.confidenceLower)}
              y={midY - 35}
              width={Math.max(2, mapAmpToX(stats.confidenceUpper) - mapAmpToX(stats.confidenceLower))}
              height="70"
              rx="6"
              fill="#C85A32"
              fillOpacity="0.09"
              stroke="#C85A32"
              strokeWidth="1.2"
              strokeDasharray="4 3"
            />
            <text
              x={mapAmpToX(stats.ensembleMean)}
              y={midY - 42}
              textAnchor="middle"
              className="text-[9.5px] font-mono font-bold fill-[#C85A32]"
            >
              95% Confidence Interval [μ̂ ± 1.96σ̂]
            </text>

            {/* Individual Realization Markers */}
            {stats.ensembleValues.map((val, idx) => {
              const xPos = mapAmpToX(val);
              const isSelected = idx === selectedRealizationIndex;
              const color = TRAJECTORY_COLORS[idx % TRAJECTORY_COLORS.length];
              // Offset slightly vertically to avoid pure collinear clustering
              const yOffset = ((idx % 3) - 1) * 14;

              return (
                <g key={idx}>
                  <line
                    x1={xPos}
                    y1={midY}
                    x2={xPos}
                    y2={midY + yOffset}
                    stroke={color}
                    strokeWidth="1"
                    opacity="0.6"
                  />
                  <circle
                    cx={xPos}
                    cy={midY + yOffset}
                    r={isSelected ? '7' : '4.5'}
                    fill={color}
                    stroke="#FFFFFF"
                    strokeWidth="2"
                    className="cursor-pointer transition-transform"
                    onClick={() => onSelectRealization(idx)}
                  />
                  <text
                    x={xPos}
                    y={midY + yOffset - (isSelected ? 9 : 7)}
                    textAnchor="middle"
                    className={`text-[8.5px] font-mono ${
                      isSelected ? 'font-bold fill-[#1A1917]' : 'fill-[#75736E]'
                    }`}
                  >
                    X<sup>({idx + 1})</sup>
                  </text>
                </g>
              );
            })}

            {/* Ensemble Mean Indicator Marker */}
            <g transform={`translate(${mapAmpToX(stats.ensembleMean)}, ${midY})`}>
              <polygon points="0,-16 -7,-28 7,-28" fill="#1A1917" />
              <line x1="0" y1="-28" x2="0" y2="28" stroke="#1A1917" strokeWidth="2.5" />
              <polygon points="0,16 -7,28 7,28" fill="#1A1917" />
              <text
                x="0"
                y="-32"
                textAnchor="middle"
                className="text-[10px] font-mono font-bold fill-[#1A1917]"
              >
                μ̂ = {stats.ensembleMean.toFixed(3)}V
              </text>
            </g>

            {/* Scale End Labels */}
            <text
              x={PAD_X}
              y={midY + 22}
              textAnchor="start"
              className="text-[10px] font-mono fill-[#75736E]"
            >
              -{maxVal.toFixed(1)}V
            </text>
            <text
              x={STRIP_W - PAD_X}
              y={midY + 22}
              textAnchor="end"
              className="text-[10px] font-mono fill-[#75736E]"
            >
              +{maxVal.toFixed(1)}V
            </text>
          </svg>
        </div>
      </div>

      {/* 3. Realization Slice Data Table */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#E6E4DD]">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1917]">
            Individual Ensemble Sample Values at t = {simTime.toFixed(2)}s
          </h3>
          <span className="text-[11px] font-mono text-[#75736E]">
            Click row to inspect waveform
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {stats.ensembleValues.map((val, idx) => {
            const isSelected = idx === selectedRealizationIndex;
            const color = TRAJECTORY_COLORS[idx % TRAJECTORY_COLORS.length];
            const dev = val - stats.ensembleMean;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectRealization(idx)}
                className={`p-2.5 rounded text-left border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#FAF9F6] border-[#C85A32] ring-1 ring-[#C85A32]/40 shadow-xs'
                    : 'bg-white border-[#E6E4DD] hover:border-[#8A8882]'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                  <span className="font-bold flex items-center gap-1.5" style={{ color }}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    X<sup>({idx + 1})</sup>
                  </span>
                  <span className="text-[10px] text-[#75736E]">
                    {dev >= 0 ? '+' : ''}
                    {dev.toFixed(2)}
                  </span>
                </div>
                <div className="text-sm font-bold font-mono text-[#1A1917]">
                  {val >= 0 ? '+' : ''}
                  {val.toFixed(3)} V
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Mathematical & Engineering Explanation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="p-4 bg-white rounded-lg border border-[#E6E4DD] shadow-2xs space-y-2">
          <div className="font-mono font-bold text-sm text-[#1A1917] flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-[#C85A32]" />
            <span>Ensemble Mean Definition</span>
          </div>
          <div className="p-2.5 bg-[#FAF9F6] rounded border border-[#E6E4DD] font-mono">
            <MathView math="\mu_X(t) = \mathbb{E}[X(t)] = \int_{-\infty}^{\infty} x \cdot f_{X(t)}(x) \, dx \approx \frac{1}{M}\sum_{i=1}^M x_i(t)" displayMode={true} />
          </div>
          <p className="text-[#585651] leading-relaxed">
            The ensemble mean represents the statistical expected value at time instant <MathView math="t" /> across an infinite collection of identical stochastic experiments. In finite simulations, the sample average <MathView math="\hat{\mu}_X(t)" /> converges toward <MathView math="\mathbb{E}[X(t)]" /> as <MathView math="M \to \infty" /> by the Strong Law of Large Numbers.
          </p>
        </div>

        <div className="p-4 bg-white rounded-lg border border-[#E6E4DD] shadow-2xs space-y-2">
          <div className="font-mono font-bold text-sm text-[#1A1917] flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-[#C85A32]" />
            <span>Ensemble Variance Definition</span>
          </div>
          <div className="p-2.5 bg-[#FAF9F6] rounded border border-[#E6E4DD] font-mono">
            <MathView math="\sigma_X^2(t) = \mathbb{E}[(X(t) - \mu_X(t))^2] \approx \frac{1}{M-1}\sum_{i=1}^M (x_i(t) - \hat{\mu}_X(t))^2" displayMode={true} />
          </div>
          <p className="text-[#585651] leading-relaxed">
            Variance measures the dispersion or instantaneous fluctuating power of the process about its mean at time <MathView math="t" />. For wide-sense stationary (WSS) processes, this variance remains invariant over time; for non-stationary processes, it expands or contracts over time.
          </p>
        </div>
      </div>
    </div>
  );
};
