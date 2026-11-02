import React, { useState, useEffect } from 'react';
import {
  Settings,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  SlidersHorizontal,
} from 'lucide-react';
import { MODULES } from '../data/modules';
import { ModuleGlyph } from './ModuleGlyphs';

interface NavigationRailProps {
  currentSection?: string;
  currentModuleNumber?: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSelectSection?: (section: any) => void;
  onSelectModule: (moduleNumber: number) => void;
  onOpenSettings: () => void;
  onNavigateHome: () => void;
}

export const NavigationRail: React.FC<NavigationRailProps> = ({
  currentModuleNumber = 1,
  isCollapsed,
  onToggleCollapse,
  onSelectModule,
  onOpenSettings,
  onNavigateHome,
}) => {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

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
      {/* Desktop Collapsible Navigation Sidebar (No scrollbar slider, icons only when collapsed) */}
      <aside
        className={`hidden md:flex flex-col justify-between shrink-0 h-screen sticky top-0 bg-white border-r border-[#E6E4DD] z-30 transition-all duration-200 ease-in-out select-none overflow-hidden ${
          isCollapsed ? 'w-[68px] py-3.5 px-2' : 'w-64 py-4 px-3.5'
        }`}
        aria-label="Workspace Navigation Sidebar"
      >
        {/* Top Section */}
        <div className="flex flex-col w-full min-h-0">
          {/* Header Brand & Toggle */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-[#E6E4DD]">
            {isCollapsed ? (
              /* Collapsed: Pure icons for brand & expand toggle */
              <div className="flex flex-col items-center w-full gap-2">
                <button
                  type="button"
                  onClick={onNavigateHome}
                  className="w-9 h-9 rounded-md bg-[#FAF9F6] border border-[#E6E4DD] hover:border-[#C85A32]/40 transition-colors flex items-center justify-center text-[#C85A32]"
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
                  className="w-8 h-8 rounded flex items-center justify-center text-[#75736E] hover:text-[#1A1917] hover:bg-[#FAF9F6] transition-colors"
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
                  className="flex items-center gap-2.5 text-left group"
                >
                  <div className="w-8 h-8 rounded-md bg-[#FAF9F6] border border-[#E6E4DD] flex items-center justify-center text-[#C85A32] group-hover:border-[#C85A32]/40 transition-colors">
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
                    <span className="font-mono text-xs font-bold tracking-wider text-[#1A1917] block">
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
                  className="p-1 rounded text-[#75736E] hover:text-[#1A1917] hover:bg-[#FAF9F6] transition-colors"
                  title="Collapse sidebar"
                  aria-label="Collapse sidebar"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#75736E] px-2 py-1 mb-1 flex items-center justify-between">
              <span>Modules</span>
              <span className="text-[9px] text-[#A8A69E]">01–07</span>
            </div>
          )}

          {/* All 7 Modules (No scrollbar / slider: scrollbar completely hidden) */}
          <nav
            className="flex flex-col gap-1 py-1 flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Modules List"
          >
            {MODULES.map((m) => {
              const isActive = currentModuleNumber === m.moduleNumber;

              if (isCollapsed) {
                /* COLLAPSED: ICONS ONLY (No writings, clean centered icon with tooltip) */
                return (
                  <div key={m.id} className="relative group w-full flex justify-center">
                    <button
                      type="button"
                      onClick={() => onSelectModule(m.moduleNumber)}
                      className={`relative flex items-center justify-center w-10 h-10 rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85A32] ${
                        isActive
                          ? 'bg-[#FBF4F0] text-[#C85A32] border border-[#C85A32]/40 shadow-2xs'
                          : 'text-[#65635E] hover:text-[#1A1917] hover:bg-[#FAF9F6]'
                      }`}
                      aria-label={`Module ${m.index}: ${m.name}`}
                    >
                      {/* Active indicator bar */}
                      {isActive && (
                        <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-[#C85A32] rounded-r-full" />
                      )}

                      <ModuleGlyph id={m.id} className="w-4 h-4" accent={isActive} />
                    </button>

                    {/* Accessible hover tooltip showing module info */}
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

              /* EXPANDED: Full module tile with index badge, icon, and title */
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSelectModule(m.moduleNumber)}
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
                className="flex items-center justify-center w-10 h-10 rounded-md text-[#65635E] hover:text-[#1A1917] hover:bg-[#FAF9F6] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C85A32]"
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
              className="w-full flex items-center justify-start py-2 px-3 gap-2.5 rounded-md text-left text-[#65635E] hover:text-[#1A1917] hover:bg-[#FAF9F6] transition-colors"
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
          className="flex items-center gap-2.5 text-left"
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
            className="p-2 text-[#65635E] hover:text-[#1A1917] rounded-md"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
            aria-label={mobileDrawerOpen ? 'Close Menu' : 'Open Navigation Menu'}
            className="p-2 text-[#1A1917] rounded-md hover:bg-[#FAF9F6]"
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
                  className="p-1.5 text-[#65635E] hover:text-[#1A1917] rounded"
                  aria-label="Close Menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 7 Modules in Drawer */}
              <div className="mt-4 pt-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#75736E] mb-2 px-1">
                  All 7 Modules
                </div>
                <nav className="flex flex-col gap-1" aria-label="Mobile Module Items">
                  {MODULES.map((m) => {
                    const isActive = currentModuleNumber === m.moduleNumber;
                    return (
                      <button
                        key={m.id}
                        onClick={() => {
                          onSelectModule(m.moduleNumber);
                          setMobileDrawerOpen(false);
                        }}
                        className={`flex items-center gap-2.5 w-full px-2.5 py-2 rounded-md text-xs font-medium transition-colors text-left ${
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
                className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-xs text-[#65635E] hover:text-[#1A1917] hover:bg-[#FAF9F6] transition-colors"
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
