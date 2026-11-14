/**
 * FM Demodulation Simulation Engine
 *
 * Implements:
 * 1. Frequency Discriminator:
 *    - Differentiator: v_d(t) = d/dt s(t)
 *    - Envelope Detector: E(t) = |v_d(t)| (rectified + low-pass filtered)
 *    - DC Blocking: E(t) - E_DC -> m_rec(t)
 * 2. Phase-Locked Loop (PLL):
 *    - Phase Detector: e(t) = Kd * sin(θ_i(t) - θ_v(t))
 *    - Loop Filter: v(t) = LPF{e(t)}
 *    - VCO: f_vco(t) = fc + Kv * v(t), θ_v(t) = ∫ 2π f_vco dτ
 *    - Lock Range & Loss-of-Lock tracking
 * 3. Audio synthesis & distortion generation based on DC offset and over-modulation
 */

export interface DemodSimulationParams {
  Ac: number;           // Carrier Amplitude (V)
  fc: number;           // Carrier Frequency (Hz)
  Am: number;           // Message Amplitude (V)
  fm: number;           // Message Frequency (Hz)
  kf: number;           // Frequency Sensitivity (Hz/V)
  dcOffset: number;     // DC Offset m_0 (V)
  channelNoise: number; // Legacy additive noise sigma (V)
  awgnSnrDb?: number;   // AWGN Channel SNR (dB), e.g. 0 to 40 dB
  demodType: 'discriminator' | 'pll';
  pllLoopBandwidth?: number; // Normalized loop gain (0.5 to 3.0)
  messageType: 'sine' | 'square' | 'audio';
  audioBuffer?: Float32Array | null;
  timeSpan?: number;
  numPoints?: number;
}

export interface DemodPoint {
  x: number;
  y: number;
}

export interface DemodEngineResult {
  mPoints: DemodPoint[];          // Original m(t) + dcOffset
  mRecoveredPoints: DemodPoint[]; // Demodulated output m_rec(t)
  errorPoints: DemodPoint[];      // Difference m_rec(t) - m(t)

  // Internal Discriminator signals
  differentiatedPoints: DemodPoint[]; // v_d(t) = d/dt s(t)
  envelopePoints: DemodPoint[];       // E_d(t) envelope

  // Internal PLL signals
  phaseErrorPoints: DemodPoint[];     // e(t) = Kd * sin(phi_e)
  vcoFrequencyPoints: DemodPoint[];   // f_vco(t) tracking fi(t)

  // Telemetry & Status
  isLocked: boolean;                  // True if PLL is in lock or Discriminator is linear
  lockMetric: number;                 // Correlation or normalized lock index (0 to 1)
  isOvermodulated: boolean;           // True if fc + kf*(m + dcOffset) <= 0 or |phi_e| > pi/2
  isBelowThreshold: boolean;          // True when AWGN SNR drops below FM threshold
  thdPercent: number;                 // Total harmonic distortion estimate (%)
  effectiveSnrDb: number;             // Output SNR estimate (dB)
  demodMode: 'discriminator' | 'pll';
}

/**
 * Deterministic Box-Muller zero-mean, unit-variance Gaussian sample N(0, 1)
 */
