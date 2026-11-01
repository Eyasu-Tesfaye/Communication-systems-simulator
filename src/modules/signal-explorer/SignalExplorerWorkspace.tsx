import React, { useState, useMemo } from 'react';
import { DomainType, OperationType, SignalConfig, TransformConfig, WorkspaceMode } from './types';
import { computeSignalMetrics, generateSignalSamples } from './signalMath';
import { PRESET_SIGNALS } from './presets';
import { SidebarControls } from './components/SidebarControls';
import { DecompositionPanel } from './components/DecompositionPanel';
import { OperationsPanel } from './components/OperationsPanel';
import { TransformationsPanel } from './components/TransformationsPanel';
import { MetricsCards } from './components/MetricsCards';
import { TheoryModal } from './components/TheoryModal';
import { RotateCcw, BookOpen, ArrowLeft } from 'lucide-react';

export interface SignalExplorerWorkspaceProps {
  onNavigateHome?: () => void;
  onNavigateModule?: (path: string | number) => void;
  isInstructorMode?: boolean;
}

export const SignalExplorerWorkspace: React.FC<SignalExplorerWorkspaceProps> = ({
  onNavigateHome,
}) => {
  const [domain, setDomain] = useState<DomainType>('continuous');
  const [mode, setMode] = useState<WorkspaceMode>('single');
  const [timeRange, setTimeRange] = useState<number>(6);
  const [isTheoryOpen, setIsTheoryOpen] = useState(false);

  const [config, setConfig] = useState<SignalConfig>({
    id: 'sig_1',
    name: 'Primary Signal',
    waveform: 'sinusoid',
    subType: 'cos',
    amplitude: 2,
    frequency: 0.5,
    phase: 0,
    timeShift: 0,
    decayRate: 0.5,
    pulseWidth: 2,
    color: '#C05621',
  });

  const [config2, setConfig2] = useState<SignalConfig>({
    id: 'sig_2',
    name: 'Secondary Signal',
    waveform: 'sinusoid',
    subType: 'cos',
    amplitude: 1.5,
    frequency: 1.2,
    phase: 0,
    timeShift: 0,
    decayRate: 0.5,
    pulseWidth: 2,
    color: '#2563EB',
  });

  const [operation, setOperation] = useState<OperationType>('add');

  const [transform, setTransform] = useState<TransformConfig>({
    amplitudeScale: 1.5,
    timeScale: 1.5,
    timeShift: 1.0,
    timeReversal: false,
  });

  const samples = useMemo(() => {
    const pointCount = domain === 'continuous' ? 450 : 2 * timeRange + 1;
    return generateSignalSamples(config, domain, timeRange, pointCount, transform, config2, operation);
  }, [config, domain, timeRange, transform, config2, operation]);

  const metrics = useMemo(() => computeSignalMetrics(config, domain, samples), [config, domain, samples]);

  const handleReset = () => {
    setConfig({
      id: 'sig_1',
      name: 'Primary Signal',
      waveform: 'sinusoid',
      subType: 'cos',
      amplitude: 2,
      frequency: 0.5,
      phase: 0,
      timeShift: 0,
      decayRate: 0.5,
      pulseWidth: 2,
      color: '#C05621',
    });
    setTransform({ amplitudeScale: 1, timeScale: 1, timeShift: 0, timeReversal: false });
    setTimeRange(6);
  };

  const handleSelectPreset = (presetId: string) => {
    const preset = PRESET_SIGNALS.find((p) => p.id === presetId);
    if (!preset) return;
    setDomain(preset.domain);
    setConfig(preset.config);
    if (preset.config2) setConfig2(preset.config2);
    if (preset.operation) setOperation(preset.operation);
    if (preset.transform) setTransform(preset.transform);
    if (preset.defaultMode) setMode(preset.defaultMode);
  };

  return (
    <div className="min-h-screen bg-neutral-50/60 text-neutral-900 flex flex-col antialiased rounded-lg">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-neutral-200/80 px-6 py-3.5 flex items-center justify-between gap-8 rounded-t-lg">
        <div className="flex items-center gap-3 shrink-0">
          {onNavigateHome && (
            <button
              onClick={onNavigateHome}
              title="Back to Workspace"
              className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer mr-1"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => (onNavigateHome ? onNavigateHome() : undefined)}
            className="text-lg font-bold tracking-tight text-neutral-900 whitespace-nowrap shrink-0 hover:text-amber-800 transition-colors text-left cursor-pointer"
          >
            01. Signal Explorer
          </button>
          <span className="hidden sm:inline-block text-xs text-neutral-400 font-mono">/ Signals & Systems</span>
        </div>

        <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-neutral-600">
          <button
            onClick={() => setMode('single')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-neutral-900 cursor-pointer ${mode === 'single' ? 'text-amber-700 font-semibold underline underline-offset-4' : ''}`}
          >
            Decomposition
          </button>
          <button
            onClick={() => setMode('operations')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-neutral-900 cursor-pointer ${mode === 'operations' ? 'text-amber-700 font-semibold underline underline-offset-4' : ''}`}
          >
            Operations
          </button>
          <button
            onClick={() => setMode('transformations')}
            className={`transition-colors whitespace-nowrap shrink-0 hover:text-neutral-900 cursor-pointer ${mode === 'transformations' ? 'text-amber-700 font-semibold underline underline-offset-4' : ''}`}
          >
            Transformations
          </button>
          <button onClick={() => setIsTheoryOpen(true)} className="transition-colors whitespace-nowrap shrink-0 hover:text-neutral-900 cursor-pointer text-neutral-500">
            Theory Reference
          </button>
        </nav>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsTheoryOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-700 bg-neutral-100 hover:bg-neutral-200/80 rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-700" />
            <span>Theory</span>
          </button>
          <button onClick={handleReset} title="Reset" className="p-1.5 text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors cursor-pointer">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6 flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-2 border-b border-neutral-200/60">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight">
              {mode === 'single' && 'Signal Generation & Even/Odd Decomposition'}
              {mode === 'operations' && 'Signal Operations: Superposition & Modulation'}
              {mode === 'transformations' && 'Independent & Dependent Transformations'}
            </h1>
            <span className="text-xs text-amber-800 font-semibold font-mono">· {metrics.formula}</span>
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <span>Domain: <strong className="text-neutral-800 font-medium">{domain === 'continuous' ? 'Continuous x(t)' : 'Discrete x[n]'}</strong></span>
            <span>·</span>
            <span>Periodicity: <strong className="text-neutral-800 font-medium">{metrics.isPeriodic ? 'Periodic' : 'Aperiodic'}</strong></span>
            <span>·</span>
            <span>Type: <strong className="text-neutral-800 font-medium">{metrics.classification}</strong></span>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row items-start gap-6">
          <SidebarControls
            domain={domain}
            mode={mode}
            config={config}
            timeRange={timeRange}
            onDomainChange={setDomain}
            onModeChange={setMode}
            onConfigChange={setConfig}
            onTimeRangeChange={setTimeRange}
            onSelectPreset={handleSelectPreset}
          />

          <div className="flex-1 w-full min-w-0 flex flex-col gap-6">
            {mode === 'single' && (
              <DecompositionPanel
                domain={domain}
                samples={samples}
                metrics={metrics}
                timeRange={timeRange}
                onZoomChange={setTimeRange}
              />
            )}
            {mode === 'operations' && (
              <OperationsPanel
                domain={domain}
                samples={samples}
                config1={config}
                config2={config2}
                operation={operation}
                timeRange={timeRange}
                onChangeConfig1={setConfig}
                onChangeConfig2={setConfig2}
                onChangeOperation={setOperation}
                onZoomChange={setTimeRange}
              />
            )}
            {mode === 'transformations' && (
              <TransformationsPanel
                domain={domain}
                samples={samples}
                transform={transform}
                timeRange={timeRange}
                onChangeTransform={setTransform}
                onZoomChange={setTimeRange}
              />
            )}
            <MetricsCards metrics={metrics} domain={domain} />
          </div>
        </div>
      </main>

      <footer className="mt-auto border-t border-neutral-200/80 bg-white py-4 px-6 text-xs text-neutral-500 rounded-b-lg">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-800">01. Signal Explorer</span>
            <span>·</span>
            <span>Signals and Systems Interactive Workspace</span>
          </div>
        </div>
      </footer>

      <TheoryModal isOpen={isTheoryOpen} onClose={() => setIsTheoryOpen(false)} />
    </div>
  );
};

export default SignalExplorerWorkspace;
