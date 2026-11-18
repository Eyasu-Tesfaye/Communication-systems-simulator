import React, { useId, useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Maximize2, Minimize2, Sliders, X } from 'lucide-react';

export interface PlotSeries {
  id: string;
  name: string;
  color?: string;
  type?: 'line' | 'stem' | 'area';
  dash?: string;
  strokeWidth?: number;
  strokeOpacity?: number;
  markerStyle?: 'filled' | 'ring';
  points?: Array<{ x: number; y: number }>;
}

export interface PlotMarker {
  x?: number;
  y?: number;
  label?: string;
  color?: string;
  style?: 'dashed' | 'solid';
  showPoint?: boolean;
}

export interface PlotAnnotation {
  id: string;
  x: number;
  y: number;
  title: string;
  value: string;
  subtext?: string;
  color?: string;
  accentBg?: string;
  placement?: 'top' | 'bottom' | 'auto';
}

export interface PlotCornerStat {
  label: string;
  value: string;
  subtext?: string;
  color?: string;
}

export interface SignalPlotCanvasProps {
  title: string;
  subtitle?: string;
  xLabel: string;
  yLabel: string;
  domain: [number, number];
  range: [number, number];
  isDiscrete?: boolean;
  series?: PlotSeries[];
  markers?: PlotMarker[];
  annotations?: PlotAnnotation[];
  cornerStat?: PlotCornerStat;
  resultCard?: React.ReactNode;
  height?: number;
  showZeroAxes?: boolean;
  emptyStateText?: string;
  statusBadge?: string;
  className?: string;
  expandedSidebar?: React.ReactNode;
  expandedTitle?: string;
  headerActions?: React.ReactNode;
}

function formatTickValue(val: number, span: number): string {
  if (Math.abs(val) < 1e-9) return '0';
  if (span < 0.05) return val.toFixed(3);
  if (span < 0.5) return val.toFixed(2);
  if (span < 10) return Number(val.toFixed(2)).toString();
  return Number(val.toFixed(1)).toString();
}

function formatReadoutValue(val: number, span: number): string {
  if (Math.abs(val) < 1e-9) return '0.000';
  if (Math.abs(val) < 0.001 && val !== 0) return val.toExponential(2);
  if (span < 0.5) return val.toFixed(4);
  if (span < 10) return val.toFixed(3);
  return val.toFixed(2);
}

function findNearestPoint(pts: Array<{ x: number; y: number }>, targetX: number): { x: number; y: number } | null {
  if (!pts || pts.length === 0) return null;
  let lo = 0;
  let hi = pts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (pts[mid].x < targetX) lo = mid + 1;
    else hi = mid;
  }
  if (lo > 0 && Math.abs(pts[lo - 1].x - targetX) < Math.abs(pts[lo].x - targetX)) {
    return pts[lo - 1];
  }
  return pts[lo];
}

interface InnerSvgProps {
  title: string;
  xLabel: string;
  yLabel: string;
  domain: [number, number];
  range: [number, number];
  isDiscrete: boolean;
  series: PlotSeries[];
  markers: PlotMarker[];
  showZeroAxes: boolean;
  emptyStateText: string;
  fallbackHeight: number;
  isExpanded: boolean;
}

