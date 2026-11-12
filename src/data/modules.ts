export interface SignalModule {
  id: string;
  moduleNumber: number;
  index: string;
  name: string;
  shortName: string;
  filename: string;
  path: string;
  legacyPaths: string[];
  description: string;
  tag: string;
  topics: [string, string, string];
  formula: string;
  formulaLabel: string;
  keywords: string[];
  parameterHighlights: string[];
}

export const MODULES: SignalModule[] = [
  {
    id: 'convolution',
    moduleNumber: 1,
    index: '01',
    name: 'Convolution & System Response',
    shortName: 'Convolution',
    filename: 'Module1_Convolution.jsx',
    path: '/convolution',
    legacyPaths: ['/module-1', '/module-4'],
    description: 'Explore input signals, impulse responses, output signals, convolution overlap, and LTI system properties.',
    tag: 'LTI Systems & Filtering',
    topics: [
      'Linear Time-Invariant (LTI) System Characterization',
      'Graphical Convolution Integral & Sliding Overlap',
      'Impulse Response h(t), Step Response, & Filter Causality'
    ],
    formula: 'y(t) = (x * h)(t) = \\int_{-\\infty}^{\\infty} x(\\tau) h(t - \\tau) \\, d\\tau',
    formulaLabel: 'Continuous Convolution Integral',
    keywords: [
      'convolution', 'impulse', 'response', 'lti', 'system', 'filter',
      'transfer function', 'step response', 'sliding', 'kernel', 'overlap'
    ],
    parameterHighlights: [
      'Time Shift (τ)',
      'Kernel Support Duration',
      'System Damping Factor (ζ)',
      'Cutoff Frequency (ωc)'
    ]
  },
  {
    id: 'fourier',
    moduleNumber: 2,
    index: '02',
    name: 'Fourier Analysis',
    shortName: 'Fourier Analysis',
    filename: 'Module2_Fourier.jsx',
    path: '/fourier',
    legacyPaths: ['/module-2'],
    description: 'Explore Fourier series, CTFT, DTFT, DFT/FFT, magnitude spectra, phase spectra, harmonic synthesis, and signal reconstruction.',
    tag: 'Frequency Domain Transforms',
    topics: [
      'Harmonic Decomposition & Orthogonal Basis Functions',
      'Magnitude & Phase Spectral Representations',
      'Signal Reconstruction & Gibbs Phenomenon Control'
    ],
    formula: 'X(j\\omega) = \\int_{-\\infty}^{\\infty} x(t) e^{-j\\omega t} \\, dt',
    formulaLabel: 'Continuous-Time Fourier Transform (CTFT)',
    keywords: [
      'fourier', 'spectrum', 'ctft', 'dtft', 'dft', 'fft', 'harmonics',
      'magnitude', 'phase', 'frequency', 'reconstruction', 'gibbs', 'bandwidth'
    ],
    parameterHighlights: [
      'Harmonic Index (k)',
      'Spectral Bandwidth (B)',
      'Sampling Rate (Fs)',
      'FFT Window Length (N)'
    ]
  },
  {
    id: 'random-processes',
    moduleNumber: 3,
    index: '03',
    name: 'Random Process Properties',
    shortName: 'Random Process',
    filename: 'Module3_RandomProcess.jsx',
    path: '/random-processes',
    legacyPaths: ['/module-3', '/module-6'],
    description: 'Explore random-process realizations, ensemble and time averages, mean and variance over time, SSS and WSS stationarity tests, and ergodicity and autocorrelation.',
    tag: 'Stationarity & Ergodicity',
    topics: [
      'Ensemble Realizations vs. Time-Series Trajectories',
      'Strict-Sense & Wide-Sense Stationarity (SSS vs. WSS)',
      'Ergodic Theorems & Autocorrelation Analysis'
    ],
    formula: '\\mathbb{E}[X(t)] = \\mu_X, \\quad R_X(t_1, t_2) = R_X(t_1 - t_2)',
    formulaLabel: 'Wide-Sense Stationarity (WSS) Conditions',
    keywords: [
      'random', 'process', 'stochastic', 'stationarity', 'ergodicity',
      'ensemble', 'realization', 'time average', 'wss', 'sss', 'autocorrelation', 'noise'
    ],
    parameterHighlights: [
      'Ensemble Realizations (M)',
      'Time Horizon (T)',
      'Stationarity Margin (Δμ)',
      'Correlation Lag (τ)'
    ]
  },
  {
    id: 'signals',
    moduleNumber: 4,
    index: '04',
    name: 'Signal Explorer',
    shortName: 'Signal Explorer',
    filename: 'Module4_SignalExplorer.jsx',
    path: '/signals',
    legacyPaths: ['/module-4', '/module-1'],
    description: 'Explore continuous-time and discrete-time signals, signal families, parameters, transformations, and sampling behavior.',
    tag: 'Continuous & Discrete Signals',
    topics: [
      'Continuous & Discrete Time Formulations',
      'Standard Signal Families (Sinusoid, Chirp, Sinc, Rect)',
      'Transformations, Symmetry & Energy vs. Power'
    ],
    formula: 'x(t) = A \\cos(2\\pi f_0 t + \\phi)',
    formulaLabel: 'Generalized Continuous-Time Harmonic',
    keywords: [
      'signal', 'continuous', 'discrete', 'waveform', 'sinusoid', 'chirp',
      'sinc', 'step', 'impulse', 'sampling', 'amplitude', 'frequency', 'phase', 'energy'
    ],
    parameterHighlights: [
      'Amplitude (A)',
      'Fundamental Frequency (f₀)',
      'Phase Offset (ϕ)',
      'Sampling Interval (Ts)'
    ]
  },
  {
    id: 'correlation-spectrum',
    moduleNumber: 5,
    index: '05',
    name: 'Correlation & Spectral Analysis',
    shortName: 'Correlation',
    filename: 'Module5_Correlation.jsx',
    path: '/correlation-spectrum',
    legacyPaths: ['/correlation', '/module-5', '/module-7'],
    description: 'Explore autocorrelation, cross-correlation, power spectral density, periodograms, Welch’s method, and the Wiener–Khinchin relationship.',
    tag: 'Spectral Estimation',
    topics: [
      'Autocorrelation Rxx(τ) & Cross-Correlation Rxy(τ)',
      'Wiener–Khinchin Theorem: Linking Correlation & PSD',
      'Nonparametric Spectral Estimation (Periodogram & Welch)'
    ],
    formula: 'S_{XX}(\\omega) = \\int_{-\\infty}^{\\infty} R_{XX}(\\tau) e^{-j\\omega \\tau} \\, d\\tau',
    formulaLabel: 'Wiener–Khinchin Transform Relation',
    keywords: [
      'correlation', 'autocorrelation', 'cross-correlation', 'psd',
      'spectral density', 'periodogram', 'welch', 'wiener-khinchin', 'lag'
    ],
    parameterHighlights: [
      'Maximum Lag (τ_max)',
      'Welch Segment Overlap (%)',
      'Spectral Window (Hamming/Hann)',
      'Resolution Bandwidth (Δf)'
    ]
  },
  {
    id: 'complex-signals',
    moduleNumber: 6,
    index: '06',
    name: 'Euler Identity & Complex Signals',
    shortName: 'Euler & Complex',
    filename: 'Module6_EulerSignals.jsx',
    path: '/complex-signals',
    legacyPaths: ['/module-6', '/module-3'],
    description: "Explore complex numbers, rectangular and polar forms, Euler's identity, rotating phasors, magnitude, and analytic signals.",
    tag: 'Phasors & Analytic Signals',
    topics: [
      "Euler's Geometric Identity & Phasor Rotation",
      'Cartesian (Re/Im) to Polar (r, θ) Coordinate Conversion',
      'Negative Frequencies & Analytic Signal Representation'
    ],
    formula: 'e^{j\\theta} = \\cos(\\theta) + j\\sin(\\theta)',
    formulaLabel: "Euler's Identity & Complex Exponential",
    keywords: [
      'euler', 'complex', 'phasor', 'imaginary', 'polar', 'cartesian',
      'magnitude', 'phase', 'rotation', 'hilbert', 'analytic'
    ],
    parameterHighlights: [
      'Modulus / Magnitude (|z|)',
      'Phase Angle (arg z / θ)',
      'Angular Velocity (ω)',
      'In-Phase & Quadrature (I/Q)'
    ]
  },
  {
    id: 'probability',
    moduleNumber: 7,
    index: '07',
    name: 'Probability & Statistics',
    shortName: 'Probability',
    filename: 'Module7_Probability.jsx',
    path: '/probability',
    legacyPaths: ['/module-7', '/module-5'],
    description: 'Explore fundamental concepts of probability, random variables, and statistical distributions through interactive visualizations.',
    tag: 'Interactive Education',
    topics: [
      'Probability Distributions (Normal, Binomial, Poisson, Exp, Uniform)',
      'Joint, Marginal & Conditional Probability (2D Matrix & Independence)',
      'Bayes\' Theorem & Natural Frequency Population Models'
    ],
    formula: 'P(A \\mid B) = \\frac{P(B \\mid A) \\cdot P(A)}{P(B)}',
    formulaLabel: 'Bayes\' Theorem & Continuous Distributions',
    keywords: [
      'probability', 'distributions', 'joint probability', 'bayes', 'clt',
      'central limit theorem', 'normal', 'binomial', 'poisson', 'exponential', 'uniform'
    ],
    parameterHighlights: [
      'Mean / Expectation (μ)',
      'Standard Deviation (σ)',
      'Confidence Interval (1-α)',
      'Sample Size (N)'
    ]
  }
];

