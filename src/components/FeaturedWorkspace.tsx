import React from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';
import { MathView } from './MathView';

interface FeaturedWorkspaceProps {
  onOpenSignalExplorer: () => void;
  onBrowseModules: () => void;
}

export const FeaturedWorkspace: React.FC<FeaturedWorkspaceProps> = ({
  onOpenSignalExplorer,
  onBrowseModules,
}) => {
  // Generate illustrative sinusoidal waveform points
  // 540 wide, 240 high
  // Origin at x = 70, y = 120
  // Amplitude = 70 px (+1.0 at y=50, -1.0 at y=190)
  // One period = 180 px (t=0 at 70, T0 at 250, 2T0 at 430)
  const width = 520;
  const height = 240;
  const originX = 70;
  const centerY = 120;
  const amp = 68;
  const period = 180;

  // Build continuous wave path
  let fullWavePath = '';
  for (let x = 30; x <= 490; x += 3) {
    const t = (x - originX) / period; // normalized time in cycles
    const y = centerY - amp * Math.cos(2 * Math.PI * t);
    if (x === 30) {
      fullWavePath += `M ${x.toFixed(1)} ${y.toFixed(1)}`;
    } else {
      fullWavePath += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
  }

  // Highlighted cycle (from x = originX to x = originX + period)
  let activeCyclePath = '';
  for (let x = originX; x <= originX + period; x += 3) {
    const t = (x - originX) / period;
    const y = centerY - amp * Math.cos(2 * Math.PI * t);
    if (x === originX) {
      activeCyclePath += `M ${x.toFixed(1)} ${y.toFixed(1)}`;
    } else {
      activeCyclePath += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }
  }

  // Sample stems for discrete representation preview
  const samplePoints: { x: number; y: number }[] = [];
  for (let k = 0; k <= 12; k++) {
    const x = originX + (k * period) / 12;
    const t = k / 12;
    const y = centerY - amp * Math.cos(2 * Math.PI * t);
    samplePoints.push({ x, y });
  }

  return (
    <section
      aria-labelledby="featured-workspace-title"
      className="my-8 rounded-lg border border-[#E6E4DD] bg-[#FAF9F6] p-6 lg:p-8 shadow-xs"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Side: Editorial Content */}
        <div className="lg:col-span-5 flex flex-col justify-between">
          <div>
            {/* Small uppercase label */}
            <div className="text-xs font-semibold tracking-wider text-[#75736E] uppercase font-mono mb-2.5">
              FEATURED WORKSPACE
            </div>

            {/* Title */}
            <h2
              id="featured-workspace-title"
              className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1A1917]"
            >
              Explore a signal
            </h2>

            {/* Description */}
            <p className="mt-3 text-sm sm:text-base leading-relaxed text-[#585651]">
              Start with a waveform and discover its properties, transformations, and behavior.
            </p>
          </div>

          {/* Action Row */}
          <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-4">
            <button
              onClick={onOpenSignalExplorer}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#C85A32] text-white text-sm font-medium rounded-md hover:bg-[#B54E28] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#C85A32] shadow-xs cursor-pointer"
            >
              <span>Open Signal Explorer</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onBrowseModules}
              className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm text-[#585651] hover:text-[#1A1917] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85A32] rounded cursor-pointer"
            >
              <span>Browse all modules</span>
              <ChevronDown className="w-4 h-4 text-[#75736E]" />
            </button>
          </div>

          {/* Minimal technical specification note */}
          <div className="mt-8 pt-4 border-t border-[#E6E4DD]/80 flex items-center gap-3 text-xs text-[#75736E] font-mono">
            <span>Harmonic analysis</span>
            <span aria-hidden="true">·</span>
            <span>Continuous & Discrete</span>
            <span aria-hidden="true">·</span>
            <span>Time-Domain</span>
          </div>
        </div>

        {/* Right Side: Clean Monochrome & Terracotta SVG Waveform */}
        <div className="lg:col-span-7 bg-white rounded-md border border-[#E6E4DD] p-3 sm:p-5 shadow-xs overflow-hidden relative">
          <div className="w-full">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="w-full h-auto select-none"
              aria-label="Illustrative mathematical sinusoidal waveform preview"
              role="img"
            >
              <defs>
                {/* Subtle shaded region under the highlighted period */}
                <linearGradient id="periodGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#C85A32" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#C85A32" stopOpacity="0.01" />
                </linearGradient>
              </defs>

              {/* Grid Lines - Thin monochrome */}
              {/* Horizontal grid lines */}
              <line x1="30" y1="52" x2="490" y2="52" stroke="#EFEFEA" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="30" y1="86" x2="490" y2="86" stroke="#F4F4F0" strokeWidth="1" strokeDasharray="2 2" />
              <line x1="30" y1="centerY" x2="490" y2="centerY" stroke="#E2E0D8" strokeWidth="1.25" />
              <line x1="30" y1="154" x2="490" y2="154" stroke="#F4F4F0" strokeWidth="1" strokeDasharray="2 2" />
              <line x1="30" y1="188" x2="490" y2="188" stroke="#EFEFEA" strokeWidth="1" strokeDasharray="3 3" />

              {/* Vertical grid lines for period milestones */}
              <line x1="70" y1="30" x2="70" y2="210" stroke="#DCD9D0" strokeWidth="1.25" />
              <line x1="160" y1="30" x2="160" y2="210" stroke="#EFEFEA" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="250" y1="30" x2="250" y2="210" stroke="#E2E0D8" strokeWidth="1.25" strokeDasharray="4 2" />
              <line x1="340" y1="30" x2="340" y2="210" stroke="#EFEFEA" strokeWidth="1" strokeDasharray="3 3" />
              <line x1="430" y1="30" x2="430" y2="210" stroke="#EFEFEA" strokeWidth="1" strokeDasharray="3 3" />

              {/* Axis Labels & Numerical Ticks */}
              {/* Vertical Amplitude labels */}
              <text x="60" y="56" textAnchor="end" className="text-[10px] font-mono fill-[#8A8882]">+1.0</text>
              <text x="60" y="124" textAnchor="end" className="text-[10px] font-mono fill-[#8A8882]">0.0</text>
              <text x="60" y="192" textAnchor="end" className="text-[10px] font-mono fill-[#8A8882]">-1.0</text>

              {/* Vertical axis name x(t) */}
              <text x="70" y="24" textAnchor="middle" className="text-[11px] font-mono font-medium fill-[#484642]">
                x(t)
              </text>

              {/* Horizontal time axis ticks & labels */}
              <text x="70" y="226" textAnchor="middle" className="text-[10px] font-mono fill-[#8A8882]">0</text>
              <text x="160" y="226" textAnchor="middle" className="text-[10px] font-mono fill-[#8A8882]">T₀/2</text>
              <text x="250" y="226" textAnchor="middle" className="text-[10px] font-mono font-medium fill-[#C85A32]">T₀</text>
              <text x="430" y="226" textAnchor="middle" className="text-[10px] font-mono fill-[#8A8882]">2T₀</text>

              {/* Horizontal axis name t */}
              <text x="502" y="124" textAnchor="start" className="text-[11px] font-mono font-medium fill-[#484642]">
                t
              </text>

              {/* Shaded highlight under period T0 */}
              <path
                d={`${activeCyclePath} L 250 120 L 70 120 Z`}
                fill="url(#periodGradient)"
              />

              {/* Full Background Waveform (monochrome neutral) */}
              <path
                d={fullWavePath}
                fill="none"
                stroke="#A8A69E"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Highlighted Single Period (Terracotta Accent) */}
              <path
                d={activeCyclePath}
                fill="none"
                stroke="#C85A32"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Discrete Sampling Stems (Educational preview of sampling) */}
              {samplePoints.map((pt, i) => (
                <g key={i}>
                  <line
                    x1={pt.x}
                    y1={centerY}
                    x2={pt.x}
                    y2={pt.y}
                    stroke="#C85A32"
                    strokeWidth="1"
                    strokeOpacity="0.4"
                  />
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="2"
                    fill="#C85A32"
                  />
                </g>
              ))}

              {/* Mathematical technical bracket indicating fundamental period T0 */}
              <path
                d="M 70 38 L 70 34 L 250 34 L 250 38"
                fill="none"
                stroke="#75736E"
                strokeWidth="1"
              />
              <text
                x="160"
                y="30"
                textAnchor="middle"
                className="text-[10px] font-mono fill-[#585651]"
              >
                T₀ = 2π / ω₀
              </text>

              {/* Educational disclaimer watermark */}
              <text
                x="490"
                y="226"
                textAnchor="end"
                className="text-[9px] font-mono tracking-wider fill-[#A8A69E]"
              >
                ILLUSTRATIVE PREVIEW · IDEAL HARMONIC MODEL
              </text>
            </svg>

            {/* Formula Annotation rendered via KaTeX */}
            <div className="absolute top-4 right-4 hidden sm:flex items-center gap-1.5 bg-[#FAF9F6] border border-[#E6E4DD] rounded px-2.5 py-1 text-xs text-[#1A1917] shadow-2xs">
              <MathView math="x(t) = A\cos(\omega_0 t + \phi)" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
