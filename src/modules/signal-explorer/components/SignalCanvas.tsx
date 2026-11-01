import React, { useRef, useState, useMemo, useCallback } from 'react';
import { Download, ZoomIn, ZoomOut, RotateCcw, Eye, EyeOff } from 'lucide-react';
import { DomainType, SignalSample } from '../types';

export interface CanvasTrace {
  id: string;
  label: string;
  key: keyof SignalSample;
  color: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  opacity?: number;
  isGhost?: boolean;
}

export interface SignalCanvasProps {
  title: string;
  domain: DomainType;
  samples: SignalSample[];
  traces: CanvasTrace[];
  timeRange: number;
  yMax?: number;
  subtitle?: string;
  height?: number;
  showZeroBaseline?: boolean;
  onZoomChange?: (newRange: number) => void;
}

export const SignalCanvas: React.FC<SignalCanvasProps> = ({
  title,
  domain,
  samples,
  traces,
  timeRange,
  yMax: customYMax,
  subtitle,
  height = 360,
  showZeroBaseline = true,
  onZoomChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredSample, setHoveredSample] = useState<SignalSample | null>(null);
  const [mousePos, setMousePos] = useState<{ px: number; py: number } | null>(null);
  const [hiddenTraceIds, setHiddenTraceIds] = useState<Set<string>>(new Set());

  const width = 800;
  const pad = { top: 32, right: 36, bottom: 44, left: 54 };
  const plotWidth = width - pad.left - pad.right;
  const plotHeight = height - pad.top - pad.bottom;

  const { minY, maxY, yTicks } = useMemo(() => {
    let maxVal = customYMax ?? 1;
    let minVal = customYMax ? -customYMax : -1;

    samples.forEach((s) => {
      traces.forEach((tr) => {
        const val = s[tr.key] as number | undefined;
        if (typeof val === 'number' && !isNaN(val)) {
          if (val > maxVal) maxVal = val;
          if (val < minVal) minVal = val;
        }
      });
    });

    const bound = Math.max(Math.abs(maxVal), Math.abs(minVal), 1.2) * 1.15;
    const finalMax = Number(bound.toFixed(2));
    const finalMin = -finalMax;

    const step = finalMax / 2;
    const ticks = [-finalMax, -step, 0, step, finalMax];

    return { minY: finalMin, maxY: finalMax, yTicks: ticks };
  }, [samples, traces, customYMax]);

  const xToPx = useCallback(
    (x: number) => pad.left + ((x - (-timeRange)) / (2 * timeRange)) * plotWidth,
    [pad.left, timeRange, plotWidth]
  );

  const yToPx = useCallback(
    (y: number) => pad.top + ((maxY - y) / (maxY - minY)) * plotHeight,
    [pad.top, maxY, minY, plotHeight]
  );

  const xTicks = useMemo(() => {
    const ticks: number[] = [];
    const step = domain === 'discrete' ? Math.max(1, Math.round(timeRange / 5)) : Number((timeRange / 5).toFixed(1));
    for (let x = -timeRange; x <= timeRange + 0.001; x += step) {
      ticks.push(Number(x.toFixed(2)));
    }
    return ticks;
  }, [timeRange, domain]);

  const tracePaths = useMemo(() => {
    if (domain !== 'continuous') return [];

    return traces
      .filter((tr) => !hiddenTraceIds.has(tr.id))
      .map((tr) => {
        let d = '';
        samples.forEach((s, i) => {
          const val = s[tr.key] as number | undefined;
          if (typeof val === 'number' && !isNaN(val)) {
            const px = xToPx(s.x);
            const py = yToPx(val);
            d += i === 0 ? `M ${px.toFixed(2)} ${py.toFixed(2)}` : ` L ${px.toFixed(2)} ${py.toFixed(2)}`;
          }
        });

        let areaD = '';
        if (tr.id === 'main' && samples.length > 0) {
          const yZeroPx = yToPx(0);
          areaD = `${d} L ${xToPx(samples[samples.length - 1].x)} ${yZeroPx} L ${xToPx(samples[0].x)} ${yZeroPx} Z`;
        }

        return { ...tr, d, areaD };
      });
  }, [domain, traces, hiddenTraceIds, samples, xToPx, yToPx]);

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseSvgX = ((e.clientX - rect.left) / rect.width) * width;
    const mouseSvgY = ((e.clientY - rect.top) / rect.height) * height;

    if (
      mouseSvgX >= pad.left &&
      mouseSvgX <= width - pad.right &&
      mouseSvgY >= pad.top &&
      mouseSvgY <= height - pad.bottom
    ) {
      const dataX = -timeRange + ((mouseSvgX - pad.left) / plotWidth) * (2 * timeRange);
      let closest = samples[0];
      let minDiff = Infinity;

      for (const s of samples) {
        const diff = Math.abs(s.x - dataX);
        if (diff < minDiff) {
          minDiff = diff;
          closest = s;
        }
      }

      setHoveredSample(closest);
      setMousePos({ px: xToPx(closest.x), py: mouseSvgY });
    } else {
      setHoveredSample(null);
      setMousePos(null);
    }
  };

  const handleMouseLeave = () => {
    setHoveredSample(null);
    setMousePos(null);
  };

  const toggleTrace = (id: string) => {
    setHiddenTraceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < traces.length - 1) {
        next.add(id);
      }
      return next;
    });
  };

  const exportCSV = () => {
    const activeTraces = traces.filter((tr) => !hiddenTraceIds.has(tr.id));
    const header = [domain === 'continuous' ? 't' : 'n', ...activeTraces.map((t) => t.label)].join(',');
    const rows = samples.map((s) => {
      const cols = [s.x];
      activeTraces.forEach((t) => {
        cols.push(s[t.key] as number);
      });
      return cols.join(',');
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + [header, ...rows].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportSVG = () => {
    const svgEl = containerRef.current?.querySelector('svg');
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_plot.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const zeroYPx = yToPx(0);

  return (
    <div
      ref={containerRef}
      className="relative bg-white rounded-xl border border-neutral-200/90 shadow-xs overflow-hidden flex flex-col"
    >
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-100 bg-neutral-50/50">
        <div className="flex items-baseline gap-2.5">
          <h3 className="text-sm font-semibold text-neutral-900 tracking-tight">{title}</h3>
          {subtitle && <span className="text-xs text-neutral-500 font-normal">{subtitle}</span>}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 mr-2">
            {traces.map((tr) => {
              const isHidden = hiddenTraceIds.has(tr.id);
              return (
                <button
                  key={tr.id}
                  onClick={() => toggleTrace(tr.id)}
                  title={`Toggle ${tr.label}`}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md transition-all cursor-pointer whitespace-nowrap ${
                    isHidden
                      ? 'bg-neutral-100 text-neutral-400 opacity-60'
                      : 'bg-white text-neutral-700 shadow-2xs border border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <span
                    className="w-2.5 h-0.5 rounded-full"
                    style={{ backgroundColor: tr.color, opacity: isHidden ? 0.4 : 1 }}
                  />
                  <span>{tr.label}</span>
                  {isHidden ? <EyeOff className="w-3 h-3 text-neutral-400" /> : <Eye className="w-3 h-3 text-neutral-400" />}
                </button>
              );
            })}
          </div>

          {onZoomChange && (
            <div className="flex items-center gap-0.5 bg-neutral-100 rounded-lg p-0.5 border border-neutral-200/70">
              <button
                onClick={() => onZoomChange(Math.max(2, timeRange - 2))}
                title="Zoom in"
                className="p-1 rounded-md text-neutral-600 hover:text-neutral-900 hover:bg-white transition-colors cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onZoomChange(Math.min(20, timeRange + 2))}
                title="Zoom out"
                className="p-1 rounded-md text-neutral-600 hover:text-neutral-900 hover:bg-white transition-colors cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onZoomChange(domain === 'discrete' ? 8 : 6)}
                title="Reset zoom"
                className="p-1 rounded-md text-neutral-600 hover:text-neutral-900 hover:bg-white transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button
            onClick={exportSVG}
            title="Export Vector SVG"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 rounded-lg shadow-2xs hover:bg-neutral-50 transition-colors cursor-pointer"
          >
            <Download className="w-3 h-3" />
            <span>SVG</span>
          </button>
          <button
            onClick={exportCSV}
            title="Export CSV Numerical Samples"
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-neutral-600 hover:text-neutral-900 bg-white border border-neutral-200 rounded-lg shadow-2xs hover:bg-neutral-50 transition-colors cursor-pointer"
          >
            <span>CSV</span>
          </button>
        </div>
      </div>

      <div className="relative w-full overflow-hidden select-none" style={{ height }}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full block"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#C05621" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#C05621" stopOpacity="0.01" />
            </linearGradient>
            <clipPath id="plotClip">
              <rect x={pad.left} y={pad.top} width={plotWidth} height={plotHeight} />
            </clipPath>
          </defs>

          <rect x={pad.left} y={pad.top} width={plotWidth} height={plotHeight} fill="#FFFFFF" />

          {yTicks.map((tickVal, i) => {
            const py = yToPx(tickVal);
            return (
              <g key={`y-grid-${i}`}>
                <line
                  x1={pad.left}
                  y1={py}
                  x2={width - pad.right}
                  y2={py}
                  stroke={tickVal === 0 ? '#94A3B8' : '#F1F5F9'}
                  strokeWidth={tickVal === 0 ? 1.5 : 1}
                  strokeDasharray={tickVal === 0 ? undefined : '3 3'}
                />
                <text x={pad.left - 8} y={py + 3.5} textAnchor="end" className="text-[10px] font-mono tabular-nums fill-neutral-400">
                  {tickVal.toFixed(1)}
                </text>
              </g>
            );
          })}

          {xTicks.map((tickVal, i) => {
            const px = xToPx(tickVal);
            if (px < pad.left - 2 || px > width - pad.right + 2) return null;
            return (
              <g key={`x-grid-${i}`}>
                <line
                  x1={px}
                  y1={pad.top}
                  x2={px}
                  y2={height - pad.bottom}
                  stroke={tickVal === 0 ? '#94A3B8' : '#F1F5F9'}
                  strokeWidth={tickVal === 0 ? 1.5 : 1}
                  strokeDasharray={tickVal === 0 ? undefined : '3 3'}
                />
                <line x1={px} y1={height - pad.bottom} x2={px} y2={height - pad.bottom + 4} stroke="#94A3B8" strokeWidth={1} />
                <text x={px} y={height - pad.bottom + 16} textAnchor="middle" className="text-[10px] font-mono tabular-nums fill-neutral-500">
                  {domain === 'discrete' ? tickVal : tickVal.toFixed(1)}
                </text>
              </g>
            );
          })}

          <text x={width - pad.right + 12} y={zeroYPx + 4} textAnchor="start" className="text-[11px] font-mono font-semibold fill-neutral-700 italic">
            {domain === 'continuous' ? 't' : 'n'}
          </text>
          <text x={pad.left} y={pad.top - 12} textAnchor="start" className="text-[11px] font-mono font-semibold fill-neutral-700 italic">
            {domain === 'continuous' ? 'x(t)' : 'x[n]'}
          </text>

          <g clipPath="url(#plotClip)">
            {domain === 'continuous' && (
              <>
                {tracePaths.map((tr) => (tr.areaD ? <path key={`area-${tr.id}`} d={tr.areaD} fill="url(#areaGradient)" /> : null))}
                {tracePaths.map((tr) => (
                  <path
                    key={`line-${tr.id}`}
                    d={tr.d}
                    fill="none"
                    stroke={tr.color}
                    strokeWidth={tr.strokeWidth || 2}
                    strokeDasharray={tr.strokeDasharray}
                    opacity={tr.opacity ?? 1}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
              </>
            )}

            {domain === 'discrete' && (
              <g>
                {traces
                  .filter((tr) => !hiddenTraceIds.has(tr.id))
                  .map((tr) => (
                    <g key={`stem-group-${tr.id}`} opacity={tr.opacity ?? 1}>
                      {samples.map((s, idx) => {
                        const val = s[tr.key] as number | undefined;
                        if (typeof val !== 'number' || isNaN(val)) return null;
                        const px = xToPx(s.x);
                        const py = yToPx(val);
                        const isHovered = hoveredSample?.x === s.x;

                        return (
                          <g key={`stem-${tr.id}-${idx}`}>
                            <line
                              x1={px}
                              y1={zeroYPx}
                              x2={px}
                              y2={py}
                              stroke={tr.color}
                              strokeWidth={isHovered ? 2.5 : 1.75}
                              strokeDasharray={tr.strokeDasharray}
                              strokeLinecap="round"
                            />
                            <circle
                              cx={px}
                              cy={py}
                              r={isHovered ? 4.5 : 3}
                              fill={tr.color}
                              stroke="#FFFFFF"
                              strokeWidth={1.5}
                            />
                          </g>
                        );
                      })}
                    </g>
                  ))}
              </g>
            )}

            {hoveredSample && mousePos && (
              <g className="pointer-events-none">
                <line
                  x1={mousePos.px}
                  y1={pad.top}
                  x2={mousePos.px}
                  y2={height - pad.bottom}
                  stroke="#78716C"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                />
                {traces
                  .filter((tr) => !hiddenTraceIds.has(tr.id))
                  .map((tr) => {
                    const val = hoveredSample[tr.key] as number | undefined;
                    if (typeof val !== 'number' || isNaN(val)) return null;
                    const py = yToPx(val);
                    return <circle key={`hover-point-${tr.id}`} cx={mousePos.px} cy={py} r={4.5} fill={tr.color} stroke="#FFFFFF" strokeWidth={2} />;
                  })}
              </g>
            )}
          </g>

          <rect x={pad.left} y={pad.top} width={plotWidth} height={plotHeight} fill="none" stroke="#CBD5E1" strokeWidth={1} />
        </svg>

        {hoveredSample && mousePos && (
          <div className="absolute top-3 right-4 z-20 pointer-events-none bg-neutral-900/90 text-white backdrop-blur-xs rounded-lg px-3 py-2 text-xs font-mono shadow-md border border-neutral-700/80 flex flex-col gap-1 tabular-nums">
            <div className="flex items-center justify-between gap-4 border-b border-neutral-700 pb-1 text-[11px] text-neutral-300">
              <span className="font-sans font-medium text-neutral-400">Index</span>
              <span className="font-bold text-amber-300">
                {domain === 'continuous' ? `t = ${hoveredSample.x.toFixed(3)} s` : `n = ${hoveredSample.x}`}
              </span>
            </div>
            {traces
              .filter((tr) => !hiddenTraceIds.has(tr.id))
              .map((tr) => {
                const val = hoveredSample[tr.key] as number | undefined;
                if (typeof val !== 'number' || isNaN(val)) return null;
                return (
                  <div key={`tooltip-${tr.id}`} className="flex items-center justify-between gap-4">
                    <span className="flex items-center gap-1.5 font-sans text-neutral-300">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tr.color }} />
                      {tr.label}:
                    </span>
                    <span className="font-semibold text-white">{val.toFixed(4)}</span>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      <div className="px-5 py-2 border-t border-neutral-100 bg-neutral-50/30 flex items-center justify-between text-xs text-neutral-500">
        <div className="flex items-center gap-3">
          <span>Domain: <strong className="font-semibold text-neutral-700">{domain === 'continuous' ? 'Continuous-Time x(t)' : 'Discrete-Time x[n]'}</strong></span>
          <span>·</span>
          <span>Window: <strong className="font-mono text-neutral-700">[-{timeRange}, +{timeRange}]</strong></span>
          <span>·</span>
          <span>Samples: <strong className="font-mono text-neutral-700">{samples.length}</strong></span>
        </div>
        <div className="text-[11px] text-neutral-400">Hover cursor over canvas to inspect exact coordinates</div>
      </div>
    </div>
  );
};
