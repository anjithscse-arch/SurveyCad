import { Point2D } from '../types/geometry';

/**
 * Check orientation of triplet (p, q, r).
 * Returns:
 *  0 -> Collinear
 *  1 -> Clockwise
 *  2 -> Counterclockwise
 */
function orientation(p: Point2D, q: Point2D, r: Point2D): number {
  const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
  if (Math.abs(val) < 1e-9) return 0;
  return val > 0 ? 1 : 2;
}

/**
 * Check if point q lies on segment pr (given that p, q, r are collinear)
 */
function onSegment(p: Point2D, q: Point2D, r: Point2D): boolean {
  return (
    q.x <= Math.max(p.x, r.x) + 1e-9 &&
    q.x >= Math.min(p.x, r.x) - 1e-9 &&
    q.y <= Math.max(p.y, r.y) + 1e-9 &&
    q.y >= Math.min(p.y, r.y) - 1e-9
  );
}

/**
 * Determine if line segment p1q1 and line segment p2q2 intersect strictly or at a non-endpoint.
 * If allowSharedEndpoint is true, sharing an identical endpoint does NOT count as an intersection.
 */
export function segmentsIntersect(
  p1: Point2D,
  q1: Point2D,
  p2: Point2D,
  q2: Point2D,
  allowSharedEndpoint: boolean = true
): boolean {
  // Check if segments share an endpoint
  const shareEndpoint =
    (Math.abs(p1.x - p2.x) < 1e-9 && Math.abs(p1.y - p2.y) < 1e-9) ||
    (Math.abs(p1.x - q2.x) < 1e-9 && Math.abs(p1.y - q2.y) < 1e-9) ||
    (Math.abs(q1.x - p2.x) < 1e-9 && Math.abs(q1.y - p2.y) < 1e-9) ||
    (Math.abs(q1.x - q2.x) < 1e-9 && Math.abs(q1.y - q2.y) < 1e-9);

  if (shareEndpoint) {
    if (allowSharedEndpoint) return false;
    return true;
  }

  const o1 = orientation(p1, q1, p2);
  const o2 = orientation(p1, q1, q2);
  const o3 = orientation(p2, q2, p1);
  const o4 = orientation(p2, q2, q1);

  // General intersection case
  if (o1 !== o2 && o3 !== o4) {
    return true;
  }

  // Collinear cases
  if (o1 === 0 && onSegment(p1, p2, q1)) return true;
  if (o2 === 0 && onSegment(p1, q2, q1)) return true;
  if (o3 === 0 && onSegment(p2, p1, q2)) return true;
  if (o4 === 0 && onSegment(p2, q1, q2)) return true;

  return false;
}

/**
 * Calculate the exact intersection point of two infinite lines, if they intersect.
 */
export function lineIntersection(
  p1: Point2D,
  p2: Point2D,
  p3: Point2D,
  p4: Point2D
): Point2D | null {
  const d = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x);
  if (Math.abs(d) < 1e-9) return null; // Parallel or coincident

  const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / d;
  return {
    x: p1.x + t * (p2.x - p1.x),
    y: p1.y + t * (p2.y - p1.y),
  };
}

/**
 * Check if a closed polygon with n vertices self-intersects.
 * Checks all non-adjacent pairs of segments.
 */
export function polygonSelfIntersects(points: Point2D[]): boolean {
  const n = points.length;
  if (n < 4) return false;

  for (let i = 0; i < n; i++) {
    const p1 = points[i];
    const q1 = points[(i + 1) % n];

    for (let j = i + 1; j < n; j++) {
      // Adjacent edges share an endpoint, so skip them
      if (Math.abs(i - j) <= 1 || (i === 0 && j === n - 1)) {
        continue;
      }

      const p2 = points[j];
      const q2 = points[(j + 1) % n];

      if (segmentsIntersect(p1, q1, p2, q2, true)) {
        return true;
      }
    }
  }

  return false;
}
