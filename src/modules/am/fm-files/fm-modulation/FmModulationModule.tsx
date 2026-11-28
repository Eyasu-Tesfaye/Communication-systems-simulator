import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
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
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { FmInteractivePlot, FmCarsonBand } from './FmPlots';
import { computeFmSignals, decodeAudioFile } from './fmMathEngine';
import { simulateFmDemodulation } from './fmDemodEngine';
import { computeTwoSidedFmSpectrum } from './besselUtils';
import { fmAudioEngineInstance } from './fmAudioEngine';
import {
  RADIO_STATIONS,
  RADIO_DOMAIN_MAX,
  simulateFmRadio,
  decodeRadioAudioClip,
  RadioVoiceClip,
} from './fmRadioEngine';

export interface FmModulationModuleProps {
  onNavigateHome?: () => void;
  onNavigateModule?: (path: string) => void;
}

export type MessageType = 'sine' | 'square' | 'audio';
export type ViewTab = 'time_spectrum' | 'demodulation' | 'radio';
export type AnalysisSubTab = 'waveforms' | 'frequency_deviation' | 'spectrum';
export type WaveformViewMode = 'split' | 'overlay';
export type DemodSubTab = 'recovered' | 'stage' | 'error';
export type RadioSubTab = 'spectrum' | 'demod';
export type SpectrumViewMode = 'centered' | 'two_sided';
export type DemodulatorType = 'discriminator' | 'pll';

