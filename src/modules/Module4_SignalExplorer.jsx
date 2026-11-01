/**
 * Module 1: Signal Explorer
 * Filename: Module4_SignalExplorer.jsx
 *
 * Plug-and-play component slot for Signal Explorer:
 * Renders the full interactive Signals & Systems Laboratory:
 * - Signal Generation & Even/Odd Decomposition (axial symmetry & anti-symmetry)
 * - Signal Arithmetic Workbench (superposition beats, AM modulation, harmonic synthesis, windowing)
 * - Independent & Dependent Signal Transformations (amplitude scale, time scale, time reversal, time shift)
 * - Comprehensive metrics analysis (Periodicity, Energy, Power, Symmetry ratio)
 * - Continuous-time x(t) and Discrete-time x[n] stems with live hover coordinate inspection, SVG/CSV export
 * - Pedagogical textbook presets and interactive theory reference
 */

import React from 'react';
import { SignalExplorerWorkspace } from './signal-explorer/SignalExplorerWorkspace';

export default function Module4_SignalExplorer(props) {
  return <SignalExplorerWorkspace {...props} />;
}
