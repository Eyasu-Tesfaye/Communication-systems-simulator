/**
 * Module 03: Topic 3 — Mean and Variance Over Time
 * Temporal curves of ensemble mean mu_X(t) and variance sigma_X^2(t)
 * across the entire observation horizon [0, T], with physical meanings.
 */

import React, { useMemo } from 'react';
import { Activity, BookOpen, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { MathView } from '../../../components/MathView';
import {
  EnsembleSimulationData,
  getInstantaneousStats,
} from '../randomProcessEngine';

interface MeanVariancePanelProps {
  simulation: EnsembleSimulationData;
  simTime: number;
  onSeekTime: (t: number) => void;
  selectedRealizationIndex: number;
}

export const MeanVariancePanel: React.FC<MeanVariancePanelProps> = ({
  simulation,
  simTime,
  onSeekTime,
  selectedRealizationIndex,
}) => {
  const { ensembleMean, ensembleVariance, timeSteps, params } = simulation;
  const T_MAX = params.tMax;
  const stats = getInstantaneousStats(simulation, simTime, selectedRealizationIndex);

  // Mean Plot Bounds
  const meanMin = Math.min(-1.5, Math.min(...ensembleMean) - 0.4);
  const meanMax = Math.max(1.5, Math.max(...ensembleMean) + 0.4);

  // Variance Plot Bounds
  const varMax = Math.max(1.5, Math.max(...ensembleVariance) * 1.25);

  const PLOT_W = 760;
  const PLOT_H = 200;
  const PAD_L = 60;
  const PAD_R = 30;
  const PAD_T = 25;
  const PAD_B = 35;
  const innerW = PLOT_W - PAD_L - PAD_R;
  const innerH = PLOT_H - PAD_T - PAD_B;

  const mapX = (t: number) => PAD_L + (t / T_MAX) * innerW;
  const mapMeanY = (mu: number) => {
    const range = meanMax - meanMin || 1;
    return PAD_T + innerH - ((mu - meanMin) / range) * innerH;
  };
  const mapVarY = (v: number) => {
    return PAD_T + innerH - (Math.max(0, Math.min(varMax, v)) / varMax) * innerH;
  };

  const meanPathD = useMemo(() => {
    return timeSteps.reduce((acc, t, idx) => {
      const x = mapX(t).toFixed(1);
      const y = mapMeanY(ensembleMean[idx]).toFixed(1);
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [timeSteps, ensembleMean, meanMin, meanMax]);

  const varPathD = useMemo(() => {
    return timeSteps.reduce((acc, t, idx) => {
      const x = mapX(t).toFixed(1);
      const y = mapVarY(ensembleVariance[idx]).toFixed(1);
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [timeSteps, ensembleVariance, varMax]);

  const cursorX = mapX(simTime);

  const meanVariation = useMemo(() => {
    return Math.max(...ensembleMean) - Math.min(...ensembleMean);
  }, [ensembleMean]);

  const varVariation = useMemo(() => {
    return Math.max(...ensembleVariance) - Math.min(...ensembleVariance);
  }, [ensembleVariance]);

  const isMeanConstant = meanVariation < 0.65;
  const isVarConstant = varVariation < 0.85;

  return (
    <div className="space-y-6">
      {/* 1. Mean Trajectory Plot */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-[#1A1917]">
              1. Ensemble Mean Over Time <MathView math="\mu_X(t) = \mathbb{E}[X(t)]" />
            </span>
            <span
              className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                isMeanConstant
                  ? 'bg-[#10B981]/10 text-[#059669] border border-[#10B981]/30'
                  : 'bg-[#C85A32]/10 text-[#C85A32] border border-[#C85A32]/30'
              }`}
            >
              {isMeanConstant ? 'Constant Mean (Stationary)' : 'Time-Varying Mean Drift'}
            </span>
          </div>

          <div className="font-mono text-[11px]">
            <span className="text-[#75736E]">At t = {simTime.toFixed(2)}s: </span>
            <span className="font-bold text-[#1A1917]">
              μ̂(t) = {stats.ensembleMean >= 0 ? '+' : ''}
              {stats.ensembleMean.toFixed(3)} V
            </span>
          </div>
        </div>

        <div className="relative w-full h-[200px] bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden flex items-center justify-center p-2">
          <svg
            viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full select-none cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const scale = PLOT_W / rect.width;
              const svgX = clickX * scale;
              const newT = Math.max(0, Math.min(T_MAX, ((svgX - PAD_L) / innerW) * T_MAX));
              onSeekTime(parseFloat(newT.toFixed(2)));
            }}
          >
            <line
              x1={PAD_L}
              y1={mapMeanY(0)}
              x2={PLOT_W - PAD_R}
              y2={mapMeanY(0)}
              stroke="#1A1917"
              strokeWidth="1.5"
            />
            <line
              x1={PAD_L}
              y1={PAD_T}
              x2={PAD_L}
              y2={PAD_T + innerH}
              stroke="#1A1917"
              strokeWidth="1.5"
            />

            <path
              d={meanPathD}
              fill="none"
              stroke="#1A1917"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            <line
              x1={cursorX}
              y1={PAD_T}
              x2={cursorX}
              y2={PAD_T + innerH}
              stroke="#C85A32"
              strokeWidth="2"
            />
            <circle
              cx={cursorX}
              cy={mapMeanY(stats.ensembleMean)}
              r="5"
              fill="#C85A32"
              stroke="#FFFFFF"
              strokeWidth="2"
            />

            {[meanMin, 0, meanMax].map((mVal, i) => (
              <text
                key={i}
                x={PAD_L - 8}
                y={mapMeanY(mVal) + 3.5}
                textAnchor="end"
                className="text-[9px] font-mono fill-[#75736E]"
              >
                {mVal > 0 ? `+${mVal.toFixed(1)}` : mVal.toFixed(1)}V
              </text>
            ))}

            <text
              x={PLOT_W - PAD_R}
              y={PAD_T + innerH + 22}
              textAnchor="end"
              className="text-[10px] font-mono fill-[#1A1917] font-bold"
            >
              Time t [s] →
            </text>
            <text
              x={PAD_L - 8}
              y={PAD_T - 8}
              textAnchor="start"
              className="text-[10px] font-mono fill-[#1A1917] font-bold"
            >
              Ensemble Mean μ_X(t) [V]
            </text>
          </svg>
        </div>
      </div>

      {/* 2. Variance Trajectory Plot */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-[#1A1917]">
              2. Ensemble Variance Over Time <MathView math="\sigma_X^2(t) = \operatorname{Var}(X(t))" />
            </span>
            <span
              className={`px-2 py-0.5 rounded-full font-mono text-[10px] font-bold ${
                isVarConstant
                  ? 'bg-[#10B981]/10 text-[#059669] border border-[#10B981]/30'
                  : 'bg-[#C85A32]/10 text-[#C85A32] border border-[#C85A32]/30'
              }`}
            >
              {isVarConstant ? 'Constant Variance (Homoscedastic)' : 'Expanding Variance Envelope'}
            </span>
          </div>

          <div className="font-mono text-[11px]">
            <span className="text-[#75736E]">At t = {simTime.toFixed(2)}s: </span>
            <span className="font-bold text-[#1A1917]">
              σ̂²(t) = {stats.ensembleVariance.toFixed(3)} V²
            </span>
          </div>
        </div>

        <div className="relative w-full h-[200px] bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden flex items-center justify-center p-2">
          <svg
            viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full select-none cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const scale = PLOT_W / rect.width;
              const svgX = clickX * scale;
              const newT = Math.max(0, Math.min(T_MAX, ((svgX - PAD_L) / innerW) * T_MAX));
              onSeekTime(parseFloat(newT.toFixed(2)));
            }}
          >
            <line
              x1={PAD_L}
              y1={PAD_T + innerH}
              x2={PLOT_W - PAD_R}
              y2={PAD_T + innerH}
              stroke="#1A1917"
              strokeWidth="1.5"
            />
            <line
              x1={PAD_L}
              y1={PAD_T}
              x2={PAD_L}
              y2={PAD_T + innerH}
              stroke="#1A1917"
              strokeWidth="1.5"
            />

            <path
              d={varPathD}
              fill="none"
              stroke="#C85A32"
              strokeWidth="2.5"
              strokeLinecap="round"
            />

            <line
              x1={cursorX}
              y1={PAD_T}
              x2={cursorX}
              y2={PAD_T + innerH}
              stroke="#1A1917"
              strokeWidth="2"
            />
            <circle
              cx={cursorX}
              cy={mapVarY(stats.ensembleVariance)}
              r="5"
              fill="#C85A32"
              stroke="#FFFFFF"
              strokeWidth="2"
            />

            {[0, varMax * 0.5, varMax].map((vVal, i) => (
              <text
                key={i}
                x={PAD_L - 8}
                y={mapVarY(vVal) + 3.5}
                textAnchor="end"
                className="text-[9px] font-mono fill-[#75736E]"
              >
                {vVal.toFixed(2)}V²
              </text>
            ))}

            <text
              x={PLOT_W - PAD_R}
              y={PAD_T + innerH + 22}
              textAnchor="end"
              className="text-[10px] font-mono fill-[#1A1917] font-bold"
            >
              Time t [s] →
            </text>
            <text
              x={PAD_L - 8}
              y={PAD_T - 8}
              textAnchor="start"
              className="text-[10px] font-mono fill-[#1A1917] font-bold"
            >
              Ensemble Variance σ_X²(t) [V²]
            </text>
          </svg>
        </div>
      </div>

      {/* 3. Physical Meaning Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="p-4 bg-white rounded-lg border border-[#E6E4DD] shadow-2xs space-y-2">
          <div className="font-mono font-bold text-sm text-[#1A1917] flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-[#C85A32]" />
            <span>Physical Meaning of Mean Over Time</span>
          </div>
          <p className="text-[#585651] leading-relaxed">
            The ensemble mean corresponds to the deterministic DC or carrier baseline component of the random process. When <MathView math="\mu_X(t) = 0" />, the process is completely zero-mean balanced. If the mean varies with time, the signal contains a non-stationary carrier drift or time-varying deterministic trend.
          </p>
        </div>

        <div className="p-4 bg-white rounded-lg border border-[#E6E4DD] shadow-2xs space-y-2">
          <div className="font-mono font-bold text-sm text-[#1A1917] flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-[#C85A32]" />
            <span>Physical Meaning of Variance Over Time</span>
          </div>
          <p className="text-[#585651] leading-relaxed">
            Variance represents the instantaneous statistical spread or fluctuating noise power of the realizations around their mean. Constant variance proves that the noise intensity does not depend on absolute time. An expanding envelope demonstrates non-stationary volatility expansion over time.
          </p>
        </div>
      </div>
    </div>
  );
};
