import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  SlidersHorizontal,
  BookOpen,
  Layers,
  Info,
  CheckCircle2,
  Radio,
  Zap,
  Activity,
  RotateCcw,
  AlertTriangle,
  Lock,
  Unlock,
  Minimize2,
  Play,
  Pause,
  Grid,
  AudioLines,
} from 'lucide-react';
import { AM_MODULES, AMSubTopic } from '../../data/modules';
import { ModuleGlyph } from '../../components/ModuleGlyphs';
import { MathView } from '../../components/MathView';
import { SimulationToolbar, PlaybackState } from '../../components/SimulationToolbar';
import {
  BasebandWaveform,
  DsbScParams,
  DsbScSimulationResult,
  simulateDsbScPipeline,
  evaluateLPFMagnitude,
} from './dsbscMath';
import { DsbScAudioLab } from './DsbScAudioLab';

interface Module2_2_DSBSCProps {
  onNavigateHome: () => void;
  onNavigateModule: (path: string) => void;
}

const DEFAULT_PARAMS: DsbScParams = {
  waveform: 'cosine',
  fm: 2.0,
  Am: 1.5,
  fc: 24,
  Ac: 1.5,
  thetaDeg: 0,
  freqOffset: 0,
  lpfCutoff: 7,
  lpfEnabled: true,
};

/**
 * Reusable High-DPI Canvas Renderer with zero-overhead 60fps live frame subscription
 */
interface TimePlotCanvasProps {
  heightClass?: string;
  renderCanvas: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  deps: unknown[];
  ariaLabel: string;
  registerLivePainter?: (painter: () => void) => () => void;
}

const HighDpiCanvas: React.FC<TimePlotCanvasProps> = ({
  heightClass = 'h-40',
  renderCanvas,
  deps,
  ariaLabel,
  registerLivePainter,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderCanvasRef = useRef(renderCanvas);
  renderCanvasRef.current = renderCanvas;

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width === 0 || height === 0) return;

    const targetW = Math.round(width * dpr);
    const targetH = Math.round(height * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);
    renderCanvasRef.current(ctx, width, height);
    ctx.restore();
  }, []);

  useEffect(() => {
    paint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paint, ...deps]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => paint());
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [paint]);

  useEffect(() => {
    if (!registerLivePainter) return;
    return registerLivePainter(paint);
  }, [registerLivePainter, paint]);

  return (
    <div className={`relative w-full ${heightClass} bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden`}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block" aria-label={ariaLabel} />
    </div>
  );
};

