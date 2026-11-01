/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Continuous-Time & Discrete-Time Convolution Laboratory
 * Features:
 * - CT / DT Mode Toggle
 * - In CT: 4 continuous stacked plots (x(τ), h(t-τ), x(τ)·h(t-τ) with shaded area, y(t) progressive)
 * - In DT: 4 stem (lollipop) stacked plots (x[k], h[n-k], x[k]·h[n-k], y[n] = sum x[k]h[n-k] progressive)
 * - DT Presets: 3-point moving average and difference filter h[n] = δ[n] - δ[n-1]
 * - Small Results Box showing current t (or n), current y, and peak y with the time it occurs
 * - KaTeX analytical formulas for both domains
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  StepForward,
  StepBack,
  Sparkles,
  Activity,
  Layers,
  TrendingUp,
  Clock,
  Award
} from 'lucide-react';
import { MathView } from '../components/MathView';

export default function ContinuousConvolution({
  onNavigateHome,
  onNavigateModule,
}) {
  // Domain mode toggle: 'CT' (Continuous-Time) vs 'DT' (Discrete-Time)
  const [domainMode, setDomainMode] = useState('CT'); // 'CT' | 'DT'

  // ==========================================
  // CONTINUOUS-TIME (CT) STATE & PARAMETERS
  // ==========================================
  const [ctInputType, setCtInputType] = useState('rectangle'); // 'rectangle' | 'triangle' | 'gaussian'
  const [ctSystemType, setCtSystemType] = useState('rectangle'); // 'rectangle' | 'exponential' | 'impulse'

  const [ctAmpX, setCtAmpX] = useState(1.0);
  const [ctWidthX, setCtWidthX] = useState(2.0);

  const [ctAmpH, setCtAmpH] = useState(1.0);
  const [ctWidthH, setCtWidthH] = useState(1.5);

  const ctTMin = -5.0;
  const ctTMax = 5.0;
  const [ctTVal, setCtTVal] = useState(-3.0);

  // ==========================================
  // DISCRETE-TIME (DT) STATE & PARAMETERS
  // ==========================================
  const [dtInputType, setDtInputType] = useState('rectangle'); // 'rectangle' | 'triangle' | 'step' | 'impulse'
  const [dtSystemType, setDtSystemType] = useState('moving_average_3'); // 'moving_average_3' | 'difference' | 'rectangle' | 'exponential' | 'impulse'

  const [dtAmpX, setDtAmpX] = useState(1.0);
  const [dtLenX, setDtLenX] = useState(2); // half-width or length parameter

  const [dtAmpH, setDtAmpH] = useState(1.0);
  const [dtLenH, setDtLenH] = useState(2);

  const dtNMin = -6;
  const dtNMax = 6;
  const [dtNVal, setDtNVal] = useState(-3);

  // Common playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1.0); // 0.5x, 1.0x, 2.0x

  const animFrameRef = useRef(null);
  const lastTimeRef = useRef(null);

  // ==========================================
  // CT MATHEMATICAL ENGINE
  // ==========================================
  const tauMin = -6.5;
  const tauMax = 6.5;
  const tauSteps = 650;
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
      if (ctInputType === 'rectangle') {
        const half = ctWidthX / 2;
        return Math.abs(tau) <= half ? ctAmpX : 0;
      } else if (ctInputType === 'triangle') {
        const half = ctWidthX / 2;
        if (Math.abs(tau) <= half) {
          return ctAmpX * (1 - Math.abs(tau) / half);
        }
        return 0;
      } else if (ctInputType === 'gaussian') {
        const sigma = ctWidthX / 3.2;
        return ctAmpX * Math.exp(-(tau * tau) / (2 * sigma * sigma));
      }
      return 0;
    },
    [ctInputType, ctAmpX, ctWidthX]
  );

  const evalCtH = useCallback(
    (tau) => {
      if (ctSystemType === 'rectangle') {
        return tau >= 0 && tau <= ctWidthH ? ctAmpH : 0;
      } else if (ctSystemType === 'exponential') {
        if (tau >= 0) {
          return ctAmpH * Math.exp(-tau / ctWidthH);
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
    (t, tau) => {
      return evalCtH(t - tau);
    },
    [evalCtH]
  );

  const evalCtProduct = useCallback(
    (t, tau) => {
      return evalCtX(tau) * evalCtHShifted(t, tau);
    },
    [evalCtX, evalCtHShifted]
  );

  const computeCtIntegralAtT = useCallback(
    (t) => {
      let sum = 0;
      const n = tauPoints.length;
      let prevVal = evalCtProduct(t, tauPoints[0]);
      for (let i = 1; i < n; i++) {
        const currVal = evalCtProduct(t, tauPoints[i]);
        sum += (prevVal + currVal) * 0.5 * dTau;
        prevVal = currVal;
      }
      return sum;
    },
    [tauPoints, dTau, evalCtProduct]
  );

  const ctSteps = 240;
  const dtGrid = (ctTMax - ctTMin) / ctSteps;

  const ctYCurveData = useMemo(() => {
    const tValues = new Float64Array(ctSteps + 1);
    const yValues = new Float64Array(ctSteps + 1);
    let maxY = 0.001;

    for (let i = 0; i <= ctSteps; i++) {
      const t = ctTMin + i * dtGrid;
      tValues[i] = t;
      const y = computeCtIntegralAtT(t);
      yValues[i] = y;
      if (Math.abs(y) > maxY) {
        maxY = Math.abs(y);
      }
    }

    return { tValues, yValues, maxY };
  }, [ctTMin, ctTMax, ctSteps, dtGrid, computeCtIntegralAtT]);

  const ctCurrentArea = useMemo(() => {
    return computeCtIntegralAtT(ctTVal);
  }, [ctTVal, computeCtIntegralAtT]);

  // Peak output for CT
  const ctPeakInfo = useMemo(() => {
    let maxVal = -Infinity;
    let peakT = 0;
    for (let i = 0; i <= ctSteps; i++) {
      const val = ctYCurveData.yValues[i];
      if (val > maxVal) {
        maxVal = val;
        peakT = ctYCurveData.tValues[i];
      }
    }
    return {
      peakVal: maxVal === -Infinity ? 0 : maxVal,
      peakTime: peakT,
    };
  }, [ctYCurveData, ctSteps]);

  // ==========================================
  // DT MATHEMATICAL ENGINE
  // ==========================================
  // Sample indices k: -7 to +7
  const dtKMin = -7;
  const dtKMax = 7;
  const dtKIndices = useMemo(() => {
    const arr = [];
    for (let k = dtKMin; k <= dtKMax; k++) {
      arr.push(k);
    }
    return arr;
  }, [dtKMin, dtKMax]);

  // Discrete input signal x[k]
  const evalDtX = useCallback(
    (k) => {
      if (dtInputType === 'rectangle') {
        // Centered pulse of half-width dtLenX
        return Math.abs(k) <= dtLenX ? dtAmpX : 0;
      } else if (dtInputType === 'triangle') {
        if (Math.abs(k) <= dtLenX) {
          return dtAmpX * (1 - Math.abs(k) / (dtLenX + 1));
        }
        return 0;
      } else if (dtInputType === 'step') {
        // Causal step pulse: 0 to dtLenX
        return k >= 0 && k <= dtLenX ? dtAmpX : 0;
      } else if (dtInputType === 'impulse') {
        return k === 0 ? dtAmpX : 0;
      }
      return 0;
    },
    [dtInputType, dtAmpX, dtLenX]
  );

  // Discrete impulse response h[k]
  const evalDtH = useCallback(
    (k) => {
      if (dtSystemType === 'moving_average_3') {
        // 3-point moving average filter: h[0]=1/3, h[1]=1/3, h[2]=1/3
        return k >= 0 && k <= 2 ? +(dtAmpH / 3).toFixed(4) : 0;
      } else if (dtSystemType === 'difference') {
        // Difference filter: h[n] = δ[n] - δ[n-1]
        if (k === 0) return dtAmpH * 1.0;
        if (k === 1) return -dtAmpH * 1.0;
        return 0;
      } else if (dtSystemType === 'rectangle') {
        // Causal rectangular pulse: 0 to dtLenH
        return k >= 0 && k <= dtLenH ? dtAmpH : 0;
      } else if (dtSystemType === 'exponential') {
        // IIR decay: a^k u[k] with a = 0.65
        if (k >= 0 && k <= 6) {
          return dtAmpH * Math.pow(0.65, k);
        }
        return 0;
      } else if (dtSystemType === 'impulse') {
        return k === 0 ? dtAmpH : 0;
      }
      return 0;
    },
    [dtSystemType, dtAmpH, dtLenH]
  );

  // Flipped and shifted impulse response: h[n - k]
  const evalDtHShifted = useCallback(
    (n, k) => {
      return evalDtH(n - k);
    },
    [evalDtH]
  );

  // Product x[k] * h[n - k]
  const evalDtProduct = useCallback(
    (n, k) => {
      return evalDtX(k) * evalDtHShifted(n, k);
    },
    [evalDtX, evalDtHShifted]
  );

  // Discrete convolution sum: y[n] = sum_k x[k] h[n - k]
  const computeDtConvolutionAtN = useCallback(
    (n) => {
      let sum = 0;
      for (let k = dtKMin; k <= dtKMax; k++) {
        sum += evalDtProduct(n, k);
      }
      return +sum.toFixed(4);
    },
    [dtKMin, dtKMax, evalDtProduct]
  );

  // Precomputed discrete output array for all n in [dtNMin, dtNMax]
  const dtYArray = useMemo(() => {
    const arr = [];
    let maxY = 0.001;
    let minY = 0;

    for (let n = dtNMin; n <= dtNMax; n++) {
      const y = computeDtConvolutionAtN(n);
      arr.push({ n, y });
      if (y > maxY) maxY = y;
      if (y < minY) minY = y;
    }
    return { arr, maxY, minY };
  }, [dtNMin, dtNMax, computeDtConvolutionAtN]);

  // Current DT convolved output
  const dtCurrentY = useMemo(() => {
    return computeDtConvolutionAtN(dtNVal);
  }, [dtNVal, computeDtConvolutionAtN]);

  // Peak output for DT
  const dtPeakInfo = useMemo(() => {
    let maxVal = -Infinity;
    let peakN = 0;
    for (const item of dtYArray.arr) {
      if (item.y > maxVal) {
        maxVal = item.y;
        peakN = item.n;
      }
    }
    return {
      peakVal: maxVal === -Infinity ? 0 : maxVal,
      peakIndex: peakN,
    };
  }, [dtYArray]);

  // ==========================================
  // UNIFIED ANIMATION & PLAYBACK CONTROLLER
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
        if (lastTimeRef.current == null) {
          lastTimeRef.current = timestamp;
        }
        const deltaSec = (timestamp - lastTimeRef.current) / 1000;
        lastTimeRef.current = timestamp;

        const increment = deltaSec * 0.9 * playSpeed;
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
      // In DT mode, advance integer steps with interval pacing
      let accumulatedTime = 0;
      const stepDuration = 0.65 / playSpeed; // seconds per discrete step

      const animateDT = (timestamp) => {
        if (lastTimeRef.current == null) {
          lastTimeRef.current = timestamp;
        }
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
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, domainMode, playSpeed, ctTMax, dtNMax]);

  // Playback handlers
  const handleStart = () => {
    if (domainMode === 'CT') {
      if (ctTVal >= ctTMax - 0.05) setCtTVal(ctTMin);
    } else {
      if (dtNVal >= dtNMax) setDtNVal(dtNMin);
    }
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleReset = () => {
    setIsPlaying(false);
    if (domainMode === 'CT') {
      setCtTVal(ctTMin);
    } else {
      setDtNVal(dtNMin);
    }
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

  // Preset handlers
  const applyPreset = (presetKey) => {
    setIsPlaying(false);

    if (presetKey === 'dt_ma3') {
      setDomainMode('DT');
      setDtInputType('step');
      setDtSystemType('moving_average_3');
      setDtAmpX(1.0);
      setDtLenX(3);
      setDtAmpH(1.0);
      setDtNVal(-2);
    } else if (presetKey === 'dt_diff') {
      setDomainMode('DT');
      setDtInputType('step');
      setDtSystemType('difference');
      setDtAmpX(1.0);
      setDtLenX(3);
      setDtAmpH(1.0);
      setDtNVal(-2);
    } else if (presetKey === 'rect_rect') {
      setDomainMode('CT');
      setCtInputType('rectangle');
      setCtSystemType('rectangle');
      setCtAmpX(1.0);
      setCtWidthX(2.0);
      setCtAmpH(1.0);
      setCtWidthH(2.0);
      setCtTVal(-3.5);
    } else if (presetKey === 'step_rc') {
      setDomainMode('CT');
      setCtInputType('rectangle');
      setCtSystemType('exponential');
      setCtAmpX(1.0);
      setCtWidthX(3.0);
      setCtAmpH(1.0);
      setCtWidthH(1.2);
      setCtTVal(-3.5);
    }
  };

  // ==========================================
  // SVG DIMENSIONS & COORDINATE MAPPERS
  // ==========================================
  const svgWidth = 860;
  const svgHeight = 135;
  const margin = { left: 75, right: 35, top: 22, bottom: 25 };
  const plotWidth = svgWidth - margin.left - margin.right;
  const plotHeight = svgHeight - margin.top - margin.bottom;

  // Time ticks
  const ctTimeTicks = [-6, -4, -2, 0, 2, 4, 6];
  const dtTimeTicks = [-6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6];

  // Mapping functions
  const tauToX = (tau) => {
    return margin.left + ((tau - tauMin) / (tauMax - tauMin)) * plotWidth;
  };

  const kToX = (k) => {
    return margin.left + ((k - dtKMin) / (dtKMax - dtKMin)) * plotWidth;
  };

  const yToCoord = (val, minY, maxY) => {
    const range = maxY - minY || 1;
    const clamped = Math.max(minY, Math.min(maxY, val));
    return margin.top + (1 - (clamped - minY) / range) * plotHeight;
  };

  // CT Vertical Scales
  const ctScaleX = useMemo(() => {
    const maxVal = Math.max(1.2, ctAmpX * 1.25);
    return { minY: -0.2, maxY: maxVal };
  }, [ctAmpX]);

  const ctScaleH = useMemo(() => {
    const maxVal = ctSystemType === 'impulse' ? 3.6 : Math.max(1.2, ctAmpH * 1.25);
    return { minY: -0.2, maxY: maxVal };
  }, [ctAmpH, ctSystemType]);

  const ctScaleProduct = useMemo(() => {
    const maxVal = ctSystemType === 'impulse' ? 3.6 : Math.max(1.2, ctAmpX * ctAmpH * 1.25);
    return { minY: -0.2, maxY: maxVal };
  }, [ctAmpX, ctAmpH, ctSystemType]);

  const ctScaleY = useMemo(() => {
    const theoreticalMax = Math.max(1.2, ctYCurveData.maxY * 1.2);
    return { minY: -0.2, maxY: theoreticalMax };
  }, [ctYCurveData.maxY]);

  // DT Vertical Scales
  const dtScaleX = useMemo(() => {
    const maxVal = Math.max(1.2, dtAmpX * 1.25);
    return { minY: -0.2, maxY: maxVal };
  }, [dtAmpX]);

  const dtScaleH = useMemo(() => {
    const minVal = dtSystemType === 'difference' ? -1.25 * dtAmpH : -0.2;
    const maxVal = Math.max(1.2, dtAmpH * 1.25);
    return { minY: minVal, maxY: maxVal };
  }, [dtAmpH, dtSystemType]);

  const dtScaleProduct = useMemo(() => {
    const minVal = dtSystemType === 'difference' ? -1.25 * dtAmpX * dtAmpH : -0.2;
    const maxVal = Math.max(1.2, dtAmpX * dtAmpH * 1.25);
    return { minY: minVal, maxY: maxVal };
  }, [dtAmpX, dtAmpH, dtSystemType]);

  const dtScaleY = useMemo(() => {
    const minVal = Math.min(-0.2, dtYArray.minY * 1.2);
    const maxVal = Math.max(1.2, dtYArray.maxY * 1.25);
    return { minY: minVal, maxY: maxVal };
  }, [dtYArray.minY, dtYArray.maxY]);

  // CT Path generators
  const ctPathX = useMemo(() => {
    let d = '';
    for (let i = 0; i <= tauSteps; i++) {
      const tau = tauPoints[i];
      const val = evalCtX(tau);
      const px = tauToX(tau);
      const py = yToCoord(val, ctScaleX.minY, ctScaleX.maxY);
      d += i === 0 ? `M ${px.toFixed(1)} ${py.toFixed(1)}` : ` L ${px.toFixed(1)} ${py.toFixed(1)}`;
    }
    return d;
  }, [tauPoints, tauSteps, evalCtX, ctScaleX]);

  const ctPathH = useMemo(() => {
    let d = '';
    for (let i = 0; i <= tauSteps; i++) {
      const tau = tauPoints[i];
      const val = evalCtHShifted(ctTVal, tau);
      const px = tauToX(tau);
      const py = yToCoord(val, ctScaleH.minY, ctScaleH.maxY);
      d += i === 0 ? `M ${px.toFixed(1)} ${py.toFixed(1)}` : ` L ${px.toFixed(1)} ${py.toFixed(1)}`;
    }
    return d;
  }, [tauPoints, tauSteps, ctTVal, evalCtHShifted, ctScaleH]);

  const { ctPathProduct, ctAreaPathProduct } = useMemo(() => {
    let lineD = '';
    let areaD = '';
    const zeroY = yToCoord(0, ctScaleProduct.minY, ctScaleProduct.maxY);

    const firstX = tauToX(tauPoints[0]);
    areaD = `M ${firstX.toFixed(1)} ${zeroY.toFixed(1)}`;

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
    let curPoint = { x: tauToX(ctTVal), y: yToCoord(ctCurrentArea, ctScaleY.minY, ctScaleY.maxY) };

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

    if (progD !== '') {
      progD += ` L ${curPoint.x.toFixed(1)} ${curPoint.y.toFixed(1)}`;
    } else {
      progD = `M ${curPoint.x.toFixed(1)} ${curPoint.y.toFixed(1)}`;
    }

    return {
      ctPathYProgressive: progD,
      ctPathYFull: fullD,
      ctCurrentYPoint: curPoint,
    };
  }, [ctYCurveData, ctSteps, ctTVal, ctCurrentArea, ctScaleY]);

  // Common background grid renderer for both CT and DT
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

        {/* Time Grid Lines */}
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
                y={margin.top + plotHeight + 14}
                textAnchor="middle"
                className={`text-[10px] font-mono select-none ${
                  isZero ? 'fill-[#1A1917] font-bold' : 'fill-[#8A8882]'
                }`}
              >
                {tick}
              </text>
            </g>
          );
        })}

        {/* Horizontal Zero Amplitude Axis */}
        <line
          x1={margin.left}
          y1={zeroY}
          x2={margin.left + plotWidth}
          y2={zeroY}
          stroke="#C4C2B8"
          strokeWidth="1.25"
        />

        {/* Synchronized Vertical Time Cursor (t or n) */}
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

        {/* Plot Title */}
        <text
          x={margin.left + 8}
          y={margin.top - 6}
          className="text-[11px] font-mono font-bold fill-[#1A1917] tracking-tight"
        >
          {title}
        </text>

        {/* Value Badge at Top Right */}
        <text
          x={margin.left + plotWidth - 6}
          y={margin.top - 6}
          textAnchor="end"
          className={`text-[11px] font-mono font-semibold ${badgeColor}`}
        >
          {badgeText}
        </text>

        {/* Bottom Time Axis Label */}
        {isBottomPlot && (
          <text
            x={margin.left + plotWidth / 2}
            y={svgHeight - 1}
            textAnchor="middle"
            className="text-[11px] font-mono font-semibold fill-[#75736E]"
          >
            {domainMode === 'CT'
              ? 'Time axis: continuous parameter τ (or t) [seconds]'
              : 'Discrete sample index: integer variable k (or n)'}
          </text>
        )}
      </>
    );
  };

  // Helper to draw discrete stems (lollipop plot)
  const renderStems = (
    dataGetter,
    color,
    minY,
    maxY,
    circleRadius = 3.5,
    isPulsed = false
  ) => {
    const zeroY = yToCoord(0, minY, maxY);

    return dtKIndices.map((k) => {
      const val = dataGetter(k);
      const x = kToX(k);
      const y = yToCoord(val, minY, maxY);
      const isZero = Math.abs(val) < 0.0001;

      return (
        <g key={`stem-${k}`}>
          {/* Vertical stem line */}
          <line
            x1={x}
            y1={zeroY}
            x2={x}
            y2={y}
            stroke={color}
            strokeWidth={isZero ? '1' : '2'}
            opacity={isZero ? '0.4' : '1'}
          />
          {/* Stem head dot */}
          <circle
            cx={x}
            cy={y}
            r={isZero ? 2 : circleRadius}
            fill={isZero ? '#D1CFCE' : color}
            stroke="#FFFFFF"
            strokeWidth="1.2"
          />
          {/* Optional value annotation for prominent non-zero samples */}
          {!isZero && Math.abs(val) >= 0.1 && (
            <text
              x={x}
              y={val >= 0 ? y - 6 : y + 12}
              textAnchor="middle"
              className="text-[9px] font-mono font-bold fill-[#585651] select-none"
            >
              {val > 0 && Math.abs(val - 1) < 0.01 ? '1' : val.toFixed(1)}
            </text>
          )}
        </g>
      );
    });
  };

  return (
    <div className="w-full space-y-6">
      {/* Module Title Banner & Domain Toggle */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-5 border-b border-[#E6E4DD]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono font-bold tracking-wider text-[#C85A32] bg-[#FBF4F0] px-2.5 py-0.5 rounded border border-[#C85A32]/20">
              MODULE 04
            </span>
            <span className="text-xs text-[#75736E] font-medium">LTI Systems & Convolution</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1917]">
            Convolution & System Response Laboratory
          </h1>
          <p className="mt-1.5 text-sm sm:text-base text-[#585651] max-w-3xl leading-relaxed">
            Investigate graphical convolution in both Continuous-Time (CT) and Discrete-Time (DT): observe flipped and shifted kernels, point-wise overlap products, and progressively synthesized outputs.
          </p>
        </div>

        {/* CT / DT Mode Toggle Switch */}
        <div className="flex flex-col items-start md:items-end gap-1.5 shrink-0">
          <span className="text-[11px] font-mono uppercase text-[#75736E] font-medium">
            System Domain
          </span>
          <div className="flex items-center bg-[#F3F2EC] p-1 rounded-lg border border-[#E6E4DD] shadow-xs">
            <button
              onClick={() => {
                setDomainMode('CT');
                setIsPlaying(false);
              }}
              className={`px-3.5 py-1.5 rounded-md text-xs font-mono font-bold transition flex items-center gap-1.5 ${
                domainMode === 'CT'
                  ? 'bg-white text-[#C85A32] shadow-xs border border-[#E6E4DD]'
                  : 'text-[#75736E] hover:text-[#1A1917]'
              }`}
            >
              <span>CT (Continuous)</span>
              <span className="text-[10px] opacity-75 font-normal">x(t)</span>
            </button>
            <button
              onClick={() => {
                setDomainMode('DT');
                setIsPlaying(false);
              }}
              className={`px-3.5 py-1.5 rounded-md text-xs font-mono font-bold transition flex items-center gap-1.5 ${
                domainMode === 'DT'
                  ? 'bg-white text-[#C85A32] shadow-xs border border-[#E6E4DD]'
                  : 'text-[#75736E] hover:text-[#1A1917]'
              }`}
            >
              <span>DT (Discrete)</span>
              <span className="text-[10px] opacity-75 font-normal">x[n]</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Simulation Viewport */}
      <div className="bg-white rounded-xl border border-[#E6E4DD] p-5 sm:p-6 shadow-xs flex flex-col gap-6">
        {/* Top Control Bar: Time Slider & Playback Buttons */}
        <div className="bg-[#FAF9F6] border border-[#E6E4DD] rounded-lg p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Playback Buttons: Start, Pause, Step, Reset */}
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            {!isPlaying ? (
              <button
                onClick={handleStart}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#C85A32] text-white hover:bg-[#B54E28] transition font-mono text-xs font-semibold shadow-xs"
                title={domainMode === 'CT' ? 'Start continuous sweep' : 'Start discrete sequence stepping'}
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Start</span>
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#1A1917] text-white hover:bg-[#33322E] transition font-mono text-xs font-semibold shadow-xs"
                title="Pause animation"
              >
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </button>
            )}

            <button
              onClick={handleStepBack}
              className="flex items-center gap-1 px-2.5 py-2 rounded-md bg-white border border-[#E6E4DD] text-[#1A1917] hover:bg-[#F3F2EC] transition font-mono text-xs font-medium"
              title={domainMode === 'CT' ? 'Step backward (Δt = -0.15s)' : 'Step backward (Δn = -1)'}
            >
              <StepBack className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">-Step</span>
            </button>

            <button
              onClick={handleStepForward}
              className="flex items-center gap-1 px-2.5 py-2 rounded-md bg-white border border-[#E6E4DD] text-[#1A1917] hover:bg-[#F3F2EC] transition font-mono text-xs font-medium"
              title={domainMode === 'CT' ? 'Step forward (Δt = +0.15s)' : 'Step forward (Δn = +1)'}
            >
              <StepForward className="w-3.5 h-3.5" />
              <span>Step</span>
            </button>

            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-2.5 py-2 rounded-md bg-white border border-[#E6E4DD] text-[#585651] hover:text-[#1A1917] hover:bg-[#F3F2EC] transition font-mono text-xs font-medium"
              title="Reset slider position"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>

            {/* Speed Selector */}
            <div className="flex items-center ml-2 border-l border-[#E6E4DD] pl-3 gap-1">
              <span className="text-[11px] font-mono text-[#75736E] mr-1 hidden sm:inline">Speed:</span>
              {[0.5, 1.0, 2.0].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaySpeed(spd)}
                  className={`px-2 py-1 text-[11px] font-mono rounded ${
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

          {/* Time Slider Control (t for CT, n for DT) */}
          <div className="flex-1 flex items-center gap-3 min-w-[200px]">
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
                  className="w-full h-2 bg-[#E6E4DD] rounded-lg appearance-none cursor-pointer accent-[#C85A32]"
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
                  className="w-full h-2 bg-[#E6E4DD] rounded-lg appearance-none cursor-pointer accent-[#C85A32]"
                />
              )}
            </div>
            <span className="font-mono text-xs font-bold text-[#C85A32] bg-white border border-[#E6E4DD] px-2.5 py-1 rounded min-w-[62px] text-center shadow-2xs">
              {domainMode === 'CT'
                ? `${ctTVal >= 0 ? `+${ctTVal.toFixed(2)}` : ctTVal.toFixed(2)} s`
                : `n = ${dtNVal >= 0 ? `+${dtNVal}` : dtNVal}`}
            </span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* FOUR SYNCHRONIZED STACKED PLOTS ON THE SAME TIME AXIS     */}
        {/* ========================================================= */}
        <div className="space-y-4">
          {domainMode === 'CT' ? (
            /* ==========================================
               CONTINUOUS-TIME (CT) PLOTS
               ========================================== */
            <>
              {/* PLOT 1: Input signal x(τ) */}
              <div className="w-full overflow-x-auto">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full min-w-[650px] select-none block"
                >
                  {renderBackgroundGrid(
                    `1. Input Signal x(τ) [${ctInputType.toUpperCase()}]`,
                    `A = ${ctAmpX.toFixed(1)}, W = ${ctWidthX.toFixed(1)}s`,
                    'fill-[#2563EB]',
                    ctScaleX.minY,
                    ctScaleX.maxY
                  )}
                  <path
                    d={ctPathX}
                    fill="none"
                    stroke="#2563EB"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <text
                    x={margin.left - 12}
                    y={margin.top + 12}
                    textAnchor="end"
                    className="text-[11px] font-mono font-bold fill-[#2563EB]"
                  >
                    x(τ)
                  </text>
                </svg>
              </div>

              {/* PLOT 2: Flipped & shifted impulse response h(t - τ) */}
              <div className="w-full overflow-x-auto">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full min-w-[650px] select-none block"
                >
                  {renderBackgroundGrid(
                    `2. Flipped & Shifted Impulse Response h(t - τ) [${ctSystemType.toUpperCase()}]`,
                    `h(t - τ) at t = ${ctTVal.toFixed(2)}s`,
                    'fill-[#D97706]',
                    ctScaleH.minY,
                    ctScaleH.maxY
                  )}
                  <path
                    d={ctPathH}
                    fill="none"
                    stroke="#D97706"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx={tauToX(ctTVal)}
                    cy={yToCoord(evalCtHShifted(ctTVal, ctTVal), ctScaleH.minY, ctScaleH.maxY)}
                    r="4.5"
                    fill="#D97706"
                    stroke="#FFFFFF"
                    strokeWidth="1.5"
                  />
                  <text
                    x={margin.left - 12}
                    y={margin.top + 12}
                    textAnchor="end"
                    className="text-[11px] font-mono font-bold fill-[#D97706]"
                  >
                    h(t-τ)
                  </text>
                </svg>
              </div>

              {/* PLOT 3: Product x(τ)·h(t-τ) with SHADED AREA */}
              <div className="w-full overflow-x-auto">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full min-w-[650px] select-none block"
                >
                  <defs>
                    <linearGradient id="ctShadedProductGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#C85A32" stopOpacity="0.45" />
                      <stop offset="100%" stopColor="#C85A32" stopOpacity="0.10" />
                    </linearGradient>
                    <pattern id="ctShadedHatchPattern" width="8" height="8" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                      <line x1="0" y1="0" x2="0" y2="8" stroke="#C85A32" strokeWidth="1.2" opacity="0.3" />
                    </pattern>
                  </defs>
                  {renderBackgroundGrid(
                    '3. Overlap Product x(τ) · h(t - τ) [Area Shaded]',
                    `Shaded Area = ∫ = ${ctCurrentArea.toFixed(4)}`,
                    'fill-[#C85A32]',
                    ctScaleProduct.minY,
                    ctScaleProduct.maxY
                  )}
                  <path d={ctAreaPathProduct} fill="url(#ctShadedProductGrad)" />
                  <path d={ctAreaPathProduct} fill="url(#ctShadedHatchPattern)" />
                  <path
                    d={ctPathProduct}
                    fill="none"
                    stroke="#C85A32"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <text
                    x={margin.left - 12}
                    y={margin.top + 12}
                    textAnchor="end"
                    className="text-[11px] font-mono font-bold fill-[#C85A32]"
                  >
                    x·h
                  </text>
                </svg>
              </div>

              {/* PLOT 4: Output y(t) drawn progressively */}
              <div className="w-full overflow-x-auto">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full min-w-[650px] select-none block"
                >
                  {renderBackgroundGrid(
                    '4. Output Signal y(t) = (x * h)(t) [Drawn Progressively]',
                    `y(${ctTVal >= 0 ? `+${ctTVal.toFixed(2)}` : ctTVal.toFixed(2)}) = ${ctCurrentArea.toFixed(4)}`,
                    'fill-[#1A1917]',
                    ctScaleY.minY,
                    ctScaleY.maxY,
                    true
                  )}
                  <path
                    d={ctPathYFull}
                    fill="none"
                    stroke="#D1CFCE"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                  <path
                    d={ctPathYProgressive}
                    fill="none"
                    stroke="#C85A32"
                    strokeWidth="3.0"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx={ctCurrentYPoint.x}
                    cy={ctCurrentYPoint.y}
                    r="6"
                    fill="#C85A32"
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />
                  <circle
                    cx={ctCurrentYPoint.x}
                    cy={ctCurrentYPoint.y}
                    r="10"
                    fill="none"
                    stroke="#C85A32"
                    strokeWidth="1.5"
                    opacity="0.4"
                    className="animate-ping"
                  />
                  <text
                    x={margin.left - 12}
                    y={margin.top + 12}
                    textAnchor="end"
                    className="text-[11px] font-mono font-bold fill-[#C85A32]"
                  >
                    y(t)
                  </text>
                </svg>
              </div>
            </>
          ) : (
            /* ==========================================
               DISCRETE-TIME (DT) PLOTS (STEMS)
               ========================================== */
            <>
              {/* PLOT 1: Discrete Input x[k] */}
              <div className="w-full overflow-x-auto">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full min-w-[650px] select-none block"
                >
                  {renderBackgroundGrid(
                    `1. Discrete Input Signal x[k] [${dtInputType.toUpperCase()}]`,
                    `A = ${dtAmpX.toFixed(1)}, Len = ${dtLenX}`,
                    'fill-[#2563EB]',
                    dtScaleX.minY,
                    dtScaleX.maxY
                  )}
                  {renderStems(evalDtX, '#2563EB', dtScaleX.minY, dtScaleX.maxY, 4)}
                  <text
                    x={margin.left - 12}
                    y={margin.top + 12}
                    textAnchor="end"
                    className="text-[11px] font-mono font-bold fill-[#2563EB]"
                  >
                    x[k]
                  </text>
                </svg>
              </div>

              {/* PLOT 2: Discrete Flipped & Shifted h[n - k] */}
              <div className="w-full overflow-x-auto">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full min-w-[650px] select-none block"
                >
                  {renderBackgroundGrid(
                    `2. Flipped & Shifted Impulse Response h[n - k] [${dtSystemType.toUpperCase()}]`,
                    `h[n - k] at n = ${dtNVal}`,
                    'fill-[#D97706]',
                    dtScaleH.minY,
                    dtScaleH.maxY
                  )}
                  {renderStems(
                    (k) => evalDtHShifted(dtNVal, k),
                    '#D97706',
                    dtScaleH.minY,
                    dtScaleH.maxY,
                    4
                  )}
                  <text
                    x={margin.left - 12}
                    y={margin.top + 12}
                    textAnchor="end"
                    className="text-[11px] font-mono font-bold fill-[#D97706]"
                  >
                    h[n-k]
                  </text>
                </svg>
              </div>

              {/* PLOT 3: Discrete Product x[k] · h[n - k] */}
              <div className="w-full overflow-x-auto">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full min-w-[650px] select-none block"
                >
                  {renderBackgroundGrid(
                    '3. Overlap Product x[k] · h[n - k] [Sum of Stems]',
                    `Sum = ∑ x[k]h[n-k] = ${dtCurrentY.toFixed(4)}`,
                    'fill-[#C85A32]',
                    dtScaleProduct.minY,
                    dtScaleProduct.maxY
                  )}
                  {/* Highlighted shaded pillar bars behind active non-zero stems */}
                  {dtKIndices.map((k) => {
                    const val = evalDtProduct(dtNVal, k);
                    if (Math.abs(val) < 0.001) return null;
                    const x = kToX(k);
                    const zeroY = yToCoord(0, dtScaleProduct.minY, dtScaleProduct.maxY);
                    const y = yToCoord(val, dtScaleProduct.minY, dtScaleProduct.maxY);
                    const topY = Math.min(zeroY, y);
                    const h = Math.abs(zeroY - y);
                    return (
                      <rect
                        key={`bar-${k}`}
                        x={x - 7}
                        y={topY}
                        width={14}
                        height={Math.max(2, h)}
                        fill="#C85A32"
                        opacity="0.25"
                        rx="2"
                      />
                    );
                  })}
                  {renderStems(
                    (k) => evalDtProduct(dtNVal, k),
                    '#C85A32',
                    dtScaleProduct.minY,
                    dtScaleProduct.maxY,
                    4.5
                  )}
                  <text
                    x={margin.left - 12}
                    y={margin.top + 12}
                    textAnchor="end"
                    className="text-[11px] font-mono font-bold fill-[#C85A32]"
                  >
                    x·h
                  </text>
                </svg>
              </div>

              {/* PLOT 4: Discrete Output y[n] drawn progressively */}
              <div className="w-full overflow-x-auto">
                <svg
                  viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                  className="w-full min-w-[650px] select-none block"
                >
                  {renderBackgroundGrid(
                    '4. Output Sequence y[n] = (x * h)[n] [Drawn Progressively]',
                    `y[${dtNVal}] = ${dtCurrentY.toFixed(4)}`,
                    'fill-[#1A1917]',
                    dtScaleY.minY,
                    dtScaleY.maxY,
                    true
                  )}
                  {/* All samples as faint reference ghost stems */}
                  {dtYArray.arr.map((item) => {
                    const x = kToX(item.n);
                    const zeroY = yToCoord(0, dtScaleY.minY, dtScaleY.maxY);
                    const y = yToCoord(item.y, dtScaleY.minY, dtScaleY.maxY);
                    return (
                      <g key={`ghost-${item.n}`}>
                        <line
                          x1={x}
                          y1={zeroY}
                          x2={x}
                          y2={y}
                          stroke="#D1CFCE"
                          strokeWidth="1.5"
                          strokeDasharray="2 2"
                        />
                        <circle cx={x} cy={y} r="3" fill="#FAF9F6" stroke="#C4C2B8" strokeWidth="1" />
                      </g>
                    );
                  })}
                  {/* Progressive active stems for samples <= dtNVal */}
                  {dtYArray.arr
                    .filter((item) => item.n <= dtNVal)
                    .map((item) => {
                      const isCurrent = item.n === dtNVal;
                      const x = kToX(item.n);
                      const zeroY = yToCoord(0, dtScaleY.minY, dtScaleY.maxY);
                      const y = yToCoord(item.y, dtScaleY.minY, dtScaleY.maxY);
                      return (
                        <g key={`prog-${item.n}`}>
                          <line
                            x1={x}
                            y1={zeroY}
                            x2={x}
                            y2={y}
                            stroke="#C85A32"
                            strokeWidth={isCurrent ? '3' : '2'}
                          />
                          <circle
                            cx={x}
                            cy={y}
                            r={isCurrent ? 6 : 4}
                            fill="#C85A32"
                            stroke="#FFFFFF"
                            strokeWidth="1.5"
                          />
                          {isCurrent && (
                            <circle
                              cx={x}
                              cy={y}
                              r="10"
                              fill="none"
                              stroke="#C85A32"
                              strokeWidth="1.5"
                              opacity="0.5"
                              className="animate-ping"
                            />
                          )}
                          <text
                            x={x}
                            y={item.y >= 0 ? y - 7 : y + 14}
                            textAnchor="middle"
                            className="text-[9px] font-mono font-bold fill-[#1A1917]"
                          >
                            {item.y.toFixed(2)}
                          </text>
                        </g>
                      );
                    })}
                  <text
                    x={margin.left - 12}
                    y={margin.top + 12}
                    textAnchor="end"
                    className="text-[11px] font-mono font-bold fill-[#C85A32]"
                  >
                    y[n]
                  </text>
                </svg>
              </div>
            </>
          )}
        </div>

        {/* ========================================================= */}
        {/* PARAMETER CONTROLS & DROPDOWNS                            */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-5 border-t border-[#E6E4DD]">
          {domainMode === 'CT' ? (
            /* CT Signal Controls */
            <>
              {/* Left Column: CT Input x(t) */}
              <div className="p-4 rounded-lg bg-[#FAF9F6] border border-[#E6E4DD] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase font-bold text-[#2563EB] flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                    Input Signal x(τ)
                  </span>
                  <span className="text-[11px] font-mono text-[#75736E]">Continuous Source</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#1A1917] mb-1.5">
                    Waveform Shape:
                  </label>
                  <select
                    value={ctInputType}
                    onChange={(e) => setCtInputType(e.target.value)}
                    className="w-full text-xs font-mono bg-white border border-[#E6E4DD] rounded-md px-3 py-2 text-[#1A1917] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  >
                    <option value="rectangle">Rectangle Pulse — rect(t/W)</option>
                    <option value="triangle">Triangle Pulse — tri(t/W)</option>
                    <option value="gaussian">Gaussian Bell — exp(-t²/2σ²)</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1 font-mono">
                    <span className="text-[#585651]">Amplitude (Aₓ):</span>
                    <span className="font-bold text-[#2563EB]">{ctAmpX.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="2.5"
                    step="0.1"
                    value={ctAmpX}
                    onChange={(e) => setCtAmpX(parseFloat(e.target.value))}
                    className="w-full accent-[#2563EB]"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1 font-mono">
                    <span className="text-[#585651]">Pulse Width (Wₓ):</span>
                    <span className="font-bold text-[#2563EB]">{ctWidthX.toFixed(2)} s</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="4.0"
                    step="0.1"
                    value={ctWidthX}
                    onChange={(e) => setCtWidthX(parseFloat(e.target.value))}
                    className="w-full accent-[#2563EB]"
                  />
                </div>
              </div>

              {/* Right Column: CT System h(t) */}
              <div className="p-4 rounded-lg bg-[#FAF9F6] border border-[#E6E4DD] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase font-bold text-[#D97706] flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
                    LTI Impulse Response h(τ)
                  </span>
                  <span className="text-[11px] font-mono text-[#75736E]">Continuous Kernel</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#1A1917] mb-1.5">
                    System Impulse Response:
                  </label>
                  <select
                    value={ctSystemType}
                    onChange={(e) => setCtSystemType(e.target.value)}
                    className="w-full text-xs font-mono bg-white border border-[#E6E4DD] rounded-md px-3 py-2 text-[#1A1917] focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                  >
                    <option value="rectangle">Rectangle Kernel — rect(t/W) causal</option>
                    <option value="exponential">RC Low-Pass Filter — exp(-t/τ_RC)·u(t)</option>
                    <option value="impulse">Dirac Delta Impulse — δ(t) (Sifting)</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1 font-mono">
                    <span className="text-[#585651]">
                      {ctSystemType === 'impulse' ? 'Impulse Area / Gain (Aₕ):' : 'Kernel Amplitude (Aₕ):'}
                    </span>
                    <span className="font-bold text-[#D97706]">{ctAmpH.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="2.5"
                    step="0.1"
                    value={ctAmpH}
                    onChange={(e) => setCtAmpH(parseFloat(e.target.value))}
                    className="w-full accent-[#D97706]"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1 font-mono">
                    <span className="text-[#585651]">
                      {ctSystemType === 'exponential'
                        ? 'Time Constant (τ_RC):'
                        : 'Duration / Width (Wₕ):'}
                    </span>
                    <span className="font-bold text-[#D97706]">{ctWidthH.toFixed(2)} s</span>
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
                      ctSystemType === 'impulse' ? 'opacity-40 cursor-not-allowed' : ''
                    }`}
                  />
                </div>
              </div>
            </>
          ) : (
            /* DT Signal Controls */
            <>
              {/* Left Column: DT Input x[n] */}
              <div className="p-4 rounded-lg bg-[#FAF9F6] border border-[#E6E4DD] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase font-bold text-[#2563EB] flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#2563EB]" />
                    Discrete Input x[k]
                  </span>
                  <span className="text-[11px] font-mono text-[#75736E]">Sampled Sequence</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#1A1917] mb-1.5">
                    Sequence Pattern:
                  </label>
                  <select
                    value={dtInputType}
                    onChange={(e) => setDtInputType(e.target.value)}
                    className="w-full text-xs font-mono bg-white border border-[#E6E4DD] rounded-md px-3 py-2 text-[#1A1917] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                  >
                    <option value="rectangle">Symmetric Pulse — rect[k/N]</option>
                    <option value="step">Causal Step Pulse — u[k] - u[k-N]</option>
                    <option value="triangle">Triangular Bartlett — tri[k/N]</option>
                    <option value="impulse">Unit Impulse — δ[k]</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1 font-mono">
                    <span className="text-[#585651]">Sequence Amplitude (Aₓ):</span>
                    <span className="font-bold text-[#2563EB]">{dtAmpX.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="2.5"
                    step="0.1"
                    value={dtAmpX}
                    onChange={(e) => setDtAmpX(parseFloat(e.target.value))}
                    className="w-full accent-[#2563EB]"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1 font-mono">
                    <span className="text-[#585651]">Pulse Half-Length (Nₓ):</span>
                    <span className="font-bold text-[#2563EB]">{dtLenX} samples</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="4"
                    step="1"
                    value={dtLenX}
                    disabled={dtInputType === 'impulse'}
                    onChange={(e) => setDtLenX(parseInt(e.target.value, 10))}
                    className={`w-full accent-[#2563EB] ${
                      dtInputType === 'impulse' ? 'opacity-40 cursor-not-allowed' : ''
                    }`}
                  />
                </div>
              </div>

              {/* Right Column: DT System h[n] */}
              <div className="p-4 rounded-lg bg-[#FAF9F6] border border-[#E6E4DD] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono uppercase font-bold text-[#D97706] flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
                    LTI Filter Kernel h[k]
                  </span>
                  <span className="text-[11px] font-mono text-[#75736E]">Filter Sequence</span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#1A1917] mb-1.5">
                    Filter Type / Presets:
                  </label>
                  <select
                    value={dtSystemType}
                    onChange={(e) => setDtSystemType(e.target.value)}
                    className="w-full text-xs font-mono bg-white border border-[#E6E4DD] rounded-md px-3 py-2 text-[#1A1917] focus:outline-none focus:ring-1 focus:ring-[#D97706]"
                  >
                    <option value="moving_average_3">3-Point Moving Average — ⅓(δ[n]+δ[n-1]+δ[n-2])</option>
                    <option value="difference">Difference Filter — δ[n] - δ[n-1]</option>
                    <option value="rectangle">Rectangular Boxcar — 0 to N</option>
                    <option value="exponential">First-Order IIR Decay — (0.65)ⁿ u[n]</option>
                    <option value="impulse">Unit Sample — δ[n]</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1 font-mono">
                    <span className="text-[#585651]">Filter Gain (Aₕ):</span>
                    <span className="font-bold text-[#D97706]">{dtAmpH.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.2"
                    max="2.5"
                    step="0.1"
                    value={dtAmpH}
                    onChange={(e) => setDtAmpH(parseFloat(e.target.value))}
                    className="w-full accent-[#D97706]"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1 font-mono">
                    <span className="text-[#585651]">Filter Length (Nₕ):</span>
                    <span className="font-bold text-[#D97706]">{dtLenH} samples</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="4"
                    step="1"
                    value={dtLenH}
                    disabled={dtSystemType === 'moving_average_3' || dtSystemType === 'difference' || dtSystemType === 'impulse'}
                    onChange={(e) => setDtLenH(parseInt(e.target.value, 10))}
                    className={`w-full accent-[#D97706] ${
                      dtSystemType === 'moving_average_3' || dtSystemType === 'difference' || dtSystemType === 'impulse'
                        ? 'opacity-40 cursor-not-allowed'
                        : ''
                    }`}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* Quick Scenario & Filter Presets Bar */}
        <div className="pt-2 flex items-center justify-between flex-wrap gap-2">
          <div className="text-xs font-mono text-[#75736E] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#C85A32]" />
            <span>Interactive Presets:</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* DT Presets */}
            <button
              onClick={() => applyPreset('dt_ma3')}
              className={`text-xs font-mono px-3 py-1 rounded border transition ${
                domainMode === 'DT' && dtSystemType === 'moving_average_3'
                  ? 'bg-[#C85A32] text-white border-[#C85A32]'
                  : 'bg-[#FAF9F6] border-[#E6E4DD] hover:bg-[#F3F2EC] text-[#1A1917]'
              }`}
            >
              DT 3-Point Moving Average
            </button>
            <button
              onClick={() => applyPreset('dt_diff')}
              className={`text-xs font-mono px-3 py-1 rounded border transition ${
                domainMode === 'DT' && dtSystemType === 'difference'
                  ? 'bg-[#C85A32] text-white border-[#C85A32]'
                  : 'bg-[#FAF9F6] border-[#E6E4DD] hover:bg-[#F3F2EC] text-[#1A1917]'
              }`}
            >
              DT Difference Filter: δ[n] - δ[n-1]
            </button>

            {/* CT Presets */}
            <button
              onClick={() => applyPreset('rect_rect')}
              className={`text-xs font-mono px-3 py-1 rounded border transition ${
                domainMode === 'CT' && ctInputType === 'rectangle' && ctSystemType === 'rectangle'
                  ? 'bg-[#C85A32] text-white border-[#C85A32]'
                  : 'bg-[#FAF9F6] border-[#E6E4DD] hover:bg-[#F3F2EC] text-[#1A1917]'
              }`}
            >
              CT Rect * Rect → Triangle
            </button>
            <button
              onClick={() => applyPreset('step_rc')}
              className={`text-xs font-mono px-3 py-1 rounded border transition ${
                domainMode === 'CT' && ctSystemType === 'exponential'
                  ? 'bg-[#C85A32] text-white border-[#C85A32]'
                  : 'bg-[#FAF9F6] border-[#E6E4DD] hover:bg-[#F3F2EC] text-[#1A1917]'
              }`}
            >
              CT Pulse * RC Exponential
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* SMALL RESULTS BOX & ANALYTICAL FORMULATION SECTION        */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 5 Cols: Small Results Box */}
        <div className="lg:col-span-5 bg-[#FAF9F6] rounded-xl border border-[#E6E4DD] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-[#75736E] font-bold flex items-center gap-1.5">
              <Award className="w-4 h-4 text-[#C85A32]" />
              <span>Simulation Results</span>
            </span>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white border border-[#E6E4DD] text-[#585651]">
              Domain: <strong className="text-[#C85A32]">{domainMode}</strong>
            </span>
          </div>

          {/* Results Grid Box */}
          <div className="bg-white rounded-lg border border-[#E6E4DD] p-4 divide-y divide-[#F3F2EC] font-mono text-xs">
            {/* 1. Current Time / Index */}
            <div className="py-2.5 flex items-center justify-between first:pt-0">
              <span className="text-[#585651] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#75736E]" />
                {domainMode === 'CT' ? 'Current Time (t):' : 'Current Sample Index (n):'}
              </span>
              <span className="font-bold text-[#1A1917] bg-[#FAF9F6] px-2 py-1 rounded border border-[#E6E4DD]">
                {domainMode === 'CT'
                  ? `${ctTVal >= 0 ? `+${ctTVal.toFixed(2)}` : ctTVal.toFixed(2)} s`
                  : `n = ${dtNVal >= 0 ? `+${dtNVal}` : dtNVal}`}
              </span>
            </div>

            {/* 2. Current convolved output y */}
            <div className="py-2.5 flex items-center justify-between">
              <span className="text-[#585651] flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#C85A32]" />
                {domainMode === 'CT' ? 'Current Output y(t):' : 'Current Output y[n]:'}
              </span>
              <span className="font-bold text-[#C85A32] text-sm">
                {domainMode === 'CT'
                  ? ctCurrentArea.toFixed(4)
                  : dtCurrentY.toFixed(4)}
              </span>
            </div>

            {/* 3. Peak y value & its occurrence time */}
            <div className="py-2.5 flex items-center justify-between last:pb-0">
              <span className="text-[#585651] flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-[#059669]" />
                Peak Output (y_peak):
              </span>
              <div className="text-right">
                <span className="font-bold text-[#059669] text-sm block">
                  {domainMode === 'CT'
                    ? ctPeakInfo.peakVal.toFixed(4)
                    : dtPeakInfo.peakVal.toFixed(4)}
                </span>
                <span className="text-[10px] text-[#75736E] block">
                  at {domainMode === 'CT'
                    ? `t = ${ctPeakInfo.peakTime.toFixed(2)} s`
                    : `n = ${dtPeakInfo.peakIndex}`}
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-white rounded-lg border border-[#E6E4DD] text-xs text-[#585651] leading-relaxed">
            {domainMode === 'CT' ? (
              <p>
                In continuous time, the shaded area equals <strong className="text-[#1A1917]">{ctCurrentArea.toFixed(4)}</strong>, exactly matching the current output <strong className="text-[#C85A32]">y({ctTVal.toFixed(2)})</strong>. The maximum peak value of <strong className="text-[#059669]">{ctPeakInfo.peakVal.toFixed(4)}</strong> occurs at <strong className="text-[#1A1917]">t = {ctPeakInfo.peakTime.toFixed(2)} s</strong>.
              </p>
            ) : (
              <p>
                In discrete time, the output is computed via the convolution sum: <strong className="text-[#C85A32]">y[{dtNVal}] = {dtCurrentY.toFixed(4)}</strong>. The maximum sequence peak of <strong className="text-[#059669]">{dtPeakInfo.peakVal.toFixed(4)}</strong> occurs at sample <strong className="text-[#1A1917]">n = {dtPeakInfo.peakIndex}</strong>.
              </p>
            )}
          </div>
        </div>

        {/* Right 7 Cols: KaTeX Analytical Formulation Card */}
        <div className="lg:col-span-7 bg-[#FAF9F6] rounded-xl border border-[#E6E4DD] p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-[#75736E] font-semibold">
            <Layers className="w-4 h-4 text-[#585651]" />
            <span>Analytical Formulation with KaTeX</span>
          </div>

          <div className="p-4 bg-white rounded-lg border border-[#E6E4DD] shadow-2xs space-y-2">
            <div className="text-xs text-[#585651] font-mono font-medium">
              {domainMode === 'CT'
                ? 'Continuous Convolution Integral (CT):'
                : 'Discrete Convolution Sum (DT):'}
            </div>
            {domainMode === 'CT' ? (
              <MathView
                math="y(t) = (x * h)(t) = \int_{-\infty}^{\infty} x(\tau) \, h(t - \tau) \, d\tau"
                displayMode={true}
                className="text-base font-semibold text-[#1A1917]"
              />
            ) : (
              <MathView
                math="y[n] = (x * h)[n] = \sum_{k=-\infty}^{\infty} x[k] \, h[n - k]"
                displayMode={true}
                className="text-base font-semibold text-[#1A1917]"
              />
            )}
          </div>

          {/* Active Preset Mathematical Specification */}
          <div className="p-4 bg-white rounded-lg border border-[#E6E4DD] shadow-2xs space-y-2.5">
            <div className="text-xs text-[#585651] font-mono font-medium">
              {domainMode === 'CT' ? 'Current Continuous System Kernel:' : 'Active Discrete Filter Equation:'}
            </div>
            {domainMode === 'CT' ? (
              ctSystemType === 'rectangle' ? (
                <MathView
                  math={`h(t) = ${ctAmpH.toFixed(1)} \\cdot \\text{rect}\\left(\\frac{t - ${ctWidthH / 2}}{${ctWidthH}}\\right)`}
                  displayMode={false}
                  className="font-mono text-xs text-[#1A1917]"
                />
              ) : ctSystemType === 'exponential' ? (
                <MathView
                  math={`h(t) = ${ctAmpH.toFixed(1)} \\, e^{-t / ${ctWidthH.toFixed(1)}} \\, u(t)`}
                  displayMode={false}
                  className="font-mono text-xs text-[#1A1917]"
                />
              ) : (
                <MathView
                  math={`h(t) = ${ctAmpH.toFixed(1)} \\, \\delta(t) \\implies y(t) = ${ctAmpH.toFixed(1)} x(t)`}
                  displayMode={false}
                  className="font-mono text-xs text-[#1A1917]"
                />
              )
            ) : dtSystemType === 'moving_average_3' ? (
              <div className="space-y-1">
                <MathView
                  math="h[n] = \frac{1}{3} \Big(\delta[n] + \delta[n-1] + \delta[n-2]\Big)"
                  displayMode={false}
                  className="font-mono text-xs text-[#1A1917] font-semibold"
                />
                <p className="text-[11px] text-[#75736E] font-sans">
                  Three-point causal moving average filter: smooths fluctuations and sharp transitions.
                </p>
              </div>
            ) : dtSystemType === 'difference' ? (
              <div className="space-y-1">
                <MathView
                  math="h[n] = \delta[n] - \delta[n-1] \implies y[n] = x[n] - x[n-1]"
                  displayMode={false}
                  className="font-mono text-xs text-[#1A1917] font-semibold"
                />
                <p className="text-[11px] text-[#75736E] font-sans">
                  Backward first-difference filter: computes discrete rate of change and detects rising/falling edges.
                </p>
              </div>
            ) : dtSystemType === 'exponential' ? (
              <MathView
                math="h[n] = A_h (0.65)^n u[n]"
                displayMode={false}
                className="font-mono text-xs text-[#1A1917]"
              />
            ) : (
              <MathView
                math="h[n] = A_h \delta[n]"
                displayMode={false}
                className="font-mono text-xs text-[#1A1917]"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
