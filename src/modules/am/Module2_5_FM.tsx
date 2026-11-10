import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Play,
  Pause,
  RotateCcw,
  SlidersHorizontal,
  BookOpen,
  Layers,
  Info,
  CheckCircle2,
  Sparkles,
  Radio,
} from 'lucide-react';
import { AM_MODULES, AMSubTopic } from '../../data/modules';
import { ModuleGlyph } from '../../components/ModuleGlyphs';
import { MathView } from '../../components/MathView';

interface Module2_5_FMProps {
  onNavigateHome: () => void;
  onNavigateModule: (path: string) => void;
}

export const Module2_5_FM: React.FC<Module2_5_FMProps> = ({
  onNavigateHome,
  onNavigateModule,
}) => {
  const currentSubTopic: AMSubTopic = AM_MODULES[4]; // Module 2.5 FM

  // Interactive Parameters
  const [carrierFreq, setCarrierFreq] = useState<number>(30); // fc (Hz, visual scale)
  const [messageFreq, setMessageFreq] = useState<number>(2.0); // fm (Hz)
  const [freqDev, setFreqDev] = useState<number>(12); // Δf (Hz)
  const [carrierAmp, setCarrierAmp] = useState<number>(2.0); // Ac
  const [msgWaveform, setMsgWaveform] = useState<'sin' | 'square' | 'triangle'>('sin');

  // Computed Modulation Index beta = Δf / fm
  const modIndex = freqDev / messageFreq; // β
  const carsonsBw = 2 * (freqDev + messageFreq); // Carson's Rule B_T = 2(Δf + fm)
  const isNarrowband = modIndex < 1.0;

  // Animation Playback
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<string>('1×');
  const [time, setTime] = useState<number>(0);

  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const timeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const freqCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const speedMultiplier = speed === '0.5×' ? 0.5 : speed === '2×' ? 2.0 : 1.0;

  // Animation loop
  useEffect(() => {
    if (isPlaying) {
      const loop = (timestamp: number) => {
        if (!lastTimeRef.current) lastTimeRef.current = timestamp;
        const dt = (timestamp - lastTimeRef.current) / 1000;
        lastTimeRef.current = timestamp;
        setTime((prev) => prev + dt * speedMultiplier);
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

  // Message signal function m(t) normalized to [-1, 1]
  const evalMessage = (t: number): number => {
    const phase = 2 * Math.PI * messageFreq * t;
    if (msgWaveform === 'sin') {
      return Math.sin(phase);
    } else if (msgWaveform === 'square') {
      return Math.sin(phase) >= 0 ? 1 : -1;
    } else {
      // Triangle
      const norm = ((t * messageFreq) % 1 + 1) % 1;
      return norm < 0.5 ? 4 * norm - 1 : 3 - 4 * norm;
    }
  };

  // Phase integral for FM: θ(t) = 2π fc t + 2π Δf ∫ m(τ) dτ
  const evalPhase = (t: number): number => {
    const carrierPhase = 2 * Math.PI * carrierFreq * t;
    if (msgWaveform === 'sin') {
      // ∫ sin(2π fm t) dt = -cos(2π fm t) / (2π fm)
      // 2π Δf * (-cos / 2π fm) = -(Δf / fm) * cos = -β cos(2π fm t)
      return carrierPhase - modIndex * Math.cos(2 * Math.PI * messageFreq * t);
    } else {
      // Approximate numerically
      const steps = 16;
      const dt = t / steps;
      let sum = 0;
      for (let i = 0; i < steps; i++) {
        sum += evalMessage(i * dt) * dt;
      }
      return carrierPhase + 2 * Math.PI * freqDev * sum;
    }
  };

  // Render Time Domain Canvas
  useEffect(() => {
    const canvas = timeCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Subtle background grid
    ctx.strokeStyle = '#F0EEE6';
    ctx.lineWidth = 1;
    const gridCols = 10;
    const gridRows = 6;
    for (let i = 1; i < gridCols; i++) {
      const x = (i * width) / gridCols;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let j = 1; j < gridRows; j++) {
      const y = (j * height) / gridRows;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Baseline
    const midY = height / 2;
    ctx.strokeStyle = '#D1CFCE';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(width, midY);
    ctx.stroke();
    ctx.setLineDash([]);

    const windowDuration = 1.0; // 1 second window
    const scaleY = (height / 2) * 0.38;

    // 1. Draw Modulating Baseband Signal m(t) in Gold
    ctx.beginPath();
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 2;
    for (let px = 0; px < width; px++) {
      const tSample = time + (px / width) * windowDuration;
      const mVal = evalMessage(tSample);
      const py = midY - mVal * scaleY * 0.9;
      if (px === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // 2. Draw Frequency Modulated Signal s_FM(t) in Terracotta
    ctx.beginPath();
    ctx.strokeStyle = '#C85A32';
    ctx.lineWidth = 2;
    for (let px = 0; px < width; px++) {
      const tSample = time + (px / width) * windowDuration;
      const theta = evalPhase(tSample);
      const sVal = carrierAmp * Math.cos(theta);
      const py = midY - (sVal / (carrierAmp || 1)) * scaleY;
      if (px === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    // Instantaneous frequency indicator
    const currentM = evalMessage(time + windowDuration / 2);
    const instFreq = carrierFreq + freqDev * currentM;
    ctx.fillStyle = '#1A1917';
    ctx.font = '10px ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`fi(t) = ${instFreq.toFixed(1)} Hz (fc ± Δf)`, 12, 18);
  }, [time, carrierFreq, messageFreq, freqDev, carrierAmp, msgWaveform, modIndex]);

  // Render Frequency Domain Spectrum Canvas
  useEffect(() => {
    const canvas = freqCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    ctx.clearRect(0, 0, width, height);

    // Baseline
    const baseY = height - 25;
    ctx.strokeStyle = '#D1CFCE';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(10, baseY);
    ctx.lineTo(width - 10, baseY);
    ctx.stroke();

    const maxDispFreq = 60; // 0 to 60 Hz visual axis
    const freqToX = (f: number) => 15 + (f / maxDispFreq) * (width - 30);

    // Carson's Bandwidth Shaded Range
    const bwStart = Math.max(0, carrierFreq - carsonsBw / 2);
    const bwEnd = carrierFreq + carsonsBw / 2;
    const xStart = freqToX(bwStart);
    const xEnd = freqToX(bwEnd);

    ctx.fillStyle = 'rgba(200, 90, 50, 0.12)';
    ctx.fillRect(xStart, 20, Math.max(2, xEnd - xStart), baseY - 20);

    ctx.strokeStyle = 'rgba(200, 90, 50, 0.4)';
    ctx.setLineDash([3, 3]);
    ctx.strokeRect(xStart, 20, Math.max(2, xEnd - xStart), baseY - 20);
    ctx.setLineDash([]);

    // Carson's Rule Label
    ctx.fillStyle = '#C85A32';
    ctx.font = '10px ui-monospace, monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`Carson's BW = ${carsonsBw.toFixed(1)} Hz`, (xStart + xEnd) / 2, 16);

    // Simplified Bessel Sidebands Jn(β)
    // For visual approximation of Bessel coefficients
    const numSidebands = Math.min(8, Math.ceil(modIndex + 2));
    const carrierX = freqToX(carrierFreq);

    // Center Carrier Spike
    const j0 = Math.cos(modIndex * 0.8);
    const h0 = Math.abs(j0) * (baseY - 45);
    ctx.strokeStyle = '#C85A32';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(carrierX, baseY);
    ctx.lineTo(carrierX, baseY - h0);
    ctx.stroke();

    ctx.fillStyle = '#C85A32';
    ctx.beginPath();
    ctx.arc(carrierX, baseY - h0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1A1917';
    ctx.font = '9px ui-monospace, monospace';
    ctx.fillText(`fc`, carrierX, baseY + 14);

    // Harmonic Sidebands fc ± n fm
    for (let n = 1; n <= numSidebands; n++) {
      const jnWeight = Math.pow(modIndex / 2, n) / Math.pow(n, 1.2);
      const clampedJn = Math.min(0.9, jnWeight) * Math.exp(-n * 0.15);
      const barH = clampedJn * (baseY - 45);

      const upperF = carrierFreq + n * messageFreq;
      const lowerF = carrierFreq - n * messageFreq;

      if (upperF <= maxDispFreq) {
        const ux = freqToX(upperF);
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(ux, baseY);
        ctx.lineTo(ux, baseY - barH);
        ctx.stroke();

        ctx.fillStyle = '#D97706';
        ctx.beginPath();
        ctx.arc(ux, baseY - barH, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      if (lowerF >= 0) {
        const lx = freqToX(lowerF);
        ctx.strokeStyle = '#D97706';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(lx, baseY);
        ctx.lineTo(lx, baseY - barH);
        ctx.stroke();

        ctx.fillStyle = '#D97706';
        ctx.beginPath();
        ctx.arc(lx, baseY - barH, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, [carrierFreq, messageFreq, freqDev, modIndex, carsonsBw]);

  const handleReset = () => {
    setCarrierFreq(30);
    setMessageFreq(2.0);
    setFreqDev(12);
    setCarrierAmp(2.0);
    setMsgWaveform('sin');
    setTime(0);
  };

  const prevMod = AM_MODULES[3]; // Module 2.4 VSB
  const nextMod = AM_MODULES[5]; // Module 2.6 AM / PM

  return (
    <div className="space-y-6">
      {/* 1. Main Content Container */}
      <div className="py-2">
        {/* Module Header Bar */}
        <div className="pb-6 border-b border-[#E6E4DD] flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-mono font-bold tracking-wider text-[#C85A32] bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/25">
                MODULE 2.5
              </span>
              <span className="text-xs text-[#75736E] font-medium font-mono">{currentSubTopic.tag}</span>
              <span className="text-xs text-[#A8A69E]">·</span>
              <span
                className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border ${
                  isNarrowband
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {isNarrowband ? 'NARROWBAND FM (NBFM, β < 1)' : 'WIDEBAND FM (WBFM, β ≥ 1)'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1917]">
              {currentSubTopic.name}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-[#585651] max-w-3xl leading-relaxed">
              {currentSubTopic.description}
            </p>
          </div>

          {/* Quick switcher to prev/next module */}
          <div className="flex items-center gap-2 shrink-0">
            {prevMod && (
              <button
                type="button"
                onClick={() => onNavigateModule(prevMod.path)}
                className="px-3 py-1.5 border border-[#E6E4DD] hover:bg-[#FAF9F6] text-xs font-medium text-[#585651] hover:text-[#1A1917] rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title={`Previous: ${prevMod.name}`}
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Prev ({prevMod.index})</span>
              </button>
            )}
            {nextMod && (
              <button
                type="button"
                onClick={() => onNavigateModule(nextMod.path)}
                className="px-3 py-1.5 border border-[#E6E4DD] hover:bg-[#FAF9F6] text-xs font-semibold text-[#1A1917] hover:border-[#C85A32]/40 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title={`Next: ${nextMod.name}`}
              >
                <span>Next ({nextMod.index})</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Technical Notice Banner */}
        <div className="mt-6 p-3.5 sm:p-4 rounded-md bg-[#FAF9F6] border border-[#E6E4DD] flex items-start gap-3">
          <Info className="w-4 h-4 text-[#C85A32] shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-[#585651] leading-relaxed">
            <span className="font-semibold text-[#1A1917]">Angle vs. Amplitude Modulation: </span>
            In Frequency Modulation, the carrier amplitude remains strictly constant ($A_c$), providing immunity to atmospheric noise and fading. Information is conveyed solely through the instantaneous frequency shift $f_i(t) = f_c + k_f m(t)$, requiring bandwidth given by Carson's Rule $B_T = 2(\Delta f + f_m)$.
          </div>
        </div>

        {/* 3. Live Canvas Workspaces */}
        <div className="mt-8 space-y-6">
          {/* Time & Frequency Split Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Time Domain Waveform */}
            <div className="bg-white rounded-lg border border-[#E6E4DD] p-4 sm:p-5 shadow-xs flex flex-col">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E6E4DD]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#C85A32]" />
                  <h3 className="text-xs font-bold tracking-tight text-[#1A1917] uppercase font-mono">
                    Time Domain: FM Carrier s(t) & Message m(t)
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-mono">
                  <span className="flex items-center gap-1 text-[#D97706]">
                    <span className="w-2 h-0.5 bg-[#D97706] inline-block" /> m(t)
                  </span>
                  <span className="flex items-center gap-1 text-[#C85A32]">
                    <span className="w-2 h-0.5 bg-[#C85A32] inline-block" /> s_FM(t)
                  </span>
                </div>
              </div>

              <div className="relative w-full aspect-16/9 bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden">
                <canvas
                  ref={timeCanvasRef}
                  width={640}
                  height={360}
                  className="w-full h-full object-contain select-none"
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-[#75736E]">
                <span>Modulation Index β = {modIndex.toFixed(2)}</span>
                <span>Δf = {freqDev.toFixed(1)} Hz</span>
              </div>
            </div>

            {/* Right: Carson's Bandwidth & Spectrum */}
            <div className="bg-white rounded-lg border border-[#E6E4DD] p-4 sm:p-5 shadow-xs flex flex-col">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E6E4DD]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
                  <h3 className="text-xs font-bold tracking-tight text-[#1A1917] uppercase font-mono">
                    Spectrum: Carson's Bandwidth & Bessel Sidebands
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-[#8A8882]">
                  BT = 2(Δf + fm)
                </span>
              </div>

              <div className="relative w-full aspect-16/9 bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden">
                <canvas
                  ref={freqCanvasRef}
                  width={640}
                  height={360}
                  className="w-full h-full object-contain select-none"
                />
              </div>

              <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-[#75736E]">
                <span>Carrier: {carrierFreq} Hz</span>
                <span>Bandwidth: {carsonsBw.toFixed(1)} Hz</span>
              </div>
            </div>
          </div>

          {/* 4. Interactive Parameter Controls Panel */}
          <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-4 sm:p-5 shadow-xs space-y-4">
            {/* Controls Header & Playback */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E6E4DD]">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#75736E] font-bold">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#585651]" />
                <span>FM Parameter Controls & Waveform Generators</span>
              </div>

              {/* Playback Controls */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsPlaying((p) => !p)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1A1917] text-white hover:bg-[#33322E] font-mono text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5 fill-current" />
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Play</span>
                    </>
                  )}
                </button>

                <div className="flex items-center bg-white rounded-md border border-[#E6E4DD] p-0.5">
                  {['0.5×', '1×', '2×'].map((sp) => (
                    <button
                      key={sp}
                      type="button"
                      onClick={() => setSpeed(sp)}
                      className={`px-2 py-0.5 text-xs font-mono rounded cursor-pointer transition ${
                        speed === sp
                          ? 'bg-[#C85A32] text-white font-bold'
                          : 'text-[#75736E] hover:text-[#1A1917]'
                      }`}
                    >
                      {sp}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleReset}
                  className="p-1.5 text-[#75736E] hover:text-[#1A1917] hover:bg-white rounded-md border border-[#E6E4DD] transition-colors cursor-pointer"
                  title="Reset parameters"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Sliders Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Frequency Deviation Δf */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-[#1A1917]">Frequency Deviation (Δf)</span>
                  <span className="font-mono text-[#C85A32] font-semibold">{freqDev} Hz</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="25"
                  step="1"
                  value={freqDev}
                  onChange={(e) => setFreqDev(parseInt(e.target.value, 10))}
                  className="w-full accent-[#C85A32] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
                  <span>2 Hz (Narrow)</span>
                  <span>25 Hz (Wide)</span>
                </div>
              </div>

              {/* Modulating Frequency fm */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-[#1A1917]">Message Frequency (fm)</span>
                  <span className="font-mono text-[#C85A32] font-semibold">{messageFreq.toFixed(1)} Hz</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="5.0"
                  step="0.5"
                  value={messageFreq}
                  onChange={(e) => setMessageFreq(parseFloat(e.target.value))}
                  className="w-full accent-[#C85A32] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
                  <span>0.5 Hz</span>
                  <span>5.0 Hz</span>
                </div>
              </div>

              {/* Carrier Frequency fc */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-[#1A1917]">Carrier Frequency (fc)</span>
                  <span className="font-mono text-[#C85A32] font-semibold">{carrierFreq} Hz</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="50"
                  step="2"
                  value={carrierFreq}
                  onChange={(e) => setCarrierFreq(parseInt(e.target.value, 10))}
                  className="w-full accent-[#C85A32] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
                  <span>20 Hz</span>
                  <span>50 Hz</span>
                </div>
              </div>

              {/* Modulating Signal Waveform */}
              <div>
                <div className="text-xs mb-1 font-medium text-[#1A1917]">Baseband Waveform</div>
                <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-md border border-[#E6E4DD]">
                  {(['sin', 'square', 'triangle'] as const).map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setMsgWaveform(w)}
                      className={`py-1 text-xs font-mono font-semibold rounded cursor-pointer transition capitalize ${
                        msgWaveform === w
                          ? 'bg-[#C85A32] text-white shadow-2xs'
                          : 'text-[#585651] hover:text-[#1A1917]'
                      }`}
                    >
                      {w === 'sin' ? 'Sine' : w === 'square' ? 'Square' : 'Tri'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Presets Row */}
            <div className="pt-2 border-t border-[#E6E4DD]/80 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-mono text-[#75736E] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#C85A32]" />
                <span>Presets:</span>
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setFreqDev(15);
                    setMessageFreq(2.0);
                    setCarrierFreq(32);
                    setMsgWaveform('sin');
                  }}
                  className="px-2.5 py-1 text-xs font-mono bg-white hover:bg-[#F3F2EC] text-[#1A1917] border border-[#E6E4DD] rounded shadow-2xs cursor-pointer transition-colors"
                >
                  Broadcast WBFM (β = 7.5)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFreqDev(2);
                    setMessageFreq(3.0);
                    setCarrierFreq(30);
                    setMsgWaveform('sin');
                  }}
                  className="px-2.5 py-1 text-xs font-mono bg-white hover:bg-[#F3F2EC] text-[#1A1917] border border-[#E6E4DD] rounded shadow-2xs cursor-pointer transition-colors"
                >
                  Walkie-Talkie NBFM (β = 0.67)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFreqDev(20);
                    setMessageFreq(1.0);
                    setCarrierFreq(30);
                    setMsgWaveform('triangle');
                  }}
                  className="px-2.5 py-1 text-xs font-mono bg-white hover:bg-[#F3F2EC] text-[#1A1917] border border-[#E6E4DD] rounded shadow-2xs cursor-pointer transition-colors"
                >
                  Siren / Triangle Chirp
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFreqDev(12);
                    setMessageFreq(2.0);
                    setCarrierFreq(30);
                    setMsgWaveform('square');
                  }}
                  className="px-2.5 py-1 text-xs font-mono bg-white hover:bg-[#F3F2EC] text-[#1A1917] border border-[#E6E4DD] rounded shadow-2xs cursor-pointer transition-colors"
                >
                  2-FSK Digital Keying
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 5. Theory & KaTeX Reference Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-4 sm:p-5 shadow-xs">
            <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-2 flex items-center gap-1.5 font-bold">
              <BookOpen className="w-3.5 h-3.5 text-[#585651]" />
              <span>FM Mathematical Formulation</span>
            </div>
            <div className="text-xs text-[#585651] mb-2 font-medium">
              {currentSubTopic.formulaLabel}
            </div>
            <div className="p-3 bg-white rounded border border-[#E6E4DD] text-xs font-semibold text-[#1A1917] overflow-x-auto">
              <MathView math={currentSubTopic.formula} displayMode={true} />
            </div>
          </div>

          <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-4 sm:p-5 shadow-xs">
            <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-3 flex items-center gap-1.5 font-bold">
              <Layers className="w-3.5 h-3.5 text-[#585651]" />
              <span>Core Curricular Focus Areas</span>
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
  );
};
