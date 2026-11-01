import React, { useState, useMemo } from 'react';
import {
  Grid,
  Sparkles,
  Layers,
  HelpCircle,
  Calculator,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { MathView } from '../../components/MathView';

type PresetType = 'independent' | 'positive_corr' | 'telecom_channel' | 'negative_corr';

export const JointProbabilityView: React.FC = () => {
  const [preset, setPreset] = useState<PresetType>('independent');

  // Matrix values 3x3: Rows correspond to X in {0, 1, 2}, Cols to Y in {0, 1, 2}
  const [matrix, setMatrix] = useState<number[][]>([
    [0.10, 0.15, 0.05],
    [0.15, 0.25, 0.10],
    [0.05, 0.10, 0.05],
  ]);

  // Selected cell / condition for interactive inspection
  const [selectedX, setSelectedX] = useState<number>(1);
  const [selectedY, setSelectedY] = useState<number>(1);
  const [conditionDirection, setConditionDirection] = useState<'X_given_Y' | 'Y_given_X'>('X_given_Y');

  // Presets definition
  const loadPreset = (type: PresetType) => {
    setPreset(type);
    if (type === 'independent') {
      // P(X) = [0.3, 0.5, 0.2], P(Y) = [0.25, 0.5, 0.25] => P(X, Y) = P(X)*P(Y)
      setMatrix([
        [0.075, 0.150, 0.075],
        [0.125, 0.250, 0.125],
        [0.050, 0.100, 0.050],
      ]);
    } else if (type === 'positive_corr') {
      // Strong diagonal concentration
      setMatrix([
        [0.26, 0.04, 0.01],
        [0.05, 0.32, 0.06],
        [0.01, 0.05, 0.20],
      ]);
    } else if (type === 'negative_corr') {
      // Anti-diagonal concentration
      setMatrix([
        [0.02, 0.06, 0.24],
        [0.05, 0.30, 0.05],
        [0.22, 0.04, 0.02],
      ]);
    } else if (type === 'telecom_channel') {
      // Binary Symmetric Channel with noise / 3-state symbol detection
      setMatrix([
        [0.32, 0.02, 0.01],
        [0.03, 0.28, 0.03],
        [0.01, 0.02, 0.28],
      ]);
    }
  };

  // Marginals of X (row sums)
  const marginalX = useMemo(() => {
    return matrix.map((row) => row.reduce((sum, val) => sum + val, 0));
  }, [matrix]);

  // Marginals of Y (col sums)
  const marginalY = useMemo(() => {
    const sums = [0, 0, 0];
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        sums[c] += matrix[r][c];
      }
    }
    return sums;
  }, [matrix]);

  // Total sum of all joint probabilities
  const totalSum = useMemo(() => {
    return marginalX.reduce((a, b) => a + b, 0);
  }, [marginalX]);

  // Expected values & Covariance
  const stats = useMemo(() => {
    const xVals = [0, 1, 2];
    const yVals = [0, 1, 2];

    let ex = 0;
    for (let i = 0; i < 3; i++) ex += xVals[i] * marginalX[i];

    let ey = 0;
    for (let j = 0; j < 3; j++) ey += yVals[j] * marginalY[j];

    let exy = 0;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        exy += xVals[r] * yVals[c] * matrix[r][c];
      }
    }

    const cov = exy - ex * ey;

    let varX = 0;
    for (let i = 0; i < 3; i++) varX += Math.pow(xVals[i] - ex, 2) * marginalX[i];

    let varY = 0;
    for (let j = 0; j < 3; j++) varY += Math.pow(yVals[j] - ey, 2) * marginalY[j];

    const stdX = Math.sqrt(Math.max(1e-6, varX));
    const stdY = Math.sqrt(Math.max(1e-6, varY));
    const rho = cov / (stdX * stdY);

    // Independence test: max absolute discrepancy |P(X,Y) - P(X)P(Y)|
    let maxDiff = 0;
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const expectedIndep = marginalX[r] * marginalY[c];
        maxDiff = Math.max(maxDiff, Math.abs(matrix[r][c] - expectedIndep));
      }
    }

    const isIndependent = maxDiff < 0.005;

    return {
      ex,
      ey,
      cov,
      rho,
      isIndependent,
      maxDiff,
    };
  }, [matrix, marginalX, marginalY]);

  // Handle cell value adjustment with re-normalization
  const handleCellChange = (r: number, c: number, newVal: number) => {
    const clamped = Math.max(0, Math.min(1, newVal));
    const newM = matrix.map((row) => [...row]);
    newM[r][c] = clamped;

    // Normalize so total sum stays 1.0
    const sum = newM.reduce((acc, row) => acc + row.reduce((s, v) => s + v, 0), 0);
    if (sum > 0) {
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          newM[i][j] = Math.round((newM[i][j] / sum) * 1000) / 1000;
        }
      }
    }
    setMatrix(newM);
  };

  // Conditional Probability Calculation
  const jointVal = matrix[selectedX][selectedY];
  const denom = conditionDirection === 'X_given_Y' ? marginalY[selectedY] : marginalX[selectedX];
  const condProb = denom > 1e-6 ? jointVal / denom : 0;

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#1A1917]">
          Joint, Marginal & Conditional Probability
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-[#585651] max-w-3xl leading-relaxed">
          Explore the relationship between two random variables X and Y using a 2D joint distribution matrix.
          Analyze independence, calculate marginal distributions, and inspect Bayes-conditioned probabilities.
        </p>
      </div>

      {/* 2. Top 4 Formula Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Marginal of X */}
        <div className="bg-white rounded-xl border border-[#E6E4DD] p-4 shadow-2xs">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#75736E]">
            Marginal of X
          </div>
          <div className="p-2 bg-[#FAF9F6] rounded border border-[#E6E4DD] text-xs font-semibold text-[#1A1917] mt-2 overflow-x-auto">
            <MathView math="P(X = x) = \sum_{y} P(X=x, Y=y)" displayMode={true} />
          </div>
          <div className="text-[11px] text-[#75736E] mt-2">Sum across column values for each row</div>
        </div>

        {/* Card 2: Marginal of Y */}
        <div className="bg-white rounded-xl border border-[#E6E4DD] p-4 shadow-2xs">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#75736E]">
            Marginal of Y
          </div>
          <div className="p-2 bg-[#FAF9F6] rounded border border-[#E6E4DD] text-xs font-semibold text-[#1A1917] mt-2 overflow-x-auto">
            <MathView math="P(Y = y) = \sum_{x} P(X=x, Y=y)" displayMode={true} />
          </div>
          <div className="text-[11px] text-[#75736E] mt-2">Sum across row values for each column</div>
        </div>

        {/* Card 3: Conditional P(X|Y) */}
        <div className="bg-white rounded-xl border border-[#E6E4DD] p-4 shadow-2xs">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#75736E]">
            Conditional P(X | Y)
          </div>
          <div className="p-2 bg-[#FAF9F6] rounded border border-[#E6E4DD] text-xs font-semibold text-[#1A1917] mt-2 overflow-x-auto">
            <MathView math="P(X=x \mid Y=y) = \frac{P(X=x, Y=y)}{P(Y=y)}" displayMode={true} />
          </div>
          <div className="text-[11px] text-[#75736E] mt-2">Ratio of joint to marginal probability</div>
        </div>

        {/* Card 4: Independence Test */}
        <div className="bg-white rounded-xl border border-[#E6E4DD] p-4 shadow-2xs">
          <div className="text-[11px] font-mono uppercase tracking-wider text-[#75736E] flex items-center justify-between">
            <span>Independence Test</span>
            {stats.isIndependent ? (
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Independent
              </span>
            ) : (
              <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-mono font-bold flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Correlated
              </span>
            )}
          </div>
          <div className="p-2 bg-[#FAF9F6] rounded border border-[#E6E4DD] text-xs font-mono font-semibold text-[#1A1917] mt-2 flex justify-between">
            <span>Cov(X, Y): {stats.cov >= 0 ? `+${stats.cov.toFixed(3)}` : stats.cov.toFixed(3)}</span>
            <span className="text-[#C85A32]">ρ = {stats.rho >= 0 ? `+${stats.rho.toFixed(2)}` : stats.rho.toFixed(2)}</span>
          </div>
          <div className="text-[11px] text-[#75736E] mt-2">
            {stats.isIndependent
              ? 'P(X, Y) = P(X)P(Y) holds across all cells'
              : 'Variables are statistically dependent'}
          </div>
        </div>
      </div>

      {/* 3. Main Stage: 2D Matrix Table + Interactive Conditional Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 Cols): 2D Joint Distribution Matrix */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-[#E6E4DD] p-5 shadow-2xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E6E4DD]">
            <div>
              <h3 className="text-sm font-bold text-[#1A1917]">
                2D Joint Probability Matrix: P(X = x, Y = y)
              </h3>
              <p className="text-[11px] text-[#75736E] mt-0.5">
                Click any cell to inspect its conditional probability. Values are color-mapped by density.
              </p>
            </div>

            {/* Presets */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono text-[#75736E]">Preset:</span>
              <select
                value={preset}
                onChange={(e) => loadPreset(e.target.value as PresetType)}
                className="bg-[#FAF9F6] border border-[#E6E4DD] text-xs rounded-md px-2 py-1 text-[#1A1917] focus:outline-none focus:border-[#C85A32] cursor-pointer"
              >
                <option value="independent">Independent Variables</option>
                <option value="positive_corr">Positively Correlated</option>
                <option value="negative_corr">Negatively Correlated</option>
                <option value="telecom_channel">Communication Channel (3-State)</option>
              </select>
            </div>
          </div>

          {/* Matrix Grid */}
          <div className="overflow-x-auto pb-2">
            <table className="w-full text-center border-collapse">
              <thead>
                <tr>
                  <th className="p-2.5 text-xs font-mono text-[#75736E] bg-[#FAF9F6] border border-[#E6E4DD]">
                    X \ Y
                  </th>
                  <th className="p-2.5 text-xs font-mono font-bold text-[#1A1917] bg-[#FAF9F6] border border-[#E6E4DD]">
                    Y = 0
                  </th>
                  <th className="p-2.5 text-xs font-mono font-bold text-[#1A1917] bg-[#FAF9F6] border border-[#E6E4DD]">
                    Y = 1
                  </th>
                  <th className="p-2.5 text-xs font-mono font-bold text-[#1A1917] bg-[#FAF9F6] border border-[#E6E4DD]">
                    Y = 2
                  </th>
                  <th className="p-2.5 text-xs font-mono font-bold text-[#C85A32] bg-[#FBF4F0] border border-[#E6E4DD]">
                    Marginal P(X)
                  </th>
                </tr>
              </thead>
              <tbody>
                {[0, 1, 2].map((r) => (
                  <tr key={r}>
                    <th className="p-2.5 text-xs font-mono font-bold text-[#1A1917] bg-[#FAF9F6] border border-[#E6E4DD]">
                      X = {r}
                    </th>
                    {[0, 1, 2].map((c) => {
                      const val = matrix[r][c];
                      const isSelected = selectedX === r && selectedY === c;
                      const intensity = Math.min(1, val * 2.8);

                      return (
                        <td
                          key={c}
                          onClick={() => {
                            setSelectedX(r);
                            setSelectedY(c);
                          }}
                          className={`p-3 text-xs font-mono font-bold transition-all cursor-pointer border relative ${
                            isSelected
                              ? 'border-[#C85A32] ring-2 ring-[#C85A32]/40 z-10'
                              : 'border-[#E6E4DD] hover:border-[#C85A32]/50'
                          }`}
                          style={{
                            backgroundColor: isSelected
                              ? '#FBF4F0'
                              : `rgba(200, 90, 50, ${intensity * 0.28 + 0.02})`,
                          }}
                        >
                          <span
                            className={
                              isSelected ? 'text-[#C85A32] font-extrabold text-sm' : 'text-[#1A1917]'
                            }
                          >
                            {val.toFixed(3)}
                          </span>
                        </td>
                      );
                    })}

                    {/* Marginal of X for row r */}
                    <td className="p-2.5 text-xs font-mono font-bold text-[#C85A32] bg-[#FBF4F0] border border-[#E6E4DD]">
                      {marginalX[r].toFixed(3)}
                    </td>
                  </tr>
                ))}

                {/* Marginal of Y row */}
                <tr>
                  <th className="p-2.5 text-xs font-mono font-bold text-[#C85A32] bg-[#FBF4F0] border border-[#E6E4DD]">
                    Marginal P(Y)
                  </th>
                  {[0, 1, 2].map((c) => (
                    <td
                      key={c}
                      className="p-2.5 text-xs font-mono font-bold text-[#C85A32] bg-[#FBF4F0] border border-[#E6E4DD]"
                    >
                      {marginalY[c].toFixed(3)}
                    </td>
                  ))}
                  <td className="p-2.5 text-xs font-mono font-extrabold text-white bg-[#1A1917] border border-[#1A1917]">
                    Σ = {totalSum.toFixed(3)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Quick instructions & Color Scale */}
          <div className="flex flex-wrap items-center justify-between text-xs text-[#75736E] pt-2 border-t border-[#E6E4DD]">
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span>Cell Heatmap Density:</span>
              <div className="flex items-center gap-1">
                <span className="w-4 h-3 rounded-2xs bg-[#FAF9F6] border border-[#E6E4DD]" />
                <span>Low</span>
                <span className="w-4 h-3 rounded-2xs bg-[#C85A32]/30 border border-[#C85A32]/50" />
                <span>High</span>
              </div>
            </div>
            <div className="font-mono text-[11px]">
              Selected: <strong className="text-[#C85A32]">X = {selectedX}, Y = {selectedY}</strong>
            </div>
          </div>
        </div>

        {/* Right Column (5 Cols): Interactive Conditional Calculation & Moments */}
        <div className="lg:col-span-5 space-y-5">
          {/* Conditional Query Breakdown Card */}
          <div className="bg-white rounded-xl border border-[#E6E4DD] p-5 shadow-2xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E4DD]">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 text-[#C85A32]" />
                <h3 className="text-sm font-bold text-[#1A1917]">Conditional Probability</h3>
              </div>
              <div className="flex rounded-md border border-[#E6E4DD] p-0.5 bg-[#FAF9F6] text-xs">
                <button
                  type="button"
                  onClick={() => setConditionDirection('X_given_Y')}
                  className={`px-2 py-0.5 rounded font-mono font-semibold transition-colors cursor-pointer ${
                    conditionDirection === 'X_given_Y'
                      ? 'bg-[#1A1917] text-white shadow-xs'
                      : 'text-[#585651] hover:text-[#1A1917]'
                  }`}
                >
                  P(X | Y)
                </button>
                <button
                  type="button"
                  onClick={() => setConditionDirection('Y_given_X')}
                  className={`px-2 py-0.5 rounded font-mono font-semibold transition-colors cursor-pointer ${
                    conditionDirection === 'Y_given_X'
                      ? 'bg-[#1A1917] text-white shadow-xs'
                      : 'text-[#585651] hover:text-[#1A1917]'
                  }`}
                >
                  P(Y | X)
                </button>
              </div>
            </div>

            {/* Step-by-Step Bayes Formula & Substitution */}
            <div className="p-3.5 bg-[#FAF9F6] rounded-xl border border-[#E6E4DD] space-y-2">
              <span className="text-[10px] font-mono text-[#75736E] uppercase block">
                Definition & Fraction Form:
              </span>
              <div className="text-xs font-semibold text-[#1A1917] font-mono overflow-x-auto py-1">
                {conditionDirection === 'X_given_Y' ? (
                  <MathView
                    math={`P(X = ${selectedX} \\mid Y = ${selectedY}) = \\frac{P(X = ${selectedX}, Y = ${selectedY})}{P(Y = ${selectedY})}`}
                    displayMode={true}
                  />
                ) : (
                  <MathView
                    math={`P(Y = ${selectedY} \\mid X = ${selectedX}) = \\frac{P(X = ${selectedX}, Y = ${selectedY})}{P(X = ${selectedX})}`}
                    displayMode={true}
                  />
                )}
              </div>

              <div className="pt-2 border-t border-[#E6E4DD] text-xs font-mono flex items-center justify-between">
                <span className="text-[#75736E]">Numerical values:</span>
                <span className="text-[#1A1917] font-bold">
                  {jointVal.toFixed(3)} / {denom.toFixed(3)}
                </span>
              </div>
            </div>

            {/* Prominent Conditional Result */}
            <div className="p-4 bg-[#FBF4F0] rounded-xl border border-[#C85A32]/30 flex items-center justify-between">
              <div>
                <span className="text-xs text-[#75736E] font-medium block">Resulting Probability:</span>
                <span className="text-xs font-mono font-bold text-[#1A1917]">
                  {conditionDirection === 'X_given_Y'
                    ? `P(X = ${selectedX} | Y = ${selectedY})`
                    : `P(Y = ${selectedY} | X = ${selectedX})`}
                </span>
              </div>
              <div className="text-right">
                <span className="text-2xl font-mono font-bold text-[#C85A32]">
                  {condProb.toFixed(4)}
                </span>
                <span className="text-[11px] font-mono text-[#75736E] block">
                  ({(condProb * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
          </div>

          {/* Statistical Properties & Moments Summary */}
          <div className="bg-white rounded-xl border border-[#E6E4DD] p-5 shadow-2xs space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#75736E]">
              Bivariate Moments & Summary
            </h4>

            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-[#FAF9F6] border border-[#E6E4DD]">
                <div className="text-[10px] font-mono text-[#8A8882]">Mean E[X]</div>
                <div className="font-mono font-bold text-[#1A1917] text-sm mt-0.5">
                  {stats.ex.toFixed(3)}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#FAF9F6] border border-[#E6E4DD]">
                <div className="text-[10px] font-mono text-[#8A8882]">Mean E[Y]</div>
                <div className="font-mono font-bold text-[#1A1917] text-sm mt-0.5">
                  {stats.ey.toFixed(3)}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#FAF9F6] border border-[#E6E4DD]">
                <div className="text-[10px] font-mono text-[#8A8882]">Covariance Cov(X,Y)</div>
                <div className="font-mono font-bold text-[#1A1917] text-sm mt-0.5">
                  {stats.cov.toFixed(4)}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#FAF9F6] border border-[#E6E4DD]">
                <div className="text-[10px] font-mono text-[#8A8882]">Correlation (ρ)</div>
                <div className="font-mono font-bold text-[#C85A32] text-sm mt-0.5">
                  {stats.rho.toFixed(3)}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
