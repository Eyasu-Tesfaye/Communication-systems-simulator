/**
 * Module 03: Area 3 — Mean and Variance Over Time
 * Large synchronized temporal curves of empirical ensemble mean mu_hat(t) and
 * ensemble variance sigma_hat^2(t) compared against theoretical laws.
 */

import React, { useMemo } from 'react';
import { BookOpen, TrendingUp } from 'lucide-react';
import { MathView } from '../../../components/MathView';
import {
  EnsembleSimulationData,
  StationarityDiagnostics,
  PROCESS_CATALOG,
  getInstantaneousStats,
} from '../randomProcessEngine';

interface MeanVariancePanelProps {
  simulation: EnsembleSimulationData;
  stationarity: StationarityDiagnostics;
  simTime: number;
  onSeekTime: (t: number) => void;
  selectedRealizationIndex: number;
}

export const MeanVariancePanel: React.FC<MeanVariancePanelProps> = ({
  simulation,
  stationarity,
  simTime,
  onSeekTime,
  selectedRealizationIndex,
}) => {
  const {
    ensembleMean,
    ensembleVariance,
    theoreticalMeanCurve,
    theoreticalVarianceCurve,
    timeSteps,
    params,
  } = simulation;
  const T_MAX = params.tMax;
  const M = simulation.trajectories.length;
  const meta = PROCESS_CATALOG[params.type];

  const stats = useMemo(
    () => getInstantaneousStats(simulation, simTime, selectedRealizationIndex),
    [simulation, simTime, selectedRealizationIndex]
  );

  // Mean Plot Bounds
  const { meanMin, meanMax } = useMemo(() => {
    const all = [...ensembleMean, ...theoreticalMeanCurve, 0];
    const mn = Math.min(...all);
    const mx = Math.max(...all);
    const pad = Math.max(0.5, (mx - mn) * 0.25);
    return {
      meanMin: Math.min(-1.2, mn - pad),
      meanMax: Math.max(1.2, mx + pad),
    };
  }, [ensembleMean, theoreticalMeanCurve]);

  // Variance Plot Bounds
  const varMax = useMemo(() => {
    const mx = Math.max(...ensembleVariance, ...theoreticalVarianceCurve, 0.5);
    return Math.max(1.0, mx * 1.25);
  }, [ensembleVariance, theoreticalVarianceCurve]);

  const PLOT_W = 760;
  const PLOT_H = 225;
  const PAD_L = 62;
  const PAD_R = 24;
  const PAD_T = 32;
  const PAD_B = 36;
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
  }, [timeSteps, ensembleMean, meanMin, meanMax, T_MAX]);

  const theoMeanPathD = useMemo(() => {
    return timeSteps.reduce((acc, t, idx) => {
      const x = mapX(t).toFixed(1);
      const y = mapMeanY(theoreticalMeanCurve[idx]).toFixed(1);
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [timeSteps, theoreticalMeanCurve, meanMin, meanMax, T_MAX]);

  const varPathD = useMemo(() => {
    return timeSteps.reduce((acc, t, idx) => {
      const x = mapX(t).toFixed(1);
      const y = mapVarY(ensembleVariance[idx]).toFixed(1);
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [timeSteps, ensembleVariance, varMax, T_MAX]);

  const theoVarPathD = useMemo(() => {
    return timeSteps.reduce((acc, t, idx) => {
      const x = mapX(t).toFixed(1);
      const y = mapVarY(theoreticalVarianceCurve[idx]).toFixed(1);
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [timeSteps, theoreticalVarianceCurve, varMax, T_MAX]);

  const cursorX = mapX(stats.simTime);

  return (
    <div className="space-y-4">
      {/* 1. Ensemble Mean Over Time */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E6E4DD] text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono font-bold text-[#1A1917]">
              1. Ensemble Mean Over Time <MathView math="\hat{\mu}_X(t)" />
            </span>
            <span
              className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                stationarity.passesMeanTest
                  ? 'bg-[#10B981]/10 text-[#059669] border-[#10B981]/30'
                  : 'bg-[#C85A32]/10 text-[#C85A32] border-[#C85A32]/30'
              }`}
            >
              {stationarity.passesMeanTest ? 'Approximately Constant' : 'Time-Varying Drift'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
            <span className="text-[#585651]">
              μ̂({stats.simTime.toFixed(2)}s) ={' '}
              <strong className="text-[#1A1917] tabular-nums">
                {stats.ensembleMean >= 0 ? '+' : ''}
                {stats.ensembleMean.toFixed(3)} V
              </strong>
            </span>
            <span className="text-[#75736E]">
              Theory: <strong className="tabular-nums">{stats.theoreticalMean >= 0 ? '+' : ''}{stats.theoreticalMean.toFixed(3)} V</strong>
            </span>
          </div>
        </div>

        <div className="relative w-full h-[220px] bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden p-1">
          <svg
            viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full select-none cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const svgX = ((e.clientX - rect.left) / rect.width) * PLOT_W;
              const newT = Math.max(0, Math.min(T_MAX, ((svgX - PAD_L) / innerW) * T_MAX));
              onSeekTime(parseFloat(newT.toFixed(2)));
            }}
            role="img"
            aria-label="Ensemble mean over time plot"
          >
            {/* Zero line */}
            <line
              x1={PAD_L}
              y1={mapMeanY(0)}
              x2={PLOT_W - PAD_R}
              y2={mapMeanY(0)}
              stroke="#DCD8CE"
              strokeWidth="1.2"
              strokeDasharray="3 3"
            />
            <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + innerH} stroke="#1A1917" strokeWidth="1.4" />
            <line x1={PAD_L} y1={PAD_T + innerH} x2={PLOT_W - PAD_R} y2={PAD_T + innerH} stroke="#1A1917" strokeWidth="1.4" />

            {/* Theoretical Mean Reference */}
            <path d={theoMeanPathD} fill="none" stroke="#75736E" strokeWidth="1.6" strokeDasharray="5 4" />

            {/* Empirical Ensemble Mean */}
            <path d={meanPathD} fill="none" stroke="#1A1917" strokeWidth="2.4" strokeLinecap="round" />

            {/* Moving Vertical Time Cursor */}
            <line x1={cursorX} y1={PAD_T} x2={cursorX} y2={PAD_T + innerH} stroke="#C85A32" strokeWidth="1.8" />
            <circle cx={cursorX} cy={mapMeanY(stats.ensembleMean)} r="4.8" fill="#C85A32" stroke="#FFFFFF" strokeWidth="1.8" />

            {[meanMin, 0, meanMax].map((mVal, i) => (
              <text
                key={i}
                x={PAD_L - 8}
                y={mapMeanY(mVal) + 3.5}
                textAnchor="end"
                className="text-[9.5px] font-mono fill-[#75736E]"
              >
                {mVal >= 0 ? `+${mVal.toFixed(1)}` : mVal.toFixed(1)}V
              </text>
            ))}

            {[0, 2, 4, 6, 8, 10].map((t) => (
              <text key={t} x={mapX(t)} y={PAD_T + innerH + 15} textAnchor="middle" className="text-[9.5px] font-mono fill-[#75736E]">
                {t}s
              </text>
            ))}

            <text x={PAD_L + 4} y={18} textAnchor="start" className="text-[10px] font-mono font-bold fill-[#1A1917]">
              Ensemble Mean μ̂(t) [V] (Solid) · Theoretical E[X(t)] (Dashed)
            </text>
            <text x={PLOT_W - PAD_R} y={PLOT_H - 4} textAnchor="end" className="text-[10px] font-mono font-bold fill-[#1A1917]">
              Time t [s] →
            </text>
          </svg>
        </div>
      </div>

      {/* 2. Ensemble Variance Over Time */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E6E4DD] text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono font-bold text-[#1A1917]">
              2. Ensemble Variance Over Time <MathView math="\hat{\sigma}_X^2(t)" />
            </span>
            <span
              className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold border ${
                stationarity.passesVarTest
                  ? 'bg-[#10B981]/10 text-[#059669] border-[#10B981]/30'
                  : 'bg-[#C85A32]/10 text-[#C85A32] border-[#C85A32]/30'
              }`}
            >
              {stationarity.passesVarTest ? 'Constant Finite Variance' : 'Time-Varying Variance'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
            <span className="text-[#585651]">
              σ̂²({stats.simTime.toFixed(2)}s) ={' '}
              <strong className="text-[#C85A32] tabular-nums">{stats.ensembleVariance.toFixed(3)} V²</strong>
            </span>
            <span className="text-[#75736E]">
              Theory: <strong className="tabular-nums">{stats.theoreticalVariance.toFixed(3)} V²</strong>
            </span>
          </div>
        </div>

        <div className="relative w-full h-[220px] bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden p-1">
          <svg
            viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full select-none cursor-pointer"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const svgX = ((e.clientX - rect.left) / rect.width) * PLOT_W;
              const newT = Math.max(0, Math.min(T_MAX, ((svgX - PAD_L) / innerW) * T_MAX));
              onSeekTime(parseFloat(newT.toFixed(2)));
            }}
            role="img"
            aria-label="Ensemble variance over time plot"
          >
            <line x1={PAD_L} y1={PAD_T + innerH} x2={PLOT_W - PAD_R} y2={PAD_T + innerH} stroke="#1A1917" strokeWidth="1.4" />
            <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + innerH} stroke="#1A1917" strokeWidth="1.4" />

            {/* Theoretical Variance Reference */}
            <path d={theoVarPathD} fill="none" stroke="#75736E" strokeWidth="1.6" strokeDasharray="5 4" />

            {/* Empirical Variance */}
            <path d={varPathD} fill="none" stroke="#C85A32" strokeWidth="2.4" strokeLinecap="round" />

            {/* Moving Vertical Time Cursor */}
            <line x1={cursorX} y1={PAD_T} x2={cursorX} y2={PAD_T + innerH} stroke="#1A1917" strokeWidth="1.8" />
            <circle cx={cursorX} cy={mapVarY(stats.ensembleVariance)} r="4.8" fill="#C85A32" stroke="#FFFFFF" strokeWidth="1.8" />

            {[0, varMax * 0.5, varMax].map((vVal, i) => (
              <text
                key={i}
                x={PAD_L - 8}
                y={mapVarY(vVal) + 3.5}
                textAnchor="end"
                className="text-[9.5px] font-mono fill-[#75736E]"
              >
                {vVal.toFixed(2)}V²
              </text>
            ))}

            {[0, 2, 4, 6, 8, 10].map((t) => (
              <text key={t} x={mapX(t)} y={PAD_T + innerH + 15} textAnchor="middle" className="text-[9.5px] font-mono fill-[#75736E]">
                {t}s
              </text>
            ))}

            <text x={PAD_L + 4} y={18} textAnchor="start" className="text-[10px] font-mono font-bold fill-[#1A1917]">
              Ensemble Variance σ̂²(t) [V²] (Solid) · Theoretical Var(X(t)) (Dashed)
            </text>
            <text x={PLOT_W - PAD_R} y={PLOT_H - 4} textAnchor="end" className="text-[10px] font-mono font-bold fill-[#1A1917]">
              Time t [s] →
            </text>
          </svg>
        </div>
      </div>

      {/* 3. Physical Meaning & Structured Result Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="p-4 bg-white rounded-lg border border-[#E6E4DD] shadow-2xs space-y-1.5">
          <div className="font-mono font-bold text-xs text-[#1A1917] flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-[#C85A32]" />
            <span>What Mean Over Time Tells Us</span>
          </div>
          <p className="text-[#585651] leading-relaxed">
            Calculated across <MathView math={`M=${M}`} /> realizations at each <MathView math="t_k" />. Represents the instantaneous expected DC baseline. For stationary zero-mean processes, <MathView math="\hat{\mu}_X(t)" /> fluctuates within <MathView math="\pm \sigma/\sqrt{M}" /> around 0 V; increasing <MathView math="M" /> tightens this estimate.
          </p>
        </div>

        <div className="p-4 bg-white rounded-lg border border-[#E6E4DD] shadow-2xs space-y-1.5">
          <div className="font-mono font-bold text-xs text-[#1A1917] flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-[#C85A32]" />
            <span>What Variance Over Time Tells Us</span>
          </div>
          <p className="text-[#585651] leading-relaxed">
            Calculated via unbiased sample variance <MathView math="\frac{1}{M-1}\sum (x_i(t) - \hat{\mu}(t))^2" />. Represents fluctuating AC power around the mean. For <strong>{meta.shortName}</strong>, theoretical variance is <MathView math={meta.theoreticalVar} />.
          </p>
        </div>
      </div>
    </div>
  );
};
