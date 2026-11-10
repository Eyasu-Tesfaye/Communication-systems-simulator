import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  SlidersHorizontal,
  BookOpen,
  Layers,
  Info,
  CheckCircle2,
} from 'lucide-react';
import { AM_MODULES, AMSubTopic } from '../../data/modules';
import { ModuleGlyph } from '../../components/ModuleGlyphs';
import { MathView } from '../../components/MathView';

interface Module2_3_SSBProps {
  onNavigateHome: () => void;
  onNavigateModule: (path: string) => void;
}

export const Module2_3_SSB: React.FC<Module2_3_SSBProps> = ({
  onNavigateHome,
  onNavigateModule,
}) => {
  const subTopic: AMSubTopic = AM_MODULES[2]; // Module 2.3 SSB
  const [activeParamIndex, setActiveParamIndex] = useState<number>(0);

  return (
    <div className="space-y-6">
      {/* 1. Main Content Container */}
      <div className="py-2">
        {/* Module Header Bar */}
        <div className="pb-6 border-b border-[#E6E4DD] flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-mono font-bold tracking-wider text-[#C85A32] bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/25">
                MODULE 2.3
              </span>
              <span className="text-xs text-[#75736E] font-medium font-mono">{subTopic.tag}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1917]">
              {subTopic.name}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-[#585651] max-w-3xl leading-relaxed">
              {subTopic.description}
            </p>
          </div>

          {/* Quick switcher to next/prev */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigateModule('/am/dsb-sc')}
              className="px-3 py-1.5 border border-[#E6E4DD] hover:bg-[#FAF9F6] text-xs font-medium text-[#585651] hover:text-[#1A1917] rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Previous: DSB-SC (2.2)"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>DSB-SC (2.2)</span>
            </button>
            <button
              onClick={() => onNavigateModule('/am/vsb')}
              className="px-3 py-1.5 border border-[#E6E4DD] hover:bg-[#FAF9F6] text-xs font-semibold text-[#1A1917] hover:border-[#C85A32]/40 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Next: VSB (2.4)"
            >
              <span>Next: VSB (2.4)</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Technical Notice Banner */}
        <div className="mt-6 p-3.5 sm:p-4 rounded-md bg-[#FAF9F6] border border-[#E6E4DD] flex items-start gap-3">
          <Info className="w-4 h-4 text-[#C85A32] shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-[#585651] leading-relaxed">
            <span className="font-semibold text-[#1A1917]">SSB Spectral Efficiency: </span>
            Since the upper and lower sidebands of a real message contain identical spectral information, transmitting only one sideband (USB or LSB) cuts RF bandwidth by exactly 50% ($B = W$). Generation requires either high-Q crystal lattice bandpass filters or a 90° Hilbert transform phase-shift network.
          </div>
        </div>

        {/* 3. Schematic & Analytics Grid */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Stage (8 Columns) */}
          <div className="lg:col-span-8 bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E6E4DD]">
              <div className="flex items-center gap-2">
                <ModuleGlyph id="ssb" className="w-4 h-4" accent={true} />
                <h2 className="text-xs font-bold tracking-tight text-[#1A1917] uppercase font-mono">
                  Hartley Phase-Shift Generation Architecture
                </h2>
              </div>
              <span className="text-[11px] font-mono text-[#8A8882]">STAGE · SCHEMATIC MODEL</span>
            </div>

            {/* Canvas Schematic Area */}
            <div className="relative w-full min-h-[260px] sm:min-h-[300px] bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden flex items-center justify-center p-4">
              <svg
                viewBox="0 0 520 220"
                className="w-full h-full max-h-[65vh] select-none"
                aria-label="SSB Hartley 90° Phase-Shift Modulator schematic"
              >
                {/* Input Split */}
                <circle cx="50" cy="110" r="3" fill="#1A1917" />
                <text x="45" y="90" className="text-[11px] font-mono font-bold fill-[#1A1917]">m(t)</text>
                <line x1="50" y1="110" x2="110" y2="60" stroke="#585651" strokeWidth="1.5" />
                <line x1="50" y1="110" x2="110" y2="160" stroke="#585651" strokeWidth="1.5" />

                {/* In-phase branch */}
                <rect x="110" y="42" width="75" height="36" rx="4" fill="#FFFFFF" stroke="#D1CFCE" strokeWidth="1.25" />
                <text x="147" y="64" textAnchor="middle" className="text-[10px] font-mono font-bold fill-[#1A1917]">cos(2πfct)</text>
                <line x1="185" y1="60" x2="270" y2="60" stroke="#1A1917" strokeWidth="1.5" />

                {/* Quadrature branch with -90° Hilbert Transform */}
                <rect x="90" y="142" width="60" height="36" rx="4" fill="#FAF9F6" stroke="#C85A32" strokeWidth="1.25" />
                <text x="120" y="164" textAnchor="middle" className="text-[9px] font-mono font-bold fill-[#C85A32]">-90° (m̂)</text>
                <line x1="150" y1="160" x2="185" y2="160" stroke="#585651" strokeWidth="1.5" />

                <rect x="185" y="142" width="75" height="36" rx="4" fill="#FFFFFF" stroke="#D1CFCE" strokeWidth="1.25" />
                <text x="222" y="164" textAnchor="middle" className="text-[10px] font-mono font-bold fill-[#1A1917]">sin(2πfct)</text>
                <line x1="260" y1="160" x2="310" y2="160" stroke="#1A1917" strokeWidth="1.5" />

                {/* Summation / Subtraction Node */}
                <circle cx="330" cy="110" r="20" fill="#FFFFFF" stroke="#1A1917" strokeWidth="2" />
                <text x="330" y="115" textAnchor="middle" className="text-sm font-bold fill-[#1A1917]">∓</text>
                <line x1="270" y1="60" x2="330" y2="90" stroke="#1A1917" strokeWidth="1.5" />
                <line x1="310" y1="160" x2="330" y2="130" stroke="#1A1917" strokeWidth="1.5" />

                {/* Output SSB arrow */}
                <line x1="350" y1="110" x2="430" y2="110" stroke="#C85A32" strokeWidth="2.5" />
                <polygon points="430,110 422,106 422,114" fill="#C85A32" />
                <text x="440" y="106" className="text-[11px] font-mono font-bold fill-[#C85A32]">s_SSB(t)</text>
                <text x="440" y="122" className="text-[9px] font-mono fill-[#75736E]">B = W (50% savings)</text>
              </svg>
            </div>

            {/* Parameter Matrix Preview */}
            <div className="mt-6 pt-5 border-t border-[#E6E4DD]">
              <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-3 flex items-center gap-1.5 font-bold">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#585651]" />
                <span>Configurable Design Parameters</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {subTopic.parameterHighlights.map((param, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveParamIndex(i)}
                    className={`p-2.5 rounded text-left transition-colors border cursor-pointer ${
                      activeParamIndex === i
                        ? 'bg-[#FBF4F0] border-[#C85A32] text-[#C85A32]'
                        : 'bg-[#FAF9F6] border-[#E6E4DD] text-[#1A1917] hover:bg-white'
                    }`}
                  >
                    <div className="text-[10px] font-mono text-[#8A8882]">PARAM 0{i + 1}</div>
                    <div className="text-xs font-semibold mt-0.5 truncate">{param}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Theory (4 Columns) */}
          <div className="lg:col-span-4 space-y-6">
            {/* KaTeX Model Card */}
            <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-4 sm:p-5 shadow-xs">
              <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-2 flex items-center gap-1.5 font-bold">
                <BookOpen className="w-3.5 h-3.5 text-[#585651]" />
                <span>Analytical Formulation</span>
              </div>
              <div className="text-xs text-[#585651] mb-2 font-medium">
                {subTopic.formulaLabel}
              </div>
              <div className="p-3 bg-white rounded border border-[#E6E4DD] text-xs font-semibold text-[#1A1917] overflow-x-auto">
                <MathView math={subTopic.formula} displayMode={true} />
              </div>
            </div>

            {/* Curricular Focus Areas */}
            <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-4 sm:p-5 shadow-xs">
              <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-3 flex items-center gap-1.5 font-bold">
                <Layers className="w-3.5 h-3.5 text-[#585651]" />
                <span>Curricular Topics</span>
              </div>
              <ul className="space-y-2.5">
                {subTopic.topics.map((t, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-[#484642] leading-snug">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#C85A32] shrink-0 mt-0.5" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
