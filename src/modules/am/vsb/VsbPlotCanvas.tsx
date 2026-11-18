/**
 * High-Precision Frequency-Domain & Time-Domain SVG Plots for Module 2.4 (VSB)
 * Matches the warm Signal Lab aesthetic of Module 2.3 (SSB).
 */

import React, { useRef, useMemo, useCallback } from 'react';
import {
  ContinuousCurvePoint,
  ModulatorCurvePoint,
  ConditionCheckPoint,
  VSB_DURATION,
  sampleAtTime,
} from './vsbMathEngine';

/* ============================================================================
 * 1. TWO-SIDED SPECTRUM PLOT (Used in Tab 1 Stacked Spectra & Tab 2 VSB Output)
 * ==========================================================================*/
interface VsbTwoSidedSpectrumPlotProps {
  title: string;
  subtitle?: string;
  curve: ContinuousCurvePoint[];
  maxFreq: number;
  fc?: number;
  W?: number;
  fv?: number;
  strokeColor?: string;
  fillColor?: string;
  bwText?: string;
  badgeText?: string;
  badgeVariant?: 'accent' | 'emerald' | 'teal' | 'neutral';
  highlightVestige?: boolean;
  isGridVisible: boolean;
  heightClass?: string;
  yAxisMax?: number;
}

