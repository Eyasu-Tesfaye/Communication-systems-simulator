# Module 07: Correlation & Spectral Analysis

## Integration Guide for Shared Communication Systems Simulator

This directory contains the self-contained implementation of **Module 07 — Correlation & Spectral Analysis** for the Communication Systems Simulator.

### 1. Architectural Design & Isolation

- **Self-Contained Module:** All mathematical engines, signal generators, interactive plotting components, test suites, and workspace views reside entirely within `src/components/correlation-spectrum/`.
- **Zero Global Side Effects:** Does not pollute global CSS, does not modify `tailwind.config.js`, and introduces no global CSS variables or font overrides.
- **Pure React + TypeScript + Vite:** Built with standard functional components, hooks (`useState`, `useMemo`, `useCallback`, `useRef`), and explicit TypeScript interfaces.
- **Framework Compliance:** Fully compliant with standard React 18/19 SPAs running under Vite. No Next.js or non-standard server runtime required.
- **Standard Tooling & Dependencies:** Uses only `lucide-react` for icons, standard HTML5 Canvas 2D for high-performance responsive plotting, and existing `MathView` (KaTeX) for formula typesetting.

---

### 2. File Organization

```
src/components/correlation-spectrum/
├── index.ts                     # Public API exports (Module entry point, engines, types)
├── CorrelationSpectrumModule.tsx# Main module container with experiment mode switcher
├── CorrelationWorkspace.tsx     # Autocorrelation & Cross-correlation interactive lab
├── PsdWorkspace.tsx             # Power Spectral Density & Wiener–Khinchin lab
├── SignalPlotCanvas.tsx         # High-resolution, zero-slop Canvas plotting component
├── correlationEngine.ts         # Deterministic & stochastic correlation calculations
├── psdEngine.ts                 # FFT-based Wiener–Khinchin PSD calculation engine
├── signalGenerators.ts          # Continuous & discrete signal generators + noise filters
├── stage5VerificationSuite.ts   # Automated 15-case mathematical verification test suite
└── README.md                    # This integration reference documentation
```

---

### 3. Integration Patterns

#### Option A: Direct Import via Public API (Recommended)

```tsx
import { CorrelationSpectrumModule } from './components/correlation-spectrum';

export function App() {
  return (
    <CorrelationSpectrumModule
      onNavigateHome={() => console.log('Navigate Home')}
      onNavigateModule={(path) => console.log('Navigate to', path)}
    />
  );
}
```

#### Option B: Zero-Config Standalone Usage

The module provides full fallback metadata and safe optional prop handlers:

```tsx
import { CorrelationSpectrumModule } from './components/correlation-spectrum';

// Can be mounted with zero props inside any container or tab:
export function StandaloneModule07() {
  return <CorrelationSpectrumModule />;
}
```

#### Option C: Sub-component or Engine Embedding

Individual sub-systems can also be imported independently if custom layouts are desired:

```tsx
import {
  CorrelationWorkspace,
  PsdWorkspace,
  computeCorrelation,
  computePsd,
  executeStage5TestSuite,
} from './components/correlation-spectrum';

// Run automated mathematical validation checks in CI/unit tests:
const testReport = executeStage5TestSuite();
const allPassed = testReport.every(t => t.status === 'PASS'); // true (15/15)
```

---

### 4. Preservation & Non-Interference Guarantee

1. **Dashboard & Other Modules:** Does not touch Modules 01 through 06, nor the dashboard layout, navigation rail, or module explorer cards.
2. **Visual Consistency:** Uses the group's established design palette:
   - Primary dark text: `#1A1917`
   - Secondary muted text: `#585651`, `#75736E`
   - Light canvas background: `#FAF9F6`, `#FFFFFF`
   - Subtle boundary borders: `#E6E4DD`
   - Restrained technical accent: terracotta `#C85A32`
3. **Collapsible Theory Panel:** Educational theory content is cleanly contained in a collapsed-by-default drawer titled **"Theory & Explanation"**, keeping the initial view focused on interactive experimentation.
