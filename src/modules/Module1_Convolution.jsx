/**
 * Module 1: Convolution & System Response
 * Filename: Module1_Convolution.jsx
 * 
 * Modular component slot for LTI System Convolution:
 * - Graphical convolution integral & sliding kernel overlap
 * - Continuous-time input x(t), impulse response h(t), and output y(t)
 * - Configurable laboratory parameters & KaTeX formulation
 * - Clean placeholder layout for teammate single-file code blocks
 */

import React, { useState, useMemo } from 'react';
import { Layers, BookOpen, SlidersHorizontal, Info, Code2, ArrowRight } from 'lucide-react';
import { MathView } from '../components/MathView';
import { SimulationToolbar } from '../components/SimulationToolbar';

export default function Module1_Convolution({
  onNavigateHome,
  onNavigateModule,
  isInstructorMode = false,
}) {
  const [isGridVisible, setIsGridVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackState, setPlaybackState] = useState('reset');
  const [speed, setSpeed] = useState('1×');

  // Interactive Convolution parameters
  const [timeShiftTau, setTimeShiftTau] = useState(0.8);
  const [kernelType, setKernelType] = useState('rect'); // 'rect' | 'exponential' | 'gaussian'
  const [systemDamping, setSystemDamping] = useState(0.7);

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
            <span className="text-xs text-[#75736E] font-medium">LTI Systems & Filtering</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1917]">
            Module 4: Convolution & System Response
          </h1>
          <p className="mt-1.5 text-sm sm:text-base text-[#585651] max-w-3xl leading-relaxed">
            Linear Time-Invariant (LTI) system characterization, impulse response $h(t)$, sliding convolution integral, and filter step responses.
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
                LTI System Block Diagram & Convolution Overlap
              </h2>
            </div>
            <span className="text-[11px] font-mono text-[#8A8882]">
              τ = {timeShiftTau.toFixed(2)}s · {kernelType.toUpperCase()}
            </span>
          </div>

          {/* Simulation Toolbar */}
          <SimulationToolbar
            playbackState={playbackState}
            onPlay={() => setPlaybackState('playing')}
            onPause={() => setPlaybackState('paused')}
            onReset={() => {
              setPlaybackState('reset');
              setTimeShiftTau(0.8);
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
            {renderBackgroundGrid('conv-canvas-grid')}

            {/* Continuous Convolution Schematic */}
            <div className="relative z-10 w-full flex flex-col items-center justify-center py-2">
              <svg
                viewBox="0 0 500 200"
                preserveAspectRatio="xMidYMid meet"
                className="w-full h-full max-h-[60vh] select-none"
                aria-label="LTI System convolution integral block diagram"
                role="img"
              >
                {/* Input Signal Arrow */}
                <line x1="40" y1="100" x2="150" y2="100" stroke="#585651" strokeWidth="2" />
                <polygon points="150,100 142,96 142,104" fill="#585651" />
                <text x="85" y="85" textAnchor="middle" className="text-[11px] font-mono font-semibold fill-[#1A1917]">
                  Input x(t)
                </text>

                {/* LTI System Central Box */}
                <rect x="150" y="55" width="200" height="90" rx="6" fill="#FFFFFF" stroke="#D1CFCE" strokeWidth="1.5" />
                <text x="250" y="85" textAnchor="middle" className="text-[11px] font-mono font-bold fill-[#1A1917]">
                  LTI SYSTEM
                </text>
                <text x="250" y="105" textAnchor="middle" className="text-[10px] font-mono font-medium fill-[#C85A32]">
                  Impulse response h(t)
                </text>
                <text x="250" y="125" textAnchor="middle" className="text-[9px] font-mono fill-[#75736E]">
                  Linear · Time-Invariant
                </text>

                {/* Output Convolved Signal Arrow */}
                <line x1="350" y1="100" x2="455" y2="100" stroke="#C85A32" strokeWidth="2" />
                <polygon points="455,100 447,96 447,104" fill="#C85A32" />
                <text x="410" y="85" textAnchor="middle" className="text-[11px] font-mono font-semibold fill-[#C85A32]">
                  y(t) = x(t) * h(t)
                </text>
              </svg>
            </div>
          </div>

          {/* Interactive Kernel & Shift Parameter Sliders */}
          <div className="mt-5 p-4 rounded-md bg-[#FAF9F6] border border-[#E6E4DD] space-y-3">
            <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] font-semibold flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#C85A32]" />
              <span>Interactive Kernel Parameters</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#1A1917] mb-1">Impulse Response h(t)</label>
                <select
                  value={kernelType}
                  onChange={(e) => setKernelType(e.target.value)}
                  className="w-full text-xs bg-white border border-[#E6E4DD] rounded px-2.5 py-1.5 text-[#1A1917]"
                >
                  <option value="rect">Rectangular Pulse Kernel</option>
                  <option value="exponential">Exponential Decay e^(-at)</option>
                  <option value="gaussian">Gaussian Smoothing Kernel</option>
                </select>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-[#1A1917]">Time Shift (τ)</span>
                  <span className="font-mono text-[#C85A32] font-semibold">{timeShiftTau}s</span>
                </div>
                <input
                  type="range"
                  min="-2"
                  max="2"
                  step="0.1"
                  value={timeShiftTau}
                  onChange={(e) => setTimeShiftTau(parseFloat(e.target.value))}
                  className="w-full accent-[#C85A32]"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-[#1A1917]">Damping Factor (ζ)</span>
                  <span className="font-mono text-[#C85A32] font-semibold">{systemDamping}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.5"
                  step="0.1"
                  value={systemDamping}
                  onChange={(e) => setSystemDamping(parseFloat(e.target.value))}
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
                { label: 'Time Shift (τ)', value: `${timeShiftTau} s` },
                { label: 'Kernel Duration', value: '1.20 s' },
                { label: 'Damping Factor (ζ)', value: `${systemDamping}` },
                { label: 'Cutoff Freq (ωc)', value: '10.0 rad/s' },
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
              Continuous Convolution Integral
            </div>
            <div className="p-3 bg-white rounded border border-[#E6E4DD] text-sm font-semibold text-[#1A1917] overflow-x-auto">
              <MathView math="y(t) = (x * h)(t) = \int_{-\infty}^{\infty} x(\tau) h(t - \tau) \, d\tau" displayMode={true} />
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
                'Linear Time-Invariant (LTI) System Characterization',
                'Graphical Convolution Integral & Sliding Overlap',
                'Impulse Response h(t), Step Response, & Filter Causality'
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
              <span>Slot: Module1_Convolution.jsx</span>
            </div>
            <p className="text-xs text-[#585651] leading-relaxed">
              Drop-in ready! When teammates send their single-file code block for Convolution, paste it into this file without altering the navigation shell.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
