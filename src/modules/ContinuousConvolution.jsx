/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Module 1: Convolution & System Response
 * Filename: ContinuousConvolution.jsx
 * 
 * Convolution Module Features:
 * - Continuous time (CT) and discrete time (DT) with a CT / DT toggle.
 *   DT mode draws stems and computes y[n] = sum x[k]h[n-k].
 * - Four stacked plots at the top: x(τ), flipped & shifted h(t-τ),
 *   product with shaded area, and y(t) drawn progressively.
 *   y(t) at the current t equals the shaded area.
 * - Overlap status label computed dynamically from actual signal overlap.
 * - One controls panel below the plots: input & system dropdowns,
 *   separate width sliders for x and h (in whole samples in DT),
 *   amplitude sliders for x and h, input delay slider,
 *   and Start, Pause, Step, Reset buttons.
 * - One results panel below controls showing t (or n), y, peak y with time,
 *   and current widths of x, h, and y.
 * - Presets for 3-point moving average and difference filter h[n] = δ[n] - δ[n-1].
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  StepForward,
  StepBack,
  SlidersHorizontal,
  Sparkles,
  BookOpen,
  Layers,
  Clock,
  TrendingUp,
  Activity,
  Code2,
  MoveHorizontal
} from 'lucide-react';
import { MathView } from '../components/MathView';

