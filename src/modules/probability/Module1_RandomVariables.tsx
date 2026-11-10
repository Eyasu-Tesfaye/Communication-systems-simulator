import React, { useState, useMemo } from 'react';
import {
  Layers,
  Dices,
  RotateCcw,
  Sparkles,
  TrendingUp,
  SlidersHorizontal,
  Play,
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
    <div className="space-y-6">
      {/* 1. Header Section */}
      <div className="pb-4 border-b border-[#E6E4DD]">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FBF4F0] text-[#C85A32] border border-[#C85A32]/20">
            MODULE 01
          </span>
          <span className="text-xs font-semibold text-[#75736E] uppercase tracking-wider font-mono">
            Conceptual Foundations & Parameter Dynamics
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1917]">
          Random Variables: Discrete vs. Continuous
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-[#585651] max-w-3xl leading-relaxed">
          Manipulate variables across different states to explore discrete point masses vs. continuous probability densities,
          inspect how asymmetry and trial counts govern the continuous limit, and test dice bias parameters in real time.
        </p>
      </div>

      {/* 2. Side-by-side Comparative Conceptual Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Discrete Card */}
        <div className="bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between pb-3 border-b border-[#E6E4DD]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C85A32]" />
              <h3 className="text-sm font-bold text-[#1A1917]">Discrete Random Variables</h3>
            </div>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#FBF4F0] text-[#C85A32] border border-[#C85A32]/20">
              Countable Values
            </span>
          </div>

          <p className="text-xs text-[#585651] leading-relaxed">
            Takes on discrete, separate values (e.g. integers, packet counts, coin flips). Probability is concentrated
            in exact point masses called the <strong>Probability Mass Function (PMF)</strong>.
          </p>

          <div className="space-y-2.5 pt-1">
            <div className="p-3 bg-[#FAF9F6] rounded-md border border-[#E6E4DD]">
              <span className="text-[10px] font-mono text-[#75736E] uppercase block mb-1">
                Summation to Unity Axiom:
              </span>
              <div className="text-xs font-semibold text-[#1A1917] overflow-x-auto">
                <MathView math="\sum_{k} P(X = k) = 1, \quad P(X = k) \ge 0" displayMode={true} />
              </div>
            </div>

            <div className="p-3 bg-[#FAF9F6] rounded-md border border-[#E6E4DD]">
              <span className="text-[10px] font-mono text-[#75736E] uppercase block mb-1">
                Cumulative Distribution Function (CDF):
              </span>
              <div className="text-xs font-semibold text-[#1A1917] overflow-x-auto">
                <MathView math="F(x) = P(X \le x) = \sum_{k \le x} P(X = k)" displayMode={true} />
              </div>
              <span className="text-[11px] text-[#75736E] mt-1 block">
                Forms a right-continuous step/staircase function with discrete jumps.
              </span>
            </div>

            <div className="p-3 bg-[#FAF9F6] rounded-md border border-[#E6E4DD]">
              <span className="text-[10px] font-mono text-[#75736E] uppercase block mb-1">
                Expectation & Moments:
              </span>
              <div className="text-xs font-semibold text-[#1A1917] overflow-x-auto">
                <MathView math="\mathbb{E}[X] = \sum_k k \cdot P(X = k)" displayMode={true} />
              </div>
            </div>
          </div>
        </div>

        {/* Continuous Card */}
        <div className="bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-xs space-y-3.5">
          <div className="flex items-center justify-between pb-3 border-b border-[#E6E4DD]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1A1917]" />
              <h3 className="text-sm font-bold text-[#1A1917]">Continuous Random Variables</h3>
            </div>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-[#FAF9F6] text-[#585651] border border-[#E6E4DD]">
              Uncountable Continuum
            </span>
          </div>

          <p className="text-xs text-[#585651] leading-relaxed">
            Takes on values over an unbroken interval of real numbers (e.g. voltage, time, physical noise).
            The probability of any exact single point is identically zero: <MathView math="P(X = c) = 0" />.
          </p>

          <div className="space-y-2.5 pt-1">
            <div className="p-3 bg-[#FAF9F6] rounded-md border border-[#E6E4DD]">
              <span className="text-[10px] font-mono text-[#75736E] uppercase block mb-1">
                Integral to Unity Axiom:
              </span>
              <div className="text-xs font-semibold text-[#1A1917] overflow-x-auto">
                <MathView math="\int_{-\infty}^{\infty} f(x) \, dx = 1, \quad f(x) \ge 0" displayMode={true} />
              </div>
            </div>

            <div className="p-3 bg-[#FAF9F6] rounded-md border border-[#E6E4DD]">
              <span className="text-[10px] font-mono text-[#75736E] uppercase block mb-1">
                Area Under Density as Probability:
              </span>
              <div className="text-xs font-semibold text-[#1A1917] overflow-x-auto">
                <MathView math="P(a \le X \le b) = \int_a^b f(x) \, dx = F(b) - F(a)" displayMode={true} />
              </div>
              <span className="text-[11px] text-[#75736E] mt-1 block">
                Continuous S-curve CDF with density <MathView math="f(x) = F'(x)" />.
              </span>
            </div>

            <div className="p-3 bg-[#FAF9F6] rounded-md border border-[#E6E4DD]">
              <span className="text-[10px] font-mono text-[#75736E] uppercase block mb-1">
                Continuous Expectation:
              </span>
              <div className="text-xs font-semibold text-[#1A1917] overflow-x-auto">
                <MathView math="\mathbb{E}[X] = \int_{-\infty}^{\infty} x f(x) \, dx" displayMode={true} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. "Continuous Limit" Morph Demonstration - Styled to match Image 1 */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-xs space-y-4">
        {/* Title & Technical Note */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E6E4DD]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-[#C85A32]" />
              <h3 className="text-sm font-bold text-[#1A1917]">
                The "Continuous Limit" Morph Demonstration
              </h3>
            </div>
            <p className="text-xs text-[#585651]">
              Adjust parameter sliders below to observe how discrete Binomial point masses converge into the continuous Gaussian bell curve (de Moivre–Laplace Theorem).
            </p>
          </div>
        </div>

        {/* High-Resolution SVG Morph Visualization */}
        <div className="relative w-full h-64 bg-[#FAF9F6] rounded-md border border-[#E6E4DD] p-4 overflow-hidden">
          <svg viewBox="0 0 600 200" preserveAspectRatio="none" className="w-full h-full select-none">
            {/* Grid baseline */}
            <line x1="20" y1="170" x2="580" y2="170" stroke="#8A8882" strokeWidth="1.5" />

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
                  fill="rgba(200, 90, 50, 0.35)"
                  stroke="#C85A32"
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
              stroke="#1A1917"
              strokeWidth="2.5"
            />
          </svg>
        </div>

        {/* EXACT IMAGE 1 PARAMETER CONTROLLING BAR */}
        <div className="p-4 sm:p-5 rounded-lg bg-[#FAF9F6] border border-[#E6E4DD] space-y-4">
          {/* Header with Title and Mode Indicator */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-[#E6E4DD]">
            <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#75736E] font-semibold">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#C85A32]" />
              <span>Convergence Controls & Signal Parameters</span>
            </div>

            {/* Parameter Badge Capsule */}
            <div className="flex items-center bg-white p-0.5 rounded-md border border-[#E6E4DD] shadow-2xs">
              <span className="px-2.5 py-0.5 text-xs font-mono font-bold text-[#C85A32]">
                n = {morphN}
              </span>
              <span className="text-[#8A8882] text-xs">·</span>
              <span className="px-2.5 py-0.5 text-xs font-mono font-bold text-[#1A1917]">
                p = {morphP.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Parameter Sliders Grid - matching Image 1 layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* 1. Sample Granularity (n) */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-[#1A1917]">Trials (n)</span>
                <span className="font-mono text-[#C85A32] font-semibold">{morphN}</span>
              </div>
              <input
                type="range"
                min="2"
                max="100"
                step="2"
                value={morphN}
                onChange={(e) => setMorphN(parseInt(e.target.value, 10))}
                className="w-full accent-[#C85A32] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
                <span>Discrete (n=2)</span>
                <span className="font-semibold text-[#1A1917]">Limit (n=100)</span>
              </div>
            </div>

            {/* 2. Success Probability (p) */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-[#1A1917]">Probability (p)</span>
                <span className="font-mono text-[#C85A32] font-semibold">{morphP.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.05"
                max="0.95"
                step="0.05"
                value={morphP}
                onChange={(e) => setMorphP(parseFloat(e.target.value))}
                className="w-full accent-[#C85A32] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
                <span>Skewed Left (0.05)</span>
                <span className="font-semibold text-[#1A1917]">Right (0.95)</span>
              </div>
            </div>

            {/* 3. Readout: Mean np */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-[#1A1917]">Mean (μ = np)</span>
                <span className="font-mono text-[#C85A32] font-semibold">{morphData.mu.toFixed(2)}</span>
              </div>
              <div className="h-6 flex items-center">
                <div className="w-full bg-white border border-[#E6E4DD] rounded px-2.5 py-1 text-xs font-mono text-[#1A1917] flex justify-between">
                  <span className="text-[#8A8882]">Std Dev (σ):</span>
                  <span className="font-bold text-[#C85A32]">{morphData.sigma.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
                <span>Variance (σ²):</span>
                <span className="font-semibold text-[#1A1917]">{morphData.variance.toFixed(2)}</span>
              </div>
            </div>

            {/* 4. Readout: Skewness */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-[#1A1917]">Skewness (γ₁)</span>
                <span className="font-mono text-[#C85A32] font-semibold">
                  {morphData.skewness.toFixed(3)}
                </span>
              </div>
              <div className="h-6 flex items-center">
                <div className="w-full bg-white border border-[#E6E4DD] rounded px-2.5 py-1 text-xs font-mono text-[#1A1917] flex justify-between">
                  <span className="text-[#8A8882]">Profile:</span>
                  <span className="font-bold text-[#1A1917]">
                    {Math.abs(morphData.skewness) < 0.1 ? 'Symmetric' : morphData.skewness > 0 ? 'Right Skew' : 'Left Skew'}
                  </span>
                </div>
              </div>
              <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
                <span>Continuum fit:</span>
                <span className="font-semibold text-[#1A1917]">{morphN >= 30 ? 'De Moivre OK' : 'Point Masses'}</span>
              </div>
            </div>
          </div>

          {/* Presets Row - matching Image 1 */}
          <div className="pt-2 border-t border-[#E6E4DD]/80 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-mono text-[#75736E] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#C85A32]" />
              <span>Presets:</span>
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setMorphN(4);
                  setMorphP(0.5);
                }}
                className={`text-xs font-mono px-2.5 py-1 rounded border transition cursor-pointer ${
                  morphN === 4 && morphP === 0.5
                    ? 'bg-[#C85A32] text-white border-[#C85A32]'
                    : 'bg-white border-[#E6E4DD] hover:bg-[#F3F2EC] text-[#1A1917]'
                }`}
              >
                n=4 Fair (Sparse Spikes)
              </button>
              <button
                type="button"
                onClick={() => {
                  setMorphN(16);
                  setMorphP(0.25);
                }}
                className={`text-xs font-mono px-2.5 py-1 rounded border transition cursor-pointer ${
                  morphN === 16 && morphP === 0.25
                    ? 'bg-[#C85A32] text-white border-[#C85A32]'
                    : 'bg-white border-[#E6E4DD] hover:bg-[#F3F2EC] text-[#1A1917]'
                }`}
              >
                n=16 Asymmetric (p=0.25)
              </button>
              <button
                type="button"
                onClick={() => {
                  setMorphN(30);
                  setMorphP(0.5);
                }}
                className={`text-xs font-mono px-2.5 py-1 rounded border transition cursor-pointer ${
                  morphN === 30 && morphP === 0.5
                    ? 'bg-[#C85A32] text-white border-[#C85A32]'
                    : 'bg-white border-[#E6E4DD] hover:bg-[#F3F2EC] text-[#1A1917]'
                }`}
              >
                n=30 Standard Gaussian Fit
              </button>
              <button
                type="button"
                onClick={() => {
                  setMorphN(100);
                  setMorphP(0.5);
                }}
                className={`text-xs font-mono px-2.5 py-1 rounded border transition cursor-pointer ${
                  morphN === 100 && morphP === 0.5
                    ? 'bg-[#C85A32] text-white border-[#C85A32]'
                    : 'bg-white border-[#E6E4DD] hover:bg-[#F3F2EC] text-[#1A1917]'
                }`}
              >
                n=100 Continuous Limit
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Interactive Dice Lab - matching Image 1 layout */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-xs space-y-4">
        {/* Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E6E4DD]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-[#FBF4F0] border border-[#C85A32]/20 flex items-center justify-center text-[#C85A32] shadow-2xs">
              <Dices className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1A1917]">Interactive Dice & Polyhedral Lab</h3>
              <p className="text-xs text-[#585651]">
                Explore uniform vs. biased discrete variables. Control the number of die faces and bias weighting.
              </p>
            </div>
          </div>
        </div>

        {/* Live Histogram SVG */}
        <div className="relative w-full h-56 bg-[#FAF9F6] rounded-md border border-[#E6E4DD] p-4">
          <svg viewBox="0 0 600 160" preserveAspectRatio="none" className="w-full h-full select-none">
            {/* Grid line at fair theoretical */}
            <line x1="30" y1="50" x2="570" y2="50" stroke="#C85A32" strokeWidth="1.5" strokeDasharray="4 4" />
            <text x="575" y="53" fill="#C85A32" fontSize="9" fontFamily="monospace" textAnchor="start">
              Fair P ≈ {(diceStats.fairP * 100).toFixed(1)}%
            </text>

            {/* Baseline */}
            <line x1="30" y1="130" x2="570" y2="130" stroke="#8A8882" strokeWidth="1.5" />

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
                    fill="rgba(200, 90, 50, 0.45)"
                    stroke="#C85A32"
                    strokeWidth="1.5"
                    rx="2"
                  />
                  <text x={px} y={146} textAnchor="middle" fill="#1A1917" fontSize={diceFaces > 12 ? '9' : '11'} fontFamily="monospace" fontWeight="bold">
                    {face}
                  </text>
                  {diceStats.total > 0 && (
                    <text x={px} y={122 - barH} textAnchor="middle" fill="#C85A32" fontSize="9" fontFamily="monospace" fontWeight="semibold">
                      {(freq * 100).toFixed(1)}%
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Dice Lab Controls Panel - matching Image 1 */}
        <div className="p-4 sm:p-5 rounded-lg bg-[#FAF9F6] border border-[#E6E4DD] space-y-4">
          {/* Header */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-[#E6E4DD]">
            <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#75736E] font-semibold">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#C85A32]" />
              <span>Dice Simulation Controls & Signal Parameters</span>
            </div>

            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-[#E6E4DD] text-[#585651] font-bold">
              {diceStats.total.toLocaleString()} Rolls Active
            </span>
          </div>

          {/* Action Row - Start / Roll buttons matching Image 1 playback row */}
          <div className="p-3 bg-white rounded-md border border-[#E6E4DD] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
              <button
                type="button"
                onClick={() => rollDice(1)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#C85A32] text-white hover:bg-[#B54E28] transition font-mono text-xs font-semibold shadow-2xs cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>+1 Roll</span>
              </button>

              <button
                type="button"
                onClick={() => rollDice(100)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white border border-[#E6E4DD] text-[#1A1917] hover:bg-[#F3F2EC] transition font-mono text-xs font-medium cursor-pointer"
              >
                <span>+100</span>
              </button>

              <button
                type="button"
                onClick={() => rollDice(1000)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-[#1A1917] text-white hover:bg-[#33322E] transition font-mono text-xs font-semibold shadow-2xs cursor-pointer"
              >
                <span>+1,000 Rolls</span>
              </button>

              <button
                type="button"
                onClick={resetDice}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white border border-[#E6E4DD] text-[#585651] hover:text-[#1A1917] hover:bg-[#F3F2EC] transition font-mono text-xs font-medium cursor-pointer"
                title="Reset simulation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>

            {/* Quick Face Buttons inline */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-mono text-[#75736E] shrink-0">Sides:</span>
              <div className="flex items-center gap-1 bg-[#FAF9F6] p-0.5 rounded border border-[#E6E4DD]">
                {[4, 6, 8, 12, 20].map((sides) => (
                  <button
                    key={sides}
                    type="button"
                    onClick={() => {
                      setDiceFaces(sides);
                      setDiceRolls([]);
                      setLastRolled(null);
                    }}
                    className={`px-2 py-0.5 text-xs font-mono font-bold rounded cursor-pointer transition ${
                      diceFaces === sides
                        ? 'bg-[#C85A32] text-white shadow-2xs'
                        : 'text-[#585651] hover:text-[#1A1917]'
                    }`}
                  >
                    D{sides}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Sliders Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {/* 1. Loaded Bias Slider */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-[#1A1917]">Top Face Bias Weight</span>
                <span className="font-mono text-[#C85A32] font-semibold">
                  {diceBiasWeight === 0 ? '0% (Fair)' : `+${(diceBiasWeight * 100).toFixed(0)}% Loaded`}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="0.6"
                step="0.05"
                value={diceBiasWeight}
                onChange={(e) => setDiceBiasWeight(parseFloat(e.target.value))}
                className="w-full accent-[#C85A32] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
                <span>Fair (1/{diceFaces})</span>
                <span className="font-semibold text-[#1A1917]">
                  Top P ≈ {((diceStats.theoreticalProb[diceFaces - 1] || 0) * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            {/* 2. Mean Convergence */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-[#1A1917]">Sample Mean (x̄)</span>
                <span className="font-mono text-[#C85A32] font-semibold">
                  {diceStats.total > 0 ? diceStats.mean.toFixed(3) : '—'}
                </span>
              </div>
              <div className="h-6 flex items-center">
                <div className="w-full bg-white border border-[#E6E4DD] rounded px-2.5 py-1 text-xs font-mono text-[#1A1917] flex justify-between">
                  <span className="text-[#8A8882]">Target E[X]:</span>
                  <span className="font-bold text-[#1A1917]">{diceStats.theoreticalMean.toFixed(2)}</span>
                </div>
              </div>
              <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
                <span>Convergence error:</span>
                <span className="font-semibold text-[#1A1917]">
                  {diceStats.total > 0 ? `|Δ|=${Math.abs(diceStats.mean - diceStats.theoreticalMean).toFixed(4)}` : 'Awaiting rolls'}
                </span>
              </div>
            </div>

            {/* 3. Last Rolled Face */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-[#1A1917]">Last Face Rolled</span>
                <span className="font-mono text-[#C85A32] font-semibold">
                  {lastRolled !== null ? `Face ${lastRolled}` : 'None'}
                </span>
              </div>
              <div className="h-6 flex items-center">
                <div className="w-full bg-white border border-[#E6E4DD] rounded px-2.5 py-1 text-xs font-mono text-[#1A1917] flex justify-between">
                  <span className="text-[#8A8882]">Total in history:</span>
                  <span className="font-bold text-[#C85A32]">{diceStats.total.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
                <span>Die Type:</span>
                <span className="font-semibold text-[#1A1917]">Polyhedral D{diceFaces}</span>
              </div>
            </div>
          </div>

          {/* Presets Row */}
          <div className="pt-2 border-t border-[#E6E4DD]/80 flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11px] font-mono text-[#75736E] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#C85A32]" />
              <span>Presets:</span>
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setDiceFaces(6);
                  setDiceBiasWeight(0);
                  setDiceRolls([]);
                  setLastRolled(null);
                }}
                className={`text-xs font-mono px-2.5 py-1 rounded border transition cursor-pointer ${
                  diceFaces === 6 && diceBiasWeight === 0
                    ? 'bg-[#C85A32] text-white border-[#C85A32]'
                    : 'bg-white border-[#E6E4DD] hover:bg-[#F3F2EC] text-[#1A1917]'
                }`}
              >
                Fair Standard D6
              </button>
              <button
                type="button"
                onClick={() => {
                  setDiceFaces(6);
                  setDiceBiasWeight(0.3);
                  setDiceRolls([]);
                  setLastRolled(null);
                }}
                className={`text-xs font-mono px-2.5 py-1 rounded border transition cursor-pointer ${
                  diceFaces === 6 && diceBiasWeight === 0.3
                    ? 'bg-[#C85A32] text-white border-[#C85A32]'
                    : 'bg-white border-[#E6E4DD] hover:bg-[#F3F2EC] text-[#1A1917]'
                }`}
              >
                Loaded D6 (+30% Top Face)
              </button>
              <button
                type="button"
                onClick={() => {
                  setDiceFaces(20);
                  setDiceBiasWeight(0);
                  setDiceRolls([]);
                  setLastRolled(null);
                }}
                className={`text-xs font-mono px-2.5 py-1 rounded border transition cursor-pointer ${
                  diceFaces === 20 && diceBiasWeight === 0
                    ? 'bg-[#C85A32] text-white border-[#C85A32]'
                    : 'bg-white border-[#E6E4DD] hover:bg-[#F3F2EC] text-[#1A1917]'
                }`}
              >
                Fair D20 Polyhedral
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
