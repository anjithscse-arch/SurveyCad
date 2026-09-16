import { describe, it, expect } from 'vitest';
import { reconstructSurveyFromObservations } from '../../sketch/reconstruction/reconstructSurvey';
import { SurveyObservation } from '../../sketch/types';
import { computeAreaResults } from '../../survey/validation';

describe('Sketch Reconstruction & Golden Test Case (§38)', () => {
  it('reconstructs exact geometry for Golden Test Case from verified observations', () => {
    const observations: SurveyObservation[] = [
      {
        id: 'o1',
        fromLabel: 'A',
        toLabel: 'B',
        distance: 20.0,
        bearing: 90.0, // East
        source: 'ocr',
        confidence: 0.95,
        verified: true,
        status: 'accepted',
      },
      {
        id: 'o2',
        fromLabel: 'B',
        toLabel: 'C',
        distance: 30.0,
        bearing: 0.0, // North
        source: 'ocr',
        confidence: 0.95,
        verified: true,
        status: 'accepted',
      },
      {
        id: 'o3',
        fromLabel: 'C',
        toLabel: 'D',
        distance: 20.0,
        bearing: 270.0, // West
        source: 'ocr',
        confidence: 0.95,
        verified: true,
        status: 'accepted',
      },
      {
        id: 'o4',
        fromLabel: 'D',
        toLabel: 'A',
        distance: 30.0,
        bearing: 180.0, // South
        source: 'ocr',
        confidence: 0.95,
        verified: true,
        status: 'accepted',
      },
    ];

    const result = reconstructSurveyFromObservations(observations, { x: 0, y: 0 });

    expect(result.points.length).toBe(4);
    expect(result.lines.length).toBe(4);
    expect(result.polygon).not.toBeNull();
    expect(result.closureError).toBeCloseTo(0, 4);

    // Coordinates:
    // A = (0, 0)
    // B = (20, 0)
    // C = (20, 30)
    // D = (0, 30)
    const ptA = result.points.find((p) => p.label === 'A')!;
    const ptB = result.points.find((p) => p.label === 'B')!;
    const ptC = result.points.find((p) => p.label === 'C')!;
    const ptD = result.points.find((p) => p.label === 'D')!;

    expect(ptA.x).toBeCloseTo(0, 2);
    expect(ptA.y).toBeCloseTo(0, 2);

    expect(ptB.x).toBeCloseTo(20, 2);
    expect(ptB.y).toBeCloseTo(0, 2);

    expect(ptC.x).toBeCloseTo(20, 2);
    expect(ptC.y).toBeCloseTo(30, 2);

    expect(ptD.x).toBeCloseTo(0, 2);
    expect(ptD.y).toBeCloseTo(30, 2);

    // Verify Area and Indian Cents calculations
    const areaResults = computeAreaResults(result.points, true);
    expect(areaResults.sqMeters).toBe(600);
    expect(areaResults.perimeterMeters).toBe(100);
    expect(areaResults.sqFeet).toBeCloseTo(6458.35, 1);
    expect(areaResults.acres).toBeCloseTo(0.1483, 3);
    expect(areaResults.cents).toBeCloseTo(14.83, 2);
  });
});
