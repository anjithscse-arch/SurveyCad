export type LinearUnit = 'm' | 'cm' | 'mm' | 'ft' | 'usft' | 'in';
export type AreaUnit = 'sqm' | 'sqft' | 'acre' | 'hectare' | 'are' | 'cent' | 'guntha' | 'sqyd';
export type AngleFormat = 'deg' | 'dms' | 'quadrant'; // Decimal degrees, DMS (45°15'00"), Quadrant (N 45° E)

export interface TraverseLeg {
  fromId: string;
  toId: string;
  distance: number; // in current linear unit
  bearingDeg: number; // 0 <= bearing < 360 clockwise from North
  deltaE: number; // Easting change
  deltaN: number; // Northing change
}

export interface ClosureAnalysis {
  sumDeltaE: number;
  sumDeltaN: number;
  closureError: number; // Linear error in meters
  totalLength: number; // Total perimeter / traverse length in meters
  relativePrecision: number; // e.g. 8420 for 1:8420
  precisionString: string; // "1:8420"
  isAcceptable: boolean;
}

export interface AreaCalculationResult {
  sqMeters: number;
  sqFeet: number;
  acres: number;
  cents: number;
  gunthas?: number;
  hectares: number;
  ares?: number;
  sqYards: number;
  perimeterMeters: number;
  perimeterFeet: number;
  vertexCount: number;
  hasSelfIntersections: boolean;
  isValid: boolean;
  validationError?: string;
}

export interface AdjustedStation {
  id: string;
  label: string;
  originalX: number;
  originalY: number;
  adjustedX: number;
  adjustedY: number;
  deltaX: number; // adjusted - original
  deltaY: number;
}

export interface TraverseAdjustmentResult {
  method: 'bowditch' | 'transit';
  stations: AdjustedStation[];
  originalClosureError: number;
  residualError: number;
  totalLength: number;
}
