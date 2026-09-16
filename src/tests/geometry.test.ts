import { describe, it, expect } from 'vitest';
import { distance } from '../geometry/distance';
import { calculateBearing, pointFromBearingAndDistance, parseAngle, formatDMS } from '../geometry/bearing';
import { polygonArea, polygonPerimeter, polygonCentroid } from '../geometry/polygon';
import { polygonSelfIntersects } from '../geometry/intersection';
import { convertArea, convertDistance } from '../survey/units';
import { computeAreaResults } from '../survey/validation';

describe('Geometry Engine - SDD Verification Tests', () => {
  it('verifies SDD Rectangle Test Case (SDD Section 86)', () => {
    const rect = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 20 },
      { x: 0, y: 20 },
    ];

    const area = polygonArea(rect);
    const perimeter = polygonPerimeter(rect);

    expect(area).toBe(200);
    expect(perimeter).toBe(60);
  });

  it('verifies SDD Triangle Test Case (SDD Section 86)', () => {
    const triangle = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 0, y: 10 },
    ];

    const area = polygonArea(triangle);
    expect(area).toBe(50);
  });

  it('verifies SDD End-to-End Acceptance Test (SDD Section 135)', () => {
    const points = [
      { x: 0, y: 0 },
      { x: 20, y: 0 },
      { x: 20, y: 30 },
      { x: 0, y: 30 },
    ];

    expect(distance(points[0], points[1])).toBe(20);
    expect(distance(points[1], points[2])).toBe(30);
    expect(distance(points[2], points[3])).toBe(20);
    expect(distance(points[3], points[0])).toBe(30);

    const results = computeAreaResults(points, true);

    expect(results.sqMeters).toBe(600);
    expect(results.perimeterMeters).toBe(100);

    // Conversions
    // 600 m² ≈ 6458.35 ft²
    expect(results.sqFeet).toBeCloseTo(6458.35, 1);
    // 600 m² ≈ 0.1483 acre
    expect(results.acres).toBeCloseTo(0.14826, 3);
    // 600 m² ≈ 14.83 cents (1 cent = 1/100 acre)
    expect(results.cents).toBeCloseTo(14.826, 2);
  });

  it('verifies Bearings and Azimuth clockwise from North', () => {
    const origin = { x: 0, y: 0 };
    const north = { x: 0, y: 20 };
    const east = { x: 20, y: 0 };
    const south = { x: 0, y: -20 };
    const west = { x: -20, y: 0 };

    expect(calculateBearing(origin, north)).toBe(0);
    expect(calculateBearing(origin, east)).toBe(90);
    expect(calculateBearing(origin, south)).toBe(180);
    expect(calculateBearing(origin, west)).toBe(270);

    // Destination point
    const dest = pointFromBearingAndDistance(origin, 25.4, 90);
    expect(dest.x).toBeCloseTo(25.4, 5);
    expect(dest.y).toBeCloseTo(0, 5);
  });

  it('verifies Angle Parsing and DMS Formatting', () => {
    expect(parseAngle('45.25')).toBeCloseTo(45.25, 4);
    expect(parseAngle("45° 15' 00\"")).toBeCloseTo(45.25, 4);
    expect(parseAngle('N 45° 15\' E')).toBeCloseTo(45.25, 4);
    expect(formatDMS(45.25, false)).toBe("045°15'");
  });

  it('detects Self-Intersecting Polygons (SDD Section 31)', () => {
    // Bow-tie shape
    const selfIntersecting = [
      { x: 0, y: 0 },
      { x: 10, y: 10 },
      { x: 10, y: 0 },
      { x: 0, y: 10 },
    ];

    expect(polygonSelfIntersects(selfIntersecting)).toBe(true);

    const normal = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 0, y: 10 },
    ];
    expect(polygonSelfIntersects(normal)).toBe(false);
  });
});
