import React, { useState } from 'react';
import {
  Upload,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Download,
  RefreshCw,
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

const PRESET_GOALS = [
  {
    id: 'recipe-territory-assignment',
    title: 'Assign Sales Territories',
    subtitle: 'Matches customer locations to regions and assigns account directors',
    tag: 'Sales & Ops',
    appendedFields: ['+Assigned_Territory', '+Regional_Director', '+Support_Tier'],
  },
  {
    id: 'recipe-nearest-hub',
    title: 'Find Closest Warehouse',
    subtitle: 'Finds nearest distribution hub and calculates driving miles',
    tag: 'Logistics',
    appendedFields: ['+Closest_Hub', '+Routing_Code', '+Distance_mi'],
  },
  {
    id: 'recipe-risk-zone-checker',
    title: 'Screen Flood & Hazard Risk',
    subtitle: 'Checks if properties fall in flood zones or fault corridors',
    tag: 'Risk & Insurance',
    appendedFields: ['+Hazard_Zone', '+Risk_Tier', '+Surcharge_%'],
  },
  {
    id: 'recipe-enterprise-pipeline',
    title: 'Combined Territory + Hub Match',
    subtitle: 'Runs two rules in one pass: assigns sales territory and nearest hub',
    tag: 'Multi-Step Rule',
    appendedFields: ['+Assigned_Territory', '+Regional_Director', '+Closest_Hub', '+Distance_mi'],
  },
];

interface SpreadsheetTransformationPreviewProps {
  currentRecipeTitle: string;
  onTrySample: () => void;
  isProcessing: boolean;
}

const SpreadsheetTransformationPreview: React.FC<SpreadsheetTransformationPreviewProps> = ({
  currentRecipeTitle,
  onTrySample,
  isProcessing,
}) => {
  return (
    <div className="p-5 sm:p-6 space-y-6">
      {/* Explanation Banner */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold font-mono uppercase tracking-wider text-accent-700 bg-accent-50 px-2.5 py-0.5 rounded border border-accent-200">
            Automated Spreadsheet Matcher
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            Geographic VLOOKUP
          </span>
        </div>
        <h3 className="text-base font-bold text-slate-900">
          Your Existing Spreadsheet &rarr; Enriched with Official Location Data
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed max-w-3xl font-normal">
          GeoBridge matches each row in your Excel file to official GIS territory boundaries or facility pins. <strong>Your original columns remain 100% untouched</strong>, and new authoritative columns are appended on the right.
        </p>
      </div>

      {/* Visual Table Before vs After */}
      <div className="space-y-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center space-x-1.5 text-slate-500 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
              <span>Your Original Columns (Untouched)</span>
            </span>
            <span className="flex items-center space-x-1.5 text-accent-700 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-accent-600 inline-block" />
              <span>New Columns Added by GeoBridge</span>
            </span>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            Active Goal: {currentRecipeTitle}
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-2xs">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70 font-semibold text-slate-600">
                <th className="py-3 px-3.5">lead_id</th>
                <th className="py-3 px-3.5">company_name</th>
                <th className="py-3 px-3.5">city</th>
                <th className="py-3 px-3.5">state</th>
                <th className="py-3 px-3.5 font-mono">latitude</th>
                <th className="py-3 px-3.5 font-mono">longitude</th>
                {/* Enriched Columns */}
                <th className="py-3 px-3.5 bg-accent-50 text-accent-900 border-l-2 border-accent-400 font-mono">
                  +Assigned_Territory
                </th>
                <th className="py-3 px-3.5 bg-accent-50 text-accent-900 font-mono">
                  +Account_Director
                </th>
                <th className="py-3 px-3.5 bg-accent-50 text-accent-900 font-mono">
                  +Closest_Hub
                </th>
                <th className="py-3 px-3.5 bg-accent-50 text-accent-900 font-mono">
                  +Distance_mi
                </th>
                <th className="py-3 px-3.5 bg-accent-50 text-accent-900 font-mono">
                  +Match_Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3 px-3.5 font-mono text-slate-500">LEAD-001</td>
                <td className="py-3 px-3.5 font-semibold text-slate-800">Apex Logistics</td>
                <td className="py-3 px-3.5 text-slate-600">Seattle</td>
                <td className="py-3 px-3.5 text-slate-600">WA</td>
                <td className="py-3 px-3.5 font-mono text-slate-400">47.6062</td>
                <td className="py-3 px-3.5 font-mono text-slate-400">-122.3321</td>
                <td className="py-3 px-3.5 bg-accent-50/40 text-accent-950 font-semibold border-l-2 border-accent-400">
                  Western Region
                </td>
                <td className="py-3 px-3.5 bg-accent-50/40 text-accent-900">Sarah Lin</td>
                <td className="py-3 px-3.5 bg-accent-50/40 text-slate-700">Seattle Cargo Hub</td>
                <td className="py-3 px-3.5 bg-accent-50/40 font-mono font-semibold text-accent-900">4.2 mi</td>
                <td className="py-3 px-3.5 bg-accent-50/40">
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Exact Match
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3 px-3.5 font-mono text-slate-500">LEAD-002</td>
                <td className="py-3 px-3.5 font-semibold text-slate-800">Lone Star Distribution</td>
                <td className="py-3 px-3.5 text-slate-600">Houston</td>
                <td className="py-3 px-3.5 text-slate-600">TX</td>
                <td className="py-3 px-3.5 font-mono text-slate-400">29.7604</td>
                <td className="py-3 px-3.5 font-mono text-slate-400">-95.3698</td>
                <td className="py-3 px-3.5 bg-accent-50/40 text-accent-950 font-semibold border-l-2 border-accent-400">
                  Southern Region
                </td>
                <td className="py-3 px-3.5 bg-accent-50/40 text-accent-900">Marcus Vance</td>
                <td className="py-3 px-3.5 bg-accent-50/40 text-slate-700">DFW Regional Hub</td>
                <td className="py-3 px-3.5 bg-accent-50/40 font-mono font-semibold text-accent-900">238.5 mi</td>
                <td className="py-3 px-3.5 bg-accent-50/40">
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Exact Match
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3 px-3.5 font-mono text-slate-500">LEAD-003</td>
                <td className="py-3 px-3.5 font-semibold text-slate-800">Midwest Health Systems</td>
                <td className="py-3 px-3.5 text-slate-600">Chicago</td>
                <td className="py-3 px-3.5 text-slate-600">IL</td>
                <td className="py-3 px-3.5 font-mono text-slate-400">41.8781</td>
                <td className="py-3 px-3.5 font-mono text-slate-400">-87.6298</td>
                <td className="py-3 px-3.5 bg-accent-50/40 text-accent-950 font-semibold border-l-2 border-accent-400">
                  Midwest Region
                </td>
                <td className="py-3 px-3.5 bg-accent-50/40 text-accent-900">Elena Rostova</td>
                <td className="py-3 px-3.5 bg-accent-50/40 text-slate-700">Chicago Central Hub</td>
                <td className="py-3 px-3.5 bg-accent-50/40 font-mono font-semibold text-accent-900">8.9 mi</td>
                <td className="py-3 px-3.5 bg-accent-50/40">
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Exact Match
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-slate-50/70 transition-colors">
                <td className="py-3 px-3.5 font-mono text-slate-500">LEAD-004</td>
                <td className="py-3 px-3.5 font-semibold text-slate-800">Empire Financial</td>
                <td className="py-3 px-3.5 text-slate-600">New York</td>
                <td className="py-3 px-3.5 text-slate-600">NY</td>
                <td className="py-3 px-3.5 font-mono text-slate-400">40.7128</td>
                <td className="py-3 px-3.5 font-mono text-slate-400">-74.0060</td>
                <td className="py-3 px-3.5 bg-accent-50/40 text-accent-950 font-semibold border-l-2 border-accent-400">
                  Northeast Region
                </td>
                <td className="py-3 px-3.5 bg-accent-50/40 text-accent-900">David Chen</td>
                <td className="py-3 px-3.5 bg-accent-50/40 text-slate-700">Newark Air Cargo</td>
                <td className="py-3 px-3.5 bg-accent-50/40 font-mono font-semibold text-accent-900">11.8 mi</td>
                <td className="py-3 px-3.5 bg-accent-50/40">
                  <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Exact Match
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 3 Step Workflow Graphic */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2">
        <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Step 1</span>
          <h4 className="text-sm font-bold text-slate-900">Drop Your Spreadsheet</h4>
          <p className="text-xs text-slate-500 leading-relaxed font-normal">
            Excel (.xlsx, .xls) or CSV with coordinates or standard 5-digit US ZIP codes.
          </p>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Step 2</span>
          <h4 className="text-sm font-bold text-slate-900">Instant In-Browser Match</h4>
          <p className="text-xs text-slate-500 leading-relaxed font-normal">
            Matches rows against official boundaries in seconds without uploading rows anywhere.
          </p>
        </div>

        <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Step 3</span>
          <h4 className="text-sm font-bold text-slate-900">Download Enriched File</h4>
          <p className="text-xs text-slate-500 leading-relaxed font-normal">
            Get your Excel file back with all new boundary and distance columns ready for reporting.
          </p>
        </div>
      </div>

      {/* 1-Click Interactive CTA */}
      <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2 text-xs text-slate-600">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>No account or setup required. Run 20 live customer rows in 1 second.</span>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={onTrySample}
          isLoading={isProcessing}
          leftIcon={<Sparkles className="w-4 h-4 text-white" />}
        >
          {isProcessing ? 'Processing...' : 'Try This Example (1-Click Test Drive)'}
        </Button>
      </div>
    </div>
  );
};

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
  const [activeTab, setActiveTab] = useState<'preview' | 'map' | 'table'>('preview');
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
      if (activeTab === 'preview') {
        setActiveTab('table');
      }
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
    if (activeTab === 'preview') {
      setActiveTab('table');
    }
  };

  const handleOneClickTestDrive = async () => {
    setFileName('sample_us_customer_leads.csv');
    setUploadedRows(SAMPLE_CUSTOMER_LEADS);
    const det = detectCoordinates(SAMPLE_CUSTOMER_LEADS);
    setDetection(det);
    setSelectedLatCol('latitude');
    setSelectedLngCol('longitude');
    setSelectedZipCol('postal_code');
    setInputMode('coordinates');

    const isChained = Boolean(currentRecipe?.isChained && currentRecipe?.steps && currentRecipe.steps.length > 0);
    if (!currentRecipe || (!isChained && !currentLayer)) {
      return;
    }

    setIsProcessing(true);
    setProgress({ processed: 0, total: SAMPLE_CUSTOMER_LEADS.length });
    try {
      const result = await runSpatialCalculation({
        recipe: currentRecipe,
        referenceLayer: currentLayer,
        referenceLayers: referenceLayers,
        rows: SAMPLE_CUSTOMER_LEADS,
        latColumn: 'latitude',
        lngColumn: 'longitude',
        zipColumn: 'postal_code',
        fileName: 'sample_us_customer_leads.csv',
        onProgress: (proc, tot) => setProgress({ processed: proc, total: tot }),
      });
      setLastResult(result);
      setActiveTab('table');
    } catch (err: any) {
      alert('Error during test drive: ' + err.message);
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
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
        `Imported template "${bundle.recipe.title}" and ${res.layersImported} reference boundary layer(s)`
      );
      setTimeout(() => setBundleNotification(null), 6000);
    } catch (err: any) {
      alert('Failed to load template file: ' + err.message);
    }
  };

  const handleRunEnrichment = async () => {
    const isChained = Boolean(currentRecipe?.isChained && currentRecipe?.steps && currentRecipe.steps.length > 0);
    if (!currentRecipe || (!isChained && !currentLayer) || !uploadedRows) {
      alert('Please upload a spreadsheet and select a matching goal.');
      return;
    }

    if (inputMode === 'coordinates' && (!selectedLatCol || !selectedLngCol)) {
      alert('Please select both Latitude and Longitude columns, or switch to US ZIP Code mode.');
      return;
    }

    if (inputMode === 'postal_code' && !selectedZipCol) {
      alert('Please select a Postal Code column.');
      return;
    }

    setIsProcessing(true);
    setProgress({ processed: 0, total: uploadedRows.length });

    try {
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
      setActiveTab('table');
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
            <h1 className="text-2xl font-bold text-slate-900 tracking-normal">
              Spreadsheet Location Matcher
            </h1>
            <Badge variant="neutral" size="sm">
              100% In-Browser
            </Badge>
          </div>
          <p className="text-sm text-slate-600 font-normal mt-1 leading-relaxed">
            Enrich customer and property spreadsheets with official territories, nearest warehouse mileage, and risk tiers with zero data egress.
          </p>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex items-center space-x-2.5 shrink-0">
          <Tooltip
            title="Load Template File (.georecipe)"
            content="Load a custom matching template packaged by your GIS team with embedded boundary layers."
            howToUse="Click to select a .georecipe file received from your GIS specialist."
            position="bottom"
          >
            <label className="inline-flex items-center space-x-2 px-3.5 py-2 bg-surface-card hover:bg-surface-subtle text-slate-700 text-xs font-semibold rounded-lg border border-surface-border shadow-2xs transition-colors cursor-pointer">
              <PackageOpen className="w-3.5 h-3.5 text-slate-500" />
              <span>Load Template File</span>
              <input
                type="file"
                accept=".georecipe,.json"
                onChange={handleImportBundleFile}
                className="hidden"
              />
            </label>
          </Tooltip>

          <Tooltip
            title="Download Sample Excel File"
            content="Download a 20-row customer leads file with coordinates and ZIP codes across the US."
            howToUse="Download to your computer to inspect the exact column structure."
            position="bottom"
          >
            <a
              href="/demo_customer_leads.xlsx"
              download="demo_customer_leads.xlsx"
              className="inline-flex items-center space-x-2 px-3.5 py-2 bg-surface-card hover:bg-surface-subtle text-slate-700 text-xs font-semibold rounded-lg border border-surface-border shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Download Sample File</span>
            </a>
          </Tooltip>

          <Tooltip
            title="Try Sample Data in Browser"
            content="Loads 20 sample customer leads into memory for instant testing."
            howToUse="Click to populate the upload box with realistic customer data."
            position="bottom"
          >
            <Button
              variant="secondary"
              size="sm"
              onClick={handleLoadSample}
              leftIcon={<Sparkles className="w-3.5 h-3.5 text-accent-600" />}
            >
              Try Sample Data (1-Click)
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* Interactive Test Drive Hero Sandbox Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-800">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2.5">
            <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-accent-500/20 text-accent-300 border border-accent-500/30">
              Interactive Test Drive
            </span>
            <h2 className="text-base font-bold text-white">
              New to GeoBridge? Test it with 1 click
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed font-normal">
            Click <strong>Run 1-Click Test Drive</strong> to immediately load 20 sample customer accounts and run boundary matching in real time. No file upload required.
          </p>
        </div>
        <div className="flex items-center space-x-2 shrink-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={handleOneClickTestDrive}
            isLoading={isProcessing}
            leftIcon={<Sparkles className="w-3.5 h-3.5 text-accent-600" />}
            className="bg-white text-slate-900 hover:bg-slate-100 font-semibold"
          >
            Run 1-Click Test Drive
          </Button>
        </div>
      </div>

      {/* Template Import Notification */}
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
          
          {/* Card 1: Select Matching Goal */}
          <Card>
            <CardHeader className="pb-3 border-b border-surface-border">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-md bg-slate-900 text-white inline-flex items-center justify-center text-xs font-bold">
                    1
                  </span>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Choose Matching Goal
                  </CardTitle>
                  <Tooltip
                    title="What is a Matching Goal?"
                    content="A predefined rule authored by GIS teams that determines what new data to add to your spreadsheet based on location (e.g. Sales Territory, Nearest Warehouse, or Hazard Risk)."
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
              {/* Visual Preset Goal Cards */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-600 block">
                  Select a business goal:
                </span>
                <div className="grid grid-cols-1 gap-2">
                  {PRESET_GOALS.map((goal) => {
                    const isSelected = selectedRecipeId === goal.id;
                    return (
                      <button
                        key={goal.id}
                        type="button"
                        onClick={() => setSelectedRecipeId(goal.id)}
                        className={`w-full p-3.5 rounded-lg text-left transition-all border cursor-pointer ${
                          isSelected
                            ? 'border-slate-900 bg-slate-900 text-white shadow-2xs'
                            : 'border-surface-border bg-surface-card hover:bg-surface-subtle text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                            {goal.title}
                          </span>
                          <span
                            className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                              isSelected
                                ? 'bg-slate-800 text-slate-300 border border-slate-700'
                                : 'bg-surface-subtle text-slate-500 border border-surface-border'
                            }`}
                          >
                            {goal.tag}
                          </span>
                        </div>
                        <p
                          className={`text-xs mt-1.5 leading-relaxed font-normal ${
                            isSelected ? 'text-slate-300' : 'text-slate-500'
                          }`}
                        >
                          {goal.subtitle}
                        </p>
                      </button>
                    );
                  })}
                </div>

                {/* Dropdown for Custom / All Templates */}
                <div className="pt-2 border-t border-surface-border space-y-1">
                  <label className="text-xs font-semibold text-slate-500 block">
                    Or choose from all templates ({recipes.length} available):
                  </label>
                  <select
                    value={selectedRecipeId}
                    onChange={(e) => setSelectedRecipeId(e.target.value)}
                    className="w-full bg-surface-card hover:bg-surface-subtle border border-surface-border rounded-lg px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-accent-600 transition-colors cursor-pointer"
                  >
                    {recipes.map((recipe) => (
                      <option key={recipe.id} value={recipe.id}>
                        {recipe.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {currentRecipe && (
                <div className="bg-surface-subtle p-3.5 rounded-lg border border-surface-border space-y-2.5">
                  <p className="text-xs text-slate-600 font-normal leading-relaxed">
                    {currentRecipe.description}
                  </p>

                  {currentRecipe.isChained && currentRecipe.steps ? (
                    <div className="space-y-2 pt-2 border-t border-surface-border">
                      <div className="flex items-center space-x-1.5 text-slate-700">
                        <GitMerge className="w-3.5 h-3.5 text-accent-600" />
                        <span className="text-xs font-semibold uppercase tracking-wider">
                          Combined Rule ({currentRecipe.steps.length} Stages)
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
                                    ? 'Boundary'
                                    : step.operation === 'nearest_neighbor'
                                    ? 'Closest Pin'
                                    : 'Buffer'}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {step.fieldMappings.map((m, mIdx) => (
                                  <Tooltip
                                    key={mIdx}
                                    title={`Column: ${m.targetField}`}
                                    content={`Extracts "${m.sourceField}" from ${stepLayer?.name || 'layer'}. Fallback: "${m.fallbackValue ?? 'Unassigned'}".`}
                                    position="top"
                                  >
                                    <span className="px-2 py-0.5 bg-surface-subtle text-slate-700 border border-surface-border rounded font-mono text-xs font-medium cursor-help">
                                      +{m.targetField}
                                    </span>
                                  </Tooltip>
                                ))}
                                {step.operation === 'nearest_neighbor' && step.includeDistanceField && (
                                  <span className="px-2 py-0.5 bg-surface-subtle text-slate-700 border border-surface-border rounded font-mono text-xs font-medium">
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
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block w-full mb-0.5">
                        New Columns Appended
                      </span>
                      {currentRecipe.fieldMappings.map((m, idx) => (
                        <Tooltip
                          key={idx}
                          title={`Column: ${m.targetField}`}
                          content={`Extracts "${m.sourceField}" from ${currentLayer?.name}. If outside boundary, defaults to "${m.fallbackValue ?? 'Unassigned'}".`}
                          position="top"
                        >
                          <span className="px-2 py-0.5 bg-surface-card text-slate-800 border border-surface-border rounded font-mono text-xs font-medium cursor-help">
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
                          <span className="px-2 py-0.5 bg-surface-card text-slate-800 border border-surface-border rounded font-mono text-xs font-medium cursor-help">
                            +{currentRecipe.distanceFieldName || 'distance'}
                          </span>
                        </Tooltip>
                      )}
                      <span className="px-2 py-0.5 bg-surface-card text-slate-500 border border-surface-border rounded font-mono text-xs font-medium">
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
                  <span className="w-5 h-5 rounded-md bg-slate-900 text-white inline-flex items-center justify-center text-xs font-bold">
                    2
                  </span>
                  <CardTitle className="text-sm font-bold text-slate-900">
                    Upload Your Spreadsheet
                  </CardTitle>
                </div>
                <span className="text-xs font-medium text-slate-400">
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
                    <p className="text-sm font-semibold text-slate-900">
                      {fileName ? (
                        <span className="text-accent-700 font-mono">{fileName}</span>
                      ) : (
                        'Drop spreadsheet or click to browse'
                      )}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 font-normal leading-relaxed">
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
                  <span className="text-xs text-slate-400 font-mono">100% Private (No Cloud Egress)</span>
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
                    <span className="w-5 h-5 rounded-md bg-slate-900 text-white inline-flex items-center justify-center text-xs font-bold">
                      3
                    </span>
                    <CardTitle className="text-sm font-bold text-slate-900">
                      Confirm Location Columns
                    </CardTitle>
                  </div>

                  <SegmentedControl
                    size="sm"
                    options={[
                      { value: 'coordinates', label: 'Coordinates (Lat/Lon)' },
                      { value: 'postal_code', label: 'US ZIP Code' },
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
                      <span>Data Notice</span>
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
                          <span>Latitude (North/South)</span>
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
                          <span>Longitude (East/West)</span>
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
                      <span>US ZIP / Postal Code Column</span>
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
                      Resolves US 5-digit and ZIP+4 postal codes into exact geographic center coordinates automatically.
                    </p>
                  </div>
                )}

                {/* Progress bar if processing */}
                {isProcessing && progress && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[11px] text-slate-500 font-mono">
                      <span>Matching Boundaries in Browser</span>
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
                  leftIcon={!isProcessing ? <Sparkles className="w-4 h-4 text-white" /> : undefined}
                  className="w-full"
                >
                  {isProcessing
                    ? `Adding Boundary Data (${progress?.processed || 0} / ${progress?.total || 0})...`
                    : 'Add Boundary Data to Spreadsheet'}
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
                          Spreadsheet Enrichment Complete
                        </h2>
                        <Badge variant="success" size="sm">
                          {percentMatched}% Successfully Matched
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                        Enriched {lastResult.summary.totalRows.toLocaleString()} rows in {lastResult.summary.executionTimeMs} ms with zero server transmission
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
                      Export Enriched Excel (.xlsx)
                    </Button>

                    {lastResult.summary.unmatchedRows > 0 && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => exportExceptionsReport(lastResult.data, lastResult.fileName)}
                        leftIcon={<AlertTriangle className="w-3.5 h-3.5 text-amber-600" />}
                      >
                        Unmatched Rows ({lastResult.summary.unmatchedRows})
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                  <div className="bg-surface-subtle p-3.5 rounded-lg border border-surface-border">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                      Total Rows Processed
                    </span>
                    <span className="text-2xl font-bold font-mono text-slate-900 tabular-nums">
                      {lastResult.summary.totalRows.toLocaleString()}
                    </span>
                  </div>

                  <div className="bg-surface-subtle p-3.5 rounded-lg border border-surface-border">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                      Successfully Matched
                    </span>
                    <div className="flex items-baseline space-x-1.5">
                      <span className="text-2xl font-bold font-mono text-emerald-700 tabular-nums">
                        {lastResult.summary.matchedRows.toLocaleString()}
                      </span>
                      <span className="text-xs font-medium text-slate-500">
                        ({percentMatched}%)
                      </span>
                    </div>
                  </div>

                  <div className="bg-surface-subtle p-3.5 rounded-lg border border-surface-border">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                      Unmatched Rows
                    </span>
                    <span className="text-2xl font-bold font-mono text-amber-700 tabular-nums">
                      {lastResult.summary.unmatchedRows.toLocaleString()}
                    </span>
                  </div>

                  <div className="bg-surface-subtle p-3.5 rounded-lg border border-surface-border">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                      New Columns Added
                    </span>
                    <span className="text-2xl font-bold font-mono text-accent-700 tabular-nums">
                      +{lastResult.summary.addedColumns.length}
                    </span>
                  </div>
                </div>

                {/* Audit Confidence Breakdown Bar */}
                {lastResult.summary.confidenceBreakdown && (
                  <div className="pt-2.5 border-t border-surface-border flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mr-1">
                      Match Classification:
                    </span>
                    <Badge variant="success" size="sm">
                      Exact Boundary: {lastResult.summary.confidenceBreakdown.highExact.toLocaleString()}
                    </Badge>
                    {lastResult.summary.confidenceBreakdown.centroidFallback > 0 && (
                      <Badge variant="info" size="sm">
                        Postal Centroid: {lastResult.summary.confidenceBreakdown.centroidFallback.toLocaleString()}
                      </Badge>
                    )}
                    {lastResult.summary.confidenceBreakdown.ambiguousOverlap > 0 && (
                      <Badge variant="warning" size="sm">
                        Boundary Overlap: {lastResult.summary.confidenceBreakdown.ambiguousOverlap.toLocaleString()}
                      </Badge>
                    )}
                    {lastResult.summary.confidenceBreakdown.unmatched > 0 && (
                      <Badge variant="danger" size="sm">
                        Outside Boundaries: {lastResult.summary.confidenceBreakdown.unmatched.toLocaleString()}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Canvas Container: Map View vs Tabular Inspection */}
          <Card className="overflow-hidden border-surface-border">
            <div className="px-5 py-3.5 border-b border-surface-border bg-surface-card flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Globe className="w-4 h-4 text-slate-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {activeTab === 'preview'
                    ? 'Spreadsheet Transformation Preview'
                    : activeTab === 'map'
                    ? 'Boundary Map Preview'
                    : 'Enriched Spreadsheet Inspection'}
                </h3>
                {currentLayer && (
                  <span className="hidden sm:inline-flex text-xs font-mono text-slate-400 border-l border-surface-border pl-2.5 ml-2.5">
                    Layer: {currentLayer.name} ({currentLayer.featureCount} features)
                  </span>
                )}
              </div>

              {!lastResult && !uploadedRows ? (
                <SegmentedControl
                  size="sm"
                  options={[
                    { value: 'preview', label: 'Spreadsheet Example' },
                    { value: 'map', label: 'Boundary Map' },
                  ]}
                  value={activeTab === 'map' ? 'map' : 'preview'}
                  onChange={(v) => setActiveTab(v as any)}
                />
              ) : (
                <SegmentedControl
                  size="sm"
                  options={[
                    { value: 'table', label: 'Enriched Table' },
                    { value: 'map', label: 'Interactive Map' },
                  ]}
                  value={activeTab === 'map' ? 'map' : 'table'}
                  onChange={(v) => setActiveTab(v as any)}
                />
              )}
            </div>

            <div className="p-0">
              {activeTab === 'preview' && !lastResult && !uploadedRows ? (
                <SpreadsheetTransformationPreview
                  currentRecipeTitle={currentRecipe?.title || 'Territory Match'}
                  onTrySample={handleOneClickTestDrive}
                  isProcessing={isProcessing}
                />
              ) : activeTab === 'map' ? (
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
                      Upload a spreadsheet to inspect rows.
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
