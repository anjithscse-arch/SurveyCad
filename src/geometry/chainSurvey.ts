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
 * A tie-line measurement connecting any two non-adjacent corners.
 * Corner indices are 0-based: 0 corresponds to P1, 1 to P2, etc.
 */
export interface ChainSurveyTie {
  from: number;
  to: number;
  distance: number;
}

/**
 * Represents a corner whose position was solved via Law of Cosines
 * having two distinct geometric candidate solutions.
 */
export interface AmbiguousCorner {
  pointIndex: number;
  candidates: [Point2D, Point2D];
  chosenIndex: 0 | 1;
}

/**
 * Returns the number of ties needed for an n-sided polygon.
 * An n-sided polygon requires exactly n - 3 ties.
 */
export function tiesNeeded(n: number): number {
  return Math.max(0, n - 3);
}

// Backward-compatible alias for existing imports
export const diagonalsNeeded = tiesNeeded;

export interface ChainSurveyResult {
  points: Point2D[];
  ambiguousCorners: AmbiguousCorner[];
}

/**
 * Solves a closed polygon boundary using consecutive boundary side lengths
 * and arbitrary point-to-point ties (or legacy fan diagonals).
 *
 * @param sides Array of n boundary side lengths (P1->P2, P2->P3, ..., Pn->P1).
 * @param ties Array of (n - 3) tie measurements connecting non-adjacent corners,
 *             or legacy number[] diagonals from P1.
 * @param flips Optional record, array, or set of 0-based point indices where
 *              the user has toggled to the alternate candidate solution.
 *
 * @returns ChainSurveyResult with reconstructed points and ambiguous corner candidates.
 */
