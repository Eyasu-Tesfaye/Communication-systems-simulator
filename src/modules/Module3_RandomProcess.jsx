/**
 * Module 3: Random Processes & Statistical Properties
 * Filename: Module3_RandomProcess.jsx
 *
 * Unified Module combining Random Process Properties and ProbStat Studio.
 * Integrates all 9 curricular sections:
 * 1. Random Process Generation
 * 2. Sample Realizations
 * 3. Probability Distribution Analysis
 * 4. Ensemble Analysis
 * 5. Mean and Variance
 * 6. Stationarity Analysis (SSS and WSS)
 * 7. Ergodicity
 * 8. Autocorrelation
 * 9. Power Spectral Density (PSD)
 */

import React from 'react';
import RandomProcessesModule from './random-process/RandomProcessesModule';

export default function Module3_RandomProcess(props) {
  return <RandomProcessesModule {...props} initialSection="realizations" />;
}
