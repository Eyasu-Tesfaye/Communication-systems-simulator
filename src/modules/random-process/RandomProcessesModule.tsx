/**
 * Module 03: Random Processes Workspace
 * Dedicated Educational Simulation & Analysis Workspace
 *
 * Strict Curricular Scope (5 Assigned Academic Areas):
 * 1. Random Processes and Sample Realizations
 * 2. Ensemble and Time-Average Analysis
 * 3. Mean and Variance Over Time
 * 4. Strict-Sense Stationarity (SSS) and Wide-Sense Stationarity (WSS) Tests
 * 5. Ergodicity and Autocorrelation Analysis
 * + Dedicated Documented Assumptions and Results Area
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
  ChevronDown,
  Sparkles,
  Check,
} from 'lucide-react';

import { PlaybackState, SimulationToolbar } from '../../components/SimulationToolbar';
import {
  ProcessType,
  ProcessParams,
  DEFAULT_PROCESS_PARAMS,
  PROCESS_CATALOG,
  generateEnsembleSimulation,
  computeAutocorrelation,
  evaluateStationarity,
  getInstantaneousStats,
} from './randomProcessEngine';

import { RandomProcessVisualizer } from './RandomProcessVisualizer';
import { SampleRealizationsPanel } from './components/SampleRealizationsPanel';
import { EnsembleTimeAveragePanel } from './components/EnsembleTimeAveragePanel';
import { MeanVariancePanel } from './components/MeanVariancePanel';
import { StationarityPanel } from './components/StationarityPanel';
import { ErgodicityAutocorrPanel } from './components/ErgodicityAutocorrPanel';
import { DocumentedReportPanel } from './components/DocumentedReportPanel';

export type AcademicAreaId =
  | 'realizations'
  | 'ensemble_time'
  | 'mean_variance'
  | 'stationarity'
  | 'ergodicity_autocorr';

interface AreaConfig {
  id: AcademicAreaId;
  index: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ACADEMIC_AREAS: AreaConfig[] = [
  {
    id: 'realizations',
    index: '01',
    label: 'Random Processes & Sample Realizations',
    description: 'Individual paths, ensemble family & cross-sectional spread',
    icon: Sparkles,
  },
  {
    id: 'ensemble_time',
    index: '02',
    label: 'Ensemble & Time-Average Analysis',
    description: 'Averaging across realizations vs. averaging across time',
    icon: Layers,
  },
  {
    id: 'mean_variance',
    index: '03',
    label: 'Mean & Variance Over Time',
    description: 'Temporal dynamics of μ̂_X(t) and σ̂_X²(t) vs. theory',
    icon: Activity,
  },
  {
    id: 'stationarity',
    index: '04',
    label: 'SSS & WSS Stationarity Tests',
    description: 'Strict & wide-sense tests, shift invariance & caveats',
    icon: ShieldCheck,
  },
  {
    id: 'ergodicity_autocorr',
    index: '05',
    label: 'Ergodicity & Autocorrelation',
    description: 'Time vs. ensemble averages and R_XX(τ) lag correlation',
    icon: GitBranch,
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

export default function RandomProcessesModule(_props: RandomProcessesModuleProps) {
  // Active Academic Section (1 of 5 assigned areas) + Documentation Toggle
  const [activeArea, setActiveArea] = useState<AcademicAreaId>('realizations');
  const [isDocsOpen, setIsDocsOpen] = useState<boolean>(false);
  const [isAreaDropdownOpen, setIsAreaDropdownOpen] = useState<boolean>(false);

  // Stochastic Parameters
  const [params, setParams] = useState<ProcessParams>(DEFAULT_PROCESS_PARAMS);

  // Playback & Animation State
  const [playbackState, setPlaybackState] = useState<PlaybackState>('playing');
  const [speed, setSpeed] = useState<string>('1×');
  const [simTime, setSimTime] = useState<number>(1.5);
  const [selectedRealizationIndex, setSelectedRealizationIndex] = useState<number>(0);

  // Visualizer Layer Checkboxes
  const [isGridVisible, setIsGridVisible] = useState<boolean>(true);
  const [showEnvelope, setShowEnvelope] = useState<boolean>(true);
  const [showMeanCurve, setShowMeanCurve] = useState<boolean>(true);
  const [showAllRealizations, setShowAllRealizations] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const animFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Clamp selected realization index when realizationCount decreases
  useEffect(() => {
    if (selectedRealizationIndex >= params.realizationCount) {
      setSelectedRealizationIndex(Math.max(0, params.realizationCount - 1));
    }
  }, [params.realizationCount, selectedRealizationIndex]);

  // Handle ESC for fullscreen & dropdown
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isAreaDropdownOpen) setIsAreaDropdownOpen(false);
        else if (isFullscreen) setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, isAreaDropdownOpen]);

  // Lock body scroll during fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isAreaDropdownOpen) return;
    const handleOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsAreaDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [isAreaDropdownOpen]);

  // Generate Simulation Ensemble Data
  const simulation = useMemo(() => generateEnsembleSimulation(params), [params]);

  // Calculate Autocorrelation
  const autocorr = useMemo(
    () => computeAutocorrelation(simulation, selectedRealizationIndex, 0.35),
    [simulation, selectedRealizationIndex]
  );

  // Calculate Stationarity Diagnostics
  const stationarity = useMemo(
    () => evaluateStationarity(simulation, autocorr),
    [simulation, autocorr]
  );

  // Live instantaneous stats for control panel telemetry
  const liveStats = useMemo(
    () => getInstantaneousStats(simulation, simTime, selectedRealizationIndex),
    [simulation, simTime, selectedRealizationIndex]
  );

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
        const next = prevTime + deltaSec * speedMultiplier;
        return next >= tMax ? 0 : next;
      });

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [playbackState, speed, params.tMax]);

  // Playback & Parameter Handlers
  const handlePlay = useCallback(() => setPlaybackState('playing'), []);
  const handlePause = useCallback(() => setPlaybackState('paused'), []);
  const handleReset = useCallback(() => {
    setPlaybackState('paused');
    setSimTime(0);
  }, []);

  const handleReseed = useCallback(() => {
    setParams((prev) => ({ ...prev, seed: prev.seed + 17 }));
  }, []);

  const handleChangeParams = useCallback((newParams: Partial<ProcessParams>) => {
    setParams((prev) => ({ ...prev, ...newParams }));
  }, []);

  const currentMeta = PROCESS_CATALOG[params.type];
  const currentAreaConfig =
    ACADEMIC_AREAS.find((a) => a.id === activeArea) || ACADEMIC_AREAS[0];
  const ActiveAreaIcon = currentAreaConfig.icon;

  // Reusable Dropdown Navigation Component (5 Assigned Academic Areas)
  const renderAreaDropdown = (attachRef: boolean) => (
    <div className="relative" ref={attachRef ? dropdownRef : undefined}>
      <button
        type="button"
        onClick={() => setIsAreaDropdownOpen((prev) => !prev)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg bg-white border border-[#E6E4DD] hover:border-[#C85A32]/60 text-[#1A1917] text-xs shadow-2xs transition-colors cursor-pointer min-w-[230px] justify-between"
        aria-haspopup="listbox"
        aria-expanded={isAreaDropdownOpen}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-1 rounded bg-[#FBF4F0] text-[#C85A32] shrink-0">
            <ActiveAreaIcon className="w-3.5 h-3.5" />
          </span>
          <div className="text-left min-w-0">
            <div className="text-[9.5px] text-[#75736E] uppercase font-mono tracking-wider font-semibold leading-none">
              Analysis Area {currentAreaConfig.index}/05
            </div>
            <div className="font-bold text-[#1A1917] truncate leading-tight mt-0.5">
              {currentAreaConfig.label}
            </div>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-[#8A8882] transition-transform duration-150 shrink-0 ${
            isAreaDropdownOpen ? 'rotate-180 text-[#C85A32]' : ''
          }`}
        />
      </button>

      {isAreaDropdownOpen && (
        <div
          role="listbox"
          aria-label="Select Module 03 analysis area"
          className="absolute right-0 mt-1.5 w-80 bg-white rounded-lg border border-[#E6E4DD] shadow-lg p-1.5 z-50 space-y-1"
        >
          {ACADEMIC_AREAS.map((area) => {
            const Icon = area.icon;
            const isSelected = activeArea === area.id && !isDocsOpen;
            return (
              <button
                key={area.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  setActiveArea(area.id);
                  setIsDocsOpen(false);
                  setIsAreaDropdownOpen(false);
                }}
                className={`w-full flex items-start gap-2.5 p-2 rounded-md text-left transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#FBF4F0] text-[#C85A32]'
                    : 'hover:bg-[#FAF9F6] text-[#585651] hover:text-[#1A1917]'
                }`}
              >
                <Icon
                  className={`w-4 h-4 mt-0.5 shrink-0 ${
                    isSelected ? 'text-[#C85A32]' : 'text-[#8A8882]'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 text-xs font-semibold">
                    <span className="truncate">
                      {area.index}. {area.label}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#C85A32] shrink-0" />}
                  </div>
                  <div className="text-[11px] text-[#75736E] leading-snug mt-0.5">
                    {area.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  // Reusable Sticky / Side Control Panel
  const renderControlPanel = () => (
    <aside
      aria-label="Random process simulation controls"
      className="bg-[#FAF9F6] border border-[#E6E4DD] rounded-lg p-4 space-y-4"
    >
      {/* 1. Process Selection */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-[#C85A32]" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#1A1917]">
              Process Model
            </span>
          </div>
          <span
            className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
              currentMeta.isWss
                ? 'bg-[#10B981]/10 text-[#059669] border-[#10B981]/30'
                : 'bg-[#C85A32]/10 text-[#C85A32] border-[#C85A32]/30'
            }`}
          >
            {currentMeta.isWss ? 'Stationary' : 'Non-Stationary'}
          </span>
        </div>

        <select
          aria-label="Select random process model"
          value={params.type}
          onChange={(e) => handleChangeParams({ type: e.target.value as ProcessType })}
          className="w-full bg-white border border-[#E6E4DD] rounded-md px-2.5 py-2 text-xs font-semibold text-[#1A1917] focus:outline-none focus:ring-1 focus:ring-[#C85A32] cursor-pointer"
        >
          {(Object.keys(PROCESS_CATALOG) as ProcessType[]).map((key) => (
            <option key={key} value={key}>
              {PROCESS_CATALOG[key].shortName}
            </option>
          ))}
        </select>

        <p className="text-[11px] text-[#585651] leading-snug">
          {currentMeta.description}
        </p>

        <button
          type="button"
          onClick={handleReseed}
          className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-mono font-bold text-white bg-[#C85A32] hover:bg-[#B54E28] rounded-md shadow-2xs transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Generate New Realizations</span>
        </button>
      </div>

      {/* 2. Simulation & Stochastic Parameters */}
      <div className="pt-3 border-t border-[#E6E4DD] space-y-3 text-xs">
        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#75736E]">
          Ensemble & Signal Parameters
        </div>

        {/* Number of Realizations M */}
        <div>
          <div className="flex justify-between font-mono mb-1">
            <label htmlFor="rp-m-slider" className="text-[#585651]">
              Realizations (M):
            </label>
            <strong className="text-[#C85A32] tabular-nums">{params.realizationCount}</strong>
          </div>
          <input
            id="rp-m-slider"
            type="range"
            min="3"
            max="20"
            step="1"
            value={params.realizationCount}
            onChange={(e) =>
              handleChangeParams({ realizationCount: parseInt(e.target.value, 10) })
            }
            className="w-full accent-[#C85A32] cursor-pointer"
          />
        </div>

        {/* Number of Samples N */}
        <div>
          <div className="flex justify-between font-mono mb-1">
            <label htmlFor="rp-n-slider" className="text-[#585651]">
              Samples (N):
            </label>
            <strong className="text-[#C85A32] tabular-nums">
              {params.sampleCount} (Δt={simulation.dt.toFixed(3)}s)
            </strong>
          </div>
          <input
            id="rp-n-slider"
            type="range"
            min="80"
            max="300"
            step="20"
            value={params.sampleCount}
            onChange={(e) =>
              handleChangeParams({ sampleCount: parseInt(e.target.value, 10) })
            }
            className="w-full accent-[#C85A32] cursor-pointer"
          />
        </div>

        {/* Signal Amplitude A */}
        <div className={!currentMeta.usesAmplitude ? 'opacity-45' : ''}>
          <div className="flex justify-between font-mono mb-1">
            <label htmlFor="rp-amp-slider" className="text-[#585651]">
              Signal Amplitude (A):
            </label>
            <strong className="text-[#C85A32] tabular-nums">
              {currentMeta.usesAmplitude ? `${params.amplitude.toFixed(1)} V` : 'N/A (AWGN)'}
            </strong>
          </div>
          <input
            id="rp-amp-slider"
            type="range"
            min="0.5"
            max="3.0"
            step="0.1"
            disabled={!currentMeta.usesAmplitude}
            value={params.amplitude}
            onChange={(e) =>
              handleChangeParams({ amplitude: parseFloat(e.target.value) })
            }
            className="w-full accent-[#C85A32] cursor-pointer disabled:cursor-not-allowed"
          />
        </div>

        {/* Noise Std Dev sigma */}
        <div>
          <div className="flex justify-between font-mono mb-1">
            <label htmlFor="rp-noise-slider" className="text-[#585651]">
              Noise Std (σ):
            </label>
            <strong className="text-[#C85A32] tabular-nums">{params.noiseStd.toFixed(2)} V</strong>
          </div>
          <input
            id="rp-noise-slider"
            type="range"
            min="0.1"
            max="1.2"
            step="0.05"
            value={params.noiseStd}
            onChange={(e) =>
              handleChangeParams({ noiseStd: parseFloat(e.target.value) })
            }
            className="w-full accent-[#C85A32] cursor-pointer"
          />
        </div>

        {/* Characteristic Frequency f0 */}
        <div className={!currentMeta.usesFrequency ? 'opacity-45' : ''}>
          <div className="flex justify-between font-mono mb-1">
            <label htmlFor="rp-freq-slider" className="text-[#585651]">
              Frequency / BW (f₀):
            </label>
            <strong className="text-[#C85A32] tabular-nums">
              {currentMeta.usesFrequency ? `${params.frequency.toFixed(1)} Hz` : 'Flat'}
            </strong>
          </div>
          <input
            id="rp-freq-slider"
            type="range"
            min="0.2"
            max="2.0"
            step="0.1"
            disabled={!currentMeta.usesFrequency}
            value={params.frequency}
            onChange={(e) =>
              handleChangeParams({ frequency: parseFloat(e.target.value) })
            }
            className="w-full accent-[#C85A32] cursor-pointer disabled:cursor-not-allowed"
          />
        </div>

        {/* Non-Stationary Drift Rate */}
        {currentMeta.usesDriftRate && (
          <div>
            <div className="flex justify-between font-mono mb-1">
              <label htmlFor="rp-drift-slider" className="text-[#585651]">
                Mean Drift Intensity (d):
              </label>
              <strong className="text-[#C85A32] tabular-nums">{params.driftRate.toFixed(1)}</strong>
            </div>
            <input
              id="rp-drift-slider"
              type="range"
              min="0.2"
              max="2.0"
              step="0.1"
              value={params.driftRate}
              onChange={(e) =>
                handleChangeParams({ driftRate: parseFloat(e.target.value) })
              }
              className="w-full accent-[#C85A32] cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* 3. Time Selection & Realization Selection */}
      <div className="pt-3 border-t border-[#E6E4DD] space-y-2.5 text-xs">
        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#75736E]">
          Time & Path Inspection
        </div>

        <div>
          <div className="flex justify-between font-mono mb-1">
            <label htmlFor="rp-time-slider" className="text-[#585651]">
              Selected Time (t):
            </label>
            <strong className="text-[#1A1917] tabular-nums">{simTime.toFixed(2)} s</strong>
          </div>
          <input
            id="rp-time-slider"
            type="range"
            min="0"
            max={params.tMax}
            step="0.05"
            value={simTime}
            onChange={(e) => setSimTime(parseFloat(e.target.value))}
            className="w-full accent-[#C85A32] cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-between gap-2 font-mono">
          <label htmlFor="rp-path-select" className="text-[#585651]">
            Inspect Path:
          </label>
          <select
            id="rp-path-select"
            value={selectedRealizationIndex}
            onChange={(e) => setSelectedRealizationIndex(parseInt(e.target.value, 10))}
            className="bg-white border border-[#E6E4DD] rounded px-2 py-1 text-xs font-bold text-[#1A1917] focus:outline-none focus:ring-1 focus:ring-[#C85A32] cursor-pointer"
          >
            {Array.from({ length: params.realizationCount }).map((_, idx) => (
              <option key={idx} value={idx}>
                Realization X^({idx + 1})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 4. Display Checkboxes */}
      <div className="pt-3 border-t border-[#E6E4DD] space-y-2 text-xs">
        <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#75736E]">
          Plot Layers
        </div>

        <label className="flex items-center gap-2 text-[#585651] hover:text-[#1A1917] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showAllRealizations}
            onChange={(e) => setShowAllRealizations(e.target.checked)}
            className="w-3.5 h-3.5 rounded accent-[#C85A32] cursor-pointer"
          />
          <span>Show all realizations (1..{params.realizationCount})</span>
        </label>

        <label className="flex items-center gap-2 text-[#585651] hover:text-[#1A1917] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showMeanCurve}
            onChange={(e) => setShowMeanCurve(e.target.checked)}
            className="w-3.5 h-3.5 rounded accent-[#C85A32] cursor-pointer"
          />
          <span>Show ensemble mean μ̂(t)</span>
        </label>

        <label className="flex items-center gap-2 text-[#585651] hover:text-[#1A1917] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={showEnvelope}
            onChange={(e) => setShowEnvelope(e.target.checked)}
            className="w-3.5 h-3.5 rounded accent-[#C85A32] cursor-pointer"
          />
          <span>Show ±1σ̂ envelope</span>
        </label>
      </div>

      {/* 5. Compact Live Telemetry Summary */}
      <div className="pt-3 border-t border-[#E6E4DD]">
        <div className="bg-white rounded-md border border-[#E6E4DD] p-2.5 space-y-1 text-[11px] font-mono">
          <div className="flex justify-between text-[#75736E]">
            <span>X<sup>({liveStats.selectedRealizationIndex + 1})</sup>({liveStats.simTime.toFixed(2)}s):</span>
            <strong className="text-[#1A1917] tabular-nums">
              {liveStats.selectedAmplitude >= 0 ? '+' : ''}{liveStats.selectedAmplitude.toFixed(3)} V
            </strong>
          </div>
          <div className="flex justify-between text-[#75736E]">
            <span>Ensemble Mean μ̂(t):</span>
            <strong className="text-[#1A1917] tabular-nums">
              {liveStats.ensembleMean >= 0 ? '+' : ''}{liveStats.ensembleMean.toFixed(3)} V
            </strong>
          </div>
          <div className="flex justify-between text-[#75736E]">
            <span>Ensemble Var σ̂²(t):</span>
            <strong className="text-[#C85A32] tabular-nums">
              {liveStats.ensembleVariance.toFixed(3)} V²
            </strong>
          </div>
        </div>
      </div>
    </aside>
  );

  // Active Analysis Section Body
  const renderActiveAnalysisSection = () => {
    if (isDocsOpen) {
      return (
        <DocumentedReportPanel
          simulation={simulation}
          simTime={simTime}
          selectedRealizationIndex={selectedRealizationIndex}
          autocorr={autocorr}
          stationarity={stationarity}
        />
      );
    }

    switch (activeArea) {
      case 'realizations':
        return (
          <SampleRealizationsPanel
            simulation={simulation}
            simTime={simTime}
            onSeekTime={setSimTime}
            selectedRealizationIndex={selectedRealizationIndex}
            onSelectRealization={setSelectedRealizationIndex}
          />
        );
      case 'ensemble_time':
        return (
          <EnsembleTimeAveragePanel
            simulation={simulation}
            simTime={simTime}
            onSeekTime={setSimTime}
            selectedRealizationIndex={selectedRealizationIndex}
            onSelectRealization={setSelectedRealizationIndex}
          />
        );
      case 'mean_variance':
        return (
          <MeanVariancePanel
            simulation={simulation}
            stationarity={stationarity}
            simTime={simTime}
            onSeekTime={setSimTime}
            selectedRealizationIndex={selectedRealizationIndex}
          />
        );
      case 'stationarity':
        return (
          <StationarityPanel
            simulation={simulation}
            autocorr={autocorr}
            stationarity={stationarity}
            onSelectProcessType={(type) => handleChangeParams({ type })}
          />
        );
      case 'ergodicity_autocorr':
        return (
          <ErgodicityAutocorrPanel
            simulation={simulation}
            autocorr={autocorr}
            selectedRealizationIndex={selectedRealizationIndex}
            onSelectRealization={setSelectedRealizationIndex}
          />
        );
    }
  };

  return (
    <div className="w-full space-y-5">
      {/* 1. Compact Header Banner with Dropdown Navigation (5 Academic Areas) + Docs Toggle */}
      <div className="pb-4 border-b border-[#E6E4DD] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-mono font-bold tracking-wider text-[#C85A32] bg-[#FBF4F0] px-2.5 py-0.5 rounded border border-[#C85A32]/20">
              MODULE 03
            </span>
            <span className="text-xs text-[#75736E] font-medium">
              Random Process Analysis Workspace
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1917]">
            Random Processes
          </h1>
          <p className="mt-1 text-sm text-[#585651] max-w-2xl leading-relaxed">
            Explore sample realizations, ensemble vs. time averages, mean &amp; variance dynamics, SSS/WSS stationarity, ergodicity, and autocorrelation with live documented assumptions.
          </p>
        </div>

        {/* Navigation Controls: 5-Area Dropdown + Documentation & Assumptions Tab */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {renderAreaDropdown(!isFullscreen)}

          <button
            type="button"
            onClick={() => setIsDocsOpen((prev) => !prev)}
            aria-pressed={isDocsOpen}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-mono font-semibold border transition-colors cursor-pointer shadow-2xs ${
              isDocsOpen
                ? 'bg-[#1A1917] text-white border-[#1A1917]'
                : 'bg-white text-[#585651] border-[#E6E4DD] hover:text-[#1A1917] hover:bg-[#FAF9F6]'
            }`}
          >
            <FileText className={`w-3.5 h-3.5 ${isDocsOpen ? 'text-[#C85A32]' : 'text-[#75736E]'}`} />
            <span>Documentation &amp; Assumptions</span>
          </button>
        </div>
      </div>

      {/* 2. Side-by-Side Workspace (Sticky Control Panel Left + Visualizations & Results Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Sticky Control Panel */}
        <div className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-4">
          {renderControlPanel()}
        </div>

        {/* Right Visualization & Active Analysis Stage */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-4 min-w-0">
          {/* Standard Signal Lab Simulation Toolbar */}
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

          {/* Primary Ensemble Waveform Viewport (Always visible unless viewing full Docs tab) */}
          {!isDocsOpen && (
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
              heightClass="min-h-[340px]"
            />
          )}

          {/* Active Academic Area Header Indicator */}
          {!isDocsOpen && (
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-bold text-[#C85A32] bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/20">
                  SECTION {currentAreaConfig.index} / 05
                </span>
                <h2 className="text-sm sm:text-base font-bold text-[#1A1917]">
                  {currentAreaConfig.label}
                </h2>
              </div>
              <span className="text-[11px] font-mono text-[#75736E]">
                {currentAreaConfig.description}
              </span>
            </div>
          )}

          {/* Active Academic Area Content */}
          <main>{renderActiveAnalysisSection()}</main>

          {/* Bottom Documentation & Assumptions Summary (Always available at bottom when in Lab view) */}
          {!isDocsOpen && (
            <section className="pt-4 border-t border-[#E6E4DD]">
              <DocumentedReportPanel
                simulation={simulation}
                simTime={simTime}
                selectedRealizationIndex={selectedRealizationIndex}
                autocorr={autocorr}
                stationarity={stationarity}
              />
            </section>
          )}
        </div>
      </div>

      {/* 3. Fullscreen Side-by-Side Workspace (No Unnecessary Scrolling, All Controls & Graphs Accessible) */}
      {isFullscreen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Module 03 Random Processes Fullscreen Workspace"
          className="fixed inset-0 z-50 bg-[#FAF9F6] flex flex-col overflow-hidden"
        >
          {/* Fullscreen Top Bar */}
          <div className="px-4 py-2.5 bg-white border-b border-[#E6E4DD] flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-mono font-bold text-[#C85A32] bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/20">
                MODULE 03
              </span>
              <span className="text-sm font-bold text-[#1A1917]">Random Processes</span>
              {renderAreaDropdown(isFullscreen)}
              <button
                type="button"
                onClick={() => setIsDocsOpen((prev) => !prev)}
                aria-pressed={isDocsOpen}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-mono font-semibold border transition-colors cursor-pointer ${
                  isDocsOpen
                    ? 'bg-[#1A1917] text-white border-[#1A1917]'
                    : 'bg-white text-[#585651] border-[#E6E4DD] hover:text-[#1A1917]'
                }`}
              >
                <FileText className="w-3.5 h-3.5 text-[#C85A32]" />
                <span>Docs &amp; Assumptions</span>
              </button>
            </div>

            <SimulationToolbar
              playbackState={playbackState}
              onPlay={handlePlay}
              onPause={handlePause}
              onReset={handleReset}
              speed={speed}
              onSpeedChange={setSpeed}
              isGridVisible={isGridVisible}
              onToggleGrid={() => setIsGridVisible(!isGridVisible)}
              isFullscreen={true}
              onToggleFullscreen={() => setIsFullscreen(false)}
              isLiveSimulationReady={true}
              className="shrink-0"
            />
          </div>

          {/* Fullscreen Split Body */}
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-3 p-3 overflow-y-auto lg:overflow-hidden">
            {/* Left Scrollable Controls Column */}
            <div className="lg:col-span-3 lg:h-full lg:overflow-y-auto lg:pr-1">
              {renderControlPanel()}
            </div>

            {/* Right Scrollable Visualization & Analysis Column */}
            <div className="lg:col-span-9 lg:h-full lg:overflow-y-auto space-y-3 lg:pr-1">
              {!isDocsOpen && (
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
                  heightClass="min-h-[300px]"
                />
              )}
              {renderActiveAnalysisSection()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
