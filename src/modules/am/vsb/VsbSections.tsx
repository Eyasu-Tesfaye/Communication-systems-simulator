/**
 * Interactive Sections & KaTeX Formula Cards for Module 2.4 — VSB Modulation
 *
 * Strictly scoped to class concepts:
 * 1. Spectrum Comparison: M(f) (triangular, W), DSB-SC (2W), SSB (W), VSB (W + fv)
 * 2. VSB Modulator: Block diagram, DSB-SC + H(f) overlay, VSB output, H(f+fc)+H(f-fc)=1 check
 * 3. Demodulation: Coherent detector (product + LPF, perfect sync), 4 time plots, Yes/No condition toggle, RMSE
 * 4. Comparison & Theory: DSB, DSB-SC, SSB, VSB table + Analog TV (NTSC/PAL text) + KaTeX equations
 */

import React from 'react';
import {
  Activity,
  Sliders,
  GitMerge,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Tv,
  BookOpen,
} from 'lucide-react';
import { MathView } from '../../../components/MathView';
import {
  VsbSimulationData,
  VsbParams,
  VsbMessageOption,
} from './vsbMathEngine';
import {
  VsbTwoSidedSpectrumPlot,
  VsbModulatorOverlayPlot,
  VsbConditionPlot,
  VsbTimePlot,
} from './VsbPlotCanvas';

const TEX = {
  // Inline symbols
  W: 'W',
  fc: 'f_c',
  fv: 'f_v',
  Ac: 'A_c',
  mt: 'm(t)',
  st: 's_{\\text{VSB}}(t)',
  vt: 'v(t)',
  mrec: 'm_{\\text{rec}}(t)',
  Mf: 'M(f)',
  Hf: 'H(f)',
  bwm: 'BW_m',
  bw2W: '2W',
  bwW: 'W',
  bwWfv: 'W + f_v',
  vsbRatio: 'B_{\\text{VSB}} / W',
  fvQuarterW: 'f_v = 0.25\\,W',
  condInline: 'H(f + f_c) + H(f - f_c) = 1',
  rangeW: '-W \\le f \\le W',
  // Display formulas
  vsbBandwidthEq:
    'B_{\\text{VSB}} = W + f_v \\approx 1.25\\,BW_m \\quad (\\text{when } f_v \\approx 0.25\\,W)',
  modulatorEq:
    'S_{\\text{VSB}}(f) = H(f)\\,S_{\\text{DSB-SC}}(f) = \\frac{A_c}{2}\\,H(f)\\big[M(f - f_c) + M(f + f_c)\\big]',
  conditionEq:
    'H(f + f_c) + H(f - f_c) = 1, \\qquad -W \\le f \\le W',
  demodProductEq:
    'v(t) = s_{\\text{VSB}}(t)\\cos(2\\pi f_c t) \\xrightarrow{\\;\\text{LPF}\\;} M_{\\text{rec}}(f) = \\frac{A_c}{4}\\,M(f)\\big[H(f + f_c) + H(f - f_c)\\big]',
  recoveredEq:
    'H(f + f_c) + H(f - f_c) = 1 \\implies M_{\\text{rec}}(f) \\propto M(f) \\implies m_{\\text{rec}}(t) = m(t)',
  dsbScEq: 's_{\\text{DSB-SC}}(t) = A_c\\,m(t)\\cos(2\\pi f_c t)',
};

export interface VsbSectionProps {
  sim: VsbSimulationData;
  simTime: number;
  onSeekTime: (t: number) => void;
  tWindow: number;
  isGridVisible: boolean;
  onUpdateParams: (patch: Partial<VsbParams>) => void;
}

/* ============================================================================
 * TAB 1: SPECTRUM COMPARISON
 * ==========================================================================*/