const PlotSvgViewport: React.FC<InnerSvgProps> = ({
  xLabel,
  yLabel,
  domain,
  range,
  isDiscrete,
  series,
  markers,
  showZeroAxes,
  emptyStateText,
  fallbackHeight,
  isExpanded,
}) => {
  const clipId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [size, setSize] = useState<{ width: number; height: number }>({
    width: isExpanded ? 960 : 640,
    height: isExpanded ? 540 : fallbackHeight,
  });

  const [hoverX, setHoverX] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 40 && rect.height > 40) {
        setSize({
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        });
      }
    };

    updateSize();
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => updateSize());
      observer.observe(el);
      return () => observer.disconnect();
    }
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [isExpanded]);

  const width = Math.max(280, size.width);
  const height = Math.max(140, size.height);
  const padding = useMemo(
    () => ({
      top: isExpanded ? 24 : 14,
      right: isExpanded ? 28 : 16,
      bottom: isExpanded ? 44 : 36,
      left: isExpanded ? 64 : 52,
    }),
    [isExpanded]
  );

  const plotWidth = Math.max(80, width - padding.left - padding.right);
  const plotHeight = Math.max(60, height - padding.top - padding.bottom);

  const [xMin, xMax] = domain;
  const [yMin, yMax] = range;
  const xSpan = Math.max(1e-9, xMax - xMin);
  const ySpan = Math.max(1e-9, yMax - yMin);

  const mapX = useCallback(
    (x: number) => padding.left + ((x - xMin) / xSpan) * plotWidth,
    [padding.left, xMin, xSpan, plotWidth]
  );

  const mapY = useCallback(
    (y: number) => padding.top + ((yMax - y) / ySpan) * plotHeight,
    [padding.top, yMax, ySpan, plotHeight]
  );

  const xTicksCount = width > 560 ? 6 : 4;
  const xTicks = useMemo(
    () => Array.from({ length: xTicksCount + 1 }, (_, i) => xMin + (i * xSpan) / xTicksCount),
    [xTicksCount, xMin, xSpan]
  );

  const yTicksCount = height > 260 ? 5 : 4;
  const yTicks = useMemo(
    () => Array.from({ length: yTicksCount + 1 }, (_, i) => yMin + (i * ySpan) / yTicksCount),
    [yTicksCount, yMin, ySpan]
  );

  const zeroX = mapX(0);
  const zeroY = mapY(0);
  const hasZeroX = zeroX >= padding.left && zeroX <= width - padding.right;
  const hasZeroY = zeroY >= padding.top && zeroY <= height - padding.bottom;
  const hasData = series.some((s) => s.points && s.points.length > 0);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || !hasData) return;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / Math.max(1, rect.width)) * width;
    if (px < padding.left || px > width - padding.right) {
      setHoverX(null);
      return;
    }
    const dataX = xMin + ((px - padding.left) / plotWidth) * xSpan;
    setHoverX(dataX);
  };

  const hoverPoints = useMemo(() => {
    if (hoverX === null) return [];
    return series
      .map((s) => {
        if (!s.points || s.points.length === 0) return null;
        const pt = findNearestPoint(s.points, hoverX);
        if (!pt) return null;
        return {
          id: s.id,
          name: s.name,
          color: s.color || '#C85A32',
          x: pt.x,
          y: pt.y,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [hoverX, series]);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 min-h-0 w-full overflow-hidden bg-[#FAF9F6] rounded border border-[#E6E4DD]"
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full block"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverX(null)}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={padding.left} y={padding.top} width={plotWidth} height={plotHeight} />
          </clipPath>
        </defs>

        {/* Grid lines */}
        <g className="grid-lines" stroke="#EAE8E1" strokeWidth="1">
          {xTicks.map((tick, i) => {
            const xPos = mapX(tick);
            return (
              <line
                key={`v-${i}`}
                x1={xPos}
                y1={padding.top}
                x2={xPos}
                y2={height - padding.bottom}
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
                x2={width - padding.right}
                y2={yPos}
                strokeDasharray="2 2"
              />
            );
          })}
        </g>

        {/* Coordinate Zero Axes */}
        {showZeroAxes && (
          <g className="zero-axes">
            {hasZeroY && (
              <line
                x1={padding.left}
                y1={zeroY}
                x2={width - padding.right}
                y2={zeroY}
                stroke="#8A8882"
                strokeWidth="1.2"
              />
            )}
            {hasZeroX && (
              <line
                x1={zeroX}
                y1={padding.top}
                x2={zeroX}
                y2={height - padding.bottom}
                stroke="#8A8882"
                strokeWidth="1.2"
              />
            )}
          </g>
        )}

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

        {/* Reference Markers */}
        {markers.map((m, idx) => {
          if (m.x === undefined) return null;
          const mx = mapX(m.x);
          if (mx < padding.left || mx > width - padding.right) return null;
          const my = m.y !== undefined ? mapY(m.y) : undefined;
          return (
            <g key={`marker-x-${idx}`}>
              <line
                x1={mx}
                y1={padding.top}
                x2={mx}
                y2={height - padding.bottom}
                stroke={m.color || '#C85A32'}
                strokeWidth="1.4"
                strokeDasharray={m.style === 'solid' ? 'none' : '3 3'}
              />
              {my !== undefined && my >= padding.top && my <= height - padding.bottom && (
                <g>
                  <circle cx={mx} cy={my} r="5" fill={m.color || '#C85A32'} fillOpacity="0.22" />
                  <circle cx={mx} cy={my} r="3" fill={m.color || '#C85A32'} />
                </g>
              )}
            </g>
          );
        })}

        {/* Series Data */}
        <g clipPath={`url(#${clipId})`}>
          {series.map((s) => {
            if (!s.points || s.points.length === 0) return null;
            const stroke = s.color || '#C85A32';
            const opacity = s.strokeOpacity ?? 1;

            if (isDiscrete || s.type === 'stem') {
              return (
                <g key={s.id} className="stem-series">
                  {s.points.map((pt, pIdx) => {
                    const cx = mapX(pt.x);
                    const cy = mapY(pt.y);
                    const base = hasZeroY ? zeroY : height - padding.bottom;
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
                          <circle
                            cx={cx}
                            cy={cy}
                            r="3.5"
                            fill="none"
                            stroke={stroke}
                            strokeWidth="1.6"
                          />
                        ) : (
                          <circle
                            cx={cx}
                            cy={cy}
                            r="2.4"
                            fill={stroke}
                            fillOpacity={opacity}
                          />
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

            return (
              <g key={s.id}>
                <path
                  d={pathData}
                  fill="none"
                  stroke={stroke}
                  strokeWidth={s.strokeWidth || (s.dash ? 2.25 : 1.9)}
                  strokeDasharray={s.dash || 'none'}
                  strokeOpacity={opacity}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </g>
            );
          })}
        </g>

        {/* Interactive Hover Crosshair */}
        {hoverPoints.length > 0 && (
          <g className="pointer-events-none">
            <line
              x1={mapX(hoverPoints[0].x)}
              y1={padding.top}
              x2={mapX(hoverPoints[0].x)}
              y2={height - padding.bottom}
              stroke="#1A1917"
              strokeWidth="1"
              strokeOpacity="0.3"
              strokeDasharray="3 3"
            />
            {hoverPoints.map((hp) => {
              const cx = mapX(hp.x);
              const cy = mapY(hp.y);
              if (cy < padding.top || cy > height - padding.bottom) return null;
              return (
                <circle
                  key={`hp-${hp.id}`}
                  cx={cx}
                  cy={cy}
                  r="4"
                  fill="#FFFFFF"
                  stroke={hp.color}
                  strokeWidth="2"
                />
              );
            })}
          </g>
        )}

        {/* Empty State */}
        {!hasData && (
          <g>
            <rect
              x={padding.left + plotWidth / 2 - 110}
              y={padding.top + plotHeight / 2 - 16}
              width="220"
              height="32"
              rx="4"
              fill="#FFFFFF"
              fillOpacity="0.9"
              stroke="#E6E4DD"
            />
            <text
              x={padding.left + plotWidth / 2}
              y={padding.top + plotHeight / 2 + 4}
              textAnchor="middle"
              className="text-[11px] font-mono font-medium fill-[#75736E]"
            >
              {emptyStateText}
            </text>
          </g>
        )}

        {/* Axis Ticks & Labels */}
        <g className="axis-labels font-mono text-[10px] fill-[#585651]">
          {xTicks.map((val, i) => (
            <text
              key={`xt-${i}`}
              x={mapX(val)}
              y={height - padding.bottom + 14}
              textAnchor="middle"
            >
              {formatTickValue(val, xSpan)}
            </text>
          ))}
          <text
            x={padding.left + plotWidth / 2}
            y={height - 6}
            textAnchor="middle"
            className="text-[10.5px] font-mono font-semibold fill-[#1A1917]"
          >
            {xLabel}
          </text>

          {yTicks.map((val, i) => (
            <text
              key={`yt-${i}`}
              x={padding.left - 6}
              y={mapY(val) + 3.5}
              textAnchor="end"
            >
              {formatTickValue(val, ySpan)}
            </text>
          ))}
          <text
            x={13}
            y={padding.top + plotHeight / 2}
            textAnchor="middle"
            transform={`rotate(-90, 13, ${padding.top + plotHeight / 2})`}
            className="text-[10.5px] font-mono font-semibold fill-[#1A1917]"
          >
            {yLabel}
          </text>
        </g>
      </svg>

      {/* Lightweight Coordinate Tooltip */}
      {hoverPoints.length > 0 && (
        <div className="pointer-events-none absolute top-2 right-2 bg-white/95 backdrop-blur-xs border border-[#E6E4DD] rounded px-2 py-1 shadow-xs text-[10px] font-mono text-[#1A1917] flex items-center gap-2.5">
          <span className="text-[#75736E]">
            x={formatReadoutValue(hoverPoints[0].x, xSpan)}
          </span>
          {hoverPoints.map((hp) => (
            <span key={hp.id} className="flex items-center gap-1 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: hp.color }} />
              <span>{hp.name}:</span>
              <span className="text-[#C85A32]">{formatReadoutValue(hp.y, ySpan)}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export const SignalPlotCanvas: React.FC<SignalPlotCanvasProps> = ({
  title,
  subtitle,
  xLabel,
  yLabel,
  domain,
  range,
  isDiscrete = false,
  series = [],
  markers = [],
  cornerStat,
  resultCard,
  height = 200,
  showZeroAxes = true,
  emptyStateText = 'Awaiting engine evaluation',
  statusBadge,
  className = '',
  expandedSidebar,
  expandedTitle,
  headerActions,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!isExpanded) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isExpanded]);

  const renderLegend = () => {
    if (series.length === 0) return null;
    return (
      <div className="flex items-center gap-2 bg-[#FAF9F6] px-2 py-0.5 rounded border border-[#E6E4DD] shrink-0">
        {series.map((s) => (
          <div key={s.id} className="flex items-center gap-1 text-[10.5px] font-mono">
            {s.dash && s.dash !== 'none' ? (
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
            <span className="text-[#3E3D39] font-medium whitespace-nowrap">{s.name}</span>
          </div>
        ))}
      </div>
    );
  };

  const fullScreenOverlay =
    isExpanded && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="fixed inset-0 z-[100] w-screen h-screen bg-white text-[#1A1917] flex flex-col overflow-hidden select-none"
            role="dialog"
            aria-modal="true"
            aria-label={expandedTitle || title}
          >
            {/* Full-Screen Top Header */}
            <header className="h-12 px-4 border-b border-[#E6E4DD] bg-[#FAF9F6] flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-[10px] font-mono font-bold tracking-wider uppercase text-[#C85A32] bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/25 shrink-0">
                  FULL-SCREEN GRAPH
                </span>
                <h3 className="text-sm font-heading font-semibold text-[#1A1917] truncate">
                  {expandedTitle || title}
                </h3>
                {subtitle && (
                  <span className="hidden xl:inline text-xs font-mono text-[#75736E] truncate">
                    · {subtitle}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                {renderLegend()}
                <button
                  type="button"
                  onClick={() => setIsExpanded(false)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1A1917] hover:bg-[#3E3D39] text-white text-xs font-mono font-semibold transition-colors cursor-pointer"
                  title="Exit Full-Screen (ESC)"
                >
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Exit Full-Screen</span>
                  <span className="hidden sm:inline text-[10px] text-[#D1CFCE] ml-0.5">(ESC)</span>
                </button>
              </div>
            </header>

            {/* Full-Screen Body: Expanded Graph + Contextual Right Sidebar */}
            <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
              <div className="flex-1 min-w-0 min-h-0 flex flex-col p-4 gap-3 bg-white overflow-hidden">
                {resultCard && <div className="shrink-0">{resultCard}</div>}
                {!resultCard && cornerStat && (
                  <div className="shrink-0 flex items-center justify-between bg-[#FAF9F6] border border-[#E6E4DD] rounded px-3 py-1.5 text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#C85A32]" />
                      <span className="font-bold text-[#C85A32]">{cornerStat.label}</span>
                      {cornerStat.subtext && (
                        <span className="text-[#75736E] text-[11px]">({cornerStat.subtext})</span>
                      )}
                    </div>
                    <span className="font-bold text-[#1A1917] text-sm">{cornerStat.value}</span>
                  </div>
                )}

                <PlotSvgViewport
                  title={title}
                  xLabel={xLabel}
                  yLabel={yLabel}
                  domain={domain}
                  range={range}
                  isDiscrete={isDiscrete}
                  series={series}
                  markers={markers}
                  showZeroAxes={showZeroAxes}
                  emptyStateText={emptyStateText}
                  fallbackHeight={520}
                  isExpanded={true}
                />
              </div>

              {expandedSidebar && (
                <aside className="w-full lg:w-[330px] xl:w-[360px] bg-[#FAF9F6] border-t lg:border-t-0 lg:border-l border-[#E6E4DD] p-4 flex flex-col gap-4 overflow-y-auto shrink-0">
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#E6E4DD]">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-[#C85A32]" />
                      <span className="text-xs font-heading font-semibold uppercase tracking-wider text-[#1A1917]">
                        Contextual Controls
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsExpanded(false)}
                      className="p-1 rounded text-[#75736E] hover:text-[#1A1917] hover:bg-white cursor-pointer"
                      aria-label="Close full-screen mode"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {expandedSidebar}
                </aside>
              )}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <div
        className={`bg-white border border-[#E6E4DD] rounded-lg p-2.5 sm:p-3 flex flex-col shadow-xs select-none min-h-0 ${className}`}
      >
        {/* Plot Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-[#E6E4DD] mb-2 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0">
              <h4 className="text-[11.5px] font-heading font-semibold tracking-wider uppercase text-[#1A1917] truncate">
                {title}
              </h4>
              {statusBadge && (
                <span className="hidden sm:inline-block text-[9.5px] font-mono px-1.5 py-0.5 rounded bg-[#FAF9F6] border border-[#E6E4DD] text-[#75736E] font-medium shrink-0">
                  {statusBadge}
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-[10.5px] font-body text-[#75736E] truncate mt-0.5">{subtitle}</p>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {headerActions}
            {renderLegend()}
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[#E6E4DD] bg-[#FAF9F6] hover:bg-[#FBF4F0] hover:border-[#C85A32]/40 text-[10.5px] font-mono font-semibold text-[#585651] hover:text-[#C85A32] transition-colors cursor-pointer"
              title="Expand graph to full screen"
              aria-label={`Expand ${title} to full screen`}
            >
              <Maximize2 className="w-3 h-3" />
              <span className="hidden xl:inline">Expand</span>
            </button>
          </div>
        </div>

        {/* Optional Result Strip */}
        {resultCard && <div className="mb-2 shrink-0">{resultCard}</div>}
        {!resultCard && cornerStat && (
          <div className="mb-2 shrink-0 flex items-center justify-between bg-[#FAF9F6] border border-[#E6E4DD] rounded px-2.5 py-1 text-[11px] font-mono">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C85A32]" />
              <span className="font-bold text-[#C85A32]">{cornerStat.label}</span>
              {cornerStat.subtext && (
                <span className="text-[#75736E] text-[10px]">({cornerStat.subtext})</span>
              )}
            </div>
            <span className="font-bold text-[#1A1917]">{cornerStat.value}</span>
          </div>
        )}

        {/* Responsive SVG Viewport */}
        <PlotSvgViewport
          title={title}
          xLabel={xLabel}
          yLabel={yLabel}
          domain={domain}
          range={range}
          isDiscrete={isDiscrete}
          series={series}
          markers={markers}
          showZeroAxes={showZeroAxes}
          emptyStateText={emptyStateText}
          fallbackHeight={height}
          isExpanded={false}
        />
      </div>

      {fullScreenOverlay}
    </>
  );
};
