import { describe, it, expect } from 'vitest';
import {
  solveChainSurvey,
  diagonalsNeeded,
  arcRadiusFromChordAndMidOrdinate,
  ChainSurveyError,
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
});
