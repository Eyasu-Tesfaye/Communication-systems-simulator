/**
 * Module: Random Processes & Statistical Properties
 * Unified Educational Stochastic Simulation & Statistical Analysis Workbench
 * 
 * 9 Core Interactive Sections:
 * 1. Random Process Generation
 * 2. Sample Realizations
 * 3. Probability Distribution Analysis (ProbStat Studio Integration)
 * 4. Ensemble Analysis
 * 5. Mean and Variance
 * 6. Stationarity Analysis (SSS and WSS)
 * 7. Ergodicity
 * 8. Autocorrelation
 * 9. Power Spectral Density (PSD)
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Sliders,
  Layers,
  BarChart3,
  Users,
  Activity,
  ShieldCheck,
  RefreshCw,
  GitBranch,
  Radio,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  BookOpen,
} from 'lucide-react';

import { PlaybackState } from '../../components/SimulationToolbar';
import {
  ProcessParams,
  DEFAULT_PROCESS_PARAMS,
  generateEnsembleSimulation,
} from './randomProcessEngine';

import { ProcessGenerationSection } from './sections/ProcessGenerationSection';
import { SampleRealizationsSection } from './sections/SampleRealizationsSection';
import { DistributionAnalysisSection } from './sections/DistributionAnalysisSection';
import { EnsembleAnalysisSection } from './sections/EnsembleAnalysisSection';
import { MeanVarianceSection } from './sections/MeanVarianceSection';
import { StationaritySection } from './sections/StationaritySection';
import { ErgodicitySection } from './sections/ErgodicitySection';
import { AutocorrelationSection } from './sections/AutocorrelationSection';
import { PsdSection } from './sections/PsdSection';

export type SectionId =
  | 'generation'
  | 'realizations'
  | 'distribution'
  | 'ensemble'
  | 'mean_var'
  | 'stationarity'
  | 'ergodicity'
  | 'autocorrelation'
  | 'psd';

interface SectionConfig {
  id: SectionId;
  num: string;
  title: string;
  shortTitle: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const SECTIONS: SectionConfig[] = [
  { id: 'generation', num: '01', title: 'Random Process Generation', shortTitle: '1. Generation', icon: Sliders },
  { id: 'realizations', num: '02', title: 'Sample Realizations', shortTitle: '2. Realizations', icon: Layers },
  { id: 'distribution', num: '03', title: 'Probability Distribution Analysis', shortTitle: '3. Distributions', icon: BarChart3 },
  { id: 'ensemble', num: '04', title: 'Ensemble Analysis', shortTitle: '4. Ensemble Slice', icon: Users },
  { id: 'mean_var', num: '05', title: 'Mean and Variance', shortTitle: '5. Mean & Var', icon: Activity },
  { id: 'stationarity', num: '06', title: 'Stationarity Analysis (SSS & WSS)', shortTitle: '6. Stationarity', icon: ShieldCheck },
  { id: 'ergodicity', num: '07', title: 'Ergodicity', shortTitle: '7. Ergodicity', icon: RefreshCw },
  { id: 'autocorrelation', num: '08', title: 'Autocorrelation', shortTitle: '8. Autocorrelation', icon: GitBranch },
  { id: 'psd', num: '09', title: 'Power Spectral Density (PSD)', shortTitle: '9. PSD Spectrum', icon: Radio },
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
  initialSection?: SectionId;
}

export default function RandomProcessesModule({
  onNavigateHome,
  onNavigateModule,
  isInstructorMode = false,
  initialSection = 'realizations',
}: RandomProcessesModuleProps) {
  // Navigation Section State
  const [activeSection, setActiveSection] = useState<SectionId>(initialSection);

  // Stochastic Process Parameters State
  const [params, setParams] = useState<ProcessParams>(DEFAULT_PROCESS_PARAMS);

  // Playback & Animation State
  const [playbackState, setPlaybackState] = useState<PlaybackState>('playing');
  const [speed, setSpeed] = useState<string>('1×');
  const [simTime, setSimTime] = useState<number>(1.5);
  const [selectedRealizationIndex, setSelectedRealizationIndex] = useState<number>(0);

  // View Options
  const [isGridVisible, setIsGridVisible] = useState<boolean>(true);
  const [showEnvelope, setShowEnvelope] = useState<boolean>(true);
  const [showMeanCurve, setShowMeanCurve] = useState<boolean>(true);
  const [showAllRealizations, setShowAllRealizations] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const animFrameRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);

  // Fullscreen container
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

  // Section Index for Prev/Next
  const currentSectionIndex = useMemo(() => {
    return SECTIONS.findIndex((s) => s.id === activeSection);
  }, [activeSection]);

  const handlePrevSection = () => {
    if (currentSectionIndex > 0) {
      setActiveSection(SECTIONS[currentSectionIndex - 1].id);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  };

  const handleNextSection = () => {
    if (currentSectionIndex < SECTIONS.length - 1) {
      setActiveSection(SECTIONS[currentSectionIndex + 1].id);
      window.scrollTo({ top: 120, behavior: 'smooth' });
    }
  };

  return (
    <div
      ref={containerRef}
      className={`w-full ${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-white overflow-y-auto p-4 sm:p-6'
          : ''
      }`}
    >
      {/* 1. Module Title & Context Banner */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-[#E6E4DD]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono font-bold tracking-wider text-[#C85A32] bg-[#FBF4F0] px-2.5 py-0.5 rounded border border-[#C85A32]/20">
              MODULE 03
            </span>
            <span className="text-xs text-[#75736E] font-medium">
              Unified Stochastic Systems & Statistical Properties
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1917]">
            Random Processes & Statistical Properties
          </h1>
          <p className="mt-1.5 text-sm sm:text-base text-[#585651] max-w-3xl leading-relaxed">
            Generate stochastic process ensembles, inspect individual sample paths, investigate probability distributions (PDF/CDF), evaluate strict and wide-sense stationarity, and verify ergodicity, autocorrelation, and power spectral density.
          </p>
        </div>

        {/* Global Toolbar Header Actions */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleReseed}
            title="Generate new stochastic sample seeds"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold text-[#585651] hover:text-[#1A1917] bg-white border border-[#E6E4DD] hover:border-[#8A8882] rounded-md shadow-2xs transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#C85A32]" />
            <span>Re-seed Process</span>
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

      {/* 2. Unified 9-Section Navigation Bar */}
      <nav aria-label="Random Processes & Statistical Properties Sections" className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#75736E] font-semibold">
            Module Curricular Sections (01–09)
          </div>

          {/* Prev / Next Section Quick Jump Buttons */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentSectionIndex === 0}
              onClick={handlePrevSection}
              className={`p-1.5 rounded border text-xs font-mono flex items-center gap-1 transition-colors ${
                currentSectionIndex === 0
                  ? 'border-[#E6E4DD] text-[#A8A69E] cursor-not-allowed'
                  : 'bg-white border-[#E6E4DD] text-[#1A1917] hover:bg-[#FAF9F6] cursor-pointer'
              }`}
              title="Previous section"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Prev</span>
            </button>

            <span className="text-xs font-mono text-[#75736E] px-1">
              {currentSectionIndex + 1} / {SECTIONS.length}
            </span>

            <button
              type="button"
              disabled={currentSectionIndex === SECTIONS.length - 1}
              onClick={handleNextSection}
              className={`p-1.5 rounded border text-xs font-mono flex items-center gap-1 transition-colors ${
                currentSectionIndex === SECTIONS.length - 1
                  ? 'border-[#E6E4DD] text-[#A8A69E] cursor-not-allowed'
                  : 'bg-white border-[#E6E4DD] text-[#1A1917] hover:bg-[#FAF9F6] cursor-pointer'
              }`}
              title="Next section"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Scrollable Section Strip */}
        <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-1.5 p-1.5 bg-[#FAF9F6] border border-[#E6E4DD] rounded-lg">
          {SECTIONS.map((sec) => {
            const isSelected = activeSection === sec.id;
            const Icon = sec.icon;

            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => setActiveSection(sec.id)}
                className={`py-2 px-2 rounded-md text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-white text-[#C85A32] border border-[#C85A32]/40 shadow-xs ring-1 ring-[#C85A32]/25'
                    : 'text-[#585651] hover:text-[#1A1917] hover:bg-white/70'
                }`}
                title={sec.title}
              >
                <div className="flex items-center justify-between w-full mb-1">
                  <span
                    className={`text-[9px] font-mono font-bold px-1 rounded ${
                      isSelected ? 'bg-[#FBF4F0] text-[#C85A32]' : 'text-[#8A8882]'
                    }`}
                  >
                    {sec.num}
                  </span>
                  <Icon
                    className={`w-3.5 h-3.5 ${
                      isSelected ? 'text-[#C85A32]' : 'text-[#8A8882]'
                    }`}
                  />
                </div>
                <span className="text-[11px] font-bold font-sans tracking-tight truncate block leading-tight">
                  {sec.shortTitle.replace(/^\d+\.\s*/, '')}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* 3. Active Section Stage */}
      <main className="animate-in fade-in duration-100 pb-12">
        {activeSection === 'generation' && (
          <ProcessGenerationSection
            params={params}
            onChangeParams={handleChangeParams}
            onReseed={handleReseed}
          />
        )}

        {activeSection === 'realizations' && (
          <SampleRealizationsSection
            simulation={simulation}
            simTime={simTime}
            onSeekTime={setSimTime}
            playbackState={playbackState}
            onPlay={handlePlay}
            onPause={handlePause}
            onReset={handleReset}
            speed={speed}
            onSpeedChange={setSpeed}
            isGridVisible={isGridVisible}
            onToggleGrid={() => setIsGridVisible(!isGridVisible)}
            selectedRealizationIndex={selectedRealizationIndex}
            onSelectRealization={setSelectedRealizationIndex}
            showEnvelope={showEnvelope}
            onToggleEnvelope={() => setShowEnvelope(!showEnvelope)}
            showMeanCurve={showMeanCurve}
            onToggleMeanCurve={() => setShowMeanCurve(!showMeanCurve)}
            showAllRealizations={showAllRealizations}
            onToggleAllRealizations={() => setShowAllRealizations(!showAllRealizations)}
          />
        )}

        {activeSection === 'distribution' && (
          <DistributionAnalysisSection
            simulation={simulation}
            simTime={simTime}
            selectedRealizationIndex={selectedRealizationIndex}
          />
        )}

        {activeSection === 'ensemble' && (
          <EnsembleAnalysisSection
            simulation={simulation}
            simTime={simTime}
            onSeekTime={setSimTime}
            selectedRealizationIndex={selectedRealizationIndex}
            onSelectRealization={setSelectedRealizationIndex}
          />
        )}

        {activeSection === 'mean_var' && (
          <MeanVarianceSection
            simulation={simulation}
            simTime={simTime}
            onSeekTime={setSimTime}
            selectedRealizationIndex={selectedRealizationIndex}
          />
        )}

        {activeSection === 'stationarity' && (
          <StationaritySection simulation={simulation} />
        )}

        {activeSection === 'ergodicity' && (
          <ErgodicitySection
            simulation={simulation}
            selectedRealizationIndex={selectedRealizationIndex}
            onSelectRealization={setSelectedRealizationIndex}
          />
        )}

        {activeSection === 'autocorrelation' && (
          <AutocorrelationSection simulation={simulation} />
        )}

        {activeSection === 'psd' && (
          <PsdSection simulation={simulation} />
        )}
      </main>

      {/* 4. Bottom Sequential Navigation Helper */}
      <footer className="mt-8 pt-5 border-t border-[#E6E4DD] flex items-center justify-between text-xs font-mono text-[#75736E]">
        <button
          type="button"
          disabled={currentSectionIndex === 0}
          onClick={handlePrevSection}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded border transition-colors ${
            currentSectionIndex === 0
              ? 'opacity-40 cursor-not-allowed border-[#E6E4DD]'
              : 'hover:bg-[#FAF9F6] text-[#1A1917] border-[#E6E4DD] cursor-pointer'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          <span>
            {currentSectionIndex > 0
              ? `Previous: ${SECTIONS[currentSectionIndex - 1].shortTitle}`
              : 'First Section'}
          </span>
        </button>

        <span className="hidden sm:inline text-[11px]">
          Section {SECTIONS[currentSectionIndex].num} of 09 ·{' '}
          {SECTIONS[currentSectionIndex].title}
        </span>

        <button
          type="button"
          disabled={currentSectionIndex === SECTIONS.length - 1}
          onClick={handleNextSection}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded border transition-colors ${
            currentSectionIndex === SECTIONS.length - 1
              ? 'opacity-40 cursor-not-allowed border-[#E6E4DD]'
              : 'hover:bg-[#FAF9F6] text-[#1A1917] border-[#E6E4DD] cursor-pointer'
          }`}
        >
          <span>
            {currentSectionIndex < SECTIONS.length - 1
              ? `Next: ${SECTIONS[currentSectionIndex + 1].shortTitle}`
              : 'Completed All Sections'}
          </span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </footer>
    </div>
  );
}
