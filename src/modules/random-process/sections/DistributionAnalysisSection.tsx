/**
 * Section 3: Probability Distribution Analysis
 * Complete ProbStat Studio integration into Random Processes:
 * Empirical Histogram, KDE, Analytical PDF/PMF, CDF, Moment Engine,
 * and Continuous vs. Discrete Random Variable exploration using actual simulated data.
 */

import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  TrendingUp,
  Sliders,
  Layers,
  Calculator,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { MathView } from '../../../components/MathView';
import {
  EnsembleSimulationData,
  computeDistributionAnalysis,
  getInstantaneousStats,
  DistributionAnalysisData,
} from '../randomProcessEngine';

interface DistributionAnalysisSectionProps {
  simulation: EnsembleSimulationData;
  simTime: number;
  selectedRealizationIndex: number;
}

export const DistributionAnalysisSection: React.FC<DistributionAnalysisSectionProps> = ({
  simulation,
  simTime,
  selectedRealizationIndex,
}) => {
  const [dataScope, setDataScope] = useState<'slice' | 'trajectory' | 'pooled'>('pooled');
  const [activeTab, setActiveTab] = useState<'pdf' | 'cdf' | 'discrete_vs_continuous'>('pdf');
  const [thresholdX, setThresholdX] = useState<number>(0.0);
  const [binCount, setBinCount] = useState<number>(20);

  // Extract actual data samples based on chosen scope
  const activeSamples = useMemo(() => {
    if (dataScope === 'slice') {
      const stats = getInstantaneousStats(simulation, simTime, selectedRealizationIndex);
      return stats.ensembleValues;
    } else if (dataScope === 'trajectory') {
      const idx = Math.max(0, Math.min(simulation.trajectories.length - 1, selectedRealizationIndex));
      return simulation.trajectories[idx].map((p) => p.x);
    } else {
      // Pooled all realizations across time
      return simulation.pooledSamples;
    }
  }, [dataScope, simulation, simTime, selectedRealizationIndex]);

  // Compute distribution analysis
  const distData: DistributionAnalysisData = useMemo(() => {
    return computeDistributionAnalysis(
      activeSamples,
      simulation.params.type,
      simulation.params.tMax ? simulation.params : simulation.params,
      binCount
    );
  }, [activeSamples, simulation.params, binCount]);

  // SVG coordinate mapping for PDF/Histogram Plot
  const PLOT_W = 760;
  const PLOT_H = 300;
  const PAD_L = 60;
  const PAD_R = 30;
  const PAD_T = 30;
  const PAD_B = 45;
  const innerW = PLOT_W - PAD_L - PAD_R;
  const innerH = PLOT_H - PAD_T - PAD_B;

  const xMin = distData.min - 0.4;
  const xMax = distData.max + 0.4;

  const maxDensity = useMemo(() => {
    let m = 0.5;
    for (const b of distData.bins) {
      if (b.density > m) m = b.density;
    }
    for (const p of distData.analyticalPdf) {
      if (p.y > m && isFinite(p.y)) m = p.y;
    }
    return Math.min(4.0, m * 1.15);
  }, [distData]);

  const mapX = (x: number) => {
    const range = xMax - xMin || 1;
    return PAD_L + ((x - xMin) / range) * innerW;
  };

  const mapY = (y: number) => {
    const clamped = Math.max(0, Math.min(maxDensity, y));
    return PAD_T + innerH - (clamped / maxDensity) * innerH;
  };

  const mapCdfY = (y: number) => {
    return PAD_T + innerH - Math.max(0, Math.min(1, y)) * innerH;
  };

  // KDE path
  const kdePathD = useMemo(() => {
    if (distData.kdePoints.length === 0) return '';
    return distData.kdePoints.reduce((acc, p, idx) => {
      const x = mapX(p.x).toFixed(1);
      const y = mapY(p.y).toFixed(1);
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [distData.kdePoints, mapX, mapY]);

  // Analytical PDF path
  const analyticalPdfD = useMemo(() => {
    if (distData.analyticalPdf.length === 0) return '';
    return distData.analyticalPdf.reduce((acc, p, idx) => {
      const x = mapX(p.x).toFixed(1);
      const y = mapY(Math.min(maxDensity * 1.5, p.y)).toFixed(1);
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [distData.analyticalPdf, mapX, mapY, maxDensity]);

  // Empirical CDF path
  const empiricalCdfD = useMemo(() => {
    if (distData.empiricalCdf.length === 0) return '';
    return distData.empiricalCdf.reduce((acc, p, idx) => {
      const x = mapX(p.x).toFixed(1);
      const y = mapCdfY(p.y).toFixed(1);
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [distData.empiricalCdf, mapX, mapCdfY]);

  // Analytical CDF path
  const analyticalCdfD = useMemo(() => {
    if (distData.analyticalCdf.length === 0) return '';
    return distData.analyticalCdf.reduce((acc, p, idx) => {
      const x = mapX(p.x).toFixed(1);
      const y = mapCdfY(p.y).toFixed(1);
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  }, [distData.analyticalCdf, mapX, mapCdfY]);

  // Probability P(X <= thresholdX)
  const empiricalP = useMemo(() => {
    if (activeSamples.length === 0) return 0;
    const count = activeSamples.filter((v) => v <= thresholdX).length;
    return count / activeSamples.length;
  }, [activeSamples, thresholdX]);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-[#FAF9F6] border border-[#E6E4DD] rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#C85A32] bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/20">
                Section 03
              </span>
              <span className="text-xs text-[#75736E] font-medium">ProbStat Studio Engine</span>
            </div>
            <h2 className="text-lg font-bold text-[#1A1917]">
              Probability Distribution Analysis (PDF & CDF)
            </h2>
            <p className="text-xs sm:text-sm text-[#585651] mt-1 max-w-3xl leading-relaxed">
              Examine the statistical distribution of the random process. Contrast empirical histograms and Kernel Density Estimates (KDE) against exact theoretical probability models using actual simulated data.
            </p>
          </div>

          {/* Scope Selector Button Group */}
          <div className="flex items-center gap-1 bg-white border border-[#E6E4DD] rounded-md p-1 shadow-2xs self-start">
            <span className="text-[10px] font-mono text-[#75736E] px-2 uppercase font-semibold">
              Sample Source:
            </span>
            <button
              type="button"
              onClick={() => setDataScope('slice')}
              className={`px-2.5 py-1 text-xs font-mono rounded font-semibold transition-colors cursor-pointer ${
                dataScope === 'slice'
                  ? 'bg-[#C85A32] text-white'
                  : 'text-[#585651] hover:bg-[#FAF9F6]'
              }`}
            >
              Time Slice t={simTime.toFixed(1)}s
            </button>
            <button
              type="button"
              onClick={() => setDataScope('trajectory')}
              className={`px-2.5 py-1 text-xs font-mono rounded font-semibold transition-colors cursor-pointer ${
                dataScope === 'trajectory'
                  ? 'bg-[#C85A32] text-white'
                  : 'text-[#585651] hover:bg-[#FAF9F6]'
              }`}
            >
              Realization X<sup>({selectedRealizationIndex + 1})</sup>
            </button>
            <button
              type="button"
              onClick={() => setDataScope('pooled')}
              className={`px-2.5 py-1 text-xs font-mono rounded font-semibold transition-colors cursor-pointer ${
                dataScope === 'pooled'
                  ? 'bg-[#C85A32] text-white'
                  : 'text-[#585651] hover:bg-[#FAF9F6]'
              }`}
            >
              Pooled Ensemble (N={activeSamples.length})
            </button>
          </div>
        </div>
      </div>

      {/* 2. Sub-Tabs: PDF vs CDF vs Discrete/Continuous */}
      <div className="flex border-b border-[#E6E4DD] gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('pdf')}
          className={`pb-2.5 px-3.5 text-xs font-mono font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'pdf'
              ? 'border-[#C85A32] text-[#C85A32]'
              : 'border-transparent text-[#75736E] hover:text-[#1A1917]'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Probability Density Function (PDF & Histogram)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('cdf')}
          className={`pb-2.5 px-3.5 text-xs font-mono font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'cdf'
              ? 'border-[#C85A32] text-[#C85A32]'
              : 'border-transparent text-[#75736E] hover:text-[#1A1917]'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          <span>Cumulative Distribution Function (CDF Query)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('discrete_vs_continuous')}
          className={`pb-2.5 px-3.5 text-xs font-mono font-bold border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'discrete_vs_continuous'
              ? 'border-[#C85A32] text-[#C85A32]'
              : 'border-transparent text-[#75736E] hover:text-[#1A1917]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Continuous vs. Discrete Reference</span>
        </button>
      </div>

      {/* 3. Main Plot Display */}
      {activeTab === 'pdf' && (
        <div className="bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-[#1A1917]">
                Empirical Histogram vs. Analytical Model
              </span>
              <span className="text-[#75736E]">({activeSamples.length} samples)</span>
            </div>

            <div className="flex items-center gap-4 font-mono text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-3.5 h-3 bg-[#C85A32]/25 border border-[#C85A32] rounded-xs" />
                <span className="text-[#585651]">Histogram</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 bg-[#C85A32] rounded-full" />
                <span className="text-[#C85A32] font-semibold">KDE Estimate</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-0.5 border-b-2 border-dashed border-[#1A1917]" />
                <span className="text-[#1A1917] font-semibold">Analytical PDF</span>
              </div>
            </div>
          </div>

          <div className="relative w-full h-[320px] bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden flex items-center justify-center p-2">
            <svg
              viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
              preserveAspectRatio="xMidYMid meet"
              className="w-full h-full select-none"
            >
              {/* Axes and Grids */}
              <line
                x1={PAD_L}
                y1={PAD_T + innerH}
                x2={PLOT_W - PAD_R}
                y2={PAD_T + innerH}
                stroke="#1A1917"
                strokeWidth="1.5"
              />
              <line
                x1={PAD_L}
                y1={PAD_T}
                x2={PAD_L}
                y2={PAD_T + innerH}
                stroke="#1A1917"
                strokeWidth="1.5"
              />

              {/* Y Axis Ticks (Density) */}
              {[0, 0.25, 0.5, 0.75, 1.0].map((ratio) => {
                const val = ratio * maxDensity;
                const y = mapY(val);
                return (
                  <g key={ratio}>
                    <line
                      x1={PAD_L}
                      y1={y}
                      x2={PLOT_W - PAD_R}
                      y2={y}
                      stroke="#E6E4DD"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={PAD_L - 8}
                      y={y + 3.5}
                      textAnchor="end"
                      className="text-[9px] font-mono fill-[#75736E]"
                    >
                      {val.toFixed(2)}
                    </text>
                  </g>
                );
              })}

              {/* Histogram Bins */}
              {distData.bins.map((b, idx) => {
                const x0 = mapX(b.x0);
                const x1 = mapX(b.x1);
                const barW = Math.max(1, x1 - x0 - 1);
                const y = mapY(b.density);
                const barH = PAD_T + innerH - y;
                return (
                  <rect
                    key={idx}
                    x={x0}
                    y={y}
                    width={barW}
                    height={barH}
                    fill="#C85A32"
                    fillOpacity="0.28"
                    stroke="#C85A32"
                    strokeWidth="1"
                  />
                );
              })}

              {/* KDE Smooth Curve */}
              <path
                d={kdePathD}
                fill="none"
                stroke="#C85A32"
                strokeWidth="2.2"
                strokeLinecap="round"
              />

              {/* Analytical Model Curve */}
              <path
                d={analyticalPdfD}
                fill="none"
                stroke="#1A1917"
                strokeWidth="2.2"
                strokeDasharray="5 3"
                strokeLinecap="round"
              />

              {/* Mean Marker Line */}
              <line
                x1={mapX(distData.mean)}
                y1={PAD_T}
                x2={mapX(distData.mean)}
                y2={PAD_T + innerH}
                stroke="#1A1917"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />

              {/* X Axis Labels */}
              <text
                x={PLOT_W - PAD_R}
                y={PAD_T + innerH + 30}
                textAnchor="end"
                className="text-[10px] font-mono font-bold fill-[#1A1917]"
              >
                Amplitude Value x [V] →
              </text>
              <text
                x={PAD_L - 8}
                y={PAD_T - 12}
                textAnchor="start"
                className="text-[10px] font-mono font-bold fill-[#1A1917]"
              >
                Probability Density f(x)
              </text>
            </svg>
          </div>
        </div>
      )}

      {activeTab === 'cdf' && (
        <div className="bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="font-mono font-bold text-[#1A1917]">
                Cumulative Distribution Function <MathView math="F(x) = P(X \le x)" />
              </span>
            </div>

            {/* Threshold Slider */}
            <div className="flex items-center gap-2 font-mono">
              <span className="text-[#75736E]">Threshold x:</span>
              <input
                type="range"
                min={xMin}
                max={xMax}
                step="0.05"
                value={thresholdX}
                onChange={(e) => setThresholdX(parseFloat(e.target.value))}
                className="w-32 accent-[#C85A32] cursor-pointer"
              />
              <span className="font-bold text-[#1A1917]">{thresholdX.toFixed(2)} V</span>
              <span className="bg-[#FAF9F6] px-2 py-0.5 rounded border border-[#E6E4DD] font-bold text-[#C85A32]">
                P(X ≤ {thresholdX.toFixed(2)}) = {(empiricalP * 100).toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="relative w-full h-[320px] bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden flex items-center justify-center p-2">
            <svg
              viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
              preserveAspectRatio="xMidYMid meet"
              className="w-full h-full select-none"
            >
              {/* Axes */}
              <line
                x1={PAD_L}
                y1={PAD_T + innerH}
                x2={PLOT_W - PAD_R}
                y2={PAD_T + innerH}
                stroke="#1A1917"
                strokeWidth="1.5"
              />
              <line
                x1={PAD_L}
                y1={PAD_T}
                x2={PAD_L}
                y2={PAD_T + innerH}
                stroke="#1A1917"
                strokeWidth="1.5"
              />

              {/* CDF Ticks (0, 0.25, 0.5, 0.75, 1.0) */}
              {[0, 0.25, 0.5, 0.75, 1.0].map((p) => {
                const y = mapCdfY(p);
                return (
                  <g key={p}>
                    <line
                      x1={PAD_L}
                      y1={y}
                      x2={PLOT_W - PAD_R}
                      y2={y}
                      stroke="#E6E4DD"
                      strokeWidth="1"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={PAD_L - 8}
                      y={y + 3.5}
                      textAnchor="end"
                      className="text-[9px] font-mono fill-[#75736E]"
                    >
                      {p.toFixed(2)}
                    </text>
                  </g>
                );
              })}

              {/* Shaded Threshold Area */}
              <rect
                x={PAD_L}
                y={PAD_T}
                width={Math.max(0, mapX(thresholdX) - PAD_L)}
                height={innerH}
                fill="#C85A32"
                fillOpacity="0.08"
              />

              {/* Vertical Threshold Line */}
              <line
                x1={mapX(thresholdX)}
                y1={PAD_T}
                x2={mapX(thresholdX)}
                y2={PAD_T + innerH}
                stroke="#C85A32"
                strokeWidth="2"
              />

              {/* Horizontal Threshold Prob line */}
              <line
                x1={PAD_L}
                y1={mapCdfY(empiricalP)}
                x2={mapX(thresholdX)}
                y2={mapCdfY(empiricalP)}
                stroke="#C85A32"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />

              {/* Empirical CDF Step Curve */}
              <path
                d={empiricalCdfD}
                fill="none"
                stroke="#C85A32"
                strokeWidth="2.2"
                strokeLinecap="round"
              />

              {/* Analytical CDF Curve */}
              <path
                d={analyticalCdfD}
                fill="none"
                stroke="#1A1917"
                strokeWidth="2.0"
                strokeDasharray="5 3"
                strokeLinecap="round"
              />

              {/* Threshold Intersection Dot */}
              <circle
                cx={mapX(thresholdX)}
                cy={mapCdfY(empiricalP)}
                r="5"
                fill="#C85A32"
                stroke="#FFFFFF"
                strokeWidth="2"
              />

              <text
                x={PLOT_W - PAD_R}
                y={PAD_T + innerH + 30}
                textAnchor="end"
                className="text-[10px] font-mono font-bold fill-[#1A1917]"
              >
                Threshold x [V] →
              </text>
              <text
                x={PAD_L - 8}
                y={PAD_T - 12}
                textAnchor="start"
                className="text-[10px] font-mono font-bold fill-[#1A1917]"
              >
                Cumulative Probability F(x)
              </text>
            </svg>
          </div>
        </div>
      )}

      {activeTab === 'discrete_vs_continuous' && (
        <div className="bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-[#E6E4DD]">
            <Layers className="w-4 h-4 text-[#C85A32]" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1917]">
              Continuous vs. Discrete Random Variables Architecture
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-lg bg-[#FAF9F6] border border-[#E6E4DD] space-y-2.5">
              <span className="font-mono font-bold text-sm text-[#C85A32] block">
                Continuous Random Variables (e.g. Signal Amplitudes)
              </span>
              <p className="text-[#585651] leading-relaxed">
                Take uncountable values over continuous intervals. Probability at any single exact point is zero: <MathView math="P(X = x) = 0" />.
              </p>
              <div className="p-2.5 bg-white rounded border border-[#E6E4DD] font-mono text-[11px]">
                <MathView math="P(a \le X \le b) = \int_a^b f_X(x) \, dx" displayMode={true} />
              </div>
              <ul className="list-disc list-inside text-[#585651] space-y-1 text-[11px]">
                <li>Governed by Probability Density Function <MathView math="f_X(x) \ge 0" /></li>
                <li>Total Area Under Curve: <MathView math="\int_{-\infty}^\infty f(x)dx = 1" /></li>
                <li>Cumulative Distribution: <MathView math="F_X(x) = \int_{-\infty}^x f(u)du" /></li>
              </ul>
            </div>

            <div className="p-4 rounded-lg bg-[#FAF9F6] border border-[#E6E4DD] space-y-2.5">
              <span className="font-mono font-bold text-sm text-[#1A1917] block">
                Discrete Random Variables (e.g. ADC Levels, Digital Bits)
              </span>
              <p className="text-[#585651] leading-relaxed">
                Take countable values <MathView math="\{x_1, x_2, \dots\}" />. Individual outcomes have non-zero probability mass: <MathView math="P(X = x_k) = p_k > 0" />.
              </p>
              <div className="p-2.5 bg-white rounded border border-[#E6E4DD] font-mono text-[11px]">
                <MathView math="F_X(x) = \sum_{x_k \le x} P(X = x_k), \quad \sum_k p_k = 1" displayMode={true} />
              </div>
              <ul className="list-disc list-inside text-[#585651] space-y-1 text-[11px]">
                <li>Governed by Probability Mass Function (PMF) <MathView math="P(X = k)" /></li>
                <li>CDF forms a piecewise constant step function with jumps equal to PMF</li>
                <li>Used in communications for symbol constellations (QAM, PSK, PAM)</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* 4. Complete Moments & Descriptive Stats Engine Grid */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#E6E4DD]">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-[#C85A32]" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1917]">
              Empirical Moment Statistics ({distData.sampleCount} Data Points)
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[#75736E]">
            High-Precision Mathematical Engine
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] font-mono uppercase text-[#75736E]">Mean E[X]</div>
            <div className="text-sm font-bold font-mono text-[#1A1917] mt-0.5 truncate">
              {distData.mean >= 0 ? '+' : ''}
              {distData.mean.toFixed(3)} V
            </div>
            <div className="text-[10px] text-[#75736E]">1st Raw Moment</div>
          </div>

          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] font-mono uppercase text-[#75736E]">Variance Var(X)</div>
            <div className="text-sm font-bold font-mono text-[#1A1917] mt-0.5 truncate">
              {distData.variance.toFixed(3)} V²
            </div>
            <div className="text-[10px] text-[#75736E]">2nd Central Moment</div>
          </div>

          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] font-mono uppercase text-[#75736E]">Std Dev σ</div>
            <div className="text-sm font-bold font-mono text-[#1A1917] mt-0.5 truncate">
              {distData.stdDev.toFixed(3)} V
            </div>
            <div className="text-[10px] text-[#75736E]">RMS Spread</div>
          </div>

          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] font-mono uppercase text-[#75736E]">Skewness γ₁</div>
            <div className="text-sm font-bold font-mono text-[#1A1917] mt-0.5 truncate">
              {distData.skewness.toFixed(3)}
            </div>
            <div className="text-[10px] text-[#75736E]">
              {Math.abs(distData.skewness) < 0.2 ? 'Symmetric' : distData.skewness > 0 ? 'Right-skewed' : 'Left-skewed'}
            </div>
          </div>

          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] font-mono uppercase text-[#75736E]">Excess Kurtosis γ₂</div>
            <div className="text-sm font-bold font-mono text-[#1A1917] mt-0.5 truncate">
              {distData.kurtosis.toFixed(3)}
            </div>
            <div className="text-[10px] text-[#75736E]">
              {distData.kurtosis < -0.5 ? 'Platykurtic' : distData.kurtosis > 0.5 ? 'Leptokurtic' : 'Mesokurtic'}
            </div>
          </div>

          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] font-mono uppercase text-[#75736E]">Median / IQR</div>
            <div className="text-sm font-bold font-mono text-[#1A1917] mt-0.5 truncate">
              {distData.median.toFixed(2)} / {distData.iqr.toFixed(2)}
            </div>
            <div className="text-[10px] text-[#75736E]">Robust Order Stats</div>
          </div>
        </div>
      </div>
    </div>
  );
};
