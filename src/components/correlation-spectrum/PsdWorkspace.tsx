import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  RotateCcw,
  Sliders,
  Info,
  Shuffle,
  CheckCircle2,
  BookOpen,
  X,
} from 'lucide-react';
import { SignalPlotCanvas } from './SignalPlotCanvas';
import { MathView } from '../MathView';
import {
  SignalType,
  UnifiedSignalConfig,
  generateCtsSignal,
  generateDtsSignal,
  GeneratedSignal,
} from './signalGenerators';
import { computePsd, PsdResult, runPsdValidationTests, PsdValidationTestResult } from './psdEngine';
import { executeStage5TestSuite } from './stage5VerificationSuite';

export type PsdSignalType = SignalType;

const SIGNAL_OPTIONS: Array<{ value: PsdSignalType; label: string; shortLabel: string }> = [
  { value: 'sine', label: 'Sinusoid', shortLabel: 'Sinusoid' },
  { value: 'pulse', label: 'Rectangular Pulse', shortLabel: 'Rect. Pulse' },
  { value: 'white_noise', label: 'White Noise', shortLabel: 'White Noise' },
  { value: 'colored_noise', label: 'Colored Noise', shortLabel: 'Colored Noise' },
];

export const PsdWorkspace: React.FC = () => {
  // Domain mode: continuous vs discrete
  const [timeDomain, setTimeDomain] = useState<'continuous' | 'discrete'>('continuous');

  // Signal type selection (strictly 4 core types)
  const [signalType, setSignalType] = useState<PsdSignalType>('white_noise');

  // White noise controls
  const [whiteNoiseVariance, setWhiteNoiseVariance] = useState<number>(2.0);
  const [whiteNoiseSeed, setWhiteNoiseSeed] = useState<number>(42);

  // Colored noise controls
  const [coloredNoiseVariance, setColoredNoiseVariance] = useState<number>(2.0);
  const [coloredNoiseCutoff, setColoredNoiseCutoff] = useState<number>(3.5);
  const [coloredNoiseSeed, setColoredNoiseSeed] = useState<number>(101);

  // Sinusoid controls
  const [sineAmplitude, setSineAmplitude] = useState<number>(2.0);
  const [sineFrequency, setSineFrequency] = useState<number>(3.0);

  // Rectangular pulse controls
  const [pulseAmplitude, setPulseAmplitude] = useState<number>(2.0);
  const [pulseWidth, setPulseWidth] = useState<number>(1.0);
  const [pulsePosition, setPulsePosition] = useState<number>(0.0);

  // Modals for Theory & Verification
  const [showTheoryModal, setShowTheoryModal] = useState<boolean>(false);
  const [showValidationModal, setShowValidationModal] = useState<boolean>(false);
  const [validationTab, setValidationTab] = useState<'stage5' | 'stage3'>('stage5');

  const isDiscrete = timeDomain === 'discrete';

  useEffect(() => {
    if (!showTheoryModal && !showValidationModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowTheoryModal(false);
        setShowValidationModal(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showTheoryModal, showValidationModal]);

  const handleDomainSwitch = (nextDomain: 'continuous' | 'discrete') => {
    if (nextDomain === timeDomain) return;
    setTimeDomain(nextDomain);
    if (nextDomain === 'discrete') {
      // Keep DTS sinusoid & colored noise within non-aliased Nyquist band
      setSineFrequency((f) => Math.min(4.5, Math.max(0.5, Number(f.toFixed(1)))));
      setColoredNoiseCutoff((fc) => Math.min(8.5, Math.max(0.5, Number(fc.toFixed(1)))));
    }
  };

  const stage5Tests = useMemo(() => executeStage5TestSuite(), []);
  const stage5Passed = stage5Tests.filter((t) => t.status === 'PASS').length;

  const whiteNoiseSigma = Math.sqrt(Math.max(0.01, whiteNoiseVariance));
  const coloredNoiseSigma = Math.sqrt(Math.max(0.01, coloredNoiseVariance));

  // Sampling reference consistent with generateCtsSignal / generateDtsSignal
  const ctsSampleRate = 50;
  const effectiveSampleRate = isDiscrete ? 1 : ctsSampleRate;
  const effectiveColoredCutoff = isDiscrete
    ? Math.max(0.05, Math.min(9.5, coloredNoiseCutoff)) / 20
    : coloredNoiseCutoff;
  const effectiveColoredAlpha = isDiscrete
    ? Math.exp((-2 * Math.PI * Math.max(0.05, Math.min(9.5, coloredNoiseCutoff))) / 20)
    : Math.exp((-2 * Math.PI * coloredNoiseCutoff) / ctsSampleRate);
  const effectiveSineFreq = isDiscrete
    ? Math.min(4.5, sineFrequency) / 10
    : sineFrequency;

  const handleRegenerateNoise = () => {
    if (signalType === 'white_noise') {
      setWhiteNoiseSeed((s) => s + 1);
    } else if (signalType === 'colored_noise') {
      setColoredNoiseSeed((s) => s + 1);
    }
  };

  const handleReset = () => {
    setTimeDomain('continuous');
    setSignalType('white_noise');
    setWhiteNoiseVariance(2.0);
    setWhiteNoiseSeed(42);
    setColoredNoiseVariance(2.0);
    setColoredNoiseCutoff(3.5);
    setColoredNoiseSeed(101);
    setSineAmplitude(2.0);
    setSineFrequency(3.0);
    setPulseAmplitude(2.0);
    setPulseWidth(1.0);
    setPulsePosition(0.0);
  };

  const signalConfig: UnifiedSignalConfig = useMemo(() => {
    const safeFreqForDts = isDiscrete ? Math.min(4.5, sineFrequency) : sineFrequency;
    return {
      type: signalType,
      sine: { amplitude: sineAmplitude, frequency: safeFreqForDts, phase: 0 },
      pulse: { amplitude: pulseAmplitude, width: pulseWidth, position: pulsePosition },
      whiteNoise: {
        stdDev: whiteNoiseSigma,
        variance: whiteNoiseVariance,
        seed: whiteNoiseSeed,
      },
      coloredNoise: {
        stdDev: coloredNoiseSigma,
        variance: coloredNoiseVariance,
        cutoffFreq: coloredNoiseCutoff,
        filterParam: effectiveColoredAlpha,
        seed: coloredNoiseSeed,
      },
    };
  }, [
    signalType,
    sineAmplitude,
    sineFrequency,
    pulseAmplitude,
    pulseWidth,
    pulsePosition,
    whiteNoiseSigma,
    whiteNoiseVariance,
    whiteNoiseSeed,
    coloredNoiseSigma,
    coloredNoiseVariance,
    coloredNoiseCutoff,
    effectiveColoredAlpha,
    coloredNoiseSeed,
    isDiscrete,
  ]);

  const generatedSignal: GeneratedSignal = useMemo(() => {
    if (isDiscrete) {
      return generateDtsSignal(signalConfig, 41, true);
    }
    return generateCtsSignal(signalConfig, -3.0, 3.0, 301);
  }, [signalConfig, isDiscrete]);

  const psdResult: PsdResult = useMemo(() => {
    return computePsd(generatedSignal, isDiscrete, 1024);
  }, [generatedSignal, isDiscrete]);

  const validationTests: PsdValidationTestResult[] = useMemo(() => runPsdValidationTests(), []);

  const pointsSignal = useMemo(
    () => generatedSignal.timeVector.map((t, i) => ({ x: t, y: generatedSignal.samples[i] })),
    [generatedSignal]
  );

  const pointsAutocorr = useMemo(
    () => psdResult.lagAxis.map((l, i) => ({ x: l, y: psdResult.rValues[i] })),
    [psdResult.lagAxis, psdResult.rValues]
  );

  const pointsPsd = useMemo(
    () => psdResult.frequencyAxis.map((f, i) => ({ x: f, y: psdResult.psdValues[i] })),
    [psdResult.frequencyAxis, psdResult.psdValues]
  );

  const signalRange: [number, number] = useMemo(() => {
    let maxAbs = 0.5;
    for (const p of pointsSignal) maxAbs = Math.max(maxAbs, Math.abs(p.y));
    const bound = Math.ceil(maxAbs * 1.25 * 10) / 10;
    return [-bound, bound];
  }, [pointsSignal]);

  const autocorrRange: [number, number] = useMemo(() => {
    let minVal = 0;
    let maxVal = 0.5;
    for (const v of psdResult.rValues) {
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
    }
    const span = Math.max(0.2, maxVal - minVal);
    const yMin = Math.floor((minVal - 0.15 * span) * 10) / 10;
    const yMax = Math.ceil((maxVal + 0.15 * span) * 10) / 10;
    return [Math.min(-0.2, yMin), Math.max(0.5, yMax)];
  }, [psdResult.rValues]);

  const psdRange: [number, number] = useMemo(() => {
    let maxVal = 0.1;
    for (const v of psdResult.psdValues) {
      if (v > maxVal) maxVal = v;
    }
    const yMax = Math.ceil(maxVal * 1.2 * 10) / 10;
    return [0, Math.max(0.2, yMax)];
  }, [psdResult.psdValues]);

  const domainTime: [number, number] = isDiscrete ? [-20, 20] : [-3.0, 3.0];
  const maxLag = isDiscrete ? 40 : Number(generatedSignal.duration.toFixed(1));
  const domainLag: [number, number] = [-maxLag, maxLag];
  const nyquistFreq = Number((psdResult.samplingRate / 2).toFixed(2));
  const domainFreq: [number, number] = [-nyquistFreq, nyquistFreq];
  const freqUnit = isDiscrete ? 'cyc/smp' : 'Hz';

  const experimentExplanation = useMemo(() => {
    if (signalType === 'white_noise') {
      const theoBaseline = (whiteNoiseVariance / psdResult.samplingRate).toFixed(4);
      return {
        heading: 'White Gaussian Noise (Flat Spectrum & Delta Autocorrelation)',
        summary:
          'White noise consists of mutually uncorrelated random samples with zero mean, producing an impulsive autocorrelation at lag zero and a flat two-sided spectral density across [-Fs/2, +Fs/2].',
        formulaTex: isDiscrete
          ? 'r_{xx}[k] = \\sigma^2 \\delta[k] \\quad \\Longleftrightarrow \\quad S_{xx}(f) = \\sigma^2'
          : 'R_{xx}(\\tau) = \\sigma^2 \\delta(\\tau) \\quad \\Longleftrightarrow \\quad S_{xx}(f) = \\frac{\\sigma^2}{F_s}',
        symbols: [
          { symbol: '\\sigma^2', meaning: `Target variance = ${whiteNoiseVariance.toFixed(2)} V²` },
          {
            symbol: 'F_s',
            meaning: `Sampling rate = ${effectiveSampleRate.toFixed(1)} ${freqUnit}`,
          },
          {
            symbol: 'S_0',
            meaning: `Theoretical flat spectral floor = ${theoBaseline} ${psdResult.psdUnits}`,
          },
          {
            symbol: 'R_{xx}(0)',
            meaning: `Zero-lag power = ${psdResult.zeroLagValue.toFixed(4)} ${psdResult.rUnits}`,
          },
        ],
        interpretation: `Measured sample power R(0) = ${psdResult.zeroLagValue.toFixed(4)} ${psdResult.rUnits}. Integrated PSD area ∫ S(f) df = ${psdResult.psdArea.toFixed(4)} ${psdResult.rUnits} matches R(0) with error ${psdResult.areaError < 1e-12 ? '< 10⁻¹²' : psdResult.areaError.toExponential(2)}.`,
      };
    }

    if (signalType === 'colored_noise') {
      return {
        heading: 'Colored Noise (Single-Pole Lowpass AR(1) Process)',
        summary:
          'Colored noise routes white noise through a first-order lowpass filter y[n] = α y[n-1] + √(1-α²) w[n]. Temporal memory causes exponential autocorrelation decay and concentrates spectral power below cutoff fc.',
        formulaTex:
          'S_{xx}(f) = \\frac{\\sigma^2 (1 - \\alpha^2)}{F_s |1 - \\alpha e^{-j 2\\pi f / F_s}|^2}',
        symbols: [
          {
            symbol: 'f_c',
            meaning: `3-dB cutoff = ${effectiveColoredCutoff.toFixed(2)} ${freqUnit}`,
          },
          { symbol: '\\alpha', meaning: `AR(1) pole = ${effectiveColoredAlpha.toFixed(3)}` },
          {
            symbol: 'R_{xx}(0)',
            meaning: `Filtered power = ${psdResult.zeroLagValue.toFixed(4)} ${psdResult.rUnits}`,
          },
        ],
        interpretation: `Autocorrelation decays exponentially across lags with zero-lag power R(0) = ${psdResult.zeroLagValue.toFixed(4)} ${psdResult.rUnits}. Wiener–Khinchin equality holds with error ${psdResult.areaError < 1e-12 ? '< 10⁻¹²' : psdResult.areaError.toExponential(2)}.`,
      };
    }

    if (signalType === 'pulse') {
      const W = isDiscrete ? Math.round(pulseWidth * 5) : pulseWidth;
      return {
        heading: 'Rectangular Pulse (Energy Spectral Density)',
        summary:
          'A finite-duration rectangular pulse of amplitude A and width W has a triangular autocorrelation R_xx(τ) = A²(W - |τ|). By the Wiener–Khinchin theorem, its energy spectral density follows a squared sinc profile S_xx(f) = A² W² sinc²(f W).',
        formulaTex:
          'R_{xx}(\\tau) = A^2 (W - |\\tau|) \\quad \\Longleftrightarrow \\quad S_{xx}(f) = A^2 W^2 \\operatorname{sinc}^2(f W)',
        symbols: [
          { symbol: 'A', meaning: `Pulse amplitude = ${pulseAmplitude.toFixed(2)} V` },
          { symbol: 'W', meaning: `Pulse width = ${isDiscrete ? `${W} samples` : `${W.toFixed(2)} s`}` },
          {
            symbol: 'E_x',
            meaning: `Theoretical energy A²W = ${(pulseAmplitude * pulseAmplitude * W).toFixed(4)} ${psdResult.rUnits}`,
          },
          {
            symbol: 'R_{xx}(0)',
            meaning: `Measured energy = ${psdResult.zeroLagValue.toFixed(4)} ${psdResult.rUnits}`,
          },
        ],
        interpretation: `Zero-lag energy R(0) = ${psdResult.zeroLagValue.toFixed(4)} ${psdResult.rUnits} equals integrated ESD area ∫ S(f) df = ${psdResult.psdArea.toFixed(4)} ${psdResult.rUnits}.`,
      };
    }

    return {
      heading: 'Harmonic Sinusoid (Discrete Spectral Tones)',
      summary:
        'A sinusoidal waveform x(t) = A cos(2π f₀ t) has periodic autocorrelation R_xx(τ) = (A²/2) cos(2π f₀ τ). Its two-sided PSD exhibits symmetric peaks at ±f₀ broadened by the finite observation window.',
      formulaTex:
        'R_{xx}(\\tau) = \\frac{A^2}{2} \\cos(2\\pi f_0 \\tau) \\quad \\Longleftrightarrow \\quad S_{xx}(f) = \\frac{A^2}{4} [\\delta(f - f_0) + \\delta(f + f_0)]',
      symbols: [
        { symbol: 'f_0', meaning: `Frequency = ${effectiveSineFreq.toFixed(2)} ${freqUnit}` },
        { symbol: 'A', meaning: `Amplitude = ${sineAmplitude.toFixed(2)} V` },
        {
          symbol: 'P_x',
          meaning: `Theoretical power A²/2 = ${((sineAmplitude * sineAmplitude) / 2).toFixed(4)} V²`,
        },
        {
          symbol: 'R_{xx}(0)',
          meaning: `Measured power = ${psdResult.zeroLagValue.toFixed(4)} ${psdResult.rUnits}`,
        },
      ],
      interpretation: `Detected spectral peaks occur at ±${psdResult.peakFrequency.toFixed(2)} ${freqUnit}. Integrated PSD area ∫ S(f) df = ${psdResult.psdArea.toFixed(4)} ${psdResult.rUnits} equals R(0) = ${psdResult.zeroLagValue.toFixed(4)} ${psdResult.rUnits}.`,
    };
  }, [
    signalType,
    whiteNoiseVariance,
    coloredNoiseCutoff,
    sineAmplitude,
    pulseAmplitude,
    pulseWidth,
    psdResult,
    isDiscrete,
    effectiveSampleRate,
    effectiveColoredCutoff,
    effectiveColoredAlpha,
    effectiveSineFreq,
    freqUnit,
  ]);

  // Reusable contextual sidebar content (used in main right sidebar AND full-screen plot overlay)
  const renderControlsContent = (compactForOverlay = false) => (
    <div className="space-y-3.5">
      {/* Time Domain */}
      <section className="space-y-1.5">
        <div className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-[#75736E]">
          Time Domain
        </div>
        <div className="grid grid-cols-2 gap-1 bg-white p-0.5 rounded-md border border-[#E6E4DD]">
          <button
            type="button"
            onClick={() => handleDomainSwitch('continuous')}
            className={`py-1.5 px-2 text-xs font-semibold rounded transition-colors cursor-pointer ${
              !isDiscrete
                ? 'bg-[#1A1917] text-white shadow-xs'
                : 'text-[#585651] hover:text-[#1A1917]'
            }`}
          >
            Continuous (CTS)
          </button>
          <button
            type="button"
            onClick={() => handleDomainSwitch('discrete')}
            className={`py-1.5 px-2 text-xs font-semibold rounded transition-colors cursor-pointer ${
              isDiscrete
                ? 'bg-[#1A1917] text-white shadow-xs'
                : 'text-[#585651] hover:text-[#1A1917]'
            }`}
          >
            Discrete (DTS)
          </button>
        </div>
      </section>

      {/* Strict 4-Option Signal Selector */}
      <section className="space-y-2 pt-3 border-t border-[#E6E4DD]">
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-[#75736E]">
            Signal Source
          </span>
          <span className="text-[10px] font-mono text-[#8A8882]">
            {psdResult.convention === 'energy' ? 'Energy (ESD)' : 'Power (PSD)'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-md border border-[#E6E4DD]">
          {SIGNAL_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSignalType(opt.value)}
              className={`py-1.5 px-2 text-[11.5px] font-semibold rounded transition-colors cursor-pointer ${
                signalType === opt.value
                  ? 'bg-[#FBF4F0] text-[#C85A32] border border-[#C85A32]/35 shadow-2xs'
                  : 'text-[#585651] hover:text-[#1A1917] hover:bg-[#FAF9F6] border border-transparent'
              }`}
            >
              {opt.shortLabel}
            </button>
          ))}
        </div>
      </section>

      {/* Signal Parameter Sliders */}
      <section className="space-y-2.5 pt-3 border-t border-[#E6E4DD]">
        <div className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-[#75736E]">
          Parameters
        </div>

        <div className="p-2.5 bg-white border border-[#E6E4DD] rounded-md space-y-2.5">
          {signalType === 'white_noise' && (
            <>
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono text-[#585651]">
                  <span>Variance (σ²)</span>
                  <span className="font-bold text-[#C85A32]">
                    {whiteNoiseVariance.toFixed(2)} V²
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="8.0"
                  step="0.2"
                  value={whiteNoiseVariance}
                  onChange={(e) => setWhiteNoiseVariance(parseFloat(e.target.value))}
                  className="w-full accent-[#C85A32] cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono text-[#585651]">
                  <span>Std Dev (σ)</span>
                  <span className="font-bold text-[#1A1917]">{whiteNoiseSigma.toFixed(2)} V</span>
                </div>
                <input
                  type="range"
                  min="0.45"
                  max="2.83"
                  step="0.05"
                  value={whiteNoiseSigma}
                  onChange={(e) => {
                    const s = parseFloat(e.target.value);
                    setWhiteNoiseVariance(Number((s * s).toFixed(2)));
                  }}
                  className="w-full accent-[#C85A32] cursor-pointer"
                />
              </div>

              <button
                type="button"
                onClick={handleRegenerateNoise}
                className="w-full py-1.5 px-3 bg-[#FBF4F0] hover:bg-[#F5EAE4] border border-[#C85A32]/30 rounded-md text-xs font-mono font-semibold text-[#C85A32] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>New Realization (Seed #{whiteNoiseSeed})</span>
              </button>
            </>
          )}

          {signalType === 'colored_noise' && (
            <>
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono text-[#585651]">
                  <span>Target Variance (σ²)</span>
                  <span className="font-bold text-[#C85A32]">
                    {coloredNoiseVariance.toFixed(2)} V²
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="8.0"
                  step="0.2"
                  value={coloredNoiseVariance}
                  onChange={(e) => setColoredNoiseVariance(parseFloat(e.target.value))}
                  className="w-full accent-[#C85A32] cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono text-[#585651]">
                  <span>Cutoff (f_c)</span>
                  <span className="font-bold text-[#C85A32]">
                    {effectiveColoredCutoff.toFixed(2)} {freqUnit}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max={isDiscrete ? 8.5 : 15.0}
                  step="0.5"
                  value={Math.min(isDiscrete ? 8.5 : 15.0, coloredNoiseCutoff)}
                  onChange={(e) => setColoredNoiseCutoff(parseFloat(e.target.value))}
                  className="w-full accent-[#C85A32] cursor-pointer"
                />
                <div className="text-[10.5px] font-mono text-[#75736E] flex justify-between">
                  <span>AR(1) Pole α</span>
                  <span className="font-semibold text-[#1A1917]">
                    {effectiveColoredAlpha.toFixed(3)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleRegenerateNoise}
                className="w-full py-1.5 px-3 bg-[#FBF4F0] hover:bg-[#F5EAE4] border border-[#C85A32]/30 rounded-md text-xs font-mono font-semibold text-[#C85A32] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span>New Realization (Seed #{coloredNoiseSeed})</span>
              </button>
            </>
          )}

          {signalType === 'sine' && (
            <>
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono text-[#585651]">
                  <span>Amplitude (A)</span>
                  <span className="font-bold text-[#C85A32]">{sineAmplitude.toFixed(2)} V</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="4.0"
                  step="0.1"
                  value={sineAmplitude}
                  onChange={(e) => setSineAmplitude(parseFloat(e.target.value))}
                  className="w-full accent-[#C85A32] cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono text-[#585651]">
                  <span>Frequency (f₀)</span>
                  <span className="font-bold text-[#C85A32]">
                    {effectiveSineFreq.toFixed(2)} {freqUnit}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max={isDiscrete ? 4.5 : 10.0}
                  step="0.5"
                  value={Math.min(isDiscrete ? 4.5 : 10.0, sineFrequency)}
                  onChange={(e) => setSineFrequency(parseFloat(e.target.value))}
                  className="w-full accent-[#C85A32] cursor-pointer"
                />
                <div className="text-[10.5px] font-mono text-[#75736E] flex justify-between">
                  <span>Theory A²/2</span>
                  <span className="font-semibold text-[#1A1917]">
                    {((sineAmplitude * sineAmplitude) / 2).toFixed(3)} V²
                  </span>
                </div>
              </div>
            </>
          )}

          {signalType === 'pulse' && (
            <>
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono text-[#585651]">
                  <span>Amplitude (A)</span>
                  <span className="font-bold text-[#C85A32]">{pulseAmplitude.toFixed(2)} V</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="4.0"
                  step="0.1"
                  value={pulseAmplitude}
                  onChange={(e) => setPulseAmplitude(parseFloat(e.target.value))}
                  className="w-full accent-[#C85A32] cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono text-[#585651]">
                  <span>Width (W)</span>
                  <span className="font-bold text-[#C85A32]">
                    {isDiscrete ? `${Math.round(pulseWidth * 5)} samples` : `${pulseWidth.toFixed(2)} s`}
                  </span>
                </div>
                <input
                  type="range"
                  min="0.4"
                  max="2.4"
                  step="0.2"
                  value={pulseWidth}
                  onChange={(e) => setPulseWidth(parseFloat(e.target.value))}
                  className="w-full accent-[#C85A32] cursor-pointer"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-mono text-[#585651]">
                  <span>Center (t₀)</span>
                  <span className="font-bold text-[#1A1917]">
                    {isDiscrete
                      ? `${Math.round(pulsePosition * 5)} samples`
                      : `${pulsePosition.toFixed(2)} s`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-1.5"
                  max="1.5"
                  step="0.1"
                  value={pulsePosition}
                  onChange={(e) => setPulsePosition(parseFloat(e.target.value))}
                  className="w-full accent-[#C85A32] cursor-pointer"
                />
              </div>
            </>
          )}
        </div>
      </section>

      {/* Sampling & Pipeline Summary */}
      <section className="p-2.5 bg-white border border-[#E6E4DD] rounded-md text-[11px] font-mono space-y-1">
        <div className="flex justify-between text-[#585651]">
          <span>Sampling Rate (F_s)</span>
          <span className="font-semibold text-[#1A1917]">
            {effectiveSampleRate.toFixed(1)} {freqUnit}
          </span>
        </div>
        <div className="flex justify-between text-[#585651]">
          <span>Resolution (Δf)</span>
          <span className="font-semibold text-[#1A1917]">
            {psdResult.frequencyResolution.toFixed(4)} {freqUnit}
          </span>
        </div>
        <div className="flex justify-between text-[#585651]">
          <span>Samples (N / N_fft)</span>
          <span className="font-semibold text-[#1A1917]">
            {generatedSignal.samples.length} / {psdResult.frequencyAxis.length}
          </span>
        </div>
      </section>

      {compactForOverlay && (
        <button
          type="button"
          onClick={handleReset}
          className="w-full py-1.5 px-3 rounded-md border border-[#E6E4DD] bg-white hover:bg-[#F3F2EC] text-xs font-mono text-[#585651] hover:text-[#1A1917] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset Parameters</span>
        </button>
      )}
    </div>
  );

  const signalTitleLabel =
    signalType === 'white_noise'
      ? 'White Noise'
      : signalType === 'colored_noise'
      ? 'Colored Noise'
      : signalType === 'pulse'
      ? 'Rectangular Pulse'
      : 'Sinusoid';

  return (
    <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
      {/* LEFT / CENTER VISUALIZATION CANVAS */}
      <main className="w-full lg:flex-1 min-w-0 min-h-0 flex flex-col p-3 gap-2.5 overflow-hidden bg-white">
        {/* Compact 4-Metric Wiener-Khinchin KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 shrink-0">
          <div className="px-3 py-2 bg-[#FAF9F6] border border-[#E6E4DD] rounded-md flex items-baseline justify-between gap-2">
            <span className="text-[10.5px] font-mono uppercase tracking-wide text-[#75736E] truncate">
              {isDiscrete ? 'r_xx[0]' : 'R_xx(0)'}
            </span>
            <span className="text-sm font-mono font-bold text-[#1A1917] shrink-0">
              {psdResult.zeroLagValue.toFixed(4)}{' '}
              <span className="text-[10.5px] font-normal text-[#75736E]">{psdResult.rUnits}</span>
            </span>
          </div>

          <div className="px-3 py-2 bg-[#FBF4F0] border border-[#C85A32]/25 rounded-md flex items-baseline justify-between gap-2">
            <span className="text-[10.5px] font-mono uppercase tracking-wide text-[#C85A32] truncate">
              ∫ S(f) df
            </span>
            <span className="text-sm font-mono font-bold text-[#C85A32] shrink-0">
              {psdResult.psdArea.toFixed(4)}{' '}
              <span className="text-[10.5px] font-normal text-[#75736E]">{psdResult.rUnits}</span>
            </span>
          </div>

          <div className="px-3 py-2 bg-[#FAF9F6] border border-[#E6E4DD] rounded-md flex items-baseline justify-between gap-2">
            <span className="text-[10.5px] font-mono uppercase tracking-wide text-[#75736E] truncate">
              Peak @ {psdResult.peakFrequency.toFixed(2)} {freqUnit}
            </span>
            <span className="text-sm font-mono font-bold text-[#1A1917] shrink-0">
              {psdResult.peakPsdValue.toFixed(3)}{' '}
              <span className="text-[10.5px] font-normal text-[#75736E]">{psdResult.psdUnits}</span>
            </span>
          </div>

          <div className="px-3 py-2 bg-emerald-50/60 border border-emerald-200 rounded-md flex items-baseline justify-between gap-2">
            <span className="text-[10.5px] font-mono uppercase tracking-wide text-emerald-800 truncate">
              |∫S df − R(0)|
            </span>
            <span className="text-sm font-mono font-bold text-emerald-700 shrink-0">
              {psdResult.areaError < 1e-12 ? '< 10⁻¹²' : psdResult.areaError.toExponential(2)}
            </span>
          </div>
        </div>

        {/* 3 Synchronized Graphs (Zero-Scroll Grid) */}
        <div className="flex-1 min-h-0 flex flex-col gap-2.5">
          {/* Top Row: Time-Domain Signal */}
          <SignalPlotCanvas
            title={`1. Time-Domain Realization: ${signalTitleLabel} x${isDiscrete ? '[n]' : '(t)'}`}
            subtitle={`N = ${generatedSignal.samples.length} samples · ${
              psdResult.convention === 'energy'
                ? `Energy E = ${generatedSignal.energy.toFixed(4)} ${psdResult.rUnits}`
                : `Avg Power P = ${generatedSignal.power.toFixed(4)} ${psdResult.rUnits}`
            }`}
            xLabel={isDiscrete ? 'Sample Index n (samples)' : 'Time t (s)'}
            yLabel="Amplitude (V)"
            domain={domainTime}
            range={signalRange}
            isDiscrete={isDiscrete}
            height={160}
            className="flex-[0.88] min-h-[190px] lg:min-h-0"
            expandedSidebar={renderControlsContent(true)}
            series={[
              {
                id: 'raw-signal',
                name: `x${isDiscrete ? '[n]' : '(t)'}`,
                color: '#1A1917',
                strokeWidth: 1.5,
                points: pointsSignal,
              },
            ]}
          />

          {/* Bottom Row: Autocorrelation & Two-Sided PSD */}
          <div className="flex-[1.12] min-h-0 grid grid-cols-1 lg:grid-cols-2 gap-2.5">
            <SignalPlotCanvas
              title={`2. Autocorrelation ${isDiscrete ? 'r_xx[k]' : 'R_xx(τ)'}`}
              subtitle={`Zero-lag R(0) = ${psdResult.zeroLagValue.toFixed(4)} ${psdResult.rUnits}`}
              xLabel={isDiscrete ? 'Lag k (samples)' : 'Lag τ (s)'}
              yLabel={`${isDiscrete ? 'r_xx[k]' : 'R_xx(τ)'} (${psdResult.rUnits})`}
              domain={domainLag}
              range={autocorrRange}
              isDiscrete={isDiscrete}
              height={190}
              className="h-full min-h-[200px] lg:min-h-0"
              expandedSidebar={renderControlsContent(true)}
              markers={[
                {
                  x: 0,
                  y: psdResult.zeroLagValue,
                  color: '#C85A32',
                  style: 'dashed',
                },
              ]}
              series={[
                {
                  id: 'rxx-curve',
                  name: isDiscrete ? 'r_xx[k]' : 'R_xx(τ)',
                  color: '#1A1917',
                  strokeWidth: 1.9,
                  points: pointsAutocorr,
                },
              ]}
            />

            <SignalPlotCanvas
              title={`3. Two-Sided ${psdResult.convention === 'energy' ? 'ESD' : 'PSD'} S_xx(f)`}
              subtitle={`Wiener–Khinchin F{R(τ)} · Area ∫S df = ${psdResult.psdArea.toFixed(4)} ${psdResult.rUnits}`}
              xLabel={`Frequency f (${freqUnit})`}
              yLabel={`S_xx(f) (${psdResult.psdUnits})`}
              domain={domainFreq}
              range={psdRange}
              isDiscrete={false}
              height={190}
              className="h-full min-h-[200px] lg:min-h-0"
              expandedSidebar={renderControlsContent(true)}
              markers={[
                { x: 0, color: '#8A8882', style: 'dashed' },
                ...(signalType === 'colored_noise'
                  ? [
                      { x: effectiveColoredCutoff, color: '#C85A32', style: 'solid' as const },
                      { x: -effectiveColoredCutoff, color: '#C85A32', style: 'dashed' as const },
                    ]
                  : signalType === 'sine'
                  ? [
                      {
                        x: psdResult.peakFrequency,
                        y: psdResult.peakPsdValue,
                        color: '#C85A32',
                        style: 'solid' as const,
                      },
                      {
                        x: -psdResult.peakFrequency,
                        y: psdResult.peakPsdValue,
                        color: '#C85A32',
                        style: 'dashed' as const,
                      },
                    ]
                  : []),
              ]}
              series={[
                {
                  id: 'psd-curve',
                  name: 'S_xx(f)',
                  color: '#C85A32',
                  strokeWidth: 2,
                  points: pointsPsd,
                },
              ]}
            />
          </div>
        </div>
      </main>

      {/* RIGHT-HAND STICKY CONTROL SIDEBAR */}
      <aside className="w-full lg:w-[315px] xl:w-[335px] lg:h-full bg-[#FAF9F6] border-t lg:border-t-0 lg:border-l border-[#E6E4DD] p-3.5 flex flex-col justify-between gap-3 lg:overflow-y-auto shrink-0">
        <div className="space-y-3.5">
          {/* Sidebar Header */}
          <div className="flex items-center justify-between pb-2 border-b border-[#E6E4DD]">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[#C85A32]" />
              <h2 className="text-xs font-heading font-semibold tracking-wider uppercase text-[#1A1917]">
                Spectral Controls
              </h2>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="py-1 px-2 rounded text-[11px] font-mono text-[#75736E] hover:text-[#C85A32] hover:bg-white border border-transparent hover:border-[#E6E4DD] transition-colors cursor-pointer flex items-center gap-1"
              title="Reset parameters to defaults"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          {renderControlsContent(false)}
        </div>

        {/* Footer Reference Modal Triggers */}
        <div className="pt-2.5 border-t border-[#E6E4DD] grid grid-cols-2 gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowTheoryModal(true)}
            className="py-1.5 px-2.5 rounded-md bg-white hover:bg-[#F3F2EC] border border-[#E6E4DD] text-[11px] font-mono font-semibold text-[#1A1917] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#C85A32]" />
            <span>Theory</span>
          </button>
          <button
            type="button"
            onClick={() => setShowValidationModal(true)}
            className="py-1.5 px-2.5 rounded-md bg-white hover:bg-[#F3F2EC] border border-[#E6E4DD] text-[11px] font-mono font-semibold text-emerald-700 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              Tests ({stage5Passed}/{stage5Tests.length})
            </span>
          </button>
        </div>
      </aside>

      {/* THEORY MODAL */}
      {showTheoryModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[110] bg-[#1A1917]/40 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setShowTheoryModal(false)}
          >
            <div
              className="bg-white border border-[#E6E4DD] rounded-lg shadow-xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-3.5 bg-[#FAF9F6] border-b border-[#E6E4DD] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[#C85A32]" />
                  <h3 className="text-xs font-heading font-semibold tracking-wider uppercase text-[#1A1917]">
                    Wiener–Khinchin Spectral Theory
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTheoryModal(false)}
                  className="p-1 rounded text-[#75736E] hover:text-[#1A1917] hover:bg-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 overflow-y-auto space-y-4">
                <div>
                  <h4 className="font-heading font-semibold text-sm text-[#1A1917] mb-1">
                    {experimentExplanation.heading}
                  </h4>
                  <p className="text-xs sm:text-[13px] text-[#484642] leading-relaxed">
                    {experimentExplanation.summary}
                  </p>
                </div>

                <div className="p-3.5 bg-[#FAF9F6] rounded-md border border-[#E6E4DD]">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#75736E] mb-2">
                    Transform Pair
                  </div>
                  <div className="p-2.5 bg-white rounded border border-[#E6E4DD]/80">
                    <MathView math={experimentExplanation.formulaTex} displayMode={true} />
                  </div>
                </div>

                <div className="p-3.5 bg-[#FBF4F0]/60 rounded-md border border-[#C85A32]/20 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1A1917]">
                    <Info className="w-3.5 h-3.5 text-[#C85A32]" />
                    <span>Live Numerical Verification</span>
                  </div>
                  <p className="text-xs text-[#585651] leading-relaxed">
                    {experimentExplanation.interpretation}
                  </p>
                </div>

                <div className="divide-y divide-[#E6E4DD] rounded-md border border-[#E6E4DD] bg-white overflow-hidden text-xs">
                  {experimentExplanation.symbols.map((sym, idx) => (
                    <div key={idx} className="flex items-start justify-between p-2.5 gap-3">
                      <span className="font-mono font-bold text-[#C85A32] shrink-0">
                        {sym.symbol}
                      </span>
                      <span className="text-[#585651] text-right">{sym.meaning}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* VALIDATION MODAL */}
      {showValidationModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[110] bg-[#1A1917]/40 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setShowValidationModal(false)}
          >
            <div
              className="bg-white border border-[#E6E4DD] rounded-lg shadow-xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-5 py-3.5 bg-[#FAF9F6] border-b border-[#E6E4DD] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-heading font-semibold tracking-wider uppercase text-[#1A1917]">
                    Mathematical Verification Suite
                  </h3>
                  <span className="text-[10px] font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded">
                    {stage5Passed}/{stage5Tests.length} PASSED
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowValidationModal(false)}
                  className="p-1 rounded text-[#75736E] hover:text-[#1A1917] hover:bg-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 overflow-y-auto space-y-3.5">
                <div className="flex items-center gap-2 border-b border-[#E6E4DD] pb-2">
                  <button
                    type="button"
                    onClick={() => setValidationTab('stage5')}
                    className={`px-3 py-1 text-xs font-mono rounded cursor-pointer transition-colors ${
                      validationTab === 'stage5'
                        ? 'bg-[#1A1917] text-white font-bold'
                        : 'text-[#585651] hover:text-[#1A1917] bg-[#FAF9F6] border border-[#E6E4DD]'
                    }`}
                  >
                    Stage 5 Suite ({stage5Tests.length} Tests)
                  </button>
                  <button
                    type="button"
                    onClick={() => setValidationTab('stage3')}
                    className={`px-3 py-1 text-xs font-mono rounded cursor-pointer transition-colors ${
                      validationTab === 'stage3'
                        ? 'bg-[#1A1917] text-white font-bold'
                        : 'text-[#585651] hover:text-[#1A1917] bg-[#FAF9F6] border border-[#E6E4DD]'
                    }`}
                  >
                    PSD Properties ({validationTests.length} Tests)
                  </button>
                </div>

                {validationTab === 'stage5' ? (
                  <div className="overflow-x-auto border border-[#E6E4DD] rounded-md bg-white">
                    <table className="w-full text-left text-xs font-mono border-collapse">
                      <thead>
                        <tr className="bg-[#FAF9F6] border-b border-[#E6E4DD] text-[#75736E]">
                          <th className="py-2 px-3 font-semibold">ID</th>
                          <th className="py-2 px-3 font-semibold">Test Name</th>
                          <th className="py-2 px-3 font-semibold">Expected</th>
                          <th className="py-2 px-3 font-semibold">Actual</th>
                          <th className="py-2 px-3 font-semibold text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E6E4DD]">
                        {stage5Tests.map((t) => (
                          <tr key={t.id} className="hover:bg-[#FBF4F0]/40">
                            <td className="py-2 px-3 font-bold text-[#C85A32]">{t.id}</td>
                            <td className="py-2 px-3 font-semibold text-[#1A1917]">{t.testName}</td>
                            <td className="py-2 px-3 text-[#585651]">{t.expectedResult}</td>
                            <td className="py-2 px-3 text-[#1A1917]">{t.actualResult}</td>
                            <td className="py-2 px-3 text-right">
                              <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                {t.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {validationTests.map((t) => (
                      <div
                        key={t.testNumber}
                        className="p-3 bg-[#FAF9F6] border border-[#E6E4DD] rounded-md text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between font-mono font-semibold">
                          <span className="text-[#1A1917]">
                            {t.testNumber < 10 ? `0${t.testNumber}` : t.testNumber}. {t.title}
                          </span>
                          <span className={t.passed ? 'text-emerald-600 font-bold' : 'text-red-600 font-bold'}>
                            {t.passed ? 'PASSED' : 'FAILED'}
                          </span>
                        </div>
                        <p className="text-[#585651]">{t.description}</p>
                        <div className="text-[10px] font-mono text-[#75736E] pt-1 border-t border-[#E6E4DD]">
                          {t.details}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
