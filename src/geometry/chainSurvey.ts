import { Point2D } from '../types/geometry';
import { distance } from './distance';
import { solveRadiusChordArc, ArcRadiusResult } from './arc';

export class ChainSurveyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChainSurveyError';
  }
}

/**
 * Returns the number of diagonals needed from Point 1 for an n-sided polygon.
 * An n-sided polygon requires exactly n - 3 diagonals.
 */
export function diagonalsNeeded(n: number): number {
  return Math.max(0, n - 3);
}

export interface ChainSurveyResult {
  points: Point2D[];
}

/**
 * Solves a closed polygon boundary using fan triangulation from station P1.
 *
 * @param sides Array of n boundary side lengths:
 *              sides[0]: P1 -> P2
 *              sides[1]: P2 -> P3
 *              ...
 *              sides[n-2]: P(n-1) -> Pn
 *              sides[n-1]: Pn -> P1 (closing side)
 * @param diagonals Array of (n - 3) diagonal lengths from P1:
 *                  diagonals[0]: P1 -> P3
 *                  diagonals[1]: P1 -> P4
 *                  ...
 *                  diagonals[n-4]: P1 -> P(n-1)
 *
 * @returns Object with reconstructed 2D points [P1, P2, ..., Pn].
 */
export function solveChainSurvey(sides: number[], diagonals: number[]): ChainSurveyResult {
  const n = sides.length;

  if (n < 3) {
    throw new ChainSurveyError(`A polygon boundary must have at least 3 sides (received ${n})`);
  }

  const expectedDiagonals = diagonalsNeeded(n);
  if (diagonals.length !== expectedDiagonals) {
    throw new ChainSurveyError(
      `Expected ${expectedDiagonals} diagonal${expectedDiagonals === 1 ? '' : 's'} for a ${n}-sided polygon, but received ${diagonals.length}`
    );
  }

  for (let i = 0; i < sides.length; i++) {
    const s = sides[i];
    if (typeof s !== 'number' || isNaN(s) || s <= 0 || !isFinite(s)) {
      throw new ChainSurveyError(`Side ${i + 1} must be a positive number (received ${s})`);
    }
  }

  for (let i = 0; i < diagonals.length; i++) {
    const d = diagonals[i];
    if (typeof d !== 'number' || isNaN(d) || d <= 0 || !isFinite(d)) {
      throw new ChainSurveyError(`Diagonal P1->P${i + 3} must be a positive number (received ${d})`);
    }
  }

  // P1 is placed at the origin (0, 0)
  const points: Point2D[] = [{ x: 0, y: 0 }];

  // P2 is placed along the positive X-axis (baseline)
  points.push({ x: sides[0], y: 0 });

  // Array storing straight-line distance from P1 to each vertex
  const dist1: number[] = new Array(n).fill(0);
  dist1[0] = 0;
  dist1[1] = sides[0];

  for (let k = 2; k <= n - 2; k++) {
    dist1[k] = diagonals[k - 2];
  }
  // dist1[n - 1] (distance P1 to Pn) is the closing boundary side: sides[n - 1]
  dist1[n - 1] = sides[n - 1];

  let dirAngle = 0; // Direction angle of ray P1 -> P(current)

  // Place intermediate points P3 to P(n-1)
  for (let k = 2; k <= n - 2; k++) {
    const b = dist1[k - 1];          // P1 to P(prev)
    const c = diagonals[k - 2];       // P1 to P(current)
    const a = sides[k - 1];           // P(prev) to P(current)

    let cosTheta = (b * b + c * c - a * a) / (2 * b * c);

    // Floating-point clamping for near-collinear / exact boundary cases
    if (cosTheta > 1 && cosTheta < 1 + 1e-9) cosTheta = 1;
    if (cosTheta < -1 && cosTheta > -1 - 1e-9) cosTheta = -1;

    if (cosTheta < -1 || cosTheta > 1 || isNaN(cosTheta)) {
      throw new ChainSurveyError(
        `Inconsistent tape measurements for triangle (P1, P${k}, P${k + 1}): sides ${b.toFixed(3)}, ${c.toFixed(3)}, ${a.toFixed(3)} cannot form a real triangle`
      );
    }

    const theta = Math.acos(cosTheta);
    dirAngle += theta;

    points.push({
      x: c * Math.cos(dirAngle),
      y: c * Math.sin(dirAngle),
    });
  }

  // Place final point Pn (vertex index n - 1)
  // Triangle (P1, P(n-1), Pn)
  const b = dist1[n - 2];       // P1 to P(n-1)
  const c = sides[n - 1];        // P1 to Pn (closing side)
  const a = sides[n - 2];        // P(n-1) to Pn

  let cosTheta = (b * b + c * c - a * a) / (2 * b * c);

  if (cosTheta > 1 && cosTheta < 1 + 1e-9) cosTheta = 1;
  if (cosTheta < -1 && cosTheta > -1 - 1e-9) cosTheta = -1;

  if (cosTheta < -1 || cosTheta > 1 || isNaN(cosTheta)) {
    throw new ChainSurveyError(
      `Inconsistent tape measurements for closing triangle (P1, P${n - 1}, P${n}): sides ${b.toFixed(3)}, ${c.toFixed(3)}, ${a.toFixed(3)} cannot form a real triangle`
    );
  }

  const theta = Math.acos(cosTheta);
  dirAngle += theta;

  points.push({
    x: c * Math.cos(dirAngle),
    y: c * Math.sin(dirAngle),
  });

  return { points };
}

