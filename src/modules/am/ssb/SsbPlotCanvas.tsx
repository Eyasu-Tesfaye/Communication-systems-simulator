/**
 * Reusable High-Precision Time-Domain & Frequency-Domain SVG Plots
 * Matches the Signal Lab warm editorial palette & typography.
 */

import React, { useRef, useMemo, useCallback } from 'react';
import { SpectrumPoint, SSB_DURATION, sampleAtTime } from './ssbMathEngine';

interface SsbTimePlotProps {
  title: string;
  subtitle?: string;
  timeSteps: number[];
  values: number[];
  primaryLabel: string;
  primaryColor?: string;
  secondaryValues?: number[];
  secondaryLabel?: string;
  secondaryColor?: string;
  simTime: number;
  onSeekTime: (t: number) => void;
  tWindow?: number; // Display window in seconds (e.g. 0.5s zoomed or 2.0s full)
  isGridVisible: boolean;
  heightClass?: string;
  yUnit?: string;
  badgeText?: string;
  badgeVariant?: 'accent' | 'emerald' | 'neutral';
}

export const SsbTimePlot: React.FC<SsbTimePlotProps> = ({
  title,
  subtitle,
  timeSteps,
  values,
  primaryLabel,
  primaryColor = '#C85A32',
  secondaryValues,
  secondaryLabel,
  secondaryColor = '#2E6F7E',
  simTime,
  onSeekTime,
  tWindow = SSB_DURATION,
  isGridVisible,
  heightClass = 'h-[195px]',
  yUnit = 'V',
  badgeText,
  badgeVariant = 'neutral',
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const draggingRef = useRef(false);

  const SVG_W = 760;
  const SVG_H = 210;
  const PAD_L = 56;
  const PAD_R = 20;
  const PAD_T = 36;
  const PAD_B = 34;
  const plotW = SVG_W - PAD_L - PAD_R;
  const plotH = SVG_H - PAD_T - PAD_B;
  const centerY = PAD_T + plotH / 2;

  const displayTMax = Math.max(0.25, Math.min(SSB_DURATION, tWindow));

  // Symmetric Y-axis scaling
  const yMax = useMemo(() => {
    let maxAbs = 1.0;
    for (let i = 0; i < values.length; i++) {
      const a = Math.abs(values[i]);
      if (a > maxAbs) maxAbs = a;
    }
    if (secondaryValues) {
      for (let i = 0; i < secondaryValues.length; i++) {
        const a = Math.abs(secondaryValues[i]);
        if (a > maxAbs) maxAbs = a;
      }
    }
    const padded = maxAbs * 1.18;
    if (padded <= 1.5) return 1.5;
    if (padded <= 2.0) return 2.0;
    if (padded <= 2.5) return 2.5;
    if (padded <= 3.0) return 3.0;
    if (padded <= 4.0) return 4.0;
    return Math.ceil(padded);
  }, [values, secondaryValues]);

  const mapX = useCallback(
    (t: number) => PAD_L + (Math.max(0, Math.min(displayTMax, t)) / displayTMax) * plotW,
    [displayTMax, plotW]
  );

  const mapY = useCallback(
    (v: number) => {
      const clamped = Math.max(-yMax, Math.min(yMax, v));
      return centerY - (clamped / yMax) * (plotH / 2);
    },
    [yMax, centerY, plotH]
  );

  const buildPath = useCallback(
    (series: number[]) => {
      let d = '';
      let started = false;
      for (let k = 0; k < timeSteps.length; k++) {
        const t = timeSteps[k];
        if (t > displayTMax + 1e-6) break;
        const x = mapX(t).toFixed(1);
        const y = mapY(series[k]).toFixed(1);
        d += started ? ` L ${x} ${y}` : `M ${x} ${y}`;
        started = true;
      }
      return d;
    },
    [timeSteps, displayTMax, mapX, mapY]
  );

  const primaryPath = useMemo(() => buildPath(values), [buildPath, values]);
  const secondaryPath = useMemo(
    () => (secondaryValues ? buildPath(secondaryValues) : ''),
    [buildPath, secondaryValues]
  );

  const cursorTime = Math.min(displayTMax, simTime % (displayTMax + 1e-9));
  const cursorX = mapX(cursorTime);
  const currentPrimaryVal = sampleAtTime(values, cursorTime);
  const currentSecondaryVal = secondaryValues ? sampleAtTime(secondaryValues, cursorTime) : null;

  const scrubAtClientX = useCallback(
    (clientX: number) => {
      if (!svgRef.current) return;
      const rect = svgRef.current.getBoundingClientRect();
      const svgX = ((clientX - rect.left) / rect.width) * SVG_W;
      const clamped = Math.max(PAD_L, Math.min(SVG_W - PAD_R, svgX));
      const newT = ((clamped - PAD_L) / plotW) * displayTMax;
      onSeekTime(parseFloat(newT.toFixed(3)));
    },
    [displayTMax, onSeekTime, plotW]
  );

  const ticks = useMemo(() => {
    const res: number[] = [];
    for (let i = 0; i <= 4; i++) {
      res.push(parseFloat(((displayTMax * i) / 4).toFixed(2)));
    }
    return res;
  }, [displayTMax]);

  const badgeStyle =
    badgeVariant === 'accent'
      ? 'bg-[#FBF4F0] text-[#C85A32] border-[#C85A32]/25'
      : badgeVariant === 'emerald'
      ? 'bg-[#10B981]/10 text-[#059669] border-[#10B981]/30'
      : 'bg-[#FAF9F6] text-[#585651] border-[#E6E4DD]';

  // Clamp top readout pill inside plot bounds
  const PILL_W = secondaryValues ? 250 : 178;
  const pillX = Math.max(PAD_L + PILL_W / 2, Math.min(SVG_W - PAD_R - PILL_W / 2, cursorX));

  return (
    <div className="bg-white rounded-lg border border-[#E6E4DD] p-3.5 shadow-2xs space-y-2.5">
      {/* Header Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E6E4DD]">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xs font-mono font-bold text-[#1A1917]">{title}</h3>
          {badgeText && (
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${badgeStyle}`}>
              {badgeText}
            </span>
          )}
          {subtitle && (
            <span className="text-[11px] font-mono text-[#75736E] hidden sm:inline">{subtitle}</span>
          )}
        </div>

        {/* Live Legend & Readout */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono tabular-nums">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: primaryColor }} />
            <span className="text-[#585651]">{primaryLabel}:</span>
            <strong className="text-[#1A1917]">
              {currentPrimaryVal >= 0 ? '+' : ''}
              {currentPrimaryVal.toFixed(2)} {yUnit}
            </strong>
          </span>

          {secondaryValues && secondaryLabel && currentSecondaryVal !== null && (
            <span className="flex items-center gap-1.5">
              <span
                className="w-3 h-0.5 border-b-2 border-dashed"
                style={{ borderColor: secondaryColor }}
              />
              <span className="text-[#585651]">{secondaryLabel}:</span>
              <strong className="text-[#1A1917]">
                {currentSecondaryVal >= 0 ? '+' : ''}
                {currentSecondaryVal.toFixed(2)} {yUnit}
              </strong>
            </span>
          )}
        </div>
      </div>

      {/* SVG Plot */}
      <div className={`relative w-full ${heightClass} bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden`}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          preserveAspectRatio="xMidYMid meet"
          className="w-full h-full select-none cursor-crosshair"
          onMouseDown={(e) => {
            draggingRef.current = true;
            scrubAtClientX(e.clientX);
          }}
          onMouseMove={(e) => {
            if (draggingRef.current) scrubAtClientX(e.clientX);
          }}
          onMouseUp={() => {
            draggingRef.current = false;
          }}
          onMouseLeave={() => {
            draggingRef.current = false;
          }}
          role="img"
          aria-label={title}
        >
          {/* Grid */}
          {isGridVisible &&
            [-yMax, -yMax / 2, 0, yMax / 2, yMax].map((v, i) => (
              <line
                key={`hg-${i}`}
                x1={PAD_L}
                y1={mapY(v)}
                x2={SVG_W - PAD_R}
                y2={mapY(v)}
                stroke={Math.abs(v) < 1e-6 ? '#8A8882' : '#E6E4DD'}
                strokeWidth={Math.abs(v) < 1e-6 ? '1.3' : '0.9'}
                strokeDasharray={Math.abs(v) < 1e-6 ? undefined : '3 3'}
              />
            ))}

          {isGridVisible &&
            ticks.map((t) => (
              <line
                key={`vg-${t}`}
                x1={mapX(t)}
                y1={PAD_T}
                x2={mapX(t)}
                y2={SVG_H - PAD_B}
                stroke="#E6E4DD"
                strokeWidth="0.9"
              />
            ))}

          {/* Plot Border */}
          <rect
            x={PAD_L}
            y={PAD_T}
            width={plotW}
            height={plotH}
            fill="none"
            stroke="#DCD8CE"
            strokeWidth="1.2"
          />

          {/* Primary Waveform */}
          <path
            d={primaryPath}
            fill="none"
            stroke={primaryColor}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Optional Secondary Waveform (Dashed) */}
          {secondaryValues && (
            <path
              d={secondaryPath}
              fill="none"
              stroke={secondaryColor}
              strokeWidth="2"
              strokeDasharray="5 3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Synchronized Vertical Time Cursor */}
          <line
            x1={cursorX}
            y1={PAD_T - 4}
            x2={cursorX}
            y2={SVG_H - PAD_B}
            stroke="#C85A32"
            strokeWidth="1.7"
          />
          <circle
            cx={cursorX}
            cy={mapY(currentPrimaryVal)}
            r="4.2"
            fill={primaryColor}
            stroke="#FFFFFF"
            strokeWidth="1.6"
          />
          {secondaryValues && currentSecondaryVal !== null && (
            <circle
              cx={cursorX}
              cy={mapY(currentSecondaryVal)}
              r="4.2"
              fill={secondaryColor}
              stroke="#FFFFFF"
              strokeWidth="1.6"
            />
          )}

          {/* Non-Overlapping Top Cursor Pill */}
          <g>
            <rect
              x={pillX - PILL_W / 2}
              y={7}
              width={PILL_W}
              height={20}
              rx="4"
              fill="#1A1917"
            />
            <text
              x={pillX}
              y={20.5}
              textAnchor="middle"
              className="text-[9.5px] font-mono font-bold fill-white"
            >
              {secondaryValues && currentSecondaryVal !== null
                ? `t=${cursorTime.toFixed(2)}s · Orig=${currentPrimaryVal.toFixed(2)}V · Rec=${currentSecondaryVal.toFixed(2)}V`
                : `t=${cursorTime.toFixed(2)}s · ${currentPrimaryVal >= 0 ? '+' : ''}${currentPrimaryVal.toFixed(2)} ${yUnit}`}
            </text>
          </g>

          {/* Y Ticks */}
          {[-yMax, 0, yMax].map((v) => (
            <text
              key={`yt-${v}`}
              x={PAD_L - 7}
              y={mapY(v) + 3.5}
              textAnchor="end"
              className="text-[9.5px] font-mono fill-[#75736E]"
            >
              {v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1)}
            </text>
          ))}

          {/* X Ticks */}
          {ticks.map((t) => (
            <text
              key={`xt-${t}`}
              x={mapX(t)}
              y={SVG_H - PAD_B + 15}
              textAnchor="middle"
              className="text-[9.5px] font-mono fill-[#75736E]"
            >
              {t.toFixed(2)}s
            </text>
          ))}

          {/* Axis Labels */}
          <text
            x={14}
            y={centerY}
            textAnchor="middle"
            transform={`rotate(-90, 14, ${centerY})`}
            className="text-[10px] font-mono font-bold fill-[#1A1917]"
          >
            Amplitude [{yUnit}]
          </text>
          <text
            x={SVG_W - PAD_R}
            y={SVG_H - 4}
            textAnchor="end"
            className="text-[10px] font-mono font-bold fill-[#1A1917]"
          >
            Time t [s] →
          </text>
        </svg>
      </div>
    </div>
  );
};

export interface SpectralMarker {
  freq: number;
  label: string;
  color: string;
  dashed?: boolean;
}

export interface SpectralBandShade {
  fStart: number;
  fEnd: number;
  label: string;
  color: string;
}

interface SsbSpectrumPlotProps {
  title: string;
  subtitle?: string;
  spectrum: SpectrumPoint[];
  maxFreqHz: number;
  barColor?: string;
  markers?: SpectralMarker[];
  shadedBand?: SpectralBandShade;
  cutoffFreq?: number;
  isGridVisible: boolean;
  heightClass?: string;
  badgeText?: string;
  badgeVariant?: 'accent' | 'emerald' | 'neutral';
}

export const SsbSpectrumPlot: React.FC<SsbSpectrumPlotProps> = ({
  title,
  subtitle,
  spectrum,
  maxFreqHz,
  barColor = '#C85A32',
  markers = [],
  shadedBand,
  cutoffFreq,
  isGridVisible,
  heightClass = 'h-[205px]',
  badgeText,
  badgeVariant = 'neutral',
}) => {
  const SVG_W = 760;
  const SVG_H = 215;
  const PAD_L = 56;
  const PAD_R = 24;
  const PAD_T = 34;
  const PAD_B = 36;
  const plotW = SVG_W - PAD_L - PAD_R;
  const plotH = SVG_H - PAD_T - PAD_B;

  const yMax = useMemo(() => {
    let m = 0.5;
    for (let i = 0; i < spectrum.length; i++) {
      if (spectrum[i].freq <= maxFreqHz && spectrum[i].mag > m) {
        m = spectrum[i].mag;
      }
    }
    return Math.ceil(m * 1.25 * 2) / 2;
  }, [spectrum, maxFreqHz]);

  const mapX = (f: number) => PAD_L + (Math.max(0, Math.min(maxFreqHz, f)) / maxFreqHz) * plotW;
  const mapY = (mag: number) => PAD_T + plotH - (Math.min(yMax, Math.max(0, mag)) / yMax) * plotH;

  const freqTicks = useMemo(() => {
    const step = maxFreqHz <= 40 ? 5 : 10;
    const arr: number[] = [];
    for (let f = 0; f <= maxFreqHz; f += step) arr.push(f);
    return arr;
  }, [maxFreqHz]);

  const badgeStyle =
    badgeVariant === 'accent'
      ? 'bg-[#FBF4F0] text-[#C85A32] border-[#C85A32]/25'
      : badgeVariant === 'emerald'
      ? 'bg-[#10B981]/10 text-[#059669] border-[#10B981]/30'
      : 'bg-[#FAF9F6] text-[#585651] border-[#E6E4DD]';

  // Peak tone readout
  const peakPoint = useMemo(() => {
    let best = { freq: 0, mag: 0 };
    for (const pt of spectrum) {
      if (pt.freq <= maxFreqHz && pt.mag > best.mag) best = pt;
    }
    return best;
  }, [spectrum, maxFreqHz]);

  return (
    <div className="bg-white rounded-lg border border-[#E6E4DD] p-3.5 shadow-2xs space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E6E4DD]">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xs font-mono font-bold text-[#1A1917]">{title}</h3>
          {badgeText && (
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${badgeStyle}`}>
              {badgeText}
            </span>
          )}
          {subtitle && <span className="text-[11px] font-mono text-[#75736E]">{subtitle}</span>}
        </div>
        <div className="text-[11px] font-mono text-[#585651] tabular-nums">
          Peak: <strong className="text-[#1A1917]">{peakPoint.mag.toFixed(2)} V</strong> @{' '}
          <strong className="text-[#C85A32]">{peakPoint.freq.toFixed(1)} Hz</strong>
        </div>
      </div>

      <div className={`relative w-full ${heightClass} bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden`}>
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="xMidYMid meet" className="w-full h-full select-none" role="img" aria-label={title}>
          {/* Grid */}
          {isGridVisible &&
            [0, yMax * 0.5, yMax].map((v, i) => (
              <line
                key={`shg-${i}`}
                x1={PAD_L}
                y1={mapY(v)}
                x2={SVG_W - PAD_R}
                y2={mapY(v)}
                stroke="#E6E4DD"
                strokeWidth="0.9"
                strokeDasharray="3 3"
              />
            ))}

          {isGridVisible &&
            freqTicks.map((f) => (
              <line
                key={`svg-${f}`}
                x1={mapX(f)}
                y1={PAD_T}
                x2={mapX(f)}
                y2={PAD_T + plotH}
                stroke="#E6E4DD"
                strokeWidth="0.9"
              />
            ))}

          {/* Shaded Bandwidth Zone */}
          {shadedBand && shadedBand.fEnd > shadedBand.fStart && (
            <g>
              <rect
                x={mapX(shadedBand.fStart)}
                y={PAD_T}
                width={Math.max(4, mapX(shadedBand.fEnd) - mapX(shadedBand.fStart))}
                height={plotH}
                fill={shadedBand.color}
                fillOpacity="0.1"
              />
              <text
                x={(mapX(shadedBand.fStart) + mapX(shadedBand.fEnd)) / 2}
                y={PAD_T + 14}
                textAnchor="middle"
                className="text-[9.5px] font-mono font-bold"
                fill={shadedBand.color}
              >
                {shadedBand.label}
              </text>
            </g>
          )}

          {/* Optional LPF Cutoff Marker */}
          {cutoffFreq !== undefined && cutoffFreq <= maxFreqHz && (
            <g>
              <line
                x1={mapX(cutoffFreq)}
                y1={PAD_T}
                x2={mapX(cutoffFreq)}
                y2={PAD_T + plotH}
                stroke="#059669"
                strokeWidth="1.8"
                strokeDasharray="5 3"
              />
              <text
                x={Math.min(SVG_W - PAD_R - 4, mapX(cutoffFreq) + 4)}
                y={PAD_T + 26}
                className="text-[9.5px] font-mono font-bold fill-[#059669]"
              >
                LPF f_cut = {cutoffFreq.toFixed(1)}Hz
              </text>
            </g>
          )}

          {/* Reference Frequency Markers (fc, fc-fm, fc+fm) */}
          {markers.map((m, idx) => {
            if (m.freq < 0 || m.freq > maxFreqHz) return null;
            const x = mapX(m.freq);
            return (
              <g key={`mk-${idx}`}>
                <line
                  x1={x}
                  y1={PAD_T}
                  x2={x}
                  y2={PAD_T + plotH}
                  stroke={m.color}
                  strokeWidth="1.2"
                  strokeDasharray={m.dashed ? '4 3' : undefined}
                  opacity="0.7"
                />
                <text
                  x={x}
                  y={PAD_T - 8}
                  textAnchor="middle"
                  className="text-[9.5px] font-mono font-bold"
                  fill={m.color}
                >
                  {m.label}
                </text>
              </g>
            );
          })}

          {/* Axes */}
          <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + plotH} stroke="#1A1917" strokeWidth="1.3" />
          <line x1={PAD_L} y1={PAD_T + plotH} x2={SVG_W - PAD_R} y2={PAD_T + plotH} stroke="#1A1917" strokeWidth="1.3" />

          {/* Spectral Stems & Bars */}
          {spectrum.map((pt) => {
            if (pt.freq > maxFreqHz || pt.mag < 0.01) return null;
            const x = mapX(pt.freq);
            const yTop = mapY(pt.mag);
            const yBot = PAD_T + plotH;
            return (
              <g key={`sp-${pt.freq}`}>
                <line
                  x1={x}
                  y1={yBot}
                  x2={x}
                  y2={yTop}
                  stroke={barColor}
                  strokeWidth="3.2"
                  strokeLinecap="round"
                />
                <circle cx={x} cy={yTop} r="3.6" fill={barColor} stroke="#FFFFFF" strokeWidth="1.2" />
              </g>
            );
          })}

          {/* Y Ticks */}
          {[0, yMax * 0.5, yMax].map((v, i) => (
            <text
              key={`syt-${i}`}
              x={PAD_L - 7}
              y={mapY(v) + 3.5}
              textAnchor="end"
              className="text-[9.5px] font-mono fill-[#75736E]"
            >
              {v.toFixed(1)}
            </text>
          ))}

          {/* X Ticks */}
          {freqTicks.map((f) => (
            <text
              key={`sxt-${f}`}
              x={mapX(f)}
              y={PAD_T + plotH + 15}
              textAnchor="middle"
              className="text-[9.5px] font-mono fill-[#75736E]"
            >
              {f}
            </text>
          ))}

          {/* Axis Titles */}
          <text
            x={14}
            y={PAD_T + plotH / 2}
            textAnchor="middle"
            transform={`rotate(-90, 14, ${PAD_T + plotH / 2})`}
            className="text-[10px] font-mono font-bold fill-[#1A1917]"
          >
            Magnitude [V]
          </text>
          <text
            x={SVG_W - PAD_R}
            y={SVG_H - 4}
            textAnchor="end"
            className="text-[10px] font-mono font-bold fill-[#1A1917]"
          >
            Frequency f [Hz] →
          </text>
        </svg>
      </div>
    </div>
  );
};
