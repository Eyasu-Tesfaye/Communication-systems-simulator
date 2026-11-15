/**
 * Module 03: Area 4 — Strict-Sense (SSS) & Wide-Sense (WSS) Stationarity Tests
 * Demonstrates SSS vs WSS definitions, stationary vs non-stationary quick examples,
 * mean vs time, variance vs time, early-vs-late autocorrelation comparison,
 * honest finite-sample WSS checks, and explicit mathematical caveats.
 */

import React, { useMemo } from 'react';
import {
  ShieldCheck,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { MathView } from '../../../components/MathView';
import {
  EnsembleSimulationData,
  AutocorrelationResult,
  StationarityDiagnostics,
  ProcessType,
  PROCESS_CATALOG,
} from '../randomProcessEngine';

interface StationarityPanelProps {
  simulation: EnsembleSimulationData;
  autocorr: AutocorrelationResult;
  stationarity: StationarityDiagnostics;
  onSelectProcessType: (type: ProcessType) => void;
}

export const StationarityPanel: React.FC<StationarityPanelProps> = ({
  simulation,
  autocorr,
  stationarity,
  onSelectProcessType,
}) => {
  const { ensembleMean, ensembleVariance, timeSteps, params } = simulation;
  const meta = PROCESS_CATALOG[params.type];
  const T_MAX = params.tMax;
  const M = simulation.trajectories.length;

  // Compact Mean & Variance mini-plots (340 x 130)
  const MINI_W = 340;
  const MINI_H = 126;
  const M_PAD_L = 44;
  const M_PAD_R = 14;
  const M_PAD_T = 18;
  const M_PAD_B = 24;
  const mInnerW = MINI_W - M_PAD_L - M_PAD_R;
  const mInnerH = MINI_H - M_PAD_T - M_PAD_B;

  const { muMin, muMax } = useMemo(() => {
    const mn = Math.min(...ensembleMean, -0.8);
    const mx = Math.max(...ensembleMean, 0.8);
    const pad = Math.max(0.3, (mx - mn) * 0.2);
    return { muMin: mn - pad, muMax: mx + pad };
  }, [ensembleMean]);

  const vMax = useMemo(
    () => Math.max(1.0, Math.max(...ensembleVariance) * 1.25),
    [ensembleVariance]
  );

  const mapMiniX = (t: number) => M_PAD_L + (t / T_MAX) * mInnerW;
  const mapMiniMuY = (v: number) =>
    M_PAD_T + mInnerH - ((v - muMin) / (muMax - muMin || 1)) * mInnerH;
  const mapMiniVarY = (v: number) =>
    M_PAD_T + mInnerH - (Math.max(0, Math.min(vMax, v)) / vMax) * mInnerH;

  const miniMeanPath = useMemo(
    () =>
      timeSteps
        .map((t, i) => `${i === 0 ? 'M' : 'L'} ${mapMiniX(t).toFixed(1)} ${mapMiniMuY(ensembleMean[i]).toFixed(1)}`)
        .join(' '),
    [timeSteps, ensembleMean, muMin, muMax, T_MAX]
  );

  const miniVarPath = useMemo(
    () =>
      timeSteps
        .map((t, i) => `${i === 0 ? 'M' : 'L'} ${mapMiniX(t).toFixed(1)} ${mapMiniVarY(ensembleVariance[i]).toFixed(1)}`)
        .join(' '),
    [timeSteps, ensembleVariance, vMax, T_MAX]
  );

  // Split-window Autocorrelation Comparison Plot (Early [0, T/2] vs Late [T/2, T])
  const AC_W = 760;
  const AC_H = 190;
  const AC_PAD_L = 56;
  const AC_PAD_R = 24;
  const AC_PAD_T = 26;
  const AC_PAD_B = 34;
  const acInnerW = AC_W - AC_PAD_L - AC_PAD_R;
  const acInnerH = AC_H - AC_PAD_T - AC_PAD_B;

  const { lags, earlyWindowRxx, lateWindowRxx } = autocorr;
  const tauMax = lags[lags.length - 1] || 1;
  const acYMin = useMemo(
    () => Math.min(-0.4, ...earlyWindowRxx, ...lateWindowRxx) * 1.15,
    [earlyWindowRxx, lateWindowRxx]
  );
  const acYMax = useMemo(
    () => Math.max(0.8, ...earlyWindowRxx, ...lateWindowRxx) * 1.2,
    [earlyWindowRxx, lateWindowRxx]
  );

  const mapAcX = (tau: number) => AC_PAD_L + ((tau + tauMax) / (2 * tauMax)) * acInnerW;
  const mapAcY = (v: number) =>
    AC_PAD_T + acInnerH - ((v - acYMin) / (acYMax - acYMin || 1)) * acInnerH;

  const earlyAcPath = useMemo(
    () =>
      lags
        .map((tau, i) => `${i === 0 ? 'M' : 'L'} ${mapAcX(tau).toFixed(1)} ${mapAcY(earlyWindowRxx[i]).toFixed(1)}`)
        .join(' '),
    [lags, earlyWindowRxx, acYMin, acYMax, tauMax]
  );

  const lateAcPath = useMemo(
    () =>
      lags
        .map((tau, i) => `${i === 0 ? 'M' : 'L'} ${mapAcX(tau).toFixed(1)} ${mapAcY(lateWindowRxx[i]).toFixed(1)}`)
        .join(' '),
    [lags, lateWindowRxx, acYMin, acYMax, tauMax]
  );

  return (
    <div className="space-y-4">
      {/* 1. Stationary vs. Non-Stationary Quick Comparison Selector */}
      <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs font-mono text-[#585651]">
          <strong className="text-[#1A1917]">Compare Examples:</strong> Switch between stationary and non-stationary processes to observe WSS behavior.
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {(Object.keys(PROCESS_CATALOG) as ProcessType[]).map((key) => {
            const p = PROCESS_CATALOG[key];
            const active = params.type === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onSelectProcessType(key)}
                className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold border transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#C85A32] text-white border-[#C85A32]'
                    : 'bg-white text-[#585651] border-[#E6E4DD] hover:bg-[#F3F2EC]'
                }`}
              >
                {p.shortName} {p.isWss ? '(WSS)' : '(Non-Stat)'}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Empirical WSS Diagnostics Matrix */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-4 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E6E4DD]">
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1917]">
              Finite-Sample WSS Diagnostic Tests — {meta.name}
            </h3>
            <span className="text-[11px] text-[#75736E]">
              Evaluating 1st and 2nd-order shift invariance across M = {M} realizations
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#75736E]">Empirical Check:</span>
            <span
              className={`px-2.5 py-1 rounded text-xs font-mono font-bold uppercase border ${
                stationarity.empiricalWssStatus === 'Consistent'
                  ? 'bg-[#10B981]/10 text-[#059669] border-[#10B981]/30'
                  : 'bg-[#C85A32]/10 text-[#C85A32] border-[#C85A32]/30'
              }`}
            >
              {stationarity.empiricalWssStatus === 'Consistent'
                ? 'Consistent with WSS'
                : 'WSS Violated'}
            </span>
          </div>
        </div>

        {/* 3 Condition Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Condition 1 */}
          <div className="p-3 bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[#75736E] text-[10px] uppercase font-bold">WSS Condition 1</span>
              {stationarity.passesMeanTest ? (
                <CheckCircle2 className="w-4 h-4 text-[#059669]" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-[#C85A32]" />
              )}
            </div>
            <div className="font-bold text-[#1A1917] font-mono">Constant Mean μ_X(t)</div>
            <div className="text-[11px] font-mono text-[#585651] tabular-nums">
              Early μ̄: <strong>{stationarity.earlyMean.toFixed(2)}V</strong> · Late μ̄: <strong>{stationarity.lateMean.toFixed(2)}V</strong>
            </div>
            <div className="text-[11px] font-mono text-[#75736E] tabular-nums">
              Normalized drift index: {stationarity.meanDriftRatio.toFixed(2)} (&lt; 1.75)
            </div>
          </div>

          {/* Condition 2 */}
          <div className="p-3 bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[#75736E] text-[10px] uppercase font-bold">WSS Condition 2</span>
              {stationarity.passesVarTest ? (
                <CheckCircle2 className="w-4 h-4 text-[#059669]" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-[#C85A32]" />
              )}
            </div>
            <div className="font-bold text-[#1A1917] font-mono">Constant Variance σ²(t)</div>
            <div className="text-[11px] font-mono text-[#585651] tabular-nums">
              Early σ̄²: <strong>{stationarity.earlyVar.toFixed(2)}</strong> · Late σ̄²: <strong>{stationarity.lateVar.toFixed(2)}</strong> V²
            </div>
            <div className="text-[11px] font-mono text-[#75736E] tabular-nums">
              Variance ratio: {stationarity.varRatio.toFixed(2)}×
            </div>
          </div>

          {/* Condition 3 */}
          <div className="p-3 bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[#75736E] text-[10px] uppercase font-bold">WSS Condition 3</span>
              {stationarity.passesLagInvariance ? (
                <CheckCircle2 className="w-4 h-4 text-[#059669]" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-[#C85A32]" />
              )}
            </div>
            <div className="font-bold text-[#1A1917] font-mono">Shift-Invariant R_XX(τ)</div>
            <div className="text-[11px] font-mono text-[#585651] tabular-nums">
              Early vs Late RMS diff: <strong>{(stationarity.lagShiftError * 100).toFixed(1)}%</strong>
            </div>
            <div className="text-[11px] text-[#75736E]">
              {stationarity.passesLagInvariance
                ? 'R_early(τ) ≈ R_late(τ) across shifts.'
                : 'R_XX changes with absolute window time.'}
            </div>
          </div>
        </div>

        {/* Mean vs Time & Variance vs Time Mini Comparison Plots */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-[#FAF9F6] rounded-md border border-[#E6E4DD] p-2.5">
            <div className="text-[11px] font-mono font-bold text-[#1A1917] mb-1">
              Mean vs. Time μ̂(t) (Span: {stationarity.meanRange.toFixed(2)} V)
            </div>
            <svg viewBox={`0 0 ${MINI_W} ${MINI_H}`} className="w-full h-[120px] select-none">
              <line x1={M_PAD_L} y1={mapMiniMuY(0)} x2={MINI_W - M_PAD_R} y2={mapMiniMuY(0)} stroke="#DCD8CE" strokeDasharray="3 3" />
              <line x1={M_PAD_L} y1={M_PAD_T} x2={M_PAD_L} y2={M_PAD_T + mInnerH} stroke="#1A1917" strokeWidth="1.2" />
              <line x1={M_PAD_L} y1={M_PAD_T + mInnerH} x2={MINI_W - M_PAD_R} y2={M_PAD_T + mInnerH} stroke="#1A1917" strokeWidth="1.2" />
              <path d={miniMeanPath} fill="none" stroke="#1A1917" strokeWidth="2" />
              <text x={M_PAD_L - 5} y={mapMiniMuY(muMax) + 3} textAnchor="end" className="text-[8.5px] font-mono fill-[#75736E]">{muMax.toFixed(1)}V</text>
              <text x={M_PAD_L - 5} y={mapMiniMuY(muMin) + 3} textAnchor="end" className="text-[8.5px] font-mono fill-[#75736E]">{muMin.toFixed(1)}V</text>
              <text x={MINI_W - M_PAD_R} y={MINI_H - 4} textAnchor="end" className="text-[8.5px] font-mono fill-[#75736E]">0 → {T_MAX}s</text>
            </svg>
          </div>

          <div className="bg-[#FAF9F6] rounded-md border border-[#E6E4DD] p-2.5">
            <div className="text-[11px] font-mono font-bold text-[#1A1917] mb-1">
              Variance vs. Time σ̂²(t) (Span: {stationarity.varRange.toFixed(2)} V²)
            </div>
            <svg viewBox={`0 0 ${MINI_W} ${MINI_H}`} className="w-full h-[120px] select-none">
              <line x1={M_PAD_L} y1={M_PAD_T} x2={M_PAD_L} y2={M_PAD_T + mInnerH} stroke="#1A1917" strokeWidth="1.2" />
              <line x1={M_PAD_L} y1={M_PAD_T + mInnerH} x2={MINI_W - M_PAD_R} y2={M_PAD_T + mInnerH} stroke="#1A1917" strokeWidth="1.2" />
              <path d={miniVarPath} fill="none" stroke="#C85A32" strokeWidth="2" />
              <text x={M_PAD_L - 5} y={mapMiniVarY(vMax) + 3} textAnchor="end" className="text-[8.5px] font-mono fill-[#75736E]">{vMax.toFixed(1)}</text>
              <text x={M_PAD_L - 5} y={mapMiniVarY(0) + 3} textAnchor="end" className="text-[8.5px] font-mono fill-[#75736E]">0.0</text>
              <text x={MINI_W - M_PAD_R} y={MINI_H - 4} textAnchor="end" className="text-[8.5px] font-mono fill-[#75736E]">0 → {T_MAX}s</text>
            </svg>
          </div>
        </div>

        {/* Autocorrelation Time-Shift Comparison Plot */}
        <div className="bg-[#FAF9F6] rounded-md border border-[#E6E4DD] p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
            <span className="font-bold text-[#1A1917]">
              Autocorrelation Shift-Invariance Check: Early Window [0, {(T_MAX / 2).toFixed(1)}s] vs. Late Window [{(T_MAX / 2).toFixed(1)}s, {T_MAX.toFixed(1)}s]
            </span>
            <div className="flex items-center gap-4 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-0.5 bg-[#2E6F7E]" />
                <span className="text-[#2E6F7E] font-semibold">R_early(τ)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-0.5 border-b-2 border-dashed border-[#C85A32]" />
                <span className="text-[#C85A32] font-semibold">R_late(τ)</span>
              </span>
            </div>
          </div>

          <svg viewBox={`0 0 ${AC_W} ${AC_H}`} className="w-full h-[175px] select-none">
            <line x1={AC_PAD_L} y1={mapAcY(0)} x2={AC_W - AC_PAD_R} y2={mapAcY(0)} stroke="#DCD8CE" strokeWidth="1.2" />
            <line x1={mapAcX(0)} y1={AC_PAD_T} x2={mapAcX(0)} y2={AC_PAD_T + acInnerH} stroke="#1A1917" strokeDasharray="3 3" strokeWidth="1.1" />
            <path d={earlyAcPath} fill="none" stroke="#2E6F7E" strokeWidth="2.1" strokeLinecap="round" />
            <path d={lateAcPath} fill="none" stroke="#C85A32" strokeWidth="2.1" strokeDasharray="5 3" strokeLinecap="round" />
            {[acYMin, 0, acYMax].map((v, i) => (
              <text key={i} x={AC_PAD_L - 8} y={mapAcY(v) + 3.5} textAnchor="end" className="text-[9px] font-mono fill-[#75736E]">
                {v.toFixed(1)}
              </text>
            ))}
            {[-tauMax, 0, tauMax].map((tau) => (
              <text key={tau} x={mapAcX(tau)} y={AC_PAD_T + acInnerH + 15} textAnchor="middle" className="text-[9px] font-mono fill-[#75736E]">
                {tau >= 0 ? `+${tau.toFixed(1)}` : tau.toFixed(1)}s
              </text>
            ))}
            <text x={AC_PAD_L + 4} y={16} className="text-[9.5px] font-mono font-bold fill-[#1A1917]">
              Windowed Autocorrelation [V²]
            </text>
            <text x={AC_W - AC_PAD_R} y={AC_H - 4} textAnchor="end" className="text-[9.5px] font-mono font-bold fill-[#1A1917]">
              Lag τ [s] →
            </text>
          </svg>
        </div>
      </div>

      {/* 3. SSS vs. WSS Mathematical Definitions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-[#E6E4DD] p-4 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-[#E6E4DD]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#C85A32]" />
              <h4 className="font-mono font-bold text-xs sm:text-sm text-[#1A1917]">
                Strict-Sense Stationarity (SSS)
              </h4>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#FAF9F6] border border-[#E6E4DD] text-[#585651]">
              Theory: {meta.isSss ? 'SSS' : 'Not SSS'}
            </span>
          </div>
          <div className="p-2 bg-[#FAF9F6] rounded border border-[#E6E4DD] text-xs">
            <MathView
              math="F_{X(t_1),\dots,X(t_k)}(x_1,\dots,x_k) = F_{X(t_1+\tau),\dots,X(t_k+\tau)}(x_1,\dots,x_k)"
              displayMode={true}
            />
          </div>
          <p className="text-xs text-[#585651] leading-relaxed">
            All finite-dimensional joint probability distributions of any order <MathView math="k \ge 1" /> remain invariant under arbitrary time shifts <MathView math="\tau \in \mathbb{R}" />. SSS implies WSS whenever second moments are finite.
          </p>
        </div>

        <div className="bg-white rounded-lg border border-[#E6E4DD] p-4 shadow-2xs space-y-2.5">
          <div className="flex items-center justify-between pb-2 border-b border-[#E6E4DD]">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#059669]" />
              <h4 className="font-mono font-bold text-xs sm:text-sm text-[#1A1917]">
                Wide-Sense Stationarity (WSS)
              </h4>
            </div>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#FAF9F6] border border-[#E6E4DD] text-[#585651]">
              Theory: {meta.isWss ? 'WSS' : 'Not WSS'}
            </span>
          </div>
          <div className="p-2 bg-[#FAF9F6] rounded border border-[#E6E4DD] text-xs">
            <MathView
              math="\mathbb{E}[X(t)] = \mu_X, \quad \operatorname{Var}(X(t)) < \infty, \quad R_{XX}(t_1,t_2) = R_{XX}(t_1 - t_2)"
              displayMode={true}
            />
          </div>
          <p className="text-xs text-[#585651] leading-relaxed">
            Relaxes SSS to require only shift invariance of the first two moments (constant mean, constant finite variance, and lag-only autocorrelation).
          </p>
        </div>
      </div>

      {/* 4. Explicit Finite-Sample Scientific Caveat */}
      <div className="p-3.5 bg-[#FBF4F0] rounded-lg border border-[#C85A32]/30 flex items-start gap-3">
        <Info className="w-4 h-4 text-[#C85A32] shrink-0 mt-0.5" />
        <div className="text-xs text-[#585651] leading-relaxed">
          <strong className="text-[#1A1917] font-mono uppercase">Mathematical Proof vs. Finite-Sample Simulation: </strong>
          {stationarity.finiteDataNotice} Even a stationary process exhibits random sampling fluctuations of order <MathView math="\sigma / \sqrt{M}" /> when <MathView math="M" /> is small.
        </div>
      </div>
    </div>
  );
};
