import React from 'react';
import { X, BookOpen, Layers, Zap, Activity } from 'lucide-react';

export interface TheoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TheoryModal: React.FC<TheoryModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-neutral-900/60 backdrop-blur-xs">
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-white rounded-2xl shadow-xl border border-neutral-200 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-neutral-100 bg-neutral-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-700">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">Signals & Systems Foundations</h2>
              <p className="text-xs text-neutral-500">Mathematical formulations and evaluation invariants</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 text-xs text-neutral-700 leading-relaxed">
          <section className="p-4 rounded-xl bg-neutral-50/80 border border-neutral-200/80">
            <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2 mb-2">
              <Layers className="w-4 h-4 text-amber-600" /> 1. Even and Odd Decomposition
            </h3>
            <p className="mb-2">Every signal decomposes into an Even component and an Odd component:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-2 font-mono">
              <div className="p-3 bg-white rounded-lg border border-neutral-200">
                <div className="text-[11px] text-amber-700 font-bold mb-1">Even Component x_e(t)</div>
                <div className="text-xs font-semibold">x_e(t) = ½ · [ x(t) + x(-t) ]</div>
              </div>
              <div className="p-3 bg-white rounded-lg border border-neutral-200">
                <div className="text-[11px] text-blue-700 font-bold mb-1">Odd Component x_o(t)</div>
                <div className="text-xs font-semibold">x_o(t) = ½ · [ x(t) - x(-t) ]</div>
              </div>
            </div>
            <p className="text-[11px] text-neutral-600">
              <strong>Orthogonality:</strong> ∫ x_e(t)·x_o(t) dt = 0, so E_total = E_even + E_odd.
            </p>
          </section>

          <section className="p-4 rounded-xl bg-neutral-50/80 border border-neutral-200/80">
            <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-amber-600" /> 2. Signal Energy & Power
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-2 font-mono text-xs">
              <div className="p-3 bg-white rounded-lg border border-neutral-200">
                <div className="text-[11px] text-neutral-500 font-sans font-semibold mb-1">Continuous-Time</div>
                <div>E = ∫ |x(t)|² dt</div>
                <div className="mt-1">P = lim (1/2T) ∫ |x(t)|² dt</div>
              </div>
              <div className="p-3 bg-white rounded-lg border border-neutral-200">
                <div className="text-[11px] text-neutral-500 font-sans font-semibold mb-1">Discrete-Time</div>
                <div>E = ∑ |x[n]|²</div>
                <div className="mt-1">P = lim [1/(2N+1)] ∑ |x[n]|²</div>
              </div>
            </div>
          </section>

          <section className="p-4 rounded-xl bg-neutral-50/80 border border-neutral-200/80">
            <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-amber-600" /> 3. Periodicity Criteria
            </h3>
            <p className="text-xs text-neutral-600">
              Continuous sinusoids are always periodic with T₀ = 1/f₀. Discrete sinusoids x[n] = cos(2π f₀ n) are periodic <em>if and only if</em> f₀ is a rational number m/N.
            </p>
          </section>
        </div>

        <div className="px-6 py-3.5 border-t border-neutral-100 bg-neutral-50 flex items-center justify-end">
          <button onClick={onClose} className="px-4 py-1.5 text-xs font-semibold text-white bg-neutral-900 rounded-lg cursor-pointer">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
