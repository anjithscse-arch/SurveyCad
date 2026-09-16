import { Point2D, SurveyArc, ViewportTransform } from '../types/geometry';
import { distance } from './distance';
import { worldToScreen } from './transform';

export interface Arc3PointResult {
  center: Point2D;
  radius: number;
  deltaRad: number;
  arcLength: number;
  chordLength: number;
  isClockwise: boolean;
  isLargeArc: boolean;
  startAngleRad: number;
  endAngleRad: number;
  sweepFlag: number;
}

export interface ArcRadiusResult {
  center: Point2D;
  radius: number;
  deltaRad: number;
  arcLength: number;
  chordLength: number;
  isClockwise: boolean;
  isLargeArc: boolean;
  sweepFlag: number;
}

/**
 * 1. Solves a Circular Arc passing through 3 points: P1 (Start), P2 (Mid / on-curve), P3 (End).
 */
export function solve3PointArc(p1: Point2D, p2: Point2D, p3: Point2D): Arc3PointResult | null {
  const d12 = distance(p1, p2);
  const d23 = distance(p2, p3);
  const d13 = distance(p1, p3);

  if (d12 < 1e-6 || d23 < 1e-6 || d13 < 1e-6) {
    return null; // Points too close
  }

  // Check if points are collinear: 2 * (x1(y2 - y3) + x2(y3 - y1) + x3(y1 - y2))
  const D = 2 * (p1.x * (p2.y - p3.y) + p2.x * (p3.y - p1.y) + p3.x * (p1.y - p2.y));
  if (Math.abs(D) < 1e-7) {
    return null; // Collinear, cannot form a circular arc
  }

  const p1Sq = p1.x * p1.x + p1.y * p1.y;
  const p2Sq = p2.x * p2.x + p2.y * p2.y;
  const p3Sq = p3.x * p3.x + p3.y * p3.y;

  // Circumcenter C (xc, yc)
  const xc = (p1Sq * (p2.y - p3.y) + p2Sq * (p3.y - p1.y) + p3Sq * (p1.y - p2.y)) / D;
  const yc = (p1Sq * (p3.x - p2.x) + p2Sq * (p1.x - p3.x) + p3Sq * (p2.x - p1.x)) / D;
  const center: Point2D = { x: xc, y: yc };

  const radius = distance(center, p1);

  // Angles from center to P1, P2, P3
  let a1 = Math.atan2(p1.y - yc, p1.x - xc);
  let a2 = Math.atan2(p2.y - yc, p2.x - xc);
  let a3 = Math.atan2(p3.y - yc, p3.x - xc);

  if (a1 < 0) a1 += 2 * Math.PI;
  if (a2 < 0) a2 += 2 * Math.PI;
  if (a3 < 0) a3 += 2 * Math.PI;

  // Determine direction: does going CCW from a1 pass through a2 before reaching a3?
  let ccwSweep = a3 - a1;
  if (ccwSweep < 0) ccwSweep += 2 * Math.PI;

  let midSweep = a2 - a1;
  if (midSweep < 0) midSweep += 2 * Math.PI;

  const isClockwise = midSweep > ccwSweep;
  const deltaRad = isClockwise ? 2 * Math.PI - ccwSweep : ccwSweep;
  const arcLength = radius * deltaRad;
  const chordLength = d13;
  const isLargeArc = deltaRad > Math.PI;

  return {
    center,
    radius,
    deltaRad,
    arcLength,
    chordLength,
    isClockwise,
    isLargeArc,
    startAngleRad: a1,
    endAngleRad: a3,
    sweepFlag: isClockwise ? 1 : 0,
  };
}

/**
 * 2. Solves a Circular Arc from Start (P1), End (P2), Radius R, and Bulge/Side.
 * Standard civil engineering curve modeling.
 */
