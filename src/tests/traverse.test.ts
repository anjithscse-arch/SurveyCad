import { describe, it, expect } from 'vitest';
import { SurveyPoint } from '../types/geometry';
import { TraverseLeg } from '../types/survey';
import {
  calculateTraverseLegs,
  calculateClosure,
  adjustTraverseBowditch,
  adjustTraverseTransit,
} from '../survey/traverse';

describe('Traverse and Closure Analysis', () => {
  const points: SurveyPoint[] = [
    { id: 'p1', label: '1', x: 0, y: 0 },
    { id: 'p2', label: '2', x: 100, y: 0 },
    { id: 'p3', label: '3', x: 100, y: 100 },
    { id: 'p4', label: '4', x: 0, y: 100 },
  ];

  // Measured field legs where the final leg has a 0.5m misclosure in Northing
  const measuredLegs: TraverseLeg[] = [
    { fromId: 'p1', toId: 'p2', distance: 100, bearingDeg: 90, deltaE: 100, deltaN: 0 },
    { fromId: 'p2', toId: 'p3', distance: 100, bearingDeg: 0, deltaE: 0, deltaN: 100 },
    { fromId: 'p3', toId: 'p4', distance: 100, bearingDeg: 270, deltaE: -100, deltaN: 0 },
    { fromId: 'p4', toId: 'p1', distance: 99.5, bearingDeg: 180, deltaE: 0, deltaN: -99.5 },
  ];

  it('calculates traverse legs correctly from points', () => {
    const legs = calculateTraverseLegs(points, true);
    expect(legs.length).toBe(4);
    expect(legs[0].distance).toBeCloseTo(100, 2);
    expect(legs[0].bearingDeg).toBeCloseTo(90, 2); // Due East
    expect(legs[1].distance).toBeCloseTo(100, 2);
    expect(legs[1].bearingDeg).toBeCloseTo(0, 2); // Due North
  });

  it('computes linear misclosure and relative precision on measured legs', () => {
    const closure = calculateClosure(measuredLegs);

    expect(closure.sumDeltaE).toBeCloseTo(0, 4);
    expect(closure.sumDeltaN).toBeCloseTo(0.5, 4);
    expect(closure.closureError).toBeCloseTo(0.5, 4);
    expect(closure.totalLength).toBeCloseTo(399.5, 1);
    expect(closure.relativePrecision).toBeGreaterThan(700);
  });

  it('adjusts coordinates using Bowditch Compass Rule to perfect closure', () => {
    const result = adjustTraverseBowditch(points, measuredLegs);
    expect(result.method).toBe('bowditch');
    expect(result.stations.length).toBe(4);
    expect(result.originalClosureError).toBeCloseTo(0.5, 4);

    // Initial station remains fixed
    expect(result.stations[0].adjustedX).toBe(0);
    expect(result.stations[0].adjustedY).toBe(0);

    // Stations along the traverse receive proportional adjustments
    expect(result.stations[1].deltaY).toBeLessThan(0);
    expect(result.stations[2].deltaY).toBeLessThan(result.stations[1].deltaY);

    // Residual error after balancing is eliminated
    expect(result.residualError).toBeLessThan(1e-6);
  });

  it('adjusts coordinates using Transit Rule', () => {
    const result = adjustTraverseTransit(points, measuredLegs);
    expect(result.method).toBe('transit');
    expect(result.stations.length).toBe(4);
    expect(result.residualError).toBeLessThan(1e-6);
  });
});
