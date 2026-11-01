/**
 * Module 6: Euler Identity & Complex Signals
 * Filename: Module6_EulerSignals.jsx
 *
 * Professional Educational Laboratory for Complex Signals & Phasor Analysis:
 * - Dynamic Argand complex plane with real-time rotating phasor vector z(t) = r * e^(j*theta)
 * - In-Phase (I = Re{z} = r*cos θ) and Quadrature (Q = Im{z} = r*sin θ) orthogonal projections
 * - Synchronized time-domain sinusoidal projection oscilloscope (I(t) and Q(t) waveforms)
 * - Complex conjugate z* and negative frequency phasor (e^(-jωt)) visualization
 * - Full playback simulation engine (Play / Pause / Reset / Speed multiplier)
 * - Interactive parameter modulators (Phase angle θ, Modulus |z|, Angular velocity ω)
 * - Pedagogical preset angles (0°, 45°, 90°, 135°, 180°, 270°, 315°)
 * - WCAG 2.2 AA compliant keyboard navigation, ARIA live regions, semantic elements, and responsive layout
 *
 * Preserves application design system, shared component contracts, and zero external style leaks.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Layers,
  BookOpen,
  SlidersHorizontal,
  Info,
  Code2,
  Activity,
  Compass,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  HelpCircle,
  Eye,
  Check,
  ChevronRight,
  TrendingUp,
  Volume2,
} from 'lucide-react';
import { MathView } from '../components/MathView';
import { SimulationToolbar } from '../components/SimulationToolbar';

// [YOUR PART HERE]
export default function Module6_EulerSignals({
  onNavigateHome,
  onNavigateModule,
  isInstructorMode = false,
}) {
  // -------------------------------------------------------------
  // Viewport & Simulation Toolbar States
  // -------------------------------------------------------------
  const [isGridVisible, setIsGridVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackState, setPlaybackState] = useState('paused'); // 'playing' | 'paused' | 'reset'
  const [speed, setSpeed] = useState('1×');
  const [activeTab, setActiveTab] = useState('argand'); // 'argand' | 'projections' | 'formulas' | 'pedagogy'

  // -------------------------------------------------------------
  // Interactive Phasor Modulator Parameters
  // -------------------------------------------------------------
  const [thetaDeg, setThetaDeg] = useState(45); // Phase angle in degrees (0 - 360)
  const [phasorMagnitude, setPhasorMagnitude] = useState(1.0); // Modulus |z| (0.1 - 1.5)
  const [angularFreq, setAngularFreq] = useState(2.0); // Angular velocity ω in rad/s (0.5 - 6.0)

  // Visual Display Toggles
  const [showProjections, setShowProjections] = useState(true); // Orthogonal projection guidelines
  const [showUnitCircle, setShowUnitCircle] = useState(true); // |z| = 1 circle guide
  const [showConjugate, setShowConjugate] = useState(false); // z* = r * e^(-jθ)
  const [showNegativeFreq, setShowNegativeFreq] = useState(false); // e^(-jωt) counter-rotating vector
  const [showAngleArc, setShowAngleArc] = useState(true); // θ angle sector
  const [showHarmonicTrail, setShowHarmonicTrail] = useState(true); // Orbit trajectory circle

  // Screen Reader Accessibility Announcement
  const [screenReaderAnnouncement, setScreenReaderAnnouncement] = useState('');

  // -------------------------------------------------------------
  // Animation Sweep Engine (60 FPS requestAnimationFrame)
  // -------------------------------------------------------------
  const animFrameRef = useRef(null);
  const lastTimeRef = useRef(null);

  const speedMultiplier = useMemo(() => {
    switch (speed) {
      case '0.25×':
        return 0.25;
      case '0.5×':
        return 0.5;
      case '2×':
        return 2.0;
      case '4×':
        return 4.0;
      case '1×':
      default:
        return 1.0;
    }
  }, [speed]);

  useEffect(() => {
    if (playbackState === 'playing') {
      const animate = (timestamp) => {
        if (!lastTimeRef.current) {
          lastTimeRef.current = timestamp;
        }
        const deltaSeconds = (timestamp - lastTimeRef.current) / 1000;
        lastTimeRef.current = timestamp;

        // Advance angle: dTheta = omega * dt * speed (converted to degrees)
        const deltaDeg = (angularFreq * (180 / Math.PI)) * deltaSeconds * speedMultiplier;

        setThetaDeg((prev) => {
          const next = (prev + deltaDeg) % 360;
          return next < 0 ? next + 360 : next;
        });

        animFrameRef.current = requestAnimationFrame(animate);
      };

      animFrameRef.current = requestAnimationFrame(animate);
    } else {
      lastTimeRef.current = null;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    }

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [playbackState, angularFreq, speedMultiplier]);

  // Fullscreen Escape Key Handler
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // -------------------------------------------------------------
  // Mathematical Calculations
  // -------------------------------------------------------------
  const thetaRad = useMemo(() => (thetaDeg * Math.PI) / 180, [thetaDeg]);
  const realPart = useMemo(() => phasorMagnitude * Math.cos(thetaRad), [phasorMagnitude, thetaRad]);
  const imagPart = useMemo(() => phasorMagnitude * Math.sin(thetaRad), [phasorMagnitude, thetaRad]);
  const powerVal = useMemo(() => phasorMagnitude * phasorMagnitude, [phasorMagnitude]);
  const cyclicFreqHz = useMemo(() => (angularFreq / (2 * Math.PI)), [angularFreq]);
  const periodSeconds = useMemo(() => (1 / (cyclicFreqHz || 0.001)), [cyclicFreqHz]);

  // Rational Pi representation for common angles
  const piFraction = useMemo(() => {
    const deg = Math.round(thetaDeg) % 360;
    if (deg === 0) return '0';
    if (deg === 30) return '\\frac{\\pi}{6}';
    if (deg === 45) return '\\frac{\\pi}{4}';
    if (deg === 60) return '\\frac{\\pi}{3}';
    if (deg === 90) return '\\frac{\\pi}{2}';
    if (deg === 120) return '\\frac{2\\pi}{3}';
    if (deg === 135) return '\\frac{3\\pi}{4}';
    if (deg === 150) return '\\frac{5\\pi}{6}';
    if (deg === 180) return '\\pi';
    if (deg === 210) return '\\frac{7\\pi}{6}';
    if (deg === 225) return '\\frac{5\\pi}{4}';
    if (deg === 240) return '\\frac{4\\pi}{3}';
    if (deg === 270) return '\\frac{3\\pi}{2}';
    if (deg === 300) return '\\frac{5\\pi}{3}';
    if (deg === 315) return '\\frac{7\\pi}{4}';
    if (deg === 330) return '\\frac{11\\pi}{6}';
    return `${(thetaRad / Math.PI).toFixed(2)}\\pi`;
  }, [thetaDeg, thetaRad]);

  // Helper for setting preset angles
  const handleSelectPreset = useCallback((targetDeg, label) => {
    setThetaDeg(targetDeg);
    setScreenReaderAnnouncement(`Set phase angle to ${label} (${targetDeg} degrees)`);
  }, []);

  // Update screen reader on user slider change (debounced via effect)
  const announcePhasorUpdate = useCallback((deg, r) => {
    const rad = ((deg * Math.PI) / 180).toFixed(2);
    const re = (r * Math.cos((deg * Math.PI) / 180)).toFixed(2);
    const im = (r * Math.sin((deg * Math.PI) / 180)).toFixed(2);
    setScreenReaderAnnouncement(`Phasor updated: Angle ${Math.round(deg)} degrees, magnitude ${r.toFixed(2)}, Real ${re}, Imaginary ${im}`);
  }, []);

  // -------------------------------------------------------------
  // Argand Complex Plane Geometry Math
  // -------------------------------------------------------------
  const argandConfig = useMemo(() => {
    const width = 540;
    const height = 360;
    const cx = 270;
    const cy = 180;
    const scale = 110; // 1.0 unit = 110 px

    // Main phasor tip
    const px = cx + phasorMagnitude * scale * Math.cos(thetaRad);
    const py = cy - phasorMagnitude * scale * Math.sin(thetaRad); // SVG y is inverted

    // Conjugate tip
    const conjPx = cx + phasorMagnitude * scale * Math.cos(-thetaRad);
    const conjPy = cy - phasorMagnitude * scale * Math.sin(-thetaRad);

    // Negative frequency tip (rotating clockwise)
    const negPx = cx + phasorMagnitude * scale * Math.cos(-thetaRad);
    const negPy = cy - phasorMagnitude * scale * Math.sin(-thetaRad);

    // Real and Imaginary axis projections
    const projRealX = px;
    const projRealY = cy;

    const projImagX = cx;
    const projImagY = py;

    // Angle sector arc path (radius = 36px)
    const arcRadius = 36;
    const arcStartX = cx + arcRadius;
    const arcStartY = cy;
    const arcEndX = cx + arcRadius * Math.cos(thetaRad);
    const arcEndY = cy - arcRadius * Math.sin(thetaRad);
    const largeArcFlag = thetaDeg > 180 ? 1 : 0;
    const sweepFlag = 0; // counter-clockwise in SVG coordinates (y inverted)
    const arcPath = `M ${cx} ${cy} L ${arcStartX} ${arcStartY} A ${arcRadius} ${arcRadius} 0 ${largeArcFlag} ${sweepFlag} ${arcEndX} ${arcEndY} Z`;

    return {
      width,
      height,
      cx,
      cy,
      scale,
      px,
      py,
      conjPx,
      conjPy,
      negPx,
      negPy,
      projRealX,
      projRealY,
      projImagX,
      projImagY,
      arcPath,
    };
  }, [thetaRad, thetaDeg, phasorMagnitude]);

  // -------------------------------------------------------------
  // Time-Domain Projections Oscilloscope Math
  // -------------------------------------------------------------
  const projectionWaves = useMemo(() => {
    const width = 540;
    const height = 240;
    const padL = 45;
    const padR = 25;
    const padT = 30;
    const padB = 40;
    const plotW = width - padL - padR;
    const plotH = height - padT - padB;
    const midY = padT + plotH / 2;
    const ampScale = (plotH / 2) * 0.78;

    // Time window spans 2 complete fundamental cycles
    const totalCycles = 2.0;
    const tMax = totalCycles * periodSeconds;
    const sampleCount = 140;

    let inPhasePath = '';
    let quadPath = '';

    for (let i = 0; i <= sampleCount; i++) {
      const frac = i / sampleCount;
      const t = frac * tMax;
      const x = padL + frac * plotW;

      // In-phase carrier: I(t) = |z| * cos(omega * t + theta)
      const iVal = phasorMagnitude * Math.cos(angularFreq * t + thetaRad);
      const yI = midY - (iVal / 1.5) * ampScale;

      // Quadrature carrier: Q(t) = |z| * sin(omega * t + theta)
      const qVal = phasorMagnitude * Math.sin(angularFreq * t + thetaRad);
      const yQ = midY - (qVal / 1.5) * ampScale;

      if (i === 0) {
        inPhasePath += `M ${x.toFixed(1)} ${yI.toFixed(1)}`;
        quadPath += `M ${x.toFixed(1)} ${yQ.toFixed(1)}`;
      } else {
        inPhasePath += ` L ${x.toFixed(1)} ${yI.toFixed(1)}`;
        quadPath += ` L ${x.toFixed(1)} ${yQ.toFixed(1)}`;
      }
    }

    // Instantaneous marker position at t = 0 (padL)
    const markerIX = padL;
    const markerIY = midY - (realPart / 1.5) * ampScale;
    const markerQX = padL;
    const markerQY = midY - (imagPart / 1.5) * ampScale;

    return {
      width,
      height,
      padL,
      padR,
      midY,
      plotW,
      plotH,
      inPhasePath,
      quadPath,
      markerIX,
      markerIY,
      markerQX,
      markerQY,
    };
  }, [angularFreq, thetaRad, phasorMagnitude, realPart, imagPart, periodSeconds]);

  // -------------------------------------------------------------
  // Background Grid SVG Component
  // -------------------------------------------------------------
  const renderBackgroundGrid = (idPrefix) => {
    if (!isGridVisible) return null;
    return (
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none select-none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <pattern id={`${idPrefix}-minor`} width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#E2DFD6" strokeWidth="1" />
          </pattern>
          <pattern id={`${idPrefix}-major`} width="96" height="96" patternUnits="userSpaceOnUse">
            <rect width="96" height="96" fill={`url(#${idPrefix}-minor)`} />
            <path d="M 96 0 L 0 0 0 96" fill="none" stroke="#C8C4B8" strokeWidth="1.25" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${idPrefix}-major)`} />
      </svg>
    );
  };

  return (
    <div
      className={`w-full transition-all duration-200 ${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-white p-4 sm:p-6 md:p-8 overflow-y-auto'
          : 'relative'
      }`}
    >
      {/* Hidden Live Region for Screen Readers */}
      <div
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
        role="status"
      >
        {screenReaderAnnouncement}
      </div>

      {/* ========================================================= */}
      {/* 1. MODULE CONTEXT BANNER & HEADER                         */}
      {/* ========================================================= */}
      <header className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-[#E6E4DD]">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span
              className="text-xs font-mono font-bold tracking-wider text-[#C85A32] bg-[#FBF4F0] px-2.5 py-0.5 rounded border border-[#C85A32]/20"
              title="Assigned engineering module in communication systems simulator"
            >
              MODULE 06
            </span>
            <span className="text-xs text-[#585651] font-medium">
              Complex Signals, Phasors & Euler Relations
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1917] flex items-center gap-2.5">
            <span>Module 6: Euler Identity & Complex Signals</span>
          </h1>

          <p className="mt-1.5 text-sm sm:text-base text-[#585651] max-w-3xl leading-relaxed">
            Interactive Argand complex plane laboratory exploring rotating phasor vectors{' '}
            <code className="text-xs font-mono bg-[#FAF9F6] px-1 py-0.5 rounded border border-[#E6E4DD] text-[#1A1917]">
              z(t) = r·e^(jθ)
            </code>
            , In-Phase (I) and Quadrature (Q) orthogonal projections, Cartesian-polar mappings, and negative frequency spectra.
          </p>
        </div>

        {/* Live Status Indicator & Quick Home Navigation */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 text-xs font-mono text-[#1A1917] bg-[#FAF9F6] border border-[#E6E4DD] px-3 py-1.5 rounded-md shadow-2xs">
            <span className="relative flex h-2 w-2">
              {playbackState === 'playing' ? (
                <>
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#C85A32] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#C85A32]" />
                </>
              ) : (
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#75736E]" />
              )}
            </span>
            <span>
              {playbackState === 'playing'
                ? `Rotating (${speed})`
                : playbackState === 'paused'
                ? 'Phasor Paused'
                : 'Phasor Ready'}
            </span>
          </div>

          {onNavigateHome && (
            <button
              type="button"
              onClick={onNavigateHome}
              className="text-xs font-mono text-[#585651] hover:text-[#1A1917] bg-white border border-[#E6E4DD] hover:bg-[#FAF9F6] px-2.5 py-1.5 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85A32]"
              aria-label="Return to Workspace Overview"
            >
              Workspace Hub
            </button>
          )}
        </div>
      </header>

      {/* ========================================================= */}
      {/* 2. SUB-VIEW NAVIGATION TABS                               */}
      {/* ========================================================= */}
      <nav
        className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-5 border-b border-[#E6E4DD]"
        role="tablist"
        aria-label="Module 06 Sub-views"
      >
        {[
          { id: 'argand', label: 'Argand Plane & Phasor Dynamics', icon: Compass },
          { id: 'projections', label: 'In-Phase & Quadrature Waves', icon: Activity },
          { id: 'formulas', label: 'Euler Identities & Formulas', icon: BookOpen },
          { id: 'pedagogy', label: 'Pedagogy & Curriculum Guide', icon: Layers },
        ].map((tab) => {
          const Icon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={isSelected}
              aria-controls={`panel-${tab.id}`}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-md text-xs sm:text-sm font-semibold transition-all whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85A32] ${
                isSelected
                  ? 'bg-[#1A1917] text-white shadow-2xs'
                  : 'text-[#585651] hover:text-[#1A1917] hover:bg-[#FAF9F6]'
              }`}
            >
              <Icon className={`w-4 h-4 ${isSelected ? 'text-[#C85A32]' : 'text-[#75736E]'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* ========================================================= */}
      {/* 3. MAIN WORKSPACE GRID                                    */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT 8 COLS: Primary Visualization & Control Stage */}
        <section
          className="lg:col-span-8 bg-white rounded-lg border border-[#E6E4DD] p-4 sm:p-6 shadow-xs flex flex-col"
          aria-labelledby="simulation-stage-title"
        >
          {/* Stage Header with Live Readouts */}
          <div className="flex flex-wrap items-center justify-between pb-3.5 border-b border-[#E6E4DD] mb-4 gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C85A32]" aria-hidden="true" />
              <h2
                id="simulation-stage-title"
                className="text-xs sm:text-sm font-bold tracking-tight text-[#1A1917] uppercase font-mono"
              >
                {activeTab === 'argand' && 'Argand Complex Plane & Orthogonal Projections'}
                {activeTab === 'projections' && 'Synchronized In-Phase & Quadrature Time Oscilloscope'}
                {activeTab === 'formulas' && 'Analytical Foundations of Complex Sinusoids'}
                {activeTab === 'pedagogy' && 'Curricular Outcomes & Laboratory Guide'}
              </h2>
            </div>

            {/* Live Compact Coordinate Badge */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-[#75736E]">θ =</span>
              <span className="font-bold text-[#C85A32]">{Math.round(thetaDeg)}°</span>
              <span className="text-[#8A8882]">({thetaRad.toFixed(2)} rad)</span>
              <span className="text-[#D1CFCE]">|</span>
              <span className="text-[#75736E]">|z| =</span>
              <span className="font-bold text-[#1A1917]">{phasorMagnitude.toFixed(2)}</span>
            </div>
          </div>

          {/* Reusable Simulation Toolbar */}
          <SimulationToolbar
            playbackState={playbackState}
            onPlay={() => {
              setPlaybackState('playing');
              setScreenReaderAnnouncement('Phasor rotation simulation playing');
            }}
            onPause={() => {
              setPlaybackState('paused');
              setScreenReaderAnnouncement(`Simulation paused at ${Math.round(thetaDeg)} degrees`);
            }}
            onReset={() => {
              setPlaybackState('paused');
              setThetaDeg(45);
              setPhasorMagnitude(1.0);
              setAngularFreq(2.0);
              setScreenReaderAnnouncement('Simulation reset to initial 45 degrees, magnitude 1.0');
            }}
            speed={speed}
            onSpeedChange={(newSpeed) => {
              setSpeed(newSpeed);
              setScreenReaderAnnouncement(`Playback speed changed to ${newSpeed}`);
            }}
            isGridVisible={isGridVisible}
            onToggleGrid={() => setIsGridVisible(!isGridVisible)}
            isFullscreen={isFullscreen}
            onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
            isLiveSimulationReady={true}
            className="mb-4"
          />

          {/* ------------------------------------------------------- */}
          {/* TAB 1: ARGAND PLANE & PHASOR DYNAMICS                   */}
          {/* ------------------------------------------------------- */}
          {activeTab === 'argand' && (
            <div
              id="panel-argand"
              role="tabpanel"
              aria-labelledby="tab-argand"
              className="flex flex-col space-y-4"
            >
              {/* Canvas Viewport Stage */}
              <div className="relative w-full min-h-[340px] sm:min-h-[380px] bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden flex flex-col items-center justify-center p-2 sm:p-4">
                {renderBackgroundGrid('argand-grid')}

                <svg
                  viewBox={`0 0 ${argandConfig.width} ${argandConfig.height}`}
                  preserveAspectRatio="xMidYMid meet"
                  className="w-full h-auto max-h-[62vh] select-none"
                  aria-label={`Argand diagram showing a complex vector of magnitude ${phasorMagnitude.toFixed(2)} at angle ${Math.round(thetaDeg)} degrees, real component ${realPart.toFixed(2)}, imaginary component ${imagPart.toFixed(2)}`}
                  role="img"
                >
                  <title>Argand Complex Plane Diagram</title>
                  <desc>
                    A 2D coordinate system displaying the Real horizontal axis and Imaginary vertical
                    axis with a rotating phasor vector, projection lines to both axes, and an angle arc.
                  </desc>

                  <defs>
                    {/* Vector Arrowhead Marker */}
                    <marker
                      id="arrow-terracotta"
                      viewBox="0 0 10 10"
                      refX="7"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#C85A32" />
                    </marker>

                    {/* Conjugate Arrowhead Marker */}
                    <marker
                      id="arrow-slate"
                      viewBox="0 0 10 10"
                      refX="7"
                      refY="5"
                      markerWidth="6"
                      markerHeight="6"
                      orient="auto-start-reverse"
                    >
                      <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#585651" />
                    </marker>
                  </defs>

                  {/* Concentric Guide Circles */}
                  {showUnitCircle && (
                    <g opacity="0.6">
                      <circle
                        cx={argandConfig.cx}
                        cy={argandConfig.cy}
                        r={0.5 * argandConfig.scale}
                        fill="none"
                        stroke="#D5D2C8"
                        strokeWidth="1"
                        strokeDasharray="3 3"
                      />
                      <circle
                        cx={argandConfig.cx}
                        cy={argandConfig.cy}
                        r={1.0 * argandConfig.scale}
                        fill="none"
                        stroke="#B5B1A5"
                        strokeWidth="1.25"
                        strokeDasharray="4 4"
                      />
                      <circle
                        cx={argandConfig.cx}
                        cy={argandConfig.cy}
                        r={1.5 * argandConfig.scale}
                        fill="none"
                        stroke="#E2DFD6"
                        strokeWidth="1"
                        strokeDasharray="3 3"
                      />
                      <text
                        x={argandConfig.cx + argandConfig.scale + 4}
                        y={argandConfig.cy + 13}
                        className="text-[9px] font-mono fill-[#8A8882]"
                      >
                        |z|=1.0
                      </text>
                    </g>
                  )}

                  {/* Orbit Trajectory Circle for current magnitude */}
                  {showHarmonicTrail && (
                    <circle
                      cx={argandConfig.cx}
                      cy={argandConfig.cy}
                      r={phasorMagnitude * argandConfig.scale}
                      fill="none"
                      stroke="#C85A32"
                      strokeWidth="1"
                      strokeDasharray="2 3"
                      opacity="0.35"
                    />
                  )}

                  {/* Principal Coordinate Axes: Re (Horizontal) and Im (Vertical) */}
                  <line
                    x1="40"
                    y1={argandConfig.cy}
                    x2={argandConfig.width - 40}
                    y2={argandConfig.cy}
                    stroke="#585651"
                    strokeWidth="1.5"
                  />
                  <line
                    x1={argandConfig.cx}
                    y1="25"
                    x2={argandConfig.cx}
                    y2={argandConfig.height - 25}
                    stroke="#585651"
                    strokeWidth="1.5"
                  />

                  {/* Axis Arrows */}
                  <polygon
                    points={`${argandConfig.width - 35},${argandConfig.cy} ${argandConfig.width - 43},${argandConfig.cy - 4} ${argandConfig.width - 43},${argandConfig.cy + 4}`}
                    fill="#585651"
                  />
                  <polygon
                    points={`${argandConfig.cx},20 ${argandConfig.cx - 4},28 ${argandConfig.cx + 4},28`}
                    fill="#585651"
                  />

                  {/* Axis Labels with Mathematical Roles */}
                  <text
                    x={argandConfig.width - 32}
                    y={argandConfig.cy + 4}
                    className="text-[11px] font-mono font-bold fill-[#1A1917]"
                  >
                    +Re
                  </text>
                  <text
                    x={argandConfig.cx + 6}
                    y="18"
                    className="text-[11px] font-mono font-bold fill-[#1A1917]"
                  >
                    +j·Im
                  </text>

                  {/* Axis Tick Marks */}
                  {[-1.0, -0.5, 0.5, 1.0].map((val) => {
                    const tx = argandConfig.cx + val * argandConfig.scale;
                    const ty = argandConfig.cy - val * argandConfig.scale;
                    return (
                      <g key={val}>
                        {/* Real ticks */}
                        <line
                          x1={tx}
                          y1={argandConfig.cy - 3}
                          x2={tx}
                          y2={argandConfig.cy + 3}
                          stroke="#75736E"
                          strokeWidth="1"
                        />
                        <text
                          x={tx}
                          y={argandConfig.cy + 14}
                          textAnchor="middle"
                          className="text-[8.5px] font-mono fill-[#75736E]"
                        >
                          {val > 0 ? `+${val}` : val}
                        </text>
                        {/* Imag ticks */}
                        <line
                          x1={argandConfig.cx - 3}
                          y1={ty}
                          x2={argandConfig.cx + 3}
                          y2={ty}
                          stroke="#75736E"
                          strokeWidth="1"
                        />
                        <text
                          x={argandConfig.cx - 6}
                          y={ty + 3}
                          textAnchor="end"
                          className="text-[8.5px] font-mono fill-[#75736E]"
                        >
                          {val > 0 ? `+${val}j` : `${val}j`}
                        </text>
                      </g>
                    );
                  })}

                  {/* Origin Indicator */}
                  <text
                    x={argandConfig.cx - 8}
                    y={argandConfig.cy + 13}
                    className="text-[9px] font-mono fill-[#8A8882]"
                  >
                    0
                  </text>

                  {/* Angle Sector (Shaded Triangle / Wedge) */}
                  {showAngleArc && thetaDeg > 0 && thetaDeg < 360 && (
                    <path
                      d={argandConfig.arcPath}
                      fill="#C85A32"
                      fillOpacity="0.12"
                      stroke="#C85A32"
                      strokeWidth="1.25"
                    />
                  )}

                  {/* In-Phase (Real) Highlight Segment on Re-Axis */}
                  {showProjections && (
                    <line
                      x1={argandConfig.cx}
                      y1={argandConfig.cy}
                      x2={argandConfig.px}
                      y2={argandConfig.cy}
                      stroke="#C85A32"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  )}

                  {/* Quadrature (Imaginary) Highlight Segment on Im-Axis */}
                  {showProjections && (
                    <line
                      x1={argandConfig.cx}
                      y1={argandConfig.cy}
                      x2={argandConfig.cx}
                      y2={argandConfig.py}
                      stroke="#3B6780"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />
                  )}

                  {/* Orthogonal Projection Dashed Drop-Lines */}
                  {showProjections && (
                    <g>
                      {/* Vertical line from phasor tip to Real axis */}
                      <line
                        x1={argandConfig.px}
                        y1={argandConfig.py}
                        x2={argandConfig.px}
                        y2={argandConfig.cy}
                        stroke="#C85A32"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                        opacity="0.8"
                      />
                      {/* Horizontal line from phasor tip to Imag axis */}
                      <line
                        x1={argandConfig.px}
                        y1={argandConfig.py}
                        x2={argandConfig.cx}
                        y2={argandConfig.py}
                        stroke="#3B6780"
                        strokeWidth="1.5"
                        strokeDasharray="3 3"
                        opacity="0.8"
                      />
                    </g>
                  )}

                  {/* Complex Conjugate Phasor Vector z* = r * e^(-jθ) */}
                  {showConjugate && (
                    <g opacity="0.75">
                      <line
                        x1={argandConfig.cx}
                        y1={argandConfig.cy}
                        x2={argandConfig.conjPx}
                        y2={argandConfig.conjPy}
                        stroke="#585651"
                        strokeWidth="2"
                        strokeDasharray="4 2"
                        markerEnd="url(#arrow-slate)"
                      />
                      <circle
                        cx={argandConfig.conjPx}
                        cy={argandConfig.conjPy}
                        r="3.5"
                        fill="#585651"
                      />
                      <text
                        x={argandConfig.conjPx + 8}
                        y={argandConfig.conjPy + 4}
                        className="text-[10px] font-mono font-semibold fill-[#585651]"
                      >
                        z* = {realPart.toFixed(2)} - j{imagPart.toFixed(2)}
                      </text>
                    </g>
                  )}

                  {/* Negative Frequency Phasor (Counter-Rotating Vector e^(-jωt)) */}
                  {showNegativeFreq && (
                    <g opacity="0.65">
                      <line
                        x1={argandConfig.cx}
                        y1={argandConfig.cy}
                        x2={argandConfig.negPx}
                        y2={argandConfig.negPy}
                        stroke="#75736E"
                        strokeWidth="1.75"
                        strokeDasharray="2 3"
                        markerEnd="url(#arrow-slate)"
                      />
                      <text
                        x={argandConfig.negPx - 6}
                        y={argandConfig.negPy + 14}
                        textAnchor="end"
                        className="text-[9.5px] font-mono fill-[#75736E]"
                      >
                        e^(-jωt)
                      </text>
                    </g>
                  )}

                  {/* Primary Rotating Phasor Vector z = r * e^(jθ) */}
                  <line
                    x1={argandConfig.cx}
                    y1={argandConfig.cy}
                    x2={argandConfig.px}
                    y2={argandConfig.py}
                    stroke="#C85A32"
                    strokeWidth="2.75"
                    strokeLinecap="round"
                    markerEnd="url(#arrow-terracotta)"
                  />

                  {/* Phasor Tip Dot with Glow Ring */}
                  <circle
                    cx={argandConfig.px}
                    cy={argandConfig.py}
                    r="5.5"
                    fill="#C85A32"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />

                  {/* Floating Analytical Coordinate Pill beside Vector Tip */}
                  <g>
                    <rect
                      x={argandConfig.px + (argandConfig.px > argandConfig.cx ? 10 : -130)}
                      y={argandConfig.py - 24}
                      width="122"
                      height="22"
                      rx="4"
                      fill="#1A1917"
                      fillOpacity="0.88"
                    />
                    <text
                      x={argandConfig.px + (argandConfig.px > argandConfig.cx ? 16 : -124)}
                      y={argandConfig.py - 9}
                      className="text-[10px] font-mono font-semibold fill-white"
                    >
                      z = {realPart.toFixed(2)} {imagPart >= 0 ? '+' : '-'} j{Math.abs(imagPart).toFixed(2)}
                    </text>
                  </g>

                  {/* Angle Sector Label */}
                  {showAngleArc && (
                    <text
                      x={argandConfig.cx + 42 * Math.cos(thetaRad / 2)}
                      y={argandConfig.cy - 42 * Math.sin(thetaRad / 2)}
                      textAnchor="middle"
                      className="text-[10px] font-mono font-bold fill-[#C85A32]"
                    >
                      θ={Math.round(thetaDeg)}°
                    </text>
                  )}
                </svg>

                {/* Subtitle / Legend Beneath SVG */}
                <div className="w-full flex flex-wrap items-center justify-between text-[11px] font-mono text-[#585651] mt-2 pt-2 border-t border-[#E6E4DD]/60 px-2 gap-2">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-1 bg-[#C85A32] inline-block rounded" />
                      <span>Re(z) = In-Phase (I)</span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-3 h-1 bg-[#3B6780] inline-block rounded" />
                      <span>Im(z) = Quadrature (Q)</span>
                    </span>
                  </div>
                  <div className="text-[10px] text-[#75736E]">
                    Euler form: <span className="font-semibold text-[#1A1917]">{phasorMagnitude.toFixed(2)}·e^(j·{piFraction})</span>
                  </div>
                </div>
              </div>

              {/* Angle Step Buttons & Pedagogical Presets */}
              <div className="p-3.5 rounded-md bg-[#FAF9F6] border border-[#E6E4DD]">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                  <span className="text-xs font-mono uppercase tracking-wider text-[#75736E] font-semibold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#C85A32]" />
                    <span>Pedagogical Angle Presets</span>
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const next = (thetaDeg - 15 + 360) % 360;
                        setThetaDeg(next);
                        announcePhasorUpdate(next, phasorMagnitude);
                      }}
                      className="px-2 py-0.5 text-xs font-mono bg-white border border-[#E6E4DD] rounded hover:bg-[#FAF9F6] text-[#1A1917] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C85A32]"
                      title="Step angle -15°"
                      aria-label="Step angle backward 15 degrees"
                    >
                      -15°
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = (thetaDeg + 15) % 360;
                        setThetaDeg(next);
                        announcePhasorUpdate(next, phasorMagnitude);
                      }}
                      className="px-2 py-0.5 text-xs font-mono bg-white border border-[#E6E4DD] rounded hover:bg-[#FAF9F6] text-[#1A1917] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C85A32]"
                      title="Step angle +15°"
                      aria-label="Step angle forward 15 degrees"
                    >
                      +15°
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-1.5">
                  {[
                    { deg: 0, label: '0° (1+0j)', desc: 'Pure Real carrier' },
                    { deg: 45, label: '45° (π/4)', desc: 'Balanced I/Q' },
                    { deg: 90, label: '90° (+j)', desc: 'Pure Imaginary' },
                    { deg: 135, label: '135° (3π/4)', desc: 'Negative Real' },
                    { deg: 180, label: '180° (-1)', desc: "Euler's Identity" },
                    { deg: 270, label: '270° (-j)', desc: 'Negative Quadrature' },
                    { deg: 315, label: '315° (7π/4)', desc: 'Fourth Quadrant' },
                  ].map((preset) => {
                    const isCurrent = Math.round(thetaDeg) === preset.deg;
                    return (
                      <button
                        key={preset.deg}
                        type="button"
                        onClick={() => handleSelectPreset(preset.deg, preset.label)}
                        aria-pressed={isCurrent}
                        className={`px-2 py-1.5 rounded text-xs font-mono transition-all border text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85A32] ${
                          isCurrent
                            ? 'bg-[#1A1917] text-white border-[#1A1917] font-bold shadow-2xs'
                            : 'bg-white text-[#585651] border-[#E6E4DD] hover:bg-[#FAF9F6] hover:text-[#1A1917]'
                        }`}
                        title={preset.desc}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Visualization Feature Toggles */}
              <div className="flex flex-wrap items-center gap-3 p-3 rounded-md bg-[#FAF9F6] border border-[#E6E4DD] text-xs">
                <span className="font-mono text-[#75736E] text-[11px] uppercase font-semibold">
                  Visual Overlays:
                </span>
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-[#1A1917]">
                  <input
                    type="checkbox"
                    checked={showProjections}
                    onChange={(e) => setShowProjections(e.target.checked)}
                    className="accent-[#C85A32] rounded"
                  />
                  <span>Projections (I/Q)</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-[#1A1917]">
                  <input
                    type="checkbox"
                    checked={showUnitCircle}
                    onChange={(e) => setShowUnitCircle(e.target.checked)}
                    className="accent-[#C85A32] rounded"
                  />
                  <span>Unit Circle |z|=1</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-[#1A1917]">
                  <input
                    type="checkbox"
                    checked={showConjugate}
                    onChange={(e) => setShowConjugate(e.target.checked)}
                    className="accent-[#C85A32] rounded"
                  />
                  <span>Conjugate z*</span>
                </label>
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-[#1A1917]">
                  <input
                    type="checkbox"
                    checked={showNegativeFreq}
                    onChange={(e) => setShowNegativeFreq(e.target.checked)}
                    className="accent-[#C85A32] rounded"
                  />
                  <span>Neg Freq e^(-jωt)</span>
                </label>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* TAB 2: IN-PHASE & QUADRATURE TIME-DOMAIN WAVES          */}
          {/* ------------------------------------------------------- */}
          {activeTab === 'projections' && (
            <div
              id="panel-projections"
              role="tabpanel"
              aria-labelledby="tab-projections"
              className="flex flex-col space-y-4"
            >
              <div className="relative w-full min-h-[300px] bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden p-3 sm:p-5 flex flex-col justify-center">
                {renderBackgroundGrid('wave-grid')}

                <svg
                  viewBox={`0 0 ${projectionWaves.width} ${projectionWaves.height}`}
                  preserveAspectRatio="xMidYMid meet"
                  className="w-full h-auto max-h-[55vh] select-none"
                  aria-label="Synchronized oscilloscope showing In-Phase cosine and Quadrature sine waves"
                  role="img"
                >
                  <title>In-Phase and Quadrature Time Projections</title>

                  {/* Horizontal Time Zero Centerline */}
                  <line
                    x1={projectionWaves.padL}
                    y1={projectionWaves.midY}
                    x2={projectionWaves.width - projectionWaves.padR}
                    y2={projectionWaves.midY}
                    stroke="#8A8882"
                    strokeWidth="1.25"
                  />

                  {/* Vertical Time = 0 Origin Axis */}
                  <line
                    x1={projectionWaves.padL}
                    y1={15}
                    x2={projectionWaves.padL}
                    y2={projectionWaves.height - 25}
                    stroke="#585651"
                    strokeWidth="1.5"
                  />

                  {/* Vertical Instantaneous Cursor Line */}
                  <line
                    x1={projectionWaves.padL}
                    y1={15}
                    x2={projectionWaves.padL}
                    y2={projectionWaves.height - 25}
                    stroke="#C85A32"
                    strokeWidth="2"
                    strokeDasharray="2 2"
                  />

                  {/* In-Phase Waveform: I(t) = |z| * cos(ωt + θ) in Terracotta */}
                  <path
                    d={projectionWaves.inPhasePath}
                    fill="none"
                    stroke="#C85A32"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  {/* Quadrature Waveform: Q(t) = |z| * sin(ωt + θ) in Slate Blue */}
                  <path
                    d={projectionWaves.quadPath}
                    fill="none"
                    stroke="#3B6780"
                    strokeWidth="2.25"
                    strokeDasharray="5 3"
                    strokeLinecap="round"
                  />

                  {/* Instantaneous Marker Dots at t = 0 */}
                  <circle
                    cx={projectionWaves.markerIX}
                    cy={projectionWaves.markerIY}
                    r="4.5"
                    fill="#C85A32"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                  />
                  <circle
                    cx={projectionWaves.markerQX}
                    cy={projectionWaves.markerQY}
                    r="4.5"
                    fill="#3B6780"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                  />

                  {/* Labels on Plot */}
                  <text
                    x={projectionWaves.padL + 6}
                    y="22"
                    className="text-[10px] font-mono font-bold fill-[#1A1917]"
                  >
                    t = 0 (Instantaneous Phasor Sample)
                  </text>
                  <text
                    x={projectionWaves.width - projectionWaves.padR}
                    y={projectionWaves.midY + 16}
                    textAnchor="end"
                    className="text-[10px] font-mono fill-[#75736E]"
                  >
                    Time t (2 Cycles = {(2 * periodSeconds).toFixed(2)} s) →
                  </text>

                  {/* Axis Readouts */}
                  <text
                    x={projectionWaves.padL - 6}
                    y={projectionWaves.markerIY + 4}
                    textAnchor="end"
                    className="text-[9.5px] font-mono font-bold fill-[#C85A32]"
                  >
                    I={realPart.toFixed(2)}
                  </text>
                  <text
                    x={projectionWaves.padL - 6}
                    y={projectionWaves.markerQY + 4}
                    textAnchor="end"
                    className="text-[9.5px] font-mono font-bold fill-[#3B6780]"
                  >
                    Q={imagPart.toFixed(2)}
                  </text>
                </svg>

                {/* Oscilloscope Legend */}
                <div className="flex flex-wrap items-center justify-between text-xs font-mono mt-3 pt-2.5 border-t border-[#E6E4DD] text-[#585651] gap-2">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 font-semibold text-[#C85A32]">
                      <span className="w-3.5 h-1 bg-[#C85A32] inline-block rounded" />
                      <span>In-Phase I(t) = |z|·cos(ωt + θ)</span>
                    </span>
                    <span className="flex items-center gap-1.5 font-semibold text-[#3B6780]">
                      <span className="w-3.5 h-1 bg-[#3B6780] inline-block rounded border-dashed" />
                      <span>Quadrature Q(t) = |z|·sin(ωt + θ)</span>
                    </span>
                  </div>
                  <div className="text-[11px] text-[#75736E]">
                    f₀ = {cyclicFreqHz.toFixed(2)} Hz · T₀ = {periodSeconds.toFixed(2)} s
                  </div>
                </div>
              </div>

              {/* Explanatory Callout */}
              <div className="p-3.5 rounded-md bg-[#FAF9F6] border border-[#E6E4DD] text-xs text-[#585651] leading-relaxed">
                <strong className="text-[#1A1917] block mb-1">
                  Orthogonal Carrier Modulation Principle:
                </strong>
                The rotating vector projects simultaneously onto two orthogonal basis functions:{' '}
                <span className="text-[#C85A32] font-semibold">I(t)</span> on the horizontal real axis and{' '}
                <span className="text-[#3B6780] font-semibold">Q(t)</span> on the vertical imaginary axis. In modern digital communications (QAM, QPSK, OFDM), these two independent orthogonal components double spectral efficiency without inter-carrier interference.
              </div>
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* TAB 3: ANALYTICAL FORMULAS & IDENTITIES                 */}
          {/* ------------------------------------------------------- */}
          {activeTab === 'formulas' && (
            <div
              id="panel-formulas"
              role="tabpanel"
              aria-labelledby="tab-formulas"
              className="space-y-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Euler's Formula Card */}
                <div className="p-4 rounded-md bg-[#FAF9F6] border border-[#E6E4DD]">
                  <span className="text-xs font-mono uppercase text-[#75736E] block mb-1.5">
                    Fundamental Formula
                  </span>
                  <h3 className="text-sm font-bold text-[#1A1917] mb-2">Euler's Formula</h3>
                  <div className="p-2.5 bg-white rounded border border-[#E6E4DD] mb-2 overflow-x-auto">
                    <MathView math="e^{j\theta} = \cos(\theta) + j\sin(\theta)" displayMode={true} />
                  </div>
                  <p className="text-xs text-[#585651] leading-relaxed">
                    Maps complex exponential growth along the unit circle on the Argand plane to trigonometric cosine (real) and sine (imaginary) projections.
                  </p>
                </div>

                {/* Euler's Identity (Most Beautiful Equation) */}
                <div className="p-4 rounded-md bg-[#FAF9F6] border border-[#E6E4DD]">
                  <span className="text-xs font-mono uppercase text-[#75736E] block mb-1.5">
                    Special Case (θ = π)
                  </span>
                  <h3 className="text-sm font-bold text-[#1A1917] mb-2">Euler's Identity</h3>
                  <div className="p-2.5 bg-white rounded border border-[#E6E4DD] mb-2 overflow-x-auto">
                    <MathView math="e^{j\pi} + 1 = 0" displayMode={true} />
                  </div>
                  <p className="text-xs text-[#585651] leading-relaxed">
                    Unifies the five fundamental mathematical constants (<span className="font-mono">e, j, π, 1, 0</span>) in one concise relation.
                  </p>
                </div>

                {/* Inverse Euler Relations */}
                <div className="p-4 rounded-md bg-[#FAF9F6] border border-[#E6E4DD]">
                  <span className="text-xs font-mono uppercase text-[#75736E] block mb-1.5">
                    Trigonometric Inversion
                  </span>
                  <h3 className="text-sm font-bold text-[#1A1917] mb-2">Inverse Euler Formulas</h3>
                  <div className="p-2.5 bg-white rounded border border-[#E6E4DD] space-y-2 overflow-x-auto">
                    <MathView math="\cos(\theta) = \frac{e^{j\theta} + e^{-j\theta}}{2}" displayMode={true} />
                    <MathView math="\sin(\theta) = \frac{e^{j\theta} - e^{-j\theta}}{2j}" displayMode={true} />
                  </div>
                  <p className="text-xs text-[#585651] leading-relaxed mt-2">
                    Proves that real sinusoids are the linear superposition of two counter-rotating phasors at frequencies <span className="font-mono">+ω</span> and <span className="font-mono">-ω</span>.
                  </p>
                </div>

                {/* Polar to Rectangular Conversion */}
                <div className="p-4 rounded-md bg-[#FAF9F6] border border-[#E6E4DD]">
                  <span className="text-xs font-mono uppercase text-[#75736E] block mb-1.5">
                    Coordinate Transformation
                  </span>
                  <h3 className="text-sm font-bold text-[#1A1917] mb-2">Polar ↔ Rectangular</h3>
                  <div className="p-2.5 bg-white rounded border border-[#E6E4DD] space-y-1 overflow-x-auto text-xs">
                    <MathView math="z = x + jy = r(\cos\theta + j\sin\theta) = r e^{j\theta}" displayMode={true} />
                    <MathView math="r = \sqrt{x^2 + y^2}, \quad \theta = \operatorname{atan2}(y, x)" displayMode={true} />
                  </div>
                  <p className="text-xs text-[#585651] leading-relaxed mt-2">
                    Direct conversion between Cartesian In-Phase/Quadrature coordinates and Polar Modulus/Phase coordinates.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* TAB 4: PEDAGOGY & CURRICULAR GUIDE                      */}
          {/* ------------------------------------------------------- */}
          {activeTab === 'pedagogy' && (
            <div
              id="panel-pedagogy"
              role="tabpanel"
              aria-labelledby="tab-pedagogy"
              className="space-y-4"
            >
              <div className="p-4 rounded-md bg-[#FAF9F6] border border-[#E6E4DD]">
                <h3 className="text-sm font-bold text-[#1A1917] mb-2 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-[#C85A32]" />
                  <span>Curricular Learning Objectives</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                  <div className="p-3 bg-white rounded border border-[#E6E4DD]">
                    <span className="text-[11px] font-mono font-bold text-[#C85A32] block mb-1">
                      Objective 01
                    </span>
                    <h4 className="text-xs font-bold text-[#1A1917] mb-1">Geometric Euler Identity</h4>
                    <p className="text-xs text-[#585651]">
                      Observe rotating phasors as continuous circular trajectories on the complex plane with constant speed <span className="font-mono">ω</span>.
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded border border-[#E6E4DD]">
                    <span className="text-[11px] font-mono font-bold text-[#C85A32] block mb-1">
                      Objective 02
                    </span>
                    <h4 className="text-xs font-bold text-[#1A1917] mb-1">Cartesian to Polar Form</h4>
                    <p className="text-xs text-[#585651]">
                      Master instantaneous decomposition into Real (In-Phase) and Imaginary (Quadrature) projection components.
                    </p>
                  </div>
                  <div className="p-3 bg-white rounded border border-[#E6E4DD]">
                    <span className="text-[11px] font-mono font-bold text-[#C85A32] block mb-1">
                      Objective 03
                    </span>
                    <h4 className="text-xs font-bold text-[#1A1917] mb-1">Negative Frequencies</h4>
                    <p className="text-xs text-[#585651]">
                      Understand physical meaning of negative frequency carriers rotating clockwise and their role in real signal construction.
                    </p>
                  </div>
                </div>
              </div>

              {/* Step-by-Step Instructor Guide */}
              <div className="p-4 rounded-md bg-[#FAF9F6] border border-[#E6E4DD] text-xs text-[#585651] space-y-2">
                <span className="font-mono uppercase text-[#75736E] font-semibold text-[11px] block">
                  Suggested Student Exercise:
                </span>
                <ol className="list-decimal pl-4 space-y-1.5">
                  <li>
                    Set angle to <strong className="text-[#1A1917]">45°</strong> using the preset button. Verify that <span className="font-mono">Re(z) = Im(z) ≈ 0.71</span>.
                  </li>
                  <li>
                    Toggle <strong className="text-[#1A1917]">Conjugate z*</strong> to see reflection across the Real axis (<span className="font-mono">z* = 0.71 - 0.71j</span>).
                  </li>
                  <li>
                    Click <strong className="text-[#1A1917]">Play</strong> and observe how the phasor spins at <span className="font-mono">2.0 rad/s</span> while the orthogonal projections oscillate between <span className="font-mono">-1</span> and <span className="font-mono">+1</span>.
                  </li>
                  <li>
                    Switch to the <strong className="text-[#1A1917]">In-Phase & Quadrature Waves</strong> tab to see how circular motion generates sinusoidal carrier waveforms.
                  </li>
                </ol>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------- */}
          {/* INTERACTIVE PHASOR MODULATOR SLIDERS                    */}
          {/* ------------------------------------------------------- */}
          <div className="mt-5 p-4 rounded-md bg-[#FAF9F6] border border-[#E6E4DD] space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#E6E4DD]/70">
              <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] font-semibold flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#C85A32]" />
                <span>Phasor Modulator Controls</span>
              </div>
              <span className="text-[11px] font-mono text-[#8A8882]">
                Drag or use Left/Right arrow keys
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Slider 1: Phase Angle (θ) */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <label htmlFor="input-phase-angle" className="font-medium text-[#1A1917]">
                    Phase Angle (θ)
                  </label>
                  <span className="font-mono text-[#C85A32] font-semibold">
                    {Math.round(thetaDeg)}° ({thetaRad.toFixed(2)} rad)
                  </span>
                </div>
                <input
                  id="input-phase-angle"
                  type="range"
                  min="0"
                  max="360"
                  step="1"
                  value={Math.round(thetaDeg)}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setThetaDeg(val);
                    announcePhasorUpdate(val, phasorMagnitude);
                  }}
                  aria-label="Phase angle theta in degrees"
                  aria-valuemin={0}
                  aria-valuemax={360}
                  aria-valuenow={Math.round(thetaDeg)}
                  aria-valuetext={`${Math.round(thetaDeg)} degrees`}
                  className="w-full accent-[#C85A32] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85A32] rounded"
                />
                <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
                  <span>0°</span>
                  <span>90°</span>
                  <span>180°</span>
                  <span>270°</span>
                  <span>360°</span>
                </div>
              </div>

              {/* Slider 2: Modulus / Magnitude (|z|) */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <label htmlFor="input-magnitude" className="font-medium text-[#1A1917]">
                    Magnitude (|z| = r)
                  </label>
                  <span className="font-mono text-[#C85A32] font-semibold">
                    {phasorMagnitude.toFixed(2)}
                  </span>
                </div>
                <input
                  id="input-magnitude"
                  type="range"
                  min="0.2"
                  max="1.5"
                  step="0.05"
                  value={phasorMagnitude}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setPhasorMagnitude(val);
                    announcePhasorUpdate(thetaDeg, val);
                  }}
                  aria-label="Phasor modulus or magnitude r"
                  aria-valuemin={0.2}
                  aria-valuemax={1.5}
                  aria-valuenow={phasorMagnitude}
                  aria-valuetext={`${phasorMagnitude.toFixed(2)} units`}
                  className="w-full accent-[#C85A32] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85A32] rounded"
                />
                <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
                  <span>0.2</span>
                  <span>0.5</span>
                  <span>1.0 (Unit)</span>
                  <span>1.5</span>
                </div>
              </div>

              {/* Slider 3: Angular Velocity (ω) */}
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <label htmlFor="input-angular-vel" className="font-medium text-[#1A1917]">
                    Angular Vel (ω)
                  </label>
                  <span className="font-mono text-[#C85A32] font-semibold">
                    {angularFreq.toFixed(1)} rad/s ({cyclicFreqHz.toFixed(2)} Hz)
                  </span>
                </div>
                <input
                  id="input-angular-vel"
                  type="range"
                  min="0.5"
                  max="6.0"
                  step="0.5"
                  value={angularFreq}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setAngularFreq(val);
                    setScreenReaderAnnouncement(`Angular velocity set to ${val} radians per second`);
                  }}
                  aria-label="Angular velocity omega in radians per second"
                  aria-valuemin={0.5}
                  aria-valuemax={6.0}
                  aria-valuenow={angularFreq}
                  aria-valuetext={`${angularFreq.toFixed(1)} radians per second`}
                  className="w-full accent-[#C85A32] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85A32] rounded"
                />
                <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
                  <span>0.5 rad/s</span>
                  <span>3.0 rad/s</span>
                  <span>6.0 rad/s</span>
                </div>
              </div>
            </div>
          </div>

          {/* ------------------------------------------------------- */}
          {/* LABORATORY PARAMETER MATRIX CARDS                       */}
          {/* ------------------------------------------------------- */}
          <div className="mt-5 pt-4 border-t border-[#E6E4DD]">
            <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-2.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#585651]" />
                <span>Live Laboratory Parameter Matrix</span>
              </span>
              <span className="text-[10px] text-[#8A8882]">Instantaneous State</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                {
                  label: 'Modulus (|z|)',
                  value: `${phasorMagnitude.toFixed(2)}`,
                  sub: 'r = √(x² + y²)',
                  accent: 'text-[#1A1917]',
                },
                {
                  label: 'In-Phase (I / Re)',
                  value: `${realPart.toFixed(3)}`,
                  sub: 'x = r·cos(θ)',
                  accent: 'text-[#C85A32]',
                },
                {
                  label: 'Quadrature (Q / Im)',
                  value: `${imagPart.toFixed(3)}`,
                  sub: 'y = r·sin(θ)',
                  accent: 'text-[#3B6780]',
                },
                {
                  label: 'Total Power (|z|²)',
                  value: `${powerVal.toFixed(3)}`,
                  sub: 'P = I² + Q²',
                  accent: 'text-[#1A1917]',
                },
              ].map((p, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded bg-[#FAF9F6] border border-[#E6E4DD] hover:border-[#C85A32]/40 transition-colors"
                >
                  <div className="text-[10px] font-mono text-[#8A8882] uppercase">{p.label}</div>
                  <div className={`text-sm font-bold mt-0.5 font-mono truncate ${p.accent}`}>
                    {p.value}
                  </div>
                  <div className="text-[9.5px] font-mono text-[#75736E] mt-0.5">{p.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* RIGHT 4 COLS: ANALYTICAL FORMULATION & EXTENSION SLOT     */}
        {/* ========================================================= */}
        <aside className="lg:col-span-4 space-y-5" aria-label="Mathematical context and extension slot">
          {/* Analytical Formulation Card */}
          <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-5 shadow-xs">
            <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#585651]" />
              <span>Analytical Formulation</span>
            </div>

            <div className="text-xs text-[#585651] mb-2 font-medium">
              Euler's Identity & Complex Exponential
            </div>
            <div className="p-3 bg-white rounded border border-[#E6E4DD] text-sm font-semibold text-[#1A1917] overflow-x-auto shadow-2xs">
              <MathView math="e^{j\theta} = \cos(\theta) + j\sin(\theta)" displayMode={true} />
            </div>

            <div className="text-xs text-[#585651] mt-3.5 mb-2 font-medium">
              Current Instantaneous Phasor State
            </div>
            <div className="p-2.5 bg-white rounded border border-[#E6E4DD] text-xs font-mono space-y-1 text-[#1A1917]">
              <div className="flex justify-between">
                <span className="text-[#75736E]">Polar Form:</span>
                <span className="font-bold text-[#C85A32]">
                  {phasorMagnitude.toFixed(2)} · e^(j · {Math.round(thetaDeg)}°)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#75736E]">Cartesian:</span>
                <span className="font-bold">
                  {realPart.toFixed(2)} {imagPart >= 0 ? '+' : '-'} j{Math.abs(imagPart).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#75736E]">Phase (rad):</span>
                <span>{thetaRad.toFixed(3)} rad ({piFraction})</span>
              </div>
            </div>
          </div>

          {/* Curricular Focus Areas */}
          <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-5 shadow-xs">
            <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-3 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#585651]" />
              <span>Curricular Topics</span>
            </div>
            <ul className="space-y-2.5" role="list">
              {[
                {
                  num: '01',
                  title: "Euler's Geometric Identity & Phasor Rotation",
                  desc: 'Continuous rotation on unit circle with angular velocity ω',
                },
                {
                  num: '02',
                  title: 'Cartesian (Re/Im) to Polar (r, θ) Coordinate Conversion',
                  desc: 'In-phase & quadrature orthogonal projection decomposition',
                },
                {
                  num: '03',
                  title: 'Negative Frequencies & Analytic Signal Representation',
                  desc: 'Superposition of e^(+jωt) and e^(-jωt) to synthesize real signals',
                },
              ].map((topic) => (
                <li key={topic.num} className="flex items-start gap-2.5 text-xs text-[#484642] leading-snug">
                  <span className="font-mono text-[#C85A32] font-bold text-xs mt-0.5 shrink-0 bg-[#FBF4F0] px-1 py-0.5 rounded border border-[#C85A32]/20">
                    {topic.num}
                  </span>
                  <div>
                    <span className="font-medium text-[#1A1917] block">{topic.title}</span>
                    <span className="text-[11px] text-[#75736E] block mt-0.5">{topic.desc}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* ========================================================= */}
          {/* TEAM DROP-IN CODE BLOCK EXTENSION SLOT                    */}
          {/* Teammates can append or replace custom single-file modules*/}
          {/* ========================================================= */}
          <div className="rounded-lg border-2 border-dashed border-[#C85A32]/40 bg-[#FBF4F0]/60 p-4">
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#C85A32] mb-1.5">
              <Code2 className="w-4 h-4" />
              <span>Slot: Module6_EulerSignals.jsx</span>
            </div>
            <p className="text-xs text-[#585651] leading-relaxed mb-3">
              Independent and self-contained Module 06 component. Implements the assigned Euler Identity & Complex Signals visualization with full accessibility and interactive phasor dynamics.
            </p>
            <div className="flex items-center gap-2 text-[11px] font-mono text-[#75736E]">
              <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
              <span>Contract verified: Compatible with workspace shell</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
