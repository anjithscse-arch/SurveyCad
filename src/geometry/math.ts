export const EPSILON = 1e-9;

/**
 * Compare two floating point numbers within epsilon tolerance
 */
export function nearlyEqual(a: number, b: number, eps: number = EPSILON): boolean {
  return Math.abs(a - b) <= eps;
}

/**
 * Clamp a number between min and max
 */
export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Convert radians to degrees
 */
export function radToDeg(rad: number): number {
  return (rad * 180) / Math.PI;
}

/**
 * Convert degrees to radians
 */
export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Normalize angle to [0, 360) degrees
 */
export function normalizeAngleDeg(deg: number): number {
  let angle = deg % 360;
  if (angle < 0) {
    angle += 360;
  }
  return angle;
}
