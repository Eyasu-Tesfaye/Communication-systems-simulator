/**
 * Module 3: Random Process Properties
 * Filename: Module3_RandomProcess.jsx
 * 
 * Modular component slot for Random Process Properties:
 * - Stochastic ensemble realizations & sample paths
 * - Wide-Sense Stationarity (WSS) & Ergodicity evaluation
 * - Time averages vs. Ensemble averages
 * - Clean placeholder layout for teammate single-file code blocks
 */

import React, { useState } from 'react';
import { Layers, BookOpen, SlidersHorizontal, Info, Code2, RefreshCw } from 'lucide-react';
import { MathView } from '../components/MathView';
import { SimulationToolbar } from '../components/SimulationToolbar';

export default function Module3_RandomProcess({
  onNavigateHome,
  onNavigateModule,
  isInstructorMode = false,
}) {
  const [isGridVisible, setIsGridVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackState, setPlaybackState] = useState('reset');
  const [speed, setSpeed] = useState('1×');

  // Interactive parameters
  const [ensembleCount, setEnsembleCount] = useState(5);
  const [noiseVariance, setNoiseVariance] = useState(0.4);
  const [stationarityType, setStationarityType] = useState('wss'); // 'wss' | 'non-stationary'

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
            <span className="text-xs text-[#75736E] font-medium">Stationarity & Ergodicity</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1917]">
            Module 3: Random Process Properties
          </h1>
          <p className="mt-1.5 text-sm sm:text-base text-[#585651] max-w-3xl leading-relaxed">
            Stochastic ensemble realizations, wide-sense stationarity (WSS), strict-sense stationarity, and ergodic relationships between time and ensemble averages.
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
                Stochastic Ensemble Realizations & Sample Paths
              </h2>
            </div>
            <span className="text-[11px] font-mono text-[#8A8882]">
              M = {ensembleCount} REALIZATIONS · {stationarityType.toUpperCase()}
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
            {renderBackgroundGrid('rp-canvas-grid')}

            {/* Stochastic Ensemble Schematic */}
            <div className="relative z-10 w-full flex flex-col items-center justify-center py-2">
              <svg
                viewBox="0 0 500 200"
                preserveAspectRatio="xMidYMid meet"
                className="w-full h-full max-h-[60vh] select-none"
                aria-label="Stochastic ensemble realizations and wide-sense stationarity schematic"
                role="img"
              >
                <line x1="50" y1="100" x2="450" y2="100" stroke="#8A8882" strokeWidth="1.5" />
                <line x1="80" y1="20" x2="80" y2="180" stroke="#8A8882" strokeWidth="1.5" />

                {/* Ensemble Realizations */}
                <path d="M 80 80 Q 140 50, 200 95 T 320 70 T 440 110" fill="none" stroke="#75736E" strokeWidth="1.5" opacity="0.6" />
                <path d="M 80 120 Q 150 140, 220 100 T 340 130 T 440 85" fill="none" stroke="#585651" strokeWidth="1.5" opacity="0.8" />
                <path d="M 80 95 Q 160 70, 240 115 T 350 85 T 440 102" fill="none" stroke="#C85A32" strokeWidth="2.5" />
                <text x="445" y="104" className="text-[10px] font-mono font-bold fill-[#C85A32]">X⁽¹⁾(t)</text>
                <text x="80" y="15" textAnchor="middle" className="text-[10px] font-mono font-bold fill-[#1A1917]">X(t, ξ)</text>
                <text x="250" y="185" textAnchor="middle" className="text-[10px] font-mono font-medium fill-[#484642]">
                  Stochastic Ensemble Realizations · Wide-Sense Stationary Property
                </text>
              </svg>
            </div>
          </div>

          {/* Interactive Ensemble Controls */}
          <div className="mt-5 p-4 rounded-md bg-[#FAF9F6] border border-[#E6E4DD] space-y-3">
            <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] font-semibold flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#C85A32]" />
              <span>Ensemble Synthesis Controls</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#1A1917] mb-1">Process Regime</label>
                <select
                  value={stationarityType}
                  onChange={(e) => setStationarityType(e.target.value)}
                  className="w-full text-xs bg-white border border-[#E6E4DD] rounded px-2.5 py-1.5 text-[#1A1917]"
                >
                  <option value="wss">Wide-Sense Stationary (WSS)</option>
                  <option value="non-stationary">Time-Varying Mean (Non-Stationary)</option>
                </select>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-[#1A1917]">Realizations (M)</span>
                  <span className="font-mono text-[#C85A32] font-semibold">{ensembleCount}</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="12"
                  step="1"
                  value={ensembleCount}
                  onChange={(e) => setEnsembleCount(parseInt(e.target.value, 10))}
                  className="w-full accent-[#C85A32]"
                />
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-[#1A1917]">Noise Variance (σ²)</span>
                  <span className="font-mono text-[#C85A32] font-semibold">{noiseVariance}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.1"
                  value={noiseVariance}
                  onChange={(e) => setNoiseVariance(parseFloat(e.target.value))}
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
                { label: 'Trajectory Count (M)', value: `${ensembleCount}` },
                { label: 'Time Horizon (T)', value: '10.0 s' },
                { label: 'Stationarity Margin', value: 'Δμ < 0.05' },
                { label: 'Correlation Lag (τ)', value: '± 2.5 s' },
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
              Wide-Sense Stationarity (WSS) Conditions
            </div>
            <div className="p-3 bg-white rounded border border-[#E6E4DD] text-sm font-semibold text-[#1A1917] overflow-x-auto">
              <MathView math="\mathbb{E}[X(t)] = \mu_X, \quad R_X(t_1, t_2) = R_X(t_1 - t_2)" displayMode={true} />
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
                'Ensemble Realizations vs. Time-Series Trajectories',
                'Strict-Sense & Wide-Sense Stationarity (WSS)',
                'Ergodic Theorems for Mean & Autocorrelation Consistency'
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
              <span>Slot: Module3_RandomProcess.jsx</span>
            </div>
            <p className="text-xs text-[#585651] leading-relaxed">
              Drop-in ready! When teammates send their single-file code block for Random Processes, paste it into this file without altering the navigation shell.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
