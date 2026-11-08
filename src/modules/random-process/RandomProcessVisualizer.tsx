/**
 * Random Process Properties - High-Fidelity Waveform Visualizer
 * Large responsive viewport, moving time cursor, non-overlapping numerical readouts,
 * realization selection, ensemble mean & confidence envelope.
 */

import React, { useRef, useMemo, useCallback } from 'react';
import {
  EnsembleSimulationData,
  InstantaneousStats,
  getInstantaneousStats,
} from './randomProcessEngine';

const REALIZATION_COLORS = [
  '#C85A32', // Terracotta primary
  '#2E6F7E', // Deep Teal
  '#5C5589', // Indigo Slate
  '#B45309', // Amber
  '#2D6A4F', // Forest Green
  '#9B4F8C', // Berry Violet
  '#0284C7', // Sky Blue
  '#D97706', // Warm Orange
  '#7C3AED', // Royal Purple
  '#059669', // Emerald
  '#DC2626', // Crimson
  '#475569', // Slate
];

interface RandomProcessVisualizerProps {
  simulation: EnsembleSimulationData;
  simTime: number;
  onSeekTime: (t: number) => void;
  selectedRealizationIndex: number;
  onSelectRealization: (idx: number) => void;
  showEnvelope: boolean;
  showMeanCurve: boolean;
  showAllRealizations: boolean;
  isGridVisible: boolean;
  heightClass?: string;
}

