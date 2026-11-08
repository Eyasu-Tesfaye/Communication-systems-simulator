/**
 * Section 7: Ergodicity
 * Comparison of time averages <x_i(t)>_T with ensemble averages E[X(t)],
 * realization-by-realization convergence, ergodicity in mean and autocorrelation,
 * and explanation of why stationarity is a prerequisite.
 */

import React, { useMemo } from 'react';
import { RefreshCw, BookOpen, CheckCircle2, AlertTriangle, Info, Clock, Layers } from 'lucide-react';
import { MathView } from '../../../components/MathView';
import {
  EnsembleSimulationData,
  PROCESS_CATALOG,
} from '../randomProcessEngine';

interface ErgodicitySectionProps {
  simulation: EnsembleSimulationData;
  selectedRealizationIndex: number;
  onSelectRealization: (idx: number) => void;
}

export const ErgodicitySection: React.FC<ErgodicitySectionProps> = ({
  simulation,
  selectedRealizationIndex,
  onSelectRealization,
}) => {
  const { trajectories, ensembleMean, ensembleVariance, timeAverages, timeVariances, params } = simulation;
  const M = trajectories.length;
  const currentMeta = PROCESS_CATALOG[params.type];

  // Overall grand ensemble mean averaged across all time
  const grandEnsembleMean = useMemo(() => {
    const sum = ensembleMean.reduce((acc, v) => acc + v, 0);
    return sum / ensembleMean.length;
  }, [ensembleMean]);

  // Overall grand ensemble variance averaged across all time
  const grandEnsembleVariance = useMemo(() => {
    const sum = ensembleVariance.reduce((acc, v) => acc + v, 0);
    return sum / ensembleVariance.length;
  }, [ensembleVariance]);

  // Comparison metrics for each realization
  const realizationMetrics = useMemo(() => {
    return timeAverages.map((tMean, i) => {
      const tVar = timeVariances[i];
      const meanGap = Math.abs(tMean - grandEnsembleMean);
      const varGap = Math.abs(tVar - grandEnsembleVariance);
      return {
        index: i,
        timeMean: tMean,
        timeVar: tVar,
        meanGap,
        varGap,
        isConsistent: meanGap < 0.55 && currentMeta.isErgodic,
      };
    });
  }, [timeAverages, timeVariances, grandEnsembleMean, grandEnsembleVariance, currentMeta]);

  // Average ergodicity gap across all realizations
  const avgMeanGap = useMemo(() => {
    const sum = realizationMetrics.reduce((acc, m) => acc + m.meanGap, 0);
    return sum / realizationMetrics.length;
  }, [realizationMetrics]);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-[#FAF9F6] border border-[#E6E4DD] rounded-lg p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#C85A32] bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/20">
            Section 07
          </span>
          <span className="text-xs text-[#75736E] font-medium">Equivalence of Time & Ensemble Averages</span>
        </div>
        <h2 className="text-lg font-bold text-[#1A1917]">
          Ergodicity in the Mean & Autocorrelation
        </h2>
        <p className="text-xs sm:text-sm text-[#585651] mt-1 max-w-3xl leading-relaxed">
          An ergodic random process allows engineers to measure statistical ensemble properties (such as mean and autocorrelation) from a <strong>single continuous observation trajectory</strong> recorded over time.
        </p>
      </div>

      {/* 2. Mathematical Definition Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-2xs space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#1A1917]">
            <Clock className="w-4 h-4 text-[#C85A32]" />
            <span>Ergodicity in the Mean</span>
          </div>
          <div className="p-2.5 bg-[#FAF9F6] rounded border border-[#E6E4DD] text-xs font-mono">
            <MathView
              math="\lim_{T \to \infty} \frac{1}{T} \int_0^T x_i(t) \, dt = \mathbb{E}[X(t)] = \mu_X \quad \text{(a.s.)}"
              displayMode={true}
            />
          </div>
          <p className="text-xs text-[#585651] leading-relaxed">
            The long-term time average of almost every realization equals the stochastic ensemble mean. One single antenna recording suffices to determine the overall noise average.
          </p>
        </div>

        <div className="bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-2xs space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-[#1A1917]">
            <Layers className="w-4 h-4 text-[#10B981]" />
            <span>Ergodicity in Autocorrelation</span>
          </div>
          <div className="p-2.5 bg-[#FAF9F6] rounded border border-[#E6E4DD] text-xs font-mono">
            <MathView
              math="\lim_{T \to \infty} \frac{1}{T} \int_0^T x_i(t) x_i(t+\tau) \, dt = R_{XX}(\tau) = \mathbb{E}[X(t)X(t+\tau)]"
              displayMode={true}
            />
          </div>
          <p className="text-xs text-[#585651] leading-relaxed">
            The temporal autocorrelation of a single waveform equals the statistical ensemble autocorrelation. This enables practical power spectral density estimation in RF receivers.
          </p>
        </div>
      </div>

      {/* 3. Numerical Comparison: Time Averages vs Ensemble Averages */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#E6E4DD]">
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1917]">
              Empirical Realization Comparison Matrix ({M} Realizations)
            </h3>
            <span className="text-[11px] text-[#75736E]">
              Comparing single-path time average ⟨x_i⟩ against ensemble mean E[X] = {grandEnsembleMean.toFixed(3)} V
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#75736E]">Average Deviation |Δ|:</span>
            <span className="font-mono font-bold text-xs bg-[#FAF9F6] px-2.5 py-1 rounded border border-[#E6E4DD] text-[#C85A32]">
              {avgMeanGap.toFixed(3)} V
            </span>
          </div>
        </div>

        {/* Realization Data Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {realizationMetrics.map((rm) => {
            const isSelected = rm.index === selectedRealizationIndex;

            return (
              <button
                key={rm.index}
                type="button"
                onClick={() => onSelectRealization(rm.index)}
                className={`p-3.5 rounded-lg text-left border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#FAF9F6] border-[#C85A32] ring-1 ring-[#C85A32]/40 shadow-xs'
                    : 'bg-white border-[#E6E4DD] hover:border-[#8A8882]'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-mono mb-2">
                  <span className="font-bold text-[#1A1917]">
                    Realization X<sup>({rm.index + 1})</sup>
                  </span>
                  {rm.isConsistent ? (
                    <span className="flex items-center gap-1 text-[10px] text-[#059669] font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Consistent
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] text-[#C85A32] font-bold">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Discrepancy
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-xs font-mono">
                  <div className="flex justify-between text-[#585651]">
                    <span>Time Mean ⟨x⟩:</span>
                    <strong className="text-[#1A1917]">
                      {rm.timeMean >= 0 ? '+' : ''}
                      {rm.timeMean.toFixed(3)} V
                    </strong>
                  </div>

                  <div className="flex justify-between text-[#585651]">
                    <span>Ensemble E[X]:</span>
                    <span className="text-[#75736E]">
                      {grandEnsembleMean >= 0 ? '+' : ''}
                      {grandEnsembleMean.toFixed(3)} V
                    </span>
                  </div>

                  <div className="flex justify-between pt-1 border-t border-[#E6E4DD]/70 text-[#C85A32]">
                    <span>Ergodicity Gap |Δ|:</span>
                    <strong className="font-bold">{rm.meanGap.toFixed(3)} V</strong>
                  </div>

                  <div className="flex justify-between text-[11px] text-[#75736E] pt-0.5">
                    <span>Time Var Var_T:</span>
                    <span>{rm.timeVar.toFixed(3)} V²</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Why Stationarity is a Prerequisite for Ergodicity */}
      <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-5 shadow-2xs space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[#75736E]">
          <BookOpen className="w-4 h-4 text-[#C85A32]" />
          <span>Why Stationarity is Strictly Required for Ergodicity</span>
        </div>
        <p className="text-xs text-[#585651] leading-relaxed">
          For a time average to converge to an ensemble average, the ensemble average must be a constant independent of time: <MathView math="\mathbb{E}[X(t)] = \mu_X" />. If a process is <strong>non-stationary</strong>, its ensemble average <MathView math="\mu_X(t)" /> varies continuously with time, which makes it mathematically impossible for a single scalar time average <MathView math="\langle x_i \rangle_T" /> to represent <MathView math="\mu_X(t)" /> at all instants. Hence, <em>Wide-Sense Stationarity is a necessary (though not always sufficient) condition for ergodicity</em>.
        </p>
      </div>

      {/* 5. Finite-Sample Methodological Caveat */}
      <div className="p-4 bg-[#FBF4F0] rounded-lg border border-[#C85A32]/30 flex items-start gap-3">
        <Info className="w-5 h-5 text-[#C85A32] shrink-0 mt-0.5" />
        <div className="text-xs text-[#585651] leading-relaxed">
          <strong className="text-[#1A1917] block font-mono uppercase mb-0.5">
            Finite Simulation Observation vs. Mathematical Proof
          </strong>
          Numerical results here indicate whether the finite trajectories (<MathView math="T = 10\text{s}" />) appear consistent with ergodic behavior. Finite data cannot mathematically prove ergodicity, as formal ergodicity requires the limit as <MathView math="T \to \infty" /> and decay of the covariance function <MathView math="\lim_{\tau \to \infty} C_{XX}(\tau) = 0" /> (Slutsky's theorem).
        </div>
      </div>
    </div>
  );
};
