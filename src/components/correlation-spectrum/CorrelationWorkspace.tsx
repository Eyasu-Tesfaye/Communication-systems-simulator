import React, { useState, useMemo } from 'react';
import { RotateCcw, Sliders } from 'lucide-react';
import { SignalPlotCanvas } from './SignalPlotCanvas';
import {
  UnifiedSignalConfig,
  generateCtsSignal,
  generateDtsSignal,
  GeneratedSignal,
} from './signalGenerators';
import {
  computeCorrelation,
  CorrelationResult,
  evaluateCorrelationAtLag,
} from './correlationEngine';
import {
  CoreSignalType,
  DEFAULT_SHARED_LAB_STATE,
  SharedLabState,
} from './labTypes';
import {
  ChannelEchoCard,
  CoreSignalControls,
  CorrelationLagHeaderPill,
  FullscreenControlBar,
} from './SharedLabControls';

export interface CorrelationWorkspaceProps {
  sharedState?: SharedLabState;
  onUpdateState?: (updater: (prev: SharedLabState) => SharedLabState) => void;
  onResetAll?: () => void;
}

export const CorrelationWorkspace: React.FC<CorrelationWorkspaceProps> = ({
  sharedState,
  onUpdateState,
  onResetAll,
}) => {
  const [localState, setLocalState] = useState<SharedLabState>(DEFAULT_SHARED_LAB_STATE);
  const state = sharedState ?? localState;
  const updateState = onUpdateState ?? setLocalState;

  const [isAutocorrelation, setIsAutocorrelation] = useState<boolean>(true);
  const [lag, setLag] = useState<number>(0.0);

  // Signal Y Parameters (Cross-correlation target)
  const [signalTypeY, setSignalTypeY] = useState<CoreSignalType>('pulse');
  const [sineAmpY, setSineAmpY] = useState<number>(1.5);
  const [sineFreqY, setSineFreqY] = useState<number>(2.0);
  const [sinePhaseY, setSinePhaseY] = useState<number>(0);
  const [pulseAmpY, setPulseAmpY] = useState<number>(1.5);
  const [pulseWidthY, setPulseWidthY] = useState<number>(1.0);
  const [pulsePosY, setPulsePosY] = useState<number>(0.8);
  const [whiteNoiseVarY, setWhiteNoiseVarY] = useState<number>(1.0);
  const [whiteNoiseSeedY, setWhiteNoiseSeedY] = useState<number>(88);
  const [coloredNoiseVarY, setColoredNoiseVarY] = useState<number>(1.0);
  const [coloredNoiseCutoffY, setColoredNoiseCutoffY] = useState<number>(3.5);
  const [coloredNoiseSeedY, setColoredNoiseSeedY] = useState<number>(202);

  const isDiscrete = state.timeDomain === 'discrete';
  const sampleRate = isDiscrete ? 20 : 50;
  const activeEchoDelay = isDiscrete ? state.echoDelayDts : state.echoDelayCts;

  const configX: UnifiedSignalConfig = useMemo(() => {
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

  const configY: UnifiedSignalConfig = useMemo(() => {
    const effectiveSineFreqY = isDiscrete ? Math.min(4.5, sineFreqY) : sineFreqY;
    return {
      type: signalTypeY,
      sine: { amplitude: sineAmpY, frequency: effectiveSineFreqY, phase: sinePhaseY },
      pulse: { amplitude: pulseAmpY, width: pulseWidthY, position: pulsePosY },
      whiteNoise: {
        stdDev: Math.sqrt(Math.max(0.01, whiteNoiseVarY)),
        variance: whiteNoiseVarY,
        seed: whiteNoiseSeedY,
      },
      coloredNoise: {
        stdDev: Math.sqrt(Math.max(0.01, coloredNoiseVarY)),
        variance: coloredNoiseVarY,
        cutoffFreq: coloredNoiseCutoffY,
        filterParam: Math.exp((-2 * Math.PI * coloredNoiseCutoffY) / sampleRate),
        seed: coloredNoiseSeedY,
      },
    };
  }, [
    signalTypeY,
    sineAmpY,
    sineFreqY,
    sinePhaseY,
    pulseAmpY,
    pulseWidthY,
    pulsePosY,
    whiteNoiseVarY,
    whiteNoiseSeedY,
    coloredNoiseVarY,
    coloredNoiseCutoffY,
    coloredNoiseSeedY,
    isDiscrete,
    sampleRate,
  ]);

  const generatedX: GeneratedSignal = useMemo(() => {
    return isDiscrete ? generateDtsSignal(configX, 41, true) : generateCtsSignal(configX, -3.0, 3.0, 301);
  }, [configX, isDiscrete]);

  const generatedY: GeneratedSignal = useMemo(() => {
    if (isAutocorrelation) return generatedX;
    return isDiscrete ? generateDtsSignal(configY, 41, true) : generateCtsSignal(configY, -3.0, 3.0, 301);
  }, [configY, isDiscrete, isAutocorrelation, generatedX]);

  const correlationResult: CorrelationResult = useMemo(() => {
    return computeCorrelation(generatedX, generatedY, isAutocorrelation, isDiscrete, lag);
  }, [generatedX, generatedY, isAutocorrelation, isDiscrete, lag]);

  const echoPeakReadout = useMemo(() => {
    if (!state.echoEnabled) return null;
    const res = evaluateCorrelationAtLag(correlationResult, activeEchoDelay);
    return { lag: res.lag, value: res.rValue };
  }, [state.echoEnabled, correlationResult, activeEchoDelay]);

  const delayedSamples = useMemo(() => generatedY.evalShifted(lag), [generatedY, lag]);

  const handleReset = () => {
    if (onResetAll) {
      onResetAll();
    } else {
      setLocalState(DEFAULT_SHARED_LAB_STATE);
    }
    setIsAutocorrelation(true);
    setLag(0.0);
    setSignalTypeY('pulse');
    setSineAmpY(1.5);
    setSineFreqY(2.0);
    setSinePhaseY(0);
    setPulseAmpY(1.5);
    setPulseWidthY(1.0);
    setPulsePosY(0.8);
    setWhiteNoiseVarY(1.0);
    setWhiteNoiseSeedY(88);
    setColoredNoiseVarY(1.0);
    setColoredNoiseCutoffY(3.5);
    setColoredNoiseSeedY(202);
  };

  const pointsSignalX = useMemo(
    () => generatedX.timeVector.map((t, i) => ({ x: t, y: generatedX.samples[i] })),
    [generatedX]
  );

  const pointsSignalDelayed = useMemo(
    () => generatedX.timeVector.map((t, i) => ({ x: t, y: delayedSamples[i] })),
    [generatedX.timeVector, delayedSamples]
  );

  const pointsCorrelation = useMemo(
    () => correlationResult.lags.map((l, i) => ({ x: l, y: correlationResult.rValues[i] })),
    [correlationResult]
  );

  const overlapShadingPoints = useMemo(
    () =>
      generatedX.timeVector.map((t, i) => ({
        x: t,
        a: generatedX.samples[i],
        b: delayedSamples[i],
      })),
    [generatedX.timeVector, generatedX.samples, delayedSamples]
  );

  // Frame active lag region prominently: [-3, +3] s in CTS and [-20, +20] samples in DTS
  const domainX: [number, number] = isDiscrete ? [-20, 20] : [-3.0, 3.0];
  const domainLag: [number, number] = isDiscrete ? [-20, 20] : [-3.0, 3.0];

  const signalPlotRange: [number, number] = useMemo(() => {
    let maxAbs = 0.5;
    for (const p of pointsSignalX) maxAbs = Math.max(maxAbs, Math.abs(p.y));
    for (const p of pointsSignalDelayed) maxAbs = Math.max(maxAbs, Math.abs(p.y));
    const bound = Math.ceil(maxAbs * 1.18 * 10) / 10;
    return [-bound, bound];
  }, [pointsSignalX, pointsSignalDelayed]);

  const corrPlotRange: [number, number] = useMemo(() => {
    let minVal = 0;
    let maxVal = 0.5;
    for (let i = 0; i < correlationResult.lags.length; i++) {
      const l = correlationResult.lags[i];
      if (l >= domainLag[0] && l <= domainLag[1]) {
        const v = correlationResult.rValues[i];
        if (v < minVal) minVal = v;
        if (v > maxVal) maxVal = v;
      }
    }
    const span = Math.max(0.4, maxVal - minVal);
    const yMin = Math.floor((minVal - 0.12 * span) * 10) / 10;
    const yMax = Math.ceil((maxVal + 0.22 * span) * 10) / 10;
    return [Math.min(-0.1, yMin), Math.max(0.5, yMax)];
  }, [correlationResult.lags, correlationResult.rValues, domainLag]);

  const renderFullscreenBar = (exitFullscreen: () => void) => (
    <FullscreenControlBar
      signalType={state.signalType}
      onChangeSignalType={(t) => updateState((prev) => ({ ...prev, signalType: t }))}
      isDiscrete={isDiscrete}
      lag={lag}
      onChangeLag={setLag}
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
      {/* LEFT COLUMN: Two Large Graphs (Metrics inside Graph Corner) */}
      <div className="min-w-0 w-full space-y-3.5">
        {/* Graph 1: Signal Alignment with Live Overlap Shading & R(tau) Readout */}
        <SignalPlotCanvas
          title={
            isAutocorrelation
              ? `Signal Alignment · x${isDiscrete ? '[n]' : '(t)'} & x${isDiscrete ? '[n−k]' : '(t−τ)'}`
              : `Signal Alignment · x${isDiscrete ? '[n]' : '(t)'} & y${isDiscrete ? '[n−k]' : '(t−τ)'}`
          }
          xLabel={isDiscrete ? 'Sample Index n' : 'Time t (s)'}
          yLabel="Amplitude (V)"
          domain={domainX}
          range={signalPlotRange}
          isDiscrete={isDiscrete}
          height={310}
          inspectAxisVar={isDiscrete ? 'n' : 't'}
          statusBadge={isDiscrete ? 'DTS' : 'CTS'}
          headerReadout={
            <CorrelationLagHeaderPill
              isDiscrete={isDiscrete}
              isAutocorrelation={isAutocorrelation}
              lag={lag}
              currentR={correlationResult.currentR}
              currentNormalized={correlationResult.currentNormalized}
              units={correlationResult.units}
            />
          }
          inspectExtra={
            <span className="inline-flex items-center gap-1 text-[#C85A32] pl-1 border-l border-[#C85A32]/25">
              <span>
                {isAutocorrelation
                  ? isDiscrete
                    ? 'rₓₓ[k]'
                    : 'Rₓₓ(τ)'
                  : isDiscrete
                  ? 'rₓᵧ[k]'
                  : 'Rₓᵧ(τ)'}
                :
              </span>
              <strong>{correlationResult.currentR.toFixed(3)}</strong>
            </span>
          }
          overlapShading={overlapShadingPoints}
          renderFullscreenControls={renderFullscreenBar}
          series={[
            {
              id: 'sig-orig',
              name: `x${isDiscrete ? '[n]' : '(t)'}`,
              color: '#1A1917',
              strokeWidth: 2,
              strokeOpacity: 0.78,
              markerStyle: 'filled',
              points: pointsSignalX,
            },
            {
              id: 'sig-delayed',
              name: isAutocorrelation ? `x${isDiscrete ? '[n−k]' : '(t−τ)'}` : `y${isDiscrete ? '[n−k]' : '(t−τ)'}`,
              color: '#C85A32',
              strokeWidth: 2.4,
              dash: isDiscrete ? 'none' : '7 4',
              markerStyle: 'ring',
              points: pointsSignalDelayed,
            },
          ]}
        />

        {/* Graph 2: Correlation Function */}
        <SignalPlotCanvas
          title={
            isAutocorrelation
              ? `Autocorrelation · ${isDiscrete ? 'rₓₓ[k]' : 'Rₓₓ(τ)'}`
              : `Cross-Correlation · ${isDiscrete ? 'rₓᵧ[k]' : 'Rₓᵧ(τ)'}`
          }
          xLabel={isDiscrete ? 'Lag k (samples)' : 'Lag τ (s)'}
          yLabel={`Correlation (${correlationResult.units})`}
          domain={domainLag}
          range={corrPlotRange}
          isDiscrete={isDiscrete}
          height={350}
          inspectAxisVar={isDiscrete ? 'k' : 'τ'}
          statusBadge={
            state.echoEnabled
              ? `ECHO @ ${isDiscrete ? `k_d=${state.echoDelayDts}` : `τ_d=${state.echoDelayCts.toFixed(2)}s`}`
              : correlationResult.convention === 'energy'
              ? 'ENERGY'
              : 'POWER'
          }
          headerReadout={
            <CorrelationLagHeaderPill
              isDiscrete={isDiscrete}
              isAutocorrelation={isAutocorrelation}
              lag={lag}
              currentR={correlationResult.currentR}
              currentNormalized={correlationResult.currentNormalized}
              units={correlationResult.units}
            />
          }
          echoLagHighlight={
            echoPeakReadout
              ? {
                  lag: echoPeakReadout.lag,
                  value: echoPeakReadout.value,
                  unit: correlationResult.units,
                  isDiscrete,
                  symmetric: isAutocorrelation,
                }
              : null
          }
          renderFullscreenControls={renderFullscreenBar}
          markers={[
            {
              x: 0,
              y: isAutocorrelation ? correlationResult.zeroLagValue : undefined,
              color: isAutocorrelation ? '#C85A32' : '#8A8882',
              style: 'dashed',
            },
            ...(Math.abs(lag) > (isDiscrete ? 0.5 : 0.04)
              ? [
                  {
                    x: lag,
                    y: correlationResult.currentR,
                    color: '#D97706',
                    style: 'solid' as const,
                  },
                ]
              : []),
          ]}
          series={[
            {
              id: 'corr-curve',
              name: isAutocorrelation
                ? isDiscrete
                  ? 'rₓₓ[k]'
                  : 'Rₓₓ(τ)'
                : isDiscrete
                ? 'rₓᵧ[k]'
                : 'Rₓᵧ(τ)',
              color: '#C85A32',
              strokeWidth: 2.25,
              points: pointsCorrelation,
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

        {/* CTS / DTS & Auto / Cross Mode */}
        <div className="space-y-1.5">
          <div className="grid grid-cols-2 gap-1 rounded-md border border-[#E6E4DD] bg-[#FAF9F6] p-1">
            <button
              type="button"
              onClick={() => {
                setLag((prev) => Math.max(-3.0, Math.min(3.0, Number((Math.round(prev * 20) / 20).toFixed(2)))));
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
                setLag((prev) => Math.max(-20, Math.min(20, Math.round(prev))));
                updateState((prev) => ({ ...prev, timeDomain: 'discrete' }));
              }}
              className={`py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                isDiscrete ? 'bg-[#1A1917] text-white' : 'text-[#585651] hover:text-[#1A1917]'
              }`}
            >
              DTS
            </button>
          </div>

          <div className="grid grid-cols-2 gap-1 rounded-md border border-[#E6E4DD] bg-[#FAF9F6] p-1">
            <button
              type="button"
              onClick={() => setIsAutocorrelation(true)}
              className={`py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                isAutocorrelation
                  ? 'bg-[#C85A32] text-white'
                  : 'text-[#585651] hover:text-[#1A1917]'
              }`}
            >
              Auto R<sub>xx</sub>
            </button>
            <button
              type="button"
              onClick={() => setIsAutocorrelation(false)}
              className={`py-1 text-xs font-semibold rounded transition-colors cursor-pointer ${
                !isAutocorrelation
                  ? 'bg-[#C85A32] text-white'
                  : 'text-[#585651] hover:text-[#1A1917]'
              }`}
            >
              Cross R<sub>xy</sub>
            </button>
          </div>
        </div>

        {/* Core Signal X Controls */}
        <div className="space-y-1.5">
          <div className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-[#75736E]">
            {isAutocorrelation ? 'Input Signal x' : 'Signal X'}
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
            onChangeSinePhase={(v) => updateState((prev) => ({ ...prev, sinePhase: v }))}
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
          />
        </div>

        {/* Signal Y Controls (Cross-correlation only) */}
        {!isAutocorrelation && (
          <div className="space-y-1.5 pt-2 border-t border-[#E6E4DD]">
            <div className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-[#C85A32]">
              Target Signal Y
            </div>
            <CoreSignalControls
              signalType={signalTypeY}
              isDiscrete={isDiscrete}
              sineAmp={sineAmpY}
              sineFreq={sineFreqY}
              sinePhase={sinePhaseY}
              pulseAmp={pulseAmpY}
              pulseWidth={pulseWidthY}
              pulsePos={pulsePosY}
              whiteNoiseVariance={whiteNoiseVarY}
              whiteNoiseSeed={whiteNoiseSeedY}
              coloredNoiseVariance={coloredNoiseVarY}
              coloredNoiseCutoff={coloredNoiseCutoffY}
              coloredNoiseSeed={coloredNoiseSeedY}
              onChangeSignalType={setSignalTypeY}
              onChangeSineAmp={setSineAmpY}
              onChangeSineFreq={setSineFreqY}
              onChangeSinePhase={setSinePhaseY}
              onChangePulseAmp={setPulseAmpY}
              onChangePulseWidth={setPulseWidthY}
              onChangePulsePos={setPulsePosY}
              onChangeWhiteVar={setWhiteNoiseVarY}
              onRegenWhiteSeed={() => setWhiteNoiseSeedY((s) => s + 1)}
              onChangeColoredVar={setColoredNoiseVarY}
              onChangeColoredCutoff={setColoredNoiseCutoffY}
              onRegenColoredSeed={() => setColoredNoiseSeedY((s) => s + 1)}
            />
          </div>
        )}

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

        {/* Lag Control */}
        <div className="bg-[#FBF4F0] border border-[#C85A32]/25 rounded-lg p-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-mono font-bold uppercase tracking-wider text-[#C85A32]">
              Lag ({isDiscrete ? 'k' : 'τ'})
            </span>
            <span className="font-mono font-bold text-[#1A1917]">
              {isDiscrete
                ? `${Math.round(lag)} smp`
                : `${lag >= 0 ? '+' : ''}${lag.toFixed(2)} s`}
            </span>
          </div>

          <input
            type="range"
            min={isDiscrete ? -20 : -3.0}
            max={isDiscrete ? 20 : 3.0}
            step={isDiscrete ? 1 : 0.05}
            value={lag}
            onChange={(e) => setLag(parseFloat(e.target.value))}
            className="w-full accent-[#C85A32] cursor-pointer"
          />

          <div className="flex items-center justify-between gap-1.5">
            <button
              type="button"
              onClick={() =>
                setLag((prev) =>
                  Math.max(isDiscrete ? -20 : -3.0, Number((prev - (isDiscrete ? 1 : 0.1)).toFixed(2)))
                )
              }
              className="flex-1 py-1 bg-white border border-[#E6E4DD] rounded text-[11px] font-mono text-[#585651] hover:text-[#1A1917] cursor-pointer"
            >
              {isDiscrete ? '−1' : '−0.1s'}
            </button>
            <button
              type="button"
              onClick={() => setLag(0.0)}
              className="flex-1 py-1 bg-white border border-[#E6E4DD] rounded text-[11px] font-mono font-semibold text-[#C85A32] hover:bg-[#FAF9F6] cursor-pointer"
            >
              {isDiscrete ? 'k = 0' : 'τ = 0'}
            </button>
            <button
              type="button"
              onClick={() =>
                setLag((prev) =>
                  Math.min(isDiscrete ? 20 : 3.0, Number((prev + (isDiscrete ? 1 : 0.1)).toFixed(2)))
                )
              }
              className="flex-1 py-1 bg-white border border-[#E6E4DD] rounded text-[11px] font-mono text-[#585651] hover:text-[#1A1917] cursor-pointer"
            >
              {isDiscrete ? '+1' : '+0.1s'}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
};