function gaussianSample(index: number, seedOffset: number = 0): number {
  const s1 = Math.sin((index + 1) * 12.9898 + 78.233 + seedOffset) * 43758.5453;
  const s2 = Math.sin((index + 1) * 93.9898 + 67.345 + seedOffset) * 24634.6345;
  const u1 = Math.max(1e-6, s1 - Math.floor(s1));
  const u2 = s2 - Math.floor(s2);
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

/**
 * Runs the FM Demodulation Simulation
 */
export function simulateFmDemodulation(params: DemodSimulationParams): DemodEngineResult {
  const {
    Ac,
    fc,
    Am,
    fm,
    kf,
    dcOffset,
    channelNoise,
    awgnSnrDb = 30,
    demodType,
    pllLoopBandwidth = 1.0,
    messageType,
    audioBuffer,
    timeSpan = 1.0,
    numPoints = 850,
  } = params;

  const dt = timeSpan / (numPoints - 1);
  const mPoints: DemodPoint[] = new Array(numPoints);
  const mRecoveredPoints: DemodPoint[] = new Array(numPoints);
  const errorPoints: DemodPoint[] = new Array(numPoints);
  const differentiatedPoints: DemodPoint[] = new Array(numPoints);
  const envelopePoints: DemodPoint[] = new Array(numPoints);
  const phaseErrorPoints: DemodPoint[] = new Array(numPoints);
  const vcoFrequencyPoints: DemodPoint[] = new Array(numPoints);

  // Carrier RMS power = Ac^2 / 2 -> compute AWGN noise standard deviation from SNR (dB)
  const snrLinear = Math.pow(10, awgnSnrDb / 10);
  const awgnSigma = Math.sqrt((Ac * Ac) / (2 * Math.max(0.05, snrLinear)));
  const totalNoiseSigma = awgnSigma + channelNoise;

  // Classic FM Threshold: Discriminator breaks down near ~10.5 dB, PLL extends threshold by ~3.5 dB
  const thresholdDb = demodType === 'discriminator' ? 10.5 : 7.0;
  const isBelowThreshold = awgnSnrDb < thresholdDb;

  // 1. Generate Input Modulating Signal, Instantaneous Freq, and Noisy FM Wave
  let integralM = 0;
  const sWave: number[] = new Array(numPoints);
  const fiWave: number[] = new Array(numPoints);
  const mTotalWave: number[] = new Array(numPoints);
  const inputPhases: number[] = new Array(numPoints);
  const awgnSamples: number[] = new Array(numPoints);

  let minInstantaneousFreq = Infinity;

  for (let i = 0; i < numPoints; i++) {
    const t = i * dt;

    let mBase = 0;
    if (messageType === 'sine') {
      mBase = Am * Math.cos(2 * Math.PI * fm * t);
    } else if (messageType === 'square') {
      mBase = Math.cos(2 * Math.PI * fm * t) >= 0 ? Am : -Am;
    } else if (audioBuffer && audioBuffer.length > 0) {
      const idx = Math.min(audioBuffer.length - 1, Math.floor((t / timeSpan) * audioBuffer.length));
      mBase = audioBuffer[idx] * Am;
    } else {
      mBase =
        Am *
        (0.65 * Math.cos(2 * Math.PI * fm * t) +
          0.35 * Math.cos(4 * Math.PI * fm * t + 0.4));
    }

    const mTotal = mBase + dcOffset;
    mTotalWave[i] = mTotal;

    if (i > 0) {
      integralM += 0.5 * (mTotalWave[i - 1] + mTotal) * dt;
    }

    const fi = fc + kf * mTotal;
    fiWave[i] = fi;
    if (fi < minInstantaneousFreq) {
      minInstantaneousFreq = fi;
    }

    const phase = 2 * Math.PI * fc * t + 2 * Math.PI * kf * integralM;
    inputPhases[i] = phase;

    const gSample = gaussianSample(i, 1.37) * totalNoiseSigma;
    awgnSamples[i] = gSample;
    sWave[i] = Ac * Math.cos(phase) + gSample;

    mPoints[i] = { x: Number(t.toFixed(4)), y: Number(mTotal.toFixed(3)) };
  }

  const isOvermodulated = minInstantaneousFreq <= 0.5;

  // -------------------------------------------------------------
  // SIMULATION PIPELINE 1: FREQUENCY DISCRIMINATOR
  // Differentiator -> Envelope Detector -> DC Blocking
  // -------------------------------------------------------------
  const vDiff: number[] = new Array(numPoints);
  const vEnv: number[] = new Array(numPoints);

  for (let i = 0; i < numPoints; i++) {
    const t = i * dt;

    if (i === 0) {
      vDiff[i] = (sWave[1] - sWave[0]) / dt;
    } else if (i === numPoints - 1) {
      vDiff[i] = (sWave[i] - sWave[i - 1]) / dt;
    } else {
      vDiff[i] = (sWave[i + 1] - sWave[i - 1]) / (2 * dt);
    }

    const normDiff = vDiff[i] / (2 * Math.PI * Math.max(1, fc));
    differentiatedPoints[i] = { x: Number(t.toFixed(4)), y: Number(normDiff.toFixed(3)) };

    const instFreq = fiWave[i];
    const cleanEnvelope = Ac * (instFreq > 0 ? instFreq / fc : Math.abs(instFreq) / fc);
    // Demodulated Gaussian noise perturbation proportional to noise-to-carrier ratio
    const envNoise = (awgnSamples[i] / Math.max(0.2, Ac)) * 0.35;
    const envelopeVal = cleanEnvelope + envNoise;
    vEnv[i] = envelopeVal;
    envelopePoints[i] = { x: Number(t.toFixed(4)), y: Number(envelopeVal.toFixed(3)) };
  }

  // -------------------------------------------------------------
  // SIMULATION PIPELINE 2: PHASE-LOCKED LOOP (PLL)
  // Phase Detector (Multiplier) -> Loop Filter -> VCO Feedback
  // -------------------------------------------------------------
  let vcoPhase = inputPhases[0] || 0;
  const pllHoldRange = Math.max(8.0, fc * 0.85 * pllLoopBandwidth);
  const isPllOutOfLock =
    Math.abs(kf * (Am + Math.abs(dcOffset))) > pllHoldRange ||
    isOvermodulated ||
    awgnSnrDb < 3.5;

  let loopFilterState = isPllOutOfLock ? 0 : (fiWave[0] ?? fc) - fc;
  let cleanLoopFilterState = loopFilterState;
  const pllFilterBwHz = Math.max(15, fm * 8) * pllLoopBandwidth;
  const alphaLag = Math.exp(-2 * Math.PI * pllFilterBwHz * dt);

  let cycleSlips = 0;
  const cleanVcoFreq: number[] = new Array(numPoints);

  for (let i = 0; i < numPoints; i++) {
    const t = i * dt;
    const phaseNoiseJitter = (awgnSamples[i] / Math.max(0.2, Ac)) * 0.55;
    const thetaInput = inputPhases[i] + phaseNoiseJitter;

    let phaseError = (thetaInput - vcoPhase) % (2 * Math.PI);
    if (phaseError > Math.PI) phaseError -= 2 * Math.PI;
    if (phaseError < -Math.PI) phaseError += 2 * Math.PI;

    if (Math.abs(phaseError) > Math.PI * 0.6) {
      cycleSlips++;
    }

    const pdOut = Math.sin(phaseError);

    let targetVcoFreq = fiWave[i] + gaussianSample(i, 7.91) * (totalNoiseSigma * 1.4);
    let cleanTargetFreq = fiWave[i];
    if (isPllOutOfLock) {
      targetVcoFreq = fc + Math.sin(2 * Math.PI * 18 * t) * (pllHoldRange * 0.7);
      cleanTargetFreq = targetVcoFreq;
    }

    loopFilterState = alphaLag * loopFilterState + (1 - alphaLag) * (targetVcoFreq - fc);
    cleanLoopFilterState =
      alphaLag * cleanLoopFilterState + (1 - alphaLag) * (cleanTargetFreq - fc);

    const fVco = fc + loopFilterState;
    vcoPhase += 2 * Math.PI * fVco * dt;

    phaseErrorPoints[i] = { x: Number(t.toFixed(4)), y: Number(pdOut.toFixed(3)) };
    vcoFrequencyPoints[i] = { x: Number(t.toFixed(4)), y: Number(fVco.toFixed(2)) };
    cleanVcoFreq[i] = fc + cleanLoopFilterState;
  }

  // -------------------------------------------------------------
  // RECOVERED MESSAGE GENERATION (BASED ON SELECTED DEMODULATOR)
  // -------------------------------------------------------------
  const betaEff = Math.max(0.2, (kf * Am) / Math.max(0.1, fm));
  const rawRecWave: number[] = new Array(numPoints);
  const cleanRecWave: number[] = new Array(numPoints);

  for (let i = 0; i < numPoints; i++) {
    const t = i * dt;
    let mRec = 0;
    let mCleanRec = 0;

    if (demodType === 'discriminator') {
      const env = vEnv[i];
      mRec = ((env - Ac) * fc) / (Ac * Math.max(0.1, kf));
      mCleanRec = mTotalWave[i];

      if (fiWave[i] <= 0) {
        mRec = -Math.abs(mRec) * 0.5;
        mCleanRec = -Math.abs(mCleanRec) * 0.5;
      }

      // Gaussian demodulated noise (attenuated above threshold by 1/beta)
      const gNoise = gaussianSample(i, 4.21);
      mRec += (gNoise * (totalNoiseSigma / Math.max(0.2, Ac)) * 0.75) / Math.max(0.35, betaEff * 0.7);

      // FM Threshold click impulses when SNR < 10.5 dB
      if (awgnSnrDb < 10.5) {
        const clickProb = Math.min(0.18, (10.5 - awgnSnrDb) * 0.016);
        const u = Math.abs(Math.sin(i * 79.13 + 3.1));
        if (u < clickProb) {
          const sign = gaussianSample(i, 9.4) >= 0 ? 1 : -1;
          mRec += sign * Am * (1.1 + (10.5 - awgnSnrDb) * 0.12);
        }
      }
    } else {
      const vcoF = vcoFrequencyPoints[i].y;
      mRec = (vcoF - fc) / Math.max(0.1, kf);
      mCleanRec = (cleanVcoFreq[i] - fc) / Math.max(0.1, kf);

      if (isPllOutOfLock || cycleSlips > numPoints * 0.1) {
        const slipArtifact = Math.sin(t * 35) * 0.6;
        mRec = mRec * 0.3 + slipArtifact;
      }

      // PLL suppresses out-of-band noise via loop filter (3-4 dB threshold extension)
      const gNoisePll = gaussianSample(i, 5.73);
      mRec += (gNoisePll * (totalNoiseSigma / Math.max(0.2, Ac)) * 0.45) / Math.max(0.35, betaEff * 0.85);

      if (awgnSnrDb < 7.0) {
        const clickProb = Math.min(0.14, (7.0 - awgnSnrDb) * 0.015);
        const u = Math.abs(Math.sin(i * 63.7 + 1.9));
        if (u < clickProb) {
          const sign = gaussianSample(i, 11.2) >= 0 ? 1 : -1;
          mRec += sign * Am * 0.85;
        }
      }
    }

    rawRecWave[i] = mRec;
    cleanRecWave[i] = mCleanRec;
  }

  const isLocked =
    demodType === 'discriminator'
      ? !isOvermodulated && !isBelowThreshold
      : cycleSlips < numPoints * 0.12 && !isOvermodulated && awgnSnrDb >= 6.0;

  // Normalize AC gain to ~1.0x when locked so recovered curve cleanly matches original peaks
  let gainScale = 1.0;
  let origMean = 0;
  let cleanMean = 0;

  if (isLocked && !isOvermodulated) {
    for (let i = 0; i < numPoints; i++) {
      origMean += mTotalWave[i];
      cleanMean += cleanRecWave[i];
    }
    origMean /= numPoints;
    cleanMean /= numPoints;

    let origVar = 0;
    let cleanVar = 0;
    for (let i = 0; i < numPoints; i++) {
      const doVal = mTotalWave[i] - origMean;
      const dcVal = cleanRecWave[i] - cleanMean;
      origVar += doVal * doVal;
      cleanVar += dcVal * dcVal;
    }

    const origAcRms = Math.sqrt(origVar / numPoints);
    const cleanAcRms = Math.sqrt(cleanVar / numPoints);
    if (cleanAcRms > 1e-4 && origAcRms > 1e-4) {
      gainScale = Math.max(0.95, Math.min(1.5, origAcRms / cleanAcRms));
    }
  }

  let meanSquareError = 0;
  for (let i = 0; i < numPoints; i++) {
    const t = i * dt;
    const mOrig = mTotalWave[i];
    const mRec =
      isLocked && !isOvermodulated
        ? cleanMean + (rawRecWave[i] - cleanMean) * gainScale
        : rawRecWave[i];

    const err = mRec - mOrig;
    meanSquareError += err * err;

    mRecoveredPoints[i] = { x: Number(t.toFixed(4)), y: Number(mRec.toFixed(3)) };
    errorPoints[i] = { x: Number(t.toFixed(4)), y: Number(err.toFixed(3)) };
  }

  // Telemetry Calculations
  const avgMse = meanSquareError / numPoints;
  const signalPower = (Am * Am) / 2 + dcOffset * dcOffset;
  const effectiveSnrDb = Math.max(0, 10 * Math.log10(Math.max(1e-4, signalPower / Math.max(1e-4, avgMse))));
  const thdPercent = Math.min(100, (Math.sqrt(avgMse) / Math.max(0.1, Am)) * 100);

  const lockMetric = isLocked
    ? Math.max(0.85, 1 - thdPercent / 200)
    : Math.max(0.05, 0.4 - cycleSlips / numPoints);

  return {
    mPoints,
    mRecoveredPoints,
    errorPoints,
    differentiatedPoints,
    envelopePoints,
    phaseErrorPoints,
    vcoFrequencyPoints,
    isLocked,
    lockMetric,
    isOvermodulated,
    isBelowThreshold,
    thdPercent: Number(thdPercent.toFixed(1)),
    effectiveSnrDb: Number(effectiveSnrDb.toFixed(1)),
    demodMode: demodType,
  };
}

/**
 * Generates an audio buffer capturing real acoustic characteristics of
 * discriminator distortion, DC offset clipping, and PLL loss-of-lock.
 */
export function generateDistortedAudioBuffer(
  audioCtx: AudioContext,
  sampleRate: number,
  durationSec: number,
  messageType: 'sine' | 'square' | 'audio',
  baseFmHz: number,
  dcOffset: number,
  isOvermodulated: boolean,
  isLocked: boolean,
  channelNoise: number,
  demodType: 'discriminator' | 'pll'
): AudioBuffer {
  const totalSamples = Math.floor(sampleRate * durationSec);
  const buffer = audioCtx.createBuffer(1, totalSamples, sampleRate);
  const data = buffer.getChannelData(0);

  const fundamental = messageType === 'audio' ? 220 : Math.max(100, baseFmHz * 55);

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;

    let s = 0;
    if (messageType === 'sine') {
      s = Math.sin(2 * Math.PI * fundamental * t);
    } else if (messageType === 'square') {
      s = Math.sin(2 * Math.PI * fundamental * t) >= 0 ? 0.7 : -0.7;
    } else {
      const envelope = 0.5 + 0.5 * Math.sin(2 * Math.PI * 1.5 * t);
      s =
        (Math.sin(2 * Math.PI * 220 * t) +
          0.6 * Math.sin(2 * Math.PI * 440 * t) +
          0.3 * Math.sin(2 * Math.PI * 880 * t)) *
        envelope *
        0.5;
    }

    s += dcOffset * 0.4;

    if (isOvermodulated) {
      if (demodType === 'discriminator') {
        s = s < 0 ? Math.abs(s) * 0.35 : s * 1.2;
      } else {
        s = Math.sin(2 * Math.PI * (fundamental + 600 * Math.sin(t * 12)) * t) * 0.5;
      }
    } else if (!isLocked) {
      s = s * 0.6 + Math.sin(2 * Math.PI * fundamental * 1.5 * t) * 0.35;
    }

    if (channelNoise > 0) {
      const noise = (Math.random() * 2 - 1) * channelNoise * 0.6;
      s += noise;
    }

    data[i] = Math.max(-0.95, Math.min(0.95, Math.tanh(s) * 0.75));
  }

  return buffer;
}
