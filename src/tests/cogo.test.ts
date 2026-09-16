import { describe, it, expect } from 'vitest';
import {
  bearingBearingIntersection,
  distanceDistanceIntersection,
  bearingDistanceIntersection,
} from '../geometry/intersection';
import { formatAcreCent, convertArea, convertDistance } from '../survey/units';

describe('Coordinate Geometry (COGO) Operations', () => {
  it('computes Bearing-Bearing Intersection correctly', () => {
    // Station 1 at (0, 0) pointing East (90°)
    // Station 2 at (100, -100) pointing North (0°)
    // Expected intersection at (100, 0)
    const p1 = { x: 0, y: 0 };
    const p2 = { x: 100, y: -100 };
    const pt = bearingBearingIntersection(p1, 90, p2, 0);

    expect(pt).not.toBeNull();
    expect(pt!.x).toBeCloseTo(100, 4);
    expect(pt!.y).toBeCloseTo(0, 4);
  });

  it('computes Distance-Distance Trilateration intersection', () => {
    // Two circles of radius 5 centered at (0,0) and (6,0)
    // Intersect at x = 3, y = +/- 4 (3-4-5 triangles)
    const p1 = { x: 0, y: 0 };
    const p2 = { x: 6, y: 0 };
    const pts = distanceDistanceIntersection(p1, 5, p2, 5);

    expect(pts.length).toBe(2);
    expect(pts[0].x).toBeCloseTo(3, 4);
    expect(Math.abs(pts[0].y)).toBeCloseTo(4, 4);
    expect(pts[1].x).toBeCloseTo(3, 4);
    expect(Math.abs(pts[1].y)).toBeCloseTo(4, 4);
  });

  it('computes Bearing-Distance intersection', () => {
    // Ray from (0,0) bearing 90° (East, along +X axis)
    // Circle centered at (10, 0) with radius 2
    // Intersections should be at (8, 0) and (12, 0)
    const p1 = { x: 0, y: 0 };
    const p2 = { x: 10, y: 0 };
    const pts = bearingDistanceIntersection(p1, 90, p2, 2);

    expect(pts.length).toBe(2);
    const xVals = pts.map((p) => p.x).sort((a, b) => a - b);
    expect(xVals[0]).toBeCloseTo(8, 4);
    expect(xVals[1]).toBeCloseTo(12, 4);
  });

  it('converts and formats Indian Cadastral units correctly', () => {
    // 1 Cent = 40.468564224 m²
    // 100 Cents = 1 Acre
    const oneAcreInSqm = 4046.8564224;
    const formatted = formatAcreCent(oneAcreInSqm + 40.468564224 * 25);
    expect(formatted).toBe('1 Ac 25.00 Cts');

    const gunthas = convertArea(oneAcreInSqm, 'sqm', 'guntha');
    expect(gunthas).toBeCloseTo(40, 2); // 40 gunthas in 1 acre

    const usFeet = convertDistance(100, 'm', 'usft');
    expect(usFeet).toBeCloseTo(328.0833, 2);
  });
});
