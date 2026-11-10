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

export const Module2_1_CAM: React.FC<Module2_1_CAMProps> = ({
  onNavigateHome,
  onNavigateModule,
}) => {
  const currentSubTopic: AMSubTopic = AM_MODULES[0]; // Module 2.1 CAM

  // Interactive Parameters
  const [modIndex, setModIndex] = useState<number>(0.75); // μ = Am / Ac (0.0 to 1.5)
  const [carrierFreq, setCarrierFreq] = useState<number>(24); // fc (Hz, visual scale)
  const [messageFreq, setMessageFreq] = useState<number>(2.0); // fm (Hz, visual scale)
  const [carrierAmp, setCarrierAmp] = useState<number>(2.0); // Ac (Volts)
  const [showEnvelopes, setShowEnvelopes] = useState<boolean>(true);
  const [showCarrierOnly, setShowCarrierOnly] = useState<boolean>(false);

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
    const maxVoltage = 5.0; // max display voltage range
    const yScale = (plotH / 2) / maxVoltage;

    // Background Grid
    ctx.strokeStyle = '#EFEFEA';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    // Horizontal grid lines
    [-4, -2, 2, 4].forEach((v) => {
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

    // Time window: 1.0 second visible across plotW
    const timeSpan = 1.0;

    // Overmodulation shading (where 1 + μ cos(2π fm t) < 0)
    if (isOvermodulated) {
      ctx.fillStyle = 'rgba(220, 38, 38, 0.08)';
      let inInversion = false;
      let startX = padL;

      for (let px = 0; px <= plotW; px += 2) {
        const t = (px / plotW) * timeSpan + time * 0.15;
        const envVal = 1 + modIndex * Math.cos(2 * Math.PI * messageFreq * t);
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
        const t = (px / plotW) * timeSpan + time * 0.15;
        const env = carrierAmp * (1 + modIndex * Math.cos(2 * Math.PI * messageFreq * t));
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
        const t = (px / plotW) * timeSpan + time * 0.15;
        const env = carrierAmp * (1 + modIndex * Math.cos(2 * Math.PI * messageFreq * t));
        const x = padL + px;
        const y = centerY + env * yScale;
        if (px === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Modulated Carrier Waveform: s(t) = Ac[1 + μ m(t)] cos(2π fc t)
    ctx.beginPath();
    ctx.strokeStyle = showCarrierOnly ? '#585651' : '#1A1917';
    ctx.lineWidth = 1.75;

    for (let px = 0; px <= plotW; px += 1) {
      const t = (px / plotW) * timeSpan + time * 0.15;
      const env = showCarrierOnly
        ? carrierAmp
        : carrierAmp * (1 + modIndex * Math.cos(2 * Math.PI * messageFreq * t));
      const s = env * Math.cos(2 * Math.PI * carrierFreq * t);
      const x = padL + px;
      const y = centerY - s * yScale;

      if (px === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Time Axis Label
    ctx.fillStyle = '#585651';
    ctx.font = '10px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('Time t → (1.0 s)', width - padR, centerY + 18);

    // Live Legend Inside Canvas
    ctx.textAlign = 'left';
    ctx.font = '10px monospace';
    ctx.fillStyle = '#1A1917';
    ctx.fillText('s(t): Modulated AM Wave', padL + 8, padT + 14);

    if (showEnvelopes) {
      ctx.fillStyle = '#C85A32';
      ctx.fillText('±E(t): Envelope Bound', padL + 180, padT + 14);
    }

    ctx.restore();
  }, [
    modIndex,
    carrierFreq,
    messageFreq,
    carrierAmp,
    showEnvelopes,
    showCarrierOnly,
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

    // Frequency display window: 0 to 45 Hz
    const maxFreq = 45;
    const fScale = plotW / maxFreq;

    // Baseline frequency axis
    ctx.strokeStyle = '#8A8882';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(padL, baseY);
    ctx.lineTo(width - padR, baseY);
    ctx.stroke();

    // Frequency tick marks
    [0, 10, 20, 30, 40].forEach((f) => {
      const x = padL + f * fScale;
      ctx.beginPath();
      ctx.moveTo(x, baseY);
      ctx.lineTo(x, baseY + 4);
      ctx.stroke();

      ctx.fillStyle = '#8A8882';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${f}Hz`, x, baseY + 16);
    });

    // Spectral Line Heights
    const ampScale = (plotH * 0.75) / (carrierAmp * 0.65);
    const carrierHeight = (carrierAmp / 2) * ampScale;
    const sidebandHeight = ((modIndex * carrierAmp) / 4) * ampScale;

    const fcX = padL + carrierFreq * fScale;
    const lsbX = padL + (carrierFreq - messageFreq) * fScale;
    const usbX = padL + (carrierFreq + messageFreq) * fScale;

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
    ctx.fillText(`${(carrierFreq - messageFreq).toFixed(1)}Hz`, lsbX, baseY + 26);

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
    ctx.fillText(`${carrierFreq.toFixed(1)}Hz`, fcX, baseY + 26);

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
    ctx.fillText(`${(carrierFreq + messageFreq).toFixed(1)}Hz`, usbX, baseY + 26);

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
    ctx.fillText(`BT = 2fm = ${bandwidth.toFixed(1)} Hz`, (lsbX + usbX) / 2, dimY - 6);

    ctx.restore();
  }, [carrierFreq, messageFreq, modIndex, carrierAmp, bandwidth]);

  // Repaint canvases
  useEffect(() => {
    drawTimeDomain();
  }, [drawTimeDomain]);

  useEffect(() => {
    drawFreqDomain();
  }, [drawFreqDomain]);

  const handleResetParameters = () => {
    setModIndex(0.75);
    setCarrierFreq(24);
    setMessageFreq(2.0);
    setCarrierAmp(2.0);
    setShowEnvelopes(true);
    setShowCarrierOnly(false);
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

          {/* Quick switcher to next/prev */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigateModule('/am/demodulation')}
              className="px-3 py-1.5 border border-[#E6E4DD] hover:bg-[#FAF9F6] text-xs font-medium text-[#585651] hover:text-[#1A1917] rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Previous: Demodulation and Detection"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Demod (07)</span>
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

        {/* Technical Notice Banner */}
        <div className="mt-6 p-3.5 sm:p-4 rounded-md bg-[#FAF9F6] border border-[#E6E4DD] flex items-start gap-3">
          <Info className="w-4 h-4 text-[#C85A32] shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-[#585651] leading-relaxed">
            <span className="font-semibold text-[#1A1917]">Conventional AM Foundation: </span>
            A high-amplitude carrier $A_c \cos(2\pi f_c t)$ is transmitted alongside the message sidebands. This allows low-cost envelope demodulation (diode + RC filter) as long as the modulation index satisfies <strong className="text-[#1A1917]">$\mu \le 1.0$</strong>. When $\mu &gt; 1$, envelope inversion causes severe diode clipping distortion.
          </div>
        </div>

        {/* 3. Main Interactive Workspace Stage */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Visualizers (8 Columns) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            {/* Visualizer Card 1: Time Domain Oscilloscope */}
            <div className="bg-white rounded-lg border border-[#E6E4DD] p-4 sm:p-5 shadow-xs flex flex-col">
              <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-[#E6E4DD] gap-2">
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
              <div className="relative w-full h-64 sm:h-72 bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden">
                <canvas ref={timeCanvasRef} className="w-full h-full block" />
              </div>

              {/* Overmodulation Warning Callout */}
              {isOvermodulated && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2.5 text-xs text-red-800">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>
                    <strong>Overmodulation Alert (μ = {modIndex.toFixed(2)} &gt; 1.0):</strong> The envelope $A_c[1 + \mu m(t)]$ crosses below zero (shaded red). Simple diode envelope detectors cannot track the negative excursion and will output severe non-linear harmonic distortion.
                  </span>
                </div>
              )}

              {/* View options */}
              <div className="mt-4 pt-3 border-t border-[#E6E4DD] flex items-center justify-between text-xs text-[#585651]">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showEnvelopes}
                      onChange={(e) => setShowEnvelopes(e.target.checked)}
                      className="accent-[#C85A32] rounded"
                    />
                    <span>Show Envelope Bounds $\pm E(t)$</span>
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
                </div>
                <span className="font-mono text-[11px] text-[#8A8882]">fc = {carrierFreq} Hz · fm = {messageFreq} Hz</span>
              </div>
            </div>

            {/* Visualizer Card 2: Frequency Spectrum Canvas */}
            <div className="bg-white rounded-lg border border-[#E6E4DD] p-4 sm:p-5 shadow-xs flex flex-col">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E6E4DD]">
                <div className="flex items-center gap-2">
                  <ModuleGlyph id="fourier" className="w-4 h-4" accent={true} />
                  <h2 className="text-xs font-bold tracking-tight text-[#1A1917] uppercase font-mono">
                    Double-Sideband Line Spectrum |S(f)|
                  </h2>
                </div>
                <span className="text-[11px] font-mono text-[#75736E]">
                  Transmission Bandwidth: $B_T = 2f_m = {bandwidth.toFixed(1)}$ Hz
                </span>
              </div>

              {/* Frequency Canvas */}
              <div className="relative w-full h-44 sm:h-52 bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden">
                <canvas ref={freqCanvasRef} className="w-full h-full block" />
              </div>

              {/* Spectral Decomposition Summary */}
              <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-mono">
                <div className="p-2 bg-[#FAF9F6] border border-[#E6E4DD] rounded">
                  <div className="text-[10px] text-[#75736E]">LOWER SIDEBAND (LSB)</div>
                  <div className="font-bold text-[#1A1917] mt-0.5">{(carrierFreq - messageFreq).toFixed(1)} Hz</div>
                  <div className="text-[10px] text-[#8A8882]">Amp: {((modIndex * carrierAmp) / 4).toFixed(2)} V</div>
                </div>
                <div className="p-2 bg-[#FBF4F0] border border-[#C85A32]/30 rounded">
                  <div className="text-[10px] text-[#C85A32] font-semibold">CARRIER COMPONENT</div>
                  <div className="font-bold text-[#C85A32] mt-0.5">{carrierFreq.toFixed(1)} Hz</div>
                  <div className="text-[10px] text-[#C85A32]/80">Amp: {(carrierAmp / 2).toFixed(2)} V</div>
                </div>
                <div className="p-2 bg-[#FAF9F6] border border-[#E6E4DD] rounded">
                  <div className="text-[10px] text-[#75736E]">UPPER SIDEBAND (USB)</div>
                  <div className="font-bold text-[#1A1917] mt-0.5">{(carrierFreq + messageFreq).toFixed(1)} Hz</div>
                  <div className="text-[10px] text-[#8A8882]">Amp: {((modIndex * carrierAmp) / 4).toFixed(2)} V</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive Parameter Deck & Theory (4 Columns) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Interactive Control Deck */}
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
                    Modulation Index (μ = Am/Ac)
                  </label>
                  <span className="font-mono font-bold text-[#C85A32] text-sm">
                    {modIndex.toFixed(2)}
                  </span>
                </div>
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
                    {carrierFreq} Hz
                  </span>
                </div>
                <input
                  id="carrier-freq-slider"
                  type="range"
                  min="12"
                  max="36"
                  step="1"
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
                    {messageFreq.toFixed(1)} Hz
                  </span>
                </div>
                <input
                  id="msg-freq-slider"
                  type="range"
                  min="1.0"
                  max="4.0"
                  step="0.2"
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
                  max="3.5"
                  step="0.25"
                  value={carrierAmp}
                  onChange={(e) => setCarrierAmp(parseFloat(e.target.value))}
                  className="w-full accent-[#C85A32] cursor-pointer"
                />
              </div>
            </div>

            {/* Power & Efficiency Analytics Card */}
            <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-4 sm:p-5 shadow-xs">
              <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-3 flex items-center gap-1.5 font-bold">
                <Zap className="w-3.5 h-3.5 text-[#C85A32]" />
                <span>Power Distribution & Efficiency</span>
              </div>

              {/* Efficiency gauge */}
              <div className="mb-4">
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

            {/* Mathematical Model Card */}
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

            {/* Curricular Focus Areas */}
            <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-4 sm:p-5 shadow-xs">
              <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-3 flex items-center gap-1.5 font-bold">
                <Layers className="w-3.5 h-3.5 text-[#585651]" />
                <span>Curricular Topics</span>
              </div>
              <ul className="space-y-2.5">
                {currentSubTopic.topics.map((t, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-[#484642] leading-snug">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#C85A32] shrink-0 mt-0.5" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
