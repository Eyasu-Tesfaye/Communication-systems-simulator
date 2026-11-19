/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  SlidersHorizontal,
  BookOpen,
  Layers,
  Activity,
  GitMerge,
  Scale,
} from 'lucide-react';
import { AM_MODULES, AMSubTopic } from '../../data/modules';
import { ModuleGlyph } from '../../components/ModuleGlyphs';
import { MathView } from '../../components/MathView';

// ============================================================================
// 1. DSP ENGINE: PM MODULATION & 4-STAGE DISCRIMINATOR DEMODULATION
// ============================================================================
export type MessageWaveform = 'sine' | 'triangle' | 'square' | 'pulse';

export interface PMParams {
  Ac: number; // Carrier amplitude (V)
  fc: number; // Carrier frequency (Hz)
  Am: number; // Message amplitude (V)
  fm: number; // Message frequency (Hz)
  kp: number; // Phase sensitivity (rad/V)
  waveform: MessageWaveform;
  kf: number; // FM comparison sensitivity (Hz/V)
}

export const DEFAULT_PM_PARAMS: PMParams = {
  Ac: 1.5,
  fc: 18,
  Am: 1.0,
  fm: 1.5,
  kp: 2.0,
  waveform: 'sine',
  kf: 3.0,
};

interface PMMetrics {
  deltaThetaMaxRad: number;
  deltaFMaxHz: number;
  avgPowerW: number;
  linearityRatio: number;
  isLinearRegion: boolean;
  dcPedestalMeasured: number;
  nrmsePercent: number;
  correlationR: number;
}

interface SimulationData {
  t: Float64Array;
  dt: number;
  N: number;
  m: Float64Array;
  dmDt: Float64Array;
  c: Float64Array;
  sPM: Float64Array;
  deltaTheta: Float64Array;
  fiPM: Float64Array;
  sFM: Float64Array;
  fiFM: Float64Array;
  stage1Diff: Float64Array;
  stage1TheoEnvPos: Float64Array;
  stage2Rectified: Float64Array;
  stage2Envelope: Float64Array;
  stage3DcBlocked: Float64Array;
  stage4Integrated: Float64Array;
  metrics: PMMetrics;
}

const SAMPLE_COUNT = 1800;
const WINDOW_DURATION = 2.0;

function evalMessageAndDerivative(
  waveform: MessageWaveform,
  Am: number,
  fm: number,
  t: number
): { value: number; deriv: number } {
  const omega = 2 * Math.PI * fm;
  const phase = omega * t;

  switch (waveform) {
    case 'sine':
      return {
        value: Am * Math.cos(phase),
        deriv: -Am * omega * Math.sin(phase),
      };

    case 'triangle': {
      const normPhase = ((fm * t) % 1 + 1) % 1;
      const eps = 0.015;
      if (normPhase < eps) {
        const u = normPhase / eps;
        return { value: Am * (1 - 2 * eps * u * u), deriv: -4 * Am * fm * u };
      } else if (normPhase < 0.5 - eps) {
        return { value: Am * (1 - 4 * normPhase), deriv: -4 * Am * fm };
      } else if (normPhase < 0.5 + eps) {
        const u = (normPhase - 0.5) / eps;
        return { value: Am * (-1 + 2 * eps * (1 + u * u)), deriv: 4 * Am * fm * u };
      } else if (normPhase < 1.0 - eps) {
        return { value: Am * (-1 + 4 * (normPhase - 0.5)), deriv: 4 * Am * fm };
      }
      const u = (1.0 - normPhase) / eps;
      return { value: Am * (1 - 2 * eps * u * u), deriv: -4 * Am * fm * u };
    }

    case 'square': {
      const k = 0.16;
      const th = Math.tanh(Math.sin(phase) / k);
      const sech2 = 1 - th * th;
      return {
        value: Am * th,
        deriv: (Am * sech2 * (omega * Math.cos(phase))) / k,
      };
    }

    case 'pulse': {
      const k = 0.16;
      const th = Math.tanh((Math.cos(phase) - 0.45) / k);
      const sech2 = 1 - th * th;
      return {
        value: Am * 0.5 * (th + 1),
        deriv: (Am * 0.5 * sech2 * (-omega * Math.sin(phase))) / k,
      };
    }
  }
}

function zeroPhaseButterworthLPF(
  input: Float64Array,
  sampleRate: number,
  cutoffHz: number
): Float64Array {
  const N = input.length;
  const clampedCutoff = Math.max(1.0, Math.min(cutoffHz, sampleRate * 0.42));
  const ita = 1.0 / Math.tan((Math.PI * clampedCutoff) / sampleRate);
  const q = Math.SQRT2;
  const b0 = 1.0 / (1.0 + q * ita + ita * ita);
  const b1 = 2.0 * b0;
  const b2 = b0;
  const a1 = 2.0 * (ita * ita - 1.0) * b0;
  const a2 = -(1.0 - q * ita + ita * ita) * b0;

  const pad = Math.min(180, Math.floor(N / 2));
  const paddedLen = N + 2 * pad;
  const padded = new Float64Array(paddedLen);

  for (let i = 0; i < pad; i++) padded[pad - 1 - i] = input[Math.min(i + 1, N - 1)];
  for (let i = 0; i < N; i++) padded[pad + i] = input[i];
  for (let i = 0; i < pad; i++) padded[pad + N + i] = input[Math.max(0, N - 2 - i)];

  const fwd = new Float64Array(paddedLen);
  fwd[0] = padded[0];
  fwd[1] = padded[1];
  for (let i = 2; i < paddedLen; i++) {
    fwd[i] =
      b0 * padded[i] +
      b1 * padded[i - 1] +
      b2 * padded[i - 2] +
      a1 * fwd[i - 1] +
      a2 * fwd[i - 2];
  }

  const bwd = new Float64Array(paddedLen);
  bwd[paddedLen - 1] = fwd[paddedLen - 1];
  bwd[paddedLen - 2] = fwd[paddedLen - 2];
  for (let i = paddedLen - 3; i >= 0; i--) {
    bwd[i] =
      b0 * fwd[i] +
      b1 * fwd[i + 1] +
      b2 * fwd[i + 2] +
      a1 * bwd[i + 1] +
      a2 * bwd[i + 2];
  }

  const out = new Float64Array(N);
  for (let i = 0; i < N; i++) out[i] = bwd[pad + i];
  return out;
}

