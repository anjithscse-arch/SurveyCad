import { PointCandidate, LineCandidate, MeasurementCandidate, Point2D } from '../types';

/**
 * Calculates Euclidean distance between two 2D points in pixel coordinates.
 */
function dist(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Shortest distance from a point to a line segment in pixel coordinates.
 */
function distToSegment(p: Point2D, a: Point2D, b: Point2D): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return dist(p, a);

  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const proj = { x: a.x + t * dx, y: a.y + t * dy };
  return dist(p, proj);
}

/**
 * Associates detected measurements with the nearest candidate boundary line segment.
 */
export function associateMeasurementsWithLines(
  measurements: MeasurementCandidate[],
  lines: LineCandidate[],
  points: PointCandidate[]
): MeasurementCandidate[] {
  const pointMap = new Map<string, PointCandidate>();
  points.forEach((p) => pointMap.set(p.label, p));

  return measurements.map((m) => {
    // If already has suggested sides, keep them
    if (m.suggestedFrom && m.suggestedTo) {
      return m;
    }

    // Measurement center point
    const mCenter: Point2D = {
      x: m.boundingBox.x + m.boundingBox.width / 2,
      y: m.boundingBox.y + m.boundingBox.height / 2,
    };

    let closestLine: LineCandidate | null = null;
    let minDistance = Infinity;

    for (const line of lines) {
      const d = distToSegment(mCenter, line.start, line.end);
      if (d < minDistance) {
        minDistance = d;
        closestLine = line;
      }
    }

    if (closestLine && closestLine.startPointLabel && closestLine.endPointLabel) {
      return {
        ...m,
        suggestedFrom: closestLine.startPointLabel,
        suggestedTo: closestLine.endPointLabel,
        confidence: Math.min(m.confidence, minDistance < 60 ? 0.94 : 0.75),
      };
    }

    return m;
  });
}
