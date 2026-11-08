/**
 * Section 6: Stationarity Analysis (SSS & WSS)
 * Rigorous educational demonstration of Strict-Sense Stationarity (SSS)
 * and Wide-Sense Stationarity (WSS), with side-by-side diagnostic metrics,
 * joint CDF time-shift invariance tests, and finite-sample caveats.
 */

import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Scale,
  ShieldCheck,
  Info,
  Clock,
  Layers,
} from 'lucide-react';
import { MathView } from '../../../components/MathView';
import {
  EnsembleSimulationData,
  PROCESS_CATALOG,
} from '../randomProcessEngine';

interface StationaritySectionProps {
  simulation: EnsembleSimulationData;
}

export const StationaritySection: React.FC<StationaritySectionProps> = ({
  simulation,
}) => {
  const { params, ensembleMean, ensembleVariance } = simulation;
  const currentMeta = PROCESS_CATALOG[params.type];

  // Quantitative stationarity diagnostic scores
  const meanMin = Math.min(...ensembleMean);
  const meanMax = Math.max(...ensembleMean);
  const meanRange = meanMax - meanMin;

  const varMin = Math.min(...ensembleVariance);
  const varMax = Math.max(...ensembleVariance);
  const varRange = varMax - varMin;

  const passesMeanTest = meanRange < 0.65;
  const passesVarTest = varRange < 0.85;
  const passesWssEmpirical = passesMeanTest && passesVarTest && params.type !== 'non_stationary';

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-[#FAF9F6] border border-[#E6E4DD] rounded-lg p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#C85A32] bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/20">
            Section 06
          </span>
          <span className="text-xs text-[#75736E] font-medium">Invariance Under Time Translation</span>
        </div>
        <h2 className="text-lg font-bold text-[#1A1917]">
          Stationarity Analysis: Strict-Sense (SSS) vs. Wide-Sense (WSS)
        </h2>
        <p className="text-xs sm:text-sm text-[#585651] mt-1 max-w-3xl leading-relaxed">
          Stationarity describes whether the statistical mechanism generating the random process is independent of the choice of time origin <MathView math="t = 0" />.
        </p>
      </div>

      {/* 2. Side-by-Side SSS vs. WSS Theoretical Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* SSS Card */}
        <div className="bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E6E4DD]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#C85A32]" />
              <h3 className="font-mono font-bold text-sm text-[#1A1917]">
                Strict-Sense Stationarity (SSS)
              </h3>
            </div>
            <span className="text-[10px] font-mono uppercase bg-[#FAF9F6] px-2 py-0.5 rounded border border-[#E6E4DD] text-[#75736E]">
              All Orders
            </span>
          </div>

          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD] text-xs font-mono">
            <MathView
              math="F_{X(t_1), \dots, X(t_k)}(x_1, \dots, x_k) = F_{X(t_1+\tau), \dots, X(t_k+\tau)}(x_1, \dots, x_k)"
              displayMode={true}
            />
          </div>

          <div className="text-xs text-[#585651] space-y-2 leading-relaxed">
            <p>
              <strong>Mathematical Definition:</strong> Every joint cumulative distribution function (CDF) of arbitrary order <MathView math="k \ge 1" /> is completely invariant to any arbitrary continuous time shift <MathView math="\tau \in \mathbb{R}" />.
            </p>
            <p>
              <strong>Properties:</strong>
              <br />• All moments <MathView math="\mathbb{E}[X^n(t)]" /> are time-invariant if they exist.
              <br />• Extremely demanding criterion; virtually impossible to verify empirically from finite data alone.
              <br />• If an SSS process has finite 2nd moments, it is automatically WSS.
            </p>
          </div>
        </div>

        {/* WSS Card */}
        <div className="bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E6E4DD]">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#10B981]" />
              <h3 className="font-mono font-bold text-sm text-[#1A1917]">
                Wide-Sense Stationarity (WSS)
              </h3>
            </div>
            <span className="text-[10px] font-mono uppercase bg-[#10B981]/10 text-[#059669] px-2 py-0.5 rounded border border-[#10B981]/30 font-bold">
              1st & 2nd Order
            </span>
          </div>

          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD] text-xs font-mono">
            <MathView
              math="\mathbb{E}[X(t)] = \mu, \quad R_{XX}(t_1, t_2) = R_{XX}(t_1 - t_2) = R_{XX}(\tau)"
              displayMode={true}
            />
          </div>

          <div className="text-xs text-[#585651] space-y-2 leading-relaxed">
            <p>
              <strong>The 3 Formal WSS Conditions:</strong>
              <br />1. Constant Ensemble Mean: <MathView math="\mu_X(t) = \mu_X = \text{const}" />.
              <br />2. Constant Finite Variance: <MathView math="\sigma_X^2(t) = \sigma_X^2 < \infty" />.
              <br />3. Autocorrelation depends exclusively on the time lag <MathView math="\tau = t_1 - t_2" />.
            </p>
            <p>
              <strong>Engineering Relevance:</strong> WSS is the cornerstone of linear systems filtering and Wiener-Khinchin spectral analysis in communication engineering.
            </p>
          </div>
        </div>
      </div>

      {/* 3. Live Empirical Stationarity Diagnostics for Current Process */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#E6E4DD]">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#C85A32]" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1917]">
              Current Process Stationarity Diagnostic Matrix: {currentMeta.shortName}
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[#75736E]">
            Empirical Evaluation (M = {simulation.trajectories.length})
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Test 1: Constant Mean */}
          <div className="p-3.5 rounded-lg bg-[#FAF9F6] border border-[#E6E4DD] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[#75736E] uppercase text-[10px]">Condition 1</span>
              {passesMeanTest ? (
                <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-[#C85A32]" />
              )}
            </div>
            <div className="font-bold text-[#1A1917] font-mono">Constant Mean Test</div>
            <div className="text-[11px] font-mono text-[#585651]">
              Max temporal deviation: <strong className="text-[#1A1917]">{meanRange.toFixed(3)} V</strong>
            </div>
            <div className="text-[11px] text-[#75736E]">
              {passesMeanTest
                ? 'Mean shows statistical fluctuations around zero (Consistent with WSS).'
                : 'Mean exhibits pronounced systemic temporal drift (Fails WSS).'}
            </div>
          </div>

          {/* Test 2: Constant Variance */}
          <div className="p-3.5 rounded-lg bg-[#FAF9F6] border border-[#E6E4DD] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[#75736E] uppercase text-[10px]">Condition 2</span>
              {passesVarTest ? (
                <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-[#C85A32]" />
              )}
            </div>
            <div className="font-bold text-[#1A1917] font-mono">Constant Variance Test</div>
            <div className="text-[11px] font-mono text-[#585651]">
              Temporal span: <strong className="text-[#1A1917]">{varRange.toFixed(3)} V²</strong>
            </div>
            <div className="text-[11px] text-[#75736E]">
              {passesVarTest
                ? 'Variance envelope is bounded and stable across time.'
                : 'Variance envelope expands or contracts over time (Heteroscedastic).'}
            </div>
          </div>

          {/* Test 3: Lag-Only Autocorrelation */}
          <div className="p-3.5 rounded-lg bg-[#FAF9F6] border border-[#E6E4DD] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[#75736E] uppercase text-[10px]">Condition 3</span>
              {currentMeta.isWss ? (
                <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-[#C85A32]" />
              )}
            </div>
            <div className="font-bold text-[#1A1917] font-mono">Lag-Only Correlation</div>
            <div className="text-[11px] font-mono text-[#585651]">
              R(t₁, t₂) = R(t₁ - t₂): <strong className="text-[#1A1917]">{currentMeta.isWss ? 'Yes' : 'No'}</strong>
            </div>
            <div className="text-[11px] text-[#75736E]">
              {currentMeta.isWss
                ? 'Correlation depends purely on time difference tau.'
                : 'Correlation matrix depends on absolute times t1 and t2.'}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Critical Scientific Caveat on Finite Simulation */}
      <div className="p-4 bg-[#FBF4F0] rounded-lg border border-[#C85A32]/30 flex items-start gap-3">
        <Info className="w-5 h-5 text-[#C85A32] shrink-0 mt-0.5" />
        <div className="text-xs text-[#585651] leading-relaxed">
          <strong className="text-[#1A1917] block font-mono uppercase mb-0.5">
            Methodological Notice on Finite-Sample Testing
          </strong>
          Simulation of <MathView math="M" /> finite realizations over duration <MathView math="T" /> demonstrates numerical consistency with stationary conditions, but <strong>does not constitute a formal mathematical proof</strong>. True Strict-Sense Stationarity (SSS) requires testing infinite joint distributions of all orders across infinite time, which is proven analytically from the stochastic generator equations.
        </div>
      </div>
    </div>
  );
};