export const VsbSpectrumComparisonSection: React.FC<VsbSectionProps> = ({
  sim,
  isGridVisible,
}) => {
  const { params, effectiveFv, bwMessage, bwDsbSc, bwSsb, bwVsb, vsbToWRatio } =
    sim;
  const isApproxStandard = Math.abs(vsbToWRatio - 1.25) < 0.06;

  return (
    <div className="space-y-4">
      {/* Bandwidth & Ratio Readout Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-[#E6E4DD] p-3 shadow-2xs">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#75736E]">
            DSB-SC Bandwidth
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <span className="text-lg font-mono font-bold text-[#2E6F7E] tabular-nums">
              {bwDsbSc.toFixed(1)} Hz
            </span>
            <span className="text-xs text-[#585651]">
              <MathView math={TEX.bw2W} />
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-[#E6E4DD] p-3 shadow-2xs">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#75736E]">
            SSB Bandwidth
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <span className="text-lg font-mono font-bold text-[#059669] tabular-nums">
              {bwSsb.toFixed(1)} Hz
            </span>
            <span className="text-xs text-[#585651]">
              <MathView math={TEX.bwW} />
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-[#C85A32]/35 p-3 shadow-2xs bg-[#FBF4F0]/35">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#C85A32]">
            VSB Bandwidth
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <span className="text-lg font-mono font-bold text-[#C85A32] tabular-nums">
              {bwVsb.toFixed(2)} Hz
            </span>
            <span className="text-xs text-[#585651]">
              <MathView math={TEX.bwWfv} />
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-[#E6E4DD] p-3 shadow-2xs">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#75736E]">
            VSB / W Ratio
          </div>
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <span
              className={`text-lg font-mono font-bold tabular-nums ${
                isApproxStandard ? 'text-[#059669]' : 'text-[#1A1917]'
              }`}
            >
              {vsbToWRatio.toFixed(2)}×
            </span>
            <span className="text-[11px] font-mono text-[#75736E]">
              {isApproxStandard ? (
                <>
                  ≈ 1.25 <MathView math={TEX.bwm} />
                </>
              ) : (
                <>
                  <MathView math={TEX.fv} /> = {effectiveFv.toFixed(2)} Hz
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* 4 Stacked Spectra on Common Frequency Axis */}
      <div className="space-y-3">
        <VsbTwoSidedSpectrumPlot
          title="1. Baseband Message Spectrum M(f)"
          subtitle={`Triangular baseband, bandwidth W = ${bwMessage.toFixed(1)} Hz`}
          curve={sim.messageSpectrumCurve}
          maxFreq={sim.spectrumMaxFreq}
          W={params.W}
          strokeColor="#1A1917"
          fillColor="#1A1917"
          bwText={`Baseband BWm = W = ${bwMessage.toFixed(1)} Hz`}
          badgeText="Strong Low-Freq Content"
          badgeVariant="neutral"
          isGridVisible={isGridVisible}
          heightClass="h-[148px]"
        />

        <VsbTwoSidedSpectrumPlot
          title="2. DSB-SC Spectrum"
          subtitle={`Full USB + LSB centered at ±fc (±${params.fc.toFixed(0)} Hz)`}
          curve={sim.dsbSpectrumCurve}
          maxFreq={sim.spectrumMaxFreq}
          fc={params.fc}
          W={params.W}
          strokeColor="#2E6F7E"
          fillColor="#2E6F7E"
          bwText={`BW = 2W = ${bwDsbSc.toFixed(1)} Hz`}
          badgeText="Simple Implementation"
          badgeVariant="teal"
          isGridVisible={isGridVisible}
          heightClass="h-[148px]"
        />

        <VsbTwoSidedSpectrumPlot
          title="3. SSB Spectrum (USB Kept)"
          subtitle="Lower sideband completely removed — brick-wall cut at ±fc"
          curve={sim.ssbSpectrumCurve}
          maxFreq={sim.spectrumMaxFreq}
          fc={params.fc}
          W={params.W}
          strokeColor="#059669"
          fillColor="#059669"
          bwText={`BW = W = ${bwSsb.toFixed(1)} Hz`}
          badgeText="Narrowest BW · Hard for Video"
          badgeVariant="emerald"
          isGridVisible={isGridVisible}
          heightClass="h-[148px]"
        />

        <VsbTwoSidedSpectrumPlot
          title="4. VSB Spectrum (Partial Suppression + Vestige)"
          subtitle={`Full upper sideband + vestige fv = ${effectiveFv.toFixed(2)} Hz`}
          curve={sim.vsbSpectrumCurve}
          maxFreq={sim.spectrumMaxFreq}
          fc={params.fc}
          W={params.W}
          fv={effectiveFv}
          strokeColor="#C85A32"
          fillColor="#C85A32"
          bwText={`BW = W + fv = ${bwVsb.toFixed(2)} Hz (${vsbToWRatio.toFixed(2)}W)`}
          badgeText="Compromise: SSB & DSB-SC"
          badgeVariant="accent"
          highlightVestige={true}
          isGridVisible={isGridVisible}
          heightClass="h-[155px]"
        />
      </div>

      {/* KaTeX Bandwidth & Rationale Card */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-4 shadow-2xs space-y-2.5">
        <div className="flex items-center gap-2 pb-1.5 border-b border-[#E6E4DD]">
          <Activity className="w-4 h-4 text-[#C85A32]" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1917]">
            VSB Bandwidth &amp; Motivation (KaTeX Reference)
          </h3>
        </div>
        <div className="bg-[#FAF9F6] border border-[#E6E4DD] rounded-md px-3 py-2">
          <MathView math={TEX.vsbBandwidthEq} displayMode={true} />
        </div>
        <p className="text-xs text-[#585651] leading-relaxed">
          Video signals contain strong low-frequency components near DC, making an ideal sharp cutoff at{' '}
          <MathView math={TEX.fc} /> in SSB impractical. VSB partially suppresses one sideband and keeps a small vestige of width{' '}
          <MathView math={TEX.fv} />, giving a practical compromise between SSB (narrow bandwidth <MathView math={TEX.W} />) and DSB-SC (simplicity, <MathView math={TEX.bw2W} />).
        </p>
      </div>
    </div>
  );
};

