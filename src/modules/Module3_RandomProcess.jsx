/**
 * Module 3: Random Process Properties
 * Filename: Module3_RandomProcess.jsx
 * 
 * Full real-time stochastic random process simulation:
 * - Real-time ensemble realizations & harmonic sum-of-sinusoids random paths
 * - Wide-Sense Stationarity (WSS) vs. Non-Stationary time-varying regime
 * - Play, Pause, Reset, 0.25×-4× speed controls, interactive grid, and fullscreen
 * - Dynamic ensemble averages, time averages, ergodicity testing & live statistics
 * 
 * [YOUR PART HERE]
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Layers, BookOpen, SlidersHorizontal, Info, RefreshCw, Maximize2, Minimize2, Activity, CheckCircle2, AlertTriangle } from 'lucide-react';
import { MathView } from '../components/MathView';
import { SimulationToolbar } from '../components/SimulationToolbar';

// Pseudo-random seeded generator for reproducible, smooth continuous realizations
function createSeededRandom(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const SPEED_FACTORS = {
  '0.25×': 0.25,
  '0.5×': 0.5,
  '1×': 1.0,
  '2×': 2.0,
  '4×': 4.0,
};

const TRAJECTORY_COLORS = [
  '#C85A32', // Primary realization X^(1)(t)
  '#2E6F7E', // Teal
  '#5C5589', // Indigo/Slate
  '#B45309', // Amber
  '#4A7C59', // Forest green
  '#9B4F8C', // Magenta
  '#585651', // Neutral dark
  '#0284C7', // Sky
  '#D97706', // Orange
  '#7C3AED', // Purple
  '#059669', // Emerald
  '#DC2626', // Red
];

const NUM_POINTS = 160;
const T_MAX = 10.0;

export default function Module3_RandomProcess({
  onNavigateHome,
  onNavigateModule,
  isInstructorMode = false,
}) {
  const [isGridVisible, setIsGridVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackState, setPlaybackState] = useState('reset'); // 'playing' | 'paused' | 'reset'
  const [speed, setSpeed] = useState('1×');

  // Interactive parameters
  const [ensembleCount, setEnsembleCount] = useState(5);
  const [noiseVariance, setNoiseVariance] = useState(0.4);
  const [stationarityType, setStationarityType] = useState('wss'); // 'wss' | 'non-stationary'
  const [randomSeed, setRandomSeed] = useState(42);

  // Simulation time cursor t in [0, T_MAX]
  const [simTime, setSimTime] = useState(0);
  const animFrameRef = useRef(null);
  const lastTimestampRef = useRef(null);
  const fullscreenContainerRef = useRef(null);

  // Handle Fullscreen ESC listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Generate stochastic parameters for M realizations
  const realizationConfigs = useMemo(() => {
    const rng = createSeededRandom(randomSeed);
    const configs = [];
    const numHarmonics = 6;

    for (let i = 0; i < 12; i++) {
      const harmonics = [];
      for (let k = 0; k < numHarmonics; k++) {
        harmonics.push({
          freq: 0.15 + k * 0.28 + (rng() - 0.5) * 0.08,
          amp: (1.2 / (k + 1)) * (0.8 + rng() * 0.4),
          phase: rng() * 2 * Math.PI,
        });
      }
      configs.push({
        harmonics,
        dcOffset: (rng() - 0.5) * 0.2,
        noiseSeed: rng() * 1000,
      });
    }
    return configs;
  }, [randomSeed]);

  // Evaluate X_i(t) function
  const evaluateTrajectory = useCallback(
    (trajIndex, t, regime, variance) => {
      const cfg = realizationConfigs[trajIndex % realizationConfigs.length];
      const stdDev = Math.sqrt(variance);

      // Deterministic harmonic synthesis (Rice's sum of sinusoids)
      let val = 0;
      for (let k = 0; k < cfg.harmonics.length; k++) {
        const h = cfg.harmonics[k];
        val += h.amp * Math.cos(2 * Math.PI * h.freq * t + h.phase);
      }

      // Add high-frequency perturbation (bandlimited noise surrogate)
      const hf1 = Math.sin(2 * Math.PI * 3.8 * t + cfg.noiseSeed);
      const hf2 = Math.cos(2 * Math.PI * 7.2 * t + cfg.noiseSeed * 1.5);
      val += stdDev * 0.45 * (hf1 + hf2);

      // Regime modulation
      if (regime === 'wss') {
        // Zero-mean stationary process with consistent variance
        return val * 0.85;
      } else {
        // Non-stationary: time-dependent mean drift μ(t) and expanding variance envelope
        const timeMean = 1.35 * Math.sin(2 * Math.PI * 0.18 * t) + 0.12 * (t - 5);
        const varianceModulation = 0.5 + 0.9 * (t / T_MAX);
        return timeMean + val * varianceModulation * 0.85;
      }
    },
    [realizationConfigs]
  );

  // Pre-calculate waveform paths across [0, T_MAX]
  const trajectoriesData = useMemo(() => {
    const timeSteps = [];
    for (let j = 0; j < NUM_POINTS; j++) {
      timeSteps.push((j / (NUM_POINTS - 1)) * T_MAX);
    }

    const paths = [];
    for (let i = 0; i < ensembleCount; i++) {
      const samples = timeSteps.map((t) => ({
        t,
        x: evaluateTrajectory(i, t, stationarityType, noiseVariance),
      }));
      paths.push(samples);
    }

    // Precalculate ensemble mean trajectory mu(t) across all M
    const meanPath = timeSteps.map((t, idx) => {
      let sum = 0;
      for (let i = 0; i < ensembleCount; i++) {
        sum += paths[i][idx].x;
      }
      return { t, x: sum / ensembleCount };
    });

    return { timeSteps, paths, meanPath };
  }, [ensembleCount, stationarityType, noiseVariance, evaluateTrajectory]);

  // Real-time animation loop
  useEffect(() => {
    if (playbackState !== 'playing') {
      lastTimestampRef.current = null;
      return;
    }

    const speedMultiplier = SPEED_FACTORS[speed] || 1.0;

    const tick = (timestamp) => {
      if (lastTimestampRef.current === null) {
        lastTimestampRef.current = timestamp;
      }
      const deltaSec = (timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;

      setSimTime((prevTime) => {
        let nextTime = prevTime + deltaSec * speedMultiplier;
        if (nextTime >= T_MAX) {
          nextTime = 0; // Loop seamlessly
        }
        return nextTime;
      });

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [playbackState, speed]);

  // Toolbar handlers
  const handlePlay = () => setPlaybackState('playing');
  const handlePause = () => setPlaybackState('paused');
  const handleReset = () => {
    setPlaybackState('reset');
    setSimTime(0);
  };
  const handleReseed = () => {
    setRandomSeed((s) => s + 7);
  };

  // Instantaneous statistics at current simTime
  const instantaneousStats = useMemo(() => {
    const currentValues = [];
    for (let i = 0; i < ensembleCount; i++) {
      currentValues.push(evaluateTrajectory(i, simTime, stationarityType, noiseVariance));
    }

    // Ensemble Mean E[X(t_sim)]
    const sum = currentValues.reduce((acc, v) => acc + v, 0);
    const ensembleMean = sum / ensembleCount;

    // Ensemble Variance Var[X(t_sim)]
    const varSum = currentValues.reduce((acc, v) => acc + Math.pow(v - ensembleMean, 2), 0);
    const ensembleVar = varSum / ensembleCount;

    // Time Average of realization 1 up to current simTime (or across recent window)
    const effectiveTime = Math.max(simTime, 0.2);
    const timeAvgSteps = 40;
    let timeSum = 0;
    for (let step = 0; step <= timeAvgSteps; step++) {
      const tau = (step / timeAvgSteps) * effectiveTime;
      timeSum += evaluateTrajectory(0, tau, stationarityType, noiseVariance);
    }
    const timeAvg = timeSum / (timeAvgSteps + 1);

    // Ergodicity deviation: |TimeAvg - EnsembleMean|
    const ergodicityError = Math.abs(timeAvg - ensembleMean);
    const isErgodicCandidate = stationarityType === 'wss' && ergodicityError < 0.45;

    return {
      currentValues,
      ensembleMean,
      ensembleVar,
      timeAvg,
      ergodicityError,
      isErgodicCandidate,
    };
  }, [ensembleCount, simTime, stationarityType, noiseVariance, evaluateTrajectory]);

  // Coordinate mapping for SVG viewbox (540 x 240)
  // X: [0, 10] -> [55, 515]
  // Y: [-3.5, 3.5] -> [215, 25] (center at 120)
  const SVG_WIDTH = 540;
  const SVG_HEIGHT = 240;
  const PAD_LEFT = 55;
  const PAD_RIGHT = 25;
  const PAD_TOP = 25;
  const PAD_BOTTOM = 30;

  const plotW = SVG_WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotH = SVG_HEIGHT - PAD_TOP - PAD_BOTTOM;
  const centerY = PAD_TOP + plotH / 2;

  const mapX = (t) => PAD_LEFT + (t / T_MAX) * plotW;
  const mapY = (val) => {
    // clamp between -3.5 and 3.5
    const clamped = Math.max(-3.5, Math.min(3.5, val));
    return centerY - (clamped / 3.5) * (plotH / 2);
  };

  // Convert array of {t, x} to SVG path string
  const toPathD = (points) => {
    if (!points || points.length === 0) return '';
    return points.reduce((acc, pt, idx) => {
      const x = mapX(pt.t).toFixed(1);
      const y = mapY(pt.x).toFixed(1);
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  };

  // Background Grid SVG
  const renderBackgroundGrid = (idPrefix) => {
    if (!isGridVisible) return null;
    return (
      <svg className="absolute inset-0 w-full h-full pointer-events-none select-none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <pattern id={`${idPrefix}-minor`} width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#E2DFD6" strokeWidth="0.8" />
          </pattern>
          <pattern id={`${idPrefix}-major`} width="96" height="96" patternUnits="userSpaceOnUse">
            <rect width="96" height="96" fill={`url(#${idPrefix}-minor)`} />
            <path d="M 96 0 L 0 0 0 96" fill="none" stroke="#C8C4B8" strokeWidth="1.2" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${idPrefix}-major)`} />
      </svg>
    );
  };

  const cursorX = mapX(simTime);

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

        {/* Live Simulation Engine Badge */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleReseed}
            title="Generate new stochastic sample seeds"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold text-[#585651] hover:text-[#1A1917] bg-white border border-[#E6E4DD] hover:border-[#8A8882] rounded-md shadow-xs transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#C85A32]" />
            <span>Re-seed Process</span>
          </button>
          <div className="flex items-center gap-2 text-xs font-mono text-[#585651] bg-[#FAF9F6] border border-[#E6E4DD] px-3 py-1.5 rounded-md">
            <span className={`w-2 h-2 rounded-full ${playbackState === 'playing' ? 'bg-[#10B981] animate-pulse' : 'bg-[#C85A32]'}`} />
            <span>Simulation: <strong className="text-[#1A1917] capitalize">{playbackState}</strong></span>
          </div>
        </div>
      </div>

      {/* Main Simulation / Visualization Window */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 8 Cols: Simulation Stage & Parameter Controls */}
        <div
          ref={fullscreenContainerRef}
          className={`lg:col-span-8 bg-white rounded-lg border border-[#E6E4DD] p-5 sm:p-6 shadow-xs flex flex-col ${
            isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none p-6 overflow-y-auto' : ''
          }`}
        >
          {/* Header & Status */}
          <div className="flex items-center justify-between pb-4 border-b border-[#E6E4DD] mb-4">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${playbackState === 'playing' ? 'bg-[#10B981]' : 'bg-[#C85A32]'}`} />
              <h2 className="text-sm font-bold tracking-tight text-[#1A1917] uppercase font-mono">
                Stochastic Ensemble Realizations & Sample Paths
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono text-[#8A8882]">
                M = {ensembleCount} REALIZATIONS · {stationarityType.toUpperCase()}
              </span>
              {isFullscreen && (
                <button
                  type="button"
                  onClick={() => setIsFullscreen(false)}
                  className="flex items-center gap-1 text-xs font-mono font-medium text-[#C85A32] bg-[#FBF4F0] px-2.5 py-1 rounded border border-[#C85A32]/30 hover:bg-[#F3E7E1] transition-colors cursor-pointer"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Exit Fullscreen</span>
                </button>
              )}
            </div>
          </div>

          {/* Simulation Toolbar */}
          <SimulationToolbar
            playbackState={playbackState}
            onPlay={handlePlay}
            onPause={handlePause}
            onReset={handleReset}
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
          <div className="relative w-full min-h-[320px] bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden flex flex-col items-center justify-center p-3 select-none">
            {renderBackgroundGrid('rp-canvas-grid')}

            {/* Live Interactive SVG Waveform Stage */}
            <div className="relative z-10 w-full">
              <svg
                viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
                preserveAspectRatio="xMidYMid meet"
                className="w-full h-auto max-h-[58vh] select-none"
                aria-label="Stochastic ensemble realizations and wide-sense stationarity waveform"
                role="img"
              >
                {/* Horizontal Coordinate Grids & Ticks */}
                {[-2, -1, 0, 1, 2].map((v) => {
                  const y = mapY(v);
                  return (
                    <g key={v}>
                      <line
                        x1={PAD_LEFT}
                        y1={y}
                        x2={SVG_WIDTH - PAD_RIGHT}
                        y2={y}
                        stroke={v === 0 ? '#1A1917' : '#D5D2C7'}
                        strokeWidth={v === 0 ? '1.5' : '1'}
                        strokeDasharray={v === 0 ? undefined : '3 3'}
                      />
                      <text
                        x={PAD_LEFT - 8}
                        y={y + 3.5}
                        textAnchor="end"
                        className="text-[9px] font-mono fill-[#75736E]"
                      >
                        {v > 0 ? `+${v}` : v}
                      </text>
                    </g>
                  );
                })}

                {/* Vertical Time Grids & Ticks */}
                {[0, 2, 4, 6, 8, 10].map((t) => {
                  const x = mapX(t);
                  return (
                    <g key={t}>
                      <line
                        x1={x}
                        y1={PAD_TOP}
                        x2={x}
                        y2={SVG_HEIGHT - PAD_BOTTOM}
                        stroke="#E2DFD6"
                        strokeWidth="1"
                      />
                      <text
                        x={x}
                        y={SVG_HEIGHT - PAD_BOTTOM + 14}
                        textAnchor="middle"
                        className="text-[9px] font-mono fill-[#75736E]"
                      >
                        {t}s
                      </text>
                    </g>
                  );
                })}

                {/* Realization Waveform Paths */}
                {trajectoriesData.paths.map((pts, i) => {
                  const isPrimary = i === 0;
                  const color = TRAJECTORY_COLORS[i % TRAJECTORY_COLORS.length];
                  return (
                    <path
                      key={i}
                      d={toPathD(pts)}
                      fill="none"
                      stroke={color}
                      strokeWidth={isPrimary ? '2.4' : '1.3'}
                      opacity={isPrimary ? '0.95' : '0.55'}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  );
                })}

                {/* Ensemble Mean Curve E[X(t)] - High Visibility Dashed */}
                <path
                  d={toPathD(trajectoriesData.meanPath)}
                  fill="none"
                  stroke="#1A1917"
                  strokeWidth="2.2"
                  strokeDasharray="5 3"
                  strokeLinecap="round"
                  opacity="0.9"
                />

                {/* Vertical Sweep Cursor at simTime */}
                <line
                  x1={cursorX}
                  y1={PAD_TOP}
                  x2={cursorX}
                  y2={SVG_HEIGHT - PAD_BOTTOM}
                  stroke="#C85A32"
                  strokeWidth="1.8"
                />

                {/* Cursor Time Pill Header */}
                <rect
                  x={cursorX - 22}
                  y={PAD_TOP - 16}
                  width="44"
                  height="14"
                  rx="3"
                  fill="#C85A32"
                />
                <text
                  x={cursorX}
                  y={PAD_TOP - 6}
                  textAnchor="middle"
                  className="text-[8.5px] font-mono font-bold fill-white"
                >
                  {simTime.toFixed(2)}s
                </text>

                {/* Intersection dots for each realization at simTime */}
                {instantaneousStats.currentValues.map((val, i) => {
                  const y = mapY(val);
                  const isPrimary = i === 0;
                  const color = TRAJECTORY_COLORS[i % TRAJECTORY_COLORS.length];
                  return (
                    <circle
                      key={i}
                      cx={cursorX}
                      cy={y}
                      r={isPrimary ? '4.5' : '3'}
                      fill={color}
                      stroke="#FFFFFF"
                      strokeWidth="1.5"
                    />
                  );
                })}

                {/* Ensemble Mean Intersection Marker */}
                <circle
                  cx={cursorX}
                  cy={mapY(instantaneousStats.ensembleMean)}
                  r="5"
                  fill="#1A1917"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />

                {/* Axis Labels */}
                <text
                  x={PAD_LEFT - 8}
                  y={PAD_TOP - 8}
                  textAnchor="end"
                  className="text-[9px] font-mono font-semibold fill-[#1A1917]"
                >
                  X(t, ξ)
                </text>
                <text
                  x={SVG_WIDTH - PAD_RIGHT}
                  y={SVG_HEIGHT - PAD_BOTTOM + 14}
                  textAnchor="end"
                  className="text-[9px] font-mono font-semibold fill-[#1A1917]"
                >
                  Time t →
                </text>
              </svg>
            </div>

            {/* Waveform Legend & Interactive Scrub bar */}
            <div className="w-full mt-2 pt-2 border-t border-[#E6E4DD]/80 flex flex-wrap items-center justify-between gap-3 text-[11px] font-mono">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-[#C85A32] rounded-full" />
                  <span className="text-[#1A1917] font-semibold">X⁽¹⁾(t) Sample 1</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#585651] rounded-full opacity-60" />
                  <span className="text-[#585651]">X⁽²...M⁾(t) Ensembles</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3.5 h-0.5 border-b-2 border-dashed border-[#1A1917]" />
                  <span className="text-[#1A1917] font-semibold">μ̂_M(t) Ensemble Mean</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#75736E]">Scrub:</span>
                <input
                  type="range"
                  min="0"
                  max={T_MAX}
                  step="0.05"
                  value={simTime}
                  onChange={(e) => {
                    setPlaybackState('paused');
                    setSimTime(parseFloat(e.target.value));
                  }}
                  className="w-24 sm:w-32 accent-[#C85A32]"
                />
                <span className="text-[#1A1917] font-semibold">{simTime.toFixed(2)}s</span>
              </div>
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
                  className="w-full text-xs bg-white border border-[#E6E4DD] rounded px-2.5 py-1.5 text-[#1A1917] focus:outline-none focus:border-[#C85A32]"
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
                  <span className="font-mono text-[#C85A32] font-semibold">{noiseVariance.toFixed(1)}</span>
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

          {/* Live Mathematical Calculations Matrix */}
          <div className="mt-5 pt-4 border-t border-[#E6E4DD]">
            <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#585651]" />
                <span>Live Stochastic Measures (t = {simTime.toFixed(2)} s)</span>
              </span>
              <span className="text-[10px] text-[#C85A32] font-semibold">Dynamic Updates</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                {
                  label: 'Instant Mean μ̂(t)',
                  value: instantaneousStats.ensembleMean.toFixed(3),
                  note: 'Across M realizations',
                },
                {
                  label: 'Ensemble Var σ̂²(t)',
                  value: instantaneousStats.ensembleVar.toFixed(3),
                  note: 'Instantaneous spread',
                },
                {
                  label: 'Time Avg ⟨X⁽¹⁾⟩',
                  value: instantaneousStats.timeAvg.toFixed(3),
                  note: 'Window [0, t]',
                },
                {
                  label: 'Ergodicity Gap |Δ|',
                  value: instantaneousStats.ergodicityError.toFixed(3),
                  note: instantaneousStats.isErgodicCandidate ? 'Ergodic candidate' : 'Discrepancy observed',
                },
              ].map((p, i) => (
                <div key={i} className="p-2.5 rounded bg-[#FAF9F6] border border-[#E6E4DD]">
                  <div className="text-[10px] font-mono text-[#8A8882] uppercase">{p.label}</div>
                  <div className="text-sm font-semibold text-[#1A1917] mt-0.5 font-mono truncate">{p.value}</div>
                  <div className="text-[9px] text-[#75736E] font-sans truncate">{p.note}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 4 Cols: Mathematical Formulation & Curricular Diagnostics */}
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
            <p className="mt-2.5 text-[11px] text-[#585651] leading-relaxed">
              For a random process to be WSS, its ensemble mean must be invariant with respect to absolute time, and autocorrelation depends strictly on lag <MathView math="\tau = t_1 - t_2" />.
            </p>
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

          {/* Live Stationarity & Ergodicity Analysis Panel */}
          <div className="bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-xs space-y-3">
            <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] font-semibold flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#C85A32]" />
              <span>Process Regime Evaluation</span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded bg-[#FAF9F6] border border-[#E6E4DD]">
                <span className="text-[#585651] font-medium">Mean Invariance</span>
                <span className="flex items-center gap-1 font-mono font-semibold">
                  {stationarityType === 'wss' ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
                      <span className="text-[#10B981]">Stationary (μ ≈ 0)</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-3.5 h-3.5 text-[#C85A32]" />
                      <span className="text-[#C85A32]">Time-Varying μ(t)</span>
                    </>
                  )}
                </span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded bg-[#FAF9F6] border border-[#E6E4DD]">
                <span className="text-[#585651] font-medium">Ergodicity in Mean</span>
                <span className="font-mono text-[11px] font-semibold text-[#1A1917]">
                  {stationarityType === 'wss'
                    ? '⟨X(t)⟩_T → E[X(t)]'
                    : 'Non-Ergodic (Regime Shift)'}
                </span>
              </div>

              <div className="p-2.5 rounded bg-[#FAF9F6] border border-[#E6E4DD] text-[11px] text-[#585651] leading-relaxed">
                {stationarityType === 'wss' ? (
                  <span>
                    In this stationary regime, time averages calculated across a single trajectory converge toward the stochastic ensemble average as observation horizon <MathView math="T \to \infty" />.
                  </span>
                ) : (
                  <span>
                    In this non-stationary regime, <MathView math="\mathbb{E}[X(t)]" /> shifts over time. Consequently, a single time-series sample cannot represent the statistical ensemble distribution.
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
