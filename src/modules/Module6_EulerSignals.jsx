/**
 * Module 6: Euler's Identity & Complex Exponential Signals
 * Filename: Module6_EulerSignals.jsx
 *
 * Single-file interactive educational laboratory for:
 * 1. Euler's Identity (e^(jθ) = cos θ + j sin θ) on the Argand Complex Plane
 *    with orthographic Cos(θ) (downward) and Sin(θ) (rightward) waves springing
 *    directly out of the rotating phasor tip.
 * 2. Positive & Negative Frequency Superposition (e^(+jωt) and e^(-jωt))
 *    with imaginary cancellation waves and real cosine wave springing directly
 *    out of the counter-rotating vectors on the circle.
 * 3. Interactive 3D Complex Exponential Helix (Time × Real × Imaginary) with
 *    orbit drag, zoom, camera presets (Isometric, Circle, Cosine, Sine),
 *    wall shadow projections, and −ω counter-helix overlay.
 * 4. Fullscreen window with floating translucent sticky overlay controls.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Compass,
  Activity,
  Box,
  BookOpen,
  Layers,
  Info,
  HelpCircle,
  Play,
  Pause,
  RotateCcw,
  Minimize2,
  Grid as GridIcon,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Eye,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from 'lucide-react';
import { MathView } from '../components/MathView';
import { SimulationToolbar } from '../components/SimulationToolbar';
import { DraggableFullscreenControls } from '../components/DraggableFullscreenControls';

export default function Module6_EulerSignals({
  onNavigateHome,
  onNavigateModule,
}) {
  // ---------------------------------------------------------------------------
  // Primary Lab State
  // ---------------------------------------------------------------------------
  const [labMode, setLabMode] = useState('euler'); // 'euler' | 'counter-rotating' | '3d'
  const [playbackState, setPlaybackState] = useState('paused'); // 'playing' | 'paused'
  const [speed, setSpeed] = useState('1×');
  const [isGridVisible, setIsGridVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFsControlsCollapsed, setIsFsControlsCollapsed] = useState(true);

  // Core Signal Parameters
  const [thetaDeg, setThetaDeg] = useState(45); // 0 to 360 degrees
  const [amplitude, setAmplitude] = useState(1.0); // 0.2 to 1.5 (1.0 = Unit Circle)
  const [omega, setOmega] = useState(2.0); // 0.5 to 6.0 rad/s

  // Mode 1 (Euler's Identity) Overlays
  const [showProjections, setShowProjections] = useState(true);
  const [showUnitCircle, setShowUnitCircle] = useState(true);
  const [showConjugate, setShowConjugate] = useState(false);

  // Mode 2 (Positive & Negative Frequencies) View & Formula Toggles
  const [vectorViewMode, setVectorViewMode] = useState('both'); // 'both' | 'individual' | 'combined'
  const [synthesisTarget, setSynthesisTarget] = useState('cosine'); // 'cosine' | 'sine'
  const [showImWaves, setShowImWaves] = useState(true);

  // Mode 3 (3D Helix View) Camera & Projection Controls
  const [camYaw, setCamYaw] = useState(35); // 0..360 deg
  const [camPitch, setCamPitch] = useState(22); // -90..90 deg
  const [camZoom, setCamZoom] = useState(1.0); // 0.6..1.8x
  const [helixTurns, setHelixTurns] = useState(2.0); // 1.0..4.0 cycles
  const [show3DCosWall, setShow3DCosWall] = useState(true);
  const [show3DSinWall, setShow3DSinWall] = useState(true);
  const [show3DNegHelix, setShow3DNegHelix] = useState(false);
  const [show3DAxesBox, setShow3DAxesBox] = useState(true);

  // Interactive Dragging on 2D Argand Plane
  const [isDraggingPhasor, setIsDraggingPhasor] = useState(false);
  const eulerSvgRef = useRef(null);

  // 3D Canvas & Orbit Dragging Refs
  const canvas3DRef = useRef(null);
  const canvas3DFsRef = useRef(null);
  const isDragging3DRef = useRef(false);
  const drag3DStartRef = useRef({ x: 0, y: 0, yaw: 35, pitch: 22 });

  // Accessibility live region
  const [announcement, setAnnouncement] = useState('');

  // Animation loop refs
  const animFrameRef = useRef(null);
  const lastTimeRef = useRef(0);

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

  // Smooth 60fps Rotation Loop
  useEffect(() => {
    if (playbackState !== 'playing') {
      lastTimeRef.current = 0;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const motionScale = prefersReducedMotion ? 0.25 : 1.0;

    const tick = (timestamp) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const dt = Math.min(0.05, (timestamp - lastTimeRef.current) / 1000);
      lastTimeRef.current = timestamp;

      const deltaDeg = omega * (180 / Math.PI) * dt * speedMultiplier * motionScale;
      setThetaDeg((prev) => {
        const next = (prev + deltaDeg) % 360;
        return next < 0 ? next + 360 : next;
      });

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [playbackState, omega, speedMultiplier]);

  // Keyboard shortcuts: P = Play, H = Pause, Esc = Exit Fullscreen
  useEffect(() => {
    const onKeyDown = (e) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        setPlaybackState('playing');
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        setPlaybackState('paused');
      } else if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isFullscreen]);

  // Reset handler
  const handleReset = useCallback(() => {
    setPlaybackState('paused');
    setThetaDeg(45);
    setAmplitude(1.0);
    setOmega(2.0);
    setAnnouncement('Reset phasor to 45 degrees, amplitude 1.0, angular velocity 2.0 radians per second.');
  }, []);

  const handleResetCamera = useCallback(() => {
    setCamYaw(35);
    setCamPitch(22);
    setCamZoom(1.0);
    setHelixTurns(2.0);
  }, []);

  // ---------------------------------------------------------------------------
  // Derived Complex & Trigonometric Values
  // ---------------------------------------------------------------------------
  const thetaRad = useMemo(() => (thetaDeg * Math.PI) / 180, [thetaDeg]);
  const cosVal = useMemo(() => Math.cos(thetaRad), [thetaRad]);
  const sinVal = useMemo(() => Math.sin(thetaRad), [thetaRad]);
  const realPart = useMemo(() => amplitude * cosVal, [amplitude, cosVal]);
  const imagPart = useMemo(() => amplitude * sinVal, [amplitude, sinVal]);
  const freqHz = useMemo(() => omega / (2 * Math.PI), [omega]);
  const periodSec = useMemo(() => 1 / (freqHz || 0.001), [freqHz]);
  const equivalentTimeSec = useMemo(() => thetaRad / (omega || 1), [thetaRad, omega]);

  const piFractionLatex = useMemo(() => {
    const deg = ((Math.round(thetaDeg) % 360) + 360) % 360;
    const map = {
      0: '0',
      30: '\\frac{\\pi}{6}',
      45: '\\frac{\\pi}{4}',
      60: '\\frac{\\pi}{3}',
      90: '\\frac{\\pi}{2}',
      120: '\\frac{2\\pi}{3}',
      135: '\\frac{3\\pi}{4}',
      150: '\\frac{5\\pi}{6}',
      180: '\\pi',
      210: '\\frac{7\\pi}{6}',
      225: '\\frac{5\\pi}{4}',
      240: '\\frac{4\\pi}{3}',
      270: '\\frac{3\\pi}{2}',
      300: '\\frac{5\\pi}{3}',
      315: '\\frac{7\\pi}{4}',
      330: '\\frac{11\\pi}{6}',
      360: '2\\pi',
    };
    return map[deg] ?? `${(thetaRad / Math.PI).toFixed(2)}\\pi`;
  }, [thetaDeg, thetaRad]);

  // Beginner-friendly live insight
  const beginnerInsight = useMemo(() => {
    const rounded = Math.round(thetaDeg) % 360;
    if (labMode === '3d') {
      if (show3DNegHelix) {
        return `3D ±ω Superposition: Two counter-rotating half-amplitude helices (${amplitude.toFixed(1)}/2)·e^(+jωt) and (${amplitude.toFixed(1)}/2)·e^(−jωt) cancel along Im = 0 (dashed rungs) to leave the pure real ${synthesisTarget === 'cosine' ? 'cos(ωt)' : 'sin(ωt)'} wave in green.`;
      }
      return `In 3D space (Time × Real × Imaginary), e^(jωt) forms a circular helix. Viewing from the Front collapses it into the 2D circle; viewing from the Top reveals cos(ωt); viewing from the Side reveals sin(ωt).`;
    }
    if (labMode === 'euler') {
      if (rounded === 0) {
        return 'At θ = 0°, the phasor lies completely on the positive Real axis: cos(0°) = +1 and sin(0°) = 0.';
      }
      if (Math.abs(rounded - 90) <= 2) {
        return 'At θ = 90° (π/2 rad), the phasor points straight up along +j: the Real part vanishes (cos 90° = 0) and the signal is purely imaginary (+j).';
      }
      if (Math.abs(rounded - 180) <= 2) {
        return "Euler's Identity Milestone: At θ = 180° (π rad), e^(jπ) = −1 + j0, which rearranges directly to e^(jπ) + 1 = 0.";
      }
      if (Math.abs(rounded - 270) <= 2) {
        return 'At θ = 270° (3π/2 rad), the phasor points straight down along −j: cos(270°) = 0 and sin(270°) = −1.';
      }
      return `Watch the dashed beams shoot out of the rotating phasor tip: the horizontal beam traces sin(θ) = ${sinVal.toFixed(2)} to the right, while the vertical beam drops cos(θ) = ${cosVal.toFixed(2)} straight down.`;
    }

    if (synthesisTarget === 'cosine') {
      return `The +ω vector (${(0.5 * realPart).toFixed(2)} + j${(0.5 * imagPart).toFixed(2)}) and −ω vector (${(0.5 * realPart).toFixed(2)} − j${(0.5 * imagPart).toFixed(2)}) project equal and opposite ±Im waves to the right (canceling to 0), while their combined sum drops straight down into ${realPart.toFixed(3)} = r·cos(ωt).`;
    }
    return `For sin(ωt) = (e^(+jωt) − e^(−jωt)) / (2j), the ±Im components still cancel horizontally to 0 while the combined real wave streams downward as ${imagPart.toFixed(3)} = r·sin(ωt).`;
  }, [thetaDeg, labMode, cosVal, sinVal, realPart, imagPart, synthesisTarget]);

  // ---------------------------------------------------------------------------
  // Mode 1 Geometry: Orthographic Circle -> Sin(θ) Rightward & Cos(θ) Downward
  // ---------------------------------------------------------------------------
  const eulerGeometry = useMemo(() => {
    const svgW = 920;
    const svgH = 510;
    const divX = 362;
    const divY = 312;

    const cx = 186;
    const cy = 166;
    const scale = 92; // 1.0 unit = 92px (max 1.5 -> 138px)

    const tipX = cx + realPart * scale;
    const tipY = cy - imagPart * scale;
    const conjY = cy + imagPart * scale;

    const arcR = 30;
    const arcEndX = cx + arcR * cosVal;
    const arcEndY = cy - arcR * sinVal;
    const largeArc = thetaDeg > 180 ? 1 : 0;
    const angleArcPath =
      thetaDeg > 1 && thetaDeg < 359
        ? `M ${cx} ${cy} L ${cx + arcR} ${cy} A ${arcR} ${arcR} 0 ${largeArc} 0 ${arcEndX.toFixed(1)} ${arcEndY.toFixed(1)} Z`
        : '';

    const sinWaveX0 = 382;
    const sinWaveW = 514;
    const cosWaveY0 = 342;
    const cosWaveH = 152;

    const samples = 140;
    let sinUnrollPath = '';
    let cosUnrollPath = '';

    for (let i = 0; i <= samples; i++) {
      const frac = i / samples;
      const lagRad = frac * 2 * Math.PI;
      const angleAtPoint = thetaRad - lagRad;

      const sx = sinWaveX0 + frac * sinWaveW;
      const sy = cy - amplitude * Math.sin(angleAtPoint) * scale;
      sinUnrollPath += `${i === 0 ? 'M' : 'L'} ${sx.toFixed(1)} ${sy.toFixed(1)} `;

      const cyPos = cosWaveY0 + frac * cosWaveH;
      const cxPos = cx + amplitude * Math.cos(angleAtPoint) * scale;
      cosUnrollPath += `${i === 0 ? 'M' : 'L'} ${cxPos.toFixed(1)} ${cyPos.toFixed(1)} `;
    }

    return {
      svgW,
      svgH,
      divX,
      divY,
      cx,
      cy,
      scale,
      tipX,
      tipY,
      conjY,
      angleArcPath,
      sinWaveX0,
      sinWaveW,
      cosWaveY0,
      cosWaveH,
      sinUnrollPath,
      cosUnrollPath,
    };
  }, [realPart, imagPart, cosVal, sinVal, thetaDeg, thetaRad, amplitude]);

  // Interactive Pointer Dragging on the Argand Circle
  const updatePhasorFromPointer = useCallback(
    (clientX, clientY, lockMagnitude = false) => {
      const svg = eulerSvgRef.current;
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;

      const svgX = ((clientX - rect.left) / rect.width) * eulerGeometry.svgW;
      const svgY = ((clientY - rect.top) / rect.height) * eulerGeometry.svgH;

      const dx = svgX - eulerGeometry.cx;
      const dy = eulerGeometry.cy - svgY;

      let deg = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (deg < 0) deg += 360;
      setThetaDeg(deg);

      if (!lockMagnitude) {
        const rawR = Math.hypot(dx, dy) / eulerGeometry.scale;
        const clampedR = Math.min(1.5, Math.max(0.2, Math.round(rawR * 20) / 20));
        setAmplitude(clampedR);
      }
    },
    [eulerGeometry.svgW, eulerGeometry.svgH, eulerGeometry.cx, eulerGeometry.cy, eulerGeometry.scale]
  );

  useEffect(() => {
    if (!isDraggingPhasor) return;
    const handleMove = (e) => {
      updatePhasorFromPointer(e.clientX, e.clientY, e.shiftKey);
    };
    const handleUp = () => setIsDraggingPhasor(false);
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [isDraggingPhasor, updatePhasorFromPointer]);

  // ---------------------------------------------------------------------------
  // Mode 2 Geometry: Counter-Rotating Vectors (±ω) Springing Out of Circle
  // ---------------------------------------------------------------------------
  const counterGeometry = useMemo(() => {
    const svgW = 920;
    const svgH = 510;
    const divX = 362;
    const divY = 312;

    // Top-Left Quadrant: Same circle geometry as Mode 1
    const cx = 186;
    const cy = 166;
    const scale = 92;

    const halfA = amplitude * 0.5;
    let vpRe, vpIm, vmRe, vmIm;
    if (synthesisTarget === 'cosine') {
      vpRe = halfA * cosVal;
      vpIm = halfA * sinVal;
      vmRe = halfA * cosVal;
      vmIm = -halfA * sinVal;
    } else {
      vpRe = halfA * sinVal;
      vpIm = -halfA * cosVal;
      vmRe = halfA * sinVal;
      vmIm = halfA * cosVal;
    }

    const sumRe = vpRe + vmRe;
    const sumIm = vpIm + vmIm; // Always 0

    const vpX = cx + vpRe * scale;
    const vpY = cy - vpIm * scale;
    const vmX = cx + vmRe * scale;
    const vmY = cy - vmIm * scale;
    const sumX = cx + sumRe * scale;
    const sumY = cy - sumIm * scale;

    // Top-Right Quadrant: ±Im Cancellation Waves unrolling horizontally out of vpY & vmY
    const rightWaveX0 = 382;
    const rightWaveW = 514;

    // Bottom-Left Quadrant: Combined Pure Real Wave unrolling vertically downward out of sumX
    const downWaveY0 = 342;
    const downWaveH = 152;

    const samples = 140;
    let posImUnrollPath = '';
    let negImUnrollPath = '';
    let sumRealUnrollPath = '';
    let halfRealUnrollPath = '';

    for (let i = 0; i <= samples; i++) {
      const frac = i / samples;
      const lagRad = frac * 2 * Math.PI;
      const angle = thetaRad - lagRad;

      const imPosVal =
        synthesisTarget === 'cosine' ? halfA * Math.sin(angle) : -halfA * Math.cos(angle);
      const imNegVal = -imPosVal;
      const realSumVal =
        synthesisTarget === 'cosine' ? amplitude * Math.cos(angle) : amplitude * Math.sin(angle);
      const realHalfVal = realSumVal * 0.5;

      // Rightward imaginary cancellation traces (exact Y alignment with vpY and vmY!)
      const sx = rightWaveX0 + frac * rightWaveW;
      const syPos = cy - imPosVal * scale;
      const syNeg = cy - imNegVal * scale;
      posImUnrollPath += `${i === 0 ? 'M' : 'L'} ${sx.toFixed(1)} ${syPos.toFixed(1)} `;
      negImUnrollPath += `${i === 0 ? 'M' : 'L'} ${sx.toFixed(1)} ${syNeg.toFixed(1)} `;

      // Downward real sum trace (exact X alignment with sumX and vpX!)
      const cyPos = downWaveY0 + frac * downWaveH;
      const cxSum = cx + realSumVal * scale;
      const cxHalf = cx + realHalfVal * scale;
      sumRealUnrollPath += `${i === 0 ? 'M' : 'L'} ${cxSum.toFixed(1)} ${cyPos.toFixed(1)} `;
      halfRealUnrollPath += `${i === 0 ? 'M' : 'L'} ${cxHalf.toFixed(1)} ${cyPos.toFixed(1)} `;
    }

    // Bottom-Right Quadrant: Two-Sided Frequency Spectrum (-f0 and +f0)
    const specX0 = 382;
    const specW = 514;
    const specMidX = specX0 + specW / 2;
    const specBaseY = 466;
    const specMaxH = 74;
    const stemOffset = 42 + (omega / 6.0) * 168;
    const stemHeight = (halfA / 0.75) * specMaxH;

    return {
      svgW,
      svgH,
      divX,
      divY,
      cx,
      cy,
      scale,
      halfA,
      vpRe,
      vpIm,
      vmRe,
      vmIm,
      sumRe,
      sumIm,
      vpX,
      vpY,
      vmX,
      vmY,
      sumX,
      sumY,
      rightWaveX0,
      rightWaveW,
      downWaveY0,
      downWaveH,
      posImUnrollPath,
      negImUnrollPath,
      sumRealUnrollPath,
      halfRealUnrollPath,
      specX0,
      specW,
      specMidX,
      specBaseY,
      stemOffset,
      stemHeight,
    };
  }, [amplitude, cosVal, sinVal, thetaRad, omega, synthesisTarget]);

  // ---------------------------------------------------------------------------
  // Mode 3: 3D Complex Exponential Helix Canvas Renderer (Auto-Fit & Dual Mode)
  // ---------------------------------------------------------------------------
  const draw3DScene = useCallback(
    (canvas, inFs = false) => {
      if (!canvas) return;
      const parent = canvas.parentElement;
      if (!parent) return;

      const dpr = window.devicePixelRatio || 1;
      const width = parent.clientWidth;
      const height = parent.clientHeight;
      if (width <= 0 || height <= 0) return;

      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      // Subtle engineering grid in 3D backdrop if enabled
      if (isGridVisible) {
        ctx.strokeStyle = '#ECEAE1';
        ctx.lineWidth = 1;
        for (let gx = 0; gx < width; gx += 32) {
          ctx.beginPath();
          ctx.moveTo(gx, 0);
          ctx.lineTo(gx, height);
          ctx.stroke();
        }
        for (let gy = 0; gy < height; gy += 32) {
          ctx.beginPath();
          ctx.moveTo(0, gy);
          ctx.lineTo(width, gy);
          ctx.stroke();
        }
      }

      // 3D -> 2D orthographic rotation
      const yawRad = (camYaw * Math.PI) / 180;
      const pitchRad = (camPitch * Math.PI) / 180;
      const cosY = Math.cos(yawRad);
      const sinY = Math.sin(yawRad);
      const cosP = Math.cos(pitchRad);
      const sinP = Math.sin(pitchRad);

      // Tightened wall extent so planes snugly hug the circle & waves (no oversized empty walls)
      const wallExtent = Math.max(1.1, amplitude * 1.06);

      // Safe unobstructed drawing rect (reserves room below for floating sticky bar in fullscreen)
      const padX = Math.max(24, width * 0.035);
      const topSafe = 16;
      const bottomSafe = inFs
        ? isFsControlsCollapsed
          ? Math.min(height * 0.32, 124)
          : Math.min(height * 0.48, 246)
        : 14;
      const availW = Math.max(120, width - padX * 2);
      const availH = Math.max(120, height - topSafe - bottomSafe);
      const aspect = availW / availH;

      // Expand time axis on wider viewports so the 3D helix uses horizontal space efficiently
      const tHalf = aspect > 1.7 ? 2.15 : aspect > 1.3 ? 1.8 : 1.45;
      const tFront = -tHalf;
      const tBack = tHalf;

      const unitProj = (x3, y3, z3) => {
        const rx = x3 * cosY - y3 * sinY;
        const ry = x3 * sinY + y3 * cosY;
        const ry2 = ry * sinP + z3 * cosP;
        return {
          px: rx,
          py: -ry2,
          depth: ry * cosP - z3 * sinP,
        };
      };

      // Exact 8-corner bounding box auto-fit so circle & helix fill unobstructed screen
      let minPx = Infinity;
      let maxPx = -Infinity;
      let minPy = Infinity;
      let maxPy = -Infinity;
      const xBounds = [tFront - 0.14, tBack + 0.34];
      const yzBounds = [-wallExtent, wallExtent];
      for (const xb of xBounds) {
        for (const yb of yzBounds) {
          for (const zb of yzBounds) {
            const u = unitProj(xb, yb, zb);
            if (u.px < minPx) minPx = u.px;
            if (u.px > maxPx) maxPx = u.px;
            if (u.py < minPy) minPy = u.py;
            if (u.py > maxPy) maxPy = u.py;
          }
        }
      }

      const spanX = Math.max(0.5, maxPx - minPx);
      const spanY = Math.max(0.5, maxPy - minPy);
      const baseScale = Math.min(availW / spanX, availH / spanY) * 0.96 * camZoom;
      const centerX = padX + availW * 0.5 - ((minPx + maxPx) * 0.5) * baseScale;
      const centerY = topSafe + availH * 0.5 - ((minPy + maxPy) * 0.5) * baseScale;

      const project = (x3, y3, z3) => {
        const u = unitProj(x3, y3, z3);
        return {
          x: centerX + u.px * baseScale,
          y: centerY + u.py * baseScale,
          depth: u.depth,
        };
      };

      // 1. Optional 3D Coordinate Frame & Compact Floor/Wall Projection Planes
      if (show3DAxesBox) {
        // Floor plane (Cosine projection plane at z3 = -wallExtent)
        const f1 = project(tFront, -wallExtent, -wallExtent);
        const f2 = project(tBack, -wallExtent, -wallExtent);
        const f3 = project(tBack, wallExtent, -wallExtent);
        const f4 = project(tFront, wallExtent, -wallExtent);
        ctx.fillStyle = 'rgba(200, 90, 50, 0.045)';
        ctx.beginPath();
        ctx.moveTo(f1.x, f1.y);
        ctx.lineTo(f2.x, f2.y);
        ctx.lineTo(f3.x, f3.y);
        ctx.lineTo(f4.x, f4.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(200, 90, 50, 0.28)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Back Wall plane (Sine / ±Im projection plane at y3 = -wallExtent)
        const w1 = project(tFront, -wallExtent, -wallExtent);
        const w2 = project(tBack, -wallExtent, -wallExtent);
        const w3 = project(tBack, -wallExtent, wallExtent);
        const w4 = project(tFront, -wallExtent, wallExtent);
        ctx.fillStyle = 'rgba(59, 103, 128, 0.045)';
        ctx.beginPath();
        ctx.moveTo(w1.x, w1.y);
        ctx.lineTo(w2.x, w2.y);
        ctx.lineTo(w3.x, w3.y);
        ctx.lineTo(w4.x, w4.y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(59, 103, 128, 0.28)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Central Time Axis (y3 = 0, z3 = 0)
        const tA = project(tFront - 0.1, 0, 0);
        const tB = project(tBack + 0.14, 0, 0);
        ctx.strokeStyle = '#8A8882';
        ctx.lineWidth = 1.25;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(tA.x, tA.y);
        ctx.lineTo(tB.x, tB.y);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#585651';
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.fillText('Time / Phase', tB.x + 5, tB.y + 4);
      }

      // 2. Front Complex Plane Unit Circle & Axes at x3 = tFront
      const reNeg = project(tFront, -wallExtent, 0);
      const rePos = project(tFront, wallExtent, 0);
      const imNeg = project(tFront, 0, -wallExtent);
      const imPos = project(tFront, 0, wallExtent);

      ctx.strokeStyle = '#585651';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(reNeg.x, reNeg.y);
      ctx.lineTo(rePos.x, rePos.y);
      ctx.moveTo(imNeg.x, imNeg.y);
      ctx.lineTo(imPos.x, imPos.y);
      ctx.stroke();

      ctx.fillStyle = '#1A1917';
      ctx.font = '700 11px "JetBrains Mono", monospace';
      ctx.fillText('+Re', rePos.x + 5, rePos.y + 3);
      ctx.fillText('+j·Im', imPos.x + 5, imPos.y - 4);

      // Outer reference circle of radius |z| = amplitude
      ctx.strokeStyle = show3DNegHelix ? 'rgba(138, 136, 130, 0.35)' : 'rgba(138, 136, 130, 0.6)';
      ctx.lineWidth = 1.3;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      for (let i = 0; i <= 72; i++) {
        const a = (i / 72) * 2 * Math.PI;
        const pt = project(tFront, amplitude * Math.cos(a), amplitude * Math.sin(a));
        if (i === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Inner half-amplitude orbit circle (r/2) when ±ω Superposition 3D mode is active
      const halfA = amplitude * 0.5;
      if (show3DNegHelix) {
        ctx.strokeStyle = 'rgba(138, 136, 130, 0.65)';
        ctx.lineWidth = 1.3;
        ctx.setLineDash([4, 3]);
        ctx.beginPath();
        for (let i = 0; i <= 72; i++) {
          const a = (i / 72) * 2 * Math.PI;
          const pt = project(tFront, halfA * Math.cos(a), halfA * Math.sin(a));
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 3. Sample Helices & Projections
      const steps = Math.round(110 * helixTurns);
      const totalRad = helixTurns * 2 * Math.PI;
      const origin3D = project(tFront, 0, 0);

      if (!show3DNegHelix) {
        // =====================================================================
        // 3D SUB-MODE A: EULER'S IDENTITY HELIX e^(+jωt)
        // =====================================================================
        if (show3DCosWall) {
          ctx.strokeStyle = '#C85A32';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          for (let i = 0; i <= steps; i++) {
            const frac = i / steps;
            const x3 = tFront + frac * (tBack - tFront);
            const ang = thetaRad - frac * totalRad;
            const pt = project(x3, amplitude * Math.cos(ang), -wallExtent);
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }
          ctx.stroke();

          const floorLabelPt = project(tBack, 0, -wallExtent);
          ctx.fillStyle = '#C85A32';
          ctx.font = '700 10.5px "JetBrains Mono", monospace';
          ctx.fillText('cos(ωt) Floor', floorLabelPt.x + 6, floorLabelPt.y + 12);
        }

        if (show3DSinWall) {
          ctx.strokeStyle = '#3B6780';
          ctx.lineWidth = 2.4;
          ctx.beginPath();
          for (let i = 0; i <= steps; i++) {
            const frac = i / steps;
            const x3 = tFront + frac * (tBack - tFront);
            const ang = thetaRad - frac * totalRad;
            const pt = project(x3, -wallExtent, amplitude * Math.sin(ang));
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }
          ctx.stroke();

          const wallLabelPt = project(tBack, -wallExtent, amplitude * 0.9);
          ctx.fillStyle = '#3B6780';
          ctx.font = '700 10.5px "JetBrains Mono", monospace';
          ctx.fillText('sin(ωt) Wall', wallLabelPt.x + 6, wallLabelPt.y - 6);
        }

        // Primary 3D Complex Helix e^(+jωt)
        ctx.strokeStyle = '#1A1917';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const frac = i / steps;
          const x3 = tFront + frac * (tBack - tFront);
          const ang = thetaRad - frac * totalRad;
          const pt = project(x3, amplitude * Math.cos(ang), amplitude * Math.sin(ang));
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();

        // Front Rotating Phasor & Drop-Lines
        const tip3D = project(tFront, realPart, imagPart);
        const floorDrop = project(tFront, realPart, -wallExtent);
        const wallDrop = project(tFront, -wallExtent, imagPart);

        if (show3DCosWall) {
          ctx.strokeStyle = '#C85A32';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.moveTo(tip3D.x, tip3D.y);
          ctx.lineTo(floorDrop.x, floorDrop.y);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = '#C85A32';
          ctx.beginPath();
          ctx.arc(floorDrop.x, floorDrop.y, 4.5, 0, 2 * Math.PI);
          ctx.fill();
        }

        if (show3DSinWall) {
          ctx.strokeStyle = '#3B6780';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          ctx.moveTo(tip3D.x, tip3D.y);
          ctx.lineTo(wallDrop.x, wallDrop.y);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = '#3B6780';
          ctx.beginPath();
          ctx.arc(wallDrop.x, wallDrop.y, 4.5, 0, 2 * Math.PI);
          ctx.fill();
        }

        ctx.strokeStyle = '#C85A32';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(origin3D.x, origin3D.y);
        ctx.lineTo(tip3D.x, tip3D.y);
        ctx.stroke();

        ctx.fillStyle = '#C85A32';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(tip3D.x, tip3D.y, 6.5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      } else {
        // =====================================================================
        // 3D SUB-MODE B: POSITIVE (+ω) & NEGATIVE (−ω) COUNTER-HELICES
        // =====================================================================
        const sampleAtAngle = (ang) => {
          if (synthesisTarget === 'cosine') {
            return {
              pRe: halfA * Math.cos(ang),
              pIm: halfA * Math.sin(ang),
              mRe: halfA * Math.cos(ang),
              mIm: -halfA * Math.sin(ang),
              sumRe: amplitude * Math.cos(ang),
            };
          }
          return {
            pRe: halfA * Math.sin(ang),
            pIm: -halfA * Math.cos(ang),
            mRe: halfA * Math.sin(ang),
            mIm: halfA * Math.cos(ang),
            sumRe: amplitude * Math.sin(ang),
          };
        };

        // Optional floor projection of combined Real Sum (z3 = -wallExtent)
        if (show3DCosWall) {
          ctx.strokeStyle = 'rgba(30, 123, 86, 0.55)';
          ctx.lineWidth = 2.0;
          ctx.setLineDash([4, 3]);
          ctx.beginPath();
          for (let i = 0; i <= steps; i++) {
            const frac = i / steps;
            const x3 = tFront + frac * (tBack - tFront);
            const s = sampleAtAngle(thetaRad - frac * totalRad);
            const pt = project(x3, s.sumRe, -wallExtent);
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Optional side-wall projection of cancelling ±Im components (y3 = -wallExtent)
        if (show3DSinWall) {
          ctx.strokeStyle = 'rgba(200, 90, 50, 0.45)';
          ctx.lineWidth = 1.6;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          for (let i = 0; i <= steps; i++) {
            const frac = i / steps;
            const x3 = tFront + frac * (tBack - tFront);
            const s = sampleAtAngle(thetaRad - frac * totalRad);
            const pt = project(x3, -wallExtent, s.pIm);
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }
          ctx.stroke();

          ctx.strokeStyle = 'rgba(59, 103, 128, 0.45)';
          ctx.beginPath();
          for (let i = 0; i <= steps; i++) {
            const frac = i / steps;
            const x3 = tFront + frac * (tBack - tFront);
            const s = sampleAtAngle(thetaRad - frac * totalRad);
            const pt = project(x3, -wallExtent, s.mIm);
            if (i === 0) ctx.moveTo(pt.x, pt.y);
            else ctx.lineTo(pt.x, pt.y);
          }
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Periodic cancellation cross-links between +ω and −ω helices across Im = 0
        const rungStride = Math.max(8, Math.round(steps / (14 * helixTurns)));
        ctx.strokeStyle = 'rgba(117, 115, 110, 0.35)';
        ctx.lineWidth = 1.0;
        ctx.setLineDash([2, 2]);
        for (let i = 0; i <= steps; i += rungStride) {
          const frac = i / steps;
          const x3 = tFront + frac * (tBack - tFront);
          const s = sampleAtAngle(thetaRad - frac * totalRad);
          const pA = project(x3, s.pRe, s.pIm);
          const pB = project(x3, s.mRe, s.mIm);
          ctx.beginPath();
          ctx.moveTo(pA.x, pA.y);
          ctx.lineTo(pB.x, pB.y);
          ctx.stroke();
        }
        ctx.setLineDash([]);

        // Negative frequency helix (A/2)·e^(-jωt)
        ctx.strokeStyle = '#3B6780';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const frac = i / steps;
          const x3 = tFront + frac * (tBack - tFront);
          const s = sampleAtAngle(thetaRad - frac * totalRad);
          const pt = project(x3, s.mRe, s.mIm);
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();

        // Positive frequency helix (A/2)·e^(+jωt)
        ctx.strokeStyle = '#C85A32';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const frac = i / steps;
          const x3 = tFront + frac * (tBack - tFront);
          const s = sampleAtAngle(thetaRad - frac * totalRad);
          const pt = project(x3, s.pRe, s.pIm);
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();

        // Combined Pure Real Sum Wave in the Im = 0 plane (z3 = 0)
        ctx.strokeStyle = '#1E7B56';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        for (let i = 0; i <= steps; i++) {
          const frac = i / steps;
          const x3 = tFront + frac * (tBack - tFront);
          const s = sampleAtAngle(thetaRad - frac * totalRad);
          const pt = project(x3, s.sumRe, 0);
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        }
        ctx.stroke();

        const sumLabelPt = project(tBack, 0, 0);
        ctx.fillStyle = '#1E7B56';
        ctx.font = '700 10.5px "JetBrains Mono", monospace';
        ctx.fillText(
          synthesisTarget === 'cosine' ? 'Real Sum cos(ωt)' : 'Real Sum sin(ωt)',
          sumLabelPt.x + 5,
          sumLabelPt.y - 8
        );

        // Front slice vectors (+ω, −ω, parallelogram, & Emerald Real Sum)
        const nowSample = sampleAtAngle(thetaRad);
        const vp3D = project(tFront, nowSample.pRe, nowSample.pIm);
        const vm3D = project(tFront, nowSample.mRe, nowSample.mIm);
        const sum3D = project(tFront, nowSample.sumRe, 0);

        // Parallelogram legs & cancellation line
        ctx.strokeStyle = 'rgba(117, 115, 110, 0.5)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(vp3D.x, vp3D.y);
        ctx.lineTo(vm3D.x, vm3D.y);
        ctx.moveTo(vp3D.x, vp3D.y);
        ctx.lineTo(sum3D.x, sum3D.y);
        ctx.moveTo(vm3D.x, vm3D.y);
        ctx.lineTo(sum3D.x, sum3D.y);
        ctx.stroke();
        ctx.setLineDash([]);

        if (show3DCosWall) {
          const floorDropSum = project(tFront, nowSample.sumRe, -wallExtent);
          ctx.strokeStyle = '#1E7B56';
          ctx.lineWidth = 1.3;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(sum3D.x, sum3D.y);
          ctx.lineTo(floorDropSum.x, floorDropSum.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // +ω front vector
        ctx.strokeStyle = '#C85A32';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(origin3D.x, origin3D.y);
        ctx.lineTo(vp3D.x, vp3D.y);
        ctx.stroke();
        ctx.fillStyle = '#C85A32';
        ctx.beginPath();
        ctx.arc(vp3D.x, vp3D.y, 4.5, 0, 2 * Math.PI);
        ctx.fill();

        // −ω front vector
        ctx.strokeStyle = '#3B6780';
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.moveTo(origin3D.x, origin3D.y);
        ctx.lineTo(vm3D.x, vm3D.y);
        ctx.stroke();
        ctx.fillStyle = '#3B6780';
        ctx.beginPath();
        ctx.arc(vm3D.x, vm3D.y, 4.5, 0, 2 * Math.PI);
        ctx.fill();

        // Combined Emerald Real Sum vector on Real axis
        ctx.strokeStyle = '#1E7B56';
        ctx.lineWidth = 3.6;
        ctx.beginPath();
        ctx.moveTo(origin3D.x, origin3D.y);
        ctx.lineTo(sum3D.x, sum3D.y);
        ctx.stroke();
        ctx.fillStyle = '#1E7B56';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sum3D.x, sum3D.y, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
      }

      ctx.restore();
    },
    [
      isGridVisible,
      camYaw,
      camPitch,
      camZoom,
      helixTurns,
      amplitude,
      thetaRad,
      realPart,
      imagPart,
      show3DCosWall,
      show3DSinWall,
      show3DNegHelix,
      show3DAxesBox,
      synthesisTarget,
      isFsControlsCollapsed,
    ]
  );

  // Redraw 3D Canvas on state change & resize
  useEffect(() => {
    if (labMode !== '3d') return;
    const targetCanvas = isFullscreen ? canvas3DFsRef.current : canvas3DRef.current;
    if (!targetCanvas) return;

    draw3DScene(targetCanvas, isFullscreen);

    const parent = targetCanvas.parentElement;
    if (!parent || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => draw3DScene(targetCanvas, isFullscreen));
    ro.observe(parent);
    return () => ro.disconnect();
  }, [labMode, isFullscreen, isFsControlsCollapsed, draw3DScene]);

  // ---------------------------------------------------------------------------
  // Subtle Engineering Graph Paper Grid (for 2D SVG Modes)
  // ---------------------------------------------------------------------------
  const renderGridBackground = (idPrefix) => {
    if (!isGridVisible) return null;
    return (
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none select-none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <pattern id={`${idPrefix}-minor`} width="24" height="24" patternUnits="userSpaceOnUse">
            <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#E5E2D9" strokeWidth="0.9" />
          </pattern>
          <pattern id={`${idPrefix}-major`} width="96" height="96" patternUnits="userSpaceOnUse">
            <rect width="96" height="96" fill={`url(#${idPrefix}-minor)`} />
            <path d="M 96 0 L 0 0 0 96" fill="none" stroke="#CCC8BC" strokeWidth="1.2" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${idPrefix}-major)`} />
      </svg>
    );
  };

  const anglePresets = [
    { deg: 0, label: '0°', sub: '1 + j0' },
    { deg: 45, label: '45°', sub: 'π/4' },
    { deg: 90, label: '90°', sub: '+j' },
    { deg: 135, label: '135°', sub: '3π/4' },
    { deg: 180, label: '180°', sub: 'e^(jπ) = −1' },
    { deg: 270, label: '270°', sub: '−j' },
    { deg: 315, label: '315°', sub: '7π/4' },
  ];

  // ---------------------------------------------------------------------------
  // Shared Visualization Canvas (Modes 1, 2, 3 in Normal & Fullscreen)
  // ---------------------------------------------------------------------------
  const renderVisualizationCanvas = (inFullscreen = false) => {
    if (labMode === '3d') {
      return (
        <div
          className={`relative w-full bg-[#FAF9F6] overflow-hidden flex flex-col justify-between ${
            inFullscreen
              ? 'h-full w-full'
              : 'rounded-md border border-[#E6E4DD] h-[480px] sm:h-[550px]'
          }`}
        >
          {/* Top 3D Sub-Mode Switcher + Camera Quick Presets Bar */}
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 px-3 pt-2.5 pointer-events-none">
            <div className="pointer-events-auto flex flex-wrap items-center gap-2">
              {/* Dual 3D View Switcher: Euler vs ±ω Frequencies */}
              <div
                className="inline-flex items-center bg-white/95 backdrop-blur-xs border border-[#E6E4DD] rounded-md p-1 shadow-2xs text-[11px] font-mono"
                role="group"
                aria-label="3D view model selector"
              >
                <button
                  type="button"
                  onClick={() => setShow3DNegHelix(false)}
                  className={`px-2 py-1 rounded font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    !show3DNegHelix
                      ? 'bg-[#C85A32] text-white'
                      : 'text-[#585651] hover:text-[#1A1917] hover:bg-[#FAF9F6]'
                  }`}
                >
                  Euler 3D (e^jωt)
                </button>
                <button
                  type="button"
                  onClick={() => setShow3DNegHelix(true)}
                  className={`px-2 py-1 rounded font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    show3DNegHelix
                      ? 'bg-[#1E7B56] text-white'
                      : 'text-[#585651] hover:text-[#1A1917] hover:bg-[#FAF9F6]'
                  }`}
                >
                  ±ω Frequencies 3D
                </button>
              </div>

              {/* Camera Angle Presets */}
              <div className="inline-flex flex-wrap items-center gap-1 bg-white/95 backdrop-blur-xs border border-[#E6E4DD] rounded-md p-1 shadow-2xs text-[11px] font-mono">
                {[
                  { label: 'Isometric 3D', yaw: 35, pitch: 22 },
                  { label: 'Front (Circle)', yaw: 270, pitch: 0 },
                  { label: 'Top (Cosine)', yaw: 0, pitch: 90 },
                  { label: 'Side (Sine)', yaw: 0, pitch: 0 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setCamYaw(preset.yaw);
                      setCamPitch(preset.pitch);
                    }}
                    className={`px-2 py-1 rounded font-semibold transition-colors cursor-pointer ${
                      Math.abs(camYaw - preset.yaw) <= 2 && Math.abs(camPitch - preset.pitch) <= 2
                        ? 'bg-[#1A1917] text-white'
                        : 'text-[#585651] hover:text-[#1A1917] hover:bg-[#FAF9F6]'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="pointer-events-auto text-[11px] font-mono text-[#585651] bg-white/95 backdrop-blur-xs border border-[#E6E4DD] rounded px-2.5 py-1 shadow-2xs">
              Drag to orbit · Scroll to zoom · Yaw {Math.round(camYaw)}° · Pitch {Math.round(camPitch)}°
            </div>
          </div>

          {/* 3D Interactive Canvas */}
          <div
            className="flex-1 min-h-0 w-full relative cursor-grab active:cursor-grabbing"
            onPointerDown={(e) => {
              isDragging3DRef.current = true;
              drag3DStartRef.current = {
                x: e.clientX,
                y: e.clientY,
                yaw: camYaw,
                pitch: camPitch,
              };
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (!isDragging3DRef.current) return;
              const dx = e.clientX - drag3DStartRef.current.x;
              const dy = e.clientY - drag3DStartRef.current.y;
              const nextYaw = (((drag3DStartRef.current.yaw + dx * 0.45) % 360) + 360) % 360;
              const nextPitch = Math.max(-90, Math.min(90, drag3DStartRef.current.pitch + dy * 0.4));
              setCamYaw(Math.round(nextYaw));
              setCamPitch(Math.round(nextPitch));
            }}
            onPointerUp={(e) => {
              isDragging3DRef.current = false;
              if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                e.currentTarget.releasePointerCapture(e.pointerId);
              }
            }}
            onWheel={(e) => {
              e.preventDefault();
              setCamZoom((z) => {
                const next = Math.max(0.6, Math.min(1.8, z - e.deltaY * 0.001));
                return Math.round(next * 100) / 100;
              });
            }}
          >
            <canvas
              ref={inFullscreen ? canvas3DFsRef : canvas3DRef}
              className="w-full h-full block"
              aria-label="Interactive 3D complex exponential helix showing Euler helix and counter-rotating ±ω superposition"
            />
          </div>

          {/* Legend */}
          {!inFullscreen && (
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-t border-[#E6E4DD] bg-white/75 text-[11px] font-mono text-[#585651]">
              <div className="flex flex-wrap items-center gap-3">
                {!show3DNegHelix ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-[#1A1917]">
                      <span className="w-3 h-1 bg-[#1A1917] inline-block rounded" />
                      <span>3D Helix e^(+jωt)</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-[#C85A32]">
                      <span className="w-3 h-1 bg-[#C85A32] inline-block rounded" />
                      <span>cos(ωt) Floor</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-[#3B6780]">
                      <span className="w-3 h-1 bg-[#3B6780] inline-block rounded" />
                      <span>sin(ωt) Wall</span>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-[#C85A32]">
                      <span className="w-3 h-1 bg-[#C85A32] inline-block rounded" />
                      <span>+ω Helix (½A·e^+jωt)</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-[#3B6780]">
                      <span className="w-3 h-1 bg-[#3B6780] inline-block rounded" />
                      <span>−ω Helix (½A·e^−jωt)</span>
                    </span>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-[#1E7B56]">
                      <span className="w-3 h-1 bg-[#1E7B56] inline-block rounded" />
                      <span>Combined Real {synthesisTarget === 'cosine' ? 'cos(ωt)' : 'sin(ωt)'} (Im = 0)</span>
                    </span>
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={handleResetCamera}
                className="text-[#C85A32] hover:underline font-semibold cursor-pointer"
              >
                Reset Camera
              </button>
            </div>
          )}
        </div>
      );
    }

    if (labMode === 'euler') {
      const g = eulerGeometry;
      return (
        <div
          className={`relative w-full bg-[#FAF9F6] overflow-hidden flex flex-col justify-between ${
            inFullscreen
              ? isFsControlsCollapsed
                ? 'h-full w-full pt-2 px-3 pb-[112px]'
                : 'h-full w-full pt-2 px-3 pb-[226px]'
              : 'rounded-md border border-[#E6E4DD] p-3 sm:p-4'
          }`}
        >
          {renderGridBackground(inFullscreen ? 'fs-euler' : 'norm-euler')}

          <div className="relative z-10 flex-1 min-h-0 flex items-center justify-center">
            <svg
              ref={eulerSvgRef}
              viewBox={`0 0 ${g.svgW} ${g.svgH}`}
              preserveAspectRatio="xMidYMid meet"
              className={`w-full h-full select-none ${
                inFullscreen ? 'max-h-full' : 'max-h-[540px]'
              }`}
              role="img"
              aria-label={`Euler identity complex plane showing rotating phasor projecting sin(theta)=${imagPart.toFixed(2)} horizontally and cos(theta)=${realPart.toFixed(2)} vertically`}
            >
              <defs>
                <marker
                  id="euler-arrow-dark"
                  viewBox="0 0 10 10"
                  refX="7"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#1A1917" />
                </marker>
                <marker
                  id="euler-arrow-slate"
                  viewBox="0 0 10 10"
                  refX="7"
                  refY="5"
                  markerWidth="5.5"
                  markerHeight="5.5"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#585651" />
                </marker>
              </defs>

              <text x="18" y="20" className="text-[11px] font-mono font-bold fill-[#1A1917]">
                1. UNIT CIRCLE &amp; PHASOR (e^jθ)
              </text>
              <text x={g.sinWaveX0} y="20" className="text-[11px] font-mono font-bold fill-[#3B6780]">
                2. IMAGINARY PROJECTION → sin(θ) = {imagPart.toFixed(3)}
              </text>

              <line x1={g.divX} y1="12" x2={g.divX} y2={g.svgH - 12} stroke="#E6E4DD" strokeWidth="1.2" />
              <line x1="18" y1={g.divY} x2={g.svgW - 18} y2={g.divY} stroke="#E6E4DD" strokeWidth="1.2" />

              {showUnitCircle && (
                <g>
                  <circle
                    cx={g.cx}
                    cy={g.cy}
                    r={g.scale}
                    fill="none"
                    stroke="#B5B1A5"
                    strokeWidth="1.3"
                    strokeDasharray="4 4"
                  />
                  <text x={g.cx + g.scale + 4} y={g.cy + 12} className="text-[9px] font-mono fill-[#75736E]">
                    r=1
                  </text>
                </g>
              )}

              {Math.abs(amplitude - 1.0) > 0.02 && (
                <circle
                  cx={g.cx}
                  cy={g.cy}
                  r={amplitude * g.scale}
                  fill="none"
                  stroke="#C85A32"
                  strokeWidth="1"
                  strokeDasharray="2 3"
                  opacity="0.45"
                />
              )}

              <line x1="28" y1={g.cy} x2={g.divX - 18} y2={g.cy} stroke="#585651" strokeWidth="1.4" />
              <line x1={g.cx} y1="30" x2={g.cx} y2={g.divY - 12} stroke="#585651" strokeWidth="1.4" />
              <text x={g.divX - 16} y={g.cy + 4} className="text-[10px] font-mono font-bold fill-[#1A1917]">
                Re
              </text>
              <text x={g.cx + 6} y="38" className="text-[10px] font-mono font-bold fill-[#1A1917]">
                +j·Im
              </text>

              {[-1, -0.5, 0.5, 1].map((v) => (
                <g key={v}>
                  <line
                    x1={g.cx + v * g.scale}
                    y1={g.cy - 3}
                    x2={g.cx + v * g.scale}
                    y2={g.cy + 3}
                    stroke="#75736E"
                    strokeWidth="1"
                  />
                  <text
                    x={g.cx + v * g.scale}
                    y={g.cy + 13}
                    textAnchor="middle"
                    className="text-[8.5px] font-mono fill-[#75736E]"
                  >
                    {v > 0 ? `+${v}` : v}
                  </text>
                  <line
                    x1={g.cx - 3}
                    y1={g.cy - v * g.scale}
                    x2={g.cx + 3}
                    y2={g.cy - v * g.scale}
                    stroke="#75736E"
                    strokeWidth="1"
                  />
                  <text
                    x={g.cx - 6}
                    y={g.cy - v * g.scale + 3}
                    textAnchor="end"
                    className="text-[8.5px] font-mono fill-[#75736E]"
                  >
                    {v > 0 ? `+${v}j` : `${v}j`}
                  </text>
                </g>
              ))}

              {g.angleArcPath && (
                <path
                  d={g.angleArcPath}
                  fill="#C85A32"
                  fillOpacity="0.14"
                  stroke="#C85A32"
                  strokeWidth="1.25"
                />
              )}

              {showProjections && (
                <g>
                  <line
                    x1={g.cx}
                    y1={g.cy}
                    x2={g.tipX}
                    y2={g.cy}
                    stroke="#C85A32"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <line
                    x1={g.cx}
                    y1={g.cy}
                    x2={g.cx}
                    y2={g.tipY}
                    stroke="#3B6780"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                  <line
                    x1={g.tipX}
                    y1={g.tipY}
                    x2={g.tipX}
                    y2={g.cy}
                    stroke="#C85A32"
                    strokeWidth="1.3"
                    strokeDasharray="3 3"
                    opacity="0.7"
                  />
                  <line
                    x1={g.tipX}
                    y1={g.tipY}
                    x2={g.cx}
                    y2={g.tipY}
                    stroke="#3B6780"
                    strokeWidth="1.3"
                    strokeDasharray="3 3"
                    opacity="0.7"
                  />
                </g>
              )}

              {showConjugate && (
                <g opacity="0.75">
                  <line
                    x1={g.cx}
                    y1={g.cy}
                    x2={g.tipX}
                    y2={g.conjY}
                    stroke="#585651"
                    strokeWidth="2"
                    strokeDasharray="4 2"
                    markerEnd="url(#euler-arrow-slate)"
                  />
                  <circle cx={g.tipX} cy={g.conjY} r="3.5" fill="#585651" />
                  <text
                    x={g.tipX + (realPart >= 0 ? 8 : -52)}
                    y={g.conjY + 12}
                    className="text-[9.5px] font-mono font-semibold fill-[#585651]"
                  >
                    z* = r·e^(-jθ)
                  </text>
                </g>
              )}

              {/* Direct Projection Beams out of Rotating Phasor Tip */}
              <line
                x1={g.tipX}
                y1={g.tipY}
                x2={g.sinWaveX0}
                y2={g.tipY}
                stroke="#3B6780"
                strokeWidth="2"
                strokeDasharray="5 3"
              />
              <line
                x1={g.tipX}
                y1={g.tipY}
                x2={g.tipX}
                y2={g.cosWaveY0}
                stroke="#C85A32"
                strokeWidth="2"
                strokeDasharray="5 3"
              />

              {/* Rotating Phasor */}
              <line
                x1={g.cx}
                y1={g.cy}
                x2={g.tipX}
                y2={g.tipY}
                stroke="#1A1917"
                strokeWidth="2.8"
                strokeLinecap="round"
                markerEnd="url(#euler-arrow-dark)"
              />

              <circle
                cx={g.tipX}
                cy={g.tipY}
                r="14"
                fill="transparent"
                className="cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => {
                  e.preventDefault();
                  setPlaybackState('paused');
                  setIsDraggingPhasor(true);
                  updatePhasorFromPointer(e.clientX, e.clientY, e.shiftKey);
                }}
              />
              <circle
                cx={g.tipX}
                cy={g.tipY}
                r="6"
                fill="#1A1917"
                stroke="#FFFFFF"
                strokeWidth="2"
                className="pointer-events-none"
              />

              <text
                x={g.cx + 40 * Math.cos(thetaRad / 2)}
                y={g.cy - 40 * Math.sin(thetaRad / 2) + 3}
                textAnchor="middle"
                className="text-[10px] font-mono font-bold fill-[#C85A32] pointer-events-none"
              >
                {Math.round(thetaDeg)}°
              </text>

              {/* Top-Right: Sin(θ) Unrolling Rightward */}
              <g>
                <line
                  x1={g.sinWaveX0}
                  y1={g.cy}
                  x2={g.sinWaveX0 + g.sinWaveW}
                  y2={g.cy}
                  stroke="#A8A69E"
                  strokeWidth="1.2"
                />
                <line
                  x1={g.sinWaveX0}
                  y1={g.cy - 130}
                  x2={g.sinWaveX0}
                  y2={g.cy + 130}
                  stroke="#3B6780"
                  strokeWidth="1.6"
                />
                <path
                  d={g.sinUnrollPath}
                  fill="none"
                  stroke="#3B6780"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />
                <circle
                  cx={g.sinWaveX0}
                  cy={g.tipY}
                  r="5.5"
                  fill="#3B6780"
                  stroke="#FFFFFF"
                  strokeWidth="1.8"
                />
                <text
                  x={g.sinWaveX0 + 8}
                  y={g.tipY - 8}
                  className="text-[9.5px] font-mono font-bold fill-[#3B6780]"
                >
                  sin={imagPart.toFixed(2)}
                </text>

                {[
                  { frac: 0, text: 'θ' },
                  { frac: 0.25, text: 'θ−90°' },
                  { frac: 0.5, text: 'θ−180°' },
                  { frac: 0.75, text: 'θ−270°' },
                  { frac: 1, text: 'θ−360°' },
                ].map((tk) => (
                  <g key={tk.text}>
                    <line
                      x1={g.sinWaveX0 + tk.frac * g.sinWaveW}
                      y1={g.cy - 3}
                      x2={g.sinWaveX0 + tk.frac * g.sinWaveW}
                      y2={g.cy + 3}
                      stroke="#75736E"
                      strokeWidth="1"
                    />
                    <text
                      x={g.sinWaveX0 + tk.frac * g.sinWaveW}
                      y={g.cy + 15}
                      textAnchor="middle"
                      className="text-[8.5px] font-mono fill-[#75736E]"
                    >
                      {tk.text}
                    </text>
                  </g>
                ))}
              </g>

              {/* Bottom-Left: Cos(θ) Unrolling Downward */}
              <g>
                <text x="18" y={g.divY + 20} className="text-[11px] font-mono font-bold fill-[#C85A32]">
                  3. REAL PROJECTION ↓ cos(θ) = {realPart.toFixed(3)}
                </text>
                <line
                  x1={g.cx}
                  y1={g.cosWaveY0}
                  x2={g.cx}
                  y2={g.cosWaveY0 + g.cosWaveH}
                  stroke="#A8A69E"
                  strokeWidth="1.2"
                />
                <line
                  x1={g.cx - 142}
                  y1={g.cosWaveY0}
                  x2={g.cx + 142}
                  y2={g.cosWaveY0}
                  stroke="#C85A32"
                  strokeWidth="1.6"
                />
                <path
                  d={g.cosUnrollPath}
                  fill="none"
                  stroke="#C85A32"
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />
                <circle
                  cx={g.tipX}
                  cy={g.cosWaveY0}
                  r="5.5"
                  fill="#C85A32"
                  stroke="#FFFFFF"
                  strokeWidth="1.8"
                />
                <text
                  x={g.tipX + (realPart >= 0 ? 8 : -58)}
                  y={g.cosWaveY0 - 8}
                  className="text-[9.5px] font-mono font-bold fill-[#C85A32]"
                >
                  cos={realPart.toFixed(2)}
                </text>
              </g>

              {/* Bottom-Right: Orthographic Summary */}
              <g>
                <rect
                  x={g.sinWaveX0}
                  y={g.divY + 20}
                  width={g.sinWaveW}
                  height={g.svgH - g.divY - 32}
                  rx="6"
                  fill="#FFFFFF"
                  stroke="#E6E4DD"
                  strokeWidth="1.2"
                />
                <text x={g.sinWaveX0 + 18} y={g.divY + 46} className="text-[11px] font-mono font-bold fill-[#1A1917]">
                  HOW CIRCULAR MOTION GENERATES COSINE &amp; SINE
                </text>
                <text x={g.sinWaveX0 + 18} y={g.divY + 70} className="text-[10.5px] font-mono font-semibold fill-[#C85A32]">
                  ↓ Vertical Drop from Tip: Re(z) = {amplitude.toFixed(2)}·cos({Math.round(thetaDeg)}°) = {realPart.toFixed(3)}
                </text>
                <text x={g.sinWaveX0 + 18} y={g.divY + 94} className="text-[10.5px] font-mono font-semibold fill-[#3B6780]">
                  → Horizontal Beam from Tip: Im(z) = {amplitude.toFixed(2)}·sin({Math.round(thetaDeg)}°) = {imagPart.toFixed(3)}
                </text>
                <line x1={g.sinWaveX0 + 18} y1={g.divY + 110} x2={g.sinWaveX0 + g.sinWaveW - 18} y2={g.divY + 110} stroke="#E6E4DD" strokeWidth="1" />
                <text x={g.sinWaveX0 + 18} y={g.divY + 132} className="text-[11px] font-mono font-bold fill-[#1A1917]">
                  Euler Form: {amplitude.toFixed(2)}·e^(j·{Math.round(thetaDeg)}°) = {realPart.toFixed(2)} {imagPart >= 0 ? '+' : '−'} j{Math.abs(imagPart).toFixed(2)}
                </text>
                <text x={g.sinWaveX0 + 18} y={g.divY + 154} className="text-[10px] font-sans fill-[#585651]">
                  Press Play or drag the black phasor tip on the circle to watch both waves stream out in real time.
                </text>
              </g>
            </svg>
          </div>

          {!inFullscreen && (
            <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 pt-2.5 mt-2 border-t border-[#E6E4DD] text-[11px] font-mono text-[#585651]">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-3 h-1 bg-[#1A1917] inline-block rounded" />
                  <span>Phasor e^(jθ)</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-[#C85A32] font-semibold">
                  <span className="w-3 h-1 bg-[#C85A32] inline-block rounded" />
                  <span>Real cos(θ)</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-[#3B6780] font-semibold">
                  <span className="w-3 h-1 bg-[#3B6780] inline-block rounded" />
                  <span>Imag sin(θ)</span>
                </span>
              </div>
              <span className="text-[#75736E]">
                Tip: Drag the phasor dot directly on the circle
              </span>
            </div>
          )}
        </div>
      );
    }

    // -------------------------------------------------------------------------
    // MODE 2: Positive (+ω) & Negative (-ω) Counter-Rotating Vectors
    // Orthographic: ±Im Cancellation Waves → Right, Real Sum Wave ↓ Down
    // -------------------------------------------------------------------------
    const c = counterGeometry;
    const showPosNeg = vectorViewMode === 'both' || vectorViewMode === 'individual';
    const showSum = vectorViewMode === 'both' || vectorViewMode === 'combined';

    return (
      <div
        className={`relative w-full bg-[#FAF9F6] overflow-hidden flex flex-col justify-between ${
          inFullscreen
            ? isFsControlsCollapsed
              ? 'h-full w-full pt-2 px-3 pb-[112px]'
              : 'h-full w-full pt-2 px-3 pb-[226px]'
            : 'rounded-md border border-[#E6E4DD] p-3 sm:p-4'
        }`}
      >
        {renderGridBackground(inFullscreen ? 'fs-counter' : 'norm-counter')}

        <div className="relative z-10 flex-1 min-h-0 flex items-center justify-center">
          <svg
            viewBox={`0 0 ${c.svgW} ${c.svgH}`}
            preserveAspectRatio="xMidYMid meet"
            className={`w-full h-full select-none ${
              inFullscreen ? 'max-h-full' : 'max-h-[540px]'
            }`}
            role="img"
            aria-label="Counter-rotating positive and negative frequency phasors with waves springing directly out of the circle"
          >
            <defs>
              <marker
                id="cnt-arrow-pos"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="5.5"
                markerHeight="5.5"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#C85A32" />
              </marker>
              <marker
                id="cnt-arrow-neg"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="5.5"
                markerHeight="5.5"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#3B6780" />
              </marker>
              <marker
                id="cnt-arrow-sum"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8.5 5 L 0 8.5 z" fill="#1E7B56" />
              </marker>
            </defs>

            {/* Quadrant Titles */}
            <text x="18" y="20" className="text-[11px] font-mono font-bold fill-[#1A1917]">
              1. COUNTER-ROTATING PHASORS (+ω &amp; −ω)
            </text>
            <text x={c.rightWaveX0} y="20" className="text-[11px] font-mono font-bold fill-[#3B6780]">
              2. IMAGINARY PARTS → CANCEL TO ZERO (Net Im = 0)
            </text>

            {/* Quadrant Dividers */}
            <line x1={c.divX} y1="12" x2={c.divX} y2={c.svgH - 12} stroke="#E6E4DD" strokeWidth="1.2" />
            <line x1="18" y1={c.divY} x2={c.svgW - 18} y2={c.divY} stroke="#E6E4DD" strokeWidth="1.2" />

            {/* ================== TOP-LEFT: COUNTER-ROTATING CIRCLE ================== */}
            <circle
              cx={c.cx}
              cy={c.cy}
              r={c.halfA * c.scale}
              fill="none"
              stroke="#B5B1A5"
              strokeWidth="1.2"
              strokeDasharray="4 3"
            />
            <circle
              cx={c.cx}
              cy={c.cy}
              r={amplitude * c.scale}
              fill="none"
              stroke="#DCD9D0"
              strokeWidth="1"
              strokeDasharray="2 4"
            />

            <line x1="28" y1={c.cy} x2={c.divX - 18} y2={c.cy} stroke="#585651" strokeWidth="1.4" />
            <line x1={c.cx} y1="30" x2={c.cx} y2={c.divY - 12} stroke="#585651" strokeWidth="1.4" />
            <text x={c.divX - 16} y={c.cy + 4} className="text-[10px] font-mono font-bold fill-[#1A1917]">
              Re
            </text>
            <text x={c.cx + 6} y="38" className="text-[10px] font-mono font-bold fill-[#1A1917]">
              +j·Im
            </text>

            {[-1, -0.5, 0.5, 1].map((v) => (
              <g key={v}>
                <line
                  x1={c.cx + v * c.scale}
                  y1={c.cy - 3}
                  x2={c.cx + v * c.scale}
                  y2={c.cy + 3}
                  stroke="#75736E"
                  strokeWidth="1"
                />
                <text
                  x={c.cx + v * c.scale}
                  y={c.cy + 13}
                  textAnchor="middle"
                  className="text-[8.5px] font-mono fill-[#75736E]"
                >
                  {v > 0 ? `+${v}` : v}
                </text>
              </g>
            ))}

            {/* Direct Horizontal Beams from Circle Tips -> Rightward ±Im Cancellation Waves */}
            {showPosNeg && showImWaves && (
              <g>
                <line
                  x1={c.vpX}
                  y1={c.vpY}
                  x2={c.rightWaveX0}
                  y2={c.vpY}
                  stroke="#C85A32"
                  strokeWidth="1.6"
                  strokeDasharray="4 3"
                  opacity="0.85"
                />
                <line
                  x1={c.vmX}
                  y1={c.vmY}
                  x2={c.rightWaveX0}
                  y2={c.vmY}
                  stroke="#3B6780"
                  strokeWidth="1.6"
                  strokeDasharray="4 3"
                  opacity="0.85"
                />
              </g>
            )}
            {showSum && (
              <>
                {/* Horizontal beam from Sum tip -> flat 0 line */}
                <line
                  x1={c.sumX}
                  y1={c.cy}
                  x2={c.rightWaveX0}
                  y2={c.cy}
                  stroke="#1E7B56"
                  strokeWidth="1.8"
                  strokeDasharray="4 3"
                  opacity="0.85"
                />
                {/* Vertical beam from Sum tip -> Downward Real Sinusoid */}
                <line
                  x1={c.sumX}
                  y1={c.cy}
                  x2={c.sumX}
                  y2={c.downWaveY0}
                  stroke="#1E7B56"
                  strokeWidth="2.2"
                  strokeDasharray="5 3"
                />
              </>
            )}

            {/* Individual +ω and -ω vectors */}
            {showPosNeg && (
              <g>
                <line
                  x1={c.vpX}
                  y1={c.vpY}
                  x2={c.vmX}
                  y2={c.vmY}
                  stroke="#75736E"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                />
                {showSum && (
                  <g opacity="0.65">
                    <line
                      x1={c.vpX}
                      y1={c.vpY}
                      x2={c.sumX}
                      y2={c.sumY}
                      stroke="#3B6780"
                      strokeWidth="1.4"
                      strokeDasharray="3 2"
                    />
                    <line
                      x1={c.vmX}
                      y1={c.vmY}
                      x2={c.sumX}
                      y2={c.sumY}
                      stroke="#C85A32"
                      strokeWidth="1.4"
                      strokeDasharray="3 2"
                    />
                  </g>
                )}

                {/* +ω CCW */}
                <line
                  x1={c.cx}
                  y1={c.cy}
                  x2={c.vpX}
                  y2={c.vpY}
                  stroke="#C85A32"
                  strokeWidth="2.4"
                  markerEnd="url(#cnt-arrow-pos)"
                />
                <circle cx={c.vpX} cy={c.vpY} r="4" fill="#C85A32" stroke="#FFF" strokeWidth="1.2" />
                <text
                  x={c.vpX + (c.vpRe >= 0 ? 8 : -52)}
                  y={c.vpY + (c.vpIm >= 0 ? -8 : 14)}
                  className="text-[9.5px] font-mono font-bold fill-[#C85A32]"
                >
                  +ω
                </text>

                {/* -ω CW */}
                <line
                  x1={c.cx}
                  y1={c.cy}
                  x2={c.vmX}
                  y2={c.vmY}
                  stroke="#3B6780"
                  strokeWidth="2.4"
                  markerEnd="url(#cnt-arrow-neg)"
                />
                <circle cx={c.vmX} cy={c.vmY} r="4" fill="#3B6780" stroke="#FFF" strokeWidth="1.2" />
                <text
                  x={c.vmX + (c.vmRe >= 0 ? 8 : -48)}
                  y={c.vmY + (c.vmIm >= 0 ? -8 : 14)}
                  className="text-[9.5px] font-mono font-bold fill-[#3B6780]"
                >
                  −ω
                </text>
              </g>
            )}

            {/* Combined Sum Vector pinned strictly on Real axis */}
            {showSum && (
              <g>
                {Math.abs(c.sumRe) > 0.04 && (
                  <line
                    x1={c.cx}
                    y1={c.cy}
                    x2={c.sumX}
                    y2={c.sumY}
                    stroke="#1E7B56"
                    strokeWidth="4"
                    strokeLinecap="round"
                    markerEnd="url(#cnt-arrow-sum)"
                  />
                )}
                <circle
                  cx={c.sumX}
                  cy={c.sumY}
                  r="6"
                  fill="#1E7B56"
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
                <text
                  x={c.sumX}
                  y={c.cy - 12}
                  textAnchor="middle"
                  className="text-[9.5px] font-mono font-bold fill-[#1E7B56]"
                >
                  Sum={c.sumRe.toFixed(2)}
                </text>
              </g>
            )}

            {/* ================== TOP-RIGHT: ±Im WAVES UNROLLING RIGHTWARD ================== */}
            <g>
              {/* Baseline y = cy (exact Im = 0 line!) */}
              <line
                x1={c.rightWaveX0}
                y1={c.cy}
                x2={c.rightWaveX0 + c.rightWaveW}
                y2={c.cy}
                stroke={showSum ? '#1E7B56' : '#A8A69E'}
                strokeWidth={showSum ? '2.4' : '1.2'}
              />
              <line
                x1={c.rightWaveX0}
                y1={c.cy - 90}
                x2={c.rightWaveX0}
                y2={c.cy + 90}
                stroke="#585651"
                strokeWidth="1.4"
              />

              {showPosNeg && showImWaves && (
                <>
                  <path
                    d={c.posImUnrollPath}
                    fill="none"
                    stroke="#C85A32"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                  />
                  <path
                    d={c.negImUnrollPath}
                    fill="none"
                    stroke="#3B6780"
                    strokeWidth="2"
                    strokeDasharray="4 3"
                  />
                  <circle cx={c.rightWaveX0} cy={c.vpY} r="4.5" fill="#C85A32" stroke="#FFF" strokeWidth="1.5" />
                  <circle cx={c.rightWaveX0} cy={c.vmY} r="4.5" fill="#3B6780" stroke="#FFF" strokeWidth="1.5" />
                </>
              )}

              {showSum && (
                <circle
                  cx={c.rightWaveX0}
                  cy={c.cy}
                  r="5"
                  fill="#1E7B56"
                  stroke="#FFFFFF"
                  strokeWidth="1.8"
                />
              )}

              <text x={c.rightWaveX0 + 10} y={c.cy - 68} className="text-[9.5px] font-mono fill-[#585651]">
                Im(+ω) = {c.vpIm >= 0 ? '+' : ''}
                {c.vpIm.toFixed(2)}j · Im(−ω) = {c.vmIm >= 0 ? '+' : ''}
                {c.vmIm.toFixed(2)}j → Net Im = 0.00j
              </text>
            </g>

            {/* ================== BOTTOM-LEFT: COMBINED REAL WAVE UNROLLING DOWNWARD ================== */}
            <g>
              <text x="18" y={c.divY + 20} className="text-[11px] font-mono font-bold fill-[#1E7B56]">
                {synthesisTarget === 'cosine'
                  ? `3. REAL SUM ↓ ${amplitude.toFixed(1)}·cos(ωt) = ${c.sumRe.toFixed(3)}`
                  : `3. REAL SUM ↓ ${amplitude.toFixed(1)}·sin(ωt) = ${c.sumRe.toFixed(3)}`}
              </text>

              <line
                x1={c.cx}
                y1={c.downWaveY0}
                x2={c.cx}
                y2={c.downWaveY0 + c.downWaveH}
                stroke="#A8A69E"
                strokeWidth="1.2"
              />
              <line
                x1={c.cx - 142}
                y1={c.downWaveY0}
                x2={c.cx + 142}
                y2={c.downWaveY0}
                stroke="#1E7B56"
                strokeWidth="1.6"
              />

              {showPosNeg && (
                <path
                  d={c.halfRealUnrollPath}
                  fill="none"
                  stroke="#8A8882"
                  strokeWidth="1.4"
                  strokeDasharray="3 3"
                />
              )}

              {showSum && (
                <>
                  <path
                    d={c.sumRealUnrollPath}
                    fill="none"
                    stroke="#1E7B56"
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />
                  <circle
                    cx={c.sumX}
                    cy={c.downWaveY0}
                    r="5.5"
                    fill="#1E7B56"
                    stroke="#FFFFFF"
                    strokeWidth="1.8"
                  />
                  <text
                    x={c.sumX + (c.sumRe >= 0 ? 8 : -54)}
                    y={c.downWaveY0 - 8}
                    className="text-[9.5px] font-mono font-bold fill-[#1E7B56]"
                  >
                    {c.sumRe.toFixed(2)}
                  </text>
                </>
              )}
            </g>

            {/* ================== BOTTOM-RIGHT: TWO-SIDED SPECTRUM ================== */}
            <g>
              <text x={c.specX0} y={c.divY + 20} className="text-[11px] font-mono font-bold fill-[#1A1917]">
                4. TWO-SIDED SPECTRUM (−f₀ &amp; +f₀ IMPULSES)
              </text>
              <line
                x1={c.specX0}
                y1={c.specBaseY}
                x2={c.specX0 + c.specW}
                y2={c.specBaseY}
                stroke="#585651"
                strokeWidth="1.4"
              />
              <line
                x1={c.specMidX}
                y1={c.divY + 46}
                x2={c.specMidX}
                y2={c.specBaseY + 6}
                stroke="#A8A69E"
                strokeWidth="1.1"
                strokeDasharray="3 3"
              />
              <text
                x={c.specMidX}
                y={c.specBaseY + 18}
                textAnchor="middle"
                className="text-[9px] font-mono fill-[#75736E]"
              >
                0 Hz
              </text>

              {/* -f0 */}
              <line
                x1={c.specMidX - c.stemOffset}
                y1={c.specBaseY}
                x2={c.specMidX - c.stemOffset}
                y2={c.specBaseY - c.stemHeight}
                stroke="#3B6780"
                strokeWidth="3"
              />
              <circle
                cx={c.specMidX - c.stemOffset}
                cy={c.specBaseY - c.stemHeight}
                r="4.5"
                fill="#3B6780"
              />
              <text
                x={c.specMidX - c.stemOffset}
                y={c.specBaseY - c.stemHeight - 8}
                textAnchor="middle"
                className="text-[9.5px] font-mono font-bold fill-[#3B6780]"
              >
                |A/2|={c.halfA.toFixed(2)}
              </text>
              <text
                x={c.specMidX - c.stemOffset}
                y={c.specBaseY + 18}
                textAnchor="middle"
                className="text-[9px] font-mono font-bold fill-[#3B6780]"
              >
                −{freqHz.toFixed(2)} Hz
              </text>

              {/* +f0 */}
              <line
                x1={c.specMidX + c.stemOffset}
                y1={c.specBaseY}
                x2={c.specMidX + c.stemOffset}
                y2={c.specBaseY - c.stemHeight}
                stroke="#C85A32"
                strokeWidth="3"
              />
              <circle
                cx={c.specMidX + c.stemOffset}
                cy={c.specBaseY - c.stemHeight}
                r="4.5"
                fill="#C85A32"
              />
              <text
                x={c.specMidX + c.stemOffset}
                y={c.specBaseY - c.stemHeight - 8}
                textAnchor="middle"
                className="text-[9.5px] font-mono font-bold fill-[#C85A32]"
              >
                |A/2|={c.halfA.toFixed(2)}
              </text>
              <text
                x={c.specMidX + c.stemOffset}
                y={c.specBaseY + 18}
                textAnchor="middle"
                className="text-[9px] font-mono font-bold fill-[#C85A32]"
              >
                +{freqHz.toFixed(2)} Hz
              </text>
            </g>
          </svg>
        </div>

        {!inFullscreen && (
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 pt-2.5 mt-2 border-t border-[#E6E4DD] text-[11px] font-mono text-[#585651]">
            <div className="flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-[#C85A32] font-semibold">
                <span className="w-3 h-1 bg-[#C85A32] inline-block rounded" />
                <span>+ω (CCW)</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-[#3B6780] font-semibold">
                <span className="w-3 h-1 bg-[#3B6780] inline-block rounded" />
                <span>−ω (CW)</span>
              </span>
              <span className="inline-flex items-center gap-1.5 text-[#1E7B56] font-semibold">
                <span className="w-3 h-1 bg-[#1E7B56] inline-block rounded" />
                <span>Combined Real Sum (Im = 0)</span>
              </span>
            </div>
            <span className="text-[#75736E]">
              f₀ = {freqHz.toFixed(2)} Hz · T₀ = {periodSec.toFixed(2)} s
            </span>
          </div>
        )}
      </div>
    );
  };

  // Shared Interactive Parameter Sliders
  const renderParameterSliders = (compact = false) => (
    <div className={`grid grid-cols-1 ${compact ? 'sm:grid-cols-3 gap-3' : 'sm:grid-cols-3 gap-4'}`}>
      <div>
        <div className="flex items-center justify-between text-xs mb-1">
          <label
            htmlFor={compact ? 'fs-theta-slider' : 'theta-slider'}
            className="font-semibold text-[#1A1917] inline-flex items-center gap-1"
            title="Instantaneous phase angle θ = ωt around the complex circle"
          >
            <span>Phase Angle (θ)</span>
            <HelpCircle className="w-3 h-3 text-[#8A8882]" />
          </label>
          <span className="font-mono font-bold text-[#C85A32] tabular-nums">
            {Math.round(thetaDeg)}° ({thetaRad.toFixed(2)} rad)
          </span>
        </div>
        <input
          id={compact ? 'fs-theta-slider' : 'theta-slider'}
          type="range"
          min="0"
          max="360"
          step="1"
          value={Math.round(thetaDeg)}
          onChange={(e) => {
            const val = Number(e.target.value);
            setThetaDeg(val);
            setAnnouncement(`Angle set to ${val} degrees`);
          }}
          className="w-full accent-[#C85A32] cursor-pointer"
        />
        {!compact && (
          <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
            <span>0°</span>
            <span>90°</span>
            <span>180°</span>
            <span>270°</span>
            <span>360°</span>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between text-xs mb-1">
          <label
            htmlFor={compact ? 'fs-omega-slider' : 'omega-slider'}
            className="font-semibold text-[#1A1917] inline-flex items-center gap-1"
            title="Rotation speed ω in radians per second (f = ω / 2π)"
          >
            <span>Frequency (ω)</span>
            <HelpCircle className="w-3 h-3 text-[#8A8882]" />
          </label>
          <span className="font-mono font-bold text-[#1A1917] tabular-nums">
            {omega.toFixed(1)} rad/s ({freqHz.toFixed(2)} Hz)
          </span>
        </div>
        <input
          id={compact ? 'fs-omega-slider' : 'omega-slider'}
          type="range"
          min="0.5"
          max="6.0"
          step="0.5"
          value={omega}
          onChange={(e) => setOmega(Number(e.target.value))}
          className="w-full accent-[#C85A32] cursor-pointer"
        />
        {!compact && (
          <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
            <span>0.5 rad/s</span>
            <span>3.0 rad/s</span>
            <span>6.0 rad/s</span>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center justify-between text-xs mb-1">
          <label
            htmlFor={compact ? 'fs-amp-slider' : 'amp-slider'}
            className="font-semibold text-[#1A1917] inline-flex items-center gap-1"
            title="Phasor length r = |z| (1.0 corresponds to the standard unit circle)"
          >
            <span>Amplitude (|z| = r)</span>
            <HelpCircle className="w-3 h-3 text-[#8A8882]" />
          </label>
          <div className="flex items-center gap-1.5">
            <span className="font-mono font-bold text-[#1A1917] tabular-nums">
              {amplitude.toFixed(2)}
            </span>
            {Math.abs(amplitude - 1.0) > 0.01 && (
              <button
                type="button"
                onClick={() => setAmplitude(1.0)}
                className="text-[10px] font-mono text-[#C85A32] hover:underline cursor-pointer"
                title="Snap back to Unit Circle (r = 1.0)"
              >
                Unit (1.0)
              </button>
            )}
          </div>
        </div>
        <input
          id={compact ? 'fs-amp-slider' : 'amp-slider'}
          type="range"
          min="0.2"
          max="1.5"
          step="0.05"
          value={amplitude}
          onChange={(e) => setAmplitude(Number(e.target.value))}
          className="w-full accent-[#C85A32] cursor-pointer"
        />
        {!compact && (
          <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
            <span>0.2</span>
            <span>0.5</span>
            <span>1.0 (Unit)</span>
            <span>1.5</span>
          </div>
        )}
      </div>
    </div>
  );

  // Mode-Specific Controls (Overlays for Mode 1, ±ω toggles for Mode 2, Full 3D Controls for Mode 3)
  const renderModeSpecificToggles = () => {
    if (labMode === '3d') {
      return (
        <div className="pt-2 border-t border-[#E6E4DD] space-y-2.5 text-xs">
          {/* 3D Camera Sliders */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <div className="flex justify-between text-[11px] mb-0.5">
                <span className="font-semibold text-[#1A1917]">Yaw (Azimuth)</span>
                <span className="font-mono text-[#C85A32] tabular-nums">{camYaw}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                value={camYaw}
                onChange={(e) => setCamYaw(Number(e.target.value))}
                className="w-full accent-[#C85A32] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-0.5">
                <span className="font-semibold text-[#1A1917]">Pitch (Tilt)</span>
                <span className="font-mono text-[#C85A32] tabular-nums">{camPitch}°</span>
              </div>
              <input
                type="range"
                min="-90"
                max="90"
                step="1"
                value={camPitch}
                onChange={(e) => setCamPitch(Number(e.target.value))}
                className="w-full accent-[#C85A32] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-0.5">
                <span className="font-semibold text-[#1A1917]">3D Zoom</span>
                <span className="font-mono text-[#1A1917] tabular-nums">{camZoom.toFixed(2)}×</span>
              </div>
              <input
                type="range"
                min="0.6"
                max="1.8"
                step="0.05"
                value={camZoom}
                onChange={(e) => setCamZoom(Number(e.target.value))}
                className="w-full accent-[#C85A32] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-[11px] mb-0.5">
                <span className="font-semibold text-[#1A1917]">Helix Turns</span>
                <span className="font-mono text-[#1A1917] tabular-nums">{helixTurns.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="1"
                max="4"
                step="0.5"
                value={helixTurns}
                onChange={(e) => setHelixTurns(Number(e.target.value))}
                className="w-full accent-[#C85A32] cursor-pointer"
              />
            </div>
          </div>

          {/* 3D Sub-Mode + Shadow & Helix Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center bg-white border border-[#E6E4DD] rounded p-0.5 gap-0.5">
                <button
                  type="button"
                  onClick={() => setShow3DNegHelix(false)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold cursor-pointer transition-colors ${
                    !show3DNegHelix ? 'bg-[#C85A32] text-white' : 'text-[#585651] hover:text-[#1A1917]'
                  }`}
                >
                  Euler 3D
                </button>
                <button
                  type="button"
                  onClick={() => setShow3DNegHelix(true)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold cursor-pointer transition-colors ${
                    show3DNegHelix ? 'bg-[#1E7B56] text-white' : 'text-[#585651] hover:text-[#1A1917]'
                  }`}
                >
                  ±ω Frequencies 3D
                </button>
              </div>

              {show3DNegHelix && (
                <div className="inline-flex items-center bg-white border border-[#E6E4DD] rounded p-0.5 gap-0.5">
                  <button
                    type="button"
                    onClick={() => setSynthesisTarget('cosine')}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold cursor-pointer ${
                      synthesisTarget === 'cosine' ? 'bg-[#1A1917] text-white' : 'text-[#585651]'
                    }`}
                  >
                    cos(ωt)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSynthesisTarget('sine')}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold cursor-pointer ${
                      synthesisTarget === 'sine' ? 'bg-[#1A1917] text-white' : 'text-[#585651]'
                    }`}
                  >
                    sin(ωt)
                  </button>
                </div>
              )}

              <label className="inline-flex items-center gap-1.5 cursor-pointer text-[#1A1917]">
                <input
                  type="checkbox"
                  checked={show3DCosWall}
                  onChange={(e) => setShow3DCosWall(e.target.checked)}
                  className="accent-[#C85A32]"
                />
                <span>{show3DNegHelix ? 'Floor Sum Shadow' : 'cos(ωt) Floor Shadow'}</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-[#1A1917]">
                <input
                  type="checkbox"
                  checked={show3DSinWall}
                  onChange={(e) => setShow3DSinWall(e.target.checked)}
                  className="accent-[#C85A32]"
                />
                <span>{show3DNegHelix ? '±Im Wall Shadows' : 'sin(ωt) Wall Shadow'}</span>
              </label>
              <label className="inline-flex items-center gap-1.5 cursor-pointer text-[#1A1917]">
                <input
                  type="checkbox"
                  checked={show3DAxesBox}
                  onChange={(e) => setShow3DAxesBox(e.target.checked)}
                  className="accent-[#C85A32]"
                />
                <span>Projection Walls</span>
              </label>
            </div>

            <button
              type="button"
              onClick={handleResetCamera}
              className="px-2 py-0.5 text-[11px] font-mono bg-white border border-[#E6E4DD] rounded hover:bg-[#FAF9F6] text-[#1A1917] cursor-pointer"
            >
              Reset 3D View
            </button>
          </div>
        </div>
      );
    }

    if (labMode === 'euler') {
      return (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E6E4DD] text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[11px] font-mono font-semibold text-[#75736E] uppercase">
              Overlays:
            </span>
            <label
              className="inline-flex items-center gap-1.5 cursor-pointer text-[#1A1917]"
              title="Highlight Re(z) = r cos θ on horizontal axis and Im(z) = r sin θ on vertical axis"
            >
              <input
                type="checkbox"
                checked={showProjections}
                onChange={(e) => setShowProjections(e.target.checked)}
                className="accent-[#C85A32]"
              />
              <span>Axis Projections</span>
            </label>
            <label
              className="inline-flex items-center gap-1.5 cursor-pointer text-[#1A1917]"
              title="Display r = 1 unit circle reference"
            >
              <input
                type="checkbox"
                checked={showUnitCircle}
                onChange={(e) => setShowUnitCircle(e.target.checked)}
                className="accent-[#C85A32]"
              />
              <span>Unit Circle (r=1)</span>
            </label>
            <label
              className="inline-flex items-center gap-1.5 cursor-pointer text-[#1A1917]"
              title="Overlay complex conjugate z* = r e^(-jθ) reflected across Real axis"
            >
              <input
                type="checkbox"
                checked={showConjugate}
                onChange={(e) => setShowConjugate(e.target.checked)}
                className="accent-[#C85A32]"
              />
              <span>Conjugate z*</span>
            </label>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setThetaDeg((prev) => (prev - 15 + 360) % 360)}
              className="px-2 py-0.5 text-xs font-mono bg-white border border-[#E6E4DD] rounded hover:bg-[#FAF9F6] text-[#1A1917] cursor-pointer"
              title="Step angle backward 15°"
            >
              −15°
            </button>
            <button
              type="button"
              onClick={() => setThetaDeg((prev) => (prev + 15) % 360)}
              className="px-2 py-0.5 text-xs font-mono bg-white border border-[#E6E4DD] rounded hover:bg-[#FAF9F6] text-[#1A1917] cursor-pointer"
              title="Step angle forward 15°"
            >
              +15°
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E6E4DD] text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-mono font-semibold text-[#75736E] uppercase flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" />
            <span>View:</span>
          </span>
          <div className="inline-flex items-center bg-white border border-[#E6E4DD] rounded p-0.5 gap-0.5">
            {[
              { id: 'both', label: 'Vectors + Sum' },
              { id: 'individual', label: 'Individual (±ω)' },
              { id: 'combined', label: 'Combined Real Sum' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setVectorViewMode(opt.id)}
                className={`px-2 py-1 rounded text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                  vectorViewMode === opt.id
                    ? 'bg-[#1A1917] text-white'
                    : 'text-[#585651] hover:text-[#1A1917]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex items-center bg-white border border-[#E6E4DD] rounded p-0.5 gap-0.5">
            <button
              type="button"
              onClick={() => setSynthesisTarget('cosine')}
              className={`px-2 py-1 rounded text-[11px] font-mono font-semibold transition-colors cursor-pointer ${
                synthesisTarget === 'cosine'
                  ? 'bg-[#C85A32] text-white'
                  : 'text-[#585651] hover:text-[#1A1917]'
              }`}
              title="cos(ωt) = ½[e^(+jωt) + e^(-jωt)]"
            >
              cos(ωt)
            </button>
            <button
              type="button"
              onClick={() => setSynthesisTarget('sine')}
              className={`px-2 py-1 rounded text-[11px] font-mono font-semibold transition-colors cursor-pointer ${
                synthesisTarget === 'sine'
                  ? 'bg-[#3B6780] text-white'
                  : 'text-[#585651] hover:text-[#1A1917]'
              }`}
              title="sin(ωt) = [e^(+jωt) − e^(-jωt)] / 2j"
            >
              sin(ωt)
            </button>
          </div>

          <label
            className="inline-flex items-center gap-1.5 cursor-pointer text-[#1A1917]"
            title="Show dashed +Im and −Im wave components that cancel to zero"
          >
            <input
              type="checkbox"
              checked={showImWaves}
              onChange={(e) => setShowImWaves(e.target.checked)}
              className="accent-[#C85A32]"
            />
            <span>Show Cancelling ±Im Waves</span>
          </label>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {/* =================================================================== */}
      {/* 1. CLEAN MODULE HEADER                                              */}
      {/* =================================================================== */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-[#E6E4DD]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#75736E] mb-1.5">
            <span className="font-bold text-[#C85A32]">MODULE 06</span>
            <span aria-hidden="true">·</span>
            <span>Phasors &amp; Complex Exponential Signals</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1917]">
            Euler&apos;s Identity &amp; Complex Exponential Signals
          </h1>
          <p className="mt-1 text-sm text-[#585651] max-w-3xl leading-relaxed">
            Explore how rotating phasors{' '}
            <code className="text-xs font-mono bg-[#FAF9F6] px-1 py-0.5 rounded border border-[#E6E4DD] text-[#1A1917]">
              e^(jθ) = cos(θ) + j sin(θ)
            </code>{' '}
            unroll into cosine and sine waves, how positive and negative frequencies combine, and how they spiral in 3D space.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {onNavigateHome && (
            <button
              type="button"
              onClick={onNavigateHome}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#585651] hover:text-[#1A1917] bg-white border border-[#E6E4DD] hover:bg-[#FAF9F6] px-3 py-1.5 rounded-md transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Workspace Hub</span>
            </button>
          )}
        </div>
      </header>

      {/* =================================================================== */}
      {/* 2. PRIMARY INTERACTIVE LABORATORY STAGE                             */}
      {/* =================================================================== */}
      <section className="bg-white rounded-lg border border-[#E6E4DD] p-4 sm:p-5 shadow-xs space-y-4">
        {/* Top Bar: 3 Mode Tabs + Live Coordinate Summary */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E6E4DD]">
          <div
            className="inline-flex flex-wrap items-center bg-[#FAF9F6] border border-[#E6E4DD] rounded-md p-1 gap-1"
            role="tablist"
            aria-label="Euler visualization modes"
          >
            <button
              type="button"
              role="tab"
              aria-selected={labMode === 'euler'}
              onClick={() => setLabMode('euler')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                labMode === 'euler'
                  ? 'bg-[#1A1917] text-white shadow-2xs'
                  : 'text-[#585651] hover:text-[#1A1917]'
              }`}
            >
              <Compass className="w-3.5 h-3.5 text-[#C85A32]" />
              <span>01. Euler&apos;s Identity &amp; Complex Plane</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={labMode === 'counter-rotating'}
              onClick={() => setLabMode('counter-rotating')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                labMode === 'counter-rotating'
                  ? 'bg-[#1A1917] text-white shadow-2xs'
                  : 'text-[#585651] hover:text-[#1A1917]'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-[#C85A32]" />
              <span>02. Positive &amp; Negative Frequencies (±ω)</span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={labMode === '3d'}
              onClick={() => setLabMode('3d')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                labMode === '3d'
                  ? 'bg-[#1A1917] text-white shadow-2xs'
                  : 'text-[#585651] hover:text-[#1A1917]'
              }`}
            >
              <Box className="w-3.5 h-3.5 text-[#C85A32]" />
              <span>03. 3D Helix View</span>
            </button>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono tabular-nums text-[#585651]">
            <span>
              θ = <strong className="text-[#C85A32]">{Math.round(thetaDeg)}°</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Re = <strong className="text-[#1A1917]">{realPart.toFixed(2)}</strong>
            </span>
            <span aria-hidden="true">·</span>
            <span>
              Im = <strong className="text-[#3B6780]">{imagPart.toFixed(2)}</strong>
            </span>
          </div>
        </div>

        {/* Playback & View Toolbar */}
        <SimulationToolbar
          playbackState={playbackState}
          onPlay={() => setPlaybackState('playing')}
          onPause={() => setPlaybackState('paused')}
          onReset={handleReset}
          speed={speed}
          onSpeedChange={setSpeed}
          isGridVisible={isGridVisible}
          onToggleGrid={() => setIsGridVisible((v) => !v)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen((v) => !v)}
          isLiveSimulationReady={true}
        />

        {/* Active Visualization Stage */}
        {renderVisualizationCanvas(false)}

        {/* Beginner Live Guidance Callout */}
        <div className="flex items-start gap-2.5 px-3.5 py-2.5 rounded-md bg-[#FAF9F6] border border-[#E6E4DD] text-xs text-[#484642]">
          <Info className="w-4 h-4 text-[#C85A32] shrink-0 mt-0.5" />
          <p className="leading-relaxed">{beginnerInsight}</p>
        </div>

        {/* Controls Panel */}
        <div className="p-4 rounded-md bg-[#FAF9F6] border border-[#E6E4DD] space-y-3.5">
          {renderParameterSliders(false)}
          {renderModeSpecificToggles()}

          <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-[#E6E4DD]">
            <span className="text-[11px] font-mono font-semibold text-[#75736E] uppercase mr-1 inline-flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#C85A32]" />
              <span>Key Angles:</span>
            </span>
            {anglePresets.map((p) => {
              const isSelected = Math.round(thetaDeg) % 360 === p.deg;
              return (
                <button
                  key={p.deg}
                  type="button"
                  onClick={() => {
                    setThetaDeg(p.deg);
                    setAnnouncement(`Angle set to ${p.label} (${p.sub})`);
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-mono border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#1A1917] text-white border-[#1A1917] font-semibold'
                      : 'bg-white text-[#585651] border-[#E6E4DD] hover:text-[#1A1917]'
                  }`}
                  title={p.sub}
                >
                  {p.label} <span className="opacity-75 text-[10px]">({p.sub})</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Live Telemetry Readout Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 rounded-md bg-[#FAF9F6] border border-[#E6E4DD]">
            <div className="text-[11px] font-mono text-[#75736E]">Polar Representation</div>
            <div className="text-sm font-bold font-mono text-[#1A1917] mt-0.5 tabular-nums">
              {amplitude.toFixed(2)}·e^(j·{Math.round(thetaDeg)}°)
            </div>
            <div className="text-[11px] font-mono text-[#75736E] mt-0.5">
              t = {equivalentTimeSec.toFixed(2)} s
            </div>
          </div>

          <div className="p-3 rounded-md bg-[#FAF9F6] border border-[#E6E4DD]">
            <div className="text-[11px] font-mono text-[#75736E]">Rectangular Form</div>
            <div className="text-sm font-bold font-mono text-[#1A1917] mt-0.5 tabular-nums">
              {realPart.toFixed(2)} {imagPart >= 0 ? '+' : '−'} j{Math.abs(imagPart).toFixed(2)}
            </div>
            <div className="text-[11px] font-mono text-[#75736E] mt-0.5">
              z = x + jy
            </div>
          </div>

          <div className="p-3 rounded-md bg-[#FAF9F6] border border-[#E6E4DD]">
            <div className="text-[11px] font-mono text-[#75736E]">Real Projection (I)</div>
            <div className="text-sm font-bold font-mono text-[#C85A32] mt-0.5 tabular-nums">
              {realPart.toFixed(3)}
            </div>
            <div className="text-[11px] font-mono text-[#75736E] mt-0.5">
              r·cos(θ)
            </div>
          </div>

          <div className="p-3 rounded-md bg-[#FAF9F6] border border-[#E6E4DD]">
            <div className="text-[11px] font-mono text-[#75736E]">Imaginary Projection (Q)</div>
            <div className="text-sm font-bold font-mono text-[#3B6780] mt-0.5 tabular-nums">
              {imagPart.toFixed(3)}
            </div>
            <div className="text-[11px] font-mono text-[#75736E] mt-0.5">
              r·sin(θ)
            </div>
          </div>
        </div>
      </section>

      {/* =================================================================== */}
      {/* 3. ANALYTICAL FOUNDATIONS & BEGINNER CONCEPTS (BELOW WORKBENCH)     */}
      {/* =================================================================== */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-5 space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#75736E] uppercase">
            <BookOpen className="w-4 h-4 text-[#C85A32]" />
            <span>Analytical Relations</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 bg-white rounded border border-[#E6E4DD]">
              <h3 className="text-xs font-bold text-[#1A1917] mb-1.5">Euler&apos;s Formula &amp; Identity</h3>
              <div className="overflow-x-auto">
                <MathView math="e^{j\theta} = \cos(\theta) + j\sin(\theta)" displayMode={true} />
                <MathView math="\theta = \pi \implies e^{j\pi} + 1 = 0" displayMode={true} />
              </div>
              <p className="text-xs text-[#585651] mt-1.5 leading-relaxed">
                Rotating counter-clockwise by angle <span className="font-mono">θ</span> traces the unit circle; its horizontal shadow is cosine and vertical shadow is sine.
              </p>
            </div>

            <div className="p-3.5 bg-white rounded border border-[#E6E4DD]">
              <h3 className="text-xs font-bold text-[#1A1917] mb-1.5">Inverse Euler (Real Sinusoids)</h3>
              <div className="overflow-x-auto">
                <MathView math="\cos(\omega t) = \frac{e^{+j\omega t} + e^{-j\omega t}}{2}" displayMode={true} />
                <MathView math="\sin(\omega t) = \frac{e^{+j\omega t} - e^{-j\omega t}}{2j}" displayMode={true} />
              </div>
              <p className="text-xs text-[#585651] mt-1.5 leading-relaxed">
                Adding a positive-frequency phasor (<span className="font-mono">+ω</span>) and negative-frequency phasor (<span className="font-mono">−ω</span>) cancels imaginary parts to yield a real wave.
              </p>
            </div>
          </div>

          <div className="p-3 bg-white rounded border border-[#E6E4DD] flex items-center justify-between text-xs font-mono text-[#585651]">
            <span>Active Angle in Radians:</span>
            <MathView math={`\\theta = ${piFractionLatex}\\text{ rad} \\quad (${thetaRad.toFixed(3)})`} />
          </div>
        </div>

        <div className="lg:col-span-5 bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#75736E] uppercase">
            <Layers className="w-4 h-4 text-[#C85A32]" />
            <span>Quick Learning Checklist</span>
          </div>

          <ul className="space-y-2.5 text-xs text-[#484642]">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#C85A32] shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#1A1917]">Why Complex Numbers?</strong> A single rotating vector compactly carries both amplitude (<span className="font-mono">|z|</span>) and phase (<span className="font-mono">θ</span>) used in I/Q modulation and Fourier transforms.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#C85A32] shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#1A1917]">Why Negative Frequencies Exist:</strong> Real cosine signals require two symmetric spectral lines at <span className="font-mono">−f₀</span> and <span className="font-mono">+f₀</span> so their imaginary parts cancel identically.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#C85A32] shrink-0 mt-0.5" />
              <span>
                <strong className="text-[#1A1917]">3D Perspective:</strong> Open <em>03. 3D Helix View</em> and switch between <strong>Front</strong>, <strong>Top</strong>, and <strong>Side</strong> camera views to see how one helix creates all three 2D views.
              </span>
            </li>
          </ul>
        </div>
      </section>

      {/* =================================================================== */}
      {/* 4. FULLSCREEN IMMERSIVE WINDOW + STICKY OVERLAY CONTROLS            */}
      {/* =================================================================== */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-[#FAF9F6] flex flex-col overflow-hidden">
          {/* Slim Single-Line Top Fullscreen Header */}
          <div className="flex items-center justify-between gap-2 px-4 py-2 bg-white/95 backdrop-blur-sm border-b border-[#E6E4DD] shrink-0 whitespace-nowrap overflow-x-auto z-20">
            <div className="flex items-center gap-2 shrink-0">
              <Compass className="w-4 h-4 text-[#C85A32]" />
              <span className="text-sm font-bold text-[#1A1917]">
                <span className="hidden lg:inline">Module 06: </span>Euler &amp; Complex Signals
              </span>

              <div className="inline-flex items-center bg-[#EFECE5] border border-[#E6E4DD] rounded p-0.5 gap-0.5 text-[11px] font-mono">
                <button
                  type="button"
                  onClick={() => setLabMode('euler')}
                  className={`px-2 py-1 rounded font-semibold cursor-pointer transition-colors ${
                    labMode === 'euler'
                      ? 'bg-white text-[#1A1917] border border-[#E6E4DD] shadow-2xs'
                      : 'text-[#585651] hover:text-[#1A1917]'
                  }`}
                >
                  01 Euler Plane
                </button>
                <button
                  type="button"
                  onClick={() => setLabMode('counter-rotating')}
                  className={`px-2 py-1 rounded font-semibold cursor-pointer transition-colors ${
                    labMode === 'counter-rotating'
                      ? 'bg-white text-[#1A1917] border border-[#E6E4DD] shadow-2xs'
                      : 'text-[#585651] hover:text-[#1A1917]'
                  }`}
                >
                  02 ±ω Vectors
                </button>
                <button
                  type="button"
                  onClick={() => setLabMode('3d')}
                  className={`px-2 py-1 rounded font-semibold cursor-pointer transition-colors ${
                    labMode === '3d'
                      ? 'bg-white text-[#1A1917] border border-[#E6E4DD] shadow-2xs'
                      : 'text-[#585651] hover:text-[#1A1917]'
                  }`}
                >
                  03 3D Helix
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() =>
                  setPlaybackState((s) => (s === 'playing' ? 'paused' : 'playing'))
                }
                className="px-2.5 py-1 bg-white border border-[#E6E4DD] rounded text-xs font-semibold text-[#1A1917] hover:bg-[#FAF9F6] flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title={playbackState === 'playing' ? 'Pause (H)' : 'Play (P)'}
              >
                {playbackState === 'playing' ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5" />
                )}
                <span>{playbackState === 'playing' ? 'Pause' : 'Play'}</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="p-1.5 bg-white border border-[#E6E4DD] rounded text-[#585651] hover:text-[#1A1917] cursor-pointer shadow-2xs"
                title="Reset"
                aria-label="Reset simulation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              <label className="flex items-center gap-1 bg-white border border-[#E6E4DD] rounded px-2 py-1 shadow-2xs">
                <span className="text-[10px] font-mono text-[#75736E] uppercase font-semibold">
                  Speed
                </span>
                <select
                  aria-label="Playback speed"
                  value={speed}
                  onChange={(e) => setSpeed(e.target.value)}
                  className="bg-transparent text-[11px] font-mono font-semibold text-[#1A1917] focus:outline-none cursor-pointer"
                >
                  <option value="0.25×">0.25×</option>
                  <option value="0.5×">0.5×</option>
                  <option value="1×">1×</option>
                  <option value="2×">2×</option>
                  <option value="4×">4×</option>
                </select>
              </label>

              <button
                type="button"
                onClick={() => setIsGridVisible((v) => !v)}
                className={`px-2 py-1 rounded text-xs font-medium border flex items-center gap-1 cursor-pointer shadow-2xs ${
                  isGridVisible
                    ? 'bg-[#FBF4F0] border-[#C85A32]/40 text-[#C85A32] font-semibold'
                    : 'bg-white border-[#E6E4DD] text-[#65635E]'
                }`}
              >
                <GridIcon className="w-3.5 h-3.5" />
                <span>Grid</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="px-2.5 py-1 bg-[#1A1917] text-white rounded text-xs font-semibold hover:bg-[#2C2A26] flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Exit Fullscreen (Esc)"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Exit Fullscreen</span>
              </button>
            </div>
          </div>

          {/* Full-Viewport Canvas Stage (100% of remaining height!) */}
          <div className="relative flex-1 min-h-0 w-full overflow-hidden">
            {renderVisualizationCanvas(true)}

            {/* Floating Sticky Overlay Controls Bar (Draggable Anywhere): Major Controls Always Visible, Secondary on Maximize */}
            <DraggableFullscreenControls
              variant="overlay"
              className="w-[min(96%,1060px)] bg-white/90 backdrop-blur-md border border-[#E6E4DD] rounded-lg shadow-lg px-3.5 py-2"
            >
              {/* Compact Bar Header with Live Readout + Maximize/Minimize Toggle */}
              <div className="flex items-center justify-between gap-3 pb-1.5 mb-1.5 border-b border-[#E6E4DD]">
                <div className="flex items-center gap-3 text-[11px] font-mono tabular-nums text-[#585651] overflow-x-auto whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 font-bold text-[#1A1917]">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-[#C85A32]" />
                    <span>Major Controls</span>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    θ = <strong className="text-[#C85A32]">{Math.round(thetaDeg)}°</strong>
                  </span>
                  <span>
                    Re = <strong className="text-[#1A1917]">{realPart.toFixed(2)}</strong>
                  </span>
                  <span>
                    Im = <strong className="text-[#3B6780]">{imagPart.toFixed(2)}</strong>
                  </span>
                  <span>
                    |z| = <strong className="text-[#1A1917]">{amplitude.toFixed(2)}</strong>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsFsControlsCollapsed((c) => !c)}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono font-semibold bg-[#FAF9F6] border border-[#E6E4DD] text-[#1A1917] hover:bg-[#EFECE5] cursor-pointer shrink-0"
                >
                  {isFsControlsCollapsed ? (
                    <>
                      <ChevronUp className="w-3.5 h-3.5" />
                      <span>Maximize Controls</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3.5 h-3.5" />
                      <span>Minimize</span>
                    </>
                  )}
                </button>
              </div>

              {/* Major Controls Always Visible Even When Minimized */}
              {renderParameterSliders(true)}

              {/* Extended Secondary Controls + Key Angles Revealed on Maximize */}
              {!isFsControlsCollapsed && (
                <div className="mt-2 space-y-2">
                  {renderModeSpecificToggles()}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1.5 border-t border-[#E6E4DD]">
                    <span className="text-[10px] font-mono font-semibold text-[#75736E] uppercase mr-1">
                      Angles:
                    </span>
                    {anglePresets.map((p) => {
                      const isSelected = Math.round(thetaDeg) % 360 === p.deg;
                      return (
                        <button
                          key={p.deg}
                          type="button"
                          onClick={() => setThetaDeg(p.deg)}
                          className={`px-2 py-0.5 rounded text-[11px] font-mono border transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#1A1917] text-white border-[#1A1917] font-semibold'
                              : 'bg-white text-[#585651] border-[#E6E4DD] hover:text-[#1A1917]'
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </DraggableFullscreenControls>
          </div>
        </div>
      )}
    </div>
  );
}
