/**
 * MODULE 2.3 — SINGLE SIDEBAND SUPPRESSED CARRIER (SSB-SC)
 * Three-Stage Interactive Signal Lab:
 * - Module Heading with Prev/Next module links
 * - Mode Selector: 01. Signal Oscilloscope / 02. Audio Sound Lab
 * - SSB-SC Signal Workbench with 3-row Playback Toolbar & Stage-Scoped Signal Tabs
 * - Guided 3-Stage Learning Flow: 01 Message Signal → 02 SSB Modulation → 03 SSB Demodulation → Completion
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Play,
  Pause,
  RotateCcw,
  Grid,
  Maximize2,
  Minimize2,
  Activity,
  AudioLines,
} from 'lucide-react';
import { ModuleGlyph } from '../../components/ModuleGlyphs';
import {
  SsbParams,
  DEFAULT_SSB_PARAMS,
  generateSsbSimulation,
  MessageShape,
  SidebandMode,
} from './ssb/ssbMathEngine';
import {
  StageNumber,
  SsbStage01Message,
  SsbStage02Modulation,
  SsbStage03Demodulation,
  SsbCompletionView,
} from './ssb/SsbStageViews';
import { SsbAudioLab } from './ssb/SsbAudioLab';

type LabModeTab = 'oscilloscope' | 'audio';
type PlaybackState = 'playing' | 'paused' | 'reset';

interface StageMeta {
  num: StageNumber;
  code: string;
  label: string;
}

const STAGES: StageMeta[] = [
  { num: 1, code: '01', label: 'Message Signal' },
  { num: 2, code: '02', label: 'SSB Modulation' },
  { num: 3, code: '03', label: 'SSB Demodulation' },
];

const SPEED_OPTIONS = ['0.5×', '1×', '2×', '4×'] as const;

interface Module2_3_SSBProps {
  onNavigateHome: () => void;
  onNavigateModule: (path: string) => void;
}

function parseSpeedMultiplier(speed: string): number {
  const numeric = parseFloat(speed.replace('×', ''));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 1;
}

export const Module2_3_SSB: React.FC<Module2_3_SSBProps> = ({
  onNavigateModule,
}) => {
  // Laboratory Mode Selector (01. Signal Oscilloscope vs 02. Audio Sound Lab)
  const [activeLabTab, setActiveLabTab] = useState<LabModeTab>('oscilloscope');

  // Guided 3-Stage Navigation State
  const [currentStage, setCurrentStage] = useState<StageNumber>(1);
  const [highestStageReached, setHighestStageReached] = useState<StageNumber>(1);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  // Persistent Simulation Parameters & Playback State (preserved across stage transitions)
  const [params, setParams] = useState<SsbParams>(DEFAULT_SSB_PARAMS);
  const [tWindow] = useState<number>(1.0);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('paused');
  const [speed, setSpeed] = useState<string>('1×');
  const [simTime, setSimTime] = useState<number>(0.25);
  const [isGridVisible, setIsGridVisible] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const rafRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);

  const updateParams = useCallback((patch: Partial<SsbParams>) => {
    setParams((prev) => ({ ...prev, ...patch }));
  }, []);

  // Compute adaptive LPF cutoff so Stage 03 recovers both Cosine and Two-Tone cleanly
  const simParams = useMemo<SsbParams>(() => {
    const bw =
      params.messageShape === 'two_tone'
        ? 2 * params.messageFreq
        : params.messageFreq;
    const autoCutoff = Math.min(
      Math.max(bw + 3.5, 8.0),
      Math.max(8.0, params.carrierFreq - 1.5)
    );
    return {
      ...params,
      lpfCutoff: autoCutoff,
    };
  }, [params]);

  const simData = useMemo(() => generateSsbSimulation(simParams), [simParams]);

  const isFreqSynced = Math.abs(params.loFreqOffset) < 0.05;
  const isPhaseSynced = Math.abs(params.loPhaseDeg) < 2;
  const isSynced = isFreqSynced && isPhaseSynced;

  const technicalSectionLabel = isSynced
    ? `Synchronous Phase Lock (θ = ${params.loPhaseDeg}°)`
    : !isFreqSynced && !isPhaseSynced
    ? `LO Detune (Δf = ${params.loFreqOffset >= 0 ? '+' : ''}${params.loFreqOffset.toFixed(1)} Hz, θ = ${params.loPhaseDeg}°)`
    : !isFreqSynced
    ? `LO Frequency Offset (Δf = ${params.loFreqOffset >= 0 ? '+' : ''}${params.loFreqOffset.toFixed(1)} Hz)`
    : `LO Phase Offset (θ = ${params.loPhaseDeg}°)`;

  // Escape exits fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Lock body scroll in fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isFullscreen]);

  // Synchronized real-time animation loop
  useEffect(() => {
    if (playbackState !== 'playing' || activeLabTab !== 'oscilloscope') {
      lastFrameTimeRef.current = null;
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const mult = parseSpeedMultiplier(speed);

    const tick = (now: number) => {
      if (lastFrameTimeRef.current !== null) {
        const dtSec = Math.min(0.08, (now - lastFrameTimeRef.current) / 1000);
        setSimTime((prev) => {
          const next = prev + dtSec * mult * 0.25;
          return next > tWindow ? next % tWindow : next;
        });
      }
      lastFrameTimeRef.current = now;
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastFrameTimeRef.current = null;
    };
  }, [playbackState, speed, tWindow, activeLabTab]);

  // Playback handlers
  const handlePlay = useCallback(() => {
    setPlaybackState('playing');
  }, []);

  const handlePause = useCallback(() => {
    setPlaybackState('paused');
  }, []);

  const handleResetPlayback = useCallback(() => {
    setPlaybackState('reset');
    setSimTime(0);
  }, []);

  const handleSeekTime = useCallback(
    (t: number) => {
      setSimTime(Math.max(0, Math.min(tWindow, t)));
    },
    [tWindow]
  );

  // Stage-specific parameter reset (triggered by Stage Controls Reset button)
  const handleResetCurrentStage = useCallback(() => {
    if (currentStage === 1) {
      updateParams({
        messageShape: DEFAULT_SSB_PARAMS.messageShape,
        messageFreq: DEFAULT_SSB_PARAMS.messageFreq,
        messageAmp: DEFAULT_SSB_PARAMS.messageAmp,
      });
    } else if (currentStage === 2) {
      updateParams({
        sideband: DEFAULT_SSB_PARAMS.sideband,
        carrierFreq: DEFAULT_SSB_PARAMS.carrierFreq,
      });
    } else {
      updateParams({
        loFreqOffset: DEFAULT_SSB_PARAMS.loFreqOffset,
        loPhaseDeg: DEFAULT_SSB_PARAMS.loPhaseDeg,
      });
    }
  }, [currentStage, updateParams]);

  // Stage navigation handlers (clamped strictly to [1, 3])
  const handleNextStage = useCallback(() => {
    setCurrentStage((prev) => {
      if (prev === 1) {
        setHighestStageReached((h) => (h < 2 ? 2 : h));
        return 2;
      }
      if (prev === 2) {
        setHighestStageReached(3);
        return 3;
      }
      return prev;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handlePreviousStage = useCallback(() => {
    setCurrentStage((prev) => {
      if (prev === 3) return 2;
      if (prev === 2) return 1;
      return prev;
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleCompleteLab = useCallback(() => {
    if (currentStage !== 3) return;
    setIsCompleted(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentStage]);

  const handleRestartLab = useCallback(() => {
    setIsCompleted(false);
    setCurrentStage(1);
    setHighestStageReached(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Stage-appropriate live parameters summary directly under SSB-SC SIGNAL WORKBENCH title
  const workbenchLiveSummary =
    currentStage === 1
      ? `fm = ${params.messageFreq.toFixed(1)} Hz · Am = ${params.messageAmp.toFixed(1)} V · ${params.messageShape === 'single_tone' ? 'Cosine' : 'Two-Tone'}`
      : currentStage === 2
      ? `fc = ${params.carrierFreq.toFixed(0)} Hz · fm = ${params.messageFreq.toFixed(1)} Hz · ${params.sideband.toUpperCase()} · θ = ${params.loPhaseDeg}°`
      : `fc = ${params.carrierFreq.toFixed(0)} Hz · fLO = ${simData.loFreq.toFixed(1)} Hz · θ = ${params.loPhaseDeg}°`;

  // Stage-relevant signal selection tabs below the playback toolbar
  const renderWorkbenchSignalTabs = () => {
    if (currentStage === 1) {
      return (
        <div className="flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-[#E6E4DD]">
          {(
            [
              { id: 'single_tone', label: '1. m(t) Cosine' },
              { id: 'two_tone', label: '2. m(t) Two-Tone' },
            ] as { id: MessageShape; label: string }[]
          ).map((tab) => {
            const active = params.messageShape === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => updateParams({ messageShape: tab.id })}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-[#1A1917] text-white border-[#1A1917]'
                    : 'bg-[#FAF9F6] text-[#585651] border-[#E6E4DD] hover:text-[#1A1917] hover:bg-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      );
    }

    if (currentStage === 2) {
      return (
        <div className="flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-[#E6E4DD]">
          {(
            [
              { id: 'usb', label: '1. s(t) USB' },
              { id: 'lsb', label: '2. s(t) LSB' },
            ] as { id: SidebandMode; label: string }[]
          ).map((tab) => {
            const active = params.sideband === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => updateParams({ sideband: tab.id })}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? 'bg-[#1A1917] text-white border-[#1A1917]'
                    : 'bg-[#FAF9F6] text-[#585651] border-[#E6E4DD] hover:text-[#1A1917] hover:bg-white'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      );
    }

    return (
      <div className="flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-[#E6E4DD]">
        <button
          type="button"
          onClick={() => updateParams({ loFreqOffset: 0, loPhaseDeg: 0 })}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
            isSynced
              ? 'bg-[#1A1917] text-white border-[#1A1917]'
              : 'bg-[#FAF9F6] text-[#585651] border-[#E6E4DD] hover:text-[#1A1917] hover:bg-white'
          }`}
        >
          1. Recovered m̂(t) (θ = 0°)
        </button>
        <button
          type="button"
          onClick={() => updateParams({ loFreqOffset: 0, loPhaseDeg: 90 })}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
            isFreqSynced && params.loPhaseDeg === 90
              ? 'bg-[#1A1917] text-white border-[#1A1917]'
              : 'bg-[#FAF9F6] text-[#585651] border-[#E6E4DD] hover:text-[#1A1917] hover:bg-white'
          }`}
        >
          2. Phase Mismatch (θ = 90°)
        </button>
        <button
          type="button"
          onClick={() => updateParams({ loFreqOffset: 1.5, loPhaseDeg: 0 })}
          className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
            Math.abs(params.loFreqOffset - 1.5) < 0.05 && isPhaseSynced
              ? 'bg-[#1A1917] text-white border-[#1A1917]'
              : 'bg-[#FAF9F6] text-[#585651] border-[#E6E4DD] hover:text-[#1A1917] hover:bg-white'
          }`}
        >
          3. Frequency Offset (+1.5 Hz)
        </button>
      </div>
    );
  };

  // Main Simulation Workbench Card (Section 1.D)
  const renderSignalWorkbench = (inFullscreen: boolean) => (
    <section
      className="bg-white rounded-xl border border-[#E6E4DD] p-4 sm:p-5 shadow-2xs space-y-3"
      aria-label="SSB-SC Signal Workbench"
    >
      {/* Workbench Title + Live Parameters Line Directly Below Title */}
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 shrink-0">
          <ModuleGlyph id="ssb" className="w-5 h-5" accent={true} />
        </div>
        <div className="min-w-0">
          <h2 className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-[#1A1917]">
            SSB-SC SIGNAL WORKBENCH
          </h2>
          <p className="text-xs font-mono text-[#585651] tabular-nums mt-0.5">
            {workbenchLiveSummary}
          </p>
        </div>
      </div>

      {/* 3-Row Playback Toolbar inside Light Warm-Grey Rectangular Panel */}
      <div className="bg-[#FAF9F6] border border-[#E6E4DD] rounded-lg p-3 space-y-2.5">
        {/* Row 1: Play / Resume, Pause, Reset */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handlePlay}
            disabled={playbackState === 'playing'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-mono font-semibold transition-colors cursor-pointer ${
              playbackState === 'playing'
                ? 'bg-[#1A1917] text-white border-[#1A1917]'
                : 'bg-white text-[#1A1917] border-[#E6E4DD] hover:border-[#1A1917]/40'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{playbackState === 'paused' && simTime > 0 ? 'Resume' : 'Play'}</span>
          </button>

          <button
            type="button"
            onClick={handlePause}
            disabled={playbackState !== 'playing'}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-mono font-semibold transition-colors cursor-pointer ${
              playbackState === 'paused'
                ? 'bg-[#EAE7DF] text-[#1A1917] border-[#D6D3CB]'
                : 'bg-white text-[#585651] border-[#E6E4DD] hover:text-[#1A1917]'
            }`}
          >
            <Pause className="w-3.5 h-3.5" />
            <span>Pause</span>
          </button>

          <button
            type="button"
            onClick={handleResetPlayback}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#E6E4DD] bg-white hover:border-[#1A1917]/40 text-xs font-mono font-semibold text-[#585651] hover:text-[#1A1917] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>

        {/* Row 2: SPEED label + 0.5×, 1×, 2×, 4× */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#75736E] mr-1">
            SPEED
          </span>
          {SPEED_OPTIONS.map((opt) => {
            const active = speed === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setSpeed(opt)}
                className={`px-2.5 py-1 rounded-md border text-xs font-mono font-semibold transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#1A1917] text-white border-[#1A1917]'
                    : 'bg-white text-[#585651] border-[#E6E4DD] hover:text-[#1A1917]'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {/* Row 3: Grid toggle + Fullscreen button */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsGridVisible((g) => !g)}
            aria-pressed={isGridVisible}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-mono font-semibold transition-colors cursor-pointer ${
              isGridVisible
                ? 'bg-white text-[#1A1917] border-[#1A1917]/30'
                : 'bg-[#FAF9F6] text-[#75736E] border-[#E6E4DD] hover:text-[#1A1917]'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Grid</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(!inFullscreen)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#E6E4DD] bg-white hover:border-[#1A1917]/40 text-xs font-mono font-semibold text-[#585651] hover:text-[#1A1917] transition-colors cursor-pointer"
          >
            {inFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Exit Fullscreen</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Fullscreen</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stage-Scoped Signal Selection Tabs */}
      {renderWorkbenchSignalTabs()}
    </section>
  );

  // Connected 3-Stage Learning Progress Indicator
  const renderStageProgress = () => (
    <div className="bg-white rounded-xl border border-[#E6E4DD] p-3.5 sm:p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="text-xs font-mono font-bold tracking-wider text-[#C85A32] uppercase shrink-0">
        {isCompleted ? 'STAGE 03 OF 03 · COMPLETE' : `STAGE 0${currentStage} OF 03`}
      </div>

      <nav
        aria-label="Three-Stage SSB Learning Progress"
        className="flex flex-wrap items-center gap-1.5 sm:gap-2"
      >
        {STAGES.map((stage, idx) => {
          const isCurrent = !isCompleted && currentStage === stage.num;
          const isDone = isCompleted || currentStage > stage.num;
          const isReachable = !isCompleted && stage.num <= highestStageReached;

          return (
            <React.Fragment key={stage.num}>
              <button
                type="button"
                disabled={!isReachable}
                onClick={() => {
                  if (isReachable) setCurrentStage(stage.num);
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-colors whitespace-nowrap ${
                  isCurrent
                    ? 'bg-[#1A1917] border-[#1A1917] text-white font-bold'
                    : isDone
                    ? 'bg-[#10B981]/10 border-[#10B981]/30 text-[#059669] font-semibold cursor-pointer hover:bg-[#10B981]/15'
                    : isReachable
                    ? 'bg-white border-[#E6E4DD] text-[#1A1917] font-semibold cursor-pointer hover:bg-[#FAF9F6]'
                    : 'bg-[#FAF9F6] border-[#E6E4DD] text-[#8A8882] cursor-not-allowed'
                }`}
              >
                {isDone && <Check className="w-3 h-3 shrink-0" />}
                <span>
                  {stage.code} {stage.label}
                </span>
              </button>

              {idx < STAGES.length - 1 && (
                <ArrowRight
                  aria-hidden="true"
                  className="w-3.5 h-3.5 text-[#A8A69E] shrink-0"
                />
              )}
            </React.Fragment>
          );
        })}
      </nav>
    </div>
  );

  // Active Stage Body
  const renderActiveStage = () => {
    if (isCompleted) {
      return <SsbCompletionView onRestartLab={handleRestartLab} />;
    }

    const stageProps = {
      sim: simData,
      simTime,
      onSeekTime: handleSeekTime,
      tWindow,
      isGridVisible,
      onUpdateParams: updateParams,
      onResetStage: handleResetCurrentStage,
    };

    switch (currentStage) {
      case 1:
        return <SsbStage01Message {...stageProps} />;
      case 2:
        return <SsbStage02Modulation {...stageProps} />;
      case 3:
        return <SsbStage03Demodulation {...stageProps} />;
    }
  };

  // Bottom Stage Navigation Bar
  const renderStageFooter = () => {
    if (isCompleted) return null;

    if (currentStage === 1) {
      return (
        <div className="bg-white rounded-xl border border-[#E6E4DD] p-4 shadow-2xs">
          <button
            type="button"
            onClick={handleNextStage}
            className="w-full py-3 px-5 rounded-lg bg-[#C85A32] hover:bg-[#B54E28] text-white text-xs sm:text-sm font-mono font-bold transition-colors inline-flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <span>Next Stage 02 →</span>
          </button>
        </div>
      );
    }

    return (
      <div className="bg-white rounded-xl border border-[#E6E4DD] p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={handlePreviousStage}
          className="px-4 py-2.5 rounded-lg border border-[#E6E4DD] bg-white hover:bg-[#FAF9F6] text-xs sm:text-sm font-mono font-semibold text-[#1A1917] transition-colors inline-flex items-center gap-2 cursor-pointer"
        >
          <span>← Previous Stage</span>
        </button>

        {currentStage === 2 ? (
          <button
            type="button"
            onClick={handleNextStage}
            className="px-5 py-2.5 rounded-lg bg-[#C85A32] hover:bg-[#B54E28] text-white text-xs sm:text-sm font-mono font-bold transition-colors inline-flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <span>Next Stage 03 →</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleCompleteLab}
            className="px-5 py-2.5 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs sm:text-sm font-mono font-bold transition-colors inline-flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Complete Lab</span>
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5 overflow-x-hidden">
      {/* 1.B Module Heading */}
      <header className="pb-4 border-b border-[#E6E4DD] space-y-3">
        <div className="space-y-1">
          <p className="text-xs font-medium text-[#75736E]">
            Suppressed Carrier &amp; Coherent Recovery
          </p>
          <p className="text-xs font-mono font-semibold text-[#C85A32]">
            {technicalSectionLabel}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1917] leading-tight">
            Single Sideband Suppressed Carrier (SSB-SC)
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigateModule('/am/dsb-sc')}
            className="px-3 py-1.5 rounded-md border border-[#E6E4DD] bg-white hover:bg-[#FAF9F6] text-xs font-mono font-semibold text-[#484642] hover:text-[#1A1917] transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Prev: DSB-SC (02)</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigateModule('/am/vsb')}
            className="px-3 py-1.5 rounded-md border border-[#E6E4DD] bg-white hover:bg-[#FAF9F6] text-xs font-mono font-semibold text-[#484642] hover:text-[#1A1917] transition-colors inline-flex items-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap"
          >
            <span>Next: Module (04)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* 1.C Laboratory Mode Selector (Wide 2-Equal-Width Rectangular Tabs) */}
      <div
        role="tablist"
        aria-label="SSB-SC Laboratory Mode"
        className="grid grid-cols-2 gap-1.5 bg-[#F6F4EE] border border-[#E6E4DD] rounded-xl p-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeLabTab === 'oscilloscope'}
          onClick={() => setActiveLabTab('oscilloscope')}
          className={`py-2.5 px-3 rounded-lg text-xs sm:text-sm font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer ${
            activeLabTab === 'oscilloscope'
              ? 'bg-white text-[#1A1917] font-bold border border-[#E6E4DD] shadow-2xs'
              : 'bg-transparent text-[#65635E] font-medium hover:text-[#1A1917]'
          }`}
        >
          <Activity className="w-4 h-4 text-[#C85A32] shrink-0" />
          <span className="truncate">01. Signal Oscilloscope</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeLabTab === 'audio'}
          onClick={() => {
            setPlaybackState('paused');
            setIsFullscreen(false);
            setActiveLabTab('audio');
          }}
          className={`py-2.5 px-3 rounded-lg text-xs sm:text-sm font-mono flex items-center justify-center gap-2 transition-colors cursor-pointer ${
            activeLabTab === 'audio'
              ? 'bg-white text-[#1A1917] font-bold border border-[#E6E4DD] shadow-2xs'
              : 'bg-transparent text-[#65635E] font-medium hover:text-[#1A1917]'
          }`}
        >
          <AudioLines className="w-4 h-4 text-[#C85A32] shrink-0" />
          <span className="truncate">02. Audio Sound Lab</span>
        </button>
      </div>

      {/* Mode Content */}
      {activeLabTab === 'oscilloscope' ? (
        <div className="space-y-4">
          {/* Three-Stage Learning Progress */}
          {renderStageProgress()}

          {/* 1.D Main Simulation Workbench (hidden on completion screen) */}
          {!isCompleted && renderSignalWorkbench(false)}

          {/* Active Stage Content */}
          {renderActiveStage()}

          {/* Bottom Stage Navigation */}
          {renderStageFooter()}
        </div>
      ) : (
        <SsbAudioLab
          sideband={params.sideband}
          onChangeSideband={(mode) => updateParams({ sideband: mode })}
          loPhaseDeg={params.loPhaseDeg}
        />
      )}

      {/* Fullscreen Oscilloscope Workspace */}
      {isFullscreen && activeLabTab === 'oscilloscope' && (
        <div
          className="fixed inset-0 z-50 bg-[#FAF9F6] flex flex-col overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-label="SSB-SC Fullscreen Laboratory"
        >
          <div className="px-4 py-3 bg-white border-b border-[#E6E4DD] flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold tracking-wider text-[#C85A32]">
                SSB-SC SIGNAL LAB
              </span>
              <span className="text-xs font-mono text-[#75736E]">
                {isCompleted ? 'COMPLETE' : `STAGE 0${currentStage} OF 03`}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-[#1A1917] text-white cursor-pointer"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Exit Fullscreen</span>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="max-w-6xl mx-auto space-y-4">
              {!isCompleted && renderSignalWorkbench(true)}
              {renderActiveStage()}
              {renderStageFooter()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
