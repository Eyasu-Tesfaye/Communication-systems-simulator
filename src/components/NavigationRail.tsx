import React, { useState, useEffect } from 'react';
import {
  Settings,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Radio,
  Activity,
} from 'lucide-react';
import { MODULES, AM_MODULES } from '../data/modules';
import { ModuleGlyph } from './ModuleGlyphs';

interface NavigationRailProps {
  currentSection?: string;
  activeChapter?: 'signals' | 'am';
  isWorkspaceHub?: boolean;
  currentModuleNumber?: number;
  currentAmId?: string;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectChapter: (chapter: 'signals' | 'am') => void;
  onSelectModule: (moduleNumber: number) => void;
  onSelectAmSubTopic: (subTopicId: string) => void;
  onOpenSettings: () => void;
  onNavigateHome: () => void;
}

export const NavigationRail: React.FC<NavigationRailProps> = ({
  currentSection,
  activeChapter = 'signals',
  isWorkspaceHub,
  currentModuleNumber = 1,
  currentAmId = 'cam',
  isCollapsed,
  onToggleCollapse,
  onSelectChapter,
  onSelectModule,
  onSelectAmSubTopic,
  onOpenSettings,
  onNavigateHome,
}) => {
  const isWorkspace =
    isWorkspaceHub ?? (currentSection === 'workspace' || currentSection === 'modules');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  // Mutually exclusive section collapse/expand states (auto-collapse inactive section)
  const [isSignalsOpen, setIsSignalsOpen] = useState(activeChapter === 'signals');
  const [isAmOpen, setIsAmOpen] = useState(activeChapter === 'am');

  // Collapse the inactive section whenever activeChapter changes
  useEffect(() => {
    if (activeChapter === 'am') {
      setIsAmOpen(true);
      setIsSignalsOpen(false);
    } else {
      setIsSignalsOpen(true);
      setIsAmOpen(false);
    }
  }, [activeChapter]);

  // Close drawer on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileDrawerOpen) {
        setMobileDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileDrawerOpen]);

  return (
    <>
      {/* Desktop Collapsible Navigation Sidebar */}
      <aside
        className={`hidden md:flex flex-col justify-between shrink-0 h-screen sticky top-0 bg-white border-r border-[#E6E4DD] z-30 transition-all duration-200 ease-in-out select-none overflow-hidden ${
          isCollapsed ? 'w-[68px] py-3.5 px-2' : 'w-64 py-4 px-3.5'
        }`}
        aria-label="Workspace Navigation Sidebar"
      >
        {/* Top Section */}
        <div className="flex flex-col w-full min-h-0">
          {/* Header Brand & Toggle */}
          <div className="flex items-center justify-between pb-3 mb-2.5 border-b border-[#E6E4DD]">
            {isCollapsed ? (
              /* Collapsed: Pure icons for brand & expand toggle */
              <div className="flex flex-col items-center w-full gap-2">
                <button
                  type="button"
                  onClick={onNavigateHome}
                  className={`w-9 h-9 rounded-md transition-all flex items-center justify-center text-[#C85A32] cursor-pointer ${
                    isWorkspace
                      ? 'bg-[#FBF4F0] border-2 border-[#C85A32] ring-2 ring-[#C85A32]/25 shadow-2xs'
                      : 'bg-[#FAF9F6] border border-[#E6E4DD] hover:border-[#C85A32]/40'
                  }`}
                  title="Signal Lab Home"
                  aria-label="Signal Lab Home"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.25"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 12h2.5c1.5 0 2-6 3.5-6s2 12 3.5 12 2-6 3.5-6H21" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="w-8 h-8 rounded flex items-center justify-center text-[#75736E] hover:text-[#1A1917] hover:bg-[#FAF9F6] transition-colors cursor-pointer"
                  title="Expand sidebar"
                  aria-label="Expand sidebar"
                >
                  <PanelLeftOpen className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* Expanded: Brand with label & collapse toggle */
              <div className="flex items-center justify-between w-full">
                <button
                  type="button"
                  onClick={onNavigateHome}
                  className="flex items-center gap-2.5 text-left group cursor-pointer"
                >
                  <div
                    className={`w-8 h-8 rounded-md flex items-center justify-center text-[#C85A32] transition-all ${
                      isWorkspace
                        ? 'bg-[#FBF4F0] border-2 border-[#C85A32] ring-2 ring-[#C85A32]/25 shadow-2xs'
                        : 'bg-[#FAF9F6] border border-[#E6E4DD] group-hover:border-[#C85A32]/40'
                    }`}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.25"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 12h2.5c1.5 0 2-6 3.5-6s2 12 3.5 12 2-6 3.5-6H21" />
                    </svg>
                  </div>
                  <div>
                    <span
                      className={`font-mono text-xs font-bold tracking-wider block transition-colors ${
                        isWorkspace ? 'text-[#C85A32]' : 'text-[#1A1917]'
                      }`}
                    >
                      SIGNAL LAB
                    </span>
                    <span className="text-[10px] text-[#75736E] font-medium block">
                      Systems Workspace
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="p-1 rounded text-[#75736E] hover:text-[#1A1917] hover:bg-[#FAF9F6] transition-colors cursor-pointer"
                  title="Collapse sidebar"
                  aria-label="Collapse sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {/* Top-Level Section Switch (Segmented Control - Clean without 'Chapter' wording) */}
          {isCollapsed ? (
            /* Collapsed: Quick section icons */
            <div className="flex flex-col items-center gap-1.5 pb-2.5 mb-2 border-b border-[#E6E4DD]">
              <button
                type="button"
                onClick={() => {
                  setIsSignalsOpen(true);
                  setIsAmOpen(false);
                  onSelectChapter('signals');
                }}
                className={`relative flex items-center justify-center w-9 h-8 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                  activeChapter === 'signals'
                    ? 'bg-[#FBF4F0] text-[#C85A32] border border-[#C85A32]/40 shadow-2xs'
                    : 'text-[#75736E] hover:text-[#1A1917] hover:bg-[#FAF9F6]'
                }`}
                title="Signals & Random Processes (01–07)"
                aria-label="Signals & Random Processes"
              >
                <Activity className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAmOpen(true);
                  setIsSignalsOpen(false);
                  onSelectChapter('am');
                }}
                className={`relative flex items-center justify-center w-9 h-8 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                  activeChapter === 'am'
                    ? 'bg-[#FBF4F0] text-[#C85A32] border border-[#C85A32]/40 shadow-2xs'
                    : 'text-[#75736E] hover:text-[#1A1917] hover:bg-[#FAF9F6]'
                }`}
                title="Amplitude Modulation (01–07)"
                aria-label="Amplitude Modulation"
              >
                <Radio className="w-4 h-4" />
              </button>
            </div>
          ) : (
            /* Expanded: Segmented horizontal section selector */
            <div className="mb-2.5">
              <div className="p-0.5 bg-[#FAF9F6] border border-[#E6E4DD] rounded-lg flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignalsOpen(true);
                    setIsAmOpen(false);
                    onSelectChapter('signals');
                  }}
                  className={`flex-1 py-1 px-2 text-[11px] font-mono font-semibold rounded transition-all text-center truncate cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeChapter === 'signals'
                      ? 'bg-white text-[#C85A32] shadow-2xs border border-[#E6E4DD]/80 font-bold'
                      : 'text-[#75736E] hover:text-[#1A1917]'
                  }`}
                  title="Signals & Random Processes"
                >
                  <Activity className="w-3 h-3 shrink-0" />
                  <span className="truncate">Signals</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAmOpen(true);
                    setIsSignalsOpen(false);
                    onSelectChapter('am');
                  }}
                  className={`flex-1 py-1 px-2 text-[11px] font-mono font-semibold rounded transition-all text-center truncate cursor-pointer flex items-center justify-center gap-1.5 ${
                    activeChapter === 'am'
                      ? 'bg-white text-[#C85A32] shadow-2xs border border-[#E6E4DD]/80 font-bold'
                      : 'text-[#75736E] hover:text-[#1A1917]'
                  }`}
                  title="Amplitude Modulation"
                >
                  <Radio className="w-3 h-3 shrink-0" />
                  <span className="truncate">Amplitude Mod</span>
                </button>
              </div>
            </div>
          )}

          {/* Toggable Expand/Collapse Section Trees */}
          <nav
            className="flex flex-col gap-1 py-1 flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Modules List"
          >
            {/* ============================================================== */}
            {/* SECTION 1: Signals & Random Processes (01–07)                 */}
            {/* ============================================================== */}
            {!isCollapsed && (
              <button
                type="button"
                onClick={() => {
                  const next = !isSignalsOpen;
                  setIsSignalsOpen(next);
                  if (next) setIsAmOpen(false);
                }}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded transition-colors text-left cursor-pointer group hover:bg-[#FAF9F6]"
                title={isSignalsOpen ? 'Collapse Signals section' : 'Expand Signals section'}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {isSignalsOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-[#C85A32] shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-[#75736E] group-hover:text-[#1A1917] shrink-0" />
                  )}
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold truncate text-[#1A1917]">
                    Signals & Processes
                  </span>
                </div>
                <span className="text-[9px] font-mono text-[#A8A69E] shrink-0">01–07</span>
              </button>
            )}

            {/* Modules 01 to 07 list */}
            {isSignalsOpen &&
              MODULES.map((m) => {
                const isActive =
                  !isWorkspace &&
                  currentSection !== 'am-view' &&
                  currentModuleNumber === m.moduleNumber;

                if (isCollapsed) {
                  /* COLLAPSED RAIL: ICONS ONLY */
                  return (
                    <div key={m.id} className="relative group w-full flex justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectChapter('signals');
                          onSelectModule(m.moduleNumber);
                        }}
                        className={`relative flex items-center justify-center w-10 h-10 rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85A32] cursor-pointer ${
                          isActive
                            ? 'bg-[#FBF4F0] text-[#C85A32] border border-[#C85A32]/40 shadow-2xs'
                            : 'text-[#65635E] hover:text-[#1A1917] hover:bg-[#FAF9F6]'
                        }`}
                        aria-label={`Module ${m.index}: ${m.name}`}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-[#C85A32] rounded-r-full" />
                        )}
                        <ModuleGlyph id={m.id} className="w-4 h-4" accent={isActive} />
                      </button>

                      {/* Accessible hover tooltip */}
                      <div
                        role="tooltip"
                        className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[#1A1917] text-white text-xs font-medium rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50 flex flex-col"
                      >
                        <span className="font-bold text-[#C85A32]">Module {m.index}</span>
                        <span className="text-[11px] text-[#D1CFCE]">{m.name}</span>
                      </div>
                    </div>
                  );
                }

                /* EXPANDED: Full module tile */
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onSelectChapter('signals');
                      onSelectModule(m.moduleNumber);
                    }}
                    className={`w-full flex items-center gap-2.5 p-2 rounded-md transition-all border text-left group cursor-pointer ${
                      isActive
                        ? 'bg-[#FBF4F0] border-[#C85A32]/40 text-[#C85A32] shadow-2xs'
                        : 'bg-white border-[#E6E4DD] hover:border-[#D1CFCE] hover:bg-[#FAF9F6] text-[#585651]'
                    }`}
                  >
                    <span
                      className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                        isActive
                          ? 'bg-[#C85A32] text-white'
                          : 'bg-[#EFEFEA] text-[#75736E] group-hover:text-[#1A1917]'
                      }`}
                    >
                      {m.index}
                    </span>

                    <div
                      className={`w-6 h-6 rounded flex items-center justify-center shrink-0 border ${
                        isActive
                          ? 'bg-white border-[#C85A32]/40 text-[#C85A32]'
                          : 'bg-[#FAF9F6] border-[#E6E4DD] text-[#75736E] group-hover:text-[#1A1917]'
                      }`}
                    >
                      <ModuleGlyph id={m.id} className="w-3.5 h-3.5" accent={isActive} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-xs font-semibold truncate ${
                          isActive ? 'text-[#1A1917]' : 'text-[#2D2B28] group-hover:text-[#1A1917]'
                        }`}
                      >
                        {m.name}
                      </div>
                      <div className="text-[10px] text-[#75736E] truncate mt-0.5">
                        {m.tag}
                      </div>
                    </div>
                  </button>
                );
              })}

            {/* ============================================================== */}
            {/* SECTION 2: Amplitude Modulation (01–07 / 2.1–2.7)             */}
            {/* ============================================================== */}
            {!isCollapsed && (
              <button
                type="button"
                onClick={() => {
                  const next = !isAmOpen;
                  setIsAmOpen(next);
                  if (next) setIsSignalsOpen(false);
                }}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded transition-colors text-left cursor-pointer group mt-2.5 hover:bg-[#FAF9F6]"
                title={isAmOpen ? 'Collapse Amplitude Modulation section' : 'Expand Amplitude Modulation section'}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  {isAmOpen ? (
                    <ChevronDown className="w-3.5 h-3.5 text-[#C85A32] shrink-0" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-[#75736E] group-hover:text-[#1A1917] shrink-0" />
                  )}
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold truncate text-[#1A1917]">
                    Amplitude Modulation
                  </span>
                </div>
                {/* 01-07 replaces former 5 topics badge */}
                <span className="text-[9px] font-mono text-[#A8A69E] shrink-0">
                  01–07
                </span>
              </button>
            )}

            {/* AM Sub-topics List with Module Numbers (01 to 07) */}
            {isAmOpen &&
              AM_MODULES.map((sub) => {
                const isActive =
                  !isWorkspace &&
                  currentSection === 'am-view' &&
                  currentAmId === sub.id;

                if (isCollapsed) {
                  /* COLLAPSED RAIL: ICONS ONLY */
                  return (
                    <div key={sub.id} className="relative group w-full flex justify-center">
                      <button
                        type="button"
                        onClick={() => {
                          onSelectChapter('am');
                          onSelectAmSubTopic(sub.id);
                        }}
                        className={`relative flex items-center justify-center w-10 h-10 rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85A32] cursor-pointer ${
                          isActive
                            ? 'bg-[#FBF4F0] text-[#C85A32] border border-[#C85A32]/40 shadow-2xs'
                            : 'text-[#65635E] hover:text-[#1A1917] hover:bg-[#FAF9F6]'
                        }`}
                        aria-label={`Module ${sub.index}: ${sub.name}`}
                      >
                        {isActive && (
                          <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-[#C85A32] rounded-r-full" />
                        )}
                        <ModuleGlyph id={sub.id} className="w-4 h-4" accent={isActive} />
                      </button>

                      {/* Accessible hover tooltip */}
                      <div
                        role="tooltip"
                        className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-[#1A1917] text-white text-xs font-medium rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50 flex flex-col"
                      >
                        <span className="font-bold text-[#C85A32]">Module {sub.index}</span>
                        <span className="text-[11px] text-[#D1CFCE]">{sub.name}</span>
                      </div>
                    </div>
                  );
                }

                /* EXPANDED: Matching the exact size, width, styling and padding of Signal module tiles */
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => {
                      onSelectChapter('am');
                      onSelectAmSubTopic(sub.id);
                    }}
                    className={`w-full flex items-center gap-2.5 p-2 rounded-md transition-all border text-left group cursor-pointer ${
                      isActive
                        ? 'bg-[#FBF4F0] border-[#C85A32]/40 text-[#C85A32] shadow-2xs'
                        : 'bg-white border-[#E6E4DD] hover:border-[#D1CFCE] hover:bg-[#FAF9F6] text-[#585651]'
                    }`}
                  >
                    {/* Module Number badge (01 to 05, matching Signal sidebar) */}
                    <span
                      className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 ${
                        isActive
                          ? 'bg-[#C85A32] text-white'
                          : 'bg-[#EFEFEA] text-[#75736E] group-hover:text-[#1A1917]'
                      }`}
                    >
                      {sub.index}
                    </span>

                    <div
                      className={`w-6 h-6 rounded flex items-center justify-center shrink-0 border ${
                        isActive
                          ? 'bg-white border-[#C85A32]/40 text-[#C85A32]'
                          : 'bg-[#FAF9F6] border-[#E6E4DD] text-[#75736E] group-hover:text-[#1A1917]'
                      }`}
                    >
                      <ModuleGlyph id={sub.id} className="w-3.5 h-3.5" accent={isActive} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div
                        className={`text-xs font-semibold truncate ${
                          isActive ? 'text-[#1A1917]' : 'text-[#2D2B28] group-hover:text-[#1A1917]'
                        }`}
                      >
                        {sub.name}
                      </div>
                      <div className="text-[10px] text-[#75736E] truncate mt-0.5">
                        {sub.tag}
                      </div>
                    </div>
                  </button>
                );
              })}
          </nav>
        </div>

        {/* Bottom Section: Preferences / Settings */}
        <div className="pt-2 border-t border-[#E6E4DD] flex flex-col gap-1">
          {isCollapsed ? (
            /* Collapsed: Pure Settings Icon with Tooltip */
            <div className="relative group w-full flex justify-center">
              <button
                type="button"
                onClick={onOpenSettings}
                className="flex items-center justify-center w-10 h-10 rounded-md text-[#65635E] hover:text-[#1A1917] hover:bg-[#FAF9F6] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85A32] cursor-pointer"
                aria-label="Workspace Preferences"
              >
                <Settings className="w-4 h-4" />
              </button>
              <div
                role="tooltip"
                className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-[#1A1917] text-white text-xs font-medium rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50"
              >
                Preferences
              </div>
            </div>
          ) : (
            /* Expanded: Settings Icon + Label */
            <button
              type="button"
              onClick={onOpenSettings}
              className="w-full flex items-center justify-start py-2 px-3 gap-2.5 rounded-md text-left text-[#65635E] hover:text-[#1A1917] hover:bg-[#FAF9F6] transition-colors cursor-pointer"
            >
              <Settings className="w-4 h-4 shrink-0" />
              <span className="text-xs font-medium">Preferences</span>
            </button>
          )}
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-white border-b border-[#E6E4DD]">
        <button
          onClick={onNavigateHome}
          className="flex items-center gap-2.5 text-left cursor-pointer"
        >
          <div className="w-7 h-7 rounded bg-[#FAF9F6] border border-[#E6E4DD] flex items-center justify-center text-[#C85A32]">
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h2.5c1.5 0 2-6 3.5-6s2 12 3.5 12 2-6 3.5-6H21" />
            </svg>
          </div>
          <span className="text-xs font-bold tracking-widest text-[#1A1917]">SIGNAL LAB</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSettings}
            aria-label="Settings"
            className="p-2 text-[#65635E] hover:text-[#1A1917] rounded-md cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            aria-label={mobileDrawerOpen ? 'Close Menu' : 'Open Navigation Menu'}
            className="p-2 text-[#1A1917] rounded-md hover:bg-[#FAF9F6] cursor-pointer"
          >
            {mobileDrawerOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
            aria-hidden="true"
          />

          <div
            className="relative w-4/5 max-w-xs bg-white h-full shadow-lg border-r border-[#E6E4DD] flex flex-col justify-between p-5 z-10 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation"
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#E6E4DD]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-[#FBF4F0] border border-[#E6E4DD] flex items-center justify-center text-[#C85A32]">
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 12h2.5c1.5 0 2-6 3.5-6s2 12 3.5 12 2-6 3.5-6H21" />
                    </svg>
                  </div>
                  <span className="text-xs font-bold tracking-widest text-[#1A1917]">SIGNAL LAB</span>
                </div>
                <button
                  onClick={() => setMobileDrawerOpen(false)}
                  className="p-1.5 text-[#65635E] hover:text-[#1A1917] rounded cursor-pointer"
                  aria-label="Close Menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Mobile Section Switcher */}
              <div className="mt-4 p-1 bg-[#FAF9F6] border border-[#E6E4DD] rounded-lg flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsSignalsOpen(true);
                    setIsAmOpen(false);
                    onSelectChapter('signals');
                  }}
                  className={`flex-1 py-1.5 px-2 text-xs font-mono font-semibold rounded transition-all text-center ${
                    activeChapter === 'signals'
                      ? 'bg-white text-[#C85A32] shadow-2xs font-bold'
                      : 'text-[#75736E]'
                  }`}
                >
                  Signals
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAmOpen(true);
                    setIsSignalsOpen(false);
                    onSelectChapter('am');
                  }}
                  className={`flex-1 py-1.5 px-2 text-xs font-mono font-semibold rounded transition-all text-center ${
                    activeChapter === 'am'
                      ? 'bg-white text-[#C85A32] shadow-2xs font-bold'
                      : 'text-[#75736E]'
                  }`}
                >
                  Amplitude Mod
                </button>
              </div>

              {/* Module List in Drawer */}
              <div className="mt-4 pt-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#75736E] mb-2 px-1">
                  {activeChapter === 'signals' ? 'Signals & Processes (01–07)' : 'Amplitude Modulation (01–07)'}
                </div>

                <nav className="flex flex-col gap-1" aria-label="Mobile Module Items">
                  {activeChapter === 'signals'
                    ? MODULES.map((m) => {
                        const isActive =
                          !isWorkspace &&
                          currentSection !== 'am-view' &&
                          currentModuleNumber === m.moduleNumber;
                        return (
                          <button
                            key={m.id}
                            onClick={() => {
                              onSelectModule(m.moduleNumber);
                              setMobileDrawerOpen(false);
                            }}
                            className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-xs font-medium transition-colors text-left cursor-pointer ${
                              isActive
                                ? 'bg-[#FBF4F0] text-[#C85A32] border border-[#C85A32]/20 font-semibold'
                                : 'text-[#484642] hover:bg-[#FAF9F6]'
                            }`}
                          >
                            <span className="font-mono text-[10px] bg-[#EFEFEA] px-1.5 py-0.5 rounded font-bold text-[#1A1917]">
                              {m.index}
                            </span>
                            <span className="truncate flex-1">{m.name}</span>
                          </button>
                        );
                      })
                    : AM_MODULES.map((sub) => {
                        const isActive =
                          !isWorkspace &&
                          currentSection === 'am-view' &&
                          currentAmId === sub.id;
                        return (
                          <button
                            key={sub.id}
                            onClick={() => {
                              onSelectAmSubTopic(sub.id);
                              setMobileDrawerOpen(false);
                            }}
                            className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-xs font-medium transition-colors text-left cursor-pointer ${
                              isActive
                                ? 'bg-[#FBF4F0] text-[#C85A32] border border-[#C85A32]/20 font-semibold'
                                : 'text-[#484642] hover:bg-[#FAF9F6]'
                            }`}
                          >
                            <span className="font-mono text-[10px] bg-[#EFEFEA] px-1.5 py-0.5 rounded font-bold text-[#1A1917]">
                              {sub.index}
                            </span>
                            <span className="truncate flex-1">{sub.name}</span>
                          </button>
                        );
                      })}
                </nav>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E6E4DD]">
              <button
                onClick={() => {
                  setMobileDrawerOpen(false);
                  onOpenSettings();
                }}
                className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-xs text-[#65635E] hover:text-[#1A1917] hover:bg-[#FAF9F6] transition-colors cursor-pointer"
              >
                <Settings className="w-4 h-4" />
                <span>Workspace Preferences</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
