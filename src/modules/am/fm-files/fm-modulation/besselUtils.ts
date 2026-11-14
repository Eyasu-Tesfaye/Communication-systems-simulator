/**
 * Bessel Function & Carson's Rule Spectral Calculations for Frequency Modulation
 *
 * Implements:
 * 1. Bessel functions of the first kind J_n(β)
 * 2. Two-sided spectrum: S(f) = (A_c / 2) * ∑ J_n(β) [δ(f - f_c - n*f_m) + δ(f + f_c + n*f_m)]
 * 3. Carrier amplitude variation with β according to J_0(β) & Carrier Nulls
 * 4. Carson's Rule: B_T ≈ 2*Δf + 2*f_m = 2*Δf * (1 + 1/β)
 * 5. Generalized Carson's Rule: B_T ≈ 2*(Δf + W) for arbitrary message bandwidth W
 * 6. Power containment calculation inside Carson's bandwidth
 */

/**
 * Calculates Bessel function of the first kind J_n(x) using numerical quadrature
 * J_n(x) = (1/π) * ∫_0^π cos(n*θ - x*sin(θ)) dθ
 */
export function besselJ(n: number, x: number): number {
  // Property: J_{-n}(x) = (-1)^n * J_n(x)
  if (n < 0) {
    const sign = Math.abs(n) % 2 === 0 ? 1 : -1;
    return sign * besselJ(-n, x);
  }

  // Small x edge case
  if (Math.abs(x) < 1e-6) {
    return n === 0 ? 1 : 0;
  }

  // Numerical quadrature using Simpson's rule with 120 steps for high precision
  const steps = 120;
  const dTheta = Math.PI / steps;
  let sum = 0;

  for (let i = 0; i <= steps; i++) {
    const theta = i * dTheta;
    const f = Math.cos(n * theta - x * Math.sin(theta));
    const weight = i === 0 || i === steps ? 1 : i % 2 === 0 ? 2 : 4;
    sum += f * weight;
  }

  return (sum * dTheta) / (3 * Math.PI);
}

export interface SpectralLine {
  freq: number;          // Frequency in Hz (positive or negative)
  amplitude: number;     // Linear magnitude: (Ac / 2) * |Jn(β)|
  powerRatio: number;    // Jn^2(β)
  harmonicOrder: number; // n (0 for carrier, ±1, ±2...)
  offsetOrder: number;   // Signed offset k relative to ±fc: freq = ±fc + k*fm
  label: string;         // e.g. "+fc", "+fc+1fm", "-fc", "-fc-1fm"
  side: 'positive' | 'negative';
  isInsideCarson: boolean;
}

export interface CarsonBandwidthResult {
  deltaF: number;              // Peak frequency deviation Δf = kf * Am (Hz)
  fm: number;                  // Single-tone message frequency (Hz)
  beta: number;                // Modulation index β = Δf / fm
  messageBandwidthW: number;   // Message bandwidth W (Hz)
  carsonBT: number;            // Single-tone Carson BT = 2*Δf + 2*fm = 2*Δf*(1 + 1/β)
  generalizedBT: number;       // Generalized Carson BT = 2*(Δf + W)
  powerContainmentPercent: number; // Percentage of total power within Carson bandwidth
  activeSidebandCount: number; // Number of significant sideband pairs (|Jn| > 0.01)
}

export interface CarrierNullInfo {
  index: number;
  beta: number;
  label: string;
}

export const CARRIER_NULLS: CarrierNullInfo[] = [
  { index: 1, beta: 2.4048, label: '1st Carrier Null (β = 2.40)' },
  { index: 2, beta: 5.5201, label: '2nd Carrier Null (β = 5.52)' },
  { index: 3, beta: 8.6537, label: '3rd Carrier Null (β = 8.65)' },
];

/**
 * Computes discrete spectral lines for the Two-Sided FM Spectrum:
 * S(f) = (Ac / 2) * ∑ Jn(β) * [δ(f - fc - n*fm) + δ(f + fc + n*fm)]
 */
