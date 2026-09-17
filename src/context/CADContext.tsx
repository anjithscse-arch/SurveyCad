import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { SurveyPoint, SurveyLine, SurveyArc, SurveyPolygon, ViewportTransform, Point2D } from '../types/geometry';
import { SurveyCADProject, ProjectSettings } from '../types/project';
import { AreaCalculationResult, ClosureAnalysis } from '../types/survey';
import { CommandHistory } from '../commands/history';
import { ICommand } from '../commands/command';
import { computeAreaResults } from '../survey/validation';
import { calculateTraverseLegs, calculateClosure } from '../survey/traverse';
import { saveAutosave, getAutosave } from '../storage/indexeddb';
import { SnapResult } from '../geometry/snap';
import { circularSegmentArea } from '../geometry/arc';
import { convertArea, convertDistance } from '../survey/units';

export type CADTool = 'select' | 'point' | 'line' | 'polyline' | 'polygon' | 'measure' | 'pan';

export interface CADContextValue {
  project: SurveyCADProject;
  setProject: React.Dispatch<React.SetStateAction<SurveyCADProject>>;
  viewport: ViewportTransform;
  setViewport: React.Dispatch<React.SetStateAction<ViewportTransform>>;
  activeTool: CADTool;
  setActiveTool: (tool: CADTool) => void;
  selectedPointIds: string[];
  setSelectedPointIds: React.Dispatch<React.SetStateAction<string[]>>;
  selectedLineIds: string[];
  setSelectedLineIds: React.Dispatch<React.SetStateAction<string[]>>;
  selectedPolygonId: string | null;
  setSelectedPolygonId: (id: string | null) => void;
  cursorWorld: Point2D;
  setCursorWorld: (pt: Point2D) => void;
  activeSnap: SnapResult | null;
  setActiveSnap: (snap: SnapResult | null) => void;
  measurePoints: Point2D[];
  setMeasurePoints: React.Dispatch<React.SetStateAction<Point2D[]>>;
  drawingPoints: string[]; // Point IDs currently being added for polyline/polygon
  setDrawingPoints: React.Dispatch<React.SetStateAction<string[]>>;

  // Arcs
  addArc: (arc: SurveyArc) => void;
  deleteArc: (id: string) => void;

  // Calculations
  areaResult: AreaCalculationResult;
  closureResult: ClosureAnalysis;

  // History & Commands
  executeCommand: (cmd: ICommand) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;

  // Settings
  updateSettings: (partial: Partial<ProjectSettings>) => void;
  updateMetadata: (partial: Partial<SurveyCADProject['metadata']>) => void;

  // Project Actions
  resetProject: (name?: string) => void;
  loadNewProject: (p: SurveyCADProject) => void;
}

const DEFAULT_SETTINGS: ProjectSettings = {
  linearUnit: 'm',
  areaUnit: 'sqm',
  angleFormat: 'deg',
  uiMode: 'simple',
  decimalPrecision: 2,
  snapTolerancePixels: 14,
  gridSpacingMeters: 5,
  theme: 'dark',
  showGrid: true,
  showSnapHalos: true,
  showDimensions: true,
  showBearings: false,
  showPointLabels: true,
  showNorthArrow: true,
  showScaleBar: true,
};

