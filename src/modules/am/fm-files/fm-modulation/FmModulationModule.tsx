import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Sliders,
  Waves,
  Radio,
  RotateCcw,
  Volume2,
  Play,
  Square as StopSquare,
  Upload,
  Activity,
  BarChart2,
  AlertTriangle,
} from 'lucide-react';
import { FmInteractivePlot, FmCarsonBand } from './FmPlots';
import { computeFmSignals, decodeAudioFile } from './fmMathEngine';
import { simulateFmDemodulation } from './fmDemodEngine';
import { computeTwoSidedFmSpectrum } from './besselUtils';
import { fmAudioEngineInstance } from './fmAudioEngine';

export interface FmModulationModuleProps {
  onNavigateHome?: () => void;
  onNavigateModule?: (path: string) => void;
}

export type MessageType = 'sine' | 'square' | 'audio';
export type ViewTab = 'time_spectrum' | 'demodulation';
export type AnalysisSubTab = 'waveforms' | 'frequency_deviation' | 'spectrum';
export type WaveformViewMode = 'split' | 'overlay';
export type DemodSubTab = 'recovered' | 'stage' | 'error';
export type SpectrumViewMode = 'centered' | 'two_sided';
export type DemodulatorType = 'discriminator' | 'pll';

export const FmModulationModule: React.FC<FmModulationModuleProps> = ({
  onNavigateHome,
}) => {
  // 1. Primary & Internal Plot View Tabs
  const [activeTab, setActiveTab] = useState<ViewTab>('time_spectrum');
  const [analysisSubTab, setAnalysisSubTab] = useState<AnalysisSubTab>('waveforms');
  const [waveformView, setWaveformView] = useState<WaveformViewMode>('split');
  const [demodSubTab, setDemodSubTab] = useState<DemodSubTab>('recovered');

  // 2. Carrier Parameters
  const [carrierAmp, setCarrierAmp] = useState<number>(1.5);     // Ac (V)
  const [carrierFreq, setCarrierFreq] = useState<number>(20.0);  // fc (Hz)

  // 3. Message Parameters
  const [messageType, setMessageType] = useState<MessageType>('sine');
  const [messageAmp, setMessageAmp] = useState<number>(1.0);     // Am (V)
  const [messageFreq, setMessageFreq] = useState<number>(2.0);   // fm (Hz)

  // 4. Modulation Sensitivity & Index
  const [kf, setKf] = useState<number>(5.0);                     // kf (Hz/V)
  const [beta, setBeta] = useState<number>(2.5);                 // β

  // 5. Window & Spectrum Display
  const [windowPeriods, setWindowPeriods] = useState<number>(5);
  const [spectrumView, setSpectrumView] = useState<SpectrumViewMode>('centered');

  // 6. Channel & Demodulator Settings
  const [demodType, setDemodType] = useState<DemodulatorType>('discriminator');
  const [dcOffset, setDcOffset] = useState<number>(0.0);         // DC offset (V)
  const [awgnSnrDb, setAwgnSnrDb] = useState<number>(28.0);      // AWGN Channel SNR (dB)
  const [channelNoise, setChannelNoise] = useState<number>(0.0); // Additional sigma (V)
  const [pllBandwidth] = useState<number>(1.0);

  // Audio upload state
  const [audioBuffer, setAudioBuffer] = useState<Float32Array | null>(null);
  const [audioFileName, setAudioFileName] = useState<string>('Voice Sample');
  const [isDecodingAudio, setIsDecodingAudio] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Audio playback state
  const [isPlayingOriginal, setIsPlayingOriginal] = useState<boolean>(false);
  const [isPlayingDemod, setIsPlayingDemod] = useState<boolean>(false);

  // Synchronized parameter handlers
  const handleKfChange = (newKf: number) => {
    setKf(newKf);
    const calculatedBeta = (newKf * messageAmp) / Math.max(0.1, messageFreq);
    setBeta(Number(calculatedBeta.toFixed(2)));
  };

  const handleBetaChange = (newBeta: number) => {
    setBeta(newBeta);
    const calculatedKf = (newBeta * messageFreq) / Math.max(0.1, messageAmp);
    setKf(Number(calculatedKf.toFixed(2)));
  };

  const handleMessageAmpChange = (newAm: number) => {
    setMessageAmp(newAm);
    const calculatedBeta = (kf * newAm) / Math.max(0.1, messageFreq);
    setBeta(Number(calculatedBeta.toFixed(2)));
  };

  const handleMessageFreqChange = (newFm: number) => {
    setMessageFreq(newFm);
    const calculatedBeta = (kf * messageAmp) / Math.max(0.1, newFm);
    setBeta(Number(calculatedBeta.toFixed(2)));
  };

  const handleReset = () => {
    setCarrierAmp(1.5);
    setCarrierFreq(20.0);
    setMessageType('sine');
    setMessageAmp(1.0);
    setMessageFreq(2.0);
    setKf(5.0);
    setBeta(2.5);
    setWindowPeriods(5);
    setWaveformView('split');
    setSpectrumView('centered');
    setDemodType('discriminator');
    setDcOffset(0.0);
    setAwgnSnrDb(28.0);
    setChannelNoise(0.0);
    setAudioBuffer(null);
    setAudioFileName('Voice Sample');
    fmAudioEngineInstance.stopAll();
    setIsPlayingOriginal(false);
    setIsPlayingDemod(false);
  };

  // Lab Presets for NBFM, Carrier Null (J0(2.405) = 0), and WBFM
  const handleApplyLabPreset = (preset: 'nbfm' | 'carrier_null' | 'wbfm') => {
    setMessageType('sine');
    setMessageAmp(1.0);
    setMessageFreq(2.0);
    setCarrierAmp(1.5);
    setCarrierFreq(20.0);
    setDcOffset(0.0);

    if (preset === 'nbfm') {
      // β = (0.4 * 1.0) / 2.0 = 0.2
      setKf(0.4);
      setBeta(0.2);
    } else if (preset === 'carrier_null') {
      // β = (4.81 * 1.0) / 2.0 = 2.405 -> J0(2.405) = 0
      setKf(4.81);
      setBeta(2.405);
    } else {
      // β = (10.0 * 1.0) / 2.0 = 5.0
      setKf(10.0);
      setBeta(5.0);
    }
  };

  const formattedBeta = Math.abs(beta - 2.405) < 0.002 ? '2.405' : beta.toFixed(2);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        setIsDecodingAudio(true);
        const { buffer } = await decodeAudioFile(file);
        setAudioBuffer(buffer);
        setMessageType('audio');
        setAudioFileName(file.name);
      } catch (err) {
        console.error('Audio decode error:', err);
      } finally {
        setIsDecodingAudio(false);
      }
    }
  };

  // Time-domain Math Engine
  const engineResults = useMemo(() => {
    return computeFmSignals({
      Ac: carrierAmp,
      fc: carrierFreq,
      Am: messageAmp,
      fm: messageFreq,
      kf: kf,
      messageType: messageType,
      audioBuffer: audioBuffer,
      windowPeriods: windowPeriods,
      dcOffset: dcOffset,
      channelNoise: channelNoise,
    });
  }, [carrierAmp, carrierFreq, messageAmp, messageFreq, kf, messageType, audioBuffer, windowPeriods, dcOffset, channelNoise]);

  // Two-Sided Bessel Spectrum & Carson's Rule Computation
  const spectrumData = useMemo(() => {
    return computeTwoSidedFmSpectrum(
      carrierAmp,
      carrierFreq,
      messageFreq,
      beta,
      messageFreq,
      14,
      spectrumView === 'two_sided'
    );
  }, [carrierAmp, carrierFreq, messageFreq, beta, spectrumView]);

  // Demodulation Engine
  const demodResults = useMemo(() => {
    return simulateFmDemodulation({
      Ac: carrierAmp,
      fc: carrierFreq,
      Am: messageAmp,
      fm: messageFreq,
      kf: kf,
      dcOffset: dcOffset,
      channelNoise: channelNoise,
      awgnSnrDb: awgnSnrDb,
      demodType: demodType,
      pllLoopBandwidth: pllBandwidth,
      messageType: messageType,
      audioBuffer: audioBuffer,
      timeSpan: engineResults.timeSpan,
      numPoints: Math.min(2000, engineResults.numPoints),
    });
  }, [
    carrierAmp,
    carrierFreq,
    messageAmp,
    messageFreq,
    kf,
    dcOffset,
    channelNoise,
    awgnSnrDb,
    demodType,
    pllBandwidth,
    messageType,
    audioBuffer,
    engineResults.timeSpan,
    engineResults.numPoints,
  ]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      fmAudioEngineInstance.stopAll();
    };
  }, []);

  // Sync audio playback buffers
  useEffect(() => {
    fmAudioEngineInstance.generateAudioBuffers(
      messageType === 'audio' ? 'voice' : messageType,
      messageFreq,
      beta,
      channelNoise,
      demodType,
      dcOffset,
      demodResults.isOvermodulated,
      demodResults.isLocked,
      awgnSnrDb
    );
  }, [
    messageType,
    messageFreq,
    beta,
    channelNoise,
    demodType,
    dcOffset,
    demodResults.isOvermodulated,
    demodResults.isLocked,
    awgnSnrDb,
  ]);

  const handleToggleOriginalAudio = () => {
    if (isPlayingOriginal) {
      fmAudioEngineInstance.stopOriginal();
      setIsPlayingOriginal(false);
    } else {
      fmAudioEngineInstance.stopDemodulated();
      setIsPlayingDemod(false);
      setIsPlayingOriginal(true);
      fmAudioEngineInstance.playOriginal(() => setIsPlayingOriginal(false));
    }
  };

  const handleToggleDemodAudio = () => {
    if (isPlayingDemod) {
      fmAudioEngineInstance.stopDemodulated();
      setIsPlayingDemod(false);
    } else {
      fmAudioEngineInstance.stopOriginal();
      setIsPlayingOriginal(false);
      setIsPlayingDemod(true);
      fmAudioEngineInstance.playDemodulated(() => setIsPlayingDemod(false));
    }
  };

  // Explicit Dynamic Axis Limits
  const msgYLimit = Math.max(0.8, (messageAmp + Math.abs(dcOffset)) * 1.25);
  const fmYLimit = carrierAmp * 1.25;
  const waveYLimit = Math.max(carrierAmp, messageAmp + Math.abs(dcOffset)) * 1.25;
  const fiCenter = carrierFreq + kf * dcOffset;
  const fiHalfSpan = Math.max(engineResults.deltaF * 1.35, messageFreq * 1.2, 1.5);
  const fiYMin = Math.max(0, fiCenter - fiHalfSpan);
  const fiYMax = fiCenter + fiHalfSpan;
  const isOverDeviation = engineResults.deltaF > carrierFreq || engineResults.fiMin < 0;

  const handleClampOverDeviation = () => {
    const safeKf = Math.max(
      0.5,
      Math.floor(((carrierFreq * 0.95) / Math.max(0.1, messageAmp)) * 100) / 100
    );
    if (engineResults.deltaF > carrierFreq) {
      handleKfChange(safeKf);
    }
    if (dcOffset < 0 && carrierFreq + Math.min(kf, safeKf) * dcOffset - Math.min(engineResults.deltaF, safeKf * messageAmp) < 0) {
      setDcOffset(0);
    }
  };

  const spectrumSpanHalf = Math.max(5 * messageFreq, spectrumData.carsonInfo.carsonBT * 0.65);
  const spectrumDomain: [number, number] =
    spectrumView === 'centered'
      ? [Math.max(0, carrierFreq - 5 * messageFreq), carrierFreq + 5 * messageFreq]
      : [-(carrierFreq + spectrumSpanHalf), carrierFreq + spectrumSpanHalf];
  const spectrumYMax = (carrierAmp / 2) * 1.25;

  const spectrumCarsonBands: FmCarsonBand[] = useMemo(() => {
    const bands: FmCarsonBand[] = [
      {
        center: carrierFreq,
        bandwidth: spectrumData.carsonInfo.carsonBT,
        label: "Carson's Bandwidth (B_T)",
        color: '#D97706',
      },
    ];
    if (spectrumView === 'two_sided') {
      bands.push({
        center: -carrierFreq,
        bandwidth: spectrumData.carsonInfo.carsonBT,
        color: '#D97706',
      });
    }
    return bands;
  }, [carrierFreq, spectrumData.carsonInfo.carsonBT, spectrumView]);

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-white text-[#1A1917] font-sans select-none">
      {/* 1. Clean Top Header & Primary Mode Switcher */}
      <header className="h-12 px-4 border-b border-[#E6E4DD] bg-[#FAF9F6] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          {onNavigateHome && (
            <button
              type="button"
              onClick={onNavigateHome}
              className="p-1.5 rounded text-[#75736E] hover:text-[#1A1917] hover:bg-[#E6E4DD]/50 transition-colors cursor-pointer"
              title="Return to Workspace Hub"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <span className="text-[11px] font-mono font-bold tracking-wider text-[#C85A32] bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/20 shrink-0">
            MODULE FM
          </span>
          <h1 className="text-sm font-heading font-semibold text-[#1A1917] truncate">
            Frequency Modulation
          </h1>
        </div>

        {/* Primary View Tabs */}
        <div className="flex items-center gap-1 bg-white p-0.5 rounded-md border border-[#E6E4DD] shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('time_spectrum')}
            className={`py-1 px-3 text-xs font-semibold rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'time_spectrum'
                ? 'bg-[#C85A32] text-white shadow-xs'
                : 'text-[#585651] hover:text-[#1A1917] hover:bg-[#FAF9F6]'
            }`}
          >
            <Waves className="w-3.5 h-3.5" />
            <span>Time &amp; Spectrum</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('demodulation')}
            className={`py-1 px-3 text-xs font-semibold rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'demodulation'
                ? 'bg-[#C85A32] text-white shadow-xs'
                : 'text-[#585651] hover:text-[#1A1917] hover:bg-[#FAF9F6]'
            }`}
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span>Demodulation &amp; Audio</span>
          </button>
        </div>
      </header>

      {/* 2. Full-Screen Workspace: 75% Left/Center Canvas + 25% Sticky Right Control Panel */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* ========================================================= */}
        {/* MAIN VISUALIZATION CANVAS (LEFT / CENTER 75% WIDTH)       */}
        {/* ========================================================= */}
        <main className="w-full lg:w-3/4 flex-1 min-w-0 flex flex-col min-h-0 p-4 gap-3 overflow-hidden bg-white">
          {/* Streamlined 3-Metric Top Bar */}
          <div className="grid grid-cols-3 gap-3 shrink-0">
            <div
              className={`px-3.5 py-2.5 border rounded-md flex items-baseline justify-between ${
                isOverDeviation
                  ? 'bg-red-50/70 border-red-300'
                  : 'bg-[#FAF9F6] border-[#E6E4DD]'
              }`}
            >
              <span className="text-[11px] font-mono uppercase tracking-wide text-[#75736E]">
                Peak Deviation (Δf)
              </span>
              <span
                className={`text-base font-mono font-bold ${
                  isOverDeviation ? 'text-red-700' : 'text-[#1A1917]'
                }`}
              >
                ±{engineResults.deltaF.toFixed(2)} <span className="text-xs font-normal text-[#75736E]">Hz</span>
              </span>
            </div>

            <div className="px-3.5 py-2.5 bg-[#FAF9F6] border border-[#E6E4DD] rounded-md flex items-baseline justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wide text-[#75736E]">
                Modulation Index (β)
              </span>
              <span className="text-base font-mono font-bold text-[#C85A32]">
                {formattedBeta}{' '}
                <span className="text-[11px] font-normal text-[#585651]">
                  ({engineResults.isNarrowband ? 'NBFM' : 'WBFM'})
                </span>
              </span>
            </div>

            <div className="px-3.5 py-2.5 bg-[#FAF9F6] border border-[#E6E4DD] rounded-md flex items-baseline justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wide text-[#75736E]">
                Carson Bandwidth (B_T)
              </span>
              <span className="text-base font-mono font-bold text-[#1A1917]">
                {spectrumData.carsonInfo.carsonBT.toFixed(1)} <span className="text-xs font-normal text-[#75736E]">Hz</span>
              </span>
            </div>
          </div>

          {/* Over-Deviation Safety Warning Banner */}
          {isOverDeviation && (
            <div
              role="alert"
              className="px-3.5 py-2 bg-amber-50 border border-amber-300 rounded-md flex items-center justify-between gap-3 shrink-0 text-xs text-amber-950"
            >
              <div className="flex items-center gap-2 min-w-0">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-semibold truncate">
                  Over-Deviation: Δf exceeds f_c, causing frequency clipping at 0 Hz
                </span>
                <span className="hidden xl:inline font-mono text-[11px] text-amber-800 shrink-0">
                  {engineResults.deltaF > carrierFreq
                    ? `(Δf = ${engineResults.deltaF.toFixed(1)} Hz > f_c = ${carrierFreq.toFixed(1)} Hz)`
                    : `(min f_i = ${engineResults.fiMin.toFixed(1)} Hz < 0 Hz)`}
                </span>
              </div>
              <button
                type="button"
                onClick={handleClampOverDeviation}
                className="px-2.5 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-mono text-[11px] font-semibold transition-colors cursor-pointer shrink-0"
              >
                Clamp Δf ≤ f_c
              </button>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 1: TIME & SPECTRUM (SINGLE PROMINENT PLOT PER SUB-TAB) */}
          {/* ======================================================== */}
          {activeTab === 'time_spectrum' && (
            <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
              {/* Clean Internal Plot Switcher */}
              <div className="flex items-center justify-between gap-2 shrink-0">
                <div className="inline-flex items-center gap-1 bg-[#FAF9F6] p-1 rounded-md border border-[#E6E4DD]">
                  <button
                    type="button"
                    onClick={() => setAnalysisSubTab('waveforms')}
                    className={`py-1.5 px-3 text-xs font-semibold rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                      analysisSubTab === 'waveforms'
                        ? 'bg-white text-[#C85A32] shadow-xs border border-[#E6E4DD]'
                        : 'text-[#585651] hover:text-[#1A1917]'
                    }`}
                  >
                    <Waves className="w-3.5 h-3.5" />
                    <span>Waveforms</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnalysisSubTab('frequency_deviation')}
                    className={`py-1.5 px-3 text-xs font-semibold rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                      analysisSubTab === 'frequency_deviation'
                        ? 'bg-white text-[#C85A32] shadow-xs border border-[#E6E4DD]'
                        : 'text-[#585651] hover:text-[#1A1917]'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Frequency Deviation</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAnalysisSubTab('spectrum')}
                    className={`py-1.5 px-3 text-xs font-semibold rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
                      analysisSubTab === 'spectrum'
                        ? 'bg-white text-[#C85A32] shadow-xs border border-[#E6E4DD]'
                        : 'text-[#585651] hover:text-[#1A1917]'
                    }`}
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                    <span>Spectrum</span>
                  </button>
                </div>

                {analysisSubTab === 'spectrum' && (
                  <div className="flex items-center bg-[#FAF9F6] border border-[#E6E4DD] rounded-md p-0.5 text-[11px] font-mono">
                    <button
                      type="button"
                      onClick={() => setSpectrumView('centered')}
                      className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                        spectrumView === 'centered'
                          ? 'bg-[#C85A32] text-white font-semibold'
                          : 'text-[#585651] hover:text-[#1A1917]'
                      }`}
                    >
                      Carrier Window
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpectrumView('two_sided')}
                      className={`px-2.5 py-1 rounded cursor-pointer transition-colors ${
                        spectrumView === 'two_sided'
                          ? 'bg-[#C85A32] text-white font-semibold'
                          : 'text-[#585651] hover:text-[#1A1917]'
                      }`}
                    >
                      Two-Sided
                    </button>
                  </div>
                )}
              </div>

              {/* Active Spacious Plot */}
              <div className="flex-1 min-h-0">
                {analysisSubTab === 'waveforms' && (
                  <FmInteractivePlot
                    title="1. Time-Domain Waveforms"
                    xLabel="Time t (seconds)"
                    yLabel={waveformView === 'split' ? 'm(t) (V)' : 'Amplitude (V)'}
                    topPanelTitle={waveformView === 'split' ? 'Message Signal m(t)' : undefined}
                    domain={[0, engineResults.timeSpan]}
                    range={waveformView === 'split' ? [-msgYLimit, msgYLimit] : [-waveYLimit, waveYLimit]}
                    headerControls={
                      <div className="flex items-center bg-[#FAF9F6] border border-[#E6E4DD] rounded p-0.5 text-[10px] font-mono">
                        <button
                          type="button"
                          onClick={() => setWaveformView('split')}
                          className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                            waveformView === 'split'
                              ? 'bg-[#C85A32] text-white font-semibold'
                              : 'text-[#585651] hover:text-[#1A1917]'
                          }`}
                        >
                          Split View
                        </button>
                        <button
                          type="button"
                          onClick={() => setWaveformView('overlay')}
                          className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                            waveformView === 'overlay'
                              ? 'bg-[#C85A32] text-white font-semibold'
                              : 'text-[#585651] hover:text-[#1A1917]'
                          }`}
                        >
                          Overlay
                        </button>
                      </div>
                    }
                    referenceLines={
                      waveformView === 'overlay'
                        ? [
                            { y: carrierAmp, label: `+A_c`, color: '#8A8882', style: 'dashed' },
                            { y: -carrierAmp, label: `-A_c`, color: '#8A8882', style: 'dashed' },
                          ]
                        : []
                    }
                    series={
                      waveformView === 'split'
                        ? [
                            {
                              id: 'modulating-m',
                              name: 'Message m(t)',
                              color: '#C85A32',
                              strokeWidth: 2.2,
                              points: engineResults.mPoints,
                            },
                          ]
                        : [
                            {
                              id: 'fm-wave-s',
                              name: 'FM Signal s(t)',
                              color: '#1A1917',
                              strokeWidth: 1.6,
                              points: engineResults.sPoints,
                            },
                            {
                              id: 'modulating-m',
                              name: 'Message m(t)',
                              color: '#C85A32',
                              strokeWidth: 2.2,
                              points: engineResults.mPoints,
                            },
                          ]
                    }
                    secondaryPanel={
                      waveformView === 'split'
                        ? {
                            title: 'FM Modulated Waveform s(t)',
                            yLabel: 's(t) (V)',
                            range: [-fmYLimit, fmYLimit],
                            referenceLines: [
                              { y: carrierAmp, label: `+A_c`, color: '#8A8882', style: 'dashed' },
                              { y: -carrierAmp, label: `-A_c`, color: '#8A8882', style: 'dashed' },
                            ],
                            series: [
                              {
                                id: 'fm-wave-s-split',
                                name: 'FM Signal s(t)',
                                color: '#1A1917',
                                strokeWidth: 1.6,
                                points: engineResults.sPoints,
                              },
                            ],
                          }
                        : undefined
                    }
                    className="h-full"
                  />
                )}

                {analysisSubTab === 'frequency_deviation' && (
                  <FmInteractivePlot
                    title="2. Instantaneous Frequency Deviation"
                    statusBadge={isOverDeviation ? '0 Hz Clipping' : undefined}
                    xLabel="Time t (seconds)"
                    yLabel="Frequency (Hz)"
                    domain={[0, engineResults.timeSpan]}
                    range={[fiYMin, fiYMax]}
                    referenceLines={[
                      { y: carrierFreq, label: `f_c = ${carrierFreq.toFixed(1)} Hz`, color: '#8A8882', style: 'solid' },
                      {
                        y: fiCenter + engineResults.deltaF,
                        label: `f_c + Δf`,
                        color: '#C85A32',
                        style: 'dashed',
                      },
                      ...(fiCenter - engineResults.deltaF >= 0
                        ? [
                            {
                              y: fiCenter - engineResults.deltaF,
                              label: `f_c - Δf`,
                              color: '#C85A32',
                              style: 'dashed' as const,
                            },
                          ]
                        : [
                            {
                              y: 0,
                              label: `0 Hz Floor (Clipped)`,
                              color: '#DC2626',
                              style: 'solid' as const,
                            },
                          ]),
                    ]}
                    series={[
                      {
                        id: 'inst-frequency-fi',
                        name: 'Instantaneous Frequency f_i(t)',
                        color: '#C85A32',
                        strokeWidth: 2.2,
                        points: engineResults.fiPoints,
                      },
                    ]}
                    className="h-full"
                  />
                )}

                {analysisSubTab === 'spectrum' && (
                  <FmInteractivePlot
                    title="3. Frequency Spectrum"
                    xLabel="Frequency f (Hz)"
                    yLabel="Magnitude (V)"
                    domain={spectrumDomain}
                    range={[0, spectrumYMax]}
                    carsonBands={spectrumCarsonBands}
                    series={[
                      {
                        id: 'bessel-spectrum-stems',
                        name: 'Spectral Components',
                        color: '#585651',
                        type: 'spectrum',
                        spectralLines: spectrumData.lines,
                      },
                    ]}
                    className="h-full"
                  />
                )}
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 2: DEMODULATION & AUDIO (SINGLE PROMINENT PLOT)     */}
          {/* ======================================================== */}
          {activeTab === 'demodulation' && (
            <div className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden">
              {/* Clean Internal Switcher for Demodulation Views */}
              <div className="flex items-center justify-between gap-2 shrink-0">
                <div className="inline-flex items-center gap-1 bg-[#FAF9F6] p-1 rounded-md border border-[#E6E4DD]">
                  <button
                    type="button"
                    onClick={() => setDemodSubTab('recovered')}
                    className={`py-1.5 px-3 text-xs font-semibold rounded transition-colors cursor-pointer ${
                      demodSubTab === 'recovered'
                        ? 'bg-white text-[#C85A32] shadow-xs border border-[#E6E4DD]'
                        : 'text-[#585651] hover:text-[#1A1917]'
                    }`}
                  >
                    Recovered Signal
                  </button>
                  <button
                    type="button"
                    onClick={() => setDemodSubTab('stage')}
                    className={`py-1.5 px-3 text-xs font-semibold rounded transition-colors cursor-pointer ${
                      demodSubTab === 'stage'
                        ? 'bg-white text-[#C85A32] shadow-xs border border-[#E6E4DD]'
                        : 'text-[#585651] hover:text-[#1A1917]'
                    }`}
                  >
                    {demodType === 'discriminator' ? 'Discriminator Envelope' : 'PLL Phase Error'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDemodSubTab('error')}
                    className={`py-1.5 px-3 text-xs font-semibold rounded transition-colors cursor-pointer ${
                      demodSubTab === 'error'
                        ? 'bg-white text-[#C85A32] shadow-xs border border-[#E6E4DD]'
                        : 'text-[#585651] hover:text-[#1A1917]'
                    }`}
                  >
                    Error Residual
                  </button>
                </div>

                <span
                  className={`text-xs font-mono px-2.5 py-1 rounded border ${
                    demodResults.isLocked
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  {demodResults.isLocked
                    ? 'Locked'
                    : demodResults.isOvermodulated
                    ? 'Over-Modulated'
                    : 'Cycle Slipping'}
                </span>
              </div>

              {/* Single Prominent Plot */}
              <div className="flex-1 min-h-0">
                {demodSubTab === 'recovered' && (
                  <FmInteractivePlot
                    title="1. Recovered Message Signal"
                    xLabel="Time t (seconds)"
                    yLabel="Amplitude (V)"
                    domain={[0, engineResults.timeSpan]}
                    range={[
                      -Math.max(1.8, (messageAmp + Math.abs(dcOffset)) * 1.35),
                      Math.max(1.8, (messageAmp + Math.abs(dcOffset)) * 1.35),
                    ]}
                    series={[
                      {
                        id: 'orig-m',
                        name: 'Original Message',
                        color: '#1A1917',
                        strokeWidth: 1.8,
                        dash: '4 3',
                        points: demodResults.mPoints,
                      },
                      {
                        id: 'rec-m',
                        name: 'Demodulated Output',
                        color: '#C85A32',
                        strokeWidth: 2.2,
                        points: demodResults.mRecoveredPoints,
                      },
                    ]}
                    className="h-full"
                  />
                )}

                {demodSubTab === 'stage' &&
                  (demodType === 'discriminator' ? (
                    <FmInteractivePlot
                      title="2. Discriminator Stage Output"
                      xLabel="Time t (seconds)"
                      yLabel="Level (V)"
                      domain={[0, engineResults.timeSpan]}
                      range={[-carrierAmp * 1.6, carrierAmp * 1.6]}
                      series={[
                        {
                          id: 'diff-signal',
                          name: 'Differentiated Signal',
                          color: '#8A8882',
                          strokeWidth: 1.2,
                          points: demodResults.differentiatedPoints,
                        },
                        {
                          id: 'envelope-am',
                          name: 'Detected Envelope',
                          color: '#C85A32',
                          strokeWidth: 2.2,
                          points: demodResults.envelopePoints,
                        },
                      ]}
                      className="h-full"
                    />
                  ) : (
                    <FmInteractivePlot
                      title="2. PLL Phase Error"
                      xLabel="Time t (seconds)"
                      yLabel="Phase Error"
                      domain={[0, engineResults.timeSpan]}
                      range={[-1.2, 1.2]}
                      referenceLines={[{ y: 0, label: 'Zero', color: '#8A8882', style: 'solid' }]}
                      series={[
                        {
                          id: 'pll-error',
                          name: 'Phase Error',
                          color: '#C85A32',
                          strokeWidth: 2,
                          points: demodResults.phaseErrorPoints,
                        },
                      ]}
                      className="h-full"
                    />
                  ))}

                {demodSubTab === 'error' && (
                  <FmInteractivePlot
                    title="3. Demodulation Error Residual"
                    xLabel="Time t (seconds)"
                    yLabel="Error (V)"
                    domain={[0, engineResults.timeSpan]}
                    range={[-1.5, 1.5]}
                    referenceLines={[{ y: 0, label: 'Zero', color: '#8A8882', style: 'solid' }]}
                    series={[
                      {
                        id: 'error-residual',
                        name: 'Residual Error',
                        color: demodResults.isOvermodulated ? '#DC2626' : '#585651',
                        strokeWidth: 1.8,
                        points: demodResults.errorPoints,
                      },
                    ]}
                    className="h-full"
                  />
                )}
              </div>

              {/* Side-by-Side Audio Playback Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2.5 bg-[#FAF9F6] border border-[#E6E4DD] rounded-md shrink-0">
                <div className="px-3 py-2 bg-white border border-[#E6E4DD] rounded flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Volume2 className="w-4 h-4 text-[#1A1917] shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#1A1917] truncate">Original Audio</div>
                      <div className="text-[10.5px] font-mono text-[#75736E] truncate">
                        {messageType === 'audio' ? audioFileName : `${messageType.toUpperCase()} Reference`}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleOriginalAudio}
                    className={`py-1.5 px-3 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                      isPlayingOriginal
                        ? 'bg-[#1A1917] text-white'
                        : 'bg-[#FAF9F6] hover:bg-[#E6E4DD]/60 border border-[#E6E4DD] text-[#1A1917]'
                    }`}
                  >
                    {isPlayingOriginal ? <StopSquare className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    <span>{isPlayingOriginal ? 'Stop' : 'Play'}</span>
                  </button>
                </div>

                <div className="px-3 py-2 bg-white border border-[#E6E4DD] rounded flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Radio className="w-4 h-4 text-[#C85A32] shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#1A1917] truncate">Demodulated Audio</div>
                      <div className="text-[10.5px] font-mono text-[#75736E] truncate">
                        {demodType === 'discriminator' ? 'Discriminator' : 'PLL'} · Output SNR {demodResults.effectiveSnrDb.toFixed(1)} dB
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleDemodAudio}
                    className={`py-1.5 px-3 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                      isPlayingDemod
                        ? 'bg-[#C85A32] text-white'
                        : 'bg-[#FBF4F0] hover:bg-[#C85A32]/20 border border-[#C85A32]/40 text-[#C85A32]'
                    }`}
                  >
                    {isPlayingDemod ? <StopSquare className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    <span>{isPlayingDemod ? 'Stop' : 'Play'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ========================================================= */}
        {/* RIGHT-SIDE CONTEXT-AWARE CONTROL PANEL (25% OF WIDTH)     */}
        {/* ========================================================= */}
        <aside className="w-full lg:w-1/4 lg:min-w-[290px] lg:max-w-[360px] h-full bg-[#FAF9F6] border-t lg:border-t-0 lg:border-l border-[#E6E4DD] p-4 flex flex-col justify-between overflow-y-auto shrink-0">
          <div className="space-y-5">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E6E4DD]">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#C85A32]" />
                <h2 className="text-[13px] font-heading font-semibold tracking-wider uppercase text-[#1A1917]">
                  {activeTab === 'time_spectrum' ? 'Signal Parameters' : 'Receiver Parameters'}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleReset}
                title="Reset Parameters"
                className="py-1 px-2 rounded text-xs font-mono text-[#75736E] hover:text-[#C85A32] hover:bg-white border border-transparent hover:border-[#E6E4DD] transition-colors cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset</span>
              </button>
            </div>

            {activeTab === 'time_spectrum' ? (
              <>
                {/* Compact Lab Presets */}
                <section className="space-y-2">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#75736E]">
                    Lab Presets
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleApplyLabPreset('nbfm')}
                      className={`py-1.5 px-1.5 rounded border text-[11px] font-mono font-semibold transition-colors cursor-pointer text-center ${
                        Math.abs(beta - 0.2) < 0.01
                          ? 'bg-[#C85A32] text-white border-[#C85A32]'
                          : 'bg-white text-[#1A1917] border-[#E6E4DD] hover:border-[#C85A32]/50'
                      }`}
                    >
                      NBFM (β=0.2)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyLabPreset('carrier_null')}
                      className={`py-1.5 px-1 rounded border text-[10.5px] font-mono font-semibold transition-colors cursor-pointer text-center leading-tight ${
                        Math.abs(beta - 2.405) < 0.01
                          ? 'bg-[#C85A32] text-white border-[#C85A32]'
                          : 'bg-white text-[#1A1917] border-[#E6E4DD] hover:border-[#C85A32]/50'
                      }`}
                    >
                      Carrier Null (β=2.405)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyLabPreset('wbfm')}
                      className={`py-1.5 px-1.5 rounded border text-[11px] font-mono font-semibold transition-colors cursor-pointer text-center ${
                        Math.abs(beta - 5.0) < 0.01
                          ? 'bg-[#C85A32] text-white border-[#C85A32]'
                          : 'bg-white text-[#1A1917] border-[#E6E4DD] hover:border-[#C85A32]/50'
                      }`}
                    >
                      WBFM (β=5.0)
                    </button>
                  </div>
                </section>

                {/* Message Type */}
                <section className="space-y-2.5 pt-4 border-t border-[#E6E4DD]">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#75736E]">
                    Message Type
                  </div>
                  <div className="grid grid-cols-3 gap-1 bg-white p-0.5 rounded-md border border-[#E6E4DD]">
                    {(['sine', 'square', 'audio'] as MessageType[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setMessageType(type)}
                        className={`py-1.5 text-xs font-semibold rounded capitalize transition-colors cursor-pointer ${
                          messageType === type
                            ? 'bg-[#C85A32] text-white shadow-xs'
                            : 'text-[#585651] hover:text-[#1A1917]'
                        }`}
                      >
                        {type === 'audio' ? 'Audio' : type}
                      </button>
                    ))}
                  </div>

                  {messageType === 'audio' && (
                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="audio/wav,audio/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isDecodingAudio}
                        className="w-full py-1.5 px-3 bg-white border border-[#E6E4DD] hover:border-[#C85A32]/50 rounded-md text-xs font-mono text-[#1A1917] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#C85A32]" />
                        <span className="truncate">
                          {isDecodingAudio ? 'Decoding...' : `Upload .wav (${audioFileName})`}
                        </span>
                      </button>
                    </div>
                  )}
                </section>

                {/* Carrier Parameters */}
                <section className="space-y-3.5 pt-4 border-t border-[#E6E4DD]">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#75736E]">
                    Carrier Parameters
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[13px] font-mono text-[#585651]">
                      <span>Carrier Amplitude (A_c)</span>
                      <span className="font-bold text-[#1A1917]">{carrierAmp.toFixed(2)} V</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="3.0"
                      step="0.1"
                      value={carrierAmp}
                      onChange={(e) => setCarrierAmp(parseFloat(e.target.value))}
                      className="w-full accent-[#C85A32] cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[13px] font-mono text-[#585651]">
                      <span>Carrier Frequency (f_c)</span>
                      <span className="font-bold text-[#1A1917]">{carrierFreq.toFixed(1)} Hz</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="50"
                      step="1"
                      value={carrierFreq}
                      onChange={(e) => setCarrierFreq(parseFloat(e.target.value))}
                      className="w-full accent-[#C85A32] cursor-pointer"
                    />
                  </div>
                </section>

                {/* Modulation Settings */}
                <section className="space-y-3.5 pt-4 border-t border-[#E6E4DD]">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#75736E]">
                    Modulation Settings
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[13px] font-mono text-[#585651]">
                      <span>Message Frequency (f_m)</span>
                      <span className="font-bold text-[#1A1917]">{messageFreq.toFixed(1)} Hz</span>
                    </div>
                    <input
                      type="range"
                      min="1.0"
                      max="8.0"
                      step="0.2"
                      value={messageFreq}
                      onChange={(e) => handleMessageFreqChange(parseFloat(e.target.value))}
                      className="w-full accent-[#C85A32] cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[13px] font-mono text-[#585651]">
                      <span>Message Amplitude (A_m)</span>
                      <span className="font-bold text-[#1A1917]">{messageAmp.toFixed(2)} V</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="2.0"
                      step="0.1"
                      value={messageAmp}
                      onChange={(e) => handleMessageAmpChange(parseFloat(e.target.value))}
                      className="w-full accent-[#C85A32] cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[13px] font-mono text-[#585651]">
                      <span>Frequency Sensitivity (k_f)</span>
                      <span className="font-bold text-[#C85A32]">{kf.toFixed(2)} Hz/V</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="15.0"
                      step="0.25"
                      value={kf}
                      onChange={(e) => handleKfChange(parseFloat(e.target.value))}
                      className="w-full accent-[#C85A32] cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[13px] font-mono text-[#585651]">
                      <span>Modulation Index (β)</span>
                      <span className="font-bold text-[#C85A32]">{formattedBeta}</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="10.0"
                      step="0.05"
                      value={Math.min(10.0, beta)}
                      onChange={(e) => handleBetaChange(parseFloat(e.target.value))}
                      className="w-full accent-[#C85A32] cursor-pointer"
                    />
                  </div>
                </section>

                {/* Display Window */}
                <section className="space-y-2 pt-4 border-t border-[#E6E4DD]">
                  <div className="flex justify-between text-[13px] font-mono text-[#585651]">
                    <span>Display Window</span>
                    <span className="font-semibold text-[#1A1917]">{engineResults.timeSpan.toFixed(2)} s</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1 bg-white p-0.5 rounded-md border border-[#E6E4DD]">
                    {[3, 4, 5].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setWindowPeriods(p)}
                        className={`py-1.5 text-xs font-mono rounded cursor-pointer transition-colors ${
                          windowPeriods === p
                            ? 'bg-[#C85A32] text-white font-semibold'
                            : 'text-[#585651] hover:text-[#1A1917]'
                        }`}
                      >
                        {p} T_m
                      </button>
                    ))}
                  </div>
                </section>
              </>
            ) : (
              <>
                {/* Demodulator Type Selector */}
                <section className="space-y-2.5">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#75736E]">
                    Demodulator Type
                  </div>
                  <div className="grid grid-cols-2 gap-1 bg-white p-0.5 rounded-md border border-[#E6E4DD]">
                    <button
                      type="button"
                      onClick={() => setDemodType('discriminator')}
                      className={`py-2 text-xs font-semibold rounded cursor-pointer transition-colors ${
                        demodType === 'discriminator'
                          ? 'bg-[#C85A32] text-white shadow-xs'
                          : 'text-[#585651] hover:text-[#1A1917]'
                      }`}
                    >
                      Discriminator
                    </button>
                    <button
                      type="button"
                      onClick={() => setDemodType('pll')}
                      className={`py-2 text-xs font-semibold rounded cursor-pointer transition-colors ${
                        demodType === 'pll'
                          ? 'bg-[#C85A32] text-white shadow-xs'
                          : 'text-[#585651] hover:text-[#1A1917]'
                      }`}
                    >
                      PLL
                    </button>
                  </div>
                </section>

                {/* Channel & Receiver Impairments */}
                <section className="space-y-4 pt-4 border-t border-[#E6E4DD]">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#75736E]">
                    Receiver Impairments
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[13px] font-mono text-[#585651]">
                      <span>DC Offset</span>
                      <span className="font-bold text-[#1A1917]">
                        {dcOffset >= 0 ? `+${dcOffset.toFixed(2)}` : dcOffset.toFixed(2)} V
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-0.8"
                      max="0.8"
                      step="0.05"
                      value={dcOffset}
                      onChange={(e) => setDcOffset(parseFloat(e.target.value))}
                      className="w-full accent-[#C85A32] cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[13px] font-mono text-[#585651]">
                      <span>Channel Input SNR</span>
                      <span className="font-bold text-[#C85A32]">{awgnSnrDb.toFixed(1)} dB</span>
                    </div>
                    <input
                      id="awgn-snr-slider"
                      type="range"
                      min="0"
                      max="40"
                      step="0.5"
                      value={awgnSnrDb}
                      onChange={(e) => setAwgnSnrDb(parseFloat(e.target.value))}
                      className="w-full accent-[#C85A32] cursor-pointer"
                    />
                    <div
                      className={`text-xs font-mono px-2.5 py-1 rounded border text-center ${
                        demodResults.isBelowThreshold
                          ? 'bg-amber-50 text-amber-800 border-amber-300 font-semibold'
                          : 'bg-white text-[#585651] border-[#E6E4DD]'
                      }`}
                    >
                      {demodResults.isBelowThreshold
                        ? `Below FM Threshold (${demodType === 'discriminator' ? '< 10.5' : '< 7.0'} dB)`
                        : 'Above FM Threshold'}
                    </div>
                  </div>
                </section>

                {/* Audio Source & Uploader */}
                <section className="space-y-3 pt-4 border-t border-[#E6E4DD]">
                  <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#75736E]">
                    Audio Source
                  </div>
                  <div className="grid grid-cols-3 gap-1 bg-white p-0.5 rounded-md border border-[#E6E4DD]">
                    {(['sine', 'square', 'audio'] as MessageType[]).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setMessageType(type)}
                        className={`py-1.5 text-xs font-semibold rounded capitalize transition-colors cursor-pointer ${
                          messageType === type
                            ? 'bg-[#C85A32] text-white shadow-xs'
                            : 'text-[#585651] hover:text-[#1A1917]'
                        }`}
                      >
                        {type === 'audio' ? 'Audio' : type}
                      </button>
                    ))}
                  </div>

                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/wav,audio/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isDecodingAudio}
                      className="w-full py-2 px-3 bg-white border border-[#E6E4DD] hover:border-[#C85A32]/50 rounded-md text-xs font-mono text-[#1A1917] flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Upload className="w-4 h-4 text-[#C85A32] shrink-0" />
                      <span className="truncate">
                        {isDecodingAudio ? 'Decoding...' : `Upload .wav (${audioFileName})`}
                      </span>
                    </button>
                  </div>
                </section>
              </>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