export const RandomProcessVisualizer: React.FC<RandomProcessVisualizerProps> = ({
  simulation,
  simTime,
  onSeekTime,
  selectedRealizationIndex,
  onSelectRealization,
  showEnvelope,
  showMeanCurve,
  showAllRealizations,
  isGridVisible,
  heightClass = 'min-h-[380px]',
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const isDraggingRef = useRef(false);

  const { trajectories, ensembleMean, ensembleStdDev, params } = simulation;
  const M = trajectories.length;
  const T_MAX = params.tMax;

  // Viewbox coordinates: 920 x 440
  const SVG_W = 920;
  const SVG_H = 440;
  const PAD_L = 72;
  const PAD_R = 36;
  const PAD_T = 48;
  const PAD_B = 54;

  const plotW = SVG_W - PAD_L - PAD_R;
  const plotH = SVG_H - PAD_T - PAD_B;
  const centerY = PAD_T + plotH / 2;

  // Dynamic Y-axis limits
  const yMax = useMemo(() => {
    let maxAbs = 2.5;
    for (let i = 0; i < M; i++) {
      for (let k = 0; k < trajectories[i].length; k++) {
        const absVal = Math.abs(trajectories[i][k].x);
        if (absVal > maxAbs) maxAbs = absVal;
      }
    }
    return Math.ceil(Math.min(6.5, maxAbs * 1.15) * 2) / 2;
  }, [trajectories, M]);

  const mapX = useCallback(
    (t: number) => PAD_L + (Math.max(0, Math.min(T_MAX, t)) / T_MAX) * plotW,
    [T_MAX, plotW, PAD_L]
  );

  const mapY = useCallback(
    (val: number) => {
      const clamped = Math.max(-yMax, Math.min(yMax, val));
      return centerY - (clamped / yMax) * (plotH / 2);
    },
    [yMax, centerY, plotH]
  );

  // SVG path generator
  const toPathD = useCallback(
    (pts: Array<{ t: number; x: number }>) => {
      if (!pts || pts.length === 0) return '';
      return pts.reduce((acc, p, idx) => {
        const x = mapX(p.t).toFixed(1);
        const y = mapY(p.x).toFixed(1);
        return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
      }, '');
    },
    [mapX, mapY]
  );

  // Instantaneous statistics at simTime
  const stats: InstantaneousStats = useMemo(() => {
    return getInstantaneousStats(simulation, simTime, selectedRealizationIndex);
  }, [simulation, simTime, selectedRealizationIndex]);

  // Click & Drag Scrubbing
  const handlePointerScrub = useCallback(
    (clientX: number) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const clickX = clientX - rect.left;
      const scaleX = SVG_W / rect.width;
      const svgX = clickX * scaleX;
      const clampedX = Math.max(PAD_L, Math.min(SVG_W - PAD_R, svgX));
      const newT = ((clampedX - PAD_L) / plotW) * T_MAX;
      onSeekTime(parseFloat(newT.toFixed(2)));
    },
    [plotW, T_MAX, onSeekTime, PAD_L, PAD_R, SVG_W]
  );

  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    isDraggingRef.current = true;
    handlePointerScrub(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isDraggingRef.current) {
      handlePointerScrub(e.clientX);
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleTouchStart = (e: React.TouchEvent<SVGSVGElement>) => {
    isDraggingRef.current = true;
    if (e.touches.length > 0) {
      handlePointerScrub(e.touches[0].clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<SVGSVGElement>) => {
    if (isDraggingRef.current && e.touches.length > 0) {
      handlePointerScrub(e.touches[0].clientX);
    }
  };

  const cursorX = mapX(simTime);
  const selectedY = mapY(stats.selectedAmplitude);
  const meanY = mapY(stats.ensembleMean);

  // Confidence Envelope Polygon Path
  const envelopePathD = useMemo(() => {
    if (!showEnvelope) return '';
    const topPts: string[] = [];
    const botPts: string[] = [];
    const N = simulation.timeSteps.length;

    for (let k = 0; k < N; k++) {
      const t = simulation.timeSteps[k];
      const mu = ensembleMean[k];
      const sig = ensembleStdDev[k];
      const x = mapX(t).toFixed(1);
      const yTop = mapY(mu + sig).toFixed(1);
      const yBot = mapY(mu - sig).toFixed(1);
      topPts.push(`${x},${yTop}`);
      botPts.unshift(`${x},${yBot}`);
    }

    return `M ${topPts.join(' L ')} L ${botPts.join(' L ')} Z`;
  }, [showEnvelope, simulation.timeSteps, ensembleMean, ensembleStdDev, mapX, mapY]);

  // Generate tick markers
  const yTicks = useMemo(() => {
    const ticks = [];
    const step = yMax <= 3 ? 1 : 1.5;
    for (let v = -yMax; v <= yMax + 1e-4; v += step) {
      if (Math.abs(v) < 1e-4) ticks.push(0);
      else ticks.push(parseFloat(v.toFixed(1)));
    }
    return ticks;
  }, [yMax]);

  const timeTicks = useMemo(() => {
    const ticks = [];
    const step = T_MAX <= 5 ? 1 : 2;
    for (let t = 0; t <= T_MAX + 1e-4; t += step) {
      ticks.push(t);
    }
    return ticks;
  }, [T_MAX]);

  // Clean offset for the selected amplitude readout badge to prevent overlaps
  const isNearRightEdge = cursorX > SVG_W - PAD_R - 110;
  const isNearTopEdge = selectedY < PAD_T + 30;
  const badgeX = isNearRightEdge ? cursorX - 105 : cursorX + 12;
  const badgeY = isNearTopEdge ? selectedY + 14 : selectedY - 14;

  return (
    <div className="w-full flex flex-col bg-white rounded-lg border border-[#E6E4DD] shadow-2xs overflow-hidden">
      {/* 1. Live Telemetry HUD Header */}
      <div className="px-4 py-2.5 bg-[#FAF9F6] border-b border-[#E6E4DD] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        {/* Left Telemetry Items */}
        <div className="flex flex-wrap items-center gap-3 sm:gap-5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#C85A32] animate-pulse" />
            <span className="text-[#75736E]">Sim Time:</span>
            <span className="font-bold text-[#1A1917] bg-white px-2 py-0.5 rounded border border-[#E6E4DD]">
              t = {stats.simTime.toFixed(2)}s
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{
                backgroundColor:
                  REALIZATION_COLORS[selectedRealizationIndex % REALIZATION_COLORS.length],
              }}
            />
            <span className="text-[#75736E]">
              X<sup>({selectedRealizationIndex + 1})</sup>(t):
            </span>
            <span className="font-bold text-[#1A1917]">
              {stats.selectedAmplitude >= 0 ? '+' : ''}
              {stats.selectedAmplitude.toFixed(3)} V
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-0.5 border-b-2 border-dashed border-[#1A1917]" />
            <span className="text-[#75736E]">μ̂(t):</span>
            <span className="font-semibold text-[#1A1917]">
              {stats.ensembleMean >= 0 ? '+' : ''}
              {stats.ensembleMean.toFixed(3)} V
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[#75736E]">σ̂²(t):</span>
            <span className="font-semibold text-[#1A1917]">{stats.ensembleVariance.toFixed(3)} V²</span>
          </div>
        </div>

        {/* Realization Selector Chips */}
        <div className="flex items-center gap-1">
          <span className="text-[11px] text-[#75736E] mr-1 hidden sm:inline">Inspect:</span>
          <div className="flex items-center gap-1 overflow-x-auto max-w-[220px] sm:max-w-none">
            {Array.from({ length: Math.min(8, M) }).map((_, i) => {
              const isSelected = selectedRealizationIndex === i;
              const color = REALIZATION_COLORS[i % REALIZATION_COLORS.length];
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSelectRealization(i)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'text-white shadow-2xs scale-105'
                      : 'bg-white text-[#585651] border border-[#E6E4DD] hover:bg-[#F3F2EC]'
                  }`}
                  style={{
                    backgroundColor: isSelected ? color : undefined,
                    borderColor: isSelected ? color : undefined,
                  }}
                  title={`Select Realization X^(${i + 1})`}
                >
                  X<sup>({i + 1})</sup>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Interactive SVG Canvas Viewport */}
      <div
        className={`relative w-full ${heightClass} bg-[#FAF9F6] overflow-hidden select-none cursor-crosshair flex items-center justify-center`}
      >
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full max-h-[68vh]"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
          role="img"
          aria-label="Interactive random process waveforms and moving temporal line"
        >
          <defs>
            {/* Subtle Grid Pattern */}
            <pattern id="rp-minor-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#ECE9E1" strokeWidth="0.75" />
            </pattern>
            <pattern id="rp-major-grid" width="100" height="100" patternUnits="userSpaceOnUse">
              <rect width="100" height="100" fill="url(#rp-minor-grid)" />
              <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#DDD9CE" strokeWidth="1.2" />
            </pattern>
            {/* Soft Glow Filter for sweep cursor */}
            <filter id="cursor-glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Grid */}
          {isGridVisible && (
            <rect
              x={PAD_L}
              y={PAD_T}
              width={plotW}
              height={plotH}
              fill="url(#rp-major-grid)"
              opacity="0.85"
            />
          )}

          {/* Plot Canvas Framing Border */}
          <rect
            x={PAD_L}
            y={PAD_T}
            width={plotW}
            height={plotH}
            fill="none"
            stroke="#E2DFD6"
            strokeWidth="1.2"
          />

          {/* Horizontal Amplitude Grid Lines & Labels */}
          {yTicks.map((v) => {
            const y = mapY(v);
            const isZero = Math.abs(v) < 1e-4;
            return (
              <g key={`y-${v}`}>
                <line
                  x1={PAD_L}
                  y1={y}
                  x2={SVG_W - PAD_R}
                  y2={y}
                  stroke={isZero ? '#1A1917' : '#E2DFD6'}
                  strokeWidth={isZero ? '1.8' : '1'}
                  strokeDasharray={isZero ? undefined : '3 3'}
                />
                <text
                  x={PAD_L - 10}
                  y={y + 3.5}
                  textAnchor="end"
                  className={`text-[10px] font-mono ${
                    isZero ? 'fill-[#1A1917] font-bold' : 'fill-[#75736E]'
                  }`}
                >
                  {v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1)}
                </text>
              </g>
            );
          })}

          {/* Vertical Time Grid Lines & Labels */}
          {timeTicks.map((t) => {
            const x = mapX(t);
            return (
              <g key={`t-${t}`}>
                <line
                  x1={x}
                  y1={PAD_T}
                  x2={x}
                  y2={SVG_H - PAD_B}
                  stroke="#E2DFD6"
                  strokeWidth="1"
                />
                <text
                  x={x}
                  y={SVG_H - PAD_B + 16}
                  textAnchor="middle"
                  className="text-[10px] font-mono fill-[#75736E] font-medium"
                >
                  {t}s
                </text>
              </g>
            );
          })}

          {/* Shaded Confidence Envelope Band (mu ± sigma) */}
          {showEnvelope && (
            <path
              d={envelopePathD}
              fill="#C85A32"
              fillOpacity="0.08"
              stroke="#C85A32"
              strokeWidth="0.75"
              strokeDasharray="4 3"
              strokeOpacity="0.3"
            />
          )}

          {/* Realization Waveform Traces */}
          {trajectories.map((pts, i) => {
            const isSelected = i === selectedRealizationIndex;
            if (!showAllRealizations && !isSelected) return null;

            const color = REALIZATION_COLORS[i % REALIZATION_COLORS.length];
            return (
              <path
                key={`traj-${i}`}
                d={toPathD(pts)}
                fill="none"
                stroke={color}
                strokeWidth={isSelected ? '2.8' : '1.3'}
                opacity={isSelected ? 1.0 : 0.4}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-opacity duration-150"
              />
            );
          })}

          {/* Prominent Ensemble Mean Curve E[X(t)] */}
          {showMeanCurve && (
            <path
              d={toPathD(
                simulation.timeSteps.map((t, idx) => ({
                  t,
                  x: ensembleMean[idx],
                }))
              )}
              fill="none"
              stroke="#1A1917"
              strokeWidth="2.4"
              strokeDasharray="6 4"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.9"
            />
          )}

          {/* Moving Vertical Sweep Line at simTime */}
          <g filter="url(#cursor-glow)">
            {/* Wider translucent aura line for high visibility */}
            <line
              x1={cursorX}
              y1={PAD_T}
              x2={cursorX}
              y2={SVG_H - PAD_B}
              stroke="#C85A32"
              strokeWidth="5"
              strokeOpacity="0.25"
            />
            {/* Crisp center sweep line */}
            <line
              x1={cursorX}
              y1={PAD_T}
              x2={cursorX}
              y2={SVG_H - PAD_B}
              stroke="#C85A32"
              strokeWidth="2.2"
            />
          </g>

          {/* Sweep Cursor Header Pill (t = simTime) */}
          <g transform={`translate(${cursorX}, ${PAD_T - 18})`}>
            <rect
              x="-30"
              y="-12"
              width="60"
              height="20"
              rx="4"
              fill="#C85A32"
              className="drop-shadow-xs"
            />
            <text
              x="0"
              y="2"
              textAnchor="middle"
              className="text-[10px] font-mono font-bold fill-white"
            >
              {simTime.toFixed(2)}s
            </text>
          </g>

          {/* Sweep Cursor Bottom Guide Tab */}
          <polygon
            points={`${cursorX - 5},${SVG_H - PAD_B + 1} ${cursorX + 5},${SVG_H - PAD_B + 1} ${cursorX},${SVG_H - PAD_B + 7}`}
            fill="#C85A32"
          />

          {/* Intersection Points for All Realizations at simTime */}
          {stats.ensembleValues.map((val, i) => {
            const isSelected = i === selectedRealizationIndex;
            if (!showAllRealizations && !isSelected) return null;
            const y = mapY(val);
            const color = REALIZATION_COLORS[i % REALIZATION_COLORS.length];
            return (
              <circle
                key={`dot-${i}`}
                cx={cursorX}
                cy={y}
                r={isSelected ? '6.5' : '3.5'}
                fill={isSelected ? color : '#FFFFFF'}
                stroke={color}
                strokeWidth={isSelected ? '2.5' : '1.5'}
                className="transition-all"
              />
            );
          })}

          {/* Ensemble Mean Marker Dot */}
          {showMeanCurve && (
            <circle
              cx={cursorX}
              cy={meanY}
              r="5"
              fill="#1A1917"
              stroke="#FFFFFF"
              strokeWidth="2"
            />
          )}

          {/* Non-Overlapping Callout Badge for Selected Realization Amplitude */}
          <g transform={`translate(${badgeX}, ${badgeY})`}>
            <rect
              x="0"
              y="-12"
              width="95"
              height="24"
              rx="4"
              fill="#1A1917"
              fillOpacity="0.92"
              stroke="#FFFFFF"
              strokeWidth="1"
              className="drop-shadow-md"
            />
            <text
              x="8"
              y="4"
              className="text-[9.5px] font-mono font-bold fill-white"
            >
              X<sup>({selectedRealizationIndex + 1})</sup>:{' '}
              {stats.selectedAmplitude >= 0 ? '+' : ''}
              {stats.selectedAmplitude.toFixed(2)}V
            </text>
          </g>

          {/* Axis Titles */}
          <text
            x={PAD_L - 8}
            y={PAD_T - 22}
            textAnchor="start"
            className="text-[11px] font-mono font-bold fill-[#1A1917]"
          >
            Amplitude X(t) [V]
          </text>

          <text
            x={SVG_W - PAD_R}
            y={SVG_H - PAD_B + 36}
            textAnchor="end"
            className="text-[11px] font-mono font-bold fill-[#1A1917]"
          >
            Time t [s] →
          </text>
        </svg>
      </div>

      {/* 3. Waveform Legend & Direct Scrubber Controls */}
      <div className="px-4 py-3 bg-white border-t border-[#E6E4DD] flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span
              className="w-3.5 h-1 rounded-full"
              style={{
                backgroundColor:
                  REALIZATION_COLORS[selectedRealizationIndex % REALIZATION_COLORS.length],
              }}
            />
            <span className="text-[#1A1917] font-semibold">
              X<sup>({selectedRealizationIndex + 1})</sup>(t) Selected Realization
            </span>
          </div>

          {showAllRealizations && (
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-0.5 bg-[#75736E] rounded-full opacity-60" />
              <span className="text-[#585651]">Other Realizations (1..M)</span>
            </div>
          )}

          {showMeanCurve && (
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 border-b-2 border-dashed border-[#1A1917]" />
              <span className="text-[#1A1917] font-semibold">μ̂(t) Ensemble Mean</span>
            </div>
          )}

          {showEnvelope && (
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-2 bg-[#C85A32]/20 border border-[#C85A32]/40 rounded-xs" />
              <span className="text-[#75736E]">μ ± 1σ Envelope</span>
            </div>
          )}
        </div>

        {/* Scrub Slider */}
        <div className="flex items-center gap-2.5 ml-auto">
          <span className="text-[#75736E] text-[11px]">Scrub t:</span>
          <input
            type="range"
            min="0"
            max={T_MAX}
            step="0.05"
            value={simTime}
            onChange={(e) => onSeekTime(parseFloat(e.target.value))}
            className="w-28 sm:w-44 accent-[#C85A32] cursor-pointer"
            aria-label="Simulation Time Scrubber"
          />
          <span className="text-[#1A1917] font-bold w-12 text-right">
            {simTime.toFixed(2)}s
          </span>
        </div>
      </div>
    </div>
  );
};
