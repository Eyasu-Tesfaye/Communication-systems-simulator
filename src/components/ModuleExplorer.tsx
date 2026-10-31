import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import { SignalModule } from '../data/modules';
import { ModuleGlyph } from './ModuleGlyphs';
import { ModuleContextPanel } from './ModuleContextPanel';
import { MathView } from './MathView';

interface ModuleExplorerProps {
  modules: SignalModule[];
  selectedModuleId: string;
  onSelectModule: (module: SignalModule) => void;
  onOpenWorkspace: (path: string) => void;
}

export const ModuleExplorer: React.FC<ModuleExplorerProps> = ({
  modules,
  selectedModuleId,
  onSelectModule,
  onOpenWorkspace,
}) => {
  const selectedModule =
    modules.find((m) => m.id === selectedModuleId) || modules[0];

  // Handle keyboard navigation inside the module index list
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLDivElement>,
    index: number
  ) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (index + 1) % modules.length;
      onSelectModule(modules[nextIndex]);
      const nextEl = document.getElementById(`module-item-${modules[nextIndex].id}`);
      nextEl?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (index - 1 + modules.length) % modules.length;
      onSelectModule(modules[prevIndex]);
      const prevEl = document.getElementById(`module-item-${modules[prevIndex].id}`);
      prevEl?.focus();
    } else if (e.key === 'Enter') {
      onOpenWorkspace(modules[index].path);
    }
  };

  return (
    <section id="module-explorer" aria-labelledby="explorer-heading" className="my-10">
      {/* Section Header */}
      <div className="mb-6">
        <h2 id="explorer-heading" className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1917]">
          Explore the lab
        </h2>
        <p className="mt-1 text-sm text-[#585651]">
          Seven connected areas of signal analysis, each with its own workspace.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Numbered Module Index List */}
        <div
          className="lg:col-span-7 bg-white rounded-lg border border-[#E6E4DD] overflow-hidden divide-y divide-[#E6E4DD] shadow-xs"
          role="listbox"
          aria-label="List of signal modules"
        >
          {modules.map((m, idx) => {
            const isSelected = m.id === selectedModule?.id;
            return (
              <div key={m.id} className="relative">
                <div
                  id={`module-item-${m.id}`}
                  role="option"
                  tabIndex={0}
                  aria-selected={isSelected}
                  onClick={() => onSelectModule(m)}
                  onKeyDown={(e) => handleKeyDown(e, idx)}
                  className={`group w-full flex items-start sm:items-center justify-between gap-4 p-4 sm:p-5 text-left transition-colors cursor-pointer select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85A32] ${
                    isSelected
                      ? 'bg-[#FAF9F6] border-l-4 border-l-[#C85A32]'
                      : 'hover:bg-[#FCFCFA] border-l-4 border-l-transparent'
                  }`}
                >
                  {/* Index + Glyph + Text Info */}
                  <div className="flex items-start sm:items-center gap-3.5 sm:gap-4.5 min-w-0 flex-1">
                    {/* Two-digit index */}
                    <span
                      className={`font-mono text-xs sm:text-sm tracking-tight font-semibold shrink-0 transition-colors tabular-nums ${
                        isSelected ? 'text-[#C85A32]' : 'text-[#75736E] group-hover:text-[#1A1917]'
                      }`}
                    >
                      {m.index}
                    </span>

                    {/* Technical Glyph Icon */}
                    <div
                      className={`w-9 h-9 rounded-md shrink-0 flex items-center justify-center border transition-colors ${
                        isSelected
                          ? 'bg-white border-[#C85A32]/40 text-[#C85A32]'
                          : 'bg-[#FAF9F6] border-[#E6E4DD] text-[#585651] group-hover:text-[#1A1917] group-hover:border-[#D1CFCE]'
                      }`}
                    >
                      <ModuleGlyph id={m.id} className="w-4 h-4" accent={isSelected} />
                    </div>

                    {/* Name & One-line Description */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3
                          className={`text-sm sm:text-base font-semibold tracking-tight truncate transition-colors ${
                            isSelected ? 'text-[#1A1917]' : 'text-[#2D2B28] group-hover:text-[#1A1917]'
                          }`}
                        >
                          {m.name}
                        </h3>
                      </div>
                      <p className="mt-0.5 text-xs sm:text-sm text-[#585651] line-clamp-1 leading-relaxed">
                        {m.description}
                      </p>
                    </div>
                  </div>

                  {/* Right-aligned Navigation Action Indicator */}
                  <div className="flex items-center gap-2 shrink-0 self-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenWorkspace(m.path);
                      }}
                      aria-label={`Open ${m.name} workspace`}
                      className={`w-8 h-8 rounded-md flex items-center justify-center transition-all ${
                        isSelected
                          ? 'text-[#C85A32] bg-[#FBF4F0] hover:bg-[#C85A32] hover:text-white'
                          : 'text-[#75736E] hover:text-[#1A1917] hover:bg-[#F3F2EC]'
                      }`}
                    >
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* On Mobile: Inline Context Panel directly below selected module */}
                {isSelected && (
                  <div className="lg:hidden border-t border-[#E6E4DD] p-4 bg-[#FAF9F6]">
                    <div className="text-xs text-[#585651] mb-3">
                      <span className="font-semibold text-[#1A1917]">Key topics:</span>
                      <ul className="mt-1.5 space-y-1 list-disc list-inside">
                        {m.topics.map((t, i) => (
                          <li key={i}>{t}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-2.5 bg-white border border-[#E6E4DD] rounded text-xs text-[#1A1917] mb-3 overflow-x-auto">
                      <MathView math={m.formula} displayMode={true} />
                    </div>
                    <button
                      onClick={() => onOpenWorkspace(m.path)}
                      className="w-full py-2 px-3 bg-[#C85A32] text-white text-xs font-semibold rounded-md flex items-center justify-center gap-2 hover:bg-[#B54E28] transition-colors"
                    >
                      <span>Open {m.name}</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Column: Contextual Panel (Wide screens) */}
        <div className="hidden lg:block lg:col-span-5">
          {selectedModule && (
            <ModuleContextPanel
              module={selectedModule}
              onOpenWorkspace={onOpenWorkspace}
            />
          )}
        </div>
      </div>
    </section>
  );
};
