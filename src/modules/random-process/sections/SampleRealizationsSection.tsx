/**
 * Section 2: Sample Realizations
 * Interactive multi-realization browser, playback synchronization,
 * moving vertical line tracking, and realization-specific telemetry.
 */

import React from 'react';
import { Layers, Eye, CheckCircle2, Sliders, Activity, Info } from 'lucide-react';
import { MathView } from '../../../components/MathView';
import { SimulationToolbar, PlaybackState } from '../../../components/SimulationToolbar';
import { RandomProcessVisualizer } from '../RandomProcessVisualizer';
import {
  EnsembleSimulationData,
  getInstantaneousStats,
} from '../randomProcessEngine';

interface SampleRealizationsSectionProps {
  simulation: EnsembleSimulationData;
  simTime: number;
  onSeekTime: (t: number) => void;
  playbackState: PlaybackState;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  speed: string;
  onSpeedChange: (speed: string) => void;
  isGridVisible: boolean;
  onToggleGrid: () => void;
  selectedRealizationIndex: number;
  onSelectRealization: (idx: number) => void;
  showEnvelope: boolean;
  onToggleEnvelope: () => void;
  showMeanCurve: boolean;
  onToggleMeanCurve: () => void;
  showAllRealizations: boolean;
  onToggleAllRealizations: () => void;
}

