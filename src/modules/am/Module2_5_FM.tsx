import React from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Layers, CheckCircle2 } from 'lucide-react';
import { AM_MODULES, AMSubTopic } from '../../data/modules';
import { MathView } from '../../components/MathView';
import { FmModulationModule } from './fm-files/fm-modulation';

interface Module2_5_FMProps {
  onNavigateHome: () => void;
  onNavigateModule: (path: string) => void;
}

export const Module2_5_FM: React.FC<Module2_5_FMProps> = ({
  onNavigateHome,
  onNavigateModule,
}) => {
  const currentSubTopic: AMSubTopic = AM_MODULES[4]; // Module 2.5 FM
  const prevMod = AM_MODULES[3]; // Module 2.4 VSB
  const nextMod = AM_MODULES[5]; // Module 2.6 AM / PM

  return (
    <div className="space-y-6">
      <div className="py-2">
        {/* Module Header Bar */}
        <div className="pb-6 border-b border-[#E6E4DD] flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-mono font-bold tracking-wider text-[#C85A32] bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/25">
                MODULE 2.5
              </span>
              <span className="text-xs text-[#75736E] font-medium font-mono">{currentSubTopic.tag}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1917]">
              {currentSubTopic.name}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-[#585651] max-w-3xl leading-relaxed">
              {currentSubTopic.description}
            </p>
          </div>

          {/* Quick switcher to prev/next module */}
          <div className="flex items-center gap-2 shrink-0">
            {prevMod && (
              <button
                type="button"
                onClick={() => onNavigateModule(prevMod.path)}
                className="px-3 py-1.5 border border-[#E6E4DD] hover:bg-[#FAF9F6] text-xs font-medium text-[#585651] hover:text-[#1A1917] rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
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
                className="px-3 py-1.5 border border-[#E6E4DD] hover:bg-[#FAF9F6] text-xs font-semibold text-[#1A1917] hover:border-[#C85A32]/40 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title={`Next: ${nextMod.name}`}
              >
                <span>Next ({nextMod.index})</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Uploaded FM Simulation Workspace */}
        <div className="mt-6 rounded-lg border border-[#E6E4DD] overflow-hidden shadow-xs [&>div]:!w-full [&>div]:!h-[820px] lg:[&>div]:!h-[760px]">
          <FmModulationModule
            onNavigateHome={onNavigateHome}
            onNavigateModule={onNavigateModule}
          />
        </div>

        {/* Theory & KaTeX Reference Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-4 sm:p-5 shadow-xs">
            <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-2 flex items-center gap-1.5 font-bold">
              <BookOpen className="w-3.5 h-3.5 text-[#585651]" />
              <span>FM Mathematical Formulation</span>
            </div>
            <div className="text-xs text-[#585651] mb-2 font-medium">
              {currentSubTopic.formulaLabel}
            </div>
            <div className="p-3 bg-white rounded border border-[#E6E4DD] text-xs font-semibold text-[#1A1917] overflow-x-auto">
              <MathView math={currentSubTopic.formula} displayMode={true} />
            </div>
          </div>

          <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-4 sm:p-5 shadow-xs">
            <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-3 flex items-center gap-1.5 font-bold">
              <Layers className="w-3.5 h-3.5 text-[#585651]" />
              <span>Core Curricular Focus Areas</span>
            </div>
            <ul className="space-y-2.5">
              {currentSubTopic.topics.map((t, idx) => (
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
  );
};
