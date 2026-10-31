import React from 'react';
import { Play, Pause, RotateCcw, Grid, Maximize2, Minimize2, Info } from 'lucide-react';

export type PlaybackState = 'playing' | 'paused' | 'reset';

interface SimulationToolbarProps {
  playbackState: PlaybackState;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
  speed: string;
  onSpeedChange: (speed: string) => void;
  isGridVisible: boolean;
  onToggleGrid: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isLiveSimulationReady?: boolean;
  className?: string;
}

export const SimulationToolbar: React.FC<SimulationToolbarProps> = ({
  playbackState,
  onPlay,
  onPause,
  onReset,
  speed,
  onSpeedChange,
  isGridVisible,
  onToggleGrid,
  isFullscreen,
  onToggleFullscreen,
  isLiveSimulationReady = false,
  className = '',
}) => {
  const speeds = ['0.25×', '0.5×', '1×', '2×', '4×'];
  const isPaused = playbackState === 'paused';
  const isPlaying = playbackState === 'playing';

  return (
    <div
      className={`flex flex-wrap items-center justify-between gap-2.5 p-2 sm:p-2.5 bg-[#FAF9F6] border border-[#E6E4DD] rounded-md ${className}`}
      role="toolbar"
      aria-label="Simulation visualization playback and view controls"
    >
      {/* Left side: Three Playback Actions (Play/Resume, Pause, Reset) + Speed Selector */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Playback Controls Group */}
        <div className="relative group inline-flex items-center rounded-md border border-[#E6E4DD] bg-white p-0.5 shadow-2xs">
          {/* 1. Play / Resume Button */}
          <button
            type="button"
            disabled={!isLiveSimulationReady}
            onClick={onPlay}
            aria-pressed={isPlaying}
            aria-label={
              !isLiveSimulationReady
                ? 'Play / Resume (Available when simulation is implemented)'
                : isPaused
                ? 'Resume simulation'
                : 'Play simulation'
            }
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C85A32] ${
              !isLiveSimulationReady
                ? 'text-[#8A8882] cursor-not-allowed opacity-75'
                : isPlaying
                ? 'bg-[#C85A32] text-white'
                : 'text-[#1A1917] hover:bg-[#FAF9F6]'
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isPaused ? 'Resume' : 'Play'}</span>
          </button>

          {/* 2. Pause Button */}
          <button
            type="button"
            disabled={!isLiveSimulationReady}
            onClick={onPause}
            aria-pressed={isPaused}
            aria-label={
              !isLiveSimulationReady
                ? 'Pause (Available when simulation is implemented)'
                : 'Pause simulation'
            }
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C85A32] ${
              !isLiveSimulationReady
                ? 'text-[#8A8882] cursor-not-allowed opacity-75'
                : isPaused
                ? 'bg-[#1A1917] text-white'
                : 'text-[#1A1917] hover:bg-[#FAF9F6]'
            }`}
          >
            <Pause className="w-3.5 h-3.5 fill-current" />
            <span>Pause</span>
          </button>

          {/* 3. Reset Button */}
          <button
            type="button"
            disabled={!isLiveSimulationReady}
            onClick={onReset}
            aria-label={
              !isLiveSimulationReady
                ? 'Reset (Available when simulation is implemented)'
                : 'Reset simulation to initial state'
            }
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C85A32] ${
              !isLiveSimulationReady
                ? 'text-[#8A8882] cursor-not-allowed opacity-75'
                : 'text-[#585651] hover:text-[#1A1917] hover:bg-[#FAF9F6]'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          {/* Subtle explanation tooltip when disabled */}
          {!isLiveSimulationReady && (
            <div
              role="tooltip"
              className="pointer-events-none absolute left-0 bottom-full mb-1.5 hidden group-hover:flex items-center gap-1.5 px-2.5 py-1 bg-[#1A1917] text-white text-[11px] font-sans font-medium rounded shadow-sm whitespace-nowrap z-50"
            >
              <Info className="w-3 h-3 text-[#C85A32]" />
              <span>Available when simulation is implemented</span>
            </div>
          )}
        </div>

        {/* Speed Selector (0.25×, 0.5×, 1×, 2×, 4×) */}
        <div className="flex items-center gap-1 bg-white border border-[#E6E4DD] rounded p-0.5 shadow-2xs">
          <span className="text-[10px] font-mono text-[#75736E] px-1.5 uppercase font-semibold">
            Speed
          </span>
          <div className="flex items-center gap-0.5">
            {speeds.map((s) => {
              const isSelected = speed === s;
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => onSpeedChange(s)}
                  aria-pressed={isSelected}
                  className={`px-1.5 py-0.5 text-[11px] font-mono rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#C85A32] ${
                    isSelected
                      ? 'bg-[#1A1917] text-white font-semibold'
                      : 'text-[#65635E] hover:text-[#1A1917] hover:bg-[#FAF9F6]'
                  }`}
                >
                  {s}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right side: Grid Toggle & Fullscreen Controls */}
      <div className="flex items-center gap-2">
        {/* Toggleable Grid Button */}
        <div className="relative group">
          <button
            type="button"
            onClick={onToggleGrid}
            aria-pressed={isGridVisible}
            aria-label={isGridVisible ? 'Hide background grid' : 'Show background grid'}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85A32] shadow-2xs ${
              isGridVisible
                ? 'bg-[#FBF4F0] border-[#C85A32]/40 text-[#C85A32] font-semibold'
                : 'bg-white border-[#E6E4DD] text-[#65635E] hover:text-[#1A1917] hover:bg-[#FAF9F6]'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Grid</span>
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isGridVisible ? 'bg-[#C85A32]' : 'bg-[#DCD9D0]'
              }`}
              aria-hidden="true"
            />
          </button>
          <div
            role="tooltip"
            className="pointer-events-none absolute right-0 bottom-full mb-1.5 hidden group-hover:block px-2 py-1 bg-[#1A1917] text-white text-[11px] rounded shadow-sm whitespace-nowrap z-50 font-sans"
          >
            {isGridVisible ? 'Hide grid' : 'Show grid'}
          </div>
        </div>

        {/* Fullscreen Expansion / Exit Button */}
        <div className="relative group">
          <button
            type="button"
            onClick={onToggleFullscreen}
            aria-label={isFullscreen ? 'Exit fullscreen mode (Esc)' : 'Expand visualization to fullscreen'}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85A32] shadow-2xs ${
              isFullscreen
                ? 'bg-[#1A1917] border-[#1A1917] text-white font-semibold'
                : 'bg-white border-[#E6E4DD] text-[#65635E] hover:text-[#1A1917] hover:bg-[#FAF9F6]'
            }`}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Exit Fullscreen</span>
                <kbd className="hidden sm:inline-block ml-0.5 text-[10px] font-mono text-[#A8A69E]">Esc</kbd>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Fullscreen</span>
              </>
            )}
          </button>
          {!isFullscreen && (
            <div
              role="tooltip"
              className="pointer-events-none absolute right-0 bottom-full mb-1.5 hidden group-hover:block px-2 py-1 bg-[#1A1917] text-white text-[11px] rounded shadow-sm whitespace-nowrap z-50 font-sans"
            >
              Expand to fullscreen
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
