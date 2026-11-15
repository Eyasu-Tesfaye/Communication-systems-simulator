/**
 * Educational & Interactive Sections for Module 2.3 — SSB Modulation & Demodulation
 * Implements all 5 sections:
 * 1. SSB Introduction & Visual Comparison (AM / DSB-SC / SSB)
 * 2. Time-Domain SSB Modulation (Message, Carrier, USB, LSB)
 * 3. Frequency-Domain Spectrum Analysis (Message, Carrier, USB, LSB)
 * 4. Coherent SSB Demodulation & Original-vs-Recovered Comparison
 * 5. Bandwidth, Power Comparison & Mathematical Reference
 */

import React from 'react';
import {
  BookOpen,
  Radio,
  Waves,
  Activity,
  GitMerge,
  Scale,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Info,
} from 'lucide-react';
import { MathView } from '../../../components/MathView';
import {
  SsbSimulationData,
  SsbParams,
  SidebandMode,
} from './ssbMathEngine';
import { SsbTimePlot, SsbSpectrumPlot } from './SsbPlotCanvas';

interface EducationalGuideProps {
  definition: string;
  formula: string;
  formulaExplanation: string;
  graphMeaning: string;
  parameterEffects: string;
  engineeringInterpretation: string;
}

const EducationalGuideBlock: React.FC<EducationalGuideProps> = ({
  definition,
  formula,
  formulaExplanation,
  graphMeaning,
  parameterEffects,
  engineeringInterpretation,
}) => (
  <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-4 space-y-3 text-xs">
    <div className="flex items-center gap-2 pb-2 border-b border-[#E6E4DD]">
      <BookOpen className="w-4 h-4 text-[#C85A32]" />
      <h4 className="font-mono font-bold uppercase tracking-wider text-[#1A1917]">
        Educational Breakdown &amp; Engineering Interpretation
      </h4>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      <div className="p-3 bg-white rounded border border-[#E6E4DD] space-y-1">
        <div className="font-mono font-bold text-[#C85A32] uppercase text-[10px]">
          1. Simple Definition
        </div>
        <p className="text-[#585651] leading-relaxed">{definition}</p>
      </div>

      <div className="p-3 bg-white rounded border border-[#E6E4DD] space-y-1">
        <div className="font-mono font-bold text-[#C85A32] uppercase text-[10px]">
          2. Mathematical Formula
        </div>
        <div className="py-1 overflow-x-auto">
          <MathView math={formula} displayMode={true} />
        </div>
      </div>

      <div className="p-3 bg-white rounded border border-[#E6E4DD] space-y-1">
        <div className="font-mono font-bold text-[#C85A32] uppercase text-[10px]">
          3. Formula Explanation
        </div>
        <p className="text-[#585651] leading-relaxed">{formulaExplanation}</p>
      </div>

      <div className="p-3 bg-white rounded border border-[#E6E4DD] space-y-1">
        <div className="font-mono font-bold text-[#1A1917] uppercase text-[10px]">
          4. What the Graph Represents
        </div>
        <p className="text-[#585651] leading-relaxed">{graphMeaning}</p>
      </div>

      <div className="p-3 bg-white rounded border border-[#E6E4DD] space-y-1">
        <div className="font-mono font-bold text-[#1A1917] uppercase text-[10px]">
          5. When Parameters Change
        </div>
        <p className="text-[#585651] leading-relaxed">{parameterEffects}</p>
      </div>

      <div className="p-3 bg-white rounded border border-[#E6E4DD] space-y-1">
        <div className="font-mono font-bold text-[#059669] uppercase text-[10px]">
          6. Practical Engineering Insight
        </div>
        <p className="text-[#585651] leading-relaxed">{engineeringInterpretation}</p>
      </div>
    </div>
  </div>
);

/* ============================================================================
 * SECTION 1: SSB INTRODUCTION & VISUAL COMPARISON (AM vs DSB-SC vs SSB)
 * ==========================================================================*/
interface SectionProps {
  sim: SsbSimulationData;
  simTime: number;
  onSeekTime: (t: number) => void;
  tWindow: number;
  isGridVisible: boolean;
  onUpdateParams: (patch: Partial<SsbParams>) => void;
}

