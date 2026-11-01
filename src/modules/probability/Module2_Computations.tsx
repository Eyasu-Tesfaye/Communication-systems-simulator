import React, { useState, useMemo, useRef } from 'react';
import {
  Calculator,
  Sliders,
  Grid,
  Columns,
  Rows,
  HelpCircle,
  Percent,
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
type LayoutMode = 'cockpit' | 'split';

export const Module2_Computations: React.FC = () => {
  const [dist, setDist] = useState<ComputationDist>('normal');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('split');
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

  // Hover state
  const [hoverPt, setHoverPt] = useState<{ x: number; y: number; cdf: number } | null>(null);
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
        latexLabel = isDiscrete ? `P(X = ${Math.round(boundX)})` : `P(X = ${boundX.toFixed(2)}) = 0`;
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
    const rect = svg.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const padLeft = 40;
    const padRight = 20;
    const plotW = rect.width - padLeft - padRight;
    if (clickX >= padLeft && clickX <= rect.width - padRight) {
      const ratio = (clickX - padLeft) / plotW;
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-200">
              MODULE 02
            </span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
              Analytical Query Engine
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            PMF, CDF & PDF Computations
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            Compute cumulative probabilities, survival tails, discrete point masses, and definite integrals.
          </p>
        </div>

        {/* Layout Mode Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-mono">Layout:</span>
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-[#fcfbf9]">
            <button
              type="button"
              onClick={() => setLayoutMode('split')}
              className={`p-1.5 rounded text-xs flex items-center gap-1 font-semibold transition-colors cursor-pointer ${
                layoutMode === 'split' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'
              }`}
              title="Split view (Side-by-side)"
            >
              <Columns className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Split</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('cockpit')}
              className={`p-1.5 rounded text-xs flex items-center gap-1 font-semibold transition-colors cursor-pointer ${
                layoutMode === 'cockpit' ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500'
              }`}
              title="Cockpit view (Controllers below graph)"
            >
              <Rows className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cockpit</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Distribution Selection Ribbon */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider pl-2 pr-1">
          Distribution:
        </span>
        {(
          [
            { id: 'normal', label: 'Normal (μ, σ)' },
            { id: 'binomial', label: 'Binomial (n, p)' },
            { id: 'poisson', label: 'Poisson (λ)' },
            { id: 'exponential', label: 'Exponential (λ)' },
            { id: 'uniform', label: 'Uniform' },
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
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
              dist === item.id
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                : 'bg-[#fcfbf9] text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {item.label}
          </button>
        ))}

        {dist === 'uniform' && (
          <div className="ml-auto flex items-center gap-1 border-l border-slate-200 pl-3">
            <button
              type="button"
              onClick={() => setUniformMode('continuous')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono cursor-pointer border ${
                uniformMode === 'continuous'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              Continuous
            </button>
            <button
              type="button"
              onClick={() => setUniformMode('discrete')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono cursor-pointer border ${
                uniformMode === 'discrete'
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200'
              }`}
            >
              Discrete
            </button>
          </div>
        )}
      </div>

      {/* 3. Main Stage (Split or Cockpit Layout) */}
      <div className={layoutMode === 'split' ? 'grid grid-cols-1 lg:grid-cols-12 gap-6' : 'space-y-6'}>
        {/* Graph Display Area */}
        <div className={layoutMode === 'split' ? 'lg:col-span-7 space-y-4' : 'space-y-4'}>
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Definite Integral & Probability Shading
                </h3>
                <span className="text-[11px] text-slate-500 font-mono">
                  Click anywhere on the plot to snap threshold bound x
                </span>
              </div>
              <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {queryResult.prob.toFixed(4)}
              </span>
            </div>

            {/* SVG Plot */}
            <div className="relative w-full h-64 bg-[#fcfbf9] rounded-xl border border-slate-200 select-none overflow-hidden">
              <svg
                ref={svgRef}
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                onClick={handleSvgClick}
                className="w-full h-full cursor-crosshair"
              >
                {/* Horizontal Baseline */}
                <line x1={pad.left} y1={pad.top + plotH} x2={pad.left + plotW} y2={pad.top + plotH} stroke="#94a3b8" strokeWidth="1.5" />

                {/* Shaded Continuous Integrals */}
                {continuousPaths &&
                  continuousPaths.shadedSegments.map((dStr, idx) => (
                    <path key={idx} d={dStr} fill="rgba(217, 119, 6, 0.3)" />
                  ))}

                {/* Continuous Curve */}
                {continuousPaths && (
                  <path d={continuousPaths.fullPath} fill="none" stroke="#d97706" strokeWidth="2.5" />
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
                          fill={bar.isShaded ? '#d97706' : 'rgba(148, 163, 184, 0.3)'}
                          stroke={bar.isShaded ? '#b45309' : '#94a3b8'}
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
                    stroke="#1e293b"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                )}

                {/* Ticks and values */}
                <text x={pad.left} y={pad.top + plotH + 16} fill="#64748b" fontSize="10" fontFamily="monospace" textAnchor="middle">
                  {domain.min.toFixed(1)}
                </text>
                <text x={pad.left + plotW} y={pad.top + plotH + 16} fill="#64748b" fontSize="10" fontFamily="monospace" textAnchor="middle">
                  {domain.max.toFixed(1)}
                </text>
              </svg>
            </div>
          </div>
        </div>

        {/* Controllers & Query Engine Area */}
        <div className={layoutMode === 'split' ? 'lg:col-span-5 space-y-4' : 'space-y-4'}>
          {/* Distribution Parameters Control Bar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">Distribution Parameter Bars</h3>
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
                className="text-[11px] font-mono text-slate-500 hover:text-amber-700 underline cursor-pointer"
              >
                Reset Default
              </button>
            </div>

            {/* Parameter Sliders depending on active distribution */}
            {dist === 'normal' && (
              <div className="space-y-3.5">
                {/* Mean mu */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 flex items-center gap-1.5">
                      Mean (<MathView math="\mu" />)
                    </span>
                    <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {params.mu.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setParams((p) => ({ ...p, mu: Math.max(-10, Math.round((p.mu - 0.5) * 10) / 10) }))}
                      className="px-2 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                    >
                      -0.5
                    </button>
                    <input
                      type="range"
                      min="-10"
                      max="10"
                      step="0.1"
                      value={params.mu}
                      onChange={(e) => setParams((p) => ({ ...p, mu: parseFloat(e.target.value) }))}
                      className="flex-1 accent-amber-600 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => setParams((p) => ({ ...p, mu: Math.min(10, Math.round((p.mu + 0.5) * 10) / 10) }))}
                      className="px-2 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                    >
                      +0.5
                    </button>
                  </div>
                </div>

                {/* Std Dev sigma */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 flex items-center gap-1.5">
                      Standard Deviation (<MathView math="\sigma" />)
                    </span>
                    <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {params.sigma.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setParams((p) => ({ ...p, sigma: Math.max(0.2, Math.round((p.sigma - 0.2) * 10) / 10) }))}
                      className="px-2 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                    >
                      -0.2
                    </button>
                    <input
                      type="range"
                      min="0.2"
                      max="8"
                      step="0.1"
                      value={params.sigma}
                      onChange={(e) => setParams((p) => ({ ...p, sigma: parseFloat(e.target.value) }))}
                      className="flex-1 accent-amber-600 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => setParams((p) => ({ ...p, sigma: Math.min(8, Math.round((p.sigma + 0.2) * 10) / 10) }))}
                      className="px-2 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                    >
                      +0.2
                    </button>
                  </div>
                </div>
              </div>
            )}

            {dist === 'binomial' && (
              <div className="space-y-3.5">
                {/* Number of trials n */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 flex items-center gap-1.5">
                      Trials (<MathView math="n" />)
                    </span>
                    <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {params.n}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setParams((p) => ({ ...p, n: Math.max(1, p.n - 1) }))}
                      className="px-2 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                    >
                      -1
                    </button>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      step="1"
                      value={params.n}
                      onChange={(e) => setParams((p) => ({ ...p, n: parseInt(e.target.value, 10) }))}
                      className="flex-1 accent-amber-600 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => setParams((p) => ({ ...p, n: Math.min(50, p.n + 1) }))}
                      className="px-2 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                    >
                      +1
                    </button>
                  </div>
                </div>

                {/* Success probability p */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 flex items-center gap-1.5">
                      Success Probability (<MathView math="p" />)
                    </span>
                    <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {params.p.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setParams((p) => ({ ...p, p: Math.max(0.01, Math.round((p.p - 0.05) * 100) / 100) }))}
                      className="px-2 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                    >
                      -0.05
                    </button>
                    <input
                      type="range"
                      min="0.01"
                      max="0.99"
                      step="0.01"
                      value={params.p}
                      onChange={(e) => setParams((p) => ({ ...p, p: parseFloat(e.target.value) }))}
                      className="flex-1 accent-amber-600 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => setParams((p) => ({ ...p, p: Math.min(0.99, Math.round((p.p + 0.05) * 100) / 100) }))}
                      className="px-2 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                    >
                      +0.05
                    </button>
                  </div>
                </div>
              </div>
            )}

            {dist === 'poisson' && (
              <div className="space-y-3.5">
                {/* Rate lambda */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 flex items-center gap-1.5">
                      Rate Parameter (<MathView math="\lambda" />)
                    </span>
                    <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {params.lambda.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setParams((p) => ({ ...p, lambda: Math.max(0.2, Math.round((p.lambda - 0.5) * 10) / 10) }))}
                      className="px-2 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                    >
                      -0.5
                    </button>
                    <input
                      type="range"
                      min="0.2"
                      max="20"
                      step="0.2"
                      value={params.lambda}
                      onChange={(e) => setParams((p) => ({ ...p, lambda: parseFloat(e.target.value) }))}
                      className="flex-1 accent-amber-600 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => setParams((p) => ({ ...p, lambda: Math.min(20, Math.round((p.lambda + 0.5) * 10) / 10) }))}
                      className="px-2 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                    >
                      +0.5
                    </button>
                  </div>
                </div>
              </div>
            )}

            {dist === 'exponential' && (
              <div className="space-y-3.5">
                {/* Rate lambda */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 flex items-center gap-1.5">
                      Decay / Rate (<MathView math="\lambda" />)
                    </span>
                    <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {params.lambda.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setParams((p) => ({ ...p, lambda: Math.max(0.1, Math.round((p.lambda - 0.2) * 10) / 10) }))}
                      className="px-2 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                    >
                      -0.2
                    </button>
                    <input
                      type="range"
                      min="0.1"
                      max="5"
                      step="0.05"
                      value={params.lambda}
                      onChange={(e) => setParams((p) => ({ ...p, lambda: parseFloat(e.target.value) }))}
                      className="flex-1 accent-amber-600 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => setParams((p) => ({ ...p, lambda: Math.min(5, Math.round((p.lambda + 0.2) * 10) / 10) }))}
                      className="px-2 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                    >
                      +0.2
                    </button>
                  </div>
                </div>
              </div>
            )}

            {dist === 'uniform' && (
              <div className="space-y-3.5">
                {/* Lower bound a */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 flex items-center gap-1.5">
                      Lower Bound (<MathView math="a" />)
                    </span>
                    <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {params.a.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setParams((p) => ({ ...p, a: Math.max(-15, Math.round((p.a - 1) * 10) / 10) }))}
                      className="px-2 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                    >
                      -1
                    </button>
                    <input
                      type="range"
                      min="-15"
                      max={params.b - 0.5}
                      step="0.5"
                      value={params.a}
                      onChange={(e) => setParams((p) => ({ ...p, a: parseFloat(e.target.value) }))}
                      className="flex-1 accent-amber-600 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => setParams((p) => ({ ...p, a: Math.min(params.b - 0.5, Math.round((p.a + 1) * 10) / 10) }))}
                      className="px-2 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                    >
                      +1
                    </button>
                  </div>
                </div>

                {/* Upper bound b */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 flex items-center gap-1.5">
                      Upper Bound (<MathView math="b" />)
                    </span>
                    <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      {params.b.toFixed(1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setParams((p) => ({ ...p, b: Math.max(params.a + 0.5, Math.round((p.b - 1) * 10) / 10) }))}
                      className="px-2 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                    >
                      -1
                    </button>
                    <input
                      type="range"
                      min={params.a + 0.5}
                      max="15"
                      step="0.5"
                      value={params.b}
                      onChange={(e) => setParams((p) => ({ ...p, b: parseFloat(e.target.value) }))}
                      className="flex-1 accent-amber-600 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => setParams((p) => ({ ...p, b: Math.min(15, Math.round((p.b + 1) * 10) / 10) }))}
                      className="px-2 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                    >
                      +1
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Query Formulation Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
              <Calculator className="w-4 h-4 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900">Query Engine</h3>
            </div>

            {/* Operator Buttons */}
            <div className="grid grid-cols-4 gap-1.5 text-xs font-mono">
              {[
                { op: 'eq', label: 'P(X = x)' },
                { op: 'le', label: 'P(X ≤ x)' },
                { op: 'lt', label: 'P(X < x)' },
                { op: 'ge', label: 'P(X ≥ x)' },
                { op: 'gt', label: 'P(X > x)' },
                { op: 'between', label: 'P(a ≤ X ≤ b)' },
                { op: 'exterior', label: 'Exterior' },
              ].map((item) => (
                <button
                  key={item.op}
                  type="button"
                  onClick={() => setQueryOp(item.op as QueryOp)}
                  className={`py-1.5 px-2 rounded-lg text-center font-semibold border transition-colors cursor-pointer ${
                    queryOp === item.op
                      ? 'bg-amber-600 text-white border-amber-600'
                      : 'bg-[#fcfbf9] text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {/* Cutoff Input Fields */}
            {queryOp === 'between' || queryOp === 'exterior' ? (
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span>Lower Bound (a)</span>
                    <span className="font-bold text-amber-700">{boundA.toFixed(isDiscrete ? 0 : 1)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setBoundA((v) => Math.round((v - (isDiscrete ? 1 : 0.5)) * 10) / 10)}
                      className="px-1.5 py-1 text-[11px] font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="range"
                      min={domain.min}
                      max={domain.max}
                      step={isDiscrete ? '1' : '0.1'}
                      value={boundA}
                      onChange={(e) => setBoundA(parseFloat(e.target.value))}
                      className="flex-1 accent-amber-600 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => setBoundA((v) => Math.round((v + (isDiscrete ? 1 : 0.5)) * 10) / 10)}
                      className="px-1.5 py-1 text-[11px] font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span>Upper Bound (b)</span>
                    <span className="font-bold text-amber-700">{boundB.toFixed(isDiscrete ? 0 : 1)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setBoundB((v) => Math.round((v - (isDiscrete ? 1 : 0.5)) * 10) / 10)}
                      className="px-1.5 py-1 text-[11px] font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="range"
                      min={domain.min}
                      max={domain.max}
                      step={isDiscrete ? '1' : '0.1'}
                      value={boundB}
                      onChange={(e) => setBoundB(parseFloat(e.target.value))}
                      className="flex-1 accent-amber-600 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => setBoundB((v) => Math.round((v + (isDiscrete ? 1 : 0.5)) * 10) / 10)}
                      className="px-1.5 py-1 text-[11px] font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-700">Cutoff Value Bound (x)</span>
                  <span className="font-mono text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {boundX.toFixed(isDiscrete ? 0 : 2)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBoundX((v) => Math.round((v - (isDiscrete ? 1 : 0.5)) * 10) / 10)}
                    className="px-2 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                  >
                    -{isDiscrete ? '1' : '0.5'}
                  </button>
                  <input
                    type="range"
                    min={domain.min}
                    max={domain.max}
                    step={isDiscrete ? '1' : '0.1'}
                    value={boundX}
                    onChange={(e) => setBoundX(parseFloat(e.target.value))}
                    className="flex-1 accent-amber-600 cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={() => setBoundX((v) => Math.round((v + (isDiscrete ? 1 : 0.5)) * 10) / 10)}
                    className="px-2 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                  >
                    +{isDiscrete ? '1' : '0.5'}
                  </button>
                </div>
              </div>
            )}

            {/* Result Display Banner */}
            <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50/50 rounded-xl border border-amber-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-mono text-amber-800 uppercase block font-semibold">
                  Probability Result
                </span>
                <span className="text-sm font-mono font-bold text-slate-900">
                  <MathView math={queryResult.latexLabel} />
                </span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-mono font-extrabold text-amber-700">
                  {queryResult.prob.toFixed(4)}
                </span>
                <span className="text-xs font-mono text-slate-500 block">
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
