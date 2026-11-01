import { CorrelationSpectrumModule } from '../components/correlation-spectrum/CorrelationSpectrumModule';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Layers, BookOpen, SlidersHorizontal, Info, Code2, Activity, Play, Pause, RotateCcw } from 'lucide-react';
import { MathView } from '../components/MathView';
import { SimulationToolbar } from '../components/SimulationToolbar';

export default function Module5_Correlation({
  onNavigateHome,
  onNavigateModule,
  isInstructorMode = false,
}) {
  const [isGridVisible, setIsGridVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackState, setPlaybackState] = useState('paused');
  const [speed, setSpeed] = useState('1×');

  // Interactive correlation parameters
  const [signalType, setSignalType] = useState('harmonic'); // 'harmonic' | 'narrowband' | 'rect_pulse' | 'noise'
  const [lagTau, setLagTau] = useState(0.0); // seconds (-3.0 to +3.0)
  const [noiseLevel, setNoiseLevel] = useState(0.3); // noise variance
  const [windowType, setWindowType] = useState('hamming'); // 'hamming' | 'hann' | 'rectangular'
  const [welchOverlap, setWelchOverlap] = useState(50); // %

  // Animation sweep loop
  const animFrameRef = useRef(null);
  const sweepDirRef = useRef(1);

  useEffect(() => {
    if (playbackState === 'playing') {
      const mult = speed === '0.25×' ? 0.25 : speed === '0.5×' ? 0.5 : speed === '2×' ? 2 : speed === '4×' ? 4 : 1;
      let lastTime = performance.now();

      const animate = (now) => {
        const dt = (now - lastTime) / 1000;
        lastTime = now;

        setLagTau((prev) => {
          let next = prev + sweepDirRef.current * dt * 1.5 * mult;
          if (next > 3.0) {
            next = 3.0;
            sweepDirRef.current = -1;
          } else if (next < -3.0) {
            next = -3.0;
            sweepDirRef.current = 1;
          }
          return next;
        });

        animFrameRef.current = requestAnimationFrame(animate);
      };

      animFrameRef.current = requestAnimationFrame(animate);
    } else {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [playbackState, speed]);

  // Compute Autocorrelation Curve and Power Spectral Density (PSD)
  const {
    rxxPath,
    psdPath,
    currentRxxVal,
    peakPower,
    markerX,
    markerY,
  } = useMemo(() => {
    const width = 500;
    const height = 180;
    const originX = width / 2; // tau = 0 at center
    const baselineY = 140;
    const peakY = 40;
    const ampScale = 95;

    // Mathematical Autocorrelation function Rxx(tau)
    const computeRxx = (tau) => {
      const absTau = Math.abs(tau);
      let signalCorr = 0;

      if (signalType === 'harmonic') {
        // Harmonic sinusoid tone: Rxx(tau) = 0.5 * cos(2*pi*f0*tau) * exp(-0.15*|tau|)
        signalCorr = 0.55 * Math.cos(2 * Math.PI * 0.9 * absTau) * Math.exp(-0.12 * absTau);
      } else if (signalType === 'narrowband') {
        // Damped oscillator / Lorentzian envelope
        signalCorr = 0.6 * Math.exp(-1.1 * absTau) * Math.cos(2 * Math.PI * 1.4 * absTau);
      } else if (signalType === 'rect_pulse') {
        // Triangle correlation resulting from rect pulse
        const T = 1.6;
        signalCorr = absTau < T ? 0.65 * (1 - absTau / T) : 0;
      } else {
        // White noise: peak at 0, near zero elsewhere
        signalCorr = absTau < 0.15 ? 0.65 * Math.cos((absTau / 0.15) * (Math.PI / 2)) : 0;
      }

      // Noise variance contribution at tau = 0
      const noiseCorr = absTau < 0.18 ? noiseLevel * 0.45 * (1 - absTau / 0.18) : 0;
      return signalCorr + noiseCorr;
    };

    // Build Rxx(tau) path from tau = -3 to +3
    const numPts = 200;
    let rPath = '';
    const tauMin = -3.0;
    const tauMax = 3.0;

    for (let i = 0; i < numPts; i++) {
      const tau = tauMin + (i / (numPts - 1)) * (tauMax - tauMin);
      const val = computeRxx(tau);
      const x = 30 + (i / (numPts - 1)) * (width - 60);
      const y = baselineY - val * ampScale;
      rPath += (i === 0 ? 'M ' : ' L ') + `${x.toFixed(1)} ${y.toFixed(1)}`;
    }

    // Current point at selected lagTau
    const currVal = computeRxx(lagTau);
    const mX = originX + (lagTau / 3.0) * ((width - 60) / 2);
    const mY = baselineY - currVal * ampScale;
    const pPower = computeRxx(0);

    // Build Wiener-Khinchin PSD Sxx(f) curve
    let pPath = '';
    const numFreqPts = 120;
    for (let i = 0; i < numFreqPts; i++) {
      const f = (i / (numFreqPts - 1)) * 4.0; // 0 to 4 Hz
      let psdVal = 0;

      // Window attenuation factor
      const winFactor = windowType === 'hamming' ? 0.95 : windowType === 'hann' ? 0.88 : 1.05;

      if (signalType === 'harmonic') {
        // Spectral peak at f0 = 0.9 Hz
        const df = Math.abs(f - 0.9);
        const peakWidth = windowType === 'rectangular' ? 0.15 : 0.25;
        const mainPeak = Math.exp(-Math.pow(df / peakWidth, 2)) * 0.7 * winFactor;
        // Noise floor
        psdVal = mainPeak + noiseLevel * 0.15 * (1 - welchOverlap * 0.004);
      } else if (signalType === 'narrowband') {
        const df = Math.abs(f - 1.4);
        psdVal = Math.exp(-Math.pow(df / 0.4, 2)) * 0.65 * winFactor + noiseLevel * 0.1;
      } else if (signalType === 'rect_pulse') {
        // Sinc squared PSD
        const xVal = Math.PI * f * 0.8;
        const sinc = xVal === 0 ? 1 : Math.sin(xVal) / xVal;
        psdVal = 0.6 * (sinc * sinc) + noiseLevel * 0.08;
      } else {
        // Flat white noise PSD
        psdVal = noiseLevel * 0.45 * winFactor;
      }

      const x = 30 + (i / (numFreqPts - 1)) * (width - 60);
      const y = baselineY - Math.min(1.2, psdVal) * ampScale;
      pPath += (i === 0 ? 'M ' : ' L ') + `${x.toFixed(1)} ${y.toFixed(1)}`;
    }

    return {
      rxxPath: rPath,
      psdPath: pPath,
      currentRxxVal: currVal,
      peakPower: pPower,
      markerX: mX,
      markerY: mY,
    };
  }, [signalType, lagTau, noiseLevel, windowType, welchOverlap]);

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
              MODULE 05
            </span>
            <span className="text-xs text-[#75736E] font-medium">Spectral Estimation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1917]">
            Module 5: Correlation & Spectral Analysis
          </h1>
          <p className="mt-1.5 text-sm sm:text-base text-[#585651] max-w-3xl leading-relaxed">
            Autocorrelation R_xx(τ), cross-correlation R_xy(τ), power spectral density (PSD), and the fundamental Wiener–Khinchin transform pair.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-mono text-[#75736E] bg-[#FAF9F6] border border-[#E6E4DD] px-3 py-1.5 rounded-md">
            Status: <strong className="text-[#C85A32]">Interactive & Calibrated</strong>
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
                Autocorrelation R_xx(τ) & Wiener-Khinchin PSD S_xx(f)
              </h2>
            </div>
            <span className="text-[11px] font-mono text-[#8A8882]">
              LAG τ = {lagTau >= 0 ? `+${lagTau.toFixed(2)}` : lagTau.toFixed(2)}s · P_x = {peakPower.toFixed(2)} W
            </span>
          </div>

          {/* Simulation Toolbar */}
          <SimulationToolbar
            playbackState={playbackState}
            onPlay={() => setPlaybackState('playing')}
            onPause={() => setPlaybackState('paused')}
            onReset={() => {
              setPlaybackState('paused');
              setLagTau(0.0);
            }}
            speed={speed}
            onSpeedChange={setSpeed}
            isGridVisible={isGridVisible}
            onToggleGrid={() => setIsGridVisible(!isGridVisible)}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
            isLiveSimulationReady={true}
            className="mb-4"
          />

          {/* Canvas Viewport Stage */}
          <div className="relative w-full min-h-[300px] bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden flex flex-col items-center justify-center p-3 sm:p-4">
            {renderBackgroundGrid('corr-canvas-grid')}

            <div className="relative z-10 w-full flex flex-col gap-4">
              {/* Plot 1: Autocorrelation Function R_xx(tau) */}
              <div className="bg-white/95 backdrop-blur-xs rounded border border-[#E6E4DD] p-3 shadow-2xs">
                <div className="flex items-center justify-between text-xs font-mono mb-1 text-[#585651]">
                  <span className="font-semibold text-[#1A1917]">Autocorrelation Function R_xx(τ)</span>
                  <span className="text-[#C85A32] font-semibold">
                    R_xx({lagTau.toFixed(2)}) = {currentRxxVal.toFixed(3)} (Symmetric)
                  </span>
                </div>

                <svg viewBox="0 0 500 180" className="w-full h-40 select-none">
                  {/* Axis lines */}
                  <line x1="30" y1="140" x2="470" y2="140" stroke="#8A8882" strokeWidth="1.25" />
                  <line x1="250" y1="20" x2="250" y2="160" stroke="#8A8882" strokeWidth="1.25" strokeDasharray="2 2" />

                  {/* Horizontal Ticks */}
                  <text x="35" y="154" className="text-[10px] font-mono fill-[#8A8882]">-3.0s</text>
                  <text x="140" y="154" className="text-[10px] font-mono fill-[#8A8882]">-1.5s</text>
                  <text x="250" y="154" textAnchor="middle" className="text-[10px] font-mono font-bold fill-[#C85A32]">τ = 0</text>
                  <text x="360" y="154" className="text-[10px] font-mono fill-[#8A8882]">+1.5s</text>
                  <text x="465" y="154" textAnchor="end" className="text-[10px] font-mono fill-[#8A8882]">+3.0s</text>

                  {/* Vertical labels */}
                  <text x="245" y="32" textAnchor="end" className="text-[10px] font-mono fill-[#C85A32] font-semibold">
                    R_xx(0) = {peakPower.toFixed(2)}
                  </text>

                  {/* Autocorrelation curve */}
                  <path d={rxxPath} fill="none" stroke="#C85A32" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                  {/* Center Peak Dot */}
                  <circle cx="250" cy={140 - peakPower * 95} r="3" fill="#C85A32" />

                  {/* Dynamic Lag Marker */}
                  <line x1={markerX} y1="25" x2={markerX} y2="140" stroke="#1A1917" strokeWidth="1.5" strokeDasharray="2 2" />
                  <circle cx={markerX} cy={markerY} r="4.5" fill="#1A1917" stroke="#FFFFFF" strokeWidth="1.5" />

                  {/* Floating Marker Readout */}
                  <text x={Math.min(430, Math.max(70, markerX))} y={Math.max(30, markerY - 10)} textAnchor="middle" className="text-[10px] font-mono font-bold fill-[#1A1917]">
                    τ={lagTau.toFixed(2)}s | R={currentRxxVal.toFixed(2)}
                  </text>
                </svg>
              </div>

              {/* Plot 2: Power Spectral Density S_xx(f) (Wiener-Khinchin Transform) */}
              <div className="bg-white/95 backdrop-blur-xs rounded border border-[#E6E4DD] p-3 shadow-2xs">
                <div className="flex items-center justify-between text-xs font-mono mb-1 text-[#585651]">
                  <span className="font-semibold text-[#1A1917]">Power Spectral Density S_xx(f)</span>
                  <span className="text-[#75736E]">
                    Wiener-Khinchin Pair · {windowType.toUpperCase()} ({welchOverlap}% Overlap)
                  </span>
                </div>

                <svg viewBox="0 0 500 120" className="w-full h-28 select-none">
                  {/* Axis */}
                  <line x1="30" y1="100" x2="470" y2="100" stroke="#8A8882" strokeWidth="1.25" />
                  <line x1="30" y1="15" x2="30" y2="100" stroke="#8A8882" strokeWidth="1.25" />

                  <text x="30" y="114" className="text-[9px] font-mono fill-[#8A8882]">0 Hz</text>
                  <text x="140" y="114" className="text-[9px] font-mono fill-[#8A8882]">1.0 Hz</text>
                  <text x="250" y="114" className="text-[9px] font-mono fill-[#8A8882]">2.0 Hz</text>
                  <text x="360" y="114" className="text-[9px] font-mono fill-[#8A8882]">3.0 Hz</text>
                  <text x="465" y="114" textAnchor="end" className="text-[9px] font-mono fill-[#8A8882]">4.0 Hz</text>

                  {/* PSD Curve (scaled for 120 height) */}
                  <path d={psdPath} fill="none" stroke="#585651" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>

          {/* Interactive Parameters Modulator */}
          <div className="mt-5 p-4 rounded-md bg-[#FAF9F6] border border-[#E6E4DD] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono uppercase tracking-wider text-[#75736E] font-semibold flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#C85A32]" />
                <span>Interactive Correlation & Spectral Controls</span>
              </span>
              <button
                type="button"
                onClick={() => setLagTau(0.0)}
                className="text-xs font-mono text-[#C85A32] hover:underline"
              >
                Reset to Peak (τ=0)
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Signal Type Selector */}
              <div>
                <label className="block text-xs font-medium text-[#1A1917] mb-1">Signal Family x(t)</label>
                <select
                  value={signalType}
                  onChange={(e) => setSignalType(e.target.value)}
                  className="w-full text-xs bg-white border border-[#E6E4DD] rounded px-2.5 py-1.5 text-[#1A1917] focus:outline-none focus:ring-1 focus:ring-[#C85A32]"
                >
                  <option value="harmonic">Harmonic Tone + Noise</option>
                  <option value="narrowband">Narrowband Random Process</option>
                  <option value="rect_pulse">Rectangular Pulse Kernel</option>
                  <option value="noise">White Gaussian Noise</option>
                </select>
              </div>

              {/* Lag Offset Slider */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-[#1A1917]">Lag Offset (τ)</span>
                  <span className="font-mono text-[#C85A32] font-semibold">{lagTau.toFixed(2)}s</span>
                </div>
                <input
                  type="range"
                  min="-3.0"
                  max="3.0"
                  step="0.05"
                  value={lagTau}
                  onChange={(e) => setLagTau(parseFloat(e.target.value))}
                  className="w-full accent-[#C85A32] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
                  <span>-3.0s</span>
                  <span>0.0s</span>
                  <span>+3.0s</span>
                </div>
              </div>

              {/* Noise Level */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-[#1A1917]">Noise Variance (σ_n²)</span>
                  <span className="font-mono text-[#C85A32] font-semibold">{noiseLevel.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={noiseLevel}
                  onChange={(e) => setNoiseLevel(parseFloat(e.target.value))}
                  className="w-full accent-[#C85A32] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
                  <span>Clean (0.0)</span>
                  <span>Noisy (1.0)</span>
                </div>
              </div>

              {/* Spectral Window Selector */}
              <div>
                <label className="block text-xs font-medium text-[#1A1917] mb-1">Spectral Window</label>
                <select
                  value={windowType}
                  onChange={(e) => setWindowType(e.target.value)}
                  className="w-full text-xs bg-white border border-[#E6E4DD] rounded px-2.5 py-1.5 text-[#1A1917] focus:outline-none focus:ring-1 focus:ring-[#C85A32]"
                >
                  <option value="hamming">Hamming (Side-lobe -43dB)</option>
                  <option value="hann">Hanning (Fast Rolloff)</option>
                  <option value="rectangular">Rectangular (Narrow Main-lobe)</option>
                </select>
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
                { label: 'Max Lag (τ_max)', value: '± 3.0 s' },
                { label: 'Signal Power (Px)', value: `${peakPower.toFixed(3)} W` },
                { label: 'Symmetry Check', value: `R(τ) = R(-τ)` },
                { label: 'Resolution (Δf)', value: '0.125 Hz' },
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
              Wiener–Khinchin Transform Relation
            </div>
            <div className="p-3 bg-white rounded border border-[#E6E4DD] text-sm font-semibold text-[#1A1917] overflow-x-auto">
              <MathView math="S_{XX}(\omega) = \int_{-\infty}^{\infty} R_{XX}(\tau) e^{-j\omega \tau} \, d\tau" displayMode={true} />
            </div>

            <div className="text-xs text-[#585651] mt-3 mb-2 font-medium">
              Autocorrelation Symmetry & Average Power
            </div>
            <div className="p-3 bg-white rounded border border-[#E6E4DD] text-sm font-semibold text-[#1A1917] overflow-x-auto">
              <MathView math="R_{XX}(-\tau) = R_{XX}(\tau), \quad R_{XX}(0) = P_X" displayMode={true} />
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
                'Autocorrelation Rxx(τ) & Cross-Correlation Rxy(τ)',
                'Wiener–Khinchin Theorem: Linking Correlation & PSD',
                'Nonparametric Spectral Estimation (Periodogram & Welch)'
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
              <span>Slot: Module5_Correlation.jsx</span>
            </div>
            <p className="text-xs text-[#585651] leading-relaxed">
              Drop-in ready! When teammates send their single-file code block for Correlation & Spectral Analysis, paste it into this file without altering the navigation shell.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
