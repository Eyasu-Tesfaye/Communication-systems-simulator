import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Play,
  Pause,
  RotateCcw,
  SlidersHorizontal,
  BookOpen,
  Layers,
  Zap,
  Info,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { AM_MODULES, AMSubTopic } from '../../data/modules';
import { ModuleGlyph } from '../../components/ModuleGlyphs';
import { MathView } from '../../components/MathView';

interface Module2_1_CAMProps {
  onNavigateHome: () => void;
  onNavigateModule: (path: string) => void;
}

type ControllerPos = 'below' | 'top' | 'left' | 'right';

export const Module2_1_CAM: React.FC<Module2_1_CAMProps> = ({
  onNavigateHome,
  onNavigateModule,
}) => {
  const currentSubTopic: AMSubTopic = AM_MODULES[0]; // Module 2.1 CAM

  // Interactive Parameters
  const [modIndex, setModIndex] = useState<number>(0.75); // μ = Am / Ac (0.0 to 1.5)
  const [carrierFreq, setCarrierFreq] = useState<number>(1000); // fc (kHz, MW AM band)
  const [messageFreq, setMessageFreq] = useState<number>(1.0); // fm (kHz, baseband audio)
  const [carrierAmp, setCarrierAmp] = useState<number>(5.0); // Ac (Volts)
  const [showEnvelopes, setShowEnvelopes] = useState<boolean>(true);
  const [showCarrierOnly, setShowCarrierOnly] = useState<boolean>(false);
  const [showBaseband, setShowBaseband] = useState<boolean>(false);
  const [showEnvelopeDetector, setShowEnvelopeDetector] = useState<boolean>(false);
  const [controllerPos, setControllerPos] = useState<ControllerPos>('right');

  // Animation Playback
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<string>('1×');
  const [time, setTime] = useState<number>(0);

  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Canvas Refs
  const timeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const freqCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Speed multiplier
  const speedMultiplier =
    speed === '0.5×' ? 0.5 : speed === '2×' ? 2.0 : 1.0;

  // Animation loop
  useEffect(() => {
    if (isPlaying) {
      const loop = (timestamp: number) => {
        if (!lastTimeRef.current) lastTimeRef.current = timestamp;
        const dt = (timestamp - lastTimeRef.current) / 1000;
        lastTimeRef.current = timestamp;

        setTime((prev) => (prev + dt * speedMultiplier) % 100);
        animFrameRef.current = requestAnimationFrame(loop);
      };

      animFrameRef.current = requestAnimationFrame(loop);
    } else {
      lastTimeRef.current = null;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, speedMultiplier]);

  // Derived Theoretical Metrics
  const Pc = (carrierAmp * carrierAmp) / 2; // Carrier power
  const Psb = (modIndex * modIndex * Pc) / 2; // Total sidebands power
  const Pt = Pc + Psb; // Total transmitted power: Pc(1 + μ²/2)
  const efficiency = Pt > 0 ? (Psb / Pt) * 100 : 0; // η = μ² / (2 + μ²) * 100%
  const bandwidth = 2 * messageFreq;

  // Modulation state classification
  const isUndermodulated = modIndex < 1.0;
  const isCritical = Math.abs(modIndex - 1.0) < 0.02;
  const isOvermodulated = modIndex > 1.0;

  // Oscilloscope peak envelope readouts
  const aMax = showCarrierOnly ? carrierAmp : carrierAmp * (1 + modIndex);
  const aMin = showCarrierOnly ? carrierAmp : carrierAmp * Math.abs(1 - modIndex);
  const measuredMu = aMax + aMin > 0 ? (aMax - aMin) / (aMax + aMin) : 0;

  // Draw Time-Domain Waveform Canvas
  const drawTimeDomain = useCallback(() => {
    const canvas = timeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Coordinate Geometry
    const padL = 46;
    const padR = 24;
    const padT = 24;
    const padB = 30;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;
    const centerY = padT + plotH / 2;
    const peakEnv = carrierAmp * (1 + modIndex);
    const maxVoltage =
      peakEnv <= 4.2 ? 5 : peakEnv <= 10.5 ? 12 : peakEnv <= 21 ? 24 : 28;
    const yTicks =
      maxVoltage === 5
        ? [-4, -2, 2, 4]
        : maxVoltage === 12
        ? [-10, -5, 5, 10]
        : maxVoltage === 24
        ? [-20, -10, 10, 20]
        : [-24, -12, 12, 24];
    const yScale = (plotH / 2) / maxVoltage;

    // Background Grid
    ctx.strokeStyle = '#EFEFEA';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    // Horizontal grid lines
    yTicks.forEach((v) => {
      const y = centerY - v * yScale;
      ctx.beginPath();
      ctx.moveTo(padL, y);
      ctx.lineTo(width - padR, y);
      ctx.stroke();

      ctx.fillStyle = '#A8A69E';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${v > 0 ? '+' : ''}${v}V`, padL - 6, y + 3);
    });

    // Baseline axis
    ctx.setLineDash([]);
    ctx.strokeStyle = '#8A8882';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(padL, centerY);
    ctx.lineTo(width - padR, centerY);
    ctx.stroke();

    // 0V label
    ctx.fillStyle = '#585651';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('0V', padL - 6, centerY + 3);

    // Time window: 2.0 ms (0.002 s) visible across plotW so ~2 cycles of 1 kHz fm are clear
    const timeSpan = 0.002;
    const tOffset = time * 0.0003;
    const fmHz = messageFreq * 1000;
    // Scale carrier display rate proportionally to fc within sub-pixel Nyquist limits to avoid aliasing
    const visualCarrierHz = (carrierFreq / 1000) * 32000;

    // Overmodulation shading (where 1 + μ cos(2π fm t) < 0)
    if (isOvermodulated) {
      ctx.fillStyle = 'rgba(220, 38, 38, 0.08)';
      let inInversion = false;
      let startX = padL;

      for (let px = 0; px <= plotW; px += 2) {
        const t = (px / plotW) * timeSpan + tOffset;
        const envVal = 1 + modIndex * Math.cos(2 * Math.PI * fmHz * t);
        const x = padL + px;

        if (envVal < 0 && !inInversion) {
          inInversion = true;
          startX = x;
        } else if (envVal >= 0 && inInversion) {
          inInversion = false;
          ctx.fillRect(startX, padT, x - startX, plotH);
        }
      }
      if (inInversion) {
        ctx.fillRect(startX, padT, width - padR - startX, plotH);
      }
    }

    // Envelope curves: +Ac[1 + μ m(t)] and -Ac[1 + μ m(t)]
    if (showEnvelopes) {
      // Upper envelope
      ctx.beginPath();
      ctx.strokeStyle = '#C85A32';
      ctx.lineWidth = 1.75;
      ctx.setLineDash([4, 3]);

      for (let px = 0; px <= plotW; px += 2) {
        const t = (px / plotW) * timeSpan + tOffset;
        const env = carrierAmp * (1 + modIndex * Math.cos(2 * Math.PI * fmHz * t));
        const x = padL + px;
        const y = centerY - env * yScale;
        if (px === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Lower envelope (symmetric inverted)
      ctx.beginPath();
      ctx.strokeStyle = '#C85A32';
      ctx.lineWidth = 1.75;
      ctx.setLineDash([4, 3]);

      for (let px = 0; px <= plotW; px += 2) {
        const t = (px / plotW) * timeSpan + tOffset;
        const env = carrierAmp * (1 + modIndex * Math.cos(2 * Math.PI * fmHz * t));
        const x = padL + px;
        const y = centerY + env * yScale;
        if (px === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Baseband reference m(t) overlay
    if (showBaseband) {
      ctx.beginPath();
      ctx.strokeStyle = '#2563EB';
      ctx.lineWidth = 1.75;
      ctx.setLineDash([6, 4]);

      for (let px = 0; px <= plotW; px += 2) {
        const t = (px / plotW) * timeSpan + tOffset;
        const mVal = carrierAmp * Math.cos(2 * Math.PI * fmHz * t);
        const x = padL + px;
        const y = centerY - mVal * yScale;
        if (px === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Modulated Carrier Waveform: s(t) = Ac[1 + μ m(t)] cos(2π fc t)
    ctx.beginPath();
    ctx.strokeStyle = showCarrierOnly ? '#585651' : '#1A1917';
    ctx.lineWidth = 1.5;

    for (let px = 0; px <= plotW; px += 0.25) {
      const t = (px / plotW) * timeSpan + tOffset;
      const env = showCarrierOnly
        ? carrierAmp
        : carrierAmp * (1 + modIndex * Math.cos(2 * Math.PI * fmHz * t));
      const s = env * Math.cos(2 * Math.PI * visualCarrierHz * t);
      const x = padL + px;
      const y = centerY - s * yScale;

      if (px === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Simulated Diode + RC Envelope Detector Output
    if (showEnvelopeDetector) {
      ctx.beginPath();
      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 2.25;

      // Simulate half-wave diode rectification + RC discharge over dense time steps
      const totalSteps = Math.max(400, Math.ceil(plotW * 2));
      const dtStep = timeSpan / totalSteps;
      // RC time constant chosen between 1/ωc and 1/ωm
      const rcTau = 1 / (2 * Math.PI * Math.max(fmHz * 6, 4000));
      const decayFactor = Math.exp(-dtStep / rcTau);
      let vCap = Math.abs(
        showCarrierOnly
          ? carrierAmp
          : carrierAmp * (1 + modIndex * Math.cos(2 * Math.PI * fmHz * tOffset))
      );

      for (let i = 0; i <= totalSteps; i++) {
        const px = (i / totalSteps) * plotW;
        const t = (px / plotW) * timeSpan + tOffset;
        const env = showCarrierOnly
          ? carrierAmp
          : carrierAmp * (1 + modIndex * Math.cos(2 * Math.PI * fmHz * t));
        const sRect = Math.max(0, env * Math.cos(2 * Math.PI * visualCarrierHz * t));
        vCap = Math.max(sRect, vCap * decayFactor);

        const x = padL + px;
        const y = centerY - vCap * yScale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Time Axis Label
    ctx.fillStyle = '#585651';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('Time t → (0–2.0 ms)', width - padR, centerY + 18);

    // Live Legend Inside Canvas
    ctx.textAlign = 'left';
    ctx.font = '10px monospace';
    let legendX = padL + 8;
    ctx.fillStyle = '#1A1917';
    ctx.fillText('s(t): AM Wave', legendX, padT + 14);
    legendX += 108;

    if (showEnvelopes) {
      ctx.fillStyle = '#C85A32';
      ctx.fillText('±E(t): Envelope', legendX, padT + 14);
      legendX += 112;
    }

    if (showBaseband) {
      ctx.fillStyle = '#2563EB';
      ctx.fillText('m(t): Baseband', legendX, padT + 14);
      legendX += 108;
    }

    if (showEnvelopeDetector) {
      ctx.fillStyle = '#059669';
      ctx.fillText('v_det(t): Diode+RC', legendX, padT + 14);
    }

    ctx.restore();
  }, [
    modIndex,
    carrierFreq,
    messageFreq,
    carrierAmp,
    showEnvelopes,
    showCarrierOnly,
    showBaseband,
    showEnvelopeDetector,
    time,
    isOvermodulated,
  ]);

  // Draw Frequency-Domain Spectrum Canvas
  const drawFreqDomain = useCallback(() => {
    const canvas = freqCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const padL = 40;
    const padR = 24;
    const padT = 30;
    const padB = 34;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;
    const baseY = padT + plotH;

    // Frequency display window centered around fc (kHz)
    const span =
      messageFreq <= 0.6
        ? 3
        : messageFreq <= 1.5
        ? 6
        : messageFreq <= 3.0
        ? 12
        : 20;
    const halfSpan = span / 2;
    const minFreq = carrierFreq - halfSpan;
    const fScale = plotW / span;

    // Baseline frequency axis
    ctx.strokeStyle = '#8A8882';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(padL, baseY);
    ctx.lineTo(width - padR, baseY);
    ctx.stroke();

    // Frequency tick marks (kHz)
    const tickStep = span === 3 ? 0.5 : span === 6 ? 1 : span === 12 ? 2 : 4;
    const lsbFreq = carrierFreq - messageFreq;
    const usbFreq = carrierFreq + messageFreq;
    for (
      let offset = -halfSpan + tickStep;
      offset <= halfSpan - tickStep + 1e-6;
      offset += tickStep
    ) {
      const f = carrierFreq + offset;
      const x = padL + (f - minFreq) * fScale;
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.lineTo(x, baseY + 4);
      ctx.stroke();

      const nearSpike =
        Math.abs(f - carrierFreq) < span * 0.09 ||
        Math.abs(f - lsbFreq) < span * 0.09 ||
        Math.abs(f - usbFreq) < span * 0.09;
      if (!nearSpike) {
        ctx.fillStyle = '#8A8882';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        const label = Number.isInteger(f) ? `${f}` : f.toFixed(1);
        ctx.fillText(`${label} kHz`, x, baseY + 16);
      }
    }

    // Spectral Line Heights
    const ampScale = (plotH * 0.75) / (carrierAmp * 0.65);
    const carrierHeight = (carrierAmp / 2) * ampScale;
    const sidebandHeight = ((modIndex * carrierAmp) / 4) * ampScale;

    const fcX = padL + (carrierFreq - minFreq) * fScale;
    const lsbX = padL + (lsbFreq - minFreq) * fScale;
    const usbX = padL + (usbFreq - minFreq) * fScale;

    // Draw LSB Spike
    ctx.beginPath();
    ctx.strokeStyle = '#585651';
    ctx.lineWidth = 2.5;
    ctx.moveTo(lsbX, baseY);
    ctx.lineTo(lsbX, baseY - sidebandHeight);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(lsbX, baseY - sidebandHeight, 3.5, 0, 2 * Math.PI);
    ctx.fillStyle = '#585651';
    ctx.fill();

    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#585651';
    ctx.fillText('LSB', lsbX, baseY - sidebandHeight - 8);
    ctx.fillText(`${lsbFreq.toFixed(1)} kHz`, lsbX, baseY + 26);

    // Draw Carrier Spike
    ctx.beginPath();
    ctx.strokeStyle = '#C85A32';
    ctx.lineWidth = 3;
    ctx.moveTo(fcX, baseY);
    ctx.lineTo(fcX, baseY - carrierHeight);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(fcX, baseY - carrierHeight, 4.5, 0, 2 * Math.PI);
    ctx.fillStyle = '#C85A32';
    ctx.fill();

    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#C85A32';
    ctx.fillText('Carrier (fc)', fcX, baseY - carrierHeight - 10);
    ctx.fillText(`${carrierFreq.toFixed(1)} kHz`, fcX, baseY + 26);

    // Draw USB Spike
    ctx.beginPath();
    ctx.strokeStyle = '#585651';
    ctx.lineWidth = 2.5;
    ctx.moveTo(usbX, baseY);
    ctx.lineTo(usbX, baseY - sidebandHeight);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(usbX, baseY - sidebandHeight, 3.5, 0, 2 * Math.PI);
    ctx.fillStyle = '#585651';
    ctx.fill();

    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = '#585651';
    ctx.fillText('USB', usbX, baseY - sidebandHeight - 8);
    ctx.fillText(`${usbFreq.toFixed(1)} kHz`, usbX, baseY + 26);

    // Transmission Bandwidth Range Dimension Bar (BT = 2fm)
    const dimY = baseY - Math.max(carrierHeight, sidebandHeight) - 22;
    ctx.strokeStyle = '#75736E';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(lsbX, dimY);
    ctx.lineTo(usbX, dimY);
    ctx.moveTo(lsbX, dimY - 4);
    ctx.lineTo(lsbX, dimY + 4);
    ctx.moveTo(usbX, dimY - 4);
    ctx.lineTo(usbX, dimY + 4);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#1A1917';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`BT = 2fm = ${bandwidth.toFixed(1)} kHz`, (lsbX + usbX) / 2, dimY - 6);

    ctx.restore();
  }, [carrierFreq, messageFreq, modIndex, carrierAmp, bandwidth]);

  // Repaint canvases
  useEffect(() => {
    drawTimeDomain();
  }, [drawTimeDomain]);

  useEffect(() => {
    drawFreqDomain();
  }, [drawFreqDomain]);

  // Redraw canvases cleanly on container resize / layout switch (even when paused)
  useEffect(() => {
    const timeCanvas = timeCanvasRef.current;
    const freqCanvas = freqCanvasRef.current;
    if (!timeCanvas && !freqCanvas) return;

    const observer = new ResizeObserver(() => {
      drawTimeDomain();
      drawFreqDomain();
    });

    if (timeCanvas) observer.observe(timeCanvas);
    if (freqCanvas) observer.observe(freqCanvas);

    return () => observer.disconnect();
  }, [drawTimeDomain, drawFreqDomain, controllerPos]);

  const handleResetParameters = () => {
    setModIndex(0.75);
    setCarrierFreq(1000);
    setMessageFreq(1.0);
    setCarrierAmp(5.0);
    setShowEnvelopes(true);
    setShowCarrierOnly(false);
    setShowBaseband(false);
    setShowEnvelopeDetector(false);
    setTime(0);
  };

  return (
    <div className="space-y-6">
      {/* 1. Main Content Container */}
      <div className="py-2">
        {/* Module Header Bar */}
        <div className="pb-6 border-b border-[#E6E4DD] flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-mono font-bold tracking-wider text-[#C85A32] bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/25">
                MODULE 2.1
              </span>
              <span className="text-xs text-[#75736E] font-medium font-mono">{currentSubTopic.tag}</span>
              <span className="text-xs text-[#A8A69E]">·</span>
              <span
                className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border ${
                  isOvermodulated
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : isCritical
                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {isOvermodulated
                  ? 'Overmodulation (μ > 1)'
                  : isCritical
                  ? 'Critical (μ = 1.0)'
                  : 'Undermodulated (μ < 1)'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1917]">
              {currentSubTopic.name}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-[#585651] max-w-3xl leading-relaxed">
              {currentSubTopic.description}
            </p>
          </div>

          {/* Layout Switcher & Quick Nav */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <div
              role="group"
              aria-label="Controls layout position"
              className="inline-flex rounded-md border border-[#E6E4DD] p-0.5 bg-[#FAF9F6] text-xs font-semibold"
            >
              {(['below', 'top', 'left', 'right'] as const).map((pos) => (
                <button
                  key={pos}
                  type="button"
                  onClick={() => setControllerPos(pos)}
                  aria-pressed={controllerPos === pos}
                  className={`px-2 py-1 rounded transition-colors cursor-pointer text-[11px] font-mono ${
                    controllerPos === pos
                      ? 'bg-white shadow-2xs text-[#1A1917]'
                      : 'text-[#75736E] hover:text-[#1A1917]'
                  }`}
                >
                  {pos === 'below'
                    ? 'Bars: Below'
                    : pos === 'top'
                      ? 'Bars: Top'
                      : pos === 'left'
                        ? 'Bars: Left'
                        : 'Bars: Right'}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onNavigateModule('/am/pm')}
                className="px-3 py-1.5 border border-[#E6E4DD] hover:bg-[#FAF9F6] text-xs font-medium text-[#585651] hover:text-[#1A1917] rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Previous: Phase Modulation and Demodulation"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>PM (2.6)</span>
              </button>
              <button
                onClick={() => onNavigateModule('/am/dsb-sc')}
                className="px-3 py-1.5 border border-[#E6E4DD] hover:bg-[#FAF9F6] text-xs font-semibold text-[#1A1917] hover:border-[#C85A32]/40 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Next: DSB-SC"
              >
                <span>Next: DSB-SC (2.2)</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {/* Technical Notice Banner */}
        <div className="mt-6 p-3.5 sm:p-4 rounded-md bg-[#FAF9F6] border border-[#E6E4DD] flex items-start gap-3">
          <Info className="w-4 h-4 text-[#C85A32] shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-[#585651] leading-relaxed">
            <span className="font-semibold text-[#1A1917]">Conventional AM Foundation: </span>
            A high-amplitude carrier A<sub>c</sub> cos(2πf<sub>c</sub>t) is transmitted alongside the message sidebands. This allows low-cost envelope demodulation (diode + RC filter) as long as the modulation index satisfies <strong className="text-[#1A1917]">μ ≤ 1.0</strong>. When μ &gt; 1, envelope inversion causes severe diode clipping distortion.
          </div>
        </div>

        {/* 3. Main Interactive Workspace Stage */}
        {(() => {
          const isSideBySide = controllerPos === 'left' || controllerPos === 'right';

          const graphsColumn = (
            <div className={isSideBySide ? 'flex flex-col gap-4 lg:h-full lg:overflow-hidden' : 'flex flex-col gap-5'}>
              {/* Visualizer Card 1: Time Domain Oscilloscope */}
              <div
                className={`bg-white rounded-lg border border-[#E6E4DD] shadow-xs flex flex-col ${
                  isSideBySide ? 'p-4 lg:flex-[56_1_0%] lg:min-h-0 lg:overflow-hidden' : 'p-4 sm:p-5'
                }`}
              >
                <div className={`flex flex-wrap items-center justify-between border-b border-[#E6E4DD] gap-2 shrink-0 ${isSideBySide ? 'pb-2 mb-2' : 'pb-3 mb-3'}`}>
                <div className="flex items-center gap-2">
                  <ModuleGlyph id="cam" className="w-4 h-4" accent={true} />
                  <h2 className="text-xs font-bold tracking-tight text-[#1A1917] uppercase font-mono">
                    Time-Domain Waveform & Envelope
                  </h2>
                </div>

                {/* Toolbar controls */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-colors flex items-center gap-1 cursor-pointer border ${
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
                    onClick={handleResetParameters}
                    className="p-1 bg-white border border-[#E6E4DD] rounded text-[#585651] hover:text-[#1A1917] transition-colors shadow-2xs cursor-pointer"
                    title="Reset parameters to defaults"
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

              {/* Time Canvas */}
              <div
                className={`relative w-full bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden ${
                  isSideBySide ? 'h-56 lg:flex-1 lg:min-h-[120px]' : 'h-64 sm:h-72'
                }`}
              >
                <canvas ref={timeCanvasRef} className="w-full h-full block" />
              </div>

              {/* Overmodulation Warning Callout */}
              {isOvermodulated && (
                <div className={`${isSideBySide ? 'mt-2 p-2.5' : 'mt-3 p-3'} bg-red-50 border border-red-200 rounded-md flex items-center gap-2.5 text-xs text-red-800 shrink-0`}>
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>
                    <strong>Overmodulation Alert (μ = {modIndex.toFixed(2)} &gt; 1.0):</strong> The envelope A<sub>c</sub>[1 + μ m(t)] crosses below zero (shaded red). Simple diode envelope detectors cannot track the negative excursion and will output severe non-linear harmonic distortion.
                  </span>
                </div>
              )}

              {/* Live Oscilloscope Peak Readouts */}
              <div className={`${isSideBySide ? 'mt-2' : 'mt-3'} px-3 py-2 bg-[#FAF9F6] border border-[#E6E4DD] rounded-md flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#585651] shrink-0`}>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span>
                    A<sub>max</sub> = A<sub>c</sub>(1 + μ) = <strong className="text-[#1A1917]">{aMax.toFixed(2)} V</strong>
                  </span>
                  <span>
                    A<sub>min</sub> = A<sub>c</sub>|1 − μ| = <strong className="text-[#1A1917]">{aMin.toFixed(2)} V</strong>
                  </span>
                </div>
                {modIndex <= 1.0 ? (
                  <span className="text-[#C85A32] font-semibold">
                    μ = (A<sub>max</sub> − A<sub>min</sub>) / (A<sub>max</sub> + A<sub>min</sub>) = {measuredMu.toFixed(2)}
                  </span>
                ) : (
                  <span className="text-red-700 font-semibold">
                    Phase Reversal: |1 − μ| &gt; 0 (μ &gt; 1)
                  </span>
                )}
              </div>

              {/* View options */}
              <div className={`${isSideBySide ? 'mt-2 pt-2' : 'mt-3 pt-3'} border-t border-[#E6E4DD] flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#585651] shrink-0`}>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showEnvelopes}
                    onChange={(e) => setShowEnvelopes(e.target.checked)}
                    className="accent-[#C85A32] rounded"
                  />
                  <span>Show Envelope Bounds ±E(t)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showCarrierOnly}
                    onChange={(e) => setShowCarrierOnly(e.target.checked)}
                    className="accent-[#C85A32] rounded"
                  />
                  <span>Carrier Only (Unmodulated)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showBaseband}
                    onChange={(e) => setShowBaseband(e.target.checked)}
                    className="accent-[#2563EB] rounded"
                  />
                  <span>Show Baseband m(t)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showEnvelopeDetector}
                    onChange={(e) => setShowEnvelopeDetector(e.target.checked)}
                    className="accent-[#059669] rounded"
                  />
                  <span>Diode Envelope Detector</span>
                </label>
              </div>
            </div>

            {/* Visualizer Card 2: Frequency Spectrum Canvas */}
            <div
              className={`bg-white rounded-lg border border-[#E6E4DD] shadow-xs flex flex-col ${
                isSideBySide ? 'p-4 lg:flex-[44_1_0%] lg:min-h-0 lg:overflow-hidden' : 'p-4 sm:p-5'
              }`}
            >
              <div className={`flex items-center justify-between border-b border-[#E6E4DD] shrink-0 ${isSideBySide ? 'pb-2 mb-2' : 'pb-3 mb-3'}`}>
                <div className="flex items-center gap-2">
                  <ModuleGlyph id="fourier" className="w-4 h-4" accent={true} />
                  <h2 className="text-xs font-bold tracking-tight text-[#1A1917] uppercase font-mono">
                    Double-Sideband Line Spectrum |S(f)|
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-[#75736E]">
                  Transmission Bandwidth: B<sub>T</sub> = 2f<sub>m</sub> = {bandwidth.toFixed(1)} kHz
                </span>
              </div>

              {/* Frequency Canvas */}
              <div
                className={`relative w-full bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden ${
                  isSideBySide ? 'h-44 lg:flex-1 lg:min-h-[120px]' : 'h-44 sm:h-52'
                }`}
              >
                <canvas ref={freqCanvasRef} className="w-full h-full block" />
              </div>

              {/* Spectral Decomposition Summary */}
              <div className={`${isSideBySide ? 'mt-2.5' : 'mt-4'} grid grid-cols-3 gap-2 text-center text-xs font-mono shrink-0`}>
                <div className="p-2 bg-[#FAF9F6] border border-[#E6E4DD] rounded">
                  <div className="text-[10px] text-[#75736E]">LOWER SIDEBAND (LSB)</div>
                  <div className="font-bold text-[#1A1917] mt-0.5">{(carrierFreq - messageFreq).toFixed(1)} kHz</div>
                  <div className="text-[10px] text-[#8A8882]">Amp: {((modIndex * carrierAmp) / 4).toFixed(2)} V</div>
                </div>
                <div className="p-2 bg-[#FBF4F0] border border-[#C85A32]/30 rounded">
                  <div className="text-[10px] text-[#C85A32] font-semibold">CARRIER COMPONENT</div>
                  <div className="font-bold text-[#C85A32] mt-0.5">{carrierFreq.toFixed(1)} kHz</div>
                  <div className="text-[10px] text-[#C85A32]/80">Amp: {(carrierAmp / 2).toFixed(2)} V</div>
                </div>
                <div className="p-2 bg-[#FAF9F6] border border-[#E6E4DD] rounded">
                  <div className="text-[10px] text-[#75736E]">UPPER SIDEBAND (USB)</div>
                  <div className="font-bold text-[#1A1917] mt-0.5">{(carrierFreq + messageFreq).toFixed(1)} kHz</div>
                  <div className="text-[10px] text-[#8A8882]">Amp: {((modIndex * carrierAmp) / 4).toFixed(2)} V</div>
                </div>
              </div>
            </div>
          </div>
          );

          // Interactive Control Deck
          const modulationParamsCard = (
            <div className="bg-white rounded-lg border border-[#E6E4DD] p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E6E4DD]">
                <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] flex items-center gap-1.5 font-bold">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#C85A32]" />
                  <span>Modulation Parameters</span>
                </div>
                <button
                  onClick={handleResetParameters}
                  className="text-[11px] font-mono text-[#75736E] hover:text-[#C85A32] transition-colors cursor-pointer"
                >
                  Reset
                </button>
              </div>

              {/* Slider 1: Modulation Index μ */}
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="mod-index-slider" className="font-semibold text-[#1A1917]">
                    Modulation Index (μ = A<sub>m</sub>/A<sub>c</sub>)
                  </label>
                  <span className="font-mono font-bold text-[#C85A32] text-sm">
                    {modIndex.toFixed(2)}
                  </span>
                </div>
                <p className="text-[10px] font-mono text-[#75736E]">
                  μ = k<sub>a</sub> · A<sub>m</sub> (sensitivity k<sub>a</sub> = 1/A<sub>c</sub>)
                </p>
                <input
                  id="mod-index-slider"
                  type="range"
                  min="0.0"
                  max="1.5"
                  step="0.05"
                  value={modIndex}
                  onChange={(e) => setModIndex(parseFloat(e.target.value))}
                  className="w-full accent-[#C85A32] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-[#8A8882]">
                  <span>0.0 (Unmodulated)</span>
                  <span>1.0 (Critical)</span>
                  <span>1.5 (Overmod)</span>
                </div>
              </div>

              {/* Slider 2: Carrier Frequency fc */}
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="carrier-freq-slider" className="font-semibold text-[#1A1917]">
                    Carrier Frequency (fc)
                  </label>
                  <span className="font-mono text-[#1A1917] text-xs font-bold">
                    {carrierFreq} kHz
                  </span>
                </div>
                <input
                  id="carrier-freq-slider"
                  type="range"
                  min="530"
                  max="1710"
                  step="10"
                  value={carrierFreq}
                  onChange={(e) => setCarrierFreq(parseInt(e.target.value, 10))}
                  className="w-full accent-[#C85A32] cursor-pointer"
                />
              </div>

              {/* Slider 3: Message Frequency fm */}
              <div className="space-y-1.5 mb-4">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="msg-freq-slider" className="font-semibold text-[#1A1917]">
                    Message Frequency (fm)
                  </label>
                  <span className="font-mono text-[#1A1917] text-xs font-bold">
                    {messageFreq.toFixed(1)} kHz
                  </span>
                </div>
                <input
                  id="msg-freq-slider"
                  type="range"
                  min="0.3"
                  max="5.0"
                  step="0.1"
                  value={messageFreq}
                  onChange={(e) => setMessageFreq(parseFloat(e.target.value))}
                  className="w-full accent-[#C85A32] cursor-pointer"
                />
              </div>

              {/* Slider 4: Carrier Amplitude Ac */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <label htmlFor="carrier-amp-slider" className="font-semibold text-[#1A1917]">
                    Carrier Peak Voltage (Ac)
                  </label>
                  <span className="font-mono text-[#1A1917] text-xs font-bold">
                    {carrierAmp.toFixed(1)} V
                  </span>
                </div>
                <input
                  id="carrier-amp-slider"
                  type="range"
                  min="1.0"
                  max="10.0"
                  step="0.5"
                  value={carrierAmp}
                  onChange={(e) => setCarrierAmp(parseFloat(e.target.value))}
                  className="w-full accent-[#C85A32] cursor-pointer"
                />
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
                      setModIndex(0.5);
                      setShowCarrierOnly(false);
                    }}
                    className={`px-2 py-1 rounded text-[11px] font-mono border transition-colors cursor-pointer ${
                      Math.abs(modIndex - 0.5) < 0.01 && !showCarrierOnly
                        ? 'bg-[#C85A32] text-white border-[#C85A32]'
                        : 'bg-[#FAF9F6] text-[#585651] border-[#E6E4DD] hover:text-[#1A1917]'
                    }`}
                  >
                    Under-Modulated (μ=0.5)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModIndex(1.0);
                      setShowCarrierOnly(false);
                    }}
                    className={`px-2 py-1 rounded text-[11px] font-mono border transition-colors cursor-pointer ${
                      Math.abs(modIndex - 1.0) < 0.01 && !showCarrierOnly
                        ? 'bg-[#C85A32] text-white border-[#C85A32]'
                        : 'bg-[#FAF9F6] text-[#585651] border-[#E6E4DD] hover:text-[#1A1917]'
                    }`}
                  >
                    100% Critical (μ=1.0)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setModIndex(1.3);
                      setShowCarrierOnly(false);
                    }}
                    className={`px-2 py-1 rounded text-[11px] font-mono border transition-colors cursor-pointer ${
                      Math.abs(modIndex - 1.3) < 0.01 && !showCarrierOnly
                        ? 'bg-[#C85A32] text-white border-[#C85A32]'
                        : 'bg-[#FAF9F6] text-[#585651] border-[#E6E4DD] hover:text-[#1A1917]'
                    }`}
                  >
                    Over-Modulated (μ=1.3)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCarrierFreq(1000);
                      setMessageFreq(5.0);
                      setShowCarrierOnly(false);
                    }}
                    className={`px-2 py-1 rounded text-[11px] font-mono border transition-colors cursor-pointer ${
                      carrierFreq === 1000 && Math.abs(messageFreq - 5.0) < 0.05 && !showCarrierOnly
                        ? 'bg-[#C85A32] text-white border-[#C85A32]'
                        : 'bg-[#FAF9F6] text-[#585651] border-[#E6E4DD] hover:text-[#1A1917]'
                    }`}
                  >
                    AM Broadcast (fc=1000 kHz, fm=5 kHz)
                  </button>
                </div>
              </div>
            </div>
          );

          // Power & Efficiency Analytics Card
          const powerEfficiencyCard = (
            <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-4 sm:p-5 shadow-xs">
              <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-3 flex items-center gap-1.5 font-bold">
                <Zap className="w-3.5 h-3.5 text-[#C85A32]" />
                <span>Power Distribution & Efficiency</span>
              </div>

              {/* Efficiency gauge */}
              <div className="mb-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-[#585651]">Modulation Efficiency (η):</span>
                  <span className="font-mono font-bold text-[#C85A32] text-sm">
                    {efficiency.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full h-2 bg-[#EFEFEA] rounded-full overflow-hidden border border-[#E6E4DD]">
                  <div
                    className="h-full bg-[#C85A32] transition-all duration-150"
                    style={{ width: `${Math.min(efficiency, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-1">
                  <span>0%</span>
                  <span>Max Ideal: 33.3% (at μ=1)</span>
                  <span>50%</span>
                </div>
              </div>

              {/* Bandwidth Efficiency row */}
              <div className="flex items-center justify-between gap-2 p-2 mb-3 bg-white rounded border border-[#E6E4DD] text-xs font-mono">
                <span className="text-[#585651]">
                  Bandwidth Efficiency (η<sub>BW</sub>) <span className="text-[10px] text-[#8A8882]">(B<sub>m</sub> / B<sub>AM</sub>)</span>:
                </span>
                <span className="font-bold text-[#1A1917] shrink-0">50.0%</span>
              </div>

              {/* Power breakdown stats */}
              <div className="space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between p-2 bg-white rounded border border-[#E6E4DD]">
                  <span className="text-[#585651]">Carrier Power (Pc):</span>
                  <span className="font-bold text-[#1A1917]">{Pc.toFixed(2)} W ({( (Pc / Pt) * 100 ).toFixed(1)}%)</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-white rounded border border-[#E6E4DD]">
                  <span className="text-[#585651]">Sideband Power (Psb):</span>
                  <span className="font-bold text-[#C85A32]">{Psb.toFixed(2)} W ({efficiency.toFixed(1)}%)</span>
                </div>
                <div className="flex items-center justify-between p-2 bg-white rounded border border-[#E6E4DD]">
                  <span className="text-[#585651]">Total RF Power (Pt):</span>
                  <span className="font-bold text-[#1A1917]">{Pt.toFixed(2)} W (100%)</span>
                </div>
              </div>
            </div>
          );

          const analyticalFormulationCard = (
            <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-4 sm:p-5 shadow-xs">
              <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-2 flex items-center gap-1.5 font-bold">
                <BookOpen className="w-3.5 h-3.5 text-[#585651]" />
                <span>Analytical Formulation</span>
              </div>
              <div className="text-xs text-[#585651] mb-2 font-medium">
                {currentSubTopic.formulaLabel}
              </div>
              <div className="p-3 bg-white rounded border border-[#E6E4DD] text-xs font-semibold text-[#1A1917] overflow-x-auto">
                <MathView math={currentSubTopic.formula} displayMode={true} />
              </div>
            </div>
          );

          const hardwareCard = (
            <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-4 sm:p-5 shadow-xs">
              <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-3 flex items-center gap-1.5 font-bold">
                <Layers className="w-3.5 h-3.5 text-[#585651]" />
                <span>Hardware Architecture & Real-World Use</span>
              </div>
              <ul className="space-y-2.5 text-xs text-[#484642] leading-snug">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#C85A32] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-[#1A1917]">Modulator:</strong> Square-law / nonlinear device + BPF tuned to f<sub>c</sub>.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#C85A32] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-[#1A1917]">Demodulator:</strong> Non-coherent Diode + RC envelope detector (1/ω<sub>c</sub> ≪ RC ≪ 1/ω<sub>m</sub>, valid only for μ ≤ 1).
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#C85A32] shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-[#1A1917]">Applications:</strong> Medium-Wave (530–1710 kHz) &amp; Short-Wave (2.3–26 MHz) AM broadcasting, CB &amp; Maritime HF voice.
                  </span>
                </li>
              </ul>
            </div>
          );

          if (controllerPos === 'right') {
            return (
              <div className="mt-6 flex flex-col gap-6 lg:h-[calc(100vh-220px)] lg:min-h-[600px] lg:grid lg:grid-cols-[minmax(0,64fr)_minmax(0,36fr)] lg:overflow-hidden">
                <div className="order-1 min-w-0 lg:h-full lg:overflow-hidden">
                  {graphsColumn}
                </div>
                <div className="order-2 min-w-0 space-y-4 lg:h-full lg:overflow-y-auto lg:pr-1.5">
                  {modulationParamsCard}
                  {powerEfficiencyCard}
                  {analyticalFormulationCard}
                  {hardwareCard}
                </div>
              </div>
            );
          }

          if (controllerPos === 'left') {
            return (
              <div className="mt-6 flex flex-col gap-6 lg:h-[calc(100vh-220px)] lg:min-h-[600px] lg:grid lg:grid-cols-[minmax(0,36fr)_minmax(0,64fr)] lg:overflow-hidden">
                <div className="order-2 lg:order-1 min-w-0 space-y-4 lg:h-full lg:overflow-y-auto lg:pr-1.5">
                  {modulationParamsCard}
                  {powerEfficiencyCard}
                  {analyticalFormulationCard}
                  {hardwareCard}
                </div>
                <div className="order-1 lg:order-2 min-w-0 lg:h-full lg:overflow-hidden">
                  {graphsColumn}
                </div>
              </div>
            );
          }

          if (controllerPos === 'top') {
            return (
              <div className="mt-6 space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
                  {modulationParamsCard}
                  {powerEfficiencyCard}
                </div>
                {graphsColumn}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
                  {analyticalFormulationCard}
                  {hardwareCard}
                </div>
              </div>
            );
          }

          return (
            <div className="mt-6 space-y-6">
              {graphsColumn}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
                {modulationParamsCard}
                {powerEfficiencyCard}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
                {analyticalFormulationCard}
                {hardwareCard}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
