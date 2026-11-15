/**
 * Random Process Properties - High-Fidelity Waveform Visualizer
 * Large responsive viewport, synchronized moving vertical time cursor,
 * dedicated non-overlapping top callout track, interpolated signal tracking,
 * realization selection, ensemble mean & ±1σ confidence envelope.
 */

import React, { useRef, useMemo, useCallback } from 'react';
import {
  EnsembleSimulationData,
  InstantaneousStats,
  getInstantaneousStats,
} from './randomProcessEngine';

export const REALIZATION_COLORS = [
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
  heightClass = 'min-h-[340px]',
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const isDraggingRef = useRef(false);

  const { trajectories, ensembleMean, ensembleStdDev, params } = simulation;
  const M = trajectories.length;
  const T_MAX = params.tMax;

  // Viewbox coordinates with dedicated top callout band so labels NEVER overlap waveforms
  const SVG_W = 920;
  const SVG_H = 420;
  const PAD_L = 72;
  const PAD_R = 28;
  const PAD_T = 56;
  const PAD_B = 48;

  const plotW = SVG_W - PAD_L - PAD_R;
  const plotH = SVG_H - PAD_T - PAD_B;
  const centerY = PAD_T + plotH / 2;

  // Dynamic symmetric Y-axis limits with clean step rounding
  const yMax = useMemo(() => {
    let maxAbs = 2.0;
    for (let i = 0; i < M; i++) {
      for (let k = 0; k < trajectories[i].length; k++) {
        const absVal = Math.abs(trajectories[i][k].x);
        if (absVal > maxAbs) maxAbs = absVal;
      }
    }
    const padded = maxAbs * 1.15;
    if (padded <= 2.5) return 2.5;
    if (padded <= 3.0) return 3.0;
    if (padded <= 4.0) return 4.0;
    if (padded <= 5.0) return 5.0;
    return Math.ceil(Math.min(8.0, padded));
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

  // Interpolated instantaneous statistics at simTime
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

  const cursorX = mapX(stats.simTime);
  const meanY = mapY(stats.ensembleMean);
  const selectedColor =
    REALIZATION_COLORS[stats.selectedRealizationIndex % REALIZATION_COLORS.length];

  // Confidence Envelope Polygon Path (mu ± 1*sigma)
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

  // Clean Y-axis ticks
  const yTicks = useMemo(() => {
    const step = yMax <= 3 ? 1 : yMax <= 5 ? 1.5 : 2;
    const ticks: number[] = [0];
    for (let v = step; v <= yMax + 1e-4; v += step) {
      const val = parseFloat(v.toFixed(1));
      ticks.push(val, -val);
    }
    return ticks.sort((a, b) => a - b);
  }, [yMax]);

  const timeTicks = useMemo(() => {
    const ticks: number[] = [];
    const step = T_MAX <= 5 ? 1 : 2;
    for (let t = 0; t <= T_MAX + 1e-4; t += step) {
      ticks.push(t);
    }
    return ticks;
  }, [T_MAX]);

  // Non-overlapping top callout banner clamped inside plot horizontal bounds
  const PILL_W = 248;
  const pillHalf = PILL_W / 2;
  const pillCenterX = Math.max(
    PAD_L + pillHalf,
    Math.min(SVG_W - PAD_R - pillHalf, cursorX)
  );
  const pillText = `t=${stats.simTime.toFixed(2)}s · X(${stats.selectedRealizationIndex + 1})=${
    stats.selectedAmplitude >= 0 ? '+' : ''
  }${stats.selectedAmplitude.toFixed(2)}V · μ̂=${
    stats.ensembleMean >= 0 ? '+' : ''
  }${stats.ensembleMean.toFixed(2)}V`;

  return (
    <div className="w-full flex flex-col bg-white rounded-lg border border-[#E6E4DD] shadow-2xs overflow-hidden">
      {/* 1. Live Telemetry HUD Header */}
      <div className="px-3.5 py-2.5 bg-[#FAF9F6] border-b border-[#E6E4DD] flex flex-wrap items-center justify-between gap-2.5 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#C85A32]" />
            <span className="text-[#75736E]">t:</span>
            <span className="font-bold text-[#1A1917] bg-white px-2 py-0.5 rounded border border-[#E6E4DD] tabular-nums">
              {stats.simTime.toFixed(2)} s
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: selectedColor }}
            />
            <span className="text-[#75736E]">
              X<sup>({stats.selectedRealizationIndex + 1})</sup>(t):
            </span>
            <span className="font-bold text-[#1A1917] tabular-nums">
              {stats.selectedAmplitude >= 0 ? '+' : ''}
              {stats.selectedAmplitude.toFixed(3)} V
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-0.5 border-b-2 border-dashed border-[#1A1917]" />
            <span className="text-[#75736E]">μ̂(t):</span>
            <span className="font-semibold text-[#1A1917] tabular-nums">
              {stats.ensembleMean >= 0 ? '+' : ''}
              {stats.ensembleMean.toFixed(3)} V
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[#75736E]">σ̂²(t):</span>
            <span className="font-semibold text-[#1A1917] tabular-nums">
              {stats.ensembleVariance.toFixed(3)} V²
            </span>
          </div>
        </div>

        {/* Realization Selector Chips */}
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-[#75736E] hidden sm:inline">Path:</span>
          <div className="flex items-center gap-1 overflow-x-auto max-w-[230px] sm:max-w-[340px]">
            {Array.from({ length: Math.min(10, M) }).map((_, i) => {
              const isSelected = stats.selectedRealizationIndex === i;
              const color = REALIZATION_COLORS[i % REALIZATION_COLORS.length];
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => onSelectRealization(i)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer shrink-0 ${
                    isSelected
                      ? 'text-white shadow-2xs'
                      : 'bg-white text-[#585651] border border-[#E6E4DD] hover:bg-[#F3F2EC]'
                  }`}
                  style={{
                    backgroundColor: isSelected ? color : undefined,
                    borderColor: isSelected ? color : undefined,
                  }}
                  title={`Inspect Realization X^(${i + 1})`}
                >
                  X<sup>({i + 1})</sup>
                </button>
              );
            })}
            {M > 10 && (
              <span className="text-[10px] text-[#75736E] pl-1 shrink-0">+{M - 10}</span>
            )}
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
          className="w-full h-full max-h-[58vh]"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleMouseUp}
          role="img"
          aria-label="Interactive random process waveforms and synchronized moving vertical time indicator"
        >
          <defs>
            <pattern id="rp-minor-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#ECE9E1" strokeWidth="0.75" />
            </pattern>
            <pattern id="rp-major-grid" width="100" height="100" patternUnits="userSpaceOnUse">
              <rect width="100" height="100" fill="url(#rp-minor-grid)" />
              <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#DDD9CE" strokeWidth="1.2" />
            </pattern>
            <clipPath id="rp-plot-clip">
              <rect x={PAD_L} y={PAD_T} width={plotW} height={plotH} />
            </clipPath>
          </defs>

          {/* Background Grid inside plot area */}
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
            stroke="#DCD8CE"
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
                  strokeWidth={isZero ? '1.5' : '1'}
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
                  y={SVG_H - PAD_B + 18}
                  textAnchor="middle"
                  className="text-[10px] font-mono fill-[#75736E] font-medium"
                >
                  {t}s
                </text>
              </g>
            );
          })}

          {/* Clipped Plot Geometries */}
          <g clipPath="url(#rp-plot-clip)">
            {/* Shaded Confidence Envelope Band (mu ± 1*sigma) */}
            {showEnvelope && (
              <path
                d={envelopePathD}
                fill="#C85A32"
                fillOpacity="0.09"
                stroke="#C85A32"
                strokeWidth="0.9"
                strokeDasharray="4 3"
                strokeOpacity="0.35"
              />
            )}

            {/* Non-Selected Realizations (rendered first) */}
            {showAllRealizations &&
              trajectories.map((pts, i) => {
                if (i === stats.selectedRealizationIndex) return null;
                const color = REALIZATION_COLORS[i % REALIZATION_COLORS.length];
                return (
                  <path
                    key={`traj-${i}`}
                    d={toPathD(pts)}
                    fill="none"
                    stroke={color}
                    strokeWidth="1.25"
                    opacity="0.38"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="cursor-pointer hover:opacity-80"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectRealization(i);
                    }}
                  />
                );
              })}

            {/* Selected Realization Waveform Trace (highlighted on top) */}
            {trajectories[stats.selectedRealizationIndex] && (
              <path
                d={toPathD(trajectories[stats.selectedRealizationIndex])}
                fill="none"
                stroke={selectedColor}
                strokeWidth="2.6"
                opacity="1"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

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
                strokeWidth="2.3"
                strokeDasharray="6 4"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.92"
              />
            )}
          </g>

          {/* Moving Vertical Time Indicator Line */}
          <g>
            {/* Subtle highlight band */}
            <line
              x1={cursorX}
              y1={PAD_T}
              x2={cursorX}
              y2={SVG_H - PAD_B}
              stroke="#C85A32"
              strokeWidth="6"
              strokeOpacity="0.16"
            />
            {/* Crisp vertical cursor line */}
            <line
              x1={cursorX}
              y1={PAD_T - 10}
              x2={cursorX}
              y2={SVG_H - PAD_B + 2}
              stroke="#C85A32"
              strokeWidth="2.2"
            />
          </g>

          {/* Top Dedicated Non-Overlapping Callout Pill (Lives completely ABOVE plot box) */}
          <g>
            {/* Connector tick from pill bottom to exact cursorX */}
            <line
              x1={cursorX}
              y1={34}
              x2={cursorX}
              y2={PAD_T}
              stroke="#C85A32"
              strokeWidth="1.5"
            />
            <polygon
              points={`${cursorX - 4},${PAD_T - 5} ${cursorX + 4},${PAD_T - 5} ${cursorX},${PAD_T}`}
              fill="#C85A32"
            />
            <rect
              x={pillCenterX - pillHalf}
              y={10}
              width={PILL_W}
              height={24}
              rx="4"
              fill="#1A1917"
            />
            <text
              x={pillCenterX}
              y={25.5}
              textAnchor="middle"
              className="text-[10px] font-mono font-bold fill-white"
            >
              {pillText}
            </text>
          </g>

          {/* Sweep Cursor Bottom Guide Triangle */}
          <polygon
            points={`${cursorX - 5},${SVG_H - PAD_B + 1} ${cursorX + 5},${SVG_H - PAD_B + 1} ${cursorX},${SVG_H - PAD_B + 8}`}
            fill="#C85A32"
          />

          {/* Intersection Dots for All Realizations at Exact simTime */}
          {stats.ensembleValues.map((val, i) => {
            const isSelected = i === stats.selectedRealizationIndex;
            if (!showAllRealizations && !isSelected) return null;
            const y = mapY(val);
            const color = REALIZATION_COLORS[i % REALIZATION_COLORS.length];
            return (
              <circle
                key={`dot-${i}`}
                cx={cursorX}
                cy={y}
                r={isSelected ? '6' : '3'}
                fill={isSelected ? color : '#FFFFFF'}
                stroke={color}
                strokeWidth={isSelected ? '2.4' : '1.4'}
              />
            );
          })}

          {/* Ensemble Mean Marker Dot */}
          {showMeanCurve && (
            <circle
              cx={cursorX}
              cy={meanY}
              r="4.8"
              fill="#1A1917"
              stroke="#FFFFFF"
              strokeWidth="2"
            />
          )}

          {/* Rotated Y-Axis Title (far left margin, zero overlap) */}
          <text
            x={18}
            y={centerY}
            textAnchor="middle"
            transform={`rotate(-90, 18, ${centerY})`}
            className="text-[11px] font-mono font-bold fill-[#1A1917]"
          >
            Amplitude X(t) [V]
          </text>

          {/* X-Axis Title */}
          <text
            x={SVG_W - PAD_R}
            y={SVG_H - 10}
            textAnchor="end"
            className="text-[11px] font-mono font-bold fill-[#1A1917]"
          >
            Time t [s] →
          </text>
        </svg>
      </div>

      {/* 3. Waveform Legend & Direct Scrubber Controls */}
      <div className="px-3.5 py-2.5 bg-white border-t border-[#E6E4DD] flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex flex-wrap items-center gap-3.5">
          <div className="flex items-center gap-1.5">
            <span
              className="w-3.5 h-1 rounded-full"
              style={{ backgroundColor: selectedColor }}
            />
            <span className="text-[#1A1917] font-semibold">
              X<sup>({stats.selectedRealizationIndex + 1})</sup>(t) Selected
            </span>
          </div>

          {showAllRealizations && (
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-0.5 bg-[#75736E] rounded-full opacity-60" />
              <span className="text-[#585651]">Ensemble (1..{M})</span>
            </div>
          )}

          {showMeanCurve && (
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 border-b-2 border-dashed border-[#1A1917]" />
              <span className="text-[#1A1917] font-semibold">μ̂(t) Mean</span>
            </div>
          )}

          {showEnvelope && (
            <div className="flex items-center gap-1.5">
              <span className="w-3.5 h-2 bg-[#C85A32]/20 border border-[#C85A32]/40 rounded-xs" />
              <span className="text-[#75736E]">μ̂ ± 1σ̂</span>
            </div>
          )}
        </div>

        {/* Scrub Slider */}
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-[#75736E] text-[11px]">Time t:</span>
          <input
            type="range"
            min="0"
            max={T_MAX}
            step="0.05"
            value={simTime}
            onChange={(e) => onSeekTime(parseFloat(e.target.value))}
            className="w-28 sm:w-40 accent-[#C85A32] cursor-pointer"
            aria-label="Simulation Time Scrubber"
          />
          <span className="text-[#1A1917] font-bold w-12 text-right tabular-nums">
            {simTime.toFixed(2)}s
          </span>
        </div>
      </div>
    </div>
  );
};
