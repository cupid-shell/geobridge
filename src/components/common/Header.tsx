import React, { useState } from 'react';
import { Layers, ShieldCheck, Wrench, FileSpreadsheet, RotateCcw, BookOpen, AlertCircle } from 'lucide-react';
import { useGeoBridgeStore } from '../../store/useGeoBridgeStore';
import { SegmentedControl } from '../ui/SegmentedControl';
import { Button } from '../ui/Button';

export const Header: React.FC = () => {
  const { appMode, setAppMode, recipes, resetToDefaults } = useGeoBridgeStore();
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const navOptions = [
    {
      value: 'consumer' as const,
      label: 'Spreadsheet Matcher',
      icon: <FileSpreadsheet className="w-3.5 h-3.5" />,
    },
    {
      value: 'studio' as const,
      label: 'Template Builder (GIS)',
      icon: <Wrench className="w-3.5 h-3.5" />,
      badge: recipes.length,
    },
    {
      value: 'docs' as const,
      label: 'Guides & Help',
      icon: <BookOpen className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-2xs">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          
          {/* Logo & Product Brand */}
          <div
            className="flex items-center space-x-3 cursor-pointer select-none"
            onClick={() => setAppMode('consumer')}
          >
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-xs">
              <Layers className="w-4 h-4" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-base font-semibold tracking-tight text-slate-900">
                GeoBridge
              </span>
              <span className="text-[10px] font-mono text-slate-400 font-medium">
                v1.2
              </span>
            </div>
          </div>

          {/* Centered Segmented Navigation */}
          <div className="hidden md:block">
            <SegmentedControl
              options={navOptions}
              value={appMode}
              onChange={(val) => setAppMode(val as any)}
              size="md"
            />
          </div>

          {/* Telemetry & Actions */}
          <div className="flex items-center space-x-3">
            <div className="hidden sm:flex items-center space-x-1.5 text-xs text-slate-500 font-medium px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-md">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
              <span>100% Private (No Data Leaves Device)</span>
            </div>

            {/* Reset Defaults with Clean Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowResetConfirm(!showResetConfirm)}
                title="Reset to factory presets"
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {showResetConfirm && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl p-4 z-50 animate-in fade-in-50 zoom-in-95">
                  <div className="flex items-start space-x-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-semibold text-slate-900">
                        Reset to factory presets?
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        This will restore default reference layers and recipes. Custom items will be cleared.
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-end space-x-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setShowResetConfirm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      onClick={() => {
                        resetToDefaults();
                        setShowResetConfirm(false);
                      }}
                    >
                      Reset Defaults
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Mobile Navigation */}
        <div className="md:hidden py-2 border-t border-slate-100 flex justify-center">
          <SegmentedControl
            options={navOptions}
            value={appMode}
            onChange={(val) => setAppMode(val as any)}
            size="sm"
          />
        </div>
      </div>
    </header>
  );
};
