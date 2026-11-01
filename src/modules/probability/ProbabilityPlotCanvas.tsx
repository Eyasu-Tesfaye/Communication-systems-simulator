import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import {
  DistributionType,
  DISTRIBUTIONS,
  evaluatePdfPmf,
  evaluateCdf,
  computeMoments,
} from './probabilityEngine';

export interface ShadedRegion {
  mode: 'less' | 'greater' | 'between' | 'point';
  val1: number; // e.g. x in P(X <= x) or a in P(a <= X <= b)
  val2: number; // e.g. b in P(a <= X <= b)
}

export type EmpiricalBins =
  | { type: 'discrete'; counts: Map<number, number>; total: number }
  | { type: 'continuous'; binCounts: number[]; binWidth: number; total: number; numBins: number };

export interface ProbabilityPlotCanvasProps {
  distType: DistributionType;
  params: Record<string, number>;
  plotMode: 'pmf_pdf' | 'cdf';
  shadedRegion?: ShadedRegion;
  empiricalSamples?: number[] | null;
  isGridVisible?: boolean;
  className?: string;
}

export const ProbabilityPlotCanvas: React.FC<ProbabilityPlotCanvasProps> = ({
  distType,
  params,
  plotMode,
  shadedRegion,
  empiricalSamples,
  isGridVisible = true,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoverInfo, setHoverInfo] = useState<{
    x: number;
    val: number;
    cdfVal: number;
    empiricalCount?: number;
    empiricalFreq?: number;
    clientX: number;
    clientY: number;
  } | null>(null);

  const distInfo = DISTRIBUTIONS[distType];
  const isDiscrete = distInfo.nature === 'discrete';
  const moments = useMemo(() => computeMoments(distType, params), [distType, params]);

  // Compute intelligent dynamic domain [xMin, xMax]
  const domain = useMemo(() => {
    switch (distType) {
      case 'normal': {
        const mu = params.mu ?? 0;
        const s = Math.max(0.1, params.sigma ?? 1);
        return { min: mu - 3.8 * s, max: mu + 3.8 * s };
      }
      case 'uniform_cont': {
        const a = params.a ?? -2;
        const b = params.b ?? 2;
        const span = Math.max(0.5, b - a);
        return { min: a - span * 0.25, max: b + span * 0.25 };
      }
      case 'exponential': {
        const lambda = Math.max(0.1, params.lambda ?? 1);
        const maxVal = Math.min(25, 4.5 / lambda);
        return { min: -0.2, max: Math.max(3, maxVal) };
      }
      case 'rayleigh': {
        const s = Math.max(0.2, params.sigma ?? 1);
        return { min: -0.2, max: Math.max(4, 3.8 * s) };
      }
      case 'binomial': {
        const n = Math.max(1, Math.round(params.n ?? 10));
        return { min: -0.5, max: n + 0.5 };
      }
      case 'poisson': {
        const lambda = Math.max(0.2, params.lambda ?? 3);
        const maxK = Math.max(8, Math.ceil(lambda + 3.8 * Math.sqrt(lambda)));
        return { min: -0.5, max: maxK + 0.5 };
      }
      case 'geometric': {
        const p = Math.max(0.05, params.p ?? 0.3);
        const maxK = Math.min(30, Math.ceil(4 / p));
        return { min: 0.5, max: maxK + 0.5 };
      }
      case 'uniform_disc': {
        const a = Math.round(params.a ?? 1);
        const b = Math.round(params.b ?? 6);
        return { min: a - 1.5, max: b + 1.5 };
      }
    }
  }, [distType, params]);

  // Monte Carlo Empirical Bins
  const empiricalBins = useMemo<EmpiricalBins | null>(() => {
    if (!empiricalSamples || empiricalSamples.length === 0) return null;
    const n = empiricalSamples.length;

    if (isDiscrete) {
      const counts = new Map<number, number>();
      for (let i = 0; i < n; i++) {
        const k = Math.round(empiricalSamples[i]);
        counts.set(k, (counts.get(k) || 0) + 1);
      }
      return { type: 'discrete', counts, total: n };
    } else {
      // Continuous: generate histogram bins across domain
      const numBins = Math.min(40, Math.max(15, Math.floor(Math.sqrt(n))));
      const binWidth = (domain.max - domain.min) / numBins;
      const binCounts = new Array(numBins).fill(0);

      for (let i = 0; i < n; i++) {
        const val = empiricalSamples[i];
        if (val >= domain.min && val <= domain.max) {
          const idx = Math.min(numBins - 1, Math.max(0, Math.floor((val - domain.min) / binWidth)));
          binCounts[idx]++;
        }
      }
      return { type: 'continuous', binCounts, binWidth, total: n, numBins };
    }
  }, [empiricalSamples, isDiscrete, domain]);

  // Main Canvas Render
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth;
    const height = container.clientHeight || 340;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Padding for axes & labels
    const pad = { top: 24, right: 30, bottom: 44, left: 56 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    if (plotW <= 0 || plotH <= 0) return;

    // Coordinate transforms
    const { min: xMin, max: xMax } = domain;
    const xToPx = (x: number) => pad.left + ((x - xMin) / (xMax - xMin)) * plotW;

    // Determine yMax
    let yMax = 0;
    if (plotMode === 'cdf') {
      yMax = 1.05;
    } else {
      if (isDiscrete) {
        const kStart = Math.max(0, Math.floor(xMin));
        const kEnd = Math.ceil(xMax);
        for (let k = kStart; k <= kEnd; k++) {
          const p = evaluatePdfPmf(distType, params, k);
          if (p > yMax) yMax = p;
        }
        if (empiricalBins && empiricalBins.type === 'discrete') {
          for (const count of empiricalBins.counts.values()) {
            const freq = count / empiricalBins.total;
            if (freq > yMax) yMax = freq;
          }
        }
      } else {
        const steps = 120;
        for (let i = 0; i <= steps; i++) {
          const x = xMin + (i / steps) * (xMax - xMin);
          const p = evaluatePdfPmf(distType, params, x);
          if (p > yMax) yMax = p;
        }
        if (empiricalBins && empiricalBins.type === 'continuous') {
          for (const count of empiricalBins.binCounts) {
            const density = count / (empiricalBins.total * empiricalBins.binWidth);
            if (density > yMax) yMax = density;
          }
        }
      }
      yMax = Math.max(0.1, yMax * 1.18);
    }

    const yToPx = (y: number) => pad.top + plotH - (y / yMax) * plotH;

    // Helper: is x in shaded region
    const isInShaded = (x: number) => {
      if (!shadedRegion) return false;
      const { mode, val1, val2 } = shadedRegion;
      if (mode === 'less') return x <= val1 + 1e-6;
      if (mode === 'greater') return x >= val1 - 1e-6;
      if (mode === 'between') return x >= Math.min(val1, val2) - 1e-6 && x <= Math.max(val1, val2) + 1e-6;
      if (mode === 'point') return Math.abs(x - val1) < 0.5;
      return false;
    };

    // 1. Draw Grid lines & background
    if (isGridVisible) {
      ctx.strokeStyle = '#F0EEE8';
      ctx.lineWidth = 1;

      // Horizontal grid
      const yTicks = plotMode === 'cdf' ? [0, 0.25, 0.5, 0.75, 1.0] : 5;
      const tickVals =
        Array.isArray(yTicks)
          ? yTicks
          : Array.from({ length: 5 }, (_, i) => (yMax / 4) * i);

      tickVals.forEach((yVal) => {
        const py = yToPx(yVal);
        ctx.beginPath();
        ctx.moveTo(pad.left, py);
        ctx.lineTo(pad.left + plotW, py);
        ctx.stroke();

        // Label
        ctx.fillStyle = '#8A8882';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(yVal.toFixed(yVal < 0.1 && yVal > 0 ? 3 : 2), pad.left - 8, py);
      });

      // Vertical grid
      const xRange = xMax - xMin;
      let xStep = xRange / 6;
      if (isDiscrete) {
        xStep = Math.max(1, Math.round(xStep));
      } else {
        const rawStep = xRange / 6;
        const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
        const normalized = rawStep / magnitude;
        const rounded = normalized > 5 ? 5 : normalized > 2 ? 2 : 1;
        xStep = rounded * magnitude;
      }

      const firstTick = Math.ceil(xMin / xStep) * xStep;
      for (let xVal = firstTick; xVal <= xMax; xVal += xStep) {
        const px = xToPx(xVal);
        ctx.beginPath();
        ctx.moveTo(px, pad.top);
        ctx.lineTo(px, pad.top + plotH);
        ctx.stroke();

        // Label
        ctx.fillStyle = '#8A8882';
        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(xVal.toFixed(isDiscrete ? 0 : 1), px, pad.top + plotH + 8);
      }
    }

    // 2. Draw Empirical Histogram if available
    if (empiricalBins && plotMode === 'pmf_pdf') {
      if (empiricalBins.type === 'discrete') {
        ctx.fillStyle = 'rgba(74, 107, 130, 0.28)';
        ctx.strokeStyle = '#4A6B82';
        ctx.lineWidth = 1;
        const colW = Math.max(8, Math.min(28, (plotW / (xMax - xMin)) * 0.65));

        for (const [k, count] of empiricalBins.counts.entries()) {
          if (k >= xMin - 1 && k <= xMax + 1) {
            const freq = count / empiricalBins.total;
            const px = xToPx(k);
            const py = yToPx(freq);
            const barH = pad.top + plotH - py;
            ctx.fillRect(px - colW / 2, py, colW, barH);
            ctx.strokeRect(px - colW / 2, py, colW, barH);
          }
        }
      } else if (empiricalBins.type === 'continuous') {
        const { binCounts, binWidth, total, numBins } = empiricalBins;
        ctx.fillStyle = 'rgba(74, 107, 130, 0.22)';
        ctx.strokeStyle = 'rgba(74, 107, 130, 0.6)';
        ctx.lineWidth = 1;

        for (let i = 0; i < numBins; i++) {
          const binStart = xMin + i * binWidth;
          const count = binCounts[i];
          const density = count / (total * binWidth);
          const pxStart = xToPx(binStart);
          const pxEnd = xToPx(binStart + binWidth);
          const py = yToPx(density);
          const barW = pxEnd - pxStart;
          const barH = pad.top + plotH - py;

          ctx.fillRect(pxStart, py, barW, barH);
          ctx.strokeRect(pxStart, py, barW, barH);
        }
      }
    }

    // 3. Draw Theoretical Function (PDF / PMF or CDF)
    if (plotMode === 'cdf') {
      // Cumulative Distribution Function
      if (isDiscrete) {
        // Step function for discrete CDF
        const kStart = Math.floor(xMin);
        const kEnd = Math.ceil(xMax);

        ctx.strokeStyle = '#C85A32';
        ctx.lineWidth = 2.5;

        for (let k = kStart; k <= kEnd; k++) {
          const cdfVal = evaluateCdf(distType, params, k);
          const nextCdf = evaluateCdf(distType, params, k + 1);
          const px1 = xToPx(k);
          const px2 = xToPx(k + 1);
          const py = yToPx(cdfVal);

          // Horizontal step segment
          ctx.beginPath();
          ctx.moveTo(px1, py);
          ctx.lineTo(px2, py);
          ctx.stroke();

          // Circle point on closed left interval
          ctx.beginPath();
          ctx.arc(px1, py, 3.5, 0, 2 * Math.PI);
          ctx.fillStyle = '#C85A32';
          ctx.fill();

          // Open circle on right endpoint before jump
          if (k < kEnd && nextCdf > cdfVal) {
            ctx.beginPath();
            ctx.arc(px2, py, 3, 0, 2 * Math.PI);
            ctx.fillStyle = '#FFFFFF';
            ctx.strokeStyle = '#C85A32';
            ctx.lineWidth = 1.5;
            ctx.fill();
            ctx.stroke();

            // Vertical dashed jump
            ctx.save();
            ctx.setLineDash([2, 3]);
            ctx.strokeStyle = 'rgba(200, 90, 50, 0.4)';
            ctx.beginPath();
            ctx.moveTo(px2, py);
            ctx.lineTo(px2, yToPx(nextCdf));
            ctx.stroke();
            ctx.restore();
          }
        }
      } else {
        // Continuous smooth CDF
        ctx.beginPath();
        const steps = 240;
        for (let i = 0; i <= steps; i++) {
          const x = xMin + (i / steps) * (xMax - xMin);
          const y = evaluateCdf(distType, params, x);
          const px = xToPx(x);
          const py = yToPx(y);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = '#C85A32';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
    } else {
      // PDF or PMF
      if (isDiscrete) {
        // Stem plot for discrete PMF
        const kStart = Math.max(0, Math.floor(xMin));
        const kEnd = Math.ceil(xMax);

        for (let k = kStart; k <= kEnd; k++) {
          const p = evaluatePdfPmf(distType, params, k);
          if (p <= 0 && (k < 0 || k > (params.n ?? 100))) continue;

          const px = xToPx(k);
          const py = yToPx(p);
          const basePy = yToPx(0);
          const isSelected = isInShaded(k);

          // Vertical stem line
          ctx.beginPath();
          ctx.moveTo(px, basePy);
          ctx.lineTo(px, py);
          ctx.strokeStyle = isSelected ? '#C85A32' : '#8A8882';
          ctx.lineWidth = isSelected ? 2.5 : 1.75;
          ctx.stroke();

          // Circle head
          ctx.beginPath();
          ctx.arc(px, py, isSelected ? 4.5 : 3.5, 0, 2 * Math.PI);
          ctx.fillStyle = isSelected ? '#C85A32' : '#FFFFFF';
          ctx.strokeStyle = isSelected ? '#B54E28' : '#585651';
          ctx.lineWidth = isSelected ? 2 : 1.5;
          ctx.fill();
          ctx.stroke();

          // Subtle number above spike if probability is notable
          if (p >= 0.04 && kEnd - kStart <= 22) {
            ctx.fillStyle = isSelected ? '#C85A32' : '#75736E';
            ctx.font = '9px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText(p.toFixed(2), px, py - 4);
          }
        }
      } else {
        // Continuous curve: First draw shaded region under curve if requested
        const steps = 300;

        if (shadedRegion) {
          ctx.beginPath();
          let inPath = false;

          for (let i = 0; i <= steps; i++) {
            const x = xMin + (i / steps) * (xMax - xMin);
            if (isInShaded(x)) {
              const px = xToPx(x);
              const py = yToPx(evaluatePdfPmf(distType, params, x));
              if (!inPath) {
                ctx.moveTo(px, yToPx(0));
                ctx.lineTo(px, py);
                inPath = true;
              } else {
                ctx.lineTo(px, py);
              }
            } else if (inPath) {
              const lastX = xToPx(x - (xMax - xMin) / steps);
              ctx.lineTo(lastX, yToPx(0));
              ctx.closePath();
              inPath = false;
            }
          }
          if (inPath) {
            ctx.lineTo(xToPx(xMax), yToPx(0));
            ctx.closePath();
          }

          // Warm terracotta translucent fill
          ctx.fillStyle = 'rgba(200, 90, 50, 0.22)';
          ctx.fill();
        }

        // Draw the full density curve
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const x = xMin + (i / steps) * (xMax - xMin);
          const y = evaluatePdfPmf(distType, params, x);
          const px = xToPx(x);
          const py = yToPx(y);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.strokeStyle = '#C85A32';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
    }

    // 4. Mean marker dashed line
    if (typeof moments.mean === 'number' && !isNaN(moments.mean)) {
      const muPx = xToPx(moments.mean);
      if (muPx >= pad.left && muPx <= pad.left + plotW) {
        ctx.save();
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#1A1917';
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.moveTo(muPx, pad.top);
        ctx.lineTo(muPx, pad.top + plotH);
        ctx.stroke();

        // Little μ pill label at top
        ctx.fillStyle = '#FAF9F6';
        ctx.strokeStyle = '#E6E4DD';
        ctx.lineWidth = 1;
        ctx.fillRect(muPx - 16, pad.top - 18, 32, 16);
        ctx.strokeRect(muPx - 16, pad.top - 18, 32, 16);

        ctx.fillStyle = '#1A1917';
        ctx.font = 'bold 9px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`μ=${moments.mean.toFixed(1)}`, muPx, pad.top - 10);
        ctx.restore();
      }
    }

    // 5. Draw Baseline & Axis Lines
    ctx.strokeStyle = '#1A1917';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top + plotH);
    ctx.lineTo(pad.left + plotW, pad.top + plotH);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, pad.top + plotH);
    ctx.stroke();

    // Axis Labels
    ctx.fillStyle = '#585651';
    ctx.font = '500 11px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Random Variable Value (x)', pad.left + plotW / 2, height - 8);

    ctx.save();
    ctx.translate(14, pad.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center';
    ctx.fillText(plotMode === 'cdf' ? 'Cumulative Probability F(x)' : isDiscrete ? 'Probability Mass P(X=k)' : 'Probability Density f(x)', 0, 0);
    ctx.restore();
  }, [distType, params, plotMode, shadedRegion, domain, empiricalBins, isGridVisible, isDiscrete, moments]);

  // Redraw on window resize or prop update
  useEffect(() => {
    render();
    const handleResize = () => render();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [render]);

  // Handle Hover Inspector
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const pad = { top: 24, right: 30, bottom: 44, left: 56 };
    const plotW = rect.width - pad.left - pad.right;

    if (mouseX < pad.left || mouseX > pad.left + plotW) {
      setHoverInfo(null);
      return;
    }

    const { min: xMin, max: xMax } = domain;
    let xVal = xMin + ((mouseX - pad.left) / plotW) * (xMax - xMin);

    if (isDiscrete) {
      xVal = Math.round(xVal);
    }

    const val = evaluatePdfPmf(distType, params, xVal);
    const cdfVal = evaluateCdf(distType, params, xVal);

    let empCount: number | undefined;
    let empFreq: number | undefined;

    if (empiricalBins) {
      const bins = empiricalBins;
      if (bins.type === 'discrete') {
        empCount = bins.counts.get(xVal) || 0;
        empFreq = empCount / bins.total;
      } else if (bins.type === 'continuous') {
        const idx = Math.min(
          bins.numBins - 1,
          Math.max(0, Math.floor((xVal - xMin) / bins.binWidth))
        );
        empCount = bins.binCounts[idx];
        empFreq = empCount / (bins.total * bins.binWidth);
      }
    }

    setHoverInfo({
      x: xVal,
      val,
      cdfVal,
      empiricalCount: empCount,
      empiricalFreq: empFreq,
      clientX: mouseX,
      clientY: e.clientY - rect.top,
    });
  };

  const handleMouseLeave = () => {
    setHoverInfo(null);
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative w-full h-80 sm:h-96 bg-white rounded-lg border border-[#E6E4DD] select-none ${className}`}
    >
      <canvas ref={canvasRef} className="block w-full h-full cursor-crosshair" />

      {/* Hover Inspection Tooltip */}
      {hoverInfo && (
        <div
          className="absolute z-20 pointer-events-none bg-[#1A1917] text-white text-xs rounded-md shadow-md py-1.5 px-2.5 font-mono border border-[#3E3C37]"
          style={{
            left: `${Math.min(Math.max(10, hoverInfo.clientX + 14), (containerRef.current?.clientWidth || 300) - 180)}px`,
            top: `${Math.max(10, hoverInfo.clientY - 60)}px`,
          }}
        >
          <div className="font-bold text-[#E6E4DD] border-b border-[#3E3C37] pb-1 mb-1 flex items-center justify-between gap-3">
            <span>x = {isDiscrete ? hoverInfo.x : hoverInfo.x.toFixed(2)}</span>
            <span className="text-[10px] text-[#C85A32]">
              {plotMode === 'cdf' ? 'CDF Point' : isDiscrete ? 'PMF Spike' : 'PDF Slice'}
            </span>
          </div>
          <div className="space-y-0.5 text-[11px]">
            <div className="flex justify-between gap-4">
              <span className="text-[#8A8882]">{isDiscrete ? 'P(X = k):' : 'f(x) Density:'}</span>
              <span className="text-white font-semibold">{hoverInfo.val.toFixed(4)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-[#8A8882]">F(x) = P(X ≤ x):</span>
              <span className="text-[#C85A32] font-semibold">{hoverInfo.cdfVal.toFixed(4)}</span>
            </div>
            {hoverInfo.empiricalCount !== undefined && (
              <div className="flex justify-between gap-4 pt-1 border-t border-[#3E3C37] text-[#90B2CC]">
                <span>Monte Carlo:</span>
                <span>
                  {hoverInfo.empiricalCount} pts ({((hoverInfo.empiricalFreq || 0) * 100).toFixed(1)}%)
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
