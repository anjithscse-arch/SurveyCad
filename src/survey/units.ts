import { LinearUnit, AreaUnit } from '../types/survey';

// Canonical linear unit is METERS (m)
export const LINEAR_TO_METERS: Record<LinearUnit, number> = {
  m: 1,
  cm: 0.01,
  mm: 0.001,
  ft: 0.3048,
  in: 0.0254,
};

export const LINEAR_LABELS: Record<LinearUnit, string> = {
  m: 'm',
  cm: 'cm',
  mm: 'mm',
  ft: 'ft',
  in: 'in',
};

// Canonical area unit is SQUARE METERS (m²)
// 1 acre = 4046.8564224 m²
// 1 cent = 1/100 acre = 40.468564224 m² = 435.6 sq ft
// 1 hectare = 10000 m²
// 1 sq ft = 0.3048 * 0.3048 = 0.09290304 m²
// 1 sq yd = 9 sq ft = 0.83612736 m²
export const AREA_TO_SQMETERS: Record<AreaUnit, number> = {
  sqm: 1,
  sqft: 0.09290304,
  acre: 4046.8564224,
  cent: 40.468564224,
  hectare: 10000,
  sqyd: 0.83612736,
};

export const AREA_LABELS: Record<AreaUnit, string> = {
  sqm: 'm²',
  sqft: 'ft²',
  acre: 'acres',
  cent: 'cents',
  hectare: 'ha',
  sqyd: 'sq yd',
};

/**
 * Convert a linear distance from one unit to another
 */
export function convertDistance(value: number, from: LinearUnit, to: LinearUnit): number {
  const inMeters = value * LINEAR_TO_METERS[from];
  return inMeters / LINEAR_TO_METERS[to];
}

/**
 * Convert an area from one unit to another
 */
export function convertArea(value: number, from: AreaUnit, to: AreaUnit): number {
  const inSqMeters = value * AREA_TO_SQMETERS[from];
  return inSqMeters / AREA_TO_SQMETERS[to];
}

/**
 * Format a number with given decimal precision and comma grouping
 */
export function formatNumber(val: number, precision: number = 2): string {
  if (isNaN(val) || !isFinite(val)) return '—';
  return val.toLocaleString('en-US', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  });
}

/**
 * Format linear distance with unit suffix
 */
export function formatDistance(valInMeters: number, unit: LinearUnit = 'm', precision: number = 2): string {
  const converted = convertDistance(valInMeters, 'm', unit);
  return `${formatNumber(converted, precision)} ${LINEAR_LABELS[unit]}`;
}

/**
 * Format area with unit suffix
 */
export function formatArea(valInSqMeters: number, unit: AreaUnit = 'sqm', precision: number = 2): string {
  const converted = convertArea(valInSqMeters, 'sqm', unit);
  return `${formatNumber(converted, precision)} ${AREA_LABELS[unit]}`;
}