/* ============================================================================
 * TAB 2: VSB MODULATOR
 * ==========================================================================*/
export const VsbModulatorSection: React.FC<VsbSectionProps> = ({
  sim,
  isGridVisible,
  onUpdateParams,
}) => {
  const { params, effectiveFv, isConditionSatisfied } = sim;

  return (
    <div className="space-y-4">
      {/* VSB Modulator Block Diagram */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E6E4DD]">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#C85A32]" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1917]">
              VSB Modulator Architecture (Product Modulator + Shaping Filter)
            </h3>
          </div>
          <button
            type="button"
            onClick={() =>
              onUpdateParams({
                filterSatisfiesCondition: !params.filterSatisfiesCondition,
              })
            }
            className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold border transition-colors cursor-pointer ${
              isConditionSatisfied
                ? 'bg-[#10B981]/10 text-[#059669] border-[#10B981]/30'
                : 'bg-[#FEE2E2] text-[#B91C1C] border-[#EF4444]/30'
            }`}
          >
            {isConditionSatisfied ? 'Condition satisfied' : 'Condition not satisfied'}
          </button>
        </div>

        <div className="w-full overflow-x-auto">
          <svg
            viewBox="0 0 760 120"
            className="w-full min-w-[540px] h-[112px] select-none"
            role="img"
            aria-label="VSB Modulator Block Diagram"
          >
            <defs>
              <marker
                id="vsbArrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#585651" />
              </marker>
            </defs>

            {/* Input m(t) */}
            <rect x="14" y="26" width="110" height="44" rx="6" fill="#FAF9F6" stroke="#E6E4DD" strokeWidth="1.5" />
            <text x="69" y="45" textAnchor="middle" className="text-[11px] font-mono font-bold fill-[#1A1917]">
              Message m(t)
            </text>
            <text x="69" y="60" textAnchor="middle" className="text-[9.5px] font-mono fill-[#75736E]">
              BW = W ({params.W.toFixed(1)} Hz)
            </text>

            {/* Arrow m(t) -> Multiplier */}
            <line x1="124" y1="48" x2="188" y2="48" stroke="#585651" strokeWidth="1.6" markerEnd="url(#vsbArrow)" />

            {/* Product Modulator Circle */}
            <circle cx="218" cy="48" r="24" fill="#FBF4F0" stroke="#C85A32" strokeWidth="2" />
            <text x="218" y="53" textAnchor="middle" className="text-[16px] font-mono font-bold fill-[#C85A32]">
              ×
            </text>
            <text x="218" y="16" textAnchor="middle" className="text-[9.5px] font-mono font-bold fill-[#585651]">
              Product Modulator
            </text>

            {/* Carrier input from bottom */}
            <line x1="218" y1="100" x2="218" y2="76" stroke="#585651" strokeWidth="1.6" markerEnd="url(#vsbArrow)" />
            <text x="218" y="114" textAnchor="middle" className="text-[10px] font-mono font-bold fill-[#2E6F7E]">
              Ac cos(2π fc t)
            </text>

            {/* Arrow Multiplier -> VSB Shaping Filter */}
            <line x1="242" y1="48" x2="365" y2="48" stroke="#585651" strokeWidth="1.6" markerEnd="url(#vsbArrow)" />
            <text x="304" y="38" textAnchor="middle" className="text-[9.5px] font-mono font-bold fill-[#2E6F7E]">
              DSB-SC (2W)
            </text>

            {/* VSB Shaping Filter Box */}
            <rect
              x="371"
              y="22"
              width="210"
              height="52"
              rx="6"
              fill={isConditionSatisfied ? '#F0FDF4' : '#FEF2F2'}
              stroke={isConditionSatisfied ? '#059669' : '#DC2626'}
              strokeWidth="1.8"
            />
            <text x="476" y="43" textAnchor="middle" className="text-[11px] font-mono font-bold fill-[#1A1917]">
              VSB Shaping Filter H(f)
            </text>
            <text x="476" y="60" textAnchor="middle" className="text-[9.5px] font-mono fill-[#585651]">
              {isConditionSatisfied
                ? 'H(f+fc) + H(f-fc) = 1 on [-W, W]'
                : 'Symmetry Condition Violated'}
            </text>

            {/* Arrow Filter -> Output */}
            <line x1="581" y1="48" x2="638" y2="48" stroke="#585651" strokeWidth="1.6" markerEnd="url(#vsbArrow)" />

            {/* Output s_VSB(t) */}
            <rect x="644" y="26" width="102" height="44" rx="6" fill="#FBF4F0" stroke="#C85A32" strokeWidth="1.6" />
            <text x="695" y="45" textAnchor="middle" className="text-[11px] font-mono font-bold fill-[#C85A32]">
              VSB Output s(t)
            </text>
            <text x="695" y="60" textAnchor="middle" className="text-[9.5px] font-mono fill-[#585651]">
              BW = {(params.W + effectiveFv).toFixed(2)} Hz
            </text>
          </svg>
        </div>
      </div>

      {/* Plot 1: DSB-SC Spectrum with H(f) Overlaid */}
      <VsbModulatorOverlayPlot
        curves={sim.modulatorCurves}
        maxFreq={sim.spectrumMaxFreq}
        fc={params.fc}
        W={params.W}
        fv={effectiveFv}
        satisfiesCondition={isConditionSatisfied}
        isGridVisible={isGridVisible}
      />

      {/* Plot 2: VSB Output Spectrum */}
      <VsbTwoSidedSpectrumPlot
        title="2. VSB Output Spectrum"
        subtitle={`Full upper sideband + vestige (${effectiveFv.toFixed(2)} Hz)`}
        curve={sim.vsbSpectrumCurve}
        maxFreq={sim.spectrumMaxFreq}
        fc={params.fc}
        W={params.W}
        fv={effectiveFv}
        strokeColor="#C85A32"
        fillColor="#C85A32"
        bwText={`B = W + fv = ${sim.bwVsb.toFixed(2)} Hz`}
        badgeText="Filtered VSB Output"
        badgeVariant="accent"
        highlightVestige={true}
        isGridVisible={isGridVisible}
        heightClass="h-[175px]"
      />

      {/* Plot 3: H(f + fc) + H(f - fc) Condition Verification */}
      <VsbConditionPlot
        conditionCurve={sim.conditionCurve}
        W={params.W}
        fv={effectiveFv}
        isSatisfied={isConditionSatisfied}
        isGridVisible={isGridVisible}
      />

      {/* KaTeX Modulator & Filter Condition Reference */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-4 shadow-2xs space-y-2.5">
        <div className="flex items-center gap-2 pb-1.5 border-b border-[#E6E4DD]">
          <BookOpen className="w-4 h-4 text-[#C85A32]" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1917]">
            VSB Filter Condition (KaTeX Reference)
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-[#FAF9F6] border border-[#E6E4DD] rounded-md px-3 py-2">
            <div className="text-[10px] font-mono font-bold uppercase text-[#75736E] mb-1">
              Shaping Filter Output
            </div>
            <MathView math={TEX.modulatorEq} displayMode={true} />
          </div>
          <div className="bg-[#FAF9F6] border border-[#E6E4DD] rounded-md px-3 py-2">
            <div className="text-[10px] font-mono font-bold uppercase text-[#75736E] mb-1">
              Distortionless Condition
            </div>
            <MathView math={TEX.conditionEq} displayMode={true} />
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * TAB 3: DEMODULATION (Coherent Detector: s(t) * cos(2 pi fc t) -> LPF)
 * ==========================================================================*/
export const VsbDemodulationSection: React.FC<VsbSectionProps> = ({
  sim,
  simTime,
  onSeekTime,
  tWindow,
  isGridVisible,
  onUpdateParams,
}) => {
  const { params, isConditionSatisfied, rmse, normalizedRmsePct, activeToneSummary } = sim;

  return (
    <div className="space-y-4">
      {/* Coherent Detector Block Diagram & Quick Controls */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E6E4DD]">
          <div className="flex items-center gap-2">
            <GitMerge className="w-4 h-4 text-[#C85A32]" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1917]">
              Coherent Detector (Perfect Synchronization Assumed)
            </h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-[#FAF9F6] border border-[#E6E4DD] text-[10px] font-mono font-semibold text-[#585651]">
              {activeToneSummary}
            </span>
            <button
              type="button"
              onClick={() =>
                onUpdateParams({
                  filterSatisfiesCondition: !params.filterSatisfiesCondition,
                })
              }
              className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold border transition-colors cursor-pointer ${
                isConditionSatisfied
                  ? 'bg-[#10B981]/10 text-[#059669] border-[#10B981]/30'
                  : 'bg-[#FEE2E2] text-[#B91C1C] border-[#EF4444]/30'
              }`}
            >
              Filter Condition: {isConditionSatisfied ? 'Yes' : 'No'}
            </button>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <svg
            viewBox="0 0 760 112"
            className="w-full min-w-[540px] h-[105px] select-none"
            role="img"
            aria-label="Coherent VSB Detector Block Diagram"
          >
            <defs>
              <marker
                id="demodArrow"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#585651" />
              </marker>
            </defs>

            {/* Input s_VSB(t) */}
            <rect x="14" y="24" width="120" height="44" rx="6" fill="#FBF4F0" stroke="#C85A32" strokeWidth="1.5" />
            <text x="74" y="43" textAnchor="middle" className="text-[11px] font-mono font-bold fill-[#C85A32]">
              VSB Input s(t)
            </text>
            <text x="74" y="58" textAnchor="middle" className="text-[9.5px] font-mono fill-[#585651]">
              Received VSB Signal
            </text>

            <line x1="134" y1="46" x2="205" y2="46" stroke="#585651" strokeWidth="1.6" markerEnd="url(#demodArrow)" />

            {/* Product Modulator */}
            <circle cx="235" cy="46" r="24" fill="#FAF9F6" stroke="#1A1917" strokeWidth="1.8" />
            <text x="235" y="51" textAnchor="middle" className="text-[16px] font-mono font-bold fill-[#1A1917]">
              ×
            </text>
            <text x="235" y="14" textAnchor="middle" className="text-[9.5px] font-mono font-bold fill-[#585651]">
              Product Modulator
            </text>

            {/* Carrier input */}
            <line x1="235" y1="95" x2="235" y2="74" stroke="#585651" strokeWidth="1.6" markerEnd="url(#demodArrow)" />
            <text x="235" y="108" textAnchor="middle" className="text-[10px] font-mono font-bold fill-[#2E6F7E]">
              cos(2π fc t) (Synced)
            </text>

            {/* v(t) -> LPF */}
            <line x1="259" y1="46" x2="380" y2="46" stroke="#585651" strokeWidth="1.6" markerEnd="url(#demodArrow)" />
            <text x="320" y="37" textAnchor="middle" className="text-[9.5px] font-mono font-bold fill-[#1A1917]">
              v(t) = s(t) · cos(2π fc t)
            </text>

            {/* LPF Box */}
            <rect x="386" y="22" width="175" height="48" rx="6" fill="#FAF9F6" stroke="#2E6F7E" strokeWidth="1.8" />
            <text x="473" y="42" textAnchor="middle" className="text-[11px] font-mono font-bold fill-[#1A1917]">
              Low-Pass Filter (LPF)
            </text>
            <text x="473" y="58" textAnchor="middle" className="text-[9.5px] font-mono fill-[#585651]">
              Passes |f| ≤ W ({params.W.toFixed(1)} Hz)
            </text>

            <line x1="561" y1="46" x2="625" y2="46" stroke="#585651" strokeWidth="1.6" markerEnd="url(#demodArrow)" />

            {/* Output m_rec(t) */}
            <rect
              x="631"
              y="24"
              width="115"
              height="44"
              rx="6"
              fill={isConditionSatisfied ? '#F0FDF4' : '#FEF2F2'}
              stroke={isConditionSatisfied ? '#059669' : '#DC2626'}
              strokeWidth="1.6"
            />
            <text
              x="688"
              y="43"
              textAnchor="middle"
              className={`text-[11px] font-mono font-bold ${
                isConditionSatisfied ? 'fill-[#059669]' : 'fill-[#B91C1C]'
              }`}
            >
              Recovered Output
            </text>
            <text x="688" y="58" textAnchor="middle" className="text-[9.5px] font-mono fill-[#585651]">
              {isConditionSatisfied ? 'Distortionless' : 'Distorted Output'}
            </text>
          </svg>
        </div>
      </div>

      {/* Recovery Error Readout & Message / Condition Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div
          className={`rounded-lg border p-3 shadow-2xs flex items-center justify-between ${
            rmse < 0.02
              ? 'bg-[#F0FDF4] border-[#10B981]/30'
              : 'bg-[#FEF2F2] border-[#EF4444]/35'
          }`}
        >
          <div>
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#585651]">
              Recovery Error (RMSE)
            </div>
            <div
              className={`mt-1 text-lg font-mono font-bold tabular-nums ${
                rmse < 0.02 ? 'text-[#059669]' : 'text-[#B91C1C]'
              }`}
            >
              {rmse.toFixed(4)} V ({normalizedRmsePct.toFixed(1)}%)
            </div>
          </div>
          {rmse < 0.02 ? (
            <CheckCircle2 className="w-6 h-6 text-[#059669] shrink-0" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-[#B91C1C] shrink-0" />
          )}
        </div>

        <div className="bg-white rounded-lg border border-[#E6E4DD] p-3 shadow-2xs space-y-1.5">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#75736E]">
            Message Waveform Option
          </div>
          <div className="grid grid-cols-3 gap-1">
            {(
              [
                { id: 'one_tone', label: '1-Tone' },
                { id: 'two_tone', label: '2-Tone' },
                { id: 'low_freq_rich', label: 'Low-Freq' },
              ] as { id: VsbMessageOption; label: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onUpdateParams({ messageOption: opt.id })}
                className={`py-1 px-1.5 rounded text-[11px] font-mono font-bold border transition-colors cursor-pointer ${
                  params.messageOption === opt.id
                    ? 'bg-[#C85A32] text-white border-[#C85A32]'
                    : 'bg-[#FAF9F6] text-[#585651] border-[#E6E4DD] hover:bg-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-[#E6E4DD] p-3 shadow-2xs space-y-1.5">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#75736E]">
            Filter Satisfies Condition
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {[true, false].map((flag) => (
              <button
                key={String(flag)}
                type="button"
                onClick={() => onUpdateParams({ filterSatisfiesCondition: flag })}
                className={`py-1 px-2 rounded text-[11px] font-mono font-bold border transition-colors cursor-pointer ${
                  params.filterSatisfiesCondition === flag
                    ? flag
                      ? 'bg-[#059669] text-white border-[#059669]'
                      : 'bg-[#DC2626] text-white border-[#DC2626]'
                    : 'bg-[#FAF9F6] text-[#585651] border-[#E6E4DD] hover:bg-white'
                }`}
              >
                {flag ? 'Yes (Valid)' : 'No (Violated)'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 4 Time-Domain Plots */}
      <div className="space-y-3">
        <VsbTimePlot
          title="1. Original Message Signal m(t)"
          subtitle={activeToneSummary}
          timeSteps={sim.timeSteps}
          values={sim.message}
          primaryLabel="m(t)"
          primaryColor="#2E6F7E"
          simTime={simTime}
          onSeekTime={onSeekTime}
          tWindow={tWindow}
          isGridVisible={isGridVisible}
          heightClass="h-[168px]"
        />

        <VsbTimePlot
          title="2. VSB Modulated Signal s(t)"
          subtitle={`Carrier ${params.fc.toFixed(0)} Hz · Vestige ${sim.effectiveFv.toFixed(2)} Hz`}
          timeSteps={sim.timeSteps}
          values={sim.vsbSignal}
          primaryLabel="s(t)"
          primaryColor="#C85A32"
          simTime={simTime}
          onSeekTime={onSeekTime}
          tWindow={tWindow}
          isGridVisible={isGridVisible}
          heightClass="h-[168px]"
        />

        <VsbTimePlot
          title="3. Product Modulator Output v(t) = s(t) · cos(2π fc t)"
          subtitle="Baseband component + 2fc component (removed by LPF)"
          timeSteps={sim.timeSteps}
          values={sim.productSignal}
          primaryLabel="v(t)"
          primaryColor="#75736E"
          simTime={simTime}
          onSeekTime={onSeekTime}
          tWindow={tWindow}
          isGridVisible={isGridVisible}
          heightClass="h-[168px]"
        />

        <VsbTimePlot
          title="4. Recovered Output vs. Original Message m(t)"
          subtitle={
            isConditionSatisfied
              ? 'Condition satisfied -> Exact recovery'
              : 'Condition violated -> Amplitude & waveform distortion'
          }
          timeSteps={sim.timeSteps}
          values={sim.message}
          primaryLabel="Original m(t)"
          primaryColor="#2E6F7E"
          secondaryValues={sim.recoveredMessage}
          secondaryLabel="Recovered"
          secondaryColor={isConditionSatisfied ? '#059669' : '#DC2626'}
          simTime={simTime}
          onSeekTime={onSeekTime}
          tWindow={tWindow}
          isGridVisible={isGridVisible}
          heightClass="h-[185px]"
          badgeText={isConditionSatisfied ? 'RMSE ≈ 0 V' : `Distorted (RMSE ${rmse.toFixed(3)} V)`}
          badgeVariant={isConditionSatisfied ? 'emerald' : 'accent'}
        />
      </div>

      {/* KaTeX Coherent Demodulation Formula Card */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-4 shadow-2xs space-y-2.5">
        <div className="flex items-center gap-2 pb-1.5 border-b border-[#E6E4DD]">
          <BookOpen className="w-4 h-4 text-[#C85A32]" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1917]">
            Coherent VSB Recovery Derivation (KaTeX)
          </h3>
        </div>
        <div className="space-y-2">
          <div className="bg-[#FAF9F6] border border-[#E6E4DD] rounded-md px-3 py-2">
            <MathView math={TEX.demodProductEq} displayMode={true} />
          </div>
          <div className="bg-[#FAF9F6] border border-[#E6E4DD] rounded-md px-3 py-2">
            <MathView math={TEX.recoveredEq} displayMode={true} />
          </div>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * TAB 4: COMPARISON & THEORY
 * ==========================================================================*/
