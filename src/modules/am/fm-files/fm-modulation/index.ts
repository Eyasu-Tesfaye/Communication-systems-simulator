/**
 * Frequency Modulation (FM) Laboratory Module
 * Public API Entry Point
 */

export { FmModulationModule } from './FmModulationModule';
export { FmInteractivePlot, type FmCarsonBand, type FmActiveMarker } from './FmPlots';
export {
  computeFmSignals,
  decodeAudioFile,
  type FmSimulationParams,
  type FmEngineResult,
  type FmPoint,
} from './fmMathEngine';
export {
  simulateFmDemodulation,
  generateDistortedAudioBuffer,
  type DemodSimulationParams,
  type DemodEngineResult,
  type DemodPoint,
} from './fmDemodEngine';
export {
  computeTwoSidedFmSpectrum,
  computeTwoSidedFmSpectrum as computeFmSpectrum,
  generateBesselCurves,
  generateBandwidthExpansionCurve,
  CARRIER_NULLS,
  besselJ,
  type SpectralLine,
  type CarsonBandwidthResult,
  type CarrierNullInfo,
} from './besselUtils';
export { fmAudioEngineInstance } from './fmAudioEngine';
