import React, { useEffect } from 'react';
import { X, Keyboard, Eye, Cpu } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  showSubtleGrid: boolean;
  onToggleGrid: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  showSubtleGrid,
  onToggleGrid,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        className="w-full max-w-lg bg-white rounded-lg border border-[#E6E4DD] shadow-lg p-6 sm:p-7 relative"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E6E4DD]">
          <div className="flex items-center gap-2">
            <h2 id="settings-modal-title" className="text-base font-bold text-[#1A1917]">
              Workspace Preferences
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#75736E] hover:text-[#1A1917] rounded-md hover:bg-[#FAF9F6] transition-colors"
            aria-label="Close preferences"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="py-5 space-y-6">
          {/* Display Preferences */}
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-3 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-[#585651]" />
              <span>Canvas Display</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-md bg-[#FAF9F6] border border-[#E6E4DD]">
              <div>
                <span className="text-sm font-medium text-[#1A1917] block">Engineering Grid Background</span>
                <span className="text-xs text-[#75736E] block mt-0.5">
                  Displays a fine 24px hairline coordinate grid across the workspace.
                </span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={showSubtleGrid}
                onClick={onToggleGrid}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#C85A32] ${
                  showSubtleGrid ? 'bg-[#C85A32]' : 'bg-[#DCD9D0]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                    showSubtleGrid ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-3 flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5 text-[#585651]" />
              <span>Keyboard Navigation & Shortcuts</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 bg-[#FAF9F6] rounded border border-[#E6E4DD] flex items-center justify-between">
                <span className="text-[#585651] font-medium">Play simulation</span>
                <kbd className="font-mono bg-white px-2 py-0.5 rounded border border-[#C85A32]/40 text-[#C85A32] font-bold shadow-2xs">
                  P
                </kbd>
              </div>
              <div className="p-2.5 bg-[#FAF9F6] rounded border border-[#E6E4DD] flex items-center justify-between">
                <span className="text-[#585651] font-medium">Pause simulation</span>
                <kbd className="font-mono bg-white px-2 py-0.5 rounded border border-[#1A1917]/30 text-[#1A1917] font-bold shadow-2xs">
                  H
                </kbd>
              </div>
              <div className="p-2.5 bg-[#FAF9F6] rounded border border-[#E6E4DD] flex items-center justify-between">
                <span className="text-[#585651]">Select module</span>
                <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-[#E6E4DD] text-[#1A1917]">
                  ↑ / ↓
                </kbd>
              </div>
              <div className="p-2.5 bg-[#FAF9F6] rounded border border-[#E6E4DD] flex items-center justify-between">
                <span className="text-[#585651]">Open workspace</span>
                <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-[#E6E4DD] text-[#1A1917]">
                  Enter
                </kbd>
              </div>
              <div className="p-2.5 bg-[#FAF9F6] rounded border border-[#E6E4DD] flex items-center justify-between">
                <span className="text-[#585651]">Exit Fullscreen</span>
                <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-[#E6E4DD] text-[#1A1917]">
                  Esc
                </kbd>
              </div>
              <div className="p-2.5 bg-[#FAF9F6] rounded border border-[#E6E4DD] flex items-center justify-between">
                <span className="text-[#585651]">Close modal</span>
                <kbd className="font-mono bg-white px-1.5 py-0.5 rounded border border-[#E6E4DD] text-[#1A1917]">
                  Esc
                </kbd>
              </div>
            </div>
          </div>

          {/* Workspace Architecture Details */}
          <div>
            <div className="text-xs font-mono uppercase tracking-wider text-[#75736E] mb-2 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#585651]" />
              <span>System Specifications</span>
            </div>
            <div className="p-3 bg-[#FAF9F6] rounded-md border border-[#E6E4DD] text-xs space-y-1.5 text-[#585651] font-mono">
              <div className="flex justify-between">
                <span>Architecture</span>
                <span className="text-[#1A1917]">Signal Lab Client v1.0</span>
              </div>
              <div className="flex justify-between">
                <span>Active Modules</span>
                <span className="text-[#1A1917]">07 Connected Labs</span>
              </div>
              <div className="flex justify-between">
                <span>Color Calibration</span>
                <span className="text-[#1A1917]">Terracotta #C85A32 / Warm Neutral</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-[#E6E4DD] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#1A1917] hover:bg-[#2D2B28] text-white text-xs font-semibold rounded-md transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
