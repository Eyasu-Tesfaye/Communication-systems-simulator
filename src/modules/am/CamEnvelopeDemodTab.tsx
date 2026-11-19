import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  SlidersHorizontal,
  BookOpen,
  Info,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Cpu,
  Gauge,
} from 'lucide-react';
import { MathView } from '../../components/MathView';

export type DemodControllerPos = 'below' | 'top' | 'left' | 'right';

export interface CamEnvelopeDemodTabProps {
  modIndex: number;
  setModIndex: (val: number) => void;
  carrierFreq: number; // kHz
  messageFreq: number; // kHz
  setMessageFreq: (val: number) => void;
  carrierAmp: number; // Volts
  isPlaying: boolean;
  setIsPlaying: (val: boolean) => void;
  speed: string;
  setSpeed: (val: string) => void;
  time: number;
  controllerPos: DemodControllerPos;
  onResetCoreParams: () => void;
}

interface DemodSimulationPoint {
  t: number; // seconds relative to window start
  s: number; // incoming AM wave s(t)
  vRect: number; // half-wave rectified diode output max(0, s(t))
  vOut: number; // RC capacitor smoothed output v_out(t)
  envIdeal: number; // Ac * (1 + mu * cos(2*pi*fm*t)) — ideal baseband reference
  forwardBiased: boolean; // diode conduction state at this instant
}

type RecoveryStatusKind = 'overmod' | 'ripple' | 'diagonal' | 'optimal';

