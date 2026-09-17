import { SurveyPoint, SurveyLine, SurveyArc, SurveyPolygon, Annotation } from './geometry';
import { LinearUnit, AreaUnit, AngleFormat } from './survey';

export interface ProjectMetadata {
  id: string;
  name: string;
  surveyor: string;
  client: string;
  propertyName: string;
  location: string;
  date: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSettings {
  linearUnit: LinearUnit;
  areaUnit: AreaUnit;
  angleFormat: AngleFormat;
  uiMode: 'simple' | 'advanced';
  decimalPrecision: number; // 0 to 6
  snapTolerancePixels: number; // default 12px
  gridSpacingMeters: number; // default 5m
  theme: 'dark' | 'light';
  showGrid: boolean;
  showSnapHalos: boolean;
  showDimensions: boolean;
  showBearings: boolean;
  showPointLabels: boolean;
  showNorthArrow: boolean;
  showScaleBar: boolean;
}

export interface SurveyCADProject {
  format: 'SurveyCAD';
  version: '1.0';
  metadata: ProjectMetadata;
  settings: ProjectSettings;
  points: SurveyPoint[];
  lines: SurveyLine[];
  arcs?: SurveyArc[];
  polygons: SurveyPolygon[];
  annotations: Annotation[];
}
