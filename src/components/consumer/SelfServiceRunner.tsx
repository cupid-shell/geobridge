import React, { useState } from 'react';
import {
  Upload,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Download,
  RefreshCw,
  Zap,
  Globe,
  Compass,
  FileCheck2,
  MapPin,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useGeoBridgeStore } from '../../store/useGeoBridgeStore';
import { parseTabularFile, exportToExcel, exportToCsv, exportToGeoJSON } from '../../lib/data/file-parser';
import { detectCoordinates } from '../../lib/spatial/column-detector';
import { executeSpatialRecipe } from '../../lib/spatial/engine';
import { SAMPLE_CUSTOMER_LEADS } from '../../lib/data/presets';
import { PreviewMap } from '../map/PreviewMap';
import type { ColumnDetectionResult } from '../../types/recipe';

export const SelfServiceRunner: React.FC = () => {
  const {
    recipes,
    referenceLayers,
    selectedRecipeId,
    setSelectedRecipeId,
    lastResult,
    setLastResult,
  } = useGeoBridgeStore();

  const [uploadedRows, setUploadedRows] = useState<Record<string, any>[] | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [detection, setDetection] = useState<ColumnDetectionResult | null>(null);
  const [selectedLatCol, setSelectedLatCol] = useState<string>('');
  const [selectedLngCol, setSelectedLngCol] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<{ processed: number; total: number } | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'table'>('map');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const currentRecipe = recipes.find((r) => r.id === selectedRecipeId) || recipes[0];
  const currentLayer = referenceLayers.find((l) => l.id === currentRecipe?.referenceLayerId);

  const processFile = async (file: File) => {
    try {
      const parsed = await parseTabularFile(file);
      setFileName(parsed.fileName);
      setUploadedRows(parsed.rows);

      const det = detectCoordinates(parsed.rows);
      setDetection(det);
      setSelectedLatCol(det.latColumn || '');
      setSelectedLngCol(det.lngColumn || '');
      setLastResult(null);
    } catch (err: any) {
      alert(err.message || 'Error reading file');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const handleLoadSample = () => {
    setFileName('sample_us_customer_leads.csv');
    setUploadedRows(SAMPLE_CUSTOMER_LEADS);
    const det = detectCoordinates(SAMPLE_CUSTOMER_LEADS);
    setDetection(det);
    setSelectedLatCol('latitude');
    setSelectedLngCol('longitude');
    setLastResult(null);
  };

  const handleSwapCoordinates = () => {
    const temp = selectedLatCol;
    setSelectedLatCol(selectedLngCol);
    setSelectedLngCol(temp);
  };

  const handleRunEnrichment = async () => {
    if (!currentRecipe || !currentLayer || !uploadedRows || !selectedLatCol || !selectedLngCol) {
      alert('Please upload a file and select both Latitude and Longitude columns.');
      return;
    }

    setIsProcessing(true);
    setProgress({ processed: 0, total: uploadedRows.length });

    try {
      const result = await executeSpatialRecipe({
        recipe: currentRecipe,
        referenceLayer: currentLayer,
        rows: uploadedRows,
        latColumn: selectedLatCol,
        lngColumn: selectedLngCol,
        fileName,
        onProgress: (proc, tot) => setProgress({ processed: proc, total: tot }),
      });

      setLastResult(result);
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch (err: any) {
      alert('Error during spatial calculation: ' + err.message);
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      
      {/* Sleek Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold uppercase tracking-wider mb-2 border border-emerald-200/80">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            <span>Zero-Code Self-Service Calculator</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
            Enrich Spreadsheets with Location Data
          </h1>
          <p className="text-slate-600 text-base sm:text-lg mt-1 max-w-3xl leading-relaxed">
            Select an authoritative GIS recipe, upload your spreadsheet with latitude and longitude, and instantly download enriched data with matched territories, facilities, and risk metrics.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <a
            href="/demo_customer_leads.xlsx"
            download="demo_customer_leads.xlsx"
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl border border-slate-300 shadow-sm transition-all hover:shadow"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Download Demo .xlsx</span>
          </a>

          <button
            type="button"
            onClick={handleLoadSample}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-sm shadow-emerald-600/20 transition-all hover:shadow"
          >
            <Sparkles className="w-4 h-4" />
            <span>Quick Load Sample</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Configuration & Upload Steps */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Step 1: Select Recipe */}
          <div className="bg-white p-7 rounded-2xl border border-slate-200/90 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="w-7 h-7 rounded-xl bg-emerald-600 text-white inline-flex items-center justify-center text-sm font-bold shadow-sm">
                  1
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Select Spatial Recipe
                </h2>
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100/80 px-3 py-1 rounded-full border border-emerald-200">
                {currentRecipe?.category}
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 block">
                Active Recipe
              </label>
              <select
                value={selectedRecipeId}
                onChange={(e) => setSelectedRecipeId(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100/60 border border-slate-300 rounded-xl px-4 py-3 text-base font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all cursor-pointer"
              >
                {recipes.map((recipe) => (
                  <option key={recipe.id} value={recipe.id} className="py-2">
                    {recipe.title}
                  </option>
                ))}
              </select>
            </div>

            {currentRecipe && (
              <div className="bg-slate-50/80 p-5 rounded-xl border border-slate-200 space-y-3">
                <p className="text-sm text-slate-700 leading-relaxed font-medium">
                  {currentRecipe.description}
                </p>

                <div className="pt-3 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                  <span>Target Layer: <strong className="text-slate-800 font-semibold">{currentLayer?.name}</strong></span>
                  <span>Author: <strong className="text-slate-800 font-semibold">{currentRecipe.author || 'GIS Team'}</strong></span>
                </div>

                <div className="pt-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                    Columns to be added:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {currentRecipe.fieldMappings.map((m, idx) => (
                      <span
                        key={idx}
                        className="px-3 py-1 bg-emerald-100/90 text-emerald-900 border border-emerald-200/80 rounded-lg font-mono text-xs font-bold"
                      >
                        +{m.targetField}
                      </span>
                    ))}
                    {currentRecipe.operation === 'nearest_neighbor' && currentRecipe.includeDistanceField && (
                      <span className="px-3 py-1 bg-blue-100/90 text-blue-900 border border-blue-200/80 rounded-lg font-mono text-xs font-bold">
                        +{currentRecipe.distanceFieldName || 'distance'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Upload Data */}
          <div className="bg-white p-7 rounded-2xl border border-slate-200/90 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className="w-7 h-7 rounded-xl bg-emerald-600 text-white inline-flex items-center justify-center text-sm font-bold shadow-sm">
                  2
                </span>
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  Upload Spreadsheet
                </h2>
              </div>
              <span className="text-xs font-semibold text-slate-500">
                .xlsx, .xls, or .csv
              </span>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center transition-all cursor-pointer group ${
                isDragOver
                  ? 'border-emerald-500 bg-emerald-50/50 scale-[1.01]'
                  : 'border-slate-300 hover:border-emerald-500 bg-slate-50/60 hover:bg-emerald-50/20'
              }`}
            >
              <input
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileUpload}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <div className="flex flex-col items-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-500 group-hover:text-emerald-600 group-hover:border-emerald-300 group-hover:scale-105 transition-all">
                  <Upload className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-base font-bold text-slate-900">
                    {fileName ? (
                      <span className="text-emerald-700">{fileName}</span>
                    ) : (
                      'Click to upload or drag & drop'
                    )}
                  </p>
                  <p className="text-sm text-slate-500 mt-1 font-medium">
                    Excel (.xlsx, .xls) or CSV files up to 100MB
                  </p>
                </div>
              </div>
            </div>

            {uploadedRows && (
              <div className="flex items-center justify-between text-sm px-4 py-3 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-200/80 font-semibold">
                <span className="flex items-center space-x-2">
                  <FileCheck2 className="w-4 h-4 text-emerald-600" />
                  <span>{uploadedRows.length.toLocaleString()} rows ready for calculation</span>
                </span>
                <span className="text-xs text-emerald-700 font-normal">In Memory</span>
              </div>
            )}
          </div>

          {/* Step 3: Coordinate Verification */}
          {uploadedRows && (
            <div className="bg-white p-7 rounded-2xl border border-slate-200/90 shadow-sm space-y-5 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="w-7 h-7 rounded-xl bg-emerald-600 text-white inline-flex items-center justify-center text-sm font-bold shadow-sm">
                    3
                  </span>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900">
                    Confirm Coordinate Columns
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={handleSwapCoordinates}
                  className="text-xs font-bold text-slate-600 hover:text-emerald-700 flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-all"
                  title="Swap Latitude and Longitude axes"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Swap Lat / Lon</span>
                </button>
              </div>

              {detection?.warnings && detection.warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-900 space-y-1">
                  <div className="font-bold flex items-center space-x-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Coordinate Warning</span>
                  </div>
                  {detection.warnings.map((w, i) => (
                    <p key={i} className="text-amber-800 text-xs font-medium">{w}</p>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1.5 flex items-center space-x-1">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <span>Latitude (Y)</span>
                  </label>
                  <select
                    value={selectedLatCol}
                    onChange={(e) => setSelectedLatCol(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Select Latitude --</option>
                    {detection?.allColumns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-700 block mb-1.5 flex items-center space-x-1">
                    <Compass className="w-4 h-4 text-emerald-600" />
                    <span>Longitude (X)</span>
                  </label>
                  <select
                    value={selectedLngCol}
                    onChange={(e) => setSelectedLngCol(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Select Longitude --</option>
                    {detection?.allColumns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sample Coordinate Value Preview */}
              {detection?.sampleValues.latSample !== undefined && (
                <div className="text-xs text-slate-500 bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span>First detected coordinates:</span>
                  <span className="font-mono font-bold text-slate-700">
                    Lat: {detection.sampleValues.latSample}, Lng: {detection.sampleValues.lngSample}
                  </span>
                </div>
              )}

              {/* Action Button */}
              <button
                type="button"
                onClick={handleRunEnrichment}
                disabled={isProcessing || !selectedLatCol || !selectedLngCol}
                className={`w-full py-4 px-6 rounded-xl text-white font-black text-base shadow-lg transition-all duration-150 flex items-center justify-center space-x-2.5 ${
                  isProcessing || !selectedLatCol || !selectedLngCol
                    ? 'bg-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] shadow-emerald-600/30'
                }`}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>
                      Calculating ({progress?.processed || 0} / {progress?.total || 0})...
                    </span>
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    <span>Run Spatial Enrichment</span>
                  </>
                )}
              </button>
            </div>
          )}

        </div>

        {/* Right Column: Interactive Map & Live Output */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Results Summary Box if complete */}
          {lastResult && (
            <div className="bg-white p-7 rounded-2xl border-2 border-emerald-500 shadow-xl space-y-6 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div>
                  <div className="flex items-center space-x-2.5">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                    <h3 className="text-xl font-black text-slate-900">
                      Enrichment Complete!
                    </h3>
                  </div>
                  <p className="text-sm text-slate-500 mt-1 font-medium">
                    Processed {lastResult.summary.totalRows.toLocaleString()} rows in {lastResult.summary.executionTimeMs} ms
                  </p>
                </div>

                {/* Export Buttons */}
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() =>
                      exportToExcel(
                        lastResult.data,
                        lastResult.fileName,
                        lastResult.summary.addedColumns
                      )
                    }
                    className="px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md shadow-emerald-600/20 hover:shadow-lg flex items-center space-x-2 transition-all active:scale-[0.98]"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Excel</span>
                  </button>

                  <button
                    onClick={() => exportToCsv(lastResult.data, lastResult.fileName)}
                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold rounded-xl border border-slate-200 transition-colors"
                  >
                    CSV
                  </button>

                  <button
                    onClick={() => exportToGeoJSON(lastResult.previewGeoJSON, lastResult.fileName)}
                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-bold rounded-xl border border-slate-200 transition-colors"
                  >
                    GeoJSON
                  </button>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <span className="text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider">
                    Total Rows
                  </span>
                  <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                    {lastResult.summary.totalRows.toLocaleString()}
                  </p>
                </div>

                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                  <span className="text-xs sm:text-sm font-bold text-emerald-800 uppercase tracking-wider">
                    Matched
                  </span>
                  <p className="text-2xl sm:text-3xl font-black text-emerald-950 mt-1">
                    {lastResult.summary.matchedRows.toLocaleString()}
                    <span className="text-sm font-semibold text-emerald-700 ml-1.5">
                      ({Math.round((lastResult.summary.matchedRows / lastResult.summary.totalRows) * 100)}%)
                    </span>
                  </p>
                </div>

                <div className="bg-amber-50 p-4 rounded-xl border border-amber-200">
                  <span className="text-xs sm:text-sm font-bold text-amber-800 uppercase tracking-wider">
                    Unmatched
                  </span>
                  <p className="text-2xl sm:text-3xl font-black text-amber-950 mt-1">
                    {lastResult.summary.unmatchedRows.toLocaleString()}
                  </p>
                </div>

                <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
                  <span className="text-xs sm:text-sm font-bold text-blue-800 uppercase tracking-wider">
                    New Columns
                  </span>
                  <p className="text-2xl sm:text-3xl font-black text-blue-950 mt-1">
                    +{lastResult.summary.addedColumns.length}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Map & Table View Container */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Globe className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base sm:text-lg font-bold text-slate-900">
                  Spatial Preview & Inspection
                </h3>
              </div>

              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-sm font-bold">
                <button
                  onClick={() => setActiveTab('map')}
                  className={`px-4 py-1.5 rounded-lg transition-all ${
                    activeTab === 'map'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Map View
                </button>
                <button
                  onClick={() => setActiveTab('table')}
                  disabled={!lastResult && !uploadedRows}
                  className={`px-4 py-1.5 rounded-lg transition-all ${
                    activeTab === 'table'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 disabled:opacity-50'
                  }`}
                >
                  Table Preview
                </button>
              </div>
            </div>

            <div className="p-4">
              {activeTab === 'map' ? (
                <PreviewMap
                  referenceLayer={currentLayer}
                  enrichedPointsGeoJSON={lastResult?.previewGeoJSON}
                  className="h-[580px]"
                />
              ) : (
                <div className="overflow-x-auto max-h-[580px]">
                  <table className="w-full text-left text-sm text-slate-700 border-collapse">
                    <thead className="bg-slate-100 sticky top-0 border-b border-slate-200 text-slate-900">
                      <tr>
                        {Object.keys(lastResult ? lastResult.data[0] : uploadedRows?.[0] || {}).map(
                          (col) => {
                            const isAdded = lastResult?.summary.addedColumns.includes(col);
                            return (
                              <th
                                key={col}
                                className={`px-4 py-3 font-bold ${
                                  isAdded
                                    ? 'bg-emerald-100 text-emerald-950 border-l border-emerald-300'
                                    : 'text-slate-700'
                                }`}
                              >
                                {col} {isAdded && '★'}
                              </th>
                            );
                          }
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-xs">
                      {(lastResult ? lastResult.data : uploadedRows || []).slice(0, 25).map(
                        (row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
                            {Object.entries(row).map(([k, val], cIdx) => {
                              const isAdded = lastResult?.summary.addedColumns.includes(k);
                              return (
                                <td
                                  key={cIdx}
                                  className={`px-4 py-2.5 whitespace-nowrap ${
                                    isAdded
                                      ? 'bg-emerald-50/70 text-emerald-950 font-bold border-l border-emerald-200'
                                      : 'text-slate-800'
                                  }`}
                                >
                                  {String(val ?? '')}
                                </td>
                              );
                            })}
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                  <div className="p-3 text-center text-xs font-medium text-slate-500 bg-slate-50 border-t border-slate-200">
                    Showing first 25 rows
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
