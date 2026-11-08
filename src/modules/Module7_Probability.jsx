/**
 * Module 7: Probability & Statistics (ProbStat Studio)
 * Filename: Module7_Probability.jsx
 *
 * Integrated into the unified 'Random Processes & Statistical Properties' module.
 */

import React from 'react';
import RandomProcessesModule from './random-process/RandomProcessesModule';

export default function Module7_Probability(props) {
  return (
    <div className="w-full">
      <div className="mb-4 p-3 bg-[#FBF4F0] border border-[#C85A32]/30 rounded-lg flex items-center justify-between text-xs text-[#585651]">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#C85A32]" />
          <span>
            <strong>Unified Module Notice:</strong> ProbStat Studio is now fully integrated into{' '}
            <strong className="text-[#1A1917]">Random Processes & Statistical Properties</strong>.
          </span>
        </div>
        <span className="font-mono text-[#C85A32] font-semibold hidden sm:inline">
          Section 03: Probability Distribution Analysis
        </span>
      </div>

      <RandomProcessesModule {...props} initialSection="distribution" />
    </div>
  );
}
