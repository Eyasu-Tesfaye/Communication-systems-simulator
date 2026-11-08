/**
 * Module 03: Requirement 9 — Documented Assumptions and Results
 * Dedicated analysis and verification report documenting:
 * - Assumptions: Realization count M, Sample count N, Sampling interval dt, Process type, Statistical assumptions, Approximations.
 * - Results: Calculated ensemble mean, Time-average mean, Ensemble variance, Time-average variance,
 *   Stationarity observations, Ergodicity comparison, Autocorrelation results, and simple engineering explanations.
 */

import React from 'react';
import { FileText, CheckCircle2, AlertTriangle, Info, BookOpen, Layers } from 'lucide-react';
import { MathView } from '../../../components/MathView';
import {
  EnsembleSimulationData,
  AutocorrelationResult,
  StationarityDiagnostics,
  generateDocumentedReport,
} from '../randomProcessEngine';

interface DocumentedReportPanelProps {
  simulation: EnsembleSimulationData;
  simTime: number;
  selectedRealizationIndex: number;
  autocorr: AutocorrelationResult;
  stationarity: StationarityDiagnostics;
}

export const DocumentedReportPanel: React.FC<DocumentedReportPanelProps> = ({
  simulation,
  simTime,
  selectedRealizationIndex,
  autocorr,
  stationarity,
}) => {
  const report = generateDocumentedReport(
    simulation,
    simTime,
    selectedRealizationIndex,
    autocorr,
    stationarity
  );

  const { assumptions, results } = report;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-[#FAF9F6] border border-[#E6E4DD] rounded-lg p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#C85A32] bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/20">
            Mandatory Analysis Area
          </span>
          <span className="text-xs text-[#75736E] font-medium">Academic & Engineering Audit</span>
        </div>
        <h2 className="text-lg font-bold text-[#1A1917]">
          Documented Assumptions and Verification Results
        </h2>
        <p className="text-xs sm:text-sm text-[#585651] mt-1 max-w-3xl leading-relaxed">
          Formal engineering documentation of simulation conditions, statistical models, mathematical assumptions, and empirical verification results calculated from the active random process.
        </p>
      </div>

      {/* Part 1: Documented Assumptions */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#E6E4DD]">
          <FileText className="w-4 h-4 text-[#C85A32]" />
          <h3 className="font-mono font-bold text-xs uppercase tracking-wider text-[#1A1917]">
            1. Simulation Parameters & Documented Assumptions
          </h3>
        </div>

        {/* Configuration Parameter Table */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] text-[#75736E] uppercase">Process Type</div>
            <div className="font-bold text-[#1A1917] mt-0.5">{assumptions.processType}</div>
          </div>

          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] text-[#75736E] uppercase">Realizations (M)</div>
            <div className="font-bold text-[#1A1917] mt-0.5">{assumptions.realizationCount} trajectories</div>
          </div>

          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] text-[#75736E] uppercase">Sample Points (N)</div>
            <div className="font-bold text-[#1A1917] mt-0.5">{assumptions.sampleCount} points (T={assumptions.tMax}s)</div>
          </div>

          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] text-[#75736E] uppercase">Sampling Interval (Δt)</div>
            <div className="font-bold text-[#1A1917] mt-0.5">
              {assumptions.dt.toFixed(4)}s ({assumptions.samplingFreq.toFixed(1)} Hz)
            </div>
          </div>
        </div>

        {/* Statistical Assumptions List */}
        <div className="p-3.5 bg-[#FAF9F6] rounded-md border border-[#E6E4DD] space-y-2 text-xs">
          <strong className="text-[#1A1917] font-mono block uppercase text-[11px]">
            Formal Statistical Assumptions:
          </strong>
          <ul className="list-disc list-inside space-y-1 text-[#585651]">
            {assumptions.statisticalAssumptions.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* Approximations List */}
        <div className="p-3.5 bg-[#FAF9F6] rounded-md border border-[#E6E4DD] space-y-2 text-xs">
          <strong className="text-[#1A1917] font-mono block uppercase text-[11px]">
            Documented Approximations & Numerical Limits:
          </strong>
          <ul className="list-disc list-inside space-y-1 text-[#585651]">
            {assumptions.approximations.map((item, idx) => (
              <li key={idx} className="leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Part 2: Documented Results */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#E6E4DD]">
          <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
          <h3 className="font-mono font-bold text-xs uppercase tracking-wider text-[#1A1917]">
            2. Empirical Results & Mathematical Calculations
          </h3>
        </div>

        {/* Results Matrix */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] text-[#75736E] uppercase">Ensemble Mean μ̂(t)</div>
            <div className="text-base font-bold text-[#1A1917] mt-0.5">
              {results.instantaneousEnsembleMean >= 0 ? '+' : ''}{results.instantaneousEnsembleMean.toFixed(3)} V
            </div>
            <div className="text-[10px] text-[#75736E] font-sans">At t = {results.simTime.toFixed(2)}s</div>
          </div>

          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] text-[#75736E] uppercase">
              Time-Average Mean ⟨x⟩
            </div>
            <div className="text-base font-bold text-[#1A1917] mt-0.5">
              {results.timeMeanSelected >= 0 ? '+' : ''}{results.timeMeanSelected.toFixed(3)} V
            </div>
            <div className="text-[10px] text-[#75736E] font-sans">
              Realization #{selectedRealizationIndex + 1}
            </div>
          </div>

          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] text-[#75736E] uppercase">Ensemble Variance σ̂²(t)</div>
            <div className="text-base font-bold text-[#1A1917] mt-0.5">
              {results.instantaneousEnsembleVariance.toFixed(3)} V²
            </div>
            <div className="text-[10px] text-[#75736E] font-sans">Instantaneous dispersion</div>
          </div>

          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] text-[#75736E] uppercase">Time Variance Var_T</div>
            <div className="text-base font-bold text-[#1A1917] mt-0.5">
              {results.timeVarSelected.toFixed(3)} V²
            </div>
            <div className="text-[10px] text-[#75736E] font-sans">
              Realization #{selectedRealizationIndex + 1}
            </div>
          </div>

          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] text-[#75736E] uppercase">Ergodicity Mean Gap</div>
            <div className="text-base font-bold text-[#C85A32] mt-0.5">
              |Δ| = {results.ergodicityMeanGap.toFixed(3)} V
            </div>
            <div className="text-[10px] text-[#75736E] font-sans">|⟨x⟩ - μ(t)|</div>
          </div>

          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] text-[#75736E] uppercase">Autocorrelation Peak R(0)</div>
            <div className="text-base font-bold text-[#1A1917] mt-0.5">
              {results.autocorrZeroLagPower.toFixed(3)} V²
            </div>
            <div className="text-[10px] text-[#75736E] font-sans">Total average power</div>
          </div>

          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] text-[#75736E] uppercase">Est. Correlation Time τ_c</div>
            <div className="text-base font-bold text-[#1A1917] mt-0.5">
              {results.estimatedCorrelationTime.toFixed(2)} s
            </div>
            <div className="text-[10px] text-[#75736E] font-sans">Memory decay horizon</div>
          </div>

          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] text-[#75736E] uppercase">WSS Test Status</div>
            <div
              className={`text-base font-bold mt-0.5 ${
                results.stationarityResult === 'Pass' ? 'text-[#059669]' : 'text-[#C85A32]'
              }`}
            >
              {results.stationarityResult === 'Pass' ? 'WSS Verified' : 'WSS Failed'}
            </div>
            <div className="text-[10px] text-[#75736E] font-sans">Empirical check</div>
          </div>
        </div>

        {/* Engineering Interpretation in Simple Language */}
        <div className="p-4 bg-[#FAF9F6] rounded-md border border-[#E6E4DD] space-y-2 text-xs">
          <strong className="text-[#1A1917] font-mono block uppercase text-[11px]">
            Engineering Interpretation:
          </strong>
          <p className="text-[#585651] leading-relaxed">
            {results.engineeringInterpretation}
          </p>
        </div>
      </div>
    </div>
  );
};
