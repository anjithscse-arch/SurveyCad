import { SurveyCADProject } from '../types/project';

export interface ICommand {
  description: string;
  execute(project: SurveyCADProject): SurveyCADProject;
  undo(project: SurveyCADProject): SurveyCADProject;
}
