import Papa from 'papaparse';
import * as XLSX from 'xlsx';

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
    const workbook = XLSX.read(data, { type: 'array' });
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

export function exportToExcel(
  data: Record<string, any>[],
  baseFileName: string,
  _addedColumns: string[] = []
): void {
  const cleanName = baseFileName.replace(/\.[^/.]+$/, '');
  const exportFileName = `${cleanName}_enriched.xlsx`;

  const worksheet = XLSX.utils.json_to_sheet(data);

  // Set column widths dynamically
  const colWidths = Object.keys(data[0] || {}).map((key) => ({
    wch: Math.max(key.length, 12),
  }));
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Enriched Data');

  XLSX.writeFile(workbook, exportFileName);
}

export function exportToCsv(data: Record<string, any>[], baseFileName: string): void {
  const cleanName = baseFileName.replace(/\.[^/.]+$/, '');
  const exportFileName = `${cleanName}_enriched.csv`;
  const csv = Papa.unparse(data);

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
