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
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { SegmentedControl } from '../ui/SegmentedControl';
import { DataTable } from '../ui/DataTable';
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
        `Imported recipe "${bundle.recipe.title}" and ${res.layersImported} reference layer(s) into IndexedDB`
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
      // Execute via Web Worker with Flatbush spatial index
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
    } catch (err: any) {
      alert('Error during spatial calculation: ' + err.message);
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  const percentMatched = lastResult
    ? Math.round((lastResult.summary.matchedRows / Math.max(lastResult.summary.totalRows, 1)) * 100)
    : 0;

  return (
    <div className="space-y-6 pb-16">
      
      {/* Executive Command Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-surface-border">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Spatial Analysis Portal
            </h1>
            <Badge variant="neutral" size="sm">
              v1.2 In-Browser
            </Badge>
          </div>
          <p className="text-sm text-slate-500 font-normal mt-1">
            Enrich spreadsheet coordinates and postal codes with GIS boundaries 100% in-browser with zero cloud egress.
          </p>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex items-center space-x-2.5 shrink-0">
          <Tooltip
            title="Import .georecipe Bundle"
            content="Load a self-contained recipe package (.georecipe) with embedded reference layers."
            howToUse="Click to pick a .georecipe file handed over from your GIS specialist."
            position="bottom"
          >
            <label className="inline-flex items-center space-x-2 px-3.5 py-2 bg-surface-card hover:bg-surface-subtle text-slate-700 text-xs font-semibold rounded-lg border border-surface-border shadow-2xs transition-colors cursor-pointer">
              <PackageOpen className="w-3.5 h-3.5 text-slate-500" />
              <span>Import Package</span>
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
            content="20 realistic enterprise accounts with Latitude, Longitude, and revenue metrics across all US regions."
            howToUse="Click to download the demo file to your machine, then drag it into the upload box."
            position="bottom"
          >
            <a
              href="/demo_customer_leads.xlsx"
              download="demo_customer_leads.xlsx"
              className="inline-flex items-center space-x-2 px-3.5 py-2 bg-surface-card hover:bg-surface-subtle text-slate-700 text-xs font-semibold rounded-lg border border-surface-border shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Demo .xlsx</span>
            </a>
          </Tooltip>

          <Tooltip
            title="Quick In-Memory Load"
            content="Simulates loading a 20-row customer dataset directly into browser memory."
            howToUse="Click to test the entire spatial enrichment pipeline with 1 click."
            position="bottom"
          >
            <Button
              variant="secondary"
              size="sm"
              onClick={handleLoadSample}
              leftIcon={<Sparkles className="w-3.5 h-3.5 text-accent-600" />}
            >
              Quick Load
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* Bundle Import Notification */}
      {bundleNotification && (
        <div className="bg-accent-50/70 border border-accent-200 text-accent-950 px-4 py-3 rounded-lg text-xs font-medium flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <PackageOpen className="w-4 h-4 text-accent-600 shrink-0" />
            <span>{bundleNotification}</span>
          </div>
          <button
            onClick={() => setBundleNotification(null)}
            className="text-accent-700 hover:text-accent-950 text-xs font-semibold cursor-pointer ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Spatial Workbench Layout */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        
        {/* Left Column: Configuration Deck (380px fixed width on desktop) */}
        <div className="w-full lg:w-[380px] shrink-0 space-y-4">
          
          {/* Card 1: Select Recipe */}
          <Card>
            <CardHeader className="pb-3 border-b border-surface-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-md bg-slate-900 text-white inline-flex items-center justify-center text-[11px] font-bold">
                    1
                  </span>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Spatial Recipe
                  </CardTitle>
                  <Tooltip
                    title="What is a Spatial Recipe?"
                    content="A spatial recipe defines an automated calculation contract: matching points against boundary polygons, facility coordinates, or proximity buffers."
                    position="top"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-pointer" />
                  </Tooltip>
                </div>

                <Badge variant="neutral" size="sm">
                  {currentRecipe?.category}
                </Badge>
              </div>
            </CardHeader>

            <div className="p-4 space-y-3.5">
              <select
                value={selectedRecipeId}
                onChange={(e) => setSelectedRecipeId(e.target.value)}
                className="w-full bg-surface-card hover:bg-surface-subtle border border-surface-border rounded-lg px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-accent-600 transition-colors cursor-pointer"
              >
                {recipes.map((recipe) => (
                  <option key={recipe.id} value={recipe.id}>
                    {recipe.title}
                  </option>
                ))}
              </select>

              {currentRecipe && (
                <div className="bg-surface-subtle p-3 rounded-lg border border-surface-border space-y-2.5">
                  <p className="text-xs text-slate-600 font-normal leading-relaxed">
                    {currentRecipe.description}
                  </p>

                  {currentRecipe.isChained && currentRecipe.steps ? (
                    <div className="space-y-2 pt-2 border-t border-surface-border">
                      <div className="flex items-center space-x-1.5 text-slate-700">
                        <GitMerge className="w-3.5 h-3.5 text-accent-600" />
                        <span className="text-[11px] font-semibold uppercase tracking-wider">
                          Chained Pipeline ({currentRecipe.steps.length} Stages)
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {currentRecipe.steps.map((step, idx) => {
                          const stepLayer = referenceLayers.find((l) => l.id === step.referenceLayerId);
                          return (
                            <div
                              key={step.id}
                              className="bg-surface-card p-2.5 rounded-md border border-surface-border space-y-1"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-800">
                                  {idx + 1}. {step.name}
                                </span>
                                <Badge variant="info" size="sm">
                                  {step.operation === 'point_in_polygon'
                                    ? 'PIP'
                                    : step.operation === 'nearest_neighbor'
                                    ? 'Nearest'
                                    : 'Buffer'}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {step.fieldMappings.map((m, mIdx) => (
                                  <Tooltip
                                    key={mIdx}
                                    title={`Field: ${m.targetField}`}
                                    content={`Extracts "${m.sourceField}" from ${stepLayer?.name || 'layer'}. Fallback: "${m.fallbackValue ?? 'Unassigned'}".`}
                                    position="top"
                                  >
                                    <span className="px-1.5 py-0.5 bg-surface-subtle text-slate-700 border border-surface-border rounded font-mono text-[10px] font-medium cursor-help">
                                      +{m.targetField}
                                    </span>
                                  </Tooltip>
                                ))}
                                {step.operation === 'nearest_neighbor' && step.includeDistanceField && (
                                  <span className="px-1.5 py-0.5 bg-surface-subtle text-slate-700 border border-surface-border rounded font-mono text-[10px] font-medium">
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
                    <div className="pt-2 border-t border-surface-border flex flex-wrap gap-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block w-full mb-0.5">
                        Enriched Attributes
                      </span>
                      {currentRecipe.fieldMappings.map((m, idx) => (
                        <Tooltip
                          key={idx}
                          title={`Field: ${m.targetField}`}
                          content={`Extracts "${m.sourceField}" from ${currentLayer?.name}. If outside boundary, defaults to "${m.fallbackValue ?? 'Unassigned'}".`}
                          position="top"
                        >
                          <span className="px-2 py-0.5 bg-surface-card text-slate-800 border border-surface-border rounded font-mono text-[11px] font-medium cursor-help">
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
                          <span className="px-2 py-0.5 bg-surface-card text-slate-800 border border-surface-border rounded font-mono text-[11px] font-medium cursor-help">
                            +{currentRecipe.distanceFieldName || 'distance'}
                          </span>
                        </Tooltip>
                      )}
                      <span className="px-2 py-0.5 bg-surface-card text-slate-500 border border-surface-border rounded font-mono text-[11px] font-medium">
                        +match_confidence
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

          {/* Card 2: Dataset Upload */}
          <Card>
            <CardHeader className="pb-3 border-b border-surface-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-md bg-slate-900 text-white inline-flex items-center justify-center text-[11px] font-bold">
                    2
                  </span>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Input Spreadsheet
                  </CardTitle>
                </div>
                <span className="text-[11px] font-medium text-slate-400">
                  Excel / CSV
                </span>
              </div>
            </CardHeader>

            <div className="p-4 space-y-3">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                className={`relative border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer group ${
                  isDragOver
                    ? 'border-accent-500 bg-accent-50/40'
                    : 'border-surface-border hover:border-slate-400 bg-surface-subtle hover:bg-surface-card'
                }`}
              >
                <input
                  type="file"
                  accept=".csv, .xlsx, .xls"
                  onChange={handleFileUpload}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center space-y-2">
                  <div className="w-9 h-9 rounded-lg bg-surface-card shadow-2xs border border-surface-border flex items-center justify-center text-slate-500 group-hover:text-accent-600 transition-colors">
                    <Upload className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-900">
                      {fileName ? (
                        <span className="text-accent-700 font-mono">{fileName}</span>
                      ) : (
                        'Drop spreadsheet or click to browse'
                      )}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Coordinates or postal codes are detected automatically
                    </p>
                  </div>
                </div>
              </div>

              {uploadedRows && (
                <div className="flex items-center justify-between text-xs px-3 py-2 bg-surface-subtle text-slate-700 rounded-lg border border-surface-border">
                  <span className="flex items-center space-x-1.5 font-medium">
                    <FileCheck2 className="w-3.5 h-3.5 text-slate-600" />
                    <span className="tabular-nums font-mono font-semibold text-slate-900">{uploadedRows.length.toLocaleString()}</span> rows loaded
                  </span>
                  <span className="text-[11px] text-slate-400 font-mono">100% In-Memory</span>
                </div>
              )}
            </div>
          </Card>

          {/* Card 3: Location Resolution & Columns */}
          {uploadedRows && (
            <Card className="animate-in fade-in duration-200">
              <CardHeader className="pb-3 border-b border-surface-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-md bg-slate-900 text-white inline-flex items-center justify-center text-[11px] font-bold">
                      3
                    </span>
                    <CardTitle className="text-sm font-bold text-slate-900">
                      Location Resolution
                    </CardTitle>
                  </div>

                  <SegmentedControl
                    size="sm"
                    options={[
                      { value: 'coordinates', label: 'Coordinates' },
                      { value: 'postal_code', label: 'Postal Code' },
                    ]}
                    value={inputMode}
                    onChange={(v) => setInputMode(v as 'coordinates' | 'postal_code')}
                  />
                </div>
              </CardHeader>

              <div className="p-4 space-y-3.5">
                {detection?.warnings && detection.warnings.length > 0 && (
                  <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-3 text-xs text-amber-950 space-y-1">
                    <div className="font-semibold flex items-center space-x-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span>Data Sanitation Notice</span>
                    </div>
                    {detection.warnings.map((w, i) => (
                      <p key={i} className="text-amber-800 text-[11px] font-normal">{w}</p>
                    ))}
                  </div>
                )}

                {inputMode === 'coordinates' ? (
                  <>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Mapped Coordinate Fields</span>
                      <Tooltip
                        title="Swap Coordinates"
                        content="Swaps Latitude and Longitude axes if points appear flipped."
                        position="top"
                      >
                        <button
                          type="button"
                          onClick={handleSwapCoordinates}
                          className="font-medium text-slate-600 hover:text-slate-900 flex items-center space-x-1 px-2 py-0.5 rounded border border-surface-border hover:bg-surface-subtle cursor-pointer text-[11px]"
                        >
                          <RefreshCw className="w-3 h-3" />
                          <span>Swap Lat/Lon</span>
                        </button>
                      </Tooltip>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1 flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>Latitude (Y)</span>
                        </label>
                        <select
                          value={selectedLatCol}
                          onChange={(e) => setSelectedLatCol(e.target.value)}
                          className="w-full bg-surface-card border border-surface-border rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:ring-1 focus:ring-accent-600"
                        >
                          <option value="">-- Select --</option>
                          {detection?.allColumns.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1 flex items-center space-x-1">
                          <Compass className="w-3 h-3 text-slate-400" />
                          <span>Longitude (X)</span>
                        </label>
                        <select
                          value={selectedLngCol}
                          onChange={(e) => setSelectedLngCol(e.target.value)}
                          className="w-full bg-surface-card border border-surface-border rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:ring-1 focus:ring-accent-600"
                        >
                          <option value="">-- Select --</option>
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
                    <label className="text-[11px] font-semibold text-slate-600 block flex items-center space-x-1">
                      <FileSpreadsheet className="w-3 h-3 text-slate-400" />
                      <span>Postal / ZIP Code Column</span>
                    </label>
                    <select
                      value={selectedZipCol}
                      onChange={(e) => setSelectedZipCol(e.target.value)}
                      className="w-full bg-surface-card border border-surface-border rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:ring-1 focus:ring-accent-600"
                    >
                      <option value="">-- Select Postal Code Column --</option>
                      {detection?.allColumns.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-400 font-normal">
                      Resolves US 5-digit and ZIP+4 postal codes into geographic centroids automatically.
                    </p>
                  </div>
                )}

                {/* Progress bar if processing */}
                {isProcessing && progress && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                      <span>Web Worker R-Tree Processing</span>
                      <span className="tabular-nums font-semibold">
                        {progress.processed.toLocaleString()} / {progress.total.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-surface-subtle rounded-full h-1.5 overflow-hidden border border-surface-border">
                      <div
                        className="bg-accent-600 h-full transition-all duration-150"
                        style={{
                          width: `${Math.round((progress.processed / Math.max(progress.total, 1)) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Execute Button */}
                <Button
                  variant="primary"
                  size="lg"
                  onClick={handleRunEnrichment}
                  isLoading={isProcessing}
                  disabled={
                    isProcessing ||
                    (inputMode === 'coordinates' && (!selectedLatCol || !selectedLngCol)) ||
                    (inputMode === 'postal_code' && !selectedZipCol)
                  }
                  leftIcon={!isProcessing ? <Zap className="w-4 h-4" /> : undefined}
                  className="w-full"
                >
                  {isProcessing
                    ? `Computing (${progress?.processed || 0} / ${progress?.total || 0})...`
                    : 'Execute Spatial Enrichment'}
                </Button>
              </div>
            </Card>
          )}

        </div>

        {/* Right Main Panel: Telemetry HUD & Interactive Canvas */}
        <div className="flex-1 min-w-0 space-y-4 w-full">
          
          {/* Result Telemetry Strip & Export Bar */}
          {lastResult && (
            <Card className="animate-in fade-in duration-200 border-surface-border">
              <div className="p-4 sm:p-5 space-y-4">
                
                {/* Header Row with Title and Export Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-surface-border">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h2 className="text-sm font-bold text-slate-900">
                          Enrichment Calculation Complete
                        </h2>
                        <Badge variant="success" size="sm">
                          {percentMatched}% Matched
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Processed {lastResult.summary.totalRows.toLocaleString()} records in {lastResult.summary.executionTimeMs} ms via Flatbush R-Tree
                      </p>
                    </div>
                  </div>

                  {/* Export Toolbar */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() =>
                        exportToExcel(
                          lastResult.data,
                          lastResult.fileName,
                          lastResult.summary.addedColumns,
                          lastResult.summary
                        )
                      }
                      leftIcon={<Download className="w-3.5 h-3.5" />}
                    >
                      Export Excel (.xlsx)
                    </Button>

                    {lastResult.summary.unmatchedRows > 0 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => exportExceptionsReport(lastResult.data, lastResult.fileName)}
                        leftIcon={<AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                      >
                        Exceptions ({lastResult.summary.unmatchedRows})
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportToCsv(lastResult.data, lastResult.fileName)}
                    >
                      CSV
                    </Button>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportToGeoJSON(lastResult.previewGeoJSON, lastResult.fileName)}
                    >
                      GeoJSON
                    </Button>
                  </div>
                </div>

                {/* Quantitative Metric Counters */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-surface-subtle p-3 rounded-lg border border-surface-border">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Total Records
                    </span>
                    <span className="text-xl font-bold font-mono text-slate-900 tabular-nums">
                      {lastResult.summary.totalRows.toLocaleString()}
                    </span>
                  </div>

                  <div className="bg-surface-subtle p-3 rounded-lg border border-surface-border">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Matched
                    </span>
                    <div className="flex items-baseline space-x-1.5">
                      <span className="text-xl font-bold font-mono text-emerald-700 tabular-nums">
                        {lastResult.summary.matchedRows.toLocaleString()}
                      </span>
                      <span className="text-xs font-medium text-slate-500">
                        ({percentMatched}%)
                      </span>
                    </div>
                  </div>

                  <div className="bg-surface-subtle p-3 rounded-lg border border-surface-border">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Exceptions
                    </span>
                    <span className="text-xl font-bold font-mono text-amber-700 tabular-nums">
                      {lastResult.summary.unmatchedRows.toLocaleString()}
                    </span>
                  </div>

                  <div className="bg-surface-subtle p-3 rounded-lg border border-surface-border">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                      Enriched Columns
                    </span>
                    <span className="text-xl font-bold font-mono text-accent-700 tabular-nums">
                      +{lastResult.summary.addedColumns.length}
                    </span>
                  </div>
                </div>

                {/* Audit Confidence Breakdown Bar */}
                {lastResult.summary.confidenceBreakdown && (
                  <div className="pt-2 border-t border-surface-border flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
                      Audit Classification:
                    </span>
                    <Badge variant="success" size="sm">
                      Exact: {lastResult.summary.confidenceBreakdown.highExact.toLocaleString()}
                    </Badge>
                    {lastResult.summary.confidenceBreakdown.centroidFallback > 0 && (
                      <Badge variant="info" size="sm">
                        Postal Centroid: {lastResult.summary.confidenceBreakdown.centroidFallback.toLocaleString()}
                      </Badge>
                    )}
                    {lastResult.summary.confidenceBreakdown.ambiguousOverlap > 0 && (
                      <Badge variant="warning" size="sm">
                        Overlap Notice: {lastResult.summary.confidenceBreakdown.ambiguousOverlap.toLocaleString()}
                      </Badge>
                    )}
                    {lastResult.summary.confidenceBreakdown.unmatched > 0 && (
                      <Badge variant="danger" size="sm">
                        Unassigned: {lastResult.summary.confidenceBreakdown.unmatched.toLocaleString()}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Canvas Container: Map View vs Tabular Inspection */}
          <Card className="overflow-hidden border-surface-border">
            <div className="px-5 py-3 border-b border-surface-border bg-surface-card flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-slate-600" />
                <h3 className="text-xs font-bold text-slate-900 tracking-tight">
                  {activeTab === 'map' ? 'Spatial Cartographic Canvas' : 'Enriched Tabular Inspection'}
                </h3>
                {currentLayer && (
                  <span className="hidden sm:inline-flex text-[11px] font-mono text-slate-400 border-l border-surface-border pl-2 ml-2">
                    Layer: {currentLayer.name} ({currentLayer.featureCount} features)
                  </span>
                )}
              </div>

              <SegmentedControl
                size="sm"
                options={[
                  { value: 'map', label: 'Map View' },
                  { value: 'table', label: 'Table Inspection', disabled: !lastResult && !uploadedRows },
                ]}
                value={activeTab}
                onChange={(v) => setActiveTab(v as 'map' | 'table')}
              />
            </div>

            <div className="p-0">
              {activeTab === 'map' ? (
                <div className="p-3">
                  <PreviewMap
                    referenceLayer={currentLayer}
                    enrichedPointsGeoJSON={lastResult?.previewGeoJSON}
                    className="h-[620px]"
                  />
                </div>
              ) : (
                <div className="p-4">
                  {lastResult?.data || uploadedRows ? (
                    <DataTable
                      data={lastResult ? lastResult.data : uploadedRows || []}
                      addedColumns={lastResult?.summary.addedColumns || []}
                      maxHeight="580px"
                    />
                  ) : (
                    <div className="py-20 text-center text-xs text-slate-400">
                      Upload a dataset to inspect rows.
                    </div>
                  )}
                </div>
              )}
            </div>
          </Card>

        </div>

      </div>

    </div>
  );
};