/**
 * Calculates the circle radius given chord length and mid-ordinate (sagitta).
 * Formula: R = (c² / 8m) + (m / 2)
 */
export function arcRadiusFromChordAndMidOrdinate(chord: number, midOrdinate: number): number {
  if (chord <= 0 || midOrdinate <= 0 || !isFinite(chord) || !isFinite(midOrdinate)) {
    throw new ChainSurveyError('Chord and mid-ordinate must both be positive numbers');
  }
  return (chord * chord) / (8 * midOrdinate) + midOrdinate / 2;
}

export interface SolvedChainArc {
  arcResult: ArcRadiusResult;
  isConvexOrOutward: boolean;
}

/**
 * Solves a curved boundary segment arc between p1 and p2 using chord and mid-ordinate,
 * automatically orienting the arc bulge outward or inward relative to the polygon centroid.
 */
export function solveChainSurveyArc(
  p1: Point2D,
  p2: Point2D,
  midOrdinate: number,
  bulge: 'outward' | 'inward',
  centroid: Point2D
): SolvedChainArc {
  const chord = distance(p1, p2);
  const radius = arcRadiusFromChordAndMidOrdinate(chord, midOrdinate);

  const candA = solveRadiusChordArc(p1, p2, radius, true);
  const candB = solveRadiusChordArc(p1, p2, radius, false);

  if (!candA || !candB) {
    throw new ChainSurveyError('Unable to solve circular arc for given chord and mid-ordinate');
  }

  // Find the apex / peak of each candidate arc curve
  const getApex = (cand: ArcRadiusResult): Point2D => {
    const midX = (p1.x + p2.x) / 2;
    const midY = (p1.y + p2.y) / 2;
    const h = distance(cand.center, { x: midX, y: midY });

    if (h > 1e-7) {
      return {
        x: cand.center.x + ((midX - cand.center.x) / h) * radius,
        y: cand.center.y + ((midY - cand.center.y) / h) * radius,
      };
    }

    // Semicircle case (center equals midpoint of chord)
    const dx = (p2.x - p1.x) / chord;
    const dy = (p2.y - p1.y) / chord;
    const sign = cand.isClockwise ? 1 : -1;
    return {
      x: midX - sign * radius * dy,
      y: midY + sign * radius * dx,
    };
  };

  const apexA = getApex(candA);
  const apexB = getApex(candB);

  const distA = distance(apexA, centroid);
  const distB = distance(apexB, centroid);

  // The apex with the larger distance from the polygon centroid bulges outward
  const candAIsOutward = distA >= distB;

  if (bulge === 'outward') {
    return {
      arcResult: candAIsOutward ? candA : candB,
      isConvexOrOutward: true,
    };
  } else {
    return {
      arcResult: candAIsOutward ? candB : candA,
      isConvexOrOutward: false,
    };
  }
}
