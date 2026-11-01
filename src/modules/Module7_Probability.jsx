/**
 * Module 7: Probability & Statistics
 * Filename: Module7_Probability.jsx
 * 
 * Modular component slot for Stochastic Foundations & Probability:
 * - Gaussian normal probability density function (PDF) and cumulative distribution (CDF)
 * - Statistical moments: Mean (μ), Variance (σ²), standard deviation
 * - Confidence intervals & distribution area integration
 * - Clean placeholder layout for teammate single-file code blocks
 */

import React, { useState } from 'react';
import { Layers, BookOpen, SlidersHorizontal, Info, Code2 } from 'lucide-react';
import { MathView } from '../components/MathView';
import { SimulationToolbar } from '../components/SimulationToolbar';

export default function Module7_Probability({
  onNavigateHome,
  onNavigateModule,
  isInstructorMode = false,
}) {
  const [isGridVisible, setIsGridVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackState, setPlaybackState] = useState('reset');
  const [speed, setSpeed] = useState('1×');

  // Interactive distribution parameters
  const [meanMu, setMeanMu] = useState(0.0);
  const [stdSigma, setStdSigma] = useState(1.0);
  const [sampleSizeN, setSampleSizeN] = useState(1000);

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
              MODULE 07
            </span>
            <span className="text-xs text-[#75736E] font-medium">Stochastic Fundamentals</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1917]">
            Module 7: Probability & Statistics
          </h1>
          <p className="mt-1.5 text-sm sm:text-base text-[#585651] max-w-3xl leading-relaxed">
            Probability density functions (PDF), cumulative distribution functions (CDF), statistical expectations, variance, and the central limit theorem.
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
                Gaussian Normal Distribution & 1σ Confidence Region
              </h2>
            </div>
            <span className="text-[11px] font-mono text-[#8A8882]">
              μ = {meanMu.toFixed(2)} · σ = {stdSigma.toFixed(2)} · N = {sampleSizeN}
            </span>
          </div>

          {/* Simulation Toolbar */}
          <SimulationToolbar
            playbackState={playbackState}
            onPlay={() => setPlaybackState('playing')}
            onPause={() => setPlaybackState('paused')}
            onReset={() => {
              setPlaybackState('reset');
              setMeanMu(0);
              setStdSigma(1);
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
            {renderBackgroundGrid('prob-canvas-grid')}

            {/* Bell Curve Schematic */}
            <div className="relative z-10 w-full flex flex-col items-center justify-center py-2">
              <svg
                viewBox="0 0 500 200"
                preserveAspectRatio="xMidYMid meet"
                className="w-full h-full max-h-[60vh] select-none"
                aria-label="Gaussian normal probability distribution bell curve schematic"
                role="img"
              >
                {/* Baseline and Center Line */}
                <line x1="40" y1="160" x2="460" y2="160" stroke="#8A8882" strokeWidth="1.5" />
                <line x1="250" y1="25" x2="250" y2="160" stroke="#585651" strokeWidth="1.25" strokeDasharray="3 3" />

                {/* Shaded 1-sigma area */}
                <path
                  d="M 195 160 C 215 130, 230 40, 250 40 C 270 40, 285 130, 305 160 Z"
                  fill="#C85A32"
                  fillOpacity="0.12"
                />

                {/* Bell curve */}
                <path
                  d="M 60 159 C 140 159, 180 40, 250 40 C 320 40, 360 159, 440 159"
                  fill="none"
                  stroke="#C85A32"
                  strokeWidth="2.5"
                />

                <text x="250" y="178" textAnchor="middle" className="text-[10px] font-mono font-bold fill-[#1A1917]">
                  μ (Mean = {meanMu.toFixed(1)})
                </text>
                <text x="195" y="178" textAnchor="middle" className="text-[10px] font-mono fill-[#585651]">
                  μ - σ
                </text>
                <text x="305" y="178" textAnchor="middle" className="text-[10px] font-mono fill-[#585651]">
                  μ + σ
                </text>
                <text x="250" y="110" textAnchor="middle" className="text-[10px] font-mono font-medium fill-[#C85A32]">
                  68.27% of probability density
                </text>
              </svg>
            </div>
          </div>

          {/* Interactive Distribution Sliders */}
          <div className="mt-5 p-4 rounded-md bg-[#FAF9F6] border border-[#E6E4DD] space-y-3">
            <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] font-semibold flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#C85A32]" />
              <span>Statistical Distribution Parameters</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-[#1A1917]">Mean (μ)</span>
                  <span className="font-mono text-[#C85A32] font-semibold">{meanMu.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="-2"
                  max="2"
                  step="0.1"
                  value={meanMu}
                  onChange={(e) => setMeanMu(parseFloat(e.target.value))}
                  className="w-full accent-[#C85A32]"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-[#1A1917]">Standard Deviation (σ)</span>
                  <span className="font-mono text-[#C85A32] font-semibold">{stdSigma.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.4"
                  max="2.5"
                  step="0.1"
                  value={stdSigma}
                  onChange={(e) => setStdSigma(parseFloat(e.target.value))}
                  className="w-full accent-[#C85A32]"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-[#1A1917]">Sample Size (N)</span>
                  <span className="font-mono text-[#C85A32] font-semibold">{sampleSizeN}</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="5000"
                  step="100"
                  value={sampleSizeN}
                  onChange={(e) => setSampleSizeN(parseInt(e.target.value, 10))}
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
                { label: 'Mean / Expectation (μ)', value: `${meanMu.toFixed(2)}` },
                { label: 'Variance (σ²)', value: `${(stdSigma * stdSigma).toFixed(2)}` },
                { label: 'Confidence (1-α)', value: '68.27% (±1σ)' },
                { label: 'Monte Carlo Trials', value: `${sampleSizeN} Pts` },
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
              Gaussian Normal Density Function
            </div>
            <div className="p-3 bg-white rounded border border-[#E6E4DD] text-sm font-semibold text-[#1A1917] overflow-x-auto">
              <MathView math="f_X(x) = \frac{1}{\sigma \sqrt{2\pi}} \exp\left(-\frac{(x - \mu)^2}{2\sigma^2}\right)" displayMode={true} />
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
                'Probability Density (PDF) & Cumulative Distribution (CDF)',
                'Statistical Moments: Mean (μ), Variance (σ²), & Skewness',
                'Central Limit Theorem & Joint Distributions'
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
              <span>Slot: Module7_Probability.jsx</span>
            </div>
            <p className="text-xs text-[#585651] leading-relaxed">
              Drop-in ready! When teammates send their single-file code block for Probability & Statistics, paste it into this file without altering the navigation shell.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
