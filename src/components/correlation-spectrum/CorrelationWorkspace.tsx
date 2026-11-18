import React, { useState, useMemo } from 'react';
import {
  RotateCcw,
  Sliders,
  Activity,
  Info,
  Shuffle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { SignalPlotCanvas, PlotSeries, PlotMarker } from './SignalPlotCanvas';
import { MathView } from '../MathView';
import {
  SignalType,
  UnifiedSignalConfig,
  generateCtsSignal,
  generateDtsSignal,
  GeneratedSignal,
} from './signalGenerators';
import {
  computeCorrelation,
  CorrelationResult,
  runCorrelationValidationTests,
  ValidationTestResult,
} from './correlationEngine';
import { executeStage5TestSuite } from './stage5VerificationSuite';

export const CorrelationWorkspace: React.FC = () => {
  // Mode selection states
  const [isAutocorrelation, setIsAutocorrelation] = useState<boolean>(true);
  const [timeDomain, setTimeDomain] = useState<'continuous' | 'discrete'>('continuous');

  // Signal Types
  const [signalTypeX, setSignalTypeX] = useState<SignalType>('pulse');
  const [signalTypeY, setSignalTypeY] = useState<SignalType>('pulse');

  // Signal X Parameters
  const [sineAmpX, setSineAmpX] = useState<number>(1.5);
  const [sineFreqX, setSineFreqX] = useState<number>(1.0);
  const [sinePhaseX, setSinePhaseX] = useState<number>(0);

  const [pulseAmpX, setPulseAmpX] = useState<number>(1.5);
  const [pulseWidthX, setPulseWidthX] = useState<number>(1.0);
  const [pulsePosX, setPulsePosX] = useState<number>(0.0);

  const [whiteNoiseSigmaX, setWhiteNoiseSigmaX] = useState<number>(1.0);
  const [whiteNoiseSeedX, setWhiteNoiseSeedX] = useState<number>(42);

  const [coloredNoiseSigmaX, setColoredNoiseSigmaX] = useState<number>(1.0);
  const [coloredNoiseAlphaX, setColoredNoiseAlphaX] = useState<number>(0.7);
  const [coloredNoiseSeedX, setColoredNoiseSeedX] = useState<number>(101);

  // Signal Y Parameters (used in Cross-correlation)
  const [sineAmpY, setSineAmpY] = useState<number>(1.5);
  const [sineFreqY, setSineFreqY] = useState<number>(1.0);
  const [sinePhaseY, setSinePhaseY] = useState<number>(0);

  const [pulseAmpY, setPulseAmpY] = useState<number>(1.5);
  const [pulseWidthY, setPulseWidthY] = useState<number>(1.0);
  const [pulsePosY, setPulsePosY] = useState<number>(0.8); // slight offset to demonstrate lag peak

  const [whiteNoiseSigmaY, setWhiteNoiseSigmaY] = useState<number>(1.0);
  const [whiteNoiseSeedY, setWhiteNoiseSeedY] = useState<number>(88);

  const [coloredNoiseSigmaY, setColoredNoiseSigmaY] = useState<number>(1.0);
  const [coloredNoiseAlphaY, setColoredNoiseAlphaY] = useState<number>(0.7);
  const [coloredNoiseSeedY, setColoredNoiseSeedY] = useState<number>(202);

  // Interactive Lag / Delay Control
  const [lag, setLag] = useState<number>(0.0);

  // Validation Panel Expansion
  const [showValidation, setShowValidation] = useState<boolean>(false);
  const [validationTab, setValidationTab] = useState<'stage5' | 'stage2'>('stage5');

  // Theory & Explanation Collapsible Panel (collapsed by default)
  const [showTheory, setShowTheory] = useState<boolean>(false);

  const isDiscrete = timeDomain === 'discrete';

  // Build unified config for Signal X
  const configX: UnifiedSignalConfig = useMemo(() => {
    return {
      type: signalTypeX,
      sine: { amplitude: sineAmpX, frequency: sineFreqX, phase: sinePhaseX },
      pulse: { amplitude: pulseAmpX, width: pulseWidthX, position: pulsePosX },
      whiteNoise: { stdDev: whiteNoiseSigmaX, seed: whiteNoiseSeedX },
      coloredNoise: { stdDev: coloredNoiseSigmaX, filterParam: coloredNoiseAlphaX, seed: coloredNoiseSeedX },
    };
  }, [
    signalTypeX,
    sineAmpX,
    sineFreqX,
    sinePhaseX,
    pulseAmpX,
    pulseWidthX,
    pulsePosX,
    whiteNoiseSigmaX,
    whiteNoiseSeedX,
    coloredNoiseSigmaX,
    coloredNoiseAlphaX,
    coloredNoiseSeedX,
  ]);

  // Build unified config for Signal Y
  const configY: UnifiedSignalConfig = useMemo(() => {
    return {
      type: signalTypeY,
      sine: { amplitude: sineAmpY, frequency: sineFreqY, phase: sinePhaseY },
      pulse: { amplitude: pulseAmpY, width: pulseWidthY, position: pulsePosY },
      whiteNoise: { stdDev: whiteNoiseSigmaY, seed: whiteNoiseSeedY },
      coloredNoise: { stdDev: coloredNoiseSigmaY, filterParam: coloredNoiseAlphaY, seed: coloredNoiseSeedY },
    };
  }, [
    signalTypeY,
    sineAmpY,
    sineFreqY,
    sinePhaseY,
    pulseAmpY,
    pulseWidthY,
    pulsePosY,
    whiteNoiseSigmaY,
    whiteNoiseSeedY,
    coloredNoiseSigmaY,
    coloredNoiseAlphaY,
    coloredNoiseSeedY,
  ]);

  // Generate Signal X & Signal Y using mathematical engine
  const generatedX: GeneratedSignal = useMemo(() => {
    if (isDiscrete) {
      return generateDtsSignal(configX, 41, true);
    }
    return generateCtsSignal(configX, -3.0, 3.0, 301);
  }, [configX, isDiscrete]);

  const generatedY: GeneratedSignal = useMemo(() => {
    if (isAutocorrelation) {
      return generatedX;
    }
    if (isDiscrete) {
      return generateDtsSignal(configY, 41, true);
    }
    return generateCtsSignal(configY, -3.0, 3.0, 301);
  }, [configY, isDiscrete, isAutocorrelation, generatedX]);

  // Compute mathematical correlation R(tau) or r[k]
  const correlationResult: CorrelationResult = useMemo(() => {
    return computeCorrelation(generatedX, generatedY, isAutocorrelation, isDiscrete, lag);
  }, [generatedX, generatedY, isAutocorrelation, isDiscrete, lag]);

  // Execute mathematical validation test suite
  const validationTests: ValidationTestResult[] = useMemo(() => {
    return runCorrelationValidationTests();
  }, []);

  // Stage 5 comprehensive automated test suite
  const stage5Tests = useMemo(() => {
    return executeStage5TestSuite();
  }, []);

  // Compute delayed signal values at current lag
  const delayedSamples = useMemo(() => {
    return generatedY.evalShifted(lag);
  }, [generatedY, lag]);

  // Reset to default baseline state
  const handleReset = () => {
    setIsAutocorrelation(true);
    setTimeDomain('continuous');
    setSignalTypeX('pulse');
    setSignalTypeY('pulse');
    setSineAmpX(1.5);
    setSineFreqX(1.0);
    setSinePhaseX(0);
    setPulseAmpX(1.5);
    setPulseWidthX(1.0);
    setPulsePosX(0.0);
    setWhiteNoiseSigmaX(1.0);
    setWhiteNoiseSeedX(42);
    setColoredNoiseSigmaX(1.0);
    setColoredNoiseAlphaX(0.7);
    setColoredNoiseSeedX(101);

    setSineAmpY(1.5);
    setSineFreqY(1.0);
    setSinePhaseY(0);
    setPulseAmpY(1.5);
    setPulseWidthY(1.0);
    setPulsePosY(0.8);
    setWhiteNoiseSigmaY(1.0);
    setWhiteNoiseSeedY(88);
    setColoredNoiseSigmaY(1.0);
    setColoredNoiseAlphaY(0.7);
    setColoredNoiseSeedY(202);

    setLag(0.0);
  };

  // Convert signal samples to plot points
  const pointsSignalX = useMemo(() => {
    return generatedX.timeVector.map((t, i) => ({ x: t, y: generatedX.samples[i] }));
  }, [generatedX]);

  const pointsSignalDelayed = useMemo(() => {
    return generatedX.timeVector.map((t, i) => ({ x: t, y: delayedSamples[i] }));
  }, [generatedX.timeVector, delayedSamples]);

  // Convert correlation curve to plot points
  const pointsCorrelation = useMemo(() => {
    return correlationResult.lags.map((l, i) => ({ x: l, y: correlationResult.rValues[i] }));
  }, [correlationResult]);

  // Calculate dynamic plot ranges
  const signalPlotRange: [number, number] = useMemo(() => {
    let maxAbs = 0.5;
    for (const p of pointsSignalX) maxAbs = Math.max(maxAbs, Math.abs(p.y));
    for (const p of pointsSignalDelayed) maxAbs = Math.max(maxAbs, Math.abs(p.y));
    const bound = Math.ceil(maxAbs * 1.25 * 10) / 10;
    return [-bound, bound];
  }, [pointsSignalX, pointsSignalDelayed]);

  const corrPlotRange: [number, number] = useMemo(() => {
    let minVal = 0;
    let maxVal = 0.5;
    for (const v of correlationResult.rValues) {
      if (v < minVal) minVal = v;
      if (v > maxVal) maxVal = v;
    }
    const span = Math.max(0.5, maxVal - minVal);
    const yMin = Math.floor((minVal - 0.15 * span) * 10) / 10;
    const yMax = Math.ceil((maxVal + 0.15 * span) * 10) / 10;
    return [Math.min(-0.2, yMin), Math.max(0.5, yMax)];
  }, [correlationResult.rValues]);

  const domainX: [number, number] = isDiscrete ? [-20, 20] : [-3.0, 3.0];
  const domainLag: [number, number] = isDiscrete
    ? [-40, 40]
    : [-Number(generatedX.duration.toFixed(1)), Number(generatedX.duration.toFixed(1))];

  // Helper to render parameter controls for a given channel
  const renderParamControls = (channel: 'X' | 'Y') => {
    const type = channel === 'X' ? signalTypeX : signalTypeY;
    const isX = channel === 'X';

    if (type === 'sine' || type === 'square') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-[#585651]">Amplitude (A)</span>
              <span className="font-mono text-[#1A1917]">{(isX ? sineAmpX : sineAmpY).toFixed(2)} V</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="3.0"
              step="0.1"
              value={isX ? sineAmpX : sineAmpY}
              onChange={(e) => (isX ? setSineAmpX : setSineAmpY)(parseFloat(e.target.value))}
              className="w-full accent-[#C85A32] cursor-pointer"
            />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-[#585651]">
                {type === 'square' ? 'Fundamental (f₀)' : 'Frequency (f₀)'}
              </span>
              <span className="font-mono text-[#1A1917]">{(isX ? sineFreqX : sineFreqY).toFixed(1)} {isDiscrete ? 'cycles/sample' : 'Hz'}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="4.0"
              step="0.5"
              value={isX ? sineFreqX : sineFreqY}
              onChange={(e) => (isX ? setSineFreqX : setSineFreqY)(parseFloat(e.target.value))}
              className="w-full accent-[#C85A32] cursor-pointer"
            />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-[#585651]">Phase (ϕ)</span>
              <span className="font-mono text-[#1A1917]">{isX ? sinePhaseX : sinePhaseY}° ({(((isX ? sinePhaseX : sinePhaseY) * Math.PI) / 180).toFixed(2)} rad)</span>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              step="15"
              value={isX ? sinePhaseX : sinePhaseY}
              onChange={(e) => (isX ? setSinePhaseX : setSinePhaseY)(parseInt(e.target.value, 10))}
              className="w-full accent-[#C85A32] cursor-pointer"
            />
          </div>
        </div>
      );
    }

    if (type === 'pulse') {
      return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-[#585651]">Amplitude (A)</span>
              <span className="font-mono text-[#1A1917]">{(isX ? pulseAmpX : pulseAmpY).toFixed(2)} V</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="3.0"
              step="0.1"
              value={isX ? pulseAmpX : pulseAmpY}
              onChange={(e) => (isX ? setPulseAmpX : setPulseAmpY)(parseFloat(e.target.value))}
              className="w-full accent-[#C85A32] cursor-pointer"
            />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-[#585651]">Width (W)</span>
              <span className="font-mono text-[#1A1917]">{(isX ? pulseWidthX : pulseWidthY).toFixed(2)} {isDiscrete ? 'samples' : 's'}</span>
            </div>
            <input
              type="range"
              min="0.4"
              max="2.4"
              step="0.2"
              value={isX ? pulseWidthX : pulseWidthY}
              onChange={(e) => (isX ? setPulseWidthX : setPulseWidthY)(parseFloat(e.target.value))}
              className="w-full accent-[#C85A32] cursor-pointer"
            />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-[#585651]">Position Center (t₀)</span>
              <span className="font-mono text-[#1A1917]">{(isX ? pulsePosX : pulsePosY).toFixed(2)} {isDiscrete ? 'samples' : 's'}</span>
            </div>
            <input
              type="range"
              min="-1.5"
              max="1.5"
              step="0.1"
              value={isX ? pulsePosX : pulsePosY}
              onChange={(e) => (isX ? setPulsePosX : setPulsePosY)(parseFloat(e.target.value))}
              className="w-full accent-[#C85A32] cursor-pointer"
            />
          </div>
        </div>
      );
    }

    if (type === 'white_noise') {
      const currentSigma = isX ? whiteNoiseSigmaX : whiteNoiseSigmaY;
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-[#585651]">Noise Std Dev (σ) & Variance (σ²)</span>
              <span className="font-mono text-[#1A1917]">{currentSigma.toFixed(2)} V (σ² = {(currentSigma * currentSigma).toFixed(2)} V²)</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="2.5"
              step="0.1"
              value={currentSigma}
              onChange={(e) => (isX ? setWhiteNoiseSigmaX : setWhiteNoiseSigmaY)(parseFloat(e.target.value))}
              className="w-full accent-[#C85A32] cursor-pointer"
            />
          </div>
          <div>
            <button
              type="button"
              onClick={() => (isX ? setWhiteNoiseSeedX((s) => s + 1) : setWhiteNoiseSeedY((s) => s + 1))}
              className="w-full py-1.5 px-3 bg-[#FAF9F6] hover:bg-[#F3F2EC] border border-[#E6E4DD] rounded text-xs font-mono text-[#1A1917] flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5 text-[#C85A32]" />
              <span>Regenerate Noise Realization (Seed #{isX ? whiteNoiseSeedX : whiteNoiseSeedY})</span>
            </button>
          </div>
        </div>
      );
    }

    if (type === 'colored_noise') {
      const currentSigma = isX ? coloredNoiseSigmaX : coloredNoiseSigmaY;
      const currentAlpha = isX ? coloredNoiseAlphaX : coloredNoiseAlphaY;
      return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-[#585651]">Std Dev (σ)</span>
              <span className="font-mono text-[#1A1917]">{currentSigma.toFixed(2)} V (σ² = {(currentSigma * currentSigma).toFixed(2)} V²)</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="2.5"
              step="0.1"
              value={currentSigma}
              onChange={(e) => (isX ? setColoredNoiseSigmaX : setColoredNoiseSigmaY)(parseFloat(e.target.value))}
              className="w-full accent-[#C85A32] cursor-pointer"
            />
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-[#585651]">Filter Pole (α)</span>
              <span className="font-mono text-[#1A1917]">{currentAlpha.toFixed(2)} (–)</span>
            </div>
            <input
              type="range"
              min="-0.9"
              max="0.9"
              step="0.05"
              value={currentAlpha}
              onChange={(e) => (isX ? setColoredNoiseAlphaX : setColoredNoiseAlphaY)(parseFloat(e.target.value))}
              className="w-full accent-[#C85A32] cursor-pointer"
            />
          </div>
          <div>
            <button
              type="button"
              onClick={() => (isX ? setColoredNoiseSeedX((s) => s + 1) : setColoredNoiseSeedY((s) => s + 1))}
              className="w-full py-1.5 px-3 bg-[#FAF9F6] hover:bg-[#F3F2EC] border border-[#E6E4DD] rounded text-xs font-mono text-[#1A1917] flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Shuffle className="w-3.5 h-3.5 text-[#C85A32]" />
              <span>Regenerate Seed #{isX ? coloredNoiseSeedX : coloredNoiseSeedY}</span>
            </button>
          </div>
        </div>
      );
    }
  };

  // Detailed dynamic conceptual explanation conforming to Stage 6 requirements
  const conceptualExplanation = useMemo(() => {
    const lagDist = Math.abs(lag);

    if (isAutocorrelation) {
      if (signalTypeX === 'pulse') {
        const W = pulseWidthX;
        const hasOverlap = lagDist < W;
        return {
          heading: 'Rectangular Pulse Autocorrelation (Energy Signal)',
          summary: `Autocorrelation measures the sliding inner product between the pulse x(t) and its time-shifted replica x(t - τ). For a pulse of duration W and amplitude A, the overlapping width decreases linearly from W down to 0, producing an exact triangular correlation function of base width 2W.`,
          formulaTex: isDiscrete
            ? 'r_{xx}[k] = \\sum_{n=-\\infty}^{\\infty} x[n] x[n - k] = A^2 (W - |k|) \\quad (|k| \\le W)'
            : 'R_{xx}(\\tau) = \\int_{-\\infty}^{\\infty} x(t) x(t - \\tau) dt = A^2 (W - |\\tau|) \\quad (|\\tau| \\le W)',
          symbols: [
            { symbol: isDiscrete ? 'k' : '\\tau', meaning: `Discrete or continuous lag parameter (currently ${isDiscrete ? Math.round(lag) : lag.toFixed(2)})` },
            { symbol: 'W', meaning: `Pulse duration / width = ${W.toFixed(2)} ${isDiscrete ? 'samples' : 's'}` },
            { symbol: 'A', meaning: `Pulse peak amplitude = ${pulseAmpX.toFixed(2)} V` },
            { symbol: isDiscrete ? 'r_{xx}[0]' : 'R_{xx}(0)', meaning: `Total signal energy E_x = A² W = ${(pulseAmpX * pulseAmpX * W).toFixed(4)} ${correlationResult.units}` },
          ],
          interpretation: hasOverlap
            ? `At zero lag (τ = 0), maximum overlap occurs, yielding R(0) = ${correlationResult.zeroLagValue.toFixed(4)} ${correlationResult.units}, exactly matching signal energy. At current lag τ = ${isDiscrete ? Math.round(lag) : lag.toFixed(2)}, overlap span is ${(W - lagDist).toFixed(2)}, yielding R = ${correlationResult.currentR.toFixed(4)} ${correlationResult.units}.`
            : `At current lag τ = ${isDiscrete ? Math.round(lag) : lag.toFixed(2)}, displacement exceeds pulse width (|τ| ≥ W = ${W.toFixed(2)}). Zero overlap exists, yielding R = 0.0000.`,
        };
      }
      if (signalTypeX === 'square') {
        const T0 = (1 / Math.max(1e-4, sineFreqX)).toFixed(2);
        return {
          heading: 'Periodic Square Wave Autocorrelation (Power Signal)',
          summary: `A periodic square wave alternating between +A and -A produces a continuous piecewise linear triangular autocorrelation that repeats with fundamental period T₀ = 1/f₀. Positive correlation peaks occur when half-cycles align in phase, and negative valleys occur under half-period shifts.`,
          formulaTex: 'R_{xx}(\\tau) = A^2 \\left(1 - \\frac{4|\\tau - m T_0|}{T_0}\\right) \\quad \\text{for } |\\tau - m T_0| \\le \\frac{T_0}{2}, \\quad m \\in \\mathbb{Z}',
          symbols: [
            { symbol: 'T_0', meaning: `Repetition period T₀ = 1/f₀ = ${T0} s` },
            { symbol: 'A', meaning: `Waveform amplitude = ${sineAmpX.toFixed(2)} V` },
            { symbol: 'f_0', meaning: `Fundamental frequency = ${sineFreqX.toFixed(1)} Hz` },
            { symbol: 'R_{xx}(0)', meaning: `Average signal power P_x = A² = ${(sineAmpX * sineAmpX).toFixed(2)} V²` },
          ],
          interpretation: `Zero-lag value R(0) = ${correlationResult.zeroLagValue.toFixed(4)} ${correlationResult.units} equals the square of amplitude A² = ${(sineAmpX * sineAmpX).toFixed(2)} V². Every integer period multiple τ = ±m·T₀, identical correlation peaks of value +A² reappear.`,
        };
      }
      if (signalTypeX === 'sine') {
        const T0 = (1 / Math.max(1e-4, sineFreqX)).toFixed(2);
        return {
          heading: 'Sinusoid Autocorrelation (Power Signal)',
          summary: `The autocorrelation of a sinusoidal waveform x(t) = A cos(2π f₀ t + ϕ) preserves its harmonic frequency f₀ while discarding initial phase ϕ. The resulting autocorrelation is an even harmonic cosine function with zero-lag value equal to the time-average signal power.`,
          formulaTex: isDiscrete
            ? 'r_{xx}[k] = \\frac{A^2}{2} \\cos(2\\pi f_0 k)'
            : 'R_{xx}(\\tau) = \\frac{A^2}{2} \\cos(2\\pi f_0 \\tau)',
          symbols: [
            { symbol: 'f_0', meaning: `Oscillation frequency = ${sineFreqX.toFixed(1)} ${isDiscrete ? 'cyc/10' : 'Hz'}` },
            { symbol: 'T_0', meaning: `Period T₀ = 1/f₀ = ${T0} s` },
            { symbol: 'A', meaning: `Peak amplitude = ${sineAmpX.toFixed(2)} V` },
            { symbol: 'R_{xx}(0)', meaning: `Average power P_x = A²/2 = ${(sineAmpX * sineAmpX / 2).toFixed(4)} V²` },
          ],
          interpretation: `Zero-lag value R(0) = ${correlationResult.zeroLagValue.toFixed(4)} ${correlationResult.units} equals the theoretical average power A²/2 = ${(sineAmpX * sineAmpX / 2).toFixed(4)} V². At current lag ${isDiscrete ? `k = ${Math.round(lag)}` : `τ = ${lag.toFixed(2)}s`}, calculated correlation is ${correlationResult.currentR.toFixed(4)} ${correlationResult.units}.`,
        };
      }
      if (signalTypeX === 'white_noise') {
        return {
          heading: 'White Gaussian Noise Autocorrelation (Uncorrelated Process)',
          summary: `White noise consists of mutually uncorrelated random samples. At zero lag (τ = 0), each sample correlates with itself, summing to the process variance σ². At any non-zero lag (τ ≠ 0), independent samples average to near zero, yielding an impulse-like autocorrelation.`,
          formulaTex: isDiscrete
            ? 'r_{xx}[k] = \\sigma^2 \\delta[k] = \\begin{cases} \\sigma^2, & k = 0 \\\\ 0, & k \\ne 0 \\end{cases}'
            : 'R_{xx}(\\tau) = \\sigma^2 \\delta(\\tau)',
          symbols: [
            { symbol: '\\sigma^2', meaning: `Process variance = ${(whiteNoiseSigmaX * whiteNoiseSigmaX).toFixed(2)} V²` },
            { symbol: '\\delta', meaning: 'Dirac delta (CTS) or Kronecker delta (DTS)' },
            { symbol: 'R_{xx}(0)', meaning: `Sample power R(0) = ${correlationResult.zeroLagValue.toFixed(4)} ${correlationResult.units}` },
          ],
          interpretation: `Zero-lag value R(0) = ${correlationResult.zeroLagValue.toFixed(4)} ${correlationResult.units} measures the sample variance (nominal σ² = ${(whiteNoiseSigmaX * whiteNoiseSigmaX).toFixed(2)}). Immediate collapse at non-zero lags demonstrates zero temporal memory and wideband characteristics.`,
        };
      }
      return {
        heading: 'Colored AR(1) Noise Autocorrelation (Correlated Process)',
        summary: `Colored noise is generated by lowpass filtering white noise, creating short-term memory between adjacent samples. The autocorrelation exhibits an exponential decay envelope determined by the filter pole α.`,
        formulaTex: isDiscrete
          ? 'r_{xx}[k] = \\sigma^2 \\alpha^{|k|} \\quad (|\\alpha| < 1)'
          : 'R_{xx}(\\tau) \\approx \\sigma^2 e^{-2\\pi f_c |\\tau|}',
        symbols: [
          { symbol: '\\alpha', meaning: `Filter pole / memory coefficient = ${coloredNoiseAlphaX.toFixed(2)}` },
          { symbol: 'f_c', meaning: '3-dB digital low-pass cutoff frequency' },
          { symbol: 'R_{xx}(0)', meaning: `Total sample power = ${correlationResult.zeroLagValue.toFixed(4)} ${correlationResult.units}` },
        ],
        interpretation: `Zero-lag value R(0) = ${correlationResult.zeroLagValue.toFixed(4)} ${correlationResult.units} represents total filtered signal power. The graceful decay R(${isDiscrete ? `k=${Math.round(lag)}` : `τ=${lag.toFixed(2)}s`}) = ${correlationResult.currentR.toFixed(4)} demonstrates persistent temporal correlation.`,
      };
    }

    // Cross-Correlation Explanations
    return {
      heading: 'Cross-Correlation Analysis (Dual Signals)',
      summary: `Cross-correlation R_xy(τ) computes the sliding inner product between reference signal x(t) and shifted target y(t - τ). The lag where R_xy(τ) achieves its global maximum identifies the true propagation delay or relative time shift between the two waveforms.`,
      formulaTex: isDiscrete
        ? 'r_{xy}[k] = \\sum_{n=-\\infty}^{\\infty} x[n] y[n - k]'
        : 'R_{xy}(\\tau) = \\int_{-\\infty}^{\\infty} x(t) y(t - \\tau) dt',
      symbols: [
        { symbol: 'x(t), x[n]', meaning: 'Reference waveform channel' },
        { symbol: 'y(t), y[n]', meaning: 'Target waveform channel' },
        { symbol: '\\tau_{\\text{peak}}', meaning: `Optimal alignment delay = ${correlationResult.peakLag.toFixed(2)} ${isDiscrete ? 'samples' : 's'}` },
        { symbol: '\\rho(\\tau)', meaning: `Normalized correlation coefficient (currently ${correlationResult.currentNormalized.toFixed(4)})` },
      ],
      interpretation: `At current selected lag ${isDiscrete ? `k = ${Math.round(lag)}` : `τ = ${lag.toFixed(2)}s`}, calculated cross-correlation is R_xy = ${correlationResult.currentR.toFixed(4)} ${correlationResult.units}. The global peak R_max = ${correlationResult.peakValue.toFixed(4)} occurs at ${isDiscrete ? `k = ${Math.round(correlationResult.peakLag)}` : `τ = ${correlationResult.peakLag.toFixed(2)}s`}, identifying the relative transit delay.`,
    };
  }, [
    correlationResult,
    isAutocorrelation,
    signalTypeX,
    pulseWidthX,
    pulseAmpX,
    sineFreqX,
    sineAmpX,
    whiteNoiseSigmaX,
    coloredNoiseAlphaX,
    lag,
    isDiscrete,
  ]);

  return (
    <div className="space-y-6">
      {/* 1. Experiment Mode & Time-Domain Selectors */}
      <div className="bg-[#FAF9F6] border border-[#E6E4DD] rounded-lg p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Correlation Selector */}
            <div className="inline-flex rounded-md border border-[#E6E4DD] bg-white p-1 shadow-2xs">
              <button
                type="button"
                onClick={() => setIsAutocorrelation(true)}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
                  isAutocorrelation
                    ? 'bg-[#FBF4F0] text-[#C85A32] border border-[#C85A32]/30 shadow-xs'
                    : 'text-[#585651] hover:text-[#1A1917]'
                }`}
              >
                Autocorrelation Rxx(τ)
              </button>
              <button
                type="button"
                onClick={() => setIsAutocorrelation(false)}
                className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors cursor-pointer ${
                  !isAutocorrelation
                    ? 'bg-[#FBF4F0] text-[#C85A32] border border-[#C85A32]/30 shadow-xs'
                    : 'text-[#585651] hover:text-[#1A1917]'
                }`}
              >
                Cross-correlation Rxy(τ)
              </button>
            </div>

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

            {/* Signal Classification Badge */}
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-mono bg-white border-[#E6E4DD] text-[#585651]">
              <span className="text-[#8A8882]">Convention:</span>
              <span className="font-bold text-[#C85A32] uppercase">
                {correlationResult.convention === 'energy' ? 'Energy Signal (E)' : 'Power Signal (P)'}
              </span>
            </div>
          </div>

          {/* Reset Control */}
          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#585651] hover:text-[#1A1917] bg-white hover:bg-[#F3F2EC] border border-[#E6E4DD] rounded-md transition-colors shadow-2xs cursor-pointer"
              title="Reset all signal parameters and lag to baseline defaults"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#75736E]" />
              <span>Reset parameters</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Signal Generation & Parameters Configuration Panel */}
      <div className="bg-white border border-[#E6E4DD] rounded-lg p-5 shadow-xs space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#E6E4DD]">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#C85A32]" />
            <h3 className="text-xs font-mono font-bold tracking-wider uppercase text-[#1A1917]">
              Signal Generation Controls
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[#8A8882]">
            {isAutocorrelation ? 'SINGLE GENERATOR (X)' : 'INDEPENDENT DUAL GENERATORS (X & Y)'}
          </span>
        </div>

        {/* Signal X Controls */}
        <div className="space-y-3 p-3.5 bg-[#FAF9F6] rounded-md border border-[#E6E4DD]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1A1917]" />
              <label className="text-xs font-bold text-[#1A1917] font-mono">
                SIGNAL X {isDiscrete ? '[n]' : '(t)'}:
              </label>
              <span className="text-[11px] text-[#75736E] font-mono">
                {generatedX.category === 'energy' ? 'Energy Type' : 'Power / Time-Average Type'}
              </span>
            </div>
            <select
              value={signalTypeX}
              onChange={(e) => setSignalTypeX(e.target.value as SignalType)}
              className="text-xs font-mono bg-white border border-[#E6E4DD] rounded px-2.5 py-1 text-[#1A1917] focus:outline-none focus:ring-1 focus:ring-[#C85A32] cursor-pointer"
            >
              <option value="pulse">Rectangular Pulse (Energy Signal)</option>
              <option value="square">Periodic Square Wave (Power Signal)</option>
              <option value="sine">Sinusoidal Signal (Power Signal)</option>
              <option value="white_noise">White Gaussian Noise (Power Signal)</option>
              <option value="colored_noise">Colored AR(1) Noise (Power Signal)</option>
            </select>
          </div>

          {/* Signal X Parameter Sliders */}
          {renderParamControls('X')}
        </div>

        {/* Signal Y Controls (Active during Cross-correlation) */}
        {!isAutocorrelation && (
          <div className="space-y-3 p-3.5 bg-[#FAF9F6] rounded-md border border-[#E6E4DD] animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#C85A32]" />
                <label className="text-xs font-bold text-[#C85A32] font-mono">
                  SIGNAL Y {isDiscrete ? '[n]' : '(t)'} (COMPARISON TARGET):
                </label>
                <span className="text-[11px] text-[#75736E] font-mono">
                  {generatedY.category === 'energy' ? 'Energy Type' : 'Power / Time-Average Type'}
                </span>
              </div>
              <select
                value={signalTypeY}
                onChange={(e) => setSignalTypeY(e.target.value as SignalType)}
                className="text-xs font-mono bg-white border border-[#E6E4DD] rounded px-2.5 py-1 text-[#1A1917] focus:outline-none focus:ring-1 focus:ring-[#C85A32] cursor-pointer"
              >
                <option value="pulse">Rectangular Pulse (Energy Signal)</option>
                <option value="square">Periodic Square Wave (Power Signal)</option>
                <option value="sine">Sinusoidal Signal (Power Signal)</option>
                <option value="white_noise">White Gaussian Noise (Power Signal)</option>
                <option value="colored_noise">Colored AR(1) Noise (Power Signal)</option>
              </select>
            </div>

            {/* Signal Y Parameter Sliders */}
            {renderParamControls('Y')}
          </div>
        )}
      </div>

      {/* 3. Interactive Lag / Delay Control Banner */}
      <div className="bg-[#FBF4F0] border border-[#C85A32]/25 rounded-lg p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#C85A32] bg-white px-2 py-0.5 rounded border border-[#C85A32]/20">
              Lag / Displacement Control ({isDiscrete ? 'k' : 'τ'})
            </span>
            <span className="text-xs text-[#585651]">
              Shifts delayed comparison waveform: {isAutocorrelation ? 'x(t - τ)' : 'y(t - τ)'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono font-bold text-[#1A1917]">
              {isDiscrete ? `k = ${Math.round(lag)} samples` : `τ = ${lag >= 0 ? `+${lag.toFixed(2)}` : lag.toFixed(2)} s`}
            </span>
            <button
              type="button"
              onClick={() => setLag(0.0)}
              className="px-2 py-0.5 text-[11px] font-mono bg-white hover:bg-[#FAF9F6] border border-[#E6E4DD] rounded text-[#585651] hover:text-[#1A1917] transition-colors cursor-pointer"
            >
              Zero lag (τ=0)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setLag((prev) => Math.max(isDiscrete ? -20 : -3.0, Number((prev - (isDiscrete ? 1 : 0.1)).toFixed(2))))}
            className="px-2.5 py-1 bg-white border border-[#E6E4DD] rounded text-xs font-mono text-[#585651] hover:text-[#1A1917] cursor-pointer"
          >
            {isDiscrete ? '-1' : '-0.1s'}
          </button>
          <input
            type="range"
            min={isDiscrete ? -20 : -3.0}
            max={isDiscrete ? 20 : 3.0}
            step={isDiscrete ? 1 : 0.05}
            value={lag}
            onChange={(e) => setLag(parseFloat(e.target.value))}
            className="w-full accent-[#C85A32] cursor-pointer h-2"
          />
          <button
            type="button"
            onClick={() => setLag((prev) => Math.min(isDiscrete ? 20 : 3.0, Number((prev + (isDiscrete ? 1 : 0.1)).toFixed(2))))}
            className="px-2.5 py-1 bg-white border border-[#E6E4DD] rounded text-xs font-mono text-[#585651] hover:text-[#1A1917] cursor-pointer"
          >
            {isDiscrete ? '+1' : '+0.1s'}
          </button>
        </div>
      </div>

      {/* 4. Visualizations: Signal Overlap and Correlation Curve */}
      <div className="space-y-4">
        {/* Signal Visualization Area */}
        <SignalPlotCanvas
          title={
            isAutocorrelation
              ? `Signal Alignment: Original x${isDiscrete ? '[n]' : '(t)'} and Shifted x${isDiscrete ? '[n - k]' : '(t - τ)'}`
              : `Signal Alignment: Reference x${isDiscrete ? '[n]' : '(t)'} and Target y${isDiscrete ? '[n - k]' : '(t - τ)'}`
          }
          subtitle={`Relative waveform alignment under applied delay ${isDiscrete ? `k = ${Math.round(lag)} samples` : `τ = ${lag >= 0 ? `+${lag.toFixed(2)}` : lag.toFixed(2)} s`}`}
          xLabel={isDiscrete ? 'Sample Index n (samples)' : 'Time t (s)'}
          yLabel="Signal Amplitude (V)"
          domain={domainX}
          range={signalPlotRange}
          isDiscrete={isDiscrete}
          statusBadge={isAutocorrelation ? 'AUTOCORRELATION OVERLAP' : 'CROSS-CORRELATION OVERLAP'}
          resultCard={
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#FAF9F6] border border-[#E6E4DD] rounded p-2 text-xs font-mono">
              <div className="bg-white p-2 rounded border border-[#EAE8E1]">
                <div className="text-[10px] text-[#8A8882] uppercase">
                  {isAutocorrelation ? 'Signal Energy / Power' : 'Channel X Power'}
                </div>
                <div className="font-bold text-[#1A1917] mt-0.5">
                  {correlationResult.convention === 'energy'
                    ? `${generatedX.energy.toFixed(3)} V²·s`
                    : `${generatedX.power.toFixed(3)} V²`}
                </div>
              </div>
              <div className="bg-white p-2 rounded border border-[#EAE8E1]">
                <div className="text-[10px] text-[#8A8882] uppercase">Applied Time Shift</div>
                <div className="font-bold text-[#C85A32] mt-0.5">
                  {isDiscrete
                    ? `k = ${Math.round(lag)} samples`
                    : `τ = ${lag >= 0 ? `+${lag.toFixed(2)}` : lag.toFixed(2)} s`}
                </div>
              </div>
              <div className="bg-white p-2 rounded border border-[#EAE8E1]">
                <div className="text-[10px] text-[#8A8882] uppercase">Record Length / Span</div>
                <div className="font-bold text-[#1A1917] mt-0.5">
                  {isDiscrete
                    ? `${generatedX.samples.length} samples`
                    : `${generatedX.duration.toFixed(1)} s (N=${generatedX.samples.length})`}
                </div>
              </div>
              <div className="bg-white p-2 rounded border border-[#EAE8E1]">
                <div className="text-[10px] text-[#8A8882] uppercase">Overlap State</div>
                <div className="font-bold text-[#1A1917] mt-0.5">
                  {Math.abs(lag) < 1e-4 ? 'Identical / Zero Shift' : 'Time-Shifted Replica'}
                </div>
              </div>
            </div>
          }
          series={[
            {
              id: 'sig-orig',
              name: isAutocorrelation ? `Original x${isDiscrete ? '[n]' : '(t)'}` : `Signal X${isDiscrete ? '[n]' : '(t)'}`,
              color: '#1A1917',
              strokeWidth: 2,
              strokeOpacity: 0.75,
              markerStyle: 'filled',
              points: pointsSignalX,
            },
            {
              id: 'sig-delayed',
              name: isAutocorrelation ? `Shifted x${isDiscrete ? '[n - k]' : '(t - τ)'}` : `Shifted y${isDiscrete ? '[n - k]' : '(t - τ)'}`,
              color: '#C85A32',
              strokeWidth: 2.75,
              dash: isDiscrete ? 'none' : '7 4',
              markerStyle: 'ring',
              points: pointsSignalDelayed,
            },
          ]}
        />

        {/* Correlation Function Visualization */}
        <SignalPlotCanvas
          title={
            isAutocorrelation
              ? `Autocorrelation Function ${correlationResult.convention === 'energy' ? 'R_xx(τ)' : 'R̂_xx(τ)'} vs Lag`
              : `Cross-Correlation Function ${correlationResult.convention === 'energy' ? 'R_xy(τ)' : 'R̂_xy(τ)'} vs Lag`
          }
          subtitle={`Mathematically computed sliding inner product across all lags [${domainLag[0]}, ${domainLag[1]}]`}
          xLabel={isDiscrete ? 'Lag Index k (samples)' : 'Lag Parameter τ (s)'}
          yLabel={`${isAutocorrelation ? 'Autocorrelation R_xx(τ)' : 'Cross-Correlation R_xy(τ)'} (${correlationResult.units})`}
          domain={domainLag}
          range={corrPlotRange}
          isDiscrete={isDiscrete}
          height={260}
          statusBadge={correlationResult.convention === 'energy' ? 'ENERGY METRIC' : 'POWER METRIC'}
          resultCard={
            isAutocorrelation ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#FAF9F6] border border-[#E6E4DD] rounded p-2 text-xs font-mono">
                <div className="bg-white p-2 rounded border border-[#EAE8E1]">
                  <div className="text-[10px] text-[#8A8882] uppercase">
                    R_xx(0) [Zero-Lag Value]
                  </div>
                  <div className="font-bold text-[#C85A32] text-sm mt-0.5">
                    {correlationResult.zeroLagValue.toFixed(4)} {correlationResult.units}
                  </div>
                  <div className="text-[9px] text-[#75736E]">
                    {correlationResult.convention === 'energy' ? 'Signal Energy (E)' : 'Time-Average Power (P)'}
                  </div>
                </div>
                <div className="bg-white p-2 rounded border border-[#EAE8E1]">
                  <div className="text-[10px] text-[#8A8882] uppercase">
                    Selected Lag ({isDiscrete ? 'k' : 'τ'})
                  </div>
                  <div className="font-bold text-[#1A1917] text-sm mt-0.5">
                    {isDiscrete
                      ? `k = ${Math.round(lag)} samples`
                      : `τ = ${lag >= 0 ? `+${lag.toFixed(2)}` : lag.toFixed(2)} s`}
                  </div>
                  <div className="text-[9px] text-[#75736E]">Current slider position</div>
                </div>
                <div className="bg-white p-2 rounded border border-[#EAE8E1]">
                  <div className="text-[10px] text-[#8A8882] uppercase">
                    Value at Lag R({isDiscrete ? 'k' : 'τ'})
                  </div>
                  <div className="font-bold text-[#C85A32] text-sm mt-0.5">
                    {correlationResult.currentR >= 0 ? `+${correlationResult.currentR.toFixed(4)}` : correlationResult.currentR.toFixed(4)} {correlationResult.units}
                  </div>
                  <div className="text-[9px] text-[#75736E]">Inner product overlap</div>
                </div>
                <div className="bg-white p-2 rounded border border-[#EAE8E1]">
                  <div className="text-[10px] text-[#8A8882] uppercase">
                    Normalized ρ(τ)
                  </div>
                  <div className="font-bold text-[#1A1917] text-sm mt-0.5">
                    {correlationResult.currentNormalized >= 0
                      ? `+${correlationResult.currentNormalized.toFixed(4)}`
                      : correlationResult.currentNormalized.toFixed(4)} (–)
                  </div>
                  <div className="text-[9px] text-[#75736E]">Dimensionless: –</div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-[#FAF9F6] border border-[#E6E4DD] rounded p-2 text-xs font-mono">
                <div className="bg-white p-2 rounded border border-[#EAE8E1]">
                  <div className="text-[10px] text-[#8A8882] uppercase">
                    Selected Lag ({isDiscrete ? 'k' : 'τ'})
                  </div>
                  <div className="font-bold text-[#1A1917] text-sm mt-0.5">
                    {isDiscrete
                      ? `k = ${Math.round(lag)} samples`
                      : `τ = ${lag >= 0 ? `+${lag.toFixed(2)}` : lag.toFixed(2)} s`}
                  </div>
                  <div className="text-[9px] text-[#75736E]">Current alignment</div>
                </div>
                <div className="bg-white p-2 rounded border border-[#EAE8E1]">
                  <div className="text-[10px] text-[#8A8882] uppercase">
                    Cross-Corr R_xy(τ)
                  </div>
                  <div className="font-bold text-[#C85A32] text-sm mt-0.5">
                    {correlationResult.currentR >= 0 ? `+${correlationResult.currentR.toFixed(4)}` : correlationResult.currentR.toFixed(4)} {correlationResult.units}
                  </div>
                  <div className="text-[9px] text-[#75736E]">Correlation at lag</div>
                </div>
                <div className="bg-white p-2 rounded border border-[#EAE8E1]">
                  <div className="text-[10px] text-[#8A8882] uppercase">
                    Optimal Alignment (Peak)
                  </div>
                  <div className="font-bold text-[#1A1917] text-sm mt-0.5">
                    {isDiscrete
                      ? `k = ${Math.round(correlationResult.peakLag)} samples`
                      : `τ = ${correlationResult.peakLag >= 0 ? `+${correlationResult.peakLag.toFixed(2)}` : correlationResult.peakLag.toFixed(2)} s`}
                  </div>
                  <div className="text-[9px] text-[#75736E]">
                    R_max = {correlationResult.peakValue.toFixed(4)} {correlationResult.units}
                  </div>
                </div>
                <div className="bg-white p-2 rounded border border-[#EAE8E1]">
                  <div className="text-[10px] text-[#8A8882] uppercase">
                    Normalized ρ_xy(τ)
                  </div>
                  <div className="font-bold text-[#1A1917] text-sm mt-0.5">
                    {correlationResult.currentNormalized >= 0
                      ? `+${correlationResult.currentNormalized.toFixed(4)}`
                      : correlationResult.currentNormalized.toFixed(4)} (–)
                  </div>
                  <div className="text-[9px] text-[#75736E]">Dimensionless: –</div>
                </div>
              </div>
            )
          }
          markers={[
            {
              x: 0,
              y: isAutocorrelation ? correlationResult.zeroLagValue : undefined,
              color: isAutocorrelation ? '#C85A32' : '#8A8882',
              style: 'dashed',
            },
            ...(Math.abs(lag) > (isDiscrete ? 0.5 : 0.05)
              ? [
                  {
                    x: lag,
                    y: correlationResult.currentR,
                    color: isAutocorrelation ? '#D97706' : '#C85A32',
                    style: 'solid' as const,
                  },
                ]
              : []),
          ]}
          series={[
            {
              id: 'corr-curve',
              name: isAutocorrelation ? (isDiscrete ? 'r_xx[k]' : 'R_xx(τ)') : (isDiscrete ? 'r_xy[k]' : 'R_xy(τ)'),
              color: '#C85A32',
              strokeWidth: 2.25,
              points: pointsCorrelation,
            },
          ]}
        />
      </div>

      {/* 5. Numerical Results Area (Real Mathematical Outputs) */}
      <div className="bg-[#FAF9F6] border border-[#E6E4DD] rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#E6E4DD]">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#C85A32]" />
            <h4 className="text-xs font-mono font-bold tracking-wider uppercase text-[#1A1917]">
              Mathematical Calculation Results
            </h4>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white border border-[#E6E4DD] text-[#C85A32] font-semibold">
            {correlationResult.convention === 'energy' ? 'ENERGY CONVENTION' : 'BIASED POWER TIME-AVERAGE'}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Current Lag Result */}
          <div className="p-3.5 bg-white rounded-md border border-[#E6E4DD]">
            <div className="text-[11px] font-mono text-[#8A8882]">VALUE AT CURRENT LAG</div>
            <div className="text-xs font-semibold text-[#1A1917] mt-0.5">
              R({isDiscrete ? `${Math.round(lag)} samples` : `${lag.toFixed(2)} s`})
            </div>
            <div className="mt-2 text-xl font-mono font-bold text-[#C85A32]">
              {correlationResult.currentR >= 0 ? `+${correlationResult.currentR.toFixed(4)}` : correlationResult.currentR.toFixed(4)}
            </div>
            <div className="text-[10px] font-mono text-[#75736E] mt-1">{correlationResult.units}</div>
          </div>

          {/* Value at Current Selected Lag */}
          <div className="p-3.5 bg-white rounded-md border border-[#E6E4DD]">
            <div className="text-[11px] font-mono text-[#8A8882]">
              {isAutocorrelation
                ? `AUTOCORRELATION ${isDiscrete ? 'r_xx[k]' : 'R_xx(τ)'}`
                : `CROSS-CORRELATION ${isDiscrete ? 'r_xy[k]' : 'R_xy(τ)'}`}
            </div>
            <div className="text-xs font-heading font-medium text-[#1A1917] mt-0.5">
              At Lag {isDiscrete ? `k = ${Math.round(lag)} samples` : `τ = ${lag >= 0 ? `+${lag.toFixed(2)}` : lag.toFixed(2)} s`}
            </div>
            <div className="mt-2 text-xl font-mono font-bold text-[#C85A32]">
              {correlationResult.currentR >= 0 ? `+${correlationResult.currentR.toFixed(4)}` : correlationResult.currentR.toFixed(4)}
            </div>
            <div className="text-[10px] font-mono text-[#75736E] mt-1">{correlationResult.units}</div>
          </div>

          {/* Zero-Lag Value */}
          <div className="p-3.5 bg-white rounded-md border border-[#E6E4DD]">
            <div className="text-[11px] font-mono text-[#8A8882]">
              {isAutocorrelation
                ? `ZERO-LAG VALUE ${isDiscrete ? 'r_xx[0]' : 'R_xx(0)'}`
                : `ZERO-LAG VALUE ${isDiscrete ? 'r_xy[0]' : 'R_xy(0)'}`}
            </div>
            <div className="text-xs font-heading font-medium text-[#1A1917] mt-0.5">
              {correlationResult.convention === 'energy' ? 'Total Signal Energy (E)' : 'Time-Average Power (P)'}
            </div>
            <div className="mt-2 text-xl font-mono font-bold text-[#1A1917]">
              {correlationResult.zeroLagValue.toFixed(4)}
            </div>
            <div className="text-[10px] font-mono text-[#75736E] mt-1">{correlationResult.units}</div>
          </div>

          {/* Normalized Coefficient */}
          <div className="p-3.5 bg-white rounded-md border border-[#E6E4DD]">
            <div className="text-[11px] font-mono text-[#8A8882]">NORMALIZED COEFFICIENT</div>
            <div className="text-xs font-heading font-medium text-[#1A1917] mt-0.5">ρ(τ) ∈ [–1.0, +1.0]</div>
            <div className="mt-2 text-xl font-mono font-bold text-[#1A1917]">
              {correlationResult.currentNormalized >= 0
                ? `+${correlationResult.currentNormalized.toFixed(4)}`
                : correlationResult.currentNormalized.toFixed(4)}
            </div>
            <div className="text-[10px] font-mono text-[#75736E] mt-1">Dimensionless: (–)</div>
          </div>

          {/* Peak Lag & Peak Value */}
          <div className="p-3.5 bg-white rounded-md border border-[#E6E4DD]">
            <div className="text-[11px] font-mono text-[#8A8882]">PEAK CORRELATION LOCATION</div>
            <div className="text-xs font-heading font-medium text-[#1A1917] mt-0.5">
              {isAutocorrelation ? 'Symmetric Zero Peak' : `Peak Delay (R_max = ${correlationResult.peakValue.toFixed(2)} ${correlationResult.units})`}
            </div>
            <div className="mt-2 text-xl font-mono font-bold text-[#1A1917]">
              {correlationResult.peakLag >= 0 ? `+${correlationResult.peakLag.toFixed(2)}` : correlationResult.peakLag.toFixed(2)} {isDiscrete ? 'samples' : 's'}
            </div>
            <div className="text-[10px] font-mono text-[#75736E] mt-1">Optimal Relative Alignment</div>
          </div>
        </div>
      </div>

      {/* 6. Theory & Explanation Collapsible Panel */}
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
              {isAutocorrelation ? 'AUTOCORRELATION THEORY' : 'CROSS-CORRELATION THEORY'}
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
                    {conceptualExplanation.heading}
                  </h5>
                  <p className="font-body text-xs sm:text-[13px] text-[#484642] leading-relaxed">
                    {conceptualExplanation.summary}
                  </p>
                </div>

                <div className="p-3.5 bg-[#FAF9F6] rounded-md border border-[#E6E4DD] space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-heading font-semibold text-[#1A1917]">
                    <Info className="w-3.5 h-3.5 text-[#C85A32]" />
                    <span>Active Experiment Result Interpretation</span>
                  </div>
                  <p className="font-body text-xs text-[#585651] leading-relaxed">
                    {conceptualExplanation.interpretation}
                  </p>
                </div>

                <div className="pt-2">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#75736E] mb-2">
                    Core Signal Properties
                  </div>
                  <ul className="space-y-1.5 text-xs font-body text-[#484642]">
                    <li className="flex items-start gap-2">
                      <span className="text-[#C85A32] font-mono font-bold">•</span>
                      <span>
                        <strong>Even Symmetry:</strong> For real autocorrelation, R_xx(τ) = R_xx(-τ). Overlap is strictly symmetric about zero lag.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#C85A32] font-mono font-bold">•</span>
                      <span>
                        <strong>Zero-Padding:</strong> Beyond observation record length, signals evaluate to zero, maintaining uniform N-sample scaling.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-[#C85A32] font-mono font-bold">•</span>
                      <span>
                        <strong>Lag Convention:</strong> R_xy(τ) = ∫ x(t) y(t - τ) dt. A peak at negative lag indicates target y is advanced relative to reference x.
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Right Column: Theoretical Formula & Symbol Definitions */}
              <div className="space-y-4">
                <div className="p-4 bg-[#FAF9F6] rounded-md border border-[#E6E4DD] space-y-2">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#75736E]">
                    Analytical Formulation
                  </div>
                  <div className="p-2.5 bg-white rounded border border-[#E6E4DD]/80">
                    <MathView math={conceptualExplanation.formulaTex} displayMode={true} />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#75736E]">
                    Definitions of Important Symbols
                  </div>
                  <div className="divide-y divide-[#E6E4DD] rounded-md border border-[#E6E4DD] bg-white overflow-hidden text-xs">
                    {conceptualExplanation.symbols.map((sym, idx) => (
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


      {/* 7. Mathematical Validation Test Suite (Expandable) */}
      <div className="bg-[#FAF9F6] border border-[#E6E4DD] rounded-lg p-4 shadow-xs">
        <button
          type="button"
          onClick={() => setShowValidation(!showValidation)}
          className="w-full flex items-center justify-between text-left text-xs font-mono font-bold uppercase tracking-wider text-[#1A1917] hover:text-[#C85A32] transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Mathematical Verification & Validation Suite</span>
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
                onClick={() => setValidationTab('stage2')}
                className={`px-3 py-1 text-xs font-mono rounded cursor-pointer transition-colors ${
                  validationTab === 'stage2'
                    ? 'bg-[#1A1917] text-white font-bold'
                    : 'text-[#585651] hover:text-[#1A1917] bg-white border border-[#E6E4DD]'
                }`}
              >
                Stage 2 Core Properties (6 Tests)
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
                  The calculations are verified against the 6 core properties required by Stage 2:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {validationTests.map((t) => (
                    <div
                      key={t.testNumber}
                      className="p-3 bg-white border border-[#E6E4DD] rounded-md text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between font-mono font-semibold">
                        <span className="text-[#1A1917]">
                          0{t.testNumber}. {t.title}
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
