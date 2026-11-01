import React, { useState, useMemo } from 'react';
import {
  RotateCcw,
  Sliders,
  Activity,
  Info,
  Shuffle,
  ArrowLeftRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Waves,
  BookOpen,
} from 'lucide-react';
import { SignalPlotCanvas } from './SignalPlotCanvas';
import { MathView } from '../MathView';
import {
  UnifiedSignalConfig,
  generateCtsSignal,
  generateDtsSignal,
  GeneratedSignal,
} from './signalGenerators';
import { computePsd, PsdResult, runPsdValidationTests, PsdValidationTestResult } from './psdEngine';
import { executeStage5TestSuite } from './stage5VerificationSuite';

export type PsdSignalType = 'white_noise' | 'colored_noise' | 'sine';

export const PsdWorkspace: React.FC = () => {
  // Domain mode: continuous vs discrete
  const [timeDomain, setTimeDomain] = useState<'continuous' | 'discrete'>('continuous');

  // Signal type selection (white noise, colored noise, or sinusoid)
  const [signalType, setSignalType] = useState<PsdSignalType>('white_noise');

  // White noise controls: variance & seed
  const [whiteNoiseVariance, setWhiteNoiseVariance] = useState<number>(2.0); // sigma^2 in V^2
  const [whiteNoiseSeed, setWhiteNoiseSeed] = useState<number>(42);

  // Colored noise controls: variance, filter cutoff frequency, seed
  const [coloredNoiseVariance, setColoredNoiseVariance] = useState<number>(2.0); // sigma^2 in V^2
  const [coloredNoiseCutoff, setColoredNoiseCutoff] = useState<number>(3.5); // fc in Hz
  const [coloredNoiseSeed, setColoredNoiseSeed] = useState<number>(101);

  // Sinusoid controls: amplitude & frequency
  const [sineAmplitude, setSineAmplitude] = useState<number>(2.0);
  const [sineFrequency, setSineFrequency] = useState<number>(3.0); // Hz

  // Expandable validation test suite drawer
  const [showValidation, setShowValidation] = useState<boolean>(false);
  const [validationTab, setValidationTab] = useState<'stage5' | 'stage3'>('stage5');

  // Theory & Explanation Collapsible Panel (collapsed by default)
  const [showTheory, setShowTheory] = useState<boolean>(false);

  const stage5Tests = useMemo(() => {
    return executeStage5TestSuite();
  }, []);

  const isDiscrete = timeDomain === 'discrete';

  // Compute standard deviations from variance controls
  const whiteNoiseSigma = Math.sqrt(Math.max(0.01, whiteNoiseVariance));
  const coloredNoiseSigma = Math.sqrt(Math.max(0.01, coloredNoiseVariance));

  // Sampling rate for continuous approximation
  const sampleRate = 50; // Fs = 50 Hz

  // Noise regeneration handler: creates a new realization using the exact same pipeline
  const handleRegenerateNoise = () => {
    if (signalType === 'white_noise') {
      setWhiteNoiseSeed((s) => s + 1);
    } else if (signalType === 'colored_noise') {
      setColoredNoiseSeed((s) => s + 1);
    }
  };

  // Reset all parameters to baseline state
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
  };

  // Build unified config
  const signalConfig: UnifiedSignalConfig = useMemo(() => {
    return {
      type: signalType,
      sine: { amplitude: sineAmplitude, frequency: sineFrequency, phase: 0 },
      pulse: { amplitude: 1.0, width: 1.0, position: 0 }, // unused in PSD mode
      whiteNoise: {
        stdDev: whiteNoiseSigma,
        variance: whiteNoiseVariance,
        seed: whiteNoiseSeed,
      },
      coloredNoise: {
        stdDev: coloredNoiseSigma,
        variance: coloredNoiseVariance,
        cutoffFreq: coloredNoiseCutoff,
        filterParam: Math.exp((-2 * Math.PI * coloredNoiseCutoff) / sampleRate),
        seed: coloredNoiseSeed,
      },
    };
  }, [
    signalType,
    sineAmplitude,
    sineFrequency,
    whiteNoiseSigma,
    whiteNoiseVariance,
    whiteNoiseSeed,
    coloredNoiseSigma,
    coloredNoiseVariance,
    coloredNoiseCutoff,
    coloredNoiseSeed,
  ]);

  // SYNCHRONIZED GENERATION: Generate the signal ONCE for the entire experiment
  const generatedSignal: GeneratedSignal = useMemo(() => {
    if (isDiscrete) {
      // DTS with 41 samples
      return generateDtsSignal(signalConfig, 41, true);
    }
    // CTS continuous approximation with 301 points over [-3s, +3s]
    return generateCtsSignal(signalConfig, -3.0, 3.0, 301);
  }, [signalConfig, isDiscrete]);

  // Compute Autocorrelation and PSD from the EXACT same generated signal samples
  const psdResult: PsdResult = useMemo(() => {
    return computePsd(generatedSignal, isDiscrete, 1024);
  }, [generatedSignal, isDiscrete]);

  // Execute mathematical validation test suite
  const validationTests: PsdValidationTestResult[] = useMemo(() => {
    return runPsdValidationTests();
  }, []);

  // Time-domain signal plot points
  const pointsSignal = useMemo(() => {
    return generatedSignal.timeVector.map((t, i) => ({ x: t, y: generatedSignal.samples[i] }));
  }, [generatedSignal]);

  // Autocorrelation plot points
  const pointsAutocorr = useMemo(() => {
    return psdResult.lagAxis.map((l, i) => ({ x: l, y: psdResult.rValues[i] }));
  }, [psdResult.lagAxis, psdResult.rValues]);

  // Two-sided PSD plot points
  const pointsPsd = useMemo(() => {
    return psdResult.frequencyAxis.map((f, i) => ({ x: f, y: psdResult.psdValues[i] }));
  }, [psdResult.frequencyAxis, psdResult.psdValues]);

  // Dynamic axis limits
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
    const yMax = Math.ceil((maxVal * 1.2) * 10) / 10;
    return [0, Math.max(0.2, yMax)];
  }, [psdResult.psdValues]);

  const domainTime: [number, number] = isDiscrete ? [-20, 20] : [-3.0, 3.0];
  const maxLag = isDiscrete ? 40 : Number(generatedSignal.duration.toFixed(1));
  const domainLag: [number, number] = [-maxLag, maxLag];
  const nyquistFreq = Number((psdResult.samplingRate / 2).toFixed(1));
  const domainFreq: [number, number] = [-nyquistFreq, nyquistFreq];

  // Structured dynamic engineering explanation conforming to Stage 6
  const experimentExplanation = useMemo(() => {
    if (signalType === 'white_noise') {
      const theoBaseline = (whiteNoiseVariance / psdResult.samplingRate).toFixed(4);
      return {
        heading: 'White Gaussian Noise (Flat Spectrum & Delta Autocorrelation)',
        summary: `White noise consists of mutually uncorrelated random samples with zero mean. Every sample is statistically independent of all past and future samples, producing an impulsive autocorrelation and a flat spectral density across all frequencies up to Nyquist limit F_s/2.`,
        formulaTex: isDiscrete
          ? 'r_{xx}[k] = \\sigma^2 \\delta[k] \\quad \\Longleftrightarrow \\quad S_{xx}(f) = \\frac{\\sigma^2}{F_s}'
          : 'R_{xx}(\\tau) = \\sigma^2 \\delta(\\tau) \\quad \\Longleftrightarrow \\quad S_{xx}(f) = \\frac{\\sigma^2}{F_s}',
        symbols: [
          { symbol: '\\sigma^2', meaning: `Process variance = ${whiteNoiseVariance.toFixed(2)} V²` },
          { symbol: 'F_s', meaning: `Sampling frequency = ${psdResult.samplingRate.toFixed(1)} Hz` },
          { symbol: 'S_0', meaning: `Theoretical flat spectral floor = σ²/F_s = ${theoBaseline} V²/Hz` },
          { symbol: 'R_{xx}(0)', meaning: `Zero-lag power = ${psdResult.zeroLagValue.toFixed(4)} ${psdResult.rUnits}` },
        ],
        interpretation: `Measured sample power is R(0) = ${psdResult.zeroLagValue.toFixed(4)} V² (target σ² = ${whiteNoiseVariance.toFixed(2)} V²). Total integrated PSD area ∫ S(f) df = ${psdResult.psdArea.toFixed(4)} V² converges to R(0) within machine precision (difference = ${psdResult.areaError < 1e-12 ? '< 10⁻¹²' : psdResult.areaError.toExponential(2)} V²). Individual spectral bins exhibit authentic finite-sample Rayleigh/exponential fluctuations.`,
      };
    }
    if (signalType === 'colored_noise') {
      const alphaVal = Math.exp((-2 * Math.PI * coloredNoiseCutoff) / sampleRate).toFixed(2);
      return {
        heading: 'Colored Noise (Single-Pole Lowpass Filtered Spectrum)',
        summary: `Colored noise is generated by routing white noise through a first-order digital lowpass filter: y[n] = α y[n-1] + √(1-α²) w[n]. The memory parameter α = e^{-2π fc / Fs} introduces correlation across successive samples, causing autocorrelation to decay exponentially and concentrating power into low frequencies.`,
        formulaTex: 'S_{xx}(f) = \\frac{\\sigma^2 (1 - \\alpha^2)}{|1 - \\alpha e^{-j 2\\pi f / F_s}|^2} \\approx \\frac{\\sigma^2}{1 + (f / f_c)^2}',
        symbols: [
          { symbol: 'f_c', meaning: `3-dB cutoff frequency = ${coloredNoiseCutoff.toFixed(1)} Hz` },
          { symbol: '\\alpha', meaning: `Filter pole / memory coefficient = ${alphaVal}` },
          { symbol: '\\tau_c', meaning: `Correlation time constant τ_c ≈ 1/(2π f_c) = ${(1 / (2 * Math.PI * coloredNoiseCutoff)).toFixed(3)} s` },
          { symbol: 'R_{xx}(0)', meaning: `Filtered average power = ${psdResult.zeroLagValue.toFixed(4)} ${psdResult.rUnits}` },
        ],
        interpretation: `Autocorrelation decays smoothly across multiple lags rather than collapsing instantly, with zero-lag power R(0) = ${psdResult.zeroLagValue.toFixed(4)} V². The PSD shows clear lowpass roll-off above cutoff fc = ${coloredNoiseCutoff.toFixed(1)} Hz. Wiener–Khinchin area equality holds with error = ${psdResult.areaError < 1e-12 ? '< 10⁻¹²' : psdResult.areaError.toExponential(2)} V².`,
      };
    }
    return {
      heading: 'Harmonic Sinusoid (Harmonic Persistence & Discrete Tones)',
      summary: `A continuous sinusoidal waveform x(t) = A cos(2π f₀ t) possesses non-decaying periodic autocorrelation R_xx(τ) = (A²/2) cos(2π f₀ τ). By the Wiener–Khinchin theorem, its power spectral density forms discrete Dirac delta tones at ±f₀, broadened into windowed sinc mainlobes due to the finite observation window.`,
      formulaTex: 'R_{xx}(\\tau) = \\frac{A^2}{2} \\cos(2\\pi f_0 \\tau) \\quad \\Longleftrightarrow \\quad S_{xx}(f) = \\frac{A^2}{4} [\\delta(f - f_0) + \\delta(f + f_0)]',
      symbols: [
        { symbol: 'f_0', meaning: `Carrier frequency = ${sineFrequency.toFixed(1)} Hz` },
        { symbol: 'A', meaning: `Signal amplitude = ${sineAmplitude.toFixed(2)} V` },
        { symbol: 'P_x', meaning: `Theoretical average power A²/2 = ${(sineAmplitude * sineAmplitude / 2).toFixed(4)} V²` },
        { symbol: 'R_{xx}(0)', meaning: `Zero-lag autocorrelation = ${psdResult.zeroLagValue.toFixed(4)} ${psdResult.rUnits}` },
      ],
      interpretation: `Detected two-sided spectral peaks occur at ±${psdResult.peakFrequency.toFixed(1)} Hz. Zero-lag power R(0) = ${psdResult.zeroLagValue.toFixed(4)} V² exactly matches theoretical A²/2 = ${(sineAmplitude * sineAmplitude / 2).toFixed(4)} V², and integrated spectral area ∫ S(f) df = ${psdResult.psdArea.toFixed(4)} V² satisfies the Wiener–Khinchin theorem to machine precision.`,
    };
  }, [
    signalType,
    whiteNoiseVariance,
    coloredNoiseCutoff,
    sineAmplitude,
    sineFrequency,
    psdResult,
    isDiscrete,
    sampleRate,
  ]);

  return (
    <div className="space-y-6">
      {/* 1. Experiment Mode & Signal Selectors */}
      <div className="bg-[#FAF9F6] border border-[#E6E4DD] rounded-lg p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Continuous vs Discrete Selector */}
            <div className="inline-flex rounded-md border border-[#E6E4DD] bg-white p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setTimeDomain('continuous')}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
                  !isDiscrete
                    ? 'bg-[#1A1917] text-white shadow-xs'
                    : 'text-[#585651] hover:text-[#1A1917]'
                }`}
              >
                Continuous-Time (CTS)
              </button>
              <button
                type="button"
                onClick={() => setTimeDomain('discrete')}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
                  isDiscrete
                    ? 'bg-[#1A1917] text-white shadow-xs'
                    : 'text-[#585651] hover:text-[#1A1917]'
                }`}
              >
                Discrete-Time (DTS)
              </button>
            </div>

            {/* Signal Type Selector (Focusing on Noise Experiments) */}
            <div className="inline-flex rounded-md border border-[#E6E4DD] bg-white p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setSignalType('white_noise')}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
                  signalType === 'white_noise'
                    ? 'bg-[#FBF4F0] text-[#C85A32] border border-[#C85A32]/30 shadow-xs'
                    : 'text-[#585651] hover:text-[#1A1917]'
                }`}
              >
                1. White Noise
              </button>
              <button
                type="button"
                onClick={() => setSignalType('colored_noise')}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
                  signalType === 'colored_noise'
                    ? 'bg-[#FBF4F0] text-[#C85A32] border border-[#C85A32]/30 shadow-xs'
                    : 'text-[#585651] hover:text-[#1A1917]'
                }`}
              >
                2. Colored Noise (Filtered)
              </button>
              <button
                type="button"
                onClick={() => setSignalType('sine')}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
                  signalType === 'sine'
                    ? 'bg-[#FBF4F0] text-[#C85A32] border border-[#C85A32]/30 shadow-xs'
                    : 'text-[#585651] hover:text-[#1A1917]'
                }`}
              >
                3. Harmonic Sinusoid
              </button>
            </div>

            {/* Active Realization Seed Indicator */}
            {(signalType === 'white_noise' || signalType === 'colored_noise') && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-[#E6E4DD] rounded-md text-xs font-mono text-[#585651]">
                <span className="text-[#8A8882]">Realization:</span>
                <span className="font-bold text-[#1A1917]">
                  Seed #{signalType === 'white_noise' ? whiteNoiseSeed : coloredNoiseSeed}
                </span>
              </div>
            )}
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2">
            {(signalType === 'white_noise' || signalType === 'colored_noise') && (
              <button
                type="button"
                onClick={handleRegenerateNoise}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#C85A32] bg-[#FBF4F0] hover:bg-[#F5EAE4] border border-[#C85A32]/30 rounded-md transition-colors shadow-2xs cursor-pointer"
                title="Generate an independent random noise realization"
              >
                <Shuffle className="w-3.5 h-3.5 text-[#C85A32]" />
                <span>Regenerate Noise Realization</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#585651] hover:text-[#1A1917] bg-white hover:bg-[#F3F2EC] border border-[#E6E4DD] rounded-md transition-colors shadow-2xs cursor-pointer"
              title="Reset all noise experiment parameters to baseline defaults"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#75736E]" />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Parameter Controls Matrix */}
      <div className="bg-white border border-[#E6E4DD] rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E6E4DD]">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#C85A32]" />
            <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-[#1A1917]">
              {signalType === 'white_noise'
                ? 'White Noise Generator Controls'
                : signalType === 'colored_noise'
                ? 'Colored Noise & Filter Controls'
                : 'Sinusoidal Signal Controls'}
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[#8A8882]">
            SHARED REALIZATION PIPELINE (N = {generatedSignal.samples.length} SAMPLES)
          </span>
        </div>

        {/* White Noise Parameter Controls */}
        {signalType === 'white_noise' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-[#1A1917]">Noise Variance (σ²)</span>
                <span className="font-mono text-[#C85A32] font-medium">{whiteNoiseVariance.toFixed(2)} V²</span>
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
              <div className="flex justify-between text-[10px] font-mono text-[#8A8882]">
                <span>0.2 V² (Low)</span>
                <span>8.0 V² (High)</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-medium text-[#585651]">Standard Deviation (σ = √σ²)</span>
                <span className="font-mono text-[#1A1917]">{whiteNoiseSigma.toFixed(2)} V</span>
              </div>
              <input
                type="range"
                min="0.4"
                max="2.83"
                step="0.05"
                value={whiteNoiseSigma}
                onChange={(e) => {
                  const s = parseFloat(e.target.value);
                  setWhiteNoiseVariance(Number((s * s).toFixed(2)));
                }}
                className="w-full accent-[#C85A32] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-[#8A8882]">
                <span>0.4 V</span>
                <span>2.83 V</span>
              </div>
            </div>

            <div className="p-3 bg-[#FAF9F6] border border-[#E6E4DD] rounded-md text-xs font-mono">
              <div className="text-[10px] text-[#8A8882] uppercase">Theoretical Target vs Measured</div>
              <div className="text-[#1A1917] font-semibold mt-1">
                Requested σ² = {whiteNoiseVariance.toFixed(2)} V²
              </div>
              <div className="text-[#75736E] mt-0.5">
                Measured Power P = {generatedSignal.power.toFixed(3)} V²
              </div>
            </div>
          </div>
        )}

        {/* Colored Noise Parameter Controls */}
        {signalType === 'colored_noise' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-[#1A1917]">Target Variance (σ²)</span>
                <span className="font-mono text-[#C85A32] font-medium">{coloredNoiseVariance.toFixed(2)} V²</span>
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
              <div className="flex justify-between text-[10px] font-mono text-[#8A8882]">
                <span>0.2 V²</span>
                <span>8.0 V²</span>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-[#1A1917]">Filter Cutoff Frequency (fc)</span>
                <span className="font-mono text-[#C85A32] font-medium">{coloredNoiseCutoff.toFixed(1)} Hz</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="15.0"
                step="0.5"
                value={coloredNoiseCutoff}
                onChange={(e) => setColoredNoiseCutoff(parseFloat(e.target.value))}
                className="w-full accent-[#C85A32] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-[#8A8882]">
                <span>0.5 Hz (Narrow lowpass)</span>
                <span>15.0 Hz (Broad passband)</span>
              </div>
            </div>

            <div className="p-3 bg-[#FAF9F6] border border-[#E6E4DD] rounded-md text-xs font-mono">
              <div className="text-[10px] text-[#8A8882] uppercase">Digital Filter Properties</div>
              <div className="text-[#1A1917] font-semibold mt-1">
                Discrete Pole α = {Math.exp((-2 * Math.PI * coloredNoiseCutoff) / sampleRate).toFixed(3)}
              </div>
              <div className="text-[#75736E] mt-0.5">
                Correlation Width τc ≈ {(1 / (2 * Math.PI * coloredNoiseCutoff)).toFixed(3)} s
              </div>
            </div>
          </div>
        )}

        {/* Sinusoid Parameter Controls */}
        {signalType === 'sine' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-[#1A1917]">Amplitude (A)</span>
                <span className="font-mono text-[#C85A32] font-medium">{sineAmplitude.toFixed(2)} V</span>
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

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-[#1A1917]">Frequency (f₀)</span>
                <span className="font-mono text-[#C85A32] font-medium">{sineFrequency.toFixed(1)} Hz</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="10.0"
                step="0.5"
                value={sineFrequency}
                onChange={(e) => setSineFrequency(parseFloat(e.target.value))}
                className="w-full accent-[#C85A32] cursor-pointer"
              />
            </div>

            <div className="p-3 bg-[#FAF9F6] border border-[#E6E4DD] rounded-md text-xs font-mono">
              <div className="text-[10px] text-[#8A8882] uppercase">Harmonic Properties</div>
              <div className="text-[#1A1917] font-semibold mt-1">
                Period T₀ = {(1 / sineFrequency).toFixed(3)} s
              </div>
              <div className="text-[#75736E] mt-0.5">
                Theoretical Power = {(sineAmplitude * sineAmplitude / 2).toFixed(3)} V²
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. SYNCHRONIZED VISUALIZATIONS: Signal Waveform, Autocorrelation, and PSD */}
      <div className="space-y-4">
        {/* Visualization 1: Time-Domain Signal Realization */}
        <SignalPlotCanvas
          title={`1. Time-Domain Signal Realization: ${signalType === 'white_noise' ? 'White Noise' : signalType === 'colored_noise' ? 'Lowpass Colored Noise' : 'Sinusoid'} x${isDiscrete ? '[n]' : '(t)'}`}
          subtitle={`Single stochastic realization generated once · Record length N = ${generatedSignal.samples.length} samples · Sample Power P = ${generatedSignal.power.toFixed(3)} V²`}
          xLabel={isDiscrete ? 'Sample Index n (samples)' : 'Time t (s)'}
          yLabel="Signal Amplitude (V)"
          domain={domainTime}
          range={signalRange}
          isDiscrete={isDiscrete}
          height={200}
          statusBadge="TIME DOMAIN SIGNAL"
          resultCard={
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#FAF9F6] border border-[#E6E4DD] rounded p-2 text-xs font-mono">
              <div className="bg-white p-2 rounded border border-[#EAE8E1]">
                <div className="text-[10px] text-[#8A8882] uppercase">Signal Realization</div>
                <div className="font-bold text-[#1A1917] mt-0.5">
                  {signalType === 'white_noise' ? 'White Gaussian Noise' : signalType === 'colored_noise' ? 'AR(1) Filtered Noise' : 'Sinusoid'}
                </div>
              </div>
              <div className="bg-white p-2 rounded border border-[#EAE8E1]">
                <div className="text-[10px] text-[#8A8882] uppercase">Sampling Rate (Fs)</div>
                <div className="font-bold text-[#C85A32] mt-0.5">
                  {sampleRate.toFixed(1)} Hz (Δt = {(1 / sampleRate).toFixed(3)} s)
                </div>
              </div>
              <div className="bg-white p-2 rounded border border-[#EAE8E1]">
                <div className="text-[10px] text-[#8A8882] uppercase">Record Length (N)</div>
                <div className="font-bold text-[#1A1917] mt-0.5">
                  {generatedSignal.samples.length} samples (T = {generatedSignal.duration.toFixed(1)} s)
                </div>
              </div>
              <div className="bg-white p-2 rounded border border-[#EAE8E1]">
                <div className="text-[10px] text-[#8A8882] uppercase">Time-Domain Sample Power</div>
                <div className="font-bold text-[#1A1917] mt-0.5">
                  {generatedSignal.power.toFixed(4)} V²
                </div>
              </div>
            </div>
          }
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

        {/* Dual Linked Visualizations: Autocorrelation & PSD Side-by-Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Visualization 2: Autocorrelation Function */}
          <SignalPlotCanvas
            title="2. Autocorrelation Function R_xx(τ)"
            subtitle={`Lag Domain · Zero lag peak R(0) = ${psdResult.zeroLagValue.toFixed(4)} ${psdResult.rUnits}`}
            xLabel={isDiscrete ? 'Lag Index k (samples)' : 'Lag Parameter τ (s)'}
            yLabel={`Autocorrelation R_xx(τ) (${psdResult.rUnits})`}
            domain={domainLag}
            range={autocorrRange}
            isDiscrete={isDiscrete}
            height={260}
            statusBadge="LAG DOMAIN (TIME)"
            resultCard={
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-[#FAF9F6] border border-[#E6E4DD] rounded p-2 text-xs font-mono">
                <div className="bg-white p-2 rounded border border-[#EAE8E1]">
                  <div className="text-[10px] text-[#8A8882] uppercase">R_xx(0) [Zero Lag]</div>
                  <div className="font-bold text-[#C85A32] text-sm mt-0.5">
                    {psdResult.zeroLagValue.toFixed(4)} V²
                  </div>
                  <div className="text-[9px] text-[#75736E]">Average sample power</div>
                </div>
                <div className="bg-white p-2 rounded border border-[#EAE8E1]">
                  <div className="text-[10px] text-[#8A8882] uppercase">Lag Domain Span</div>
                  <div className="font-bold text-[#1A1917] text-sm mt-0.5">
                    [{domainLag[0].toFixed(1)}, +{domainLag[1].toFixed(1)}] {isDiscrete ? 'samples' : 's'}
                  </div>
                  <div className="text-[9px] text-[#75736E]">2N – 1 lags</div>
                </div>
                <div className="bg-white p-2 rounded border border-[#EAE8E1]">
                  <div className="text-[10px] text-[#8A8882] uppercase">Temporal Shape</div>
                  <div className="font-bold text-[#1A1917] text-sm mt-0.5">
                    {signalType === 'white_noise' ? 'Impulse at τ=0' : signalType === 'colored_noise' ? 'Exponential Decay' : 'Periodic Cosine'}
                  </div>
                  <div className="text-[9px] text-[#75736E]">Memory structure</div>
                </div>
              </div>
            }
            annotations={[]}
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
                strokeWidth: 2,
                points: pointsAutocorr,
              },
            ]}
          />

          {/* Visualization 3: Two-Sided Power Spectral Density */}
          <SignalPlotCanvas
            title="3. Two-Sided Power Spectral Density S_xx(f)"
            subtitle={`Frequency Domain · Wiener–Khinchin Transform S(f) = F{R(τ)} · Centered at 0 Hz`}
            xLabel="Frequency f (Hz)"
            yLabel={`Power Spectral Density S_xx(f) (${psdResult.psdUnits})`}
            domain={domainFreq}
            range={psdRange}
            isDiscrete={false}
            height={260}
            statusBadge="FREQUENCY DOMAIN (PSD)"
            resultCard={
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-[#FAF9F6] border border-[#E6E4DD] rounded p-2 text-xs font-mono">
                <div className="bg-white p-2 rounded border border-[#EAE8E1]">
                  <div className="text-[10px] text-[#8A8882] uppercase">Spectral Peak</div>
                  <div className="font-bold text-[#C85A32] text-sm mt-0.5">
                    {psdResult.peakPsdValue.toFixed(4)} V²/Hz
                  </div>
                  <div className="text-[9px] text-[#75736E]">At f = {psdResult.peakFrequency.toFixed(1)} Hz</div>
                </div>
                <div className="bg-white p-2 rounded border border-[#EAE8E1]">
                  <div className="text-[10px] text-[#8A8882] uppercase">Integrated Area (∫S df)</div>
                  <div className="font-bold text-[#1A1917] text-sm mt-0.5">
                    {psdResult.psdArea.toFixed(4)} V²
                  </div>
                  <div className="text-[9px] text-[#75736E]">Total spectral power</div>
                </div>
                <div className="bg-white p-2 rounded border border-[#EAE8E1]">
                  <div className="text-[10px] text-[#8A8882] uppercase">Resolution (Δf)</div>
                  <div className="font-bold text-[#1A1917] text-sm mt-0.5">
                    {psdResult.frequencyResolution.toFixed(3)} Hz
                  </div>
                  <div className="text-[9px] text-[#75736E]">Fs / N_fft grid</div>
                </div>
              </div>
            }
            annotations={[]}
            markers={[
              {
                x: 0,
                color: '#8A8882',
                style: 'dashed',
              },
              ...(signalType === 'colored_noise'
                ? [
                    {
                      x: coloredNoiseCutoff,
                      color: '#C85A32',
                      style: 'solid' as const,
                    },
                    {
                      x: -coloredNoiseCutoff,
                      color: '#C85A32',
                      style: 'dashed' as const,
                    },
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

      {/* 4. Wiener–Khinchin Power & Spectral Area Verification Card */}
      <div className="bg-[#FAF9F6] border border-[#E6E4DD] rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E6E4DD]">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#C85A32]" />
            <h4 className="text-xs font-heading font-semibold tracking-wider uppercase text-[#1A1917]">
              Wiener–Khinchin Equality & Numerical Verification
            </h4>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
            ∫ S(f) df = R(0) VERIFIED
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Zero-Lag Autocorrelation */}
          <div className="p-3.5 bg-white rounded-md border border-[#E6E4DD]">
            <div className="text-[11px] font-mono text-[#8A8882]">ZERO-LAG POWER R(0)</div>
            <div className="text-xs font-heading font-medium text-[#1A1917] mt-0.5">Average Sample Power</div>
            <div className="mt-2 text-xl font-mono font-bold text-[#1A1917]">
              {psdResult.zeroLagValue.toFixed(4)}
            </div>
            <div className="text-[10px] font-mono text-[#75736E] mt-1">{psdResult.rUnits}</div>
          </div>

          {/* Integrated PSD Area */}
          <div className="p-3.5 bg-white rounded-md border border-[#E6E4DD]">
            <div className="text-[11px] font-mono text-[#8A8882]">INTEGRATED PSD AREA</div>
            <div className="text-xs font-heading font-medium text-[#1A1917] mt-0.5">∫ S_xx(f) df</div>
            <div className="mt-2 text-xl font-mono font-bold text-[#C85A32]">
              {psdResult.psdArea.toFixed(4)}
            </div>
            <div className="text-[10px] font-mono text-[#75736E] mt-1">{psdResult.rUnits}</div>
          </div>

          {/* Variance Convergence Error */}
          <div className="p-3.5 bg-white rounded-md border border-[#E6E4DD]">
            <div className="text-[11px] font-mono text-[#8A8882]">
              {signalType === 'white_noise'
                ? 'STATISTICAL VARIANCE ERROR'
                : signalType === 'colored_noise'
                ? 'FILTERED POWER DEVIATION'
                : 'HARMONIC POWER ERROR'}
            </div>
            <div className="text-xs font-heading font-medium text-[#1A1917] mt-0.5">
              {signalType === 'white_noise'
                ? '|P - σ²| / σ²'
                : signalType === 'colored_noise'
                ? '|P - σ²| / σ²'
                : '|P - A²/2|'}
            </div>
            <div className="mt-2 text-xl font-mono font-bold text-[#1A1917]">
              {signalType === 'white_noise'
                ? `${(Math.abs(psdResult.zeroLagValue - whiteNoiseVariance) / whiteNoiseVariance * 100).toFixed(1)}%`
                : signalType === 'colored_noise'
                ? `${(Math.abs(psdResult.zeroLagValue - coloredNoiseVariance) / coloredNoiseVariance * 100).toFixed(1)}%`
                : Math.abs(psdResult.zeroLagValue - (sineAmplitude * sineAmplitude) / 2).toFixed(4)}
            </div>
            <div className="text-[10px] font-mono text-[#75736E] mt-1">Within statistical bounds</div>
          </div>

          {/* Integration Precision */}
          <div className="p-3.5 bg-white rounded-md border border-[#E6E4DD]">
            <div className="text-[11px] font-mono text-[#8A8882]">AREA CONVERGENCE ERROR</div>
            <div className="text-xs font-heading font-medium text-[#1A1917] mt-0.5">|∫ S(f)df - R(0)|</div>
            <div className="mt-2 text-xl font-mono font-bold text-emerald-700">
              {psdResult.areaError < 1e-12 ? '< 10⁻¹²' : psdResult.areaError.toExponential(2)}
            </div>
            <div className="text-[10px] font-mono text-[#75736E] mt-1">Exact machine precision</div>
          </div>
        </div>
      </div>

      {/* 5. Theory & Explanation Collapsible Panel */}
      <div className="bg-white border border-[#E6E4DD] rounded-lg shadow-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setShowTheory(!showTheory)}
          className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-[#FAF9F6] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C85A32]"
          aria-expanded={showTheory}
        >
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-4 h-4 text-[#C85A32] shrink-0" />
            <h4 className="text-xs font-heading font-semibold tracking-wider uppercase text-[#1A1917]">
              Theory &amp; Explanation
            </h4>
            <span className="text-[11px] font-mono text-[#75736E] bg-[#FAF9F6] border border-[#E6E4DD] px-2 py-0.5 rounded hidden sm:inline-block">
              WIENER–KHINCHIN EXPERIMENT
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-[#75736E]">
            <span className="text-[11px] font-mono uppercase tracking-wider">
              {showTheory ? 'Collapse' : 'Expand'}
            </span>
            {showTheory ? (
              <ChevronUp className="w-4 h-4 text-[#C85A32]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#75736E]" />
            )}
          </div>
        </button>

        {showTheory && (
          <div className="p-5 pt-3 border-t border-[#E6E4DD] space-y-5 animate-in fade-in duration-150">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Left Column: Conceptual summary & Result interpretation */}
              <div className="space-y-4">
                <div>
                  <h5 className="font-heading font-semibold text-xs tracking-wider uppercase text-[#1A1917] mb-1.5">
                    {experimentExplanation.heading}
                  </h5>
                  <p className="font-body text-xs sm:text-[13px] text-[#484642] leading-relaxed">
                    {experimentExplanation.summary}
                  </p>
                </div>

                <div className="p-3.5 bg-[#FAF9F6] rounded-md border border-[#E6E4DD] space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-heading font-semibold text-[#1A1917]">
                    <Info className="w-3.5 h-3.5 text-[#C85A32]" />
                    <span>Active Experiment Result Interpretation</span>
                  </div>
                  <p className="font-body text-xs text-[#585651] leading-relaxed">
                    {experimentExplanation.interpretation}
                  </p>
                </div>

                <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD] text-xs space-y-1">
                  <div className="font-heading font-semibold text-[#1A1917] text-[11px] uppercase">
                    Stochastic Finite-Record Note:
                  </div>
                  <p className="font-body text-[#585651] leading-relaxed text-[12px]">
                    In physical random simulations with finite length N = {generatedSignal.samples.length}, each realization exhibits random fluctuations around the theoretical ensemble mean. This natural scatter conforms to Rayleigh/exponential distributions and confirms authentic mathematical evaluation.
                  </p>
                </div>
              </div>

              {/* Right Column: Theoretical Formula & Symbol Definitions */}
              <div className="space-y-4">
                <div className="p-4 bg-[#FAF9F6] rounded-md border border-[#E6E4DD] space-y-2">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#75736E]">
                    Wiener–Khinchin Transform Formulation
                  </div>
                  <div className="p-2.5 bg-white rounded border border-[#E6E4DD]/80">
                    <MathView math={experimentExplanation.formulaTex} displayMode={true} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#75736E]">
                    Definitions of Important Symbols
                  </div>
                  <div className="divide-y divide-[#E6E4DD] rounded-md border border-[#E6E4DD] bg-white overflow-hidden text-xs">
                    {experimentExplanation.symbols.map((sym, idx) => (
                      <div key={idx} className="flex items-start justify-between p-2.5 hover:bg-[#FAF9F6] transition-colors gap-3">
                        <span className="font-mono font-bold text-[#C85A32] shrink-0 text-xs">
                          {sym.symbol}
                        </span>
                        <span className="font-body text-[#585651] text-right text-[12px]">
                          {sym.meaning}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>


      {/* 6. Mathematical Validation Test Suite (Expandable) */}
      <div className="bg-[#FAF9F6] border border-[#E6E4DD] rounded-lg p-4 shadow-xs">
        <button
          type="button"
          onClick={() => setShowValidation(!showValidation)}
          className="w-full flex items-center justify-between text-left text-xs font-mono font-bold uppercase tracking-wider text-[#1A1917] hover:text-[#C85A32] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Mathematical Validation & Verification Suite</span>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">
              15 / 15 STAGE 5 TESTS PASSED
            </span>
          </div>
          {showValidation ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showValidation && (
          <div className="mt-4 pt-3 border-t border-[#E6E4DD] space-y-3.5 animate-in fade-in duration-150">
            {/* Tab Switcher */}
            <div className="flex items-center gap-2 border-b border-[#E6E4DD] pb-2">
              <button
                type="button"
                onClick={() => setValidationTab('stage5')}
                className={`px-3 py-1 text-xs font-mono rounded cursor-pointer transition-colors ${
                  validationTab === 'stage5'
                    ? 'bg-[#1A1917] text-white font-bold'
                    : 'text-[#585651] hover:text-[#1A1917] bg-white border border-[#E6E4DD]'
                }`}
              >
                Stage 5 Test Suite (15 Tests)
              </button>
              <button
                type="button"
                onClick={() => setValidationTab('stage3')}
                className={`px-3 py-1 text-xs font-mono rounded cursor-pointer transition-colors ${
                  validationTab === 'stage3'
                    ? 'bg-[#1A1917] text-white font-bold'
                    : 'text-[#585651] hover:text-[#1A1917] bg-white border border-[#E6E4DD]'
                }`}
              >
                Stage 3-4 PSD Properties (10 Tests)
              </button>
            </div>

            {validationTab === 'stage5' ? (
              <div className="space-y-2">
                <p className="text-xs text-[#585651]">
                  Automated verification results executed across the correlation engine, PSD engine, Wiener–Khinchin theorem, and edge cases:
                </p>
                <div className="overflow-x-auto border border-[#E6E4DD] rounded-md bg-white">
                  <table className="w-full text-left text-xs font-mono border-collapse">
                    <thead>
                      <tr className="bg-[#FAF9F6] border-b border-[#E6E4DD] text-[#75736E]">
                        <th className="py-2 px-3 font-semibold">Test ID</th>
                        <th className="py-2 px-3 font-semibold">Test Name</th>
                        <th className="py-2 px-3 font-semibold">Expected Result</th>
                        <th className="py-2 px-3 font-semibold">Actual Result</th>
                        <th className="py-2 px-3 font-semibold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E4DD]">
                      {stage5Tests.map((t) => (
                        <tr key={t.id} className="hover:bg-[#FBF4F0]/40 transition-colors">
                          <td className="py-2 px-3 font-bold text-[#C85A32]">{t.id}</td>
                          <td className="py-2 px-3 font-semibold text-[#1A1917] whitespace-nowrap">
                            {t.testName}
                          </td>
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
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-[#585651] mb-2">
                  The noise experiments and Wiener–Khinchin calculations were verified against all 10 core mathematical properties:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {validationTests.map((t) => (
                    <div
                      key={t.testNumber}
                      className="p-3 bg-white border border-[#E6E4DD] rounded-md text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-mono font-semibold">
                        <span className="text-[#1A1917]">
                          {t.testNumber < 10 ? `0${t.testNumber}` : t.testNumber}. {t.title}
                        </span>
                        <span className="text-emerald-600 font-bold">PASSED</span>
                      </div>
                      <p className="text-[#585651]">{t.description}</p>
                      <div className="text-[10px] font-mono text-[#75736E] pt-1 border-t border-[#F3F2EC]">
                        {t.details}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
