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
  ArrowUpRight,
  Check,
  MonitorPlay,
  Minimize2,
  Info,
  SlidersHorizontal,
  BookOpen,
} from 'lucide-react';
import { AM_MODULES, AMSubTopic } from '../../data/modules';

// ============================================================================
// 1. INLINE STYLES (Warm Editorial Slider & Math Notation Styles)
// ============================================================================
const LAB_STYLES = `
  input[type="range"].lab-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 6px;
    border-radius: 9999px;
    background: #E6E4DD;
    outline: none;
    cursor: pointer;
  }
  input[type="range"].lab-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #C85A32;
    border: 2px solid #FFFFFF;
    box-shadow: 0 0 0 1px rgba(200, 90, 50, 0.45);
    transition: transform 150ms cubic-bezier(0.16, 1, 0.3, 1), background-color 150ms ease;
  }
  input[type="range"].lab-slider::-webkit-slider-thumb:hover {
    transform: scale(1.15);
    background: #B54E28;
  }
  input[type="range"].lab-slider:focus-visible::-webkit-slider-thumb {
    box-shadow: 0 0 0 3px rgba(200, 90, 50, 0.3);
  }
  input[type="range"].lab-slider::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #C85A32;
    border: 2px solid #FFFFFF;
    box-shadow: 0 0 0 1px rgba(200, 90, 50, 0.45);
  }
  .math-expr {
    font-family: "Georgia", "Times New Roman", serif;
    font-style: italic;
    letter-spacing: 0.01em;
  }
  .math-roman {
    font-style: normal;
  }
`;

// ============================================================================
// 2. DSP ENGINE: PM MODULATION & 4-STAGE DISCRIMINATOR DEMODULATION
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

export interface PMMetrics {
  deltaThetaMaxRad: number;
  deltaThetaMaxDeg: number;
  deltaFMaxHz: number;
  avgPowerW: number;
  carrierAngularFreq: number;
  maxSlopeTerm: number;
  linearityRatio: number;
  isLinearRegion: boolean;
  dcPedestalExpected: number;
  dcPedestalMeasured: number;
  nrmsePercent: number;
  correlationR: number;
  recoveredOffsetC: number;
}

export interface SimulationData {
  t: Float64Array;
  dt: number;
  N: number;
  windowDuration: number;
  m: Float64Array;
  dmDt: Float64Array;
  c: Float64Array;
  sPM: Float64Array;
  thetaI: Float64Array;
  deltaTheta: Float64Array;
  fiPM: Float64Array;
  sFM: Float64Array;
  fiFM: Float64Array;
  stage1Diff: Float64Array;
  stage1TheoEnvPos: Float64Array;
  stage1TheoEnvNeg: Float64Array;
  stage2Rectified: Float64Array;
  stage2Envelope: Float64Array;
  stage3DcBlocked: Float64Array;
  stage4Integrated: Float64Array;
  metrics: PMMetrics;
}

const SAMPLE_COUNT = 2400;
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
      let value: number;
      let deriv: number;
      const eps = 0.015;
      if (normPhase < eps) {
        const u = normPhase / eps;
        value = Am * (1 - 2 * eps * u * u);
        deriv = -4 * Am * fm * u;
      } else if (normPhase < 0.5 - eps) {
        value = Am * (1 - 4 * normPhase);
        deriv = -4 * Am * fm;
      } else if (normPhase < 0.5 + eps) {
        const u = (normPhase - 0.5) / eps;
        value = Am * (-1 + 2 * eps * (1 + u * u));
        deriv = 4 * Am * fm * u;
      } else if (normPhase < 1.0 - eps) {
        value = Am * (-1 + 4 * (normPhase - 0.5));
        deriv = 4 * Am * fm;
      } else {
        const u = (1.0 - normPhase) / eps;
        value = Am * (1 - 2 * eps * u * u);
        deriv = -4 * Am * fm * u;
      }
      return { value, deriv };
    }

    case 'square': {
      const k = 0.16;
      const s = Math.sin(phase);
      const c = Math.cos(phase);
      const th = Math.tanh(s / k);
      const sech2 = 1 - th * th;
      return {
        value: Am * th,
        deriv: (Am * sech2 * (omega * c)) / k,
      };
    }

    case 'pulse': {
      const k = 0.16;
      const offset = 0.45;
      const s = Math.cos(phase) - offset;
      const th = Math.tanh(s / k);
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

  const pad = Math.min(240, Math.floor(N / 2));
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

export function runPMSimulation(params: PMParams, phaseShiftSec = 0): SimulationData {
  const N = SAMPLE_COUNT;
  const dt = WINDOW_DURATION / (N - 1);
  const sampleRate = 1 / dt;

  const t = new Float64Array(N);
  const m = new Float64Array(N);
  const dmDt = new Float64Array(N);
  const c = new Float64Array(N);
  const sPM = new Float64Array(N);
  const thetaI = new Float64Array(N);
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
    thetaI[i] = carrierAngle + dTheta;
    sPM[i] = params.Ac * Math.cos(thetaI[i]);

    const slopeTerm = Math.abs(params.kp * mDeriv);
    if (slopeTerm > maxSlopeTerm) maxSlopeTerm = slopeTerm;

    const absDTheta = Math.abs(dTheta);
    if (absDTheta > maxDeltaTheta) maxDeltaTheta = absDTheta;

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

  // Real 4-Stage Frequency Discriminator PM Demodulation
  const stage1Diff = new Float64Array(N);
  const stage1TheoEnvPos = new Float64Array(N);
  const stage1TheoEnvNeg = new Float64Array(N);
  const stage2Rectified = new Float64Array(N);

  for (let i = 0; i < N; i++) {
    let deriv: number;
    if (i === 0) deriv = (sPM[1] - sPM[0]) / dt;
    else if (i === N - 1) deriv = (sPM[N - 1] - sPM[N - 2]) / dt;
    else deriv = (sPM[i + 1] - sPM[i - 1]) / (2 * dt);

    stage1Diff[i] = deriv;
    const envTheo = params.Ac * (wc + params.kp * dmDt[i]);
    stage1TheoEnvPos[i] = envTheo;
    stage1TheoEnvNeg[i] = -envTheo;
    stage2Rectified[i] = Math.abs(deriv) * (Math.PI / 2);
  }

  const lpfCutoff = Math.max(
    4.0,
    Math.min(0.68 * params.fc, Math.max(6.5 * params.fm, 8.5))
  );
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
    windowDuration: WINDOW_DURATION,
    m,
    dmDt,
    c,
    sPM,
    thetaI,
    deltaTheta,
    fiPM,
    sFM,
    fiFM,
    stage1Diff,
    stage1TheoEnvPos,
    stage1TheoEnvNeg,
    stage2Rectified,
    stage2Envelope,
    stage3DcBlocked,
    stage4Integrated,
    metrics: {
      deltaThetaMaxRad: maxDeltaTheta,
      deltaThetaMaxDeg: (maxDeltaTheta * 180) / Math.PI,
      deltaFMaxHz: maxDeltaF,
      avgPowerW: (params.Ac * params.Ac) / 2,
      carrierAngularFreq: wc,
      maxSlopeTerm,
      linearityRatio,
      isLinearRegion: linearityRatio < 0.85,
      dcPedestalExpected: params.Ac * wc,
      dcPedestalMeasured,
      nrmsePercent,
      correlationR,
      recoveredOffsetC: -mMean,
    },
  };
}

// ============================================================================
// 3. MATH DISPLAY & HIGH-DPI OSCILLOSCOPE CANVAS COMPONENTS (Light Editorial Theme)
// ============================================================================
const ACCENT_MAP = {
  terracotta: 'border-[#C85A32]/25 bg-[#FBF4F0]',
  blue: 'border-blue-200 bg-blue-50/60',
  emerald: 'border-emerald-200 bg-emerald-50/60',
  amber: 'border-amber-200 bg-amber-50/60',
  rose: 'border-rose-200 bg-rose-50/60',
};

const EquationBox: React.FC<{
  label?: string;
  children: React.ReactNode;
  accent?: 'terracotta' | 'blue' | 'emerald' | 'amber' | 'rose';
  large?: boolean;
}> = ({ label, children, accent = 'terracotta', large = false }) => (
  <div className={`rounded-lg border px-4 py-3 ${ACCENT_MAP[accent]}`}>
    {label && <div className="text-xs font-medium text-[#585651] mb-1.5">{label}</div>}
    <div
      className={`math-expr text-[#1A1917] overflow-x-auto ${
        large ? 'text-lg sm:text-xl' : 'text-base sm:text-[17px]'
      }`}
    >
      {children}
    </div>
  </div>
);

