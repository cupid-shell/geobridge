import React, { useState } from 'react';
import {
  Sparkles,
  Zap,
  Layers,
  ShieldCheck,
  FileSpreadsheet,
  Compass,
  HelpCircle,
  Code2,
  Download,
  GitMerge,
  PackageOpen,
  ChevronDown,
} from 'lucide-react';
import { useGeoBridgeStore } from '../../store/useGeoBridgeStore';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export const DocumentationView: React.FC = () => {
  const { setAppMode } = useGeoBridgeStore();
  const [activeSection, setActiveSection] = useState<'quickstart' | 'operations' | 'pipelines' | 'custom-tools' | 'privacy' | 'faq'>('quickstart');

  const navItems = [
    { id: 'quickstart', label: 'Quick Start Guide', icon: Zap },
    { id: 'operations', label: 'Spatial Operations Guide', icon: Compass },
    { id: 'pipelines', label: 'Pipelines & Portable Packages', icon: GitMerge },
    { id: 'custom-tools', label: 'Authoring Custom Recipes', icon: Layers },
    { id: 'privacy', label: 'Architecture & Privacy', icon: ShieldCheck },
    { id: 'faq', label: 'Troubleshooting & FAQ', icon: HelpCircle },
  ] as const;

  return (
    <div className="space-y-6 pb-16">
      
      {/* Doc Command Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-surface-border">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Platform Documentation & Engineering Guide
            </h1>
            <Badge variant="neutral" size="sm">
              v1.2 Spec
            </Badge>
          </div>
          <p className="text-sm text-slate-500 font-normal mt-1">
            Reference manual for spreadsheet enrichment, multi-stage pipeline authoring, and in-browser geospatial architecture.
          </p>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0">
          <Button
            variant="primary"
            size="sm"
            onClick={() => setAppMode('consumer')}
            leftIcon={<FileSpreadsheet className="w-3.5 h-3.5" />}
          >
            Launch Analysis Portal
          </Button>
        </div>
      </div>

      {/* Main Documentation Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Navigation Sidebar */}
        <div className="lg:col-span-3 sticky top-24 space-y-1 bg-surface-card p-3 rounded-xl border border-surface-border shadow-2xs">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-3 py-1.5 block">
            Table of Contents
          </span>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center space-x-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors text-left cursor-pointer ${
                  isActive
                    ? 'bg-surface-subtle text-accent-700 shadow-2xs border border-surface-border'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-surface-subtle'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-accent-600' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="pt-3 mt-3 border-t border-surface-border px-3">
            <span className="text-[11px] font-medium text-slate-500 block mb-1.5">Need sample test data?</span>
            <a
              href="/demo_customer_leads.xlsx"
              download="demo_customer_leads.xlsx"
              className="inline-flex items-center space-x-1.5 text-xs font-semibold text-accent-700 hover:text-accent-900"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Demo .xlsx</span>
            </a>
          </div>
        </div>

        {/* Right Content Area */}
        <div className="lg:col-span-9 bg-surface-card p-6 sm:p-8 rounded-xl border border-surface-border shadow-2xs space-y-8">
          
          {/* SECTION 1: QUICK START */}
          {activeSection === 'quickstart' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1 flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-accent-600" />
                  <span>Quick Start Guide</span>
                </h2>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Enrich any coordinate spreadsheet in three deterministic steps with zero configuration or backend infrastructure.
                </p>
              </div>

              {/* Steps */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-surface-subtle rounded-lg border border-surface-border space-y-2">
                  <div className="w-7 h-7 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                    1
                  </div>
                  <h3 className="font-bold text-slate-900 text-xs">Select a Recipe</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">
                    Choose an authoritative calculation contract published by your GIS team (e.g. Sales Territory Assignment or Facility Proximity).
                  </p>
                </div>

                <div className="p-4 bg-surface-subtle rounded-lg border border-surface-border space-y-2">
                  <div className="w-7 h-7 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                    2
                  </div>
                  <h3 className="font-bold text-slate-900 text-xs">Drop Your Spreadsheet</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">
                    Upload an Excel (.xlsx, .xls) or CSV file. Latitude and Longitude columns are detected automatically via regex heuristic analysis.
                  </p>
                </div>

                <div className="p-4 bg-surface-subtle rounded-lg border border-surface-border space-y-2">
                  <div className="w-7 h-7 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
                    3
                  </div>
                  <h3 className="font-bold text-slate-900 text-xs">Execute & Export</h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-normal">
                    Click <strong>Execute Spatial Enrichment</strong>. Inspect records on the cartographic canvas and export a dual-sheet audit workbook.
                  </p>
                </div>
              </div>

              {/* Callout */}
              <div className="p-4 bg-surface-subtle rounded-lg border border-surface-border flex items-start space-x-3 text-xs text-slate-800">
                <Sparkles className="w-4 h-4 text-accent-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold mb-0.5 text-slate-900">Instant In-Memory Simulation:</strong>
                  <span className="text-slate-600 font-normal">
                    Switch to the <strong>Analysis Portal</strong> tab, click <strong>"Quick Load"</strong> to mount 20 test customer leads in memory, and click <strong>"Execute Spatial Enrichment"</strong>.
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: SPATIAL OPERATIONS */}
          {activeSection === 'operations' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1 flex items-center space-x-2">
                  <Compass className="w-5 h-5 text-accent-600" />
                  <span>Spatial Operations Specifications</span>
                </h2>
                <p className="text-slate-500 text-xs leading-relaxed">
                  GeoBridge supports three core geospatial primitives powered by Turf.js narrow-phase and Flatbush broad-phase bounding-box filtering.
                </p>
              </div>

              <div className="space-y-4">
                {/* Op 1 */}
                <div className="p-4 border border-surface-border rounded-lg space-y-2 bg-surface-card">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900 flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
                      <span>1. Point in Polygon (Boundary & Territory Containment)</span>
                    </h3>
                    <Badge variant="info" size="sm">
                      Standard
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    Evaluates ray-casting containment tests to determine whether a coordinate falls inside any boundary polygon. If matched, attributes (e.g. Territory Name, Tax District, Assigned Executive) are joined.
                  </p>
                  <div className="bg-surface-subtle p-3 rounded-md text-xs font-mono text-slate-700 border border-surface-border">
                    Example: Coordinate (47.60, -122.33) &rarr; Matches "Western Region" &rarr; Appends Manager "Sarah Lin"
                  </div>
                </div>

                {/* Op 2 */}
                <div className="p-4 border border-surface-border rounded-lg space-y-2 bg-surface-card">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900 flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />
                      <span>2. Nearest Neighbor & Facility Distance</span>
                    </h3>
                    <Badge variant="success" size="sm">
                      Logistics
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    Calculates great-circle orthodromic distances across all target points in the reference layer to determine the closest facility, appending both facility attributes and exact numerical distance in miles or kilometers.
                  </p>
                  <div className="bg-surface-subtle p-3 rounded-md text-xs font-mono text-slate-700 border border-surface-border">
                    Example: Store in Austin, TX &rarr; Closest Hub: "Dallas-Fort Worth Hub" &rarr; Distance: 182.4 miles
                  </div>
                </div>

                {/* Op 3 */}
                <div className="p-4 border border-surface-border rounded-lg space-y-2 bg-surface-card">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-900 flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-amber-600 inline-block" />
                      <span>3. Proximity Buffer & Hazard Intersect</span>
                    </h3>
                    <Badge variant="warning" size="sm">
                      Risk & Compliance
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    Synthesizes a geodesic circular buffer around target features at a configured radius (e.g. 5km, 25km) and flags points falling within the buffer envelope.
                  </p>
                  <div className="bg-surface-subtle p-3 rounded-md text-xs font-mono text-slate-700 border border-surface-border">
                    Example: Property within 5km of Hurricane Inundation Zone &rarr; Flags "Underwriting Tier: Critical"
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION: MULTI-STEP PIPELINES & BUNDLES */}
          {activeSection === 'pipelines' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1 flex items-center space-x-2">
                  <GitMerge className="w-5 h-5 text-accent-600" />
                  <span>Chained Pipelines & Portable Packages</span>
                </h2>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Enterprise workflows frequently require combining territorial assignment, logistics routing, and risk screening in a single deterministic pass.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-surface-border rounded-lg space-y-3 bg-surface-subtle">
                  <div className="flex items-center space-x-2">
                    <GitMerge className="w-4 h-4 text-accent-600" />
                    <h3 className="text-xs font-bold text-slate-900">Multi-Stage Execution Pipelines</h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    Chains sequential operations in a single background worker pass:
                  </p>
                  <ul className="list-disc list-inside text-xs text-slate-700 space-y-1 pl-1 font-normal">
                    <li><strong>Stage 1:</strong> Point-in-Polygon sales territory assignment.</li>
                    <li><strong>Stage 2:</strong> Nearest distribution hub identification and mileage calculation.</li>
                    <li><strong>Stage 3:</strong> Catastrophe flood/hazard proximity screening.</li>
                  </ul>
                </div>

                <div className="p-4 border border-surface-border rounded-lg space-y-3 bg-surface-subtle">
                  <div className="flex items-center space-x-2">
                    <PackageOpen className="w-4 h-4 text-accent-600" />
                    <h3 className="text-xs font-bold text-slate-900">Portable .georecipe Packages</h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    Eliminates configuration overhead with single-file packages:
                  </p>
                  <ul className="list-disc list-inside text-xs text-slate-700 space-y-1 pl-1 font-normal">
                    <li><strong>Embedded Layers:</strong> All GeoJSON geometries are serialized within the package.</li>
                    <li><strong>Zero Cloud Setup:</strong> Business users drag the package into the portal to begin.</li>
                    <li><strong>IndexedDB Persistence:</strong> Bundles unpack directly into local client-side storage.</li>
                  </ul>
                </div>
              </div>

              <div className="p-4 bg-surface-subtle border border-surface-border rounded-lg space-y-1.5">
                <h4 className="text-xs font-bold text-slate-900">
                  Dual-Sheet Audit Trail & Exception Reports
                </h4>
                <p className="text-xs text-slate-600 leading-relaxed font-normal">
                  All Excel exports output Sheet 1 (Enriched Data) alongside Sheet 2 (<code>Processing_Audit_Trail</code>) documenting calculation timestamps, software version, recipe steps, and match confidence breakdown. Unmatched records can be exported in one click to an isolated Exceptions Workbook for address verification.
                </p>
              </div>
            </div>
          )}

          {/* SECTION 3: CREATING CUSTOM TOOLS */}
          {activeSection === 'custom-tools' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1 flex items-center space-x-2">
                  <Layers className="w-5 h-5 text-accent-600" />
                  <span>Authoring Custom Recipes (GIS Specialist Guide)</span>
                </h2>
                <p className="text-slate-500 text-xs leading-relaxed">
                  How GIS analysts and data engineers author, test, and distribute turnkey spatial recipes.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-surface-subtle rounded-lg border border-surface-border space-y-2">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center space-x-2">
                    <span className="w-5 h-5 rounded bg-slate-900 text-white inline-flex items-center justify-center text-[10px] font-bold">1</span>
                    <span>Prepare GeoJSON Layer</span>
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    Export your authoritative polygons or facility points from ArcGIS, QGIS, or PostGIS:
                  </p>
                  <ul className="list-disc list-inside text-xs text-slate-700 space-y-1 pl-2 font-normal">
                    <li>CRS: Standard <strong>WGS84 (EPSG:4326)</strong> in decimal degrees <code>[longitude, latitude]</code>.</li>
                    <li>Attributes: Use clean property names (e.g., <code>territory_id</code>, <code>manager_name</code>).</li>
                    <li>Geometry: FeatureCollections containing Polygon, MultiPolygon, or Point features.</li>
                  </ul>
                </div>

                <div className="p-4 bg-surface-subtle rounded-lg border border-surface-border space-y-2">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center space-x-2">
                    <span className="w-5 h-5 rounded bg-slate-900 text-white inline-flex items-center justify-center text-[10px] font-bold">2</span>
                    <span>Upload to Recipe Studio</span>
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    In the <strong>GIS Recipe Studio</strong> tab, drop your GeoJSON file into the upload dropzone. Features and attribute names are parsed immediately into local storage.
                  </p>
                </div>

                <div className="p-4 bg-surface-subtle rounded-lg border border-surface-border space-y-2">
                  <h3 className="text-xs font-bold text-slate-900 flex items-center space-x-2">
                    <span className="w-5 h-5 rounded bg-slate-900 text-white inline-flex items-center justify-center text-[10px] font-bold">3</span>
                    <span>Configure Schema & Publish</span>
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    Map source feature properties to target spreadsheet column headers. Define fallback strings for unassigned coordinates and export the resulting configuration as a portable <code>.georecipe</code> bundle.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: PRIVACY & ARCHITECTURE */}
          {activeSection === 'privacy' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1 flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-accent-600" />
                  <span>In-Browser Privacy & Systems Architecture</span>
                </h2>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Engineered for compliance-regulated organizations handling confidential customer records and proprietary facilities.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-surface-subtle border border-surface-border rounded-lg space-y-2">
                  <ShieldCheck className="w-5 h-5 text-accent-600" />
                  <h3 className="font-bold text-slate-900 text-xs">Zero External Server Egress</h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    All file parsing, coordinate validation, spatial intersections, and export generations execute strictly within browser memory. No rows or geometries are transmitted to external servers.
                  </p>
                </div>

                <div className="p-4 bg-surface-subtle border border-surface-border rounded-lg space-y-2">
                  <Code2 className="w-5 h-5 text-slate-600" />
                  <h3 className="font-bold text-slate-900 text-xs">Zero Cloud Infrastructure Overhead</h3>
                  <p className="text-xs text-slate-600 leading-relaxed font-normal">
                    Calculations utilize client CPU cores through dedicated Web Workers and Flatbush R-Tree spatial indexing, eliminating PostGIS server maintenance and cloud compute fees.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: FAQ & TROUBLESHOOTING */}
          {activeSection === 'faq' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1 flex items-center space-x-2">
                  <HelpCircle className="w-5 h-5 text-slate-700" />
                  <span>Troubleshooting & Technical FAQ</span>
                </h2>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Solutions for common coordinate errors, projections, and storage limits.
                </p>
              </div>

              <div className="space-y-3">
                <details className="group p-4 bg-surface-subtle rounded-lg border border-surface-border cursor-pointer">
                  <summary className="font-semibold text-slate-900 text-xs list-none flex items-center justify-between">
                    <span>Why are coordinates plotting in the ocean or flipped?</span>
                    <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
                  </summary>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed font-normal">
                    This is coordinate axis inversion (Latitude and Longitude swapped). Latitude is bounded between -90 and +90, while Longitude is between -180 and +180. Click the <strong>"Swap Lat/Lon"</strong> button in the Location Resolution card to invert the axes.
                  </p>
                </details>

                <details className="group p-4 bg-surface-subtle rounded-lg border border-surface-border cursor-pointer">
                  <summary className="font-semibold text-slate-900 text-xs list-none flex items-center justify-between">
                    <span>What spreadsheet formats and sizes are supported?</span>
                    <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
                  </summary>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed font-normal">
                    GeoBridge accepts Microsoft Excel (<code>.xlsx</code>, <code>.xls</code>) and CSV files. Datasets of up to 50,000+ rows process seamlessly in the background Web Worker via Flatbush spatial indexing.
                  </p>
                </details>

                <details className="group p-4 bg-surface-subtle rounded-lg border border-surface-border cursor-pointer">
                  <summary className="font-semibold text-slate-900 text-xs list-none flex items-center justify-between">
                    <span>What coordinate reference system (CRS) is expected?</span>
                    <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
                  </summary>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed font-normal">
                    Standard GPS coordinates: <strong>WGS84 (EPSG:4326)</strong> in decimal degrees. If your dataset uses projected coordinates (e.g. UTM or State Plane meters), reproject to EPSG:4326 prior to upload.
                  </p>
                </details>

                <details className="group p-4 bg-surface-subtle rounded-lg border border-surface-border cursor-pointer">
                  <summary className="font-semibold text-slate-900 text-xs list-none flex items-center justify-between">
                    <span>Where are uploaded reference layers and custom recipes stored?</span>
                    <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
                  </summary>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed font-normal">
                    Custom recipes and large GeoJSON boundary layers are stored persistently in client-side <strong>IndexedDB</strong>. They persist across browser sessions with zero server transmission.
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
