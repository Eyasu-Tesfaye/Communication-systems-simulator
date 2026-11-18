import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Waves, Radio } from 'lucide-react';
import { SignalModule, MODULES } from '../../data/modules';
import { CorrelationWorkspace } from './CorrelationWorkspace';
import { PsdWorkspace } from './PsdWorkspace';

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
    description:
      'Explore autocorrelation, cross-correlation, power spectral density, and the Wiener–Khinchin relationship.',
    tag: 'Spectral Estimation',
    topics: [
      'Autocorrelation Rxx(τ) & Cross-Correlation Rxy(τ)',
      'Wiener–Khinchin Theorem: Linking Correlation & PSD',
      'Nonparametric Spectral Estimation',
    ],
    formula:
      'S_{XX}(\\omega) = \\int_{-\\infty}^{\\infty} R_{XX}(\\tau) e^{-j\\omega \\tau} \\, d\\tau',
    formulaLabel: 'Wiener–Khinchin Transform Relation',
    keywords: [
      'correlation',
      'autocorrelation',
      'cross-correlation',
      'psd',
      'spectral density',
      'wiener-khinchin',
      'lag',
    ],
    parameterHighlights: ['Lag (τ / k)', 'Signal Type', 'Sampling Rate (Fs)'],
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

  const currentIndex = MODULES.findIndex((m) => m.id === module.id);
  const prevModule = currentIndex > 0 ? MODULES[currentIndex - 1] : null;
  const nextModule =
    currentIndex >= 0 && currentIndex < MODULES.length - 1 ? MODULES[currentIndex + 1] : null;

  return (
    <div className="w-full bg-white text-[#1A1917] border border-[#E6E4DD] rounded-lg shadow-xs flex flex-col lg:h-[calc(100vh-5.5rem)] lg:min-h-[600px] lg:overflow-hidden">
      {/* Compact Header & Primary Mode Switcher (matching FM module layout) */}
      <header className="px-3.5 py-2 border-b border-[#E6E4DD] bg-[#FAF9F6] flex flex-wrap items-center justify-between gap-2.5 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {onNavigateHome && (
            <button
              type="button"
              onClick={onNavigateHome}
              className="p-1.5 rounded text-[#75736E] hover:text-[#1A1917] hover:bg-[#E6E4DD]/50 transition-colors cursor-pointer shrink-0"
              title="Return to Workspace"
              aria-label="Return to Workspace"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <span className="text-[11px] font-mono font-bold tracking-wider text-[#C85A32] bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/20 shrink-0">
            MODULE {module.index}
          </span>
          <h1 className="text-sm font-heading font-semibold text-[#1A1917] truncate">
            {module.name}
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Primary Experiment Tabs */}
          <div className="flex items-center gap-1 bg-white p-0.5 rounded-md border border-[#E6E4DD]">
            <button
              type="button"
              onClick={() => setActiveMode('correlation')}
              className={`py-1 px-2.5 text-xs font-semibold rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeMode === 'correlation'
                  ? 'bg-[#C85A32] text-white shadow-xs'
                  : 'text-[#585651] hover:text-[#1A1917] hover:bg-[#FAF9F6]'
              }`}
            >
              <Waves className="w-3.5 h-3.5" />
              <span>Correlation</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('psd')}
              className={`py-1 px-2.5 text-xs font-semibold rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                activeMode === 'psd'
                  ? 'bg-[#C85A32] text-white shadow-xs'
                  : 'text-[#585651] hover:text-[#1A1917] hover:bg-[#FAF9F6]'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>PSD &amp; Wiener–Khinchin</span>
            </button>
          </div>

          {/* Prev / Next Module Quick Navigation */}
          {onNavigateModule && (prevModule || nextModule) && (
            <div className="hidden sm:flex items-center gap-1">
              {prevModule && (
                <button
                  type="button"
                  onClick={() => onNavigateModule(prevModule.path)}
                  className="px-2 py-1 border border-[#E6E4DD] bg-white hover:bg-[#F3F2EC] text-[11px] font-mono text-[#585651] hover:text-[#1A1917] rounded transition-colors flex items-center gap-1 cursor-pointer"
                  title={`Previous: ${prevModule.name}`}
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>{prevModule.index}</span>
                </button>
              )}
              {nextModule && (
                <button
                  type="button"
                  onClick={() => onNavigateModule(nextModule.path)}
                  className="px-2 py-1 border border-[#E6E4DD] bg-white hover:bg-[#F3F2EC] text-[11px] font-mono text-[#585651] hover:text-[#1A1917] rounded transition-colors flex items-center gap-1 cursor-pointer"
                  title={`Next: ${nextModule.name}`}
                >
                  <span>{nextModule.index}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Active Split-Screen Workspace */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {activeMode === 'correlation' ? <CorrelationWorkspace /> : <PsdWorkspace />}
      </div>
    </div>
  );
};
