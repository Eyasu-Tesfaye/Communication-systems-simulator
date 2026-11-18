import React, { useId } from 'react';

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
  title: string;       // e.g. "R_xx(0)" or "R_xy(τ_sel)"
  value: string;       // e.g. "4.7600 V²s"
  subtext?: string;    // e.g. "Zero-lag Energy" or "Lag τ = +1.00s"
  color?: string;      // default terracotta "#C85A32"
  accentBg?: string;   // default "#FBF4F0"
  placement?: 'top' | 'bottom' | 'auto';
}

export interface PlotCornerStat {
  label: string;       // e.g. "R_xx(0)" or "r_xx[0]"
  value: string;       // e.g. "4.7600 V²s"
  subtext?: string;    // e.g. "Total Energy" or "Average Power"
  color?: string;      // default terracotta "#C85A32"
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
}

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
  annotations = [],
  cornerStat,
  resultCard,
  height = 220,
  showZeroAxes = true,
  emptyStateText = 'Awaiting engine evaluation',
  statusBadge,
  className = '',
}) => {
  const clipId = useId();

  // SVG coordinates configuration
  const width = 600;
  const padding = { top: 24, right: 28, bottom: 44, left: 58 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  const [xMin, xMax] = domain;
  const [yMin, yMax] = range;

  // Coordinate mapping functions with zero-division safeguard
  const xSpan = Math.max(1e-6, xMax - xMin);
  const ySpan = Math.max(1e-6, yMax - yMin);

  const mapX = (x: number) => {
    return padding.left + ((x - xMin) / xSpan) * plotWidth;
  };

  const mapY = (y: number) => {
    return padding.top + ((yMax - y) / ySpan) * plotHeight;
  };

  // Generate tick values
  const xTicksCount = 6;
  const xTicks = Array.from({ length: xTicksCount + 1 }, (_, i) => {
    const val = xMin + (i * xSpan) / xTicksCount;
    return Number(val.toFixed(2));
  });

  const yTicksCount = 4;
  const yTicks = Array.from({ length: yTicksCount + 1 }, (_, i) => {
    const val = yMin + (i * ySpan) / yTicksCount;
    return Number(val.toFixed(2));
  });

  // Zero axes positions
  const zeroX = mapX(0);
  const zeroY = mapY(0);
  const hasZeroX = zeroX >= padding.left && zeroX <= width - padding.right;
  const hasZeroY = zeroY >= padding.top && zeroY <= height - padding.bottom;

  const hasData = series.some((s) => s.points && s.points.length > 0);

  return (
    <div
      className={`bg-white border border-[#E6E4DD] rounded-lg p-3 sm:p-4 flex flex-col shadow-xs select-none ${className}`}
    >
      {/* Plot Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#E6E4DD] mb-2.5">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-heading font-semibold tracking-wider uppercase text-[#1A1917]">
              {title}
            </h4>
            {statusBadge && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FAF9F6] border border-[#E6E4DD] text-[#75736E] font-medium">
                {statusBadge}
              </span>
            )}
          </div>
          {subtitle && <p className="text-[11.5px] font-body text-[#75736E] mt-0.5">{subtitle}</p>}
        </div>

        {/* Legend */}
        {series.length > 0 && (
          <div className="flex items-center gap-2.5 bg-[#FAF9F6] px-2.5 py-1 rounded border border-[#E6E4DD]">
            {series.map((s) => (
              <div key={s.id} className="flex items-center gap-1.5 text-[11px] font-mono">
                {s.dash ? (
                  <span
                    className="w-3.5 h-0 border-t-2 border-dashed inline-block"
                    style={{ borderColor: s.color || '#C85A32' }}
                  />
                ) : s.markerStyle === 'ring' ? (
                  <span
                    className="w-2.5 h-2.5 rounded-full border-2 inline-block"
                    style={{ borderColor: s.color || '#C85A32' }}
                  />
                ) : (
                  <span
                    className="w-3 h-1.5 rounded-xs inline-block"
                    style={{ backgroundColor: s.color || '#C85A32' }}
                  />
                )}
                <span className="text-[#3E3D39] font-medium">{s.name}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* External Result Card (positioned cleanly outside the plotting area) */}
      {resultCard && (
        <div className="mb-2.5">
          {resultCard}
        </div>
      )}
      {!resultCard && cornerStat && (
        <div className="mb-2.5 flex items-center justify-between bg-[#FAF9F6] border border-[#E6E4DD] rounded px-3 py-1.5 text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#C85A32]" />
            <span className="font-bold text-[#C85A32]">{cornerStat.label}</span>
            {cornerStat.subtext && <span className="text-[#75736E] text-[11px]">({cornerStat.subtext})</span>}
          </div>
          <span className="font-bold text-[#1A1917] text-xs sm:text-sm">{cornerStat.value}</span>
        </div>
      )}

      {/* SVG Canvas Area */}
      <div className="relative w-full overflow-hidden bg-[#FAF9F6] rounded border border-[#E6E4DD]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto block"
          style={{ maxHeight: `${height + 30}px` }}
        >
          <defs>
            <clipPath id={clipId}>
              <rect
                x={padding.left}
                y={padding.top}
                width={plotWidth}
                height={plotHeight}
              />
            </clipPath>
          </defs>

          {/* Subtle Grid Background */}
          <g className="grid-lines" stroke="#EAE8E1" strokeWidth="1">
            {/* Vertical grid lines */}
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
            {/* Horizontal grid lines */}
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
                  strokeWidth="1.25"
                />
              )}
              {hasZeroX && (
                <line
                  x1={zeroX}
                  y1={padding.top}
                  x2={zeroX}
                  y2={height - padding.bottom}
                  stroke="#8A8882"
                  strokeWidth="1.25"
                />
              )}
            </g>
          )}

          {/* Bounding Box Border */}
          <rect
            x={padding.left}
            y={padding.top}
            width={plotWidth}
            height={plotHeight}
            fill="none"
            stroke="#D1CFCE"
            strokeWidth="1"
          />

          {/* Markers (Vertical Reference Lines & Curve Point Markers) */}
          {markers.map((m, idx) => {
            if (m.x !== undefined) {
              const mx = mapX(m.x);
              if (mx >= padding.left && mx <= width - padding.right) {
                const my = m.y !== undefined ? mapY(m.y) : undefined;
                return (
                  <g key={`marker-x-${idx}`}>
                    <line
                      x1={mx}
                      y1={padding.top}
                      x2={mx}
                      y2={height - padding.bottom}
                      stroke={m.color || '#C85A32'}
                      strokeWidth="1.5"
                      strokeDasharray={m.style === 'solid' ? 'none' : '3 3'}
                    />
                    {/* Minimal curve point marker if y is provided */}
                    {my !== undefined && my >= padding.top && my <= height - padding.bottom && (
                      <g>
                        <circle cx={mx} cy={my} r="5" fill={m.color || '#C85A32'} fillOpacity="0.25" />
                        <circle cx={mx} cy={my} r="3" fill={m.color || '#C85A32'} />
                      </g>
                    )}
                  </g>
                );
              }
            }
            return null;
          })}

          {/* Render Series Data with clipPath (Layered order: solid lines first, dashed lines on top) */}
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
                              r="3.75"
                              fill="none"
                              stroke={stroke}
                              strokeWidth="1.75"
                            />
                          ) : (
                            <circle
                              cx={cx}
                              cy={cy}
                              r="2.5"
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

              // Continuous line path
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
                    strokeWidth={s.strokeWidth || (s.dash ? 2.5 : 2)}
                    strokeDasharray={s.dash || 'none'}
                    strokeOpacity={opacity}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              );
            })}
          </g>

          {/* Empty / Foundation State Watermark when no calculations are rendered */}
          {!hasData && (
            <g className="empty-indicator">
              <rect
                x={padding.left + plotWidth / 2 - 110}
                y={padding.top + plotHeight / 2 - 16}
                width="220"
                height="32"
                rx="4"
                fill="#FFFFFF"
                fillOpacity="0.9"
                stroke="#E6E4DD"
                strokeWidth="1"
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

          {/* Axis Labels & Ticks */}
          <g className="axis-labels font-mono text-[10px] fill-[#585651]">
            {/* X-axis ticks */}
            {xTicks.map((val, i) => {
              const xPos = mapX(val);
              return (
                <text
                  key={`xt-${i}`}
                  x={xPos}
                  y={height - padding.bottom + 15}
                  textAnchor="middle"
                >
                  {val}
                </text>
              );
            })}
            {/* X-axis title */}
            <text
              x={padding.left + plotWidth / 2}
              y={height - 7}
              textAnchor="middle"
              className="text-[11px] font-mono font-semibold fill-[#1A1917]"
            >
              {xLabel}
            </text>

            {/* Y-axis ticks */}
            {yTicks.map((val, i) => {
              const yPos = mapY(val);
              return (
                <text
                  key={`yt-${i}`}
                  x={padding.left - 7}
                  y={yPos + 3.5}
                  textAnchor="end"
                >
                  {val}
                </text>
              );
            })}
            {/* Y-axis title */}
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
      </div>
    </div>
  );
};
