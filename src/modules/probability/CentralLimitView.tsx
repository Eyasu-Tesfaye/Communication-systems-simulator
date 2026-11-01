import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  Play,
  RotateCcw,
  Sparkles,
  TrendingUp,
  Sliders,
  CheckCircle2,
  Info,
  Waves,
} from 'lucide-react';
import { MathView } from '../../components/MathView';

type PopulationType = 'uniform' | 'exponential' | 'bimodal' | 'die_roll';

export const CentralLimitView: React.FC = () => {
  const [popType, setPopType] = useState<PopulationType>('uniform');
  const [sampleSizeN, setSampleSizeN] = useState<number>(10); // n items per average
  const [numTrialsN, setNumTrialsN] = useState<number>(2000); // N averages generated
  const [sampleMeans, setSampleMeans] = useState<number[]>([]);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // Population mathematical properties
  const popProperties = useMemo(() => {
    switch (popType) {
      case 'uniform': {
        // U(0, 10)
        const a = 0;
        const b = 10;
        const mean = (a + b) / 2; // 5.0
        const variance = Math.pow(b - a, 2) / 12; // 100/12 = 8.333
        const stdDev = Math.sqrt(variance); // 2.887
        return {
          name: 'Continuous Uniform [0, 10]',
          mean,
          variance,
          stdDev,
          minX: -1,
          maxX: 11,
          sampleSingle: () => a + Math.random() * (b - a),
        };
      }
      case 'exponential': {
        // Exp(lambda = 0.5)
        const lambda = 0.5;
        const mean = 1 / lambda; // 2.0
        const variance = 1 / (lambda * lambda); // 4.0
        const stdDev = Math.sqrt(variance); // 2.0
        return {
          name: 'Exponential Distribution (λ = 0.5) [Heavily Skewed]',
          mean,
          variance,
          stdDev,
          minX: -0.5,
          maxX: 10,
          sampleSingle: () => {
            let u = Math.random();
            while (u <= 1e-12) u = Math.random();
            return -Math.log(u) / lambda;
          },
        };
      }
      case 'bimodal': {
        // Mixture of N(2, 0.6^2) and N(8, 0.6^2) with 50/50 weights
        const mean = 5.0;
        // Var = 0.5*(0.36 + (2-5)^2) + 0.5*(0.36 + (8-5)^2) = 0.36 + 9 = 9.36
        const variance = 9.36;
        const stdDev = Math.sqrt(variance);
        return {
          name: 'Bimodal Mixture (Two Distinct Peaks)',
          mean,
          variance,
          stdDev,
          minX: -1,
          maxX: 11,
          sampleSingle: () => {
            const isFirst = Math.random() < 0.5;
            const mu = isFirst ? 2 : 8;
            const s = 0.6;
            let u1 = Math.random();
            while (u1 <= 1e-12) u1 = Math.random();
            const u2 = Math.random();
            const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
            return mu + s * z;
          },
        };
      }
      case 'die_roll': {
        // Discrete 6-sided die {1, 2, 3, 4, 5, 6}
        const mean = 3.5;
        const variance = (36 - 1) / 12; // 35/12 = 2.9167
        const stdDev = Math.sqrt(variance); // 1.7078
        return {
          name: 'Fair 6-Sided Die Discrete Uniform {1, ..., 6}',
          mean,
          variance,
          stdDev,
          minX: 0,
          maxX: 7,
          sampleSingle: () => Math.floor(Math.random() * 6) + 1,
        };
      }
    }
  }, [popType]);

  // Generate sample means
  const generateSamples = useCallback(() => {
    const means: number[] = new Array(numTrialsN);
    const sampler = popProperties.sampleSingle;
    const n = sampleSizeN;

    for (let i = 0; i < numTrialsN; i++) {
      let sum = 0;
      for (let j = 0; j < n; j++) {
        sum += sampler();
      }
      means[i] = sum / n;
    }
    setSampleMeans(means);
  }, [numTrialsN, sampleSizeN, popProperties]);

  // Initial generation on mount or parameter changes
  useEffect(() => {
    generateSamples();
  }, [generateSamples]);

  // Theoretical standard error of the mean
  const theoreticalSE = popProperties.stdDev / Math.sqrt(sampleSizeN);

  // Empirical stats of the sample means
  const empiricalStats = useMemo(() => {
    if (sampleMeans.length === 0) return { mean: 0, variance: 0, stdDev: 0, skewness: 0 };
    const N = sampleMeans.length;
    let sum = 0;
    for (let i = 0; i < N; i++) sum += sampleMeans[i];
    const mean = sum / N;

    let sumSq = 0;
    let sumCube = 0;
    for (let i = 0; i < N; i++) {
      const diff = sampleMeans[i] - mean;
      sumSq += diff * diff;
      sumCube += diff * diff * diff;
    }
    const variance = sumSq / (N - 1);
    const stdDev = Math.sqrt(variance);
    const skewness = stdDev > 0 ? (sumCube / N) / Math.pow(stdDev, 3) : 0;

    return { mean, variance, stdDev, skewness };
  }, [sampleMeans]);

  // Canvas refs for plotting
  const popCanvasRef = useRef<HTMLCanvasElement>(null);
  const cltCanvasRef = useRef<HTMLCanvasElement>(null);

  // Render Population Canvas
  useEffect(() => {
    const canvas = popCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.parentElement?.clientWidth || 300;
    const height = 150;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const pad = { top: 16, right: 20, bottom: 28, left: 36 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    const { minX, maxX } = popProperties;
    const xToPx = (x: number) => pad.left + ((x - minX) / (maxX - minX)) * plotW;

    // Draw baseline
    ctx.strokeStyle = '#E6E4DD';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top + plotH);
    ctx.lineTo(pad.left + plotW, pad.top + plotH);
    ctx.stroke();

    // Render population shape
    ctx.strokeStyle = '#585651';
    ctx.fillStyle = 'rgba(88, 86, 81, 0.12)';
    ctx.lineWidth = 2;

    if (popType === 'uniform') {
      const p1 = xToPx(0);
      const p2 = xToPx(10);
      const py = pad.top + plotH * 0.35;
      ctx.beginPath();
      ctx.moveTo(p1, pad.top + plotH);
      ctx.lineTo(p1, py);
      ctx.lineTo(p2, py);
      ctx.lineTo(p2, pad.top + plotH);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (popType === 'exponential') {
      ctx.beginPath();
      ctx.moveTo(xToPx(0), pad.top + plotH);
      const steps = 60;
      for (let i = 0; i <= steps; i++) {
        const x = (i / steps) * 10;
        const y = 0.5 * Math.exp(-0.5 * x);
        const px = xToPx(x);
        const py = pad.top + plotH - (y / 0.55) * plotH;
        ctx.lineTo(px, py);
      }
      ctx.lineTo(xToPx(10), pad.top + plotH);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (popType === 'bimodal') {
      ctx.beginPath();
      ctx.moveTo(xToPx(-0.5), pad.top + plotH);
      const steps = 80;
      for (let i = 0; i <= steps; i++) {
        const x = -0.5 + (i / steps) * 11;
        const g1 = Math.exp(-Math.pow(x - 2, 2) / (2 * 0.36));
        const g2 = Math.exp(-Math.pow(x - 8, 2) / (2 * 0.36));
        const y = 0.5 * (g1 + g2);
        const px = xToPx(x);
        const py = pad.top + plotH - y * plotH * 0.85;
        ctx.lineTo(px, py);
      }
      ctx.lineTo(xToPx(10.5), pad.top + plotH);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (popType === 'die_roll') {
      for (let k = 1; k <= 6; k++) {
        const px = xToPx(k);
        const py = pad.top + plotH * 0.35;
        ctx.beginPath();
        ctx.moveTo(px, pad.top + plotH);
        ctx.lineTo(px, py);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(px, py, 3.5, 0, 2 * Math.PI);
        ctx.fillStyle = '#585651';
        ctx.fill();
      }
    }

    // Mean dashed line
    const muPx = xToPx(popProperties.mean);
    ctx.save();
    ctx.setLineDash([3, 3]);
    ctx.strokeStyle = '#C85A32';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(muPx, pad.top);
    ctx.lineTo(muPx, pad.top + plotH);
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#C85A32';
    ctx.font = 'bold 9px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`μ = ${popProperties.mean.toFixed(1)}`, muPx, pad.top + 8);
  }, [popType, popProperties]);

  // Render CLT Histogram & Gaussian Overlay Canvas
  useEffect(() => {
    const canvas = cltCanvasRef.current;
    if (!canvas || sampleMeans.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.parentElement?.clientWidth || 450;
    const height = 240;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const pad = { top: 24, right: 24, bottom: 36, left: 44 };
    const plotW = width - pad.left - pad.right;
    const plotH = height - pad.top - pad.bottom;

    // Determine domain around mean +/- 4*SE
    const center = popProperties.mean;
    const span = Math.max(0.8, theoreticalSE * 4.2);
    const xMin = center - span;
    const xMax = center + span;

    const xToPx = (x: number) => pad.left + ((x - xMin) / (xMax - xMin)) * plotW;

    // Create histogram bins
    const numBins = 36;
    const binWidth = (xMax - xMin) / numBins;
    const binCounts = new Array(numBins).fill(0);
    const N = sampleMeans.length;

    for (let i = 0; i < N; i++) {
      const val = sampleMeans[i];
      if (val >= xMin && val <= xMax) {
        const idx = Math.min(numBins - 1, Math.max(0, Math.floor((val - xMin) / binWidth)));
        binCounts[idx]++;
      }
    }

    // Determine max density
    let maxDensity = 0;
    for (let i = 0; i < numBins; i++) {
      const d = binCounts[i] / (N * binWidth);
      if (d > maxDensity) maxDensity = d;
    }
    const gaussPeak = 1 / (theoreticalSE * Math.sqrt(2 * Math.PI));
    const yMax = Math.max(maxDensity, gaussPeak) * 1.15;

    const yToPx = (y: number) => pad.top + plotH - (y / yMax) * plotH;

    // Draw grid
    ctx.strokeStyle = '#F0EEE8';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const py = pad.top + (plotH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(pad.left, py);
      ctx.lineTo(pad.left + plotW, py);
      ctx.stroke();
    }

    // Draw Histogram Bars
    ctx.fillStyle = 'rgba(74, 107, 130, 0.28)';
    ctx.strokeStyle = '#4A6B82';
    ctx.lineWidth = 1;

    for (let i = 0; i < numBins; i++) {
      const count = binCounts[i];
      if (count === 0) continue;
      const density = count / (N * binWidth);
      const bStart = xMin + i * binWidth;
      const px = xToPx(bStart);
      const py = yToPx(density);
      const bW = (binWidth / (xMax - xMin)) * plotW;
      const bH = pad.top + plotH - py;

      ctx.fillRect(px, py, bW - 1, bH);
      ctx.strokeRect(px, py, bW - 1, bH);
    }

    // Draw Theoretical Normal Bell Curve
    ctx.beginPath();
    const steps = 140;
    for (let i = 0; i <= steps; i++) {
      const x = xMin + (i / steps) * (xMax - xMin);
      const exponent = -Math.pow(x - center, 2) / (2 * theoreticalSE * theoreticalSE);
      const density = (1 / (theoreticalSE * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
      const px = xToPx(x);
      const py = yToPx(density);

      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.strokeStyle = '#C85A32';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Baseline
    ctx.strokeStyle = '#1A1917';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top + plotH);
    ctx.lineTo(pad.left + plotW, pad.top + plotH);
    ctx.stroke();

    // Axis Labels
    ctx.fillStyle = '#75736E';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${xMin.toFixed(2)}`, pad.left, pad.top + plotH + 16);
    ctx.fillText(`μ = ${center.toFixed(2)}`, xToPx(center), pad.top + plotH + 16);
    ctx.fillText(`${xMax.toFixed(2)}`, pad.left + plotW, pad.top + plotH + 16);
  }, [sampleMeans, popProperties, theoreticalSE]);

  // Handle animate / batch addition
  const handleSimulate = () => {
    setIsSimulating(true);
    let count = 0;
    const interval = setInterval(() => {
      count++;
      generateSamples();
      if (count >= 5) {
        clearInterval(interval);
        setIsSimulating(false);
      }
    }, 120);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Context */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1917]">
          Central Limit Theorem (CLT)
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-[#585651] max-w-3xl leading-relaxed">
          Observe how the distribution of the sample mean approaches a Gaussian Normal distribution as the sample size n increases, regardless of how skewed or non-normal the original population is.
        </p>
      </div>

      {/* 2. Parameters & Controls Banner */}
      <div className="bg-white rounded-xl border border-[#E6E4DD] p-5 shadow-2xs space-y-4">
        {/* Source Population Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E6E4DD]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1917]">
              Source Population:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'uniform', label: 'Uniform' },
                  { id: 'exponential', label: 'Exponential (Skewed)' },
                  { id: 'bimodal', label: 'Bimodal (Two Peaks)' },
                  { id: 'die_roll', label: 'Discrete Die Roll' },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setPopType(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                    popType === item.id
                      ? 'bg-[#1A1917] text-white border-[#1A1917] shadow-xs'
                      : 'bg-[#FAF9F6] text-[#585651] border-[#E6E4DD] hover:bg-[#F3F2EC]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSimulating}
              onClick={handleSimulate}
              className="px-3.5 py-1.5 bg-[#C85A32] hover:bg-[#B54E28] text-white text-xs font-semibold rounded-lg shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isSimulating ? 'Sampling...' : 'Simulate & Animate'}</span>
            </button>
            <button
              type="button"
              onClick={generateSamples}
              className="px-3 py-1.5 bg-white border border-[#E6E4DD] hover:bg-[#FAF9F6] text-xs font-medium text-[#585651] rounded-lg transition-colors cursor-pointer"
            >
              Re-Sample
            </button>
          </div>
        </div>

        {/* Sliders Grid: Sample Size (n) and Realizations (N) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
          {/* Sample Size n Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-[#1A1917] flex items-center gap-1">
                <span>Sample Size per Average (n):</span>
                <span className="font-mono text-[#75736E]">(n items averaged together)</span>
              </span>
              <span className="font-mono font-bold text-[#C85A32] bg-[#FBF4F0] px-2 py-0.5 rounded border border-[#C85A32]/25">
                n = {sampleSizeN}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max="50"
              step="1"
              value={sampleSizeN}
              onChange={(e) => setSampleSizeN(parseInt(e.target.value, 10))}
              className="w-full accent-[#C85A32] cursor-pointer"
            />
            {/* Quick n Presets */}
            <div className="flex justify-between items-center text-[10px] font-mono text-[#75736E]">
              <span>n=1 (Original)</span>
              <div className="flex gap-1.5">
                {[1, 2, 5, 10, 30, 50].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setSampleSizeN(val)}
                    className={`px-1.5 py-0.5 rounded border cursor-pointer ${
                      sampleSizeN === val
                        ? 'bg-[#C85A32] text-white border-[#C85A32]'
                        : 'bg-[#FAF9F6] border-[#E6E4DD] hover:bg-[#F3F2EC]'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
              <span>n=50 (High CLT)</span>
            </div>
          </div>

          {/* Number of Experiments (N) Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="font-medium text-[#1A1917]">
                Total Realizations (N Experiments):
              </span>
              <span className="font-mono font-bold text-[#1A1917] bg-[#FAF9F6] px-2 py-0.5 rounded border border-[#E6E4DD]">
                N = {numTrialsN.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min="500"
              max="5000"
              step="500"
              value={numTrialsN}
              onChange={(e) => setNumTrialsN(parseInt(e.target.value, 10))}
              className="w-full accent-[#1A1917] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-[#8A8882]">
              <span>500 experiments</span>
              <span>2,500</span>
              <span>5,000 experiments</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Dual Visualizations (Original Population + CLT Histogram) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (4 Cols): Original Source Distribution */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-[#E6E4DD] p-5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E6E4DD]">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#1A1917]">
              1. Population Distribution X
            </h3>
            <span className="text-[10px] font-mono text-[#75736E]">Source Model</span>
          </div>

          <div className="w-full flex items-center justify-center bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-2">
            <canvas ref={popCanvasRef} className="block w-full" />
          </div>

          <div className="space-y-1 text-xs">
            <div className="flex justify-between text-[#585651]">
              <span>Population Mean (μ):</span>
              <span className="font-mono font-bold text-[#1A1917]">{popProperties.mean.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#585651]">
              <span>Population Variance (σ²):</span>
              <span className="font-mono font-bold text-[#1A1917]">{popProperties.variance.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[#585651]">
              <span>Population Std Dev (σ):</span>
              <span className="font-mono font-bold text-[#1A1917]">{popProperties.stdDev.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Right Column (8 Cols): CLT Distribution of Sample Means */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-[#E6E4DD] p-5 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#E6E4DD]">
            <div>
              <h3 className="text-sm font-bold text-[#1A1917]">
                2. Distribution of Sample Means: <MathView math="\bar{X}_n \sim \mathcal{N}\left(\mu, \frac{\sigma^2}{n}\right)" />
              </h3>
              <p className="text-[11px] text-[#75736E] mt-0.5">
                Empirical histogram of {numTrialsN.toLocaleString()} sample averages overlaid with theoretical Gaussian.
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-2 bg-[#4A6B82]/40 border border-[#4A6B82] rounded-2xs inline-block" />
                <span>Sample Histogram</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-1 bg-[#C85A32] rounded-full inline-block" />
                <span>CLT Normal Fit</span>
              </span>
            </div>
          </div>

          {/* CLT Plot Canvas */}
          <div className="w-full bg-[#FAF9F6] rounded-lg border border-[#E6E4DD] p-2">
            <canvas ref={cltCanvasRef} className="block w-full" />
          </div>

          {/* Statistical Convergence Comparison Matrix */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="p-2.5 rounded-lg bg-[#FAF9F6] border border-[#E6E4DD]">
              <div className="text-[10px] font-mono text-[#8A8882] uppercase">Mean E[X̄]</div>
              <div className="font-mono font-bold text-[#1A1917] text-sm mt-0.5">
                {empiricalStats.mean.toFixed(3)}
              </div>
              <div className="text-[10px] text-[#75736E] mt-0.5">Target: {popProperties.mean.toFixed(2)}</div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#FAF9F6] border border-[#E6E4DD]">
              <div className="text-[10px] font-mono text-[#8A8882] uppercase">Standard Error</div>
              <div className="font-mono font-bold text-[#C85A32] text-sm mt-0.5">
                {empiricalStats.stdDev.toFixed(3)}
              </div>
              <div className="text-[10px] text-[#75736E] mt-0.5">
                σ/√n = {theoreticalSE.toFixed(3)}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#FAF9F6] border border-[#E6E4DD]">
              <div className="text-[10px] font-mono text-[#8A8882] uppercase">Sample Skewness</div>
              <div className="font-mono font-bold text-[#1A1917] text-sm mt-0.5">
                {empiricalStats.skewness.toFixed(3)}
              </div>
              <div className="text-[10px] text-[#75736E] mt-0.5">
                {Math.abs(empiricalStats.skewness) < 0.15 ? 'Nearly Symmetric' : 'Asymmetric'}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-[#FAF9F6] border border-[#E6E4DD]">
              <div className="text-[10px] font-mono text-[#8A8882] uppercase">Variance Reduction</div>
              <div className="font-mono font-bold text-emerald-700 text-sm mt-0.5">
                {sampleSizeN}× tighter
              </div>
              <div className="text-[10px] text-[#75736E] mt-0.5">Var decreases by 1/n</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