function runPMSimulation(params: PMParams, phaseShiftSec = 0): SimulationData {
  const N = SAMPLE_COUNT;
  const dt = WINDOW_DURATION / (N - 1);
  const sampleRate = 1 / dt;

  const t = new Float64Array(N);
  const m = new Float64Array(N);
  const dmDt = new Float64Array(N);
  const c = new Float64Array(N);
  const sPM = new Float64Array(N);
  const deltaTheta = new Float64Array(N);
  const fiPM = new Float64Array(N);
  const sFM = new Float64Array(N);
  const fiFM = new Float64Array(N);

  const wc = 2 * Math.PI * params.fc;
  let fmPhaseIntegral = 0;
  let maxSlopeTerm = 0;
  let maxDeltaF = 0;
  let maxDeltaTheta = 0;

  for (let i = 0; i < N; i++) {
    const ti = i * dt;
    const tEval = ti + phaseShiftSec;
    t[i] = ti;

    const { value: mVal, deriv: mDeriv } = evalMessageAndDerivative(
      params.waveform,
      params.Am,
      params.fm,
      tEval
    );

    m[i] = mVal;
    dmDt[i] = mDeriv;

    const carrierAngle = wc * tEval;
    c[i] = params.Ac * Math.cos(carrierAngle);

    const dTheta = params.kp * mVal;
    deltaTheta[i] = dTheta;
    sPM[i] = params.Ac * Math.cos(carrierAngle + dTheta);

    const slopeTerm = Math.abs(params.kp * mDeriv);
    if (slopeTerm > maxSlopeTerm) maxSlopeTerm = slopeTerm;
    if (Math.abs(dTheta) > maxDeltaTheta) maxDeltaTheta = Math.abs(dTheta);

    const freqDevPM = (params.kp / (2 * Math.PI)) * mDeriv;
    fiPM[i] = params.fc + freqDevPM;
    if (Math.abs(freqDevPM) > maxDeltaF) maxDeltaF = Math.abs(freqDevPM);

    if (i > 0) {
      fmPhaseIntegral += 0.5 * (m[i] + m[i - 1]) * dt;
    } else if (params.waveform === 'sine' && phaseShiftSec !== 0) {
      fmPhaseIntegral =
        Math.sin(2 * Math.PI * params.fm * tEval) * (params.Am / (2 * Math.PI * params.fm));
    }

    const fmAngle =
      params.waveform === 'sine'
        ? wc * tEval +
          ((params.kf * params.Am) / params.fm) * Math.sin(2 * Math.PI * params.fm * tEval)
        : wc * tEval + 2 * Math.PI * params.kf * fmPhaseIntegral;

    sFM[i] = params.Ac * Math.cos(fmAngle);
    fiFM[i] = params.fc + params.kf * mVal;
  }

  // 4-Stage Frequency Discriminator PM Demodulation
  const stage1Diff = new Float64Array(N);
  const stage1TheoEnvPos = new Float64Array(N);
  const stage2Rectified = new Float64Array(N);

  for (let i = 0; i < N; i++) {
    let deriv: number;
    if (i === 0) deriv = (sPM[1] - sPM[0]) / dt;
    else if (i === N - 1) deriv = (sPM[N - 1] - sPM[N - 2]) / dt;
    else deriv = (sPM[i + 1] - sPM[i - 1]) / (2 * dt);

    stage1Diff[i] = deriv;
    stage1TheoEnvPos[i] = params.Ac * (wc + params.kp * dmDt[i]);
    stage2Rectified[i] = Math.abs(deriv) * (Math.PI / 2);
  }

  const lpfCutoff = Math.max(4.0, Math.min(0.68 * params.fc, Math.max(6.5 * params.fm, 8.5)));
  const stage2Envelope = zeroPhaseButterworthLPF(stage2Rectified, sampleRate, lpfCutoff);

  let envSum = 0;
  for (let i = 0; i < N; i++) envSum += stage2Envelope[i];
  const dcPedestalMeasured = envSum / N;

  const stage3DcBlocked = new Float64Array(N);
  for (let i = 0; i < N; i++) stage3DcBlocked[i] = stage2Envelope[i] - dcPedestalMeasured;

  const rawIntegral = new Float64Array(N);
  const gain = params.Ac * params.kp;
  let integSum = 0;
  for (let i = 1; i < N; i++) {
    rawIntegral[i] =
      rawIntegral[i - 1] + 0.5 * (stage3DcBlocked[i] + stage3DcBlocked[i - 1]) * dt;
    integSum += rawIntegral[i];
  }

  const integMean = integSum / N;
  const stage4Integrated = new Float64Array(N);

  let mMean = 0;
  for (let i = 0; i < N; i++) mMean += m[i];
  mMean /= N;

  if (Math.abs(gain) > 1e-6) {
    for (let i = 0; i < N; i++) stage4Integrated[i] = (rawIntegral[i] - integMean) / gain;
  }

  let sumSqErr = 0;
  let sumSqOrig = 0;
  let sumOrigRec = 0;
  let sumRecSq = 0;

  for (let i = 0; i < N; i++) {
    const mAc = m[i] - mMean;
    const recAc = stage4Integrated[i];
    const err = recAc - mAc;
    sumSqErr += err * err;
    sumSqOrig += mAc * mAc;
    sumOrigRec += mAc * recAc;
    sumRecSq += recAc * recAc;
  }

  const nrmsePercent =
    sumSqOrig > 1e-9
      ? Math.min(100, (Math.sqrt(sumSqErr / N) / Math.sqrt(sumSqOrig / N)) * 100)
      : 0;
  const denom = Math.sqrt(sumSqOrig * sumRecSq);
  const correlationR = denom > 1e-9 ? Math.max(-1, Math.min(1, sumOrigRec / denom)) : 0;
  const linearityRatio = wc > 1e-6 ? maxSlopeTerm / wc : 0;

  return {
    t,
    dt,
    N,
    m,
    dmDt,
    c,
    sPM,
    deltaTheta,
    fiPM,
    sFM,
    fiFM,
    stage1Diff,
    stage1TheoEnvPos,
    stage2Rectified,
    stage2Envelope,
    stage3DcBlocked,
    stage4Integrated,
    metrics: {
      deltaThetaMaxRad: maxDeltaTheta,
      deltaFMaxHz: maxDeltaF,
      avgPowerW: (params.Ac * params.Ac) / 2,
      linearityRatio,
      isLinearRegion: linearityRatio < 0.85,
      dcPedestalMeasured,
      nrmsePercent,
      correlationR,
    },
  };
}

// ============================================================================
// 2. HIGH-DPI WAVEFORM CANVAS (Clean Signal Lab Editorial Style)
// ============================================================================
interface TraceConfig {
  id: string;
  label: string;
  data: Float64Array;
  color: string;
  lineWidth?: number;
  dashed?: boolean;
  opacity?: number;
  fillBelow?: string;
}

interface ReferenceLine {
  value: number;
  label?: string;
  color: string;
  dashed?: boolean;
}

