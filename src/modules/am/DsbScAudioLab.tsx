import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Volume2,
  Play,
  Pause,
  Square,
  Upload,
  SlidersHorizontal,
  RotateCcw,
  Radio,
  AlertTriangle,
  Lock,
  Unlock,
  AudioLines,
  Mic,
  MicOff,
  Maximize2,
  Minimize2,
  Activity,
} from 'lucide-react';
import {
  AudioProbeStage,
  AudioSourceType,
  DecodedAudioInfo,
  DsbScAudioEngine,
  DsbScAudioParams,
  decodeUploadedAudioFile,
} from './dsbscAudioEngine';

const DEFAULT_AUDIO_PARAMS: DsbScAudioParams = {
  sourceType: 'voice',
  probeStage: 'coherent',
  fcAudio: 2800,
  thetaDeg: 0,
  freqOffsetHz: 0,
  lpfEnabled: true,
  lpfCutoffHz: 2200,
  noiseLevel: 0,
  volume: 0.75,
};

export interface DsbScAudioLabProps {
  isFullscreen?: boolean;
  onToggleFullscreen?: (next: boolean) => void;
  onSwitchToOscilloscope?: () => void;
}

export const DsbScAudioLab: React.FC<DsbScAudioLabProps> = ({
  isFullscreen: controlledFullscreen,
  onToggleFullscreen,
  onSwitchToOscilloscope,
}) => {
  const [params, setParams] = useState<DsbScAudioParams>(DEFAULT_AUDIO_PARAMS);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [uploadedAudio, setUploadedAudio] = useState<DecodedAudioInfo | null>(null);
  const [micAudio, setMicAudio] = useState<DecodedAudioInfo | null>(null);
  const [isRecordingMic, setIsRecordingMic] = useState<boolean>(false);
  const [micRms, setMicRms] = useState<number>(0);
  const [micElapsed, setMicElapsed] = useState<number>(0);
  const [isDecoding, setIsDecoding] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [micError, setMicError] = useState<string | null>(null);
  const [internalFullscreen, setInternalFullscreen] = useState<boolean>(false);

  const isFullscreen = controlledFullscreen !== undefined ? controlledFullscreen : internalFullscreen;
  const setIsFullscreen = useCallback(
    (next: boolean) => {
      if (onToggleFullscreen) onToggleFullscreen(next);
      else setInternalFullscreen(next);
    },
    [onToggleFullscreen]
  );

  const engineRef = useRef<DsbScAudioEngine | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const autoStopTimerRef = useRef<number | null>(null);
  const paramsRef = useRef<DsbScAudioParams>(params);
  paramsRef.current = params;
  const isRecordingMicRef = useRef<boolean>(isRecordingMic);
  isRecordingMicRef.current = isRecordingMic;

  const activeSampledAudio = params.sourceType === 'mic' ? micAudio : uploadedAudio;

  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = new DsbScAudioEngine();
    }
    return engineRef.current;
  }, []);

  // Cleanup Web Audio context and mic stream on unmount / tab switch
  useEffect(() => {
    return () => {
      if (autoStopTimerRef.current) window.clearTimeout(autoStopTimerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (engineRef.current) {
        engineRef.current.dispose();
        engineRef.current = null;
      }
    };
  }, []);

  // Rebuild buffer when DSP synthesis params change (debounce lightly when playing for smooth slider drags)
  useEffect(() => {
    const engine = getEngine();
    const sampled = params.sourceType === 'mic' ? micAudio : uploadedAudio;
    const timer = window.setTimeout(() => {
      engine.prepareBuffer(params, sampled);
      paintCanvas();
    }, isPlaying ? 35 : 0);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    params.sourceType,
    params.probeStage,
    params.fcAudio,
    params.thetaDeg,
    params.freqOffsetHz,
    params.noiseLevel,
    uploadedAudio,
    micAudio,
    getEngine,
  ]);

  // Live zero-restart Biquad LPF + Master Gain updates
  useEffect(() => {
    const engine = getEngine();
    engine.applyLiveFilterAndGain(params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.lpfEnabled, params.lpfCutoffHz, params.volume, params.probeStage, getEngine]);

  const paintCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (w === 0 || h === 0) return;

    const targetW = Math.round(w * dpr);
    const targetH = Math.round(h * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);

    const engine = getEngine();
    const recording = isRecordingMicRef.current;
    const micTelemetry = recording ? engine.readMicTelemetry() : null;
    const telemetry = engine.readLiveTelemetry();
    const activeParams = paramsRef.current;

    const padL = 48;
    const padR = 14;
    const padT = 22;
    const gapY = 30;
    const padB = 22;
    const plotW = Math.max(80, w - padL - padR);
    const panelH = Math.max(85, (h - padT - padB - gapY) / 2);

    // --- TOP PANEL: Audio Waveform (Time Domain) ---
    const waveTop = padT;
    const waveMidY = waveTop + panelH / 2;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(padL, waveTop, plotW, panelH);
    ctx.strokeStyle = '#E6E4DD';
    ctx.lineWidth = 1;
    ctx.strokeRect(padL, waveTop, plotW, panelH);

    // Gridlines
    ctx.strokeStyle = '#F0EFEA';
    ctx.setLineDash([3, 3]);
    for (let i = 1; i < 6; i++) {
      const x = padL + (i / 6) * plotW;
      ctx.beginPath();
      ctx.moveTo(x, waveTop);
      ctx.lineTo(x, waveTop + panelH);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // 0V center baseline
    ctx.strokeStyle = '#D5D2C9';
    ctx.beginPath();
    ctx.moveTo(padL, waveMidY);
    ctx.lineTo(padL + plotW, waveMidY);
    ctx.stroke();

    ctx.fillStyle = '#1A1917';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    const stageColor = recording
      ? '#DC2626'
      : activeParams.probeStage === 'original'
      ? '#0284C7'
      : activeParams.probeStage === 'dsbsc'
      ? '#C85A32'
      : activeParams.probeStage === 'envelope'
      ? '#DC2626'
      : '#059669';

    ctx.fillText(
      recording
        ? 'LIVE MICROPHONE INPUT — Speak Now to Record Your Voice'
        : telemetry.isPlaying
        ? 'LIVE AUDIO OSCILLOSCOPE — Real-Time Acoustic Output'
        : 'AUDIO WAVEFORM PREVIEW — Press Play Audio to Audition',
      padL,
      waveTop - 7
    );

    ctx.fillStyle = '#8A8882';
    ctx.font = '9.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText('+1.0', padL - 5, waveTop + 10);
    ctx.fillText('0.0', padL - 5, waveMidY + 3);
    ctx.fillText('-1.0', padL - 5, waveTop + panelH - 3);

    const td = micTelemetry ? micTelemetry.timeDomain : telemetry.timeDomain;
    const nTd = td.length;
    if (nTd > 1) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(padL, waveTop, plotW, panelH);
      ctx.clip();

      ctx.strokeStyle = stageColor;
      ctx.lineWidth = 1.85;
      ctx.beginPath();
      const yScale = panelH * (recording ? 0.65 : 0.44);
      const stride = nTd > 1024 ? 2 : 1;
      for (let i = 0; i < nTd; i += stride) {
        const x = padL + (i / (nTd - 1)) * plotW;
        const y = waveMidY - td[i] * yScale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();
    }

    // --- BOTTOM PANEL: Live Audio FFT Spectrum (0 Hz to 7000 Hz) ---
    const specTop = waveTop + panelH + gapY;
    const specBaseY = specTop + panelH;
    const maxDisplayHz = 7000;

    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(padL, specTop, plotW, panelH);
    ctx.strokeStyle = '#E6E4DD';
    ctx.lineWidth = 1;
    ctx.strokeRect(padL, specTop, plotW, panelH);

    ctx.fillStyle = '#1A1917';
    ctx.font = 'bold 10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(
      `LIVE AUDIO SPECTRUM (0 – 7 kHz) · fc=${activeParams.fcAudio}Hz · LPF=${
        activeParams.lpfEnabled ? `${activeParams.lpfCutoffHz}Hz` : 'Bypassed'
      }`,
      padL,
      specTop - 7
    );

    const freqToX = (hz: number) => padL + Math.min(1, Math.max(0, hz / maxDisplayHz)) * plotW;

    // LPF passband shading when active on coherent or envelope stage
    if (
      activeParams.lpfEnabled &&
      (activeParams.probeStage === 'coherent' || activeParams.probeStage === 'envelope')
    ) {
      const cutX = freqToX(activeParams.lpfCutoffHz);
      ctx.fillStyle = 'rgba(5, 150, 105, 0.08)';
      ctx.fillRect(padL, specTop, Math.max(0, cutX - padL), panelH);

      ctx.strokeStyle = '#059669';
      ctx.lineWidth = 1.4;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(cutX, specTop);
      ctx.lineTo(cutX, specBaseY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = '#059669';
      ctx.font = 'bold 9px "JetBrains Mono", monospace';
      ctx.fillText(`LPF ${activeParams.lpfCutoffHz}Hz`, Math.min(cutX + 4, padL + plotW - 68), specTop + 12);
    }

    // Carrier marker fc & 2fc reference guides
    const fcX = freqToX(activeParams.fcAudio);
    ctx.strokeStyle = 'rgba(200, 90, 50, 0.45)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(fcX, specTop);
    ctx.lineTo(fcX, specBaseY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#C85A32';
    ctx.font = 'bold 8.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`fc=${activeParams.fcAudio}`, fcX, specTop + 11);

    const twoFc = 2 * activeParams.fcAudio;
    if (twoFc <= maxDisplayHz) {
      const twoFcX = freqToX(twoFc);
      ctx.strokeStyle = 'rgba(124, 58, 237, 0.45)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(twoFcX, specTop);
      ctx.lineTo(twoFcX, specBaseY);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#7C3AED';
      ctx.fillText(`2fc=${twoFc}`, twoFcX - 10, specTop + 11);
    }

    // FFT bars
    if (telemetry.isPlaying) {
      const fd = telemetry.freqDomain;
      const nyquist = telemetry.sampleRate / 2;
      const maxBin = Math.min(fd.length - 1, Math.floor((maxDisplayHz / nyquist) * fd.length));

      ctx.fillStyle = stageColor;
      const barCount = 120;
      const barW = Math.max(1.5, plotW / barCount - 1);
      for (let b = 0; b < barCount; b++) {
        const binStart = Math.floor((b / barCount) * maxBin);
        const binEnd = Math.max(binStart + 1, Math.floor(((b + 1) / barCount) * maxBin));
        let peak = 0;
        for (let k = binStart; k < binEnd; k++) {
          if (fd[k] > peak) peak = fd[k];
        }
        const barH = (peak / 255) * (panelH - 6);
        const x = padL + (b / barCount) * plotW;
        ctx.fillRect(x, specBaseY - barH, barW, barH);
      }
    } else {
      ctx.fillStyle = '#8A8882';
      ctx.font = '10px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('Press Play Audio to inspect live FFT spectrum', padL + plotW / 2, specTop + panelH / 2 + 4);
    }

    // X-axis frequency ticks
    ctx.fillStyle = '#75736E';
    ctx.font = '9.5px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    for (let hz = 0; hz <= maxDisplayHz; hz += 1000) {
      const x = freqToX(hz);
      ctx.fillText(hz === 0 ? '0 Hz' : `${hz / 1000}k`, x, h - 5);
    }

    ctx.fillStyle = '#8A8882';
    ctx.textAlign = 'right';
    ctx.fillText('dB', padL - 5, specTop + 10);
    ctx.fillText('0', padL - 5, specBaseY + 3);

    ctx.restore();
  }, [getEngine]);

  // 60fps Canvas Loop while Audio is Playing OR Microphone is Recording
  useEffect(() => {
    if (isPlaying || isRecordingMic) {
      const loop = () => {
        if (isRecordingMicRef.current) {
          const micStats = getEngine().readMicTelemetry();
          setMicRms(micStats.rmsLevel);
          setMicElapsed(micStats.elapsedSec);
        }
        paintCanvas();
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } else {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      paintCanvas();
    }
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isPlaying, isRecordingMic, paintCanvas, getEngine]);

  // Esc exits Audio Lab fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFullscreen, setIsFullscreen]);

  // Resize listener for canvas (re-attaches cleanly on normal <-> fullscreen switch)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    paintCanvas();
    const obs = new ResizeObserver(() => paintCanvas());
    obs.observe(canvas);
    return () => obs.disconnect();
  }, [paintCanvas, isFullscreen]);

  const handlePlayPause = () => {
    if (isRecordingMic) return;
    const engine = getEngine();
    if (isPlaying) {
      engine.pause();
      setIsPlaying(false);
    } else {
      engine.prepareBuffer(params, activeSampledAudio);
      engine.play();
      setIsPlaying(true);
    }
  };

  const handleStop = () => {
    const engine = getEngine();
    engine.stop();
    setIsPlaying(false);
  };

  const handleStopMicRecording = useCallback(async () => {
    if (autoStopTimerRef.current) {
      window.clearTimeout(autoStopTimerRef.current);
      autoStopTimerRef.current = null;
    }
    const engine = getEngine();
    setIsRecordingMic(false);
    setIsDecoding(true);
    try {
      const info = await engine.stopMicRecording();
      setMicAudio(info);
      const nextParams: DsbScAudioParams = { ...paramsRef.current, sourceType: 'mic' };
      setParams(nextParams);
      engine.prepareBuffer(nextParams, info);
      engine.play();
      setIsPlaying(true);
    } catch (err) {
      setMicError(err instanceof Error ? err.message : 'Could not save microphone audio.');
    } finally {
      setIsDecoding(false);
      setMicRms(0);
      setMicElapsed(0);
    }
  }, [getEngine]);

  const handleStartMicRecording = async () => {
    setMicError(null);
    setUploadError(null);
    const engine = getEngine();
    if (isPlaying) {
      engine.stop();
      setIsPlaying(false);
    }
    try {
      await engine.startMicRecording();
      setMicRms(0);
      setMicElapsed(0);
      setIsRecordingMic(true);
      autoStopTimerRef.current = window.setTimeout(() => {
        void handleStopMicRecording();
      }, 8000);
    } catch (err) {
      setIsRecordingMic(false);
      setMicError(
        err instanceof Error
          ? err.message
          : 'Microphone permission denied or no microphone found.'
      );
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsDecoding(true);
    setUploadError(null);
    setMicError(null);
    try {
      const info = await decodeUploadedAudioFile(file);
      setUploadedAudio(info);
      getEngine().resetPlayhead();
      setParams((p) => ({ ...p, sourceType: 'upload' }));
    } catch {
      setUploadError('Could not decode audio file. Try .wav, .mp3, or .ogg.');
    } finally {
      setIsDecoding(false);
      e.target.value = '';
    }
  };

  const applyAudioPreset = (preset: 'coherent' | 'quadrature' | 'beat' | 'shift' | 'diodeFail') => {
    if (preset === 'coherent') {
      setParams((p) => ({
        ...p,
        probeStage: 'coherent',
        thetaDeg: 0,
        freqOffsetHz: 0,
        lpfEnabled: true,
        lpfCutoffHz: 2200,
      }));
    } else if (preset === 'quadrature') {
      setParams((p) => ({
        ...p,
        probeStage: 'coherent',
        thetaDeg: 90,
        freqOffsetHz: 0,
        lpfEnabled: true,
      }));
    } else if (preset === 'beat') {
      setParams((p) => ({
        ...p,
        probeStage: 'coherent',
        thetaDeg: 0,
        freqOffsetHz: 2,
        lpfEnabled: true,
        lpfCutoffHz: 2200,
      }));
    } else if (preset === 'shift') {
      setParams((p) => ({
        ...p,
        probeStage: 'coherent',
        thetaDeg: 0,
        freqOffsetHz: 85,
        lpfEnabled: true,
        lpfCutoffHz: 2500,
      }));
    } else if (preset === 'diodeFail') {
      setParams((p) => ({
        ...p,
        probeStage: 'envelope',
        lpfEnabled: true,
        lpfCutoffHz: 2200,
      }));
    }
  };

  const cosTheta = Math.cos((params.thetaDeg * Math.PI) / 180);
  const isLocked =
    params.probeStage === 'coherent' &&
    Math.abs(params.thetaDeg) <= 3 &&
    Math.abs(params.freqOffsetHz) < 0.5 &&
    params.lpfEnabled;
  const isQuadratureNull =
    params.probeStage === 'coherent' &&
    Math.abs(Math.abs(params.thetaDeg) - 90) <= 5 &&
    Math.abs(params.freqOffsetHz) < 0.5;

  const acousticStatusText =
    params.probeStage === 'original'
      ? 'Clean Reference Message m(t) — Unmodulated baseband audio'
      : params.probeStage === 'dsbsc'
      ? `TX Suppressed-Carrier s(t) around ${params.fcAudio} Hz — Notice silence during speech pauses`
      : params.probeStage === 'envelope'
      ? 'Non-Coherent Envelope |s(t)| — Full-wave rectification mangles DSB-SC!'
      : !params.lpfEnabled
      ? `LPF Bypassed — Baseband plus high-frequency 2fc (${2 * params.fcAudio} Hz) image leaking`
      : isQuadratureNull
      ? 'Quadrature Null (θ = ±90°) — Recovered audio canceled to silence'
      : Math.abs(params.freqOffsetHz) >= 15
      ? `Frequency Shift Δf = ${params.freqOffsetHz > 0 ? '+' : ''}${params.freqOffsetHz} Hz — Sidebands detuned ("Donald Duck" effect)`
      : Math.abs(params.freqOffsetHz) >= 0.5
      ? `Slow Beat Drift Δf = ${params.freqOffsetHz.toFixed(1)} Hz — Periodic cos(2πΔft) loudness fading`
      : isLocked
      ? 'Coherent Lock (θ = 0°, Δf = 0 Hz) — Crystal-clear synchronous recovery'
      : `Phase Attenuation (θ = ${params.thetaDeg}°) — Volume scaled by cos θ = ${cosTheta.toFixed(2)}`;

  const renderAudioCanvasCard = (fullscreenMode: boolean) => (
    <div
      className={`bg-white rounded-lg border border-[#E6E4DD] p-3 sm:p-4 shadow-xs flex flex-col gap-2.5 ${
        fullscreenMode ? 'flex-1 min-h-0' : ''
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E6E4DD] shrink-0">
        <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-[#1A1917]">
          {params.probeStage === 'coherent' && isLocked ? (
            <Lock className="w-3.5 h-3.5 text-[#059669]" />
          ) : params.probeStage === 'envelope' || isQuadratureNull || !params.lpfEnabled ? (
            <AlertTriangle className="w-3.5 h-3.5 text-[#C85A32]" />
          ) : (
            <Unlock className="w-3.5 h-3.5 text-[#D97706]" />
          )}
          <span>{acousticStatusText}</span>
        </div>

        {params.probeStage === 'coherent' && (
          <span className="text-[11px] font-mono text-[#75736E] tabular-nums">
            cos(θ) = <strong className="text-[#1A1917]">{cosTheta.toFixed(2)}</strong>
          </span>
        )}
      </div>

      <div
        className={`relative w-full bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden ${
          fullscreenMode ? 'flex-1 min-h-0' : 'h-[350px] sm:h-[390px]'
        }`}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block"
          aria-label="Live DSB-SC audio waveform and FFT frequency spectrum"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#75736E] shrink-0">
        <span>
          Probe:{' '}
          <strong className="text-[#1A1917]">
            {params.probeStage === 'original'
              ? 'Baseband Input m(t)'
              : params.probeStage === 'dsbsc'
              ? `Suppressed-Carrier s(t) @ ${params.fcAudio}Hz`
              : params.probeStage === 'envelope'
              ? 'Non-Coherent Rectified |s(t)|'
              : 'Synchronous Multiplier + 4th-Order Butterworth LPF'}
          </strong>
        </span>
        <span className="tabular-nums">
          θ={params.thetaDeg}° · Δf={params.freqOffsetHz > 0 ? `+${params.freqOffsetHz}` : params.freqOffsetHz}Hz
        </span>
      </div>
    </div>
  );

  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-[#FAF9F6] flex flex-col p-4 sm:p-5 overflow-hidden">
        {/* Hidden shared file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Fullscreen Top Header Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E6E4DD] shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <AudioLines className="w-4 h-4 text-[#C85A32]" />
              <span className="text-sm font-bold text-[#1A1917]">
                Module 2.2: Audio Lab
              </span>
            </div>

            {/* Mode Switcher inside Fullscreen Header (Signal Oscilloscope <-> Audio Sound Lab) */}
            {onSwitchToOscilloscope && (
              <div className="inline-flex items-center bg-[#EFECE5] border border-[#E6E4DD] rounded p-0.5 gap-0.5 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={onSwitchToOscilloscope}
                  className="px-2 py-1 rounded font-semibold text-[#585651] hover:text-[#1A1917] flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Activity className="w-3 h-3 text-[#C85A32]" />
                  <span>01 Signal</span>
                </button>
                <button
                  type="button"
                  className="px-2 py-1 rounded font-semibold bg-white text-[#1A1917] border border-[#E6E4DD] shadow-2xs flex items-center gap-1 cursor-default"
                >
                  <AudioLines className="w-3 h-3 text-[#C85A32]" />
                  <span>02 Audio</span>
                </button>
              </div>
            )}

            {/* Compact Listen Probe Switcher inside Header */}
            <div className="flex items-center flex-wrap gap-1 bg-white p-0.5 rounded border border-[#E6E4DD] text-[11px] font-mono shadow-2xs">
              {(
                [
                  { id: 'original', label: '01 m(t)', activeCls: 'bg-[#0284C7] text-white' },
                  { id: 'dsbsc', label: '03 s(t)', activeCls: 'bg-[#C85A32] text-white' },
                  { id: 'envelope', label: 'Diode Fail', activeCls: 'bg-[#DC2626] text-white' },
                  { id: 'coherent', label: '05 m̂(t)', activeCls: 'bg-[#059669] text-white' },
                ] as Array<{ id: AudioProbeStage; label: string; activeCls: string }>
              ).map((probe) => (
                <button
                  key={probe.id}
                  type="button"
                  onClick={() => setParams((p) => ({ ...p, probeStage: probe.id }))}
                  className={`px-2 py-1 rounded font-semibold cursor-pointer transition-colors ${
                    params.probeStage === probe.id
                      ? probe.activeCls
                      : 'text-[#585651] hover:text-[#1A1917]'
                  }`}
                >
                  {probe.label}
                </button>
              ))}
            </div>
          </div>

          {/* Right Header: Mic Record, Play/Pause, Stop, Reset, Volume, Exit Fullscreen */}
          <div className="flex flex-wrap items-center gap-2">
            {isRecordingMic ? (
              <button
                type="button"
                onClick={() => void handleStopMicRecording()}
                className="px-2.5 py-1 bg-[#DC2626] text-white rounded text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer"
              >
                <MicOff className="w-3.5 h-3.5" />
                <span>Stop Mic ({micElapsed.toFixed(1)}s)</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleStartMicRecording()}
                disabled={isDecoding}
                className="px-2.5 py-1 bg-[#FBF4F0] border border-[#C85A32]/40 text-[#C85A32] hover:bg-[#C85A32] hover:text-white rounded text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>{micAudio ? 'Re-record Mic' : 'Record Mic'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePlayPause}
              className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                isPlaying
                  ? 'bg-[#C85A32] text-white hover:bg-[#B24E29]'
                  : 'bg-white border border-[#E6E4DD] text-[#1A1917] hover:bg-[#FAF9F6]'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            <button
              type="button"
              onClick={handleStop}
              className="p-1.5 bg-white border border-[#E6E4DD] rounded text-[#585651] hover:text-[#1A1917] cursor-pointer shadow-2xs"
              title="Stop audio"
              aria-label="Stop audio"
            >
              <Square className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setParams(DEFAULT_AUDIO_PARAMS)}
              className="px-2.5 py-1 bg-white border border-[#E6E4DD] rounded text-xs font-mono text-[#585651] hover:text-[#C85A32] cursor-pointer shadow-2xs flex items-center gap-1"
              title="Reset Audio Lab parameters"
              aria-label="Reset Audio Lab parameters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            <div className="flex items-center gap-1.5 bg-white border border-[#E6E4DD] rounded px-2 py-1 shadow-2xs">
              <Volume2 className="w-3.5 h-3.5 text-[#585651]" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={params.volume}
                onChange={(e) => setParams((p) => ({ ...p, volume: parseFloat(e.target.value) }))}
                className="w-14 accent-[#1A1917] cursor-pointer"
                aria-label="Master audio volume"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              className="px-3 py-1 bg-[#1A1917] text-white rounded text-xs font-semibold hover:bg-[#2C2A26] flex items-center gap-1.5 cursor-pointer shadow-xs"
              title="Exit Fullscreen (Esc)"
            >
              <Minimize2 className="w-3.5 h-3.5" />
              <span>Exit Fullscreen</span>
            </button>
          </div>
        </div>

        {/* Fullscreen Body: Full-Screen Audio Waveform + Live FFT Spectrum */}
        <div className="flex-1 min-h-0 my-3 overflow-hidden flex flex-col">
          {renderAudioCanvasCard(true)}
        </div>

        {/* Fullscreen Sticky Bottom Horizontal Controls Bar */}
        <div className="sticky bottom-0 shrink-0 bg-white border border-[#E6E4DD] rounded-lg px-3.5 py-2.5 shadow-md z-30">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Left: Source Picker + Upload */}
            <div className="flex flex-wrap items-center gap-1">
              {(
                [
                  { id: 'voice', label: 'Voice' },
                  { id: 'mic', label: 'Mic' },
                  { id: 'chord', label: 'Chord' },
                  { id: 'tone', label: 'Tone' },
                  { id: 'upload', label: 'File' },
                ] as Array<{ id: AudioSourceType; label: string }>
              ).map((src) => (
                <button
                  key={src.id}
                  type="button"
                  onClick={() => {
                    if (src.id === 'upload' && !uploadedAudio) {
                      fileInputRef.current?.click();
                    } else if (src.id === 'mic' && !micAudio && !isRecordingMic) {
                      void handleStartMicRecording();
                    } else {
                      getEngine().resetPlayhead();
                      setParams((p) => ({ ...p, sourceType: src.id }));
                    }
                  }}
                  className={`px-2 py-1 rounded text-[11px] font-mono border cursor-pointer transition-colors ${
                    params.sourceType === src.id
                      ? 'bg-[#1A1917] text-white border-[#1A1917] font-bold'
                      : 'bg-[#FAF9F6] border-[#E6E4DD] text-[#585651] hover:text-[#1A1917]'
                  }`}
                >
                  {src.label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isDecoding || isRecordingMic}
                className="px-2 py-1 rounded text-[11px] font-mono border border-dashed border-[#D5D2C9] bg-[#FAF9F6] text-[#585651] hover:text-[#C85A32] flex items-center gap-1 cursor-pointer"
                title="Upload custom audio file"
              >
                <Upload className="w-3 h-3 text-[#C85A32]" />
                <span>Upload</span>
              </button>
            </div>

            {/* Center: Quick Presets + Inline Sliders */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => applyAudioPreset('coherent')}
                  className={`px-2 py-1 rounded border text-[11px] font-semibold cursor-pointer ${
                    isLocked
                      ? 'bg-[#FBF4F0] border-[#C85A32] text-[#C85A32]'
                      : 'bg-[#FAF9F6] border-[#E6E4DD] text-[#585651]'
                  }`}
                >
                  Lock
                </button>
                <button
                  type="button"
                  onClick={() => applyAudioPreset('quadrature')}
                  className={`px-2 py-1 rounded border text-[11px] font-semibold cursor-pointer ${
                    isQuadratureNull
                      ? 'bg-[#FBF4F0] border-[#C85A32] text-[#C85A32]'
                      : 'bg-[#FAF9F6] border-[#E6E4DD] text-[#585651]'
                  }`}
                >
                  90° Null
                </button>
                <button
                  type="button"
                  onClick={() => applyAudioPreset('shift')}
                  className={`px-2 py-1 rounded border text-[11px] font-semibold cursor-pointer ${
                    params.probeStage === 'coherent' && params.freqOffsetHz === 85
                      ? 'bg-[#FBF4F0] border-[#C85A32] text-[#C85A32]'
                      : 'bg-[#FAF9F6] border-[#E6E4DD] text-[#585651]'
                  }`}
                >
                  Pitch Shift
                </button>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono font-bold text-[#D97706] whitespace-nowrap">
                  θ: {params.thetaDeg}°
                </span>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="5"
                  value={params.thetaDeg}
                  onChange={(e) => setParams((p) => ({ ...p, thetaDeg: parseInt(e.target.value, 10) }))}
                  className="w-24 accent-[#D97706] cursor-pointer"
                  aria-label="Phase error"
                />
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono font-bold text-[#C85A32] whitespace-nowrap">
                  Δf: {params.freqOffsetHz > 0 ? `+${params.freqOffsetHz}` : params.freqOffsetHz}Hz
                </span>
                <input
                  type="range"
                  min="-250"
                  max="250"
                  step="1"
                  value={params.freqOffsetHz}
                  onChange={(e) => setParams((p) => ({ ...p, freqOffsetHz: parseInt(e.target.value, 10) }))}
                  className="w-24 accent-[#C85A32] cursor-pointer"
                  aria-label="Frequency offset"
                />
              </div>

              <label className="flex items-center gap-1 text-xs font-mono text-[#059669] font-semibold cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={params.lpfEnabled}
                  onChange={(e) => setParams((p) => ({ ...p, lpfEnabled: e.target.checked }))}
                  className="accent-[#059669] rounded"
                />
                <span>LPF</span>
              </label>

              {params.lpfEnabled && (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-mono font-bold text-[#059669] whitespace-nowrap">
                    {params.lpfCutoffHz}Hz
                  </span>
                  <input
                    type="range"
                    min="300"
                    max="6000"
                    step="50"
                    value={params.lpfCutoffHz}
                    onChange={(e) => setParams((p) => ({ ...p, lpfCutoffHz: parseInt(e.target.value, 10) }))}
                    className="w-24 accent-[#059669] cursor-pointer"
                    aria-label="LPF cutoff"
                  />
                </div>
              )}

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono font-bold text-[#585651] whitespace-nowrap">
                  Noise: {Math.round(params.noiseLevel * 100)}%
                </span>
                <input
                  type="range"
                  min="0"
                  max="0.35"
                  step="0.01"
                  value={params.noiseLevel}
                  onChange={(e) => setParams((p) => ({ ...p, noiseLevel: parseFloat(e.target.value) }))}
                  className="w-20 accent-[#585651] cursor-pointer"
                  aria-label="Channel noise"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* LEFT PANEL: Live Audio Monitor, Stage Probe Bar & Waveform/FFT Canvas */}
      <div className="lg:col-span-8 flex flex-col gap-3">
        {/* Top Audio Transport & Probe Switcher Bar */}
        <div className="bg-white rounded-lg border border-[#E6E4DD] px-3.5 py-2.5 shadow-xs space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AudioLines className="w-4 h-4 text-[#C85A32]" />
              <span className="text-xs font-bold tracking-tight text-[#1A1917] uppercase font-mono">
                DSB-SC Acoustic Sound Lab
              </span>
              <span className="text-[11px] font-mono text-[#75736E] hidden sm:inline">
                {params.sourceType === 'mic' && micAudio
                  ? micAudio.name
                  : params.sourceType === 'upload' && uploadedAudio
                  ? uploadedAudio.name
                  : params.sourceType.toUpperCase()}
              </span>
            </div>

            {/* Play / Pause / Stop + Volume + Fullscreen */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handlePlayPause}
                className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                  isPlaying
                    ? 'bg-[#C85A32] text-white hover:bg-[#B24E29]'
                    : 'bg-[#1A1917] text-white hover:bg-[#2C2A26]'
                }`}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? 'Pause Audio' : 'Play Audio'}</span>
              </button>

              <button
                type="button"
                onClick={handleStop}
                className="px-2.5 py-1.5 bg-[#FAF9F6] border border-[#E6E4DD] rounded text-xs font-medium text-[#585651] hover:text-[#1A1917] flex items-center gap-1 cursor-pointer"
                title="Stop and rewind to start"
              >
                <Square className="w-3 h-3" />
                <span>Stop</span>
              </button>

              <div className="flex items-center gap-1.5 bg-[#FAF9F6] border border-[#E6E4DD] rounded px-2 py-1">
                <Volume2 className="w-3.5 h-3.5 text-[#585651]" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.02"
                  value={params.volume}
                  onChange={(e) => setParams((p) => ({ ...p, volume: parseFloat(e.target.value) }))}
                  className="w-16 accent-[#1A1917] cursor-pointer"
                  aria-label="Master audio volume"
                />
              </div>

              <button
                type="button"
                onClick={() => setIsFullscreen(true)}
                className="p-1.5 bg-[#FAF9F6] border border-[#E6E4DD] rounded text-[#585651] hover:text-[#1A1917] cursor-pointer"
                title="Fullscreen Audio Sound Lab"
                aria-label="Fullscreen Audio Sound Lab"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Listen Probe Stage Bar (Instant Live A/B Switching) */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#F0EFEA] text-[11px] font-mono">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase tracking-wider text-[#75736E] font-semibold mr-1">
                Listen To:
              </span>
              {(
                [
                  { id: 'original', label: '01 Original m(t)', activeCls: 'bg-[#0284C7] text-white border-[#0284C7]' },
                  { id: 'dsbsc', label: '03 TX DSB-SC s(t)', activeCls: 'bg-[#C85A32] text-white border-[#C85A32]' },
                  { id: 'envelope', label: 'Diode |s(t)| (Fails)', activeCls: 'bg-[#DC2626] text-white border-[#DC2626]' },
                  { id: 'coherent', label: '05 Coherent m̂(t)', activeCls: 'bg-[#059669] text-white border-[#059669]' },
                ] as Array<{ id: AudioProbeStage; label: string; activeCls: string }>
              ).map((probe) => (
                <button
                  key={probe.id}
                  type="button"
                  onClick={() => setParams((p) => ({ ...p, probeStage: probe.id }))}
                  className={`px-2.5 py-1 rounded border font-semibold transition-colors cursor-pointer ${
                    params.probeStage === probe.id
                      ? probe.activeCls
                      : 'bg-[#FAF9F6] border-[#E6E4DD] text-[#585651] hover:text-[#1A1917]'
                  }`}
                >
                  {probe.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Acoustic Canvas Card */}
        {renderAudioCanvasCard(false)}
      </div>

      {/* RIGHT SIDEBAR: Sound Source, Quick Experiments & Receiver Parameters */}
      <div className="lg:col-span-4 lg:sticky lg:top-4 space-y-3">
        <div className="bg-white rounded-lg border border-[#E6E4DD] p-3.5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E6E4DD]">
            <span className="text-xs font-mono uppercase tracking-wider text-[#1A1917] font-bold flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-[#C85A32]" />
              <span>Audio Lab Controls</span>
            </span>
            <button
              type="button"
              onClick={() => setParams(DEFAULT_AUDIO_PARAMS)}
              className="text-[11px] font-mono text-[#75736E] hover:text-[#C85A32] transition-colors flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          </div>

          {/* 1. Audio Source Selector, Microphone Voice Capture & Upload */}
          <div>
            <label className="block text-[10px] font-mono uppercase tracking-wider text-[#75736E] font-semibold mb-1.5">
              Input Audio Source m(t)
            </label>
            <div className="grid grid-cols-5 gap-1">
              {(
                [
                  { id: 'voice', label: 'Voice' },
                  { id: 'mic', label: 'Mic' },
                  { id: 'chord', label: 'Chord' },
                  { id: 'tone', label: 'Tone' },
                  { id: 'upload', label: 'File' },
                ] as Array<{ id: AudioSourceType; label: string }>
              ).map((src) => (
                <button
                  key={src.id}
                  type="button"
                  onClick={() => {
                    if (src.id === 'upload' && !uploadedAudio) {
                      fileInputRef.current?.click();
                    } else if (src.id === 'mic' && !micAudio && !isRecordingMic) {
                      void handleStartMicRecording();
                    } else {
                      getEngine().resetPlayhead();
                      setParams((p) => ({ ...p, sourceType: src.id }));
                    }
                  }}
                  className={`py-1.5 rounded text-[11px] font-mono border transition-colors cursor-pointer ${
                    params.sourceType === src.id
                      ? 'bg-[#1A1917] text-white border-[#1A1917] font-bold'
                      : 'bg-[#FAF9F6] border-[#E6E4DD] text-[#585651] hover:text-[#1A1917]'
                  }`}
                >
                  {src.label}
                </button>
              ))}
            </div>

            {/* Microphone Voice Capture Box */}
            <div className="mt-2 p-2.5 rounded-md border border-[#E6E4DD] bg-[#FAF9F6] space-y-2">
              <div className="flex items-center justify-between text-[10.5px] font-mono">
                <span className="font-semibold text-[#1A1917] flex items-center gap-1.5">
                  <Mic className={`w-3.5 h-3.5 ${isRecordingMic ? 'text-[#DC2626]' : 'text-[#C85A32]'}`} />
                  <span>Microphone Voice</span>
                </span>
                {isRecordingMic ? (
                  <span className="text-[#DC2626] font-bold tabular-nums">
                    REC {micElapsed.toFixed(1)}s / 8.0s
                  </span>
                ) : micAudio ? (
                  <span className="text-[#059669] font-semibold truncate max-w-[130px]">
                    {micAudio.name}
                  </span>
                ) : (
                  <span className="text-[#8A8882]">Up to 8s</span>
                )}
              </div>

              {isRecordingMic && (
                <div className="h-1.5 w-full bg-[#E6E4DD] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#DC2626] transition-all duration-75"
                    style={{ width: `${Math.round(micRms * 100)}%` }}
                  />
                </div>
              )}

              <div className="flex gap-1.5">
                {isRecordingMic ? (
                  <button
                    type="button"
                    onClick={() => void handleStopMicRecording()}
                    className="flex-1 py-1.5 px-2.5 rounded bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[11px] font-mono font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <MicOff className="w-3.5 h-3.5" />
                    <span>Stop & Test My Voice</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void handleStartMicRecording()}
                    disabled={isDecoding}
                    className="flex-1 py-1.5 px-2.5 rounded border border-[#C85A32]/40 bg-[#FBF4F0] hover:bg-[#C85A32] hover:text-white text-[#C85A32] text-[11px] font-mono font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Mic className="w-3.5 h-3.5" />
                    <span>{micAudio ? 'Re-record Voice' : 'Record from Microphone'}</span>
                  </button>
                )}
              </div>
              {micError && <p className="text-[10.5px] font-mono text-[#DC2626]">{micError}</p>}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isDecoding || isRecordingMic}
              className="mt-2 w-full py-1.5 px-2.5 rounded border border-dashed border-[#D5D2C9] bg-[#FAF9F6] hover:bg-white hover:border-[#C85A32]/50 text-[11px] font-mono text-[#585651] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-[#C85A32] shrink-0" />
              <span className="truncate">
                {isDecoding
                  ? 'Processing audio...'
                  : uploadedAudio
                  ? `Loaded: ${uploadedAudio.name} (Change)`
                  : 'Upload Audio (.wav / .mp3 / .ogg)'}
              </span>
            </button>
            {uploadError && <p className="mt-1 text-[10.5px] font-mono text-[#DC2626]">{uploadError}</p>}
          </div>

          {/* 2. Quick Listening Experiments */}
          <div className="pt-2.5 border-t border-[#E6E4DD]">
            <label className="block text-[10px] font-mono uppercase tracking-wider text-[#75736E] font-semibold mb-1.5">
              Quick Sound Tests
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => applyAudioPreset('coherent')}
                className={`px-2 py-1.5 rounded border text-[11px] font-semibold text-left transition-colors cursor-pointer truncate ${
                  isLocked
                    ? 'bg-[#FBF4F0] border-[#C85A32] text-[#C85A32]'
                    : 'bg-[#FAF9F6] border-[#E6E4DD] text-[#585651] hover:text-[#1A1917]'
                }`}
              >
                01. Coherent Lock
              </button>
              <button
                type="button"
                onClick={() => applyAudioPreset('quadrature')}
                className={`px-2 py-1.5 rounded border text-[11px] font-semibold text-left transition-colors cursor-pointer truncate ${
                  isQuadratureNull
                    ? 'bg-[#FBF4F0] border-[#C85A32] text-[#C85A32]'
                    : 'bg-[#FAF9F6] border-[#E6E4DD] text-[#585651] hover:text-[#1A1917]'
                }`}
              >
                02. Quadrature Null
              </button>
              <button
                type="button"
                onClick={() => applyAudioPreset('beat')}
                className={`px-2 py-1.5 rounded border text-[11px] font-semibold text-left transition-colors cursor-pointer truncate ${
                  params.probeStage === 'coherent' && params.freqOffsetHz === 2
                    ? 'bg-[#FBF4F0] border-[#C85A32] text-[#C85A32]'
                    : 'bg-[#FAF9F6] border-[#E6E4DD] text-[#585651] hover:text-[#1A1917]'
                }`}
              >
                03. 2Hz Beat Fade
              </button>
              <button
                type="button"
                onClick={() => applyAudioPreset('shift')}
                className={`px-2 py-1.5 rounded border text-[11px] font-semibold text-left transition-colors cursor-pointer truncate ${
                  params.probeStage === 'coherent' && params.freqOffsetHz === 85
                    ? 'bg-[#FBF4F0] border-[#C85A32] text-[#C85A32]'
                    : 'bg-[#FAF9F6] border-[#E6E4DD] text-[#585651] hover:text-[#1A1917]'
                }`}
              >
                04. Pitch Shift (Δf)
              </button>
              <button
                type="button"
                onClick={() => applyAudioPreset('diodeFail')}
                className={`col-span-2 px-2 py-1.5 rounded border text-[11px] font-semibold text-left transition-colors cursor-pointer flex items-center justify-between ${
                  params.probeStage === 'envelope'
                    ? 'bg-[#FEF2F2] border-[#DC2626] text-[#DC2626]'
                    : 'bg-[#FAF9F6] border-[#E6E4DD] text-[#585651] hover:text-[#1A1917]'
                }`}
              >
                <span>05. Diode Envelope Detector (Hear Why It Fails)</span>
                <Radio className="w-3 h-3 shrink-0" />
              </button>
            </div>
          </div>

          {/* 3. Receiver Synchronization & Filter Controls */}
          <div className="pt-2.5 border-t border-[#E6E4DD] space-y-2.5">
            <div>
              <div className="flex items-center justify-between text-[11px] mb-0.5">
                <label htmlFor="audio-theta" className="text-[#585651] font-medium">
                  LO Phase Error (θ)
                </label>
                <span className="font-mono font-bold text-[#D97706] tabular-nums">
                  {params.thetaDeg > 0 ? `+${params.thetaDeg}` : params.thetaDeg}°
                </span>
              </div>
              <input
                id="audio-theta"
                type="range"
                min="-180"
                max="180"
                step="5"
                value={params.thetaDeg}
                onChange={(e) => setParams((p) => ({ ...p, thetaDeg: parseInt(e.target.value, 10) }))}
                className="w-full accent-[#D97706] cursor-pointer"
              />
              <div className="mt-1 flex gap-1">
                {[0, 45, 90, 180].map((deg) => (
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
                    {deg === 0 ? '0° Lock' : deg === 90 ? '90° Null' : `${deg}°`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] mb-0.5">
                <label htmlFor="audio-df" className="text-[#585651] font-medium">
                  LO Freq Offset (Δf)
                </label>
                <span className="font-mono font-bold text-[#C85A32] tabular-nums">
                  {params.freqOffsetHz > 0 ? `+${params.freqOffsetHz}` : params.freqOffsetHz} Hz
                </span>
              </div>
              <input
                id="audio-df"
                type="range"
                min="-250"
                max="250"
                step="1"
                value={params.freqOffsetHz}
                onChange={(e) => setParams((p) => ({ ...p, freqOffsetHz: parseInt(e.target.value, 10) }))}
                className="w-full accent-[#C85A32] cursor-pointer"
              />
              <div className="mt-1 flex gap-1">
                {[0, 2, 40, 120].map((df) => (
                  <button
                    key={df}
                    type="button"
                    onClick={() => setParams((p) => ({ ...p, freqOffsetHz: df }))}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono border cursor-pointer ${
                      params.freqOffsetHz === df
                        ? 'bg-[#1A1917] text-white border-[#1A1917] font-bold'
                        : 'bg-[#FAF9F6] border-[#E6E4DD] text-[#585651]'
                    }`}
                  >
                    {df === 0 ? '0 Hz' : `+${df} Hz`}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] mb-0.5">
                <label htmlFor="audio-fc" className="text-[#585651] font-medium">
                  Audible Carrier (f_c)
                </label>
                <span className="font-mono font-bold text-[#1A1917] tabular-nums">{params.fcAudio} Hz</span>
              </div>
              <input
                id="audio-fc"
                type="range"
                min="1500"
                max="4500"
                step="100"
                value={params.fcAudio}
                onChange={(e) => setParams((p) => ({ ...p, fcAudio: parseInt(e.target.value, 10) }))}
                className="w-full accent-[#1A1917] cursor-pointer"
              />
            </div>

            <div className="pt-2 border-t border-[#F0EFEA] space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="audio-lpf" className="text-[11px] text-[#585651] font-medium">
                  Receiver LPF Cutoff
                </label>
                <label className="flex items-center gap-1 text-[11px] font-mono cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={params.lpfEnabled}
                    onChange={(e) => setParams((p) => ({ ...p, lpfEnabled: e.target.checked }))}
                    className="accent-[#059669] rounded"
                  />
                  <span className="font-semibold text-[#059669]">
                    {params.lpfEnabled ? `${params.lpfCutoffHz} Hz` : 'Bypassed'}
                  </span>
                </label>
              </div>
              {params.lpfEnabled && (
                <input
                  id="audio-lpf"
                  type="range"
                  min="300"
                  max="6000"
                  step="50"
                  value={params.lpfCutoffHz}
                  onChange={(e) => setParams((p) => ({ ...p, lpfCutoffHz: parseInt(e.target.value, 10) }))}
                  className="w-full accent-[#059669] cursor-pointer"
                />
              )}

              <div>
                <div className="flex items-center justify-between text-[11px] mb-0.5">
                  <label htmlFor="audio-noise" className="text-[#585651] font-medium">
                    Channel AWGN Noise
                  </label>
                  <span className="font-mono font-bold text-[#585651] tabular-nums">
                    {Math.round(params.noiseLevel * 100)}%
                  </span>
                </div>
                <input
                  id="audio-noise"
                  type="range"
                  min="0"
                  max="0.35"
                  step="0.01"
                  value={params.noiseLevel}
                  onChange={(e) => setParams((p) => ({ ...p, noiseLevel: parseFloat(e.target.value) }))}
                  className="w-full accent-[#585651] cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