export const VsbTwoSidedSpectrumPlot: React.FC<VsbTwoSidedSpectrumPlotProps> = ({
  title,
  subtitle,
  curve,
  maxFreq,
  fc,
  W,
  fv,
  strokeColor = '#C85A32',
  fillColor = '#C85A32',
  bwText,
  badgeText,
  badgeVariant = 'neutral',
  highlightVestige = false,
  isGridVisible,
  heightClass = 'h-[155px]',
  yAxisMax = 1.15,
}) => {
  const SVG_W = 780;
  const SVG_H = 168;
  const PAD_L = 52;
  const PAD_R = 20;
  const PAD_T = 26;
  const PAD_B = 30;
  const plotW = SVG_W - PAD_L - PAD_R;
  const plotH = SVG_H - PAD_T - PAD_B;
  const baseY = PAD_T + plotH;

  const mapX = useCallback(
    (f: number) => PAD_L + ((f + maxFreq) / (2 * maxFreq)) * plotW,
    [maxFreq, plotW]
  );

  const mapY = useCallback(
    (v: number) => baseY - (Math.max(0, Math.min(yAxisMax, v)) / yAxisMax) * plotH,
    [baseY, plotH, yAxisMax]
  );

  const { linePath, areaPath, vestigeLeftPath, vestigeRightPath } = useMemo(() => {
    if (curve.length === 0) {
      return { linePath: '', areaPath: '', vestigeLeftPath: '', vestigeRightPath: '' };
    }
    let line = '';
    for (let i = 0; i < curve.length; i++) {
      const x = mapX(curve[i].freq).toFixed(1);
      const y = mapY(curve[i].val).toFixed(1);
      line += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    }
    const firstX = mapX(curve[0].freq).toFixed(1);
    const lastX = mapX(curve[curve.length - 1].freq).toFixed(1);
    const area = `${line} L ${lastX} ${baseY.toFixed(1)} L ${firstX} ${baseY.toFixed(1)} Z`;

    let vLeft = '';
    let vRight = '';
    if (highlightVestige && fc !== undefined && fv !== undefined) {
      const rightPts = curve.filter((p) => p.freq >= fc - fv - 0.1 && p.freq <= fc + 0.1);
      if (rightPts.length > 1) {
        vRight = rightPts
          .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${mapX(p.freq).toFixed(1)} ${mapY(p.val).toFixed(1)}`)
          .join(' ');
        vRight += ` L ${mapX(rightPts[rightPts.length - 1].freq).toFixed(1)} ${baseY.toFixed(1)} L ${mapX(rightPts[0].freq).toFixed(1)} ${baseY.toFixed(1)} Z`;
      }
      const leftPts = curve.filter((p) => p.freq >= -fc - 0.1 && p.freq <= -fc + fv + 0.1);
      if (leftPts.length > 1) {
        vLeft = leftPts
          .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${mapX(p.freq).toFixed(1)} ${mapY(p.val).toFixed(1)}`)
          .join(' ');
        vLeft += ` L ${mapX(leftPts[leftPts.length - 1].freq).toFixed(1)} ${baseY.toFixed(1)} L ${mapX(leftPts[0].freq).toFixed(1)} ${baseY.toFixed(1)} Z`;
      }
    }

    return {
      linePath: line,
      areaPath: area,
      vestigeLeftPath: vLeft,
      vestigeRightPath: vRight,
    };
  }, [curve, mapX, mapY, baseY, highlightVestige, fc, fv]);

  const freqTicks = useMemo(() => {
    const step = maxFreq <= 28 ? 4 : maxFreq <= 44 ? 8 : 10;
    const arr: number[] = [0];
    for (let f = step; f <= maxFreq; f += step) {
      arr.unshift(-f);
      arr.push(f);
    }
    return arr;
  }, [maxFreq]);

  const badgeStyle =
    badgeVariant === 'accent'
      ? 'bg-[#FBF4F0] text-[#C85A32] border-[#C85A32]/25'
      : badgeVariant === 'emerald'
      ? 'bg-[#10B981]/10 text-[#059669] border-[#10B981]/30'
      : badgeVariant === 'teal'
      ? 'bg-[#2E6F7E]/10 text-[#2E6F7E] border-[#2E6F7E]/30'
      : 'bg-[#FAF9F6] text-[#585651] border-[#E6E4DD]';

  return (
    <div className="bg-white rounded-lg border border-[#E6E4DD] p-3 shadow-2xs space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-[#E6E4DD]">
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
        {bwText && (
          <span className="text-[11px] font-mono font-bold text-[#1A1917] tabular-nums">
            {bwText}
          </span>
        )}
      </div>

      <div className={`relative w-full ${heightClass} bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden`}>
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="xMidYMid meet" className="w-full h-full select-none" role="img" aria-label={title}>
          {/* Grid */}
          {isGridVisible &&
            freqTicks.map((f) => (
              <line
                key={`vg-${f}`}
                x1={mapX(f)}
                y1={PAD_T}
                x2={mapX(f)}
                y2={baseY}
                stroke={f === 0 ? '#8A8882' : '#E6E4DD'}
                strokeWidth={f === 0 ? '1.1' : '0.8'}
                strokeDasharray={f === 0 ? undefined : '2 2'}
              />
            ))}

          {isGridVisible &&
            [0.5, 1.0].map((v) => (
              <line
                key={`hg-${v}`}
                x1={PAD_L}
                y1={mapY(v)}
                x2={SVG_W - PAD_R}
                y2={mapY(v)}
                stroke="#E6E4DD"
                strokeWidth="0.8"
                strokeDasharray="3 3"
              />
            ))}

          {/* Carrier Reference Markers (±fc) */}
          {fc !== undefined &&
            [-fc, fc].map((fMark) => (
              <g key={`fc-${fMark}`}>
                <line
                  x1={mapX(fMark)}
                  y1={PAD_T}
                  x2={mapX(fMark)}
                  y2={baseY}
                  stroke="#8A8882"
                  strokeWidth="1.2"
                  strokeDasharray="4 3"
                />
                <text
                  x={mapX(fMark)}
                  y={PAD_T - 6}
                  textAnchor="middle"
                  className="text-[9.5px] font-mono font-bold fill-[#585651]"
                >
                  {fMark > 0 ? `+fc (${fc})` : `-fc (-${fc})`}
                </text>
              </g>
            ))}

          {/* Baseband Bandwidth Marker (±W) when fc is omitted */}
          {fc === undefined && W !== undefined && (
            <g>
              {[-W, W].map((edge) => (
                <line
                  key={`w-${edge}`}
                  x1={mapX(edge)}
                  y1={PAD_T}
                  x2={mapX(edge)}
                  y2={baseY}
                  stroke="#585651"
                  strokeWidth="1.1"
                  strokeDasharray="3 3"
                />
              ))}
              <text x={mapX(-W)} y={PAD_T - 6} textAnchor="middle" className="text-[9.5px] font-mono font-bold fill-[#585651]">
                -W
              </text>
              <text x={mapX(W)} y={PAD_T - 6} textAnchor="middle" className="text-[9.5px] font-mono font-bold fill-[#585651]">
                +W
              </text>
            </g>
          )}

          {/* Shaded Spectrum Fill */}
          <path d={areaPath} fill={fillColor} fillOpacity="0.16" />

          {/* Optional Vestige Highlight */}
          {highlightVestige && vestigeRightPath && (
            <path d={vestigeRightPath} fill="#D97706" fillOpacity="0.32" />
          )}
          {highlightVestige && vestigeLeftPath && (
            <path d={vestigeLeftPath} fill="#D97706" fillOpacity="0.32" />
          )}

          {/* Spectrum Envelope Curve */}
          <path d={linePath} fill="none" stroke={strokeColor} strokeWidth="2.2" strokeLinejoin="round" />

          {/* Vestige label */}
          {highlightVestige && fc !== undefined && fv !== undefined && (
            <text
              x={mapX(fc - fv * 0.5)}
              y={baseY - 12}
              textAnchor="end"
              className="text-[9px] font-mono font-bold fill-[#B45309]"
            >
              vestige fv
            </text>
          )}

          {/* Axes */}
          <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={baseY} stroke="#1A1917" strokeWidth="1.1" />
          <line x1={PAD_L} y1={baseY} x2={SVG_W - PAD_R} y2={baseY} stroke="#1A1917" strokeWidth="1.2" />

          {/* Y ticks */}
          {[0, 0.5, 1.0].map((v) => (
            <text
              key={`yt-${v}`}
              x={PAD_L - 6}
              y={mapY(v) + 3.5}
              textAnchor="end"
              className="text-[9px] font-mono fill-[#75736E]"
            >
              {v.toFixed(1)}
            </text>
          ))}

          {/* X ticks */}
          {freqTicks.map((f) => (
            <text
              key={`xt-${f}`}
              x={mapX(f)}
              y={baseY + 14}
              textAnchor="middle"
              className={`text-[9px] font-mono ${f === 0 ? 'font-bold fill-[#1A1917]' : 'fill-[#75736E]'}`}
            >
              {f}
            </text>
          ))}

          <text x={SVG_W - PAD_R} y={SVG_H - 3} textAnchor="end" className="text-[9.5px] font-mono font-bold fill-[#585651]">
            Frequency f [Hz] →
          </text>
        </svg>
      </div>
    </div>
  );
};

