/**
 * Three-Stage Interactive Signal Lab Views for Module 2.3 — SSB-SC
 * - Stage 01: 01. MESSAGE SIGNAL m(t)
 * - Stage 02: 02. SSB MODULATION
 * - Stage 03: 03. SSB DEMODULATION
 * - Completion Summary + Restart Lab
 */

import React from 'react';
import {
  SlidersHorizontal,
  Activity,
  RotateCcw,
  ArrowRight,
  ArrowDown,
  CheckCircle2,
  AlertTriangle,
  Award,
  Radio,
  Waves,
  Filter,
  X,
} from 'lucide-react';
import { MathView } from '../../../components/MathView';
import {
  SsbSimulationData,
  SsbParams,
  MessageShape,
  SidebandMode,
} from './ssbMathEngine';
import { SsbTimePlot, SsbSpectrumPlot, SpectralMarker } from './SsbPlotCanvas';

export type StageNumber = 1 | 2 | 3;

export interface StageViewProps {
  sim: SsbSimulationData;
  simTime: number;
  onSeekTime: (t: number) => void;
  tWindow: number;
  isGridVisible: boolean;
  onUpdateParams: (patch: Partial<SsbParams>) => void;
  onResetStage: () => void;
}

/* ============================================================================
 * STAGE 01 — MESSAGE SIGNAL
 * ==========================================================================*/
