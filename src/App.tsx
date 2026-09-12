import { useEffect } from 'react';
import { Header } from './components/common/Header';
import { SelfServiceRunner } from './components/consumer/SelfServiceRunner';
import { RecipeStudio } from './components/studio/RecipeStudio';
import { DocumentationView } from './components/docs/DocumentationView';
import { useGeoBridgeStore } from './store/useGeoBridgeStore';

export function App() {
  const { appMode, hydrateFromStorage } = useGeoBridgeStore();

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  return (
    <div className="min-h-screen bg-surface-canvas text-slate-900 flex flex-col selection:bg-accent-600 selection:text-white font-sans antialiased">
      <Header />

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-6">
        {appMode === 'consumer' && <SelfServiceRunner />}
        {appMode === 'studio' && <RecipeStudio />}
        {appMode === 'docs' && <DocumentationView />}
      </main>

      {/* Professional Minimal Footer */}
      <footer className="bg-surface-card border-t border-surface-border py-3.5 mt-auto">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-medium gap-2">
          <p className="font-medium text-slate-600">GeoBridge — In-Browser Spatial Calculation Engine</p>
          <p className="font-mono text-xs text-slate-400">EPSG:4326 (WGS84) • Flatbush R-Tree • Client-Side Zero Egress</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
