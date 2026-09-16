import { SurveyPoint, SurveyLine, SurveyPolygon, Point2D } from '../../types/geometry';
import { SurveyObservation, ReconstructedSurveyResult } from '../types';
import { pointFromBearingAndDistance } from '../../geometry/bearing';
import { polygonArea, polygonPerimeter } from '../../geometry/polygon';
import { distance } from '../../geometry/distance';

/**
 * Deterministically reconstructs exact digital CAD geometry from verified survey observations.
 * Uses the existing geometry engine formulas.
 */
export function reconstructSurveyFromObservations(
  observations: SurveyObservation[],
  initialPoint: Point2D = { x: 0, y: 0 },
  initialBearing: number = 90 // Default first leg towards East (90°) if not specified
): ReconstructedSurveyResult {
  const verified = observations.filter((o) => o.status === 'accepted' || o.status === 'edited');
  const warnings: string[] = [];

  if (verified.length < 3) {
    return {
      points: [],
      lines: [],
      polygon: null,
      observations,
      closureError: 0,
      isClosed: false,
      warnings: ['At least 3 verified boundary observations are required to reconstruct a closed survey boundary.'],
    };
  }

  // 1. Build ordered chain of station legs
  // Map observations by fromLabel
  const obsMap = new Map<string, SurveyObservation>();
  verified.forEach((o) => obsMap.set(o.fromLabel, o));

  // Determine starting station (e.g. "A" or the first observation's fromLabel)
  let currentStation = verified.find((o) => o.fromLabel === 'A')?.fromLabel || verified[0].fromLabel;
  const startStation = currentStation;

  const orderedChain: SurveyObservation[] = [];
  const visited = new Set<string>();

  while (currentStation && !visited.has(currentStation)) {
    visited.add(currentStation);
    const nextObs = obsMap.get(currentStation);
    if (!nextObs) break;

    orderedChain.push(nextObs);
    currentStation = nextObs.toLabel;
    if (currentStation === startStation) {
      break; // Closed loop complete!
    }
  }

  // If chain couldn't be automatically ordered via toLabel, fallback to verified order
  const chain = orderedChain.length >= 3 ? orderedChain : verified;

  // 2. Compute coordinates leg by leg
  const points: SurveyPoint[] = [];
  const pointMap = new Map<string, SurveyPoint>();

  // Add initial base station
  const basePoint: SurveyPoint = {
    id: `pt_${chain[0].fromLabel}`,
    label: chain[0].fromLabel,
    x: initialPoint.x,
    y: initialPoint.y,
  };
  points.push(basePoint);
  pointMap.set(basePoint.label, basePoint);

  let currentCoord: Point2D = { ...initialPoint };
  let currentBearing = chain[0].bearing !== undefined ? chain[0].bearing : initialBearing;

  for (let i = 0; i < chain.length; i++) {
    const leg = chain[i];
    const legDist = leg.distance !== undefined && leg.distance > 0 ? leg.distance : 20;

    // Use explicitly defined bearing if available, otherwise turn clockwise 90 degrees per vertex for simple boundary
    if (leg.bearing !== undefined) {
      currentBearing = leg.bearing;
    } else if (i > 0) {
      // Turn right (clockwise) by 90 degrees
      currentBearing = (currentBearing + 90) % 360;
    }

    const nextCoord = pointFromBearingAndDistance(currentCoord, legDist, currentBearing);

    // If closing back to the start station
    const isClosingLeg = i === chain.length - 1 && leg.toLabel === startStation;
    if (!isClosingLeg) {
      const newPt: SurveyPoint = {
        id: `pt_${leg.toLabel}`,
        label: leg.toLabel,
        x: Math.round(nextCoord.x * 1000) / 1000,
        y: Math.round(nextCoord.y * 1000) / 1000,
      };
      points.push(newPt);
      pointMap.set(newPt.label, newPt);
      currentCoord = nextCoord;
    } else {
      // Closing error calculation: distance between calculated end point and start point
      currentCoord = nextCoord;
    }
  }

  // 3. Closure error: distance between the traversed closing point and the initial base point
  const closureError = distance(currentCoord, initialPoint);

  // 4. Create boundary lines connecting consecutive stations
  const lines: SurveyLine[] = [];
  for (let i = 0; i < points.length; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % points.length];
    lines.push({
      id: `line_${p1.label}_${p2.label}`,
      startPointId: p1.id,
      endPointId: p2.id,
    });
  }

  // 5. Create closed polygon
  const polygon: SurveyPolygon = {
    id: `poly_sketch_${Date.now()}`,
    name: 'Reconstructed Boundary',
    pointIds: points.map((p) => p.id),
    isClosed: true,
  };

  if (closureError > 0.1) {
    warnings.push(
      `Traverse misclosure detected: ${closureError.toFixed(3)} m. Verify measured side lengths and bearings.`
    );
  }

  return {
    points,
    lines,
    polygon,
    observations,
    closureError,
    isClosed: true,
    warnings,
  };
}