export function solveRadiusChordArc(
  p1: Point2D,
  p2: Point2D,
  radius: number,
  isConvexOrRight: boolean = true
): ArcRadiusResult | null {
  const chordLength = distance(p1, p2);
  if (chordLength < 1e-6 || radius < chordLength / 2) {
    return null; // Radius must be at least half of the chord length
  }

  // Central angle delta: sin(delta / 2) = (chord / 2) / radius
  const halfDelta = Math.asin(Math.min(1, chordLength / (2 * radius)));
  const deltaRad = 2 * halfDelta;
  const arcLength = radius * deltaRad;

  // Midpoint of chord
  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;

  // Distance from midpoint to center
  const h = Math.sqrt(Math.max(0, radius * radius - (chordLength / 2) * (chordLength / 2)));

  // Unit perpendicular vector from p1 -> p2
  const dx = (p2.x - p1.x) / chordLength;
  const dy = (p2.y - p1.y) / chordLength;

  // Normal vector: (-dy, dx)
  const sign = isConvexOrRight ? 1 : -1;
  const center: Point2D = {
    x: midX - sign * h * dy,
    y: midY + sign * h * dx,
  };

  return {
    center,
    radius,
    deltaRad,
    arcLength,
    chordLength,
    isClockwise: isConvexOrRight,
    isLargeArc: deltaRad > Math.PI,
    sweepFlag: isConvexOrRight ? 1 : 0,
  };
}

/**
 * 3. Circular Segment Area:
 * Area enclosed between the curved circular arc and the straight chord line.
 * Formula: A_seg = (1/2) * R² * (delta - sin(delta))
 */
export function circularSegmentArea(radius: number, deltaRad: number): number {
  if (radius <= 0 || deltaRad <= 0) return 0;
  return 0.5 * radius * radius * (deltaRad - Math.sin(deltaRad));
}

/**
 * Generates an SVG Path 'd' attribute string for an arc.
 * Supports both:
 * 1. generateSvgArcPath(arc, p1, p2, viewport)
 * 2. generateSvgArcPath(startScreen, endScreen, radiusScreen, isLargeArc, isSweep)
 */
export function generateSvgArcPath(
  startScreenOrArc: Point2D | SurveyArc,
  endScreenOrP1: Point2D,
  radiusScreenOrP2: number | Point2D,
  isLargeArcOrViewport?: boolean | ViewportTransform,
  isSweep?: boolean
): string {
  if ('radius' in (startScreenOrArc as any) && isLargeArcOrViewport && typeof isLargeArcOrViewport === 'object' && 'zoom' in isLargeArcOrViewport) {
    const arc = startScreenOrArc as SurveyArc;
    const p1 = endScreenOrP1 as Point2D;
    const p2 = radiusScreenOrP2 as Point2D;
    const vp = isLargeArcOrViewport as ViewportTransform;

    const s1 = worldToScreen(p1, vp);
    const s2 = worldToScreen(p2, vp);
    const rScreen = arc.radius * vp.zoom;
    const largeArc = arc.deltaRad > Math.PI ? 1 : 0;
    const sweep = arc.sweepFlag !== undefined ? arc.sweepFlag : (arc.isClockwise ? 1 : 0);

    return `M ${s1.x} ${s1.y} A ${rScreen} ${rScreen} 0 ${largeArc} ${sweep} ${s2.x} ${s2.y}`;
  }

  const startScreen = startScreenOrArc as Point2D;
  const endScreen = endScreenOrP1 as Point2D;
  const radiusScreen = radiusScreenOrP2 as number;
  const largeArcFlag = isLargeArcOrViewport ? 1 : 0;
  const sweepFlag = isSweep ? 1 : 0;
  return `M ${startScreen.x} ${startScreen.y} A ${radiusScreen} ${radiusScreen} 0 ${largeArcFlag} ${sweepFlag} ${endScreen.x} ${endScreen.y}`;
}

/**
 * Tessellates an arc into an array of points along the circular perimeter.
 * Useful for integrating curved boundary edges into polygon Shoelace area calculations.
 */
export function tessellateArc(
  start: Point2D,
  end: Point2D,
  center: Point2D,
  radius: number,
  isClockwise: boolean,
  steps: number = 16
): Point2D[] {
  let a1 = Math.atan2(start.y - center.y, start.x - center.x);
  let a2 = Math.atan2(end.y - center.y, end.x - center.x);

  if (a1 < 0) a1 += 2 * Math.PI;
  if (a2 < 0) a2 += 2 * Math.PI;

  let sweep = a2 - a1;
  if (!isClockwise && sweep < 0) sweep += 2 * Math.PI;
  if (isClockwise && sweep > 0) sweep -= 2 * Math.PI;

  const points: Point2D[] = [];
  for (let i = 0; i <= steps; i++) {
    const frac = i / steps;
    const angle = a1 + frac * sweep;
    points.push({
      x: center.x + radius * Math.cos(angle),
      y: center.y + radius * Math.sin(angle),
    });
  }

  return points;
}