export const SampleRealizationsSection: React.FC<SampleRealizationsSectionProps> = ({
  simulation,
  simTime,
  onSeekTime,
  playbackState,
  onPlay,
  onPause,
  onReset,
  speed,
  onSpeedChange,
  isGridVisible,
  onToggleGrid,
  selectedRealizationIndex,
  onSelectRealization,
  showEnvelope,
  onToggleEnvelope,
  showMeanCurve,
  onToggleMeanCurve,
  showAllRealizations,
  onToggleAllRealizations,
}) => {
  const stats = getInstantaneousStats(simulation, simTime, selectedRealizationIndex);
  const M = simulation.trajectories.length;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-[#FAF9F6] border border-[#E6E4DD] rounded-lg p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#C85A32] bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/20">
            Section 02
          </span>
          <span className="text-xs text-[#75736E] font-medium">Temporal Sample Trajectories</span>
        </div>
        <h2 className="text-lg font-bold text-[#1A1917]">
          Sample Realizations & Time Horizon
        </h2>
        <p className="text-xs sm:text-sm text-[#585651] mt-1 max-w-3xl leading-relaxed">
          A random process <MathView math="X(t, \xi)" /> maps each experimental outcome <MathView math="\xi_i" /> from sample space <MathView math="\Omega" /> into a deterministic continuous waveform <MathView math="x_i(t)" /> called a <em>sample realization</em> or <em>sample path</em>.
        </p>
      </div>

      {/* 2. Simulation Playback Toolbar */}
      <SimulationToolbar
        playbackState={playbackState}
        onPlay={onPlay}
        onPause={onPause}
        onReset={onReset}
        speed={speed}
        onSpeedChange={onSpeedChange}
        isGridVisible={isGridVisible}
        onToggleGrid={onToggleGrid}
        isFullscreen={false}
        onToggleFullscreen={() => {}}
        isLiveSimulationReady={true}
      />

      {/* 3. High-Readability Responsive Visualizer */}
      <RandomProcessVisualizer
        simulation={simulation}
        simTime={simTime}
        onSeekTime={onSeekTime}
        selectedRealizationIndex={selectedRealizationIndex}
        onSelectRealization={onSelectRealization}
        showEnvelope={showEnvelope}
        showMeanCurve={showMeanCurve}
        showAllRealizations={showAllRealizations}
        isGridVisible={isGridVisible}
        heightClass="min-h-[420px]"
      />

      {/* 4. Display Layer Toggles */}
      <div className="p-4 bg-white rounded-lg border border-[#E6E4DD] flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="font-mono text-[#75736E] font-semibold uppercase tracking-wider flex items-center gap-1.5">
          <Eye className="w-4 h-4 text-[#C85A32]" />
          <span>Layer Visibility Toggles:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onToggleAllRealizations}
            className={`px-3 py-1.5 rounded-md font-mono font-medium border transition-colors cursor-pointer ${
              showAllRealizations
                ? 'bg-[#1A1917] text-white border-[#1A1917]'
                : 'bg-white text-[#585651] border-[#E6E4DD] hover:bg-[#FAF9F6]'
            }`}
          >
            {showAllRealizations ? 'All Realizations (1..M)' : 'Isolated Realization Only'}
          </button>

          <button
            type="button"
            onClick={onToggleMeanCurve}
            className={`px-3 py-1.5 rounded-md font-mono font-medium border transition-colors cursor-pointer ${
              showMeanCurve
                ? 'bg-[#1A1917] text-white border-[#1A1917]'
                : 'bg-white text-[#585651] border-[#E6E4DD] hover:bg-[#FAF9F6]'
            }`}
          >
            {showMeanCurve ? 'Hide Mean Curve μ̂(t)' : 'Show Mean Curve μ̂(t)'}
          </button>

          <button
            type="button"
            onClick={onToggleEnvelope}
            className={`px-3 py-1.5 rounded-md font-mono font-medium border transition-colors cursor-pointer ${
              showEnvelope
                ? 'bg-[#C85A32] text-white border-[#C85A32]'
                : 'bg-white text-[#585651] border-[#E6E4DD] hover:bg-[#FAF9F6]'
            }`}
          >
            {showEnvelope ? 'Hide ±1σ Confidence Band' : 'Show ±1σ Confidence Band'}
          </button>
        </div>
      </div>

      {/* 5. Synchronized Instantaneous Numerical Displays */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-white rounded-lg border border-[#E6E4DD] shadow-2xs">
          <div className="text-[10px] font-mono uppercase text-[#75736E]">Sim Time t</div>
          <div className="text-base sm:text-lg font-bold font-mono text-[#C85A32] mt-0.5">
            {stats.simTime.toFixed(2)} s
          </div>
          <div className="text-[11px] text-[#585651] mt-0.5">
            Sweep cursor position
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-lg border border-[#E6E4DD] shadow-2xs">
          <div className="text-[10px] font-mono uppercase text-[#75736E]">
            Amplitude X<sup>({selectedRealizationIndex + 1})</sup>(t)
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-[#1A1917] mt-0.5">
            {stats.selectedAmplitude >= 0 ? '+' : ''}
            {stats.selectedAmplitude.toFixed(3)} V
          </div>
          <div className="text-[11px] text-[#585651] mt-0.5">
            Realization #{selectedRealizationIndex + 1}
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-lg border border-[#E6E4DD] shadow-2xs">
          <div className="text-[10px] font-mono uppercase text-[#75736E]">
            Ensemble Mean μ̂(t)
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-[#1A1917] mt-0.5">
            {stats.ensembleMean >= 0 ? '+' : ''}
            {stats.ensembleMean.toFixed(3)} V
          </div>
          <div className="text-[11px] text-[#585651] mt-0.5">
            Average across M={M}
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-lg border border-[#E6E4DD] shadow-2xs">
          <div className="text-[10px] font-mono uppercase text-[#75736E]">
            Ensemble Variance σ̂²(t)
          </div>
          <div className="text-base sm:text-lg font-bold font-mono text-[#1A1917] mt-0.5">
            {stats.ensembleVariance.toFixed(3)} V²
          </div>
          <div className="text-[11px] text-[#585651] mt-0.5">
            Spread at instant t
          </div>
        </div>
      </div>

      {/* 6. Educational Interpretation Card */}
      <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-5 shadow-2xs space-y-3">
        <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-[#75736E]">
          <BookOpenIcon className="w-3.5 h-3.5 text-[#C85A32]" />
          <span>Understanding Realizations vs. Random Variables</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[#585651] leading-relaxed">
          <div className="p-3 bg-white rounded border border-[#E6E4DD]">
            <strong className="text-[#1A1917] block mb-1">Fixed Outcome ξ (Horizontal Trajectory):</strong>
            Holding the random outcome <MathView math="\xi = \xi_i" /> constant yields a deterministic function of time <MathView math="x_i(t)" />. This is what an oscilloscope traces when measuring a single hardware channel over time.
          </div>
          <div className="p-3 bg-white rounded border border-[#E6E4DD]">
            <strong className="text-[#1A1917] block mb-1">Fixed Time Instant t (Vertical Slice):</strong>
            Holding time <MathView math="t = t_0" /> constant yields a standard random variable <MathView math="X(t_0)" /> whose values across realizations follow a probability distribution (PDF/CDF).
          </div>
        </div>
      </div>
    </div>
  );
};

function BookOpenIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}
