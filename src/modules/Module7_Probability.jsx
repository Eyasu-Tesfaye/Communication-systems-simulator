/**
 * Module: Probability & Statistics
 * Application: Signal Lab Workspace
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
  ArrowRight,
} from 'lucide-react';
import { MODULES } from '../data/modules';
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

  // Find previous and next modules (06 Euler, 01 Convolution)
  const currentMod = MODULES.find((m) => m.moduleNumber === 7);
  const prevMod = MODULES.find((m) => m.moduleNumber === 6);
  const nextMod = MODULES.find((m) => m.moduleNumber === 1);

  const modules = [
    {
      id: 'variables',
      num: '01',
      title: 'Random Variables',
      subtitle: 'Discrete vs. Continuous & Dice Lab',
      icon: Layers,
    },
    {
      id: 'computations',
      num: '02',
      title: 'Function Calculator',
      subtitle: 'PMF, CDF & PDF Definite Queries',
      icon: Calculator,
    },
    {
      id: 'playground',
      num: '03',
      title: 'Distribution Playground',
      subtitle: '6 Core Models & Live Simulation',
      icon: Sliders,
    },
    {
      id: 'descriptive',
      num: '04',
      title: 'Descriptive Stats',
      subtitle: 'Moments, Outlier Engine & SS Table',
      icon: BarChart3,
    },
  ];

  return (
    <div className="min-h-screen bg-white text-[#1A1917] flex flex-col">
      {/* 1. Top Breadcrumb & Return Action */}
      <div className="border-b border-[#E6E4DD] bg-[#FAF9F6]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-[#75736E]">
            {onNavigateHome ? (
              <>
                <button
                  type="button"
                  onClick={onNavigateHome}
                  className="hover:text-[#1A1917] transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C85A32] rounded cursor-pointer"
                >
                  SIGNAL LAB
                </button>
                <span aria-hidden="true">/</span>
                <button
                  type="button"
                  onClick={onNavigateHome}
                  className="hover:text-[#1A1917] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C85A32] rounded cursor-pointer"
                >
                  WORKSPACE
                </button>
                <span aria-hidden="true">/</span>
              </>
            ) : (
              <>
                <span>SIGNAL LAB</span>
                <span aria-hidden="true">/</span>
                <span>WORKSPACE</span>
                <span aria-hidden="true">/</span>
              </>
            )}
            <span className="text-[#C85A32] font-semibold">
              07 Probability & Statistics
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Formula Reference Modal Button */}
            <button
              type="button"
              onClick={() => setIsFormulaModalOpen(true)}
              className="px-3 py-1.5 bg-white hover:bg-[#FAF9F6] text-[#585651] hover:text-[#1A1917] text-xs font-semibold rounded-md border border-[#E6E4DD] shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#C85A32]" />
              <span>Formula Reference</span>
            </button>

            {/* Export Standalone HTML Button */}
            <button
              type="button"
              onClick={exportStandaloneHtml}
              className="px-3 py-1.5 bg-white hover:bg-[#FAF9F6] text-[#585651] hover:text-[#1A1917] text-xs font-semibold rounded-md border border-[#E6E4DD] shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Download self-contained offline HTML file"
            >
              <Download className="w-3.5 h-3.5 text-[#8A8882]" />
              <span>Export HTML</span>
            </button>

            {/* Return to Workspace Hub */}
            {onNavigateHome && (
              <button
                type="button"
                onClick={onNavigateHome}
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#1A1917] hover:text-[#C85A32] transition-colors self-start sm:self-auto focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C85A32] rounded py-1 px-2 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to workspace</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Workspace Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        {/* Module Header Bar */}
        <div className="pb-6 border-b border-[#E6E4DD] flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono font-bold tracking-wider text-[#C85A32] bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/20">
                MODULE 07
              </span>
              <span className="text-xs text-[#75736E] font-medium">Interactive Education</span>
              <span className="text-xs text-[#8A8882]">·</span>
              <span className="text-[11px] font-mono font-medium text-[#75736E] bg-[#FAF9F6] border border-[#E6E4DD] px-1.5 py-0.5 rounded">
                FOUNDATION ARCHITECTURE
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-semibold tracking-tight text-[#1A1917]">
              Probability & Statistics
            </h1>
            <p className="mt-2 text-sm sm:text-base font-body text-[#585651] max-w-3xl leading-relaxed">
              Explore fundamental concepts of probability, random variables, and statistical distributions through interactive calculations, visualizations, and simulations.
            </p>
          </div>

          {/* Quick switcher to prev/next module */}
          {onNavigateModule && (
            <div className="flex items-center gap-2 shrink-0">
              {prevMod && (
                <button
                  type="button"
                  onClick={() => onNavigateModule(prevMod.path)}
                  className="px-3 py-1.5 border border-[#E6E4DD] hover:bg-[#FAF9F6] text-xs font-medium text-[#585651] hover:text-[#1A1917] rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
                  title={`Previous: ${prevMod.name}`}
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Prev ({prevMod.index})</span>
                </button>
              )}
              {nextMod && (
                <button
                  type="button"
                  onClick={() => onNavigateModule(nextMod.path)}
                  className="px-3 py-1.5 border border-[#E6E4DD] hover:bg-[#FAF9F6] text-xs font-medium text-[#585651] hover:text-[#1A1917] rounded-md transition-colors flex items-center gap-1.5 cursor-pointer"
                  title={`Next: ${nextMod.name}`}
                >
                  <span>Next ({nextMod.index})</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* 3. Four Core Architecture Modules Navigation Bar */}
        <nav aria-label="Probability & Statistics Submodules">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {modules.map((m) => {
              const Icon = m.icon;
              const isSelected = activeModule === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setActiveModule(m.id)}
                  className={`p-3.5 rounded-lg text-left border transition-all cursor-pointer relative overflow-hidden group ${
                    isSelected
                      ? 'bg-[#FBF4F0] border-[#C85A32] ring-1 ring-[#C85A32]/30 shadow-xs'
                      : 'bg-white border-[#E6E4DD] hover:border-[#D1CFCE] hover:bg-[#FAF9F6] shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        isSelected
                          ? 'bg-[#C85A32] text-white'
                          : 'bg-[#FAF9F6] text-[#75736E] border border-[#E6E4DD] group-hover:bg-[#F3F2EC]'
                      }`}
                    >
                      MOD {m.num}
                    </span>
                    <Icon
                      className={`w-4 h-4 transition-colors ${
                        isSelected ? 'text-[#C85A32]' : 'text-[#8A8882] group-hover:text-[#585651]'
                      }`}
                    />
                  </div>
                  <div
                    className={`text-xs sm:text-sm font-semibold tracking-tight block ${
                      isSelected ? 'text-[#1A1917] font-bold' : 'text-[#585651] group-hover:text-[#1A1917]'
                    }`}
                  >
                    {m.title}
                  </div>
                  <div className="text-[11px] text-[#75736E] truncate mt-0.5">{m.subtitle}</div>
                  {isSelected && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#C85A32]" />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* 4. Active Module Stage */}
        <div className="animate-in fade-in duration-100 pb-8">
          {activeModule === 'variables' && <Module1_RandomVariables />}
          {activeModule === 'computations' && <Module2_Computations />}
          {activeModule === 'playground' && <Module3_Playground />}
          {activeModule === 'descriptive' && <Module4_DescriptiveStats />}
        </div>
      </main>

      {/* 5. Formula Reference KaTeX Modal */}
      <FormulaReferenceModal
        isOpen={isFormulaModalOpen}
        onClose={() => setIsFormulaModalOpen(false)}
      />
    </div>
  );
}
