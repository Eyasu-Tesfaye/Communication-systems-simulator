import React, { useState, useMemo } from 'react';
import { RotateCcw, Sliders } from 'lucide-react';
import { SignalPlotCanvas } from './SignalPlotCanvas';
import {
  UnifiedSignalConfig,
  generateCtsSignal,
  generateDtsSignal,
  GeneratedSignal,
} from './signalGenerators';
import { computeCorrelation, evaluateCorrelationAtLag } from './correlationEngine';
import { computePsd, PsdResult } from './psdEngine';
import { DEFAULT_SHARED_LAB_STATE, SharedLabState } from './labTypes';
import {
  ChannelEchoCard,
  CoreSignalControls,
  CorrelationLagHeaderPill,
  FullscreenControlBar,
  PsdMetricsSubheader,
} from './SharedLabControls';

export type PsdSignalType = 'white_noise' | 'colored_noise' | 'sine' | 'pulse';

export interface PsdWorkspaceProps {
  sharedState?: SharedLabState;
  onUpdateState?: (updater: (prev: SharedLabState) => SharedLabState) => void;
  onResetAll?: () => void;
}

export const PsdWorkspace: React.FC<PsdWorkspaceProps> = ({
  sharedState,
  onUpdateState,
  onResetAll,
}) => {
  const [localState, setLocalState] = useState<SharedLabState>(DEFAULT_SHARED_LAB_STATE);
  const state = sharedState ?? localState;
  const updateState = onUpdateState ?? setLocalState;
  const [lagCursor, setLagCursor] = useState<number>(0);

  const isDiscrete = state.timeDomain === 'discrete';
  const sampleRate = isDiscrete ? 20 : 50;
  const activeEchoDelay = isDiscrete ? state.echoDelayDts : state.echoDelayCts;

  const signalConfig: UnifiedSignalConfig = useMemo(() => {
    const effectiveSineFreq = isDiscrete ? Math.min(4.5, state.sineFreq) : state.sineFreq;
    return {
      type: state.signalType,
      sine: {
        amplitude: state.sineAmp,
        frequency: effectiveSineFreq,
        phase: state.sinePhase,
      },
      pulse: {
        amplitude: state.pulseAmp,
        width: state.pulseWidth,
        position: state.pulsePos,
      },
      whiteNoise: {
        stdDev: Math.sqrt(Math.max(0.01, state.whiteNoiseVariance)),
        variance: state.whiteNoiseVariance,
        seed: state.whiteNoiseSeed,
      },
      coloredNoise: {
        stdDev: Math.sqrt(Math.max(0.01, state.coloredNoiseVariance)),
        variance: state.coloredNoiseVariance,
        cutoffFreq: state.coloredNoiseCutoff,
        filterParam: Math.exp((-2 * Math.PI * state.coloredNoiseCutoff) / sampleRate),
        seed: state.coloredNoiseSeed,
      },
      echo: {
        enabled: state.echoEnabled,
        delay: activeEchoDelay,
        gain: state.echoGain,
      },
    };
  }, [state, isDiscrete, sampleRate, activeEchoDelay]);

  const generatedSignal: GeneratedSignal = useMemo(() => {
    return isDiscrete
      ? generateDtsSignal(signalConfig, 41, true)
      : generateCtsSignal(signalConfig, -3.0, 3.0, 301);
  }, [signalConfig, isDiscrete]);

  const corrResult = useMemo(() => {
    return computeCorrelation(generatedSignal, generatedSignal, true, isDiscrete, lagCursor);
  }, [generatedSignal, isDiscrete, lagCursor]);

  const psdResult: PsdResult = useMemo(() => {
    return computePsd(generatedSignal, isDiscrete, isDiscrete ? 1024 : 2048);
  }, [generatedSignal, isDiscrete]);

  const echoReadout = useMemo(() => {
    if (!state.echoEnabled) return null;
    return evaluateCorrelationAtLag(corrResult, activeEchoDelay);
  }, [state.echoEnabled, corrResult, activeEchoDelay]);

  const lagCursorReadout = useMemo(() => {
    return evaluateCorrelationAtLag(corrResult, lagCursor);
  }, [corrResult, lagCursor]);

  const handleReset = () => {
    if (onResetAll) {
      onResetAll();
    } else {
      setLocalState(DEFAULT_SHARED_LAB_STATE);
    }
    setLagCursor(0);
  };

  const pointsAutocorr = useMemo(
    () => psdResult.lagAxis.map((l, i) => ({ x: l, y: psdResult.rValues[i] })),
    [psdResult.lagAxis, psdResult.rValues]
  );

  const pointsPsd = useMemo(
    () => psdResult.frequencyAxis.map((f, i) => ({ x: f, y: psdResult.psdValues[i] })),
    [psdResult.frequencyAxis, psdResult.psdValues]
  );

  // Frame active lag & frequency domains prominently
  const domainLag: [number, number] = isDiscrete ? [-20, 20] : [-3.0, 3.0];

  const nyquistFreq = Number((psdResult.samplingRate / 2).toFixed(2));
  const domainFreq: [number, number] = useMemo(() => {
    if (isDiscrete) return [-0.5, 0.5];
    if (state.signalType === 'white_noise') return [-nyquistFreq, nyquistFreq];
    if (state.signalType === 'sine') {
      const bound = Math.min(nyquistFreq, Math.max(10, Math.ceil(state.sineFreq * 2 + 4)));
      return [-bound, bound];
    }
    if (state.signalType === 'pulse') {
      const bound = Math.min(nyquistFreq, Math.max(8, Math.ceil(6 / Math.max(0.4, state.pulseWidth))));
      return [-bound, bound];
    }
    // colored_noise
    const bound = Math.min(nyquistFreq, Math.max(12, Math.ceil(state.coloredNoiseCutoff * 2.5)));
    return [-bound, bound];
  }, [isDiscrete, nyquistFreq, state.signalType, state.sineFreq, state.pulseWidth, state.coloredNoiseCutoff]);

  const autocorrRange: [number, number] = useMemo(() => {
    let minVal = 0;
    let maxVal = 0.5;
    for (let i = 0; i < psdResult.lagAxis.length; i++) {
      const l = psdResult.lagAxis[i];
      if (l >= domainLag[0] && l <= domainLag[1]) {
        const v = psdResult.rValues[i];
        if (v < minVal) minVal = v;
        if (v > maxVal) maxVal = v;
      }
    }
    const span = Math.max(0.2, maxVal - minVal);
    const yMin = Math.floor((minVal - 0.12 * span) * 10) / 10;
    const yMax = Math.ceil((maxVal + 0.22 * span) * 10) / 10;
    return [Math.min(-0.1, yMin), Math.max(0.5, yMax)];
  }, [psdResult.lagAxis, psdResult.rValues, domainLag]);

  const psdRange: [number, number] = useMemo(() => {
    let maxVal = 0.05;
    for (let i = 0; i < psdResult.frequencyAxis.length; i++) {
      const f = psdResult.frequencyAxis[i];
      if (f >= domainFreq[0] && f <= domainFreq[1]) {
        const v = psdResult.psdValues[i];
        if (v > maxVal) maxVal = v;
      }
    }
    const yMax = Math.ceil(maxVal * 1.28 * 100) / 100;
    return [0, Math.max(0.1, yMax)];
  }, [psdResult.frequencyAxis, psdResult.psdValues, domainFreq]);

  const freqUnit = isDiscrete ? 'cyc/smp' : 'Hz';
  const combSpacing = activeEchoDelay > 0 ? 1 / activeEchoDelay : 0;
  const isEnergy = generatedSignal.category === 'energy';

  const renderAutocorrFullscreenBar = (exitFullscreen: () => void) => (
    <FullscreenControlBar
      signalType={state.signalType}
      onChangeSignalType={(t) => updateState((prev) => ({ ...prev, signalType: t }))}
      isDiscrete={isDiscrete}
      lag={lagCursor}
      onChangeLag={setLagCursor}
      echoEnabled={state.echoEnabled}
      onToggleEcho={(enabled) => updateState((prev) => ({ ...prev, echoEnabled: enabled }))}
      echoDelayCts={state.echoDelayCts}
      echoDelayDts={state.echoDelayDts}
      echoGain={state.echoGain}
      onChangeDelayCts={(val) => updateState((prev) => ({ ...prev, echoDelayCts: val }))}
      onChangeDelayDts={(val) => updateState((prev) => ({ ...prev, echoDelayDts: val }))}
      onChangeGain={(val) => updateState((prev) => ({ ...prev, echoGain: val }))}
      onExitFullscreen={exitFullscreen}
    />
  );

  const renderPsdFullscreenBar = (exitFullscreen: () => void) => (
    <FullscreenControlBar
      signalType={state.signalType}
      onChangeSignalType={(t) => updateState((prev) => ({ ...prev, signalType: t }))}
      isDiscrete={isDiscrete}
      echoEnabled={state.echoEnabled}
      onToggleEcho={(enabled) => updateState((prev) => ({ ...prev, echoEnabled: enabled }))}
      echoDelayCts={state.echoDelayCts}
      echoDelayDts={state.echoDelayDts}
      echoGain={state.echoGain}
      onChangeDelayCts={(val) => updateState((prev) => ({ ...prev, echoDelayCts: val }))}
      onChangeDelayDts={(val) => updateState((prev) => ({ ...prev, echoDelayDts: val }))}
      onChangeGain={(val) => updateState((prev) => ({ ...prev, echoGain: val }))}
      onExitFullscreen={exitFullscreen}
    />
  );

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_320px] gap-4 items-start">
      {/* LEFT COLUMN: Two Large Linked Graphs */}
      <div className="min-w-0 w-full space-y-3.5">
        {/* Graph 1: Autocorrelation Function (Lag Domain) */}
        <SignalPlotCanvas
          title={`Autocorrelation · ${isDiscrete ? 'rₓₓ[k]' : 'Rₓₓ(τ)'}`}
          xLabel={isDiscrete ? 'Lag k (samples)' : 'Lag τ (s)'}
          yLabel={`Autocorrelation (${psdResult.rUnits})`}
          domain={domainLag}
          range={autocorrRange}
          isDiscrete={isDiscrete}
          height={310}
          inspectAxisVar={isDiscrete ? 'k' : 'τ'}
          statusBadge={
            state.echoEnabled
              ? `ECHO @ ${isDiscrete ? `k_d=${state.echoDelayDts}` : `τ_d=${state.echoDelayCts.toFixed(2)}s`}`
              : 'LAG DOMAIN'
          }
          headerReadout={
            <CorrelationLagHeaderPill
              isDiscrete={isDiscrete}
              isAutocorrelation={true}
              lag={lagCursor}
              currentR={lagCursorReadout.rValue}
              currentNormalized={lagCursorReadout.rhoValue}
              units={psdResult.rUnits}
            />
          }
          echoLagHighlight={
            echoReadout
              ? {
                  lag: echoReadout.lag,
                  value: echoReadout.rValue,
                  unit: psdResult.rUnits,
                  isDiscrete,
                  symmetric: true,
                }
              : null
          }
          renderFullscreenControls={renderAutocorrFullscreenBar}
          markers={[
            {
              x: 0,
              y: psdResult.zeroLagValue,
              color: '#C85A32',
              style: 'dashed',
            },
            ...(Math.abs(lagCursor) > (isDiscrete ? 0.5 : 0.04)
              ? [
                  {
                    x: lagCursor,
                    y: lagCursorReadout.rValue,
                    color: '#D97706',
                    style: 'solid' as const,
                  },
                ]
              : []),
          ]}
          series={[
            {
              id: 'rxx-curve',
              name: isDiscrete ? 'rₓₓ[k]' : 'Rₓₓ(τ)',
              color: '#1A1917',
              strokeWidth: 2,
              points: pointsAutocorr,
            },
          ]}
        />

        {/* Graph 2: Two-Sided Power / Energy Spectral Density (Frequency Domain) with Area Shading & Parseval Readout */}
        <SignalPlotCanvas
          title={`${isEnergy ? 'Energy Spectral Density' : 'Power Spectral Density'} · ${
            isEnergy ? 'Eₓₓ(f)' : 'Sₓₓ(f)'
          }`}
          xLabel={isDiscrete ? 'Normalized Frequency f (cyc/sample)' : 'Frequency f (Hz)'}
          yLabel={`Spectral Density (${psdResult.psdUnits})`}
          domain={domainFreq}
          range={psdRange}
          isDiscrete={false}
          height={350}
          inspectAxisVar="f"
          statusBadge={
            state.echoEnabled
              ? `COMB ${isDiscrete ? '1/k_d' : '1/τ_d'} = ${combSpacing.toFixed(isDiscrete ? 3 : 2)} ${freqUnit}`
              : 'WIENER–KHINCHIN PSD'
          }
          subheaderReadout={
            <PsdMetricsSubheader
              isDiscrete={isDiscrete}
              isEnergy={isEnergy}
              peakFrequency={psdResult.peakFrequency}
              bandwidth={psdResult.bandwidth}
              psdArea={psdResult.psdArea}
              zeroLagValue={psdResult.zeroLagValue}
              rUnits={psdResult.rUnits}
              freqUnit={freqUnit}
            />
          }
          combFilterHighlight={
            state.echoEnabled && combSpacing > 0
              ? {
                  delay: activeEchoDelay,
                  spacing: combSpacing,
                  alpha: state.echoGain,
                  unitLabel: freqUnit,
                  isDiscrete,
                }
              : null
          }
          renderFullscreenControls={renderPsdFullscreenBar}
          markers={[
            {
              x: 0,
              color: '#8A8882',
              style: 'dashed',
            },
            ...(!state.echoEnabled && state.signalType === 'colored_noise'
              ? [
                  {
                    x: isDiscrete ? Math.min(9.5, state.coloredNoiseCutoff) / 20 : state.coloredNoiseCutoff,
                    color: '#C85A32',
                    style: 'dashed' as const,
                  },
                  {
                    x: -(isDiscrete ? Math.min(9.5, state.coloredNoiseCutoff) / 20 : state.coloredNoiseCutoff),
                    color: '#C85A32',
                    style: 'dashed' as const,
                  },
                ]
              : state.signalType === 'sine' && psdResult.peakFrequency > (isDiscrete ? 0.005 : 0.05)
              ? [
                  {
                    x: psdResult.peakFrequency,
                    y: psdResult.peakPsdValue,
                    color: '#C85A32',
                    style: 'dashed' as const,
                  },
                  {
                    x: -psdResult.peakFrequency,
                    y: psdResult.peakPsdValue,
                    color: '#C85A32',
                    style: 'dashed' as const,
                  },
                ]
              : []),
          ]}
          series={[
            {
              id: 'psd-curve',
              name: isEnergy ? 'Eₓₓ(f)' : 'Sₓₓ(f)',
              type: 'area',
              color: '#C85A32',
              strokeWidth: 2.15,
              fillOpacity: 0.30,
              points: pointsPsd,
            },
          ]}
        />
      </div>

      {/* RIGHT COLUMN: Sticky Control Panel (no max-h / no inner scrollbar) */}
      <aside className="w-full lg:sticky lg:top-4 bg-white border border-[#E6E4DD] rounded-xl p-3.5 shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2.5 border-b border-[#E6E4DD]">
          <div className="flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-[#C85A32]" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1917]">
              Lab Controls
            </h3>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-mono font-medium text-[#585651] hover:text-[#1A1917] bg-[#FAF9F6] hover:bg-[#F3F2EC] border border-[#E6E4DD] rounded transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>

        {/* CTS / DTS Toggle */}
        <div className="grid grid-cols-2 gap-1 rounded-md border border-[#E6E4DD] bg-[#FAF9F6] p-1">
          <button
            type="button"
            onClick={() => {
              setLagCursor((prev) => Math.max(-3.0, Math.min(3.0, Number((Math.round(prev * 20) / 20).toFixed(2)))));
              updateState((prev) => ({ ...prev, timeDomain: 'continuous' }));
            }}
            className={`py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
              !isDiscrete ? 'bg-[#1A1917] text-white' : 'text-[#585651] hover:text-[#1A1917]'
            }`}
          >
            CTS
          </button>
          <button
            type="button"
            onClick={() => {
              setLagCursor((prev) => Math.max(-20, Math.min(20, Math.round(prev))));
              updateState((prev) => ({ ...prev, timeDomain: 'discrete' }));
            }}
            className={`py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
              isDiscrete ? 'bg-[#1A1917] text-white' : 'text-[#585651] hover:text-[#1A1917]'
            }`}
          >
            DTS
          </button>
        </div>

        {/* Core Signal Controls (4 Core Signals) */}
        <div className="space-y-1.5">
          <div className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-[#75736E]">
            Input Signal x
          </div>
          <CoreSignalControls
            signalType={state.signalType}
            isDiscrete={isDiscrete}
            sineAmp={state.sineAmp}
            sineFreq={state.sineFreq}
            sinePhase={state.sinePhase}
            pulseAmp={state.pulseAmp}
            pulseWidth={state.pulseWidth}
            pulsePos={state.pulsePos}
            whiteNoiseVariance={state.whiteNoiseVariance}
            whiteNoiseSeed={state.whiteNoiseSeed}
            coloredNoiseVariance={state.coloredNoiseVariance}
            coloredNoiseCutoff={state.coloredNoiseCutoff}
            coloredNoiseSeed={state.coloredNoiseSeed}
            onChangeSignalType={(t) => updateState((prev) => ({ ...prev, signalType: t }))}
            onChangeSineAmp={(v) => updateState((prev) => ({ ...prev, sineAmp: v }))}
            onChangeSineFreq={(v) => updateState((prev) => ({ ...prev, sineFreq: v }))}
            onChangePulseAmp={(v) => updateState((prev) => ({ ...prev, pulseAmp: v }))}
            onChangePulseWidth={(v) => updateState((prev) => ({ ...prev, pulseWidth: v }))}
            onChangePulsePos={(v) => updateState((prev) => ({ ...prev, pulsePos: v }))}
            onChangeWhiteVar={(v) => updateState((prev) => ({ ...prev, whiteNoiseVariance: v }))}
            onRegenWhiteSeed={() =>
              updateState((prev) => ({ ...prev, whiteNoiseSeed: prev.whiteNoiseSeed + 1 }))
            }
            onChangeColoredVar={(v) => updateState((prev) => ({ ...prev, coloredNoiseVariance: v }))}
            onChangeColoredCutoff={(v) => updateState((prev) => ({ ...prev, coloredNoiseCutoff: v }))}
            onRegenColoredSeed={() =>
              updateState((prev) => ({ ...prev, coloredNoiseSeed: prev.coloredNoiseSeed + 1 }))
            }
            showPhase={false}
          />
        </div>

        {/* Channel Echo Centerpiece Card */}
        <ChannelEchoCard
          isDiscrete={isDiscrete}
          echoEnabled={state.echoEnabled}
          echoDelayCts={state.echoDelayCts}
          echoDelayDts={state.echoDelayDts}
          echoGain={state.echoGain}
          onToggleEcho={(enabled) => updateState((prev) => ({ ...prev, echoEnabled: enabled }))}
          onChangeDelayCts={(val) => updateState((prev) => ({ ...prev, echoDelayCts: val }))}
          onChangeDelayDts={(val) => updateState((prev) => ({ ...prev, echoDelayDts: val }))}
          onChangeGain={(val) => updateState((prev) => ({ ...prev, echoGain: val }))}
        />
      </aside>
    </div>
  );
};
