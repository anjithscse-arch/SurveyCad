import { ICommand } from './command';
import { SurveyCADProject } from '../types/project';
import { SurveyPoint, SurveyLine, SurveyPolygon } from '../types/geometry';

export class AddPointCommand implements ICommand {
  description: string;
  private point: SurveyPoint;
  private line?: SurveyLine;

  constructor(point: SurveyPoint, line?: SurveyLine) {
    this.point = point;
    this.line = line;
    this.description = `Add Point ${point.label}`;
  }

  execute(project: SurveyCADProject): SurveyCADProject {
    const nextPoints = [...project.points, this.point];
    const nextLines = this.line ? [...project.lines, this.line] : project.lines;

    return {
      ...project,
      points: nextPoints,
      lines: nextLines,
      metadata: {
        ...project.metadata,
        updatedAt: new Date().toISOString(),
      },
    };
  }

  undo(project: SurveyCADProject): SurveyCADProject {
    const nextPoints = project.points.filter((p) => p.id !== this.point.id);
    const nextLines = this.line ? project.lines.filter((l) => l.id !== this.line!.id) : project.lines;

    return {
      ...project,
      points: nextPoints,
      lines: nextLines,
      metadata: {
        ...project.metadata,
        updatedAt: new Date().toISOString(),
      },
    };
  }
}

export class MovePointCommand implements ICommand {
  description: string;
  private pointId: string;
  private oldPos: { x: number; y: number };
  private newPos: { x: number; y: number };

  constructor(pointId: string, oldPos: { x: number; y: number }, newPos: { x: number; y: number }, label: string = '') {
    this.pointId = pointId;
    this.oldPos = oldPos;
    this.newPos = newPos;
    this.description = `Move Point ${label || pointId}`;
  }

  execute(project: SurveyCADProject): SurveyCADProject {
    return {
      ...project,
      points: project.points.map((p) =>
        p.id === this.pointId ? { ...p, x: this.newPos.x, y: this.newPos.y } : p
      ),
      metadata: { ...project.metadata, updatedAt: new Date().toISOString() },
    };
  }

  undo(project: SurveyCADProject): SurveyCADProject {
    return {
      ...project,
      points: project.points.map((p) =>
        p.id === this.pointId ? { ...p, x: this.oldPos.x, y: this.oldPos.y } : p
      ),
      metadata: { ...project.metadata, updatedAt: new Date().toISOString() },
    };
  }
}

export class DeletePointCommand implements ICommand {
  description: string;
  private deletedPoint: SurveyPoint;
  private deletedLines: SurveyLine[];
  private affectedPolygons: { polygonId: string; prevPointIds: string[]; prevClosed: boolean }[];

  constructor(project: SurveyCADProject, pointId: string) {
    const pt = project.points.find((p) => p.id === pointId);
    if (!pt) throw new Error(`Point ${pointId} not found`);
    this.deletedPoint = pt;
    this.deletedLines = project.lines.filter(
      (l) => l.startPointId === pointId || l.endPointId === pointId
    );
    this.affectedPolygons = project.polygons
      .filter((poly) => poly.pointIds.includes(pointId))
      .map((poly) => ({
        polygonId: poly.id,
        prevPointIds: [...poly.pointIds],
        prevClosed: poly.isClosed,
      }));
    this.description = `Delete Point ${pt.label}`;
  }

  execute(project: SurveyCADProject): SurveyCADProject {
    const lineIdsToDelete = new Set(this.deletedLines.map((l) => l.id));

    const nextPoints = project.points.filter((p) => p.id !== this.deletedPoint.id);
    const nextLines = project.lines.filter((l) => !lineIdsToDelete.has(l.id));

    const nextPolygons = project.polygons.map((poly) => {
      if (!poly.pointIds.includes(this.deletedPoint.id)) return poly;
      const filtered = poly.pointIds.filter((id) => id !== this.deletedPoint.id);
      return {
        ...poly,
        pointIds: filtered,
        isClosed: filtered.length >= 3 ? poly.isClosed : false,
      };
    });

    return {
      ...project,
      points: nextPoints,
      lines: nextLines,
      polygons: nextPolygons,
      metadata: { ...project.metadata, updatedAt: new Date().toISOString() },
    };
  }

  undo(project: SurveyCADProject): SurveyCADProject {
    const polygonRestoreMap = new Map(
      this.affectedPolygons.map((ap) => [ap.polygonId, ap])
    );

    const nextPolygons = project.polygons.map((poly) => {
      const saved = polygonRestoreMap.get(poly.id);
      if (!saved) return poly;
      return {
        ...poly,
        pointIds: saved.prevPointIds,
        isClosed: saved.prevClosed,
      };
    });

    return {
      ...project,
      points: [...project.points, this.deletedPoint],
      lines: [...project.lines, ...this.deletedLines],
      polygons: nextPolygons,
      metadata: { ...project.metadata, updatedAt: new Date().toISOString() },
    };
  }
}
