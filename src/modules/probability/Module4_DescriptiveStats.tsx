import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Plus,
  Sliders,
  SlidersHorizontal,
  Sparkles,
  RotateCcw,
} from 'lucide-react';
import { MathView } from '../../components/MathView';
import { computeDescriptiveStats, normalPdf } from './math';

export const Module4_DescriptiveStats: React.FC = () => {
  // Preset raw data string (Exam Scores default)
  const defaultExamData =
    '88, 92, 79, 85, 94, 68, 90, 82, 87, 75, 96, 89, 84, 91, 78, 86, 93, 72, 88, 42';
  const [rawText, setRawText] = useState<string>(defaultExamData);

  // Parameter Controlling Bars State
  const [tukeyK, setTukeyK] = useState<number>(1.5);
  const [binCount, setBinCount] = useState<number>(12);
  const [enableTransform, setEnableTransform] = useState<boolean>(false);
  const [scaleA, setScaleA] = useState<number>(1);
  const [shiftB, setShiftB] = useState<number>(0);

  // Parse raw text into array of numbers
  const parsedNumbers = useMemo(() => {
    return rawText
      .split(/[\s,;]+/)
      .map((s) => parseFloat(s.trim()))
      .filter((n) => !isNaN(n) && isFinite(n));
  }, [rawText]);

  // Transformed active numbers if linear transformation enabled
  const activeNumbers = useMemo(() => {
    if (!enableTransform) return parsedNumbers;
    return parsedNumbers.map((x) => Math.round((scaleA * x + shiftB) * 100) / 100);
  }, [parsedNumbers, enableTransform, scaleA, shiftB]);

  // Compute all metrics with adjustable Tukey multiplier
  const stats = useMemo(() => {
    return computeDescriptiveStats(activeNumbers, tukeyK);
  }, [activeNumbers, tukeyK]);

  // Presets loader
  const loadPreset = (preset: 'exam' | 'height' | 'stocks' | 'latency') => {
    switch (preset) {
      case 'exam':
        setRawText('88, 92, 79, 85, 94, 68, 90, 82, 87, 75, 96, 89, 84, 91, 78, 86, 93, 72, 88, 42');
        break;
      case 'height':
        setRawText('165, 172, 168, 175, 170, 162, 178, 169, 171, 166, 174, 167, 173, 170, 164, 176, 169, 172');
        break;
      case 'stocks':
        setRawText('0.8, -1.2, 1.5, 0.4, -0.6, 2.1, -3.8, 0.5, 1.1, -0.2, 0.9, -1.8, 0.3, -4.5, 1.2, 0.7');
        break;
      case 'latency':
        setRawText('42, 45, 48, 44, 46, 52, 49, 43, 47, 55, 51, 48, 62, 78, 95, 142, 380');
        break;
    }
  };

  const appendRandomPoints = () => {
    const currentMean = stats ? stats.mean : 50;
    const currentStd = stats && stats.sampleStdDev > 0 ? stats.sampleStdDev : 10;
    const pts = Array.from({ length: 10 }, () => {
      const u1 = Math.random() || 0.001;
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      return Math.round((currentMean + z * currentStd) * 10) / 10;
    });
    setRawText((prev) => (prev.trim() ? `${prev.trim()}, ${pts.join(', ')}` : pts.join(', ')));
  };

  const clearData = () => setRawText('');

  // SVG Chart Dimensions
  const svgW = 600;
  const svgH = 180;
  const pad = { top: 20, right: 30, bottom: 30, left: 40 };
  const plotW = svgW - pad.left - pad.right;
  const plotH = svgH - pad.top - pad.bottom;

  // Box & Whisker Plot scaling
  const boxPlotElements = useMemo(() => {
    if (!stats) return null;
    const { min, max, q1, median, q3, lowerFence, upperFence, outliers } = stats;
    const span = Math.max(1, max - min);
    const domainMin = min - span * 0.1;
    const domainMax = max + span * 0.1;

    const toPx = (v: number) => pad.left + ((v - domainMin) / (domainMax - domainMin)) * plotW;

    // Normal non-outlier whiskers
    const nonOutliers = activeNumbers.filter((v) => v >= lowerFence && v <= upperFence);
    const whiskerMin = nonOutliers.length > 0 ? Math.min(...nonOutliers) : min;
    const whiskerMax = nonOutliers.length > 0 ? Math.max(...nonOutliers) : max;

    return {
      toPx,
      whiskerMinPx: toPx(whiskerMin),
      whiskerMaxPx: toPx(whiskerMax),
      q1Px: toPx(q1),
      medPx: toPx(median),
      q3Px: toPx(q3),
      outlierPxs: outliers.map((o) => toPx(o)),
      domainMin,
      domainMax,
    };
  }, [stats, activeNumbers, plotW]);

  // Histogram with fitted normal curve driven by user binCount slider
  const histAndFittedCurve = useMemo(() => {
    if (!stats || stats.n < 3) return null;
    const { min, max, mean, sampleStdDev } = stats;
    const span = Math.max(1, max - min);
    const domainMin = min - span * 0.1;
    const domainMax = max + span * 0.1;

    const numBins = Math.min(40, Math.max(4, binCount));
    const binW = (domainMax - domainMin) / numBins;
    const counts = new Array(numBins).fill(0);

    for (const v of activeNumbers) {
      const idx = Math.min(numBins - 1, Math.max(0, Math.floor((v - domainMin) / binW)));
      counts[idx]++;
    }

    const maxCount = Math.max(...counts, 1);
    const toPxX = (x: number) => pad.left + ((x - domainMin) / (domainMax - domainMin)) * plotW;
    const toPxY = (c: number) => pad.top + plotH - (c / (maxCount * 1.15)) * plotH;

    // Normal curve pts scaled to max bar height
    const normPts: string[] = [];
    const steps = 80;
    const normPeak = normalPdf(mean, mean, sampleStdDev);
    for (let i = 0; i <= steps; i++) {
      const x = domainMin + (i / steps) * (domainMax - domainMin);
      const density = normalPdf(x, mean, sampleStdDev);
      const scaledY = (density / (normPeak || 1)) * maxCount;
      normPts.push(`${i === 0 ? 'M' : 'L'} ${toPxX(x).toFixed(1)} ${toPxY(scaledY).toFixed(1)}`);
    }

    return { counts, binW, domainMin, domainMax, toPxX, toPxY, normPath: normPts.join(' ') };
  }, [stats, activeNumbers, binCount, plotW, plotH]);

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="pb-4 border-b border-[#E6E4DD]">
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FBF4F0] text-[#C85A32] border border-[#C85A32]/20">
            MODULE 04
          </span>
          <span className="text-xs font-semibold text-[#75736E] uppercase tracking-wider font-mono">
            Empirical Exploratory Analysis
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1917]">
          Descriptive Stats & Moment Engine
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-[#585651]">
          Compute summary statistics, detect Tukey box-plot outliers, and inspect sum of squared deviations.
        </p>
      </div>

      {/* 2. Raw Data Input & Dataset Presets */}
      <div className="bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E6E4DD]">
          <div>
            <h3 className="text-sm font-bold text-[#1A1917]">Raw Data Input Textarea</h3>
            <span className="text-[11px] text-[#75736E] font-mono">
              Delimited by commas, spaces, semicolons, or newlines
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-mono text-[#8A8882] font-bold uppercase mr-1">Presets:</span>
            <button
              onClick={() => loadPreset('exam')}
              className="px-2.5 py-1 text-xs font-mono bg-white hover:bg-[#F3F2EC] text-[#585651] hover:text-[#1A1917] border border-[#E6E4DD] rounded-md transition-colors cursor-pointer"
            >
              Exam Scores (Outlier)
            </button>
            <button
              onClick={() => loadPreset('height')}
              className="px-2.5 py-1 text-xs font-mono bg-white hover:bg-[#F3F2EC] text-[#585651] hover:text-[#1A1917] border border-[#E6E4DD] rounded-md transition-colors cursor-pointer"
            >
              Adult Heights (Normal)
            </button>
            <button
              onClick={() => loadPreset('stocks')}
              className="px-2.5 py-1 text-xs font-mono bg-white hover:bg-[#F3F2EC] text-[#585651] hover:text-[#1A1917] border border-[#E6E4DD] rounded-md transition-colors cursor-pointer"
            >
              Stock Returns (Fat Tail)
            </button>
            <button
              onClick={() => loadPreset('latency')}
              className="px-2.5 py-1 text-xs font-mono bg-white hover:bg-[#F3F2EC] text-[#585651] hover:text-[#1A1917] border border-[#E6E4DD] rounded-md transition-colors cursor-pointer"
            >
              API Latency (Skewed)
            </button>
          </div>
        </div>

        <textarea
          rows={3}
          value={rawText}
          onChange={(e) => setRawText(e.target.value)}
          placeholder="Paste or type numbers here..."
          className="w-full bg-[#FAF9F6] border border-[#E6E4DD] rounded-md p-3 text-xs font-mono text-[#1A1917] focus:outline-none focus:ring-1 focus:ring-[#C85A32] transition-colors"
        />

        <div className="flex items-center justify-between">
          <span className="text-xs font-mono text-[#75736E]">
            Parsed: <strong className="text-[#1A1917]">{parsedNumbers.length}</strong> valid numerical points
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={appendRandomPoints}
              className="px-3 py-1.5 bg-[#C85A32] hover:bg-[#B54E28] text-white text-xs font-semibold rounded-md shadow-2xs font-mono flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+10 Random Points</span>
            </button>
            <button
              type="button"
              onClick={clearData}
              className="px-3 py-1.5 bg-white border border-[#E6E4DD] hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-[#585651] text-xs font-semibold rounded-md transition-colors cursor-pointer"
            >
              Clear Data
            </button>
          </div>
        </div>
      </div>

      {/* EXACT IMAGE 1 PARAMETER CONTROLLING BAR */}
      <div className="p-4 sm:p-5 rounded-lg bg-[#FAF9F6] border border-[#E6E4DD] space-y-4">
        {/* Header with Title and Mode Indicator */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-[#E6E4DD]">
          <div className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-[#75736E] font-semibold">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#C85A32]" />
            <span>Descriptive Analysis Controls & Hyperparameters</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Parameter Badge Capsule */}
            <div className="flex items-center bg-white p-0.5 rounded-md border border-[#E6E4DD] shadow-2xs">
              <span className="px-2 py-0.5 text-xs font-mono font-bold text-[#C85A32]">
                k = {binCount} bins
              </span>
              <span className="text-[#8A8882] text-xs">·</span>
              <span className="px-2 py-0.5 text-xs font-mono font-bold text-[#1A1917]">
                Tukey = {tukeyK.toFixed(1)} IQR
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                setTukeyK(1.5);
                setBinCount(12);
                setEnableTransform(false);
                setScaleA(1);
                setShiftB(0);
              }}
              className="px-2 py-1 text-xs font-mono text-[#75736E] hover:text-[#C85A32] hover:bg-white rounded border border-transparent hover:border-[#E6E4DD] flex items-center gap-1 cursor-pointer transition-colors"
              title="Reset parameters to defaults"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          </div>
        </div>

        {/* Parameter Sliders Grid - matching Image 1 layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* 1. Histogram Bin Count (k) */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-[#1A1917]">Histogram Bin Count (k)</span>
              <span className="font-mono text-[#C85A32] font-semibold">{binCount} bins</span>
            </div>
            <input
              type="range"
              min="4"
              max="40"
              step="1"
              value={binCount}
              onChange={(e) => setBinCount(parseInt(e.target.value, 10))}
              className="w-full accent-[#C85A32] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
              <span>Coarse (4)</span>
              <span className="font-semibold text-[#1A1917]">Active: {binCount}</span>
              <span>Fine (40)</span>
            </div>
          </div>

          {/* 2. Tukey Fence Multiplier (k) */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium text-[#1A1917]">Tukey Fence Multiplier (k)</span>
              <span className="font-mono text-[#C85A32] font-semibold">k = {tukeyK.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3.5"
              step="0.1"
              value={tukeyK}
              onChange={(e) => setTukeyK(parseFloat(e.target.value))}
              className="w-full accent-[#C85A32] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-[#8A8882] mt-0.5">
              <span>Strict (0.5)</span>
              <span className="font-semibold text-[#1A1917]">Threshold: {tukeyK.toFixed(1)} IQR</span>
              <span>Permissive (3.5)</span>
            </div>
          </div>

          {/* 3. Linear Transformation (Y = aX + b) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium text-[#1A1917]">Linear Transform (Y = aX + b)</span>
              <button
                type="button"
                onClick={() => setEnableTransform((v) => !v)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold cursor-pointer border transition-colors ${
                  enableTransform
                    ? 'bg-[#C85A32] text-white border-[#C85A32]'
                    : 'bg-white text-[#585651] border-[#E6E4DD] hover:text-[#1A1917]'
                }`}
              >
                {enableTransform ? 'Active' : 'Bypass'}
              </button>
            </div>

            {enableTransform ? (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="font-mono text-[#585651]">Scale (a)</span>
                    <span className="font-mono text-[#C85A32] font-semibold">{scaleA.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min="-4"
                    max="4"
                    step="0.1"
                    value={scaleA}
                    onChange={(e) => setScaleA(parseFloat(e.target.value))}
                    className="w-full accent-[#C85A32] cursor-pointer"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[11px] mb-0.5">
                    <span className="font-mono text-[#585651]">Shift (b)</span>
                    <span className="font-mono text-[#C85A32] font-semibold">{shiftB}</span>
                  </div>
                  <input
                    type="range"
                    min="-50"
                    max="50"
                    step="1"
                    value={shiftB}
                    onChange={(e) => setShiftB(parseFloat(e.target.value))}
                    className="w-full accent-[#C85A32] cursor-pointer"
                  />
                </div>
              </div>
            ) : (
              <div className="h-10 flex items-center">
                <p className="text-[11px] text-[#75736E] line-clamp-2">
                  Enable to dynamically scale & shift: <MathView math="\bar{y} = a\bar{x} + b" /> and <MathView math="s_y = |a|s_x" />.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Presets & Heuristic Rules Row - Matching Image 1 */}
        <div className="pt-2 border-t border-[#E6E4DD]">
          <div className="flex flex-wrap items-center gap-1.5">
            <div className="flex items-center gap-1 text-xs text-[#75736E] font-mono mr-1">
              <Sparkles className="w-3.5 h-3.5 text-[#C85A32]" />
              <span>Presets & Rules:</span>
            </div>

            <button
              type="button"
              onClick={() => setBinCount(Math.max(4, Math.ceil(Math.sqrt(activeNumbers.length || 10))))}
              className="px-2.5 py-1 text-xs font-mono bg-white hover:bg-[#F3F2EC] text-[#1A1917] border border-[#E6E4DD] rounded shadow-2xs cursor-pointer transition-colors"
              title="Square-root rule: k = ceil(sqrt(n))"
            >
              √n Rule ({Math.max(4, Math.ceil(Math.sqrt(activeNumbers.length || 10)))})
            </button>
            <button
              type="button"
              onClick={() => setBinCount(Math.max(4, Math.ceil(1 + Math.log2(activeNumbers.length || 10))))}
              className="px-2.5 py-1 text-xs font-mono bg-white hover:bg-[#F3F2EC] text-[#1A1917] border border-[#E6E4DD] rounded shadow-2xs cursor-pointer transition-colors"
              title="Sturges rule: k = ceil(1 + log2(n))"
            >
              Sturges Rule ({Math.max(4, Math.ceil(1 + Math.log2(activeNumbers.length || 10)))})
            </button>
            <button
              type="button"
              onClick={() => setBinCount(Math.max(4, Math.ceil(2 * Math.cbrt(activeNumbers.length || 10))))}
              className="px-2.5 py-1 text-xs font-mono bg-white hover:bg-[#F3F2EC] text-[#1A1917] border border-[#E6E4DD] rounded shadow-2xs cursor-pointer transition-colors"
              title="Rice rule: k = ceil(2 * n^(1/3))"
            >
              Rice Rule ({Math.max(4, Math.ceil(2 * Math.cbrt(activeNumbers.length || 10)))})
            </button>

            <span className="text-[#8A8882] text-xs px-1">|</span>

            <button
              type="button"
              onClick={() => setTukeyK(1.0)}
              className={`px-2.5 py-1 text-xs font-mono rounded shadow-2xs cursor-pointer transition-colors border ${
                tukeyK === 1.0
                  ? 'bg-[#C85A32] text-white border-[#C85A32]'
                  : 'bg-white hover:bg-[#F3F2EC] text-[#1A1917] border-[#E6E4DD]'
              }`}
            >
              Strict Outliers (1.0)
            </button>
            <button
              type="button"
              onClick={() => setTukeyK(1.5)}
              className={`px-2.5 py-1 text-xs font-mono rounded shadow-2xs cursor-pointer transition-colors border ${
                tukeyK === 1.5
                  ? 'bg-[#C85A32] text-white border-[#C85A32]'
                  : 'bg-white hover:bg-[#F3F2EC] text-[#1A1917] border-[#E6E4DD]'
              }`}
            >
              Standard Fence (1.5)
            </button>
            <button
              type="button"
              onClick={() => setTukeyK(3.0)}
              className={`px-2.5 py-1 text-xs font-mono rounded shadow-2xs cursor-pointer transition-colors border ${
                tukeyK === 3.0
                  ? 'bg-[#C85A32] text-white border-[#C85A32]'
                  : 'bg-white hover:bg-[#F3F2EC] text-[#1A1917] border-[#E6E4DD]'
              }`}
            >
              Extreme Fence (3.0)
            </button>
          </div>
        </div>
      </div>

      {/* 4. Tukey Outlier Warning Banner */}
      {stats && stats.outliers.length > 0 && (
        <div className="p-4 bg-[#FBF4F0] border border-[#C85A32]/30 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-[#C85A32] shrink-0 mt-0.5" />
          <div className="text-xs text-[#1A1917] space-y-1">
            <span className="font-bold block text-[#B54E28]">
              Tukey Outlier Detected ({stats.outliers.length} point{stats.outliers.length > 1 ? 's' : ''}):
            </span>
            <p className="text-[#585651]">
              Values falling beyond <MathView math={`[Q_1 - ${tukeyK.toFixed(1)}\\text{IQR}, \\, Q_3 + ${tukeyK.toFixed(1)}\\text{IQR}]`} />:{' '}
              <strong className="font-mono text-[#1A1917]">{stats.outliers.join(', ')}</strong> (Fences: [
              {stats.lowerFence.toFixed(1)}, {stats.upperFence.toFixed(1)}]).
            </p>
          </div>
        </div>
      )}

      {/* 5. Comprehensive Metrics Grid */}
      {stats && (
        <div className="bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-xs space-y-3">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#75736E]">
            Comprehensive Summary Statistics
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
            <div className="p-3 bg-[#FAF9F6] rounded-md border border-[#E6E4DD]">
              <span className="text-[10px] font-mono text-[#75736E] uppercase">Sample Mean (x̄)</span>
              <div className="text-base font-mono font-bold text-[#1A1917] mt-0.5">{stats.mean.toFixed(2)}</div>
            </div>

            <div className="p-3 bg-[#FAF9F6] rounded-md border border-[#E6E4DD]">
              <span className="text-[10px] font-mono text-[#75736E] uppercase">Median (Q₂)</span>
              <div className="text-base font-mono font-bold text-[#1A1917] mt-0.5">{stats.median.toFixed(2)}</div>
            </div>

            <div className="p-3 bg-[#FAF9F6] rounded-md border border-[#E6E4DD]">
              <span className="text-[10px] font-mono text-[#75736E] uppercase">Sample SD (s)</span>
              <div className="text-base font-mono font-bold text-[#C85A32] mt-0.5">{stats.sampleStdDev.toFixed(2)}</div>
            </div>

            <div className="p-3 bg-[#FAF9F6] rounded-md border border-[#E6E4DD]">
              <span className="text-[10px] font-mono text-[#75736E] uppercase">Sample Variance (s²)</span>
              <div className="text-base font-mono font-bold text-[#1A1917] mt-0.5">{stats.sampleVariance.toFixed(2)}</div>
            </div>

            <div className="p-3 bg-[#FAF9F6] rounded-md border border-[#E6E4DD]">
              <span className="text-[10px] font-mono text-[#75736E] uppercase">IQR (Q₃ - Q₁)</span>
              <div className="text-base font-mono font-bold text-[#1A1917] mt-0.5">{stats.iqr.toFixed(2)}</div>
            </div>

            <div className="p-3 bg-[#FAF9F6] rounded-md border border-[#E6E4DD]">
              <span className="text-[10px] font-mono text-[#75736E] uppercase">Std Error (SE)</span>
              <div className="text-base font-mono font-bold text-[#1A1917] mt-0.5">{stats.standardError.toFixed(2)}</div>
            </div>

            <div className="p-3 bg-[#FAF9F6] rounded-md border border-[#E6E4DD]">
              <span className="text-[10px] font-mono text-[#75736E] uppercase">Skewness (γ₁)</span>
              <div className="text-base font-mono font-bold text-[#1A1917] mt-0.5">{stats.skewness.toFixed(2)}</div>
            </div>

            <div className="p-3 bg-[#FAF9F6] rounded-md border border-[#E6E4DD]">
              <span className="text-[10px] font-mono text-[#75736E] uppercase">Excess Kurtosis</span>
              <div className="text-base font-mono font-bold text-[#1A1917] mt-0.5">{stats.kurtosis.toFixed(2)}</div>
            </div>

            <div className="p-3 bg-[#FAF9F6] rounded-md border border-[#E6E4DD]">
              <span className="text-[10px] font-mono text-[#75736E] uppercase">Range (Max - Min)</span>
              <div className="text-base font-mono font-bold text-[#1A1917] mt-0.5">{stats.range.toFixed(2)}</div>
            </div>

            <div className="p-3 bg-[#FAF9F6] rounded-md border border-[#E6E4DD]">
              <span className="text-[10px] font-mono text-[#75736E] uppercase">Population SD (σ)</span>
              <div className="text-base font-mono font-bold text-[#1A1917] mt-0.5">{stats.popStdDev.toFixed(2)}</div>
            </div>

            <div className="p-3 bg-[#FAF9F6] rounded-md border border-[#E6E4DD]">
              <span className="text-[10px] font-mono text-[#75736E] uppercase">Population Var (σ²)</span>
              <div className="text-base font-mono font-bold text-[#1A1917] mt-0.5">{stats.popVariance.toFixed(2)}</div>
            </div>

            <div className="p-3 bg-[#FAF9F6] rounded-md border border-[#E6E4DD]">
              <span className="text-[10px] font-mono text-[#75736E] uppercase">Mode(s)</span>
              <div className="text-base font-mono font-bold text-[#1A1917] mt-0.5 truncate">
                {stats.modes.length > 0 ? stats.modes.join(', ') : 'None'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. Interactive Box & Whisker Plot */}
      {boxPlotElements && stats && (
        <div className="bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E6E4DD]">
            <h3 className="text-sm font-bold text-[#1A1917]">Tukey Box & Whisker Plot</h3>
            <span className="text-xs font-mono text-[#75736E]">
              Q₁ = {stats.q1.toFixed(1)} · Median = {stats.median.toFixed(1)} · Q₃ = {stats.q3.toFixed(1)}
            </span>
          </div>

          <div className="relative w-full h-32 bg-[#FAF9F6] rounded-md border border-[#E6E4DD] select-none">
            <svg viewBox={`0 0 ${svgW} 120`} className="w-full h-full">
              {/* Whiskers */}
              <line
                x1={boxPlotElements.whiskerMinPx}
                y1={60}
                x2={boxPlotElements.whiskerMaxPx}
                y2={60}
                stroke="#8A8882"
                strokeWidth="1.5"
              />
              <line
                x1={boxPlotElements.whiskerMinPx}
                y1={45}
                x2={boxPlotElements.whiskerMinPx}
                y2={75}
                stroke="#8A8882"
                strokeWidth="1.5"
              />
              <line
                x1={boxPlotElements.whiskerMaxPx}
                y1={45}
                x2={boxPlotElements.whiskerMaxPx}
                y2={75}
                stroke="#8A8882"
                strokeWidth="1.5"
              />

              {/* IQR Box */}
              <rect
                x={boxPlotElements.q1Px}
                y={35}
                width={Math.max(2, boxPlotElements.q3Px - boxPlotElements.q1Px)}
                height={50}
                fill="rgba(200, 90, 50, 0.22)"
                stroke="#C85A32"
                strokeWidth="1.5"
                rx="2"
              />

              {/* Median Line */}
              <line
                x1={boxPlotElements.medPx}
                y1={35}
                x2={boxPlotElements.medPx}
                y2={85}
                stroke="#1A1917"
                strokeWidth="2.5"
              />

              {/* Outlier Dots */}
              {boxPlotElements.outlierPxs.map((px, idx) => (
                <circle key={idx} cx={px} cy={60} r="4.5" fill="#B54E28" stroke="#FFFFFF" strokeWidth="1.5" />
              ))}

              {/* Labels */}
              <text x={boxPlotElements.q1Px} y={105} fill="#75736E" fontSize="10" fontFamily="monospace" textAnchor="middle">
                Q₁
              </text>
              <text x={boxPlotElements.medPx} y={105} fill="#1A1917" fontSize="10" fontFamily="monospace" fontWeight="bold" textAnchor="middle">
                Median
              </text>
              <text x={boxPlotElements.q3Px} y={105} fill="#75736E" fontSize="10" fontFamily="monospace" textAnchor="middle">
                Q₃
              </text>
            </svg>
          </div>
        </div>
      )}

      {/* 7. Histogram with Fitted Parametric Normal Curve */}
      {histAndFittedCurve && stats && (
        <div className="bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E6E4DD]">
            <h3 className="text-sm font-bold text-[#1A1917]">
              Sample Histogram with Fitted Normal Curve <MathView math="\mathcal{N}(\bar{x}, s^2)" />
            </h3>
            <span className="text-xs font-mono text-[#75736E]">
              Gaussian Envelope Fit
            </span>
          </div>

          <div className="relative w-full h-48 bg-[#FAF9F6] rounded-md border border-[#E6E4DD] select-none">
            <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-full">
              {/* Baseline */}
              <line x1={pad.left} y1={pad.top + plotH} x2={pad.left + plotW} y2={pad.top + plotH} stroke="#8A8882" strokeWidth="1.5" />

              {/* Binned Frequency Bars */}
              {histAndFittedCurve.counts.map((c, idx) => {
                const bStart = histAndFittedCurve.domainMin + idx * histAndFittedCurve.binW;
                const px = histAndFittedCurve.toPxX(bStart);
                const py = histAndFittedCurve.toPxY(c);
                const bW = (histAndFittedCurve.binW / (histAndFittedCurve.domainMax - histAndFittedCurve.domainMin)) * plotW;
                const bH = pad.top + plotH - py;
                return (
                  <rect
                    key={idx}
                    x={px}
                    y={py}
                    width={Math.max(1, bW - 1)}
                    height={bH}
                    fill="rgba(37, 99, 235, 0.22)"
                    stroke="#2563EB"
                    strokeWidth="0.75"
                  />
                );
              })}

              {/* Fitted Normal Path */}
              <path d={histAndFittedCurve.normPath} fill="none" stroke="#C85A32" strokeWidth="2.5" />
            </svg>
          </div>
        </div>
      )}

      {/* 8. Sum of Squares Step-by-Step Breakdown Table */}
      {stats && (
        <div className="bg-white rounded-lg border border-[#E6E4DD] p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E6E4DD]">
            <div>
              <h3 className="text-sm font-bold text-[#1A1917]">Sum of Squares Breakdown Table</h3>
              <p className="text-[11px] text-[#75736E] font-mono">
                Step-by-step deviations from mean: <MathView math="\text{SS} = \sum (x_i - \bar{x})^2" />
              </p>
            </div>
            <div className="text-xs font-mono font-bold text-[#C85A32] bg-[#FBF4F0] px-2.5 py-1 rounded-md border border-[#C85A32]/20">
              Total SS = {stats.sumSquares.toFixed(2)}
            </div>
          </div>

          <div className="max-h-56 overflow-y-auto rounded-md border border-[#E6E4DD]">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-[#FAF9F6] text-[#75736E] font-mono text-[11px] sticky top-0 border-b border-[#E6E4DD]">
                <tr>
                  <th className="py-2 px-3">#</th>
                  <th className="py-2 px-3">Value (x_i)</th>
                  <th className="py-2 px-3">Deviation (x_i - x̄)</th>
                  <th className="py-2 px-3">Squared Deviation (x_i - x̄)²</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E4DD] font-mono">
                {stats.rows.map((row) => (
                  <tr key={row.index} className="hover:bg-[#FAF9F6] transition-colors">
                    <td className="py-1.5 px-3 text-[#8A8882]">{row.index}</td>
                    <td className="py-1.5 px-3 font-semibold text-[#1A1917]">{row.x}</td>
                    <td className="py-1.5 px-3 text-[#585651]">{row.deviation.toFixed(2)}</td>
                    <td className="py-1.5 px-3 text-[#C85A32] font-bold">{row.deviationSq.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
