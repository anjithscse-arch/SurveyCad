import { Point2D, SurveyPoint, SurveyLine, SurveyPolygon } from '../types/geometry';
import { LinearUnit } from '../types/survey';

export type { Point2D };

export interface BoundingBox2D {
  x: number; // Left position (0 to 1 normalized, or pixel value)
  y: number; // Top position (0 to 1 normalized, or pixel value)
  width: number;
  height: number;
}

export type AnnotationType =
  | 'distance'
  | 'bearing'
  | 'angle'
  | 'pointLabel'
  | 'area'
  | 'unit'
  | 'northArrow'
  | 'note'
  | 'unknown';

export type VerificationStatus = 'unreviewed' | 'accepted' | 'edited' | 'rejected';

export interface OCRTextBlock {
  id: string;
  text: string;
  confidence: number; // 0 to 1
  boundingBox: BoundingBox2D;
}

export interface PointCandidate {
  id: string;
  label: string;
  imagePosition: Point2D;
  confidence: number;
  status: VerificationStatus;
}

export interface LineCandidate {
  id: string;
  startPointLabel?: string;
  endPointLabel?: string;
  start: Point2D;
  end: Point2D;
  confidence: number;
}

export interface MeasurementCandidate {
  id: string;
  rawText: string;
  type: AnnotationType;
  value?: number; // Parsed numerical distance (meters) or bearing (degrees)
  unit?: LinearUnit;
  suggestedFrom?: string; // Point label e.g. "A"
  suggestedTo?: string; // Point label e.g. "B"
  confidence: number; // 0 to 1
  boundingBox: BoundingBox2D;
  status: VerificationStatus;
}

export interface NorthArrowCandidate {
  detected: boolean;
  angleDeg: number; // Angle clockwise from top (0 = North up)
  confidence: number;
  boundingBox?: BoundingBox2D;
}

export interface SurveyObservation {
  id: string;
  fromLabel: string;
  toLabel: string;
  distance?: number; // Distance in meters
  bearing?: number; // Bearing in degrees clockwise from North
  angle?: number;
  source: 'manual' | 'ocr' | 'vision' | 'ai' | 'sample';
  confidence: number;
  verified: boolean;
  originalText?: string;
  status: VerificationStatus;
  userEdited?: boolean;
}

export interface SketchAnalysisResult {
  textBlocks: OCRTextBlock[];
  points: PointCandidate[];
  lines: LineCandidate[];
  measurements: MeasurementCandidate[];
  northArrow?: NorthArrowCandidate;
  warnings: string[];
}

export interface ReconstructedSurveyResult {
  points: SurveyPoint[];
  lines: SurveyLine[];
  polygon: SurveyPolygon | null;
  observations: SurveyObservation[];
  closureError: number;
  isClosed: boolean;
  warnings: string[];
}
