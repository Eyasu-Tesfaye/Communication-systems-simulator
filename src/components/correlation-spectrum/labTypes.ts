export type CoreSignalType = 'sine' | 'pulse' | 'white_noise' | 'colored_noise';

export const CORE_SIGNAL_OPTIONS: Array<{ id: CoreSignalType; label: string }> = [
  { id: 'sine', label: 'Sinusoid' },
  { id: 'pulse', label: 'Rectangular Pulse' },
  { id: 'white_noise', label: 'White Noise' },
  { id: 'colored_noise', label: 'Colored Noise' },
];

export interface SharedLabState {
  timeDomain: 'continuous' | 'discrete';
  signalType: CoreSignalType;
  // Sinusoid
  sineAmp: number;
  sineFreq: number;
  sinePhase: number;
  // Rectangular Pulse
  pulseAmp: number;
  pulseWidth: number;
  pulsePos: number;
  // White Noise
  whiteNoiseVariance: number;
  whiteNoiseSeed: number;
  // Colored Noise
  coloredNoiseVariance: number;
  coloredNoiseCutoff: number;
  coloredNoiseSeed: number;
  // Channel Echo
  echoEnabled: boolean;
  echoDelayCts: number; // seconds
  echoDelayDts: number; // samples
  echoGain: number;     // alpha
}

export const DEFAULT_SHARED_LAB_STATE: SharedLabState = {
  timeDomain: 'continuous',
  signalType: 'pulse',
  sineAmp: 1.5,
  sineFreq: 2.0,
  sinePhase: 0,
  pulseAmp: 1.5,
  pulseWidth: 1.0,
  pulsePos: 0.0,
  whiteNoiseVariance: 1.0,
  whiteNoiseSeed: 42,
  coloredNoiseVariance: 1.0,
  coloredNoiseCutoff: 3.5,
  coloredNoiseSeed: 101,
  echoEnabled: false,
  echoDelayCts: 1.20,
  echoDelayDts: 5,
  echoGain: 0.70,
};
