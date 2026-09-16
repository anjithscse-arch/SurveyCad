import { Point2D } from '../types/geometry';

/**
 * Euclidean distance between two 2D points in meters
 */
export function distance(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Shortest distance from point P to line segment AB,
 * and the closest projection point on the segment.
 */
export function pointToSegmentDistance(
  p: Point2D,
  a: Point2D,
  b: Point2D
): { dist: number; closest: Point2D; t: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return { dist: distance(p, a), closest: { ...a }, t: 0 };
  }

  // Projection parameter t
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const closest = {
    x: a.x + t * dx,
    y: a.y + t * dy,
  };

  return {
    dist: distance(p, closest),
    closest,
    t,
  };
}
