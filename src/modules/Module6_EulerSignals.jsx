/**
 * Module 6: Euler Identity & Complex Signals
 * Filename: Module6_EulerSignals.jsx
 * 
 * Modular component slot for Complex Signals & Phasor Analysis:
 * - Argand complex plane & rotating phasor vector
 * - Rectangular (In-Phase / Quadrature) to Polar coordinate mapping
 * - Euler's identity e^(jθ) = cos(θ) + j*sin(θ)
 * - Clean placeholder layout for teammate single-file code blocks
 */

import React, { useState } from 'react';
import { Layers, BookOpen, SlidersHorizontal, Info, Code2 } from 'lucide-react';
import { MathView } from '../components/MathView';
import { SimulationToolbar } from '../components/SimulationToolbar';

export default function Module6_EulerSignals({
  onNavigateHome,
  onNavigateModule,
  isInstructorMode = false,
}) {
  const [isGridVisible, setIsGridVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackState, setPlaybackState] = useState('reset');
  const [speed, setSpeed] = useState('1×');

  // Interactive phasor parameters
  const [thetaDeg, setThetaDeg] = useState(45);
  const [phasorMagnitude, setPhasorMagnitude] = useState(1.0);
  const [angularFreq, setAngularFreq] = useState(2.0); // rad/s

  const thetaRad = (thetaDeg * Math.PI) / 180;
  const realPart = phasorMagnitude * Math.cos(thetaRad);
  const imagPart = phasorMagnitude * Math.sin(thetaRad);

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
              MODULE 03
            </span>
            <span className="text-xs text-[#75736E] font-medium">Phasors & Analytic Signals</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1917]">
            Module 3: Euler Identity & Complex Signals
          </h1>
          <p className="mt-1.5 text-sm sm:text-base text-[#585651] max-w-3xl leading-relaxed">
            Complex plane geometry, rectangular and polar representations, Euler’s relation, rotating phasors, and in-phase/quadrature projections.
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
                Argand Complex Plane & Phasor Projections
              </h2>
            </div>
            <span className="text-[11px] font-mono text-[#8A8882]">
              θ = {thetaDeg}° ({thetaRad.toFixed(2)} rad) · |z| = {phasorMagnitude.toFixed(2)}
            </span>
          </div>

          {/* Simulation Toolbar */}
          <SimulationToolbar
            playbackState={playbackState}
            onPlay={() => setPlaybackState('playing')}
            onPause={() => setPlaybackState('paused')}
            onReset={() => {
              setPlaybackState('reset');
              setThetaDeg(45);
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
            {renderBackgroundGrid('euler-canvas-grid')}

            {/* Argand Phasor Schematic */}
            <div className="relative z-10 w-full flex flex-col items-center justify-center py-2">
              <svg
                viewBox="0 0 500 200"
                preserveAspectRatio="xMidYMid meet"
                className="w-full h-full max-h-[60vh] select-none"
                aria-label="Argand complex plane phasor schematic"
                role="img"
              >
                {/* Unit Circle Guide */}
                <circle cx="250" cy="100" r="65" fill="#FAF9F6" stroke="#D1CFCE" strokeWidth="1.25" strokeDasharray="3 3" />

                {/* Re / Im Coordinate Axes */}
                <line x1="140" y1="100" x2="360" y2="100" stroke="#8A8882" strokeWidth="1.5" />
                <line x1="250" y1="15" x2="250" y2="185" stroke="#8A8882" strokeWidth="1.5" />
                <text x="365" y="104" className="text-[10px] font-mono font-medium fill-[#585651]">Re (cos θ)</text>
                <text x="250" y="12" textAnchor="middle" className="text-[10px] font-mono font-medium fill-[#585651]">Im (sin θ)</text>

                {/* Rotating Phasor Vector calculated from theta */}
                {(() => {
                  const r = 65 * phasorMagnitude;
                  const px = 250 + r * Math.cos(thetaRad);
                  const py = 100 - r * Math.sin(thetaRad);
                  return (
                    <g>
                      <line x1="250" y1="100" x2={px} y2={py} stroke="#C85A32" strokeWidth="2.5" />
                      <circle cx={px} cy={py} r="3.5" fill="#C85A32" />
                      {/* Orthogonal Projections */}
                      <line x1={px} y1={py} x2={px} y2="100" stroke="#585651" strokeWidth="1.25" strokeDasharray="2 2" />
                      <line x1="250" y1={py} x2={px} y2={py} stroke="#585651" strokeWidth="1.25" strokeDasharray="2 2" />
                    </g>
                  );
                })()}

                {/* Angle arc */}
                <path d="M 275 100 A 25 25 0 0 0 268 82" fill="none" stroke="#C85A32" strokeWidth="1.5" />
                <text x="280" y="86" className="text-[10px] font-mono fill-[#C85A32]">θ = {thetaDeg}°</text>
                <text x="325" y="45" className="text-[11px] font-mono font-bold fill-[#1A1917]">
                  z = {realPart.toFixed(2)} + j{imagPart.toFixed(2)}
                </text>
              </svg>
            </div>
          </div>

          {/* Interactive Phasor Parameter Sliders */}
          <div className="mt-5 p-4 rounded-md bg-[#FAF9F6] border border-[#E6E4DD] space-y-3">
            <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] font-semibold flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#C85A32]" />
              <span>Phasor Modulator Controls</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-[#1A1917]">Phase Angle (θ)</span>
                  <span className="font-mono text-[#C85A32] font-semibold">{thetaDeg}°</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="5"
                  value={thetaDeg}
                  onChange={(e) => setThetaDeg(parseInt(e.target.value, 10))}
                  className="w-full accent-[#C85A32]"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-[#1A1917]">Magnitude (|z|)</span>
                  <span className="font-mono text-[#C85A32] font-semibold">{phasorMagnitude.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="1.5"
                  step="0.05"
                  value={phasorMagnitude}
                  onChange={(e) => setPhasorMagnitude(parseFloat(e.target.value))}
                  className="w-full accent-[#C85A32]"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-[#1A1917]">Angular Vel (ω)</span>
                  <span className="font-mono text-[#C85A32] font-semibold">{angularFreq} rad/s</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="5.0"
                  step="0.5"
                  value={angularFreq}
                  onChange={(e) => setAngularFreq(parseFloat(e.target.value))}
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
                { label: 'Modulus (|z|)', value: `${phasorMagnitude.toFixed(2)}` },
                { label: 'In-Phase (I)', value: `Re = ${realPart.toFixed(2)}` },
                { label: 'Quadrature (Q)', value: `Im = ${imagPart.toFixed(2)}` },
                { label: 'Angular Vel (ω)', value: `${angularFreq} rad/s` },
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
              Euler's Identity & Complex Exponential
            </div>
            <div className="p-3 bg-white rounded border border-[#E6E4DD] text-sm font-semibold text-[#1A1917] overflow-x-auto">
              <MathView math="e^{j\theta} = \cos(\theta) + j\sin(\theta)" displayMode={true} />
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
                "Euler's Geometric Identity & Phasor Rotation",
                'Cartesian (Re/Im) to Polar (r, θ) Coordinate Conversion',
                'Negative Frequencies & Analytic Signal Representation'
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
              <span>Slot: Module6_EulerSignals.jsx</span>
            </div>
            <p className="text-xs text-[#585651] leading-relaxed">
              Drop-in ready! When teammates send their single-file code block for Euler Identity & Complex Signals, paste it into this file without altering the navigation shell.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