export const SsbStage01Message: React.FC<StageViewProps> = ({
  sim,
  simTime,
  onSeekTime,
  tWindow,
  isGridVisible,
  onUpdateParams,
  onResetStage,
}) => {
  const { params } = sim;
  const isCosine = params.messageShape === 'single_tone';
  const periodSec = 1 / Math.max(0.1, params.messageFreq);
  const cyclesInWindow = params.messageFreq * tWindow;

  return (
    <div className="space-y-4">
      {/* Stage Section Title */}
      <div className="flex items-center gap-2">
        <Waves className="w-4 h-4 text-[#C85A32]" />
        <h2 className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-[#1A1917]">
          01. MESSAGE SIGNAL m(t)
        </h2>
      </div>

      {/* Light Warm-Grey Beginner Guide Card */}
      <div className="bg-[#FAF9F6] rounded-xl border border-[#E6E4DD] p-4 space-y-1">
        <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#C85A32]">
          BEGINNER GUIDE · 01 MESSAGE SIGNAL
        </div>
        <p className="text-sm text-[#484642] leading-relaxed">
          This is the original information signal. It is the signal we want to transmit.
        </p>
      </div>

      {/* Controls + Main Waveform Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Stage 01 Controls + Telemetry */}
        <div className="lg:col-span-4 space-y-4 min-w-0">
          <div className="bg-white rounded-xl border border-[#E6E4DD] p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E6E4DD]">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#C85A32]" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1917]">
                  SIGNAL CONTROLS
                </h3>
              </div>
              <button
                type="button"
                onClick={onResetStage}
                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[#E6E4DD] bg-[#FAF9F6] hover:bg-white text-[11px] font-mono font-semibold text-[#585651] hover:text-[#1A1917] transition-colors cursor-pointer"
                title="Reset message parameters"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            {/* Cosine & Two-Tone Selection */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#75736E]">
                Waveform Selection
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { id: 'single_tone', label: 'Cosine' },
                    { id: 'two_tone', label: 'Two-Tone' },
                  ] as { id: MessageShape; label: string }[]
                ).map((option) => {
                  const active = params.messageShape === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => onUpdateParams({ messageShape: option.id })}
                      className={`py-2 px-3 rounded-lg text-xs font-mono font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                        active
                          ? 'bg-[#1A1917] text-white border-[#1A1917]'
                          : 'bg-[#FAF9F6] text-[#585651] border-[#E6E4DD] hover:text-[#1A1917] hover:bg-white'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Message Frequency Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[#585651]">Message frequency (f_m)</span>
                <span className="font-bold text-[#0284C7] tabular-nums">
                  {params.messageFreq.toFixed(1)} Hz
                </span>
              </div>
              <input
                type="range"
                aria-label="Message frequency fm in Hz"
                min={1.0}
                max={5.0}
                step={0.5}
                value={params.messageFreq}
                onChange={(e) =>
                  onUpdateParams({ messageFreq: parseFloat(e.target.value) })
                }
                className="w-full accent-[#0284C7] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-[#8A8882]">
                <span>1.0 Hz (Min)</span>
                <span>5.0 Hz (Max)</span>
              </div>
            </div>

            {/* Message Amplitude Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[#585651]">Message amplitude (A_m)</span>
                <span className="font-bold text-[#0284C7] tabular-nums">
                  {params.messageAmp.toFixed(1)} V
                </span>
              </div>
              <input
                type="range"
                aria-label="Message amplitude Am in Volts"
                min={0.5}
                max={2.5}
                step={0.1}
                value={params.messageAmp}
                onChange={(e) =>
                  onUpdateParams({ messageAmp: parseFloat(e.target.value) })
                }
                className="w-full accent-[#0284C7] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-[#8A8882]">
                <span>0.5 V (Min)</span>
                <span>2.5 V (Max)</span>
              </div>
            </div>

            {/* Signal Equation */}
            <div className="p-3 bg-[#FAF9F6] rounded-lg border border-[#E6E4DD]">
              <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#75736E] mb-1">
                Signal Equation
              </div>
              <MathView
                math={
                  isCosine
                    ? 'm(t) = A_m \\cos(2\\pi f_m t)'
                    : 'm(t) = A_m[0.65\\cos(2\\pi f_m t) + 0.35\\cos(4\\pi f_m t)]'
                }
                displayMode={true}
              />
            </div>
          </div>

          {/* Stage 01 Numerical Information */}
          <div className="bg-white rounded-xl border border-[#E6E4DD] p-4 shadow-2xs space-y-2.5">
            <div className="flex items-center gap-2 pb-2 border-b border-[#E6E4DD]">
              <Activity className="w-4 h-4 text-[#C85A32]" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1917]">
                MESSAGE MEASUREMENTS
              </h3>
            </div>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-[#585651]">Frequency (f_m)</span>
                <span className="font-bold text-[#0284C7] tabular-nums">
                  {params.messageFreq.toFixed(1)} Hz
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#585651]">Amplitude (A_m)</span>
                <span className="font-bold text-[#1A1917] tabular-nums">
                  {params.messageAmp.toFixed(1)} V
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#585651]">Period (T_m)</span>
                <span className="font-bold text-[#1A1917] tabular-nums">
                  {periodSec.toFixed(3)} s
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#585651]">Cycles ({tWindow.toFixed(1)}s window)</span>
                <span className="font-bold text-[#1A1917] tabular-nums">
                  {cyclesInWindow.toFixed(1)} cycles
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: One Main Message Waveform Graph */}
        <div className="lg:col-span-8 min-w-0">
          <SsbTimePlot
            title="Message Signal Waveform m(t)"
            subtitle={`fm = ${params.messageFreq.toFixed(1)} Hz · Am = ${params.messageAmp.toFixed(1)} V`}
            timeSteps={sim.timeSteps}
            values={sim.message}
            primaryLabel={isCosine ? 'm(t) (cosine)' : 'm(t) (two-tone)'}
            primaryColor="#0284C7"
            simTime={simTime}
            onSeekTime={onSeekTime}
            tWindow={tWindow}
            isGridVisible={isGridVisible}
            heightClass="h-[300px]"
            badgeText={isCosine ? 'Cosine' : 'Two-Tone'}
            showZeroCrossings={true}
            rightMeasurementText={`${params.messageFreq.toFixed(1)} cycles/s`}
          />
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * STAGE 02 — SSB MODULATION
 * ==========================================================================*/
export const SsbStage02Modulation: React.FC<StageViewProps> = ({
  sim,
  simTime,
  onSeekTime,
  tWindow,
  isGridVisible,
  onUpdateParams,
  onResetStage,
}) => {
  const { params } = sim;
  const isUsb = params.sideband === 'usb';
  const isCosine = params.messageShape === 'single_tone';
  const fc = params.carrierFreq;
  const fm = params.messageFreq;
  const Ac = params.carrierAmp;
  const Am = params.messageAmp;

  const selectedSidebandFreq = isUsb ? fc + fm : Math.max(0, fc - fm);
  const sidebandAmp = (Ac * Am) / 2;

  const transmittedFreqLabel = isCosine
    ? `${selectedSidebandFreq.toFixed(1)} Hz`
    : isUsb
    ? `${sim.usbFreqRange[0].toFixed(1)}–${sim.usbFreqRange[1].toFixed(1)} Hz`
    : `${sim.lsbFreqRange[0].toFixed(1)}–${sim.lsbFreqRange[1].toFixed(1)} Hz`;

  // Ideal SSB-SC spectrum highlights ONLY the selected sideband (no transmitted carrier component)
  const spectrumMarkers: SpectralMarker[] = isCosine
    ? [
        {
          freq: selectedSidebandFreq,
          label: `${isUsb ? 'fc + fm' : 'fc − fm'} = ${selectedSidebandFreq.toFixed(1)} Hz`,
          color: '#0284C7',
        },
      ]
    : [
        {
          freq: isUsb ? fc + 1.5 * fm : Math.max(0, fc - 1.5 * fm),
          label: `${isUsb ? 'USB' : 'LSB'}: ${transmittedFreqLabel}`,
          color: '#0284C7',
          dashed: true,
        },
      ];

  return (
    <div className="space-y-4">
      {/* Stage Section Title */}
      <div className="flex items-center gap-2">
        <Radio className="w-4 h-4 text-[#C85A32]" />
        <h2 className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-[#1A1917]">
          02. SSB MODULATION
        </h2>
      </div>

      {/* Light Warm-Grey Beginner Guide Card */}
      <div className="bg-[#FAF9F6] rounded-xl border border-[#E6E4DD] p-4 space-y-1">
        <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#C85A32]">
          BEGINNER GUIDE · 02 SSB MODULATION
        </div>
        <p className="text-sm text-[#484642] leading-relaxed">
          SSB modulation transmits only one sideband. Choose USB or LSB and observe the transmitted signal.
        </p>
      </div>

      {/* Controls + Main Waveform & Compact Spectrum */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Stage 02 Controls + Carrier Suppression Info */}
        <div className="lg:col-span-4 space-y-4 min-w-0">
          <div className="bg-white rounded-xl border border-[#E6E4DD] p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E6E4DD]">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#C85A32]" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1917]">
                  MODULATION CONTROLS
                </h3>
              </div>
              <button
                type="button"
                onClick={onResetStage}
                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[#E6E4DD] bg-[#FAF9F6] hover:bg-white text-[11px] font-mono font-semibold text-[#585651] hover:text-[#1A1917] transition-colors cursor-pointer"
                title="Reset modulation parameters"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            {/* USB / LSB Selection Buttons */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#75736E]">
                Sideband Selection
              </div>
              <div className="grid grid-cols-1 gap-1.5">
                {(
                  [
                    { id: 'usb', label: 'Upper Sideband (USB)' },
                    { id: 'lsb', label: 'Lower Sideband (LSB)' },
                  ] as { id: SidebandMode; label: string }[]
                ).map((option) => {
                  const active = params.sideband === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => onUpdateParams({ sideband: option.id })}
                      className={`py-2 px-3 rounded-lg text-xs font-mono font-semibold border text-left transition-colors cursor-pointer ${
                        active
                          ? 'bg-[#1A1917] text-white border-[#1A1917]'
                          : 'bg-[#FAF9F6] text-[#585651] border-[#E6E4DD] hover:text-[#1A1917] hover:bg-white'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Carrier Frequency Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[#585651]">Carrier frequency (f_c)</span>
                <span className="font-bold text-[#0284C7] tabular-nums">
                  {fc.toFixed(0)} Hz
                </span>
              </div>
              <input
                type="range"
                aria-label="Carrier frequency fc in Hz"
                min={16.0}
                max={36.0}
                step={1.0}
                value={fc}
                onChange={(e) =>
                  onUpdateParams({ carrierFreq: parseFloat(e.target.value) })
                }
                className="w-full accent-[#0284C7] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-[#8A8882]">
                <span>16 Hz (Min)</span>
                <span>36 Hz (Max)</span>
              </div>
            </div>

            {/* Mathematical Equations */}
            <div className="space-y-2 pt-1">
              <div
                className={`p-2.5 rounded-lg border text-xs ${
                  isUsb
                    ? 'bg-[#F0F9FF] border-[#0284C7]/40'
                    : 'bg-[#FAF9F6] border-[#E6E4DD]'
                }`}
              >
                <div className="text-[10px] font-mono font-bold uppercase text-[#0284C7] mb-0.5">
                  USB {isUsb ? '· Active' : ''}
                </div>
                <MathView
                  math="s_{\text{USB}}(t) = \frac{A_c A_m}{2}\cos\big(2\pi(f_c + f_m)t\big)"
                  displayMode={true}
                />
              </div>
              <div
                className={`p-2.5 rounded-lg border text-xs ${
                  !isUsb
                    ? 'bg-[#F0F9FF] border-[#0284C7]/40'
                    : 'bg-[#FAF9F6] border-[#E6E4DD]'
                }`}
              >
                <div className="text-[10px] font-mono font-bold uppercase text-[#0284C7] mb-0.5">
                  LSB {!isUsb ? '· Active' : ''}
                </div>
                <MathView
                  math="s_{\text{LSB}}(t) = \frac{A_c A_m}{2}\cos\big(2\pi(f_c - f_m)t\big)"
                  displayMode={true}
                />
              </div>
            </div>
          </div>

          {/* Carrier Suppression Technical Information Card */}
          <div className="bg-white rounded-xl border border-[#E6E4DD] p-4 shadow-2xs space-y-2.5">
            <div className="flex items-center gap-2 pb-2 border-b border-[#E6E4DD]">
              <Activity className="w-4 h-4 text-[#C85A32]" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1917]">
                CARRIER SUPPRESSION
              </h3>
            </div>
            <p className="text-xs text-[#585651] leading-relaxed">
              In ideal SSB-SC modulation, the carrier is suppressed and only one sideband is transmitted. This reduces the bandwidth and power wasted on the carrier and the unwanted sideband.
            </p>
            <div className="pt-2 border-t border-[#E6E4DD] space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-[#585651]">Selected Sideband</span>
                <span className="font-bold text-[#0284C7]">
                  {isUsb ? 'USB' : 'LSB'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#585651]">Sideband Frequency</span>
                <span className="font-bold text-[#0284C7] tabular-nums">
                  {transmittedFreqLabel}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#585651]">Carrier Status</span>
                <span className="font-bold text-[#059669]">Suppressed (0 V)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Main SSB Waveform + Compact Spectrum */}
        <div className="lg:col-span-8 space-y-4 min-w-0">
          <SsbTimePlot
            title={`Transmitted SSB Signal ${isUsb ? 's_USB(t)' : 's_LSB(t)'}`}
            subtitle={`f = ${transmittedFreqLabel} · Peak = ${sidebandAmp.toFixed(2)} V`}
            timeSteps={sim.timeSteps}
            values={sim.activeSsbSignal}
            primaryLabel={isUsb ? 's_USB(t) (Upper Sideband)' : 's_LSB(t) (Lower Sideband)'}
            primaryColor="#0284C7"
            simTime={simTime}
            onSeekTime={onSeekTime}
            tWindow={tWindow}
            isGridVisible={isGridVisible}
            heightClass="h-[245px]"
            badgeText={isUsb ? 'USB' : 'LSB'}
            rightMeasurementText={`${transmittedFreqLabel} · ${sidebandAmp.toFixed(2)} V peak`}
          />

          <SsbSpectrumPlot
            title={`SSB-SC Frequency Spectrum |S_${isUsb ? 'USB' : 'LSB'}(f)|`}
            subtitle="Single sideband only (carrier suppressed)"
            spectrum={sim.activeSsbSpectrum}
            maxFreqHz={sim.maxSpectrumFreq}
            barColor="#0284C7"
            shadedBand={{
              fStart: isUsb ? fc : Math.max(0, fc - sim.messageBandwidth),
              fEnd: isUsb ? fc + sim.messageBandwidth : fc,
              label: `${isUsb ? 'USB' : 'LSB'} (${sim.messageBandwidth.toFixed(1)} Hz)`,
              color: '#0284C7',
            }}
            markers={spectrumMarkers}
            isGridVisible={isGridVisible}
            heightClass="h-[175px]"
            badgeText={isUsb ? `fc + fm` : `fc − fm`}
            leftLegendText={`Highlighted: ${isUsb ? 'USB (fc + fm)' : 'LSB (fc − fm)'} · Carrier at fc = 0 V`}
            rightMeasurementText={`BW = ${sim.messageBandwidth.toFixed(1)} Hz`}
          />
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * STAGE 03 — SSB DEMODULATION
 * ==========================================================================*/
export const SsbStage03Demodulation: React.FC<StageViewProps> = ({
  sim,
  simTime,
  onSeekTime,
  tWindow,
  isGridVisible,
  onUpdateParams,
  onResetStage,
}) => {
  const { params, rmse, loFreq } = sim;

  const isFreqSynced = Math.abs(params.loFreqOffset) < 0.05;
  const isPhaseSynced = Math.abs(params.loPhaseDeg) < 2;
  const isSynced = isFreqSynced && isPhaseSynced;

  let syncStatusLabel = 'Synchronized';
  if (!isFreqSynced && !isPhaseSynced) {
    syncStatusLabel = 'Frequency & Phase mismatch';
  } else if (!isFreqSynced) {
    syncStatusLabel = 'Frequency mismatch';
  } else if (!isPhaseSynced) {
    syncStatusLabel = 'Phase mismatch';
  }

  return (
    <div className="space-y-4">
      {/* Stage Section Title */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-[#C85A32]" />
        <h2 className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-[#1A1917]">
          03. SSB DEMODULATION
        </h2>
      </div>

      {/* Light Warm-Grey Beginner Guide Card */}
      <div className="bg-[#FAF9F6] rounded-xl border border-[#E6E4DD] p-4 space-y-1">
        <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#C85A32]">
          BEGINNER GUIDE · 03 SSB DEMODULATION
        </div>
        <p className="text-sm text-[#484642] leading-relaxed">
          Now we recover the original message from the received SSB signal using coherent detection.
        </p>
      </div>

      {/* Demodulation Process Diagram */}
      <div className="bg-white rounded-xl border border-[#E6E4DD] p-4 shadow-2xs space-y-2.5">
        <div className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#75736E]">
          Coherent Detection Pipeline
        </div>

        <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-3 space-y-2.5">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 text-center font-mono">
            <div className="flex-1 bg-white border border-[#E6E4DD] rounded-lg px-2.5 py-2 flex flex-col items-center justify-center">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#1A1917]">
                <Radio className="w-3.5 h-3.5 text-[#C85A32]" />
                <span>Received SSB</span>
              </div>
              <div className="text-[10px] text-[#75736E] mt-0.5">
                s_{params.sideband.toUpperCase()}(t)
              </div>
            </div>

            <div className="flex justify-center shrink-0 text-[#8A8882]">
              <ArrowRight className="w-4 h-4 rotate-90 sm:rotate-0" />
            </div>

            <div className="flex-1 bg-white border border-[#0284C7]/40 rounded-lg px-2.5 py-2 flex flex-col items-center justify-center">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#1A1917]">
                <X className="w-3.5 h-3.5 text-[#0284C7]" />
                <span>Product Detector</span>
              </div>
              <div className="text-[10px] text-[#0284C7] mt-0.5">
                × Local Oscillator
              </div>
            </div>

            <div className="flex justify-center shrink-0 text-[#8A8882]">
              <ArrowRight className="w-4 h-4 rotate-90 sm:rotate-0" />
            </div>

            <div className="flex-1 bg-white border border-[#E6E4DD] rounded-lg px-2.5 py-2 flex flex-col items-center justify-center">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#1A1917]">
                <Filter className="w-3.5 h-3.5 text-[#C85A32]" />
                <span>Low-Pass Filter</span>
              </div>
              <div className="text-[10px] text-[#75736E] mt-0.5">
                Blocks 2f_c
              </div>
            </div>

            <div className="flex justify-center shrink-0 text-[#8A8882]">
              <ArrowRight className="w-4 h-4 rotate-90 sm:rotate-0" />
            </div>

            <div className="flex-1 bg-[#F0F9FF] border border-[#0284C7]/40 rounded-lg px-2.5 py-2 flex flex-col items-center justify-center">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#0284C7]">
                <Waves className="w-3.5 h-3.5" />
                <span>Recovered Message</span>
              </div>
              <div className="text-[10px] text-[#585651] mt-0.5">m̂(t)</div>
            </div>
          </div>

          <div className="flex flex-col items-center font-mono">
            <ArrowDown className="w-3.5 h-3.5 text-[#0284C7] rotate-180" />
            <div className="px-3 py-1 rounded-md bg-white border border-[#0284C7]/35 text-[11px] text-[#1A1917] tabular-nums">
              <span className="font-bold text-[#0284C7]">Local Oscillator: </span>
              f_LO = {loFreq.toFixed(1)} Hz · θ = {params.loPhaseDeg}°
            </div>
          </div>
        </div>
      </div>

      {/* Controls + Main Waveform Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: LO Controls + Synchronization Status + RMSE */}
        <div className="lg:col-span-4 space-y-4 min-w-0">
          <div className="bg-white rounded-xl border border-[#E6E4DD] p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E6E4DD]">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-[#C85A32]" />
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1917]">
                  DEMODULATION CONTROLS
                </h3>
              </div>
              <button
                type="button"
                onClick={onResetStage}
                className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[#E6E4DD] bg-[#FAF9F6] hover:bg-white text-[11px] font-mono font-semibold text-[#585651] hover:text-[#1A1917] transition-colors cursor-pointer"
                title="Reset local oscillator"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            {/* Local Oscillator Frequency Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[#585651]">LO frequency (f_LO)</span>
                <span className="font-bold text-[#0284C7] tabular-nums">
                  {loFreq.toFixed(1)} Hz ({params.loFreqOffset >= 0 ? '+' : ''}
                  {params.loFreqOffset.toFixed(1)})
                </span>
              </div>
              <input
                type="range"
                aria-label="Local oscillator frequency in Hz"
                min={-4.0}
                max={4.0}
                step={0.5}
                value={params.loFreqOffset}
                onChange={(e) =>
                  onUpdateParams({ loFreqOffset: parseFloat(e.target.value) })
                }
                className="w-full accent-[#0284C7] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-[#8A8882]">
                <span>{(params.carrierFreq - 4).toFixed(0)} Hz</span>
                <span>fc = {params.carrierFreq.toFixed(0)} Hz</span>
                <span>{(params.carrierFreq + 4).toFixed(0)} Hz</span>
              </div>
            </div>

            {/* Local Oscillator Phase Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-[#585651]">LO phase (θ)</span>
                <span className="font-bold text-[#0284C7] tabular-nums">
                  {params.loPhaseDeg}°
                </span>
              </div>
              <input
                type="range"
                aria-label="Local oscillator phase in degrees"
                min={-180}
                max={180}
                step={5}
                value={params.loPhaseDeg}
                onChange={(e) =>
                  onUpdateParams({ loPhaseDeg: parseInt(e.target.value, 10) })
                }
                className="w-full accent-[#0284C7] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-[#8A8882]">
                <span>−180°</span>
                <span>0° (Lock)</span>
                <span>+180°</span>
              </div>
            </div>

            {/* Quick Sync Demonstration Buttons */}
            <div className="grid grid-cols-3 gap-1.5 pt-1 text-[11px] font-mono">
              <button
                type="button"
                onClick={() => onUpdateParams({ loFreqOffset: 0, loPhaseDeg: 0 })}
                className={`py-1.5 px-2 rounded-lg border font-semibold cursor-pointer ${
                  isSynced
                    ? 'bg-[#1A1917] text-white border-[#1A1917]'
                    : 'bg-[#FAF9F6] text-[#585651] border-[#E6E4DD] hover:text-[#1A1917]'
                }`}
              >
                Sync 0°
              </button>
              <button
                type="button"
                onClick={() => onUpdateParams({ loFreqOffset: 0, loPhaseDeg: 90 })}
                className={`py-1.5 px-2 rounded-lg border font-semibold cursor-pointer ${
                  isFreqSynced && params.loPhaseDeg === 90
                    ? 'bg-[#1A1917] text-white border-[#1A1917]'
                    : 'bg-[#FAF9F6] text-[#585651] border-[#E6E4DD] hover:text-[#1A1917]'
                }`}
              >
                θ = 90°
              </button>
              <button
                type="button"
                onClick={() => onUpdateParams({ loFreqOffset: 1.5, loPhaseDeg: 0 })}
                className={`py-1.5 px-2 rounded-lg border font-semibold cursor-pointer ${
                  Math.abs(params.loFreqOffset - 1.5) < 0.05 && isPhaseSynced
                    ? 'bg-[#1A1917] text-white border-[#1A1917]'
                    : 'bg-[#FAF9F6] text-[#585651] border-[#E6E4DD] hover:text-[#1A1917]'
                }`}
              >
                Δf +1.5
              </button>
            </div>
          </div>

          {/* Synchronization Status & Recovery RMSE Card */}
          <div className="bg-white rounded-xl border border-[#E6E4DD] p-4 shadow-2xs space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-[#E6E4DD]">
              <Activity className="w-4 h-4 text-[#C85A32]" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1917]">
                SYNCHRONIZATION &amp; ERROR
              </h3>
            </div>

            <div
              className={`p-3 rounded-lg border flex items-center gap-2 text-xs font-mono font-bold ${
                isSynced
                  ? 'bg-[#10B981]/10 border-[#10B981]/30 text-[#059669]'
                  : 'bg-[#FBF4F0] border-[#C85A32]/30 text-[#C85A32]'
              }`}
            >
              {isSynced ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0" />
              )}
              <span>{syncStatusLabel}</span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-[#585651]">LO Frequency</span>
                <span className="font-bold text-[#1A1917] tabular-nums">
                  {loFreq.toFixed(1)} Hz
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#585651]">Phase Error (θ)</span>
                <span className="font-bold text-[#1A1917] tabular-nums">
                  {params.loPhaseDeg}°
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#585651]">Recovery RMSE</span>
                <span
                  className={`font-bold tabular-nums ${
                    rmse < 0.05 ? 'text-[#059669]' : 'text-[#C85A32]'
                  }`}
                >
                  {rmse.toFixed(4)} V
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Main Original vs Recovered Graph */}
        <div className="lg:col-span-8 min-w-0">
          <SsbTimePlot
            title="Original vs. Recovered Message Waveform"
            subtitle={
              isSynced
                ? `fLO = ${loFreq.toFixed(1)} Hz · θ = 0°`
                : `fLO = ${loFreq.toFixed(1)} Hz · θ = ${params.loPhaseDeg}°`
            }
            timeSteps={sim.timeSteps}
            values={sim.recoveredMessage}
            primaryLabel="Recovered m̂(t)"
            primaryColor="#0284C7"
            secondaryValues={sim.message}
            secondaryLabel="Original m(t)"
            secondaryColor="#64748B"
            secondaryDashed={false}
            simTime={simTime}
            onSeekTime={onSeekTime}
            tWindow={tWindow}
            isGridVisible={isGridVisible}
            heightClass="h-[310px]"
            badgeText={syncStatusLabel}
            badgeVariant={isSynced ? 'emerald' : 'accent'}
            rightMeasurementText={`RMSE: ${rmse.toFixed(4)} V`}
          />
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * LAB COMPLETION VIEW
 * ==========================================================================*/
interface SsbCompletionViewProps {
  onRestartLab: () => void;
}

export const SsbCompletionView: React.FC<SsbCompletionViewProps> = ({
  onRestartLab,
}) => (
  <div className="bg-white rounded-xl border border-[#E6E4DD] p-6 sm:p-10 shadow-2xs max-w-2xl mx-auto text-center space-y-5">
    <div className="w-12 h-12 rounded-full bg-[#10B981]/10 border border-[#10B981]/30 text-[#059669] flex items-center justify-center mx-auto">
      <Award className="w-6 h-6" />
    </div>

    <div className="space-y-2">
      <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#059669]">
        STAGE 03 OF 03 · LAB COMPLETE
      </div>
      <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1917]">
        Laboratory Completed
      </h2>
      <p className="text-sm text-[#585651] leading-relaxed">
        Congratulations! You have completed the SSB Modulation and Demodulation Laboratory.
      </p>
    </div>

    <div className="pt-2">
      <button
        type="button"
        onClick={onRestartLab}
        className="px-6 py-3 rounded-lg bg-[#1A1917] hover:bg-[#2D2B28] text-white text-sm font-mono font-bold transition-colors inline-flex items-center gap-2 shadow-xs cursor-pointer"
      >
        <RotateCcw className="w-4 h-4" />
        <span>Restart Lab</span>
      </button>
    </div>
  </div>
);
