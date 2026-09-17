import { ICommand } from './command';
import { SurveyCADProject } from '../types/project';
import { SurveyPoint, SurveyLine, SurveyPolygon, SurveyArc, Point2D } from '../types/geometry';

/**
 * Builds fully-formed SurveyPoint objects from solved Point2D coordinates.
 */
export function buildChainSurveyPoints(
  points: Point2D[],
  startNumber: number = 1
): SurveyPoint[] {
  return points.map((pt, idx) => ({
    id: `pt_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
    label: `P${startNumber + idx}`,
    x: Math.round(pt.x * 1000) / 1000,
    y: Math.round(pt.y * 1000) / 1000,
  }));
}

/**
 * Single-step undoable command that adds a chain survey boundary:
 * points, perimeter lines, closed boundary polygon, and optional arcs.
 */
export class AddChainSurveyBoundaryCommand implements ICommand {
  description: string;
  private points: SurveyPoint[];
  private lines: SurveyLine[];
  private polygon: SurveyPolygon;
  private arcs: SurveyArc[];

  constructor(
    points: SurveyPoint[],
    polygonName: string = 'Chain Survey Boundary',
    arcs: SurveyArc[] = []
  ) {
    this.points = points;
    this.arcs = arcs;
    this.description = `Add Chain Survey Boundary (${points.length} sides)`;

    const n = points.length;
    this.lines = [];
    for (let i = 0; i < n; i++) {
      this.lines.push({
        id: `line_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
        startPointId: points[i].id,
        endPointId: points[(i + 1) % n].id,
        boundaryType: 'boundary',
      });
    }

    this.polygon = {
      id: `poly_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: polygonName,
      pointIds: points.map((p) => p.id),
      isClosed: true,
    };
  }

  execute(project: SurveyCADProject): SurveyCADProject {
    return {
      ...project,
      points: [...project.points, ...this.points],
      lines: [...project.lines, ...this.lines],
      polygons: [...project.polygons, this.polygon],
      arcs: [...(project.arcs || []), ...this.arcs],
      metadata: {
        ...project.metadata,
        updatedAt: new Date().toISOString(),
      },
    };
  }

  undo(project: SurveyCADProject): SurveyCADProject {
    const pointIdsToRemove = new Set(this.points.map((p) => p.id));
    const lineIdsToRemove = new Set(this.lines.map((l) => l.id));
    const arcIdsToRemove = new Set(this.arcs.map((a) => a.id));

    return {
      ...project,
      points: project.points.filter((p) => !pointIdsToRemove.has(p.id)),
      lines: project.lines.filter((l) => !lineIdsToRemove.has(l.id)),
      polygons: project.polygons.filter((poly) => poly.id !== this.polygon.id),
      arcs: (project.arcs || []).filter((arc) => !arcIdsToRemove.has(arc.id)),
      metadata: {
        ...project.metadata,
        updatedAt: new Date().toISOString(),
      },
    };
  }
}
