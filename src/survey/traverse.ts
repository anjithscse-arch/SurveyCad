import { Point2D, SurveyPoint } from '../types/geometry';
import { TraverseLeg, ClosureAnalysis, AdjustedStation, TraverseAdjustmentResult } from '../types/survey';
import { calculateBearing } from '../geometry/bearing';
import { distance } from '../geometry/distance';

/**
 * Generate traverse legs from an ordered list of survey points.
 * If isClosed is true, includes the return leg from last point to first.
 */
export function calculateTraverseLegs(points: SurveyPoint[], isClosed: boolean): TraverseLeg[] {
  const n = points.length;
  if (n < 2) return [];

  const legs: TraverseLeg[] = [];
  const count = isClosed ? n : n - 1;

  for (let i = 0; i < count; i++) {
    const from = points[i];
    const to = points[(i + 1) % n];

    const dist = distance(from, to);
    const bearing = calculateBearing(from, to);

    // Delta Easting (+X) and Delta Northing (+Y)
    const deltaE = to.x - from.x;
    const deltaN = to.y - from.y;

    legs.push({
      fromId: from.id,
      toId: to.id,
      distance: dist,
      bearingDeg: bearing,
      deltaE,
      deltaN,
    });
  }

  return legs;
}

/**
 * Compute closure error and relative precision for a closed traverse.
 * As defined in Section 62 of SDD:
 * Closure error: e = sqrt((ΣΔX)² + (ΣΔY)²)
 * Relative precision = Total traverse length / Closure error
 */
export function calculateClosure(legs: TraverseLeg[]): ClosureAnalysis {
  if (legs.length < 3) {
    return {
      sumDeltaE: 0,
      sumDeltaN: 0,
      closureError: 0,
      totalLength: 0,
      relativePrecision: Infinity,
      precisionString: '—',
      isAcceptable: true,
    };
  }

  let sumDeltaE = 0;
  let sumDeltaN = 0;
  let totalLength = 0;

  for (const leg of legs) {
    sumDeltaE += leg.deltaE;
    sumDeltaN += leg.deltaN;
    totalLength += leg.distance;
  }

  const closureError = Math.sqrt(sumDeltaE * sumDeltaE + sumDeltaN * sumDeltaN);
  let relativePrecision = Infinity;
  let precisionString = '1 : ∞ (Exact)';

  if (closureError > 1e-6 && totalLength > 0) {
    relativePrecision = Math.round(totalLength / closureError);
    precisionString = `1 : ${relativePrecision.toLocaleString()}`;
  }

  return {
    sumDeltaE,
    sumDeltaN,
    closureError,
    totalLength,
    relativePrecision,
    precisionString,
    isAcceptable: relativePrecision >= 5000 || closureError < 0.05,
  };
}

/**
 * Adjust a closed traverse using Bowditch's Compass Rule.
 * Corrections are distributed proportionally to the length of each traverse leg.
 * As defined in Section 65 of SDD:
 * Station i correction is proportional to cumulative distance up to station i.
 */
/**
 * Adjust a closed traverse using Bowditch's Compass Rule.
 * Corrections are distributed proportionally to the length of each traverse leg.
 * As defined in Section 65 of SDD:
 * Station i correction is proportional to cumulative distance up to station i.
 */
