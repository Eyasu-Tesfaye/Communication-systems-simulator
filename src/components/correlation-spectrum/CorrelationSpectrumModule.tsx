import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Waves, Radio, Activity } from 'lucide-react';
import { SignalModule, MODULES } from '../../data/modules';
import { ModuleGlyph } from '../ModuleGlyphs';
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
      'Explore autocorrelation, cross-correlation, power spectral density, periodograms, Welch’s method, and the Wiener–Khinchin relationship.',
    tag: 'Spectral Estimation',
    topics: [
      'Autocorrelation Rxx(τ) & Cross-Correlation Rxy(τ)',
      'Wiener–Khinchin Theorem: Linking Correlation & PSD',
      'Nonparametric Spectral Estimation (Periodogram & Welch)',
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
      'periodogram',
      'welch',
      'wiener-khinchin',
      'lag',
    ],
    parameterHighlights: [
      'Maximum Lag (τ_max)',
      'Welch Segment Overlap (%)',
      'Spectral Window (Hamming/Hann)',
      'Resolution Bandwidth (Δf)',
    ],
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
  // Exactly two primary experiment modes: 'correlation' and 'psd'
  const [activeMode, setActiveMode] = useState<ModuleExperimentMode>('correlation');

  // Find previous and next modules for navigation if available
  const currentIndex = MODULES.findIndex((m) => m.id === module.id);
  const prevModule = currentIndex > 0 ? MODULES[currentIndex - 1] : null;
  const nextModule = currentIndex >= 0 && currentIndex < MODULES.length - 1 ? MODULES[currentIndex + 1] : null;

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
                  className="hover:text-[#1A1917] transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C85A32] rounded"
                >
                  SIGNAL LAB
                </button>
                <span aria-hidden="true">/</span>
                <button
                  type="button"
                  onClick={onNavigateHome}
                  className="hover:text-[#1A1917] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C85A32] rounded"
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
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#1A1917] hover:text-[#C85A32] transition-colors self-start sm:self-auto focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C85A32] rounded py-1 px-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to workspace</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Workspace Body */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
        {/* Module Header Bar */}
        <div className="pb-6 border-b border-[#E6E4DD] flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono font-bold tracking-wider text-[#C85A32] bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/20">
                MODULE {module.index}
              </span>
              <span className="text-xs text-[#75736E] font-medium">{module.tag}</span>
              <span className="text-xs text-[#8A8882]">·</span>
              <span className="text-[11px] font-mono font-medium text-[#75736E] bg-[#FAF9F6] border border-[#E6E4DD] px-1.5 py-0.5 rounded">
                FOUNDATION ARCHITECTURE
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-heading font-semibold tracking-tight text-[#1A1917]">
              {module.name}
            </h1>
            <p className="mt-2 text-sm sm:text-base font-body text-[#585651] max-w-3xl leading-relaxed">
              An interactive engineering learning environment for understanding and experimenting with
              autocorrelation, cross-correlation, and power spectral density.
            </p>
          </div>

          {/* Quick switcher to prev/next module (when available in multi-module app) */}
          {onNavigateModule && (
            <div className="flex items-center gap-2 shrink-0">
              {prevModule && (
                <button
                  type="button"
                  onClick={() => onNavigateModule(prevModule.path)}
                  className="px-3 py-1.5 border border-[#E6E4DD] hover:bg-[#FAF9F6] text-xs font-medium text-[#585651] hover:text-[#1A1917] rounded-md transition-colors flex items-center gap-1.5"
                  title={`Previous: ${prevModule.name}`}
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Prev ({prevModule.index})</span>
                </button>
              )}
              {nextModule && (
                <button
                  type="button"
                  onClick={() => onNavigateModule(nextModule.path)}
                  className="px-3 py-1.5 border border-[#E6E4DD] hover:bg-[#FAF9F6] text-xs font-medium text-[#585651] hover:text-[#1A1917] rounded-md transition-colors flex items-center gap-1.5"
                  title={`Next: ${nextModule.name}`}
                >
                  <span>Next ({nextModule.index})</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* 3. Simple, Visible Mode Navigation (Exactly 2 Experiment Modes) */}
        <div className="bg-[#FAF9F6] border border-[#E6E4DD] rounded-lg p-2">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#75736E] px-2 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#C85A32]" />
              <span>Experiment Mode:</span>
            </div>

            <div className="grid grid-cols-2 gap-2 flex-1 sm:max-w-md">
              {/* Mode 1: Correlation */}
              <button
                type="button"
                onClick={() => setActiveMode('correlation')}
                className={`py-2.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeMode === 'correlation'
                    ? 'bg-[#C85A32] text-white shadow-xs'
                    : 'bg-white border border-[#E6E4DD] text-[#585651] hover:text-[#1A1917] hover:bg-[#F3F2EC]'
                }`}
              >
                <Waves className="w-4 h-4" />
                <span>1. Correlation Workspace</span>
              </button>

              {/* Mode 2: PSD */}
              <button
                type="button"
                onClick={() => setActiveMode('psd')}
                className={`py-2.5 px-3 rounded-md text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  activeMode === 'psd'
                    ? 'bg-[#C85A32] text-white shadow-xs'
                    : 'bg-white border border-[#E6E4DD] text-[#585651] hover:text-[#1A1917] hover:bg-[#F3F2EC]'
                }`}
              >
                <Radio className="w-4 h-4" />
                <span>2. PSD Workspace</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4. Active Experiment Mode Stage */}
        <div className="mt-4">
          {activeMode === 'correlation' ? <CorrelationWorkspace /> : <PsdWorkspace />}
        </div>

      </main>

    </div>
  );
};
