import { Point2D } from '../types/geometry';
import { AreaCalculationResult } from '../types/survey';
import { polygonArea, polygonPerimeter } from '../geometry/polygon';
import { polygonSelfIntersects } from '../geometry/intersection';
import { convertArea, convertDistance } from './units';

export interface ValidationReport {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate survey points and polygon geometry according to SDD Section 32
 */
export function validatePolygon(points: Point2D[], isClosed: boolean): ValidationReport {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (points.length < 3) {
    errors.push('Polygon requires at least 3 vertices to form an enclosed area.');
  }

  if (!isClosed) {
    errors.push('Polygon must be closed before calculating enclosed boundary area.');
  }

  // Check coordinates
  for (let i = 0; i < points.length; i++) {
    const pt = points[i];
    if (isNaN(pt.x) || isNaN(pt.y) || !isFinite(pt.x) || !isFinite(pt.y)) {
      errors.push(`Vertex ${i + 1} has invalid or non-numeric coordinates.`);
      break;
    }
  }

  // Check duplicate consecutive vertices
  for (let i = 0; i < points.length; i++) {
    const next = (i + 1) % points.length;
    const dx = points[i].x - points[next].x;
    const dy = points[i].y - points[next].y;
    if (Math.sqrt(dx * dx + dy * dy) < 1e-5 && points.length > 2) {
      warnings.push(`Duplicate or identical consecutive vertices detected at station ${i + 1}.`);
      break;
    }
  }

  // Check self-intersections
  if (points.length >= 4 && polygonSelfIntersects(points)) {
    warnings.push('Boundary contains intersecting segments. Enclosed area calculation may be invalid.');
  }

  // Check area
  const rawArea = polygonArea(points);
  if (points.length >= 3 && rawArea < 1e-4) {
    errors.push('Polygon vertices are collinear or form a zero enclosed area.');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Compute full area & perimeter result across all standard units
 */
export function computeAreaResults(points: Point2D[], isClosed: boolean = true): AreaCalculationResult {
  const validation = validatePolygon(points, isClosed);
  const selfIntersect = points.length >= 4 ? polygonSelfIntersects(points) : false;

  if (!validation.isValid) {
    return {
      sqMeters: 0,
      sqFeet: 0,
      acres: 0,
      cents: 0,
      hectares: 0,
      sqYards: 0,
      perimeterMeters: 0,
      perimeterFeet: 0,
      vertexCount: points.length,
      hasSelfIntersections: selfIntersect,
      isValid: false,
      validationError: validation.errors[0],
    };
  }

  const sqMeters = polygonArea(points);
  const perimeterMeters = polygonPerimeter(points);

  return {
    sqMeters,
    sqFeet: convertArea(sqMeters, 'sqm', 'sqft'),
    acres: convertArea(sqMeters, 'sqm', 'acre'),
    cents: convertArea(sqMeters, 'sqm', 'cent'),
    hectares: convertArea(sqMeters, 'sqm', 'hectare'),
    sqYards: convertArea(sqMeters, 'sqm', 'sqyd'),
    perimeterMeters,
    perimeterFeet: convertDistance(perimeterMeters, 'm', 'ft'),
    vertexCount: points.length,
    hasSelfIntersections: selfIntersect,
    isValid: true,
  };
}
