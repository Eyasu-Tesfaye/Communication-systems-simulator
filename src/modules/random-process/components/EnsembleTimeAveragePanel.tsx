/**
 * Module 03: Topics 1 & 2 — Sample Realizations, Ensemble Average, and Time-Average Analysis
 * Clear distinction: ensemble averaging across realizations vs time averaging across time.
 */

import React from 'react';
import { Layers, Clock, Users, ArrowRight, BookOpen } from 'lucide-react';
import { MathView } from '../../../components/MathView';
import {
  EnsembleSimulationData,
  getInstantaneousStats,
} from '../randomProcessEngine';

interface EnsembleTimeAveragePanelProps {
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

export const EnsembleTimeAveragePanel: React.FC<EnsembleTimeAveragePanelProps> = ({
  simulation,
  simTime,
  onSeekTime,
  selectedRealizationIndex,
  onSelectRealization,
}) => {
  const stats = getInstantaneousStats(simulation, simTime, selectedRealizationIndex);
  const M = simulation.trajectories.length;

  // Cross-Sectional Vertical Slice SVG (Width 760, Height 180)
  const STRIP_W = 760;
  const STRIP_H = 180;
  const PAD_X = 60;
  const innerW = STRIP_W - 2 * PAD_X;
  const midY = STRIP_H / 2;

  const maxVal = Math.max(3.0, ...stats.ensembleValues.map((v) => Math.abs(v))) * 1.2;
  const mapAmpToX = (v: number) => {
    const clamped = Math.max(-maxVal, Math.min(maxVal, v));
    return PAD_X + ((clamped + maxVal) / (2 * maxVal)) * innerW;
  };

  return (
    <div className="space-y-6">
      {/* 1. Clear Comparison: Ensemble Average vs. Time Average */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* A. Ensemble Average Card */}
        <div className="bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E6E4DD]">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#C85A32]" />
              <h3 className="font-mono font-bold text-sm text-[#1A1917]">
                A. Ensemble Average (Across Realizations)
              </h3>
            </div>
            <span className="text-[10px] font-mono uppercase bg-[#FAF9F6] px-2 py-0.5 rounded border border-[#E6E4DD] text-[#75736E]">
              Frozen Time t = {simTime.toFixed(2)}s
            </span>
          </div>

          <div className="p-2.5 bg-[#FAF9F6] rounded border border-[#E6E4DD] text-xs font-mono">
            <MathView
              math="\mu_X(t) = \mathbb{E}[X(t)] \approx \frac{1}{M} \sum_{i=1}^M x_i(t)"
              displayMode={true}
            />
          </div>

          <div className="p-3 bg-white rounded border border-[#E6E4DD] space-y-1 text-xs font-mono">
            <div className="flex justify-between text-[#585651]">
              <span>Sampled Instant:</span>
              <strong className="text-[#1A1917]">t = {simTime.toFixed(2)} s</strong>
            </div>
            <div className="flex justify-between text-[#585651]">
              <span>Realization Count (M):</span>
              <strong className="text-[#1A1917]">{M} trajectories</strong>
            </div>
            <div className="flex justify-between text-[#C85A32] pt-1 border-t border-[#E6E4DD]/70">
              <span>Calculated Ensemble Mean:</span>
              <strong className="font-bold">
                {stats.ensembleMean >= 0 ? '+' : ''}
                {stats.ensembleMean.toFixed(3)} V
              </strong>
            </div>
            <div className="flex justify-between text-[#585651]">
              <span>Calculated Ensemble Variance:</span>
              <strong className="text-[#1A1917]">{stats.ensembleVariance.toFixed(3)} V²</strong>
            </div>
          </div>

          <p className="text-xs text-[#585651] leading-relaxed">
            <strong>What it represents:</strong> The average value of the signal observed across many parallel, independent runs of the experiment at one fixed instant in time.
          </p>
        </div>

        {/* B. Time Average Card */}
        <div className="bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E6E4DD]">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#10B981]" />
              <h3 className="font-mono font-bold text-sm text-[#1A1917]">
                B. Time Average (Across Time Horizon)
              </h3>
            </div>
            <span className="text-[10px] font-mono uppercase bg-[#FAF9F6] px-2 py-0.5 rounded border border-[#E6E4DD] text-[#75736E]">
              Realization X<sup>({selectedRealizationIndex + 1})</sup>
            </span>
          </div>

          <div className="p-2.5 bg-[#FAF9F6] rounded border border-[#E6E4DD] text-xs font-mono">
            <MathView
              math="\langle x_i \rangle_T = \frac{1}{T}\int_0^T x_i(t) \, dt \approx \frac{1}{N}\sum_{k=0}^{N-1} x_i(t_k)"
              displayMode={true}
            />
          </div>

          <div className="p-3 bg-white rounded border border-[#E6E4DD] space-y-1 text-xs font-mono">
            <div className="flex justify-between text-[#585651]">
              <span>Selected Realization:</span>
              <strong className="text-[#1A1917]">
                X<sup>({selectedRealizationIndex + 1})</sup>(t)
              </strong>
            </div>
            <div className="flex justify-between text-[#585651]">
              <span>Observation Horizon:</span>
              <strong className="text-[#1A1917]">T = {simulation.params.tMax.toFixed(1)} s ({simulation.params.sampleCount} pts)</strong>
            </div>
            <div className="flex justify-between text-[#10B981] pt-1 border-t border-[#E6E4DD]/70">
              <span>Calculated Time Mean ⟨x⟩:</span>
              <strong className="font-bold">
                {stats.timeAvgSelected >= 0 ? '+' : ''}
                {stats.timeAvgSelected.toFixed(3)} V
              </strong>
            </div>
            <div className="flex justify-between text-[#585651]">
              <span>Calculated Time Variance:</span>
              <strong className="text-[#1A1917]">{stats.timeVarSelected.toFixed(3)} V²</strong>
            </div>
          </div>

          <p className="text-xs text-[#585651] leading-relaxed">
            <strong>What it represents:</strong> The temporal average computed along the duration of a single waveform recorded by an oscilloscope over time.
          </p>
        </div>
      </div>

      {/* 2. Vertical Time Slice Strip: Visualizing the Ensemble at t = simTime */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-[#1A1917]">
              Vertical Slice: Realization Values at t = {simTime.toFixed(2)}s
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
        <div className="relative w-full h-[180px] bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden flex items-center justify-center p-2">
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
              y1={midY - 30}
              x2={mapAmpToX(0)}
              y2={midY + 30}
              stroke="#75736E"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <text
              x={mapAmpToX(0)}
              y={midY + 44}
              textAnchor="middle"
              className="text-[10px] font-mono fill-[#75736E]"
            >
              0.0V (Baseline)
            </text>

            {/* Confidence Interval Shaded Zone [mu - 1.96*sigma, mu + 1.96*sigma] */}
            <rect
              x={mapAmpToX(stats.confidenceLower)}
              y={midY - 25}
              width={Math.max(2, mapAmpToX(stats.confidenceUpper) - mapAmpToX(stats.confidenceLower))}
              height="50"
              rx="4"
              fill="#C85A32"
              fillOpacity="0.09"
              stroke="#C85A32"
              strokeWidth="1.2"
              strokeDasharray="4 3"
            />

            {/* Individual Realization Markers */}
            {stats.ensembleValues.map((val, idx) => {
              const xPos = mapAmpToX(val);
              const isSelected = idx === selectedRealizationIndex;
              const color = TRAJECTORY_COLORS[idx % TRAJECTORY_COLORS.length];
              const yOffset = ((idx % 3) - 1) * 12;

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
                    r={isSelected ? '6.5' : '4'}
                    fill={color}
                    stroke="#FFFFFF"
                    strokeWidth="1.8"
                    className="cursor-pointer transition-transform"
                    onClick={() => onSelectRealization(idx)}
                  />
                  <text
                    x={xPos}
                    y={midY + yOffset - (isSelected ? 8 : 6)}
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
              <line x1="0" y1="-22" x2="0" y2="22" stroke="#1A1917" strokeWidth="2.5" />
              <polygon points="0,-12 -6,-22 6,-22" fill="#1A1917" />
              <polygon points="0,12 -6,22 6,22" fill="#1A1917" />
              <text
                x="0"
                y="-26"
                textAnchor="middle"
                className="text-[10px] font-mono font-bold fill-[#1A1917]"
              >
                μ̂ = {stats.ensembleMean.toFixed(2)}V
              </text>
            </g>

            <text
              x={PAD_X}
              y={midY + 18}
              textAnchor="start"
              className="text-[9.5px] font-mono fill-[#75736E]"
            >
              -{maxVal.toFixed(1)}V
            </text>
            <text
              x={STRIP_W - PAD_X}
              y={midY + 18}
              textAnchor="end"
              className="text-[9.5px] font-mono fill-[#75736E]"
            >
              +{maxVal.toFixed(1)}V
            </text>
          </svg>
        </div>
      </div>

      {/* 3. Realization Selector Matrix */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#E6E4DD]">
          <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1917]">
            Individual Realization Inspection ({M} Realizations)
          </h4>
          <span className="text-[11px] font-mono text-[#75736E]">
            Click realization to isolate in plot
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
          {simulation.timeAverages.map((tMean, idx) => {
            const isSelected = idx === selectedRealizationIndex;
            const color = TRAJECTORY_COLORS[idx % TRAJECTORY_COLORS.length];
            const instantVal = stats.ensembleValues[idx];

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
                    t={simTime.toFixed(1)}s
                  </span>
                </div>
                <div className="text-xs font-bold font-mono text-[#1A1917]">
                  x(t) = {instantVal >= 0 ? '+' : ''}{instantVal.toFixed(2)} V
                </div>
                <div className="text-[10px] text-[#75736E] font-mono mt-0.5">
                  ⟨x⟩_T = {tMean >= 0 ? '+' : ''}{tMean.toFixed(2)} V
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