const WaveformCanvas: React.FC<{
  title: string;
  subtitle?: string;
  unit: string;
  t: Float64Array;
  traces: TraceConfig[];
  yRange?: [number, number];
  height?: number;
  referenceLines?: ReferenceLine[];
  hoverIndex?: number | null;
  onHoverIndexChange?: (index: number | null) => void;
}> = ({
  title,
  subtitle,
  unit,
  t,
  traces,
  yRange,
  height = 150,
  referenceLines = [],
  hoverIndex,
  onHoverIndexChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [localHoverIdx, setLocalHoverIdx] = useState<number | null>(null);
  const [width, setWidth] = useState<number>(600);

  const activeHoverIdx = hoverIndex !== undefined ? hoverIndex : localHoverIdx;

  const computedBounds = useMemo((): [number, number] => {
    if (yRange) return yRange;
    let min = Infinity;
    let max = -Infinity;
    for (const trace of traces) {
      for (let i = 0; i < trace.data.length; i++) {
        const v = trace.data[i];
        if (Number.isFinite(v)) {
          if (v < min) min = v;
          if (v > max) max = v;
        }
      }
    }
    for (const ref of referenceLines) {
      if (ref.value < min) min = ref.value;
      if (ref.value > max) max = ref.value;
    }
    if (!Number.isFinite(min) || !Number.isFinite(max)) return [-1, 1];
    if (Math.abs(max - min) < 1e-6) return [min - 1, max + 1];
    const pad = (max - min) * 0.14;
    return [min - pad, max + pad];
  }, [traces, referenceLines, yRange]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(Math.max(240, Math.floor(entry.contentRect.width)));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const padLeft = 48;
    const padRight = 14;
    const padTop = 10;
    const padBottom = 22;
    const plotW = Math.max(40, width - padLeft - padRight);
    const plotH = Math.max(40, height - padTop - padBottom);

    ctx.fillStyle = '#FAF9F6';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(padLeft, padTop, plotW, plotH);

    const [yMin, yMax] = computedBounds;
    const tMin = t.length > 0 ? t[0] : 0;
    const tMax = t.length > 0 ? t[t.length - 1] : 2;
    const xToPx = (time: number) => padLeft + ((time - tMin) / (tMax - tMin || 1)) * plotW;
    const yToPx = (val: number) => padTop + (1 - (val - yMin) / (yMax - yMin || 1)) * plotH;

    ctx.lineWidth = 1;
    ctx.font = '10px "JetBrains Mono", ui-monospace, monospace';
    ctx.textBaseline = 'middle';

    const yTicks = 4;
    for (let i = 0; i <= yTicks; i++) {
      const frac = i / yTicks;
      const yVal = yMax - frac * (yMax - yMin);
      const py = Math.round(padTop + frac * plotH) + 0.5;
      ctx.strokeStyle = '#F0EEE6';
      ctx.beginPath();
      ctx.moveTo(padLeft, py);
      ctx.lineTo(padLeft + plotW, py);
      ctx.stroke();

      ctx.fillStyle = '#75736E';
      ctx.textAlign = 'right';
      const formatted =
        Math.abs(yVal) >= 100
          ? yVal.toFixed(0)
          : Math.abs(yVal) >= 10
          ? yVal.toFixed(1)
          : yVal.toFixed(2);
      ctx.fillText(formatted, padLeft - 6, py);
    }

    if (yMin < 0 && yMax > 0) {
      const yZero = Math.round(yToPx(0)) + 0.5;
      ctx.strokeStyle = '#D1CFCE';
      ctx.beginPath();
      ctx.moveTo(padLeft, yZero);
      ctx.lineTo(padLeft + plotW, yZero);
      ctx.stroke();
    }

    const xTicks = 6;
    ctx.textBaseline = 'top';
    for (let i = 0; i <= xTicks; i++) {
      const frac = i / xTicks;
      const tVal = tMin + frac * (tMax - tMin);
      const px = Math.round(padLeft + frac * plotW) + 0.5;
      ctx.strokeStyle = '#F0EEE6';
      ctx.beginPath();
      ctx.moveTo(px, padTop);
      ctx.lineTo(px, padTop + plotH);
      ctx.stroke();

      ctx.fillStyle = '#75736E';
      ctx.textAlign = i === 0 ? 'left' : i === xTicks ? 'right' : 'center';
      ctx.fillText(`${tVal.toFixed(2)}s`, px, padTop + plotH + 5);
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(padLeft, padTop, plotW, plotH);
    ctx.clip();

    for (const ref of referenceLines) {
      const py = yToPx(ref.value);
      ctx.save();
      ctx.strokeStyle = ref.color;
      ctx.lineWidth = 1.2;
      if (ref.dashed) ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(padLeft, py);
      ctx.lineTo(padLeft + plotW, py);
      ctx.stroke();

      if (ref.label) {
        ctx.fillStyle = ref.color;
        ctx.font = '600 9.5px "JetBrains Mono", ui-monospace, monospace';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(ref.label, padLeft + plotW - 6, py - 2);
      }
      ctx.restore();
    }

    const N = t.length;
    for (const trace of traces) {
      const data = trace.data;
      if (data.length === 0 || N === 0) continue;
      ctx.save();
      ctx.globalAlpha = trace.opacity ?? 1;
      ctx.strokeStyle = trace.color;
      ctx.lineWidth = trace.lineWidth ?? 1.85;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      if (trace.dashed) ctx.setLineDash([5, 4]);

      ctx.beginPath();
      for (let i = 0; i < N; i++) {
        const px = xToPx(t[i]);
        const py = yToPx(data[i]);
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();

      if (trace.fillBelow && yMin <= 0 && yMax >= 0) {
        const zeroY = yToPx(0);
        ctx.lineTo(xToPx(t[N - 1]), zeroY);
        ctx.lineTo(xToPx(t[0]), zeroY);
        ctx.closePath();
        ctx.fillStyle = trace.fillBelow;
        ctx.fill();
      }
      ctx.restore();
    }

    if (activeHoverIdx !== null && activeHoverIdx >= 0 && activeHoverIdx < N) {
      const hx = xToPx(t[activeHoverIdx]);
      ctx.strokeStyle = 'rgba(26, 25, 23, 0.32)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(hx, padTop);
      ctx.lineTo(hx, padTop + plotH);
      ctx.stroke();
      ctx.setLineDash([]);

      for (const trace of traces) {
        const v = trace.data[activeHoverIdx];
        if (!Number.isFinite(v)) continue;
        const hy = yToPx(v);
        ctx.fillStyle = trace.color;
        ctx.beginPath();
        ctx.arc(hx, hy, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }

    ctx.restore();
    ctx.strokeStyle = '#E6E4DD';
    ctx.lineWidth = 1;
    ctx.strokeRect(padLeft + 0.5, padTop + 0.5, plotW - 1, plotH - 1);
  }, [width, height, t, traces, computedBounds, referenceLines, activeHoverIdx]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || t.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const padLeft = 48;
    const padRight = 14;
    const plotW = Math.max(40, width - padLeft - padRight);
    const frac = Math.max(0, Math.min(1, (e.clientX - rect.left - padLeft) / plotW));
    const idx = Math.round(frac * (t.length - 1));
    setLocalHoverIdx(idx);
    onHoverIndexChange?.(idx);
  };

  const handleMouseLeave = () => {
    setLocalHoverIdx(null);
    onHoverIndexChange?.(null);
  };

  return (
    <div className="rounded-lg border border-[#E6E4DD] bg-white overflow-hidden shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 border-b border-[#E6E4DD] bg-[#FAF9F6]">
        <div className="flex items-baseline gap-2 min-w-0">
          <h4 className="font-bold tracking-tight text-[#1A1917] uppercase font-mono text-[11px] truncate">
            {title}
          </h4>
          {subtitle && (
            <span className="text-[11px] text-[#75736E] truncate hidden sm:inline">{subtitle}</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {traces.map((tr) => (
            <div key={tr.id} className="flex items-center gap-1.5">
              <span
                className="inline-block w-3 h-0.5 rounded-full"
                style={{
                  backgroundColor: tr.color,
                  borderBottom: tr.dashed ? `2px dashed ${tr.color}` : undefined,
                }}
              />
              <span className="font-mono font-medium text-[#585651] text-[10.5px] whitespace-nowrap">
                {tr.label}
              </span>
            </div>
          ))}
          <span className="font-mono text-[10.5px] text-[#8A8882]">[{unit}]</span>
        </div>
      </div>

      <div ref={containerRef} className="relative w-full">
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="block w-full cursor-crosshair"
        />
        {activeHoverIdx !== null && activeHoverIdx >= 0 && activeHoverIdx < t.length && (
          <div className="pointer-events-none absolute top-2 right-4 rounded border border-[#E6E4DD] bg-white/95 px-2 py-1 font-mono text-[10.5px] tabular-nums text-[#1A1917] shadow-xs">
            <span className="text-[#75736E]">t={t[activeHoverIdx].toFixed(3)}s</span>
            {traces.map((tr) => (
              <span key={tr.id} className="ml-2 font-semibold" style={{ color: tr.color }}>
                {tr.label}: {tr.data[activeHoverIdx]?.toFixed(2)} {unit}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 3. COMPACT ROTATING PHASOR VISUALIZER
// ============================================================================
const RotatingPhasorCard: React.FC<{ params: PMParams }> = ({ params }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [phasorPhase, setPhasorPhase] = useState(0.25);
  const [autoSpin, setAutoSpin] = useState(true);

  useEffect(() => {
    if (!autoSpin) return;
    let animId: number;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setPhasorPhase((prev) => (prev + dt * 0.22) % 1);
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [autoSpin]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = 240;
    const h = 190;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#FAF9F6';
    ctx.fillRect(0, 0, w, h);

    const cx = w * 0.5;
    const cy = h * 0.54;
    const radius = Math.min(68, 34 + params.Ac * 12);

    ctx.strokeStyle = '#D1CFCE';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - radius - 16, cy);
    ctx.lineTo(cx + radius + 16, cy);
    ctx.moveTo(cx, cy - radius - 16);
    ctx.lineTo(cx, cy + radius + 16);
    ctx.stroke();

    ctx.strokeStyle = '#D9D7CE';
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    const carrierTheta = phasorPhase * 2 * Math.PI * 3;
    const mVal = params.Am * Math.cos(phasorPhase * 2 * Math.PI);
    const deltaTheta = params.kp * mVal;
    const totalTheta = carrierTheta + deltaTheta;

    const refX = cx + radius * Math.cos(-carrierTheta);
    const refY = cy + radius * Math.sin(-carrierTheta);

    ctx.strokeStyle = '#78716C';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(refX, refY);
    ctx.stroke();
    ctx.setLineDash([]);

    if (Math.abs(deltaTheta) > 0.02) {
      ctx.strokeStyle = deltaTheta >= 0 ? '#0891B2' : '#D97706';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.48, -carrierTheta, -totalTheta, deltaTheta > 0);
      ctx.stroke();
    }

    const pmX = cx + radius * Math.cos(-totalTheta);
    const pmY = cy + radius * Math.sin(-totalTheta);

    ctx.strokeStyle = '#C85A32';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(pmX, pmY);
    ctx.stroke();

    ctx.fillStyle = '#C85A32';
    ctx.beginPath();
    ctx.arc(pmX, pmY, 4.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1A1917';
    ctx.font = '600 10px "JetBrains Mono", ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`|s|=Ac=${params.Ac.toFixed(1)}V`, 8, 14);
    ctx.fillStyle = deltaTheta >= 0 ? '#0891B2' : '#D97706';
    ctx.fillText(`Δθ=${deltaTheta >= 0 ? '+' : ''}${deltaTheta.toFixed(2)} rad`, 8, 28);
  }, [phasorPhase, params.Ac, params.Am, params.kp]);

  return (
    <div className="rounded-lg border border-[#E6E4DD] bg-white p-4 flex flex-col sm:flex-row items-center gap-4 shadow-xs">
      <div className="rounded-md border border-[#E6E4DD] bg-[#FAF9F6] shrink-0 overflow-hidden">
        <canvas ref={canvasRef} className="block" />
      </div>
      <div className="flex-1 space-y-2.5 w-full">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-mono font-bold uppercase text-[#1A1917]">
              Rotating PM Phasor
            </h4>
            <p className="text-xs text-[#585651]">
              Constant length A<sub>c</sub>; angle shifts by Δθ(t) = k<sub>p</sub>m(t) relative to reference carrier.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setAutoSpin((v) => !v)}
            className="px-2.5 py-1 rounded border border-[#E6E4DD] bg-[#FAF9F6] hover:bg-[#F3F2EC] text-xs font-mono font-semibold text-[#1A1917] cursor-pointer shrink-0"
          >
            {autoSpin ? 'Pause' : 'Spin'}
          </button>
        </div>
        <input
          type="range"
          min={0}
          max={1}
          step={0.005}
          value={phasorPhase}
          onChange={(e) => {
            setAutoSpin(false);
            setPhasorPhase(parseFloat(e.target.value));
          }}
          aria-label="Scrub phasor cycle"
          className="w-full accent-[#C85A32] cursor-pointer"
        />
        <div className="flex items-center gap-4 text-[11px] font-mono text-[#75736E]">
          <span>— Reference 2πf<sub>c</sub>t</span>
          <span className="text-[#C85A32] font-semibold">— PM Phasor θ<sub>i</sub>(t)</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 4. DEMODULATION PIPELINE METADATA
// ============================================================================
type DemodStage = 1 | 2 | 3 | 4;

const DEMOD_STAGES: {
  id: DemodStage;
  label: string;
  symbol: string;
  formula: string;
  description: string;
}[] = [
  {
    id: 1,
    label: '1. Differentiator',
    symbol: 'ds/dt',
    formula: '\\frac{ds(t)}{dt} = -A_c\\left[2\\pi f_c + k_p \\frac{dm(t)}{dt}\\right]\\sin[\\theta_i(t)]',
    description: 'Converts instantaneous phase variation into an amplitude-modulated envelope proportional to dm/dt.',
  },
  {
    id: 2,
    label: '2. Envelope Detector',
    symbol: '|·| + LPF',
    formula: 'v_{\\text{env}}(t) = A_c\\left[2\\pi f_c + k_p \\frac{dm(t)}{dt}\\right]',
    description: 'Rectifies ds(t)/dt and applies low-pass filtering to extract the upper positive envelope.',
  },
  {
    id: 3,
    label: '3. DC Blocker',
    symbol: 'AC Couple',
    formula: 'v_{\\text{ac}}(t) = v_{\\text{env}}(t) - 2\\pi f_c A_c = A_c k_p \\frac{dm(t)}{dt}',
    description: 'Removes the large constant carrier pedestal 2πfcAc so the signal centers around zero.',
  },
  {
    id: 4,
    label: '4. Integrator',
    symbol: '∫(·) dτ',
    formula: '\\hat{m}(t) = \\frac{1}{A_c k_p} \\int v_{\\text{ac}}(\\tau)\\, d\\tau = m(t) + C',
    description: 'Integrates the DC-blocked derivative signal and scales by 1/(Ac·kp) to recover m(t).',
  },
];

// ============================================================================
// 5. MAIN MODULE 2.6 COMPONENT (SIMULATION-FIRST LAYOUT)
// ============================================================================
interface Module2_6_AM_PMProps {
  onNavigateHome?: () => void;
  onNavigateModule?: (path: string) => void;
}

type WorkbenchTab = 'modulation' | 'demodulation' | 'compare';

export const Module2_6_AM_PM: React.FC<Module2_6_AM_PMProps> = ({
  onNavigateModule,
}) => {
  const currentSubTopic: AMSubTopic = AM_MODULES[5]; // Module 2.6 Phase Modulation and Demodulation
  const prevMod = AM_MODULES[4]; // Module 2.5 FM
  const nextMod = AM_MODULES[0]; // Module 2.1 CAM

  const [params, setParams] = useState<PMParams>(DEFAULT_PM_PARAMS);
  const [activeTab, setActiveTab] = useState<WorkbenchTab>('modulation');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [phaseShiftSec, setPhaseShiftSec] = useState<number>(0);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // Modulation plot overlays
  const [showEnvelopeRails, setShowEnvelopeRails] = useState<boolean>(true);
  const [showCarrierOverlay, setShowCarrierOverlay] = useState<boolean>(false);

  // Demodulation stage controls
  const [activeStage, setActiveStage] = useState<DemodStage>(1);
  const [isAutoDemod, setIsAutoDemod] = useState<boolean>(false);

  // PM vs FM comparison controls
  const [matchPeakFreqDev, setMatchPeakFreqDev] = useState<boolean>(false);

  useEffect(() => {
    if (!isPlaying) return;
    let rafId: number;
    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setPhaseShiftSec((prev) => (prev + dt * 0.35) % 1000);
      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying]);

  useEffect(() => {
    if (!isAutoDemod) return;
    const timer = window.setInterval(() => {
      setActiveStage((prev) => {
        if (prev >= 4) {
          setIsAutoDemod(false);
          return 4;
        }
        return (prev + 1) as DemodStage;
      });
    }, 2000);
    return () => window.clearInterval(timer);
  }, [isAutoDemod]);

  const sim = useMemo(() => runPMSimulation(params, phaseShiftSec), [params, phaseShiftSec]);

  const effectiveKf = matchPeakFreqDev ? params.kp * params.fm : params.kf;
  const fmMatchedData = useMemo(() => {
    if (!matchPeakFreqDev) return { sFM: sim.sFM, fiFM: sim.fiFM };
    const N = sim.N;
    const sFM = new Float64Array(N);
    const fiFM = new Float64Array(N);
    const wc = 2 * Math.PI * params.fc;
    let integ = 0;
    for (let i = 0; i < N; i++) {
      if (i > 0) integ += 0.5 * (sim.m[i] + sim.m[i - 1]) * sim.dt;
      const angle =
        params.waveform === 'sine'
          ? wc * sim.t[i] +
            ((effectiveKf * params.Am) / params.fm) * Math.sin(2 * Math.PI * params.fm * sim.t[i])
          : wc * sim.t[i] + 2 * Math.PI * effectiveKf * integ;
      sFM[i] = params.Ac * Math.cos(angle);
      fiFM[i] = params.fc + effectiveKf * sim.m[i];
    }
    return { sFM, fiFM };
  }, [matchPeakFreqDev, sim, params.fc, params.Am, params.fm, params.Ac, params.waveform, effectiveKf]);

  const update = (patch: Partial<PMParams>) => setParams((prev) => ({ ...prev, ...patch }));

  const handleReset = () => {
    setIsPlaying(false);
    setIsAutoDemod(false);
    setPhaseShiftSec(0);
    setParams(DEFAULT_PM_PARAMS);
  };

  const mBound = Math.max(1.2, params.Am * 1.25);
  const cBound = Math.max(1.5, params.Ac * 1.25);
  const fidelityPct = params.kp > 0.01 ? Math.max(0, 100 - sim.metrics.nrmsePercent) : 0;
  const currentStageMeta = DEMOD_STAGES[activeStage - 1];

  return (
    <div className="space-y-6">
      <div className="py-2">
        {/* 1. Compact Module Header Bar (Matching Modules 2.1 – 2.5) */}
        <div className="pb-4 border-b border-[#E6E4DD] flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-xs font-mono font-bold tracking-wider text-[#C85A32] bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/25">
                MODULE 2.6
              </span>
              <span className="text-xs text-[#75736E] font-medium font-mono">
                {currentSubTopic.tag}
              </span>
              <span className="text-xs text-[#A8A69E]">·</span>
              <span
                className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border inline-flex items-center gap-1 ${
                  sim.metrics.isLinearRegion
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {sim.metrics.isLinearRegion ? (
                  <CheckCircle2 className="w-3 h-3" />
                ) : (
                  <AlertTriangle className="w-3 h-3" />
                )}
                Δθmax = {sim.metrics.deltaThetaMaxRad.toFixed(2)} rad
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1917]">
              Phase Modulation and Demodulation
            </h1>
            <p className="mt-1 text-sm text-[#585651] max-w-3xl">
              Interactive simulation of phase modulation, 4-stage discriminator demodulation, and PM vs. FM behavior.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onNavigateModule && prevMod && (
              <button
                type="button"
                onClick={() => onNavigateModule(prevMod.path)}
                className="px-3 py-1.5 border border-[#E6E4DD] hover:bg-[#FAF9F6] text-xs font-medium text-[#585651] hover:text-[#1A1917] rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Prev ({prevMod.index})</span>
              </button>
            )}
            {onNavigateModule && nextMod && (
              <button
                type="button"
                onClick={() => onNavigateModule(nextMod.path)}
                className="px-3 py-1.5 border border-[#E6E4DD] hover:bg-[#FAF9F6] text-xs font-semibold text-[#1A1917] hover:border-[#C85A32]/40 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span>Next ({nextMod.index})</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* 2. Top-Side Interactive Simulation Workbench */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left Sticky Control Panel */}
          <aside className="lg:col-span-4 xl:col-span-3 lg:sticky lg:top-4 bg-white rounded-lg border border-[#E6E4DD] p-4 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E6E4DD]">
              <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#1A1917] font-bold">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#C85A32]" />
                <span>PM Controls</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsPlaying((v) => !v)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-mono font-semibold cursor-pointer transition-colors ${
                    isPlaying
                      ? 'bg-[#C85A32] text-white'
                      : 'bg-[#1A1917] text-white hover:bg-[#33322E]'
                  }`}
                >
                  {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
                  {isPlaying ? 'Pause' : 'Play'}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  title="Reset parameters"
                  className="p-1.5 rounded border border-[#E6E4DD] bg-[#FAF9F6] hover:bg-[#F3F2EC] text-[#585651] hover:text-[#1A1917] cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Waveform Selector */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-mono font-bold uppercase text-[#585651]">
                Message Waveform m(t)
              </div>
              <div className="grid grid-cols-4 gap-1 p-1 bg-[#FAF9F6] border border-[#E6E4DD] rounded-md">
                {(
                  [
                    { id: 'sine', label: 'Sine' },
                    { id: 'triangle', label: 'Tri' },
                    { id: 'square', label: 'Sq' },
                    { id: 'pulse', label: 'Pulse' },
                  ] as { id: MessageWaveform; label: string }[]
                ).map((wf) => (
                  <button
                    key={wf.id}
                    type="button"
                    onClick={() => update({ waveform: wf.id })}
                    className={`py-1 rounded text-[11px] font-mono font-semibold cursor-pointer transition-colors ${
                      params.waveform === wf.id
                        ? 'bg-[#C85A32] text-white shadow-2xs'
                        : 'text-[#585651] hover:text-[#1A1917]'
                    }`}
                  >
                    {wf.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Presets */}
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setParams(DEFAULT_PM_PARAMS)}
                className="px-2 py-1 rounded border border-[#E6E4DD] bg-[#FAF9F6] hover:bg-white text-[10.5px] font-mono font-medium text-[#585651] hover:text-[#1A1917] cursor-pointer truncate"
              >
                Standard
              </button>
              <button
                type="button"
                onClick={() => update({ kp: 3.8, Am: 1.0, fm: 1.5, fc: 22, waveform: 'sine' })}
                className="px-2 py-1 rounded border border-[#E6E4DD] bg-[#FAF9F6] hover:bg-white text-[10.5px] font-mono font-medium text-[#585651] hover:text-[#1A1917] cursor-pointer truncate"
              >
                High kp
              </button>
              <button
                type="button"
                onClick={() => update({ fm: 3.2, Am: 1.0, kp: 2.0, fc: 24, waveform: 'sine' })}
                className="px-2 py-1 rounded border border-[#E6E4DD] bg-[#FAF9F6] hover:bg-white text-[10.5px] font-mono font-medium text-[#585651] hover:text-[#1A1917] cursor-pointer truncate"
              >
                Fast fm
              </button>
            </div>

            {/* Sliders */}
            <div className="pt-2 border-t border-[#E6E4DD] space-y-3">
              {[
                { label: 'Phase Sensitivity (kp)', val: params.kp, min: 0, max: 5, step: 0.1, unit: 'rad/V', key: 'kp' as const },
                { label: 'Message Amp (Am)', val: params.Am, min: 0.2, max: 3, step: 0.1, unit: 'V', key: 'Am' as const },
                { label: 'Message Freq (fm)', val: params.fm, min: 0.5, max: 4, step: 0.1, unit: 'Hz', key: 'fm' as const },
                { label: 'Carrier Freq (fc)', val: params.fc, min: 10, max: 40, step: 0.5, unit: 'Hz', key: 'fc' as const },
                { label: 'Carrier Amp (Ac)', val: params.Ac, min: 0.5, max: 3, step: 0.1, unit: 'V', key: 'Ac' as const },
              ].map((s) => (
                <div key={s.key} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-[#585651]">{s.label}</span>
                    <span className="font-bold text-[#1A1917] tabular-nums">
                      {s.val.toFixed(1)} {s.unit}
                    </span>
                  </div>
                  <input
                    type="range"
                    min={s.min}
                    max={s.max}
                    step={s.step}
                    value={s.val}
                    onChange={(e) => update({ [s.key]: parseFloat(e.target.value) })}
                    className="w-full accent-[#C85A32] cursor-pointer"
                  />
                </div>
              ))}
            </div>

            {/* Compact Live Readout */}
            <div className="p-3 bg-[#FAF9F6] rounded-md border border-[#E6E4DD] space-y-1.5 text-[11px] font-mono">
              <div className="flex justify-between">
                <span className="text-[#75736E]">Max Phase Dev (Δθmax):</span>
                <span className="font-bold text-[#C85A32]">{sim.metrics.deltaThetaMaxRad.toFixed(2)} rad</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#75736E]">Max Freq Dev (Δfmax):</span>
                <span className="font-bold text-[#E11D48]">{sim.metrics.deltaFMaxHz.toFixed(2)} Hz</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#75736E]">Avg Power (Ac²/2):</span>
                <span className="font-bold text-[#1A1917]">{sim.metrics.avgPowerW.toFixed(2)} W</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#75736E]">Demod Fidelity:</span>
                <span className="font-bold text-[#059669]">
                  {params.kp > 0.01 ? `${fidelityPct.toFixed(1)}%` : 'N/A'}
                </span>
              </div>
            </div>
          </aside>

          {/* Right Main Simulation Stage */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-3">
            {/* View Tabs & Overlay Toggles */}
            <div className="bg-[#FAF9F6] border border-[#E6E4DD] rounded-lg p-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1">
                {(
                  [
                    { id: 'modulation', label: '01. Modulation', icon: <Activity className="w-3.5 h-3.5" /> },
                    { id: 'demodulation', label: '02. 4-Stage Demodulation', icon: <GitMerge className="w-3.5 h-3.5" /> },
                    { id: 'compare', label: '03. PM vs FM & Phasor', icon: <Scale className="w-3.5 h-3.5" /> },
                  ] as { id: WorkbenchTab; label: string; icon: React.ReactNode }[]
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-colors cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-[#C85A32] text-white shadow-2xs'
                        : 'text-[#585651] hover:text-[#1A1917] hover:bg-white'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {activeTab === 'modulation' && (
                <div className="flex items-center gap-3 px-1 text-xs text-[#585651]">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showEnvelopeRails}
                      onChange={(e) => setShowEnvelopeRails(e.target.checked)}
                      className="accent-[#C85A32]"
                    />
                    <span>±A<sub>c</sub> Rails</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showCarrierOverlay}
                      onChange={(e) => setShowCarrierOverlay(e.target.checked)}
                      className="accent-[#78716C]"
                    />
                    <span>Carrier c(t)</span>
                  </label>
                </div>
              )}
            </div>

            {/* TAB 01: MODULATION WAVEFORMS */}
            {activeTab === 'modulation' && (
              <div className="space-y-3">
                <WaveformCanvas
                  title="1. Message Signal m(t)"
                  subtitle={
                    params.waveform === 'sine'
                      ? `m(t) = ${params.Am.toFixed(1)} cos(2π·${params.fm.toFixed(1)}t)`
                      : `${params.waveform} modulating signal`
                  }
                  unit="V"
                  t={sim.t}
                  yRange={[-mBound, mBound]}
                  height={130}
                  hoverIndex={hoverIdx}
                  onHoverIndexChange={setHoverIdx}
                  traces={[{ id: 'msg', label: 'm(t)', data: sim.m, color: '#2563EB', lineWidth: 2.0 }]}
                />

                <WaveformCanvas
                  title="2. Phase-Modulated Signal s(t)"
                  subtitle={`s(t) = ${params.Ac.toFixed(1)} cos[2π(${params.fc.toFixed(1)})t + ${params.kp.toFixed(1)}m(t)]`}
                  unit="V"
                  t={sim.t}
                  yRange={[-cBound, cBound]}
                  height={165}
                  hoverIndex={hoverIdx}
                  onHoverIndexChange={setHoverIdx}
                  referenceLines={
                    showEnvelopeRails
                      ? [
                          { value: params.Ac, label: `+Ac=${params.Ac.toFixed(1)}V`, color: 'rgba(5,150,105,0.65)', dashed: true },
                          { value: -params.Ac, label: `-Ac=-${params.Ac.toFixed(1)}V`, color: 'rgba(5,150,105,0.65)', dashed: true },
                        ]
                      : []
                  }
                  traces={[
                    ...(showCarrierOverlay
                      ? [{ id: 'car', label: 'c(t)', data: sim.c, color: '#A8A29E', dashed: true, lineWidth: 1.2 }]
                      : []),
                    { id: 'pm', label: 's(t) PM', data: sim.sPM, color: '#C85A32', lineWidth: 1.9 },
                  ]}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <WaveformCanvas
                    title="3a. Phase Deviation Δθ(t)"
                    subtitle="Δθ(t) = kp · m(t)"
                    unit="rad"
                    t={sim.t}
                    height={130}
                    hoverIndex={hoverIdx}
                    onHoverIndexChange={setHoverIdx}
                    traces={[
                      {
                        id: 'dtheta',
                        label: 'Δθ(t)',
                        data: sim.deltaTheta,
                        color: '#0891B2',
                        fillBelow: 'rgba(8, 145, 178, 0.08)',
                      },
                    ]}
                  />
                  <WaveformCanvas
                    title="3b. Instantaneous Freq fi(t)"
                    subtitle="fi(t) = fc + (kp/2π) dm/dt"
                    unit="Hz"
                    t={sim.t}
                    height={130}
                    hoverIndex={hoverIdx}
                    onHoverIndexChange={setHoverIdx}
                    referenceLines={[
                      { value: params.fc, label: `fc=${params.fc}Hz`, color: 'rgba(120,113,108,0.6)', dashed: true },
                    ]}
                    traces={[{ id: 'fi', label: 'fi(t)', data: sim.fiPM, color: '#E11D48' }]}
                  />
                </div>
              </div>
            )}

            {/* TAB 02: 4-STAGE DISCRIMINATOR DEMODULATION */}
            {activeTab === 'demodulation' && (
              <div className="space-y-3">
                <div className="bg-white rounded-lg border border-[#E6E4DD] p-3.5 space-y-3 shadow-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <ModuleGlyph id="am-pm" className="w-4 h-4" accent={true} />
                      <span className="text-xs font-mono font-bold uppercase text-[#1A1917]">
                        4-Stage Frequency Discriminator Pipeline
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveStage(1);
                        setIsAutoDemod(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-[#C85A32] hover:bg-[#B54E28] text-white text-xs font-mono font-semibold cursor-pointer"
                    >
                      <Play className="w-3 h-3 fill-current" />
                      Auto-Step (1 → 4)
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {DEMOD_STAGES.map((st) => {
                      const active = activeStage === st.id;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => {
                            setIsAutoDemod(false);
                            setActiveStage(st.id);
                          }}
                          className={`p-2.5 rounded-md border text-left transition-colors cursor-pointer ${
                            active
                              ? 'border-[#C85A32] bg-[#FBF4F0] text-[#C85A32]'
                              : 'border-[#E6E4DD] bg-[#FAF9F6] text-[#585651] hover:text-[#1A1917]'
                          }`}
                        >
                          <div className="text-[10.5px] font-mono font-bold">{st.label}</div>
                          <div className="text-xs font-mono font-semibold text-[#1A1917] mt-0.5">
                            {st.symbol}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="rounded-md border border-[#E6E4DD] bg-[#FAF9F6] px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <p className="text-xs text-[#484642] leading-relaxed">
                      <strong className="text-[#1A1917]">{currentStageMeta.label}: </strong>
                      {currentStageMeta.description}
                    </p>
                    <div className="shrink-0 bg-white px-2.5 py-1 rounded border border-[#E6E4DD] text-xs">
                      <MathView math={currentStageMeta.formula} />
                    </div>
                  </div>
                </div>

                {/* Stage-specific output plot */}
                {activeStage === 1 && (
                  <WaveformCanvas
                    title="Stage 1 Output: Differentiated PM Wave ds(t)/dt"
                    subtitle="Envelope varies with dm(t)/dt"
                    unit="V/s"
                    t={sim.t}
                    height={165}
                    hoverIndex={hoverIdx}
                    onHoverIndexChange={setHoverIdx}
                    traces={[
                      { id: 's1-diff', label: 'ds(t)/dt', data: sim.stage1Diff, color: '#E11D48', lineWidth: 1.5 },
                      { id: 's1-env', label: '+Envelope', data: sim.stage1TheoEnvPos, color: '#D97706', dashed: true, lineWidth: 1.7 },
                    ]}
                  />
                )}
                {activeStage === 2 && (
                  <WaveformCanvas
                    title="Stage 2 Output: Rectified & Low-Pass Filtered Envelope"
                    subtitle="2fc ripple removed"
                    unit="V/s"
                    t={sim.t}
                    height={165}
                    hoverIndex={hoverIdx}
                    onHoverIndexChange={setHoverIdx}
                    referenceLines={[
                      { value: sim.metrics.dcPedestalMeasured, label: `DC≈${sim.metrics.dcPedestalMeasured.toFixed(1)}`, color: '#0284C7', dashed: true },
                    ]}
                    traces={[
                      { id: 's2-rect', label: 'Rectified', data: sim.stage2Rectified, color: '#E11D48', opacity: 0.22, lineWidth: 1 },
                      { id: 's2-env', label: 'Envelope', data: sim.stage2Envelope, color: '#D97706', lineWidth: 2.2 },
                    ]}
                  />
                )}
                {activeStage === 3 && (
                  <WaveformCanvas
                    title="Stage 3 Output: DC-Blocked Signal (∝ dm/dt)"
                    subtitle="Carrier offset 2πfcAc removed"
                    unit="V/s"
                    t={sim.t}
                    height={165}
                    hoverIndex={hoverIdx}
                    onHoverIndexChange={setHoverIdx}
                    traces={[
                      { id: 's3-ac', label: 'v_ac(t)', data: sim.stage3DcBlocked, color: '#0284C7', lineWidth: 2.1, fillBelow: 'rgba(2,132,199,0.1)' },
                    ]}
                  />
                )}
                {activeStage === 4 && (
                  <WaveformCanvas
                    title="Stage 4 Input: DC-Blocked Derivative v_ac(t)"
                    subtitle="Ready for integration"
                    unit="V/s"
                    t={sim.t}
                    height={145}
                    hoverIndex={hoverIdx}
                    onHoverIndexChange={setHoverIdx}
                    traces={[{ id: 's4-in', label: 'v_ac(t)', data: sim.stage3DcBlocked, color: '#0284C7', lineWidth: 1.9 }]}
                  />
                )}

                {/* Always show Recovered vs Original Comparison */}
                <WaveformCanvas
                  title={`Recovered Message m̂(t) vs Original m(t) · Fidelity ${fidelityPct.toFixed(1)}% (r=${sim.metrics.correlationR.toFixed(3)})`}
                  subtitle="Integrator output scaled by 1/(Ac·kp)"
                  unit="V"
                  t={sim.t}
                  yRange={[-mBound, mBound]}
                  height={165}
                  hoverIndex={hoverIdx}
                  onHoverIndexChange={setHoverIdx}
                  traces={[
                    { id: 'rec-orig', label: 'Original m(t)', data: sim.m, color: '#2563EB', dashed: true, lineWidth: 1.9 },
                    { id: 'rec-out', label: 'Recovered m̂(t)', data: sim.stage4Integrated, color: '#059669', lineWidth: 2.2 },
                  ]}
                />
              </div>
            )}

            {/* TAB 03: PM VS FM & ROTATING PHASOR */}
            {activeTab === 'compare' && (
              <div className="space-y-3">
                <div className="bg-white rounded-lg border border-[#E6E4DD] p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
                  <div className="text-xs text-[#585651]">
                    <strong className="text-[#1A1917]">PM vs. FM: </strong>
                    PM frequency shifts with slope <span className="font-mono">dm/dt</span>; FM frequency shifts directly with <span className="font-mono">m(t)</span>.
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="inline-flex items-center gap-1.5 text-xs font-medium text-[#1A1917] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={matchPeakFreqDev}
                        onChange={(e) => setMatchPeakFreqDev(e.target.checked)}
                        className="accent-[#C85A32]"
                      />
                      Match Δf (k<sub>f</sub> = k<sub>p</sub>f<sub>m</sub>)
                    </label>
                    {!matchPeakFreqDev && (
                      <div className="flex items-center gap-2 text-xs font-mono">
                        <span className="text-[#D97706] font-semibold">k<sub>f</sub>={params.kf.toFixed(1)}</span>
                        <input
                          type="range"
                          min={0.5}
                          max={8}
                          step={0.5}
                          value={params.kf}
                          onChange={(e) => update({ kf: parseFloat(e.target.value) })}
                          aria-label="FM sensitivity kf"
                          className="w-24 accent-[#D97706] cursor-pointer"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-3">
                    <WaveformCanvas
                      title="PM Waveform s_PM(t)"
                      unit="V"
                      t={sim.t}
                      yRange={[-cBound, cBound]}
                      height={140}
                      hoverIndex={hoverIdx}
                      onHoverIndexChange={setHoverIdx}
                      traces={[{ id: 'cmp-pm', label: 's_PM(t)', data: sim.sPM, color: '#C85A32' }]}
                    />
                    <WaveformCanvas
                      title="PM Instantaneous Freq fi(t)"
                      subtitle="Follows dm/dt"
                      unit="Hz"
                      t={sim.t}
                      height={135}
                      hoverIndex={hoverIdx}
                      onHoverIndexChange={setHoverIdx}
                      referenceLines={[{ value: params.fc, label: `fc=${params.fc}`, color: '#78716C', dashed: true }]}
                      traces={[{ id: 'cmp-fipm', label: 'fi_PM(t)', data: sim.fiPM, color: '#E11D48' }]}
                    />
                  </div>

                  <div className="space-y-3">
                    <WaveformCanvas
                      title="FM Waveform s_FM(t)"
                      unit="V"
                      t={sim.t}
                      yRange={[-cBound, cBound]}
                      height={140}
                      hoverIndex={hoverIdx}
                      onHoverIndexChange={setHoverIdx}
                      traces={[{ id: 'cmp-fm', label: 's_FM(t)', data: fmMatchedData.sFM, color: '#D97706' }]}
                    />
                    <WaveformCanvas
                      title="FM Instantaneous Freq fi(t)"
                      subtitle="Follows m(t)"
                      unit="Hz"
                      t={sim.t}
                      height={135}
                      hoverIndex={hoverIdx}
                      onHoverIndexChange={setHoverIdx}
                      referenceLines={[{ value: params.fc, label: `fc=${params.fc}`, color: '#78716C', dashed: true }]}
                      traces={[{ id: 'cmp-fifm', label: 'fi_FM(t)', data: fmMatchedData.fiFM, color: '#B45309' }]}
                    />
                  </div>
                </div>

                <RotatingPhasorCard params={params} />
              </div>
            )}
          </div>
        </div>

        {/* 3. Brief Theory & KaTeX Reference Section (At Bottom, Matching Other Modules) */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-4 sm:p-5 shadow-xs">
            <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-2 flex items-center gap-1.5 font-bold">
              <BookOpen className="w-3.5 h-3.5 text-[#585651]" />
              <span>PM Mathematical Formulation</span>
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
              {currentSubTopic.topics.map((topic, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs text-[#484642] leading-snug">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#C85A32] shrink-0 mt-0.5" />
                  <span>{topic}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Module2_6_AM_PM;
