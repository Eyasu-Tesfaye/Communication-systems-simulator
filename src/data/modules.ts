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
    name: 'Random Processes & Statistical Properties',
    shortName: 'Random Processes & Stats',
    filename: 'Module3_RandomProcess.jsx',
    path: '/random-processes',
    legacyPaths: ['/module-3', '/module-6'],
    description: 'Explore stochastic process generation, sample realizations, probability distributions (PDF/CDF), ensemble cross-sections, stationarity (SSS & WSS), ergodicity, autocorrelation, and PSD.',
    tag: 'Stationarity & Probability',
    topics: [
      'Stochastic Process Generation & Probability Distributions (PDF/CDF)',
      'Strict-Sense & Wide-Sense Stationarity (SSS vs. WSS)',
      'Ergodic Theorems, Autocorrelation Rxx(τ) & Power Spectral Density'
    ],
    formula: '\\mathbb{E}[X(t)] = \\mu_X, \\quad R_X(t_1, t_2) = R_X(t_1 - t_2)',
    formulaLabel: 'Wide-Sense Stationarity (WSS) Conditions',
    keywords: [
      'random', 'process', 'stochastic', 'stationarity', 'ergodicity',
      'ensemble', 'realization', 'probability', 'pdf', 'cdf', 'psd', 'autocorrelation', 'wss', 'noise'
    ],
    parameterHighlights: [
      'Ensemble Realizations (M)',
      'Time Horizon (T)',
      'Distribution Model (PDF/CDF)',
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
