import React, { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Layers, BookOpen, SlidersHorizontal, Info } from 'lucide-react';
import { SignalModule, MODULES } from '../data/modules';
import { ModuleGlyph } from './ModuleGlyphs';
import { MathView } from './MathView';
import { SimulationToolbar, PlaybackState } from './SimulationToolbar';

interface ModuleWorkspacePageProps {
  module: SignalModule;
  onNavigateHome: () => void;
  onNavigateModule: (path: string) => void;
}

export const ModuleWorkspacePage: React.FC<ModuleWorkspacePageProps> = ({
  module,
  onNavigateHome,
  onNavigateModule,
}) => {
  // Independent simulation workspace state
  const [isGridVisible, setIsGridVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackState, setPlaybackState] = useState<PlaybackState>('reset');
  const [speed, setSpeed] = useState('1×');

  // Find previous and next module for seamless sequential navigation
  const currentIndex = MODULES.findIndex((m) => m.id === module.id);
  const prevModule = currentIndex > 0 ? MODULES[currentIndex - 1] : null;
  const nextModule = currentIndex < MODULES.length - 1 ? MODULES[currentIndex + 1] : null;

  // Handle Playback Actions
  const handlePlay = () => {
    setPlaybackState('playing');
  };

  const handlePause = () => {
    setPlaybackState('paused');
  };

  const handleReset = () => {
    setPlaybackState('reset');
  };

  // Handle Escape key to exit fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Prevent background scrolling while fullscreen is active
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  // Full-coverage background grid SVG pattern (covers entire region, edges, and corners with major & minor lines)
  const renderBackgroundGrid = (idPrefix: string) => {
    if (!isGridVisible) return null;
    return (
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none select-none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          {/* Minor 24px square grid lines with comfortable contrast */}
          <pattern id={`${idPrefix}-minor`} width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#E2DFD6" strokeWidth="1" />
          </pattern>
          {/* Major 96px square grid lines (every 4 minor cells) with slightly higher contrast */}
          <pattern id={`${idPrefix}-major`} width="96" height="96" patternUnits="userSpaceOnUse">
            <rect width="96" height="96" fill={`url(#${idPrefix}-minor)`} />
            <path d="M 96 0 L 0 0 0 96" fill="none" stroke="#C8C4B8" strokeWidth="1.25" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${idPrefix}-major)`} />
      </svg>
    );
  };

  // Render module-specific schematic SVG (preserves axes, labels, waveforms, and technical symbols)
  const renderSchematicPreview = () => {
    switch (module.id) {
      case 'signals':
        return (
          <svg
            viewBox="0 0 500 200"
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full max-h-[70vh] select-none"
            aria-label="Continuous and discrete signal waveform schematic"
            role="img"
          >
            {/* Permanent Axes & Labels */}
            <line x1="30" y1="100" x2="470" y2="100" stroke="#8A8882" strokeWidth="1.5" />
            <line x1="60" y1="26" x2="60" y2="174" stroke="#8A8882" strokeWidth="1.5" />
            <text x="60" y="20" textAnchor="middle" className="text-[11px] font-mono font-bold fill-[#1A1917]">
              x(t)
            </text>
            <text x="475" y="104" textAnchor="start" className="text-[11px] font-mono font-bold fill-[#1A1917]">
              t
            </text>

            {/* Continuous Waveform */}
            <path
              d="M 60 100 Q 110 30, 160 100 T 260 100 T 360 100 T 460 100"
              fill="none"
              stroke="#C85A32"
              strokeWidth="2.5"
            />

            {/* Discrete Sampling Stems */}
            {[60, 85, 110, 135, 160, 185, 210, 235, 260, 285, 310, 335, 360, 385, 410, 435, 460].map((x, i) => {
              const y = 100 - 55 * Math.sin(((x - 60) / 200) * 2 * Math.PI);
              return (
                <g key={i}>
                  <line x1={x} y1="100" x2={x} y2={y} stroke="#585651" strokeWidth="1.25" strokeDasharray="1.5 1.5" />
                  <circle cx={x} cy={y} r="2.5" fill="#1A1917" />
                </g>
              );
            })}

            <text x="260" y="188" textAnchor="middle" className="text-[11px] font-mono font-medium fill-[#484642]">
              Continuous waveform x(t) with uniform sampling x[n] = x(nTs)
            </text>
          </svg>
        );

      case 'fourier':
        return (
          <svg
            viewBox="0 0 500 200"
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full max-h-[70vh] select-none"
            aria-label="Time-domain to frequency-domain Fourier transform schematic"
            role="img"
          >
            {/* Left: Time domain window */}
            <rect x="20" y="20" width="210" height="150" rx="4" fill="#FFFFFF" stroke="#D1CFCE" strokeWidth="1.25" />
            <text x="35" y="42" className="text-[10px] font-mono font-bold fill-[#1A1917]">
              TIME DOMAIN x(t)
            </text>
            <line x1="30" y1="105" x2="215" y2="105" stroke="#8A8882" strokeWidth="1.25" />
            <path d="M 35 105 Q 60 65, 80 105 T 125 105 T 170 105 T 210 105" fill="none" stroke="#585651" strokeWidth="2" />

            {/* Transform Arrow */}
            <path d="M 235 95 L 265 95" stroke="#C85A32" strokeWidth="2.5" />
            <path d="M 265 95 L 257 91 M 265 95 L 257 99" stroke="#C85A32" strokeWidth="2.5" />
            <text x="250" y="85" textAnchor="middle" className="text-[11px] font-mono font-bold fill-[#C85A32]">
              ℱ
            </text>

            {/* Right: Frequency domain window */}
            <rect x="270" y="20" width="210" height="150" rx="4" fill="#FFFFFF" stroke="#D1CFCE" strokeWidth="1.25" />
            <text x="285" y="42" className="text-[10px] font-mono font-bold fill-[#1A1917]">
              FREQUENCY SPECTRUM |X(f)|
            </text>
            <line x1="280" y1="145" x2="465" y2="145" stroke="#8A8882" strokeWidth="1.25" />

            {/* Spectral Lines */}
            <line x1="320" y1="145" x2="320" y2="70" stroke="#C85A32" strokeWidth="2.5" />
            <circle cx="320" cy="70" r="3" fill="#C85A32" />
            <line x1="375" y1="145" x2="375" y2="95" stroke="#C85A32" strokeWidth="2.5" />
            <circle cx="375" cy="95" r="3" fill="#C85A32" />
            <line x1="430" y1="145" x2="430" y2="120" stroke="#C85A32" strokeWidth="2.5" />
            <circle cx="430" cy="120" r="3" fill="#C85A32" />
            <text x="320" y="162" textAnchor="middle" className="text-[10px] font-mono font-medium fill-[#585651]">f₀</text>
            <text x="375" y="162" textAnchor="middle" className="text-[10px] font-mono font-medium fill-[#585651]">2f₀</text>
            <text x="430" y="162" textAnchor="middle" className="text-[10px] font-mono font-medium fill-[#585651]">3f₀</text>
          </svg>
        );

      case 'complex-signals':
        return (
          <svg
            viewBox="0 0 500 200"
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full max-h-[70vh] select-none"
            aria-label="Argand complex plane phasor schematic"
            role="img"
          >
            {/* Unit Circle Guide */}
            <circle cx="250" cy="100" r="65" fill="#FAF9F6" stroke="#D1CFCE" strokeWidth="1.25" strokeDasharray="3 3" />

            {/* Re / Im Coordinate Axes */}
            <line x1="140" y1="100" x2="360" y2="100" stroke="#8A8882" strokeWidth="1.5" />
            <line x1="250" y1="15" x2="250" y2="185" stroke="#8A8882" strokeWidth="1.5" />
            <text x="365" y="104" className="text-[10px] font-mono font-medium fill-[#585651]">Re (cos θ)</text>
            <text x="250" y="12" textAnchor="middle" className="text-[10px] font-mono font-medium fill-[#585651]">Im (sin θ)</text>

            {/* Rotating Phasor Vector */}
            <line x1="250" y1="100" x2="296" y2="54" stroke="#C85A32" strokeWidth="2.5" />
            <circle cx="296" cy="54" r="3.5" fill="#C85A32" />

            {/* Orthogonal Projections */}
            <line x1="296" y1="54" x2="296" y2="100" stroke="#585651" strokeWidth="1.25" strokeDasharray="2 2" />
            <line x1="250" y1="54" x2="296" y2="54" stroke="#585651" strokeWidth="1.25" strokeDasharray="2 2" />

            {/* Angle arc */}
            <path d="M 275 100 A 25 25 0 0 0 268 82" fill="none" stroke="#C85A32" strokeWidth="1.5" />
            <text x="280" y="86" className="text-[10px] font-mono fill-[#C85A32]">θ = ωt</text>
            <text x="312" y="50" className="text-[11px] font-mono font-bold fill-[#1A1917]">z = e^(jθ)</text>
          </svg>
        );

      case 'convolution':
        return (
          <svg
            viewBox="0 0 500 200"
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full max-h-[70vh] select-none"
            aria-label="LTI System convolution integral block diagram"
            role="img"
          >
            {/* Input Signal Arrow */}
            <line x1="40" y1="100" x2="150" y2="100" stroke="#585651" strokeWidth="2" />
            <polygon points="150,100 142,96 142,104" fill="#585651" />
            <text x="85" y="85" textAnchor="middle" className="text-[11px] font-mono font-semibold fill-[#1A1917]">Input x(t)</text>

            {/* LTI System Central Box */}
            <rect x="150" y="55" width="200" height="90" rx="6" fill="#FFFFFF" stroke="#D1CFCE" strokeWidth="1.5" />
            <text x="250" y="85" textAnchor="middle" className="text-[11px] font-mono font-bold fill-[#1A1917]">LTI SYSTEM</text>
            <text x="250" y="105" textAnchor="middle" className="text-[10px] font-mono font-medium fill-[#C85A32]">Impulse response h(t)</text>
            <text x="250" y="125" textAnchor="middle" className="text-[9px] font-mono fill-[#75736E]">Linear · Time-Invariant</text>

            {/* Output Convolved Signal Arrow */}
            <line x1="350" y1="100" x2="455" y2="100" stroke="#C85A32" strokeWidth="2" />
            <polygon points="455,100 447,96 447,104" fill="#C85A32" />
            <text x="410" y="85" textAnchor="middle" className="text-[11px] font-mono font-semibold fill-[#C85A32]">y(t) = x(t) * h(t)</text>
          </svg>
        );

      case 'probability':
        return (
          <svg
            viewBox="0 0 500 200"
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full max-h-[70vh] select-none"
            aria-label="Gaussian normal probability distribution bell curve schematic"
            role="img"
          >
            {/* Baseline and Center Line */}
            <line x1="40" y1="160" x2="460" y2="160" stroke="#8A8882" strokeWidth="1.5" />
            <line x1="250" y1="25" x2="250" y2="160" stroke="#585651" strokeWidth="1.25" strokeDasharray="3 3" />

            {/* Shaded 1-sigma area */}
            <path
              d="M 195 160 C 215 130, 230 40, 250 40 C 270 40, 285 130, 305 160 Z"
              fill="#C85A32"
              fillOpacity="0.1"
            />

            {/* Bell curve */}
            <path
              d="M 60 159 C 140 159, 180 40, 250 40 C 320 40, 360 159, 440 159"
              fill="none"
              stroke="#C85A32"
              strokeWidth="2.5"
            />

            <text x="250" y="178" textAnchor="middle" className="text-[10px] font-mono font-bold fill-[#1A1917]">μ (Mean)</text>
            <text x="195" y="178" textAnchor="middle" className="text-[10px] font-mono fill-[#585651]">μ - σ</text>
            <text x="305" y="178" textAnchor="middle" className="text-[10px] font-mono fill-[#585651]">μ + σ</text>
            <text x="250" y="110" textAnchor="middle" className="text-[10px] font-mono font-medium fill-[#C85A32]">68.27% of density</text>
          </svg>
        );

      case 'random-processes':
        return (
          <svg
            viewBox="0 0 500 200"
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full max-h-[70vh] select-none"
            aria-label="Stochastic ensemble realizations and wide-sense stationarity schematic"
            role="img"
          >
            <line x1="50" y1="100" x2="450" y2="100" stroke="#8A8882" strokeWidth="1.5" />
            <line x1="80" y1="20" x2="80" y2="180" stroke="#8A8882" strokeWidth="1.5" />

            {/* 3 Realization Paths */}
            <path d="M 80 80 Q 140 50, 200 95 T 320 70 T 440 110" fill="none" stroke="#75736E" strokeWidth="1.5" opacity="0.6" />
            <path d="M 80 120 Q 150 140, 220 100 T 340 130 T 440 85" fill="none" stroke="#585651" strokeWidth="1.5" opacity="0.8" />
            <path d="M 80 95 Q 160 70, 240 115 T 350 85 T 440 102" fill="none" stroke="#C85A32" strokeWidth="2.5" />
            <text x="445" y="104" className="text-[10px] font-mono font-bold fill-[#C85A32]">X⁽¹⁾(t)</text>
            <text x="80" y="15" textAnchor="middle" className="text-[10px] font-mono font-bold fill-[#1A1917]">X(t, ξ)</text>
            <text x="250" y="185" textAnchor="middle" className="text-[10px] font-mono font-medium fill-[#484642]">
              Stochastic Ensemble Realizations · Wide-Sense Stationary Property
            </text>
          </svg>
        );

      case 'correlation-spectrum':
        return (
          <svg
            viewBox="0 0 500 200"
            preserveAspectRatio="xMidYMid meet"
            className="w-full h-full max-h-[70vh] select-none"
            aria-label="Autocorrelation function symmetry schematic"
            role="img"
          >
            <line x1="40" y1="140" x2="460" y2="140" stroke="#8A8882" strokeWidth="1.5" />
            <line x1="250" y1="30" x2="250" y2="170" stroke="#585651" strokeWidth="1.25" strokeDasharray="2 2" />

            {/* Autocorrelation symmetric peak */}
            <path
              d="M 60 140 C 150 140, 210 50, 250 50 C 290 50, 350 140, 440 140"
              fill="none"
              stroke="#C85A32"
              strokeWidth="2.5"
            />
            <circle cx="250" cy="50" r="3.5" fill="#C85A32" />
            <text x="250" y="38" textAnchor="middle" className="text-[10px] font-mono font-bold fill-[#1A1917]">
              R_xx(0) = Signal Energy / Power
            </text>
            <text x="250" y="185" textAnchor="middle" className="text-[10px] font-mono font-medium fill-[#585651]">
              Lag τ = 0 (Peak correlation symmetry: R_xx(τ) = R_xx(-τ))
            </text>
          </svg>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Top Breadcrumb & Return Action */}
      <div className="border-b border-[#E6E4DD] bg-[#FAF9F6]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-mono text-[#75736E]">
            <button
              onClick={onNavigateHome}
              className="hover:text-[#1A1917] transition-colors flex items-center gap-1 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C85A32] rounded"
            >
              SIGNAL LAB
            </button>
            <span aria-hidden="true">/</span>
            <button
              onClick={onNavigateHome}
              className="hover:text-[#1A1917] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C85A32] rounded"
            >
              WORKSPACE
            </button>
            <span aria-hidden="true">/</span>
            <span className="text-[#C85A32] font-semibold">{module.index} {module.name}</span>
          </div>

          <button
            onClick={onNavigateHome}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#1A1917] hover:text-[#C85A32] transition-colors self-start sm:self-auto focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C85A32] rounded py-1 px-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to workspace</span>
          </button>
        </div>
      </div>

      {/* Main Content Container */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
        {/* Module Header Bar */}
        <div className="pb-8 border-b border-[#E6E4DD] flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-mono font-bold tracking-wider text-[#C85A32] bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/20">
                MODULE {module.index}
              </span>
              <span className="text-xs text-[#75736E] font-medium">{module.tag}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1917]">
              {module.name}
            </h1>
            <p className="mt-2 text-sm sm:text-base text-[#585651] max-w-2xl leading-relaxed">
              {module.description}
            </p>
          </div>

          {/* Quick switcher to next/prev */}
          <div className="flex items-center gap-2 shrink-0">
            {prevModule && (
              <button
                onClick={() => onNavigateModule(prevModule.path)}
                className="px-3 py-1.5 border border-[#E6E4DD] hover:bg-[#FAF9F6] text-xs font-medium text-[#585651] hover:text-[#1A1917] rounded-md transition-colors flex items-center gap-1.5"
                title={`Previous: ${prevModule.name}`}
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Prev ({prevModule.index})</span>
              </button>
            )}
            {nextModule && (
              <button
                onClick={() => onNavigateModule(nextModule.path)}
                className="px-3 py-1.5 border border-[#E6E4DD] hover:bg-[#FAF9F6] text-xs font-medium text-[#585651] hover:text-[#1A1917] rounded-md transition-colors flex items-center gap-1.5"
                title={`Next: ${nextModule.name}`}
              >
                <span>Next ({nextModule.index})</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {/* Technical Prototype Notice */}
        <div className="mt-6 p-4 rounded-md bg-[#FAF9F6] border border-[#E6E4DD] flex items-start gap-3">
          <Info className="w-4 h-4 text-[#C85A32] shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-[#585651] leading-relaxed">
            <span className="font-semibold text-[#1A1917]">Workspace Architecture Shell: </span>
            This route represents the technical destination for <strong className="text-[#1A1917]">{module.name}</strong>. Mathematical calculations and interactive signal generators attach directly to this viewport layout.
          </div>
        </div>

        {/* Schematic Preview & Mathematical Breakdown Split */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Stage: Simulation / Visualization Window */}
          <div className="lg:col-span-8 bg-white rounded-lg border border-[#E6E4DD] p-6 shadow-xs flex flex-col">
            {/* Header & Status */}
            <div className="flex items-center justify-between pb-4 border-b border-[#E6E4DD] mb-4">
              <div className="flex items-center gap-2">
                <ModuleGlyph id={module.id} className="w-4 h-4" accent={true} />
                <h2 className="text-sm font-bold tracking-tight text-[#1A1917] uppercase font-mono">
                  Simulation & Visualization Window
                </h2>
              </div>
              <span className="text-[11px] font-mono text-[#8A8882]">VIEWPORT · CANVAS STAGE</span>
            </div>

            {/* Live Visualization Toolbar (Play/Resume, Pause, Reset, Speed, Grid toggle, Fullscreen) */}
            <SimulationToolbar
              playbackState={playbackState}
              onPlay={handlePlay}
              onPause={handlePause}
              onReset={handleReset}
              speed={speed}
              onSpeedChange={setSpeed}
              isGridVisible={isGridVisible}
              onToggleGrid={() => setIsGridVisible(!isGridVisible)}
              isFullscreen={isFullscreen}
              onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
              isLiveSimulationReady={false}
              className="mb-4"
            />

            {/* Canvas Viewport Stage with Full-Coverage Background Grid */}
            <div className="relative w-full h-full min-h-[250px] bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden flex items-center justify-center p-4">
              {/* Grid covers entire available visualization background */}
              {renderBackgroundGrid(`canvas-grid-${module.id}`)}

              {/* Foreground Plotted Visualization */}
              <div className="relative z-10 w-full h-full flex items-center justify-center">
                {renderSchematicPreview()}
              </div>
            </div>

            {/* Parameter Matrix Preview */}
            <div className="mt-6 pt-5 border-t border-[#E6E4DD]">
              <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-3 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#585651]" />
                <span>Configurable Laboratory Parameters</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {module.parameterHighlights.map((param, i) => (
                  <div key={i} className="p-2.5 rounded bg-[#FAF9F6] border border-[#E6E4DD]">
                    <div className="text-[11px] font-mono text-[#8A8882]">PARAM 0{i + 1}</div>
                    <div className="text-xs font-semibold text-[#1A1917] mt-0.5 truncate">{param}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Theoretical Foundations */}
          <div className="lg:col-span-4 space-y-6">
            {/* Mathematical Model Card with KaTeX rendering */}
            <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-5 shadow-xs">
              <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-2 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-[#585651]" />
                <span>Analytical Formulation</span>
              </div>
              <div className="text-xs text-[#585651] mb-2 font-medium">
                {module.formulaLabel}
              </div>
              <div className="p-3 bg-white rounded border border-[#E6E4DD] text-sm sm:text-base font-semibold text-[#1A1917] overflow-x-auto">
                <MathView math={module.formula} displayMode={true} />
              </div>
            </div>

            {/* Curricular Focus Areas */}
            <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-5 shadow-xs">
              <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-3 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#585651]" />
                <span>Curricular Topics</span>
              </div>
              <ul className="space-y-2.5">
                {module.topics.map((t, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-[#484642] leading-snug">
                    <span className="font-mono text-[#C85A32] font-semibold text-xs mt-0.5">0{idx + 1}</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Return to Hub Action */}
            <button
              onClick={onNavigateHome}
              className="w-full py-2.5 px-4 bg-white border border-[#E6E4DD] hover:bg-[#FAF9F6] text-xs font-semibold text-[#1A1917] rounded-md transition-colors flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85A32]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Workspace Hub</span>
            </button>
          </div>
        </div>

        {/* Global Module Quick Switcher */}
        <div className="mt-12 pt-8 border-t border-[#E6E4DD]">
          <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-4">
            All Laboratory Workspaces (01–07)
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {MODULES.map((m) => {
              const isCurrent = m.id === module.id;
              return (
                <button
                  key={m.id}
                  onClick={() => onNavigateModule(m.path)}
                  className={`p-2.5 rounded text-left transition-colors border ${
                    isCurrent
                      ? 'bg-[#FBF4F0] border-[#C85A32] text-[#C85A32]'
                      : 'bg-white border-[#E6E4DD] hover:bg-[#FAF9F6] text-[#585651] hover:text-[#1A1917]'
                  }`}
                >
                  <div className="font-mono text-[10px] font-bold">{m.index}</div>
                  <div className="text-xs font-semibold truncate mt-0.5">{m.name}</div>
                </button>
              );
            })}
          </div>
        </div>
      </main>

      {/* Clean Fullscreen Viewport Mode: ONLY the playback toolbar and the expanded visualization */}
      {isFullscreen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Simulation Viewport Fullscreen"
          className="fixed inset-0 z-50 bg-white flex flex-col p-3 sm:p-4 gap-2.5 overflow-hidden select-none animate-in fade-in duration-100"
        >
          {/* 1. The simulation's existing playback toolbar (directly above visualization, no extra title bar) */}
          <SimulationToolbar
            playbackState={playbackState}
            onPlay={handlePlay}
            onPause={handlePause}
            onReset={handleReset}
            speed={speed}
            onSpeedChange={setSpeed}
            isGridVisible={isGridVisible}
            onToggleGrid={() => setIsGridVisible(!isGridVisible)}
            isFullscreen={true}
            onToggleFullscreen={() => setIsFullscreen(false)}
            isLiveSimulationReady={false}
            className="shrink-0"
          />

          {/* 2. The actual visualization window, expanded to use the available viewport */}
          <div className="flex-1 min-h-0 w-full relative bg-[#FAF9F6] border border-[#E6E4DD] rounded-lg overflow-hidden flex items-center justify-center p-4">
            {/* Full-coverage grid across all edges & corners in fullscreen */}
            {renderBackgroundGrid(`fs-grid-${module.id}`)}

            {/* Foreground Plotted Visualization */}
            <div className="relative z-10 w-full h-full flex items-center justify-center">
              {renderSchematicPreview()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
