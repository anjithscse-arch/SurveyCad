import { ICommand } from './command';
import { SurveyCADProject } from '../types/project';
import { AdjustedStation } from '../types/survey';

export class AdjustTraverseCommand implements ICommand {
  description: string;
  private stations: AdjustedStation[];
  private method: 'bowditch' | 'transit';

  constructor(stations: AdjustedStation[], method: 'bowditch' | 'transit') {
    this.stations = stations;
    this.method = method;
    this.description = `Adjust Traverse (${method === 'bowditch' ? 'Bowditch Compass Rule' : 'Transit Rule'})`;
  }

  execute(project: SurveyCADProject): SurveyCADProject {
    const stationMap = new Map(this.stations.map((s) => [s.id, s]));

    const nextPoints = project.points.map((p) => {
      const adj = stationMap.get(p.id);
      if (adj) {
        return {
          ...p,
          x: adj.adjustedX,
          y: adj.adjustedY,
        };
      }
      return p;
    });

    return {
      ...project,
      points: nextPoints,
      metadata: {
        ...project.metadata,
        updatedAt: new Date().toISOString(),
      },
    };
  }

  undo(project: SurveyCADProject): SurveyCADProject {
    const stationMap = new Map(this.stations.map((s) => [s.id, s]));

    const nextPoints = project.points.map((p) => {
      const adj = stationMap.get(p.id);
      if (adj) {
        return {
          ...p,
          x: adj.originalX,
          y: adj.originalY,
        };
      }
      return p;
    });

    return {
      ...project,
      points: nextPoints,
      metadata: {
        ...project.metadata,
        updatedAt: new Date().toISOString(),
      },
    };
  }
}
