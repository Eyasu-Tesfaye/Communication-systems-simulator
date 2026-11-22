/**
 * SSB-SC Audio Sound Lab (Tab 02)
 * Real Web Audio API synthesis demonstrating:
 * - Original Baseband Audio m(t)
 * - Modulated SSB Signal s_USB(t) / s_LSB(t) using analytic Hilbert shifting (zero carrier tone)
 * - Coherently Demodulated Audio with LO Frequency Offset Δf ("Donald Duck" pitch shift) & Phase θ
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  AudioLines,
  Play,
  Square,
  Volume2,
  SlidersHorizontal,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { SidebandMode, computeHilbertTransform } from './ssbMathEngine';

type AudioSourceMode = 'tone' | 'chord' | 'melody';
type AudioProbeMode = 'message' | 'ssb' | 'demod';

interface SsbAudioLabProps {
  sideband: SidebandMode;
  onChangeSideband: (mode: SidebandMode) => void;
  loPhaseDeg: number;
}

const SAMPLE_RATE = 22050;
const BUFFER_DURATION = 2.0; // seconds (44100 samples; uses nearest power of 2 for FFT Hilbert)
const FFT_SIZE = 32768; // ~1.486 s exact power-of-2 coherent buffer

export const SsbAudioLab: React.FC<SsbAudioLabProps> = ({
  sideband,
  onChangeSideband,
  loPhaseDeg: initialPhaseDeg,
}) => {
  const [sourceMode, setSourceMode] = useState<AudioSourceMode>('chord');
  const [probeMode, setProbeMode] = useState<AudioProbeMode>('demod');
  const [fcAudio, setFcAudio] = useState<number>(1500);
  const [freqOffsetHz, setFreqOffsetHz] = useState<number>(0);
  const [phaseDeg, setPhaseDeg] = useState<number>(initialPhaseDeg);
  const [volume, setVolume] = useState<number>(0.5);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  // Synthesize baseband, SSB, and coherently demodulated audio buffer
  const audioData = useMemo(() => {
    const N = FFT_SIZE;
    const dur = N / SAMPLE_RATE;
    const base = new Array<number>(N);

    for (let i = 0; i < N; i++) {
      const t = i / SAMPLE_RATE;
      const env =
        Math.sin(Math.PI * Math.min(1, (t % 0.5) / 0.04)) *
        Math.exp(-2.2 * (t % 0.5));

      if (sourceMode === 'tone') {
        base[i] = 0.65 * Math.sin(2 * Math.PI * 440 * t) * (0.4 + 0.6 * env);
      } else if (sourceMode === 'chord') {
        // C major triad (261.63, 329.63, 392.00 Hz)
        base[i] =
          0.28 *
          (Math.sin(2 * Math.PI * 261.63 * t) +
            0.85 * Math.sin(2 * Math.PI * 329.63 * t) +
            0.75 * Math.sin(2 * Math.PI * 392.0 * t)) *
          (0.35 + 0.65 * env);
      } else {
        // Stepped 4-note melody over duration
        const step = Math.floor((t / dur) * 4);
        const freqs = [293.66, 329.63, 392.0, 440.0];
        const f = freqs[step % freqs.length];
        base[i] = 0.65 * Math.sin(2 * Math.PI * f * t) * (0.3 + 0.7 * env);
      }
    }

    const hilbert = computeHilbertTransform(base);
    const ssb = new Array<number>(N);
    const demod = new Array<number>(N);
    const phaseRad = (phaseDeg * Math.PI) / 180;
    const fLo = Math.max(200, fcAudio + freqOffsetHz);

    for (let i = 0; i < N; i++) {
      const t = i / SAMPLE_RATE;
      const cosC = Math.cos(2 * Math.PI * fcAudio * t);
      const sinC = Math.sin(2 * Math.PI * fcAudio * t);
      const sVal =
        sideband === 'usb'
          ? base[i] * cosC - hilbert[i] * sinC
          : base[i] * cosC + hilbert[i] * sinC;
      ssb[i] = sVal;

      // Coherent product detector output (baseband difference term)
      const cosLo = Math.cos(2 * Math.PI * fLo * t + phaseRad);
      const sinLo = Math.sin(2 * Math.PI * fLo * t + phaseRad);
      // After LPF, product of SSB with 2*cos(2pi*fLo*t + theta) yields shifted baseband:
      const dF = fLo - fcAudio;
      const cosDf = Math.cos(2 * Math.PI * dF * t + phaseRad);
      const sinDf = Math.sin(2 * Math.PI * dF * t + phaseRad);
      demod[i] =
        sideband === 'usb'
          ? base[i] * cosDf + hilbert[i] * sinDf
          : base[i] * cosDf - hilbert[i] * sinDf;
      void cosLo;
      void sinLo;
    }

    const activeSamples =
      probeMode === 'message' ? base : probeMode === 'ssb' ? ssb : demod;

    return { activeSamples, dur };
  }, [sourceMode, probeMode, fcAudio, freqOffsetHz, phaseDeg, sideband]);

  const stopAudio = useCallback(() => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
        sourceNodeRef.current.disconnect();
      } catch {
        // Ignore already stopped
      }
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  }, []);

  const startAudio = useCallback(() => {
    stopAudio();
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioCtx();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const buffer = ctx.createBuffer(1, audioData.activeSamples.length, SAMPLE_RATE);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < audioData.activeSamples.length; i++) {
      channel[i] = Math.max(-0.95, Math.min(0.95, audioData.activeSamples[i]));
    }

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;

    const gain = ctx.createGain();
    gain.gain.value = volume;

    src.connect(gain);
    gain.connect(ctx.destination);
    src.start();

    sourceNodeRef.current = src;
    gainNodeRef.current = gain;
    setIsPlaying(true);
  }, [audioData, stopAudio, volume]);

  // Update live volume
  useEffect(() => {
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = volume;
    }
  }, [volume]);

  // Restart loop seamlessly when parameters change while playing
  useEffect(() => {
    if (isPlaying) {
      startAudio();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudio();
      if (audioCtxRef.current) {
        void audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, [stopAudio]);

  // Preview polyline of active audio waveform (first 400 samples ~ 18 ms)
  const previewPath = useMemo(() => {
    const count = 320;
    const w = 680;
    const h = 110;
    const cy = h / 2;
    let d = '';
    for (let i = 0; i < count; i++) {
      const x = ((i / (count - 1)) * w).toFixed(1);
      const y = (cy - audioData.activeSamples[i] * (h * 0.42)).toFixed(1);
      d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
    }
    return d;
  }, [audioData]);

  const isAudioSynced = Math.abs(freqOffsetHz) < 1 && Math.abs(phaseDeg) < 2;

  return (
    <div className="space-y-4">
      {/* Audio Workbench Header Card */}
      <div className="bg-white rounded-xl border border-[#E6E4DD] p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#E6E4DD]">
          <div className="flex items-center gap-2">
            <AudioLines className="w-4 h-4 text-[#C85A32]" />
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1917]">
              SSB-SC AUDIO SOUND LAB
            </h2>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            {probeMode === 'demod' && (
              <span
                className={`inline-flex items-center gap-1 font-bold ${
                  isAudioSynced ? 'text-[#059669]' : 'text-[#C85A32]'
                }`}
              >
                {isAudioSynced ? (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                ) : (
                  <AlertTriangle className="w-3.5 h-3.5" />
                )}
                <span>
                  {isAudioSynced
                    ? 'Synchronized'
                    : `Offset Δf=${freqOffsetHz}Hz, θ=${phaseDeg}°`}
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Audio Playback & Probe Stage Bar */}
        <div className="bg-[#FAF9F6] border border-[#E6E4DD] rounded-lg p-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={isPlaying ? stopAudio : startAudio}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono font-bold transition-colors cursor-pointer ${
                isPlaying
                  ? 'bg-[#1A1917] text-white'
                  : 'bg-[#C85A32] hover:bg-[#B54E28] text-white'
              }`}
            >
              {isPlaying ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  <span>Stop Audio</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Play Audio</span>
                </>
              )}
            </button>

            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white border border-[#E6E4DD] rounded-lg">
              <Volume2 className="w-3.5 h-3.5 text-[#585651]" />
              <input
                type="range"
                aria-label="Audio output volume"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-20 accent-[#0284C7] cursor-pointer"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'message', label: '01. Baseband m(t)' },
                { id: 'ssb', label: `02. SSB ${sideband.toUpperCase()} s(t)` },
                { id: 'demod', label: '03. Recovered m̂(t)' },
              ] as { id: AudioProbeMode; label: string }[]
            ).map((stage) => (
              <button
                key={stage.id}
                type="button"
                onClick={() => setProbeMode(stage.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-colors cursor-pointer ${
                  probeMode === stage.id
                    ? 'bg-[#1A1917] text-white border-[#1A1917]'
                    : 'bg-white text-[#585651] border-[#E6E4DD] hover:text-[#1A1917]'
                }`}
              >
                {stage.label}
              </button>
            ))}
          </div>
        </div>

        {/* Audio Waveform Snapshot */}
        <div className="bg-white rounded-lg border border-[#E6E4DD] p-3">
          <svg
            viewBox="0 0 680 110"
            className="w-full h-[110px] select-none"
            role="img"
            aria-label="Audio signal waveform snapshot"
          >
            <line
              x1="0"
              y1="55"
              x2="680"
              y2="55"
              stroke="#E6E4DD"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <path
              d={previewPath}
              fill="none"
              stroke="#0284C7"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Audio Parameters Card */}
      <div className="bg-white rounded-xl border border-[#E6E4DD] p-4 sm:p-5 shadow-2xs space-y-4">
        <div className="flex items-center justify-between pb-2.5 border-b border-[#E6E4DD]">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[#C85A32]" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1917]">
              AUDIO SYNTHESIS CONTROLS
            </h3>
          </div>
          <button
            type="button"
            onClick={() => {
              setFcAudio(1500);
              setFreqOffsetHz(0);
              setPhaseDeg(0);
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#E6E4DD] bg-[#FAF9F6] text-[11px] font-mono font-semibold text-[#585651] hover:text-[#1A1917] cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-[11px] font-mono font-bold uppercase text-[#75736E]">
              Audio Source
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'tone', label: 'Tone 440Hz' },
                  { id: 'chord', label: 'C-Maj Chord' },
                  { id: 'melody', label: 'Melody' },
                ] as { id: AudioSourceMode; label: string }[]
              ).map((src) => (
                <button
                  key={src.id}
                  type="button"
                  onClick={() => setSourceMode(src.id)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-mono font-semibold border cursor-pointer ${
                    sourceMode === src.id
                      ? 'bg-[#1A1917] text-white border-[#1A1917]'
                      : 'bg-[#FAF9F6] text-[#585651] border-[#E6E4DD]'
                  }`}
                >
                  {src.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-[11px] font-mono font-bold uppercase text-[#75736E]">
              Sideband Mode
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {(['usb', 'lsb'] as SidebandMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onChangeSideband(mode)}
                  className={`py-1.5 px-2 rounded-lg text-xs font-mono font-semibold border cursor-pointer ${
                    sideband === mode
                      ? 'bg-[#1A1917] text-white border-[#1A1917]'
                      : 'bg-[#FAF9F6] text-[#585651] border-[#E6E4DD]'
                  }`}
                >
                  {mode === 'usb' ? 'USB (Upper)' : 'LSB (Lower)'}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-[#585651]">Audio Carrier (f_c)</span>
              <span className="font-bold text-[#0284C7] tabular-nums">
                {fcAudio} Hz
              </span>
            </div>
            <input
              type="range"
              aria-label="Audio carrier frequency"
              min={1000}
              max={2400}
              step={100}
              value={fcAudio}
              onChange={(e) => setFcAudio(parseInt(e.target.value, 10))}
              className="w-full accent-[#0284C7] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-[#8A8882]">
              <span>1000 Hz</span>
              <span>2400 Hz</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-[#585651]">LO Detune (Δf)</span>
              <span className="font-bold text-[#0284C7] tabular-nums">
                {freqOffsetHz >= 0 ? '+' : ''}
                {freqOffsetHz} Hz
              </span>
            </div>
            <input
              type="range"
              aria-label="Audio LO frequency offset"
              min={-250}
              max={250}
              step={10}
              value={freqOffsetHz}
              onChange={(e) => setFreqOffsetHz(parseInt(e.target.value, 10))}
              className="w-full accent-[#0284C7] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-[#8A8882]">
              <span>−250 Hz</span>
              <span>0 Hz (Lock)</span>
              <span>+250 Hz</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
