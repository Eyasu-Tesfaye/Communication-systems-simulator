import React from 'react';
import { Radio, Shuffle, Minimize2 } from 'lucide-react';
import { CORE_SIGNAL_OPTIONS, CoreSignalType } from './labTypes';

export interface CorrelationLagHeaderPillProps {
  isDiscrete: boolean;
  isAutocorrelation?: boolean;
  lag: number;
  currentR: number;
  currentNormalized: number;
  units: string;
}

export const CorrelationLagHeaderPill: React.FC<CorrelationLagHeaderPillProps> = ({
  isDiscrete,
  isAutocorrelation = true,
  lag,
  currentR,
  currentNormalized,
  units,
}) => {
  const lagText = isDiscrete
    ? `k=${Math.round(lag)}`
    : `τ=${lag >= 0 ? '+' : ''}${lag.toFixed(2)}s`;

  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono px-2 py-0.5 rounded bg-[#FBF4F0] border border-[#C85A32]/25 text-[#1A1917] tabular-nums">
      <span className="text-[#75736E]">
        {isAutocorrelation ? (
          isDiscrete ? (
            <>
              r<sub>xx</sub>[{lagText}]
            </>
          ) : (
            <>
              R<sub>xx</sub>({lagText})
            </>
          )
        ) : isDiscrete ? (
          <>
            r<sub>xy</sub>[{lagText}]
          </>
        ) : (
          <>
            R<sub>xy</sub>({lagText})
          </>
        )}
        :
      </span>
      <strong className="text-[#C85A32]">{currentR.toFixed(3)}</strong>
      <span className="text-[#75736E]">{units}</span>
      <span className="text-[#D1CFCE]">|</span>
      <span className="text-[#75736E]">ρ:</span>
      <strong>{currentNormalized >= 0 ? `+${currentNormalized.toFixed(3)}` : currentNormalized.toFixed(3)}</strong>
    </span>
  );
};

export interface PsdMetricsSubheaderProps {
  isDiscrete: boolean;
  isEnergy: boolean;
  peakFrequency: number;
  bandwidth: number;
  psdArea: number;
  zeroLagValue: number;
  rUnits: string;
  freqUnit: string;
}

export const PsdMetricsSubheader: React.FC<PsdMetricsSubheaderProps> = ({
  isDiscrete,
  isEnergy,
  peakFrequency,
  bandwidth,
  psdArea,
  zeroLagValue,
  rUnits,
  freqUnit,
}) => {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 bg-[#FAF9F6] border border-[#E6E4DD] rounded px-2.5 py-1 text-[11px] font-mono">
      <span className="inline-flex items-center gap-1.5">
        <span className="text-[#75736E]">
          PSD Area ∫{isEnergy ? 'E' : 'S'}(f)df:
        </span>
        <strong className="text-[#C85A32] tabular-nums">
          {psdArea.toFixed(3)} <span className="font-normal text-[#75736E]">{rUnits}</span>
        </strong>
      </span>

      <span className="inline-flex items-center gap-1.5">
        <span className="text-[#75736E]">
          Parseval vs. R<sub>x</sub>(0):
        </span>
        <strong className="text-emerald-700 tabular-nums">
          {psdArea.toFixed(3)} = {zeroLagValue.toFixed(3)} {rUnits}
        </strong>
      </span>

      <span className="inline-flex items-center gap-1.5">
        <span className="text-[#75736E]">
          f<sub>peak</sub>:
        </span>
        <strong className="text-[#1A1917] tabular-nums">
          {isDiscrete ? peakFrequency.toFixed(3) : peakFrequency.toFixed(2)}{' '}
          <span className="font-normal text-[#75736E]">{freqUnit}</span>
        </strong>
      </span>

      <span className="inline-flex items-center gap-1.5">
        <span className="text-[#75736E]">Δf:</span>
        <strong className="text-[#1A1917] tabular-nums">
          {isDiscrete ? bandwidth.toFixed(3) : bandwidth.toFixed(2)}{' '}
          <span className="font-normal text-[#75736E]">{freqUnit}</span>
        </strong>
      </span>
    </div>
  );
};

export interface ChannelEchoCardProps {
  isDiscrete: boolean;
  echoEnabled: boolean;
  echoDelayCts: number;
  echoDelayDts: number;
  echoGain: number;
  onToggleEcho: (enabled: boolean) => void;
  onChangeDelayCts: (val: number) => void;
  onChangeDelayDts: (val: number) => void;
  onChangeGain: (val: number) => void;
}

