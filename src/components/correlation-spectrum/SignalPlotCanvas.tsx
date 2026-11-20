import React, { useId, useRef, useState, useEffect, useMemo } from 'react';
import { Maximize2, Minimize2, Crosshair, X } from 'lucide-react';

export interface PlotSeries {
  id: string;
  name: string;
  color?: string;
  type?: 'line' | 'stem' | 'area';
  dash?: string;
  strokeWidth?: number;
  strokeOpacity?: number;
  fillOpacity?: number;
  markerStyle?: 'filled' | 'ring';
  points?: Array<{ x: number; y: number }>;
}

export interface OverlapShadingPoint {
  x: number;
  a: number;
  b: number;
}

export interface PlotMarker {
  x?: number;
  y?: number;
  label?: string;
  color?: string;
  style?: 'dashed' | 'solid';
  showPoint?: boolean;
}

export interface EchoLagHighlight {
  lag: number;
  value: number;
  unit: string;
  isDiscrete?: boolean;
  symmetric?: boolean;
}

export interface CombFilterHighlight {
  delay: number;   // tau_d (s) or k_d (samples)
  spacing: number; // 1 / tau_d (Hz or cyc/smp)
  alpha: number;
  unitLabel: string;
  isDiscrete?: boolean;
}

export interface SignalPlotCanvasProps {
  title: string;
  xLabel: string;
  yLabel: string;
  domain: [number, number];
  range: [number, number];
  isDiscrete?: boolean;
  series?: PlotSeries[];
  overlapShading?: OverlapShadingPoint[];
  markers?: PlotMarker[];
  echoLagHighlight?: EchoLagHighlight | null;
  combFilterHighlight?: CombFilterHighlight | null;
  height?: number;
  showZeroAxes?: boolean;
  statusBadge?: string;
  inspectAxisVar?: string;
  headerReadout?: React.ReactNode;
  subheaderReadout?: React.ReactNode;
  inspectExtra?: React.ReactNode;
  cornerReadout?: React.ReactNode;
  className?: string;
  enableFullscreen?: boolean;
  renderFullscreenControls?: (exitFullscreen: () => void) => React.ReactNode;
}

interface InspectedPoint {
  x: number;
  seriesValues: Array<{
    id: string;
    name: string;
    color: string;
    y: number;
  }>;
}

