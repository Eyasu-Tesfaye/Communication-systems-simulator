/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from './router';
import { MODULES, SignalModule, findModuleByPathOrId } from './data/modules';
import { NavigationRail } from './components/NavigationRail';
import { WorkspaceHeader } from './components/WorkspaceHeader';
import { FeaturedWorkspace } from './components/FeaturedWorkspace';
import { ModuleExplorer } from './components/ModuleExplorer';
import { SettingsModal } from './components/SettingsModal';

// Exact isolated component slots imported cleanly:
import Module1_Convolution from './modules/Module1_Convolution.jsx';
import Module2_Fourier from './modules/Module2_Fourier.jsx';
import Module3_RandomProcess from './modules/Module3_RandomProcess.jsx';
import Module4_SignalExplorer from './modules/Module4_SignalExplorer.jsx';
import Module5_Correlation from './modules/Module5_Correlation.jsx';
import Module6_EulerSignals from './modules/Module6_EulerSignals.jsx';
import Module7_Probability from './modules/Module7_Probability.jsx';

export default function App() {
  const { currentPath, navigate } = useRouter();
  const [activeSection, setActiveSection] = useState<'workspace' | 'modules' | 'module-view'>('workspace');
  const [currentModuleNumber, setCurrentModuleNumber] = useState<number>(1); // Default to Module 1 Convolution
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [showSubtleGrid, setShowSubtleGrid] = useState<boolean>(false);
  const [selectedHubModuleId, setSelectedHubModuleId] = useState<string>('convolution');

  // Sync route path to currentModuleNumber
  useEffect(() => {
    if (currentPath === '/') {
      setActiveSection('workspace');
    } else {
      const found = findModuleByPathOrId(currentPath);
      if (found) {
        setCurrentModuleNumber(found.moduleNumber);
        setSelectedHubModuleId(found.id);
        setActiveSection('module-view');
      }
    }
  }, [currentPath]);

  // Jump directly to module by number (1 to 7 in original order)
  const handleSelectModuleNumber = useCallback(
    (num: number) => {
      const target = MODULES.find((m) => m.moduleNumber === num);
      if (target) {
        setCurrentModuleNumber(num);
        setSelectedHubModuleId(target.id);
        setActiveSection('module-view');
        navigate(target.path);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [navigate]
  );

  // Global keyboard shortcuts for instructor (keys 1-7, [ and ] for prev/next)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key >= '1' && e.key <= '7' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleSelectModuleNumber(parseInt(e.key, 10));
      } else if (e.key === '[' || (e.altKey && e.key === 'ArrowLeft')) {
        e.preventDefault();
        const prev = currentModuleNumber > 1 ? currentModuleNumber - 1 : 7;
        handleSelectModuleNumber(prev);
      } else if (e.key === ']' || (e.altKey && e.key === 'ArrowRight')) {
        e.preventDefault();
        const next = currentModuleNumber < 7 ? currentModuleNumber + 1 : 1;
        handleSelectModuleNumber(next);
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        setIsSidebarCollapsed((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentModuleNumber, handleSelectModuleNumber]);

  // Switch between workspace hub and modules explorer
  const handleSelectSection = (section: 'workspace' | 'modules') => {
    setActiveSection(section);
    if (currentPath !== '/') {
      navigate('/');
      setTimeout(() => {
        if (section === 'modules') {
          document.getElementById('module-explorer')?.scrollIntoView({ behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 50);
    } else {
      if (section === 'modules') {
        document.getElementById('module-explorer')?.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  };

  const handleBrowseModules = () => {
    setActiveSection('modules');
    document.getElementById('module-explorer')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Render the active module component slot in original order
  const renderActiveModuleSlot = () => {
    const commonProps = {
      onNavigateHome: () => {
        setActiveSection('workspace');
        navigate('/');
      },
      onNavigateModule: (pathOrNum: string | number) => {
        if (typeof pathOrNum === 'number') {
          handleSelectModuleNumber(pathOrNum);
        } else {
          const mod = findModuleByPathOrId(pathOrNum);
          if (mod) handleSelectModuleNumber(mod.moduleNumber);
        }
      },
      isInstructorMode: true,
    };

    // Clean 1-to-1 mapping matching filenames Module1 to Module7:
    // 1: convolution -> Module1_Convolution
    // 2: fourier -> Module2_Fourier
    // 3: random-processes -> Module3_RandomProcess
    // 4: signals -> Module4_SignalExplorer
    // 5: correlation-spectrum -> Module5_Correlation
    // 6: complex-signals -> Module6_EulerSignals
    // 7: probability -> Module7_Probability
    switch (currentModuleNumber) {
      case 1:
        return <Module1_Convolution {...commonProps} />;
      case 2:
        return <Module2_Fourier {...commonProps} />;
      case 3:
        return <Module3_RandomProcess {...commonProps} />;
      case 4:
        return <Module4_SignalExplorer {...commonProps} />;
      case 5:
        return <Module5_Correlation {...commonProps} />;
      case 6:
        return <Module6_EulerSignals {...commonProps} />;
      case 7:
        return <Module7_Probability {...commonProps} />;
      default:
        return <Module1_Convolution {...commonProps} />;
    }
  };

  return (
    <div
      className={`min-h-screen bg-white text-[#1A1917] flex flex-col md:flex-row ${
        showSubtleGrid ? 'bg-[radial-gradient(#E6E4DD_1px,transparent_1px)] [background-size:24px_24px]' : ''
      }`}
    >
      {/* 1. Collapsible Sidebar (with module headings written in collapsed form) */}
      <NavigationRail
        currentSection={activeSection}
        currentModuleNumber={currentModuleNumber}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        onSelectSection={handleSelectSection}
        onSelectModule={handleSelectModuleNumber}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onNavigateHome={() => {
          setActiveSection('workspace');
          navigate('/');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      />

      {/* Main Content Area (No top navigation bar) */}
      <div className="flex-1 min-w-0 flex flex-col">
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          {activeSection === 'module-view' ? (
            /* Dedicated Module Slot Workspace */
            <div className="animate-in fade-in duration-100">
              {renderActiveModuleSlot()}
            </div>
          ) : (
            /* Primary Signal Lab Workspace Hub */
            <div className="flex flex-col">
              <WorkspaceHeader />

              <FeaturedWorkspace
                onOpenSignalExplorer={() => {
                  const mod = findModuleByPathOrId('signals');
                  if (mod) handleSelectModuleNumber(mod.moduleNumber);
                }}
                onBrowseModules={handleBrowseModules}
              />

              <ModuleExplorer
                modules={MODULES}
                selectedModuleId={selectedHubModuleId}
                onSelectModule={(mod: SignalModule) => setSelectedHubModuleId(mod.id)}
                onOpenWorkspace={(path: string) => {
                  const m = findModuleByPathOrId(path);
                  if (m) handleSelectModuleNumber(m.moduleNumber);
                }}
              />
            </div>
          )}
        </main>

        {/* Quiet Minimal Footer */}
        <footer className="border-t border-[#E6E4DD] bg-[#FAF9F6] py-5 mt-10 text-xs text-[#75736E]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-mono">
              <span className="font-semibold text-[#1A1917]">SIGNAL LAB</span>
              <span>·</span>
              <span>Interactive Signals & Communication Systems Laboratory</span>
            </div>
            <div className="flex items-center gap-4 text-[#75736E] font-mono text-[11px]">
              <span>7 Modules in Original Order</span>
              <span>·</span>
              <span>Hotkeys: Press [1]–[7]</span>
            </div>
          </div>
        </footer>
      </div>

      {/* Preferences & Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        showSubtleGrid={showSubtleGrid}
        onToggleGrid={() => setShowSubtleGrid(!showSubtleGrid)}
      />
    </div>
  );
}
