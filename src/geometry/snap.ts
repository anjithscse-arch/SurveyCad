import { Point2D, SurveyPoint, SurveyLine, ViewportTransform } from '../types/geometry';
import { distance, pointToSegmentDistance } from './distance';
import { lineIntersection, segmentsIntersect } from './intersection';

export type SnapType = 'endpoint' | 'midpoint' | 'grid' | 'nearest' | 'intersection';

export interface SnapResult {
  point: Point2D;
  type: SnapType;
  targetId?: string;
  description: string;
}

/**
 * Find the best snap target near a cursor world point.
 * Snap tolerance is given in screen pixels and converted to world units.
 */
export function findSnap(
  cursorWorld: Point2D,
  points: SurveyPoint[],
  lines: SurveyLine[],
  vp: ViewportTransform,
  options: {
    snapTolerancePixels?: number;
    enableGrid?: boolean;
    gridSpacing?: number;
    excludePointIds?: string[];
  } = {}
): SnapResult | null {
  const tolerancePx = options.snapTolerancePixels ?? 14;
  const toleranceWorld = tolerancePx / vp.zoom;
  const exclude = new Set(options.excludePointIds || []);

  const pointMap = new Map<string, SurveyPoint>();
  points.forEach((p) => pointMap.set(p.id, p));

  // 1. Check Endpoints / Points (Highest Priority)
  let closestPoint: SurveyPoint | null = null;
  let minPointDist = toleranceWorld;

  for (const pt of points) {
    if (exclude.has(pt.id)) continue;
    const d = distance(cursorWorld, pt);
    if (d < minPointDist) {
      minPointDist = d;
      closestPoint = pt;
    }
  }

  if (closestPoint) {
    return {
      point: { x: closestPoint.x, y: closestPoint.y },
      type: 'endpoint',
      targetId: closestPoint.id,
      description: `Point ${closestPoint.label}`,
    };
  }

  // 2. Check Line Midpoints
  let closestMidpoint: Point2D | null = null;
  let minMidDist = toleranceWorld;
  let midLineId: string | undefined;

  for (const line of lines) {
    const p1 = pointMap.get(line.startPointId);
    const p2 = pointMap.get(line.endPointId);
    if (!p1 || !p2) continue;

    const mid: Point2D = {
      x: (p1.x + p2.x) / 2,
      y: (p1.y + p2.y) / 2,
    };

    const d = distance(cursorWorld, mid);
    if (d < minMidDist) {
      minMidDist = d;
      closestMidpoint = mid;
      midLineId = line.id;
    }
  }

  if (closestMidpoint) {
    return {
      point: closestMidpoint,
      type: 'midpoint',
      targetId: midLineId,
      description: 'Midpoint',
    };
  }

  // 3. Check Line Intersections
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const p1 = pointMap.get(lines[i].startPointId);
      const q1 = pointMap.get(lines[i].endPointId);
      const p2 = pointMap.get(lines[j].startPointId);
      const q2 = pointMap.get(lines[j].endPointId);
      if (!p1 || !q1 || !p2 || !q2) continue;

      if (segmentsIntersect(p1, q1, p2, q2, true)) {
        const inter = lineIntersection(p1, q1, p2, q2);
        if (inter && distance(cursorWorld, inter) < toleranceWorld) {
          return {
            point: inter,
            type: 'intersection',
            description: 'Intersection',
          };
        }
      }
    }
  }

  // 4. Check Nearest Line Segment
  let closestOnSegment: Point2D | null = null;
  let minSegDist = toleranceWorld;
  let segLineId: string | undefined;

  for (const line of lines) {
    const p1 = pointMap.get(line.startPointId);
    const p2 = pointMap.get(line.endPointId);
    if (!p1 || !p2) continue;

    const { dist, closest } = pointToSegmentDistance(cursorWorld, p1, p2);
    if (dist < minSegDist) {
      minSegDist = dist;
      closestOnSegment = closest;
      segLineId = line.id;
    }
  }

  if (closestOnSegment) {
    return {
      point: closestOnSegment,
      type: 'nearest',
      targetId: segLineId,
      description: 'On Line',
    };
  }

  // 5. Grid Snap (if enabled)
  if (options.enableGrid && options.gridSpacing && options.gridSpacing > 0) {
    const gs = options.gridSpacing;
    const gx = Math.round(cursorWorld.x / gs) * gs;
    const gy = Math.round(cursorWorld.y / gs) * gs;
    const gridPt: Point2D = { x: gx, y: gy };

    if (distance(cursorWorld, gridPt) < toleranceWorld * 1.5) {
      return {
        point: gridPt,
        type: 'grid',
        description: `Grid (${gx.toFixed(1)}, ${gy.toFixed(1)})`,
      };
    }
  }

  return null;
}
