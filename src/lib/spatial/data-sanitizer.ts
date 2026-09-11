/**
 * Corporate spreadsheet data sanitizer.
 * Fixes Excel leading zero truncation, European decimal commas, and directional coordinate notations.
 */

/**
 * Normalizes coordinate strings (handling European commas, whitespace, and compass letters).
 */
export function sanitizeCoordinate(val: any, isLatitude: boolean): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') {
    if (!isFinite(val)) return null;
    if (isLatitude && (val < -90 || val > 90)) return null;
    if (!isLatitude && (val < -180 || val > 180)) return null;
    return val;
  }

  let str = String(val).trim();
  if (!str) return null;

  // Detect negative directions
  const isSouthOrWest = /[SWsw]$/.test(str) || /^[-–—]/.test(str);

  // Remove degrees, minutes, seconds symbols and letters
  str = str.replace(/[°'\"NESWnesw\s]/g, '');

  // Handle European decimal comma (e.g., "37,7749" -> "37.7749")
  if (str.includes(',') && !str.includes('.')) {
    str = str.replace(',', '.');
  } else if (str.includes(',') && str.includes('.')) {
    // E.g. "1,234.56" -> "1234.56"
    str = str.replace(/,/g, '');
  }

  let num = parseFloat(str);
  if (isNaN(num)) return null;

  if (isSouthOrWest && num > 0) {
    num = -num;
  }

  // Range validation
  if (isLatitude && (num < -90 || num > 90)) {
    return null;
  }
  if (!isLatitude && (num < -180 || num > 180)) {
    return null;
  }

  return num;
}

/**
 * Restores leading zeros on US ZIP codes stripped by Excel numeric coercion (e.g. 2138 -> "02138").
 */
export function sanitizePostalCode(val: any): string | null {
  if (val === null || val === undefined) return null;
  let str = String(val).trim();
  if (!str) return null;

  // Extract base 5-digit zip if formatted as ZIP+4 (e.g. "02138-1234")
  const match = str.match(/^(\d{1,5})/);
  if (match) {
    const rawNumber = match[1];
    // Pad to 5 digits
    return rawNumber.padStart(5, '0');
  }

  return str;
}
