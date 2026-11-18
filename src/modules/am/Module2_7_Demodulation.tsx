import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  SlidersHorizontal,
  BookOpen,
  Layers,
  Info,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Activity,
} from 'lucide-react';
import { AM_MODULES, AMSubTopic } from '../../data/modules';
import { ModuleGlyph } from '../../components/ModuleGlyphs';
import { MathView } from '../../components/MathView';

interface Module2_7_DemodulationProps {
  onNavigateHome: () => void;
  onNavigateModule: (path: string) => void;
}

const CARRIER_FREQ_HZ = 100_000; // Fixed 100 kHz carrier for clear envelope waveform visualization
const CARRIER_AMP_V = 5.0; // Normalized 5.0 V carrier peak
const DIODE_V_ON = 0.15; // Small forward threshold so linear range 0.1 <= mu <= 1.0 stays clear

export const Module2_7_Demodulation: React.FC<Module2_7_DemodulationProps> = ({
  onNavigateHome: _onNavigateHome,
  onNavigateModule,
}) => {
  const subTopic: AMSubTopic = AM_MODULES[6]; // Module 2.7 Demodulation
  const [detectorMode, setDetectorMode] = useState<'envelope' | 'coherent' | 'fm_slope'>('envelope');

  // Shared / Coherent / FM parameters (preserved unchanged for AM Coherent & FM Discriminator)
  const [rcConstant, setRcConstant] = useState<number>(0.05); // ms
  const [phaseOffset, setPhaseOffset] = useState<number>(0); // deg
  const [lpfCutoff, setLpfCutoff] = useState<number>(5); // kHz

  // AM Envelope Detector specific parameters (Chapter 2, Slides 21 & 30)
  const [envRcUs, setEnvRcUs] = useState<number>(50.0); // 1.0 to 500.0 us
  const [envMu, setEnvMu] = useState<number>(0.7); // 0.10 to 1.50
  const [envFmKhz, setEnvFmKhz] = useState<number>(2.0); // 0.5 to 10.0 kHz

  // Oscilloscope trace toggles
  const [showIncomingAm, setShowIncomingAm] = useState<boolean>(true);
  const [showRectifiedVd, setShowRectifiedVd] = useState<boolean>(true);
  const [showSmoothedVout, setShowSmoothedVout] = useState<boolean>(true);
  const [showReferenceMt, setShowReferenceMt] = useState<boolean>(true);

  // Playback & live diode conduction state
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<string>('1×');
  const [isDiodeOn, setIsDiodeOn] = useState<boolean>(false);

  const scopeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const simTimeRef = useRef<number>(0); // seconds
  const lastFrameRef = useRef<number | null>(null);
  const diodeStateRef = useRef<boolean>(false);

  const prevMod = AM_MODULES[5]; // Module 2.6 AM / PM
  const nextMod = AM_MODULES[0]; // Module 2.1 CAM

  // Design inequality metrics: 1/omega_c << RC << 1/omega_m
  const diagnostics = useMemo(() => {
    const omegaC = 2 * Math.PI * CARRIER_FREQ_HZ;
    const omegaM = 2 * Math.PI * (envFmKhz * 1000);
    const invOmegaC_us = (1 / omegaC) * 1e6; // ~1.59 us
    const invOmegaM_us = (1 / omegaM) * 1e6; // ~79.58 us at 2 kHz
    const maxRcSlope_us =
      envMu < 1.0
        ? (Math.sqrt(Math.max(0, 1 - envMu * envMu)) / (omegaM * envMu)) * 1e6
        : 0;

    let status: 'optimal' | 'ripple' | 'clipping' | 'overmodulation' = 'optimal';
    let label = 'Optimal Tracking (μ ≤ 1 & 1/ω_c ≪ RC ≪ 1/ω_m)';

    if (envMu > 1.0) {
      status = 'overmodulation';
      label = 'Failure: Overmodulation Envelope Distortion (μ > 1 — Coherent Detector Required)';
    } else if (envRcUs < 8 * invOmegaC_us) {
      status = 'ripple';
      label = 'Warning: High Carrier Ripple (RC too small)';
    } else if (envRcUs > Math.min(maxRcSlope_us, invOmegaM_us * 1.15)) {
      status = 'clipping';
      label = 'Warning: Diagonal Clipping (RC too large)';
    }

    return {
      invOmegaC_us,
      invOmegaM_us,
      maxRcSlope_us,
      status,
      label,
    };
  }, [envRcUs, envMu, envFmKhz]);

  const handleResetEnvelope = () => {
    setEnvRcUs(50.0);
    setEnvMu(0.7);
    setEnvFmKhz(2.0);
    setShowIncomingAm(true);
    setShowRectifiedVd(true);
    setShowSmoothedVout(true);
    setShowReferenceMt(true);
    simTimeRef.current = 0;
  };

  // Draw function for the multi-stage AM envelope oscilloscope
  const drawScope = () => {
    const canvas = scopeCanvasRef.current;
    if (!canvas || detectorMode !== 'envelope') return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return;

    if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.scale(dpr, dpr);

    // Background
    ctx.fillStyle = '#FAF9F6';
    ctx.fillRect(0, 0, width, height);

    const padLeft = 46;
    const padRight = 14;
    const padTop = 18;
    const padBottom = 26;
    const plotW = Math.max(40, width - padLeft - padRight);
    const plotH = Math.max(40, height - padTop - padBottom);

    const fmHz = envFmKhz * 1000;
    const rcSec = envRcUs * 1e-6;
    // Show ~2 message cycles (clamped between 0.3 ms and 1.6 ms so individual carrier cycles remain crisp)
    const windowSec = Math.min(Math.max(2 / fmHz, 0.0003), 0.0016);
    const tStart = simTimeRef.current;
    const warmupSec = Math.min(Math.max(3 * rcSec, 0.00025), 0.0015);

    const dt = 0.08e-6; // 0.08 us step (125 samples per 10 us carrier cycle)
    const warmupSteps = Math.ceil(warmupSec / dt);
    const windowSteps = Math.ceil(windowSec / dt);

    // Initialize capacitor voltage near initial positive envelope peak before warmup
    const tWarmStart = tStart - warmupSec;
    let vCap = Math.max(
      0,
      CARRIER_AMP_V * (1 + envMu * Math.cos(2 * Math.PI * fmHz * tWarmStart)) - DIODE_V_ON
    );

    // Run warmup ODE to reach steady state before tStart
    for (let i = 0; i < warmupSteps; i++) {
      const t = tWarmStart + i * dt;
      const sVal =
        CARRIER_AMP_V *
        (1 + envMu * Math.cos(2 * Math.PI * fmHz * t)) *
        Math.cos(2 * Math.PI * CARRIER_FREQ_HZ * t);
      if (sVal - DIODE_V_ON > vCap) {
        vCap = sVal - DIODE_V_ON;
      } else {
        vCap = vCap * Math.exp(-dt / rcSec);
      }
    }

    // Collect window samples
    const sArr = new Float32Array(windowSteps + 1);
    const vdArr = new Float32Array(windowSteps + 1);
    const voutArr = new Float32Array(windowSteps + 1);
    const mRefArr = new Float32Array(windowSteps + 1);
    const onArr = new Uint8Array(windowSteps + 1);

    for (let i = 0; i <= windowSteps; i++) {
      const t = tStart + i * dt;
      const env = CARRIER_AMP_V * (1 + envMu * Math.cos(2 * Math.PI * fmHz * t));
      const sVal = env * Math.cos(2 * Math.PI * CARRIER_FREQ_HZ * t);
      const vdVal = sVal > DIODE_V_ON ? sVal - DIODE_V_ON : 0;

      let conducting = 0;
      if (sVal - DIODE_V_ON > vCap) {
        vCap = sVal - DIODE_V_ON;
        conducting = 1;
      } else {
        vCap = vCap * Math.exp(-dt / rcSec);
      }

      sArr[i] = sVal;
      vdArr[i] = vdVal;
      voutArr[i] = vCap;
      mRefArr[i] = env;
      onArr[i] = conducting;
    }

    // Probe index at center of window for live diode conduction badge
    const probeIdx = Math.floor(windowSteps * 0.5);
    const currentDiodeOn = onArr[probeIdx] === 1;
    if (diodeStateRef.current !== currentDiodeOn) {
      diodeStateRef.current = currentDiodeOn;
      setIsDiodeOn(currentDiodeOn);
    }

    // Vertical scale (accommodate full AM swing up to 1 + mu)
    const yMax = CARRIER_AMP_V * (1 + Math.max(envMu, 1.0)) * 1.12;
    const yMin = -yMax;
    const mapY = (v: number) => padTop + ((yMax - v) / (yMax - yMin)) * plotH;
    const mapX = (idx: number) => padLeft + (idx / windowSteps) * plotW;

    // Grid lines
    ctx.strokeStyle = '#E6E4DD';
    ctx.lineWidth = 1;
    const vTicks = [yMax * 0.85, yMax * 0.425, 0, -yMax * 0.425, -yMax * 0.85];
    ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
    ctx.fillStyle = '#8A8882';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    vTicks.forEach((v) => {
      const y = mapY(v);
      ctx.beginPath();
      ctx.moveTo(padLeft, y);
      ctx.lineTo(padLeft + plotW, y);
      if (Math.abs(v) < 1e-6) {
        ctx.strokeStyle = '#CFCBC2';
        ctx.lineWidth = 1.2;
      } else {
        ctx.strokeStyle = '#E6E4DD';
        ctx.lineWidth = 1;
      }
      ctx.stroke();
      ctx.fillText(`${v >= 0 ? '+' : ''}${v.toFixed(1)}V`, padLeft - 6, y);
    });

    // Vertical time grid
    const numCols = 5;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    for (let c = 0; c <= numCols; c++) {
      const x = padLeft + (c / numCols) * plotW;
      ctx.strokeStyle = '#EFEFEA';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, padTop + plotH);
      ctx.stroke();

      const tRelUs = ((c / numCols) * windowSec) * 1e6;
      ctx.fillStyle = '#8A8882';
      ctx.fillText(`${tRelUs.toFixed(0)} μs`, x, padTop + plotH + 6);
    }

    // Clip to plot box
    ctx.save();
    ctx.beginPath();
    ctx.rect(padLeft, padTop, plotW, plotH);
    ctx.clip();

    // Decimate drawing cleanly to max ~2 points per pixel while keeping carrier peaks intact
    const stepDraw = Math.max(1, Math.floor(windowSteps / Math.max(plotW * 2.5, 900)));

    // 1. Incoming AM Wave s(t)
    if (showIncomingAm) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(88, 86, 81, 0.48)';
      ctx.lineWidth = 1.15;
      for (let i = 0; i <= windowSteps; i += stepDraw) {
        const x = mapX(i);
        const y = mapY(sArr[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // 2. Half-Wave Rectified Diode Output v_D(t)
    if (showRectifiedVd) {
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(217, 119, 6, 0.72)';
      ctx.lineWidth = 1.25;
      for (let i = 0; i <= windowSteps; i += stepDraw) {
        const x = mapX(i);
        const y = mapY(vdArr[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // 3. Reference Baseband Message m(t) (ideal scaled envelope A_c[1 + mu cos(2*pi*f_m*t)])
    if (showReferenceMt) {
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = '#2563EB';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([6, 4]);
      for (let i = 0; i <= windowSteps; i += stepDraw) {
        const x = mapX(i);
        const y = mapY(mRefArr[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // 4. Capacitor RC Smoothed Output v_out(t)
    if (showSmoothedVout) {
      ctx.beginPath();
      ctx.strokeStyle = '#C85A32';
      ctx.lineWidth = 2.3;
      for (let i = 0; i <= windowSteps; i += stepDraw) {
        const x = mapX(i);
        const y = mapY(voutArr[i]);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    // Subtle live diode probe cursor at center
    const probeX = mapX(probeIdx);
    ctx.save();
    ctx.strokeStyle = currentDiodeOn ? 'rgba(5, 150, 105, 0.55)' : 'rgba(138, 136, 130, 0.45)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(probeX, padTop);
    ctx.lineTo(probeX, padTop + plotH);
    ctx.stroke();
    ctx.restore();

    if (showSmoothedVout) {
      ctx.beginPath();
      ctx.arc(probeX, mapY(voutArr[probeIdx]), 3.5, 0, Math.PI * 2);
      ctx.fillStyle = currentDiodeOn ? '#059669' : '#C85A32';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    ctx.restore();
    ctx.restore();
  };

  const drawScopeRef = useRef(drawScope);
  drawScopeRef.current = drawScope;

  // Animation loop + ResizeObserver for AM Envelope oscilloscope
  useEffect(() => {
    if (detectorMode !== 'envelope') return;

    let rafId = 0;
    const speedFactor = speed === '0.5×' ? 0.5 : speed === '2×' ? 2.0 : 1.0;

    const tick = (now: number) => {
      if (lastFrameRef.current === null) {
        lastFrameRef.current = now;
      }
      const elapsedSec = Math.min((now - lastFrameRef.current) / 1000, 0.05);
      lastFrameRef.current = now;

      if (isPlaying) {
        // Slow-motion carrier sweep (~28 us of RF signal per real second at 1x)
        // so individual carrier peaks & diode conduction toggles are visually observable
        simTimeRef.current += elapsedSec * 28e-6 * speedFactor;
      }

      drawScopeRef.current();
      if (isPlaying) {
        rafId = requestAnimationFrame(tick);
      }
    };

    lastFrameRef.current = null;
    drawScopeRef.current();
    if (isPlaying) {
      rafId = requestAnimationFrame(tick);
    }

    const canvas = scopeCanvasRef.current;
    let observer: ResizeObserver | null = null;
    if (canvas && typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => {
        drawScopeRef.current();
      });
      observer.observe(canvas);
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      if (observer) observer.disconnect();
    };
  }, [
    detectorMode,
    envRcUs,
    envMu,
    envFmKhz,
    showIncomingAm,
    showRectifiedVd,
    showSmoothedVout,
    showReferenceMt,
    isPlaying,
    speed,
  ]);

  return (
    <div className="space-y-6">
      {/* 1. Main Content Container */}
      <div className="py-2">
        {/* Module Header Bar */}
        <div className="pb-6 border-b border-[#E6E4DD] flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-mono font-bold tracking-wider text-[#C85A32] bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/25">
                MODULE 2.7
              </span>
              <span className="text-xs text-[#75736E] font-medium font-mono">{subTopic.tag}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1917]">
              {subTopic.name}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-[#585651] max-w-3xl leading-relaxed">
              {subTopic.description}
            </p>
          </div>

          {/* Quick switcher to next/prev */}
          <div className="flex items-center gap-2 shrink-0">
            {prevMod && (
              <button
                type="button"
                onClick={() => onNavigateModule(prevMod.path)}
                className="px-3 py-1.5 border border-[#E6E4DD] hover:bg-[#FAF9F6] text-xs font-medium text-[#585651] hover:text-[#1A1917] rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title={`Previous: ${prevMod.shortName}`}
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
                title={`Next: ${nextMod.shortName}`}
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
            <span className="font-semibold text-[#1A1917]">Universal Detection Architecture: </span>
            Covers both AM and FM demodulation methods: non-coherent diode envelope detection for standard AM ($1/f_c \ll RC \ll 1/W$), coherent product detection with Costas loop phase tracking $\cos(\Delta\phi)$ for DSB-SC/SSB, and frequency discriminator / slope detection & PLL for FM recovery.
          </div>
        </div>

        {/* 3. Schematic & Analytics Grid */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Stage (8 Columns) */}
          <div className="lg:col-span-8 bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-xs flex flex-col">
            <div className="flex flex-wrap items-center justify-between pb-3 mb-4 border-b border-[#E6E4DD] gap-2">
              <div className="flex items-center gap-2">
                <ModuleGlyph id="demodulation" className="w-4 h-4" accent={true} />
                <h2 className="text-xs font-bold tracking-tight text-[#1A1917] uppercase font-mono">
                  Demodulator Circuit & Mathematical Recovery
                </h2>
              </div>

              {/* Mode Selector */}
              <div className="flex items-center gap-1 bg-[#FAF9F6] p-0.5 rounded border border-[#E6E4DD]">
                <button
                  type="button"
                  onClick={() => setDetectorMode('envelope')}
                  className={`px-2.5 py-1 text-xs font-mono font-semibold rounded cursor-pointer transition ${
                    detectorMode === 'envelope'
                      ? 'bg-[#C85A32] text-white shadow-2xs'
                      : 'text-[#585651] hover:text-[#1A1917]'
                  }`}
                >
                  AM Envelope
                </button>
                <button
                  type="button"
                  onClick={() => setDetectorMode('coherent')}
                  className={`px-2.5 py-1 text-xs font-mono font-semibold rounded cursor-pointer transition ${
                    detectorMode === 'coherent'
                      ? 'bg-[#C85A32] text-white shadow-2xs'
                      : 'text-[#585651] hover:text-[#1A1917]'
                  }`}
                >
                  AM Coherent
                </button>
                <button
                  type="button"
                  onClick={() => setDetectorMode('fm_slope')}
                  className={`px-2.5 py-1 text-xs font-mono font-semibold rounded cursor-pointer transition ${
                    detectorMode === 'fm_slope'
                      ? 'bg-[#C85A32] text-white shadow-2xs'
                      : 'text-[#585651] hover:text-[#1A1917]'
                  }`}
                >
                  FM Discriminator
                </button>
              </div>
            </div>

            {/* Canvas Schematic Area */}
            <div className="relative w-full min-h-[260px] sm:min-h-[290px] bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden flex items-center justify-center p-4">
              {detectorMode === 'envelope' && (
                <>
                  {/* Live Diode Conduction State Indicator */}
                  <div
                    className={`absolute top-3 right-3 px-2.5 py-1 rounded-full border text-[11px] font-mono font-semibold flex items-center gap-1.5 shadow-2xs transition-colors ${
                      isDiodeOn
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
                        : 'bg-white border-[#E6E4DD] text-[#585651]'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        isDiodeOn ? 'bg-emerald-500 animate-pulse' : 'bg-[#8A8882]'
                      }`}
                    />
                    <span>
                      Diode D1: {isDiodeOn ? 'Forward Biased / ON' : 'Reverse Biased / OFF'}
                    </span>
                  </div>

                  <svg
                    viewBox="0 0 520 200"
                    className="w-full h-full max-h-[60vh] select-none"
                    aria-label="Diode Envelope Detector Circuit"
                  >
                    <text x="50" y="80" textAnchor="middle" className="text-[11px] font-mono font-bold fill-[#1A1917]">s(t) AM IN</text>
                    <line x1="50" y1="100" x2="110" y2="100" stroke="#1A1917" strokeWidth="2" />

                    {/* Rectifier Diode with live bias highlighting */}
                    <polygon
                      points="110,85 145,100 110,115"
                      fill={isDiodeOn ? '#D1FAE5' : '#FFFFFF'}
                      stroke={isDiodeOn ? '#059669' : '#C85A32'}
                      strokeWidth="2"
                    />
                    <line
                      x1="145"
                      y1="85"
                      x2="145"
                      y2="115"
                      stroke={isDiodeOn ? '#059669' : '#C85A32'}
                      strokeWidth="2.5"
                    />
                    <text
                      x="127"
                      y="75"
                      textAnchor="middle"
                      className={`text-[10px] font-mono font-bold ${
                        isDiodeOn ? 'fill-[#059669]' : 'fill-[#C85A32]'
                      }`}
                    >
                      Diode D1 ({isDiodeOn ? 'ON' : 'OFF'})
                    </text>

                    <line
                      x1="145"
                      y1="100"
                      x2="230"
                      y2="100"
                      stroke={isDiodeOn ? '#059669' : '#1A1917'}
                      strokeWidth="2"
                    />

                    {/* Shunt Capacitor C */}
                    <line x1="230" y1="100" x2="230" y2="130" stroke="#585651" strokeWidth="1.5" />
                    <line x1="215" y1="130" x2="245" y2="130" stroke="#1A1917" strokeWidth="2" />
                    <line x1="215" y1="136" x2="245" y2="136" stroke="#1A1917" strokeWidth="2" />
                    <line x1="230" y1="136" x2="230" y2="165" stroke="#585651" strokeWidth="1.5" />
                    <text x="195" y="136" className="text-[10px] font-mono font-bold fill-[#585651]">C</text>

                    <line x1="230" y1="100" x2="310" y2="100" stroke="#1A1917" strokeWidth="2" />

                    {/* Shunt Resistor R */}
                    <line x1="310" y1="100" x2="310" y2="120" stroke="#585651" strokeWidth="1.5" />
                    <rect x="303" y="120" width="14" height="28" fill="#FAF9F6" stroke="#1A1917" strokeWidth="1.5" />
                    <line x1="310" y1="148" x2="310" y2="165" stroke="#585651" strokeWidth="1.5" />
                    <text x="325" y="138" className="text-[10px] font-mono font-bold fill-[#585651]">R</text>

                    {/* Ground Line */}
                    <line x1="200" y1="165" x2="340" y2="165" stroke="#8A8882" strokeWidth="1.5" />
                    <line x1="260" y1="165" x2="260" y2="175" stroke="#8A8882" strokeWidth="1.5" />
                    <line x1="250" y1="175" x2="270" y2="175" stroke="#8A8882" strokeWidth="1.5" />
                    <line x1="254" y1="179" x2="266" y2="179" stroke="#8A8882" strokeWidth="1.5" />

                    {/* Output recovered message */}
                    <line x1="310" y1="100" x2="420" y2="100" stroke="#C85A32" strokeWidth="2.5" />
                    <polygon points="420,100 412,96 412,104" fill="#C85A32" />
                    <text x="430" y="96" className="text-[11px] font-mono font-bold fill-[#C85A32]">v_out(t) OUT</text>
                    <text x="430" y="112" className="text-[9px] font-mono fill-[#75736E]">RC = {envRcUs.toFixed(1)} μs</text>
                  </svg>
                </>
              )}

              {detectorMode === 'coherent' && (
                <svg
                  viewBox="0 0 520 200"
                  className="w-full h-full max-h-[60vh] select-none"
                  aria-label="Coherent Product Demodulator Circuit"
                >
                  <text x="50" y="90" textAnchor="middle" className="text-[11px] font-mono font-bold fill-[#1A1917]">s(t) DSB/SSB</text>
                  <line x1="50" y1="110" x2="140" y2="110" stroke="#1A1917" strokeWidth="2" />

                  {/* Multiplier Mixer Block */}
                  <circle cx="160" cy="110" r="20" fill="#FFFFFF" stroke="#C85A32" strokeWidth="2" />
                  <line x1="146" y1="96" x2="174" y2="124" stroke="#C85A32" strokeWidth="2" />
                  <line x1="146" y1="124" x2="174" y2="96" stroke="#C85A32" strokeWidth="2" />
                  <text x="160" y="78" textAnchor="middle" className="text-[10px] font-mono font-bold fill-[#C85A32]">Product Mixer (×)</text>

                  {/* Local Carrier Input */}
                  <line x1="160" y1="175" x2="160" y2="130" stroke="#585651" strokeWidth="1.5" />
                  <text x="160" y="190" textAnchor="middle" className="text-[10px] font-mono font-bold fill-[#585651]">2·cos(2π fc t + Δϕ)</text>

                  <line x1="180" y1="110" x2="260" y2="110" stroke="#1A1917" strokeWidth="2" />

                  {/* Low Pass Filter Box */}
                  <rect x="260" y="85" width="80" height="50" rx="4" fill="#FFFFFF" stroke="#1A1917" strokeWidth="1.5" />
                  <text x="300" y="108" textAnchor="middle" className="text-[10px] font-mono font-bold fill-[#1A1917]">LPF</text>
                  <text x="300" y="124" textAnchor="middle" className="text-[9px] font-mono fill-[#75736E]">Cutoff = {lpfCutoff} kHz</text>

                  {/* Output */}
                  <line x1="340" y1="110" x2="430" y2="110" stroke="#C85A32" strokeWidth="2.5" />
                  <polygon points="430,110 422,106 422,114" fill="#C85A32" />
                  <text x="440" y="105" className="text-[11px] font-mono font-bold fill-[#C85A32]">m(t)·cos(Δϕ)</text>
                  <text x="440" y="122" className="text-[9px] font-mono fill-[#75736E]">Phase error: {phaseOffset}°</text>
                </svg>
              )}

              {detectorMode === 'fm_slope' && (
                <svg
                  viewBox="0 0 520 200"
                  className="w-full h-full max-h-[60vh] select-none"
                  aria-label="FM Discriminator & Slope Detector Circuit"
                >
                  <text x="50" y="90" textAnchor="middle" className="text-[11px] font-mono font-bold fill-[#1A1917]">s_FM(t) IN</text>
                  <line x1="50" y1="110" x2="120" y2="110" stroke="#1A1917" strokeWidth="2" />

                  {/* Differentiator / Slope Filter */}
                  <rect x="120" y="85" width="90" height="50" rx="4" fill="#FFFFFF" stroke="#C85A32" strokeWidth="1.5" />
                  <text x="165" y="106" textAnchor="middle" className="text-[10px] font-mono font-bold fill-[#C85A32]">Differentiator</text>
                  <text x="165" y="122" textAnchor="middle" className="text-[9px] font-mono fill-[#75736E]">d/dt [Slope Filter]</text>

                  <line x1="210" y1="110" x2="270" y2="110" stroke="#1A1917" strokeWidth="2" />

                  {/* Envelope Detector */}
                  <rect x="270" y="85" width="100" height="50" rx="4" fill="#FFFFFF" stroke="#1A1917" strokeWidth="1.5" />
                  <text x="320" y="106" textAnchor="middle" className="text-[10px] font-mono font-bold fill-[#1A1917]">Envelope Det</text>
                  <text x="320" y="122" textAnchor="middle" className="text-[9px] font-mono fill-[#75736E]">Diode + RC</text>

                  {/* Output */}
                  <line x1="370" y1="110" x2="435" y2="110" stroke="#C85A32" strokeWidth="2.5" />
                  <polygon points="435,110 427,106 427,114" fill="#C85A32" />
                  <text x="445" y="106" className="text-[11px] font-mono font-bold fill-[#C85A32]">m̂(t) AUDIO</text>
                  <text x="445" y="122" className="text-[9px] font-mono fill-[#75736E]">Proportional to Δf</text>
                </svg>
              )}
            </div>

            {/* 1. Live Multi-Stage Oscilloscope Waveform Card (AM Envelope mode only) */}
            {detectorMode === 'envelope' && (
              <div className="mt-5 rounded-lg border border-[#E6E4DD] bg-[#FAF9F6] p-4 space-y-3">
                {/* Oscilloscope Header & Playback Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#E6E4DD]">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-[#C85A32]" />
                    <h3 className="text-xs font-bold tracking-tight text-[#1A1917] uppercase font-mono">
                      Multi-Stage Envelope Detector Oscilloscope
                    </h3>
                    <span className="text-[10px] font-mono text-[#75736E] hidden sm:inline">
                      (f<sub>c</sub> = 100 kHz, f<sub>m</sub> = {envFmKhz.toFixed(1)} kHz)
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPlaying(!isPlaying)}
                      className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-colors flex items-center gap-1 cursor-pointer border ${
                        isPlaying
                          ? 'bg-[#1A1917] text-white border-[#1A1917]'
                          : 'bg-white border-[#E6E4DD] text-[#585651] hover:text-[#1A1917]'
                      }`}
                    >
                      {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
                      <span>{isPlaying ? 'Pause' : 'Play'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResetEnvelope}
                      className="p-1 bg-white border border-[#E6E4DD] rounded text-[#585651] hover:text-[#1A1917] transition-colors shadow-2xs cursor-pointer"
                      title="Reset AM Envelope parameters"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex items-center gap-0.5 bg-white border border-[#E6E4DD] rounded p-0.5 text-[11px] font-mono">
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

                {/* Live Canvas */}
                <div className="relative w-full h-60 sm:h-64 bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden">
                  <canvas ref={scopeCanvasRef} className="w-full h-full block" />
                </div>

                {/* Toggleable Signal Traces */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#585651]">
                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showIncomingAm}
                      onChange={(e) => setShowIncomingAm(e.target.checked)}
                      className="accent-[#585651] rounded"
                    />
                    <span className="inline-block w-3 h-0.5 bg-[#585651]" />
                    <span>Incoming AM s(t)</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showRectifiedVd}
                      onChange={(e) => setShowRectifiedVd(e.target.checked)}
                      className="accent-[#D97706] rounded"
                    />
                    <span className="inline-block w-3 h-0.5 bg-[#D97706]" />
                    <span>Rectified Diode v<sub>D</sub>(t)</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showSmoothedVout}
                      onChange={(e) => setShowSmoothedVout(e.target.checked)}
                      className="accent-[#C85A32] rounded"
                    />
                    <span className="inline-block w-3 h-0.5 bg-[#C85A32]" />
                    <span className="font-medium text-[#1A1917]">RC Smoothed v<sub>out</sub>(t)</span>
                  </label>

                  <label className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showReferenceMt}
                      onChange={(e) => setShowReferenceMt(e.target.checked)}
                      className="accent-[#2563EB] rounded"
                    />
                    <span className="inline-block w-3 border-t-2 border-dashed border-[#2563EB]" />
                    <span>Reference Baseband m(t)</span>
                  </label>
                </div>

                {/* 3. Live Design Inequality & Distortion Diagnostic Bar */}
                <div
                  className={`p-3 rounded-md border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs ${
                    diagnostics.status === 'optimal'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : diagnostics.status === 'overmodulation'
                      ? 'bg-red-50 border-red-200 text-red-900'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold">
                    {diagnostics.status === 'optimal' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle
                        className={`w-4 h-4 shrink-0 ${
                          diagnostics.status === 'overmodulation' ? 'text-red-600' : 'text-amber-600'
                        }`}
                      />
                    )}
                    <span>{diagnostics.label}</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] bg-white/80 px-2.5 py-1 rounded border border-black/10 shrink-0">
                    <span>
                      1/ω<sub>c</sub> = <strong>{diagnostics.invOmegaC_us.toFixed(2)} μs</strong>
                    </span>
                    <span className="text-[#75736E]">≪</span>
                    <span className="text-[#C85A32] font-bold">
                      RC = {envRcUs.toFixed(1)} μs
                    </span>
                    <span className="text-[#75736E]">≪</span>
                    <span>
                      1/ω<sub>m</sub> = <strong>{diagnostics.invOmegaM_us.toFixed(1)} μs</strong>
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Interactive Design Controls */}
            <div className="mt-6 pt-5 border-t border-[#E6E4DD]">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] flex items-center gap-1.5 font-bold">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#585651]" />
                  <span>Detection Control Parameters</span>
                </div>
                {detectorMode === 'envelope' && (
                  <span className="text-[11px] font-mono text-[#75736E]">
                    Carrier fixed at f<sub>c</sub> = 100 kHz
                  </span>
                )}
              </div>

              {detectorMode === 'envelope' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* 1. RC Time Constant (1.0 us to 500.0 us) */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-[#1A1917]">RC Time Constant</span>
                        <span className="font-mono text-[#C85A32] font-semibold">
                          {envRcUs.toFixed(1)} μs
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1.0"
                        max="500.0"
                        step="1.0"
                        value={envRcUs}
                        onChange={(e) => setEnvRcUs(parseFloat(e.target.value))}
                        className="w-full accent-[#C85A32] cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5 gap-1">
                        <span>Carrier Ripple (Too Fast)</span>
                        <span className="text-center">Optimal</span>
                        <span className="text-right">Diagonal Clipping (Too Slow)</span>
                      </div>
                    </div>

                    {/* 2. Modulation Index (mu: 0.10 to 1.50) */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-[#1A1917]">Modulation Index (μ)</span>
                        <span className="font-mono text-[#C85A32] font-semibold">
                          {envMu.toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.10"
                        max="1.50"
                        step="0.05"
                        value={envMu}
                        onChange={(e) => setEnvMu(parseFloat(e.target.value))}
                        className="w-full accent-[#C85A32] cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5 gap-1">
                        <span>0.1 (Linear)</span>
                        <span className="text-center">1.0 (Critical)</span>
                        <span className="text-right">1.5 (Overmodulated Distortion)</span>
                      </div>
                    </div>

                    {/* 3. Message Frequency (f_m: 0.5 kHz to 10.0 kHz) */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-[#1A1917]">
                          Message Frequency (f<sub>m</sub>)
                        </span>
                        <span className="font-mono text-[#C85A32] font-semibold">
                          {envFmKhz.toFixed(1)} kHz
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="10.0"
                        step="0.1"
                        value={envFmKhz}
                        onChange={(e) => setEnvFmKhz(parseFloat(e.target.value))}
                        className="w-full accent-[#C85A32] cursor-pointer"
                      />
                      <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
                        <span>0.5 kHz</span>
                        <span>5.0 kHz</span>
                        <span>10.0 kHz</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Presets */}
                  <div className="pt-3 border-t border-[#E6E4DD]">
                    <div className="text-[10px] font-mono uppercase tracking-wider text-[#75736E] font-semibold mb-2">
                      Quick Presets
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEnvMu(0.7);
                          setEnvRcUs(50.0);
                          setEnvFmKhz(2.0);
                        }}
                        className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-colors cursor-pointer ${
                          Math.abs(envMu - 0.7) < 0.01 && Math.abs(envRcUs - 50.0) < 0.5 && Math.abs(envFmKhz - 2.0) < 0.05
                            ? 'bg-[#C85A32] text-white border-[#C85A32]'
                            : 'bg-[#FAF9F6] text-[#585651] border-[#E6E4DD] hover:text-[#1A1917]'
                        }`}
                      >
                        Optimal Envelope Recovery (μ=0.7, RC=50μs)
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEnvMu(0.7);
                          setEnvRcUs(3.0);
                          setEnvFmKhz(2.0);
                        }}
                        className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-colors cursor-pointer ${
                          Math.abs(envRcUs - 3.0) < 0.5 && envMu <= 1.0
                            ? 'bg-[#C85A32] text-white border-[#C85A32]'
                            : 'bg-[#FAF9F6] text-[#585651] border-[#E6E4DD] hover:text-[#1A1917]'
                        }`}
                      >
                        Excessive Carrier Ripple (RC=3μs)
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEnvMu(0.7);
                          setEnvRcUs(350.0);
                          setEnvFmKhz(2.0);
                        }}
                        className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-colors cursor-pointer ${
                          Math.abs(envRcUs - 350.0) < 0.5 && envMu <= 1.0
                            ? 'bg-[#C85A32] text-white border-[#C85A32]'
                            : 'bg-[#FAF9F6] text-[#585651] border-[#E6E4DD] hover:text-[#1A1917]'
                        }`}
                      >
                        Diagonal Clipping (RC=350μs)
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEnvMu(1.3);
                          setEnvRcUs(50.0);
                          setEnvFmKhz(2.0);
                        }}
                        className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-colors cursor-pointer ${
                          Math.abs(envMu - 1.3) < 0.01
                            ? 'bg-[#C85A32] text-white border-[#C85A32]'
                            : 'bg-[#FAF9F6] text-[#585651] border-[#E6E4DD] hover:text-[#1A1917]'
                        }`}
                      >
                        Overmodulation Failure (μ=1.3)
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-[#1A1917]">RC Time Constant</span>
                      <span className="font-mono text-[#C85A32] font-semibold">{(rcConstant * 1000).toFixed(1)} μs</span>
                    </div>
                    <input
                      type="range"
                      min="0.01"
                      max="0.2"
                      step="0.01"
                      value={rcConstant}
                      onChange={(e) => setRcConstant(parseFloat(e.target.value))}
                      className="w-full accent-[#C85A32] cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
                      <span>Fast discharge</span>
                      <span>Diagonal clipping limit</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-[#1A1917]">Carrier Phase Offset (Δϕ)</span>
                      <span className="font-mono text-[#C85A32] font-semibold">{phaseOffset}°</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="90"
                      step="5"
                      value={phaseOffset}
                      onChange={(e) => setPhaseOffset(parseInt(e.target.value, 10))}
                      className="w-full accent-[#C85A32] cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
                      <span>0° (Max Gain)</span>
                      <span>90° (Null Quad)</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-[#1A1917]">LPF Cutoff (fc)</span>
                      <span className="font-mono text-[#C85A32] font-semibold">{lpfCutoff} kHz</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="15"
                      step="1"
                      value={lpfCutoff}
                      onChange={(e) => setLpfCutoff(parseInt(e.target.value, 10))}
                      className="w-full accent-[#C85A32] cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
                      <span>1 kHz</span>
                      <span>15 kHz</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Theory (4 Columns) */}
          <div className="lg:col-span-4 space-y-6">
            {/* KaTeX Model Card */}
            <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-4 sm:p-5 shadow-xs">
              <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-2 flex items-center gap-1.5 font-bold">
                <BookOpen className="w-3.5 h-3.5 text-[#585651]" />
                <span>Analytical Formulation</span>
              </div>
              {detectorMode === 'envelope' ? (
                <div className="space-y-3">
                  <div className="text-xs text-[#585651] font-medium">
                    Non-Coherent AM Envelope Detection
                  </div>

                  <div className="p-3 bg-white rounded border border-[#E6E4DD] space-y-2.5 text-xs text-[#1A1917]">
                    <div>
                      <div className="text-[10px] font-mono uppercase tracking-wider text-[#75736E] mb-0.5">
                        Rectification
                      </div>
                      <MathView math="v_{\text{rect}}(t) = \max\bigl(0,\, s(t)\bigr)" displayMode={true} />
                    </div>

                    <div className="pt-2 border-t border-[#EFEFEA]">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-[#75736E] mb-0.5">
                        RC Design Condition
                      </div>
                      <MathView math="\frac{1}{\omega_c} \ll RC \ll \frac{1}{\omega_m}" displayMode={true} />
                    </div>

                    <div className="pt-2 border-t border-[#EFEFEA]">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-[#75736E] mb-0.5">
                        Recovered Output (for μ ≤ 1)
                      </div>
                      <MathView math="v_{\text{out}}(t) \approx \frac{A_c}{\pi}\bigl[1 + \mu\, m(t)\bigr]" displayMode={true} />
                      <p className="text-[11px] text-[#585651] mt-1 leading-snug">
                        Followed by a DC-blocking capacitor to isolate <span className="font-mono font-semibold text-[#1A1917]">m(t)</span>.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-xs text-[#585651] mb-2 font-medium">
                    {subTopic.formulaLabel}
                  </div>
                  <div className="p-3 bg-white rounded border border-[#E6E4DD] text-xs font-semibold text-[#1A1917] overflow-x-auto">
                    <MathView math={subTopic.formula} displayMode={true} />
                  </div>
                </>
              )}
            </div>

            {/* Curricular Focus Areas */}
            <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-4 sm:p-5 shadow-xs">
              <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-3 flex items-center gap-1.5 font-bold">
                <Layers className="w-3.5 h-3.5 text-[#585651]" />
                <span>Curricular Topics</span>
              </div>
              <ul className="space-y-2.5">
                {subTopic.topics.map((t, idx) => (
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

