/**
 * Module 03: Documentation, Simulation Assumptions & Analysis Results
 * Formal academic and engineering documentation reflecting live simulation settings,
 * mathematical formulations, estimation methods, approximations, and calculated metrics.
 */

import React from 'react';
import { FileText, CheckCircle2, BookOpen, AlertTriangle } from 'lucide-react';
import { MathView } from '../../../components/MathView';
import {
  EnsembleSimulationData,
  AutocorrelationResult,
  StationarityDiagnostics,
  PROCESS_CATALOG,
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
  const meta = PROCESS_CATALOG[simulation.params.type];
  const { assumptions, results } = report;

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="bg-[#FAF9F6] border border-[#E6E4DD] rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#C85A32] bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/20">
            Documentation & Assumptions
          </span>
          <span className="text-[11px] font-mono text-[#75736E]">
            Live Audit · Seed #{simulation.params.seed} · Path X<sup>({selectedRealizationIndex + 1})</sup>
          </span>
        </div>
        <h2 className="text-base sm:text-lg font-bold text-[#1A1917]">
          Random Process Simulation Assumptions & Empirical Analysis Results
        </h2>
        <p className="text-xs text-[#585651] mt-1 leading-relaxed">
          All numerical figures, mathematical models, and stationarity/ergodicity diagnostics below update dynamically from the active simulation parameters.
        </p>
      </div>

      {/* Part 1: Simulation Assumptions & Mathematical Models */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-4 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#E6E4DD]">
          <FileText className="w-4 h-4 text-[#C85A32]" />
          <h3 className="font-mono font-bold text-xs uppercase tracking-wider text-[#1A1917]">
            1. Simulation Parameters, Statistical Assumptions & Approximations
          </h3>
        </div>

        {/* Active Configuration Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] text-[#75736E] uppercase">Selected Process</div>
            <div className="font-bold text-[#1A1917] mt-0.5">{assumptions.processType}</div>
          </div>

          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] text-[#75736E] uppercase">Realizations (M)</div>
            <div className="font-bold text-[#1A1917] mt-0.5">{assumptions.realizationCount} trajectories</div>
          </div>

          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] text-[#75736E] uppercase">Samples (N) & Window</div>
            <div className="font-bold text-[#1A1917] mt-0.5">
              {assumptions.sampleCount} pts (T = {assumptions.tMax.toFixed(1)} s)
            </div>
          </div>

          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] text-[#75736E] uppercase">Sampling Interval (Δt)</div>
            <div className="font-bold text-[#1A1917] mt-0.5">
              {assumptions.dt.toFixed(4)} s ({assumptions.samplingFreq.toFixed(1)} Hz)
            </div>
          </div>
        </div>

        {/* Governing Mathematical Formulas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] font-mono uppercase text-[#75736E] mb-1">Theoretical Mean</div>
            <MathView math={meta.theoreticalMean} displayMode={true} />
          </div>
          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] font-mono uppercase text-[#75736E] mb-1">Theoretical Variance</div>
            <MathView math={meta.theoreticalVar} displayMode={true} />
          </div>
          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] font-mono uppercase text-[#75736E] mb-1">Theoretical Autocorrelation</div>
            <MathView math={meta.theoreticalRxx} displayMode={true} />
          </div>
        </div>

        {/* Assumptions, Estimation Methods, Approximations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 bg-[#FAF9F6] rounded-md border border-[#E6E4DD] space-y-1.5">
            <strong className="text-[#1A1917] font-mono block uppercase text-[10px]">
              Statistical Assumptions
            </strong>
            <ul className="list-disc list-inside space-y-1 text-[#585651]">
              {assumptions.statisticalAssumptions.map((item, idx) => (
                <li key={idx} className="leading-relaxed">{item}</li>
              ))}
            </ul>
          </div>

          <div className="p-3.5 bg-[#FAF9F6] rounded-md border border-[#E6E4DD] space-y-1.5">
            <strong className="text-[#1A1917] font-mono block uppercase text-[10px]">
              Estimation Methods
            </strong>
            <ul className="list-disc list-inside space-y-1 text-[#585651]">
              {assumptions.estimationMethods.map((item, idx) => (
                <li key={idx} className="leading-relaxed">{item}</li>
              ))}
            </ul>
          </div>

          <div className="p-3.5 bg-[#FAF9F6] rounded-md border border-[#E6E4DD] space-y-1.5">
            <strong className="text-[#1A1917] font-mono block uppercase text-[10px]">
              Numerical Approximations
            </strong>
            <ul className="list-disc list-inside space-y-1 text-[#585651]">
              {assumptions.approximations.map((item, idx) => (
                <li key={idx} className="leading-relaxed">{item}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Part 2: Live Calculated Analysis Results */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-4 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#E6E4DD]">
          {results.stationarityResult === 'Consistent' ? (
            <CheckCircle2 className="w-4 h-4 text-[#059669]" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-[#C85A32]" />
          )}
          <h3 className="font-mono font-bold text-xs uppercase tracking-wider text-[#1A1917]">
            2. Live Calculated Analysis Results
          </h3>
        </div>

        {/* Results Matrix */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] text-[#75736E] uppercase">Ensemble Mean μ̂(t)</div>
            <div className="text-base font-bold text-[#1A1917] mt-0.5 tabular-nums">
              {results.instantaneousEnsembleMean >= 0 ? '+' : ''}{results.instantaneousEnsembleMean.toFixed(3)} V
            </div>
            <div className="text-[10px] text-[#75736E] font-sans">
              At t = {results.simTime.toFixed(2)}s (Grand: {results.grandEnsembleMean.toFixed(3)} V)
            </div>
          </div>

          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] text-[#75736E] uppercase">Time-Avg Mean ⟨x⟩_T</div>
            <div className="text-base font-bold text-[#059669] mt-0.5 tabular-nums">
              {results.timeMeanSelected >= 0 ? '+' : ''}{results.timeMeanSelected.toFixed(3)} V
            </div>
            <div className="text-[10px] text-[#75736E] font-sans">
              Path X<sup>({selectedRealizationIndex + 1})</sup> · Gap |Δμ| = {results.ergodicityMeanGap.toFixed(3)} V
            </div>
          </div>

          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] text-[#75736E] uppercase">Ensemble Variance σ̂²(t)</div>
            <div className="text-base font-bold text-[#1A1917] mt-0.5 tabular-nums">
              {results.instantaneousEnsembleVariance.toFixed(3)} V²
            </div>
            <div className="text-[10px] text-[#75736E] font-sans">
              At t = {results.simTime.toFixed(2)}s (Grand: {results.grandEnsembleVariance.toFixed(3)} V²)
            </div>
          </div>

          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] text-[#75736E] uppercase">Time Variance Var_T</div>
            <div className="text-base font-bold text-[#C85A32] mt-0.5 tabular-nums">
              {results.timeVarSelected.toFixed(3)} V²
            </div>
            <div className="text-[10px] text-[#75736E] font-sans">
              Path X<sup>({selectedRealizationIndex + 1})</sup> · Gap |Δσ²| = {results.ergodicityVarGap.toFixed(3)} V²
            </div>
          </div>

          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] text-[#75736E] uppercase">WSS Empirical Test</div>
            <div
              className={`text-sm font-bold mt-0.5 ${
                results.stationarityResult === 'Consistent' ? 'text-[#059669]' : 'text-[#C85A32]'
              }`}
            >
              {results.stationarityResult === 'Consistent' ? 'Consistent with WSS' : 'WSS Violated'}
            </div>
            <div className="text-[10px] text-[#75736E] font-sans">
              Theory: {results.theoreticalWss ? 'WSS' : 'Non-WSS'} / {results.theoreticalSss ? 'SSS' : 'Non-SSS'}
            </div>
          </div>

          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] text-[#75736E] uppercase">Shift Error (R_early vs R_late)</div>
            <div className="text-base font-bold text-[#1A1917] mt-0.5 tabular-nums">
              {(stationarity.lagShiftError * 100).toFixed(1)}%
            </div>
            <div className="text-[10px] text-[#75736E] font-sans">
              {stationarity.passesLagInvariance ? 'Lag-invariant' : 'Time-dependent'}
            </div>
          </div>

          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] text-[#75736E] uppercase">Signal Power R_XX(0)</div>
            <div className="text-base font-bold text-[#1A1917] mt-0.5 tabular-nums">
              {results.autocorrZeroLagPower.toFixed(3)} V²
            </div>
            <div className="text-[10px] text-[#75736E] font-sans">Mean-square power</div>
          </div>

          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] text-[#75736E] uppercase">Correlation Time τ_c</div>
            <div className="text-base font-bold text-[#1A1917] mt-0.5 tabular-nums">
              {results.estimatedCorrelationTime.toFixed(2)} s
            </div>
            <div className="text-[10px] text-[#75736E] font-sans">1/e decay horizon</div>
          </div>
        </div>

        {/* Engineering Interpretation */}
        <div className="p-3.5 bg-[#FAF9F6] rounded-md border border-[#E6E4DD] space-y-1.5 text-xs">
          <div className="flex items-center gap-1.5 font-mono font-bold text-[#1A1917] uppercase text-[11px]">
            <BookOpen className="w-3.5 h-3.5 text-[#C85A32]" />
            <span>Engineering & Statistical Interpretation</span>
          </div>
          <p className="text-[#585651] leading-relaxed">
            {results.engineeringInterpretation}
          </p>
        </div>
      </div>
    </div>
  );
};