export function computeTwoSidedFmSpectrum(
  Ac: number,
  fc: number,
  fm: number,
  beta: number,
  messageBandwidthW: number = fm,
  maxHarmonics: number = 10,
  includeNegativeFrequencies: boolean = true
): {
  lines: SpectralLine[];
  carsonInfo: CarsonBandwidthResult;
  carrierAmp: number;
  carrierPowerRatio: number;
} {
  const lines: SpectralLine[] = [];
  const deltaF = beta * fm;
  const carsonBT = 2 * (deltaF + fm);
  const generalizedBT = 2 * (deltaF + messageBandwidthW);

  // Maximum harmonic order inside Carson's bandwidth: |n| <= β + 1
  const nCarsonMax = Math.ceil(beta + 1);

  let carsonPowerSum = 0;
  let totalPowerSum = 0;
  let activeSidebands = 0;

  for (let n = -maxHarmonics; n <= maxHarmonics; n++) {
    const jn = besselJ(n, beta);
    const amp = (Ac / 2) * Math.abs(jn);
    const power = jn * jn;
    totalPowerSum += power;

    const isInside = Math.abs(n) <= nCarsonMax;
    if (isInside) {
      carsonPowerSum += power;
    }

    if (Math.abs(jn) >= 0.01 && n !== 0) {
      activeSidebands++;
    }

    // Only include lines with noticeable magnitude
    if (amp > 1e-4 || Math.abs(n) <= 2) {
      // 1. Positive Frequency cluster (+fc + n*fm), kept strictly in f >= 0
      const posFreq = fc + n * fm;
      if (posFreq >= 0) {
        let posLabel = `+f_c`;
        if (n > 0) posLabel = `+f_c+${n}f_m`;
        else if (n < 0) posLabel = `+f_c-${Math.abs(n)}f_m`;

        lines.push({
          freq: Number(posFreq.toFixed(2)),
          amplitude: Number(amp.toFixed(4)),
          powerRatio: Number(power.toFixed(4)),
          harmonicOrder: n,
          offsetOrder: n,
          label: posLabel,
          side: 'positive',
          isInsideCarson: isInside,
        });
      }

      // 2. Negative Frequency cluster (-fc - n*fm = -fc + offsetOrder*fm), kept strictly in f < 0
      if (includeNegativeFrequencies) {
        const negFreq = -(fc + n * fm);
        if (negFreq < 0) {
          const offsetOrder = -n;
          let negLabel = `-f_c`;
          if (offsetOrder > 0) negLabel = `-f_c+${offsetOrder}f_m`;
          else if (offsetOrder < 0) negLabel = `-f_c-${Math.abs(offsetOrder)}f_m`;

          lines.push({
            freq: Number(negFreq.toFixed(2)),
            amplitude: Number(amp.toFixed(4)),
            powerRatio: Number(power.toFixed(4)),
            harmonicOrder: n,
            offsetOrder,
            label: negLabel,
            side: 'negative',
            isInsideCarson: isInside,
          });
        }
      }
    }
  }

  // Sort spectral lines by frequency
  lines.sort((a, b) => a.freq - b.freq);

  // Carrier component amplitude: (Ac / 2) * |J0(β)|
  const j0 = besselJ(0, beta);
  const carrierAmp = (Ac / 2) * Math.abs(j0);
  const carrierPowerRatio = j0 * j0;

  const powerContainmentPercent =
    totalPowerSum > 0 ? Math.min(100, (carsonPowerSum / totalPowerSum) * 100) : 98.0;

  const carsonInfo: CarsonBandwidthResult = {
    deltaF,
    fm,
    beta,
    messageBandwidthW,
    carsonBT,
    generalizedBT,
    powerContainmentPercent: Number(powerContainmentPercent.toFixed(1)),
    activeSidebandCount: Math.floor(activeSidebands / 2),
  };

  return {
    lines,
    carsonInfo,
    carrierAmp,
    carrierPowerRatio,
  };
}

/**
 * Generates continuous curves for J_0(β), J_1(β), J_2(β), J_3(β) vs β
 * to display how carrier and sideband amplitudes vary with modulation index
 */
export function generateBesselCurves(
  maxBeta: number = 10.0,
  numPoints: number = 150
): {
  betaValues: number[];
  j0Points: { x: number; y: number }[];
  j1Points: { x: number; y: number }[];
  j2Points: { x: number; y: number }[];
  j3Points: { x: number; y: number }[];
} {
  const betaValues: number[] = [];
  const j0Points: { x: number; y: number }[] = [];
  const j1Points: { x: number; y: number }[] = [];
  const j2Points: { x: number; y: number }[] = [];
  const j3Points: { x: number; y: number }[] = [];

  const dBeta = maxBeta / (numPoints - 1);

  for (let i = 0; i < numPoints; i++) {
    const b = i * dBeta;
    betaValues.push(b);
    j0Points.push({ x: Number(b.toFixed(2)), y: Number(besselJ(0, b).toFixed(4)) });
    j1Points.push({ x: Number(b.toFixed(2)), y: Number(besselJ(1, b).toFixed(4)) });
    j2Points.push({ x: Number(b.toFixed(2)), y: Number(besselJ(2, b).toFixed(4)) });
    j3Points.push({ x: Number(b.toFixed(2)), y: Number(besselJ(3, b).toFixed(4)) });
  }

  return { betaValues, j0Points, j1Points, j2Points, j3Points };
}

/**
 * Generates the Carson Bandwidth footprint curve vs beta
 * showing the linear widening of the spectral footprint
 */
export function generateBandwidthExpansionCurve(
  deltaF: number,
  maxBeta: number = 10.0,
  numPoints: number = 80
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  const dBeta = maxBeta / (numPoints - 1);

  for (let i = 0; i < numPoints; i++) {
    const b = Math.max(0.1, i * dBeta);
    // BT = 2 * deltaF * (1 + 1/b)
    const bt = 2 * deltaF * (1 + 1 / b);
    points.push({ x: Number(b.toFixed(2)), y: Number(bt.toFixed(2)) });
  }

  return points;
}
