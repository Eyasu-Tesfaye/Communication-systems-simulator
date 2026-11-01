/**
 * Module 1: Convolution & System Response
 * Filename: Module1_Convolution.jsx
 * 
 * Modular component slot for LTI System Convolution:
 * Renders the new ContinuousConvolution laboratory module featuring:
 * - 4 synchronized stacked plots on the same time axis: x(τ), h(t-τ), x(τ)·h(t-τ) with shaded area, and y(t) progressive output
 * - Time slider t with Start, Pause, Step, and Reset buttons
 * - Exact identity y(t) = shaded area
 * - Dropdowns for input (rectangle, triangle, Gaussian) and system (rectangle, RC exponential, impulse)
 * - Amplitude and width sliders
 * - Analytical convolution formulation with KaTeX
 */

import React from 'react';
import ContinuousConvolution from './ContinuousConvolution.jsx';

export default function Module1_Convolution(props) {
  return <ContinuousConvolution {...props} />;
}
