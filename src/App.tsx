/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from './router';
import {
  MODULES,
  AM_MODULES,
  SignalModule,
  AMSubTopic,
  findModuleByPathOrId,
  findAMModuleByPathOrId,
} from './data/modules';
import { NavigationRail } from './components/NavigationRail';
import { WorkspaceHeader } from './components/WorkspaceHeader';
import { FeaturedWorkspace } from './components/FeaturedWorkspace';
import { ModuleExplorer } from './components/ModuleExplorer';
import { SettingsModal } from './components/SettingsModal';

// Signals & Random Processes Modules:
import Module1_Convolution from './modules/Module1_Convolution.jsx';
import Module2_Fourier from './modules/Module2_Fourier.jsx';
import Module3_RandomProcess from './modules/Module3_RandomProcess.jsx';
import Module4_SignalExplorer from './modules/Module4_SignalExplorer.jsx';
import Module5_Correlation from './modules/Module5_Correlation.jsx';
import Module6_EulerSignals from './modules/Module6_EulerSignals.jsx';
import Module7_Probability from './modules/Module7_Probability.jsx';

// Amplitude Modulation Modules (2.1 – 2.7):
import {
  Module2_1_CAM,
  Module2_2_DSBSC,
  Module2_3_SSB,
  Module2_4_VSB,
  Module2_5_FM,
  Module2_6_AM_PM,
  Module2_7_Demodulation,
} from './modules/am';

