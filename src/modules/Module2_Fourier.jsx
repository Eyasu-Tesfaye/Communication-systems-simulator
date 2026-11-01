/**
 * Module 2: Fourier Analysis & 3D Frequency Transformation Space
 * Filename: Module2_Fourier.jsx
 * 
 * Elite, self-contained Fourier Analysis Laboratory:
 * 1. Live Fourier Series Approximation & Companion Magnitude Spectrum (2D View):
 *    - Time-domain synthesis & 2D Magnitude Spectrum pulled out into clean, unnested cards
 *    - Full 25-Harmonic Magnitude Spectrum (k = 1 .. 25) with Dirac stem plot representation
 *    - Simulation window & interactive controls starting at the exact same height
 *    - Side-by-side 2D layout in Fullscreen mode (Signal Synthesis on left, Magnitude Spectrum on right)
 * 
 * 2. Interactive 3D Frequency Transformation View:
 *    - Spatial mapping: Time (X-axis), Frequency (Y-axis), Magnitude (Z-axis)
 *    - Maximize canvas height in fullscreen without awkward aspect ratios
 *    - 3D "Spikes Only" isolation mode to visualize discrete spectral lines in 3D
 *    - 3D Zoom slider and presets (Isometric, Time Wall, Spectrum Wall at 270° facing forward, Top-down)
 *    - Orbit drag controls (mouse/touch)
 * 
 * 3. Ergonomic Sticky Controls & Hotkeys:
 *    - Speed controls available in regular and fullscreen views
 *    - Hotkeys: P for Play, H for Pause, Esc for Exit Fullscreen
 *    - Sticky eye-level controls in regular view alongside visualizer
 *    - Sticky docked bottom controls in fullscreen mode that never obscure graph contents
 *    - Swapped analytical formulation and curricular topics to the lower page section
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Sparkles,
  Box,
  SlidersHorizontal,
  Play,
  Pause,
  RotateCcw,
  Maximize2,
  Minimize2,
  BookOpen,
  TrendingUp,
  Layers,
  Activity,
  Check,
} from 'lucide-react';
import { MathView } from '../components/MathView';
import { SimulationToolbar } from '../components/SimulationToolbar';

export default function Module2_Fourier({
  onNavigateHome,
  onNavigateModule,
  isInstructorMode = true,
}) {
  // Navigation & View Mode: '2d' (Synthesis & Spectrum) | '3d' (3D Time-Frequency Waterfall)
  const [viewMode, setViewMode] = useState('2d');
  const [isGridVisible, setIsGridVisible] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Playback & Animation State
  const [playbackState, setPlaybackState] = useState('paused');
  const [speed, setSpeed] = useState('1×');
  const [animTime, setAnimTime] = useState(0);

  // Fourier Series Approximation Parameters
  const [signalType, setSignalType] = useState('square'); // 'square' | 'sawtooth' | 'triangle'
  const [harmonicsN, setHarmonicsN] = useState(5); // 1 to 25
  const [fundamentalF0, setFundamentalF0] = useState(1.0); // 0.5 to 2.5 Hz
  const [showIdealTarget, setShowIdealTarget] = useState(true);
  const [selectedHarmonicHover, setSelectedHarmonicHover] = useState(null);

  // 3D Frequency Transformation Space Controls
  const [cameraYaw, setCameraYaw] = useState(42); // degrees azimuth (orbit drag)
  const [cameraPitch, setCameraPitch] = useState(28); // degrees elevation (orbit drag)
  const [cameraZoom, setCameraZoom] = useState(1.0); // 0.6 to 1.8
  const [showSpikesOnly, setShowSpikesOnly] = useState(false); // isolates frequency spectrum spikes in 3D
  const [show3DProjections, setShow3DProjections] = useState(true); // show walls at f=0 and t=end
  const [show3DRibbons, setShow3DRibbons] = useState(true); // show filled 3D ribbons
  const [show3DPlanes, setShow3DPlanes] = useState(true); // show coordinate bounding floor

  // Refs for animation and canvas
  const animFrameRef = useRef(null);
  const lastTimeRef = useRef(0);
  const canvas3DRef = useRef(null);
  const canvas3DFullscreenRef = useRef(null);
  const isDragging3DRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, yaw: 0, pitch: 0 });

  // Keyboard hotkeys listener: P for Play, H for Pause, Esc for Exit Fullscreen
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is currently typing in an input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        setPlaybackState('playing');
      } else if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        setPlaybackState('paused');
      } else if (e.key === 'Escape') {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Animation Loop
  useEffect(() => {
    if (playbackState === 'playing') {
      const speedMult =
        speed === '0.25×'
          ? 0.25
          : speed === '0.5×'
          ? 0.5
          : speed === '2×'
          ? 2
          : speed === '4×'
          ? 4
          : 1;

      const loop = (timestamp) => {
        if (!lastTimeRef.current) lastTimeRef.current = timestamp;
        const dt = (timestamp - lastTimeRef.current) / 1000;
        lastTimeRef.current = timestamp;

        setAnimTime((prev) => (prev + dt * speedMult) % 100);
        animFrameRef.current = requestAnimationFrame(loop);
      };

      animFrameRef.current = requestAnimationFrame(loop);
    } else {
      lastTimeRef.current = 0;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [playbackState, speed]);

  // Compute Fourier Harmonic Coefficients c_k and Time Series (All 25 Harmonics)
  const {
    harmonicList,
    synthesizedWavePoints,
    idealWavePoints,
    gibbsOvershootPct,
  } = useMemo(() => {
    const maxK = 25;
    const list = [];

    for (let k = 1; k <= maxK; k++) {
      let b_k = 0;
      let phase = 0;

      if (signalType === 'square') {
        // Odd harmonics only: b_k = 4 / (pi * k)
        if (k % 2 === 1) {
          b_k = 4 / (Math.PI * k);
        }
      } else if (signalType === 'sawtooth') {
        // All harmonics: b_k = (2 / (pi * k)) * (-1)^(k+1)
        b_k = (2 / (Math.PI * k)) * (k % 2 === 1 ? 1 : -1);
      } else if (signalType === 'triangle') {
        // Odd harmonics with 1/k^2 decay
        if (k % 2 === 1) {
          const sign = ((k - 1) / 2) % 2 === 0 ? 1 : -1;
          b_k = (8 / (Math.PI * Math.PI * (k * k))) * sign;
        }
      }

      list.push({
        k,
        magnitude: Math.abs(b_k),
        rawCoeff: b_k,
        phase,
        active: k <= harmonicsN,
        freqHz: k * fundamentalF0,
      });
    }

    // Time-domain synthesis points (Normalized time over 2 periods)
    const numPoints = 260;
    const synthPoints = [];
    const idealPoints = [];

    const omega0 = 2 * Math.PI * fundamentalF0;
    const currentPhaseOffset = animTime * omega0;

    let maxSynthesizedVal = 0;

    for (let i = 0; i < numPoints; i++) {
      const tNorm = (i / (numPoints - 1)) * 2; // t from 0 to 2 seconds
      const t = tNorm;

      // Partial Fourier Sum
      let sum = 0;
      for (const h of list) {
        if (!h.active || h.rawCoeff === 0) continue;
        sum += h.rawCoeff * Math.sin(h.k * omega0 * t - h.k * currentPhaseOffset);
      }

      synthPoints.push({ t, y: sum });
      if (Math.abs(sum) > maxSynthesizedVal) {
        maxSynthesizedVal = Math.abs(sum);
      }

      // Target Ideal Periodic Signals
      let idealY = 0;
      const tMod = (t * fundamentalF0 - animTime * fundamentalF0) % 1;
      const posT = tMod < 0 ? tMod + 1 : tMod;

      if (signalType === 'square') {
        idealY = posT < 0.5 ? 1 : -1;
      } else if (signalType === 'sawtooth') {
        idealY = 2 * (posT - 0.5);
      } else if (signalType === 'triangle') {
        idealY = posT < 0.5 ? 4 * posT - 1 : 3 - 4 * posT;
      }

      idealPoints.push({ t, y: idealY });
    }

    // Gibbs Phenomenon Overshoot Percentage
    let overshoot = 0;
    if (signalType === 'square') {
      overshoot = Math.max(0, ((maxSynthesizedVal - 1.0) / 1.0) * 100);
    } else if (signalType === 'sawtooth') {
      overshoot = Math.max(0, ((maxSynthesizedVal - 1.0) / 1.0) * 100);
    }

    return {
      harmonicList: list,
      synthesizedWavePoints: synthPoints,
      idealWavePoints: idealPoints,
      gibbsOvershootPct: overshoot.toFixed(1),
    };
  }, [signalType, harmonicsN, fundamentalF0, animTime]);

  // Preset step handler for beginner-friendly controller
  const handleHarmonicPreset = (n) => {
    setHarmonicsN(n);
  };

  // 3D Camera Preset Viewpoints
  const setCameraPreset = (preset) => {
    switch (preset) {
      case 'iso':
        setCameraYaw(42);
        setCameraPitch(26);
        setCameraZoom(1.0);
        break;
      case 'time': // View down Frequency axis: reveals pure time-domain wave
        setCameraYaw(0);
        setCameraPitch(0);
        setCameraZoom(1.05);
        break;
      case 'freq': // View directly facing the Spectrum Wall (Time axis end, frequency running left-to-right)
        setCameraYaw(270);
        setCameraPitch(0);
        setCameraZoom(1.05);
        break;
      case 'top': // Look from above (Spectrogram time vs frequency)
        setCameraYaw(45);
        setCameraPitch(85);
        setCameraZoom(1.1);
        break;
      default:
        break;
    }
  };

  // Reusable 3D Canvas Drawer
  const draw3DScene = useCallback((canvas) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 600;
    const height = rect.height || 400;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    // Camera angles
    const radYaw = (cameraYaw * Math.PI) / 180;
    const radPitch = (cameraPitch * Math.PI) / 180;
    const cosY = Math.cos(radYaw);
    const sinY = Math.sin(radYaw);
    const cosP = Math.cos(radPitch);
    const sinP = Math.sin(radPitch);

    const centerX = width / 2;
    const centerY = height / 2 + 10;
    const scale = Math.min(width, height) * 0.44 * cameraZoom;

    // 3D Transformer: Model space (-1 to +1) to 2D screen
    const project = (x, y, z) => {
      const x1 = x * cosY - y * sinY;
      const y1 = x * sinY + y * cosY;
      const z1 = z;

      const x2 = x1;
      const y2 = y1 * cosP - z1 * sinP;
      const z2 = y1 * sinP + z1 * cosP;

      const dist = 3.2;
      const pScale = (dist / (dist + y2)) * scale;

      return {
        px: centerX + x2 * pScale,
        py: centerY - z2 * pScale,
        depth: y2,
      };
    };

    // Draw Subtle 3D Coordinate Plane Grids
    if (show3DPlanes && isGridVisible) {
      ctx.lineWidth = 1;
      const floorZ = -0.75;
      ctx.strokeStyle = '#EBE8DF';

      for (let x = -1; x <= 1.01; x += 0.5) {
        const p1 = project(x, -1, floorZ);
        const p2 = project(x, 1, floorZ);
        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.stroke();
      }

      for (let y = -1; y <= 1.01; y += 0.5) {
        const p1 = project(-1, y, floorZ);
        const p2 = project(1, y, floorZ);
        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.stroke();
      }
    }

    // Draw 3D Axes
    const origin = project(-1, -1, -0.75);
    const endX = project(1.15, -1, -0.75);
    const endY = project(-1, 1.15, -0.75);
    const endZ = project(-1, -1, 0.95);

    // X Axis (Time)
    ctx.strokeStyle = '#585651';
    ctx.lineWidth = 1.75;
    ctx.beginPath();
    ctx.moveTo(origin.px, origin.py);
    ctx.lineTo(endX.px, endX.py);
    ctx.stroke();

    // Y Axis (Frequency)
    ctx.strokeStyle = '#75736E';
    ctx.beginPath();
    ctx.moveTo(origin.px, origin.py);
    ctx.lineTo(endY.px, endY.py);
    ctx.stroke();

    // Z Axis (Magnitude)
    ctx.strokeStyle = '#C85A32';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(origin.px, origin.py);
    ctx.lineTo(endZ.px, endZ.py);
    ctx.stroke();

    // Axis Labels
    ctx.font = '600 11px "JetBrains Mono", monospace';
    ctx.fillStyle = '#1A1917';
    ctx.fillText('Time (t) →', endX.px + 6, endX.py + 4);

    ctx.fillStyle = '#585651';
    ctx.fillText('Frequency (f) →', endY.px + 6, endY.py + 4);

    ctx.fillStyle = '#C85A32';
    ctx.fillText('Magnitude (A) ↑', endZ.px - 20, endZ.py - 8);

    // Active Harmonics
    const activeHarmonics = harmonicList.filter((h) => h.active && h.rawCoeff !== 0);
    const numHarmonicsShown = Math.min(14, activeHarmonics.length);

    const harmonicColors = [
      '#C85A32',
      '#D46B45',
      '#DF7D59',
      '#EA906E',
      '#F2A485',
      '#B04C27',
      '#99401F',
      '#823518',
    ];

    const renderElements = [];

    // Collect 3D elements for depth sorting
    activeHarmonics.slice(0, numHarmonicsShown).forEach((h, idx) => {
      const normY = -0.7 + (idx / Math.max(1, numHarmonicsShown - 1)) * 1.5;

      // Only generate time-domain sinusoidal slices if NOT in Spikes-Only mode
      if (!showSpikesOnly) {
        const pts = [];
        const samples = 80;
        const phase = animTime * 2 * Math.PI * fundamentalF0;

        for (let s = 0; s <= samples; s++) {
          const normX = -0.95 + (s / samples) * 1.9;
          const t = (s / samples) * 2;
          const z =
            -0.75 +
            h.rawCoeff * Math.sin(2 * Math.PI * h.k * fundamentalF0 * t - h.k * phase) * 0.85;
          pts.push({ x: normX, y: normY, z });
        }

        const projectedPts = pts.map((pt) => project(pt.x, pt.y, pt.z));
        const avgDepth =
          projectedPts.reduce((acc, p) => acc + p.depth, 0) / projectedPts.length;

        renderElements.push({
          type: 'harmonic-slice',
          k: h.k,
          normY,
          points: projectedPts,
          depth: avgDepth,
          color: harmonicColors[idx % harmonicColors.length],
          coeff: h.rawCoeff,
          mag: h.magnitude,
        });
      }

      // Harmonic Spectral Spikes
      const spikeBase = project(1.0, normY, -0.75);
      const spikeTop = project(1.0, normY, -0.75 + h.magnitude * 0.95);
      renderElements.push({
        type: 'spectrum-spike',
        depth: spikeBase.depth,
        base: spikeBase,
        top: spikeTop,
        k: h.k,
        mag: h.magnitude,
        freqHz: h.freqHz,
        color: harmonicColors[idx % harmonicColors.length],
      });
    });

    // Composite Synthesized Wave (hidden in Spikes-Only mode)
    if (!showSpikesOnly && show3DProjections) {
      const compPts = [];
      const samples = 100;
      for (let s = 0; s <= samples; s++) {
        const normX = -0.95 + (s / samples) * 1.9;
        const pt =
          synthesizedWavePoints[
            Math.floor((s / samples) * (synthesizedWavePoints.length - 1))
          ];
        const val = pt ? pt.y : 0;
        const z = -0.75 + val * 0.75;
        compPts.push(project(normX, -0.95, z));
      }
      renderElements.push({
        type: 'composite-wave',
        depth: compPts[0]?.depth || 0,
        points: compPts,
      });
    }

    // Sort elements by depth (farthest first)
    renderElements.sort((a, b) => b.depth - a.depth);

    // Draw elements
    renderElements.forEach((el) => {
      if (el.type === 'harmonic-slice') {
        if (show3DRibbons) {
          ctx.beginPath();
          el.points.forEach((p, i) => {
            if (i === 0) ctx.moveTo(p.px, p.py);
            else ctx.lineTo(p.px, p.py);
          });
          const lastBase = project(0.95, el.normY, -0.75);
          const firstBase = project(-0.95, el.normY, -0.75);
          ctx.lineTo(lastBase.px, lastBase.py);
          ctx.lineTo(firstBase.px, firstBase.py);
          ctx.closePath();
          ctx.fillStyle = el.color + '1A';
          ctx.fill();
        }

        ctx.beginPath();
        el.points.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.px, p.py);
          else ctx.lineTo(p.px, p.py);
        });
        ctx.strokeStyle = el.color;
        ctx.lineWidth = 2.0;
        ctx.stroke();

        const labelPt = el.points[0];
        ctx.font = '500 9px "JetBrains Mono", monospace';
        ctx.fillStyle = el.color;
        ctx.fillText(`k=${el.k}`, labelPt.px - 22, labelPt.py + 3);
      } else if (el.type === 'spectrum-spike') {
        ctx.beginPath();
        ctx.moveTo(el.base.px, el.base.py);
        ctx.lineTo(el.top.px, el.top.py);
        ctx.strokeStyle = el.color;
        ctx.lineWidth = showSpikesOnly ? 3.5 : 2.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(el.top.px, el.top.py, showSpikesOnly ? 4.5 : 3.5, 0, 2 * Math.PI);
        ctx.fillStyle = el.color;
        ctx.fill();

        if (showSpikesOnly) {
          ctx.font = '600 10px "JetBrains Mono", monospace';
          ctx.fillStyle = '#1A1917';
          ctx.fillText(`k=${el.k}`, el.top.px + 6, el.top.py - 2);
          ctx.font = '400 9px "JetBrains Mono", monospace';
          ctx.fillStyle = '#75736E';
          ctx.fillText(`|c_k|=${el.mag.toFixed(2)}`, el.top.px + 6, el.top.py + 10);
        }
      } else if (el.type === 'composite-wave') {
        ctx.beginPath();
        el.points.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.px, p.py);
          else ctx.lineTo(p.px, p.py);
        });
        ctx.strokeStyle = '#1A1917';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        if (el.points[el.points.length - 1]) {
          const pEnd = el.points[el.points.length - 1];
          ctx.font = '700 10px "JetBrains Mono", monospace';
          ctx.fillStyle = '#1A1917';
          ctx.fillText('x_N(t) Sum', pEnd.px + 5, pEnd.py);
        }
      }
    });

    // 3D Legend Watermark
    ctx.font = '600 10px "Plus Jakarta Sans", sans-serif';
    ctx.fillStyle = '#8A8882';
    ctx.fillText(
      showSpikesOnly
        ? '3D FREQUENCY MAGNITUDE SPECTRUM SPIKES (ISOLATED)'
        : '3D FOURIER TIME-FREQUENCY DECOMPOSITION',
      14,
      22
    );
    ctx.font = '400 9px "JetBrains Mono", monospace';
    ctx.fillText('Orbit: Drag Mouse/Touch · X: Time · Y: Freq · Z: Mag', 14, 36);
  }, [
    cameraYaw,
    cameraPitch,
    cameraZoom,
    showSpikesOnly,
    show3DProjections,
    show3DRibbons,
    show3DPlanes,
    isGridVisible,
    harmonicList,
    synthesizedWavePoints,
    fundamentalF0,
    animTime,
  ]);

  // Render 3D Canvas on state or size updates
  useEffect(() => {
    if (viewMode !== '3d') return;
    requestAnimationFrame(() => {
      if (canvas3DRef.current) {
        draw3DScene(canvas3DRef.current);
      }
      if (isFullscreen && canvas3DFullscreenRef.current) {
        draw3DScene(canvas3DFullscreenRef.current);
      }
    });
  }, [viewMode, isFullscreen, draw3DScene]);

  // Window resize handler for 3D canvas
  useEffect(() => {
    const handleResize = () => {
      if (viewMode === '3d') {
        if (canvas3DRef.current) draw3DScene(canvas3DRef.current);
        if (canvas3DFullscreenRef.current) draw3DScene(canvas3DFullscreenRef.current);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewMode, isFullscreen, draw3DScene]);

  // Mouse & Touch Drag to Orbit 3D Space
  const handleMouseDown3D = (e) => {
    isDragging3DRef.current = true;
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      yaw: cameraYaw,
      pitch: cameraPitch,
    };
  };

  const handleMouseMove3D = useCallback((e) => {
    if (!isDragging3DRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    let newYaw = (dragStartRef.current.yaw + dx * 0.6) % 360;
    if (newYaw < 0) newYaw += 360;

    let newPitch = Math.max(5, Math.min(85, dragStartRef.current.pitch + dy * 0.4));

    setCameraYaw(Math.round(newYaw));
    setCameraPitch(Math.round(newPitch));
  }, []);

  const handleMouseUp3D = useCallback(() => {
    isDragging3DRef.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove3D);
    window.addEventListener('mouseup', handleMouseUp3D);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove3D);
      window.removeEventListener('mouseup', handleMouseUp3D);
    };
  }, [handleMouseMove3D, handleMouseUp3D]);

  // Touch Support for 3D Orbit
  const handleTouchStart3D = (e) => {
    if (e.touches.length === 1) {
      isDragging3DRef.current = true;
      dragStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        yaw: cameraYaw,
        pitch: cameraPitch,
      };
    }
  };

  const handleTouchMove3D = (e) => {
    if (!isDragging3DRef.current || e.touches.length !== 1) return;
    const dx = e.touches[0].clientX - dragStartRef.current.x;
    const dy = e.touches[0].clientY - dragStartRef.current.y;

    let newYaw = (dragStartRef.current.yaw + dx * 0.6) % 360;
    if (newYaw < 0) newYaw += 360;
    let newPitch = Math.max(5, Math.min(85, dragStartRef.current.pitch + dy * 0.4));

    setCameraYaw(Math.round(newYaw));
    setCameraPitch(Math.round(newPitch));
  };

  // 2D SVG Time Path Builder
  const synthSvgPath = useMemo(() => {
    const width = 540;
    const height = 180;
    const centerY = height / 2;
    const scaleY = 62;

    return synthesizedWavePoints.reduce((acc, pt, i) => {
      const x = 30 + (i / (synthesizedWavePoints.length - 1)) * (width - 60);
      const y = centerY - pt.y * scaleY;
      return acc + (i === 0 ? 'M ' : ' L ') + `${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');
  }, [synthesizedWavePoints]);

  const idealSvgPath = useMemo(() => {
    const width = 540;
    const height = 180;
    const centerY = height / 2;
    const scaleY = 62;

    return idealWavePoints.reduce((acc, pt, i) => {
      const x = 30 + (i / (idealWavePoints.length - 1)) * (width - 60);
      const y = centerY - pt.y * scaleY;
      return acc + (i === 0 ? 'M ' : ' L ') + `${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');
  }, [idealWavePoints]);

  // Clean Time-Domain Approximation Component (Pulled out of nested window)
  const renderTimeDomainCard = (isFullscreenView = false) => {
    return (
      <div className={`bg-white rounded-lg border border-[#E6E4DD] p-4 sm:p-5 shadow-xs flex flex-col ${isFullscreenView ? 'h-full' : ''}`}>
        <div className="flex items-center justify-between text-xs font-mono mb-2 pb-2 border-b border-[#E6E4DD]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#C85A32]" />
            <span className="font-bold text-[#1A1917]">Time-Domain Signal Synthesis x_N(t)</span>
          </div>
          <div className="flex items-center gap-3">
            {gibbsOvershootPct > 0 && (
              <span className="text-[10px] text-[#C85A32] bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/25 font-bold">
                Gibbs Peak: +{gibbsOvershootPct}%
              </span>
            )}
            <span className="text-[#C85A32] font-semibold text-xs">
              N = {harmonicsN}
            </span>
          </div>
        </div>

        <div className={`w-full ${isFullscreenView ? 'flex-1 min-h-[220px]' : 'h-52 sm:h-56'} relative flex items-center justify-center`}>
          <svg viewBox="0 0 540 180" className="w-full h-full select-none">
            {/* Grid background lines if enabled */}
            {isGridVisible && (
              <>
                <line x1="30" y1="45" x2="515" y2="45" stroke="#F4F2EC" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="30" y1="135" x2="515" y2="135" stroke="#F4F2EC" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="150" y1="15" x2="150" y2="165" stroke="#F4F2EC" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="270" y1="15" x2="270" y2="165" stroke="#F4F2EC" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="390" y1="15" x2="390" y2="165" stroke="#F4F2EC" strokeWidth="1" strokeDasharray="3 3" />
              </>
            )}

            {/* Horizontal & Vertical Axes */}
            <line x1="30" y1="90" x2="515" y2="90" stroke="#8A8882" strokeWidth="1.25" />
            <line x1="30" y1="15" x2="30" y2="165" stroke="#8A8882" strokeWidth="1.25" />

            {/* Amplitude ticks */}
            <text x="25" y="28" textAnchor="end" className="text-[10px] font-mono fill-[#8A8882]">+1.0</text>
            <text x="25" y="94" textAnchor="end" className="text-[10px] font-mono fill-[#8A8882]">0.0</text>
            <text x="25" y="158" textAnchor="end" className="text-[10px] font-mono fill-[#8A8882]">-1.0</text>
            <text x="520" y="93" className="text-[11px] font-mono font-bold fill-[#585651]">t</text>

            {/* Ideal Target Waveform (Dashed guide) */}
            {showIdealTarget && (
              <path d={idealSvgPath} fill="none" stroke="#C8C4B8" strokeWidth="1.75" strokeDasharray="4 4" />
            )}

            {/* Synthesized Fourier Series Sum Waveform */}
            <path
              d={synthSvgPath}
              fill="none"
              stroke="#C85A32"
              strokeWidth="2.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <div className="flex items-center justify-between text-[11px] text-[#75736E] font-mono pt-2 border-t border-[#F0EFEA] mt-auto">
          <span>- - - Ideal Target ({signalType})</span>
          <span className="text-[#C85A32] font-semibold">— Synthesized Harmonic Sum x_N(t)</span>
        </div>
      </div>
    );
  };

  // Clean Full 25-Harmonic Magnitude Spectrum Component (Pulled out of nested window)
  const renderMagnitudeSpectrumCard = (isFullscreenView = false) => {
    const all25Harmonics = harmonicList.slice(0, 25);

    return (
      <div className={`bg-white rounded-lg border border-[#E6E4DD] p-4 sm:p-5 shadow-xs flex flex-col ${isFullscreenView ? 'h-full' : ''}`}>
        <div className="flex items-center justify-between text-xs font-mono mb-2 pb-2 border-b border-[#E6E4DD]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#1A1917]" />
            <span className="font-bold text-[#1A1917]">Companion 2D Magnitude Spectrum |c_k|</span>
            <span className="text-[10px] bg-[#FAF9F6] text-[#75736E] px-2 py-0.5 rounded border border-[#E6E4DD] font-medium">
              All 25 Harmonics (k = 1 .. 25)
            </span>
          </div>
          <span className="text-[#C85A32] font-semibold text-xs">
            f₀ = {fundamentalF0.toFixed(1)} Hz
          </span>
        </div>

        {/* Generous Height SVG Stem Plot showing ALL 25 Harmonics */}
        <div className={`w-full ${isFullscreenView ? 'flex-1 min-h-[220px]' : 'h-52 sm:h-56'} relative flex items-center justify-center`}>
          <svg viewBox="0 0 560 170" className="w-full h-full select-none">
            {/* Magnitude Guide Gridlines */}
            <line x1="35" y1="25" x2="540" y2="25" stroke="#F4F2EC" strokeWidth="1" strokeDasharray="2 2" />
            <line x1="35" y1="65" x2="540" y2="65" stroke="#F4F2EC" strokeWidth="1" strokeDasharray="2 2" />
            <line x1="35" y1="105" x2="540" y2="105" stroke="#F4F2EC" strokeWidth="1" strokeDasharray="2 2" />

            {/* Baseline and Vertical Axis */}
            <line x1="35" y1="115" x2="545" y2="115" stroke="#8A8882" strokeWidth="1.5" />
            <line x1="35" y1="15" x2="35" y2="115" stroke="#8A8882" strokeWidth="1.5" />

            {/* Amplitude Ticks */}
            <text x="30" y="28" textAnchor="end" className="text-[9px] font-mono fill-[#8A8882]">1.2</text>
            <text x="30" y="68" textAnchor="end" className="text-[9px] font-mono fill-[#8A8882]">0.8</text>
            <text x="30" y="108" textAnchor="end" className="text-[9px] font-mono fill-[#8A8882]">0.4</text>
            <text x="30" y="119" textAnchor="end" className="text-[9px] font-mono fill-[#8A8882]">0.0</text>
            <text x="548" y="118" className="text-[10px] font-mono font-bold fill-[#585651]">f</text>

            {/* All 25 Harmonic Stems */}
            {all25Harmonics.map((c, i) => {
              const x = 46 + (i / 24) * 485;
              const baselineY = 115;
              // Max scale around 1.35
              const stemHeight = Math.max(0, Math.min(95, (c.magnitude / 1.35) * 95));
              const topY = baselineY - stemHeight;
              const isHovered = selectedHarmonicHover === c.k;

              return (
                <g
                  key={c.k}
                  onMouseEnter={() => setSelectedHarmonicHover(c.k)}
                  onMouseLeave={() => setSelectedHarmonicHover(null)}
                  className="cursor-pointer"
                >
                  {/* Stem Line */}
                  <line
                    x1={x}
                    y1={baselineY}
                    x2={x}
                    y2={topY}
                    stroke={c.active ? (isHovered ? '#B54E28' : '#C85A32') : '#DCD9D0'}
                    strokeWidth={c.active ? (isHovered ? 3.5 : 2.5) : 1.25}
                    strokeLinecap="round"
                  />

                  {/* Stem Marker Dot */}
                  <circle
                    cx={x}
                    cy={topY}
                    r={c.active ? (isHovered ? 4.5 : 3.5) : 2}
                    fill={c.active ? (isHovered ? '#B54E28' : '#C85A32') : '#DCD9D0'}
                  />

                  {/* Peak coefficient value above active spikes */}
                  {c.active && c.magnitude > 0.04 && (
                    <text
                      x={x}
                      y={topY - 5}
                      textAnchor="middle"
                      className={`text-[7.5px] font-mono font-semibold ${
                        isHovered ? 'fill-[#1A1917]' : 'fill-[#C85A32]'
                      }`}
                    >
                      {c.magnitude.toFixed(2)}
                    </text>
                  )}

                  {/* Harmonic Number Label (k) */}
                  <text
                    x={x}
                    y={130}
                    textAnchor="middle"
                    className={`text-[8.5px] font-mono ${
                      c.active ? 'fill-[#1A1917] font-bold' : 'fill-[#9C9A94]'
                    }`}
                  >
                    {c.k}
                  </text>

                  {/* Frequency label in Hz */}
                  <text
                    x={x}
                    y={143}
                    textAnchor="middle"
                    className="text-[7px] font-mono fill-[#8A8882]"
                  >
                    {(c.freqHz).toFixed(0)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        <div className="flex justify-between items-center text-[11px] font-mono text-[#8A8882] pt-2 border-t border-[#F0EFEA] mt-auto">
          <span>Harmonic Index k = 1 .. 25 (Top) · Frequency in Hz (Bottom)</span>
          <span className="text-[#C85A32] font-semibold">Decay: {signalType.toUpperCase()}</span>
        </div>
      </div>
    );
  };

  // Clean 3D Visualizer Component
  const render3DVisualizer = (isFullscreenView = false) => {
    return (
      <div className={`bg-white rounded-lg border border-[#E6E4DD] p-4 sm:p-5 shadow-xs flex flex-col ${isFullscreenView ? 'flex-1 min-h-0' : ''}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2.5 border-b border-[#E6E4DD]">
          <div className="flex items-center gap-2">
            <Box className="w-4 h-4 text-[#C85A32]" />
            <span className="text-xs font-mono font-bold text-[#1A1917]">
              {showSpikesOnly
                ? '3D Magnitude Spectrum Spikes (Isolated Across Frequency)'
                : '3D Time-Frequency Waterfall (X: Time · Y: Freq · Z: Mag)'}
            </span>
          </div>

          {/* 3D Camera Quick Presets */}
          <div className="flex items-center gap-1 bg-[#FAF9F6] p-0.5 rounded border border-[#E6E4DD] text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setCameraPreset('iso')}
              className="px-2 py-0.5 rounded hover:bg-white text-[#585651] hover:text-[#1A1917] cursor-pointer"
              title="Isometric 3D Perspective"
            >
              Isometric
            </button>
            <button
              type="button"
              onClick={() => setCameraPreset('time')}
              className="px-2 py-0.5 rounded hover:bg-white text-[#585651] hover:text-[#1A1917] cursor-pointer"
              title="Look along Frequency axis to inspect Time Wave"
            >
              Time Wall
            </button>
            <button
              type="button"
              onClick={() => setCameraPreset('freq')}
              className="px-2 py-0.5 rounded hover:bg-white text-[#585651] hover:text-[#1A1917] cursor-pointer"
              title="Look directly facing the Spectrum Wall"
            >
              Spectrum Wall
            </button>
            <button
              type="button"
              onClick={() => setCameraPreset('top')}
              className="px-2 py-0.5 rounded hover:bg-white text-[#585651] hover:text-[#1A1917] cursor-pointer"
              title="Top-down time-frequency view"
            >
              Top-Down
            </button>
          </div>
        </div>

        {/* Interactive 3D Canvas Stage */}
        <div
          className={`relative w-full ${
            isFullscreenView ? 'flex-1 min-h-[360px]' : 'h-[440px]'
          } bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden cursor-grab active:cursor-grabbing select-none`}
          onMouseDown={handleMouseDown3D}
          onTouchStart={handleTouchStart3D}
          onTouchMove={handleTouchMove3D}
          onTouchEnd={handleMouseUp3D}
        >
          <canvas
            ref={isFullscreenView ? canvas3DFullscreenRef : canvas3DRef}
            className="w-full h-full block"
          />

          {/* Live 3D Angle Indicator */}
          <div className="absolute bottom-2.5 right-2.5 bg-white/90 backdrop-blur-xs border border-[#E6E4DD] rounded px-2.5 py-1 text-[10px] font-mono text-[#75736E] pointer-events-none shadow-2xs">
            Zoom: {cameraZoom.toFixed(1)}× · Yaw: {cameraYaw}° · Pitch: {cameraPitch}°
          </div>
        </div>

        {/* 3D Visual Toggles */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#585651] pt-2 border-t border-[#F0EFEA]">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowSpikesOnly(!showSpikesOnly)}
              className={`px-3 py-1 rounded text-xs font-mono font-semibold transition-colors border flex items-center gap-1.5 cursor-pointer ${
                showSpikesOnly
                  ? 'bg-[#1A1917] text-white border-[#1A1917]'
                  : 'bg-[#FAF9F6] border-[#E6E4DD] text-[#585651] hover:text-[#1A1917]'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-[#C85A32]" />
              <span>{showSpikesOnly ? '✓ Spikes Only (Harmonics Hidden)' : 'Show Spikes Only'}</span>
            </button>

            {!showSpikesOnly && (
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={show3DRibbons}
                  onChange={(e) => setShow3DRibbons(e.target.checked)}
                  className="accent-[#C85A32] rounded"
                />
                <span>Harmonic Ribbons</span>
              </label>
            )}
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={show3DPlanes}
              onChange={(e) => setShow3DPlanes(e.target.checked)}
              className="accent-[#C85A32] rounded"
            />
            <span>Floor Grid</span>
          </label>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full">
      {/* Module Title Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-[#E6E4DD]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono font-bold tracking-wider text-[#C85A32] bg-[#FBF4F0] px-2.5 py-0.5 rounded border border-[#C85A32]/20">
              MODULE 02
            </span>
            <span className="text-xs text-[#75736E] font-medium">Frequency Domain Transforms</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1917]">
            Module 2: Fourier Analysis
          </h1>
          <p className="mt-1.5 text-sm sm:text-base text-[#585651] max-w-3xl leading-relaxed">
            Deconstruct complex signals into orthogonal harmonics. Explore continuous series synthesis, discrete magnitude spectra, and interactive 3D time-frequency waterfalls.
          </p>
        </div>

        {/* View Mode Switcher: 2D Synthesis vs 3D Spatial Transformation */}
        <div className="flex items-center bg-[#FAF9F6] p-1 rounded-md border border-[#E6E4DD] shrink-0 self-start md:self-auto shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode('2d')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === '2d'
                ? 'bg-white shadow-2xs text-[#C85A32] border border-[#E6E4DD]'
                : 'text-[#585651] hover:text-[#1A1917]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>2D Synthesis & Spectrum</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('3d')}
            className={`px-3 py-1.5 rounded text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
              viewMode === '3d'
                ? 'bg-white shadow-2xs text-[#C85A32] border border-[#E6E4DD]'
                : 'text-[#585651] hover:text-[#1A1917]'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span>Interactive 3D Waterfall</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Layout: Visualizer on Left, Controls on Right starting at EXACT SAME HEIGHT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Visualization Stage */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          {/* Integrated Simulation Toolbar Header - Perfectly Aligns Height with Right Controls */}
          <div className="bg-white rounded-lg border border-[#E6E4DD] p-3.5 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C85A32]" />
              <span className="text-xs font-bold tracking-tight text-[#1A1917] uppercase font-mono">
                {viewMode === '3d'
                  ? showSpikesOnly
                    ? '3D Magnitude Spikes'
                    : '3D Time-Frequency Waterfall'
                  : '2D Signal Synthesis & Magnitude Spectrum'}
              </span>
              <span className="text-[11px] font-mono text-[#C85A32] bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/25 font-bold">
                N = {harmonicsN} · {signalType.toUpperCase()}
              </span>
              <div className="hidden xl:flex items-center gap-1 text-[10px] font-mono text-[#8A8882] bg-[#FAF9F6] px-2 py-0.5 rounded border border-[#E6E4DD]">
                <span>Hotkeys:</span>
                <kbd className="bg-white border border-[#E6E4DD] px-1 rounded text-[#C85A32] font-bold">P</kbd>
                <span>Play</span>
                <span className="text-[#D5D3CB]">·</span>
                <kbd className="bg-white border border-[#E6E4DD] px-1 rounded text-[#1A1917] font-bold">H</kbd>
                <span>Pause</span>
              </div>
            </div>

            {/* Playback & View Controls Toolbar */}
            <SimulationToolbar
              playbackState={playbackState}
              onPlay={() => setPlaybackState('playing')}
              onPause={() => setPlaybackState('paused')}
              onReset={() => {
                setPlaybackState('paused');
                setAnimTime(0);
              }}
              speed={speed}
              onSpeedChange={setSpeed}
              isGridVisible={isGridVisible}
              onToggleGrid={() => setIsGridVisible(!isGridVisible)}
              isFullscreen={isFullscreen}
              onToggleFullscreen={() => setIsFullscreen(true)}
              isLiveSimulationReady={true}
            />
          </div>

          {/* Render Active Viewport: Pulled out of nested window into clean, spacious cards */}
          {viewMode === '2d' ? (
            <div className="flex flex-col gap-4">
              {renderTimeDomainCard(false)}
              {renderMagnitudeSpectrumCard(false)}
            </div>
          ) : (
            render3DVisualizer(false)
          )}
        </div>

        {/* Right Column: Ergonomic Eye-Level Interactive Controls (Starting at Exact Same Top Level!) */}
        <div className="lg:col-span-4">
          <div className="sticky top-4 space-y-4">
            <div className="bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2.5 border-b border-[#E6E4DD]">
                <span className="text-xs font-mono uppercase tracking-wider text-[#1A1917] font-bold flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#C85A32]" />
                  <span>Interactive Controls</span>
                </span>
                <label className="flex items-center gap-1.5 text-xs text-[#585651] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showIdealTarget}
                    onChange={(e) => setShowIdealTarget(e.target.checked)}
                    className="accent-[#C85A32] rounded"
                  />
                  <span className="text-[11px]">Overlay</span>
                </label>
              </div>

              {/* Target Periodic Waveform Selectors */}
              <div>
                <label className="block text-xs font-semibold text-[#1A1917] mb-1.5">
                  Target Periodic Waveform
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'square', label: 'Square', desc: '1/k' },
                    { id: 'sawtooth', label: 'Sawtooth', desc: '1/k' },
                    { id: 'triangle', label: 'Triangle', desc: '1/k²' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSignalType(item.id)}
                      className={`p-2 rounded-md border text-center transition-all cursor-pointer ${
                        signalType === item.id
                          ? 'bg-[#FBF4F0] border-[#C85A32] text-[#C85A32] shadow-2xs font-semibold ring-1 ring-[#C85A32]'
                          : 'bg-[#FAF9F6] border-[#E6E4DD] hover:bg-white text-[#585651] hover:text-[#1A1917]'
                      }`}
                    >
                      <div className="text-xs font-bold">{item.label}</div>
                      <div className="text-[10px] text-[#75736E] font-mono mt-0.5">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Beginner-Friendly Harmonic Unit Controller & Preset Step Buttons */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-[#1A1917]">Harmonic Count (N)</span>
                  <span className="font-mono text-sm text-[#C85A32] font-bold">
                    N = {harmonicsN}
                  </span>
                </div>

                {/* Slider */}
                <input
                  type="range"
                  min="1"
                  max="25"
                  step="1"
                  value={harmonicsN}
                  onChange={(e) => setHarmonicsN(parseInt(e.target.value, 10))}
                  className="w-full accent-[#C85A32] cursor-pointer"
                />

                {/* Beginner Preset Step Buttons (1N, 5N, 10N, 25N, ±1N) */}
                <div className="mt-2 flex flex-wrap items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    {[
                      { label: '1N', val: 1 },
                      { label: '5N', val: 5 },
                      { label: '10N', val: 10 },
                      { label: '25N', val: 25 },
                    ].map((p) => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => handleHarmonicPreset(p.val)}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors border cursor-pointer ${
                          harmonicsN === p.val
                            ? 'bg-[#1A1917] text-white border-[#1A1917] font-bold shadow-2xs'
                            : 'bg-[#FAF9F6] border-[#E6E4DD] text-[#585651] hover:text-[#1A1917] hover:bg-white'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>

                  {/* Step +/- 1 */}
                  <div className="flex items-center gap-0.5 bg-[#FAF9F6] p-0.5 rounded border border-[#E6E4DD]">
                    <button
                      type="button"
                      onClick={() => setHarmonicsN((n) => Math.max(1, n - 1))}
                      disabled={harmonicsN <= 1}
                      className="px-1.5 py-0.5 text-xs font-mono rounded text-[#585651] hover:text-[#1A1917] hover:bg-white disabled:opacity-40 cursor-pointer"
                      title="Decrease harmonic count by 1"
                    >
                      -1N
                    </button>
                    <div className="w-[1px] h-3 bg-[#E6E4DD]" />
                    <button
                      type="button"
                      onClick={() => setHarmonicsN((n) => Math.min(25, n + 1))}
                      disabled={harmonicsN >= 25}
                      className="px-1.5 py-0.5 text-xs font-mono rounded text-[#585651] hover:text-[#1A1917] hover:bg-white disabled:opacity-40 cursor-pointer"
                      title="Increase harmonic count by 1"
                    >
                      +1N
                    </button>
                  </div>
                </div>
              </div>

              {/* Fundamental Frequency Slider */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-[#1A1917]">Fundamental (f₀)</span>
                  <span className="font-mono text-[#C85A32] font-semibold">{fundamentalF0.toFixed(1)} Hz</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.1"
                  value={fundamentalF0}
                  onChange={(e) => setFundamentalF0(parseFloat(e.target.value))}
                  className="w-full accent-[#C85A32] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
                  <span>0.5 Hz (Slow)</span>
                  <span>2.5 Hz (Fast)</span>
                </div>
              </div>

              {/* 3D Zoom Controls (Active only in 3D Mode, Yaw/Pitch removed) */}
              {viewMode === '3d' && (
                <div className="pt-3 border-t border-[#E6E4DD] space-y-2.5">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-[#1A1917]">3D Zoom</span>
                      <span className="font-mono text-[#C85A32] font-semibold">{cameraZoom.toFixed(1)}×</span>
                    </div>
                    <input
                      type="range"
                      min="0.6"
                      max="1.8"
                      step="0.05"
                      value={cameraZoom}
                      onChange={(e) => setCameraZoom(parseFloat(e.target.value))}
                      className="w-full accent-[#C85A32] cursor-pointer"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowSpikesOnly(!showSpikesOnly)}
                    className={`w-full py-1.5 px-3 rounded text-xs font-mono font-semibold transition-colors border flex items-center justify-center gap-1.5 cursor-pointer ${
                      showSpikesOnly
                        ? 'bg-[#1A1917] text-white border-[#1A1917]'
                        : 'bg-[#FAF9F6] border-[#E6E4DD] text-[#585651] hover:text-[#1A1917] hover:bg-white'
                    }`}
                  >
                    <Activity className="w-3.5 h-3.5 text-[#C85A32]" />
                    <span>{showSpikesOnly ? '✓ Spikes Only Active' : 'Show Spikes Only'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Standard Metrics HUD */}
            <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-4 shadow-xs">
              <div className="text-[11px] font-mono uppercase tracking-wider text-[#75736E] mb-2 font-semibold">
                Live Spectrum Metrics
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2 bg-white rounded border border-[#E6E4DD]">
                  <div className="text-[10px] font-mono text-[#8A8882]">BANDWIDTH</div>
                  <div className="font-semibold text-[#1A1917] font-mono mt-0.5">
                    {(harmonicsN * fundamentalF0).toFixed(1)} Hz
                  </div>
                </div>
                <div className="p-2 bg-white rounded border border-[#E6E4DD]">
                  <div className="text-[10px] font-mono text-[#8A8882]">GIBBS PEAK</div>
                  <div className="font-semibold text-[#C85A32] font-mono mt-0.5">
                    +{gibbsOvershootPct}%
                  </div>
                </div>
                <div className="p-2 bg-white rounded border border-[#E6E4DD]">
                  <div className="text-[10px] font-mono text-[#8A8882]">HARMONICS</div>
                  <div className="font-semibold text-[#1A1917] font-mono mt-0.5">
                    k = 1 .. {harmonicsN}
                  </div>
                </div>
                <div className="p-2 bg-white rounded border border-[#E6E4DD]">
                  <div className="text-[10px] font-mono text-[#8A8882]">TOTAL HARMONICS</div>
                  <div className="font-semibold text-[#1A1917] font-mono mt-0.5">
                    25 Active Units
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lower Section: Swapped & Positioned Below Canvas (Analytical Formulation & Curricular Topics) */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Analytical Formulation */}
        <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-5 shadow-xs">
          <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-2 flex items-center gap-1.5 font-semibold">
            <BookOpen className="w-3.5 h-3.5 text-[#585651]" />
            <span>Analytical Formulation</span>
          </div>

          <div className="text-xs text-[#585651] mb-1.5 font-medium">
            Continuous-Time Fourier Transform (CTFT)
          </div>
          <div className="p-2.5 bg-white rounded border border-[#E6E4DD] text-sm font-semibold text-[#1A1917] overflow-x-auto mb-3">
            <MathView math="X(j\omega) = \int_{-\infty}^{\infty} x(t) e^{-j\omega t} \, dt" displayMode={true} />
          </div>

          <div className="text-xs text-[#585651] mb-1.5 font-medium">
            Fourier Series Partial Sum Synthesis
          </div>
          <div className="p-2.5 bg-white rounded border border-[#E6E4DD] text-sm font-semibold text-[#1A1917] overflow-x-auto">
            <MathView
              math={
                signalType === 'square'
                  ? 'x_N(t) = \\frac{4}{\\pi} \\sum_{k=1,3,\\dots}^N \\frac{1}{k}\\sin(2\\pi k f_0 t)'
                  : signalType === 'sawtooth'
                  ? 'x_N(t) = \\frac{2}{\\pi} \\sum_{k=1}^N \\frac{(-1)^{k+1}}{k}\\sin(2\\pi k f_0 t)'
                  : 'x_N(t) = \\frac{8}{\\pi^2} \\sum_{k=1,3,\\dots}^N \\frac{(-1)^{(k-1)/2}}{k^2}\\sin(2\\pi k f_0 t)'
              }
              displayMode={true}
            />
          </div>
        </div>

        {/* Card 2: Educational Concept Insights */}
        <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-5 shadow-xs space-y-2.5">
          <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] flex items-center gap-1.5 font-semibold">
            <TrendingUp className="w-3.5 h-3.5 text-[#C85A32]" />
            <span>Key Curricular Principles</span>
          </div>

          <div className="p-2.5 bg-white rounded border border-[#E6E4DD] text-xs text-[#585651] leading-relaxed">
            <strong className="text-[#1A1917] block mb-0.5">3D Time-Frequency Waterfall</strong>
            Each harmonic lives on its own frequency slice (Y-axis). Looking down the frequency axis produces the time waveform $x(t)$, while looking down the time axis collapses the signal into magnitude spectrum spikes $|c_k|$.
          </div>

          <div className="p-2.5 bg-white rounded border border-[#E6E4DD] text-xs text-[#585651] leading-relaxed">
            <strong className="text-[#1A1917] block mb-0.5">Gibbs Phenomenon (+8.95% Peak)</strong>
            Discontinuities in square and sawtooth waves create persistent overshoot peaks of ~8.95%, demonstrating non-uniform convergence of finite orthogonal Fourier sums.
          </div>
        </div>

        {/* Card 3: Curricular Focus Topics */}
        <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-5 shadow-xs">
          <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-3 flex items-center gap-1.5 font-semibold">
            <Layers className="w-3.5 h-3.5 text-[#585651]" />
            <span>Curricular Topics</span>
          </div>
          <ul className="space-y-3">
            {[
              { num: '01', title: 'Harmonic Decomposition', desc: 'Orthogonal sinusoidal basis functions spanning periodic signal space' },
              { num: '02', title: 'Magnitude & Phase Spectra', desc: 'Discrete line spectra representation of harmonic power distribution' },
              { num: '03', title: 'Signal Reconstruction', desc: 'Partial sum synthesis and Gibbs ripple control near sharp step edges' },
            ].map((topic) => (
              <li key={topic.num} className="text-xs leading-snug">
                <div className="flex items-center gap-1.5 font-semibold text-[#1A1917]">
                  <span className="font-mono text-[#C85A32] text-xs">{topic.num}</span>
                  <span>{topic.title}</span>
                </div>
                <div className="text-[#75736E] mt-0.5 pl-5">{topic.desc}</div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* FULLSCREEN IMMERSIVE LAB VIEW (Side-by-Side 2D, Maximized 3D Height, Non-Overlapping Sticky Controls) */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-[#FAF9F6] flex flex-col p-4 sm:p-5 overflow-hidden">
          {/* Fullscreen Header Strip */}
          <div className="flex items-center justify-between pb-3 border-b border-[#E6E4DD] shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono font-bold text-[#C85A32] bg-[#FBF4F0] px-2.5 py-0.5 rounded border border-[#C85A32]/20">
                FULLSCREEN LAB
              </span>
              <span className="text-sm font-bold text-[#1A1917]">
                Module 2: Fourier Analysis ({viewMode === '2d' ? '2D Side-by-Side View' : '3D Space'})
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* View Switcher inside Fullscreen */}
              <div className="flex items-center bg-white p-0.5 rounded border border-[#E6E4DD] text-xs shadow-2xs">
                <button
                  type="button"
                  onClick={() => setViewMode('2d')}
                  className={`px-3 py-1 rounded font-semibold cursor-pointer ${
                    viewMode === '2d' ? 'bg-[#1A1917] text-white' : 'text-[#585651]'
                  }`}
                >
                  2D View
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('3d')}
                  className={`px-3 py-1 rounded font-semibold cursor-pointer ${
                    viewMode === '3d' ? 'bg-[#1A1917] text-white' : 'text-[#585651]'
                  }`}
                >
                  3D View
                </button>
              </div>

              {/* Playback Controls with Hotkey tooltips */}
              <button
                type="button"
                onClick={() => setPlaybackState(playbackState === 'playing' ? 'paused' : 'playing')}
                className="px-3 py-1 bg-white border border-[#E6E4DD] rounded text-xs font-semibold text-[#1A1917] hover:bg-[#FAF9F6] flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title={playbackState === 'playing' ? 'Pause simulation (Hotkey: H)' : 'Play simulation (Hotkey: P)'}
              >
                {playbackState === 'playing' ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{playbackState === 'playing' ? 'Pause' : 'Play'}</span>
                <kbd className="hidden sm:inline-block font-mono text-[9px] bg-[#FAF9F6] border border-[#E6E4DD] px-1 py-0.2 rounded text-[#75736E]">
                  {playbackState === 'playing' ? 'H' : 'P'}
                </kbd>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPlaybackState('paused');
                  setAnimTime(0);
                }}
                className="p-1.5 bg-white border border-[#E6E4DD] rounded text-[#585651] hover:text-[#1A1917] cursor-pointer shadow-2xs"
                title="Reset animation"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* Speed Selector in Fullscreen */}
              <div className="flex items-center gap-1 bg-white border border-[#E6E4DD] rounded p-0.5 shadow-2xs">
                <span className="text-[10px] font-mono text-[#75736E] px-1.5 uppercase font-semibold">
                  Speed
                </span>
                <div className="flex items-center gap-0.5">
                  {['0.25×', '0.5×', '1×', '2×', '4×'].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSpeed(s)}
                      className={`px-1.5 py-0.5 text-[11px] font-mono rounded transition-colors cursor-pointer ${
                        speed === s
                          ? 'bg-[#1A1917] text-white font-semibold'
                          : 'text-[#65635E] hover:text-[#1A1917] hover:bg-[#FAF9F6]'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Exit Fullscreen Button */}
              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                className="px-3 py-1 bg-[#1A1917] text-white rounded text-xs font-semibold hover:bg-[#2C2A26] flex items-center gap-1.5 cursor-pointer shadow-xs ml-2"
                title="Exit Fullscreen (Esc)"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Exit Fullscreen</span>
              </button>
            </div>
          </div>

          {/* Fullscreen Visualization Stage: Side-by-Side for 2D, Maximized Height for 3D */}
          <div className="flex-1 min-h-0 my-3 overflow-hidden flex flex-col">
            {viewMode === '2d' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full min-h-0">
                {renderTimeDomainCard(true)}
                {renderMagnitudeSpectrumCard(true)}
              </div>
            ) : (
              render3DVisualizer(true)
            )}
          </div>

          {/* Sticky Docked Bottom Controls (Zero Descriptions, No Content Overlap!) */}
          <div className="sticky bottom-0 shrink-0 bg-white border border-[#E6E4DD] rounded-lg p-3 shadow-md z-30">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* Waveform Selector */}
              <div className="flex items-center gap-1">
                {[
                  { id: 'square', label: 'Square' },
                  { id: 'sawtooth', label: 'Sawtooth' },
                  { id: 'triangle', label: 'Triangle' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSignalType(item.id)}
                    className={`px-3 py-1 rounded text-xs font-bold transition-all cursor-pointer ${
                      signalType === item.id
                        ? 'bg-[#C85A32] text-white shadow-2xs'
                        : 'bg-[#FAF9F6] border border-[#E6E4DD] text-[#585651] hover:text-[#1A1917]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Slider 1: Harmonics N */}
              <div className="flex items-center gap-2 min-w-[200px]">
                <span className="text-xs font-mono font-bold text-[#1A1917] whitespace-nowrap">
                  N: {harmonicsN}
                </span>
                <input
                  type="range"
                  min="1"
                  max="25"
                  step="1"
                  value={harmonicsN}
                  onChange={(e) => setHarmonicsN(parseInt(e.target.value, 10))}
                  className="w-32 sm:w-44 accent-[#C85A32] cursor-pointer"
                />
                <div className="flex items-center gap-1">
                  {[1, 5, 10, 25].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setHarmonicsN(val)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer border ${
                        harmonicsN === val
                          ? 'bg-[#1A1917] text-white border-[#1A1917]'
                          : 'bg-[#FAF9F6] border-[#E6E4DD] text-[#585651]'
                      }`}
                    >
                      {val}N
                    </button>
                  ))}
                </div>
              </div>

              {/* Slider 2: Fundamental Frequency f0 */}
              <div className="flex items-center gap-2 min-w-[170px]">
                <span className="text-xs font-mono font-bold text-[#1A1917] whitespace-nowrap">
                  f₀: {fundamentalF0.toFixed(1)} Hz
                </span>
                <input
                  type="range"
                  min="0.5"
                  max="2.5"
                  step="0.1"
                  value={fundamentalF0}
                  onChange={(e) => setFundamentalF0(parseFloat(e.target.value))}
                  className="w-28 sm:w-36 accent-[#C85A32] cursor-pointer"
                />
              </div>

              {/* 3D-specific Controls in Fullscreen */}
              {viewMode === '3d' && (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-[#1A1917] whitespace-nowrap">
                      Zoom: {cameraZoom.toFixed(1)}×
                    </span>
                    <input
                      type="range"
                      min="0.6"
                      max="1.8"
                      step="0.05"
                      value={cameraZoom}
                      onChange={(e) => setCameraZoom(parseFloat(e.target.value))}
                      className="w-24 accent-[#C85A32] cursor-pointer"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowSpikesOnly(!showSpikesOnly)}
                    className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition-colors border cursor-pointer ${
                      showSpikesOnly
                        ? 'bg-[#1A1917] text-white border-[#1A1917]'
                        : 'bg-[#FAF9F6] border-[#E6E4DD] text-[#585651]'
                    }`}
                  >
                    {showSpikesOnly ? '✓ Spikes Only' : 'Spikes Only'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Named alias export for modular consumption
export { Module2_Fourier as FourierAnalysisModule };
