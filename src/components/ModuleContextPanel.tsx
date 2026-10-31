import React from 'react';
import { ArrowRight, BookOpen, Layers, Activity } from 'lucide-react';
import { SignalModule } from '../data/modules';
import { ModuleGlyph } from './ModuleGlyphs';
import { MathView } from './MathView';

interface ModuleContextPanelProps {
  module: SignalModule;
  onOpenWorkspace: (path: string) => void;
}

export const ModuleContextPanel: React.FC<ModuleContextPanelProps> = ({
  module,
  onOpenWorkspace,
}) => {
  return (
    <aside
      aria-label={`Contextual details for module ${module.index}: ${module.name}`}
      className="bg-[#FAF9F6] border border-[#E6E4DD] rounded-lg p-6 lg:p-7 flex flex-col justify-between sticky top-6 transition-all shadow-xs"
    >
      <div>
        {/* Module Index & Glyph Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E6E4DD]">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-mono font-bold tracking-wider text-[#C85A32] bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/20">
              MODULE {module.index}
            </span>
            <span className="text-xs text-[#75736E] font-medium">{module.tag}</span>
          </div>
          <div className="w-8 h-8 rounded bg-white border border-[#E6E4DD] flex items-center justify-center text-[#1A1917]">
            <ModuleGlyph id={module.id} className="w-4 h-4" accent={true} />
          </div>
        </div>

        {/* Title */}
        <h3 className="mt-4 text-xl font-bold tracking-tight text-[#1A1917]">
          {module.name}
        </h3>

        {/* Description */}
        <p className="mt-2 text-sm leading-relaxed text-[#585651]">
          {module.description}
        </p>

        {/* Mathematical Representative Relation with KaTeX */}
        <div className="mt-5 p-3.5 bg-white rounded-md border border-[#E6E4DD]">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#75736E] mb-1.5 flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-[#C85A32]" />
            <span>{module.formulaLabel}</span>
          </div>
          <div className="text-sm sm:text-base font-medium text-[#1A1917] overflow-x-auto py-1">
            <MathView math={module.formula} displayMode={true} />
          </div>
        </div>

        {/* Core Topics (Strictly 3 topics) */}
        <div className="mt-5">
          <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-2.5 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5 text-[#585651]" />
            <span>Core Curricular Topics</span>
          </div>
          <ul className="space-y-2">
            {module.topics.map((topic, i) => (
              <li key={i} className="flex items-start gap-2.5 text-xs sm:text-sm text-[#484642] leading-snug">
                <span className="font-mono text-[#C85A32] font-semibold mt-0.5 text-xs">
                  0{i + 1}
                </span>
                <span>{topic}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Parameter Scope */}
        <div className="mt-5 pt-4 border-t border-[#E6E4DD]">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#75736E] mb-2 flex items-center gap-1.5">
            <Layers className="w-3 h-3 text-[#585651]" />
            <span>Parameter Space</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {module.parameterHighlights.map((param, i) => (
              <span
                key={i}
                className="text-[11px] font-mono bg-white text-[#585651] px-2 py-0.5 rounded border border-[#E6E4DD]"
              >
                {param}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Prominent Action Button */}
      <div className="mt-7 pt-4 border-t border-[#E6E4DD]">
        <button
          onClick={() => onOpenWorkspace(module.path)}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-[#C85A32] text-white text-sm font-medium rounded-md hover:bg-[#B54E28] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#C85A32] shadow-xs cursor-pointer"
        >
          <span>Open workspace</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
