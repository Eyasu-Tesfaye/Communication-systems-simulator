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
} from 'lucide-react';
import { AM_MODULES, AMSubTopic } from '../../data/modules';
import { MathView } from '../../components/MathView';

interface Module2_6_AM_PMProps {
  onNavigateHome: () => void;
  onNavigateModule: (path: string) => void;
}

export const Module2_6_AM_PM: React.FC<Module2_6_AM_PMProps> = ({
  onNavigateHome,
  onNavigateModule,
}) => {
  const currentSubTopic: AMSubTopic = AM_MODULES[5]; // Module 2.6 AM / PM

  // Parameters
  const [carrierFreq, setCarrierFreq] = useState<number>(24); // fc (Hz)
  const [messageFreq, setMessageFreq] = useState<number>(2.0); // fm (Hz)
  const [phaseDev, setPhaseDev] = useState<number>(1.57); // kp * Am (radians, ~π/2)
  const [amModIndex, setAmModIndex] = useState<number>(0.75); // μ
  const [carrierAmp, setCarrierAmp] = useState<number>(2.0); // Ac
  const [viewMode, setViewMode] = useState<'compare' | 'pm_solo' | 'tri_mod'>('compare');
  const [msgWaveform, setMsgWaveform] = useState<'sin' | 'square' | 'triangle'>('sin');

  // Animation Playback
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<string>('1×');
  const [time, setTime] = useState<number>(0);

  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const timeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const iqCanvasRef = useRef<HTMLCanvasElement | null>(null);

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

  // Message signal function m(t) in [-1, 1]
  const evalMessage = (t: number): number => {
    const phase = 2 * Math.PI * messageFreq * t;
    if (msgWaveform === 'sin') {
      return Math.sin(phase);
    } else if (msgWaveform === 'square') {
      return Math.sin(phase) >= 0 ? 1 : -1;
    } else {
      const norm = ((t * messageFreq) % 1 + 1) % 1;
      return norm < 0.5 ? 4 * norm - 1 : 3 - 4 * norm;
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

    // Grid
    ctx.strokeStyle = '#F0EEE6';
    ctx.lineWidth = 1;
    for (let i = 1; i < 10; i++) {
      const x = (i * width) / 10;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    const windowDuration = 1.0;

    if (viewMode === 'compare') {
      // Split into two lanes: Upper lane = AM, Lower lane = PM
      const laneH = height / 2;

      // Divider line
      ctx.strokeStyle = '#E6E4DD';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, laneH);
      ctx.lineTo(width, laneH);
      ctx.stroke();

      // Lane 1 Center & Scale (AM)
      const midY1 = laneH / 2;
      ctx.strokeStyle = '#D1CFCE';
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(0, midY1);
      ctx.lineTo(width, midY1);
      ctx.stroke();

      // Lane 2 Center & Scale (PM)
      const midY2 = laneH + laneH / 2;
      ctx.beginPath();
      ctx.moveTo(0, midY2);
      ctx.lineTo(width, midY2);
      ctx.stroke();
      ctx.setLineDash([]);

      const scale = laneH * 0.38;

      // Draw AM wave: s_AM(t) = Ac[1 + μ m(t)] cos(2π fc t)
      ctx.beginPath();
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 2;
      for (let px = 0; px < width; px++) {
        const tSample = time + (px / width) * windowDuration;
        const mVal = evalMessage(tSample);
        const amVal = (1 + amModIndex * mVal) * Math.cos(2 * Math.PI * carrierFreq * tSample);
        const py = midY1 - (amVal / 2) * scale;
        if (px === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Draw PM wave: s_PM(t) = Ac cos(2π fc t + kp m(t))
      ctx.beginPath();
      ctx.strokeStyle = '#C85A32';
      ctx.lineWidth = 2;
      for (let px = 0; px < width; px++) {
        const tSample = time + (px / width) * windowDuration;
        const mVal = evalMessage(tSample);
        const pmVal = Math.cos(2 * Math.PI * carrierFreq * tSample + phaseDev * mVal);
        const py = midY2 - pmVal * scale;
        if (px === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Labels
      ctx.font = '10px ui-monospace, monospace';
      ctx.fillStyle = '#D97706';
      ctx.fillText('AM: s_AM(t) = Ac[1 + μ m(t)]·cos(ωc t) (Envelope Variation)', 12, 18);
      ctx.fillStyle = '#C85A32';
      ctx.fillText(`PM: s_PM(t) = Ac·cos(ωc t + Δϕ m(t)) (Phase Deviation Δϕ = ${(phaseDev / Math.PI).toFixed(2)}π)`, 12, laneH + 18);

    } else if (viewMode === 'pm_solo') {
      // Single Large Lane: Modulating message & PM carrier
      const midY = height / 2;
      ctx.strokeStyle = '#D1CFCE';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, midY);
      ctx.lineTo(width, midY);
      ctx.stroke();
      ctx.setLineDash([]);

      const scale = (height / 2) * 0.45;

      // Baseband message m(t)
      ctx.beginPath();
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 2;
      for (let px = 0; px < width; px++) {
        const tSample = time + (px / width) * windowDuration;
        const mVal = evalMessage(tSample);
        const py = midY - mVal * scale * 0.8;
        if (px === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // PM Waveform
      ctx.beginPath();
      ctx.strokeStyle = '#C85A32';
      ctx.lineWidth = 2;
      for (let px = 0; px < width; px++) {
        const tSample = time + (px / width) * windowDuration;
        const mVal = evalMessage(tSample);
        const pmVal = Math.cos(2 * Math.PI * carrierFreq * tSample + phaseDev * mVal);
        const py = midY - pmVal * scale;
        if (px === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      ctx.font = '10px ui-monospace, monospace';
      ctx.fillStyle = '#1A1917';
      ctx.fillText(`PM Carrier s(t) [Terracotta] & Baseband m(t) [Gold] (Δϕ = ${phaseDev.toFixed(2)} rad)`, 12, 18);

    } else {
      // Tri-Modulation View: 3 Lanes (AM, FM, PM)
      const laneH = height / 3;
      const scale = laneH * 0.35;

      // Draw AM
      const mid1 = laneH * 0.5;
      ctx.beginPath();
      ctx.strokeStyle = '#2563EB';
      ctx.lineWidth = 1.75;
      for (let px = 0; px < width; px++) {
        const tSample = time + (px / width) * windowDuration;
        const mVal = evalMessage(tSample);
        const v = (1 + amModIndex * mVal) * Math.cos(2 * Math.PI * carrierFreq * tSample);
        const py = mid1 - (v / 2) * scale;
        if (px === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Draw FM
      const mid2 = laneH * 1.5;
      ctx.beginPath();
      ctx.strokeStyle = '#D97706';
      ctx.lineWidth = 1.75;
      for (let px = 0; px < width; px++) {
        const tSample = time + (px / width) * windowDuration;
        const v = Math.cos(2 * Math.PI * carrierFreq * tSample - 4 * Math.cos(2 * Math.PI * messageFreq * tSample));
        const py = mid2 - v * scale;
        if (px === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      // Draw PM
      const mid3 = laneH * 2.5;
      ctx.beginPath();
      ctx.strokeStyle = '#C85A32';
      ctx.lineWidth = 1.75;
      for (let px = 0; px < width; px++) {
        const tSample = time + (px / width) * windowDuration;
        const mVal = evalMessage(tSample);
        const v = Math.cos(2 * Math.PI * carrierFreq * tSample + phaseDev * mVal);
        const py = mid3 - v * scale;
        if (px === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      ctx.font = '10px ui-monospace, monospace';
      ctx.fillStyle = '#2563EB';
      ctx.fillText('1. AM: Amplitude Varies, Phase Fixed', 12, 16);
      ctx.fillStyle = '#D97706';
      ctx.fillText('2. FM: Frequency Varies, Amplitude Constant', 12, laneH + 16);
      ctx.fillStyle = '#C85A32';
      ctx.fillText('3. PM: Phase Directly Shifts, Amplitude Constant', 12, 2 * laneH + 16);
    }
  }, [time, carrierFreq, messageFreq, phaseDev, amModIndex, viewMode, msgWaveform]);

  // Render Complex Plane I/Q Constellation & Phasor
  useEffect(() => {
    const canvas = iqCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) * 0.72;

    // Coordinate Axes (In-Phase I & Quadrature Q)
    ctx.strokeStyle = '#D1CFCE';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX, 15);
    ctx.lineTo(centerX, height - 15);
    ctx.moveTo(15, centerY);
    ctx.lineTo(width - 15, centerY);
    ctx.stroke();

    // Unit circle (Constant Envelope Arc for PM)
    ctx.strokeStyle = '#E6E4DD';
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Axes Labels
    ctx.fillStyle = '#8A8882';
    ctx.font = '10px ui-monospace, monospace';
    ctx.textAlign = 'right';
    ctx.fillText('I (In-Phase)', width - 15, centerY - 6);
    ctx.textAlign = 'center';
    ctx.fillText('Q (Quad)', centerX + 30, 20);

    // Instantaneous Phasors
    const currentM = evalMessage(time);

    // 1. PM Phasor (Rotates along the circle arc: θ_PM = Δϕ * m)
    const anglePM = phaseDev * currentM;
    const pmX = centerX + radius * Math.cos(anglePM);
    const pmY = centerY - radius * Math.sin(anglePM);

    // PM Phasor Vector
    ctx.strokeStyle = '#C85A32';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(pmX, pmY);
    ctx.stroke();

    ctx.fillStyle = '#C85A32';
    ctx.beginPath();
    ctx.arc(pmX, pmY, 4.5, 0, Math.PI * 2);
    ctx.fill();

    // Phase Arc Shading
    ctx.fillStyle = 'rgba(200, 90, 50, 0.15)';
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius * 0.35, 0, -anglePM, anglePM < 0);
    ctx.closePath();
    ctx.fill();

    // 2. AM Vector (Moves strictly along the horizontal I axis: (1 + μ m))
    const amMag = (1 + amModIndex * currentM) * 0.5 * radius;
    const amX = centerX + amMag;
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(amX, centerY);
    ctx.stroke();

    ctx.fillStyle = '#D97706';
    ctx.beginPath();
    ctx.arc(amX, centerY, 4, 0, Math.PI * 2);
    ctx.fill();

    // Legend
    ctx.textAlign = 'left';
    ctx.font = '10px ui-monospace, monospace';
    ctx.fillStyle = '#C85A32';
    ctx.fillText(`PM Phasor (Angle = ${(anglePM * 180 / Math.PI).toFixed(1)}°)`, 15, height - 25);
    ctx.fillStyle = '#D97706';
    ctx.fillText(`AM Phasor (Magnitude = ${(1 + amModIndex * currentM).toFixed(2)})`, 15, height - 12);
  }, [time, phaseDev, amModIndex, msgWaveform]);

  const handleReset = () => {
    setCarrierFreq(24);
    setMessageFreq(2.0);
    setPhaseDev(1.57);
    setAmModIndex(0.75);
    setCarrierAmp(2.0);
    setMsgWaveform('sin');
    setViewMode('compare');
    setTime(0);
  };

  const prevMod = AM_MODULES[4]; // Module 2.5 FM
  const nextMod = AM_MODULES[6]; // Module 2.7 Demodulation

  return (
    <div className="space-y-6">
      {/* 1. Main Content Container */}
      <div className="py-2">
        {/* Module Header Bar */}
        <div className="pb-6 border-b border-[#E6E4DD] flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-mono font-bold tracking-wider text-[#C85A32] bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/25">
                MODULE 2.6
              </span>
              <span className="text-xs text-[#75736E] font-medium font-mono">{currentSubTopic.tag}</span>
              <span className="text-xs text-[#A8A69E]">·</span>
              <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded border bg-[#FBF4F0] text-[#C85A32] border-[#C85A32]/20">
                Δϕ = {(phaseDev / Math.PI).toFixed(2)}π rad ({((phaseDev * 180) / Math.PI).toFixed(0)}°)
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
            <span className="font-semibold text-[#1A1917]">Angle vs. Amplitude Modulation Principles: </span>
            In Amplitude Modulation (AM), information is encoded strictly in the carrier envelope amplitude, leaving the frequency and phase fixed. In Phase Modulation (PM), the envelope stays constant while the carrier phase angle rotates by $\Delta\phi(t) = k_p m(t)$, creating instantaneous phase flips at transitions.
          </div>
        </div>

        {/* 3. Live Canvas Workspaces */}
        <div className="mt-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Time Domain Waveform (8 Cols) */}
            <div className="lg:col-span-8 bg-white rounded-lg border border-[#E6E4DD] p-4 sm:p-5 shadow-xs flex flex-col">
              <div className="flex flex-wrap items-center justify-between pb-3 mb-3 border-b border-[#E6E4DD] gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#C85A32]" />
                  <h3 className="text-xs font-bold tracking-tight text-[#1A1917] uppercase font-mono">
                    Time Domain Modulation Comparison
                  </h3>
                </div>

                {/* View Mode Toggle */}
                <div className="flex items-center gap-1 bg-[#FAF9F6] p-0.5 rounded border border-[#E6E4DD]">
                  <button
                    type="button"
                    onClick={() => setViewMode('compare')}
                    className={`px-2 py-0.5 text-xs font-mono font-semibold rounded cursor-pointer transition ${
                      viewMode === 'compare' ? 'bg-[#C85A32] text-white shadow-2xs' : 'text-[#585651]'
                    }`}
                  >
                    AM vs PM
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('pm_solo')}
                    className={`px-2 py-0.5 text-xs font-mono font-semibold rounded cursor-pointer transition ${
                      viewMode === 'pm_solo' ? 'bg-[#C85A32] text-white shadow-2xs' : 'text-[#585651]'
                    }`}
                  >
                    PM Wave
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('tri_mod')}
                    className={`px-2 py-0.5 text-xs font-mono font-semibold rounded cursor-pointer transition ${
                      viewMode === 'tri_mod' ? 'bg-[#C85A32] text-white shadow-2xs' : 'text-[#585651]'
                    }`}
                  >
                    AM / FM / PM
                  </button>
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
            </div>

            {/* Right: Complex I/Q Phasor (4 Cols) */}
            <div className="lg:col-span-4 bg-white rounded-lg border border-[#E6E4DD] p-4 sm:p-5 shadow-xs flex flex-col">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#E6E4DD]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
                  <h3 className="text-xs font-bold tracking-tight text-[#1A1917] uppercase font-mono">
                    I/Q Phasor Complex Plane
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-[#8A8882]">Arc Trajectory</span>
              </div>

              <div className="relative w-full aspect-square bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden">
                <canvas
                  ref={iqCanvasRef}
                  width={360}
                  height={360}
                  className="w-full h-full object-contain select-none"
                />
              </div>
            </div>
          </div>

          {/* 4. Controls Panel */}
          <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-4 sm:p-5 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E6E4DD]">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#75736E] font-bold">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#585651]" />
                <span>Phase & Amplitude Modulation Controls</span>
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
              {/* Peak Phase Deviation Δϕ */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-[#1A1917]">Phase Deviation (Δϕ)</span>
                  <span className="font-mono text-[#C85A32] font-semibold">
                    {(phaseDev / Math.PI).toFixed(2)}π rad ({((phaseDev * 180) / Math.PI).toFixed(0)}°)
                  </span>
                </div>
                <input
                  type="range"
                  min="0.2"
                  max="3.14"
                  step="0.05"
                  value={phaseDev}
                  onChange={(e) => setPhaseDev(parseFloat(e.target.value))}
                  className="w-full accent-[#C85A32] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
                  <span>0.2 rad (~11°)</span>
                  <span>π rad (180° BPSK)</span>
                </div>
              </div>

              {/* AM Modulation Index μ */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-[#1A1917]">AM Mod Index (μ)</span>
                  <span className="font-mono text-[#D97706] font-semibold">{amModIndex.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.2"
                  step="0.05"
                  value={amModIndex}
                  onChange={(e) => setAmModIndex(parseFloat(e.target.value))}
                  className="w-full accent-[#D97706] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
                  <span>0.1 (Light AM)</span>
                  <span>1.0 (100% AM)</span>
                </div>
              </div>

              {/* Message Frequency fm */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium text-[#1A1917]">Message Frequency (fm)</span>
                  <span className="font-mono text-[#1A1917] font-semibold">{messageFreq.toFixed(1)} Hz</span>
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

              {/* Waveform Selector */}
              <div>
                <div className="text-xs mb-1 font-medium text-[#1A1917]">Baseband Shape</div>
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
                    setPhaseDev(3.14);
                    setMsgWaveform('square');
                    setViewMode('compare');
                  }}
                  className="px-2.5 py-1 text-xs font-mono bg-white hover:bg-[#F3F2EC] text-[#1A1917] border border-[#E6E4DD] rounded shadow-2xs cursor-pointer transition-colors"
                >
                  Binary Phase Shift (BPSK, ±π)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPhaseDev(1.57);
                    setAmModIndex(0.8);
                    setMsgWaveform('sin');
                    setViewMode('compare');
                  }}
                  className="px-2.5 py-1 text-xs font-mono bg-white hover:bg-[#F3F2EC] text-[#1A1917] border border-[#E6E4DD] rounded shadow-2xs cursor-pointer transition-colors"
                >
                  Quadrant Shift (±π/2)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPhaseDev(1.2);
                    setAmModIndex(0.7);
                    setViewMode('tri_mod');
                  }}
                  className="px-2.5 py-1 text-xs font-mono bg-white hover:bg-[#F3F2EC] text-[#1A1917] border border-[#E6E4DD] rounded shadow-2xs cursor-pointer transition-colors"
                >
                  Tri-Modulation (AM/FM/PM)
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
              <span>Mathematical Formulation</span>
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
