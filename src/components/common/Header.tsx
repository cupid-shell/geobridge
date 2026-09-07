import React from 'react';
import { Layers, ShieldCheck, Wrench, FileSpreadsheet, RotateCcw, BookOpen } from 'lucide-react';
import { useGeoBridgeStore } from '../../store/useGeoBridgeStore';

export const Header: React.FC = () => {
  const { appMode, setAppMode, recipes, resetToDefaults } = useGeoBridgeStore();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-sm">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between h-20">
          
          {/* Logo & Tagline */}
          <div className="flex items-center space-x-3.5 cursor-pointer" onClick={() => setAppMode('consumer')}>
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <span className="text-2xl font-black tracking-tight text-slate-900">
                  Geo<span className="text-emerald-600">Bridge</span>
                </span>
                <span className="px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200/60">
                  v1.0
                </span>
              </div>
              <p className="text-sm text-slate-500 font-medium">
                Self-Service Spatial Calculator for Modern Teams
              </p>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 shadow-inner">
            <button
              onClick={() => setAppMode('consumer')}
              className={`flex items-center space-x-2 px-5 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                appMode === 'consumer'
                  ? 'bg-white text-emerald-700 shadow-md shadow-slate-200/50 scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Analysis Portal</span>
            </button>

            <button
              onClick={() => setAppMode('studio')}
              className={`flex items-center space-x-2 px-5 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                appMode === 'studio'
                  ? 'bg-white text-indigo-700 shadow-md shadow-slate-200/50 scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Wrench className="w-4 h-4 text-indigo-600" />
              <span>Recipe Studio</span>
              <span className="ml-1.5 px-2 py-0.5 text-xs font-bold bg-indigo-100 text-indigo-700 rounded-md">
                {recipes.length}
              </span>
            </button>

            <button
              onClick={() => setAppMode('docs')}
              className={`flex items-center space-x-2 px-5 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                appMode === 'docs'
                  ? 'bg-white text-blue-700 shadow-md shadow-slate-200/50 scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4 text-blue-600" />
              <span>Documentation</span>
            </button>
          </div>

          {/* Privacy & Utilities */}
          <div className="flex items-center space-x-4">
            <div className="hidden lg:flex items-center space-x-2 bg-emerald-50 text-emerald-800 px-4 py-2 rounded-full border border-emerald-200 text-sm font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>100% In-Browser Private</span>
            </div>

            <button
              onClick={() => {
                if (confirm('Reset all recipes and layers to factory presets?')) {
                  resetToDefaults();
                }
              }}
              title="Reset to factory presets"
              className="p-2.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>

        </div>
      </div>
    </header>
  );
};
