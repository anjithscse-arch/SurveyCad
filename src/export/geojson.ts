import { SurveyCADProject } from '../types/project';

/**
 * Generate standard GeoJSON FeatureCollection from a SurveyCAD project.
 * Uses local coordinate space (Easting as lon/X, Northing as lat/Y).
 */
export function generateGeoJSON(project: SurveyCADProject): string {
  const pointMap = new Map(project.points.map((p) => [p.id, p]));

  const features: any[] = [];

  // 1. Station Points
  for (const pt of project.points) {
    features.push({
      type: 'Feature',
      id: pt.id,
      properties: {
        featureType: 'SurveyStation',
        label: pt.label,
        easting: pt.x,
        northing: pt.y,
        elevation: pt.z ?? null,
        code: pt.code ?? null,
        description: pt.description ?? null,
      },
      geometry: {
        type: 'Point',
        coordinates: pt.z !== undefined ? [pt.x, pt.y, pt.z] : [pt.x, pt.y],
      },
    });
  }

  // 2. Boundary Lines
  for (const line of project.lines) {
    const p1 = pointMap.get(line.startPointId);
    const p2 = pointMap.get(line.endPointId);
    if (!p1 || !p2) continue;

    features.push({
      type: 'Feature',
      id: line.id,
      properties: {
        featureType: 'BoundarySegment',
        from: p1.label,
        to: p2.label,
        boundaryType: line.boundaryType,
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [p1.x, p1.y],
          [p2.x, p2.y],
        ],
      },
    });
  }

  // 3. Closed Boundary Parcels / Polygons
  for (const poly of project.polygons) {
    const pts = poly.pointIds.map((id) => pointMap.get(id)).filter(Boolean);
    if (pts.length < 3) continue;

    const ringCoordinates = pts.map((p) => [p!.x, p!.y]);
    // Ensure ring is closed
    if (poly.isClosed) {
      ringCoordinates.push([pts[0]!.x, pts[0]!.y]);
    }

    features.push({
      type: 'Feature',
      id: poly.id,
      properties: {
        featureType: 'CadastralParcel',
        name: poly.name,
        parcelNumber: poly.parcelNumber ?? null,
        isClosed: poly.isClosed,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [ringCoordinates],
      },
    });
  }

  const geoJsonObj = {
    type: 'FeatureCollection',
    name: project.metadata.name,
    properties: {
      surveyor: project.metadata.surveyor,
      client: project.metadata.client,
      date: project.metadata.date,
      unit: project.settings.linearUnit,
    },
    features,
  };

  return JSON.stringify(geoJsonObj, null, 2);
}

/**
 * Trigger browser download of GeoJSON file
 */
export function downloadGeoJSON(project: SurveyCADProject, filename?: string): void {
  const content = generateGeoJSON(project);
  const blob = new Blob([content], { type: 'application/geo+json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `${project.metadata.name.replace(/\s+/g, '_')}.geojson`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
