import type { ColumnDetectionResult } from '../../types/recipe';
import { sanitizeCoordinate, sanitizePostalCode } from './data-sanitizer';

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

const ZIP_PATTERNS = [
  /^zip$/i,
  /^zip[_\s]?code$/i,
  /^postal$/i,
  /^postal[_\s]?code$/i,
  /^postcode$/i,
  /.*zip.*/i,
  /.*postal.*/i,
];

export function detectCoordinates(rows: Record<string, any>[]): ColumnDetectionResult {
  if (!rows || rows.length === 0) {
    return {
      latColumn: null,
      lngColumn: null,
      zipColumn: null,
      allColumns: [],
      confidence: 'none',
      sampleValues: {},
      warnings: ['Dataset is empty'],
    };
  }

  const allColumns = Object.keys(rows[0]);
  let latCol: string | null = null;
  let lngCol: string | null = null;
  let zipCol: string | null = null;
  const warnings: string[] = [];

  // Match columns by pattern priority
  for (const pattern of LAT_PATTERNS) {
    const match = allColumns.find((col) => pattern.test(col.trim()));
    if (match) {
      latCol = match;
      break;
    }
  }

  for (const pattern of LNG_PATTERNS) {
    const match = allColumns.find((col) => pattern.test(col.trim()));
    if (match && match !== latCol) {
      lngCol = match;
      break;
    }
  }

  for (const pattern of ZIP_PATTERNS) {
    const match = allColumns.find((col) => pattern.test(col.trim()));
    if (match) {
      zipCol = match;
      break;
    }
  }

  let latSample: number | undefined;
  let lngSample: number | undefined;
  let zipSample: string | undefined;

  // Validate values from the first valid rows using sanitizer
  for (const row of rows.slice(0, 50)) {
    if (latCol && lngCol) {
      const latVal = sanitizeCoordinate(row[latCol], true);
      const lngVal = sanitizeCoordinate(row[lngCol], false);

      if (latVal !== null && lngVal !== null) {
        latSample = latVal;
        lngSample = lngVal;

        // Check for inversion (e.g. Latitude > 90 and Longitude <= 90)
        if (Math.abs(latVal) > 90 && Math.abs(lngVal) <= 90) {
          warnings.push(
            `Possible coordinate axis inversion: "${latCol}" has values > 90 (${latVal}). Coordinates might be swapped.`
          );
        }

        // Check for projected coordinates in meters
        if (Math.abs(lngVal) > 180) {
          warnings.push(
            `Detected values > 180 (${lngVal}). Coordinates may be in Web Mercator (EPSG:3857) meters instead of WGS84 decimal degrees.`
          );
        }
        break;
      }
    }

    if (zipCol && !zipSample) {
      const cleanZip = sanitizePostalCode(row[zipCol]);
      if (cleanZip) {
        zipSample = cleanZip;
      }
    }
  }

  let confidence: ColumnDetectionResult['confidence'] = 'none';
  if (latCol && lngCol) {
    confidence = 'high';
  } else if (zipCol) {
    confidence = 'medium';
  } else if (latCol || lngCol) {
    confidence = 'low';
    warnings.push('Only one coordinate axis was automatically detected.');
  } else {
    confidence = 'none';
    warnings.push('Could not find obvious coordinate or postal columns.');
  }

  return {
    latColumn: latCol,
    lngColumn: lngCol,
    zipColumn: zipCol,
    allColumns,
    confidence,
    sampleValues: { latSample, lngSample, zipSample },
    warnings,
  };
}
