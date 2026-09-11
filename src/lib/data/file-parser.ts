import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { EnrichmentSummary } from '../../types/recipe';

export interface ParsedFileData {
  fileName: string;
  rows: Record<string, any>[];
  headers: string[];
  totalRows: number;
}

export async function parseTabularFile(file: File): Promise<ParsedFileData> {
  const fileName = file.name;
  const extension = fileName.split('.').pop()?.toLowerCase();

  if (extension === 'csv') {
    return new Promise((resolve, reject) => {
      Papa.parse<Record<string, any>>(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          const headers = results.meta.fields || [];
          resolve({
            fileName,
            rows: results.data,
            headers,
            totalRows: results.data.length,
          });
        },
        error: (error) => reject(error),
      });
    });
  } else if (extension === 'xlsx' || extension === 'xls') {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, {
      type: 'array',
      dense: true,
      cellFormula: false,
      cellHTML: false,
    });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' });
    const headers = rows.length > 0 ? Object.keys(rows[0]) : [];

    return {
      fileName,
      rows,
      headers,
      totalRows: rows.length,
    };
  } else {
    throw new Error('Unsupported file format. Please upload a .csv, .xlsx, or .xls file.');
  }
}

/**
 * Exports enriched records to a professional dual-sheet Excel workbook:
 * Sheet 1: "Enriched_Data" (Data with new columns)
 * Sheet 2: "Processing_Audit_Trail" (Executive verification log)
 */
export function exportToExcel(
  data: Record<string, any>[],
  baseFileName: string,
  _addedColumns: string[] = [],
  summary?: EnrichmentSummary
): void {
  const cleanName = baseFileName.replace(/\.[^/.]+$/, '');
  const exportFileName = `${cleanName}_enriched.xlsx`;

  const workbook = XLSX.utils.book_new();

  // 1. Primary Data Sheet
  const cleanRows = data.map((r) => {
    const copy = { ...r };
    // Remove internal preview keys
    delete copy._matched;
    delete copy._confidence;
    return copy;
  });
  const dataWorksheet = XLSX.utils.json_to_sheet(cleanRows);
  const colWidths = Object.keys(cleanRows[0] || {}).map((key) => ({
    wch: Math.max(key.length, 14),
  }));
  dataWorksheet['!cols'] = colWidths;
  XLSX.utils.book_append_sheet(workbook, dataWorksheet, 'Enriched_Data');

  // 2. Executive Audit Trail Sheet
  if (summary) {
    const auditRows = [
      { Parameter: 'Recipe Title', Value: summary.recipeTitle || 'Spatial Enrichment' },
      { Parameter: 'Target Reference Layer', Value: summary.referenceLayerName || 'Authoritative Layer' },
      { Parameter: 'Workflow Execution Mode', Value: summary.isChained ? `Multi-Step Pipeline (${summary.stepCount} Steps)` : 'Single Operation' },
      ...(summary.stepsDetail ? [{ Parameter: 'Pipeline Steps', Value: summary.stepsDetail.join(' -> ') }] : []),
      { Parameter: 'Processing Timestamp', Value: summary.timestamp || new Date().toISOString() },
      { Parameter: 'Engine Version', Value: 'GeoBridge v1.0 (Flatbush R-Tree + In-Browser Turf)' },
      { Parameter: 'Total Rows Processed', Value: summary.totalRows },
      {
        Parameter: 'Match Rate',
        Value: `${Math.round((summary.matchedRows / Math.max(summary.totalRows, 1)) * 100)}% (${summary.matchedRows} matched)`,
      },
      { Parameter: 'Unmatched Rows', Value: summary.unmatchedRows },
      { Parameter: 'Invalid Coordinates', Value: summary.invalidCoordinates },
      { Parameter: 'Execution Time', Value: `${summary.executionTimeMs} ms` },
      { Parameter: 'Appended Columns', Value: summary.addedColumns.join(', ') },
    ];

    if (summary.confidenceBreakdown) {
      auditRows.push(
        { Parameter: 'Confidence: High Exact', Value: summary.confidenceBreakdown.highExact },
        { Parameter: 'Confidence: Centroid Fallback', Value: summary.confidenceBreakdown.centroidFallback },
        { Parameter: 'Confidence: Borderline Review', Value: summary.confidenceBreakdown.borderline },
        { Parameter: 'Confidence: Ambiguous Overlap', Value: summary.confidenceBreakdown.ambiguousOverlap }
      );
    }

    const auditWorksheet = XLSX.utils.json_to_sheet(auditRows);
    auditWorksheet['!cols'] = [{ wch: 30 }, { wch: 45 }];
    XLSX.utils.book_append_sheet(workbook, auditWorksheet, 'Processing_Audit_Trail');
  }

  XLSX.writeFile(workbook, exportFileName);
}

/**
 * Dedicated export for unassigned/unmatched rows.
 * Provides a clean remediation sheet for sales operations.
 */
export function exportExceptionsReport(
  data: Record<string, any>[],
  baseFileName: string
): void {
  const cleanName = baseFileName.replace(/\.[^/.]+$/, '');
  const exportFileName = `${cleanName}_exceptions.xlsx`;

  const unmatchedRows = data
    .filter((r) => r.match_confidence === 'UNMATCHED' || r._matched === false)
    .map((r) => {
      const copy = { ...r };
      delete copy._matched;
      delete copy._confidence;
      return copy;
    });

  if (unmatchedRows.length === 0) {
    alert('No exception or unmatched rows found in dataset!');
    return;
  }

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(unmatchedRows);
  worksheet['!cols'] = Object.keys(unmatchedRows[0] || {}).map((key) => ({
    wch: Math.max(key.length, 14),
  }));

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Unmatched_Exceptions');
  XLSX.writeFile(workbook, exportFileName);
}

export function exportToCsv(data: Record<string, any>[], baseFileName: string): void {
  const cleanName = baseFileName.replace(/\.[^/.]+$/, '');
  const exportFileName = `${cleanName}_enriched.csv`;
  const cleanRows = data.map((r) => {
    const copy = { ...r };
    delete copy._matched;
    delete copy._confidence;
    return copy;
  });
  const csv = Papa.unparse(cleanRows);

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', exportFileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToGeoJSON(geojson: any, baseFileName: string): void {
  const cleanName = baseFileName.replace(/\.[^/.]+$/, '');
  const exportFileName = `${cleanName}_spatial.geojson`;

  const blob = new Blob([JSON.stringify(geojson, null, 2)], {
    type: 'application/geo+json',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', exportFileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
