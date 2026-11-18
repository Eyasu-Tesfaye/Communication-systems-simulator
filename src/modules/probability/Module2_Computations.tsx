import React, { useState, useMemo, useRef } from 'react';
import {
  Calculator,
  Sliders,
  SlidersHorizontal,
  Sparkles,
  RotateCcw,
  PanelBottom,
  PanelTop,
  PanelLeft,
  PanelRight,
} from 'lucide-react';
import { MathView } from '../../components/MathView';
import {
  normalPdf,
  normalCdf,
  binomialPmf,
  binomialCdf,
  poissonPmf,
  poissonCdf,
  exponentialPdf,
  exponentialCdf,
  uniformContPdf,
  uniformContCdf,
  uniformDiscPmf,
  uniformDiscCdf,
} from './math';

type ComputationDist = 'normal' | 'binomial' | 'poisson' | 'exponential' | 'uniform';
type QueryOp = 'eq' | 'le' | 'lt' | 'ge' | 'gt' | 'between' | 'exterior';
type ControlsPosition = 'bottom' | 'top' | 'left' | 'right';

export const Module2_Computations: React.FC = () => {
  const [dist, setDist] = useState<ComputationDist>('normal');
  const [controlsPosition, setControlsPosition] = useState<ControlsPosition>('right');
  const [uniformMode, setUniformMode] = useState<'continuous' | 'discrete'>('continuous');

  // Parameters
  const [params, setParams] = useState<Record<string, number>>({
    mu: 0,
    sigma: 1,
    n: 16,
    p: 0.5,
    lambda: 4,
    a: -2,
    b: 2,
  });

  // Query engine bounds
  const [queryOp, setQueryOp] = useState<QueryOp>('le');
  const [boundX, setBoundX] = useState<number>(0);
  const [boundA, setBoundA] = useState<number>(-1);
  const [boundB, setBoundB] = useState<number>(1);

  const svgRef = useRef<SVGSVGElement>(null);

  const isDiscrete =
    dist === 'binomial' || dist === 'poisson' || (dist === 'uniform' && uniformMode === 'discrete');

  // Distribution evaluations
  const evalPdfPmf = (x: number) => {
    switch (dist) {
      case 'normal':
        return normalPdf(x, params.mu, params.sigma);
      case 'binomial':
        return binomialPmf(x, params.n, params.p);
      case 'poisson':
        return poissonPmf(x, params.lambda);
      case 'exponential':
        return exponentialPdf(x, params.lambda);
      case 'uniform':
        return uniformMode === 'continuous'
          ? uniformContPdf(x, params.a, params.b)
          : uniformDiscPmf(x, params.a, params.b);
    }
  };

  const evalCdf = (x: number) => {
    switch (dist) {
      case 'normal':
        return normalCdf(x, params.mu, params.sigma);
      case 'binomial':
        return binomialCdf(x, params.n, params.p);
      case 'poisson':
        return poissonCdf(x, params.lambda);
      case 'exponential':
        return exponentialCdf(x, params.lambda);
      case 'uniform':
        return uniformMode === 'continuous'
          ? uniformContCdf(x, params.a, params.b)
          : uniformDiscCdf(x, params.a, params.b);
    }
  };

  // Determine domain range
  const domain = useMemo(() => {
    switch (dist) {
      case 'normal':
        return { min: params.mu - 4 * params.sigma, max: params.mu + 4 * params.sigma };
      case 'binomial':
        return { min: -0.5, max: params.n + 0.5 };
      case 'poisson': {
        const top = Math.max(12, params.lambda + 4 * Math.sqrt(params.lambda));
        return { min: -0.5, max: top };
      }
      case 'exponential':
        return { min: -0.2, max: Math.max(4, 5 / params.lambda) };
      case 'uniform': {
        const span = Math.abs(params.b - params.a);
        return { min: params.a - span * 0.3, max: params.b + span * 0.3 };
      }
    }
  }, [dist, params, uniformMode]);

  // Check if x falls into selected query region
  const isInRegion = (x: number): boolean => {
    switch (queryOp) {
      case 'eq':
        return isDiscrete ? Math.round(x) === Math.round(boundX) : Math.abs(x - boundX) < 0.05;
      case 'le':
        return x <= boundX + 1e-5;
      case 'lt':
        return isDiscrete ? x < Math.round(boundX) : x < boundX;
      case 'ge':
        return x >= boundX - 1e-5;
      case 'gt':
        return isDiscrete ? x > Math.round(boundX) : x > boundX;
      case 'between': {
        const low = Math.min(boundA, boundB);
        const high = Math.max(boundA, boundB);
        return x >= low - 1e-5 && x <= high + 1e-5;
      }
      case 'exterior': {
        const low = Math.min(boundA, boundB);
        const high = Math.max(boundA, boundB);
        return x < low || x > high;
      }
    }
  };

  // Exact probability query computation
  const queryResult = useMemo(() => {
    let prob = 0;
    let latexLabel = '';

    const low = Math.min(boundA, boundB);
    const high = Math.max(boundA, boundB);

    switch (queryOp) {
      case 'eq':
        prob = isDiscrete ? evalPdfPmf(boundX) : 0;
        latexLabel = isDiscrete ? `P(X = ${Math.round(boundX)})` : `P(X = ${boundX.toFixed(2)}) = 0.0000`;
        break;
      case 'le':
        prob = evalCdf(boundX);
        latexLabel = `P(X \\le ${boundX.toFixed(isDiscrete ? 0 : 2)})`;
        break;
      case 'lt':
        prob = isDiscrete ? evalCdf(boundX - 1) : evalCdf(boundX);
        latexLabel = `P(X < ${boundX.toFixed(isDiscrete ? 0 : 2)})`;
        break;
      case 'ge':
        prob = isDiscrete ? 1 - evalCdf(boundX - 1) : 1 - evalCdf(boundX);
        latexLabel = `P(X \\ge ${boundX.toFixed(isDiscrete ? 0 : 2)})`;
        break;
      case 'gt':
        prob = 1 - evalCdf(boundX);
        latexLabel = `P(X > ${boundX.toFixed(isDiscrete ? 0 : 2)})`;
        break;
      case 'between': {
        const cdfHigh = evalCdf(high);
        const cdfLow = isDiscrete ? evalCdf(low - 1) : evalCdf(low);
        prob = Math.max(0, cdfHigh - cdfLow);
        latexLabel = `P(${low.toFixed(isDiscrete ? 0 : 2)} \\le X \\le ${high.toFixed(isDiscrete ? 0 : 2)})`;
        break;
      }
      case 'exterior': {
        const cdfLow = isDiscrete ? evalCdf(low - 1) : evalCdf(low);
        const cdfHigh = evalCdf(high);
        prob = Math.max(0, cdfLow + (1 - cdfHigh));
        latexLabel = `P(X < ${low.toFixed(isDiscrete ? 0 : 2)} \\text{ or } X > ${high.toFixed(isDiscrete ? 0 : 2)})`;
        break;
      }
    }

    return { prob: Math.max(0, Math.min(1, prob)), latexLabel };
  }, [queryOp, boundX, boundA, boundB, dist, params, uniformMode, isDiscrete]);

  // Click on SVG plot to set threshold boundX directly
  const handleSvgClick = (e: React.MouseEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const ctm = svg.getScreenCTM();
    let svgX: number;
    if (ctm) {
      const pt = svg.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      svgX = pt.matrixTransform(ctm.inverse()).x;
    } else {
      const rect = svg.getBoundingClientRect();
      svgX = ((e.clientX - rect.left) / rect.width) * svgWidth;
    }
    if (svgX >= pad.left && svgX <= pad.left + plotW) {
      const ratio = (svgX - pad.left) / plotW;
      const xVal = domain.min + ratio * (domain.max - domain.min);
      const rounded = isDiscrete ? Math.round(xVal) : parseFloat(xVal.toFixed(2));
      setBoundX(rounded);
    }
  };

  // SVG dimensions
  const svgWidth = 600;
  const svgHeight = 220;
  const pad = { top: 20, right: 30, bottom: 35, left: 50 };
  const plotW = svgWidth - pad.left - pad.right;
  const plotH = svgHeight - pad.top - pad.bottom;

  // Max peak for scaling
  const maxDensity = useMemo(() => {
    let peak = 0;
    const steps = 100;
    for (let i = 0; i <= steps; i++) {
      const x = domain.min + (i / steps) * (domain.max - domain.min);
      const y = evalPdfPmf(x);
      if (y > peak) peak = y;
    }
    return Math.max(0.1, peak * 1.15);
  }, [dist, params, domain, uniformMode]);

  const xToPx = (x: number) => pad.left + ((x - domain.min) / (domain.max - domain.min)) * plotW;
  const yToPx = (y: number) => pad.top + plotH - (y / maxDensity) * plotH;

  // Continuous curve SVG path & shaded path
  const continuousPaths = useMemo(() => {
    if (isDiscrete) return null;
    const steps = 200;
    const fullPts: string[] = [];
    const shadedSegments: string[] = [];

    let inShade = false;
    let shadePath = '';

    for (let i = 0; i <= steps; i++) {
      const x = domain.min + (i / steps) * (domain.max - domain.min);
      const y = evalPdfPmf(x);
      const px = xToPx(x);
      const py = yToPx(y);

      fullPts.push(`${i === 0 ? 'M' : 'L'} ${px.toFixed(1)} ${py.toFixed(1)}`);

      const shaded = isInRegion(x);
      if (shaded) {
        if (!inShade) {
          shadePath = `M ${px.toFixed(1)} ${yToPx(0)} L ${px.toFixed(1)} ${py.toFixed(1)}`;
          inShade = true;
        } else {
          shadePath += ` L ${px.toFixed(1)} ${py.toFixed(1)}`;
        }
      } else if (inShade) {
        shadePath += ` L ${px.toFixed(1)} ${yToPx(0)} Z`;
        shadedSegments.push(shadePath);
        inShade = false;
        shadePath = '';
      }
    }

    if (inShade) {
      shadePath += ` L ${xToPx(domain.max)} ${yToPx(0)} Z`;
      shadedSegments.push(shadePath);
    }

    return { fullPath: fullPts.join(' '), shadedSegments };
  }, [isDiscrete, dist, params, domain, queryOp, boundX, boundA, boundB]);

  // Discrete bars data
  const discreteBars = useMemo(() => {
    if (!isDiscrete) return null;
    const bars: Array<{ k: number; pmf: number; px: number; py: number; isShaded: boolean }> = [];
    const startK = Math.max(0, Math.floor(domain.min));
    const endK = Math.ceil(domain.max);

    for (let k = startK; k <= endK; k++) {
      const p = evalPdfPmf(k);
      bars.push({
        k,
        pmf: p,
        px: xToPx(k),
        py: yToPx(p),
        isShaded: isInRegion(k),
      });
    }
    return bars;
  }, [isDiscrete, dist, params, domain, queryOp, boundX, boundA, boundB]);

  return (
    <div className="space-y-6">
      {/* 1. Header & Layout Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E6E4DD]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FBF4F0] text-[#C85A32] border border-[#C85A32]/20">
              MODULE 02
            </span>
            <span className="text-xs font-semibold text-[#75736E] uppercase tracking-wider font-mono">
              Analytical Query Engine
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1917]">
            PMF, CDF & PDF Computations
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-[#585651]">
            Compute cumulative probabilities, survival tails, discrete point masses, and definite integrals.
          </p>
        </div>

        {/* Layout Position Switcher */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-[#75736E] font-mono">Layout:</span>
          <div
            role="group"
            aria-label="Controls layout position"
            className="inline-flex rounded-md border border-[#E6E4DD] p-0.5 bg-[#FAF9F6]"
          >
            {(
              [
                { id: 'bottom', label: 'Bottom', Icon: PanelBottom },
                { id: 'top', label: 'Top', Icon: PanelTop },
                { id: 'left', label: 'Left', Icon: PanelLeft },
                { id: 'right', label: 'Right', Icon: PanelRight },
              ] as const
            ).map(({ id, label, Icon }) => {
              const isActive = controlsPosition === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setControlsPosition(id)}
                  aria-pressed={isActive}
                  title={`Place controls on ${label.toLowerCase()}`}
                  className={`px-2 py-1 rounded text-[11px] font-mono flex items-center gap-1 font-semibold transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-white shadow-2xs text-[#C85A32] border border-[#E6E4DD]'
                      : 'text-[#75736E] hover:text-[#1A1917] border border-transparent'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Distribution Selection Ribbon */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-lg border border-[#E6E4DD] shadow-2xs">
        <span className="text-xs font-mono font-bold text-[#8A8882] uppercase tracking-wider pl-2 pr-1">
          Distribution:
        </span>
        {(
          [
            { id: 'normal', label: 'Normal (μ, σ)' },
            { id: 'binomial', label: 'Binomial (n, p)' },
            { id: 'poisson', label: 'Poisson (λ)' },
            { id: 'exponential', label: 'Exponential (λ)' },
            { id: 'uniform', label: 'Uniform (a, b)' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setDist(item.id);
              if (item.id === 'normal') {
                setBoundX(0);
                setBoundA(-1);
                setBoundB(1);
              } else if (item.id === 'binomial') {
                setBoundX(8);
                setBoundA(5);
                setBoundB(10);
              }
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer border ${
              dist === item.id
                ? 'bg-[#C85A32] text-white border-[#C85A32] shadow-2xs'
                : 'bg-[#FAF9F6] text-[#585651] border-[#E6E4DD] hover:bg-white hover:text-[#1A1917]'
            }`}
          >
            {item.label}
          </button>
        ))}

        {dist === 'uniform' && (
          <div className="ml-auto flex items-center gap-1 border-l border-[#E6E4DD] pl-3">
            <button
              type="button"
              onClick={() => setUniformMode('continuous')}
              className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer border ${
                uniformMode === 'continuous'
                  ? 'bg-[#1A1917] text-white border-[#1A1917]'
                  : 'bg-white text-[#585651] border-[#E6E4DD]'
              }`}
            >
              Continuous
            </button>
            <button
              type="button"
              onClick={() => setUniformMode('discrete')}
              className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer border ${
                uniformMode === 'discrete'
                  ? 'bg-[#1A1917] text-white border-[#1A1917]'
                  : 'bg-white text-[#585651] border-[#E6E4DD]'
              }`}
            >
              Discrete
            </button>
          </div>
        )}
      </div>

      {/* 3. Main Stage (4-Position Flexible Layout) */}
      <div
        className={
          controlsPosition === 'right'
            ? 'flex flex-col gap-5 lg:h-[calc(100vh-260px)] lg:min-h-[560px] lg:grid lg:grid-cols-[minmax(0,62fr)_minmax(0,38fr)] lg:overflow-hidden'
            : controlsPosition === 'left'
              ? 'flex flex-col gap-5 lg:h-[calc(100vh-260px)] lg:min-h-[560px] lg:grid lg:grid-cols-[minmax(0,38fr)_minmax(0,62fr)] lg:overflow-hidden'
              : 'flex flex-col gap-5'
        }
      >
        {/* Graph Display Area */}
        <div
          className={`min-w-0 ${
            controlsPosition === 'top'
              ? 'order-2'
              : controlsPosition === 'left'
                ? 'order-1 lg:order-2 lg:h-full lg:overflow-hidden'
                : controlsPosition === 'right'
                  ? 'order-1 lg:h-full lg:overflow-hidden'
                  : 'order-1'
          }`}
        >
          <div
            className={`bg-white rounded-lg border border-[#E6E4DD] shadow-xs ${
              controlsPosition === 'left' || controlsPosition === 'right'
                ? 'p-5 space-y-3 lg:h-full lg:flex lg:flex-col lg:overflow-hidden'
                : 'p-4 space-y-2.5'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-[#E6E4DD] shrink-0">
              <div>
                <h3 className="text-sm font-bold text-[#1A1917]">
                  Definite Integral & Probability Shading
                </h3>
                <span className="text-[11px] text-[#75736E] font-mono">
                  Click anywhere on the plot to snap threshold bound x
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-[#C85A32] bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/20 shrink-0">
                P = {queryResult.prob.toFixed(4)}
              </span>
            </div>

            {/* SVG Plot */}
            <div
              className={`relative w-full bg-[#FAF9F6] rounded-md border border-[#E6E4DD] select-none overflow-hidden ${
                controlsPosition === 'left' || controlsPosition === 'right'
                  ? 'h-64 lg:flex-1 lg:min-h-0'
                  : 'h-52'
              }`}
            >
              <svg
                ref={svgRef}
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                onClick={handleSvgClick}
                className="w-full h-full cursor-crosshair"
              >
                {/* Horizontal Baseline */}
                <line x1={pad.left} y1={pad.top + plotH} x2={pad.left + plotW} y2={pad.top + plotH} stroke="#8A8882" strokeWidth="1.5" />

                {/* Shaded Continuous Integrals */}
                {continuousPaths &&
                  continuousPaths.shadedSegments.map((dStr, idx) => (
                    <path key={idx} d={dStr} fill="rgba(200, 90, 50, 0.22)" />
                  ))}

                {/* Continuous Curve */}
                {continuousPaths && (
                  <path d={continuousPaths.fullPath} fill="none" stroke="#C85A32" strokeWidth="2.5" />
                )}

                {/* Discrete Bars */}
                {discreteBars &&
                  discreteBars.map((bar) => {
                    const barH = pad.top + plotH - bar.py;
                    const bW = Math.max(3, 400 / (domain.max - domain.min) / 2);
                    return (
                      <g key={bar.k}>
                        <rect
                          x={bar.px - bW / 2}
                          y={bar.py}
                          width={bW}
                          height={barH}
                          fill={bar.isShaded ? '#C85A32' : 'rgba(138, 136, 130, 0.25)'}
                          stroke={bar.isShaded ? '#B54E28' : '#8A8882'}
                          strokeWidth="1"
                        />
                      </g>
                    );
                  })}

                {/* Vertical Cutoff Guide Line */}
                {queryOp !== 'between' && queryOp !== 'exterior' && (
                  <line
                    x1={xToPx(boundX)}
                    y1={pad.top}
                    x2={xToPx(boundX)}
                    y2={pad.top + plotH}
                    stroke="#1A1917"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                )}

                {/* Ticks and values */}
                <text x={pad.left} y={pad.top + plotH + 16} fill="#75736E" fontSize="10" fontFamily="monospace" textAnchor="middle">
                  {domain.min.toFixed(1)}
                </text>
                <text x={pad.left + plotW} y={pad.top + plotH + 16} fill="#75736E" fontSize="10" fontFamily="monospace" textAnchor="middle">
                  {domain.max.toFixed(1)}
                </text>
              </svg>
            </div>
          </div>
        </div>

        {/* Controllers & Query Engine Area */}
        <div
          className={`min-w-0 ${
            controlsPosition === 'top'
              ? 'order-1 grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch'
              : controlsPosition === 'bottom'
                ? 'order-2 grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch'
                : controlsPosition === 'left'
                  ? 'order-2 lg:order-1 space-y-4 lg:h-full lg:overflow-y-auto lg:pr-1.5'
                  : 'order-2 space-y-4 lg:h-full lg:overflow-y-auto lg:pr-1.5'
          }`}
        >
          {/* EXACT IMAGE 1 PARAMETER CONTROLLING BAR */}
          <div className="p-4 sm:p-5 rounded-lg bg-[#FAF9F6] border border-[#E6E4DD] space-y-4">
            {/* Header with Title and Mode Indicator */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-[#E6E4DD]">
              <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#75736E] font-semibold">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#C85A32]" />
                <span>Distribution Parameters & Signal Controls</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Parameter Badge Capsule */}
                <div className="flex items-center bg-white p-0.5 rounded-md border border-[#E6E4DD] shadow-2xs">
                  {dist === 'normal' && (
                    <>
                      <span className="px-2 py-0.5 text-xs font-mono font-bold text-[#C85A32]">
                        μ = {params.mu.toFixed(1)}
                      </span>
                      <span className="text-[#8A8882] text-xs">·</span>
                      <span className="px-2 py-0.5 text-xs font-mono font-bold text-[#1A1917]">
                        σ = {params.sigma.toFixed(1)}
                      </span>
                    </>
                  )}
                  {dist === 'binomial' && (
                    <>
                      <span className="px-2 py-0.5 text-xs font-mono font-bold text-[#C85A32]">
                        n = {params.n}
                      </span>
                      <span className="text-[#8A8882] text-xs">·</span>
                      <span className="px-2 py-0.5 text-xs font-mono font-bold text-[#1A1917]">
                        p = {params.p.toFixed(2)}
                      </span>
                    </>
                  )}
                  {dist === 'poisson' && (
                    <span className="px-2 py-0.5 text-xs font-mono font-bold text-[#C85A32]">
                      λ = {params.lambda.toFixed(1)}
                    </span>
                  )}
                  {dist === 'exponential' && (
                    <span className="px-2 py-0.5 text-xs font-mono font-bold text-[#C85A32]">
                      λ = {params.lambda.toFixed(1)}
                    </span>
                  )}
                  {dist === 'uniform' && (
                    <>
                      <span className="px-2 py-0.5 text-xs font-mono font-bold text-[#C85A32]">
                        a = {params.a.toFixed(1)}
                      </span>
                      <span className="text-[#8A8882] text-xs">·</span>
                      <span className="px-2 py-0.5 text-xs font-mono font-bold text-[#1A1917]">
                        b = {params.b.toFixed(1)}
                      </span>
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (dist === 'normal') setParams((p) => ({ ...p, mu: 0, sigma: 1 }));
                    else if (dist === 'binomial') setParams((p) => ({ ...p, n: 16, p: 0.5 }));
                    else if (dist === 'poisson') setParams((p) => ({ ...p, lambda: 4 }));
                    else if (dist === 'exponential') setParams((p) => ({ ...p, lambda: 1 }));
                    else if (dist === 'uniform') setParams((p) => ({ ...p, a: -2, b: 2 }));
                  }}
                  className="px-2 py-1 text-xs font-mono text-[#75736E] hover:text-[#C85A32] hover:bg-white rounded border border-transparent hover:border-[#E6E4DD] flex items-center gap-1 cursor-pointer transition-colors"
                  title="Reset distribution defaults"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden sm:inline">Reset</span>
                </button>
              </div>
            </div>

            {/* Parameter Sliders Grid - matching Image 1 layout */}
            {dist === 'normal' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Mean mu */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-[#1A1917]">Mean (μ)</span>
                    <span className="font-mono text-[#C85A32] font-semibold">{params.mu.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="-10"
                    max="10"
                    step="0.1"
                    value={params.mu}
                    onChange={(e) => setParams((p) => ({ ...p, mu: parseFloat(e.target.value) }))}
                    className="w-full accent-[#C85A32] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
                    <span>-10.0</span>
                    <span className="font-semibold text-[#1A1917]">Center: {params.mu.toFixed(1)}</span>
                    <span>+10.0</span>
                  </div>
                </div>

                {/* Std Dev sigma */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-[#1A1917]">Std Dev (σ)</span>
                    <span className="font-mono text-[#C85A32] font-semibold">{params.sigma.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="8"
                    step="0.1"
                    value={params.sigma}
                    onChange={(e) => setParams((p) => ({ ...p, sigma: parseFloat(e.target.value) }))}
                    className="w-full accent-[#C85A32] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
                    <span>Sharp (0.2)</span>
                    <span className="font-semibold text-[#1A1917]">Spread: {params.sigma.toFixed(1)}</span>
                    <span>Diffuse (8.0)</span>
                  </div>
                </div>
              </div>
            )}

            {dist === 'binomial' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Trials n */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-[#1A1917]">Trials (n)</span>
                    <span className="font-mono text-[#C85A32] font-semibold">{params.n}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    step="1"
                    value={params.n}
                    onChange={(e) => setParams((p) => ({ ...p, n: parseInt(e.target.value, 10) }))}
                    className="w-full accent-[#C85A32] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
                    <span>n = 1</span>
                    <span className="font-semibold text-[#1A1917]">Mean: {(params.n * params.p).toFixed(1)}</span>
                    <span>n = 50</span>
                  </div>
                </div>

                {/* Probability p */}
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-[#1A1917]">Probability (p)</span>
                    <span className="font-mono text-[#C85A32] font-semibold">{params.p.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.01"
                    max="0.99"
                    step="0.01"
                    value={params.p}
                    onChange={(e) => setParams((p) => ({ ...p, p: parseFloat(e.target.value) }))}
                    className="w-full accent-[#C85A32] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
                    <span>0.01</span>
                    <span className="font-semibold text-[#1A1917]">{params.p < 0.5 ? 'Right-skewed' : params.p > 0.5 ? 'Left-skewed' : 'Symmetric'}</span>
                    <span>0.99</span>
                  </div>
                </div>
              </div>
            )}

            {dist === 'poisson' && (
              <div className="grid grid-cols-1 gap-3.5">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-[#1A1917]">Rate Parameter (λ)</span>
                    <span className="font-mono text-[#C85A32] font-semibold">{params.lambda.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="15"
                    step="0.2"
                    value={params.lambda}
                    onChange={(e) => setParams((p) => ({ ...p, lambda: parseFloat(e.target.value) }))}
                    className="w-full accent-[#C85A32] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
                    <span>Sparse arrivals (0.2)</span>
                    <span className="font-semibold text-[#1A1917]">μ = Var = {params.lambda.toFixed(1)}</span>
                    <span>Dense bursts (15.0)</span>
                  </div>
                </div>
              </div>
            )}

            {dist === 'exponential' && (
              <div className="grid grid-cols-1 gap-3.5">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-[#1A1917]">Decay Rate (λ)</span>
                    <span className="font-mono text-[#C85A32] font-semibold">{params.lambda.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="5"
                    step="0.1"
                    value={params.lambda}
                    onChange={(e) => setParams((p) => ({ ...p, lambda: parseFloat(e.target.value) }))}
                    className="w-full accent-[#C85A32] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
                    <span>Slow tail (0.2)</span>
                    <span className="font-semibold text-[#1A1917]">Mean lifetime = {(1 / params.lambda).toFixed(2)}s</span>
                    <span>Rapid decay (5.0)</span>
                  </div>
                </div>
              </div>
            )}

            {dist === 'uniform' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-[#1A1917]">Lower Bound (a)</span>
                    <span className="font-mono text-[#C85A32] font-semibold">{params.a.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="-15"
                    max={params.b - 0.5}
                    step="0.5"
                    value={params.a}
                    onChange={(e) => setParams((p) => ({ ...p, a: parseFloat(e.target.value) }))}
                    className="w-full accent-[#C85A32] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
                    <span>-15.0</span>
                    <span className="font-semibold text-[#1A1917]">Min: {params.a.toFixed(1)}</span>
                    <span>{(params.b - 0.5).toFixed(1)}</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-[#1A1917]">Upper Bound (b)</span>
                    <span className="font-mono text-[#C85A32] font-semibold">{params.b.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min={params.a + 0.5}
                    max="15"
                    step="0.5"
                    value={params.b}
                    onChange={(e) => setParams((p) => ({ ...p, b: parseFloat(e.target.value) }))}
                    className="w-full accent-[#C85A32] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
                    <span>{(params.a + 0.5).toFixed(1)}</span>
                    <span className="font-semibold text-[#1A1917]">Max: {params.b.toFixed(1)}</span>
                    <span>+15.0</span>
                  </div>
                </div>
              </div>
            )}

            {/* Presets Row - Exactly matching Image 1 */}
            <div className="pt-2 border-t border-[#E6E4DD]">
              <div className="flex flex-wrap items-center gap-1.5">
                <div className="flex items-center gap-1 text-xs text-[#75736E] font-mono mr-1">
                  <Sparkles className="w-3.5 h-3.5 text-[#C85A32]" />
                  <span>Presets:</span>
                </div>

                {dist === 'normal' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setParams((p) => ({ ...p, mu: 0, sigma: 1 }))}
                      className="px-2.5 py-1 text-xs font-mono bg-white hover:bg-[#F3F2EC] text-[#1A1917] border border-[#E6E4DD] rounded shadow-2xs cursor-pointer transition-colors"
                    >
                      Standard Normal (0, 1)
                    </button>
                    <button
                      type="button"
                      onClick={() => setParams((p) => ({ ...p, mu: 0, sigma: 0.5 }))}
                      className="px-2.5 py-1 text-xs font-mono bg-white hover:bg-[#F3F2EC] text-[#1A1917] border border-[#E6E4DD] rounded shadow-2xs cursor-pointer transition-colors"
                    >
                      Sharp Peak (0, 0.5)
                    </button>
                    <button
                      type="button"
                      onClick={() => setParams((p) => ({ ...p, mu: 5, sigma: 2 }))}
                      className="px-2.5 py-1 text-xs font-mono bg-white hover:bg-[#F3F2EC] text-[#1A1917] border border-[#E6E4DD] rounded shadow-2xs cursor-pointer transition-colors"
                    >
                      Offset (5, 2)
                    </button>
                  </>
                )}

                {dist === 'binomial' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setParams((p) => ({ ...p, n: 16, p: 0.5 }))}
                      className="px-2.5 py-1 text-xs font-mono bg-white hover:bg-[#F3F2EC] text-[#1A1917] border border-[#E6E4DD] rounded shadow-2xs cursor-pointer transition-colors"
                    >
                      Fair Coin (16, 0.5)
                    </button>
                    <button
                      type="button"
                      onClick={() => setParams((p) => ({ ...p, n: 30, p: 0.1 }))}
                      className="px-2.5 py-1 text-xs font-mono bg-white hover:bg-[#F3F2EC] text-[#1A1917] border border-[#E6E4DD] rounded shadow-2xs cursor-pointer transition-colors"
                    >
                      Rare Event (30, 0.1)
                    </button>
                    <button
                      type="button"
                      onClick={() => setParams((p) => ({ ...p, n: 24, p: 0.85 }))}
                      className="px-2.5 py-1 text-xs font-mono bg-white hover:bg-[#F3F2EC] text-[#1A1917] border border-[#E6E4DD] rounded shadow-2xs cursor-pointer transition-colors"
                    >
                      High Success (24, 0.85)
                    </button>
                  </>
                )}

                {dist === 'poisson' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setParams((p) => ({ ...p, lambda: 1 }))}
                      className="px-2.5 py-1 text-xs font-mono bg-white hover:bg-[#F3F2EC] text-[#1A1917] border border-[#E6E4DD] rounded shadow-2xs cursor-pointer transition-colors"
                    >
                      Rare / Low Rate (λ = 1)
                    </button>
                    <button
                      type="button"
                      onClick={() => setParams((p) => ({ ...p, lambda: 4 }))}
                      className="px-2.5 py-1 text-xs font-mono bg-white hover:bg-[#F3F2EC] text-[#1A1917] border border-[#E6E4DD] rounded shadow-2xs cursor-pointer transition-colors"
                    >
                      Medium (λ = 4)
                    </button>
                    <button
                      type="button"
                      onClick={() => setParams((p) => ({ ...p, lambda: 10 }))}
                      className="px-2.5 py-1 text-xs font-mono bg-white hover:bg-[#F3F2EC] text-[#1A1917] border border-[#E6E4DD] rounded shadow-2xs cursor-pointer transition-colors"
                    >
                      High Traffic (λ = 10)
                    </button>
                  </>
                )}

                {dist === 'exponential' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setParams((p) => ({ ...p, lambda: 1 }))}
                      className="px-2.5 py-1 text-xs font-mono bg-white hover:bg-[#F3F2EC] text-[#1A1917] border border-[#E6E4DD] rounded shadow-2xs cursor-pointer transition-colors"
                    >
                      Unit Decay (λ = 1)
                    </button>
                    <button
                      type="button"
                      onClick={() => setParams((p) => ({ ...p, lambda: 2.5 }))}
                      className="px-2.5 py-1 text-xs font-mono bg-white hover:bg-[#F3F2EC] text-[#1A1917] border border-[#E6E4DD] rounded shadow-2xs cursor-pointer transition-colors"
                    >
                      Rapid Decay (λ = 2.5)
                    </button>
                    <button
                      type="button"
                      onClick={() => setParams((p) => ({ ...p, lambda: 0.4 }))}
                      className="px-2.5 py-1 text-xs font-mono bg-white hover:bg-[#F3F2EC] text-[#1A1917] border border-[#E6E4DD] rounded shadow-2xs cursor-pointer transition-colors"
                    >
                      Long Lifetime (λ = 0.4)
                    </button>
                  </>
                )}

                {dist === 'uniform' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setParams((p) => ({ ...p, a: -2, b: 2 }))}
                      className="px-2.5 py-1 text-xs font-mono bg-white hover:bg-[#F3F2EC] text-[#1A1917] border border-[#E6E4DD] rounded shadow-2xs cursor-pointer transition-colors"
                    >
                      Symmetric [-2, 2]
                    </button>
                    <button
                      type="button"
                      onClick={() => setParams((p) => ({ ...p, a: 0, b: 1 }))}
                      className="px-2.5 py-1 text-xs font-mono bg-white hover:bg-[#F3F2EC] text-[#1A1917] border border-[#E6E4DD] rounded shadow-2xs cursor-pointer transition-colors"
                    >
                      Standard Unit [0, 1]
                    </button>
                    <button
                      type="button"
                      onClick={() => setParams((p) => ({ ...p, a: -5, b: 5 }))}
                      className="px-2.5 py-1 text-xs font-mono bg-white hover:bg-[#F3F2EC] text-[#1A1917] border border-[#E6E4DD] rounded shadow-2xs cursor-pointer transition-colors"
                    >
                      Wide [-5, 5]
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* EXACT IMAGE 1 QUERY ENGINE CONTROLS */}
          <div className="p-4 sm:p-5 rounded-lg bg-[#FAF9F6] border border-[#E6E4DD] space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-[#E6E4DD]">
              <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#75736E] font-semibold">
                <Calculator className="w-3.5 h-3.5 text-[#C85A32]" />
                <span>Analytical Query Engine & Bounds</span>
              </div>
            </div>

            {/* Operator Buttons */}
            <div>
              <div className="text-[11px] font-mono text-[#75736E] uppercase mb-1.5">
                Evaluation Operator:
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[11px] sm:text-xs font-mono">
                {[
                  { op: 'eq', label: 'P(X = x)' },
                  { op: 'le', label: 'P(X ≤ x)' },
                  { op: 'lt', label: 'P(X < x)' },
                  { op: 'ge', label: 'P(X ≥ x)' },
                  { op: 'gt', label: 'P(X > x)' },
                  { op: 'between', label: 'P(a ≤ X ≤ b)', span: 'sm:col-span-2' },
                  { op: 'exterior', label: 'Exterior' },
                ].map((item) => (
                  <button
                    key={item.op}
                    type="button"
                    onClick={() => setQueryOp(item.op as QueryOp)}
                    className={`py-1.5 px-1.5 sm:px-2 rounded-md text-center font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                      item.span ?? ''
                    } ${
                      queryOp === item.op
                        ? 'bg-[#C85A32] text-white border-[#C85A32] shadow-2xs'
                        : 'bg-white text-[#585651] border-[#E6E4DD] hover:text-[#1A1917]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cutoff Input Fields formatted cleanly like Image 1 */}
            {queryOp === 'between' || queryOp === 'exterior' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-[#1A1917]">Lower Bound (a)</span>
                    <span className="font-mono text-[#C85A32] font-semibold">{boundA.toFixed(isDiscrete ? 0 : 2)}</span>
                  </div>
                  <input
                    type="range"
                    min={domain.min}
                    max={domain.max}
                    step={isDiscrete ? '1' : '0.1'}
                    value={boundA}
                    onChange={(e) => setBoundA(parseFloat(e.target.value))}
                    className="w-full accent-[#C85A32] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
                    <span>{domain.min.toFixed(0)}</span>
                    <span className="font-semibold text-[#1A1917]">a = {boundA.toFixed(isDiscrete ? 0 : 2)}</span>
                    <span>{domain.max.toFixed(0)}</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-[#1A1917]">Upper Bound (b)</span>
                    <span className="font-mono text-[#C85A32] font-semibold">{boundB.toFixed(isDiscrete ? 0 : 2)}</span>
                  </div>
                  <input
                    type="range"
                    min={domain.min}
                    max={domain.max}
                    step={isDiscrete ? '1' : '0.1'}
                    value={boundB}
                    onChange={(e) => setBoundB(parseFloat(e.target.value))}
                    className="w-full accent-[#C85A32] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
                    <span>{domain.min.toFixed(0)}</span>
                    <span className="font-semibold text-[#1A1917]">b = {boundB.toFixed(isDiscrete ? 0 : 2)}</span>
                    <span>{domain.max.toFixed(0)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="pt-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-[#1A1917]">Cutoff Value Bound (x)</span>
                  <span className="font-mono text-[#C85A32] font-semibold">{boundX.toFixed(isDiscrete ? 0 : 2)}</span>
                </div>
                <input
                  type="range"
                  min={domain.min}
                  max={domain.max}
                  step={isDiscrete ? '1' : '0.1'}
                  value={boundX}
                  onChange={(e) => setBoundX(parseFloat(e.target.value))}
                  className="w-full accent-[#C85A32] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
                  <span>{domain.min.toFixed(0)}</span>
                  <span className="font-semibold text-[#1A1917]">Active Cutoff: {boundX.toFixed(isDiscrete ? 0 : 2)}</span>
                  <span>{domain.max.toFixed(0)}</span>
                </div>
              </div>
            )}

            {/* Result Display Banner */}
            <div className="p-3.5 bg-white rounded-md border border-[#C85A32]/30 flex items-center justify-between shadow-2xs">
              <div>
                <span className="text-[11px] font-mono text-[#C85A32] uppercase block font-semibold">
                  Probability Result
                </span>
                <span className="text-sm font-mono font-bold text-[#1A1917]">
                  <MathView math={queryResult.latexLabel} />
                </span>
                {!isDiscrete && queryOp === 'eq' && (
                  <span className="text-[11px] text-[#75736E] block mt-0.5">
                    Point probability is 0 for continuous PDFs
                  </span>
                )}
              </div>
              <div className="text-right">
                <span className="text-2xl font-mono font-extrabold text-[#C85A32]">
                  {queryResult.prob.toFixed(4)}
                </span>
                <span className="text-xs font-mono text-[#75736E] block">
                  ({(queryResult.prob * 100).toFixed(2)}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
