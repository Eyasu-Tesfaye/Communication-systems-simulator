/**
 * Section 8: Autocorrelation
 * Mathematical formulation, unbiased lag estimation R_XX(tau),
 * peak power at tau = 0, symmetry R_XX(-tau) = R_XX(tau),
 * correlation time, and comparison between ensemble and single-realization correlation.
 */

import React, { useMemo } from 'react';
import { Activity, BookOpen, Layers, Info, CheckCircle2 } from 'lucide-react';
import { MathView } from '../../../components/MathView';
import {
  EnsembleSimulationData,
  computeAutocorrelation,
  AutocorrelationResult,
} from '../randomProcessEngine';

interface AutocorrelationSectionProps {
  simulation: EnsembleSimulationData;
}

export const AutocorrelationSection: React.FC<AutocorrelationSectionProps> = ({
  simulation,
}) => {
  const autocorr: AutocorrelationResult = useMemo(() => {
    return computeAutocorrelation(simulation, 0.45);
  }, [simulation]);

  const { lags, ensembleRxx, primaryTrajectoryRxx, theoreticalRxx, peakValue } = autocorr;
  const numLags = lags.length;
  const tauMax = lags[numLags - 1];

  // SVG dimensions
  const PLOT_W = 760;
  const PLOT_H = 280;
  const PAD_L = 60;
  const PAD_R = 30;
  const PAD_T = 30;
  const PAD_B = 45;
  const innerW = PLOT_W - PAD_L - PAD_R;
  const innerH = PLOT_H - PAD_T - PAD_B;

  const yMin = Math.min(-0.5, Math.min(...ensembleRxx) * 1.25);
  const yMax = Math.max(1.0, peakValue * 1.2);

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
  const primaryPath = useMemo(() => toPathD(primaryTrajectoryRxx), [primaryTrajectoryRxx, lags]);
  const theoreticalPath = useMemo(() => toPathD(theoreticalRxx), [theoreticalRxx, lags]);

  // Normalized correlation at zero lag
  const zeroLagR = ensembleRxx[Math.floor(numLags / 2)];

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-[#FAF9F6] border border-[#E6E4DD] rounded-lg p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#C85A32] bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/20">
            Section 08
          </span>
          <span className="text-xs text-[#75736E] font-medium">Temporal Coherence & Lag Structure</span>
        </div>
        <h2 className="text-lg font-bold text-[#1A1917]">
          Autocorrelation Function <MathView math="R_{XX}(\tau)" />
        </h2>
        <p className="text-xs sm:text-sm text-[#585651] mt-1 max-w-3xl leading-relaxed">
          Autocorrelation measures the statistical correlation between values of the random process separated by a time lag <MathView math="\tau = t_1 - t_2" />. It quantifies signal memory, periodicity, and predictability.
        </p>
      </div>

      {/* 2. Interactive Autocorrelation Waveform Plot */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-[#1A1917]">
              Autocorrelation vs. Time Lag <MathView math="\tau" />
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 font-mono text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-[#C85A32] rounded-full" />
              <span className="text-[#C85A32] font-semibold">Ensemble R̂_XX(τ)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-[#585651] rounded-full opacity-60" />
              <span className="text-[#585651]">Single Realization 𝓡₁(τ)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 border-b-2 border-dashed border-[#1A1917]" />
              <span className="text-[#1A1917] font-semibold">Theoretical Curve</span>
            </div>
          </div>
        </div>

        <div className="relative w-full h-[280px] bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden flex items-center justify-center p-2">
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
              d={primaryPath}
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
              strokeDasharray="6 3"
              strokeLinecap="round"
            />

            {/* Peak at tau = 0 */}
            <circle
              cx={mapX(0)}
              cy={mapY(zeroLagR)}
              r="5.5"
              fill="#C85A32"
              stroke="#FFFFFF"
              strokeWidth="2"
            />

            {/* Zero Lag Callout */}
            <text
              x={mapX(0) + 10}
              y={mapY(zeroLagR) - 8}
              className="text-[9.5px] font-mono font-bold fill-[#C85A32]"
            >
              R_XX(0) = {zeroLagR.toFixed(3)} V² (Total Power)
            </text>

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
              y={PAD_T + innerH + 34}
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
              Autocorrelation R_XX(τ)
            </text>
          </svg>
        </div>
      </div>

      {/* 3. Mathematical Properties & Educational Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="p-4 bg-white rounded-lg border border-[#E6E4DD] shadow-2xs space-y-2">
          <div className="font-mono font-bold text-[#1A1917] uppercase text-[11px] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Property 1: Maximum at Origin</span>
          </div>
          <div className="p-2 bg-[#FAF9F6] rounded border border-[#E6E4DD] font-mono text-[11px]">
            <MathView math="|R_{XX}(\tau)| \le R_{XX}(0) = \mathbb{E}[X^2(t)]" displayMode={true} />
          </div>
          <p className="text-[#585651] text-[11px] leading-relaxed">
            A signal is always most strongly correlated with itself at zero lag. <MathView math="R_{XX}(0)" /> equals the total average power (AC variance + DC power: <MathView math="\sigma^2 + \mu^2" />).
          </p>
        </div>

        <div className="p-4 bg-white rounded-lg border border-[#E6E4DD] shadow-2xs space-y-2">
          <div className="font-mono font-bold text-[#1A1917] uppercase text-[11px] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Property 2: Even Symmetry</span>
          </div>
          <div className="p-2 bg-[#FAF9F6] rounded border border-[#E6E4DD] font-mono text-[11px]">
            <MathView math="R_{XX}(-\tau) = R_{XX}(\tau)" displayMode={true} />
          </div>
          <p className="text-[#585651] text-[11px] leading-relaxed">
            The autocorrelation function of any real random process is strictly symmetric about <MathView math="\tau = 0" />: lagging forward has the identical statistical relationship to lagging backward.
          </p>
        </div>

        <div className="p-4 bg-white rounded-lg border border-[#E6E4DD] shadow-2xs space-y-2">
          <div className="font-mono font-bold text-[#1A1917] uppercase text-[11px] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
            <span>Property 3: Correlation Time</span>
          </div>
          <div className="p-2 bg-[#FAF9F6] rounded border border-[#E6E4DD] font-mono text-[11px]">
            <MathView math="\tau_c = \frac{1}{R_{XX}(0)}\int_0^\infty R_{XX}(\tau)d\tau" displayMode={true} />
          </div>
          <p className="text-[#585651] text-[11px] leading-relaxed">
            Characterizes the memory length of the channel. White noise has <MathView math="\tau_c \approx 0" /> (zero memory), while bandlimited processes maintain coherence over <MathView math="\sim 1/B" /> seconds.
          </p>
        </div>
      </div>
    </div>
  );
};