export const VsbComparisonTheorySection: React.FC<VsbSectionProps> = ({ sim }) => {
  const { bwDsbSc, bwSsb, bwVsb, vsbToWRatio } = sim;

  return (
    <div className="space-y-4">
      {/* Comparison Table: DSB, DSB-SC, SSB, VSB */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-4 shadow-2xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#E6E4DD]">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-[#C85A32]" />
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1917]">
              Amplitude Modulation Schemes Comparison
            </h3>
          </div>
          <span className="text-[11px] font-mono text-[#75736E]">
            Live values at <MathView math={TEX.W} /> = {sim.bwMessage.toFixed(1)} Hz,{' '}
            <MathView math={TEX.fv} /> = {sim.effectiveFv.toFixed(2)} Hz
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#FAF9F6] border-b border-[#E6E4DD] text-[10.5px] font-mono uppercase text-[#585651]">
                <th className="py-2.5 px-3">Modulation</th>
                <th className="py-2.5 px-3">Spectrum</th>
                <th className="py-2.5 px-3">Bandwidth</th>
                <th className="py-2.5 px-3">Power Efficiency</th>
                <th className="py-2.5 px-3">Implementation Complexity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E6E4DD] text-[#1A1917]">
              <tr className="hover:bg-[#FAF9F6]/60">
                <td className="py-2.5 px-3 font-mono font-bold">DSB (AM)</td>
                <td className="py-2.5 px-3 text-[#585651]">
                  Full carrier + both USB &amp; LSB
                </td>
                <td className="py-2.5 px-3 font-mono">
                  <MathView math={TEX.bw2W} /> ({bwDsbSc.toFixed(1)} Hz)
                </td>
                <td className="py-2.5 px-3 text-[#585651]">
                  Lowest (large unmodulated carrier power)
                </td>
                <td className="py-2.5 px-3 text-[#585651]">
                  Simple transmitter &amp; envelope detector
                </td>
              </tr>

              <tr className="hover:bg-[#FAF9F6]/60">
                <td className="py-2.5 px-3 font-mono font-bold text-[#2E6F7E]">DSB-SC</td>
                <td className="py-2.5 px-3 text-[#585651]">
                  Both USB &amp; LSB (carrier suppressed)
                </td>
                <td className="py-2.5 px-3 font-mono">
                  <MathView math={TEX.bw2W} /> ({bwDsbSc.toFixed(1)} Hz)
                </td>
                <td className="py-2.5 px-3 text-[#585651]">
                  High (no wasted carrier power, split across 2 sidebands)
                </td>
                <td className="py-2.5 px-3 text-[#585651]">
                  Simple modulator; coherent detector at receiver
                </td>
              </tr>

              <tr className="hover:bg-[#FAF9F6]/60">
                <td className="py-2.5 px-3 font-mono font-bold text-[#059669]">SSB</td>
                <td className="py-2.5 px-3 text-[#585651]">
                  One sideband only (USB or LSB)
                </td>
                <td className="py-2.5 px-3 font-mono">
                  <MathView math={TEX.bwW} /> ({bwSsb.toFixed(1)} Hz)
                </td>
                <td className="py-2.5 px-3 text-[#585651]">
                  Highest (100% power in one sideband)
                </td>
                <td className="py-2.5 px-3 text-[#585651]">
                  Hardest (sharp filter cutoff at <MathView math={TEX.fc} />; impractical for video)
                </td>
              </tr>

              <tr className="bg-[#FBF4F0]/65 border-l-4 border-l-[#C85A32]">
                <td className="py-3 px-3 font-mono font-bold text-[#C85A32]">
                  VSB (Active)
                </td>
                <td className="py-3 px-3 font-medium text-[#1A1917]">
                  One full sideband + vestige (<MathView math={TEX.fv} />) of the other
                </td>
                <td className="py-3 px-3 font-mono font-bold text-[#C85A32]">
                  <MathView math={TEX.bwWfv} /> ≈ 1.25 <MathView math={TEX.bwm} /> ({bwVsb.toFixed(2)} Hz, {vsbToWRatio.toFixed(2)}W)
                </td>
                <td className="py-3 px-3 text-[#1A1917]">
                  Lower than SSB (extra vestige transmits additional power)
                </td>
                <td className="py-3 px-3 text-[#1A1917]">
                  Easier to implement than SSB (gradual filter transition; coherent detector)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Analog Television Application Callout (Text Only) */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-4 shadow-2xs space-y-2.5">
        <div className="flex items-center gap-2 pb-1.5 border-b border-[#E6E4DD]">
          <Tv className="w-4 h-4 text-[#C85A32]" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1917]">
            Why Video &amp; Analog Television Use VSB
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-[#585651] leading-relaxed">
          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD] space-y-1.5">
            <div className="font-mono font-bold text-[#1A1917] text-[11px] uppercase">
              Low-Frequency Content in Video
            </div>
            <p>
              Television and video signals carry strong DC and low-frequency energy representing average brightness and frame sync. Trying to cut off one sideband sharply at <MathView math={TEX.fc} /> for SSB distorts these critical low frequencies.
            </p>
          </div>

          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD] space-y-1.5">
            <div className="font-mono font-bold text-[#C85A32] text-[11px] uppercase">
              Analog TV Standards (NTSC &amp; PAL)
            </div>
            <p>
              Broadcast analog television systems such as <strong>NTSC</strong> and <strong>PAL</strong> use VSB to conserve spectrum while keeping filter design practical—for example, <strong>4.2 MHz video + 0.75 MHz vestige</strong> (instead of 8.4 MHz for full DSB).
            </p>
          </div>
        </div>
      </div>

      {/* Core KaTeX Mathematical Equations */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-4 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 pb-1.5 border-b border-[#E6E4DD]">
          <BookOpen className="w-4 h-4 text-[#C85A32]" />
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1917]">
            Core VSB Equations (KaTeX)
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD] space-y-1">
            <div className="text-[10px] font-mono font-bold uppercase text-[#75736E]">
              1. Product Modulator (DSB-SC Input)
            </div>
            <MathView math={TEX.dsbScEq} displayMode={true} />
          </div>

          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD] space-y-1">
            <div className="text-[10px] font-mono font-bold uppercase text-[#75736E]">
              2. VSB Shaping Filter Output
            </div>
            <MathView math={TEX.modulatorEq} displayMode={true} />
          </div>

          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD] space-y-1">
            <div className="text-[10px] font-mono font-bold uppercase text-[#75736E]">
              3. Complementary Symmetry Condition
            </div>
            <MathView math={TEX.conditionEq} displayMode={true} />
          </div>

          <div className="p-3 bg-[#FAF9F6] rounded border border-[#E6E4DD] space-y-1">
            <div className="text-[10px] font-mono font-bold uppercase text-[#75736E]">
              4. VSB Transmission Bandwidth
            </div>
            <MathView math={TEX.vsbBandwidthEq} displayMode={true} />
          </div>
        </div>
      </div>
    </div>
  );
};
