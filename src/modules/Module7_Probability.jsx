/**
 * Module: Probability & Statistics
 * Application: ProbStat Studio v2.0
 * Filename: Module7_Probability.jsx
 *
 * Professional Educational Probability & Statistics Workbench
 * 4 Core Architecture Modules:
 * 1. Random Variables (Discrete vs Continuous & Dice Lab)
 * 2. PMF, CDF & PDF Computations (Function Query Calculator)
 * 3. Distribution Playground (6 Core Distributions + CDF Workbench)
 * 4. Descriptive Stats & Moment Engine (Data Input, Tukey Outliers, Box Plot, SS Table)
 */

import React, { useState } from 'react';
import {
  Sigma,
  Layers,
  Calculator,
  Sliders,
  BarChart3,
  BookOpen,
  Download,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { Module1_RandomVariables } from './probability/Module1_RandomVariables';
import { Module2_Computations } from './probability/Module2_Computations';
import { Module3_Playground } from './probability/Module3_Playground';
import { Module4_DescriptiveStats } from './probability/Module4_DescriptiveStats';
import { FormulaReferenceModal } from './probability/FormulaReferenceModal';
import { exportStandaloneHtml } from './probability/exportHtml';

export default function Module7_Probability({
  onNavigateHome,
  onNavigateModule,
  isInstructorMode = false,
}) {
  // 4 Core Navigation Modules
  const [activeModule, setActiveModule] = useState('variables');
  const [isFormulaModalOpen, setIsFormulaModalOpen] = useState(false);

  const modules = [
    {
      id: 'variables',
      num: '01',
      title: 'Random Variables',
      subtitle: 'Discrete vs. Continuous',
      icon: Layers,
    },
    {
      id: 'computations',
      num: '02',
      title: 'Function Calculator',
      subtitle: 'PMF, CDF & PDF Queries',
      icon: Calculator,
    },
    {
      id: 'playground',
      num: '03',
      title: 'Distribution Playground',
      subtitle: '6 Core Models & Simulation',
      icon: Sliders,
    },
    {
      id: 'descriptive',
      num: '04',
      title: 'Descriptive Stats',
      subtitle: 'Moments & Outlier Engine',
      icon: BarChart3,
    },
  ];

  return (
    <div className="w-full min-h-screen bg-[#fcfbf9] text-slate-800 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-2">
      {/* 1. Top Application Header */}
      <header className="pb-5 mb-6 border-b border-slate-200/90 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          {/* Sigma Gradient Badge */}
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 via-orange-600 to-amber-700 flex items-center justify-center text-white shadow-md shadow-orange-500/20 shrink-0">
            <Sigma className="w-6 h-6 stroke-[2.25]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 font-sans">
                ProbStat Studio
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300">
                v2.0
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Educational Probability & Statistics Calculator, Live Visualizer & Simulation Workbench
            </p>
          </div>
        </div>

        {/* Action Buttons: Formula Reference, Export HTML, Return */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Formula Reference Modal Button */}
          <button
            type="button"
            onClick={() => setIsFormulaModalOpen(true)}
            className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-600" />
            <span>Formula Reference</span>
          </button>

          {/* Export Single HTML File Button */}
          <button
            type="button"
            onClick={exportStandaloneHtml}
            className="px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Download self-contained offline HTML file"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export HTML</span>
          </button>

          {/* Return to Signal Lab Hub */}
          {onNavigateHome && (
            <button
              type="button"
              onClick={onNavigateHome}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Workspace</span>
            </button>
          )}
        </div>
      </header>

      {/* 2. Four Core Architecture Modules Navigation Bar */}
      <nav aria-label="ProbStat Studio Modules" className="mb-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {modules.map((m) => {
            const Icon = m.icon;
            const isSelected = activeModule === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setActiveModule(m.id)}
                className={`p-3.5 rounded-2xl text-left border transition-all cursor-pointer relative overflow-hidden group ${
                  isSelected
                    ? 'bg-white border-amber-600 ring-2 ring-amber-500/20 shadow-sm'
                    : 'bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white shadow-2xs'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      isSelected
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'
                    }`}
                  >
                    MOD {m.num}
                  </span>
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isSelected ? 'text-amber-600' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                </div>
                <div
                  className={`text-xs sm:text-sm font-bold tracking-tight block ${
                    isSelected ? 'text-slate-900 font-extrabold' : 'text-slate-700'
                  }`}
                >
                  {m.title}
                </div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">{m.subtitle}</div>
                {isSelected && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-orange-600" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* 3. Active Module Stage */}
      <main className="animate-in fade-in duration-150 pb-12">
        {activeModule === 'variables' && <Module1_RandomVariables />}
        {activeModule === 'computations' && <Module2_Computations />}
        {activeModule === 'playground' && <Module3_Playground />}
        {activeModule === 'descriptive' && <Module4_DescriptiveStats />}
      </main>

      {/* 4. Formula Reference KaTeX Modal */}
      <FormulaReferenceModal
        isOpen={isFormulaModalOpen}
        onClose={() => setIsFormulaModalOpen(false)}
      />
    </div>
  );
}
