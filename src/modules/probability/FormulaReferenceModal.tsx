import React from 'react';
import { X, BookOpen, Sigma, Layers, Compass } from 'lucide-react';
import { MathView } from '../../components/MathView';

interface FormulaReferenceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FormulaReferenceModal: React.FC<FormulaReferenceModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="formula-ref-title"
    >
      <div className="relative w-full max-w-4xl max-h-[88vh] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-[#fcfbf9]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-700 flex items-center justify-center text-white shadow-xs">
              <Sigma className="w-4 h-4" />
            </div>
            <div>
              <h2 id="formula-ref-title" className="text-base font-bold text-slate-900">
                Formula Reference & Axiomatic Foundations
              </h2>
              <p className="text-xs text-slate-500">
                Textbook-grade probability theorems, moment formulas, and distribution profiles
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close formula reference"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 text-sm text-slate-800">
          {/* Section 1: Kolmogorov Axioms & Core Rules */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-amber-700">
              <Compass className="w-3.5 h-3.5" />
              <span>1. Kolmogorov's Probability Axioms & Fundamental Laws</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 bg-[#fcfbf9] rounded-xl border border-slate-200/90 space-y-1">
                <span className="text-[11px] font-mono font-semibold text-slate-600 block">
                  Axiom 1: Non-Negativity
                </span>
                <MathView math="P(E) \ge 0, \quad \forall E \subseteq \Omega" displayMode={true} />
              </div>
              <div className="p-3 bg-[#fcfbf9] rounded-xl border border-slate-200/90 space-y-1">
                <span className="text-[11px] font-mono font-semibold text-slate-600 block">
                  Axiom 2: Total Probability
                </span>
                <MathView math="P(\Omega) = 1, \quad P(\emptyset) = 0" displayMode={true} />
              </div>
              <div className="p-3 bg-[#fcfbf9] rounded-xl border border-slate-200/90 space-y-1">
                <span className="text-[11px] font-mono font-semibold text-slate-600 block">
                  Axiom 3: Countable Additivity
                </span>
                <MathView math="P\left(\bigcup_i E_i\right) = \sum_i P(E_i)" displayMode={true} />
              </div>
            </div>
          </div>

          {/* Section 2: Bayes' Rule & Linearity of Expectation */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-amber-700">
              <Layers className="w-3.5 h-3.5" />
              <span>2. Conditional Probability, Bayes' Theorem & Expectation</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 bg-[#fcfbf9] rounded-xl border border-slate-200/90 space-y-2">
                <span className="text-xs font-bold text-slate-900 block">Bayes' Rule with Law of Total Probability:</span>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <MathView
                    math="P(A \mid B) = \frac{P(B \mid A)P(A)}{P(B)} = \frac{P(B \mid A)P(A)}{\sum_j P(B \mid A_j)P(A_j)}"
                    displayMode={true}
                  />
                </div>
              </div>
              <div className="p-3.5 bg-[#fcfbf9] rounded-xl border border-slate-200/90 space-y-2">
                <span className="text-xs font-bold text-slate-900 block">Linearity of Expectation & Variance:</span>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <MathView
                    math="\mathbb{E}[aX + bY] = a\mathbb{E}[X] + b\mathbb{E}[Y], \quad \operatorname{Var}(aX + b) = a^2\operatorname{Var}(X)"
                    displayMode={true}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Distribution Reference Table */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-amber-700">
              <BookOpen className="w-3.5 h-3.5" />
              <span>3. The 6 Core Distribution Models</span>
            </div>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-[#fcfbf9] text-slate-700 font-mono text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Distribution</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">PMF / PDF Formula</th>
                    <th className="py-2.5 px-3">Mean <MathView math="\mathbb{E}[X]" /></th>
                    <th className="py-2.5 px-3">Variance <MathView math="\operatorname{Var}(X)" /></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-slate-900">Bernoulli ($p$)</td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono">Discrete</td>
                    <td className="py-2.5 px-3 font-mono"><MathView math="P(X=k) = p^k (1-p)^{1-k}" /></td>
                    <td className="py-2.5 px-3 font-mono"><MathView math="p" /></td>
                    <td className="py-2.5 px-3 font-mono"><MathView math="p(1-p)" /></td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-slate-900">Binomial ($n, p$)</td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono">Discrete</td>
                    <td className="py-2.5 px-3 font-mono"><MathView math="\binom{n}{k} p^k (1-p)^{n-k}" /></td>
                    <td className="py-2.5 px-3 font-mono"><MathView math="np" /></td>
                    <td className="py-2.5 px-3 font-mono"><MathView math="np(1-p)" /></td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-slate-900">Poisson ($\lambda$)</td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono">Discrete</td>
                    <td className="py-2.5 px-3 font-mono"><MathView math="\frac{\lambda^k e^{-\lambda}}{k!}" /></td>
                    <td className="py-2.5 px-3 font-mono"><MathView math="\lambda" /></td>
                    <td className="py-2.5 px-3 font-mono"><MathView math="\lambda" /></td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-slate-900">Uniform $[a, b]$</td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono">Continuous</td>
                    <td className="py-2.5 px-3 font-mono"><MathView math="f(x) = \frac{1}{b-a}" /></td>
                    <td className="py-2.5 px-3 font-mono"><MathView math="\frac{a+b}{2}" /></td>
                    <td className="py-2.5 px-3 font-mono"><MathView math="\frac{(b-a)^2}{12}" /></td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-slate-900">Exponential ($\lambda$)</td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono">Continuous</td>
                    <td className="py-2.5 px-3 font-mono"><MathView math="\lambda e^{-\lambda x}" /></td>
                    <td className="py-2.5 px-3 font-mono"><MathView math="\frac{1}{\lambda}" /></td>
                    <td className="py-2.5 px-3 font-mono"><MathView math="\frac{1}{\lambda^2}" /></td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-bold text-slate-900">Normal ($\mu, \sigma$)</td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono">Continuous</td>
                    <td className="py-2.5 px-3 font-mono"><MathView math="\frac{1}{\sigma\sqrt{2\pi}} e^{-\frac{(x-\mu)^2}{2\sigma^2}}" /></td>
                    <td className="py-2.5 px-3 font-mono"><MathView math="\mu" /></td>
                    <td className="py-2.5 px-3 font-mono"><MathView math="\sigma^2" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-200 bg-[#fcfbf9]">
          <span className="text-xs font-mono text-slate-500">ProbStat Studio v2.0 · KaTeX Typeset</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            Close Reference
          </button>
        </div>
      </div>
    </div>
  );
};