const Fraction: React.FC<{ num: React.ReactNode; den: React.ReactNode }> = ({ num, den }) => (
  <span className="inline-flex flex-col items-center align-middle mx-1 text-[0.88em] leading-tight">
    <span className="border-b border-[#1A1917]/55 px-1 pb-0.5">{num}</span>
    <span className="px-1 pt-0.5">{den}</span>
  </span>
);

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
  showZeroCrossingsFor?: Float64Array;
  hoverIndex?: number | null;
  onHoverIndexChange?: (index: number | null) => void;
  presentationMode?: boolean;
}> = ({
  title,
  subtitle,
  unit,
  t,
  traces,
  yRange,
  height = 200,
  referenceLines = [],
  showZeroCrossingsFor,
  hoverIndex,
  onHoverIndexChange,
  presentationMode = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [localHoverIdx, setLocalHoverIdx] = useState<number | null>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({
    width: 640,
    height,
  });

  const activeHoverIdx = hoverIndex !== undefined ? hoverIndex : localHoverIdx;

  const computedBounds = useMemo((): [number, number] => {
    if (yRange) return yRange;
    let min = Infinity;
    let max = -Infinity;
    for (const trace of traces) {
      const arr = trace.data;
      for (let i = 0; i < arr.length; i++) {
        const v = arr[i];
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
        const w = Math.max(260, Math.floor(entry.contentRect.width));
        setSize({ width: w, height });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [height]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = size.width;
    const h = size.height;

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const padLeft = presentationMode ? 62 : 54;
    const padRight = 18;
    const padTop = 14;
    const padBottom = presentationMode ? 30 : 26;
    const plotW = Math.max(40, w - padLeft - padRight);
    const plotH = Math.max(40, h - padTop - padBottom);

    // Warm light editorial canvas background matching all other modules
    ctx.fillStyle = '#FAF9F6';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(padLeft, padTop, plotW, plotH);

    const [yMin, yMax] = computedBounds;
    const tMin = t.length > 0 ? t[0] : 0;
    const tMax = t.length > 0 ? t[t.length - 1] : 2;
    const xToPx = (time: number) => padLeft + ((time - tMin) / (tMax - tMin || 1)) * plotW;
    const yToPx = (val: number) => padTop + (1 - (val - yMin) / (yMax - yMin || 1)) * plotH;

    const xTicks = 8;
    const yTicks = 4;
    ctx.lineWidth = 1;
    ctx.font = `${presentationMode ? 12 : 10}px "JetBrains Mono", ui-monospace, monospace`;
    ctx.textBaseline = 'middle';

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
      ctx.fillText(formatted, padLeft - 8, py);
    }

    if (yMin < 0 && yMax > 0) {
      const yZero = Math.round(yToPx(0)) + 0.5;
      ctx.strokeStyle = '#D1CFCE';
      ctx.beginPath();
      ctx.moveTo(padLeft, yZero);
      ctx.lineTo(padLeft + plotW, yZero);
      ctx.stroke();
    }

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
      ctx.fillText(`${tVal.toFixed(2)}s`, px, padTop + plotH + 6);
    }

    ctx.save();
    ctx.beginPath();
    ctx.rect(padLeft, padTop, plotW, plotH);
    ctx.clip();

    for (const ref of referenceLines) {
      const py = yToPx(ref.value);
      ctx.save();
      ctx.strokeStyle = ref.color;
      ctx.lineWidth = 1.25;
      if (ref.dashed) ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(padLeft, py);
      ctx.lineTo(padLeft + plotW, py);
      ctx.stroke();

      if (ref.label) {
        ctx.fillStyle = ref.color;
        ctx.font = `600 ${presentationMode ? 11 : 10}px "JetBrains Mono", ui-monospace, monospace`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(ref.label, padLeft + plotW - 6, py - 3);
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
      ctx.lineWidth = trace.lineWidth ?? (presentationMode ? 2.4 : 1.9);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      if (trace.dashed) ctx.setLineDash([6, 4]);

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

    if (showZeroCrossingsFor && yMin < 0 && yMax > 0) {
      const zeroY = yToPx(0);
      ctx.fillStyle = '#2563EB';
      for (let i = 1; i < showZeroCrossingsFor.length; i++) {
        const prev = showZeroCrossingsFor[i - 1];
        const curr = showZeroCrossingsFor[i];
        if ((prev <= 0 && curr > 0) || (prev >= 0 && curr < 0)) {
          const frac = Math.abs(prev) / (Math.abs(prev) + Math.abs(curr) || 1);
          const tCross = t[i - 1] + frac * (t[i] - t[i - 1]);
          const px = xToPx(tCross);
          ctx.beginPath();
          ctx.arc(px, zeroY, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    if (activeHoverIdx !== null && activeHoverIdx >= 0 && activeHoverIdx < N) {
      const hx = xToPx(t[activeHoverIdx]);
      ctx.strokeStyle = 'rgba(26, 25, 23, 0.35)';
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
        ctx.arc(hx, hy, 4, 0, Math.PI * 2);
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
  }, [size, t, traces, computedBounds, referenceLines, showZeroCrossingsFor, activeHoverIdx, presentationMode]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || t.length === 0) return;
    const rect = canvas.getBoundingClientRect();
    const padLeft = presentationMode ? 62 : 54;
    const padRight = 18;
    const plotW = Math.max(40, size.width - padLeft - padRight);
    const x = e.clientX - rect.left;
    const frac = Math.max(0, Math.min(1, (x - padLeft) / plotW));
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
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 border-b border-[#E6E4DD] bg-[#FAF9F6]">
        <div className="flex items-baseline gap-2.5 min-w-0">
          <h4 className={`font-bold tracking-tight text-[#1A1917] uppercase font-mono truncate ${presentationMode ? 'text-sm' : 'text-xs'}`}>
            {title}
          </h4>
          {subtitle && (
            <span className={`text-[#75736E] truncate ${presentationMode ? 'text-xs' : 'text-[11px]'}`}>
              {subtitle}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {traces.map((tr) => (
            <div key={tr.id} className="flex items-center gap-1.5">
              <span
                className="inline-block w-3.5 h-0.5 rounded-full"
                style={{
                  backgroundColor: tr.color,
                  borderBottom: tr.dashed ? `2px dashed ${tr.color}` : undefined,
                }}
              />
              <span className={`font-mono font-medium text-[#585651] whitespace-nowrap ${presentationMode ? 'text-xs' : 'text-[11px]'}`}>
                {tr.label}
              </span>
            </div>
          ))}
          <span className="font-mono text-[11px] text-[#8A8882]">[{unit}]</span>
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
          <div className="pointer-events-none absolute top-2.5 right-6 rounded-md border border-[#E6E4DD] bg-white/95 px-2.5 py-1.5 font-mono text-[11px] tabular-nums text-[#1A1917] shadow-sm">
            <div className="text-[#75736E]">
              t = <span className="text-[#1A1917] font-semibold">{t[activeHoverIdx].toFixed(3)} s</span>
            </div>
            {traces.map((tr) => (
              <div key={tr.id} className="flex items-center gap-1.5">
                <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: tr.color }} />
                <span className="text-[#585651]">{tr.label}:</span>
                <span className="text-[#1A1917] font-semibold">
                  {tr.data[activeHoverIdx]?.toFixed(2)} {unit}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// 4. SECTION 1: UNDERSTANDING PHASE MODULATION + ROTATING PHASOR
// ============================================================================
const TheorySection: React.FC<{ params: PMParams; presentationMode: boolean }> = ({
  params,
  presentationMode,
}) => {
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
    const w = 320;
    const h = 260;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = '#FAF9F6';
    ctx.fillRect(0, 0, w, h);

    const cx = w * 0.5;
    const cy = h * 0.52;
    const radius = Math.min(95, 45 + params.Ac * 18);

    ctx.strokeStyle = '#D1CFCE';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - radius - 22, cy);
    ctx.lineTo(cx + radius + 22, cy);
    ctx.moveTo(cx, cy - radius - 22);
    ctx.lineTo(cx, cy + radius + 22);
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
    ctx.lineWidth = 1.75;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(refX, refY);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#78716C';
    ctx.beginPath();
    ctx.arc(refX, refY, 3.5, 0, Math.PI * 2);
    ctx.fill();

    if (Math.abs(deltaTheta) > 0.02) {
      ctx.strokeStyle = deltaTheta >= 0 ? '#0891B2' : '#D97706';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 0.48, -carrierTheta, -totalTheta, deltaTheta > 0);
      ctx.stroke();
    }

    const pmX = cx + radius * Math.cos(-totalTheta);
    const pmY = cy + radius * Math.sin(-totalTheta);

    ctx.strokeStyle = '#C85A32';
    ctx.lineWidth = 2.8;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(pmX, pmY);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(200, 90, 50, 0.45)';
    ctx.lineWidth = 1.25;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(pmX, pmY);
    ctx.lineTo(pmX, cy);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#C85A32';
    ctx.beginPath();
    ctx.arc(pmX, pmY, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1A1917';
    ctx.font = '600 11px "JetBrains Mono", ui-monospace, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`|s| = Ac = ${params.Ac.toFixed(1)} V`, 12, 18);
    ctx.fillStyle = deltaTheta >= 0 ? '#0891B2' : '#D97706';
    ctx.fillText(`Δθ(t) = ${deltaTheta >= 0 ? '+' : ''}${deltaTheta.toFixed(2)} rad`, 12, 34);
  }, [phasorPhase, params.Ac, params.Am, params.kp]);

  const mCurrent = params.Am * Math.cos(phasorPhase * 2 * Math.PI);
  const deltaThetaCurrent = params.kp * mCurrent;

  return (
    <section id="pm-theory" className="scroll-mt-20 space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E6E4DD] pb-3">
        <div>
          <p className="text-xs font-mono font-bold tracking-wider uppercase text-[#C85A32]">
            01. Theoretical Foundation · Angle Modulation
          </p>
          <h2 className={`font-bold text-[#1A1917] mt-1 ${presentationMode ? 'text-2xl' : 'text-xl'}`}>
            Understanding Phase Modulation (PM)
          </h2>
        </div>
        <p className="text-xs sm:text-sm text-[#585651] max-w-xl">
          Phase modulation encodes the message signal directly into the instantaneous phase angle of a constant-amplitude sinusoidal carrier.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 flex flex-col justify-between gap-5 rounded-lg border border-[#E6E4DD] bg-[#FAF9F6] p-5 shadow-xs">
          <div className="space-y-4">
            <p className={`text-[#484642] leading-relaxed ${presentationMode ? 'text-base' : 'text-sm'}`}>
              In <strong className="text-[#1A1917]">Phase Modulation (PM)</strong>, the instantaneous phase{' '}
              <span className="math-expr text-[#0891B2] font-semibold">θᵢ(t)</span> of the carrier{' '}
              <span className="math-expr text-[#1A1917] font-semibold">c(t)</span> varies linearly with the message signal{' '}
              <span className="math-expr text-[#2563EB] font-semibold">m(t)</span>, while the carrier amplitude{' '}
              <span className="math-expr text-[#1A1917] font-semibold">A꜀</span> remains strictly constant (constant-envelope modulation).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <EquationBox label="Instantaneous Phase" accent="blue" large={presentationMode}>
                θ<sub>i</sub>(t) = 2πf<sub>c</sub>t + k<sub>p</sub> m(t)
              </EquationBox>
              <EquationBox label="Phase-Modulated Signal" accent="terracotta" large={presentationMode}>
                s(t) = A<sub>c</sub> cos[2πf<sub>c</sub>t + k<sub>p</sub> m(t)]
              </EquationBox>
            </div>
          </div>

          <div className="overflow-x-auto border-t border-[#E6E4DD] pt-4 bg-white rounded-md border p-3">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E6E4DD] text-xs font-mono text-[#75736E]">
                  <th className="py-2 pr-4 font-semibold">Symbol</th>
                  <th className="py-2 pr-4 font-semibold">Parameter</th>
                  <th className="py-2 pr-4 font-semibold">Unit</th>
                  <th className="py-2 font-semibold">Physical Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E4DD]/70 text-xs sm:text-sm">
                <tr>
                  <td className="py-2 pr-4 font-mono font-semibold text-[#1A1917]">A<sub>c</sub></td>
                  <td className="py-2 pr-4 text-[#1A1917] font-medium">Carrier Amplitude</td>
                  <td className="py-2 pr-4 font-mono text-xs text-[#75736E]">V</td>
                  <td className="py-2 text-[#585651]">Constant envelope radius; sets power A<sub>c</sub>²/2</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono font-semibold text-[#1A1917]">f<sub>c</sub></td>
                  <td className="py-2 pr-4 text-[#1A1917] font-medium">Carrier Frequency</td>
                  <td className="py-2 pr-4 font-mono text-xs text-[#75736E]">Hz</td>
                  <td className="py-2 text-[#585651]">Unmodulated phasor rotation rate 2πf<sub>c</sub></td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono font-semibold text-[#2563EB]">m(t)</td>
                  <td className="py-2 pr-4 text-[#1A1917] font-medium">Message Signal</td>
                  <td className="py-2 pr-4 font-mono text-xs text-[#75736E]">V</td>
                  <td className="py-2 text-[#585651]">Information-bearing modulating waveform</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono font-semibold text-[#0891B2]">k<sub>p</sub></td>
                  <td className="py-2 pr-4 text-[#1A1917] font-medium">Phase Sensitivity</td>
                  <td className="py-2 pr-4 font-mono text-xs text-[#75736E]">rad/V</td>
                  <td className="py-2 text-[#585651]">Phase shift per unit message voltage</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono font-semibold text-[#C85A32]">θ<sub>i</sub>(t)</td>
                  <td className="py-2 pr-4 text-[#1A1917] font-medium">Instantaneous Phase</td>
                  <td className="py-2 pr-4 font-mono text-xs text-[#75736E]">rad</td>
                  <td className="py-2 text-[#585651]">Total carrier angle at instant t</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-5 flex flex-col justify-between rounded-lg border border-[#E6E4DD] bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between gap-2 mb-3 pb-3 border-b border-[#E6E4DD]">
            <div>
              <h3 className="text-xs font-bold tracking-tight text-[#1A1917] uppercase font-mono">
                Rotating Phasor Representation
              </h3>
              <p className="text-xs text-[#75736E] mt-0.5">
                Constant length A<sub>c</sub>; angle shifts by Δθ(t) = k<sub>p</sub>m(t)
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAutoSpin((v) => !v)}
              className="px-3 py-1.5 rounded-md border border-[#E6E4DD] bg-[#FAF9F6] hover:bg-[#F3F2EC] text-xs font-mono font-semibold text-[#1A1917] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {autoSpin ? 'Pause Phasor' : 'Spin Phasor'}
            </button>
          </div>

          <div className="flex justify-center rounded-md border border-[#E6E4DD] bg-[#FAF9F6] py-2">
            <canvas ref={canvasRef} className="block" />
          </div>

          <div className="mt-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#585651] font-medium">Scrub Message Cycle Position</span>
              <span className="font-mono tabular-nums text-[#C85A32] font-semibold">
                m(t) = {mCurrent >= 0 ? '+' : ''}{mCurrent.toFixed(2)} V · Δθ = {deltaThetaCurrent >= 0 ? '+' : ''}{deltaThetaCurrent.toFixed(2)} rad
              </span>
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
              aria-label="Scrub phasor cycle position"
              className="lab-slider"
            />
            <div className="flex items-center justify-between text-[11px] font-mono text-[#75736E] pt-1">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-0.5 bg-[#78716C]" /> Unmodulated 2πf<sub>c</sub>t
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3 h-0.5 bg-[#C85A32]" /> PM Phasor θ<sub>i</sub>(t)
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// ============================================================================
// 5. PARAMETER CONTROLS & SECTION 2: INTERACTIVE PM MODULATION LAB + PM VS FM
// ============================================================================
const SliderRow: React.FC<{
  label: string;
  symbol: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  onChange: (val: number) => void;
}> = ({ label, symbol, value, min, max, step, unit, onChange }) => (
  <div className="space-y-1.5">
    <div className="flex items-center justify-between gap-2">
      <label className="text-xs font-medium text-[#1A1917] truncate">
        {label} <span className="font-mono text-[#C85A32] font-semibold">({symbol})</span>
      </label>
      <div className="flex items-center gap-1 shrink-0">
        <input
          type="number"
          min={min}
          max={max}
          step={step}
          value={Number(value.toFixed(2))}
          onChange={(e) => {
            const parsed = parseFloat(e.target.value);
            if (!Number.isNaN(parsed)) onChange(Math.max(min, Math.min(max, parsed)));
          }}
          aria-label={`${label} numeric input`}
          className="w-16 rounded border border-[#E6E4DD] bg-white px-1.5 py-0.5 text-right font-mono text-xs tabular-nums text-[#1A1917] focus:border-[#C85A32] focus:outline-none"
        />
        <span className="font-mono text-[11px] text-[#75736E] w-9">{unit}</span>
      </div>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      aria-label={`${label} slider`}
      className="lab-slider"
    />
  </div>
);

const WAVEFORMS: { id: MessageWaveform; label: string }[] = [
  { id: 'sine', label: 'Sinusoid' },
  { id: 'triangle', label: 'Triangle' },
  { id: 'square', label: 'Square' },
  { id: 'pulse', label: 'Pulse' },
];

const ParameterControls: React.FC<{
  params: PMParams;
  metrics: PMMetrics;
  onChange: (next: PMParams) => void;
  onReset: () => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  compact?: boolean;
}> = ({ params, metrics, onChange, onReset, isPlaying, onTogglePlay, compact = false }) => {
  const update = (patch: Partial<PMParams>) => onChange({ ...params, ...patch });

  return (
    <div className="rounded-lg border border-[#E6E4DD] bg-[#FAF9F6] p-5 space-y-5 shadow-xs">
      <div className="flex items-center justify-between gap-2 border-b border-[#E6E4DD] pb-3">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#75736E] font-bold">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#585651]" />
            <span>Modulator Controls</span>
          </div>
          <p className="text-xs text-[#75736E] mt-0.5">Real-time signal generator</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onTogglePlay}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isPlaying
                ? 'bg-[#C85A32] text-white hover:bg-[#B54E28]'
                : 'bg-[#1A1917] text-white hover:bg-[#33322E]'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            {isPlaying ? 'Pause' : 'Animate'}
          </button>
          <button
            type="button"
            onClick={onReset}
            title="Reset All Controls"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md border border-[#E6E4DD] bg-white hover:bg-[#F3F2EC] text-xs font-mono font-medium text-[#585651] hover:text-[#1A1917] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="text-xs font-medium text-[#1A1917]">
          Message Waveform <span className="font-mono text-[#2563EB] font-semibold">m(t)</span>
        </div>
        <div className="grid grid-cols-4 gap-1 p-1 rounded-md bg-white border border-[#E6E4DD]">
          {WAVEFORMS.map((wf) => (
            <button
              key={wf.id}
              type="button"
              onClick={() => update({ waveform: wf.id })}
              className={`py-1.5 px-2 rounded text-xs font-mono font-semibold transition-colors whitespace-nowrap cursor-pointer ${
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

      <div className={compact ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4' : 'space-y-4'}>
        <SliderRow label="Carrier Amplitude" symbol="Ac" value={params.Ac} min={0.5} max={3.0} step={0.1} unit="V" onChange={(Ac) => update({ Ac })} />
        <SliderRow label="Carrier Frequency" symbol="fc" value={params.fc} min={10} max={40} step={0.5} unit="Hz" onChange={(fc) => update({ fc })} />
        <SliderRow label="Message Amplitude" symbol="Am" value={params.Am} min={0.2} max={3.0} step={0.1} unit="V" onChange={(Am) => update({ Am })} />
        <SliderRow label="Message Frequency" symbol="fm" value={params.fm} min={0.5} max={4.0} step={0.1} unit="Hz" onChange={(fm) => update({ fm })} />
        <SliderRow label="Phase Sensitivity" symbol="kp" value={params.kp} min={0.0} max={5.0} step={0.1} unit="rad/V" onChange={(kp) => update({ kp })} />
      </div>

      {!compact && (
        <div className="border-t border-[#E6E4DD] pt-4 space-y-3">
          <div className="text-xs font-mono uppercase tracking-wider font-bold text-[#75736E]">
            Calculated PM Quantities
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-md border border-[#E6E4DD] bg-white p-3">
              <div className="text-[11px] text-[#75736E]">Max Phase Deviation</div>
              <div className="font-mono text-base font-bold tabular-nums text-[#C85A32] mt-0.5">
                {metrics.deltaThetaMaxRad.toFixed(2)}{' '}
                <span className="text-xs font-normal text-[#75736E]">rad</span>
              </div>
              <div className="font-mono text-[11px] tabular-nums text-[#8A8882]">
                {metrics.deltaThetaMaxDeg.toFixed(1)}° · Δθ = k<sub>p</sub>A<sub>m</sub>
              </div>
            </div>
            <div className="rounded-md border border-[#E6E4DD] bg-white p-3">
              <div className="text-[11px] text-[#75736E]">Max Freq Deviation</div>
              <div className="font-mono text-base font-bold tabular-nums text-[#E11D48] mt-0.5">
                {metrics.deltaFMaxHz.toFixed(2)}{' '}
                <span className="text-xs font-normal text-[#75736E]">Hz</span>
              </div>
              <div className="font-mono text-[11px] tabular-nums text-[#8A8882]">
                {params.waveform === 'sine' ? 'Δf = kpAmfm' : 'Peak |fi - fc|'}
              </div>
            </div>
            <div className="rounded-md border border-[#E6E4DD] bg-white p-3">
              <div className="text-[11px] text-[#75736E]">Avg Carrier Power (1 Ω)</div>
              <div className="font-mono text-base font-bold tabular-nums text-[#1A1917] mt-0.5">
                {metrics.avgPowerW.toFixed(2)}{' '}
                <span className="text-xs font-normal text-[#75736E]">W</span>
              </div>
              <div className="font-mono text-[11px] tabular-nums text-[#8A8882]">
                P<sub>avg</sub> = A<sub>c</sub>² / 2
              </div>
            </div>
            <div className="rounded-md border border-[#E6E4DD] bg-white p-3">
              <div className="text-[11px] text-[#75736E]">PM Envelope Peak</div>
              <div className="font-mono text-base font-bold tabular-nums text-[#059669] mt-0.5">
                ±{params.Ac.toFixed(2)}{' '}
                <span className="text-xs font-normal text-[#75736E]">V</span>
              </div>
              <div className="font-mono text-[11px] text-[#8A8882]">Constant amplitude</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ModulationLab: React.FC<{
  params: PMParams;
  sim: SimulationData;
  onChangeParams: (next: PMParams) => void;
  onReset: () => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  presentationMode: boolean;
}> = ({ params, sim, onChangeParams, onReset, isPlaying, onTogglePlay, presentationMode }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [showZeroCrossings, setShowZeroCrossings] = useState(true);
  const [showEnvelopeRails, setShowEnvelopeRails] = useState(true);
  const [matchPeakFreqDev, setMatchPeakFreqDev] = useState(false);

  const mBound = Math.max(1.2, params.Am * 1.25);
  const cBound = Math.max(1.5, params.Ac * 1.25);
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
          ? wc * sim.t[i] + ((effectiveKf * params.Am) / params.fm) * Math.sin(2 * Math.PI * params.fm * sim.t[i])
          : wc * sim.t[i] + 2 * Math.PI * effectiveKf * integ;
      sFM[i] = params.Ac * Math.cos(angle);
      fiFM[i] = params.fc + effectiveKf * sim.m[i];
    }
    return { sFM, fiFM };
  }, [matchPeakFreqDev, sim, params.fc, params.Am, params.fm, params.Ac, params.waveform, effectiveKf]);

  const pmEnvRails = showEnvelopeRails
    ? [
        { value: params.Ac, label: `+Ac = +${params.Ac.toFixed(1)}V`, color: 'rgba(5, 150, 105, 0.70)', dashed: true },
        { value: -params.Ac, label: `-Ac = -${params.Ac.toFixed(1)}V`, color: 'rgba(5, 150, 105, 0.70)', dashed: true },
      ]
    : [];

  return (
    <section id="pm-modulation-lab" className="scroll-mt-20 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E6E4DD] pb-3">
        <div>
          <p className="text-xs font-mono font-bold tracking-wider uppercase text-[#C85A32]">
            02. Interactive Modulation Workbench
          </p>
          <h2 className={`font-bold text-[#1A1917] mt-1 ${presentationMode ? 'text-2xl' : 'text-xl'}`}>
            Interactive PM Modulation Lab
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-[#585651] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showEnvelopeRails}
              onChange={(e) => setShowEnvelopeRails(e.target.checked)}
              className="rounded border-[#D1CFCE] accent-[#C85A32]"
            />
            Constant Amplitude ±A<sub>c</sub> Rails
          </label>
          <label className="inline-flex items-center gap-2 text-xs font-medium text-[#585651] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showZeroCrossings}
              onChange={(e) => setShowZeroCrossings(e.target.checked)}
              className="rounded border-[#D1CFCE] accent-[#C85A32]"
            />
            Zero-Crossing Markers
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {!presentationMode && (
          <div className="xl:col-span-4 xl:sticky xl:top-20">
            <ParameterControls
              params={params}
              metrics={sim.metrics}
              onChange={onChangeParams}
              onReset={onReset}
              isPlaying={isPlaying}
              onTogglePlay={onTogglePlay}
            />
          </div>
        )}

        <div className={presentationMode ? 'xl:col-span-12 space-y-4' : 'xl:col-span-8 space-y-4'}>
          {presentationMode && (
            <ParameterControls
              params={params}
              metrics={sim.metrics}
              onChange={onChangeParams}
              onReset={onReset}
              isPlaying={isPlaying}
              onTogglePlay={onTogglePlay}
              compact
            />
          )}

          <WaveformCanvas
            title="A. Message Signal m(t)"
            subtitle={
              params.waveform === 'sine'
                ? `m(t) = ${params.Am.toFixed(1)} cos(2π · ${params.fm.toFixed(1)}t)`
                : `${params.waveform} modulating waveform`
            }
            unit="V"
            t={sim.t}
            yRange={[-mBound, mBound]}
            height={presentationMode ? 210 : 175}
            hoverIndex={hoverIdx}
            onHoverIndexChange={setHoverIdx}
            presentationMode={presentationMode}
            traces={[{ id: 'msg', label: 'm(t)', data: sim.m, color: '#2563EB', lineWidth: presentationMode ? 2.6 : 2.1 }]}
          />

          <WaveformCanvas
            title="B. Unmodulated Carrier c(t)"
            subtitle={`c(t) = ${params.Ac.toFixed(1)} cos(2π · ${params.fc.toFixed(1)}t)`}
            unit="V"
            t={sim.t}
            yRange={[-cBound, cBound]}
            height={presentationMode ? 210 : 175}
            hoverIndex={hoverIdx}
            onHoverIndexChange={setHoverIdx}
            showZeroCrossingsFor={showZeroCrossings ? sim.c : undefined}
            presentationMode={presentationMode}
            traces={[{ id: 'carrier', label: 'c(t)', data: sim.c, color: '#78716C', lineWidth: 1.5 }]}
          />

          <WaveformCanvas
            title="C. Phase-Modulated Signal s(t)"
            subtitle={`s(t) = ${params.Ac.toFixed(1)} cos[2π(${params.fc.toFixed(1)})t + ${params.kp.toFixed(1)} m(t)]`}
            unit="V"
            t={sim.t}
            yRange={[-cBound, cBound]}
            height={presentationMode ? 240 : 200}
            hoverIndex={hoverIdx}
            onHoverIndexChange={setHoverIdx}
            referenceLines={pmEnvRails}
            showZeroCrossingsFor={showZeroCrossings ? sim.sPM : undefined}
            presentationMode={presentationMode}
            traces={[{ id: 'pm', label: 's(t) PM', data: sim.sPM, color: '#C85A32', lineWidth: presentationMode ? 2.4 : 1.9 }]}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <WaveformCanvas
              title="Instantaneous Phase Deviation Δθ(t)"
              subtitle="Δθ(t) = kp · m(t) follows m(t)"
              unit="rad"
              t={sim.t}
              height={presentationMode ? 200 : 170}
              hoverIndex={hoverIdx}
              onHoverIndexChange={setHoverIdx}
              presentationMode={presentationMode}
              referenceLines={[
                {
                  value: sim.metrics.deltaThetaMaxRad,
                  label: `+Δθmax = ${sim.metrics.deltaThetaMaxRad.toFixed(2)} rad`,
                  color: 'rgba(8, 145, 178, 0.65)',
                  dashed: true,
                },
              ]}
              traces={[{ id: 'dtheta', label: 'Δθ(t) = kp·m(t)', data: sim.deltaTheta, color: '#0891B2', fillBelow: 'rgba(8, 145, 178, 0.08)' }]}
            />

            <WaveformCanvas
              title="Instantaneous Frequency fi(t)"
              subtitle="Follows slope dm(t)/dt"
              unit="Hz"
              t={sim.t}
              height={presentationMode ? 200 : 170}
              hoverIndex={hoverIdx}
              onHoverIndexChange={setHoverIdx}
              presentationMode={presentationMode}
              referenceLines={[
                { value: params.fc, label: `fc = ${params.fc.toFixed(1)} Hz`, color: 'rgba(120, 113, 108, 0.65)', dashed: true },
              ]}
              traces={[{ id: 'fiPM', label: 'fi(t) PM', data: sim.fiPM, color: '#E11D48' }]}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg border border-[#E6E4DD] bg-[#FAF9F6] p-5">
            <div className="space-y-2.5">
              <div className="text-xs font-mono font-bold text-[#C85A32]">
                Phase Deviation &amp; Constant Envelope
              </div>
              <EquationBox accent="terracotta" large={presentationMode}>
                Δθ<sub>max</sub> = k<sub>p</sub> A<sub>m</sub> = {params.kp.toFixed(1)} × {params.Am.toFixed(1)} ={' '}
                <strong className="math-roman text-[#C85A32]">{sim.metrics.deltaThetaMaxRad.toFixed(2)} rad</strong>
              </EquationBox>
              <p className="text-xs text-[#585651] leading-relaxed">
                Even as <span className="font-mono text-[#1A1917] font-semibold">Am</span> or{' '}
                <span className="font-mono text-[#1A1917] font-semibold">kp</span> grows, the PM waveform peaks remain locked at{' '}
                <span className="font-mono text-[#059669] font-semibold">±{params.Ac.toFixed(1)} V</span>. Only the zero-crossings shift horizontally to carry the message.
              </p>
            </div>

            <div className="space-y-2.5">
              <div className="text-xs font-mono font-bold text-[#E11D48]">
                Instantaneous Frequency Depends on Message Slope
              </div>
              <EquationBox accent="rose" large={presentationMode}>
                f<sub>i</sub>(t) = <Fraction num="1" den="2π" /> <Fraction num="dθᵢ(t)" den="dt" /> = f<sub>c</sub> − k<sub>p</sub>A<sub>m</sub>f<sub>m</sub> sin(2πf<sub>m</sub>t)
              </EquationBox>
              <p className="text-xs text-[#585651] leading-relaxed">
                Maximum frequency deviation{' '}
                <span className="font-mono text-[#E11D48] font-semibold">
                  Δf<sub>max</sub> = k<sub>p</sub>A<sub>m</sub>f<sub>m</sub> = {sim.metrics.deltaFMaxHz.toFixed(2)} Hz
                </span>{' '}
                occurs where <span className="math-expr text-[#2563EB] font-semibold">m(t)</span> crosses zero with steepest slope, not at its peaks.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Comparative Analysis: WHY IS PM DIFFERENT FROM FM? */}
      <div className="rounded-lg border border-[#E6E4DD] bg-[#FAF9F6] p-5 sm:p-6 space-y-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E6E4DD] pb-4">
          <div>
            <p className="text-xs font-mono font-bold tracking-wider uppercase text-[#D97706]">
              Comparative Analysis · PM vs. FM
            </p>
            <h3 className={`font-bold text-[#1A1917] mt-1 ${presentationMode ? 'text-xl' : 'text-lg'}`}>
              Why Is PM Different From FM?
            </h3>
            <p className="text-xs sm:text-sm text-[#585651] mt-1">
              Side-by-side comparison driven by the exact same message signal m(t). Hover over any waveform to align time across both columns.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-[#1A1917] cursor-pointer">
              <input
                type="checkbox"
                checked={matchPeakFreqDev}
                onChange={(e) => setMatchPeakFreqDev(e.target.checked)}
                className="rounded border-[#D1CFCE] accent-[#C85A32]"
              />
              Match FM peak Δf to PM (k<sub>f</sub> = k<sub>p</sub>f<sub>m</sub>)
            </label>
            {!matchPeakFreqDev && (
              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-[#E6E4DD]">
                <span className="text-xs font-mono font-semibold text-[#D97706]">
                  k<sub>f</sub> = {params.kf.toFixed(1)} Hz/V
                </span>
                <input
                  type="range"
                  min={0.5}
                  max={8.0}
                  step={0.5}
                  value={params.kf}
                  onChange={(e) => onChangeParams({ ...params, kf: parseFloat(e.target.value) })}
                  aria-label="FM sensitivity kf"
                  className="lab-slider w-28"
                />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[#C85A32]">Phase Modulation (PM) — Primary Focus</span>
              <span className="font-mono text-xs text-[#75736E]">
                f<sub>i</sub>(t) = f<sub>c</sub> + (k<sub>p</sub>/2π) · dm/dt
              </span>
            </div>

            <WaveformCanvas
              title="PM Modulated Waveform s_PM(t)"
              subtitle="Phase shifts directly with m(t)"
              unit="V"
              t={sim.t}
              yRange={[-cBound, cBound]}
              height={165}
              hoverIndex={hoverIdx}
              onHoverIndexChange={setHoverIdx}
              presentationMode={presentationMode}
              traces={[{ id: 'pm-cmp', label: 's_PM(t)', data: sim.sPM, color: '#C85A32' }]}
            />

            <WaveformCanvas
              title="PM Instantaneous Frequency"
              subtitle="Peaks at zero-crossings of m(t)"
              unit="Hz"
              t={sim.t}
              height={165}
              hoverIndex={hoverIdx}
              onHoverIndexChange={setHoverIdx}
              presentationMode={presentationMode}
              referenceLines={[{ value: params.fc, label: `fc=${params.fc}Hz`, color: 'rgba(120, 113, 108, 0.55)', dashed: true }]}
              traces={[{ id: 'fi-pm-cmp', label: 'fi_PM(t)', data: sim.fiPM, color: '#E11D48' }]}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[#D97706]">Frequency Modulation (FM) — Comparison</span>
              <span className="font-mono text-xs text-[#75736E]">
                f<sub>i</sub>(t) = f<sub>c</sub> + k<sub>f</sub> · m(t)
              </span>
            </div>

            <WaveformCanvas
              title="FM Modulated Waveform s_FM(t)"
              subtitle="Frequency tracks m(t) directly"
              unit="V"
              t={sim.t}
              yRange={[-cBound, cBound]}
              height={165}
              hoverIndex={hoverIdx}
              onHoverIndexChange={setHoverIdx}
              presentationMode={presentationMode}
              traces={[{ id: 'fm-cmp', label: 's_FM(t)', data: fmMatchedData.sFM, color: '#D97706' }]}
            />

            <WaveformCanvas
              title="FM Instantaneous Frequency"
              subtitle="Peaks at amplitude peaks of m(t)"
              unit="Hz"
              t={sim.t}
              height={165}
              hoverIndex={hoverIdx}
              onHoverIndexChange={setHoverIdx}
              presentationMode={presentationMode}
              referenceLines={[{ value: params.fc, label: `fc=${params.fc}Hz`, color: 'rgba(120, 113, 108, 0.55)', dashed: true }]}
              traces={[{ id: 'fi-fm-cmp', label: 'fi_FM(t)', data: fmMatchedData.fiFM, color: '#B45309' }]}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-[#E6E4DD] pt-4 text-xs text-[#585651]">
          <div className="rounded-md border border-[#E6E4DD] bg-white p-3.5">
            <div className="font-bold text-[#C85A32] mb-1">1. Phase Follows Message</div>
            In PM, phase deviation <span className="font-mono text-[#1A1917] font-semibold">Δθ(t) = kₚ m(t)</span> is directly proportional to <span className="math-expr">m(t)</span>.
          </div>
          <div className="rounded-md border border-[#E6E4DD] bg-white p-3.5">
            <div className="font-bold text-[#E11D48] mb-1">2. Frequency Follows Derivative</div>
            In PM, <span className="font-mono text-[#E11D48] font-semibold">fᵢ(t) − f꜀ ∝ dm(t)/dt</span>, whereas in FM, <span className="font-mono text-[#D97706] font-semibold">fᵢ(t) − f꜀ ∝ m(t)</span> directly.
          </div>
          <div className="rounded-md border border-[#E6E4DD] bg-white p-3.5">
            <div className="font-bold text-[#2563EB] mb-1">3. Structural Equivalence</div>
            A PM wave equals an FM wave produced by modulating with <span className="font-mono text-[#1A1917]">dm(t)/dt</span>; an FM wave equals PM driven by <span className="font-mono text-[#1A1917]">∫m(τ)dτ</span>.
          </div>
        </div>
      </div>
    </section>
  );
};

// ============================================================================
// 6. SECTIONS 3 & 4: PM DEMODULATION & STEP-BY-STEP VISUALIZATION
// ============================================================================
type DemodStage = 1 | 2 | 3 | 4;

const DEMOD_STAGES: {
  id: DemodStage;
  shortTitle: string;
  blockLabel: string;
  blockSymbol: string;
  title: string;
  summary: string;
  transformationNote: string;
  accentColor: string;
}[] = [
  {
    id: 1,
    shortTitle: 'Step 1: Differentiation',
    blockLabel: 'Differentiator',
    blockSymbol: 'd(·)/dt',
    title: 'Stage 1 — Differentiation Converts Phase Variation into Amplitude Variation',
    summary:
      'Taking the time derivative of s(t) pulls the instantaneous angular velocity [2πfc + kp dm(t)/dt] out of the cosine argument and places it directly into the carrier amplitude.',
    transformationNote:
      'Constant-amplitude PM wave s(t) → Band-pass AM + PM wave ds(t)/dt whose envelope varies linearly with dm(t)/dt.',
    accentColor: '#E11D48',
  },
  {
    id: 2,
    shortTitle: 'Step 2: Envelope Detection',
    blockLabel: 'Envelope Detector',
    blockSymbol: '|·| + LPF',
    title: 'Stage 2 — Envelope Detection Extracts the Slowly Varying Derivative Envelope',
    summary:
      'Full-wave rectification followed by low-pass filtering strips away the high-frequency carrier oscillations at 2fc, leaving only the slowly varying positive envelope.',
    transformationNote:
      'High-frequency carrier oscillations ds(t)/dt → Smooth positive envelope proportional to Ac[2πfc + kp dm(t)/dt].',
    accentColor: '#D97706',
  },
  {
    id: 3,
    shortTitle: 'Step 3: DC Blocking',
    blockLabel: 'DC Blocker',
    blockSymbol: 'AC Coupling',
    title: 'Stage 3 — DC Blocking Removes the Large Carrier-Frequency Offset',
    summary:
      'Because 2πfc ≫ |kp dm(t)/dt|, the extracted envelope rides on top of a huge constant DC pedestal equal to 2πfcAc. AC coupling blocks this constant offset.',
    transformationNote:
      'Unipolar envelope with large DC bias 2πfcAc → Zero-centered bipolar signal proportional to Ac kp dm(t)/dt.',
    accentColor: '#0284C7',
  },
  {
    id: 4,
    shortTitle: 'Step 4: Integration',
    blockLabel: 'Integrator',
    blockSymbol: '∫(·) dτ',
    title: 'Stage 4 — Integration Reconstructs the Original Message Signal m(t) + C',
    summary:
      'Integrating the DC-blocked output with respect to time reverses the differentiation from Stage 1. Scaling by 1/(Ac kp) recovers m(t) up to an integration constant C.',
    transformationNote:
      'Derivative signal Ac kp dm(t)/dt → Reconstructed message m̂(t) overlapping the original m(t).',
    accentColor: '#059669',
  },
];

const DemodulationSection: React.FC<{
  params: PMParams;
  sim: SimulationData;
  presentationMode: boolean;
}> = ({ params, sim, presentationMode }) => {
  const [activeStage, setActiveStage] = useState<DemodStage>(1);
  const [isAutoRunning, setIsAutoRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!isAutoRunning || isPaused) return;
    const timer = window.setInterval(() => {
      setActiveStage((prev) => {
        if (prev >= 4) {
          setIsAutoRunning(false);
          return 4;
        }
        return (prev + 1) as DemodStage;
      });
    }, 2600);
    return () => window.clearInterval(timer);
  }, [isAutoRunning, isPaused]);

  const handleRunComplete = () => {
    setActiveStage(1);
    setIsPaused(false);
    setIsAutoRunning(true);
  };

  const handlePauseResume = () => {
    if (!isAutoRunning) {
      setIsAutoRunning(true);
      setIsPaused(false);
    } else {
      setIsPaused((p) => !p);
    }
  };

  const handleResetDemo = () => {
    setIsAutoRunning(false);
    setIsPaused(false);
    setActiveStage(1);
  };

  const handleSelectStage = (stage: DemodStage) => {
    setIsAutoRunning(false);
    setIsPaused(false);
    setActiveStage(stage);
  };

  const currentMeta = DEMOD_STAGES[activeStage - 1];
  const cBound = Math.max(1.5, params.Ac * 1.25);
  const mBound = Math.max(1.2, params.Am * 1.3);

  return (
    <section id="pm-demodulation" className="scroll-mt-20 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E6E4DD] pb-3">
        <div>
          <p className="text-xs font-mono font-bold tracking-wider uppercase text-[#059669]">
            03. PM Demodulation &amp; Step-by-Step Pipeline
          </p>
          <h2 className={`font-bold text-[#1A1917] mt-1 ${presentationMode ? 'text-2xl' : 'text-xl'}`}>
            Frequency Discriminator PM Demodulation
          </h2>
        </div>

        <div
          className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs font-mono font-semibold tabular-nums ${
            sim.metrics.isLinearRegion
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-amber-200 bg-amber-50 text-amber-700'
          }`}
        >
          {sim.metrics.isLinearRegion ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
          )}
          <span>
            {sim.metrics.isLinearRegion ? 'Linear Discriminator Regime' : 'High Slope / Over-Modulated'} · |k<sub>p</sub>m&apos;|<sub>max</sub> / 2πf<sub>c</sub> ={' '}
            {sim.metrics.linearityRatio.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="rounded-lg border border-[#E6E4DD] bg-[#FAF9F6] p-5 sm:p-6 space-y-6 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[#1A1917]">
              Interactive PM Demodulator Block Diagram
            </h3>
            <p className="text-xs text-[#585651] mt-0.5">
              Click any processing block or run the automated sequence to inspect how the DSP pipeline transforms s(t) into m̂(t).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleRunComplete}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#C85A32] hover:bg-[#B54E28] text-white font-mono font-semibold text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-2xs"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Run Complete Demodulation
            </button>
            <button
              type="button"
              onClick={handlePauseResume}
              disabled={!isAutoRunning && !isPaused}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-[#E6E4DD] bg-white hover:bg-[#F3F2EC] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-mono font-medium text-[#1A1917] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isPaused || !isAutoRunning ? (
                <>
                  <Play className="w-3.5 h-3.5" /> Resume
                </>
              ) : (
                <>
                  <Pause className="w-3.5 h-3.5" /> Pause
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleResetDemo}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-[#E6E4DD] bg-white hover:bg-[#F3F2EC] text-xs font-mono font-medium text-[#585651] hover:text-[#1A1917] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>

        <div className="overflow-x-auto pb-2">
          <div className="min-w-[780px] flex items-center justify-between gap-2 py-2 px-1">
            <div className="flex flex-col items-center text-center shrink-0 w-28">
              <div className="rounded-md border border-[#C85A32]/35 bg-[#FBF4F0] px-3 py-2.5 w-full">
                <div className="font-mono text-xs font-bold text-[#C85A32]">s(t)</div>
                <div className="text-[11px] text-[#585651] mt-0.5">Received PM</div>
              </div>
            </div>

            {DEMOD_STAGES.map((stage) => {
              const isSelected = activeStage === stage.id;
              const isPassed = activeStage > stage.id;
              return (
                <React.Fragment key={stage.id}>
                  <div className="flex items-center justify-center shrink-0">
                    <ArrowRight
                      className={`w-5 h-5 transition-colors duration-200 ${
                        isSelected || isPassed ? 'text-[#C85A32]' : 'text-[#A8A69E]'
                      }`}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleSelectStage(stage.id)}
                    className={`group flex-1 min-w-[132px] rounded-lg border p-3.5 text-left transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85A32] ${
                      isSelected
                        ? 'border-[#C85A32] bg-[#FBF4F0] shadow-sm scale-[1.02]'
                        : isPassed
                        ? 'border-emerald-300 bg-emerald-50/70 hover:border-emerald-400'
                        : 'border-[#E6E4DD] bg-white hover:border-[#C85A32]/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className="font-mono text-[11px] font-bold"
                        style={{ color: isSelected ? stage.accentColor : '#75736E' }}
                      >
                        Stage {stage.id}
                      </span>
                      <span className="font-mono text-xs font-bold text-[#1A1917]">{stage.blockSymbol}</span>
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-[#1A1917] mt-1.5 whitespace-nowrap">
                      {stage.blockLabel}
                    </div>
                  </button>
                </React.Fragment>
              );
            })}

            <div className="flex items-center justify-center shrink-0">
              <ArrowRight
                className={`w-5 h-5 transition-colors duration-200 ${
                  activeStage === 4 ? 'text-[#059669]' : 'text-[#A8A69E]'
                }`}
              />
            </div>

            <div className="flex flex-col items-center text-center shrink-0 w-28">
              <div
                className={`rounded-md border px-3 py-2.5 w-full transition-colors ${
                  activeStage === 4 ? 'border-emerald-400 bg-emerald-50' : 'border-[#E6E4DD] bg-white'
                }`}
              >
                <div className="font-mono text-xs font-bold text-[#059669]">m̂(t)</div>
                <div className="text-[11px] text-[#585651] mt-0.5">Recovered Msg</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          {DEMOD_STAGES.map((stage) => {
            const active = activeStage === stage.id;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => handleSelectStage(stage.id)}
                className={`px-3.5 py-2 rounded-md border text-xs font-mono font-semibold transition-colors whitespace-nowrap truncate cursor-pointer ${
                  active
                    ? 'border-[#C85A32] bg-[#C85A32] text-white shadow-2xs'
                    : 'border-[#E6E4DD] bg-white text-[#585651] hover:text-[#1A1917] hover:bg-[#F3F2EC]'
                }`}
              >
                {stage.shortTitle}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-[#E6E4DD] bg-white p-5 sm:p-6 space-y-6 shadow-xs">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-6 space-y-3">
            <h3 className={`font-bold text-[#1A1917] ${presentationMode ? 'text-xl' : 'text-base sm:text-lg'}`}>
              {currentMeta.title}
            </h3>
            <p className={`text-[#484642] leading-relaxed ${presentationMode ? 'text-base' : 'text-sm'}`}>
              {currentMeta.summary}
            </p>
            <div className="rounded-md border border-[#E6E4DD] bg-[#FAF9F6] px-3.5 py-2.5 text-xs text-[#484642]">
              <span className="font-bold text-[#C85A32]">Signal Transformation: </span>
              {currentMeta.transformationNote}
            </div>
          </div>

          <div className="lg:col-span-6 space-y-3">
            {activeStage === 1 && (
              <EquationBox label="Differentiator Mathematical Operation" accent="rose" large={presentationMode}>
                <Fraction num="ds(t)" den="dt" /> = −A<sub>c</sub>
                <span className="text-[#D97706] font-semibold">[2πf<sub>c</sub> + k<sub>p</sub> <Fraction num="dm(t)" den="dt" />]</span>{' '}
                sin[2πf<sub>c</sub>t + k<sub>p</sub>m(t)]
              </EquationBox>
            )}
            {activeStage === 2 && (
              <EquationBox label="Envelope Detector Output (Rectifier + LPF)" accent="amber" large={presentationMode}>
                v<sub>env</sub>(t) = A<sub>c</sub>[2πf<sub>c</sub> + k<sub>p</sub> <Fraction num="dm(t)" den="dt" />] ={' '}
                <span className="text-[#0284C7] font-semibold">{sim.metrics.dcPedestalExpected.toFixed(1)}</span> + A<sub>c</sub>k<sub>p</sub>{' '}
                <Fraction num="dm(t)" den="dt" />
              </EquationBox>
            )}
            {activeStage === 3 && (
              <EquationBox label="DC Blocker Output (Removes 2πfcAc Pedestal)" accent="blue" large={presentationMode}>
                v<sub>ac</sub>(t) = v<sub>env</sub>(t) − 2πf<sub>c</sub>A<sub>c</sub> = A<sub>c</sub>k<sub>p</sub>{' '}
                <Fraction num="dm(t)" den="dt" />
                <span className="block text-xs font-mono text-[#585651] mt-1.5">
                  Measured DC removed: {sim.metrics.dcPedestalMeasured.toFixed(2)} V/s (Theoretical: {sim.metrics.dcPedestalExpected.toFixed(2)})
                </span>
              </EquationBox>
            )}
            {activeStage === 4 && (
              <EquationBox label="Integrator Output (Scaled by 1 / Ac kp)" accent="emerald" large={presentationMode}>
                m̂(t) = <Fraction num="1" den="A꜀ kₚ" /> ∫ v<sub>ac</sub>(τ) dτ = m(t) + C
                <span className="block text-xs font-mono text-[#585651] mt-1.5">
                  Gain factor Ac·kp = {(params.Ac * params.kp).toFixed(2)} · NRMSE = {sim.metrics.nrmsePercent.toFixed(2)}%
                </span>
              </EquationBox>
            )}
          </div>
        </div>

        {activeStage === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <WaveformCanvas
              title="Before Stage 1: Received PM Signal s(t)"
              subtitle="Constant amplitude ±Ac"
              unit="V"
              t={sim.t}
              yRange={[-cBound, cBound]}
              height={presentationMode ? 240 : 200}
              hoverIndex={hoverIdx}
              onHoverIndexChange={setHoverIdx}
              presentationMode={presentationMode}
              traces={[{ id: 's1-in', label: 's(t)', data: sim.sPM, color: '#C85A32' }]}
            />
            <WaveformCanvas
              title="After Stage 1: Differentiated Signal ds(t)/dt"
              subtitle="Phase shifts converted to AM envelope"
              unit="V/s"
              t={sim.t}
              height={presentationMode ? 240 : 200}
              hoverIndex={hoverIdx}
              onHoverIndexChange={setHoverIdx}
              presentationMode={presentationMode}
              traces={[
                { id: 's1-out', label: 'ds(t)/dt', data: sim.stage1Diff, color: '#E11D48', lineWidth: 1.5 },
                { id: 's1-envp', label: '+Envelope', data: sim.stage1TheoEnvPos, color: '#D97706', dashed: true, lineWidth: 1.8 },
                { id: 's1-envn', label: '-Envelope', data: sim.stage1TheoEnvNeg, color: '#D97706', dashed: true, lineWidth: 1.4 },
              ]}
            />
          </div>
        )}

        {activeStage === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <WaveformCanvas
              title="Before Stage 2: Differentiated Carrier ds(t)/dt"
              subtitle="Oscillations modulated by dm/dt"
              unit="V/s"
              t={sim.t}
              height={presentationMode ? 240 : 200}
              hoverIndex={hoverIdx}
              onHoverIndexChange={setHoverIdx}
              presentationMode={presentationMode}
              traces={[{ id: 's2-in', label: 'ds(t)/dt', data: sim.stage1Diff, color: '#E11D48', lineWidth: 1.4 }]}
            />
            <WaveformCanvas
              title="After Stage 2: Extracted Positive Envelope"
              subtitle="Rectified + LPF removes 2fc ripple"
              unit="V/s"
              t={sim.t}
              height={presentationMode ? 240 : 200}
              hoverIndex={hoverIdx}
              onHoverIndexChange={setHoverIdx}
              presentationMode={presentationMode}
              referenceLines={[
                {
                  value: sim.metrics.dcPedestalMeasured,
                  label: `DC ≈ ${sim.metrics.dcPedestalMeasured.toFixed(1)}`,
                  color: 'rgba(2, 132, 199, 0.70)',
                  dashed: true,
                },
              ]}
              traces={[
                { id: 's2-rect', label: 'Rectified |ds/dt|·π/2', data: sim.stage2Rectified, color: '#E11D48', opacity: 0.22, lineWidth: 1.0 },
                { id: 's2-env', label: 'Extracted Envelope', data: sim.stage2Envelope, color: '#D97706', lineWidth: 2.5 },
              ]}
            />
          </div>
        )}

        {activeStage === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <WaveformCanvas
              title="Before Stage 3: Envelope with Carrier DC Bias"
              subtitle={`DC pedestal 2πfcAc ≈ ${sim.metrics.dcPedestalMeasured.toFixed(1)}`}
              unit="V/s"
              t={sim.t}
              height={presentationMode ? 240 : 200}
              hoverIndex={hoverIdx}
              onHoverIndexChange={setHoverIdx}
              presentationMode={presentationMode}
              referenceLines={[
                {
                  value: sim.metrics.dcPedestalMeasured,
                  label: `DC Offset = ${sim.metrics.dcPedestalMeasured.toFixed(1)}`,
                  color: 'rgba(217, 119, 6, 0.75)',
                  dashed: true,
                },
              ]}
              traces={[{ id: 's3-in', label: 'With DC Offset', data: sim.stage2Envelope, color: '#D97706', lineWidth: 2.3 }]}
            />
            <WaveformCanvas
              title="After Stage 3: DC-Blocked Output ∝ dm(t)/dt"
              subtitle="Zero-centered signal proportional to Ac·kp·dm/dt"
              unit="V/s"
              t={sim.t}
              height={presentationMode ? 240 : 200}
              hoverIndex={hoverIdx}
              onHoverIndexChange={setHoverIdx}
              presentationMode={presentationMode}
              traces={[
                {
                  id: 's3-out',
                  label: 'DC-Blocked (∝ dm/dt)',
                  data: sim.stage3DcBlocked,
                  color: '#0284C7',
                  lineWidth: 2.4,
                  fillBelow: 'rgba(2, 132, 199, 0.10)',
                },
              ]}
            />
          </div>
        )}

        {activeStage === 4 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <WaveformCanvas
              title="Before Stage 4: DC-Blocked Derivative Signal"
              subtitle="Proportional to dm(t)/dt before integration"
              unit="V/s"
              t={sim.t}
              height={presentationMode ? 240 : 200}
              hoverIndex={hoverIdx}
              onHoverIndexChange={setHoverIdx}
              presentationMode={presentationMode}
              traces={[{ id: 's4-in', label: 'Ac·kp·dm/dt', data: sim.stage3DcBlocked, color: '#0284C7', lineWidth: 2.1 }]}
            />
            <WaveformCanvas
              title="After Stage 4: Recovered m̂(t) vs Original m(t)"
              subtitle={
                params.waveform === 'pulse'
                  ? `AC-coupled recovery shows m(t) + C (C ≈ ${sim.metrics.recoveredOffsetC.toFixed(2)} V)`
                  : 'Integrated & gain-calibrated DSP recovery'
              }
              unit="V"
              t={sim.t}
              yRange={[-mBound, mBound]}
              height={presentationMode ? 240 : 200}
              hoverIndex={hoverIdx}
              onHoverIndexChange={setHoverIdx}
              presentationMode={presentationMode}
              traces={[
                { id: 's4-orig', label: 'Original m(t)', data: sim.m, color: '#2563EB', dashed: true, lineWidth: 2.2 },
                { id: 's4-rec', label: 'Recovered m̂(t)', data: sim.stage4Integrated, color: '#059669', lineWidth: 2.4 },
              ]}
            />
          </div>
        )}
      </div>
    </section>
  );
};

// ============================================================================
// 7. SECTION 4: REAL-TIME MODULATION & DEMODULATION COMPARISON
// ============================================================================
const ComparisonSection: React.FC<{
  params: PMParams;
  sim: SimulationData;
  presentationMode: boolean;
}> = ({ params, sim, presentationMode }) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [overlayOriginal, setOverlayOriginal] = useState(true);

  const mBound = Math.max(1.2, params.Am * 1.3);
  const cBound = Math.max(1.5, params.Ac * 1.25);
  const isModulated = params.kp > 0.01;
  const accuracyPercent = isModulated ? Math.max(0, 100 - sim.metrics.nrmsePercent) : 0;

  return (
    <section id="pm-comparison" className="scroll-mt-20 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E6E4DD] pb-3">
        <div>
          <p className="text-xs font-mono font-bold tracking-wider uppercase text-[#C85A32]">
            04. End-to-End Verification · Modulation + Recovery
          </p>
          <h2 className={`font-bold text-[#1A1917] mt-1 ${presentationMode ? 'text-2xl' : 'text-xl'}`}>
            Real-Time Modulation &amp; Demodulation Comparison
          </h2>
        </div>

        <label className="inline-flex items-center gap-2 text-xs font-medium text-[#585651] cursor-pointer select-none">
          <input
            type="checkbox"
            checked={overlayOriginal}
            onChange={(e) => setOverlayOriginal(e.target.checked)}
            className="rounded border-[#D1CFCE] accent-[#059669]"
          />
          Overlay dashed original m(t) on recovered plot
        </label>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-[#E6E4DD] bg-[#FAF9F6] p-4">
          <div className="text-xs text-[#75736E]">Waveform Fidelity</div>
          <div className="font-mono text-2xl font-bold tabular-nums text-[#059669] mt-1">
            {isModulated ? `${accuracyPercent.toFixed(1)}%` : 'N/A (kp=0)'}
          </div>
          <div className="text-xs text-[#8A8882] mt-0.5">100% − NRMSE (AC-aligned)</div>
        </div>
        <div className="rounded-lg border border-[#E6E4DD] bg-[#FAF9F6] p-4">
          <div className="text-xs text-[#75736E]">Normalized Error (NRMSE)</div>
          <div className="font-mono text-2xl font-bold tabular-nums text-[#2563EB] mt-1">
            {isModulated ? `${sim.metrics.nrmsePercent.toFixed(2)}%` : '—'}
          </div>
          <div className="text-xs text-[#8A8882] mt-0.5">Real DSP output vs original</div>
        </div>
        <div className="rounded-lg border border-[#E6E4DD] bg-[#FAF9F6] p-4">
          <div className="text-xs text-[#75736E]">Pearson Correlation (r)</div>
          <div className="font-mono text-2xl font-bold tabular-nums text-[#1A1917] mt-1">
            {isModulated ? sim.metrics.correlationR.toFixed(4) : '—'}
          </div>
          <div className="text-xs text-[#8A8882] mt-0.5">1.0000 = exact shape match</div>
        </div>
        <div className="rounded-lg border border-[#E6E4DD] bg-[#FAF9F6] p-4">
          <div className="text-xs text-[#75736E]">Integration Constant C</div>
          <div className="font-mono text-2xl font-bold tabular-nums text-[#C85A32] mt-1">
            {sim.metrics.recoveredOffsetC >= 0 ? '+' : ''}
            {sim.metrics.recoveredOffsetC.toFixed(2)} <span className="text-xs font-normal text-[#75736E]">V</span>
          </div>
          <div className="text-xs text-[#8A8882] mt-0.5">∫(dm/dt)dt = m(t) + C</div>
        </div>
      </div>

      <div className="space-y-4">
        <WaveformCanvas
          title="1. Original Message Signal m(t)"
          subtitle="Transmitter baseband input"
          unit="V"
          t={sim.t}
          yRange={[-mBound, mBound]}
          height={presentationMode ? 210 : 170}
          hoverIndex={hoverIdx}
          onHoverIndexChange={setHoverIdx}
          presentationMode={presentationMode}
          traces={[{ id: 'cmp-orig', label: 'Original m(t)', data: sim.m, color: '#2563EB', lineWidth: 2.2 }]}
        />

        <WaveformCanvas
          title="2. Transmitted PM Signal s(t)"
          subtitle="Constant-amplitude angle-modulated RF signal"
          unit="V"
          t={sim.t}
          yRange={[-cBound, cBound]}
          height={presentationMode ? 210 : 170}
          hoverIndex={hoverIdx}
          onHoverIndexChange={setHoverIdx}
          presentationMode={presentationMode}
          traces={[{ id: 'cmp-pm', label: 'Transmitted s(t)', data: sim.sPM, color: '#C85A32', lineWidth: 1.8 }]}
        />

        <WaveformCanvas
          title="3. Recovered Message Signal m̂(t)"
          subtitle="Differentiator → Envelope Detector → DC Blocker → Integrator"
          unit="V"
          t={sim.t}
          yRange={[-mBound, mBound]}
          height={presentationMode ? 230 : 185}
          hoverIndex={hoverIdx}
          onHoverIndexChange={setHoverIdx}
          presentationMode={presentationMode}
          traces={[
            ...(overlayOriginal
              ? [{ id: 'cmp-ref', label: 'Original m(t)', data: sim.m, color: '#2563EB', dashed: true, lineWidth: 1.8, opacity: 0.7 }]
              : []),
            { id: 'cmp-rec', label: 'Recovered m̂(t)', data: sim.stage4Integrated, color: '#059669', lineWidth: 2.4 },
          ]}
        />
      </div>
    </section>
  );
};

// ============================================================================
// 8. SECTION 5: GUIDED EXPERIMENTAL OBSERVATIONS
// ============================================================================
const EXPERIMENTS = [
  {
    id: 'exp-am',
    number: 'Experiment 01',
    title: 'Increase Message Amplitude (Am)',
    hypothesis: 'Raise Am from 1.0 V to 2.4 V while holding fc, fm, and kp fixed.',
    observation: 'Δθmax increases linearly from 2.00 rad to 4.80 rad, and Δfmax rises proportionally, while PM carrier peaks remain fixed at ±Ac.',
    physicalMeaning:
      'Higher message voltage drives larger phase swings around the unmodulated carrier. Unlike AM, the transmitted envelope and average power Pavg = Ac²/2 stay completely constant.',
    preset: { ...DEFAULT_PM_PARAMS, Am: 2.4, fm: 1.5, kp: 2.0, fc: 22, waveform: 'sine' as MessageWaveform },
    presetLabel: 'Load Am = 2.4 V',
  },
  {
    id: 'exp-kp',
    number: 'Experiment 02',
    title: 'Increase Phase Sensitivity (kp)',
    hypothesis: 'Raise phase sensitivity kp from 1.0 rad/V to 3.8 rad/V at fixed Am = 1.0 V.',
    observation: 'Zero-crossing compression and expansion intensify as Δθmax = kpAm jumps to 3.80 rad.',
    physicalMeaning:
      'Phase sensitivity kp acts as the transducer gain of the phase modulator (rad/volt). Larger kp produces wider phase modulation and requires greater transmission bandwidth.',
    preset: { ...DEFAULT_PM_PARAMS, Am: 1.0, fm: 1.5, kp: 3.8, fc: 22, waveform: 'sine' as MessageWaveform },
    presetLabel: 'Load kp = 3.8 rad/V',
  },
  {
    id: 'exp-fm',
    number: 'Experiment 03',
    title: 'Increase Message Frequency (fm)',
    hypothesis: 'Increase fm from 1.0 Hz to 3.2 Hz while keeping Am = 1.0 V and kp = 2.0 rad/V constant.',
    observation: 'Δθmax stays strictly unchanged at 2.00 rad, whereas Δfmax = kpAmfm increases from 2.00 Hz to 6.40 Hz.',
    physicalMeaning:
      'A signature property of PM: peak phase deviation depends only on kp and Am, independent of fm. Faster message oscillation steepens dm(t)/dt, expanding instantaneous frequency deviation.',
    preset: { ...DEFAULT_PM_PARAMS, Am: 1.0, fm: 3.2, kp: 2.0, fc: 24, waveform: 'sine' as MessageWaveform },
    presetLabel: 'Load fm = 3.2 Hz',
  },
  {
    id: 'exp-wave',
    number: 'Experiment 04',
    title: 'Non-Sinusoidal Waveforms (Square, Triangle, Pulse)',
    hypothesis: 'Switch m(t) from sinusoidal to triangle, square, or pulse waveforms.',
    observation: 'Triangle ramps yield piecewise-constant fi(t) shifts; square/pulse edges create abrupt phase jumps while carrier stays at fc on flat plateaus.',
    physicalMeaning:
      'When m(t) is piecewise constant (pulse/square), dm/dt = 0 on plateaus so fi(t) = fc except at transitions; when m(t) ramps linearly (triangle), fi(t) shifts by a constant offset.',
    preset: { ...DEFAULT_PM_PARAMS, Am: 1.0, fm: 1.2, kp: 2.0, fc: 22, waveform: 'square' as MessageWaveform },
    presetLabel: 'Load Square Wave',
  },
];

const ExperimentsSection: React.FC<{
  params: PMParams;
  sim: SimulationData;
  onApplyPreset: (preset: Partial<PMParams>) => void;
  onInspectWaveforms: () => void;
  presentationMode: boolean;
}> = ({ params, sim, onApplyPreset, onInspectWaveforms, presentationMode }) => {
  const [activeExpId, setActiveExpId] = useState<string | null>(null);

  return (
    <section id="pm-experiments" className="scroll-mt-20 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E6E4DD] pb-3">
        <div>
          <p className="text-xs font-mono font-bold tracking-wider uppercase text-[#C85A32]">
            05. Guided Laboratory Investigation
          </p>
          <h2 className={`font-bold text-[#1A1917] mt-1 ${presentationMode ? 'text-2xl' : 'text-xl'}`}>
            Experimental Observations
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-mono tabular-nums text-[#585651]">
          <span>
            Current: <strong className="text-[#2563EB]">{params.waveform}</strong>
          </span>
          <span aria-hidden="true" className="text-[#A8A69E]">·</span>
          <span>
            Δθ<sub>max</sub> = <strong className="text-[#C85A32]">{sim.metrics.deltaThetaMaxRad.toFixed(2)} rad</strong>
          </span>
          <span aria-hidden="true" className="text-[#A8A69E]">·</span>
          <span>
            Δf<sub>max</sub> = <strong className="text-[#E11D48]">{sim.metrics.deltaFMaxHz.toFixed(2)} Hz</strong>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {EXPERIMENTS.map((exp) => {
          const isApplied = activeExpId === exp.id;
          return (
            <div
              key={exp.id}
              className={`rounded-lg border p-5 flex flex-col justify-between gap-4 transition-colors shadow-xs ${
                isApplied ? 'border-[#C85A32] bg-[#FBF4F0]/70' : 'border-[#E6E4DD] bg-[#FAF9F6]'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-[#C85A32]">{exp.number}</span>
                  {exp.id === 'exp-wave' && (
                    <div className="flex items-center gap-1">
                      {(['triangle', 'square', 'pulse'] as const).map((wf) => (
                        <button
                          key={wf}
                          type="button"
                          onClick={() => {
                            setActiveExpId(exp.id);
                            onApplyPreset({ ...exp.preset, waveform: wf });
                          }}
                          className={`px-2 py-1 rounded text-[11px] font-mono font-semibold capitalize transition-colors cursor-pointer ${
                            params.waveform === wf && isApplied
                              ? 'bg-[#C85A32] text-white'
                              : 'bg-white border border-[#E6E4DD] text-[#585651] hover:text-[#1A1917]'
                          }`}
                        >
                          {wf}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <h3 className={`font-bold text-[#1A1917] ${presentationMode ? 'text-lg' : 'text-base'}`}>
                  {exp.title}
                </h3>

                <div className="space-y-2 text-xs sm:text-sm">
                  <p className="text-[#484642]">
                    <span className="font-semibold text-[#1A1917]">Procedure: </span>
                    {exp.hypothesis}
                  </p>
                  <p className="text-[#C85A32]">
                    <span className="font-semibold">Observed Result: </span>
                    {exp.observation}
                  </p>
                  <p className="text-[#585651] text-xs leading-relaxed">
                    <span className="font-semibold text-[#1A1917]">Physical Meaning: </span>
                    {exp.physicalMeaning}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#E6E4DD]">
                <button
                  type="button"
                  onClick={() => {
                    setActiveExpId(exp.id);
                    onApplyPreset(exp.preset);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md text-xs font-mono font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                    isApplied
                      ? 'bg-[#C85A32] text-white'
                      : 'bg-white hover:bg-[#F3F2EC] text-[#1A1917] border border-[#E6E4DD]'
                  }`}
                >
                  {isApplied ? <Check className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                  {isApplied ? 'Active in Lab' : exp.presetLabel}
                </button>

                <button
                  type="button"
                  onClick={onInspectWaveforms}
                  className="text-xs font-mono font-medium text-[#585651] hover:text-[#C85A32] transition-colors whitespace-nowrap cursor-pointer"
                >
                  Inspect Waveforms
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

// ============================================================================
// 9. SECTION 6: EDUCATIONAL SUMMARY & FORMULA REFERENCE PANEL
// ============================================================================
const KEY_CONCEPTS = [
  {
    title: 'Linear Phase Encoding',
    body: 'PM varies the instantaneous phase θᵢ(t) of the carrier linearly with the message signal m(t): θᵢ(t) = 2πf꜀t + kₚm(t).',
  },
  {
    title: 'Constant Carrier Amplitude',
    body: 'Carrier amplitude A꜀ and average transmitted power Pₐᵥ₉ = A꜀²/2 remain invariant regardless of message amplitude or phase sensitivity.',
  },
  {
    title: 'Phase Deviation Scaling',
    body: 'Maximum phase deviation Δθₘₐₓ = kₚAₘ is directly proportional to message amplitude Aₘ and phase sensitivity kₚ (in rad/V), independent of fₘ.',
  },
  {
    title: 'Slope-Driven Frequency Deviation',
    body: 'Instantaneous frequency deviation fᵢ(t) − f꜀ = (kₚ/2π) dm(t)/dt depends on the time derivative of m(t); for a sinusoid, Δfₘₐₓ = kₚAₘfₘ.',
  },
  {
    title: '4-Stage Discriminator Demodulation',
    body: 'PM recovery uses Differentiation → Envelope Detection → DC Blocking → Integration to convert angle shifts to AM, extract dm/dt, and integrate back to m(t) + C.',
  },
  {
    title: 'Faithful Message Recovery',
    body: 'Provided the linearity condition |kₚ dm(t)/dt| ≪ 2πf꜀ holds, the integrator output accurately reproduces the original baseband message m(t).',
  },
];

const SummarySection: React.FC<{ presentationMode: boolean }> = ({ presentationMode }) => (
  <section id="pm-summary" className="scroll-mt-20 space-y-6 pb-4">
    <div className="border-b border-[#E6E4DD] pb-3">
      <p className="text-xs font-mono font-bold tracking-wider uppercase text-[#C85A32]">
        06. Educational Recap &amp; Formula Reference
      </p>
      <h2 className={`font-bold text-[#1A1917] mt-1 ${presentationMode ? 'text-2xl' : 'text-xl'}`}>
        Summary &amp; Essential PM Formula Reference
      </h2>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {KEY_CONCEPTS.map((item, idx) => (
        <div key={item.title} className="rounded-lg border border-[#E6E4DD] bg-[#FAF9F6] p-4 sm:p-5 space-y-2 shadow-xs">
          <div className="font-mono text-xs font-bold text-[#C85A32]">0{idx + 1}.</div>
          <h3 className="text-sm sm:text-base font-bold text-[#1A1917]">{item.title}</h3>
          <p className="text-xs sm:text-sm text-[#585651] leading-relaxed">{item.body}</p>
        </div>
      ))}
    </div>

    <div className="rounded-lg border border-[#E6E4DD] bg-white p-5 sm:p-6 space-y-5 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E6E4DD] pb-3">
        <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#75736E] font-bold">
          <BookOpen className="w-3.5 h-3.5 text-[#585651]" />
          <span>Essential Phase Modulation &amp; Demodulation Equations</span>
        </div>
        <span className="text-xs font-mono text-[#75736E]">Angle Modulation &amp; Discriminator Recovery</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <EquationBox label="Instantaneous Phase" accent="blue">
          θ<sub>i</sub>(t) = 2πf<sub>c</sub>t + k<sub>p</sub> m(t)
        </EquationBox>
        <EquationBox label="PM Modulated Waveform" accent="terracotta">
          s(t) = A<sub>c</sub> cos[2πf<sub>c</sub>t + k<sub>p</sub> m(t)]
        </EquationBox>
        <EquationBox label="Instantaneous Frequency (General)" accent="rose">
          f<sub>i</sub>(t) = <Fraction num="1" den="2π" /> <Fraction num="dθᵢ(t)" den="dt" /> = f<sub>c</sub> +{' '}
          <Fraction num="kₚ" den="2π" /> <Fraction num="dm(t)" den="dt" />
        </EquationBox>
        <EquationBox label="Sinusoidal PM Signal & Deviations" accent="blue">
          Δθ<sub>max</sub> = k<sub>p</sub>A<sub>m</sub> &nbsp;·&nbsp; Δf<sub>max</sub> = k<sub>p</sub>A<sub>m</sub>f<sub>m</sub>
        </EquationBox>
        <EquationBox label="Constant Average Power (R = 1 Ω)" accent="amber">
          P<sub>avg</sub> = <Fraction num="A꜀²" den="2R" /> = <Fraction num="A꜀²" den="2" />
        </EquationBox>
        <EquationBox label="Discriminator Differentiator" accent="rose">
          <Fraction num="ds(t)" den="dt" /> = −A<sub>c</sub>[2πf<sub>c</sub> + k<sub>p</sub> <Fraction num="dm(t)" den="dt" />] sin[θ<sub>i</sub>(t)]
        </EquationBox>
        <EquationBox label="Envelope & DC-Blocked Output" accent="amber">
          v<sub>ac</sub>(t) = A<sub>c</sub>[2πf<sub>c</sub> + k<sub>p</sub> <Fraction num="dm(t)" den="dt" />] − 2πf<sub>c</sub>A<sub>c</sub>
        </EquationBox>
        <EquationBox label="Integrator Recovery Output" accent="emerald">
          ∫ <Fraction num="dm(t)" den="dt" /> dt = m(t) + C
        </EquationBox>
        <EquationBox label="PM ↔ FM Equivalence" accent="terracotta">
          PM(m) = FM(<Fraction num="dm" den="dt" />) &nbsp;·&nbsp; FM(m) = PM(∫m dτ)
        </EquationBox>
      </div>
    </div>
  </section>
);

// ============================================================================
// 10. MODULE 2.6 COMPONENT SHELL (Matches Host Warm-White Editorial Theme)
// ============================================================================
interface Module2_6_AM_PMProps {
  onNavigateHome?: () => void;
  onNavigateModule?: (path: string) => void;
}

export const Module2_6_AM_PM: React.FC<Module2_6_AM_PMProps> = ({
  onNavigateModule,
}) => {
  const currentSubTopic: AMSubTopic = AM_MODULES[5]; // Module 2.6 Phase Modulation and Demodulation
  const prevMod = AM_MODULES[4]; // Module 2.5 FM
  const nextMod = AM_MODULES[6]; // Module 2.7 Demodulation

  const [params, setParams] = useState<PMParams>(DEFAULT_PM_PARAMS);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [phaseShiftSec, setPhaseShiftSec] = useState<number>(0);
  const [presentationMode, setPresentationMode] = useState<boolean>(false);

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
    if (!presentationMode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPresentationMode(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [presentationMode]);

  const sim = useMemo(() => runPMSimulation(params, phaseShiftSec), [params, phaseShiftSec]);

  const handleResetAll = () => {
    setIsPlaying(false);
    setPhaseShiftSec(0);
    setParams(DEFAULT_PM_PARAMS);
  };

  const handleApplyExperiment = (preset: Partial<PMParams>) => {
    setParams((prev) => ({ ...prev, ...preset }));
  };

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div
      className={
        presentationMode
          ? 'fixed inset-0 z-50 overflow-y-auto bg-white text-[#1A1917] px-6 py-6 space-y-8'
          : 'space-y-6'
      }
    >
      <style>{LAB_STYLES}</style>

      <div className={presentationMode ? 'mx-auto max-w-[1600px] space-y-8' : 'py-2 space-y-8'}>
        {/* Module Header Bar (Matching Modules 2.1 - 2.7) */}
        <div
          id="pm-top"
          className="pb-6 border-b border-[#E6E4DD] flex flex-col md:flex-row md:items-end justify-between gap-6"
        >
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-mono font-bold tracking-wider text-[#C85A32] bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/25">
                MODULE 2.6
              </span>
              <span className="text-xs text-[#75736E] font-medium font-mono">
                {currentSubTopic.tag}
              </span>
              <span className="text-xs text-[#A8A69E]">·</span>
              <span
                className={`text-xs font-mono font-semibold px-2 py-0.5 rounded border ${
                  sim.metrics.isLinearRegion
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                Δθmax = {sim.metrics.deltaThetaMaxRad.toFixed(2)} rad ·{' '}
                {sim.metrics.isLinearRegion ? 'Linear Discriminator' : 'High-Slope Regime'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1917]">
              Phase Modulation and Demodulation
            </h1>
            <p className="mt-2 text-sm sm:text-base text-[#585651] max-w-3xl leading-relaxed">
              Interactive signal-processing workbench illustrating instantaneous phase encoding, constant-envelope transmission, PM vs. FM behavior, and real 4-stage frequency-discriminator recovery.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {onNavigateModule && prevMod && !presentationMode && (
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
            {onNavigateModule && nextMod && !presentationMode && (
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
            <button
              type="button"
              onClick={() => setPresentationMode((v) => !v)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-2xs ${
                presentationMode
                  ? 'bg-[#C85A32] text-white hover:bg-[#B54E28]'
                  : 'bg-[#1A1917] text-white hover:bg-[#33322E]'
              }`}
            >
              {presentationMode ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5" />
                  <span>Exit Presentation</span>
                </>
              ) : (
                <>
                  <MonitorPlay className="w-3.5 h-3.5" />
                  <span>Presentation Mode</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Section Navigation & Quick Actions Bar */}
        <div className="p-2 rounded-lg bg-[#FAF9F6] border border-[#E6E4DD] flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1">
            {[
              { id: 'pm-theory', label: '01 Theory' },
              { id: 'pm-modulation-lab', label: '02 Modulation Lab' },
              { id: 'pm-demodulation', label: '03 Demodulation' },
              { id: 'pm-comparison', label: '04 Comparison' },
              { id: 'pm-experiments', label: '05 Experiments' },
              { id: 'pm-summary', label: '06 Formula Reference' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => scrollToSection(item.id)}
                className="px-2.5 py-1.5 rounded text-xs font-mono font-medium text-[#585651] hover:text-[#1A1917] hover:bg-white transition-colors cursor-pointer"
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleResetAll}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#E6E4DD] bg-white hover:bg-[#F3F2EC] text-xs font-mono font-medium text-[#585651] hover:text-[#1A1917] transition-colors whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset All Controls
          </button>
        </div>

        {!presentationMode && (
          <>
            {/* Technical Notice Banner */}
            <div className="p-3.5 sm:p-4 rounded-md bg-[#FAF9F6] border border-[#E6E4DD] flex items-start gap-3">
              <Info className="w-4 h-4 text-[#C85A32] shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm text-[#585651] leading-relaxed">
                <span className="font-semibold text-[#1A1917]">Phase Modulation &amp; Discriminator Principles: </span>
                In Phase Modulation (PM), carrier amplitude remains strictly constant while the instantaneous phase angle varies linearly with the message signal m(t). Demodulation uses a 4-stage frequency discriminator (Differentiator → Envelope Detector → DC Blocker → Integrator) to recover m(t).
              </div>
            </div>

            {/* Key Telemetry Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="rounded-lg border border-[#E6E4DD] bg-[#FAF9F6] p-4">
                <div className="text-xs text-[#75736E]">Peak Phase Deviation (Δθmax)</div>
                <div className="font-mono text-2xl font-bold tabular-nums text-[#C85A32] mt-1">
                  {sim.metrics.deltaThetaMaxRad.toFixed(2)}{' '}
                  <span className="text-xs font-normal text-[#75736E]">rad</span>
                </div>
                <div className="font-mono text-xs tabular-nums text-[#8A8882] mt-0.5">
                  kp · Am = {params.kp.toFixed(1)} × {params.Am.toFixed(1)}
                </div>
              </div>

              <div className="rounded-lg border border-[#E6E4DD] bg-[#FAF9F6] p-4">
                <div className="text-xs text-[#75736E]">Peak Frequency Deviation (Δfmax)</div>
                <div className="font-mono text-2xl font-bold tabular-nums text-[#E11D48] mt-1">
                  {sim.metrics.deltaFMaxHz.toFixed(2)}{' '}
                  <span className="text-xs font-normal text-[#75736E]">Hz</span>
                </div>
                <div className="font-mono text-xs tabular-nums text-[#8A8882] mt-0.5">
                  Proportional to max |dm/dt|
                </div>
              </div>

              <div className="rounded-lg border border-[#E6E4DD] bg-[#FAF9F6] p-4">
                <div className="text-xs text-[#75736E]">Transmitted Avg Power (1 Ω)</div>
                <div className="font-mono text-2xl font-bold tabular-nums text-[#1A1917] mt-1">
                  {sim.metrics.avgPowerW.toFixed(2)}{' '}
                  <span className="text-xs font-normal text-[#75736E]">W</span>
                </div>
                <div className="font-mono text-xs tabular-nums text-[#8A8882] mt-0.5">
                  Constant Ac = {params.Ac.toFixed(1)} V
                </div>
              </div>

              <div className="rounded-lg border border-[#E6E4DD] bg-[#FAF9F6] p-4">
                <div className="text-xs text-[#75736E]">Demodulated Fidelity</div>
                <div className="font-mono text-2xl font-bold tabular-nums text-[#059669] mt-1">
                  {params.kp > 0.01
                    ? `${Math.max(0, 100 - sim.metrics.nrmsePercent).toFixed(1)}%`
                    : 'Unmodulated'}
                </div>
                <div className="font-mono text-xs tabular-nums text-[#8A8882] mt-0.5">
                  {sim.metrics.isLinearRegion ? 'Linear Discriminator' : 'High-Slope Distortion'}
                </div>
              </div>
            </div>
          </>
        )}

        <TheorySection params={params} presentationMode={presentationMode} />

        <ModulationLab
          params={params}
          sim={sim}
          onChangeParams={setParams}
          onReset={handleResetAll}
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying((v) => !v)}
          presentationMode={presentationMode}
        />

        <DemodulationSection params={params} sim={sim} presentationMode={presentationMode} />

        <ComparisonSection params={params} sim={sim} presentationMode={presentationMode} />

        <ExperimentsSection
          params={params}
          sim={sim}
          onApplyPreset={handleApplyExperiment}
          onInspectWaveforms={() => scrollToSection('pm-modulation-lab')}
          presentationMode={presentationMode}
        />

        <SummarySection presentationMode={presentationMode} />

        <div className="border-t border-[#E6E4DD] pt-4 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-[#75736E]">
          <span>Module 2.6 · Phase Modulation and Demodulation</span>
          <button
            type="button"
            onClick={() => scrollToSection('pm-top')}
            className="hover:text-[#C85A32] transition-colors cursor-pointer"
          >
            Back to Top
          </button>
        </div>
      </div>
    </div>
  );
};

export default Module2_6_AM_PM;
