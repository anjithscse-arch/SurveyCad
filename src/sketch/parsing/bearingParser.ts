import { parseAngle } from '../../geometry/bearing';

export interface ParsedBearing {
  degrees: number; // 0 to 360 clockwise from North
  rawText: string;
}

/**
 * Parses bearing text from sketch annotations.
 * Examples: "N 30° E", "N30E", "S 45 W", "90°", "180", "N 30 15 E"
 */
export function parseBearingString(text: string): ParsedBearing | null {
  const s = text.trim();
  if (!s) return null;

  const deg = parseAngle(s);
  if (deg === null) return null;

  return {
    degrees: deg,
    rawText: s,
  };
}
