/**
 * Module 4: Signal Explorer
 * Filename: Module4_SignalExplorer.jsx
 * 
 * Modular component slot for Continuous & Discrete Signal Exploration:
 * - Continuous waveforms x(t) and uniform discrete sampling x[n] = x(nTs)
 * - Standard signal families (Sinusoid, Chirp, Sinc, Rectangular)
 * - Real-time amplitude, frequency, and phase parameter modulation
 * - Clean placeholder layout for teammate single-file code blocks
 */

import React, { useState } from 'react';
import { Layers, BookOpen, SlidersHorizontal, Info, Code2 } from 'lucide-react';
import { MathView } from '../components/MathView';
import { SimulationToolbar } from '../components/SimulationToolbar';

export default function Module4_SignalExplorer({
  onNavigateHome,
  onNavigateModule,
  isInstructorMode = false,
}) {
  const [isGridVisible, setIsGridVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackState, setPlaybackState] = useState('reset');
  const [speed, setSpeed] = useState('1×');

  // Interactive signal parameters
  const [amplitude, setAmplitude] = useState(1.0);
  const [frequency, setFrequency] = useState(1.0);
  const [phaseDeg, setPhaseDeg] = useState(0);
  const [samplingRate, setSamplingRate] = useState(16);

  // Background Grid SVG
  const renderBackgroundGrid = (idPrefix) => {
    if (!isGridVisible) return null;
    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none select-none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <pattern id={`${idPrefix}-minor`} width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#E2DFD6" strokeWidth="1" />
          </pattern>
          <pattern id={`${idPrefix}-major`} width="96" height="96" patternUnits="userSpaceOnUse">
            <rect width="96" height="96" fill={`url(#${idPrefix}-minor)`} />
            <path d="M 96 0 L 0 0 0 96" fill="none" stroke="#C8C4B8" strokeWidth="1.25" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${idPrefix}-major)`} />
      </svg>
    );
  };

  return (
    <div className="w-full">
      {/* Module Title & Context Banner */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-[#E6E4DD]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono font-bold tracking-wider text-[#C85A32] bg-[#FBF4F0] px-2.5 py-0.5 rounded border border-[#C85A32]/20">
              MODULE 04
            </span>
            <span className="text-xs text-[#75736E] font-medium">Continuous & Discrete Signals</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1917]">
            Module 4: Signal Explorer
          </h1>
          <p className="mt-1.5 text-sm sm:text-base text-[#585651] max-w-3xl leading-relaxed">
            Continuous-time and discrete-time signals, signal families (sinusoid, chirp, sinc, rect), transformation properties, and sampling behavior.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-mono text-[#75736E] bg-[#FAF9F6] border border-[#E6E4DD] px-3 py-1.5 rounded-md">
            Slot Status: <strong className="text-[#C85A32]">Ready for Team Code</strong>
          </span>
        </div>
      </div>

      {/* Main Simulation / Visualization Window */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: Simulation Stage & Parameter Controls */}
        <div className="lg:col-span-8 bg-white rounded-lg border border-[#E6E4DD] p-5 sm:p-6 shadow-xs flex flex-col">
          {/* Header & Status */}
          <div className="flex items-center justify-between pb-4 border-b border-[#E6E4DD] mb-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C85A32]" />
              <h2 className="text-sm font-bold tracking-tight text-[#1A1917] uppercase font-mono">
                Continuous Waveform x(t) & Discrete Sampling x[n]
              </h2>
            </div>
            <span className="text-[11px] font-mono text-[#8A8882]">
              A = {amplitude.toFixed(1)} · f₀ = {frequency.toFixed(1)} Hz · Fs = {samplingRate} Hz
            </span>
          </div>

          {/* Simulation Toolbar */}
          <SimulationToolbar
            playbackState={playbackState}
            onPlay={() => setPlaybackState('playing')}
            onPause={() => setPlaybackState('paused')}
            onReset={() => {
              setPlaybackState('reset');
            }}
            speed={speed}
            onSpeedChange={setSpeed}
            isGridVisible={isGridVisible}
            onToggleGrid={() => setIsGridVisible(!isGridVisible)}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
            isLiveSimulationReady={false}
            className="mb-4"
          />

          {/* Canvas Viewport Stage */}
          <div className="relative w-full min-h-[290px] bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden flex flex-col items-center justify-center p-4">
            {renderBackgroundGrid('sig-canvas-grid')}

            {/* Continuous and Discrete Signal Schematic */}
            <div className="relative z-10 w-full flex flex-col items-center justify-center py-2">
              <svg
                viewBox="0 0 500 200"
                preserveAspectRatio="xMidYMid meet"
                className="w-full h-full max-h-[60vh] select-none"
                aria-label="Continuous and discrete signal waveform schematic"
                role="img"
              >
                {/* Permanent Axes & Labels */}
                <line x1="30" y1="100" x2="470" y2="100" stroke="#8A8882" strokeWidth="1.5" />
                <line x1="60" y1="26" x2="60" y2="174" stroke="#8A8882" strokeWidth="1.5" />
                <text x="60" y="20" textAnchor="middle" className="text-[11px] font-mono font-bold fill-[#1A1917]">
                  x(t)
                </text>
                <text x="475" y="104" textAnchor="start" className="text-[11px] font-mono font-bold fill-[#1A1917]">
                  t
                </text>

                {/* Continuous Waveform */}
                <path
                  d="M 60 100 Q 110 30, 160 100 T 260 100 T 360 100 T 460 100"
                  fill="none"
                  stroke="#C85A32"
                  strokeWidth="2.5"
                />

                {/* Discrete Sampling Stems */}
                {[60, 85, 110, 135, 160, 185, 210, 235, 260, 285, 310, 335, 360, 385, 410, 435, 460].map((x, i) => {
                  const y = 100 - 55 * Math.sin(((x - 60) / 200) * 2 * Math.PI);
                  return (
                    <g key={i}>
                      <line x1={x} y1="100" x2={x} y2={y} stroke="#585651" strokeWidth="1.25" strokeDasharray="1.5 1.5" />
                      <circle cx={x} cy={y} r="2.5" fill="#1A1917" />
                    </g>
                  );
                })}

                <text x="260" y="188" textAnchor="middle" className="text-[11px] font-mono font-medium fill-[#484642]">
                  Continuous waveform x(t) with uniform sampling x[n] = x(nTs)
                </text>
              </svg>
            </div>
          </div>

          {/* Interactive Signal Controls */}
          <div className="mt-5 p-4 rounded-md bg-[#FAF9F6] border border-[#E6E4DD] space-y-3">
            <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] font-semibold flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#C85A32]" />
              <span>Waveform Synthesis Parameters</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-[#1A1917]">Amplitude (A)</span>
                  <span className="font-mono text-[#C85A32] font-semibold">{amplitude.toFixed(1)}</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="2.0"
                  step="0.1"
                  value={amplitude}
                  onChange={(e) => setAmplitude(parseFloat(e.target.value))}
                  className="w-full accent-[#C85A32]"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-[#1A1917]">Frequency (f₀)</span>
                  <span className="font-mono text-[#C85A32] font-semibold">{frequency.toFixed(1)} Hz</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="4.0"
                  step="0.5"
                  value={frequency}
                  onChange={(e) => setFrequency(parseFloat(e.target.value))}
                  className="w-full accent-[#C85A32]"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-[#1A1917]">Sampling Rate (Fs)</span>
                  <span className="font-mono text-[#C85A32] font-semibold">{samplingRate} Hz</span>
                </div>
                <input
                  type="range"
                  min="4"
                  max="32"
                  step="2"
                  value={samplingRate}
                  onChange={(e) => setSamplingRate(parseInt(e.target.value, 10))}
                  className="w-full accent-[#C85A32]"
                />
              </div>
            </div>
          </div>

          {/* Laboratory Parameter Matrix */}
          <div className="mt-5 pt-4 border-t border-[#E6E4DD]">
            <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-2.5 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#585651]" />
              <span>Standard Laboratory Parameters</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { label: 'Amplitude (A)', value: `${amplitude.toFixed(1)} V` },
                { label: 'Frequency (f₀)', value: `${frequency.toFixed(1)} Hz` },
                { label: 'Phase Offset (ϕ)', value: `${phaseDeg}°` },
                { label: 'Sampling Interval', value: `Ts = ${(1 / samplingRate).toFixed(3)}s` },
              ].map((p, i) => (
                <div key={i} className="p-2.5 rounded bg-[#FAF9F6] border border-[#E6E4DD]">
                  <div className="text-[10px] font-mono text-[#8A8882] uppercase">{p.label}</div>
                  <div className="text-xs font-semibold text-[#1A1917] mt-0.5 font-mono truncate">{p.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Mathematical Formulation & Teammate Slot */}
        <div className="lg:col-span-4 space-y-5">
          {/* Analytical Formulation Card */}
          <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-5 shadow-xs">
            <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#585651]" />
              <span>Analytical Formulation</span>
            </div>
            <div className="text-xs text-[#585651] mb-2 font-medium">
              Generalized Continuous-Time Harmonic
            </div>
            <div className="p-3 bg-white rounded border border-[#E6E4DD] text-sm font-semibold text-[#1A1917] overflow-x-auto">
              <MathView math="x(t) = A \cos(2\pi f_0 t + \phi)" displayMode={true} />
            </div>
          </div>

          {/* Curricular Focus Areas */}
          <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-5 shadow-xs">
            <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-3 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#585651]" />
              <span>Curricular Topics</span>
            </div>
            <ul className="space-y-2.5">
              {[
                'Continuous & Discrete Time Formulations',
                'Standard Signal Families (Sinusoid, Chirp, Sinc, Rect)',
                'Transformations, Symmetry & Energy vs. Power'
              ].map((topic, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-[#484642] leading-snug">
                  <span className="font-mono text-[#C85A32] font-semibold text-xs mt-0.5">0{idx + 1}</span>
                  <span>{topic}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* ========================================================= */}
          {/* TEAM DROP-IN CODE BLOCK EXTENSION SLOT                    */}
          {/* Teammates can append or replace custom single-file modules*/}
          {/* ========================================================= */}
          <div className="rounded-lg border-2 border-dashed border-[#C85A32]/40 bg-[#FBF4F0]/60 p-4">
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#C85A32] mb-1.5">
              <Code2 className="w-4 h-4" />
              <span>Slot: Module4_SignalExplorer.jsx</span>
            </div>
            <p className="text-xs text-[#585651] leading-relaxed">
              Drop-in ready! When teammates send their single-file code block for Signal Explorer, paste it into this file without altering the navigation shell.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
