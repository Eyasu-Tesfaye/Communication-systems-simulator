/**
 * Dedicated Continuous Fourier Transform (CTFT) Visualizer
 * - Clean, elementary signals with zero clutter
 * - Side-by-side layout:
 *   - Left: Elementary Signal in Time Domain x(t) (Unit Step, Ramp, Dirac Impulse, Cosine, Sine, Rect Gate)
 *   - Right: Live Frequency Transform X(f) with Dirac stems, continuous envelopes, and real-time probe
 * - Dynamic probe frequency tracking, real-time sweep, and time-frequency duality scaling
 * - Fullscreen mode:
 *   - Seamlessly driven by the top fullscreen playback controls (Play/Pause, Reset, Speed)
 *   - Redundant inner toolbar div is omitted
 *   - Analytical transform pair div is omitted in fullscreen, keeping ONLY the controls and the signals
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SlidersHorizontal,
  Scale,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import {
  TransformSignalType,
  CTFT_CATALOG,
  evaluateTransformTimeSignal,
  evaluateTransformSpectrum,
} from './fourierMath';

interface FourierTransformVisualizerProps {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  playbackState?: 'playing' | 'paused';
  onTogglePlayback?: () => void;
  speed?: string;
  onSpeedChange?: (s: string) => void;
  resetTrigger?: number;
}

export const FourierTransformVisualizer: React.FC<FourierTransformVisualizerProps> = ({
  isFullscreen = false,
  onToggleFullscreen,
  playbackState: controlledPlayback,
  onTogglePlayback,
  speed: controlledSpeed,
  onSpeedChange,
  resetTrigger,
}) => {
  // Elementary signal selection: unit_step, ramp, impulse, cosine, sine, rect_gate
  const [signalType, setSignalType] = useState<TransformSignalType>('unit_step');

  // Signal parameter: frequency f0 for sin/cos, tau for rect_gate, slope/scale for ramp/step/impulse
  const [paramValue, setParamValue] = useState<number>(1.0);

  // Live frequency probe
  const [fProbe, setFProbe] = useState<number>(1.0); // 0 to 5.0 Hz
  const [internalAutoSweep, setInternalAutoSweep] = useState<boolean>(true);
  const [internalSpeed, setInternalSpeed] = useState<string>('1×');

  // Synchronize with external props if provided
  const activeSpeed = controlledSpeed || internalSpeed;
  const isAutoSweeping = controlledPlayback ? controlledPlayback === 'playing' : internalAutoSweep;

  const toggleAutoSweep = () => {
    if (onTogglePlayback) {
      onTogglePlayback();
    } else {
      setInternalAutoSweep(!internalAutoSweep);
    }
  };

  const handleSpeedSelect = (s: string) => {
    if (onSpeedChange) {
      onSpeedChange(s);
    } else {
      setInternalSpeed(s);
    }
  };

  // Canvas / Animation refs
  const spectrumCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const sweepDirectionRef = useRef<number>(1);

  const meta = CTFT_CATALOG[signalType];

  // Adjust default parameter when signal type changes
  useEffect(() => {
    if (signalType === 'cosine' || signalType === 'sine') {
      setParamValue(1.2);
    } else if (signalType === 'rect_gate') {
      setParamValue(1.0);
    } else {
      setParamValue(1.0);
    }
  }, [signalType]);

  const lastResetRef = useRef<number | undefined>(resetTrigger);

  // Reset animation for the current signal (only on resetTrigger change, never on playback toggle)
  useEffect(() => {
    if (resetTrigger !== undefined && resetTrigger !== lastResetRef.current) {
      lastResetRef.current = resetTrigger;
      setFProbe(0.0);
      sweepDirectionRef.current = 1;
      if (controlledPlayback === undefined) {
        setInternalAutoSweep(false);
      }
    }
  }, [resetTrigger, controlledPlayback]);

  // Parameter config based on active signal
  const paramConfig = useMemo(() => {
    switch (signalType) {
      case 'cosine':
      case 'sine':
        return {
          label: 'Oscillation Frequency (f₀)',
          unit: 'Hz',
          min: 0.5,
          max: 4.0,
          step: 0.1,
          leftDesc: '0.5 Hz (Slow wave → Low freq spike)',
          rightDesc: '4.0 Hz (Fast wave → High freq spike)',
        };
      case 'rect_gate':
        return {
          label: 'Gate Duration (τ)',
          unit: 's',
          min: 0.2,
          max: 2.5,
          step: 0.05,
          leftDesc: '0.2s (Narrow gate → Wide sinc lobe)',
          rightDesc: '2.5s (Wide gate → Sharp sinc spike)',
        };
      case 'ramp':
        return {
          label: 'Ramp Time Scale (s)',
          unit: 's',
          min: 0.5,
          max: 2.5,
          step: 0.1,
          leftDesc: '0.5s (Steep slope)',
          rightDesc: '2.5s (Gentle slope)',
        };
      case 'unit_step':
        return {
          label: 'Step Amplitude (A)',
          unit: '',
          min: 0.5,
          max: 2.0,
          step: 0.1,
          leftDesc: '0.5 (Small step)',
          rightDesc: '2.0 (Tall step)',
        };
      case 'impulse':
        return {
          label: 'Impulse Area / Strength (A)',
          unit: '',
          min: 0.5,
          max: 2.0,
          step: 0.1,
          leftDesc: '0.5 (Half area)',
          rightDesc: '2.0 (Double area)',
        };
      default:
        return {
          label: 'Parameter (α)',
          unit: '',
          min: 0.2,
          max: 2.5,
          step: 0.05,
          leftDesc: 'Min',
          rightDesc: 'Max',
        };
    }
  }, [signalType]);

  // Time-domain signal points
  const timePoints = useMemo(() => {
    return evaluateTransformTimeSignal(signalType, paramValue, 3.5, 300);
  }, [signalType, paramValue]);

  // Frequency-domain continuous spectrum points (0 to 5.5 Hz)
  const spectrumPoints = useMemo(() => {
    return evaluateTransformSpectrum(signalType, paramValue, 5.5, 360);
  }, [signalType, paramValue]);

  // Evaluate probe magnitude
  const probeMag = useMemo(() => {
    if (signalType === 'impulse') {
      return paramValue * 1.0;
    }
    if (signalType === 'cosine' || signalType === 'sine') {
      const f0 = paramValue;
      if (Math.abs(fProbe - f0) < 0.12) {
        return 1.35; // Dirac delta peak
      }
      return 0.0;
    }
    if (signalType === 'unit_step') {
      if (fProbe < 0.08) return 1.35; // DC impulse
      return Math.min(1.35, paramValue / (2 * Math.PI * fProbe));
    }
    if (signalType === 'ramp') {
      if (fProbe < 0.1) return 1.35;
      return Math.min(1.35, 1 / (4 * Math.PI * Math.PI * fProbe * fProbe));
    }
    if (signalType === 'rect_gate') {
      const arg = Math.PI * fProbe * paramValue;
      const sinc = Math.abs(arg) < 1e-6 ? 1.0 : Math.sin(arg) / arg;
      return Math.abs(paramValue * sinc);
    }
    return 0.0;
  }, [signalType, paramValue, fProbe]);

  // Animation Loop for live auto-sweep & time flow
  useEffect(() => {
    const speedMult =
      activeSpeed === '0.25×'
        ? 0.25
        : activeSpeed === '0.5×'
        ? 0.5
        : activeSpeed === '2×'
        ? 2.0
        : activeSpeed === '4×'
        ? 4.0
        : 1.0;

    const loop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const dt = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;

      if (isAutoSweeping) {
        setFProbe((prev) => {
          let next = prev + dt * 0.65 * speedMult * sweepDirectionRef.current;
          if (next >= 4.8) {
            next = 4.8;
            sweepDirectionRef.current = -1;
          } else if (next <= 0.0) {
            next = 0.0;
            sweepDirectionRef.current = 1;
          }
          return Math.round(next * 100) / 100;
        });
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isAutoSweeping, activeSpeed]);

  // Scrub frequency on spectrum canvas
  const handleSpectrumScrub = (clientX: number) => {
    const canvas = spectrumCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const padL = 38;
    const padR = 20;
    const innerW = rect.width - padL - padR;

    const clampedX = Math.max(0, Math.min(innerW, x - padL));
    const targetF = (clampedX / innerW) * 5.0;

    if (controlledPlayback && onTogglePlayback && controlledPlayback === 'playing') {
      onTogglePlayback();
    } else {
      setInternalAutoSweep(false);
    }
    setFProbe(Math.round(targetF * 100) / 100);
  };

  // Draw Live Frequency Transform Canvas
  const drawSpectrum = useCallback(() => {
    const canvas = spectrumCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 420;
    const height = rect.height || (isFullscreen ? 360 : 220);

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const padL = 38;
    const padR = 20;
    const padT = 24;
    const padB = 28;
    const innerW = width - padL - padR;
    const innerH = height - padT - padB;
    const maxF = 5.0;
    const maxMagDisplay = 1.4;

    // Grid guide lines
    ctx.strokeStyle = '#F4F2EC';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    for (let f = 1; f <= 5; f++) {
      const x = padL + (f / maxF) * innerW;
      ctx.beginPath();
      ctx.moveTo(x, padT);
      ctx.lineTo(x, padT + innerH);
      ctx.stroke();
    }

    for (let m = 0.5; m <= 1.2; m += 0.5) {
      const y = padT + innerH - (m / maxMagDisplay) * innerH;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(padL + innerW, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Axes
    ctx.strokeStyle = '#8A8882';
    ctx.lineWidth = 1.25;

    // Horizontal axis (f = 0 to 5)
    ctx.beginPath();
    ctx.moveTo(padL, padT + innerH);
    ctx.lineTo(padL + innerW + 10, padT + innerH);
    ctx.stroke();

    // Vertical axis (|X(f)|)
    ctx.beginPath();
    ctx.moveTo(padL, padT - 5);
    ctx.lineTo(padL, padT + innerH);
    ctx.stroke();

    // Ticks & Labels
    ctx.font = '600 9px "JetBrains Mono", monospace';
    ctx.fillStyle = '#8A8882';
    ctx.textAlign = 'right';
    ctx.fillText('1.0', padL - 6, padT + innerH - (1.0 / maxMagDisplay) * innerH + 3);
    ctx.fillText('0.0', padL - 6, padT + innerH + 3);

    ctx.textAlign = 'center';
    for (let f = 0; f <= 5; f++) {
      const x = padL + (f / maxF) * innerW;
      ctx.fillText(`${f}Hz`, x, padT + innerH + 16);
    }

    ctx.fillStyle = '#1A1917';
    ctx.font = '700 10px "JetBrains Mono", monospace';
    ctx.fillText('f', padL + innerW + 16, padT + innerH + 3);
    ctx.fillText('|X(f)|', padL - 6, padT - 8);

    // Render Transforms based on Elementary Signal
    if (signalType === 'impulse') {
      // Dirac Impulse -> Constant Flat Line across all frequencies
      const flatY = padT + innerH - (paramValue / maxMagDisplay) * innerH;

      ctx.fillStyle = 'rgba(200, 90, 50, 0.08)';
      ctx.fillRect(padL, flatY, innerW, padT + innerH - flatY);

      ctx.beginPath();
      ctx.moveTo(padL, flatY);
      ctx.lineTo(padL + innerW, flatY);
      ctx.strokeStyle = '#C85A32';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = '#C85A32';
      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`X(f) = ${paramValue.toFixed(1)} (White Spectrum - Constant All Frequencies)`, padL + 12, flatY - 8);
    } else if (signalType === 'cosine' || signalType === 'sine') {
      // Sinusoids -> Dirac Impulse Spike at f = f0
      const f0 = paramValue;
      if (f0 <= maxF) {
        const spikeX = padL + (f0 / maxF) * innerW;
        const spikeTopY = padT + 12;
        const baseZeroY = padT + innerH;

        ctx.beginPath();
        ctx.moveTo(spikeX, baseZeroY);
        ctx.lineTo(spikeX, spikeTopY);
        ctx.strokeStyle = '#C85A32';
        ctx.lineWidth = 3.0;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(spikeX, spikeTopY - 4);
        ctx.lineTo(spikeX - 5, spikeTopY + 7);
        ctx.lineTo(spikeX + 5, spikeTopY + 7);
        ctx.closePath();
        ctx.fillStyle = '#C85A32';
        ctx.fill();

        ctx.font = '700 9px "JetBrains Mono", monospace';
        ctx.fillStyle = '#C85A32';
        ctx.textAlign = 'center';
        const labelText =
          signalType === 'cosine'
            ? `½ δ(f - ${f0.toFixed(1)}Hz)`
            : `½j δ(f - ${f0.toFixed(1)}Hz)`;
        ctx.fillText(labelText, spikeX, spikeTopY - 8);
      }
    } else if (signalType === 'unit_step') {
      // Unit Step -> DC Dirac Spike at f=0 + 1/(2*pi*f) Hyperbolic Decay
      const spikeX = padL;
      const spikeTopY = padT + 8;
      const baseZeroY = padT + innerH;

      ctx.beginPath();
      ctx.moveTo(spikeX, baseZeroY);
      ctx.lineTo(spikeX, spikeTopY);
      ctx.strokeStyle = '#C85A32';
      ctx.lineWidth = 3.0;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(spikeX, spikeTopY - 4);
      ctx.lineTo(spikeX - 4, spikeTopY + 6);
      ctx.lineTo(spikeX + 4, spikeTopY + 6);
      ctx.closePath();
      ctx.fillStyle = '#C85A32';
      ctx.fill();

      ctx.font = '700 9px "JetBrains Mono", monospace';
      ctx.fillStyle = '#C85A32';
      ctx.textAlign = 'left';
      ctx.fillText('½ δ(f) [DC]', spikeX + 6, spikeTopY + 4);

      ctx.beginPath();
      let started = false;
      for (let fi = 0.08; fi <= maxF; fi += 0.04) {
        const x = padL + (fi / maxF) * innerW;
        const mag = Math.min(1.3, paramValue / (2 * Math.PI * fi));
        const y = padT + innerH - (mag / maxMagDisplay) * innerH;
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.strokeStyle = '#C85A32';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.lineTo(padL + innerW, padT + innerH);
      ctx.lineTo(padL + (0.08 / maxF) * innerW, padT + innerH);
      ctx.closePath();
      ctx.fillStyle = 'rgba(200, 90, 50, 0.08)';
      ctx.fill();
    } else if (signalType === 'ramp') {
      // Ramp -> Steep 1/(4*pi^2*f^2) roll-off + DC dipole
      const spikeX = padL;
      const spikeTopY = padT + 10;
      ctx.beginPath();
      ctx.moveTo(spikeX, padT + innerH);
      ctx.lineTo(spikeX, spikeTopY);
      ctx.strokeStyle = '#C85A32';
      ctx.lineWidth = 3.0;
      ctx.stroke();

      ctx.beginPath();
      let started = false;
      for (let fi = 0.1; fi <= maxF; fi += 0.04) {
        const x = padL + (fi / maxF) * innerW;
        const mag = Math.min(1.3, 1 / (4 * Math.PI * Math.PI * fi * fi));
        const y = padT + innerH - (mag / maxMagDisplay) * innerH;
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.strokeStyle = '#C85A32';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.lineTo(padL + innerW, padT + innerH);
      ctx.lineTo(padL + (0.1 / maxF) * innerW, padT + innerH);
      ctx.closePath();
      ctx.fillStyle = 'rgba(200, 90, 50, 0.08)';
      ctx.fill();
    } else if (signalType === 'rect_gate') {
      // Rect Gate -> Continuous Sinc Envelope
      ctx.beginPath();
      let started = false;
      for (let fi = 0.0; fi <= maxF; fi += 0.02) {
        const x = padL + (fi / maxF) * innerW;
        const arg = Math.PI * fi * paramValue;
        const sinc = Math.abs(arg) < 1e-6 ? 1.0 : Math.sin(arg) / arg;
        const mag = Math.abs(paramValue * sinc);
        const y = padT + innerH - (mag / maxMagDisplay) * innerH;
        if (!started) {
          ctx.moveTo(x, y);
          started = true;
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.strokeStyle = '#C85A32';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.lineTo(padL + innerW, padT + innerH);
      ctx.lineTo(padL, padT + innerH);
      ctx.closePath();
      ctx.fillStyle = 'rgba(200, 90, 50, 0.08)';
      ctx.fill();

      // First Sinc Null indicator
      const nullF = 1 / paramValue;
      if (nullF <= maxF) {
        const nullX = padL + (nullF / maxF) * innerW;
        ctx.beginPath();
        ctx.arc(nullX, padT + innerH, 3, 0, 2 * Math.PI);
        ctx.fillStyle = '#1A1917';
        ctx.fill();
        ctx.font = '600 8px "JetBrains Mono", monospace';
        ctx.fillText(`1/τ = ${nullF.toFixed(1)}Hz`, nullX, padT + innerH - 7);
      }
    }

    // Live Probe Marker (fProbe)
    const probeX = padL + (fProbe / maxF) * innerW;
    const probeY = padT + innerH - (Math.min(maxMagDisplay, probeMag) / maxMagDisplay) * innerH;

    // Vertical dashed marker line
    ctx.beginPath();
    ctx.moveTo(probeX, padT);
    ctx.lineTo(probeX, padT + innerH);
    ctx.strokeStyle = '#1A1917';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 2]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Glowing dot on envelope/stem
    ctx.beginPath();
    ctx.arc(probeX, probeY, 6, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(200, 90, 50, 0.25)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(probeX, probeY, 3.5, 0, 2 * Math.PI);
    ctx.fillStyle = '#C85A32';
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Probe readout badge
    ctx.textAlign = 'left';
    ctx.font = '700 9px "JetBrains Mono", monospace';
    ctx.fillStyle = '#1A1917';
    const tagX = Math.min(width - 120, Math.max(padL + 4, probeX - 35));
    ctx.fillText(`Probe: ${fProbe.toFixed(2)} Hz`, tagX, padT + 8);
  }, [signalType, paramValue, fProbe, probeMag, isFullscreen]);

  useEffect(() => {
    drawSpectrum();
  }, [drawSpectrum]);

  // Clean Time Domain SVG Path
  const timeSvg = useMemo(() => {
    const padL = 38;
    const padR = 20;
    const padT = 24;
    const padB = 28;
    const width = 420;
    const height = isFullscreen ? 360 : 180;
    const innerW = width - padL - padR;
    const innerH = height - padT - padB;
    const tMin = -3.5;
    const tMax = 3.5;
    const yZero = padT + innerH / 2;
    const yMaxVal = 1.5;

    const mapX = (t: number) => padL + ((t - tMin) / (tMax - tMin)) * innerW;
    const mapY = (y: number) => yZero - (y / yMaxVal) * (innerH / 2);

    const pathD = timePoints.reduce((acc, pt, i) => {
      const x = mapX(pt.t);
      const y = mapY(pt.y);
      return (i === 0 ? 'M ' : `${acc} L `) + `${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');

    return {
      width,
      height,
      padL,
      padR,
      padT,
      padB,
      innerW,
      innerH,
      yZero,
      mapX,
      mapY,
      pathD,
    };
  }, [timePoints, isFullscreen]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start h-full">
      {/* Left Column: Side-by-Side Clean Laboratory Cards (8 Columns) */}
      <div className="lg:col-span-8 flex flex-col gap-4 h-full">
        {/* Simulation Toolbar Header (Shown ONLY when NOT in fullscreen, since fullscreen already has top header controls) */}
        {!isFullscreen && (
          <div className="bg-white rounded-lg border border-[#E6E4DD] p-3.5 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C85A32]" />
              <span className="text-xs font-bold tracking-tight text-[#1A1917] uppercase font-mono">
                CONTINUOUS FOURIER TRANSFORM (CTFT)
              </span>
              <span className="text-[11px] font-mono text-[#C85A32] bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/25 font-bold">
                {meta.name.toUpperCase()}
              </span>
            </div>

            {/* Sweep & Speed Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleAutoSweep}
                className={`px-3 py-1.5 rounded text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs border ${
                  isAutoSweeping
                    ? 'bg-[#1A1917] text-white border-[#1A1917]'
                    : 'bg-[#FAF9F6] border-[#E6E4DD] text-[#585651] hover:text-[#1A1917]'
                }`}
                title={isAutoSweeping ? 'Pause frequency sweep' : 'Auto-sweep frequency'}
              >
                {isAutoSweeping ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{isAutoSweeping ? 'Pause Sweep' : 'Auto-Sweep'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (controlledPlayback && onTogglePlayback && controlledPlayback === 'playing') {
                    onTogglePlayback();
                  } else {
                    setInternalAutoSweep(false);
                  }
                  setFProbe(0);
                }}
                className="p-1.5 bg-white border border-[#E6E4DD] rounded text-[#585651] hover:text-[#1A1917] transition-colors shadow-2xs cursor-pointer"
                title="Reset frequency probe to DC (0 Hz)"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* Speed Multiplier */}
              <div className="flex items-center gap-0.5 bg-[#FAF9F6] border border-[#E6E4DD] rounded p-0.5 text-xs font-mono">
                {['0.5×', '1×', '2×'].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSpeedSelect(s)}
                    className={`px-1.5 py-0.5 text-[10px] rounded transition-colors cursor-pointer ${
                      activeSpeed === s
                        ? 'bg-[#1A1917] text-white font-bold'
                        : 'text-[#65635E] hover:text-[#1A1917]'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              {/* Fullscreen Toggle */}
              {onToggleFullscreen && (
                <button
                  type="button"
                  onClick={onToggleFullscreen}
                  className="p-1.5 bg-white border border-[#E6E4DD] rounded text-[#585651] hover:text-[#1A1917] transition-colors shadow-2xs cursor-pointer ml-1"
                  title="Enter Fullscreen"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Side-by-Side Clean Layout: Time Domain Left, Frequency Transform Right */}
        <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${isFullscreen ? 'flex-1' : ''}`}>
          {/* 1. Time-Domain Signal Card */}
          <div className="bg-white rounded-lg border border-[#E6E4DD] p-4 sm:p-5 shadow-xs flex flex-col h-full">
            <div className="flex items-center justify-between text-xs font-mono mb-2 pb-2 border-b border-[#E6E4DD]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                <span className="font-bold text-[#1A1917]">Time Domain Signal x(t)</span>
              </div>
              <span className="text-[#2563EB] font-semibold text-xs font-mono">
                {signalType === 'cosine' || signalType === 'sine'
                  ? `f₀ = ${paramValue.toFixed(1)} Hz`
                  : signalType === 'rect_gate'
                  ? `τ = ${paramValue.toFixed(2)} s`
                  : `Param = ${paramValue.toFixed(2)}`}
              </span>
            </div>

            <div className={`w-full relative flex items-center justify-center bg-[#FAF9F6] rounded-md border border-[#E6E4DD] p-2 select-none ${
              isFullscreen ? 'flex-1 min-h-[340px]' : 'h-52 sm:h-56'
            }`}>
              <svg viewBox={`0 0 ${timeSvg.width} ${timeSvg.height}`} className="w-full h-full">
                {/* Horizontal Zero Axis t */}
                <line
                  x1={timeSvg.padL}
                  y1={timeSvg.yZero}
                  x2={timeSvg.padL + timeSvg.innerW + 10}
                  y2={timeSvg.yZero}
                  stroke="#8A8882"
                  strokeWidth="1.25"
                />

                {/* Vertical Center Axis t=0 */}
                <line
                  x1={timeSvg.mapX(0)}
                  y1={timeSvg.padT - 5}
                  x2={timeSvg.mapX(0)}
                  y2={timeSvg.padT + timeSvg.innerH}
                  stroke="#8A8882"
                  strokeWidth="1.25"
                />

                {/* Grid guidelines */}
                {[-2, -1, 1, 2].map((t) => (
                  <line
                    key={t}
                    x1={timeSvg.mapX(t)}
                    y1={timeSvg.padT}
                    x2={timeSvg.mapX(t)}
                    y2={timeSvg.padT + timeSvg.innerH}
                    stroke="#F4F2EC"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                ))}

                {/* Time Axis Ticks */}
                {[-3, -2, -1, 1, 2, 3].map((t) => (
                  <text
                    key={t}
                    x={timeSvg.mapX(t)}
                    y={timeSvg.yZero + 14}
                    textAnchor="middle"
                    className="text-[9px] font-mono fill-[#8A8882]"
                  >
                    {t}s
                  </text>
                ))}
                <text
                  x={timeSvg.mapX(0) - 8}
                  y={timeSvg.yZero + 14}
                  textAnchor="middle"
                  className="text-[9px] font-mono fill-[#8A8882]"
                >
                  0
                </text>
                <text
                  x={timeSvg.padL + timeSvg.innerW + 16}
                  y={timeSvg.yZero + 3}
                  className="text-[10px] font-mono font-bold fill-[#1A1917]"
                >
                  t
                </text>
                <text
                  x={timeSvg.mapX(0) - 8}
                  y={timeSvg.padT - 6}
                  className="text-[10px] font-mono font-bold fill-[#2563EB]"
                >
                  x(t)
                </text>

                {/* Signal Drawing */}
                {signalType === 'impulse' ? (
                  <g>
                    <line
                      x1={timeSvg.mapX(0)}
                      y1={timeSvg.yZero}
                      x2={timeSvg.mapX(0)}
                      y2={timeSvg.mapY(1.35 * paramValue)}
                      stroke="#2563EB"
                      strokeWidth="3"
                    />
                    <polygon
                      points={`${timeSvg.mapX(0)},${timeSvg.mapY(1.35 * paramValue) - 5} ${timeSvg.mapX(0) - 5},${timeSvg.mapY(1.35 * paramValue) + 6} ${timeSvg.mapX(0) + 5},${timeSvg.mapY(1.35 * paramValue) + 6}`}
                      fill="#2563EB"
                    />
                    <text
                      x={timeSvg.mapX(0) + 8}
                      y={timeSvg.mapY(1.35 * paramValue) + 4}
                      className="text-[10px] font-mono font-bold fill-[#2563EB]"
                    >
                      {paramValue.toFixed(1)} · δ(t)
                    </text>
                  </g>
                ) : signalType === 'unit_step' ? (
                  <g>
                    <line
                      x1={timeSvg.mapX(-3.5)}
                      y1={timeSvg.yZero}
                      x2={timeSvg.mapX(0)}
                      y2={timeSvg.yZero}
                      stroke="#2563EB"
                      strokeWidth="2.5"
                    />
                    <circle
                      cx={timeSvg.mapX(0)}
                      cy={timeSvg.yZero}
                      r="3"
                      fill="#FAF9F6"
                      stroke="#2563EB"
                      strokeWidth="1.5"
                    />
                    <circle
                      cx={timeSvg.mapX(0)}
                      cy={timeSvg.mapY(paramValue)}
                      r="3"
                      fill="#2563EB"
                    />
                    <line
                      x1={timeSvg.mapX(0)}
                      y1={timeSvg.mapY(paramValue)}
                      x2={timeSvg.mapX(3.5)}
                      y2={timeSvg.mapY(paramValue)}
                      stroke="#2563EB"
                      strokeWidth="2.5"
                    />
                    <line
                      x1={timeSvg.mapX(0)}
                      y1={timeSvg.yZero}
                      x2={timeSvg.mapX(0)}
                      y2={timeSvg.mapY(paramValue)}
                      stroke="#2563EB"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                    />
                  </g>
                ) : (
                  <path
                    d={timeSvg.pathD}
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}
              </svg>
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#75736E] font-mono pt-2 border-t border-[#F0EFEA] mt-auto">
              <span>Time domain signal</span>
              <span className="text-[#2563EB] font-semibold">— x(t)</span>
            </div>
          </div>

          {/* 2. Frequency-Domain Live Transform Card */}
          <div className="bg-white rounded-lg border border-[#E6E4DD] p-4 sm:p-5 shadow-xs flex flex-col h-full">
            <div className="flex items-center justify-between text-xs font-mono mb-2 pb-2 border-b border-[#E6E4DD]">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#C85A32]" />
                <span className="font-bold text-[#1A1917]">Live Transform X(f)</span>
              </div>
              <span className="text-[#C85A32] font-semibold text-xs font-mono">
                |X({fProbe.toFixed(2)}Hz)| = {probeMag.toFixed(2)}
              </span>
            </div>

            <div
              className={`w-full relative flex items-center justify-center bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden select-none cursor-ew-resize ${
                isFullscreen ? 'flex-1 min-h-[340px]' : 'h-52 sm:h-56'
              }`}
              onMouseDown={(e) => handleSpectrumScrub(e.clientX)}
              onMouseMove={(e) => {
                if (e.buttons === 1) handleSpectrumScrub(e.clientX);
              }}
              onTouchMove={(e) => {
                if (e.touches.length > 0) handleSpectrumScrub(e.touches[0].clientX);
              }}
            >
              <canvas ref={spectrumCanvasRef} className="w-full h-full block" />
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#75736E] font-mono pt-2 border-t border-[#F0EFEA] mt-auto">
              <span>Scrub to inspect frequency</span>
              <span className="text-[#C85A32] font-semibold">— |X(f)| Transform</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Ergonomic Eye-Level Interactive Controls (4 Columns) */}
      <div className="lg:col-span-4">
        <div className="sticky top-4 space-y-4">
          <div className="bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E6E4DD]">
              <span className="text-xs font-mono uppercase tracking-wider text-[#1A1917] font-bold flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#C85A32]" />
                <span>Signal Controls</span>
              </span>
              <span className="text-[10px] font-mono text-[#75736E] bg-[#FAF9F6] px-2 py-0.5 rounded border border-[#E6E4DD] font-medium">
                Foundational
              </span>
            </div>

            {/* Elementary Signals Selector */}
            <div>
              <label className="block text-xs font-semibold text-[#1A1917] mb-1.5">
                Target Elementary Signal
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
                {[
                  { id: 'unit_step', label: 'Unit Step', sub: 'u(t)' },
                  { id: 'ramp', label: 'Ramp', sub: 'r(t) = t·u(t)' },
                  { id: 'impulse', label: 'Dirac Delta', sub: 'δ(t)' },
                  { id: 'cosine', label: 'Cosine', sub: 'cos(2π f₀ t)' },
                  { id: 'sine', label: 'Sine', sub: 'sin(2π f₀ t)' },
                  { id: 'rect_gate', label: 'Rect Gate', sub: 'Π(t/τ)' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSignalType(item.id as TransformSignalType)}
                    className={`p-2 rounded-md border text-left transition-all cursor-pointer ${
                      signalType === item.id
                        ? 'bg-[#FBF4F0] border-[#C85A32] text-[#C85A32] shadow-2xs font-bold ring-1 ring-[#C85A32]'
                        : 'bg-[#FAF9F6] border-[#E6E4DD] hover:bg-white text-[#585651] hover:text-[#1A1917]'
                    }`}
                  >
                    <div className="text-xs font-bold">{item.label}</div>
                    <div className="text-[10px] text-[#75736E] mt-0.5">{item.sub}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Parameter Slider */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-[#1A1917]">{paramConfig.label}</span>
                <span className="font-mono text-[#C85A32] font-bold">
                  {paramValue.toFixed(2)} {paramConfig.unit}
                </span>
              </div>
              <input
                type="range"
                min={paramConfig.min}
                max={paramConfig.max}
                step={paramConfig.step}
                value={paramValue}
                onChange={(e) => setParamValue(parseFloat(e.target.value))}
                className="w-full accent-[#C85A32] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
                <span>{paramConfig.leftDesc}</span>
                <span>{paramConfig.rightDesc}</span>
              </div>
            </div>

            {/* Live Frequency Probe Slider */}
            <div className="pt-2 border-t border-[#E6E4DD]/80">
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-[#1A1917]">Probe Frequency (f)</span>
                <span className="font-mono text-[#1A1917] font-bold">
                  {fProbe.toFixed(2)} Hz
                </span>
              </div>
              <input
                type="range"
                min="0.0"
                max="4.8"
                step="0.05"
                value={fProbe}
                onChange={(e) => {
                  if (controlledPlayback && onTogglePlayback && controlledPlayback === 'playing') {
                    onTogglePlayback();
                  } else {
                    setInternalAutoSweep(false);
                  }
                  setFProbe(parseFloat(e.target.value));
                }}
                className="w-full accent-[#1A1917] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
                <span>0 Hz (DC)</span>
                <span>4.8 Hz</span>
              </div>
            </div>
          </div>

          {/* Duality & Transform Pair Insight Card: Shown ONLY in standard view, omitted in Fullscreen per user request */}
          {!isFullscreen && (
            <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-5 shadow-xs space-y-3">
              <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] flex items-center gap-1.5 font-semibold">
                <Scale className="w-3.5 h-3.5 text-[#C85A32]" />
                <span>Analytical Transform Pair</span>
              </div>

              <div className="p-2.5 bg-white rounded border border-[#E6E4DD] space-y-1.5">
                <div className="text-[11px] font-mono font-bold text-[#1A1917]">
                  {meta.name}
                </div>
                <div className="font-mono text-[11px] text-[#2563EB] bg-[#FAF9F6] p-1.5 rounded border border-[#E6E4DD]">
                  {meta.formulaT}
                </div>
                <div className="font-mono text-[11px] text-[#C85A32] bg-[#FBF4F0] p-1.5 rounded border border-[#C85A32]/25 font-bold">
                  {meta.formulaF}
                </div>
              </div>

              <div className="p-2.5 bg-white rounded border border-[#E6E4DD] text-xs text-[#585651] leading-relaxed">
                <strong className="text-[#1A1917] block mb-0.5">Physical Interpretation</strong>
                {meta.desc}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
