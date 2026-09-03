import type { ColumnDetectionResult } from '../../types/recipe';

const LAT_PATTERNS = [
  /^lat$/i,
  /^latitude$/i,
  /^lat[_\s]?deg/i,
  /^y$/i,
  /^y[_\s]?coord/i,
  /.*lat.*deg.*/i,
  /.*latitude.*/i,
  /.*_lat$/i,
  /^lat_.*/i,
];

const LNG_PATTERNS = [
  /^lon$/i,
  /^lng$/i,
  /^longitude$/i,
  /^long$/i,
  /^lon[_\s]?deg/i,
  /^x$/i,
  /^x[_\s]?coord/i,
  /.*long.*deg.*/i,
  /.*longitude.*/i,
  /.*_lng$/i,
  /.*_lon$/i,
  /^lng_.*/i,
  /^lon_.*/i,
];

export function detectCoordinates(rows: Record<string, any>[]): ColumnDetectionResult {
  if (!rows || rows.length === 0) {
    return {
      latColumn: null,
      lngColumn: null,
      allColumns: [],
      confidence: 'none',
      sampleValues: {},
      warnings: ['Dataset is empty'],
    };
  }

  const allColumns = Object.keys(rows[0]);
  let latCol: string | null = null;
  let lngCol: string | null = null;
  const warnings: string[] = [];

  // Match columns by pattern priority
  for (const pattern of LAT_PATTERNS) {
    const match = allColumns.find(col => pattern.test(col.trim()));
    if (match) {
      latCol = match;
      break;
    }
  }

  for (const pattern of LNG_PATTERNS) {
    const match = allColumns.find(col => pattern.test(col.trim()));
    if (match && match !== latCol) {
      lngCol = match;
      break;
    }
  }

  let latSample: number | undefined;
  let lngSample: number | undefined;

  // Validate values from the first valid rows
  for (const row of rows.slice(0, 50)) {
    if (latCol && lngCol) {
      const latVal = parseFloat(row[latCol]);
      const lngVal = parseFloat(row[lngCol]);

      if (!isNaN(latVal) && !isNaN(lngVal)) {
        latSample = latVal;
        lngSample = lngVal;

        // Check for inversion (e.g. Latitude > 90 and Longitude <= 90)
        if (Math.abs(latVal) > 90 && Math.abs(lngVal) <= 90) {
          warnings.push(
            `Possible coordinate axis inversion: "${latCol}" has values > 90 (${latVal}). Coordinates might be swapped.`
          );
        }
        break;
      }
    }
  }

  let confidence: ColumnDetectionResult['confidence'] = 'none';
  if (latCol && lngCol) {
    confidence = 'high';
  } else if (latCol || lngCol) {
    confidence = 'medium';
    warnings.push('Only one coordinate axis was automatically detected.');
  } else {
    confidence = 'none';
    warnings.push('Could not find obvious Latitude/Longitude columns. Please map them manually.');
  }

  return {
    latColumn: latCol,
    lngColumn: lngCol,
    allColumns,
    confidence,
    sampleValues: { latSample, lngSample },
    warnings,
  };
}