export function solveChainSurvey(
  sides: number[],
  ties: ChainSurveyTie[] | number[],
  flips?: Record<number, boolean> | number[] | Set<number>
): ChainSurveyResult {
  const n = sides.length;

  if (n < 3) {
    throw new ChainSurveyError(`A polygon boundary must have at least 3 sides (received ${n})`);
  }

  const expectedTies = tiesNeeded(n);
  if (!Array.isArray(ties)) {
    throw new ChainSurveyError('Ties must be provided as an array');
  }
  if (ties.length !== expectedTies) {
    throw new ChainSurveyError(
      `Expected ${expectedTies} tie${expectedTies === 1 ? '' : 's'} for a ${n}-sided polygon, but received ${ties.length}`
    );
  }

  for (let i = 0; i < sides.length; i++) {
    const s = sides[i];
    if (typeof s !== 'number' || isNaN(s) || s <= 0 || !isFinite(s)) {
      throw new ChainSurveyError(`Side ${i + 1} must be a positive number (received ${s})`);
    }
  }

  // Normalize legacy number[] array where ties[k-2] is a diagonal from P1 (index 0) to P(k+1) (index k)
  const normalizedTies: ChainSurveyTie[] = ties.map((t, idx) => {
    if (typeof t === 'number') {
      if (isNaN(t) || t <= 0 || !isFinite(t)) {
        throw new ChainSurveyError(`Diagonal P1->P${idx + 3} must be a positive number (received ${t})`);
      }
      return { from: 0, to: idx + 2, distance: t };
    }
    return t;
  });

  for (let i = 0; i < normalizedTies.length; i++) {
    const t = normalizedTies[i];
    if (typeof t.distance !== 'number' || isNaN(t.distance) || t.distance <= 0 || !isFinite(t.distance)) {
      throw new ChainSurveyError(`Tie ${i + 1} distance must be a positive number (received ${t.distance})`);
    }
    if (t.from === t.to) {
      throw new ChainSurveyError(`Tie ${i + 1} cannot connect corner P${t.from + 1} to itself`);
    }
    if (t.from < 0 || t.from >= n || t.to < 0 || t.to >= n) {
      throw new ChainSurveyError(`Tie ${i + 1} references invalid corner indices (0 to ${n - 1})`);
    }
  }

  const isFlipped = (pointIdx: number): boolean => {
    if (!flips) return false;
    if (Array.isArray(flips)) return flips.includes(pointIdx);
    if (flips instanceof Set) return flips.has(pointIdx);
    return Boolean(flips[pointIdx]);
  };

  // Helper to determine the dominant turn direction of previously placed corners
  const getMajorityTurnSign = (currentPoints: Point2D[]): number => {
    let sumSign = 0;
    for (let j = 1; j < currentPoints.length - 1; j++) {
      const vInX = currentPoints[j].x - currentPoints[j - 1].x;
      const vInY = currentPoints[j].y - currentPoints[j - 1].y;
      const vOutX = currentPoints[j + 1].x - currentPoints[j].x;
      const vOutY = currentPoints[j + 1].y - currentPoints[j].y;
      const cp = vInX * vOutY - vInY * vOutX;
      if (Math.abs(cp) > 1e-9) {
        sumSign += Math.sign(cp);
      }
    }
    // Default bias is +1 (counter-clockwise / left turn)
    return sumSign >= 0 ? 1 : -1;
  };

  // P1 is placed at the origin (0, 0)
  const points: Point2D[] = [{ x: 0, y: 0 }];

  // P2 is placed along the positive X-axis (baseline)
  points.push({ x: sides[0], y: 0 });

  const ambiguousCorners: AmbiguousCorner[] = [];

  // Place intermediate points P3 to P(n-1) (index 2 to n-2)
  for (let i = 2; i <= n - 2; i++) {
    // Find tie connecting corner i to an already-placed corner k < i (excluding adjacent corner i - 1)
    const matchingTies = normalizedTies.filter((t) => {
      const isFrom = t.from === i;
      const isTo = t.to === i;
      if (!isFrom && !isTo) return false;
      const other = isFrom ? t.to : t.from;
      return other < i && other !== i - 1;
    });

    if (matchingTies.length === 0) {
      throw new ChainSurveyError(
        `Corner P${i + 1} requires a tie connecting it to an already-placed non-adjacent corner (P1 to P${i - 1})`
      );
    }
    if (matchingTies.length > 1) {
      throw new ChainSurveyError(
        `Corner P${i + 1} has multiple ties. Exactly one tie to an already-placed corner is required.`
      );
    }

    const tie = matchingTies[0];
    const k = tie.from === i ? tie.to : tie.from;
    const P_prev = points[i - 1];
    const P_k = points[k];

    const b = distance(P_prev, P_k);
    const c = sides[i - 1];       // boundary side P(i-1) -> P(i)
    const a = tie.distance;       // tie P(k) -> P(i)

    if (b < 1e-9) {
      throw new ChainSurveyError(`Corners P${k + 1} and P${i} are coincident`);
    }

    let cosAlpha = (b * b + c * c - a * a) / (2 * b * c);
    if (cosAlpha > 1 && cosAlpha < 1 + 1e-9) cosAlpha = 1;
    if (cosAlpha < -1 && cosAlpha > -1 - 1e-9) cosAlpha = -1;

    if (cosAlpha < -1 || cosAlpha > 1 || isNaN(cosAlpha)) {
      throw new ChainSurveyError(
        `Inconsistent tape measurements for triangle (P${k + 1}, P${i}, P${i + 1}): sides ${b.toFixed(3)}, ${c.toFixed(3)}, ${a.toFixed(3)} cannot form a real triangle`
      );
    }

    const alpha = Math.acos(cosAlpha);
    const thetaBase = Math.atan2(P_k.y - P_prev.y, P_k.x - P_prev.x);

    const cand1: Point2D = {
      x: P_prev.x + c * Math.cos(thetaBase + alpha),
      y: P_prev.y + c * Math.sin(thetaBase + alpha),
    };
    const cand2: Point2D = {
      x: P_prev.x + c * Math.cos(thetaBase - alpha),
      y: P_prev.y + c * Math.sin(thetaBase - alpha),
    };

    const vInX = P_prev.x - points[i - 2].x;
    const vInY = P_prev.y - points[i - 2].y;

    const cross1 = vInX * (cand1.y - P_prev.y) - vInY * (cand1.x - P_prev.x);
    const cross2 = vInX * (cand2.y - P_prev.y) - vInY * (cand2.x - P_prev.x);

    const majoritySign = getMajorityTurnSign(points);

    let defaultIndex: 0 | 1 = 0;
    const sign1 = Math.sign(cross1);
    const sign2 = Math.sign(cross2);

    if (sign1 === majoritySign && sign2 !== majoritySign) {
      defaultIndex = 0;
    } else if (sign2 === majoritySign && sign1 !== majoritySign) {
      defaultIndex = 1;
    } else {
      defaultIndex = cross1 * majoritySign >= cross2 * majoritySign ? 0 : 1;
    }

    const flipped = isFlipped(i);
    const chosenIndex: 0 | 1 = flipped ? (defaultIndex === 0 ? 1 : 0) : defaultIndex;
    const chosenPoint = chosenIndex === 0 ? cand1 : cand2;

    points.push(chosenPoint);

    if (distance(cand1, cand2) > 1e-6) {
      ambiguousCorners.push({
        pointIndex: i,
        candidates: [cand1, cand2],
        chosenIndex,
      });
    }
  }

  // Place final point Pn (vertex index n - 1)
  // Triangle (P(n-2), P0, Pn) using boundary side P(n-2)->Pn and closing side Pn->P0
  const P_prev = points[n - 2];
  const P_0 = points[0];
  const b = distance(P_prev, P_0);
  const c = sides[n - 2];        // distance P(n-2) to Pn
  const a = sides[n - 1];        // distance P0 to Pn (closing side)

  if (b < 1e-9) {
    throw new ChainSurveyError(`Corners P1 and P${n - 1} are coincident`);
  }

  let cosAlpha = (b * b + c * c - a * a) / (2 * b * c);
  if (cosAlpha > 1 && cosAlpha < 1 + 1e-9) cosAlpha = 1;
  if (cosAlpha < -1 && cosAlpha > -1 - 1e-9) cosAlpha = -1;

  if (cosAlpha < -1 || cosAlpha > 1 || isNaN(cosAlpha)) {
    throw new ChainSurveyError(
      `Inconsistent tape measurements for closing triangle (P1, P${n - 1}, P${n}): sides ${b.toFixed(3)}, ${c.toFixed(3)}, ${a.toFixed(3)} cannot form a real triangle`
    );
  }

  const alpha = Math.acos(cosAlpha);
  const thetaBase = Math.atan2(P_0.y - P_prev.y, P_0.x - P_prev.x);

  const cand1: Point2D = {
    x: P_prev.x + c * Math.cos(thetaBase + alpha),
    y: P_prev.y + c * Math.sin(thetaBase + alpha),
  };
  const cand2: Point2D = {
    x: P_prev.x + c * Math.cos(thetaBase - alpha),
    y: P_prev.y + c * Math.sin(thetaBase - alpha),
  };

  const vInX = P_prev.x - points[n - 3].x;
  const vInY = P_prev.y - points[n - 3].y;

  // Turn at P(n-2)
  const cross1 = vInX * (cand1.y - P_prev.y) - vInY * (cand1.x - P_prev.x);
  const cross2 = vInX * (cand2.y - P_prev.y) - vInY * (cand2.x - P_prev.x);

  // Turn at Pn closing into P0
  const closeTurn1 = (cand1.x - P_prev.x) * (P_0.y - cand1.y) - (cand1.y - P_prev.y) * (P_0.x - cand1.x);
  const closeTurn2 = (cand2.x - P_prev.x) * (P_0.y - cand2.y) - (cand2.y - P_prev.y) * (P_0.x - cand2.x);

  const majoritySign = getMajorityTurnSign(points);

  let defaultIndex: 0 | 1 = 0;
  const match1 = (Math.sign(cross1) === majoritySign ? 1 : 0) + (Math.sign(closeTurn1) === majoritySign ? 1 : 0);
  const match2 = (Math.sign(cross2) === majoritySign ? 1 : 0) + (Math.sign(closeTurn2) === majoritySign ? 1 : 0);

  if (match1 > match2) {
    defaultIndex = 0;
  } else if (match2 > match1) {
    defaultIndex = 1;
  } else {
    // If tie-break, compare total turn score in majority direction
    const score1 = cross1 * majoritySign + closeTurn1 * majoritySign;
    const score2 = cross2 * majoritySign + closeTurn2 * majoritySign;
    defaultIndex = score1 >= score2 ? 0 : 1;
  }

  const flipped = isFlipped(n - 1);
  const chosenIndex: 0 | 1 = flipped ? (defaultIndex === 0 ? 1 : 0) : defaultIndex;
  const chosenPoint = chosenIndex === 0 ? cand1 : cand2;

  points.push(chosenPoint);

  if (distance(cand1, cand2) > 1e-6) {
    ambiguousCorners.push({
      pointIndex: n - 1,
      candidates: [cand1, cand2],
      chosenIndex,
    });
  }

  return { points, ambiguousCorners };
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