export default function App() {
  const { currentPath, navigate } = useRouter();
  const [activeSection, setActiveSection] = useState<'workspace' | 'modules' | 'module-view' | 'am-view'>('workspace');
  const [activeChapter, setActiveChapter] = useState<'signals' | 'am'>('signals');
  const [currentModuleNumber, setCurrentModuleNumber] = useState<number>(1); // Default to Module 1 Convolution
  const [currentAmId, setCurrentAmId] = useState<string>('cam'); // Default to CAM
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [showSubtleGrid, setShowSubtleGrid] = useState<boolean>(false);
  const [selectedHubModuleId, setSelectedHubModuleId] = useState<string>('convolution');

  // Sync route path to activeSection, chapter, and active module/sub-topic
  useEffect(() => {
    if (currentPath === '/') {
      setActiveSection('workspace');
      setSelectedHubModuleId(MODULES[0].id);
      setCurrentModuleNumber(MODULES[0].moduleNumber);
      setActiveChapter('signals');
    } else {
      // Check if it matches an AM Sub-topic
      const amFound = findAMModuleByPathOrId(currentPath);
      if (amFound) {
        setCurrentAmId(amFound.id);
        setActiveChapter('am');
        setActiveSection('am-view');
        return;
      }

      // Check if it matches a Signals module
      const found = findModuleByPathOrId(currentPath);
      if (found) {
        setCurrentModuleNumber(found.moduleNumber);
        setSelectedHubModuleId(found.id);
        setActiveChapter('signals');
        setActiveSection('module-view');
        return;
      }
    }
  }, [currentPath]);

  // Jump directly to a module by number (1 to 7)
  const handleSelectModuleNumber = useCallback(
    (num: number) => {
      const target = MODULES.find((m) => m.moduleNumber === num);
      if (target) {
        setCurrentModuleNumber(num);
        setSelectedHubModuleId(target.id);
        setActiveChapter('signals');
        setActiveSection('module-view');
        navigate(target.path);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [navigate]
  );

  // Jump directly to an AM sub-topic by id (cam, dsb-sc, ssb, vsb, demodulation)
  const handleSelectAmSubTopic = useCallback(
    (subTopicId: string) => {
      const target = AM_MODULES.find((m) => m.id === subTopicId);
      if (target) {
        setCurrentAmId(target.id);
        setActiveChapter('am');
        setActiveSection('am-view');
        navigate(target.path);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    },
    [navigate]
  );

  // Switch between Signals and Amplitude Modulation
  const handleSelectChapter = useCallback(
    (chapter: 'signals' | 'am') => {
      setActiveChapter(chapter);
      if (chapter === 'am') {
        const target = AM_MODULES.find((m) => m.id === currentAmId) || AM_MODULES[0];
        handleSelectAmSubTopic(target.id);
      } else {
        const target = MODULES.find((m) => m.moduleNumber === currentModuleNumber) || MODULES[0];
        handleSelectModuleNumber(target.moduleNumber);
      }
    },
    [currentAmId, currentModuleNumber, handleSelectAmSubTopic, handleSelectModuleNumber]
  );

  // Return to workspace hub
  const handleNavigateHome = useCallback(() => {
    setActiveSection('workspace');
    setSelectedHubModuleId(MODULES[0].id);
    setCurrentModuleNumber(MODULES[0].moduleNumber);
    setActiveChapter('signals');
    navigate('/');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [navigate]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key >= '1' && e.key <= '7' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        const num = parseInt(e.key, 10);
        if (activeChapter === 'am') {
          if (num >= 1 && num <= AM_MODULES.length) {
            handleSelectAmSubTopic(AM_MODULES[num - 1].id);
          }
        } else {
          handleSelectModuleNumber(num);
        }
      } else if (e.key === '[' || (e.altKey && e.key === 'ArrowLeft')) {
        e.preventDefault();
        if (activeChapter === 'am') {
          const idx = AM_MODULES.findIndex((m) => m.id === currentAmId);
          const prev = idx > 0 ? AM_MODULES[idx - 1] : AM_MODULES[AM_MODULES.length - 1];
          handleSelectAmSubTopic(prev.id);
        } else {
          const prev = currentModuleNumber > 1 ? currentModuleNumber - 1 : 7;
          handleSelectModuleNumber(prev);
        }
      } else if (e.key === ']' || (e.altKey && e.key === 'ArrowRight')) {
        e.preventDefault();
        if (activeChapter === 'am') {
          const idx = AM_MODULES.findIndex((m) => m.id === currentAmId);
          const next = idx < AM_MODULES.length - 1 ? AM_MODULES[idx + 1] : AM_MODULES[0];
          handleSelectAmSubTopic(next.id);
        } else {
          const next = currentModuleNumber < 7 ? currentModuleNumber + 1 : 1;
          handleSelectModuleNumber(next);
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'b' || e.key === 'B')) {
        e.preventDefault();
        setIsSidebarCollapsed((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeChapter, currentAmId, currentModuleNumber, handleSelectAmSubTopic, handleSelectModuleNumber]);

  const handleBrowseModules = () => {
    setActiveSection('modules');
    document.getElementById('module-explorer')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Render the active module component slot for Signals & Random Processes
  const renderActiveModuleSlot = () => {
    const commonProps = {
      onNavigateHome: handleNavigateHome,
      onNavigateModule: (pathOrNum: string | number) => {
        if (typeof pathOrNum === 'number') {
          handleSelectModuleNumber(pathOrNum);
        } else {
          const mod = findModuleByPathOrId(pathOrNum);
          if (mod) handleSelectModuleNumber(mod.moduleNumber);
          else {
            const amMod = findAMModuleByPathOrId(pathOrNum);
            if (amMod) handleSelectAmSubTopic(amMod.id);
          }
        }
      },
      isInstructorMode: true,
    };

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

  // Render the active view for Amplitude Modulation (2.1 to 2.7)
  const renderActiveAmSlot = () => {
    const handleAmNavigate = (path: string) => {
      const am = findAMModuleByPathOrId(path);
      if (am) {
        handleSelectAmSubTopic(am.id);
      } else {
        const sig = findModuleByPathOrId(path);
        if (sig) handleSelectModuleNumber(sig.moduleNumber);
        else navigate(path);
      }
    };

    switch (currentAmId) {
      case 'cam':
      case '2.1':
      case '01':
        return (
          <Module2_1_CAM
            onNavigateHome={handleNavigateHome}
            onNavigateModule={handleAmNavigate}
          />
        );
      case 'dsb-sc':
      case '2.2':
      case '02':
        return (
          <Module2_2_DSBSC
            onNavigateHome={handleNavigateHome}
            onNavigateModule={handleAmNavigate}
          />
        );
      case 'ssb':
      case '2.3':
      case '03':
        return (
          <Module2_3_SSB
            onNavigateHome={handleNavigateHome}
            onNavigateModule={handleAmNavigate}
          />
        );
      case 'vsb':
      case '2.4':
      case '04':
        return (
          <Module2_4_VSB
            onNavigateHome={handleNavigateHome}
            onNavigateModule={handleAmNavigate}
          />
        );
      case 'fm':
      case '2.5':
      case '05':
        return (
          <Module2_5_FM
            onNavigateHome={handleNavigateHome}
            onNavigateModule={handleAmNavigate}
          />
        );
      case 'am-pm':
      case 'pm':
      case '2.6':
      case '06':
        return (
          <Module2_6_AM_PM
            onNavigateHome={handleNavigateHome}
            onNavigateModule={handleAmNavigate}
          />
        );
      case 'demodulation':
      case '2.7':
      case '07':
        return (
          <Module2_7_Demodulation
            onNavigateHome={handleNavigateHome}
            onNavigateModule={handleAmNavigate}
          />
        );
      default:
        return (
          <Module2_1_CAM
            onNavigateHome={handleNavigateHome}
            onNavigateModule={handleAmNavigate}
          />
        );
    }
  };

  return (
    <div
      className={`min-h-screen bg-white text-[#1A1917] flex flex-col md:flex-row ${
        showSubtleGrid ? 'bg-[radial-gradient(#E6E4DD_1px,transparent_1px)] [background-size:24px_24px]' : ''
      }`}
    >
      {/* 1. Collapsible Sidebar Navigation Rail */}
      <NavigationRail
        currentSection={activeSection}
        activeChapter={activeChapter}
        isWorkspaceHub={activeSection !== 'module-view' && activeSection !== 'am-view'}
        currentModuleNumber={currentModuleNumber}
        currentAmId={currentAmId}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
        onSelectChapter={handleSelectChapter}
        onSelectModule={handleSelectModuleNumber}
        onSelectAmSubTopic={handleSelectAmSubTopic}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onNavigateHome={handleNavigateHome}
      />

      {/* 2. Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
          {activeSection === 'am-view' ? (
            /* Dedicated Amplitude Modulation Workspace */
            <div className="animate-in fade-in duration-100">
              {renderActiveAmSlot()}
            </div>
          ) : activeSection === 'module-view' ? (
            /* Dedicated Signals Module Slot Workspace */
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
                  else {
                    const am = findAMModuleByPathOrId(path);
                    if (am) handleSelectAmSubTopic(am.id);
                  }
                }}
              />
            </div>
          )}
        </main>

        {/* Compact Minimal Global Footer */}
        <footer className="border-t border-[#E6E4DD]/80 bg-[#FAF9F6] py-2 px-4 sm:px-6 lg:px-8 mt-4 text-[11px] text-[#8C8983]">
          <div className="max-w-6xl mx-auto flex items-center justify-between font-mono">
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-[#1A1917]">SIGNAL LAB</span>
              <span className="text-[#D1CFCE]">·</span>
              <span>Communication Systems Simulator</span>
            </div>
            <div className="text-[10px] text-[#A8A69E]">
              Hotkeys: [1]–[7]
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