export default function ContinuousConvolution({
  onNavigateHome,
  onNavigateModule,
  isInstructorMode = false,
}) {
  // Domain mode: 'CT' (Continuous-Time) vs 'DT' (Discrete-Time)
  const [domainMode, setDomainMode] = useState('CT');

  // ==========================================
  // CONTINUOUS-TIME (CT) STATE & PARAMETERS
  // ==========================================
  const [ctInputType, setCtInputType] = useState('rectangle'); // 'rectangle' | 'triangle' | 'gaussian'
  const [ctSystemType, setCtSystemType] = useState('rectangle'); // 'rectangle' | 'exponential' | 'impulse'

  const [ctAmpX, setCtAmpX] = useState(1.0);
  const [ctWidthX, setCtWidthX] = useState(2.0);
  const [ctDelayX, setCtDelayX] = useState(0.0);

  const [ctAmpH, setCtAmpH] = useState(1.0);
  const [ctWidthH, setCtWidthH] = useState(1.5);

  const ctTMin = -8.0;
  const ctTMax = 8.0;
  const [ctTVal, setCtTVal] = useState(-3.0);

  // ==========================================
  // DISCRETE-TIME (DT) STATE & PARAMETERS
  // ==========================================
  const [dtInputType, setDtInputType] = useState('step'); // 'step' | 'rectangle' | 'triangle' | 'impulse'
  const [dtSystemType, setDtSystemType] = useState('moving_average_3'); // 'moving_average_3' | 'difference' | 'rectangle' | 'exponential' | 'impulse'

  const [dtAmpX, setDtAmpX] = useState(1.0);
  const [dtWidthX, setDtWidthX] = useState(4); // whole number of samples
  const [dtDelayX, setDtDelayX] = useState(0); // whole number sample delay

  const [dtAmpH, setDtAmpH] = useState(1.0);
  const [dtWidthH, setDtWidthH] = useState(3); // whole number of samples

  const dtNMin = -10;
  const dtNMax = 10;
  const [dtNVal, setDtNVal] = useState(-3);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1.0); // 0.5x, 1.0x, 2.0x

  const animFrameRef = useRef(null);
  const lastTimeRef = useRef(null);

  // ==========================================
  // CT MATHEMATICAL ENGINE
  // ==========================================
  const tauMin = -9.0;
  const tauMax = 9.0;
  const tauSteps = 900; // dTau = 0.02 exact
  const dTau = (tauMax - tauMin) / tauSteps;

  const tauPoints = useMemo(() => {
    const pts = new Float64Array(tauSteps + 1);
    for (let i = 0; i <= tauSteps; i++) {
      pts[i] = tauMin + i * dTau;
    }
    return pts;
  }, [tauMin, tauMax, tauSteps, dTau]);

  const evalCtX = useCallback(
    (tau) => {
      const shiftedTau = tau - ctDelayX;
      if (ctInputType === 'rectangle') {
        const half = ctWidthX / 2;
        return Math.abs(shiftedTau) <= half + 1e-9 ? ctAmpX : 0;
      } else if (ctInputType === 'triangle') {
        const half = ctWidthX / 2;
        if (Math.abs(shiftedTau) <= half + 1e-9) {
          return Math.max(0, ctAmpX * (1 - Math.abs(shiftedTau) / half));
        }
        return 0;
      } else if (ctInputType === 'gaussian') {
        const sigma = ctWidthX / 3.2;
        return ctAmpX * Math.exp(-(shiftedTau * shiftedTau) / (2 * sigma * sigma));
      }
      return 0;
    },
    [ctInputType, ctAmpX, ctWidthX, ctDelayX]
  );

  const evalCtH = useCallback(
    (tau) => {
      if (ctSystemType === 'rectangle') {
        return tau >= -1e-9 && tau <= ctWidthH + 1e-9 ? ctAmpH : 0;
      } else if (ctSystemType === 'exponential') {
        if (tau >= -1e-9) {
          return ctAmpH * Math.exp(-Math.max(0, tau) / ctWidthH);
        }
        return 0;
      } else if (ctSystemType === 'impulse') {
        const eps = 0.12;
        const coef = ctAmpH / (eps * Math.sqrt(2 * Math.PI));
        return coef * Math.exp(-(tau * tau) / (2 * eps * eps));
      }
      return 0;
    },
    [ctSystemType, ctAmpH, ctWidthH]
  );

  const evalCtHShifted = useCallback(
    (t, tau) => evalCtH(t - tau),
    [evalCtH]
  );

  const evalCtProduct = useCallback(
    (t, tau) => evalCtX(tau) * evalCtHShifted(t, tau),
    [evalCtX, evalCtHShifted]
  );

  const computeCtIntegralsAtT = useCallback(
    (t) => {
      let sum = 0;
      let absSum = 0;
      const n = tauPoints.length;
      let prevVal = evalCtProduct(t, tauPoints[0]);
      let prevAbs = Math.abs(prevVal);
      for (let i = 1; i < n; i++) {
        const currVal = evalCtProduct(t, tauPoints[i]);
        const currAbs = Math.abs(currVal);
        sum += (prevVal + currVal) * 0.5 * dTau;
        absSum += (prevAbs + currAbs) * 0.5 * dTau;
        prevVal = currVal;
        prevAbs = currAbs;
      }
      return { integral: sum, absIntegral: absSum };
    },
    [tauPoints, dTau, evalCtProduct]
  );

  const ctSteps = 320; // dtGrid = 16 / 320 = 0.05s exact
  const dtGrid = (ctTMax - ctTMin) / ctSteps;

  const ctYCurveData = useMemo(() => {
    const tValues = new Float64Array(ctSteps + 1);
    const yValues = new Float64Array(ctSteps + 1);
    const absValues = new Float64Array(ctSteps + 1);
    let maxY = 0.001;
    let maxAbsOverlap = 0.001;

    for (let i = 0; i <= ctSteps; i++) {
      const t = ctTMin + i * dtGrid;
      tValues[i] = t;
      const { integral, absIntegral } = computeCtIntegralsAtT(t);
      yValues[i] = integral;
      absValues[i] = absIntegral;
      if (Math.abs(integral) > maxY) maxY = Math.abs(integral);
      if (absIntegral > maxAbsOverlap) maxAbsOverlap = absIntegral;
    }

    return { tValues, yValues, absValues, maxY, maxAbsOverlap };
  }, [ctTMin, ctTMax, ctSteps, dtGrid, computeCtIntegralsAtT]);

  const { ctCurrentArea, ctCurrentAbsOverlap } = useMemo(() => {
    const { integral, absIntegral } = computeCtIntegralsAtT(ctTVal);
    return { ctCurrentArea: integral, ctCurrentAbsOverlap: absIntegral };
  }, [ctTVal, computeCtIntegralsAtT]);

  // Peak output for CT
  const ctPeakInfo = useMemo(() => {
    let maxVal = -Infinity;
    let peakT = 0;
    for (let i = 0; i <= ctSteps; i++) {
      const val = ctYCurveData.yValues[i];
      if (val > maxVal + 1e-6) {
        maxVal = val;
        peakT = ctYCurveData.tValues[i];
      }
    }
    return {
      peakVal: maxVal === -Infinity ? 0 : maxVal,
      peakTime: peakT,
    };
  }, [ctYCurveData, ctSteps]);

  // CT Widths (W_x, W_h, W_y)
  const ctWidthsInfo = useMemo(() => {
    const wX = ctWidthX;
    const wH = ctSystemType === 'impulse' ? 0 : ctWidthH;
    let wY = 0;

    if (
      (ctInputType === 'rectangle' || ctInputType === 'triangle') &&
      (ctSystemType === 'rectangle' || ctSystemType === 'impulse')
    ) {
      wY = wX + wH;
    } else {
      // Numerical effective support (>1% of peak)
      const threshold = Math.max(1e-4, 0.01 * ctYCurveData.maxY);
      let firstIdx = -1;
      let lastIdx = -1;
      for (let i = 0; i <= ctSteps; i++) {
        if (Math.abs(ctYCurveData.yValues[i]) >= threshold) {
          if (firstIdx === -1) firstIdx = i;
          lastIdx = i;
        }
      }
      if (firstIdx !== -1 && lastIdx !== -1) {
        wY = ctYCurveData.tValues[lastIdx] - ctYCurveData.tValues[firstIdx];
      }
    }

    return {
      wX: +wX.toFixed(2),
      wH: +wH.toFixed(2),
      wY: +wY.toFixed(2),
    };
  }, [ctInputType, ctSystemType, ctWidthX, ctWidthH, ctYCurveData, ctSteps]);

  // ==========================================
  // DT MATHEMATICAL ENGINE
  // ==========================================
  const dtKMin = -10;
  const dtKMax = 10;
  const dtKIndices = useMemo(() => {
    const arr = [];
    for (let k = dtKMin; k <= dtKMax; k++) arr.push(k);
    return arr;
  }, [dtKMin, dtKMax]);

  const evalDtX = useCallback(
    (k) => {
      const W = Math.max(1, Math.round(dtWidthX));
      const d = Math.round(dtDelayX);
      if (dtInputType === 'step') {
        // Causal pulse of exact width W samples starting at delay d: [d, d + W - 1]
        return k >= d && k < d + W ? dtAmpX : 0;
      } else if (dtInputType === 'rectangle') {
        // Centered pulse of exact width W samples around delay d
        const left = d - Math.floor((W - 1) / 2);
        const right = d + Math.ceil((W - 1) / 2);
        return k >= left && k <= right ? dtAmpX : 0;
      } else if (dtInputType === 'triangle') {
        // Triangle pulse strictly supported on W samples around delay d
        const left = d - Math.floor((W - 1) / 2);
        const right = d + Math.ceil((W - 1) / 2);
        if (k < left || k > right) return 0;
        const center = (left + right) / 2;
        const radius = (W + 1) / 2;
        return +(dtAmpX * (1 - Math.abs(k - center) / radius)).toFixed(4);
      } else if (dtInputType === 'impulse') {
        return k === d ? dtAmpX : 0;
      }
      return 0;
    },
    [dtInputType, dtAmpX, dtWidthX, dtDelayX]
  );

  const evalDtH = useCallback(
    (k) => {
      const W = Math.max(1, Math.round(dtWidthH));
      if (dtSystemType === 'moving_average_3') {
        return k >= 0 && k <= 2 ? +(dtAmpH / 3).toFixed(4) : 0;
      } else if (dtSystemType === 'difference') {
        if (k === 0) return dtAmpH * 1.0;
        if (k === 1) return -dtAmpH * 1.0;
        return 0;
      } else if (dtSystemType === 'rectangle') {
        return k >= 0 && k < W ? dtAmpH : 0;
      } else if (dtSystemType === 'exponential') {
        if (k >= 0 && k < W) {
          return +(dtAmpH * Math.pow(0.65, k)).toFixed(4);
        }
        return 0;
      } else if (dtSystemType === 'impulse') {
        return k === 0 ? dtAmpH : 0;
      }
      return 0;
    },
    [dtSystemType, dtAmpH, dtWidthH]
  );

  const evalDtHShifted = useCallback(
    (n, k) => evalDtH(n - k),
    [evalDtH]
  );

  const evalDtProduct = useCallback(
    (n, k) => evalDtX(k) * evalDtHShifted(n, k),
    [evalDtX, evalDtHShifted]
  );

  const computeDtConvolutionAtN = useCallback(
    (n) => {
      let sum = 0;
      let absSum = 0;
      for (let k = dtKMin; k <= dtKMax; k++) {
        const prod = evalDtProduct(n, k);
        sum += prod;
        absSum += Math.abs(prod);
      }
      return { y: +sum.toFixed(4), absOverlap: +absSum.toFixed(4) };
    },
    [dtKMin, dtKMax, evalDtProduct]
  );

  const dtYArray = useMemo(() => {
    const arr = [];
    let maxY = 0.001;
    let minY = 0;
    let maxAbsOverlap = 0.001;

    for (let n = dtNMin; n <= dtNMax; n++) {
      const { y, absOverlap } = computeDtConvolutionAtN(n);
      arr.push({ n, y, absOverlap });
      if (y > maxY) maxY = y;
      if (y < minY) minY = y;
      if (absOverlap > maxAbsOverlap) maxAbsOverlap = absOverlap;
    }
    return { arr, maxY, minY, maxAbsOverlap };
  }, [dtNMin, dtNMax, computeDtConvolutionAtN]);

  const { dtCurrentY, dtCurrentAbsOverlap } = useMemo(() => {
    const { y, absOverlap } = computeDtConvolutionAtN(dtNVal);
    return { dtCurrentY: y, dtCurrentAbsOverlap: absOverlap };
  }, [dtNVal, computeDtConvolutionAtN]);

  const dtPeakInfo = useMemo(() => {
    let maxVal = -Infinity;
    let peakN = 0;
    for (const item of dtYArray.arr) {
      if (item.y > maxVal + 1e-6) {
        maxVal = item.y;
        peakN = item.n;
      }
    }
    return {
      peakVal: maxVal === -Infinity ? 0 : maxVal,
      peakIndex: peakN,
    };
  }, [dtYArray]);

  // DT Widths in whole samples (L_x, L_h, L_y)
  const dtWidthsInfo = useMemo(() => {
    const wX = dtInputType === 'impulse' ? 1 : Math.max(1, Math.round(dtWidthX));
    let wH = 1;
    if (dtSystemType === 'moving_average_3') wH = 3;
    else if (dtSystemType === 'difference') wH = 2;
    else if (dtSystemType === 'impulse') wH = 1;
    else wH = Math.max(1, Math.round(dtWidthH));

    const wY = wX + wH - 1;
    return { wX, wH, wY };
  }, [dtInputType, dtSystemType, dtWidthX, dtWidthH]);

  // ==========================================
  // DYNAMIC OVERLAP STATUS COMPUTATION
  // ==========================================
  const overlapStatus = useMemo(() => {
    if (domainMode === 'CT') {
      const maxOverlap = ctYCurveData.maxAbsOverlap;
      const peakY = Math.max(ctPeakInfo.peakVal, ctCurrentArea);
      const isNoOverlap =
        ctCurrentAbsOverlap <= 0.005 * maxOverlap &&
        Math.abs(ctCurrentArea) <= 0.005 * Math.max(1e-6, ctYCurveData.maxY);

      if (isNoOverlap) {
        return {
          code: 'none',
          label: 'No overlap: y = 0',
          dotColor: 'bg-[#8A8882]',
          badgeStyle: 'bg-[#F3F2EC] text-[#585651] border-[#E6E4DD]',
        };
      }

      const isAtPeak =
        peakY > 1e-5 &&
        ctCurrentArea >= 0.985 * peakY &&
        ctCurrentAbsOverlap >= 0.985 * maxOverlap;

      if (isAtPeak) {
        return {
          code: 'full',
          label: 'Full overlap: y at its peak',
          dotColor: 'bg-[#059669]',
          badgeStyle: 'bg-[#ECFDF5] text-[#059669] border-[#10B981]/30',
        };
      }

      return {
        code: 'partial',
        label: 'Partial overlap: y is changing',
        dotColor: 'bg-[#D97706]',
        badgeStyle: 'bg-[#FFFBEB] text-[#B45309] border-[#F59E0B]/30',
      };
    } else {
      const maxOverlap = dtYArray.maxAbsOverlap;
      const peakY = dtPeakInfo.peakVal;

      if (dtCurrentAbsOverlap <= 1e-6) {
        return {
          code: 'none',
          label: 'No overlap: y = 0',
          dotColor: 'bg-[#8A8882]',
          badgeStyle: 'bg-[#F3F2EC] text-[#585651] border-[#E6E4DD]',
        };
      }

      const isAtPeak =
        peakY > 1e-5 &&
        dtCurrentY >= peakY - 1e-4 &&
        (dtCurrentAbsOverlap >= 0.99 * maxOverlap || dtSystemType === 'difference');

      if (isAtPeak) {
        return {
          code: 'full',
          label: 'Full overlap: y at its peak',
          dotColor: 'bg-[#059669]',
          badgeStyle: 'bg-[#ECFDF5] text-[#059669] border-[#10B981]/30',
        };
      }

      return {
        code: 'partial',
        label: 'Partial overlap: y is changing',
        dotColor: 'bg-[#D97706]',
        badgeStyle: 'bg-[#FFFBEB] text-[#B45309] border-[#F59E0B]/30',
      };
    }
  }, [
    domainMode,
    ctYCurveData,
    ctPeakInfo,
    ctCurrentArea,
    ctCurrentAbsOverlap,
    dtYArray,
    dtPeakInfo,
    dtCurrentY,
    dtCurrentAbsOverlap,
    dtSystemType,
  ]);

  // ==========================================
  // PLAYBACK LOOP CONTROLLER
  // ==========================================
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      lastTimeRef.current = null;
      return;
    }

    if (domainMode === 'CT') {
      const animateCT = (timestamp) => {
        if (lastTimeRef.current == null) lastTimeRef.current = timestamp;
        const deltaSec = (timestamp - lastTimeRef.current) / 1000;
        lastTimeRef.current = timestamp;

        const increment = deltaSec * 1.1 * playSpeed;
        setCtTVal((prev) => {
          const next = prev + increment;
          if (next >= ctTMax) {
            setIsPlaying(false);
            return ctTMax;
          }
          return next;
        });

        animFrameRef.current = requestAnimationFrame(animateCT);
      };
      animFrameRef.current = requestAnimationFrame(animateCT);
    } else {
      let accumulatedTime = 0;
      const stepDuration = 0.55 / playSpeed;

      const animateDT = (timestamp) => {
        if (lastTimeRef.current == null) lastTimeRef.current = timestamp;
        const deltaSec = (timestamp - lastTimeRef.current) / 1000;
        lastTimeRef.current = timestamp;
        accumulatedTime += deltaSec;

        if (accumulatedTime >= stepDuration) {
          accumulatedTime = 0;
          setDtNVal((prev) => {
            const next = prev + 1;
            if (next >= dtNMax) {
              setIsPlaying(false);
              return dtNMax;
            }
            return next;
          });
        }

        animFrameRef.current = requestAnimationFrame(animateDT);
      };
      animFrameRef.current = requestAnimationFrame(animateDT);
    }

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isPlaying, domainMode, playSpeed, ctTMax, dtNMax]);

  const handleStart = () => {
    if (domainMode === 'CT') {
      if (ctTVal >= ctTMax - 0.05) setCtTVal(ctTMin);
    } else {
      if (dtNVal >= dtNMax) setDtNVal(dtNMin);
    }
    setIsPlaying(true);
  };

  const handlePause = () => setIsPlaying(false);

  const handleReset = () => {
    setIsPlaying(false);
    if (domainMode === 'CT') setCtTVal(-4.5);
    else setDtNVal(-4);
  };

  const handleStepForward = () => {
    setIsPlaying(false);
    if (domainMode === 'CT') {
      setCtTVal((prev) => Math.min(ctTMax, +(prev + 0.15).toFixed(2)));
    } else {
      setDtNVal((prev) => Math.min(dtNMax, prev + 1));
    }
  };

  const handleStepBack = () => {
    setIsPlaying(false);
    if (domainMode === 'CT') {
      setCtTVal((prev) => Math.max(ctTMin, +(prev - 0.15).toFixed(2)));
    } else {
      setDtNVal((prev) => Math.max(dtNMin, prev - 1));
    }
  };

  const applyPreset = (presetKey) => {
    setIsPlaying(false);
    if (presetKey === 'dt_ma3') {
      setDomainMode('DT');
      setDtInputType('step');
      setDtSystemType('moving_average_3');
      setDtAmpX(1.0);
      setDtWidthX(4);
      setDtDelayX(0);
      setDtAmpH(1.0);
      setDtWidthH(3);
      setDtNVal(-2);
    } else if (presetKey === 'dt_diff') {
      setDomainMode('DT');
      setDtInputType('step');
      setDtSystemType('difference');
      setDtAmpX(1.0);
      setDtWidthX(4);
      setDtDelayX(0);
      setDtAmpH(1.0);
      setDtWidthH(2);
      setDtNVal(-2);
    } else if (presetKey === 'rect_rect') {
      setDomainMode('CT');
      setCtInputType('rectangle');
      setCtSystemType('rectangle');
      setCtAmpX(1.0);
      setCtWidthX(2.0);
      setCtDelayX(0.0);
      setCtAmpH(1.0);
      setCtWidthH(2.0);
      setCtTVal(-3.5);
    } else if (presetKey === 'step_rc') {
      setDomainMode('CT');
      setCtInputType('rectangle');
      setCtSystemType('exponential');
      setCtAmpX(1.0);
      setCtWidthX(3.0);
      setCtDelayX(0.0);
      setCtAmpH(1.0);
      setCtWidthH(1.2);
      setCtTVal(-3.5);
    }
  };

  // ==========================================
  // SVG DIMENSIONS & SCALES
  // ==========================================
  const svgWidth = 840;
  const svgHeight = 112;
  const margin = { left: 68, right: 28, top: 18, bottom: 22 };
  const plotWidth = svgWidth - margin.left - margin.right;
  const plotHeight = svgHeight - margin.top - margin.bottom;

  const ctTimeTicks = [-8, -6, -4, -2, 0, 2, 4, 6, 8];
  const dtTimeTicks = [-10, -8, -6, -4, -2, 0, 2, 4, 6, 8, 10];

  const tauToX = (tau) => margin.left + ((tau - tauMin) / (tauMax - tauMin)) * plotWidth;
  const kToX = (k) => margin.left + ((k - dtKMin) / (dtKMax - dtKMin)) * plotWidth;

  const yToCoord = (val, minY, maxY) => {
    const range = maxY - minY || 1;
    const clamped = Math.max(minY, Math.min(maxY, val));
    return margin.top + (1 - (clamped - minY) / range) * plotHeight;
  };

  // Scales
  const ctScaleX = useMemo(() => ({ minY: -0.2, maxY: Math.max(1.2, ctAmpX * 1.25) }), [ctAmpX]);
  const ctScaleH = useMemo(
    () => ({ minY: -0.2, maxY: ctSystemType === 'impulse' ? 3.6 : Math.max(1.2, ctAmpH * 1.25) }),
    [ctAmpH, ctSystemType]
  );
  const ctScaleProduct = useMemo(
    () => ({ minY: -0.2, maxY: ctSystemType === 'impulse' ? 3.6 : Math.max(1.2, ctAmpX * ctAmpH * 1.25) }),
    [ctAmpX, ctAmpH, ctSystemType]
  );
  const ctScaleY = useMemo(
    () => ({ minY: -0.2, maxY: Math.max(1.2, ctYCurveData.maxY * 1.2) }),
    [ctYCurveData.maxY]
  );

  const dtScaleX = useMemo(() => ({ minY: -0.2, maxY: Math.max(1.2, dtAmpX * 1.25) }), [dtAmpX]);
  const dtScaleH = useMemo(
    () => ({
      minY: dtSystemType === 'difference' ? -1.25 * dtAmpH : -0.2,
      maxY: Math.max(1.2, dtAmpH * 1.25),
    }),
    [dtAmpH, dtSystemType]
  );
  const dtScaleProduct = useMemo(
    () => ({
      minY: dtSystemType === 'difference' ? -1.25 * dtAmpX * dtAmpH : -0.2,
      maxY: Math.max(1.2, dtAmpX * dtAmpH * 1.25),
    }),
    [dtAmpX, dtAmpH, dtSystemType]
  );
  const dtScaleY = useMemo(
    () => ({
      minY: Math.min(-0.2, dtYArray.minY * 1.2),
      maxY: Math.max(1.2, dtYArray.maxY * 1.25),
    }),
    [dtYArray.minY, dtYArray.maxY]
  );

  // CT Paths
  const ctPathX = useMemo(() => {
    let d = '';
    for (let i = 0; i <= tauSteps; i++) {
      const tau = tauPoints[i];
      const px = tauToX(tau);
      const py = yToCoord(evalCtX(tau), ctScaleX.minY, ctScaleX.maxY);
      d += i === 0 ? `M ${px.toFixed(1)} ${py.toFixed(1)}` : ` L ${px.toFixed(1)} ${py.toFixed(1)}`;
    }
    return d;
  }, [tauPoints, tauSteps, evalCtX, ctScaleX]);

  const ctPathH = useMemo(() => {
    let d = '';
    for (let i = 0; i <= tauSteps; i++) {
      const tau = tauPoints[i];
      const px = tauToX(tau);
      const py = yToCoord(evalCtHShifted(ctTVal, tau), ctScaleH.minY, ctScaleH.maxY);
      d += i === 0 ? `M ${px.toFixed(1)} ${py.toFixed(1)}` : ` L ${px.toFixed(1)} ${py.toFixed(1)}`;
    }
    return d;
  }, [tauPoints, tauSteps, ctTVal, evalCtHShifted, ctScaleH]);

  const { ctPathProduct, ctAreaPathProduct } = useMemo(() => {
    let lineD = '';
    const zeroY = yToCoord(0, ctScaleProduct.minY, ctScaleProduct.maxY);
    const firstX = tauToX(tauPoints[0]);
    let areaD = `M ${firstX.toFixed(1)} ${zeroY.toFixed(1)}`;

    for (let i = 0; i <= tauSteps; i++) {
      const tau = tauPoints[i];
      const val = evalCtProduct(ctTVal, tau);
      const px = tauToX(tau);
      const py = yToCoord(val, ctScaleProduct.minY, ctScaleProduct.maxY);
      lineD += i === 0 ? `M ${px.toFixed(1)} ${py.toFixed(1)}` : ` L ${px.toFixed(1)} ${py.toFixed(1)}`;
      areaD += ` L ${px.toFixed(1)} ${py.toFixed(1)}`;
    }

    const lastX = tauToX(tauPoints[tauSteps]);
    areaD += ` L ${lastX.toFixed(1)} ${zeroY.toFixed(1)} Z`;
    return { ctPathProduct: lineD, ctAreaPathProduct: areaD };
  }, [tauPoints, tauSteps, ctTVal, evalCtProduct, ctScaleProduct]);

  const { ctPathYProgressive, ctPathYFull, ctCurrentYPoint } = useMemo(() => {
    const { tValues, yValues } = ctYCurveData;
    let fullD = '';
    let progD = '';
    const curPoint = { x: tauToX(ctTVal), y: yToCoord(ctCurrentArea, ctScaleY.minY, ctScaleY.maxY) };

    for (let i = 0; i <= ctSteps; i++) {
      const t = tValues[i];
      const y = yValues[i];
      const px = tauToX(t);
      const py = yToCoord(y, ctScaleY.minY, ctScaleY.maxY);

      fullD += i === 0 ? `M ${px.toFixed(1)} ${py.toFixed(1)}` : ` L ${px.toFixed(1)} ${py.toFixed(1)}`;
      if (t <= ctTVal) {
        progD += progD === '' ? `M ${px.toFixed(1)} ${py.toFixed(1)}` : ` L ${px.toFixed(1)} ${py.toFixed(1)}`;
      }
    }

    progD += progD !== '' ? ` L ${curPoint.x.toFixed(1)} ${curPoint.y.toFixed(1)}` : `M ${curPoint.x.toFixed(1)} ${curPoint.y.toFixed(1)}`;

    return {
      ctPathYProgressive: progD,
      ctPathYFull: fullD,
      ctCurrentYPoint: curPoint,
    };
  }, [ctYCurveData, ctSteps, ctTVal, ctCurrentArea, ctScaleY]);

  // Background grid for plots
  const renderBackgroundGrid = (
    title,
    badgeText,
    badgeColor,
    minY,
    maxY,
    isBottomPlot = false
  ) => {
    const zeroY = yToCoord(0, minY, maxY);
    const cursorX = domainMode === 'CT' ? tauToX(ctTVal) : kToX(dtNVal);
    const ticks = domainMode === 'CT' ? ctTimeTicks : dtTimeTicks;

    return (
      <>
        <rect
          x={margin.left}
          y={margin.top}
          width={plotWidth}
          height={plotHeight}
          fill="#FAF9F6"
          stroke="#E6E4DD"
          strokeWidth="1"
        />

        {ticks.map((tick) => {
          const x = domainMode === 'CT' ? tauToX(tick) : kToX(tick);
          const isZero = tick === 0;
          return (
            <g key={`grid-${tick}`}>
              <line
                x1={x}
                y1={margin.top}
                x2={x}
                y2={margin.top + plotHeight}
                stroke={isZero ? '#C4C2B8' : '#ECEAE2'}
                strokeWidth={isZero ? '1.5' : '1'}
                strokeDasharray={isZero ? 'none' : '2 3'}
              />
              <text
                x={x}
                y={margin.top + plotHeight + 13}
                textAnchor="middle"
                className={`text-[9.5px] font-mono select-none ${
                  isZero ? 'fill-[#1A1917] font-bold' : 'fill-[#8A8882]'
                }`}
              >
                {tick}
              </text>
            </g>
          );
        })}

        <line
          x1={margin.left}
          y1={zeroY}
          x2={margin.left + plotWidth}
          y2={zeroY}
          stroke="#C4C2B8"
          strokeWidth="1.25"
        />

        <line
          x1={cursorX}
          y1={margin.top}
          x2={cursorX}
          y2={margin.top + plotHeight}
          stroke="#C85A32"
          strokeWidth="1.5"
          strokeDasharray="4 2"
          opacity="0.85"
        />

        <text
          x={margin.left + 8}
          y={margin.top - 4}
          className="text-[10px] sm:text-[10.5px] font-mono font-bold fill-[#1A1917] tracking-tight"
        >
          {title}
        </text>

        <text
          x={margin.left + plotWidth - 6}
          y={margin.top - 4}
          textAnchor="end"
          className={`text-[10px] sm:text-[10.5px] font-mono font-semibold ${badgeColor}`}
        >
          {badgeText}
        </text>

        {isBottomPlot && (
          <text
            x={margin.left + plotWidth / 2}
            y={svgHeight - 1}
            textAnchor="middle"
            className="text-[9.5px] sm:text-[10px] font-mono font-semibold fill-[#75736E]"
          >
            {domainMode === 'CT'
              ? 'Continuous time parameter τ (or shift t) [s]'
              : 'Discrete sample index k (or shift n)'}
          </text>
        )}
      </>
    );
  };

  const renderStems = (dataGetter, color, minY, maxY, circleRadius = 3.5) => {
    const zeroY = yToCoord(0, minY, maxY);

    return dtKIndices.map((k) => {
      const val = dataGetter(k);
      const x = kToX(k);
      const y = yToCoord(val, minY, maxY);
      const isZero = Math.abs(val) < 0.0001;

      return (
        <g key={`stem-${k}`}>
          <line
            x1={x}
            y1={zeroY}
            x2={x}
            y2={y}
            stroke={color}
            strokeWidth={isZero ? '1' : '2'}
            opacity={isZero ? '0.35' : '1'}
          />
          <circle
            cx={x}
            cy={y}
            r={isZero ? 2 : circleRadius}
            fill={isZero ? '#D1CFCE' : color}
            stroke="#FFFFFF"
            strokeWidth="1.2"
          />
        </g>
      );
    });
  };

  const isDtWidthHLocked =
    dtSystemType === 'moving_average_3' ||
    dtSystemType === 'difference' ||
    dtSystemType === 'impulse';

  return (
    <div className="w-full">
      {/* ========================================================= */}
      {/* 2-COLUMN LAYOUT MATCHING ALL OTHER MODULES (8 COLS / 4)   */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ======================================================= */}
        {/* LEFT 8 COLS: PLOTS AT TOP, OVERLAP STATUS, CONTROLS,    */}
        {/* AND RESULTS PANEL BELOW                                 */}
        {/* ======================================================= */}
        <div className="lg:col-span-8 min-w-0 bg-white rounded-lg border border-[#E6E4DD] p-4 sm:p-6 shadow-xs flex flex-col space-y-4">
          {/* Top Title & Status Row (No intro box - directly into workspace) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#E6E4DD] gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#C85A32] shrink-0" />
              <h2 className="text-xs sm:text-sm font-bold tracking-tight text-[#1A1917] uppercase font-mono">
                {domainMode === 'CT'
                  ? 'Continuous-Time Convolution Integral & Sliding Kernel'
                  : 'Discrete-Time Convolution Sum & Stem Sequences'}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-[#8A8882]">
                {domainMode === 'CT'
                  ? `t = ${ctTVal >= 0 ? `+${ctTVal.toFixed(2)}` : ctTVal.toFixed(2)}s · y(t) = ${ctCurrentArea.toFixed(4)}`
                  : `n = ${dtNVal >= 0 ? `+${dtNVal}` : dtNVal} · y[n] = ${dtCurrentY.toFixed(4)}`}
              </span>
            </div>
          </div>

          {/* ======================================================= */}
          {/* 1. FOUR STACKED PLOTS AT THE TOP                        */}
          {/* ======================================================= */}
          <div className="space-y-2.5">
            {domainMode === 'CT' ? (
              /* CT 4 PLOTS */
              <>
                {/* 1. Input Signal x(τ) */}
                <div className="w-full overflow-x-auto rounded border border-[#E6E4DD]/70">
                  <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full min-w-[520px] select-none block">
                    {renderBackgroundGrid(
                      `1. Input Signal x(τ) [${ctInputType.toUpperCase()}]`,
                      `A=${ctAmpX.toFixed(1)}, Wₓ=${ctWidthX.toFixed(1)}s, t₀=${ctDelayX >= 0 ? `+${ctDelayX.toFixed(1)}` : ctDelayX.toFixed(1)}s`,
                      'fill-[#2563EB]',
                      ctScaleX.minY,
                      ctScaleX.maxY
                    )}
                    <path d={ctPathX} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    <text x={margin.left - 10} y={margin.top + 10} textAnchor="end" className="text-[10px] font-mono font-bold fill-[#2563EB]">
                      x(τ)
                    </text>
                  </svg>
                </div>

                {/* 2. Flipped & Shifted h(t - τ) */}
                <div className="w-full overflow-x-auto rounded border border-[#E6E4DD]/70">
                  <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full min-w-[520px] select-none block">
                    {renderBackgroundGrid(
                      `2. Flipped & Shifted Impulse Response h(t - τ) [${ctSystemType.toUpperCase()}]`,
                      `Aₕ=${ctAmpH.toFixed(1)}, Wₕ=${ctSystemType === 'impulse' ? 'δ' : `${ctWidthH.toFixed(1)}s`} at t=${ctTVal.toFixed(2)}s`,
                      'fill-[#D97706]',
                      ctScaleH.minY,
                      ctScaleH.maxY
                    )}
                    <path d={ctPathH} fill="none" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx={tauToX(ctTVal)} cy={yToCoord(evalCtHShifted(ctTVal, ctTVal), ctScaleH.minY, ctScaleH.maxY)} r="4" fill="#D97706" stroke="#FFFFFF" strokeWidth="1.5" />
                    <text x={margin.left - 10} y={margin.top + 10} textAnchor="end" className="text-[10px] font-mono font-bold fill-[#D97706]">
                      h(t-τ)
                    </text>
                  </svg>
                </div>

                {/* 3. Product x(τ)·h(t-τ) with SHADED AREA */}
                <div className="w-full overflow-x-auto rounded border border-[#E6E4DD]/70">
                  <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full min-w-[520px] select-none block">
                    <defs>
                      <linearGradient id="ctGradHarmFinal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C85A32" stopOpacity="0.45" />
                        <stop offset="100%" stopColor="#C85A32" stopOpacity="0.10" />
                      </linearGradient>
                      <pattern id="ctHatchHarmFinal" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                        <line x1="0" y1="0" x2="0" y2="8" stroke="#C85A32" strokeWidth="1.2" opacity="0.25" />
                      </pattern>
                    </defs>
                    {renderBackgroundGrid(
                      '3. Overlap Product x(τ) · h(t - τ) [Area Shaded]',
                      `Shaded Area = ∫ = ${ctCurrentArea.toFixed(4)}`,
                      'fill-[#C85A32]',
                      ctScaleProduct.minY,
                      ctScaleProduct.maxY
                    )}
                    <path d={ctAreaPathProduct} fill="url(#ctGradHarmFinal)" />
                    <path d={ctAreaPathProduct} fill="url(#ctHatchHarmFinal)" />
                    <path d={ctPathProduct} fill="none" stroke="#C85A32" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    <text x={margin.left - 10} y={margin.top + 10} textAnchor="end" className="text-[10px] font-mono font-bold fill-[#C85A32]">
                      x·h
                    </text>
                  </svg>
                </div>

                {/* 4. Output y(t) drawn progressively */}
                <div className="w-full overflow-x-auto rounded border border-[#E6E4DD]/70">
                  <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full min-w-[520px] select-none block">
                    {renderBackgroundGrid(
                      '4. Output Signal y(t) = (x * h)(t) [Drawn Progressively]',
                      `y(${ctTVal >= 0 ? `+${ctTVal.toFixed(2)}` : ctTVal.toFixed(2)}) = ${ctCurrentArea.toFixed(4)}`,
                      'fill-[#1A1917]',
                      ctScaleY.minY,
                      ctScaleY.maxY,
                      true
                    )}
                    <path d={ctPathYFull} fill="none" stroke="#D1CFCE" strokeWidth="1.5" strokeDasharray="3 3" />
                    <path d={ctPathYProgressive} fill="none" stroke="#C85A32" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx={ctCurrentYPoint.x} cy={ctCurrentYPoint.y} r="5" fill="#C85A32" stroke="#FFFFFF" strokeWidth="2" />
                    <circle cx={ctCurrentYPoint.x} cy={ctCurrentYPoint.y} r="9" fill="none" stroke="#C85A32" strokeWidth="1.2" opacity="0.4" className="animate-ping" />
                    <text x={margin.left - 10} y={margin.top + 10} textAnchor="end" className="text-[10px] font-mono font-bold fill-[#C85A32]">
                      y(t)
                    </text>
                  </svg>
                </div>
              </>
            ) : (
              /* DT 4 STEM PLOTS */
              <>
                {/* 1. Discrete Input x[k] */}
                <div className="w-full overflow-x-auto rounded border border-[#E6E4DD]/70">
                  <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full min-w-[520px] select-none block">
                    {renderBackgroundGrid(
                      `1. Discrete Input Sequence x[k] [${dtInputType.toUpperCase()}]`,
                      `A=${dtAmpX.toFixed(1)}, Wₓ=${dtWidthsInfo.wX} samp, n₀=${dtDelayX >= 0 ? `+${dtDelayX}` : dtDelayX}`,
                      'fill-[#2563EB]',
                      dtScaleX.minY,
                      dtScaleX.maxY
                    )}
                    {renderStems(evalDtX, '#2563EB', dtScaleX.minY, dtScaleX.maxY, 3.5)}
                    <text x={margin.left - 10} y={margin.top + 10} textAnchor="end" className="text-[10px] font-mono font-bold fill-[#2563EB]">
                      x[k]
                    </text>
                  </svg>
                </div>

                {/* 2. Discrete Flipped & Shifted h[n - k] */}
                <div className="w-full overflow-x-auto rounded border border-[#E6E4DD]/70">
                  <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full min-w-[520px] select-none block">
                    {renderBackgroundGrid(
                      `2. Flipped & Shifted Impulse Response h[n - k] [${dtSystemType.toUpperCase()}]`,
                      `Aₕ=${dtAmpH.toFixed(1)}, Wₕ=${dtWidthsInfo.wH} samp at n=${dtNVal}`,
                      'fill-[#D97706]',
                      dtScaleH.minY,
                      dtScaleH.maxY
                    )}
                    {renderStems((k) => evalDtHShifted(dtNVal, k), '#D97706', dtScaleH.minY, dtScaleH.maxY, 3.5)}
                    <text x={margin.left - 10} y={margin.top + 10} textAnchor="end" className="text-[10px] font-mono font-bold fill-[#D97706]">
                      h[n-k]
                    </text>
                  </svg>
                </div>

                {/* 3. Discrete Product x[k] · h[n - k] */}
                <div className="w-full overflow-x-auto rounded border border-[#E6E4DD]/70">
                  <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full min-w-[520px] select-none block">
                    {renderBackgroundGrid(
                      '3. Overlap Product x[k] · h[n - k] [Sum of Stems]',
                      `Sum = ∑ = ${dtCurrentY.toFixed(4)}`,
                      'fill-[#C85A32]',
                      dtScaleProduct.minY,
                      dtScaleProduct.maxY
                    )}
                    {dtKIndices.map((k) => {
                      const val = evalDtProduct(dtNVal, k);
                      if (Math.abs(val) < 0.001) return null;
                      const x = kToX(k);
                      const zeroY = yToCoord(0, dtScaleProduct.minY, dtScaleProduct.maxY);
                      const y = yToCoord(val, dtScaleProduct.minY, dtScaleProduct.maxY);
                      return (
                        <rect
                          key={`dt-bar-${k}`}
                          x={x - 6}
                          y={Math.min(zeroY, y)}
                          width={12}
                          height={Math.max(2, Math.abs(zeroY - y))}
                          fill="#C85A32"
                          opacity="0.22"
                          rx="2"
                        />
                      );
                    })}
                    {renderStems((k) => evalDtProduct(dtNVal, k), '#C85A32', dtScaleProduct.minY, dtScaleProduct.maxY, 4)}
                    <text x={margin.left - 10} y={margin.top + 10} textAnchor="end" className="text-[10px] font-mono font-bold fill-[#C85A32]">
                      x·h
                    </text>
                  </svg>
                </div>

                {/* 4. Discrete Output y[n] drawn progressively */}
                <div className="w-full overflow-x-auto rounded border border-[#E6E4DD]/70">
                  <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full min-w-[520px] select-none block">
                    {renderBackgroundGrid(
                      '4. Output Sequence y[n] = (x * h)[n] [Drawn Progressively]',
                      `y[${dtNVal}] = ${dtCurrentY.toFixed(4)}`,
                      'fill-[#1A1917]',
                      dtScaleY.minY,
                      dtScaleY.maxY,
                      true
                    )}
                    {dtYArray.arr.map((item) => {
                      const x = kToX(item.n);
                      const zeroY = yToCoord(0, dtScaleY.minY, dtScaleY.maxY);
                      const y = yToCoord(item.y, dtScaleY.minY, dtScaleY.maxY);
                      return (
                        <g key={`dt-ghost-${item.n}`}>
                          <line x1={x} y1={zeroY} x2={x} y2={y} stroke="#D1CFCE" strokeWidth="1.25" strokeDasharray="2 2" />
                          <circle cx={x} cy={y} r="2.5" fill="#FAF9F6" stroke="#C4C2B8" strokeWidth="1" />
                        </g>
                      );
                    })}
                    {dtYArray.arr
                      .filter((item) => item.n <= dtNVal)
                      .map((item) => {
                        const isCurrent = item.n === dtNVal;
                        const x = kToX(item.n);
                        const zeroY = yToCoord(0, dtScaleY.minY, dtScaleY.maxY);
                        const y = yToCoord(item.y, dtScaleY.minY, dtScaleY.maxY);
                        return (
                          <g key={`dt-prog-${item.n}`}>
                            <line x1={x} y1={zeroY} x2={x} y2={y} stroke="#C85A32" strokeWidth={isCurrent ? '2.5' : '1.75'} />
                            <circle cx={x} cy={y} r={isCurrent ? 5 : 3.5} fill="#C85A32" stroke="#FFFFFF" strokeWidth="1.5" />
                            {isCurrent && (
                              <circle cx={x} cy={y} r="9" fill="none" stroke="#C85A32" strokeWidth="1.2" opacity="0.4" className="animate-ping" />
                            )}
                          </g>
                        );
                      })}
                    <text x={margin.left - 10} y={margin.top + 10} textAnchor="end" className="text-[10px] font-mono font-bold fill-[#C85A32]">
                      y[n]
                    </text>
                  </svg>
                </div>
              </>
            )}
          </div>

          {/* ======================================================= */}
          {/* OVERLAP STATUS LABEL (BELOW PLOTS)                      */}
          {/* ======================================================= */}
          <div
            className={`px-3.5 py-2 rounded-md border text-xs font-mono flex flex-wrap items-center justify-between gap-2 transition-colors ${overlapStatus.badgeStyle}`}
            aria-live="polite"
          >
            <div className="flex items-center gap-2 font-semibold">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${overlapStatus.dotColor}`} />
              <span>{overlapStatus.label}</span>
            </div>
            <span className="text-[11px] opacity-80">
              {domainMode === 'CT'
                ? `t = ${ctTVal >= 0 ? `+${ctTVal.toFixed(2)}` : ctTVal.toFixed(2)} s · y(t) = ${ctCurrentArea.toFixed(4)}`
                : `n = ${dtNVal >= 0 ? `+${dtNVal}` : dtNVal} · y[n] = ${dtCurrentY.toFixed(4)}`}
            </span>
          </div>

          {/* ======================================================= */}
          {/* 2. ONE CONTROLS PANEL (BELOW THE PLOTS)                 */}
          {/* ======================================================= */}
          <div className="p-4 sm:p-5 rounded-lg bg-[#FAF9F6] border border-[#E6E4DD] space-y-4">
            {/* Header with Title and CT / DT Toggle */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-[#E6E4DD]">
              <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#75736E] font-semibold">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#C85A32]" />
                <span>Convolution Controls & Signal Parameters</span>
              </div>

              {/* CT / DT Toggle Button Group */}
              <div className="flex items-center bg-white p-0.5 rounded-md border border-[#E6E4DD] shadow-2xs">
                <button
                  onClick={() => {
                    setDomainMode('CT');
                    setIsPlaying(false);
                  }}
                  className={`px-3 py-1 rounded text-xs font-mono font-bold transition cursor-pointer ${
                    domainMode === 'CT'
                      ? 'bg-[#C85A32] text-white shadow-2xs'
                      : 'text-[#585651] hover:text-[#1A1917]'
                  }`}
                >
                  CT: x(t)
                </button>
                <button
                  onClick={() => {
                    setDomainMode('DT');
                    setIsPlaying(false);
                  }}
                  className={`px-3 py-1 rounded text-xs font-mono font-bold transition cursor-pointer ${
                    domainMode === 'DT'
                      ? 'bg-[#C85A32] text-white shadow-2xs'
                      : 'text-[#585651] hover:text-[#1A1917]'
                  }`}
                >
                  DT: x[n]
                </button>
              </div>
            </div>

            {/* Playback Buttons Row: Start, Pause, Step, Reset, Speed & Time Shift Slider */}
            <div className="p-3 bg-white rounded-md border border-[#E6E4DD] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* Playback Buttons: Start, Pause, Step, Reset */}
              <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                {!isPlaying ? (
                  <button
                    onClick={handleStart}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#C85A32] text-white hover:bg-[#B54E28] transition font-mono text-xs font-semibold shadow-2xs cursor-pointer"
                    title="Start simulation"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start</span>
                  </button>
                ) : (
                  <button
                    onClick={handlePause}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#1A1917] text-white hover:bg-[#33322E] transition font-mono text-xs font-semibold shadow-2xs cursor-pointer"
                    title="Pause simulation"
                  >
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>Pause</span>
                  </button>
                )}

                <button
                  onClick={handleStepBack}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white border border-[#E6E4DD] text-[#1A1917] hover:bg-[#F3F2EC] transition font-mono text-xs font-medium cursor-pointer"
                  title={domainMode === 'CT' ? 'Step backward (Δt = -0.15s)' : 'Step backward (Δn = -1)'}
                >
                  <StepBack className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">-Step</span>
                </button>

                <button
                  onClick={handleStepForward}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white border border-[#E6E4DD] text-[#1A1917] hover:bg-[#F3F2EC] transition font-mono text-xs font-medium cursor-pointer"
                  title={domainMode === 'CT' ? 'Step forward (Δt = +0.15s)' : 'Step forward (Δn = +1)'}
                >
                  <StepForward className="w-3.5 h-3.5" />
                  <span>Step</span>
                </button>

                <button
                  onClick={handleReset}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white border border-[#E6E4DD] text-[#585651] hover:text-[#1A1917] hover:bg-[#F3F2EC] transition font-mono text-xs font-medium cursor-pointer"
                  title="Reset time cursor"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset</span>
                </button>

                {/* Speed Multiplier */}
                <div className="flex items-center ml-1 border-l border-[#E6E4DD] pl-2 gap-1">
                  <span className="text-[10px] font-mono text-[#75736E] hidden sm:inline">Speed:</span>
                  {[0.5, 1.0, 2.0].map((spd) => (
                    <button
                      key={spd}
                      onClick={() => setPlaySpeed(spd)}
                      className={`px-1.5 py-0.5 text-[10px] font-mono rounded cursor-pointer ${
                        playSpeed === spd
                          ? 'bg-[#C85A32] text-white font-bold'
                          : 'bg-white text-[#585651] border border-[#E6E4DD] hover:bg-[#F3F2EC]'
                      }`}
                    >
                      {spd}×
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Slider */}
              <div className="flex-1 flex items-center gap-2 min-w-[150px]">
                <span className="text-xs font-mono font-bold text-[#1A1917] shrink-0">
                  {domainMode === 'CT' ? 'Shift t:' : 'Shift n:'}
                </span>
                <div className="relative flex-1 flex items-center">
                  {domainMode === 'CT' ? (
                    <input
                      type="range"
                      min={ctTMin}
                      max={ctTMax}
                      step="0.02"
                      value={ctTVal}
                      onChange={(e) => {
                        setIsPlaying(false);
                        setCtTVal(parseFloat(e.target.value));
                      }}
                      className="w-full h-1.5 bg-[#E6E4DD] rounded-lg appearance-none cursor-pointer accent-[#C85A32]"
                    />
                  ) : (
                    <input
                      type="range"
                      min={dtNMin}
                      max={dtNMax}
                      step="1"
                      value={dtNVal}
                      onChange={(e) => {
                        setIsPlaying(false);
                        setDtNVal(parseInt(e.target.value, 10));
                      }}
                      className="w-full h-1.5 bg-[#E6E4DD] rounded-lg appearance-none cursor-pointer accent-[#C85A32]"
                    />
                  )}
                </div>
                <span className="font-mono text-xs font-bold text-[#C85A32] bg-[#FAF9F6] border border-[#E6E4DD] px-2 py-0.5 rounded min-w-[62px] text-center shadow-2xs">
                  {domainMode === 'CT'
                    ? `${ctTVal >= 0 ? `+${ctTVal.toFixed(2)}` : ctTVal.toFixed(2)}s`
                    : `n=${dtNVal >= 0 ? `+${dtNVal}` : dtNVal}`}
                </span>
              </div>
            </div>

            {/* Input & System Sub-Panels (2-column grid, stacks cleanly on mobile) */}
            {domainMode === 'CT' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Left Card: CT Input Signal x(τ) */}
                <div className="p-3.5 bg-white rounded-md border border-[#E6E4DD] space-y-3">
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#F3F2EC]">
                    <span className="text-xs font-mono font-bold text-[#2563EB] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                      Input Signal x(τ)
                    </span>
                    <span className="text-[10px] font-mono text-[#8A8882]">Continuous</span>
                  </div>

                  {/* Input Dropdown */}
                  <div>
                    <label className="block text-xs font-medium text-[#1A1917] mb-1">Waveform</label>
                    <select
                      value={ctInputType}
                      onChange={(e) => setCtInputType(e.target.value)}
                      className="w-full text-xs bg-[#FAF9F6] border border-[#E6E4DD] rounded px-2.5 py-1.5 text-[#1A1917] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    >
                      <option value="rectangle">Rectangle</option>
                      <option value="triangle">Triangle</option>
                      <option value="gaussian">Gaussian</option>
                    </select>
                  </div>

                  {/* Amplitude Slider for x */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-[#1A1917]">Input Amplitude (Aₓ)</span>
                      <span className="font-mono text-[#2563EB] font-semibold">{ctAmpX.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="2.5"
                      step="0.1"
                      value={ctAmpX}
                      onChange={(e) => setCtAmpX(parseFloat(e.target.value))}
                      className="w-full accent-[#2563EB] cursor-pointer"
                    />
                  </div>

                  {/* Separate Width Slider for x */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-[#1A1917]">Input Width (Wₓ)</span>
                      <span className="font-mono text-[#2563EB] font-semibold">{ctWidthX.toFixed(1)} s</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="3.5"
                      step="0.1"
                      value={ctWidthX}
                      onChange={(e) => setCtWidthX(parseFloat(e.target.value))}
                      className="w-full accent-[#2563EB] cursor-pointer"
                    />
                  </div>

                  {/* Input Delay Slider for x */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-[#1A1917] flex items-center gap-1">
                        <MoveHorizontal className="w-3 h-3 text-[#2563EB]" />
                        Input Delay (t₀)
                      </span>
                      <span className="font-mono text-[#2563EB] font-semibold">
                        {ctDelayX >= 0 ? `+${ctDelayX.toFixed(1)}` : ctDelayX.toFixed(1)} s
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-3.0"
                      max="3.0"
                      step="0.1"
                      value={ctDelayX}
                      onChange={(e) => setCtDelayX(parseFloat(e.target.value))}
                      className="w-full accent-[#2563EB] cursor-pointer"
                    />
                  </div>
                </div>

                {/* Right Card: CT System Response h(τ) */}
                <div className="p-3.5 bg-white rounded-md border border-[#E6E4DD] space-y-3">
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#F3F2EC]">
                    <span className="text-xs font-mono font-bold text-[#D97706] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#D97706]" />
                      System Response h(τ)
                    </span>
                    <span className="text-[10px] font-mono text-[#8A8882]">LTI Kernel</span>
                  </div>

                  {/* System Dropdown */}
                  <div>
                    <label className="block text-xs font-medium text-[#1A1917] mb-1">Impulse Response</label>
                    <select
                      value={ctSystemType}
                      onChange={(e) => setCtSystemType(e.target.value)}
                      className="w-full text-xs bg-[#FAF9F6] border border-[#E6E4DD] rounded px-2.5 py-1.5 text-[#1A1917] focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                    >
                      <option value="rectangle">Rectangle</option>
                      <option value="exponential">RC Exponential</option>
                      <option value="impulse">Impulse</option>
                    </select>
                  </div>

                  {/* Amplitude Slider for h */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-[#1A1917]">System Amplitude (Aₕ)</span>
                      <span className="font-mono text-[#D97706] font-semibold">{ctAmpH.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="2.5"
                      step="0.1"
                      value={ctAmpH}
                      onChange={(e) => setCtAmpH(parseFloat(e.target.value))}
                      className="w-full accent-[#D97706] cursor-pointer"
                    />
                  </div>

                  {/* Separate Width Slider for h */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-[#1A1917]">
                        {ctSystemType === 'exponential' ? 'Time Constant (Wₕ / τ)' : 'System Width (Wₕ)'}
                      </span>
                      <span className="font-mono text-[#D97706] font-semibold">
                        {ctSystemType === 'impulse' ? '0.0 s (δ)' : `${ctWidthH.toFixed(1)} s`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="3.5"
                      step="0.1"
                      value={ctWidthH}
                      disabled={ctSystemType === 'impulse'}
                      onChange={(e) => setCtWidthH(parseFloat(e.target.value))}
                      className={`w-full accent-[#D97706] ${
                        ctSystemType === 'impulse' ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* DT Controls */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Left Card: DT Input x[k] */}
                <div className="p-3.5 bg-white rounded-md border border-[#E6E4DD] space-y-3">
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#F3F2EC]">
                    <span className="text-xs font-mono font-bold text-[#2563EB] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                      Discrete Input x[k]
                    </span>
                    <span className="text-[10px] font-mono text-[#8A8882]">Samples</span>
                  </div>

                  {/* DT Input Dropdown */}
                  <div>
                    <label className="block text-xs font-medium text-[#1A1917] mb-1">Sequence Shape</label>
                    <select
                      value={dtInputType}
                      onChange={(e) => setDtInputType(e.target.value)}
                      className="w-full text-xs bg-[#FAF9F6] border border-[#E6E4DD] rounded px-2.5 py-1.5 text-[#1A1917] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                    >
                      <option value="step">Step Pulse [0..W-1]</option>
                      <option value="rectangle">Symmetric Rectangle</option>
                      <option value="triangle">Triangle</option>
                      <option value="impulse">Unit Impulse δ[k]</option>
                    </select>
                  </div>

                  {/* Amplitude Slider for x[k] */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-[#1A1917]">Input Amplitude (Aₓ)</span>
                      <span className="font-mono text-[#2563EB] font-semibold">{dtAmpX.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="2.5"
                      step="0.1"
                      value={dtAmpX}
                      onChange={(e) => setDtAmpX(parseFloat(e.target.value))}
                      className="w-full accent-[#2563EB] cursor-pointer"
                    />
                  </div>

                  {/* Separate Width Slider for x[k] in whole samples */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-[#1A1917]">Input Width (Wₓ)</span>
                      <span className="font-mono text-[#2563EB] font-semibold">
                        {dtWidthsInfo.wX} {dtWidthsInfo.wX === 1 ? 'sample' : 'samples'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="4"
                      step="1"
                      value={dtWidthX}
                      disabled={dtInputType === 'impulse'}
                      onChange={(e) => setDtWidthX(parseInt(e.target.value, 10))}
                      className={`w-full accent-[#2563EB] ${
                        dtInputType === 'impulse' ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    />
                  </div>

                  {/* Input Delay Slider for x[k] in whole samples */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-[#1A1917] flex items-center gap-1">
                        <MoveHorizontal className="w-3 h-3 text-[#2563EB]" />
                        Input Delay (n₀)
                      </span>
                      <span className="font-mono text-[#2563EB] font-semibold">
                        {dtDelayX >= 0 ? `+${dtDelayX}` : dtDelayX} {Math.abs(dtDelayX) === 1 ? 'sample' : 'samples'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="-3"
                      max="3"
                      step="1"
                      value={dtDelayX}
                      onChange={(e) => setDtDelayX(parseInt(e.target.value, 10))}
                      className="w-full accent-[#2563EB] cursor-pointer"
                    />
                  </div>
                </div>

                {/* Right Card: DT System h[k] */}
                <div className="p-3.5 bg-white rounded-md border border-[#E6E4DD] space-y-3">
                  <div className="flex items-center justify-between pb-1.5 border-b border-[#F3F2EC]">
                    <span className="text-xs font-mono font-bold text-[#D97706] flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#D97706]" />
                      System Filter h[k]
                    </span>
                    <span className="text-[10px] font-mono text-[#8A8882]">Filter Kernel</span>
                  </div>

                  {/* DT System Dropdown */}
                  <div>
                    <label className="block text-xs font-medium text-[#1A1917] mb-1">Filter Kernel</label>
                    <select
                      value={dtSystemType}
                      onChange={(e) => setDtSystemType(e.target.value)}
                      className="w-full text-xs bg-[#FAF9F6] border border-[#E6E4DD] rounded px-2.5 py-1.5 text-[#1A1917] focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                    >
                      <option value="moving_average_3">3-Point Moving Average</option>
                      <option value="difference">Difference Filter δ[n]-δ[n-1]</option>
                      <option value="rectangle">Rectangle Boxcar</option>
                      <option value="exponential">Exponential Decay</option>
                      <option value="impulse">Unit Impulse δ[n]</option>
                    </select>
                  </div>

                  {/* Amplitude Slider for h[k] */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-[#1A1917]">System Gain (Aₕ)</span>
                      <span className="font-mono text-[#D97706] font-semibold">{dtAmpH.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="2.5"
                      step="0.1"
                      value={dtAmpH}
                      onChange={(e) => setDtAmpH(parseFloat(e.target.value))}
                      className="w-full accent-[#D97706] cursor-pointer"
                    />
                  </div>

                  {/* Separate Width Slider for h[k] in whole samples */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium text-[#1A1917]">System Width (Wₕ)</span>
                      <span className="font-mono text-[#D97706] font-semibold">
                        {dtWidthsInfo.wH} {dtWidthsInfo.wH === 1 ? 'sample' : 'samples'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="4"
                      step="1"
                      value={isDtWidthHLocked ? dtWidthsInfo.wH : dtWidthH}
                      disabled={isDtWidthHLocked}
                      onChange={(e) => setDtWidthH(parseInt(e.target.value, 10))}
                      className={`w-full accent-[#D97706] ${
                        isDtWidthHLocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Presets Row: 3-Point Moving Average & Difference Filter */}
            <div className="pt-2 border-t border-[#E6E4DD]/80 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-mono text-[#75736E] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#C85A32]" />
                <span>Presets:</span>
              </span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => applyPreset('dt_ma3')}
                  className={`text-xs font-mono px-2.5 py-1 rounded border transition cursor-pointer ${
                    domainMode === 'DT' && dtSystemType === 'moving_average_3'
                      ? 'bg-[#C85A32] text-white border-[#C85A32]'
                      : 'bg-white border-[#E6E4DD] hover:bg-[#F3F2EC] text-[#1A1917]'
                  }`}
                >
                  3-Point Moving Average
                </button>
                <button
                  onClick={() => applyPreset('dt_diff')}
                  className={`text-xs font-mono px-2.5 py-1 rounded border transition cursor-pointer ${
                    domainMode === 'DT' && dtSystemType === 'difference'
                      ? 'bg-[#C85A32] text-white border-[#C85A32]'
                      : 'bg-white border-[#E6E4DD] hover:bg-[#F3F2EC] text-[#1A1917]'
                  }`}
                >
                  Difference Filter: δ[n] - δ[n-1]
                </button>
                <button
                  onClick={() => applyPreset('rect_rect')}
                  className={`text-xs font-mono px-2.5 py-1 rounded border transition cursor-pointer ${
                    domainMode === 'CT' && ctInputType === 'rectangle' && ctSystemType === 'rectangle'
                      ? 'bg-[#C85A32] text-white border-[#C85A32]'
                      : 'bg-white border-[#E6E4DD] hover:bg-[#F3F2EC] text-[#1A1917]'
                  }`}
                >
                  CT Rect * Rect
                </button>
                <button
                  onClick={() => applyPreset('step_rc')}
                  className={`text-xs font-mono px-2.5 py-1 rounded border transition cursor-pointer ${
                    domainMode === 'CT' && ctSystemType === 'exponential'
                      ? 'bg-[#C85A32] text-white border-[#C85A32]'
                      : 'bg-white border-[#E6E4DD] hover:bg-[#F3F2EC] text-[#1A1917]'
                  }`}
                >
                  CT Pulse * RC Exponential
                </button>
              </div>
            </div>
          </div>

          {/* ======================================================= */}
          {/* 3. ONE RESULTS PANEL (DIRECTLY BELOW CONTROLS PANEL)    */}
          {/* ======================================================= */}
          <div className="p-4 sm:p-5 rounded-lg bg-[#FAF9F6] border border-[#E6E4DD] space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E6E4DD]">
              <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#75736E] font-semibold">
                <Activity className="w-3.5 h-3.5 text-[#C85A32]" />
                <span>Convolution Results Telemetry</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-[#E6E4DD] text-[#585651] font-bold">
                {domainMode} Domain Active
              </span>
            </div>

            {/* Results Data Grid: t (or n), current y, peak y with its time, and widths of x, h, y */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 font-mono text-xs">
              {/* Box 1: Current Time / Sample index t or n */}
              <div className="p-3 rounded bg-white border border-[#E6E4DD] flex flex-col justify-between">
                <span className="text-[#585651] text-[11px] flex items-center gap-1.5 mb-1">
                  <Clock className="w-3.5 h-3.5 text-[#8A8882]" />
                  {domainMode === 'CT' ? 'Current Time (t)' : 'Current Index (n)'}
                </span>
                <span className="font-bold text-[#1A1917] text-sm">
                  {domainMode === 'CT'
                    ? `${ctTVal >= 0 ? `+${ctTVal.toFixed(2)}` : ctTVal.toFixed(2)} s`
                    : `n = ${dtNVal >= 0 ? `+${dtNVal}` : dtNVal}`}
                </span>
              </div>

              {/* Box 2: Current convolved output y */}
              <div className="p-3 rounded bg-white border border-[#E6E4DD] flex flex-col justify-between">
                <span className="text-[#585651] text-[11px] flex items-center gap-1.5 mb-1">
                  <span className="w-2 h-2 rounded-full bg-[#C85A32]" />
                  {domainMode === 'CT' ? 'Current Output y(t)' : 'Current Output y[n]'}
                </span>
                <span className="font-bold text-[#C85A32] text-sm">
                  {domainMode === 'CT' ? ctCurrentArea.toFixed(4) : dtCurrentY.toFixed(4)}
                </span>
              </div>

              {/* Box 3: Peak output y_peak with its time */}
              <div className="p-3 rounded bg-white border border-[#E6E4DD] flex flex-col justify-between col-span-2 sm:col-span-1">
                <span className="text-[#585651] text-[11px] flex items-center gap-1.5 mb-1">
                  <TrendingUp className="w-3.5 h-3.5 text-[#059669]" />
                  Peak Output (y_peak)
                </span>
                <div>
                  <span className="font-bold text-[#059669] text-sm">
                    {domainMode === 'CT' ? ctPeakInfo.peakVal.toFixed(4) : dtPeakInfo.peakVal.toFixed(4)}
                  </span>
                  <span className="text-[10px] text-[#75736E] ml-1.5">
                    at {domainMode === 'CT' ? `t = ${ctPeakInfo.peakTime.toFixed(2)}s` : `n = ${dtPeakInfo.peakIndex}`}
                  </span>
                </div>
              </div>

              {/* Box 4: Width of x */}
              <div className="p-3 rounded bg-white border border-[#E6E4DD] flex flex-col justify-between">
                <span className="text-[#585651] text-[11px] mb-1">
                  Width of x ({domainMode === 'CT' ? 'Wₓ' : 'Lₓ'})
                </span>
                <span className="font-bold text-[#2563EB] text-sm">
                  {domainMode === 'CT'
                    ? `${ctWidthsInfo.wX.toFixed(2)} s`
                    : `${dtWidthsInfo.wX} ${dtWidthsInfo.wX === 1 ? 'sample' : 'samples'}`}
                </span>
              </div>

              {/* Box 5: Width of h */}
              <div className="p-3 rounded bg-white border border-[#E6E4DD] flex flex-col justify-between">
                <span className="text-[#585651] text-[11px] mb-1">
                  Width of h ({domainMode === 'CT' ? 'Wₕ' : 'Lₕ'})
                </span>
                <span className="font-bold text-[#D97706] text-sm">
                  {domainMode === 'CT'
                    ? ctSystemType === 'impulse'
                      ? '0.00 s (δ)'
                      : ctSystemType === 'exponential'
                      ? `${ctWidthsInfo.wH.toFixed(2)} s (τ)`
                      : `${ctWidthsInfo.wH.toFixed(2)} s`
                    : `${dtWidthsInfo.wH} ${dtWidthsInfo.wH === 1 ? 'sample' : 'samples'}`}
                </span>
              </div>

              {/* Box 6: Width of y */}
              <div className="p-3 rounded bg-white border border-[#E6E4DD] flex flex-col justify-between col-span-2 sm:col-span-1">
                <span className="text-[#585651] text-[11px] mb-1">
                  Width of y ({domainMode === 'CT' ? 'Wᵧ' : 'Lᵧ'})
                </span>
                <span className="font-bold text-[#1A1917] text-sm">
                  {domainMode === 'CT'
                    ? `${ctWidthsInfo.wY.toFixed(2)} s`
                    : `${dtWidthsInfo.wY} ${dtWidthsInfo.wY === 1 ? 'sample' : 'samples'}`}
                </span>
              </div>
            </div>

            {/* Equivalence and verification paragraph */}
            <div className="p-2.5 rounded bg-white border border-[#E6E4DD] text-xs text-[#585651] leading-relaxed">
              {domainMode === 'CT' ? (
                <p>
                  In continuous time, the shaded area under <code className="text-[#C85A32] font-mono">x(τ)·h(t-τ)</code> is{' '}
                  <strong className="text-[#1A1917] font-mono">{ctCurrentArea.toFixed(4)}</strong>, which strictly equals the output{' '}
                  <code className="text-[#C85A32] font-mono">y({ctTVal.toFixed(2)})</code>. The global peak of{' '}
                  <strong className="text-[#059669] font-mono">{ctPeakInfo.peakVal.toFixed(4)}</strong> occurs at{' '}
                  <strong className="text-[#1A1917] font-mono">t = {ctPeakInfo.peakTime.toFixed(2)} s</strong>.
                </p>
              ) : (
                <p>
                  In discrete time, the output is computed via the convolution sum <code className="text-[#C85A32] font-mono">∑ x[k]h[n-k]</code> ={' '}
                  <strong className="text-[#1A1917] font-mono">{dtCurrentY.toFixed(4)}</strong>, matching{' '}
                  <code className="text-[#C85A32] font-mono">y[{dtNVal}]</code>. Output support length is{' '}
                  <strong className="text-[#1A1917] font-mono">{dtWidthsInfo.wX} + {dtWidthsInfo.wH} - 1 = {dtWidthsInfo.wY} samples</strong>.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ======================================================= */}
        {/* RIGHT 4 COLS: FORMULATION & THEORY (MATCHING OTHER MODS)*/}
        {/* ======================================================= */}
        <div className="lg:col-span-4 min-w-0 space-y-5">
          {/* Analytical Formulation Card */}
          <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-5 shadow-xs">
            <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-2 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-[#585651]" />
              <span>Analytical Formulation</span>
            </div>
            <div className="text-xs text-[#585651] mb-2 font-medium">
              {domainMode === 'CT' ? 'Continuous Convolution Integral' : 'Discrete Convolution Sum'}
            </div>
            <div className="p-3 bg-white rounded border border-[#E6E4DD] text-sm font-semibold text-[#1A1917] overflow-x-auto">
              {domainMode === 'CT' ? (
                <MathView
                  math="y(t) = (x * h)(t) = \int_{-\infty}^{\infty} x(\tau) \, h(t - \tau) \, d\tau"
                  displayMode={true}
                />
              ) : (
                <MathView
                  math="y[n] = (x * h)[n] = \sum_{k=-\infty}^{\infty} x[k] \, h[n - k]"
                  displayMode={true}
                />
              )}
            </div>

            <div className="text-xs text-[#585651] mt-3 mb-1.5 font-medium">
              Active Filter Characterization
            </div>
            <div className="p-2.5 bg-white rounded border border-[#E6E4DD] text-xs font-mono text-[#1A1917] overflow-x-auto">
              {domainMode === 'CT' ? (
                ctSystemType === 'rectangle' ? (
                  <MathView math="h(t) = A_h \, \big(u(t) - u(t - W_h)\big)" displayMode={false} />
                ) : ctSystemType === 'exponential' ? (
                  <MathView math="h(t) = A_h \, e^{-t/\tau} \, u(t)" displayMode={false} />
                ) : (
                  <MathView math="h(t) = A_h \, \delta(t) \implies y(t) = A_h x(t)" displayMode={false} />
                )
              ) : dtSystemType === 'moving_average_3' ? (
                <MathView math="h[n] = \frac{1}{3}\Big(\delta[n] + \delta[n-1] + \delta[n-2]\Big)" displayMode={false} />
              ) : dtSystemType === 'difference' ? (
                <MathView math="h[n] = \delta[n] - \delta[n-1] \implies y[n] = x[n] - x[n-1]" displayMode={false} />
              ) : dtSystemType === 'rectangle' ? (
                <MathView math={`h[n] = A_h \\big(u[n] - u[n - ${dtWidthsInfo.wH}]\\big)`} displayMode={false} />
              ) : dtSystemType === 'exponential' ? (
                <MathView math={`h[n] = A_h (0.65)^n \\big(u[n] - u[n - ${dtWidthsInfo.wH}]\\big)`} displayMode={false} />
              ) : (
                <MathView math="h[n] = A_h \, \delta[n]" displayMode={false} />
              )}
            </div>
          </div>

          {/* Graphical Convolution Curricular Topics */}
          <div className="bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-5 shadow-xs">
            <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-3 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#585651]" />
              <span>Graphical Convolution Steps</span>
            </div>
            <ul className="space-y-2.5">
              {[
                'Time-Reversal: Flip the impulse response h(-τ) or h[-k] across the origin',
                'Time-Shift: Shift the kernel right by continuous parameter t or discrete integer n',
                'Multiplication: Compute instantaneous product x(τ)·h(t-τ) or x[k]·h[n-k]',
                'Integration/Sum: Area under product or sum of stems equals output y(t) or y[n]'
              ].map((topic, idx) => (
                <li key={idx} className="flex items-start gap-2 text-xs sm:text-sm text-[#484642] leading-snug">
                  <span className="font-mono text-[#C85A32] font-semibold text-xs mt-0.5">0{idx + 1}</span>
                  <span>{topic}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Module Slot Metadata Box */}
          <div className="rounded-lg border-2 border-dashed border-[#C85A32]/30 bg-[#FBF4F0]/50 p-4">
            <div className="flex items-center gap-2 text-xs font-mono font-semibold text-[#C85A32] mb-1">
              <Code2 className="w-4 h-4" />
              <span>Slot: Module1_Convolution.jsx</span>
            </div>
            <p className="text-xs text-[#65635E] leading-relaxed">
              Convolution module active. Layout, theme tokens, and typography fully harmonize with the rest of the laboratory.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
