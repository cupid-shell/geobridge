import { Header } from './components/common/Header';
import { SelfServiceRunner } from './components/consumer/SelfServiceRunner';
import { RecipeStudio } from './components/studio/RecipeStudio';
import { DocumentationView } from './components/docs/DocumentationView';
import { useGeoBridgeStore } from './store/useGeoBridgeStore';

export function App() {
  const { appMode } = useGeoBridgeStore();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-emerald-500 selection:text-white">
      <Header />

      <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-8">
        {appMode === 'consumer' && <SelfServiceRunner />}
        {appMode === 'studio' && <RecipeStudio />}
        {appMode === 'docs' && <DocumentationView />}
      </main>

      {/* Professional Minimal Footer */}
      <footer className="bg-white border-t border-slate-200 py-3.5 mt-auto">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 font-medium">
          <p>GeoBridge — In-Browser Spatial Calculator</p>
          <p className="font-mono text-slate-400">EPSG:4326 (WGS84) • Client-Side Processing</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