export function adjustTraverseBowditch(
  points: SurveyPoint[],
  measuredLegs?: TraverseLeg[]
): TraverseAdjustmentResult {
  const n = points.length;
  if (n < 3) {
    return {
      method: 'bowditch',
      stations: points.map((p) => ({
        id: p.id,
        label: p.label,
        originalX: p.x,
        originalY: p.y,
        adjustedX: p.x,
        adjustedY: p.y,
        deltaX: 0,
        deltaY: 0,
      })),
      originalClosureError: 0,
      residualError: 0,
      totalLength: 0,
    };
  }

  const legs = measuredLegs && measuredLegs.length > 0 ? measuredLegs : calculateTraverseLegs(points, true);
  const closure = calculateClosure(legs);

  let totalLength = 0;
  for (const leg of legs) {
    totalLength += leg.distance;
  }

  if (totalLength === 0 || closure.closureError < 1e-12) {
    return {
      method: 'bowditch',
      stations: points.map((p) => ({
        id: p.id,
        label: p.label,
        originalX: p.x,
        originalY: p.y,
        adjustedX: p.x,
        adjustedY: p.y,
        deltaX: 0,
        deltaY: 0,
      })),
      originalClosureError: closure.closureError,
      residualError: 0,
      totalLength,
    };
  }

  let cumulativeLength = 0;
  const stations: AdjustedStation[] = [];

  for (let i = 0; i < n; i++) {
    const pt = points[i];
    // Fraction of total distance traversed up to station i
    const ratio = cumulativeLength / totalLength;

    const corrX = -ratio * closure.sumDeltaE;
    const corrY = -ratio * closure.sumDeltaN;

    const adjX = pt.x + corrX;
    const adjY = pt.y + corrY;

    stations.push({
      id: pt.id,
      label: pt.label,
      originalX: pt.x,
      originalY: pt.y,
      adjustedX: adjX,
      adjustedY: adjY,
      deltaX: corrX,
      deltaY: corrY,
    });

    // Advance distance along leg i -> i+1 (if available)
    if (legs[i]) {
      cumulativeLength += legs[i].distance;
    }
  }

  // Calculate residual closure of adjusted stations
  const adjustedPoints: SurveyPoint[] = stations.map((s) => ({
    id: s.id,
    label: s.label,
    x: s.adjustedX,
    y: s.adjustedY,
  }));
  const adjLegs = calculateTraverseLegs(adjustedPoints, true);
  const adjClosure = calculateClosure(adjLegs);

  return {
    method: 'bowditch',
    stations,
    originalClosureError: closure.closureError,
    residualError: adjClosure.closureError,
    totalLength,
  };
}

/**
 * Adjust a closed traverse using the Transit Rule.
 * Corrections are distributed proportionally to the absolute departures and latitudes.
 */
export function adjustTraverseTransit(
  points: SurveyPoint[],
  measuredLegs?: TraverseLeg[]
): TraverseAdjustmentResult {
  const n = points.length;
  if (n < 3) {
    return {
      method: 'transit',
      stations: points.map((p) => ({
        id: p.id,
        label: p.label,
        originalX: p.x,
        originalY: p.y,
        adjustedX: p.x,
        adjustedY: p.y,
        deltaX: 0,
        deltaY: 0,
      })),
      originalClosureError: 0,
      residualError: 0,
      totalLength: 0,
    };
  }

  const legs = measuredLegs && measuredLegs.length > 0 ? measuredLegs : calculateTraverseLegs(points, true);
  const closure = calculateClosure(legs);

  let sumAbsDeltaE = 0;
  let sumAbsDeltaN = 0;
  let totalLength = 0;

  for (const leg of legs) {
    sumAbsDeltaE += Math.abs(leg.deltaE);
    sumAbsDeltaN += Math.abs(leg.deltaN);
    totalLength += leg.distance;
  }

  if (sumAbsDeltaE === 0 || sumAbsDeltaN === 0 || closure.closureError < 1e-12) {
    return {
      method: 'transit',
      stations: points.map((p) => ({
        id: p.id,
        label: p.label,
        originalX: p.x,
        originalY: p.y,
        adjustedX: p.x,
        adjustedY: p.y,
        deltaX: 0,
        deltaY: 0,
      })),
      originalClosureError: closure.closureError,
      residualError: 0,
      totalLength,
    };
  }

  let cumAbsE = 0;
  let cumAbsN = 0;
  const stations: AdjustedStation[] = [];

  for (let i = 0; i < n; i++) {
    const pt = points[i];
    const ratioE = cumAbsE / sumAbsDeltaE;
    const ratioN = cumAbsN / sumAbsDeltaN;

    const corrX = -ratioE * closure.sumDeltaE;
    const corrY = -ratioN * closure.sumDeltaN;

    const adjX = pt.x + corrX;
    const adjY = pt.y + corrY;

    stations.push({
      id: pt.id,
      label: pt.label,
      originalX: pt.x,
      originalY: pt.y,
      adjustedX: adjX,
      adjustedY: adjY,
      deltaX: corrX,
      deltaY: corrY,
    });

    cumAbsE += Math.abs(legs[i].deltaE);
    cumAbsN += Math.abs(legs[i].deltaN);
  }

  const adjustedPoints: SurveyPoint[] = stations.map((s) => ({
    id: s.id,
    label: s.label,
    x: s.adjustedX,
    y: s.adjustedY,
  }));
  const adjLegs = calculateTraverseLegs(adjustedPoints, true);
  const adjClosure = calculateClosure(adjLegs);

  return {
    method: 'transit',
    stations,
    originalClosureError: closure.closureError,
    residualError: adjClosure.closureError,
    totalLength,
  };
}
