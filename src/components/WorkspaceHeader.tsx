import React from 'react';

export const WorkspaceHeader: React.FC = () => {
  return (
    <header className="pt-8 pb-6 border-b border-[#E6E4DD]">
      <div>
        {/* Breadcrumb / Label */}
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-[#75736E] uppercase font-mono mb-2">
          <span>SIGNAL LAB</span>
          <span aria-hidden="true" className="text-[#A8A69E]">/</span>
          <span className="text-[#C85A32]">WORKSPACE</span>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1A1917]">
          Your workspace
        </h1>

        {/* Subtitle */}
        <p className="mt-1.5 text-sm sm:text-base text-[#65635E] max-w-2xl text-balance">
          Explore signals, systems, and the mathematics behind them.
        </p>
      </div>
    </header>
  );
};