export const Module2_2_DSBSC: React.FC<Module2_2_DSBSCProps> = ({
  onNavigateModule,
}) => {
  const subTopic: AMSubTopic = AM_MODULES[1]; // Module 2.2 DSB-SC
  const prevMod = AM_MODULES[0]; // 2.1 CAM
  const nextMod = AM_MODULES[2]; // 2.3 SSB

  // Simulation Parameters State
  const [params, setParams] = useState<DsbScParams>(DEFAULT_PARAMS);

  // Playback & View Controls State (Aligned with Module2_Fourier)
  const [playbackState, setPlaybackState] = useState<PlaybackState>('paused');
  const [speed, setSpeed] = useState<string>('1×');
  const [isGridVisible, setIsGridVisible] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [simSyncTick, setSimSyncTick] = useState<number>(0);

  // Top-level Workbench Tab ('oscilloscope' | 'audio')
  const [activeLabTab, setActiveLabTab] = useState<'oscilloscope' | 'audio'>('oscilloscope');

  // Stage Display Options
  const [showModEnvelope, setShowModEnvelope] = useState<boolean>(true);
  const [showPhaseFlips, setShowPhaseFlips] = useState<boolean>(true);
  const [showCarrierRefOverlay, setShowCarrierRefOverlay] = useState<boolean>(true);
  const [showPreLpfOverlay, setShowPreLpfOverlay] = useState<boolean>(true);
  const [canvasViewMode, setCanvasViewMode] = useState<'oscilloscope' | 'spectrum'>('oscilloscope');
  const [activeStageFilter, setActiveStageFilter] = useState<1 | 2 | 3 | 4 | 5>(1);

  const handleSelectStage = (stage: 1 | 2 | 3 | 4 | 5) => {
    setActiveStageFilter(stage);
    if (stage !== 3 && stage !== 5) {
      setCanvasViewMode('oscilloscope');
    }
  };

  const canvasViewModeRef = useRef(canvasViewMode);
  canvasViewModeRef.current = canvasViewMode;

  const animTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const paramsRef = useRef<DsbScParams>(params);
  paramsRef.current = params;

  const livePaintersRef = useRef<Set<() => void>>(new Set());
  const registerLivePainter = useCallback((fn: () => void) => {
    livePaintersRef.current.add(fn);
    return () => {
      livePaintersRef.current.delete(fn);
    };
  }, []);

  const windowDuration = 1.0; // 1.0 second observation window
  const sim: DsbScSimulationResult = useMemo(
    () => simulateDsbScPipeline(params, animTimeRef.current, windowDuration),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [params, simSyncTick]
  );

  const simRef = useRef<DsbScSimulationResult>(sim);
  simRef.current = sim;

  const handlePauseSimulation = useCallback(() => {
    setPlaybackState('paused');
    setSimSyncTick((t) => t + 1);
  }, []);

  // Keyboard shortcuts: P = Play, H = Pause, Esc = Exit Fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        setPlaybackState('playing');
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        handlePauseSimulation();
      } else if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePauseSimulation]);

  // Zero-re-render 60fps Live Animation Loop
  useEffect(() => {
    if (playbackState === 'playing') {
      const speedMult =
        speed === '0.25×'
          ? 0.25
          : speed === '0.5×'
          ? 0.5
          : speed === '2×'
          ? 2
          : speed === '4×'
          ? 4
          : 1;

      const loop = (timestamp: number) => {
        if (!lastTimeRef.current) lastTimeRef.current = timestamp;
        const dt = Math.min(0.05, (timestamp - lastTimeRef.current) / 1000);
        lastTimeRef.current = timestamp;
        animTimeRef.current = (animTimeRef.current + dt * 0.28 * speedMult) % 100;
        simRef.current = simulateDsbScPipeline(
          paramsRef.current,
          animTimeRef.current,
          windowDuration,
          simRef.current
        );
        if (canvasViewModeRef.current === 'oscilloscope') {
          livePaintersRef.current.forEach((paintFn) => paintFn());
        }
        animFrameRef.current = requestAnimationFrame(loop);
      };

      animFrameRef.current = requestAnimationFrame(loop);
    } else {
      lastTimeRef.current = 0;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [playbackState, speed]);

  const handleResetSimulation = () => {
    animTimeRef.current = 0;
    setPlaybackState('paused');
    setSimSyncTick((t) => t + 1);
  };

  const handleResetParameters = () => {
    animTimeRef.current = 0;
    setParams(DEFAULT_PARAMS);
    setPlaybackState('paused');
    setSimSyncTick((t) => t + 1);
  };

  const applyPreset = (preset: 'coherent' | 'quadrature') => {
    animTimeRef.current = 0;
    setSimSyncTick((t) => t + 1);
    if (preset === 'coherent') {
      setParams({ ...DEFAULT_PARAMS, thetaDeg: 0, freqOffset: 0, lpfEnabled: true, lpfCutoff: 7 });
    } else if (preset === 'quadrature') {
      setParams({ ...DEFAULT_PARAMS, thetaDeg: 90, freqOffset: 0, lpfEnabled: true, lpfCutoff: 7 });
    }
  };

  // Semantic receiver status classification (always explicit text, never color-only)
  const cosTheta = sim.attenuationFactor;
  const isFreqDrifting = Math.abs(params.freqOffset) > 0.05;
  const isQuadratureNull = !isFreqDrifting && Math.abs(Math.abs(params.thetaDeg) - 90) <= 5;
  const isPhaseInverted = !isFreqDrifting && Math.abs(params.thetaDeg) >= 135;
  const isLocked = !isFreqDrifting && Math.abs(params.thetaDeg) <= 3;

  const receiverStatusLabel = isFreqDrifting
    ? `Frequency Drift Beat (Δf = ${params.freqOffset > 0 ? '+' : ''}${params.freqOffset.toFixed(1)} Hz)`
    : isQuadratureNull
    ? 'Quadrature Null (θ = ±90°, Output = 0)'
    : isPhaseInverted
    ? `Inverted Recovery (cos θ = ${cosTheta.toFixed(2)})`
    : isLocked
    ? 'Synchronous Phase Lock (θ = 0°)'
    : `Phase Error Attenuation (cos θ = ${cosTheta.toFixed(2)})`;

  // Plot a Float64Array or numeric series inside a specific oscilloscope channel lane
  const plotLaneSeries = (
    ctx: CanvasRenderingContext2D,
    values: ArrayLike<number>,
    padL: number,
    plotW: number,
    laneTop: number,
    laneH: number,
    maxAmp: number,
    color: string,
    lineWidth = 1.85,
    dash: number[] = []
  ) => {
    const centerY = laneTop + laneH / 2;
    const yScale = (laneH / 2 - 4) / Math.max(0.1, maxAmp);

    ctx.save();
    ctx.beginPath();
    ctx.rect(padL, laneTop, plotW, laneH);
    ctx.clip();

    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.setLineDash(dash);
    ctx.lineJoin = 'round';
    ctx.beginPath();

    const n = values.length;
    const invNMinus1 = n > 1 ? 1 / (n - 1) : 1;
    for (let i = 0; i < n; i++) {
      const x = padL + i * invNMinus1 * plotW;
      const y = centerY - values[i] * yScale;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.restore();
  };

  // Unified 5-Row Stacked Oscilloscope Canvas Drawer (Fits all 5 stages simultaneously)
  const drawUnifiedOscilloscope = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const activeSim = simRef.current;
    const activeTime = animTimeRef.current;
    const activeParams = paramsRef.current;

    type ChannelId = 1 | 2 | 3 | 4 | 5;
    interface ChannelSpec {
      id: ChannelId;
      chLabel: string;
      sigLabel: string;
      subLabel: string;
      color: string;
      maxAmp: number;
    }

    const row5MaxAmp = showPreLpfOverlay
      ? Math.max(2.5, activeParams.Am * activeParams.Ac * 2.15)
      : Math.max(2.5, activeParams.Am * activeParams.Ac * 1.4);

    const allChannels: ChannelSpec[] = [
      {
        id: 1,
        chLabel: '01',
        sigLabel: 'm(t)',
        subLabel: `${activeParams.fm.toFixed(1)}Hz · Am=${activeParams.Am.toFixed(1)}V`,
        color: '#0284C7',
        maxAmp: Math.max(2.0, activeParams.Am * 1.25),
      },
      {
        id: 2,
        chLabel: '02',
        sigLabel: 'c(t)',
        subLabel: `${activeParams.fc}Hz · Ac=${activeParams.Ac.toFixed(1)}V`,
        color: '#64748B',
        maxAmp: Math.max(2.0, activeParams.Ac * 1.25),
      },
      {
        id: 3,
        chLabel: '03',
        sigLabel: 's(t)',
        subLabel: 'm(t)·c(t) DSB-SC',
        color: '#C85A32',
        maxAmp: Math.max(2.5, activeParams.Am * activeParams.Ac * 1.25),
      },
      {
        id: 4,
        chLabel: '04',
        sigLabel: 'c_rx(t)',
        subLabel: `θ=${activeParams.thetaDeg}° Δf=${activeParams.freqOffset.toFixed(1)}Hz`,
        color: '#D97706',
        maxAmp: 1.35,
      },
      {
        id: 5,
        chLabel: '05',
        sigLabel: 'm̂(t)',
        subLabel: activeParams.lpfEnabled ? `v(t) + LPF ${activeParams.lpfCutoff}Hz` : 'v(t) · LPF Bypass',
        color: '#059669',
        maxAmp: row5MaxAmp,
      },
    ];

    const visibleChannels = allChannels.filter((c) => c.id === activeStageFilter);

    const isCompact = w < 560;
    const padL = isCompact ? 86 : 138;
    const padR = 14;
    const padT = 6;
    const padB = 22;
    const plotW = Math.max(80, w - padL - padR);
    const totalPlotH = Math.max(100, h - padT - padB);
    const nCh = visibleChannels.length;
    const bandGap = nCh > 1 ? 5 : 0;
    const bandH = (totalPlotH - bandGap * (nCh - 1)) / nCh;

    // 1. Draw channel lane backgrounds, 0V baselines, and horizontal gridlines
    visibleChannels.forEach((ch, idx) => {
      const bandTop = padT + idx * (bandH + bandGap);
      const centerY = bandTop + bandH / 2;

      ctx.fillStyle = idx % 2 === 0 ? '#FFFFFF' : '#F6F4EE';
      ctx.fillRect(4, bandTop, w - 8, bandH);

      ctx.strokeStyle = '#E6E4DD';
      ctx.lineWidth = 1;
      ctx.strokeRect(4, bandTop, w - 8, bandH);

      if (isGridVisible && bandH >= 46) {
        ctx.strokeStyle = '#EFECE5';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 3]);
        [-0.5, 0.5].forEach((frac) => {
          const y = centerY - frac * (bandH / 2);
          ctx.beginPath();
          ctx.moveTo(padL, y);
          ctx.lineTo(w - padR, y);
          ctx.stroke();
        });
        ctx.setLineDash([]);
      }

      // 0V baseline per trace
      ctx.strokeStyle = '#CCC9C0';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padL, centerY);
      ctx.lineTo(w - padR, centerY);
      ctx.stroke();
    });

    // 2. Shared synchronized vertical time graticule spanning all 5 stacked rows
    if (isGridVisible) {
      ctx.strokeStyle = '#EAE7DF';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      for (let i = 1; i < 8; i++) {
        const x = padL + (i / 8) * plotW;
        ctx.beginPath();
        ctx.moveTo(x, padT);
        ctx.lineTo(x, padT + totalPlotH);
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // Main Y-axis divider between channel label gutter and oscilloscope trace window
    ctx.strokeStyle = '#B8B5AC';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, padT + totalPlotH);
    ctx.stroke();

    // 3. Global 180° Zero-Crossing Phase-Flip Alignment Guides across stacked traces
    if (showPhaseFlips) {
      activeSim.zeroCrossings.forEach((tCross) => {
        const frac = (tCross - activeTime) / windowDuration;
        if (frac > 0.015 && frac < 0.985) {
          const x = padL + frac * plotW;
          ctx.save();
          ctx.strokeStyle = 'rgba(200, 90, 50, 0.35)';
          ctx.lineWidth = 1.1;
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.moveTo(x, padT);
          ctx.lineTo(x, padT + totalPlotH);
          ctx.stroke();
          ctx.restore();
        }
      });
    }

    // 4. Draw each channel's left gutter metadata, scale ticks, and oscilloscope waveform
    visibleChannels.forEach((ch, idx) => {
      const bandTop = padT + idx * (bandH + bandGap);
      const centerY = bandTop + bandH / 2;

      // Colored channel bar
      ctx.fillStyle = ch.color;
      ctx.fillRect(8, bandTop + 4, 3, Math.max(8, bandH - 8));

      // Channel ID & signal name
      ctx.textAlign = 'left';
      ctx.fillStyle = ch.color;
      ctx.font = 'bold 10.5px "JetBrains Mono", monospace';
      const showSub = !isCompact && bandH >= 56;
      const titleY = showSub ? centerY - 5 : centerY + 3.5;
      ctx.fillText(`${ch.chLabel} ${ch.sigLabel}`, 16, titleY);

      if (showSub) {
        ctx.fillStyle = '#75736E';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillText(ch.subLabel, 16, centerY + 9);
      }

      // Y-axis scale ticks inside gutter right edge
      ctx.textAlign = 'right';
      ctx.fillStyle = '#8A8882';
      ctx.font = '9px "JetBrains Mono", monospace';
      if (bandH >= 56) {
        ctx.fillText(`+${ch.maxAmp.toFixed(1)}`, padL - 5, bandTop + 11);
        ctx.fillText(`0`, padL - 5, centerY + 3);
        ctx.fillText(`-${ch.maxAmp.toFixed(1)}`, padL - 5, bandTop + bandH - 3);
      } else {
        ctx.fillText(`±${ch.maxAmp.toFixed(1)}V`, padL - 5, centerY + 3);
      }

      // Plot trace & stage overlays
      const traceTop = bandTop + 2;
      const traceH = Math.max(16, bandH - 4);

      if (ch.id === 1) {
        plotLaneSeries(ctx, activeSim.mValues, padL, plotW, traceTop, traceH, ch.maxAmp, ch.color, 2.0);

        // Beginner visual annotation: 1 period bracket T = 1/fm & +Am peak label
        const periodSec = 1 / Math.max(0.5, activeParams.fm);
        if (periodSec <= 0.85 && bandH >= 80) {
          const pW = (periodSec / windowDuration) * plotW;
          const bY = bandTop + 16;
          ctx.save();
          ctx.strokeStyle = '#0284C7';
          ctx.lineWidth = 1.25;
          ctx.beginPath();
          ctx.moveTo(padL + 6, bY - 4);
          ctx.lineTo(padL + 6, bY);
          ctx.lineTo(padL + 6 + pW, bY);
          ctx.lineTo(padL + 6 + pW, bY - 4);
          ctx.stroke();
          ctx.fillStyle = '#0284C7';
          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          ctx.textAlign = 'left';
          ctx.fillText(`1 Cycle T = ${periodSec.toFixed(2)}s`, padL + 8, bY + 11);
          ctx.restore();
        }

        if (showPhaseFlips) {
          activeSim.zeroCrossings.forEach((tCross, zIdx) => {
            const frac = (tCross - activeTime) / windowDuration;
            if (frac >= 0 && frac <= 1) {
              const x = padL + frac * plotW;
              ctx.fillStyle = '#C85A32';
              ctx.beginPath();
              ctx.arc(x, centerY, 3.2, 0, Math.PI * 2);
              ctx.fill();
              if (zIdx === 0 && bandH >= 80 && frac > 0.08 && frac < 0.88) {
                ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
                ctx.textAlign = 'center';
                ctx.fillText('0V (Flip Pt)', x, centerY - 8);
              }
            }
          });
        }
      } else if (ch.id === 2) {
        plotLaneSeries(ctx, activeSim.cValues, padL, plotW, traceTop, traceH, ch.maxAmp, ch.color, 1.35);
        if (bandH >= 80) {
          ctx.save();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.strokeStyle = '#E6E4DD';
          ctx.lineWidth = 1;
          const badgeW = 196;
          ctx.fillRect(w - padR - badgeW - 4, bandTop + 6, badgeW, 18);
          ctx.strokeRect(w - padR - badgeW - 4, bandTop + 6, badgeW, 18);
          ctx.fillStyle = '#1A1917';
          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          ctx.textAlign = 'right';
          ctx.fillText(
            `${(activeParams.fc / activeParams.fm).toFixed(1)}× faster than m(t) · ±${activeParams.Ac.toFixed(1)}V`,
            w - padR - 10,
            bandTop + 18
          );
          ctx.restore();
        }
      } else if (ch.id === 3) {
        if (showModEnvelope) {
          plotLaneSeries(ctx, activeSim.envPosValues, padL, plotW, traceTop, traceH, ch.maxAmp, '#0284C7', 1.2, [5, 4]);
          plotLaneSeries(ctx, activeSim.envNegValues, padL, plotW, traceTop, traceH, ch.maxAmp, '#0284C7', 1.2, [5, 4]);
        }
        plotLaneSeries(ctx, activeSim.sValues, padL, plotW, traceTop, traceH, ch.maxAmp, ch.color, 1.65);
        if (showPhaseFlips) {
          activeSim.zeroCrossings.forEach((tCross, zIdx) => {
            const frac = (tCross - activeTime) / windowDuration;
            if (frac > 0.02 && frac < 0.98) {
              const x = padL + frac * plotW;
              ctx.fillStyle = '#C85A32';
              ctx.beginPath();
              ctx.arc(x, centerY, 3.2, 0, Math.PI * 2);
              ctx.fill();
              if (bandH >= 56) {
                ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
                ctx.textAlign = 'center';
                ctx.fillText(zIdx === 0 ? '180° Flip' : '180°', x, bandTop + 11);
              }
            }
          });
        }
      } else if (ch.id === 4) {
        if (showCarrierRefOverlay) {
          plotLaneSeries(ctx, activeSim.cRxRefValues, padL, plotW, traceTop, traceH, ch.maxAmp, '#B8B5AC', 1.15, [3, 3]);
        }
        plotLaneSeries(ctx, activeSim.cRxValues, padL, plotW, traceTop, traceH, ch.maxAmp, ch.color, 1.55);
        if (bandH >= 80) {
          ctx.save();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.strokeStyle = '#E6E4DD';
          ctx.lineWidth = 1;
          const badgeW = 200;
          ctx.fillRect(w - padR - badgeW - 4, bandTop + 6, badgeW, 18);
          ctx.strokeRect(w - padR - badgeW - 4, bandTop + 6, badgeW, 18);
          ctx.fillStyle = Math.abs(activeParams.thetaDeg) >= 85 && Math.abs(activeParams.thetaDeg) <= 95 ? '#DC2626' : '#D97706';
          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          ctx.textAlign = 'right';
          ctx.fillText(
            `Phase θ=${activeParams.thetaDeg}° · Gain cos θ=${activeSim.attenuationFactor.toFixed(2)}`,
            w - padR - 10,
            bandTop + 18
          );
          ctx.restore();
        }
      } else if (ch.id === 5) {
        if (showPreLpfOverlay) {
          plotLaneSeries(ctx, activeSim.vValues, padL, plotW, traceTop, traceH, ch.maxAmp, 'rgba(124, 58, 237, 0.58)', 1.25);
        }
        plotLaneSeries(ctx, activeSim.mTargetValues, padL, plotW, traceTop, traceH, ch.maxAmp, '#94A3B8', 1.4, [5, 4]);
        plotLaneSeries(ctx, activeSim.mHatValues, padL, plotW, traceTop, traceH, ch.maxAmp, ch.color, 2.2);
        if (bandH >= 80) {
          const matchPct = Math.max(0, Math.round(Math.abs(activeSim.attenuationFactor) * 100));
          ctx.save();
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.strokeStyle = '#E6E4DD';
          ctx.lineWidth = 1;
          const badgeW = 190;
          ctx.fillRect(w - padR - badgeW - 4, bandTop + 6, badgeW, 18);
          ctx.strokeRect(w - padR - badgeW - 4, bandTop + 6, badgeW, 18);
          ctx.fillStyle = activeParams.lpfEnabled ? '#059669' : '#7C3AED';
          ctx.font = 'bold 9px "JetBrains Mono", monospace';
          ctx.textAlign = 'right';
          ctx.fillText(
            activeParams.lpfEnabled
              ? `LPF Clean Output · Match ${matchPct}%`
              : 'LPF Bypassed · 2fc Ripple Leaking',
            w - padR - 10,
            bandTop + 18
          );
          ctx.restore();
        }
      }
    });

    // 5. Shared Synchronized Time Axis at Bottom
    ctx.fillStyle = '#75736E';
    ctx.font = '9.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    const numTimeTicks = isCompact ? 4 : 8;
    for (let i = 0; i <= numTimeTicks; i++) {
      const frac = i / numTimeTicks;
      const x = padL + frac * plotW;
      const tVal = activeTime + frac * windowDuration;
      ctx.strokeStyle = '#B8B5AC';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, padT + totalPlotH);
      ctx.lineTo(x, padT + totalPlotH + 4);
      ctx.stroke();

      const alignedX = i === 0 ? x + 12 : i === numTimeTicks ? x - 14 : x;
      ctx.fillText(`${tVal.toFixed(2)}s`, alignedX, h - 5);
    }

    ctx.textAlign = 'left';
    ctx.fillStyle = '#585651';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.fillText('SYNC TIMEBASE →', 8, h - 5);
  };

  // Unified Stacked Dual-Spectrum Analyzer (TX |S(f)| Top + RX |V(f)| & LPF Bottom)
  const drawUnifiedSpectrum = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    const activeSim = simRef.current;
    const activeParams = paramsRef.current;
    const padL = 56;
    const padR = 24;
    const gapY = 38;
    const padT = 26;
    const padB = 30;
    const panelH = Math.max(110, (h - padT - padB - gapY) / 2);
    const plotW = Math.max(80, w - padL - padR);

    // --- TOP PANEL: TX Spectrum |S(f)| ---
    const txTop = padT;
    const txBaseY = txTop + panelH;
    const maxTxFreq = Math.max(55, activeParams.fc + activeParams.fm * 8 + 6);
    const maxTxAmp = Math.max(1.5, ...activeSim.txSpectrum.map((l) => l.amplitude * 1.3));
    const txFreqToX = (f: number) => padL + (f / maxTxFreq) * plotW;

    ctx.fillStyle = '#1A1917';
    ctx.font = 'bold 10.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(
      `TX SPECTRUM |S(f)| — Carrier Suppressed at fc=${activeParams.fc}Hz · LSB/USB Sidebands (B_T=${activeSim.bandwidthHz.toFixed(1)}Hz)`,
      padL,
      txTop - 9
    );

    if (isGridVisible) {
      ctx.strokeStyle = '#ECEAE2';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      [0.25, 0.5, 0.75, 1].forEach((r) => {
        const y = txBaseY - r * panelH;
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(w - padR, y);
        ctx.stroke();
      });
      ctx.setLineDash([]);
    }

    ctx.strokeStyle = '#8A8882';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(padL, txTop);
    ctx.lineTo(padL, txBaseY);
    ctx.lineTo(w - padR, txBaseY);
    ctx.stroke();

    ctx.fillStyle = '#8A8882';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${maxTxAmp.toFixed(1)}V`, padL - 6, txTop + 6);
    ctx.fillText('0', padL - 6, txBaseY + 3);

    ctx.textAlign = 'center';
    for (let f = 0; f <= maxTxFreq; f += 10) {
      ctx.fillText(`${f}`, txFreqToX(f), txBaseY + 13);
    }

    const fcX = txFreqToX(activeParams.fc);
    ctx.save();
    ctx.strokeStyle = '#A8A69E';
    ctx.lineWidth = 1.4;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(fcX, txBaseY);
    ctx.lineTo(fcX, txTop + 14);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(fcX, txBaseY, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.strokeStyle = '#C85A32';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#75736E';
    ctx.font = 'bold 9.5px "JetBrains Mono", monospace';
    ctx.fillText(`fc=${activeParams.fc}Hz (0V)`, fcX, txTop + 10);
    ctx.restore();

    activeSim.txSpectrum.forEach((line) => {
      if (line.kind === 'carrier') return;
      const x = txFreqToX(line.freq);
      if (x < padL || x > w - padR) return;
      const stemH = (line.amplitude / maxTxAmp) * (panelH - 18);
      const topY = txBaseY - stemH;
      const color = line.kind === 'lsb' ? '#0284C7' : '#C85A32';

      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x, txBaseY);
      ctx.lineTo(x, topY);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x, topY, 3.6, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      if (line.label) {
        ctx.fillStyle = color;
        ctx.font = 'bold 9.5px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`${line.label} (${line.freq.toFixed(1)}Hz)`, x, topY - 6);
      }
    });

    // --- BOTTOM PANEL: RX Demodulator Pre-LPF Spectrum |V(f)| & LPF |H(f)| ---
    const rxTop = txBaseY + gapY;
    const rxBaseY = rxTop + panelH;
    const maxRxFreq = Math.max(70, 2 * activeParams.fc + activeParams.fm * 4 + 8);
    const maxRxAmp = Math.max(1.5, ...activeSim.rxPreFilterSpectrum.map((l) => l.amplitude * 1.25));
    const rxFreqToX = (f: number) => padL + (f / maxRxFreq) * plotW;

    ctx.fillStyle = '#1A1917';
    ctx.font = 'bold 10.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(
      `RX DEMODULATOR SPECTRUM |V(f)| — Baseband vs 2fc=${2 * activeParams.fc}Hz & Ideal LPF Passband`,
      padL,
      rxTop - 9
    );

    if (isGridVisible) {
      ctx.strokeStyle = '#ECEAE2';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      [0.25, 0.5, 0.75, 1].forEach((r) => {
        const y = rxBaseY - r * panelH;
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(w - padR, y);
        ctx.stroke();
      });
      ctx.setLineDash([]);
    }

    if (activeParams.lpfEnabled) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(padL, rxBaseY);
      for (let i = 0; i <= 160; i++) {
        const f = (i / 160) * maxRxFreq;
        const mag = evaluateLPFMagnitude(f, activeParams.lpfCutoff);
        ctx.lineTo(rxFreqToX(f), rxBaseY - mag * (panelH - 12));
      }
      ctx.lineTo(w - padR, rxBaseY);
      ctx.closePath();
      ctx.fillStyle = 'rgba(5, 150, 105, 0.09)';
      ctx.fill();

      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 1.75;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      for (let i = 0; i <= 160; i++) {
        const f = (i / 160) * maxRxFreq;
        const mag = evaluateLPFMagnitude(f, activeParams.lpfCutoff);
        const x = rxFreqToX(f);
        const y = rxBaseY - mag * (panelH - 12);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();

      const cutX = rxFreqToX(activeParams.lpfCutoff);
      ctx.fillStyle = '#059669';
      ctx.font = 'bold 9.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'left';
      ctx.fillText(`LPF fc=${activeParams.lpfCutoff}Hz`, Math.min(cutX + 4, w - padR - 80), rxTop + 10);
    }

    ctx.strokeStyle = '#8A8882';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(padL, rxTop);
    ctx.lineTo(padL, rxBaseY);
    ctx.lineTo(w - padR, rxBaseY);
    ctx.stroke();

    ctx.fillStyle = '#8A8882';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${maxRxAmp.toFixed(1)}V`, padL - 6, rxTop + 6);
    ctx.fillText('0', padL - 6, rxBaseY + 3);

    ctx.textAlign = 'center';
    const step = maxRxFreq > 80 ? 20 : 10;
    for (let f = 0; f <= maxRxFreq; f += step) {
      ctx.fillText(`${f}`, rxFreqToX(f), rxBaseY + 13);
    }
    ctx.fillStyle = '#585651';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.fillText('Frequency f (Hz)', padL + plotW / 2, h - 5);

    activeSim.rxPreFilterSpectrum.forEach((line) => {
      const x = rxFreqToX(line.freq);
      if (x < padL || x > w - padR) return;
      const stemH = (line.amplitude / maxRxAmp) * (panelH - 18);
      const topY = rxBaseY - stemH;
      const color = line.kind === 'baseband' ? '#059669' : '#7C3AED';

      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(x, rxBaseY);
      ctx.lineTo(x, topY);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x, topY, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      if (line.label) {
        ctx.fillStyle = color;
        ctx.font = 'bold 9.5px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(line.label, x, topY - 6);
      }
    });
  };

  const drawUnifiedCanvas = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    if (canvasViewModeRef.current === 'spectrum') {
      drawUnifiedSpectrum(ctx, w, h);
    } else {
      drawUnifiedOscilloscope(ctx, w, h);
    }
  };

  // Shared Control Sidebar Content (Shows Quick Presets + ONLY controls for the currently chosen signal)
  const renderControlsSidebar = () => (
    <div className="space-y-3">
      {/* Main Interactive Parameter Deck */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-3.5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#E6E4DD]">
          <span className="text-xs font-mono uppercase tracking-wider text-[#1A1917] font-bold flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#C85A32]" />
            <span>Stage 0{activeStageFilter} Controls</span>
          </span>
          <button
            type="button"
            onClick={handleResetParameters}
            className="text-[11px] font-mono text-[#75736E] hover:text-[#C85A32] transition-colors flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>

        {/* Scenario Presets: Only Coherent Lock & Quadrature Null */}
        <div>
          <label className="block text-[10px] font-mono uppercase tracking-wider text-[#75736E] font-semibold mb-1">
            Quick Presets
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => applyPreset('coherent')}
              className={`px-2 py-1.5 rounded border text-[11px] font-semibold text-left transition-colors cursor-pointer truncate ${
                isLocked
                  ? 'bg-[#FBF4F0] border-[#C85A32] text-[#C85A32]'
                  : 'bg-[#FAF9F6] border-[#E6E4DD] text-[#585651] hover:text-[#1A1917] hover:bg-white'
              }`}
            >
              01. Coherent Lock
            </button>
            <button
              type="button"
              onClick={() => applyPreset('quadrature')}
              className={`px-2 py-1.5 rounded border text-[11px] font-semibold text-left transition-colors cursor-pointer truncate ${
                isQuadratureNull
                  ? 'bg-[#FBF4F0] border-[#C85A32] text-[#C85A32]'
                  : 'bg-[#FAF9F6] border-[#E6E4DD] text-[#585651] hover:text-[#1A1917] hover:bg-white'
              }`}
            >
              02. Quadrature Null
            </button>
          </div>
        </div>

        {/* STAGE 1: Modulating Signal Controls + Visual Shape Selector */}
        {activeStageFilter === 1 && (
          <div className="pt-2.5 border-t border-[#E6E4DD] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#1A1917] flex items-center gap-1.5">
                <span className="font-mono text-[#0284C7]">01</span>
                <span>Message Signal m(t)</span>
              </span>
              <span className="text-[10px] font-mono text-[#0284C7] bg-[#F0F9FF] px-1.5 py-0.5 rounded border border-[#BAE6FD]">
                {sim.zeroCrossings.length} flips/s
              </span>
            </div>

            {/* Visual Waveform Buttons with inline SVG shapes */}
            <div className="grid grid-cols-4 gap-1">
              {(
                [
                  { id: 'cosine', label: 'Cos', path: 'M 2 3 Q 7 3 9 9 T 16 15 T 23 9 T 28 3' },
                  { id: 'twotone', label: '2-Tone', path: 'M 2 4 C 5 4 6 13 9 12 C 12 11 13 4 16 9 C 19 14 21 6 24 6 C 26 6 27 12 28 11' },
                  { id: 'triangle', label: 'Tri', path: 'M 2 3 L 9 15 L 16 3 L 23 15 L 28 6' },
                  { id: 'square', label: 'Rect', path: 'M 2 3 H 9 V 15 H 16 V 3 H 23 V 15 H 28' },
                ] as Array<{ id: BasebandWaveform; label: string; path: string }>
              ).map((wf) => (
                <button
                  key={wf.id}
                  type="button"
                  onClick={() => setParams((p) => ({ ...p, waveform: wf.id }))}
                  className={`py-1.5 px-1 rounded text-[10.5px] font-mono border transition-colors cursor-pointer flex flex-col items-center gap-1 ${
                    params.waveform === wf.id
                      ? 'bg-[#1A1917] text-white border-[#1A1917] font-bold'
                      : 'bg-[#FAF9F6] border-[#E6E4DD] text-[#585651] hover:text-[#1A1917]'
                  }`}
                >
                  <svg viewBox="0 0 30 18" className="w-7 h-3.5 overflow-visible" aria-hidden="true">
                    <line x1="1" y1="9" x2="29" y2="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1" />
                    <path d={wf.path} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span>{wf.label}</span>
                </button>
              ))}
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] mb-0.5">
                <label htmlFor="dsb-fm" className="text-[#585651] font-medium">
                  Wave Speed / Freq (f_m)
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0.5}
                    max={5.0}
                    step={0.1}
                    value={params.fm}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!Number.isNaN(val)) {
                        setParams((p) => ({ ...p, fm: Math.max(0.5, Math.min(5.0, val)) }));
                      }
                    }}
                    className="w-12 text-right font-mono text-[11px] font-bold text-[#0284C7] bg-[#FAF9F6] border border-[#E6E4DD] rounded px-1 py-0.2 tabular-nums"
                    aria-label="Message frequency numeric input"
                  />
                  <span className="text-[10px] font-mono text-[#75736E]">Hz</span>
                </div>
              </div>
              <input
                id="dsb-fm"
                type="range"
                min="0.5"
                max="5.0"
                step="0.1"
                value={params.fm}
                onChange={(e) => setParams((p) => ({ ...p, fm: parseFloat(e.target.value) }))}
                className="w-full accent-[#0284C7] cursor-pointer"
              />
              <div className="flex justify-between text-[9.5px] font-mono text-[#8A8882]">
                <span>Slower / Wider</span>
                <span>Faster / Tighter</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] mb-0.5">
                <label htmlFor="dsb-am" className="text-[#585651] font-medium">
                  Wave Height / Amp (A_m)
                </label>
                <span className="font-mono font-bold text-[#0284C7] tabular-nums">
                  ±{params.Am.toFixed(1)} V
                </span>
              </div>
              <input
                id="dsb-am"
                type="range"
                min="0.5"
                max="3.0"
                step="0.1"
                value={params.Am}
                onChange={(e) => setParams((p) => ({ ...p, Am: parseFloat(e.target.value) }))}
                className="w-full accent-[#0284C7] cursor-pointer"
              />
              <div className="flex justify-between text-[9.5px] font-mono text-[#8A8882]">
                <span>Quiet (0.5V)</span>
                <span>Loud (3.0V)</span>
              </div>
            </div>
          </div>
        )}

        {/* STAGE 2: Carrier Signal Controls + Live Speed Ratio Visual */}
        {activeStageFilter === 2 && (
          <div className="pt-2.5 border-t border-[#E6E4DD] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#1A1917] flex items-center gap-1.5">
                <span className="font-mono text-[#C85A32]">02</span>
                <span>Carrier Signal c(t)</span>
              </span>
              <span className="text-[10px] font-mono text-[#C85A32] font-bold bg-[#FBF4F0] px-1.5 py-0.5 rounded border border-[#C85A32]/25 tabular-nums">
                {(params.fc / params.fm).toFixed(1)}× faster
              </span>
            </div>

            {/* Visual Slow Message vs Fast Carrier Speed Comparison */}
            <div className="p-2 rounded border border-[#E6E4DD] bg-[#FAF9F6] space-y-1">
              <div className="flex items-center justify-between text-[9.5px] font-mono text-[#75736E]">
                <span className="text-[#0284C7] font-semibold">Message ({params.fm.toFixed(1)}Hz)</span>
                <span>vs</span>
                <span className="text-[#C85A32] font-semibold">Carrier ({params.fc}Hz)</span>
              </div>
              <svg viewBox="0 0 180 34" className="w-full h-8" aria-label="Message vs carrier frequency visual">
                <path
                  d="M 2 9 Q 24 2, 46 9 T 90 9 T 134 9 T 178 9"
                  fill="none"
                  stroke="#0284C7"
                  strokeWidth="1.6"
                />
                <path
                  d={Array.from({ length: 72 }, (_, idx) => {
                    const x = 2 + (idx / 71) * 176;
                    const cycles = Math.max(6, Math.round(params.fc / 2.5));
                    const y = 24 - 6 * (params.Ac / 3) * Math.cos((idx / 71) * Math.PI * 2 * cycles);
                    return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                  }).join(' ')}
                  fill="none"
                  stroke="#C85A32"
                  strokeWidth="1.25"
                />
              </svg>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] mb-0.5">
                <label htmlFor="dsb-fc" className="text-[#585651] font-medium">
                  Carrier Freq (f_c)
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={12}
                    max={45}
                    step={1}
                    value={params.fc}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      if (!Number.isNaN(val)) {
                        setParams((p) => ({ ...p, fc: Math.max(12, Math.min(45, val)) }));
                      }
                    }}
                    className="w-12 text-right font-mono text-[11px] font-bold text-[#1A1917] bg-[#FAF9F6] border border-[#E6E4DD] rounded px-1 py-0.2 tabular-nums"
                    aria-label="Carrier frequency numeric input"
                  />
                  <span className="text-[10px] font-mono text-[#75736E]">Hz</span>
                </div>
              </div>
              <input
                id="dsb-fc"
                type="range"
                min="12"
                max="45"
                step="1"
                value={params.fc}
                onChange={(e) => setParams((p) => ({ ...p, fc: parseInt(e.target.value, 10) }))}
                className="w-full accent-[#C85A32] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] mb-0.5">
                <label htmlFor="dsb-ac" className="text-[#585651] font-medium">
                  Carrier Height / Amp (A_c)
                </label>
                <span className="font-mono font-bold text-[#1A1917] tabular-nums">
                  ±{params.Ac.toFixed(1)} V
                </span>
              </div>
              <input
                id="dsb-ac"
                type="range"
                min="0.5"
                max="3.0"
                step="0.1"
                value={params.Ac}
                onChange={(e) => setParams((p) => ({ ...p, Ac: parseFloat(e.target.value) }))}
                className="w-full accent-[#C85A32] cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* STAGE 3: DSB-SC Modulated Signal Controls + Visual Multiplier Diagram */}
        {activeStageFilter === 3 && (
          <div className="pt-2.5 border-t border-[#E6E4DD] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#1A1917] flex items-center gap-1.5">
                <span className="font-mono text-[#C85A32]">03</span>
                <span>DSB-SC Product s(t)</span>
              </span>
              <span className="text-[10px] font-mono text-[#75736E] tabular-nums">
                Peak ±{(params.Am * params.Ac).toFixed(2)}V
              </span>
            </div>

            {/* Visual Block Diagram: m(t) * c(t) = s(t) */}
            <div className="p-2 rounded border border-[#E6E4DD] bg-[#FAF9F6] flex items-center justify-between text-[10px] font-mono">
              <span className="px-1.5 py-0.5 rounded bg-[#F0F9FF] border border-[#BAE6FD] text-[#0284C7] font-bold">
                m(t)
              </span>
              <span className="text-[#75736E] font-bold">×</span>
              <span className="px-1.5 py-0.5 rounded bg-white border border-[#E6E4DD] text-[#585651] font-bold">
                c(t)
              </span>
              <span className="text-[#75736E] font-bold">=</span>
              <span className="px-1.5 py-0.5 rounded bg-[#FBF4F0] border border-[#C85A32]/30 text-[#C85A32] font-bold">
                s(t) (No Carrier)
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setCanvasViewMode('oscilloscope')}
                className={`py-1.5 rounded border text-[11px] font-mono font-semibold cursor-pointer transition-colors ${
                  canvasViewMode === 'oscilloscope'
                    ? 'bg-[#1A1917] text-white border-[#1A1917]'
                    : 'bg-[#FAF9F6] border-[#E6E4DD] text-[#585651] hover:text-[#1A1917]'
                }`}
              >
                Time Wave s(t)
              </button>
              <button
                type="button"
                onClick={() => setCanvasViewMode('spectrum')}
                className={`py-1.5 rounded border text-[11px] font-mono font-semibold cursor-pointer transition-colors ${
                  canvasViewMode === 'spectrum'
                    ? 'bg-[#1A1917] text-white border-[#1A1917]'
                    : 'bg-[#FAF9F6] border-[#E6E4DD] text-[#585651] hover:text-[#1A1917]'
                }`}
              >
                Frequencies |S(f)|
              </button>
            </div>

            <div className="space-y-1.5 pt-0.5">
              <label className="flex items-start justify-between gap-2 p-2 rounded border border-[#E6E4DD] bg-[#FAF9F6] cursor-pointer select-none">
                <div>
                  <div className="text-[11px] font-mono text-[#1A1917] font-semibold">±Envelope Outline</div>
                  <div className="text-[10px] text-[#75736E]">Blue dashed guide tracing ±|m(t)| shape</div>
                </div>
                <input
                  type="checkbox"
                  checked={showModEnvelope}
                  onChange={(e) => setShowModEnvelope(e.target.checked)}
                  className="accent-[#0284C7] rounded mt-0.5"
                />
              </label>
              <label className="flex items-start justify-between gap-2 p-2 rounded border border-[#E6E4DD] bg-[#FAF9F6] cursor-pointer select-none">
                <div>
                  <div className="text-[11px] font-mono text-[#1A1917] font-semibold">180° Phase Flip Dots</div>
                  <div className="text-[10px] text-[#75736E]">Shows where wave flips upside down at 0V</div>
                </div>
                <input
                  type="checkbox"
                  checked={showPhaseFlips}
                  onChange={(e) => setShowPhaseFlips(e.target.checked)}
                  className="accent-[#C85A32] rounded mt-0.5"
                />
              </label>
            </div>
          </div>
        )}

        {/* STAGE 4: Receiver Local Oscillator Controls + Live SVG Phase Alignment Compass */}
        {activeStageFilter === 4 && (
          <div className="pt-2.5 border-t border-[#E6E4DD] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#1A1917] flex items-center gap-1.5">
                <span className="font-mono text-[#D97706]">04</span>
                <span>Receiver LO c_rx(t)</span>
              </span>
              <span className="text-[10px] font-mono font-bold text-[#D97706] tabular-nums">
                cos θ = {cosTheta.toFixed(2)}
              </span>
            </div>

            {/* Interactive SVG Phase Alignment Compass */}
            {(() => {
              const rad = (params.thetaDeg * Math.PI) / 180;
              const rxX = 36 + 24 * Math.cos(rad);
              const rxY = 36 - 24 * Math.sin(rad);
              const strengthPct = Math.round(Math.abs(cosTheta) * 100);
              return (
                <div className="p-2 rounded border border-[#E6E4DD] bg-[#FAF9F6] flex items-center gap-3">
                  <svg viewBox="0 0 72 72" className="w-16 h-16 shrink-0" aria-label="Phase alignment compass">
                    <circle cx="36" cy="36" r="28" fill="#FFFFFF" stroke="#E6E4DD" strokeWidth="1.2" />
                    <line x1="8" y1="36" x2="64" y2="36" stroke="#F0EFEA" strokeWidth="1" />
                    <line x1="36" y1="8" x2="36" y2="64" stroke="#F0EFEA" strokeWidth="1" />
                    {/* TX Carrier Reference Vector (0°) */}
                    <line x1="36" y1="36" x2="60" y2="36" stroke="#94A3B8" strokeWidth="2" strokeDasharray="2 2" />
                    <circle cx="60" cy="36" r="2.5" fill="#94A3B8" />
                    {/* RX Local Oscillator Vector (theta) */}
                    <line
                      x1="36"
                      y1="36"
                      x2={rxX}
                      y2={rxY}
                      stroke={isQuadratureNull ? '#DC2626' : '#D97706'}
                      strokeWidth="2.4"
                      strokeLinecap="round"
                    />
                    <circle cx={rxX} cy={rxY} r="3" fill={isQuadratureNull ? '#DC2626' : '#D97706'} />
                    <circle cx="36" cy="36" r="2.5" fill="#1A1917" />
                  </svg>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="text-[10px] font-mono text-[#75736E]">
                      TX (gray 0°) vs RX (amber {params.thetaDeg}°)
                    </div>
                    <div className="h-2 w-full bg-[#E6E4DD] rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          isQuadratureNull ? 'bg-[#DC2626]' : isLocked ? 'bg-[#059669]' : 'bg-[#D97706]'
                        }`}
                        style={{ width: `${strengthPct}%` }}
                      />
                    </div>
                    <div className="text-[10px] font-mono font-bold text-[#1A1917]">
                      {isQuadratureNull
                        ? '0% — Waves Cancel (Null!)'
                        : isPhaseInverted
                        ? `${strengthPct}% — Upside Down`
                        : `${strengthPct}% Signal Strength`}
                    </div>
                  </div>
                </div>
              );
            })()}

            <div>
              <div className="flex items-center justify-between text-[11px] mb-0.5">
                <label htmlFor="dsb-theta" className="text-[#585651] font-medium">
                  Phase Error (θ)
                </label>
                <span className="font-mono font-bold text-[#D97706] tabular-nums">
                  {params.thetaDeg > 0 ? `+${params.thetaDeg}` : params.thetaDeg}°
                </span>
              </div>
              <input
                id="dsb-theta"
                type="range"
                min="-180"
                max="180"
                step="5"
                value={params.thetaDeg}
                onChange={(e) => setParams((p) => ({ ...p, thetaDeg: parseInt(e.target.value, 10) }))}
                className="w-full accent-[#D97706] cursor-pointer"
              />
              <div className="mt-1 flex flex-wrap gap-1">
                {[0, 45, 90, 180].map((deg) => (
                  <button
                    key={deg}
                    type="button"
                    onClick={() => setParams((p) => ({ ...p, thetaDeg: deg }))}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono border cursor-pointer ${
                      params.thetaDeg === deg
                        ? 'bg-[#1A1917] text-white border-[#1A1917] font-bold'
                        : 'bg-[#FAF9F6] border-[#E6E4DD] text-[#585651] hover:text-[#1A1917]'
                    }`}
                  >
                    {deg === 0 ? '0° Lock' : deg === 90 ? '90° Null' : `${deg}°`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] mb-0.5">
                <label htmlFor="dsb-df" className="text-[#585651] font-medium">
                  Freq Offset (Δf)
                </label>
                <span className="font-mono font-bold text-[#D97706] tabular-nums">
                  {params.freqOffset > 0 ? `+${params.freqOffset.toFixed(1)}` : params.freqOffset.toFixed(1)} Hz
                </span>
              </div>
              <input
                id="dsb-df"
                type="range"
                min="-2.0"
                max="2.0"
                step="0.1"
                value={params.freqOffset}
                onChange={(e) => setParams((p) => ({ ...p, freqOffset: parseFloat(e.target.value) }))}
                className="w-full accent-[#D97706] cursor-pointer"
              />
            </div>

            <label className="flex items-center justify-between p-2 rounded border border-[#E6E4DD] bg-[#FAF9F6] text-[11px] font-mono cursor-pointer select-none">
              <span className="text-[#585651] font-medium">Show TX Reference Wave</span>
              <input
                type="checkbox"
                checked={showCarrierRefOverlay}
                onChange={(e) => setShowCarrierRefOverlay(e.target.checked)}
                className="accent-[#D97706] rounded"
              />
            </label>
          </div>
        )}

        {/* STAGE 5: Demodulated & Low-Pass Filter Controls + Visual Filter Gate */}
        {activeStageFilter === 5 && (
          <div className="pt-2.5 border-t border-[#E6E4DD] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#1A1917] flex items-center gap-1.5">
                <span className="font-mono text-[#059669]">05</span>
                <span>Demodulated & LPF</span>
              </span>
              <label className="flex items-center gap-1 text-[11px] font-mono cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={params.lpfEnabled}
                  onChange={(e) => setParams((p) => ({ ...p, lpfEnabled: e.target.checked }))}
                  className="accent-[#059669] rounded"
                />
                <span className="text-[#585651] font-semibold">
                  {params.lpfEnabled ? 'LPF Active' : 'Bypassed'}
                </span>
              </label>
            </div>

            {/* Visual Low-Pass Filter Gate Card */}
            <div className="p-2 rounded border border-[#E6E4DD] bg-[#FAF9F6] space-y-1.5 text-[10px] font-mono">
              <div className="flex items-center justify-between">
                <span className="text-[#059669] font-semibold">Message ({params.fm.toFixed(1)}Hz)</span>
                <span
                  className={`px-1.5 py-0.5 rounded font-bold ${
                    !params.lpfEnabled || params.lpfCutoff >= params.fm
                      ? 'bg-[#ECFDF5] text-[#059669]'
                      : 'bg-[#FEF2F2] text-[#DC2626]'
                  }`}
                >
                  {!params.lpfEnabled || params.lpfCutoff >= params.fm ? 'PASSES' : 'CUT OFF!'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#7C3AED] font-semibold">2fc Ripple ({2 * params.fc}Hz)</span>
                <span
                  className={`px-1.5 py-0.5 rounded font-bold ${
                    params.lpfEnabled && params.lpfCutoff < 2 * params.fc * 0.7
                      ? 'bg-[#ECFDF5] text-[#059669]'
                      : 'bg-[#F5F3FF] text-[#7C3AED]'
                  }`}
                >
                  {params.lpfEnabled && params.lpfCutoff < 2 * params.fc * 0.7 ? 'FILTERED OUT' : 'LEAKING!'}
                </span>
              </div>
            </div>

            {params.lpfEnabled && (
              <div>
                <div className="flex items-center justify-between text-[11px] mb-0.5">
                  <label htmlFor="dsb-lpf" className="text-[#585651] font-medium">
                    LPF Cutoff (f_cut)
                  </label>
                  <span className="font-mono font-bold text-[#059669] tabular-nums">
                    {params.lpfCutoff} Hz
                  </span>
                </div>
                <input
                  id="dsb-lpf"
                  type="range"
                  min="1"
                  max="40"
                  step="1"
                  value={params.lpfCutoff}
                  onChange={(e) => setParams((p) => ({ ...p, lpfCutoff: parseInt(e.target.value, 10) }))}
                  className="w-full accent-[#059669] cursor-pointer"
                />
                <div className="flex justify-between text-[9.5px] font-mono text-[#8A8882]">
                  <span>Strict (1Hz)</span>
                  <span>Wide (40Hz)</span>
                </div>
              </div>
            )}

            <label className="flex items-start justify-between gap-2 p-2 rounded border border-[#E6E4DD] bg-[#FAF9F6] cursor-pointer select-none">
              <div>
                <div className="text-[11px] font-mono text-[#1A1917] font-semibold">Pre-LPF v(t) Ripple</div>
                <div className="text-[10px] text-[#75736E]">Purple wave shows raw signal before smoothing</div>
              </div>
              <input
                type="checkbox"
                checked={showPreLpfOverlay}
                onChange={(e) => setShowPreLpfOverlay(e.target.checked)}
                className="accent-[#7C3AED] rounded mt-0.5"
              />
            </label>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setCanvasViewMode('oscilloscope')}
                className={`py-1.5 rounded border text-[11px] font-mono font-semibold cursor-pointer transition-colors ${
                  canvasViewMode === 'oscilloscope'
                    ? 'bg-[#1A1917] text-white border-[#1A1917]'
                    : 'bg-[#FAF9F6] border-[#E6E4DD] text-[#585651] hover:text-[#1A1917]'
                }`}
              >
                Recovered m̂(t)
              </button>
              <button
                type="button"
                onClick={() => setCanvasViewMode('spectrum')}
                className={`py-1.5 rounded border text-[11px] font-mono font-semibold cursor-pointer transition-colors ${
                  canvasViewMode === 'spectrum'
                    ? 'bg-[#1A1917] text-white border-[#1A1917]'
                    : 'bg-[#FAF9F6] border-[#E6E4DD] text-[#585651] hover:text-[#1A1917]'
                }`}
              >
                LPF Spectrum
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Compact Live Analytical Metrics HUD */}
      <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-3 shadow-xs">
        <div className="text-[10px] font-mono uppercase tracking-wider text-[#75736E] mb-2 font-semibold flex items-center gap-1.5">
          <Zap className="w-3 h-3 text-[#C85A32]" />
          <span>DSB-SC Telemetry</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono tabular-nums">
          <div className="p-2 bg-white rounded border border-[#E6E4DD]">
            <div className="text-[9px] text-[#8A8882]">EFFICIENCY</div>
            <div className="font-bold text-[#059669]">100.0%</div>
          </div>
          <div className="p-2 bg-white rounded border border-[#E6E4DD]">
            <div className="text-[9px] text-[#8A8882]">CARRIER SPIKE</div>
            <div className="font-bold text-[#C85A32]">0.00 V</div>
          </div>
          <div className="p-2 bg-white rounded border border-[#E6E4DD]">
            <div className="text-[9px] text-[#8A8882]">BANDWIDTH</div>
            <div className="font-bold text-[#1A1917]">{sim.bandwidthHz.toFixed(1)} Hz</div>
          </div>
          <div className="p-2 bg-white rounded border border-[#E6E4DD]">
            <div className="text-[9px] text-[#8A8882]">RECOVERY RMSE</div>
            <div className="font-bold text-[#1A1917]">{sim.rmse.toFixed(3)} V</div>
          </div>
        </div>
      </div>
    </div>
  );

  // Fullscreen Sticky Bottom Horizontal Controls Bar (Laid on the bottom in a line like Module2_Fourier)
  const renderFullscreenBottomControls = () => (
    <div className="sticky bottom-0 shrink-0 bg-white border border-[#E6E4DD] rounded-lg px-3.5 py-2.5 shadow-md z-30">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Quick Presets (Coherent Lock & Quadrature Null Only) */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => applyPreset('coherent')}
            className={`px-2.5 py-1 rounded border text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              isLocked
                ? 'bg-[#FBF4F0] border-[#C85A32] text-[#C85A32]'
                : 'bg-[#FAF9F6] border-[#E6E4DD] text-[#585651] hover:text-[#1A1917]'
            }`}
          >
            01. Coherent Lock
          </button>
          <button
            type="button"
            onClick={() => applyPreset('quadrature')}
            className={`px-2.5 py-1 rounded border text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              isQuadratureNull
                ? 'bg-[#FBF4F0] border-[#C85A32] text-[#C85A32]'
                : 'bg-[#FAF9F6] border-[#E6E4DD] text-[#585651] hover:text-[#1A1917]'
            }`}
          >
            02. Quadrature Null
          </button>
        </div>

        {/* Center: Only the active stage's specific controls laid out inline */}
        <div className="flex flex-wrap items-center gap-4">
          {activeStageFilter === 1 && (
            <>
              <div className="flex items-center gap-1">
                {(
                  [
                    { id: 'cosine', label: 'Cos' },
                    { id: 'twotone', label: '2-Tone' },
                    { id: 'triangle', label: 'Tri' },
                    { id: 'square', label: 'Rect' },
                  ] as Array<{ id: BasebandWaveform; label: string }>
                ).map((wf) => (
                  <button
                    key={wf.id}
                    type="button"
                    onClick={() => setParams((p) => ({ ...p, waveform: wf.id }))}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono border cursor-pointer transition-colors ${
                      params.waveform === wf.id
                        ? 'bg-[#1A1917] text-white border-[#1A1917] font-bold'
                        : 'bg-[#FAF9F6] border-[#E6E4DD] text-[#585651] hover:text-[#1A1917]'
                    }`}
                  >
                    {wf.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-[#0284C7] whitespace-nowrap">
                  f_m: {params.fm.toFixed(1)} Hz
                </span>
                <input
                  type="range"
                  min="0.5"
                  max="5.0"
                  step="0.1"
                  value={params.fm}
                  onChange={(e) => setParams((p) => ({ ...p, fm: parseFloat(e.target.value) }))}
                  className="w-28 sm:w-36 accent-[#0284C7] cursor-pointer"
                  aria-label="Message frequency"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-[#0284C7] whitespace-nowrap">
                  A_m: {params.Am.toFixed(1)} V
                </span>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={params.Am}
                  onChange={(e) => setParams((p) => ({ ...p, Am: parseFloat(e.target.value) }))}
                  className="w-28 sm:w-36 accent-[#0284C7] cursor-pointer"
                  aria-label="Message amplitude"
                />
              </div>
            </>
          )}

          {activeStageFilter === 2 && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-[#1A1917] whitespace-nowrap">
                  f_c: {params.fc} Hz
                </span>
                <input
                  type="range"
                  min="12"
                  max="45"
                  step="1"
                  value={params.fc}
                  onChange={(e) => setParams((p) => ({ ...p, fc: parseInt(e.target.value, 10) }))}
                  className="w-32 sm:w-40 accent-[#C85A32] cursor-pointer"
                  aria-label="Carrier frequency"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-[#1A1917] whitespace-nowrap">
                  A_c: {params.Ac.toFixed(1)} V
                </span>
                <input
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.1"
                  value={params.Ac}
                  onChange={(e) => setParams((p) => ({ ...p, Ac: parseFloat(e.target.value) }))}
                  className="w-32 sm:w-40 accent-[#C85A32] cursor-pointer"
                  aria-label="Carrier amplitude"
                />
              </div>
              <span className="text-[11px] font-mono text-[#75736E] tabular-nums">
                f_c/f_m = {(params.fc / params.fm).toFixed(1)}×
              </span>
            </>
          )}

          {activeStageFilter === 3 && (
            <>
              <label className="flex items-center gap-1.5 text-xs font-mono text-[#585651] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showModEnvelope}
                  onChange={(e) => setShowModEnvelope(e.target.checked)}
                  className="accent-[#0284C7] rounded"
                />
                <span>±Envelope</span>
              </label>
              <label className="flex items-center gap-1.5 text-xs font-mono text-[#585651] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showPhaseFlips}
                  onChange={(e) => setShowPhaseFlips(e.target.checked)}
                  className="accent-[#C85A32] rounded"
                />
                <span>180° Flips</span>
              </label>
              <div className="flex items-center gap-1 bg-[#FAF9F6] p-0.5 rounded border border-[#E6E4DD] text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => setCanvasViewMode('oscilloscope')}
                  className={`px-2.5 py-0.5 rounded cursor-pointer ${
                    canvasViewMode === 'oscilloscope' ? 'bg-[#1A1917] text-white font-semibold' : 'text-[#585651]'
                  }`}
                >
                  Time s(t)
                </button>
                <button
                  type="button"
                  onClick={() => setCanvasViewMode('spectrum')}
                  className={`px-2.5 py-0.5 rounded cursor-pointer ${
                    canvasViewMode === 'spectrum' ? 'bg-[#1A1917] text-white font-semibold' : 'text-[#585651]'
                  }`}
                >
                  Spectrum |S(f)|
                </button>
              </div>
              <span className="text-[11px] font-mono text-[#75736E] tabular-nums">
                Peak ±{(params.Am * params.Ac).toFixed(2)}V · B_T = {sim.bandwidthHz.toFixed(1)}Hz
              </span>
            </>
          )}

          {activeStageFilter === 4 && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-[#D97706] whitespace-nowrap">
                  θ: {params.thetaDeg > 0 ? `+${params.thetaDeg}` : params.thetaDeg}°
                </span>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="5"
                  value={params.thetaDeg}
                  onChange={(e) => setParams((p) => ({ ...p, thetaDeg: parseInt(e.target.value, 10) }))}
                  className="w-28 sm:w-36 accent-[#D97706] cursor-pointer"
                  aria-label="Phase error"
                />
                <div className="flex items-center gap-1">
                  {[0, 90, 180].map((deg) => (
                    <button
                      key={deg}
                      type="button"
                      onClick={() => setParams((p) => ({ ...p, thetaDeg: deg }))}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono border cursor-pointer ${
                        params.thetaDeg === deg
                          ? 'bg-[#1A1917] text-white border-[#1A1917] font-bold'
                          : 'bg-[#FAF9F6] border-[#E6E4DD] text-[#585651]'
                      }`}
                    >
                      {deg}°
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-[#D97706] whitespace-nowrap">
                  Δf: {params.freqOffset > 0 ? `+${params.freqOffset.toFixed(1)}` : params.freqOffset.toFixed(1)}Hz
                </span>
                <input
                  type="range"
                  min="-2.0"
                  max="2.0"
                  step="0.1"
                  value={params.freqOffset}
                  onChange={(e) => setParams((p) => ({ ...p, freqOffset: parseFloat(e.target.value) }))}
                  className="w-24 sm:w-32 accent-[#D97706] cursor-pointer"
                  aria-label="Frequency offset"
                />
              </div>
              <label className="flex items-center gap-1.5 text-xs font-mono text-[#585651] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showCarrierRefOverlay}
                  onChange={(e) => setShowCarrierRefOverlay(e.target.checked)}
                  className="accent-[#D97706] rounded"
                />
                <span>TX Ref</span>
              </label>
            </>
          )}

          {activeStageFilter === 5 && (
            <>
              <label className="flex items-center gap-1.5 text-xs font-mono text-[#059669] font-semibold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={params.lpfEnabled}
                  onChange={(e) => setParams((p) => ({ ...p, lpfEnabled: e.target.checked }))}
                  className="accent-[#059669] rounded"
                />
                <span>{params.lpfEnabled ? 'LPF Active' : 'LPF Bypassed'}</span>
              </label>
              {params.lpfEnabled && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold text-[#059669] whitespace-nowrap">
                    f_cut: {params.lpfCutoff} Hz
                  </span>
                  <input
                    type="range"
                    min="1"
                    max="40"
                    step="1"
                    value={params.lpfCutoff}
                    onChange={(e) => setParams((p) => ({ ...p, lpfCutoff: parseInt(e.target.value, 10) }))}
                    className="w-28 sm:w-36 accent-[#059669] cursor-pointer"
                    aria-label="LPF cutoff frequency"
                  />
                </div>
              )}
              <label className="flex items-center gap-1.5 text-xs font-mono text-[#585651] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showPreLpfOverlay}
                  onChange={(e) => setShowPreLpfOverlay(e.target.checked)}
                  className="accent-[#7C3AED] rounded"
                />
                <span>v(t) Ripple</span>
              </label>
              <div className="flex items-center gap-1 bg-[#FAF9F6] p-0.5 rounded border border-[#E6E4DD] text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => setCanvasViewMode('oscilloscope')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    canvasViewMode === 'oscilloscope' ? 'bg-[#1A1917] text-white font-semibold' : 'text-[#585651]'
                  }`}
                >
                  Time m̂(t)
                </button>
                <button
                  type="button"
                  onClick={() => setCanvasViewMode('spectrum')}
                  className={`px-2 py-0.5 rounded cursor-pointer ${
                    canvasViewMode === 'spectrum' ? 'bg-[#1A1917] text-white font-semibold' : 'text-[#585651]'
                  }`}
                >
                  Spectrum |V(f)|
                </button>
              </div>
            </>
          )}
        </div>

        {/* Right: Compact Telemetry & Reset */}
        <div className="flex items-center gap-2.5 text-[11px] font-mono">
          <span className="text-[#75736E] tabular-nums">
            RMSE: <strong className="text-[#1A1917]">{sim.rmse.toFixed(3)}V</strong>
          </span>
          <button
            type="button"
            onClick={handleResetParameters}
            className="px-2 py-1 rounded border border-[#E6E4DD] bg-[#FAF9F6] text-[#585651] hover:text-[#C85A32] cursor-pointer flex items-center gap-1"
            title="Reset parameters"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>
    </div>
  );

  // Shared Oscilloscope & Spectrum View (Compact normal mode vs full-height fullscreen canvas)
  const renderSimulationStages = (fullscreenMode: boolean) => (
    <div className={`flex flex-col gap-3 ${fullscreenMode ? 'flex-1 min-h-0' : ''}`}>
      {/* Normal View: Compact Toolbar + 5-Stage Selector (No All-5 option) */}
      {!fullscreenMode && (
        <div className="bg-white rounded-lg border border-[#E6E4DD] px-3.5 py-2.5 shadow-xs space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <ModuleGlyph id="dsb-sc" className="w-4 h-4" accent={true} />
              <span className="text-xs font-bold tracking-tight text-[#1A1917] uppercase font-mono">
                DSB-SC Signal Workbench
              </span>
              <span className="text-[11px] font-mono text-[#75736E]">
                fc={params.fc}Hz · fm={params.fm.toFixed(1)}Hz · θ={params.thetaDeg}°
              </span>
            </div>

            <SimulationToolbar
              playbackState={playbackState}
              onPlay={() => setPlaybackState('playing')}
              onPause={handlePauseSimulation}
              onReset={handleResetSimulation}
              speed={speed}
              onSpeedChange={setSpeed}
              isGridVisible={isGridVisible}
              onToggleGrid={() => setIsGridVisible(!isGridVisible)}
              isFullscreen={false}
              onToggleFullscreen={() => setIsFullscreen(true)}
              isLiveSimulationReady={true}
            />
          </div>

          {/* 5 Sequential Stage Selector Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-[#F0EFEA] text-[11px] font-mono">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 1 as const, label: '01 m(t)' },
                { id: 2 as const, label: '02 c(t)' },
                { id: 3 as const, label: '03 s(t)' },
                { id: 4 as const, label: '04 LO crx(t)' },
                { id: 5 as const, label: '05 LPF m̂(t)' },
              ].map((st, idx) => (
                <React.Fragment key={st.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectStage(st.id)}
                    className={`px-2 py-1 rounded border transition-colors cursor-pointer whitespace-nowrap ${
                      activeStageFilter === st.id
                        ? 'bg-[#1A1917] text-white border-[#1A1917] font-bold'
                        : 'bg-[#FAF9F6] text-[#585651] border-[#E6E4DD] hover:text-[#1A1917]'
                    }`}
                  >
                    {st.label}
                  </button>
                  {idx < 4 && <span className="text-[#A8A69E] hidden sm:inline">→</span>}
                </React.Fragment>
              ))}
            </div>

            {(isQuadratureNull || isFreqDrifting || isPhaseInverted || !params.lpfEnabled) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#FBF4F0] border border-[#C85A32]/30 text-[#C85A32] font-semibold">
                <AlertTriangle className="w-3 h-3 shrink-0" />
                <span>
                  {isQuadratureNull
                    ? 'Quadrature Null (cos 90° = 0)'
                    : isFreqDrifting
                    ? `Beat Drift (Δf=${params.freqOffset.toFixed(1)}Hz)`
                    : isPhaseInverted
                    ? 'Inverted Recovery'
                    : 'LPF Bypassed (2fc Leak)'}
                </span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* UNIFIED OSCILLOSCOPE / SPECTRUM CANVAS CARD */}
      <div
        className={`bg-white rounded-lg border border-[#E6E4DD] p-3 sm:p-4 shadow-xs flex flex-col gap-2.5 ${
          fullscreenMode ? 'flex-1 min-h-0' : ''
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E6E4DD] shrink-0">
          <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-mono text-[#585651]">
            <span className="font-bold text-[#1A1917] uppercase tracking-wide flex items-center gap-1.5">
              {isLocked ? (
                <Lock className="w-3.5 h-3.5 text-[#059669]" />
              ) : (
                <Unlock className="w-3.5 h-3.5 text-[#D97706]" />
              )}
              <span>
                {canvasViewMode === 'spectrum'
                  ? 'Frequency Spectrum |S(f)| & |V(f)|'
                  : activeStageFilter === 1
                  ? '01. Modulating Signal m(t)'
                  : activeStageFilter === 2
                  ? '02. Carrier Signal c(t)'
                  : activeStageFilter === 3
                  ? '03. DSB-SC Modulated Signal s(t)'
                  : activeStageFilter === 4
                  ? '04. Receiver Local Oscillator crx(t)'
                  : '05. Demodulated & LPF Output m̂(t)'}
              </span>
            </span>
          </div>

          {(activeStageFilter === 3 || activeStageFilter === 5) && (
            <div className="flex items-center gap-1 bg-[#FAF9F6] p-0.5 rounded border border-[#E6E4DD] text-[11px] font-mono">
              <button
                type="button"
                onClick={() => setCanvasViewMode('oscilloscope')}
                className={`px-2.5 py-0.5 rounded cursor-pointer transition-colors ${
                  canvasViewMode === 'oscilloscope'
                    ? 'bg-[#1A1917] text-white font-semibold'
                    : 'text-[#585651] hover:text-[#1A1917]'
                }`}
              >
                Time Trace
              </button>
              <button
                type="button"
                onClick={() => setCanvasViewMode('spectrum')}
                className={`px-2.5 py-0.5 rounded cursor-pointer transition-colors ${
                  canvasViewMode === 'spectrum'
                    ? 'bg-[#1A1917] text-white font-semibold'
                    : 'text-[#585651] hover:text-[#1A1917]'
                }`}
              >
                Spectrum
              </button>
            </div>
          )}
        </div>

        {/* Single Unified Canvas */}
        <HighDpiCanvas
          heightClass={fullscreenMode ? 'flex-1 min-h-0' : 'h-[340px] sm:h-[380px]'}
          renderCanvas={drawUnifiedCanvas}
          deps={[
            sim,
            params,
            isGridVisible,
            showModEnvelope,
            showPhaseFlips,
            showCarrierRefOverlay,
            showPreLpfOverlay,
            activeStageFilter,
            canvasViewMode,
          ]}
          registerLivePainter={registerLivePainter}
          ariaLabel="DSB-SC active signal oscilloscope and spectrum canvas"
        />

        {/* Compact Legend & Live Readout Footer */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-[11px] font-mono text-[#75736E] shrink-0">
          {canvasViewMode === 'oscilloscope' ? (
            <>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                {activeStageFilter === 1 && <span className="text-[#0284C7] font-semibold">— m(t) ({params.waveform})</span>}
                {activeStageFilter === 2 && <span className="text-[#64748B] font-semibold">— c(t) ({params.fc} Hz)</span>}
                {activeStageFilter === 3 && (
                  <>
                    <span className="text-[#C85A32] font-semibold">— s(t) = m(t)·c(t)</span>
                    {showModEnvelope && <span className="text-[#0284C7]">- - ±Envelope</span>}
                  </>
                )}
                {activeStageFilter === 4 && (
                  <>
                    <span className="text-[#D97706] font-semibold">— c_rx(t) (θ={params.thetaDeg}°)</span>
                    {showCarrierRefOverlay && <span className="text-[#75736E]">- - TX Ref</span>}
                  </>
                )}
                {activeStageFilter === 5 && (
                  <>
                    <span className="text-[#059669] font-semibold">— Recovered m̂(t)</span>
                    {showPreLpfOverlay && <span className="text-[#7C3AED]">— Pre-LPF v(t)</span>}
                    <span className="text-[#64748B]">- - Target Ac·m(t)</span>
                  </>
                )}
              </div>
              <div className="flex items-center gap-3 tabular-nums">
                <span className="text-[#C85A32]">{sim.zeroCrossings.length} flips</span>
                <span>
                  RMSE: <strong className="text-[#1A1917]">{sim.rmse.toFixed(3)} V</strong>
                </span>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <span className="text-[#0284C7] font-semibold">● LSB ({(params.fc - params.fm).toFixed(1)}Hz)</span>
                <span className="text-[#C85A32] font-semibold">● USB ({(params.fc + params.fm).toFixed(1)}Hz)</span>
                <span className="text-[#059669] font-semibold">● Baseband & LPF</span>
                <span className="text-[#7C3AED] font-semibold">● 2fc ({2 * params.fc}Hz)</span>
              </div>
              <div className="tabular-nums">
                B_T = <strong className="text-[#1A1917]">{sim.bandwidthHz.toFixed(1)} Hz</strong> · Carrier = <strong className="text-[#C85A32]">0.00 V</strong>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Beginner Visual Guide Banner (Normal Mode only, tailored per chosen stage) */}
      {!fullscreenMode && (
        <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-3 text-xs text-[#585651] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="space-y-0.5">
            <div className="font-mono text-[10.5px] font-bold uppercase tracking-wider text-[#C85A32]">
              {activeStageFilter === 1
                ? 'Beginner Guide · 01 Message Signal m(t)'
                : activeStageFilter === 2
                ? 'Beginner Guide · 02 Carrier Signal c(t)'
                : activeStageFilter === 3
                ? 'Beginner Guide · 03 DSB-SC Modulated Wave s(t)'
                : activeStageFilter === 4
                ? 'Beginner Guide · 04 Receiver Local Oscillator'
                : 'Beginner Guide · 05 Demodulated Output & Filter'}
            </div>
            <p className="leading-snug text-[#484642]">
              {activeStageFilter === 1
                ? 'This slow wave is your original sound or data. Notice the orange dots at 0V—every time the wave crosses zero, the radio carrier will flip upside down in Stage 03.'
                : activeStageFilter === 2
                ? 'A fast, steady radio wave that carries your slow message through the air. Try raising fc on the right to pack more cycles into each second.'
                : activeStageFilter === 3
                ? 'Your message multiplied by the carrier. Notice how the outer blue outline traces your message, and the wave flips 180° at each orange dot—switch to Spectrum to see the suppressed carrier!'
                : activeStageFilter === 4
                ? 'The receiver generates its own carrier wave to unlock the message. Watch the Phase Compass on the right: at 0° the waves align; at 90° they cancel completely.'
                : 'Multiplying at the receiver creates your clean green message plus purple high-frequency 2fc buzz. The Low-Pass Filter blocks the purple buzz and keeps your clean message.'}
            </p>
          </div>
          {activeStageFilter < 5 && (
            <button
              type="button"
              onClick={() => handleSelectStage((activeStageFilter + 1) as 1 | 2 | 3 | 4 | 5)}
              className="px-2.5 py-1.5 rounded border border-[#E6E4DD] bg-white hover:border-[#C85A32]/40 text-[11px] font-mono font-semibold text-[#1A1917] whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1"
            >
              <span>Next Stage 0{activeStageFilter + 1}</span>
              <ArrowRight className="w-3 h-3 text-[#C85A32]" />
            </button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        {/* 1. Compact Module Header Bar with Next/Prev Navigation */}
        <div className="pb-4 border-b border-[#E6E4DD] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-mono font-bold tracking-wider text-[#C85A32] bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/25">
                MODULE 2.2
              </span>
              <span className="text-xs text-[#75736E] font-medium font-mono">{subTopic.tag}</span>
              <span className="text-xs text-[#A8A69E]" aria-hidden="true">·</span>
              <span className="text-xs font-mono font-semibold text-[#1A1917]">
                {receiverStatusLabel}
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1917]">
              {subTopic.name}
            </h1>
          </div>

          {/* Previous / Next Module Navigation */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => onNavigateModule(prevMod.path)}
              className="px-3 py-1.5 border border-[#E6E4DD] hover:bg-[#FAF9F6] text-xs font-medium text-[#585651] hover:text-[#1A1917] rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap"
              title={`Previous: ${prevMod.name}`}
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Prev: CAM ({prevMod.index})</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateModule(nextMod.path)}
              className="px-3 py-1.5 border border-[#E6E4DD] hover:bg-[#FAF9F6] text-xs font-semibold text-[#1A1917] hover:border-[#C85A32]/40 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap"
              title={`Next: ${nextMod.name}`}
            >
              <span>Next: SSB ({nextMod.index})</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* DSB-SC Mode Switcher Tabs: Signal Oscilloscope vs Audio Sound Lab */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div
            role="tablist"
            aria-label="DSB-SC lab mode"
            className="inline-flex items-center bg-[#F6F4EE] border border-[#E6E4DD] rounded-md p-1 gap-1"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeLabTab === 'oscilloscope'}
              onClick={() => setActiveLabTab('oscilloscope')}
              className={`px-3 py-1.5 rounded text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeLabTab === 'oscilloscope'
                  ? 'bg-white text-[#1A1917] border border-[#E6E4DD] shadow-2xs'
                  : 'text-[#65635E] hover:text-[#1A1917]'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-[#C85A32]" />
              <span>01. Signal Oscilloscope</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeLabTab === 'audio'}
              onClick={() => {
                handlePauseSimulation();
                setIsFullscreen(false);
                setActiveLabTab('audio');
              }}
              className={`px-3 py-1.5 rounded text-xs font-mono font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                activeLabTab === 'audio'
                  ? 'bg-white text-[#1A1917] border border-[#E6E4DD] shadow-2xs'
                  : 'text-[#65635E] hover:text-[#1A1917]'
              }`}
            >
              <AudioLines className="w-3.5 h-3.5 text-[#C85A32]" />
              <span>02. Audio Sound Lab</span>
            </button>
          </div>
        </div>

        {/* 2. Tab Content: Signal Oscilloscope OR Audio Sound Lab */}
        {activeLabTab === 'oscilloscope' ? (
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left Panel: Active Signal Canvas */}
            <div className="lg:col-span-8">
              {renderSimulationStages(false)}
            </div>

            {/* Right Sidebar: Compact Sticky Stage-Specific Controls & Telemetry */}
            <div className="lg:col-span-4 lg:sticky lg:top-4">
              {renderControlsSidebar()}
            </div>
          </div>
        ) : (
          <DsbScAudioLab
            isFullscreen={isFullscreen}
            onToggleFullscreen={setIsFullscreen}
            onSwitchToOscilloscope={() => setActiveLabTab('oscilloscope')}
          />
        )}

        {/* 3. Lower Section: Analytical Formulation & Curricular Concepts (Aligned with Module2_Fourier) */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card 1: Analytical Formulation */}
          <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-5 shadow-xs space-y-3">
            <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] flex items-center gap-1.5 font-semibold">
              <BookOpen className="w-3.5 h-3.5 text-[#585651]" />
              <span>Analytical Formulation</span>
            </div>

            <div>
              <div className="text-xs text-[#585651] mb-1 font-medium">
                1. Modulation Product & Sideband Expansion
              </div>
              <div className="p-2.5 bg-white rounded border border-[#E6E4DD] text-xs font-semibold text-[#1A1917] overflow-x-auto">
                <MathView
                  math="s(t) = A_c m(t)\cos(2\pi f_c t) = \frac{A_c A_m}{2}\cos[2\pi(f_c - f_m)t] + \frac{A_c A_m}{2}\cos[2\pi(f_c + f_m)t]"
                  displayMode={true}
                />
              </div>
            </div>

            <div>
              <div className="text-xs text-[#585651] mb-1 font-medium">
                2. Coherent Product Demodulation & LPF Recovery
              </div>
              <div className="p-2.5 bg-white rounded border border-[#E6E4DD] text-xs font-semibold text-[#1A1917] overflow-x-auto">
                <MathView
                  math="\hat{m}(t) = \text{LPF}\!\left\{2 s(t)\cos\!\big(2\pi(f_c+\Delta f)t + \theta\big)\right\} = A_c m(t)\cos(2\pi \Delta f t + \theta)"
                  displayMode={true}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Key Physical Insights */}
          <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-5 shadow-xs space-y-2.5">
            <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] flex items-center gap-1.5 font-semibold">
              <Activity className="w-3.5 h-3.5 text-[#C85A32]" />
              <span>Key Physical Principles</span>
            </div>

            <div className="p-3 bg-white rounded border border-[#E6E4DD] text-xs text-[#585651] leading-relaxed">
              <strong className="text-[#1A1917] block mb-0.5">180° Zero-Crossing Phase Flip</strong>
              Because <code className="font-mono text-[#1A1917]">s(t)</code> multiplies <code className="font-mono text-[#1A1917]">m(t)</code> directly without a DC carrier offset, every sign reversal of <code className="font-mono text-[#1A1917]">m(t)</code> flips the carrier polarity by π radians, preventing simple diode envelope detection.
            </div>

            <div className="p-3 bg-white rounded border border-[#E6E4DD] text-xs text-[#585651] leading-relaxed">
              <strong className="text-[#1A1917] block mb-0.5">Quadrature Null Effect (θ = ±90°)</strong>
              Coherent demodulation scales the recovered message by <code className="font-mono text-[#1A1917]">cos(θ)</code>. At <code className="font-mono text-[#1A1917]">θ = 90°</code>, the local oscillator becomes orthogonal to the incoming carrier and the recovered signal vanishes completely.
            </div>
          </div>

          {/* Card 3: Curricular Topics */}
          <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-5 shadow-xs">
            <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-3 flex items-center gap-1.5 font-semibold">
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
              <li className="flex items-start gap-2 text-xs text-[#484642] leading-snug">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#C85A32] shrink-0 mt-0.5" />
                <span>Synchronous Product Detection, 2fc Harmonic Filtering & Costas Loop Sensitivity</span>
              </li>
            </ul>

            <div className="mt-4 pt-3 border-t border-[#E6E4DD] flex items-start gap-2 text-[11px] text-[#75736E]">
              <Info className="w-3.5 h-3.5 text-[#C85A32] shrink-0 mt-0.5" />
              <span>Use hotkeys <kbd className="font-mono bg-white border border-[#E6E4DD] px-1 rounded">P</kbd> Play, <kbd className="font-mono bg-white border border-[#E6E4DD] px-1 rounded">H</kbd> Pause, and <kbd className="font-mono bg-white border border-[#E6E4DD] px-1 rounded">[</kbd> / <kbd className="font-mono bg-white border border-[#E6E4DD] px-1 rounded">]</kbd> to switch modules.</span>
            </div>
          </div>
        </div>
      </div>

      {/* FULLSCREEN IMMERSIVE LAB VIEW (Aligned with Module2_Fourier Fullscreen Layout) */}
      {isFullscreen && activeLabTab === 'oscilloscope' && (
        <div className="fixed inset-0 z-50 bg-[#FAF9F6] flex flex-col p-4 sm:p-5 overflow-hidden">
          {/* Fullscreen Header Strip: Single-Line Title + Mode Switcher + Stage Dropdown + Player Controls + Exit Fullscreen */}
          <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E6E4DD] shrink-0 whitespace-nowrap overflow-x-auto">
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1.5 shrink-0">
                <Radio className="w-4 h-4 text-[#C85A32] shrink-0" />
                <span className="text-sm font-bold text-[#1A1917]">
                  <span className="hidden xl:inline">Module 2.2: </span>DSB-SC Lab
                </span>
              </div>

              {/* Mode Switcher inside Fullscreen Header (Signal Oscilloscope <-> Audio Sound Lab) */}
              <div className="inline-flex items-center bg-[#EFECE5] border border-[#E6E4DD] rounded p-0.5 gap-0.5 text-[11px] font-mono shrink-0">
                <button
                  type="button"
                  className="px-2 py-1 rounded font-semibold bg-white text-[#1A1917] border border-[#E6E4DD] shadow-2xs flex items-center gap-1 cursor-default"
                >
                  <Activity className="w-3 h-3 text-[#C85A32]" />
                  <span>01 Signal</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handlePauseSimulation();
                    setActiveLabTab('audio');
                  }}
                  className="px-2 py-1 rounded font-semibold text-[#585651] hover:text-[#1A1917] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <AudioLines className="w-3 h-3 text-[#C85A32]" />
                  <span>02 Audio</span>
                </button>
              </div>

              {/* Stage Dropdown */}
              <label className="flex items-center gap-1.5 bg-white border border-[#E6E4DD] rounded px-2 py-1 shadow-2xs shrink-0">
                <span className="text-[10px] font-mono uppercase font-semibold text-[#75736E]">
                  Trace
                </span>
                <select
                  aria-label="Select oscilloscope trace stage"
                  value={activeStageFilter}
                  onChange={(e) => handleSelectStage(Number(e.target.value) as 1 | 2 | 3 | 4 | 5)}
                  className="bg-transparent text-[11px] font-mono font-semibold text-[#1A1917] focus:outline-none cursor-pointer"
                >
                  <option value={1}>01 m(t) — Modulating</option>
                  <option value={2}>02 c(t) — Carrier</option>
                  <option value={3}>03 s(t) — DSB-SC</option>
                  <option value={4}>04 LO — Receiver LO</option>
                  <option value={5}>05 m̂(t) — Demodulated</option>
                </select>
              </label>
            </div>

            {/* Player Controls right next to Exit Fullscreen */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (playbackState === 'playing') handlePauseSimulation();
                  else setPlaybackState('playing');
                }}
                className="px-2.5 py-1 bg-white border border-[#E6E4DD] rounded text-xs font-semibold text-[#1A1917] hover:bg-[#FAF9F6] flex items-center gap-1.5 cursor-pointer shadow-2xs shrink-0"
                title={playbackState === 'playing' ? 'Pause simulation (Hotkey: H)' : 'Play simulation (Hotkey: P)'}
              >
                {playbackState === 'playing' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{playbackState === 'playing' ? 'Pause' : 'Play'}</span>
                <kbd className="hidden md:inline-block font-mono text-[9px] bg-[#FAF9F6] border border-[#E6E4DD] px-1 rounded text-[#75736E]">
                  {playbackState === 'playing' ? 'H' : 'P'}
                </kbd>
              </button>

              <button
                type="button"
                onClick={handleResetSimulation}
                className="p-1.5 bg-white border border-[#E6E4DD] rounded text-[#585651] hover:text-[#1A1917] cursor-pointer shadow-2xs shrink-0"
                title="Reset simulation"
                aria-label="Reset simulation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <label className="flex items-center gap-1 bg-white border border-[#E6E4DD] rounded px-2 py-1 shadow-2xs shrink-0">
                <span className="text-[10px] font-mono text-[#75736E] uppercase font-semibold">
                  Speed
                </span>
                <select
                  aria-label="Simulation playback speed"
                  value={speed}
                  onChange={(e) => setSpeed(e.target.value)}
                  className="bg-transparent text-[11px] font-mono font-semibold text-[#1A1917] focus:outline-none cursor-pointer"
                >
                  <option value="0.25×">0.25×</option>
                  <option value="0.5×">0.5×</option>
                  <option value="1×">1×</option>
                  <option value="2×">2×</option>
                  <option value="4×">4×</option>
                </select>
              </label>

              <button
                type="button"
                onClick={() => setIsGridVisible(!isGridVisible)}
                className={`px-2 py-1 rounded text-xs font-medium border flex items-center gap-1 cursor-pointer shadow-2xs transition-colors shrink-0 ${
                  isGridVisible
                    ? 'bg-[#FBF4F0] border-[#C85A32]/40 text-[#C85A32] font-semibold'
                    : 'bg-white border-[#E6E4DD] text-[#65635E] hover:text-[#1A1917]'
                }`}
                title={isGridVisible ? 'Hide grid' : 'Show grid'}
              >
                <Grid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Grid</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="px-2.5 py-1 bg-[#1A1917] text-white rounded text-xs font-semibold hover:bg-[#2C2A26] flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                title="Exit Fullscreen (Esc)"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Exit Fullscreen</span>
              </button>
            </div>
          </div>

          {/* Fullscreen Body: Full-Screen Signal Window Above + Sticky Horizontal Controls Docked on Bottom (Like Module2_Fourier) */}
          <div className="flex-1 min-h-0 my-3 overflow-hidden flex flex-col">
            {renderSimulationStages(true)}
          </div>

          {renderFullscreenBottomControls()}
        </div>
      )}
    </div>
  );
};
