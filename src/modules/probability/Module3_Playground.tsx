import React, { useState, useMemo, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Sliders,
  Play,
  RotateCcw,
  Sparkles,
  BarChart3,
  TrendingUp,
  Layers,
  CheckCircle2,
  Columns,
  Rows,
} from 'lucide-react';
import { MathView } from '../../components/MathView';
import {
  CoreDistId,
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
  sampleDistributionSingle,
} from './math';

type ControllerPos = 'below' | 'right' | 'left';
type GraphDisplayMode = 'dual' | 'pdf' | 'cdf';

export const Module3_Playground: React.FC = () => {
  const [activeDist, setActiveDist] = useState<CoreDistId>('normal');
  const [uniformKind, setUniformKind] = useState<'continuous' | 'discrete'>('continuous');
  const [displayMode, setDisplayMode] = useState<GraphDisplayMode>('dual');
  const [controllerPos, setControllerPos] = useState<ControllerPos>('below');

  // Distribution parameters
  const [params, setParams] = useState<Record<string, number>>({
    mu: 0,
    sigma: 1,
    p_bern: 0.5,
    n_binom: 16,
    p_binom: 0.35,
    lambda_pois: 4,
    lambda_exp: 1,
    a_uni: -2,
    b_uni: 2,
  });

  // Cutoff Evaluator
  const [cutoffX, setCutoffX] = useState<number>(0);

  // Normal Empirical Rule
  const [empBand, setEmpBand] = useState<'none' | '68' | '95' | '99.7'>('none');

  // Monte Carlo samples
  const [samples, setSamples] = useState<number[]>([]);

  const isDiscrete =
    activeDist === 'bernoulli' ||
    activeDist === 'binomial' ||
    activeDist === 'poisson' ||
    (activeDist === 'uniform' && uniformKind === 'discrete');

  // Presets definition
  const applyPreset = (presetName: string) => {
    switch (presetName) {
      case 'bern_fair':
        setParams((prev) => ({ ...prev, p_bern: 0.5 }));
        break;
      case 'bern_roulette':
        setParams((prev) => ({ ...prev, p_bern: 18 / 37 }));
        break;
      case 'bern_rare':
        setParams((prev) => ({ ...prev, p_bern: 0.05 }));
        break;
      case 'binom_10':
        setParams((prev) => ({ ...prev, n_binom: 10, p_binom: 0.5 }));
        break;
      case 'binom_defect':
        setParams((prev) => ({ ...prev, n_binom: 50, p_binom: 0.04 }));
        break;
      case 'binom_qc':
        setParams((prev) => ({ ...prev, n_binom: 25, p_binom: 0.9 }));
        break;
      case 'pois_call':
        setParams((prev) => ({ ...prev, lambda_pois: 3 }));
        break;
      case 'pois_traffic':
        setParams((prev) => ({ ...prev, lambda_pois: 12 }));
        break;
      case 'exp_fast':
        setParams((prev) => ({ ...prev, lambda_exp: 1.8 }));
        break;
      case 'exp_halflife':
        setParams((prev) => ({ ...prev, lambda_exp: 0.15 }));
        break;
      case 'norm_iq':
        setParams((prev) => ({ ...prev, mu: 100, sigma: 15 }));
        setCutoffX(100);
        break;
      case 'norm_height':
        setParams((prev) => ({ ...prev, mu: 168, sigma: 7 }));
        setCutoffX(168);
        break;
      case 'norm_exam':
        setParams((prev) => ({ ...prev, mu: 75, sigma: 10 }));
        setCutoffX(75);
        break;
      case 'uni_die':
        setUniformKind('discrete');
        setParams((prev) => ({ ...prev, a_uni: 1, b_uni: 6 }));
        setCutoffX(3.5);
        break;
      case 'uni_wait':
        setUniformKind('continuous');
        setParams((prev) => ({ ...prev, a_uni: 0, b_uni: 15 }));
        setCutoffX(7.5);
        break;
    }
  };

  // Evaluate PDF/PMF
  const evalPdf = (x: number) => {
    switch (activeDist) {
      case 'bernoulli':
        return x === 1 ? params.p_bern : x === 0 ? 1 - params.p_bern : 0;
      case 'binomial':
        return binomialPmf(x, params.n_binom, params.p_binom);
      case 'poisson':
        return poissonPmf(x, params.lambda_pois);
      case 'exponential':
        return exponentialPdf(x, params.lambda_exp);
      case 'uniform':
        return uniformKind === 'continuous'
          ? uniformContPdf(x, params.a_uni, params.b_uni)
          : uniformDiscPmf(x, params.a_uni, params.b_uni);
      case 'normal':
        return normalPdf(x, params.mu, params.sigma);
    }
  };

  // Evaluate CDF
  const evalCdf = (x: number) => {
    switch (activeDist) {
      case 'bernoulli':
        return x < 0 ? 0 : x < 1 ? 1 - params.p_bern : 1;
      case 'binomial':
        return binomialCdf(x, params.n_binom, params.p_binom);
      case 'poisson':
        return poissonCdf(x, params.lambda_pois);
      case 'exponential':
        return exponentialCdf(x, params.lambda_exp);
      case 'uniform':
        return uniformKind === 'continuous'
          ? uniformContCdf(x, params.a_uni, params.b_uni)
          : uniformDiscCdf(x, params.a_uni, params.b_uni);
      case 'normal':
        return normalCdf(x, params.mu, params.sigma);
    }
  };

  // Theoretical moments
  const theoreticalMoments = useMemo(() => {
    switch (activeDist) {
      case 'bernoulli': {
        const p = params.p_bern;
        return { mean: p, variance: p * (1 - p), stdDev: Math.sqrt(p * (1 - p)) };
      }
      case 'binomial': {
        const n = params.n_binom;
        const p = params.p_binom;
        return { mean: n * p, variance: n * p * (1 - p), stdDev: Math.sqrt(n * p * (1 - p)) };
      }
      case 'poisson': {
        const l = params.lambda_pois;
        return { mean: l, variance: l, stdDev: Math.sqrt(l) };
      }
      case 'exponential': {
        const l = params.lambda_exp;
        return { mean: 1 / l, variance: 1 / (l * l), stdDev: 1 / l };
      }
      case 'uniform': {
        const a = params.a_uni;
        const b = params.b_uni;
        if (uniformKind === 'discrete') {
          const count = b - a + 1;
          const v = (count * count - 1) / 12;
          return { mean: (a + b) / 2, variance: v, stdDev: Math.sqrt(v) };
        }
        const v = Math.pow(b - a, 2) / 12;
        return { mean: (a + b) / 2, variance: v, stdDev: Math.sqrt(v) };
      }
      case 'normal': {
        return { mean: params.mu, variance: params.sigma * params.sigma, stdDev: params.sigma };
      }
    }
  }, [activeDist, params, uniformKind]);

  // Dynamic range domain
  const domain = useMemo(() => {
    switch (activeDist) {
      case 'bernoulli':
        return { min: -0.5, max: 1.5 };
      case 'binomial':
        return { min: -0.5, max: params.n_binom + 0.5 };
      case 'poisson': {
        const high = Math.max(10, params.lambda_pois + 3.8 * Math.sqrt(params.lambda_pois));
        return { min: -0.5, max: high };
      }
      case 'exponential':
        return { min: -0.2, max: Math.max(3, 4.5 / params.lambda_exp) };
      case 'uniform': {
        const span = Math.abs(params.b_uni - params.a_uni);
        return { min: params.a_uni - span * 0.25, max: params.b_uni + span * 0.25 };
      }
      case 'normal':
        return { min: params.mu - 3.8 * params.sigma, max: params.mu + 3.8 * params.sigma };
    }
  }, [activeDist, params, uniformKind]);

  // Simulation engine
  const addSamples = (count: number) => {
    const newItems = new Array(count);
    const paramObj: Record<string, number> =
      activeDist === 'bernoulli'
        ? { p: params.p_bern }
        : activeDist === 'binomial'
        ? { n: params.n_binom, p: params.p_binom }
        : activeDist === 'poisson'
        ? { lambda: params.lambda_pois }
        : activeDist === 'exponential'
        ? { lambda: params.lambda_exp }
        : activeDist === 'uniform'
        ? { a: params.a_uni, b: params.b_uni }
        : { mu: params.mu, sigma: params.sigma };

    for (let i = 0; i < count; i++) {
      newItems[i] = sampleDistributionSingle(activeDist, paramObj, uniformKind === 'discrete');
    }
    setSamples((prev) => [...prev, ...newItems]);

    // Confetti on large runs
    if (count >= 1000) {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.7 },
      });
    }
  };

  const clearSamples = () => setSamples([]);

  // Empirical stats
  const empiricalStats = useMemo(() => {
    if (samples.length === 0) return null;
    const n = samples.length;
    let sum = 0;
    for (const v of samples) sum += v;
    const mean = sum / n;
    let sumSq = 0;
    for (const v of samples) sumSq += Math.pow(v - mean, 2);
    const variance = n > 1 ? sumSq / (n - 1) : 0;
    return { mean, variance, stdDev: Math.sqrt(variance), n };
  }, [samples]);

  // Binned empirical counts for histogram overlay
  const empiricalBins = useMemo(() => {
    if (samples.length === 0) return null;
    const numBins = 28;
    const binW = (domain.max - domain.min) / numBins;
    const counts = new Array(numBins).fill(0);
    for (const v of samples) {
      if (v >= domain.min && v <= domain.max) {
        const idx = Math.min(numBins - 1, Math.max(0, Math.floor((v - domain.min) / binW)));
        counts[idx]++;
      }
    }
    return { counts, binW, total: samples.length };
  }, [samples, domain]);

  // SVG Chart Dimensions
  const svgW = 500;
  const svgH = 200;
  const pad = { top: 16, right: 24, bottom: 28, left: 40 };
  const plotW = svgW - pad.left - pad.right;
  const plotH = svgH - pad.top - pad.bottom;

  // Max PDF density
  const peakDensity = useMemo(() => {
    let top = 0;
    const steps = 100;
    for (let i = 0; i <= steps; i++) {
      const x = domain.min + (i / steps) * (domain.max - domain.min);
      const y = evalPdf(x);
      if (y > top) top = y;
    }
    return Math.max(0.1, top * 1.15);
  }, [domain, activeDist, params, uniformKind]);

  const xToPx = (x: number) => pad.left + ((x - domain.min) / (domain.max - domain.min)) * plotW;
  const yToPxDensity = (y: number) => pad.top + plotH - (y / peakDensity) * plotH;
  const yToPxCdf = (y: number) => pad.top + plotH - y * plotH;

  // Continuous SVG path
  const continuousPdfPath = useMemo(() => {
    if (isDiscrete) return null;
    const steps = 150;
    const pts: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const x = domain.min + (i / steps) * (domain.max - domain.min);
      const y = evalPdf(x);
      pts.push(`${i === 0 ? 'M' : 'L'} ${xToPx(x).toFixed(1)} ${yToPxDensity(y).toFixed(1)}`);
    }
    return pts.join(' ');
  }, [isDiscrete, domain, activeDist, params, uniformKind, peakDensity]);

  // Continuous CDF path
  const continuousCdfPath = useMemo(() => {
    if (isDiscrete) return null;
    const steps = 150;
    const pts: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const x = domain.min + (i / steps) * (domain.max - domain.min);
      const y = evalCdf(x);
      pts.push(`${i === 0 ? 'M' : 'L'} ${xToPx(x).toFixed(1)} ${yToPxCdf(y).toFixed(1)}`);
    }
    return pts.join(' ');
  }, [isDiscrete, domain, activeDist, params, uniformKind]);

  // Continuous Shaded Integral up to cutoffX
  const shadedPdfPath = useMemo(() => {
    if (isDiscrete) return null;
    const clampedX = Math.min(domain.max, Math.max(domain.min, cutoffX));
    const steps = 100;
    const pts: string[] = [];
    pts.push(`M ${xToPx(domain.min).toFixed(1)} ${pad.top + plotH}`);
    for (let i = 0; i <= steps; i++) {
      const x = domain.min + (i / steps) * (clampedX - domain.min);
      const y = evalPdf(x);
      pts.push(`L ${xToPx(x).toFixed(1)} ${yToPxDensity(y).toFixed(1)}`);
    }
    pts.push(`L ${xToPx(clampedX).toFixed(1)} ${pad.top + plotH} Z`);
    return pts.join(' ');
  }, [isDiscrete, domain, cutoffX, activeDist, params, uniformKind, peakDensity]);

  const renderParameterBars = () => (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-amber-600" />
          <h3 className="text-sm font-bold text-slate-900">Parameter Control Bars</h3>
        </div>
        <button
          type="button"
          onClick={() => {
            if (activeDist === 'bernoulli') setParams((p) => ({ ...p, p_bern: 0.5 }));
            else if (activeDist === 'binomial') setParams((p) => ({ ...p, n_binom: 16, p_binom: 0.35 }));
            else if (activeDist === 'poisson') setParams((p) => ({ ...p, lambda_pois: 4 }));
            else if (activeDist === 'exponential') setParams((p) => ({ ...p, lambda_exp: 1 }));
            else if (activeDist === 'uniform') setParams((p) => ({ ...p, a_uni: -2, b_uni: 2 }));
            else if (activeDist === 'normal') setParams((p) => ({ ...p, mu: 0, sigma: 1 }));
          }}
          className="text-[11px] font-mono text-slate-500 hover:text-amber-700 underline cursor-pointer"
        >
          Reset Default
        </button>
      </div>

      {/* Distribution Specific Slider Bars */}
      {activeDist === 'bernoulli' && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-700">Success Probability (p)</span>
            <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              {params.p_bern.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setParams((p) => ({ ...p, p_bern: Math.max(0, Math.round((p.p_bern - 0.05) * 100) / 100) }))}
              className="px-2 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
            >
              -0.05
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={params.p_bern}
              onChange={(e) => setParams((p) => ({ ...p, p_bern: parseFloat(e.target.value) }))}
              className="flex-1 accent-amber-600 cursor-pointer"
            />
            <button
              type="button"
              onClick={() => setParams((p) => ({ ...p, p_bern: Math.min(1, Math.round((p.p_bern + 0.05) * 100) / 100) }))}
              className="px-2 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
            >
              +0.05
            </button>
          </div>
        </div>
      )}

      {activeDist === 'binomial' && (
        <div className="space-y-3.5">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">Number of Trials (n)</span>
              <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {params.n_binom}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setParams((p) => ({ ...p, n_binom: Math.max(1, p.n_binom - 1) }))}
                className="px-2 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
              >
                -1
              </button>
              <input
                type="range"
                min="1"
                max="60"
                step="1"
                value={params.n_binom}
                onChange={(e) => setParams((p) => ({ ...p, n_binom: parseInt(e.target.value, 10) }))}
                className="flex-1 accent-amber-600 cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setParams((p) => ({ ...p, n_binom: Math.min(60, p.n_binom + 1) }))}
                className="px-2 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
              >
                +1
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">Success Probability (p)</span>
              <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {params.p_binom.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setParams((p) => ({ ...p, p_binom: Math.max(0.01, Math.round((p.p_binom - 0.05) * 100) / 100) }))}
                className="px-2 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
              >
                -0.05
              </button>
              <input
                type="range"
                min="0.01"
                max="0.99"
                step="0.01"
                value={params.p_binom}
                onChange={(e) => setParams((p) => ({ ...p, p_binom: parseFloat(e.target.value) }))}
                className="flex-1 accent-amber-600 cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setParams((p) => ({ ...p, p_binom: Math.min(0.99, Math.round((p.p_binom + 0.05) * 100) / 100) }))}
                className="px-2 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
              >
                +0.05
              </button>
            </div>
          </div>
        </div>
      )}

      {activeDist === 'poisson' && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-700">Rate Parameter (λ)</span>
            <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              {params.lambda_pois.toFixed(1)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setParams((p) => ({ ...p, lambda_pois: Math.max(0.2, Math.round((p.lambda_pois - 0.5) * 10) / 10) }))}
              className="px-2 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
            >
              -0.5
            </button>
            <input
              type="range"
              min="0.2"
              max="25"
              step="0.2"
              value={params.lambda_pois}
              onChange={(e) => setParams((p) => ({ ...p, lambda_pois: parseFloat(e.target.value) }))}
              className="flex-1 accent-amber-600 cursor-pointer"
            />
            <button
              type="button"
              onClick={() => setParams((p) => ({ ...p, lambda_pois: Math.min(25, Math.round((p.lambda_pois + 0.5) * 10) / 10) }))}
              className="px-2 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
            >
              +0.5
            </button>
          </div>
        </div>
      )}

      {activeDist === 'exponential' && (
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-700">Rate Parameter (λ)</span>
            <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              {params.lambda_exp.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setParams((p) => ({ ...p, lambda_exp: Math.max(0.05, Math.round((p.lambda_exp - 0.1) * 100) / 100) }))}
              className="px-2 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
            >
              -0.1
            </button>
            <input
              type="range"
              min="0.05"
              max="5"
              step="0.05"
              value={params.lambda_exp}
              onChange={(e) => setParams((p) => ({ ...p, lambda_exp: parseFloat(e.target.value) }))}
              className="flex-1 accent-amber-600 cursor-pointer"
            />
            <button
              type="button"
              onClick={() => setParams((p) => ({ ...p, lambda_exp: Math.min(5, Math.round((p.lambda_exp + 0.1) * 100) / 100) }))}
              className="px-2 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
            >
              +0.1
            </button>
          </div>
        </div>
      )}

      {activeDist === 'uniform' && (
        <div className="space-y-3.5">
          <div className="flex items-center justify-between pb-1 border-b border-slate-100">
            <span className="text-xs text-slate-600">Distribution Type</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setUniformKind('continuous')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer border ${
                  uniformKind === 'continuous' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                Continuous
              </button>
              <button
                type="button"
                onClick={() => setUniformKind('discrete')}
                className={`px-2 py-0.5 rounded text-[11px] font-mono cursor-pointer border ${
                  uniformKind === 'discrete' ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                Discrete
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">Lower Bound (a)</span>
              <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {params.a_uni.toFixed(1)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setParams((p) => ({ ...p, a_uni: Math.max(-20, Math.round((p.a_uni - 1) * 10) / 10) }))}
                className="px-2 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
              >
                -1
              </button>
              <input
                type="range"
                min="-20"
                max={params.b_uni - 0.5}
                step="0.5"
                value={params.a_uni}
                onChange={(e) => setParams((p) => ({ ...p, a_uni: parseFloat(e.target.value) }))}
                className="flex-1 accent-amber-600 cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setParams((p) => ({ ...p, a_uni: Math.min(params.b_uni - 0.5, Math.round((p.a_uni + 1) * 10) / 10) }))}
                className="px-2 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
              >
                +1
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">Upper Bound (b)</span>
              <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {params.b_uni.toFixed(1)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setParams((p) => ({ ...p, b_uni: Math.max(params.a_uni + 0.5, Math.round((p.b_uni - 1) * 10) / 10) }))}
                className="px-2 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
              >
                -1
              </button>
              <input
                type="range"
                min={params.a_uni + 0.5}
                max="20"
                step="0.5"
                value={params.b_uni}
                onChange={(e) => setParams((p) => ({ ...p, b_uni: parseFloat(e.target.value) }))}
                className="flex-1 accent-amber-600 cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setParams((p) => ({ ...p, b_uni: Math.min(20, Math.round((p.b_uni + 1) * 10) / 10) }))}
                className="px-2 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
              >
                +1
              </button>
            </div>
          </div>
        </div>
      )}

      {activeDist === 'normal' && (
        <div className="space-y-3.5">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">Mean (μ)</span>
              <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                {params.mu.toFixed(1)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setParams((p) => ({ ...p, mu: Math.max(-20, Math.round((p.mu - 0.5) * 10) / 10) }))}
                className="px-2 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
              >
                -0.5
              </button>
              <input
                type="range"
                min="-20"
                max="20"
                step="0.2"
                value={params.mu}
                onChange={(e) => setParams((p) => ({ ...p, mu: parseFloat(e.target.value) }))}
                className="flex-1 accent-amber-600 cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setParams((p) => ({ ...p, mu: Math.min(20, Math.round((p.mu + 0.5) * 10) / 10) }))}
                className="px-2 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
              >
                +0.5
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">Standard Deviation (σ)</span>
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
                max="10"
                step="0.1"
                value={params.sigma}
                onChange={(e) => setParams((p) => ({ ...p, sigma: parseFloat(e.target.value) }))}
                className="flex-1 accent-amber-600 cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setParams((p) => ({ ...p, sigma: Math.min(10, Math.round((p.sigma + 0.2) * 10) / 10) }))}
                className="px-2 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
              >
                +0.2
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Live Cutoff Evaluator Scrub Bar */}
      <div className="pt-3 border-t border-slate-100 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-800 flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
            <span>Interactive Cutoff Scrubber (x)</span>
          </span>
          <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            x = {cutoffX.toFixed(isDiscrete ? 0 : 2)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCutoffX((v) => Math.round((v - (isDiscrete ? 1 : 0.5)) * 10) / 10)}
            className="px-2 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
          >
            -{isDiscrete ? '1' : '0.5'}
          </button>
          <input
            type="range"
            min={domain.min}
            max={domain.max}
            step={isDiscrete ? '1' : '0.1'}
            value={cutoffX}
            onChange={(e) => setCutoffX(parseFloat(e.target.value))}
            className="flex-1 accent-amber-600 cursor-pointer"
          />
          <button
            type="button"
            onClick={() => setCutoffX((v) => Math.round((v + (isDiscrete ? 1 : 0.5)) * 10) / 10)}
            className="px-2 py-1 text-xs font-mono bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
          >
            +{isDiscrete ? '1' : '0.5'}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-100">
          <div className="bg-[#fcfbf9] p-2 rounded-lg border border-slate-200 text-center">
            <span className="text-[10px] font-mono text-slate-500 uppercase block">CDF F(x) = P(X ≤ x)</span>
            <span className="text-sm font-mono font-extrabold text-amber-700">
              {evalCdf(cutoffX).toFixed(4)}
            </span>
          </div>
          <div className="bg-[#fcfbf9] p-2 rounded-lg border border-slate-200 text-center">
            <span className="text-[10px] font-mono text-slate-500 uppercase block">Survival P(X &gt; x)</span>
            <span className="text-sm font-mono font-extrabold text-slate-800">
              {(1 - evalCdf(cutoffX)).toFixed(4)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCharts = () => (
    <div className={`grid gap-6 ${displayMode === 'dual' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
      {/* Graph 1: Density / PMF */}
      {(displayMode === 'dual' || displayMode === 'pdf') && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">
              {isDiscrete ? 'Probability Mass Function (PMF)' : 'Probability Density Function (PDF)'}
            </h3>
            <span className="text-xs font-mono text-slate-500">
              μ = {theoreticalMoments.mean.toFixed(2)} · σ = {theoreticalMoments.stdDev.toFixed(2)}
            </span>
          </div>

          <div className="relative w-full h-56 bg-[#fcfbf9] rounded-xl border border-slate-200 overflow-hidden">
            <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-full">
              {/* Baseline */}
              <line x1={pad.left} y1={pad.top + plotH} x2={pad.left + plotW} y2={pad.top + plotH} stroke="#94a3b8" strokeWidth="1.5" />

              {/* Empirical Histogram Bars if present */}
              {empiricalBins &&
                empiricalBins.counts.map((count, idx) => {
                  if (count === 0) return null;
                  const freq = count / (empiricalBins.total * empiricalBins.binW);
                  const bStart = domain.min + idx * empiricalBins.binW;
                  const px = xToPx(bStart);
                  const py = yToPxDensity(freq);
                  const bW = (empiricalBins.binW / (domain.max - domain.min)) * plotW;
                  const bH = pad.top + plotH - py;
                  return (
                    <rect
                      key={idx}
                      x={px}
                      y={py}
                      width={Math.max(1, bW - 1)}
                      height={bH}
                      fill="rgba(74, 107, 130, 0.3)"
                      stroke="#4a6b82"
                      strokeWidth="0.75"
                    />
                  );
                })}

              {/* Shaded Integral up to cutoffX */}
              {shadedPdfPath && (
                <path d={shadedPdfPath} fill="rgba(217, 119, 6, 0.3)" />
              )}

              {/* Continuous Curve */}
              {continuousPdfPath && (
                <path d={continuousPdfPath} fill="none" stroke="#d97706" strokeWidth="2.5" />
              )}

              {/* Discrete Stems */}
              {isDiscrete &&
                Array.from({ length: Math.ceil(domain.max - domain.min + 1) }, (_, i) => {
                  const k = Math.floor(domain.min) + i;
                  const p = evalPdf(k);
                  if (p <= 0) return null;
                  const px = xToPx(k);
                  const py = yToPxDensity(p);
                  const isHighlighted = k <= cutoffX;
                  return (
                    <g key={k}>
                      <line
                        x1={px}
                        y1={pad.top + plotH}
                        x2={px}
                        y2={py}
                        stroke={isHighlighted ? '#b45309' : '#d97706'}
                        strokeWidth={isHighlighted ? '2.5' : '1.75'}
                      />
                      <circle
                        cx={px}
                        cy={py}
                        r={isHighlighted ? '4.5' : '3.5'}
                        fill={isHighlighted ? '#b45309' : '#d97706'}
                      />
                    </g>
                  );
                })}

              {/* Cutoff Indicator Line */}
              <line
                x1={xToPx(cutoffX)}
                y1={pad.top}
                x2={xToPx(cutoffX)}
                y2={pad.top + plotH}
                stroke="#b45309"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <circle cx={xToPx(cutoffX)} cy={pad.top + plotH} r="3.5" fill="#b45309" />
              <text
                x={xToPx(cutoffX)}
                y={pad.top + 12}
                fill="#b45309"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
                textAnchor="middle"
              >
                x={cutoffX.toFixed(isDiscrete ? 0 : 1)}
              </text>

              {/* Mean Line */}
              <line
                x1={xToPx(theoreticalMoments.mean)}
                y1={pad.top}
                x2={xToPx(theoreticalMoments.mean)}
                y2={pad.top + plotH}
                stroke="#1e293b"
                strokeWidth="1.5"
                strokeDasharray="4 4"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Graph 2: Cumulative Distribution Function (CDF) */}
      {(displayMode === 'dual' || displayMode === 'cdf') && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">Cumulative Distribution Function (CDF)</h3>
            <span className="text-xs font-mono text-slate-500">F(x) = P(X ≤ x)</span>
          </div>

          <div className="relative w-full h-56 bg-[#fcfbf9] rounded-xl border border-slate-200 overflow-hidden">
            <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-full">
              {/* Horizontal Baseline & Top Asymptote 1.00 */}
              <line x1={pad.left} y1={pad.top + plotH} x2={pad.left + plotW} y2={pad.top + plotH} stroke="#94a3b8" strokeWidth="1.5" />
              <line x1={pad.left} y1={pad.top} x2={pad.left + plotW} y2={pad.top} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="3 3" />
              <line x1={pad.left} y1={yToPxCdf(0.5)} x2={pad.left + plotW} y2={yToPxCdf(0.5)} stroke="#e2e8f0" strokeWidth="1" strokeDasharray="2 2" />

              {/* Continuous Curve */}
              {continuousCdfPath && (
                <path d={continuousCdfPath} fill="none" stroke="#d97706" strokeWidth="2.5" />
              )}

              {/* Discrete Staircase CDF */}
              {isDiscrete &&
                Array.from({ length: Math.ceil(domain.max - domain.min + 1) }, (_, i) => {
                  const k = Math.floor(domain.min) + i;
                  const cdfVal = evalCdf(k);
                  const px1 = xToPx(k);
                  const px2 = xToPx(k + 1);
                  const py = yToPxCdf(cdfVal);
                  return (
                    <g key={k}>
                      <line x1={px1} y1={py} x2={px2} y2={py} stroke="#d97706" strokeWidth="2" />
                      <circle cx={px1} cy={py} r="3" fill="#d97706" />
                    </g>
                  );
                })}

              {/* Cutoff Indicator Lines & Dot on CDF */}
              <line
                x1={xToPx(cutoffX)}
                y1={pad.top}
                x2={xToPx(cutoffX)}
                y2={pad.top + plotH}
                stroke="#b45309"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <line
                x1={pad.left}
                y1={yToPxCdf(evalCdf(cutoffX))}
                x2={xToPx(cutoffX)}
                y2={yToPxCdf(evalCdf(cutoffX))}
                stroke="#b45309"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <circle
                cx={xToPx(cutoffX)}
                cy={yToPxCdf(evalCdf(cutoffX))}
                r="5"
                fill="#d97706"
                stroke="#ffffff"
                strokeWidth="2"
              />
              <text
                x={pad.left + 8}
                y={Math.max(pad.top + 12, yToPxCdf(evalCdf(cutoffX)) - 5)}
                fill="#b45309"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="bold"
              >
                F(x) = {evalCdf(cutoffX).toFixed(3)}
              </text>
            </svg>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 1. Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-200">
              MODULE 03
            </span>
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
              Distribution Playground
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            6 Core Distributions & CDF Workbench
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-600">
            Explore continuous and discrete distributions, dual-view CDF & PDF representations, and live Monte Carlo empirical sampling.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Controller Position Toggle */}
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-[#fcfbf9] text-xs font-semibold">
            {(['below', 'left', 'right'] as const).map((pos) => (
              <button
                key={pos}
                type="button"
                onClick={() => setControllerPos(pos)}
                className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer capitalize text-[11px] font-mono ${
                  controllerPos === pos ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {pos === 'below' ? 'Bars: Below' : pos === 'left' ? 'Bars: Left' : 'Bars: Right'}
              </button>
            ))}
          </div>

          {/* View Mode Toggle */}
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-[#fcfbf9] text-xs font-semibold">
            {(['dual', 'pdf', 'cdf'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setDisplayMode(mode)}
                className={`px-3 py-1 rounded-md transition-colors cursor-pointer capitalize ${
                  displayMode === mode ? 'bg-white shadow-xs text-slate-900' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {mode === 'dual' ? 'Dual View' : mode === 'pdf' ? 'PDF/PMF Only' : 'CDF Only'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Top Distribution Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-2xl border border-slate-200 shadow-xs">
        {(
          [
            { id: 'bernoulli', label: 'Bernoulli (p)' },
            { id: 'binomial', label: 'Binomial (n, p)' },
            { id: 'poisson', label: 'Poisson (λ)' },
            { id: 'uniform', label: 'Uniform (a, b)' },
            { id: 'exponential', label: 'Exponential (λ)' },
            { id: 'normal', label: 'Normal (μ, σ)' },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setActiveDist(item.id);
              setSamples([]);
              if (item.id === 'normal') setCutoffX(params.mu);
              else if (item.id === 'binomial') setCutoffX(Math.round(params.n_binom * params.p_binom));
              else if (item.id === 'poisson') setCutoffX(params.lambda_pois);
              else if (item.id === 'exponential') setCutoffX(1 / params.lambda_exp);
              else if (item.id === 'uniform') setCutoffX((params.a_uni + params.b_uni) / 2);
              else if (item.id === 'bernoulli') setCutoffX(0.5);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
              activeDist === item.id
                ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                : 'bg-[#fcfbf9] text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            {item.label}
          </button>
        ))}

        {/* Real-World Presets Ribbon */}
        <div className="w-full pt-3 mt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5 text-xs">
          <span className="text-[11px] font-mono text-slate-400 font-bold uppercase mr-1">Presets:</span>
          {activeDist === 'bernoulli' && (
            <>
              <button onClick={() => applyPreset('bern_fair')} className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] cursor-pointer">Fair Coin (p=0.5)</button>
              <button onClick={() => applyPreset('bern_roulette')} className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] cursor-pointer">Roulette Red</button>
              <button onClick={() => applyPreset('bern_rare')} className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] cursor-pointer">Rare Event (p=0.05)</button>
            </>
          )}
          {activeDist === 'binomial' && (
            <>
              <button onClick={() => applyPreset('binom_10')} className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] cursor-pointer">10 Coin Flips</button>
              <button onClick={() => applyPreset('binom_defect')} className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] cursor-pointer">Defect Rate (n=50)</button>
              <button onClick={() => applyPreset('binom_qc')} className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] cursor-pointer">Quality Control</button>
            </>
          )}
          {activeDist === 'poisson' && (
            <>
              <button onClick={() => applyPreset('pois_call')} className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] cursor-pointer">Call Center (λ=3)</button>
              <button onClick={() => applyPreset('pois_traffic')} className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] cursor-pointer">Traffic Arrivals (λ=12)</button>
            </>
          )}
          {activeDist === 'exponential' && (
            <>
              <button onClick={() => applyPreset('exp_fast')} className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] cursor-pointer">Fast Decay (λ=1.8)</button>
              <button onClick={() => applyPreset('exp_halflife')} className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] cursor-pointer">Radioactive Half-Life</button>
            </>
          )}
          {activeDist === 'uniform' && (
            <>
              <button onClick={() => applyPreset('uni_die')} className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] cursor-pointer">6-Sided Die [1, 6]</button>
              <button onClick={() => applyPreset('uni_wait')} className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] cursor-pointer">Bus Wait Time [0, 15]</button>
            </>
          )}
          {activeDist === 'normal' && (
            <>
              <button onClick={() => applyPreset('norm_iq')} className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] cursor-pointer">IQ Scale (μ=100, σ=15)</button>
              <button onClick={() => applyPreset('norm_height')} className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] cursor-pointer">Adult Height (μ=168, σ=7)</button>
              <button onClick={() => applyPreset('norm_exam')} className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono text-[11px] cursor-pointer">Exam Scores (μ=75, σ=10)</button>
            </>
          )}

          {/* Normal Empirical Rule Chips */}
          {activeDist === 'normal' && (
            <div className="ml-auto flex items-center gap-1">
              <span className="text-[10px] font-mono text-slate-400">Rule:</span>
              {(['none', '68', '95', '99.7'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setEmpBand(r)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono cursor-pointer border ${
                    empBand === r ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-slate-600 border-slate-200'
                  }`}
                >
                  {r === 'none' ? 'Off' : `±${r === '68' ? '1σ' : r === '95' ? '2σ' : '3σ'} (${r}%)`}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. Main Stage: Responsive Layout based on controllerPos */}
      {controllerPos === 'below' ? (
        <div className="space-y-6">
          {renderCharts()}
          {renderParameterBars()}
        </div>
      ) : controllerPos === 'left' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-4 space-y-4">
            {renderParameterBars()}
          </div>
          <div className="lg:col-span-8 space-y-6">
            {renderCharts()}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 space-y-6">
            {renderCharts()}
          </div>
          <div className="lg:col-span-4 space-y-4">
            {renderParameterBars()}
          </div>
        </div>
      )}

      {/* 4. Live Monte Carlo Simulation Workbench */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-amber-600" />
              <h3 className="text-base font-bold text-slate-900">
                Live Monte Carlo Simulation Engine
              </h3>
            </div>
            <p className="text-xs text-slate-600">
              Draw pseudo-random realizations directly from the active probability model and watch empirical moments converge.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => addSamples(1)}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              +1 Trial
            </button>
            <button
              type="button"
              onClick={() => addSamples(25)}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              +25
            </button>
            <button
              type="button"
              onClick={() => addSamples(250)}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              +250
            </button>
            <button
              type="button"
              onClick={() => addSamples(2000)}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              +2,000 Trials 🎉
            </button>
            {samples.length > 0 && (
              <button
                type="button"
                onClick={clearSamples}
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                title="Clear simulation data"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Theoretical vs Empirical Convergence Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-[#fcfbf9] rounded-xl border border-slate-200">
            <span className="text-[10px] font-mono text-slate-500 uppercase">Total Samples (N)</span>
            <div className="text-xl font-mono font-bold text-slate-900 mt-0.5">
              {samples.length.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500">Simulated Trials</div>
          </div>

          <div className="p-3 bg-[#fcfbf9] rounded-xl border border-slate-200">
            <span className="text-[10px] font-mono text-slate-500 uppercase">E[X] vs Sample Mean (x̄)</span>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="text-xs text-slate-500">μ: <strong className="font-mono text-slate-900">{theoreticalMoments.mean.toFixed(2)}</strong></span>
              <span className="text-sm font-mono font-bold text-amber-700">
                {empiricalStats ? empiricalStats.mean.toFixed(2) : '—'}
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
              {empiricalStats ? `|Δ| = ${Math.abs(theoreticalMoments.mean - empiricalStats.mean).toFixed(4)}` : 'Awaiting data'}
            </div>
          </div>

          <div className="p-3 bg-[#fcfbf9] rounded-xl border border-slate-200">
            <span className="text-[10px] font-mono text-slate-500 uppercase">Var(X) vs Sample (s²)</span>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="text-xs text-slate-500">σ²: <strong className="font-mono text-slate-900">{theoreticalMoments.variance.toFixed(2)}</strong></span>
              <span className="text-sm font-mono font-bold text-amber-700">
                {empiricalStats ? empiricalStats.variance.toFixed(2) : '—'}
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
              {empiricalStats ? `|Δ| = ${Math.abs(theoreticalMoments.variance - empiricalStats.variance).toFixed(4)}` : 'Awaiting data'}
            </div>
          </div>

          <div className="p-3 bg-[#fcfbf9] rounded-xl border border-slate-200">
            <span className="text-[10px] font-mono text-slate-500 uppercase">Std Dev (σ vs s)</span>
            <div className="flex items-baseline justify-between mt-0.5">
              <span className="text-xs text-slate-500">σ: <strong className="font-mono text-slate-900">{theoreticalMoments.stdDev.toFixed(2)}</strong></span>
              <span className="text-sm font-mono font-bold text-amber-700">
                {empiricalStats ? empiricalStats.stdDev.toFixed(2) : '—'}
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
              {empiricalStats ? `|Δ| = ${Math.abs(theoreticalMoments.stdDev - empiricalStats.stdDev).toFixed(4)}` : 'Awaiting data'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