export const ChannelEchoCard: React.FC<ChannelEchoCardProps> = ({
  isDiscrete,
  echoEnabled,
  echoDelayCts,
  echoDelayDts,
  echoGain,
  onToggleEcho,
  onChangeDelayCts,
  onChangeDelayDts,
  onChangeGain,
}) => {
  const activeDelay = isDiscrete ? echoDelayDts : echoDelayCts;
  const combSpacing = activeDelay > 0 ? 1 / activeDelay : 0;

  return (
    <div
      className={`rounded-lg border p-3 transition-colors ${
        echoEnabled ? 'bg-[#EFF6FF]/60 border-[#93C5FD]' : 'bg-[#FAF9F6] border-[#E6E4DD]'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Radio className={`w-3.5 h-3.5 ${echoEnabled ? 'text-[#2563EB]' : 'text-[#75736E]'}`} />
          <div>
            <div className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1917]">
              Channel Echo
            </div>
            <div className="text-[10px] font-mono text-[#585651]">
              {isDiscrete ? (
                <>
                  x[n] + α x[n − k<sub>d</sub>]
                </>
              ) : (
                <>
                  x(t) + α x(t − τ<sub>d</sub>)
                </>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={echoEnabled}
          onClick={() => onToggleEcho(!echoEnabled)}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 ${
            echoEnabled ? 'bg-[#2563EB]' : 'bg-[#D1CFCE]'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
              echoEnabled ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      <div className={`mt-2.5 space-y-2 ${echoEnabled ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
        <div>
          <div className="flex justify-between text-xs mb-0.5">
            <span className="font-medium text-[#585651]">
              Echo Delay ({isDiscrete ? <>k<sub>d</sub></> : <>τ<sub>d</sub></>})
            </span>
            <span className="font-mono font-bold text-[#1D4ED8]">
              {isDiscrete ? `${echoDelayDts} smp` : `${echoDelayCts.toFixed(2)} s`}
            </span>
          </div>
          {isDiscrete ? (
            <input
              type="range"
              min="1"
              max="15"
              step="1"
              value={echoDelayDts}
              onChange={(e) => onChangeDelayDts(parseInt(e.target.value, 10))}
              className="w-full accent-[#2563EB] cursor-pointer"
            />
          ) : (
            <input
              type="range"
              min="0.10"
              max="2.00"
              step="0.02"
              value={echoDelayCts}
              onChange={(e) => onChangeDelayCts(parseFloat(e.target.value))}
              className="w-full accent-[#2563EB] cursor-pointer"
            />
          )}
        </div>

        <div>
          <div className="flex justify-between text-xs mb-0.5">
            <span className="font-medium text-[#585651]">Echo Gain (α)</span>
            <span className="font-mono font-bold text-[#1D4ED8]">{echoGain.toFixed(2)}</span>
          </div>
          <input
            type="range"
            min="0.05"
            max="1.00"
            step="0.05"
            value={echoGain}
            onChange={(e) => onChangeGain(parseFloat(e.target.value))}
            className="w-full accent-[#2563EB] cursor-pointer"
          />
        </div>

        {echoEnabled && (
          <div className="flex items-center justify-between px-2 py-1 rounded bg-white border border-[#BFDBFE] text-[10.5px] font-mono">
            <span className="text-[#585651]">
              Comb Spacing ({isDiscrete ? <>1/k<sub>d</sub></> : <>1/τ<sub>d</sub></>})
            </span>
            <span className="font-bold text-[#1D4ED8]">
              {isDiscrete ? `${combSpacing.toFixed(3)} cyc/smp` : `${combSpacing.toFixed(2)} Hz`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export interface CoreSignalControlsProps {
  signalType: CoreSignalType;
  isDiscrete: boolean;
  sineAmp: number;
  sineFreq: number;
  sinePhase: number;
  pulseAmp: number;
  pulseWidth: number;
  pulsePos: number;
  whiteNoiseVariance: number;
  whiteNoiseSeed: number;
  coloredNoiseVariance: number;
  coloredNoiseCutoff: number;
  coloredNoiseSeed: number;
  onChangeSignalType: (t: CoreSignalType) => void;
  onChangeSineAmp: (v: number) => void;
  onChangeSineFreq: (v: number) => void;
  onChangeSinePhase?: (v: number) => void;
  onChangePulseAmp: (v: number) => void;
  onChangePulseWidth: (v: number) => void;
  onChangePulsePos: (v: number) => void;
  onChangeWhiteVar: (v: number) => void;
  onRegenWhiteSeed: () => void;
  onChangeColoredVar: (v: number) => void;
  onChangeColoredCutoff: (v: number) => void;
  onRegenColoredSeed: () => void;
  showPhase?: boolean;
}

export const CoreSignalControls: React.FC<CoreSignalControlsProps> = ({
  signalType,
  isDiscrete,
  sineAmp,
  sineFreq,
  sinePhase,
  pulseAmp,
  pulseWidth,
  pulsePos,
  whiteNoiseVariance,
  whiteNoiseSeed,
  coloredNoiseVariance,
  coloredNoiseCutoff,
  coloredNoiseSeed,
  onChangeSignalType,
  onChangeSineAmp,
  onChangeSineFreq,
  onChangeSinePhase,
  onChangePulseAmp,
  onChangePulseWidth,
  onChangePulsePos,
  onChangeWhiteVar,
  onRegenWhiteSeed,
  onChangeColoredVar,
  onChangeColoredCutoff,
  onRegenColoredSeed,
  showPhase = true,
}) => {
  return (
    <div className="space-y-2.5">
      {/* Strictly 4 Core Signal Selector */}
      <div className="grid grid-cols-2 gap-1.5">
        {CORE_SIGNAL_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChangeSignalType(opt.id)}
            className={`px-2 py-1.5 text-xs font-semibold rounded-md border text-left transition-colors cursor-pointer ${
              signalType === opt.id
                ? 'bg-[#FBF4F0] text-[#C85A32] border-[#C85A32]/50 shadow-2xs'
                : 'bg-[#FAF9F6] text-[#585651] border-[#E6E4DD] hover:text-[#1A1917] hover:bg-[#F3F2EC]'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Signal-specific Parameters */}
      <div className="p-2.5 bg-[#FAF9F6] border border-[#E6E4DD] rounded-lg space-y-2">
        {signalType === 'sine' && (
          <>
            <div>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="font-medium text-[#585651]">Amplitude (A)</span>
                <span className="font-mono text-[#1A1917] font-semibold">{sineAmp.toFixed(2)} V</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="3.5"
                step="0.1"
                value={sineAmp}
                onChange={(e) => onChangeSineAmp(parseFloat(e.target.value))}
                className="w-full accent-[#C85A32] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="font-medium text-[#585651]">Frequency (f₀)</span>
                <span className="font-mono text-[#1A1917] font-semibold">
                  {isDiscrete
                    ? `${(Math.min(4.5, sineFreq) / 10).toFixed(2)} cyc/smp`
                    : `${sineFreq.toFixed(1)} Hz`}
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max={isDiscrete ? '4.5' : '10.0'}
                step="0.5"
                value={isDiscrete ? Math.min(4.5, sineFreq) : sineFreq}
                onChange={(e) => onChangeSineFreq(parseFloat(e.target.value))}
                className="w-full accent-[#C85A32] cursor-pointer"
              />
            </div>

            {showPhase && onChangeSinePhase && (
              <div>
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="font-medium text-[#585651]">Phase (ϕ)</span>
                  <span className="font-mono text-[#1A1917] font-semibold">{sinePhase}°</span>
                </div>
                <input
                  type="range"
                  min="-180"
                  max="180"
                  step="15"
                  value={sinePhase}
                  onChange={(e) => onChangeSinePhase(parseInt(e.target.value, 10))}
                  className="w-full accent-[#C85A32] cursor-pointer"
                />
              </div>
            )}
          </>
        )}

        {signalType === 'pulse' && (
          <>
            <div>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="font-medium text-[#585651]">Amplitude (A)</span>
                <span className="font-mono text-[#1A1917] font-semibold">{pulseAmp.toFixed(2)} V</span>
              </div>
              <input
                type="range"
                min="0.2"
                max="3.5"
                step="0.1"
                value={pulseAmp}
                onChange={(e) => onChangePulseAmp(parseFloat(e.target.value))}
                className="w-full accent-[#C85A32] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="font-medium text-[#585651]">Width (W)</span>
                <span className="font-mono text-[#1A1917] font-semibold">
                  {isDiscrete ? `${Math.round(pulseWidth * 5)} smp` : `${pulseWidth.toFixed(2)} s`}
                </span>
              </div>
              <input
                type="range"
                min="0.4"
                max="2.4"
                step="0.2"
                value={pulseWidth}
                onChange={(e) => onChangePulseWidth(parseFloat(e.target.value))}
                className="w-full accent-[#C85A32] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="font-medium text-[#585651]">
                  Center ({isDiscrete ? <>n<sub>0</sub></> : <>t<sub>0</sub></>})
                </span>
                <span className="font-mono text-[#1A1917] font-semibold">
                  {isDiscrete ? `${Math.round(pulsePos * 5)} smp` : `${pulsePos.toFixed(2)} s`}
                </span>
              </div>
              <input
                type="range"
                min="-1.5"
                max="1.5"
                step="0.1"
                value={pulsePos}
                onChange={(e) => onChangePulsePos(parseFloat(e.target.value))}
                className="w-full accent-[#C85A32] cursor-pointer"
              />
            </div>
          </>
        )}

        {signalType === 'white_noise' && (
          <>
            <div>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="font-medium text-[#585651]">Variance (σ²)</span>
                <span className="font-mono text-[#1A1917] font-semibold">
                  {whiteNoiseVariance.toFixed(2)} V²
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="6.0"
                step="0.2"
                value={whiteNoiseVariance}
                onChange={(e) => onChangeWhiteVar(parseFloat(e.target.value))}
                className="w-full accent-[#C85A32] cursor-pointer"
              />
            </div>
            <button
              type="button"
              onClick={onRegenWhiteSeed}
              className="w-full py-1 px-2.5 bg-white hover:bg-[#F3F2EC] border border-[#E6E4DD] rounded text-xs font-mono text-[#1A1917] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Shuffle className="w-3 h-3 text-[#C85A32]" />
              <span>New Realization (#{whiteNoiseSeed})</span>
            </button>
          </>
        )}

        {signalType === 'colored_noise' && (
          <>
            <div>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="font-medium text-[#585651]">Variance (σ²)</span>
                <span className="font-mono text-[#1A1917] font-semibold">
                  {coloredNoiseVariance.toFixed(2)} V²
                </span>
              </div>
              <input
                type="range"
                min="0.2"
                max="6.0"
                step="0.2"
                value={coloredNoiseVariance}
                onChange={(e) => onChangeColoredVar(parseFloat(e.target.value))}
                className="w-full accent-[#C85A32] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-0.5">
                <span className="font-medium text-[#585651]">
                  Cutoff Freq (f<sub>c</sub>)
                </span>
                <span className="font-mono text-[#1A1917] font-semibold">
                  {isDiscrete
                    ? `${(Math.min(9.5, coloredNoiseCutoff) / 20).toFixed(2)} cyc/smp`
                    : `${coloredNoiseCutoff.toFixed(1)} Hz`}
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="15.0"
                step="0.5"
                value={coloredNoiseCutoff}
                onChange={(e) => onChangeColoredCutoff(parseFloat(e.target.value))}
                className="w-full accent-[#C85A32] cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={onRegenColoredSeed}
              className="w-full py-1 px-2.5 bg-white hover:bg-[#F3F2EC] border border-[#E6E4DD] rounded text-xs font-mono text-[#1A1917] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Shuffle className="w-3 h-3 text-[#C85A32]" />
              <span>New Realization (#{coloredNoiseSeed})</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export interface FullscreenControlBarProps {
  signalType: CoreSignalType;
  onChangeSignalType: (t: CoreSignalType) => void;
  isDiscrete: boolean;
  lag?: number;
  onChangeLag?: (val: number) => void;
  echoEnabled: boolean;
  onToggleEcho: (enabled: boolean) => void;
  echoDelayCts: number;
  echoDelayDts: number;
  echoGain: number;
  onChangeDelayCts: (val: number) => void;
  onChangeDelayDts: (val: number) => void;
  onChangeGain: (val: number) => void;
  onExitFullscreen: () => void;
}

const COMPACT_SIGNAL_LABELS: Record<CoreSignalType, string> = {
  sine: 'Sinusoid',
  pulse: 'Rect Pulse',
  white_noise: 'White Noise',
  colored_noise: 'Colored Noise',
};

export const FullscreenControlBar: React.FC<FullscreenControlBarProps> = ({
  signalType,
  onChangeSignalType,
  isDiscrete,
  lag,
  onChangeLag,
  echoEnabled,
  onToggleEcho,
  echoDelayCts,
  echoDelayDts,
  echoGain,
  onChangeDelayCts,
  onChangeDelayDts,
  onChangeGain,
  onExitFullscreen,
}) => {
  return (
    <div className="flex items-center justify-between gap-2.5 overflow-x-auto whitespace-nowrap">
      {/* Compact 4-Signal Selector */}
      <div className="inline-flex items-center gap-1 bg-[#FAF9F6] border border-[#E6E4DD] rounded-lg p-0.5 shrink-0">
        {CORE_SIGNAL_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChangeSignalType(opt.id)}
            className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              signalType === opt.id
                ? 'bg-[#C85A32] text-white'
                : 'text-[#585651] hover:text-[#1A1917]'
            }`}
          >
            {COMPACT_SIGNAL_LABELS[opt.id]}
          </button>
        ))}
      </div>

      {/* Lag Slider (Correlation View) */}
      {lag !== undefined && onChangeLag && (
        <div className="inline-flex items-center gap-2 bg-[#FBF4F0] border border-[#C85A32]/25 rounded-lg px-2.5 py-1 shrink-0">
          <span className="text-[11px] font-mono font-bold text-[#C85A32] whitespace-nowrap">
            {isDiscrete ? `k=${Math.round(lag)}` : `τ=${lag >= 0 ? '+' : ''}${lag.toFixed(2)}s`}
          </span>
          <input
            type="range"
            min={isDiscrete ? -20 : -3.0}
            max={isDiscrete ? 20 : 3.0}
            step={isDiscrete ? 1 : 0.05}
            value={lag}
            onChange={(e) => onChangeLag(parseFloat(e.target.value))}
            className="w-24 accent-[#C85A32] cursor-pointer"
          />
        </div>
      )}

      {/* Channel Echo Controls */}
      <div className="inline-flex items-center gap-2 bg-[#EFF6FF]/75 border border-[#93C5FD] rounded-lg px-2.5 py-1 shrink-0">
        <button
          type="button"
          onClick={() => onToggleEcho(!echoEnabled)}
          className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold transition-colors cursor-pointer ${
            echoEnabled
              ? 'bg-[#2563EB] text-white'
              : 'bg-white text-[#585651] border border-[#E6E4DD]'
          }`}
        >
          Echo {echoEnabled ? 'ON' : 'OFF'}
        </button>

        {echoEnabled && (
          <>
            <div className="inline-flex items-center gap-1.5">
              <span className="text-[11px] font-mono text-[#1D4ED8] font-semibold">
                {isDiscrete ? (
                  <>
                    k<sub>d</sub>={echoDelayDts}
                  </>
                ) : (
                  <>
                    τ<sub>d</sub>={echoDelayCts.toFixed(2)}s
                  </>
                )}
              </span>
              {isDiscrete ? (
                <input
                  type="range"
                  min="1"
                  max="15"
                  step="1"
                  value={echoDelayDts}
                  onChange={(e) => onChangeDelayDts(parseInt(e.target.value, 10))}
                  className="w-20 accent-[#2563EB] cursor-pointer"
                />
              ) : (
                <input
                  type="range"
                  min="0.10"
                  max="2.00"
                  step="0.02"
                  value={echoDelayCts}
                  onChange={(e) => onChangeDelayCts(parseFloat(e.target.value))}
                  className="w-20 accent-[#2563EB] cursor-pointer"
                />
              )}
            </div>

            <div className="inline-flex items-center gap-1.5">
              <span className="text-[11px] font-mono text-[#1D4ED8] font-semibold">
                α={echoGain.toFixed(2)}
              </span>
              <input
                type="range"
                min="0.05"
                max="1.00"
                step="0.05"
                value={echoGain}
                onChange={(e) => onChangeGain(parseFloat(e.target.value))}
                className="w-16 accent-[#2563EB] cursor-pointer"
              />
            </div>
          </>
        )}
      </div>

      {/* Exit Full-Screen */}
      <button
        type="button"
        onClick={onExitFullscreen}
        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#1A1917] hover:bg-[#33312E] text-white text-xs font-semibold transition-colors cursor-pointer shrink-0"
      >
        <Minimize2 className="w-3.5 h-3.5" />
        <span>Exit</span>
      </button>
    </div>
  );
};
