import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  SlidersHorizontal,
  BookOpen,
  Layers,
  Info,
  CheckCircle2,
  Radio,
  Zap,
} from 'lucide-react';
import { AM_MODULES, AMSubTopic } from '../../data/modules';
import { ModuleGlyph } from '../../components/ModuleGlyphs';
import { MathView } from '../../components/MathView';

interface Module2_7_DemodulationProps {
  onNavigateHome: () => void;
  onNavigateModule: (path: string) => void;
}

export const Module2_7_Demodulation: React.FC<Module2_7_DemodulationProps> = ({
  onNavigateHome,
  onNavigateModule,
}) => {
  const subTopic: AMSubTopic = AM_MODULES[6]; // Module 2.7 Demodulation
  const [detectorMode, setDetectorMode] = useState<'envelope' | 'coherent' | 'fm_slope'>('envelope');
  const [rcConstant, setRcConstant] = useState<number>(0.05); // ms
  const [phaseOffset, setPhaseOffset] = useState<number>(0); // deg
  const [lpfCutoff, setLpfCutoff] = useState<number>(5); // kHz

  const prevMod = AM_MODULES[5]; // Module 2.6 AM / PM
  const nextMod = AM_MODULES[0]; // Module 2.1 CAM

  return (
    <div className="space-y-6">
      {/* 1. Main Content Container */}
      <div className="py-2">
        {/* Module Header Bar */}
        <div className="pb-6 border-b border-[#E6E4DD] flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="text-xs font-mono font-bold tracking-wider text-[#C85A32] bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/25">
                MODULE 2.7
              </span>
              <span className="text-xs text-[#75736E] font-medium font-mono">{subTopic.tag}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1917]">
              {subTopic.name}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-[#585651] max-w-3xl leading-relaxed">
              {subTopic.description}
            </p>
          </div>

          {/* Quick switcher to next/prev */}
          <div className="flex items-center gap-2 shrink-0">
            {prevMod && (
              <button
                type="button"
                onClick={() => onNavigateModule(prevMod.path)}
                className="px-3 py-1.5 border border-[#E6E4DD] hover:bg-[#FAF9F6] text-xs font-medium text-[#585651] hover:text-[#1A1917] rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title={`Previous: ${prevMod.shortName}`}
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Prev ({prevMod.index})</span>
              </button>
            )}
            {nextMod && (
              <button
                type="button"
                onClick={() => onNavigateModule(nextMod.path)}
                className="px-3 py-1.5 border border-[#E6E4DD] hover:bg-[#FAF9F6] text-xs font-semibold text-[#1A1917] hover:border-[#C85A32]/40 rounded-md transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title={`Next: ${nextMod.shortName}`}
              >
                <span>Next ({nextMod.index})</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Technical Notice Banner */}
        <div className="mt-6 p-3.5 sm:p-4 rounded-md bg-[#FAF9F6] border border-[#E6E4DD] flex items-start gap-3">
          <Info className="w-4 h-4 text-[#C85A32] shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-[#585651] leading-relaxed">
            <span className="font-semibold text-[#1A1917]">Universal Detection Architecture: </span>
            Covers both AM and FM demodulation methods: non-coherent diode envelope detection for standard AM ($1/f_c \ll RC \ll 1/W$), coherent product detection with Costas loop phase tracking $\cos(\Delta\phi)$ for DSB-SC/SSB, and frequency discriminator / slope detection & PLL for FM recovery.
          </div>
        </div>

        {/* 3. Schematic & Analytics Grid */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Stage (8 Columns) */}
          <div className="lg:col-span-8 bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-xs flex flex-col">
            <div className="flex flex-wrap items-center justify-between pb-3 mb-4 border-b border-[#E6E4DD] gap-2">
              <div className="flex items-center gap-2">
                <ModuleGlyph id="demodulation" className="w-4 h-4" accent={true} />
                <h2 className="text-xs font-bold tracking-tight text-[#1A1917] uppercase font-mono">
                  Demodulator Circuit & Mathematical Recovery
                </h2>
              </div>

              {/* Mode Selector */}
              <div className="flex items-center gap-1 bg-[#FAF9F6] p-0.5 rounded border border-[#E6E4DD]">
                <button
                  type="button"
                  onClick={() => setDetectorMode('envelope')}
                  className={`px-2.5 py-1 text-xs font-mono font-semibold rounded cursor-pointer transition ${
                    detectorMode === 'envelope'
                      ? 'bg-[#C85A32] text-white shadow-2xs'
                      : 'text-[#585651] hover:text-[#1A1917]'
                  }`}
                >
                  AM Envelope
                </button>
                <button
                  type="button"
                  onClick={() => setDetectorMode('coherent')}
                  className={`px-2.5 py-1 text-xs font-mono font-semibold rounded cursor-pointer transition ${
                    detectorMode === 'coherent'
                      ? 'bg-[#C85A32] text-white shadow-2xs'
                      : 'text-[#585651] hover:text-[#1A1917]'
                  }`}
                >
                  AM Coherent
                </button>
                <button
                  type="button"
                  onClick={() => setDetectorMode('fm_slope')}
                  className={`px-2.5 py-1 text-xs font-mono font-semibold rounded cursor-pointer transition ${
                    detectorMode === 'fm_slope'
                      ? 'bg-[#C85A32] text-white shadow-2xs'
                      : 'text-[#585651] hover:text-[#1A1917]'
                  }`}
                >
                  FM Discriminator
                </button>
              </div>
            </div>

            {/* Canvas Schematic Area */}
            <div className="relative w-full min-h-[260px] sm:min-h-[290px] bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden flex items-center justify-center p-4">
              {detectorMode === 'envelope' && (
                <svg
                  viewBox="0 0 520 200"
                  className="w-full h-full max-h-[60vh] select-none"
                  aria-label="Diode Envelope Detector Circuit"
                >
                  <text x="50" y="80" textAnchor="middle" className="text-[11px] font-mono font-bold fill-[#1A1917]">s(t) AM IN</text>
                  <line x1="50" y1="100" x2="110" y2="100" stroke="#1A1917" strokeWidth="2" />

                  {/* Rectifier Diode */}
                  <polygon points="110,85 145,100 110,115" fill="#FFFFFF" stroke="#C85A32" strokeWidth="2" />
                  <line x1="145" y1="85" x2="145" y2="115" stroke="#C85A32" strokeWidth="2.5" />
                  <text x="127" y="75" textAnchor="middle" className="text-[10px] font-mono font-bold fill-[#C85A32]">Diode D1</text>

                  <line x1="145" y1="100" x2="230" y2="100" stroke="#1A1917" strokeWidth="2" />

                  {/* Shunt Capacitor C */}
                  <line x1="230" y1="100" x2="230" y2="130" stroke="#585651" strokeWidth="1.5" />
                  <line x1="215" y1="130" x2="245" y2="130" stroke="#1A1917" strokeWidth="2" />
                  <line x1="215" y1="136" x2="245" y2="136" stroke="#1A1917" strokeWidth="2" />
                  <line x1="230" y1="136" x2="230" y2="165" stroke="#585651" strokeWidth="1.5" />
                  <text x="195" y="136" className="text-[10px] font-mono font-bold fill-[#585651]">C</text>

                  <line x1="230" y1="100" x2="310" y2="100" stroke="#1A1917" strokeWidth="2" />

                  {/* Shunt Resistor R */}
                  <line x1="310" y1="100" x2="310" y2="120" stroke="#585651" strokeWidth="1.5" />
                  <rect x="303" y="120" width="14" height="28" fill="#FAF9F6" stroke="#1A1917" strokeWidth="1.5" />
                  <line x1="310" y1="148" x2="310" y2="165" stroke="#585651" strokeWidth="1.5" />
                  <text x="325" y="138" className="text-[10px] font-mono font-bold fill-[#585651]">R</text>

                  {/* Ground Line */}
                  <line x1="200" y1="165" x2="340" y2="165" stroke="#8A8882" strokeWidth="1.5" />
                  <line x1="260" y1="165" x2="260" y2="175" stroke="#8A8882" strokeWidth="1.5" />
                  <line x1="250" y1="175" x2="270" y2="175" stroke="#8A8882" strokeWidth="1.5" />
                  <line x1="254" y1="179" x2="266" y2="179" stroke="#8A8882" strokeWidth="1.5" />

                  {/* Output recovered message */}
                  <line x1="310" y1="100" x2="420" y2="100" stroke="#C85A32" strokeWidth="2.5" />
                  <polygon points="420,100 412,96 412,104" fill="#C85A32" />
                  <text x="430" y="96" className="text-[11px] font-mono font-bold fill-[#C85A32]">m̂(t) OUT</text>
                  <text x="430" y="112" className="text-[9px] font-mono fill-[#75736E]">RC = {(rcConstant * 1000).toFixed(1)} μs</text>
                </svg>
              )}

              {detectorMode === 'coherent' && (
                <svg
                  viewBox="0 0 520 200"
                  className="w-full h-full max-h-[60vh] select-none"
                  aria-label="Coherent Product Demodulator Circuit"
                >
                  <text x="50" y="90" textAnchor="middle" className="text-[11px] font-mono font-bold fill-[#1A1917]">s(t) DSB/SSB</text>
                  <line x1="50" y1="110" x2="140" y2="110" stroke="#1A1917" strokeWidth="2" />

                  {/* Multiplier Mixer Block */}
                  <circle cx="160" cy="110" r="20" fill="#FFFFFF" stroke="#C85A32" strokeWidth="2" />
                  <line x1="146" y1="96" x2="174" y2="124" stroke="#C85A32" strokeWidth="2" />
                  <line x1="146" y1="124" x2="174" y2="96" stroke="#C85A32" strokeWidth="2" />
                  <text x="160" y="78" textAnchor="middle" className="text-[10px] font-mono font-bold fill-[#C85A32]">Product Mixer (×)</text>

                  {/* Local Carrier Input */}
                  <line x1="160" y1="175" x2="160" y2="130" stroke="#585651" strokeWidth="1.5" />
                  <text x="160" y="190" textAnchor="middle" className="text-[10px] font-mono font-bold fill-[#585651]">2·cos(2π fc t + Δϕ)</text>

                  <line x1="180" y1="110" x2="260" y2="110" stroke="#1A1917" strokeWidth="2" />

                  {/* Low Pass Filter Box */}
                  <rect x="260" y="85" width="80" height="50" rx="4" fill="#FFFFFF" stroke="#1A1917" strokeWidth="1.5" />
                  <text x="300" y="108" textAnchor="middle" className="text-[10px] font-mono font-bold fill-[#1A1917]">LPF</text>
                  <text x="300" y="124" textAnchor="middle" className="text-[9px] font-mono fill-[#75736E]">Cutoff = {lpfCutoff} kHz</text>

                  {/* Output */}
                  <line x1="340" y1="110" x2="430" y2="110" stroke="#C85A32" strokeWidth="2.5" />
                  <polygon points="430,110 422,106 422,114" fill="#C85A32" />
                  <text x="440" y="105" className="text-[11px] font-mono font-bold fill-[#C85A32]">m(t)·cos(Δϕ)</text>
                  <text x="440" y="122" className="text-[9px] font-mono fill-[#75736E]">Phase error: {phaseOffset}°</text>
                </svg>
              )}

              {detectorMode === 'fm_slope' && (
                <svg
                  viewBox="0 0 520 200"
                  className="w-full h-full max-h-[60vh] select-none"
                  aria-label="FM Discriminator & Slope Detector Circuit"
                >
                  <text x="50" y="90" textAnchor="middle" className="text-[11px] font-mono font-bold fill-[#1A1917]">s_FM(t) IN</text>
                  <line x1="50" y1="110" x2="120" y2="110" stroke="#1A1917" strokeWidth="2" />

                  {/* Differentiator / Slope Filter */}
                  <rect x="120" y="85" width="90" height="50" rx="4" fill="#FFFFFF" stroke="#C85A32" strokeWidth="1.5" />
                  <text x="165" y="106" textAnchor="middle" className="text-[10px] font-mono font-bold fill-[#C85A32]">Differentiator</text>
                  <text x="165" y="122" textAnchor="middle" className="text-[9px] font-mono fill-[#75736E]">d/dt [Slope Filter]</text>

                  <line x1="210" y1="110" x2="270" y2="110" stroke="#1A1917" strokeWidth="2" />

                  {/* Envelope Detector */}
                  <rect x="270" y="85" width="100" height="50" rx="4" fill="#FFFFFF" stroke="#1A1917" strokeWidth="1.5" />
                  <text x="320" y="106" textAnchor="middle" className="text-[10px] font-mono font-bold fill-[#1A1917]">Envelope Det</text>
                  <text x="320" y="122" textAnchor="middle" className="text-[9px] font-mono fill-[#75736E]">Diode + RC</text>

                  {/* Output */}
                  <line x1="370" y1="110" x2="435" y2="110" stroke="#C85A32" strokeWidth="2.5" />
                  <polygon points="435,110 427,106 427,114" fill="#C85A32" />
                  <text x="445" y="106" className="text-[11px] font-mono font-bold fill-[#C85A32]">m̂(t) AUDIO</text>
                  <text x="445" y="122" className="text-[9px] font-mono fill-[#75736E]">Proportional to Δf</text>
                </svg>
              )}
            </div>

            {/* Interactive Design Controls */}
            <div className="mt-6 pt-5 border-t border-[#E6E4DD]">
              <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-3 flex items-center gap-1.5 font-bold">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#585651]" />
                <span>Detection Control Parameters</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-[#1A1917]">RC Time Constant</span>
                    <span className="font-mono text-[#C85A32] font-semibold">{(rcConstant * 1000).toFixed(1)} μs</span>
                  </div>
                  <input
                    type="range"
                    min="0.01"
                    max="0.2"
                    step="0.01"
                    value={rcConstant}
                    onChange={(e) => setRcConstant(parseFloat(e.target.value))}
                    className="w-full accent-[#C85A32] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
                    <span>Fast discharge</span>
                    <span>Diagonal clipping limit</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-[#1A1917]">Carrier Phase Offset (Δϕ)</span>
                    <span className="font-mono text-[#C85A32] font-semibold">{phaseOffset}°</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="90"
                    step="5"
                    value={phaseOffset}
                    onChange={(e) => setPhaseOffset(parseInt(e.target.value, 10))}
                    className="w-full accent-[#C85A32] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
                    <span>0° (Max Gain)</span>
                    <span>90° (Null Quad)</span>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-[#1A1917]">LPF Cutoff (fc)</span>
                    <span className="font-mono text-[#C85A32] font-semibold">{lpfCutoff} kHz</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="15"
                    step="1"
                    value={lpfCutoff}
                    onChange={(e) => setLpfCutoff(parseInt(e.target.value, 10))}
                    className="w-full accent-[#C85A32] cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
                    <span>1 kHz</span>
                    <span>15 kHz</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Theory (4 Columns) */}
          <div className="lg:col-span-4 space-y-6">
            {/* KaTeX Model Card */}
            <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-4 sm:p-5 shadow-xs">
              <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-2 flex items-center gap-1.5 font-bold">
                <BookOpen className="w-3.5 h-3.5 text-[#585651]" />
                <span>Analytical Formulation</span>
              </div>
              <div className="text-xs text-[#585651] mb-2 font-medium">
                {subTopic.formulaLabel}
              </div>
              <div className="p-3 bg-white rounded border border-[#E6E4DD] text-xs font-semibold text-[#1A1917] overflow-x-auto">
                <MathView math={subTopic.formula} displayMode={true} />
              </div>
            </div>

            {/* Curricular Focus Areas */}
            <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-4 sm:p-5 shadow-xs">
              <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-3 flex items-center gap-1.5 font-bold">
                <Layers className="w-3.5 h-3.5 text-[#585651]" />
                <span>Curricular Topics</span>
              </div>
              <ul className="space-y-2.5">
                {subTopic.topics.map((t, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs text-[#484642] leading-snug">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#C85A32] shrink-0 mt-0.5" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