export const SignalPlotCanvas: React.FC<SignalPlotCanvasProps> = ({
  title,
  xLabel,
  yLabel,
  domain,
  range,
  isDiscrete = false,
  series = [],
  overlapShading,
  markers = [],
  echoLagHighlight = null,
  combFilterHighlight = null,
  height = 310,
  showZeroAxes = true,
  statusBadge,
  inspectAxisVar = 'x',
  headerReadout,
  subheaderReadout,
  inspectExtra,
  cornerReadout,
  className = '',
  enableFullscreen = true,
  renderFullscreenControls,
}) => {
  const rawId = useId();
  const clipId = rawId.replace(/[^a-zA-Z0-9_-]/g, '');
  const inlineSvgRef = useRef<SVGSVGElement | null>(null);
  const fullSvgRef = useRef<SVGSVGElement | null>(null);
  const fullContainerRef = useRef<HTMLDivElement | null>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullSize, setFullSize] = useState<{ width: number; height: number }>({ width: 1140, height: 520 });
  const [inspectedX, setInspectedX] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!isFullscreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFullscreen]);

  useEffect(() => {
    if (!isFullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isFullscreen]);

  useEffect(() => {
    if (!isFullscreen) return;
    const el = fullContainerRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 100 && rect.height > 100) {
        setFullSize({
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [isFullscreen]);

  const [xMin, xMax] = domain;
  const [yMin, yMax] = range;
  const xSpan = Math.max(1e-6, xMax - xMin);
  const ySpan = Math.max(1e-6, yMax - yMin);

  // Filter series points to the visible domain (+1 neighbor on each side for clean edge clipping)
  const visibleSeries = useMemo(() => {
    return series.map((s) => {
      const pts = s.points || [];
      if (pts.length === 0) return s;
      const filtered: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < pts.length; i++) {
        const pt = pts[i];
        const inRange = pt.x >= xMin && pt.x <= xMax;
        const leftNeighbor = i + 1 < pts.length && pts[i + 1].x >= xMin && pt.x < xMin;
        const rightNeighbor = i - 1 >= 0 && pts[i - 1].x <= xMax && pt.x > xMax;
        if (inRange || leftNeighbor || rightNeighbor) {
          filtered.push(pt);
        }
      }
      return { ...s, points: filtered };
    });
  }, [series, xMin, xMax]);

  // Snap click-to-inspect strictly within visible domain points
  const inspectedData: InspectedPoint | null = useMemo(() => {
    if (inspectedX === null) return null;
    const primaryPts = (visibleSeries[0]?.points || []).filter((p) => p.x >= xMin && p.x <= xMax);
    if (primaryPts.length === 0) return null;

    let bestX = primaryPts[0].x;
    let minDist = Math.abs(primaryPts[0].x - inspectedX);
    for (let i = 1; i < primaryPts.length; i++) {
      const d = Math.abs(primaryPts[i].x - inspectedX);
      if (d < minDist) {
        minDist = d;
        bestX = primaryPts[i].x;
      }
    }

    const seriesValues = visibleSeries
      .filter((s) => s.points && s.points.length > 0)
      .map((s) => {
        const pts = s.points!;
        let bestPt = pts[0];
        let bestD = Math.abs(pts[0].x - bestX);
        for (let i = 1; i < pts.length; i++) {
          const d = Math.abs(pts[i].x - bestX);
          if (d < bestD) {
            bestD = d;
            bestPt = pts[i];
          }
        }
        return {
          id: s.id,
          name: s.name,
          color: s.color || '#C85A32',
          y: bestPt.y,
        };
      });

    return { x: bestX, seriesValues };
  }, [inspectedX, visibleSeries, xMin, xMax]);

  const renderSvg = (
    svgHeight: number,
    svgWidth: number,
    refObj: React.RefObject<SVGSVGElement | null>,
    preserveAspect?: string
  ) => {
    const padding = { top: 24, right: 18, bottom: 36, left: 50 };
    const plotWidth = svgWidth - padding.left - padding.right;
    const plotHeight = svgHeight - padding.top - padding.bottom;

    const mapX = (x: number) => padding.left + ((x - xMin) / xSpan) * plotWidth;
    const mapY = (y: number) => padding.top + ((yMax - y) / ySpan) * plotHeight;

    const xTicksCount = isDiscrete && Math.abs(xSpan - 40) < 1e-3 ? 8 : 6;
    const xTicks = Array.from({ length: xTicksCount + 1 }, (_, i) => {
      const val = xMin + (i * xSpan) / xTicksCount;
      return Number(val.toFixed(2));
    });

    const yTicksCount = 4;
    const yTicks = Array.from({ length: yTicksCount + 1 }, (_, i) => {
      const val = yMin + (i * ySpan) / yTicksCount;
      return Number(val.toFixed(2));
    });

    const zeroX = mapX(0);
    const zeroY = mapY(0);
    const hasZeroX = zeroX >= padding.left && zeroX <= svgWidth - padding.right;
    const hasZeroY = zeroY >= padding.top && zeroY <= svgHeight - padding.bottom;

    const handlePointerToX = (clientX: number) => {
      const svgEl = refObj.current;
      if (!svgEl) return;
      const rect = svgEl.getBoundingClientRect();
      if (rect.width <= 0) return;
      const relX = ((clientX - rect.left) / rect.width) * svgWidth;
      const clampedPlotX = Math.max(padding.left, Math.min(svgWidth - padding.right, relX));
      const dataX = xMin + ((clampedPlotX - padding.left) / plotWidth) * xSpan;
      setInspectedX(dataX);
    };

    // Comb-filter notches at f = ±(m + 0.5) / tau_d, capped cleanly for readability
    const combNotches: number[] = [];
    if (combFilterHighlight && combFilterHighlight.spacing > 0) {
      const spacing = combFilterHighlight.spacing;
      const maxPos = Math.abs(xMax);
      const totalHalfNotches = Math.floor(maxPos / spacing);
      const maxDisplayedPerSide = 8;
      const limit = Math.min(maxDisplayedPerSide, totalHalfNotches);
      for (let m = 0; m <= limit; m++) {
        const fNotch = (m + 0.5) * spacing;
        if (fNotch <= xMax - 0.015 * xSpan) combNotches.push(fNotch);
        if (-fNotch >= xMin + 0.015 * xSpan) combNotches.push(-fNotch);
      }
    }

    const findNearestLocalMinY = (targetX: number): number | null => {
      const pts = visibleSeries[0]?.points;
      if (!pts || pts.length === 0) return null;
      let bestIdx = 0;
      let bestD = Math.abs(pts[0].x - targetX);
      for (let i = 1; i < pts.length; i++) {
        const d = Math.abs(pts[i].x - targetX);
        if (d < bestD) {
          bestD = d;
          bestIdx = i;
        }
      }
      let minY = pts[bestIdx].y;
      if (bestIdx > 0 && pts[bestIdx - 1].y < minY) minY = pts[bestIdx - 1].y;
      if (bestIdx + 1 < pts.length && pts[bestIdx + 1].y < minY) minY = pts[bestIdx + 1].y;
      return minY;
    };

    return (
      <svg
        ref={refObj}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        preserveAspectRatio={preserveAspect || 'xMidYMid meet'}
        className="w-full h-full block cursor-crosshair touch-none"
        onMouseDown={(e) => {
          setIsDragging(true);
          handlePointerToX(e.clientX);
        }}
        onMouseMove={(e) => {
          if (isDragging) handlePointerToX(e.clientX);
        }}
        onMouseUp={() => setIsDragging(false)}
        onMouseLeave={() => setIsDragging(false)}
        onDoubleClick={() => setInspectedX(null)}
        onTouchStart={(e) => {
          if (e.touches[0]) handlePointerToX(e.touches[0].clientX);
        }}
        onTouchMove={(e) => {
          if (e.touches[0]) handlePointerToX(e.touches[0].clientX);
        }}
      >
        <defs>
          <clipPath id={`${clipId}-${svgHeight}`}>
            <rect x={padding.left} y={padding.top} width={plotWidth} height={plotHeight} />
          </clipPath>
          {visibleSeries
            .filter((s) => s.type === 'area')
            .map((s) => {
              const fillStroke = s.color || '#C85A32';
              return (
                <linearGradient
                  key={`grad-${s.id}`}
                  id={`${clipId}-area-${s.id}-${svgHeight}`}
                  gradientUnits="userSpaceOnUse"
                  x1="0"
                  y1={padding.top}
                  x2="0"
                  y2={svgHeight - padding.bottom}
                >
                  <stop offset="0%" stopColor={fillStroke} stopOpacity={s.fillOpacity ?? 0.30} />
                  <stop offset="100%" stopColor={fillStroke} stopOpacity="0.10" />
                </linearGradient>
              );
            })}
        </defs>

        {/* Grid Lines */}
        <g className="grid-lines" stroke="#EAE8E1" strokeWidth="1">
          {xTicks.map((tick, i) => {
            const xPos = mapX(tick);
            return (
              <line
                key={`v-${i}`}
                x1={xPos}
                y1={padding.top}
                x2={xPos}
                y2={svgHeight - padding.bottom}
                strokeDasharray="2 2"
              />
            );
          })}
          {yTicks.map((tick, i) => {
            const yPos = mapY(tick);
            return (
              <line
                key={`h-${i}`}
                x1={padding.left}
                y1={yPos}
                x2={svgWidth - padding.right}
                y2={yPos}
                strokeDasharray="2 2"
              />
            );
          })}
        </g>

        {/* Zero Axes */}
        {showZeroAxes && (
          <g className="zero-axes">
            {hasZeroY && (
              <line
                x1={padding.left}
                y1={zeroY}
                x2={svgWidth - padding.right}
                y2={zeroY}
                stroke="#8A8882"
                strokeWidth="1.25"
              />
            )}
            {hasZeroX && (
              <line
                x1={zeroX}
                y1={padding.top}
                x2={zeroX}
                y2={svgHeight - padding.bottom}
                stroke="#8A8882"
                strokeWidth="1.25"
              />
            )}
          </g>
        )}

        {/* Comb-Filter Notches & 1/τ_d Spacing Bracket (PSD Channel Echo Highlight) */}
        {combFilterHighlight && combNotches.length > 0 && (
          <g className="comb-filter-highlight">
            {combNotches.map((fNotch, idx) => {
              const nx = mapX(fNotch);
              const nyVal = findNearestLocalMinY(fNotch);
              const ny = nyVal !== null ? mapY(nyVal) : null;
              return (
                <g key={`notch-${idx}`}>
                  <line
                    x1={nx}
                    y1={padding.top}
                    x2={nx}
                    y2={svgHeight - padding.bottom}
                    stroke="#2563EB"
                    strokeWidth="1.15"
                    strokeOpacity="0.28"
                    strokeDasharray="3 3"
                  />
                  {ny !== null && ny >= padding.top && ny <= svgHeight - padding.bottom && (
                    <circle
                      cx={nx}
                      cy={ny}
                      r="3.2"
                      fill="#FFFFFF"
                      stroke="#2563EB"
                      strokeWidth="1.75"
                    />
                  )}
                </g>
              );
            })}

            {/* Crisp Non-Overlapping 1/τ_d (or 1/k_d) Bracket */}
            {(() => {
              const s = combFilterHighlight.spacing;
              let fA = 0.5 * s;
              let fB = 1.5 * s;
              if (fB > xMax * 0.92) {
                fA = 0;
                fB = s;
              }
              if (fB > xMax * 0.98) return null;
              const xA = mapX(fA);
              const xB = mapX(fB);
              const bracketY = padding.top + 10;
              const valStr = combFilterHighlight.isDiscrete
                ? s.toFixed(3)
                : s >= 10
                ? s.toFixed(1)
                : s.toFixed(2);
              const approxLen = 7 + valStr.length + combFilterHighlight.unitLabel.length;
              const boxW = Math.max(108, approxLen * 6.2 + 16);
              const midX = (xA + xB) / 2;
              const bracketPx = xB - xA;
              const badgeX =
                bracketPx < boxW + 10
                  ? Math.min(svgWidth - padding.right - boxW - 4, xB + 8)
                  : Math.max(padding.left + 4, Math.min(svgWidth - padding.right - boxW - 4, midX - boxW / 2));
              const badgeY = bracketPx < boxW + 10 ? bracketY - 7 : bracketY + 6;

              return (
                <g>
                  <line x1={xA} y1={bracketY - 4} x2={xA} y2={bracketY + 4} stroke="#2563EB" strokeWidth="1.6" />
                  <line x1={xB} y1={bracketY - 4} x2={xB} y2={bracketY + 4} stroke="#2563EB" strokeWidth="1.6" />
                  <line x1={xA} y1={bracketY} x2={xB} y2={bracketY} stroke="#2563EB" strokeWidth="1.6" />
                  <rect
                    x={badgeX}
                    y={badgeY}
                    width={boxW}
                    height={19}
                    rx="4"
                    fill="#FFFFFF"
                    fillOpacity="0.95"
                    stroke="#93C5FD"
                    strokeWidth="1"
                  />
                  <text
                    x={badgeX + boxW / 2}
                    y={badgeY + 13}
                    textAnchor="middle"
                    className="text-[10px] font-mono font-bold fill-[#1D4ED8]"
                  >
                    {combFilterHighlight.isDiscrete ? '1/k' : '1/τ'}
                    <tspan dy="2" fontSize="7.5">d</tspan>
                    <tspan dy="-2">{` = ${valStr} ${combFilterHighlight.unitLabel}`}</tspan>
                  </text>
                </g>
              );
            })()}
          </g>
        )}

        {/* Secondary Echo Correlation Peak Highlight at lag = τ_d */}
        {echoLagHighlight && (() => {
          const ex = mapX(echoLagHighlight.lag);
          const ey = mapY(echoLagHighlight.value);
          const inBounds = ex >= padding.left && ex <= svgWidth - padding.right;
          if (!inBounds) return null;

          const negEx = mapX(-echoLagHighlight.lag);
          const negInBounds =
            echoLagHighlight.symmetric && negEx >= padding.left && negEx <= svgWidth - padding.right;

          const valStr = echoLagHighlight.isDiscrete
            ? `${Math.round(echoLagHighlight.lag)}`
            : `${echoLagHighlight.lag.toFixed(2)}s`;
          const boxW = Math.max(96, (9 + valStr.length) * 6.2 + 14);
          // Offset badge cleanly to the right of the vertical echo line so it never overlaps zero-axis
          const badgeX =
            ex + 8 + boxW <= svgWidth - padding.right
              ? ex + 8
              : Math.max(padding.left + 4, ex - 8 - boxW);

          return (
            <g className="echo-peak-highlight">
              <rect
                x={Math.max(padding.left, ex - 9)}
                y={padding.top}
                width={18}
                height={plotHeight}
                fill="#2563EB"
                fillOpacity="0.07"
              />
              {negInBounds && (
                <line
                  x1={negEx}
                  y1={padding.top}
                  x2={negEx}
                  y2={svgHeight - padding.bottom}
                  stroke="#2563EB"
                  strokeWidth="1.25"
                  strokeOpacity="0.4"
                  strokeDasharray="4 3"
                />
              )}
              <line
                x1={ex}
                y1={padding.top}
                x2={ex}
                y2={svgHeight - padding.bottom}
                stroke="#2563EB"
                strokeWidth="1.75"
                strokeDasharray="4 3"
              />
              {ey >= padding.top && ey <= svgHeight - padding.bottom && (
                <g>
                  <circle cx={ex} cy={ey} r="9" fill="#2563EB" fillOpacity="0.18" />
                  <circle cx={ex} cy={ey} r="4.5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="1.5" />
                </g>
              )}
              <rect
                x={badgeX}
                y={padding.top + 6}
                width={boxW}
                height={19}
                rx="4"
                fill="#FFFFFF"
                fillOpacity="0.95"
                stroke="#93C5FD"
                strokeWidth="1"
              />
              <text
                x={badgeX + boxW / 2}
                y={padding.top + 19}
                textAnchor="middle"
                className="text-[10px] font-mono font-bold fill-[#1D4ED8]"
              >
                {echoLagHighlight.isDiscrete ? 'Echo k' : 'Echo τ'}
                <tspan dy="2" fontSize="7.5">d</tspan>
                <tspan dy="-2">{` = ${valStr}`}</tspan>
              </text>
            </g>
          );
        })()}

        {/* Standard Reference Markers */}
        {markers.map((m, idx) => {
          if (m.x === undefined) return null;
          const mx = mapX(m.x);
          if (mx < padding.left || mx > svgWidth - padding.right) return null;
          const my = m.y !== undefined ? mapY(m.y) : undefined;
          return (
            <g key={`marker-x-${idx}`}>
              <line
                x1={mx}
                y1={padding.top}
                x2={mx}
                y2={svgHeight - padding.bottom}
                stroke={m.color || '#C85A32'}
                strokeWidth="1.4"
                strokeDasharray={m.style === 'solid' ? 'none' : '3 3'}
              />
              {my !== undefined && my >= padding.top && my <= svgHeight - padding.bottom && (
                <g>
                  <circle cx={mx} cy={my} r="5.5" fill={m.color || '#C85A32'} fillOpacity="0.22" />
                  <circle cx={mx} cy={my} r="3" fill={m.color || '#C85A32'} />
                </g>
              )}
            </g>
          );
        })}

        {/* Bounding Box */}
        <rect
          x={padding.left}
          y={padding.top}
          width={plotWidth}
          height={plotHeight}
          fill="none"
          stroke="#D1CFCE"
          strokeWidth="1"
        />

        {/* Plot Series (+ Optional Overlap Shading Underlay) */}
        <g clipPath={`url(#${clipId}-${svgHeight})`}>
          {overlapShading && overlapShading.length > 0 && (() => {
            const base = hasZeroY ? zeroY : svgHeight - padding.bottom;
            const visibleOv = overlapShading.filter((pt, idx, arr) => {
              const inRange = pt.x >= xMin && pt.x <= xMax;
              const leftN = idx + 1 < arr.length && arr[idx + 1].x >= xMin && pt.x < xMin;
              const rightN = idx - 1 >= 0 && arr[idx - 1].x <= xMax && pt.x > xMax;
              return inRange || leftN || rightN;
            });

            if (isDiscrete) {
              return (
                <g className="overlap-shading-dts">
                  {visibleOv
                    .filter((pt) => pt.x >= xMin && pt.x <= xMax && Math.abs(pt.a * pt.b) > 1e-6)
                    .map((pt, idx) => {
                      const cx = mapX(pt.x);
                      const minMag = Math.min(Math.abs(pt.a), Math.abs(pt.b));
                      if (pt.a * pt.b > 0) {
                        const yEdge = mapY((pt.a >= 0 ? 1 : -1) * minMag);
                        return (
                          <rect
                            key={`ov-pos-${idx}`}
                            x={cx - 4.5}
                            y={Math.min(base, yEdge)}
                            width={9}
                            height={Math.abs(yEdge - base)}
                            rx="1.5"
                            fill="#10B981"
                            fillOpacity="0.22"
                          />
                        );
                      }
                      const yTop = mapY(minMag);
                      const yBot = mapY(-minMag);
                      return (
                        <rect
                          key={`ov-neg-${idx}`}
                          x={cx - 4.5}
                          y={yTop}
                          width={9}
                          height={Math.abs(yBot - yTop)}
                          rx="1.5"
                          fill="#EF4444"
                          fillOpacity="0.18"
                        />
                      );
                    })}
                </g>
              );
            }

            // CTS contiguous reinforce (+) and oppose (-) shading paths
            let posPath = '';
            let negPath = '';

            let i = 0;
            while (i < visibleOv.length) {
              const p = visibleOv[i];
              if (p.a * p.b > 1e-6) {
                const start = i;
                const sign = p.a >= 0 ? 1 : -1;
                while (
                  i + 1 < visibleOv.length &&
                  visibleOv[i + 1].a * visibleOv[i + 1].b > 1e-6 &&
                  (visibleOv[i + 1].a >= 0 ? 1 : -1) === sign
                ) {
                  i++;
                }
                const end = i;
                const xStart = mapX(visibleOv[start].x);
                const xEnd = mapX(visibleOv[end].x);
                let seg = `M ${xStart} ${base}`;
                for (let k = start; k <= end; k++) {
                  const pt = visibleOv[k];
                  const m = Math.min(Math.abs(pt.a), Math.abs(pt.b));
                  seg += ` L ${mapX(pt.x)} ${mapY(sign * m)}`;
                }
                seg += ` L ${xEnd} ${base} Z`;
                posPath += ` ${seg}`;
              } else if (p.a * p.b < -1e-6) {
                const start = i;
                while (i + 1 < visibleOv.length && visibleOv[i + 1].a * visibleOv[i + 1].b < -1e-6) {
                  i++;
                }
                const end = i;
                let seg = '';
                for (let k = start; k <= end; k++) {
                  const pt = visibleOv[k];
                  const m = Math.min(Math.abs(pt.a), Math.abs(pt.b));
                  seg += k === start ? `M ${mapX(pt.x)} ${mapY(m)}` : ` L ${mapX(pt.x)} ${mapY(m)}`;
                }
                for (let k = end; k >= start; k--) {
                  const pt = visibleOv[k];
                  const m = Math.min(Math.abs(pt.a), Math.abs(pt.b));
                  seg += ` L ${mapX(pt.x)} ${mapY(-m)}`;
                }
                seg += ' Z';
                negPath += ` ${seg}`;
              }
              i++;
            }

            return (
              <g className="overlap-shading-cts">
                {posPath && <path d={posPath} fill="#10B981" fillOpacity="0.20" stroke="none" />}
                {negPath && <path d={negPath} fill="#EF4444" fillOpacity="0.16" stroke="none" />}
              </g>
            );
          })()}

          {visibleSeries.map((s) => {
            if (!s.points || s.points.length === 0) return null;
            const stroke = s.color || '#C85A32';
            const opacity = s.strokeOpacity ?? 1;

            if (isDiscrete || s.type === 'stem') {
              return (
                <g key={s.id} className="stem-series">
                  {s.points
                    .filter((pt) => pt.x >= xMin && pt.x <= xMax)
                    .map((pt, pIdx) => {
                      const cx = mapX(pt.x);
                      const cy = mapY(pt.y);
                      const base = hasZeroY ? zeroY : svgHeight - padding.bottom;
                      return (
                        <g key={pIdx}>
                          <line
                            x1={cx}
                            y1={base}
                            x2={cx}
                            y2={cy}
                            stroke={stroke}
                            strokeWidth={s.strokeWidth || 1.5}
                            strokeOpacity={opacity}
                          />
                          {s.markerStyle === 'ring' ? (
                            <circle cx={cx} cy={cy} r="3.75" fill="none" stroke={stroke} strokeWidth="1.75" />
                          ) : (
                            <circle cx={cx} cy={cy} r="2.5" fill={stroke} fillOpacity={opacity} />
                          )}
                        </g>
                      );
                    })}
                </g>
              );
            }

            const pathData = s.points.reduce((acc, pt, i) => {
              const xPos = mapX(pt.x);
              const yPos = mapY(pt.y);
              return i === 0 ? `M ${xPos} ${yPos}` : `${acc} L ${xPos} ${yPos}`;
            }, '');

            const areaBaseY = hasZeroY ? zeroY : svgHeight - padding.bottom;
            const areaPathData =
              s.type === 'area' && s.points.length > 1
                ? `${pathData} L ${mapX(s.points[s.points.length - 1].x)} ${areaBaseY} L ${mapX(
                    s.points[0].x
                  )} ${areaBaseY} Z`
                : null;

            return (
              <g key={s.id}>
                {areaPathData && (
                  <path
                    d={areaPathData}
                    fill={`url(#${clipId}-area-${s.id}-${svgHeight})`}
                    stroke="none"
                  />
                )}
                <path
                  d={pathData}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={s.strokeWidth || (s.dash ? 2.4 : 2.1)}
                  strokeDasharray={s.dash || 'none'}
                  strokeOpacity={opacity}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            );
          })}
        </g>

        {/* Click-to-Inspect Crosshair & Point Dots */}
        {inspectedData && (() => {
          const ix = mapX(inspectedData.x);
          if (ix < padding.left || ix > svgWidth - padding.right) return null;
          return (
            <g className="click-inspector">
              <line
                x1={ix}
                y1={padding.top}
                x2={ix}
                y2={svgHeight - padding.bottom}
                stroke="#1A1917"
                strokeWidth="1.25"
                strokeDasharray="2 2"
              />
              {inspectedData.seriesValues.map((sv) => {
                const iy = mapY(sv.y);
                if (iy < padding.top || iy > svgHeight - padding.bottom) return null;
                return (
                  <g key={sv.id}>
                    <circle cx={ix} cy={iy} r="6.5" fill={sv.color} fillOpacity="0.2" />
                    <circle cx={ix} cy={iy} r="3.75" fill={sv.color} stroke="#FFFFFF" strokeWidth="1.5" />
                  </g>
                );
              })}
            </g>
          );
        })()}

        {/* Axis Labels & Ticks */}
        <g className="axis-labels font-mono text-[10px] fill-[#585651]">
          {xTicks.map((val, i) => (
            <text key={`xt-${i}`} x={mapX(val)} y={svgHeight - padding.bottom + 14} textAnchor="middle">
              {val}
            </text>
          ))}
          <text
            x={padding.left + plotWidth / 2}
            y={svgHeight - 6}
            textAnchor="middle"
            className="text-[11px] font-mono font-semibold fill-[#1A1917]"
          >
            {xLabel}
          </text>

          {yTicks.map((val, i) => (
            <text key={`yt-${i}`} x={padding.left - 6} y={mapY(val) + 3.5} textAnchor="end">
              {val}
            </text>
          ))}
          <text
            x={14}
            y={padding.top + plotHeight / 2}
            textAnchor="middle"
            transform={`rotate(-90, 14, ${padding.top + plotHeight / 2})`}
            className="text-[11px] font-mono font-semibold fill-[#1A1917]"
          >
            {yLabel}
          </text>
        </g>
      </svg>
    );
  };

  const renderInspectChip = () => {
    if (!inspectedData) {
      return (
        <span className="inline-flex items-center gap-1 text-[10.5px] font-mono text-[#8A8882]">
          <Crosshair className="w-3 h-3" />
          <span className="hidden sm:inline">Click plot to inspect</span>
        </span>
      );
    }
    return (
      <div className="inline-flex flex-wrap items-center gap-2 bg-[#FBF4F0] border border-[#C85A32]/30 rounded px-2 py-0.5 text-[11px] font-mono">
        <span className="font-bold text-[#1A1917]">
          {inspectAxisVar} = {Math.abs(inspectedData.x) < 1e-4 ? '0' : inspectedData.x.toFixed(isDiscrete ? 0 : 3)}
        </span>
        {inspectedData.seriesValues.map((sv) => (
          <span key={sv.id} className="inline-flex items-center gap-1 text-[#3E3D39]">
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: sv.color }} />
            <span>{sv.name}:</span>
            <strong className="text-[#1A1917]">{sv.y.toFixed(4)}</strong>
          </span>
        ))}
        {inspectExtra}
        <button
          type="button"
          onClick={() => setInspectedX(null)}
          className="text-[#8A8882] hover:text-[#1A1917] cursor-pointer"
          title="Clear readout"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  };

  const renderHeader = (fullscreenMode: boolean) => (
    <div className="pb-2 border-b border-[#E6E4DD] mb-2 space-y-1.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="text-xs font-heading font-semibold tracking-wider uppercase text-[#1A1917]">
            {title}
          </h4>
          {statusBadge && (
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#FAF9F6] border border-[#E6E4DD] text-[#585651] font-medium">
              {statusBadge}
            </span>
          )}
          {headerReadout}
          {renderInspectChip()}
        </div>

        <div className="flex items-center gap-2">
          {series.length > 0 && (
            <div className="flex flex-wrap items-center gap-2.5 bg-[#FAF9F6] px-2 py-0.5 rounded border border-[#E6E4DD]">
              {series.map((s) => (
                <div key={s.id} className="flex items-center gap-1.5 text-[10.5px] font-mono">
                  {s.type === 'area' ? (
                    <span
                      className="w-3 h-2 rounded-t-[1px] border-t-2 inline-block"
                      style={{
                        borderColor: s.color || '#C85A32',
                        backgroundColor: 'rgba(200, 90, 50, 0.24)',
                      }}
                    />
                  ) : s.dash ? (
                    <span
                      className="w-3 h-0 border-t-2 border-dashed inline-block"
                      style={{ borderColor: s.color || '#C85A32' }}
                    />
                  ) : s.markerStyle === 'ring' ? (
                    <span
                      className="w-2 h-2 rounded-full border-2 inline-block"
                      style={{ borderColor: s.color || '#C85A32' }}
                    />
                  ) : (
                    <span
                      className="w-2.5 h-1.5 rounded-xs inline-block"
                      style={{ backgroundColor: s.color || '#C85A32' }}
                    />
                  )}
                  <span className="text-[#3E3D39] font-medium">{s.name}</span>
                </div>
              ))}
              {overlapShading && overlapShading.length > 0 && (
                <>
                  <div className="flex items-center gap-1 text-[10px] font-mono text-[#047857]">
                    <span className="w-2 h-2 rounded-xs bg-[#10B981]/35 border border-[#10B981]/60 inline-block" />
                    <span>+</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-mono text-[#B91C1C]">
                    <span className="w-2 h-2 rounded-xs bg-[#EF4444]/30 border border-[#EF4444]/55 inline-block" />
                    <span>−</span>
                  </div>
                </>
              )}
            </div>
          )}

          {enableFullscreen && (
            <button
              type="button"
              onClick={() => setIsFullscreen(!fullscreenMode)}
              className="inline-flex items-center gap-1 px-2 py-1 text-[10.5px] font-mono font-medium text-[#585651] hover:text-[#1A1917] bg-[#FAF9F6] hover:bg-[#F3F2EC] border border-[#E6E4DD] rounded transition-colors cursor-pointer"
              title={fullscreenMode ? 'Exit Full-Screen (Esc)' : 'Open Full-Screen'}
            >
              {fullscreenMode ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-[#C85A32]" />
                  <span>Exit</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-[#75736E]" />
                  <span className="hidden sm:inline">Full-Screen</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {subheaderReadout}
    </div>
  );

  return (
    <>
      <div
        className={`bg-white border border-[#E6E4DD] rounded-lg p-2.5 sm:p-3 flex flex-col shadow-xs select-none ${className}`}
      >
        {renderHeader(false)}

        <div className="relative w-full overflow-hidden bg-[#FAF9F6] rounded border border-[#E6E4DD]">
          {renderSvg(height, 840, inlineSvgRef)}
          {cornerReadout && (
            <div className="pointer-events-none absolute top-[18px] left-[32px] sm:top-[25px] sm:left-[52px] z-10">
              {cornerReadout}
            </div>
          )}
        </div>
      </div>

      {/* Full-Screen Graph Modal with Single-Row Floating Control Bar */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-[#FAF9F6] flex flex-col p-3 sm:p-4 gap-2.5 select-none">
          <div className="bg-white border border-[#E6E4DD] rounded-xl p-3 sm:p-4 flex-1 min-h-0 flex flex-col shadow-sm">
            {renderHeader(true)}
            <div
              ref={fullContainerRef}
              className="relative flex-1 min-h-0 w-full bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] overflow-hidden"
            >
              {renderSvg(fullSize.height, fullSize.width, fullSvgRef, 'xMidYMid meet')}
              {cornerReadout && (
                <div className="pointer-events-none absolute top-[30px] left-[58px] z-10">
                  {cornerReadout}
                </div>
              )}
            </div>
          </div>

          {renderFullscreenControls && (
            <div className="flex justify-center shrink-0">
              <div className="w-full max-w-6xl bg-white/95 backdrop-blur-md border border-[#E6E4DD] shadow-lg rounded-xl px-3 py-2">
                {renderFullscreenControls(() => setIsFullscreen(false))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
};