export const CamEnvelopeDemodTab: React.FC<CamEnvelopeDemodTabProps> = ({
  modIndex,
  setModIndex,
  carrierFreq,
  messageFreq,
  setMessageFreq,
  carrierAmp,
  isPlaying,
  setIsPlaying,
  speed,
  setSpeed,
  time,
  controllerPos,
  onResetCoreParams,
}) => {
  // Local Demodulation Parameters
  const [rcUs, setRcUs] = useState<number>(50.0); // RC time constant in microseconds (1.0 - 500.0)

  // Oscilloscope Trace Toggles
  const [showAmWave, setShowAmWave] = useState<boolean>(true);
  const [showRectified, setShowRectified] = useState<boolean>(true);
  const [showRcOutput, setShowRcOutput] = useState<boolean>(true);
  const [showBasebandRef, setShowBasebandRef] = useState<boolean>(true);

  // Interactive hover probe position (0..1 across scope window; null = auto-tracking live probe)
  const [hoverFrac, setHoverFrac] = useState<number | null>(null);

  const scopeCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Design Inequality Calculations (all in microseconds)
  const fcHz = carrierFreq * 1000;
  const fmHz = Math.max(0.1, messageFreq) * 1000;
  const tauCUs = 1e6 / (2 * Math.PI * fcHz); // 1 / omega_c in us
  const tauMUs = 1e6 / (2 * Math.PI * fmHz); // 1 / omega_m in us
  const carrierPeriodUs = 1e6 / fcHz; // T_c = 1 / fc in us

  // Exact diagonal clipping upper bound for single-tone AM: RC_max = sqrt(1 - mu^2) / (omega_m * mu)
  const diagClipLimitUs =
    modIndex > 0.02 && modIndex < 1.0
      ? (Math.sqrt(1 - modIndex * modIndex) / (2 * Math.PI * fmHz * modIndex)) * 1e6
      : tauMUs;

  // Threshold for noticeable carrier ripple: RC < ~10 carrier cycles (~63 / omega_c)
  const rippleThresholdUs = 10 * carrierPeriodUs;

  // Classify recovery status
  const statusInfo = useMemo<{
    kind: RecoveryStatusKind;
    badge: string;
    detail: string;
  }>(() => {
    if (modIndex > 1.0) {
      return {
        kind: 'overmod',
        badge: 'Overmodulation Failure (μ > 1 — Envelope Inversion)',
        detail:
          'Because 1 + μ·m(t) drops below zero, the carrier reverses phase by 180°. A non-coherent diode only detects |1 + μ·m(t)|, folding negative troughs upward into severe distortion.',
      };
    }
    if (rcUs < rippleThresholdUs) {
      return {
        kind: 'ripple',
        badge: 'High Carrier Ripple (RC too close to 1/ωc)',
        detail:
          'The capacitor discharges too rapidly between successive RF carrier peaks, leaving high-frequency sawtooth ripple superimposed on the recovered audio waveform.',
      };
    }
    if (rcUs > diagClipLimitUs || rcUs > 0.85 * tauMUs) {
      return {
        kind: 'diagonal',
        badge: 'Diagonal Clipping Distortion (RC too close to 1/ωm)',
        detail:
          'The RC decay rate is slower than the downward slope of the message envelope. The diode stays reverse-biased across multiple carrier cycles, slicing diagonally across envelope troughs.',
      };
    }
    return {
      kind: 'optimal',
      badge: 'Optimal Envelope Recovery (μ ≤ 1 & 1/ωc ≪ RC ≪ 1/ωm)',
      detail:
        'The RC network holds voltage tightly across carrier cycles while tracking the fastest downward slope of m(t). AC-coupling removes the DC offset to recover m̂(t) cleanly.',
    };
  }, [modIndex, rcUs, rippleThresholdUs, diagClipLimitUs, tauMUs]);

  // Precompute time-domain simulation over 2 complete message cycles
  const simData = useMemo(() => {
    const timeSpan = 2.0 / fmHz; // Always display 2 full cycles of m(t)
    const tOffset = time * (0.3 / fmHz); // Smooth scrolling proportional to message cycle
    const totalSteps = 1200;
    const dt = timeSpan / totalSteps;

    // Visual carrier cycles across 2 message cycles: readable individual crests, scales gently with fc
    const visualCarrierCycles = Math.round(42 * Math.pow(carrierFreq / 1000, 0.32));
    const visualCarrierHz = visualCarrierCycles / timeSpan;
    const tCarrierVis = 1 / visualCarrierHz;
    const tCarrierReal = 1 / fcHz;

    const rcSec = rcUs * 1e-6;
    // Scale inter-peak visual decay so fractional drop per visual crest matches physical T_c_real / RC
    const tauRippleSec = rcSec * (tCarrierVis / (tCarrierReal * 2.2));

    const macroDecay = Math.exp(-dt / rcSec);
    const rippleDecay = Math.exp(-dt / Math.max(tauRippleSec, 1e-12));

    // Warm up for 1 full message cycle prior to window start so left edge is in true steady-state
    const warmupSteps = Math.floor(totalSteps / 2);
    const tStart = tOffset - warmupSteps * dt;
    const initEnv = Math.abs(carrierAmp * (1 + modIndex * Math.cos(2 * Math.PI * fmHz * tStart)));
    let vMacro = initEnv;
    let vRipple = initEnv;

    const points: DemodSimulationPoint[] = [];

    for (let i = -warmupSteps; i <= totalSteps; i++) {
      const tRel = i * dt;
      const t = tOffset + tRel;
      const envIdeal = carrierAmp * (1 + modIndex * Math.cos(2 * Math.PI * fmHz * t));
      const envAbs = Math.abs(envIdeal);
      const s = envIdeal * Math.cos(2 * Math.PI * visualCarrierHz * t);
      const vRect = Math.max(0, s);

      // Exact physical macro RC envelope (governs diagonal clipping)
      vMacro = Math.max(envAbs, vMacro * macroDecay);
      // Physical inter-peak RC sawtooth (governs carrier ripple)
      vRipple = Math.max(vRect, vRipple * rippleDecay);

      // Smoothly unify micro-ripple and macro diagonal clipping with zero discontinuity
      const clipExcess = Math.max(0, vMacro - envAbs);
      const blend = Math.exp(-clipExcess / Math.max(0.14 * carrierAmp, 0.05));
      const vOut = Math.max(vRipple, vMacro - (envAbs - vRipple) * blend);

      if (i >= 0) {
        const isDiodeConducting =
          vRect > 0.02 * carrierAmp &&
          vRect >= vOut - 0.04 * carrierAmp &&
          clipExcess < 0.03 * carrierAmp;

        points.push({
          t: tRel,
          s,
          vRect,
          vOut,
          envIdeal,
          forwardBiased: isDiodeConducting,
        });
      }
    }

    return { points, timeSpan };
  }, [carrierAmp, modIndex, fmHz, fcHz, carrierFreq, rcUs, time]);

  // Active inspection sample index for live Diode Bias state on the schematic
  const probeFrac = hoverFrac !== null ? hoverFrac : 0.72;
  const probeIdx = Math.min(
    simData.points.length - 1,
    Math.max(0, Math.round(probeFrac * (simData.points.length - 1)))
  );
  const probeSample = simData.points[probeIdx];
  const isDiodeForward = probeSample ? probeSample.forwardBiased : false;

  // Draw Multi-Stage Oscilloscope Canvas
  const drawOscilloscope = useCallback(() => {
    const canvas = scopeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return;

    if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const padL = 48;
    const padR = 20;
    const padT = 26;
    const padB = 30;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;
    const centerY = padT + plotH * 0.56; // Slightly lower zero axis so positive rectified/RC region has generous headroom

    const peakEnv = carrierAmp * (1 + modIndex);
    const maxV = peakEnv <= 4.5 ? 5 : peakEnv <= 10.5 ? 12 : peakEnv <= 21 ? 24 : 28;
    const yScale = (centerY - padT - 4) / maxV;

    const yTicks =
      maxV === 5
        ? [-2, 2, 4]
        : maxV === 12
          ? [-5, 5, 10]
          : maxV === 24
            ? [-10, 10, 20]
            : [-12, 12, 24];

    // Horizontal Grid Lines
    ctx.strokeStyle = '#EFEFEA';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    yTicks.forEach((v) => {
      const y = centerY - v * yScale;
      if (y >= padT && y <= padT + plotH) {
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(width - padR, y);
        ctx.stroke();

        ctx.fillStyle = '#A8A69E';
        ctx.font = '10px JetBrains Mono, monospace';
        ctx.textAlign = 'right';
        ctx.fillText(`${v > 0 ? '+' : ''}${v}V`, padL - 6, y + 3);
      }
    });

    // Vertical Time Grid Lines (4 divisions)
    for (let d = 1; d <= 3; d++) {
      const gx = padL + (d / 4) * plotW;
      ctx.beginPath();
      ctx.moveTo(gx, padT);
      ctx.lineTo(gx, padT + plotH);
      ctx.stroke();
    }

    // 0V Baseline Axis
    ctx.setLineDash([]);
    ctx.strokeStyle = '#8A8882';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(padL, centerY);
    ctx.lineTo(width - padR, centerY);
    ctx.stroke();

    ctx.fillStyle = '#585651';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText('0V', padL - 6, centerY + 3);

    const { points, timeSpan } = simData;
    const n = points.length;
    if (n < 2) {
      ctx.restore();
      return;
    }

    // Shade overmodulation inversion regions where ideal envelope < 0
    if (modIndex > 1.0) {
      ctx.fillStyle = 'rgba(220, 38, 38, 0.08)';
      let inInv = false;
      let startX = padL;
      for (let i = 0; i < n; i++) {
        const x = padL + (i / (n - 1)) * plotW;
        if (points[i].envIdeal < 0 && !inInv) {
          inInv = true;
          startX = x;
        } else if (points[i].envIdeal >= 0 && inInv) {
          inInv = false;
          ctx.fillRect(startX, padT, x - startX, plotH);
        }
      }
      if (inInv) {
        ctx.fillRect(startX, padT, width - padR - startX, plotH);
      }
    }

    // Trace 1: Incoming AM Wave s(t) (faint background reference)
    if (showAmWave) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(26, 25, 23, 0.22)';
      ctx.lineWidth = 1.1;
      for (let i = 0; i < n; i++) {
        const x = padL + (i / (n - 1)) * plotW;
        const y = centerY - points[i].s * yScale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Trace 2: Half-Wave Rectified Diode Output v_rect(t) = max(0, s(t))
    if (showRectified) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(200, 90, 50, 0.65)';
      ctx.lineWidth = 1.35;
      for (let i = 0; i < n; i++) {
        const x = padL + (i / (n - 1)) * plotW;
        const y = centerY - points[i].vRect * yScale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Trace 4: Original Baseband Message m(t) (dashed blue ideal envelope reference)
    if (showBasebandRef) {
      ctx.beginPath();
      ctx.strokeStyle = '#2563EB';
      ctx.lineWidth = 1.75;
      ctx.setLineDash([6, 4]);
      for (let i = 0; i < n; i++) {
        const x = padL + (i / (n - 1)) * plotW;
        const y = centerY - points[i].envIdeal * yScale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Trace 3: RC Capacitor Smoothed Output v_out(t)
    if (showRcOutput) {
      ctx.beginPath();
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 2.4;
      for (let i = 0; i < n; i++) {
        const x = padL + (i / (n - 1)) * plotW;
        const y = centerY - points[i].vOut * yScale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Live / Interactive Diode Probe Cursor Line
    const probeX = padL + (probeIdx / (n - 1)) * plotW;
    ctx.strokeStyle = isDiodeForward ? 'rgba(5, 150, 105, 0.45)' : 'rgba(180, 83, 9, 0.40)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(probeX, padT);
    ctx.lineTo(probeX, padT + plotH);
    ctx.stroke();
    ctx.setLineDash([]);

    if (probeSample) {
      const py = centerY - probeSample.vOut * yScale;
      ctx.beginPath();
      ctx.arc(probeX, py, 4, 0, 2 * Math.PI);
      ctx.fillStyle = isDiodeForward ? '#059669' : '#D97706';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    // Time Axis Label
    const spanMs = timeSpan * 1000;
    const spanLabel = spanMs >= 1 ? `${spanMs.toFixed(2)} ms` : `${(spanMs * 1000).toFixed(0)} μs`;
    ctx.fillStyle = '#585651';
    ctx.font = '10px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`Time t → (0–${spanLabel}, 2 cycles of fm)`, width - padR, padT + plotH + 18);

    // Compact Inline Canvas Legend
    ctx.textAlign = 'left';
    ctx.font = '10px JetBrains Mono, monospace';
    let lx = padL + 6;
    const ly = padT - 9;

    if (showAmWave) {
      ctx.fillStyle = '#75736E';
      ctx.fillText('s(t) AM Wave', lx, ly);
      lx += 94;
    }
    if (showRectified) {
      ctx.fillStyle = '#C85A32';
      ctx.fillText('v_rect(t) Diode', lx, ly);
      lx += 110;
    }
    if (showRcOutput) {
      ctx.fillStyle = '#059669';
      ctx.fillText('v_out(t) RC Smoothed', lx, ly);
      lx += 140;
    }
    if (showBasebandRef) {
      ctx.fillStyle = '#2563EB';
      ctx.fillText('m(t) Baseband Ref', lx, ly);
    }

    ctx.restore();
  }, [
    simData,
    carrierAmp,
    modIndex,
    showAmWave,
    showRectified,
    showRcOutput,
    showBasebandRef,
    probeIdx,
    probeSample,
    isDiodeForward,
  ]);

  useEffect(() => {
    drawOscilloscope();
  }, [drawOscilloscope, controllerPos]);

  useEffect(() => {
    const canvas = scopeCanvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => drawOscilloscope());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [drawOscilloscope, controllerPos]);

  // Interactive hover probe handler on oscilloscope
  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const padL = 48;
    const padR = 20;
    const plotW = Math.max(1, rect.width - padL - padR);
    const frac = Math.min(1, Math.max(0, (e.clientX - rect.left - padL) / plotW));
    setHoverFrac(frac);
  };

  const handleResetDemod = () => {
    setRcUs(50.0);
    onResetCoreParams();
    setShowAmWave(true);
    setShowRectified(true);
    setShowRcOutput(true);
    setShowBasebandRef(true);
  };

  // Logarithmic gauge position for RC between 0.05 us and 1000 us
  const logMin = Math.log10(0.05);
  const logMax = Math.log10(1000);
  const toLogPct = (valUs: number) => {
    const clamped = Math.min(1000, Math.max(0.05, valUs));
    return ((Math.log10(clamped) - logMin) / (logMax - logMin)) * 100;
  };
  const tauCPct = toLogPct(tauCUs);
  const tauMPct = toLogPct(tauMUs);
  const rcPct = toLogPct(rcUs);
  const optStartPct = toLogPct(rippleThresholdUs);
  const optEndPct = toLogPct(Math.min(diagClipLimitUs, 0.85 * tauMUs));

  const formatUs = (val: number) => {
    if (val < 1) return `${val.toFixed(2)} μs`;
    if (val < 100) return `${val.toFixed(1)} μs`;
    return `${val.toFixed(0)} μs`;
  };

  const statusStyles = {
    optimal: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      text: 'text-emerald-800',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />,
      dotColor: '#059669',
      outputLabel: 'Clean m̂(t)',
    },
    ripple: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-900',
      icon: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />,
      dotColor: '#D97706',
      outputLabel: 'High Ripple',
    },
    diagonal: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      text: 'text-amber-900',
      icon: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />,
      dotColor: '#D97706',
      outputLabel: 'Diagonal Clip',
    },
    overmod: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      text: 'text-red-800',
      icon: <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />,
      dotColor: '#DC2626',
      outputLabel: 'Inverted (μ > 1)',
    },
  }[statusInfo.kind];

  const isSideBySide = controllerPos === 'left' || controllerPos === 'right';
  const isStacked = controllerPos === 'top' || controllerPos === 'below';

  // Visual Column: Schematic + Oscilloscope (locked in side-by-side mode, full-width in stacked mode)
  const visualsColumn = (
    <div
      className={
        isSideBySide
          ? 'flex flex-col gap-3.5 lg:h-full lg:overflow-hidden min-w-0'
          : 'flex flex-col gap-5 min-w-0'
      }
    >
      {/* Card 1: Interactive Circuit Schematic */}
      <div
        className={`bg-white rounded-lg border border-[#E6E4DD] shadow-xs flex flex-col ${
          isSideBySide
            ? 'p-3.5 lg:flex-[43_1_0%] lg:min-h-0 lg:overflow-hidden'
            : 'p-4 sm:p-5'
        }`}
      >
        <div
          className={`flex flex-wrap items-center justify-between gap-2 border-b border-[#E6E4DD] shrink-0 ${
            isSideBySide ? 'pb-2 mb-2' : 'pb-3 mb-3'
          }`}
        >
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#C85A32]" />
            <h2 className="text-xs font-bold tracking-tight text-[#1A1917] uppercase font-mono">
              DIODE-RC ENVELOPE DETECTOR CIRCUIT
            </h2>
          </div>

          {/* Live Diode State Indicator */}
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded border text-[11px] font-mono font-semibold whitespace-nowrap transition-colors ${
              isDiodeForward
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isDiodeForward ? 'bg-emerald-600' : 'bg-amber-500'
              }`}
            />
            <span>
              D1: {isDiodeForward ? 'Forward Biased (Charging C)' : 'Reverse Biased (RC Discharge)'}
            </span>
          </div>
        </div>

        {/* Clean Engineering SVG Schematic */}
        <div
          className={`w-full bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-x-auto ${
            isSideBySide
              ? 'p-1.5 sm:p-2 lg:flex-1 lg:min-h-0 flex items-center justify-center'
              : 'p-2 sm:p-3'
          }`}
        >
          <svg
            viewBox="0 0 820 250"
            preserveAspectRatio="xMidYMid meet"
            className={
              isSideBySide
                ? 'w-full h-full max-h-[195px] min-w-[460px] lg:min-w-0 block select-none'
                : 'w-full h-auto max-h-[250px] min-w-[540px] block select-none'
            }
            role="img"
            aria-label="Diode-RC Envelope Detector Circuit Schematic showing AM input, series diode D1, parallel RC smoothing network, DC-blocking capacitor, and recovered output"
          >
            <defs>
              <marker
                id="arrow-forward"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#059669" />
              </marker>
              <marker
                id="arrow-discharge"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#D97706" />
              </marker>
            </defs>

            {/* Subtle Engineering Section Dividers */}
            <rect
              x="175"
              y="24"
              width="136"
              height="196"
              rx="8"
              fill={isDiodeForward ? 'rgba(5, 150, 105, 0.05)' : 'rgba(217, 119, 6, 0.04)'}
              stroke={isDiodeForward ? 'rgba(5, 150, 105, 0.28)' : 'rgba(217, 119, 6, 0.25)'}
              strokeDasharray="4 4"
            />
            <rect
              x="338"
              y="24"
              width="206"
              height="196"
              rx="8"
              fill="rgba(255, 255, 255, 0.65)"
              stroke="#E6E4DD"
              strokeDasharray="4 4"
            />
            <rect
              x="570"
              y="24"
              width="120"
              height="196"
              rx="8"
              fill="rgba(255, 255, 255, 0.65)"
              stroke="#E6E4DD"
              strokeDasharray="4 4"
            />

            {/* Stage Headers */}
            <text x="86" y="42" textAnchor="middle" fill="#75736E" fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="600">
              1. AM INPUT
            </text>
            <text x="243" y="42" textAnchor="middle" fill={isDiodeForward ? '#059669' : '#B45309'} fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="700">
              2. SERIES DIODE D1
            </text>
            <text x="441" y="42" textAnchor="middle" fill="#1A1917" fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="600">
              3. PARALLEL RC FILTER
            </text>
            <text x="630" y="42" textAnchor="middle" fill="#585651" fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="600">
              4. DC BLOCK
            </text>
            <text x="756" y="42" textAnchor="middle" fill="#2563EB" fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="700">
              5. OUTPUT
            </text>

            {/* --- INPUT SOURCE s(t) --- */}
            <circle cx="86" cy="144" r="24" fill="#FFFFFF" stroke="#1A1917" strokeWidth="2" />
            <path
              d="M 72 144 Q 79 130, 86 144 T 100 144"
              fill="none"
              stroke="#C85A32"
              strokeWidth="2"
            />
            <line x1="86" y1="120" x2="86" y2="96" stroke="#1A1917" strokeWidth="2" />
            <line
              x1="86"
              y1="96"
              x2="218"
              y2="96"
              stroke={isDiodeForward ? '#059669' : '#1A1917'}
              strokeWidth={isDiodeForward ? '2.5' : '2'}
            />
            <line x1="86" y1="168" x2="86" y2="196" stroke="#1A1917" strokeWidth="2" />

            <text x="86" y="76" textAnchor="middle" fill="#1A1917" fontSize="13" fontFamily="JetBrains Mono, monospace" fontWeight="700">
              s(t)
            </text>
            <text x="86" y="236" textAnchor="middle" fill="#75736E" fontSize="10" fontFamily="JetBrains Mono, monospace">
              Ac={carrierAmp.toFixed(1)}V · μ={modIndex.toFixed(2)}
            </text>

            {isDiodeForward && (
              <line
                x1="138"
                y1="86"
                x2="178"
                y2="86"
                stroke="#059669"
                strokeWidth="2"
                markerEnd="url(#arrow-forward)"
              />
            )}
            {isDiodeForward && (
              <text x="156" y="78" textAnchor="middle" fill="#059669" fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="700">
                i_D &gt; 0
              </text>
            )}

            {/* --- SERIES DIODE D1 --- */}
            <polygon
              points="218,80 218,112 252,96"
              fill={isDiodeForward ? '#059669' : '#FAF9F6'}
              stroke={isDiodeForward ? '#059669' : '#1A1917'}
              strokeWidth="2.2"
            />
            <line
              x1="252"
              y1="78"
              x2="252"
              y2="114"
              stroke={isDiodeForward ? '#059669' : '#1A1917'}
              strokeWidth="3"
            />
            <text x="236" y="68" textAnchor="middle" fill="#1A1917" fontSize="12" fontFamily="JetBrains Mono, monospace" fontWeight="700">
              D1
            </text>
            <text
              x="243"
              y="142"
              textAnchor="middle"
              fill={isDiodeForward ? '#059669' : '#B45309'}
              fontSize="10.5"
              fontFamily="JetBrains Mono, monospace"
              fontWeight="700"
            >
              {isDiodeForward ? 'CONDUCTING' : 'BLOCKING'}
            </text>
            <text x="243" y="157" textAnchor="middle" fill="#75736E" fontSize="9.5" fontFamily="JetBrains Mono, monospace">
              {isDiodeForward ? 's(t) > v_out(t)' : 's(t) ≤ v_out(t)'}
            </text>

            <line
              x1="252"
              y1="96"
              x2="495"
              y2="96"
              stroke={isDiodeForward ? '#059669' : '#1A1917'}
              strokeWidth={isDiodeForward ? '2.5' : '2'}
            />

            <circle cx="290" cy="96" r="3.5" fill="#C85A32" />
            <text x="290" y="83" textAnchor="middle" fill="#C85A32" fontSize="10" fontFamily="JetBrains Mono, monospace" fontWeight="600">
              v_rect
            </text>

            {/* --- PARALLEL RC SMOOTHING NETWORK --- */}
            <circle cx="390" cy="96" r="4" fill="#059669" />
            <line x1="390" y1="96" x2="390" y2="136" stroke="#1A1917" strokeWidth="2" />
            <line x1="370" y1="136" x2="410" y2="136" stroke="#1A1917" strokeWidth="2.8" />
            <line x1="370" y1="148" x2="410" y2="148" stroke="#1A1917" strokeWidth="2.8" />
            <line x1="390" y1="148" x2="390" y2="196" stroke="#1A1917" strokeWidth="2" />
            <text x="360" y="146" textAnchor="end" fill="#1A1917" fontSize="12" fontFamily="JetBrains Mono, monospace" fontWeight="700">
              C
            </text>

            <circle cx="495" cy="96" r="4" fill="#059669" />
            <text x="442" y="82" textAnchor="middle" fill="#059669" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="700">
              v_out(t)
            </text>

            {!isDiodeForward && (
              <>
                <line
                  x1="414"
                  y1="108"
                  x2="470"
                  y2="108"
                  stroke="#D97706"
                  strokeWidth="2"
                  markerEnd="url(#arrow-discharge)"
                />
                <text x="442" y="123" textAnchor="middle" fill="#B45309" fontSize="9.5" fontFamily="JetBrains Mono, monospace" fontWeight="700">
                  e^(-t/RC)
                </text>
              </>
            )}

            <line x1="495" y1="96" x2="495" y2="120" stroke={!isDiodeForward ? '#D97706' : '#1A1917'} strokeWidth="2" />
            <polyline
              points="495,120 486,125 504,133 486,141 504,149 486,157 504,165 495,170"
              fill="none"
              stroke={!isDiodeForward ? '#D97706' : '#1A1917'}
              strokeWidth="2.2"
              strokeLinejoin="round"
            />
            <line x1="495" y1="170" x2="495" y2="196" stroke={!isDiodeForward ? '#D97706' : '#1A1917'} strokeWidth="2" />
            <text x="515" y="149" textAnchor="start" fill="#1A1917" fontSize="12" fontFamily="JetBrains Mono, monospace" fontWeight="700">
              R
            </text>

            <text x="441" y="236" textAnchor="middle" fill="#1A1917" fontSize="10.5" fontFamily="JetBrains Mono, monospace" fontWeight="700">
              τ = RC = {rcUs.toFixed(1)} μs
            </text>

            {/* --- DC-BLOCKING CAPACITOR --- */}
            <line x1="495" y1="96" x2="622" y2="96" stroke="#1A1917" strokeWidth="2" />
            <line x1="622" y1="76" x2="622" y2="116" stroke="#2563EB" strokeWidth="2.8" />
            <line x1="636" y1="76" x2="636" y2="116" stroke="#2563EB" strokeWidth="2.8" />
            <text x="629" y="66" textAnchor="middle" fill="#2563EB" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="700">
              C_block
            </text>
            <text x="629" y="138" textAnchor="middle" fill="#75736E" fontSize="9.5" fontFamily="JetBrains Mono, monospace">
              AC Coupling
            </text>
            <text x="629" y="152" textAnchor="middle" fill="#75736E" fontSize="9.5" fontFamily="JetBrains Mono, monospace">
              Removes DC
            </text>

            {/* --- RECOVERED OUTPUT m̂(t) --- */}
            <line x1="636" y1="96" x2="736" y2="96" stroke="#2563EB" strokeWidth="2.2" />
            <circle cx="742" cy="96" r="5.5" fill="#FFFFFF" stroke="#2563EB" strokeWidth="2.4" />
            <text x="756" y="76" textAnchor="middle" fill="#2563EB" fontSize="14" fontFamily="JetBrains Mono, monospace" fontWeight="700">
              m̂(t)
            </text>
            <text x="756" y="122" textAnchor="middle" fill="#585651" fontSize="10" fontFamily="JetBrains Mono, monospace">
              Recovered
            </text>
            <text
              x="756"
              y="140"
              textAnchor="middle"
              fill={statusStyles.dotColor}
              fontSize="10"
              fontFamily="JetBrains Mono, monospace"
              fontWeight="700"
            >
              {statusStyles.outputLabel}
            </text>
            <circle cx="742" cy="196" r="4.5" fill="#FFFFFF" stroke="#585651" strokeWidth="1.8" />
            <text x="756" y="199" textAnchor="start" fill="#75736E" fontSize="9.5" fontFamily="JetBrains Mono, monospace">
              −
            </text>

            {/* --- COMMON GROUND BUS & GROUND SYMBOLS --- */}
            <line x1="86" y1="196" x2="737" y2="196" stroke="#585651" strokeWidth="1.8" />
            <line x1="442" y1="196" x2="442" y2="207" stroke="#585651" strokeWidth="1.8" />
            <line x1="428" y1="207" x2="456" y2="207" stroke="#585651" strokeWidth="2" />
            <line x1="433" y1="212" x2="451" y2="212" stroke="#585651" strokeWidth="1.8" />
            <line x1="438" y1="217" x2="446" y2="217" stroke="#585651" strokeWidth="1.5" />
            <text x="464" y="213" textAnchor="start" fill="#75736E" fontSize="9.5" fontFamily="JetBrains Mono, monospace">
              GND
            </text>
          </svg>
        </div>

        {/* Instantaneous Probe Readout Strip */}
        <div
          className={`${
            isSideBySide ? 'mt-2 px-2.5 py-1.5' : 'mt-2.5 px-3 py-2'
          } bg-[#FAF9F6] border border-[#E6E4DD] rounded-md flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#585651] tabular-nums shrink-0`}
        >
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>
              s(t<sub>p</sub>) = <strong className="text-[#1A1917]">{(probeSample?.s ?? 0).toFixed(2)} V</strong>
            </span>
            <span>
              v<sub>rect</sub>(t<sub>p</sub>) = <strong className="text-[#C85A32]">{(probeSample?.vRect ?? 0).toFixed(2)} V</strong>
            </span>
            <span>
              v<sub>out</sub>(t<sub>p</sub>) = <strong className="text-[#059669]">{(probeSample?.vOut ?? 0).toFixed(2)} V</strong>
            </span>
          </div>
          <span className="text-[10px] text-[#75736E]">
            {hoverFrac !== null ? 'Inspecting cursor probe' : 'Hover oscilloscope to scrub diode bias'}
          </span>
        </div>
      </div>

      {/* Card 2: Live Multi-Stage Oscilloscope */}
      <div
        className={`bg-white rounded-lg border border-[#E6E4DD] shadow-xs flex flex-col ${
          isSideBySide
            ? 'p-3.5 lg:flex-[57_1_0%] lg:min-h-0 lg:overflow-hidden'
            : 'p-4 sm:p-5'
        }`}
      >
        <div
          className={`flex flex-wrap items-center justify-between border-b border-[#E6E4DD] gap-2 shrink-0 ${
            isSideBySide ? 'pb-2 mb-2' : 'pb-3 mb-3'
          }`}
        >
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#C85A32]" />
            <h2 className="text-xs font-bold tracking-tight text-[#1A1917] uppercase font-mono">
              ENVELOPE RECOVERY &amp; RC DISCHARGE WAVEFORMS
            </h2>
          </div>

          {/* Playback & Speed Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-colors flex items-center gap-1 cursor-pointer border whitespace-nowrap ${
                isPlaying
                  ? 'bg-[#1A1917] text-white border-[#1A1917]'
                  : 'bg-[#FAF9F6] border-[#E6E4DD] text-[#585651] hover:text-[#1A1917]'
              }`}
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            <button
              type="button"
              onClick={handleResetDemod}
              className="p-1 bg-white border border-[#E6E4DD] rounded text-[#585651] hover:text-[#1A1917] transition-colors shadow-2xs cursor-pointer"
              title="Reset demodulation and signal parameters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-0.5 bg-[#FAF9F6] border border-[#E6E4DD] rounded p-0.5 text-[11px] font-mono">
              {['0.5×', '1×', '2×'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpeed(s)}
                  className={`px-1.5 py-0.5 rounded cursor-pointer ${
                    speed === s ? 'bg-[#1A1917] text-white font-bold' : 'text-[#75736E]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Oscilloscope Canvas */}
        <div
          className={`relative w-full bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden ${
            isSideBySide ? 'h-60 lg:flex-1 lg:min-h-[140px]' : 'h-72 sm:h-80'
          }`}
        >
          <canvas
            ref={scopeCanvasRef}
            onPointerMove={handleCanvasPointerMove}
            onPointerLeave={() => setHoverFrac(null)}
            className="w-full h-full block cursor-crosshair"
          />
        </div>

        {/* Contextual Warning Banner when distorted */}
        {statusInfo.kind !== 'optimal' && (
          <div
            className={`${
              isSideBySide ? 'mt-2 p-2 text-[11px] leading-snug' : 'mt-3 p-2.5 text-xs'
            } rounded-md border flex items-start gap-2 shrink-0 ${statusStyles.bg} ${statusStyles.border} ${statusStyles.text}`}
          >
            {statusStyles.icon}
            <span>
              <strong>{statusInfo.badge}:</strong> {statusInfo.detail}
            </span>
          </div>
        )}

        {/* Toggleable Trace Checkboxes */}
        <div
          className={`${
            isSideBySide ? 'mt-2 pt-2' : 'mt-3 pt-3'
          } border-t border-[#E6E4DD] flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#585651] shrink-0`}
        >
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showAmWave}
              onChange={(e) => setShowAmWave(e.target.checked)}
              className="accent-[#585651] rounded"
            />
            <span>Incoming AM Wave s(t)</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showRectified}
              onChange={(e) => setShowRectified(e.target.checked)}
              className="accent-[#C85A32] rounded"
            />
            <span>Half-Wave Rectified v<sub>rect</sub>(t)</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showRcOutput}
              onChange={(e) => setShowRcOutput(e.target.checked)}
              className="accent-[#059669] rounded"
            />
            <span>RC Smoothed Output v<sub>out</sub>(t)</span>
          </label>
          <label className="flex items-center gap-1.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showBasebandRef}
              onChange={(e) => setShowBasebandRef(e.target.checked)}
              className="accent-[#2563EB] rounded"
            />
            <span>Original Baseband m(t)</span>
          </label>
        </div>
      </div>
    </div>
  );

  // Control Card 1: Demodulation & RC Filter Controls
  const controlsCard = (
    <div className="bg-white rounded-lg border border-[#E6E4DD] p-4 sm:p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E6E4DD]">
          <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] flex items-center gap-1.5 font-bold">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#C85A32]" />
            <span>DEMODULATION &amp; RC FILTER CONTROLS</span>
          </div>
          <button
            type="button"
            onClick={handleResetDemod}
            className="text-[11px] font-mono text-[#75736E] hover:text-[#C85A32] transition-colors cursor-pointer"
          >
            Reset
          </button>
        </div>

        {/* Slider 1: RC Time Constant */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="rc-tau-slider" className="font-semibold text-[#1A1917]">
              RC Time Constant (τ = RC)
            </label>
            <span className="font-mono font-bold text-[#C85A32] text-sm tabular-nums">
              {rcUs.toFixed(1)} μs
            </span>
          </div>
          <input
            id="rc-tau-slider"
            type="range"
            min="1.0"
            max="500.0"
            step="0.5"
            value={rcUs}
            onChange={(e) => setRcUs(parseFloat(e.target.value))}
            className="w-full accent-[#C85A32] cursor-pointer"
          />
          <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-[#8A8882]">
            <span className="whitespace-nowrap">Ripple (Fast)</span>
            <span className="whitespace-nowrap">Optimal</span>
            <span className="whitespace-nowrap">Clipping (Slow)</span>
          </div>
        </div>

        {/* Slider 2: Modulation Index μ (synced with Tab 1) */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="demod-mod-index-slider" className="font-semibold text-[#1A1917]">
              Modulation Index (μ)
            </label>
            <span className="font-mono font-bold text-[#C85A32] text-sm tabular-nums">
              {modIndex.toFixed(2)}
            </span>
          </div>
          <input
            id="demod-mod-index-slider"
            type="range"
            min="0.0"
            max="1.5"
            step="0.05"
            value={modIndex}
            onChange={(e) => setModIndex(parseFloat(e.target.value))}
            className="w-full accent-[#C85A32] cursor-pointer"
          />
          <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-[#8A8882]">
            <span className="whitespace-nowrap">0.0 (Unmodulated)</span>
            <span className="whitespace-nowrap">1.0 (Critical)</span>
            <span className="whitespace-nowrap">1.5 (Overmod)</span>
          </div>
        </div>

        {/* Slider 3: Message Frequency fm (synced with Tab 1) */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center justify-between text-xs">
            <label htmlFor="demod-msg-freq-slider" className="font-semibold text-[#1A1917]">
              Message Frequency (f<sub>m</sub>)
            </label>
            <span className="font-mono text-[#1A1917] text-xs font-bold tabular-nums">
              {messageFreq.toFixed(1)} kHz
            </span>
          </div>
          <input
            id="demod-msg-freq-slider"
            type="range"
            min="0.5"
            max="10.0"
            step="0.1"
            value={Math.min(10.0, Math.max(0.5, messageFreq))}
            onChange={(e) => setMessageFreq(parseFloat(e.target.value))}
            className="w-full accent-[#C85A32] cursor-pointer"
          />
          <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-[#8A8882]">
            <span>0.5 kHz</span>
            <span>5.0 kHz</span>
            <span>10.0 kHz</span>
          </div>
        </div>

        {/* Synced Carrier Parameters Summary */}
        <div className="px-2.5 py-1.5 bg-[#FAF9F6] border border-[#E6E4DD] rounded text-[11px] font-mono text-[#75736E] flex items-center justify-between gap-2 tabular-nums">
          <span>Synced Carrier:</span>
          <span className="text-[#1A1917] font-semibold">
            f<sub>c</sub> = {carrierFreq} kHz · A<sub>c</sub> = {carrierAmp.toFixed(1)} V
          </span>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="mt-4 pt-3 border-t border-[#E6E4DD]">
        <div className="text-[10px] font-mono uppercase tracking-wider text-[#75736E] font-semibold mb-2">
          Quick Presets
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => {
              setModIndex(0.75);
              setRcUs(50.0);
              setMessageFreq(1.0);
            }}
            className={`px-2 py-1 rounded text-[11px] font-mono border transition-colors cursor-pointer ${
              Math.abs(modIndex - 0.75) < 0.01 &&
              Math.abs(rcUs - 50.0) < 0.5 &&
              Math.abs(messageFreq - 1.0) < 0.05
                ? 'bg-[#C85A32] text-white border-[#C85A32]'
                : 'bg-[#FAF9F6] text-[#585651] border-[#E6E4DD] hover:text-[#1A1917]'
            }`}
          >
            Optimal Recovery (μ=0.75, RC=50μs)
          </button>
          <button
            type="button"
            onClick={() => {
              setModIndex(0.75);
              setRcUs(4.0);
              setMessageFreq(1.0);
            }}
            className={`px-2 py-1 rounded text-[11px] font-mono border transition-colors cursor-pointer ${
              Math.abs(rcUs - 4.0) < 0.5 && modIndex <= 1.0
                ? 'bg-[#C85A32] text-white border-[#C85A32]'
                : 'bg-[#FAF9F6] text-[#585651] border-[#E6E4DD] hover:text-[#1A1917]'
            }`}
          >
            Carrier Ripple (RC=4μs)
          </button>
          <button
            type="button"
            onClick={() => {
              setModIndex(0.75);
              setRcUs(320.0);
              setMessageFreq(1.0);
            }}
            className={`px-2 py-1 rounded text-[11px] font-mono border transition-colors cursor-pointer ${
              Math.abs(rcUs - 320.0) < 1.0 && modIndex <= 1.0
                ? 'bg-[#C85A32] text-white border-[#C85A32]'
                : 'bg-[#FAF9F6] text-[#585651] border-[#E6E4DD] hover:text-[#1A1917]'
            }`}
          >
            Diagonal Clipping (RC=320μs)
          </button>
          <button
            type="button"
            onClick={() => {
              setModIndex(1.3);
              setRcUs(50.0);
              setMessageFreq(1.0);
            }}
            className={`px-2 py-1 rounded text-[11px] font-mono border transition-colors cursor-pointer ${
              Math.abs(modIndex - 1.3) < 0.01
                ? 'bg-[#C85A32] text-white border-[#C85A32]'
                : 'bg-[#FAF9F6] text-[#585651] border-[#E6E4DD] hover:text-[#1A1917]'
            }`}
          >
            Overmodulation Distortion (μ=1.3)
          </button>
        </div>
      </div>
    </div>
  );

  // Control Card 2: Live Diagnostic Status Card
  const diagnosticCard = (
    <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-4 sm:p-5 shadow-xs flex flex-col justify-between">
      <div>
        <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-3 flex items-center gap-1.5 font-bold">
          <Gauge className="w-3.5 h-3.5 text-[#C85A32]" />
          <span>DESIGN INEQUALITY &amp; RECOVERY STATUS</span>
        </div>

        {/* Active Status Badge */}
        <div
          className={`p-3 rounded-md border flex items-start gap-2.5 mb-3.5 ${statusStyles.bg} ${statusStyles.border} ${statusStyles.text}`}
        >
          {statusStyles.icon}
          <div className="text-xs font-semibold leading-snug">{statusInfo.badge}</div>
        </div>

        {/* Three-Column Inequality Readout */}
        <div className="grid grid-cols-3 gap-2 text-center font-mono tabular-nums mb-3.5">
          <div className="p-2 bg-white border border-[#E6E4DD] rounded">
            <div className="text-[10px] text-[#75736E]">1 / ω<sub>c</sub></div>
            <div className="text-xs font-bold text-[#1A1917] mt-0.5">{formatUs(tauCUs)}</div>
          </div>
          <div className="p-2 bg-[#FBF4F0] border border-[#C85A32]/35 rounded">
            <div className="text-[10px] text-[#C85A32] font-semibold">Current RC</div>
            <div className="text-xs font-bold text-[#C85A32] mt-0.5">{formatUs(rcUs)}</div>
          </div>
          <div className="p-2 bg-white border border-[#E6E4DD] rounded">
            <div className="text-[10px] text-[#75736E]">1 / ω<sub>m</sub></div>
            <div className="text-xs font-bold text-[#1A1917] mt-0.5">{formatUs(tauMUs)}</div>
          </div>
        </div>
      </div>

      {/* Log-Scale Inequality Placement Bar */}
      <div className="bg-white border border-[#E6E4DD] rounded p-2.5">
        <div className="flex items-center justify-between text-[10px] font-mono text-[#75736E] mb-2">
          <span>1/ω<sub>c</sub> ≪ RC ≪ 1/ω<sub>m</sub> (Log Scale)</span>
          <span>μ = {modIndex.toFixed(2)} {modIndex <= 1.0 ? '≤ 1' : '> 1'}</span>
        </div>
        <div className="relative h-3 bg-[#EFEFEA] rounded-full overflow-visible border border-[#E6E4DD]">
          {optEndPct > optStartPct && modIndex <= 1.0 && (
            <div
              className="absolute top-0 bottom-0 bg-emerald-200/80 rounded-full"
              style={{
                left: `${optStartPct}%`,
                width: `${Math.max(2, optEndPct - optStartPct)}%`,
              }}
              title="Optimal RC operating band"
            />
          )}
          <div
            className="absolute -top-0.5 -bottom-0.5 w-0.5 bg-[#585651]"
            style={{ left: `${tauCPct}%` }}
            title={`1/ωc = ${formatUs(tauCUs)}`}
          />
          <div
            className="absolute -top-0.5 -bottom-0.5 w-0.5 bg-[#585651]"
            style={{ left: `${tauMPct}%` }}
            title={`1/ωm = ${formatUs(tauMUs)}`}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs transition-all duration-100"
            style={{
              left: `${rcPct}%`,
              backgroundColor: statusStyles.dotColor,
            }}
            title={`Current RC = ${rcUs.toFixed(1)} μs`}
          />
        </div>
        <div className="flex justify-between text-[9px] font-mono text-[#8A8882] mt-1.5 tabular-nums">
          <span>0.1 μs</span>
          <span>1/ω<sub>c</sub>: {formatUs(tauCUs)}</span>
          <span>1/ω<sub>m</sub>: {formatUs(tauMUs)}</span>
          <span>1 ms</span>
        </div>
      </div>
    </div>
  );

  // Control Card 3: Analytical Formulation (1-col vertical in side-by-side, 3-col horizontal in top/below)
  const analyticalCard = (
    <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-4 sm:p-5 shadow-xs">
      <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-3 flex items-center gap-1.5 font-bold">
        <BookOpen className="w-3.5 h-3.5 text-[#585651]" />
        <span>ANALYTICAL FORMULATION</span>
      </div>

      <div className={isStacked ? 'grid grid-cols-1 md:grid-cols-3 gap-3 items-stretch' : 'space-y-3'}>
        <div className="flex flex-col">
          <div className="text-[11px] text-[#585651] mb-1 font-medium">
            Diode Rectification
          </div>
          <div className="px-3 py-2 bg-white rounded border border-[#E6E4DD] text-xs text-[#1A1917] overflow-x-auto flex-1 flex items-center justify-center">
            <MathView math="v_{\text{rect}}(t) = \max\bigl(0,\, s(t)\bigr)" displayMode={true} />
          </div>
        </div>

        <div className="flex flex-col">
          <div className="text-[11px] text-[#585651] mb-1 font-medium">
            RC Time Constant Condition
          </div>
          <div className="px-3 py-2 bg-white rounded border border-[#E6E4DD] text-xs text-[#1A1917] overflow-x-auto flex-1 flex items-center justify-center">
            <MathView
              math="\frac{1}{2\pi f_c} \ll RC \ll \frac{1}{2\pi f_m}"
              displayMode={true}
            />
          </div>
        </div>

        <div className="flex flex-col">
          <div className="text-[11px] text-[#585651] mb-1 font-medium">
            Recovered Output (μ ≤ 1)
          </div>
          <div className="px-3 py-2 bg-white rounded border border-[#E6E4DD] text-xs text-[#1A1917] overflow-x-auto flex-1 flex items-center justify-center">
            <MathView
              math="v_{\text{out}}(t) \approx \frac{A_c}{\pi}\bigl[1 + \mu \cdot m(t)\bigr] \xrightarrow{\text{AC-coupled}} \hat{m}(t)"
              displayMode={true}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="mt-5 space-y-5">
      {/* Top Foundation Banner */}
      <div className="p-3.5 sm:p-4 rounded-md bg-[#FAF9F6] border border-[#E6E4DD] flex items-start gap-3">
        <Info className="w-4 h-4 text-[#C85A32] shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm text-[#585651] leading-relaxed">
          <span className="font-semibold text-[#1A1917]">Envelope Demodulation Foundation: </span>
          When <strong className="text-[#1A1917]">μ ≤ 1.0</strong>, a simple non-coherent{' '}
          <strong className="text-[#1A1917]">Diode + RC</strong> circuit recovers <em>m(t)</em>{' '}
          directly from the positive peaks without needing a synchronized local oscillator. When{' '}
          <strong className="text-[#1A1917]">μ &gt; 1.0</strong>, envelope inversion produces severe
          diode clipping distortion, and the smoothing time constant must satisfy{' '}
          <strong className="text-[#1A1917] font-mono">1/ωc ≪ RC ≪ 1/ωm</strong> to avoid both
          carrier ripple and diagonal clipping.
        </div>
      </div>

      {/* 4-Position Adaptive Workspace Layout */}
      {controllerPos === 'right' && (
        <div className="flex flex-col gap-5 lg:h-[calc(100vh-230px)] lg:min-h-[600px] lg:grid lg:grid-cols-[minmax(0,64fr)_minmax(0,36fr)] lg:overflow-hidden">
          <div className="order-1 min-w-0 lg:h-full lg:overflow-hidden">
            {visualsColumn}
          </div>
          <div className="order-2 min-w-0 space-y-4 lg:h-full lg:overflow-y-auto lg:pr-1.5">
            {controlsCard}
            {diagnosticCard}
            {analyticalCard}
          </div>
        </div>
      )}

      {controllerPos === 'left' && (
        <div className="flex flex-col gap-5 lg:h-[calc(100vh-230px)] lg:min-h-[600px] lg:grid lg:grid-cols-[minmax(0,36fr)_minmax(0,64fr)] lg:overflow-hidden">
          <div className="order-2 lg:order-1 min-w-0 space-y-4 lg:h-full lg:overflow-y-auto lg:pr-1.5">
            {controlsCard}
            {diagnosticCard}
            {analyticalCard}
          </div>
          <div className="order-1 lg:order-2 min-w-0 lg:h-full lg:overflow-hidden">
            {visualsColumn}
          </div>
        </div>
      )}

      {controllerPos === 'top' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
            {controlsCard}
            {diagnosticCard}
          </div>
          {visualsColumn}
          {analyticalCard}
        </div>
      )}

      {controllerPos === 'below' && (
        <div className="space-y-5">
          {visualsColumn}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
            {controlsCard}
            {diagnosticCard}
          </div>
          {analyticalCard}
        </div>
      )}
    </div>
  );
};
