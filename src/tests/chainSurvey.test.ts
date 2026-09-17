import { describe, it, expect } from 'vitest';
import {
  solveChainSurvey,
  diagonalsNeeded,
  tiesNeeded,
  arcRadiusFromChordAndMidOrdinate,
  ChainSurveyError,
  ChainSurveyTie,
} from '../geometry/chainSurvey';
import { polygonArea } from '../geometry/polygon';
import { distance } from '../geometry/distance';
import { circularSegmentArea } from '../geometry/arc';

describe('Chain Survey (Tape-Only Boundary Reconstruction)', () => {
  // Test 1: Correct diagonal counts for n = 3, 4, 5
  it('calculates correct diagonal counts for n = 3, 4, 5', () => {
    expect(diagonalsNeeded(3)).toBe(0);
    expect(diagonalsNeeded(4)).toBe(1);
    expect(diagonalsNeeded(5)).toBe(2);
    expect(diagonalsNeeded(6)).toBe(3);
    expect(diagonalsNeeded(12)).toBe(9);
  });

  // Test 2: 3-4-5 right triangle reconstructs to area 6 with zero diagonals
  it('reconstructs a 3-4-5 right triangle to area 6 with zero diagonals', () => {
    const sides = [4, 3, 5];
    const diagonals: number[] = [];

    const result = solveChainSurvey(sides, diagonals);

    expect(result.points).toHaveLength(3);
    expect(result.points[0]).toEqual({ x: 0, y: 0 });
    expect(result.points[1]).toEqual({ x: 4, y: 0 });

    const area = polygonArea(result.points);
    expect(area).toBeCloseTo(6, 6);

    // Verify side lengths
    expect(distance(result.points[0], result.points[1])).toBeCloseTo(4, 6);
    expect(distance(result.points[1], result.points[2])).toBeCloseTo(3, 6);
    expect(distance(result.points[2], result.points[0])).toBeCloseTo(5, 6);
  });

  // Test 3: 10x10 square reconstructs to area 100 from 4 sides + 1 diagonal
  it('reconstructs a 10x10 square to area 100 from 4 sides + 1 diagonal', () => {
    const sides = [10, 10, 10, 10];
    const diagonalP1P3 = Math.sqrt(200); // ~14.1421356

    const result = solveChainSurvey(sides, [diagonalP1P3]);

    expect(result.points).toHaveLength(4);
    const area = polygonArea(result.points);
    expect(area).toBeCloseTo(100, 6);

    // All sides should be 10
    for (let i = 0; i < 4; i++) {
      const d = distance(result.points[i], result.points[(i + 1) % 4]);
      expect(d).toBeCloseTo(10, 6);
    }

    // Diagonal P1->P3
    expect(distance(result.points[0], result.points[2])).toBeCloseTo(diagonalP1P3, 6);
  });

  // Test 4: Irregular quadrilateral reconstructs to exact known Shoelace area
  it('reconstructs an irregular quadrilateral to exact known Shoelace area and sides match', () => {
    // Known points: (0,0), (12,0), (15,8), (3,9) -> Area = 103.5
    const originalPoints = [
      { x: 0, y: 0 },
      { x: 12, y: 0 },
      { x: 15, y: 8 },
      { x: 3, y: 9 },
    ];
    const knownArea = polygonArea(originalPoints);
    expect(knownArea).toBeCloseTo(103.5, 6);

    const sides = [
      distance(originalPoints[0], originalPoints[1]), // 12
      distance(originalPoints[1], originalPoints[2]), // sqrt(3^2 + 8^2) = sqrt(73)
      distance(originalPoints[2], originalPoints[3]), // sqrt(12^2 + 1^2) = sqrt(145)
      distance(originalPoints[3], originalPoints[0]), // sqrt(3^2 + 9^2) = sqrt(90)
    ];
    const diagonals = [
      distance(originalPoints[0], originalPoints[2]), // sqrt(15^2 + 8^2) = 17
    ];

    const result = solveChainSurvey(sides, diagonals);

    expect(result.points).toHaveLength(4);
    const solvedArea = polygonArea(result.points);
    expect(solvedArea).toBeCloseTo(knownArea, 6);

    // Every reconstructed side length matches original tape reading to 6 decimal places
    for (let i = 0; i < 4; i++) {
      const solvedSide = distance(result.points[i], result.points[(i + 1) % 4]);
      expect(solvedSide).toBeCloseTo(sides[i], 6);
    }
  });

  // Test 5: Irregular pentagon reconstructs to exact known Shoelace area
  it('reconstructs an irregular pentagon to exact known Shoelace area and sides match', () => {
    // Known points: (0,0), (10,0), (14,7), (8,12), (1,8) -> Area = 117
    const originalPoints = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 14, y: 7 },
      { x: 8, y: 12 },
      { x: 1, y: 8 },
    ];
    const knownArea = polygonArea(originalPoints);
    expect(knownArea).toBeCloseTo(117, 6);

    const sides = [
      distance(originalPoints[0], originalPoints[1]),
      distance(originalPoints[1], originalPoints[2]),
      distance(originalPoints[2], originalPoints[3]),
      distance(originalPoints[3], originalPoints[4]),
      distance(originalPoints[4], originalPoints[0]),
    ];
    const diagonals = [
      distance(originalPoints[0], originalPoints[2]), // P1 -> P3
      distance(originalPoints[0], originalPoints[3]), // P1 -> P4
    ];

    const result = solveChainSurvey(sides, diagonals);

    expect(result.points).toHaveLength(5);
    const solvedArea = polygonArea(result.points);
    expect(solvedArea).toBeCloseTo(knownArea, 6);

    // Every reconstructed side length matches original tape reading to 6 decimal places
    for (let i = 0; i < 5; i++) {
      const solvedSide = distance(result.points[i], result.points[(i + 1) % 5]);
      expect(solvedSide).toBeCloseTo(sides[i], 6);
    }
  });

  // Test 6: Physically impossible triangle throws ChainSurveyError
  it('throws ChainSurveyError for physically impossible triangle violating triangle inequality', () => {
    // Sides 10, 2, 20: 10 + 2 < 20
    expect(() => solveChainSurvey([10, 2, 20], [])).toThrow(ChainSurveyError);
  });

  // Test 7: Wrong diagonal count throws ChainSurveyError
  it('throws ChainSurveyError for incorrect diagonal count', () => {
    // 4 sides requires exactly 1 diagonal
    expect(() => solveChainSurvey([10, 10, 10, 10], [])).toThrow(ChainSurveyError);
    expect(() => solveChainSurvey([10, 10, 10, 10], [14, 14])).toThrow(ChainSurveyError);
  });

  // Test 8: Non-positive side length throws ChainSurveyError
  it('throws ChainSurveyError for non-positive or invalid side lengths', () => {
    expect(() => solveChainSurvey([10, 0, 10], [])).toThrow(ChainSurveyError);
    expect(() => solveChainSurvey([10, -5, 10], [])).toThrow(ChainSurveyError);
    expect(() => solveChainSurvey([10, NaN, 10], [])).toThrow(ChainSurveyError);
  });

  // Test 9: Chord + mid-ordinate correctly recovers a known circle's radius
  it('correctly recovers a known circle radius from chord and mid-ordinate', () => {
    // Circle of radius R = 25, chord c = 30 -> mid-ordinate m = 25 - sqrt(25^2 - 15^2) = 25 - 20 = 5
    const radius = arcRadiusFromChordAndMidOrdinate(30, 5);
    expect(radius).toBeCloseTo(25, 6);
  });

  // Test 10: Semicircle case (mid-ordinate = chord/2)
  it('resolves semicircle case (mid-ordinate = chord/2) to radius = chord/2 and segment area = half circle area', () => {
    const chord = 20;
    const midOrdinate = 10; // chord / 2

    const radius = arcRadiusFromChordAndMidOrdinate(chord, midOrdinate);
    expect(radius).toBeCloseTo(10, 6);
    expect(radius).toBeCloseTo(chord / 2, 6);

    // Semicircle central angle is PI radians
    const deltaRad = Math.PI;
    const segArea = circularSegmentArea(radius, deltaRad);

    const fullCircleArea = Math.PI * radius * radius;
    const expectedHalfCircleArea = fullCircleArea / 2;

    expect(segArea).toBeCloseTo(expectedHalfCircleArea, 6);
  });

  // Test 11: Non-convex polygon reconstructed using ties between non-P1 corners
  it('reconstructs a concrete non-convex L-shaped polygon using ties between non-P1 corners and verifies exact Shoelace area', () => {
    // 6-sided L-shape:
    // P0: (0, 0)
    // P1: (10, 0)
    // P2: (10, 6)
    // P3: (4, 6)  <- concave corner
    // P4: (4, 12)
    // P5: (0, 12)
    const truth = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 6 },
      { x: 4, y: 6 },
      { x: 4, y: 12 },
      { x: 0, y: 12 },
    ];
    const trueArea = polygonArea(truth);
    expect(trueArea).toBeCloseTo(84, 6);

    const sides = [
      distance(truth[0], truth[1]), // 10
      distance(truth[1], truth[2]), // 6
      distance(truth[2], truth[3]), // 6
      distance(truth[3], truth[4]), // 6
      distance(truth[4], truth[5]), // 4
      distance(truth[5], truth[0]), // 12
    ];

    // Ties: n - 3 = 3 ties connecting non-adjacent corners:
    // P2 (index 2) ties to P0 (index 0)
    // P3 (index 3) ties to P1 (index 1) [non-P1 corner!]
    // P4 (index 4) ties to P2 (index 2) [non-P1 corner!]
    const ties: ChainSurveyTie[] = [
      { from: 0, to: 2, distance: distance(truth[0], truth[2]) },
      { from: 1, to: 3, distance: distance(truth[1], truth[3]) },
      { from: 2, to: 4, distance: distance(truth[2], truth[4]) },
    ];

    // Corner 4 (P5) is the reflex turn that branches into the L-shape indentation;
    // flipping corner 4 selects the non-convex L-shape
    const result = solveChainSurvey(sides, ties, { 4: true });
    const solvedArea = polygonArea(result.points);

    expect(solvedArea).toBeCloseTo(trueArea, 6);

    // Verify all reconstructed side lengths match original tape measurements
    for (let i = 0; i < 6; i++) {
      const d = distance(result.points[i], result.points[(i + 1) % 6]);
      expect(d).toBeCloseTo(sides[i], 6);
    }
  });

  // Test 12: Approximating parcel ① from real surveyor sketch
  it('approximates parcel ① from real surveyor sketch dimensions with non-adjacent ties, confirming finite positive plausible area without NaN', () => {
    // Surveyor sketch parcel ① dimensions include ~21.6, 6.7, 5.8, 12.7, 17.6, 31.0, 38.0
    const basePoints = [
      { x: 0, y: 0 },
      { x: 21.6, y: 0 },
      { x: 23.5, y: 6.4 },
      { x: 20.2, y: 11.2 },
      { x: 12.0, y: 21.0 },
      { x: -5.0, y: 24.5 },
      { x: -15.0, y: 12.0 },
    ];
    const n = basePoints.length; // 7 sides -> 4 ties needed
    expect(tiesNeeded(n)).toBe(4);

    const sides: number[] = [];
    for (let i = 0; i < n; i++) {
      sides.push(distance(basePoints[i], basePoints[(i + 1) % n]));
    }
    expect(sides[0]).toBeCloseTo(21.6, 1);

    // Internal ties between non-adjacent, mutually-visible corners
    const ties: ChainSurveyTie[] = [
      { from: 0, to: 2, distance: distance(basePoints[0], basePoints[2]) },
      { from: 1, to: 3, distance: distance(basePoints[1], basePoints[3]) },
      { from: 2, to: 4, distance: distance(basePoints[2], basePoints[4]) },
      { from: 3, to: 5, distance: distance(basePoints[3], basePoints[5]) },
    ];

    const result = solveChainSurvey(sides, ties);

    expect(result.points).toHaveLength(7);
    result.points.forEach((pt) => {
      expect(Number.isFinite(pt.x)).toBe(true);
      expect(Number.isFinite(pt.y)).toBe(true);
      expect(isNaN(pt.x)).toBe(false);
      expect(isNaN(pt.y)).toBe(false);
    });

    const solvedArea = polygonArea(result.points);
    expect(Number.isFinite(solvedArea)).toBe(true);
    expect(solvedArea).toBeGreaterThan(100);
  });

  // Test 13: Both candidate solutions are returned and manual flip toggles to alternate solution
  it('confirms both candidate solutions are returned at an ambiguous point and manual flip toggles to alternate solution', () => {
    const sides = [10, 10, 10, 10];
    const ties: ChainSurveyTie[] = [{ from: 0, to: 2, distance: Math.sqrt(200) }];

    const result = solveChainSurvey(sides, ties);

    expect(result.ambiguousCorners.length).toBeGreaterThan(0);

    const amb = result.ambiguousCorners.find((c) => c.pointIndex === 2);
    expect(amb).toBeDefined();
    if (!amb) return;

    expect(amb.candidates).toHaveLength(2);
    const [candA, candB] = amb.candidates;
    expect(candA).toBeDefined();
    expect(candB).toBeDefined();

    const separation = distance(candA, candB);
    expect(separation).toBeGreaterThan(1.0); // Distinct physical positions

    const chosen = amb.candidates[amb.chosenIndex];
    expect(result.points[2].x).toBeCloseTo(chosen.x, 6);
    expect(result.points[2].y).toBeCloseTo(chosen.y, 6);

    // Flip the corner
    const flippedResult = solveChainSurvey(sides, ties, { 2: true });
    const alternateIndex = amb.chosenIndex === 0 ? 1 : 0;
    const alternate = amb.candidates[alternateIndex];

    expect(flippedResult.points[2].x).toBeCloseTo(alternate.x, 6);
    expect(flippedResult.points[2].y).toBeCloseTo(alternate.y, 6);
  });
});
