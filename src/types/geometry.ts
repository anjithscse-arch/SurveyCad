export interface Point2D {
  x: number; // Real-world Easting in meters
  y: number; // Real-world Northing in meters
}

export interface SurveyPoint extends Point2D {
  id: string;
  label: string; // "A", "B", "P1", etc.
  elevation?: number | null;
  code?: string;
  description?: string;
  isFixed?: boolean;
}

export interface SurveyLine {
  id: string;
  startPointId: string;
  endPointId: string;
  color?: string;
  style?: 'solid' | 'dashed';
}

export interface SurveyArc {
  id: string;
  startPointId: string;
  endPointId: string;
  midPointId?: string; // Optional third on-curve point
  center: Point2D;
  radius: number;
  deltaRad: number; // Central angle in radians
  arcLength: number; // Curve distance in meters (L = R * delta)
  chordLength: number; // Direct line distance in meters
  isClockwise: boolean;
  isConvexOrOutward: boolean; // Outward bulge adds area, inward subtracts
  isConvex?: boolean; // Convenience alias
  sweepFlag?: number; // SVG sweep flag (0 or 1)
  color?: string;
}

export interface SurveyPolygon {
  id: string;
  name?: string;
  pointIds: string[]; // Ordered list of point IDs
  isClosed: boolean;
  color?: string;
  fillOpacity?: number;
}

export interface Annotation {
  id: string;
  type: 'text' | 'dimension' | 'area';
  position: Point2D;
  text: string;
  referenceId?: string; // Point, line or polygon ID
  rotation?: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface ViewportTransform {
  zoom: number; // Screen pixels per world meter
  panX: number; // Screen X offset (pixels)
  panY: number; // Screen Y offset (pixels)
  width: number; // Canvas width (pixels)
  height: number; // Canvas height (pixels)
}
