import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Waves, Radio } from 'lucide-react';
import { SignalModule, MODULES } from '../../data/modules';
import { CorrelationWorkspace } from './CorrelationWorkspace';
import { PsdWorkspace } from './PsdWorkspace';
import { DEFAULT_SHARED_LAB_STATE, SharedLabState } from './labTypes';

const DEFAULT_MODULE_METADATA: SignalModule =
  MODULES.find((m) => m.id === 'correlation-spectrum') || {
    id: 'correlation-spectrum',
    moduleNumber: 5,
    index: '05',
    name: 'Correlation & Spectral Analysis',
    shortName: 'Correlation',
    filename: 'Module5_Correlation.jsx',
    path: '/correlation-spectrum',
    legacyPaths: ['/correlation', '/module-5', '/module-7'],
    description: '',
    tag: 'Spectral Estimation',
    topics: ['Autocorrelation', 'Cross-Correlation', 'Power Spectral Density'],
    formula: 'S_{XX}(\\omega) = \\int_{-\\infty}^{\\infty} R_{XX}(\\tau) e^{-j\\omega \\tau} \\, d\\tau',
    formulaLabel: 'Wiener–Khinchin Transform Relation',
    keywords: [],
    parameterHighlights: [],
  };

export interface CorrelationSpectrumModuleProps {
  module?: SignalModule;
  onNavigateHome?: () => void;
  onNavigateModule?: (path: string) => void;
}

export type ModuleExperimentMode = 'correlation' | 'psd';

export const CorrelationSpectrumModule: React.FC<CorrelationSpectrumModuleProps> = ({
  module = DEFAULT_MODULE_METADATA,
  onNavigateHome,
  onNavigateModule,
}) => {
  const [activeMode, setActiveMode] = useState<ModuleExperimentMode>('correlation');
  const [sharedState, setSharedState] = useState<SharedLabState>(DEFAULT_SHARED_LAB_STATE);

  const currentIndex = MODULES.findIndex((m) => m.id === module.id);
  const prevModule = currentIndex > 0 ? MODULES[currentIndex - 1] : null;
  const nextModule = currentIndex >= 0 && currentIndex < MODULES.length - 1 ? MODULES[currentIndex + 1] : null;

  const handleResetAll = () => {
    setSharedState(DEFAULT_SHARED_LAB_STATE);
  };

  return (
    <div className="bg-white text-[#1A1917] flex flex-col">
      {/* Compact Breadcrumb & Return Action */}
      <div className="border-b border-[#E6E4DD] bg-[#FAF9F6] rounded-t-lg px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-mono text-[#75736E]">
          {onNavigateHome ? (
            <>
              <button
                type="button"
                onClick={onNavigateHome}
                className="hover:text-[#1A1917] transition-colors cursor-pointer"
              >
                SIGNAL LAB
              </button>
              <span aria-hidden="true">/</span>
              <button
                type="button"
                onClick={onNavigateHome}
                className="hover:text-[#1A1917] transition-colors cursor-pointer"
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
            {module.index} {module.name}
          </span>
        </div>

        {onNavigateHome && (
          <button
            type="button"
            onClick={onNavigateHome}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1A1917] hover:text-[#C85A32] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to workspace</span>
          </button>
        )}
      </div>

      {/* Module Header + Experiment Mode Switcher */}
      <div className="py-3.5 mb-4 border-b border-[#E6E4DD] flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-mono font-bold tracking-wider text-[#C85A32] bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/20">
            MODULE {module.index}
          </span>
          <h1 className="text-xl sm:text-2xl font-heading font-semibold tracking-tight text-[#1A1917]">
            {module.name}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="inline-flex rounded-lg border border-[#E6E4DD] bg-[#FAF9F6] p-1 gap-1">
            <button
              type="button"
              onClick={() => setActiveMode('correlation')}
              className={`py-1.5 px-3 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeMode === 'correlation'
                  ? 'bg-[#C85A32] text-white shadow-xs'
                  : 'text-[#585651] hover:text-[#1A1917] hover:bg-white'
              }`}
            >
              <Waves className="w-3.5 h-3.5" />
              <span>Correlation</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveMode('psd')}
              className={`py-1.5 px-3 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeMode === 'psd'
                  ? 'bg-[#C85A32] text-white shadow-xs'
                  : 'text-[#585651] hover:text-[#1A1917] hover:bg-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>PSD &amp; Spectrum</span>
            </button>
          </div>

          {onNavigateModule && (
            <div className="flex items-center gap-1.5">
              {prevModule && (
                <button
                  type="button"
                  onClick={() => onNavigateModule(prevModule.path)}
                  className="px-2.5 py-1.5 border border-[#E6E4DD] hover:bg-[#FAF9F6] text-xs font-medium text-[#585651] hover:text-[#1A1917] rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                  title={prevModule.name}
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>{prevModule.index}</span>
                </button>
              )}
              {nextModule && (
                <button
                  type="button"
                  onClick={() => onNavigateModule(nextModule.path)}
                  className="px-2.5 py-1.5 border border-[#E6E4DD] hover:bg-[#FAF9F6] text-xs font-medium text-[#585651] hover:text-[#1A1917] rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                  title={nextModule.name}
                >
                  <span>{nextModule.index}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Active Workspace Stage (no extra horizontal padding) */}
      <div>
        {activeMode === 'correlation' ? (
          <CorrelationWorkspace
            sharedState={sharedState}
            onUpdateState={setSharedState}
            onResetAll={handleResetAll}
          />
        ) : (
          <PsdWorkspace
            sharedState={sharedState}
            onUpdateState={setSharedState}
            onResetAll={handleResetAll}
          />
        )}
      </div>
    </div>
  );
};
