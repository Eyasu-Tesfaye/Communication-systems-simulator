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

interface Module2_4_VSBProps {
  onNavigateHome: () => void;
  onNavigateModule: (path: string) => void;
}

export const Module2_4_VSB: React.FC<Module2_4_VSBProps> = ({
  onNavigateHome,
  onNavigateModule,
}) => {
  const subTopic: AMSubTopic = AM_MODULES[3]; // Module 2.4 VSB
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
                MODULE 2.4
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
              onClick={() => onNavigateModule('/am/ssb')}
              className="px-3 py-1.5 border border-[#E6E4DD] hover:bg-[#FAF9F6] text-xs font-medium text-[#585651] hover:text-[#1A1917] rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Previous: SSB (2.3)"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>SSB (2.3)</span>
            </button>
            <button
              onClick={() => onNavigateModule('/am/fm')}
              className="px-3 py-1.5 border border-[#E6E4DD] hover:bg-[#FAF9F6] text-xs font-semibold text-[#1A1917] hover:border-[#C85A32]/40 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Next: FM (05)"
            >
              <span>Next: FM (05)</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Technical Notice Banner */}
        <div className="mt-6 p-3.5 sm:p-4 rounded-md bg-[#FAF9F6] border border-[#E6E4DD] flex items-start gap-3">
          <Info className="w-4 h-4 text-[#C85A32] shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-[#585651] leading-relaxed">
            <span className="font-semibold text-[#1A1917]">VSB Compromise: </span>
            Ideal SSB filtering is physically impossible for baseband signals with rich DC and low-frequency components (such as analog and digital video). VSB transmits one complete sideband plus a vestige of the other ($B = W + f_v$), with Nyquist filter symmetry around the carrier ensuring distortion-free synchronous detection.
          </div>
        </div>

        {/* 3. Schematic & Analytics Grid */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Stage (8 Columns) */}
          <div className="lg:col-span-8 bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-xs flex flex-col">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E6E4DD]">
              <div className="flex items-center gap-2">
                <ModuleGlyph id="vsb" className="w-4 h-4" accent={true} />
                <h2 className="text-xs font-bold tracking-tight text-[#1A1917] uppercase font-mono">
                  Vestigial Filter Slope & Nyquist Symmetry
                </h2>
              </div>
              <span className="text-[11px] font-mono text-[#8A8882]">STAGE · SCHEMATIC MODEL</span>
            </div>

            {/* Canvas Schematic Area */}
            <div className="relative w-full min-h-[260px] sm:min-h-[300px] bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden flex items-center justify-center p-4">
              <svg
                viewBox="0 0 520 220"
                className="w-full h-full max-h-[65vh] select-none"
                aria-label="Vestigial Sideband Filter and Spectral Response"
              >
                <line x1="40" y1="170" x2="480" y2="170" stroke="#8A8882" strokeWidth="1.5" />
                <line x1="260" y1="30" x2="260" y2="175" stroke="#C85A32" strokeWidth="1.25" strokeDasharray="3 3" />
                <text x="260" y="24" textAnchor="middle" className="text-[11px] font-mono font-bold fill-[#C85A32]">Carrier fc</text>

                <path
                  d="M 160 170 C 190 170, 210 160, 230 110 C 250 60, 270 50, 310 50 L 420 50 L 440 170"
                  fill="none"
                  stroke="#C85A32"
                  strokeWidth="2.5"
                />

                <path
                  d="M 160 170 C 190 170, 210 160, 230 110 C 245 75, 255 60, 260 55 L 260 170 Z"
                  fill="#C85A32"
                  fillOpacity="0.12"
                />

                <text x="210" y="145" textAnchor="middle" className="text-[10px] font-mono font-semibold fill-[#C85A32]">
                  Vestige (fv)
                </text>
                <text x="350" y="100" textAnchor="middle" className="text-[10px] font-mono font-semibold fill-[#1A1917]">
                  Full Sideband (W)
                </text>
                <text x="260" y="200" textAnchor="middle" className="text-[10px] font-mono fill-[#585651]">
                  Nyquist Filter Symmetry: |H(f - fc)| + |H(f + fc)| = 1 around carrier fc
                </text>
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
