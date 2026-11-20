/**
 * Module 07 — Correlation & Spectral Analysis
 * Public Module API Entry Point
 *
 * Designed for self-contained, modular integration into shared
 * Communication Systems Simulators (React + TypeScript + Vite).
 */

export {
  CorrelationSpectrumModule,
  type ModuleExperimentMode,
} from './CorrelationSpectrumModule';

export { CorrelationWorkspace } from './CorrelationWorkspace';
export { PsdWorkspace } from './PsdWorkspace';
export { SignalPlotCanvas } from './SignalPlotCanvas';

// Computation and Signal Engines
export {
  computeCorrelation,
  evaluateCorrelationAtLag,
  type CorrelationResult,
  runCorrelationValidationTests,
} from './correlationEngine';

export {
  computePsd,
  type PsdResult,
  runPsdValidationTests,
} from './psdEngine';

export {
  generateCtsSignal,
  generateDtsSignal,
  generateGaussianWhiteNoise,
  filterColoredNoise,
  type SignalType,
  type ChannelEchoConfig,
  type UnifiedSignalConfig,
  type GeneratedSignal,
} from './signalGenerators';

export {
  type CoreSignalType,
  type SharedLabState,
  CORE_SIGNAL_OPTIONS,
  DEFAULT_SHARED_LAB_STATE,
} from './labTypes';

export {
  executeStage5TestSuite,
  type Stage5TestReportItem,
} from './stage5VerificationSuite';
