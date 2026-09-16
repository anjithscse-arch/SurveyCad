import { Point2D } from '../types/geometry';
import { degToRad, radToDeg, normalizeAngleDeg } from './math';

/**
 * Calculate Azimuth / Whole Circle Bearing from p1 to p2 in degrees [0, 360).
 * Bearing is measured clockwise from North (+Y axis):
 * North (0°), East (90°), South (180°), West (270°).
 */
export function calculateBearing(p1: Point2D, p2: Point2D): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;

  // In surveying: East is +X, North is +Y
  // Angle clockwise from North: Math.atan2(dx, dy)
  const rad = Math.atan2(dx, dy);
  const deg = radToDeg(rad);
  return normalizeAngleDeg(deg);
}

/**
 * Calculate destination point given start point, distance (meters), and bearing (degrees clockwise from North).
 */
export function pointFromBearingAndDistance(
  start: Point2D,
  distance: number,
  bearingDeg: number
): Point2D {
  const rad = degToRad(bearingDeg);
  const dx = distance * Math.sin(rad);
  const dy = distance * Math.cos(rad);

  return {
    x: start.x + dx,
    y: start.y + dy,
  };
}

/**
 * Convert decimal degrees to DMS (Degrees, Minutes, Seconds) object
 */
export function degToDMS(deg: number): { degrees: number; minutes: number; seconds: number } {
  const norm = normalizeAngleDeg(deg);
  const degrees = Math.floor(norm);
  const minFloat = (norm - degrees) * 60;
  const minutes = Math.floor(minFloat);
  const seconds = Math.round((minFloat - minutes) * 60 * 100) / 100;

  // Handle rounding edge case (e.g. 59.999s -> 60s)
  if (seconds >= 60) {
    return degToDMS(degrees + (minutes + 1) / 60);
  }

  return { degrees, minutes, seconds };
}

/**
 * Format bearing as DMS string (e.g. 045°15'30")
 */
export function formatDMS(deg: number, includeSeconds: boolean = true): string {
  const { degrees, minutes, seconds } = degToDMS(deg);
  const dStr = String(degrees).padStart(3, '0');
  const mStr = String(minutes).padStart(2, '0');
  if (!includeSeconds) {
    return `${dStr}°${mStr}'`;
  }
  const sStr = seconds.toFixed(1).padStart(4, '0');
  return `${dStr}°${mStr}'${sStr}"`;
}

/**
 * Format bearing as Quadrant Bearing (e.g. N 45°15'00" E)
 */
export function formatQuadrantBearing(deg: number): string {
  const norm = normalizeAngleDeg(deg);
  let ns = 'N';
  let ew = 'E';
  let qAngle = norm;

  if (norm >= 0 && norm <= 90) {
    ns = 'N';
    ew = 'E';
    qAngle = norm;
  } else if (norm > 90 && norm <= 180) {
    ns = 'S';
    ew = 'E';
    qAngle = 180 - norm;
  } else if (norm > 180 && norm <= 270) {
    ns = 'S';
    ew = 'W';
    qAngle = norm - 180;
  } else {
    ns = 'N';
    ew = 'W';
    qAngle = 360 - norm;
  }

  const { degrees, minutes, seconds } = degToDMS(qAngle);
  return `${ns} ${degrees}°${String(minutes).padStart(2, '0')}'${seconds.toFixed(0).padStart(2, '0')}" ${ew}`;
}

/**
 * Parse any angle string into decimal degrees [0, 360).
 * Handles:
 * - "45.25"
 * - "45° 15' 30\""
 * - "45-15-30"
 * - "N 45° 15' E"
 */
export function parseAngle(input: string): number | null {
  const s = input.trim();
  if (!s) return null;

  // Plain number
  const num = parseFloat(s);
  if (!isNaN(num) && !s.includes('°') && !s.includes('-') && !s.includes('N') && !s.includes('S')) {
    return normalizeAngleDeg(num);
  }

  // Quadrant bearing: e.g. N 45° 15' E, N 45.25 E, S 30 W, N 45 15 30 E
  const qMatch = s.match(/^([NSns])\s*([0-9.]+)(?:[°\s]+([0-9.]+))?(?:['\s]+([0-9.]+))?["\s]*([EWew])$/i);
  if (qMatch) {
    const ns = qMatch[1].toUpperCase();
    const d = parseFloat(qMatch[2]) || 0;
    const m = parseFloat(qMatch[3]) || 0;
    const sec = parseFloat(qMatch[4]) || 0;
    const ew = qMatch[5].toUpperCase();

    let subAngle = d + m / 60 + sec / 3600;
    if (subAngle > 90) return null;

    let wcb = 0;
    if (ns === 'N' && ew === 'E') wcb = subAngle;
    else if (ns === 'S' && ew === 'E') wcb = 180 - subAngle;
    else if (ns === 'S' && ew === 'W') wcb = 180 + subAngle;
    else if (ns === 'N' && ew === 'W') wcb = 360 - subAngle;

    return normalizeAngleDeg(wcb);
  }

  // Also check if quadrant bearing has single quote or spaces: e.g. N 45° 15' E
  const qMatch2 = s.match(/^([NSns])\s*([0-9.]+)(?:[°\s]+)?([0-9.]+)?(?:['\s]+)?([0-9.]+)?(?:["\s]+)?\s*([EWew])$/i);
  if (qMatch2) {
    const ns = qMatch2[1].toUpperCase();
    const d = parseFloat(qMatch2[2]) || 0;
    const m = parseFloat(qMatch2[3]) || 0;
    const sec = parseFloat(qMatch2[4]) || 0;
    const ew = qMatch2[5].toUpperCase();

    let subAngle = d + m / 60 + sec / 3600;
    if (subAngle <= 90) {
      let wcb = 0;
      if (ns === 'N' && ew === 'E') wcb = subAngle;
      else if (ns === 'S' && ew === 'E') wcb = 180 - subAngle;
      else if (ns === 'S' && ew === 'W') wcb = 180 + subAngle;
      else if (ns === 'N' && ew === 'W') wcb = 360 - subAngle;
      return normalizeAngleDeg(wcb);
    }
  }

  // DMS format: 45°15'30" or 45 15 30 or 45-15-30
  const dmsMatch = s.match(/^([0-9.]+)[°\s-]+(?:([0-9.]+)['\s-]+)?(?:([0-9.]+)"?)?$/);
  if (dmsMatch) {
    const d = parseFloat(dmsMatch[1]) || 0;
    const m = parseFloat(dmsMatch[2]) || 0;
    const sec = parseFloat(dmsMatch[3]) || 0;
    return normalizeAngleDeg(d + m / 60 + sec / 3600);
  }

  return isNaN(num) ? null : normalizeAngleDeg(num);
}
