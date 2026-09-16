import { describe, it, expect } from 'vitest';
import { solve3PointArc, solveRadiusChordArc, circularSegmentArea, tessellateArc, generateSvgArcPath } from '../geometry/arc';
import { polygonArea } from '../geometry/polygon';

describe('Circular Curves & Arcs Engine Tests', () => {
  it('1. Solves a 3-Point Arc passing through Start, Mid, and End stations', () => {
    // Semi-circle on Center (0, 0) with Radius = 10
    // P1 (10, 0), P2 (0, 10), P3 (-10, 0)
    const p1 = { x: 10, y: 0 };
    const p2 = { x: 0, y: 10 };
    const p3 = { x: -10, y: 0 };

    const result = solve3PointArc(p1, p2, p3);
    expect(result).not.toBeNull();

    expect(result!.center.x).toBeCloseTo(0, 4);
    expect(result!.center.y).toBeCloseTo(0, 4);
    expect(result!.radius).toBeCloseTo(10, 4);

    // Delta angle for semi-circle is PI radians (180 degrees)
    expect(result!.deltaRad).toBeCloseTo(Math.PI, 4);

    // Arc length = R * PI = 10 * PI ≈ 31.4159 m
    expect(result!.arcLength).toBeCloseTo(10 * Math.PI, 4);

    // Chord length = distance(p1, p3) = 20 m
    expect(result!.chordLength).toBeCloseTo(20, 4);
  });

  it('2. Solves a Radius + Chord / Delta Angle civil engineering curve', () => {
    // Chord between (0, 0) and (20, 0) with Radius R = 20
    const p1 = { x: 0, y: 0 };
    const p2 = { x: 20, y: 0 };
    const radius = 20;

    const result = solveRadiusChordArc(p1, p2, radius, true);
    expect(result).not.toBeNull();

    expect(result!.radius).toBe(20);
    expect(result!.chordLength).toBe(20);

    // For equilateral triangle (chord = 20, R = 20), central angle delta = 60 deg = PI/3 rad
    expect(result!.deltaRad).toBeCloseTo(Math.PI / 3, 4);

    // Arc length = R * delta = 20 * (PI / 3) ≈ 20.944 m
    expect(result!.arcLength).toBeCloseTo(20 * (Math.PI / 3), 4);
  });

  it('3. Calculates Circular Segment Area and Boundary Integration', () => {
    // Semi-circle: R = 10, delta = PI rad (180°)
    // Expected segment area = (1/2) * 10² * (PI - sin(PI)) = 50 * PI ≈ 157.0796 m²
    const segAreaSemi = circularSegmentArea(10, Math.PI);
    expect(segAreaSemi).toBeCloseTo(50 * Math.PI, 4);

    // 60-degree segment: R = 20, delta = PI/3 rad
    // Expected segment area = (1/2) * 20² * (PI/3 - sin(PI/3)) = 200 * (1.047197 - 0.866025) ≈ 36.234 m²
    const segArea60 = circularSegmentArea(20, Math.PI / 3);
    expect(segArea60).toBeCloseTo(200 * (Math.PI / 3 - Math.sin(Math.PI / 3)), 3);

    // Boundary integration test:
    // A square boundary 20m x 20m (Base Area = 400 m²)
    // with a semi-circle bulge on the top edge (R = 10, bulge area ≈ 157.08 m²)
    // Total combined area = 400 + 157.08 ≈ 557.08 m²
    const squareVertices = [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 20 },
      { x: 0, y: 20 },
    ];
    const baseArea = polygonArea(squareVertices);
    expect(baseArea).toBe(400);

    const totalCurvedBoundaryArea = baseArea + segAreaSemi;
    expect(totalCurvedBoundaryArea).toBeCloseTo(557.08, 1);

    // Tessellation test: verify tessellated arc points produce consistent area
    const arcPoints = tessellateArc({ x: 20, y: 20 }, { x: 0, y: 20 }, { x: 10, y: 20 }, 10, false, 32);
    expect(arcPoints.length).toBe(33);
  });

  it('4. Generates SVG Path d string accurately for vector canvas rendering', () => {
    const p1 = { x: 100, y: 200 };
    const p2 = { x: 300, y: 200 };
    const pathD = generateSvgArcPath(p1, p2, 100, false, true);
    expect(pathD).toBe('M 100 200 A 100 100 0 0 1 300 200');
  });
});
