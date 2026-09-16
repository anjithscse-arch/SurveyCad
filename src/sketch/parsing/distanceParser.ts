import { LinearUnit } from '../../types/survey';
import { convertDistance } from '../../survey/units';

export interface ParsedDistance {
  valueInMeters: number;
  originalValue: number;
  unit: LinearUnit;
  rawText: string;
}

/**
 * Parses distance text from survey sketches.
 * Examples: "30m", "30.25 m", "120 ft", "30 metres", "25' 6\""
 */
export function parseDistanceString(text: string): ParsedDistance | null {
  const s = text.trim();
  if (!s) return null;

  // 1. Feet and inches format: e.g. 25' 6" or 25ft 6in
  const ftInMatch = s.match(/^(\d+(?:\.\d+)?)\s*(?:'|ft|feet)\s*(\d+(?:\.\d+)?)\s*(?:"|in|inch(?:es)?)?$/i);
  if (ftInMatch) {
    const feet = parseFloat(ftInMatch[1]);
    const inches = parseFloat(ftInMatch[2]);
    const totalFeet = feet + inches / 12;
    return {
      valueInMeters: convertDistance(totalFeet, 'ft', 'm'),
      originalValue: totalFeet,
      unit: 'ft',
      rawText: s,
    };
  }

  // 2. Standard number + unit regex: e.g. 30.25 m, 20m, 100ft, 50 cm
  const unitMatch = s.match(/^(\d+(?:\.\d+)?)\s*(m|meter(?:s)?|metre(?:s)?|ft|foot|feet|cm|centimeter(?:s)?|mm|millimeter(?:s)?|in|inch(?:es)?)?$/i);
  if (unitMatch) {
    const num = parseFloat(unitMatch[1]);
    if (isNaN(num) || num <= 0) return null;

    const unitStr = (unitMatch[2] || 'm').toLowerCase();
    let unit: LinearUnit = 'm';

    if (unitStr.startsWith('ft') || unitStr.startsWith('foot') || unitStr.startsWith('feet')) {
      unit = 'ft';
    } else if (unitStr.startsWith('cm')) {
      unit = 'cm';
    } else if (unitStr.startsWith('mm')) {
      unit = 'mm';
    } else if (unitStr.startsWith('in')) {
      unit = 'in';
    } else {
      unit = 'm';
    }

    return {
      valueInMeters: convertDistance(num, unit, 'm'),
      originalValue: num,
      unit,
      rawText: s,
    };
  }

  return null;
}