function createInitialProject(name: string = 'Property Survey'): SurveyCADProject {
  return {
    format: 'SurveyCAD',
    version: '1.0',
    metadata: {
      id: `proj_${Date.now()}`,
      name,
      surveyor: 'Licensed Land Surveyor',
      client: 'Property Owner',
      propertyName: 'Survey Parcel 1',
      location: 'Site Location',
      date: new Date().toISOString().split('T')[0],
      notes: 'Initial boundary survey drawing.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    settings: { ...DEFAULT_SETTINGS },
    points: [],
    lines: [],
    arcs: [],
    polygons: [],
    annotations: [],
  };
}

const CADContext = createContext<CADContextValue | null>(null);

export const CADProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [project, setProject] = useState<SurveyCADProject>(createInitialProject);
  const [viewport, setViewport] = useState<ViewportTransform>({
    zoom: 15, // 15 screen pixels per real-world meter
    panX: 400,
    panY: 300,
    width: 800,
    height: 600,
  });

  const [activeTool, setActiveTool] = useState<CADTool>('select');
  const [selectedPointIds, setSelectedPointIds] = useState<string[]>([]);
  const [selectedLineIds, setSelectedLineIds] = useState<string[]>([]);
  const [selectedPolygonId, setSelectedPolygonId] = useState<string | null>(null);
  const [cursorWorld, setCursorWorld] = useState<Point2D>({ x: 0, y: 0 });
  const [activeSnap, setActiveSnap] = useState<SnapResult | null>(null);
  const [measurePoints, setMeasurePoints] = useState<Point2D[]>([]);
  const [drawingPoints, setDrawingPoints] = useState<string[]>([]);

  const historyRef = useRef<CommandHistory>(new CommandHistory());
  const [historyVersion, setHistoryVersion] = useState(0);

  // Restore autosaved project on mount if available
  useEffect(() => {
    getAutosave().then((saved) => {
      if (saved && saved.points && saved.points.length > 0) {
        setProject(saved);
      }
    });
  }, []);

  // Debounced autosave
  useEffect(() => {
    const timer = setTimeout(() => {
      saveAutosave(project);
    }, 600);
    return () => clearTimeout(timer);
  }, [project]);

  // Execute a command
  const executeCommand = (cmd: ICommand) => {
    setProject((prev) => {
      const next = historyRef.current.execute(cmd, prev);
      setHistoryVersion((v) => v + 1);
      return next;
    });
  };

  const undo = () => {
    setProject((prev) => {
      const next = historyRef.current.undo(prev);
      setHistoryVersion((v) => v + 1);
      return next;
    });
  };

  const redo = () => {
    setProject((prev) => {
      const next = historyRef.current.redo(prev);
      setHistoryVersion((v) => v + 1);
      return next;
    });
  };

  const updateSettings = (partial: Partial<ProjectSettings>) => {
    setProject((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...partial },
      metadata: { ...prev.metadata, updatedAt: new Date().toISOString() },
    }));
  };

  const updateMetadata = (partial: Partial<SurveyCADProject['metadata']>) => {
    setProject((prev) => ({
      ...prev,
      metadata: { ...prev.metadata, ...partial, updatedAt: new Date().toISOString() },
    }));
  };

  const addArc = (arc: SurveyArc) => {
    setProject((prev) => ({
      ...prev,
      arcs: [...(prev.arcs || []), arc],
      metadata: { ...prev.metadata, updatedAt: new Date().toISOString() },
    }));
  };

  const deleteArc = (id: string) => {
    setProject((prev) => ({
      ...prev,
      arcs: (prev.arcs || []).filter((a) => a.id !== id),
      metadata: { ...prev.metadata, updatedAt: new Date().toISOString() },
    }));
  };

  const resetProject = (name?: string) => {
    historyRef.current.clear();
    setHistoryVersion(0);
    setSelectedPointIds([]);
    setSelectedLineIds([]);
    setSelectedPolygonId(null);
    setDrawingPoints([]);
    setMeasurePoints([]);
    setProject(createInitialProject(name));
  };

  const loadNewProject = (p: SurveyCADProject) => {
    historyRef.current.clear();
    setHistoryVersion(0);
    setSelectedPointIds([]);
    setSelectedLineIds([]);
    setSelectedPolygonId(null);
    setDrawingPoints([]);
    setMeasurePoints([]);
    setProject(p);
  };

  // Live calculation of boundary area & closure
  const areaResult = useMemo(() => {
    let baseResult: AreaCalculationResult;
    // Look for closed polygon or ordered points
    const closedPoly = project.polygons.find((p) => p.isClosed && p.pointIds.length >= 3);
    if (closedPoly) {
      const pointMap = new Map(project.points.map((pt) => [pt.id, pt]));
      const pts = closedPoly.pointIds.map((id) => pointMap.get(id)).filter(Boolean) as SurveyPoint[];
      baseResult = computeAreaResults(pts, true);
    } else if (project.points.length >= 3) {
      baseResult = computeAreaResults(project.points, project.points.length >= 3);
    } else {
      baseResult = computeAreaResults([], false);
    }

    if (!project.arcs || project.arcs.length === 0 || !baseResult.isValid) {
      return baseResult;
    }

    // Adjust for circular arc segments
    let netSqm = baseResult.sqMeters;
    let netPerimeterM = baseResult.perimeterMeters;

    for (const arc of project.arcs) {
      const segArea = circularSegmentArea(arc.radius, arc.deltaRad);
      const isOutward = arc.isConvexOrOutward ?? (arc.isConvex !== false);
      if (isOutward) {
        // Outward convex curve adds segment area to the polygon
        netSqm += segArea;
      } else {
        // Inward concave curve subtracts segment area from the polygon
        netSqm -= segArea;
      }
      // Perimeter: replace straight chord with true curved arc length
      netPerimeterM += (arc.arcLength - arc.chordLength);
    }

    const safeSqm = Math.max(0, netSqm);
    return {
      sqMeters: safeSqm,
      sqFeet: convertArea(safeSqm, 'sqm', 'sqft'),
      sqYards: convertArea(safeSqm, 'sqm', 'sqyd'),
      cents: convertArea(safeSqm, 'sqm', 'cent'),
      gunthas: convertArea(safeSqm, 'sqm', 'guntha'),
      acres: convertArea(safeSqm, 'sqm', 'acre'),
      hectares: convertArea(safeSqm, 'sqm', 'hectare'),
      ares: convertArea(safeSqm, 'sqm', 'are'),
      perimeterMeters: netPerimeterM,
      perimeterFeet: convertDistance(netPerimeterM, 'm', 'ft'),
      vertexCount: baseResult.vertexCount,
      hasSelfIntersections: baseResult.hasSelfIntersections,
      isValid: baseResult.isValid,
      validationError: baseResult.validationError,
    };
  }, [project.points, project.polygons, project.arcs]);

  const closureResult = useMemo(() => {
    const closedPoly = project.polygons.find((p) => p.isClosed && p.pointIds.length >= 3);
    if (closedPoly) {
      const pointMap = new Map(project.points.map((pt) => [pt.id, pt]));
      const pts = closedPoly.pointIds.map((id) => pointMap.get(id)).filter(Boolean) as SurveyPoint[];
      const legs = calculateTraverseLegs(pts, true);
      return calculateClosure(legs);
    }

    if (project.points.length >= 3) {
      const legs = calculateTraverseLegs(project.points, true);
      return calculateClosure(legs);
    }

    return calculateClosure([]);
  }, [project.points, project.polygons]);

  const value: CADContextValue = {
    project,
    setProject,
    viewport,
    setViewport,
    activeTool,
    setActiveTool,
    selectedPointIds,
    setSelectedPointIds,
    selectedLineIds,
    setSelectedLineIds,
    selectedPolygonId,
    setSelectedPolygonId,
    cursorWorld,
    setCursorWorld,
    activeSnap,
    setActiveSnap,
    measurePoints,
    setMeasurePoints,
    drawingPoints,
    setDrawingPoints,
    addArc,
    deleteArc,
    areaResult,
    closureResult,
    executeCommand,
    undo,
    redo,
    canUndo: historyRef.current.canUndo,
    canRedo: historyRef.current.canRedo,
    updateSettings,
    updateMetadata,
    resetProject,
    loadNewProject,
  };

  return <CADContext.Provider value={value}>{children}</CADContext.Provider>;
};

export const useCAD = () => {
  const context = useContext(CADContext);
  if (!context) throw new Error('useCAD must be used within CADProvider');
  return context;
};
