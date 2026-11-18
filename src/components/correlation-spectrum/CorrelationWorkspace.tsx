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
import {
  computeCorrelation,
  CorrelationResult,
  runCorrelationValidationTests,
  ValidationTestResult,
} from './correlationEngine';
import { executeStage5TestSuite } from './stage5VerificationSuite';

const SIGNAL_OPTIONS: Array<{ value: SignalType; label: string; shortLabel: string }> = [
  { value: 'sine', label: 'Sinusoid', shortLabel: 'Sinusoid' },
  { value: 'pulse', label: 'Rectangular Pulse', shortLabel: 'Rect. Pulse' },
  { value: 'white_noise', label: 'White Noise', shortLabel: 'White Noise' },
  { value: 'colored_noise', label: 'Colored Noise', shortLabel: 'Colored Noise' },
];

export const CorrelationWorkspace: React.FC = () => {
  // Mode selection states
  const [isAutocorrelation, setIsAutocorrelation] = useState<boolean>(true);
  const [timeDomain, setTimeDomain] = useState<'continuous' | 'discrete'>('continuous');
  const [activeChannelTab, setActiveChannelTab] = useState<'X' | 'Y'>('X');

  // Signal Types (strictly: sine, pulse, white_noise, colored_noise)
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

  // Signal Y Parameters (Cross-correlation)
  const [sineAmpY, setSineAmpY] = useState<number>(1.5);
  const [sineFreqY, setSineFreqY] = useState<number>(1.0);
  const [sinePhaseY, setSinePhaseY] = useState<number>(0);

  const [pulseAmpY, setPulseAmpY] = useState<number>(1.5);
  const [pulseWidthY, setPulseWidthY] = useState<number>(1.0);
  const [pulsePosY, setPulsePosY] = useState<number>(0.8);

  const [whiteNoiseSigmaY, setWhiteNoiseSigmaY] = useState<number>(1.0);
  const [whiteNoiseSeedY, setWhiteNoiseSeedY] = useState<number>(88);

  const [coloredNoiseSigmaY, setColoredNoiseSigmaY] = useState<number>(1.0);
  const [coloredNoiseAlphaY, setColoredNoiseAlphaY] = useState<number>(0.7);
  const [coloredNoiseSeedY, setColoredNoiseSeedY] = useState<number>(202);

  // Interactive Lag / Delay Control
  const [lag, setLag] = useState<number>(0.0);

  // Modals for Theory & Verification (keeps main workspace zero-scroll)
  const [showTheoryModal, setShowTheoryModal] = useState<boolean>(false);
  const [showValidationModal, setShowValidationModal] = useState<boolean>(false);
  const [validationTab, setValidationTab] = useState<'stage5' | 'stage2'>('stage5');

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
      setLag((prev) => Math.max(-20, Math.min(20, Math.round(prev * 5))));
    } else {
      setLag((prev) => Math.max(-3.0, Math.min(3.0, Number((prev / 5).toFixed(2)))));
    }
  };

  // Build unified config for Signal X
  const configX: UnifiedSignalConfig = useMemo(
    () => ({
      type: signalTypeX,
      sine: { amplitude: sineAmpX, frequency: sineFreqX, phase: sinePhaseX },
      pulse: { amplitude: pulseAmpX, width: pulseWidthX, position: pulsePosX },
      whiteNoise: { stdDev: whiteNoiseSigmaX, seed: whiteNoiseSeedX },
      coloredNoise: {
        stdDev: coloredNoiseSigmaX,
        filterParam: coloredNoiseAlphaX,
        seed: coloredNoiseSeedX,
      },
    }),
    [
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
    ]
  );

  // Build unified config for Signal Y
  const configY: UnifiedSignalConfig = useMemo(
    () => ({
      type: signalTypeY,
      sine: { amplitude: sineAmpY, frequency: sineFreqY, phase: sinePhaseY },
      pulse: { amplitude: pulseAmpY, width: pulseWidthY, position: pulsePosY },
      whiteNoise: { stdDev: whiteNoiseSigmaY, seed: whiteNoiseSeedY },
      coloredNoise: {
        stdDev: coloredNoiseSigmaY,
        filterParam: coloredNoiseAlphaY,
        seed: coloredNoiseSeedY,
      },
    }),
    [
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
    ]
  );

  // Generate Signal X & Signal Y
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

  const validationTests: ValidationTestResult[] = useMemo(() => runCorrelationValidationTests(), []);
  const stage5Tests = useMemo(() => executeStage5TestSuite(), []);
  const stage5Passed = stage5Tests.filter((t) => t.status === 'PASS').length;

  // Delayed waveform values at current lag
  const delayedSamples = useMemo(() => generatedY.evalShifted(lag), [generatedY, lag]);

  const handleReset = () => {
    setIsAutocorrelation(true);
    setTimeDomain('continuous');
    setActiveChannelTab('X');
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

  // Plot series data
  const pointsSignalX = useMemo(
    () => generatedX.timeVector.map((t, i) => ({ x: t, y: generatedX.samples[i] })),
    [generatedX]
  );

  const pointsSignalDelayed = useMemo(
    () => generatedX.timeVector.map((t, i) => ({ x: t, y: delayedSamples[i] })),
    [generatedX.timeVector, delayedSamples]
  );

  const pointsCorrelation = useMemo(
    () => correlationResult.lags.map((l, i) => ({ x: l, y: correlationResult.rValues[i] })),
    [correlationResult]
  );

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

  const activeChannel: 'X' | 'Y' = isAutocorrelation ? 'X' : activeChannelTab;

  const renderChannelSliders = (channel: 'X' | 'Y') => {
    const type = channel === 'X' ? signalTypeX : signalTypeY;
    const isX = channel === 'X';

    if (type === 'sine') {
      const amp = isX ? sineAmpX : sineAmpY;
      const freq = isX ? sineFreqX : sineFreqY;
      const phase = isX ? sinePhaseX : sinePhaseY;
      const displayFreq = isDiscrete ? freq / 10 : freq;

      return (
        <div className="space-y-2.5">
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono text-[#585651]">
              <span>Amplitude (A)</span>
              <span className="font-bold text-[#1A1917]">{amp.toFixed(2)} V</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="3.0"
              step="0.1"
              value={amp}
              onChange={(e) => (isX ? setSineAmpX : setSineAmpY)(parseFloat(e.target.value))}
              className="w-full accent-[#C85A32] cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono text-[#585651]">
              <span>Frequency (f₀)</span>
              <span className="font-bold text-[#1A1917]">
                {isDiscrete ? `${displayFreq.toFixed(2)} cyc/smp` : `${freq.toFixed(1)} Hz`}
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="4.0"
              step="0.5"
              value={freq}
              onChange={(e) => (isX ? setSineFreqX : setSineFreqY)(parseFloat(e.target.value))}
              className="w-full accent-[#C85A32] cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono text-[#585651]">
              <span>Phase (ϕ)</span>
              <span className="font-bold text-[#1A1917]">{phase}°</span>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              step="15"
              value={phase}
              onChange={(e) => (isX ? setSinePhaseX : setSinePhaseY)(parseInt(e.target.value, 10))}
              className="w-full accent-[#C85A32] cursor-pointer"
            />
          </div>
        </div>
      );
    }

    if (type === 'pulse') {
      const amp = isX ? pulseAmpX : pulseAmpY;
      const width = isX ? pulseWidthX : pulseWidthY;
      const pos = isX ? pulsePosX : pulsePosY;

      return (
        <div className="space-y-2.5">
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono text-[#585651]">
              <span>Amplitude (A)</span>
              <span className="font-bold text-[#1A1917]">{amp.toFixed(2)} V</span>
            </div>
            <input
              type="range"
              min="0.2"
              max="3.0"
              step="0.1"
              value={amp}
              onChange={(e) => (isX ? setPulseAmpX : setPulseAmpY)(parseFloat(e.target.value))}
              className="w-full accent-[#C85A32] cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono text-[#585651]">
              <span>Width (W)</span>
              <span className="font-bold text-[#1A1917]">
                {isDiscrete ? `${Math.round(width * 5)} samples` : `${width.toFixed(2)} s`}
              </span>
            </div>
            <input
              type="range"
              min="0.4"
              max="2.4"
              step="0.2"
              value={width}
              onChange={(e) => (isX ? setPulseWidthX : setPulseWidthY)(parseFloat(e.target.value))}
              className="w-full accent-[#C85A32] cursor-pointer"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono text-[#585651]">
              <span>Center (t₀)</span>
              <span className="font-bold text-[#1A1917]">
                {isDiscrete ? `${Math.round(pos * 5)} samples` : `${pos.toFixed(2)} s`}
              </span>
            </div>
            <input
              type="range"
              min="-1.5"
              max="1.5"
              step="0.1"
              value={pos}
              onChange={(e) => (isX ? setPulsePosX : setPulsePosY)(parseFloat(e.target.value))}
              className="w-full accent-[#C85A32] cursor-pointer"
            />
          </div>
        </div>
      );
    }

    if (type === 'white_noise') {
      const sigma = isX ? whiteNoiseSigmaX : whiteNoiseSigmaY;
      const seed = isX ? whiteNoiseSeedX : whiteNoiseSeedY;
      return (
        <div className="space-y-2.5">
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono text-[#585651]">
              <span>Std Dev (σ)</span>
              <span className="font-bold text-[#1A1917]">
                {sigma.toFixed(2)} V (σ²={(sigma * sigma).toFixed(2)})
              </span>
            </div>
            <input
              type="range"
              min="0.2"
              max="2.5"
              step="0.1"
              value={sigma}
              onChange={(e) =>
                (isX ? setWhiteNoiseSigmaX : setWhiteNoiseSigmaY)(parseFloat(e.target.value))
              }
              className="w-full accent-[#C85A32] cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={() => (isX ? setWhiteNoiseSeedX((s) => s + 1) : setWhiteNoiseSeedY((s) => s + 1))}
            className="w-full py-1.5 px-3 bg-white hover:bg-[#F3F2EC] border border-[#E6E4DD] rounded-md text-xs font-mono text-[#1A1917] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Shuffle className="w-3.5 h-3.5 text-[#C85A32]" />
            <span>New Realization (Seed #{seed})</span>
          </button>
        </div>
      );
    }

    const sigma = isX ? coloredNoiseSigmaX : coloredNoiseSigmaY;
    const alpha = isX ? coloredNoiseAlphaX : coloredNoiseAlphaY;
    const seed = isX ? coloredNoiseSeedX : coloredNoiseSeedY;

    return (
      <div className="space-y-2.5">
        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono text-[#585651]">
            <span>Std Dev (σ)</span>
            <span className="font-bold text-[#1A1917]">
              {sigma.toFixed(2)} V (σ²={(sigma * sigma).toFixed(2)})
            </span>
          </div>
          <input
            type="range"
            min="0.2"
            max="2.5"
            step="0.1"
            value={sigma}
            onChange={(e) =>
              (isX ? setColoredNoiseSigmaX : setColoredNoiseSigmaY)(parseFloat(e.target.value))
            }
            className="w-full accent-[#C85A32] cursor-pointer"
          />
        </div>

        <div className="space-y-1">
          <div className="flex justify-between text-xs font-mono text-[#585651]">
            <span>AR(1) Filter Pole (α)</span>
            <span className="font-bold text-[#1A1917]">{alpha.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="-0.9"
            max="0.9"
            step="0.05"
            value={alpha}
            onChange={(e) =>
              (isX ? setColoredNoiseAlphaX : setColoredNoiseAlphaY)(parseFloat(e.target.value))
            }
            className="w-full accent-[#C85A32] cursor-pointer"
          />
        </div>

        <button
          type="button"
          onClick={() =>
            (isX ? setColoredNoiseSeedX((s) => s + 1) : setColoredNoiseSeedY((s) => s + 1))
          }
          className="w-full py-1.5 px-3 bg-white hover:bg-[#F3F2EC] border border-[#E6E4DD] rounded-md text-xs font-mono text-[#1A1917] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <Shuffle className="w-3.5 h-3.5 text-[#C85A32]" />
          <span>New Realization (Seed #{seed})</span>
        </button>
      </div>
    );
  };

  // Conceptual explanation for the Theory Modal
  const conceptualExplanation = useMemo(() => {
    const lagDist = Math.abs(lag);

    if (isAutocorrelation) {
      if (signalTypeX === 'pulse') {
        const W = isDiscrete ? Math.round(pulseWidthX * 5) : pulseWidthX;
        const hasOverlap = lagDist < W;
        return {
          heading: 'Rectangular Pulse Autocorrelation (Energy Signal)',
          summary:
            'Autocorrelation measures the sliding inner product between the pulse x(t) and its time-shifted replica x(t - τ). For a pulse of duration W and amplitude A, the overlapping width decreases linearly from W down to 0, producing a triangular correlation function of base width 2W.',
          formulaTex: isDiscrete
            ? 'r_{xx}[k] = \\sum_{n=-\\infty}^{\\infty} x[n] x[n - k] = A^2 (W - |k|) \\quad (|k| \\le W)'
            : 'R_{xx}(\\tau) = \\int_{-\\infty}^{\\infty} x(t) x(t - \\tau)\\,dt = A^2 (W - |\\tau|) \\quad (|\\tau| \\le W)',
          symbols: [
            {
              symbol: isDiscrete ? 'k' : '\\tau',
              meaning: `Lag parameter (currently ${isDiscrete ? `${Math.round(lag)} samples` : `${lag.toFixed(2)} s`})`,
            },
            { symbol: 'W', meaning: `Pulse width = ${isDiscrete ? `${W} samples` : `${W.toFixed(2)} s`}` },
            { symbol: 'A', meaning: `Pulse amplitude = ${pulseAmpX.toFixed(2)} V` },
            {
              symbol: isDiscrete ? 'r_{xx}[0]' : 'R_{xx}(0)',
              meaning: `Total signal energy E_x = A² W = ${(pulseAmpX * pulseAmpX * W).toFixed(4)} ${correlationResult.units}`,
            },
          ],
          interpretation: hasOverlap
            ? `At zero lag, maximum overlap yields R(0) = ${correlationResult.zeroLagValue.toFixed(4)} ${correlationResult.units}, matching exact signal energy. At lag ${isDiscrete ? `k = ${Math.round(lag)}` : `τ = ${lag.toFixed(2)} s`}, R = ${correlationResult.currentR.toFixed(4)} ${correlationResult.units}.`
            : `At lag ${isDiscrete ? `k = ${Math.round(lag)}` : `τ = ${lag.toFixed(2)} s`}, displacement exceeds pulse width (|lag| ≥ W), yielding zero overlap (R = 0).`,
        };
      }

      if (signalTypeX === 'sine') {
        const effectiveF0 = isDiscrete ? sineFreqX / 10 : sineFreqX;
        const T0 = (1 / Math.max(1e-4, effectiveF0)).toFixed(2);
        return {
          heading: 'Sinusoid Autocorrelation (Power Signal)',
          summary:
            'The autocorrelation of a sinusoidal waveform x(t) = A cos(2π f₀ t + ϕ) preserves its harmonic frequency f₀ while discarding initial phase ϕ. The resulting autocorrelation is an even cosine function with zero-lag value equal to the time-average signal power A²/2.',
          formulaTex: isDiscrete
            ? 'r_{xx}[k] = \\frac{A^2}{2} \\cos(2\\pi f_0 k)'
            : 'R_{xx}(\\tau) = \\frac{A^2}{2} \\cos(2\\pi f_0 \\tau)',
          symbols: [
            {
              symbol: 'f_0',
              meaning: `Frequency = ${isDiscrete ? `${effectiveF0.toFixed(2)} cyc/smp` : `${sineFreqX.toFixed(1)} Hz`}`,
            },
            { symbol: 'T_0', meaning: `Period = ${T0} ${isDiscrete ? 'samples' : 's'}` },
            { symbol: 'A', meaning: `Peak amplitude = ${sineAmpX.toFixed(2)} V` },
            {
              symbol: isDiscrete ? 'r_{xx}[0]' : 'R_{xx}(0)',
              meaning: `Average power P_x = A²/2 = ${((sineAmpX * sineAmpX) / 2).toFixed(4)} V²`,
            },
          ],
          interpretation: `Zero-lag value R(0) = ${correlationResult.zeroLagValue.toFixed(4)} ${correlationResult.units} matches theoretical power A²/2 = ${((sineAmpX * sineAmpX) / 2).toFixed(4)} V². At current lag, R = ${correlationResult.currentR.toFixed(4)} ${correlationResult.units}.`,
        };
      }

      if (signalTypeX === 'white_noise') {
        return {
          heading: 'White Gaussian Noise Autocorrelation',
          summary:
            'White noise consists of mutually uncorrelated random samples. At zero lag, each sample correlates with itself to yield the process variance σ². At non-zero lags, independent samples average toward zero.',
          formulaTex: isDiscrete
            ? 'r_{xx}[k] = \\sigma^2 \\delta[k] = \\begin{cases} \\sigma^2, & k = 0 \\\\ 0, & k \\ne 0 \\end{cases}'
            : 'R_{xx}(\\tau) = \\sigma^2 \\delta(\\tau)',
          symbols: [
            { symbol: '\\sigma^2', meaning: `Target process variance = ${(whiteNoiseSigmaX * whiteNoiseSigmaX).toFixed(2)} V²` },
            { symbol: '\\delta', meaning: 'Dirac delta (CTS) or Kronecker delta (DTS)' },
            { symbol: 'R_{xx}(0)', meaning: `Measured power = ${correlationResult.zeroLagValue.toFixed(4)} ${correlationResult.units}` },
          ],
          interpretation: `Zero-lag value R(0) = ${correlationResult.zeroLagValue.toFixed(4)} ${correlationResult.units} equals sample variance (nominal ${(whiteNoiseSigmaX * whiteNoiseSigmaX).toFixed(2)} V²).`,
        };
      }

      return {
        heading: 'Colored AR(1) Noise Autocorrelation',
        summary:
          'Colored noise is generated by filtering white noise through a single-pole AR(1) difference equation, introducing temporal memory between adjacent samples and producing an exponential decay envelope governed by pole α.',
        formulaTex: isDiscrete
          ? 'r_{xx}[k] = \\sigma^2 \\alpha^{|k|} \\quad (|\\alpha| < 1)'
          : 'R_{xx}(\\tau) \\approx \\sigma^2 e^{-2\\pi f_c |\\tau|}',
        symbols: [
          { symbol: '\\alpha', meaning: `AR(1) filter pole = ${coloredNoiseAlphaX.toFixed(2)}` },
          { symbol: '\\sigma^2', meaning: `Target variance = ${(coloredNoiseSigmaX * coloredNoiseSigmaX).toFixed(2)} V²` },
          { symbol: 'R_{xx}(0)', meaning: `Measured power = ${correlationResult.zeroLagValue.toFixed(4)} ${correlationResult.units}` },
        ],
        interpretation: `Zero-lag value R(0) = ${correlationResult.zeroLagValue.toFixed(4)} ${correlationResult.units}. Smooth decay away from lag 0 reflects persistent sample-to-sample correlation.`,
      };
    }

    return {
      heading: 'Cross-Correlation Analysis (Dual Signals)',
      summary:
        'Cross-correlation R_xy(τ) computes the sliding inner product between reference signal x(t) and shifted target y(t - τ). The lag where R_xy(τ) attains its maximum identifies the relative time delay between waveforms.',
      formulaTex: isDiscrete
        ? 'r_{xy}[k] = \\sum_{n=-\\infty}^{\\infty} x[n] y[n - k]'
        : 'R_{xy}(\\tau) = \\int_{-\\infty}^{\\infty} x(t) y(t - \\tau)\\,dt',
      symbols: [
        { symbol: 'x, y', meaning: 'Reference and target signal channels' },
        {
          symbol: '\\tau_{\\text{peak}}',
          meaning: `Optimal alignment delay = ${correlationResult.peakLag.toFixed(2)} ${isDiscrete ? 'samples' : 's'}`,
        },
        {
          symbol: '\\rho(\\tau)',
          meaning: `Normalized correlation = ${correlationResult.currentNormalized.toFixed(4)}`,
        },
      ],
      interpretation: `At current lag, R_xy = ${correlationResult.currentR.toFixed(4)} ${correlationResult.units}. Global peak R_max = ${correlationResult.peakValue.toFixed(4)} occurs at ${isDiscrete ? `k = ${Math.round(correlationResult.peakLag)}` : `τ = ${correlationResult.peakLag.toFixed(2)} s`}.`,
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
    coloredNoiseSigmaX,
    coloredNoiseAlphaX,
    lag,
    isDiscrete,
  ]);

  // Reusable contextual sidebar content (used in main right-hand sidebar AND full-screen graph overlay)
  const renderControlsContent = (compactForOverlay = false) => (
    <div className="space-y-3.5">
      {/* Correlation Mode */}
      <section className="space-y-1.5">
        <div className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-[#75736E]">
          Correlation Mode
        </div>
        <div className="grid grid-cols-2 gap-1 bg-white p-0.5 rounded-md border border-[#E6E4DD]">
          <button
            type="button"
            onClick={() => setIsAutocorrelation(true)}
            className={`py-1.5 px-2 text-xs font-semibold rounded transition-colors cursor-pointer ${
              isAutocorrelation
                ? 'bg-[#C85A32] text-white shadow-xs'
                : 'text-[#585651] hover:text-[#1A1917]'
            }`}
          >
            Autocorrelation
          </button>
          <button
            type="button"
            onClick={() => setIsAutocorrelation(false)}
            className={`py-1.5 px-2 text-xs font-semibold rounded transition-colors cursor-pointer ${
              !isAutocorrelation
                ? 'bg-[#C85A32] text-white shadow-xs'
                : 'text-[#585651] hover:text-[#1A1917]'
            }`}
          >
            Cross-Corr
          </button>
        </div>
      </section>

      {/* Time Domain */}
      <section className="space-y-1.5 pt-3 border-t border-[#E6E4DD]">
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

      {/* Lag / Displacement Control */}
      <section className="space-y-1.5 pt-3 border-t border-[#E6E4DD]">
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-[#C85A32]">
            Lag Shift ({isDiscrete ? 'k' : 'τ'})
          </span>
          <span className="text-xs font-mono font-bold text-[#1A1917]">
            {isDiscrete
              ? `k = ${Math.round(lag)} smp`
              : `τ = ${lag >= 0 ? `+${lag.toFixed(2)}` : lag.toFixed(2)} s`}
          </span>
        </div>
        <div className="p-2.5 bg-[#FBF4F0] border border-[#C85A32]/25 rounded-md space-y-2">
          <input
            type="range"
            min={isDiscrete ? -20 : -3.0}
            max={isDiscrete ? 20 : 3.0}
            step={isDiscrete ? 1 : 0.05}
            value={lag}
            onChange={(e) => setLag(parseFloat(e.target.value))}
            className="w-full accent-[#C85A32] cursor-pointer"
          />
          <div className="grid grid-cols-3 gap-1">
            <button
              type="button"
              onClick={() =>
                setLag((prev) =>
                  Math.max(isDiscrete ? -20 : -3.0, Number((prev - (isDiscrete ? 1 : 0.1)).toFixed(2)))
                )
              }
              className="py-1 bg-white hover:bg-[#FAF9F6] border border-[#E6E4DD] rounded text-[11px] font-mono text-[#585651] hover:text-[#1A1917] cursor-pointer"
            >
              {isDiscrete ? '-1 smp' : '-0.1 s'}
            </button>
            <button
              type="button"
              onClick={() => setLag(0.0)}
              className="py-1 bg-white hover:bg-[#FAF9F6] border border-[#C85A32]/30 rounded text-[11px] font-mono font-semibold text-[#C85A32] cursor-pointer"
            >
              {isDiscrete ? 'k = 0' : 'τ = 0'}
            </button>
            <button
              type="button"
              onClick={() =>
                setLag((prev) =>
                  Math.min(isDiscrete ? 20 : 3.0, Number((prev + (isDiscrete ? 1 : 0.1)).toFixed(2)))
                )
              }
              className="py-1 bg-white hover:bg-[#FAF9F6] border border-[#E6E4DD] rounded text-[11px] font-mono text-[#585651] hover:text-[#1A1917] cursor-pointer"
            >
              {isDiscrete ? '+1 smp' : '+0.1 s'}
            </button>
          </div>
        </div>
      </section>

      {/* Signal Generator Selector & Parameters */}
      <section className="space-y-2.5 pt-3 border-t border-[#E6E4DD]">
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-[#75736E]">
            {isAutocorrelation ? 'Signal Generator' : 'Channel Generators'}
          </span>
          <span className="text-[10px] font-mono text-[#8A8882]">
            {(activeChannel === 'X' ? generatedX : generatedY).category === 'energy'
              ? 'Energy Signal'
              : 'Power Signal'}
          </span>
        </div>

        {/* Channel Switcher when Cross-Correlation is active */}
        {!isAutocorrelation && (
          <div className="grid grid-cols-2 gap-1 bg-white p-0.5 rounded-md border border-[#E6E4DD]">
            <button
              type="button"
              onClick={() => setActiveChannelTab('X')}
              className={`py-1 text-xs font-mono font-semibold rounded transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                activeChannelTab === 'X'
                  ? 'bg-[#1A1917] text-white'
                  : 'text-[#585651] hover:text-[#1A1917]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current" />
              <span>Signal X</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveChannelTab('Y')}
              className={`py-1 text-xs font-mono font-semibold rounded transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                activeChannelTab === 'Y'
                  ? 'bg-[#C85A32] text-white'
                  : 'text-[#585651] hover:text-[#1A1917]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-current" />
              <span>Signal Y</span>
            </button>
          </div>
        )}

        {/* Strict 4-Option Signal Selector */}
        <div className="grid grid-cols-2 gap-1 bg-white p-1 rounded-md border border-[#E6E4DD]">
          {SIGNAL_OPTIONS.map((opt) => {
            const currentType = activeChannel === 'X' ? signalTypeX : signalTypeY;
            const isSelected = currentType === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  (activeChannel === 'X' ? setSignalTypeX : setSignalTypeY)(opt.value)
                }
                className={`py-1.5 px-2 text-[11.5px] font-semibold rounded transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-[#FBF4F0] text-[#C85A32] border border-[#C85A32]/35 shadow-2xs'
                    : 'text-[#585651] hover:text-[#1A1917] hover:bg-[#FAF9F6] border border-transparent'
                }`}
              >
                {opt.shortLabel}
              </button>
            );
          })}
        </div>

        {/* Dynamic Sliders */}
        <div className="p-2.5 bg-white border border-[#E6E4DD] rounded-md">
          {renderChannelSliders(activeChannel)}
        </div>
      </section>

      {compactForOverlay && (
        <div className="pt-2 border-t border-[#E6E4DD]">
          <button
            type="button"
            onClick={handleReset}
            className="w-full py-1.5 px-3 rounded-md border border-[#E6E4DD] bg-white hover:bg-[#F3F2EC] text-xs font-mono text-[#585651] hover:text-[#1A1917] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Parameters</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
      {/* LEFT / CENTER VISUALIZATION CANVAS */}
      <main className="w-full lg:flex-1 min-w-0 min-h-0 flex flex-col p-3 gap-2.5 overflow-hidden bg-white">
        {/* Compact 4-Metric KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 shrink-0">
          <div className="px-3 py-2 bg-[#FAF9F6] border border-[#E6E4DD] rounded-md flex items-baseline justify-between gap-2">
            <span className="text-[10.5px] font-mono uppercase tracking-wide text-[#75736E] truncate">
              {isAutocorrelation
                ? isDiscrete
                  ? 'r_xx[0]'
                  : 'R_xx(0)'
                : isDiscrete
                ? 'r_xy[0]'
                : 'R_xy(0)'}
            </span>
            <span className="text-sm font-mono font-bold text-[#1A1917] shrink-0">
              {correlationResult.zeroLagValue.toFixed(4)}{' '}
              <span className="text-[10.5px] font-normal text-[#75736E]">
                {correlationResult.units}
              </span>
            </span>
          </div>

          <div className="px-3 py-2 bg-[#FBF4F0] border border-[#C85A32]/25 rounded-md flex items-baseline justify-between gap-2">
            <span className="text-[10.5px] font-mono uppercase tracking-wide text-[#C85A32] truncate">
              {isDiscrete ? `r[${Math.round(lag)}]` : `R(${lag.toFixed(2)}s)`}
            </span>
            <span className="text-sm font-mono font-bold text-[#C85A32] shrink-0">
              {correlationResult.currentR >= 0
                ? `+${correlationResult.currentR.toFixed(4)}`
                : correlationResult.currentR.toFixed(4)}{' '}
              <span className="text-[10.5px] font-normal text-[#75736E]">
                {correlationResult.units}
              </span>
            </span>
          </div>

          <div className="px-3 py-2 bg-[#FAF9F6] border border-[#E6E4DD] rounded-md flex items-baseline justify-between gap-2">
            <span className="text-[10.5px] font-mono uppercase tracking-wide text-[#75736E] truncate">
              Norm. ρ({isDiscrete ? 'k' : 'τ'})
            </span>
            <span className="text-sm font-mono font-bold text-[#1A1917] shrink-0">
              {correlationResult.currentNormalized >= 0
                ? `+${correlationResult.currentNormalized.toFixed(4)}`
                : correlationResult.currentNormalized.toFixed(4)}
            </span>
          </div>

          <div className="px-3 py-2 bg-[#FAF9F6] border border-[#E6E4DD] rounded-md flex items-baseline justify-between gap-2">
            <span className="text-[10.5px] font-mono uppercase tracking-wide text-[#75736E] truncate">
              {isAutocorrelation ? 'Convention' : 'Peak Lag'}
            </span>
            <span className="text-xs sm:text-sm font-mono font-bold text-[#1A1917] shrink-0">
              {isAutocorrelation
                ? correlationResult.convention === 'energy'
                  ? 'Energy (E)'
                  : 'Power (P)'
                : isDiscrete
                ? `k=${Math.round(correlationResult.peakLag)}`
                : `τ=${correlationResult.peakLag >= 0 ? '+' : ''}${correlationResult.peakLag.toFixed(2)}s`}
            </span>
          </div>
        </div>

        {/* Vertically Stacked Interactive Graph Cards */}
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-rows-2 gap-2.5">
          <SignalPlotCanvas
            title={
              isAutocorrelation
                ? `1. Signal Alignment: x${isDiscrete ? '[n]' : '(t)'} vs Shifted x${isDiscrete ? '[n - k]' : '(t - τ)'}`
                : `1. Signal Alignment: x${isDiscrete ? '[n]' : '(t)'} vs Shifted y${isDiscrete ? '[n - k]' : '(t - τ)'}`
            }
            subtitle={`Applied lag ${isDiscrete ? `k = ${Math.round(lag)} samples` : `τ = ${lag >= 0 ? `+${lag.toFixed(2)}` : lag.toFixed(2)} s`} · ${correlationResult.convention === 'energy' ? `E_x = ${generatedX.energy.toFixed(3)} V²·s` : `P_x = ${generatedX.power.toFixed(3)} V²`}`}
            xLabel={isDiscrete ? 'Sample Index n (samples)' : 'Time t (s)'}
            yLabel="Amplitude (V)"
            domain={domainX}
            range={signalPlotRange}
            isDiscrete={isDiscrete}
            height={190}
            className="h-full min-h-[220px] lg:min-h-0"
            expandedSidebar={renderControlsContent(true)}
            series={[
              {
                id: 'sig-orig',
                name: isAutocorrelation
                  ? `x${isDiscrete ? '[n]' : '(t)'}`
                  : `x${isDiscrete ? '[n]' : '(t)'}`,
                color: '#1A1917',
                strokeWidth: 1.9,
                strokeOpacity: 0.78,
                markerStyle: 'filled',
                points: pointsSignalX,
              },
              {
                id: 'sig-delayed',
                name: isAutocorrelation
                  ? `x${isDiscrete ? '[n-k]' : '(t-τ)'}`
                  : `y${isDiscrete ? '[n-k]' : '(t-τ)'}`,
                color: '#C85A32',
                strokeWidth: 2.3,
                dash: isDiscrete ? 'none' : '6 4',
                markerStyle: 'ring',
                points: pointsSignalDelayed,
              },
            ]}
          />

          <SignalPlotCanvas
            title={
              isAutocorrelation
                ? `2. Autocorrelation ${isDiscrete ? 'r_xx[k]' : 'R_xx(τ)'}`
                : `2. Cross-Correlation ${isDiscrete ? 'r_xy[k]' : 'R_xy(τ)'}`
            }
            subtitle={`Peak ${isDiscrete ? `k = ${Math.round(correlationResult.peakLag)}` : `τ = ${correlationResult.peakLag.toFixed(2)} s`} (R_max = ${correlationResult.peakValue.toFixed(4)} ${correlationResult.units})`}
            xLabel={isDiscrete ? 'Lag Index k (samples)' : 'Lag Parameter τ (s)'}
            yLabel={`${isAutocorrelation ? (isDiscrete ? 'r_xx[k]' : 'R_xx(τ)') : isDiscrete ? 'r_xy[k]' : 'R_xy(τ)'} (${correlationResult.units})`}
            domain={domainLag}
            range={corrPlotRange}
            isDiscrete={isDiscrete}
            height={190}
            className="h-full min-h-[220px] lg:min-h-0"
            expandedSidebar={renderControlsContent(true)}
            markers={[
              {
                x: 0,
                y: isAutocorrelation ? correlationResult.zeroLagValue : undefined,
                color: isAutocorrelation ? '#C85A32' : '#8A8882',
                style: 'dashed',
              },
              ...(Math.abs(lag) > (isDiscrete ? 0.5 : 0.02)
                ? [
                    {
                      x: lag,
                      y: correlationResult.currentR,
                      color: '#C85A32',
                      style: 'solid' as const,
                    },
                  ]
                : []),
            ]}
            series={[
              {
                id: 'corr-curve',
                name: isAutocorrelation
                  ? isDiscrete
                    ? 'r_xx[k]'
                    : 'R_xx(τ)'
                  : isDiscrete
                  ? 'r_xy[k]'
                  : 'R_xy(τ)',
                color: '#C85A32',
                strokeWidth: 2.2,
                points: pointsCorrelation,
              },
            ]}
          />
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
                Correlation Controls
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

      {/* THEORY & FORMULAS MODAL */}
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
                    Theory &amp; Analytical Formulation
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
                    {conceptualExplanation.heading}
                  </h4>
                  <p className="text-xs sm:text-[13px] text-[#484642] leading-relaxed">
                    {conceptualExplanation.summary}
                  </p>
                </div>

                <div className="p-3.5 bg-[#FAF9F6] rounded-md border border-[#E6E4DD]">
                  <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#75736E] mb-2">
                    Analytical Formula
                  </div>
                  <div className="p-2.5 bg-white rounded border border-[#E6E4DD]/80">
                    <MathView math={conceptualExplanation.formulaTex} displayMode={true} />
                  </div>
                </div>

                <div className="p-3.5 bg-[#FBF4F0]/60 rounded-md border border-[#C85A32]/20 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-[#1A1917]">
                    <Info className="w-3.5 h-3.5 text-[#C85A32]" />
                    <span>Live Result Interpretation</span>
                  </div>
                  <p className="text-xs text-[#585651] leading-relaxed">
                    {conceptualExplanation.interpretation}
                  </p>
                </div>

                <div className="divide-y divide-[#E6E4DD] rounded-md border border-[#E6E4DD] bg-white overflow-hidden text-xs">
                  {conceptualExplanation.symbols.map((sym, idx) => (
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

      {/* VERIFICATION SUITE MODAL */}
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
                    onClick={() => setValidationTab('stage2')}
                    className={`px-3 py-1 text-xs font-mono rounded cursor-pointer transition-colors ${
                      validationTab === 'stage2'
                        ? 'bg-[#1A1917] text-white font-bold'
                        : 'text-[#585651] hover:text-[#1A1917] bg-[#FAF9F6] border border-[#E6E4DD]'
                    }`}
                  >
                    Core Properties ({validationTests.length} Tests)
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
                            0{t.testNumber}. {t.title}
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
