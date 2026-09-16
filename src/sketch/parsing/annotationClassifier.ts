import { AnnotationType } from '../types';
import { parseDistanceString } from './distanceParser';
import { parseBearingString } from './bearingParser';

export interface ClassifiedAnnotation {
  type: AnnotationType;
  confidence: number;
  value?: number;
  unit?: any;
  label?: string;
  cleanText: string;
}

/**
 * Classifies an OCR text block into survey annotation categories.
 */
export function classifyAnnotation(rawText: string): ClassifiedAnnotation {
  const s = rawText.trim();

  // 1. Check North Arrow indicators
  if (/^(?:N|North|NORTH)\s*(?:↑|\^|>|\|)?$/i.test(s) || /^(?:↑|\^)\s*(?:N|North)?$/i.test(s)) {
    return {
      type: 'northArrow',
      confidence: 0.92,
      cleanText: 'North ↑',
    };
  }

  // 2. Check Area annotation
  if (/(?:area|sq\s*m|m²|acres?|cents?|hectares?|sq\s*ft)/i.test(s) && /\d+/.test(s)) {
    return {
      type: 'area',
      confidence: 0.88,
      cleanText: s,
    };
  }

  // 3. Check Bearing / Azimuth
  // Quadrant bearing: starts with N or S and ends with E or W
  if (/^[NSns]\s*[0-9.]+.*[EWew]$/i.test(s) || (s.includes('°') && !s.toLowerCase().includes('m'))) {
    const parsedBearing = parseBearingString(s);
    if (parsedBearing !== null) {
      return {
        type: 'bearing',
        confidence: 0.89,
        value: parsedBearing.degrees,
        cleanText: s,
      };
    }
  }

  // 4. Check Distance
  const parsedDist = parseDistanceString(s);
  if (parsedDist !== null) {
    // If it has explicit 'm', 'ft', or numbers like 20.00
    const hasUnit = /[a-zA-Z'"]/.test(s);
    return {
      type: 'distance',
      confidence: hasUnit ? 0.95 : 0.78,
      value: parsedDist.valueInMeters,
      unit: parsedDist.unit,
      cleanText: `${parsedDist.originalValue} ${parsedDist.unit}`,
    };
  }

  // 5. Check Point / Station Label
  // Typically single capital letters (A, B, C, D) or P1, P2, BM, TP1
  if (/^[A-Z]$/.test(s) || /^(?:P|PT|STN|TP|BM)\s*\d+$/i.test(s)) {
    return {
      type: 'pointLabel',
      confidence: 0.94,
      label: s.toUpperCase(),
      cleanText: s.toUpperCase(),
    };
  }

  // 6. Descriptive Survey Notes (Road, Boundary, Fence, River)
  if (/^(?:road|street|fence|gate|boundary|property|building|house|river|tree|peg|stone|nail)$/i.test(s)) {
    return {
      type: 'note',
      confidence: 0.85,
      cleanText: s,
    };
  }

  return {
    type: 'unknown',
    confidence: 0.4,
    cleanText: s,
  };
}
