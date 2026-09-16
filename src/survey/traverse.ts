import { Point2D, SurveyPoint } from '../types/geometry';
import { TraverseLeg, ClosureAnalysis } from '../types/survey';
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
