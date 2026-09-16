import { ICommand } from './command';
import { SurveyCADProject } from '../types/project';
import { SurveyPolygon, SurveyLine } from '../types/geometry';

export class SetPolygonBoundaryCommand implements ICommand {
  description: string;
  private newPolygon: SurveyPolygon;
  private newLines: SurveyLine[];
  private prevPolygon?: SurveyPolygon;
  private prevLines: SurveyLine[];

  constructor(newPolygon: SurveyPolygon, newLines: SurveyLine[], project: SurveyCADProject) {
    this.newPolygon = newPolygon;
    this.newLines = newLines;
    this.prevPolygon = project.polygons.find((p) => p.id === newPolygon.id);
    this.prevLines = [...project.lines];
    this.description = newPolygon.isClosed ? 'Close Boundary Polygon' : 'Update Boundary';
  }

  execute(project: SurveyCADProject): SurveyCADProject {
    const existingIndex = project.polygons.findIndex((p) => p.id === this.newPolygon.id);
    let nextPolygons: SurveyPolygon[];

    if (existingIndex >= 0) {
      nextPolygons = [...project.polygons];
      nextPolygons[existingIndex] = this.newPolygon;
    } else {
      nextPolygons = [...project.polygons, this.newPolygon];
    }

    return {
      ...project,
      polygons: nextPolygons,
      lines: this.newLines,
      metadata: { ...project.metadata, updatedAt: new Date().toISOString() },
    };
  }

  undo(project: SurveyCADProject): SurveyCADProject {
    let nextPolygons: SurveyPolygon[];

    if (this.prevPolygon) {
      nextPolygons = project.polygons.map((p) =>
        p.id === this.prevPolygon!.id ? this.prevPolygon! : p
      );
    } else {
      nextPolygons = project.polygons.filter((p) => p.id !== this.newPolygon.id);
    }

    return {
      ...project,
      polygons: nextPolygons,
      lines: this.prevLines,
      metadata: { ...project.metadata, updatedAt: new Date().toISOString() },
    };
  }
}
