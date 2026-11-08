/**
 * Module 03: Topic 4 — Stationarity Tests (SSS & WSS)
 * Rigorous tests for Strict-Sense Stationarity and Wide-Sense Stationarity,
 * with theoretical conditions, numerical tests, and finite-sample caveats.
 */

import React from 'react';
import {
  ShieldCheck,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Activity,
  Layers,
} from 'lucide-react';
import { MathView } from '../../../components/MathView';
import {
  EnsembleSimulationData,
  AutocorrelationResult,
  StationarityDiagnostics,
  PROCESS_CATALOG,
} from '../randomProcessEngine';

interface StationarityPanelProps {
  simulation: EnsembleSimulationData;
  autocorr: AutocorrelationResult;
  stationarity: StationarityDiagnostics;
}

export const StationarityPanel: React.FC<StationarityPanelProps> = ({
  simulation,
  autocorr,
  stationarity,
}) => {
  const meta = PROCESS_CATALOG[simulation.params.type];

  return (
    <div className="space-y-6">
      {/* 1. SSS vs. WSS Theoretical Foundations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Strict-Sense Stationarity (SSS) */}
        <div className="bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E6E4DD]">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#C85A32]" />
              <h3 className="font-mono font-bold text-sm text-[#1A1917]">
                A. Strict-Sense Stationarity (SSS)
              </h3>
            </div>
            <span className="text-[10px] font-mono uppercase bg-[#FAF9F6] px-2 py-0.5 rounded border border-[#E6E4DD] text-[#75736E]">
              All Probability Distributions
            </span>
          </div>

          <div className="p-2.5 bg-[#FAF9F6] rounded border border-[#E6E4DD] text-xs font-mono">
            <MathView
              math="F_{X(t_1), \dots, X(t_k)}(x_1, \dots, x_k) = F_{X(t_1+\tau), \dots, X(t_k+\tau)}(x_1, \dots, x_k)"
              displayMode={true}
            />
          </div>

          <div className="text-xs text-[#585651] space-y-2 leading-relaxed">
            <p>
              <strong>Theoretical Explanation:</strong> A stochastic process is strictly stationary if the joint probability distribution of any collection of samples is completely unaffected by any arbitrary time translation <MathView math="\tau" />.
            </p>
            <p>
              <strong>Mathematical Requirement:</strong> Requires all joint probability density functions of every order <MathView math="k = 1, 2, 3, \dots" /> to remain identical for all <MathView math="\tau \in \mathbb{R}" />.
            </p>
          </div>
        </div>

        {/* Wide-Sense Stationarity (WSS) */}
        <div className="bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E6E4DD]">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#10B981]" />
              <h3 className="font-mono font-bold text-sm text-[#1A1917]">
                B. Wide-Sense Stationarity (WSS)
              </h3>
            </div>
            <span className="text-[10px] font-mono uppercase bg-[#10B981]/10 text-[#059669] px-2 py-0.5 rounded border border-[#10B981]/30 font-bold">
              1st & 2nd Moments
            </span>
          </div>

          <div className="p-2.5 bg-[#FAF9F6] rounded border border-[#E6E4DD] text-xs font-mono">
            <MathView
              math="\mathbb{E}[X(t)] = \mu_X = \text{const}, \quad R_{XX}(t_1, t_2) = R_{XX}(t_1 - t_2) = R_{XX}(\tau)"
              displayMode={true}
            />
          </div>

          <div className="text-xs text-[#585651] space-y-1.5 leading-relaxed">
            <strong>The 3 Formal WSS Conditions:</strong>
            <ul className="list-disc list-inside space-y-1 text-[#585651]">
              <li><strong>Condition 1:</strong> Constant ensemble mean <MathView math="\mu_X(t) \equiv \mu_X" /></li>
              <li><strong>Condition 2:</strong> Finite, constant variance <MathView math="\sigma_X^2(t) \equiv \sigma_X^2 < \infty" /></li>
              <li><strong>Condition 3:</strong> Autocorrelation <MathView math="R_{XX}(t_1, t_2)" /> depends only on lag <MathView math="\tau = t_1 - t_2" /></li>
            </ul>
          </div>
        </div>
      </div>

      {/* 2. Interactive WSS Diagnostic Tests Matrix */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#E6E4DD]">
          <div>
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1917]">
              WSS Verification Test Results: {meta.name}
            </h4>
            <span className="text-[11px] text-[#75736E]">
              Testing the 3 required conditions on simulated ensemble data (M = {simulation.trajectories.length})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#75736E]">Overall WSS Test:</span>
            <span
              className={`px-3 py-1 rounded text-xs font-mono font-bold uppercase ${
                stationarity.empiricalWssStatus === 'Pass'
                  ? 'bg-[#10B981]/10 text-[#059669] border border-[#10B981]/30'
                  : 'bg-[#C85A32]/10 text-[#C85A32] border border-[#C85A32]/30'
              }`}
            >
              {stationarity.empiricalWssStatus === 'Pass' ? 'WSS Verified (Consistent)' : 'WSS Failed (Non-Stationary)'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          {/* Test 1: Constant Mean */}
          <div className="p-3.5 bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[#75736E] text-[10px] uppercase font-bold">Condition 1</span>
              {stationarity.passesMeanTest ? (
                <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-[#C85A32]" />
              )}
            </div>
            <div className="font-bold text-[#1A1917] font-mono">Mean Invariance Test</div>
            <div className="text-[11px] font-mono text-[#585651]">
              Max temporal span: <strong className="text-[#1A1917]">{stationarity.meanRange.toFixed(3)} V</strong>
            </div>
            <div className="text-[11px] text-[#75736E]">
              {stationarity.passesMeanTest
                ? 'Mean shows only minor statistical fluctuations around 0V (Passes).'
                : 'Mean exhibits pronounced systemic temporal drift across time (Fails).'}
            </div>
          </div>

          {/* Test 2: Constant Variance */}
          <div className="p-3.5 bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[#75736E] text-[10px] uppercase font-bold">Condition 2</span>
              {stationarity.passesVarTest ? (
                <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-[#C85A32]" />
              )}
            </div>
            <div className="font-bold text-[#1A1917] font-mono">Variance Invariance Test</div>
            <div className="text-[11px] font-mono text-[#585651]">
              Max temporal span: <strong className="text-[#1A1917]">{stationarity.varRange.toFixed(3)} V²</strong>
            </div>
            <div className="text-[11px] text-[#75736E]">
              {stationarity.passesVarTest
                ? 'Variance envelope is homoscedastic and bounded (Passes).'
                : 'Variance envelope expands or contracts across the time horizon (Fails).'}
            </div>
          </div>

          {/* Test 3: Lag-Only Autocorrelation */}
          <div className="p-3.5 bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[#75736E] text-[10px] uppercase font-bold">Condition 3</span>
              {stationarity.passesLagSymmetry ? (
                <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-[#C85A32]" />
              )}
            </div>
            <div className="font-bold text-[#1A1917] font-mono">Lag-Only Correlation Test</div>
            <div className="text-[11px] font-mono text-[#585651]">
              Symmetry error: <strong className="text-[#1A1917]">{stationarity.lagSymmetryError.toFixed(3)}</strong>
            </div>
            <div className="text-[11px] text-[#75736E]">
              {stationarity.passesLagSymmetry
                ? 'Correlation exhibits even symmetry R(τ) = R(-τ) (Passes).'
                : 'Correlation breaks symmetry or depends on absolute times t1, t2 (Fails).'}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Essential Scientific Caveat */}
      <div className="p-4 bg-[#FBF4F0] rounded-lg border border-[#C85A32]/30 flex items-start gap-3">
        <Info className="w-5 h-5 text-[#C85A32] shrink-0 mt-0.5" />
        <div className="text-xs text-[#585651] leading-relaxed">
          <strong className="text-[#1A1917] block font-mono uppercase mb-0.5">
            Limitations of Finite Simulation Data
          </strong>
          Simulation of a finite ensemble of <MathView math="M" /> realizations over a finite window <MathView math="T" /> demonstrates numerical consistency with stationarity, but <strong>cannot mathematically prove SSS or WSS</strong>. Mathematical stationarity requires infinite realizations and infinite observation duration, proven analytically from the stochastic generator equations.
        </div>
      </div>
    </div>
  );
};
