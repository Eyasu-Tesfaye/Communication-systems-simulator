/**
 * Module 03: Area 1 — Random Processes & Sample Realizations
 * Inspect individual sample paths X^(i)(t), compare multiple realizations
 * generated from the same underlying stochastic rule, and observe instantaneous
 * cross-sectional amplitude spread at the selected time instant.
 */

import React, { useMemo } from 'react';
import { Layers, Sparkles, GitCommitHorizontal } from 'lucide-react';
import { MathView } from '../../../components/MathView';
import {
  EnsembleSimulationData,
  PROCESS_CATALOG,
  getInstantaneousStats,
} from '../randomProcessEngine';
import { REALIZATION_COLORS } from '../RandomProcessVisualizer';

interface SampleRealizationsPanelProps {
  simulation: EnsembleSimulationData;
  simTime: number;
  onSeekTime: (t: number) => void;
  selectedRealizationIndex: number;
  onSelectRealization: (idx: number) => void;
}

export const SampleRealizationsPanel: React.FC<SampleRealizationsPanelProps> = ({
  simulation,
  simTime,
  onSeekTime,
  selectedRealizationIndex,
  onSelectRealization,
}) => {
  const { trajectories, params, timeSteps } = simulation;
  const M = trajectories.length;
  const N = timeSteps.length;
  const T_MAX = params.tMax;
  const meta = PROCESS_CATALOG[params.type];

  const stats = useMemo(
    () => getInstantaneousStats(simulation, simTime, selectedRealizationIndex),
    [simulation, simTime, selectedRealizationIndex]
  );

  const selectedPath = trajectories[stats.selectedRealizationIndex] || trajectories[0];
  const selectedColor =
    REALIZATION_COLORS[stats.selectedRealizationIndex % REALIZATION_COLORS.length];

  // Path summary metrics for all M realizations
  const pathSummaries = useMemo(() => {
    return trajectories.map((pts, idx) => {
      let minVal = Infinity;
      let maxVal = -Infinity;
      let sqSum = 0;
      for (let k = 0; k < pts.length; k++) {
        const v = pts[k].x;
        if (v < minVal) minVal = v;
        if (v > maxVal) maxVal = v;
        sqSum += v * v;
      }
      const rms = Math.sqrt(sqSum / pts.length);
      return {
        idx,
        minVal,
        maxVal,
        rms,
        timeMean: simulation.timeAverages[idx],
        instantVal: stats.ensembleValues[idx],
      };
    });
  }, [trajectories, simulation.timeAverages, stats.ensembleValues]);

  // Isolated Single Realization SVG geometry
  const ISO_W = 540;
  const ISO_H = 190;
  const PAD_L = 52;
  const PAD_R = 18;
  const PAD_T = 28;
  const PAD_B = 34;
  const innerW = ISO_W - PAD_L - PAD_R;
  const innerH = ISO_H - PAD_T - PAD_B;

  const isoYMax = useMemo(() => {
    let m = 2.0;
    for (let k = 0; k < selectedPath.length; k++) {
      const a = Math.abs(selectedPath[k].x);
      if (a > m) m = a;
    }
    return Math.ceil(m * 1.2 * 2) / 2;
  }, [selectedPath]);

  const mapIsoX = (t: number) => PAD_L + (t / T_MAX) * innerW;
  const mapIsoY = (val: number) => {
    const c = Math.max(-isoYMax, Math.min(isoYMax, val));
    return PAD_T + innerH / 2 - (c / isoYMax) * (innerH / 2);
  };

  const isoPathD = useMemo(() => {
    return selectedPath.reduce((acc, p, idx) => {
      const x = mapIsoX(p.t).toFixed(1);
      const y = mapIsoY(p.x).toFixed(1);
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [selectedPath, isoYMax, T_MAX]);

  const selectedTimeMean = simulation.timeAverages[stats.selectedRealizationIndex] ?? 0;

  // Cross-sectional instantaneous distribution across M realizations at simTime
  const BIN_COUNT = 7;
  const histData = useMemo(() => {
    const absBound = Math.max(2.5, ...stats.ensembleValues.map((v) => Math.abs(v))) * 1.15;
    const minB = -absBound;
    const maxB = absBound;
    const binW = (maxB - minB) / BIN_COUNT;
    const counts = new Array(BIN_COUNT).fill(0);

    stats.ensembleValues.forEach((v) => {
      const idx = Math.min(
        BIN_COUNT - 1,
        Math.max(0, Math.floor((v - minB) / binW))
      );
      counts[idx]++;
    });
    const maxCount = Math.max(1, ...counts);
    return { counts, minB, maxB, binW, maxCount };
  }, [stats.ensembleValues]);

  return (
    <div className="space-y-4">
      {/* 1. Side-by-Side Individual Sample Path vs. Instantaneous Cross-Section */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Isolated Individual Realization Plot */}
        <div className="xl:col-span-7 bg-white rounded-lg border border-[#E6E4DD] p-4 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E6E4DD]">
            <div className="flex items-center gap-2">
              <GitCommitHorizontal className="w-4 h-4 text-[#C85A32]" />
              <h3 className="font-mono font-bold text-xs sm:text-sm text-[#1A1917]">
                Isolated Sample Path X<sup>({stats.selectedRealizationIndex + 1})</sup>(t)
              </h3>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-mono">
              <span className="text-[#585651]">
                x(t) = <strong className="text-[#1A1917]">{stats.selectedAmplitude >= 0 ? '+' : ''}{stats.selectedAmplitude.toFixed(3)} V</strong>
              </span>
              <span className="text-[#585651]">
                RMS = <strong className="text-[#1A1917]">{pathSummaries[stats.selectedRealizationIndex]?.rms.toFixed(3)} V</strong>
              </span>
            </div>
          </div>

          <div className="relative w-full h-[195px] bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden p-1">
            <svg
              viewBox={`0 0 ${ISO_W} ${ISO_H}`}
              preserveAspectRatio="xMidYMid meet"
              className="w-full h-full select-none cursor-pointer"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const svgX = ((e.clientX - rect.left) / rect.width) * ISO_W;
                const newT = Math.max(0, Math.min(T_MAX, ((svgX - PAD_L) / innerW) * T_MAX));
                onSeekTime(parseFloat(newT.toFixed(2)));
              }}
              role="img"
              aria-label={`Isolated sample path X(${stats.selectedRealizationIndex + 1})(t)`}
            >
              {/* Zero line */}
              <line
                x1={PAD_L}
                y1={mapIsoY(0)}
                x2={ISO_W - PAD_R}
                y2={mapIsoY(0)}
                stroke="#DCD8CE"
                strokeWidth="1.2"
              />
              {/* Axes */}
              <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + innerH} stroke="#1A1917" strokeWidth="1.3" />
              <line x1={PAD_L} y1={PAD_T + innerH} x2={ISO_W - PAD_R} y2={PAD_T + innerH} stroke="#1A1917" strokeWidth="1.3" />

              {/* Time average dashed line */}
              <line
                x1={PAD_L}
                y1={mapIsoY(selectedTimeMean)}
                x2={ISO_W - PAD_R}
                y2={mapIsoY(selectedTimeMean)}
                stroke="#059669"
                strokeWidth="1.4"
                strokeDasharray="4 3"
              />

              {/* Waveform path */}
              <path
                d={isoPathD}
                fill="none"
                stroke={selectedColor}
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Moving time indicator */}
              <line
                x1={mapIsoX(stats.simTime)}
                y1={PAD_T}
                x2={mapIsoX(stats.simTime)}
                y2={PAD_T + innerH}
                stroke="#C85A32"
                strokeWidth="1.8"
              />
              <circle
                cx={mapIsoX(stats.simTime)}
                cy={mapIsoY(stats.selectedAmplitude)}
                r="4.5"
                fill={selectedColor}
                stroke="#FFFFFF"
                strokeWidth="1.8"
              />

              {/* Y ticks */}
              {[-isoYMax, 0, isoYMax].map((v) => (
                <text
                  key={v}
                  x={PAD_L - 6}
                  y={mapIsoY(v) + 3.5}
                  textAnchor="end"
                  className="text-[9px] font-mono fill-[#75736E]"
                >
                  {v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1)}
                </text>
              ))}

              {/* X ticks */}
              {[0, T_MAX / 2, T_MAX].map((t) => (
                <text
                  key={t}
                  x={mapIsoX(t)}
                  y={PAD_T + innerH + 14}
                  textAnchor="middle"
                  className="text-[9px] font-mono fill-[#75736E]"
                >
                  {t.toFixed(1)}s
                </text>
              ))}

              {/* Legend */}
              <text x={PAD_L + 4} y={16} className="text-[9.5px] font-mono font-bold fill-[#1A1917]">
                Amplitude [V] · Green dashed: ⟨x⟩_T = {selectedTimeMean >= 0 ? '+' : ''}{selectedTimeMean.toFixed(2)}V
              </text>
              <text x={ISO_W - PAD_R} y={ISO_H - 4} textAnchor="end" className="text-[9.5px] font-mono font-bold fill-[#1A1917]">
                Time t [s] →
              </text>
            </svg>
          </div>

          <p className="text-xs text-[#585651] leading-relaxed">
            <strong>Single Sample Path <MathView math="x_i(t) = X(t, \omega_i)" />:</strong> Fixing the random outcome <MathView math="\omega_i" /> produces one deterministic time function. Click any trajectory card below or waveform trace above to inspect a different realization.
          </p>
        </div>

        {/* Instantaneous Cross-Sectional Spread Histogram */}
        <div className="xl:col-span-5 bg-white rounded-lg border border-[#E6E4DD] p-4 shadow-2xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E6E4DD]">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#C85A32]" />
              <h3 className="font-mono font-bold text-xs sm:text-sm text-[#1A1917]">
                Ensemble Spread at t = {stats.simTime.toFixed(2)}s
              </h3>
            </div>
            <span className="text-[11px] font-mono text-[#75736E]">
              M = {M} samples
            </span>
          </div>

          <div className="relative w-full h-[195px] bg-[#FAF9F6] rounded-md border border-[#E6E4DD] p-3 flex flex-col justify-between">
            <div className="flex items-end justify-between gap-1.5 flex-1 pt-2 pb-1 px-1">
              {histData.counts.map((cnt, bIdx) => {
                const pct = (cnt / histData.maxCount) * 100;
                const binStart = histData.minB + bIdx * histData.binW;
                const binEnd = binStart + histData.binW;
                const containsSelected =
                  stats.selectedAmplitude >= binStart &&
                  (bIdx === BIN_COUNT - 1
                    ? stats.selectedAmplitude <= binEnd
                    : stats.selectedAmplitude < binEnd);

                return (
                  <div key={bIdx} className="flex-1 h-full flex flex-col items-center justify-end gap-1">
                    <span className="text-[10px] font-mono font-bold text-[#585651] tabular-nums">
                      {cnt > 0 ? cnt : ''}
                    </span>
                    <div
                      className={`w-full rounded-t transition-all duration-150 border ${
                        containsSelected
                          ? 'bg-[#C85A32] border-[#B54E28]'
                          : 'bg-[#1A1917]/15 border-[#1A1917]/25'
                      }`}
                      style={{ height: `${Math.max(4, pct * 0.78)}%` }}
                      title={`Bin [${binStart.toFixed(2)}V, ${binEnd.toFixed(2)}V]: ${cnt} realizations`}
                    />
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-[9.5px] font-mono text-[#75736E] border-t border-[#E6E4DD] pt-1.5">
              <span>{histData.minB.toFixed(1)}V</span>
              <span>0.0V (μ̂ = {stats.ensembleMean >= 0 ? '+' : ''}{stats.ensembleMean.toFixed(2)}V)</span>
              <span>+{histData.maxB.toFixed(1)}V</span>
            </div>
          </div>

          <p className="text-xs text-[#585651] leading-relaxed">
            <strong>Cross-Sectional Random Variable <MathView math="X(t_0, \omega)" />:</strong> Fixing time <MathView math="t_0" /> yields a random variable across the <MathView math="M" /> realizations. Highlighted bar marks the bin holding <MathView math={`X^{(${stats.selectedRealizationIndex + 1})}(t)`} />.
          </p>
        </div>
      </div>

      {/* 2. Realization Comparison Matrix */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E6E4DD]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#C85A32]" />
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1917]">
              Ensemble Sample Paths ({M} Realizations · {N} Samples Each)
            </h4>
          </div>
          <span className="text-[11px] font-mono text-[#75736E]">
            Active Law: <strong className="text-[#1A1917]">{meta.shortName}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
          {pathSummaries.map((item) => {
            const isSelected = item.idx === stats.selectedRealizationIndex;
            const color = REALIZATION_COLORS[item.idx % REALIZATION_COLORS.length];

            return (
              <button
                key={item.idx}
                type="button"
                onClick={() => onSelectRealization(item.idx)}
                className={`p-2.5 rounded-md text-left border transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#FBF4F0] border-[#C85A32] ring-1 ring-[#C85A32]/30'
                    : 'bg-[#FAF9F6] border-[#E6E4DD] hover:border-[#8A8882]'
                }`}
              >
                <div className="flex items-center justify-between text-[11px] font-mono mb-1">
                  <span className="font-bold flex items-center gap-1.5" style={{ color }}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    X<sup>({item.idx + 1})</sup>
                  </span>
                  <span className="text-[10px] text-[#75736E] tabular-nums">
                    RMS {item.rms.toFixed(2)}V
                  </span>
                </div>
                <div className="text-xs font-mono font-bold text-[#1A1917] tabular-nums">
                  x(t) = {item.instantVal >= 0 ? '+' : ''}{item.instantVal.toFixed(2)} V
                </div>
                <div className="text-[10px] font-mono text-[#75736E] mt-0.5 tabular-nums">
                  [{item.minVal.toFixed(1)}, {item.maxVal.toFixed(1)}] V
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Structured Engineering Interpretation */}
      <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div>
          <div className="font-mono font-bold text-[#1A1917] uppercase text-[10px] mb-1">1. What Is Calculated</div>
          <p className="text-[#585651] leading-relaxed">
            <MathView math="M" /> independent sample trajectories <MathView math="X^{(i)}(t_k)" /> over <MathView math="N" /> discrete instants, plus instantaneous cross-sectional samples at <MathView math="t" />.
          </p>
        </div>
        <div>
          <div className="font-mono font-bold text-[#1A1917] uppercase text-[10px] mb-1">2. Data Used</div>
          <p className="text-[#585651] leading-relaxed">
            Seeded ensemble matrix of size <MathView math={`${M} \\times ${N}`} /> generated from the active <strong>{meta.shortName}</strong> law.
          </p>
        </div>
        <div>
          <div className="font-mono font-bold text-[#1A1917] uppercase text-[10px] mb-1">3. What It Represents</div>
          <p className="text-[#585651] leading-relaxed">
            Each curve is one possible outcome of the experiment; together they form the statistical ensemble at every time instant.
          </p>
        </div>
        <div>
          <div className="font-mono font-bold text-[#1A1917] uppercase text-[10px] mb-1">4. Process Insight</div>
          <p className="text-[#585651] leading-relaxed">
            Individual waveforms differ unpredictably, yet their amplitude spread and temporal smoothness follow the shared generator law.
          </p>
        </div>
      </div>
    </div>
  );
};
