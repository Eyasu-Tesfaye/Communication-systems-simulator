/**
 * Section 9: Power Spectral Density (PSD)
 * Frequency-domain power distribution S_XX(f), Wiener-Khinchin theorem,
 * periodogram ensemble averaging, linear and logarithmic dB scales,
 * and telecom frequency allocation interpretations.
 */

import React, { useState, useMemo } from 'react';
import { Radio, BookOpen, Layers, Info, CheckCircle2, Zap } from 'lucide-react';
import { MathView } from '../../../components/MathView';
import {
  EnsembleSimulationData,
  computePsd,
  PsdResult,
} from '../randomProcessEngine';

interface PsdSectionProps {
  simulation: EnsembleSimulationData;
}

export const PsdSection: React.FC<PsdSectionProps> = ({ simulation }) => {
  const [scaleMode, setScaleMode] = useState<'linear' | 'db'>('linear');

  const psdData: PsdResult = useMemo(() => {
    return computePsd(simulation);
  }, [simulation]);

  const { frequencies, ensemblePsd, ensemblePsdDb, theoreticalPsd, peakFrequency, totalBandwidth } = psdData;
  const numFreqs = frequencies.length;
  const fMax = frequencies[numFreqs - 1];

  // SVG coordinate mapping
  const PLOT_W = 760;
  const PLOT_H = 280;
  const PAD_L = 65;
  const PAD_R = 30;
  const PAD_T = 30;
  const PAD_B = 45;
  const innerW = PLOT_W - PAD_L - PAD_R;
  const innerH = PLOT_H - PAD_T - PAD_B;

  const ySeries = scaleMode === 'linear' ? ensemblePsd : ensemblePsdDb;
  const thSeries = scaleMode === 'linear' ? theoreticalPsd : theoreticalPsd.map((p) => 10 * Math.log10(Math.max(1e-9, p)));

  const yMin = scaleMode === 'linear' ? 0 : Math.max(-60, Math.min(...ySeries) - 5);
  const yMax = scaleMode === 'linear' ? Math.max(1.0, Math.max(...ySeries) * 1.25) : Math.max(5, Math.max(...ySeries) + 5);

  const mapX = (f: number) => {
    return PAD_L + (f / fMax) * innerW;
  };

  const mapY = (val: number) => {
    const clamped = Math.max(yMin, Math.min(yMax, val));
    const range = yMax - yMin || 1;
    return PAD_T + innerH - ((clamped - yMin) / range) * innerH;
  };

  const toPathD = (series: number[]) => {
    return frequencies.reduce((acc, f, idx) => {
      const x = mapX(f).toFixed(1);
      const y = mapY(series[idx]).toFixed(1);
      return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
    }, '');
  };

  const ensemblePath = useMemo(() => toPathD(ySeries), [ySeries, frequencies, scaleMode]);
  const theoreticalPath = useMemo(() => toPathD(thSeries), [thSeries, frequencies, scaleMode]);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-[#FAF9F6] border border-[#E6E4DD] rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#C85A32] bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/20">
                Section 09
              </span>
              <span className="text-xs text-[#75736E] font-medium">Frequency-Domain Power Distribution</span>
            </div>
            <h2 className="text-lg font-bold text-[#1A1917]">
              Power Spectral Density (PSD) & Wiener-Khinchin
            </h2>
            <p className="text-xs sm:text-sm text-[#585651] mt-1 max-w-3xl leading-relaxed">
              The Power Spectral Density <MathView math="S_{XX}(f)" /> describes how signal power is distributed across frequency. For wide-sense stationary processes, the Wiener-Khinchin theorem states that <MathView math="S_{XX}(f)" /> is the Fourier transform of the autocorrelation <MathView math="R_{XX}(\tau)" />.
            </p>
          </div>

          {/* Scale Mode Toggle */}
          <div className="flex items-center gap-1 bg-white border border-[#E6E4DD] rounded-md p-1 shadow-2xs self-start">
            <span className="text-[10px] font-mono text-[#75736E] px-2 uppercase font-semibold">
              Power Scale:
            </span>
            <button
              type="button"
              onClick={() => setScaleMode('linear')}
              className={`px-2.5 py-1 text-xs font-mono rounded font-semibold transition-colors cursor-pointer ${
                scaleMode === 'linear'
                  ? 'bg-[#C85A32] text-white'
                  : 'text-[#585651] hover:bg-[#FAF9F6]'
              }`}
            >
              Linear [V²/Hz]
            </button>
            <button
              type="button"
              onClick={() => setScaleMode('db')}
              className={`px-2.5 py-1 text-xs font-mono rounded font-semibold transition-colors cursor-pointer ${
                scaleMode === 'db'
                  ? 'bg-[#C85A32] text-white'
                  : 'text-[#585651] hover:bg-[#FAF9F6]'
              }`}
            >
              Logarithmic [dB/Hz]
            </button>
          </div>
        </div>
      </div>

      {/* 2. Interactive PSD Spectrum Plot */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-[#1A1917]">
              Ensemble Periodogram Power Spectrum <MathView math="S_{XX}(f)" />
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 font-mono text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-[#C85A32] rounded-full" />
              <span className="text-[#C85A32] font-semibold">Ensemble PSD (M Averaged)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 border-b-2 border-dashed border-[#1A1917]" />
              <span className="text-[#1A1917] font-semibold">Theoretical Spectrum</span>
            </div>
          </div>
        </div>

        <div className="relative w-full h-[280px] bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden flex items-center justify-center p-2">
          <svg
            viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full select-none"
          >
            {/* Axis Lines */}
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

            {/* Horizontal Gridlines */}
            {[0, 0.25, 0.5, 0.75, 1.0].map((ratio) => {
              const val = yMin + ratio * (yMax - yMin);
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
                    {val.toFixed(1)}
                  </text>
                </g>
              );
            })}

            {/* Theoretical Curve */}
            <path
              d={theoreticalPath}
              fill="none"
              stroke="#1A1917"
              strokeWidth="2.0"
              strokeDasharray="5 3"
              strokeLinecap="round"
            />

            {/* Ensemble Estimated PSD Curve */}
            <path
              d={ensemblePath}
              fill="none"
              stroke="#C85A32"
              strokeWidth="2.4"
              strokeLinecap="round"
            />

            {/* Frequency Axis Ticks */}
            {[0, fMax * 0.25, fMax * 0.5, fMax * 0.75, fMax].map((f) => (
              <text
                key={f}
                x={mapX(f)}
                y={PAD_T + innerH + 18}
                textAnchor="middle"
                className="text-[9px] font-mono fill-[#75736E]"
              >
                {f.toFixed(1)} Hz
              </text>
            ))}

            <text
              x={PLOT_W - PAD_R}
              y={PAD_T + innerH + 34}
              textAnchor="end"
              className="text-[10px] font-mono fill-[#1A1917] font-bold"
            >
              Frequency f [Hz] →
            </text>
            <text
              x={PAD_L - 8}
              y={PAD_T - 10}
              textAnchor="start"
              className="text-[10px] font-mono fill-[#1A1917] font-bold"
            >
              {scaleMode === 'linear' ? 'PSD S_XX(f) [V²/Hz]' : 'PSD S_XX(f) [dB/Hz]'}
            </text>
          </svg>
        </div>
      </div>

      {/* 3. Mathematical Wiener-Khinchin Formulation & Telemetry */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="p-4 bg-white rounded-lg border border-[#E6E4DD] shadow-2xs space-y-2">
          <div className="font-mono font-bold text-[#1A1917] flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-[#C85A32]" />
            <span>Wiener-Khinchin Theorem Formulation</span>
          </div>
          <div className="p-2.5 bg-[#FAF9F6] rounded border border-[#E6E4DD] font-mono text-[11px]">
            <MathView
              math="S_{XX}(f) = \int_{-\infty}^{\infty} R_{XX}(\tau) e^{-j 2\pi f \tau} \, d\tau \iff R_{XX}(\tau) = \int_{-\infty}^{\infty} S_{XX}(f) e^{j 2\pi f \tau} \, df"
              displayMode={true}
            />
          </div>
          <p className="text-[#585651] leading-relaxed">
            For wide-sense stationary random processes, the power spectral density and autocorrelation function constitute an exact Fourier transform pair. Total signal power equals the area under the PSD curve: <MathView math="P_{\text{tot}} = \int_{-\infty}^\infty S_{XX}(f) df = R_{XX}(0)" />.
          </p>
        </div>

        <div className="p-4 bg-white rounded-lg border border-[#E6E4DD] shadow-2xs space-y-2">
          <div className="font-mono font-bold text-[#1A1917] flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-[#C85A32]" />
            <span>Engineering & Channel Insights</span>
          </div>
          <div className="space-y-1.5 text-[#585651] leading-relaxed">
            <div className="flex justify-between p-2 rounded bg-[#FAF9F6] border border-[#E6E4DD] font-mono text-[11px]">
              <span>Observed Peak Frequency:</span>
              <strong className="text-[#1A1917]">{peakFrequency.toFixed(2)} Hz</strong>
            </div>
            <div className="flex justify-between p-2 rounded bg-[#FAF9F6] border border-[#E6E4DD] font-mono text-[11px]">
              <span>Nyquist Bandwidth Limit:</span>
              <strong className="text-[#1A1917]">{totalBandwidth.toFixed(1)} Hz</strong>
            </div>
            <p className="text-[11px] text-[#75736E] pt-1">
              White noise exhibits flat PSD (<MathView math="N_0/2" />), bandlimited processes confine power inside designated transmission channels, and sinusoidal carriers show discrete spectral peaks at <MathView math="\pm f_0" />.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