export interface AMSubTopic {
  id: string;
  code: string;
  moduleNumber: string;
  index: string;
  filename: string;
  name: string;
  shortName: string;
  path: string;
  legacyPaths: string[];
  description: string;
  tag: string;
  topics: [string, string, string];
  formula: string;
  formulaLabel: string;
  keywords: string[];
  parameterHighlights: string[];
}

export const AM_MODULES: AMSubTopic[] = [
  {
    id: 'cam',
    code: '01',
    moduleNumber: '2.1',
    index: '01',
    filename: 'Module2_1_CAM.tsx',
    name: 'Conventional Amplitude Modulation (CAM)',
    shortName: 'CAM (DSB-FC)',
    path: '/am/cam',
    legacyPaths: ['/cam', '/am', '/dsb-fc', '/amplitude-modulation'],
    description: 'Double-sideband full-carrier modulation. Explore carrier addition, modulation index μ, overmodulation envelope distortion, carrier power allocation, and envelope detection feasibility.',
    tag: 'Double Sideband Full Carrier',
    topics: [
      'Carrier Wave Superposition: s(t) = Ac[1 + μ m(t)] cos(2π fc t)',
      'Modulation Index Dynamics: Undermodulation (μ < 1) vs Overmodulation (μ > 1)',
      'Power Partition: Pt = Pc(1 + μ²/2) & Maximum Efficiency η_max = 33.3%'
    ],
    formula: 's_{AM}(t) = A_c \\left[1 + \\mu m(t)\\right] \\cos(2\\pi f_c t)',
    formulaLabel: 'Conventional AM Time-Domain Form (DSB-FC)',
    keywords: ['am', 'cam', 'carrier', 'envelope', 'modulation index', 'dsb-fc', 'efficiency', 'spectrum', 'overmodulation'],
    parameterHighlights: [
      'Modulation Index (μ = 0.0 to 1.5)',
      'Carrier Frequency (fc)',
      'Message Frequency (fm)',
      'Carrier Peak Amplitude (Ac)'
    ]
  },
  {
    id: 'dsb-sc',
    code: '02',
    moduleNumber: '2.2',
    index: '02',
    filename: 'Module2_2_DSBSC.tsx',
    name: 'Double Sideband Suppressed Carrier (DSB-SC)',
    shortName: 'DSB-SC',
    path: '/am/dsb-sc',
    legacyPaths: ['/dsb-sc', '/dsbsc', '/suppressed-carrier'],
    description: 'Multiplier-based balanced modulation eliminating the high-power carrier component. 100% transmitted power in message sidebands with phase reversals at zero-crossings.',
    tag: 'Suppressed Carrier Modulation',
    topics: [
      'Balanced Multiplier Formulation: s(t) = Ac m(t) cos(2π fc t)',
      'Phase Reversal Dynamics: 180° Phase Flip at Message Zero Crossings',
      '100% Sideband Power Efficiency & Transmission Bandwidth B_T = 2W'
    ],
    formula: 's_{DSB}(t) = A_c \\cdot m(t) \\cdot \\cos(2\\pi f_c t)',
    formulaLabel: 'DSB-SC Modulated Signal Representation',
    keywords: ['dsb-sc', 'balanced modulator', 'suppressed carrier', 'phase reversal', 'efficiency', 'ring modulator'],
    parameterHighlights: [
      'Carrier Frequency (fc)',
      'Message Bandwidth (W)',
      'RF Peak Amplitude (Ac)',
      'Sideband Power Ratio (100%)'
    ]
  },
  {
    id: 'ssb',
    code: '03',
    moduleNumber: '2.3',
    index: '03',
    filename: 'Module2_3_SSB.tsx',
    name: 'Single Sideband Modulation (SSB-SC)',
    shortName: 'SSB (USB/LSB)',
    path: '/am/ssb',
    legacyPaths: ['/ssb', '/ssb-sc', '/usb', '/lsb'],
    description: 'Spectral efficiency maximization by transmitting only one sideband (USB or LSB). Halves transmission bandwidth to B = W via Hilbert transform 90° phase shifting or sharp filtering.',
    tag: 'Spectral Efficiency (B = W)',
    topics: [
      'Canonical Form: s(t) = (Ac/2)[m(t) cos(2π fc t) ∓ m̂(t) sin(2π fc t)]',
      'Hilbert Transform m̂(t) & 90° Phase Shift Method (Hartley Modulator)',
      'Upper Sideband (USB) vs Lower Sideband (LSB) Spectral Slicing'
    ],
    formula: 's_{SSB}(t) = \\frac{A_c}{2} \\left[m(t)\\cos(2\\pi f_c t) \\mp \\widehat{m}(t)\\sin(2\\pi f_c t)\\right]',
    formulaLabel: 'SSB Time-Domain Analytic Form (Hilbert Transform)',
    keywords: ['ssb', 'usb', 'lsb', 'hilbert transform', 'phase shift', 'hartley', 'weaver', 'bandwidth'],
    parameterHighlights: [
      'Sideband Mode (USB vs LSB)',
      'Carrier Frequency (fc)',
      'Hilbert Phase Shift (90°)',
      'Bandwidth Savings (50%)'
    ]
  },
  {
    id: 'vsb',
    code: '04',
    moduleNumber: '2.4',
    index: '04',
    filename: 'Module2_4_VSB.tsx',
    name: 'Vestigial Sideband Modulation (VSB)',
    shortName: 'VSB',
    path: '/am/vsb',
    legacyPaths: ['/vsb', '/vestigial'],
    description: 'Practical compromise between DSB and SSB for baseband signals with significant low-frequency content (e.g. analog/digital television). Transmits one full sideband and a vestige of the other.',
    tag: 'Television & Video Modulation',
    topics: [
      'Nyquist Vestigial Filter Criterion: |H(f - fc)| + |H(f + fc)| = Constant',
      'Compromise Bandwidth Formulation: B_T = W + f_v (where f_v ≪ W)',
      'Vestigial Distortion Suppression & In-Phase/Quadrature Symmetry'
    ],
    formula: 'H(f - f_c) + H(f + f_c) = 1, \\quad \\text{for } |f| \\le W',
    formulaLabel: 'VSB Nyquist Filter Symmetry Condition',
    keywords: ['vsb', 'vestigial', 'nyquist slope', 'television', 'atsc', 'carrier vestige', 'video transmission'],
    parameterHighlights: [
      'Vestige Width (fv = 0.25W)',
      'Nyquist Slope Roll-off',
      'Total Bandwidth (W + fv)',
      'Quadrature Component Scale'
    ]
  },
  {
    id: 'fm',
    code: '05',
    moduleNumber: '2.5',
    index: '05',
    filename: 'Module2_5_FM.tsx',
    name: 'Frequency Modulation (FM)',
    shortName: 'FM',
    path: '/am/fm',
    legacyPaths: ['/fm', '/frequency-modulation', '/angle-modulation/fm'],
    description: 'Explore Angle Modulation where instantaneous carrier frequency deviates proportional to message amplitude. Experiment with frequency deviation Δf, modulation index β, Carson’s bandwidth rule, and Bessel function sideband distribution.',
    tag: 'Angle & Frequency Modulation',
    topics: [
      'Instantaneous Frequency: fi(t) = fc + kf m(t) & Phase Integral θ(t) = 2π fc t + 2π kf ∫ m(τ) dτ',
      'Modulation Index & Deviation: β = Δf / fm & Carson\'s Rule Bandwidth B_T = 2(Δf + fm)',
      'Spectral Bessel Series: s(t) = Ac ∑ Jn(β) cos[2π(fc + n fm)t] (Narrowband vs Wideband FM)'
    ],
    formula: 's_{FM}(t) = A_c \\cos\\left(2\\pi f_c t + 2\\pi k_f \\int_0^t m(\\tau) \\, d\\tau\\right) = A_c \\cos\\left(2\\pi f_c t + \\beta \\sin(2\\pi f_m t)\\right)',
    formulaLabel: 'Frequency Modulated Signal Formulation (Carson & Bessel Representation)',
    keywords: ['fm', 'frequency modulation', 'carson', 'bessel', 'deviation', 'narrowband', 'wideband', 'carrier', 'spectrum'],
    parameterHighlights: [
      'Modulation Index (β = 0.1 to 10)',
      'Frequency Deviation (Δf)',
      'Modulating Frequency (fm)',
      'Carson Bandwidth (2(Δf + fm))'
    ]
  },
  {
    id: 'am-pm',
    code: '06',
    moduleNumber: '2.6',
    index: '06',
    filename: 'Module2_6_AM_PM.tsx',
    name: 'Phase Modulation and Demodulation',
    shortName: 'PM & Demod',
    path: '/am/pm',
    legacyPaths: ['/pm', '/phase-modulation', '/am-pm', '/angle-modulation/pm', '/am/am-pm'],
    description: 'Interactive signal-processing workbench illustrating instantaneous phase encoding, constant-envelope transmission, PM vs. FM behavior, and real 4-stage frequency-discriminator recovery.',
    tag: 'Phase & Angle Modulation',
    topics: [
      'Phase Modulation Rule: s(t) = Ac cos(2π fc t + kp m(t)) with Phase Sensitivity kp',
      'Relationship between PM and FM: Instantaneous Frequency fi(t) = fc + (kp/2π) dm(t)/dt',
      '4-Stage Frequency Discriminator Demodulation: Differentiation, Envelope Detection, DC Blocking & Integration'
    ],
    formula: 's_{PM}(t) = A_c \\cos\\left(2\\pi f_c t + k_p m(t)\\right), \\quad f_i(t) = f_c + \\frac{k_p}{2\\pi}\\frac{dm(t)}{dt}',
    formulaLabel: 'Phase Modulated (PM) Signal & Instantaneous Frequency',
    keywords: ['pm', 'phase modulation', 'demodulation', 'discriminator', 'phase deviation', 'angle modulation', 'differentiator', 'integrator'],
    parameterHighlights: [
      'Phase Sensitivity (kp)',
      'Carrier Amplitude & Frequency (Ac, fc)',
      'Message Waveform & Slope (m(t), fm)',
      '4-Stage Discriminator Recovery'
    ]
  },
  {
    id: 'demodulation',
    code: '07',
    moduleNumber: '2.7',
    index: '07',
    filename: 'Module2_7_Demodulation.tsx',
    name: 'Demodulation and Detection',
    shortName: 'Demodulation',
    path: '/am/demodulation',
    legacyPaths: ['/demodulation', '/am-demod', '/envelope-detector', '/coherent-detector', '/detection', '/fm-demod'],
    description: 'Comprehensive baseband message recovery techniques for both AM and FM/PM signals. Compare non-coherent envelope detection, coherent synchronous detection with Costas loop, and FM slope / discriminator detection.',
    tag: 'Signal Recovery & Demodulation',
    topics: [
      'AM Envelope Detector: Diode Rectification & RC Constant Optimization (1/fc ≪ RC ≪ 1/W)',
      'Coherent Product Demodulator: Multiplier + LPF with Phase Tracking cos(Δϕ)',
      'FM Discriminator & Slope Detection: Differentiator + Envelope Extraction & PLL Frequency Tracking'
    ],
    formula: 'y(t) = \\text{LPF}\\left\\{ s(t) \\cdot 2\\cos(2\\pi f_c t + \\Delta\\phi) \\right\\} = m(t)\\cos(\\Delta\\phi)',
    formulaLabel: 'Coherent Demodulation & Detection Formulation',
    keywords: ['demodulation', 'detection', 'envelope detector', 'diode', 'rc constant', 'coherent', 'discriminator', 'pll', 'costas loop'],
    parameterHighlights: [
      'Detection Mode (Envelope vs Coherent vs FM Discriminator)',
      'Filter Time Constant (RC)',
      'Local Oscillator Phase Offset (Δϕ)',
      'Post-Detection LPF Cutoff (fc)'
    ]
  }
];

export function findModuleByPathOrId(pathOrId: string): SignalModule | undefined {
  const clean = pathOrId.trim().replace(/\/+$/, '') || '/';
  return MODULES.find(
    (m) =>
      m.id === clean ||
      m.path === clean ||
      m.filename === clean ||
      m.legacyPaths.includes(clean)
  );
}

export function findAMModuleByPathOrId(pathOrId: string): AMSubTopic | undefined {
  const clean = pathOrId.trim().replace(/\/+$/, '') || '/';
  return AM_MODULES.find(
    (m) =>
      m.id === clean ||
      m.code.toLowerCase() === clean.toLowerCase() ||
      m.path === clean ||
      m.legacyPaths.includes(clean)
  );
}

export type AnyLabModule =
  | { type: 'signals'; module: SignalModule }
  | { type: 'am'; module: AMSubTopic };

export function findAnyModuleByPathOrId(pathOrId: string): AnyLabModule | undefined {
  const sig = findModuleByPathOrId(pathOrId);
  if (sig) return { type: 'signals', module: sig };
  const am = findAMModuleByPathOrId(pathOrId);
  if (am) return { type: 'am', module: am };
  return undefined;
}