/* ============================================================================
 * 2. DSB-SC SPECTRUM WITH VSB SHAPING FILTER H(f) OVERLAY (Tab 2)
 * ==========================================================================*/
interface VsbModulatorOverlayPlotProps {
  curves: ModulatorCurvePoint[];
  maxFreq: number;
  fc: number;
  W: number;
  fv: number;
  satisfiesCondition: boolean;
  isGridVisible: boolean;
}

export const VsbModulatorOverlayPlot: React.FC<VsbModulatorOverlayPlotProps> = ({
  curves,
  maxFreq,
  fc,
  W,
  fv,
  satisfiesCondition,
  isGridVisible,
}) => {
  const SVG_W = 780;
  const SVG_H = 215;
  const PAD_L = 52;
  const PAD_R = 20;
  const PAD_T = 32;
  const PAD_B = 34;
  const plotW = SVG_W - PAD_L - PAD_R;
  const plotH = SVG_H - PAD_T - PAD_B;
  const baseY = PAD_T + plotH;
  const yMax = 1.3;

  const mapX = (f: number) => PAD_L + ((f + maxFreq) / (2 * maxFreq)) * plotW;
  const mapY = (v: number) => baseY - (Math.max(0, Math.min(yMax, v)) / yMax) * plotH;

  const dsbLine = curves
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${mapX(p.freq).toFixed(1)} ${mapY(p.dsbMag).toFixed(1)}`)
    .join(' ');
  const dsbArea = `${dsbLine} L ${mapX(maxFreq).toFixed(1)} ${baseY.toFixed(1)} L ${mapX(-maxFreq).toFixed(1)} ${baseY.toFixed(1)} Z`;

  const hLine = curves
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${mapX(p.freq).toFixed(1)} ${mapY(p.filterH).toFixed(1)}`)
    .join(' ');

  const freqTicks = useMemo(() => {
    const step = maxFreq <= 28 ? 4 : maxFreq <= 44 ? 8 : 10;
    const arr: number[] = [0];
    for (let f = step; f <= maxFreq; f += step) {
      arr.unshift(-f);
      arr.push(f);
    }
    return arr;
  }, [maxFreq]);

  return (
    <div className="bg-white rounded-lg border border-[#E6E4DD] p-3.5 shadow-2xs space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E6E4DD]">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xs font-mono font-bold text-[#1A1917]">
            1. DSB-SC Spectrum with VSB Shaping Filter H(f) Overlaid
          </h3>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
              satisfiesCondition
                ? 'bg-[#10B981]/10 text-[#059669] border-[#10B981]/30'
                : 'bg-[#FBF4F0] text-[#C85A32] border-[#C85A32]/30'
            }`}
          >
            {satisfiesCondition ? 'Straight-Line Complementary Slope' : 'Skewed Non-Complementary Slope'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#2E6F7E]" />
            <span className="text-[#585651]">DSB-SC Spectrum</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-b-2 border-dashed border-[#C85A32]" />
            <span className="text-[#585651]">Filter H(f)</span>
          </span>
        </div>
      </div>

      <div className="relative w-full h-[205px] bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden">
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="xMidYMid meet" className="w-full h-full select-none" role="img" aria-label="DSB-SC Spectrum with H(f) Overlay">
          {isGridVisible &&
            freqTicks.map((f) => (
              <line
                key={`mv-${f}`}
                x1={mapX(f)}
                y1={PAD_T}
                x2={mapX(f)}
                y2={baseY}
                stroke={f === 0 ? '#8A8882' : '#E6E4DD'}
                strokeWidth={f === 0 ? '1.1' : '0.8'}
                strokeDasharray={f === 0 ? undefined : '2 2'}
              />
            ))}
          {isGridVisible &&
            [0.5, 1.0].map((v) => (
              <line
                key={`mh-${v}`}
                x1={PAD_L}
                y1={mapY(v)}
                x2={SVG_W - PAD_R}
                y2={mapY(v)}
                stroke="#E6E4DD"
                strokeWidth="0.9"
                strokeDasharray="3 3"
              />
            ))}

          {/* Vestige Transition Shaded Bands [fc-fv, fc+fv] & [-fc-fv, -fc+fv] */}
          {[
            [fc - fv, fc + fv],
            [-fc - fv, -fc + fv],
          ].map(([f1, f2], idx) => (
            <rect
              key={`vband-${idx}`}
              x={mapX(f1)}
              y={PAD_T}
              width={Math.max(2, mapX(f2) - mapX(f1))}
              height={plotH}
              fill="#D97706"
              fillOpacity="0.11"
            />
          ))}

          {/* Markers ±fc */}
          {[-fc, fc].map((fMark) => (
            <g key={`mfc-${fMark}`}>
              <line
                x1={mapX(fMark)}
                y1={PAD_T}
                x2={mapX(fMark)}
                y2={baseY}
                stroke="#8A8882"
                strokeWidth="1.2"
                strokeDasharray="4 3"
              />
              <text x={mapX(fMark)} y={PAD_T - 8} textAnchor="middle" className="text-[9.5px] font-mono font-bold fill-[#585651]">
                {fMark > 0 ? `+fc` : `-fc`}
              </text>
            </g>
          ))}

          {/* DSB-SC Area & Curve */}
          <path d={dsbArea} fill="#2E6F7E" fillOpacity="0.14" />
          <path d={dsbLine} fill="none" stroke="#2E6F7E" strokeWidth="2" />

          {/* H(f) Filter Overlay */}
          <path d={hLine} fill="none" stroke="#C85A32" strokeWidth="2.4" strokeDasharray="6 3" />

          {/* Point at H(fc) */}
          <circle
            cx={mapX(fc)}
            cy={mapY(satisfiesCondition ? 0.5 : 0.45 * ((0.25 * fv) / (1.25 * fv)))}
            r="4.2"
            fill="#C85A32"
            stroke="#FFFFFF"
            strokeWidth="1.5"
          />
          <text x={mapX(fc + fv + 0.5)} y={mapY(1.0) - 6} className="text-[9.5px] font-mono font-bold fill-[#C85A32]">
            H(f) = 1 (Passband up to fc+W={fc + W})
          </text>

          {/* Axes */}
          <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={baseY} stroke="#1A1917" strokeWidth="1.2" />
          <line x1={PAD_L} y1={baseY} x2={SVG_W - PAD_R} y2={baseY} stroke="#1A1917" strokeWidth="1.2" />

          {[0, 0.5, 1.0].map((v) => (
            <text key={`myt-${v}`} x={PAD_L - 6} y={mapY(v) + 3.5} textAnchor="end" className="text-[9.5px] font-mono fill-[#75736E]">
              {v.toFixed(1)}
            </text>
          ))}

          {freqTicks.map((f) => (
            <text key={`mxt-${f}`} x={mapX(f)} y={baseY + 14} textAnchor="middle" className="text-[9.5px] font-mono fill-[#75736E]">
              {f}
            </text>
          ))}

          <text x={SVG_W - PAD_R} y={SVG_H - 4} textAnchor="end" className="text-[9.5px] font-mono font-bold fill-[#1A1917]">
            Frequency f [Hz] →
          </text>
        </svg>
      </div>
    </div>
  );
};

/* ============================================================================
 * 3. COMPLEMENTARY CONDITION CHECK PLOT: H(f + fc) + H(f - fc) over -W..W
 * ==========================================================================*/
interface VsbConditionPlotProps {
  conditionCurve: ConditionCheckPoint[];
  W: number;
  fv: number;
  isSatisfied: boolean;
  isGridVisible: boolean;
}

export const VsbConditionPlot: React.FC<VsbConditionPlotProps> = ({
  conditionCurve,
  W,
  fv,
  isSatisfied,
  isGridVisible,
}) => {
  const SVG_W = 780;
  const SVG_H = 195;
  const PAD_L = 52;
  const PAD_R = 20;
  const PAD_T = 30;
  const PAD_B = 34;
  const plotW = SVG_W - PAD_L - PAD_R;
  const plotH = SVG_H - PAD_T - PAD_B;
  const baseY = PAD_T + plotH;
  const yMax = 1.4;

  const mapX = (f: number) => PAD_L + ((f + W) / (2 * W)) * plotW;
  const mapY = (v: number) => baseY - (Math.max(0, Math.min(yMax, v)) / yMax) * plotH;

  const sumPath = conditionCurve
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${mapX(p.freq).toFixed(1)} ${mapY(p.sum).toFixed(1)}`)
    .join(' ');
  const hPlusPath = conditionCurve
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${mapX(p.freq).toFixed(1)} ${mapY(p.hPlus).toFixed(1)}`)
    .join(' ');
  const hMinusPath = conditionCurve
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${mapX(p.freq).toFixed(1)} ${mapY(p.hMinus).toFixed(1)}`)
    .join(' ');

  const ticks = useMemo(() => {
    return [-W, -fv, 0, fv, W].filter((v, idx, arr) => arr.findIndex((x) => Math.abs(x - v) < 0.01) === idx);
  }, [W, fv]);

  return (
    <div className="bg-white rounded-lg border border-[#E6E4DD] p-3.5 shadow-2xs space-y-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E6E4DD]">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xs font-mono font-bold text-[#1A1917]">
            3. VSB Condition Verification: H(f + fc) + H(f - fc) over [-W, +W]
          </h3>
          <span
            className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold border ${
              isSatisfied
                ? 'bg-[#10B981]/10 text-[#059669] border-[#10B981]/30'
                : 'bg-[#FEE2E2] text-[#B91C1C] border-[#EF4444]/30'
            }`}
          >
            {isSatisfied ? 'Condition satisfied' : 'Condition not satisfied'}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[10.5px] font-mono">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-[#059669]" />
            <span className="text-[#1A1917] font-semibold">Sum H(f+fc)+H(f-fc)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-b border-dashed border-[#C85A32]" />
            <span className="text-[#585651]">H(f+fc)</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 border-b border-dashed border-[#2E6F7E]" />
            <span className="text-[#585651]">H(f-fc)</span>
          </span>
        </div>
      </div>

      <div className="relative w-full h-[185px] bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden">
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} preserveAspectRatio="xMidYMid meet" className="w-full h-full select-none" role="img" aria-label="VSB Complementary Condition Plot">
          {isGridVisible &&
            ticks.map((f) => (
              <line
                key={`cv-${f}`}
                x1={mapX(f)}
                y1={PAD_T}
                x2={mapX(f)}
                y2={baseY}
                stroke={Math.abs(f) < 1e-6 ? '#8A8882' : '#E6E4DD'}
                strokeWidth={Math.abs(f) < 1e-6 ? '1.1' : '0.8'}
              />
            ))}

          {/* Target = 1.0 Line */}
          <line
            x1={PAD_L}
            y1={mapY(1.0)}
            x2={SVG_W - PAD_R}
            y2={mapY(1.0)}
            stroke="#1A1917"
            strokeWidth="1.3"
            strokeDasharray="4 3"
            opacity="0.6"
          />
          <text x={PAD_L + 6} y={mapY(1.0) - 5} className="text-[9.5px] font-mono font-bold fill-[#1A1917]">
            Target = 1.0 (Distortionless Recovery)
          </text>

          {/* Individual Shifted Terms */}
          <path d={hPlusPath} fill="none" stroke="#C85A32" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.8" />
          <path d={hMinusPath} fill="none" stroke="#2E6F7E" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.8" />

          {/* Sum Curve */}
          <path
            d={sumPath}
            fill="none"
            stroke={isSatisfied ? '#059669' : '#DC2626'}
            strokeWidth="2.8"
            strokeLinejoin="round"
          />

          {/* Axes */}
          <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={baseY} stroke="#1A1917" strokeWidth="1.2" />
          <line x1={PAD_L} y1={baseY} x2={SVG_W - PAD_R} y2={baseY} stroke="#1A1917" strokeWidth="1.2" />

          {[0, 0.5, 1.0, 1.25].map((v) => (
            <text key={`cyt-${v}`} x={PAD_L - 6} y={mapY(v) + 3.5} textAnchor="end" className="text-[9.5px] font-mono fill-[#75736E]">
              {v.toFixed(2)}
            </text>
          ))}

          {ticks.map((f) => (
            <text key={`cxt-${f}`} x={mapX(f)} y={baseY + 14} textAnchor="middle" className="text-[9.5px] font-mono fill-[#585651]">
              {f === 0 ? '0' : `${f > 0 ? '+' : ''}${f.toFixed(1)}`}
            </text>
          ))}

          <text x={SVG_W - PAD_R} y={SVG_H - 4} textAnchor="end" className="text-[9.5px] font-mono font-bold fill-[#1A1917]">
            Baseband Frequency f ∈ [-W, +W] [Hz] →
          </text>
        </svg>
      </div>
    </div>
  );
};

/* ============================================================================
 * 4. TIME-DOMAIN WAVEFORM PLOT (Used in Tab 3 Coherent Demodulation)
 * ==========================================================================*/
interface VsbTimePlotProps {
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
  tWindow?: number;
  isGridVisible: boolean;
  heightClass?: string;
  badgeText?: string;
  badgeVariant?: 'accent' | 'emerald' | 'neutral';
}

export const VsbTimePlot: React.FC<VsbTimePlotProps> = ({
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
  tWindow = 1.0,
  isGridVisible,
  heightClass = 'h-[185px]',
  badgeText,
  badgeVariant = 'neutral',
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const draggingRef = useRef(false);

  const SVG_W = 760;
  const SVG_H = 198;
  const PAD_L = 54;
  const PAD_R = 20;
  const PAD_T = 34;
  const PAD_B = 32;
  const plotW = SVG_W - PAD_L - PAD_R;
  const plotH = SVG_H - PAD_T - PAD_B;
  const centerY = PAD_T + plotH / 2;

  const displayTMax = Math.max(0.25, Math.min(VSB_DURATION, tWindow));

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

  const PILL_W = secondaryValues ? 250 : 172;
  const pillX = Math.max(PAD_L + PILL_W / 2, Math.min(SVG_W - PAD_R - PILL_W / 2, cursorX));

  return (
    <div className="bg-white rounded-lg border border-[#E6E4DD] p-3.5 shadow-2xs space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-[#E6E4DD]">
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

        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono tabular-nums">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 rounded-full" style={{ backgroundColor: primaryColor }} />
            <span className="text-[#585651]">{primaryLabel}:</span>
            <strong className="text-[#1A1917]">
              {currentPrimaryVal >= 0 ? '+' : ''}
              {currentPrimaryVal.toFixed(2)} V
            </strong>
          </span>

          {secondaryValues && secondaryLabel && currentSecondaryVal !== null && (
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 border-b-2 border-dashed" style={{ borderColor: secondaryColor }} />
              <span className="text-[#585651]">{secondaryLabel}:</span>
              <strong className="text-[#1A1917]">
                {currentSecondaryVal >= 0 ? '+' : ''}
                {currentSecondaryVal.toFixed(2)} V
              </strong>
            </span>
          )}
        </div>
      </div>

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
          {isGridVisible &&
            [-yMax, -yMax / 2, 0, yMax / 2, yMax].map((v, i) => (
              <line
                key={`hg-${i}`}
                x1={PAD_L}
                y1={mapY(v)}
                x2={SVG_W - PAD_R}
                y2={mapY(v)}
                stroke={Math.abs(v) < 1e-6 ? '#8A8882' : '#E6E4DD'}
                strokeWidth={Math.abs(v) < 1e-6 ? '1.2' : '0.8'}
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
                strokeWidth="0.8"
              />
            ))}

          <rect x={PAD_L} y={PAD_T} width={plotW} height={plotH} fill="none" stroke="#DCD8CE" strokeWidth="1.2" />

          <path d={primaryPath} fill="none" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {secondaryValues && (
            <path d={secondaryPath} fill="none" stroke={secondaryColor} strokeWidth="2" strokeDasharray="5 3" strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* Vertical Cursor */}
          <line x1={cursorX} y1={PAD_T - 4} x2={cursorX} y2={SVG_H - PAD_B} stroke="#C85A32" strokeWidth="1.6" />
          <circle cx={cursorX} cy={mapY(currentPrimaryVal)} r="4" fill={primaryColor} stroke="#FFFFFF" strokeWidth="1.5" />
          {secondaryValues && currentSecondaryVal !== null && (
            <circle cx={cursorX} cy={mapY(currentSecondaryVal)} r="4" fill={secondaryColor} stroke="#FFFFFF" strokeWidth="1.5" />
          )}

          <g>
            <rect x={pillX - PILL_W / 2} y={6} width={PILL_W} height={20} rx="4" fill="#1A1917" />
            <text x={pillX} y={19.5} textAnchor="middle" className="text-[9.5px] font-mono font-bold fill-white">
              {secondaryValues && currentSecondaryVal !== null
                ? `t=${cursorTime.toFixed(2)}s · Orig=${currentPrimaryVal.toFixed(2)}V · Rec=${currentSecondaryVal.toFixed(2)}V`
                : `t=${cursorTime.toFixed(2)}s · ${currentPrimaryVal >= 0 ? '+' : ''}${currentPrimaryVal.toFixed(2)} V`}
            </text>
          </g>

          {[-yMax, 0, yMax].map((v) => (
            <text key={`yt-${v}`} x={PAD_L - 6} y={mapY(v) + 3.5} textAnchor="end" className="text-[9.5px] font-mono fill-[#75736E]">
              {v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1)}
            </text>
          ))}

          {ticks.map((t) => (
            <text key={`xt-${t}`} x={mapX(t)} y={SVG_H - PAD_B + 14} textAnchor="middle" className="text-[9.5px] font-mono fill-[#75736E]">
              {t.toFixed(2)}s
            </text>
          ))}

          <text x={SVG_W - PAD_R} y={SVG_H - 4} textAnchor="end" className="text-[9.5px] font-mono font-bold fill-[#1A1917]">
            Time t [s] →
          </text>
        </svg>
      </div>
    </div>
  );
};
