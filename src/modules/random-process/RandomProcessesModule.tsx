/**
 * Module 03: Random Processes Workspace
 * Dedicated Educational Simulation & Analysis Workspace
 *
 * Strict Curricular Scope:
 * 1. Random Processes and Sample Realizations
 * 2. Ensemble and Time-Average Analysis
 * 3. Mean and Variance Over Time
 * 4. Strict-Sense Stationarity (SSS) and Wide-Sense Stationarity (WSS) Tests
 * 5. Ergodicity and Autocorrelation Analysis
 * 6. Dedicated Documented Assumptions and Results Area
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Sliders,
  Layers,
  Activity,
  ShieldCheck,
  RefreshCw,
  GitBranch,
  FileText,
  Maximize2,
  Minimize2,
  Sparkles,
  BookOpen,
} from 'lucide-react';

import { PlaybackState, SimulationToolbar } from '../../components/SimulationToolbar';
import { MathView } from '../../components/MathView';
import {
  ProcessType,
  ProcessParams,
  DEFAULT_PROCESS_PARAMS,
  PROCESS_CATALOG,
  generateEnsembleSimulation,
  computeAutocorrelation,
  evaluateStationarity,
} from './randomProcessEngine';

import { RandomProcessVisualizer } from './RandomProcessVisualizer';
import { EnsembleTimeAveragePanel } from './components/EnsembleTimeAveragePanel';
import { MeanVariancePanel } from './components/MeanVariancePanel';
import { StationarityPanel } from './components/StationarityPanel';
import { ErgodicityAutocorrPanel } from './components/ErgodicityAutocorrPanel';
import { DocumentedReportPanel } from './components/DocumentedReportPanel';

export type WorkspaceTab =
  | 'averages'
  | 'mean_var'
  | 'stationarity'
  | 'ergodicity_autocorr'
  | 'documented_report';

interface TabConfig {
  id: WorkspaceTab;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}

const WORKSPACE_TABS: TabConfig[] = [
  {
    id: 'averages',
    label: 'Realizations & Ensemble vs. Time-Average',
    shortLabel: '1. Ensemble & Time Averages',
    icon: Layers,
  },
  {
    id: 'mean_var',
    label: 'Mean and Variance Over Time',
    shortLabel: '2. Mean & Variance',
    icon: Activity,
  },
  {
    id: 'stationarity',
    label: 'Stationarity Tests (SSS & WSS)',
    shortLabel: '3. Stationarity Tests',
    icon: ShieldCheck,
  },
  {
    id: 'ergodicity_autocorr',
    label: 'Ergodicity & Autocorrelation',
    shortLabel: '4. Ergodicity & Autocorr',
    icon: GitBranch,
  },
  {
    id: 'documented_report',
    label: 'Documented Assumptions & Results',
    shortLabel: '5. Documented Report',
    icon: FileText,
  },
];

const SPEED_FACTORS: Record<string, number> = {
  '0.25×': 0.25,
  '0.5×': 0.5,
  '1×': 1.0,
  '2×': 2.0,
  '4×': 4.0,
};

interface RandomProcessesModuleProps {
  onNavigateHome?: () => void;
  onNavigateModule?: (pathOrNum: string | number) => void;
  isInstructorMode?: boolean;
}

export default function RandomProcessesModule({
  onNavigateHome,
  onNavigateModule,
  isInstructorMode = false,
}: RandomProcessesModuleProps) {
  // Navigation Tab State
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('averages');

  // Stochastic Parameters
  const [params, setParams] = useState<ProcessParams>(DEFAULT_PROCESS_PARAMS);

  // Playback & Animation State
  const [playbackState, setPlaybackState] = useState<PlaybackState>('playing');
  const [speed, setSpeed] = useState<string>('1×');
  const [simTime, setSimTime] = useState<number>(1.5);
  const [selectedRealizationIndex, setSelectedRealizationIndex] = useState<number>(0);

  // Visualizer Layer Toggles
  const [isGridVisible, setIsGridVisible] = useState<boolean>(true);
  const [showEnvelope, setShowEnvelope] = useState<boolean>(true);
  const [showMeanCurve, setShowMeanCurve] = useState<boolean>(true);
  const [showAllRealizations, setShowAllRealizations] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isConfigExpanded, setIsConfigExpanded] = useState<boolean>(false);

  const animFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Handle ESC for fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Generate Simulation Ensemble Data
  const simulation = useMemo(() => {
    return generateEnsembleSimulation(params);
  }, [params]);

  // Calculate Autocorrelation
  const autocorr = useMemo(() => {
    return computeAutocorrelation(simulation, selectedRealizationIndex, 0.45);
  }, [simulation, selectedRealizationIndex]);

  // Calculate Stationarity Diagnostics
  const stationarity = useMemo(() => {
    return evaluateStationarity(simulation, autocorr);
  }, [simulation, autocorr]);

  // Synchronized Animation Loop
  useEffect(() => {
    if (playbackState !== 'playing') {
      lastTimestampRef.current = null;
      return;
    }

    const speedMultiplier = SPEED_FACTORS[speed] || 1.0;
    const tMax = params.tMax;

    const tick = (timestamp: number) => {
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp;
      }
      const deltaSec = (timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;

      setSimTime((prevTime) => {
        let next = prevTime + deltaSec * speedMultiplier;
        if (next >= tMax) {
          next = 0; // Loop seamlessly
        }
        return next;
      });

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [playbackState, speed, params.tMax]);

  // Playback Control Handlers
  const handlePlay = useCallback(() => setPlaybackState('playing'), []);
  const handlePause = useCallback(() => setPlaybackState('paused'), []);
  const handleReset = useCallback(() => {
    setPlaybackState('paused');
    setSimTime(0);
  }, []);

  const handleReseed = useCallback(() => {
    setParams((prev) => ({ ...prev, seed: prev.seed + 13 }));
  }, []);

  const handleChangeParams = useCallback((newParams: Partial<ProcessParams>) => {
    setParams((prev) => ({ ...prev, ...newParams }));
  }, []);

  const currentMeta = PROCESS_CATALOG[params.type];

  return (
    <div
      ref={containerRef}
      className={`w-full ${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-white overflow-y-auto p-4 sm:p-6'
          : ''
      }`}
    >
      {/* 1. Header Banner */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-[#E6E4DD]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono font-bold tracking-wider text-[#C85A32] bg-[#FBF4F0] px-2.5 py-0.5 rounded border border-[#C85A32]/20">
              MODULE 03
            </span>
            <span className="text-xs text-[#75736E] font-medium">
              Stationarity, Ergodicity & Statistical Averages
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1917]">
            Module 03 — Random Processes
          </h1>
          <p className="mt-1.5 text-sm sm:text-base text-[#585651] max-w-3xl leading-relaxed">
            Stochastic process ensemble generation, individual sample paths, ensemble vs. time averages, mean & variance dynamics, strict and wide-sense stationarity tests, ergodicity, autocorrelation, and documented engineering analysis.
          </p>
        </div>

        {/* Global Toolbar Header Actions */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleReseed}
            title="Generate new realizations with new random seed"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold text-[#585651] hover:text-[#1A1917] bg-white border border-[#E6E4DD] hover:border-[#8A8882] rounded-md shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#C85A32]" />
            <span>Generate New Realizations</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold text-[#585651] hover:text-[#1A1917] bg-white border border-[#E6E4DD] hover:border-[#8A8882] rounded-md shadow-2xs transition-colors cursor-pointer"
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-[#C85A32]" />
                <span>Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-[#C85A32]" />
                <span>Fullscreen</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2 text-xs font-mono text-[#585651] bg-[#FAF9F6] border border-[#E6E4DD] px-3 py-1.5 rounded-md">
            <span
              className={`w-2 h-2 rounded-full ${
                playbackState === 'playing' ? 'bg-[#10B981] animate-pulse' : 'bg-[#C85A32]'
              }`}
            />
            <span>
              Sim: <strong className="text-[#1A1917] capitalize">{playbackState}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* 2. Interactive Process Selector & Parameter Bar */}
      <div className="mb-6 p-4 bg-[#FAF9F6] border border-[#E6E4DD] rounded-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#C85A32]" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1917]">
              Random Process Selection:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(Object.keys(PROCESS_CATALOG) as ProcessType[]).map((typeKey) => {
              const meta = PROCESS_CATALOG[typeKey];
              const isSelected = params.type === typeKey;

              return (
                <button
                  key={typeKey}
                  type="button"
                  onClick={() => handleChangeParams({ type: typeKey })}
                  className={`px-3 py-1.5 rounded-md text-xs font-mono font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#C85A32] text-white shadow-2xs ring-1 ring-[#C85A32]'
                      : 'bg-white text-[#585651] border border-[#E6E4DD] hover:bg-[#F3F2EC]'
                  }`}
                >
                  {meta.shortName}
                </button>
              );
            })}
          </div>
        </div>

        {/* Parameter Sliders Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 pt-3 border-t border-[#E6E4DD]/70 text-xs">
          <div>
            <div className="flex justify-between font-mono mb-1">
              <span className="text-[#75736E]">Realizations (M):</span>
              <strong className="text-[#C85A32]">{params.realizationCount}</strong>
            </div>
            <input
              type="range"
              min="3"
              max="20"
              step="1"
              value={params.realizationCount}
              onChange={(e) => handleChangeParams({ realizationCount: parseInt(e.target.value, 10) })}
              className="w-full accent-[#C85A32] cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between font-mono mb-1">
              <span className="text-[#75736E]">Samples (N):</span>
              <strong className="text-[#C85A32]">{params.sampleCount}</strong>
            </div>
            <input
              type="range"
              min="80"
              max="300"
              step="20"
              value={params.sampleCount}
              onChange={(e) => handleChangeParams({ sampleCount: parseInt(e.target.value, 10) })}
              className="w-full accent-[#C85A32] cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between font-mono mb-1">
              <span className="text-[#75736E]">Amplitude (A):</span>
              <strong className="text-[#C85A32]">{params.amplitude.toFixed(1)} V</strong>
            </div>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              value={params.amplitude}
              onChange={(e) => handleChangeParams({ amplitude: parseFloat(e.target.value) })}
              className="w-full accent-[#C85A32] cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between font-mono mb-1">
              <span className="text-[#75736E]">Noise Std (σ):</span>
              <strong className="text-[#C85A32]">{params.noiseStd.toFixed(2)} V</strong>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.2"
              step="0.05"
              value={params.noiseStd}
              onChange={(e) => handleChangeParams({ noiseStd: parseFloat(e.target.value) })}
              className="w-full accent-[#C85A32] cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between font-mono mb-1">
              <span className="text-[#75736E]">Frequency (f₀):</span>
              <strong className="text-[#C85A32]">{params.frequency.toFixed(1)} Hz</strong>
            </div>
            <input
              type="range"
              min="0.2"
              max="2.0"
              step="0.1"
              value={params.frequency}
              onChange={(e) => handleChangeParams({ frequency: parseFloat(e.target.value) })}
              className="w-full accent-[#C85A32] cursor-pointer"
            />
          </div>
        </div>
      </div>

      {/* 3. Main Simulation Controls Toolbar & Waveform Visualizer */}
      <div className="space-y-3 mb-6">
        <SimulationToolbar
          playbackState={playbackState}
          onPlay={handlePlay}
          onPause={handlePause}
          onReset={handleReset}
          speed={speed}
          onSpeedChange={setSpeed}
          isGridVisible={isGridVisible}
          onToggleGrid={() => setIsGridVisible(!isGridVisible)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          isLiveSimulationReady={true}
        />

        <RandomProcessVisualizer
          simulation={simulation}
          simTime={simTime}
          onSeekTime={setSimTime}
          selectedRealizationIndex={selectedRealizationIndex}
          onSelectRealization={setSelectedRealizationIndex}
          showEnvelope={showEnvelope}
          showMeanCurve={showMeanCurve}
          showAllRealizations={showAllRealizations}
          isGridVisible={isGridVisible}
          heightClass="min-h-[420px]"
        />

        {/* Display Toggles */}
        <div className="p-3 bg-white rounded-lg border border-[#E6E4DD] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="font-mono text-[#75736E] text-[11px] font-semibold uppercase">
            Waveform Display Toggles:
          </div>
          <div className="flex flex-wrap items-center gap-2 font-mono">
            <button
              type="button"
              onClick={() => setShowAllRealizations(!showAllRealizations)}
              className={`px-2.5 py-1 rounded border text-xs transition-colors cursor-pointer ${
                showAllRealizations
                  ? 'bg-[#1A1917] text-white border-[#1A1917]'
                  : 'bg-white text-[#585651] border-[#E6E4DD] hover:bg-[#FAF9F6]'
              }`}
            >
              {showAllRealizations ? 'All Realizations (1..M)' : 'Single Realization'}
            </button>
            <button
              type="button"
              onClick={() => setShowMeanCurve(!showMeanCurve)}
              className={`px-2.5 py-1 rounded border text-xs transition-colors cursor-pointer ${
                showMeanCurve
                  ? 'bg-[#1A1917] text-white border-[#1A1917]'
                  : 'bg-white text-[#585651] border-[#E6E4DD] hover:bg-[#FAF9F6]'
              }`}
            >
              {showMeanCurve ? 'Hide Mean Curve' : 'Show Mean Curve'}
            </button>
            <button
              type="button"
              onClick={() => setShowEnvelope(!showEnvelope)}
              className={`px-2.5 py-1 rounded border text-xs transition-colors cursor-pointer ${
                showEnvelope
                  ? 'bg-[#C85A32] text-white border-[#C85A32]'
                  : 'bg-white text-[#585651] border-[#E6E4DD] hover:bg-[#FAF9F6]'
              }`}
            >
              {showEnvelope ? 'Hide ±1σ Envelope' : 'Show ±1σ Envelope'}
            </button>
          </div>
        </div>
      </div>

      {/* 4. Dedicated 5-Section Workspace Tabs */}
      <div className="mb-6">
        <div className="flex border-b border-[#E6E4DD] gap-1 overflow-x-auto">
          {WORKSPACE_TABS.map((tab) => {
            const isSelected = activeTab === tab.id;
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-3.5 text-xs font-mono font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                  isSelected
                    ? 'border-[#C85A32] text-[#C85A32] bg-[#FAF9F6]/60'
                    : 'border-transparent text-[#75736E] hover:text-[#1A1917] hover:bg-[#FAF9F6]/30'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-[#C85A32]' : 'text-[#8A8882]'}`} />
                <span>{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Active Analysis Panel View */}
      <main className="animate-in fade-in duration-100">
        {activeTab === 'averages' && (
          <EnsembleTimeAveragePanel
            simulation={simulation}
            simTime={simTime}
            onSeekTime={setSimTime}
            selectedRealizationIndex={selectedRealizationIndex}
            onSelectRealization={setSelectedRealizationIndex}
          />
        )}

        {activeTab === 'mean_var' && (
          <MeanVariancePanel
            simulation={simulation}
            simTime={simTime}
            onSeekTime={setSimTime}
            selectedRealizationIndex={selectedRealizationIndex}
          />
        )}

        {activeTab === 'stationarity' && (
          <StationarityPanel
            simulation={simulation}
            autocorr={autocorr}
            stationarity={stationarity}
          />
        )}

        {activeTab === 'ergodicity_autocorr' && (
          <ErgodicityAutocorrPanel
            simulation={simulation}
            autocorr={autocorr}
            selectedRealizationIndex={selectedRealizationIndex}
            onSelectRealization={setSelectedRealizationIndex}
          />
        )}

        {activeTab === 'documented_report' && (
          <DocumentedReportPanel
            simulation={simulation}
            simTime={simTime}
            selectedRealizationIndex={selectedRealizationIndex}
            autocorr={autocorr}
            stationarity={stationarity}
          />
        )}
      </main>
    </div>
  );
}
