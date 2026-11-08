/**
 * Phasor Representation & Harmonic Drawing (Epicycles) Visualizer
 * - Head-to-tail rotating phasors c_n * e^(j * n * omega_0 * t)
 * - Two Simulation Modes:
 *   1. 1D Periodic Waveforms (Rectangular/Square, Sawtooth, Triangular):
 *      - Rotating circles chained on the FAR LEFT (scaled down with clear space)
 *      - Horizontal laser projection line spanning across open gap to the wave
 *      - Continuous synthesized signal waveform scrolling on the RIGHT
 *      - Mathematically exact amplitude and phase match for Square, Sawtooth, and Triangle waves!
 *   2. 2D Closed Contours (Star, Heart, Square, Triangle, Trefoil, Fourier Glyph, Custom Sketch):
 *      - 2D complex Fourier coefficients tracing closed contours
 * - Fullscreen Mode:
 *   - Occupies FULL WIDTH of screen (no right panel taking up canvas space)
 *   - Sticky docked bottom bar with dropdown selection for Signals and Shapes, harmonic slider, step buttons, and toggles
 *   - "Phasor Chaining Principle" card is omitted in fullscreen mode
 *   - Reset button resets shape/signal back to initial defaults
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Pencil,
  SlidersHorizontal,
  Maximize2,
  Waves,
  Shapes,
  ChevronDown,
  Check,
  Sparkles,
} from 'lucide-react';
import {
  Point2D,
  Phasor,
  computeDFT2D,
  resamplePath,
  generateStarPreset,
  generateSquarePreset,
  generateTrianglePreset,
  generateHeartPreset,
  generateTrefoilPreset,
  generateFourierGlyphPreset,
} from './fourierMath';

export type EpicycleMode = 'signal' | 'shape';
export type SignalPreset = 'square' | 'sawtooth' | 'triangle';
export type ShapePreset =
  | 'star'
  | 'heart'
  | 'square'
  | 'triangle'
  | 'trefoil'
  | 'glyph'
  | 'custom';

interface EpicycleVisualizerProps {
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  playbackState?: 'playing' | 'paused';
  onTogglePlayback?: () => void;
  speed?: string;
  onSpeedChange?: (s: string) => void;
  resetTrigger?: number;
}

export const EpicycleVisualizer: React.FC<EpicycleVisualizerProps> = ({
  isFullscreen = false,
  onToggleFullscreen,
  playbackState: controlledPlayback,
  onTogglePlayback,
  speed: controlledSpeed,
  onSpeedChange,
  resetTrigger,
}) => {
  // Mode: 'signal' (1D Waveform) or 'shape' (2D Contour)
  const [activeCategory, setActiveCategory] = useState<EpicycleMode>('signal');
  const [selectedSignal, setSelectedSignal] = useState<SignalPreset>('square');
  const [selectedShape, setSelectedShape] = useState<ShapePreset>('star');

  // Fullscreen Dropdown Popover
  const [isDropdownOpen, setIsDropdownOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Custom sketch state
  const [customDrawing, setCustomDrawing] = useState<Point2D[]>([]);
  const [isDrawingMode, setIsDrawingMode] = useState<boolean>(false);
  const isMouseDownDrawing = useRef<boolean>(false);

  // Simulation parameters
  const [harmonicsN, setHarmonicsN] = useState<number>(5); // 1 to 50
  const [internalPlayback, setInternalPlayback] = useState<'playing' | 'paused'>('playing');
  const [internalSpeed, setInternalSpeed] = useState<string>('1×');
  const [time, setTime] = useState<number>(0); // 0 to 1 cycle

  // Toggles
  const [showCircles, setShowCircles] = useState<boolean>(true);
  const [showVectors, setShowVectors] = useState<boolean>(true);
  const [showTarget, setShowTarget] = useState<boolean>(true);

  // Synchronize playback with parent props if provided
  const isPlaying = controlledPlayback ? controlledPlayback === 'playing' : internalPlayback === 'playing';
  const activeSpeed = controlledSpeed || internalSpeed;

  const togglePlayback = () => {
    if (onTogglePlayback) {
      onTogglePlayback();
    } else {
      setInternalPlayback((prev) => (prev === 'playing' ? 'paused' : 'playing'));
    }
  };

  const handleSpeedSelect = (s: string) => {
    if (onSpeedChange) {
      onSpeedChange(s);
    } else {
      setInternalSpeed(s);
    }
  };

  const lastResetRef = useRef<number | undefined>(resetTrigger);

  // Reset the current animation (restarts animation without changing active tab, shape, or signal)
  const executeReset = useCallback(() => {
    setTime(0);
    tracedPathRef.current = [];
    if (controlledPlayback !== undefined) {
      if (isPlaying && onTogglePlayback) {
        onTogglePlayback();
      }
    } else {
      setInternalPlayback('paused');
    }
  }, [controlledPlayback, isPlaying, onTogglePlayback]);

  // Trigger reset when parent passes resetTrigger update (only on increment, never on playback toggle)
  useEffect(() => {
    if (resetTrigger !== undefined && resetTrigger !== lastResetRef.current) {
      lastResetRef.current = resetTrigger;
      setTime(0);
      tracedPathRef.current = [];
      if (controlledPlayback === undefined) {
        setInternalPlayback('paused');
      }
    }
  }, [resetTrigger, controlledPlayback]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isDropdownOpen]);

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const tracedPathRef = useRef<Point2D[]>([]);

  // 1D Signal Harmonic Coefficients (Square, Sawtooth, Triangle)
  const signalHarmonics = useMemo(() => {
    const list: { k: number; amp: number; rawCoeff: number }[] = [];
    const maxK = harmonicsN * 2 + 1;

    for (let k = 1; k <= maxK; k++) {
      let b_k = 0;
      if (selectedSignal === 'square') {
        // Odd harmonics: b_k = 4 / (pi * k)
        if (k % 2 === 1 && k <= harmonicsN * 2) {
          b_k = 4 / (Math.PI * k);
        }
      } else if (selectedSignal === 'sawtooth') {
        // Standard rising sawtooth x(t) = 2(t - 0.5): b_k = -2 / (pi * k)
        if (k <= harmonicsN) {
          b_k = -2 / (Math.PI * k);
        }
      } else if (selectedSignal === 'triangle') {
        // Odd harmonics: b_k = (8 / (pi^2 * k^2)) * sign
        if (k % 2 === 1 && k <= harmonicsN * 2) {
          const sign = ((k - 1) / 2) % 2 === 0 ? 1 : -1;
          b_k = (8 / (Math.PI * Math.PI * (k * k))) * sign;
        }
      }

      if (b_k !== 0) {
        list.push({ k, amp: Math.abs(b_k), rawCoeff: b_k });
      }
    }

    return list.slice(0, harmonicsN);
  }, [selectedSignal, harmonicsN]);

  // 2D Contour Points
  const baseContour = useMemo<Point2D[]>(() => {
    if (activeCategory !== 'shape') return [];
    switch (selectedShape) {
      case 'star':
        return generateStarPreset(280);
      case 'heart':
        return generateHeartPreset(280);
      case 'square':
        return generateSquarePreset(280);
      case 'triangle':
        return generateTrianglePreset(280);
      case 'trefoil':
        return generateTrefoilPreset(280);
      case 'glyph':
        return generateFourierGlyphPreset(280);
      case 'custom':
        return customDrawing.length >= 8
          ? resamplePath(customDrawing, 280)
          : generateStarPreset(280);
      default:
        return generateStarPreset(280);
    }
  }, [activeCategory, selectedShape, customDrawing]);

  // Compute 2D DFT Phasors
  const allShapePhasors = useMemo<Phasor[]>(() => {
    if (activeCategory !== 'shape' || baseContour.length < 4) return [];
    return computeDFT2D(baseContour, 60);
  }, [activeCategory, baseContour]);

  // Filter 2D Phasors by |n| <= harmonicsN
  const activeShapePhasors = useMemo<Phasor[]>(() => {
    return allShapePhasors
      .filter((p) => Math.abs(p.freq) <= harmonicsN)
      .sort((a, b) => b.amp - a.amp);
  }, [allShapePhasors, harmonicsN]);

  // Reset animation time & history when parameters change
  useEffect(() => {
    setTime(0);
    tracedPathRef.current = [];
  }, [activeCategory, selectedSignal, selectedShape, harmonicsN]);

  // Animation Loop
  useEffect(() => {
    if (isPlaying && !isDrawingMode) {
      const speedMult =
        activeSpeed === '0.25×'
          ? 0.25
          : activeSpeed === '0.5×'
          ? 0.5
          : activeSpeed === '2×'
          ? 2.0
          : activeSpeed === '4×'
          ? 4.0
          : 1.0;

      const loop = (timestamp: number) => {
        if (!lastTimeRef.current) lastTimeRef.current = timestamp;
        const dt = (timestamp - lastTimeRef.current) / 1000;
        lastTimeRef.current = timestamp;

        setTime((prev) => (prev + (dt / 5.0) * speedMult) % 1.0);
        animFrameRef.current = requestAnimationFrame(loop);
      };

      animFrameRef.current = requestAnimationFrame(loop);
    } else {
      lastTimeRef.current = null;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, activeSpeed, isDrawingMode]);

  // Main Canvas Scene Drawer
  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width || 800;
    const height = rect.height || (isFullscreen ? 540 : 420);

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const circleColors = [
      'rgba(200, 90, 50, 0.65)',
      'rgba(37, 99, 235, 0.65)',
      'rgba(5, 150, 105, 0.65)',
      'rgba(217, 119, 6, 0.65)',
      'rgba(147, 51, 234, 0.65)',
    ];

    const vectorColors = [
      '#C85A32',
      '#2563EB',
      '#059669',
      '#D97706',
      '#9333EA',
    ];

    // ========================================================
    // MODE 1: 1D Signal Waveforms (Circles FAR LEFT -> Wave on RIGHT)
    // ========================================================
    if (activeCategory === 'signal') {
      const centerX = Math.max(75, Math.min(125, width * 0.12));
      const centerY = height * 0.5;

      // Both target outline and circles share the EXACT same amplitude scale
      const amplitudeScale = Math.min(46, height * 0.2);

      // Waveform starts with generous space separating circles from wave
      const waveStartX = Math.max(centerX + 125, width * 0.28);
      const waveWidth = width - waveStartX - 25;

      // Zero Axis Grid
      ctx.strokeStyle = '#E6E4DD';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);

      // Horizontal Center Line across canvas
      ctx.beginPath();
      ctx.moveTo(15, centerY);
      ctx.lineTo(width - 15, centerY);
      ctx.stroke();

      // Top & Bottom boundary limits (+1 and -1)
      ctx.beginPath();
      ctx.moveTo(waveStartX, centerY - amplitudeScale);
      ctx.lineTo(waveStartX + waveWidth, centerY - amplitudeScale);
      ctx.moveTo(waveStartX, centerY + amplitudeScale);
      ctx.lineTo(waveStartX + waveWidth, centerY + amplitudeScale);
      ctx.stroke();

      // Vertical Center Line for Circles
      ctx.beginPath();
      ctx.moveTo(centerX, 20);
      ctx.lineTo(centerX, height - 20);
      ctx.stroke();

      ctx.setLineDash([]);

      // 2. Chained Rotating Phasors on the FAR LEFT
      let curX = centerX;
      let curY = centerY;
      const omega0 = 2 * Math.PI;

      signalHarmonics.forEach((h, idx) => {
        const prevX = curX;
        const prevY = curY;

        const radius = Math.max(2.5, h.amp * amplitudeScale);
        const angle = h.k * omega0 * time;

        const sign = h.rawCoeff >= 0 ? 1 : -1;
        const deltaX = radius * Math.cos(angle);
        const deltaY = -radius * Math.sin(angle) * sign;

        curX += deltaX;
        curY += deltaY;

        // Orbital Circle
        if (showCircles) {
          ctx.beginPath();
          ctx.arc(prevX, prevY, radius, 0, 2 * Math.PI);
          ctx.strokeStyle = circleColors[idx % circleColors.length];
          ctx.lineWidth = 1.25;
          ctx.stroke();

          // Pivot center dot
          ctx.beginPath();
          ctx.arc(prevX, prevY, 2, 0, 2 * Math.PI);
          ctx.fillStyle = vectorColors[idx % vectorColors.length];
          ctx.fill();
        }

        // Rotating Vector Arrow
        if (showVectors) {
          ctx.beginPath();
          ctx.moveTo(prevX, prevY);
          ctx.lineTo(curX, curY);
          ctx.strokeStyle = vectorColors[idx % vectorColors.length];
          ctx.lineWidth = Math.max(1.2, Math.min(2.5, radius / 18));
          ctx.stroke();

          // Arrow tip
          const arrowLen = Math.min(5.5, radius * 0.4);
          const arrowAngle = Math.atan2(deltaY, deltaX);
          ctx.beginPath();
          ctx.moveTo(curX, curY);
          ctx.lineTo(
            curX - arrowLen * Math.cos(arrowAngle - Math.PI / 6),
            curY - arrowLen * Math.sin(arrowAngle - Math.PI / 6)
          );
          ctx.lineTo(
            curX - arrowLen * Math.cos(arrowAngle + Math.PI / 6),
            curY - arrowLen * Math.sin(arrowAngle + Math.PI / 6)
          );
          ctx.closePath();
          ctx.fillStyle = vectorColors[idx % vectorColors.length];
          ctx.fill();
        }
      });

      const tipX = curX;
      const tipY = curY;

      // 3. Horizontal Laser Projector Line (spans across open space with zero overlap)
      ctx.beginPath();
      ctx.moveTo(tipX, tipY);
      ctx.lineTo(waveStartX, tipY);
      ctx.strokeStyle = '#2563EB';
      ctx.lineWidth = 1.75;
      ctx.setLineDash([4, 3]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Phasor tip dot
      ctx.beginPath();
      ctx.arc(tipX, tipY, 4.5, 0, 2 * Math.PI);
      ctx.fillStyle = '#C85A32';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Wave pen start dot
      ctx.beginPath();
      ctx.arc(waveStartX, tipY, 4, 0, 2 * Math.PI);
      ctx.fillStyle = '#2563EB';
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 4. Wave Parameters for Oscilloscope Timeline
      const wavePeriodPixels = Math.max(160, Math.min(260, waveWidth * 0.45));

      // 5. Ideal Target Waveform Outline: EXACT MATHEMATICAL MATCH TO FOURIER SUM!
      if (showTarget) {
        ctx.beginPath();
        const numTargetSteps = 240;
        for (let i = 0; i <= numTargetSteps; i++) {
          const frac = i / numTargetSteps;
          const x = waveStartX + frac * waveWidth;
          const t_x = time - (x - waveStartX) / wavePeriodPixels;
          const tCycle = ((t_x % 1) + 1) % 1;

          let targetNormY = 0;
          if (selectedSignal === 'square') {
            // Square wave: +1.0 for first half, -1.0 for second half
            targetNormY = tCycle < 0.5 ? 1.0 : -1.0;
          } else if (selectedSignal === 'sawtooth') {
            // Rising sawtooth matching -2/(pi*k) sum: 2(t - 0.5)
            targetNormY = 2.0 * (tCycle - 0.5);
          } else if (selectedSignal === 'triangle') {
            // Triangle wave matching (8/pi^2) sum: peaks at 0.25 (+1.0), troughs at 0.75 (-1.0)
            if (tCycle < 0.25) {
              targetNormY = 4.0 * tCycle;
            } else if (tCycle < 0.75) {
              targetNormY = 2.0 - 4.0 * tCycle;
            } else {
              targetNormY = 4.0 * tCycle - 4.0;
            }
          }

          const targetY = centerY - targetNormY * amplitudeScale;
          if (i === 0) ctx.moveTo(x, targetY);
          else ctx.lineTo(x, targetY);
        }
        ctx.strokeStyle = '#DCD9D0';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // 6. Synthesized Waveform x(t): Continuous Fourier Sum
      ctx.beginPath();
      const numWaveSteps = Math.min(500, Math.floor(waveWidth));
      for (let i = 0; i <= numWaveSteps; i++) {
        const x = waveStartX + i;
        const t_x = time - (x - waveStartX) / wavePeriodPixels;

        // Evaluate Fourier Series at t_x
        let sum = 0;
        signalHarmonics.forEach((h) => {
          sum += h.rawCoeff * Math.sin(h.k * omega0 * t_x);
        });

        const y = centerY - sum * amplitudeScale;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = '#1A1917';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      // 7. Labels
      ctx.font = '700 10px "JetBrains Mono", monospace';
      ctx.fillStyle = '#C85A32';
      ctx.textAlign = 'left';
      ctx.fillText(`PHASORS (N = ${harmonicsN})`, centerX - 40, 24);

      ctx.fillStyle = '#2563EB';
      ctx.textAlign = 'left';
      ctx.fillText(`SYNTHESIZED WAVEFORM x(t) [Target Scaled 1:1]`, waveStartX, 24);

      return;
    }

    // ========================================================
    // MODE 2: 2D Shape Contour Tracing
    // ========================================================
    const centerX = width / 2;
    const centerY = height / 2;

    // Grid
    ctx.strokeStyle = '#F4F2EC';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX, 20);
    ctx.lineTo(centerX, height - 20);
    ctx.moveTo(20, centerY);
    ctx.lineTo(width - 20, centerY);
    ctx.stroke();

    // Freehand sketch preview
    if (isDrawingMode) {
      if (customDrawing.length > 1) {
        ctx.beginPath();
        customDrawing.forEach((pt, i) => {
          const px = centerX + pt.x;
          const py = centerY + pt.y;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.strokeStyle = '#2563EB';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
      return;
    }

    // Target 2D Outline
    if (showTarget && baseContour.length > 1) {
      ctx.beginPath();
      baseContour.forEach((pt, i) => {
        const px = centerX + pt.x;
        const py = centerY + pt.y;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.closePath();
      ctx.strokeStyle = '#DCD9D0';
      ctx.lineWidth = 1.25;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Chained 2D Epicycles
    let curX = centerX;
    let curY = centerY;
    const omega0 = 2 * Math.PI;

    activeShapePhasors.forEach((phasor, idx) => {
      const prevX = curX;
      const prevY = curY;

      const angle = phasor.freq * omega0 * time + phasor.phase;
      curX += phasor.amp * Math.cos(angle);
      curY += phasor.amp * Math.sin(angle);

      // Circle
      if (showCircles) {
        ctx.beginPath();
        ctx.arc(prevX, prevY, Math.max(2.5, phasor.amp), 0, 2 * Math.PI);
        ctx.strokeStyle = circleColors[idx % circleColors.length];
        ctx.lineWidth = 1.25;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(prevX, prevY, 2, 0, 2 * Math.PI);
        ctx.fillStyle = vectorColors[idx % vectorColors.length];
        ctx.fill();
      }

      // Vector Arrow
      if (showVectors) {
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(curX, curY);
        ctx.strokeStyle = vectorColors[idx % vectorColors.length];
        ctx.lineWidth = Math.max(1.2, Math.min(2.5, phasor.amp / 30));
        ctx.stroke();
      }
    });

    // Traced Path
    if (isPlaying) {
      tracedPathRef.current.push({
        x: curX - centerX,
        y: curY - centerY,
      });

      if (tracedPathRef.current.length > 600) {
        tracedPathRef.current.shift();
      }
    }

    const path = tracedPathRef.current;
    if (path.length > 1) {
      ctx.beginPath();
      path.forEach((pt, i) => {
        const px = centerX + pt.x;
        const py = centerY + pt.y;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      });
      ctx.strokeStyle = '#1A1917';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }

    // Pen tip marker
    ctx.beginPath();
    ctx.arc(curX, curY, 4.5, 0, 2 * Math.PI);
    ctx.fillStyle = '#C85A32';
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }, [
    activeCategory,
    selectedSignal,
    signalHarmonics,
    selectedShape,
    activeShapePhasors,
    baseContour,
    time,
    showCircles,
    showVectors,
    showTarget,
    isDrawingMode,
    customDrawing,
    isPlaying,
    harmonicsN,
    isFullscreen,
  ]);

  useEffect(() => {
    drawScene();
  }, [drawScene]);

  // Sketch Handlers
  const handleStartDraw = (clientX: number, clientY: number) => {
    if (!isDrawingMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left - rect.width / 2;
    const y = clientY - rect.top - rect.height / 2;

    isMouseDownDrawing.current = true;
    setCustomDrawing([{ x, y }]);
  };

  const handleMoveDraw = (clientX: number, clientY: number) => {
    if (!isDrawingMode || !isMouseDownDrawing.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left - rect.width / 2;
    const y = clientY - rect.top - rect.height / 2;

    setCustomDrawing((prev) => [...prev, { x, y }]);
  };

  const handleEndDraw = () => {
    if (!isDrawingMode) return;
    isMouseDownDrawing.current = false;
    if (customDrawing.length > 10) {
      setIsDrawingMode(false);
      setActiveCategory('shape');
      setSelectedShape('custom');
      if (onTogglePlayback && !isPlaying) {
        onTogglePlayback();
      } else {
        setInternalPlayback('playing');
      }
    }
  };

  // Label for current target
  const currentTargetLabel = useMemo(() => {
    if (activeCategory === 'signal') {
      switch (selectedSignal) {
        case 'square':
          return 'Signal: Rectangular (Square) Wave';
        case 'sawtooth':
          return 'Signal: Sawtooth Wave';
        case 'triangle':
          return 'Signal: Triangular Wave';
      }
    } else {
      switch (selectedShape) {
        case 'star':
          return 'Shape: 5-Point Star';
        case 'heart':
          return 'Shape: Geometric Heart';
        case 'triangle':
          return 'Shape: Triangle Contour';
        case 'square':
          return 'Shape: Square Contour';
        case 'trefoil':
          return 'Shape: Trefoil Knot';
        case 'glyph':
          return 'Shape: Fourier F Glyph';
        case 'custom':
          return 'Shape: Custom Sketch';
      }
    }
  }, [activeCategory, selectedSignal, selectedShape]);

  // =========================================================================
  // FULLSCREEN LAYOUT: Full-Width Canvas + Sticky Docked Bottom Controls Bar
  // =========================================================================
  if (isFullscreen) {
    return (
      <div className="flex-1 w-full h-full min-h-0 flex flex-col justify-between overflow-hidden">
        {/* Full-Width Canvas Window */}
        <div
          className="flex-1 w-full min-h-0 relative bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] overflow-hidden select-none cursor-crosshair shadow-xs"
          onMouseDown={(e) => handleStartDraw(e.clientX, e.clientY)}
          onMouseMove={(e) => handleMoveDraw(e.clientX, e.clientY)}
          onMouseUp={handleEndDraw}
          onTouchStart={(e) => {
            if (e.touches.length > 0) handleStartDraw(e.touches[0].clientX, e.touches[0].clientY);
          }}
          onTouchMove={(e) => {
            if (e.touches.length > 0) handleMoveDraw(e.touches[0].clientX, e.touches[0].clientY);
          }}
          onTouchEnd={handleEndDraw}
        >
          <canvas ref={canvasRef} className="w-full h-full block" />

          {isDrawingMode && (
            <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-[#E6E4DD] text-xs font-mono text-[#1A1917] shadow-sm animate-pulse">
              Click & drag to sketch custom closed shape...
            </div>
          )}
        </div>

        {/* Sticky Docked Bottom Controls Bar */}
        <div className="sticky bottom-0 shrink-0 bg-white border border-[#E6E4DD] rounded-lg p-2.5 sm:p-3 shadow-md z-30 mt-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* 1. Target Selector Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#FAF9F6] border border-[#E6E4DD] hover:border-[#C85A32]/60 text-[#1A1917] font-semibold text-xs shadow-2xs cursor-pointer transition-colors"
              >
                {activeCategory === 'signal' ? (
                  <Waves className="w-3.5 h-3.5 text-[#C85A32]" />
                ) : (
                  <Shapes className="w-3.5 h-3.5 text-[#C85A32]" />
                )}
                <span>{currentTargetLabel}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-[#8A8882] transition-transform duration-200 ${
                    isDropdownOpen ? 'rotate-180 text-[#C85A32]' : ''
                  }`}
                />
              </button>

              {/* Dropdown Menu Popover */}
              {isDropdownOpen && (
                <div className="absolute bottom-full mb-2 left-0 w-72 bg-white rounded-lg border border-[#E6E4DD] shadow-xl p-2 z-50 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                  {/* Category 1: 1D Signal Waves */}
                  <div>
                    <div className="text-[10px] uppercase font-mono tracking-wider text-[#75736E] px-2 py-1 font-semibold flex items-center gap-1.5">
                      <Waves className="w-3 h-3 text-[#C85A32]" />
                      <span>1D Periodic Waveforms</span>
                    </div>
                    <div className="space-y-0.5">
                      {[
                        { id: 'square', label: 'Rectangular (Square) Wave' },
                        { id: 'sawtooth', label: 'Sawtooth Wave' },
                        { id: 'triangle', label: 'Triangular Wave' },
                      ].map((sig) => {
                        const isSelected = activeCategory === 'signal' && selectedSignal === sig.id;
                        return (
                          <button
                            key={sig.id}
                            type="button"
                            onClick={() => {
                              setActiveCategory('signal');
                              setSelectedSignal(sig.id as SignalPreset);
                              setIsDrawingMode(false);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs text-left cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-[#FBF4F0] text-[#C85A32] font-bold'
                                : 'hover:bg-[#FAF9F6] text-[#585651] hover:text-[#1A1917]'
                            }`}
                          >
                            <span>{sig.label}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#C85A32]" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="border-t border-[#E6E4DD]" />

                  {/* Category 2: 2D Shapes */}
                  <div>
                    <div className="text-[10px] uppercase font-mono tracking-wider text-[#75736E] px-2 py-1 font-semibold flex items-center gap-1.5">
                      <Shapes className="w-3 h-3 text-[#C85A32]" />
                      <span>2D Closed Contours</span>
                    </div>
                    <div className="space-y-0.5">
                      {[
                        { id: 'star', label: '5-Point Star' },
                        { id: 'heart', label: 'Geometric Heart' },
                        { id: 'triangle', label: 'Triangle Contour' },
                        { id: 'square', label: 'Square Contour' },
                        { id: 'trefoil', label: 'Trefoil Knot' },
                        { id: 'glyph', label: 'Fourier F Glyph' },
                      ].map((shp) => {
                        const isSelected =
                          activeCategory === 'shape' && selectedShape === shp.id && !isDrawingMode;
                        return (
                          <button
                            key={shp.id}
                            type="button"
                            onClick={() => {
                              setActiveCategory('shape');
                              setSelectedShape(shp.id as ShapePreset);
                              setIsDrawingMode(false);
                              setIsDropdownOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs text-left cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-[#FBF4F0] text-[#C85A32] font-bold'
                                : 'hover:bg-[#FAF9F6] text-[#585651] hover:text-[#1A1917]'
                            }`}
                          >
                            <span>{shp.label}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#C85A32]" />}
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => {
                          setIsDrawingMode(true);
                          setIsDropdownOpen(false);
                          if (isPlaying) togglePlayback();
                        }}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded text-xs text-left cursor-pointer transition-colors ${
                          isDrawingMode
                            ? 'bg-[#FBF4F0] text-[#C85A32] font-bold'
                            : 'hover:bg-[#FAF9F6] text-[#585651] hover:text-[#1A1917]'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <Pencil className="w-3 h-3 text-[#C85A32]" />
                          <span>Custom Freehand Sketch</span>
                        </span>
                        {isDrawingMode && <Check className="w-3.5 h-3.5 text-[#C85A32]" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Harmonics (N) Sticky Slider & Quick Presets */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-[#1A1917] whitespace-nowrap">
                N: <span className="text-[#C85A32]">{harmonicsN}</span>
              </span>
              <input
                type="range"
                min="1"
                max="50"
                step="1"
                value={harmonicsN}
                onChange={(e) => setHarmonicsN(parseInt(e.target.value, 10))}
                className="w-28 sm:w-40 accent-[#C85A32] cursor-pointer"
              />
              <div className="hidden sm:flex items-center gap-1">
                {[1, 3, 5, 10, 25, 50].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setHarmonicsN(val)}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer border ${
                      harmonicsN === val
                        ? 'bg-[#1A1917] text-white border-[#1A1917] font-bold shadow-2xs'
                        : 'bg-[#FAF9F6] border-[#E6E4DD] text-[#585651] hover:text-[#1A1917]'
                    }`}
                  >
                    {val}N
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-0.5 bg-[#FAF9F6] p-0.5 rounded border border-[#E6E4DD]">
                <button
                  type="button"
                  onClick={() => setHarmonicsN((n) => Math.max(1, n - 1))}
                  disabled={harmonicsN <= 1}
                  className="px-1.5 py-0.5 text-[10px] font-mono text-[#585651] hover:text-[#1A1917] disabled:opacity-40 cursor-pointer"
                  title="Decrease harmonic"
                >
                  -1
                </button>
                <button
                  type="button"
                  onClick={() => setHarmonicsN((n) => Math.min(50, n + 1))}
                  disabled={harmonicsN >= 50}
                  className="px-1.5 py-0.5 text-[10px] font-mono text-[#585651] hover:text-[#1A1917] disabled:opacity-40 cursor-pointer"
                  title="Increase harmonic"
                >
                  +1
                </button>
              </div>
            </div>

            {/* 3. Display Toggles */}
            <div className="flex items-center gap-2 text-xs font-mono">
              <label className="flex items-center gap-1.5 cursor-pointer text-[#585651] hover:text-[#1A1917]">
                <input
                  type="checkbox"
                  checked={showCircles}
                  onChange={(e) => setShowCircles(e.target.checked)}
                  className="accent-[#C85A32] rounded"
                />
                <span className="hidden sm:inline">Circles</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-[#585651] hover:text-[#1A1917]">
                <input
                  type="checkbox"
                  checked={showVectors}
                  onChange={(e) => setShowVectors(e.target.checked)}
                  className="accent-[#C85A32] rounded"
                />
                <span className="hidden sm:inline">Vectors</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-[#585651] hover:text-[#1A1917]">
                <input
                  type="checkbox"
                  checked={showTarget}
                  onChange={(e) => setShowTarget(e.target.checked)}
                  className="accent-[#C85A32] rounded"
                />
                <span className="hidden sm:inline">Outline</span>
              </label>

              {/* Dedicated Reset Button in Sticky Bar */}
              <button
                type="button"
                onClick={executeReset}
                className="px-2 py-1 bg-[#FAF9F6] border border-[#E6E4DD] rounded text-[#585651] hover:text-[#1A1917] hover:border-[#C85A32]/60 cursor-pointer shadow-2xs transition-colors flex items-center gap-1 text-[11px] font-semibold ml-1"
                title="Reset signal, shape & harmonics to default"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // STANDARD VIEW LAYOUT: 8-Col Stage + 4-Col Interactive Controls
  // =========================================================================
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start h-full">
      {/* Left Column: Visualizer Stage (8 Columns) */}
      <div className="lg:col-span-8 flex flex-col gap-4 h-full">
        {/* Simulation Toolbar Header */}
        <div className="bg-white rounded-lg border border-[#E6E4DD] p-3.5 sm:p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C85A32]" />
            <span className="text-xs font-bold tracking-tight text-[#1A1917] uppercase font-mono">
              PHASOR HARMONIC EPICYCLES
            </span>
            <span className="text-[11px] font-mono text-[#C85A32] bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/25 font-bold">
              {activeCategory === 'signal'
                ? `${selectedSignal.toUpperCase()} WAVE`
                : `${selectedShape.toUpperCase()} CONTOUR`}
            </span>
          </div>

          {/* Playback & View Controls */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={togglePlayback}
              className={`px-3 py-1.5 rounded text-xs font-mono font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs border ${
                isPlaying
                  ? 'bg-[#1A1917] text-white border-[#1A1917]'
                  : 'bg-[#FAF9F6] border-[#E6E4DD] text-[#585651] hover:text-[#1A1917]'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>

            <button
              type="button"
              onClick={executeReset}
              className="p-1.5 bg-white border border-[#E6E4DD] rounded text-[#585651] hover:text-[#1A1917] transition-colors shadow-2xs cursor-pointer"
              title="Reset signal, shape & harmonics"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Speed Multiplier */}
            <div className="flex items-center gap-0.5 bg-[#FAF9F6] border border-[#E6E4DD] rounded p-0.5 text-xs font-mono">
              {['0.5×', '1×', '2×'].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSpeedSelect(s)}
                  className={`px-1.5 py-0.5 text-[10px] rounded transition-colors cursor-pointer ${
                    activeSpeed === s
                      ? 'bg-[#1A1917] text-white font-bold'
                      : 'text-[#65635E] hover:text-[#1A1917]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Fullscreen Toggle */}
            {onToggleFullscreen && (
              <button
                type="button"
                onClick={onToggleFullscreen}
                className="p-1.5 bg-white border border-[#E6E4DD] rounded text-[#585651] hover:text-[#1A1917] transition-colors shadow-2xs cursor-pointer ml-1"
                title="Enter Fullscreen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Primary Epicycle Canvas Card */}
        <div className="bg-white rounded-lg border border-[#E6E4DD] p-4 sm:p-5 shadow-xs flex flex-col h-full">
          <div className="flex items-center justify-between text-xs font-mono mb-2 pb-2 border-b border-[#E6E4DD]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#C85A32]" />
              <span className="font-bold text-[#1A1917]">
                {activeCategory === 'signal'
                  ? 'Phasors on Far Left → Synthesized Signal Waveform on Right'
                  : 'Fourier Epicycle Harmonic Contour Tracing'}
              </span>
            </div>
            <span className="text-[#C85A32] font-semibold text-xs font-mono">
              N = {harmonicsN} Active Circles
            </span>
          </div>

          <div
            className="w-full h-80 sm:h-96 relative flex items-center justify-center bg-[#FAF9F6] rounded-md border border-[#E6E4DD] overflow-hidden select-none"
            onMouseDown={(e) => handleStartDraw(e.clientX, e.clientY)}
            onMouseMove={(e) => handleMoveDraw(e.clientX, e.clientY)}
            onMouseUp={handleEndDraw}
            onTouchStart={(e) => {
              if (e.touches.length > 0) handleStartDraw(e.touches[0].clientX, e.touches[0].clientY);
            }}
            onTouchMove={(e) => {
              if (e.touches.length > 0) handleMoveDraw(e.touches[0].clientX, e.touches[0].clientY);
            }}
            onTouchEnd={handleEndDraw}
          >
            <canvas ref={canvasRef} className="w-full h-full block cursor-crosshair" />

            {isDrawingMode && (
              <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-xs px-3 py-1.5 rounded border border-[#E6E4DD] text-xs font-mono text-[#1A1917] shadow-sm animate-pulse">
                Click & drag to sketch custom closed shape...
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-[#75736E] font-mono pt-2 border-t border-[#F0EFEA] mt-auto">
            <span>
              {activeCategory === 'signal'
                ? `Tip projection draws continuous ${selectedSignal} wave (Target 1:1 scale)`
                : `Accumulating c_n e^(j n ω₀ t) for ${selectedShape}`}
            </span>
            <span className="text-[#C85A32] font-semibold">
              All {harmonicsN} Harmonic Circles Rendered
            </span>
          </div>
        </div>
      </div>

      {/* Right Column: Ergonomic Interactive Controls (4 Columns) */}
      <div className="lg:col-span-4">
        <div className="sticky top-4 space-y-4">
          <div className="bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E6E4DD]">
              <span className="text-xs font-mono uppercase tracking-wider text-[#1A1917] font-bold flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#C85A32]" />
                <span>Epicycle Controls</span>
              </span>
              <span className="text-[10px] font-mono text-[#75736E] bg-[#FAF9F6] px-2 py-0.5 rounded border border-[#E6E4DD] font-medium">
                N = {harmonicsN}
              </span>
            </div>

            {/* Mode Category Selector */}
            <div>
              <label className="block text-xs font-semibold text-[#1A1917] mb-1.5">
                Simulation Mode
              </label>
              <div className="grid grid-cols-2 gap-1.5 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setActiveCategory('signal')}
                  className={`p-2 rounded-md border text-left transition-all cursor-pointer flex items-center gap-2 ${
                    activeCategory === 'signal'
                      ? 'bg-[#FBF4F0] border-[#C85A32] text-[#C85A32] shadow-2xs font-bold ring-1 ring-[#C85A32]'
                      : 'bg-[#FAF9F6] border-[#E6E4DD] hover:bg-white text-[#585651] hover:text-[#1A1917]'
                  }`}
                >
                  <Waves className="w-3.5 h-3.5" />
                  <span>Signals (1D Wave)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveCategory('shape')}
                  className={`p-2 rounded-md border text-left transition-all cursor-pointer flex items-center gap-2 ${
                    activeCategory === 'shape'
                      ? 'bg-[#FBF4F0] border-[#C85A32] text-[#C85A32] shadow-2xs font-bold ring-1 ring-[#C85A32]'
                      : 'bg-[#FAF9F6] border-[#E6E4DD] hover:bg-white text-[#585651] hover:text-[#1A1917]'
                  }`}
                >
                  <Shapes className="w-3.5 h-3.5" />
                  <span>Shapes (2D)</span>
                </button>
              </div>
            </div>

            {/* Presets */}
            {activeCategory === 'signal' ? (
              <div>
                <label className="block text-xs font-semibold text-[#1A1917] mb-1.5">
                  Select Signal Waveform
                </label>
                <div className="grid grid-cols-3 gap-1.5 text-xs font-mono">
                  {[
                    { id: 'square', label: 'Rectangular', desc: 'Square' },
                    { id: 'sawtooth', label: 'Sawtooth', desc: 'Ramp' },
                    { id: 'triangle', label: 'Triangular', desc: 'Triangle' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSelectedSignal(item.id as SignalPreset)}
                      className={`p-2 rounded-md border text-center transition-all cursor-pointer ${
                        selectedSignal === item.id
                          ? 'bg-[#FBF4F0] border-[#C85A32] text-[#C85A32] shadow-2xs font-bold ring-1 ring-[#C85A32]'
                          : 'bg-[#FAF9F6] border-[#E6E4DD] hover:bg-white text-[#585651] hover:text-[#1A1917]'
                      }`}
                    >
                      <div className="font-bold text-xs">{item.label}</div>
                      <div className="text-[10px] text-[#75736E]">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-[#1A1917]">
                    Select 2D Contour
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsDrawingMode(!isDrawingMode);
                      if (!isDrawingMode && isPlaying) togglePlayback();
                    }}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors flex items-center gap-1 cursor-pointer ${
                      isDrawingMode
                        ? 'bg-[#C85A32] text-white border-[#C85A32] font-bold'
                        : 'bg-[#FAF9F6] border-[#E6E4DD] text-[#585651] hover:text-[#1A1917]'
                    }`}
                  >
                    <Pencil className="w-2.5 h-2.5" />
                    <span>{isDrawingMode ? 'Drawing...' : 'Custom Sketch'}</span>
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-1.5 text-xs font-mono">
                  {[
                    { id: 'star', label: 'Star' },
                    { id: 'heart', label: 'Heart' },
                    { id: 'triangle', label: 'Triangle' },
                    { id: 'square', label: 'Square' },
                    { id: 'trefoil', label: 'Trefoil' },
                    { id: 'glyph', label: 'Fourier F' },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setIsDrawingMode(false);
                        setSelectedShape(item.id as ShapePreset);
                      }}
                      className={`p-1.5 rounded-md border text-center transition-all cursor-pointer ${
                        selectedShape === item.id && !isDrawingMode
                          ? 'bg-[#FBF4F0] border-[#C85A32] text-[#C85A32] shadow-2xs font-bold ring-1 ring-[#C85A32]'
                          : 'bg-[#FAF9F6] border-[#E6E4DD] hover:bg-white text-[#585651] hover:text-[#1A1917]'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Harmonics (N) Dynamic Slider */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="font-semibold text-[#1A1917]">Harmonic Count (N)</span>
                <span className="font-mono text-[#C85A32] font-bold">
                  N = {harmonicsN}
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="50"
                step="1"
                value={harmonicsN}
                onChange={(e) => setHarmonicsN(parseInt(e.target.value, 10))}
                className="w-full accent-[#C85A32] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
                <span>N=1</span>
                <span>N=15</span>
                <span>N=50</span>
              </div>
            </div>

            {/* Quick Step Buttons */}
            <div className="flex items-center gap-1.5 pt-1">
              {[1, 3, 5, 10, 25, 50].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setHarmonicsN(n)}
                  className={`flex-1 py-1 text-center font-mono text-[10px] rounded border transition-colors cursor-pointer ${
                    harmonicsN === n
                      ? 'bg-[#1A1917] text-white border-[#1A1917] font-bold'
                      : 'bg-[#FAF9F6] border-[#E6E4DD] text-[#585651] hover:text-[#1A1917]'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>

            {/* Toggles */}
            <div className="space-y-2 pt-2 border-t border-[#E6E4DD]/80 text-xs">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-[#585651]">Show Orbital Circles</span>
                <input
                  type="checkbox"
                  checked={showCircles}
                  onChange={(e) => setShowCircles(e.target.checked)}
                  className="accent-[#C85A32] rounded"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-[#585651]">Show Rotating Vectors</span>
                <input
                  type="checkbox"
                  checked={showVectors}
                  onChange={(e) => setShowVectors(e.target.checked)}
                  className="accent-[#C85A32] rounded"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-[#585651]">Show Ideal Target Outline</span>
                <input
                  type="checkbox"
                  checked={showTarget}
                  onChange={(e) => setShowTarget(e.target.checked)}
                  className="accent-[#C85A32] rounded"
                />
              </label>
            </div>
          </div>

          {/* Educational Insight Card (Rendered ONLY in standard view, omitted in fullscreen mode) */}
          <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-4 shadow-xs text-xs text-[#585651] space-y-2">
            <div className="font-mono text-[11px] font-bold text-[#1A1917] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#C85A32]" />
              <span>Phasor Chaining Principle</span>
            </div>
            <p className="leading-relaxed">
              {activeCategory === 'signal'
                ? `Each circle has radius b_k and angular velocity k·ω₀. Notice how the circles rotate on the far left and project across the gap to synthesize the ${selectedSignal} wave matching the ideal outline 1:1.`
                : `Each 2D complex coefficient C_n rotates at angular velocity n·ω₀. Low harmonics create the base contour, while higher harmonics sculpt sharp corners and flat edges.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