export const FmModulationModule: React.FC<FmModulationModuleProps> = () => {
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
  const [isPlayingRadio, setIsPlayingRadio] = useState<boolean>(false);

  // Radio Tuner & Receiver state
  const [radioTuneFreq, setRadioTuneFreq] = useState<number>(46.0);
  const [radioPassbandWidth, setRadioPassbandWidth] = useState<number>(20.0);
  const [radioSubTab, setRadioSubTab] = useState<RadioSubTab>('spectrum');
  const [stationVoiceOverrides, setStationVoiceOverrides] = useState<Record<string, RadioVoiceClip | null>>({});
  const [bundledVoiceClips, setBundledVoiceClips] = useState<Record<string, RadioVoiceClip>>({});
  const [isDecodingRadioVoice, setIsDecodingRadioVoice] = useState<boolean>(false);
  const [showRadioAdvanced, setShowRadioAdvanced] = useState<boolean>(false);
  const radioVoiceFileInputRef = useRef<HTMLInputElement | null>(null);

  // Full-screen plot persistence across mode/sub-tab switches
  const [isPlotFullscreen, setIsPlotFullscreen] = useState<boolean>(false);

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

  const handleDeltaFChange = (newDeltaF: number) => {
    const safeAm = Math.max(0.1, messageAmp);
    const safeFm = Math.max(0.1, messageFreq);
    setKf(Number((newDeltaF / safeAm).toFixed(2)));
    setBeta(Number((newDeltaF / safeFm).toFixed(2)));
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
    setRadioTuneFreq(46.0);
    setRadioPassbandWidth(20.0);
    setStationVoiceOverrides({});
    fmAudioEngineInstance.stopAll();
    setIsPlayingOriginal(false);
    setIsPlayingDemod(false);
    setIsPlayingRadio(false);
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

  const handleRadioVoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const targetId = radioResults.dominantStation.id;
      try {
        setIsDecodingRadioVoice(true);
        const clip = await decodeRadioAudioClip(file);
        setStationVoiceOverrides((prev) => ({
          ...prev,
          [targetId]: clip,
        }));
      } catch (err) {
        console.error('Radio audio decode error:', err);
      } finally {
        setIsDecodingRadioVoice(false);
        e.target.value = '';
      }
    }
  };

  const handleResetRadioVoiceOverrides = () => {
    const targetId = radioResults.dominantStation.id;
    if (stationVoiceOverrides[targetId]) {
      setStationVoiceOverrides((prev) => ({
        ...prev,
        [targetId]: null,
      }));
    } else {
      setStationVoiceOverrides({});
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

  // Radio Tuner Simulation
  const radioResults = useMemo(() => {
    return simulateFmRadio({
      tuneFreq: radioTuneFreq,
      passbandWidth: radioPassbandWidth,
      deltaF: engineResults.deltaF,
      awgnSnrDb,
      voiceOverrides: stationVoiceOverrides,
      bundledClips: bundledVoiceClips,
    });
  }, [radioTuneFreq, radioPassbandWidth, engineResults.deltaF, awgnSnrDb, stationVoiceOverrides, bundledVoiceClips]);

  const activeVoiceStation = radioResults.dominantStation;
  const activeVoiceOverride = stationVoiceOverrides[activeVoiceStation.id] ?? null;
  const hasAnyVoiceOverride = Object.values(stationVoiceOverrides).some(Boolean);

  // Preload & cache all 4 bundled station MP3 buffers (CH 1-CH 4) + noise buffer once on load
  useEffect(() => {
    let cancelled = false;
    void fmAudioEngineInstance.preloadRadioAssets(RADIO_STATIONS).then((clips) => {
      if (!cancelled && Object.keys(clips).length > 0) {
        setBundledVoiceClips(clips);
      }
    });
    return () => {
      cancelled = true;
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

  // Smoothly update GainNode & BiquadFilterNode parameters on tuning/passband/SNR changes
  // without ever creating, stopping, or restarting AudioBufferSourceNodes
  useEffect(() => {
    const snrAmpRatio = Math.pow(10, awgnSnrDb / 20);
    const snrSigGain = snrAmpRatio / Math.sqrt(1 + snrAmpRatio * snrAmpRatio);
    const snrNoiseGain = 1 / Math.sqrt(1 + snrAmpRatio * snrAmpRatio);

    const stationGains: Record<string, number> = {};
    const stationFilterCutoffs: Record<string, number> = {};
    for (const cap of radioResults.stationCaptures) {
      const ratio = Math.max(0, Math.min(1, cap.captureRatio));
      stationGains[cap.station.id] = Math.sqrt(ratio) * snrSigGain;
      const bwCoverage = Math.min(1, radioPassbandWidth / Math.max(4, cap.carsonBT));
      const clarity = Math.max(0, Math.min(1, 0.55 * ratio + 0.45 * bwCoverage));
      stationFilterCutoffs[cap.station.id] = Math.round(850 + clarity * 4350);
    }
    const signalGain = Math.sqrt(Math.max(0, Math.min(1, radioResults.captureRatio)));
    const noiseGain = Math.min(1, Math.hypot(snrNoiseGain, (1 - signalGain) * 0.55));
    const noiseFilterCutoff = Math.round(
      Math.max(2200, Math.min(7500, 1800 + radioPassbandWidth * 160))
    );

    fmAudioEngineInstance.updateRadioMix({
      stationGains,
      stationFilterCutoffs,
      noiseGain,
      noiseFilterCutoff,
      dominantChannelId: radioResults.dominantStation.id,
    });
  }, [
    radioResults.stationCaptures,
    radioResults.captureRatio,
    radioResults.dominantStation.id,
    radioPassbandWidth,
    awgnSnrDb,
  ]);

  // Replace only the affected channel's AudioBufferSourceNode when Override CH X or Reset changes
  useEffect(() => {
    fmAudioEngineInstance.syncRadioChannelOverrides(RADIO_STATIONS, stationVoiceOverrides);
  }, [stationVoiceOverrides]);

  const handleToggleOriginalAudio = () => {
    if (isPlayingOriginal) {
      fmAudioEngineInstance.stopOriginal();
      setIsPlayingOriginal(false);
    } else {
      fmAudioEngineInstance.stopDemodulated();
      fmAudioEngineInstance.stopRadio();
      setIsPlayingDemod(false);
      setIsPlayingRadio(false);
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
      fmAudioEngineInstance.stopRadio();
      setIsPlayingOriginal(false);
      setIsPlayingRadio(false);
      setIsPlayingDemod(true);
      fmAudioEngineInstance.playDemodulated(() => setIsPlayingDemod(false));
    }
  };

  const handleToggleRadioAudio = () => {
    if (isPlayingRadio) {
      fmAudioEngineInstance.stopRadio();
      setIsPlayingRadio(false);
    } else {
      fmAudioEngineInstance.stopOriginal();
      fmAudioEngineInstance.stopDemodulated();
      setIsPlayingOriginal(false);
      setIsPlayingDemod(false);
      setIsPlayingRadio(true);
      fmAudioEngineInstance.playRadio(stationVoiceOverrides);
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

  const fullscreenHeaderControls = (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* Primary Mode Switch (hidden in Radio full-screen so top row stays focused on Radio controls) */}
      {activeTab !== 'radio' && (
        <div className="inline-flex items-center bg-[#FAF9F6] border border-[#E6E4DD] rounded p-0.5 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('time_spectrum')}
            className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
              activeTab === 'time_spectrum'
                ? 'bg-[#C85A32] text-white'
                : 'text-[#585651] hover:text-[#1A1917]'
            }`}
          >
            Time &amp; Spectrum
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('demodulation')}
            className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
              activeTab === 'demodulation'
                ? 'bg-[#C85A32] text-white'
                : 'text-[#585651] hover:text-[#1A1917]'
            }`}
          >
            Demod &amp; Audio
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('radio')}
            className="px-2 py-0.5 rounded transition-colors cursor-pointer text-[#585651] hover:text-[#1A1917]"
          >
            Radio
          </button>
        </div>
      )}

      {/* Sub-View Switcher */}
      {activeTab === 'time_spectrum' && (
        <>
          <div className="inline-flex items-center bg-[#FAF9F6] border border-[#E6E4DD] rounded p-0.5 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setAnalysisSubTab('waveforms')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                analysisSubTab === 'waveforms'
                  ? 'bg-white text-[#C85A32] shadow-2xs border border-[#E6E4DD]'
                  : 'text-[#585651] hover:text-[#1A1917]'
              }`}
            >
              Waveforms
            </button>
            <button
              type="button"
              onClick={() => setAnalysisSubTab('frequency_deviation')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                analysisSubTab === 'frequency_deviation'
                  ? 'bg-white text-[#C85A32] shadow-2xs border border-[#E6E4DD]'
                  : 'text-[#585651] hover:text-[#1A1917]'
              }`}
            >
              Freq Dev
            </button>
            <button
              type="button"
              onClick={() => setAnalysisSubTab('spectrum')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                analysisSubTab === 'spectrum'
                  ? 'bg-white text-[#C85A32] shadow-2xs border border-[#E6E4DD]'
                  : 'text-[#585651] hover:text-[#1A1917]'
              }`}
            >
              Spectrum
            </button>
          </div>
          {analysisSubTab === 'spectrum' && (
            <div className="inline-flex items-center bg-[#FAF9F6] border border-[#E6E4DD] rounded p-0.5 text-[10px] font-mono">
              <button
                type="button"
                onClick={() => setSpectrumView('centered')}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  spectrumView === 'centered'
                    ? 'bg-[#C85A32] text-white font-semibold'
                    : 'text-[#585651] hover:text-[#1A1917]'
                }`}
              >
                Window
              </button>
              <button
                type="button"
                onClick={() => setSpectrumView('two_sided')}
                className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                  spectrumView === 'two_sided'
                    ? 'bg-[#C85A32] text-white font-semibold'
                    : 'text-[#585651] hover:text-[#1A1917]'
                }`}
              >
                2-Sided
              </button>
            </div>
          )}
        </>
      )}

      {activeTab === 'demodulation' && (
        <>
          <div className="inline-flex items-center bg-[#FAF9F6] border border-[#E6E4DD] rounded p-0.5 text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => setDemodSubTab('recovered')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                demodSubTab === 'recovered'
                  ? 'bg-white text-[#C85A32] shadow-2xs border border-[#E6E4DD]'
                  : 'text-[#585651] hover:text-[#1A1917]'
              }`}
            >
              Recovered
            </button>
            <button
              type="button"
              onClick={() => setDemodSubTab('stage')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                demodSubTab === 'stage'
                  ? 'bg-white text-[#C85A32] shadow-2xs border border-[#E6E4DD]'
                  : 'text-[#585651] hover:text-[#1A1917]'
              }`}
            >
              {demodType === 'discriminator' ? 'Envelope' : 'Phase Err'}
            </button>
            <button
              type="button"
              onClick={() => setDemodSubTab('error')}
              className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
                demodSubTab === 'error'
                  ? 'bg-white text-[#C85A32] shadow-2xs border border-[#E6E4DD]'
                  : 'text-[#585651] hover:text-[#1A1917]'
              }`}
            >
              Error
            </button>
          </div>
          <div className="inline-flex items-center bg-[#FAF9F6] border border-[#E6E4DD] rounded p-0.5 text-[10px] font-mono">
            <button
              type="button"
              onClick={() => setDemodType('discriminator')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                demodType === 'discriminator'
                  ? 'bg-[#C85A32] text-white font-semibold'
                  : 'text-[#585651] hover:text-[#1A1917]'
              }`}
            >
              Discrim
            </button>
            <button
              type="button"
              onClick={() => setDemodType('pll')}
              className={`px-2 py-0.5 rounded cursor-pointer transition-colors ${
                demodType === 'pll'
                  ? 'bg-[#C85A32] text-white font-semibold'
                  : 'text-[#585651] hover:text-[#1A1917]'
              }`}
            >
              PLL
            </button>
          </div>
        </>
      )}

      {activeTab === 'radio' && (
        <div className="inline-flex items-center bg-[#FAF9F6] border border-[#E6E4DD] rounded p-0.5 text-[11px] font-semibold">
          <button
            type="button"
            onClick={() => setRadioSubTab('spectrum')}
            className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
              radioSubTab === 'spectrum'
                ? 'bg-white text-[#C85A32] shadow-2xs border border-[#E6E4DD]'
                : 'text-[#585651] hover:text-[#1A1917]'
            }`}
          >
            Spectrum &amp; Passband
          </button>
          <button
            type="button"
            onClick={() => setRadioSubTab('demod')}
            className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
              radioSubTab === 'demod'
                ? 'bg-white text-[#C85A32] shadow-2xs border border-[#E6E4DD]'
                : 'text-[#585651] hover:text-[#1A1917]'
            }`}
          >
            Demod Output
          </button>
        </div>
      )}

      {/* Live Telemetry Badges */}
      <div className="inline-flex items-center gap-1.5 text-[11px] font-mono">
        {activeTab === 'radio' ? (
          <>
            <span
              className={`px-2 py-0.5 rounded border font-semibold ${
                radioResults.status === 'LOCKED'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : radioResults.status === 'ADJACENT OVERLAP'
                  ? 'bg-red-50 text-red-700 border-red-300'
                  : radioResults.status === 'OFF-TUNE'
                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                  : 'bg-[#FAF9F6] text-[#585651] border-[#E6E4DD]'
              }`}
            >
              {radioResults.status} · {radioResults.signalStrengthPct}%
            </span>
            <span className="px-2 py-0.5 rounded border border-[#E6E4DD] bg-[#FAF9F6] text-[#1A1917] font-semibold">
              B<sub>T</sub> {radioResults.dominantBT.toFixed(1)}Hz
            </span>
            {radioResults.aciPct > 0 && (
              <span className="px-2 py-0.5 rounded border border-red-200 bg-red-50 text-red-700 font-semibold">
                ACI {radioResults.aciPct}%
              </span>
            )}
          </>
        ) : (
          <>
            <span className="px-2 py-0.5 rounded border border-[#E6E4DD] bg-[#FAF9F6] text-[#1A1917] font-semibold">
              B<sub>T</sub> {spectrumData.carsonInfo.carsonBT.toFixed(1)}Hz
            </span>
            {activeTab === 'demodulation' && (
              <span
                className={`px-2 py-0.5 rounded border font-semibold ${
                  demodResults.isLocked
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                {demodResults.isLocked ? 'Locked' : demodResults.isOvermodulated ? 'Over-Mod' : 'Slip'} ·{' '}
                {demodResults.effectiveSnrDb.toFixed(1)} dB
              </span>
            )}
            {isOverDeviation && (
              <button
                type="button"
                onClick={handleClampOverDeviation}
                className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-700 text-white font-semibold cursor-pointer transition-colors"
                title="Clamp Δf ≤ f_c"
              >
                Clamp Δf
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );

  const renderFullscreenControls = () =>
    activeTab === 'radio' ? (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Station Presets */}
          <div className="inline-flex items-center gap-1 bg-white border border-[#E6E4DD] rounded-md p-0.5 shrink-0">
            {RADIO_STATIONS.map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setRadioTuneFreq(st.fc)}
                className={`px-2 py-1 rounded text-[11px] font-mono font-semibold transition-colors cursor-pointer ${
                  Math.abs(radioTuneFreq - st.fc) < 0.6
                    ? 'bg-[#C85A32] text-white'
                    : 'text-[#585651] hover:text-[#1A1917]'
                }`}
                title={`${st.label} (${st.fc} Hz · ${st.programLabel})`}
              >
                {st.fc}Hz
              </button>
            ))}
          </div>

          {/* Tune Control */}
          <div className="inline-flex items-center gap-1.5 bg-[#FBF4F0] border border-[#C85A32]/25 rounded-md px-2 py-1 shrink-0">
            <span className="text-[11px] font-mono font-bold text-[#C85A32] whitespace-nowrap">
              Tune={radioTuneFreq.toFixed(1)}Hz
            </span>
            <input
              type="range"
              min="8"
              max="132"
              step="0.5"
              value={radioTuneFreq}
              onChange={(e) => setRadioTuneFreq(parseFloat(e.target.value))}
              aria-label="Radio Tune Frequency"
              className="w-24 accent-[#C85A32] cursor-pointer"
            />
          </div>

          {/* Passband Width */}
          <div className="inline-flex items-center gap-1.5 bg-white border border-[#E6E4DD] rounded-md px-2 py-1 shrink-0">
            <span className="text-[11px] font-mono font-semibold text-[#1A1917] whitespace-nowrap">
              B<sub>rx</sub>={radioPassbandWidth.toFixed(0)}Hz
            </span>
            <input
              type="range"
              min="8"
              max="45"
              step="1"
              value={radioPassbandWidth}
              onChange={(e) => setRadioPassbandWidth(parseFloat(e.target.value))}
              aria-label="Receiver Passband Width"
              className="w-18 accent-[#C85A32] cursor-pointer"
            />
          </div>

          {/* Narrow / Nominal / Wide Bandwidth Presets */}
          <div className="inline-flex items-center gap-0.5 bg-white border border-[#E6E4DD] rounded-md p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => handleBetaChange(0.6)}
              className={`px-2 py-1 rounded text-[11px] font-mono font-semibold cursor-pointer transition-colors ${
                Math.abs(beta - 0.6) < 0.05
                  ? 'bg-[#C85A32] text-white'
                  : 'text-[#585651] hover:text-[#1A1917]'
              }`}
            >
              Narrow
            </button>
            <button
              type="button"
              onClick={() => handleBetaChange(2.5)}
              className={`px-2 py-1 rounded text-[11px] font-mono font-semibold cursor-pointer transition-colors ${
                Math.abs(beta - 2.5) < 0.05
                  ? 'bg-[#C85A32] text-white'
                  : 'text-[#585651] hover:text-[#1A1917]'
              }`}
            >
              Nominal
            </button>
            <button
              type="button"
              onClick={() => handleBetaChange(9.0)}
              className={`px-2 py-1 rounded text-[11px] font-mono font-semibold cursor-pointer transition-colors ${
                Math.abs(beta - 9.0) < 0.05
                  ? 'bg-[#C85A32] text-white'
                  : 'text-[#585651] hover:text-[#1A1917]'
              }`}
            >
              Wide
            </button>
          </div>

          {/* FM β & Δf Controls */}
          <div className="inline-flex items-center gap-1.5 bg-white border border-[#E6E4DD] rounded-md px-2 py-1 shrink-0">
            <span className="text-[11px] font-mono font-semibold text-[#C85A32] whitespace-nowrap">
              β={formattedBeta}
            </span>
            <input
              type="range"
              min="0.1"
              max="10.0"
              step="0.05"
              value={Math.min(10.0, beta)}
              onChange={(e) => handleBetaChange(parseFloat(e.target.value))}
              aria-label="Modulation Index beta"
              className="w-16 accent-[#C85A32] cursor-pointer"
            />
          </div>

          <div className="inline-flex items-center gap-1.5 bg-white border border-[#E6E4DD] rounded-md px-2 py-1 shrink-0">
            <span className="text-[11px] font-mono font-semibold text-[#1A1917] whitespace-nowrap">
              Δf=±{engineResults.deltaF.toFixed(1)}Hz
            </span>
            <input
              type="range"
              min="0.5"
              max={Math.max(30, Math.ceil(engineResults.deltaF))}
              step="0.25"
              value={engineResults.deltaF}
              onChange={(e) => handleDeltaFChange(parseFloat(e.target.value))}
              aria-label="Peak Frequency Deviation delta f"
              className="w-16 accent-[#C85A32] cursor-pointer"
            />
          </div>

          {/* SNR */}
          <div className="inline-flex items-center gap-1.5 bg-white border border-[#E6E4DD] rounded-md px-2 py-1 shrink-0">
            <span className="text-[11px] font-mono font-semibold text-[#585651] whitespace-nowrap">
              SNR={awgnSnrDb.toFixed(0)}dB
            </span>
            <input
              type="range"
              min="-18"
              max="40"
              step="0.5"
              value={awgnSnrDb}
              onChange={(e) => setAwgnSnrDb(parseFloat(e.target.value))}
              aria-label="Channel Input SNR"
              className="w-14 accent-[#C85A32] cursor-pointer"
            />
          </div>
        </div>

        {/* Voice Override, Radio Audio & Reset */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="inline-flex items-center bg-white border border-[#E6E4DD] rounded overflow-hidden">
            <button
              type="button"
              onClick={() => radioVoiceFileInputRef.current?.click()}
              disabled={isDecodingRadioVoice}
              title={
                activeVoiceOverride
                  ? `${activeVoiceStation.label} Override: ${activeVoiceOverride.fileName}`
                  : `Upload optional voice override for ${activeVoiceStation.label} (${activeVoiceStation.fc} Hz)`
              }
              className="px-2 py-1 text-[11px] font-mono text-[#585651] hover:text-[#C85A32] hover:bg-[#FBF4F0] transition-colors cursor-pointer flex items-center gap-1"
            >
              <Upload className="w-3 h-3 text-[#C85A32]" />
              <span className="max-w-[100px] truncate">
                {isDecodingRadioVoice
                  ? '...'
                  : activeVoiceOverride
                  ? `${activeVoiceStation.label}: ${activeVoiceOverride.fileName}`
                  : `${activeVoiceStation.label} Audio`}
              </span>
            </button>
            {hasAnyVoiceOverride && (
              <button
                type="button"
                onClick={handleResetRadioVoiceOverrides}
                title="Reset to Built-In Voice"
                className="px-1.5 py-1 text-[10px] font-mono text-[#75736E] hover:text-red-600 border-l border-[#E6E4DD] cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleToggleRadioAudio}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer border ${
              isPlayingRadio
                ? 'bg-[#C85A32] text-white border-[#C85A32]'
                : 'bg-[#FBF4F0] text-[#C85A32] border-[#C85A32]/40 hover:bg-[#C85A32]/15'
            }`}
            title="Play Tuned Radio Audio"
          >
            {isPlayingRadio ? <StopSquare className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span>Radio Audio</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            title="Reset FM & Radio Parameters"
            className="p-1.5 rounded bg-white border border-[#E6E4DD] text-[#585651] hover:text-[#C85A32] hover:border-[#C85A32]/40 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    ) : (
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Presets */}
          <div className="inline-flex items-center gap-1 bg-white border border-[#E6E4DD] rounded-md p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => handleApplyLabPreset('nbfm')}
              className={`px-2 py-1 rounded text-[11px] font-mono font-semibold transition-colors cursor-pointer ${
                Math.abs(beta - 0.2) < 0.01
                  ? 'bg-[#C85A32] text-white'
                  : 'text-[#585651] hover:text-[#1A1917]'
              }`}
              title="Narrowband FM (β = 0.2)"
            >
              NBFM
            </button>
            <button
              type="button"
              onClick={() => handleApplyLabPreset('carrier_null')}
              className={`px-2 py-1 rounded text-[11px] font-mono font-semibold transition-colors cursor-pointer ${
                Math.abs(beta - 2.405) < 0.01
                  ? 'bg-[#C85A32] text-white'
                  : 'text-[#585651] hover:text-[#1A1917]'
              }`}
              title="Carrier Null J0(2.405) = 0"
            >
              Null 2.405
            </button>
            <button
              type="button"
              onClick={() => handleApplyLabPreset('wbfm')}
              className={`px-2 py-1 rounded text-[11px] font-mono font-semibold transition-colors cursor-pointer ${
                Math.abs(beta - 5.0) < 0.01
                  ? 'bg-[#C85A32] text-white'
                  : 'text-[#585651] hover:text-[#1A1917]'
              }`}
              title="Wideband FM (β = 5.0)"
            >
              WBFM
            </button>
          </div>

          {/* Message Type */}
          <div className="inline-flex items-center gap-0.5 bg-white border border-[#E6E4DD] rounded-md p-0.5 shrink-0">
            {(['sine', 'square', 'audio'] as MessageType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setMessageType(type)}
                className={`px-2 py-1 rounded text-[11px] font-semibold capitalize transition-colors cursor-pointer ${
                  messageType === type
                    ? 'bg-[#C85A32] text-white'
                    : 'text-[#585651] hover:text-[#1A1917]'
                }`}
              >
                {type === 'audio' ? 'Audio' : type}
              </button>
            ))}
            {(messageType === 'audio' || activeTab === 'demodulation') && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isDecodingAudio}
                title={`Upload .wav (${audioFileName})`}
                className="px-1.5 py-1 rounded text-[11px] font-mono text-[#585651] hover:text-[#C85A32] hover:bg-[#FBF4F0] transition-colors cursor-pointer flex items-center gap-1"
              >
                <Upload className="w-3 h-3" />
                <span>.wav</span>
              </button>
            )}
          </div>

          {/* Core Sliders: β, Δf, f_c, f_m, A_m, A_c */}
          <div className="inline-flex items-center gap-1.5 bg-[#FBF4F0] border border-[#C85A32]/25 rounded-md px-2 py-1 shrink-0">
            <span className="text-[11px] font-mono font-bold text-[#C85A32] whitespace-nowrap">
              β={formattedBeta}
            </span>
            <input
              type="range"
              min="0.1"
              max="10.0"
              step="0.05"
              value={Math.min(10.0, beta)}
              onChange={(e) => handleBetaChange(parseFloat(e.target.value))}
              aria-label="Modulation Index beta"
              className="w-18 accent-[#C85A32] cursor-pointer"
            />
          </div>

          <div
            className={`inline-flex items-center gap-1.5 border rounded-md px-2 py-1 shrink-0 ${
              isOverDeviation
                ? 'bg-red-50 border-red-300'
                : 'bg-white border-[#E6E4DD]'
            }`}
            title={`Peak Frequency Deviation Δf = k_f · A_m (k_f = ${kf.toFixed(2)} Hz/V)`}
          >
            <span
              className={`text-[11px] font-mono font-semibold whitespace-nowrap ${
                isOverDeviation ? 'text-red-700' : 'text-[#1A1917]'
              }`}
            >
              Δf=±{engineResults.deltaF.toFixed(1)}Hz
            </span>
            <input
              type="range"
              min="0.5"
              max={Math.max(30, Math.ceil(engineResults.deltaF))}
              step="0.25"
              value={engineResults.deltaF}
              onChange={(e) => handleDeltaFChange(parseFloat(e.target.value))}
              aria-label="Peak Frequency Deviation delta f"
              className="w-18 accent-[#C85A32] cursor-pointer"
            />
          </div>

          <div className="inline-flex items-center gap-1.5 bg-white border border-[#E6E4DD] rounded-md px-2 py-1 shrink-0">
            <span className="text-[11px] font-mono font-semibold text-[#585651] whitespace-nowrap">
              f<sub>c</sub>={carrierFreq.toFixed(0)}Hz
            </span>
            <input
              type="range"
              min="10"
              max="50"
              step="1"
              value={carrierFreq}
              onChange={(e) => setCarrierFreq(parseFloat(e.target.value))}
              aria-label="Carrier Frequency"
              className="w-16 accent-[#C85A32] cursor-pointer"
            />
          </div>

          <div className="inline-flex items-center gap-1.5 bg-white border border-[#E6E4DD] rounded-md px-2 py-1 shrink-0">
            <span className="text-[11px] font-mono font-semibold text-[#585651] whitespace-nowrap">
              f<sub>m</sub>={messageFreq.toFixed(1)}Hz
            </span>
            <input
              type="range"
              min="1.0"
              max="8.0"
              step="0.2"
              value={messageFreq}
              onChange={(e) => handleMessageFreqChange(parseFloat(e.target.value))}
              aria-label="Message Frequency"
              className="w-16 accent-[#C85A32] cursor-pointer"
            />
          </div>

          <div className="inline-flex items-center gap-1.5 bg-white border border-[#E6E4DD] rounded-md px-2 py-1 shrink-0">
            <span className="text-[11px] font-mono font-semibold text-[#585651] whitespace-nowrap">
              A<sub>m</sub>={messageAmp.toFixed(1)}V
            </span>
            <input
              type="range"
              min="0.2"
              max="2.0"
              step="0.1"
              value={messageAmp}
              onChange={(e) => handleMessageAmpChange(parseFloat(e.target.value))}
              aria-label="Message Amplitude"
              className="w-14 accent-[#C85A32] cursor-pointer"
            />
          </div>

          <div className="inline-flex items-center gap-1.5 bg-white border border-[#E6E4DD] rounded-md px-2 py-1 shrink-0">
            <span className="text-[11px] font-mono font-semibold text-[#585651] whitespace-nowrap">
              A<sub>c</sub>={carrierAmp.toFixed(1)}V
            </span>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              value={carrierAmp}
              onChange={(e) => setCarrierAmp(parseFloat(e.target.value))}
              aria-label="Carrier Amplitude"
              className="w-14 accent-[#C85A32] cursor-pointer"
            />
          </div>

          {activeTab === 'time_spectrum' ? (
            <div className="inline-flex items-center gap-0.5 bg-white border border-[#E6E4DD] rounded-md p-0.5 shrink-0">
              {[3, 4, 5].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setWindowPeriods(p)}
                  className={`px-1.5 py-1 rounded text-[11px] font-mono cursor-pointer transition-colors ${
                    windowPeriods === p
                      ? 'bg-[#C85A32] text-white font-semibold'
                      : 'text-[#585651] hover:text-[#1A1917]'
                  }`}
                  title={`Display ${p} message periods`}
                >
                  {p}T<sub>m</sub>
                </button>
              ))}
            </div>
          ) : (
            <>
              <div className="inline-flex items-center gap-1.5 bg-white border border-[#E6E4DD] rounded-md px-2 py-1 shrink-0">
                <span className="text-[11px] font-mono font-semibold text-[#585651] whitespace-nowrap">
                  SNR={awgnSnrDb.toFixed(0)}dB
                </span>
                <input
                  type="range"
                  min="0"
                  max="40"
                  step="0.5"
                  value={awgnSnrDb}
                  onChange={(e) => setAwgnSnrDb(parseFloat(e.target.value))}
                  aria-label="Channel Input SNR"
                  className="w-16 accent-[#C85A32] cursor-pointer"
                />
              </div>
              <div className="inline-flex items-center gap-1.5 bg-white border border-[#E6E4DD] rounded-md px-2 py-1 shrink-0">
                <span className="text-[11px] font-mono font-semibold text-[#585651] whitespace-nowrap">
                  DC={dcOffset >= 0 ? '+' : ''}
                  {dcOffset.toFixed(1)}V
                </span>
                <input
                  type="range"
                  min="-0.8"
                  max="0.8"
                  step="0.05"
                  value={dcOffset}
                  onChange={(e) => setDcOffset(parseFloat(e.target.value))}
                  aria-label="DC Offset"
                  className="w-14 accent-[#C85A32] cursor-pointer"
                />
              </div>
            </>
          )}
        </div>

        {/* Audio Playback & Reset */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleToggleOriginalAudio}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer border ${
              isPlayingOriginal
                ? 'bg-[#1A1917] text-white border-[#1A1917]'
                : 'bg-white text-[#1A1917] border-[#E6E4DD] hover:border-[#C85A32]/50'
            }`}
            title="Play Original Message Audio"
          >
            {isPlayingOriginal ? <StopSquare className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span>Orig</span>
          </button>

          <button
            type="button"
            onClick={handleToggleDemodAudio}
            className={`px-2.5 py-1 rounded text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer border ${
              isPlayingDemod
                ? 'bg-[#C85A32] text-white border-[#C85A32]'
                : 'bg-[#FBF4F0] text-[#C85A32] border-[#C85A32]/40 hover:bg-[#C85A32]/15'
            }`}
            title="Play Demodulated Audio"
          >
            {isPlayingDemod ? <StopSquare className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            <span>Demod</span>
          </button>

          <button
            type="button"
            onClick={handleReset}
            title="Reset All FM Parameters"
            className="p-1.5 rounded bg-white border border-[#E6E4DD] text-[#585651] hover:text-[#C85A32] hover:border-[#C85A32]/40 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-white text-[#1A1917] font-sans select-none">
      <input
        ref={radioVoiceFileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleRadioVoiceUpload}
        className="hidden"
      />
      {/* 1. Slim Mode Switcher Tab Bar */}
      <header className="h-10 px-3 border-b border-[#E6E4DD] bg-[#FAF9F6] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1 bg-white p-0.5 rounded-md border border-[#E6E4DD]">
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
          <button
            type="button"
            onClick={() => setActiveTab('radio')}
            className={`py-1 px-3 text-xs font-semibold rounded transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'radio'
                ? 'bg-[#C85A32] text-white shadow-xs'
                : 'text-[#585651] hover:text-[#1A1917] hover:bg-[#FAF9F6]'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Radio</span>
          </button>
        </div>
      </header>

      {/* 2. Full-Screen Workspace: 75% Left/Center Canvas + 25% Sticky Right Control Panel */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* ========================================================= */}
        {/* MAIN VISUALIZATION CANVAS (LEFT / CENTER 75% WIDTH)       */}
        {/* ========================================================= */}
        <main
          className={`w-full lg:w-3/4 flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden bg-white ${
            activeTab === 'radio' ? 'p-2 gap-1.5' : 'p-3 gap-2'
          }`}
        >
          {/* Streamlined Top Metrics */}
          {activeTab === 'radio' ? (
            <div className="px-2.5 py-1 bg-[#FAF9F6] border border-[#E6E4DD] rounded-md flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs font-mono shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[#75736E] uppercase text-[11px]">Tuned Freq</span>
                <span className="font-bold text-[#1A1917]">{radioTuneFreq.toFixed(1)} Hz</span>
              </div>
              <div
                className={`px-2 py-0.5 rounded border text-[11px] font-bold ${
                  radioResults.status === 'LOCKED'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : radioResults.status === 'ADJACENT OVERLAP'
                    ? 'bg-red-50 text-red-700 border-red-300'
                    : radioResults.status === 'OFF-TUNE'
                    ? 'bg-amber-50 text-amber-800 border-amber-300'
                    : 'bg-white text-[#585651] border-[#E6E4DD]'
                }`}
              >
                {radioResults.status} · {radioResults.signalStrengthPct}%
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#75736E] uppercase text-[11px]">Passband / B_T</span>
                <span className="font-bold text-[#C85A32]">
                  {radioPassbandWidth.toFixed(0)} Hz{' '}
                  <span className="font-normal text-[#75736E]">/ {radioResults.dominantBT.toFixed(1)} Hz</span>
                </span>
              </div>
            </div>
          ) : (
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
          )}

          {/* Over-Deviation Safety Warning Banner */}
          {activeTab !== 'radio' && isOverDeviation && (
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
                    key="fm-waveforms"
                    title="1. Time-Domain Waveforms"
                    xLabel="Time t (seconds)"
                    yLabel={waveformView === 'split' ? 'm(t) (V)' : 'Amplitude (V)'}
                    topPanelTitle={waveformView === 'split' ? 'Message Signal m(t)' : undefined}
                    domain={[0, engineResults.timeSpan]}
                    range={waveformView === 'split' ? [-msgYLimit, msgYLimit] : [-waveYLimit, waveYLimit]}
                    isExpanded={isPlotFullscreen}
                    onExpandedChange={setIsPlotFullscreen}
                    fullscreenHeaderControls={fullscreenHeaderControls}
                    renderFullscreenControls={renderFullscreenControls}
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
                    key="fm-freq-dev"
                    title="2. Instantaneous Frequency Deviation"
                    statusBadge={isOverDeviation ? '0 Hz Clipping' : undefined}
                    xLabel="Time t (seconds)"
                    yLabel="Frequency (Hz)"
                    domain={[0, engineResults.timeSpan]}
                    range={[fiYMin, fiYMax]}
                    isExpanded={isPlotFullscreen}
                    onExpandedChange={setIsPlotFullscreen}
                    fullscreenHeaderControls={fullscreenHeaderControls}
                    renderFullscreenControls={renderFullscreenControls}
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
                    key="fm-spectrum"
                    title="3. Frequency Spectrum"
                    xLabel="Frequency f (Hz)"
                    yLabel="Magnitude (V)"
                    domain={spectrumDomain}
                    range={[0, spectrumYMax]}
                    carsonBands={spectrumCarsonBands}
                    isExpanded={isPlotFullscreen}
                    onExpandedChange={setIsPlotFullscreen}
                    fullscreenHeaderControls={fullscreenHeaderControls}
                    renderFullscreenControls={renderFullscreenControls}
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
                    key="fm-demod-recovered"
                    title="1. Recovered Message Signal"
                    xLabel="Time t (seconds)"
                    yLabel="Amplitude (V)"
                    domain={[0, engineResults.timeSpan]}
                    range={[
                      -Math.max(1.8, (messageAmp + Math.abs(dcOffset)) * 1.35),
                      Math.max(1.8, (messageAmp + Math.abs(dcOffset)) * 1.35),
                    ]}
                    isExpanded={isPlotFullscreen}
                    onExpandedChange={setIsPlotFullscreen}
                    fullscreenHeaderControls={fullscreenHeaderControls}
                    renderFullscreenControls={renderFullscreenControls}
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
                      key="fm-demod-discrim"
                      title="2. Discriminator Stage Output"
                      xLabel="Time t (seconds)"
                      yLabel="Level (V)"
                      domain={[0, engineResults.timeSpan]}
                      range={[-carrierAmp * 1.6, carrierAmp * 1.6]}
                      isExpanded={isPlotFullscreen}
                      onExpandedChange={setIsPlotFullscreen}
                      fullscreenHeaderControls={fullscreenHeaderControls}
                      renderFullscreenControls={renderFullscreenControls}
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
                      key="fm-demod-pll"
                      title="2. PLL Phase Error"
                      xLabel="Time t (seconds)"
                      yLabel="Phase Error"
                      domain={[0, engineResults.timeSpan]}
                      range={[-1.2, 1.2]}
                      isExpanded={isPlotFullscreen}
                      onExpandedChange={setIsPlotFullscreen}
                      fullscreenHeaderControls={fullscreenHeaderControls}
                      renderFullscreenControls={renderFullscreenControls}
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
                    key="fm-demod-error"
                    title="3. Demodulation Error Residual"
                    xLabel="Time t (seconds)"
                    yLabel="Error (V)"
                    domain={[0, engineResults.timeSpan]}
                    range={[-1.5, 1.5]}
                    isExpanded={isPlotFullscreen}
                    onExpandedChange={setIsPlotFullscreen}
                    fullscreenHeaderControls={fullscreenHeaderControls}
                    renderFullscreenControls={renderFullscreenControls}
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

          {/* ======================================================== */}
          {/* VIEW 3: RADIO TUNER, PASSBAND SPECTRUM & DEMOD OUTPUT    */}
          {/* ======================================================== */}
          {activeTab === 'radio' && (
            <div className="flex-1 min-h-0 flex flex-col gap-1.5 overflow-hidden">
              <div className="flex-1 min-h-0">
                <FmInteractivePlot
                  key="fm-radio-spectrum"
                  title="1. Broadcast Spectrum & Passband"
                  compactHeader={true}
                  headerControls={
                    isPlotFullscreen ? undefined : (
                      <div className="inline-flex items-center gap-1 font-mono text-[11px] whitespace-nowrap">
                        {radioResults.aciPct > 0 ? (
                          <span className="px-1.5 py-0.5 rounded border border-red-200 bg-red-50 text-red-700 font-semibold">
                            ACI {radioResults.aciPct}%
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded border border-[#E6E4DD] bg-[#FAF9F6] text-[#585651]">
                            {radioResults.status === 'NO SIGNAL'
                              ? 'Empty Band'
                              : `${radioResults.dominantStation.label} (${radioResults.dominantStation.fc}Hz)`}
                          </span>
                        )}
                        <span
                          className={`px-1.5 py-0.5 rounded border font-semibold ${
                            radioResults.status === 'LOCKED'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : radioResults.status === 'ADJACENT OVERLAP'
                              ? 'bg-red-50 text-red-700 border-red-300'
                              : radioResults.status === 'OFF-TUNE'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : 'bg-[#FAF9F6] text-[#585651] border-[#E6E4DD]'
                          }`}
                        >
                          f_tune={radioTuneFreq.toFixed(1)}Hz · B_rx={radioPassbandWidth.toFixed(0)}Hz
                        </span>
                      </div>
                    )
                  }
                  hideLegend={true}
                  xLabel="Frequency f (Hz)"
                  yLabel="Magnitude (V)"
                  domain={[0, RADIO_DOMAIN_MAX]}
                  range={[0, radioResults.spectrumYMax]}
                  isExpanded={isPlotFullscreen && radioSubTab === 'spectrum'}
                  onExpandedChange={(exp) => {
                    if (exp) setRadioSubTab('spectrum');
                    setIsPlotFullscreen(exp);
                  }}
                  fullscreenHeaderControls={fullscreenHeaderControls}
                  renderFullscreenControls={renderFullscreenControls}
                  passbandOverlay={{
                    center: radioTuneFreq,
                    bandwidth: radioPassbandWidth,
                    maxGainY: radioResults.spectrumYMax * 0.72,
                    status: radioResults.status,
                    stations: RADIO_STATIONS.map((st) => ({
                      fc: st.fc,
                      label: `${st.label} · ${st.fc}Hz`,
                      color: st.color,
                      isDominant:
                        radioResults.status !== 'NO SIGNAL' &&
                        radioResults.dominantStation.id === st.id,
                    })),
                  }}
                  series={[
                    {
                      id: 'radio-band-stems',
                      name: 'Station Spectra',
                      color: '#585651',
                      type: 'spectrum',
                      spectralLines: radioResults.spectralLines,
                    },
                  ]}
                  className="h-full"
                />
              </div>

              <div className="flex-1 min-h-0">
                <FmInteractivePlot
                  key="fm-radio-demod"
                  title="2. Demodulated Radio Output"
                  compactHeader={true}
                  statusBadge={`SNR ${radioResults.effectiveSnrDb.toFixed(1)} dB`}
                  xLabel="Time t (seconds)"
                  yLabel="Amplitude (V)"
                  domain={[0, 1.6]}
                  range={[-1.8, 1.8]}
                  isExpanded={isPlotFullscreen && radioSubTab === 'demod'}
                  onExpandedChange={(exp) => {
                    if (exp) setRadioSubTab('demod');
                    setIsPlotFullscreen(exp);
                  }}
                  fullscreenHeaderControls={fullscreenHeaderControls}
                  renderFullscreenControls={renderFullscreenControls}
                  series={
                    radioResults.status === 'NO SIGNAL'
                      ? [
                          {
                            id: 'radio-rec-m',
                            name: 'Inter-Station Static',
                            color: '#75736E',
                            strokeWidth: 1.8,
                            points: radioResults.mRecoveredPoints,
                          },
                        ]
                      : [
                          {
                            id: 'radio-target-m',
                            name: `${radioResults.dominantStation.label} Reference`,
                            color: '#1A1917',
                            strokeWidth: 1.5,
                            dash: '4 3',
                            points: radioResults.mTargetPoints,
                          },
                          {
                            id: 'radio-rec-m',
                            name: 'Recovered Output',
                            color: '#C85A32',
                            strokeWidth: 2.1,
                            points: radioResults.mRecoveredPoints,
                          },
                        ]
                  }
                  className="h-full"
                />
              </div>

              {/* Compact Radio Audio Bar */}
              <div className="px-2.5 py-1.5 bg-[#FAF9F6] border border-[#E6E4DD] rounded-md flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <Radio className="w-3.5 h-3.5 text-[#C85A32] shrink-0" />
                  <span className="text-xs font-semibold text-[#1A1917] truncate">
                    {radioResults.status === 'NO SIGNAL'
                      ? 'Inter-Station Static'
                      : `${radioResults.dominantStation.label} · ${radioResults.dominantStation.programLabel}`}
                  </span>
                  <span className="text-[11px] font-mono text-[#75736E] shrink-0">
                    Capture {radioResults.signalStrengthPct}% · SNR {radioResults.effectiveSnrDb.toFixed(1)} dB
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleToggleRadioAudio}
                    className={`py-1 px-2.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                      isPlayingRadio
                        ? 'bg-[#C85A32] text-white'
                        : 'bg-white hover:bg-[#FBF4F0] border border-[#C85A32]/40 text-[#C85A32]'
                    }`}
                  >
                    {isPlayingRadio ? <StopSquare className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    <span>{isPlayingRadio ? 'Stop Audio' : 'Play Radio Audio'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* ========================================================= */}
        {/* RIGHT-SIDE CONTEXT-AWARE CONTROL PANEL (25% OF WIDTH)     */}
        {/* ========================================================= */}
        <aside className="w-full lg:w-1/4 lg:min-w-[285px] lg:max-w-[350px] h-full bg-[#FAF9F6] border-t lg:border-t-0 lg:border-l border-[#E6E4DD] p-3 flex flex-col justify-between overflow-y-auto shrink-0">
          <div className={activeTab === 'radio' ? 'space-y-3' : 'space-y-5'}>
            {/* Sidebar Header */}
            <div className={`flex items-center justify-between border-b border-[#E6E4DD] ${activeTab === 'radio' ? 'pb-2' : 'pb-2.5'}`}>
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#C85A32]" />
                <h2 className="text-[13px] font-heading font-semibold tracking-wider uppercase text-[#1A1917]">
                  {activeTab === 'time_spectrum'
                    ? 'Signal Parameters'
                    : activeTab === 'radio'
                    ? 'Radio Tuner'
                    : 'Receiver Parameters'}
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

            {activeTab === 'radio' ? (
              <>
                {/* Sample FM Stations */}
                <section className="space-y-1.5">
                  <div className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-[#75736E]">
                    FM Stations
                  </div>
                  <div className="grid grid-cols-2 gap-1">
                    {RADIO_STATIONS.map((st) => {
                      const isTuned = Math.abs(radioTuneFreq - st.fc) < 0.6;
                      const customClip = stationVoiceOverrides[st.id];
                      const progLabel = customClip ? customClip.fileName : st.programLabel;
                      return (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setRadioTuneFreq(st.fc)}
                          className={`py-1 px-2 rounded border text-left transition-colors cursor-pointer ${
                            isTuned
                              ? 'bg-[#C85A32] text-white border-[#C85A32]'
                              : 'bg-white text-[#1A1917] border-[#E6E4DD] hover:border-[#C85A32]/50'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px] font-mono font-bold leading-tight">
                            <span>{st.label}</span>
                            <span>{st.fc} Hz</span>
                          </div>
                          <div
                            className={`text-[10px] font-mono truncate leading-tight ${
                              isTuned ? 'text-white/85' : 'text-[#75736E]'
                            }`}
                          >
                            {progLabel}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Compact Optional Audio Override + Reset */}
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => radioVoiceFileInputRef.current?.click()}
                      disabled={isDecodingRadioVoice}
                      title={`Optional custom audio override for ${activeVoiceStation.label} (${activeVoiceStation.fc} Hz)`}
                      className="flex-1 min-w-0 py-1 px-2 bg-white border border-[#E6E4DD] hover:border-[#C85A32]/50 rounded text-[11px] font-mono text-[#1A1917] hover:bg-[#FBF4F0] flex items-center gap-1.5 cursor-pointer transition-colors text-left"
                    >
                      <Upload className="w-3 h-3 text-[#C85A32] shrink-0" />
                      <span className="truncate">
                        {isDecodingRadioVoice
                          ? 'Decoding...'
                          : activeVoiceOverride
                          ? `${activeVoiceStation.label}: ${activeVoiceOverride.fileName}`
                          : `Override ${activeVoiceStation.label} Audio`}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResetRadioVoiceOverrides}
                      disabled={!hasAnyVoiceOverride}
                      title="Restore Built-In Station Voices"
                      className={`px-2 py-1 rounded border text-[10.5px] font-mono transition-colors shrink-0 ${
                        hasAnyVoiceOverride
                          ? 'bg-white border-[#E6E4DD] text-[#585651] hover:text-[#C85A32] hover:border-[#C85A32]/50 cursor-pointer'
                          : 'bg-[#FAF9F6] border-[#E6E4DD]/60 text-[#A8A6A1] cursor-default'
                      }`}
                    >
                      Reset
                    </button>
                  </div>
                </section>

                {/* Primary Tuning & Passband Controls */}
                <section className="space-y-2 pt-2.5 border-t border-[#E6E4DD]">
                  <div className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-[#75736E]">
                    Receiver Tuning
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex justify-between text-xs font-mono text-[#585651]">
                      <span>Tune Frequency (f_tune)</span>
                      <span className="font-bold text-[#C85A32]">{radioTuneFreq.toFixed(1)} Hz</span>
                    </div>
                    <input
                      type="range"
                      min="8"
                      max="132"
                      step="0.5"
                      value={radioTuneFreq}
                      onChange={(e) => setRadioTuneFreq(parseFloat(e.target.value))}
                      className="w-full accent-[#C85A32] cursor-pointer"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <div className="flex justify-between text-xs font-mono text-[#585651]">
                      <span>Passband Width (B_rx)</span>
                      <span className="font-bold text-[#1A1917]">{radioPassbandWidth.toFixed(0)} Hz</span>
                    </div>
                    <input
                      type="range"
                      min="8"
                      max="45"
                      step="1"
                      value={radioPassbandWidth}
                      onChange={(e) => setRadioPassbandWidth(parseFloat(e.target.value))}
                      className="w-full accent-[#C85A32] cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-1 pt-0.5">
                    <button
                      type="button"
                      onClick={() => handleBetaChange(0.6)}
                      className={`py-1 px-1.5 rounded border text-[11px] font-mono font-semibold cursor-pointer transition-colors ${
                        Math.abs(beta - 0.6) < 0.05
                          ? 'bg-[#C85A32] text-white border-[#C85A32]'
                          : 'bg-white text-[#1A1917] border-[#E6E4DD] hover:border-[#C85A32]/50'
                      }`}
                    >
                      Narrow
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBetaChange(2.5)}
                      className={`py-1 px-1.5 rounded border text-[11px] font-mono font-semibold cursor-pointer transition-colors ${
                        Math.abs(beta - 2.5) < 0.05
                          ? 'bg-[#C85A32] text-white border-[#C85A32]'
                          : 'bg-white text-[#1A1917] border-[#E6E4DD] hover:border-[#C85A32]/50'
                      }`}
                    >
                      Nominal
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBetaChange(9.0)}
                      className={`py-1 px-1.5 rounded border text-[11px] font-mono font-semibold cursor-pointer transition-colors ${
                        Math.abs(beta - 9.0) < 0.05
                          ? 'bg-[#C85A32] text-white border-[#C85A32]'
                          : 'bg-white text-[#1A1917] border-[#E6E4DD] hover:border-[#C85A32]/50'
                      }`}
                    >
                      Wide
                    </button>
                  </div>
                </section>

                {/* Collapsible Advanced Fine-Tuning (β, Δf, SNR) */}
                <section className="pt-2.5 border-t border-[#E6E4DD]">
                  <button
                    type="button"
                    onClick={() => setShowRadioAdvanced((v) => !v)}
                    className="w-full flex items-center justify-between py-1 px-1.5 rounded bg-white border border-[#E6E4DD] hover:border-[#C85A32]/40 text-left cursor-pointer transition-colors"
                  >
                    <span className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-[#585651] flex items-center gap-1">
                      {showRadioAdvanced ? (
                        <ChevronDown className="w-3.5 h-3.5 text-[#C85A32]" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-[#75736E]" />
                      )}
                      <span>Fine-Tuning</span>
                    </span>
                    <span className="text-[10.5px] font-mono text-[#75736E]">
                      β={formattedBeta} · ±{engineResults.deltaF.toFixed(1)}Hz · {awgnSnrDb.toFixed(0)}dB
                    </span>
                  </button>

                  {showRadioAdvanced && (
                    <div className="mt-2 space-y-2 px-1">
                      <div className="space-y-0.5">
                        <div className="flex justify-between text-xs font-mono text-[#585651]">
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

                      <div className="space-y-0.5">
                        <div className="flex justify-between text-xs font-mono text-[#585651]">
                          <span>Peak Deviation (Δf)</span>
                          <span className="font-bold text-[#1A1917]">±{engineResults.deltaF.toFixed(1)} Hz</span>
                        </div>
                        <input
                          type="range"
                          min="0.5"
                          max={Math.max(30, Math.ceil(engineResults.deltaF))}
                          step="0.25"
                          value={engineResults.deltaF}
                          onChange={(e) => handleDeltaFChange(parseFloat(e.target.value))}
                          className="w-full accent-[#C85A32] cursor-pointer"
                        />
                      </div>

                      <div className="space-y-0.5">
                        <div className="flex justify-between text-xs font-mono text-[#585651]">
                          <span>Channel Input SNR</span>
                          <span className="font-bold text-[#1A1917]">{awgnSnrDb.toFixed(1)} dB</span>
                        </div>
                        <input
                          type="range"
                          min="-18"
                          max="40"
                          step="0.5"
                          value={awgnSnrDb}
                          onChange={(e) => setAwgnSnrDb(parseFloat(e.target.value))}
                          className="w-full accent-[#C85A32] cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </section>
              </>
            ) : activeTab === 'time_spectrum' ? (
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
