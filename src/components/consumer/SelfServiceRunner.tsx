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
  FileSpreadsheet,
  PackageOpen,
  GitMerge,
  HelpCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { useGeoBridgeStore } from '../../store/useGeoBridgeStore';
import {
  parseTabularFile,
  exportToExcel,
  exportToCsv,
  exportToGeoJSON,
  exportExceptionsReport,
} from '../../lib/data/file-parser';
import { detectCoordinates } from '../../lib/spatial/column-detector';
import { runSpatialCalculation } from '../../lib/spatial/spatial-worker-client';
import { SAMPLE_CUSTOMER_LEADS } from '../../lib/data/presets';
import { parseRecipeBundle } from '../../lib/data/recipe-bundle';
import { PreviewMap } from '../map/PreviewMap';
import { Tooltip } from '../common/Tooltip';
import type { ColumnDetectionResult } from '../../types/recipe';

export const SelfServiceRunner: React.FC = () => {
  const {
    recipes,
    referenceLayers,
    selectedRecipeId,
    setSelectedRecipeId,
    lastResult,
    setLastResult,
    importBundle,
  } = useGeoBridgeStore();

  const [bundleNotification, setBundleNotification] = useState<string | null>(null);

  const [uploadedRows, setUploadedRows] = useState<Record<string, any>[] | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [detection, setDetection] = useState<ColumnDetectionResult | null>(null);
  const [inputMode, setInputMode] = useState<'coordinates' | 'postal_code'>('coordinates');
  const [selectedLatCol, setSelectedLatCol] = useState<string>('');
  const [selectedLngCol, setSelectedLngCol] = useState<string>('');
  const [selectedZipCol, setSelectedZipCol] = useState<string>('');
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
      setSelectedZipCol(det.zipColumn || '');

      // Auto-switch to postal mode if coordinates are missing but ZIP is found
      if (!det.latColumn && !det.lngColumn && det.zipColumn) {
        setInputMode('postal_code');
      } else {
        setInputMode('coordinates');
      }

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
    setSelectedZipCol('postal_code');
    setInputMode('coordinates');
    setLastResult(null);
  };

  const handleSwapCoordinates = () => {
    const temp = selectedLatCol;
    setSelectedLatCol(selectedLngCol);
    setSelectedLngCol(temp);
  };

  const handleImportBundleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const bundle = parseRecipeBundle(text);
      const res = await importBundle(bundle);
      setBundleNotification(
        `Imported recipe "${bundle.recipe.title}" and ${res.layersImported} reference layer(s) into IndexedDB!`
      );
      setTimeout(() => setBundleNotification(null), 6000);
    } catch (err: any) {
      alert('Failed to import .georecipe package: ' + err.message);
    }
  };

  const handleRunEnrichment = async () => {
    const isChained = Boolean(currentRecipe?.isChained && currentRecipe?.steps && currentRecipe.steps.length > 0);
    if (!currentRecipe || (!isChained && !currentLayer) || !uploadedRows) {
      alert('Please upload a file and select a valid spatial recipe.');
      return;
    }

    if (inputMode === 'coordinates' && (!selectedLatCol || !selectedLngCol)) {
      alert('Please select both Latitude and Longitude columns, or switch to Postal Code mode.');
      return;
    }

    if (inputMode === 'postal_code' && !selectedZipCol) {
      alert('Please select a Postal Code column.');
      return;
    }

    setIsProcessing(true);
    setProgress({ processed: 0, total: uploadedRows.length });

    try {
      // Execute via Web Worker with main-thread fallback
      const result = await runSpatialCalculation({
        recipe: currentRecipe,
        referenceLayer: currentLayer,
        referenceLayers: referenceLayers,
        rows: uploadedRows,
        latColumn: inputMode === 'coordinates' ? selectedLatCol : undefined,
        lngColumn: inputMode === 'coordinates' ? selectedLngCol : undefined,
        zipColumn: inputMode === 'postal_code' ? selectedZipCol : selectedZipCol || undefined,
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
    <div className="space-y-6 pb-20">
      
      {/* Clean, Minimalist Toolbar Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Spatial Analysis Portal
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-0.5">
            Enrich spreadsheet coordinates or postal codes with authoritative GIS boundaries in seconds.
          </p>
        </div>

        {/* Quick Sample Actions with Hover Popups */}
        <div className="flex items-center space-x-3 shrink-0">
          <Tooltip
            title="Import .georecipe Bundle"
            content="Load a self-contained recipe package (.georecipe) with embedded reference layers."
            howToUse="Click to pick a .georecipe file handed over from your GIS specialist."
            position="bottom"
          >
            <label className="inline-flex items-center space-x-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-bold rounded-xl border border-indigo-200 shadow-sm transition-all hover:shadow cursor-pointer">
              <PackageOpen className="w-4 h-4 text-indigo-600" />
              <span>Import Bundle</span>
              <input
                type="file"
                accept=".georecipe,.json"
                onChange={handleImportBundleFile}
                className="hidden"
              />
            </label>
          </Tooltip>

          <Tooltip
            title="Download Demo Workbook"
            content="20 realistic enterprise accounts with Latitude, Longitude, and customer revenue metrics across all US regions."
            howToUse="Click to download the demo file to your machine, then drag it into Step 2."
            position="bottom"
          >
            <a
              href="/demo_customer_leads.xlsx"
              download="demo_customer_leads.xlsx"
              className="inline-flex items-center space-x-2 px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-bold rounded-xl border border-slate-300 shadow-sm transition-all hover:shadow"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Demo .xlsx</span>
            </a>
          </Tooltip>

          <Tooltip
            title="Quick In-Memory Load"
            content="Simulates uploading a 20-row customer dataset directly into browser memory without saving any files to disk."
            howToUse="Click to test the entire spatial enrichment pipeline with 1 click."
            position="bottom"
          >
            <button
              type="button"
              onClick={handleLoadSample}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-sm shadow-emerald-600/20 transition-all hover:shadow"
            >
              <Sparkles className="w-4 h-4" />
              <span>Quick Load</span>
            </button>
          </Tooltip>
        </div>
      </div>

      {bundleNotification && (
        <div className="bg-indigo-50 border border-indigo-200 text-indigo-900 px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <PackageOpen className="w-4 h-4 text-indigo-600" />
            <span>{bundleNotification}</span>
          </div>
          <button
            onClick={() => setBundleNotification(null)}
            className="text-indigo-500 hover:text-indigo-800 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-7">
        
        {/* Left Column: 3 Clean Analysis Steps */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Step 1: Select Recipe */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <span className="w-7 h-7 rounded-xl bg-emerald-600 text-white inline-flex items-center justify-center text-sm font-bold shadow-sm">
                  1
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  Select Spatial Recipe
                </h2>
                <Tooltip
                  title="What is a Spatial Recipe?"
                  content="A spatial recipe defines an automated calculation contract: matching coordinate points against boundary polygons, facility points, or proximity buffers."
                  howToUse="Select a recipe matching your department goal."
                  position="top"
                >
                  <HelpCircle className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-pointer" />
                </Tooltip>
              </div>

              <span className="text-xs font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-200">
                {currentRecipe?.category}
              </span>
            </div>

            <select
              value={selectedRecipeId}
              onChange={(e) => setSelectedRecipeId(e.target.value)}
              className="w-full bg-slate-50 hover:bg-slate-100/60 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer"
            >
              {recipes.map((recipe) => (
                <option key={recipe.id} value={recipe.id}>
                  {recipe.title}
                </option>
              ))}
            </select>

            {currentRecipe && (
              <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-200 space-y-3">
                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                  {currentRecipe.description}
                </p>

                {currentRecipe.isChained && currentRecipe.steps ? (
                  <div className="space-y-2 pt-2 border-t border-slate-200">
                    <div className="flex items-center space-x-1.5 text-indigo-700">
                      <GitMerge className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-bold uppercase tracking-wider">
                        Chained Pipeline ({currentRecipe.steps.length} Stages)
                      </span>
                    </div>

                    <div className="space-y-2">
                      {currentRecipe.steps.map((step, idx) => {
                        const stepLayer = referenceLayers.find((l) => l.id === step.referenceLayerId);
                        return (
                          <div
                            key={step.id}
                            className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-800">
                                Stage {idx + 1}: {step.name}
                              </span>
                              <span className="text-[10px] font-mono font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                                {step.operation === 'point_in_polygon'
                                  ? 'Point-in-Polygon'
                                  : step.operation === 'nearest_neighbor'
                                  ? 'Nearest Neighbor'
                                  : 'Buffer Intersect'}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {step.fieldMappings.map((m, mIdx) => (
                                <Tooltip
                                  key={mIdx}
                                  title={`Field: ${m.targetField}`}
                                  content={`Extracts "${m.sourceField}" from ${stepLayer?.name || 'layer'}. Fallback: "${m.fallbackValue ?? 'Unassigned'}".`}
                                  position="top"
                                >
                                  <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded font-mono text-[11px] font-bold cursor-help">
                                    +{m.targetField}
                                  </span>
                                </Tooltip>
                              ))}
                              {step.operation === 'nearest_neighbor' && step.includeDistanceField && (
                                <span className="px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded font-mono text-[11px] font-bold">
                                  +{step.distanceFieldName || 'distance'}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-200 flex flex-wrap gap-1.5">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block w-full mb-1">
                      Appends to each row:
                    </span>
                    {currentRecipe.fieldMappings.map((m, idx) => (
                      <Tooltip
                        key={idx}
                        title={`Field: ${m.targetField}`}
                        content={`Extracts "${m.sourceField}" from ${currentLayer?.name}. If outside boundary, defaults to "${m.fallbackValue ?? 'Unassigned'}".`}
                        position="top"
                      >
                        <span className="px-2.5 py-0.5 bg-emerald-100/90 text-emerald-900 border border-emerald-200 rounded-md font-mono text-xs font-bold cursor-help">
                          +{m.targetField}
                        </span>
                      </Tooltip>
                    ))}
                    {currentRecipe.operation === 'nearest_neighbor' && currentRecipe.includeDistanceField && (
                      <Tooltip
                        title="Distance Column"
                        content={`Calculates distance in ${currentRecipe.distanceUnit || 'miles'} to closest facility point.`}
                        position="top"
                      >
                        <span className="px-2.5 py-0.5 bg-blue-100/90 text-blue-900 border border-blue-200 rounded-md font-mono text-xs font-bold cursor-help">
                          +{currentRecipe.distanceFieldName || 'distance'}
                        </span>
                      </Tooltip>
                    )}
                    <span className="px-2.5 py-0.5 bg-slate-200/80 text-slate-800 border border-slate-300 rounded-md font-mono text-xs font-bold">
                      +match_confidence
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Step 2: Upload Data */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <span className="w-7 h-7 rounded-xl bg-emerald-600 text-white inline-flex items-center justify-center text-sm font-bold shadow-sm">
                  2
                </span>
                <h2 className="text-base font-bold text-slate-900">
                  Upload Spreadsheet
                </h2>
                <Tooltip
                  title="Accepted Formats"
                  content="Upload any .xlsx, .xls, or .csv spreadsheet. Coordinates (or postal codes) are sanitized automatically. Files are processed entirely in browser memory."
                  howToUse="Drag and drop your spreadsheet into the zone below."
                  position="top"
                >
                  <HelpCircle className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-pointer" />
                </Tooltip>
              </div>

              <span className="text-xs font-medium text-slate-400">
                Excel (.xlsx) / CSV
              </span>
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-2xl p-7 text-center transition-all cursor-pointer group ${
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
              <div className="flex flex-col items-center space-y-2">
                <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-slate-200 flex items-center justify-center text-slate-500 group-hover:text-emerald-600 group-hover:border-emerald-300 transition-all">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">
                    {fileName ? (
                      <span className="text-emerald-700">{fileName}</span>
                    ) : (
                      'Click to upload or drag & drop'
                    )}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Excel (.xlsx, .xls) or CSV files
                  </p>
                </div>
              </div>
            </div>

            {uploadedRows && (
              <div className="flex items-center justify-between text-xs px-3.5 py-2.5 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-200/80 font-semibold">
                <span className="flex items-center space-x-2">
                  <FileCheck2 className="w-4 h-4 text-emerald-600" />
                  <span>{uploadedRows.length.toLocaleString()} rows loaded in memory</span>
                </span>
                <span className="text-[11px] text-emerald-700 font-bold">100% In-Browser Private</span>
              </div>
            )}
          </div>

          {/* Step 3: Location Resolution & Columns */}
          {uploadedRows && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <span className="w-7 h-7 rounded-xl bg-emerald-600 text-white inline-flex items-center justify-center text-sm font-bold shadow-sm">
                    3
                  </span>
                  <h2 className="text-base font-bold text-slate-900">
                    Location Mapping
                  </h2>
                </div>

                {/* Input Mode Switcher: Coordinates vs Postal Code */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setInputMode('coordinates')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      inputMode === 'coordinates'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Coordinates
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('postal_code')}
                    className={`px-2.5 py-1 rounded-md transition-all ${
                      inputMode === 'postal_code'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    Postal / ZIP Code
                  </button>
                </div>
              </div>

              {detection?.warnings && detection.warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
                  <div className="font-bold flex items-center space-x-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Data Sanitation Notice</span>
                  </div>
                  {detection.warnings.map((w, i) => (
                    <p key={i} className="text-amber-800 text-[11px] font-medium">{w}</p>
                  ))}
                </div>
              )}

              {inputMode === 'coordinates' ? (
                <>
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Select coordinate columns</span>
                    <Tooltip
                      title="Swap Coordinates"
                      content="Swaps Latitude and Longitude axes. If points plot inverted, click here to swap."
                      position="top"
                    >
                      <button
                        type="button"
                        onClick={handleSwapCoordinates}
                        className="font-bold text-slate-600 hover:text-emerald-700 flex items-center space-x-1 px-2 py-0.5 rounded border border-slate-200 hover:bg-slate-50"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Swap Lat / Lon</span>
                      </button>
                    </Tooltip>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center space-x-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Latitude (Y)</span>
                      </label>
                      <select
                        value={selectedLatCol}
                        onChange={(e) => setSelectedLatCol(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
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
                      <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center space-x-1">
                        <Compass className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Longitude (X)</span>
                      </label>
                      <select
                        value={selectedLngCol}
                        onChange={(e) => setSelectedLngCol(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
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
                </>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 block flex items-center space-x-1">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                    <span>Postal / ZIP Code Column</span>
                  </label>
                  <select
                    value={selectedZipCol}
                    onChange={(e) => setSelectedZipCol(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Select Postal Code Column --</option>
                    {detection?.allColumns.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Offline resolution active: converts US 5-digit and ZIP+4 postal codes into geographic centroids automatically.
                  </p>
                </div>
              )}

              {/* Run Action Button with Hover Popup */}
              <Tooltip
                title="Execute Spatial Engine"
                content="Runs in background Web Worker using Flatbush R-Tree broad-phase filtering and Turf.js narrow-phase containment."
                howToUse="Click to calculate."
                position="top"
                className="w-full"
              >
                <button
                  type="button"
                  onClick={handleRunEnrichment}
                  disabled={
                    isProcessing ||
                    (inputMode === 'coordinates' && (!selectedLatCol || !selectedLngCol)) ||
                    (inputMode === 'postal_code' && !selectedZipCol)
                  }
                  className={`w-full py-3.5 px-6 rounded-xl text-white font-black text-sm shadow-md transition-all duration-150 flex items-center justify-center space-x-2 ${
                    isProcessing ||
                    (inputMode === 'coordinates' && (!selectedLatCol || !selectedLngCol)) ||
                    (inputMode === 'postal_code' && !selectedZipCol)
                      ? 'bg-slate-400 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] shadow-emerald-600/30'
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>
                        Worker Computing ({progress?.processed || 0} / {progress?.total || 0})...
                      </span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Run Spatial Enrichment</span>
                    </>
                  )}
                </button>
              </Tooltip>
            </div>
          )}

        </div>

        {/* Right Column: Interactive Map & Live Output */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Results Summary Box if complete */}
          {lastResult && (
            <div className="bg-white p-6 rounded-2xl border-2 border-emerald-500 shadow-lg space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-lg font-black text-slate-900">
                      Enrichment Complete
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    Processed {lastResult.summary.totalRows.toLocaleString()} rows in {lastResult.summary.executionTimeMs} ms via Flatbush R-Tree
                  </p>
                </div>

                {/* Export Buttons with Hover Popups */}
                <div className="flex flex-wrap items-center gap-2">
                  <Tooltip
                    title="Export Dual-Sheet Excel (.xlsx)"
                    content="Generates an executive Excel workbook with Sheet 1 (Enriched Data) and Sheet 2 (Processing Audit Trail)."
                    position="bottom"
                  >
                    <button
                      onClick={() =>
                        exportToExcel(
                          lastResult.data,
                          lastResult.fileName,
                          lastResult.summary.addedColumns,
                          lastResult.summary
                        )
                      }
                      className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 flex items-center space-x-1.5 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Excel</span>
                    </button>
                  </Tooltip>

                  {lastResult.summary.unmatchedRows > 0 && (
                    <Tooltip
                      title="Download Exception Report (.xlsx)"
                      content="Exports only the unassigned or invalid rows so sales operations can correct addresses."
                      position="bottom"
                    >
                      <button
                        onClick={() => exportExceptionsReport(lastResult.data, lastResult.fileName)}
                        className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold rounded-xl border border-amber-300 transition-all flex items-center space-x-1"
                      >
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                        <span>Exceptions ({lastResult.summary.unmatchedRows})</span>
                      </button>
                    </Tooltip>
                  )}

                  <Tooltip
                    title="Export CSV"
                    content="Plain comma-separated text format."
                    position="bottom"
                  >
                    <button
                      onClick={() => exportToCsv(lastResult.data, lastResult.fileName)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 transition-colors"
                    >
                      CSV
                    </button>
                  </Tooltip>

                  <Tooltip
                    title="Export GeoJSON"
                    content="Vector geometry format for QGIS, ArcGIS, and Mapbox."
                    position="bottom"
                  >
                    <button
                      onClick={() => exportToGeoJSON(lastResult.previewGeoJSON, lastResult.fileName)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl border border-slate-200 transition-colors"
                    >
                      GeoJSON
                    </button>
                  </Tooltip>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Total Rows
                  </span>
                  <p className="text-2xl font-black text-slate-900 mt-0.5">
                    {lastResult.summary.totalRows.toLocaleString()}
                  </p>
                </div>

                <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200">
                  <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                    Matched
                  </span>
                  <p className="text-2xl font-black text-emerald-950 mt-0.5">
                    {lastResult.summary.matchedRows.toLocaleString()}
                    <span className="text-xs font-semibold text-emerald-700 ml-1">
                      ({Math.round((lastResult.summary.matchedRows / Math.max(lastResult.summary.totalRows, 1)) * 100)}%)
                    </span>
                  </p>
                </div>

                <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200">
                  <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                    Unmatched
                  </span>
                  <p className="text-2xl font-black text-amber-950 mt-0.5">
                    {lastResult.summary.unmatchedRows.toLocaleString()}
                  </p>
                </div>

                <div className="bg-blue-50 p-3.5 rounded-xl border border-blue-200">
                  <span className="text-xs font-bold text-blue-800 uppercase tracking-wider">
                    New Columns
                  </span>
                  <p className="text-2xl font-black text-blue-950 mt-0.5">
                    +{lastResult.summary.addedColumns.length}
                  </p>
                </div>
              </div>

              {/* Match Confidence Breakdown Tiers */}
              {lastResult.summary.confidenceBreakdown && (
                <div className="pt-2 border-t border-slate-100 flex flex-wrap gap-2 text-xs">
                  <span className="font-bold text-slate-400 uppercase tracking-wider self-center text-[10px]">
                    Confidence:
                  </span>
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-900 rounded-lg font-semibold">
                    Exact: {lastResult.summary.confidenceBreakdown.highExact}
                  </span>
                  {lastResult.summary.confidenceBreakdown.centroidFallback > 0 && (
                    <span className="px-2.5 py-1 bg-blue-100 text-blue-900 rounded-lg font-semibold">
                      Postal Centroid: {lastResult.summary.confidenceBreakdown.centroidFallback}
                    </span>
                  )}
                  {lastResult.summary.confidenceBreakdown.ambiguousOverlap > 0 && (
                    <span className="px-2.5 py-1 bg-purple-100 text-purple-900 rounded-lg font-semibold">
                      Overlap Notice: {lastResult.summary.confidenceBreakdown.ambiguousOverlap}
                    </span>
                  )}
                  {lastResult.summary.confidenceBreakdown.unmatched > 0 && (
                    <span className="px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg font-semibold">
                      Unassigned: {lastResult.summary.confidenceBreakdown.unmatched}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Map & Table View Container */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Spatial Preview & Inspection
                </h3>
              </div>

              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
                <button
                  onClick={() => setActiveTab('map')}
                  className={`px-3 py-1 rounded-lg transition-all ${
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
                  className={`px-3 py-1 rounded-lg transition-all ${
                    activeTab === 'table'
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-900 disabled:opacity-50'
                  }`}
                >
                  Table Preview
                </button>
              </div>
            </div>

            <div className="p-3.5">
              {activeTab === 'map' ? (
                <PreviewMap
                  referenceLayer={currentLayer}
                  enrichedPointsGeoJSON={lastResult?.previewGeoJSON}
                  className="h-[600px]"
                />
              ) : (
                <div className="overflow-x-auto max-h-[600px]">
                  <table className="w-full text-left text-xs text-slate-700 border-collapse">
                    <thead className="bg-slate-100 sticky top-0 border-b border-slate-200 text-slate-900">
                      <tr>
                        {Object.keys(lastResult ? lastResult.data[0] : uploadedRows?.[0] || {}).map(
                          (col) => {
                            const isAdded = lastResult?.summary.addedColumns.includes(col);
                            return (
                              <th
                                key={col}
                                className={`px-3.5 py-2.5 font-bold ${
                                  isAdded
                                    ? 'bg-emerald-100 text-emerald-950 border-l border-emerald-300'
                                    : 'text-slate-700'
                                }`}
                              >
                                {col} {isAdded && <span className="text-[10px] uppercase font-semibold text-emerald-700 ml-1">(Enriched)</span>}
                              </th>
                            );
                          }
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-xs">
                      {(lastResult ? lastResult.data : uploadedRows || []).slice(0, 30).map(
                        (row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50/80 transition-colors">
                            {Object.entries(row).map(([k, val], cIdx) => {
                              const isAdded = lastResult?.summary.addedColumns.includes(k);
                              return (
                                <td
                                  key={cIdx}
                                  className={`px-3.5 py-2 whitespace-nowrap ${
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
                  <div className="p-2.5 text-center text-xs font-medium text-slate-400 bg-slate-50 border-t border-slate-200">
                    Showing first 30 rows
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
