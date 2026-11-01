import React, { useState, useMemo } from 'react';
import {
  RotateCcw,
  Sparkles,
  Layers,
  ArrowRight,
  GitBranch,
  Users,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { MathView } from '../../components/MathView';

type BayesPreset = 'medical' | 'spam' | 'radar' | 'manufacturing';

export const BayesTheoremView: React.FC = () => {
  const [preset, setPreset] = useState<BayesPreset>('medical');

  // Parameters
  const [priorA, setPriorA] = useState<number>(0.01); // P(A) e.g. 1%
  const [sensitivityBgivenA, setSensitivityBgivenA] = useState<number>(0.95); // P(B|A) e.g. 95%
  const [falsePositiveBgivenNotA, setFalsePositiveBgivenNotA] = useState<number>(0.05); // P(B|~A) e.g. 5%

  const loadPreset = (type: BayesPreset) => {
    setPreset(type);
    if (type === 'medical') {
      setPriorA(0.01);
      setSensitivityBgivenA(0.95);
      setFalsePositiveBgivenNotA(0.05);
    } else if (type === 'spam') {
      setPriorA(0.20);
      setSensitivityBgivenA(0.98);
      setFalsePositiveBgivenNotA(0.03);
    } else if (type === 'radar') {
      setPriorA(0.005);
      setSensitivityBgivenA(0.99);
      setFalsePositiveBgivenNotA(0.02);
    } else if (type === 'manufacturing') {
      setPriorA(0.02);
      setSensitivityBgivenA(0.90);
      setFalsePositiveBgivenNotA(0.04);
    }
  };

  // Bayes Computations
  const calculations = useMemo(() => {
    const pA = priorA;
    const pNotA = 1 - pA;
    const pBgivenA = sensitivityBgivenA;
    const pNotBgivenA = 1 - pBgivenA;
    const pBgivenNotA = falsePositiveBgivenNotA;
    const pNotBgivenNotA = 1 - pBgivenNotA;

    // Joint probabilities (Leaves)
    const pA_and_B = pA * pBgivenA; // True Positive
    const pA_and_NotB = pA * pNotBgivenA; // False Negative
    const pNotA_and_B = pNotA * pBgivenNotA; // False Positive
    const pNotA_and_NotB = pNotA * pNotBgivenNotA; // True Negative

    // Total evidence P(B)
    const pB = pA_and_B + pNotA_and_B;

    // Posterior P(A|B)
    const pAgivenB = pB > 0 ? pA_and_B / pB : 0;

    // Natural frequencies out of 10,000 individuals
    const population = 10000;
    const countA = Math.round(population * pA);
    const countNotA = population - countA;
    const countTruePos = Math.round(countA * pBgivenA);
    const countFalseNeg = countA - countTruePos;
    const countFalsePos = Math.round(countNotA * pBgivenNotA);
    const countTrueNeg = countNotA - countFalsePos;
    const countTotalPos = countTruePos + countFalsePos;

    return {
      pA,
      pNotA,
      pBgivenA,
      pNotBgivenA,
      pBgivenNotA,
      pNotBgivenNotA,
      pA_and_B,
      pA_and_NotB,
      pNotA_and_B,
      pNotA_and_NotB,
      pB,
      pAgivenB,
      population,
      countA,
      countNotA,
      countTruePos,
      countFalseNeg,
      countFalsePos,
      countTrueNeg,
      countTotalPos,
    };
  }, [priorA, sensitivityBgivenA, falsePositiveBgivenNotA]);

  return (
    <div className="space-y-6">
      {/* 1. Header & Context */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1917]">
          Bayes' Theorem & Inference
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-[#585651] max-w-3xl leading-relaxed">
          Understand how prior beliefs are updated in light of new evidence to compute posterior probabilities.
          Explore the Base Rate Fallacy, probability trees, and natural frequency population models.
        </p>
      </div>

      {/* 2. Master Formulation Banner */}
      <div className="bg-white rounded-xl border border-[#E6E4DD] p-5 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[#E6E4DD]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C85A32]" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1917]">
              Bayes' Rule for Binary Hypothesis:
            </span>
          </div>

          {/* Color-coded Term Tags */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
            <span className="px-2 py-0.5 rounded bg-[#FAF9F6] border border-[#E6E4DD] text-[#585651]">
              Prior: <strong className="text-[#1A1917]">P(A)</strong>
            </span>
            <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800">
              Likelihood: <strong>P(B|A)</strong>
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-800">
              False Alarm: <strong>P(B|¬A)</strong>
            </span>
            <span className="px-2 py-0.5 rounded bg-[#FBF4F0] border border-[#C85A32]/30 text-[#C85A32] font-bold">
              Posterior: P(A|B)
            </span>
          </div>
        </div>

        {/* Formula Display with KaTeX */}
        <div className="p-3.5 bg-[#FAF9F6] rounded-xl border border-[#E6E4DD] overflow-x-auto text-center font-semibold text-xs sm:text-sm text-[#1A1917]">
          <MathView
            math="P(A \mid B) = \frac{P(B \mid A) \cdot P(A)}{P(B)} = \frac{P(B \mid A) \cdot P(A)}{P(B \mid A) P(A) + P(B \mid \neg A) P(\neg A)}"
            displayMode={true}
          />
        </div>
      </div>

      {/* 3. Main Stage: Controls & Tree on Left, Posterior & Frequencies on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (6 Cols): Presets, Sliders & Probability Tree Diagram */}
        <div className="lg:col-span-6 space-y-5">
          {/* Controls Card */}
          <div className="bg-white rounded-xl border border-[#E6E4DD] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E4DD]">
              <h3 className="text-sm font-bold text-[#1A1917]">Parameters & Scenarios</h3>
              <select
                value={preset}
                onChange={(e) => loadPreset(e.target.value as BayesPreset)}
                className="bg-[#FAF9F6] border border-[#E6E4DD] text-xs rounded-md px-2.5 py-1 text-[#1A1917] focus:outline-none focus:border-[#C85A32] cursor-pointer"
              >
                <option value="medical">Medical Screening (Rare Condition)</option>
                <option value="spam">Spam Email Filter</option>
                <option value="radar">Radar Target Detection</option>
                <option value="manufacturing">Manufacturing Flaw Inspection</option>
              </select>
            </div>

            <div className="space-y-4">
              {/* Prior P(A) */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-[#1A1917]">
                    Prior Probability P(A) [Base Rate / Prevalence]:
                  </span>
                  <span className="font-mono font-bold text-[#1A1917] bg-[#FAF9F6] px-2 py-0.5 rounded border border-[#E6E4DD]">
                    {(priorA * 100).toFixed(1)}% ({priorA.toFixed(4)})
                  </span>
                </div>
                <input
                  type="range"
                  min="0.001"
                  max="0.25"
                  step="0.002"
                  value={priorA}
                  onChange={(e) => setPriorA(parseFloat(e.target.value))}
                  className="w-full accent-[#C85A32] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-[#8A8882]">
                  <span>0.1% (Very Rare)</span>
                  <span>10%</span>
                  <span>25%</span>
                </div>
              </div>

              {/* Sensitivity P(B|A) */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-[#1A1917]">
                    Sensitivity P(B | A) [True Positive Rate]:
                  </span>
                  <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {(sensitivityBgivenA * 100).toFixed(1)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.70"
                  max="0.999"
                  step="0.005"
                  value={sensitivityBgivenA}
                  onChange={(e) => setSensitivityBgivenA(parseFloat(e.target.value))}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-[#8A8882]">
                  <span>70%</span>
                  <span>95%</span>
                  <span>99.9%</span>
                </div>
              </div>

              {/* False Positive Rate P(B|~A) */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-[#1A1917]">
                    False Alarm P(B | ¬A) [False Positive Rate]:
                  </span>
                  <span className="font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {(falsePositiveBgivenNotA * 100).toFixed(1)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0.005"
                  max="0.20"
                  step="0.005"
                  value={falsePositiveBgivenNotA}
                  onChange={(e) => setFalsePositiveBgivenNotA(parseFloat(e.target.value))}
                  className="w-full accent-amber-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-[#8A8882]">
                  <span>0.5% (Low)</span>
                  <span>5%</span>
                  <span>20%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Probability Tree Diagram */}
          <div className="bg-[#FAF9F6] rounded-xl border border-[#E6E4DD] p-5 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[#E6E4DD]">
              <GitBranch className="w-4 h-4 text-[#C85A32]" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1917]">
                Probability Tree Diagram
              </h3>
            </div>

            {/* Tree Branches Structure */}
            <div className="space-y-3 text-xs font-mono">
              {/* Branch 1: Condition A */}
              <div className="p-3 bg-white rounded-lg border border-[#E6E4DD] space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#1A1917] pb-1 border-b border-[#F0EEE8]">
                  <span>Condition A [Prior]</span>
                  <span className="text-[#C85A32]">P(A) = {(calculations.pA * 100).toFixed(2)}%</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-900">
                    <div className="font-semibold">Test Positive (B)</div>
                    <div className="text-[10px] text-emerald-700">True Positive (A ∩ B)</div>
                    <div className="font-bold text-xs mt-0.5">
                      {(calculations.pA_and_B * 100).toFixed(3)}%
                    </div>
                  </div>
                  <div className="p-2 rounded bg-[#FAF9F6] border border-[#E6E4DD] text-[#585651]">
                    <div className="font-semibold">Test Negative (¬B)</div>
                    <div className="text-[10px] text-[#8A8882]">False Negative (A ∩ ¬B)</div>
                    <div className="font-bold text-xs mt-0.5">
                      {(calculations.pA_and_NotB * 100).toFixed(3)}%
                    </div>
                  </div>
                </div>
              </div>

              {/* Branch 2: Condition ~A */}
              <div className="p-3 bg-white rounded-lg border border-[#E6E4DD] space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-[#1A1917] pb-1 border-b border-[#F0EEE8]">
                  <span>No Condition ¬A [Complement]</span>
                  <span className="text-[#585651]">P(¬A) = {(calculations.pNotA * 100).toFixed(2)}%</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-900">
                    <div className="font-semibold">Test Positive (B)</div>
                    <div className="text-[10px] text-amber-700">False Alarm (¬A ∩ B)</div>
                    <div className="font-bold text-xs mt-0.5">
                      {(calculations.pNotA_and_B * 100).toFixed(3)}%
                    </div>
                  </div>
                  <div className="p-2 rounded bg-[#FAF9F6] border border-[#E6E4DD] text-[#585651]">
                    <div className="font-semibold">Test Negative (¬B)</div>
                    <div className="text-[10px] text-[#8A8882]">True Negative (¬A ∩ ¬B)</div>
                    <div className="font-bold text-xs mt-0.5">
                      {(calculations.pNotA_and_NotB * 100).toFixed(3)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column (6 Cols): Posterior Probability & Natural Frequency Model */}
        <div className="lg:col-span-6 space-y-5">
          {/* Prominent Posterior Card */}
          <div className="bg-white rounded-xl border-2 border-[#C85A32]/40 p-5 sm:p-6 shadow-sm space-y-4 bg-gradient-to-br from-white to-[#FBF4F0]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#C85A32]">
                Updated Posterior Belief
              </span>
              <span className="text-xs font-mono text-[#75736E]">Given Evidence B</span>
            </div>

            <div>
              <div className="text-4xl sm:text-5xl font-mono font-extrabold text-[#C85A32] tracking-tight">
                {(calculations.pAgivenB * 100).toFixed(1)}%
              </div>
              <div className="text-sm font-semibold text-[#1A1917] mt-1 font-mono">
                P(A | B) = {calculations.pAgivenB.toFixed(4)}
              </div>
            </div>

            <p className="text-xs text-[#585651] leading-relaxed pt-2 border-t border-[#E6E4DD]">
              Given a positive test result (B), the probability that event A actually occurred is{' '}
              <strong className="text-[#C85A32]">{(calculations.pAgivenB * 100).toFixed(1)}%</strong>.
            </p>

            {/* Substitution Step */}
            <div className="p-3 bg-white rounded-lg border border-[#E6E4DD] text-xs font-mono space-y-1">
              <div className="text-[#75736E] text-[10px] uppercase">Numerator / Denominator:</div>
              <div className="flex items-center justify-between font-bold text-[#1A1917]">
                <span>P(A ∩ B) = {(calculations.pA_and_B * 100).toFixed(2)}%</span>
                <span className="text-[#C85A32]">÷</span>
                <span>P(B) = {(calculations.pB * 100).toFixed(2)}%</span>
              </div>
            </div>
          </div>

          {/* Natural Frequency Population Breakdown (10,000 Individuals) */}
          <div className="bg-white rounded-xl border border-[#E6E4DD] p-5 shadow-2xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-[#E6E4DD]">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#C85A32]" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1917]">
                  Natural Frequencies (10,000 Population)
                </h3>
              </div>
              <span className="text-[11px] font-mono text-[#75736E]">Intuitive Model</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <span className="text-[10px] font-mono uppercase text-emerald-800 block">
                  True Positives
                </span>
                <div className="text-xl font-mono font-bold text-emerald-900 mt-0.5">
                  {calculations.countTruePos}
                </div>
                <div className="text-[10px] text-emerald-700 mt-0.5">Have A & Test Positive</div>
              </div>

              <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                <span className="text-[10px] font-mono uppercase text-amber-800 block">
                  False Positives (Alarms)
                </span>
                <div className="text-xl font-mono font-bold text-amber-900 mt-0.5">
                  {calculations.countFalsePos}
                </div>
                <div className="text-[10px] text-amber-700 mt-0.5">No A & Test Positive</div>
              </div>
            </div>

            <div className="p-3 bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] text-xs font-mono flex items-center justify-between">
              <span className="text-[#585651]">Total Positive Tests (B):</span>
              <span className="font-bold text-[#1A1917]">
                {calculations.countTruePos} + {calculations.countFalsePos} ={' '}
                <strong className="text-[#C85A32]">{calculations.countTotalPos} people</strong>
              </span>
            </div>

            <div className="text-[11px] text-[#585651] font-mono text-center">
              Out of {calculations.countTotalPos} positive tests, only {calculations.countTruePos} actually have condition A ({((calculations.countTruePos / (calculations.countTotalPos || 1)) * 100).toFixed(1)}%).
            </div>
          </div>

          {/* Base Rate Fallacy Callout Box */}
          <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed space-y-1">
              <span className="font-bold text-amber-900 block">
                The Base Rate Fallacy Explained:
              </span>
              <p className="text-amber-800">
                Notice that even with a test that is <strong>{(sensitivityBgivenA * 100).toFixed(0)}% accurate</strong> and has only a <strong>{(falsePositiveBgivenNotA * 100).toFixed(0)}% false alarm rate</strong>, a positive test result only gives a <strong>{(calculations.pAgivenB * 100).toFixed(1)}% chance</strong> of actually having the condition!
              </p>
              <p className="text-amber-800">
                Why? Because the condition is rare (prior <strong>{(priorA * 100).toFixed(1)}%</strong>), so false alarms from the healthy majority easily outnumber the true positives from the sick minority.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
