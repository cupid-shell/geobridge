import React, { useState } from 'react';
import {
  BookOpen,
  Sparkles,
  Zap,
  Layers,
  ShieldCheck,
  FileSpreadsheet,
  Compass,
  ArrowRight,
  HelpCircle,
  Code2,
  Download,
} from 'lucide-react';
import { useGeoBridgeStore } from '../../store/useGeoBridgeStore';

export const DocumentationView: React.FC = () => {
  const { setAppMode } = useGeoBridgeStore();
  const [activeSection, setActiveSection] = useState<'quickstart' | 'operations' | 'custom-tools' | 'privacy' | 'faq'>('quickstart');

  const navItems = [
    { id: 'quickstart', label: 'Quick Start Guide', icon: Zap },
    { id: 'operations', label: 'Spatial Operations Guide', icon: Compass },
    { id: 'custom-tools', label: 'Creating Custom Tools (GIS Guide)', icon: Layers },
    { id: 'privacy', label: 'Architecture & Privacy', icon: ShieldCheck },
    { id: 'faq', label: 'Troubleshooting & FAQ', icon: HelpCircle },
  ] as const;

  return (
    <div className="space-y-8 pb-20">
      
      {/* Doc Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider mb-2 border border-blue-200/80">
            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
            <span>Platform Documentation & Guides</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
            GeoBridge User & Specialist Guide
          </h1>
          <p className="text-slate-600 text-base sm:text-lg mt-1 max-w-3xl leading-relaxed">
            Everything you need to know about enriching spreadsheets, authoring custom spatial recipes, and integrating GIS intelligence without writing code.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => setAppMode('consumer')}
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md shadow-emerald-600/20 transition-all"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Launch Analysis Portal</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Documentation Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Navigation Sidebar */}
        <div className="lg:col-span-3 sticky top-28 space-y-2 bg-white p-4 rounded-2xl border border-slate-200/90 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 px-3 py-2 block">
            Navigation
          </span>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-bold transition-all text-left ${
                  isActive
                    ? 'bg-emerald-50 text-emerald-800 shadow-sm border border-emerald-200/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="pt-4 mt-4 border-t border-slate-100 px-3">
            <span className="text-xs font-semibold text-slate-500 block mb-2">Need sample data?</span>
            <a
              href="/demo_customer_leads.xlsx"
              download="demo_customer_leads.xlsx"
              className="inline-flex items-center space-x-2 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Demo .xlsx</span>
            </a>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-9 bg-white p-8 sm:p-10 rounded-2xl border border-slate-200/90 shadow-sm space-y-10">
          
          {/* SECTION 1: QUICK START */}
          {activeSection === 'quickstart' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div>
                <h2 className="text-2xl font-black text-slate-900 mb-2 flex items-center space-x-2.5">
                  <Zap className="w-6 h-6 text-emerald-600" />
                  <span>Quick Start Guide</span>
                </h2>
                <p className="text-slate-600 text-base leading-relaxed">
                  Enrich any spreadsheet in 3 simple steps without writing SQL, Python, or waiting in a GIS backlog.
                </p>
              </div>

              {/* Steps */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-base shadow-sm">
                    1
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">Select a Recipe</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Choose an authoritative calculation recipe published by your GIS team (e.g. Sales Territory Assignment, Nearest Facility Distance, or Flood Zone Checker).
                  </p>
                </div>

                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-base shadow-sm">
                    2
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">Drop Your File</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Upload any Excel (.xlsx, .xls) or CSV spreadsheet containing Latitude and Longitude columns. The system auto-detects coordinate headers.
                  </p>
                </div>

                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-base shadow-sm">
                    3
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">Run & Export</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Click <strong>Run Spatial Enrichment</strong>. View the results on the interactive vector map and download your enriched spreadsheet in 1 click.
                  </p>
                </div>
              </div>

              {/* Callout */}
              <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-start space-x-3 text-sm text-emerald-950">
                <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold mb-0.5">Try it in 10 seconds:</strong>
                  <span>
                    Go to the <strong>Analysis Portal</strong> tab, click <strong>"Quick Load Sample"</strong> to populate 20 test customer leads into memory, and click <strong>"Run Spatial Enrichment"</strong>.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: SPATIAL OPERATIONS */}
          {activeSection === 'operations' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div>
                <h2 className="text-2xl font-black text-slate-900 mb-2 flex items-center space-x-2.5">
                  <Compass className="w-6 h-6 text-emerald-600" />
                  <span>Understanding Spatial Operations</span>
                </h2>
                <p className="text-slate-600 text-base leading-relaxed">
                  GeoBridge supports three fundamental geospatial operations that power 90% of business spatial analytics.
                </p>
              </div>

              <div className="space-y-6">
                {/* Op 1 */}
                <div className="p-6 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                      <span>1. Point in Polygon (Boundary & Territory Matching)</span>
                    </h3>
                    <span className="px-3 py-1 text-xs font-bold bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                      Most Common
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Determines whether a coordinate falls inside any boundary polygon. If a match is found, attributes from the polygon (e.g., Regional Manager, Tax Tier, District Code) are appended to that row.
                  </p>
                  <div className="bg-slate-50 p-4 rounded-xl text-xs font-mono text-slate-700 border border-slate-200">
                    Example: Lead in Seattle (47.60, -122.33) &rarr; Matches "Western Region" &rarr; Appends Manager "Sarah Lin"
                  </div>
                </div>

                {/* Op 2 */}
                <div className="p-6 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                      <span>2. Nearest Neighbor & Facility Distance</span>
                    </h3>
                    <span className="px-3 py-1 text-xs font-bold bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200">
                      Logistics & Supply Chain
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Scans all facility locations (warehouses, stores, hubs) in the reference layer and finds the closest one. Appends the facility name, facility code, and numerical distance (in miles or kilometers).
                  </p>
                  <div className="bg-slate-50 p-4 rounded-xl text-xs font-mono text-slate-700 border border-slate-200">
                    Example: Store in Austin, TX &rarr; Closest Hub: "Dallas-Fort Worth Hub" &rarr; Distance: 182.4 miles
                  </div>
                </div>

                {/* Op 3 */}
                <div className="p-6 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                      <span>3. Proximity Buffer & Hazard Intersect</span>
                    </h3>
                    <span className="px-3 py-1 text-xs font-bold bg-amber-50 text-amber-700 rounded-full border border-amber-200">
                      Risk & Compliance
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Applies a custom radial buffer (e.g. 5km, 10km, 25km) around reference shapes or hazard corridors and identifies points that fall inside the impact radius.
                  </p>
                  <div className="bg-slate-50 p-4 rounded-xl text-xs font-mono text-slate-700 border border-slate-200">
                    Example: Warehouse within 5km of Gulf Hurricane Belt &rarr; Flags "Underwriting Tier: Critical"
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: CREATING CUSTOM TOOLS */}
          {activeSection === 'custom-tools' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div>
                <h2 className="text-2xl font-black text-slate-900 mb-2 flex items-center space-x-2.5">
                  <Layers className="w-6 h-6 text-indigo-600" />
                  <span>GIS Specialist Guide: Authoring Custom Recipes</span>
                </h2>
                <p className="text-slate-600 text-base leading-relaxed">
                  How GIS analysts and administrators can upload company boundaries and publish turnkey spatial recipes for their organization.
                </p>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white inline-flex items-center justify-center text-xs font-bold">1</span>
                    <span>Step 1: Prepare Your GeoJSON Layer</span>
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Export your authoritative layer from QGIS, ArcGIS Pro, or Python. Ensure:
                  </p>
                  <ul className="list-disc list-inside text-sm text-slate-700 space-y-1 pl-2">
                    <li>CRS must be <strong>WGS84 (EPSG:4326)</strong> with coordinates in <code>[longitude, latitude]</code> format.</li>
                    <li>Feature attributes should have clean column names (e.g., <code>territory_id</code>, <code>manager_email</code>).</li>
                    <li>Geometry types can be <code>Polygon</code>, <code>MultiPolygon</code>, or <code>Point</code>.</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white inline-flex items-center justify-center text-xs font-bold">2</span>
                    <span>Step 2: Upload into GIS Recipe Studio</span>
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Navigate to the <strong>Recipe Studio</strong> tab. On the right side, drag and drop your GeoJSON file into the <strong>"Upload New Reference Layer"</strong> box.
                  </p>
                </div>

                <div className="space-y-3">
                  <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-full bg-indigo-600 text-white inline-flex items-center justify-center text-xs font-bold">3</span>
                    <span>Step 3: Map Output Columns & Publish</span>
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Give your recipe a title and choose the spatial operation. In the <strong>Output Column Mappings</strong> section, pick which attributes to append to the spreadsheet and set default fallback values (e.g. "Unassigned").
                  </p>
                  <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 font-medium">
                    <strong>Tip:</strong> Click any attribute chip under the active layer preview to automatically add it as a new output column mapping without typing.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: PRIVACY & ARCHITECTURE */}
          {activeSection === 'privacy' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div>
                <h2 className="text-2xl font-black text-slate-900 mb-2 flex items-center space-x-2.5">
                  <ShieldCheck className="w-6 h-6 text-emerald-600" />
                  <span>Architecture & 100% In-Browser Privacy</span>
                </h2>
                <p className="text-slate-600 text-base leading-relaxed">
                  Why GeoBridge is safe for confidential customer spreadsheets, regulated defense boundaries, and healthcare location data.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <ShieldCheck className="w-7 h-7 text-emerald-600" />
                  <h3 className="font-bold text-slate-900 text-base">Zero Data Leaves Your Device</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    All spreadsheet parsing, coordinate detection, spatial joins, and file exports execute locally in the browser runtime via Turf.js and WebAssembly. No files are uploaded to an external server.
                  </p>
                </div>

                <div className="p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <Code2 className="w-7 h-7 text-indigo-600" />
                  <h3 className="font-bold text-slate-900 text-base">Zero Infrastructure Cost</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    Because processing runs on client hardware, organizations avoid expensive PostGIS database hosting, heavy GPU servers, or recurring per-seat SaaS licensing costs.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: FAQ & TROUBLESHOOTING */}
          {activeSection === 'faq' && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div>
                <h2 className="text-2xl font-black text-slate-900 mb-2 flex items-center space-x-2.5">
                  <HelpCircle className="w-6 h-6 text-slate-700" />
                  <span>Troubleshooting & FAQ</span>
                </h2>
                <p className="text-slate-600 text-base leading-relaxed">
                  Common spatial data questions and quick solutions.
                </p>
              </div>

              <div className="space-y-4">
                <details className="group p-5 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer">
                  <summary className="font-bold text-slate-900 text-sm list-none flex items-center justify-between">
                    <span>Why are my points plotting off the coast of Africa or Antarctica?</span>
                    <span className="text-slate-400 group-open:rotate-180 transition-transform text-xs font-mono">[-]</span>
                  </summary>
                  <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                    This is the classic <strong>Coordinate Axis Inversion</strong> issue (Latitude and Longitude swapped). Latitude must be between -90 and +90, while Longitude is between -180 and +180. Click the <strong>"Swap Lat / Lon"</strong> button in Step 3 to instantly fix this.
                  </p>
                </details>

                <details className="group p-5 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer">
                  <summary className="font-bold text-slate-900 text-sm list-none flex items-center justify-between">
                    <span>What spreadsheet formats are supported?</span>
                    <span className="text-slate-400 group-open:rotate-180 transition-transform text-xs font-mono">[-]</span>
                  </summary>
                  <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                    GeoBridge supports Microsoft Excel files (<code>.xlsx</code>, <code>.xls</code>) and standard Comma-Separated Values (<code>.csv</code>) files up to 100MB in memory.
                  </p>
                </details>

                <details className="group p-5 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer">
                  <summary className="font-bold text-slate-900 text-sm list-none flex items-center justify-between">
                    <span>What coordinate system (CRS) must my data be in?</span>
                    <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                    Standard GPS coordinates: <strong>WGS84 (EPSG:4326)</strong> in decimal degrees. If your data is in State Plane or UTM coordinates, reproject to EPSG:4326 before uploading.
                  </p>
                </details>

                <details className="group p-5 bg-slate-50 rounded-2xl border border-slate-200 cursor-pointer">
                  <summary className="font-bold text-slate-900 text-sm list-none flex items-center justify-between">
                    <span>Where are my custom recipes stored?</span>
                    <span className="text-slate-400 group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                    Custom recipes and reference layers are safely saved in your browser's persistent <code>localStorage</code>. They remain available every time you open the app.
                  </p>
                </details>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
};