export const SsbIntroSection: React.FC<SectionProps> = ({
  sim,
  isGridVisible,
  onUpdateParams,
}) => {
  const { params, messageBandwidth, comparison } = sim;
  const fc = params.carrierFreq;
  const B = messageBandwidth;

  return (
    <div className="space-y-4">
      {/* Core Concepts Overview */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-4 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-[#E6E4DD]">
          <Radio className="w-4 h-4 text-[#C85A32]" />
          <h2 className="font-mono font-bold text-sm text-[#1A1917]">
            What Is Single Sideband (SSB) Modulation?
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[#585651] leading-relaxed">
          <div className="space-y-2">
            <p>
              <strong className="text-[#1A1917]">What Modulation Means:</strong> Modulation shifts a low-frequency baseband message signal <MathView math="m(t)" /> (such as speech or sensor data) onto a high-frequency carrier <MathView math="c(t) = A_c\cos(2\pi f_c t)" /> so it can travel efficiently through antennas and share radio channels without interfering with other users.
            </p>
            <p>
              <strong className="text-[#1A1917]">Why AM &amp; DSB-SC Are Wasteful:</strong> When a real message <MathView math="m(t)" /> of bandwidth <MathView math="B" /> modulates a carrier, its spectrum creates two symmetric mirror copies around <MathView math="f_c" />: an <strong>Upper Sideband (USB)</strong> in <MathView math="[f_c, f_c+B]" /> and a <strong>Lower Sideband (LSB)</strong> in <MathView math="[f_c-B, f_c]" />. Conventional AM also transmits a large constant carrier spike that carries zero information.
            </p>
          </div>

          <div className="space-y-2">
            <p>
              <strong className="text-[#1A1917]">Why SSB Transmits Only One Sideband:</strong> For any real-valued message signal, the upper and lower sidebands are conjugate mirror images carrying the exact same information. Removing the carrier and one redundant sideband yields <strong>Single Sideband Suppressed Carrier (SSB-SC)</strong>.
            </p>
            <p>
              <strong className="text-[#1A1917]">Key Advantages:</strong> SSB cuts required RF bandwidth in half (<MathView math="B_{\text{SSB}} = B" /> instead of <MathView math="2B" />), eliminates wasted carrier power, and allows twice as many radio channels to fit in the same frequency allocation.
            </p>
          </div>
        </div>
      </div>

      {/* Live Visual Spectral Comparison: Conventional AM vs DSB-SC vs SSB */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E6E4DD]">
          <span className="font-mono font-bold text-xs text-[#1A1917]">
            Live Spectral Comparison: Conventional AM vs. DSB-SC vs. SSB ({params.sideband.toUpperCase()})
          </span>
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="text-[#75736E]">Active SSB Sideband:</span>
            {(['usb', 'lsb'] as SidebandMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onUpdateParams({ sideband: mode })}
                className={`px-2 py-0.5 rounded font-bold border cursor-pointer transition-colors ${
                  params.sideband === mode
                    ? 'bg-[#C85A32] text-white border-[#C85A32]'
                    : 'bg-[#FAF9F6] text-[#585651] border-[#E6E4DD]'
                }`}
              >
                {mode.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <SsbSpectrumPlot
            title="1. Conventional AM"
            spectrum={sim.amSpectrum}
            maxFreqHz={sim.maxSpectrumFreq}
            barColor="#75736E"
            shadedBand={{
              fStart: Math.max(0, fc - B),
              fEnd: fc + B,
              label: `BW = 2B (${comparison.amBandwidth.toFixed(1)} Hz)`,
              color: '#75736E',
            }}
            markers={[{ freq: fc, label: 'Carrier fc', color: '#1A1917', dashed: true }]}
            isGridVisible={isGridVisible}
            heightClass="h-[175px]"
            badgeText="Carrier + 2 Sidebands"
          />

          <SsbSpectrumPlot
            title="2. DSB-SC"
            spectrum={sim.dsbSpectrum}
            maxFreqHz={sim.maxSpectrumFreq}
            barColor="#2E6F7E"
            shadedBand={{
              fStart: Math.max(0, fc - B),
              fEnd: fc + B,
              label: `BW = 2B (${comparison.dsbBandwidth.toFixed(1)} Hz)`,
              color: '#2E6F7E',
            }}
            markers={[{ freq: fc, label: 'fc (0V)', color: '#8A8882', dashed: true }]}
            isGridVisible={isGridVisible}
            heightClass="h-[175px]"
            badgeText="No Carrier · 2 Sidebands"
          />

          <SsbSpectrumPlot
            title={`3. SSB-SC (${params.sideband.toUpperCase()})`}
            spectrum={sim.activeSsbSpectrum}
            maxFreqHz={sim.maxSpectrumFreq}
            barColor="#C85A32"
            shadedBand={{
              fStart: params.sideband === 'usb' ? fc : Math.max(0, fc - B),
              fEnd: params.sideband === 'usb' ? fc + B : fc,
              label: `BW = B (${comparison.ssbBandwidth.toFixed(1)} Hz)`,
              color: '#C85A32',
            }}
            markers={[{ freq: fc, label: 'fc (Suppressed)', color: '#8A8882', dashed: true }]}
            isGridVisible={isGridVisible}
            heightClass="h-[175px]"
            badgeText="50% Bandwidth Saved"
            badgeVariant="accent"
          />
        </div>
      </div>

      <EducationalGuideBlock
        definition="Single Sideband (SSB-SC) is an amplitude modulation technique that suppresses both the carrier wave and one redundant sideband, transmitting only the Upper Sideband (USB) or Lower Sideband (LSB)."
        formula="s_{SSB}(t) = \frac{A_c}{2}\left[m(t)\cos(2\pi f_c t) \mp \widehat{m}(t)\sin(2\pi f_c t)\right]"
        formulaExplanation="Subtracting the quadrature Hilbert term cancels the lower sideband (yielding USB); adding it cancels the upper sideband (yielding LSB)."
        graphMeaning="The three spectra above show how AM sends a huge carrier plus both sidebands (2B), DSB-SC removes the carrier (still 2B), and SSB transmits only one sideband (bandwidth B)."
        parameterEffects="Increasing message frequency fm widens the occupied sideband B; changing carrier frequency fc translates all spectral components together; switching USB/LSB flips which side of fc is transmitted."
        engineeringInterpretation="SSB is widely used in HF aviation/maritime voice radio, amateur radio, and frequency-division multiplexing because it maximizes channel capacity and transmitter battery efficiency."
      />
    </div>
  );
};

/* ============================================================================
 * SECTION 2: TIME-DOMAIN SSB MODULATION (Message, Carrier, USB, LSB)
 * ==========================================================================*/
export const SsbTimeDomainSection: React.FC<SectionProps> = ({
  sim,
  simTime,
  onSeekTime,
  tWindow,
  isGridVisible,
  onUpdateParams,
}) => {
  const { params } = sim;
  const isSingleTone = params.messageShape === 'single_tone';

  return (
    <div className="space-y-4">
      {/* Sideband Switch & Math Mode Callout */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#E6E4DD]">
          <div className="flex items-center gap-2">
            <Waves className="w-4 h-4 text-[#C85A32]" />
            <h2 className="font-mono font-bold text-xs sm:text-sm text-[#1A1917]">
              Time-Domain Waveforms: Message, Carrier, USB &amp; LSB
            </h2>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-[#75736E]">Active Transmission:</span>
            <button
              type="button"
              onClick={() => onUpdateParams({ sideband: 'usb' })}
              className={`px-2.5 py-1 rounded font-bold border cursor-pointer transition-colors ${
                params.sideband === 'usb'
                  ? 'bg-[#C85A32] text-white border-[#C85A32]'
                  : 'bg-[#FAF9F6] text-[#585651] border-[#E6E4DD]'
              }`}
            >
              USB (fc + fm)
            </button>
            <button
              type="button"
              onClick={() => onUpdateParams({ sideband: 'lsb' })}
              className={`px-2.5 py-1 rounded font-bold border cursor-pointer transition-colors ${
                params.sideband === 'lsb'
                  ? 'bg-[#2E6F7E] text-white border-[#2E6F7E]'
                  : 'bg-[#FAF9F6] text-[#585651] border-[#E6E4DD]'
              }`}
            >
              LSB (fc − fm)
            </button>
          </div>
        </div>

        {/* Single-Tone vs General Hilbert Equation Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div
            className={`p-3 rounded-md border ${
              isSingleTone
                ? 'bg-[#FBF4F0] border-[#C85A32]/40'
                : 'bg-[#FAF9F6] border-[#E6E4DD]'
            }`}
          >
            <div className="font-mono font-bold text-[#1A1917] text-[11px] mb-1">
              Single-Tone Formulation {isSingleTone && '· (Active)'}
            </div>
            <MathView
              math="s_{USB}(t) = \frac{A_c A_m}{2}\cos\big(2\pi(f_c+f_m)t\big), \quad s_{LSB}(t) = \frac{A_c A_m}{2}\cos\big(2\pi(f_c-f_m)t\big)"
              displayMode={true}
            />
            <p className="text-[11px] text-[#585651] mt-1">
              Valid specifically when <MathView math="m(t) = A_m\cos(2\pi f_m t)" />. Notice each SSB wave has constant amplitude <MathView math="A_c A_m / 2" /> and shifts frequency to <MathView math="f_c + f_m" /> (USB) or <MathView math="f_c - f_m" /> (LSB).
            </p>
          </div>

          <div
            className={`p-3 rounded-md border ${
              !isSingleTone
                ? 'bg-[#FBF4F0] border-[#C85A32]/40'
                : 'bg-[#FAF9F6] border-[#E6E4DD]'
            }`}
          >
            <div className="font-mono font-bold text-[#1A1917] text-[11px] mb-1">
              General Hilbert / Phase-Shift Formulation {!isSingleTone && '· (Active)'}
            </div>
            <MathView
              math="s_{USB/LSB}(t) = \frac{A_c}{2}\left[m(t)\cos(2\pi f_c t) \mp \widehat{m}(t)\sin(2\pi f_c t)\right]"
              displayMode={true}
            />
            <p className="text-[11px] text-[#585651] mt-1">
              Works for <em>any</em> arbitrary message <MathView math="m(t)" /> using its 90°-shifted Hilbert transform <MathView math="\widehat{m}(t)" />. (Some textbooks absorb the <MathView math="1/2" /> factor into <MathView math="A_c" />.)
            </p>
          </div>
        </div>
      </div>

      {/* 4 Separate Synchronized Time-Domain Graphs */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SsbTimePlot
          title="1. Original Message Signal m(t)"
          subtitle={
            isSingleTone
              ? `${params.messageAmp.toFixed(1)} cos(2π·${params.messageFreq.toFixed(1)}t)`
              : `Bandwidth B = ${sim.messageBandwidth.toFixed(1)} Hz`
          }
          timeSteps={sim.timeSteps}
          values={sim.message}
          primaryLabel="m(t)"
          primaryColor="#1A1917"
          secondaryValues={sim.messageHilbert}
          secondaryLabel="m̂(t) Hilbert"
          secondaryColor="#8A8882"
          simTime={simTime}
          onSeekTime={onSeekTime}
          tWindow={tWindow}
          isGridVisible={isGridVisible}
          badgeText={`fm = ${params.messageFreq.toFixed(1)} Hz`}
        />

        <SsbTimePlot
          title="2. High-Frequency Carrier c(t)"
          subtitle={`${params.carrierAmp.toFixed(1)} cos(2π·${params.carrierFreq.toFixed(1)}t)`}
          timeSteps={sim.timeSteps}
          values={sim.carrier}
          primaryLabel="c(t)"
          primaryColor="#585651"
          simTime={simTime}
          onSeekTime={onSeekTime}
          tWindow={tWindow}
          isGridVisible={isGridVisible}
          badgeText={`fc = ${params.carrierFreq.toFixed(1)} Hz`}
        />

        <SsbTimePlot
          title="3. Upper Sideband Signal s_USB(t)"
          subtitle={
            isSingleTone
              ? `f_USB = ${(params.carrierFreq + params.messageFreq).toFixed(1)} Hz`
              : `[${sim.usbFreqRange[0].toFixed(1)}, ${sim.usbFreqRange[1].toFixed(1)}] Hz`
          }
          timeSteps={sim.timeSteps}
          values={sim.usbSignal}
          primaryLabel="s_USB(t)"
          primaryColor="#C85A32"
          simTime={simTime}
          onSeekTime={onSeekTime}
          tWindow={tWindow}
          isGridVisible={isGridVisible}
          badgeText={params.sideband === 'usb' ? 'ACTIVE TX (USB)' : 'USB Preview'}
          badgeVariant={params.sideband === 'usb' ? 'accent' : 'neutral'}
        />

        <SsbTimePlot
          title="4. Lower Sideband Signal s_LSB(t)"
          subtitle={
            isSingleTone
              ? `f_LSB = ${(params.carrierFreq - params.messageFreq).toFixed(1)} Hz`
              : `[${sim.lsbFreqRange[0].toFixed(1)}, ${sim.lsbFreqRange[1].toFixed(1)}] Hz`
          }
          timeSteps={sim.timeSteps}
          values={sim.lsbSignal}
          primaryLabel="s_LSB(t)"
          primaryColor="#2E6F7E"
          simTime={simTime}
          onSeekTime={onSeekTime}
          tWindow={tWindow}
          isGridVisible={isGridVisible}
          badgeText={params.sideband === 'lsb' ? 'ACTIVE TX (LSB)' : 'LSB Preview'}
          badgeVariant={params.sideband === 'lsb' ? 'emerald' : 'neutral'}
        />
      </div>

      <EducationalGuideBlock
        definition="In the time domain, SSB modulation converts a baseband signal m(t) and its 90° Hilbert transform m̂(t) into a passband waveform containing only frequencies above fc (USB) or below fc (LSB)."
        formula="s_{USB}(t) = \frac{A_c A_m}{2}\cos(2\pi(f_c+f_m)t), \quad s_{LSB}(t) = \frac{A_c A_m}{2}\cos(2\pi(f_c-f_m)t)"
        formulaExplanation="Because cos(A)cos(B) ∓ sin(A)sin(B) = cos(A ± B), the Hartley phase-shift combiner cancels one sideband identically by destructive interference."
        graphMeaning="Notice that for a single-tone message, USB oscillates faster (fc + fm) than LSB (fc − fm) while both maintain a constant peak envelope Ac·Am/2. For multi-tone messages, the envelope varies smoothly like the analytic envelope."
        parameterEffects="Increasing fm increases the cycle-density gap between USB (faster) and LSB (slower); raising Am or Ac scales the modulated peak amplitude proportionally."
        engineeringInterpretation="Unlike AM, a single-tone SSB signal has a flat envelope—meaning an ordinary diode envelope detector cannot recover m(t) for multi-tone signals without distortion; coherent detection is required."
      />
    </div>
  );
};

/* ============================================================================
 * SECTION 3: FREQUENCY-DOMAIN SPECTRUM ANALYSIS
 * ==========================================================================*/
export const SsbFrequencyDomainSection: React.FC<SectionProps> = ({
  sim,
  isGridVisible,
  onUpdateParams,
}) => {
  const { params, messageBandwidth, lsbFreqRange, usbFreqRange } = sim;
  const fc = params.carrierFreq;
  const fm = params.messageFreq;
  const isSingleTone = params.messageShape === 'single_tone';

  return (
    <div className="space-y-4">
      {/* Spectral Summary Strip */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#E6E4DD]">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#C85A32]" />
            <h2 className="font-mono font-bold text-xs sm:text-sm text-[#1A1917]">
              Frequency-Domain Analysis: Before &amp; After SSB Modulation
            </h2>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="text-[#75736E]">Highlight Mode:</span>
            {(['usb', 'lsb'] as SidebandMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onUpdateParams({ sideband: mode })}
                className={`px-2.5 py-1 rounded font-bold border cursor-pointer transition-colors ${
                  params.sideband === mode
                    ? 'bg-[#C85A32] text-white border-[#C85A32]'
                    : 'bg-[#FAF9F6] text-[#585651] border-[#E6E4DD]'
                }`}
              >
                {mode.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-2.5 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] text-[#75736E] uppercase">Carrier (Suppressed)</div>
            <div className="text-sm font-bold text-[#1A1917] tabular-nums">
              fc = {fc.toFixed(1)} Hz (0.00 V)
            </div>
          </div>

          <div className="p-2.5 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] text-[#75736E] uppercase">LSB Location</div>
            <div className="text-sm font-bold text-[#2E6F7E] tabular-nums">
              {isSingleTone
                ? `${(fc - fm).toFixed(1)} Hz`
                : `${lsbFreqRange[0].toFixed(1)}–${lsbFreqRange[1].toFixed(1)} Hz`}
            </div>
          </div>

          <div className="p-2.5 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] text-[#75736E] uppercase">USB Location</div>
            <div className="text-sm font-bold text-[#C85A32] tabular-nums">
              {isSingleTone
                ? `${(fc + fm).toFixed(1)} Hz`
                : `${usbFreqRange[0].toFixed(1)}–${usbFreqRange[1].toFixed(1)} Hz`}
            </div>
          </div>

          <div className="p-2.5 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] text-[#75736E] uppercase">SSB Occupied BW</div>
            <div className="text-sm font-bold text-[#059669] tabular-nums">
              B_SSB = B = {messageBandwidth.toFixed(1)} Hz
            </div>
          </div>
        </div>
      </div>

      {/* 4 FFT Spectrum Plots */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SsbSpectrumPlot
          title="1. Original Message Spectrum |M(f)|"
          spectrum={sim.messageSpectrum}
          maxFreqHz={sim.maxSpectrumFreq}
          barColor="#1A1917"
          shadedBand={{
            fStart: 0,
            fEnd: messageBandwidth,
            label: `Message BW B = ${messageBandwidth.toFixed(1)} Hz`,
            color: '#1A1917',
          }}
          isGridVisible={isGridVisible}
          badgeText="Baseband"
        />

        <SsbSpectrumPlot
          title="2. Unmodulated Carrier Spectrum |C(f)|"
          spectrum={sim.carrierSpectrum}
          maxFreqHz={sim.maxSpectrumFreq}
          barColor="#585651"
          markers={[{ freq: fc, label: `fc=${fc.toFixed(0)}Hz`, color: '#1A1917', dashed: true }]}
          isGridVisible={isGridVisible}
          badgeText={`Ac = ${params.carrierAmp.toFixed(1)} V`}
        />

        <SsbSpectrumPlot
          title="3. USB Spectrum |S_USB(f)| (Upper Sideband Only)"
          spectrum={sim.usbSpectrum}
          maxFreqHz={sim.maxSpectrumFreq}
          barColor="#C85A32"
          shadedBand={{
            fStart: fc,
            fEnd: fc + messageBandwidth,
            label: `USB BW = ${messageBandwidth.toFixed(1)} Hz`,
            color: '#C85A32',
          }}
          markers={[
            { freq: fc, label: 'fc (0V)', color: '#8A8882', dashed: true },
            { freq: fc + fm, label: `fc+fm=${(fc + fm).toFixed(1)}`, color: '#C85A32' },
          ]}
          isGridVisible={isGridVisible}
          badgeText={params.sideband === 'usb' ? 'ACTIVE · Carrier Suppressed' : 'Carrier Suppressed'}
          badgeVariant={params.sideband === 'usb' ? 'accent' : 'neutral'}
        />

        <SsbSpectrumPlot
          title="4. LSB Spectrum |S_LSB(f)| (Lower Sideband Only)"
          spectrum={sim.lsbSpectrum}
          maxFreqHz={sim.maxSpectrumFreq}
          barColor="#2E6F7E"
          shadedBand={{
            fStart: Math.max(0, fc - messageBandwidth),
            fEnd: fc,
            label: `LSB BW = ${messageBandwidth.toFixed(1)} Hz`,
            color: '#2E6F7E',
          }}
          markers={[
            { freq: fc, label: 'fc (0V)', color: '#8A8882', dashed: true },
            { freq: Math.max(0, fc - fm), label: `fc−fm=${(fc - fm).toFixed(1)}`, color: '#2E6F7E' },
          ]}
          isGridVisible={isGridVisible}
          badgeText={params.sideband === 'lsb' ? 'ACTIVE · Carrier Suppressed' : 'Carrier Suppressed'}
          badgeVariant={params.sideband === 'lsb' ? 'emerald' : 'neutral'}
        />
      </div>

      <EducationalGuideBlock
        definition="Spectral analysis reveals the exact frequency components produced by SSB modulation via Fast Fourier Transform (FFT) of the simulated waveforms."
        formula="S_{USB}(f) = S_{DSB}(f)\cdot u(|f| - f_c), \quad S_{LSB}(f) = S_{DSB}(f)\cdot u(f_c - |f|)"
        formulaExplanation="Ideal SSB-SC multiplies the DSB spectrum by an ideal highpass (above fc) or lowpass (below fc) step function, removing the carrier and the unwanted sideband."
        graphMeaning="For a single tone at fm, the USB spectrum contains only one impulse at fc + fm and the LSB spectrum contains only one impulse at fc − fm; the component at fc is completely 0 V."
        parameterEffects="Changing fm shifts the sideband peak outward (USB) or inward (LSB) relative to fc; multi-tone messages clearly demonstrate that occupied SSB bandwidth equals message bandwidth B."
        engineeringInterpretation="Because SSB occupies [fc, fc+B] or [fc−B, fc] with zero carrier spike, adjacent SSB voice channels can be stacked every 3–4 kHz without mutual interference."
      />
    </div>
  );
};

/* ============================================================================
 * SECTION 4: COHERENT SSB DEMODULATION & ORIGINAL-VS-RECOVERED COMPARISON
 * ==========================================================================*/
export const SsbDemodulationSection: React.FC<SectionProps> = ({
  sim,
  simTime,
  onSeekTime,
  tWindow,
  isGridVisible,
  onUpdateParams,
}) => {
  const { params, rmse, normalizedRmsePct, correlation, peakError, loFreq } = sim;

  const isFreqSynced = Math.abs(params.loFreqOffset) < 0.05;
  const isPhaseSynced = Math.abs(params.loPhaseDeg) < 2;
  const isFilterValid =
    params.lpfCutoff >= sim.messageBandwidth &&
    params.lpfCutoff <= 2 * params.carrierFreq - sim.messageBandwidth - 2;

  let statusLabel = 'Exact Coherent Recovery';
  let statusTone: 'emerald' | 'accent' = 'emerald';
  if (!isFreqSynced) {
    statusLabel = `Frequency Offset (Δf = ${params.loFreqOffset >= 0 ? '+' : ''}${params.loFreqOffset.toFixed(1)} Hz)`;
    statusTone = 'accent';
  } else if (!isPhaseSynced) {
    statusLabel = `Phase Mismatch (Δφ = ${params.loPhaseDeg}°)`;
    statusTone = 'accent';
  } else if (!isFilterValid) {
    statusLabel =
      params.lpfCutoff < sim.messageBandwidth
        ? 'LPF Cutoff Too Low (Message Attenuated)'
        : 'LPF Cutoff Too High (2fc Leakage)';
    statusTone = 'accent';
  }

  return (
    <div className="space-y-4">
      {/* 1. Coherent Detector Architecture & Quick Sync Presets */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E6E4DD]">
          <div className="flex items-center gap-2">
            <GitMerge className="w-4 h-4 text-[#C85A32]" />
            <h2 className="font-mono font-bold text-xs sm:text-sm text-[#1A1917]">
              Coherent Product Demodulation ({params.sideband.toUpperCase()})
            </h2>
          </div>
          <span
            className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold border flex items-center gap-1.5 ${
              statusTone === 'emerald'
                ? 'bg-[#10B981]/10 text-[#059669] border-[#10B981]/30'
                : 'bg-[#FBF4F0] text-[#C85A32] border-[#C85A32]/30'
            }`}
          >
            {statusTone === 'emerald' ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <AlertTriangle className="w-3.5 h-3.5" />
            )}
            <span>{statusLabel}</span>
          </span>
        </div>

        {/* Receiver Chain Flow */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono bg-[#FAF9F6] p-2.5 rounded border border-[#E6E4DD]">
          <span className="px-2 py-1 bg-white rounded border border-[#E6E4DD] font-semibold">
            1. Received s_{params.sideband.toUpperCase()}(t)
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-[#8A8882]" />
          <span className="px-2 py-1 bg-white rounded border border-[#E6E4DD] font-semibold">
            2. Multiply × 2cos(2π·{loFreq.toFixed(1)}t {params.loPhaseDeg >= 0 ? '+' : '−'} {Math.abs(params.loPhaseDeg)}°)
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-[#8A8882]" />
          <span className="px-2 py-1 bg-white rounded border border-[#E6E4DD] font-semibold">
            3. LPF (f_cut = {params.lpfCutoff.toFixed(1)} Hz)
          </span>
          <ArrowRight className="w-3.5 h-3.5 text-[#8A8882]" />
          <span className="px-2 py-1 bg-[#FBF4F0] rounded border border-[#C85A32]/30 font-bold text-[#C85A32]">
            4. Recovered m̂(t)
          </span>
        </div>

        {/* Quick Synchronization Presets */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
          <span className="text-[#75736E]">Test Synchronization Scenarios:</span>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                onUpdateParams({
                  loFreqOffset: 0,
                  loPhaseDeg: 0,
                  lpfCutoff: Math.max(8, Math.ceil(sim.messageBandwidth + 3)),
                })
              }
              className="px-2 py-1 rounded bg-[#10B981]/10 text-[#059669] border border-[#10B981]/30 hover:bg-[#10B981]/20 font-bold cursor-pointer"
            >
              Perfect Sync (Δf=0, Δφ=0°)
            </button>
            <button
              type="button"
              onClick={() => onUpdateParams({ loFreqOffset: 0, loPhaseDeg: 45 })}
              className="px-2 py-1 rounded bg-white text-[#585651] border border-[#E6E4DD] hover:bg-[#FAF9F6] font-semibold cursor-pointer"
            >
              Phase Error 45°
            </button>
            <button
              type="button"
              onClick={() => onUpdateParams({ loFreqOffset: 0, loPhaseDeg: 90 })}
              className="px-2 py-1 rounded bg-white text-[#585651] border border-[#E6E4DD] hover:bg-[#FAF9F6] font-semibold cursor-pointer"
            >
              Phase Error 90° (Hilbert)
            </button>
            <button
              type="button"
              onClick={() => onUpdateParams({ loFreqOffset: 1.5, loPhaseDeg: 0 })}
              className="px-2 py-1 rounded bg-white text-[#585651] border border-[#E6E4DD] hover:bg-[#FAF9F6] font-semibold cursor-pointer"
            >
              Freq Offset +1.5 Hz
            </button>
          </div>
        </div>
      </div>

      {/* 2. Modulation vs Demodulation Visual & Numerical Comparison (Item 8) */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E6E4DD]">
          <h3 className="font-mono font-bold text-xs sm:text-sm text-[#1A1917]">
            Original Message m(t) vs. Demodulated Output m̂_rec(t) Comparison
          </h3>
          <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono tabular-nums">
            <span>
              RMSE: <strong className={rmse < 0.05 ? 'text-[#059669]' : 'text-[#C85A32]'}>{rmse.toFixed(4)} V</strong> ({normalizedRmsePct.toFixed(1)}%)
            </span>
            <span>
              Correlation r: <strong className="text-[#1A1917]">{correlation.toFixed(3)}</strong>
            </span>
            <span>
              Peak Error: <strong className="text-[#1A1917]">{peakError.toFixed(3)} V</strong>
            </span>
          </div>
        </div>

        <SsbTimePlot
          title="Overlay: Original m(t) (Solid) vs. Recovered m̂_rec(t) (Dashed)"
          timeSteps={sim.timeSteps}
          values={sim.message}
          primaryLabel="Original m(t)"
          primaryColor="#1A1917"
          secondaryValues={sim.recoveredMessage}
          secondaryLabel="Recovered"
          secondaryColor="#C85A32"
          simTime={simTime}
          onSeekTime={onSeekTime}
          tWindow={tWindow}
          isGridVisible={isGridVisible}
          heightClass="h-[220px]"
          badgeText={rmse < 0.05 ? 'Match Verified' : 'Distortion Present'}
          badgeVariant={rmse < 0.05 ? 'emerald' : 'accent'}
        />
      </div>

      {/* 3. All 4 Connected Demodulator Stages + Product Spectrum */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <SsbTimePlot
          title={`Stage 1: Received SSB Signal s_${params.sideband.toUpperCase()}(t)`}
          timeSteps={sim.timeSteps}
          values={sim.activeSsbSignal}
          primaryLabel={`s_${params.sideband.toUpperCase()}(t)`}
          primaryColor="#C85A32"
          simTime={simTime}
          onSeekTime={onSeekTime}
          tWindow={tWindow}
          isGridVisible={isGridVisible}
        />

        <SsbTimePlot
          title="Stage 2: Local Oscillator c_LO(t)"
          subtitle={`f_LO = ${loFreq.toFixed(1)} Hz, Δφ = ${params.loPhaseDeg}°`}
          timeSteps={sim.timeSteps}
          values={sim.localOscillator}
          primaryLabel="c_LO(t)"
          primaryColor="#585651"
          simTime={simTime}
          onSeekTime={onSeekTime}
          tWindow={tWindow}
          isGridVisible={isGridVisible}
        />

        <SsbTimePlot
          title="Stage 3: Product Detector Output v_prod(t)"
          subtitle="Baseband + 2fc upper component"
          timeSteps={sim.timeSteps}
          values={sim.productOutput}
          primaryLabel="v_prod(t)"
          primaryColor="#2E6F7E"
          simTime={simTime}
          onSeekTime={onSeekTime}
          tWindow={tWindow}
          isGridVisible={isGridVisible}
        />

        <SsbSpectrumPlot
          title="Product Detector Spectrum |V_prod(f)| & LPF Cutoff"
          spectrum={sim.productSpectrum}
          maxFreqHz={Math.max(sim.maxSpectrumFreq, 2 * params.carrierFreq + sim.messageBandwidth + 5)}
          barColor="#2E6F7E"
          cutoffFreq={params.lpfCutoff}
          isGridVisible={isGridVisible}
          heightClass="h-[195px]"
          badgeText={`LPF Passes ≤ ${params.lpfCutoff.toFixed(1)} Hz`}
          badgeVariant="emerald"
        />
      </div>

      <EducationalGuideBlock
        definition="Coherent (synchronous) detection multiplies the received SSB signal by a locally generated carrier at fc, then removes high-frequency terms around 2fc with a low-pass filter."
        formula="\hat{m}_{rec}(t) = \operatorname{LPF}\left\{\frac{4}{A_c} s_{SSB}(t)\cos(2\pi f_{LO}t + \Delta\phi)\right\} = m(t)\cos(\Delta\phi) \pm \widehat{m}(t)\sin(\Delta\phi)"
        formulaExplanation="When f_LO = fc and Δφ = 0, cos(Δφ)=1 and sin(Δφ)=0, recovering m(t) identically. A phase offset Δφ ≠ 0 mixes in the Hilbert quadrature term ±m̂(t)sin(Δφ); a frequency offset Δf shifts every tone by ∓Δf."
        graphMeaning="The overlay graph compares Original m(t) against Recovered m̂_rec(t) directly, while the four stage plots trace how the RF wave is down-converted and smoothed back to baseband."
        parameterEffects="Adjusting LO frequency offset introduces beating and pitch shift; adjusting LO phase shifts the recovered waveform without causing a complete quadrature null (unlike DSB-SC); setting f_cut too low clips the message, while setting it above 2fc − B passes high-frequency ripple."
        engineeringInterpretation="Carrier frequency stability is critical in SSB voice receivers: even a 50–100 Hz LO drift causes noticeable pitch distortion ('Donald Duck effect') in speech."
      />
    </div>
  );
};

/* ============================================================================
 * SECTION 5: BANDWIDTH, POWER COMPARISON & MATHEMATICAL REFERENCE
 * ==========================================================================*/
export const SsbComparisonTheorySection: React.FC<SectionProps> = ({ sim }) => {
  const { params, messageBandwidth, comparison } = sim;

  return (
    <div className="space-y-4">
      {/* 1. Bandwidth & Power Comparison Table */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-4 shadow-2xs space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-[#E6E4DD]">
          <Scale className="w-4 h-4 text-[#C85A32]" />
          <h2 className="font-mono font-bold text-xs sm:text-sm text-[#1A1917]">
            Bandwidth &amp; Power Efficiency Comparison (AM vs. DSB-SC vs. SSB)
          </h2>
        </div>

        {/* Comparison Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#E6E4DD] bg-[#FAF9F6] font-mono text-[11px] uppercase text-[#585651]">
                <th className="py-2.5 px-3">Modulation Scheme</th>
                <th className="py-2.5 px-3">Bandwidth (B = {messageBandwidth.toFixed(1)} Hz)</th>
                <th className="py-2.5 px-3">Carrier Tx</th>
                <th className="py-2.5 px-3">Sidebands Tx</th>
                <th className="py-2.5 px-3">Power Efficiency (η)</th>
                <th className="py-2.5 px-3">Live Avg Power</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E4DD] font-mono">
              <tr className="text-[#585651]">
                <td className="py-2.5 px-3 font-bold text-[#1A1917]">Conventional AM (μ={params.amModIndex.toFixed(2)})</td>
                <td className="py-2.5 px-3">2B = {comparison.amBandwidth.toFixed(1)} Hz</td>
                <td className="py-2.5 px-3">Full Carrier</td>
                <td className="py-2.5 px-3">USB + LSB</td>
                <td className="py-2.5 px-3 text-[#C85A32] font-bold">{comparison.amEfficiencyPct.toFixed(1)}% (max 33.3%)</td>
                <td className="py-2.5 px-3 tabular-nums">{comparison.amTotalPower.toFixed(3)} W</td>
              </tr>
              <tr className="text-[#585651]">
                <td className="py-2.5 px-3 font-bold text-[#2E6F7E]">DSB-SC</td>
                <td className="py-2.5 px-3">2B = {comparison.dsbBandwidth.toFixed(1)} Hz</td>
                <td className="py-2.5 px-3">Suppressed</td>
                <td className="py-2.5 px-3">USB + LSB</td>
                <td className="py-2.5 px-3 text-[#2E6F7E] font-bold">100% (50% redundant)</td>
                <td className="py-2.5 px-3 tabular-nums">{comparison.dsbTotalPower.toFixed(3)} W</td>
              </tr>
              <tr className="bg-[#FBF4F0]/60 text-[#1A1917]">
                <td className="py-2.5 px-3 font-bold text-[#C85A32]">SSB-SC ({params.sideband.toUpperCase()})</td>
                <td className="py-2.5 px-3 font-bold text-[#059669]">B = {comparison.ssbBandwidth.toFixed(1)} Hz</td>
                <td className="py-2.5 px-3 font-bold">Suppressed</td>
                <td className="py-2.5 px-3 font-bold">Single ({params.sideband.toUpperCase()})</td>
                <td className="py-2.5 px-3 font-bold text-[#059669]">100% (non-redundant)</td>
                <td className="py-2.5 px-3 font-bold tabular-nums">{comparison.ssbTotalPower.toFixed(3)} W</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Summary Savings Callouts */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] text-[#75736E] uppercase">Bandwidth Savings vs. AM/DSB</div>
            <div className="text-lg font-bold text-[#059669] mt-0.5">
              {comparison.bandwidthSavingsPct.toFixed(0)}% Reduction
            </div>
            <div className="text-[10px] text-[#585651] font-sans">B instead of 2B Hz</div>
          </div>

          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] text-[#75736E] uppercase">Power Saved vs. Conventional AM</div>
            <div className="text-lg font-bold text-[#C85A32] mt-0.5 tabular-nums">
              {comparison.powerSavingsVsAmPct.toFixed(1)}%
            </div>
            <div className="text-[10px] text-[#585651] font-sans">At current Ac={params.carrierAmp.toFixed(1)}V, μ={params.amModIndex.toFixed(2)}</div>
          </div>

          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD]">
            <div className="text-[10px] text-[#75736E] uppercase">Power Saved vs. DSB-SC</div>
            <div className="text-lg font-bold text-[#2E6F7E] mt-0.5 tabular-nums">
              {comparison.powerSavingsVsDsbPct.toFixed(1)}%
            </div>
            <div className="text-[10px] text-[#585651] font-sans">Only 1 sideband transmitted</div>
          </div>
        </div>

        {/* Explicit Assumptions */}
        <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD] flex items-start gap-2.5 text-xs">
          <Info className="w-4 h-4 text-[#C85A32] shrink-0 mt-0.5" />
          <div className="text-[#585651] leading-relaxed">
            <strong className="text-[#1A1917] font-mono uppercase">Assumptions Behind This Comparison: </strong>
            All power calculations assume a normalized <MathView math="1\,\Omega" /> load resistance, identical carrier amplitude scale <MathView math="A_c" />, real baseband message bandwidth <MathView math="B" />, and ideal carrier/sideband suppression in SSB-SC. For AM, modulation index <MathView math="\mu \le 1" /> limits sideband power efficiency to <MathView math="\eta_{\text{AM}} = \frac{\mu^2}{2+\mu^2} \le 33.3\%" /> for sinusoidal modulation.
          </div>
        </div>
      </div>

      {/* 2. Complete Mathematical Derivation & Theory Reference */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-4 shadow-2xs space-y-3 text-xs">
        <div className="flex items-center gap-2 pb-2 border-b border-[#E6E4DD]">
          <BookOpen className="w-4 h-4 text-[#C85A32]" />
          <h3 className="font-mono font-bold text-[#1A1917]">
            Mathematical Reference: Analytic Signal &amp; Hilbert Transform
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD] space-y-1.5">
            <div className="font-mono font-bold text-[#1A1917]">1. Analytic Signal Construction</div>
            <MathView
              math="m_+(t) = m(t) + j\widehat{m}(t) \iff M_+(f) = 2M(f)u(f)"
              displayMode={true}
            />
            <p className="text-[#585651] leading-relaxed">
              The Hilbert transform <MathView math="\widehat{m}(t)" /> introduces a <MathView math="-90^\circ" /> phase shift to positive frequencies and <MathView math="+90^\circ" /> to negative frequencies, cancelling negative frequencies in <MathView math="m_+(t)" />.
            </p>
          </div>

          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD] space-y-1.5">
            <div className="font-mono font-bold text-[#1A1917]">2. Frequency Translation to USB / LSB</div>
            <MathView
              math="s_{USB}(t) = \operatorname{Re}\left\{\frac{A_c}{2}m_+(t)e^{j2\pi f_c t}\right\}, \quad s_{LSB}(t) = \operatorname{Re}\left\{\frac{A_c}{2}m_+^*(t)e^{j2\pi f_c t}\right\}"
              displayMode={true}
            />
            <p className="text-[#585651] leading-relaxed">
              Multiplying the one-sided spectrum <MathView math="M_+(f)" /> by <MathView math="e^{j2\pi f_c t}" /> and taking the real part places the spectrum strictly above <MathView math="f_c" /> (USB) or strictly below <MathView math="f_c" /> (LSB).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
