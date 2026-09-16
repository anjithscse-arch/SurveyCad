import { describe, it, expect } from 'vitest';
import { generateDXF } from '../export/dxf';
import { SurveyCADProject } from '../types/project';

describe('AutoCAD ASCII DXF Generator', () => {
  const mockProject: SurveyCADProject = {
    format: 'SurveyCAD',
    version: '1.0',
    metadata: {
      id: 'p_test',
      name: 'Benchmark Survey',
      surveyor: 'Test Surveyor',
      client: 'Test Client',
      propertyName: 'Parcel 101',
      location: 'Site A',
      date: '2026-09-16',
      notes: 'Test survey notes.',
      createdAt: '2026-09-16T00:00:00.000Z',
      updatedAt: '2026-09-16T00:00:00.000Z',
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
      { id: 'pt1', label: 'A', x: 100, y: 200, z: 10 },
      { id: 'pt2', label: 'B', x: 150, y: 200, z: 10 },
      { id: 'pt3', label: 'C', x: 150, y: 250, z: 10 },
    ],
    lines: [
      { id: 'l1', startPointId: 'pt1', endPointId: 'pt2' },
      { id: 'l2', startPointId: 'pt2', endPointId: 'pt3' },
    ],
    arcs: [],
    polygons: [
      { id: 'poly1', name: 'Parcel 101', pointIds: ['pt1', 'pt2', 'pt3'], isClosed: true },
    ],
    annotations: [],
  };

  it('generates a valid AutoCAD DXF string containing required sections', () => {
    const dxf = generateDXF(mockProject);
    expect(dxf).toContain('HEADER');
    expect(dxf).toContain('$ACADVER');
    expect(dxf).toContain('AC1015');
    expect(dxf).toContain('TABLES');
    expect(dxf).toContain('LAYER');
    expect(dxf).toContain('SURVEY_BOUNDARY');
    expect(dxf).toContain('SURVEY_POINTS');
    expect(dxf).toContain('ENTITIES');
    expect(dxf).toContain('POINT');
    expect(dxf).toContain('LINE');
    expect(dxf).toContain('LWPOLYLINE');
    expect(dxf).toContain('EOF');
  });

  it('contains correctly formatted coordinates', () => {
    const dxf = generateDXF(mockProject);
    // Point A at (100, 200)
    expect(dxf).toContain('100.0000');
    expect(dxf).toContain('200.0000');
  });
});
