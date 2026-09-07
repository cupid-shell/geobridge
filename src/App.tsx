import { Header } from './components/common/Header';
import { SelfServiceRunner } from './components/consumer/SelfServiceRunner';
import { RecipeStudio } from './components/studio/RecipeStudio';
import { DocumentationView } from './components/docs/DocumentationView';
import { useGeoBridgeStore } from './store/useGeoBridgeStore';
import { Compass, ShieldCheck, Database, FileSpreadsheet } from 'lucide-react';

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

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-10 py-10">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 text-sm text-slate-500">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-slate-800 font-bold text-sm">
                <Compass className="w-4 h-4 text-emerald-600" />
                <span>GeoBridge Platform</span>
              </div>
              <p className="leading-relaxed">
                Empowering GIS specialists to automate spatial lookups and eliminate repetitive spreadsheet requests from business teams.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-slate-800 mb-2 flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Zero Server Footprint</span>
              </h4>
              <p className="leading-relaxed">
                All spatial math (Point-in-Polygon, Nearest Distance, Buffer Intersect) executes 100% inside your browser's WebAssembly and JavaScript engines. No customer data leaves your device.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-slate-800 mb-2 flex items-center space-x-1.5">
                <Database className="w-3.5 h-3.5 text-indigo-600" />
                <span>Modern Spatial Formats</span>
              </h4>
              <p className="leading-relaxed">
                Compatible with GeoJSON, Shapefile layers, CSV, and Excel (.xlsx, .xls) files. Ready for enterprise geospatial pipelines.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-slate-800 mb-2 flex items-center space-x-1.5">
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                <span>Instant Turnaround</span>
              </h4>
              <p className="leading-relaxed">
                Replaces 2-day GIS analyst turnaround queues with instant 2-second self-service calculations for sales, marketing, and operations.
              </p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400">
            <p>© 2026 GeoBridge. Built for Geospatial Specialists & Modern Teams.</p>
            <p className="mt-2 sm:mt-0 font-medium">Turf.js • MapLibre GL • SheetJS</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
