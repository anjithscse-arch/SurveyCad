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

/**
 * Bearing-Bearing Intersection (COGO):
 * Calculate the intersection point of two bearing rays emanating from p1 and p2.
 * Angles in degrees clockwise from North.
 */
export function bearingBearingIntersection(
  p1: Point2D,
  bearing1Deg: number,
  p2: Point2D,
  bearing2Deg: number
): Point2D | null {
  const rad1 = (bearing1Deg * Math.PI) / 180;
  const rad2 = (bearing2Deg * Math.PI) / 180;

  const u1x = Math.sin(rad1);
  const u1y = Math.cos(rad1);
  const u2x = Math.sin(rad2);
  const u2y = Math.cos(rad2);

  // Determinant
  const det = u1y * u2x - u1x * u2y;
  if (Math.abs(det) < 1e-9) return null; // Parallel or anti-parallel

  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  const t1 = (dy * u2x - dx * u2y) / det;
  return {
    x: p1.x + t1 * u1x,
    y: p1.y + t1 * u1y,
  };
}

/**
 * Distance-Distance Intersection (COGO Trilateration):
 * Find the intersection point(s) of two circles with center p1 (radius r1) and center p2 (radius r2).
 * Returns 0, 1, or 2 candidate points.
 */
export function distanceDistanceIntersection(
  p1: Point2D,
  r1: number,
  p2: Point2D,
  r2: number
): Point2D[] {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const d = Math.sqrt(dx * dx + dy * dy);

  if (d < 1e-9 || d > r1 + r2 || d < Math.abs(r1 - r2)) {
    return []; // Concentric or no intersection
  }

  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, r1 * r1 - a * a));

  const x2 = p1.x + (a * dx) / d;
  const y2 = p1.y + (a * dy) / d;

  if (h < 1e-9) {
    return [{ x: x2, y: y2 }];
  }

  const rx = -(dy / d) * h;
  const ry = (dx / d) * h;

  return [
    { x: x2 + rx, y: y2 + ry },
    { x: x2 - rx, y: y2 - ry },
  ];
}

/**
 * Bearing-Distance Intersection (COGO):
 * Find the intersection of a ray from p1 at bearing1 with a circle at p2 with radius r2.
 */
export function bearingDistanceIntersection(
  p1: Point2D,
  bearing1Deg: number,
  p2: Point2D,
  r2: number
): Point2D[] {
  const rad = (bearing1Deg * Math.PI) / 180;
  const ux = Math.sin(rad);
  const uy = Math.cos(rad);

  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;

  const b = 2 * (dx * ux + dy * uy);
  const c = dx * dx + dy * dy - r2 * r2;

  const disc = b * b - 4 * c;
  if (disc < -1e-9) return [];

  if (Math.abs(disc) < 1e-9) {
    const t = -b / 2;
    return [{ x: p1.x + t * ux, y: p1.y + t * uy }];
  }

  const sqrtDisc = Math.sqrt(disc);
  const t1 = (-b + sqrtDisc) / 2;
  const t2 = (-b - sqrtDisc) / 2;

  return [
    { x: p1.x + t1 * ux, y: p1.y + t1 * uy },
    { x: p1.x + t2 * ux, y: p1.y + t2 * uy },
  ];
}
