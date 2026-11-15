/**
 * MODULE 2.3 — SINGLE SIDEBAND (SSB) MODULATION & DEMODULATION
 * Independent, interactive Signal Lab simulator covering:
 * 1. SSB Introduction & AM / DSB-SC / SSB visual comparison
 * 2. Time-Domain SSB Modulation (Single-Tone & General Hilbert Transform)
 * 3. Frequency-Domain FFT Spectrum Analysis (USB, LSB, Carrier Suppression, BW)
 * 4. Coherent Product Demodulation & Original-vs-Recovered Error Metrics
 * 5. Bandwidth, Power Efficiency & Mathematical Reference
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  BookOpen,
  SlidersHorizontal,
  Sparkles,
  RotateCcw,
  Radio,
  Waves,
  Activity,
  GitMerge,
  Scale,
} from 'lucide-react';
import { AM_MODULES, AMSubTopic } from '../../data/modules';
import { ModuleGlyph } from '../../components/ModuleGlyphs';
import { SimulationToolbar, PlaybackState } from '../../components/SimulationToolbar';
import {
  SsbParams,
  DEFAULT_SSB_PARAMS,
  SSB_DURATION,
  MessageShape,
  SidebandMode,
  generateSsbSimulation,
} from './ssb/ssbMathEngine';
import {
  SsbIntroSection,
  SsbTimeDomainSection,
  SsbFrequencyDomainSection,
  SsbDemodulationSection,
  SsbComparisonTheorySection,
} from './ssb/SsbSections';

type SsbSectionId = 'intro' | 'time' | 'frequency' | 'demodulation' | 'comparison';

interface SectionMeta {
  id: SsbSectionId;
  shortLabel: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

const SECTIONS: SectionMeta[] = [
  {
    id: 'intro',
    shortLabel: '01 · Introduction & Comparison',
    title: '01. SSB Introduction & Visual Comparison',
    subtitle: 'Modulation basics, why SSB sends one sideband, and AM vs. DSB-SC vs. SSB spectra',
    icon: <Radio className="w-3.5 h-3.5 text-[#C85A32]" />,
  },
  {
    id: 'time',
    shortLabel: '02 · Time-Domain Modulation',
    title: '02. Time-Domain SSB Modulation (USB & LSB)',
    subtitle: 'Message m(t), carrier c(t), Hilbert m̂(t), and single-tone vs. general waveforms',
    icon: <Waves className="w-3.5 h-3.5 text-[#C85A32]" />,
  },
  {
    id: 'frequency',
    shortLabel: '03 · Frequency-Domain Analysis',
    title: '03. Frequency-Domain Spectrum Analysis',
    subtitle: 'FFT magnitude spectra of message, carrier, USB-only, LSB-only, and bandwidth B',
    icon: <Activity className="w-3.5 h-3.5 text-[#C85A32]" />,
  },
  {
    id: 'demodulation',
    shortLabel: '04 · Coherent Demodulation',
    title: '04. SSB Demodulation & Recovery Comparison',
    subtitle: 'Product detector, LO Δf / Δφ error, LPF recovery, and original-vs-recovered RMSE',
    icon: <GitMerge className="w-3.5 h-3.5 text-[#C85A32]" />,
  },
  {
    id: 'comparison',
    shortLabel: '05 · Bandwidth, Power & Theory',
    title: '05. Bandwidth, Power Efficiency & Theory',
    subtitle: 'Quantitative comparison table (AM / DSB-SC / SSB), assumptions, and Hilbert derivations',
    icon: <Scale className="w-3.5 h-3.5 text-[#C85A32]" />,
  },
];

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
  const subTopic: AMSubTopic = AM_MODULES[2]; // Module 2.3 SSB

  // Navigation & View State
  const [activeSection, setActiveSection] = useState<SsbSectionId>('time');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isGridVisible, setIsGridVisible] = useState(true);

  // Simulation Parameters & Playback
  const [params, setParams] = useState<SsbParams>(DEFAULT_SSB_PARAMS);
  const [tWindow, setTWindow] = useState<number>(1.0);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('paused');
  const [speed, setSpeed] = useState<string>('1×');
  const [simTime, setSimTime] = useState<number>(0.25);

  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number | null>(null);

  const updateParams = useCallback((patch: Partial<SsbParams>) => {
    setParams((prev) => ({ ...prev, ...patch }));
  }, []);

  // Recompute full SSB simulation mathematically whenever parameters change
  const simData = useMemo(() => generateSsbSimulation(params), [params]);

  const currentSectionMeta =
    SECTIONS.find((s) => s.id === activeSection) ?? SECTIONS[1];

  // Close dropdown on outside click or Escape, and support Escape to exit fullscreen
  useEffect(() => {
    const handlePointerDown = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDropdownOpen) {
          setIsDropdownOpen(false);
        } else if (isFullscreen) {
          setIsFullscreen(false);
        }
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen, isFullscreen]);

  // Lock body scroll in fullscreen mode
  useEffect(() => {
    if (!isFullscreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isFullscreen]);

  // Synchronized real-time animation loop for moving cursor across time-domain graphs
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
          const next = prev + dtSec * mult * 0.25; // Smooth educational sweep speed
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

  const handleResetAllParams = useCallback(() => {
    setParams(DEFAULT_SSB_PARAMS);
    setTWindow(1.0);
    setSimTime(0.25);
    setPlaybackState('paused');
  }, []);

  const handleGenerateSignal = useCallback(() => {
    setParams((prev) => ({ ...prev, seed: prev.seed + 1 }));
    setSimTime(0);
    setPlaybackState('playing');
  }, []);

  const handleSeekTime = useCallback(
    (t: number) => {
      setSimTime(Math.max(0, Math.min(tWindow, t)));
    },
    [tWindow]
  );

  // Reusable Section Dropdown Selector (attachRef ensures only active instance binds outside-click ref)
  const renderSectionDropdown = (attachRef: boolean) => (
    <div ref={attachRef ? dropdownRef : undefined} className="relative">
      <button
        type="button"
        onClick={() => setIsDropdownOpen((v) => !v)}
        aria-expanded={isDropdownOpen}
        aria-haspopup="listbox"
        className="w-full sm:w-auto min-w-[270px] flex items-center justify-between gap-3 px-3.5 py-2 bg-white border border-[#E6E4DD] hover:border-[#C85A32]/50 rounded-md text-xs font-mono font-bold text-[#1A1917] shadow-2xs transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2 truncate">
          {currentSectionMeta.icon}
          <span className="truncate">{currentSectionMeta.title}</span>
        </span>
        <ChevronDown
          className={`w-4 h-4 text-[#75736E] shrink-0 transition-transform ${
            isDropdownOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isDropdownOpen && (
        <div
          role="listbox"
          className="absolute left-0 mt-1.5 w-full sm:w-[390px] bg-white border border-[#E6E4DD] rounded-lg shadow-lg py-1.5 z-50"
        >
          {SECTIONS.map((sec) => {
            const isSelected = sec.id === activeSection;
            return (
              <button
                key={sec.id}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  setActiveSection(sec.id);
                  setIsDropdownOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2.5 flex items-start gap-2.5 transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#FBF4F0] text-[#C85A32]'
                    : 'text-[#1A1917] hover:bg-[#FAF9F6]'
                }`}
              >
                <span className="mt-0.5 shrink-0">{sec.icon}</span>
                <div className="min-w-0">
                  <div className="text-xs font-mono font-bold truncate">
                    {sec.title}
                  </div>
                  <div className="text-[11px] text-[#75736E] leading-snug mt-0.5">
                    {sec.subtitle}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  // Reusable Left Control Panel (used in both normal sticky layout & fullscreen split mode)
  const renderControlPanel = () => (
    <aside className="bg-white rounded-lg border border-[#E6E4DD] p-4 shadow-2xs space-y-4">
      <div className="flex items-center justify-between pb-2.5 border-b border-[#E6E4DD]">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-[#C85A32]" />
          <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1917]">
            SSB Signal Controls
          </h2>
        </div>
        <button
          type="button"
          onClick={handleResetAllParams}
          className="text-[11px] font-mono text-[#75736E] hover:text-[#C85A32] flex items-center gap-1 cursor-pointer"
          title="Restore default SSB parameters"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Defaults</span>
        </button>
      </div>

      {/* Primary Action: Generate Signal */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleGenerateSignal}
          className="col-span-2 py-2 px-3 rounded-md bg-[#C85A32] hover:bg-[#B24D28] text-white text-xs font-mono font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Generate Signal &amp; Play</span>
        </button>
      </div>

      {/* Sideband Selection: USB vs LSB */}
      <div className="space-y-1.5">
        <label className="block text-[11px] font-mono font-bold uppercase tracking-wider text-[#585651]">
          Sideband Selection
        </label>
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#FAF9F6] border border-[#E6E4DD] rounded-md">
          {(['usb', 'lsb'] as SidebandMode[]).map((mode) => {
            const active = params.sideband === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => updateParams({ sideband: mode })}
                className={`py-1.5 px-2 rounded text-xs font-mono font-bold transition-colors cursor-pointer ${
                  active
                    ? mode === 'usb'
                      ? 'bg-[#C85A32] text-white shadow-2xs'
                      : 'bg-[#2E6F7E] text-white shadow-2xs'
                    : 'text-[#585651] hover:text-[#1A1917] hover:bg-white'
                }`}
              >
                {mode === 'usb' ? 'USB (fc + fm)' : 'LSB (fc − fm)'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Message Signal Controls */}
      <div className="pt-3 border-t border-[#E6E4DD] space-y-3">
        <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#1A1917]">
          Message Signal m(t)
        </div>

        {/* Message Waveform Type */}
        <div className="grid grid-cols-3 gap-1">
          {(
            [
              { id: 'single_tone', label: '1-Tone' },
              { id: 'two_tone', label: '2-Tone' },
              { id: 'bandlimited_pulse', label: 'Multi' },
            ] as { id: MessageShape; label: string }[]
          ).map((shape) => (
            <button
              key={shape.id}
              type="button"
              onClick={() => updateParams({ messageShape: shape.id })}
              className={`py-1 px-1.5 rounded text-[11px] font-mono font-semibold border transition-colors cursor-pointer ${
                params.messageShape === shape.id
                  ? 'bg-[#FBF4F0] border-[#C85A32] text-[#C85A32]'
                  : 'bg-[#FAF9F6] border-[#E6E4DD] text-[#585651] hover:bg-white'
              }`}
            >
              {shape.label}
            </button>
          ))}
        </div>

        {/* Message Amplitude Am */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-[#585651]">Amplitude A_m</span>
            <span className="font-bold text-[#1A1917] tabular-nums">
              {params.messageAmp.toFixed(1)} V
            </span>
          </div>
          <input
            type="range"
            min={0.5}
            max={2.5}
            step={0.1}
            value={params.messageAmp}
            onChange={(e) =>
              updateParams({ messageAmp: parseFloat(e.target.value) })
            }
            className="w-full accent-[#C85A32] cursor-pointer"
          />
        </div>

        {/* Message Frequency fm */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-[#585651]">Frequency f_m</span>
            <span className="font-bold text-[#1A1917] tabular-nums">
              {params.messageFreq.toFixed(1)} Hz
            </span>
          </div>
          <input
            type="range"
            min={1.0}
            max={5.0}
            step={0.5}
            value={params.messageFreq}
            onChange={(e) =>
              updateParams({ messageFreq: parseFloat(e.target.value) })
            }
            className="w-full accent-[#C85A32] cursor-pointer"
          />
        </div>
      </div>

      {/* Carrier Signal Controls */}
      <div className="pt-3 border-t border-[#E6E4DD] space-y-3">
        <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#1A1917]">
          Carrier Signal c(t)
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-[#585651]">Carrier Amp A_c</span>
            <span className="font-bold text-[#1A1917] tabular-nums">
              {params.carrierAmp.toFixed(1)} V
            </span>
          </div>
          <input
            type="range"
            min={0.5}
            max={3.0}
            step={0.1}
            value={params.carrierAmp}
            onChange={(e) =>
              updateParams({ carrierAmp: parseFloat(e.target.value) })
            }
            className="w-full accent-[#C85A32] cursor-pointer"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-[#585651]">Carrier Freq f_c</span>
            <span className="font-bold text-[#1A1917] tabular-nums">
              {params.carrierFreq.toFixed(1)} Hz
            </span>
          </div>
          <input
            type="range"
            min={16.0}
            max={36.0}
            step={1.0}
            value={params.carrierFreq}
            onChange={(e) =>
              updateParams({ carrierFreq: parseFloat(e.target.value) })
            }
            className="w-full accent-[#C85A32] cursor-pointer"
          />
        </div>
      </div>

      {/* Coherent Demodulation Controls */}
      <div className="pt-3 border-t border-[#E6E4DD] space-y-3">
        <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#1A1917]">
          Coherent Receiver / LPF
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-[#585651]">LO Freq Offset Δf</span>
            <span
              className={`font-bold tabular-nums ${
                Math.abs(params.loFreqOffset) < 0.05
                  ? 'text-[#059669]'
                  : 'text-[#C85A32]'
              }`}
            >
              {params.loFreqOffset >= 0 ? '+' : ''}
              {params.loFreqOffset.toFixed(1)} Hz
            </span>
          </div>
          <input
            type="range"
            min={-4.0}
            max={4.0}
            step={0.5}
            value={params.loFreqOffset}
            onChange={(e) =>
              updateParams({ loFreqOffset: parseFloat(e.target.value) })
            }
            className="w-full accent-[#C85A32] cursor-pointer"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-[#585651]">LO Phase Error Δφ</span>
            <span
              className={`font-bold tabular-nums ${
                Math.abs(params.loPhaseDeg) < 2
                  ? 'text-[#059669]'
                  : 'text-[#C85A32]'
              }`}
            >
              {params.loPhaseDeg}°
            </span>
          </div>
          <input
            type="range"
            min={-180}
            max={180}
            step={5}
            value={params.loPhaseDeg}
            onChange={(e) =>
              updateParams({ loPhaseDeg: parseInt(e.target.value, 10) })
            }
            className="w-full accent-[#C85A32] cursor-pointer"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-[#585651]">LPF Cutoff f_cut</span>
            <span className="font-bold text-[#1A1917] tabular-nums">
              {params.lpfCutoff.toFixed(1)} Hz
            </span>
          </div>
          <input
            type="range"
            min={2.0}
            max={40.0}
            step={0.5}
            value={params.lpfCutoff}
            onChange={(e) =>
              updateParams({ lpfCutoff: parseFloat(e.target.value) })
            }
            className="w-full accent-[#C85A32] cursor-pointer"
          />
        </div>
      </div>

      {/* Time Window Zoom & AM Reference Index */}
      <div className="pt-3 border-t border-[#E6E4DD] space-y-3">
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] font-mono font-bold uppercase text-[#585651]">
            <span>Time Window</span>
            <span className="text-[#1A1917]">0 – {tWindow.toFixed(1)} s</span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {[0.5, 1.0, SSB_DURATION].map((w) => (
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
                {w === SSB_DURATION ? '2.0s Full' : `${w.toFixed(1)}s`}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-[#585651]">AM Ref Index μ</span>
            <span className="font-bold text-[#1A1917] tabular-nums">
              {params.amModIndex.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min={0.2}
            max={1.0}
            step={0.05}
            value={params.amModIndex}
            onChange={(e) =>
              updateParams({ amModIndex: parseFloat(e.target.value) })
            }
            className="w-full accent-[#C85A32] cursor-pointer"
          />
        </div>
      </div>

      {/* Compact Live Telemetry Summary */}
      <div className="p-3 bg-[#FAF9F6] rounded-md border border-[#E6E4DD] space-y-1.5 text-[11px] font-mono">
        <div className="font-bold text-[#1A1917] uppercase tracking-wider text-[10px] pb-1 border-b border-[#E6E4DD]">
          Live Signal Readout
        </div>
        <div className="flex justify-between">
          <span className="text-[#75736E]">Active Band:</span>
          <span className="font-bold text-[#C85A32]">
            {params.sideband === 'usb'
              ? `${simData.usbFreqRange[0].toFixed(1)}–${simData.usbFreqRange[1].toFixed(1)} Hz`
              : `${simData.lsbFreqRange[0].toFixed(1)}–${simData.lsbFreqRange[1].toFixed(1)} Hz`}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#75736E]">Occupied BW:</span>
          <span className="font-bold text-[#059669]">
            {simData.messageBandwidth.toFixed(1)} Hz (50% saved)
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#75736E]">Demod RMSE:</span>
          <span
            className={`font-bold tabular-nums ${
              simData.rmse < 0.05 ? 'text-[#059669]' : 'text-[#C85A32]'
            }`}
          >
            {simData.rmse.toFixed(4)} V ({simData.normalizedRmsePct.toFixed(1)}%)
          </span>
        </div>
      </div>
    </aside>
  );

  // Active Section Visualization Body
  const renderActiveSection = () => {
    const props = {
      sim: simData,
      simTime,
      onSeekTime: handleSeekTime,
      tWindow,
      isGridVisible,
      onUpdateParams: updateParams,
    };

    switch (activeSection) {
      case 'intro':
        return <SsbIntroSection {...props} />;
      case 'time':
        return <SsbTimeDomainSection {...props} />;
      case 'frequency':
        return <SsbFrequencyDomainSection {...props} />;
      case 'demodulation':
        return <SsbDemodulationSection {...props} />;
      case 'comparison':
        return <SsbComparisonTheorySection {...props} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Module Header Bar (Consistent with Signal Lab AM Track) */}
      <div className="pb-5 border-b border-[#E6E4DD] flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="text-xs font-mono font-bold tracking-wider text-[#C85A32] bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/25">
              MODULE 2.3
            </span>
            <span className="text-xs text-[#75736E] font-medium font-mono">
              {subTopic.tag}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1917] flex items-center gap-2.5">
            <ModuleGlyph id="ssb" className="w-6 h-6 shrink-0" accent={true} />
            <span>{subTopic.name}</span>
          </h1>
          <p className="mt-1.5 text-sm text-[#585651] max-w-3xl leading-relaxed">
            Interactive Single Sideband (SSB-SC) modulation, Hilbert transform synthesis, FFT spectral analysis, and coherent product demodulation laboratory.
          </p>
        </div>

        {/* Previous / Next AM Sub-Module Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onNavigateModule('/am/dsb-sc')}
            className="px-3 py-1.5 border border-[#E6E4DD] hover:bg-[#FAF9F6] text-xs font-medium text-[#585651] hover:text-[#1A1917] rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Previous: DSB-SC (2.2)"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>DSB-SC (2.2)</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigateModule('/am/vsb')}
            className="px-3 py-1.5 border border-[#E6E4DD] hover:bg-[#FAF9F6] text-xs font-semibold text-[#1A1917] hover:border-[#C85A32]/40 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Next: VSB (2.4)"
          >
            <span>Next: VSB (2.4)</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 2. Section Dropdown Navigation & Quick Theory Switch */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FAF9F6] p-3 rounded-lg border border-[#E6E4DD]">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#75736E]">
            Analysis Section:
          </span>
          {renderSectionDropdown(!isFullscreen)}
        </div>

        <button
          type="button"
          onClick={() =>
            setActiveSection((prev) =>
              prev === 'comparison' ? 'time' : 'comparison'
            )
          }
          className={`px-3 py-1.5 rounded-md text-xs font-mono font-semibold border transition-colors flex items-center gap-1.5 cursor-pointer ${
            activeSection === 'comparison'
              ? 'bg-[#C85A32] text-white border-[#C85A32]'
              : 'bg-white text-[#585651] border-[#E6E4DD] hover:text-[#1A1917]'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>
            {activeSection === 'comparison'
              ? 'Back to Waveforms'
              : 'BW, Power & Theory'}
          </span>
        </button>
      </div>

      {/* 3. Main Side-by-Side Interactive Simulator (Sticky Controls + Visualization Stage) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-4">
          {renderControlPanel()}
        </div>

        <div className="lg:col-span-8 xl:col-span-9 space-y-4">
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
          aria-label="SSB Modulation Simulator Fullscreen Workspace"
        >
          {/* Fullscreen Top Header */}
          <div className="px-4 py-2.5 bg-white border-b border-[#E6E4DD] flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-mono font-bold tracking-wider text-[#C85A32] bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/25">
                MODULE 2.3 · SSB
              </span>
              {renderSectionDropdown(true)}
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

          {/* Fullscreen Split Body */}
          <div className="flex-1 overflow-y-auto lg:overflow-hidden p-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:h-full">
              <div className="lg:col-span-4 xl:col-span-3 lg:h-full lg:overflow-y-auto pr-0.5">
                {renderControlPanel()}
              </div>
              <div className="lg:col-span-8 xl:col-span-9 lg:h-full lg:overflow-y-auto pr-0.5 space-y-4">
                {renderActiveSection()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
