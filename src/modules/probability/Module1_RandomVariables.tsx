import React, { useState, useMemo } from 'react';
import {
  Layers,
  Dices,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Sliders,
  Minus,
  Plus,
  Info,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { MathView } from '../../components/MathView';
import { binomialPmf, normalPdf } from './math';

export const Module1_RandomVariables: React.FC = () => {
  // Continuous Limit Morph parameters
  const [morphN, setMorphN] = useState<number>(30);
  const [morphP, setMorphP] = useState<number>(0.5);

  // Interactive Dice Lab state
  const [diceRolls, setDiceRolls] = useState<number[]>([]);
  const [lastRolled, setLastRolled] = useState<number | null>(null);
  const [diceFaces, setDiceFaces] = useState<number>(6); // D4, D6, D8, D12, D20
  const [diceBiasWeight, setDiceBiasWeight] = useState<number>(0); // 0 = fair, >0 = biased towards highest face

  // Dice roll counts for faces 1 through K
  const diceStats = useMemo(() => {
    const K = diceFaces;
    const counts = new Array(K).fill(0);
    let sum = 0;
    for (const roll of diceRolls) {
      if (roll >= 1 && roll <= K) {
        counts[roll - 1]++;
        sum += roll;
      }
    }
    const total = diceRolls.length;
    const mean = total > 0 ? sum / total : 0;
    const freqs = counts.map((c) => (total > 0 ? c / total : 0));

    // Theoretical probabilities given bias weight
    // If bias = 0: fair die P(i) = 1/K
    // If bias > 0: highest face K has P(K) = 1/K + bias*(1 - 1/K), others share remainder
    const theoreticalProb = new Array(K).fill(0);
    const fairP = 1 / K;
    const topP = fairP + diceBiasWeight * (1 - fairP);
    const otherP = K > 1 ? (1 - topP) / (K - 1) : 1;
    for (let i = 0; i < K - 1; i++) theoreticalProb[i] = otherP;
    theoreticalProb[K - 1] = topP;

    let theoreticalMean = 0;
    for (let i = 0; i < K; i++) {
      theoreticalMean += (i + 1) * theoreticalProb[i];
    }

    return { counts, total, mean, freqs, theoreticalProb, theoreticalMean, fairP };
  }, [diceRolls, diceFaces, diceBiasWeight]);

  // Roll dice with optional bias
  const rollDice = (amount: number) => {
    const K = diceFaces;
    const newRolls = new Array(amount);
    const { theoreticalProb } = diceStats;

    // Cumulative thresholds for biased sampling
    const cumProb = new Array(K).fill(0);
    let acc = 0;
    for (let i = 0; i < K; i++) {
      acc += theoreticalProb[i];
      cumProb[i] = acc;
    }

    let last = 1;
    for (let i = 0; i < amount; i++) {
      const u = Math.random();
      let face = 1;
      for (let f = 0; f < K; f++) {
        if (u <= cumProb[f] || f === K - 1) {
          face = f + 1;
          break;
        }
      }
      newRolls[i] = face;
      last = face;
    }
    setLastRolled(last);
    setDiceRolls((prev) => [...prev, ...newRolls]);
  };

  const resetDice = () => {
    setDiceRolls([]);
    setLastRolled(null);
  };

  // Binomial vs Gaussian morph data for n and p
  const morphData = useMemo(() => {
    const n = morphN;
    const p = morphP;
    const mu = n * p;
    const variance = n * p * (1 - p);
    const sigma = Math.sqrt(Math.max(1e-4, variance));
    const skewness = (1 - 2 * p) / (sigma > 0 ? sigma : 1);

    const bars: Array<{ k: number; pmf: number }> = [];
    for (let k = 0; k <= n; k++) {
      bars.push({ k, pmf: binomialPmf(k, n, p) });
    }

    // Normal approximation points
    const normPts: Array<{ x: number; pdf: number }> = [];
    const steps = 80;
    for (let i = 0; i <= steps; i++) {
      const x = (i / steps) * n;
      normPts.push({ x, pdf: normalPdf(x, mu, sigma) });
    }

    return {
      bars,
      normPts,
      mu,
      sigma,
      variance,
      skewness,
      maxP: Math.max(...bars.map((b) => b.pmf), 0.1),
    };
  }, [morphN, morphP]);

  return (
    <div className="space-y-8">
      {/* 1. Header Section */}
      <div>
        <div className="flex items-center gap-2 mb-1.5">
          <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-200">
            MODULE 01
          </span>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-mono">
            Conceptual Foundations & Parameter Dynamics
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Random Variables: Discrete vs. Continuous
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
          Manipulate variables across different states to explore discrete point masses vs. continuous probability densities,
          inspect how asymmetry and trial counts govern the continuous limit, and test dice bias parameters in real time.
        </p>
      </div>

      {/* 2. Side-by-side Comparative Conceptual Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Discrete Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-600" />
              <h3 className="text-base font-bold text-slate-900">Discrete Random Variables</h3>
            </div>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
              Countable Values
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Takes on discrete, separate values (e.g. integers, packet counts, coin flips). Probability is concentrated
            in exact point masses called the <strong>Probability Mass Function (PMF)</strong>.
          </p>

          <div className="space-y-3 pt-1">
            <div className="p-3 bg-[#fcfbf9] rounded-xl border border-slate-200">
              <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">
                Summation to Unity Axiom:
              </span>
              <div className="text-xs font-semibold text-slate-900 overflow-x-auto">
                <MathView math="\sum_{k} P(X = k) = 1, \quad P(X = k) \ge 0" displayMode={true} />
              </div>
            </div>

            <div className="p-3 bg-[#fcfbf9] rounded-xl border border-slate-200">
              <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">
                Cumulative Distribution Function (CDF):
              </span>
              <div className="text-xs font-semibold text-slate-900 overflow-x-auto">
                <MathView math="F(x) = P(X \le x) = \sum_{k \le x} P(X = k)" displayMode={true} />
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Forms a right-continuous step/staircase function with discrete jumps.
              </span>
            </div>

            <div className="p-3 bg-[#fcfbf9] rounded-xl border border-slate-200">
              <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">
                Expectation & Moments:
              </span>
              <div className="text-xs font-semibold text-slate-900 overflow-x-auto">
                <MathView math="\mathbb{E}[X] = \sum_k k \cdot P(X = k)" displayMode={true} />
              </div>
            </div>
          </div>
        </div>

        {/* Continuous Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-slate-900" />
              <h3 className="text-base font-bold text-slate-900">Continuous Random Variables</h3>
            </div>
            <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
              Uncountable Continuum
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Takes on values over an unbroken interval of real numbers (e.g. voltage, time, physical noise).
            The probability of any exact single point is identically zero: <MathView math="P(X = c) = 0" />.
          </p>

          <div className="space-y-3 pt-1">
            <div className="p-3 bg-[#fcfbf9] rounded-xl border border-slate-200">
              <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">
                Integral to Unity Axiom:
              </span>
              <div className="text-xs font-semibold text-slate-900 overflow-x-auto">
                <MathView math="\int_{-\infty}^{\infty} f(x) \, dx = 1, \quad f(x) \ge 0" displayMode={true} />
              </div>
            </div>

            <div className="p-3 bg-[#fcfbf9] rounded-xl border border-slate-200">
              <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">
                Area Under Density as Probability:
              </span>
              <div className="text-xs font-semibold text-slate-900 overflow-x-auto">
                <MathView math="P(a \le X \le b) = \int_a^b f(x) \, dx = F(b) - F(a)" displayMode={true} />
              </div>
              <span className="text-[11px] text-slate-500 mt-1 block">
                Continuous S-curve CDF with density <MathView math="f(x) = F'(x)" />.
              </span>
            </div>

            <div className="p-3 bg-[#fcfbf9] rounded-xl border border-slate-200">
              <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">
                Continuous Expectation:
              </span>
              <div className="text-xs font-semibold text-slate-900 overflow-x-auto">
                <MathView math="\mathbb{E}[X] = \int_{-\infty}^{\infty} x f(x) \, dx" displayMode={true} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. "Continuous Limit" Morph Demonstration with Parameter Control Bars */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-amber-600" />
              <h3 className="text-base font-bold text-slate-900">
                The "Continuous Limit" Morph Demonstration
              </h3>
            </div>
            <p className="text-xs text-slate-600">
              Adjust the <strong>Granularity ($n$)</strong> and <strong>Success Probability ($p$)</strong> parameter bars to observe
              how discrete Binomial point masses converge into the continuous Gaussian bell curve (de Moivre–Laplace Theorem).
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-bold">
              n = {morphN} · p = {morphP.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Dual Parameter Controlling Bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-[#fcfbf9] p-4 rounded-xl border border-slate-200">
          {/* Bar 1: Trials n */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-600" />
                <span>Sample Granularity (n Trials):</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setMorphN((prev) => Math.max(2, prev - 2))}
                  className="w-5 h-5 rounded bg-white border border-slate-200 hover:border-amber-600 flex items-center justify-center text-slate-600 hover:text-amber-700 cursor-pointer"
                  title="Step -2"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="font-mono text-amber-700 font-bold w-12 text-center bg-white px-1.5 py-0.5 rounded border border-slate-200">
                  {morphN}
                </span>
                <button
                  type="button"
                  onClick={() => setMorphN((prev) => Math.min(100, prev + 2))}
                  className="w-5 h-5 rounded bg-white border border-slate-200 hover:border-amber-600 flex items-center justify-center text-slate-600 hover:text-amber-700 cursor-pointer"
                  title="Step +2"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
            <input
              type="range"
              min="2"
              max="100"
              step="2"
              value={morphN}
              onChange={(e) => setMorphN(parseInt(e.target.value, 10))}
              className="w-full accent-amber-600 cursor-pointer"
            />
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
              <span>n = 2 (Few Discrete Spikes)</span>
              <div className="flex gap-1">
                {[2, 4, 10, 30, 60, 100].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setMorphN(v)}
                    className={`px-1.5 py-0.5 rounded border cursor-pointer ${
                      morphN === v ? 'bg-amber-600 text-white border-amber-600 font-bold' : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <span>n = 100</span>
            </div>
          </div>

          {/* Bar 2: Success Probability p */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-600" />
                <span>Success Probability (p) [Skewness Control]:</span>
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setMorphP((prev) => Math.max(0.05, parseFloat((prev - 0.05).toFixed(2))))}
                  className="w-5 h-5 rounded bg-white border border-slate-200 hover:border-amber-600 flex items-center justify-center text-slate-600 hover:text-amber-700 cursor-pointer"
                  title="Step -0.05"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="font-mono text-amber-700 font-bold w-12 text-center bg-white px-1.5 py-0.5 rounded border border-slate-200">
                  {morphP.toFixed(2)}
                </span>
                <button
                  type="button"
                  onClick={() => setMorphP((prev) => Math.min(0.95, parseFloat((prev + 0.05).toFixed(2))))}
                  className="w-5 h-5 rounded bg-white border border-slate-200 hover:border-amber-600 flex items-center justify-center text-slate-600 hover:text-amber-700 cursor-pointer"
                  title="Step +0.05"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.95"
              step="0.05"
              value={morphP}
              onChange={(e) => setMorphP(parseFloat(e.target.value))}
              className="w-full accent-amber-600 cursor-pointer"
            />
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-400">
              <span>p = 0.05 (Skewed Left)</span>
              <div className="flex gap-1">
                {[0.1, 0.25, 0.5, 0.75, 0.9].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setMorphP(v)}
                    className={`px-1.5 py-0.5 rounded border cursor-pointer ${
                      Math.abs(morphP - v) < 0.01 ? 'bg-amber-600 text-white border-amber-600 font-bold' : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <span>p = 0.95 (Skewed Right)</span>
            </div>
          </div>
        </div>

        {/* High-Resolution SVG Morph Visualization */}
        <div className="relative w-full h-64 bg-[#fcfbf9] rounded-xl border border-slate-200 p-4 overflow-hidden">
          <svg viewBox="0 0 600 200" preserveAspectRatio="none" className="w-full h-full">
            {/* Grid baseline */}
            <line x1="20" y1="170" x2="580" y2="170" stroke="#cbd5e1" strokeWidth="1.5" />

            {/* Binomial discrete bars */}
            {morphData.bars.map((bar) => {
              const xPos = 30 + (bar.k / morphN) * 540;
              const barH = (bar.pmf / morphData.maxP) * 140;
              const barW = Math.max(2, 520 / (morphN * 1.5));
              return (
                <rect
                  key={bar.k}
                  x={xPos - barW / 2}
                  y={170 - barH}
                  width={barW}
                  height={barH}
                  fill="rgba(217, 119, 6, 0.4)"
                  stroke="#d97706"
                  strokeWidth="0.75"
                />
              );
            })}

            {/* Continuous Normal fit curve */}
            <path
              d={morphData.normPts
                .map((pt, idx) => {
                  const xPos = 30 + (pt.x / morphN) * 540;
                  const yPos = 170 - (pt.pdf / morphData.maxP) * 140;
                  return `${idx === 0 ? 'M' : 'L'} ${xPos.toFixed(1)} ${yPos.toFixed(1)}`;
                })
                .join(' ')}
              fill="none"
              stroke="#1e293b"
              strokeWidth="2.5"
            />
          </svg>
        </div>

        {/* Dynamic Moments Readout Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-slate-200 text-xs font-mono">
          <div className="p-2.5 bg-[#fcfbf9] rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase block">Mean (μ = np)</span>
            <span className="text-sm font-bold text-slate-900">{morphData.mu.toFixed(2)}</span>
          </div>
          <div className="p-2.5 bg-[#fcfbf9] rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase block">Variance (σ² = np(1-p))</span>
            <span className="text-sm font-bold text-slate-900">{morphData.variance.toFixed(2)}</span>
          </div>
          <div className="p-2.5 bg-[#fcfbf9] rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase block">Std Dev (σ)</span>
            <span className="text-sm font-bold text-amber-700">{morphData.sigma.toFixed(2)}</span>
          </div>
          <div className="p-2.5 bg-[#fcfbf9] rounded-lg border border-slate-200">
            <span className="text-[10px] text-slate-500 uppercase block">Skewness (γ₁)</span>
            <span className="text-sm font-bold text-slate-900">
              {morphData.skewness.toFixed(3)} {Math.abs(morphData.skewness) < 0.1 ? '(Symmetric)' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Interactive Dice Lab with Side-Count & Bias Parameter Bars */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-700 flex items-center justify-center text-white shadow-xs">
              <Dices className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Interactive Dice & Polyhedral Lab</h3>
              <p className="text-xs text-slate-600">
                Explore uniform vs. biased discrete variables. Control the number of die faces and bias weighting.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => rollDice(1)}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              +1 Roll
            </button>
            <button
              type="button"
              onClick={() => rollDice(100)}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              +100
            </button>
            <button
              type="button"
              onClick={() => rollDice(1000)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              +1,000 Rolls
            </button>
            <button
              type="button"
              onClick={resetDice}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors cursor-pointer"
              title="Reset Dice Rolls"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Dice Lab Parameter Controlling Bars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-[#fcfbf9] p-4 rounded-xl border border-slate-200">
          {/* Die Faces Selector Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-slate-700">
              <span className="flex items-center gap-1.5">
                <Dices className="w-3.5 h-3.5 text-amber-600" />
                <span>Polyhedral Die Faces:</span>
              </span>
              <span className="font-mono text-amber-700 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                D{diceFaces} ({diceFaces} Sides)
              </span>
            </div>
            <div className="flex items-center gap-2">
              {[4, 6, 8, 12, 20].map((sides) => (
                <button
                  key={sides}
                  type="button"
                  onClick={() => {
                    setDiceFaces(sides);
                    setDiceRolls([]);
                    setLastRolled(null);
                  }}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-mono font-bold border transition-colors cursor-pointer ${
                    diceFaces === sides
                      ? 'bg-amber-600 text-white border-amber-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  D{sides}
                </button>
              ))}
            </div>
          </div>

          {/* Die Fairness / Bias Weight Slider Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-medium text-slate-700">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-amber-600" />
                <span>Die Weighting / Bias towards Top Face (Face {diceFaces}):</span>
              </span>
              <span className="font-mono text-amber-700 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                {diceBiasWeight === 0 ? 'Fair (Uniform)' : `+${(diceBiasWeight * 100).toFixed(0)}% Loaded`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="0.6"
              step="0.05"
              value={diceBiasWeight}
              onChange={(e) => setDiceBiasWeight(parseFloat(e.target.value))}
              className="w-full accent-amber-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>0% (Fair 1/{diceFaces})</span>
              <span>Loaded Top Face ({((diceStats.theoreticalProb[diceFaces - 1] || 0) * 100).toFixed(1)}% prob)</span>
            </div>
          </div>
        </div>

        {/* Dice Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-[#fcfbf9] rounded-xl border border-slate-200">
            <span className="text-[10px] font-mono text-slate-500 uppercase">Total Rolls (N)</span>
            <div className="text-xl font-mono font-bold text-slate-900 mt-0.5">
              {diceStats.total.toLocaleString()}
            </div>
          </div>

          <div className="p-3 bg-[#fcfbf9] rounded-xl border border-slate-200">
            <span className="text-[10px] font-mono text-slate-500 uppercase">Sample Mean (x̄)</span>
            <div className="text-xl font-mono font-bold text-amber-700 mt-0.5">
              {diceStats.total > 0 ? diceStats.mean.toFixed(3) : '—'}
            </div>
            <div className="text-[10px] text-slate-500">
              Target E[X] = {diceStats.theoreticalMean.toFixed(2)}
            </div>
          </div>

          <div className="p-3 bg-[#fcfbf9] rounded-xl border border-slate-200">
            <span className="text-[10px] font-mono text-slate-500 uppercase">Convergence Error</span>
            <div className="text-xl font-mono font-bold text-slate-900 mt-0.5">
              {diceStats.total > 0 ? `|${(diceStats.mean - diceStats.theoreticalMean).toFixed(4)}|` : '—'}
            </div>
            <div className="text-[10px] text-slate-500">|x̄ - E[X]|</div>
          </div>

          <div className="p-3 bg-[#fcfbf9] rounded-xl border border-slate-200">
            <span className="text-[10px] font-mono text-slate-500 uppercase">Last Rolled Face</span>
            <div className="text-xl font-mono font-bold text-amber-700 mt-0.5">
              {lastRolled !== null ? `[ ${lastRolled} ]` : '—'}
            </div>
          </div>
        </div>

        {/* Live Histogram SVG */}
        <div className="relative w-full h-56 bg-[#fcfbf9] rounded-xl border border-slate-200 p-4">
          <svg viewBox="0 0 600 160" preserveAspectRatio="none" className="w-full h-full">
            {/* Grid line at fair theoretical */}
            <line x1="30" y1="50" x2="570" y2="50" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="4 4" />
            <text x="575" y="53" fill="#f43f5e" fontSize="9" fontFamily="monospace" textAnchor="start">
              Fair P ≈ {(diceStats.fairP * 100).toFixed(1)}%
            </text>

            {/* Baseline */}
            <line x1="30" y1="130" x2="570" y2="130" stroke="#cbd5e1" strokeWidth="1.5" />

            {/* K Face bars */}
            {Array.from({ length: diceFaces }, (_, idx) => {
              const face = idx + 1;
              const freq = diceStats.freqs[idx];
              const maxScale = Math.max(0.35, Math.max(...diceStats.theoreticalProb) * 1.2);
              const barH = Math.min(100, (freq / maxScale) * 100);
              const spacing = 520 / diceFaces;
              const px = 40 + spacing * (idx + 0.5);
              const bW = Math.max(8, Math.min(48, spacing * 0.7));

              return (
                <g key={face}>
                  <rect
                    x={px - bW / 2}
                    y={130 - barH}
                    width={bW}
                    height={barH}
                    fill="rgba(217, 119, 6, 0.6)"
                    stroke="#b45309"
                    strokeWidth="1.5"
                    rx="2"
                  />
                  <text x={px} y="146" textAnchor="middle" fill="#1e293b" fontSize={diceFaces > 12 ? '9' : '11'} fontFamily="monospace" fontWeight="bold">
                    {face}
                  </text>
                  {diceStats.total > 0 && (
                    <text x={px} y={122 - barH} textAnchor="middle" fill="#78350f" fontSize="9" fontFamily="monospace">
                      {(freq * 100).toFixed(1)}%
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
};
