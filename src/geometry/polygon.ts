import { Point2D, BoundingBox } from '../types/geometry';
import { distance } from './distance';

/**
 * Calculate the signed area of a 2D polygon using the Shoelace formula (Gauss's area formula).
 * Returns positive if counter-clockwise, negative if clockwise.
 */
export function polygonSignedArea(points: Point2D[]): number {
  const n = points.length;
  if (n < 3) return 0;

  let sum = 0;
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    sum += points[i].x * points[next].y - points[next].x * points[i].y;
  }
  return sum / 2;
}

/**
 * Calculate absolute polygon area in square meters.
 */
export function polygonArea(points: Point2D[]): number {
  return Math.abs(polygonSignedArea(points));
}

/**
 * Calculate total perimeter of a polygon in meters.
 * Sums all edges including the closing edge from last to first point.
 */
export function polygonPerimeter(points: Point2D[]): number {
  const n = points.length;
  if (n < 2) return 0;

  let total = 0;
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    total += distance(points[i], points[next]);
  }
  return total;
}

/**
 * Calculate the centroid (center of mass) of a polygon.
 * Used for placing the area label and property name.
 */
export function polygonCentroid(points: Point2D[]): Point2D {
  const n = points.length;
  if (n === 0) return { x: 0, y: 0 };
  if (n === 1) return { ...points[0] };
  if (n === 2) {
    return {
      x: (points[0].x + points[1].x) / 2,
      y: (points[0].y + points[1].y) / 2,
    };
  }

  const signedArea = polygonSignedArea(points);
  // If points are collinear or area is negligible, return arithmetic mean
  if (Math.abs(signedArea) < 1e-7) {
    let sumX = 0;
    let sumY = 0;
    for (const p of points) {
      sumX += p.x;
      sumY += p.y;
    }
    return { x: sumX / n, y: sumY / n };
  }

  let cx = 0;
  let cy = 0;
  for (let i = 0; i < n; i++) {
    const next = (i + 1) % n;
    const factor = points[i].x * points[next].y - points[next].x * points[i].y;
    cx += (points[i].x + points[next].x) * factor;
    cy += (points[i].y + points[next].y) * factor;
  }

  cx /= 6 * signedArea;
  cy /= 6 * signedArea;

  return { x: cx, y: cy };
}

/**
 * Compute the axis-aligned bounding box of an array of points
 */
export function getBoundingBox(points: Point2D[], padding: number = 0): BoundingBox {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 100, maxY: 100, width: 100, height: 100 };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  minX -= padding;
  minY -= padding;
  maxX += padding;
  maxY += padding;

  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);

  return { minX, minY, maxX, maxY, width, height };
}
