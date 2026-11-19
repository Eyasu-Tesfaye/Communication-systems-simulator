/**
 * MODULE 2.4 — VESTIGIAL SIDEBAND MODULATION (VSB)
 * Strictly scoped to class concepts:
 * 1. Spectrum Comparison (M(f), DSB-SC, SSB, VSB + W, fc, fv sliders & VSB/W ratio)
 * 2. VSB Modulator (Block diagram, DSB-SC + H(f) overlay, VSB output, H(f+fc)+H(f-fc)=1 check)
 * 3. Demodulation (Coherent detector, 1-tone/2-tone/low-frequency-rich, Yes/No condition toggle, RMSE)
 * 4. Comparison & Theory (DSB, DSB-SC, SSB, VSB table + Analog TV NTSC/PAL text + KaTeX)
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  SlidersHorizontal,
  RotateCcw,
  Activity,
  Sliders,
  GitMerge,
  Scale,
} from 'lucide-react';
import { AM_MODULES, AMSubTopic } from '../../data/modules';
import { ModuleGlyph } from '../../components/ModuleGlyphs';
import { MathView } from '../../components/MathView';
import { SimulationToolbar, PlaybackState } from '../../components/SimulationToolbar';
import {
  VsbParams,
  DEFAULT_VSB_PARAMS,
  VSB_DURATION,
  VsbMessageOption,
  generateVsbSimulation,
} from './vsb/vsbMathEngine';
import {
  VsbSpectrumComparisonSection,
  VsbModulatorSection,
  VsbDemodulationSection,
  VsbComparisonTheorySection,
} from './vsb/VsbSections';

type VsbTabId = 'spectrum' | 'modulator' | 'demodulation' | 'theory';

interface TabMeta {
  id: VsbTabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: TabMeta[] = [
  {
    id: 'spectrum',
    label: 'Spectrum Comparison',
    icon: <Activity className="w-3.5 h-3.5" />,
  },
  {
    id: 'modulator',
    label: 'VSB Modulator',
    icon: <Sliders className="w-3.5 h-3.5" />,
  },
  {
    id: 'demodulation',
    label: 'Demodulation',
    icon: <GitMerge className="w-3.5 h-3.5" />,
  },
  {
    id: 'theory',
    label: 'Comparison & Theory',
    icon: <Scale className="w-3.5 h-3.5" />,
  },
];

const TEX = {
  W: 'W',
  fc: 'f_c',
  fv: 'f_v',
  Ac: 'A_c',
  fvQuarterW: 'f_v = 0.25W',
  condSym: 'H(f+f_c)+H(f-f_c)=1',
  vsbRatio: 'B_{\\text{VSB}} / W',
};

interface Module2_4_VSBProps {
  onNavigateHome: () => void;
  onNavigateModule: (path: string) => void;
}

function parseSpeedMultiplier(speed: string): number {
  const numeric = parseFloat(speed.replace('×', ''));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : 1;
}

export const Module2_4_VSB: React.FC<Module2_4_VSBProps> = ({
  onNavigateModule,
}) => {
  const subTopic: AMSubTopic = AM_MODULES[3]; // Module 2.4 VSB

  const [activeTab, setActiveTab] = useState<VsbTabId>('spectrum');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGridVisible, setIsGridVisible] = useState(true);

  const [params, setParams] = useState<VsbParams>(DEFAULT_VSB_PARAMS);
  const [tWindow, setTWindow] = useState<number>(1.0);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('paused');
  const [speed, setSpeed] = useState<string>('1×');
  const [simTime, setSimTime] = useState<number>(0.25);

  const rafRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);

  const updateParams = useCallback((patch: Partial<VsbParams>) => {
    setParams((prev) => {
      const next = { ...prev, ...patch };
      if (next.fv > next.W) {
        next.fv = next.W;
      }
      if (next.fv > 4.0) {
        next.fv = 4.0;
      }
      return next;
    });
  }, []);

  const simData = useMemo(() => generateVsbSimulation(params), [params]);

  // Escape key exits fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Lock body scroll in fullscreen mode
  useEffect(() => {
    if (!isFullscreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isFullscreen]);

  // Animation loop for time-domain cursor
  useEffect(() => {
    if (playbackState !== 'playing') {
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
  }, [playbackState, speed, tWindow]);

  const handlePlay = useCallback(() => {
    setPlaybackState('playing');
  }, []);

  const handlePause = useCallback(() => {
    setPlaybackState('paused');
  }, []);

  const handleReset = useCallback(() => {
    setPlaybackState('reset');
    setSimTime(0);
  }, []);

  const handleDefaults = useCallback(() => {
    setParams(DEFAULT_VSB_PARAMS);
    setTWindow(1.0);
    setSimTime(0.25);
    setPlaybackState('paused');
  }, []);

  const handleSeekTime = useCallback(
    (t: number) => {
      setSimTime(Math.max(0, Math.min(tWindow, t)));
    },
    [tWindow]
  );

  const maxFvSlider = Math.min(4.0, params.W);

  // Reusable Left Control Panel
  const renderControlPanel = () => (
    <aside className="bg-white rounded-lg border border-[#E6E4DD] p-4 shadow-2xs space-y-4">
      <div className="flex items-center justify-between pb-2.5 border-b border-[#E6E4DD]">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-[#C85A32]" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1917]">
            VSB Signal Controls
          </h2>
        </div>
        <button
          type="button"
          onClick={handleDefaults}
          className="text-[11px] font-mono text-[#75736E] hover:text-[#C85A32] flex items-center gap-1 cursor-pointer"
          title="Restore default VSB parameters"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Defaults</span>
        </button>
      </div>

      {/* Spectral & Filter Parameters */}
      <div className="space-y-3">
        <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#1A1917]">
          Bandwidth &amp; Carrier
        </div>

        {/* Message Bandwidth W */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-[#585651]">
              Message BW <MathView math={TEX.W} />
            </span>
            <span className="font-bold text-[#1A1917] tabular-nums">
              {params.W.toFixed(1)} Hz
            </span>
          </div>
          <input
            type="range"
            min={2.0}
            max={8.0}
            step={0.5}
            value={params.W}
            onChange={(e) => updateParams({ W: parseFloat(e.target.value) })}
            className="w-full accent-[#C85A32] cursor-pointer"
            aria-label="Message bandwidth W"
          />
        </div>

        {/* Carrier Frequency fc */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-[#585651]">
              Carrier Freq <MathView math={TEX.fc} />
            </span>
            <span className="font-bold text-[#1A1917] tabular-nums">
              {params.fc.toFixed(1)} Hz
            </span>
          </div>
          <input
            type="range"
            min={16.0}
            max={36.0}
            step={1.0}
            value={params.fc}
            onChange={(e) => updateParams({ fc: parseFloat(e.target.value) })}
            className="w-full accent-[#C85A32] cursor-pointer"
            aria-label="Carrier frequency fc"
          />
        </div>

        {/* Vestige Width fv */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-[#585651]">
              Vestige Width <MathView math={TEX.fv} />
            </span>
            <span className="font-bold text-[#C85A32] tabular-nums">
              {simData.effectiveFv.toFixed(2)} Hz
            </span>
          </div>
          <input
            type="range"
            min={0.5}
            max={maxFvSlider}
            step={0.25}
            value={simData.effectiveFv}
            onChange={(e) => updateParams({ fv: parseFloat(e.target.value) })}
            className="w-full accent-[#C85A32] cursor-pointer"
            aria-label="Vestige width fv"
          />
          <div className="flex items-center justify-between pt-0.5">
            <span className="text-[10px] font-mono text-[#75736E]">
              Ratio: {simData.vsbToWRatio.toFixed(2)}× <MathView math={TEX.W} />
            </span>
            <button
              type="button"
              onClick={() =>
                updateParams({
                  fv: Math.max(0.5, Math.min(4.0, Math.round(params.W * 0.25 * 4) / 4)),
                })
              }
              className="px-1.5 py-0.5 rounded bg-[#FAF9F6] hover:bg-[#FBF4F0] border border-[#E6E4DD] text-[10px] font-mono text-[#585651] hover:text-[#C85A32] cursor-pointer transition-colors"
            >
              Set <MathView math={TEX.fvQuarterW} />
            </button>
          </div>
        </div>

        {/* Carrier Amplitude Ac */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-[#585651]">
              Carrier Amp <MathView math={TEX.Ac} />
            </span>
            <span className="font-bold text-[#1A1917] tabular-nums">
              {params.carrierAmp.toFixed(1)} V
            </span>
          </div>
          <input
            type="range"
            min={1.0}
            max={3.0}
            step={0.1}
            value={params.carrierAmp}
            onChange={(e) =>
              updateParams({ carrierAmp: parseFloat(e.target.value) })
            }
            className="w-full accent-[#C85A32] cursor-pointer"
            aria-label="Carrier amplitude Ac"
          />
        </div>
      </div>

      {/* Demodulation Message Options */}
      <div className="pt-3 border-t border-[#E6E4DD] space-y-2.5">
        <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#1A1917]">
          Message Option (Demodulation)
        </div>
        <div className="grid grid-cols-3 gap-1">
          {(
            [
              { id: 'one_tone', label: '1-Tone' },
              { id: 'two_tone', label: '2-Tone' },
              { id: 'low_freq_rich', label: 'Low-Freq' },
            ] as { id: VsbMessageOption; label: string }[]
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => updateParams({ messageOption: opt.id })}
              className={`py-1.5 px-1.5 rounded text-[11px] font-mono font-semibold border transition-colors cursor-pointer ${
                params.messageOption === opt.id
                  ? 'bg-[#FBF4F0] border-[#C85A32] text-[#C85A32]'
                  : 'bg-[#FAF9F6] border-[#E6E4DD] text-[#585651] hover:bg-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Shaping Filter Condition Toggle */}
      <div className="pt-3 border-t border-[#E6E4DD] space-y-2">
        <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#1A1917]">
          Filter Satisfies Condition
        </div>
        <div className="text-[10px] font-mono text-[#75736E]">
          <MathView math={TEX.condSym} />
        </div>
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#FAF9F6] border border-[#E6E4DD] rounded-md">
          {[true, false].map((flag) => {
            const active = params.filterSatisfiesCondition === flag;
            return (
              <button
                key={String(flag)}
                type="button"
                onClick={() => updateParams({ filterSatisfiesCondition: flag })}
                className={`py-1.5 px-2 rounded text-xs font-mono font-bold transition-colors cursor-pointer ${
                  active
                    ? flag
                      ? 'bg-[#059669] text-white shadow-2xs'
                      : 'bg-[#DC2626] text-white shadow-2xs'
                    : 'text-[#585651] hover:text-[#1A1917] hover:bg-white'
                }`}
              >
                {flag ? 'Yes' : 'No'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Time Window Zoom */}
      <div className="pt-3 border-t border-[#E6E4DD] space-y-1.5">
        <div className="flex justify-between text-[11px] font-mono font-bold uppercase text-[#585651]">
          <span>Time Window</span>
          <span className="text-[#1A1917]">0 – {tWindow.toFixed(1)} s</span>
        </div>
        <div className="grid grid-cols-3 gap-1">
          {[0.5, 1.0, VSB_DURATION].map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => {
                setTWindow(w);
                setSimTime((prev) => Math.min(prev, w));
              }}
              className={`py-1 rounded text-[11px] font-mono font-semibold border cursor-pointer transition-colors ${
                Math.abs(tWindow - w) < 0.01
                  ? 'bg-[#1A1917] text-white border-[#1A1917]'
                  : 'bg-[#FAF9F6] text-[#585651] border-[#E6E4DD] hover:bg-white'
              }`}
            >
              {w === VSB_DURATION ? '2.0s Full' : `${w.toFixed(1)}s`}
            </button>
          ))}
        </div>
      </div>

      {/* Live Signal Readout Card */}
      <div className="p-3 bg-[#FAF9F6] rounded-md border border-[#E6E4DD] space-y-1.5 text-[11px] font-mono">
        <div className="font-bold text-[#1A1917] uppercase tracking-wider text-[10px] pb-1 border-b border-[#E6E4DD]">
          Live Signal Readout
        </div>
        <div className="flex justify-between">
          <span className="text-[#75736E]">VSB Bandwidth:</span>
          <span className="font-bold text-[#C85A32] tabular-nums">
            {simData.bwVsb.toFixed(2)} Hz
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#75736E]">
            <MathView math={TEX.vsbRatio} />:
          </span>
          <span className="font-bold text-[#1A1917] tabular-nums">
            {simData.vsbToWRatio.toFixed(2)}×
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#75736E]">Condition:</span>
          <span
            className={`font-bold ${
              simData.isConditionSatisfied ? 'text-[#059669]' : 'text-[#DC2626]'
            }`}
          >
            {simData.isConditionSatisfied ? 'Satisfied' : 'Violated'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#75736E]">Demod RMSE:</span>
          <span
            className={`font-bold tabular-nums ${
              simData.rmse < 0.02 ? 'text-[#059669]' : 'text-[#DC2626]'
            }`}
          >
            {simData.rmse.toFixed(4)} V ({simData.normalizedRmsePct.toFixed(1)}%)
          </span>
        </div>
      </div>
    </aside>
  );

  // Tab row (used in normal mode and fullscreen header)
  const renderTabRow = () => (
    <div
      role="tablist"
      aria-label="VSB analysis sections"
      className="flex flex-wrap items-center gap-2 bg-[#FAF9F6] p-2 rounded-lg border border-[#E6E4DD]"
    >
      {TABS.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-semibold border transition-colors cursor-pointer ${
              active
                ? 'bg-[#C85A32] text-white border-[#C85A32] shadow-2xs'
                : 'bg-white text-[#585651] border-[#E6E4DD] hover:text-[#1A1917] hover:bg-[#FAF9F6]'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );

  const renderActiveSection = () => {
    const props = {
      sim: simData,
      simTime,
      onSeekTime: handleSeekTime,
      tWindow,
      isGridVisible,
      onUpdateParams: updateParams,
    };

    switch (activeTab) {
      case 'spectrum':
        return <VsbSpectrumComparisonSection {...props} />;
      case 'modulator':
        return <VsbModulatorSection {...props} />;
      case 'demodulation':
        return <VsbDemodulationSection {...props} />;
      case 'theory':
        return <VsbComparisonTheorySection {...props} />;
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Module Header Bar (Matching Module 2.3 SSB, no long intro box) */}
      <div className="pb-4 border-b border-[#E6E4DD] flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-mono font-semibold uppercase tracking-widest text-[#75736E] mb-1.5">
            Amplitude Modulation · Vestige Modulation
          </p>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs font-mono font-bold tracking-wider text-[#C85A32] bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/25">
              MODULE 2.4
            </span>
            <span className="text-xs text-[#75736E] font-medium font-mono">
              {subTopic.tag}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1917] flex items-center gap-2.5">
            <ModuleGlyph id="vsb" className="w-6 h-6 shrink-0" accent={true} />
            <span>{subTopic.name}</span>
          </h1>
          <p className="mt-1 text-sm text-[#585651] max-w-3xl leading-relaxed">
            Partial sideband suppression for video signals: spectrum compromise, shaping filter condition, and coherent demodulation.
          </p>
        </div>

        {/* Previous / Next AM Sub-Module Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onNavigateModule('/am/ssb')}
            className="px-3 py-1.5 border border-[#E6E4DD] hover:bg-[#FAF9F6] text-xs font-medium text-[#585651] hover:text-[#1A1917] rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Previous: SSB (2.3)"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>SSB (2.3)</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateModule('/am/fm')}
            className="px-3 py-1.5 border border-[#E6E4DD] hover:bg-[#FAF9F6] text-xs font-semibold text-[#1A1917] hover:border-[#C85A32]/40 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Next: FM (2.5)"
          >
            <span>Next: FM (2.5)</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 2. 4-Tab Navigation Row */}
      {renderTabRow()}

      {/* 3. Main Side-by-Side Interactive Simulator (Sticky Controls + Visualization Stage) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-4 min-w-0">
          {renderControlPanel()}
        </div>

        <div className="lg:col-span-8 xl:col-span-9 min-w-0 space-y-4">
          <SimulationToolbar
            playbackState={playbackState}
            onPlay={handlePlay}
            onPause={handlePause}
            onReset={handleReset}
            speed={speed}
            onSpeedChange={setSpeed}
            isGridVisible={isGridVisible}
            onToggleGrid={() => setIsGridVisible((g) => !g)}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen((f) => !f)}
            isLiveSimulationReady={true}
          />

          {renderActiveSection()}
        </div>
      </div>

      {/* 4. Fullscreen Split-Pane Workspace Modal */}
      {isFullscreen && (
        <div
          className="fixed inset-0 z-50 bg-[#FAF9F6] flex flex-col overflow-hidden"
          role="dialog"
          aria-modal="true"
          aria-label="VSB Modulation Simulator Fullscreen Workspace"
        >
          <div className="px-4 py-2.5 bg-white border-b border-[#E6E4DD] flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-mono font-bold tracking-wider text-[#C85A32] bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/25">
                MODULE 2.4 · VSB
              </span>
              {renderTabRow()}
            </div>

            <SimulationToolbar
              playbackState={playbackState}
              onPlay={handlePlay}
              onPause={handlePause}
              onReset={handleReset}
              speed={speed}
              onSpeedChange={setSpeed}
              isGridVisible={isGridVisible}
              onToggleGrid={() => setIsGridVisible((g) => !g)}
              isFullscreen={true}
              onToggleFullscreen={() => setIsFullscreen(false)}
              isLiveSimulationReady={true}
            />
          </div>

          <div className="flex-1 overflow-y-auto lg:overflow-hidden p-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:h-full">
              <div className="lg:col-span-4 xl:col-span-3 lg:h-full lg:overflow-y-auto pr-0.5 min-w-0">
                {renderControlPanel()}
              </div>
              <div className="lg:col-span-8 xl:col-span-9 lg:h-full lg:overflow-y-auto pr-0.5 space-y-4 min-w-0">
                {renderActiveSection()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
