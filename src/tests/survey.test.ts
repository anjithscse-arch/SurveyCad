import { describe, it, expect } from 'vitest';
import { calculateTraverseLegs, calculateClosure } from '../survey/traverse';
import { exportPointsToCSV, parseCSVPoints } from '../export/csv';
import { CommandHistory } from '../commands/history';
import { AddPointCommand, MovePointCommand, DeletePointCommand } from '../commands/pointCommands';
import { SetPolygonBoundaryCommand } from '../commands/polygonCommands';
import { SurveyCADProject } from '../types/project';
import { serializeProject, parseProjectJson } from '../storage/serializer';

describe('Survey Traverse & Calculation Tests', () => {
  const mockProject: SurveyCADProject = {
    format: 'SurveyCAD',
    version: '1.0',
    metadata: {
      id: 'p1',
      name: 'Test Project',
      surveyor: 'Tester',
      client: 'Client',
      propertyName: 'Parcel 1',
      location: 'Site',
      date: '2026-09-16',
      notes: '',
      createdAt: '2026-09-16T10:00:00Z',
      updatedAt: '2026-09-16T10:00:00Z',
    },
    settings: {
      linearUnit: 'm',
      areaUnit: 'sqm',
      angleFormat: 'deg',
      decimalPrecision: 2,
      snapTolerancePixels: 14,
      gridSpacingMeters: 5,
      theme: 'dark',
      showGrid: true,
      showSnapHalos: true,
      showDimensions: true,
      showBearings: true,
      showPointLabels: true,
      showNorthArrow: true,
      showScaleBar: true,
    },
    points: [
      { id: 'pt1', label: 'A', x: 0, y: 0 },
      { id: 'pt2', label: 'B', x: 20, y: 0 },
      { id: 'pt3', label: 'C', x: 20, y: 30 },
      { id: 'pt4', label: 'D', x: 0, y: 30 },
    ],
    lines: [],
    polygons: [],
    annotations: [],
  };

  it('calculates traverse departures, latitudes, and closure error for closed traverse', () => {
    const legs = calculateTraverseLegs(mockProject.points, true);
    expect(legs.length).toBe(4);

    // Leg A->B: 20m East (90 deg)
    expect(legs[0].distance).toBe(20);
    expect(legs[0].bearingDeg).toBe(90);
    expect(legs[0].deltaE).toBe(20);
    expect(legs[0].deltaN).toBe(0);

    // Leg B->C: 30m North (0 deg)
    expect(legs[1].distance).toBe(30);
    expect(legs[1].bearingDeg).toBe(0);
    expect(legs[1].deltaE).toBe(0);
    expect(legs[1].deltaN).toBe(30);

    // Leg C->D: 20m West (270 deg)
    expect(legs[2].distance).toBe(20);
    expect(legs[2].bearingDeg).toBe(270);
    expect(legs[2].deltaE).toBe(-20);
    expect(legs[2].deltaN).toBe(0);

    // Leg D->A: 30m South (180 deg)
    expect(legs[3].distance).toBe(30);
    expect(legs[3].bearingDeg).toBe(180);
    expect(legs[3].deltaE).toBe(0);
    expect(legs[3].deltaN).toBe(-30);

    const closure = calculateClosure(legs);
    expect(closure.sumDeltaE).toBeCloseTo(0, 5);
    expect(closure.sumDeltaN).toBeCloseTo(0, 5);
    expect(closure.closureError).toBeCloseTo(0, 5);
    expect(closure.totalLength).toBe(100);
    expect(closure.isAcceptable).toBe(true);
  });

  it('tests CSV export and import parsing', () => {
    const csv = exportPointsToCSV(mockProject.points);
    expect(csv).toContain('Point,Easting_X,Northing_Y');
    expect(csv).toContain('"A",0.0000,0.0000');
    expect(csv).toContain('"B",20.0000,0.0000');

    const parsed = parseCSVPoints(csv);
    expect(parsed.errors.length).toBe(0);
    expect(parsed.points.length).toBe(4);
    expect(parsed.points[0].label).toBe('A');
    expect(parsed.points[0].x).toBe(0);
    expect(parsed.points[2].label).toBe('C');
    expect(parsed.points[2].x).toBe(20);
    expect(parsed.points[2].y).toBe(30);
  });

  it('tests Command Pattern Undo and Redo execution', () => {
    const history = new CommandHistory();
    let project: SurveyCADProject = { ...mockProject, points: [] };

    // 1. Add Point A
    const addCmd = new AddPointCommand({ id: 'p1', label: 'A', x: 10, y: 10 });
    project = history.execute(addCmd, project);
    expect(project.points.length).toBe(1);
    expect(history.canUndo).toBe(true);
    expect(history.canRedo).toBe(false);

    // 2. Move Point A
    const moveCmd = new MovePointCommand('p1', { x: 10, y: 10 }, { x: 25, y: 35 }, 'A');
    project = history.execute(moveCmd, project);
    expect(project.points[0].x).toBe(25);
    expect(project.points[0].y).toBe(35);

    // 3. Undo Move
    project = history.undo(project);
    expect(project.points[0].x).toBe(10);
    expect(project.points[0].y).toBe(10);
    expect(history.canRedo).toBe(true);

    // 4. Redo Move
    project = history.redo(project);
    expect(project.points[0].x).toBe(25);
    expect(project.points[0].y).toBe(35);

    // 5. Delete Point
    const deleteCmd = new DeletePointCommand(project, 'p1');
    project = history.execute(deleteCmd, project);
    expect(project.points.length).toBe(0);

    // 6. Undo Delete
    project = history.undo(project);
    expect(project.points.length).toBe(1);
    expect(project.points[0].id).toBe('p1');
  });

  it('tests JSON Project Serialization and schema parsing', () => {
    const jsonStr = serializeProject(mockProject);
    const result = parseProjectJson(jsonStr);
    expect(result.error).toBeUndefined();
    expect(result.project?.metadata.name).toBe('Test Project');
    expect(result.project?.points.length).toBe(4);
  });
});
